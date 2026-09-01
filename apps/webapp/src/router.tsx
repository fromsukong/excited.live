import { createRouter } from "@tanstack/react-router"
import { DEFAULT_LOCALE } from "@excited-live/i18n"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		context: () => ({ locale: DEFAULT_LOCALE }),
	})

	return router
}
