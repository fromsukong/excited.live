import { NumberInput, Stack, Text } from "@excited-live/design-system"
import { formatBaht } from "../../../lib/format"
import { type PlanInput, type RetirementVerdict } from "../../../lib/plan-service"

export interface RetirementEditorProps {
	plan: PlanInput
	/**
	 * Live projection verdict — the visible consequence of these two numbers.
	 * Null while the projection is unavailable (inputs still edit).
	 */
	verdict: RetirementVerdict | null
	onChangeYear: (year: number) => void
	onChangeMonthly: (monthly: number) => void
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * US-101 AC#2 — the wizard's retirement answers, editable in the full inputs.
 * Mirrors the wizard's step 4 (same two fields, same bounds and units) and
 * writes straight through the plan-service boundary, so the projection and
 * the whole dashboard react as you type.
 */
export function RetirementEditor({
	plan,
	verdict,
	onChangeYear,
	onChangeMonthly,
	t,
}: RetirementEditorProps) {
	const currentYear = new Date().getFullYear()
	const year = plan.retirementYear ?? plan.startYear

	return (
		<Stack gap={2}>
			<Text color="secondary">{t("retirement.editor.body")}</Text>
			<NumberInput
				label={t("wizard.retirement.year")}
				description={t("wizard.retirement.yearHint")}
				value={year}
				onChange={(next) => onChangeYear(next ?? year)}
				min={currentYear}
				max={currentYear + 60}
				step={1}
				isIntegerOnly
				units={t("unit.ce")}
				width="100%"
			/>
			<NumberInput
				label={t("wizard.retirement.monthly")}
				description={t("wizard.retirement.monthlyHint")}
				value={plan.retirementMonthlyToday}
				onChange={(monthly) => onChangeMonthly(monthly ?? 0)}
				min={0}
				step={1000}
				units="฿"
				width="100%"
			/>
			{verdict ? (
				<Text size="sm" color="secondary">
					{verdict.funded
						? t("info.retirement.left", {
								amount: formatBaht(verdict.remainingAtEnd),
								year: String(verdict.endYear),
							})
						: t("info.retirement.runsOut", {
								year: String(verdict.unmetYear ?? ""),
							})}
				</Text>
			) : null}
		</Stack>
	)
}
