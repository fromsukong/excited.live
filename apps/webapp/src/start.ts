/**
 * Start instance — wires global request middleware.
 *
 * The middleware resolves the request locale once per request:
 * 1. `excited_live_locale` cookie (visitor's explicit choice),
 * 2. `Accept-Language` header (first supported language),
 * 3. default `en`.
 * It sets the cookie on first visit so the client can re-derive the same
 * locale after hydration, and exposes it to routes via `serverContext`.
 */
import { createStart, createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
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

export const startInstance = createStart(async () => {
	return {
		requestMiddleware: [localeMiddleware],
		router: {
			routeTree,
		},
	}
})
