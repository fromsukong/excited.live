/**
 * Monte Carlo tests (US-110). Expected values are derived from engine
 * properties, not copied from output:
 *   - volatility 0 ⇒ every trial identical to the deterministic run, so
 *     P10 = P50 = P90 = runSimulation's net worth exactly.
 *   - volatility > 0 ⇒ P10 ≤ P50 ≤ P90 and the band widens with horizon.
 *   - the per-year rate hook (rateForYear) is deterministic given the hook,
 *     lets a bad market year bite, and is resolved once per projected year.
 */
import { describe, expect, it } from "vitest"
import { defaultPlanInput, runSimulation, percentile } from "./index"
import {
	defaultMonteCarloConfig,
	runMonteCarlo,
	simulateMarketPath,
} from "./monte-carlo"

function plan(overrides: Partial<ReturnType<typeof defaultPlanInput>> = {}) {
	return { ...defaultPlanInput(new Date("2026-01-15")), ...overrides }
}

describe("percentile", () => {
	it("interpolates percentiles linearly (Excel PERCENTILE.INC)", () => {
		const sorted = [1, 2, 3, 4]
		expect(percentile(sorted, 0)).toBe(1)
		expect(percentile(sorted, 0.5)).toBe(2.5)
		expect(percentile(sorted, 1)).toBe(4)
		expect(percentile([], 0.5)).toBe(0)
	})
})

describe("runMonteCarlo", () => {
	it("is deterministic for a fixed seed", () => {
		const p = plan()
		const a = runMonteCarlo(p, { seed: 42 })
		const b = runMonteCarlo(p, { seed: 42 })
		expect(JSON.stringify(a)).toBe(JSON.stringify(b))
	})

	it("with zero volatility reproduces the deterministic projection exactly", () => {
		const p = plan()
		const det = runSimulation(p)
		const mc = runMonteCarlo(p, { trials: 5, volatility: 0, seed: 7 })
		expect(mc.years).toHaveLength(det.years.length)
		mc.years.forEach((year, index) => {
			// Identical inputs ⇒ identical percentile components (2dp-rounded).
			const expected = det.years[index]
			expect(year.netWorth.p10).toBe(year.netWorth.p50)
			expect(year.netWorth.p50).toBe(year.netWorth.p90)
			expect(year.netWorth.p50).toBe(expected?.netWorth)
			// Net cash is return-independent in the MVP engine ⇒ no band.
			expect(year.cashFlow).toBeNull()
		})
	})

	it("orders bands P10 ≤ P50 ≤ P90 and widens with the horizon", () => {
		const p = plan({ horizonYears: 40 })
		const mc = runMonteCarlo(p, { seed: 11 })
		for (const year of mc.years) {
			expect(year.netWorth.p10).toBeLessThanOrEqual(year.netWorth.p50)
			expect(year.netWorth.p50).toBeLessThanOrEqual(year.netWorth.p90)
		}
		const spreadAt = (index: number) =>
			(mc.years[index]?.netWorth.p90 ?? 0) - (mc.years[index]?.netWorth.p10 ?? 0)
		// Compounded noise ⇒ later years spread wider than early ones.
		expect(spreadAt(mc.years.length - 1)).toBeGreaterThan(spreadAt(2))
	})

	it("reports survival stats on the worst-case plan", () => {
		// Structural deficit: spending far above income with no savings —
		// every trial must run out, regardless of market returns.
		const p = plan()
		const income = p.incomes[0]
		const expense = p.expenses[0]
		if (!income || !expense) throw new Error("default plan needs income/expense rows")
		p.incomes = [
			{
				...income,
				amount: 120_000,
				startYear: 2026,
				endYear: 2030,
				endMonth: 11,
			},
		]
		p.expenses = [
			{
				...expense,
				amount: 600_000,
				startYear: 2026,
				endYear: null,
			},
		]
		p.startingWallets = { emergency: 0, goal: 0, nontax: 0, taxAdvantaged: 0 }
		const mc = runMonteCarlo(p, { seed: 3 })
		expect(mc.survivalRate).toBe(0)
		expect(mc.unmetYearP100).not.toBeNull()
		expect(mc.years.length).toBe(p.horizonYears)
	})

	it("defaults match the shared config", () => {
		const mc = runMonteCarlo(plan(), {})
		expect(mc.trials).toBe(defaultMonteCarloConfig.trials)
		expect(mc.volatility).toBe(defaultMonteCarloConfig.volatility)
	})

	it("is deterministic without a config (same plan ⇒ same bands)", () => {
		// Review follow-up (US-110): the config-less path used Math.random,
		// which broke the "same plan ⇒ same band" acceptance criterion.
		const p = plan()
		const a = runMonteCarlo(p)
		const b = runMonteCarlo(p)
		expect(a.years).toEqual(b.years)
		expect(a.survivalRate).toBe(b.survivalRate)
		expect(a.unmetYearP100).toBe(b.unmetYearP100)
		// And it replays the shared default seed.
		const seeded = runMonteCarlo(p, { seed: defaultMonteCarloConfig.seed })
		expect(a.years).toEqual(seeded.years)
	})
})

describe("rateForYear hook (runSimulation options)", () => {
	it("is resolved once per projected year with ascending years", () => {
		const p = plan({ horizonYears: 3 })
		const seen: number[] = []
		runSimulation(p, {
			rateForYear: (year) => {
				seen.push(year)
				return { emergency: 0, goal: 0, nontax: 0, taxAdvantaged: 0 }
			},
		})
		expect(seen).toEqual([2026, 2027, 2028])
	})

	it("with plan rates reproduces the fixed-rate run bit-for-bit", () => {
		const p = plan()
		const rates = () => ({ ...p.walletRates })
		const det = runSimulation(p)
		const hooked = runSimulation(p, { rateForYear: rates })
		expect(hooked.years.map((y) => y.netWorth)).toEqual(
			det.years.map((y) => y.netWorth),
		)
	})

	it("lets a bad market year bite and a good one boost", () => {
		const p = plan({ horizonYears: 10 })
		const baseline = runSimulation(p)
		const withCrash = runSimulation(p, {
			rateForYear: (year) => ({
				...p.walletRates,
				nontax: year === 2027 ? -0.5 : p.walletRates.nontax,
				taxAdvantaged: year === 2027 ? -0.5 : p.walletRates.taxAdvantaged,
			}),
		})
		const withBoom = runSimulation(p, {
			rateForYear: (year) => ({
				...p.walletRates,
				nontax: year === 2027 ? 0.5 : p.walletRates.nontax,
				taxAdvantaged: year === 2027 ? 0.5 : p.walletRates.taxAdvantaged,
			}),
		})
		const crashYearIndex = 2027 - p.startYear
		const crashWith = withCrash.years[crashYearIndex]
		const crashBase = baseline.years[crashYearIndex]
		const lastWith = withCrash.years[withCrash.years.length - 1]
		const lastBase = baseline.years[baseline.years.length - 1]
		if (!crashWith || !crashBase || !lastWith || !lastBase) {
			throw new Error("projection must cover the horizon")
		}
		expect(crashWith.netWorth).toBeLessThan(crashBase.netWorth)
		expect(withBoom.years[crashYearIndex]?.netWorth).toBeGreaterThan(
			crashBase.netWorth,
		)
		// Later years inherit the divergence through compounding.
		expect(lastWith.netWorth).toBeLessThan(lastBase.netWorth)
		expect(withBoom.years[withBoom.years.length - 1]?.netWorth).toBeGreaterThan(
			lastBase.netWorth,
		)
	})
})

describe("simulateMarketPath", () => {
	it("keeps cash-like wallets at plan rates and adds exactly vol × z", () => {
		const p = plan()
		// Controlled PRNG: u1 = e^(-1/2), u2 = 0 ⇒ Box-Muller z = 1 exactly
		// (sqrt(-2·ln e^-0.5) = 1, cos(0) = 1), for each investment wallet.
		const values = [Math.exp(-0.5), 0]
		let i = 0
		const next = () => values[i++ % 2] ?? 0
		const path = simulateMarketPath(p, { trials: 2, volatility: 0.18 }, next)
		const year = path(2027)
		expect(year.emergency).toBe(p.walletRates.emergency)
		expect(year.goal).toBe(p.walletRates.goal)
		expect(year.nontax).toBeCloseTo(p.walletRates.nontax + 0.18, 12)
		expect(year.taxAdvantaged).toBeCloseTo(
			p.walletRates.taxAdvantaged + 0.18 * 0.9,
			12,
		)
	})

	it("clamps sampled returns into [-0.75, 1]", () => {
		const p = plan()
		const values = [Math.exp(-0.5), 0]
		let i = 0
		const next = () => values[i++ % 2] ?? 0
		// clampRate01 caps volatility at 1 first ⇒ raw sample = 1·1 + 0.07 = 1.07
		// ⇒ clamped to 1. (The −0.75 floor is exercised by tail draws, not here.)
		const clamped = simulateMarketPath(p, { trials: 2, volatility: 5 }, next)
		expect(clamped(2026).nontax).toBe(1)
	})
})
