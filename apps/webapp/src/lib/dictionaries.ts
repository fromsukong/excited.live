/**
 * User-facing UI strings — one source of truth, bilingual { en, th } (EN first).
 * Keys are stable IDs; selection state uses keys, never text.
 */
import { createTranslator, type Dictionary, type Locale } from "@excited-live/i18n"

export const strings: Dictionary = {
	"app.title": { en: "excited.live — Plan the life you're excited to live", th: "excited.live — วางแผนชีวิตที่คุณตื่นเต้นจะใช้" },
	"app.description": {
		en: "Simulate your life plan — income, spending, tax and savings, projected in real numbers.",
		th: "จำลองแผนชีวิตของคุณ รายรับ ค่าใช้จ่าย ภาษี และการออม คำนวณเป็นตัวเลขจริง",
	},

	"nav.hello": { en: "Your plan, live", th: "แผนของคุณ สด ๆ" },
	"nav.synced": { en: "Numbers update as you type", th: "ตัวเลขอัปเดตทันทีที่แก้" },
	"locale.toggle": { en: "Switch language", th: "เปลี่ยนภาษา" },
	"locale.en": { en: "EN", th: "EN" },
	"locale.th": { en: "ไทย", th: "ไทย" },

	// Sections
	"section.inputs": { en: "Your plan", th: "แผนของคุณ" },
	"section.inputs.desc": {
		en: "Every number below is editable — the chart and summary update instantly.",
		th: "ตัวเลขทุกช่องแก้ได้ กราฟและสรุปจะอัปเดตทันที",
	},
	"section.chart": { en: "Net worth over time", th: "มูลค่าสุทธิตลอดเวลา" },
	"section.summaryLong": { en: "Long term", th: "ระยะยาว" },
	"section.summaryThisYear": { en: "This year", th: "ปีนี้" },

	// Global inputs
	"input.startYear": { en: "Start year", th: "ปีเริ่มต้น" },
	"input.birthYear": { en: "Birth year", th: "ปีเกิด" },
	"input.inflation": { en: "Inflation", th: "เงินเฟ้อ" },
	"input.efMonths": { en: "Emergency fund (months)", th: "เงินสำรองฉุกเฉิน (เดือน)" },
	"input.retirementYear": { en: "Retirement year", th: "ปีเกษียณ" },
	"input.retirementMonthly": { en: "Retirement spend (monthly, today's money)", th: "ค่าใช้จ่ายหลังเกษียณ (ต่อเดือน)" },
	"input.horizon": { en: "Years to project", th: "จำนวนปีที่คำนวณ" },

	// Rows
	"incomes.heading": { en: "Income", th: "รายได้" },
	"expenses.heading": { en: "Expenses", th: "ค่าใช้จ่าย" },
	"row.label": { en: "Name", th: "ชื่อ" },
	"row.amount": { en: "Per year (฿)", th: "ต่อปี (บาท)" },
	"row.startYear": { en: "Start", th: "เริ่ม" },
	"row.endYear": { en: "End (blank = forever)", th: "จบ (ว่าง = ตลอดไป)" },
	"row.growth": { en: "Growth", th: "เติบโต" },
	"growth.inflation": { en: "Inflation", th: "ตามเงินเฟ้อ" },
	"growth.fixed": { en: "Fixed", th: "คงที่" },
	"growth.override": { en: "Custom %", th: "กำหนดเอง %" },
	"row.growthRate": { en: "Growth %", th: "อัตราเติบโต %" },
	"row.deductible": { en: "Deductible", th: "ลดหย่อนภาษี" },
	"deductible.none": { en: "No", th: "ไม่" },
	"deductible.mortgageInterest": { en: "Mortgage", th: "ดอกเบี้ยบ้าน" },
	"row.add": { en: "Add row", th: "เพิ่มแถว" },
	"row.remove": { en: "Remove", th: "ลบ" },

	// Wallets
	"wallets.split": { en: "Savings split", th: "สัดส่วนการออม" },
	"wallets.rates": { en: "Return rates", th: "อัตราผลตอบแทน" },
	"wallets.starting": { en: "Starting balances", th: "ยอดเริ่มต้น" },
	"wallet.emergency": { en: "Emergency fund", th: "เงินสำรองฉุกเฉิน" },
	"wallet.goal": { en: "Goal savings", th: "เงินออมเป้าหมาย" },
	"wallet.nontax": { en: "Investments", th: "การลงทุน" },
	"wallet.taxAdvantaged": { en: "ThaiESG / RMF", th: "ThaiESG / RMF" },

	// Summary — long term
	"summary.runsOut": { en: "Money runs out", th: "เงินหมดปี" },
	"summary.runsOut.never": { en: "Never — money lasts the whole plan", th: "ไม่หมด — เงินพอตลอดแผน" },
	"summary.retirement.funded": { en: "Retirement funded", th: "เกษียณได้" },
	"summary.retirement.short": { en: "Retirement short", th: "เกษียณไม่พอ" },
	"summary.retirement.left": { en: "left at {year}", th: "เหลือ {year}" },
	"summary.retirement.runsOutAt": { en: "runs out {year}", th: "เงินหมด {year}" },
	"summary.maxForever": { en: "Max forever spend", th: "ใช้ได้ตลอดไปสูงสุด" },
	"summary.goals": { en: "Goal checks", th: "ตรวจเป้าหมาย" },
	"summary.goals.none": { en: "No goals yet", th: "ยังไม่มีเป้าหมาย" },
	"summary.goal.onTrack": { en: "on track", th: "กำลังไปได้ดี" },
	"summary.goal.short": { en: "short {amount} in {year}", th: "ขาด {amount} ในปี {year}" },

	// Summary — this year
	"summary.optimizer.recommended": { en: "Recommended ThaiESG / RMF", th: "แนะนำลง ThaiESG / RMF" },
	"summary.optimizer.taxSaved": { en: "Tax saved this year", th: "ประหยัดภาษีปีนี้" },
	"summary.optimizer.cutoffNote": { en: "Stops when extra baht saves less than 15% in tax", th: "หยุดเมื่อบาทที่ลงเพิ่ม ประหยัดภาษีน้อยกว่า 15%" },
	"summary.paths.fund": { en: "in ThaiESG / RMF becomes", th: "ใน ThaiESG / RMF จะกลายเป็น" },
	"summary.paths.taxable": { en: "in taxable S&P 500 becomes", th: "ใน S&P 500 (เสียภาษี) จะกลายเป็น" },
	"summary.paths.gap": { en: "advantage", th: "ได้เปรียบ" },

	// Footer
	"footer.disclaimer": {
		en: "Assumptions: TH 2026 tax, nominal averages, ThaiESG/RMF redemption tax-free. Prove-of-concept demo.",
		th: "สมมติฐาน: ภาษีไทย 2569 ค่าเฉลี่ยระยะยาว ถอน ThaiESG/RMF ไม่เสียภาษี ตัวอย่างเพื่อทดลอง",
	},
	"a11y.locale": { en: "Language", th: "ภาษา" },
	"a11y.netWorthChart": { en: "Net worth projection chart", th: "แผนภูมิมูลค่าสุทธิ" },
}

/** Optional per-locale overrides on top of `strings` (none needed yet). */
export const thOverrides: Dictionary = {}

/** Build a translator over the UI strings for a locale (usable outside React). */
export function getTranslator(locale: Locale) {
	return createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)
}
