import { useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react"
import {
	BookmarkIcon,
	Button,
	CalendarIcon,
	Card,
	ChartIcon,
	CompassIcon,
	Grid,
	Heading,
	Img,
	LinkIcon,
	NumberInput,
	PlainButton,
	PresentationIcon,
	SegmentedControl,
	Selector,
	SegmentedControlItem,
	Stack,
	Text,
	TextInput,
	Theme,
	mastercardTheme,
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
import { formatBaht, formatBahtMonthly, formatPercent } from "../lib/format"

export const Route = createFileRoute("/")({
	component: Home,
})

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
type HorizonKey = "10" | "20" | "30" | "40" | "all"
type MetricKey = "metric.netWorth" | "metric.cashFlow"

interface FinancialMetric {
	key: string
	value: string
}

interface PlanInfo {
	labelKey: string
	value: string
	descKey: string
	descVars?: Record<string, string | undefined>
	Icon: IconComponent
}

const HORIZONS: readonly HorizonKey[] = ["10", "20", "30", "40", "all"]

const WALLETS: readonly WalletId[] = ["emergency", "goal", "nontax", "taxAdvantaged"]

function Home() {
	const { t, locale, setLocale } = useLocale()
	const [plan, setPlan] = useState<PlanInput>(() => defaultPlan())
	const [horizon, setHorizon] = useState<HorizonKey>("30")
	const [metric, setMetric] = useState<MetricKey>("metric.netWorth")
	const [selectedMetricKey, setSelectedMetricKey] = useState<string>("metric.netWorthValue")
	const [leftTab, setLeftTab] = useState<"financials" | "answers">("financials")
	const [hoverYear, setHoverYear] = useState<number | null>(null)
	const inputsRef = useRef<HTMLElement | null>(null)

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

	const planInfos = useMemo<PlanInfo[]>(() => {
		if (!summary.ok) return []
		const s = summary.data
		const v = s.retirement
		const goalsOk = s.goals.filter((g) => g.onTrack).length
		const goalsShort = s.goals.length - goalsOk
		return [
			{
				labelKey: "info.retirement",
				value: v.funded ? t("info.retirement.funded") : t("info.retirement.short"),
				descKey: v.funded ? "info.retirement.left" : "info.retirement.runsOut",
				descVars: {
					amount: formatBaht(v.remainingAtEnd),
					year: String(v.funded ? v.endYear : (v.unmetYear ?? "")),
				},
				Icon: CompassIcon,
			},
			{
				labelKey: "info.maxForever",
				value: formatBahtMonthly(s.maxForeverMonthly * 12),
				descKey: "info.maxForever.desc",
				descVars: { amount: formatBaht(s.maxForeverMonthly) },
				Icon: ChartIcon,
			},
			{
				labelKey: "info.optimizer",
				value: formatBaht(s.optimizer.recommended),
				descKey: "info.optimizer.desc",
				descVars: {
					amount: formatBaht(s.optimizer.recommended),
					tax: formatBaht(s.optimizer.taxSaved),
				},
				Icon: PresentationIcon,
			},
			{
				labelKey: "info.paths",
				value: formatBaht(s.pathCompare.fundValue),
				descKey:
					s.pathCompare.gap >= 0 ? "info.paths.desc.fund" : "info.paths.desc.taxable",
				descVars: {
					fund: formatBaht(s.pathCompare.fundValue),
					gap: formatBaht(Math.abs(s.pathCompare.gap)),
				},
				Icon: LinkIcon,
			},
			{
				labelKey: "info.runsOut",
				value:
					s.runsOutYear === null
						? t("info.runsOut.never")
						: String(s.runsOutYear),
				descKey: s.runsOutYear === null ? "info.runsOut.desc.never" : "info.runsOut.desc.year",
				descVars: { year: String(s.runsOutYear ?? "") },
				Icon: CalendarIcon,
			},
			{
				labelKey: "info.goals",
				value:
					s.goals.length === 0
						? "—"
						: `${goalsOk}/${String(s.goals.length)}`,
				descKey: s.goals.length === 0 ? "info.goals.desc.none" : "info.goals.sub",
				descVars: { ok: String(goalsOk), short: String(goalsShort) },
				Icon: BookmarkIcon,
			},
		]
	}, [summary, t])

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

								<Stack direction="horizontal" vAlign="center" role="group" aria-label={t("a11y.leftTabs")} className="left-tab-switch">
									<PlainButton
										className={`left-tab-switch__item ${leftTab === "financials" ? "is-active" : ""}`}
										aria-pressed={leftTab === "financials"}
										onClick={() => setLeftTab("financials")}
									>
										{t("tab.financials")}
									</PlainButton>
									<PlainButton
										className={`left-tab-switch__item ${leftTab === "answers" ? "is-active" : ""}`}
										aria-pressed={leftTab === "answers"}
										onClick={() => setLeftTab("answers")}
									>
										{t("tab.answers")}
								</PlainButton>
								</Stack>

								{leftTab === "financials" ? (
									<Stack className="financial-list" aria-label={t("a11y.financialSnapshot")}>
										{financialMetrics.map((item) => (
											<FinancialMetricRow
												key={item.key}
												metric={item}
												isSelected={selectedMetricKey === item.key}
												onSelect={() => setSelectedMetricKey(item.key)}
											/>
										))}
									</Stack>
								) : (
									<Stack className="plan-actions-list" aria-label={t("a11y.planActions")}>
										{planInfos.map((info) => (
											<PlanInfoRow key={info.labelKey} info={info} />
										))}
										<Text size="sm" color="secondary" className="assumptions-note">{t("info.export.desc")}</Text>
									</Stack>
								)}
								</Stack>
								</Card>

								<Stack as="section" aria-label={t("a11y.planInputs")} className="plan-column" ref={inputsRef}>
									<PlanInputs
										plan={plan}
										setPlan={setPlan}
										patchRow={patchRow}
										addRow={addRow}
										removeRow={removeRow}
										patchWallet={patchWallet}
										t={t}
									/>
									{summary.ok ? (
										<ChatPanel summary={summary.data} t={t} />
									) : null}
									<PlanDock
										onAddIncome={() => addRow("incomes")}
										onAddExpense={() => addRow("expenses")}
										onEditPlan={() => {
											inputsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
										}}
										t={t}
									/>
								</Stack>
							</Grid>
						</Stack>
					</Stack>
				</Theme>
			)
}

									function FinancialMetricRow({
	metric,
	isSelected,
	onSelect,
}: {
	metric: FinancialMetric
	isSelected: boolean
	onSelect: () => void
}) {
	const { t } = useLocale()

	return (
		<PlainButton
			className={`financial-row ${isSelected ? "is-selected" : ""}`}
			aria-pressed={isSelected}
			onClick={onSelect}
		>
			<Text weight="semibold" className="financial-row__label">{t(metric.key)}</Text>
			<Text hasTabularNumbers className="financial-row__value">{metric.value}</Text>
		</PlainButton>
	)
}

function PlanInfoRow({ info }: { info: PlanInfo }) {
	const { t } = useLocale()

	return (
		<Stack
			direction="horizontal"
			align="center"
			justify="between"
			gap={2}
			className="financial-row financial-row--static"
		>
			<Text weight="semibold" className="financial-row__label">{t(info.labelKey)}</Text>
			<Text hasTabularNumbers className="financial-row__value">{info.value}</Text>
		</Stack>
	)
}

/** Right-column action inputs: every section inline and always visible. */
function PlanInputs({
	plan,
	setPlan,
	patchRow,
	addRow,
	removeRow,
	patchWallet,
	t,
}: {
	plan: PlanInput
	setPlan: (updater: (current: PlanInput) => PlanInput) => void
	patchRow: (kind: "incomes" | "expenses", id: string, patch: Partial<PeriodRow>) => void
	addRow: (kind: "incomes" | "expenses") => void
	removeRow: (kind: "incomes" | "expenses", id: string) => void
	patchWallet: (field: "savingsSplit" | "walletRates" | "startingWallets", id: WalletId, value: number) => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	return (
		<Stack gap={3} className="plan-inputs">
			<Card padding={3} className="input-section">
				<Stack gap={2}>
					<Heading level={3}>{t("section.inputs")}</Heading>
					{/* Responsive: 4-up on wide desktops, 2-up on phones (min-width floor
					    keeps 1fr tracks from being forced wider by input min-content). */}
					<Grid columns={{ minWidth: 140, max: 4 }} gap={2}>
						<NumberInput
							label={t("input.startYear")}
							value={plan.startYear}
							onChange={(value) => setPlan((c) => ({ ...c, startYear: Math.round(value) }))}
							isIntegerOnly
							min={2000}
							max={2100}
						/>
						<NumberInput
							label={t("input.birthYear")}
							value={plan.birthYear}
							onChange={(value) => setPlan((c) => ({ ...c, birthYear: Math.round(value) }))}
							isIntegerOnly
							min={1920}
							max={2015}
						/>
						<NumberInput
							label={t("input.inflation")}
							value={plan.inflation * 100}
							onChange={(value) => setPlan((c) => ({ ...c, inflation: value / 100 }))}
							min={0}
							max={20}
							step={0.5}
							units="%"
						/>
						<NumberInput
							label={t("input.efMonths")}
							value={plan.efMonths}
							onChange={(value) => setPlan((c) => ({ ...c, efMonths: value }))}
							min={0}
							max={24}
							step={1}
						/>
						<NumberInput
							label={t("input.retirementYear")}
							value={plan.retirementYear ?? null}
							onChange={(value) =>
								setPlan((c) => ({ ...c, retirementYear: value === null ? null : Math.round(value) }))
							}
							isIntegerOnly
							min={1990}
							max={2100}
						/>
						<NumberInput
							label={t("input.retirementMonthly")}
							value={plan.retirementMonthlyToday}
							onChange={(value) => setPlan((c) => ({ ...c, retirementMonthlyToday: value }))}
							min={0}
						step={1000}
						units="฿"
					/>
					<NumberInput
						label={t("input.horizon")}
						value={plan.horizonYears}
						onChange={(value) => setPlan((c) => ({ ...c, horizonYears: Math.round(value) }))}
						isIntegerOnly
						min={1}
						max={60}
					/>
				</Grid>
					</Stack>
			</Card>

			<Card padding={3} className="input-section">
				<PeriodEditor rows={plan.incomes} heading={t("incomes.heading")} onPatch={(id, patch) => patchRow("incomes", id, patch)} onAdd={() => addRow("incomes")} onRemove={(id) => removeRow("incomes", id)} t={t} />
			</Card>

			<Card padding={3} className="input-section">
				<PeriodEditor rows={plan.expenses} heading={t("expenses.heading")} showDeductible onPatch={(id, patch) => patchRow("expenses", id, patch)} onAdd={() => addRow("expenses")} onRemove={(id) => removeRow("expenses", id)} t={t} />
			</Card>

			<Card padding={3} className="input-section">
				<Stack gap={2}>
					<Heading level={3}>{t("wallets.heading")}</Heading>
					{/* Responsive: 3-up on wide desktops, stacks on narrow cards —
					    wallet label is a fixed 140px span. */}
					<Grid columns={{ minWidth: 190, max: 3 }} gap={3}>
					{(
						[
							["wallets.split", "savingsSplit", "%", 0, 100, 5, true],
							["wallets.rates", "walletRates", "%", 0, 30, 0.5, true],
							["wallets.starting", "startingWallets", "฿", 0, 100_000_000, 10_000, false],
						] as const
					).map(([labelKey, field, units, min, max, step, percentMode]) => (
						<Stack key={field} gap={1}>
							<Text color="secondary">{t(labelKey)}</Text>
							{WALLETS.map((id) => (
								<Stack key={id} direction="horizontal" align="center" gap={1.5}>
									<Text size="sm" xstyle={{ width: 140 } as never}>{t(`wallet.${id}`)}</Text>
									<NumberInput
										label={t(`wallet.${id}`)}
										isLabelHidden
										value={
											percentMode
												? Math.round(plan[field][id] * 100 * 100) / 100
												: plan[field][id]
										}
										onChange={(value) => patchWallet(field, id, percentMode ? value / 100 : value)}
										min={min}
										max={max}
										step={step}
										units={units}
									/>
								</Stack>
								))}
							</Stack>
								))}
							</Grid>
							</Stack>
							</Card>
							</Stack>
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

/** Editable period-row editor (income or expenses) — row list. */
function PeriodEditor({
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
	return (
		<Stack gap={2}>
			<Stack direction="horizontal" justify="between" align="center">
				<Heading level={3}>{heading}</Heading>
				<Button variant="secondary" size="sm" label={t("row.add")} onClick={onAdd} />
			</Stack>
			{rows.map((row) => (
				<Card key={row.id} padding={2} variant="muted">
						{/* Responsive: 5/6-up on wide desktops, wraps to fewer columns on
						    narrow cards so month+year pickers never overflow (min-content
						    of a picker row is ~200px). */}
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
							onChange={(year, month) =>
								onPatch(row.id, { endYear: year, endMonth: month })
							}
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
				</Card>
			))}
		</Stack>
	)
}

/* ── Bottom dock ──────────────────────────────────────────────────────────
 * Quick actions pinned to the screen edge so they are always reachable:
 * mobile → fixed to the bottom of the viewport; desktop → bottom of the
 * right (inputs) column, which is the scrollable side. The chat panel is
 * always visible above it.
 * ────────────────────────────────────────────────────────────────────── */
function PlanDock({
	onAddIncome,
	onAddExpense,
	onEditPlan,
	t,
}: {
	onAddIncome: () => void
	onAddExpense: () => void
	onEditPlan: () => void
	t: (key: string, vars?: Record<string, string>) => string
}) {
	return (
		<Stack as="nav" direction="horizontal" className="dock" aria-label={t("a11y.dock")}>
			<PlainButton className="dock__button" onClick={onAddIncome}>
				<Text weight="semibold" className="dock__label">{t("dock.addIncome")}</Text>
			</PlainButton>
			<PlainButton className="dock__button" onClick={onAddExpense}>
				<Text weight="semibold" className="dock__label">{t("dock.addExpense")}</Text>
			</PlainButton>
			<PlainButton className="dock__button dock__button--edit" onClick={onEditPlan}>
				<Text weight="semibold" className="dock__label">{t("dock.scrollToInputs")}</Text>
			</PlainButton>
		</Stack>
	)
}

/* ── Floating chat panel (mock) ───────────────────────────────────────────
 * Pairs with the dock: anchored above the dock on mobile, inside the right
 * column on desktop. Replies are canned summaries computed from the plan —
 * the real assistant swaps in behind the same props later.
 * ────────────────────────────────────────────────────────────────────── */
interface ChatMessage {
	id: number
	role: "user" | "assistant"
	text: string
}

function ChatPanel({
	summary,
	t,
}: {
	summary: PlanSummary
	t: (key: string, vars?: Record<string, string>) => string
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [draft, setDraft] = useState("")
	const nextId = useRef(1)

	const send = () => {
		const text = draft.trim()
		if (!text) return
		const userMsg: ChatMessage = { id: nextId.current++, role: "user", text }
		const reply: ChatMessage = { id: nextId.current++, role: "assistant", text: mockReply(text, summary, t) }
		setMessages((current) => [...current, userMsg, reply])
		setDraft("")
	}

	return (
		<Stack className="chat-panel" role="log" aria-live="polite">
			<Stack direction="horizontal" justify="between" vAlign="center" className="chat-panel__head">
				<Stack gap={0}>
					<Text weight="semibold">{t("chat.title")}</Text>
					<Text size="sm" color="secondary">{t("chat.subtitle")}</Text>
				</Stack>
			</Stack>
			<Stack gap={2} className="chat-panel__log">
				{messages.length === 0 ? (
					<Text size="sm" color="secondary">{t("chat.empty")}</Text>
				) : (
					messages.map((message) => (
						<Text
							key={message.id}
							size="sm"
							className={`chat-bubble chat-bubble--${message.role}`}
						>
							{message.text}
						</Text>
					))
				)}
			</Stack>
			<Stack direction="horizontal" gap={2} vAlign="center" className="chat-panel__composer">
				<TextInput
					label={t("chat.placeholder")}
					isLabelHidden
					placeholder={t("chat.placeholder")}
					value={draft}
					onChange={setDraft}
					onEnter={send}
					className="chat-panel__input"
				/>
				<Button size="md" label={t("chat.send")} onClick={send}>{t("chat.send")}</Button>
			</Stack>
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
