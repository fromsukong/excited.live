import { useEffect, useMemo, useRef, useState } from "react"
import {
	Button,
	Card,
	ChatComposer,
	ChatMessage,
	ChatMessageBubble,
	ChatMessageList,
	ChatToolCalls,
	DateInput,
	Dialog,
	DialogHeader,
	Grid,
	Heading,
	HStack,
	Img,
	Layout,
	LayoutContent,
	LayoutFooter,
	NumberInput,
	PlainButton,
	SegmentedControl,
	Selector,
	SegmentedControlItem,
	Stack,
	Tab,
	TabList,
	Table,
	Text,
	TextInput,
	Theme,
	mastercardTheme,
	pixel,
	proportional,
	useTableRowExpansion,
	type ChatToolCallItem,
	type DateInputProps,
	type TableColumn,
} from "@excited-live/design-system"
import { createFileRoute } from "@tanstack/react-router"
import { useLocale } from "../lib/locale-context"
import {
	ASSET_TYPE_IDS,
	computeMonteCarloBands,
	computePlanSummary,
	defaultPlan,
	EXPENSE_TYPE_DEFAULT_FREQUENCY,
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_DEFAULT_FREQUENCY,
	INCOME_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	rowLifetimeTotal,
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
import { ProjectionChart } from "../components/ProjectionChart"
import { formatBaht, formatPercent } from "../lib/format"

export const Route = createFileRoute("/")({
	component: Home,
})

type HorizonKey = "10" | "20" | "30" | "40" | "all"
type MetricKey = "metric.netWorth" | "metric.cashFlow"
type LeftTab = "financials" | "milestone" | "incomes" | "expenses" | "assets" | "liabilities"
type PageKey = "plan" | "settings"

interface FinancialMetric extends Record<string, unknown> {
	key: string
	value: string
}

const HORIZONS: readonly HorizonKey[] = ["10", "20", "30", "40", "all"]

/** Deliberate 2026-09-12 product decision: add button opens dialog ONLY for salary; other types land later. */
const ADD_DIALOG_TYPE_IDS = new Set<string>(["salary"])

function Home() {
	const { t, locale, setLocale } = useLocale()
	const [plan, setPlan] = useState<PlanInput>(() => defaultPlan())
	const [horizon, setHorizon] = useState<HorizonKey>("30")
	const [metric, setMetric] = useState<MetricKey>("metric.netWorth")
	const [leftTab, setLeftTab] = useState<LeftTab>("financials")
	const [page, setPage] = useState<PageKey>("plan")
	const [hoverYear, setHoverYear] = useState<number | null>(null)
	// Settings page (mock): local-only fields, nothing is persisted yet.
	const [profileName, setProfileName] = useState("")
	const [birthday, setBirthday] = useState<DateInputProps["value"]>(undefined)
	const [gender, setGender] = useState("female")

	const [addedTypes, setAddedTypes] = useState<Record<"incomes" | "expenses" | "assets" | "liabilities", string[]>>(() => {
		const initial = defaultPlan()
		return {
			incomes: Array.from(new Set(initial.incomes.map((r) => r.typeId))),
			expenses: Array.from(new Set(initial.expenses.map((r) => r.typeId))),
			assets: [],
			liabilities: [],
		}
	})
	const [pickerKind, setPickerKind] = useState<"incomes" | "expenses" | "assets" | "liabilities" | null>(null)
	const [entryDialog, setEntryDialog] = useState<
		| { mode: "add"; kind: "incomes" | "expenses"; typeId: string }
		| { mode: "edit"; kind: "incomes" | "expenses"; rowId: string }
		| null
	>(null)
	const [valueDialog, setValueDialog] = useState<
		| { mode: "add"; kind: "assets" | "liabilities"; typeId: string }
		| { mode: "edit"; kind: "assets" | "liabilities"; rowId: string }
		| null
	>(null)
	const [milestoneDialog, setMilestoneDialog] = useState<{ id: string | null } | null>(null)

	const summary = useMemo(() => {
		try {
			return { ok: true as const, data: computePlanSummary(plan) }
		} catch (error) {
			return { ok: false as const, error: error as Error }
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
		// Caption describes the shaded band — net-worth metric only.
		if (!bands || metric !== "metric.netWorth") return null
		let survival = Math.floor(bands.survivalRate * 100)
		// Never print "100% never run out" next to "worst case runs out YEAR".
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
		// Hover-link: when the pointer is on a chart year, the rows reflect
		// that year; otherwise they show the whole active period.
		const hovered =
			hoverYear !== null
				? (s.result.years.find((y) => y.year === hoverYear) ?? null)
				: null
		const end = hovered ?? shown?.[shown.length - 1] ?? s.result.years[s.result.years.length - 1]
		const startNet = hovered
			? (s.result.years[0]?.netWorth ?? 0)
			: (s.result.years[0]?.netWorth ?? 0)
		const change = hovered
			? hovered.netWorth - (s.result.years[0]?.netWorth ?? 0)
			: (end?.netWorth ?? 0) - startNet
		const withdrawals = hovered
			? hovered.withdrawal
			: s.result.years.reduce((sum, y) => sum + y.withdrawal, 0)
		const withdrawalBase = hovered ? 1 : s.result.years.filter((y) => y.withdrawal > 0).length
		const avgWithdrawal = withdrawalBase > 0 ? withdrawals / withdrawalBase : 0
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
			{ key: "metric.taxableIncome", value: formatBaht(rateYear.taxResult.taxableIncome) },
			{ key: "metric.taxes", value: formatBaht(rateYear.tax) },
			{ key: "metric.effectiveTaxRate", value: formatPercent(rateYear.taxResult.effectiveRate) },
			{ key: "metric.spending", value: formatBaht(rateYear.expenses) },
			{ key: "metric.expenses", value: formatBaht(rateYear.expenses) },
			{
				key: "metric.savingsRate",
				value: formatPercent(
					rateYear.income > 0
						? Math.max(0, (rateYear.income - rateYear.tax - rateYear.expenses) / rateYear.income)
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
	}

	const patchEntryRow = (
		kind: "incomes" | "expenses",
		id: string,
		patch: Partial<PeriodRow>,
	) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].map((row) => (row.id === id ? { ...row, ...patch } : row)),
		}))
	}

	const removeEntryRow = (kind: "incomes" | "expenses", id: string) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].filter((row) => row.id !== id),
		}))
	}

	const addMilestone = (values: { label: string; year: number; month: number }) => {
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
			milestones: current.milestones.map((row) => (row.id === id ? { ...row, ...patch } : row)),
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
				const newRow: AssetRow = { id, typeId: typeId as AssetTypeId, ...values }
				return { ...current, assets: [...current.assets, newRow] }
			}
			const newRow: LiabilityRow = { id, typeId: typeId as LiabilityTypeId, ...values }
			return { ...current, liabilities: [...current.liabilities, newRow] }
		})
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

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="dashboard-shell">
				<Stack direction="horizontal" justify="between" vAlign="center" as="header" className="topbar">
					<Stack direction="horizontal" vAlign="center" className="brand-lockup">
						<Img className="brand-lockup__mark" src="/logo-mark.png" alt="" width={30} height={26} />
						<Img className="brand-lockup__wordmark" src="/logo-wordmark.png" alt="excited.live" height={15} />
						<Text size="lg" color="secondary" weight="semibold" className="brand-lockup__hello">{t("nav.hello")}</Text>
					</Stack>
					<TabList
						className="topnav"
						value={page}
						onChange={(value) => setPage(value === "settings" ? "settings" : "plan")}
						size="sm"
						aria-label={t("a11y.mainNav")}
					>
						<Tab value="plan" label={t("nav.plan")} />
						<Tab value="settings" label={t("nav.settings")} />
					</TabList>
					<Stack direction="horizontal" vAlign="center" className="market-status">
						<Text color="secondary">{t("nav.synced")}</Text>
						<PlainButton
							className={`locale-button ${locale === "th" ? "is-active" : ""}`}
							aria-label={t("locale.toggle")}
							onClick={() => setLocale(locale === "en" ? "th" : "en")}
						>
							{locale === "en" ? t("locale.th") : t("locale.en")}
						</PlainButton>
					</Stack>
				</Stack>

				<Stack as="main" className="dashboard-main">
					<Grid className="dashboard-grid">
						<Card className="chart-panel" variant="transparent" padding={0}>
							{page === "settings" ? (
								<Stack gap={3} className="chart-panel__inner settings-panel">
									<Stack gap={1}>
										<Heading level={2}>{t("nav.settings")}</Heading>
										<Text color="secondary">{t("settings.note")}</Text>
									</Stack>
									<Grid columns={{ minWidth: 220, max: 2 }} gap={2}>
										<TextInput
											label={t("settings.name")}
											value={profileName}
											onChange={setProfileName}
										/>
										<DateInput
											label={t("settings.birthday")}
											value={birthday}
											onChange={setBirthday}
										/>
										<Stack gap={1}>
											<Text size="sm" color="secondary">{t("settings.gender")}</Text>
											<SegmentedControl
												value={gender}
												onChange={setGender}
												label={t("settings.gender")}
												layout="fill"
												size="sm"
											>
												<SegmentedControlItem value="female" label={t("settings.gender.female")} />
												<SegmentedControlItem value="male" label={t("settings.gender.male")} />
												<SegmentedControlItem value="other" label={t("settings.gender.other")} />
											</SegmentedControl>
										</Stack>
									</Grid>
								</Stack>
							) : (
								<Stack className="chart-panel__inner">
									<Stack direction="horizontal" vAlign="center" className="chart-toolbar">
										<Stack direction="horizontal" vAlign="center" role="group" aria-label={t("a11y.chartMetric")} className="metric-switch">
											<PlainButton
												className={`metric-switch__item ${metric === "metric.netWorth" ? "is-active" : ""}`}
												onClick={() => setMetric("metric.netWorth")}
											>
												<Text className="metric-indicator metric-indicator--white" aria-hidden="true">{""}</Text>
												{t("metric.netWorth")}
											</PlainButton>
											<PlainButton
												className={`metric-switch__item ${metric === "metric.cashFlow" ? "is-active" : ""}`}
												onClick={() => setMetric("metric.cashFlow")}
											>
												<Text className="metric-indicator metric-indicator--purple" aria-hidden="true">{""}</Text>
												{t("metric.cashFlow")}
											</PlainButton>
										</Stack>
										<Stack direction="horizontal" vAlign="center" role="group" aria-label={t("a11y.chartPeriod")} className="period-switch">
											{HORIZONS.map((item) => (
												<PlainButton
													className={`period-switch__item ${horizon === item ? "is-active" : ""}`}
													key={item}
													aria-pressed={horizon === item}
													onClick={() => setHorizon(item)}
												>
													{item === "all" ? t("period.all") : `${item}Y`}
												</PlainButton>
											))}
										</Stack>
									</Stack>

									<Stack className="chart-canvas">
										{summary.ok && shown ? (
											<ProjectionChart
												years={shown}
												metric={metric === "metric.netWorth" ? "netWorth" : "cashFlow"}
												ariaLabel={t(metric === "metric.netWorth" ? "chart.aria.netWorth" : "chart.aria.cashFlow")}
												band={shownBands ?? undefined}
												milestones={plan.milestones}
												onActiveYearChange={setHoverYear}
											/>
										) : (
											<Text color="secondary">{summary.ok ? "" : summary.error.message}</Text>
										)}
										{bandCaption ? (
											<Text size="sm" color="secondary" className="chart-band-caption">
												{bandCaption.text}
												{bandCaption.unmetYear !== null
													? ` · ${t("chart.band.unmet", { year: String(bandCaption.unmetYear) })}`
													: ""}
											</Text>
										) : null}
									</Stack>

									<TabList
										className="left-tabs"
										value={leftTab}
										onChange={(value) => {
											if (
												value === "milestone" ||
												value === "incomes" ||
												value === "expenses" ||
												value === "assets" ||
												value === "liabilities"
											) {
												setLeftTab(value)
											} else {
												setLeftTab("financials")
											}
										}}
										role="tablist"
										aria-label={t("a11y.leftTabs")}
										size="sm"
									>
										<Tab value="financials" label={t("tab.financials")} panelId="left-panel-financials" />
										<Tab value="milestone" label={t("tab.milestone")} panelId="left-panel-milestone" />
										<Tab value="incomes" label={t("tab.income")} panelId="left-panel-incomes" />
										<Tab value="expenses" label={t("tab.expenses")} panelId="left-panel-expenses" />
										<Tab value="assets" label={t("tab.assets")} panelId="left-panel-assets" />
										<Tab value="liabilities" label={t("tab.liabilities")} panelId="left-panel-liabilities" />
									</TabList>

									{leftTab === "financials" ? (
										<Stack id="left-panel-financials" className="tab-inputs" aria-label={t("a11y.financialSnapshot")}>
											<Table
												data={financialMetrics}
												idKey="key"
												density="compact"
												hasHover
												textOverflow="wrap"
												columns={[
													{
														key: "key",
														header: t("table.metric"),
														width: proportional(2),
														renderCell: (row) => <Text weight="semibold">{t(row.key)}</Text>,
													},
													{
														key: "value",
														header: t("table.value"),
														width: pixel(130),
														align: "end",
														renderCell: (row) => <Text hasTabularNumbers>{row.value}</Text>,
													},
												]}
											/>
										</Stack>
									) : leftTab === "milestone" ? (
										<Stack id="left-panel-milestone" className="tab-inputs" aria-label={t("tab.milestone")}>
											<MilestoneTable
												plan={plan}
												onAdd={() => setMilestoneDialog({ id: null })}
												onEdit={(id) => setMilestoneDialog({ id })}
												t={t}
											/>
										</Stack>
									) : leftTab === "incomes" ? (
										<Stack id="left-panel-incomes" className="tab-inputs" aria-label={t("tab.income")}>
											<GroupedPeriodTable
												kind="incomes"
												plan={plan}
												addedTypeIds={addedTypes.incomes}
												onAddType={() => setPickerKind("incomes")}
												onAddItem={(typeId) => {
													if (ADD_DIALOG_TYPE_IDS.has(typeId)) {
														setEntryDialog({ mode: "add", kind: "incomes", typeId })
													}
												}}
												onEditItem={(row) => setEntryDialog({ mode: "edit", kind: "incomes", rowId: row.id })}
												t={t}
											/>
										</Stack>
									) : leftTab === "expenses" ? (
										<Stack id="left-panel-expenses" className="tab-inputs" aria-label={t("tab.expenses")}>
											<GroupedPeriodTable
												kind="expenses"
												plan={plan}
												addedTypeIds={addedTypes.expenses}
												onAddType={() => setPickerKind("expenses")}
												onAddItem={(typeId) => {
													if (ADD_DIALOG_TYPE_IDS.has(typeId)) {
														setEntryDialog({ mode: "add", kind: "expenses", typeId })
													}
												}}
												onEditItem={(row) => setEntryDialog({ mode: "edit", kind: "expenses", rowId: row.id })}
												t={t}
											/>
										</Stack>
									) : leftTab === "assets" ? (
										<Stack id="left-panel-assets" className="tab-inputs" aria-label={t("tab.assets")}>
											<GroupedValueTable
												kind="assets"
												plan={plan}
												addedTypeIds={addedTypes.assets}
												onAddType={() => setPickerKind("assets")}
												onAddItem={(typeId) => setValueDialog({ mode: "add", kind: "assets", typeId })}
												onEditItem={(row) => setValueDialog({ mode: "edit", kind: "assets", rowId: row.id })}
												t={t}
											/>
										</Stack>
									) : (
										<Stack id="left-panel-liabilities" className="tab-inputs" aria-label={t("tab.liabilities")}>
											<GroupedValueTable
												kind="liabilities"
												plan={plan}
												addedTypeIds={addedTypes.liabilities}
												onAddType={() => setPickerKind("liabilities")}
												onAddItem={(typeId) => setValueDialog({ mode: "add", kind: "liabilities", typeId })}
												onEditItem={(row) => setValueDialog({ mode: "edit", kind: "liabilities", rowId: row.id })}
												t={t}
											/>
										</Stack>
									)}
								</Stack>
							)}
						</Card>

						<Stack as="section" className="plan-column" aria-label={t("rail.title")}>
							{summary.ok ? (
								<Stack className="plan-column__chat">
									<AssistantRail summary={summary.data} t={t} />
								</Stack>
							) : (
								<Text color="secondary">{summary.error.message}</Text>
							)}
						</Stack>
					</Grid>
				</Stack>
				{entryDialog ? (
					<EntryDialog
						key={entryDialog.mode === "edit" ? entryDialog.rowId : entryDialog.typeId}
						dialog={entryDialog}
						plan={plan}
						onSave={(values) => {
							if (entryDialog.mode === "add") {
								addEntryRow(entryDialog.kind, entryDialog.typeId as IncomeTypeId | ExpenseTypeId, values)
							} else {
								patchEntryRow(entryDialog.kind, entryDialog.rowId, values)
							}
							setEntryDialog(null)
						}}
						onRemove={(id) => {
							removeEntryRow(entryDialog.kind, id)
							setEntryDialog(null)
						}}
						onClose={() => setEntryDialog(null)}
						t={t}
					/>
				) : null}
				{valueDialog ? (
					<ValueDialog
						key={valueDialog.mode === "edit" ? valueDialog.rowId : valueDialog.typeId}
						dialog={valueDialog}
						plan={plan}
						onSave={(values) => {
							if (valueDialog.mode === "add") {
								addValueRow(valueDialog.kind, valueDialog.typeId as AssetTypeId | LiabilityTypeId, values)
							} else {
								patchValueRow(valueDialog.kind, valueDialog.rowId, values)
							}
							setValueDialog(null)
						}}
						onRemove={(id) => {
							removeValueRow(valueDialog.kind, id)
							setValueDialog(null)
						}}
						onClose={() => setValueDialog(null)}
						t={t}
					/>
				) : null}
				{milestoneDialog ? (
					<MilestoneDialog
						key={milestoneDialog.id ?? "__add__"}
						id={milestoneDialog.id}
						plan={plan}
						onSave={(values) => {
							if (milestoneDialog.id === null) {
								addMilestone(values)
							} else {
								patchMilestone(milestoneDialog.id, values)
							}
							setMilestoneDialog(null)
						}}
						onRemove={(id) => {
							removeMilestone(id)
							setMilestoneDialog(null)
						}}
						onClose={() => setMilestoneDialog(null)}
						t={t}
					/>
				) : null}
				{pickerKind ? (
					<TypePickerDialog
						kind={pickerKind}
						addedTypeIds={addedTypes[pickerKind]}
						onPick={(typeId) => {
							setAddedTypes((prev) => ({
								...prev,
								[pickerKind]: [...prev[pickerKind], typeId],
							}))
							setPickerKind(null)
						}}
						onClose={() => setPickerKind(null)}
						t={t}
					/>
				) : null}
			</Stack>
		</Theme>
	)
}

/** Editable period-row editor (income or expenses). */
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

/**
 * Month + year picker for a period row boundary. Month = Astryx Selector
 * dropdown; year = compact integer input. `allowForever` adds an ∞ option
 * that clears the end year (row runs forever).
 */
function MonthYearPicker({
	label,
	year,
	month,
	onChange,
	allowForever = false,
	t,
}: {
	label: string
	year: number | null
	month: number
	onChange: (year: number | null, month: number) => void
	allowForever?: boolean
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN
	const forever = allowForever && year === null
	const monthOptions = monthNames.map((name, index) => ({ value: `${index}:${name}`, label: name }))
	return (
		<Stack gap={0.5}>
			<Text size="sm" color="secondary">{label}</Text>
			<Stack direction="horizontal" align="center" gap={1}>
				{allowForever ? (
					<SegmentedControl
						value={forever ? "forever" : "until"}
						onChange={(value) => onChange(value === "forever" ? null : new Date().getFullYear() + 1, month)}
						label={label}
						size="sm"
					>
						<SegmentedControlItem value="until" label={t("row.until")} />
						<SegmentedControlItem value="forever" label="∞" />
					</SegmentedControl>
				) : null}
				{!forever ? (
					<>
						<NumberInput
							label={`${label} year`}
							isLabelHidden
							value={year ?? undefined}
							onChange={(value) => onChange(value === null ? null : Math.round(value), month)}
							isIntegerOnly
							min={2000}
							max={2100}
							width={88}
						/>
						<Selector
							label={`${label} month`}
							isLabelHidden
							value={`${month}:${monthNames[month]}`}
							onChange={(value) => {
								const parsed = Number.parseInt(value.split(":")[0] ?? "0", 10)
								onChange(year, Number.isFinite(parsed) ? parsed : 0)
							}}
							options={monthOptions}
							width={110}
						/>
					</>
				) : null}
			</Stack>
		</Stack>
	)
}

/** Row id for the synthetic "+ Add row" line at the bottom of an editor table. */
const ADD_ROW_ID = "__add__"

/** Nested entry table rendered inside an expanded income/expense type group. */
type PeriodRowItem = PeriodRow & Record<string, unknown>

function EntryTable({
	rows,
	plan,
	onEditItem,
	t,
}: {
	rows: PeriodRow[]
	plan: PlanInput
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const columns: TableColumn<PeriodRowItem>[] = [
		{
			key: "label",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) => (
				<PlainButton className="row-add" onClick={() => onEditItem(row)}>
					{row.label}
				</PlainButton>
			),
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(110),
			align: "end",
			renderCell: (row) => (
				<Text color="secondary" hasTabularNumbers>
					{row.startYear} – {row.endYear ?? "∞"}
				</Text>
			),
		},
		{
			key: "amount",
			header: t("table.rate"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(row.amount)} {t(row.frequency === "monthly" ? "freq.perMonth" : "freq.perYear")}
				</Text>
			),
		},
		{
			key: "lifetime",
			header: t("table.lifetime"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(rowLifetimeTotal(row, plan))}
				</Text>
			),
		},
	]

	return (
		<Table
			data={rows as PeriodRowItem[]}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
		/>
	)
}

interface PeriodGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: IncomeTypeId | ExpenseTypeId
	total?: number
	periodText?: string
}

function GroupedPeriodTable({
	kind,
	plan,
	addedTypeIds,
	onAddType,
	onAddItem,
	onEditItem,
	t,
}: {
	kind: "incomes" | "expenses"
	plan: PlanInput
	addedTypeIds: string[]
	onAddType: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "incomes" ? INCOME_TYPE_IDS : EXPENSE_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<PeriodGroupRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		getIsItemExpandable: (item) => item.id !== ADD_ROW_ID,
		renderExpanded: (item) => {
			const typeId = item.typeId!
			const entries = plan[kind].filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<EntryTable rows={entries} plan={plan} onEditItem={onEditItem} t={t} />
					) : (
						<Text color="secondary">{t("group.empty")}</Text>
					)}
					<PlainButton className="row-add" onClick={() => onAddItem(typeId)}>
						+ {t("group.addItem", { label: t(`type.${typeId}`) })}
					</PlainButton>
				</Stack>
			)
		},
	})

	const rows: PeriodGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = plan[kind].filter((r) => r.typeId === typeId)
		const total = entries.reduce((acc, r) => acc + rowLifetimeTotal(r, plan), 0)
		let periodText = "—"
		if (entries.length > 0) {
			const minStart = Math.min(...entries.map((r) => r.startYear))
			const hasForever = entries.some((r) => r.endYear === null)
			const maxEnd = hasForever ? "∞" : Math.max(...entries.map((r) => r.endYear as number))
			periodText = `${minStart} – ${maxEnd}`
		}
		return {
			id: typeId,
			typeId,
			total,
			periodText,
		}
	})

	const addMarker: PeriodGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: PeriodGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<PeriodGroupRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAddType}>
						+ {t("row.addType")}
					</PlainButton>
				) : (
					<Text weight="semibold">{t(`type.${row.typeId}`)}</Text>
				),
		},
		{
			key: "total",
			header: t("table.total"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{formatBaht(row.total ?? 0)}</Text>
				),
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(120),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{row.periodText}
					</Text>
				),
		},
	]

	return (
		<Table
			data={data}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
			plugins={{ expansion }}
		/>
	)
}

interface ValueGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: AssetTypeId | LiabilityTypeId
	total?: number
}

type ValueEntryItem = (AssetRow | LiabilityRow) & Record<string, unknown>

function GroupedValueTable({
	kind,
	plan,
	addedTypeIds,
	onAddType,
	onAddItem,
	onEditItem,
	t,
}: {
	kind: "assets" | "liabilities"
	plan: PlanInput
	addedTypeIds: string[]
	onAddType: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: AssetRow | LiabilityRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "assets" ? ASSET_TYPE_IDS : LIABILITY_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<ValueGroupRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		getIsItemExpandable: (item) => item.id !== ADD_ROW_ID,
		renderExpanded: (item) => {
			const typeId = item.typeId!
			const entries = (plan[kind] as Array<AssetRow | LiabilityRow>).filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<Table
							data={entries as ValueEntryItem[]}
							idKey="id"
							density="compact"
							dividers="rows"
							hasHover
							columns={[
								{
									key: "label",
									header: t("row.label"),
									width: proportional(1),
									renderCell: (entry) => (
										<PlainButton className="row-add" onClick={() => onEditItem(entry)}>
											{entry.label}
										</PlainButton>
									),
								},
								{
									key: "value",
									header: t("table.value"),
									width: pixel(140),
									align: "end",
									renderCell: (entry) => <Text hasTabularNumbers>{formatBaht(entry.value)}</Text>,
								},
							]}
						/>
					) : (
						<Text color="secondary">{t("group.empty")}</Text>
					)}
					<PlainButton className="row-add" onClick={() => onAddItem(typeId)}>
						+ {t("group.addItem", { label: t(`type.${typeId}`) })}
					</PlainButton>
				</Stack>
			)
		},
	})

	const rows: ValueGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = (plan[kind] as Array<AssetRow | LiabilityRow>).filter((r) => r.typeId === typeId)
		const total = entries.reduce((acc, r) => acc + r.value, 0)
		return {
			id: typeId,
			typeId,
			total,
		}
	})

	const addMarker: ValueGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: ValueGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<ValueGroupRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAddType}>
						+ {t("row.addType")}
					</PlainButton>
				) : (
					<Text weight="semibold">{t(`type.${row.typeId}`)}</Text>
				),
		},
		{
			key: "total",
			header: t("table.total"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{formatBaht(row.total ?? 0)}</Text>
				),
		},
	]

	return (
		<Table
			data={data}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
			plugins={{ expansion }}
		/>
	)
}

interface MilestoneRowData extends Record<string, unknown> {
	id: string
	label: string
	year?: number
	month?: number
}

function MilestoneTable({
	plan,
	onAdd,
	onEdit,
	t,
}: {
	plan: PlanInput
	onAdd: () => void
	onEdit: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const addMarker: MilestoneRowData = {
		id: ADD_ROW_ID,
		label: "",
	}

	const data: MilestoneRowData[] = [
		...plan.milestones.map((m) => ({
			id: m.id,
			label: m.label,
			year: m.year,
			month: m.month,
		})),
		addMarker,
	]

	const columns: TableColumn<MilestoneRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAdd}>
						+ {t("milestone.add")}
					</PlainButton>
				) : (
					<PlainButton className="row-add" onClick={() => onEdit(row.id)}>
						{row.label}
					</PlainButton>
				),
		},
		{
			key: "month",
			header: t("table.month"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{monthNames[row.month ?? 0]} {row.year}
					</Text>
				),
		},
	]

	return <Table data={data} idKey="id" density="compact" dividers="rows" hasHover columns={columns} />
}

function EntryDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	dialog:
		| { mode: "add"; kind: "incomes" | "expenses"; typeId: string }
		| { mode: "edit"; kind: "incomes" | "expenses"; rowId: string }
	plan: PlanInput
	onSave: (values: {
		label: string
		amount: number
		frequency: AmountFrequency
		startYear: number
		startMonth: number
		endYear: number | null
		endMonth: number
		growthMode: PeriodRow["growthMode"]
		growthRate: number
		deductible?: PeriodRow["deductible"]
	}) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const existingRow = dialog.mode === "edit" ? plan[dialog.kind].find((r) => r.id === dialog.rowId) : null
	const typeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ?? (dialog.kind === "incomes" ? "salary" : "livingExpenses"))
			: dialog.typeId
	const defaultFreq =
		dialog.kind === "incomes"
			? (INCOME_TYPE_DEFAULT_FREQUENCY[typeId as IncomeTypeId] ?? "monthly")
			: (EXPENSE_TYPE_DEFAULT_FREQUENCY[typeId as ExpenseTypeId] ?? "monthly")

	const [label, setLabel] = useState(dialog.mode === "edit" ? (existingRow?.label ?? "") : t(`type.${typeId}`))
	const [amount, setAmount] = useState(dialog.mode === "edit" ? (existingRow?.amount ?? 0) : 0)
	const [frequency, setFrequency] = useState<AmountFrequency>(
		dialog.mode === "edit" ? (existingRow?.frequency ?? defaultFreq) : defaultFreq,
	)
	const [startYear, setStartYear] = useState(dialog.mode === "edit" ? (existingRow?.startYear ?? plan.startYear) : plan.startYear)
	const [startMonth, setStartMonth] = useState(dialog.mode === "edit" ? (existingRow?.startMonth ?? 0) : 0)
	const [endYear, setEndYear] = useState<number | null>(dialog.mode === "edit" ? (existingRow?.endYear ?? null) : null)
	const [endMonth, setEndMonth] = useState(dialog.mode === "edit" ? (existingRow?.endMonth ?? 11) : 11)
	const [growthMode, setGrowthMode] = useState<PeriodRow["growthMode"]>(
		dialog.mode === "edit" ? (existingRow?.growthMode ?? "inflation") : "inflation",
	)
	const [growthRate, setGrowthRate] = useState(dialog.mode === "edit" ? (existingRow?.growthRate ?? 0) : 0)
	const [deductible, setDeductible] = useState<PeriodRow["deductible"]>(
		dialog.mode === "edit" ? (existingRow?.deductible ?? "none") : "none",
	)

	const typeLabel = t(`type.${typeId}`)
	const title = dialog.mode === "add" ? t("dialog.addItem", { label: typeLabel }) : t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={640}>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Grid columns={{ minWidth: 240, max: 2 }} gap={1.5}>
							<TextInput
								label={t("row.label")}
								value={label}
								onChange={setLabel}
							/>
							<NumberInput
								label={t("row.amount")}
								value={amount}
								onChange={(v) => setAmount(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
							<Stack gap={0.5}>
								<Text size="sm" color="secondary">{t("row.frequency")}</Text>
								<SegmentedControl
									value={frequency}
									onChange={(v) => setFrequency(v as AmountFrequency)}
									label={t("row.frequency")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem value="monthly" label={t("freq.monthly")} />
									<SegmentedControlItem value="yearly" label={t("freq.yearly")} />
								</SegmentedControl>
							</Stack>
							<MonthYearPicker
								label={t("row.startYear")}
								year={startYear}
								month={startMonth}
								onChange={(y, m) => {
									if (y !== null) setStartYear(y)
									setStartMonth(m)
								}}
								t={t}
							/>
							<MonthYearPicker
								label={t("row.endYear")}
								year={endYear}
								month={endMonth}
								allowForever
								onChange={(y, m) => {
									setEndYear(y)
									setEndMonth(m)
								}}
								t={t}
							/>
							<Stack gap={1}>
								<Text size="sm" color="secondary">{t("row.growth")}</Text>
								<SegmentedControl
									value={growthMode}
									onChange={(v) => setGrowthMode(v as PeriodRow["growthMode"])}
									label={t("row.growth")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem value="inflation" label={t("growth.inflation")} />
									<SegmentedControlItem value="fixed" label={t("growth.fixed")} />
									<SegmentedControlItem value="override" label={t("growth.override")} />
								</SegmentedControl>
								{growthMode === "override" ? (
									<NumberInput
										label={t("row.growthRate")}
										value={growthRate * 100}
										onChange={(v) => setGrowthRate((v ?? 0) / 100)}
										min={-10}
										max={50}
										step={0.5}
										units="%"
									/>
								) : null}
							</Stack>
							{dialog.kind === "expenses" ? (
								<Stack gap={1}>
									<Text size="sm" color="secondary">{t("row.deductible")}</Text>
									<SegmentedControl
										value={deductible ?? "none"}
										onChange={(v) => setDeductible(v === "mortgageInterest" ? "mortgageInterest" : "none")}
										label={t("row.deductible")}
										layout="fill"
										size="sm"
									>
										<SegmentedControlItem value="none" label={t("deductible.none")} />
										<SegmentedControlItem value="mortgageInterest" label={t("deductible.mortgageInterest")} />
									</SegmentedControl>
								</Stack>
							) : null}
						</Grid>
					</LayoutContent>
				}
				footer={
					<LayoutFooter>
						<HStack gap={2} hAlign="end">
							{dialog.mode === "edit" ? (
								<PlainButton onClick={() => onRemove(dialog.rowId)}>
									{t("row.remove")}
								</PlainButton>
							) : null}
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										label: label.trim() || typeLabel,
										amount,
										frequency,
										startYear,
										startMonth,
										endYear,
										endMonth,
										growthMode,
										growthRate,
										...(dialog.kind === "expenses" ? { deductible } : {}),
									})
								}}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}

function ValueDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	dialog:
		| { mode: "add"; kind: "assets" | "liabilities"; typeId: string }
		| { mode: "edit"; kind: "assets" | "liabilities"; rowId: string }
	plan: PlanInput
	onSave: (values: { label: string; value: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const existingRow =
		dialog.mode === "edit" ? (plan[dialog.kind] as Array<AssetRow | LiabilityRow>).find((r) => r.id === dialog.rowId) : null
	const typeId = dialog.mode === "edit" ? (existingRow?.typeId ?? (dialog.kind === "assets" ? "stock" : "debt")) : dialog.typeId
	const typeLabel = t(`type.${typeId}`)
	const [label, setLabel] = useState(dialog.mode === "edit" ? (existingRow?.label ?? "") : typeLabel)
	const [value, setValue] = useState(dialog.mode === "edit" ? (existingRow?.value ?? 0) : 0)

	const title = dialog.mode === "add" ? t("dialog.addItem", { label: typeLabel }) : t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={520}>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Stack gap={1.5}>
							<TextInput label={t("row.label")} value={label} onChange={setLabel} />
							<NumberInput
								label={t("table.value")}
								value={value}
								onChange={(v) => setValue(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
						</Stack>
					</LayoutContent>
				}
				footer={
					<LayoutFooter>
						<HStack gap={2} hAlign="end">
							{dialog.mode === "edit" ? (
								<PlainButton onClick={() => onRemove(dialog.rowId)}>
									{t("row.remove")}
								</PlainButton>
							) : null}
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										label: label.trim() || typeLabel,
										value,
									})
								}}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}

function MilestoneDialog({
	id,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: {
	id: string | null
	plan: PlanInput
	onSave: (values: { label: string; year: number; month: number }) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const existing = id !== null ? plan.milestones.find((m) => m.id === id) : null
	const [label, setLabel] = useState(existing?.label ?? "")
	const [year, setYear] = useState(existing?.year ?? plan.startYear + 29)
	const [month, setMonth] = useState(existing?.month ?? 0)

	const title = id === null ? t("milestone.add") : t("milestone.edit")

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="form" width={520}>
			<Layout
				header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						<Stack gap={1.5}>
							<TextInput label={t("row.label")} value={label} onChange={setLabel} />
							<MonthYearPicker
								label={t("table.month")}
								year={year}
								month={month}
								onChange={(y, m) => {
									if (y !== null) setYear(y)
									setMonth(m)
								}}
								t={t}
							/>
						</Stack>
					</LayoutContent>
				}
				footer={
					<LayoutFooter>
						<HStack gap={2} hAlign="end">
							{id !== null ? (
								<PlainButton onClick={() => onRemove(id)}>
									{t("row.remove")}
								</PlainButton>
							) : null}
							<Button label={t("dialog.cancel")} variant="secondary" onClick={onClose} />
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										label: label.trim() || t("tab.milestone"),
										year,
										month,
									})
								}}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}

function TypePickerDialog({
	kind,
	addedTypeIds,
	onPick,
	onClose,
	t,
}: {
	kind: "incomes" | "expenses" | "assets" | "liabilities"
	addedTypeIds: string[]
	onPick: (typeId: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const catalog =
		kind === "incomes"
			? INCOME_TYPE_IDS
			: kind === "expenses"
				? EXPENSE_TYPE_IDS
				: kind === "assets"
					? ASSET_TYPE_IDS
					: LIABILITY_TYPE_IDS

	const available = catalog.filter((id) => !addedTypeIds.includes(id))

	const titleKey =
		kind === "incomes"
			? "dialog.addType.income"
			: kind === "expenses"
				? "dialog.addType.expense"
				: kind === "assets"
					? "dialog.addType.asset"
					: "dialog.addType.liability"

	return (
		<Dialog isOpen onOpenChange={(open) => { if (!open) onClose() }} purpose="info" width={420}>
			<Layout
				header={<DialogHeader title={t(titleKey)} onOpenChange={() => onClose()} />}
				content={
					<LayoutContent>
						{available.length === 0 ? (
							<Text color="secondary">{t("dialog.allTypesAdded")}</Text>
						) : (
							<Stack className="dialog-options">
								{available.map((id) => (
									<PlainButton
										key={id}
										className="dialog-option"
										onClick={() => onPick(id)}
									>
										{t(`type.${id}`)}
									</PlainButton>
								))}
							</Stack>
						)}
					</LayoutContent>
				}
			/>
		</Dialog>
	)
}

/* ── Assistant rail (right column) ────────────────────────────────────────
 * Modeled on the Astryx "AI Chat Conversation" template: header, "Today"
 * separator, alternating turns (user bubble right / assistant plain text
 * with avatar left), and a floating composer card with an "Ask" selector
 * and a circular send button. The rail is always present. Replies are canned
 * summaries computed from the plan — the real assistant swaps in behind the
 * same props later.
 * ────────────────────────────────────────────────────────────────────── */
interface ChatMessage {
	id: number
	role: "user" | "assistant"
	text: string
	/** Demo tool calls shown as collapsible rows above the reply text. */
	toolCalls?: ChatToolCallItem[]
}

function AssistantRail({
	summary,
	t,
}: {
	summary: PlanSummary
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [draft, setDraft] = useState("")
	const nextId = useRef(1)
	const logRef = useRef<HTMLDivElement | null>(null)

	/**
	 * Demo tool-call flow: the assistant "runs" two tools derived from the
	 * live plan before answering — each call flips from running → complete
	 * so the Astryx collapsible tool rows animate like a real assistant.
	 */
	const demoToolCalls = (question: string): ChatToolCallItem[] => {
		const q = question.toLowerCase()
		const v = summary.retirement
		const calls: ChatToolCallItem[] = [{ name: "get_plan_snapshot", target: "plan/current", node: "plan-engine" }]
		if (q.includes("retire") || q.includes("เกษียณ") || q.includes("run out") || q.includes("หมด")) {
			calls.push({
				name: "simulate_retirement",
				target: v.funded ? `until ${v.endYear}` : `runs out ${v.unmetYear ?? ""}`,
				node: "monte-carlo",
				stats: "200 scenarios",
			})
		}
		if (q.includes("spend") || q.includes("afford") || q.includes("ใช้")) {
			calls.push({ name: "solve_max_forever", target: "monthly withdrawal", node: "plan-engine" })
		}
		return calls
	}

	const send = () => {
		const text = draft.trim()
		if (!text) return
		const userId = nextId.current++
		const assistantId = nextId.current++
		const calls = demoToolCalls(text)
		// Turn 1: tool calls running (no text yet). Turn 2: calls complete +
		// the canned answer, once the "tools" have had time to finish.
		setMessages((current) => [
			...current,
			{ id: userId, role: "user", text },
			{ id: assistantId, role: "assistant", text: "", toolCalls: calls.map((call) => ({ ...call, status: "running" as const })) },
		])
		setDraft("")
		window.setTimeout(() => {
			setMessages((current) =>
				current.map((message) =>
					message.id === assistantId
						? {
								...message,
								text: mockReply(text, summary, t),
								toolCalls: calls.map((call) => ({ ...call, status: "complete" as const, duration: "0.4s" })),
							}
						: message,
				),
			)
		}, 900)
		window.setTimeout(() => {
			logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" })
		}, 950)
	}

	return (
		<Stack className="assistant-rail" role="log" aria-live="polite">
			<Stack direction="horizontal" justify="between" vAlign="center" className="assistant-rail__head">
				<Stack gap={0}>
					<Text weight="semibold">{t("rail.title")}</Text>
					<Text size="sm" color="secondary">{t("rail.subtitle")}</Text>
				</Stack>
			</Stack>

			<Stack className="assistant-rail__log" ref={logRef}>
				<Text size="sm" color="secondary" className="assistant-rail__day">{t("rail.today")}</Text>
				<ChatMessageList className="assistant-rail__list" aria-label={t("rail.title")}>
					{messages.length === 0 ? (
						<Text size="sm" color="secondary">{t("chat.empty")}</Text>
					) : (
						messages.map((message) =>
							message.role === "user" ? (
								<ChatMessage key={message.id} sender="user">
									<ChatMessageBubble name={t("rail.you")}>{message.text}</ChatMessageBubble>
								</ChatMessage>
							) : (
								<ChatMessage
									key={message.id}
									sender="assistant"
									avatar={<Stack vAlign="center" className="assistant-avatar" aria-hidden="true">A</Stack>}
								>
									{message.toolCalls && message.toolCalls.length > 0 ? (
										<ChatToolCalls calls={message.toolCalls} />
									) : null}
									{message.text ? (
										<ChatMessageBubble variant="ghost">{message.text}</ChatMessageBubble>
									) : null}
								</ChatMessage>
							),
						)
					)}
				</ChatMessageList>
			</Stack>

			<ChatComposer
				className="assistant-composer"
				value={draft}
				onChange={setDraft}
				onSubmit={send}
				placeholder={t("chat.placeholder")}
			/>
		</Stack>
	)
}

/** Canned demo answers derived from the live plan summary. */
function mockReply(
	text: string,
	summary: PlanSummary,
	t: (key: string, vars?: Record<string, string>) => string,
): string {
	const question = text.toLowerCase()
	const v = summary.retirement
	if (question.includes("retire") || question.includes("เกษียณ")) {
		return t("chat.reply.retirement", {
			status: v.funded ? t("chat.status.funded") : t("chat.status.short"),
			detail: v.funded
				? t("info.retirement.left", { amount: formatBaht(v.remainingAtEnd), year: String(v.endYear) })
				: t("info.retirement.runsOut", { year: String(v.unmetYear ?? "") }),
		})
	}
	if (question.includes("run out") || question.includes("หมด")) {
		const year = summary.runsOutYear
		return t("chat.reply.runway", { year: year === null ? t("info.runsOut.never") : String(year) })
	}
	if (question.includes("spend") || question.includes("afford") || question.includes("ใช้")) {
		return t("chat.reply.maxForever", { amount: formatBaht(summary.maxForeverMonthly) })
	}
	return t("chat.reply.fallback")
}
