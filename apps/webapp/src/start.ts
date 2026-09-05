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
import { authkitMiddleware } from "@workos/authkit-tanstack-react-start"
import {
	localeCookieValue,
	localeFromAcceptLanguage,
	localeFromCookie,
	type Locale,
} from "@excited-live/i18n"
import { routeTree } from "./routeTree.gen"

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

export const startInstance = createStart(async () => {
	return {
		requestMiddleware: [localeMiddleware, csrfMiddleware, authkitMiddleware()],
		router: {
			routeTree,
		},
	}
})
