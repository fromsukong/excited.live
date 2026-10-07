# Local persistence proof (FRO-66)

Real output from `bash apps/api/scripts/persistence-proof.sh` — no editing.

Method: build the package with the same turbo command CI runs, start the built
bundle (`node dist/index.js`, so the proof covers the shipped artifact, not just
tsx), `PUT` a plan and settings as `x-user-id: user-a`, `SIGTERM` the process
and wait for it to exit, start a **new** process against the same SQLite file,
then read the data back and also read as a brand-new `x-user-id`.

Runtime: Node v26.7.0 (the deploy target of CI is Node 22; `node:sqlite` needs
>= 22.13 there). Database: local SQLite file via `node:sqlite` — the same engine,
same migration files and same store code the D1 driver runs in the deployment
(D1 is only reachable with a provisioned binding, which is out of scope here).

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
