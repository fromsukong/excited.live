import {
	NumberInput,
	SegmentedControl,
	SegmentedControlItem,
	Selector,
	Stack,
	Text,
} from "@excited-live/design-system"
import { useLocale } from "../lib/locale-context"

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

/**
 * Month + year picker for a period row boundary. Month = Astryx Selector
 * dropdown; year = compact integer input. `allowForever` adds an ∞ option
 * that clears the end year (row runs forever).
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
	const forever = allowForever && year === null
	const monthOptions = monthNames.map((name, index) => ({
		value: `${index}:${name}`,
		label: name,
	}))

	return (
		<Stack gap={0.5}>
			<Text size="sm" color="secondary">
				{label}
			</Text>
			<Stack direction="horizontal" align="center" gap={1}>
				{allowForever ? (
					<SegmentedControl
						value={forever ? "forever" : "until"}
						onChange={(value) =>
							onChange(
								value === "forever" ? null : new Date().getFullYear() + 1,
								month,
							)
						}
						label={label}
						size="sm"
					>
						<SegmentedControlItem value="until" label={t("row.until")} />
						<SegmentedControlItem value="forever" label="∞" />
					</SegmentedControl>
				) : null}
				{!forever ? (
					<>
						<NumberInput
							label={`${label} year`}
							isLabelHidden
							value={year ?? undefined}
							onChange={(value) =>
								onChange(value === null ? null : Math.round(value), month)
							}
							isIntegerOnly
							min={2000}
							max={2100}
							width={88}
						/>
						<Selector
							label={`${label} month`}
							isLabelHidden
							value={`${month}:${monthNames[month]}`}
							onChange={(value) => {
								const parsed = Number.parseInt(value.split(":")[0] ?? "0", 10)
								onChange(year, Number.isFinite(parsed) ? parsed : 0)
							}}
							options={monthOptions}
							width={110}
						/>
					</>
				) : null}
			</Stack>
		</Stack>
	)
}
