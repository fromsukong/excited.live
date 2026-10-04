import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/settings")({
	component: lazyRouteComponent(
		() => import("../../pages/settings/settings"),
		"Settings",
	),
})
