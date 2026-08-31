## Summary

<!-- What does this PR do? One or two sentences. -->

## What changed

- <!-- change 1 -->
- <!-- change 2 -->

## Why

<!-- Why is this needed / what problem does it solve? -->

## How to review / test

1. <!-- step 1: e.g. open the mock preview URL -->
2. <!-- step 2 -->
3. <!-- expected result -->

<!-- AUTO-PREVIEWS:START -->
<!-- AUTO-PREVIEWS:END -->

## Reviewer checklist

**Correctness**
- [ ] Logic is right — edge cases considered (empty data, zero values, max values)
- [ ] Tax math (if touched) matches the spec in packages/tax
- [ ] No accidental behavior change outside the PR scope

**SSR safety**
- [ ] No `window` / `document` / `localStorage` at module top level (breaks server render)
- [ ] Routes still render server-side (check preview HTML, not just client behavior)

**Data & secrets**
- [ ] No API keys / tokens committed
- [ ] Mock mode still works with the change (mock preview URL behaves sanely)
- [ ] Live mode only uses env-configured endpoints

**Quality**
- [ ] Build passes (`pnpm build`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] No console errors in preview
- [ ] Naming/readability acceptable — no leftover debug code

**Deploy**
- [ ] Prelive checked after merge (before promoting to production)