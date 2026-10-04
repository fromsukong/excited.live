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
} from "@excited-live/design-system"
import { createFileRoute } from "@tanstack/react-router"
import { ProjectionChart } from "../components/ProjectionChart"
import { AssistantRail } from "../components/AssistantRail"
import { EntryDialog } from "../components/EntryDialog"
import { ValueDialog } from "../components/ValueDialog"
import { MilestoneDialog } from "../components/MilestoneDialog"
import { MilestoneTable } from "../components/MilestoneTable"
import { GroupedPeriodTable } from "../components/GroupedPeriodTable"
import { GroupedValueTable } from "../components/GroupedValueTable"
import { SettingsPanel } from "../components/SettingsPanel"
import { TypePickerDialog } from "../components/TypePickerDialog"
import {
	ADD_DIALOG_TYPE_IDS,
	HORIZONS,
	usePlanDashboard,
} from "../hooks/usePlanDashboard"

export const Route = createFileRoute("/")({
	component: Home,
})

function Home() {
	const {
		t,
		locale,
		setLocale,
		plan,
		horizon,
		setHorizon,
		metric,
		setMetric,
		leftTab,
		setLeftTab,
		page,
		setPage,
		setHoverYear,
		profileName,
		setProfileName,
		birthday,
		setBirthday,
		gender,
		setGender,
		addedTypes,
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
	} = usePlanDashboard()

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
						onSave={handleSaveEntry}
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
						onSave={handleSaveValue}
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
						onSave={handleSaveMilestone}
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
						onPick={handlePickType}
						onClose={() => setPickerKind(null)}
						t={t}
					/>
				) : null}
			</Stack>
		</Theme>
	)
}
