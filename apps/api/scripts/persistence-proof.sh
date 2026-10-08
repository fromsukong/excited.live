#!/usr/bin/env bash
#
# Local persistence proof for apps/api (FRO-66).
#
#   save -> restart the API process -> data is still there, fresh user is clean.
#
# Runs the built bundle (dist/index.js) on a throwaway SQLite file, so it
# exercises exactly what `pnpm --filter @excited-live/api build` produces.
# Re-runnable; safe (uses a temp dir, no network, no Cloudflare).
#
# Usage: bash scripts/persistence-proof.sh   (from apps/api)
set -euo pipefail

cd "$(dirname "$0")/.."
API_DIR="$(pwd)"
PORT="${PROOF_PORT:-8123}"
DB_DIR="$(mktemp -d)"
export EXCITED_API_DB_PATH="$DB_DIR/proof.sqlite"
export PORT

echo "== environment =="
echo "node:            $(node --version)"
echo "api dir:         $API_DIR"
echo "database file:   $EXCITED_API_DB_PATH"
echo "port:            $PORT"
echo

echo "== build (turbo build, same command CI runs) =="
REPO_ROOT="$(cd ../.. && pwd)"
(cd "$REPO_ROOT" && pnpm exec turbo run build --filter=@excited-live/api --output-logs=errors-only)
echo "dist:            $(ls -1 "$API_DIR/dist")"
echo

# A realistic plan body, taken from the sim package's own defaults.
PLAN_JSON="$(node -e '
	import("@excited-live/sim").then((sim) => {
		const plan = sim.defaultPlanInput()
		plan.personalAllowances = 123456 // marker: proves this exact body came back
		process.stdout.write(JSON.stringify(plan))
	})
')"
SETTINGS_JSON='{"profileName":"FRO-66 proof","birthday":"1994-03-17","gender":"male"}'

wait_for_health() {
	for _ in $(seq 1 100); do
		if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
			return 0
		fi
		sleep 0.2
	done
	echo "API never became healthy on port $PORT" >&2
	return 1
}

log_file="$DB_DIR/api.log"
start_api() {
	node dist/index.js >"$log_file" 2>&1 &
	API_PID=$!
	wait_for_health
	echo "started pid $API_PID (log: $log_file)"
	head -3 "$log_file" | sed 's/^/  /'
}

echo "== process #1: save plan + settings =="
start_api
echo "PUT /api/v1/plan      -> $(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
	-H 'content-type: application/json' -H 'x-user-id: user-a' \
	--data "$PLAN_JSON" "http://127.0.0.1:$PORT/api/v1/plan")"
echo "PUT /api/v1/settings  -> $(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
	-H 'content-type: application/json' -H 'x-user-id: user-a' \
	--data "$SETTINGS_JSON" "http://127.0.0.1:$PORT/api/v1/settings")"

echo "stopping pid $API_PID (SIGTERM) and waiting for it to exit"
kill "$API_PID"
wait "$API_PID" 2>/dev/null || true
if kill -0 "$API_PID" 2>/dev/null; then
	echo "process $API_PID is still alive; aborting" >&2
	exit 1
fi
echo "process is gone"
echo
echo "sqlite file on disk:"
ls -l "$EXCITED_API_DB_PATH" | sed 's/^/  /'
echo

echo "== process #2: read it back (same database file, new process) =="
start_api
GET_PLAN="$(curl -sS -H 'x-user-id: user-a' "http://127.0.0.1:$PORT/api/v1/plan")"
GET_SETTINGS="$(curl -sS -H 'x-user-id: user-a' "http://127.0.0.1:$PORT/api/v1/settings")"
NEW_USER_PLAN="$(curl -sS -H 'x-user-id: brand-new-user' "http://127.0.0.1:$PORT/api/v1/plan")"
NEW_USER_SETTINGS="$(curl -sS -H 'x-user-id: brand-new-user' "http://127.0.0.1:$PORT/api/v1/settings")"

echo "GET /api/v1/plan       (user-a) -> $GET_PLAN"
echo "GET /api/v1/settings   (user-a) -> $GET_SETTINGS"
echo "GET /api/v1/plan       (brand-new-user) -> $NEW_USER_PLAN"
echo "GET /api/v1/settings   (brand-new-user) -> $NEW_USER_SETTINGS"
echo

echo "== verdict =="
status=0
if [ "$GET_PLAN" = "$PLAN_JSON" ]; then
	echo "PASS  plan survived the restart, byte for byte (PUT body == GET body)"
else
	echo "FAIL  plan did not survive the restart" >&2
	status=1
fi
if [ "$GET_SETTINGS" = "$SETTINGS_JSON" ]; then
	echo "PASS  settings survived the restart, byte for byte"
else
	echo "FAIL  settings did not survive the restart" >&2
	status=1
fi
if [ "$NEW_USER_SETTINGS" = '{"profileName":"","gender":"female"}' ]; then
	echo "PASS  a fresh x-user-id starts clean (no leakage)"
else
	echo "FAIL  a fresh x-user-id saw another user's data" >&2
	status=1
fi
if [ "$NEW_USER_PLAN" != "$PLAN_JSON" ]; then
	echo "PASS  a fresh x-user-id gets the default plan, not user-a's"
else
	echo "FAIL  fresh user saw user-a's plan" >&2
	status=1
fi

kill "$API_PID" 2>/dev/null || true
wait "$API_PID" 2>/dev/null || true
rm -rf "$DB_DIR"
exit "$status"
