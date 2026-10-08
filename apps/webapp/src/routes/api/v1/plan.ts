import { createFileRoute } from "@tanstack/react-router"
import { forwardToBackend } from "../../../lib/bff-proxy"

export const Route = createFileRoute("/api/v1/plan")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				return forwardToBackend(request, "/api/v1/plan")
			},
			PUT: async ({ request }: { request: Request }) => {
				return forwardToBackend(request, "/api/v1/plan")
			},
		},
	},
})
