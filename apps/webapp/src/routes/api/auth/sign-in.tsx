import { createFileRoute } from "@tanstack/react-router"
import { getSignInUrl } from "@workos/authkit-tanstack-react-start"

/**
 * Initiate the AuthKit sign-in flow.
 * This URL is also configured as the "Sign-in URL" in the WorkOS dashboard
 * (required for WorkOS-initiated flows such as dashboard impersonation).
 * Supports `?returnPathname=/foo` to land the user back where they started.
 */
export const Route = createFileRoute("/api/auth/sign-in")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const returnPathname = new URL(request.url).searchParams.get("returnPathname")
				const url = await getSignInUrl(returnPathname ? { data: { returnPathname } } : undefined)
				return new Response(null, {
					status: 307,
					headers: { Location: url },
				})
			},
		},
	},
})
