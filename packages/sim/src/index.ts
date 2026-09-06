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
 * Active in years [startYear, endYear]; endYear null = runs forever.
 */
export interface PeriodRow {
	/** Stable key for React lists; UI-generated (row-1, row-2, …). */
	id: string
	label: string
	/** First calendar year the row applies. */
	startYear: number
	/** Last calendar year, or null for open-ended rows. */
	endYear: number | null
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
	years: SimulationYear[]
	/** First year spending could not be fully funded, or null. */
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

/** Amount of a period row in a given year (growth compounds inside the row). */
export function rowAmountInYear(
	row: PeriodRow,
	year: number,
	inflation = 0,
): number {
	if (year < row.startYear) return 0
	if (row.endYear !== null && year > row.endYear) return 0
	const yearsIn = year - row.startYear
	return (
		clampNonNegative(row.amount) *
		Math.pow(1 + rowGrowthRate(row, inflation), yearsIn)
	)
}

function sumRows(rows: PeriodRow[], year: number, inflation: number): number {
	return round2(
		rows.reduce((sum, row) => sum + rowAmountInYear(row, year, inflation), 0),
	)
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
				endYear: startYear + 29,
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
				endYear: null,
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
	const years: SimulationYear[] = []

	// Wallet balances persist across years; EF cap is evaluated per year.
	const wallets: Record<WalletId, number> = {
		emergency: clampNonNegative(input.startingWallets.emergency),
		goal: clampNonNegative(input.startingWallets.goal),
		nontax: clampNonNegative(input.startingWallets.nontax),
		taxAdvantaged: clampNonNegative(input.startingWallets.taxAdvantaged),
	}

	for (let index = 0; index < horizon; index += 1) {
		const year = input.startYear + index
		const income = sumRows(input.incomes, year, input.inflation)
		// US-004: from the retirement year, spending switches to the desired
		// retirement spend (inflation-adjusted) + still-active expense rows.
		const rowExpenses = sumRows(input.expenses, year, input.inflation)
		const retired =
			input.retirementYear !== null && year >= input.retirementYear
		const pension = retired
			? round2(
					clampNonNegative(input.retirementMonthlyToday) *
						12 *
						Math.pow(1 + clampRate(input.inflation), year - input.startYear),
				)
			: 0
		const expenses = round2(rowExpenses + pension)

		// US-005: deductible-flagged expense rows feed the TH tax calc.
		const mortgageInterest = round2(
			input.expenses.reduce(
				(sum, row) =>
					sum +
					(row.deductible === "mortgageInterest"
						? rowAmountInYear(row, year, input.inflation)
						: 0),
				0,
			),
		)

		// Step 3 — tax on employment income (TH 2026 system).
		const taxResult: TaxResult = system.compute({
			incomes: [{ categoryCode: "employment", amount: income }],
			allowances: {
				personal: Math.max(1, Math.round(input.personalAllowances)),
				spouse: Math.max(0, Math.round(input.spouseAllowances)),
				children: Math.max(0, Math.round(input.childrenAllowances)),
				parents: Math.max(0, Math.round(input.parentsAllowances)),
				disabled: 0,
			},
			deductions: {
				insurance: clampNonNegative(input.insurance),
				mortgageInterest,
				donations: 0,
				retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
			},
			withheld: Math.round(clampNonNegative(input.annualWithholding)),
			estimatedPaid: 0,
		})
		warnings.push(...taxResult.warnings)

		const tax = taxResult.netTax
		const netCash = round2(income - tax - expenses)

		// Step 5 — contribute by savings split, then grow balances.
		let contribution = 0
		if (netCash > 0) {
			for (const id of WALLET_IDS) {
				const share = clampRate(input.savingsSplit[id] ?? 0)
				wallets[id] = round2(wallets[id] + netCash * share)
			}
			contribution = netCash
		}

		// Emergency fund cap: overflow this year's share flows to investments.
		const monthlyExpenses = expenses / 12
		const efTarget = round2(clampNonNegative(input.efMonths) * monthlyExpenses)
		const efOverflow = Math.max(0, round2(wallets.emergency - efTarget))
		if (efOverflow > 0 && netCash > 0) {
			wallets.emergency = round2(wallets.emergency - efOverflow)
			wallets.nontax = round2(wallets.nontax + efOverflow)
		}

		for (const id of WALLET_IDS) {
			const rate = clampRate(input.walletRates[id] ?? 0)
			wallets[id] = round2(wallets[id] * (1 + rate))
		}

		// Step 6 — any deficit year (retirement, sabbatical, mid-career gap)
		// withdraws for spending from wallets EF → goal → non-tax → tax-advantaged.
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
		}

		const netWorth = round2(
			WALLET_IDS.reduce((sum, id) => sum + wallets[id], 0),
		)
		const unmet = withdrawal > 0 && withdrawal < unmetNeed - 0.01

		years.push({
			year,
			age: year - input.birthYear,
			income,
			expenses,
			tax,
			netCash,
			contribution: contribution > 0 ? round2(contribution) : 0,
			withdrawal,
			wallets: { ...wallets },
			netWorth,
			unmet,
			taxResult,
		})
	}

	const firstUnmet = years.find((entry) => entry.unmet)?.year ?? null
	return {
		currency: "THB",
		taxSystem: { country: TAX_COUNTRY, taxYear: TAX_YEAR },
		startYear: input.startYear,
		endYear: input.startYear + horizon - 1,
		years,
		unmetYear: firstUnmet,
		totalTax: round2(years.reduce((sum, entry) => sum + entry.tax, 0)),
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
