import { createFileRoute } from "@tanstack/react-router"
import { signOut } from "@workos/authkit-tanstack-react-start"

/**
 * End the session: clears the app cookie and redirects through WorkOS logout,
 * which sends the user to the configured Sign-out redirect (falls back to the
 * App homepage URL in the WorkOS dashboard).
 */
export const Route = createFileRoute("/api/auth/sign-out")({
	loader: async () => {
		await signOut()
	},
})
