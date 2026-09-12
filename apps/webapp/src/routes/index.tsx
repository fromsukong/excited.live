import { useEffect, useMemo, useRef, useState } from "react"
import {
	Card,
	ChatComposer,
	ChatMessage,
	ChatMessageBubble,
	ChatMessageList,
	ChatToolCalls,
	DateInput,
	Grid,
	Heading,
	Img,
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
	computeMonteCarloBands,
	computePlanSummary,
	defaultPlan,
	type MonteCarloResult,
	type PlanInput,
	type PlanSummary,
	type PeriodRow,
	type WalletId,
} from "../lib/plan-service"
import { ProjectionChart } from "../components/ProjectionChart"
import { formatBaht, formatPercent } from "../lib/format"

export const Route = createFileRoute("/")({
	component: Home,
})

type HorizonKey = "10" | "20" | "30" | "40" | "all"
type MetricKey = "metric.netWorth" | "metric.cashFlow"
type LeftTab = "financials" | "incomes" | "expenses" | "wallet"
type PageKey = "plan" | "settings"

interface FinancialMetric extends Record<string, unknown> {
	key: string
	value: string
}

const HORIZONS: readonly HorizonKey[] = ["10", "20", "30", "40", "all"]

const WALLETS: readonly WalletId[] = ["emergency", "goal", "nontax", "taxAdvantaged"]

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

	const patchRow = (kind: "incomes" | "expenses", id: string, patch: Partial<PeriodRow>) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].map((row) => (row.id === id ? { ...row, ...patch } : row)),
		}))
	}

	const addRow = (kind: "incomes" | "expenses") => {
		setPlan((current) => ({
			...current,
			[kind]: [
				...current[kind],
				{
					id: `${kind}-${current[kind].length + 1}-${current[kind].length}`,
					label: kind === "incomes" ? "New income" : "New expense",
					startYear: current.startYear,
					endYear: null,
					amount: 0,
					growthMode: "inflation",
					growthRate: 0,
				},
			],
		}))
	}

	const removeRow = (kind: "incomes" | "expenses", id: string) => {
		setPlan((current) => ({
			...current,
			[kind]: current[kind].filter((row) => row.id !== id),
		}))
	}

	const patchWallet = (
		field: "savingsSplit" | "walletRates" | "startingWallets",
		id: WalletId,
		value: number,
	) => {
		setPlan((current) => ({ ...current, [field]: { ...current[field], [id]: value } }))
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
											if (value === "incomes" || value === "expenses" || value === "wallet") {
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
										<Tab value="incomes" label={t("tab.income")} panelId="left-panel-incomes" />
										<Tab value="expenses" label={t("tab.expenses")} panelId="left-panel-expenses" />
										<Tab value="wallet" label={t("tab.wallet")} panelId="left-panel-wallet" />
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
									) : leftTab === "incomes" ? (
										<Stack id="left-panel-incomes" className="tab-inputs" aria-label={t("incomes.heading")}>
											<PeriodTable
												rows={plan.incomes}
												heading={t("incomes.heading")}
												onPatch={(id, patch) => patchRow("incomes", id, patch)}
												onAdd={() => addRow("incomes")}
												onRemove={(id) => removeRow("incomes", id)}
												t={t}
											/>
										</Stack>
									) : leftTab === "expenses" ? (
										<Stack id="left-panel-expenses" className="tab-inputs" aria-label={t("expenses.heading")}>
											<PeriodTable
												rows={plan.expenses}
												heading={t("expenses.heading")}
												showDeductible
												onPatch={(id, patch) => patchRow("expenses", id, patch)}
												onAdd={() => addRow("expenses")}
												onRemove={(id) => removeRow("expenses", id)}
												t={t}
											/>
										</Stack>
									) : (
										<Stack id="left-panel-wallet" className="tab-inputs" aria-label={t("wallets.heading")}>
											<Heading level={3}>{t("wallets.heading")}</Heading>
											<WalletTable plan={plan} onPatch={patchWallet} t={t} />
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
	const monthOptions = monthNames.map((name, index) => `${index}:${name}`)
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

/** Detail editor for one period row — rendered in the expanded panel below its row. */
function PeriodRowEditor({
	row,
	showDeductible,
	onPatch,
	onRemove,
	t,
}: {
	row: PeriodRow
	showDeductible?: boolean
	onPatch: (id: string, patch: Partial<PeriodRow>) => void
	onRemove: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	return (
		<Stack className="row-detail">
			<Grid columns={{ minWidth: showDeductible ? 150 : 185, max: showDeductible ? 6 : 5 }} gap={1.5}>
				<TextInput
					label={t("row.label")}
					value={row.label}
					onChange={(value) => onPatch(row.id, { label: value })}
				/>
				<NumberInput
					label={t("row.amount")}
					value={row.amount}
					onChange={(value) => onPatch(row.id, { amount: value })}
					min={0}
					step={10_000}
					units="฿"
				/>
				<MonthYearPicker
					label={t("row.startYear")}
					year={row.startYear}
					month={row.startMonth}
					onChange={(year, month) =>
						onPatch(row.id, { startYear: year ?? row.startYear, startMonth: month })
					}
					t={t}
				/>
				<MonthYearPicker
					label={t("row.endYear")}
					year={row.endYear}
					month={row.endMonth}
					allowForever
					onChange={(year, month) => onPatch(row.id, { endYear: year, endMonth: month })}
					t={t}
				/>
				<Stack gap={1}>
					<SegmentedControl
						value={row.growthMode}
						onChange={(value) => onPatch(row.id, { growthMode: value as PeriodRow["growthMode"] })}
						label={t("row.growth")}
						layout="fill"
						size="sm"
					>
						<SegmentedControlItem value="inflation" label={t("growth.inflation")} />
						<SegmentedControlItem value="fixed" label={t("growth.fixed")} />
						<SegmentedControlItem value="override" label={t("growth.override")} />
					</SegmentedControl>
					{row.growthMode === "override" ? (
						<NumberInput
							label={t("row.growthRate")}
							value={row.growthRate * 100}
							onChange={(value) => onPatch(row.id, { growthRate: value / 100 })}
							min={-10}
							max={50}
							step={0.5}
							units="%"
						/>
					) : null}
				</Stack>
				{showDeductible ? (
					<Stack gap={1}>
						<SegmentedControl
							value={row.deductible ?? "none"}
							onChange={(value) =>
								onPatch(row.id, {
									deductible: value === "mortgageInterest" ? "mortgageInterest" : "none",
								})
							}
							label={t("row.deductible")}
							layout="fill"
							size="sm"
						>
							<SegmentedControlItem value="none" label={t("deductible.none")} />
							<SegmentedControlItem value="mortgageInterest" label={t("deductible.mortgageInterest")} />
						</SegmentedControl>
						<PlainButton onClick={() => onRemove(row.id)}>{t("row.remove")}</PlainButton>
					</Stack>
				) : (
					<PlainButton onClick={() => onRemove(row.id)}>{t("row.remove")}</PlainButton>
				)}
			</Grid>
		</Stack>
	)
}

/** Period-row table (income or expenses): clean read-only rows; expand a row to edit it. */
type PeriodRowData = PeriodRow & Record<string, unknown>

function PeriodTable({
	rows,
	heading,
	showDeductible,
	onPatch,
	onAdd,
	onRemove,
	t,
}: {
	rows: PeriodRow[]
	heading: string
	showDeductible?: boolean
	onPatch: (id: string, patch: Partial<PeriodRow>) => void
	onAdd: () => void
	onRemove: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const expansion = useTableRowExpansion<PeriodRowData>({
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
		renderExpanded: (item) => (
			<PeriodRowEditor row={item} showDeductible={showDeductible} onPatch={onPatch} onRemove={onRemove} t={t} />
		),
	})

	const addMarker: PeriodRowData = {
		id: ADD_ROW_ID,
		label: "",
		startYear: rows[0]?.startYear ?? 2026,
		startMonth: 0,
		endYear: null,
		endMonth: 11,
		amount: 0,
		growthMode: "inflation",
		growthRate: 0,
	}
	const data: PeriodRowData[] = [...(rows as PeriodRowData[]), addMarker]

	const columns: TableColumn<PeriodRowData>[] = [
		{
			key: "label",
			header: t("row.label"),
			width: proportional(2),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAdd}>
						+ {t("row.add")}
					</PlainButton>
				) : (
					<Text weight="semibold">{row.label}</Text>
				),
		},
		{
			key: "amount",
			header: t("row.amount"),
			width: pixel(150),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : <Text hasTabularNumbers>{formatBaht(row.amount)}</Text>,
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{row.startYear} – {row.endYear ?? "∞"}
					</Text>
				),
		},
	]

	return (
		<Stack gap={2}>
			<Heading level={3}>{heading}</Heading>
			<Table data={data} idKey="id" density="compact" dividers="rows" hasHover columns={columns} plugins={{ expansion }} />
		</Stack>
	)
}

/** Wallet table: read-only split/rate rows; expand a row to edit split, rate, starting balance. */
type WalletRowData = { id: WalletId; label: string }

function WalletTable({
	plan,
	onPatch,
	t,
}: {
	plan: PlanInput
	onPatch: (field: "savingsSplit" | "walletRates" | "startingWallets", id: WalletId, value: number) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const data: WalletRowData[] = WALLETS.map((id) => ({ id, label: t(`wallet.${id}`) }))
	const expansion = useTableRowExpansion<WalletRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		renderExpanded: (item) => (
			<Stack className="row-detail">
				<Grid columns={{ minWidth: 170, max: 3 }} gap={2}>
					<NumberInput
						label={t("wallets.split")}
						value={Math.round(plan.savingsSplit[item.id] * 100 * 100) / 100}
						onChange={(value) => onPatch("savingsSplit", item.id, value / 100)}
						min={0}
						max={100}
						step={5}
						units="%"
					/>
					<NumberInput
						label={t("wallets.rates")}
						value={Math.round(plan.walletRates[item.id] * 100 * 100) / 100}
						onChange={(value) => onPatch("walletRates", item.id, value / 100)}
						min={0}
						max={30}
						step={0.5}
						units="%"
					/>
					<NumberInput
						label={t("wallets.starting")}
						value={plan.startingWallets[item.id]}
						onChange={(value) => onPatch("startingWallets", item.id, value)}
						min={0}
						max={100_000_000}
						step={10_000}
						units="฿"
					/>
				</Grid>
			</Stack>
		),
	})
	const columns: TableColumn<WalletRowData>[] = [
		{
			key: "label",
			header: t("table.wallet"),
			width: proportional(1),
			renderCell: (row) => <Text weight="semibold">{row.label}</Text>,
		},
		{
			key: "split",
			header: t("wallets.split"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => <Text hasTabularNumbers>{formatPercent(plan.savingsSplit[row.id])}</Text>,
		},
		{
			key: "rate",
			header: t("wallets.rates"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => <Text hasTabularNumbers>{formatPercent(plan.walletRates[row.id])}</Text>,
		},
	]

	return <Table data={data} idKey="id" density="compact" dividers="rows" hasHover columns={columns} plugins={{ expansion }} />
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
