# AGENTS.md — instructions for AI coding agents

This is the contract for any AI agent working in this repo (Hermes, OpenCode,
Claude Code, Codex, or a human following along). Read it before your first
commit.

## What this repo is

excited.live — financial simulation software (tax first), built as a
pnpm + turbo monorepo:

- `apps/webapp` — TanStack Start + React 19, SSR, deployed on Cloudflare Pages
- `packages/*` — pure logic engines (currently `packages/tax`), designed to be
  shared by the web app, a future mobile surface, MCP tools, and white-label builds

Product context: free for end users; revenue comes from white-labeling for
advisors and institutions. User-facing text is bilingual `{ en, th }`, EN first.

## Non-negotiable rules

1. NEVER commit or push directly to `main`. Work on a branch (`feat/*`,
   `fix/*`, `docs/*`) and open a PR. PR previews deploy automatically.
2. `packages/*` engines stay PURE: no network, no DOM, no framework imports,
   no locale/timezone-dependent logic.
3. All user-facing strings are bilingual from day one: `{ en, th }`, EN first.
4. Never commit secrets, tokens, or `.env` files. Cloudflare credentials live
   only in GitHub repo secrets, referenced by workflows.
5. Don't hand-edit generated files: `apps/webapp/src/routeTree.gen.ts`,
   `pnpm-lock.yaml`, anything in `dist/` or `.output/`.

## Setup and everyday commands

```bash
pnpm install
pnpm dev        # webapp on http://localhost:3000
pnpm build      # all packages + app (turbo, cached)
pnpm typecheck  # tsc across the workspace
```

CI runs Node 22; pnpm 10 is pinned via the `packageManager` field.

## Definition of done (before you open a PR)

- `pnpm build` and `pnpm typecheck` pass from the repo root.
- New engine logic has tests, co-located as `*.test.ts` next to the source.
  A root `pnpm test` task is being introduced; if it does not exist yet, say
  so in your PR instead of wiring a test runner ad hoc.
- Your branch contains ONLY your commits. This clone is shared: run
  `git log origin/main..HEAD` before every push and remove strays.
- The PR description follows `.github/pull_request_template.md`.

## Git safety for agents

- Other agents and humans may use the same clone concurrently. Never
  `checkout`, `reset`, `stash`, or `push` without recording it in your task
  notes.
- Prefer your own worktree: `git worktree add ../excitedlive-<topic> -b
  <your-branch> origin/main`.
- If you find the checkout sitting on someone else's branch, leave it alone —
  create your own worktree/branch from `origin/main`.

## Deploy model (read-only for agents)

See DEVELOPMENT.md for the full picture. Short version: PR previews are
automatic; pushes to `main` deploy to the prelive project; PRODUCTION
(excited.live itself) deploys only via a manual `workflow_dispatch` trigger.
Agents must not trigger production deploys without explicit human approval.

## Where to look next

- `DEVELOPMENT.md` — commands, mock vs live API mode, deploy pitfalls
- `.github/pull_request_template.md` — required PR shape
- `packages/tax/src/index.ts` — the current (single-file) engine surface
