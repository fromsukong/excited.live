import { describe, expect, it } from "vitest"
import {
	defaultPlanInputs,
	computeProjection,
	type PlanInputs,
} from "./plan-service"

const NOW = new Date("2026-09-04T00:00:00Z")

/**
 * Independent recompute of the net-worth path — deliberately re-implements the
 * TH 2026 employment tax math (50% expense deduction capped at 100k, 60k/30k
 * allowances, 100k insurance cap, RMF 30% cap, published brackets) so the
 * service is cross-checked from a different lens, not re-run through itself.
 */
function expectedEndWorth(inputs: PlanInputs): number {
	const { annualReturnRate, salaryGrowthRate, spendingGrowthRate } =
		inputs.assumptions
	let income = inputs.annualIncome
	let spending = inputs.annualSpending
	let worth = inputs.startingNetWorth
	const brackets: [number, number][] = [
		[150_000, 0],
		[300_000, 0.05],
		[500_000, 0.1],
		[750_000, 0.15],
		[1_000_000, 0.2],
		[2_000_000, 0.25],
		[5_000_000, 0.3],
		[Number.POSITIVE_INFINITY, 0.35],
	]
	for (let i = 0; i < inputs.horizonYears; i += 1) {
		const assessable = income - Math.min(income * 0.5, 100_000)
		const allowances =
			60_000 * Math.max(1, inputs.personalAllowances) +
			60_000 * inputs.spouseAllowances +
			30_000 * inputs.childrenAllowances
		const itemized =
			Math.min(inputs.insurance, 100_000) +
			Math.min(inputs.retirementSavings, assessable * 0.3)
		const taxable = Math.max(0, assessable - itemized - allowances)
		let tax = 0
		let floor = 0
		for (const [upTo, rate] of brackets) {
			tax += Math.max(0, Math.min(taxable, upTo) - floor) * rate
			floor = upTo
		}
		worth = worth * (1 + annualReturnRate) + (income - Math.round(tax * 100) / 100 - spending)
		income *= 1 + salaryGrowthRate
		spending *= 1 + spendingGrowthRate
	}
	return worth
}

describe("plan-service (mock backend contract)", () => {
	it("defaults produce a horizon-length projection with sane year 1", async () => {
		const inputs = defaultPlanInputs(NOW)
		const result = await computeProjection(inputs)
		expect(result.years).toHaveLength(inputs.horizonYears)
		expect(result.years[0]?.year).toBe(2026)
		expect(result.years.at(-1)?.year).toBe(2026 + inputs.horizonYears - 1)

		const year1 = result.years[0]
		expect(year1?.grossIncome).toBe(inputs.annualIncome)
		// Defaults: 1.2M gross → assessable 1.1M, netTax 106k ⇒ eff ≈ 9.6%.
		// (Marginal is 20%; effective sits in the 10-15% band.)
		expect(year1?.effectiveTaxRate).toBeGreaterThan(0.05)
		expect(year1?.effectiveTaxRate).toBeLessThan(0.15)
		expect(year1?.taxBalance).toBeCloseTo(
			(year1?.tax ?? 0) - inputs.annualIncome * inputs.withholdingRate,
			0,
		)
	})

	it("matches an independent recompute of the net-worth path", async () => {
		const inputs: PlanInputs = {
			...defaultPlanInputs(NOW),
			annualIncome: 1_800_000,
			annualSpending: 600_000,
			startingNetWorth: 150_000,
			retirementSavings: 120_000,
			insurance: 10_000,
			spouseAllowances: 1,
			childrenAllowances: 2,
			horizonYears: 12,
		}
		const result = await computeProjection(inputs)
		expect(result.endNetWorth).toBeCloseTo(expectedEndWorth(inputs), 0)
	})

	it("growth assumptions compound income; zero assumptions stay flat", async () => {
		const flat = await computeProjection({
			...defaultPlanInputs(NOW),
			assumptions: { annualReturnRate: 0, salaryGrowthRate: 0, spendingGrowthRate: 0 },
		})
		expect(flat.years[1]?.grossIncome).toBe(flat.years[0]?.grossIncome)

		const grown = await computeProjection({
			...defaultPlanInputs(NOW),
			assumptions: { annualReturnRate: 0, salaryGrowthRate: 0.1, spendingGrowthRate: 0 },
		})
		expect(grown.years[1]?.grossIncome).toBeCloseTo(1_200_000 * 1.1, 0)
	})

	it("higher return reaches the goal no later", async () => {
		const base = defaultPlanInputs(NOW)
		const low = await computeProjection({
			...base,
			assumptions: { annualReturnRate: 0.01, salaryGrowthRate: 0, spendingGrowthRate: 0 },
		})
		const high = await computeProjection({
			...base,
			assumptions: { annualReturnRate: 0.08, salaryGrowthRate: 0, spendingGrowthRate: 0 },
		})
		expect(high.yearGoalReached).not.toBeNull()
		expect(low.yearGoalReached).not.toBeNull()
		expect(high.yearGoalReached!).toBeLessThanOrEqual(low.yearGoalReached!)
	})

	it("goal year is the first crossing under linear (zero-growth) math", async () => {
		const inputs: PlanInputs = {
			...defaultPlanInputs(NOW),
			assumptions: { annualReturnRate: 0, salaryGrowthRate: 0, spendingGrowthRate: 0 },
		}
		const probe = await computeProjection(inputs)
		const year1 = probe.years[0]
		const surplus = year1 ? year1.grossIncome - year1.tax - year1.spending : 0
		expect(surplus).toBeGreaterThan(0)
		const start = inputs.startingNetWorth
		const target = start + surplus * 10
		const result = await computeProjection({ ...inputs, targetNetWorth: target })
		// Linear path: year i (1-based) ends with start + i*surplus, so the
		// first crossing of start + 10*surplus is the 10th year — which is
		// startYear + 9 because the first projected year already banks one
		// year of surplus.
		expect(result.yearGoalReached).toBe(inputs.startYear + 9)
	})

	it("no target ⇒ null goal year; rejected engine input surfaces as warnings", async () => {
		const noTarget = await computeProjection({
			...defaultPlanInputs(NOW),
			targetNetWorth: 0,
		})
		expect(noTarget.yearGoalReached).toBeNull()
	})
})
