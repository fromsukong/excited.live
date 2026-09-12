import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderBlogMarkdown } from '@/lib/blog-pipeline';
import { splitSlides } from '@/lib/slides';
import { source } from '@/lib/source';

const SITE = 'https://excited.live';

/**
 * Static sitemap: home, blog (posts + decks with slides), and all docs pages.
 * Served as /sitemap.xml; referenced from robots.txt.
 */
export const GET: APIRoute = async () => {
	const urls: Array<{ loc: string; lastmod?: string }> = [{ loc: '/' }, { loc: '/blog/' }];

	const posts = await getCollection('blog', ({ data }) => !data.draft);
	for (const post of posts) {
		// Same render as the pages: a deck only exists for posts with `:::slide` blocks.
		const { slideCount } = splitSlides(await renderBlogMarkdown(post.body ?? ''));
		const lastmod = post.data.date.toISOString().slice(0, 10);
		urls.push({ loc: `/blog/${post.id}/`, lastmod });
		if (slideCount > 0) urls.push({ loc: `/blog/${post.id}/slides/`, lastmod });
	}

	for (const page of source.getPages()) {
		const path = ['/docs', ...page.slugs].join('/');
		urls.push({ loc: `${path}/`.replace(/\/+$/, '/') });
	}

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls.map(({ loc, lastmod }) =>
			[
				'\t<url>',
				`\t\t<loc>${SITE}${loc}</loc>`,
				...(lastmod ? [`\t\t<lastmod>${lastmod}</lastmod>`] : []),
				'\t</url>',
			].join('\n'),
		),
		'</urlset>',
		'',
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
