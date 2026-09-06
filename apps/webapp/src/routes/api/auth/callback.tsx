import { createFileRoute } from "@tanstack/react-router"
import { handleCallbackRoute } from "@workos/authkit-tanstack-react-start"

/**
 * OAuth callback — AuthKit redirects here after the hosted sign-in flow.
 * The URL must exactly match WORKOS_REDIRECT_URI and a Redirect URI
 * configured in the WorkOS dashboard for the active environment.
 */
export const Route = createFileRoute("/api/auth/callback")({
	server: {
		handlers: {
			GET: handleCallbackRoute(),
		},
	},
})
