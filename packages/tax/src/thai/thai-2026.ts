/**
 * Thailand — individual income tax (PND 90/91 style), tax year 2026.
 *
 * Full statutory calculation rules:
 * - Progressive brackets 0% to 35%
 * - Section 40 income categories with statutory expense deductions
 * - Section 48(2) minimum alternative tax (0.5% on non-employment income > 5,000 THB)
 * - Section 47 bis dividend tax credit (gross-up and tax credit against liability)
 * - Household allowances (including 2nd+ child born >= 2018)
 * - Social security, health insurance, parent health insurance, prenatal care
 * - Thai ESG fund (separate from 500k ceiling)
 * - Long-term retirement pool (SSF, RMF, Provident, Pension Insurance, NSF, GPF) with combined 500k cap
 * - Unused general life insurance absorption by pension life insurance
 * - Double-deduction donations (2x) for education/public healthcare
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

/** Thai Revenue Department income categories (Section 40 style). */
const INCOME_CATEGORIES: IncomeCategory[] = [
	{
		code: "employment",
		label: { en: "Employment (40(1), 40(2))", th: "เงินเดือนและค่าจ้าง (40(1), 40(2))" },
		expenseDeduction: { rate: 0.5, cap: 100_000 },
	},
	{
		code: "copyright",
		label: { en: "Copyright & Royalties (40(3))", th: "ค่าลิขสิทธิ์และสิทธิ์ในทรัพย์สินทางปัญญา (40(3))" },
		expenseDeduction: { rate: 0.5, cap: 100_000 },
	},
	{
		code: "freelance",
		label: { en: "Freelance & Liberal Professions (40(6))", th: "วิชาชีพอิสระ (40(6))" },
		expenseDeduction: { rate: 0.3 },
	},
	{
		code: "medical",
		label: { en: "Medical & Healing Arts (40(6))", th: "การประกอบโรคศิลปะ (40(6))" },
		expenseDeduction: { rate: 0.6 },
	},
	{
		code: "contractor",
		label: { en: "Contracting of Work (40(7))", th: "รับเหมาค่าแรงและของ (40(7))" },
		expenseDeduction: { rate: 0.6 },
	},
	{
		code: "rental",
		label: { en: "Rental (40(5))", th: "ค่าเช่าทรัพย์สิน (40(5))" },
		expenseDeduction: { rate: 0.3 },
	},
	{
		code: "dividend",
		label: { en: "Dividends (40(4)(b))", th: "เงินปันผล (40(4)(ข))" },
		expenseDeduction: null,
	},
	{
		code: "interest",
		label: { en: "Interest (40(4)(a))", th: "ดอกเบี้ย (40(4)(ก))" },
		expenseDeduction: null,
	},
	{
		code: "other",
		label: { en: "Other Business & Commerce (40(8))", th: "เงินได้อื่น ๆ (40(8))" },
		expenseDeduction: { rate: 0.3 },
	},
]

/** Household allowances per person (THB). */
const ALLOWANCE_PERSONAL = 60_000
const ALLOWANCE_SPOUSE = 60_000
const ALLOWANCE_CHILDREN = 30_000
const ALLOWANCE_CHILDREN_SECOND_PLUS_2018 = 60_000
const ALLOWANCE_PARENTS = 30_000
const ALLOWANCE_DISABLED = 60_000
/** RD rule: parents allowance covers at most 4 people (own + spouse's parents). */
const ALLOWANCE_PARENTS_MAX = 4

/** Itemized deduction caps (THB). */
const CAP_LIFE_AND_HEALTH_COMBINED = 100_000
const CAP_HEALTH_INSURANCE = 25_000
const CAP_PARENT_HEALTH_INSURANCE = 15_000
const CAP_SOCIAL_SECURITY = 9_000
const CAP_PRENATAL_AND_CHILDBIRTH = 60_000
const CAP_MORTGAGE_INTEREST = 100_000
const CAP_DONATIONS_RATE = 0.1
const CAP_EASY_E_RECEIPT = 50_000

/** Thai ESG (separate from the 500,000 THB retirement pool). */
const CAP_THAI_ESG_MAX = 300_000
const CAP_THAI_ESG_RATE = 0.3

/** Long-term retirement pool (combined 500,000 THB cap). */
const CAP_RETIREMENT_COMBINED = 500_000
const CAP_SSF = 200_000
const CAP_SSF_RATE = 0.3
const CAP_RMF_RATE = 0.3
const CAP_PROVIDENT_RATE = 0.15
const CAP_PENSION_INSURANCE = 200_000
const CAP_PENSION_INSURANCE_RATE = 0.15
const CAP_NSF = 30_000
const CAP_GPF_RATE = 0.3

/** Section 48(2) Minimum Alternative Tax (ภาษีขั้นต่ำ 0.5%). */
const SECTION_48_THRESHOLD = 120_000
const SECTION_48_RATE = 0.005
const SECTION_48_EXEMPT_MAX = 5_000

/** All money fields in results are rounded to 2 decimals. */
const round2 = (value: number): number => Math.round(value * 100) / 100

const sum = (values: number[]): number => values.reduce((acc, value) => acc + value, 0)

function compute(input: TaxInput): TaxResult {
	const warnings: string[] = []

	const byCode = new Map(INCOME_CATEGORIES.map((category) => [category.code, category]))

	// Dividend Tax Credit (Section 47 bis):
	// Gross-up = dividendAmount * (citRate / (1 - citRate)).
	// Added to gross income and credited against tax liability.
	let totalDividendTaxCredit = 0
	let hasDividendWithoutCit = false
	let hasInterest = false

	const processedLines = input.incomes.map((line) => {
		let amount = line.amount
		if (line.categoryCode === "dividend") {
			if (typeof line.citRate === "number" && line.citRate > 0) {
				const credit = round2(line.amount * (line.citRate / (1 - line.citRate)))
				totalDividendTaxCredit = round2(totalDividendTaxCredit + credit)
				amount = round2(amount + credit)
			} else if (line.amount > 0) {
				hasDividendWithoutCit = true
			}
		} else if (line.categoryCode === "interest" && line.amount > 0) {
			hasInterest = true
		}

		return {
			code: line.categoryCode,
			amount,
			category: byCode.get(line.categoryCode),
		}
	})

	const grossIncome = round2(sum(processedLines.map((line) => line.amount)))

	// Expense deductions per category (capped), applied on category total.
	const grossByCategory = new Map<string, number>()
	for (const line of processedLines) {
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

	// Itemized deductions (Thai: ค่าลดหย่อน).
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

	// 1. Social Security (ประกันสังคม)
	const socialSecurityEntered = input.deductions.socialSecurity ?? 0
	const socialSecurityEff = round2(Math.min(socialSecurityEntered, CAP_SOCIAL_SECURITY))
	if (socialSecurityEntered > 0) {
		pushLine(
			"socialSecurity",
			{ en: "Social Security", th: "เงินสมทบกองทุนประกันสังคม" },
			socialSecurityEntered,
			socialSecurityEff,
		)
	}

	// 2. Life & Health Insurance (ประกันชีวิตและสุขภาพ)
	const lifeEntered = input.deductions.insurance
	const healthEntered = input.deductions.healthInsurance ?? 0
	const healthEff = round2(Math.min(healthEntered, CAP_HEALTH_INSURANCE))

	const combinedLifeHealthEffective = round2(
		Math.min(lifeEntered + healthEff, CAP_LIFE_AND_HEALTH_COMBINED),
	)

	// Keep existing "insurance" line contract for consumers
	pushLine(
		"insurance",
		{ en: "Insurance premiums", th: "เบี้ยประกันชีวิต" },
		lifeEntered,
		round2(Math.min(lifeEntered, CAP_LIFE_AND_HEALTH_COMBINED)),
	)

	if (healthEntered > 0) {
		pushLine(
			"healthInsurance",
			{ en: "Health insurance", th: "เบี้ยประกันสุขภาพตนเอง" },
			healthEntered,
			healthEff,
		)
	}

	// Unused room in the 100k life insurance cap that pension insurance can absorb
	const unusedLifeCap = Math.max(0, CAP_LIFE_AND_HEALTH_COMBINED - combinedLifeHealthEffective)

	// 3. Parents' Health Insurance
	const parentHealthEntered = input.deductions.parentHealthInsurance ?? 0
	const parentHealthEff = round2(Math.min(parentHealthEntered, CAP_PARENT_HEALTH_INSURANCE))
	if (parentHealthEntered > 0) {
		pushLine(
			"parentHealthInsurance",
			{ en: "Parents' health insurance", th: "เบี้ยประกันสุขภาพบิดามารดา" },
			parentHealthEntered,
			parentHealthEff,
		)
	}

	// 4. Prenatal care and childbirth
	const prenatalEntered = input.deductions.prenatalAndChildbirth ?? 0
	const prenatalEff = round2(Math.min(prenatalEntered, CAP_PRENATAL_AND_CHILDBIRTH))
	if (prenatalEntered > 0) {
		pushLine(
			"prenatalAndChildbirth",
			{ en: "Prenatal and childbirth", th: "ค่าฝากครรภ์และคลอดบุตร" },
			prenatalEntered,
			prenatalEff,
		)
	}

	// 5. Mortgage Interest
	const mortgageEff = round2(Math.min(input.deductions.mortgageInterest, CAP_MORTGAGE_INTEREST))
	pushLine(
		"mortgageInterest",
		{ en: "Mortgage interest", th: "ดอกเบี้ยกู้ยืมเพื่อซื้อที่อยู่อาศัย" },
		input.deductions.mortgageInterest,
		mortgageEff,
	)

	// 6. Economic Stimulus / Easy E-Receipt
	const easyEReceiptEntered = input.deductions.easyEReceipt ?? 0
	const easyEReceiptEff = round2(Math.min(easyEReceiptEntered, CAP_EASY_E_RECEIPT))
	if (easyEReceiptEntered > 0) {
		pushLine(
			"easyEReceipt",
			{ en: "Easy E-Receipt", th: "Easy E-Receipt / โครงการกระตุ้นเศรษฐกิจ" },
			easyEReceiptEntered,
			easyEReceiptEff,
		)
	}

	// 7. Thai ESG Fund (Separate from the 500,000 THB retirement pool)
	const thaiEsgEntered = input.deductions.thaiESG ?? 0
	const thaiEsgCap = round2(Math.min(CAP_THAI_ESG_MAX, CAP_THAI_ESG_RATE * assessableIncome))
	const thaiEsgEff = round2(Math.min(thaiEsgEntered, thaiEsgCap))
	if (thaiEsgEntered > 0) {
		pushLine(
			"thaiESG",
			{ en: "Thai ESG", th: "กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG)" },
			thaiEsgEntered,
			thaiEsgEff,
		)
	}

	// 8. Long-term Retirement Savings Pool (Combined 500,000 THB ceiling)
	const employmentGross = round2(
		sum(processedLines.filter((line) => line.code === "employment").map((line) => line.amount)),
	)
	const ssfCapped = round2(
		Math.min(input.deductions.retirementSavings.ssf, CAP_SSF, CAP_SSF_RATE * assessableIncome),
	)
	const rmfCapped = round2(
		Math.min(input.deductions.retirementSavings.rmf, CAP_RMF_RATE * assessableIncome),
	)
	const providentCapped = round2(
		Math.min(input.deductions.retirementSavings.provident, CAP_PROVIDENT_RATE * employmentGross),
	)

	// Pension Life Insurance
	const pensionEntered = input.deductions.retirementSavings.pensionInsurance ?? 0
	const pensionToLife = Math.min(pensionEntered, unusedLifeCap)
	const pensionRemainder = pensionEntered - pensionToLife
	const pensionInPoolCapped = round2(
		Math.min(
			pensionRemainder,
			CAP_PENSION_INSURANCE,
			CAP_PENSION_INSURANCE_RATE * assessableIncome,
		),
	)

	// NSF (กอช.) & GPF (กบข.)
	const nsfCapped = round2(Math.min(input.deductions.retirementSavings.nsf ?? 0, CAP_NSF))
	const gpfCapped = round2(
		Math.min(input.deductions.retirementSavings.gpf ?? 0, CAP_GPF_RATE * employmentGross),
	)

	const retirementInsidePool = round2(
		ssfCapped + rmfCapped + providentCapped + pensionInPoolCapped + nsfCapped + gpfCapped,
	)
	if (retirementInsidePool > CAP_RETIREMENT_COMBINED) {
		warnings.push(`Retirement savings capped at 500,000 (combined input ${retirementInsidePool})`)
	}
	const retirementEff = round2(Math.min(retirementInsidePool, CAP_RETIREMENT_COMBINED))

	const totalRetirementEntered = round2(
		input.deductions.retirementSavings.ssf +
			input.deductions.retirementSavings.rmf +
			input.deductions.retirementSavings.provident +
			(input.deductions.retirementSavings.pensionInsurance ?? 0) +
			(input.deductions.retirementSavings.nsf ?? 0) +
			(input.deductions.retirementSavings.gpf ?? 0),
	)

	pushLine(
		"retirement",
		{
			en: "Retirement savings (SSF / RMF / Provident / Pension / NSF / GPF)",
			th: "กองทุนเพื่อการเกษียณ (SSF / RMF / กองทุนสำรองเลี้ยงชีพ / บำนาญ / กอช. / กบข.)",
		},
		totalRetirementEntered,
		round2(retirementEff + pensionToLife),
	)

	// 9. Donations (including 2x double deductions)
	const regularDonations = input.deductions.donations
	const doubleDonations = input.deductions.doubleDonations ?? 0
	const effectiveDonationsTotal = round2(regularDonations + 2 * doubleDonations)
	const donationsCap = round2(CAP_DONATIONS_RATE * assessableIncome)
	const donationsEff = round2(Math.min(effectiveDonationsTotal, donationsCap))

	pushLine(
		"donations",
		{ en: "Donations", th: "เงินบริจาค" },
		effectiveDonationsTotal,
		donationsEff,
	)

	if (effectiveDonationsTotal > donationsCap) {
		if (doubleDonations > 0) {
			warnings.push(
				`Donations capped at ${donationsCap} (effective 2x input ${effectiveDonationsTotal})`,
			)
		} else {
			warnings.push(`Donations capped at ${donationsCap} (input ${input.deductions.donations})`)
		}
	}

	const itemizedDeductions = round2(
		combinedLifeHealthEffective +
			pensionToLife +
			socialSecurityEff +
			parentHealthEff +
			prenatalEff +
			mortgageEff +
			donationsEff +
			retirementEff +
			thaiEsgEff +
			easyEReceiptEff,
	)

	// Family allowances
	const childrenSecondPlus = input.allowances.childrenSecondPlus2018 ?? 0
	const allowancesTotal = round2(
		input.allowances.personal * ALLOWANCE_PERSONAL +
			input.allowances.spouse * ALLOWANCE_SPOUSE +
			input.allowances.children * ALLOWANCE_CHILDREN +
			childrenSecondPlus * ALLOWANCE_CHILDREN_SECOND_PLUS_2018 +
			input.allowances.parents * ALLOWANCE_PARENTS +
			input.allowances.disabled * ALLOWANCE_DISABLED,
	)

	const taxableIncome = round2(
		Math.max(0, assessableIncome - itemizedDeductions - allowancesTotal),
	)

	// Progressive per-bracket computation
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

	const progressiveTax = round2(sum(brackets.map((bracket) => bracket.tax)))

	// Section 48(2) Minimum Alternative Tax:
	// For gross income from non-employment sources (Section 40(2)-(8)) >= 120,000 THB,
	// calculate 0.5% tax. If > 5,000 THB, compare with progressive bracket tax.
	const nonEmploymentGross = round2(
		sum(processedLines.filter((l) => l.code !== "employment").map((l) => l.amount)),
	)
	let section48Tax = 0
	if (nonEmploymentGross >= SECTION_48_THRESHOLD) {
		const rawSection48 = nonEmploymentGross * SECTION_48_RATE
		if (rawSection48 > SECTION_48_EXEMPT_MAX) {
			section48Tax = round2(rawSection48)
		}
	}

	let taxLiability = progressiveTax
	if (section48Tax > progressiveTax) {
		taxLiability = section48Tax
		warnings.push("Section 48(2) minimum tax applied (0.5% of non-employment income > 5,000 THB)")
	}

	// Thai working tax credit (employment income only)
	let workingCredit = 0
	if (employmentGross > 0) {
		if (employmentGross <= 150_000) {
			workingCredit = 15_000
		} else if (employmentGross <= 300_000) {
			workingCredit = Math.max(0, 15_000 - 0.5 * (employmentGross - 150_000))
		} else {
			workingCredit = 0
		}
	}

	const totalAvailableCredits = round2(workingCredit + totalDividendTaxCredit)
	const credits = round2(Math.min(totalAvailableCredits, taxLiability))
	const netTax = round2(Math.max(0, taxLiability - credits))

	// Rate of highest bracket touched
	let marginalRate = 0
	for (const bracket of brackets) {
		if (bracket.taxableInBracket > 0) {
			marginalRate = bracket.rate
		}
	}

	const effectiveRate = assessableIncome === 0 ? 0 : netTax / assessableIncome
	const balance = round2(netTax - input.withheld - input.estimatedPaid)

	// Note on unmodeled exemptions
	if (hasInterest || hasDividendWithoutCit) {
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
		progressiveTax,
		section48Tax,
		taxLiability,
		credits,
		creditBreakdown: {
			workingCredit: round2(workingCredit),
			dividendTaxCredit: totalDividendTaxCredit,
		},
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
		if (line.citRate !== undefined) {
			if (!Number.isFinite(line.citRate) || line.citRate < 0 || line.citRate >= 1) {
				problems.push(`CIT rate for dividend must be a number between 0 and 1 (got ${line.citRate})`)
			}
		}
	}

	const allowances = input.allowances
	checkNonNegativeFinite(allowances.personal, "allowances.personal count")
	checkNonNegativeFinite(allowances.spouse, "allowances.spouse count")
	checkNonNegativeFinite(allowances.children, "allowances.children count")
	if (allowances.childrenSecondPlus2018 !== undefined) {
		checkNonNegativeFinite(allowances.childrenSecondPlus2018, "allowances.childrenSecondPlus2018 count")
	}
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
	if (allowances.childrenSecondPlus2018 !== undefined) {
		checkNonNegativeInteger(allowances.childrenSecondPlus2018, "allowances.childrenSecondPlus2018 count")
	}
	checkNonNegativeInteger(allowances.parents, "allowances.parents count")
	checkNonNegativeInteger(allowances.disabled, "allowances.disabled count")

	if (Number.isInteger(allowances.parents) && allowances.parents > ALLOWANCE_PARENTS_MAX) {
		problems.push(
			`allowances.parents count must be at most ${ALLOWANCE_PARENTS_MAX} (own + spouse's parents)`,
		)
	}

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

/** Model facts and simplifications, for docs and UI footnotes. */
const assumptions: LocalizedLabel[] = [
	{
		en: "Interest 20,000 THB exemption not modeled in v1",
		th: "v1 ยังไม่รองรับการยกเว้นดอกเบี้ย 20,000 บาท",
	},
	{
		en: "Dividend tax credit is applied when CIT rate is specified on dividend line",
		th: "เครดิตภาษีเงินปันผลคำนวณตามอัตราภาษีเงินได้นิติบุคคลที่ระบุในรายการเงินปันผล",
	},
	{
		en: "Section 48(2) minimum 0.5% tax applies on non-employment income exceeding 120,000 THB when tax > 5,000 THB",
		th: "ภาษีขั้นต่ำตามมาตรา 48(2) อัตรา 0.5% คำนวณจากเงินได้ที่ไม่ใช่เงินเดือนที่เกิน 120,000 บาท เมื่อคำนวณแล้วเกิน 5,000 บาท",
	},
	{
		en: "Thai ESG fund deduction capped at 30% of assessable income (max 300,000 THB), independent of retirement pool",
		th: "กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG) หักได้ไม่เกิน 30% ของเงินได้พึงประเมิน (สูงสุด 300,000 บาท) แยกจากเพดานเกษียณ",
	},
	{
		en: "Retirement savings pool (SSF, RMF, Provident, Pension, NSF, GPF) combined cap set at 500,000 THB",
		th: "กลุ่มเงินออมเพื่อการเกษียณ (SSF, RMF, กองทุนสำรองเลี้ยงชีพ, บำนาญ, กอช., กบข.) รวมกันไม่เกิน 500,000 บาท",
	},
	{
		en: "Donations cap set at 10% of assessable income (double deductions count as 2x)",
		th: "เงินบริจาคคิดเพดาน 10% ของรายได้หลังหักค่าใช้จ่าย (บริจาค 2 เท่าคิดมูลค่าสองเท่าก่อนหัก)",
	},
	{
		en: "Parent allowance counts are taken at face value — eligibility (age 60+, income <= 30,000 THB) is not verified",
		th: "จำนวนบิดามารดาที่กรอกถูกนับตามที่ระบุ — ระบบไม่ตรวจสอบเงื่อนไขสิทธิ์ (อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 30,000 บาท)",
	},
]

/** Family allowance definitions (Thai Revenue Department, PND90/91). */
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
		label: { en: "Children (1st child / born before 2018)", th: "บุตร (คนแรก หรือเกิดก่อน พ.ศ. 2561)" },
		amountPerPerson: ALLOWANCE_CHILDREN,
		condition: {
			en: "First child or legitimate child born before 2018",
			th: "บุตรคนแรก หรือบุตรชอบด้วยกฎหมายที่เกิดก่อน พ.ศ. 2561",
		},
	},
	{
		code: "childrenSecondPlus2018",
		label: { en: "2nd+ Child (born 2018 onwards)", th: "บุตรคนที่ 2 ขึ้นไป (เกิด พ.ศ. 2561 เป็นต้นไป)" },
		amountPerPerson: ALLOWANCE_CHILDREN_SECOND_PLUS_2018,
		condition: {
			en: "Second child onwards born in 2018 (2561 BE) or later",
			th: "บุตรชอบด้วยกฎหมายคนที่ 2 เป็นต้นไป ที่เกิดในหรือหลังปี พ.ศ. 2561",
		},
	},
	{
		code: "parents",
		label: { en: "Parents", th: "บิดามารดา" },
		amountPerPerson: ALLOWANCE_PARENTS,
		condition: {
			en: "Parents of taxpayer or spouse, age 60+, income <= 30k (max 4)",
			th: "บิดามารดาของผู้มีเงินได้หรือคู่สมรส อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 3 หมื่น (ไม่เกิน 4 คน)",
		},
	},
	{
		code: "disabled",
		label: { en: "Disabled dependents", th: "ผู้พิการหรือทุพพลภาพ" },
		amountPerPerson: ALLOWANCE_DISABLED,
		condition: {
			en: "Disabled persons in taxpayer's care (with disability card)",
			th: "ผู้พิการที่อยู่ในความอุปการะ (มีบัตรประจำตัวคนพิการ)",
		},
	},
]

export const thai2026System: TaxSystem = deepFreeze({
	country: "TH",
	taxYear: TAX_YEAR,
	validate,
	compute,
	assumptions,
	config: {
		country: "TH",
		taxYear: TAX_YEAR,
		currency: CURRENCY,
		brackets: BRACKETS,
		incomeCategories: INCOME_CATEGORIES,
	},
	allowanceDefs: ALLOWANCE_DEFS,
})
