# Pricing & Monetization Model

Status: agreed with Prame 2026-09-06 (Discord discussion). Two one-time-pay SKUs, no subscriptions. This file is the source of truth for pricing; it supersedes the earlier "everything is free until white-label" stance while keeping the core app free.

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
- BYOK: bring your own key supported after the entry purchase. Techs BYOK, everyone else buys packs. BYOK users are convenience-only revenue — accepted.
- Metering: credits are metered per model, not raw tokens — stronger models burn credits faster (same pattern as OpenCode Go meter rates). $15 for 30M raw tokens = $0.50/M: profitable on flash models, underwater on frontier models if metered flat.
- Marketing sells outcomes, not tokens: "≈500 AI chats + 50 plan analyses", never "30M tokens".

## SKU 2 — Advisor seats

- ฿1,499 (~$49) one-time → +3 client seats (on top of the 2 free).
- Repeatable: buy another pack when you fill it. Same per-seat price as the earlier ฿500/1-seat idea — this is a pack-size change, not a price change.
- No expiry (no carrying cost).
- Seat = a client record in the advisor's account. OPEN QUESTION: whether seats should become client logins (client gets their own account). Client-login seats are more valuable (advisor pays for engagement — the original B2B2C pitch) and might justify monthly pricing then. Ask customers.
- ฿1,499 crosses the Thai impulse-buy line (฿500 → consideration level). Accepted: advisors already get more value than that from one client; real buyers won't flinch. If adoption is slow, add a ฿500/1-seat backfill option — do NOT launch both at once.
- No bundle: seat purchase includes no credits; credits include no seats. Two clean SKUs, zero cross-discounts, no "why didn't I get X" tickets.

## SKU naming (user-facing, bilingual)

- SKU 1: `เครดิต AI` / "AI credits" — "จ่ายครั้งเดียว ใช้ AI ทำแผนได้เลย"
- SKU 2: `เพิ่มลูกค้า 3 ที่` / "+3 client seats" — "จ่ายครั้งเดียว เพิ่มลูกค้าได้อีก 3 คน ตลอดไป"

## Payments (launch)

- Manual first: PromptPay transfer to Prame → manual activation. The first ~10 sales are sales conversations anyway (Prame IS sales). Add a gateway when volume gets annoying.
- White-label / SSO / custom branding: contact sales (Prame), custom pricing — Phase 3 (prd-post-mlp.md §3), not self-serve.

## Funnel signal

Anyone who buys the seat pack more than once is a genuine advisor with 5+ clients — treat every repeat seat purchase as a white-label sales lead. Log them.

## Reconciliation

- PRD overview "free for end users" now means: core app free, AI paid (this file).
- prd-post-mlp.md §3 white-label offer unchanged — this model feeds it (seat buyers = pipeline).
- Dev-free AI needs a verification decision before MLP launch: tracked as an open question.
