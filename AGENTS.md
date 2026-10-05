# AGENTS.md — instructions for AI coding agents

Contract for any AI agent working in this repo (Hermes, OpenCode, Claude Code, Codex, agy). Read before your first commit.

## Core rules

1. **Never commit directly to `main`**. Work on a branch (`feat/*`, `fix/*`, `docs/*`) and open a PR.
2. **Never commit secrets, tokens, or `.env` files**. Credentials belong in local user dotfiles or GitHub repo secrets.
3. **Pure logic in `packages/*`**: No network, DOM, framework imports, or locale/timezone dependencies.
4. **Bilingual UI strings**: Always `{ en, th }`, English first.
5. **Don't edit generated files**: `routeTree.gen.ts`, `pnpm-lock.yaml`, `dist/`, `.output/`.
6. **Done criteria**: `pnpm build && pnpm typecheck && pnpm lint` must pass (0 warnings) before opening a PR.

## Skill loading rules

- **`honcho_memory`**: **Always load every time**. Use it on every turn to recall user context, inspect peers, or ground decisions in shared memory.
- **All other skills**: **Load only on demand as needed** — do NOT load all skills upfront:
  - `frontend_engineering` — only when building webapp UI, routes, or components.
  - `design_system` — only when styling or modifying theme tokens (`packages/design-system`).
  - `tax_engine` — only when touching tax math or `packages/tax`.
  - `deployment_ci` — only when touching CI workflows or preview deploys.
  - `simulation_engine` — only when touching `packages/sim`, plan math, or plan-service.
  - `i18n_platform` — only when touching locale resolution, dictionaries, or en/th strings.
  - `landing_seo` — only when touching `apps/landingpage`, its meta/SEO layer, or its content pipeline.
  - `auth_workos` — only when touching authentication, the middleware chain, or auth routes.

## Setup & commands

```bash
pnpm install
pnpm dev        # webapp on http://localhost:3000
pnpm build      # all packages + app (turbo, cached)
pnpm typecheck  # tsc across workspace
pnpm lint       # eslint across repo (--max-warnings=0)
pnpm test       # run engine tests
```

## Agent execution guidelines

- **Minimal diffs**: Smallest change satisfying the task. No drive-by formatting or unsolicited refactors.
- **Git isolation**: Work in a branch or dedicated worktree. Check `git log origin/main..HEAD` before pushing.
- **Deploys**: Automatic for PR previews and prelive (`main`). Production deploys are manual and human-only.
- **References**: `docs/PRD.md` (scope source of truth), `DEVELOPMENT.md` (dev details), `.agents/skills/README.md`.
