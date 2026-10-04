import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Suspense } from "react"
import { createServerFn } from "@tanstack/react-start"
import { getAuth } from "@workos/authkit-tanstack-react-start"
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
import { authkitConfigured } from "../lib/auth-config"
import {
	PlanDashboardProvider,
	usePlanDashboardContext,
} from "../hooks/usePlanDashboard"

/** Auth state for the topbar — resolves server-side; reports configured:false without WORKOS_* env. */
const getAuthState = createServerFn({ method: "GET" }).handler(async () => {
	if (!authkitConfigured()) return { configured: false as const, user: null }
	const { user } = await getAuth()
	return {
		configured: true as const,
		user: user ? { firstName: user.firstName ?? null, email: user.email } : null,
	}
})

export const Route = createFileRoute("/_layout")({
	loader: async ({ location }) => ({
		auth: await getAuthState(),
		returnPathname: location.pathname + location.searchStr,
	}),
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
	const { auth, returnPathname } = Route.useLoaderData()

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="dashboard-shell">
				<Topbar auth={auth} returnPathname={returnPathname} />

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
