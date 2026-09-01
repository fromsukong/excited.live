/**
 * excited.live — shared tax engine contract.
 *
 * Multi-jurisdiction by design: every country/year is a `TaxSystem` that
 * implements this contract. Thailand (TH 2026) is the only fully implemented
 * system; the US (US 2026) is a structural placeholder proving the pattern.
 *
 * Product decisions (2026-08-30):
 * - INDIVIDUAL tax only. Corporate tax is out of scope (possible future module).
 * - Logic only: this package must stay pure — no network, no DOM, no framework.
 * - Labels are bilingual (en + th) from day one; UI launches EN-first in Thailand.
 */

export type TaxCountry = 'TH' | 'US'

export interface LocalizedLabel {
	en: string
	th: string
}

/** Progressive bracket. Rates apply to taxable income. */
export interface TaxBracket {
	/**
	 * Upper bound of the bracket in currency units (exclusive).
	 * The LAST bracket must use Infinity.
	 */
	upTo: number
	/** Marginal rate for this bracket, 0..1. */
	rate: number
}

/** One assessable income category (Thai Revenue Department categories 40(1)..40(8) style). */
export interface IncomeCategory {
	code: string
	label: LocalizedLabel
	/**
	 * Flat expense deduction (Thai: ค่าใช้จ่าย) allowed on gross amounts of this
	 * category. `null` = no expense deduction.
	 * e.g. employment: 50% capped at 100,000 THB.
	 */
	expenseDeduction: { rate: number; cap?: number } | null
}

export interface TaxSystemConfig {
	country: TaxCountry
	taxYear: number
	/** ISO 4217 currency code, e.g. 'THB', 'USD'. */
	currency: string
	/** Progressive brackets sorted ascending by `upTo`; last must be Infinity. */
	brackets: TaxBracket[]
	incomeCategories: IncomeCategory[]
	/** Jurisdiction-specific extras (US filing-status standard deductions, etc.). */
	options?: Record<string, unknown>
}

/** Household allowances (Thai: ค่าลดหย่อนส่วนตัวและครอบครัว). */
export interface AllowanceInput {
	/** Primary taxpayer allowance count (normally 1). */
	personal: number
	spouse: number
	children: number
	/** Number of dependent disabled persons. */
	disabled: number
}

/** Line-item amounts entered by the user, in system currency (pre-cap). */
export interface DeductionInput {
	insurance: number
	mortgageInterest: number
	donations: number
	/** Long-term savings (Thai: SSF / RMF / provident fund / gov pension fund). */
	retirementSavings: {
		ssf: number
		rmf: number
		provident: number
	}
}

export interface TaxInput {
	/** Gross amounts per income category code. */
	incomes: { categoryCode: string; amount: number }[]
	allowances: AllowanceInput
	deductions: DeductionInput
	/** Tax already withheld at source (e.g. by employer). */
	withheld: number
	/** Estimated tax paid in advance (Thai: ภาษีครึ่งปี / ภ.ง.ด.94). */
	estimatedPaid: number
	/**
	 * US placeholder: 'single' | 'married_joint' | 'married_separate' | 'head_of_household'.
	 * Ignored by TH systems.
	 */
	filingStatus?: string
}

export interface BracketBreakdown {
	index: number
	from: number
	to: number
	rate: number
	taxableInBracket: number
	tax: number
}

export interface TaxResult {
	country: TaxCountry
	taxYear: number
	currency: string

	/** Sum of gross income lines. */
	grossIncome: number
	/** Gross minus category expense deductions (Thai: รายได้หลังหักค่าใช้จ่าย). */
	assessableIncome: number
	/** Expense deductions applied per income category (capped). */
	expenseDeductions: number
	/** Itemized deductions applied (insurance, mortgage, donations, retirement savings — each capped). */
	itemizedDeductions: number
	/** Allowances applied (personal + spouse + children + disabled, capped at remaining income). */
	allowancesTotal: number

	/** Floor 0: assessable minus itemized deductions minus allowances. */
	taxableIncome: number
	/** Sum over brackets, before credits. */
	taxLiability: number
	/** Credits applied (Thai working credit), never exceeds liability. */
	credits: number
	/** Liability minus credits, floored at 0. */
	netTax: number

	/** Rate of the highest bracket touched (0 when no taxable income). */
	marginalRate: number
	/** netTax / assessableIncome (0 when assessableIncome is 0). */
	effectiveRate: number

	/** netTax − withheld − estimatedPaid. NEGATIVE = refund / overpaid. */
	balance: number

	brackets: BracketBreakdown[]
	/** Non-blocking notes (e.g. "donation input capped", "v1 simplification applied"). */
	warnings: string[]
}

export interface TaxSystem {
	country: TaxCountry
	taxYear: number
	/**
	 * Non-empty when `compute` would be invalid:
	 * negative/finite failures, unknown category codes, etc.
	 */
	validate(input: TaxInput): string[]
	/** Assumes input already passed `validate`. Returns rounded (2dp) numbers. */
	compute(input: TaxInput): TaxResult
	/** Assumptions & simplifications of this system, for docs and UI footnotes. */
	assumptions: LocalizedLabel[]
	/**
	 * Read-only view of this system's static config (brackets, income
	 * categories, jurisdiction options) so UI surfaces can render dynamic
	 * forms without importing system internals. Optional for backwards
	 * compatibility; all built-in systems expose it.
	 */
	config?: TaxSystemConfig
}