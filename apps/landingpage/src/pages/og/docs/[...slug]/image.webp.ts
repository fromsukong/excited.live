import type { APIRoute } from 'astro';
import { createElement } from 'react';
import { ImageResponse } from 'takumi-js/response';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';
import { clampText, OG_COLORS } from '@/lib/og';
import { source } from '@/lib/source';

export function getStaticPaths() {
	return source.getPages().map((page) => ({
		params: {
			slug: page.slugs.length > 0 ? page.slugs.join('/') : undefined,
		},
	}));
}

export const GET: APIRoute = ({ params }) => {
	const slugs = params.slug?.split('/').filter((item) => item.length > 0) ?? [];
	const page = source.getPage(slugs);

	if (!page) return new Response(undefined, { status: 404 });

	return new ImageResponse(
		createElement(DefaultImage, {
			title: clampText(page.data.title, 75),
			description: page.data.description ? clampText(page.data.description, 110) : undefined,
			site: 'excited.live',
			...OG_COLORS,
		}),
		{
			width: 1200,
			height: 630,
			format: 'webp',
		},
	);
};
