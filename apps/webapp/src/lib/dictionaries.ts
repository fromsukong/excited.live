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
	"plan.heading.full.ok": { en: "Your plan is on track", th: "แผนของคุณกำลังไปได้ดี" },
	"plan.heading.full.risk": { en: "Your plan needs work", th: "แผนของคุณต้องปรับ" },
	"locale.en": { en: "EN", th: "EN" },
	"locale.th": { en: "ไทย", th: "ไทย" },

	// Old-layout chrome (kept per Prame — chart left, plan info right)
	"plan.snapshotDate": { en: "Plan snapshot · this year", th: "ภาพรวมแผน · ปีนี้" },
	"plan.heading.prefix": { en: "Your plan is", th: "แผนของคุณ" },
	"plan.heading.status": { en: "on track", th: "กำลังไปได้ดี" },
	"plan.heading.needsWork": { en: "needs attention", th: "ควรปรับ" },
	"metric.netWorth": { en: "Net worth", th: "มูลค่าสุทธิ" },
	"metric.cashFlow": { en: "Cash flow", th: "กระแสเงินสด" },
	"period.all": { en: "All", th: "ทั้งหมด" },
	"chart.aria.netWorth": { en: "Net worth projection chart", th: "แผนภูมิมูลค่าสุทธิ" },
	"chart.aria.cashFlow": { en: "Cash flow projection chart", th: "แผนภูมิกระแสเงินสด" },
	"a11y.chartMetric": { en: "Chart metric", th: "ตัวชี้วัดของแผนภูมิ" },
	"a11y.chartPeriod": { en: "Chart period", th: "ช่วงเวลาของแผนภูมิ" },
	"a11y.financialSnapshot": { en: "Financial snapshot", th: "ภาพรวมการเงิน" },
	"a11y.planActions": { en: "Plan details", th: "รายละเอียดแผน" },

	// Left column financial rows (engine-driven)
	"metric.netWorthValue": { en: "Net Worth", th: "มูลค่าสุทธิ" },
	"metric.changeInNetWorth": { en: "Change in Net Worth", th: "การเปลี่ยนแปลงมูลค่าสุทธิ" },
	"metric.liquidNetWorth": { en: "Liquid Net Worth", th: "มูลค่าสุทธิสภาพคล่อง" },
	"metric.withdrawals": { en: "Withdrawals", th: "เงินถอน" },
	"metric.withdrawalRate": { en: "Withdrawal Rate", th: "อัตราการถอน" },
	"metric.income": { en: "Income", th: "รายได้" },
	"metric.taxableIncome": { en: "Taxable Income", th: "รายได้สุทธิที่ต้องเสียภาษี" },
	"metric.taxes": { en: "Taxes", th: "ภาษี" },
	"metric.effectiveTaxRate": { en: "Effective Tax Rate", th: "อัตราภาษีเฉลี่ย" },
	"metric.spending": { en: "Spending", th: "การใช้จ่าย" },
	"metric.expenses": { en: "Expenses", th: "ค่าใช้จ่าย" },
	"metric.savingsRate": { en: "Savings Rate", th: "อัตราการออม" },
	"metric.taxBalance": { en: "Tax Balance", th: "ยอดภาษีคงค้าง" },

	// Right column — plan summary card
	"plan.actions": { en: "Plan", th: "แผน" },
	"plan.lastSyncedToday": { en: "Recomputed just now", th: "คำนวณใหม่เมื่อสักครู่" },
	"plan.keepCurrent": { en: "Every input is live", th: "ทุกตัวเลขแก้ได้สด ๆ" },
	"plan.summaryBody": {
		en: "Edit any input below — the chart, your numbers, and this plan update instantly.",
		th: "แก้ตัวเลขด้านล่างได้เลย กราฟ ตัวเลข และแผนจะอัปเดตทันที",
	},

	// Right column — info rows (engine answers)
	"info.eyebrow": { en: "What the plan says", th: "แผนบอกอะไร" },
	"info.heading": { en: "Your answers", th: "คำตอบของคุณ" },
	"info.count": { en: "6 answers", th: "6 คำตอบ" },
	"info.retirement": { en: "Retirement", th: "เกษียณ" },
	"info.retirement.funded": { en: "funded", th: "พอ" },
	"info.retirement.short": { en: "short", th: "ไม่พอ" },
	"info.retirement.left": { en: "{amount} left at {year}", th: "เหลือ {amount} ถึงปี {year}" },
	"info.retirement.runsOut": { en: "money runs out {year}", th: "เงินหมดปี {year}" },
	"info.runsOut": { en: "Money runs out", th: "เงินหมดปี" },
	"info.runsOut.never": { en: "never", th: "ไม่หมด" },
	"info.runsOut.desc.never": { en: "covers the whole plan", th: "พอตลอดทั้งแผน" },
	"info.runsOut.desc.year": { en: "first short year", th: "ปีแรกที่เงินไม่พอ" },
	"info.maxForever": { en: "Max forever spend", th: "ใช้ได้ตลอดไปสูงสุด" },
	"info.maxForever.desc": { en: "per month, forever, from today", th: "ต่อเดือน ตลอดไป จากวันนี้" },
	"info.optimizer": { en: "ThaiESG / RMF this year", th: "ThaiESG / RMF ปีนี้" },
	"info.optimizer.desc": { en: "recommended · saves {tax} tax", th: "แนะนำ · ประหยัดภาษี {tax}" },
	"info.paths": { en: "Fund vs taxable", th: "กองทุน vs เสียภาษี" },
	"info.paths.desc.fund": { en: "{fund} wins by {gap}", th: "{fund} ได้เปรียบ {gap}" },
	"info.paths.desc.taxable": { en: "taxable wins by {gap}", th: "เสียภาษี ได้เปรียบ {gap}" },
	"info.goals": { en: "Goal checks", th: "ตรวจเป้าหมาย" },
	"info.goals.desc.ok": { en: "{ok} of {total} goals on track", th: "{ok} จาก {total} เป้าหมายกำลังไปได้ดี" },
	"info.goals.desc.none": { en: "no goals set yet", th: "ยังไม่มีเป้าหมาย" },
	"info.goals.sub": { en: "{ok} on track · {short} short", th: "{ok} กำลังไปได้ดี · {short} ขาด" },
	"info.export": { en: "Assumptions", th: "สมมติฐาน" },
	"info.export.desc": { en: "TH 2026 tax · nominal averages · demo", th: "ภาษีไทย 2569 · ค่าเฉลี่ยระยะยาว · ตัวอย่าง" },

	// Editor (inline section below the grid)
	"editor.heading": { en: "Plan inputs", th: "ตัวเลขของแผน" },
	"editor.desc": {
		en: "Everything here is editable — add rows for each income or expense, with start/end years and growth.",
		th: "แก้ได้ทุกช่อง เพิ่มแถวรายได้หรือรายจ่ายได้ พร้อมปีเริ่ม-จบ และการเติบโต",
	},

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
	"a11y.leftTabs": { en: "Panel view", th: "มุมมองแผง" },
	"a11y.planInputs": { en: "Plan inputs", th: "ตัวเลขของแผน" },
	"tab.financials": { en: "By the numbers", th: "ตัวเลข" },
	"tab.answers": { en: "What the plan says", th: "สิ่งที่แผนบอก" },
	"wallets.heading": { en: "Wallets", th: "กระเป๋าเงิน" },
	"row.until": { en: "Until", th: "ถึง" },
	"a11y.netWorthChart": { en: "Net worth projection chart", th: "แผนภูมิมูลค่าสุทธิ" },
}

/** Optional per-locale overrides on top of `strings` (none needed yet). */
export const thOverrides: Dictionary = {}

/** Build a translator over the UI strings for a locale (usable outside React). */
export function getTranslator(locale: Locale) {
	return createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)
}
