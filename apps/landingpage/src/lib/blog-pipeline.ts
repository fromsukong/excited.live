import {
	createMarkdownProcessor,
	type MarkdownRenderer,
	type RemarkPlugins,
	type RehypePlugins,
} from '@astrojs/markdown-remark';
import {
	rehypeCode,
	remarkCodeTab,
	remarkHeading,
	remarkNpm,
	remarkStructure,
} from 'fumadocs-core/mdx-plugins';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkSlideFences } from '@/lib/remark-slide-fences';

/**
 * Single source of truth for the markdown pipeline used by BOTH the Astro
 * config (all .md/.mdx rendering) and `renderBlogMarkdown` (slides-page
 * string rendering). Keeping the lists here guarantees the HTML the slides
 * page extracts from is byte-identical in shape to what the blog page shows.
 */
export const BLOG_REMARK_PLUGINS: RemarkPlugins = [
	remarkHeading,
	remarkCodeTab,
	remarkNpm,
	[remarkStructure, { exportAs: 'structuredData' }],
	// --- blog slide fences + math (harmless for docs rendering) ---
	remarkDirective,
	remarkSlideFences,
	// Single-dollar OFF: a finance blog writes "$500 … $600" in prose; only
	// $$…$$ blocks are math.
	[remarkMath, { singleDollarTextMath: false }],
];

export const BLOG_REHYPE_PLUGINS: RehypePlugins = [
	// KaTeX MUST run before rehypeCode: remark-rehype maps display math to
	// <pre><code>, and the shiki highlighter would otherwise style it as code.
	rehypeKatex,
	// `plain` fallback keeps unknown/undetected languages from crashing the build
	[rehypeCode, { fallbackLanguage: 'plain' }],
];

let processorPromise: Promise<MarkdownRenderer> | undefined;

async function getProcessor(): Promise<MarkdownRenderer> {
	processorPromise ??= createMarkdownProcessor({
		syntaxHighlight: false,
		remarkPlugins: [...BLOG_REMARK_PLUGINS],
		rehypePlugins: [...BLOG_REHYPE_PLUGINS],
	});
	return processorPromise;
}

/**
 * Render raw markdown (a blog post `body`) to HTML using the same pipeline
 * as Astro itself. Used by /blog/[slug]/slides to extract `.slide-block`
 * elements at build time.
 */
export async function renderBlogMarkdown(markdown: string): Promise<string> {
	const processor = await getProcessor();
	const result = await processor.render(markdown);
	return result.code;
}

/** Count `:::slide` fences in raw markdown (for the "open as presentation" CTA). */
export function countSlideFences(markdown: string | undefined): number {
	if (!markdown) return 0;
	const matches = markdown.match(/^:::slide\s*$/gm);
	return matches ? matches.length : 0;
}
