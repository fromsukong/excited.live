/**
 * User-facing UI strings — one source of truth, bilingual { en, th } (EN first).
 * Values are LocalizedLabels, so the same dictionary serves every locale;
 * `thOverrides` exists for cases where Thai needs different copy, not just a
 * translated field. Keys are stable IDs; selection state uses keys, never text.
 */
import { createTranslator, type Dictionary, type Locale } from "@excited-live/i18n"

export const strings: Dictionary = {
	"app.title": { en: "excited.live — Plan the life you're excited to live", th: "excited.live — วางแผนชีวิตที่คุณตื่นเต้นจะใช้" },
	"app.description": {
		en: "Simulate your life plan — income, spending, tax and savings, projected in real numbers.",
		th: "จำลองแผนชีวิตของคุณ รายรับ ค่าใช้จ่าย ภาษี และการออม คำนวณเป็นตัวเลขจริง",
	},

	"nav.hello": { en: "Hello, Sam", th: "สวัสดี Sam" },
	"nav.synced": { en: "Your plan is synced", th: "แผนของคุณซิงค์แล้ว" },
	"theme.toLight": { en: "Switch to light mode", th: "สลับเป็นโหมดสว่าง" },
	"theme.toDark": { en: "Switch to dark mode", th: "สลับเป็นโหมดมืด" },
	"locale.toggle": { en: "Switch language", th: "เปลี่ยนภาษา" },
	"locale.en": { en: "EN", th: "EN" },
	"locale.th": { en: "ไทย", th: "ไทย" },

	"plan.snapshotDate": {
		en: "Plan snapshot · Tuesday, February 25",
		th: "ภาพรวมแผน · วันอังคารที่ 25 กุมภาพันธ์",
	},
	"plan.heading.prefix": { en: "Your plan is", th: "แผนของคุณ" },
	"plan.heading.status": { en: "on track", th: "กำลังไปได้ดี" },

	"metric.netWorth": { en: "Net worth", th: "มูลค่าสุทธิ" },
	"metric.cashFlow": { en: "Cash flow", th: "กระแสเงินสด" },
	"chart.aria.netWorth": { en: "Net worth performance chart", th: "แผนภูมิมูลค่าสุทธิ" },
	"chart.aria.cashFlow": { en: "Cash flow performance chart", th: "แผนภูมิกระแสเงินสด" },

	"accounts.connect": { en: "Connect accounts", th: "เชื่อมต่อบัญชี" },
	"accounts.connected": { en: "Accounts connected", th: "บัญชีเชื่อมต่อแล้ว" },

	"a11y.chartMetric": { en: "Chart metric", th: "ตัวชี้วัดของแผนภูมิ" },
	"a11y.chartPeriod": { en: "Chart period", th: "ช่วงเวลาของแผนภูมิ" },
	"a11y.financialSnapshot": { en: "Financial snapshot", th: "ภาพรวมการเงิน" },
	"a11y.planActions": { en: "Plan actions", th: "การจัดการแผน" },

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

	"action.updatePlan": { en: "Update plan", th: "อัปเดตแผน" },
	"action.updatePlan.desc": {
		en: "Refresh assumptions and projections",
		th: "รีเฟรชสมมติฐานและการคาดการณ์",
	},
	"action.addIncome": { en: "Add income", th: "เพิ่มรายได้" },
	"action.addIncome.desc": {
		en: "Record a new source of cash flow",
		th: "บันทึกแหล่งกระแสเงินสดใหม่",
	},
	"action.reviewSpending": { en: "Review spending", th: "ทบทวนการใช้จ่าย" },
	"action.reviewSpending.desc": {
		en: "Reconcile your latest expenses",
		th: "กระทบยอดค่าใช้จ่ายล่าสุดของคุณ",
	},
	"action.updateTaxDetails": { en: "Update tax details", th: "อัปเดตข้อมูลภาษี" },
	"action.updateTaxDetails.desc": {
		en: "Check taxable income and balance",
		th: "ตรวจสอบรายได้สุทธิและยอดภาษี",
	},
	"action.adjustSavingsGoal": { en: "Adjust savings goal", th: "ปรับเป้าหมายการออม" },
	"action.adjustSavingsGoal.desc": {
		en: "Change the next milestone",
		th: "เปลี่ยนหมุดหมายถัดไป",
	},
	"action.manageAccounts": { en: "Manage accounts", th: "จัดการบัญชี" },
	"action.manageAccounts.desc": {
		en: "Connect or edit linked accounts",
		th: "เชื่อมต่อหรือแก้ไขบัญชีที่ผูกไว้",
	},

	"plan.updated": { en: "Plan updated", th: "อัปเดตแผนแล้ว" },
	"plan.actions": { en: "Plan actions", th: "การจัดการแผน" },
	"plan.savedJustNow": { en: "Saved just now", th: "บันทึกเมื่อสักครู่" },
	"plan.lastSyncedToday": { en: "Last synced today", th: "ซิงค์ล่าสุดวันนี้" },
	"plan.keepCurrent": { en: "Keep your plan current", th: "ทำให้แผนของคุณเป็นปัจจุบันเสมอ" },
	"plan.summaryBody": {
		en: "Update the details behind your forecast, reconcile new activity, and keep every number ready for your next decision.",
		th: "อัปเดตรายละเอียดเบื้องหลังการคาดการณ์ กระทบยอดกิจกรรมใหม่ และทำให้ทุกตัวเลขพร้อมสำหรับการตัดสินใจครั้งถัดไปของคุณ",
	},
	"plan.selected": { en: "{action} selected", th: "เลือก {action} อยู่" },

	"actions.eyebrow": { en: "Quick actions", th: "การทำงานด่วน" },
	"actions.heading": { en: "What would you like to update?", th: "คุณอยากอัปเดตอะไร?" },
	"actions.count": { en: "6 tools", th: "6 เครื่องมือ" },
	"action.exportSnapshot": { en: "Export plan snapshot", th: "ส่งออกภาพรวมแผน" },
}

/** Optional per-locale overrides on top of `strings` (none needed yet). */
export const thOverrides: Dictionary = {}

/** Build a translator over the UI strings for a locale (usable outside React). */
export function getTranslator(locale: Locale) {
	return createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)
}
