/**
 * User-facing UI strings — one source of truth, bilingual { en, th } (EN first).
 * Values are LocalizedLabels, so the same dictionary serves every locale;
 * `thOverrides` exists for cases where Thai needs different copy, not just a
 * translated field. Keys are stable IDs; selection state uses keys, never text.
 */
import { createTranslator, type Dictionary, type Locale } from "@excited-live/i18n"

export const strings: Dictionary = {
	"app.title": { en: "excited.live — Plan your money", th: "excited.live — วางแผนการเงิน" },

	"nav.hello": { en: "Hello", th: "สวัสดี" },
	"nav.planLive": { en: "Your plan, live", th: "แผนของคุณ สด ๆ" },
	"theme.toLight": { en: "Switch to light mode", th: "สลับเป็นโหมดสว่าง" },
	"theme.toDark": { en: "Switch to dark mode", th: "สลับเป็นโหมดมืด" },
	"locale.toggle": { en: "Switch language", th: "เปลี่ยนภาษา" },
	"locale.en": { en: "EN", th: "EN" },
	"locale.th": { en: "ไทย", th: "ไทย" },

	"plan.heading.prefix": { en: "Your plan is", th: "แผนของคุณ" },
	"plan.heading.status": { en: "on track", th: "กำลังไปได้ดี" },
	"plan.heading.needsWork": { en: "needs attention", th: "ควรปรับ" },
	"plan.heading.noGoal": { en: "ready to grow", th: "พร้อมเติบโต" },

	"metric.netWorth": { en: "Net worth", th: "มูลค่าสุทธิ" },
	"metric.tax": { en: "Tax", th: "ภาษี" },
	"metric.effectiveTaxRate": { en: "Effective tax rate", th: "อัตราภาษีเฉลี่ย" },

	"chart.valueAt": { en: "Net worth", th: "มูลค่าสุทธิ" },
	"chart.taxAt": { en: "Tax that year", th: "ภาษีปีนั้น" },
	"chart.incomeAt": { en: "Income that year", th: "รายได้ปีนั้น" },
	"chart.spendingAt": { en: "Spending that year", th: "การใช้จ่ายปีนั้น" },
	"chart.goalHint": { en: "Goal reached", th: "ถึงเป้าแล้ว" },
	"chart.empty": { en: "Adjust your plan to see the projection.", th: "ปรับแผนของคุณเพื่อดูการคาดการณ์" },

	"a11y.chartMetric": { en: "Projection metric", th: "ตัวชี้วัดการคาดการณ์" },
	"a11y.planSections": { en: "Plan sections", th: "ส่วนของแผน" },
	"a11y.inspection": { en: "Year details", th: "รายละเอียดรายปี" },

	"section.income.title": { en: "Income", th: "รายได้" },
	"section.spending.title": { en: "Spending", th: "การใช้จ่าย" },
	"section.tax.title": { en: "Tax", th: "ภาษี" },
	"section.goal.title": { en: "Goal", th: "เป้าหมาย" },

	"field.annualIncome": { en: "Annual income (gross)", th: "รายได้ต่อปี (ก่อนหัก)" },
	"field.salaryGrowth": { en: "Salary growth / year", th: "เงินเดือนโตปีละ" },
	"field.personalAllowances": { en: "Personal", th: "ส่วนตัว" },
	"field.spouseAllowances": { en: "Spouse", th: "คู่สมรส" },
	"field.childrenAllowances": { en: "Children", th: "บุตร" },
	"field.monthlySpending": { en: "Monthly spending", th: "ใช้จ่ายต่อเดือน" },
	"field.spendingGrowth": { en: "Spending growth / year", th: "ค่าใช้จ่ายโตปีละ" },
	"field.withheldRate": { en: "Tax withheld by employer", th: "ภาษีหัก ณ ที่จ่าย" },
	"field.insurance": { en: "Insurance premium / year", th: "เบี้ยประกันต่อปี" },
	"field.retirement": { en: "Retirement savings / year", th: "เงินออมเกษียณต่อปี" },
	"field.retirement.desc": { en: "SSF · RMF · provident fund combined", th: "SSF · RMF · กองทุนสำรองเลี้ยงชีพ (รวมกัน)" },
	"field.startingNetWorth": { en: "Starting net worth", th: "มูลค่าสุทธิเริ่มต้น" },
	"field.targetNetWorth": { en: "Target net worth", th: "มูลค่าสุทธิเป้าหมาย" },
	"field.annualReturn": { en: "Investment return / year", th: "ผลตอบแทนลงทุนต่อปี" },
	"field.horizon": { en: "Projection horizon", th: "ระยะเวลาคาดการณ์" },

	"horizon.years": { en: "{years}y", th: "{years} ปี" },

	"section.tax.footnote": {
		en: "Thai 2026 individual rates. Retirement savings combine SSF, RMF and provident fund with the engine's caps.",
		th: "อัตราภาษีบุคคลธรรมดา ไทย ปี 2026 เงินออมเกษียณรวม SSF RMF และกองทุนสำรองเลี้ยงชีพ ตามเพดานของระบบ",
	},
	"assumptions.title": { en: "Assumptions", th: "สมมติฐาน" },

	"insight.title": { en: "What this means", th: "แปลว่าอะไร" },
	"insight.goalReached": {
		en: "You reach {amount} in {year} — {years} years from now.",
		th: "คุณจะมี {amount} ในปี {year} — อีก {years} ปี",
	},
	"insight.goalNotReached": {
		en: "{amount} is not reached within the horizon at these numbers.",
		th: "ตามตัวเลขนี้ คุณจะยังไม่ถึง {amount} ในระยะเวลาที่เลือก",
	},
	"insight.noGoal": {
		en: "Set a target net worth to see when you get there.",
		th: "ตั้งเป้ามูลค่าสุทธิเพื่อดูว่าจะถึงเป้าเมื่อไหร่",
	},
}

/** Optional per-locale overrides on top of `strings` (none needed yet). */
export const thOverrides: Dictionary = {}

/** Build a translator over the UI strings for a locale (usable outside React). */
export function getTranslator(locale: Locale) {
	return createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)
}
