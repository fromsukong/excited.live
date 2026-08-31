# @excited-live/tax

Pure, multi-jurisdiction individual income tax engine. Logic only — no UI, no
network, no DOM. Shared by every surface (web / mobile / MCP).

## Decisions (2026-08-30)
- INDIVIDUAL tax only. Corporate tax out of scope (possible future module).
- Thailand first: TH 2026 is the real implementation (PND 91 style).
- US 2026 is a PLACEHOLDER skeleton proving the architecture — every value is
  a 2025 stand-in flagged as such. Verify against the enacted 2026 schedule
  before any real use.
- Bilingual labels (`{en, th}`) from day one; UI launches EN-first.

## Usage

```ts
import { getTaxSystem } from "@excited-live/tax"
const thai = getTaxSystem("TH", 2026)   // registered systems: TH 2026, US 2026
const problems = thai.validate(input)   // [] = valid
const result = thai.compute(input)      // full breakdown
```

## Adding a country or tax year

1. Create `src/<country>/<country>-<year>.ts` implementing the `TaxSystem`
   contract (see `src/types.ts`): brackets, income categories, validate,
   compute, assumptions.
2. Register it in `src/registry.ts`.
3. Add tests next to the implementation (vitest).

## Thai v1 simplifications (surfaced via `assumptions`)
- No interest 20,000 THB exemption, no dividend credit, no section 40(4)
  exemptions.
- Provident fund cap simplified to 15% of gross employment income.
- Donations cap = 10% of assessable income.
- Per-fund retirement caps (SSF 200k, RMF 30% of assessable, PF 15% of
  employment income) then a combined 500,000 THB cap.

## Commands

- Run tests: `pnpm --filter @excited-live/tax test`
- Typecheck: `pnpm --filter @excited-live/tax typecheck`
- Build: `pnpm --filter @excited-live/tax build`