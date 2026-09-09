import type { Root } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

/**
 * remark plugin: turn `:::slide … :::` container directives into
 * `<div class="slide-block" data-slide>` so `splitSlides()` can extract them
 * for the presentation view while the blog view renders the full document.
 *
 * Requires `remark-directive` to run BEFORE this plugin.
 */
export function remarkSlideFences() {
	return (tree: Root) => {
		visit(tree, (node) => {
			if (node.type !== 'containerDirective') return;
			if (node.name !== 'slide') return;
			const directive = node as ContainerDirective;
			// hProperties → HTML attributes via remark-rehype
			directive.data ??= {};
			const data = directive.data as Record<string, unknown>;
			data.hProperties = {
				className: ['slide-block'],
				'data-slide': '',
			};
		});
	};
}
