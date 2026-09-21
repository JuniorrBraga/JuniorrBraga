<img src="./assets/hero.svg" alt="Junior Braga — automation and AI agents on GoHighLevel" width="100%">

I build sales automation and AI agents on **GoHighLevel**, and write the code where the platform runs out. I work at **AVA Partners**, study Computer Science, and spend my days on the line between a visual builder and a text editor.

This profile is written for people who build. If you have never touched GoHighLevel — probably your case — the section below is an honest summary of what this work actually is.

[Versão em português](./README.md)

---

## What working with GoHighLevel is really like

GoHighLevel is a multi-tenant white-label CRM. An agency owns one account; each client becomes a *sub-account* holding pipelines, calendars, forms, messaging, and a visual workflow builder of the trigger → condition → action kind. It is sold as "no developer needed", and for a good stretch of the road that is true.

The interesting work starts where that promise ends.

<img src="./assets/ghl.svg" alt="Two territories: what the builder solves and where code begins, split by the seam" width="100%">

**The builder has no loops, no aggregation, no state.** It reacts to one event at a time. The moment the problem becomes "for every contact who did X in the last 30 days, compute Y and decide Z", there is no path inside the tool. You leave the platform, solve it outside, and hand the result back.

**Webhooks are not guaranteed delivery.** They arrive out of order, arrive twice, and sometimes never arrive. Anything that triggers a charge, a message, or a booking has to be idempotent — dedup keys, a queue, retries with backoff. Without that, the symptom shows up in the worst possible way: the same message reaching the same person twice.

**The v2 API is OAuth 2.0 with a token per sub-account.** Scopes per resource, rate limits per sub-account, and the client's token is yours to store and refresh. An automation serving 30 clients manages 30 sets of credentials.

**Snapshots replicate structure, not data.** They copy the shape of one account into another. Moving contacts, history, and conversations is still extract-transform-load work, done carefully, because there is a live sales operation on the other end.

**White-label means the product is yours.** Your domain, your brand — and when you need to inject something the panel won't allow, a proxy in front of it.

In the end the deliverable is one architectural decision repeated many times: **what stays in the builder and what becomes code.** Err toward code and you build a system only you can maintain. Err toward the builder and you get a forty-box workflow nobody understands six months later. What the team can maintain without me is part of what I deliver.

---

## How I work

**Automation nobody reviews is automation that lies.** Every unattended flow gets logs, counters, and a way to answer "did this run today?". A green job that did nothing is the worst possible outcome — it goes unnoticed for weeks.

**I'd rather ship a system the client understands than one that impresses them.** The hard part is rarely technical: it's deciding what not to build.

**AI is a component, not a garnish.** A qualification agent needs context, boundaries, and an output the rest of the system can actually consume. A loose prompt with no output validation is a bug waiting to happen.

**I write in Portuguese** — code, commits, and docs. It's the language of the people who maintain these systems with me.

---

## Tools

| | |
|---|---|
| **Platform** | GoHighLevel — v2 API, webhooks, snapshots, white-label, multi-sub-account |
| **Code** | TypeScript · Node · Next.js · React · Python |
| **Data** | Postgres · Supabase · SQL |
| **AI** | Claude · GPT · Whisper · prompt engineering applied to sales funnels |
| **Media** | FFmpeg — batch editing and captioning pipelines |
| **Ops** | GitHub Actions · Vercel · n8n · Docker |

---

## Production panel

<img src="./assets/painel.svg" alt="GitHub numbers, refreshed daily by this repository's Action" width="100%">

<sub>Generated daily by [this repository's Action](.github/workflows/painel.yml), straight from the GitHub API. If the read token is missing, the job fails instead of publishing stale numbers as if they were today's.</sub>

---

## About the repositories

Most are private — they are client systems in production. What is public is there to show how I build, not what I sell. Architecture and demos I'll walk you through in a conversation.

**[matchgoal](https://github.com/JuniorrBraga/matchgoal)** — football statistics SaaS with AI. pnpm + Turborepo monorepo.

---

## Contact

If you have a sales process stuck in a builder that won't go further, or an integration the platform doesn't offer, get in touch.

**[LinkedIn](https://www.linkedin.com/in/junior-braga/)** · **[bragajuniordev@gmail.com](mailto:bragajuniordev@gmail.com)**
