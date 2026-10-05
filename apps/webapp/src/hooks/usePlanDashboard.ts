import { createElement, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { type DateInputProps } from "@excited-live/design-system"
import { useLocale } from "../lib/locale-context"
import {
	computeMonteCarloBands,
	computePlanSummary,
	defaultPlan,
	type AmountFrequency,
	type AssetRow,
	type AssetTypeId,
	type ExpenseTypeId,
	type IncomeTypeId,
	type LiabilityRow,
	type LiabilityTypeId,
	type MilestoneRow,
	type MonteCarloResult,
	type PeriodRow,
	type PlanInput,
	type PlanSummary,
} from "../lib/plan-service"
import { formatBaht, formatPercent } from "../lib/format"
import {
	type EntryDialogDescriptor,
	type EntryDialogProps,
} from "../pages/home/components/EntryDialog"
import { type ValueDialogDescriptor } from "../pages/home/components/ValueDialog"
import { type TypePickerKind } from "../pages/home/components/TypePickerDialog"

export type HorizonKey = "10" | "20" | "30" | "40" | "all"
export type MetricKey = "metric.netWorth" | "metric.cashFlow"
export type LeftTab =
	| "financials"
	| "milestone"
	| "incomes"
	| "expenses"
	| "assets"
	| "liabilities"
export type PageKey = "plan" | "settings"

export interface FinancialMetric extends Record<string, unknown> {
	key: string
	value: string
}

export const HORIZONS: readonly HorizonKey[] = ["10", "20", "30", "40", "all"]

/** Deliberate 2026-09-12 product decision: add button opens dialog ONLY for salary; other types land later. */
export const ADD_DIALOG_TYPE_IDS = new Set<string>(["salary"])

export function usePlanDashboard() {
	const { t, locale, setLocale } = useLocale()
	const [plan, setPlan] = useState<PlanInput>(() => defaultPlan())
	/**
	 * US-101 — wizard bridge. The Welcome page composes its answers into a
	 * complete PlanInput (via lib/wizard) and hands it over here. This is the
	 * same plan-service-boundary path the editor uses; after the wizard every
	 * answer stays editable as normal PlanInput fields.
	 */
	const applyWizardPlan = setPlan
	const [horizon, setHorizon] = useState<HorizonKey>("30")
	const [metric, setMetric] = useState<MetricKey>("metric.netWorth")
	const [leftTab, setLeftTab] = useState<LeftTab>("financials")
	const [page, setPage] = useState<PageKey>("plan")
	const [hoverYear, setHoverYear] = useState<number | null>(null)

	// Settings page (mock): local-only fields, nothing is persisted yet.
	const [profileName, setProfileName] = useState("")
	const [birthday, setBirthday] = useState<DateInputProps["value"]>(undefined)
	const [gender, setGender] = useState("female")

	const [addedTypes, setAddedTypes] = useState<
		Record<"incomes" | "expenses" | "assets" | "liabilities", string[]>
	>(() => {
		const initial = defaultPlan()
		return {
			incomes: Array.from(new Set(initial.incomes.map((r) => r.typeId))),
			expenses: Array.from(new Set(initial.expenses.map((r) => r.typeId))),
			assets: [],
			liabilities: [],
		}
	})
	const [pickerKind, setPickerKind] = useState<TypePickerKind | null>(null)
	const [entryDialog, setEntryDialog] = useState<EntryDialogDescriptor | null>(
		null,
	)
	const [valueDialog, setValueDialog] = useState<ValueDialogDescriptor | null>(
		null,
	)
	const [milestoneDialog, setMilestoneDialog] = useState<{
		id: string | null
	} | null>(null)

	const summary = useMemo<
		| { ok: true; data: PlanSummary }
		| { ok: false; error: Error }
	>(() => {
		try {
			return { ok: true, data: computePlanSummary(plan) }
		} catch (error) {
			return { ok: false, error: error as Error }
		}
	}, [plan])

	const shown = useMemo(() => {
		if (!summary.ok) return null
		const all = summary.data.result.years
		if (horizon === "all") return all
		const count = Math.min(Number(horizon), all.length)
		return all.slice(0, count)
	}, [summary, horizon])

	// US-110 — Monte Carlo bands. ~200 full projections cost a few hundred ms,
	// so the recompute is debounced: typing stays instant (deterministic
	// summary), the band catches up a beat later. The engine is seeded by
	// default, so the band is stable across renders (SSR/client match).
	const [bands, setBands] = useState<MonteCarloResult | null>(null)
	useEffect(() => {
		const timer = setTimeout(() => {
			try {
				setBands(computeMonteCarloBands(plan))
			} catch {
				setBands(null)
			}
		}, 250)
		return () => clearTimeout(timer)
	}, [plan])

	/**
	 * Band slice index-aligned with `shown`. Only net worth carries market
	 * risk in the MVP engine, so the band shows for the net-worth metric
	 * only (cash-flow band would be zero-width everywhere).
	 */
	const shownBands = useMemo(() => {
		if (!bands || !shown || bands.years.length < shown.length) return null
		if (metric !== "metric.netWorth") return null
		return bands.years.slice(0, shown.length).map((entry) => ({
			p10: entry.netWorth.p10,
			p50: entry.netWorth.p50,
			p90: entry.netWorth.p90,
		}))
	}, [bands, shown, metric])

	const bandCaption = useMemo(() => {
		if (!bands || metric !== "metric.netWorth") return null
		let survival = Math.floor(bands.survivalRate * 100)
		if (bands.unmetYearP100 !== null) survival = Math.min(survival, 99)
		return {
			text: t("chart.band.caption", {
				trials: String(bands.trials),
				survival: `${survival}%`,
			}),
			unmetYear: bands.unmetYearP100,
		}
	}, [bands, metric, t])

	const financialMetrics = useMemo<FinancialMetric[]>(() => {
		if (!summary.ok) return []
		const s = summary.data
		const first = s.result.years[0]
		if (!first) return []
		const hovered =
			hoverYear !== null
				? (s.result.years.find((y) => y.year === hoverYear) ?? null)
				: null
		const end =
			hovered ?? shown?.[shown.length - 1] ?? s.result.years[s.result.years.length - 1]
		const startNet = hovered
			? (s.result.years[0]?.netWorth ?? 0)
			: (s.result.years[0]?.netWorth ?? 0)
		const change = hovered
			? hovered.netWorth - (s.result.years[0]?.netWorth ?? 0)
			: (end?.netWorth ?? 0) - startNet
		const withdrawals = hovered
			? hovered.withdrawal
			: s.result.years.reduce((sum, y) => sum + y.withdrawal, 0)
		const withdrawalBase = hovered
			? 1
			: s.result.years.filter((y) => y.withdrawal > 0).length
		const avgWithdrawal =
			withdrawalBase > 0 ? withdrawals / withdrawalBase : 0
		const rateYear = hovered ?? first
		return [
			{ key: "metric.netWorthValue", value: formatBaht(end?.netWorth ?? 0) },
			{ key: "metric.changeInNetWorth", value: formatBaht(change) },
			{
				key: "metric.liquidNetWorth",
				value: formatBaht((end?.wallets.emergency ?? 0) + (end?.wallets.goal ?? 0)),
			},
			{ key: "metric.withdrawals", value: formatBaht(withdrawals) },
			{
				key: "metric.withdrawalRate",
				value:
					avgWithdrawal > 0
						? formatPercent(avgWithdrawal / Math.max(end?.netWorth ?? 1, 1))
						: "0%",
			},
			{ key: "metric.income", value: formatBaht(rateYear.income) },
			{
				key: "metric.taxableIncome",
				value: formatBaht(rateYear.taxResult.taxableIncome),
			},
			{ key: "metric.taxes", value: formatBaht(rateYear.tax) },
			{
				key: "metric.effectiveTaxRate",
				value: formatPercent(rateYear.taxResult.effectiveRate),
			},
			{ key: "metric.spending", value: formatBaht(rateYear.expenses) },
			{ key: "metric.expenses", value: formatBaht(rateYear.expenses) },
			{
				key: "metric.savingsRate",
				value: formatPercent(
					rateYear.income > 0
						? Math.max(
								0,
								(rateYear.income - rateYear.tax - rateYear.expenses) /
									rateYear.income,
							)
						: 0,
				),
			},
			{ key: "metric.taxBalance", value: formatBaht(rateYear.taxResult.balance) },
		]
	}, [summary, shown, hoverYear])

	const addEntryRow = (
		kind: "incomes" | "expenses",
		typeId: IncomeTypeId | ExpenseTypeId,
		values: {
			label: string
			amount: number
			frequency: AmountFrequency
			startYear: number
			startMonth: number
			endYear: number | null
			endMonth: number
			growthMode: "inflation" | "fixed" | "override"
			growthRate: number
			deductible?: "none" | "mortgageInterest"
		},
	) => {
		setPlan((current) => {
			let n = current[kind].length
			let id = ""
			do {
				n += 1
				id = `${kind}-${n}`
			} while (current[kind].some((row) => row.id === id))
			return {
				...current,
				[kind]: [...current[kind], { id, typeId, ...values }],
			}
		})
		setAddedTypes((prev) =>
			prev[kind].includes(typeId)
				? prev
				: { ...prev, [kind]: [...prev[kind], typeId] },
		)
	}

	const patchEntryRow = (
		kind: "incomes" | "expenses",
		id: string,
		patch: Partial<PeriodRow>,
	) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].map((row) =>
				row.id === id ? { ...row, ...patch } : row,
			),
		}))
	}

	const removeEntryRow = (kind: "incomes" | "expenses", id: string) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].filter((row) => row.id !== id),
		}))
	}

	const addMilestone = (values: {
		label: string
		year: number
		month: number
	}) => {
		setPlan((current) => {
			let n = current.milestones.length
			let id = ""
			do {
				n += 1
				id = `milestones-${n}`
			} while (current.milestones.some((row) => row.id === id))
			return {
				...current,
				milestones: [...current.milestones, { id, ...values }],
			}
		})
	}

	const patchMilestone = (id: string, patch: Partial<MilestoneRow>) => {
		setPlan((current) => ({
			...current,
			milestones: current.milestones.map((row) =>
				row.id === id ? { ...row, ...patch } : row,
			),
		}))
	}

	const removeMilestone = (id: string) => {
		setPlan((current) => ({
			...current,
			milestones: current.milestones.filter((row) => row.id !== id),
		}))
	}

	const addValueRow = (
		kind: "assets" | "liabilities",
		typeId: AssetTypeId | LiabilityTypeId,
		values: { label: string; value: number },
	) => {
		setPlan((current) => {
			let n = current[kind].length
			let id = ""
			do {
				n += 1
				id = `${kind}-${n}`
			} while (current[kind].some((row) => row.id === id))
			if (kind === "assets") {
				const newRow: AssetRow = {
					id,
					typeId: typeId as AssetTypeId,
					...values,
				}
				return { ...current, assets: [...current.assets, newRow] }
			}
			const newRow: LiabilityRow = {
				id,
				typeId: typeId as LiabilityTypeId,
				...values,
			}
			return { ...current, liabilities: [...current.liabilities, newRow] }
		})
		setAddedTypes((prev) =>
			prev[kind].includes(typeId)
				? prev
				: { ...prev, [kind]: [...prev[kind], typeId] },
		)
	}

	const patchValueRow = (
		kind: "assets" | "liabilities",
		id: string,
		patch: Partial<AssetRow | LiabilityRow>,
	) => {
		setPlan((current) => {
			if (kind === "assets") {
				return {
					...current,
					assets: current.assets.map((row) =>
						row.id === id ? ({ ...row, ...patch } as AssetRow) : row,
					),
				}
			}
			return {
				...current,
				liabilities: current.liabilities.map((row) =>
					row.id === id ? ({ ...row, ...patch } as LiabilityRow) : row,
				),
			}
		})
	}

	const removeValueRow = (kind: "assets" | "liabilities", id: string) => {
		setPlan((current) => {
			if (kind === "assets") {
				return {
					...current,
					assets: current.assets.filter((row) => row.id !== id),
				}
			}
			return {
				...current,
				liabilities: current.liabilities.filter((row) => row.id !== id),
			}
		})
	}

	const handleSaveEntry: EntryDialogProps["onSave"] = (values) => {
		if (!entryDialog) return
		if (entryDialog.mode === "add") {
			const typeId = (values.typeId ??
				entryDialog.typeId ??
				(entryDialog.kind === "incomes" ? "salary" : "livingExpenses")) as
				| IncomeTypeId
				| ExpenseTypeId
			addEntryRow(entryDialog.kind, typeId, values)
		} else {
			patchEntryRow(entryDialog.kind, entryDialog.rowId, values)
		}
		setEntryDialog(null)
	}

	const handleSaveValue = (values: {
		typeId?: AssetTypeId | LiabilityTypeId
		label: string
		value: number
	}) => {
		if (!valueDialog) return
		if (valueDialog.mode === "add") {
			const typeId = (values.typeId ??
				valueDialog.typeId ??
				(valueDialog.kind === "assets" ? "stock" : "debt")) as
				| AssetTypeId
				| LiabilityTypeId
			addValueRow(valueDialog.kind, typeId, values)
		} else {
			patchValueRow(valueDialog.kind, valueDialog.rowId, values)
		}
		setValueDialog(null)
	}

	const handleSaveMilestone = (values: {
		label: string
		year: number
		month: number
	}) => {
		if (!milestoneDialog) return
		if (milestoneDialog.id === null) {
			addMilestone(values)
		} else {
			patchMilestone(milestoneDialog.id, values)
		}
		setMilestoneDialog(null)
	}

	const handlePickType = (typeId: string) => {
		if (!pickerKind) return
		setAddedTypes((prev) => ({
			...prev,
			[pickerKind]: [...prev[pickerKind], typeId],
		}))
		setPickerKind(null)
	}

	return {
		t,
		locale,
		setLocale,
		plan,
		setPlan,
		applyWizardPlan,
		horizon,
		setHorizon,
		metric,
		setMetric,
		leftTab,
		setLeftTab,
		page,
		setPage,
		hoverYear,
		setHoverYear,
		profileName,
		setProfileName,
		birthday,
		setBirthday,
		gender,
		setGender,
		addedTypes,
		setAddedTypes,
		pickerKind,
		setPickerKind,
		entryDialog,
		setEntryDialog,
		valueDialog,
		setValueDialog,
		milestoneDialog,
		setMilestoneDialog,
		summary,
		shown,
		shownBands,
		bandCaption,
		financialMetrics,
		removeEntryRow,
		removeMilestone,
		removeValueRow,
		handleSaveEntry,
		handleSaveValue,
		handleSaveMilestone,
		handlePickType,
	}
}

export type PlanDashboardValue = ReturnType<typeof usePlanDashboard>

const PlanDashboardContext = createContext<PlanDashboardValue | null>(null)

export function PlanDashboardProvider({ children }: { children: ReactNode }) {
	const value = usePlanDashboard()
	return createElement(PlanDashboardContext.Provider, { value }, children)
}

export function usePlanDashboardContext() {
	const context = useContext(PlanDashboardContext)
	if (!context) {
		throw new Error("usePlanDashboardContext must be used within PlanDashboardProvider")
	}
	return context
}
