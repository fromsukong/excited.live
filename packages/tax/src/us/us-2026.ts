/**
 * United States — individual income tax, tax year 2026.
 *
 * ⚠️ STRUCTURAL PLACEHOLDER ONLY ⚠️
 * This system exists to prove the multi-jurisdiction shape of packages/tax
 * (types, registry, config exposure, multi-status Progressive tables). Every
 * rate, bracket and standard deduction is a 2025 STAND-IN because the real
 * 2026 schedule depends on pending legislation (TCJA sunset on 2025-12-31).
 *
 * DO NOT USE FOR REAL CALCULATIONS.
 *
 * What is modeled (placeholder form):
 * - 4 filing statuses (single, married_joint, married_separate, head_of_household)
 *   via `input.filingStatus`.
 * - 2025 standard deduction per status (single 15,000, married 30,000, head 22,500).
 * - 2025 progressive brackets per status (10% to 37%).
 * - Zero expense deductions (assessable = gross).
 * - Itemized deductions and allowances are IGNORED (warnings pushed if non-zero).
 * - Zero credits.
 *
 * Pure logic only: no network, no DOM, no date dependence.
 */

import type {
	IncomeCategory,
	LocalizedLabel,
	TaxBracket,
	TaxInput,
	TaxResult,
	TaxSystem,
	TaxSystemConfig,
} from "../types"
import { deepFreeze } from "../deep-freeze"

const CURRENCY = "USD"
const TAX_YEAR = 2026

// ---------------------------------------------------------------------------
// PLACEHOLDER brackets — 2025 federal schedules used as a stand-in for 2026.
// Rates: 10%, 12%, 22%, 24%, 32%, 35%, 37%.
// ---------------------------------------------------------------------------

const SINGLE_BRACKETS: TaxBracket[] = [
	{ upTo: 11_925, rate: 0.1 },
	{ upTo: 48_475, rate: 0.12 },
	{ upTo: 103_350, rate: 0.22 },
	{ upTo: 197_300, rate: 0.24 },
	{ upTo: 250_525, rate: 0.32 },
	{ upTo: 626_350, rate: 0.35 },
	{ upTo: Infinity, rate: 0.37 },
]

const MARRIED_JOINT_BRACKETS: TaxBracket[] = [
	{ upTo: 23_850, rate: 0.1 },
	{ upTo: 96_950, rate: 0.12 },
	{ upTo: 206_700, rate: 0.22 },
	{ upTo: 394_600, rate: 0.24 },
	{ upTo: 501_050, rate: 0.32 },
	{ upTo: 751_600, rate: 0.35 },
	{ upTo: Infinity, rate: 0.37 },
]

const MARRIED_SEPARATE_BRACKETS: TaxBracket[] = [
	{ upTo: 11_925, rate: 0.1 },
	{ upTo: 48_475, rate: 0.12 },
	{ upTo: 103_350, rate: 0.22 },
	{ upTo: 197_300, rate: 0.24 },
	{ upTo: 250_525, rate: 0.32 },
	{ upTo: 375_800, rate: 0.35 },
	{ upTo: Infinity, rate: 0.37 },
]

const HEAD_OF_HOUSEHOLD_BRACKETS: TaxBracket[] = [
	{ upTo: 17_000, rate: 0.1 },
	{ upTo: 64_850, rate: 0.12 },
	{ upTo: 103_350, rate: 0.22 },
	{ upTo: 197_300, rate: 0.24 },
	{ upTo: 250_500, rate: 0.32 },
	{ upTo: 626_350, rate: 0.35 },
	{ upTo: Infinity, rate: 0.37 },
]

const BRACKETS_BY_STATUS: Record<string, TaxBracket[]> = {
	single: SINGLE_BRACKETS,
	married_joint: MARRIED_JOINT_BRACKETS,
	married_separate: MARRIED_SEPARATE_BRACKETS,
	head_of_household: HEAD_OF_HOUSEHOLD_BRACKETS,
}

// ---------------------------------------------------------------------------
// PLACEHOLDER filing statuses — 2025 standard deductions used as a stand-in
// for the unknown 2026 schedule. Exposed via config.options (US-specific).
// ---------------------------------------------------------------------------

interface FilingStatusOption {
	code: string
	label: LocalizedLabel
	/** PLACEHOLDER standard deduction (2025 stand-in; see header note). */
	standardDeduction: number
}

const SINGLE_STATUS: FilingStatusOption = {
	code: "single",
	label: { en: "Single", th: "โสด" },
	standardDeduction: 15_000, // PLACEHOLDER 2025 stand-in
}

const FILING_STATUSES: FilingStatusOption[] = [
	SINGLE_STATUS,
	{
		code: "married_joint",
		label: { en: "Married filing jointly", th: "สมรสยื่นภาษีร่วมกัน" },
		standardDeduction: 30_000, // PLACEHOLDER 2025 stand-in
	},
	{
		code: "married_separate",
		label: { en: "Married filing separately", th: "สมรสยื่นภาษีแยกกัน" },
		standardDeduction: 15_000, // PLACEHOLDER 2025 stand-in
	},
	{
		code: "head_of_household",
		label: { en: "Head of household", th: "หัวหน้าครอบครัว" },
		standardDeduction: 22_500, // PLACEHOLDER 2025 stand-in
	},
]

const FILING_STATUS_CODES = FILING_STATUSES.map((status) => status.code)

// ---------------------------------------------------------------------------
// Income categories — the US placeholder applies NO expense deductions
// (expenseDeduction is null for all), so assessableIncome = grossIncome.
// ---------------------------------------------------------------------------

const INCOME_CATEGORIES: IncomeCategory[] = [
	{ code: "wages", label: { en: "Wages", th: "เงินเดือน" }, expenseDeduction: null },
	{
		code: "self_employment",
		label: { en: "Self-employment", th: "รายได้อิสระ" },
		expenseDeduction: null,
	},
	{ code: "investment", label: { en: "Investment", th: "รายได้ลงทุน" }, expenseDeduction: null },
	{ code: "other", label: { en: "Other", th: "อื่น ๆ" }, expenseDeduction: null },
]

/** All money fields in results are rounded to 2 decimals. */
const round2 = (value: number): number => Math.round(value * 100) / 100

const sum = (values: number[]): number => values.reduce((acc, value) => acc + value, 0)

// ---------------------------------------------------------------------------
// Result / system types: the shared contract (TaxResult / TaxSystem) plus a
// few US-placeholder-specific fields exposed locally (standard deduction
// applied, compute-time errors, options/config exposition). Structural
// supersets — contract consumers can use these as plain TaxResult/TaxSystem.
// ---------------------------------------------------------------------------

interface UsTaxResult extends TaxResult {
	/** Standard deduction actually applied (PLACEHOLDER), capped at assessable income. */
	standardDeduction: number
	/** Non-blocking compute-time problems (mirrors `validate`). */
	errors: string[]
}

interface UsTaxSystem extends TaxSystem {
	currency: string
	description: LocalizedLabel
	config: TaxSystemConfig & {
		options: {
			filingStatuses: FilingStatusOption[]
			bracketsByStatus: Record<string, TaxBracket[]>
		}
	}
	compute(input: TaxInput): UsTaxResult
}

function compute(input: TaxInput): UsTaxResult {
	const warnings: string[] = []
	const errors: string[] = []

	// Filing status: pick by input.filingStatus, defaulting to "single".
	// An unknown status (reported by validate()) falls back to single here.
	const statusCode = input.filingStatus ?? "single"
	const statusOption =
		FILING_STATUSES.find((status) => status.code === statusCode) ?? SINGLE_STATUS
	if (input.filingStatus !== undefined && statusOption.code !== input.filingStatus) {
		errors.push(`Unknown filing status: ${input.filingStatus}`)
	}
	const statusBrackets = BRACKETS_BY_STATUS[statusOption.code]!
	const nominalStandardDeduction = statusOption.standardDeduction // PLACEHOLDER 2025 stand-in

	// US placeholder ignores the allowances input entirely: the US federal
	// system has no personal allowances. Warn when any count is > 0.
	const allowanceCounts = [
		input.allowances.personal,
		input.allowances.spouse,
		input.allowances.children,
		input.allowances.childrenSecondPlus2018 ?? 0,
		input.allowances.parents,
		input.allowances.disabled,
	]
	if (allowanceCounts.some((count) => count > 0)) {
		warnings.push("Allowances input ignored under US placeholder")
	}

	// US placeholder ignores the itemized deductions input entirely
	// (standard deduction only). Warn when any amount is > 0.
	const itemizedInputs = [
		input.deductions.insurance,
		input.deductions.healthInsurance ?? 0,
		input.deductions.parentHealthInsurance ?? 0,
		input.deductions.socialSecurity ?? 0,
		input.deductions.prenatalAndChildbirth ?? 0,
		input.deductions.mortgageInterest,
		input.deductions.donations,
		input.deductions.doubleDonations ?? 0,
		input.deductions.thaiESG ?? 0,
		input.deductions.easyEReceipt ?? 0,
		input.deductions.retirementSavings.ssf,
		input.deductions.retirementSavings.rmf,
		input.deductions.retirementSavings.provident,
		input.deductions.retirementSavings.pensionInsurance ?? 0,
		input.deductions.retirementSavings.nsf ?? 0,
		input.deductions.retirementSavings.gpf ?? 0,
	]
	if (itemizedInputs.some((amount) => amount > 0)) {
		warnings.push("Itemized deductions input ignored under US placeholder")
	}

	// No expense deductions in the US placeholder: assessableIncome = grossIncome.
	const grossIncome = round2(sum(input.incomes.map((line) => line.amount)))
	const expenseDeductions = round2(0)
	const assessableIncome = round2(grossIncome - expenseDeductions)
	const itemizedDeductions = round2(0) // standard deduction only — itemized ignored
	const allowancesTotal = round2(0) // allowances ignored

	// Reported standard deduction = the amount actually applied (capped at
	// assessable income), so a zero-income filing reports 0.
	const standardDeduction = round2(Math.min(nominalStandardDeduction, assessableIncome))
	const taxableIncome = round2(Math.max(0, assessableIncome - standardDeduction))

	// Progressive per-bracket math (contract):
	let from = 0
	const brackets = statusBrackets.map((bracket, index) => {
		const taxableInBracket = round2(Math.max(0, Math.min(taxableIncome, bracket.upTo) - from))
		const tax = round2(taxableInBracket * bracket.rate)
		const breakdown = {
			index,
			from,
			to: bracket.upTo,
			rate: bracket.rate,
			taxableInBracket,
			tax,
		}
		from = bracket.upTo
		return breakdown
	})

	const taxLiability = round2(sum(brackets.map((bracket) => bracket.tax)))
	const credits = 0
	const netTax = round2(Math.max(0, taxLiability - credits))

	let marginalRate = 0
	for (const bracket of brackets) {
		if (bracket.taxableInBracket > 0) {
			marginalRate = bracket.rate
		}
	}

	const effectiveRate = assessableIncome === 0 ? 0 : netTax / assessableIncome
	const balance = round2(netTax - input.withheld - input.estimatedPaid)

	return {
		country: "US",
		taxYear: TAX_YEAR,
		currency: CURRENCY,
		grossIncome,
		assessableIncome,
		expenseDeductions,
		itemizedDeductions,
		allowancesTotal,
		standardDeduction,
		taxableIncome,
		taxLiability,
		credits,
		netTax,
		marginalRate,
		effectiveRate,
		balance,
		brackets,
		warnings,
		errors,
		deductionLines: [],
	}
}

function validate(input: TaxInput): string[] {
	const problems: string[] = []

	const statusCode = input.filingStatus
	if (statusCode !== undefined && !FILING_STATUS_CODES.includes(statusCode)) {
		problems.push(`Unknown filing status: ${statusCode}`)
	}

	const knownCodes = new Set(INCOME_CATEGORIES.map((category) => category.code))

	const checkNonNegativeFinite = (value: number, label: string): void => {
		if (!Number.isFinite(value) || value < 0) {
			problems.push(`${label} must be a non-negative finite number (got ${value})`)
		}
	}

	for (const line of input.incomes) {
		checkNonNegativeFinite(line.amount, `income "${line.categoryCode}" amount`)
		if (!knownCodes.has(line.categoryCode)) {
			problems.push(`Unknown income category code: ${line.categoryCode}`)
		}
	}

	// Allowances / deductions are ignored by the US placeholder, but still
	// validated for shape (same guards as the real TH system).
	const allowances = input.allowances
	checkNonNegativeFinite(allowances.personal, "allowances.personal count")
	checkNonNegativeFinite(allowances.spouse, "allowances.spouse count")
	checkNonNegativeFinite(allowances.children, "allowances.children count")
	if (allowances.childrenSecondPlus2018 !== undefined) {
		checkNonNegativeFinite(allowances.childrenSecondPlus2018, "allowances.childrenSecondPlus2018 count")
	}
	checkNonNegativeFinite(allowances.parents, "allowances.parents count")
	checkNonNegativeFinite(allowances.disabled, "allowances.disabled count")

	const deductions = input.deductions
	checkNonNegativeFinite(deductions.insurance, "deductions.insurance")
	if (deductions.healthInsurance !== undefined) {
		checkNonNegativeFinite(deductions.healthInsurance, "deductions.healthInsurance")
	}
	if (deductions.parentHealthInsurance !== undefined) {
		checkNonNegativeFinite(deductions.parentHealthInsurance, "deductions.parentHealthInsurance")
	}
	if (deductions.socialSecurity !== undefined) {
		checkNonNegativeFinite(deductions.socialSecurity, "deductions.socialSecurity")
	}
	if (deductions.prenatalAndChildbirth !== undefined) {
		checkNonNegativeFinite(deductions.prenatalAndChildbirth, "deductions.prenatalAndChildbirth")
	}
	checkNonNegativeFinite(deductions.mortgageInterest, "deductions.mortgageInterest")
	checkNonNegativeFinite(deductions.donations, "deductions.donations")
	if (deductions.doubleDonations !== undefined) {
		checkNonNegativeFinite(deductions.doubleDonations, "deductions.doubleDonations")
	}
	if (deductions.thaiESG !== undefined) {
		checkNonNegativeFinite(deductions.thaiESG, "deductions.thaiESG")
	}
	if (deductions.easyEReceipt !== undefined) {
		checkNonNegativeFinite(deductions.easyEReceipt, "deductions.easyEReceipt")
	}

	checkNonNegativeFinite(deductions.retirementSavings.ssf, "deductions.retirementSavings.ssf")
	checkNonNegativeFinite(deductions.retirementSavings.rmf, "deductions.retirementSavings.rmf")
	checkNonNegativeFinite(deductions.retirementSavings.provident, "deductions.retirementSavings.provident")
	if (deductions.retirementSavings.pensionInsurance !== undefined) {
		checkNonNegativeFinite(
			deductions.retirementSavings.pensionInsurance,
			"deductions.retirementSavings.pensionInsurance",
		)
	}
	if (deductions.retirementSavings.nsf !== undefined) {
		checkNonNegativeFinite(deductions.retirementSavings.nsf, "deductions.retirementSavings.nsf")
	}
	if (deductions.retirementSavings.gpf !== undefined) {
		checkNonNegativeFinite(deductions.retirementSavings.gpf, "deductions.retirementSavings.gpf")
	}

	checkNonNegativeFinite(input.withheld, "withheld")
	checkNonNegativeFinite(input.estimatedPaid, "estimatedPaid")

	return problems
}

/** PLACEHOLDER flagging + simplifications, for docs and UI footnotes (en/th). */
const assumptions: LocalizedLabel[] = [
	{
		en: "PLACEHOLDER: all rates and thresholds are 2025 standards used as a stand-in for 2026. The real 2026 schedule is subject to pending legislation (TCJA sunset) — verify before any real use.",
		th: "ค่าเริ่มต้น: อัตราและเกณฑ์ทั้งหมดเป็นมาตรฐานปี 2025 ที่ใช้แทนปี 2026 ตารางภาษีปี 2026 ที่แท้จริงขึ้นอยู่กับกฎหมายที่ยังไม่ผ่าน (TCJA sunset) — ต้องตรวจสอบก่อนใช้งานจริง",
	},
	{
		en: "Standard deduction only; itemized deductions are not modeled.",
		th: "ใช้เฉพาะค่าใช้จ่ายลดหย่อนแบบมาตรฐาน (standard deduction) ไม่มีแบบแยกรายการ (itemized)",
	},
	{
		en: "No tax credits are modeled.",
		th: "ไม่มีการจำลองเครดิตภาษี (tax credits)",
	},
]

export const us2026System: UsTaxSystem = deepFreeze({
	country: "US",
	taxYear: TAX_YEAR,
	currency: CURRENCY,
	description: {
		en: "PLACEHOLDER US federal income tax system for 2026. Architecture skeleton only: 2025 standards stand in for the 2026 schedule, which is subject to pending legislation (TCJA sunset). Not for real use.",
		th: "ระบบภาษีเงินได้บุคคลธรรมดาสหรัฐอเมริกา ปี 2026 (ค่าเริ่มต้น) โครงร่างสถาปัตยกรรมเท่านั้น: ใช้มาตรฐานปี 2025 แทนตารางปี 2026 ซึ่งขึ้นอยู่กับกฎหมายที่ยังไม่ผ่าน (TCJA sunset) ยังไม่พร้อมใช้งานจริง",
	},
	validate,
	compute,
	assumptions,
	config: {
		country: "US",
		taxYear: TAX_YEAR,
		currency: CURRENCY,
		brackets: SINGLE_BRACKETS,
		incomeCategories: INCOME_CATEGORIES,
		options: {
			filingStatuses: FILING_STATUSES,
			bracketsByStatus: BRACKETS_BY_STATUS,
		},
	},
})
