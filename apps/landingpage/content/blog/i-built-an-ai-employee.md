---
title: I built an AI employee for the price of a coffee a month
date: 2026-09-11
description: Not a chatbot with a subscription — an always-on operator with memory, cron jobs, and its own terminal. How I set it up, what it actually does for me, and what it costs.
---

Most people who use AI rent a chatbot. You open a tab, type a question, read the answer, close the tab. The chatbot remembers nothing tomorrow, does nothing overnight, and never touches anything you own.

For the past few weeks I've been running something different on a tiny server: an agent with a terminal, a memory, a schedule, and its own opinions about my calendar. It is closer to hiring an employee than to subscribing to a chatbot. This post is the setup, the job description, and the payslip.

:::slide
![An employee, not a chatbot](/blog/hermes-talk/excited-app.png)

An employee, **not a chatbot.**
:::

## What it actually is

The product is [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — an agent framework that runs on your own machine and gets tools instead of a text box. That distinction sounds academic until you see it work:

- A chatbot *answers* questions. My agent *acts*: it runs shell commands, edits files, calls APIs, reads spreadsheets, sends messages.
- A chatbot *forgets*. The agent has persistent memory — it knows my timezone, my weight goal, my pricing decisions, which fonts I like, and that I hate being asked for numbers it can look up itself.
- A chatbot *waits*. The agent works on a schedule. Fifteen cron jobs run without me in the room, and a watchdog restarts the ones that fail.

The closest comparisons are coding-agent clouds like Cursor's or Claude Code's remote agents — those are genuinely useful, but they are rented hands for one job: code. What I wanted was a full-time operator across code, email, ops, and personal life, and that is a different category. It's the difference between a contractor you brief every morning and a coworker who was already here when you woke up.

:::slide
![Hermes Agent](/blog/hermes-talk/hermes-logo-card.png)

This is Hermes. **It works for me.**
:::

:::slide
![A chatbot answers, an agent acts](/blog/hermes-talk/img-cron.png)

A chatbot answers. An agent **acts.**
:::

:::slide
![It remembers tomorrow](/blog/hermes-talk/img-memory.png)

It **remembers** tomorrow.
:::

## The setup, minimum cost

There is no exotic infrastructure here. One small VPS with 4 GB of RAM runs the agent, its memory database, a handful of long-running helpers, and still has headroom.

:::slide
![One tiny server](/blog/hermes-talk/img-vps.png)

The setup: **one tiny server.**
:::

The real cost decision is the model, and there is a clean ladder:

| Option | What it is | Cost |
| --- | --- | --- |
| Ollama | fully local, open weights, zero privacy worries | $0 |
| OpenCode Go | flat subscription, generous agent quota | ~$6/mo |
| CommandCode | bring-your-own API keys, no markup | ~$20/mo |
| Claude Max | the premium lane, frontier models | ~$100/mo |

:::slide
![Ollama](/blog/hermes-talk/logos/brand-ollama.png)

**$0** to start. Fully local.
:::

:::slide
![OpenCode Go](/blog/hermes-talk/logos/brand-opencode.png)

**~$6/mo** — flat subscription.
:::

:::slide
![CommandCode](/blog/hermes-talk/logos/brand-commandcode.png)

**~$20/mo** — bring your own keys.
:::

:::slide
![Claude Max](/blog/hermes-talk/logos/brand-claude.png)

**~$100/mo** — the premium lane.
:::

You can genuinely start at $0: Ollama runs open models on hardware you already own. I ran the mid lanes for a while and settled on **GLM-5.3-Flash** — $0.15 per million input tokens, $0.50 per million output, one million context, MIT-licensed open weights. For daily agent work it is startlingly good, and it is the reason the whole payroll is under the price of a coffee. The premium lane exists for the days a task actually needs frontier intelligence; the trick is that those days are rarer than pricing pages suggest.

Open weights matter more than they first appear, too. When a model is downloadable, the agent's brain is not rented — if a provider dies, prices spike, or a policy changes, you swap a config line and keep running.

:::slide
![GLM-5.3-Flash by Z.ai](/blog/hermes-talk/logos/brand-zai.png)

My pick: **GLM-5.3-Flash.**
:::

:::slide
![The whole payroll, less than a coffee a month](/blog/hermes-talk/img-coffee.png)

The whole payroll: **less than a coffee a month.**
:::

## The job description

I gave it three jobs, and it does all three every week.

**It ships my products.** It works in the actual repositories of the things I'm building — the financial-simulation app I'm building at excited.live is planned, tax-engine'd, and code-reviewed with it in the loop. Over one recent month it sent about 63,000 messages and ran nearly 19,000 tool calls across those repos: writing specs, executing edits, running test suites, opening pull requests, and verifying previews in a real browser before reporting anything as done.

**It runs my back office.** Email triage on two accounts — every morning the inbox is pre-sorted, with rules applied and anything that needs a reply drafted and waiting. Scheduled reports, deadline nudges, a daily digest, and a nightly self-maintenance pass: backups run, memory gets cleaned up, a failure watchdog repairs whatever broke while I slept.

**It tracks my life.** The fun one. I'm on a public 365-day weight-loss challenge — 104.4 kg down to a target of 85 kg — and the agent runs the whole scoreboard. I reply to one Discord message a day with a number; it does everything else.

:::slide
![I type one number, it does everything else](/blog/hermes-talk/img-discord.png)

Three jobs. **One payroll.**
:::

## Proof instead of promises

The weight challenge became the demo I show people, because it is the thing they can visit. I turned my progress page into a terminal-styled site where every weigh-in is a git commit — workouts and meals in the diffs:

![The Road to 85kg site — every weigh-in is a commit, meals and workouts live in the diffs](/blog/hermes-talk/road85-site-terminal.png)

The loop looks trivial and isn't: I type "104.2" into Discord, and the agent parses it, updates the ledger, recomputes the streak, regenerates the chart, applies calorie estimates to the meals I mentioned in passing, and nudges me at 8 a.m. the next morning. There is no app between me and my data — just a conversation.

![Mobile view of the Road to 85kg tracker the agent maintains](/blog/hermes-talk/road85-site-mobile.png)

And because it never forgets to log, never rounds in its favor, and never skips a day, the numbers are more honest than anything I've kept by hand.

:::slide
![The scoreboard builds itself](/blog/hermes-talk/img-proof.png)

Proof, **not promises.**
:::

## The stat I actually care about

Here is the chart the agent maintains, from real weigh-ins over the first couple of weeks:

![Weight chart — 104.4 kg on day 1, 103.0 by day 11, goal 85 kg, projected arrival January 2027](/blog/hermes-talk/weight-chart.png)

1.4 kg down in the first 11 days, goal line ahead, projected arrival around January 2027. That dotted line will be wrong — real weight loss zig-zags — and that is fine. The point is that a number I have failed to track a dozen times in my life is now tracked *at* me, daily, by something that does not get bored.

:::slide
![Minus 1.4 kg in 11 days](/blog/hermes-talk/weight-chart.png)

−1.4 kg in 11 days. **The machine keeps me honest.**
:::

## The assistant is the product

One month of usage, the honest receipt: 470 sessions, ~19,000 tool runs, 15 cron jobs all green, on a 4 GB server, for less than $20 all-in.

When I started, I assumed the valuable thing would be what the agent *produces* — the code, the charts, the clean inbox. What I actually value most is stranger: I built a coworker who knows my work, keeps my promises visible, and is awake whenever I'm not. The side projects get shipped, the inbox stays sorted, and my weight goal has a scoreboard that updates itself.

The assistant is the product. Everything else is what it happens to make along the way.

:::slide
![One month, the honest receipt](/blog/hermes-talk/img-receipt.png)

**The assistant is the product.**
:::

If you want to build your own, the ladder above is the whole secret: start at $0, let it earn the upgrade, and give it one small real job before you give it a big one. Mine started as a reminder bot. Employees get promoted too.
