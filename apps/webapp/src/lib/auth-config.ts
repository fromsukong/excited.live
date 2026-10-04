/**
 * AuthKit requires 4 env vars (WORKOS_CLIENT_ID, WORKOS_API_KEY,
 * WORKOS_REDIRECT_URI, WORKOS_COOKIE_PASSWORD). Environments without them
 * (PR previews, prelive, local mock work) must not have every request 500 —
 * authkitMiddleware throws on first use when the config is missing. The start
 * callback is re-evaluated per request (TanStack Start waitForRequest), so the
 * check runs at request time and works on workerd/Cloudflare Pages too.
 * When unconfigured, we keep CSRF + locale and log once per process.
 */
let authConfigWarned = false

export function authkitConfigured(): boolean {
	const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
	const ok = Boolean(
		env?.WORKOS_CLIENT_ID && env?.WORKOS_API_KEY && env?.WORKOS_REDIRECT_URI && env?.WORKOS_COOKIE_PASSWORD,
	)
	if (!ok && !authConfigWarned) {
		authConfigWarned = true
		console.warn("[auth] WORKOS_* env vars not set — AuthKit disabled for this environment (auth routes unavailable)")
	}
	return ok
}

/**
 * Route gate (#46): the gate is production-only; prelive/previews/local leave
 * the flag unset so the app stays browsable.
 * True iff authkitConfigured() AND WORKOS_REQUIRE_AUTH === "true" OR === "1".
 */
export function authRequired(): boolean {
	if (!authkitConfigured()) return false
	const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
	const flag = env?.WORKOS_REQUIRE_AUTH
	return flag === "true" || flag === "1"
}
