---
title: I built an AI employee for the price of a coffee a month
date: 2026-09-11
description: Not a chatbot with a subscription — an always-on operator with memory, cron jobs, and its own terminal. How I set it up, what it actually does for me, and what it costs.
---

Most people who use AI rent a chatbot. You open a tab, type a question, read the answer, close the tab. The chatbot remembers nothing tomorrow, does nothing overnight, and never touches anything you own.

For the past few weeks I've been running something different on a tiny server: an agent with a terminal, a memory, a schedule, and its own opinions about my calendar. It is closer to hiring an employee than to subscribing to a chatbot. This post is the setup, the job description, and the payslip.

:::slide
![Hermes Agent](/blog/hermes-talk/hermes-logo-card.png)

This is **Hermes.** It works for me.
:::

:::slide
![Cursor cloud / Claude Code remote](/blog/hermes-talk/img-clouds.png)

Cursor cloud & Claude remote = rented hands. **No memory. No long tasks.**
:::

:::slide
![Memory](/blog/hermes-talk/img-memory.png)

My agent remembers. **It fixes itself overnight.**
:::

:::slide
![VPS + model](/blog/hermes-talk/img-vps.png)

To run it: **a VPS + a model.** That's all.
:::

:::slide
![Oracle Cloud Always Free](/blog/hermes-talk/logos/brand-oracle.png)

Oracle Cloud: **2 vCPU, 12 GB RAM, $0 forever.**
:::

:::slide
![Hetzner from €4.5](/blog/hermes-talk/logos/brand-hetzner.png)

Or Hetzner: **€4.5/mo. Still pocket change.**
:::

:::slide
![Token usage comparison](/blog/hermes-talk/img-tokens.png)

**1B tokens** in 10 days — vs 1.98B at work. Agents eat tokens.
:::

:::slide
![GLM-5.3-Flash and DeepSeek](/blog/hermes-talk/logos/brand-zai.png)

My pick: **cheap open-weight models with vision** — GLM-5.3-Flash or DeepSeek.
:::

:::slide
![Ollama](/blog/hermes-talk/logos/brand-ollama.png)

**Ollama: $0 → $60.** Runs open models on hardware you own.
:::

:::slide
![OpenCode Go](/blog/hermes-talk/logos/brand-opencode.png)

**OpenCode Go: $10/mo → $60 of tokens.**
:::

:::slide
![CommandCode](/blog/hermes-talk/logos/brand-commandcode.png)

**CommandCode: ~$20 → $60+. Your keys, no markup.**
:::

:::slide
![New models keep getting cheaper](/blog/hermes-talk/img-coffee.png)

New models arrive **better and cheaper.** Swap one config line.
:::

:::slide
![Discord — I type one number](/blog/hermes-talk/img-discord.png)

**Three jobs. One payroll.**
:::

:::slide
![Weight chart](/blog/hermes-talk/weight-chart.png)

**−1.4 kg in 11 days.** The machine keeps me honest.
:::

:::slide
![One month receipt](/blog/hermes-talk/img-receipt.png)

**The assistant is the product.**
:::

If you want to build your own, the ladder above is the whole secret: start at $0, let it earn the upgrade, and give it one small real job before you give it a big one. Mine started as a reminder bot. Employees get promoted too.
