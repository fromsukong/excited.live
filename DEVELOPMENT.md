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

- `VITE_API_MODE=mock` — stubbed data. Safe default for local dev: no real keys, no real requests.
- `VITE_API_MODE=live` — real backend. Used for the PR `live` preview and all main/production deploys.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`), direct-upload pattern (Cloudflare does NOT build — no build-count limit):

- PR open/update → two preview deploys on project `excited-live`: `<branch>-mock` and `<branch>-live` aliases (`*.excited-live.pages.dev`)
- Merge/push to `main` → auto-deploy to **prelive** project (`excited-live-prelive`, URL: excited-live-prelive.pages.dev → eventually prelive.excited.live)
- **Production** (`excited-live` project → excited.live) deploys ONLY via manual trigger: Actions → Deploy Production → Run workflow (requires typing PROD to confirm) (workflow_dispatch)

Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Pitfalls:
- Must use wrangler@4 (v3 esbuild can't compile the SSR function — `with {type: json}` syntax)
- The Pages Function (`apps/webapp/functions/[[path]].ts`) bundles `dist/server/server.js` — deploy jobs must run inside `apps/webapp` where both `functions/` and `dist/` exist
- CF project needs `nodejs_compat` compatibility flag (set on both projects already)

## Conventions for agents (Hermes)

**AI agents: read [AGENTS.md](./AGENTS.md) first** — it is the canonical agent
contract (rules, definition of done, git safety for shared clones). The notes
below are a quick summary.

- Work on a branch, open a PR. Never push straight to main.
- Before starting a task: `git pull --ff-only` on main, branch from it.
- Verify your work: build must pass (`pnpm build`) and typecheck (`pnpm typecheck`) before opening the PR.
- Keep the tax engine pure (no network, no DOM) — it lives in `packages/tax` and is shared.
- SSR: routes run server-side first; don't touch `window`/`document` at module top level.
- New user-facing text is bilingual: `{ en, th }`, EN-first. (The web UI is EN-only today; this rule applies to everything added from now on.)
