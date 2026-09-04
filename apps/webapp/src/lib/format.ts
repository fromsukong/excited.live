/**
 * Locale-aware formatting helpers for currency and percentages.
 * Pure presentation — no business logic lives here.
 */
import type { Locale } from "@excited-live/i18n"

const CURRENCY = "THB"

/** Full currency, e.g. "฿1,200,000" (en) / "฿1,200,000" (th). */
export function formatCurrency(value: number, locale: Locale): string {
	return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-TH", {
		style: "currency",
		currency: CURRENCY,
		maximumFractionDigits: 0,
	}).format(value)
}

/** Compact currency for chart overlays, e.g. "฿1.2M" / "฿1.2 ล้าน". */
export function formatCurrencyCompact(value: number, locale: Locale): string {
	const formatter = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-TH", {
		style: "currency",
		currency: CURRENCY,
		notation: "compact",
		maximumFractionDigits: 1,
	})
	return formatter.format(value)
}

/** Signed currency delta, e.g. "+฿614,000". */
export function formatCurrencyDelta(value: number, locale: Locale): string {
	const sign = value >= 0 ? "+" : "−"
	return sign + formatCurrency(Math.abs(value), locale)
}

/** Percent, e.g. "9.6%". */
export function formatPercent(fraction: number, locale: Locale): string {
	return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-TH", {
		style: "percent",
		maximumFractionDigits: 1,
	}).format(fraction)
}

/** Plain year label, e.g. "2036". */
export function formatYear(year: number): string {
	return String(year)
}
