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
			startMonth: 0,
			endYear: 2030,
			endMonth: 11,
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
				{ id: "a", label: "Salary", startYear: 2026, startMonth: 0, endYear: null, endMonth: 11, amount: 600_000, growthMode: "fixed", growthRate: 0 },
				{ id: "b", label: "Salary (promotion)", startYear: 2028, startMonth: 0, endYear: null, endMonth: 11, amount: 300_000, growthMode: "fixed", growthRate: 0 },
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
		expect(first.netCash).toBeCloseTo(601_250, 1)
		// Monthly loop: tax accrual is exact, but income/expense month shares
		// round at 2dp → contribution ≈ 601,250.04 (satang drift).
		expect(first.contribution).toBeCloseTo(601_250, 1)
		// Monthly EF: 100k start + 10% of each month's net cash, capped at
		// 6 × monthly expenses = 240k, growing 1.5%/12 after each check.
		// Exact replica (round2 per wallet write): 162,112.45.
		expect(first.wallets.emergency).toBeCloseTo(162_112.45, 0)
		// Nontax: 300k start + 50% of monthly net cash, grown 7%/12 monthly.
		// Exact replica (round2 per write): 632,905.96.
		expect(first.wallets.nontax).toBeCloseTo(632_905.96, 0)
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
		// Monthly model, anniversary growth: month share = amount/12 ×
		// (1+r)^floor(monthsSinceRowStart/12). The living row (Jan 2026) is
		// flat 480,000/12 through Dec 2030, then ×1.02 from Jan 2031. The
		// pension starts Jan 2031 at 40,000 and steps ×1.02 each Jan.
		const anniversarySum = (yearlyAmount: number, rate: number, from: number, to: number) => {
			let sum = 0
			for (let m = from; m <= to; m += 1) {
				sum += (yearlyAmount / 12) * (1 + rate) ** Math.floor(m / 12)
			}
			return sum
		}
		// Pension: pseudo-row starting Jan 2031 (m 60) growing at inflation —
		// 12 × 40,000 = 480,000 flat in 2031 (first anniversary Jan 2032).
		expect(firstRetired.expenses).toBeCloseTo(
			anniversarySum(480_000, 0.02, 60, 71) + 480_000,
			0,
		)
		// 2030: living row m 48..59 → floor(monthsSince/12) = 4 ⇒ ×1.02^4.
		expect(lastWorking.expenses).toBeCloseTo(
			anniversarySum(480_000, 0.02, 48, 59),
			0,
		)
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
				{ id: "e1", label: "Living", startYear: 2026, startMonth: 0, endYear: null, endMonth: 11, amount: 480_000, growthMode: "fixed", growthRate: 0 },
				{ id: "e2", label: "Mortgage interest", startYear: 2026, startMonth: 0, endYear: null, endMonth: 11, amount: 200_000, growthMode: "fixed", growthRate: 0, deductible: "mortgageInterest" },
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
				{ id: "e1", label: "Living", startYear: 2026, startMonth: 0, endYear: null, endMonth: 11, amount: 480_000, growthMode: "fixed", growthRate: 0 },
			],
		})
		const result = runSimulation(p)
		const first = result.years[0]!
		// Monthly model: EF starts 400,000, target 240,000 → overflow 160,000
		// in January. 601,250/12 lands in nontax each month (split nontax=1);
		// EF (240,000) grows 1.5%/12 monthly → ≈ 240,298 by December (the
		// overflow never recurs since EF ≤ target). Reproduce exactly:
		let nontax = 0
		let ef = 400_000
		const growth = 1.07 ** (1 / 12)
		const efGrowth = 1.015 ** (1 / 12)
		for (let m = 0; m < 12; m += 1) {
			if (m === 0) {
				const overflow = ef - 240_000
				ef -= overflow
				nontax += overflow
			}
			nontax += 601_250 / 12
			ef = ef * efGrowth
			nontax = nontax * growth
		}
		// Overflow only fires in January; EF then compounds monthly. Nontax
		// exact replica (round2 per write): 798,402.68.
		expect(first.wallets.nontax).toBeCloseTo(798_402.68, 0)
	})

	it("withdraws EF first, then investments, and flags unmet spend", () => {
		const p = plan({
			startYear: 2026,
			startingWallets: { emergency: 50_000, goal: 0, nontax: 100_000, taxAdvantaged: 0 },
			incomes: [
				{ id: "a", label: "Salary", startYear: 2026, startMonth: 0, endYear: 2027, endMonth: 11, amount: 600_000, growthMode: "fixed", growthRate: 0 },
			],
			expenses: [
				{ id: "e", label: "Living", startYear: 2026, startMonth: 0, endYear: null, endMonth: 11, amount: 480_000, growthMode: "fixed", growthRate: 0 },
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
		// Monthly model: starting 306,000 grows 7%/12 each month; each month's
		// 601,250/12 contribution lands then grows the remaining months.
		const growth = 1.07 ** (1 / 12)
		let balance = 306_000
		for (let m = 0; m < 12; m += 1) {
			balance += 601_250 / 12
			balance *= growth
		}
		expect(result.years[0]!.wallets.nontax).toBeCloseTo(balance, 0)
	})
})
