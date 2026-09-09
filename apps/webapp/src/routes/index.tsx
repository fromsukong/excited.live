import { useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react"
import {
	BookmarkIcon,
	CalendarIcon,
	Card,
	ChartIcon,
	ChatComposer,
	ChatMessage,
	ChatMessageBubble,
	ChatMessageList,
	ChatToolCalls,
	CompassIcon,
	Grid,
	Img,
	LinkIcon,
	PlainButton,
	PresentationIcon,
	Stack,
	Text,
	Theme,
	mastercardTheme,
	type ChatToolCallItem,
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

function Home() {
	const { t, locale, setLocale } = useLocale()
	const [plan] = useState<PlanInput>(() => defaultPlan())
	const [horizon, setHorizon] = useState<HorizonKey>("30")
	const [metric, setMetric] = useState<MetricKey>("metric.netWorth")
	const [selectedMetricKey, setSelectedMetricKey] = useState<string>("metric.netWorthValue")
	const [leftTab, setLeftTab] = useState<"financials" | "answers">("financials")
	const [hoverYear, setHoverYear] = useState<number | null>(null)

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

{summary.ok ? (
									<Stack as="section" aria-label={t("rail.title")} className="plan-column">
										<AssistantRail summary={summary.data} t={t} />
									</Stack>
								) : null}
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
