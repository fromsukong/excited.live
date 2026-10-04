/**
 * Start instance — wires global request middleware.
 *
 * Middleware order matters:
 * 1. `localeMiddleware` — resolves the request locale (existing behavior, unchanged).
 * 2. `csrfMiddleware` — rejects cross-site requests to server-function RPC
 *    endpoints. Defining our own start instance opts us out of TanStack's
 *    built-in CSRF protection, so we re-add it explicitly. It must run before
 *    the AuthKit middleware so cross-site requests are rejected before any
 *    session work happens (per @workos/authkit-tanstack-react-start docs).
 * 3. `authkitMiddleware` — validates/refreshes the WorkOS AuthKit session and
 *    exposes auth context to server functions and route loaders.
 * 4. `authGuardMiddleware` — route gate (#46): redirects signed-out page requests
 *    to /api/auth/sign-in when auth is required (WORKOS_REQUIRE_AUTH). Must run
 *    after authkitMiddleware so the session is already resolved.
 *
 * The locale middleware resolves the request locale once per request:
 * 1. `excited_live_locale` cookie (visitor's explicit choice),
 * 2. `Accept-Language` header (first supported language),
 * 3. default `en`.
 * It sets the cookie on first visit so the client can re-derive the same
 * locale after hydration, and exposes it to routes via `serverContext`.
 */
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { authkitMiddleware, type AuthKitContext } from "@workos/authkit-tanstack-react-start"
import {
	localeCookieValue,
	localeFromAcceptLanguage,
	localeFromCookie,
	type Locale,
} from "@excited-live/i18n"
import { routeTree } from "./routeTree.gen"
import { authkitConfigured, authRequired } from "./lib/auth-config"

const localeMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
	const request = getRequest()
	const cookieLocale = localeFromCookie(request.headers.get("cookie"))
	const locale: Locale = cookieLocale ?? localeFromAcceptLanguage(request.headers.get("accept-language")) ?? "en"
	const setCookieNeeded = cookieLocale === undefined && locale !== "en"

	const response = await next({ context: { locale } })

	if (setCookieNeeded) {
		// The middleware result should carry a real Response; guard anyway so a
		// failure to persist the cookie can never break rendering.
		try {
			const inner = (response as { response?: Response }).response
			inner?.headers?.append("set-cookie", localeCookieValue(locale, { secure: true }))
		} catch (error) {
			console.error("[i18n] failed to set locale cookie", error)
		}
	}

	return response
})

// Reject cross-site requests to server-function RPC endpoints (header check on
// Sec-Fetch-Site / Origin / Referer; no tokens, no interaction with the AuthKit
// session cookie).
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
})

/**
 * Route gate (#46): when auth is required (see lib/auth-config.ts), signed-out
 * PAGE requests are redirected into the AuthKit sign-in flow. Only registered
 * after authkitMiddleware, and only when configured + required.
 *
 * This is a PAGE-LEVEL gate only: server-function RPCs are intentionally not
 * gated (getAuthState must stay callable while signed out). Any future server
 * function that touches user data must check getAuth() itself — the
 * WORKOS_REQUIRE_AUTH flag does not cover server functions.
 */
// Endpoints that must stay reachable while signed out — the AuthKit flow
// itself. Exact paths only: anything else under /api/auth/ added later stays
// gated by default (a prefix check would silently exempt it).
const PUBLIC_AUTH_PATHS = new Set(["/api/auth/sign-in", "/api/auth/callback", "/api/auth/sign-out"])

// Static file shapes (missing /favicon.ico, /robots.txt, …) pass through so
// they render their normal 404 instead of a sign-in bounce. Strict extension
// allowlist on purpose — a dotted route segment (e.g. /user/john.doe) must
// stay gated, so do NOT widen this to "contains a dot".
const STATIC_FILE_EXTENSION_RE = /\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?|txt|xml|map)$/i

const authGuardMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next, request, context, pathname, handlerType }) => {
		// Page/router requests only — see the gate comment above.
		if (handlerType !== "router") return next()
		if (PUBLIC_AUTH_PATHS.has(pathname)) return next()
		const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1)
		if (STATIC_FILE_EXTENSION_RE.test(lastSegment)) return next()

		// authkitMiddleware merges its context ({ auth, request, … }) into the
		// downstream middleware context before this middleware runs — read the
		// session from there. (The *global* start context is only available once
		// the terminal handler runs, which is too late for a middleware guard.)
		// The channel is untyped (the WorkOS package doesn't surface the merged
		// context type), so read it by shape.
		const authkit: Partial<AuthKitContext> = context ?? {}
		if (typeof authkit.auth !== "function") {
			// Unreachable when the guard is registered correctly (it only mounts
			// alongside authkitMiddleware). Fail closed rather than silently
			// disengaging the gate.
			console.error("[auth] guard: AuthKit context missing — refusing request")
			return new Response("Auth is misconfigured", {
				status: 503,
				headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
			})
		}
		const { user } = authkit.auth()
		if (user) return next()

		// Preserve the full target (path + query) so deep links survive sign-in.
		const url = new URL(request.url)
		const returnPathname = encodeURIComponent(url.pathname + url.search)
		return new Response(null, {
			status: 307,
			headers: {
				location: `/api/auth/sign-in?returnPathname=${returnPathname}`,
				"cache-control": "no-store",
			},
		})
	},
)

export const startInstance = createStart(async () => {
	const configured = authkitConfigured()
	return {
		requestMiddleware: [
			localeMiddleware,
			csrfMiddleware,
			...(configured ? [authkitMiddleware()] : []),
			...(configured && authRequired() ? [authGuardMiddleware] : []),
		],
		router: {
			routeTree,
		},
	}
})
