import { usePlanDashboardContext } from "../../hooks/usePlanDashboard"

/**
 * Root hook for the Home page.
 * Provides the loaded plan, simulation summaries, page status (loading | success | error),
 * and reload action.
 *
 * If `status === "error"`, Home renders an empty state with a reload button and
 * guarantees NO child endpoints are called.
 */
export function useHome() {
	return usePlanDashboardContext()
}

export { HORIZONS } from "../../hooks/usePlanDashboard"
export type {
	HorizonKey,
	MetricKey,
	LeftTab,
	FinancialMetric,
	PageLoadStatus,
	ComponentLoadStatus,
} from "../../hooks/usePlanDashboard"
