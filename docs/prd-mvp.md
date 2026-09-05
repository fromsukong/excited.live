# PRD — MVP (Google Sheet)

Phase 1. Pure formulas, no Apps Script. The sheet proves the math and the UX; it is the spec for the app.

Workbook: `1g3q78km_mcGCUfQ6tDRuwj3RP8_VAhbm2pAQwaco3TU` (tabs: README, Inputs, Income, Expenses, Tax, Simulation, Summary).

## 1. Overview

Upgrade the existing v1 workbook so it answers "can I afford this life?" with granular, real-life income and expense modeling — plus a tax optimizer that knows when enough is enough.

## 2. Goals

- G1: Answer the 3 headline money questions + this-year tax savings, with granular income/expense rows.
- G2: Every simplification documented in the sheet README (bilingual).
- G3: Tabs stay lean; yellow cells = the only editable cells.

## 3. User Stories

### US-001: Income tab with period rows
**Description:** As a user, I want each income stream (salary, bonus, freelance, rental) as its own row with amount, start year, end year, and growth rule, so my real income life is modeled.
**Acceptance Criteria:**
- [ ] New "Income" tab: columns Name, Monthly amount, Start year, End year (blank = forever), Growth mode (Inflation / Fixed), Growth override %
- [ ] Inflation mode uses global inflation from Inputs; override % replaces it per row
- [ ] Discrete increases (promotion, new job) = a new row of the same type starting at the new amount
- [ ] Two overlapping rows of the same type in the same year both count (sum)
- [ ] All numbers hand-verified on one sample year

### US-002: Expenses tab with period rows
**Description:** As a user, I want each expense as a row with type, monthly amount, start/end year, and growth rule, so loans, condo moves, and kids' phases are modeled granularly.
**Acceptance Criteria:**
- [ ] New "Expenses" tab: Name, Type, Monthly amount, Start year, End year (blank = forever), Growth mode (Inflation / Fixed), Growth override %, Deductible flag
- [ ] Same type may appear multiple times with different periods (old condo 2026–2031, new condo 2031+)
- [ ] A discrete jump = new row; the old row just ends (no % jump math)
- [ ] When an expense's end year passes, spending simply drops (freed money flows through the normal savings split — no special flag)
- [ ] Deductible-flagged expenses feed the Tax tab (US-005)
- [ ] All numbers hand-verified on one sample year

### US-003: Global inflation + per-row overrides
**Description:** As a user, I want one editable global inflation % with per-row override, so I can model deflation-proof rent or fast-growing medical costs.
**Acceptance Criteria:**
- [ ] Inputs tab: global inflation % (yellow editable cell)
- [ ] Income + Expenses rows: Growth override % blanks to "use global"
- [ ] Simulation uses the effective rate per row per year

### US-004: Simulation runs on Income + Expenses tabs
**Description:** As a user, I want the 50-year simulation to consume the granular rows instead of single income/expense inputs.
**Acceptance Criteria:**
- [ ] Per-year aggregates: income = sum of active income rows, spending = sum of active expense rows
- [ ] From the retirement year, spending = desired retirement monthly spend (Inputs), inflation-adjusted, plus any expense rows still active after retirement
- [ ] Wallet model unchanged: EF ~1.5% capped at N months (overflow → investments), goal savings, non-tax ~7%, ThaiESG/RMF ~7%; yearly split % across wallets
- [ ] Withdrawals drain EF → goals → non-tax → ThaiESG/RMF; "Unmet spend" column still flags the year money runs out
- [ ] v1 simplifications updated in README (bilingual): nominal averages, EF target uses today's expenses, tax = effective rate of current year applied to working years

### US-005: Deductible expenses link into Tax
**Description:** As a user, I want deductible expenses (e.g. mortgage interest) to flow into the TH 2026 tax calc automatically.
**Acceptance Criteria:**
- [ ] Tax tab reads deductible-flagged expense rows for the tax year
- [ ] Applies the correct TH cap per category (e.g. mortgage 100k); over-cap overflow ignored and visible
- [ ] Tax tab still shows bracket math and final balance vs withheld as today

### US-006: Tax optimizer — ThaiESG/RMF recommended contribution
**Description:** As a user, I want the sheet to tell me how much ThaiESG/RMF to contribute this year so tax benefit is worth it — and no more.
**Acceptance Criteria:**
- [ ] Dropdown on Tax tab: cutoff marginal rate 5% / 10% / 15% (default 15%)
- [ ] Recommended amount = contribute while each extra baht's marginal saving ≥ cutoff, capped by ThaiESG 200k, RMF ≤ 30% of income, combined 500k (ThaiESG+RMF+PF)
- [ ] Shows "Tax saved this year: ฿N" for the recommended amount
- [ ] User can type their own amount instead; optimizer stays advisory (never forces)

### US-007: Real-return comparison (ThaiESG/RMF vs taxable S&P 500)
**Description:** As a user, I want to see the real after-tax outcome of the tax-advantaged contribution vs just buying S&P 500 in a taxable account.
**Acceptance Criteria:**
- [ ] Headline: "฿C in ThaiESG/RMF becomes ฿X at 60 vs ฿Y in taxable S&P — gap ฿X−Y" (tax saving reinvested so the comparison is fair)
- [ ] Expandable table: per contribution year, value at 60 on both paths, year by year
- [ ] MVP assumption (documented): ThaiESG + RMF redemption is tax-free; fund rate = Inputs (~7% editable), S&P path nets annual tax drag
- [ ] Note in README: post-MVP supports withdrawals before the tax-free holding date

### US-008: SSF is dead — ThaiESG only
**Description:** As a user, I see ThaiESG (the current scheme), not SSF (discontinued).
**Acceptance Criteria:**
- [ ] Sheet renamed everywhere: wallet labels, tax tab rows, README (ThaiESG 200k cap, min 100k first year noted)

### US-009: Summary tab — 2 minimal sections
**Description:** As a user, I open Summary and get only the necessary answers, in two sections — no wall of numbers.
**Acceptance Criteria:**
- [ ] Section 1 (long-term): (a) money runs out in year X, (b) retirement verdict at target age, (c) max monthly spend sustainable forever, (d) goal checks
- [ ] Section 2 (this year): tax saved ฿N, recommended ThaiESG/RMF contribution ฿N
- [ ] Goal checks need goal rows on Inputs: name, target amount (today's money), target year (e.g. house 2031, tuition 2035); verdict = on track / short ฿Z at that year
- [ ] Existing charts stay: stacked wallet area + income/expense/tax columns
- [ ] Nothing else added — every extra metric needs a reason to exist

### US-010: Retirement checker
**Description:** As a user, I want to type a retirement year and instantly see if it works.
**Acceptance Criteria:**
- [ ] One editable year cell + instant verdict: green "funded until Y" / red "short by ฿Z"
- [ ] Lives on Summary (section 1 area); changing it re-reads the simulation without touching other inputs

## 4. Functional Requirements

- FR-1: Income and Expenses are row-per-period tables; discrete changes = new row; same name/type may repeat with different periods.
- FR-2: Growth modes: Inflation (global %, per-row override) or Fixed (0%). Effective rate per row per year.
- FR-3: Simulation year = sum of active rows; retirement-year spending switches to desired retirement spend + still-active expense rows.
- FR-4: Wallets: Emergency fund (cap = N months of expenses, overflow → investments), Goal savings, Non-tax investments, ThaiESG/RMF tax-advantaged. Yearly split % on Inputs.
- FR-5: Tax optimizer: cutoff dropdown (5/10/15%), ThaiESG 200k cap, RMF ≤ 30% income, combined 500k; output = recommended amount + tax saved ฿N; advisory only.
- FR-6: Real-return compare: ThaiESG/RMF path (tax-free exit in MVP) vs taxable S&P 500 path with tax saving reinvested; headline + per-year table.
- FR-7: Summary = exactly 2 sections: long-term (runs out year X / retirement verdict / max forever spend / goal checks) and this-year (tax saved, recommended contribution).
- FR-8: Retirement checker: one editable year, instant funded-until / short-by verdict.
- FR-9: Deductible-flagged expenses feed the TH tax calc under per-category caps.

## 5. Non-Goals

- No Apps Script — pure formulas only.
- No scenario toggles (app-only at MLP; OQ-4).
- No real exit-tax modeling (post-MVP: withdrawal before the tax-free allowance date).
- No SSF modeling — ThaiESG only.
- No US tax user-facing (US engine stays hidden in code).

## 6. Design Considerations

- Yellow cells = only editable cells; bilingual README; tabs lean: README, Inputs, Income, Expenses, Tax, Simulation, Summary.
- Sheet rebuild scripts live in /opt/data/scripts (idempotent full-rewrite, /opt/data/.gws-venv/bin/python); re-run safely after fixes.

## 7. Success Metrics

- All formulas hand-verified on sample years.
- Prame answers his own 3 headline questions + this-year tax saved in < 5 minutes.
- Sheet loads < 3s.

## 8. Open Questions (MVP-relevant)

- OQ-2: Retirement-year spending — desired spend overrides rows entirely, or only fills the gap where rows end? (PRD assumes desired spend + still-active rows; confirm on real numbers.)
- OQ-3: Goal wallets — one shared goal-savings wallet with per-goal rows (assumed) vs separate wallet per goal?
- OQ-4: Simplified scenario toggles in the sheet too, or app-only?
- OQ-5: Exact ThaiESG holding rules (min 100k year one, tax-free holding period) — confirm rule text when modeling precisely (post-MVP).
