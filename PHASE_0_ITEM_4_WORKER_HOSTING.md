# PHASE 0 · FROZEN ITEM 4 — CRAWLER / RESEARCH-WORKER HOSTING

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

**Read first, per AUDIT ONCE:** `ARCHITECTURE_AND_GAP_REPORT.md` **§7** (worker hosting options),
**§11b** (Gate C — cost per crawl), **§15** (cost of the next safe step) and **§16** (time).
**No section of it is rewritten.** What follows records what they already answer, fills the one hole
they name, and corrects two claims that measurement contradicts.

🔴 **Nothing was built, activated, subscribed to or paid for. No account was created. No provider
was contacted beyond reading its public pricing page over HTTPS.** `$0` was spent, and `$0` is the
verified figure below. No secret value printed, hashed or measured.

---

# 1 · WHAT §7, §11b, §15 AND §16 ALREADY ANSWER — RECORDED, NOT RE-DERIVED

| item-4 requirement | already answered |
|---|---|
| **options** | §7 — three, fully specified: **A** GitHub Actions (scheduled), **B** small always-on VM, **C** Cloudflare Workers + Queues |
| **architecture shape per option** | §7 — one row each |
| **limits** | §7 — runtime per unit, CPU/RAM, scheduling, scaling ceiling, lock-in |
| **risks: vendor lock-in, cost jumps, operational burden** | §7 — three rows |
| **cost of crawling at all** | §11b — Gate C, **frozen**, with Vercel's own documentation quoted and dated |
| **cost of the next step** | §15 — **$0 in new spend**; verifying prices is explicitly listed at **$0, "reading, not buying"** |
| **time for it** | §16 — *"Me: verify worker prices and Vercel plan, write them into this document with dates and URLs — ~1 hour"* |
| **a reading, not a decision** | §7 — Option A for v0.1, move to B when a measured bill justifies it |

**§7's own words define what was missing:** *"Every monetary figure below is **INDICATIVE** and was
**NOT verified** against the vendor's pricing page today. Rule Eight applies: a price is a
measurement, and I did not take it."*

> ## THAT IS ITEM 4's ONLY REAL HOLE, AND IT IS THE ONE THING THIS DOCUMENT ADDS.

---

# 2 · THE PRICES, TAKEN AS MEASUREMENTS — 11 SEPTEMBER 2026

Every figure below was read from the vendor's own page **today**, quoted, and carries its URL.
Nothing was purchased.

## 2.1 · Option A — GitHub Actions

**Source:** `https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions` · read 11 Sep 2026 · **the page shows no last-updated date**

| | verified |
|---|---|
| included minutes / month | **Free 2,000 · Pro 3,000 · Team 3,000 · Enterprise Cloud 50,000** |
| public repositories | **free** — *"The use of standard GitHub-hosted runners is free: In public repositories"* |
| private repositories | **consume the included minutes** |
| Linux 2-core (x64), after the allowance | **$0.006 / minute** |
| Windows 2-core | **$0.010 / minute** |
| macOS | **$0.062 / minute** |

🔴 **`almi-visibility` is a PRIVATE repository** (`gh repo view` → `visibility=PRIVATE`). **So every
Actions minute it spends draws on the allowance.** §7 flagged this; it is now confirmed for this
repository specifically.

⚠️ **Which allowance applies is UNKNOWN** (§5, `U-COST-1`): `gh api user` returns `plan: null`, and
the billing endpoint returns **404 — *"needs the `user` scope"***. **I did not run `gh auth refresh`
to widen the token: changing an auth scope is a change, and the boundary says measure, not change.**

**What that means in practice, stated without the missing number:** at **$0.006/min**, an hour of
crawling costs **$0.36** once the allowance is gone — the allowance's size decides whether that
is ever reached, not the rate.

## 2.2 · Option B — a small always-on VM

**Source:** `https://www.digitalocean.com/pricing/droplets` · read 11 Sep 2026

| plan | monthly | vCPU | RAM | SSD | transfer |
|---|---|---|---|---|---|
| Basic | **$4.00 USD** | 1 | 512 MiB | 10 GiB | 500 GiB |
| Basic | **$6.00 USD** | 1 | 1 GiB | 25 GiB | 1,000 GiB |

Billing is per second, minimum 60 seconds or $0.01, **from 1 January 2026**.

⚠️ **ONE VENDOR, ONE DATA POINT — NOT A SURVEY.** §7's figure was *"small single-digit to low
double-digit USD"*; the low end is now confirmed at **$4/month**.

🔴 **And a refusal, recorded rather than routed around:** `hetzner.com/cloud/` was read and **shows
no prices** — its plan cards render as *"starting from max/mo."* placeholders, the figures arriving
by client-side script. **No second attempt was made with a different agent string, and no other
route was tried.** Hetzner's prices are therefore **not measured** and are not stated here.

## 2.3 · Option C — Cloudflare Workers + Queues

**Sources:** `https://developers.cloudflare.com/workers/platform/pricing/` and
`.../workers/platform/limits/` · both read 11 Sep 2026

| | Free | Paid |
|---|---|---|
| base price | **$0** | **$5 USD / month per account** |
| requests | **100,000 / day** | **10 million / month included**, then **+$0.30 per million** |
| CPU time | **10 ms / invocation** | **30 million CPU-ms / month included**, then **+$0.02 per million**; **5 min max per request** (30 s default) |
| subrequests per invocation | **50** | **10,000** (configurable to 10M) |
| wall-clock | no hard limit for HTTP-triggered; **15 minutes** for Cron / Queue / Alarm triggers | same |
| **Queues** | ✅ **10,000 operations/day included** | **1,000,000 operations/month included**, then **+$0.40 per million** |

---

# 3 · 🔴 TWO CLAIMS IN §7 THAT MEASUREMENT CONTRADICTS

**Recorded here, not edited into §7** — that section is another author's reading, and the boundary
says record.

## 3.1 · "Queues has historically been paid" — **no longer true**

§7: *"A free tier exists for Workers; **Queues has historically been paid**."*
**Measured today: Queues includes 10,000 operations per day on the Free plan.** A queue-based
crawler can be exercised at small scale for **$0**.

## 3.2 · 🔴 "strict per-invocation CPU limits — hostile to a slow page fetch" — **THE MECHANISM IS THE OTHER WAY ROUND**

The limits page is explicit:

> *"Waiting on network requests (such as `fetch()` calls, KV reads, or database queries) does **not**
> count toward CPU time."*

> ### A SLOW PAGE FETCH COSTS A WORKER NO CPU TIME AT ALL. **WAITING IS FREE; PARSING IS NOT.**

So the constraint is real but **aimed at the wrong operation**. What a page audit actually spends
CPU on is **parsing** — HTML → text, tokenising, shingling, hashing — and on the **Free** plan
**10 ms** is genuinely tight for that. On **Paid** the ceiling is **5 minutes of CPU**, which is not
tight for anything we do.

**The honest revision of §7's verdict on Option C:** it is a **poor fit for CPU-heavy parsing on the
free tier**, and a **good fit for fetching**, including slow and unresponsive pages — the exact
workload §7 ruled it out for. **The subrequest ceiling (50 free / 10,000 paid) is the limit that
actually shapes the design**, not the fetch duration.

⚠️ **This does not overturn §7's recommendation of Option A for v0.1**, which rests on *"the network
already runs on Actions, nothing new is bought, nothing new is learned"* — reasons untouched by
either correction. **It changes why C was ranked last, not that it was.**

---

# 4 · 🔴 THE RISK §7 DOES NOT CARRY — AND IT IS ALREADY ON OUR OWN RECORD

§7's risk rows are commercial: lock-in, cost jumps, operational burden. **Four operational and legal
risks are absent from it, and each is grounded in something this project has already measured.**

| # | risk | what has already been measured |
|---|---|---|
| **R1** | 🔴 **our own crawler bills us on our own pages** | §11b (Gate C) proves a crawler arriving at a stale ISR page causes a regeneration, and *"ISR functions run whenever they revalidate"*. **Gate C was written about OTHER people's crawlers. The worker item 4 is about is one WE would build** — and it would hit our own ISR pages at our own expense. **Nothing connects the two today** |
| **R2** | sources refuse machines | **4 of 8 regulator sources return 403**, already recorded. The standing rule is that a refusal is a cost and is recorded — **no user-agent spoofing, no proxy.** A crawler design that assumes fetchability is designed against measured evidence |
| **R3** | 🔴 **storing what is fetched is a licence act, not a technical one** | the licence register already holds `RESERVED` as the legal default and OET as `PROHIBITED`. **`DEP-2` made this concrete**: verbatim third-party captures already exist in this repository and were served publicly. **A crawler multiplies exactly that material** |
| **R4** | politeness and rate limits are not free | not measured anywhere. A crawler that is too fast gets blocked, and a block is permanent in a way a slow crawl is not |

> **None of these is a reason not to build a worker. Each is a thing the design must answer, and
> none of them is in §7's table.** Recorded — not designed, not solved.

---

# 5 · UNKNOWNs — FOUR FIELDS

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-COST-1** | which GitHub plan this account holds, and therefore the size of the Actions allowance | `gh api user` returns `plan: null`; the billing endpoint returns 404 needing the `user` scope, **and widening a token's scope is a change, not a measurement** | one read of the GitHub billing page, or a token with `user` scope the owner grants | **owner** | when the plan changes |
| **U-COST-2** | the Vercel plan tier (§7's `U8`) | `vercel teams ls` names the team but not the plan; the CLI exposes no read-only plan command | one read of the Vercel dashboard billing page | **owner** | when the plan changes |
| **U-COST-3** | Hetzner's prices | the public page renders its figures client-side and returned placeholders. **Recorded as a refusal; not retried by another route** | a person with a browser, or the vendor's API | **owner**, or a later phase | if Option B is ever chosen |
| **U-COST-4** | crawl volume — the denominator every price here multiplies | no cohort is authorised, and §17 recommends a capped sample rather than 240,328 pages | an authorised v0.1 scope | **owner** | when a cohort is authorised |
| **U-COST-5** | what our own crawler would cost us in ISR regeneration (**R1**) | Gate C quantifies the mechanism; nobody has applied it to a crawler we operate | Gate C run against a named crawl plan | later phase | when a crawl plan exists |

⚠️ **`U-COST-4` is why no total is stated.** Every figure in §2 is a **rate**. **A rate without a
volume is not a cost**, and inventing the volume to produce a headline number is precisely the
projection Rule Eight forbids.

---

# 6 · GAP REGISTER — ADDITIONS

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **CRW-1** | no crawler or research worker exists in any form, on any host | §7 proposes three options; none is built. S4/S5 remain absent |
| **CRW-2** | **Gate C polices third-party crawlers and nothing applies it to a crawler we would operate ourselves** | §4, `R1` |
| **CRW-3** | no politeness / rate-limit policy exists, and no measurement of one | §4, `R4` |

## PRODUCT DATA GAPS

**None added by this document.**

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **Nothing built, activated, subscribed to or paid for.** No account created, no provider
  contacted beyond reading a public pricing page. **$0.**
- **No auth scope widened.** The GitHub billing endpoint refused for want of a scope and **the
  refusal was recorded rather than worked around** — `gh auth refresh` was not run.
- **Hetzner's unreadable prices were left unmeasured**, not estimated, not retried with a different
  agent string.
- **No section of `ARCHITECTURE_AND_GAP_REPORT.md` rewritten.** Its two contradicted claims are
  recorded here; §7 is untouched.
- **No decision made.** §7's recommendation of Option A stands, with its reasons unchanged.
- **`A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, CRLF — recorded, not fixed.**
- **No claim, no page, no schema, no refactor, no Phase 1 code.** No new GREEN requested.
