import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LocalizedLabel } from '@excited-live/tax'

export type Locale = 'en' | 'th'

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (label: LocalizedLabel) => string
} | null>(null)

const STORAGE_KEY = 'tax-webapp:locale'

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  // Always start with the SSR default ('en') so hydration matches, then sync
  // the stored preference after mount. Reading localStorage during the first
  // client render causes a hydration text mismatch (React #418).
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'th') setLocaleState('th')
  }, [])

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next)
        }
      },
      t: (label: LocalizedLabel) => label[locale],
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used inside <LocaleProvider>')
  }
  return context
}
