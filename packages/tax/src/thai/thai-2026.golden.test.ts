/**
 * TH 2026 — golden, boundary and invariant tests.
 *
 * Expected values are NOT derived from the engine under test. They were
 * computed by an independent Python recompute script (`.verify/verify_th_golden.py`,
 * untracked) whose spec constants were HAND-TRANSCRIBED from published Thai
 * Revenue Code rules (progressive table 0-35%, expense deductions per income
 * category, allowance amounts, itemized caps, working credit phase-out).
 *
 * Golden scenarios are realistic personas; boundary scenarios hit every cap
 * and bracket edge at exactly ±1 baht. Invariant checks re-derive identities
 * from the result object itself (cannot be gamed by shared test constants).
 *
 * NOTE (v1 simplifications, by design — see thai-2026.ts `assumptions`):
 * golden scenarios deliberately exclude interest 20k exemption, dividend tax
 * credit and s.40(4) exemptions, so results intentionally differ from RD
 * Smart Tax for income mixes containing interest/dividend (scenario E).
 *
 * These tests caught a real engine bug pre-merge (2026-08-31): the employment
 * expense cap (100,000 THB) was applied per income LINE instead of per
 * taxpayer, over-deducting for multiple employment lines. The
 * `multiline_employment` tests are the regression guard for the fix.
 */
import { describe, it, expect } from "vitest"
import type { TaxInput } from "../types"
import { thai2026System } from "./thai-2026"

function input(overrides: Partial<TaxInput> = {}): TaxInput {
	const base: TaxInput = {
		incomes: [],
		allowances: { personal: 1, spouse: 0, children: 0, parents: 0, disabled: 0 },
		deductions: {
			insurance: 0,
			mortgageInterest: 0,
			donations: 0,
			retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
		},
		withheld: 0,
		estimatedPaid: 0,
	}
	return { ...base, ...overrides }
}

const employment = (amount: number) => ({ categoryCode: "employment", amount })
const noDeductions = {
	insurance: 0,
	mortgageInterest: 0,
	donations: 0,
	retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
}

// ---------------------------------------------------------------------------
// Golden scenarios — realistic personas, values from independent recompute
// ---------------------------------------------------------------------------

describe("thai2026System golden scenarios (independent recompute)", () => {
	it("A: salaried 360,000, withheld 12,000 → net 2,500, refund 9,500", () => {
		// expense: 50% of 360k = 180k → capped at 100k → assessable 260k
		// taxable: 260k − 60k personal allowance = 200k
		// liability: 150k@0% + 50k@5% = 2,500 (gross > 300k → no credit)
		const result = thai2026System.compute(
			input({ incomes: [employment(360_000)], withheld: 12_000 }),
		)
		expect(result.grossIncome).toBe(360_000)
		expect(result.expenseDeductions).toBe(100_000)
		expect(result.assessableIncome).toBe(260_000)
		expect(result.taxableIncome).toBe(200_000)
		expect(result.taxLiability).toBe(2_500)
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(2_500)
		expect(result.marginalRate).toBe(0.05)
		expect(result.effectiveRate).toBeCloseTo(0.009615384615384616, 12)
		expect(result.balance).toBe(-9_500)
		expect(result.warnings).toEqual([])
	})

	it("B: freelancer 600,000, spouse+child, insurance+donations+RMF → net 0", () => {
		// expense: 30% of 600k = 180k → assessable 420k
		// itemized: insurance 25k + donations 20k (≤ 42k cap) + RMF min(100k, 126k) = 145k
		// allowances: 60k + 60k + 30k = 150k → taxable 420k − 145k − 150k = 125k
		// liability: 125k@0% = 0 (no employment income → no working credit)
		const result = thai2026System.compute(
			input({
				incomes: [{ categoryCode: "freelance", amount: 600_000 }],
				allowances: { personal: 1, spouse: 1, children: 1, parents: 0, disabled: 0 },
				deductions: { insurance: 25_000, mortgageInterest: 0, donations: 20_000, retirementSavings: { ssf: 0, rmf: 100_000, provident: 0 } },
			}),
		)
		expect(result.assessableIncome).toBe(420_000)
		expect(result.itemizedDeductions).toBe(145_000)
		expect(result.allowancesTotal).toBe(150_000)
		expect(result.taxableIncome).toBe(125_000)
		expect(result.netTax).toBe(0)
		expect(result.effectiveRate).toBe(0)
		expect(result.balance).toBe(0)
		expect(result.warnings).toEqual([])
	})

	it("C: landlord 480,000 + employment 240,000, mortgage 90,000 → net 10,100", () => {
		// expense: rental 30%·480k = 144k + employment min(50%·240k, 100k cap) = 100k
		// assessable: 720k − 244k = 476k → itemized: mortgage min(90k, 100k) = 90k
		// taxable: 476k − 90k − 60k = 326k
		// liability: 150k@0% + 150k@5% (7,500) + 26k@10% (2,600) = 10,100
		// credit: employment 240k → 15,000 − 0.5·(240,000−150,000) < 0 → floored to 0
		const result = thai2026System.compute(
			input({
				incomes: [{ categoryCode: "rental", amount: 480_000 }, employment(240_000)],
				deductions: { insurance: 0, mortgageInterest: 90_000, donations: 0, retirementSavings: { ssf: 0, rmf: 0, provident: 0 } },
			}),
		)
		expect(result.assessableIncome).toBe(476_000)
		expect(result.itemizedDeductions).toBe(90_000)
		expect(result.taxableIncome).toBe(326_000)
		expect(result.taxLiability).toBe(10_100)
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(10_100)
		expect(result.marginalRate).toBe(0.1)
		expect(result.effectiveRate).toBeCloseTo(0.021218487394957984, 12)
		expect(result.balance).toBe(10_100)
	})

	it("D: executive 2,000,000, spouse, insurance + SSF + provident → net 180,000", () => {
		// expense: min(50%·2M, 100k cap) = 100k → assessable 1,900k
		// itemized: insurance 100k (at cap) + retirement (SSF 180k + provident min(240k, 15%·2M=300k) = 420k, under 500k combined cap) = 520k
		// (the 500k combined cap applies to retirement savings only, not to all itemized deductions)
		// allowances: 60k + 60k = 120k → taxable 1,900k − 520k − 120k = 1,260k
		// liability: 150@0 + 150@5 (7,500) + 200@10 (20,000) + 250@15 (37,500) + 250@20 (50,000) + 260@25 (65,000) = 180,000
		const result = thai2026System.compute(
			input({
				incomes: [employment(2_000_000)],
				allowances: { personal: 1, spouse: 1, children: 0, parents: 0, disabled: 0 },
				deductions: { insurance: 100_000, mortgageInterest: 0, donations: 0, retirementSavings: { ssf: 180_000, rmf: 0, provident: 240_000 } },
			}),
		)
		expect(result.assessableIncome).toBe(1_900_000)
		expect(result.itemizedDeductions).toBe(520_000)
		expect(result.taxableIncome).toBe(1_260_000)
		expect(result.taxLiability).toBe(180_000)
		expect(result.netTax).toBe(180_000)
		expect(result.marginalRate).toBe(0.25)
		expect(result.effectiveRate).toBeCloseTo(0.09473684210526316, 12)
		expect(result.warnings).toEqual([])
	})

	it("E: employment 420,000 + interest 15,000 + dividend 8,000, withheld 25,000 → refund 18,350", () => {
		// expense: min(210k, 100k cap) = 100k; interest/dividend no expense deduction
		// assessable: 443k − 100k = 343k → taxable 283k
		// liability: 150k@0 + 133k@5% = 6,650
		// employment 420k > 300k → no credit
		// balance: 6,650 − 25,000 = −18,350 (refund)
		const result = thai2026System.compute(
			input({
				incomes: [employment(420_000), { categoryCode: "interest", amount: 15_000 }, { categoryCode: "dividend", amount: 8_000 }],
				withheld: 25_000,
			}),
		)
		expect(result.grossIncome).toBe(443_000)
		expect(result.assessableIncome).toBe(343_000)
		expect(result.taxableIncome).toBe(283_000)
		expect(result.taxLiability).toBe(6_650)
		expect(result.netTax).toBe(6_650)
		expect(result.balance).toBe(-18_350)
		expect(result.warnings.some((w) => w.includes("Interest 20,000 exemption and dividend tax credit not modeled"))).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// Cap boundaries — exact cap applies, cap+1 is clamped
// ---------------------------------------------------------------------------

describe("thai2026System cap boundaries (independent recompute)", () => {
	it("insurance exactly 100,000 applies in full", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, insurance: 100_000 } }),
		)
		expect(result.itemizedDeductions).toBe(100_000)
		expect(result.taxableIncome).toBe(740_000)
		expect(result.taxLiability).toBe(63_500)
		expect(result.warnings).toEqual([])
	})

	it("insurance 100,001 clamps to 100,000 with same result", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, insurance: 100_001 } }),
		)
		expect(result.itemizedDeductions).toBe(100_000)
		expect(result.taxableIncome).toBe(740_000)
		expect(result.taxLiability).toBe(63_500)
	})

	it("mortgage interest exactly 100,000 applies in full", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, mortgageInterest: 100_000 } }),
		)
		expect(result.itemizedDeductions).toBe(100_000)
		expect(result.taxableIncome).toBe(740_000)
		expect(result.taxLiability).toBe(63_500)
		expect(result.warnings).toEqual([])
	})

	it("mortgage interest 250,000 clamps to 100,000", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, mortgageInterest: 250_000 } }),
		)
		expect(result.itemizedDeductions).toBe(100_000)
		expect(result.taxableIncome).toBe(740_000)
		expect(result.taxLiability).toBe(63_500)
	})

	it("donations exactly at 10% of assessable apply in full, no warning", () => {
		// assessable 900k → cap 90k; input exactly 90k
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, donations: 90_000 } }),
		)
		expect(result.itemizedDeductions).toBe(90_000)
		expect(result.taxableIncome).toBe(750_000)
		expect(result.taxLiability).toBe(65_000)
		expect(result.warnings).toEqual([])
	})

	it("donations 90,001 clamps to 90,000 with warning", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(1_000_000)], deductions: { ...noDeductions, donations: 90_001 } }),
		)
		expect(result.itemizedDeductions).toBe(90_000)
		expect(result.taxableIncome).toBe(750_000)
		expect(result.taxLiability).toBe(65_000)
		expect(result.warnings.some((w) => w.includes("Donations capped at"))).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// Working credit phase-out endpoints
// ---------------------------------------------------------------------------

describe("thai2026System working credit endpoints (independent recompute)", () => {
	// All scenarios: employment line + `other` 500,000 so liability is always > 0
	// and the applied credit equals the raw credit.

	it("employment exactly 150,000 → full 15,000 credit, net 0", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(150_000), { categoryCode: "other", amount: 500_000 }] }),
		)
		// credit = 15,000; liability = 365k taxable → 150@0 + 150@5 + 65@10 = 14,000
		expect(result.credits).toBe(14_000)
		expect(result.netTax).toBe(0)
	})

	it("employment 170,000 → credit 5,000 (phase-out midpoint)", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(170_000), { categoryCode: "other", amount: 500_000 }] }),
		)
		// credit = 15,000 − 0.5·(170,000−150,000) = 5,000
		expect(result.credits).toBe(5_000)
		expect(result.netTax).toBe(10_000)
	})

	it("employment 180,000 → credit 0 (phase-out floor reached)", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(180_000), { categoryCode: "other", amount: 500_000 }] }),
		)
		// credit = 15,000 − 0.5·30,000 = 0
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(15_500)
	})

	it("employment exactly 300,000 → credit 0", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(300_000), { categoryCode: "other", amount: 500_000 }] }),
		)
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(26_500)
	})
})

// ---------------------------------------------------------------------------
// Bracket boundaries
// ---------------------------------------------------------------------------

describe("thai2026System bracket boundaries (independent recompute)", () => {
	it("taxable exactly 300,000 → liability 7,500, marginal 5%", () => {
		// employment 460k → expense cap 100k → assessable 360k − 60k = 300k
		const result = thai2026System.compute(input({ incomes: [employment(460_000)] }))
		expect(result.taxableIncome).toBe(300_000)
		expect(result.taxLiability).toBe(7_500)
		expect(result.marginalRate).toBe(0.05)
	})

	it("taxable 300,002 → the extra 2 baht land in the 10% bracket", () => {
		const result = thai2026System.compute(input({ incomes: [employment(460_002)] }))
		expect(result.taxableIncome).toBe(300_002)
		expect(result.taxLiability).toBe(7_500.2)
		expect(result.marginalRate).toBe(0.1)
	})
})

// ---------------------------------------------------------------------------
// Allowances & structural edges
// ---------------------------------------------------------------------------

describe("thai2026System allowances and structural edges (independent recompute)", () => {
	it("allowances exactly equal assessable income → taxable 0, net 0", () => {
		// employment 280k → expense min(50%·280k=140k, 100k cap) = 100k
		// assessable 180k; allowances 60+60+30+30 = 180k → taxable 0
		const result = thai2026System.compute(
			input({ incomes: [employment(280_000)], allowances: { personal: 1, spouse: 1, children: 2, parents: 0, disabled: 0 } }),
		)
		expect(result.assessableIncome).toBe(180_000)
		expect(result.allowancesTotal).toBe(180_000)
		expect(result.taxableIncome).toBe(0)
		expect(result.netTax).toBe(0)
	})

	it("two employment lines: expense cap applies ONCE per taxpayer (aggregate, not per line)", () => {
		// Regression: pre-fix, each 300k line got its own min(150k, 100k) → 200k total.
		// Spec: the 100k employment expense cap is per taxpayer → 100k total.
		// assessable: 600k − 100k = 500k → taxable 500k − 60k = 440k
		// liability: 150@0 + 150@5 (7,500) + 140@10 (14,000) = 21,500
		const result = thai2026System.compute(
			input({ incomes: [employment(300_000), employment(300_000)] }),
		)
		expect(result.expenseDeductions).toBe(100_000)
		expect(result.assessableIncome).toBe(500_000)
		expect(result.taxableIncome).toBe(440_000)
		expect(result.taxLiability).toBe(21_500)
	})

	it("two employment lines + provident: cap uses combined employment gross", () => {
		// 300k + 300k → provident cap = 15% of 600k = 90k → min(100k, 90k) = 90k
		// assessable 500k → taxable 500k − 90k − 60k = 350k
		// liability: 150@0 + 150@5 (7,500) + 50@10 (5,000) = 12,500
		const result = thai2026System.compute(
			input({
				incomes: [employment(300_000), employment(300_000)],
				deductions: { insurance: 0, mortgageInterest: 0, donations: 0, retirementSavings: { ssf: 0, rmf: 0, provident: 100_000 } },
			}),
		)
		expect(result.itemizedDeductions).toBe(90_000)
		expect(result.taxableIncome).toBe(350_000)
		expect(result.taxLiability).toBe(12_500)
	})

	it("freelance amounts round to 2 decimals (77,777.77 → assessable 54,444.44)", () => {
		const result = thai2026System.compute(
			input({ incomes: [{ categoryCode: "freelance", amount: 77_777.77 }] }),
		)
		expect(result.expenseDeductions).toBe(23_333.33)
		expect(result.assessableIncome).toBe(54_444.44)
		expect(result.taxableIncome).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// Invariants — re-derived from the result object, not from test constants
// ---------------------------------------------------------------------------

describe("thai2026System invariants", () => {
	const probe = (gross: number, deductions: Partial<TaxInput["deductions"]> = {}) =>
		thai2026System.compute(
			input({
				incomes: [employment(gross)],
				deductions: { ...noDeductions, ...deductions },
				withheld: 1_000,
				estimatedPaid: 500,
			}),
		)

	it("liability equals the sum of per-bracket taxes across a 146-point sweep", () => {
		const points = [
			...Array.from({ length: 100 }, (_, i) => Math.round(i * 100_000)),
			149_999, 150_000, 150_001, 299_999, 300_000, 300_001,
			499_999, 500_000, 500_001, 749_999, 750_000, 750_001,
			999_999, 1_000_000, 1_000_001, 1_999_999, 2_000_000, 2_000_001,
			4_999_999, 5_000_000, 5_000_001, 10_000_000,
		]
		for (const gross of points) {
			const result = probe(gross, { insurance: 5_000, mortgageInterest: 10_000, donations: 3_000, retirementSavings: { ssf: 7_000, rmf: 11_000, provident: 2_000 } })
			const bracketSum = result.brackets.reduce((acc, b) => acc + b.tax, 0)
			expect(result.taxLiability).toBeCloseTo(bracketSum, 2)
			expect(result.taxableIncome).toBeGreaterThanOrEqual(0)
			expect(result.credits).toBeLessThanOrEqual(result.taxLiability)
			expect(result.netTax).toBeGreaterThanOrEqual(0)
			expect(result.balance).toBeCloseTo(result.netTax - 1_500, 2)
		}
	})

	it("net tax is monotonically non-decreasing in gross income", () => {
		let previous = -1
		for (let gross = 0; gross <= 5_000_000; gross += 25_000) {
			const result = probe(gross)
			expect(result.netTax).toBeGreaterThanOrEqual(previous)
			previous = result.netTax
		}
	})

	it("effective rate never exceeds marginal rate", () => {
		for (const gross of [200_000, 500_000, 800_000, 1_500_000, 3_000_000, 8_000_000]) {
			const result = probe(gross)
			if (result.assessableIncome > 0) {
				expect(result.effectiveRate).toBeLessThanOrEqual(result.marginalRate)
			}
		}
	})
})

// ---------------------------------------------------------------------------
// validate() hardening
// ---------------------------------------------------------------------------

describe("thai2026System validate hardening", () => {
	it("rejects NaN income amounts", () => {
		const problems = thai2026System.validate(
			input({ incomes: [{ categoryCode: "employment", amount: Number.NaN }] }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects NaN in deduction fields", () => {
		const problems = thai2026System.validate(
			input({ deductions: { ...noDeductions, insurance: Number.NaN } }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects negative retirement savings", () => {
		const problems = thai2026System.validate(
			input({ deductions: { ...noDeductions, retirementSavings: { ssf: -1, rmf: 0, provident: 0 } } }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects negative allowance counts", () => {
		const problems = thai2026System.validate(
			input({ allowances: { personal: 1, spouse: -1, children: 0, parents: 0, disabled: 0 } }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects non-integer allowance counts", () => {
		const problems = thai2026System.validate(
			input({ allowances: { personal: 1, spouse: 0, children: 1.5, parents: 0, disabled: 0 } }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects empty income category code", () => {
		const problems = thai2026System.validate(
			input({ incomes: [{ categoryCode: "", amount: 1_000 }] }),
		)
		expect(problems.length).toBeGreaterThan(0)
	})

	it("accepts zero amounts everywhere (valid, nothing to tax)", () => {
		const problems = thai2026System.validate(input())
		expect(problems).toEqual([])
	})
})
