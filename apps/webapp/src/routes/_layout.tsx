import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Suspense } from "react"
import {
	Card,
	Grid,
	Stack,
	Text,
	Theme,
	mastercardTheme,
} from "@excited-live/design-system"
import { AssistantRail } from "../components/AssistantRail"
import { Topbar } from "../components/Topbar"
import {
	PlanDashboardProvider,
	usePlanDashboardContext,
} from "../hooks/usePlanDashboard"

export const Route = createFileRoute("/_layout")({
	component: DashboardLayoutWrapper,
})

function DashboardLayoutWrapper() {
	return (
		<PlanDashboardProvider>
			<DashboardLayout />
		</PlanDashboardProvider>
	)
}

function DashboardLayout() {
	const { t, summary } = usePlanDashboardContext()

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="dashboard-shell">
				<Topbar />

				<Stack as="main" className="dashboard-main">
					<Grid className="dashboard-grid">
						<Card className="chart-panel" variant="transparent" padding={0}>
							<Suspense fallback={<Stack className="chart-panel__inner" />}>
								<Outlet />
							</Suspense>
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
			</Stack>
		</Theme>
	)
}
