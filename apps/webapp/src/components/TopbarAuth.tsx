import { Link, Text } from "@excited-live/design-system"
import { useLocale } from "../lib/locale-context"

export interface TopbarAuthProps {
	auth: { configured: boolean; user: { firstName: string | null; email: string } | null }
	returnPathname: string
}

/**
 * Topbar sign-in / sign-out (#47). Renders nothing when AuthKit is not
 * configured (PR previews, local mock) — same env gate as start.ts.
 */
export function TopbarAuth({ auth, returnPathname }: TopbarAuthProps) {
	const { t } = useLocale()
	if (!auth.configured) return null
	if (!auth.user) {
		return (
			<Link className="auth-link" href={`/api/auth/sign-in?returnPathname=${encodeURIComponent(returnPathname)}`}>
				{t("auth.signIn")}
			</Link>
		)
	}
	return (
		<>
			<Text size="sm" color="secondary" className="auth-user">
				{auth.user.firstName || auth.user.email}
			</Text>
			<Link className="auth-link" href="/api/auth/sign-out">
				{t("auth.signOut")}
			</Link>
		</>
	)
}
