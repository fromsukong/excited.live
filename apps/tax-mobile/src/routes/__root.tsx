import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
})

function RootComponent() {
	return (
		<div className="mobile-shell">
			<header className="mobile-header">
				<div className="mobile-title">excited.live Tax Mobile</div>
				<nav className="mobile-nav">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: 'nav-link active' }}
					>
						Calculator
					</Link>
					<Link
						to="/about"
						className="nav-link"
						activeProps={{ className: 'nav-link active' }}
					>
						About
					</Link>
				</nav>
			</header>

			<main className="mobile-main">
				<Outlet />
			</main>
		</div>
	)
}
