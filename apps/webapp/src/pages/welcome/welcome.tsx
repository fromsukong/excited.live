import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
	Button,
	Card,
	Heading,
	HStack,
	PlainButton,
	Stack,
	Text,
} from "@excited-live/design-system"
import {
	applyWizardAnswers,
	emptyWizardAnswers,
	hasCompletedWizard,
	isBaselinePlan,
	markWizardCompleted,
	resetWizardCompleted,
	type WizardAnswers,
} from "../../lib/wizard"
import { usePlanDashboardContext } from "../../hooks/usePlanDashboard"
import type { PlanInput } from "../../lib/plan-service"
import { formatBaht } from "../../lib/format"
import { WizardStepIncome } from "./components/WizardStepIncome"
import { WizardStepExpenses } from "./components/WizardStepExpenses"
import { WizardStepGoals } from "./components/WizardStepGoals"
import { WizardStepRetirement } from "./components/WizardStepRetirement"

const STEP_IDS = ["income", "expenses", "goals", "retirement"] as const
type StepId = (typeof STEP_IDS)[number]

export function Welcome() {
	const { t, plan, setPlan } = usePlanDashboardContext()
	// SPA navigation: the plan lives in the PlanDashboardProvider above the
	// Outlet, so navigating client-side carries the wizard's answers into the
	// dashboard. A hard reload would remount the provider and reset to
	// defaults (plan state is still mock / non-persisted).
	const navigate = useNavigate()
	const [answers, setAnswers] = useState<WizardAnswers>(emptyWizardAnswers)
	const [stepIndex, setStepIndex] = useState(0)
	const [finished, setFinished] = useState(false)

	const step: StepId = STEP_IDS[stepIndex] ?? "income"
	const isFirst = stepIndex === 0
	const isLast = stepIndex === STEP_IDS.length - 1

	// First-run gate (mock mode): show the wizard when this browser never
	// completed it AND the plan is still the untouched engine default. A
	// returning user (flag set) or anyone who already edited their plan goes
	// straight to the dashboard — the wizard must never clobber existing work.
	const wizardState = useMemo<"loading" | "first-run" | "returning">(() => {
		if (finished) return "first-run"
		if (typeof window === "undefined") return "loading"
		if (hasCompletedWizard()) return "returning"
		return isBaselinePlan(plan) ? "first-run" : "returning"
	}, [finished, plan])

	if (wizardState === "loading") {
		return <Stack className="wizard-page" aria-hidden="true" />
	}

	if (wizardState === "returning") {
		return (
			<Stack gap={3} className="wizard-page wizard-page--done">
				<Card className="wizard-card" padding={4}>
					<Stack gap={2}>
						<Heading level={2}>{t("wizard.returning.title")}</Heading>
						<Text color="secondary">{t("wizard.returning.body")}</Text>
						<HStack gap={2}>
							<Button
								label={t("wizard.goto.dashboard")}
								variant="primary"
								onClick={() => void navigate({ to: "/" })}
							/>
							<PlainButton className="wizard-restart" onClick={resetWizardCompleted}>
								{t("wizard.restart")}
							</PlainButton>
						</HStack>
					</Stack>
				</Card>
			</Stack>
		)
	}

	if (finished) {
		return (
			<WizardFinished
				t={t}
				plan={plan}
				onEnter={() => {
					markWizardCompleted()
					void navigate({ to: "/" })
				}}
			/>
		)
	}

	const total = STEP_IDS.length
	const current = stepIndex + 1

	const finish = () => {
		const next = applyWizardAnswers(answers)
		setPlan(next)
		setFinished(true)
	}

	return (
		<Stack gap={3} className="wizard-page">
			<Stack gap={1} className="wizard-progress" aria-label={t("wizard.progressLabel")}>
				<Text size="sm" color="secondary">
					{t("wizard.stepCounter", { current: String(current), total: String(total) })}
				</Text>
				<Stack direction="horizontal" gap={1} className="wizard-progress__dots">
					{STEP_IDS.map((id, index) => (
						<Stack
							key={id}
							className={`wizard-progress__dot ${index <= stepIndex ? "is-done" : ""}`}
						/>
					))}
				</Stack>
			</Stack>

			<Card className="wizard-card" padding={4}>
				{step === "income" ? (
					<WizardStepIncome
						value={answers.salaryMonthly}
						onChange={(value) => setAnswers((prev) => ({ ...prev, salaryMonthly: value }))}
						t={t}
					/>
				) : null}
				{step === "expenses" ? (
					<WizardStepExpenses
						value={answers.livingMonthly}
						onChange={(value) => setAnswers((prev) => ({ ...prev, livingMonthly: value }))}
						t={t}
					/>
				) : null}
				{step === "goals" ? (
					<WizardStepGoals
						goals={answers.goals}
						onChange={(goals) => setAnswers((prev) => ({ ...prev, goals }))}
						t={t}
					/>
				) : null}
				{step === "retirement" ? (
					<WizardStepRetirement
						retirementYear={answers.retirementYear}
						retirementMonthlyToday={answers.retirementMonthlyToday}
						onChange={(patch) => setAnswers((prev) => ({ ...prev, ...patch }))}
						t={t}
					/>
				) : null}
			</Card>

			<HStack justify="between" className="wizard-footer">
				{isFirst ? (
					<Stack className="wizard-footer__spacer" />
				) : (
					<PlainButton onClick={() => setStepIndex((index) => index - 1)}>
						{t("wizard.back")}
					</PlainButton>
				)}
				<HStack gap={2}>
					<PlainButton onClick={finish}>{t("wizard.skipAll")}</PlainButton>
					{isLast ? (
						<Button label={t("wizard.finish")} variant="primary" onClick={finish} />
					) : (
						<Button
							label={t("wizard.next")}
							variant="primary"
							onClick={() => setStepIndex((index) => index + 1)}
						/>
					)}
				</HStack>
			</HStack>
		</Stack>
	)
}

interface WizardFinishedProps {
	t: (key: string, vars?: Record<string, string>) => string
	plan: PlanInput
	onEnter: () => void
}

function WizardFinished({ t, plan, onEnter }: WizardFinishedProps) {
	const salary = plan.incomes.find((row) => row.typeId === "salary")
	const living = plan.expenses.find((row) => row.typeId === "livingExpenses")
	return (
		<Stack gap={3} className="wizard-page wizard-page--done">
			<Card className="wizard-card" padding={4}>
				<Stack gap={2}>
					<Heading level={2}>{t("wizard.done.title")}</Heading>
					<Text color="secondary">{t("wizard.done.body")}</Text>
					<Stack gap={1} className="wizard-finish-facts">
						<Text>
							{t("wizard.done.income")}: {formatBaht(salary?.amount ?? 0)}
							{t("freq.perMonth")}
						</Text>
						<Text>
							{t("wizard.done.expenses")}: {formatBaht(living?.amount ?? 0)}
							{t("freq.perMonth")}
						</Text>
						<Text>
							{t("wizard.done.retireYear")}: {plan.retirementYear ?? "—"}
						</Text>
						<Text>
							{t("wizard.done.retireSpend")}: {formatBaht(plan.retirementMonthlyToday)}
							{t("freq.perMonth")}
						</Text>
					</Stack>
					<HStack gap={2}>
						<Button
							label={t("wizard.done.cta")}
							variant="primary"
							onClick={onEnter}
						/>
					</HStack>
				</Stack>
			</Card>
		</Stack>
	)
}

export default Welcome
