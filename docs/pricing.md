# Pricing & Monetization Model

Status: agreed with Prame 2026-09-06 (Discord discussion). Two one-time-pay SKUs, no subscriptions. This file is the source of truth for pricing; it supersedes the earlier "everything is free until white-label" stance while keeping the core app free.

FX note: billing currency is ฿ (THB). USD figures here (~$15 per ฿500, ~$49 per ฿1,499) are Prame's stated conversions, not a fixed FX policy — display prices are set in THB only.

## Design rationale (why one-time)

- Thai market: PromptPay culture, real subscription fatigue. A ฿500 impulse buy converts; a monthly plan does not.
- Developers are terrible customers (we are one) — free for them, verified.
- Some users only plan once; one-time matches that reality better than recurring billing.
- Each SKU has a different buyer: credits sell to anyone who wants AI; seats sell to advisors. Sell credits first to consumers, seats when the person is an advisor. A good advisor eventually buys both (1,499 + several 500s = real revenue per payer).

## Free tier

| Who | What they get free |
|---|---|
| End users | Full core app: manual simulation, tax, charts — no AI |
| Developers | Free AI via verified developer account (verification mechanism TBD: GitHub account or equivalent — must be real, or paying users will fake it) |
| Advisors | 2 client seats, free forever |

**Non-recyclable rule (critical):** the 2 free seats are a lifetime total, not concurrent slots. Deleting/archiving a client does NOT free a slot. If free seats were recyclable, nobody would ever pay.

## SKU 1 — AI credits

- ฿500 (~$15) one-time → 30,000 credits (~30M tokens).
- Repeatable: buy again anytime at the same price.
- Expiry: 12 months from purchase (credits must expire; seats must not — only credits have a carrying cost).
- BYOK: bring your own key supported **after** the entry purchase — BYOK is not a way around the ฿500 entry pack; it only replaces repeat credit packs. (Devs skip the entry pack entirely via free verified-developer AI; see Free tier.) Techs BYOK after entry, everyone else buys packs.
- Metering: credits are metered per model, not raw tokens — stronger models burn credits faster (same pattern as OpenCode Go meter rates). $15 for 30M raw tokens = $0.50/M: profitable on flash models, underwater on frontier models if metered flat.
- Marketing sells outcomes, not tokens: "≈500 AI chats + 50 plan analyses", never "30M tokens".

## SKU 2 — Advisor seats

Phase: seats attach to the **advisor workspace** (multi-client management), which lands in Phase 3 (prd-post-mlp.md §3). Do not sell seat packs before that surface exists — this SKU is priced and agreed now, sold when the phase triggers.

- ฿1,499 (~$49) one-time → +3 client seats (on top of the 2 free).
- Repeatable: buy another pack when you fill it. Same per-seat price as the earlier ฿500/1-seat idea — this is a pack-size change, not a price change.
- No expiry (no carrying cost).
- Paid seats follow the same non-recyclable rule as the 2 free seats: every seat ever granted (free or paid) is a lifetime total per account. Deleting/archiving a client never frees a slot — otherwise repeat purchases stop signaling real advisor growth.
- Seat = a client record in the advisor's account. OPEN QUESTION: whether seats should become client logins (client gets their own account). Client-login seats are more valuable (advisor pays for engagement — the original B2B2C pitch) and might justify a different pricing shape then; that is a future decision, explicitly out of scope of the one-time-pay principle agreed here. Ask customers.
- ฿1,499 crosses the Thai impulse-buy line (฿500 → consideration level). Accepted: advisors already get more value than that from one client; real buyers won't flinch. If adoption is slow, add a ฿500/1-seat backfill option — do NOT launch both at once.
- No bundle: seat purchase includes no credits; credits include no seats. Two clean SKUs, zero cross-discounts, no "why didn't I get X" tickets.

## SKU naming (user-facing, bilingual)

- SKU 1: `เครดิต AI` / "AI credits" — tagline: "จ่ายครั้งเดียว ใช้ AI ทำแผนได้เลย" / "Pay once, plan with AI".
- SKU 2: `ที่นั่งลูกค้า +3` / "+3 client seats" — tagline: "จ่ายครั้งเดียว เพิ่มลูกค้าได้อีก 3 คน ตลอดไป" / "Pay once, add 3 more clients forever". (ลูกค้า here = client records in the advisor's account, per the open question above.)

## Payments (launch)

- Manual first: PromptPay transfer to Prame → manual activation. The first ~10 sales are sales conversations anyway (Prame IS sales). Add a gateway when volume gets annoying.
- White-label / SSO / custom branding: contact sales (Prame), custom pricing — Phase 3 (prd-post-mlp.md §3), not self-serve.

## Funnel signal

Anyone who buys the seat pack more than once is a genuine advisor with 5+ clients — treat every repeat seat purchase as a white-label sales lead. Log them.

## Reconciliation

- PRD overview "free for end users" now means: core app free, AI paid (this file).
- prd-mlp.md US-106 (AI surface) is where the credit purchase + free-developer flow attach: gate is "buy SKU 1 or verify as developer" before AI features unlock. Added as OQ-6 there.
- prd-post-mlp.md §3 white-label offer unchanged — this model feeds it (seat buyers = pipeline); §3 relabeled as the enterprise revenue phase since self-serve revenue now precedes it.
- Dev-free AI needs a verification decision before MLP launch: tracked as OQ-6 (see prd-mlp.md).
- AGENTS.md product-context line updated to match this file.
