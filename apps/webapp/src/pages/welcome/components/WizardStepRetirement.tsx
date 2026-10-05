import { NumberInput, Stack, Text } from "@excited-live/design-system"
import { usePlanDashboard } from "../../../hooks/usePlanDashboard"

interface WizardStepProps {
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * Step 4 — Retirement wish. Two numbers: the year you want to stop working
 * and the monthly spending you want in retirement (today's money).
 * Empty = skip (engine defaults stay).
 */
export function WizardStepRetirement({
	retirementYear,
	retirementMonthlyToday,
	onChange,
	t,
}: WizardStepProps & {
	retirementYear: number | null
	retirementMonthlyToday: number | null
	onChange: (patch: {
		retirementYear?: number | null
		retirementMonthlyToday?: number | null
	}) => void
}) {
	const { plan } = usePlanDashboard()
	const currentYear = new Date().getFullYear()

	return (
		<Stack gap={2}>
			<Stack gap={1}>
				<Text size="lg" weight="semibold">
					{t("wizard.retirement.title")}
				</Text>
				<Text color="secondary">{t("wizard.retirement.body")}</Text>
			</Stack>
			<NumberInput
				label={t("wizard.retirement.year")}
				description={t("wizard.retirement.yearHint")}
				value={retirementYear ?? plan.retirementYear}
				onChange={(year) => onChange({ retirementYear: year })}
				min={currentYear}
				max={currentYear + 60}
				step={1}
				isIntegerOnly
				units="ค.ศ."
				width="100%"
			/>
			<NumberInput
				label={t("wizard.retirement.monthly")}
				description={t("wizard.retirement.monthlyHint")}
				value={retirementMonthlyToday ?? plan.retirementMonthlyToday}
				onChange={(monthly) => onChange({ retirementMonthlyToday: monthly })}
				min={0}
				step={1000}
				units="฿"
				width="100%"
			/>
			<Text size="sm" color="secondary">
				{t("wizard.skipNote")}
			</Text>
		</Stack>
	)
}
