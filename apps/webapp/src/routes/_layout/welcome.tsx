import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/welcome")({
	component: lazyRouteComponent(
		() => import("../../pages/welcome/welcome"),
		"Welcome",
	),
})
