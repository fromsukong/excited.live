# excited.live

Financial simulation for your real life — tax, planning, and money decisions you can actually trust.
จำลองการเงินชีวิตส่วนตัว ที่คำนวณได้จริง เข้าใจได้ง่าย

## What is this?

Excited.live is a pnpm + turbo monorepo for building financial simulators:

- `apps/webapp` — the web app (TanStack Start + React 19, server-side rendered, deployed on Cloudflare Pages)
- `packages/*` — pure shared engines (no network, no DOM, no framework imports) so the same math can power the web app, mobile, MCP tools, and white-label builds later

The first engine (`packages/tax`) is under active development.

## Getting started

Requirements: Node 22 (what CI uses) and pnpm 10 (pinned via the `packageManager` field).

```bash
pnpm install
pnpm dev        # webapp on http://localhost:3000
pnpm build      # build all packages + app
pnpm typecheck  # typecheck everything
```

## Mock vs live API mode

`VITE_API_MODE` is a build-time environment variable used by the CI workflows:

- Every PR preview deploys twice: `<branch>-mock` (`VITE_API_MODE=mock`) and `<branch>-live` (`VITE_API_MODE=live`) on `*.excited-live.pages.dev`
- Pushes to `main` (prelive) and production deploys build with `VITE_API_MODE=live`
- For local dev, `mock` is the safe choice: stubbed data, no real keys, no real requests

## Deploy model

GitHub Actions direct-upload (Cloudflare does not build — no build-count limit):

1. PR open/update → two preview deploys: `<branch>-mock` and `<branch>-live` on `*.excited-live.pages.dev`
2. Push to `main` → auto-deploy to the prelive project (`excited-live-prelive.pages.dev`)
3. Production (excited.live) → manual trigger only: Actions → Deploy Production → Run workflow (type PROD to confirm)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full guide and deployment pitfalls.

## Contributing

- Never push straight to `main`. Branch from updated main as `feat/*`, `fix/*`, or `docs/*` and open a PR.
- `pnpm build` and `pnpm typecheck` must pass before opening a PR.
- Keep engines pure (no network, no DOM at module top level).
- New user-facing text is bilingual: `{ en, th }`, EN-first. (The web UI is EN-only today; this rule applies to everything added from now on.)

## License

[Apache-2.0](./LICENSE). Note: the license does not grant permission to use the excited.live trade names, trademarks, service marks, or product names (see LICENSE §6).
