/**
 * Plan service — the ONLY boundary between the dashboard UI and plan math.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ MOCK SERVICE LAYER — intentional MVP stub (2026-09-06)                   │
 * │                                                                          │
 * │ Everything runs in the browser on top of the pure engines                │
 * │ (@excited-live/sim, which wraps @excited-live/tax). When the real        │
 * │ backend + persistence land (MLP, US-100):                                │
 * │                                                                          │
 * │   1. Keep every exported type and function name in this file.            │
 * │   2. Replace ONLY the function bodies (fetch → /api/plan endpoints).     │
 * │   3. UI components must never import from @excited-live/sim directly —   │
 * │      they consume types + functions from this file only, so the swap     │
 * │      stays a one-file change.                                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import {
	DEFAULT_WALLETS,
	type GoalCheck,
	type PlanInput,
	type SimulationResult,
	compareFundPaths,
	defaultPlanInput,
	goalChecks,
	maxForeverMonthlySpend,
	optimizeRetirementContribution,
	retirementVerdict,
	runSimulation,
	type RetirementVerdict,
	type PathCompare,
	type OptimizerResult,
} from "@excited-live/sim"

/** Everything the UI needs, computed in one pass from the plan. */
export interface PlanSummary {
	result: SimulationResult
	/** Long-term section (US-009 section 1). */
	runsOutYear: number | null
	retirement: RetirementVerdict
	maxForeverMonthly: number
	goals: GoalCheck[]
	/** This-year section (US-009 section 2). */
	optimizer: OptimizerResult
	/** ThaiESG/RMF vs taxable S&P compare (FR-6). */
	pathCompare: PathCompare
}

export function computePlanSummary(plan: PlanInput): PlanSummary {
	const result = runSimulation(plan)
	const first = result.years[0]
	const mortgageInterest = first
		? plan.expenses.reduce(
				(sum, row) =>
					row.deductible === "mortgageInterest" && first.year >= row.startYear
						? sum + row.amount
						: sum,
				0,
			)
		: 0
	const optimizer = optimizeRetirementContribution({
		income: first?.income ?? 0,
		personalAllowances: plan.personalAllowances,
		spouseAllowances: plan.spouseAllowances,
		childrenAllowances: plan.childrenAllowances,
		parentsAllowances: plan.parentsAllowances,
		insurance: plan.insurance,
		mortgageInterest,
		donations: 0,
	})
	return {
		result,
		runsOutYear: result.unmetYear,
		retirement: retirementVerdict(plan, result),
		maxForeverMonthly: maxForeverMonthlySpend(plan),
		goals: goalChecks(plan, result),
		optimizer,
		pathCompare: compareFundPaths(plan, result, optimizer.recommended, 0.005),
	}
}

/** Sensible starting plan used on first load. MOCK defaults — no persistence. */
export function defaultPlan(): PlanInput {
	return defaultPlanInput()
}

/** Wallet metadata for rendering (labels stay in the engine, bilingual). */
export const walletDefs = DEFAULT_WALLETS

/** Re-exports for UI typing — the UI never imports @excited-live/sim itself. */
export type { PlanInput, PeriodRow, WalletId, GoalRow, SimulationYear } from "@excited-live/sim"
export { realReturn, WALLET_IDS } from "@excited-live/sim"
