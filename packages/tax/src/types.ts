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
	/** Primary taxpayer allowance count (normally 1). 60,000 THB each. */
	personal: number
	/** Spouse with little or no income. 60,000 THB each. */
	spouse: number
	/** 1st child or children born before 2018 (2561 BE). 30,000 THB each. */
	children: number
	/** 2nd child onwards born in 2018 (2561 BE) or later. 60,000 THB each. */
	childrenSecondPlus2018?: number
	/** Parents + parents-in-law (Thai: บิดามารดา, 30,000 THB each, max 4). */
	parents: number
	/** Number of dependent disabled persons (60,000 THB each). */
	disabled: number
}

/** Long-term retirement savings input fields. */
export interface RetirementSavingsInput {
	/** Super Savings Fund (max 200,000 THB, <= 30% assessable income). */
	ssf: number
	/** Retirement Mutual Fund (max 500,000 THB, <= 30% assessable income). */
	rmf: number
	/** Provident fund (max 15% employment gross). */
	provident: number
	/** Pension life insurance (เบี้ยประกันชีวิตแบบบำนาญ, up to 200,000 THB & <=15% assessable; can absorb unused life cap). */
	pensionInsurance?: number
	/** National Savings Fund (กองทุนการออมแห่งชาติ - กอช., max 30,000 THB). */
	nsf?: number
	/** Government Pension Fund (กองทุนบำเหน็จบำนาญข้าราชการ - กบข., max 30% of salary). */
	gpf?: number
}

/** Line-item amounts entered by the user, in system currency (pre-cap). */
export interface DeductionInput {
	/** General life insurance (max 100,000 THB). Combined with healthInsurance <= 100,000 THB. */
	insurance: number
	/** Self health insurance (max 25,000 THB, combined with life insurance max 100,000 THB). */
	healthInsurance?: number
	/** Parents' health insurance (max 15,000 THB). */
	parentHealthInsurance?: number
	/** Social Security contributions (Thai: ประกันสังคม ม.33 / ม.39 / ม.40, max 9,000 THB). */
	socialSecurity?: number
	/** Antenatal care and childbirth expenses (Thai: ค่าฝากครรภ์และคลอดบุตร, max 60,000 THB). */
	prenatalAndChildbirth?: number
	/** Mortgage interest (Thai: ดอกเบี้ยบ้าน, max 100,000 THB). */
	mortgageInterest: number
	/** General donations (1x, capped at 10% of assessable income). */
	donations: number
	/** Double-deduction donations for education, healthcare, state hospitals (2x counted, up to 10% cap). */
	doubleDonations?: number
	/** Thai ESG fund (กองทุนรวมไทยเพื่อความยั่งยืน, max 300,000 THB and <= 30% assessable; separate from 500k pool). */
	thaiESG?: number
	/** Easy E-Receipt / economic stimulus shopping (max 50,000 THB). */
	easyEReceipt?: number
	/** Long-term savings (SSF / RMF / provident / pension / NSF / GPF, combined 500,000 THB cap). */
	retirementSavings: RetirementSavingsInput
}

/** One assessable income entry. */
export interface IncomeLine {
	categoryCode: string
	amount: number
	/**
	 * Corporate Income Tax (CIT) rate paid by the dividend distributor (e.g. 0.20 for 20%).
	 * When specified (> 0) on a dividend line, the dividend is grossed up under Section 47 bis
	 * and the dividend tax credit is credited against total tax liability.
	 */
	citRate?: number
}

export interface TaxInput {
	/** Gross amounts per income category code. */
	incomes: IncomeLine[]
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

/** One itemized deduction line: what the user entered vs what the engine applied. */
export interface DeductionLine {
	/** Stable code, e.g. 'insurance'. */
	code: string
	label: LocalizedLabel
	/** Amount the user entered (pre-cap). */
	entered: number
	/** Amount actually applied after caps (in currency units). */
	applied: number
	/** True when the cap reduced the entered amount. */
	capped: boolean
}

/**
 * Static allowance definition so UI surfaces can render family-allowance
 * controls from config instead of hard-coding per country.
 */
export interface AllowanceDef {
	code: keyof AllowanceInput
	label: LocalizedLabel
	/** Deduction per person, in currency units. */
	amountPerPerson: number
	/** Human-readable condition summary for helper text. */
	condition: LocalizedLabel
}

export interface TaxResult {
	country: TaxCountry
	taxYear: number
	currency: string

	/** Sum of gross income lines (including any dividend gross-up). */
	grossIncome: number
	/** Gross minus category expense deductions (Thai: รายได้หลังหักค่าใช้จ่าย). */
	assessableIncome: number
	/** Expense deductions applied per income category (capped). */
	expenseDeductions: number
	/** Itemized deductions applied (insurance, mortgage, donations, retirement savings — each capped). */
	itemizedDeductions: number
	/** Allowances applied (personal + spouse + children + parents + disabled, capped at remaining income). */
	allowancesTotal: number

	/** Floor 0: assessable minus itemized deductions minus allowances. */
	taxableIncome: number
	/** Progressive bracket liability before minimum alternative tax check. */
	progressiveTax?: number
	/** Section 48(2) minimum alternative tax (0.5% on non-employment income > 5,000 THB), or 0. */
	section48Tax?: number
	/** Final tax liability (max of progressive tax and Section 48(2) minimum tax). */
	taxLiability: number
	/** Credits applied (Thai working credit + dividend tax credit), never exceeds liability. */
	credits: number
	/** Breakdown of tax credits applied. */
	creditBreakdown?: {
		workingCredit: number
		dividendTaxCredit: number
	}
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
	/**
	 * Per-line view of the itemized deductions: entered vs applied (post-cap).
	 * Lets UI surfaces show "you entered X, Y counted, you saved Z" without
	 * duplicating cap logic.
	 */
	deductionLines: DeductionLine[]
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
	/**
	 * Family allowance definitions (per-person amounts + conditions) so UIs
	 * can render household pickers generically. Optional for backwards
	 * compatibility; all built-in systems expose it.
	 */
	allowanceDefs?: AllowanceDef[]
}
