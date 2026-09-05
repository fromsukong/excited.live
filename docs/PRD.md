# PRD: excited.live — Financial Simulation (MVP + MLP)

Status: agreed with Prame 2026-09-05 (5 interview rounds). Supersedes the draft at /opt/data/excited-live-prd.md.

## 1. Introduction / Overview

excited.live is financial simulation software: "can I afford this life?" for Thai planners. Free for end users; revenue comes later from white-labeling to financial advisors (B2B2C).

Two phases, agreed 2026-09-05:
- **MVP = Google Sheet** (pure formulas, no Apps Script). The sheet proves the math and the UX. The sheet IS the spec — every tab ports 1:1 into the app later.
- **MLP = the web app** (Minimum Lovable Product). The real product: beautiful, bilingual, interactive — 10x the sheet experience.

Motto: "(I am) excited to live". FromSukong content funnels attention to excited.live.

## 2. Goals

- G1: MVP sheet answers the 3 headline money questions + tax savings, with granular income/expense modeling.
- G2: Every MVP simplification is documented in the sheet README (v1 assumptions).
- G3: MLP ports the proven sheet 1:1 into a lovable app: wizard onboarding, life-story chart, what-if sliders, scenario toggles, AI/MCP assist.
- G4: TH tax only, user-facing. US engine stays in code (hidden) for a future US expansion if TH succeeds.
- G5: Accounts + saved plans at MLP launch.

## 3. User Stories

### MVP — Google Sheet (upgrade of workbook 1g3q78km_mcGCUfQ6tDRuwj3RP8_VAhbm2pAQwaco3TU)

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
- [ ] No user-facing "SSF" text remains in the sheet

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

### MLP — the web app

### US-100: Accounts + saved plans
**Description:** As a user, I create an account and my plan saves, so I can come back to it.
**Acceptance Criteria:**
- [ ] Sign up / log in / log out; plan persists per account
- [ ] Loading a saved plan restores every input exactly
- [ ] Auth method: open question (OQ-1)

### US-101: Onboarding wizard
**Description:** As a new user, I answer a 5-minute guided flow (income, expenses, goals, retirement wish) instead of facing a raw input grid.
**Acceptance Criteria:**
- [ ] Wizard produces a complete plan; user lands on the life-story chart
- [ ] Every wizard answer is editable later in the full inputs
- [ ] Skippable steps with sensible TH defaults
- [ ] Verify in browser using dev-browser skill

### US-102: Life-story chart
**Description:** As a user, I see one beautiful chart of my whole life: wallets stacked over 50 years, income vs spend vs tax.
**Acceptance Criteria:**
- [ ] Interactive: hover a year → details; the design-system SVG primitives, Astryx-first
- [ ] Bilingual labels
- [ ] Verify in browser using dev-browser skill

### US-103: Plan editing + accept/reject proposals
**Description:** As a user, I edit inputs (registry-driven sections) and can accept or reject proposed plan changes (from AI or advisor) as diffs.
**Acceptance Criteria:**
- [ ] Editing recomputes the projection live (plan-service boundary)
- [ ] Proposals render as before/after diffs; nothing applies without explicit web acceptance
- [ ] Verify in browser using dev-browser skill

### US-104: Scenario toggles
**Description:** As a user, I turn plans on/off (buy condo, second kid, sabbatical year) and see the impact instantly.
**Acceptance Criteria:**
- [ ] Each plan block toggles independently; chart + headline answers update
- [ ] Toggles persist per saved plan
- [ ] Verify in browser using dev-browser skill

### US-105: What-if sliders
**Description:** As a user, I drag sliders (savings %, return %, retirement age) and watch the future move.
**Acceptance Criteria:**
- [ ] Slider change recomputes < 100ms (pure engines)
- [ ] Slider values are real inputs (saved with the plan)
- [ ] Verify in browser using dev-browser skill

### US-106: AI / MCP surface
**Description:** As an AI agent, I run trial simulations via MCP and propose plan changes; the user accepts on the web.
**Acceptance Criteria:**
- [ ] MCP trial simulation endpoint (read-only compute)
- [ ] Proposal = suggested diff; applying requires web acceptance (US-103 flow)
- [ ] AI assist helps users maintain the complex system (explain, suggest, never auto-apply)

### US-107: Tax optimizer + real-return in the app
**Description:** As a user, the app shows the same ThaiESG/RMF recommendation and real-return comparison as the sheet, computed by packages/tax + packages/sim.
**Acceptance Criteria:**
- [ ] Cutoff dropdown, recommended amount, tax saved ฿N
- [ ] Real-return headline + expandable per-year table
- [ ] Numbers match the sheet within rounding on the same inputs

### US-108: Bilingual EN/TH
**Description:** As a Thai user, the app is fully in Thai; EN default, EN/ไทย toggle.
**Acceptance Criteria:**
- [ ] All strings via packages/i18n dictionaries ({en, th} single source)
- [ ] SSR locale = cookie → Accept-Language → 'en'; no hydration mismatch

### US-109: US engine hidden
**Description:** As a developer, the US tax engine stays registered in code but is never offered to users.
**Acceptance Criteria:**
- [ ] UI exposes TH only; registry keeps US for future expansion
- [ ] No US user path in wizard, inputs, or tax tab

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
- FR-10: MLP: accounts + saved plans; onboarding wizard; life-story chart; registry-driven editing; proposal accept/reject on web; scenario toggles; what-if sliders; MCP trial-sim; TH-only tax (US hidden); EN/TH.
- FR-11: Engines stay pure TS (no network/DOM/date); sheet tabs port 1:1 to app modules; plan-service is the single backend boundary.

## 5. Non-Goals

- No corporate tax (possible future module).
- No brokerage/account execution — planning only.
- No Apps Script in the MVP sheet — pure formulas only.
- No SSF product modeling — discontinued; ThaiESG only.
- No US user-facing tax at MVP or MLP (engine exists, hidden).
- No native mobile app — responsive web only; mobile surface is post-MLP.
- No real exit-tax modeling in MVP (post-MVP: withdrawal before tax-free allowance date).
- No white-label features yet (Phase 3, after MLP proves out).

## 6. Design Considerations

- Sheet: yellow cells = only editable cells; bilingual README; keep tabs lean (README, Inputs, Income, Expenses, Tax, Simulation, Summary).
- App: Astryx-first (@astryxdesign/core); custom components only in packages/design-system gaps. Raw HTML banned in apps/webapp/src.
- Onboarding wizard ships first among the lovable features (US-101 before polish on others).
- For design changes: show screenshot options first; Prame picks visually.

## 7. Technical Considerations

- MVP sheet rebuild scripts live in /opt/data/scripts (idempotent full-rewrite pattern, /opt/data/.gws-venv/bin/python); enhance script re-run safely after fixes.
- Existing assets to reuse: packages/tax (TH 2026 engine + allowanceDefs contract), packages/i18n, apps/tax-webapp, projection MVP branch (feat/mvp-projection), plan-service mock boundary.
- Sheet is the spec: Tax tab ↔ packages/tax surface, Simulation tab ↔ packages/sim (to be created), Income/Expenses rows ↔ input schemas.
- CI builds workspace deps before the webapp (`pnpm --filter @excited-live/webapp^... build`).
- TS package still says "SSF" — code naming can lag; sheet + UI must say ThaiESG from now on.

## 8. Success Metrics

- MVP: all formulas hand-verified on sample years; Prame answers his own 3 headline questions + this-year tax saved in < 5 minutes; sheet loads < 3s.
- MLP: % of visitors who finish the wizard and see their chart (activation); D7 return rate; simulations completed per user; advisor pilot signups (Phase 3 readiness).
- Engine correctness: independent recompute (different model/script) matches on golden cases.

## 9. Open Questions

- OQ-1: Auth method for MLP accounts (email/password vs Google OAuth)?
- OQ-2: Retirement-year spending rule — desired spend overrides rows entirely, or only fills the gap where rows end? (PRD assumes desired spend + still-active rows; confirm on real numbers.)
- OQ-3: Goal wallets — one shared goal-savings wallet with per-goal rows (PRD assumption) vs separate wallet per goal (v2 list)?
- OQ-4: Scenario toggles stay app-only (MLP) or also a simplified version in the sheet MVP?
- OQ-5: ThaiESG real holding rules (min 100k year one, tax-free holding period) — model exactly post-MVP; confirm the exact rule text when implemented.
