/**
 * Monte Carlo market simulation (US-110) — P10/P50/P90 projection bands.
 *
 * Instead of compounding one fixed wallet rate (deterministic run), each
 * trial re-samples the investment wallets' yearly returns from a normal
 * distribution around the plan's own rates, then runs the full engine with
 * `rateForYear`. Investment wallets only (nontax + taxAdvantaged); the
 * emergency fund and goal savings are cash-like and keep their plan rates.
 *
 * PURE: no network, no DOM, no framework. Deterministic for a given seed,
 * so the UI shows the same bands across re-renders and SSR/client match.
 */
import {
	runSimulation,
	type PlanInput,
	type WalletId,
} from "./index"

/** P10/P50/P90 band for one metric in one projected year (THB). */
export interface MonteCarloBand {
	p10: number
	p50: number
	p90: number
}

/**
 * Banded projection for one year. Only net worth carries market risk in the
 * MVP engine (net cash = income − tax − spending, independent of wallet
 * returns), so `cashFlow` is null: the UI advertises the band for the
 * net-worth metric only instead of drawing a vacuous zero-width band.
 */
export interface MonteCarloYear {
	year: number
	netWorth: MonteCarloBand
	/** Null in the MVP engine — see above (US-110 review follow-up). */
	cashFlow: MonteCarloBand | null
}

/** Aggregate result of a Monte Carlo run over the plan horizon. */
export interface MonteCarloResult {
	/** Trials actually run (>= 2). */
	trials: number
	/** Yearly volatility used for investment wallets, 0..1. */
	volatility: number
	/** One band entry per projected year, aligned with SimulationResult.years. */
	years: MonteCarloYear[]
	/** First year ANY trial ran out of money (worst case), or null. */
	unmetYearP100: number | null
	/** Share of trials that never ran out of money, 0..1. */
	survivalRate: number
	/** Median (P50) net worth in the final projected year, THB. */
	medianFinalNetWorth: number
}

/** Default trial count — enough for stable P10/P90, cheap enough for live UI. */
const DEFAULT_TRIALS = 200

/** Default seed — any fixed value works; the same plan always re-plays it. */
const DEFAULT_SEED = 20260908

/** Long-run yearly volatility of the investment wallets (S&P-like, 0..1). */
const DEFAULT_VOLATILITY = 0.18

/** What fraction of `volatility` applies to the ThaiESG/RMF wallet. */
const TAX_ADVANTAGED_VOL_FACTOR = 0.9

export interface MonteCarloConfig {
	/** Number of simulated lifetimes (>= 2 so percentiles exist). */
	trials: number
	/** Yearly standard deviation of investment returns, 0..1. */
	volatility: number
	/**
	 * Deterministic seed. Same seed + same plan = same bands (required for
	 * SSR-safe rendering and tests). Omitted seeds fall back to
	 * `DEFAULT_SEED` — runs are always reproducible.
	 */
	seed?: number
}

export const defaultMonteCarloConfig: MonteCarloConfig = {
	trials: DEFAULT_TRIALS,
	volatility: DEFAULT_VOLATILITY,
	seed: 20260908,
}

/**
 * Small, fast, seedable PRNG (mulberry32). Not cryptographic — just a
 * stable, well-mixed uniform source for simulation.
 */
function mulberry32(seed: number): () => number {
	let a = Math.floor(seed) >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** Box-Muller: two uniforms → one standard-normal draw. */
function standardNormal(next: () => number): number {
	const u1 = next()
	const u2 = next()
	// Guard against log(0).
	const a = u1 <= 0 ? Number.MIN_VALUE : u1
	return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u2)
}

/** Clamp a sampled yearly return into the engine's accepted range. */
function clampReturn(value: number): number {
	if (!Number.isFinite(value)) return 0
	return Math.min(Math.max(value, -0.75), 1)
}

/** 2dp rounding, matching the engine's money rounding. */
function round2(value: number): number {
	return Math.round(value * 100) / 100
}

/**
 * One sampled market path: investment wallets get normal(yearRate, vol),
 * cash-like wallets keep their plan rate every year.
 */
export function simulateMarketPath(
	plan: PlanInput,
	config: MonteCarloConfig,
	next: () => number,
): (year: number) => Record<WalletId, number> {
	const volNontax = clampRate01(config.volatility)
	const volTaxAdvantaged = volNontax * TAX_ADVANTAGED_VOL_FACTOR
	// Draw-independent: each call samples a fresh year (i.i.d. returns), and
	// the zero-arg shape still satisfies runSimulation's rateForYear hook.
	return () => ({
		emergency: plan.walletRates.emergency ?? 0,
		goal: plan.walletRates.goal ?? 0,
		nontax: clampReturn(
			(plan.walletRates.nontax ?? 0) + volNontax * standardNormal(next),
		),
		taxAdvantaged: clampReturn(
			(plan.walletRates.taxAdvantaged ?? 0) +
				volTaxAdvantaged * standardNormal(next),
		),
	})
}

function clampRate01(value: number): number {
	if (!Number.isFinite(value)) return 0
	return Math.min(Math.max(value, 0), 1)
}

/** Nearest-rank percentile of an ascending-sorted numeric array (0..1). */
export function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const rank = p * (sorted.length - 1)
	const low = Math.floor(rank)
	const high = Math.ceil(rank)
	if (low === high) return sorted[low] ?? 0
	const weight = rank - low
	// Round at band edges so P10 ≤ P50 ≤ P90 survives float interpolation
	// (e.g. 830240.8799999999 vs 830240.88 across percentile points).
	return round2((sorted[low] ?? 0) * (1 - weight) + (sorted[high] ?? 0) * weight)
}

/**
 * Run the plan across `trials` sampled market paths and roll the results
 * into P10/P50/P90 net-worth bands per projected year, plus survival stats
 * (share of trials that never run out, worst-case first unmet year).
 *
 * Deterministic by default: an omitted seed falls back to
 * `DEFAULT_SEED`, so the same plan always yields the same bands (SSR-safe,
 * reload-stable). Pass a different seed for an independent sample.
 */
export function runMonteCarlo(
	plan: PlanInput,
	config: Partial<MonteCarloConfig> = {},
): MonteCarloResult {
	const trials = Math.max(2, Math.floor(config.trials ?? DEFAULT_TRIALS))
	const volatility = clampRate01(config.volatility ?? DEFAULT_VOLATILITY)
	const seed = Math.floor(config.seed ?? DEFAULT_SEED)
	const fullConfig: MonteCarloConfig = { trials, volatility, seed }
	const next = mulberry32(seed)

	// Per-trial final-year net worth, for the unmet-year scan and summary.
	const firstUnmet: number[] = []
	const netWorthByYear: number[][] = []

	for (let trial = 0; trial < trials; trial += 1) {
		const rateForYear = simulateMarketPath(plan, fullConfig, next)
		const result = runSimulation(plan, { rateForYear })
		result.years.forEach((entry, index) => {
			netWorthByYear[index] = netWorthByYear[index] ?? []
			netWorthByYear[index].push(entry.netWorth)
		})
		if (result.unmetYear !== null) firstUnmet.push(result.unmetYear)
	}

	// Sanity: every trial shares the plan's horizon, so the columns align.
	const yearCount = netWorthByYear.length
	const years: MonteCarloYear[] = []
	for (let index = 0; index < yearCount; index += 1) {
		const netWorth = [...(netWorthByYear[index] ?? [])].sort((a, b) => a - b)
		years.push({
			year: plan.startYear + index,
			netWorth: {
				p10: percentile(netWorth, 0.1),
				p50: percentile(netWorth, 0.5),
				p90: percentile(netWorth, 0.9),
			},
			// Net cash is return-independent in the MVP engine (income − tax
			// − spending), so a cash-flow band would be zero-width everywhere.
			cashFlow: null,
		})
	}

	firstUnmet.sort((a, b) => a - b)
	const medianNetWorth = years[years.length - 1]?.netWorth.p50 ?? 0

	return {
		trials,
		volatility,
		years,
		/** First year ANY trial ran out of money (P100 worst case). */
		unmetYearP100: firstUnmet[0] ?? null,
		/** Share of trials that never ran out, 0..1. */
		survivalRate: (trials - firstUnmet.length) / trials,
		medianFinalNetWorth: medianNetWorth,
	}
}
