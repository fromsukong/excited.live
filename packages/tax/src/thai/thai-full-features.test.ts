import { describe, it, expect } from "vitest"
import type { TaxInput } from "../types"
import { thai2026System } from "./thai-2026"

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
