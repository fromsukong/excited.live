# Blog + presentation workflow

One markdown file = two outputs, each optimized for its own medium and
NEVER duplicating each other:

- `/blog/<slug>/` — the full article in prose. `:::slide` blocks are
  STRIPPED from the blog (deck copy never leaks into the article).
- `/blog/<slug>/slides` — a presentation built ONLY from the marked
  blocks, written to stand alone — this is what gets recorded for
  YouTube.

## The content rule (important)

Blog copy and slide copy are different mediums. Do not write the same
thought twice:

- Blog = the argument in full sentences. Reads well on its own.
- Slides = the distilled beats. One statement, one image, one formula
  per slide — each must make sense alone on screen.
- Repeating prose/claims across blog and deck is a bug.
- Images and formulas MAY appear in both: reusing an asset is medium
  adaptation, not duplication (blog shows it inline, deck shows it big).

## Writing a post

Create `content/blog/<slug>.md`:

```markdown
---
title: My post title
date: 2026-09-16
description: One-sentence summary shown on /blog and in meta tags.
youtube: dQw4w9WgXcQ   # optional — video ID; adds the embed to the post
draft: false            # optional — true hides the post everywhere
---

Full prose argument — lives ONLY in the blog.

:::slide
One stand-alone beat: a big statement, an image, or a formula + caption.
:::

More prose…

$$
B_{t+1} = (B_t + S_t)(1 + r)
$$

Inline math $B_t$ works in prose. A :::slide block may also hold math
or an image for the deck.
```

Rules of thumb:

- 1 `:::slide` block = 1 slide. One idea per block.
- Unmarked text never appears in the deck; `:::slide` text never
  appears in the blog. The build strips both ways.
- If you catch yourself writing the slide text in the paragraph right
  before it, delete one of them.
- Math: `$$display$$` blocks work in blog and slides. Inline single-`$…$`
  is intentionally OFF (a finance blog writes "$500 … $600" in prose) —
  write symbols in prose as plain text with markdown italics instead.
- After adding the post, read the blog (no echo?) and the deck at
  `/blog/<slug>/slides` (each slide stands alone?). Record straight
  off that page — arrow keys / click / swipe, `f` = fullscreen.

## How it works (for maintenance)

- `src/lib/blog-pipeline.ts` — the ONE markdown pipeline (fumadocs
  plugins + slide fences + KaTeX) used by both the blog page and the
  slides page, so the two can never render differently. Order matters:
  `rehypeKatex` must run BEFORE fumadocs `rehypeCode`, or the shiki
  highlighter claims `$$` blocks.
- `src/lib/remark-slide-fences.ts` — `:::slide` → `<div
  class="slide-block">`.
- `src/lib/slides.ts` — splits rendered HTML into (blogHtml, slidesHtml);
  blogHtml has slide blocks removed.
- `public/katex.min.css` + `public/fonts/` — KaTeX assets (copied from
  the katex package; refresh them if the version bumps).
