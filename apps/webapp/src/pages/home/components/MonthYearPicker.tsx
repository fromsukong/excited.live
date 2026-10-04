import {
	CalendarIcon,
	HStack,
	Selector,
	SelectorOption,
	type SelectorOptionData,
	type SelectorOptionType,
	StatusDot,
	Text,
} from "@excited-live/design-system"
import { useMemo } from "react"
import { usePlanDashboardContext } from "../../../hooks/usePlanDashboard"
import { useLocale } from "../../../lib/locale-context"

export const MONTHS_EN = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
]

export const MONTHS_TH = [
	"ม.ค.",
	"ก.พ.",
	"มี.ค.",
	"เม.ย.",
	"พ.ค.",
	"มิ.ย.",
	"ก.ค.",
	"ส.ค.",
	"ก.ย.",
	"ต.ค.",
	"พ.ย.",
	"ธ.ค.",
]

export type MonthYearPickerMode = "month" | "year"

export interface MonthYearPickerProps {
	label: string
	year: number | null
	month: number
	onChange: (year: number | null, month: number) => void
	allowForever?: boolean
	mode?: MonthYearPickerMode
	t: (key: string, vars?: Record<string, string>) => string
}

function useSafePlanDashboardContext() {
	try {
		return usePlanDashboardContext()
	} catch {
		return null
	}
}

function formatMonthAge(
	targetYear: number,
	targetMonth: number,
	birthYear: number,
	birthMonth: number,
): string {
	const totalMonths = (targetYear - birthYear) * 12 + (targetMonth - birthMonth)
	if (totalMonths < 0) return ""
	const y = Math.floor(totalMonths / 12)
	const m = totalMonths % 12
	return `${y}y${m}m`
}

function formatYearAge(targetYear: number, birthYear: number): string {
	const age = targetYear - birthYear
	return age >= 0 ? `${age}y` : ""
}

/**
 * Month / Year picker built with Astryx Selector component.
 * Configured via `mode` prop:
 * - "month" (default): Pick Month + Year (e.g. "Now", "Jan 2026") with relative age (e.g. "23y5m")
 * - "year": Pick Year only (e.g. "Now", "2026", "2027") with relative age (e.g. "24y")
 * - Both modes support "Forever" when `allowForever` is true.
 * - Single Astryx Selector dropdown with built-in search filtering.
 */
export function MonthYearPicker({
	label,
	year,
	month,
	onChange,
	allowForever = false,
	mode = "month",
	t,
}: MonthYearPickerProps) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth()

	const isForever = allowForever && year === null
	const isNow =
		!isForever &&
		(year === null ||
			(mode === "year"
				? year === currentYear
				: year === currentYear && month === currentMonth))

	const nowLabel = t("picker.now") || "Now"
	const foreverLabel = t("picker.forever") || "Forever"

	// Resolve user's birth year and month for relative age tags
	const ctx = useSafePlanDashboardContext()
	const { birthYear, birthMonth } = useMemo(() => {
		let bYear = 2002
		let bMonth = 7 // Default August matches 23y5m in Jan 2026

		if (ctx?.birthday) {
			const bDate = new Date(ctx.birthday)
			if (!Number.isNaN(bDate.getTime())) {
				bYear = bDate.getFullYear()
				bMonth = bDate.getMonth()
			}
		} else if (ctx?.plan?.birthYear != null) {
			bYear = ctx.plan.birthYear
			bMonth = 7
		}

		return { birthYear: bYear, birthMonth: bMonth }
	}, [ctx?.birthday, ctx?.plan?.birthYear])

	const options = useMemo<SelectorOptionType[]>(() => {
		const startYear = Math.min(currentYear, year ?? currentYear)
		const endYear = Math.max(currentYear + 40, (year ?? currentYear) + 10)

		if (mode === "year") {
			const list: SelectorOptionType[] = [
				{
					value: "now",
					label: nowLabel,
					icon: CalendarIcon,
					description: formatYearAge(currentYear, birthYear),
				},
			]

			if (allowForever) {
				list.push({
					value: "forever",
					label: foreverLabel,
				})
			}

			for (let y = startYear; y <= endYear; y++) {
				list.push({
					value: `${y}`,
					label: `${y}`,
					description: formatYearAge(y, birthYear),
				})
			}

			return list
		}

		// Month mode
		const list: SelectorOptionType[] = [
			{
				value: "now",
				label: nowLabel,
				icon: CalendarIcon,
			},
		]

		if (allowForever) {
			list.push({
				value: "forever",
				label: foreverLabel,
			})
		}

		for (let y = startYear; y <= endYear; y++) {
			for (let m = 0; m < 12; m++) {
				list.push({
					value: `${y}:${m}`,
					label: `${monthNames[m]} ${y}`,
					description: formatMonthAge(y, m, birthYear, birthMonth),
				})
			}
		}

		return list
	}, [
		mode,
		currentYear,
		year,
		nowLabel,
		birthYear,
		allowForever,
		foreverLabel,
		monthNames,
		birthMonth,
	])

	const selectedValue = useMemo(() => {
		if (isForever) return "forever"

		if (mode === "year") {
			if (isNow) return "now"
			if (year !== null) return `${year}`
			return "now"
		}

		// Month mode
		if (isNow) return "now"
		if (year !== null) return `${year}:${month}`
		return "now"
	}, [isForever, mode, isNow, year, month])

	const handleChange = (val: string) => {
		if (mode === "year") {
			if (val === "now") {
				onChange(currentYear, allowForever ? 11 : currentMonth)
			} else if (val === "forever") {
				onChange(null, 11)
			} else {
				const parsedYear = Number.parseInt(val, 10)
				if (Number.isFinite(parsedYear)) {
					const targetMonth = allowForever ? 11 : 0
					onChange(parsedYear, targetMonth)
				}
			}
			return
		}

		// Month mode
		if (val === "now") {
			onChange(currentYear, currentMonth)
		} else if (val === "forever") {
			onChange(null, 0)
		} else {
			const [yStr, mStr] = val.split(":")
			const parsedYear = Number.parseInt(yStr ?? "", 10)
			const parsedMonth = Number.parseInt(mStr ?? "", 10)
			if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
				onChange(parsedYear, parsedMonth)
			}
		}
	}

	return (
		<Selector
			label={label}
			value={selectedValue}
			onChange={handleChange}
			options={options}
			startIcon={CalendarIcon}
			hasSearch
			searchPlaceholder={t("table.search") || "Search..."}
			renderOption={(opt: SelectorOptionData) => (
				<SelectorOption
					icon={opt.icon}
					label={opt.label}
					endContent={
						opt.description ? (
							<Text size="sm" color="secondary">
								{opt.description}
							</Text>
						) : undefined
					}
				/>
			)}
			renderValue={(opt: SelectorOptionData) => (
				<HStack justify="between" align="center" style={{ width: "100%" }}>
					<Text>{opt.label}</Text>
					{opt.value === "now" ? (
						<StatusDot variant="success" label={nowLabel} />
					) : null}
				</HStack>
			)}
		/>
	)
}
