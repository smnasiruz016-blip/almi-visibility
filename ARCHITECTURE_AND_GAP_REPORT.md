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
| ~15 sitemaps reading "Success" with 0 discovered | 🔴 **UNEXPLAINED and OPEN** — the 404 path does NOT explain them (§11a.3) |
| `/sitemap.xml` on the 23 product hosts | 🔴 **404 on every one of them** — and our own submitter sends that path for 3 products |
| `almioet` → `sitemap-nationality-nurse.xml` | 🔴 **404, confirmed today** — a stale submission Google has retried since 21 August |
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
| Neon resource **name** | **`neon-green-pillar`** | `vercel integration list` |
| Neon project **id** | **`noisy-truth-88221617`** | `DATABASE_NEON_PROJECT_ID` |
| Are those one project or two? | **ONE — verified, see 2a** | |
| Endpoint host | `ep-calm-brook-auptcd48-pooler.c-10.us-east-1.aws.neon.tech` | `DATABASE_PGHOST` |
| Database name | `neondb` | `select current_database()` |
| Is it a product's existing database? | **NO** | see below |
| Neon plan | **Free** — OWNER-REPORTED 10 Sep 2026, not read by me | owner |
| Branch limit | **10**, and the owner manages the slots himself — OWNER-REPORTED | owner |
| Storage limit | **UNKNOWN** | not exposed to the CLI or to SQL |
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

### 2a · `neon-green-pillar` and `noisy-truth-88221617` are ONE project — checked, not assumed

Two names for the same thing were sitting in this report, and *"Neon uses names and ids"* is an
explanation, not a verification. So it was verified:

```
$ vercel integration list          (project: almi-visibility)

Name                 Status         Product   Integration   Projects
neon-green-pillar    ● Available    Neon      neon          almi-visibility
```

**Exactly one Neon resource is attached to `almi-visibility`, and it is `neon-green-pillar`.**
That project's only `DATABASE_*` environment set carries `DATABASE_NEON_PROJECT_ID =
noisy-truth-88221617`. One resource in, one id out — **the name and the id describe the same
project.** `neon-green-pillar` is the label in the Neon console breadcrumb; `noisy-truth-88221617`
is the id the platform passes to the app.

**And it strengthens §2:** the resource's `Projects` column lists **`almi-visibility` and nothing
else**, which is a *direct* statement of isolation from the platform, better than the inference
from local env files.

**No credential value, prefix, length or hash was read, printed or measured.** Names and ids only.

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

### 🔴 THE OWNER'S RULING, 10 September 2026 — NOT NOW, AND THE TRIGGER IS WRITTEN DOWN

**No preview branch is created today, and that is correct.** The reasoning is the report's own
measurement turned against a premature fix: **the database is empty** — `public` holds nothing,
only Neon's `neon_auth` scaffolding. **There is nothing in it to protect.** The account is on Neon
**Free**, where branches are a limited resource (**10**) the owner manages himself. Spending one
today buys safety for data that does not exist.

> ### THE TRIGGER — and remembering it is MY job, not the owner's
>
> **The branch is created BEFORE the migration that creates the first table whose loss or
> corruption would actually cost something** — the fact cache, the cost ledger, the GSC pulls,
> the page candidates, the crawl results. **Before, not after.**
>
> **When that migration is written, I stop and say: *"now is the time for the branch."*** Before
> the migration is committed. Not in the same PR as an afterthought, and not once there are rows
> in it.

### 🔴 AND WHEN THAT TIME COMES, THE FIX HAS TWO HALVES. HALF IS A TRAP.

| | |
|---|---|
| **(a)** | a **preview branch in Neon** |
| **(b)** | in **Vercel**, move the `DATABASE_*` variables off **"All Environments"** and set a **separate Preview** set pointing at that branch |

**Doing (a) without (b) changes nothing at all — and it will look solved.** A branch exists, it
has a name, it appears in the console, and every preview deployment goes on sending its writes to
production because **that is still what its environment variables say.** The measurement in the
table above is exactly the shape that failure keeps: same project, same host, same database,
across both environments.

**So the proof of the fix is the same measurement repeated, not the existence of a branch:** pull
Preview and Production, compare the **host**, and ask each server `select current_database()` and
`current_setting('neon.project_id')`. **Different answers, or it is not fixed.** A branch nobody
routed to is a receipt, not a repair.

*(Phase 0 changes no infrastructure. This is the recorded ruling and its trigger, not an action.)*

---

## 2c · 🔴 THE WRITE LAW — in force from day one, not added later

**Owner's ruling, 10 September 2026. This goes into the FIRST build PR. It is not a hardening
task for later.**

> **Every write path in AlmiVisibility:**
> - **defaults to `--dry-run`**
> - **a real write requires BOTH:** `--confirm` **AND** `ALLOW_PROD_WRITE=1`
>
> **Both. Not either.** One flag is a typo away from a write; two, of different kinds — an
> argument and an environment variable — are not reached by accident.

**Where it comes from:** it is AlmiOET's law, and AlmiOET has it **because environment separation
was never achieved there** — the same defect §2b measures here. The guard was built to survive
the absence of the isolation.

**Why it goes in first, and why it stays:**

| | |
|---|---|
| it costs **nothing** | no branch, no plan, no provider, no money |
| it does not wait on anything | it is independent of Neon, Vercel, GSC and every UNKNOWN in §13 |
| it is the **only** protection that exists today | §2b measured it: preview and production are the same database. Until that is split, a dry-run default is the *whole* of the safety |
| **it stays after the branch exists** | isolation and a dry-run default protect against different mistakes. A branch stops a *preview deployment* writing to production; the write law stops *a person or a script* writing when they meant to look |

**What "every write path" means, stated now so it cannot be narrowed later:** every migration
runner, every seeding or backfill script, every crawler that persists a snapshot, every GSC
ingestion, every fact-cache write, every issue-ledger write, every purge or retention job. **A
script that only ever reads needs no flag; the moment it can write, it needs both.**

**And the failure this prevents is already in the record:** a documented production write on this
network once had to be run through a throwaway wrapper that was never committed, so the
documented command did not work for anyone reading it. **A guard that lives in the script is a
guard; a guard that lives in someone's shell history is not.**

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

> ### 🔴 CORRECTION — 10 September 2026, from the owner. THE PROPERTY QUESTION IS CLOSED.
>
> **A GSC Domain property for `almiworld.com` ALREADY EXISTS.** The evidence is that a single
> property lists the sitemaps of several subdomains at once, **which only a Domain property can
> do**. So the table below is still correct as ANALYSIS and is **out of date as a decision**: the
> "Property type needed" row was answered before this report was written, and it was answered the
> way the row recommends.
>
> **WHAT IS ACTUALLY OPEN IS ONE THING AND ONLY ONE: READ-ONLY API ACCESS to that property.**
> No DNS record, no verification, no property creation, no choice between property types.
>
> ⚠️ Recorded under Rule Twelve: this report's own numbers were fine, and the STATE it
> assumed was not. **An analysis can be right about everything except whether the thing has
> already happened.**

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

## 11a · 🔴 GATE B — EVIDENCE, NOT CONJECTURE

**Added 10 September 2026, after the owner read his Search Console properties.** Gate B stopped
being a design argument the moment real numbers existed. This section separates, strictly, three
things that must never be blended: **what the owner saw**, **what I measured**, and **what nobody
has checked yet.**

### 11a.1 · What the owner reported — OWNER-REPORTED, NOT VERIFIED BY ME

I have **no Search Console access.** Nothing was authorized, nothing was enabled, and I did not
read the console. The figures below came to me from the owner's screenshots and are recorded as
**his reading**, not as a measurement of mine. **Rule Eight applies to a screenshot too**, and it
applies to me: I did not take these numbers, so I do not present them as taken.

| owner-reported | figure |
|---|---|
| `almioet` sitemap-index | **240,328 discovered**, last read by Google **9 September** |
| `almiprep` | 220,212 discovered |
| `almipte` | 90,484 discovered |
| one host (shape matches AlmiDET) | 1,172,926 discovered |
| `world.almiworld.com` | 101,459 discovered |
| `almioet` → `sitemap-nationality-nurse.xml` | **"Couldn't fetch" — since 21 August** |
| across the properties | **~15 sitemaps read "Success" with discovered = 0** |

**The first line is the important one for GAP-055.** If Google has discovered 240,328 AlmiOET
URLs and read the index on 9 September, then **the crawl exposure in §11b is not hypothetical.**
Those URLs are known to Google, and every visit to one of them runs a function.

### 11a.2 · What I measured today, publicly — and it explains the pattern

**Every host's sitemap serves correctly. Not one child sitemap is broken.** 24 hosts, every child
of every index followed: **all 200, all containing `<url>` entries.** So "Success with 0
discovered" is **not** caused by a broken sitemap file.

Then I measured the **paths** instead of the files, and the cause fell out:

> ### 🔴 `/sitemap.xml` RETURNS **404** ON EVERY ONE OF THE 23 PRODUCT HOSTS.
>
> Measured on all of them. So does `/sitemap_index.xml`. The working path is
> **`/sitemap-index.xml`** — except AlmiArchitect, which serves `/sitemap/0.xml` and 404s on
> `/sitemap-index.xml`, and `almiworld.com` (WordPress), which correctly serves
> `/sitemap_index.xml` with 6 children.

**And this repository submits the 404 path for three products.**
`almi-seo-ops/submit-sitemaps.mjs` — the script that tells Search Console where to look:

| line | host | `feed` it submits | what that URL actually returns |
|---|---|---|---|
| 24 | `almistudy.almiworld.com` | `sitemap.xml` | 🔴 **404** |
| 27 | `almipte.almiworld.com` | `sitemap.xml` | 🔴 **404** |
| 29 | `almitoefl.almiworld.com` | `sitemap.xml` | 🔴 **404** |
| 22, 23, 25, 26, 30 | almicv, almiprep, almisalary, almijob, world | `sitemap-index.xml` | ✅ 200 |
| 32 | `almiworld.com` | `sitemap_index.xml` | ✅ 200, 6 children |
| 38 | `almiarchitect` | `sitemap/0.xml` | ✅ 200, 156 URLs |

🔴 **And the network already knew.** `almi-monitor/src/lib/registry-seed.ts` carries this comment:
*"Sitemap paths corrected in Tune-Up 1: every product serves its sitemap at `/sitemap-index.xml`
(confirmed via each product's robots.txt + a 200 probe), **not `/sitemap.xml`**."*
**One list was corrected. The other was not.** The corrected list is the one that only watches;
the stale list is the one that actually talks to Google.

### 11a.3 · 🔴 CORRECTION — the 404 path does NOT explain the zeros, and my own evidence says so

**An earlier version of this section claimed the 404 submitted path explained the ~15 "Success
with 0 discovered" rows. That claim is WITHDRAWN. It is refuted by measurements in this same
report:**

1. **We have a proven example, on this very account, of how a 404 sitemap is reported.**
   `sitemap-nationality-nurse.xml` is a 404, and Search Console says **"Couldn't fetch"** for it —
   not "Success".
2. **The ~15 rows say "Success".** A 404 does not produce a Success.
3. **And those rows' URL is `/sitemap-index.xml`** — the path that **works**, not the 404 one.

> **The script defect is real and it explains THREE products. It does not explain the zeros.**

**Why this correction matters more than the mistake did:** *a defect explained wrongly is worse
than a defect not explained at all.* An unexplained fault stays open. **A wrongly explained one
gets closed** — the script would be fixed, the zeros would still be there, and nobody would be
looking any more. The rule written a few lines above — *treating "0 discovered" as one condition
would produce one wrong fix* — applies to my own conclusion, and it did.

### The two hosts asked for: BOTH are UNEXPLAINED

| host | what I measured | status |
|---|---|---|
| **AlmiPTE** | `/sitemap-index.xml` → 3 children → **90,484 URLs, all 200** | 🔴 **UNEXPLAINED.** The file is perfect. The 404 submission is a real second entry on the property, but it would show as *"Couldn't fetch"*, not as a Success reading zero |
| **AlmiDutch** | `/sitemap-index.xml` → 1 child → **12 URLs, all 200** | 🔴 **UNEXPLAINED.** My earlier note called this "a content fact, not a plumbing fact". **That is wrong: a sitemap serving 12 URLs should be discovered as 12, not 0.** Twelve is a small number. Zero is a different thing |

**RULING: the ~15 zero-discovery rows are UNEXPLAINED and stay open.** They are **not** "explained
by the 404 path". The answer comes from Search Console access and not before it — the per-row data
(submitted URL, last read, status, discovered) is what separates them, and it is exactly the read
§11a.5 is blocked on.

### 11a.4 · `sitemap-nationality-nurse.xml` — CONFIRMED, and it is a stale submission

**Measured today:**

```
404  https://almioet.almiworld.com/sitemap-nationality-nurse.xml
404  https://almioet.almiworld.com/sitemap/nationality-nurse.xml
404  https://almioet.almiworld.com/sitemap.xml
```

**Google is right.** The URL does not exist, and it is **not referenced by the live
`sitemap-index.xml`**, which lists exactly six children: `/sitemap/0.xml` … `/sitemap/5.xml`.
So this is a sitemap that **was submitted once, then removed from the site, and never withdrawn
from Search Console.** Google has been retrying a dead URL since 21 August — three weeks — and
the only place that failure is visible is the console nobody was reading.

**It is a live defect, it is small, and it is the cheapest possible demonstration of why Gate B
exists:** the sitemap was *submitted*, which felt like success, and the only thing that would
ever have told anyone otherwise is *evidence read back from the search engine*.

### 11a.5 · What is still BLOCKED, and it is (a) and (b)

The owner asked for **every host's real figures — sitemap URL, submitted date, last read, status,
discovered pages — from the console, not from a screenshot**, and then a count of how many sit at
zero.

**I cannot produce that. I have no Search Console access.** Reporting his screenshot figures as
if I had measured them would be precisely the failure this instruction exists to prevent.

**What unlocks it — and it is unchanged from §6:**

1. the owner names the **property type** in use (`sc-domain:almiworld.com`, or 23 URL-prefix
   properties — this decides whether one authorization covers everything);
2. a **service account** with **`https://www.googleapis.com/auth/webmasters.readonly`**;
3. that account added as a **Restricted** user on the property;
4. the key delivered by a route that is not this chat.

With those, the table the owner asked for is one read-only API call per property, and it becomes
a **standing** measurement rather than a screenshot taken once.

### 11a.6 · What is explained, and what is not

| finding | status |
|---|---|
| `almistudy`, `almipte`, `almitoefl` submitted a **404** path by our own script | ✅ **EXPLAINED and FIXED** — see 11a.8 |
| `almioet`'s `sitemap-nationality-nurse.xml`, "Couldn't fetch" since 21 Aug | ✅ **EXPLAINED** — the URL is a 404 and is not in the live index. A stale submission |
| **~15 properties reading "Success" with 0 discovered** | 🔴 **UNEXPLAINED. OPEN.** Not caused by the 404 path — see 11a.3 |
| **AlmiPTE** and **AlmiDutch** specifically | 🔴 **UNEXPLAINED. OPEN.** |
| `almipathway` — domain does not resolve, no robots, no sitemap | ✅ explained; a product-level fact for the owner |

**AlmiCELPIP is still not a one-product anomaly** — *"57 /learn LIVE + GSC ✅"* while the sitemap
returned 0 discovered is the **same shape** as the ~15 rows. **But the same shape is not the same
cause, and this report no longer claims to know the cause.**

### 11a.7 · 🔴 RULE THIRTEEN — every other copy, hunted rather than hoped about

> **When one fact is written in two files, only one of them will be right.**
> A correction is not finished when the fix is correct. It is finished when **every copy of the
> wrong thing has been found.**

The sitemap-path correction was made in `almi-monitor` and never reached `almi-seo-ops` — and the
one that was missed is the one that talks to Google. So the codebase was **searched** for a third
and fourth copy rather than assumed to have none.

**Method:** every `.ts/.tsx/.mjs/.mts/.js/.json/.yml/.md` file under `C:\Projects` (excluding
`node_modules`, `.next`, `.git`, build output) scanned for files enumerating **five or more**
product hosts — those are the cross-product registries where this fact can live twice.

| file | hosts | carries a sitemap path? |
|---|---|---|
| `almi-data/src/family.ts` | **25** | **no** — zero occurrences of "sitemap" |
| **`almi-monitor/src/lib/registry-seed.ts`** | **24** | ✅ **YES** — `sitemapPath`, corrected in Tune-Up 1 |
| `almisalary-v2/components/SiteNav.tsx` | 20 | no |
| `almisalary-v2/components/SiteFooter.tsx` | 20 | no |
| `world-almiworld/src/app/page.tsx` | 15 | no |
| `world-almiworld/src/lib/products.ts` | 14 | no |
| **`almi-seo-ops/submit-sitemaps.mjs`** | **11** | 🔴 **YES** — `feed`, **not corrected until today** |
| `world-almiworld/src/app/[country]/[role]/page.tsx` | 6 | no |
| `almi-pathway/src/lib/site.ts` | 6 | no |
| `almi-goethe/src/components/goethe-seo/kit.tsx` | 5 | no |

> **ANSWER: exactly TWO copies. There is no third or fourth FILE.** Every other cross-product
> registry lists hosts without claiming a sitemap path, so none of them can drift on this fact.

**⚠️ BUT THERE IS A THIRD PLACE, AND IT IS NOT A FILE.** `registry-seed.ts` says in its own first
line: *"SEED DATA ONLY — the live source of truth is the Neon registry (rows). This is the initial
list inserted once (append-safe: never overwrites edits)."*

**So correcting the seed file did not necessarily correct the rows.** If a row carried
`/sitemap.xml` before Tune-Up 1 and the seed never overwrites edits, **the database may still hold
the old path while the file documenting it is right.** I could not check — `almi-monitor` has no
database credential on this machine. **UNKNOWN (U16):** one `select` answers it.

**And a FOURTH place that is not a file either: Search Console itself.** Whatever was submitted in
the past is still submitted — that is exactly what `sitemap-nationality-nurse.xml` is. **Fixing
the script changes what will be sent next; it does not withdraw what was sent before.**

### 11a.8 · The fix to `submit-sitemaps.mjs` — done, and it is not in a PR

**Three paths corrected**, each taken from that host's own live response rather than assumed:
`almistudy`, `almipte`, `almitoefl` → `sitemap-index.xml`. `almiworld.com` keeps
`sitemap_index.xml` (WordPress, measured 200 with 6 children) and `almiarchitect` keeps
`sitemap/0.xml` (measured 200 with 156 URLs; its `/sitemap-index.xml` is a 404).

**And a preflight guard, which is the part that matters:** before anything is submitted, every
feed URL is **fetched**. It must return **200** and parse as `<sitemapindex>` or `<urlset>`.
Redirects are refused on purpose — a 301 means the path in the list is a signpost, not the
sitemap. Anything failing is **not submitted**, is named with its reason, and the run exits 1. The
preflight also runs under `--dry-run`, so the list can be checked **without credentials**.

> **This defect survived for months for one reason: the script never asked whether what it was
> sending actually exists.** A submission is a promise that a URL exists; the promise is now
> checked before it is made.

**Verified after the change:** `10 reachable, 0 NOT submittable`, exit 0.
**RED proved:** `almipte` put back to `sitemap.xml` → `✗ HTTP 404 — this URL does not exist, so it
must not be submitted`, `9 reachable, 1 NOT submittable`, **exit 1**. Then restored.

🔴 **`almi-seo-ops` IS NOT A GIT REPOSITORY.** No `.git`, no remote, no history, no review, no CI —
so **the small PR the owner asked for has nowhere to go**, and the change was made in place with a
backup taken first. This is itself part of the answer to *"how did a stale path survive?"*: **there
was never a diff for anyone to read.** Putting it under version control is the owner's call and is
not done here.

**⚠️ Also measured, deliberately not acted on:** the script submits **10 hosts**; the registry knows
**24**. AlmiOET, AlmiDET, AlmiCELPIP and every language product are absent from it — yet AlmiOET has
240,328 URLs discovered, so **submissions are also happening by some other route**. Whether they
belong in this script is the owner's decision.

### 11a.9 · The dead submission — RECORDED, NOT ACTED ON

`sitemap-nationality-nurse.xml` is still **submitted** in Search Console and has read
**"Couldn't fetch" since 21 August**. Removing a submission is an action inside the owner's
console, so: **it will be removed from GSC by the owner.** Nothing was done to it here.

**It is Gate B's cheapest argument.** The submission *succeeded*. It has looked like success ever
since. The only thing that would ever have said otherwise is evidence read back from the search
engine — which is the entire point of Gate B.

> **The lesson stands and gets sharper: "submitted" is not a result. Neither is "Success".**
> **The only number that means anything is what the search engine says it kept.**

### 11a.7 · Two small discrepancies, recorded rather than smoothed over

| host | owner-reported discovered | I measured in the sitemap today | difference |
|---|---|---|---|
| AlmiPrep | 220,212 | **220,012** | **200** |
| AlmiDET (shape match) | 1,172,926 | **1,172,928** | **2** |
| AlmiPTE | 90,484 | 90,484 | 0 |
| AlmiWorld Hub | 101,459 | 101,459 | 0 |
| AlmiOET | 240,328 | 240,328 | 0 |

Most likely explanation: Google read those two sitemaps on a different day and the content moved.
**That is a guess, and it is labelled as one.** It matters only because it shows the two numbers
are **not** the same measurement — *discovered* is Google's count on Google's date; the sitemap's
`<url>` count is ours, today. **Gate B must always compare like with like, and record both dates.**

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
| 1 | **Preview and Production share one database** (§2b) | 🟠 **deferred by ruling, with a written trigger** | the database is EMPTY, so nothing is at risk today. The branch is created **before the first migration that creates a table worth losing**, and remembering that is MY job. The fix has **two halves** — a Neon branch **and** a separate Vercel Preview `DATABASE_*` set; half of it looks solved and changes nothing. Until then the WRITE LAW (§2c) is the whole of the protection |
| 2 | **Google Search Console: no property chosen, no access, no quota known** | 🔴 RED for Gate B | Gate B *is* GSC evidence. Without it, "indexed" is unmeasurable and the pause mechanism cannot exist |
| 3 | **Neon plan, storage limit and branch limit UNKNOWN** | 🟠 | the growth table in section 8 cannot become a cost, and the branch-per-preview fix for blocker 1 may or may not be available |
| 4 | **Worker execution layer UNDECIDED**, and every cost in section 7 is unverified | 🟠 | a crawler cannot be scheduled before its host exists; no paid option may be activated without the owner |
| 5 | **Case Study #1 needs a frozen corpus** (section 9) | 🟠 | most mapped defects are fixed; against the live site the test would find nothing and would decay |
| 6 | **12 products block AI crawlers, including `Google-Extended`, `GPTBot`, `ClaudeBot`** | 🟠 policy, not a bug | an AI-visibility programme cannot report on products that have opted out. The owner decides whether this stays |
| 7 | **AlmiPathway is unreachable** — no robots.txt, no sitemap | 🟡 | one of the 23 products cannot be audited at all |
| 8 | **22 of 23 products have no funnel instrumentation** | 🟡 | visibility can be tied to traffic but not to conversion outside AlmiOET |
| 9 | **AlmiOET's 240,328 pSEO pages declare `revalidate = false` and are served dynamically with caching switched off** (§11b) | 🔴 for cost | every crawler visit runs a function; the declared render mode is not the served one. This is a live product cost, found in Phase 0, and it is the owner's decision what to do about it |
| 10 | **`almi-seo-ops/submit-sitemaps.mjs` submits `/sitemap.xml` for almistudy, almipte and almitoefl — a 404 on all three** (§11a.2) | 🔴 | our own script tells Google to read a URL that does not exist. `almi-monitor` was corrected for this and the submitter was not |
| 11 | **`almioet`'s `sitemap-nationality-nurse.xml` is a stale submission, 404 since at least 21 August** (§11a.4) | 🟠 | small, live, and the cheapest demonstration of why Gate B exists |
| 12 | **The WRITE LAW is not yet in any code**, because no code exists (§2c) | 🟠 | it must land in the FIRST build PR, not after it |

---

## 13 · UNKNOWN register

**Rule: what is not known is written UNKNOWN. No blank cell is filled by inference.**

| # | UNKNOWN | why it is unknown | who can answer | evidence that closes it |
|---|---|---|---|---|
| U1 | ~~Neon **plan**~~ **ANSWERED (owner-reported, 10 Sep): Free.** Not read by me; recorded as his reading | — | — | closed unless the plan changes |
| U2 | Neon **storage limit** | " | **owner** | same |
| U3 | ~~Neon **branch limit**~~ **ANSWERED (owner-reported, 10 Sep): 10**, managed by the owner. This is why no branch is created today — see §2b | — | — | closed |
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
| U16 | Does the **almi-monitor Neon registry** still hold `/sitemap.xml` for any product? The seed FILE was corrected in Tune-Up 1, but the seed is append-safe and never overwrites existing rows — so the live rows may still carry the old path (§11a.7) | no database credential for almi-monitor on this machine | **owner** | one `select id, sitemapPath` against that registry |

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
| ✅ ~~Owner reads the Neon console (U1–U4)~~ | **$0** | **DONE — answered by the owner 2026-09-10: FREE plan, 10 branches per project, surplus branches deleted by hand. U1–U4 are closed** |
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
