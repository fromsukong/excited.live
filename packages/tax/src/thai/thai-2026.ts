/**
 * Thailand — individual income tax (PND 91 style), tax year 2026.
 *
 * v1 simplifications (see `assumptions`):
 * - no interest 20,000 THB exemption, no dividend tax credit, no section 40(4) exemptions
 * - provident fund cap simplified to 15% of gross employment income
 * - donations cap = 10% of assessable income
 *
 * Pure logic only: no network, no DOM, no date dependence (tax year fixed in config).
 */

import type {
	AllowanceDef,
	BracketBreakdown,
	DeductionLine,
	IncomeCategory,
	LocalizedLabel,
	TaxBracket,
	TaxInput,
	TaxResult,
	TaxSystem,
} from "../types"
import { deepFreeze } from "../deep-freeze"

const CURRENCY = "THB"
const TAX_YEAR = 2026

/** Progressive brackets (THB), ascending by `upTo`; last bracket is Infinity. */
const BRACKETS: TaxBracket[] = [
	{ upTo: 150_000, rate: 0 },
	{ upTo: 300_000, rate: 0.05 },
	{ upTo: 500_000, rate: 0.1 },
	{ upTo: 750_000, rate: 0.15 },
	{ upTo: 1_000_000, rate: 0.2 },
	{ upTo: 2_000_000, rate: 0.25 },
	{ upTo: 5_000_000, rate: 0.3 },
	{ upTo: Infinity, rate: 0.35 },
]

/** Thai Revenue Department income categories (section 40 style). */
const INCOME_CATEGORIES: IncomeCategory[] = [
	{
		code: "employment",
		label: { en: "Employment", th: "เงินเดือน" },
		expenseDeduction: { rate: 0.5, cap: 100_000 },
	},
	{
		code: "freelance",
		label: { en: "Freelance", th: "งานอิสระ" },
		expenseDeduction: { rate: 0.3 },
	},
	{
		code: "rental",
		label: { en: "Rental", th: "ค่าเช่า" },
		expenseDeduction: { rate: 0.3 },
	},
	{
		code: "dividend",
		label: { en: "Dividends", th: "เงินปันผล" },
		expenseDeduction: null,
	},
	{
		code: "interest",
		label: { en: "Interest", th: "ดอกเบี้ย" },
		expenseDeduction: null,
	},
	{
		code: "other",
		label: { en: "Other", th: "อื่น ๆ" },
		expenseDeduction: { rate: 0.3 },
	},
]

/**
 * Household allowances per person (THB): personal/spouse 60,000; children 30,000;
 * parents (own + spouse's, age 60+, income ≤ 30k) 30,000; disabled dependents 60,000.
 */
const ALLOWANCE_PERSONAL = 60_000
const ALLOWANCE_SPOUSE = 60_000
const ALLOWANCE_CHILDREN = 30_000
const ALLOWANCE_PARENTS = 30_000
const ALLOWANCE_DISABLED = 60_000
/** RD rule: parents allowance covers at most 4 people (own + spouse's parents). */
const ALLOWANCE_PARENTS_MAX = 4

/** Itemized deduction caps (THB). */
const CAP_INSURANCE = 100_000
const CAP_MORTGAGE_INTEREST = 100_000
const CAP_DONATIONS_RATE = 0.1
const CAP_RETIREMENT_COMBINED = 500_000
const CAP_SSF = 200_000
const CAP_RMF_RATE = 0.3
const CAP_PROVIDENT_RATE = 0.15

/** All money fields in results are rounded to 2 decimals. */
const round2 = (value: number): number => Math.round(value * 100) / 100

const sum = (values: number[]): number => values.reduce((acc, value) => acc + value, 0)

function compute(input: TaxInput): TaxResult {
	const warnings: string[] = []

	const byCode = new Map(INCOME_CATEGORIES.map((category) => [category.code, category]))

	const lines = input.incomes.map((line) => ({
		code: line.categoryCode,
		amount: line.amount,
		category: byCode.get(line.categoryCode),
	}))

	const grossIncome = round2(sum(lines.map((line) => line.amount)))

	// Expense deductions per category (capped), applied on the category's
	// gross total. Caps are per taxpayer per category (e.g. employment 50%
	// max 100,000 THB in aggregate), so multiple lines of the same category
	// must be summed BEFORE the cap is applied.
	const grossByCategory = new Map<string, number>()
	for (const line of lines) {
		grossByCategory.set(line.code, (grossByCategory.get(line.code) ?? 0) + line.amount)
	}
	const expenseDeductions = round2(
		sum(
			[...grossByCategory].map(([code, amount]) => {
				const deduction = byCode.get(code)?.expenseDeduction ?? null
				if (deduction === null || amount <= 0) {
					return 0
				}
				const raw = amount * deduction.rate
				return deduction.cap === undefined ? raw : Math.min(raw, deduction.cap)
			}),
		),
	)

	const assessableIncome = round2(grossIncome - expenseDeductions)

	// Itemized deductions (Thai: ค่าลดหย่อน). Every line records
	// entered (pre-cap) vs applied (post-cap) so UIs can surface savings
	// and cap-bite without duplicating cap logic.
	const deductionLines: DeductionLine[] = []

	const pushLine = (code: string, label: LocalizedLabel, entered: number, applied: number): void => {
		deductionLines.push({
			code,
			label,
			entered: round2(entered),
			applied: round2(applied),
			capped: round2(entered) > round2(applied),
		})
	}

	const insuranceEff = round2(Math.min(input.deductions.insurance, CAP_INSURANCE))
	pushLine(
		"insurance",
		{ en: "Insurance premiums", th: "เบี้ยประกันภัย" },
		input.deductions.insurance,
		insuranceEff,
	)

	const mortgageEff = round2(Math.min(input.deductions.mortgageInterest, CAP_MORTGAGE_INTEREST))
	pushLine(
		"mortgageInterest",
		{ en: "Mortgage interest", th: "ดอกเบี้ยบ้าน" },
		input.deductions.mortgageInterest,
		mortgageEff,
	)

	const donationsCap = round2(CAP_DONATIONS_RATE * assessableIncome)
	const donationsEff = round2(Math.min(input.deductions.donations, donationsCap))
	pushLine(
		"donations",
		{ en: "Donations", th: "เงินบริจาค" },
		input.deductions.donations,
		donationsEff,
	)
	if (input.deductions.donations > donationsCap) {
		warnings.push(`Donations capped at ${donationsCap} (input ${input.deductions.donations})`)
	}

	// Retirement savings: per-fund caps first, then a combined cap.
	const employmentGross = round2(
		sum(lines.filter((line) => line.code === "employment").map((line) => line.amount)),
	)
	const ssfCapped = round2(Math.min(input.deductions.retirementSavings.ssf, CAP_SSF))
	const rmfCapped = round2(
		Math.min(input.deductions.retirementSavings.rmf, CAP_RMF_RATE * assessableIncome),
	)
	const providentCapped = round2(
		Math.min(input.deductions.retirementSavings.provident, CAP_PROVIDENT_RATE * employmentGross),
	)
	const retirementCombined = round2(ssfCapped + rmfCapped + providentCapped)
	if (retirementCombined > CAP_RETIREMENT_COMBINED) {
		warnings.push(`Retirement savings capped at 500,000 (combined input ${retirementCombined})`)
	}
	const retirementEff = round2(Math.min(retirementCombined, CAP_RETIREMENT_COMBINED))

	// One aggregate retirement line: the combined cap is what actually bites
	// across the three funds, so savings attribution per fund would be
	// order-dependent guesswork inside the group.
	pushLine(
		"retirement",
		{ en: "SSF / RMF / Provident", th: "SSF / RMF / กองทุนสำรองเลี้ยงชีพ" },
		round2(
			input.deductions.retirementSavings.ssf +
				input.deductions.retirementSavings.rmf +
				input.deductions.retirementSavings.provident,
		),
		retirementEff,
	)

	const itemizedDeductions = round2(
		insuranceEff + mortgageEff + donationsEff + retirementEff,
	)

	// Allowances apply only up to remaining income (via the max(0, ...) floor).
	const allowancesTotal = round2(
		input.allowances.personal * ALLOWANCE_PERSONAL +
			input.allowances.spouse * ALLOWANCE_SPOUSE +
			input.allowances.children * ALLOWANCE_CHILDREN +
			input.allowances.parents * ALLOWANCE_PARENTS +
			input.allowances.disabled * ALLOWANCE_DISABLED,
	)

	const taxableIncome = round2(
		Math.max(0, assessableIncome - itemizedDeductions - allowancesTotal),
	)

	// Progressive per-bracket computation.
	let from = 0
	const brackets: BracketBreakdown[] = BRACKETS.map((bracket, index) => {
		const taxableInBracket = round2(Math.max(0, Math.min(taxableIncome, bracket.upTo) - from))
		const tax = round2(taxableInBracket * bracket.rate)
		const breakdown: BracketBreakdown = {
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

	// Thai working tax credit (employment income only).
	let credit = 0
	if (employmentGross > 0) {
		if (employmentGross <= 150_000) {
			credit = 15_000
		} else if (employmentGross <= 300_000) {
			credit = Math.max(0, 15_000 - 0.5 * (employmentGross - 150_000))
		} else {
			credit = 0
		}
	}
	const credits = round2(Math.min(credit, taxLiability))

	const netTax = round2(Math.max(0, taxLiability - credits))

	// Rate of the highest bracket with taxable income in it.
	let marginalRate = 0
	for (const bracket of brackets) {
		if (bracket.taxableInBracket > 0) {
			marginalRate = bracket.rate
		}
	}

	const effectiveRate = assessableIncome === 0 ? 0 : netTax / assessableIncome
	const balance = round2(netTax - input.withheld - input.estimatedPaid)

	// Simplification warning for interest/dividend income.
	if (
		lines.some(
			(line) => (line.code === "interest" || line.code === "dividend") && line.amount > 0,
		)
	) {
		warnings.push("Interest 20,000 exemption and dividend tax credit not modeled in v1 (simplification)")
	}

	return {
		country: "TH",
		taxYear: TAX_YEAR,
		currency: CURRENCY,
		grossIncome,
		assessableIncome,
		expenseDeductions,
		itemizedDeductions,
		allowancesTotal,
		taxableIncome,
		taxLiability,
		credits,
		netTax,
		marginalRate,
		effectiveRate,
		balance,
		brackets,
		warnings,
		deductionLines,
	}
}

function validate(input: TaxInput): string[] {
	const problems: string[] = []

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

	const allowances = input.allowances
	checkNonNegativeFinite(allowances.personal, "allowances.personal count")
	checkNonNegativeFinite(allowances.spouse, "allowances.spouse count")
	checkNonNegativeFinite(allowances.children, "allowances.children count")
	checkNonNegativeFinite(allowances.parents, "allowances.parents count")
	checkNonNegativeFinite(allowances.disabled, "allowances.disabled count")
	const checkNonNegativeInteger = (value: number, label: string): void => {
		if (!Number.isInteger(value)) {
			problems.push(`${label} must be a whole number (got ${value})`)
		}
	}
	checkNonNegativeInteger(allowances.personal, "allowances.personal count")
	checkNonNegativeInteger(allowances.spouse, "allowances.spouse count")
	checkNonNegativeInteger(allowances.children, "allowances.children count")
	checkNonNegativeInteger(allowances.parents, "allowances.parents count")
	checkNonNegativeInteger(allowances.disabled, "allowances.disabled count")
	// RD rule: parents allowance covers at most 4 people (own + spouse's parents).
	if (Number.isInteger(allowances.parents) && allowances.parents > ALLOWANCE_PARENTS_MAX) {
		problems.push(`allowances.parents count must be at most ${ALLOWANCE_PARENTS_MAX} (own + spouse's parents)`)
	}

	const deductions = input.deductions
	checkNonNegativeFinite(deductions.insurance, "deductions.insurance")
	checkNonNegativeFinite(deductions.mortgageInterest, "deductions.mortgageInterest")
	checkNonNegativeFinite(deductions.donations, "deductions.donations")
	checkNonNegativeFinite(deductions.retirementSavings.ssf, "deductions.retirementSavings.ssf")
	checkNonNegativeFinite(deductions.retirementSavings.rmf, "deductions.retirementSavings.rmf")
	checkNonNegativeFinite(deductions.retirementSavings.provident, "deductions.retirementSavings.provident")

	checkNonNegativeFinite(input.withheld, "withheld")
	checkNonNegativeFinite(input.estimatedPaid, "estimatedPaid")

	// filingStatus is a US placeholder; silently ignored for TH (no error, by design).

	return problems
}

/** v1 simplifications, for docs and UI footnotes. */
const assumptions: LocalizedLabel[] = [
	{
		en: "Interest 20,000 THB exemption not modeled in v1",
		th: "v1 ยังไม่รองรับการยกเว้นดอกเบี้ย 20,000 บาท",
	},
	{
		en: "Dividend tax credit not modeled in v1",
		th: "v1 ยังไม่รองรับเครดิตภาษีเงินปันผล",
	},
	{
		en: "Section 40(4) exemptions not modeled in v1",
		th: "v1 ยังไม่รองรับการยกเว้นตามมาตรา 40(4)",
	},
	{
		en: "Provident fund cap simplified to 15% of gross employment income",
		th: "กองทุนสำรองเลี้ยงชีพคิดเพดาน 15% ของเงินเดือน",
	},
	{
		en: "Donations cap set at 10% of assessable income",
		th: "เงินบริจาคคิดเพดาน 10% ของรายได้หลังหักค่าใช้จ่าย",
	},
	{
		en: "Parent allowance counts are taken at face value — eligibility (age 60+, income ≤ 30,000 THB, being supported) is not verified",
		th: "จำนวนบิดามารดาที่กรอกถูกนับตามที่ระบุ — ระบบไม่ตรวจสอบเงื่อนไขสิทธิ (อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 30,000 บาท และอยู่ในความอุปการะ)",
	},
]

/** Family allowance definitions (Thai Revenue Department, PND91). */
const ALLOWANCE_DEFS: AllowanceDef[] = [
	{
		code: "personal",
		label: { en: "Taxpayer", th: "ผู้มีเงินได้" },
		amountPerPerson: ALLOWANCE_PERSONAL,
		condition: { en: "The taxpayer themself", th: "ตัวผู้มีเงินได้เอง" },
	},
	{
		code: "spouse",
		label: { en: "Spouse", th: "คู่สมรส" },
		amountPerPerson: ALLOWANCE_SPOUSE,
		condition: {
			en: "Spouse with little or no income, filing separately",
			th: "คู่สมรสไม่มีเงินได้หรือมีน้อย และยื่นแยกกัน",
		},
	},
	{
		code: "children",
		label: { en: "Children", th: "บุตร" },
		amountPerPerson: ALLOWANCE_CHILDREN,
		condition: {
			en: "Each child (incl. adopted, max 3 for adoption)",
			th: "บุตรแต่ละคน (รวมบุตรบุญธรรม ได้ไม่เกิน 3 คน)",
		},
	},
	{
		code: "parents",
		label: { en: "Parents", th: "บิดามารดา" },
		amountPerPerson: ALLOWANCE_PARENTS,
		condition: {
			en: "Own and spouse's parents, age 60+, income ≤ 30,000 THB/year (max 4)",
			th: "บิดามารดาของตนและคู่สมรส อายุ 60 ปีขึ้นไป เงินได้ไม่เกิน 30,000 บาท/ปี (สูงสุด 4 คน)",
		},
	},
	{
		code: "disabled",
		label: { en: "Disabled dependents", th: "ผู้พิการ" },
		amountPerPerson: ALLOWANCE_DISABLED,
		condition: {
			en: "Dependent disabled persons, income ≤ 30,000 THB/year",
			th: "บุคคลพิการที่อุปการะเลี้ยงดู เงินได้ไม่เกิน 30,000 บาท/ปี",
		},
	},
]

export const thai2026System: TaxSystem = {
	country: "TH",
	taxYear: TAX_YEAR,
	validate,
	compute,
	assumptions,
	allowanceDefs: ALLOWANCE_DEFS,
	// Deep-frozen as the API contract (consumers must never mutate config).
	// Note: TH config holds defensive COPIES of the module-level
	// BRACKETS/INCOME_CATEGORIES that compute() reads, so the engine data is
	// unreachable from the public surface regardless; freezing additionally
	// guards the copies themselves and matches the US system's pattern for
	// when TH config starts exposing shared instances.
	config: deepFreeze({
		country: "TH",
		taxYear: TAX_YEAR,
		currency: CURRENCY,
		brackets: BRACKETS.map((bracket) => ({ ...bracket })),
		incomeCategories: INCOME_CATEGORIES.map((category) => ({ ...category })),
	}),
}
