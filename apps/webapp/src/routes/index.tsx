import { useState, type ComponentType, type SVGProps } from "react"
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
	IconButton,
	LinkIcon,
	MoonIcon,
	PlainButton,
	PresentationIcon,
	SettingsIcon,
	Stack,
	SunIcon,
	Svg,
	SvgLine,
	SvgPath,
	Text,
	Theme,
	mastercardTheme,
} from "@excited-live/design-system"
import { createFileRoute } from "@tanstack/react-router"
import { useLocale } from "../lib/locale-context"
import type { Dictionary } from "@excited-live/i18n"

export const Route = createFileRoute("/")({
	component: Home,
})

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
type Period = "1M" | "3M" | "YTD" | "1Y" | "2Y"
type MetricKey = "metric.netWorth" | "metric.cashFlow"

interface FinancialMetric {
	key: keyof Dictionary
	value: string
}

interface PlanAction {
	labelKey: keyof Dictionary
	descKey: keyof Dictionary
	Icon: IconComponent
}

const periods: Period[] = ["1M", "3M", "YTD", "1Y", "2Y"]

const financialMetrics: FinancialMetric[] = [
	{ key: "metric.netWorthValue", value: "THB 178,619,297" },
	{ key: "metric.changeInNetWorth", value: "THB 10,251,288" },
	{ key: "metric.liquidNetWorth", value: "THB 171,565,977" },
	{ key: "metric.withdrawals", value: "THB 755,985" },
	{ key: "metric.withdrawalRate", value: "0.47%" },
	{ key: "metric.income", value: "THB 737,645" },
	{ key: "metric.taxableIncome", value: "THB 737,645" },
	{ key: "metric.taxes", value: "THB 198,049" },
	{ key: "metric.effectiveTaxRate", value: "15.00%" },
	{ key: "metric.spending", value: "THB 646,632" },
	{ key: "metric.expenses", value: "THB 682,225" },
	{ key: "metric.savingsRate", value: "0.00%" },
	{ key: "metric.taxBalance", value: "THB 36,893" },
]

const planActions: PlanAction[] = [
	{ labelKey: "action.updatePlan", descKey: "action.updatePlan.desc", Icon: SettingsIcon },
	{ labelKey: "action.addIncome", descKey: "action.addIncome.desc", Icon: ChartIcon },
	{ labelKey: "action.reviewSpending", descKey: "action.reviewSpending.desc", Icon: CalendarIcon },
	{ labelKey: "action.updateTaxDetails", descKey: "action.updateTaxDetails.desc", Icon: PresentationIcon },
	{ labelKey: "action.adjustSavingsGoal", descKey: "action.adjustSavingsGoal.desc", Icon: CompassIcon },
	{ labelKey: "action.manageAccounts", descKey: "action.manageAccounts.desc", Icon: LinkIcon },
]

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

function PlanActionRow({
	action,
	isSelected,
	onSelect,
}: {
	action: PlanAction
	isSelected: boolean
	onSelect: () => void
}) {
	const { t } = useLocale()
	const ActionIcon = action.Icon

	return (
		<PlainButton
			className={`plan-action ${isSelected ? "is-selected" : ""}`}
			aria-pressed={isSelected}
			onClick={onSelect}
		>
			<Text className="plan-action__icon"><ActionIcon aria-hidden="true" width={18} height={18} /></Text>
			<Stack className="plan-action__copy">
				<Text weight="bold" className="plan-action__label">{t(action.labelKey)}</Text>
				<Text color="secondary" className="plan-action__description">{t(action.descKey)}</Text>
			</Stack>
			<Text className="plan-action__arrow" aria-hidden="true"><ArrowRightIcon width={17} height={17} /></Text>
		</PlainButton>
	)
}

function MarketChart({ metric, ariaLabel }: { metric: MetricKey; ariaLabel: string }) {
	return (
		<Stack className="chart-canvas">
			<Svg className="market-chart" viewBox="0 0 720 340" preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
				<SvgLine className="chart-guide chart-guide--top" x1="0" y1="70" x2="720" y2="70" />
				<SvgLine className="chart-guide chart-guide--middle" x1="0" y1="250" x2="720" y2="250" />
				<SvgLine className="chart-guide chart-guide--bottom" x1="0" y1="294" x2="720" y2="294" />
				<SvgPath
					className="chart-line chart-line--main"
					d="M0 212 L8 208 L13 214 L19 202 L25 207 L31 198 L38 205 L44 190 L50 183 L56 193 L62 185 L68 188 L75 185 L82 197 L88 204 L95 235 L101 246 L108 233 L114 239 L121 218 L128 207 L134 210 L141 194 L148 202 L155 181 L161 174 L168 180 L175 164 L182 168 L189 155 L196 162 L203 149 L210 142 L217 130 L224 132 L231 118 L238 125 L245 111 L252 116 L259 109 L266 133 L273 146 L280 195 L287 184 L294 131 L301 124 L308 130 L315 111 L322 118 L329 108 L336 125 L343 104 L350 97 L357 109 L364 102 L371 91 L378 95 L385 84 L392 89 L399 74 L406 79 L413 68 L420 78 L427 64 L434 54 L441 60 L448 48 L455 54 L462 45 L469 48 L476 43 L483 49 L490 46 L497 31 L504 40 L511 60 L518 65 L525 50 L532 74 L539 67 L546 94 L553 82 L560 69 L567 86 L574 97 L581 91 L588 102 L595 86 L602 79 L609 62 L616 58 L623 40 L630 42 L637 28 L644 44 L651 31 L658 35 L665 45 L672 41 L679 34 L686 42 L693 20 L700 46 L707 34 L714 39 L720 30"
				/>
				<SvgPath
					className="chart-line chart-line--secondary"
					d="M0 289 L12 286 L24 290 L36 286 L48 288 L60 285 L72 287 L84 284 L96 287 L108 278 L120 283 L132 280 L144 285 L156 285 L168 284 L180 285 L192 281 L204 285 L216 284 L228 285 L240 285 L252 283 L264 284 L276 280 L288 282 L300 281 L312 279 L324 283 L336 280 L348 281 L360 279 L372 277 L384 279 L396 275 L408 280 L420 276 L432 275 L444 281 L456 273 L468 277 L480 271 L492 276 L504 272 L516 279 L528 275 L540 278 L552 269 L564 279 L576 277 L588 274 L600 276 L612 273 L624 277 L636 272 L648 275 L660 274 L672 267 L684 277 L696 273 L708 276 L720 274"
				/>
			</Svg>
			<Text color="secondary" weight="bold" className="chart-value chart-value--top">{metric === "metric.netWorth" ? "+6.10%" : "+3.42%"}</Text>
			<Text color="secondary" weight="bold" className="chart-value chart-value--bottom">{metric === "metric.netWorth" ? "THB 178.6M" : "THB 737.6K"}</Text>
		</Stack>
	)
}

function Home() {
	const { t, locale, setLocale } = useLocale()
	const [period, setPeriod] = useState<Period>("1Y")
	const [metric, setMetric] = useState<MetricKey>("metric.netWorth")
	const [selectedMetricKey, setSelectedMetricKey] = useState<keyof Dictionary>("metric.taxableIncome")
	const [accountsConnected, setAccountsConnected] = useState(false)
	const [selectedActionKey, setSelectedActionKey] = useState<keyof Dictionary>("action.updatePlan")
	const [planUpdated, setPlanUpdated] = useState(false)
	const [isDarkMode, setIsDarkMode] = useState(true)

	const selectAction = (key: keyof Dictionary) => {
		setSelectedActionKey(key)
		setPlanUpdated(false)
	}

	return (
		<Theme theme={mastercardTheme} mode={isDarkMode ? "dark" : "light"}>
			<Stack className="dashboard-shell">
				<Stack direction="horizontal" justify="between" vAlign="center" as="header" className="topbar">
					<Stack direction="horizontal" vAlign="center" className="brand-lockup">
						<Text className="brand-lockup__mark"><FeyMark size={23} /></Text>
						<Text size="2xl" weight="bold">{t("nav.hello")}</Text>
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
						<IconButton
							label={isDarkMode ? t("theme.toLight") : t("theme.toDark")}
							icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
							variant="ghost"
							size="sm"
							className="theme-button"
							onClick={() => setIsDarkMode((current) => !current)}
						/>
					</Stack>
				</Stack>

				<Stack as="main" className="dashboard-main">
					<Grid className="dashboard-grid">
						<Card className="chart-panel" variant="transparent" padding={0}>
							<Stack className="chart-panel__inner">
								<Stack className="panel-heading">
									<Text color="secondary" className="panel-heading__date">{t("plan.snapshotDate")}</Text>
									<Heading level={1}>{t("plan.heading.prefix")} <Text color="secondary" weight="bold">{t("plan.heading.status")}</Text></Heading>
								</Stack>

								<MarketChart
									metric={metric}
									ariaLabel={t(metric === "metric.netWorth" ? "chart.aria.netWorth" : "chart.aria.cashFlow")}
								/>

								<Stack direction="horizontal" vAlign="center" className="chart-toolbar">
									<Stack direction="horizontal" vAlign="center" role="group" aria-label={t("a11y.chartMetric")} className="metric-switch">
										<PlainButton
											className={`metric-switch__item ${metric === "metric.netWorth" ? "is-active" : ""}`}
											onClick={() => setMetric("metric.netWorth")}
										>
											<Text className="metric-indicator metric-indicator--white" aria-hidden="true">{''}</Text>
											{t("metric.netWorth")}
										</PlainButton>
										<PlainButton
											className={`metric-switch__item ${metric === "metric.cashFlow" ? "is-active" : ""}`}
											onClick={() => setMetric("metric.cashFlow")}
										>
											<Text className="metric-indicator metric-indicator--purple" aria-hidden="true">{''}</Text>
											{t("metric.cashFlow")}
										</PlainButton>
									</Stack>
									<Button
										label={accountsConnected ? t("accounts.connected") : t("accounts.connect")}
										variant="ghost"
										size="sm"
										icon={<LinkIcon />}
										className={`portfolio-button ${accountsConnected ? "is-connected" : ""}`}
										onClick={() => setAccountsConnected((current) => !current)}
									/>
									<Stack direction="horizontal" vAlign="center" role="group" aria-label={t("a11y.chartPeriod")} className="period-switch">
										{periods.map((item) => (
											<PlainButton
												className={`period-switch__item ${period === item ? "is-active" : ""}`}
												key={item}
												aria-pressed={period === item}
												onClick={() => setPeriod(item)}
											>
												{item}
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
										<Badge label={planUpdated ? t("plan.updated") : t("plan.actions")} variant="neutral" icon={<FeyMark size={14} />} className="plan-badge" />
										<Text color="secondary" className="plan-summary-card__timestamp">{planUpdated ? t("plan.savedJustNow") : t("plan.lastSyncedToday")}</Text>
									</Stack>
									<Stack className="plan-summary-card__body">
										<Heading level={2}>{t("plan.keepCurrent")}</Heading>
										<Text as="p" color="secondary">{t("plan.summaryBody")}</Text>
									</Stack>
									<Stack direction="horizontal" justify="start" vAlign="center" className="plan-summary-card__footer">
										<Button
											label={planUpdated ? t("plan.updated") : t("action.updatePlan")}
											variant="primary"
											size="md"
											icon={<SettingsIcon />}
											className="plan-primary-button"
											onClick={() => {
												setSelectedActionKey("action.updatePlan")
												setPlanUpdated(true)
											}}
										/>
										<Text color="secondary">{t("plan.selected", { action: t(selectedActionKey) })}</Text>
									</Stack>
								</Stack>
							</Card>

							<Card className="actions-card" variant="transparent" padding={0}>
								<Stack className="actions-card__inner">
									<Stack direction="horizontal" justify="between" vAlign="start" className="actions-card__heading">
										<Stack>
											<Text color="secondary" weight="bold" className="actions-card__eyebrow">{t("actions.eyebrow")}</Text>
											<Heading level={2}>{t("actions.heading")}</Heading>
										</Stack>
										<Text color="secondary" className="actions-card__count">{t("actions.count")}</Text>
									</Stack>
									<Stack className="plan-actions-list">
										{planActions.map((action) => (
											<PlanActionRow
												key={action.labelKey}
												action={action}
												isSelected={selectedActionKey === action.labelKey}
												onSelect={() => selectAction(action.labelKey)}
											/>
										))}
									</Stack>
									<PlainButton className="export-action" onClick={() => selectAction("action.exportSnapshot")}>
										<Text className="export-action__icon"><BookmarkIcon aria-hidden="true" width={17} height={17} /></Text>
										<Text className="export-action__label">{t("action.exportSnapshot")}</Text>
										<ArrowRightIcon aria-hidden="true" width={17} height={17} />
									</PlainButton>
								</Stack>
							</Card>
						</Stack>
					</Grid>
				</Stack>

			</Stack>
		</Theme>
	)
}
