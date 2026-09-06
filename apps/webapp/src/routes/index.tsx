import { useMemo, useState, type ComponentType, type SVGProps } from "react"
import {
	ArrowRightIcon,
	Badge,
	BookmarkIcon,
	Button,
	CalendarIcon,
	Card,
	ChartIcon,
	CompassIcon,
	FeyMark,
	Grid,
	Heading,
	Img,
	LinkIcon,
	NumberInput,
	PlainButton,
	PresentationIcon,
	SegmentedControl,
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
	computePlanSummary,
	defaultPlan,
	type PlanInput,
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
	const [selectedInfoKey, setSelectedInfoKey] = useState<string | null>(null)

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

	const financialMetrics = useMemo<FinancialMetric[]>(() => {
		if (!summary.ok) return []
		const s = summary.data
		const first = s.result.years[0]
		if (!first) return []
		const end = shown?.[shown.length - 1] ?? s.result.years[s.result.years.length - 1]
		const startNet = s.result.years[0]?.netWorth ?? 0
		const change = (end?.netWorth ?? 0) - startNet
		const withdrawals = s.result.years.reduce((sum, y) => sum + y.withdrawal, 0)
		const fundedYears = s.result.years.filter((y) => y.withdrawal > 0).length
		const avgWithdrawal = fundedYears > 0 ? withdrawals / fundedYears : 0
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
			{ key: "metric.income", value: formatBaht(first.income) },
			{ key: "metric.taxableIncome", value: formatBaht(first.taxResult.taxableIncome) },
			{ key: "metric.taxes", value: formatBaht(first.tax) },
			{ key: "metric.effectiveTaxRate", value: formatPercent(first.taxResult.effectiveRate) },
			{ key: "metric.spending", value: formatBaht(first.expenses) },
			{ key: "metric.expenses", value: formatBaht(first.expenses) },
			{
				key: "metric.savingsRate",
				value: formatPercent(
					first.income > 0
						? Math.max(0, (first.income - first.tax - first.expenses) / first.income)
						: 0,
				),
			},
			{ key: "metric.taxBalance", value: formatBaht(first.taxResult.balance) },
		]
	}, [summary, shown])

	const planInfos = useMemo<PlanInfo[]>(() => {
		if (!summary.ok) return []
		const s = summary.data
		const v = s.retirement
		const goalsOk = s.goals.filter((g) => g.onTrack).length
		return [
			{
				labelKey: "info.retirement",
				value: v.funded ? t("info.retirement.funded") : t("info.retirement.short"),
				descKey: "info.retirement.desc",
				descVars: {
					verdict: v.funded
						? t("info.retirement.left", {
								amount: formatBaht(v.remainingAtEnd),
								year: String(v.endYear),
							})
						: t("info.retirement.runsOut", { year: String(v.unmetYear ?? "") }),
					detail: `retire ${v.retirementYear}`,
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
				descKey: "info.paths.desc",
				descVars: {
					fund: formatBaht(s.pathCompare.fundValue),
					taxable: formatBaht(s.pathCompare.taxableValue),
				},
				Icon: LinkIcon,
			},
			{
				labelKey: "info.runsOut",
				value: s.runsOutYear === null ? t("info.runsOut.desc.never") : String(s.runsOutYear),
				descKey: s.runsOutYear === null ? "info.runsOut.desc.never" : "info.runsOut.desc.year",
				descVars: { year: String(s.runsOutYear ?? "") },
				Icon: CalendarIcon,
			},
			{
				labelKey: "info.goals",
				value:
					s.goals.length === 0
						? t("info.goals.desc.none")
						: t("info.goals.desc.ok", { count: String(goalsOk) }),
				descKey: s.goals.length === 0 ? "info.goals.desc.none" : "info.goals.desc.short",
				descVars: { ok: String(goalsOk), short: String(s.goals.length - goalsOk) },
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

	const onTrack =
		summary.ok && summary.data.retirement.funded && summary.data.runsOutYear === null

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
								<Stack className="panel-heading">
									<Text color="secondary" className="panel-heading__date">
										{t("plan.snapshotDate", { year: String(plan.startYear) })}
									</Text>
									<Heading level={1}>
										{t("plan.heading.prefix")}{" "}
										<Text color="secondary" weight="bold">
											{onTrack ? t("plan.heading.status") : t("plan.heading.needsWork")}
										</Text>
									</Heading>
								</Stack>

								<Stack className="chart-canvas">
									{summary.ok && shown ? (
										<ProjectionChart
											years={shown}
											metric={metric === "metric.netWorth" ? "netWorth" : "cashFlow"}
											ariaLabel={t(metric === "metric.netWorth" ? "chart.aria.netWorth" : "chart.aria.cashFlow")}
										/>
									) : (
										<Text color="secondary">{summary.ok ? "" : summary.error.message}</Text>
									)}
								</Stack>

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
							</Stack>
						</Card>

						<Stack as="section" aria-label={t("a11y.planActions")} className="plan-column">
							<Card className="plan-summary-card" variant="transparent" padding={0}>
								<Stack className="plan-summary-card__inner">
									<Stack direction="horizontal" justify="between" vAlign="center" className="plan-summary-card__meta">
										<Badge label={t("plan.actions")} variant="neutral" icon={<FeyMark size={14} />} className="plan-badge" />
										<Text color="secondary" className="plan-summary-card__timestamp">{t("plan.lastSyncedToday")}</Text>
									</Stack>
									<Stack className="plan-summary-card__body">
										<Heading level={2}>{t("plan.keepCurrent")}</Heading>
										<Text as="p" color="secondary">{t("plan.summaryBody")}</Text>
									</Stack>
									</Stack>
									</Card>

							<Card className="actions-card" variant="transparent" padding={0}>
								<Stack className="actions-card__inner">
									<Stack direction="horizontal" justify="between" vAlign="start" className="actions-card__heading">
										<Stack>
											<Text color="secondary" weight="bold" className="actions-card__eyebrow">{t("info.eyebrow")}</Text>
											<Heading level={2}>{t("info.heading")}</Heading>
										</Stack>
										<Text color="secondary" className="actions-card__count">{t("info.count")}</Text>
									</Stack>
									<Stack className="plan-actions-list">
										{planInfos.map((info) => (
											<PlanInfoRow
												key={info.labelKey}
												info={info}
												isSelected={selectedInfoKey === info.labelKey}
												onSelect={() => setSelectedInfoKey(info.labelKey)}
											/>
										))}
									</Stack>
									<PlainButton className="export-action" onClick={() => setSelectedInfoKey("info.export")}>
										<Text className="export-action__icon"><BookmarkIcon aria-hidden="true" width={17} height={17} /></Text>
										<Text className="export-action__label">{t("info.export")}</Text>
										<ArrowRightIcon aria-hidden="true" width={17} height={17} />
									</PlainButton>
									<Text size="sm" color="secondary" className="assumptions-note">{t("info.export.desc")}</Text>
									</Stack>
									</Card>
									</Stack>
									</Grid>

									<PlanEditor
									plan={plan}
									setPlan={setPlan}
									patchRow={patchRow}
									addRow={addRow}
									removeRow={removeRow}
									patchWallet={patchWallet}
									t={t}
									/>
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

function PlanInfoRow({
	info,
	isSelected,
	onSelect,
}: {
	info: PlanInfo
	isSelected: boolean
	onSelect: () => void
}) {
	const { t } = useLocale()
	const InfoIcon = info.Icon

	return (
		<PlainButton
			className={`plan-action ${isSelected ? "is-selected" : ""}`}
			aria-pressed={isSelected}
			onClick={onSelect}
		>
			<Text className="plan-action__icon"><InfoIcon aria-hidden="true" width={18} height={18} /></Text>
			<Stack className="plan-action__copy">
				<Text weight="bold" className="plan-action__label">{t(info.labelKey)}</Text>
				<Text color="secondary" className="plan-action__description">
					{t(info.descKey, (info.descVars ?? {}) as Record<string, string>)} · <Text weight="bold">{info.value}</Text>
				</Text>
			</Stack>
			<Text className="plan-action__arrow" aria-hidden="true"><ArrowRightIcon width={17} height={17} /></Text>
		</PlainButton>
	)
}

/** Full-width plan editor below the dashboard grid (toggle via Edit plan). */
function PlanEditor({
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
		<Card padding={3} className="plan-editor">
			<Stack gap={3}>
				<Stack gap={0.5}>
					<Heading level={2}>{t("editor.heading")}</Heading>
					<Text color="secondary">{t("editor.desc")}</Text>
				</Stack>

				<Grid columns={4} gap={2}>
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

				<PeriodEditor rows={plan.incomes} heading={t("incomes.heading")} onPatch={(id, patch) => patchRow("incomes", id, patch)} onAdd={() => addRow("incomes")} onRemove={(id) => removeRow("incomes", id)} t={t} />
				<PeriodEditor rows={plan.expenses} heading={t("expenses.heading")} showDeductible onPatch={(id, patch) => patchRow("expenses", id, patch)} onAdd={() => addRow("expenses")} onRemove={(id) => removeRow("expenses", id)} t={t} />

				<Grid columns={3} gap={3}>
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
										value={percentMode ? plan[field][id] * 100 : plan[field][id]}
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
	)
}

/** Editable period-row editor (income or expenses). */
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
					<Grid columns={showDeductible ? 6 : 5} gap={1.5}>
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
						<NumberInput
							label={t("row.startYear")}
							value={row.startYear}
							onChange={(value) => onPatch(row.id, { startYear: Math.round(value) })}
							isIntegerOnly
							min={2000}
							max={2100}
						/>
						<NumberInput
							label={t("row.endYear")}
							value={row.endYear}
							onChange={(value) =>
								onPatch(row.id, { endYear: value === null ? null : Math.round(value) })
							}
							isIntegerOnly
							min={2000}
							max={2100}
							placeholder="∞"
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
