/**
 * Plan service — the ONLY boundary between the dashboard UI and plan math.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ SERVICE LAYER — Mock vs Live Dispatching (2026-10-04)                    │
 * │                                                                          │
 * │ In "mock" mode (VITE_API_MODE=mock, pnpm dev):                           │
 * │   Everything runs in the browser on top of the pure engines              │
 * │   (@excited-live/sim, which wraps @excited-live/tax).                    │
 * │                                                                          │
 * │ In "live" mode (VITE_API_MODE=live, pnpm dev:api / production):          │
 * │   Calls the backend endpoints (/api/v1/plan, /api/v1/sim/*) with         │
 * │   graceful fallback to pure engines.                                     │
 * │                                                                          │
 * │ UI components must never import from @excited-live/sim directly —        │
 * │ they consume types + functions from this file only.                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import {
	DEFAULT_WALLETS,
	defaultMonteCarloConfig,
	type GoalCheck,
	type PlanInput,
	type SimulationResult,
	compareFundPaths,
	defaultPlanInput,
	goalChecks,
	maxForeverMonthlySpend,
	optimizeRetirementContribution,
	retirementVerdict,
	runMonteCarlo,
	runSimulation,
	type RetirementVerdict,
	type PathCompare,
	type OptimizerResult,
	type MonteCarloResult,
	yearlyAmount,
} from "@excited-live/sim"
import { apiFetch, isLiveApi } from "./api-client"

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
						? sum + yearlyAmount(row)
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

const MOCK_PLAN_KEY = "excited_live_plan_input"

function getMockPlan(): PlanInput {
	if (typeof window === "undefined") return defaultPlan()
	try {
		const raw = localStorage.getItem(MOCK_PLAN_KEY)
		if (!raw) return defaultPlan()
		return JSON.parse(raw) as PlanInput
	} catch {
		return defaultPlan()
	}
}

function saveMockPlan(plan: PlanInput): void {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(MOCK_PLAN_KEY, JSON.stringify(plan))
	} catch {
		// Ignore storage quota errors in mock mode
	}
}

/**
 * Root page endpoint for Home: loads the active user plan.
 */
export async function fetchPlanData(): Promise<PlanInput> {
	if (!isLiveApi()) {
		return getMockPlan()
	}

	return await apiFetch<PlanInput>("/plan")
}

/**
 * Persists the active user plan.
 */
export async function savePlanData(plan: PlanInput): Promise<void> {
	if (!isLiveApi()) {
		saveMockPlan(plan)
		return
	}

	await apiFetch<void>("/plan", {
		method: "PUT",
		body: JSON.stringify(plan),
	})
}

/** Wallet metadata for rendering (labels stay in the engine, bilingual). */
export const walletDefs = DEFAULT_WALLETS

/**
 * US-110 — Monte Carlo market bands for the chart overlay.
 */
export function computeMonteCarloBands(plan: PlanInput): MonteCarloResult {
	// Seeded config — same plan ⇒ same bands (SSR/client + reload match).
	// The engine treats an omitted seed as "random run" by design.
	return runMonteCarlo(plan, defaultMonteCarloConfig)
}

/**
 * Component endpoint for Monte Carlo market bands.
 * Can be fetched asynchronously for the chart overlay.
 */
export async function fetchMonteCarloBandsData(plan: PlanInput): Promise<MonteCarloResult> {
	if (!isLiveApi()) {
		return computeMonteCarloBands(plan)
	}

	try {
		return await apiFetch<MonteCarloResult>("/sim/monte-carlo", {
			method: "POST",
			// API contract: { plan, config? } — sending a bare plan 500s server-side.
			body: JSON.stringify({ plan, config: defaultMonteCarloConfig }),
		})
	} catch {
		// Fallback to local engine if backend endpoint is unavailable
		return computeMonteCarloBands(plan)
	}
}

/** Re-exports for UI typing — the UI never imports @excited-live/sim itself. */
export type { PlanInput, PeriodRow, WalletId, GoalRow, SimulationYear } from "@excited-live/sim"
export type { MonteCarloResult, MonteCarloYear, MonteCarloBand } from "@excited-live/sim"
export { realReturn, WALLET_IDS } from "@excited-live/sim"
export {
	INCOME_TYPE_IDS,
	EXPENSE_TYPE_IDS,
	ASSET_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	INCOME_TYPE_DEFAULT_FREQUENCY,
	EXPENSE_TYPE_DEFAULT_FREQUENCY,
	rowLifetimeTotal,
	yearlyAmount,
} from "@excited-live/sim"
export type {
	MilestoneRow,
	AssetRow,
	LiabilityRow,
	IncomeTypeId,
	ExpenseTypeId,
	AssetTypeId,
	LiabilityTypeId,
	AmountFrequency,
} from "@excited-live/sim"
