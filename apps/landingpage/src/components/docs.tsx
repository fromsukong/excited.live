import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsPage, type DocsPageProps } from 'fumadocs-ui/layouts/docs/page';
import type { Root } from 'fumadocs-core/page-tree';
import type { ReactNode } from 'react';
import { navigate } from 'astro:transitions/client';
import { RootProvider } from 'fumadocs-ui/provider/astro';
import type { AstroProviderProps } from 'fumadocs-core/framework/astro';
import SearchDialog from './search';

export function Docs({
	tree,
	children,
	pathname,
	params,
	page,
}: {
	tree: Root;
	children: ReactNode;
	pathname: string;
	params: AstroProviderProps['params'];
	page?: DocsPageProps;
}) {
	return (
		<RootProvider
			pathname={pathname}
			params={params}
			navigate={navigate}
			theme={{ enabled: false }}
			search={{ SearchDialog }}
		>
			<DocsLayout
				tree={tree}
				themeSwitch={{ enabled: false }}
				nav={{
					title: (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<img
								src="/logo-mark.png"
								alt="excited.live"
								width={26}
								height={26}
								style={{ borderRadius: 999, display: 'block' }}
							/>
							<span
								style={{
									fontWeight: 600,
									fontSize: 17,
									letterSpacing: '-0.02em',
									color: '#141413',
								}}
							>
								excited<span style={{ color: '#CF4500' }}>.live</span>
							</span>
						</span>
					),
				}}
			>
				<DocsPage {...page}>{children}</DocsPage>
			</DocsLayout>
		</RootProvider>
	);
}
