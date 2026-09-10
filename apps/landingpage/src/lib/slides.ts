/**
 * Slide extraction + blog stripping (deck-only content model).
 *
 * Contract: slide-worthy beats are marked in the source markdown with a
 * `:::slide … :::` container directive, which `remarkSlideFences` (wired in
 * src/lib/blog-pipeline.ts) turns into `<div class="slide-block" data-slide="">`.
 *
 * CONTENT MODEL (decided with Prame, Sep 2026): the two outputs are optimized
 * for their own medium, never duplicates.
 *   - Blog   = the full article in prose. :::slide blocks are STRIPPED from the
 *     blog HTML (replaced with nothing) — the blog never repeats slide copy.
 *   - Deck   = only the :::slide blocks, one per slide, written to stand alone
 *     (large text / big visual) because it is what gets screen-recorded.
 * Images and formulas MAY appear in both: reusing an asset is medium
 * adaptation, not content duplication. Repeating prose/claims is duplication.
 *
 * The extraction is depth-aware: slide blocks may contain nested divs (e.g.
 * `:::tip` inside `:::slide`), so we cannot simply match up to the first
 * `</div>`.
 */

const OPEN = '<div class="slide-block" data-slide="">';
const CLOSE = '</div>';

export function splitSlides(renderedHtml: string): {
	blogHtml: string;
	slidesHtml: string;
	slideCount: number;
} {
	const blocks: string[] = [];
	const stripped: string[] = [];
	let from = renderedHtml.indexOf(OPEN);
	let lastEnd = 0;

	while (from !== -1) {
		// Walk forward counting div depth until the opening div is closed.
		let depth = 1;
		let cursor = from + OPEN.length;
		let end = -1;
		while (cursor < renderedHtml.length) {
			const nextOpen = renderedHtml.indexOf('<div', cursor);
			const nextClose = renderedHtml.indexOf(CLOSE, cursor);
			if (nextClose === -1) break; // unbalanced markup: stop scanning
			if (nextOpen !== -1 && nextOpen < nextClose) {
				depth += 1;
				cursor = nextOpen + 4;
			} else {
				depth -= 1;
				cursor = nextClose + CLOSE.length;
				if (depth === 0) {
					end = nextClose;
					break;
				}
			}
		}
		if (end === -1) break; // unterminated block: stop extracting

		blocks.push(renderedHtml.slice(from + OPEN.length, end));
		// Everything before this block stays in the blog; the block itself is
		// deck-only and removed from the blog HTML.
		stripped.push(renderedHtml.slice(lastEnd, from));
		lastEnd = end + CLOSE.length;
		from = renderedHtml.indexOf(OPEN, lastEnd);
	}
	stripped.push(renderedHtml.slice(lastEnd));

	const slidesHtml = blocks
		.map((inner) => `<section class="slide"><div class="slide-inner">${inner}</div></section>`)
		.join('\n');

	return {
		blogHtml: stripped.join(''),
		slidesHtml,
		slideCount: blocks.length,
	};
}
