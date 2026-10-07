import { NumberInput, Stack, Text } from "@excited-live/design-system"
import { usePlanDashboardContext } from "../../../hooks/usePlanDashboard"

interface WizardStepProps {
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * Step 1 — Income. One question: monthly salary. Empty = skip (engine default
 * ฿100,000/month stays).
 */
export function WizardStepIncome({
	value,
	onChange,
	t,
}: WizardStepProps & {
	value: number | null
	onChange: (value: number | null) => void
}) {
	const { plan } = usePlanDashboardContext()
	const current = plan.incomes.find((row) => row.typeId === "salary")
	return (
		<Stack gap={2}>
			<Stack gap={1}>
				<Text size="lg" weight="semibold">
					{t("wizard.income.title")}
				</Text>
				<Text color="secondary">{t("wizard.income.body")}</Text>
			</Stack>
			<NumberInput
				label={t("wizard.income.salary")}
				description={t("wizard.income.hint")}
				value={value ?? current?.amount ?? null}
				onChange={(next) => onChange(next)}
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
