import { describe, it, expect } from "vitest"
import type { TaxInput } from "../types"
import { us2026System } from "./us-2026"

const { compute, validate } = us2026System

const DEFAULT_ALLOWANCES: TaxInput["allowances"] = {
	personal: 0,
	spouse: 0,
	children: 0,
	disabled: 0,
}

const DEFAULT_DEDUCTIONS: TaxInput["deductions"] = {
	insurance: 0,
	mortgageInterest: 0,
	donations: 0,
	retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
}

/** Build a well-formed input; omitted fields default to zero. */
function makeInput(overrides: Partial<TaxInput> = {}): TaxInput {
	return {
		filingStatus: overrides.filingStatus,
		incomes: overrides.incomes ?? [],
		allowances: overrides.allowances ?? DEFAULT_ALLOWANCES,
		deductions: overrides.deductions ?? DEFAULT_DEDUCTIONS,
		withheld: overrides.withheld ?? 0,
		estimatedPaid: overrides.estimatedPaid ?? 0,
	}
}

describe("us2026System (PLACEHOLDER)", () => {
	it("system metadata, config and single-status brackets are exposed", () => {
		expect(us2026System.country).toBe("US")
		expect(us2026System.taxYear).toBe(2026)
		expect(us2026System.currency).toBe("USD")
		expect(us2026System.assumptions.length).toBeGreaterThanOrEqual(3)
		// system brackets = SINGLE status brackets
		expect(us2026System.config.brackets[0]).toMatchObject({ upTo: 11_925, rate: 0.1 })
		expect(us2026System.config.brackets).toBe(
			us2026System.config.options.bracketsByStatus.single,
		)
		expect(us2026System.config.options.filingStatuses).toHaveLength(4)
	})

	it("zero input -> all fields zero", () => {
		const r = compute(makeInput())
		expect(r.grossIncome).toBe(0)
		expect(r.assessableIncome).toBe(0)
		expect(r.standardDeduction).toBe(0)
		expect(r.taxableIncome).toBe(0)
		expect(r.taxLiability).toBe(0)
		expect(r.credits).toBe(0)
		expect(r.netTax).toBe(0)
		expect(r.balance).toBe(0)
		expect(r.marginalRate).toBe(0)
		expect(r.effectiveRate).toBe(0)
		expect(r.warnings).toEqual([])
		expect(r.errors).toEqual([])
	})

	it("single, wages 30,000 -> std 15,000, taxable 15,000, liability 1,561.50", () => {
		const r = compute(makeInput({ filingStatus: "single", incomes: [{ categoryCode: "wages", amount: 30_000 }] }))
		expect(r.grossIncome).toBe(30_000)
		expect(r.assessableIncome).toBe(30_000)
		expect(r.standardDeduction).toBe(15_000)
		expect(r.taxableIncome).toBe(15_000)
		// 11,925 * 0.10 = 1,192.50 + 3,075 * 0.12 = 369.00
		expect(r.taxLiability).toBe(1_561.5)
		expect(r.netTax).toBe(1_561.5)
		expect(r.marginalRate).toBe(0.12)
		expect(r.effectiveRate).toBeCloseTo(0.05205, 5)
		expect(r.balance).toBe(1_561.5)
		expect(r.brackets[0]).toMatchObject({ index: 0, from: 0, to: 11_925, taxableInBracket: 11_925, tax: 1_192.5 })
		expect(r.brackets[1]).toMatchObject({ index: 1, from: 11_925, to: 48_475, taxableInBracket: 3_075, tax: 369 })
	})

	it("single, wages 30,000, withheld 1,500 -> balance 61.50", () => {
		const r = compute(makeInput({ filingStatus: "single", incomes: [{ categoryCode: "wages", amount: 30_000 }], withheld: 1_500 }))
		expect(r.taxLiability).toBe(1_561.5)
		expect(r.balance).toBe(61.5)
	})

	it("married_joint, wages 30,000 -> std 30,000, taxable 0, netTax 0", () => {
		const r = compute(makeInput({ filingStatus: "married_joint", incomes: [{ categoryCode: "wages", amount: 30_000 }] }))
		expect(r.standardDeduction).toBe(30_000)
		expect(r.taxableIncome).toBe(0)
		expect(r.taxLiability).toBe(0)
		expect(r.netTax).toBe(0)
		expect(r.marginalRate).toBe(0)
	})

	it("head_of_household, wages 30,000 -> std 22,500, taxable 7,500, liability 750.00", () => {
		const r = compute(makeInput({ filingStatus: "head_of_household", incomes: [{ categoryCode: "wages", amount: 30_000 }] }))
		expect(r.standardDeduction).toBe(22_500)
		expect(r.taxableIncome).toBe(7_500)
		expect(r.taxLiability).toBe(750)
		expect(r.netTax).toBe(750)
		expect(r.marginalRate).toBe(0.1)
	})

	it("married_separate, wages 50,000 -> std 15,000, taxable 35,000, liability 3,961.50", () => {
		const r = compute(makeInput({ filingStatus: "married_separate", incomes: [{ categoryCode: "wages", amount: 50_000 }] }))
		expect(r.standardDeduction).toBe(15_000)
		expect(r.taxableIncome).toBe(35_000)
		// 1,192.50 + (35,000 - 11,925) * 0.12 = 1,192.50 + 2,769.00
		expect(r.taxLiability).toBe(3_961.5)
		expect(r.netTax).toBe(3_961.5)
		expect(r.marginalRate).toBe(0.12)
	})

	it("unknown filing status -> validate error containing 'Unknown filing status'", () => {
		const errors = validate(makeInput({ filingStatus: "widow" }))
		expect(errors.some((e) => e.includes("Unknown filing status"))).toBe(true)
		expect(errors.some((e) => e.includes("widow"))).toBe(true)
		expect(validate(makeInput({ filingStatus: "single" }))).toEqual([])
	})

	it("warnings for ignored allowances and itemized deductions inputs", () => {
		const r = compute(
			makeInput({
				filingStatus: "single",
				incomes: [{ categoryCode: "wages", amount: 30_000 }],
				allowances: { personal: 1, spouse: 0, children: 0, disabled: 0 },
				deductions: {
					insurance: 5_000,
					mortgageInterest: 0,
					donations: 0,
					retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
				},
			}),
		)
		expect(r.warnings).toContain("Allowances input ignored under US placeholder")
		expect(r.warnings).toContain("Itemized deductions input ignored under US placeholder")
		// Values are still computed from income and standard deduction only.
		expect(r.standardDeduction).toBe(15_000)
		expect(r.taxableIncome).toBe(15_000)
		expect(r.taxLiability).toBe(1_561.5)
	})

	it("self_employment 100,000 + investment 10,000, single -> taxable 95,000, liability 15,814.00", () => {
		const r = compute(
			makeInput({
				filingStatus: "single",
				incomes: [
					{ categoryCode: "self_employment", amount: 100_000 },
					{ categoryCode: "investment", amount: 10_000 },
				],
			}),
		)
		expect(r.grossIncome).toBe(110_000)
		expect(r.assessableIncome).toBe(110_000)
		expect(r.standardDeduction).toBe(15_000)
		expect(r.taxableIncome).toBe(95_000)
		expect(r.marginalRate).toBe(0.22)
		// 1,192.50 + (48,475 - 11,925) * 0.12 + (95,000 - 48,475) * 0.22
		// = 1,192.50 + 4,386.00 + 10,235.50
		expect(r.taxLiability).toBe(15_814)
		expect(r.netTax).toBe(15_814)
	})

	it("validate rejects negative, non-finite and unknown-category inputs", () => {
		expect(
			validate(makeInput({ incomes: [{ categoryCode: "wages", amount: -5 }] })),
		).toHaveLength(1)
		expect(
			validate(makeInput({ incomes: [{ categoryCode: "wages", amount: NaN }] })),
		).toHaveLength(1)
		expect(
			validate(makeInput({ incomes: [{ categoryCode: "salary", amount: 1_000 }] })),
		).toHaveLength(1)
		expect(validate(makeInput({ withheld: -1 }))).toHaveLength(1)
		expect(validate(makeInput({ estimatedPaid: Infinity }))).toHaveLength(1)
	})
})