/**
 * Retirement-contribution optimizer (sheet "Optimizer" tab, webapp port).
 *
 * Answers the sheet's 3rd question: "how much should I put into RMF/ThaiESG
 * before the December cutoff to save the most tax?"
 *
 * Model (v1, matches the sheet):
 * - Contributions go to RMF-shaped deduction (cap 30% of assessable income,
 *   combined SSF+RMF+provident cap 500,000 THB — the binding cap for most).
 * - Only recommend when it actually reduces tax at the margin: if taxable
 *   income is already below the deduction threshold, the recommendation is 0.
 *
 * PURE: no network, no DOM, no framework.
 */

import { getTaxSystem } from "@excited-live/tax"

export interface OptimizerInput {
	/** Gross employment income for the year, THB. */
	income: number
	/** Household allowances already claimed (personal is always ≥ 1). */
	personalAllowances: number
	spouseAllowances: number
	childrenAllowances: number
	parentsAllowances: number
	/** Other itemized deductions already used, THB (engine caps apply). */
	insurance: number
	mortgageInterest: number
	donations: number
}

export interface OptimizerResult {
	/** Recommended RMF/ThaiESG contribution for THIS year, THB (rounded to baht). */
	recommended: number
	/** Which cap bound the recommendation: "combined" (500k) or "rate" (30%). */
	boundBy: "combined" | "rate" | "no-benefit"
	/** Tax saved this year if the recommendation is applied, THB. */
	taxSaved: number
	/** Assessable income the 30% cap is computed from, THB. */
	assessableIncome: number
}

const TAX_COUNTRY = "TH" as const
const TAX_YEAR = 2026
/** Combined SSF+RMF+provident cap (THB) — the engine enforces the same number. */
const CAP_COMBINED = 500_000
/** RMF cap as a share of assessable income. */
const CAP_RATE = 0.3

const clampNonNegative = (value: number): number =>
	Number.isFinite(value) && value > 0 ? value : 0

/**
 * Compute the tax for a given RMF contribution (probe call into the engine).
 */
function taxWithRmf(rmf: number, input: OptimizerInput): number {
	const system = getTaxSystem(TAX_COUNTRY, TAX_YEAR)
	return system.compute({
		incomes: [{ categoryCode: "employment", amount: clampNonNegative(input.income) }],
		allowances: {
			personal: Math.max(1, Math.round(input.personalAllowances)),
			spouse: Math.max(0, Math.round(input.spouseAllowances)),
			children: Math.max(0, Math.round(input.childrenAllowances)),
			parents: Math.max(0, Math.round(input.parentsAllowances)),
			disabled: 0,
		},
		deductions: {
			insurance: clampNonNegative(input.insurance),
			mortgageInterest: clampNonNegative(input.mortgageInterest),
			donations: clampNonNegative(input.donations),
			retirementSavings: { ssf: 0, rmf, provident: 0 },
		},
		withheld: 0,
		estimatedPaid: 0,
	}).netTax
}

/**
 * Recommend the RMF/ThaiESG contribution that minimises this year's tax.
 * Deterministic: starts from the cap, walks down in 1,000 THB steps while a
 * larger contribution would not reduce tax (deduction exceeding taxable
 * income), i.e. only recommends amounts that actually save tax.
 */
export function optimizeRetirementContribution(input: OptimizerInput): OptimizerResult {
	const system = getTaxSystem(TAX_COUNTRY, TAX_YEAR)
	const baseline = system.compute({
		incomes: [{ categoryCode: "employment", amount: clampNonNegative(input.income) }],
		allowances: {
			personal: Math.max(1, Math.round(input.personalAllowances)),
			spouse: Math.max(0, Math.round(input.spouseAllowances)),
			children: Math.max(0, Math.round(input.childrenAllowances)),
			parents: Math.max(0, Math.round(input.parentsAllowances)),
			disabled: 0,
		},
		deductions: {
			insurance: clampNonNegative(input.insurance),
			mortgageInterest: clampNonNegative(input.mortgageInterest),
			donations: clampNonNegative(input.donations),
			retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
		},
		withheld: 0,
		estimatedPaid: 0,
	})

	const capFromRate = Math.floor(CAP_RATE * baseline.assessableIncome)
	const upperBound = Math.min(CAP_COMBINED, capFromRate)
	const taxAtUpper = taxWithRmf(upperBound, input)

	// No benefit: taxable income already at/below zero without retirement money.
	if (taxAtUpper >= baseline.netTax) {
		return {
			recommended: 0,
			boundBy: "no-benefit",
			taxSaved: 0,
			assessableIncome: baseline.assessableIncome,
		}
	}

	// Walk down from the cap in 1,000 THB steps while tax stays equal:
	// over-donating past taxable income wastes money, so prefer the smallest
	// commitment with the same tax. Monotone TH brackets mean tax rises as
	// the contribution shrinks; the first increase marks the optimum.
	let best = upperBound
	while (best >= 1_000) {
		const step = best - 1_000
		if (taxWithRmf(step, input) > taxWithRmf(best, input)) break
		best = step
	}

	return {
		recommended: best,
		boundBy: CAP_COMBINED <= capFromRate ? "combined" : "rate",
		taxSaved: Math.round(baseline.netTax - taxWithRmf(best, input)),
		assessableIncome: baseline.assessableIncome,
	}
}
