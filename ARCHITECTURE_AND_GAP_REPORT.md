# AlmiVisibility — Phase 0 Architecture and Gap Report

**Measured: 10 September 2026.** Every number in this document has a date and a method.
Where something was not measured it says **UNKNOWN**, and says who can answer it and what
evidence would close it. No blank cell is filled with a guess.

**What Phase 0 is:** measurement and architecture. **What was NOT done, deliberately:** no
scaffolding, no package installs, no Next.js app, no database schema, no crawler, no dashboard,
no page generator, no paid provider activated, no write to any product repository, no production
change. Only documents entered this repository.

**Two rulings this report is built on, and they are not re-argued here:**

- **The fault was never the count.** Duplicate, thin and non-indexable pages were the fault.
  The count is an **output**, not a target.
- **The three faults are not the same shape.** Duplicate and thin are measurable **before**
  publishing. Technical indexability is **verifiable** before publishing. **Actual indexed
  status is neither** — it is learned afterwards from Search Console evidence. `INDEXABLE` =
  technically eligible. `INDEXED` = a search engine actually kept it. **No pre-publish gate can
  promise the second.**

---

## 0 · Repository inventory — asked first, answered before any work began

**23 of 23 product repositories are already on this machine. NOTHING WAS CLONED and nothing needs
to be.** The canonical list is `almi-monitor/src/lib/registry-seed.ts` (24 entries = 23 products +
the AlmiWorld hub). Every path below was verified as a real git repository with an `origin`
remote.

| # | product | local path | last commit |
|---|---|---|---|
| — | *AlmiWorld Hub (not a product)* | `C:\Projects\world-almiworld` | 2026-08-11 |
| 1 | AlmiCV | `C:\Projects\almi-cv-v2` | 2026-08-31 |
| 2 | AlmiSalary | `C:\Projects\almisalary-v2` | 2026-07-29 |
| 3 | AlmiJob | `C:\Users\Lenovo\Documents\GitHub\almijob-v2` | 2026-07-29 |
| 4 | AlmiStudy | `C:\Users\Lenovo\Documents\GitHub\almistudy` | 2026-08-10 |
| 5 | AlmiPrep | `C:\Projects\almi-prep-v2` | 2026-08-24 |
| 6 | AlmiPTE | `C:\Projects\almi-pte` | 2026-08-23 |
| 7 | AlmiTOEFL | `C:\Projects\almi-toefl` | 2026-08-14 |
| 8 | AlmiPathway | `C:\Projects\almi-pathway` | 2026-07-13 |
| 9 | AlmiDET | `C:\Projects\almi-det` | 2026-08-16 |
| 10 | AlmiOET | `C:\Projects\almi-oet` | 2026-09-09 |
| 11 | AlmiCELPIP | `C:\Projects\almi-celpip` | 2026-08-24 |
| 12 | AlmiGoethe | `C:\Projects\almi-goethe` | 2026-08-11 |
| 13 | AlmiFrench | `C:\Projects\almi-french` | 2026-08-11 |
| 14 | AlmiSpanish | `C:\Projects\almi-spanish` | 2026-08-11 |
| 15 | AlmiJapanese | `C:\Projects\almi-japanese` | 2026-08-11 |
| 16 | AlmiKorean | `C:\Projects\almi-korean` | 2026-08-11 |
| 17 | AlmiItalian | `C:\Projects\almi-italian` | 2026-08-30 |
| 18 | AlmiPortuguese | `C:\Projects\almi-portuguese` | 2026-08-11 |
| 19 | AlmiDutch | `C:\Projects\almi-dutch` | 2026-08-11 |
| 20 | AlmiIcelandic | `C:\Projects\almi-icelandic` | 2026-08-11 |
| 21 | AlmiDanish | `C:\Projects\almi-danish` | 2026-08-11 |
| 22 | AlmiNorwegian | `C:\Projects\almi-norwegian` | 2026-08-11 |
| 23 | AlmiSwedish | `C:\Projects\almi-swedish` | 2026-08-11 |

**Missing: none. Clone time: none. Disk needed: none.** The question the owner reserved a decision
for — *"clone all, or a few?"* — **does not arise.**

**Two notes, so the mapping is not silently wrong later:**

- Four products have an **older repository beside the current one**: `almi-cv-builder` (Apr 2026),
  `almisalary` (May 2026), `almijob-finder` (Apr 2026). The table above names the **current** one
  in each case, matched against the live Vercel project list. Anything that reads "the AlmiCV
  repo" must mean `almi-cv-v2`.
- `C:\Projects\almi-swiss` exists and is a real repository, but **no `almiswiss.almiworld.com`
  appears in the product registry**. It is not one of the 23. **UNKNOWN — the owner should say
  what it is** (U15).

**Support repositories, also present and relevant:** `almi-audit`, `almi-monitor`, `almi-hq`,
`almi-seo-ops`, `almi-data`, `almi-shared-roles`, `almi-billing-router`, `almiarchitect`.
**And `almi-visibility` itself** was cloned to `C:\Projects\almi-visibility` — it is this
document's home, it is not one of the 23, and it contained only `README.md`.

---

## 1 · Executive Phase 0 status

| | |
|---|---|
| Product repositories on this machine | **23 of 23 present.** Nothing needs cloning. |
| Dedicated database for AlmiVisibility | **CONFIRMED new and empty** — not any product's database |
| Preview vs Production database | 🔴 **THE SAME DATABASE.** Day-1 repeat of GAP-053 |
| Analytics/funnel instrumentation across the network | **1 product of 23** has real event instrumentation |
| URLs currently in sitemaps across the network | **12,855,354** |
| AlmiOET pSEO pages against Gate A (dry run, live) | **0 of 5 sampled pages would pass** |
| AlmiOET pSEO pages against Gate C (live) | 🔴 **no caching at all** — every request runs a function |
| Google Search Console access | **UNKNOWN** — nothing enabled, nothing authorized |
| Worker execution layer | **UNDECIDED** — three options costed below, owner decides |

**The single most important measured fact in this report:** the product we just finished
shipping, AlmiOET, publishes **240,328 URLs** whose pages carry
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` and return
`x-vercel-cache: MISS` on **every** request. They are not ISR. They are dynamic. **Every crawler
visit to any of those 240,328 URLs executes a function.** That is Gate C's failure mode, live,
today, on the product declared complete — and it was found by measuring, not by remembering.

---

## 2 · Neon / database reality

**Measured 10 September 2026** from the `almi-visibility` Vercel project's own environment, and
by asking each server to identify itself.

| field | answer | method |
|---|---|---|
| Vercel project | `almi-visibility` (exists, updated ~30 min before this measurement) | `vercel projects ls` |
| Neon project id | `noisy-truth-88221617` | `DATABASE_NEON_PROJECT_ID` |
| Endpoint host | `ep-calm-brook-auptcd48-pooler.c-10.us-east-1.aws.neon.tech` | `DATABASE_PGHOST` |
| Database name | `neondb` | `select current_database()` |
| Is it a product's existing database? | **NO** | see below |
| Neon plan | **UNKNOWN** | not exposed to the CLI or to SQL |
| Storage limit | **UNKNOWN** | " |
| Branch limit | **UNKNOWN** | " |
| Compute/autosuspend settings | **UNKNOWN** | " |

### It is a new, dedicated database — three independent pieces of evidence

1. **The `public` schema is empty.** Connected read-only and listed every table: **9 tables,
   all in the `neon_auth` schema** (Neon's own auth scaffolding, created automatically). There
   is not one product table — no `OetItem`, no `User`, no `OetAttempt`. A shared product
   database would carry that product's tables.
2. **The Neon project id matches no product.** Collected from env files already on disk:
   AlmiOET `floral-tree-78168976`, AlmiDET `rough-art-02116548`, AlmiCELPIP
   `muddy-credit-87122881`, AlmiTOEFL `misty-king-42461563`, AlmiArchitect
   `floral-river-07039081`. AlmiVisibility's `noisy-truth-88221617` is none of them.
3. **The endpoint matches no other repository on this machine** — 14 repositories carry a
   database host locally and **no endpoint is used by two repositories**.

**Limit of that evidence, stated plainly:** 9 of the 23 products have no database file on this
machine, so I could not compare their endpoints directly. Point 1 does not depend on that
comparison and is decisive on its own.

**No RED BLOCKER on this item.**

---

## 2b · 🔴 DATABASE ISOLATION — Preview and Production share one database

This is its own section because it is its own defect, and it is **RED**.

**The question:** are AlmiVisibility's Preview and Production environments on the same database?

**Why it is asked:** on AlmiOET they are (GAP-053). There, *"try it on preview"* means *"write
to production"*. That was found late, on a live product. On a new app it should be found on day
one — measured, not hoped for.

**Method — both of the sanctioned ones, no credential compared, nothing about any secret's
value, prefix, length or hash printed, logged or measured:**

| | Preview | Production |
|---|---|---|
| Neon project id | `noisy-truth-88221617` | `noisy-truth-88221617` |
| `DATABASE_PGHOST` | `ep-calm-brook-auptcd48-pooler.c-10.us-east-1.aws.neon.tech` | identical |
| `select current_database()` — asked the server itself | `neondb` | `neondb` |
| `current_setting('neon.project_id')` — asked the server itself | `noisy-truth-88221617` | `noisy-truth-88221617` |

**ANSWER: THEY ARE THE SAME DATABASE.** Same Neon project, same endpoint, same database name,
confirmed twice — once from the environment, once by asking each server to name itself.

**What this means in practice:** AlmiVisibility currently has **no harmless place to test**. The
first preview deployment that writes a row writes it to the same store production reads. Every
crawl snapshot, every issue record, every fact written from a branch lands in the one database.

**It is not fixed here** — Phase 0 does not change infrastructure. It is recorded as a RED item
for the owner's decision, with three shapes the fix can take, all of which are the owner's call:
a second Neon project for preview; a Neon **branch** per preview deployment (Neon's own feature
for exactly this, and the reason the branch limit above matters); or an explicit written rule
that preview deployments never write, enforced by a guard in code.

---

## 3 · Analytics coverage — evidence only, no repo evidence means UNKNOWN

**Method:** every local repository walked (excluding `node_modules`, `.next`, `.git`, `public`),
every `.ts/.tsx/.js/.jsx/.mjs/.mts` file read, and signals recorded **with the file that proves
them**. A keyword in a string is not instrumentation and is not counted as one.

| product | real event instrumentation? | evidence |
|---|---|---|
| **AlmiOET** | ✅ **YES — the only complete one** | `src/lib/analytics/track.ts` (the `track()` definition), `src/lib/analytics/events.ts` (the event catalogue), `scripts/gates/funnel.ts` (a gate that fails if an event is uncatalogued), call sites in app pages |
| AlmiPrep | ⚠️ partial | one component only: `src/components/analytics/StartTrialEvent.tsx`. No `track()` definition, no event catalogue |
| AlmiCV, AlmiPTE, AlmiTOEFL, AlmiDET, AlmiGoethe, AlmiFrench, AlmiItalian, AlmiDutch, AlmiIcelandic, AlmiDanish, AlmiSwedish | ⚠️ page-view analytics only | a Plausible reference appears, which gives **pageviews**. No `track()` definition, no event catalogue, no funnel events anywhere |
| AlmiWorld Hub, AlmiSalary, AlmiJob, AlmiStudy, AlmiPathway, AlmiCELPIP, AlmiSpanish, AlmiJapanese, AlmiKorean, AlmiPortuguese, AlmiNorwegian | ❌ none found | no analytics module, no `track()` definition, no call sites |

**Signup event · trial event · payment event · product-use event · conversion tracking:**
**present and instrumented in AlmiOET only.** Elsewhere the words "trial", "checkout" and
"payment" occur in ordinary product strings; that is not a funnel and is not reported as one.

**Consequence for AlmiVisibility:** any claim of the form *"this page produced a signup"* can be
made **for AlmiOET and no other product today**. For the other 22, visibility work can be
connected to **traffic** but not to **conversion**, until instrumentation exists. That is a
scope fact, not an implementation request.

---

## 4 · Sitemap and robots inventory — fetched from the real public network

**Method:** live HTTPS GET of `/robots.txt` and the sitemap each robots file declares (falling
back to `/sitemap-index.xml` then `/sitemap.xml`), **every child sitemap followed**, `<url>`
entries counted. 10 September 2026.

### 4.1 · The network's published page count

| product | URLs in sitemap | product | URLs in sitemap |
|---|---|---|---|
| **AlmiFrench** | **7,079,892** | AlmiPTE | 90,484 |
| **AlmiSwedish** | **3,290,461** | AlmiCV | 46,602 |
| **AlmiDET** | **1,172,928** | AlmiStudy | 11,267 |
| **AlmiOET** | **240,328** | AlmiSpanish | 8,558 |
| AlmiTOEFL | 226,049 | AlmiItalian | 855 |
| AlmiPrep | 220,012 | AlmiGoethe | 679 |
| AlmiJapanese | 163,687 | AlmiKorean | 433 |
| AlmiWorld Hub | 101,459 | AlmiCELPIP | 323 |
| AlmiJob | 100,798 | AlmiIcelandic / Danish / Norwegian / Portuguese / Dutch | 15 / 14 / 14 / 13 / 12 |
| AlmiSalary | 100,471 | **AlmiPathway** | **unreachable** |

> **TOTAL: 12,855,354 URLs currently submitted to search engines across the network.**

**AlmiPathway:** `almipathway.almiworld.com` does not resolve (`fetch failed`). Its Vercel
project has `active: false` in the monitor registry and `almi-seo-ops/submit-sitemaps.mjs`
already carries a comment saying the domain does not resolve. **Consistent with the record, not
a new fault** — but it means the product has **no robots.txt and no sitemap** and is
**invisible**, which for a visibility engine is a finding, not a footnote.

### 4.2 · robots.txt — and a correction of my own first reading

**My first pass flagged 12 products as blocking all crawling. That was wrong, and I caught it
before reporting it.** My detector looked for a bare `Disallow: /` anywhere in the file without
asking **which user-agent it belonged to**. Re-parsed properly, by group:

- **No product blocks Googlebot or Bingbot. There is no site-wide block anywhere.**
- **12 products carry a bare `Disallow: /` for a specific list of agents:**
  `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Bytespider`,
  `Amazonbot`, `PerplexityBot`, `Google-Extended`, `AhrefsBot`, `SemrushBot`, `MJ12bot`,
  `DotBot`, `DataForSeoBot`, `PetalBot`.
  Those 12 are: AlmiGoethe, AlmiFrench, AlmiSpanish, AlmiJapanese, AlmiKorean, AlmiItalian,
  AlmiPortuguese, AlmiDutch, AlmiIcelandic, AlmiDanish, AlmiNorwegian, AlmiSwedish.

🔴 **This matters more than it looks.** AlmiVisibility's stated purpose includes **AI
visibility**. Twelve products explicitly forbid the exact crawlers whose answers that engine is
meant to measure and improve — including **`Google-Extended`**, which is Google's opt-out for AI
features, and **`ClaudeBot`** and **`GPTBot`**. **Whether that policy is intended is a decision
for the owner, not a defect I should quietly "fix".** But an AI-visibility programme cannot
report on products that have opted out, and the report must not pretend otherwise.

### 4.3 · Broken sitemap entries

**48 URLs sampled across all six AlmiOET child sitemaps (8 per file, spread, not the first
eight): 48 of 48 returned HTTP 200.** No 404, no redirect, in this sample. The defect class is
real and recorded historically, but **it is not currently reproducible on AlmiOET at this
sample size** — which matters for Case Study #1 and is recorded there.

---

## 5 · Reusable artifacts — what must NOT be rebuilt

| path | purpose | verdict |
|---|---|---|
| **`C:\Projects\almi-audit`** | *"One portable inspector that runs against any AlmiWorld product, checks every fault class in a single pass, and emits a findings ledger."* **21 check modules** (`src/checks/`), **23 product adapters** (`src/adapters/` — one per product, exactly this network), `src/core/` with probe runner, TS queries, ledger, **historical checkout** (`product@commit`), `--json` ledger output, and **RED-first proofs for every check** (`npm run proofs`). Exit 1 on failure, so it already works as a CI gate. | **REUSE — this is the spine.** AlmiVisibility's audit layer should extend this, not restate it. Its rule *"the rules never live in an adapter"* is the same separation the visibility engine needs. |
| `C:\Projects\almi-seo-ops\submit-sitemaps.mjs` | Submits each product's sitemap to Search Console; already encodes the property-mode question (`url-prefix` vs `sc-domain`) and the per-product feed paths | **REUSE** for the GSC ingestion shape and the per-product feed table |
| `C:\Projects\almi-monitor\src\lib\registry-seed.ts` | The canonical 24-host registry (23 products + hub) with base URL, status path, sitemap path, active flag | **REUSE** as the product registry; do not re-type the list |
| `C:\Projects\almi-oet\scripts\gates\` | 22 gates, several of which are visibility-shaped: `sources.ts`, `sourced-facts.ts` (every claim about an external body must cite one), `claims.ts` (a promise on screen must match the symbol that delivers it), `funnel.ts`, `title-collision.ts`, `no-secret-shape.ts` | **ADAPT** — `sourced-facts` and `claims` are the closest existing thing to Gate A's "verified facts" rule |
| `_handoffs\PRODUCT_SOURCE_OF_TRUTH_AlmiOET.md` + `AlmiOET_PRODUCT_SOURCE_OF_TRUTH_2026-09-07.md` | The fact registry for one product: value, source, scope | **REUSE** as the shape of the verified-fact cache |
| `_handoffs\KEYWORD_INTENT_MAP.md` | Keyword → intent mapping | **REUSE** |
| `_handoffs\AI_VISIBILITY_TARGETS.md` | 40+ questions with, for each: what a true answer requires, whether the product can tell the truth today, which page owns it, and the source | **REUSE — this is already the AI-visibility corpus design**, and it is honest about ❌ rows |
| `_handoffs\AlmiWorld_Product_Audit_Standard_v2.md`, `AlmiWorld_exercise_chain_audit_spec.md`, per-product `*_CC_brief_audit_*.md`, `AlmiOET_AUDIT_STATE_2026-09-07.md`, `audit-2026-09-07/` | Audit standards and completed audits | **REUSE** as prior art and as regression fixtures |
| `_handoffs\AlmiOET_GAP_REGISTER.md` | The defect history this network learned from | **REUSE** — Case Study #1 is drawn from it |
| `_handoffs` as a whole | **590 files** | **INVENTORY BEFORE WRITING ANYTHING NEW.** The most likely waste in Phase 1 is rewriting a document that already exists here. |

---

## 6 · Google Search Console prerequisites — nothing was enabled

**Nothing was authorized, connected or switched on. This section is a list of what the owner
would have to do, not a thing that has been done.**

| question | answer | confidence |
|---|---|---|
| Property type needed | **Both are viable and they differ.** A **Domain property** (`sc-domain:almiworld.com`) covers `almiworld.com` **and every subdomain** in one property — one authorization, one API target, all 23 products. A **URL-prefix property** (`https://almioet.almiworld.com/`) covers one subdomain only and would need **23 separate properties and 23 authorizations**. | High — and `almi-seo-ops/submit-sitemaps.mjs` already implements both modes, so the code question is settled |
| What subdomain products need | With a Domain property: **nothing extra**, because DNS verification at `almiworld.com` inherits to subdomains. With URL-prefix: **each subdomain verified separately**. | High |
| Verification method | Domain property requires a **DNS TXT record** on `almiworld.com`. URL-prefix accepts an HTML file, a meta tag, or Google Analytics. | High |
| API | **Search Console API** (`webmasters`/`searchconsole`). The read paths needed are Search Analytics (queries, pages, impressions, clicks, position) and the URL Inspection API for per-URL index status. | High |
| Minimum scope for read-only analysis | **`https://www.googleapis.com/auth/webmasters.readonly`** | High |
| OAuth or service account? | **Service account is the right shape for an unattended worker** — no refresh-token expiry, no browser. It requires the owner to **add the service account's email as a user on the property** in Search Console. OAuth would work but ties the engine to a human session. | Medium — the mechanism is standard; the exact Search Console UI path should be confirmed by the owner when he does it |
| What the owner must authorize, precisely | (1) create or confirm the property type; (2) create a Google Cloud project + service account, enable the Search Console API, download a key; (3) in Search Console, add that service account email as a **Restricted** (read-only) user; (4) hand over the property identifier and the key by a route that is not this chat | — |
| URL Inspection API quota | **UNKNOWN** — it is rate-limited per property per day and that limit decides how fast Gate B can measure. Must be read from Google's own quota documentation before Gate B is designed. | UNKNOWN |
| Data freshness / lag | **UNKNOWN** — Search Console data lags, and Gate B's waiting period depends on the real lag, not an assumed one. | UNKNOWN |

**Consequence for Gate B:** Gate B cannot be built until the property type is chosen and the
quota is known. It is not blocked on code. It is blocked on **access and on two numbers**.

---

## 7 · Worker hosting options — proposals, not a decision

**Vercel is not assumed to be the host.** A crawler is long-running, bursty, IO-bound and
retryable; a request-scoped serverless function is the wrong shape for it, and Vercel's own
function limits (execution duration, concurrency billing) make sustained crawling the most
expensive way to do it.

🔴 **Every monetary figure below is INDICATIVE and was NOT verified against the vendor's pricing
page today.** Rule Eight applies: a price is a measurement, and I did not take it. **No paid
service was activated.** Before any option is chosen, its current pricing must be read from the
vendor and written into this table with a date and a URL — that verification is costed in
section 15.

| | **A · GitHub Actions (scheduled)** | **B · Small always-on VM** | **C · Cloudflare Workers + Queues** |
|---|---|---|---|
| Architecture shape | cron-triggered workflow runs the crawler as a job, writes to Neon, uploads artifacts | one small Linux box runs a queue worker continuously; systemd; Neon over the network | producer/consumer queue; each URL is a small isolate invocation; results to Neon over HTTP |
| Already in use here? | **Yes** — every product already runs CI and `post-deploy` on Actions | No | No |
| Free tier that is actually real | Minutes included with the plan; **private repos consume the allowance** | None | A free tier exists for Workers; **Queues has historically been paid** |
| CPU / RAM | Standard runner: 2–4 vCPU, 7–16 GB | whatever is bought; predictable | strict per-invocation CPU limits — **hostile to a slow page fetch** |
| Max runtime per unit | **6 hours per job** | unbounded | short per invocation; work must be split |
| Scheduling / queue | cron in the workflow; **no queue** — you build one or you fan out with a matrix | anything (systemd timers, a real queue) | native queue, retries, DLQ |
| Fit for a crawler | **Good for batch crawls**, poor for continuous work | **Best fit** for sustained, polite, rate-limited crawling | Good for massive parallel small fetches, poor for long/heavy pages |
| Scaling ceiling | concurrency limits per plan; minutes cost grows linearly | vertical only, then you buy a second box | very high |
| Operational complexity | **Lowest — it is already how this network works** | **Highest — a machine to patch, monitor and pay for whether or not it is used** | Medium; a different runtime and a different mental model |
| Vendor lock-in | Low — it is a shell script in YAML | **Lowest** | **Highest** — Workers/Queues APIs are not portable |
| Where cost jumps | when crawl frequency × page count pushes minutes past the included allowance | never suddenly — it is a flat monthly cost, which is also its weakness | when Queues volume and subrequest counts grow |
| Indicative monthly cost | **plan-included minutes, then per-minute** — UNVERIFIED | **small single-digit to low double-digit USD** — UNVERIFIED | **low single-digit USD at small volume** — UNVERIFIED |

**My reading, which is not a decision:** **Option A** for v0.1. The crawl is a batch job, the
network already runs on Actions, nothing new is bought, nothing new is learned, and the blast
radius of a mistake is one workflow run. Move to **B** only when a measured Actions minute bill
justifies it. **C** is a poor first choice for this workload: its per-invocation CPU limits fight
the exact thing a page audit does.

---

## 8 · Database growth and retention — proposal, owner decides

**Grounded in the real network, not in a hypothetical one.** The measured corpus is
**12,855,354 URLs** today (section 4.1). Three workloads:

| workload | scope | pages per full pass |
|---|---|---|
| **small** | AlmiOET only, the v0.1 slice | 240,328 (or a capped sample — see below) |
| **medium** | the 8 products over 90,000 URLs each | ~12.4 million |
| **large** | everything | 12.86 million |

Rows per page per pass, by table:

| table | what it holds | rows per page per pass | bytes/row (est.) |
|---|---|---|---|
| `page` (inventory) | canonical record of a URL | 1, **not per pass** | ~0.5 KB |
| `crawl_snapshot` | status, headers, render mode, sizes, hashes — **not the HTML** | 1 per pass | ~1 KB |
| `issue` | one row per finding | 0–5 per pass | ~0.5 KB |
| `fact` + `fact_source` | verified facts and provenance — **shared, not per page** | grows with facts, not pages | ~1 KB |
| `search_performance` | per URL per day from GSC | 1 per URL per day **only for URLs with impressions** | ~0.2 KB |

**Indicative monthly growth** (snapshots + issues, weekly full pass, 1.5 KB/page/pass):

| workload | pages/pass | passes/month | rows/month | data/month |
|---|---|---|---|---|
| small (AlmiOET) | 240,328 | 4 | ~1.0 M | **~1.4 GB** |
| medium | 12.4 M | 4 | ~50 M | **~74 GB** |
| large | 12.86 M | 4 | ~51 M | **~77 GB** |

🔴 **The medium and large numbers are the finding, not the plan.** At those volumes a Neon
serverless Postgres is the wrong store for raw snapshots within two months. **Two consequences,
both for the owner to rule on:**

1. **v0.1 must be the small workload, and even that should be a capped sample** — a few thousand
   AlmiOET pages, not all 240,328. The audit layer earns its scope; it does not start with it.
2. **Raw HTML is never stored in Postgres.** Store a hash and the extracted measurements. If raw
   bodies are ever needed, they belong in object storage with a lifecycle rule.

**Retention proposal:** keep the **latest** snapshot per URL indefinitely; keep **90 days** of
historical snapshots; **roll up** older ones to one row per URL per month; **delete** raw issue
rows once resolved and counted, keeping the count. **Purge** anything for a URL that has left the
sitemap for 60 days.

**Isolation:** already answered — a dedicated Neon project, `noisy-truth-88221617`. **What is
NOT answered is the plan and its storage limit (section 2), and the fact that preview and
production share it (section 2b).** A growth estimate cannot be turned into a cost until the
plan is known.

**Indicative monthly cost: UNKNOWN.** It depends on the Neon plan, which is UNKNOWN.

---

## 9 · Case Study #1 — summary

Full document: **`CASE_STUDY_01_ACCEPTANCE_TEST.md`** (this repository).

- **6 RED defects** and **3 CONTROL pages** mapped to real AlmiOET locations.
- **PASS = 6/6 RED found unaided AND 0/3 controls falsely flagged.** A false positive on any
  control is **FAIL** — there is no half pass.
- The engine is **never** told where the defects are.
- 🔴 **The finding that changes the test's design:** most of these defects were **fixed**. A test
  that runs against the live site would find nothing and would decay every time a page changes.
  **The test therefore requires a FROZEN INPUT CORPUS** — a pinned snapshot, at a stated commit
  and date — not the live network. That requirement is written into the test document.
- **Two of the six are still reproducible live today**, measured in this Phase 0, and are marked
  as such.

---

## 10 · GATE A — pre-publish. FROZEN.

**Not implemented here. Frozen as specification.** A candidate that fails **any** check is **not
written**. Not "flagged for review". Not written.

| check | threshold | measured how |
|---|---|---|
| **UNIQUE WORDS** | **≥ 350** | words on the **rendered** page that are **not in the shared shell**. A fat template must not be able to carry a thin page. |
| **VERIFIED FACTS** | **≥ 5** | each with **value · source URL · source tier · verified date · scope**, from the fact cache |
| **SIBLING OVERLAP** | **≤ 40 %** | against **every** sibling on the same template — not a sample |
| **`WHY_THIS_URL_DESERVES_TO_EXIST`** | present and specific | a sentence naming what this page answers that no existing URL answers |
| **TECHNICAL INDEXABILITY** | correct | robots.txt, robots meta, canonical, and **rendered** content — verifiable before publishing, and therefore verified |

**THE SHORTFALL RULE — not negotiable:** *a shortfall is a **DATA** problem. It is never a
licence to lower the gate.* If a page cannot reach 350 unique words and 5 sourced facts, **the
honest conclusion is that there is not enough real data for that page to exist.* **REJECT is a
valid and expected outcome.**

**Two ways Gate A can be fooled, and the answer to each:**
- **Measure the draft and you measure the template.** Boilerplate is words. The check runs on the
  **rendered** page with the shell subtracted, or it proves nothing.
- **Compare against a sample of siblings and near-duplicates slip through.** Overlap is computed
  against **all** of them. If that is slow, it is slow — it is cheaper than the pages.

### 10.1 · Gate A dry-run against the live product — measured 10 September 2026

Five sibling AlmiOET pSEO pages on the `/[profession]/from-[origin]/[organization]` template.
Method: fetch the rendered HTML, strip script/style/tags, take the **shared shell** to be the
words present in **every** sibling, subtract it.

| page | total words | shell | **UNIQUE** | Gate A needs |
|---|---|---|---|---|
| `/nursing/from-bhutan/ie-nmbi` | 622 | 511 | **111** | ≥ 350 |
| `/nursing/from-india/ph-andrews-manpower-consulting` | 577 | 511 | **66** | ≥ 350 |
| `/nursing/from-south-sudan/uk-barts-health-nhs-trust` | 606 | 511 | **95** | ≥ 350 |
| `/nursing/from-sudan/uk-calderdale-and-huddersfield-nhs-trust` | 613 | 511 | **102** | ≥ 350 |
| `/nursing/from-austria/ca-cannn` | 678 | 511 | **167** | ≥ 350 |

Pairwise sibling overlap, same five pages: **76.3 % · 76.7 % · 78.3 % · 79.8 % · 83.1 % ·
83.6 % · 85.2 % · 88.4 % · 89.4 % · 94.5 %** — Gate A allows **≤ 40 %**.

> **0 of 5 sampled pages would pass Gate A. 10 of 10 sibling pairs breach the overlap limit.
> These pages are live, and there are 240,328 of them.**

**Honest limits of this dry-run:** the shell was estimated from **5** siblings, not all of them —
with more siblings the shell can only grow, so the unique-word counts above are **upper bounds**
and the real numbers are lower. The overlap figure is a word-multiset overlap and may not be the
exact algorithm Gate A finally uses. **This is an indicative dry-run, not the gate.** It is
strong enough to say the direction is not in doubt.

---

## 11 · GATE B — post-publish. FROZEN.

**Not implemented here. Frozen as specification.** Publishing is not success. **The only
evidence that a page was worth building is that a search engine kept it.**

```
batch ships  →  wait for crawl  →  read GSC: discovered / crawled / indexed
                                        │
                    below threshold ────┴──── at or above threshold
                            │                         │
                    🔴 EXPANSION PAUSES        next batch permitted
                    automatically.
                    Investigate before
                    one more page is built.
```

| | |
|---|---|
| first batch | **10 pages, one product** |
| growth | **10 → 50 → 200.** Never 10 → 1,000 because generation succeeded |
| the measure | **INDEXED.** *Submitted* is not a result. *Generated*, *deployed* and *in the sitemap* are not results |
| the mechanism | **automatic** — not a reminder, not a dashboard warning. The next batch is **not available** until the previous one passed |

**The batch limit is a BLAST RADIUS, not a quality bar.** Gate A is the defence against bad
pages. The batch size decides only whether a flaw **in Gate A itself** reaches ten pages or ten
thousand. This is stated plainly because anyone who believes the batch limit is the safety will
eventually raise it — and it was never the safety.

**Why this gate is the one that was missing:** duplicate and thin were catchable by a check.
**Indexation had nothing watching it**, so the counter went up, the bill went up, and nothing in
the system ever asked whether any of it was being read. **AlmiCELPIP is the proof it is needed:**
its record said *"57 /learn LIVE + GSC ✅"* while its sitemap returned **0 discovered pages**.

**Blocked on:** Search Console access, the URL Inspection quota, and the real data lag — all
UNKNOWN today (section 6).

---

## 11b · 🔴 GATE C — COST PER CRAWL. FROZEN.

**Equal in rank to Gate A and Gate B. Not advice — a gate.**

### The mechanism, and what today's Vercel documentation actually says

The mechanism as stated: on ISR, a crawler arriving at a stale page causes the page to be
regenerated; the bill is neither storage nor bandwidth but **rebuild**; a crawler returns to a
given URL after weeks, by which time the page is stale at **any** revalidate value; therefore
**every crawler visit is a regeneration**, and at scale ISR stops being ISR and becomes SSR —
with the perverse result that **the pages you most want crawled bill you the most**.

**Verified against Vercel's own documentation today, not from memory:**

| claim | what the documentation says | source |
|---|---|---|
| A revalidation costs a function invocation | *"**Function invocations**: ISR functions run whenever they revalidate in the background or through on-demand revalidation"* | https://vercel.com/docs/incremental-static-regeneration (page states `last_updated: 2026-08-28`) |
| Durable cache reads and writes are billed | *"**ISR writes**: Vercel persists fresh content to durable storage… **ISR reads**: Vercel reads from the ISR cache when the CDN doesn't have the content"* | same page |
| Units | *"**Read unit**: One read unit equals 8 KB of data read… **Write unit**: One write unit equals 8 KB of data written"* | https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing (`last_updated: 2026-08-11`) |
| The CDN layer will not save a returning crawler | *"This cache is **ephemeral with no guaranteed retention**. Vercel keeps it on a best-effort basis, **typically for minutes to hours**, and can evict it under memory pressure."* | limits-and-pricing |
| 🔴 **A correction to the mechanism** | *"**When revalidation runs and the content hasn't changed from the previous version, no ISR write units are incurred.** This applies to both time-based and on-demand revalidation."* | limits-and-pricing |
| …and when that correction does **not** apply | *"If you're seeing unexpected writes, the content has changed between revalidations. To debug: check that you're not using `new Date()`… `Math.random()`… no other non-deterministic code is included in the ISR output"* | limits-and-pricing |
| Vercel's own recommendation matches the rule | *"For content that rarely changes, set a longer time-based revalidation interval. If you have events that trigger data updates, **use on-demand revalidation instead of short revalidation intervals**"* | limits-and-pricing |
| The metric that measures exactly this | **Write Utilization** — *"the number of total requests served by the cache per ISR write… find pages that are regenerating often but not receiving many requests per regeneration"* (requires Observability+) | limits-and-pricing |

**So the mechanism stands, with one honest amendment:** a stale-page crawl costs an
**invocation** and an **ISR read** every time; it costs a **write** only when the regenerated
output actually differs — and a single `new Date()` in the output makes it differ **every time**.
The corrected sentence is: **every crawler visit to a stale page is a rebuild; whether it is also
a write depends on whether your page is deterministic.**

### And the live measurement, which is worse than the ISR case

**Measured on AlmiOET, 10 September 2026** — three consecutive requests to
`https://almioet.almiworld.com/nursing/from-bhutan/ie-nmbi`:

```
request 1: status 200  x-vercel-cache=MISS  age=0
request 2: status 200  x-vercel-cache=MISS  age=0
request 3: status 200  x-vercel-cache=MISS  age=0
```

Response header on every sampled pSEO page:
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`

`private` and `no-store` forbid the CDN from keeping the response at all. The build output for
this route reads `ƒ /[profession]/[fromOrigin]/[organization]` — **dynamic, server-rendered on
demand**. **These pages are not ISR. They are SSR with caching switched off.** There is no stale
window to argue about: **every request is a function invocation, including every crawler
request**, and there are **240,328 such URLs**.

> **A full crawl of AlmiOET's sitemap = 240,328 function invocations. Every time.**

### 🔴 And the source says the opposite — traced to the line

`src/app/[profession]/[fromOrigin]/[organization]/page.tsx` declares, in the author's own words:

```ts
export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes
```

**That is Gate C's rule, written down by the person who built the page — and the deployment does
not do it.** The cause is three files away and the codebase already knows the rule:

- `src/app/layout.tsx` carries a deliberate comment: *"NO HEADER HERE, DELIBERATELY. The header
  has to know whether someone is signed in, and **reading the session in the ROOT layout makes
  every route under it dynamic**… So the header is rendered one level down by each segment."*
- `src/app/[profession]/layout.tsx` is one line: `export { default } from "@/components/SiteChrome"`.
- `src/components/SiteChrome.tsx` calls **`await getCurrentUser()`** — a cookie read.

So the segment layout wrapping **all 240,328 pSEO pages** does exactly what the root layout
refused to do, one level down, and `revalidate = false` is void. The build output confirms it:
`ƒ /[profession]/[fromOrigin]/[organization]` — **dynamic**, not static, not ISR.

**The lesson for Gate C, and it is the reason Gate C exists:** the render mode a page *declares*
is not the render mode it *gets*. **The gate must measure the served response — `x-vercel-cache`
and `Cache-Control` on the deployed URL — not read the export.** A guard that reads the source
would have passed this page 240,328 times.

*(There is already a test, `tests/header-session.test.tsx`, asserting which segments read the
session — it protects the root layout. It does not ask what that read costs a crawler.)*

### THE GATE — a page is not published unless these four are written down

1. **RENDER MODE** — static · ISR · SSR · dynamic
2. **IF ISR — the revalidate value AND ITS JUSTIFICATION.** The number alone is not an answer.
3. **WORK DONE BY ONE CRAWLER VISIT — must be ZERO**
4. **INVOCATIONS IF THE WHOLE BATCH IS CRAWLED ONCE** — estimated **before** shipping

### THE RULE

> **REBUILD ON CHANGE, NOT ON TIME.**

| WRONG | RIGHT |
|---|---|
| ISR on a timer | build-time static, or a very long revalidate + **on-demand revalidation** |
| the page notices that time has passed | the page is rebuilt when **its data** changes |
| a crawler visit creates work | a crawler visit is answered from cache — **zero work** |

**Cross-check before Phase 1 uses any of these numbers:** Vercel's pricing pages carry their own
`last_updated` dates (above). They must be re-read at the moment a decision depends on them.
**An estimate is not a measurement.**

---

## 12 · Phase 0 blockers

| # | blocker | severity | why it blocks |
|---|---|---|---|
| 1 | **Preview and Production share one database** (section 2b) | 🔴 RED | there is no harmless place to test; the first branch that writes, writes to production |
| 2 | **Google Search Console: no property chosen, no access, no quota known** | 🔴 RED for Gate B | Gate B *is* GSC evidence. Without it, "indexed" is unmeasurable and the pause mechanism cannot exist |
| 3 | **Neon plan, storage limit and branch limit UNKNOWN** | 🟠 | the growth table in section 8 cannot become a cost, and the branch-per-preview fix for blocker 1 may or may not be available |
| 4 | **Worker execution layer UNDECIDED**, and every cost in section 7 is unverified | 🟠 | a crawler cannot be scheduled before its host exists; no paid option may be activated without the owner |
| 5 | **Case Study #1 needs a frozen corpus** (section 9) | 🟠 | most mapped defects are fixed; against the live site the test would find nothing and would decay |
| 6 | **12 products block AI crawlers, including `Google-Extended`, `GPTBot`, `ClaudeBot`** | 🟠 policy, not a bug | an AI-visibility programme cannot report on products that have opted out. The owner decides whether this stays |
| 7 | **AlmiPathway is unreachable** — no robots.txt, no sitemap | 🟡 | one of the 23 products cannot be audited at all |
| 8 | **22 of 23 products have no funnel instrumentation** | 🟡 | visibility can be tied to traffic but not to conversion outside AlmiOET |
| 9 | **AlmiOET's 240,328 pSEO pages declare `revalidate = false` and are served dynamically with caching switched off** (§11b) | 🔴 for cost | every crawler visit runs a function; the declared render mode is not the served one. This is a live product cost, found in Phase 0, and it is the owner's decision what to do about it |

---

## 13 · UNKNOWN register

**Rule: what is not known is written UNKNOWN. No blank cell is filled by inference.**

| # | UNKNOWN | why it is unknown | who can answer | evidence that closes it |
|---|---|---|---|---|
| U1 | Neon **plan** for `noisy-truth-88221617` | not exposed to the Vercel CLI or to SQL | **owner** | a screenshot or reading of the Neon console billing page |
| U2 | Neon **storage limit** | " | **owner** | same |
| U3 | Neon **branch limit** | " | **owner** | same — and it decides whether branch-per-preview is available for blocker 1 |
| U4 | Neon **compute / autosuspend** settings | " | **owner** | Neon console |
| U5 | GSC **property type** in use today (domain vs URL-prefix) | Search Console was not opened, nothing was enabled | **owner** | the property list in Search Console |
| U6 | GSC **URL Inspection API quota** per property per day | not measurable without access | **owner + Google's quota docs** | the documented quota, read on the day it matters |
| U7 | GSC **data lag** | " | **owner + measurement after access** | the first week of real data |
| U8 | **Vercel plan** for these projects and the per-unit prices that apply to it | not read; Rule Eight | **owner** | the team's Vercel billing page, with a date |
| U9 | **Actual monthly cost** of any worker option | prices not verified today | **owner** | vendor pricing pages, with a date and URL |
| U10 | Whether the **AI-crawler block** on 12 products is intended | it is a policy, not a defect | **owner** | a written ruling |
| U11 | Whether **AlmiPathway** is meant to be live | domain does not resolve; registry says `active:false` | **owner** | a written ruling |
| U12 | Endpoint isolation for the **9 products with no local env file** | no evidence on this machine | **owner or a per-project env read** | `DATABASE_NEON_PROJECT_ID` for those 9 |
| U13 | Whether AlmiOET's **240,328 pSEO pages** are wanted at all, now that Gate A rejects the sample and Gate C shows they are uncached | it is a product decision with a real cost attached | **owner** | a ruling — this is exactly the *"a product DECISION is not a defect"* rule |
| U14 | The **exact algorithm** Gate A will use for sibling overlap | not specified beyond "≤ 40 % against every sibling" | **owner** | a written definition, before implementation |
| U15 | What `C:\Projectslmi-swiss` is — a real repository with no product in the registry | not in `registry-seed.ts`, no `almiswiss` host | **owner** | a one-line ruling: product, experiment, or dead |

---

## 14 · Who can answer what

| source | items |
|---|---|
| **Owner only** | U1–U5, U8, U10, U11, U13, U14; blockers 1, 2, 4, 6, 7; every paid activation |
| **Owner + a vendor page, read on the day** | U6, U9 |
| **Measurable by the engine once access exists** | U7, U12 |
| **Already answered in this document** | database isolation from products (§2), analytics coverage (§3), the network's sitemap and robots reality (§4), reusable artifacts (§5), Gate A's live dry-run (§10.1), Gate C's live measurement (§11b) |

---

## 15 · Cost of the next safe step

**The next safe step is NOT code.** It is closing blockers 1–3 and pinning the Case Study corpus.

| item | money | note |
|---|---|---|
| Owner reads the Neon console (U1–U4) | **$0** | ~10 minutes of owner time |
| Owner decides and sets up the GSC property + service account (blocker 2) | **$0** | Search Console and its API are free at this scale |
| Verify today's prices for the three worker options (U9) and Vercel's own plan (U8) | **$0** | reading, not buying |
| Fix preview/production isolation (blocker 1) | **$0 if a Neon branch is available on the plan; otherwise the cost of a second Neon project** | depends on U1/U3 |
| Pin the Case Study #1 frozen corpus | **$0** | a snapshot at a named commit |
| **TOTAL to leave Phase 0 safely** | **$0 in new spend** | every remaining unknown is answerable without buying anything |
| **Monthly recurring, if Phase 1 then starts** | **UNKNOWN — and deliberately so.** It cannot be stated until U1, U8 and U9 are closed. | no paid provider was activated |

---

## 16 · Time for the next safe step

| item | estimate |
|---|---|
| Owner: Neon console readings | ~10 min |
| Owner: GSC property decision + service account + granting read access | ~30–60 min |
| Owner: ruling on U10 (AI-crawler block), U11 (AlmiPathway), U13 (240k pages) | ~30 min of thinking, no keyboard |
| Me: verify worker prices and Vercel plan, write them into this document with dates and URLs | ~1 hour |
| Me: pin and archive the Case Study #1 frozen corpus | ~2 hours |
| Me: extend `almi-audit` with the first visibility check (only after the above) | **not estimated — that is Phase 1 and is not authorized** |

---

## 17 · Recommendation — a recommendation, not a decision

1. **Fix the preview/production database split before one line of Phase 1 code is written.**
   It is the same defect that took a live product; catching it on day one and then living with it
   would be worse than not having caught it.
2. **Make v0.1's scope a capped AlmiOET sample — a few thousand pages, not 240,328.** Section 8
   shows the medium and large workloads outgrow the database within two months. Scope is earned.
3. **Choose GitHub Actions for the first crawler.** It buys nothing, learns nothing new, and the
   blast radius of a mistake is one workflow run. Revisit when a measured minute bill says to.
4. **Treat AlmiOET's 240,328 pSEO pages as the first thing the engine reports on, not as
   settled.** The dry run says 0 of 5 pass Gate A and every request is uncached. That is the
   clearest possible demonstration that this engine is worth building — and it is also a product
   decision that belongs to the owner, not a defect for me to fix.
5. **Do not build page generation.** Its absence is the strongest mass-page safety control that
   exists, and it costs nothing to keep.

---

**Document status:** Phase 0 measurement. No code. No page generation. No production change. No
paid activation. Two documents were added to this repository and to `C:\Projects\_handoffs\`.
