import { useEffect, useMemo, useState } from "react"
import {
	Card,
	Grid,
	Img,
	PlainButton,
	Stack,
	Tab,
	TabList,
	Table,
	Text,
	Theme,
	mastercardTheme,
	pixel,
	proportional,
	type DateInputProps,
} from "@excited-live/design-system"
import { createFileRoute } from "@tanstack/react-router"
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
} from "../lib/plan-service"
import { formatBaht, formatPercent } from "../lib/format"
import { ProjectionChart } from "../components/ProjectionChart"
import { AssistantRail } from "../components/AssistantRail"
import {
	EntryDialog,
	type EntryDialogDescriptor,
} from "../components/EntryDialog"
import {
	ValueDialog,
	type ValueDialogDescriptor,
} from "../components/ValueDialog"
import { MilestoneDialog } from "../components/MilestoneDialog"
import { MilestoneTable } from "../components/MilestoneTable"
import { GroupedPeriodTable } from "../components/GroupedPeriodTable"
import { GroupedValueTable } from "../components/GroupedValueTable"
import { SettingsPanel } from "../components/SettingsPanel"
import {
	TypePickerDialog,
	type TypePickerKind,
} from "../components/TypePickerDialog"

export const Route = createFileRoute("/")({
	component: Home,
})

type HorizonKey = "10" | "20" | "30" | "40" | "all"
type MetricKey = "metric.netWorth" | "metric.cashFlow"
type LeftTab =
	| "financials"
	| "milestone"
	| "incomes"
	| "expenses"
	| "assets"
	| "liabilities"
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
				<Stack
					direction="horizontal"
					justify="between"
					vAlign="center"
					as="header"
					className="topbar"
				>
					<Stack direction="horizontal" vAlign="center" className="brand-lockup">
						<Img
							className="brand-lockup__mark"
							src="/logo-mark.png"
							alt=""
							width={30}
							height={26}
						/>
						<Img
							className="brand-lockup__wordmark"
							src="/logo-wordmark.png"
							alt="excited.live"
							height={15}
						/>
						<Text
							size="lg"
							color="secondary"
							weight="semibold"
							className="brand-lockup__hello"
						>
							{t("nav.hello")}
						</Text>
					</Stack>
					<TabList
						className="topnav"
						value={page}
						onChange={(value) =>
							setPage(value === "settings" ? "settings" : "plan")
						}
						size="sm"
						aria-label={t("a11y.mainNav")}
					>
						<Tab value="plan" label={t("nav.plan")} />
						<Tab value="settings" label={t("nav.settings")} />
					</TabList>
					<Stack
						direction="horizontal"
						vAlign="center"
						className="market-status"
					>
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
								<SettingsPanel
									profileName={profileName}
									onProfileNameChange={setProfileName}
									birthday={birthday}
									onBirthdayChange={setBirthday}
									gender={gender}
									onGenderChange={setGender}
									t={t}
								/>
							) : (
								<Stack className="chart-panel__inner">
									<Stack
										direction="horizontal"
										vAlign="center"
										className="chart-toolbar"
									>
										<Stack
											direction="horizontal"
											vAlign="center"
											role="group"
											aria-label={t("a11y.chartMetric")}
											className="metric-switch"
										>
											<PlainButton
												className={`metric-switch__item ${metric === "metric.netWorth" ? "is-active" : ""}`}
												onClick={() => setMetric("metric.netWorth")}
											>
												<Text
													className="metric-indicator metric-indicator--white"
													aria-hidden="true"
												>
													{""}
												</Text>
												{t("metric.netWorth")}
											</PlainButton>
											<PlainButton
												className={`metric-switch__item ${metric === "metric.cashFlow" ? "is-active" : ""}`}
												onClick={() => setMetric("metric.cashFlow")}
											>
												<Text
													className="metric-indicator metric-indicator--purple"
													aria-hidden="true"
												>
													{""}
												</Text>
												{t("metric.cashFlow")}
											</PlainButton>
										</Stack>
										<Stack
											direction="horizontal"
											vAlign="center"
											role="group"
											aria-label={t("a11y.chartPeriod")}
											className="period-switch"
										>
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
												metric={
													metric === "metric.netWorth"
														? "netWorth"
														: "cashFlow"
												}
												ariaLabel={t(
													metric === "metric.netWorth"
														? "chart.aria.netWorth"
														: "chart.aria.cashFlow",
												)}
												band={shownBands ?? undefined}
												milestones={plan.milestones}
												onActiveYearChange={setHoverYear}
											/>
										) : (
											<Text color="secondary">
												{summary.ok ? "" : summary.error.message}
											</Text>
										)}
										{bandCaption ? (
											<Text
												size="sm"
												color="secondary"
												className="chart-band-caption"
											>
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
										<Tab
											value="financials"
											label={t("tab.financials")}
											panelId="left-panel-financials"
										/>
										<Tab
											value="milestone"
											label={t("tab.milestone")}
											panelId="left-panel-milestone"
										/>
										<Tab
											value="incomes"
											label={t("tab.income")}
											panelId="left-panel-incomes"
										/>
										<Tab
											value="expenses"
											label={t("tab.expenses")}
											panelId="left-panel-expenses"
										/>
										<Tab
											value="assets"
											label={t("tab.assets")}
											panelId="left-panel-assets"
										/>
										<Tab
											value="liabilities"
											label={t("tab.liabilities")}
											panelId="left-panel-liabilities"
										/>
									</TabList>

									{leftTab === "financials" ? (
										<Stack
											id="left-panel-financials"
											className="tab-inputs"
											aria-label={t("a11y.financialSnapshot")}
										>
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
														renderCell: (row) => (
															<Text weight="semibold">
																{t(row.key)}
															</Text>
														),
													},
													{
														key: "value",
														header: t("table.value"),
														width: pixel(130),
														align: "end",
														renderCell: (row) => (
															<Text hasTabularNumbers>
																{row.value}
															</Text>
														),
													},
												]}
											/>
										</Stack>
									) : leftTab === "milestone" ? (
										<Stack
											id="left-panel-milestone"
											className="tab-inputs"
											aria-label={t("tab.milestone")}
										>
											<MilestoneTable
												plan={plan}
												onAdd={() => setMilestoneDialog({ id: null })}
												onEdit={(id) => setMilestoneDialog({ id })}
												t={t}
											/>
										</Stack>
									) : leftTab === "incomes" ? (
										<Stack
											id="left-panel-incomes"
											className="tab-inputs"
											aria-label={t("tab.income")}
										>
											<GroupedPeriodTable
												kind="incomes"
												plan={plan}
												addedTypeIds={addedTypes.incomes}
												onAddType={() => setPickerKind("incomes")}
												onAddItem={(typeId) => {
													if (ADD_DIALOG_TYPE_IDS.has(typeId)) {
														setEntryDialog({
															mode: "add",
															kind: "incomes",
															typeId,
														})
													}
												}}
												onEditItem={(row) =>
													setEntryDialog({
														mode: "edit",
														kind: "incomes",
														rowId: row.id,
													})
												}
												t={t}
											/>
										</Stack>
									) : leftTab === "expenses" ? (
										<Stack
											id="left-panel-expenses"
											className="tab-inputs"
											aria-label={t("tab.expenses")}
										>
											<GroupedPeriodTable
												kind="expenses"
												plan={plan}
												addedTypeIds={addedTypes.expenses}
												onAddType={() => setPickerKind("expenses")}
												onAddItem={(typeId) => {
													if (ADD_DIALOG_TYPE_IDS.has(typeId)) {
														setEntryDialog({
															mode: "add",
															kind: "expenses",
															typeId,
														})
													}
												}}
												onEditItem={(row) =>
													setEntryDialog({
														mode: "edit",
														kind: "expenses",
														rowId: row.id,
													})
												}
												t={t}
											/>
										</Stack>
									) : leftTab === "assets" ? (
										<Stack
											id="left-panel-assets"
											className="tab-inputs"
											aria-label={t("tab.assets")}
										>
											<GroupedValueTable
												kind="assets"
												plan={plan}
												addedTypeIds={addedTypes.assets}
												onAddType={() => setPickerKind("assets")}
												onAddItem={(typeId) =>
													setValueDialog({
														mode: "add",
														kind: "assets",
														typeId,
													})
												}
												onEditItem={(row) =>
													setValueDialog({
														mode: "edit",
														kind: "assets",
														rowId: row.id,
													})
												}
												t={t}
											/>
										</Stack>
									) : (
										<Stack
											id="left-panel-liabilities"
											className="tab-inputs"
											aria-label={t("tab.liabilities")}
										>
											<GroupedValueTable
												kind="liabilities"
												plan={plan}
												addedTypeIds={addedTypes.liabilities}
												onAddType={() => setPickerKind("liabilities")}
												onAddItem={(typeId) =>
													setValueDialog({
														mode: "add",
														kind: "liabilities",
														typeId,
													})
												}
												onEditItem={(row) =>
													setValueDialog({
														mode: "edit",
														kind: "liabilities",
														rowId: row.id,
													})
												}
												t={t}
											/>
										</Stack>
									)}
								</Stack>
							)}
						</Card>

						<Stack
							as="section"
							className="plan-column"
							aria-label={t("rail.title")}
						>
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
						key={
							entryDialog.mode === "edit"
								? entryDialog.rowId
								: entryDialog.typeId
						}
						dialog={entryDialog}
						plan={plan}
						onSave={(values) => {
							if (entryDialog.mode === "add") {
								addEntryRow(
									entryDialog.kind,
									entryDialog.typeId as IncomeTypeId | ExpenseTypeId,
									values,
								)
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
						key={
							valueDialog.mode === "edit"
								? valueDialog.rowId
								: valueDialog.typeId
						}
						dialog={valueDialog}
						plan={plan}
						onSave={(values) => {
							if (valueDialog.mode === "add") {
								addValueRow(
									valueDialog.kind,
									valueDialog.typeId as AssetTypeId | LiabilityTypeId,
									values,
								)
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
