# excited.live API (`apps/api`)

Standalone Hono API behind the webapp. The webapp's BFF (`apps/webapp/src/routes/api/v1/*`)
proxies `/api/v1/*` here and injects the authenticated user as `x-user-id`.

Routes: `GET /health`, `GET|PUT /api/v1/plan`, `GET|PUT /api/v1/settings`,
`POST /api/v1/sim/monte-carlo`, `POST /api/v1/sim/simulate`.

## Persistence — Cloudflare D1

Plan and settings used to live in in-memory `Map`s: every restart wiped them.
They now live in **Cloudflare D1** (SQLite) in the target deployment, and in a
local **SQLite file** for dev/test — same engine, same SQL, same store code.

```
request -> app.ts -> c.var.db (SqlDriver)
                        |-- D1 binding on the runtime env (`c.env.DB`)  -> src/db/d1.ts
                        `-- otherwise: node:sqlite file                 -> src/db/node-sqlite.ts
                                                                          .data/excited-live.sqlite
```

| File | Role |
| --- | --- |
| `migrations/0001_init.sql` | Source of truth: D1-compatible SQL, also read by `wrangler d1 migrations apply` |
| `src/db/migrations.generated.ts` | Generated mirror of the SQL (Workers cannot read files at runtime). `pnpm --filter @excited-live/api gen:migrations` |
| `src/db/apply.ts` | Applies pending migrations, tracked in the wrangler-standard `d1_migrations` table |
| `src/db/d1.ts` / `src/db/node-sqlite.ts` | The two drivers behind `SqlDriver` |
| `src/db/index.ts` | Resolution order + one cached handle per process |
| `src/stores/plan-store.ts` | `plans(user_id PK, data JSON, updated_at)` |
| `src/stores/settings-store.ts` | `user_settings(user_id PK, profile_name, birthday, gender, updated_at)` |

Schema (see `migrations/0001_init.sql`): `plans` keeps the plan document as a
JSON snapshot (whatever the client PUT comes back byte-for-byte on GET — the
shape of `PlanInput` is owned by `@excited-live/sim`); `user_settings` uses one
column per field.

Contract notes:
- Keying is unchanged: `x-user-id`, else the `default` bucket.
- Response shapes are unchanged, including `birthday` being **absent** (not
  `null`) when unset — the webapp's Settings page relies on that.
- Unknown user: `GET /api/v1/plan` returns `defaultPlanInput()`, `GET /api/v1/settings`
  returns `{ profileName: "", gender: "female" }` — same as before.
- No DB configured is not a silent-memory mode: the process opens local SQLite
  and fails loudly at boot if that is impossible (`EXCITED_API_DB_PATH` is how
  you point it somewhere writable).

## Local dev / tests

```bash
pnpm --filter @excited-live/api dev        # tsx watch, migrates on boot
pnpm --filter @excited-live/api test       # vitest: stores, migrations, HTTP contract, restart
pnpm --filter @excited-live/api gen:migrations
bash apps/api/scripts/persistence-proof.sh # save -> restart -> still there
```

The last command's raw output is checked in at `docs/persistence-proof.md`.

Env vars:

| Var | Default | Meaning |
| --- | --- | --- |
| `EXCITED_API_DB_PATH` | `.data/excited-live.sqlite` (relative to the process cwd) | Local SQLite file |
| `EXCITED_API_AUTO_MIGRATE` | on | `0` skips boot migrations (e.g. when wrangler owns them) |
| `PORT` | `8000` | HTTP port |

Local runs need Node >= 22.13 (`node:sqlite` without a flag).

## Deployment readiness (no action taken here)

Wiring this to Cloudflare is a separate task; nothing below has been run.

1. `npx wrangler d1 create excited-live-api` — prints the `database_id`.
2. Paste it into `apps/api/wrangler.toml` (`[[d1_databases]]`, binding `DB`,
   `database_id = "REPLACE_WITH_DATABASE_ID"`). `migrations_dir` is already
   `migrations`.
3. `npx wrangler d1 migrations apply excited-live-api --remote` (CI or manual)
   — or let the Worker migrate itself on first request: it applies the same
   files, idempotently, through the shared `d1_migrations` ledger
   (`EXCITED_API_AUTO_MIGRATE=0` disables that).
4. `pnpm --filter @excited-live/api build` produces `dist/worker.js` (Workers
   entry, `export default { fetch }`) next to `dist/index.js` (Node entry).
   `wrangler.toml` already points `main` at `dist/worker.js`.
5. Deploy the Worker (`wrangler deploy`) and point the webapp's
   `BACKEND_API_URL` at it.
6. No env var is required for D1 (the binding provides it); add `nodejs_compat`
   only if the Workers runtime asks for it.

Not verified locally: an actual D1 binding (needs provisioning). The D1 driver
and the migrations run against a D1-shaped binding backed by real SQLite in
`src/db/resolve.test.ts`.
