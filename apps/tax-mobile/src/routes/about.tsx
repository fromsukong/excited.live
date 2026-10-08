import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
	component: AboutComponent,
})

function AboutComponent() {
	return (
		<div className="setup-card">
			<h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>About Tax Mobile</h2>
			<p style={{ margin: '0 0 16px 0', color: 'var(--color-text-secondary, #666)', fontSize: '14px', lineHeight: '1.5' }}>
				This mobile client is configured with:
			</p>
			<ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
				<li><strong>Tauri v2</strong> — Native Android host</li>
				<li><strong>TanStack Router</strong> — Type-safe client-side routing</li>
				<li><strong>TanStack Query</strong> — Asynchronous state caching</li>
				<li><strong>@excited-live/tax</strong> — Pure monorepo tax calculation engine</li>
				<li><strong>pnpm catalog</strong> — Synchronized monorepo dependencies</li>
			</ul>
		</div>
	)
}
