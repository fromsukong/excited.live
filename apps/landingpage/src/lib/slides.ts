/**
 * Extract `.slide-block` inner HTML from a rendered markdown document.
 *
 * Contract: slide-worthy blocks are marked in the source markdown with a
 * `:::slide … :::` container directive, which `remarkSlideFences` (wired in
 * src/lib/blog-pipeline.ts) turns into `<div class="slide-block" data-slide="">`.
 *
 * The blog page renders the full HTML as-is (slide blocks styled as callout
 * cards). The slides page reuses the SAME rendered string, extracts only the
 * `.slide-block` elements, and wraps each one in `<section class="slide">` —
 * so blog and slides can never drift apart.
 *
 * The extraction is depth-aware: slide blocks may contain nested divs (e.g.
 * `:::tip` inside `:::slide`), so we cannot simply match up to the first
 * `</div>`.
 */
export function splitSlides(renderedHtml: string): {
	slidesHtml: string;
	slideCount: number;
} {
	const OPEN = '<div class="slide-block" data-slide="">';
	const blocks: string[] = [];
	let from = renderedHtml.indexOf(OPEN);

	while (from !== -1) {
		// Walk forward counting div depth until the opening div is closed.
		let depth = 1;
		let cursor = from + OPEN.length;
		let end = -1;
		while (cursor < renderedHtml.length) {
			const nextOpen = renderedHtml.indexOf('<div', cursor);
			const nextClose = renderedHtml.indexOf('</div>', cursor);
			if (nextClose === -1) break; // unbalanced markup: stop scanning
			if (nextOpen !== -1 && nextOpen < nextClose) {
				depth += 1;
				cursor = nextOpen + 4;
			} else {
				depth -= 1;
				cursor = nextClose + 6;
				if (depth === 0) {
					end = nextClose;
					break;
				}
			}
		}
		if (end === -1) break; // unterminated block: stop extracting

		blocks.push(renderedHtml.slice(from + OPEN.length, end));
		from = renderedHtml.indexOf(OPEN, end + 6);
	}

	const slidesHtml = blocks
		.map((inner) => `<section class="slide"><div class="slide-inner">${inner}</div></section>`)
		.join('\n');

	return { slidesHtml, slideCount: blocks.length };
}
