# PHASE 0 — THE FROZEN GAP REGISTER

**11 September 2026.** The single register the frozen boundary requires:
**AUDIT ONCE → FREEZE GAP REGISTER → FIX → TARGETED VERIFY → CLOSE. No moving goalposts.**

**Everything is here. Nothing is duplicated elsewhere as a rival list.** The per-item documents
hold the working and the evidence; **this file holds the register**, and it is the one that is
frozen.

## The two registers, and the rule that keeps them apart

> **Connected product's missing data = PRODUCT DATA GAP.**
> **AlmiVisibility's missing generic mechanism = ALMIVISIBILITY CAPABILITY GAP.**
> **Phase 0 identifies, measures and documents both. It builds or fills neither.**

**No gap appears in both.** A third list — **OWNER ACTION** — holds the two items that are neither:
they are decisions or console work only the owner can do.

🔴 **Nothing in this register is fixed, and nothing in it is a request for permission.** A missing
capability is a gap, not a question.

---

# 0 · 🔴 OWNER RULINGS — FROZEN. NOT REOPENED BY ANY LATER AUDIT.

**Two questions this register raised were put to the owner and answered on 11 September 2026. They
are rulings, not opinions, and they are frozen here with their references.**

> ### 🔴 NO LATER AUDIT REOPENS THESE FOR RE-INTERPRETATION.
> Not this one, not the next one. **Two things, and only two, may disturb a ruling:**
>
> 1. **contradicting evidence**, or
> 2. **an owner-approved scope change.**
>
> In either case the response is to **write the reason down and stop — never to decide.**

## OWNER RULING 1 — `DOD-02` means isolation from PRODUCT databases

**Answers `Q-DOD-2`.** References: §11 *"Visibility-engine database is isolated from product
databases"*; ledger row *"`DOD-02` | Dedicated visibility data isolation"*.

| | |
|---|---|
| the requirement | isolation of AlmiVisibility's database **from connected product databases** |
| is it met? | ✅ **YES.** A dedicated Neon project satisfies it |
| **`DOD-02`** | 🔴 RED → ✅ **PASS** |
| what this is **not** | **Preview/Production separation is NOT `DOD-02`.** It is a separate infrastructure/safety requirement and **remains open as `B2`** |

⚠️ **This is the only status change the two rulings produce.** No other status moved, no gate was
touched, no threshold was moved.

## OWNER RULING 2 — Amendment 1 is a formal amendment, and it is now FROZEN

**Answers `Q-DOD-1`.** References: §12 *"The acceptance test may not be rewritten after
implementation to fit what the engine happens to detect"*; `CASE_STUDY_01_ACCEPTANCE_TEST.md`
Amendment 1; `PHASE_0_ITEM_6_CASE_STUDY_CONTRACT.md` §1.1a.

| | |
|---|---|
| the change | Case Study #1's **input / fixture**: live site → pinned, hash-verified corpus |
| its standing | ✅ **an OWNER-APPROVED AMENDMENT, not a rewrite** |
| the pass criteria | 🔴 **UNCHANGED: 6/6 RED and 0/3 CONTROL false positives** |
| its status now | ✅ **FROZEN** — it may not be amended again to suit an engine's output. §12 now protects this pass contract |

⚠️ **What the ruling did NOT do:** it closed the §12 question. **It did not pass the test.**
`DOD-15` stays 🟡 because **the test has never been run** (`CS-3`) — a closed question is not a
passed test.

## OWNER RULING 3 — every product is a subdomain of `almiworld.com`

**Answers `U-EST-1`**, raised by the Search Console ingest of 11 September 2026, which could measure
what the domain property covered but not what might sit outside it.

| | |
|---|---|
| the question | does any AlmiWorld product run on its **own registered domain**, outside `sc-domain:almiworld.com`? |
| the answer | 🔴 **NO.** All products are subdomains of `almiworld.com` |
| source | **OWNER RULING, 11 September 2026** |
| consequence | the DOMAIN property covers **the whole estate**. The **8 ZERO hostnames are real zeros** — hosts with no impressions, not hosts hiding outside the property |

> ### 🔴 EXPIRY CONDITION — WRITTEN DOWN, NOT LEFT TO MEMORY.
>
> **If any future product launches on its own registered domain, THIS ANSWER DIES THAT DAY.**
> That domain is then outside the property, its pages are invisible to every measurement built on
> this ruling, and **it needs its own Search Console property and its own grant.**
>
> A ruling with no expiry condition is a ruling that quietly stops being true. This one says when.

---

## OWNER RULING 4 — the KEY FEATURE CHECKLIST is the DONE standard

**Issued 11 September 2026** as `ALMIVISIBILITY_KEY_FEATURE_CHECKLIST_FINAL.docx`. Frozen verbatim
and hash-verified at `KEY_FEATURE_CHECKLIST_SOURCE.md`.

| | |
|---|---|
| what it is | the **completion instrument** for AlmiVisibility — 58 key features, a four-value status key, and a four-question evidence rule |
| its precedence | 🔴 **Where any internal status format of ours disagrees with it, THE CHECKLIST WINS** |
| what it does **not** do | it does **not** replace the Definition of Done or V5.1. The DoD says what the product must be, V5.1 says what may be built and when, **and the checklist says when we may call any of it done** |
| its first law | **"TICK LAW: A feature is not complete because code exists. Tick it only when real evidence proves it works."** |
| the standing tracker | `CHECKLIST_STATUS.md` — one row per item, all 58, in the checklist's own §4 format |

⚠️ **First measured status, 11 September 2026: ☑ 0 · ◐ 16 · ☐ 41 · ⚠ 1.** Of the 41 ☐, **32 are
`v0.1 SCOPE = OUT`** — excluded by V5.1's own boundary, which is the cost gate working, not a
failure.

🔴 **AND A CORRECTION TO A CONTRADICTION THIS AUDIT FOUND — recorded, NOT decided.**
`CS-5` below states that RED 2 has no frozen input and carries a clock. **Its premise is false.**
`case-study-01/corpus/MANIFEST.md` line 74 pins RED 2 to commit `07852f9`, and that commit
resolves today in `C:\Projects\almi-oet` with both halves of the evidence intact. A git commit is
immutable, so fixing the live page cannot unfreeze it. The error traces to
`CASE_STUDY_01_RUN_01.md` line 89, which quotes a phrase — *"live-confirmed"* — that appears
nowhere in the contract, having dropped *"— IN THE CORPUS"* from `✅ VERIFIED LIVE — IN THE
CORPUS`. **`CS-5` is left exactly as written: this register is frozen and its disposition is the
owner's.** See `CHECKLIST_STATUS.md` §"Item 52".

---

# 0A · 🔴 LAWS — GENERAL, AND THEY APPLY TO CODE NOT YET WRITTEN

## `LAW-BOUND-1` — EVERY BOUNDED OPERATION MUST PRINT ITS OWN BOUND NEXT TO ITS RESULT

**Raised by PR #35, 11 September 2026.**

That PR reported `requestCount=1` and `exhausted=true` — and did **not** print
`rowLimitPerRequest`. Both numbers were correct. **The report still could not verify itself**,
because "one request drained 1,527 rows" is only true if the per-request limit was above 1,527, and
the limit was nowhere on the page. A reader had to go and find the source.

> ### THAT IS THE 11 SEPTEMBER DEFECT IN A NEW COSTUME.
>
> The original was a cap that did not announce itself. This is a bound that does not announce
> itself. In both cases the output looks complete and the evidence for completeness is missing.

**The law:** any result produced under a limit — a row limit, a URL cap, a byte ceiling, a request
budget, a timeout — **prints that limit beside the result**, in the same report, every time.

**In force on:** `SearchQueryResult` (`rowLimitPerRequest`) and `CrawlRun` (`maxUrlsPerRun`).
Both are asserted by tests that read the emitted report text.

---

## `LAW-ORPHAN-1` — A MODULE IMPORTED ONLY BY ITS OWN TEST IS DEAD CODE

**Raised 12 September 2026, from two incidents of the same shape.**

1. `bin/placement-measure.mjs` imported constants that had been deleted. It threw on its first
   line from PR #20 onward and **nobody noticed for a day**.
2. `src/evidence/transitions.mjs` encoded the law that UNKNOWN never becomes PASS, was proved
   falsifiable by injection — and was **imported by nothing except its own test.**

> ### A GUARD THAT GOVERNS NO PRODUCTION PATH IS NOT A GUARD.
> Its tests pass, its coverage looks healthy, and it is doing no work at all.

**The law:** every module under `src/` must have at least one **non-test** importer. The census
lives in `test/entry-points.test.mjs` and fails the build. An exemption is permitted, must be
named in `ORPHAN_ALLOWLIST` with a written reason, and **the allowlist is empty today.**

---

# 0C · 🔴 A CORRECTION, RECORDED — THE 46 FACT RECORDS ARE RESTATED AS UNVERIFIED

**12 September 2026.** The checklist audit found `factCheckedOn` **null on all 46 records** while
the engine was being described as a *verified fact supply*. Key feature 15's PASS meaning requires
a verification date, and there was none.

| | |
|---|---|
| what changed | `verificationState` is **REQUIRED at construction**. A fact that will not declare `UNVERIFIED` or `VERIFIED` **throws**. `VERIFIED` without a date throws; `UNVERIFIED` carrying a date throws |
| what the 46 records now say | **`UNVERIFIED`** — declared, on every record |
| what did **not** change | their values, their sources, their tiers, their link/quote/fingerprint checks. **Nothing was deleted and no diff removed a line** (20 insertions, 0 deletions across 9 files) |

> ### 🔴 THE DATE WAS NOT BACKFILLED, AND THAT IS THE POINT.
>
> Writing today's date into `factCheckedOn` would have turned 46 items green in an afternoon. It
> would also have been **the exact failure key feature 50 forbids** — turning missing evidence into
> an observed fact. The records were never verified; now they say so.
>
> **This is a CORRECTION, not a REGRESSION.** Nothing got worse on 12 September. The registry
> stopped overstating what it had always been.

---

# 0B · DECISIONS — CRAWLER

Recorded as decisions, with their kind, their tier and their date. **A decision is not a gap and not
an UNKNOWN**, and it is not evidence either — it is a choice somebody made and can be held to.

| id | decision | kind | tier | date | state |
|---|---|---|---|---|---|
| **`D-CRW-1`** | execution layer = **GitHub Actions** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-2`** | hard cap = **500 URLs per run** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-3`** | **1 request/second, concurrency 1** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-4`** | 🔴 **THE FIRST REAL RUN REQUIRES THE OWNER'S GREEN** | owner | — | 12 Sep 2026 | ✅ **GRANTED — FOR ONE RUN ONLY** |

## 🔴 `D-CRW-4` — THE GREEN, AND ITS EXACT TERMS

**Granted by the owner on 12 September 2026.** Recorded here in full because a permission that is
remembered rather than written down becomes a standing one.

| | |
|---|---|
| what was granted | **ONE run.** Not a standing permission |
| URL ceiling | **at most 500** — the existing hard cap, **unchanged** |
| rate | **1 request/second, concurrency 1** |
| nature | **read-only.** No product repository is touched. Nothing is published |
| **a second run** | 🔴 **needs its own green.** This one does not carry forward |

### THE RUN THAT USED IT — 12 September 2026, GitHub Actions run `34662527129`

| | |
|---|---|
| execution layer | **GitHub Actions** (`D-CRW-1` proved by use, not assumed) |
| seeds | the evidence store's own 1,497 page rows — **item 4's output as item 1's input** |
| selection rule | `sort by impressions DESC, tie-break by URL ASC, take the first 500; per-host cap 150` |
| requested / fetched | **500 requested, 394 fetched** — 106 DISALLOWED by robots.txt and skipped |
| wall clock | **403 seconds** at 1 req/s, concurrency 1 |
| cap | **never exceeded.** `capReached=false`; the cap was not raised |
| coverage | 🔴 **PARTIAL** — see the correction below |
| cost | `amountState: UNKNOWN`. 394 billable requests on our own account, stated per host in words |
| corpus | 394 bodies, 38.07 MiB — **artifact `crawl-corpus-34662527129`, NOT committed** |
| records | 999, committed at `runs/crawl/first-real-crawl-2026-09-12.jsonl` (615 KiB, no bodies) |

**🔴 `U-CRW-IPv6` — ANSWERED BY MEASUREMENT.** The runner has **no IPv6 egress**: no global IPv6
address, no default IPv6 route, and a TCP probe returned `ENETUNREACH`. Therefore
`almipathway.almiworld.com`, which publishes **AAAA and no A record**, is
**`UNREACHABLE_NO_IPV6`** — a fifth state, recorded as such and never as `0`.

**🔴 A CORRECTION, APPENDED NOT EDITED.** The run recorded `coverageState: COMPLETE`. It is
**PARTIAL**: 500 URLs chosen from a 1,497 pool on a property with ~240,328 URLs, and 106 of the
500 never fetched. The old derivation read "the frontier drained" as "the site is covered". The
original record stands unaltered and a `crawl_run_correction` record supersedes it — rewriting it
would have destroyed the evidence that the derivation was wrong.

> ### 🔴 THE CAP WAS NOT RAISED FOR THIS, AND MUST NOT BE.
>
> `MAX_URLS_PER_RUN = 500` remains a module constant with no switch. The green authorises a run
> **within** the existing bound; it does not authorise changing the bound. The workflow demands
> both `live` and `owner_green` on **every** dispatch, so the grant cannot decay into a default.

> ### 🔴 `D-CRW-4` IS THE ONE THAT IS NOT DONE.
>
> The crawler exists, is tested, and **has never issued a request to any AlmiWorld host.** The
> workflow that would run it has **no schedule trigger** and cannot fire by itself. Until the owner
> gives `D-CRW-4`, every number the crawler has produced came from a local fixture server.

---

# 1 · ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence | state |
|---|---|---|---|
| **A1** | the boundary law verifies **vocabulary, not dependency direction** — a `src/` file could import a product through a neutral identifier and pass | Phase 0 report §3.1; verified independently: `src/` → `products/` imports **0** today | RECORD |
| **A2** | **every entry point is product-bound.** No runner accepts a product id or descriptor path as an argument; **7 of 16 `bin/` scripts resolve a product at import time** | Phase 0 report §3.2; `bin/distinguishing-census.mjs:45` | RECORD |
| **A3** | **portability is asserted, never demonstrated.** Every `registerProduct` call outside the one product sits inside `assert.throws`, and `registeredProducts()` returns a single entry | verification §3.3 | RECORD |
| **A4** | `package.json` is **one product's task list** — 13 scripts, 7 of them one product's workflow | Phase 0 report §3.4 | RECORD |
| **ISO-1** | **licence and gap registries are shared global namespaces.** Two tenants read each other's licence terms and declared gaps; registering a probe moved shared counters **7→8** and **12→13**. Redefinition is refused; **visibility is not** | items 1–2 §3.1, measured in memory, confirmed against beta-g's baseline | RECORD |
| **ANL-1** | **funnel evidence exists for 1 of 27 products and nowhere else**; no page-view analytics anywhere; AlmiVisibility reads neither | items 1–2 §4.3; `almi-oet`'s `FunnelEvent` table verified first-hand | RECORD |
| **SEO-1** | **no standing check of the public SEO surface.** Every figure in the sweep came from throwaway scripts kept outside the repository | items 1–2 §5.3 | RECORD |
| **DEP-1** | the repository **deploys on every push**, and **no CI** stands between a merge and that deployment | deployment §1.1–1.2, five events matched to the second | RECORD |
| **DEP-2** | 🔴 **a settled rule — AlmiVisibility runs behind auth — had nothing enforcing it, so it broke silently across four merges and went unseen.** All 163 tracked files were publicly downloadable; `/robots.txt` 404 | deployment §1.3 | RECORD — **owner has ruled; auth is being applied. Do not reopen** |
| **AUD-1** | **seven of the nine frozen items already had a document**, and two successive audits were written without reading it | items 1–2 §10 | RECORD |
| **DOC-1** | **no mechanism makes a summary follow a correction made to its own body.** Observed **three times**, on three different facts: the GSC row, the Neon plan, and `DOD-03A`'s status | item 3 §2.2; item 5 §2; item 7 §2.1 | RECORD |
| **CRW-1** | **no crawler or research worker exists in any form, on any host** | item 4 §6 | RECORD |
| **CRW-2** | 🔴 **Gate C polices third-party crawlers; nothing applies it to a crawler we would operate ourselves** on our own ISR pages at our own expense | item 4 §4 `R1` | RECORD |
| **CRW-3** | **no politeness or rate-limit policy exists**, and none has been measured | item 4 §4 `R4` | RECORD |
| **DB-1** | **no persistence exists** — no schema, no table, no migration — so every growth figure is a projection against a store that has never held a row | item 5 §5 | RECORD |
| **DB-2** | **the plan's ceiling was never compared against the growth model**, because a correction in §15 never reached §8 | item 5 §2 | RECORD |
| **DB-3** | **the Free plan has three limits and any one suspends compute. Only storage is modelled**; egress and compute are not | item 5 §4 | RECORD |
| **CS-1** | the corpus manifest **cannot verify itself unaided** — one entry's hash field is a pointer, its size is another page's figure, and the size field is string length under a name that says bytes | item 6 §2.3 | RECORD |
| **CS-2** | the **34 exhibit copies are pinned by commit SHA only**; no content hash, so an edited copy would go unnoticed | item 6 §2.4 | RECORD |
| **CS-3** | **the acceptance test has never been run** — attempted 11 Sep and **NOT RUNNABLE**: nothing implements the contract. `bin/acceptance-test.mjs` is a different instrument (corridor Gate-A splice, verdict KEEP/REJECT) | `CASE_STUDY_01_RUN_01.md` §2 | RECORD |
| **CS-4** | **no runner exists that reads the corpus AND the four exhibits and scores 6/6 + 0/3** | same §6 | RECORD |
| **CS-5** | 🔴 **RED 2 has no frozen input** — *"live-confirmed"* only, no exhibit, no corpus page. **A frozen test with one unfrozen input is not frozen.** ⏳ **AND IT HAS A CLOCK: the day that page is fixed, the defect is unreproducible FOR EVER and the Case Study is capped at 5/6 — a permanent FAIL with no engine cause.** Two ways out, **both the owner's: (a) freeze a snapshot — one fetch, before the page is fixed; (b) remove RED 2 formally, pass mark becomes 5/5 + 0/3.** No fetch was made and no option chosen | `CASE_STUDY_01_RUN_01.md` §3 · `V51_REMEASURE.md` §D | RECORD — **owner ruling; option (a) expires without warning** |
| **DOC-2** | 🔄 **RE-MEASURED against V5.1 §26, which wins: 18 deliverables, and ZERO exist.** The two I had counted as present are **inputs, not deliverables** — V5.1 lists them under *"existing artifacts to ingest rather than rebuild"*. **6 are partly covered under other names; 12 have nothing at all** | `V51_REMEASURE.md` §A | RECORD |
| **GATE-1** | **four of seven gate families have no architectural home**: semantic, cannibalization, technical, cost | item 7 §3 | RECORD |
| **GATE-2** | 🔴 **Gate C is a gate, not a governor.** It judges cost; nothing caps, meters or refuses spend | item 7 §2 | RECORD |
| ~~DOD-MAP-1~~ | ~~the DoD is mapped from a status table, not its own text~~ | ✅ **CLOSED 11 Sep** — the text is at `DOD_FROZEN_TEXT_SOURCE.md`, hash-verified, and the map is rebuilt against §1–§5A | CLOSED |
| **FACT-1** | §5A requires a derived fact to store **its formula and its input fact IDs**. No such field exists | `DOD_MAP_AGAINST_TEXT.md` §1 | RECORD |
| **FACT-2** | §5A requires distinguishing **verified / derived / inference / recommendation / UNKNOWN**. The registry distinguishes acquisition confidence instead; **"derived" and "recommendation" have no representation** | same §1 | RECORD |
| **FACT-3** | §5A requires conflicts to be **detected**. One can be **recorded**, and one is — **written by hand.** Nothing detects one | same §3 | RECORD |
| **GATE-3** | §4: *"must not lower a frozen gate merely to increase page output"* — **nothing enforces it.** The thresholds are constants; only a written record has ever held them | same §2 | RECORD |
| **GATE-4** | §4 asks for a **specific** URL justification; the check accepts **any non-empty string** — a single character passes | same §2 | RECORD |
| **PAGE-1** | §3 makes five gates a **conjunction** before a new page. Two do not exist, so **the precondition for creating any page is unsatisfiable today** | same §4 | RECORD |
| **SUB-1** | 🔴 **our own submitter sends `/sitemap.xml` for three products where it 404s.** `almi-monitor` was corrected for this and the submitter was not | architecture report §12 blocker 10, §11a.2 | RECORD |

**24 capability gaps.**

---

# 2 · PRODUCT DATA GAPS

| id | gap | evidence | state |
|---|---|---|---|
| **B3** | **licence terms unread for 7 registry sources** — a **publish** blocker, not an engine blocker | `node bin/facts.mjs census` → `UNREAD 7`; a test counts the debt | RECORD |
| **B4** | **the registry covers 2 of 12 declared variants** — which is why the distinguishing census reports `UNCOMPARABLE 14 of 14`, **correctly** | `coverage()` → declared 12, built 2, missing 10 | RECORD |
| **PD-SEO-1** | `almiarchitect` declares `/sitemap.xml` in `robots.txt`; **both** that path and `/sitemap-index.xml` return **404** | items 1–2 §5.2, both paths probed | RECORD |
| **PD-SEO-2** | 🔴 `almihq` declares **no sitemap** and serves **`200 text/html` byte-identical to its own homepage** at both sitemap paths, **zero `<loc>`** | items 1–2 §5.2, SHA-256 of both bodies compared | RECORD |
| **PD-SEO-3** | `www.almiworld.com` declares an **underscore** sitemap **on a different host**, while its own `/sitemap-index.xml` 404s | items 1–2 §5.2 | RECORD |
| **PD-DNS-1** | three referenced hosts **fail DNS** — `almipathway`, `almixyz`, `swedish` | items 1–2 §5.1 | RECORD |
| **PD-STALE-1** | `almioet`'s `sitemap-nationality-nurse.xml` is a **stale submission, 404 since at least 21 August** | architecture report §11a.4 | RECORD |
| **PD-COST-1** | 🔴 **AlmiOET's 240,328 pSEO pages declare `revalidate = false` and are served dynamically with caching off** — every crawler visit runs a function | architecture report §11b | RECORD — **a live product cost; the owner decides** |
| **PD-AI-1** | **12 products' `robots.txt` disallow the AI crawlers an AI-visibility programme would measure**, including `Google-Extended`, `GPTBot`, `ClaudeBot` | architecture report §4.2 | RECORD — **policy, not a defect. The owner decides** |
| **PD-FUNNEL-1** | **26 of 27 products have no funnel instrumentation**, so visibility can be tied to traffic but not to conversion outside one product | items 1–2 §4.3 | RECORD |

**10 product data gaps.**

---

# 2A · 🔴 PHASE 1 IS BLOCKED — THE SPEC'S OWN SENTENCE

**`V51_MASTER_BUILD_COMMAND_SOURCE.md`, line 556, verbatim:**

> *"**Phase 1 cannot begin while Search Console coverage/authorization, analytics availability,
> worker execution layer, database isolation/capacity, and reusable existing artifacts remain
> UNKNOWN or UNDECIDED.** Record each answer with a date."*

| condition | state, 11 Sep 2026 | row | who |
|---|---|---|---|
| Search Console coverage / authorization | 🔴 **UNKNOWN** — the Domain property exists; **read-only API access is not granted** | **`B1`** | **owner** |
| analytics availability | 🟡 **answered, and adverse** — funnel evidence on **1 of 27** products; no page-view analytics anywhere | `ANL-1` | recorded |
| worker execution layer | 🔴 **UNDECIDED** — options, costs, limits and risks measured and written; **only the decision is missing** | `CRW-1` | **owner** |
| database isolation / capacity | 🟡 isolation from product DBs **PASS** (Owner Ruling 1) · 🔴 **capacity: the v0.1 workload needs 288 % of the Free plan in month one**, and preview shares it | `DB-2`, `DB-3`, **`B2`** | **owner** |
| reusable existing artifacts | ✅ **answered** — 11 assets named with their state | items 1–2 §6 | recorded |

> ## 🔴 PHASE 1 IS BLOCKED. TWO OF THE FIVE ARE UNKNOWN OR UNDECIDED, AND BOTH ARE OWNER DECISIONS.
>
> **No attempt was made to resolve them, route around them, or start Phase 1 anyway.**

---

# 3 · OWNER ACTION — neither register, and not a request

| id | item | why it is neither | who |
|---|---|---|---|
| **B1** | **read-only Search Console API access.** The Domain property **already exists**; this is the one thing open | it is console work and a credential handover, not a mechanism anyone can build | **owner** |
| **B2** | **preview/production database split** — the Neon branch **and** moving `DATABASE_*` off "All Environments" | ⚠️ **either half alone changes nothing and looks solved.** Deferred by the owner's 10 September ruling, with a written trigger: **before the first migration that creates a table worth losing** | **owner** |

---

# 4 · PREREQUISITES

| # | prerequisite | for | who |
|---|---|---|---|
| **PRQ-1** | read-only Search Console API access | any demand evidence, S11 | owner |
| **PRQ-2** | preview/production database separation, **both halves** | any AlmiVisibility persistence | owner |
| **PRQ-3** | first-party analytics on at least one more host | outcome/funnel learning | owner decides, then later phase |
| **PRQ-4** | a deployment surface that serves something intended | the operator interface | later phase |
| **PRQ-5** | a persistence store | growth/retention | later phase, after PRQ-2 |
| **PRQ-6** | licence terms read for 7 sources | **publish** of any page citing them | owner, or a person with a browser |
| **PRQ-7** | per-variant claim supply for 10 of 12 variants | a cohort larger than two | connected product |
| **PRQ-8** | a test gate before merge | safe landing — **merges deploy** | later phase |
| **PRQ-9** | crawler/worker hosting | S4/S5 at estate scale | owner (cost), later phase (build) |

---

# 5 · ITEM 9 — EVERY UNKNOWN, IN FOUR FIELDS

**Rule: what is not known is written UNKNOWN. No blank cell is filled by inference.**

## 5.1 · Closed by this Phase 0 — recorded, not deleted

| # | was | closed by |
|---|---|---|
| **U1** | Neon plan | owner, 10 Sep: **Free** |
| **U2** | Neon storage limit | 🔄 **measured 11 Sep: 0.5 GB/project**, and exceeding it **suspends compute** — `neon.com/pricing` |
| **U3** | Neon branch limit | owner, 10 Sep: **10** |
| **U5** | GSC property type | owner, 10 Sep: a **Domain property already exists** |
| **U9** | worker option costs | 🔄 **measured 11 Sep**, with URLs and date — item 4 §2 |
| **U-DB-1** | do preview and production share a database | 🔴 **yes**, architecture report §2b — *never unknown, only unread* |
| **U-DB-2** | which Postgres provider | **Neon**, same source |
| **U-DEP-3** | are preview deployments public | ✅ **no — 302 to SSO.** Only merges publish |
| **U-EST-1** | does any product run on its **own registered domain**, outside the domain property | **OWNER RULING 3, 11 Sep: NO** — every product is a subdomain of `almiworld.com`. 🔴 **Carries an expiry condition**: a future product on its own domain kills this answer that day |

## 5.2 · Open

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U4** | Neon compute / autosuspend settings | console never opened | the Neon console | **owner** | before any crawl |
| **U6** | GSC URL Inspection quota | not measurable without access | the documented quota, read on the day | **owner** | after PRQ-1 |
| **U7** | GSC data lag | " — and **Gate B's waiting period depends on the real lag, not an assumed one** | the first week of real data | **owner**, then measurable | after PRQ-1 |
| **U8** | **Vercel plan** and its per-unit prices | `vercel teams ls` names the team, not the plan; no read-only CLI command exposes it | one read of the billing page, with a date | **owner** | when the plan changes |
| **U10** | whether the AI-crawler block on 12 products is intended | it is a policy, not a defect | a written ruling | **owner** | — |
| **U11** | whether AlmiPathway is meant to be live | 🔴 **PREMISE CORRECTED 11 Sep 2026 — the old text said "domain does not resolve", and that is false.** Measured: `almipathway.almiworld.com` **RESOLVES OVER IPv6 ONLY** — an AAAA record exists, there is **no A record**, and it was **not reachable over IPv4 from the measuring machine**. Registry still says `active:false`. **The row stays OPEN; only the premise changed** | a written ruling | **owner** | — |
| **U-CRW-IPv6** | **does the GitHub Actions runner have IPv6 egress?** | 🔴 **NOT MEASURED.** It matters because `U11`'s host is IPv6-only: if the runner has no IPv6 egress, our crawler **cannot reach that host at all** — and that is a **THIRD state**, distinct from both `FORBIDDEN` (a grant we lack) and `ZERO` (a host with no data). Collapsing it into either would be the same error the estate table exists to prevent. **Not guessed** | one dispatch of a workflow that reports the runner's own egress addressing | later phase, or **owner** | if the execution layer (`D-CRW-1`) changes |
| **U12** | endpoint isolation for products with no local env file | no evidence on this machine, **and the answer must come from a HOST comparison, never a credential** | per-project project id | **owner** | — |
| **U13** | whether AlmiOET's 240,328 pSEO pages are wanted at all | a product decision with a real cost attached | a ruling — *a product DECISION is not a defect* | **owner** | — |
| **U14** | Gate A's exact sibling-overlap algorithm as specified | *"≤ 40 %"* was never written as a definition | a written definition, **before implementation** | **owner** | before `DOD-06`/`08` work |
| **U15** | what `almi-swiss` is — a repository with no product in the registry | not in the seed, and its host is outside the earlier inventory | a one-line ruling: product, experiment or dead | **owner** | — |
| **U16** | whether `almi-monitor`'s live registry still holds `/sitemap.xml` | the seed file was corrected; **the seed is append-safe and never overwrites existing rows** | one `select` against that registry | **owner** | before the next submission run |
| **U-ENV-1** | which of 34 Vercel projects are live, retired or scratch | projects (34) exceed linked repos (27) and live hosts (27) | per-project domain assignment and last production deployment | **owner** | next estate change |
| **U-SEO-1** | whether the 25 healthy sitemaps are **submitted and fetched** | submission state lives in Search Console | the coverage report | **owner** | after PRQ-1 |
| **U-SEO-2** | whether `almihq`'s homepage-as-sitemap has been **indexed as one** | a `200 text/html` may or may not have been consumed | Search Console, or a crawl log | **owner** | after PRQ-1 |
| **U-DEP-1** | whether the 01:23 deployment was caused by the #23 merge | timing matched to 3 seconds; **commit-to-deployment attribution was not read** | a read-only deployment list with commit SHAs | **owner**, or a later sweep | next merge |
| **U-DEP-2** | whether the published tree was **crawled or indexed** | unlinked, no `robots.txt`; discovery depends on external linking | Search Console for the host | **owner** | after PRQ-1 |
| **U-ISO-1** | isolation of **costs** and **learning** | neither exists, so neither can leak | the first cost record and the first learning record | later phase | when either exists |
| **U-GSC-1** | the real Search Console data lag *(duplicate of U7, kept for traceability)* | — | — | **owner** | after PRQ-1 |
| **U-DOC-1** | whether the same correction lags elsewhere | only three facts were traced across the document | a sweep of every fact stated in both a summary and a body | later phase | — |
| **U-COST-1** | **which GitHub plan**, and therefore the Actions allowance | `gh api user` returns `plan: null`; billing returns 404 needing the `user` scope, **and widening a token's scope is a change, not a measurement** | one read of the billing page, or a scoped token the owner grants | **owner** | when the plan changes |
| **U-COST-3** | Hetzner's prices | the public page renders figures client-side and returned placeholders. **Recorded as a refusal; not retried by another route** | a person with a browser | **owner**, or later phase | if Option B is chosen |
| **U-COST-4** | **crawl volume** — the denominator every price multiplies | no cohort is authorised | an authorised v0.1 scope | **owner** | when a cohort is authorised |
| **U-COST-5** | what our own crawler would cost us in ISR regeneration | Gate C quantifies the mechanism; nobody applied it to a crawler we operate | Gate C run against a named crawl plan | later phase | when a crawl plan exists |
| **U-DB-3** | whether **1.5 KB per page per pass** is real | it is an estimate; **every page count scales inversely with it** | measure one real snapshot row | later phase | first write |
| **U-DB-4** | current Neon storage consumed | measured as empty apart from scaffolding; **the bytes were never read** | the console's usage panel | **owner** | before any crawl |
| **U-DB-5** | the Launch tier's **included** storage, if any | the page states a per-GB rate and **no allowance**; inventing one would be a projection | Neon's plan comparison | **owner** | if the plan changes |
| **U-DB-6** | whether **egress** (5 GB free) binds before storage | egress was never modelled | model or measure one pass | later phase | when a crawl plan exists |
| **U-DB-7** | what **compute** (100 CU-hours) a crawl consumes | compute is a separate limit with the **same suspension penalty** | measure one pass | later phase | when a crawl plan exists |
| **U-CS-1** | whether `bin/acceptance-test.mjs` implements **this** contract | it exists; its behaviour against 6/6 + 0/3 has never been observed | one run against the frozen corpus | later phase | first run |
| **U-CS-2** | whether the 34 exhibit copies still match their source commits | pinned by commit SHA; **no content hash for the copies** | hash each copy against the file at its pinned commit | later phase | before the first run |
| **U-CS-3** | whether the 4 unfixed-side commits still contain the defect as described | the SHAs resolve; **presence was not re-verified** | read each file at its pinned commit | later phase | before the first run |
| **U-CS-4** | whether 9 pages can exercise 6 REDs and 3 CONTROLs | 3 are controls, leaving **6 for six defects — one-to-one, no margin** | map each RED to its page | later phase | before the first run |
| **U-DOD-1** | whether the DoD text has changed since the statuses were written | mapped from a handoff table, **not from a frozen DoD document in this repository** | the frozen DoD document | **owner** | when the DoD changes |
| **U-DOD-2** | what `DOD-06`'s "semantic" means — embeddings or a rule | named, never specified | the DoD's own wording | **owner** | before `06` |
| **U-DOD-3** | what `DOD-17` must explain, and to whom | names an audience, not a contract | the owner's description of what he needs to see | **owner** | before `17` |
| **U-DOD-4** | whether `DOD-18`'s "rollback" means content, database or deployment | three mechanisms, one word | the DoD's wording | **owner** | before `18` |

**36 open · 8 closed.**

---

# 6 · WHAT THE REGISTER SHOWS WHEN IT IS READ AS A WHOLE

| | |
|---|---|
| capability gaps | **32 open** of 33 rows — `DOD-MAP-1` **CLOSED**; +6 from reading the DoD text, +3 from attempting Case Study #1 (`CS-4`, `CS-5`, `DOC-2`) |
| product data gaps | **10** |
| owner actions | **2** |
| prerequisites | **9** |
| open UNKNOWNs | **36** |
| **DoD items complete** | **1 of 21** — `DOD-02`, by **OWNER RULING 1** |

⚠️ **The "1 of 21" follows from OWNER RULING 1 and from nothing else.** It is recorded here because
a summary that lagged its own document's ruling is exactly `DOC-1`, and this register has now
recorded that failure three times. **No other status moved.**

> ### 🔴 THE SHAPE, STATED ONCE
> **The engine that exists is well built and narrow.** One stage of twelve is complete, three gates
> are frozen and measured, and 248 tests pass. **Twelve DoD requirements have no architectural home
> at all.**
>
> **And the two things that would move the most are not engineering:** read-only Search Console
> access unblocks four DoD items, and **claim supply for ten more variants** unblocks the cohort.
> Neither is code.

⚠️ **One pattern appears in every item and deserves naming once:** `DOC-1` was found **three
times**, on three unrelated facts, always the same way — **a correction landed in a body and never
reached the summary that people actually read.** Twice it made work look necessary that was already
done; once it made a known fact look unknowable.

---

## WHAT THIS REGISTER DID NOT DO

- 🔴 **Nothing fixed.** `A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, `CS-1`, `CS-2`, `SUB-1`, CRLF — **all
  RECORD**. `DEP-2` is closed by the owner's ruling and **is not reopened**.
- **No claim, no page, no build, no schema, no refactor, no activation, no spend, no production
  change, no S2/S3, no Phase 1 code, no connected product's data filled.**
- **No new GREEN requested.** Every missing capability is written as a gap.
- **No gap in two registers.** The two owner actions are held in a third list and are not counted
  as either.
- **No blank cell filled by inference.** Where a thing is not known it says UNKNOWN, and where a
  measurement was refused — the GitHub billing scope, Hetzner's client-rendered prices — **the
  refusal is recorded rather than routed around.**
