# Blog + presentation workflow

One markdown file = two outputs:

- `/blog/<slug>/` — the full post (every paragraph, images, math).
- `/blog/<slug>/slides` — a presentation built ONLY from the marked blocks,
  for recording YouTube videos.

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

Regular paragraphs render only in the blog.

:::slide
Anything in here becomes ONE slide — a big statement, an image,
or a formula:

$$
B_{t+1} = (B_t + S_t)(1 + r)
$$
:::
```

Rules of thumb:

- 1 `:::slide` block = 1 slide. Keep each block to one idea (a line, an
  image, or a formula + one caption line).
- Unmarked text never appears in the deck — that's the point.
- Math: `$inline$` and `$$display$$` both work in blog and slides.
- After adding the post, check the deck at `/blog/<slug>/slides` —
  arrow keys / click / swipe to navigate, `f` = fullscreen. Record
  straight off that page.

## How it works (for maintenance)

- `src/lib/blog-pipeline.ts` — the ONE markdown pipeline (fumadocs plugins +
  slide fences + KaTeX) used by both Astro itself and the slides page.
  Order matters: `rehypeKatex` must run BEFORE fumadocs `rehypeCode`, or the
  shiki highlighter claims `$$` blocks.
- `src/lib/remark-slide-fences.ts` — `:::slide` → `<div class="slide-block">`.
- `src/lib/slides.ts` — splits rendered HTML into slides.
- `public/katex.min.css` + `public/fonts/` — KaTeX assets (copied from the
  katex package; refresh them if the version bumps).
