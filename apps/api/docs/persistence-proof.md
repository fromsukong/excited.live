# Local persistence proof (FRO-66, extended by FRO-72)

Real output from the checked-in proof scripts — no editing.

Two proofs, because the two drivers are not interchangeable:

| Proof | Script | Runtime | Driver |
| --- | --- | --- | --- |
| **Real D1 binding** (the deploy path) | `apps/api/scripts/d1-proof.sh` | workerd via `wrangler dev --local` | `src/db/d1.ts` |
| Node SQLite file (dev/CI) | `apps/api/scripts/persistence-proof.sh` | Node | `src/db/node-sqlite.ts` |

The Node proof alone cannot police the deploy path: D1's `exec()` splits its
input on newlines and runs each line as its own statement, while
`node:sqlite`'s `db.exec` accepts a multi-line statement. That gap let a broken
boot-time migrator pass CI (FRO-68) — hence the second proof and the faithful
test double in `src/db/d1-sqlite-stub.ts`.

## Real D1 binding (FRO-72)

Method: build the package with the same turbo command CI runs, boot the built
Worker (`dist/worker.js`, the exact artifact `wrangler deploy` would upload) on
a **real Cloudflare D1 binding** in the real Workers runtime
(`wrangler dev --local`), with the unmodified `apps/api/wrangler.toml` and
boot-time auto-migrate **on**, `PUT` a plan and settings as
`x-user-id: d1-proof-user`, kill the runtime, start a **new** runtime process
against the **same** local D1 database file, read the data back, then read as
`x-user-id: brand-new-user`. Finally the D1 database file is opened read-only
with `node:sqlite` to show the migration ledger and the stored rows.

No Cloudflare account, no login, no provisioning, no deploy. The first run
downloads wrangler + workerd (~150 MB); everything else lives in a throwaway
temp dir.

Command:

```bash
bash apps/api/scripts/d1-proof.sh      # D1_PROOF_PORT=8790 WRANGLER=<bin> also work
```

```text
== environment ==
node:            v26.7.0
wrangler:        4.148.0
worker bundle:   /opt/data/excitedlive-fro66-d1/apps/api/dist/worker.js
d1 binding:      env.DB (local), state dir /tmp/paperclip-run-fro-72-5416f607-05c-uIVVpb/tmp.eUElqGyaBC/state
auto-migrate:    ON (EXCITED_API_AUTO_MIGRATE unset; the Worker applies pending migrations on first request)
port:            8790

== build (turbo build, same command CI runs) ==
• turbo 2.10.12

   • Packages in scope: @excited-live/api
   • Running build in 1 packages
   • Remote caching disabled, using shared worktree cache


 Tasks:    3 successful, 3 total
Cached:    2 cached, 3 total
  Time:    1.986s 

dist:            chunk-ENCBXLPR.js index.js worker.js

== process #1: boot on real D1, auto-migrate, save ==
process #1: pid 2010176 (log: /tmp/paperclip-run-fro-72-5416f607-05c-uIVVpb/tmp.eUElqGyaBC/wrangler-1.log)
  env.DB (excited-live-api)      D1 Database      local
  [wrangler:info] Ready on http://127.0.0.1:8790
GET /api/v1/settings (fresh user) -> 200 {"profileName":"","gender":"female"}
PUT /api/v1/plan                 -> 200
PUT /api/v1/settings             -> 200
process #1: pid 2010176 is gone

== the D1 database file workerd just wrote ==
  /tmp/paperclip-run-fro-72-5416f607-05c-uIVVpb/tmp.eUElqGyaBC/state/v3/d1/miniflare-D1DatabaseObject/0c21a280f8948177574d558e3463b0c7de8f190e274a19310e880b2dc64134e1.sqlite
  -rw-r--r-- 1 hermes hermes 4096 Oct  7 17:47 /tmp/paperclip-run-fro-72-5416f607-05c-uIVVpb/tmp.eUElqGyaBC/state/v3/d1/miniflare-D1DatabaseObject/0c21a280f8948177574d558e3463b0c7de8f190e274a19310e880b2dc64134e1.sqlite

== process #2: NEW runtime, SAME D1 file ==
process #2: pid 2010328 (log: /tmp/paperclip-run-fro-72-5416f607-05c-uIVVpb/tmp.eUElqGyaBC/wrangler-2.log)
  env.DB (excited-live-api)      D1 Database      local
  [wrangler:info] Ready on http://127.0.0.1:8790
GET /api/v1/settings (d1-proof-user) -> {"profileName":"FRO-72 D1 proof","birthday":"1994-03-17","gender":"male"}
GET /api/v1/plan     (d1-proof-user) -> 1069 bytes
GET /api/v1/settings (brand-new-user) -> {"profileName":"","gender":"female"}
GET /api/v1/plan     (brand-new-user) -> 1064 bytes
process #2: pid 2010328 is gone

== migration ledger + rows inside the D1 file (read with node:sqlite) ==
  d1_migrations: [{"name":"0001_init.sql","applied_at":"2026-10-07 17:47:49"}]
  plans:         [{"user_id":"d1-proof-user","bytes":1069}]
  user_settings: [{"user_id":"d1-proof-user","profile_name":"FRO-72 D1 proof","birthday":"1994-03-17","gender":"male"}]

== verdict ==
PASS  GET /api/v1/settings is 200 on real D1 (the FRO-68 500 is gone)
PASS  plan survived the restart, byte for byte (PUT body == GET body)
PASS  settings survived the restart, byte for byte
PASS  a fresh x-user-id starts clean (no leakage)
PASS  a fresh x-user-id gets the default plan, not the saved one
```

Verdict: 5/5 PASS. The boot-time migrator applies `0001_init.sql` through a
real D1 binding, and plan + settings survive a real runtime restart byte-for-byte.

### The failure this replaced (FRO-68 blocker)

Same runtime, same config, same local D1 — only `src/db/d1.ts`'s `exec()` put
back to its pre-FRO-72 body (`await binding.exec(sql)`, i.e. the multi-line DDL
handed to D1's newline-splitting `exec`). The Worker was rebuilt with that one
line changed and booted on a fresh local D1:

```text
== PRE-FIX bundle (binding.exec(sql)) on real workerd, fresh local D1 ==
GET /api/v1/settings  -> code=500 body=Internal Server Error
GET /api/v1/plan      -> code=500
PUT /api/v1/settings  -> code=500
```

Worker log (workerd):

```text
✘ [ERROR] Error: D1_EXEC_ERROR: Error in line 1: CREATE TABLE IF NOT EXISTS d1_migrations (: incomplete input: SQLITE_ERROR
      at async Object.exec (dist/prefix/chunk-ENCBXLPR.js:69:7)
      at async applyMigrations (dist/prefix/chunk-ENCBXLPR.js:46:3)
      at async resolveDb (dist/prefix/chunk-ENCBXLPR.js:137:51)
```

Every `/api/v1/*` request 500s because `resolveDb` caches the rejected promise
inside the `/api/v1/*` middleware. `src/db/d1-driver.test.ts` now reproduces that
same error against the faithful test double, so the suite fails if the DDL path
goes back to `binding.exec()`.

## Node SQLite file (FRO-66)

Real output from `bash apps/api/scripts/persistence-proof.sh` — no editing.

Method: build the package with the same turbo command CI runs, start the built
bundle (`node dist/index.js`, so the proof covers the shipped artifact, not just
tsx), `PUT` a plan and settings as `x-user-id: user-a`, `SIGTERM` the process
and wait for it to exit, start a **new** process against the same SQLite file,
then read the data back and also read as a brand-new `x-user-id`.

Runtime: Node v26.7.0 (the deploy target of CI is Node 22; `node:sqlite` needs
>= 22.13 there). Database: local SQLite file via `node:sqlite` — the same engine,
same migration files and same store code the D1 driver runs in the deployment
(see the real-D1 proof above for the binding itself).

```text
== environment ==
node:            v26.7.0
api dir:         /opt/data/excitedlive-fro66-d1/apps/api
database file:   /tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/proof.sqlite
port:            8123

== build (turbo build, same command CI runs) ==
• turbo 2.10.12

   • Packages in scope: @excited-live/api
   • Running build in 1 packages
   • Remote caching disabled, using shared worktree cache


 Tasks:    3 successful, 3 total
Cached:    2 cached, 3 total
  Time:    911ms 

dist:            chunk-BQMRFFDR.js
index.js
worker.js

== process #1: save plan + settings ==
started pid 1828357 (log: /tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/api.log)
  [excited-live-api] persistence: node-sqlite (/tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/proof.sqlite)
  [excited-live-api] migrations applied: 0001_init.sql
  [excited-live-api] Running on http://localhost:8123
PUT /api/v1/plan      -> 200
PUT /api/v1/settings  -> 200
stopping pid 1828357 (SIGTERM) and waiting for it to exit
process is gone

sqlite file on disk:
  -rw-r--r-- 1 hermes hermes 32768 Oct  7 15:47 /tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/proof.sqlite

== process #2: read it back (same database file, new process) ==
started pid 1828375 (log: /tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/api.log)
  [excited-live-api] persistence: node-sqlite (/tmp/paperclip-run-fro-66-cccf7d4b-2d1-YkynW5/tmp.RuUlBaiARu/proof.sqlite)
  [excited-live-api] Running on http://localhost:8123
  <-- GET /health
GET /api/v1/plan       (user-a) -> {"startYear":2026,"birthYear":1996,"inflation":0.02,"incomes":[{"id":"income-salary","typeId":"salary","frequency":"monthly","label":"Salary","startYear":2026,"startMonth":0,"endYear":2055,"endMonth":11,"amount":100000,"growthMode":"override","growthRate":0.03}],"expenses":[{"id":"expense-living","typeId":"livingExpenses","frequency":"monthly","label":"Living expenses","startYear":2026,"startMonth":0,"endYear":null,"endMonth":11,"amount":40000,"growthMode":"inflation","growthRate":0}],"milestones":[{"id":"milestone-retire","label":"Retire","year":2055,"month":0}],"assets":[],"liabilities":[],"goals":[],"retirementYear":2055,"retirementMonthlyToday":40000,"savingsSplit":{"emergency":0.1,"goal":0.2,"nontax":0.5,"taxAdvantaged":0.2},"walletRates":{"emergency":0.015,"goal":0.015,"nontax":0.07,"taxAdvantaged":0.07},"startingWallets":{"emergency":100000,"goal":0,"nontax":300000,"taxAdvantaged":0},"efMonths":6,"personalAllowances":123456,"spouseAllowances":0,"childrenAllowances":0,"parentsAllowances":0,"insurance":25000,"annualWithholding":0,"horizonYears":50}
GET /api/v1/settings   (user-a) -> {"profileName":"FRO-66 proof","birthday":"1994-03-17","gender":"male"}
GET /api/v1/plan       (brand-new-user) -> {"startYear":2026,"birthYear":1996,"inflation":0.02,"incomes":[{"id":"income-salary","typeId":"salary","frequency":"monthly","label":"Salary","startYear":2026,"startMonth":0,"endYear":2055,"endMonth":11,"amount":100000,"growthMode":"override","growthRate":0.03}],"expenses":[{"id":"expense-living","typeId":"livingExpenses","frequency":"monthly","label":"Living expenses","startYear":2026,"startMonth":0,"endYear":null,"endMonth":11,"amount":40000,"growthMode":"inflation","growthRate":0}],"milestones":[{"id":"milestone-retire","label":"Retire","year":2055,"month":0}],"assets":[],"liabilities":[],"goals":[],"retirementYear":2055,"retirementMonthlyToday":40000,"savingsSplit":{"emergency":0.1,"goal":0.2,"nontax":0.5,"taxAdvantaged":0.2},"walletRates":{"emergency":0.015,"goal":0.015,"nontax":0.07,"taxAdvantaged":0.07},"startingWallets":{"emergency":100000,"goal":0,"nontax":300000,"taxAdvantaged":0},"efMonths":6,"personalAllowances":1,"spouseAllowances":0,"childrenAllowances":0,"parentsAllowances":0,"insurance":25000,"annualWithholding":0,"horizonYears":50}
GET /api/v1/settings   (brand-new-user) -> {"profileName":"","gender":"female"}

== verdict ==
PASS  plan survived the restart, byte for byte (PUT body == GET body)
PASS  settings survived the restart, byte for byte
PASS  a fresh x-user-id starts clean (no leakage)
PASS  a fresh x-user-id gets the default plan, not user-a's
```

Verdict: all four checks PASS — plan and settings survive a real process
restart byte-for-byte, and a fresh user starts clean.
