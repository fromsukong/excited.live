import { Button, NumberInput, PlainButton, Stack, Text, TextInput } from "@excited-live/design-system"
import type { WizardGoalDraft } from "../../../lib/wizard"

interface WizardStepProps {
	t: (key: string, vars?: Record<string, string>) => string
}

const MAX_GOALS = 3

/**
 * Step 3 — Goals (fully optional). Up to three simple goals: name, amount in
 * today's money, target year. Skipping keeps the engine default (no goals).
 */
export function WizardStepGoals({
	goals,
	onChange,
	t,
}: WizardStepProps & {
	goals: WizardGoalDraft[]
	onChange: (goals: WizardGoalDraft[]) => void
}) {
	const currentYear = new Date().getFullYear()

	const patch = (index: number, changes: Partial<WizardGoalDraft>) => {
		onChange(goals.map((goal, i) => (i === index ? { ...goal, ...changes } : goal)))
	}

	return (
		<Stack gap={2}>
			<Stack gap={1}>
				<Text size="lg" weight="semibold">
					{t("wizard.goals.title")}
				</Text>
				<Text color="secondary">{t("wizard.goals.body")}</Text>
			</Stack>

			{goals.map((goal, index) => (
				<Stack key={index} gap={1.5} className="wizard-goal-row">
					<TextInput
						label={t("row.label")}
						value={goal.label}
						onChange={(label) => patch(index, { label })}
						placeholder={t("wizard.goals.labelPlaceholder")}
					/>
					<NumberInput
						label={t("wizard.goals.amount")}
						value={goal.amountToday}
						onChange={(amount) => patch(index, { amountToday: amount })}
						min={0}
						step={10_000}
						units="฿"
					/>
					<NumberInput
						label={t("wizard.goals.targetYear")}
						value={goal.targetYear}
						onChange={(year) => patch(index, { targetYear: year })}
						min={currentYear}
						max={currentYear + 60}
						step={1}
						isIntegerOnly
					/>
					<PlainButton
						className="wizard-goal-remove"
						onClick={() => onChange(goals.filter((_, i) => i !== index))}
					>
						{t("row.remove")}
					</PlainButton>
				</Stack>
			))}

			{goals.length < MAX_GOALS ? (
				<Stack>
					<Button
						label={t("wizard.goals.add")}
						variant="secondary"
						onClick={() =>
							onChange([
								...goals,
								{ label: "", amountToday: 1_000_000, targetYear: currentYear + 5 },
							])
						}
					/>
				</Stack>
			) : null}

			<Text size="sm" color="secondary">
				{t("wizard.skipNote")}
			</Text>
		</Stack>
	)
}
