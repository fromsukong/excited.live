# excited.live — Development Guide (for humans and agents)

Monorepo: pnpm + turbo. App lives in `apps/webapp` (TanStack Start + React 19, SSR). Tax engine in `packages/tax`.

## Commands

Run from repo root:

- Install: `pnpm install`
- Dev server: `pnpm dev` (webapp on :3000)
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`

## API modes (mock vs live)

Build-time switch via `VITE_API_MODE`:

- `VITE_API_MODE=mock` — backend calls use stubbed data. Default for local dev and PR previews. Safe: no real keys, no real requests.
- `VITE_API_MODE=live` — real backend. Only for production deploys (main branch).

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`), direct-upload pattern (Cloudflare does NOT build — no build-count limit):

- PR open/update → two preview deploys: `-mock` and `-live` branch suffixes → two preview URLs on `excited-live.pages.dev`
- Push to main → production deploy

Required repo secrets (set by repo owner): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Conventions for agents (Hermes)

- Work on a branch, open a PR. Never push straight to main.
- Before starting a task: `git pull --ff-only` on main, branch from it.
- Verify your work: build must pass (`pnpm build`) and typecheck (`pnpm typecheck`) before opening the PR.
- Keep the tax engine pure (no network, no DOM) — it lives in `packages/tax` and is shared.
- SSR: routes run server-side first; don't touch `window`/`document` at module top level.
