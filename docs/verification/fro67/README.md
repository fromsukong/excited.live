# FRO-67 browser verification — wizard answers editable afterwards + reactive restart

Runner: `verify_fro67.cjs` (puppeteer-core, headless Chromium, local vite dev, mock mode).
`results.json`: **34/34 matrix checks PASS** (17 EN + 17 TH), viewport 390x844 @2x.

Scope: US-101 AC#2 "every wizard answer is editable later in the full inputs" plus a
working "Replay the intro".

- `en|th-retirement-tab`: the Retirement tab holds both wizard answers (year 2055,
  ฿40,000/mo) with the projection verdict line underneath.
- `en|th-retirement-edited`: editing the year 2055 -> 2040 moves the chart readout
  (฿72,745,397 -> ฿58,332,533) and the verdict line (฿210,839,456 -> ฿148,447,145).
- `en|th-goals-empty`, `-goal-added`, `-goal-edited`, `-goal-removed`: add / edit / remove
  a goal (name, cost in today's money, target year, funding wallet); the goal-check status
  next to the row re-runs on every edit ("short ฿4,497,406 in 2035").
- `en|th-returning-card`, `-restart-wizard`, `-restart-seeded-step4`: "Replay the intro"
  re-opens the wizard at step 1 of 4 (localStorage flag 1 -> null) and step 4 is seeded
  from the live plan (retirement year 2040), i.e. a replay is an edit, not a reset.
- `en|th-dashboard-after-replay`: after the replay the plan still holds the edited
  projection, retirement year 2040, and the removed goal is still gone.
- `layout` (both locales): no horizontal scroll at 390px, the tab strip overflows but
  scrolls, and both retirement inputs plus the verdict line are on screen.

Run:

```bash
LD_LIBRARY_PATH=/opt/data/cache/chromium-deps/root/usr/lib/aarch64-linux-gnu \
NODE_PATH=/opt/data/cache/shot/node_modules \
node docs/verification/fro67/verify_fro67.cjs
```

CommonJS on purpose: `.cjs` files are excluded from the repo eslint config, so this
evidence script never breaks the whole-repo `pnpm lint` CI job.
