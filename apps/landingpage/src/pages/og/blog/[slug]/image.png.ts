import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createElement } from 'react';
import { ImageResponse } from 'takumi-js/response';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';
import { clampText, OG_COLORS } from '@/lib/og';

/** Per-post social preview cards — /og/blog/[slug]/image.png */
export async function getStaticPaths() {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts.map((post) => ({ params: { slug: post.id } }));
}

export const GET: APIRoute = async ({ params }) => {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	const post = posts.find((p) => p.id === params.slug);

	if (!post) return new Response(undefined, { status: 404 });

	return new ImageResponse(
		createElement(DefaultImage, {
			// Clamped: the fumadocs template has no line limits, so long copy
			// would overflow the 630px canvas and clip mid-glyph.
			title: clampText(post.data.title, 75),
			description: post.data.description ? clampText(post.data.description, 110) : undefined,
			site: 'excited.live',
			...OG_COLORS,
		}),
		{
			width: 1200,
			height: 630,
			format: 'png',
		},
	);
};
