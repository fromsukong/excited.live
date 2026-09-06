# PRD — MLP (Web App)

Phase 2. The Minimum Lovable Product: the proven sheet, ported 1:1 and made beautiful. Trigger to start: MVP sheet validated (see prd-mvp.md).

## 1. Overview

The real product. Accounts, a 5-minute onboarding wizard, a life-story chart, instant what-if sliders, scenario toggles, and an AI surface that proposes but never applies. TH tax only, user-facing; US engine stays in code, hidden.

## 2. Goals

- G1: Port the proven sheet 1:1 into the app (tax engine ↔ packages/tax, sim ↔ packages/sim).
- G2: Lovable: wizard onboarding first, then chart polish, sliders, toggles.
- G3: Accounts + saved plans at launch.
- G4: TH-only user-facing tax; US engine hidden for future expansion.
- G5: EN/TH bilingual from day one.

## 3. User Stories

### US-100: Accounts + saved plans
**Description:** As a user, I create an account and my plan saves, so I can come back to it.
**Acceptance Criteria:**
- [ ] Sign up / log in / log out; plan persists per account
- [ ] Loading a saved plan restores every input exactly
- [ ] Auth method: open question (OQ-1)

### US-101: Onboarding wizard (ships first)
**Description:** As a new user, I answer a 5-minute guided flow (income, expenses, goals, retirement wish) instead of facing a raw input grid.
**Acceptance Criteria:**
- [ ] Wizard produces a complete plan; user lands on the life-story chart
- [ ] Every wizard answer is editable later in the full inputs
- [ ] Skippable steps with sensible TH defaults
- [ ] Verify in browser using dev-browser skill

### US-102: Life-story chart
**Description:** As a user, I see one beautiful chart of my whole life: wallets stacked over 50 years, income vs spend vs tax.
**Acceptance Criteria:**
- [ ] Interactive: hover a year → details; design-system SVG primitives, Astryx-first
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

- FR-10: Accounts + saved plans; onboarding wizard; life-story chart; registry-driven editing; proposal accept/reject on web; scenario toggles; what-if sliders; MCP trial-sim; TH-only tax (US hidden); EN/TH.
- FR-11: Engines stay pure TS (no network/DOM/date); sheet tabs port 1:1 to app modules; plan-service is the single backend boundary.
- FR-12: Wizard ships before polish on other lovable features.

## 5. Non-Goals

- No native mobile (post-MLP; see prd-post-mlp.md).
- No white-label features (Phase 3).
- No US user-facing tax.
- No real exit-tax modeling (post-MVP backlog).

## 6. Design Considerations

- Astryx-first (@astryxdesign/core); custom components only in packages/design-system gaps; raw HTML banned in apps/webapp/src.
- Design changes: show screenshot options first; Prame picks visually.
- Onboarding wizard ships first (US-101 before polish on others).

## 7. Technical Considerations

- Existing assets: packages/tax (TH 2026 engine + allowanceDefs contract), packages/i18n, apps/tax-webapp, projection MVP branch (feat/mvp-projection), plan-service mock boundary.
- packages/sim to be created from the sheet's Simulation tab.
- CI builds workspace deps before the webapp (`pnpm --filter @excited-live/webapp^... build`).

## 8. Success Metrics

- Activation: % of visitors who finish the wizard and see their chart.
- D7 return rate; simulations completed per user.
- Numbers match the sheet within rounding on the same inputs.

## 9. Open Questions (MLP-relevant)

- OQ-1: Auth method — email/password vs Google OAuth?
- OQ-6: Monetization gate for AI (US-106) — per docs/pricing.md: AI features unlock after a one-time ฿500 credit pack OR verified-developer free AI. Open sub-questions: developer verification mechanism (GitHub account or equivalent — must resist fake verification from paying users), and the credit-purchase UX (manual PromptPay at launch).
