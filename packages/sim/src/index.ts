/**
 * @excited-live/sim — multi-wallet life simulation engine (MVP webapp port).
 *
 * Ports the proven Google-Sheet model 1:1 (docs/prd-mvp.md), keeping the
 * sheet's ordering of steps inside each projected year:
 *
 *   1. Income: sum of active income periods (amount grows per period).
 *   2. Spending: sum of active expense periods (amount grows per period).
 *   3. Tax: TH system from @excited-live/tax on employment income.
 *   4. Net cash: income − tax − spending.
 *   5. Wallets: contribute by savings split % (leftover first), grow each
 *      balance by its wallet rate.
 *   6. Retirement: when the first income period has ended, withdraw for
 *      spending from wallets in EF → goal → non-tax → tax-advantaged order.
 *   7. "Unmet" flags the first year money actually runs out.
 *
 * PURE: no network, no DOM, no framework, no locale/timezone-dependent logic.
 * Money values are THB, rounding matches the tax engine (2dp at boundaries).
 */

import { getTaxSystem, type TaxResult } from "@excited-live/tax"

/** Bilingual label shape shared with @excited-live/tax. */
export interface LocalizedLabel {
	en: string
	th: string
}

/** Stable wallet ids; the tax-advantaged bucket groups SSF+RMF (v1). */
export type WalletId = "emergency" | "goal" | "nontax" | "taxAdvantaged"

export const WALLET_IDS: readonly WalletId[] = [
	"emergency",
	"goal",
	"nontax",
	"taxAdvantaged",
] as const

export interface WalletDef {
	id: WalletId
	label: LocalizedLabel
	/** Short EN/TH explanation shown in the UI footnote. */
	note: LocalizedLabel
	/** Yearly nominal return, 0..1 (editable input, sheet `rate` column). */
	defaultRate: number
	/** Emergency-fund only: target = months × monthly expenses. */
	monthsOfExpenses?: number
}

export const DEFAULT_WALLETS: readonly WalletDef[] = [
	{
		id: "emergency",
		label: { en: "Emergency fund", th: "เงินสำรองฉุกเฉิน" },
		note: {
			en: "Capped at N months of expenses; overflow flows to investments",
			th: "จำกัดที่ N เดือนของค่าใช้จ่าย ส่วนเกินไหลไปลงทุน",
		},
		defaultRate: 0.015,
		monthsOfExpenses: 6,
	},
	{
		id: "goal",
		label: { en: "Goal savings", th: "เงินออมเป้าหมาย" },
		note: {
			en: "House / tuition / car — savings-account interest",
			th: "บ้าน / เทอมเรียน / รถ — ดอกเบี้ยเงินฝาก",
		},
		defaultRate: 0.015,
	},
	{
		id: "nontax",
		label: { en: "Investments (non-tax)", th: "การลงทุน (เงินถูกภาษี)" },
		note: {
			en: "S&P 500 long-run average, editable",
			th: "ค่าเฉลี่ยระยะยาว S&P 500 แก้ได้",
		},
		defaultRate: 0.07,
	},
	{
		id: "taxAdvantaged",
		label: { en: "ThaiESG / RMF", th: "ThaiESG / RMF" },
		note: {
			en: "ThaiESG cap 200k (min 100k year one) · RMF ≤ 30% of income · combined 500k",
			th: "ThaiESG ไม่เกิน 200,000 (ปีแรกขั้นต่ำ 100,000) · RMF ≤ 30% ของรายได้ · รวมกันไม่เกิน 500,000",
		},
		defaultRate: 0.07,
	},
] as const

/**
 * One income or expense line (sheet "Income"/"Expenses" period rows).
 * Active from startYear-startMonth through endYear-endMonth inclusive;
 * endYear null = runs forever.
 */
export interface PeriodRow {
	/** Stable key for React lists; UI-generated (row-1, row-2, …). */
	id: string
	label: string
	/** First calendar year the row applies. */
	startYear: number
	/** First month (0 = Jan … 11 = Dec) of the active window. */
	startMonth: number
	/** Last calendar year, or null for open-ended rows. */
	endYear: number | null
	/** Last month (0 = Jan … 11 = Dec) of the active window (endYear set). */
	endMonth: number
	/** Yearly amount in the FIRST active year, THB. */
	amount: number
	/**
	 * Growth mode (US-001/002): "inflation" follows the global inflation rate
	 * (plan.inflation); "fixed" = 0%; "override" uses `growthRate`.
	 */
	growthMode: "inflation" | "fixed" | "override"
	/** Yearly growth, 0..1 — used only when growthMode = "override". */
	growthRate: number
	/** Expenses only (US-005): feeds the TH tax calc (mortgage interest, …). */
	deductible?: "none" | "mortgageInterest"
}

/** Effective growth rate of a row in a plan (US-003: override wins). */
export function rowGrowthRate(
	row: Pick<PeriodRow, "growthMode" | "growthRate">,
	inflation: number,
): number {
	if (row.growthMode === "fixed") return 0
	if (row.growthMode === "override") return clampRate(row.growthRate)
	return clampRate(inflation)
}

/** A withdrawal event when income no longer covers spending. */
export interface Withdrawal {
	/** Year of the withdrawal. */
	year: number
	/** Amount drawn from wallets this year, THB. */
	amount: number
}

/** One projected year, after all 8 sheet steps. */
export interface SimulationYear {
	year: number
	/** Age of the user in this calendar year (birthYear + year − birthYear). */
	age: number
	income: number
	expenses: number
	/** Tax liability for the year (TH system, before withholding). */
	tax: number
	netCash: number
	/** Amount added to wallets this year (netCash − withdrawal). */
	contribution: number
	/** Amount withdrawn from wallets this year (0 while working). */
	withdrawal: number
	/** End-of-year balances per wallet, THB. */
	wallets: Record<WalletId, number>
	/** Total across wallets. */
	netWorth: number
	/** True when wallets could not cover the full spending this year. */
	unmet: boolean
	/** Tax engine breakdown for the year (also drives the optimizer). */
	taxResult: TaxResult
}

/** One projected month (engine's native granularity). */
export interface SimulationMonth {
	/** Absolute month index from the plan start (0-based). */
	index: number
	year: number
	/** 0 = Jan … 11 = Dec. */
	month: number
	/** Age at the end of this month. */
	age: number
	income: number
	expenses: number
	/** Tax booked this month (annual liability ÷ 12; true liability in month 11). */
	tax: number
	netCash: number
	contribution: number
	withdrawal: number
	wallets: Record<WalletId, number>
	netWorth: number
	unmet: boolean
}

export interface GoalRow {
	/** Stable key for React lists. */
	id: string
	label: string
	/** Target amount in today's money, THB. */
	amountToday: number
	/** Calendar year the money is needed. */
	targetYear: number
	/** Which wallet funds this goal (sheet: goal savings assumed, OQ-3). */
	wallet: Extract<WalletId, "goal" | "nontax" | "taxAdvantaged">
}

export interface PlanInput {
	/** First projected calendar year (e.g. 2026). */
	startYear: number
	/** Calendar year the user was born (for the age row). */
	birthYear: number
	/** Global inflation rate, 0..1 (US-003; default growth for all rows). */
	inflation: number
	/** Income period rows (sheet Income column rows). */
	incomes: PeriodRow[]
	/** Expense period rows (sheet Expenses column rows). */
	expenses: PeriodRow[]
	/** Goal checks (US-009 section 1d): name, target (today's money), year. */
	goals: GoalRow[]
	/**
	 * Desired retirement spending, THB/year in today's money (US-004). From
	 * `retirementYear`, spending = this (inflation-adjusted) + expense rows
	 * still active. Null = no switch; rows continue forever.
	 */
	retirementYear: number | null
	/** THB/year wanted as retirement pension from `retirementYear` (checker). */
	retirementMonthlyToday: number
	/** Share of yearly net cash per wallet; must sum to 1 (± 0.001). */
	savingsSplit: Record<WalletId, number>
	/** Yearly nominal return per wallet, 0..1. */
	walletRates: Record<WalletId, number>
	/** Starting balances per wallet (today, before the projection). */
	startingWallets: Record<WalletId, number>
	/** Emergency fund target in months of expenses. */
	efMonths: number
	/** Personal allowance count for the TH engine (normally 1). */
	personalAllowances: number
	/** Household allowances for the TH engine. */
	spouseAllowances: number
	childrenAllowances: number
	parentsAllowances: number
	/** Health/life insurance premiums, THB/year (engine caps apply). */
	insurance: number
	/** THB already withheld per year (e.g. employer ภ.ง.ด.1). */
	annualWithholding: number
	/** Projection length in years (1..60). */
	horizonYears: number
}

export interface SimulationResult {
	currency: "THB"
	taxSystem: { country: "TH"; taxYear: 2026 }
	startYear: number
	endYear: number
	/** Yearly rollup (aggregates of the monthly loop; one entry per year). */
	years: SimulationYear[]
	/** The native monthly projection — every month of the horizon. */
	months: SimulationMonth[]
	/** First unmet month index, or null. */
	unmetMonthIndex: number | null
	/** First year with an unmet month, or null. */
	unmetYear: number | null
	/** Total tax paid across the horizon, THB. */
	totalTax: number
	warnings: string[]
}

const TAX_COUNTRY = "TH" as const
const TAX_YEAR = 2026

const clampNonNegative = (value: number): number =>
	Number.isFinite(value) && value > 0 ? value : 0

const clampRate = (value: number): number =>
	Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Amount of a period row in a given year (growth compounds inside the row).
 * Partial edge years count only the active months; growth steps on the
 * row's start-month anniversary, so a row starting in July grows each July.
 */
export function rowAmountInYear(
	row: PeriodRow,
	year: number,
	inflation = 0,
): number {
	if (year < row.startYear) return 0
	const endYear = row.endYear
	if (endYear !== null && year > endYear) return 0
	const rate = rowGrowthRate(row, inflation)
	// Anniversary-step index: full 12-month periods since the row started.
	const anniversaryYearsIn = year - row.startYear
	const grown = clampNonNegative(row.amount) * Math.pow(1 + rate, anniversaryYearsIn)

	// Fraction of THIS year the row is active.
	let monthsActive = 12
	if (year === row.startYear) monthsActive -= clampMonth(row.startMonth)
	if (endYear !== null && year === endYear) monthsActive -= (11 - clampMonth(row.endMonth))
	if (row.startYear === endYear && year === endYear) {
		monthsActive = clampMonth(row.endMonth) - clampMonth(row.startMonth) + 1
	}
	if (monthsActive <= 0) return 0
	return (grown * monthsActive) / 12
}

const clampMonth = (month: number): number =>
	Number.isFinite(month) ? Math.min(Math.max(Math.round(month), 0), 11) : 0

function sumRows(rows: PeriodRow[], year: number, inflation: number): number {
	return round2(
		rows.reduce((sum, row) => sum + rowAmountInYear(row, year, inflation), 0),
	)
}

/** Absolute month index of a row's start (Jan of startYear = index 0). */
function rowStartIndex(row: PeriodRow, startYear: number): number {
	return (row.startYear - startYear) * 12 + clampMonth(row.startMonth)
}

/**
 * The row's share for one absolute month (0-based from plan start).
 * Grows on the row's start-month anniversary; 0 outside the window.
 */
function monthShare(
	rows: PeriodRow[],
	monthIndex: number,
	inflation: number,
	startYear = 0,
): number {
	let total = 0
	for (const row of rows) {
		const begin = rowStartIndex(row, startYear)
		if (monthIndex < begin) continue
		const endYear = row.endYear
		if (endYear !== null) {
			const end = (endYear - startYear) * 12 + clampMonth(row.endMonth)
			if (monthIndex > end) continue
		}
		// Years since the row's start anniversary (fractional within year 1).
		const yearsIn = (monthIndex - begin) / 12
		const grown =
			clampNonNegative(row.amount) *
			Math.pow(1 + rowGrowthRate(row, inflation), Math.floor(yearsIn))
		total += grown / 12
	}
	return total
}

/**
 * Sensible starting plan mirroring the sheet defaults — a single Bangkok
 * employee, working to 60, then living on savings.
 */
export function defaultPlanInput(now: Date = new Date()): PlanInput {
	const startYear = now.getFullYear()
	return {
		startYear,
		birthYear: startYear - 30,
		inflation: 0.02,
		incomes: [
			{
				id: "income-salary",
				label: "Salary",
				startYear,
				startMonth: 0,
				endYear: startYear + 29,
				endMonth: 11,
				amount: 1_200_000,
				growthMode: "override",
				growthRate: 0.03,
			},
		],
		expenses: [
			{
				id: "expense-living",
				label: "Living expenses",
				startYear,
				startMonth: 0,
				endYear: null,
				endMonth: 11,
				amount: 480_000,
				growthMode: "inflation",
				growthRate: 0,
			},
		],
		goals: [],
		retirementYear: startYear + 29,
		retirementMonthlyToday: 40_000,
		savingsSplit: { emergency: 0.1, goal: 0.2, nontax: 0.5, taxAdvantaged: 0.2 },
		walletRates: {
			emergency: 0.015,
			goal: 0.015,
			nontax: 0.07,
			taxAdvantaged: 0.07,
		},
		startingWallets: {
			emergency: 100_000,
			goal: 0,
			nontax: 300_000,
			taxAdvantaged: 0,
		},
		efMonths: 6,
		personalAllowances: 1,
		spouseAllowances: 0,
		childrenAllowances: 0,
		parentsAllowances: 0,
		insurance: 25_000,
		annualWithholding: 0,
		horizonYears: 50,
	}
}

/**
 * Run the multi-wallet projection. Throws RangeError on structurally invalid
 * input (bad split, non-positive horizon) so callers can surface it.
 */
export function runSimulation(input: PlanInput): SimulationResult {
	const horizon = Math.floor(input.horizonYears)
	if (!Number.isFinite(horizon) || horizon < 1 || horizon > 60) {
		throw new RangeError(`horizonYears must be 1..60, got ${input.horizonYears}`)
	}
	const splitSum = WALLET_IDS.reduce(
		(sum, id) => sum + clampRate(input.savingsSplit[id] ?? 0),
		0,
	)
	if (Math.abs(splitSum - 1) > 0.001) {
		throw new RangeError(
			`savingsSplit must sum to 1 (±0.001), got ${splitSum.toFixed(3)}`,
		)
	}

	const system = getTaxSystem(TAX_COUNTRY, TAX_YEAR)
	const warnings: string[] = []
	const months: SimulationMonth[] = []
	const years: SimulationYear[] = []

	// Wallet balances persist across months; EF cap is evaluated per month.
	const wallets: Record<WalletId, number> = {
		emergency: clampNonNegative(input.startingWallets.emergency),
		goal: clampNonNegative(input.startingWallets.goal),
		nontax: clampNonNegative(input.startingWallets.nontax),
		taxAdvantaged: clampNonNegative(input.startingWallets.taxAdvantaged),
	}

	const monthlyGrowth: Record<WalletId, number> = {
		emergency: Math.pow(1 + clampRate(input.walletRates.emergency ?? 0), 1 / 12) - 1,
		goal: Math.pow(1 + clampRate(input.walletRates.goal ?? 0), 1 / 12) - 1,
		nontax: Math.pow(1 + clampRate(input.walletRates.nontax ?? 0), 1 / 12) - 1,
		taxAdvantaged: Math.pow(1 + clampRate(input.walletRates.taxAdvantaged ?? 0), 1 / 12) - 1,
	}

	const totalMonths = horizon * 12
	let unmetMonthIndex: number | null = null
	// Annual TH tax liability per calendar year, computed once (January).
	const yearTaxCache = new Map<number, TaxResult>()

	for (let index = 0; index < totalMonths; index += 1) {
		const month = index % 12
		const year = input.startYear + Math.floor(index / 12)
		const monthIndexInYear = month // 0..11

		// Steps 1-2 — month-scoped income/spending via the anniversary model.
		const income = round2(monthShare(input.incomes, index, input.inflation, input.startYear))
		const rowExpenses = round2(monthShare(input.expenses, index, input.inflation, input.startYear))
		// US-004: from the retirement month, spending switches to the desired
		// pension. Same anniversary rule as rows: pension starts at the Jan of
		// retirementYear and steps ×(1+inflation) each Jan anniversary.
		const retired =
			input.retirementYear !== null &&
			index >= (input.retirementYear - input.startYear) * 12
		const pension = retired
			? clampNonNegative(input.retirementMonthlyToday) *
				Math.pow(
					1 + clampRate(input.inflation),
					Math.floor(
						(index - (input.retirementYear! - input.startYear) * 12) / 12,
					),
				)
			: 0
		const expenses = rowExpenses + pension

		// Step 3 — TH tax is an annual liability; accrue raw 1/12 monthly and
		// let December carry the remainder so the year sums exactly.
		let tax: number
		if (monthIndexInYear === 0) {
			// Peek: compute the whole year's tax once (January) using the
			// year's totals from the anniversary model.
			const yearIncome = sumRows(input.incomes, year, input.inflation)
			const yearMortgage = round2(
				input.expenses.reduce(
					(sum, row) =>
						sum +
						(row.deductible === "mortgageInterest"
							? rowAmountInYear(row, year, input.inflation)
							: 0),
					0,
				),
			)
			const taxResult: TaxResult = system.compute({
				incomes: [{ categoryCode: "employment", amount: yearIncome }],
				allowances: {
					personal: Math.max(1, Math.round(input.personalAllowances)),
					spouse: Math.max(0, Math.round(input.spouseAllowances)),
					children: Math.max(0, Math.round(input.childrenAllowances)),
					parents: Math.max(0, Math.round(input.parentsAllowances)),
					disabled: 0,
				},
				deductions: {
					insurance: clampNonNegative(input.insurance),
					mortgageInterest: yearMortgage,
					donations: 0,
					retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
				},
				withheld: Math.round(clampNonNegative(input.annualWithholding)),
				estimatedPaid: 0,
			})
			warnings.push(...taxResult.warnings)
			yearTaxCache.set(year, taxResult)
			tax = taxResult.netTax / 12
		} else if (monthIndexInYear === 11) {
			const cached = yearTaxCache.get(year)
			// Month 11 carries the remainder so the year sums exactly to the
			// engine liability (no rounding drift).
			tax = cached ? cached.netTax - (cached.netTax / 12) * 11 : 0
		} else {
			const cached = yearTaxCache.get(year)
			tax = cached ? cached.netTax / 12 : 0
		}

		const netCash = round2(income - tax - expenses)

		// Step 5 — contribute by savings split, then EF-cap overflow check.
		let contribution = 0
		if (netCash > 0) {
			for (const id of WALLET_IDS) {
				const share = clampRate(input.savingsSplit[id] ?? 0)
				wallets[id] = round2(wallets[id] + netCash * share)
			}
			contribution = netCash
		}

		const efTarget = round2(clampNonNegative(input.efMonths) * expenses)
		const efOverflow = Math.max(0, round2(wallets.emergency - efTarget))
		if (efOverflow > 0 && netCash > 0) {
			wallets.emergency = round2(wallets.emergency - efOverflow)
			wallets.nontax = round2(wallets.nontax + efOverflow)
			contribution = round2(Math.max(0, contribution - efOverflow))
		}

		for (const id of WALLET_IDS) {
			wallets[id] = round2(wallets[id] * (1 + monthlyGrowth[id]))
		}

		// Step 6 — any deficit month withdraws EF → goal → non-tax → tax-adv.
		let withdrawal = 0
		let unmetNeed = 0
		if (netCash < 0) {
			unmetNeed = round2(-netCash)
			let need = unmetNeed
			for (const id of WALLET_IDS) {
				if (need <= 0) break
				const available = Math.max(0, wallets[id])
				const draw = Math.min(available, need)
				if (draw > 0) {
					wallets[id] = round2(wallets[id] - draw)
					withdrawal = round2(withdrawal + draw)
					need = round2(need - draw)
				}
			}
			if (withdrawal < unmetNeed - 0.01 && unmetMonthIndex === null) {
				unmetMonthIndex = index
			}
		}

		const netWorth = round2(
			WALLET_IDS.reduce((sum, id) => sum + wallets[id], 0),
		)

		months.push({
			index,
			year,
			month,
			age: year - input.birthYear,
			income,
			expenses,
			tax,
			netCash,
			contribution: contribution > 0 ? contribution : 0,
			withdrawal,
			wallets: { ...wallets },
			netWorth,
			unmet: withdrawal > 0 && withdrawal < unmetNeed - 0.01,
		})

		// December — roll the year up from its 12 months.
		if (monthIndexInYear === 11) {
			const yearMonths = months.slice(index - 11, index + 1)
			const sum = (pick: (m: SimulationMonth) => number) =>
				round2(yearMonths.reduce((acc, m) => acc + pick(m), 0))
			const sumWallets = (id: WalletId) =>
				round2(yearMonths[yearMonths.length - 1]?.wallets[id] ?? 0)
			const yearUnmet = yearMonths.some((m) => m.unmet)
			years.push({
				year,
				age: year - input.birthYear,
				income: sum((m) => m.income),
				expenses: sum((m) => m.expenses),
				tax: sum((m) => m.tax),
				netCash: sum((m) => m.netCash),
				contribution: sum((m) => m.contribution),
				withdrawal: sum((m) => m.withdrawal),
				wallets: {
					emergency: sumWallets("emergency"),
					goal: sumWallets("goal"),
					nontax: sumWallets("nontax"),
					taxAdvantaged: sumWallets("taxAdvantaged"),
				},
				netWorth,
				unmet: yearUnmet,
				taxResult: yearTaxCache.get(year)!,
			})
		}
	}

	const firstUnmet = years.find((entry) => entry.unmet)?.year ?? null
	return {
		currency: "THB",
		taxSystem: { country: TAX_COUNTRY, taxYear: TAX_YEAR },
		startYear: input.startYear,
		endYear: input.startYear + horizon - 1,
		years,
		months,
		unmetMonthIndex,
		unmetYear: firstUnmet,
		totalTax: round2(months.reduce((sum, entry) => sum + entry.tax, 0)),
		warnings: [...new Set(warnings)],
	}
}

/** Thai real (inflation-adjusted) return after the long-run inflation rate. */
export function realReturn(nominal: number, inflation: number): number {
	return (1 + clampRate(nominal)) / (1 + clampRate(inflation)) - 1
}

export {
	moneyRunsOutYear,
	retirementVerdict,
	maxForeverMonthlySpend,
	goalChecks,
	compareFundPaths,
	type RetirementVerdict,
	type GoalCheck,
	type PathCompare,
} from "./summary"

export {
	optimizeRetirementContribution,
	type OptimizerInput,
	type OptimizerResult,
} from "./optimize"
