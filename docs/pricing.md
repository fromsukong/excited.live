# Pricing & Monetization Model

Status: agreed with Prame 2026-09-06 (Discord discussion); revised same day after review (Revision 2); **revised again 2026-09-07 — Revision 3 below is the current model** (yearly subscription; supersedes the one-time SKUs). This file is the source of truth for pricing.

FX note: billing currency is ฿ (THB). USD figures here (Revision 3's $109/$9.99/$59/$599) are Prame's stated prices, not a fixed FX policy — display prices are set in THB (฿349 credit pack approved; other THB figures TBD, Open decision 6).

## Revision 3 (2026-09-07) — yearly subscription, supersedes the one-time SKUs

Decisions from Prame (Discord, 2026-09-07), superseding Revisions 1–2 where they conflict:

1. **$109 per year** (raised from $99 later the same day). The product is a yearly subscription, AI included. One-time SKUs are retired: no ฿500 credit packs and no 1M-token starter grant — the 7-day trial replaces it (closes the "starter credit expiry TBD" item from Revision 2). Confirmed same day: the subscription gates the WHOLE app — the trial is the only free access (see Resolved 1).
2. **Personal AI is unlimited** (updated later the same day from 30,000 credits/month + 100k cap — Prame: "remove general ai credit, said unlimited"). No credit metering, no accumulation cap, no top-ups on the personal plan; unlimited covers web + MCP. Fair-use/abuse guard TBD — unlimited must not mean unbounded frontier-model spend (Open decision 1).
3. **Credit top-ups move to the Advisor tier:** $9.99 → 30,000 credits, repeatable (personal has none — AI is unlimited there). Same-day context: top-up credits do NOT count against any accumulation cap — they stack on top of included allowance.
4. **No BYOK on personal** — unchanged from the first Revision 3 pass. BYOK returns as an ADVISOR-tier option (see Advisor tier): advisors connect their own model keys, or buy credit packs.
5. **MCP metering: moot for personal** (unlimited AI covers web + MCP). For advisor credit-based usage, the cheaper-MCP discount idea is parked — metering model TBD (Open decision 4).
6. **7-day free trial.** New accounts get the full product free for 7 days. Launch UX is manual (PromptPay era); card-checked self-serve trials wait for the payment gateway. With unlimited personal AI, the old 30k-grant question is void; remaining assumption: one trial per person (Open decision 5).

Economics note (after the unlimited switch): personal AI is flat $109/yr (~$9.08/mo) with no metering — the credit-amortization math no longer applies to personal. Cost control moves to the fair-use policy and default model choice; flash-class usage stays comfortably profitable, unbounded frontier usage is the risk. Advisor AI stays metered (BYOK or credits), so advisor AI cost falls on the advisor. Historical: at the credit-era rate, $9.99/30k credits ≈ $0.33/M raw tokens.

### Resolved (2026-09-07, same day — Prame's answers to the first open list)

1. What the subscription gates: **the whole app**. The 7-day trial is the only free access — no free core tier.
2. THB display prices: **฿3,490/year, ฿349 top-up** were approved — but the base price then moved $99 → $109 (unlimited AI), so the subscription THB needs re-approval (Open decision 6); ฿349 still fits the advisor credit pack.
3. Top-ups vs the cap: **top-up credits do NOT count against any accumulation cap** — they stack on top of included allowance. (Now advisor-tier-only; the personal cap itself was removed with unlimited AI.)
4. Post-trial / post-lapse: **no active subscription = no access** ("after, if no subscription, done").
5. Old SKU 2 (฿1,499 seat packs): **replaced by the Advisor tier** below (price later updated to $59/mo / $599/yr).

### Advisor tier (replaces old SKU 2)

- **$59/month or $599/year** (raised later the same day from $49/$499). Monthly billing is offered deliberately: it's an advisor product and churn is expected to be low (Prame: "have month since it's an advisor tier, I don't expect high churn").
- **5 client seats included** (full seats, unlimited duration) **+ unlimited trial client seats**: prospect accounts whose data-access window is 30 days — the advisor's demo/funnel surface. Access ends at day 30.
- **+$9.99/month per additional long-term client seat** beyond the included 5.
- **Advisor AI: BYOK or credits.** Either connect their own model keys (BYOK, no purchase required) or buy credit packs ($9.99 = 30,000 credits). Prame's allowance figure: "the token is 100,000 per month" — clarify whether that's the included monthly allowance or the accumulation cap carried over (Open decision 2).
- Supersedes Revision 1–2's ฿1,499 one-time seat packs and the 2-free-lifetime-seats concept (both belong to the retired model).
- Advisor workspace itself remains Phase 3 (prd-post-mlp.md §3) — the tier is priced and agreed now, sold when the surface ships (same phase-gating rule as old SKU 2).

### Open decisions (remaining; owner: Prame)

1. Personal unlimited AI — fair-use policy: rate limits? default models? what stops one user burning frontier tokens all month? (Recommended: soft fair-use cap + flash-class default.)
2. Advisor AI allowance: is "the token is 100,000 per month" the included monthly allowance or the accumulation cap carried over? And can one org mix BYOK and credits?
3. Advisor client AI billing: do invited clients need their own $109 plan, or does their usage ride the advisor's BYOK/credits?
4. Advisor credit metering details: per-model rates, and is cheaper-MCP still wanted?
5. Trial details: one trial per person (assumed); does the 7-day trial apply to the advisor tier too?
6. THB display prices: $109/yr subscription (฿3,890 suggested), $59/mo (฿2,090 suggested), $599/yr (฿21,090 suggested), $9.99/mo seat add-on, ฿349 credit pack (approved) — confirm.
7. Renewal mechanics under manual PromptPay: how is year-2 collected ($109 consumer, $599 advisor)?
8. Naming: two different $9.99 SKUs now exist (monthly extra seat vs 30k credit pack) — ticket bait; consider distinct prices.

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

- **Revision 3 (2026-09-07) supersedes the one-time SKU model above** ($99/yr subscription, AI included, no BYOK, 7-day trial; Advisor tier $499/yr or $49/mo). The reconciliation lines below reflect Revision 2 and are historical.

- PRD overview "free for end users" now means: core app free, AI free to start (starter credits), then paid packs (this file).
- prd-mlp.md US-106 (AI surface) is where the purchase flow attaches: starter credits at signup, ฿500 pack purchase via manual PromptPay. OQ-6 closed by Revision 2 (no verification system).
- prd-post-mlp.md §3 white-label offer unchanged — this model feeds it (seat buyers = pipeline); §3 relabeled as the enterprise revenue phase since self-serve revenue now precedes it.
- Seat model = client org invites (customer role): see prd-post-mlp.md §3 when triggered. Usage caps + Google Sheet plan export are Phase 3 requirements from Revision 2.
- AGENTS.md product-context line updated to match this file.
