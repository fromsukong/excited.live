import { NumberInput, Stack, Text } from "@excited-live/design-system"
import { usePlanDashboard } from "../../../hooks/usePlanDashboard"

interface WizardStepProps {
	t: (key: string, vars?: Record<string, string>) => string
}

/**
 * Step 2 — Expenses. One question: monthly living expenses. Empty = skip
 * (engine default ฿40,000/month stays).
 */
export function WizardStepExpenses({
	value,
	onChange,
	t,
}: WizardStepProps & {
	value: number | null
	onChange: (value: number | null) => void
}) {
	const { plan } = usePlanDashboard()
	const current = plan.expenses.find((row) => row.typeId === "livingExpenses")
	return (
		<Stack gap={2}>
			<Stack gap={1}>
				<Text size="lg" weight="semibold">
					{t("wizard.expenses.title")}
				</Text>
				<Text color="secondary">{t("wizard.expenses.body")}</Text>
			</Stack>
			<NumberInput
				label={t("wizard.expenses.living")}
				description={t("wizard.expenses.hint")}
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
