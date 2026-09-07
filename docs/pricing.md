# Pricing & Monetization Model

Status: agreed with Prame 2026-09-06 (Discord discussion); revised same day after review (Revision 2); **revised again 2026-09-07 — Revision 3 below is the current model** (yearly subscription; supersedes the one-time SKUs). This file is the source of truth for pricing.

FX note: billing currency is ฿ (THB). USD figures here (~$15 per ฿500, ~$49 per ฿1,499, and Revision 3's $99/$9.99) are Prame's stated prices/conversions, not a fixed FX policy — display prices are set in THB (THB figures TBD, Revision 3 open decisions).

## Revision 3 (2026-09-07) — yearly subscription, supersedes the one-time SKUs

Decisions from Prame (Discord, 2026-09-07), superseding Revisions 1–2 where they conflict:

1. **$99 per year.** The product is a yearly subscription, AI included. One-time SKUs are retired: no ฿500 credit packs and no 1M-token starter grant — the 7-day trial replaces it (closes the "starter credit expiry TBD" item from Revision 2). Whether a free core app survives alongside the $99 plan is open decision 1.
2. **Included AI credits: 30,000/month, accumulation cap 100,000.** Unused credits roll over month to month; the balance never exceeds 100,000 (cap mechanic — forfeit-at-grant — is our interpretation, confirm). Metering stays per-model — stronger models burn credits faster.
3. **Top-up: $9.99 → 30,000 credits.** Repeatable. Recommended: top-ups are exempt from the 100k cap (they were paid for) — open decision below.
4. **No BYOK.** Supersedes Revision 2 §2: bring-your-own-key is removed entirely. All AI usage runs on included/top-up credits.
5. **MCP is metered cheaper than web.** MCP tool calls consume credits at a discount vs. driving the model in the web app (steers planning into the agent surface). Multiplier TBD.
6. **7-day free trial.** New accounts get the full product free for 7 days. Launch UX is manual (PromptPay era); card-checked self-serve trials wait for the payment gateway. Not specified by Prame — working assumptions, see open decision 8: the trial includes a 30,000-credit grant, and it's one trial per person.

Economics note: at the top-up rate ($9.99 / 30,000 credits on the same 1 credit ≈ 1k raw-token baseline as old SKU 1 ≈ $0.33/M tokens), the included credits amortize to ≈ $8.25/month. Profitable on flash-class metering; the 100k cap plus per-model metering bounds frontier-model exposure.

### Open decisions (owner: Prame, before MLP launch)

1. What the subscription gates — written here as: $99/yr gates the whole product and the trial is the only free access. Alternative: core app stays free, $99/yr is the AI plan. Confirm.
2. THB display prices for $99/yr and $9.99 (suggested ฿3,490/yr and ฿349). Billing stays THB-first per the FX note.
3. Do top-up credits count against the 100k cap? (Recommended: no.)
4. MCP discount multiplier (suggested 0.5× the web rate).
5. Post-trial state for non-payers: read-only + plan export, or full lockout?
6. Advisor seats (old SKU 2) under the subscription: keep ฿1,499 seat packs, fold the advisor workspace into a higher tier, or drop the SKU. Unchanged until re-decided.
7. Credit balance on lapse: freeze until renewal, or zero out?
8. Trial details: does the trial include the 30,000-credit grant, and is it one trial per person? (Working assumption: both yes.)
9. Renewal mechanics under manual PromptPay: how is the year-2 $99 collected — reminder flow, or gateway first?

Everything below this section is the Revision 1–2 record, kept for history. Where it conflicts with Revision 3, Revision 3 wins.

## Revision 2 (2026-09-06, later same day)

Decisions from Prame that supersede parts of this file:

1. **Starter credits replace free-developer AI.** Every new account gets 1M tokens (≈1,000 credits ≈ 3% of a pack) free at signup — for onboarding and feeling the product. No developer verification exists; OQ-6 (prd-mlp.md) is closed. Bot-farm guard: one starter grant per person (dedupe on signup identity).
2. **BYOK has no purchase requirement.** BYOK is free for anyone — it was never a pack-buyer segment. The ฿500 pack exists for convenience (no key management), not as a gate.
3. **AI usage billing in orgs:** the advisor can set per-client usage: capped, disabled, or no-limit. MLP ships WITHOUT the cap control (post-MLP); until it ships, AI always bills the client's own credits.
4. **Plans belong to the client, never the advisor.** On separation, the client keeps their plan. Exit path: export plan to Google Sheet.

## Design rationale (why one-time)

- Thai market: PromptPay culture, real subscription fatigue. A ฿500 impulse buy converts; a monthly plan does not.
- Everyone gets a free AI taste (starter credits) — try before buy beats verification systems.
- Some users only plan once; one-time matches that reality better than recurring billing.
- Each SKU has a different buyer: credits sell to anyone who wants AI; seats sell to advisors. Sell credits first to consumers, seats when the person is an advisor. A good advisor eventually buys both (1,499 + several 500s = real revenue per payer).

## Free tier

| Who | What they get free |
|---|---|
| Every account | Full core app: manual simulation, tax, charts + starter AI: 1M tokens at signup (onboarding/try-before-buy; one grant per person) |
| Advisors | 2 client seats, free forever |

**Non-recyclable rule (critical):** the 2 free seats are a lifetime total, not concurrent slots. Deleting/archiving a client does NOT free a slot. If free seats were recyclable, nobody would ever pay.

## SKU 1 — AI credits

- ฿500 (~$15) one-time → 30,000 credits (~30M tokens).
- Starter: every signup gets 1M tokens free (≈3% of a pack) — enough to feel the AI, not enough to finish a real plan.
- Repeatable: buy again anytime at the same price.
- Expiry: 12 months from purchase (credits must expire; seats must not — only credits have a carrying cost). Starter credits: TBD whether they expire — decide before MLP launch (tracked in this file; the only remaining open pricing decision).
- BYOK: bring your own key, free for anyone, no purchase required (Revision 2). Techs BYOK; everyone else buys packs for convenience.
- Metering: credits are metered per model, not raw tokens — stronger models burn credits faster (same pattern as OpenCode Go meter rates). $15 for 30M raw tokens = $0.50/M: profitable on flash models, underwater on frontier models if metered flat.
- Marketing sells outcomes, not tokens: starter grant = "ทดลองใช้ AI ฟรี" (TH) / "Try AI free" (EN); packs = "≈500 AI chats + 50 plan analyses" (EN) / "แชท AI ≈500 ครั้ง + วิเคราะห์แผน ≈50 ครั้ง" (TH) — never "30M tokens".

## SKU 2 — Advisor seats

Phase: seats attach to the **advisor workspace** (multi-client management), which lands in Phase 3 (prd-post-mlp.md §3). Do not sell seat packs before that surface exists — this SKU is priced and agreed now, sold when the phase triggers.

- ฿1,499 (~$49) one-time → +3 client seats (on top of the 2 free).
- Repeatable: buy another pack when you fill it. Same per-seat price as the earlier ฿500/1-seat idea — this is a pack-size change, not a price change.
- No expiry (no carrying cost).
- Paid seats follow the same non-recyclable rule as the 2 free seats: every seat ever granted (free or paid) is a lifetime total per account. Deleting/archiving a client never frees a slot — otherwise repeat purchases stop signaling real advisor growth.
- Seat = the client's own account: client signs up and accepts an invite into the advisor's organization in the **customer** role (Revision 2 — decided over the client-record alternative). Advisor pays for engagement: the client actually opens the app. Organization later doubles as the white-label workspace.
- AI usage inside the org: advisor can set per-client cap / disable / no-limit — post-MLP (Revision 2). Until that control ships, AI always bills the client's own credits (starter grant or purchased pack).
- Plan ownership: plans belong to the client, never the advisor. If they part ways, the client keeps their plan; exit path = export plan to Google Sheet (Phase 3 at the latest — must exist when seats exist).
- ฿1,499 crosses the Thai impulse-buy line (฿500 → consideration level). Accepted: advisors already get more value than that from one client; real buyers won't flinch. If adoption is slow, add a ฿500/1-seat backfill option — do NOT launch both at once.
- No bundle: seat purchase includes no credits; credits include no seats. Two clean SKUs, zero cross-discounts, no "why didn't I get X" tickets.

## SKU naming (user-facing, bilingual)

- SKU 1: `เครดิต AI` / "AI credits" — tagline: "จ่ายครั้งเดียว ใช้ AI ทำแผนได้เลย" / "Pay once, plan with AI".
- SKU 2: `ที่นั่งลูกค้า +3` / "+3 client seats" — tagline: "จ่ายครั้งเดียว เพิ่มลูกค้าได้อีก 3 คน ตลอดไป" / "Pay once, add 3 more clients forever". (ลูกค้า = the client's own account, invited into the advisor's organization — see SKU 2.)

## Payments (launch)

- Manual first: PromptPay transfer to Prame → manual activation. The first ~10 sales are sales conversations anyway (Prame IS sales). Add a gateway when volume gets annoying.
- White-label / SSO / custom branding: contact sales (Prame), custom pricing — Phase 3 (prd-post-mlp.md §3), not self-serve.

## Funnel signal

Anyone who buys the seat pack more than once is a genuine advisor with 5+ clients — treat every repeat seat purchase as a white-label sales lead. Log them.

## Reconciliation

- **Revision 3 (2026-09-07) supersedes the one-time SKU model above** ($99/yr subscription, AI included, no BYOK, 7-day trial). The reconciliation lines below reflect Revision 2 and are historical.

- PRD overview "free for end users" now means: core app free, AI free to start (starter credits), then paid packs (this file).
- prd-mlp.md US-106 (AI surface) is where the purchase flow attaches: starter credits at signup, ฿500 pack purchase via manual PromptPay. OQ-6 closed by Revision 2 (no verification system).
- prd-post-mlp.md §3 white-label offer unchanged — this model feeds it (seat buyers = pipeline); §3 relabeled as the enterprise revenue phase since self-serve revenue now precedes it.
- Seat model = client org invites (customer role): see prd-post-mlp.md §3 when triggered. Usage caps + Google Sheet plan export are Phase 3 requirements from Revision 2.
- AGENTS.md product-context line updated to match this file.
