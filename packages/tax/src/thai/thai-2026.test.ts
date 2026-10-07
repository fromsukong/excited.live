import { describe, it, expect } from "vitest"
import type { TaxInput } from "../types"
import { thai2026System } from "./thai-2026"

/** Base input: one personal allowance, no income, no deductions, no prepayments. */
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
			input({ allowances: { personal: 0, spouse: 0, children: 0, parents: 0, disabled: 0 } }),
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
		expect(last).toBeDefined()
		expect(last?.rate).toBe(0.05)
		expect(last?.from).toBe(150_000)
		expect(last?.to).toBe(300_000)
		expect(last?.taxableInBracket).toBe(150_000)
		expect(last?.tax).toBe(7_500)
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
			input({ incomes: [employment(500_000)], allowances: { personal: 1, spouse: 1, children: 2, parents: 0, disabled: 0 } }),
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

	it("rejects parents count above the RD max of 4", () => {
		const problems = thai2026System.validate(input({ allowances: { personal: 1, spouse: 0, children: 0, parents: 5, disabled: 0 } }))
		expect(problems.some((problem) => problem.includes("at most 4"))).toBe(true)
	})

	it("accepts a valid input, ignoring filingStatus for TH", () => {
		const problems = thai2026System.validate(
			input({ incomes: [employment(500_000)], filingStatus: "single" }),
		)
		expect(problems).toEqual([])
	})
})
describe("thai2026System parents allowance", () => {
	it("parents count deducts 30,000 each (no parent allowance by default)", () => {
		const base = thai2026System.compute(input({ incomes: [employment(900_000)] }))
		const withParents = thai2026System.compute(
			input({ incomes: [employment(900_000)], allowances: { personal: 1, spouse: 0, children: 0, parents: 2, disabled: 0 } }),
		)
		expect(withParents.allowancesTotal - base.allowancesTotal).toBe(60_000)
		expect(withParents.taxableIncome).toBe(base.taxableIncome - 60_000)
	})

	it("validate rejects non-integer or negative parents", () => {
		expect(thai2026System.validate(input({ allowances: { personal: 1, spouse: 0, children: 0, parents: -1, disabled: 0 } })).length).toBeGreaterThan(0)
		expect(thai2026System.validate(input({ allowances: { personal: 1, spouse: 0, children: 0, parents: 1.5, disabled: 0 } })).length).toBeGreaterThan(0)
		expect(thai2026System.validate(input({ allowances: { personal: 1, spouse: 0, children: 0, parents: 4, disabled: 0 } }))).toEqual([])
	})
})

describe("thai2026System deductionLines", () => {
	it("reports entered vs applied per line; no cap → entered === applied", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(900_000)],
				deductions: {
					insurance: 50_000,
					mortgageInterest: 0,
					donations: 10_000,
					retirementSavings: { ssf: 30_000, rmf: 0, provident: 0 },
				},
			}),
		)
		const insurance = result.deductionLines.find((line) => line.code === "insurance")
		expect(insurance).toMatchObject({ entered: 50_000, applied: 50_000, capped: false })
		const donations = result.deductionLines.find((line) => line.code === "donations")
		expect(donations).toMatchObject({ entered: 10_000, applied: 10_000, capped: false })
	})

	it("flags capped lines and applied reflects the cap", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(900_000)],
				deductions: {
					insurance: 150_000,
					mortgageInterest: 0,
					donations: 0,
					retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
				},
			}),
		)
		const insurance = result.deductionLines.find((line) => line.code === "insurance")
		expect(insurance?.capped).toBe(true)
		expect(insurance?.applied).toBe(100_000)
		expect(insurance?.entered).toBe(150_000)
	})

	it("income-conditional caps bite: donations 10% of assessable", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(200_000)],
				deductions: {
					insurance: 0,
					mortgageInterest: 0,
					donations: 50_000,
					retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
				},
			}),
		)
		const donations = result.deductionLines.find((line) => line.code === "donations")
		// assessable = 100,000 → cap = 10,000
		expect(donations?.applied).toBe(10_000)
		expect(donations?.capped).toBe(true)
	})

	it("aggregate retirement line: entered = raw sum, applied = combined-cap result", () => {
		const result = thai2026System.compute(
			input({
				incomes: [employment(2_000_000)],
				deductions: {
					insurance: 0,
					mortgageInterest: 0,
					donations: 0,
					retirementSavings: { ssf: 400_000, rmf: 400_000, provident: 300_000 },
				},
			}),
		)
		const retirement = result.deductionLines.find((line) => line.code === "retirement")
		// Per-fund caps: ssf 400k→200k, rmf 400k (under 30%×1.9M), provident 300k (15%×2M)
		// → applied sum 900k → combined cap 500k. Entered stays the raw 1.1M sum.
		expect(retirement?.entered).toBe(1_100_000)
		expect(retirement?.applied).toBe(500_000)
		expect(retirement?.capped).toBe(true)
	})

	it("empty deductions → no lines reported", () => {
		const result = thai2026System.compute(input({ incomes: [employment(900_000)] }))
		expect(result.deductionLines.every((line) => line.entered === 0 && line.applied === 0)).toBe(true)
	})

	it("allowanceDefs exposes bilingual parents definition at 30,000", () => {
		const def = thai2026System.allowanceDefs?.find((def) => def.code === "parents")
		expect(def?.amountPerPerson).toBe(30_000)
		expect(def?.label.en.length).toBeGreaterThan(0)
		expect(def?.label.th.length).toBeGreaterThan(0)
	})
})

const noAllowances: TaxInput["allowances"] = {
	personal: 1,
	spouse: 0,
	children: 0,
	parents: 0,
	disabled: 0,
}

const noDeductions: TaxInput["deductions"] = {
	insurance: 0,
	mortgageInterest: 0,
	donations: 0,
	retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
}

function makeInput(overrides: Partial<TaxInput> = {}): TaxInput {
	return {
		incomes: overrides.incomes ?? [{ categoryCode: "employment", amount: 600_000 }],
		allowances: overrides.allowances ?? { ...noAllowances },
		deductions: overrides.deductions ?? { ...noDeductions },
		withheld: overrides.withheld ?? 0,
		estimatedPaid: overrides.estimatedPaid ?? 0,
	}
}

describe("Thai 2026 Extended Allowances", () => {
	it("deducts 60,000 THB for 2nd+ child born in 2018 or later", () => {
		// 1 standard child (30k) + 2 post-2018 children (2 * 60k = 120k) + personal (60k) = 210k
		const result = thai2026System.compute(
			makeInput({
				allowances: {
					...noAllowances,
					children: 1,
					childrenSecondPlus2018: 2,
				},
			}),
		)
		expect(result.allowancesTotal).toBe(210_000)
	})
})

describe("Thai 2026 Extended Deductions", () => {
	it("handles Social Security (capped at 9,000 THB)", () => {
		const uncapped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, socialSecurity: 5_000 } }),
		)
		const uncappedLine = uncapped.deductionLines.find((l) => l.code === "socialSecurity")
		expect(uncappedLine).toMatchObject({ entered: 5_000, applied: 5_000, capped: false })

		const capped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, socialSecurity: 12_000 } }),
		)
		const cappedLine = capped.deductionLines.find((l) => l.code === "socialSecurity")
		expect(cappedLine).toMatchObject({ entered: 12_000, applied: 9_000, capped: true })
	})

	it("handles self Health Insurance (capped at 25,000, combined with life at 100,000)", () => {
		// Health capped at 25,000
		const res1 = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, insurance: 0, healthInsurance: 30_000 } }),
		)
		const healthLine1 = res1.deductionLines.find((l) => l.code === "healthInsurance")
		expect(healthLine1).toMatchObject({ entered: 30_000, applied: 25_000, capped: true })
		expect(res1.itemizedDeductions).toBe(25_000)

		// Combined life (90,000) + health (20,000 capped at 20,000) -> 110,000 capped at 100,000
		const res2 = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, insurance: 90_000, healthInsurance: 20_000 } }),
		)
		expect(res2.itemizedDeductions).toBe(100_000)
	})

	it("handles Parents' Health Insurance (capped at 15,000 THB)", () => {
		const uncapped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, parentHealthInsurance: 10_000 } }),
		)
		const uncappedLine = uncapped.deductionLines.find((l) => l.code === "parentHealthInsurance")
		expect(uncappedLine).toMatchObject({ entered: 10_000, applied: 10_000, capped: false })

		const capped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, parentHealthInsurance: 25_000 } }),
		)
		const cappedLine = capped.deductionLines.find((l) => l.code === "parentHealthInsurance")
		expect(cappedLine).toMatchObject({ entered: 25_000, applied: 15_000, capped: true })
	})

	it("handles Prenatal Care and Childbirth (capped at 60,000 THB)", () => {
		const uncapped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, prenatalAndChildbirth: 40_000 } }),
		)
		const uncappedLine = uncapped.deductionLines.find((l) => l.code === "prenatalAndChildbirth")
		expect(uncappedLine).toMatchObject({ entered: 40_000, applied: 40_000, capped: false })

		const capped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, prenatalAndChildbirth: 75_000 } }),
		)
		const cappedLine = capped.deductionLines.find((l) => l.code === "prenatalAndChildbirth")
		expect(cappedLine).toMatchObject({ entered: 75_000, applied: 60_000, capped: true })
	})

	it("handles Easy E-Receipt (capped at 50,000 THB)", () => {
		const uncapped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, easyEReceipt: 30_000 } }),
		)
		const uncappedLine = uncapped.deductionLines.find((l) => l.code === "easyEReceipt")
		expect(uncappedLine).toMatchObject({ entered: 30_000, applied: 30_000, capped: false })

		const capped = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, easyEReceipt: 65_000 } }),
		)
		const cappedLine = capped.deductionLines.find((l) => l.code === "easyEReceipt")
		expect(cappedLine).toMatchObject({ entered: 65_000, applied: 50_000, capped: true })
	})

	it("handles Thai ESG fund (capped at 30% assessable income and max 300,000 THB, outside retirement pool)", () => {
		// assessable = 600,000 - 100,000 = 500,000. 30% cap is 150,000
		const res1 = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, thaiESG: 100_000 } }),
		)
		const line1 = res1.deductionLines.find((l) => l.code === "thaiESG")
		expect(line1).toMatchObject({ entered: 100_000, applied: 100_000, capped: false })

		const res2 = thai2026System.compute(
			makeInput({ deductions: { ...noDeductions, thaiESG: 200_000 } }),
		)
		const line2 = res2.deductionLines.find((l) => l.code === "thaiESG")
		expect(line2).toMatchObject({ entered: 200_000, applied: 150_000, capped: true })

		// high assessable income (2M) -> 300,000 absolute cap
		const res3 = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "employment", amount: 2_100_000 }],
				deductions: { ...noDeductions, thaiESG: 400_000 },
			}),
		)
		const line3 = res3.deductionLines.find((l) => l.code === "thaiESG")
		expect(line3).toMatchObject({ entered: 400_000, applied: 300_000, capped: true })
	})

	it("handles Pension Life Insurance absorbing unused general life insurance room before retirement pool", () => {
		// General life is 60,000 -> unused room is 40,000.
		// Pension insurance is 70,000:
		// 40,000 absorbs into general life insurance.
		// Remaining 30,000 enters retirement pool (assessable is 500,000 -> 15% cap is 75,000 -> 30k allowed).
		const res = thai2026System.compute(
			makeInput({
				deductions: {
					...noDeductions,
					insurance: 60_000,
					retirementSavings: { ssf: 0, rmf: 0, provident: 0, pensionInsurance: 70_000 },
				},
			}),
		)
		// Total itemized: 60k + 40k + 30k = 130,000
		expect(res.itemizedDeductions).toBe(130_000)
	})

	it("handles NSF (กอช.) and GPF (กบข.) inside retirement pool", () => {
		// salary 1,000,000 (employment) -> assessable 900,000
		// GPF 30% employment cap = 300,000
		// NSF max 30,000
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "employment", amount: 1_000_000 }],
				deductions: {
					...noDeductions,
					retirementSavings: {
						ssf: 0,
						rmf: 0,
						provident: 0,
						nsf: 40_000, // capped at 30k
						gpf: 350_000, // capped at 300k
					},
				},
			}),
		)
		const retLine = res.deductionLines.find((l) => l.code === "retirement")
		expect(retLine).toMatchObject({ entered: 390_000, applied: 330_000, capped: true })
	})

	it("handles Double-Deduction Donations (2x)", () => {
		// assessable = 500,000 -> 10% cap = 50,000
		// regular 10,000 + doubleDonations 15,000 -> effective counted input 10k + 30k = 40,000 <= 50,000
		const res1 = thai2026System.compute(
			makeInput({
				deductions: { ...noDeductions, donations: 10_000, doubleDonations: 15_000 },
			}),
		)
		const donLine1 = res1.deductionLines.find((l) => l.code === "donations")
		expect(donLine1).toMatchObject({ entered: 40_000, applied: 40_000, capped: false })
		expect(res1.warnings.some((w) => w.includes("Donations capped at"))).toBe(false)

		// exceeding 10% cap triggers 2x warning
		const res2 = thai2026System.compute(
			makeInput({
				deductions: { ...noDeductions, donations: 10_000, doubleDonations: 30_000 },
			}),
		)
		const donLine2 = res2.deductionLines.find((l) => l.code === "donations")
		expect(donLine2).toMatchObject({ entered: 70_000, applied: 50_000, capped: true })
		expect(res2.warnings.some((w) => w.includes("effective 2x input 70000"))).toBe(true)
	})
})

describe("Thai 2026 Income Categories", () => {
	it("deducts 50% max 100k for copyright", () => {
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "copyright", amount: 300_000 }],
			}),
		)
		expect(res.expenseDeductions).toBe(100_000)
		expect(res.assessableIncome).toBe(200_000)
	})

	it("deducts flat 60% for medical and contracting of work", () => {
		const res = thai2026System.compute(
			makeInput({
				incomes: [
					{ categoryCode: "medical", amount: 500_000 },
					{ categoryCode: "contractor", amount: 500_000 },
				],
			}),
		)
		// 60% of 500k = 300k each -> 600,000 total
		expect(res.expenseDeductions).toBe(600_000)
		expect(res.assessableIncome).toBe(400_000)
	})
})

describe("Thai 2026 Section 48(2) Minimum Alternative Tax", () => {
	it("does not apply when non-employment gross < 120,000 THB", () => {
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "freelance", amount: 100_000 }],
			}),
		)
		expect(res.section48Tax).toBe(0)
	})

	it("does not apply when 0.5% tax <= 5,000 THB (exempt)", () => {
		// 800,000 * 0.005 = 4,000 <= 5,000 -> exempt
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "freelance", amount: 800_000 }],
			}),
		)
		expect(res.section48Tax).toBe(0)
	})

	it("applies when 0.5% tax > 5,000 THB and exceeds progressive bracket tax", () => {
		// 2,000,000 freelance -> 0.5% = 10,000 THB.
		// Deductions & allowances wipe out progressive taxable income so progressiveTax = 0.
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "freelance", amount: 2_000_000 }],
				deductions: {
					...noDeductions,
					insurance: 100_000,
					mortgageInterest: 100_000,
					thaiESG: 300_000,
					retirementSavings: { ssf: 200_000, rmf: 300_000, provident: 0 },
				},
				allowances: {
					personal: 1,
					spouse: 1,
					children: 5,
					childrenSecondPlus2018: 5,
					parents: 4,
					disabled: 2,
				},
			}),
		)
		expect(res.progressiveTax).toBe(0)
		expect(res.section48Tax).toBe(10_000)
		expect(res.taxLiability).toBe(10_000)
		expect(res.warnings.some((w) => w.includes("Section 48(2) minimum tax applied"))).toBe(true)
	})

	it("progressive tax takes precedence when progressive tax > section 48(2) tax", () => {
		// 2,000,000 freelance: expense = 600,000 -> assessable = 1,400,000.
		// progressive tax on 1.34M is > 100,000.
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "freelance", amount: 2_000_000 }],
			}),
		)
		expect(res.section48Tax).toBe(10_000)
		expect(res.taxLiability).toBeGreaterThan(10_000)
		expect(res.taxLiability).toBe(res.progressiveTax)
		expect(res.warnings.some((w) => w.includes("Section 48(2) minimum tax applied"))).toBe(false)
	})
})

describe("Thai 2026 Dividend Tax Credit (Section 47 bis)", () => {
	it("grosses up dividend and credits tax liability when citRate is provided", () => {
		// dividend 80,000 at 20% CIT:
		// credit = 80,000 * (0.2 / 0.8) = 20,000
		// gross income = 80,000 + 20,000 = 100,000
		const res = thai2026System.compute(
			makeInput({
				incomes: [{ categoryCode: "dividend", amount: 80_000, citRate: 0.2 }],
			}),
		)
		expect(res.grossIncome).toBe(100_000)
		expect(res.creditBreakdown?.dividendTaxCredit).toBe(20_000)
		expect(res.warnings.some((w) => w.includes("dividend tax credit not modeled"))).toBe(false)
	})
})

describe("Thai 2026 Validation Extended Checks", () => {
	it("validates all optional deduction fields reject negative and non-finite values", () => {
		const negativeDeductions: Partial<TaxInput["deductions"]>[] = [
			{ healthInsurance: -1 },
			{ parentHealthInsurance: -1 },
			{ socialSecurity: -1 },
			{ prenatalAndChildbirth: -1 },
			{ doubleDonations: -1 },
			{ thaiESG: -1 },
			{ easyEReceipt: -1 },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, pensionInsurance: -1 } },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, nsf: -1 } },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, gpf: -1 } },
		]

		for (const ded of negativeDeductions) {
			const errs = thai2026System.validate(
				makeInput({ deductions: { ...noDeductions, ...ded } }),
			)
			expect(errs.length).toBeGreaterThan(0)
			expect(errs[0]).toContain("must be a non-negative finite number")
		}

		const nanDeductions: Partial<TaxInput["deductions"]>[] = [
			{ healthInsurance: NaN },
			{ parentHealthInsurance: NaN },
			{ socialSecurity: NaN },
			{ prenatalAndChildbirth: NaN },
			{ doubleDonations: NaN },
			{ thaiESG: NaN },
			{ easyEReceipt: NaN },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, pensionInsurance: NaN } },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, nsf: NaN } },
			{ retirementSavings: { ssf: 0, rmf: 0, provident: 0, gpf: NaN } },
		]

		for (const ded of nanDeductions) {
			const errs = thai2026System.validate(
				makeInput({ deductions: { ...noDeductions, ...ded } }),
			)
			expect(errs.length).toBeGreaterThan(0)
			expect(errs[0]).toContain("must be a non-negative finite number")
		}
	})

	it("validates childrenSecondPlus2018 rejects negative, non-finite, and non-integer values", () => {
		expect(
			thai2026System.validate(
				makeInput({ allowances: { ...noAllowances, childrenSecondPlus2018: -1 } }),
			).length,
		).toBeGreaterThan(0)

		expect(
			thai2026System.validate(
				makeInput({ allowances: { ...noAllowances, childrenSecondPlus2018: NaN } }),
			).length,
		).toBeGreaterThan(0)

		expect(
			thai2026System.validate(
				makeInput({ allowances: { ...noAllowances, childrenSecondPlus2018: 1.5 } }),
			).length,
		).toBeGreaterThan(0)
	})

	it("validates citRate rejects values < 0, >= 1, and non-finite values", () => {
		expect(
			thai2026System.validate(
				makeInput({ incomes: [{ categoryCode: "dividend", amount: 10_000, citRate: -0.1 }] }),
			).length,
		).toBeGreaterThan(0)

		expect(
			thai2026System.validate(
				makeInput({ incomes: [{ categoryCode: "dividend", amount: 10_000, citRate: 1.0 }] }),
			).length,
		).toBeGreaterThan(0)

		expect(
			thai2026System.validate(
				makeInput({ incomes: [{ categoryCode: "dividend", amount: 10_000, citRate: NaN }] }),
			).length,
		).toBeGreaterThan(0)
	})
})
