import { Outlet, createRootRoute, HeadContent, Scripts, useRouteContext } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { DEFAULT_LOCALE, localeFromCookie, type Locale } from "@excited-live/i18n"
import { getTranslator } from "../lib/dictionaries"
import { LocaleProvider, useLocale } from "../lib/locale-context"
import "@astryxdesign/core/reset.css"
import "@astryxdesign/core/astryx.css"
import "@astryxdesign/theme-neutral/theme.css"
import "../styles.css"

export const Route = createRootRoute({
	beforeLoad: (ctx) => {
		// The global request middleware (src/start.ts) attaches `serverContext`
		// via router.options.additionalContext; it is typed `any` upstream.
		const serverContext = (ctx as { serverContext?: { locale?: Locale } }).serverContext
		const locale: Locale =
			serverContext?.locale ??
			(typeof document !== "undefined"
				? // Client navigation: cookie is the source of truth for explicit choice.
					(localeFromCookie(document.cookie) ?? DEFAULT_LOCALE)
				: DEFAULT_LOCALE)
		return { locale }
	},
	head: ({ match }) => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: getTranslator(match.context.locale).t("app.title") },
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { locale } = useRouteContext({ from: Route.id })

	return (
		<LocaleProvider initialLocale={locale}>
			<RootDocument>
				<Outlet />
			</RootDocument>
		</LocaleProvider>
	)
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	const { locale } = useLocale()

	return (
		<html lang={locale} data-theme="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
