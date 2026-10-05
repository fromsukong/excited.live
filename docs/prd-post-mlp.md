# PRD — Post-MLP (Backlog)

Phase 3+. Trigger-based: nothing here starts until its trigger fires. Each item becomes a full PRD when triggered.

## 1. Real exit-tax modeling (trigger: MVP sheet live + users ask)

- ThaiESG/RMF withdrawals before the tax-free holding date get modeled exactly.
- MVP assumption (tax-free exit) is replaced; real-return compare shows both on-time and early-withdrawal paths.
- Confirm exact ThaiESG rule text (min 100k year one, holding period) — OQ-5.

## 2. Mobile surface (trigger: MLP activated + mobile traffic share proves demand)

- View/summarize first: headline answers, life-story chart, goal status.
- Minimal editing only; serious planning stays on web.
- Responsive web already exists at MLP; this is the dedicated lightweight surface.

## 3. White-label for advisors (trigger: first advisor pilot committed) — enterprise revenue phase

- Enterprise revenue phase: B2B2C — advisors/institutions pay for engagement, retention, trust. Self-serve revenue ($109/year subscriptions + the Advisor tier $59/mo or $599/yr, docs/pricing.md Revision 3) already precedes this phase. Every advisor-tier subscriber is a white-label sales lead.
- Pilot scope defined with the first advisor: branding, advisor dashboard, client management, export.
- Pricing Revision 2 requirements land here (docs/pricing.md): seats = client org invites (customer role), per-client AI usage control (cap / disable / no-limit), and plan export to Google Sheet — plans always belong to the client, never the advisor.
- Banks need vendor/contract/liability — service layer (hosting, updates, white-label setup), not code restriction.
- Brand moat: Apache-2.0 lets anyone clone code, nobody may use the excited.live name/logo.

## 4. US tax expansion (trigger: TH proves out + US demand signal)

- The US engine is already registered in code (hidden per prd-mlp.md US-109); this phase makes it real and user-facing.
- Real 2026+ schedules, federal + state consideration, wired into wizard + tax tab.
- Multi-country plans (TH + US cross-border) as the differentiator.

## 5. Corporate tax module (trigger: white-label customers need it)

- Possible future module alongside personal tax; scoped when an advisor pilot asks.

## 6. Per-goal wallets (trigger: users outgrow the shared goal wallet)

- One wallet per goal with its own target date and rules (v2 list from the original sheet).
- Supersedes the shared goal-savings wallet assumption (OQ-3) once triggered.

## 7. Public API & developer platform (trigger: MLP live + first external integration request)

- Goal: self-serve extension — a user's own AI or tool reads their plan and runs sims directly ("tell your AI to get it from excited.live"); no feature request needed to extend.
- Public v1 is curated, never a raw internal-endpoint export: (1) stateless compute — run sim/tax from posted params (grows the MLP MCP trial-sim contract, US-106); (2) read-your-own-data with scoped tokens. Everything else stays internal.
- One contract, several doors: MCP server (the headline "tell your AI" surface) + OpenAPI spec + docs + llms.txt — generated from one definition, versioned (/api/v1).
- Agent auth: scoped, revocable, audit-logged tokens (PDPA); advisor org roles enforced — a client's data never leaks across seats. Never session cookies.
- Writes stay proposal-based (US-103 invariant): no public endpoint mutates a plan; agents propose diffs, the user accepts on the web.
- Cost control: free stateless compute may be the public face; anything AI-backed sits behind the subscription + fair-use policy (pricing.md Open decision 1). Rate limits and quotas from day one.
- Two layers: the app's internal transport is not the public contract. The public surface is a thin versioned layer over plan-service (P3), so internal routes stay free to change. Security lives in auth + validation — the repo is public (Apache-2.0), obscurity was never on the table.
- Open: free public compute tier (distribution) vs fully gated — lean: compute free, plan data gated. Hard no's: plan-mutating public endpoints, metered endpoints for anonymous callers, wholesale "export all endpoints" dumps.

## Non-goals that stay non-goals

- No brokerage/account execution — planning only, every phase.
- No features without a trigger — backlog stays honest.
