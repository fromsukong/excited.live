/**
 * Home route — the one-page MVP plan dashboard.
 *
 * Left: interactive projection chart (hover a year → metrics update below).
 * Right: plan sections (Income / Spending / Tax / Goal) that edit inputs;
 * every edit recomputes the projection via plan-service (mock backend for
 * now — see plan-service.ts MOCK header for the swap point).
 */
import { useEffect, useMemo, useState } from "react"
import {
	Card,
	Heading,
	PlainButton,
	Stack,
	Text,
} from "@excited-live/design-system"
import { createFileRoute } from "@tanstack/react-router"
import { useLocale } from "../lib/locale-context"
import {
	defaultPlanInputs,
	computeProjection,
	computeProjectionSync,
	type PlanInputs,
	type ProjectionResult,
} from "../lib/plan-service"
import { PlanSections } from "../components/PlanSections"
import { ProjectionChart } from "../components/ProjectionChart"
import {
	formatCurrency,
	formatCurrencyCompact,
	formatPercent,
} from "../lib/format"

const LOCALE_KEYS = ["en", "th"] as const

export const Route = createFileRoute("/")({
	component: HomePage,
	// Runs on the server for the initial request and is serialized to the
	// client, so SSR and hydration agree on the projection start year (a
	// client-side `new Date()` could disagree across timezones/year rollover).
	loader: () => ({ now: new Date().toISOString() }),
})

function HomePage() {
	const { locale, setLocale, t } = useLocale()
	// Loader-provided timestamp: same value on server and client →
	// deterministic SSR (no timezone / year-rollover hydration mismatch).
	const { now } = Route.useLoaderData() as { now: string }
	const [inputs, setInputs] = useState<PlanInputs>(() =>
		defaultPlanInputs(new Date(now)),
	)
	// Sync initial value so SSR ships real numbers; updates flow async so the
	// later backend swap touches nothing here.
	const [projection, setProjection] = useState<ProjectionResult>(() =>
		computeProjectionSync(inputs),
	)
	const [activeYear, setActiveYear] = useState<number | null>(null)

	// Async now so the real backend later changes NOTHING here:
	// computeProjection stays the single call, it just stops resolving locally.
	// AbortSignal + catch are wired now so the fetch swap is a one-file change.
	useEffect(() => {
		let cancelled = false
		const controller = new AbortController()
		void computeProjection(inputs, controller.signal)
			.then((result) => {
				if (!cancelled) setProjection(result)
			})
			.catch((error) => {
				if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
					console.error("[plan] projection failed", error)
				}
			})
		// Inputs changed → any inspected year may no longer exist; reset to
		// "no hover" so the strip falls back to the latest year instead of "—".
		setActiveYear(null)
		return () => {
			cancelled = true
			controller.abort()
		}
	}, [inputs])

	const years = projection.years
	const active =
		(activeYear == null ? years.at(-1) : years.find((y) => y.year === activeYear)) ?? null
	const goalStatus = useMemo(() => {
		if (inputs.targetNetWorth <= 0) return "noGoal" as const
		if (projection.yearGoalReached != null) return "onTrack" as const
		return "needsWork" as const
	}, [projection, inputs.targetNetWorth])

	return (
		<Stack as="main" className="dashboard-shell" gap={0}>
			<Stack as="header" direction="horizontal" align="center" justify="between" className="topbar">
				<Stack direction="horizontal" align="center" gap={2} className="brand-lockup">
					<Text className="brand-lockup__mark" aria-hidden="true">e.</Text>
					<Text className="brand-name">excited.live</Text>
				</Stack>
				<Stack direction="horizontal" align="center" gap={3}>
					<Stack direction="horizontal" align="center" gap={1} className="plan-status">
						<Text className="plan-status__dot" aria-hidden="true">●</Text>
						<Text className="plan-status__label">
							{t("plan.heading.prefix")}{" "}
							{t(
								goalStatus === "onTrack"
									? "plan.heading.status"
									: goalStatus === "needsWork"
										? "plan.heading.needsWork"
										: "plan.heading.noGoal",
							)}
						</Text>
					</Stack>
					{LOCALE_KEYS.map((key) => (
						<PlainButton
							key={key}
							className={`locale-button${locale === key ? " is-active" : ""}`}
							onClick={() => setLocale(key)}
						>
							{t(key === "en" ? "locale.en" : "locale.th")}
						</PlainButton>
					))}
				</Stack>
			</Stack>

			<Stack as="section" className="dashboard-main" gap={5}>
				<Stack direction="horizontal" gap={5} className="dashboard-grid">
					<Card className="chart-panel">
						<Stack className="chart-panel__inner" gap={3}>
							<Stack direction="horizontal" align="center" justify="between" className="panel-heading">
								<Stack direction="vertical" gap={1}>
									<Text className="panel-heading__eyebrow">{t("metric.netWorth")}</Text>
									<Heading level={1} className="panel-heading__value">
										{active ? formatCurrency(active.netWorth, locale) : "—"}
									</Heading>
								</Stack>
								<Text className="panel-heading__year">{active ? String(active.year) : ""}</Text>
							</Stack>

							<Stack className="chart-canvas">
								<ProjectionChart
									years={years.map((y) => ({ year: y.year, netWorth: y.netWorth }))}
									activeYear={activeYear}
									onActiveYearChange={setActiveYear}
									goalNetWorth={inputs.targetNetWorth > 0 ? inputs.targetNetWorth : null}
									ariaLabel={t("a11y.chartMetric")}
								/>
								<Text className="chart-value chart-value--top">
									{formatCurrencyCompact(projection?.years.at(-1)?.netWorth ?? 0, locale)}
								</Text>
							</Stack>

							<Stack direction="horizontal" gap={4} className="inspect-metrics">
								<InspectMetric label={t("chart.incomeAt")} value={active ? formatCurrencyCompact(active.grossIncome, locale) : "—"} />
								<InspectMetric label={t("chart.taxAt")} value={active ? formatCurrencyCompact(active.tax, locale) : "—"} />
								<InspectMetric label={t("chart.spendingAt")} value={active ? formatCurrencyCompact(active.spending, locale) : "—"} />
								<InspectMetric label={t("metric.effectiveTaxRate")} value={active ? formatPercent(active.effectiveTaxRate, locale) : "—"} />
							</Stack>

							<Stack className="insight-card">
								<Text className="insight-card__title">{t("insight.title")}</Text>
								<Text className="insight-card__body">{insightLine(projection, inputs, locale, t)}</Text>
							</Stack>
						</Stack>
					</Card>

					<Stack as="section" className="plan-column" gap={4} aria-label={t("a11y.planSections")}>
						<PlanSections inputs={inputs} onInputsChange={setInputs} />
					</Stack>
				</Stack>
			</Stack>
		</Stack>
	)
}

function InspectMetric({ label, value }: { label: string; value: string }) {
	return (
		<Stack className="inspect-metric" gap={1}>
			<Text className="inspect-metric__label">{label}</Text>
			<Text className="inspect-metric__value">{value}</Text>
		</Stack>
	)
}

function insightLine(
	projection: ProjectionResult,
	inputs: PlanInputs,
	locale: Parameters<typeof formatCurrency>[1],
	t: ReturnType<typeof useLocale>["t"],
): string {
	if (inputs.targetNetWorth <= 0) return t("insight.noGoal")
	const goalYear = projection.yearGoalReached
	if (goalYear == null) {
		return t("insight.goalNotReached", { amount: formatCurrency(inputs.targetNetWorth, locale) })
	}
	const yearsAway = goalYear - inputs.startYear
	return t("insight.goalReached", {
		amount: formatCurrency(inputs.targetNetWorth, locale),
		year: String(goalYear),
		years: String(yearsAway),
	})
}
