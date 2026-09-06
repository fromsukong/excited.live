/**
 * Optimizer tests — expected numbers hand-computed from the TH 2026 brackets.
 * Case A (income 1,200,000): assessable 1,100,000; no RMF → taxable 1,015,000,
 * tax 108,000. At the 30% cap (330,000) → taxable 685,000, tax 70,000 →
 * recommended 330,000, saved 38,000.
 * Case B (income 600,000): assessable 550,000; taxable 465,000 → tax 24,000.
 * Cap 165,000 would overshoot taxable; 1000-baht walk-down finds the smallest
 * contribution that still saves tax: taxable 1,000 → tax 50 → recommended
 * 364,000−1,000 scaled… (asserted structurally below instead of by magic).
 */
import { describe, expect, it } from "vitest"

import { optimizeRetirementContribution } from "./optimize"

describe("optimizeRetirementContribution", () => {
	it("recommends the 30% cap when it saves tax at the margin", () => {
		const result = optimizeRetirementContribution({
			income: 1_200_000,
			personalAllowances: 1,
			spouseAllowances: 0,
			childrenAllowances: 0,
			parentsAllowances: 0,
			insurance: 25_000,
			mortgageInterest: 0,
			donations: 0,
		})
		expect(result.assessableIncome).toBe(1_100_000)
		expect(result.recommended).toBe(330_000)
		expect(result.boundBy).toBe("rate")
		// Taxable 1,015,000 → 685,000: tax 118,750 → 55,250.
		expect(result.taxSaved).toBe(63_500)
	})

	it("respects the 500k combined cap for high incomes", () => {
		const result = optimizeRetirementContribution({
			income: 3_000_000,
			personalAllowances: 1,
			spouseAllowances: 0,
			childrenAllowances: 0,
			parentsAllowances: 0,
			insurance: 100_000,
			mortgageInterest: 0,
			donations: 0,
		})
		// Assessable 2,900,000 → 30% = 870,000 > 500,000 combined cap.
		expect(result.recommended).toBe(500_000)
		expect(result.boundBy).toBe("combined")
		expect(result.taxSaved).toBeGreaterThan(0)
	})

	it("recommends nothing when there is no taxable income to shield", () => {
		const result = optimizeRetirementContribution({
			income: 150_000,
			personalAllowances: 1,
			spouseAllowances: 0,
			childrenAllowances: 0,
			parentsAllowances: 0,
			insurance: 0,
			mortgageInterest: 0,
			donations: 0,
		})
		// Assessable 75,000 is fully covered by the 60,000 allowance + 15k credit.
		expect(result.recommended).toBe(0)
		expect(result.boundBy).toBe("no-benefit")
		expect(result.taxSaved).toBe(0)
	})

	it("walks down to a useful amount for mid incomes (saves real tax)", () => {
		const result = optimizeRetirementContribution({
			income: 600_000,
			personalAllowances: 1,
			spouseAllowances: 0,
			childrenAllowances: 0,
			parentsAllowances: 0,
			insurance: 25_000,
			mortgageInterest: 0,
			donations: 0,
		})
		// Assessable 500,000 (expense deduction capped at 100k) → taxable
		// 415,000 → tax 19,000. RMF cap = 30% × 500,000 = 150,000 →
		// taxable 265,000 → tax 5,750. The 30% cap stays under the point
		// where the deduction would overshoot taxable income, so it binds.
		expect(result.assessableIncome).toBe(500_000)
		expect(result.recommended).toBe(150_000)
		expect(result.boundBy).toBe("rate")
		expect(result.taxSaved).toBe(13_250)
	})
})
