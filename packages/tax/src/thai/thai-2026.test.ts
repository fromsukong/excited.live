import { describe, it, expect } from "vitest"
import type { TaxInput } from "../types"
import { thai2026System } from "./thai-2026"

/** Base input: one personal allowance, no income, no deductions, no prepayments. */
function input(overrides: Partial<TaxInput> = {}): TaxInput {
	const base: TaxInput = {
		incomes: [],
		allowances: { personal: 1, spouse: 0, children: 0, disabled: 0 },
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

describe("thai2026System metadata", () => {
	it("exposes country, tax year and currency in results", () => {
		const result = thai2026System.compute(input())
		expect(result.country).toBe("TH")
		expect(result.taxYear).toBe(2026)
		expect(result.currency).toBe("THB")
		expect(thai2026System.country).toBe("TH")
		expect(thai2026System.taxYear).toBe(2026)
	})
})

describe("thai2026System basic computation", () => {
	it("empty input (all zeros) yields all-zero results", () => {
		const result = thai2026System.compute(
			input({ allowances: { personal: 0, spouse: 0, children: 0, disabled: 0 } }),
		)
		expect(result.grossIncome).toBe(0)
		expect(result.assessableIncome).toBe(0)
		expect(result.expenseDeductions).toBe(0)
		expect(result.itemizedDeductions).toBe(0)
		expect(result.allowancesTotal).toBe(0)
		expect(result.taxableIncome).toBe(0)
		expect(result.taxLiability).toBe(0)
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(0)
		expect(result.marginalRate).toBe(0)
		expect(result.effectiveRate).toBe(0)
		expect(result.balance).toBe(0)
		expect(result.brackets.every((bracket) => bracket.tax === 0 && bracket.taxableInBracket === 0)).toBe(true)
		expect(result.warnings).toEqual([])
	})

	it("employment 120,000: expense 60,000, allowances wipe out remaining income", () => {
		const result = thai2026System.compute(input({ incomes: [employment(120_000)] }))
		expect(result.expenseDeductions).toBe(60_000)
		expect(result.assessableIncome).toBe(60_000)
		expect(result.allowancesTotal).toBe(60_000)
		expect(result.taxableIncome).toBe(0)
		expect(result.netTax).toBe(0)
		// Credit would be 15,000 but liability is 0, so applied credits are 0.
		expect(result.credits).toBe(0)
	})

	it("employment 500,000: expense cap at 100,000, liability 11,500", () => {
		const result = thai2026System.compute(input({ incomes: [employment(500_000)] }))
		expect(result.expenseDeductions).toBe(100_000)
		expect(result.assessableIncome).toBe(400_000)
		expect(result.taxableIncome).toBe(340_000)
		expect(result.taxLiability).toBe(11_500)
		expect(result.credits).toBe(0)
		expect(result.netTax).toBe(11_500)
		expect(result.marginalRate).toBe(0.1)
		expect(result.effectiveRate).toBe(0.02875)
		expect(result.balance).toBe(11_500)
	})

	it("employment 500,000 + insurance 40,000: taxable exactly 300,000, top bracket 5%", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(500_000)], deductions: { insurance: 40_000, mortgageInterest: 0, donations: 0, retirementSavings: { ssf: 0, rmf: 0, provident: 0 } } }),
		)
		expect(result.assessableIncome).toBe(400_000)
		expect(result.taxableIncome).toBe(300_000)
		expect(result.taxLiability).toBe(7_500)
		expect(result.marginalRate).toBe(0.05)
		const touched = result.brackets.filter((bracket) => bracket.taxableInBracket > 0)
		const last = touched[touched.length - 1]
		expect(last.rate).toBe(0.05)
		expect(last.from).toBe(150_000)
		expect(last.to).toBe(300_000)
		expect(last.taxableInBracket).toBe(150_000)
		expect(last.tax).toBe(7_500)
	})
})

describe("thai2026System itemized deductions", () => {
	it("retirement savings: per-fund caps then combined 500,000 cap", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(1_000_000)],
				deductions: { insurance: 0, mortgageInterest: 0, donations: 0, retirementSavings: { ssf: 300_000, rmf: 400_000, provident: 200_000 } },
			}),
		)
		// assessable = 1,000,000 - 100,000 (expense cap)
		// ssf 300,000 -> 200,000; rmf 400,000 -> 270,000 (30% of 900,000); provident 200,000 -> 150,000 (15% of 1,000,000)
		// combined 620,000 -> capped at 500,000
		expect(result.assessableIncome).toBe(900_000)
		expect(result.itemizedDeductions).toBe(500_000)
		expect(result.taxableIncome).toBe(340_000)
		expect(result.taxLiability).toBe(11_500)
		expect(result.warnings.some((warning) => warning.includes("Retirement savings capped at 500,000"))).toBe(true)
	})

	it("donations: capped at 10% of assessable income with warning", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(1_000_000)],
				deductions: { insurance: 0, mortgageInterest: 0, donations: 300_000, retirementSavings: { ssf: 0, rmf: 0, provident: 0 } },
			}),
		)
		// assessable 900,000 -> donations capped at 90,000
		expect(result.assessableIncome).toBe(900_000)
		expect(result.itemizedDeductions).toBe(90_000)
		expect(result.taxableIncome).toBe(750_000)
		expect(result.taxLiability).toBe(65_000)
		expect(result.warnings.some((warning) => warning.includes("Donations capped at"))).toBe(true)
	})
})

describe("thai2026System balance and allowances", () => {
	it("balance: negative means refund, positive means still owed", () => {
		const result = thai2026System.compute(input({ incomes: [employment(500_000)], withheld: 20_000 }))
		expect(result.netTax).toBe(11_500)
		expect(result.balance).toBe(-8_500)

		const result2 = thai2026System.compute(
			input({ incomes: [employment(500_000)], withheld: 5_000, estimatedPaid: 4_000 }),
		)
		expect(result2.netTax).toBe(11_500)
		expect(result2.balance).toBe(2_500)
	})

	it("allowances: personal + spouse + 2 children", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(500_000)], allowances: { personal: 1, spouse: 1, children: 2, disabled: 0 } }),
		)
		expect(result.allowancesTotal).toBe(180_000)
		expect(result.taxableIncome).toBe(220_000)
		expect(result.taxLiability).toBe(3_500)
		expect(result.effectiveRate).toBe(0.00875)
	})
})

describe("thai2026System working credit", () => {
	it("credit phases out between 150,000 and 300,000 employment income", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(175_000), { categoryCode: "other", amount: 500_000 }] }),
		)
		// credit = 15,000 - 0.5 * (175,000 - 150,000) = 2,500
		// expense: employment 87,500 (50%, under cap) + other 150,000 (30%)
		// assessable = 675,000 - 87,500 - 150,000 = 437,500
		// taxable = 437,500 - 60,000 = 377,500
		// liability = 150,000@5% (7,500) + 77,500@10% (7,750) = 15,250
		expect(result.credits).toBe(2_500)
		expect(result.assessableIncome).toBe(437_500)
		expect(result.taxableIncome).toBe(377_500)
		expect(result.taxLiability).toBe(15_250)
		expect(result.netTax).toBe(12_750)
	})

	it("employment 175,000 or less gets the full 15,000 credit", () => {
		const result = thai2026System.compute(input({ incomes: [employment(120_000)] }))
		expect(result.credits).toBe(0) // liability is 0, so credited amount is 0
	})
})

describe("thai2026System brackets", () => {
	it("marginal 35% at 10M employment; liability equals bracket sum", () => {
		const result = thai2026System.compute(input({ incomes: [employment(10_000_000)] }))
		expect(result.marginalRate).toBe(0.35)
		const bracketSum = result.brackets.reduce((acc, bracket) => acc + bracket.tax, 0)
		expect(result.taxLiability).toBe(bracketSum)
		expect(result.taxLiability).toBe(2_959_000)
	})

	it("taxable income exactly at the 1,000,000 bracket boundary", () => {
		// employment 1,160,000 -> expense cap 100,000 -> assessable 1,060,000
		// minus personal allowance 60,000 -> taxable exactly 1,000,000
		const result = thai2026System.compute(input({ incomes: [employment(1_160_000)] }))
		expect(result.assessableIncome).toBe(1_060_000)
		expect(result.taxableIncome).toBe(1_000_000)
		// 150,000@0% + 150,000@5% (7,500) + 200,000@10% (20,000) + 250,000@15% (37,500) + 250,000@20% (50,000)
		expect(result.taxLiability).toBe(115_000)
		expect(result.marginalRate).toBe(0.2)
		// gross > 300,000, so no working credit
		expect(result.credits).toBe(0)
	})
})

describe("thai2026System warnings", () => {
	it("interest income adds the v1 simplification warning", () => {
		const result = thai2026System.compute(
			input({ incomes: [employment(500_000), { categoryCode: "interest", amount: 30_000 }] }),
		)
		// interest has no expense deduction: assessable = 400,000 + 30,000 = 430,000
		expect(result.assessableIncome).toBe(430_000)
		expect(
			result.warnings.some((warning) => warning.includes("Interest 20,000 exemption and dividend tax credit not modeled")),
		).toBe(true)
	})

	it("freelance/rental/other add no extra warnings", () => {
		const result = thai2026System.compute(
			input({
				incomes: [
					{ categoryCode: "freelance", amount: 100_000 },
					{ categoryCode: "rental", amount: 50_000 },
					{ categoryCode: "other", amount: 20_000 },
				],
			}),
		)
		expect(result.warnings).toEqual([])
	})
})

describe("thai2026System validate", () => {
	it("rejects negative income amounts", () => {
		const problems = thai2026System.validate(input({ incomes: [employment(-1_000)] }))
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects non-finite income amounts", () => {
		const problems = thai2026System.validate(input({ incomes: [{ categoryCode: "employment", amount: Infinity }] }))
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects unknown income category codes", () => {
		const problems = thai2026System.validate(input({ incomes: [{ categoryCode: "crypto", amount: 1_000 }] }))
		expect(problems.length).toBeGreaterThan(0)
	})

	it("rejects negative withheld", () => {
		const problems = thai2026System.validate(input({ incomes: [employment(100_000)], withheld: -100 }))
		expect(problems.length).toBeGreaterThan(0)
	})

	it("accepts a valid input, ignoring filingStatus for TH", () => {
		const problems = thai2026System.validate(
			input({ incomes: [employment(500_000)], filingStatus: "single" }),
		)
		expect(problems).toEqual([])
	})
})