import {
	CalendarIcon,
	HStack,
	SegmentedControl,
	SegmentedControlItem,
	Selector,
	SelectorOption,
	type SelectorOptionData,
	type SelectorOptionType,
	Stack,
	StatusDot,
	Text,
} from "@excited-live/design-system"
import { useMemo, useState } from "react"
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
	onModeChange?: (mode: MonthYearPickerMode) => void
	showModeToggle?: boolean
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
 * Month + Year picker built with Astryx Selector and SegmentedControl components.
 * Features 2 selection modes:
 * - "month": Pick specific Month + Year (e.g. "Now", "Jan 2026") with relative age (e.g. "23y5m")
 * - "year": Pick by Year (e.g. "2026", "2027") with relative age (e.g. "24y")
 * - Both modes support "Forever" when `allowForever` is true.
 * - Built-in typeahead search filtering via Astryx Selector `hasSearch`.
 */
export function MonthYearPicker({
	label,
	year,
	month,
	onChange,
	allowForever = false,
	mode,
	onModeChange,
	showModeToggle = true,
	t,
}: MonthYearPickerProps) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const [internalMode, setInternalMode] = useState<MonthYearPickerMode>("month")
	const currentMode = mode ?? internalMode

	const handleModeChange = (nextMode: MonthYearPickerMode) => {
		if (onModeChange) {
			onModeChange(nextMode)
		} else {
			setInternalMode(nextMode)
		}
	}

	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth()

	const isForever = allowForever && year === null
	const isNow = !isForever && (year === null || (year === currentYear && month === currentMonth))

	const nowLabel = t("picker.now") || "Now"
	const foreverLabel = t("picker.forever") || "Forever"
	const monthModeLabel = t("picker.month") || "Month"
	const yearModeLabel = t("picker.year") || "Year"

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

		if (currentMode === "year") {
			const list: SelectorOptionType[] = [
				{
					value: "now",
					label: `${currentYear} (${nowLabel})`,
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
				if (y === currentYear) continue
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
		currentMode,
		currentYear,
		nowLabel,
		birthYear,
		allowForever,
		foreverLabel,
		year,
		monthNames,
		birthMonth,
	])

	const selectedValue = useMemo(() => {
		if (isForever) return "forever"

		if (currentMode === "year") {
			if (year === null || year === currentYear) return "now"
			return `${year}`
		}

		// Month mode
		if (isNow) return "now"
		if (year !== null) return `${year}:${month}`
		return "now"
	}, [isForever, currentMode, isNow, year, month, currentYear])

	const handleChange = (val: string) => {
		if (currentMode === "year") {
			if (val === "now") {
				onChange(currentYear, allowForever ? 11 : currentMonth)
			} else if (val === "forever") {
				onChange(null, 11)
			} else {
				const parsedYear = Number.parseInt(val, 10)
				if (Number.isFinite(parsedYear)) {
					// In year mode, default month is 0 for start or 11 for end (allowForever)
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

	const selectorElement = (
		<Selector
			label={label}
			isLabelHidden={showModeToggle}
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

	if (!showModeToggle) {
		return selectorElement
	}

	return (
		<Stack gap={1}>
			<HStack justify="between" align="center">
				<Text size="sm" color="secondary">
					{label}
				</Text>
				<SegmentedControl
					value={currentMode}
					onChange={(val) => handleModeChange(val as MonthYearPickerMode)}
					size="sm"
					label={`${label} mode`}
				>
					<SegmentedControlItem value="month" label={monthModeLabel} />
					<SegmentedControlItem value="year" label={yearModeLabel} />
				</SegmentedControl>
			</HStack>
			{selectorElement}
		</Stack>
	)
}
