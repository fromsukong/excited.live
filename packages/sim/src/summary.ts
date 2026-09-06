/**
 * Summary helpers — the math behind the webapp's 2-section Summary (US-009)
 * and the retirement checker (US-010), ported from the sheet's Summary tab.
 *
 * PURE: consumes @excited-live/sim results + plan input, returns plain data.
 * No network, no DOM, no framework.
 */

import {
	type GoalRow,
	type PlanInput,
	type SimulationResult,
	type WalletId,
	runSimulation,
} from "./index"

/** US-009 1a — first year wallets could not cover spending (null = never). */
export function moneyRunsOutYear(result: SimulationResult): number | null {
	return result.unmetYear
}

/**
 * US-010 — retirement verdict at the plan's retirement year: is the pension
 * fully funded through the horizon? The pension drains wallets, so the check
 * is "no unmet year after retirement starts" + money left at the end.
 */
export interface RetirementVerdict {
	retirementYear: number
	/** True when no unmet year occurs from retirement onward. */
	funded: boolean
	/** First unmet year at/after retirement (null = none). */
	unmetYear: number | null
	/** Total wallet balance in the final projected year, THB. */
	remainingAtEnd: number
	/** Last projected year. */
	endYear: number
}

export function retirementVerdict(
	plan: PlanInput,
	result: SimulationResult,
): RetirementVerdict {
	const retirementYear = plan.retirementYear ?? plan.startYear
	const firstUnmetAfter = result.years.find(
		(entry) => entry.unmet && entry.year >= retirementYear,
	)
	const last = result.years[result.years.length - 1]
	return {
		retirementYear,
		funded: firstUnmetAfter === undefined,
		unmetYear: firstUnmetAfter?.year ?? null,
		remainingAtEnd: last?.netWorth ?? 0,
		endYear: result.endYear,
	}
}

/**
 * US-009 1c — max monthly retirement spend sustainable forever (within the
 * projected horizon). Bisection on `retirementMonthlyToday`: re-run the
 * simulation until the lowest spend that never triggers an unmet year.
 * Pure and cheap: the engine has no side effects.
 */
export function maxForeverMonthlySpend(plan: PlanInput): number {
	const base = Math.max(0, plan.retirementMonthlyToday)
	let lo = 0 // always funded (zero spend)
	let hi = Math.max(base * 4, 1_000) // raise until it breaks
	for (let i = 0; i < 40; i += 1) {
		const mid = (lo + hi) / 2
		const probe = runSimulation({ ...plan, retirementMonthlyToday: mid })
		if (probe.unmetYear === null) {
			lo = mid
		} else {
			hi = mid
		}
	}
	return Math.floor(lo / 100) * 100 // round down to 100 THB
}

/**
 * US-009 1d — goal checks: inflate the target to the goal year, compare with
 * the funding wallet balance that year. Verdict = on track / short ฿Z.
 */
export interface GoalCheck {
	goal: GoalRow
	/** Wallet balance of the funding wallet in the target year, THB. */
	balanceAtYear: number
	/** Inflated target (today's money → target year), THB. */
	targetAtYear: number
	/** True when balance covers the target. */
	onTrack: boolean
	/** How much is missing (0 when on track), THB. */
	shortBy: number
}

export function goalChecks(
	plan: PlanInput,
	result: SimulationResult,
): GoalCheck[] {
	return plan.goals.map((goal) => {
		const yearEntry = result.years.find((entry) => entry.year === goal.targetYear)
		const yearsOut = Math.max(0, goal.targetYear - plan.startYear)
		const targetAtYear =
			goal.amountToday *
			Math.pow(1 + Math.max(0, plan.inflation), yearsOut)
		const balanceAtYear =
			yearEntry === undefined
				? 0 // target year beyond the horizon — cannot be checked
				: Math.max(0, yearEntry.wallets[goal.wallet as WalletId])
		const shortBy = Math.max(0, targetAtYear - balanceAtYear)
		return {
			goal,
			balanceAtYear,
			targetAtYear,
			onTrack: shortBy <= 0,
			shortBy,
		}
	})
}

/**
 * FR-6 / US-007 — real-return compare: ฿C contributed each year into
 * ThaiESG/RMF (tax-free redemption, MVP assumption) vs the same gross cost
 * put into taxable S&P 500. Fairness: the tax saved by contributing is
 * reinvested on the fund path (it is the extra money the taxman would have
 * taken otherwise), while the S&P path pays that tax and invests the rest.
 *
 * Contribution schedule: the recommended optimizer amount every year from
 * startYear until income ends (or the horizon ends). Returns are the plan's
 * tax-advantaged wallet rate (fund) vs nontax wallet rate (S&P) with an
 * annual tax drag (default 0.5% of balance) on the taxable path.
 */
export interface PathCompare {
	/** Total contributed (gross of tax saving) across the schedule, THB. */
	contributed: number
	/** Total tax saved across the schedule (reinvested on the fund path). */
	taxSaved: number
	/** Fund path value at the end of the horizon, THB. */
	fundValue: number
	/** Taxable S&P path value at the end of the horizon, THB. */
	taxableValue: number
	/** fundValue − taxableValue (can be negative when horizons are long). */
	gap: number
	/** Per-year detail for the expandable table. */
	years: {
		year: number
		contribution: number
		taxSaved: number
		fundBalance: number
		taxableBalance: number
	}[]
}

export function compareFundPaths(
	plan: PlanInput,
	result: SimulationResult,
	recommendedYearly: number,
	taxDragRate = 0.005,
): PathCompare {
	const fundRate = Math.max(0, plan.walletRates.taxAdvantaged)
	const spRate = Math.max(0, plan.walletRates.nontax)
	const lastIncomeYear = plan.incomes.reduce<number | null>(
		(latest, row) =>
			latest === null || (row.endYear !== null && row.endYear > latest)
				? row.endYear
				: latest,
		null,
	)

	let fund = 0
	let taxable = 0
	let contributed = 0
	let taxSavedTotal = 0
	const years: PathCompare["years"] = []

	for (const entry of result.years) {
		const active =
			entry.income > 0 &&
			entry.year >= plan.startYear &&
			(lastIncomeYear === null || entry.year <= lastIncomeYear)
		const contribution = active ? Math.max(0, recommendedYearly) : 0
		if (contribution > 0 || fund > 0 || taxable > 0) {
			// Tax saved: marginal-rate × contribution (engine rounding ignored;
			// the optimizer already reports the exact first-year number).
			const marginal = entry.taxResult.marginalRate
			const taxSaved = contribution * marginal
			fund = (fund + contribution + taxSaved) * (1 + fundRate)
			// S&P path: same gross cost leaves the wallet, grows with drag.
			taxable = (taxable + contribution) * (1 + spRate - taxDragRate)
			contributed += contribution
			taxSavedTotal += taxSaved
			years.push({
				year: entry.year,
				contribution,
				taxSaved,
				fundBalance: fund,
				taxableBalance: taxable,
			})
		}
	}

	return {
		contributed,
		taxSaved: taxSavedTotal,
		fundValue: fund,
		taxableValue: taxable,
		gap: fund - taxable,
		years,
	}
}
