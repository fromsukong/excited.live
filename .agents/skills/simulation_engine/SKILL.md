---
name: simulation_engine
description: >-
  The plan simulation engine in packages/sim and the boundary the webapp consumes it
  through. Use this skill when touching packages/sim (engine, summary, Monte Carlo,
  optimizer), apps/webapp/src/lib/plan-service.ts, dashboard plan math, wallet
  semantics, or the independent recompute check scripts/recompute-mvp.py.
---

# Simulation Engine Skill

`packages/sim` is the multi-wallet life projection engine: pure TypeScript, THB amounts,
Thai tax TH 2026 via `packages/tax`. It simulates a plan month by month and rolls the
months up to years for the dashboard. This skill documents the real public surface, how
the webapp consumes it, and the money-math discipline. It is a distillation, not a copy:
open the named files when exact numbers matter.

## 1. Files and the purity rule

All source lives in `packages/sim/src/`:

- `index.ts` (914 lines): types, wallet model, row math helpers, `runSimulation()`.
- `summary.ts`: dashboard summary math (`retirementVerdict`, `maxForeverMonthlySpend`,
  `goalChecks`, `compareFundPaths`, `moneyRunsOutYear`).
- `monte-carlo.ts`: seeded market simulation (`runMonteCarlo`, `simulateMarketPath`,
  `percentile`, `defaultMonteCarloConfig`).
- `optimize.ts`: retirement contribution optimizer (`optimizeRetirementContribution`).
- Co-located tests: `index.test.ts` (332 lines), `summary.test.ts` (92),
  `monte-carlo.test.ts` (210), `optimize.test.ts` (88).

Workspace name: `@excited-live/sim` (package.json scripts: `build` = tsup, `test` =
vitest run, `typecheck` = tsc --noEmit). The only runtime dependency is
`@excited-live/tax` (`workspace:*`, resolved from its built `dist/`, see section 10).

Purity rule (`AGENTS.md` core rule 3): no network, no DOM, no framework imports. The
module code must stay deterministic: nothing in the sim modules imports locale,
timezone, or real time; `defaultPlanInput(now: Date = new Date())` takes the date as an
argument so callers can pin it (the tests pass `new Date("2026-01-15")`).

## 2. Wallets

```ts
type WalletId = "emergency" | "goal" | "nontax" | "taxAdvantaged"
```

- `emergency`: cash, target = `efMonths` months of expenses, default rate 1.5%.
- `goal`: savings account for goals, default 1.5%.
- `nontax`: taxable investments (S&P-ish), default 7%.
- `taxAdvantaged`: ThaiESG / RMF grouped for the MVP, default 7%.

`WALLET_IDS` carries that exact order, and two rules depend on it:

1. Withdrawal order when a month runs short: emergency, then goal, then nontax, then
   taxAdvantaged.
2. Emergency-fund overflow: whatever sits above the EF target flows emergency to
   nontax (only in months where net cash is positive).

`DEFAULT_WALLETS` adds a bilingual `LocalizedLabel { en, th }` and a short note per
wallet; the webapp renders these labels as-is (`walletDefs` in plan-service.ts), so
labels stay bilingual inside the engine.

## 3. Input model (`PlanInput`)

`PlanInput` gathers rows and plan-level knobs:

- `PeriodRow` (incomes and expenses): `typeId`, `frequency` ("monthly" | "yearly"),
  `label`, `startYear`/`startMonth`, `endYear`/`endMonth` (null endYear = runs
  forever), `amount` (yearly amount in the first active year, THB), `growthMode`
  ("inflation" | "fixed" | "override"), `growthRate` (used only by "override"),
  expenses also `deductible` ("none" | "mortgageInterest").
- `MilestoneRow`: `label`, `year`, `month`; chart marker, not simulated.
- `AssetRow` / `LiabilityRow`: `typeId`, `label`, `value`; stored and displayed, not
  simulated in the MVP engine.
- `GoalRow`: `label`, `amountToday` (today's money), `targetYear`, `wallet` (goal |
  nontax | taxAdvantaged).

Plan-level fields: `startYear`, `birthYear` (drives the age row), `inflation` (0..1,
global default growth), `retirementYear` (null = no switch), `retirementMonthlyToday`
(desired pension, monthly, today's money), `savingsSplit` per wallet (must sum to 1,
tolerance 0.001), `walletRates` per wallet (yearly nominal), `startingWallets` per
wallet, `efMonths`, TH tax inputs (`personalAllowances`, `spouseAllowances`,
`childrenAllowances`, `parentsAllowances`, `insurance` THB/year,
`annualWithholding`), `horizonYears` (1..60).

Type-ID lists and default frequencies: the four const lists
`INCOME_TYPE_IDS` (9 entries), `EXPENSE_TYPE_IDS` (14), `ASSET_TYPE_IDS` (18),
`LIABILITY_TYPE_IDS` (4) drive the grouped tables in the UI; per-type default
frequencies live in `INCOME_TYPE_DEFAULT_FREQUENCY` and
`EXPENSE_TYPE_DEFAULT_FREQUENCY` (salary monthly, rsuGrant yearly, livingExpenses
monthly, education yearly, and so on). The full lists with per-type frequencies are in
`references/input_model.md`.

`runSimulation` validates: `horizonYears` must be 1..60 and `savingsSplit` must sum to
1 (tolerance 0.001), otherwise it throws `RangeError`. Callers surfacing the error are
the contract: `usePlanDashboard.ts` wraps `computePlanSummary` in try/catch.

## 4. Row math: the anniversary model

Helpers (all exported, all pure):

- `yearlyAmount(row)`: `amount * (frequency === "monthly" ? 12 : 1)`.
- `rowGrowthRate(row, inflation)`: "fixed" gives 0, "override" gives growthRate,
  otherwise the plan inflation rate.
- `rowAmountInYear(row, year, inflation)`: the row's yearly figure in a calendar year.
  Grows on the anniversary of the row's `startYear` (full years elapsed since the
  start YEAR, not since the row's own `startMonth`): `yearlyAmount(row) *
  (1 + rate) ** (year - row.startYear)`, scaled by the fraction of months active in
  that year (start month and end month trim the first and last year; a row living
  entirely in one year counts `endMonth - startMonth + 1` months of 12).
- `rowLifetimeTotal(row, plan)`: sum of `rowAmountInYear` across the plan horizon.

The monthly loop consumes the same model month by month (`monthShare`), so the yearly
rollup and the monthly chart agree.

## 5. `runSimulation`: what happens month by month

Native granularity is the month. `SimulationResult` carries both
`months: SimulationMonth[]` (every month of the horizon) and `years: SimulationYear[]`
(yearly rollups), plus `unmetMonthIndex`, `unmetYear`, `totalTax`, `warnings`,
`currency: "THB"`, and `taxSystem: { country: "TH", taxYear: 2026 }`.

Per month, in order:

1. Income and expenses come from the anniversary model (step above). From
   `retirementYear` on, spending switches to the pension: `retirementMonthlyToday`
   inflated by `(1 + inflation) ** (years since retirement)` (`PlanInput` docs: US-004),
   added on top of rows still active.
2. Tax is an annual figure computed once, in January of each projected year, by
   `getTaxSystem("TH", 2026).compute(...)`: year income from the anniversary model,
   allowances from the plan, itemized insurance (plan `insurance`) plus
   mortgage-interest rows marked `deductible: "mortgageInterest"`, and
   `annualWithholding`. No retirement-contribution deduction here: projected taxes do
   not include RMF/SSF contributions (the optimizer is its own path, see section 8).
   The year's tax books as 1/12 per month, with December carrying the remainder so the
   twelve months sum exactly to the engine's annual `netTax` (no rounding drift).
3. `netCash = round2(income - tax - expenses)`. Positive net cash lands in wallets by
   `savingsSplit` (recorded as the year's `contribution`); EF overflow above
   `efMonths` × that month's expenses moves emergency to nontax.
4. Wallets grow monthly by `(1 + yearlyRate) ** (1 / 12) - 1`.
5. A month with negative net cash first withdraws what it needs, walking
   `WALLET_IDS` in order (emergency, goal, nontax, taxAdvantaged). What remains
   uncovered marks the month `unmet`; `unmetMonthIndex` / `unmetYear` record the first
   one. An empty-wallet month draws nothing but is still unmet (the flag tracks the
   shortfall, not the withdrawal amount; there is a US-110 regression comment about
   this in index.ts).
6. Each December the month entries roll up into a `SimulationYear` (sums of income,
   expenses, tax, netCash, contribution, withdrawal; end-of-year wallet balances and
   netWorth; `unmet` = any month unmet; `taxResult` = the year's cached TaxResult).

Determinism: same input, same output. The engine keeps `randomness` out entirely;
Monte Carlo layers it on top through an explicit hook.

Callers can override wallet rates per projected year through
`options.rateForYear(year)` (it replaces `input.walletRates` for that year, all four
wallets required, annualized back to monthly inside the engine). This is exactly what
Monte Carlo uses, and a zero-hook run is bit-identical to the plain projection.

## 6. Summary helpers (`summary.ts`)

Answers for the dashboard, computed from a `SimulationResult` (no re-runs except where
noted):

- `moneyRunsOutYear(result)` returns `result.unmetYear`.
- `retirementVerdict(plan, result)` (`RetirementVerdict`): the plan's
  `retirementYear` (defaults to startYear when null), `funded` = no unmet year at or
  after retirement, first unmet year at/after retirement, `remainingAtEnd` (final-year
  netWorth), `endYear`.
- `maxForeverMonthlySpend(plan)`: the largest `retirementMonthlyToday` that never
  triggers an unmet year within the horizon. Bisection: 40 iterations between 0 and
  max(4x the plan's ask, 1,000), re-running `runSimulation` each probe, result floored
  to 100 THB.
- `goalChecks(plan, result)`: per goal, inflation the target
  `amountToday * (1 + inflation) ** yearsOut` and compare with the funding wallet's
  end-of-year balance (`goalChecks` uses `Math.max(0, balance)`), then verdict
  `onTrack` / `shortBy`.
- `compareFundPaths(plan, result, recommendedYearly, taxDragRate = 0.005)` (FR-6):
  ThaiESG/RMF path where the annual tax saving (`contribution x marginalRate`) is
  reinvested, vs the same gross cost into a taxable path growing at the plan's
  `walletRates.nontax` minus a 0.5%/year tax drag. Contributions follow the
  optimizer's recommendation while income is positive (up to the last income year).

Where a new dashboard question needs math, it goes here (pure, testable), not into the
UI layer.

## 7. Monte Carlo (`monte-carlo.ts`, US-110)

`runMonteCarlo(plan, config?)` runs 200 trials by default
(`defaultMonteCarloConfig: { trials: 200, volatility: 0.18, seed: 20260908 }`). Each
trial samples yearly returns for the investment wallets only: `nontax` gets
`plan.rate + volatility * normal()`, `taxAdvantaged` gets volatility x 0.9, and
emergency/goal keep their plan rates (cash-like). Samples clamp to [-0.75, 1]. The PRNG
is mulberry32 seeded from the config seed (Box-Muller for the normal draw), so a fixed
seed always replays the same bands, and an omitted seed falls back to
`DEFAULT_SEED`: runs are reproducible by default (plan-service.ts relies on this for
SSR/client match).

Output (`MonteCarloResult`): `trials`, `volatility`, one `MonteCarloYear` per
projected year (P10/P50/P90 net-worth bands plus `cashFlow: null`), `survivalRate`
(share of trials that never ran out), `unmetYearP100` (first year ANY trial ran out,
worst case), `medianFinalNetWorth`. `cashFlow` is null by design: net cash is
income minus tax minus expenses, independent of wallet returns in this engine, so a
band would be zero-width everywhere. Percentiles come from `percentile(sorted, p)`,
interpolated and rounded so P10 <= P50 <= P90 survives floats.

## 8. Optimizer (`optimize.ts`)

`optimizeRetirementContribution(input)` answers "how much should I put into RMF/ThaiESG
before the December cutoff to save the most tax?" for the CURRENT year (TH 2026 same
as the sim engine). Input (`OptimizerInput`): gross employment income, household
allowances, insurance, mortgageInterest, donations. The model: RMF-shaped deduction
capped at 30% of assessable income, combined SSF+RMF+provident cap 500,000 THB.
Algorithm: probe the tax at the cap, recommend nothing ("no-benefit") when that does
not reduce tax below the no-contribution baseline, otherwise walk down from the cap in
1,000 THB steps while the smaller contribution saves the same tax, landing on the
smallest commitment that keeps the tax outcome. Output `OptimizerResult`:
`recommended` (THB), `boundBy` ("combined" | "rate" | "no-benefit"), `taxSaved`,
`assessableIncome`.

Numbers the tests pin (hand-computed from the TH 2026 brackets): income 1,200,000 with
25,000 insurance gives assessable 1,100,000, recommendation 330,000 (rate cap),
taxSaved 63,500. Income 3,000,000 binds at the 500,000 combined cap. Income 150,000
gives no-benefit / recommended 0.

## 9. The webapp boundary

`apps/webapp/src/lib/plan-service.ts` is a deliberate mock service layer (banner
dated 2026-09-06 in the file): everything runs in the browser on the pure engines, and
when a real backend with persistence lands, the function bodies swap to fetches while
every exported name stays. Its contract:

- `computePlanSummary(plan)` runs the engine once per plan edit and returns everything
  the UI needs (`PlanSummary`: result, runsOutYear, retirement verdict,
  maxForeverMonthly, goal checks, this-year optimizer, path compare).
- `defaultPlan()` wraps `defaultPlanInput()`.
- `walletDefs` re-exports `DEFAULT_WALLETS`.
- `computeMonteCarloBands(plan)` re-runs `runMonteCarlo` with the seeded default
  config (~200 full projections, a few hundred ms).

The file also re-exports the engine types and small helpers the UI needs
(`realReturn`, `WALLET_IDS`, the type-ID lists, `rowLifetimeTotal`, `yearlyAmount`,
row and result types).

`apps/webapp/src/hooks/usePlanDashboard.ts` consumes only plan-service: opens the plan
state, computes `summary = useMemo(() => computePlanSummary(plan))` in a try/catch so
engine errors render instead of crashing, slices years by horizon (10/20/30/40/all),
and runs `computeMonteCarloBands` on a 250 ms debounce so typing stays instant, with
`shownBands` index-aligned to the sliced years and shown for the net-worth metric only
(cash flow has no band, see section 7). The dashboard context
(`PlanDashboardProvider` / `usePlanDashboardContext`) carries the summary and the row
dialogs; `ADD_DIALOG_TYPE_IDS = new Set(["salary"])` is a deliberate 2026-09-12
product decision, not an accident.

Boundary rule, verified today: `@excited-live/sim` has exactly ONE importer in the
repo, `plan-service.ts`. UI files never import from the engine package; they import
types and functions from plan-service (it re-exports the shared ones). Keep this
intact so the backend swap stays a one-file change.

## 10. Dependencies and money-math discipline

- The sim imports `getTaxSystem` from `@excited-live/tax` and computes TH 2026 tax
  inside the monthly loop (January of each projected year, section 5 step 2). Tax
  enters the cash flow as a monthly expense line before net cash, before wallets.
- `scripts/recompute-mvp.py` is the independent check: a hand-written pure-Python port
  of the tax rules and the default plan's first years plus the optimizer case, which
  prints the numbers and asserts the hand-computed expectations (optimizer saving
  63,500 at income 1.2M, path-compare first-year 133,750). It does not import or call
  the engine; any mismatch means one of the two implementations is wrong. Run
  `python3 scripts/recompute-mvp.py` after every engine change and before opening a
  PR. It guards only a slice (TH 2026, default-plan shape); the full behavior is the
  vitest suite, and the tax engine's own golden tests protect the brackets (see the
  `tax_engine` skill).

## 11. Tests and commands

What each test file protects (all co-located in `packages/sim/src/`, vitest):

- `index.test.ts`: the engine core, including rejected inputs (horizon and
  savingsSplit), a step-by-step default-plan projection vs hand-computed year 1
  numbers, monthly and pension timing (US-004 starts the pension at January of the
  retirement year), emergency-fund overflow, withdrawal order and unmet-month
  behavior (US-006), row helpers (`rowAmountInYear` trims, `rowLifetimeTotal`,
  `realReturn`), and the US-110 regression where an empty-wallet month is still unmet.
- `summary.test.ts`: summary math against the default plan (`retirementVerdict` funded
  case and horizon 2075 end year, a broken case that runs out, max forever spend
  bracketed between working and broken plans and its bisection invariant, goal checks
  with an unreachable goal, path compare with the reinvested tax saving and the
  133,750 first-year hand check).
- `monte-carlo.test.ts`: shape and bounds (trials >= 2, cashFlow null, band ordering
  P10 <= P50 <= P90, survivalRate in 0..1), span sanity (a higher-volatility plan has
  a wider band), determinism for a fixed seed and reproducibility without a config.
- `optimize.test.ts`: the 30% rate cap (330,000 at income 1.2M, saved 63,500), the
  500,000 combined cap at high income, no-benefit at income 150,000, and the
  1,000 THB walk-down at income 600,000 (recommended 150,000, saved 13,250).

```bash
# Engine checks (what CI runs per package)
pnpm --filter @excited-live/sim test
pnpm --filter @excited-live/sim typecheck
pnpm --filter @excited-live/sim build

# First run after a fresh install: build the dependency first.
# Sim imports @excited-live/tax from its dist/, a bare workspace typecheck
# fails until tax is built (turbo does this via dependsOn ^build in CI).
pnpm --filter @excited-live/tax build

# Independent money-math check (section 10)
python3 scripts/recompute-mvp.py
```

`pnpm --filter @excited-live/sim test` runs the four test files (38 tests at authoring
time). Full `pnpm build` is heavy on small boxes; run the filtered commands above.

## 12. Pitfalls

- Keep the engine pure and deterministic (section 1). If a change feels like it needs
  a `Date.now()`, a fetch, or a framework import inside packages/sim, the design is
  wrong: pass the value in as an argument or compute it in plan-service.
- Units: row `amount` is the YEARLY figure in the first active year even when the UI
  collected it monthly; `yearlyAmount` does the x12. Every other figure in the engine
  is THB real numbers, never thousands or decimals.
- Frequency handling is "monthly x 12 only": there is no weekly vs daily model.
  Adding one means touching `PeriodRow`, `yearlyAmount`, `rowAmountInYear`, and
  `monthShare` together.
- Withdrawal order and EF overflow both read the `WALLET_IDS` array order. Do not
  reorder that array without a migration of every consumer that assumes it.
- The projection tax ignores retirement contributions (rmf/ssf always 0 in the
  engine's `compute` call). The optimizer exists precisely because that is a separate,
  this-year question. Do not "fix" the sim to include them; it is a documented MVP
  boundary.
- Changing any exported shape (wallet ids, `PlanInput` fields, result fields)
  ripples into plan-service.ts re-exports and the whole dashboard. Keep changes
  additive where possible and update both sides in the same PR plus the tests and
  this note if the model changes.
- Month/year UI work follows the current main, not parallel PRs. If in doubt on a
  merged selector change, re-verify the flows you touch against the updated files.

## References

- `references/input_model.md`: full PlanInput field inventory, the four type-ID
  lists, per-type default frequencies, wallet defs and default plan numbers.

Related skills: `tax_engine` (the bracket engine and its golden tests),
`frontend_engineering` (dashboard UI conventions).
