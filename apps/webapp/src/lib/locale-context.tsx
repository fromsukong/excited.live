/**
 * Locale state for React: LocaleProvider + useLocale.
 *
 * SSR locale comes from the request middleware via route context; the client
 * re-derives the same value from document.cookie (the middleware sets it on
 * first visit), so hydration matches. Toggling writes the cookie client-side
 * and updates state — no reload needed.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { localeCookieValue, type Locale, type Translator } from "@excited-live/i18n"
import { getTranslator } from "./dictionaries"

interface LocaleContextValue {
	locale: Locale
	setLocale: (next: Locale) => void
	t: Translator["t"]
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
	initialLocale,
	children,
}: {
	initialLocale: Locale
	children: ReactNode
}) {
	const [locale, setLocaleState] = useState<Locale>(initialLocale)

	useEffect(() => {
		document.documentElement.lang = locale
	}, [locale])

	const value = useMemo<LocaleContextValue>(
		() => ({
			locale,
			setLocale: (next: Locale) => {
				if (typeof document !== "undefined") {
					document.cookie = localeCookieValue(next)
				}
				setLocaleState(next)
			},
			t: getTranslator(locale).t,
		}),
		[locale],
	)

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
	const value = useContext(LocaleContext)
	if (!value) throw new Error("useLocale must be used inside <LocaleProvider>")
	return value
}
