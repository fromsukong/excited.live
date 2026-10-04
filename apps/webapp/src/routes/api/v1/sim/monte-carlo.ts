import { createFileRoute } from "@tanstack/react-router"
import { forwardToBackend } from "../../../../lib/bff-proxy"

export const Route = createFileRoute("/api/v1/sim/monte-carlo")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				return forwardToBackend(request, "/api/v1/sim/monte-carlo")
			},
		},
	},
})
