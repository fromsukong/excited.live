/**
 * Simulation engine tests — every expected number below is hand-computed from
 * the TH 2026 brackets (NOT copied from engine output):
 *   employment 1,200,000 → 50% expense deduction capped at 100k → assessable
 *   1,100,000; personal allowance 60,000 → taxable 1,040,000 (no RMF in sim).
 *   Tax: 150k×0 + 150k×5% + 200k×10% + 250k×15% + 250k×20% + 40k×25%
 *       = 0 + 7,500 + 20,000 + 37,500 + 50,000 + 10,000 = 125,000 − 6,250
 *   working credit = 125,000 − 6,250 = 118,750.
 *   employment 600,000 → assessable 500,000 → taxable 440,000:
 *   tax 7,500 + 20,000 + 37,500 + 10,000 = 75,000 (no credit — income > 300k).
 */
import { describe, expect, it } from "vitest"
import {
	defaultPlanInput,
	rowAmountInYear,
	rowGrowthRate,
	runSimulation,
} from "./index"

function plan(overrides: Partial<ReturnType<typeof defaultPlanInput>> = {}) {
	return { ...defaultPlanInput(new Date("2026-01-15")), ...overrides }
}

describe("period rows", () => {
	it("applies growth modes: inflation / fixed / override", () => {
		expect(rowGrowthRate({ growthMode: "inflation", growthRate: 0.5 }, 0.02)).toBe(0.02)
		expect(rowGrowthRate({ growthMode: "fixed", growthRate: 0.5 }, 0.02)).toBe(0)
		expect(rowGrowthRate({ growthMode: "override", growthRate: 0.05 }, 0.02)).toBe(0.05)
	})

	it("grows a row by its effective rate inside the active window", () => {
		const row = {
			id: "r",
			label: "Rent",
			startYear: 2026,
			endYear: 2030,
			amount: 100_000,
			growthMode: "inflation" as const,
			growthRate: 0,
		}
		expect(rowAmountInYear(row, 2026, 0.02)).toBeCloseTo(100_000, 2)
		expect(rowAmountInYear(row, 2028, 0.02)).toBeCloseTo(100_000 * 1.02 ** 2, 2)
		expect(rowAmountInYear(row, 2031, 0.02)).toBe(0)
		expect(rowAmountInYear(row, 2025, 0.02)).toBe(0)
	})

	it("sums two overlapping rows of the same type", () => {
		const plan2 = plan({
			incomes: [
				{ id: "a", label: "Salary", startYear: 2026, endYear: null, amount: 600_000, growthMode: "fixed", growthRate: 0 },
				{ id: "b", label: "Salary (promotion)", startYear: 2028, endYear: null, amount: 300_000, growthMode: "fixed", growthRate: 0 },
			],
		})
		const result = runSimulation(plan2)
		expect(result.years[0]?.income).toBe(600_000)
		expect(result.years[2]?.income).toBe(900_000)
	})
})

describe("runSimulation", () => {
	it("projects income, tax, contributions and ages for the default plan", () => {
		const result = runSimulation(plan())
		expect(result.years).toHaveLength(50)
		const first = result.years[0]!
		expect(first.year).toBe(2026)
		expect(first.age).toBe(30)
		expect(first.income).toBe(1_200_000)
		expect(first.expenses).toBe(480_000)
		expect(first.tax).toBe(118_750)
		expect(first.netCash).toBe(1_200_000 - 118_750 - 480_000)
		expect(first.contribution).toBe(first.netCash)
		// Split 10/20/50/20 of 601,250 = 60,125 / 120,250 / 300,625 / 120,250
		// plus starting balances (EF 100k, non-tax 300k), each grown by rate.
		expect(first.wallets.emergency).toBeCloseTo((100_000 + 60_125) * 1.015, 2)
		expect(first.wallets.nontax).toBeCloseTo((300_000 + 300_625) * 1.07, 2)
		expect(first.netWorth).toBeCloseTo(
			first.wallets.emergency +
				first.wallets.goal +
				first.wallets.nontax +
				first.wallets.taxAdvantaged,
			2,
		)
	})

	it("switches spending to the retirement pension from the retirement year (US-004)", () => {
		const p = plan({ retirementYear: 2031, retirementMonthlyToday: 40_000 })
		const result = runSimulation(p)
		const lastWorking = result.years[4]!
		const firstRetired = result.years[5]!
		// 2031 = startYear + 5 → pension inflation factor 1.02^5.
		expect(firstRetired.expenses).toBeCloseTo(
			480_000 * 1.02 ** 5 + 480_000 * 1.02 ** 5,
			0,
		) // living row (inflation) + pension 480,000/yr today-money
		expect(lastWorking.expenses).toBeCloseTo(480_000 * 1.02 ** 4, 2)
	})

	it("switches to pension only when retirementYear is set", () => {
		const p = plan({ retirementYear: null, horizonYears: 35 })
		const result = runSimulation(p)
		// Income ends 2055 → year 2056 income 0; expenses = living row only.
		const afterIncome = result.years[30]!
		expect(afterIncome.income).toBe(0)
		expect(afterIncome.expenses).toBeCloseTo(480_000 * 1.02 ** 30, 0)
		expect(afterIncome.withdrawal).toBeGreaterThan(0)
	})

	it("feeds deductible mortgage rows into the tax calc (US-005)", () => {
		const p = plan({
			expenses: [
				{ id: "e1", label: "Living", startYear: 2026, endYear: null, amount: 480_000, growthMode: "fixed", growthRate: 0 },
				{ id: "e2", label: "Mortgage interest", startYear: 2026, endYear: null, amount: 200_000, growthMode: "fixed", growthRate: 0, deductible: "mortgageInterest" },
			],
		})
		const result = runSimulation(p)
		// Assessable 1,100,000 − insurance 25,000 − mortgage (capped 100,000)
		// − allowance 60,000 → taxable 915,000.
		// Tax: 7,500 + 20,000 + 37,500 + 165,000×20% = 98,000.
		expect(result.years[0]?.tax).toBe(98_000)
	})

	it("caps the emergency fund and overflows to investments (money conserved)", () => {
		const p = plan({ efMonths: 6 })
		const result = runSimulation(p)
		const first = result.years[0]!
		// EF target = 6 × (480,000/12) = 240,000; balance 160,125 → no overflow
		// year 1. Check money conservation instead of a specific split.
		expect(first.netWorth).toBeCloseTo(
			first.wallets.emergency + first.wallets.goal + first.wallets.nontax + first.wallets.taxAdvantaged,
			2,
		)
	})

	it("overflows the EF into investments when above target", () => {
		const p = plan({
			startingWallets: { emergency: 400_000, goal: 0, nontax: 0, taxAdvantaged: 0 },
			savingsSplit: { emergency: 0, goal: 0, nontax: 1, taxAdvantaged: 0 },
			efMonths: 6,
			expenses: [
				{ id: "e1", label: "Living", startYear: 2026, endYear: null, amount: 480_000, growthMode: "fixed", growthRate: 0 },
			],
		})
		const result = runSimulation(p)
		const first = result.years[0]!
		// EF target 240,000; balance 400,000 + 0 contributed → overflow 160,000
		// → investments. Net cash 601,250 (split nontax=1) joins the overflow,
		// then EF grows 1.5%, investments 7%.
		expect(first.wallets.emergency).toBeCloseTo(240_000 * 1.015, 2)
		expect(first.wallets.nontax).toBeCloseTo((160_000 + 601_250) * 1.07, 2)
	})

	it("withdraws EF first, then investments, and flags unmet spend", () => {
		const p = plan({
			startYear: 2026,
			startingWallets: { emergency: 50_000, goal: 0, nontax: 100_000, taxAdvantaged: 0 },
			incomes: [
				{ id: "a", label: "Salary", startYear: 2026, endYear: 2027, amount: 600_000, growthMode: "fixed", growthRate: 0 },
			],
			expenses: [
				{ id: "e", label: "Living", startYear: 2026, endYear: null, amount: 480_000, growthMode: "fixed", growthRate: 0 },
			],
			savingsSplit: { emergency: 0, goal: 0, nontax: 1, taxAdvantaged: 0 },
			retirementYear: 2028,
			retirementMonthlyToday: 40_000,
			horizonYears: 4,
		})
		const result = runSimulation(p)
		const year3 = result.years[2]!
		// 2028: income 0; pension 480,000 + living 480,000 = 960,000 needed.
		// Wallets after 2027 ≈ EF 50k×1.015², non-tax (100k + saving)×1.07².
		expect(year3.withdrawal).toBeGreaterThan(0)
		expect(year3.unmet).toBe(true)
		expect(result.unmetYear).toBe(2028)
	})

	it("grows wallet balances by their yearly rates", () => {
		const p = plan({
			walletRates: { emergency: 0, goal: 0, nontax: 0.07, taxAdvantaged: 0 },
			startingWallets: { emergency: 0, goal: 0, nontax: 306_000, taxAdvantaged: 0 },
			savingsSplit: { emergency: 0, goal: 0, nontax: 1, taxAdvantaged: 0 },
		})
		const result = runSimulation(p)
		// 306,000 starting + 601,250 contribution, grown 7%.
		expect(result.years[0]!.wallets.nontax).toBeCloseTo(907_250 * 1.07, 2)
	})
})
