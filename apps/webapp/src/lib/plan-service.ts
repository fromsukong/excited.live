/**
 * Plan service — the ONLY boundary between the dashboard UI and plan math.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ MOCK SERVICE LAYER — intentional MVP stub (2026-09-04)                   │
 * │                                                                          │
 * │ Today everything runs in the browser on top of the pure tax engine       │
 * │ (@excited-live/tax). When the real backend lands:                        │
 * │                                                                          │
 * │   1. Keep every exported type and function name in this file.            │
 * │   2. Replace ONLY the function bodies with fetch() calls, e.g.           │
 * │        const res = await fetch("/api/projection", {                      │
 * │          method: "POST",                                                 │
 * │          headers: { "content-type": "application/json" },                │
 * │          body: JSON.stringify(inputs),                                   │
 * │          signal,                                                         │
 * │        })                                                                │
 * │        if (!res.ok) throw new Error(`projection failed: ${res.status}`)  │
 * │        return (await res.json()) as ProjectionResult                     │
 * │   3. UI components must never import from @excited-live/tax directly —   │
 * │      they consume types + functions from this file only, so the swap     │
 * │      stays a one-file change and this comment is the only casualty.      │
 * │                                                                          │
 * │ Persistence is also mocked: there is no save/load yet. When auth + plan  │
 * │ storage exist, add `loadPlan()` / `savePlan()` here with the same rule.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import {
	getTaxSystem,
	type BracketBreakdown,
	type TaxResult,
} from "@excited-live/tax"

/** Tax system used by the mock backend. Swap with server-side config later. */
const TAX_COUNTRY = "TH" as const
const TAX_YEAR = 2026

export interface PlanAssumptions {
	/** Yearly investment return on the net-worth balance, 0..1 (e.g. 0.05). */
	annualReturnRate: number
	/** Yearly salary growth, 0..1 (e.g. 0.03). */
	salaryGrowthRate: number
	/** Yearly spending growth, 0..1 (e.g. 0.02). */
	spendingGrowthRate: number
}

/** Everything the projection needs. UI edits patches of this object. */
export interface PlanInputs {
	/** First projected calendar year (e.g. 2026). */
	startYear: number
	/** Gross employment income for the first year (THB / year). */
	annualIncome: number
	/** Total spending for the first year (THB / year). */
	annualSpending: number
	/** Net worth at the start of the projection (THB). */
	startingNetWorth: number

	/** Personal allowances claimed (normally 1). */
	personalAllowances: number
	spouseAllowances: number
	childrenAllowances: number

	/** Health/life insurance premiums (THB / year, engine caps apply). */
	insurance: number
	/**
	 * Long-term retirement savings — SSF / RMF / provident (THB / year).
	 * MOCK simplification: mapped to the RMF deduction line (cap 30% of
	 * assessable income). Per-fund inputs are a post-MVP refinement.
	 */
	retirementSavings: number
	/** Share of gross income already withheld by the employer, 0..1. */
	withholdingRate: number

	/** Projection length in years (1..50). */
	horizonYears: number
	/** Optional net-worth target (THB); 0 = no target. */
	targetNetWorth: number

	assumptions: PlanAssumptions
}

/** One projected year. All money values are THB. */
export interface ProjectionYear {
	/** Calendar year. */
	year: number
	grossIncome: number
	taxableIncome: number
	/** Total tax liability for the year (before withholding). */
	tax: number
	/** Tax still owed (positive) or refund (negative) after withholding. */
	taxBalance: number
	effectiveTaxRate: number
	marginalTaxRate: number
	spending: number
	/** grossIncome − tax − spending. */
	savings: number
	/** End-of-year net worth: previous balance grown at the return rate + savings. */
	netWorth: number
	brackets: BracketBreakdown[]
}

export interface ProjectionResult {
	currency: "THB"
	taxSystem: { country: typeof TAX_COUNTRY; taxYear: typeof TAX_YEAR }
	startNetWorth: number
	endNetWorth: number
	years: ProjectionYear[]
	/** First projected year, or null when the horizon is empty. */
	currentYear: ProjectionYear | null
	/** First year netWorth >= target, or null when no target / not reached. */
	yearGoalReached: number | null
	warnings: string[]
}

const clampNonNegative = (value: number): number =>
	Number.isFinite(value) && value > 0 ? value : 0

const clampRate = (value: number): number =>
	Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0

/** Sensible starting plan used on first load. MOCK defaults — no persistence yet. */
export function defaultPlanInputs(now: Date = new Date()): PlanInputs {
	return {
		startYear: now.getFullYear(),
		annualIncome: 1_200_000,
		annualSpending: 480_000,
		startingNetWorth: 300_000,
		personalAllowances: 1,
		spouseAllowances: 0,
		childrenAllowances: 0,
		insurance: 25_000,
		retirementSavings: 60_000,
		withholdingRate: 0.1,
		horizonYears: 30,
		targetNetWorth: 20_000_000,
		assumptions: {
			annualReturnRate: 0.05,
			salaryGrowthRate: 0.03,
			spendingGrowthRate: 0.02,
		},
	}
}

/**
 * MOCK compute — replace the body with one fetch() when the backend exists
 * (see the swap contract at the top of this file).
 */
export async function computeProjection(
	inputs: PlanInputs,
	/** Honoured by the real backend for cancellation; unused in the mock. */
	_signal?: AbortSignal,
): Promise<ProjectionResult> {
	// Keep the cancellation contract real even in the mock.
	if (_signal?.aborted) {
		throw new DOMException("The operation was aborted.", "AbortError")
	}
	return computeProjectionSync(inputs)
}

/**
 * Synchronous local computation — SSR-first initial render uses this so the
 * server ships real numbers. When the backend arrives, this dies and the
 * initial projection comes from a route loader fetch instead.
 */
export function computeProjectionSync(inputs: PlanInputs): ProjectionResult {
	const system = getTaxSystem(TAX_COUNTRY, TAX_YEAR)
	const warnings: string[] = []

	const years: ProjectionYear[] = []
	let income = clampNonNegative(inputs.annualIncome)
	let spending = clampNonNegative(inputs.annualSpending)
	let netWorth = clampNonNegative(inputs.startingNetWorth)
	const { annualReturnRate, salaryGrowthRate, spendingGrowthRate } =
		inputs.assumptions

	for (let index = 0; index < inputs.horizonYears; index += 1) {
		const year = inputs.startYear + index
		const taxResult: TaxResult = system.compute({
			incomes: [{ categoryCode: "employment", amount: income }],
			allowances: {
				personal: Math.max(1, Math.round(inputs.personalAllowances)),
				spouse: Math.max(0, Math.round(inputs.spouseAllowances)),
				children: Math.max(0, Math.round(inputs.childrenAllowances)),
				disabled: 0,
			},
			deductions: {
				insurance: clampNonNegative(inputs.insurance),
				mortgageInterest: 0,
				donations: 0,
				retirementSavings: {
					ssf: 0,
					rmf: clampNonNegative(inputs.retirementSavings),
					provident: 0,
				},
			},
			withheld: Math.round(income * clampRate(inputs.withholdingRate)),
			estimatedPaid: 0,
		})
		warnings.push(...taxResult.warnings)

		const tax = taxResult.netTax
		const savings = income - tax - spending
		netWorth = netWorth * (1 + annualReturnRate) + savings

		years.push({
			year,
			grossIncome: income,
			taxableIncome: taxResult.taxableIncome,
			tax,
			taxBalance: taxResult.balance,
			effectiveTaxRate: taxResult.effectiveRate,
			marginalTaxRate: taxResult.marginalRate,
			spending,
			savings,
			netWorth,
			brackets: taxResult.brackets,
		})

		income = income * (1 + salaryGrowthRate)
		spending = spending * (1 + spendingGrowthRate)
	}

	const target = clampNonNegative(inputs.targetNetWorth)
	const reached =
		target > 0 ? (years.find((y) => y.netWorth >= target)?.year ?? null) : null

	const first = years[0]
	return {
		currency: "THB",
		taxSystem: { country: TAX_COUNTRY, taxYear: TAX_YEAR },
		startNetWorth: clampNonNegative(inputs.startingNetWorth),
		endNetWorth: years[years.length - 1]?.netWorth ?? 0,
		years,
		currentYear: first ?? years[0] ?? null,
		yearGoalReached: reached,
		warnings: [...new Set(warnings)],
	}
}
