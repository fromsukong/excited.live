/**
 * PlanSections — the right-hand column of the plan dashboard.
 *
 * Architecture note (MVP): a thin REGISTRY of section descriptors rendered in
 * order. Adding a future feature (income streams, spending review, connected
 * accounts, …) = add one entry + one component here; the page never changes.
 * Inputs bind straight to PlanInputs state; every edit flows through
 * `onInputsChange` so the projection recomputes live. When the real backend
 * arrives, these same edits go through plan-service (see its MOCK header) —
 * the UI contract stays identical.
 */
import type { ReactNode } from "react"
import {
	NumberInput,
	SegmentedControl,
	SegmentedControlItem,
	Stack,
	Text,
} from "@excited-live/design-system"
import type { Locale, Translator } from "@excited-live/i18n"
import { useLocale } from "../lib/locale-context"
import type { PlanInputs } from "../lib/plan-service"

export interface PlanSectionProps {
	inputs: PlanInputs
	onInputsChange: (next: PlanInputs) => void
	locale: Locale
	t: Translator["t"]
}

export interface PlanSectionDescriptor {
	id: string
	titleKey: string
	Component: (props: PlanSectionProps) => ReactNode
}

/**
 * SECTION REGISTRY — extend here, in display order.
 * Post-MVP sections (add income streams, spending history, accounts) plug in
 * as new entries; nothing else in the app needs to change.
 */
export const PLAN_SECTIONS: PlanSectionDescriptor[] = [
	{ id: "income", titleKey: "section.income.title", Component: IncomeSection },
	{ id: "spending", titleKey: "section.spending.title", Component: SpendingSection },
	{ id: "tax", titleKey: "section.tax.title", Component: TaxSection },
	{ id: "goal", titleKey: "section.goal.title", Component: GoalSection },
]

/** All sections, rendered under their translated titles. */
export function PlanSections({
	inputs,
	onInputsChange,
}: {
	inputs: PlanInputs
	onInputsChange: (next: PlanInputs) => void
}) {
	const { locale, t } = useLocale()
	return (
		<Stack direction="vertical" gap={6} aria-label={t("a11y.planSections")}>
			{PLAN_SECTIONS.map(({ id, titleKey, Component }) => (
				<Stack key={id} as="section" className="plan-section" gap={3} aria-label={t(titleKey)}>
					<Stack direction="horizontal" align="center" justify="between" className="plan-section__heading">
						<Text className="plan-section__title">{t(titleKey)}</Text>
					</Stack>
					<Component inputs={inputs} onInputsChange={onInputsChange} locale={locale} t={t} />
				</Stack>
			))}
		</Stack>
	)
}

// ---------------------------------------------------------------------------
// Shared field wrappers
// ---------------------------------------------------------------------------

function PlanNumberField(props: {
	label: string
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	step?: number
	units?: string
	description?: string
	isOptional?: boolean
	isIntegerOnly?: boolean
}) {
	return (
		<NumberInput
			label={props.label}
			value={props.value}
			onChange={props.onChange}
			min={props.min}
			max={props.max}
			step={props.step}
			units={props.units}
			description={props.description}
			isOptional={props.isOptional}
			isIntegerOnly={props.isIntegerOnly}
			isWheelEnabled={false}
			className="plan-field"
		/>
	)
}

/** Percent-backed field: PlanInputs stores 0.03, the field shows 3. */
function PlanPercentField(props: {
	label: string
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	step?: number
}) {
	return (
		<PlanNumberField
			label={props.label}
			value={Math.round(props.value * 1000) / 10}
			onChange={(value) => props.onChange(value / 100)}
			min={props.min}
			max={props.max}
			step={props.step}
			units="%"
		/>
	)
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function IncomeSection({ inputs, onInputsChange, t }: PlanSectionProps) {
	function update(patch: Partial<PlanInputs>) {
		onInputsChange({ ...inputs, ...patch })
	}
	return (
		<Stack direction="vertical" gap={4}>
			<PlanNumberField
				label={t("field.annualIncome")}
				value={inputs.annualIncome}
				onChange={(value) => update({ annualIncome: value })}
				min={0}
				step={10_000}
				units="THB"
			/>
			<PlanPercentField
				label={t("field.salaryGrowth")}
				value={inputs.assumptions.salaryGrowthRate}
				onChange={(value) =>
					update({ assumptions: { ...inputs.assumptions, salaryGrowthRate: value } })
				}
				min={0}
				max={30}
				step={0.5}
			/>
			<Stack direction="horizontal" gap={3} className="plan-field-trio">
				<PlanNumberField
					label={t("field.personalAllowances")}
					value={inputs.personalAllowances}
					onChange={(value) => update({ personalAllowances: value })}
					min={0}
					max={10}
					isIntegerOnly
				/>
				<PlanNumberField
					label={t("field.spouseAllowances")}
					value={inputs.spouseAllowances}
					onChange={(value) => update({ spouseAllowances: value })}
					min={0}
					max={1}
					isIntegerOnly
				/>
				<PlanNumberField
					label={t("field.childrenAllowances")}
					value={inputs.childrenAllowances}
					onChange={(value) => update({ childrenAllowances: value })}
					min={0}
					max={10}
					isIntegerOnly
				/>
			</Stack>
		</Stack>
	)
}

function SpendingSection({ inputs, onInputsChange, t }: PlanSectionProps) {
	function update(patch: Partial<PlanInputs>) {
		onInputsChange({ ...inputs, ...patch })
	}
	return (
		<Stack direction="vertical" gap={4}>
			<PlanNumberField
				label={t("field.monthlySpending")}
				value={inputs.annualSpending}
				onChange={(value) => update({ annualSpending: value })}
				min={0}
				step={1_000}
				units="THB"
			/>
			<PlanPercentField
				label={t("field.spendingGrowth")}
				value={inputs.assumptions.spendingGrowthRate}
				onChange={(value) =>
					update({ assumptions: { ...inputs.assumptions, spendingGrowthRate: value } })
				}
				min={0}
				max={30}
				step={0.5}
			/>
		</Stack>
	)
}

function TaxSection({ inputs, onInputsChange, t }: PlanSectionProps) {
	function update(patch: Partial<PlanInputs>) {
		onInputsChange({ ...inputs, ...patch })
	}
	return (
		<Stack direction="vertical" gap={4}>
			<PlanPercentField
				label={t("field.withheldRate")}
				value={inputs.withholdingRate}
				onChange={(value) => update({ withholdingRate: value })}
				min={0}
				max={50}
				step={0.5}
			/>
			<PlanNumberField
				label={t("field.insurance")}
				value={inputs.insurance}
				onChange={(value) => update({ insurance: value })}
				min={0}
				step={5_000}
				units="THB"
			/>
			<PlanNumberField
				label={t("field.retirement")}
				value={inputs.retirementSavings}
				onChange={(value) => update({ retirementSavings: value })}
				min={0}
				step={5_000}
				units="THB"
				description={t("field.retirement.desc")}
			/>
			<Text className="plan-section__footnote">{t("section.tax.footnote")}</Text>
		</Stack>
	)
}

const HORIZON_OPTIONS = [10, 20, 30, 40] as const

function GoalSection({ inputs, onInputsChange, t }: PlanSectionProps) {
	function update(patch: Partial<PlanInputs>) {
		onInputsChange({ ...inputs, ...patch })
	}
	return (
		<Stack direction="vertical" gap={4}>
			<PlanNumberField
				label={t("field.startingNetWorth")}
				value={inputs.startingNetWorth}
				onChange={(value) => update({ startingNetWorth: value })}
				min={0}
				step={10_000}
				units="THB"
			/>
			<NumberInput
				label={t("field.targetNetWorth")}
				value={inputs.targetNetWorth}
				onChange={(value) => update({ targetNetWorth: value ?? 0 })}
				min={0}
				step={100_000}
				units="THB"
				isOptional
				isWheelEnabled={false}
				className="plan-field"
				hasClear
			/>
			<PlanPercentField
				label={t("field.annualReturn")}
				value={inputs.assumptions.annualReturnRate}
				onChange={(value) =>
					update({ assumptions: { ...inputs.assumptions, annualReturnRate: value } })
				}
				min={0}
				max={30}
				step={0.5}
			/>
			<Stack direction="vertical" gap={2}>
				<Text className="plan-field-label">{t("field.horizon")}</Text>
				<SegmentedControl
					value={String(inputs.horizonYears)}
					onChange={(value) => update({ horizonYears: Number(value) })}
					label={t("field.horizon")}
					layout="fill"
				>
					{HORIZON_OPTIONS.map((years) => (
						<SegmentedControlItem
							key={years}
							value={String(years)}
							label={t("horizon.years", { years: String(years) })}
						/>
					))}
				</SegmentedControl>
			</Stack>
		</Stack>
	)
}
