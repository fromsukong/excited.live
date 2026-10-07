#!/usr/bin/env bash
#
# Real-D1 proof for apps/api (FRO-72).
#
#   boot the built Worker on a REAL Cloudflare D1 binding (workerd, through
#   `wrangler dev --local`) -> GET /api/v1/settings is 200 (not 500)
#   -> PUT/GET plan + settings round-trip -> kill the runtime
#   -> a NEW process on the SAME D1 database file -> data persists
#   -> a fresh x-user-id starts clean.
#
# Why this exists: scripts/persistence-proof.sh exercises the node:sqlite
# driver. D1's own `exec()` is NOT the same shape (it splits its input on
# newlines and runs each line alone), so a green Node proof says nothing about
# the deploy path — that is exactly the FRO-68 blocker. This script runs the
# real binding in the real Workers runtime, locally.
#
# Uses the unmodified app/wrangler.toml (`main = dist/worker.js`). No Cloudflare
# account, no login, no provisioning, no deploy, no secrets. Nothing is written
# outside a throwaway temp dir plus `.wrangler/` (already gitignored).
#
# The first run downloads wrangler + workerd (~150 MB) via npx; set WRANGLER to
# reuse an existing install.
#
# Usage: bash apps/api/scripts/d1-proof.sh
#   D1_PROOF_PORT=8788   port for the local runtime
#   KEEP_STATE=1         keep the temp dir (printed) instead of deleting it
set -euo pipefail

cd "$(dirname "$0")/.."
API_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"
PORT="${D1_PROOF_PORT:-8788}"
WRANGLER_BIN="${WRANGLER:-npx --yes wrangler@4}"
WORK_DIR="$(mktemp -d)"
STATE_DIR="$WORK_DIR/state"

cleanup() {
	if [ -n "${API_PID:-}" ] && kill -0 "$API_PID" 2>/dev/null; then
		kill "$API_PID" 2>/dev/null || true
		wait "$API_PID" 2>/dev/null || true
	fi
	if [ "${KEEP_STATE:-0}" = "1" ]; then
		echo "state kept at $WORK_DIR"
	else
		rm -rf "$WORK_DIR"
	fi
}
trap cleanup EXIT

echo "== environment =="
echo "node:            $(node --version)"
echo "wrangler:        $($WRANGLER_BIN --version 2>/dev/null | tail -1)"
echo "worker bundle:   $API_DIR/dist/worker.js"
echo "d1 binding:      env.DB (local), state dir $STATE_DIR"
echo "auto-migrate:    ON (EXCITED_API_AUTO_MIGRATE unset; the Worker applies pending migrations on first request)"
echo "port:            $PORT"
echo

echo "== build (turbo build, same command CI runs) =="
(cd "$REPO_ROOT" && pnpm exec turbo run build --filter=@excited-live/api --output-logs=errors-only)
echo "dist:            $(ls -1 "$API_DIR/dist" | tr '\n' ' ')"
echo

wait_for_health() {
	for _ in $(seq 1 120); do
		if curl -fsS -m 3 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
			return 0
		fi
		sleep 1
	done
	echo "runtime never became healthy on port $PORT; log:" >&2
	cat "$LOG_FILE" >&2
	return 1
}

log_file_for() { echo "$WORK_DIR/wrangler-$1.log"; }

start_runtime() {
	LOG_FILE="$(log_file_for "$1")"
	# shellcheck disable=SC2086  # WRANGLER may be a multi-word command (npx ...)
	WRANGLER_SEND_METRICS=false CI=1 nohup $WRANGLER_BIN dev --local --ip 127.0.0.1 \
		--port "$PORT" --persist-to "$STATE_DIR" >"$LOG_FILE" 2>&1 &
	API_PID=$!
	wait_for_health
	echo "process #$1: pid $API_PID (log: $LOG_FILE)"
	grep -E "D1 Database|Ready on" "$LOG_FILE" | sed 's/^/  /'
}

stop_runtime() {
	kill "$API_PID"
	wait "$API_PID" 2>/dev/null || true
	if kill -0 "$API_PID" 2>/dev/null; then
		echo "process $API_PID is still alive; aborting" >&2
		exit 1
	fi
	echo "process #$1: pid $API_PID is gone"
	unset API_PID
}

PLAN_JSON="$(cd "$API_DIR" && node -e '
	import("@excited-live/sim").then((sim) => {
		const plan = sim.defaultPlanInput()
		plan.personalAllowances = 123456 // marker: proves this exact body came back
		process.stdout.write(JSON.stringify(plan))
	})
')"
SETTINGS_JSON='{"profileName":"FRO-72 D1 proof","birthday":"1994-03-17","gender":"male"}'
USER="d1-proof-user"

echo "== process #1: boot on real D1, auto-migrate, save =="
start_runtime 1
echo "GET /api/v1/settings (fresh user) -> $(curl -sS -o "$WORK_DIR/get1.json" -w '%{http_code}' \
	-H "x-user-id: $USER" "http://127.0.0.1:$PORT/api/v1/settings") $(cat "$WORK_DIR/get1.json")"
echo "PUT /api/v1/plan                 -> $(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
	-H 'content-type: application/json' -H "x-user-id: $USER" \
	--data "$PLAN_JSON" "http://127.0.0.1:$PORT/api/v1/plan")"
echo "PUT /api/v1/settings             -> $(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
	-H 'content-type: application/json' -H "x-user-id: $USER" \
	--data "$SETTINGS_JSON" "http://127.0.0.1:$PORT/api/v1/settings")"
stop_runtime 1
echo

echo "== the D1 database file workerd just wrote =="
D1_DB="$(ls "$STATE_DIR"/v3/d1/miniflare-D1DatabaseObject/*.sqlite 2>/dev/null | grep -v metadata | head -1)"
echo "  $D1_DB"
ls -l "$D1_DB" | sed 's/^/  /'
echo

echo "== process #2: NEW runtime, SAME D1 file =="
start_runtime 2
GET_PLAN="$(curl -sS -H "x-user-id: $USER" "http://127.0.0.1:$PORT/api/v1/plan")"
GET_SETTINGS="$(curl -sS -H "x-user-id: $USER" "http://127.0.0.1:$PORT/api/v1/settings")"
NEW_PLAN="$(curl -sS -H "x-user-id: brand-new-user" "http://127.0.0.1:$PORT/api/v1/plan")"
NEW_SETTINGS="$(curl -sS -H "x-user-id: brand-new-user" "http://127.0.0.1:$PORT/api/v1/settings")"
echo "GET /api/v1/settings ($USER) -> $GET_SETTINGS"
echo "GET /api/v1/plan     ($USER) -> ${#GET_PLAN} bytes"
echo "GET /api/v1/settings (brand-new-user) -> $NEW_SETTINGS"
echo "GET /api/v1/plan     (brand-new-user) -> ${#NEW_PLAN} bytes"
stop_runtime 2
echo

echo "== migration ledger + rows inside the D1 file (read with node:sqlite) =="
node -e '
	const { DatabaseSync } = require("node:sqlite")
	const db = new DatabaseSync(process.argv[1], { readOnly: true })
	const migrations = db.prepare("SELECT name, applied_at FROM d1_migrations").all()
	console.log("  d1_migrations:", JSON.stringify(migrations))
	const plans = db.prepare("SELECT user_id, length(data) AS bytes FROM plans").all()
	console.log("  plans:        ", JSON.stringify(plans))
	const settings = db.prepare("SELECT user_id, profile_name, birthday, gender FROM user_settings").all()
	console.log("  user_settings:", JSON.stringify(settings))
	db.close()
' "$D1_DB" || echo "  (could not read the D1 file after shutdown)"
echo

echo "== verdict =="
status=0
check() { # check <label> <condition-result>
	if [ "$2" = "yes" ]; then echo "PASS  $1"; else echo "FAIL  $1" >&2; status=1; fi
}
check "GET /api/v1/settings is 200 on real D1 (the FRO-68 500 is gone)" \
	"$( [ "$GET_SETTINGS" = "$SETTINGS_JSON" ] && echo yes || echo no )"
check "plan survived the restart, byte for byte (PUT body == GET body)" \
	"$( [ "$GET_PLAN" = "$PLAN_JSON" ] && echo yes || echo no )"
check "settings survived the restart, byte for byte" \
	"$( [ "$GET_SETTINGS" = "$SETTINGS_JSON" ] && echo yes || echo no )"
check "a fresh x-user-id starts clean (no leakage)" \
	"$( [ "$NEW_SETTINGS" = '{"profileName":"","gender":"female"}' ] && echo yes || echo no )"
check "a fresh x-user-id gets the default plan, not the saved one" \
	"$( [ "$NEW_PLAN" != "$PLAN_JSON" ] && echo yes || echo no )"

exit "$status"
