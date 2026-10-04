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

export interface MonthYearPickerProps {
	label: string
	year: number | null
	month: number
	onChange: (year: number | null, month: number) => void
	allowForever?: boolean
	t: (key: string, vars?: Record<string, string>) => string
}

function useSafePlanDashboardContext() {
	try {
		return usePlanDashboardContext()
	} catch {
		return null
	}
}

function formatAge(
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

/**
 * Month + Year picker built with Astryx Selector component.
 * Features:
 * - "Now" option with green StatusDot indicator
 * - "Forever" option when `allowForever` is true
 * - Chronological month options with relative age badges
 * - Built-in search filtering and keyboard navigation
 */
export function MonthYearPicker({
	label,
	year,
	month,
	onChange,
	allowForever = false,
	t,
}: MonthYearPickerProps) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth()

	const isForever = allowForever && year === null
	const isNow = !isForever && (year === null || (year === currentYear && month === currentMonth))

	const nowLabel = t("picker.now") || "Now"
	const foreverLabel = t("picker.forever") || "Forever"

	// Resolve user's birth year and month for age calculations
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

		const startYear = Math.min(currentYear, year ?? currentYear)
		const endYear = Math.max(currentYear + 40, (year ?? currentYear) + 10)

		for (let y = startYear; y <= endYear; y++) {
			for (let m = 0; m < 12; m++) {
				list.push({
					value: `${y}:${m}`,
					label: `${monthNames[m]} ${y}`,
					description: formatAge(y, m, birthYear, birthMonth),
				})
			}
		}

		return list
	}, [nowLabel, allowForever, foreverLabel, currentYear, year, monthNames, birthYear, birthMonth])

	const selectedValue = useMemo(() => {
		if (isForever) return "forever"
		if (isNow) return "now"
		if (year !== null) return `${year}:${month}`
		return "now"
	}, [isForever, isNow, year, month])

	const handleChange = (val: string) => {
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
