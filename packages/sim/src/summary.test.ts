/**
 * Summary-module tests — expected numbers hand-computed.
 * Default plan: salary 1.2M until 2055, living 480k (inflation), retirement
 * 2055 at 40k/month today-money, EF 6 months, starting wallets 100k/0/300k/0.
 */
import { describe, expect, it } from "vitest"
import {
	compareFundPaths,
	defaultPlanInput,
	goalChecks,
	maxForeverMonthlySpend,
	retirementVerdict,
	runSimulation,
} from "./index"

function plan(overrides: Partial<ReturnType<typeof defaultPlanInput>> = {}) {
	return { ...defaultPlanInput(new Date("2026-01-15")), ...overrides }
}

describe("summary", () => {
	it("flags the unmet year and remaining balance for retirement (US-010)", () => {
		const p = plan()
		const result = runSimulation(p)
		const verdict = retirementVerdict(p, result)
		expect(verdict.retirementYear).toBe(2055)
		// Money never runs out within the horizon in the default plan.
		expect(verdict.funded).toBe(true)
		expect(verdict.unmetYear).toBeNull()
		expect(result.unmetYear).toBeNull()
		expect(verdict.endYear).toBe(2075)
		expect(verdict.remainingAtEnd).toBeGreaterThan(0)
	})

	it("detects a retirement that runs out of money", () => {
		const p = plan({
			retirementMonthlyToday: 400_000, // 4.8M/yr at 60: far beyond what the plan supports
			horizonYears: 60,
		})
		const result = runSimulation(p)
		const verdict = retirementVerdict(p, result)
		expect(verdict.funded).toBe(false)
		expect(verdict.unmetYear).not.toBeNull()
		expect(result.unmetYear).toBe(verdict.unmetYear)
	})

	it("finds the max forever spend between the working and broken cases", () => {
		const p = plan()
		const max = maxForeverMonthlySpend(p)
		// Sanity brackets from the two cases above: 40k/month works,
		// 200k/month breaks. The bisection result must sit between them.
		expect(max).toBeGreaterThan(40_000)
		expect(max).toBeLessThan(200_000)
		// The result itself must be funded when re-run (bisection invariant).
		const probe = runSimulation({ ...p, retirementMonthlyToday: max })
		expect(probe.unmetYear).toBeNull()
	})

	it("checks goals against the funding wallet balance (US-009 1d)", () => {
		const p = plan({
			goals: [
				{ id: "g1", label: "House", amountToday: 1_000_000, targetYear: 2031, wallet: "nontax" },
				{ id: "g2", label: "Unreachable", amountToday: 999_999_999, targetYear: 2031, wallet: "nontax" },
			],
		})
		const result = runSimulation(p)
		const checks = goalChecks(p, result)
		expect(checks).toHaveLength(2)
		expect(checks[0]?.targetAtYear).toBeCloseTo(1_000_000 * 1.02 ** 5, 2)
		expect(checks[0]?.onTrack).toBe(true)
		expect(checks[1]?.onTrack).toBe(false)
		expect(checks[1]?.shortBy).toBeGreaterThan(0)
	})

	it("compares ThaiESG/RMF vs taxable S&P paths with tax saving reinvested (FR-6)", () => {
		const p = plan()
		const result = runSimulation(p)
		const compare = compareFundPaths(p, result, 100_000, 0.005)
		// Contributions while income is positive: 30 × 100k. The per-year
		// table keeps growing after contributions stop so the gap stays visible.
		expect(compare.contributed).toBe(3_000_000)
		expect(compare.years).toHaveLength(50)
		expect(compare.years[29]?.contribution).toBe(100_000)
		expect(compare.years[30]?.contribution).toBe(0)
		expect(compare.fundValue).toBeGreaterThan(0)
		expect(compare.taxableValue).toBeGreaterThan(0)
		// Hand-check year 1: (0 + 100k + 100k×0.25) × 1.07 = 133,750.
		expect(compare.years[0]?.taxSaved).toBe(25_000)
		expect(compare.years[0]?.fundBalance).toBeCloseTo(133_750, 2)
		// Fund path (tax saving reinvested, no drag) must beat taxable here.
		expect(compare.gap).toBeGreaterThan(0)
	})
})
