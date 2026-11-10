# PHASE 0 · ITEM 4 — DECISION BRIEF FOR THE OWNER

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

🔴 **Nothing was built, activated, subscribed to or paid for. No account was created. No auth scope
was widened. `$0` was spent.** No secret value printed, hashed or measured. **This file is
uncommitted pending the owner's read.**

**Sources carried forward, not re-derived** (*start an audit from the existing audit*):
`ARCHITECTURE_AND_GAP_REPORT.md` §7 / §11b / §15 / §16, `PHASE_0_ITEM_4_WORKER_HOSTING.md`,
`PHASE_0_FROZEN_GAP_REGISTER.md`. Where this brief takes a measurement of its own it says so and
carries the URL and the date.

**This brief decides nothing.** It carries one recommendation, marked as such. The decision, and any
spend, are the owner's.

---

# 1 · 🔴 READ THIS BEFORE THE PRICES — `CRW-2`

## The choice between A, B and C is a **$0–$5/month** question. That is not the money at risk.

Two facts are already on our own record, and **nothing connects them today**:

| | on record | where |
|---|---|---|
| **a** | **AlmiOET's 240,328 pSEO pages declare `revalidate = false` and are served dynamically with caching off — every crawler visit runs a function** | `PD-COST-1`, architecture report §11b |
| **b** | Gate C proves a crawler arriving at a stale ISR page causes a regeneration — *"ISR functions run whenever they revalidate"* | architecture report §11b |

> ## Gate C was written about **other people's** crawlers. The worker item 4 proposes is one **we** would build — and it would arrive at our own pages, at our own expense, 240,328 of which are served dynamically.

**`CRW-2`: nothing in this repository connects (a) to (b).** And `GATE-2` records the reason the gate
cannot cover it: **"Gate C is a gate, not a governor. It judges cost; nothing caps, meters or
refuses spend."**

**The exposure is unmeasured and, as written, unbounded:**

- **`U-COST-4`** — crawl volume is the denominator every price multiplies, and **no cohort is
  authorised**. Every figure in §4 below is a **rate**. **A rate without a volume is not a cost**,
  and inventing the volume to produce a headline number is the projection Rule Eight forbids.
- **`U-COST-5`** — **nobody has applied Gate C to a crawler we operate.**

**A brief that leads with a $4 VM while that sits unguarded is the wrong shape. Hence this section
is first.**

## 1.1 · What would have to exist before our own crawler may touch our own hosts

**Stated as conditions, not as a design. None of the five exists today.**

| # | condition | closes |
|---|---|---|
| **C1** | **A named crawl plan with an explicit page-count ceiling.** Not "the estate" — a number. §17 already recommends a capped sample rather than 240,328 pages | `U-COST-4` |
| **C2** | **Gate C run against that named plan**, producing a per-crawl Vercel figure in money | `U-COST-5` |
| **C3** | **A governor, not a gate** — something that meters spend and **refuses** past a ceiling. `GATE-2` records that nothing does this today, and a gate that only judges cannot stop a run already under way | `GATE-2` |
| **C4** | **An own-host rule** — either our own hostnames are excluded from the crawl, or they are read from a source that costs nothing to serve (see 1.2) | `CRW-2` |
| **C5** | **A politeness / rate-limit policy.** `CRW-3`: none exists and none has been measured. A crawler that is too fast gets blocked, and **a block is permanent in a way a slow crawl is not** (`R4`) | `CRW-3` |

**None of these is a reason not to build a worker. Each is a thing the design must answer, and none
of them is answered today.**

## 1.2 · A measured note bearing on `C4` — our own pages need not be crawled at all

**Measured 11 September 2026, read-only, `$0`:** a service-account with the
`webmasters.readonly` scope authenticates against the Search Console API and returns, for
`sc-domain:almiworld.com`, per-page impressions, clicks, CTR and position across **19 live
hostnames** — **with no page fetch of any kind.**

For **our own** properties that removes three of the four risks at once: no ISR regeneration
(`R1`), no politeness exposure (`R4`), and no licence question (`R3` — it is our own data).

⚠️ **What it does not do:** it returns nothing about **competitors' page content**, which is the
part that genuinely requires a fetching worker. **This narrows the crawler's job; it does not
remove it.** Recorded as evidence for `C4`, not as a design and not as a decision.

---

# 2 · 🔴 A CORRECTION TO §7 — RECORDED AS A CORRECTION, NOT A FOOTNOTE

## 2.1 · The claim

§7 ruled **Option C (Cloudflare Workers + Queues)** last, citing:

> *"strict per-invocation CPU limits — hostile to a slow page fetch"*

## 2.2 · The measurement

**Source: `https://developers.cloudflare.com/workers/platform/limits/` — fetched and read
11 September 2026 for this brief.** Verbatim:

> **"Waiting on network requests (such as `fetch()` calls, KV reads, or database queries) does
> **not** count toward CPU time."**

Same page, same read:

| | Free | Paid |
|---|---|---|
| **CPU time per HTTP request** | **10 ms** | **5 min** (default 30 s) |
| **Duration — Cron Triggers** | **15 min** | **15 min** |
| **Duration — Queue consumers** | **15 min** | **15 min** |

## 2.3 · The verdict

> ## THE STATED MECHANISM IS BACKWARDS. A slow page fetch costs a Worker **no CPU time at all**. **Waiting is free; parsing is not.**

The constraint §7 names is real but **aimed at the wrong operation**. What a page audit actually
spends CPU on is **parsing** — HTML → text, tokenising, shingling, hashing. On **Free**, **10 ms**
is genuinely tight for that. On **Paid**, **5 minutes of CPU** is not tight for anything we do.

**The honest revision:** Option C is a **poor fit for CPU-heavy parsing on the free tier** and a
**good fit for fetching, including slow and unresponsive pages** — the exact workload §7 ruled it
out for. Per item 4 §2.3, **the subrequest ceiling (50 free / 10,000 paid) is the limit that
actually shapes the design**, not fetch duration.

**A second §7 claim is also contradicted** (item 4 §3.1, read 11 Sep 2026): §7 says *"Queues has
historically been paid."* **Cloudflare's Free plan includes 10,000 Queues operations per day.** A
queue-based crawler can be exercised at small scale for **$0**.

## 2.4 · What this does and does not do

⚠️ **This does not promote Option C.** §7's reason for recommending **A** — *"the network already
runs on Actions, nothing new is bought, nothing new is learned"* — is untouched by either
correction. **It changes why C ranked last, not that it did.**

🔴 **But the sentence must not remain in a frozen register as though it were true.** §7 is another
author's reading and the boundary says record, not rewrite — so **the correction is recorded here
and needs the owner's ruling on how §7 is annotated.** It is flagged, not applied.

---

# 3 · 🔴 `U-COST-1` IS NOT RESEARCH — IT IS A NUMBER IN THE OWNER'S OWN SETTINGS

`U-COST-1` is written as an UNKNOWN requiring *"one read of the GitHub billing page, or a token with
`user` scope the owner grants."* **No price survey is needed. It is two clicks.**

**Where:**

- **Personal account:** `https://github.com/settings/billing` → **Plan and usage** → GitHub Actions
  minutes.
- **Organization:** `https://github.com/organizations/<org>/settings/billing`.

**Why the machine could not read it, and did not force it:** `gh api user` returns `plan: null`, and
the billing endpoint returns **404 — needs the `user` scope**. **`gh auth refresh` was not run:
widening a token's scope is a change, and the boundary says measure, not change.** The refusal was
recorded rather than routed around, and that was correct.

**What the number unlocks** (verified 11 Sep 2026, item 4 §2.1):

| allowance by plan | minutes / month |
|---|---|
| Free | 2,000 |
| Pro | 3,000 |
| Team | 3,000 |
| Enterprise Cloud | 50,000 |

🔴 **`almi-visibility` is a PRIVATE repository** (`gh repo view` → `visibility=PRIVATE`), so **every
Actions minute it spends draws on that allowance** — the public-repo free tier does not apply.

At **$0.006/min** (Linux 2-core, x64), an hour of crawling costs **$0.36 once the allowance is
gone**. **The allowance's size decides whether $0.36 is ever reached — not the rate.**

> **Until the owner reads that number, the running cost of the recommended option is unknown.**

---

# 4 · THE OPTIONS, AT VERIFIED PRICES

All figures read from the vendor's own page **11 September 2026** (item 4 §2). Nothing purchased.

| | **A — GitHub Actions** | **B — small always-on VM** | **C — Cloudflare Workers + Queues** |
|---|---|---|---|
| **price** | $0 within allowance; **$0.006/min** Linux 2-core after | **$4.00/mo** (1 vCPU, 512 MiB, 10 GiB, 500 GiB transfer) · **$6.00/mo** (1 GiB RAM) | **$0** Free · **$5.00/mo** Paid per account |
| **included** | Free 2,000 / Pro 3,000 / Team 3,000 / EC 50,000 min | per-second billing, 60 s minimum, from 1 Jan 2026 | Paid: 10M req/mo then +$0.30/M; 30M CPU-ms/mo then +$0.02/M; Queues 1M ops/mo then +$0.40/M |
| **duration ceiling** | per §7 | none (always-on) | **5 min CPU** paid; **15 min** wall-clock on Cron/Queue |
| **shaping limit** | 🔴 private repo draws the allowance; **allowance size UNKNOWN** (§3) | one vendor, one data point | **subrequests: 50 free / 10,000 paid** |
| **source** | docs.github.com Actions billing | digitalocean.com/pricing/droplets | developers.cloudflare.com workers pricing + limits |

🔴 **Two gaps in this table, both recorded rather than filled:**

- **`U-COST-3` — Hetzner's prices are NOT measured.** `hetzner.com/cloud/` renders its plan cards as
  *"starting from max/mo."* placeholders, figures arriving by client-side script. **No second
  attempt with a different agent string, no other route.** Option B is therefore **one vendor, one
  data point — not a survey.**
- **`U-COST-2` — the Vercel plan tier is UNKNOWN.** `vercel teams ls` names the team but not the
  plan, and the CLI exposes no read-only plan command. This matters for §1: the Vercel plan governs
  what our own crawler's regenerations cost us.

---

# 5 · RECOMMENDATION — **a recommendation, not a decision**

**§7's recommendation of Option A for v0.1 stands.** Neither correction in §2 touches its reasons:
the network already runs on Actions, nothing new is bought, nothing new is learned.

**But the option is not the thing to decide first.** Choosing between A, B and C settles **$0–$5 a
month**. Section 1 is about a cost that is **unmeasured and, as currently written, unbounded**.
Picking a host before C1–C5 exist buys precision on the small number while the large one stays
unguarded.

**Recommended sequence — each step is a measurement or a ruling, none is a build:**

| # | step | who | closes |
|---|---|---|---|
| **1** | Read the Actions allowance at `github.com/settings/billing` | **owner**, seconds | `U-COST-1` |
| **2** | Authorise **or refuse** a capped v0.1 cohort — a page-count ceiling, not "the estate" | **owner** | `U-COST-4`, `C1` |
| **3** | Run Gate C against that named cohort | later phase | `U-COST-5`, `C2` |
| **4** | Rule on whether our own hosts are in the crawl at all, given §1.2 | **owner** | `C4` |
| **5** | **Only then** does A vs B vs C carry weight | later phase | `CRW-1` |

## 🔴 Three things only the owner can settle

1. **The Actions allowance number** (§3) — a settings page, not a survey.
2. **The cohort**, or a refusal of one — *a product DECISION is not a defect*; `U13` records that
   whether AlmiOET's 240,328 pages are wanted at all is the owner's ruling, not ours.
3. **Whether our own hosts are crawled**, or read from Search Console (§1.2), or left alone.

---

## WHAT THIS BRIEF DID NOT DO

- 🔴 **Nothing built, activated, subscribed to or paid for. No account created. `$0`.**
- **No auth scope widened.** `gh auth refresh` was not run; the GitHub billing refusal stands
  recorded.
- **No section of `ARCHITECTURE_AND_GAP_REPORT.md` or `PHASE_0_FROZEN_GAP_REGISTER.md` rewritten.**
  The §7 correction in §2 is **recorded and flagged for the owner's ruling**; §7 is untouched.
- **No decision made.** §5 is a recommendation and says so.
- **Hetzner's prices left unmeasured**, not estimated, not retried with a different agent string.
- **No cohort authorised, no crawl plan named, no total cost stated** — `U-COST-4` forbids it.
- **No commit, no PR, no branch.** This file is uncommitted pending the owner's read.
- **No claim, no page, no schema, no refactor, no Phase 1 code. No new GREEN requested.**
