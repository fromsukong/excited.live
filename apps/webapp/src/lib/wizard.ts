/**
 * US-101 — Onboarding wizard model.
 *
 * Pure mapping layer between the wizard's answers and the real PlanInput
 * fields. The wizard never invents defaults: skipping a step keeps the
 * engine's value from `defaultPlanInput()`, so "skip everything" lands on
 * exactly the engine's sensible TH defaults.
 *
 * No DOM / no storage here — storage helpers live at the bottom and are the
 * only browser-aware part (guarded, SSR-safe).
 */

import { defaultPlan, type GoalRow, type PeriodRow, type PlanInput } from "./plan-service"

/** Wizard state per step — all optional; null/undefined = user skipped. */
export interface WizardAnswers {
	/** Income step: monthly take-home-ish gross salary, THB/month. */
	salaryMonthly: number | null
	/** Expenses step: monthly living expenses, THB/month. */
	livingMonthly: number | null
	/** Goals step: 0..3 simple goals captured as (label, amount today, target year). */
	goals: WizardGoalDraft[]
	/** Retirement wish: calendar year to retire (null = keep default). */
	retirementYear: number | null
	/** Retirement wish: desired spending in retirement, THB/month, today's money. */
	retirementMonthlyToday: number | null
}

export interface WizardGoalDraft {
	label: string
	amountToday: number
	targetYear: number
}

export function emptyWizardAnswers(): WizardAnswers {
	return {
		salaryMonthly: null,
		livingMonthly: null,
		goals: [],
		retirementYear: null,
		retirementMonthlyToday: null,
	}
}

/** The untouched baseline the dashboard seeds today — the skip-path source of truth. */
export function wizardBaselinePlan(): PlanInput {
	return defaultPlan()
}

const SALARY_LABEL = "Salary"
const LIVING_LABEL = "Living expenses"

/**
 * Apply wizard answers onto a baseline plan.
 *
 * Rules:
 * - Income/expenses: the baseline's default rows are matched by label and
 *   replaced in place (same id/typeId/growth semantics, only the amount is
 *   user-driven). If the baseline somehow lacks them, a row is added with
 *   engine-consistent defaults.
 * - Goals: replace the baseline's (empty) goals list wholesale.
 * - Retirement: only touched fields change.
 */
export function applyWizardAnswers(answers: WizardAnswers): PlanInput {
	const plan = wizardBaselinePlan()

	const incomes = plan.incomes.map((row) =>
		row.label === SALARY_LABEL && answers.salaryMonthly !== null
			? { ...row, amount: answers.salaryMonthly }
			: row,
	)
	if (answers.salaryMonthly !== null && !incomes.some((row) => row.label === SALARY_LABEL)) {
		incomes.push(salaryRow(plan.startYear, answers.salaryMonthly))
	}

	const expenses = plan.expenses.map((row) =>
		row.label === LIVING_LABEL && answers.livingMonthly !== null
			? { ...row, amount: answers.livingMonthly }
			: row,
	)
	if (answers.livingMonthly !== null && !expenses.some((row) => row.label === LIVING_LABEL)) {
		expenses.push(livingRow(plan.startYear, answers.livingMonthly))
	}

	const goals: GoalRow[] = answers.goals.map((goal, index) => ({
		id: `goal-wizard-${index + 1}`,
		label: goal.label,
		amountToday: goal.amountToday,
		targetYear: goal.targetYear,
		wallet: "goal",
	}))

	return {
		...plan,
		incomes,
		expenses,
		goals,
		retirementYear: answers.retirementYear ?? plan.retirementYear,
		retirementMonthlyToday:
			answers.retirementMonthlyToday ?? plan.retirementMonthlyToday,
	}
}

function salaryRow(startYear: number, amount: number): PeriodRow {
	return {
		id: "income-salary",
		typeId: "salary",
		frequency: "monthly",
		label: SALARY_LABEL,
		startYear,
		startMonth: 0,
		endYear: startYear + 29,
		endMonth: 11,
		amount,
		growthMode: "override",
		growthRate: 0.03,
	}
}

function livingRow(startYear: number, amount: number): PeriodRow {
	return {
		id: "expense-living",
		typeId: "livingExpenses",
		frequency: "monthly",
		label: LIVING_LABEL,
		startYear,
		startMonth: 0,
		endYear: null,
		endMonth: 11,
		amount,
		growthMode: "inflation",
		growthRate: 0,
	}
}

/** True when the plan is still the untouched engine default (nothing edited yet). */
export function isBaselinePlan(plan: PlanInput): boolean {
	const baseline = wizardBaselinePlan()
	return JSON.stringify(stripVolatile(plan)) === JSON.stringify(stripVolatile(baseline))
}

/** Stable serialization for first-run comparison (no ids that embed dates). */
function stripVolatile(plan: PlanInput): unknown {
	return JSON.stringify(plan, (key, value) =>
		key === "startYear" || key === "endYear" || key === "retirementYear" || key === "targetYear"
			? typeof value === "number"
				? "<year>"
				: value
			: value,
	)
}

const ONBOARDED_KEY = "excited_live_onboarded"

/** Has this browser finished the wizard before? (mock-mode first-run signal) */
export function hasCompletedWizard(): boolean {
	if (typeof window === "undefined") return true
	try {
		return window.localStorage.getItem(ONBOARDED_KEY) === "1"
	} catch {
		return true
	}
}

/** Persist the wizard-completed flag for this browser. Best-effort. */
export function markWizardCompleted(): void {
	if (typeof window === "undefined") return
	try {
		window.localStorage.setItem(ONBOARDED_KEY, "1")
	} catch {
		// Storage unavailable (private mode) — first-run simply re-shows.
	}
}

/** Test/preview helper: forget the flag so the wizard shows again. */
export function resetWizardCompleted(): void {
	if (typeof window === "undefined") return
	try {
		window.localStorage.removeItem(ONBOARDED_KEY)
	} catch {
		// Ignore.
	}
}
