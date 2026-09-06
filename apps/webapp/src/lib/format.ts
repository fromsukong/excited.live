/**
 * Display formatters for the MVP dashboard. Pure; locale-independent by
 * design (THB amounts use the same grouping in EN and TH).
 */

/** ฿1,234,567 — whole baht, no decimals (rounds half away from zero). */
export function formatBaht(value: number): string {
	const rounded = Math.round(Math.abs(value))
	const sign = value < 0 ? "-" : ""
	const grouped = rounded.toLocaleString("en-US")
	return `${sign}฿${grouped}`
}

/** ฿1.2M / ฿950k — compact form for chart axes. */
export function formatBahtCompact(value: number): string {
	const abs = Math.abs(value)
	const sign = value < 0 ? "-" : ""
	if (abs >= 1_000_000) {
		const millions = abs / 1_000_000
		return `${sign}฿${millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10}M`
	}
	if (abs >= 1_000) {
		return `${sign}฿${Math.round(abs / 1_000)}k`
	}
	return `${sign}฿${Math.round(abs)}`
}

/** Percent label: 0.07 → "7%", 0.025 → "2.5%". */
export function formatPercent(rate: number): string {
	const pct = rate * 100
	const rounded = Math.round(pct * 10) / 10
	return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

/** Monthly equivalent of a yearly amount: ฿40,000/mo. */
export function formatBahtMonthly(yearly: number): string {
	return `${formatBaht(yearly / 12)}/mo`
}
