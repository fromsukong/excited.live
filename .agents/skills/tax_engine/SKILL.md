---
name: tax_engine
description: >-
  How the pure tax engine at packages/tax (@excited-live/tax) works, and the rules for changing it:
  the TaxSystem contract, the registry, the real TH 2026 implementation, the flagged US 2026
  placeholder, bilingual labels, the golden test suite, and the purity constraints. Use this skill
  when working on tax math, adding a jurisdiction or a tax year, or debugging tax results in any app.
---

# Tax Engine Skill

`packages/tax` is the individual income tax engine shared by every surface (web app today, mobile and MCP tools later). It is logic only.

---

## 1. Non-negotiable rules

- PURE package (AGENTS.md rule 2): no network, no DOM, no framework imports, no locale or timezone dependent logic. The tax year is a constant in each system (`TAX_YEAR = 2026`), never derived from `Date`.
- INDIVIDUAL tax only (product decision 2026-08-30, see `packages/tax/README.md`). Corporate tax is out of scope.
- Labels are bilingual `{ en, th }` with English first, in both `label` and `condition` fields.
- Never mutate an exposed `config` view (section 6). It is deep-frozen for a reason.
- Nothing mechanically enforces the import ban today (no lint rule, and the tsconfig still pulls in default DOM libs). The rule holds by review, so treat a network or DOM import in this package as a bug in your diff.

## 2. Layout

- `src/types.ts`: everything shared. The `TaxSystem` contract (`validate`, `compute`, `assumptions`, optional `config` and `allowanceDefs`), `TaxInput`, `TaxResult`, `TaxBracket` (last bracket must use `Infinity`), `IncomeCategory`, `AllowanceDef`, `DeductionLine`, `TaxCountry` union.
- `src/registry.ts`: `getTaxSystem(country, taxYear)` with keys like `"TH-2026"`. Also `availableTaxSystems()` and `registerTaxSystem()`. The built-in systems register at the bottom of this file. Unknown combos throw with the available list: `No tax system registered for TH 2025. Available: TH 2026, US 2026`.
- `src/thai/thai-2026.ts`: the real implementation (PND 91 style). Details in section 4.
- `src/us/us-2026.ts`: flagged architecture placeholder. Details in section 5.
- `src/deep-freeze.ts`: cycle-safe recursive `Object.freeze` used by every exposed config.
- `src/index.ts`: the public surface: `export *` of the types, the registry functions, and both systems. Consumers import from `@excited-live/tax`, never from deep paths.

## 3. Using the engine

```ts
import { getTaxSystem } from "@excited-live/tax"

const thai = getTaxSystem("TH", 2026)
const problems = thai.validate(input)  // [] means valid, strings otherwise
const result = thai.compute(input)     // all money values rounded to 2 decimals
```

- Call `validate` first. `compute` assumes a valid input and does not re-check.
- Every built-in system exposes `config` (brackets, income categories, plus US filing statuses) and TH exposes `allowanceDefs`, so UI surfaces render forms from config instead of hard-coded numbers.
- `result.balance` is `netTax - withheld - estimatedPaid`. Negative means refund.

## 4. TH 2026 model facts (verified in src/thai/thai-2026.ts)

Brackets (ascending, last is `Infinity`):
- 0 to 150,000: 0%
- 150,000 to 300,000: 5%
- 300,000 to 500,000: 10%
- 500,000 to 750,000: 15%
- 750,000 to 1,000,000: 20%
- 1,000,000 to 2,000,000: 25%
- 2,000,000 to 5,000,000: 30%
- above 5,000,000: 35%

Expense deductions per income category (applied to the category total): employment 50% capped at 100,000 THB; freelance, rental, and other 30%; dividend and interest none.

Allowances per person: personal 60,000; spouse 60,000; children 30,000; parents 30,000 (max 4 people, own plus spouse's parents); disabled 60,000.

Itemized deduction caps: insurance 100,000; mortgage interest 100,000; donations 10% of assessable income; retirement savings: SSF 200,000, RMF 30% of assessable income, provident fund 15% of gross employment income, then a combined 500,000 cap.

Working credit (employment income only):
- up to 150,000: full 15,000
- 150,000 to 300,000: `max(0, 15000 - 0.5 * (employmentGross - 150000))`
- above 300,000: 0
- The credit never exceeds the liability.

Floors and rounding: taxable income floors at 0; all money fields round to 2 decimals; `effectiveRate` is `netTax / assessableIncome` (0 when assessable income is 0).

v1 simplifications, surfaced to users through `assumptions` (not hidden): interest 20,000 THB exemption not modeled; dividend tax credit not modeled; section 40(4) exemptions not modeled; provident fund cap simplified; donations capped at 10%; parent eligibility (age 60+, income at most 30,000 THB) taken at face value and not verified. When you add a simplification, add it to `assumptions` in both languages so the UI footnotes stay true.

`deductionLines` gives the UI entered vs applied per line with a `capped` flag, so cap logic is never duplicated in app code. TH reports four aggregate lines: insurance, mortgageInterest, donations, and one retirement line (the combined cap is what bites across SSF / RMF / provident, so per-fund attribution would be order-dependent).

## 5. US 2026 is a placeholder, do not treat it as real

US 2026 exists to prove the multi-jurisdiction shape. Every rate, bracket, and standard deduction is a 2025 stand-in because the real 2026 schedule depends on pending legislation (TCJA sunset), and the module says so in its header, `description`, and `assumptions`. Rules:
- Do not remove the PLACEHOLDER flags, do not fill in 2026 numbers without verifying the enacted schedule from a real source, and do not use the system for real calculations.
- It ignores `allowances` and itemized deduction inputs and pushes warnings when any are non-zero. It models the standard deduction only (reported capped at assessable income) and no credits. `deductionLines` is empty.
- Filing statuses: `single`, `married_joint`, `married_separate`, `head_of_household`, via `input.filingStatus`. An unknown status is reported by `validate`, and `compute` falls back to `single` while pushing an error string.

## 6. The frozen-config contract (src/config-purity.test.ts)

What that test actually enforces, so you know what fails if you break it:
- `deepFreeze` freezes nested objects and arrays in place, is idempotent, passes primitives through, and does not choke on cycles.
- Each built-in system exposes a deeply frozen `config`: the object itself, `brackets`, every bracket object, `incomeCategories`. US additionally freezes `options.filingStatuses` and `options.bracketsByStatus` (the instances `compute()` reads directly, so freezing is the corruption guard there; TH config holds defensive copies, so a tamper attempt cannot reach the engine either way).
- After tamper attempts, `compute()` output is unchanged and `taxYear` stays 2026.
- Repeated `getTaxSystem()` lookups return the same instance.

When you add a system, extend the `describe.each` list in this file.

## 7. Adding a jurisdiction or a tax year

1. Add one file `src/<country>/<country>-<year>.ts` implementing the `TaxSystem` contract from `src/types.ts`.
2. Register it with one line in `src/registry.ts` (`registerTaxSystem(...)`). The key becomes `<COUNTRY>-<YEAR>`.
3. If it is a new country, extend the `TaxCountry` union in `src/types.ts`.
4. Add co-located tests `*.test.ts` next to the implementation (vitest), and extend `config-purity.test.ts`.
5. Leave the existing systems alone. The registry supports multiple years side by side.

## 8. Tests: what each file protects

All tests are co-located `*.test.ts` files (vitest). Run them with `pnpm --filter @excited-live/tax test`.

- `thai/thai-2026.golden.test.ts`: hand-recomputed scenarios A to E (salary, freelancer, landlord, executive, multi-income), cap boundaries (exactly at the cap and one unit over), working-credit phase-out endpoints (150k, 170k, 180k, 300k), bracket boundary cases, structural edges (two employment lines share one cap), invariant sweeps (liability equals the bracket sum across 146 points, net tax monotonic in gross, effective rate never above marginal), and validate hardening (NaN, negatives, non-integers). Change a number in the engine and this file should fail first.
- `thai/thai-2026.test.ts`: behavior specs for metadata, basic computation, deductions (including the combined retirement cap), balance sign, credit phase-out, brackets, warnings, validate, parents allowance, and deductionLines.
- `us/us-2026.test.ts`: placeholder metadata, per-status standard deduction outcomes, ignored-input warnings, validate errors.
- `registry.test.ts`: resolution, throw message shape, available list (`TH-2026`, `US-2026`), runtime registration, and config exposure (including "last bracket is Infinity").
- `config-purity.test.ts`: section 6.

## 9. Commands

```bash
pnpm --filter @excited-live/tax test        # vitest run
pnpm --filter @excited-live/tax typecheck   # tsc --noEmit
pnpm --filter @excited-live/tax build       # tsup, emits dist/ (esm + cjs + d.ts)
```

## 10. Pitfalls

- Caps apply to the category total, not per line. Sum the category's lines before applying rate and cap (the golden test "two employment lines" pins this).
- Rounding is part of the contract. Use the same `round2` approach; golden assertions compare exact 2-decimal values.
- `allowances.parents` is capped at 4 by `validate`, and all allowance counts must be non-negative integers.
- TH ignores `filingStatus` silently by design. Do not "fix" that into an error.
- Keep TH and US structurally parallel. If you change `TaxResult` or `TaxSystem`, update both systems and their tests in the same change.
- Keep `packages/tax/README.md` and the per-system `assumptions` in sync when behavior changes. Users see `assumptions` in the UI.
