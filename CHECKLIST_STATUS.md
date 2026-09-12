# ALMIVISIBILITY — KEY FEATURE CHECKLIST · STATUS

**Audited 11 September 2026 against the repository at branch `v0.1/checklist-freeze-and-status`,
base `50e81da` (PR #36 merged). 349 tests green.**

Governing standard: `KEY_FEATURE_CHECKLIST_SOURCE.md` (hash-verified, 58 features).

> ## 🔴 TICK LAW
> **"A feature is not complete because code exists. Tick it only when real evidence proves it
> works."**

---

## THE HEADLINE

**Governed since 12 September 2026 by `PASS_BOUNDARIES_SOURCE.md` (owner ruling, hash-verified),
as amended by `PASS_BOUNDARIES_AMENDMENT_1.md` and `PASS_BOUNDARIES_AMENDMENT_2.md`.**
The four-value vocabulary below has been replaced by **seven**. Every row's four-part boundary and
its verdict live in **`CHECKLIST_BOUNDARIES.md`**, generated from the frozen rulings.

| state | before (4-state) | after (7-state) |
|---|---|---|
| **NOT-STARTED** | 33 | **3** |
| **BUILT-NOT-PROVED** | 24 | **17** |
| **TESTABLE-NOW** | — | **0** |
| **VERIFIED-PASS** | 0 | **3** |
| **FAILED** | — | **1** |
| **BLOCKED-UNKNOWN** | 1 | **6** |
| **DEFERRED** | — | **28** |
| **total** | 58 | **58** |

> ### 🔴 AMENDMENT 2 — 12 SEPTEMBER 2026, NIGHT. FAILED IS NOW A STATE, AND ITEM 14 IS IN IT.
>
> | state | before Amendment 2 | after the RULING only | after the WORK |
> |---|---|---|---|
> | NOT-STARTED | 3 | 3 | 3 |
> | BUILT-NOT-PROVED | 18 | 17 | 17 |
> | TESTABLE-NOW | 0 | 1 | 0 |
> | VERIFIED-PASS | 3 | 3 | 3 |
> | FAILED | 0 | 0 | **1** |
> | BLOCKED-UNKNOWN | 6 | 6 | 6 |
> | DEFERRED | 28 | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 14, No Blind Regeneration.** FAILED is not
> progress and is never folded into another count.
> It is also **worth more than BUILT-NOT-PROVED**: it is a row whose test was run against its own
> boundary. It means we looked.
>
> **Zero rows reached VERIFIED-PASS in this change.**
>
> - **moved ONLY because a RULING changed:** item 14, BUILT-NOT-PROVED → TESTABLE-NOW. The owner
>   narrowed its boundary and gave it teeth; its earlier result no longer applied. Not a tick.
> - **moved because WORK HAPPENED:** item 14, TESTABLE-NOW → FAILED. The re-test ran against the
>   new contract and its FAILURE condition *defaults to writing* was met at two write sites.

> ### 🔴 THREE TICKS — THE FIRST THIS PROJECT HAS EVER AWARDED
>
> **Items 8, 15 and 48.** Each has all four parts of its boundary answered with real-data
> evidence, and each was RED-proved by sabotage that landed in the intended test. They are the
> only three rows in the whole ledger that **reached a pass because work happened**; item 14 is
> the fourth row moved by work and it FAILED; the other 33 moved when the vocabulary changed and
> are counted apart.
>
> **Item 14 did NOT tick, and that is the other real outcome.** Sat again against Amendment 2,
> its FAILURE condition is *met*: two write sites default to writing. It is FAILED, in its own
> column, instead of hiding among the unproven.
>
> **DEFERRED IS NOT A TICK AND NEVER COUNTS AS ONE.** A v0.1 feature cannot FAIL for lacking
> something frozen v0.1 deliberately excludes — and cannot be given a final-product PASS either.
> The 28 DEFERRED rows are not progress and nothing was built for any of them.

**Of the 28 DEFERRED items, all 28 are class `D` in the owner's ruling** — deliberately excluded.
A row is DEFERRED **only** where the frozen document says so; the build fails on any other
deferral. Three items are genuinely NOT-STARTED and in scope: **47, 57, 58**.

> ### 🔴 12 SEPTEMBER 2026, ITEM 15 INGEST — SIX ROWS REWRITTEN, **NOTHING MOVED**
>
> | | before | after |
> |---|---|---|
> | ☑ VERIFIED PASS | 0 | **0** |
> | ◐ BUILT / NOT PROVED | 24 | **24** |
> | ☐ NOT STARTED | 33 | **33** |
> | ⚠ UNKNOWN / BLOCKED | 1 | **1** |
> | scope IN · PARTIAL · OUT | 25 · 4 · 29 | **25 · 4 · 29** |
>
> All 46 fact records were checked by a named person and 32 came back VERIFIED. **Rows 15, 16,
> 17, 46, 49 and 50 were re-examined and every one kept its status.** Rows **17 and 50 did not
> change at all** and are listed here so that "touched" is not read as "advanced".
>
> **Item 15 in particular did not move, and not for want of evidence.** §3 Q4 asks whether
> integrated behaviour was proved against real evidence. The facts are real and the verdicts are
> real — but *the engine verified nothing*. A human filled in a spreadsheet and we ingested it;
> there is no re-verification loop, and the first recheck falls due **2026-12-11** with nothing
> scheduled to run. Colouring 32 rows green is not the same as owning a supply.
>
> Putting real data through the machinery also **found four defects that every fixture had
> passed over** (`D-FACT-1..4` in the gap register), two now fixed and two open. That is the
> honest yield of the day, and it is worth more than a status change would have been.

> ### 🔴 ZERO ☑ IS THE HONEST NUMBER, AND IT IS NOT A CLAIM THAT NOTHING WORKS.
>
> 182 top-level tests pass, several guards have been proved falsifiable by injection, and one
> real authenticated Search Console read went end-to-end into the evidence store. **None of that
> is a ☑ under this checklist**, because §3 question 4 asks whether the test proved **integrated
> behaviour against real evidence**, and for every candidate item something in its own PASS
> meaning is still unproven — usually because the thing it must isolate, cache, promote or
> publish **does not exist yet**.
>
> A ☑ here has to survive an independent audit. Awarding one early is how a checklist stops
> meaning anything.

### v0.1 scope tally

| scope | count | meaning |
|---|---|---|
| **IN** | 25 | inside V5.1's v0.1 audit slice |
| **PARTIAL** | 4 | one component in, the rest deferred |
| **OUT** | 29 | excluded by the v0.1 boundary |

---

## 🔴 A CORRECTION TO THIS PR'S OWN BRIEF, BEFORE THE TABLE

The build command cited **"V5.1 §821 (v0.1 boundary)"**. **There is no §821 in the frozen
source.** `V51_MASTER_BUILD_COMMAND_SOURCE.md` line 821 is a prose paragraph headed *TECHNICAL
SEO*, not a boundary.

The real boundary is **§62 — "Suggested v0.1 Boundary — And What It Deliberately Excludes"**
(line 546), whose operative sentence is line 553, reinforced by the **`v0.1 CONTAINS` /
`v0.1 EXCLUDES` table** (line 974) and the **`V0.1 — PROVE THE AUDIT SLICE FIRST`** list
(line 592). **Every scope citation below points at those**, because a law needs the line it
actually came from.

**§32** (Cost & Mass-Page Disaster Prevention Gate) is cited where it governs, and it is real.

---

## HOW TO READ A ROW

- **Status** — one of the **seven** states (six from `PASS_BOUNDARIES_SOURCE.md`, FAILED from
  Amendment 2), written as WORDS and
  never as symbols: a broken glyph in a Windows terminal becomes a wrong status, and this file is
  read in terminals. 🔴 **`TESTABLE-NOW` is not a pass** — the input exists and the falsifiable
  test has not been run. Between it and `VERIFIED-PASS` there is exactly one thing: the test, run.
- **The four-part boundary** — INPUT · EXPECTED · FAILURE · EVIDENCE, verbatim from the owner's
  ruling, is in **`CHECKLIST_BOUNDARIES.md`**, one section per feature. It is generated, not
  typed, so it cannot be paraphrased. No row reaches `VERIFIED-PASS` with any part unanswered.
- **v0.1 SCOPE** — `IN` / `OUT` / `PARTIAL`, cited to the V5.1 section that puts it there.
  **Nothing is marked N/A.** N/A is a justification and justifications are the owner's.
- **Verified date** — for a ☑ this would be the date evidence proved a pass. **For every other
  status it is the date the STATUS was measured**, which is what all 58 currently carry.
- **Blocker/UNKNOWN** — for every ◐, the *specific* missing test or measurement. Not "needs work".

| # | Feature | Status | v0.1 SCOPE | Evidence | Verified date | Verifier | Blocker/UNKNOWN | Reopen reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Product Intake & Isolation | BLOCKED-UNKNOWN | IN — §62 l.553 provider-neutral foundation; DoD `DOD-02` | `test/product-registration.test.mjs`, `test/product-isolation.test.mjs` (16 tests, two real registered tenants, adversarial accessors, non-empty guard). `src/product.mjs` | 2026-09-11 | Claude (repo audit) | **No cost record and no learning record exists for any product** (`U-ISO-1`), so two of the four things the PASS meaning names cannot be isolated or tested | — |
| 2 | Human Question Discovery | DEFERRED | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 3 | Keyword & Search-Language Discovery | DEFERRED | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 4 | Localized Human Thinking | DEFERRED | OUT — v0.1 EXCLUDES l.974 "corridor engine (§6, §15)" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 5 | Intent & Question Clustering | DEFERRED | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 6 | Axis Discovery | DEFERRED | OUT — discovery is "Search Intelligence"; §62 l.553 | Axis **declaration** exists and is tested (`test/product-registration.test.mjs`: "a product must say what its pages vary BY"). **Declaration is not discovery** | 2026-09-11 | Claude (repo audit) | — | — |
| 7 | Market Measurement | DEFERRED | OUT — §62 l.553; phase table "Search Intelligence" | `DISTINGUISHING_SUPPLY.md` is a one-off measurement, not an engine | 2026-09-11 | Claude (repo audit) | — | — |
| 8 | HEAVY / THIN / EMPTY Discipline | VERIFIED-PASS | OUT — component of item 7 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 9 | Search Console / Analytics Intelligence | BUILT-NOT-PROVED | IN — §62 l.553 "Search Console ingestion when authorized"; v0.1 CONTAINS l.974 (§9) | **5 of 7 dimensions INGESTED**, each pull exhausted, `dataState=COMPLETE`, bounds stored [rowLimitPerRequest=25000, maxRequests=20]: queries (314 query rows, 543 query×page rows), pages (1,497), impressions, clicks, CTR. **Countries: the `country` and `country`×`query` pulls are BUILT** (same pagination law, bounds and cost record; tested against a fake provider) **and have NOT RUN** against the real property. `node bin/gsc-dimensions.mjs` censuses the store | 2026-09-12 | Claude (repo audit) | 🔴 **Countries not run** — the read-only key was not available to the session that built the pull; the owner runs it. **Downstream outcomes BLOCKED, not failed:** Search Console has no outcome dimension; the engine's only credential is webmasters.readonly; 0 of 36 product repositories use an analytics package; the one first-party funnel-event table stores a path and a user id and no search source, and the engine may read no product database. **Does not tick** — six of seven would not either | Amendment 2 PR, 12 Sep 2026 |
| 10 | Technical SEO Audit Engine | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 "Crawler and page inventory (§8)" | Seven of nine sub-requirements run over the 394 pages. **Part 0 adds the ORIGIN of the noindex finding**: all 134 come from one conditional gate in `almi-cv-v2`, traced to commit `50f8c20` (17 Aug 2026), and the commit's own "near-duplicates by construction" premise was measured — same-role siblings average 0.685 similarity, **none reaches 0.8** | 2026-09-12 | Claude (repo audit) | 🔴 **CANNOT REACH VERIFIED PASS IN v0.1 — a scope fact.** Rendering and crawl depth are structurally impossible: every record is `RAW_HTML`, and we seeded from Search Console and never followed links | hissa 3, 12 Sep 2026 |
| 11 | Existing Page Inventory | BLOCKED-UNKNOWN | IN — v0.1 CONTAINS l.974 (§8) | 495 real PageRecords from the 12 Sep run, **and the 500→495 arithmetic is now reconciled ON THE PAGE**: 5 pairs of seed URLs redirected to one final URL, each pair listed. `runs/crawl/first-real-crawl-2026-09-12.jsonl` | 2026-09-12 | Claude (repo audit) | 🔴 **"MAINTAIN" IS STILL UNTESTED** — one run only, by the terms of `D-CRW-4`, so stability across runs has never been observed. Committed PageRecords still carry empty edge lists | report view, 12 Sep 2026 |
| 12 | Duplicate / Thin / Template Detection | BUILT-NOT-PROVED | IN — required by Case Study #1 (§60) which v0.1 CONTAINS l.974 | **Four checks, run over the real 394-page corpus**: exact-duplicate 0, thin 118, near-duplicate 5, template-dominance 2, plus 6 UNKNOWN. Shell subtraction is **defined, printed in every result, and tested against a page whose shell is larger than its body**. Median shell share 12.5%, median 468 unique body words. A test fails the build if any check emits a recommendation (item 8) | 2026-09-12 | Claude (repo audit) | **Detection only — nothing BLOCKS duplicate or thin inventory**, and the PASS meaning says "detect and block". There is no publish path to block, so the second half cannot be built or proved in v0.1 | hissa 2b, 12 Sep 2026 |
| 13 | Cannibalization Prevention | BUILT-NOT-PROVED | PARTIAL — detection rides on the GSC ingest (v0.1 CONTAINS l.974); prevention needs a URL proposer, which v0.1 excludes | 🔴 **IT RUNS NOW.** 543 query×page rows over 314 distinct queries → **16 cannibalization findings**, each naming the query, the competing URLs and their positions. Two `/learn/` pages compete on "ielts pte score" (pos 70 and 75) — genuine content cannibalization, not corridor noise | 2026-09-12 | Claude (repo audit) | **Detection only.** The PASS meaning is "check whether an existing URL already satisfies the same intent BEFORE proposing a new URL" — **v0.1 proposes no URLs**, so the prevention half has nothing to act on and cannot be built or proved here | hissa 2c, 12 Sep 2026 |
| 14 | No Blind Regeneration | FAILED | IN — the inventory is v0.1 CONTAINS l.974 (§8) | **Sat again against Amendment 2.** (a) 0 product-repository writes · (b) 0 publish paths · (c) 0 bulk generation · (e) rediscovered URLs fold to their EXISTING `page_id` on the real 495-page run, sabotage-proved. (d) the widened census finds **8 write sites in 7 files** (the #47 census found 6 and was blind to two), all 7 named in `config/permitted-page-writers.mjs`, reconciling exactly, RED-proved both ways | 2026-09-12 | Claude (repo audit) | 🔴 **FAILURE MET — DEFAULTS TO WRITING.** `bin/report.mjs` writes on every run with no gate; `bin/nursing-chain.mjs` writes its cache of fetched sibling pages with no flag. Also recorded, not decided: all 7 writers take their destination from an operator flag that nothing contains to this repository. One register reason is UNKNOWN. Leaves FAILED only by a re-run that passes, or an owner ruling | Amendment 2, 12 Sep 2026 |
| 15 | Verified Fact Supply Engine | VERIFIED-PASS | IN — v0.1 CONTAINS l.974 "Source-of-truth and provenance layer (§14)" | 🔴 **THE FACTS ARE NOW CHECKED. ALL 46, BY A NAMED PERSON, ON A NAMED DATE.** beta-g read an official source for every record and returned a verdict: **32 VERIFIED, 14 UNKNOWN** (6 contested by a second official page, 4 true-but-incomplete, 4 source unreachable). Ingested as 456 added lines with **0 deletions — the proof that no value was amended**. A third state `UNKNOWN` was added because two could not tell "checked and contradicted" from "never opened". All 32 verified rows carry a recheck date that **governs freshness** (proved on a day the old and new rules disagree) | 2026-09-12 | Claude (repo audit) | 🔴 **STILL ◐, AND NOT BECAUSE 32 ROWS CHANGED COLOUR.** §3 Q4 asks for *integrated behaviour against real evidence*, and the integration is the part that does not exist: **the engine verified nothing — it ingested a spreadsheet a human filled in by hand.** There is no re-verification loop, so when the first recheck falls due **2026-12-11 nothing runs**. And ingesting real data exposed four defects the fixtures could not (`D-FACT-1..4`), two still open. A supply *engine* must produce supply; this one received a delivery | item 15 ingest, 12 Sep 2026 |
| 16 | Fact Conflict & Freshness | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 (§14) | Freshness now runs on **real ingested dates**: 32 records governed by a human-set recheck date, windows of 90 days (fees and document lists) and 180 days (requirements), earliest due **2026-12-11**. The 14 UNKNOWN records deliberately carry **no** recheck date — an expiry implies good-until-then. Conflict detection still never auto-resolves and retains both values | 2026-09-12 | Claude (repo audit) | 🔴 **THE PREVIOUS NOTE SAID "ZERO CONFLICTS EXIST". THAT IS NOW FALSE, AND WORSE THAN IT SOUNDS.** Six real conflicts exist and **`detectConflicts` returns 0 on all six** (`D-FACT-1`): it only sees two records of OURS disagreeing, and every real conflict is registry-vs-a-second-official-page we do not hold. The detector is not broken, it is **blind to the only shape we actually have** — pinned by a test with a firing control, deliberately not worked around. Freshness is real; conflict is fixture-only *and now known to be unreachable* | item 15 ingest, 12 Sep 2026 |
| 17 | Derived Fact Provenance | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 (§14) | Derived facts store a **re-executable formula** (not a description) plus every input's `fact_id`; `recomputeDerived` compares stored against recomputed and reports a mismatch as a **finding, never a repair**; and a derived fact **cannot be constructed more verified than its weakest input** — sabotage-proved twice | 2026-09-12 | Claude (repo audit) | 🔴 **NOT ONE DERIVED FACT EXISTS IN THE REGISTRY — UNCHANGED BY THIS PR.** All 46 records are primary, so 0 were recomputed: nothing rose and nothing fell. **This row was re-examined and did not move**, recorded so that "touched" is not mistaken for "advanced". It also explains half of `D-FACT-4`: with 0 derived facts and 0 findings citing a fact id, the dependency walk has an **empty population**, and its zero is not a clean bill of health | item 15 ingest, 12 Sep 2026 |
| 18 | Competitor Intelligence | DEFERRED | OUT — §16 is "Search Intelligence"/later; §62 l.553 | `DISTINGUISHING_SUPPLY.md` measured one competitor once (0.08–0.13). Not an engine | 2026-09-11 | Claude (repo audit) | — | — |
| 19 | Content / Information-Gap Intelligence | DEFERRED | OUT — §12, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 20 | Action Decision Engine | DEFERRED | OUT — §17/§18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 21 | URL Right-to-Exist Test | DEFERRED | OUT — gates page generation, excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 22 | Best Answer Architecture | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 23 | Answer-First Content | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 24 | Original Information Gain | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | Gate A's sibling-overlap measure is a partial instrument for uniqueness, but it does not measure value beyond competitors | 2026-09-11 | Claude (repo audit) | — | — |
| 25 | Page Quality Gate | BUILT-NOT-PROVED | PARTIAL — Gate A exists as the audit slice's quality instrument; the *publishing* gate is OUT (l.974) | `src/gate-a/*`, `bin/gate-a.mjs`, 11 tests. `/nursing` passed Gate A including ROLLOUT with no threshold moved | 2026-09-11 | Claude (repo audit) | Gate A covers **overlap, facts and shell only**. No right-to-exist, cannibalization, technical-readiness or source-integrity check exists — four of the seven the PASS meaning names — and there is no publish path to gate | — |
| 26 | Internal-Link Intelligence | BUILT-NOT-PROVED | PARTIAL — link capture rides on the crawler (IN, l.974); opportunity-finding is later | 🔴 **THE 340 ORPHAN UNKNOWNs ARE RESOLVED.** Edges read back out of the corpus artifact: 19,926 links, **2,010 pages-with-inbound resolved**, and broken-internal-link now runs (0 findings — every internal link we could measure returned 200) | 2026-09-12 | Claude (repo audit) | **The committed PageRecords still carry empty edge lists** — the graph lives in the artifact, which expires 2026-12-11. And no opportunity-finding exists; the PASS meaning's first half ("find useful internal-link opportunities") is unbuilt | hissa 2c, 12 Sep 2026 |
| 27 | Entity Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 28 | International / Local SEO | DEFERRED | OUT — v0.1 EXCLUDES l.974 corridor engine (§6, §15) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 29 | SERP Hook / CTR Intelligence | DEFERRED | OUT — phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 30 | GEO / AEO / AIO / AI Visibility | DEFERRED | OUT — phase table "GEO/AEO/AIO"; v0.1 EXCLUDES AI Visibility Lab l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 31 | AI Source Influence Graph | DEFERRED | OUT — v0.1 EXCLUDES l.974 "AI Visibility Lab (§11)" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 32 | Earned Authority / Off-Page Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 33 | Content Decay & Pruning | DEFERRED | OUT — acts on published inventory; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 34 | Content Brief Engine | DEFERRED | OUT — phase table "Controlled pSEO" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 35 | Safe CC Command Generation | DEFERRED | OUT — §18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 36 | Owner Authorization Gates | BUILT-NOT-PROVED | IN — §32 cost/mass-page gate; safety applies to every phase | `src/write-law.mjs` (2 tests: production needs both flags; local needs `--confirm`). `D-CRW-4` gate: `bin/crawl.mjs` refuses `--live` without `--i-have-the-owners-green` (exit 3), workflow refuses without `owner_green`. 2 workflow tests | 2026-09-11 | Claude (repo audit) | 🔴 **The CLI refusal is demonstrated by hand, not by a test**, and the workflow guard is asserted only as YAML *text* — no test executes either. A guard nothing exercises is a guard nobody has proved | — |
| 37 | Controlled Publishing | DEFERRED | OUT — v0.1 EXCLUDES l.974 "Page generation, in every form" | none — and l.610 says the absent feature *is* the gate | 2026-09-11 | Claude (repo audit) | — | — |
| 38 | Indexability Preflight | BUILT-NOT-PROVED | IN — §62 l.553; the preflight assesses pages that already exist | **Built in ASSESS MODE** over the 394 pages: 158 BLOCKED, 210 UNKNOWN, 26 passing every measurable condition. Six conditions: reachable 200, not robots-disallowed, not noindexed, canonical resolving, in a sitemap, content in raw HTML. **`INDEXABLE ≠ INDEXED` is written in the code and printed with every result**, and a test fails the build on any wording that promises indexing, ranking or citation | 2026-09-12 | Claude (repo audit) | **It assesses; it does not gate.** Nothing is published in v0.1, so the "before publication" half of the PASS meaning has no publication to precede. 210 pages are UNKNOWN because at least one condition could not be measured | hissa 2c, 12 Sep 2026 |
| 39 | Real Indexation Learning | DEFERRED | OUT — post-publication; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 40 | Controlled Scaling | DEFERRED | OUT — phase table; expansion is a later gate | none | 2026-09-11 | Claude (repo audit) | — | — |
| 41 | Failed-Cohort Backpressure | DEFERRED | OUT — requires cohorts, which require publishing (excluded l.974) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 42 | Re-crawl / Re-test Loop | BLOCKED-UNKNOWN | PARTIAL — the crawler is IN (l.974); the loop is not named in the v0.1 list | The crawler can be re-run by hand. No comparison, no PASS/FAIL record, no scheduling (the workflow is `workflow_dispatch` only, deliberately) | 2026-09-11 | Claude (repo audit) | No re-test or diff mechanism exists | — |
| 43 | Experiment / Change Impact | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 44 | Funnel / Business Outcome Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 45 | Cost Governor | BUILT-NOT-PROVED | IN — §32; §33 cost ledger | **Held under real load, 12 Sep:** 500 selected against a 1,497 pool, cap never exceeded, per-host budget applied (almicv 150 of 482), 1 req/s over 403s. Every host's billable traffic stated in words in the run summary. `CostRecord.amountState = UNKNOWN` | 2026-09-12 | Claude (repo audit) | 🔴 **The cap holds; nothing tracks money.** No ledger, no metering, no spend figure — the run's own cost is UNKNOWN because Gate C has never been applied to a crawler we operate (`U-COST-5`, `GATE-2`) | first real crawl, 12 Sep 2026 |
| 46 | Cache Before Re-Research | BUILT-NOT-PROVED | IN — §41, named a hard gate | Built and measured. The same fact requested three times **reaches the source exactly once** (sabotage-proved). Outside its applicability scope or its freshness window it is a **MISS, not a stretch**. Hits and misses are both counted and the **freshness window prints beside the hit rate** (LAW-BOUND-1). 🔴 **AND IT NOW REFUSES WHAT IT SHOULD.** Over the real registry, 46 facts × 2 requests → **64 hits, 28 misses, hit rate 69.6%**, misses named: `UNKNOWN_CONFLICT` 12, `UNKNOWN_INCOMPLETE` 8, `UNKNOWN_SOURCE_UNREACHABLE` 8 | 2026-09-12 | Claude (repo audit) | 🔴 **THE PREVIOUS ROW REPORTED 92 HITS / 0 MISSES / 100%, AND THAT NUMBER WAS THE DEFECT** (`D-FACT-3`). `get()` checked freshness and nothing else, so all 14 records a human had just marked UNKNOWN were served as clean hits — **including an NMCN fee one official page puts at ₦66,875 and another contradicts** — against this module's own header law that a conflicted fact is never silently used. Fixed; **the hit rate fell to 69.6% and the fall is the improvement**, which is why hit rate must never be the measure. Remaining blocker unchanged: **nothing researches yet**, so even 69.6% measures a pre-loaded registry, not a research loop | item 15 ingest, 12 Sep 2026 |
| 47 | Paid Provider Controls | NOT-STARTED | IN — §62 l.555 "must not activate paid providers by default" | No paid provider is wired anywhere in the repository. The one external API in use (Search Console) is free and read-only | 2026-09-11 | Claude (repo audit) | Satisfied **by absence, not by a control**: there is no budget, cap, kill switch or test that would stop a paid provider being added tomorrow | — |
| 48 | Idempotency & Retry Safety | VERIFIED-PASS | IN — safety; §62 l.553 audit slice | **A1 FIXED (12 Sep):** `measurement_key` (target+method+content, **no clock**) plus `store.appendIfNew`, which appends a **re-sighting** instead of a duplicate payload. Proved against the REAL API: run 4 → **0 new, 4 re-sightings**. Also fixed a second clock hidden *inside* the `sites.list` value | 2026-09-12 | Claude (repo audit) | **The "at most one retry, NEVER on a 4xx" rule still has no test.** The code is right; nothing would catch it being changed | A1 fix, 12 Sep 2026 |
| 49 | Audit Trail & Provenance | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 (§14) | **The evidence → claim chain now runs end to end on real data.** 107 Issues written, each citing the crawl observation AND the stored robots.txt or DNS observation it was derived from. **0 broken chains** in the rendered report. The four robots.txt files are stored as observations with hashes, not looked up. **Two further Issues added 12 Sep from the verification return**, both verdict `UNKNOWN` not `FAIL`, citing 6 observations whose `method` is `human-verification-return` and whose target is the **verdict row we hold** — 🔴 *not* the official pages, which we never fetched. A content hash attributed to a page we never retrieved would be indistinguishable from a real one | 2026-09-12 | Claude (repo audit) | **No Source record has been written** — the §623 tier layer is still unexercised; the new Issues' `sources` carry fact ids, which is not the same thing. And **no issue has ever been CLOSED or SUPERSEDED**, so the lifecycle half of the audit trail remains untested — the two new Issues open, they do not close | item 15 ingest, 12 Sep 2026 |
| 50 | OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation | BUILT-NOT-PROVED | IN — DoD §170; v0.1 CONTAINS l.974 | 🔴 **THE UNKNOWN BRANCH HAS NOW FIRED ON REAL DATA FOR THE FIRST TIME — 346 real UNKNOWNs**, in three distinct reason codes: `NEEDS_RENDERED_HTML` (340 orphan + 2 empty-body), `TOOL_FAILED` (unrecognised layout). Before this PR it was fixture-proved only. All four labels are live. 🔴 **AND UNKNOWN IS NOW A FIRST-CLASS STATE IN THE FACT LAYER TOO** — 14 real records carry it with three declared reasons, and the constructor **refuses an UNKNOWN with no date or no reason**, because an undated UNKNOWN is indistinguishable from a record nobody opened | 2026-09-12 | Claude (repo audit) | **F23 still polices an empty population** — 0 of 46 records carry `life.supersedes`, so no real record has passed through the transition guard. The label layer is proved; the transition layer is not. Note the 14 new UNKNOWNs **do not** exercise F23: they are a verification standing, not a supersession | item 15 ingest, 12 Sep 2026 |
| 51 | Explainability | BUILT-NOT-PROVED | IN — §62 l.553 "minimum internal report/action view" | The view now renders **107 issues with their evidence chains**, each labelled, each traceable to the observations it came from. Every finding carries a `summary` saying which rule in which user-agent group produced it | 2026-09-12 | Claude (repo audit) | The PASS meaning names **priority, confidence and cost per recommendation** — none of the three exists. Findings carry a severity; nothing ranks them, scores confidence, or costs them | hissa 2a, 12 Sep 2026 |
| 52 | Case Study Acceptance Test | BLOCKED-UNKNOWN | IN — v0.1 CONTAINS l.974 "Case Study #1 acceptance test (§60)" | `CASE_STUDY_01_ACCEPTANCE_TEST.md`, `case-study-01/corpus/MANIFEST.md`, `case-study-01/exhibits/` (34 files, 4 exhibits) | 2026-09-11 | Claude (repo audit) | 🔴 **NOT RUN = NOT TESTED.** `CS-3`: the test has never been executed. See the contradiction resolved below — **`CS-5`'s premise is false**, and the register, `CASE_STUDY_01_RUN_01.md` and `V51_REMEASURE.md` all carry the false version | contradictory evidence found — see §"Item 52" |
| 53 | Cross-Product Portability | BUILT-NOT-PROVED | IN — §62 l.555 provider-neutral foundation; boundary law | `tools/product-boundary.mjs` + 13 tests: **`src/` names no product in code, 0 lines**, with an independent `git ls-files` census of the population. `products/almi-oet/product.mjs` declares axis+variants | 2026-09-11 | Claude (repo audit) | **Only one real product exists in `products/`.** Portability is proved by a static boundary scan and by fixture tenants — **no second declared product has been operated end-to-end** | — |
| 54 | Cross-Product Isolation Test | BLOCKED-UNKNOWN | IN — DoD `DOD-02`; §62 l.553 | `test/product-isolation.test.mjs`: adversarial — "B cannot read A's licence terms by name", "every accessor refuses the other tenant's licence", plus a non-empty guard so it cannot pass vacuously | 2026-09-11 | Claude (repo audit) | **Isolation is proved for licences and gaps only.** No cost record and no learning record exists (`U-ISO-1`), so two of the four things the PASS meaning names cannot be tested at all | — |
| 55 | Security / Secrets / Recovery | BUILT-NOT-PROVED | IN — §37 API-key & secret architecture; DoD | Key path via `GSC_SERVICE_ACCOUNT_KEY_FILE`; scope is a frozen `webmasters.readonly` constant with no setter; nothing derived from the key is printed, logged, hashed or length-measured; append-only store + `supersedes` as the recovery model | 2026-09-11 | Claude (repo audit) | 🔴 **The no-leak property is verified by a manual grep, not by a test** — nothing would catch a future change that logged key material. No rollback/recovery procedure is documented or exercised | — |
| 56 | Desktop + Mobile Owner Experience | BLOCKED-UNKNOWN | IN — DoD v0.1 "dashboard/report works on desktop and 430px" | An owner-facing surface now exists. It declares `width=device-width`, a `@media (max-width:430px)` breakpoint, and `overflow-x:auto` on wide tables so the body never scrolls sideways — all asserted by test | 2026-09-12 | Claude (repo audit) | 🔴 **NOT VERIFIED BY LOOKING.** Chrome's screenshot injection timed out on every attempt, including on a trivial `<h1>probe ok</h1>` page — the extension, not this page. The structure is asserted; **the appearance is unverified** and a structural assertion is not a visual check | report view, 12 Sep 2026 |
| 57 | Final Independent Audit | NOT-STARTED | IN — checklist §1; DoD v0.1 | This document is the **first status baseline**, not the final audit | 2026-09-11 | Claude (repo audit) | Cannot run while 16 items are ◐ and 1 is ⚠; and it must be *independent*, which a self-audit is not | — |
| 58 | DONE Declaration | NOT-STARTED | IN — checklist §6, owner sign-off | none | 2026-09-11 | Claude (repo audit) | Requires every applicable item ☑ or justified N/A with no frozen blocker. **0 items are ☑**, and N/A justifications are the owner's — none exist | — |

---

## 🔴 ITEM 52 — THE CONTRADICTION, RESOLVED FROM THE REPOSITORY

Two documents in this repository disagreed about whether RED 2 has a frozen input.

**`CASE_STUDY_01_RUN_01.md` and `V51_REMEASURE.md` are the wrong ones — and the error has already
propagated into the frozen gap register as `CS-5`.**

### The evidence that settles it

| | |
|---|---|
| `case-study-01/corpus/MANIFEST.md` **line 74** | `**RED 2** … ✅ **YES** \| src/lib/oet/professions.ts:1 at commit 07852f9, against docs/sources/ at the same commit` |
| the pin | `07852f9e87c4273c5486445986251d11e415ecdf`, MANIFEST line 19 |
| **the pin resolves today** | `git cat-file -t` in `C:\Projects\almi-oet` → `commit`. `git show 07852f9:src/lib/oet/professions.ts` line 1 carries the CBLA / UK NARIC claim verbatim; `git ls-tree 07852f9 docs/sources/` holds only `README.md` |
| `CASE_STUDY_01_ACCEPTANCE_TEST.md` line 171 | `Status: ✅ VERIFIED LIVE — IN THE CORPUS` |

**A git commit is immutable.** Fixing the live page creates a *new* commit and cannot touch
`07852f9`. **`CS-5`'s "clock" does not exist.**

### How the error was made

`CASE_STUDY_01_RUN_01.md` line 89 attributes to the contract the phrase **"live-confirmed"**.
**That string appears nowhere** in the acceptance test or the manifest. The real status line is
`✅ VERIFIED LIVE — IN THE CORPUS`. **Document B kept "VERIFIED LIVE" and dropped "— IN THE
CORPUS"**, turning *"still reproducible live AND pinned"* into *"only live"*. It then read
"has no directory in `exhibits/`" as "has no pin" — RED 3 would have failed the same test, and
escaped only because it happens to have visible `.html` files in `corpus/pages/`.

### What Document B got right, and it is narrow

RED 2 has **no byte-level copy inside this repository** — its evidence is an external-repo commit
reference. If `almi-oet` and its remote were both lost, RED 2's input would be gone while RED
1/4/5/6 would survive as copies. **That is a backup concern, not an expiring clock**, and
`MANIFEST.md` lines 25–26 record the omission as deliberate: *"copying it here would only create
a second thing to drift."*

🔴 **I have NOT edited `CS-5`.** The register is frozen and its closure rule reserves that to a
ruling. The contradictory evidence is recorded beside the row; the disposition is the owner's.

---

## BORDERLINE CALLS — every one, and which way it went

**The rule applied: when in doubt, the LOWER status.** Recorded because the flattering direction
is the one nobody re-checks.

| # | the call | resolved | why |
|---|---|---|---|
| **15** | Verified Fact Supply Engine looked like the strongest ☑ in the list — 46 real records, F1–F22 enforced, integrated through Gate A and the page chain | **☑ → ◐** | The PASS meaning says *"verification date"*. `factCheckedOn` is **null on all 46 records** and a test pins it at zero. Link/quote/fingerprint dates are not a fact-check date |
| **50** | The brief named this the strongest ☑ candidate, and the data-shape half really is live (a real 403 → FORBIDDEN with `rowCount: null`) | **☑ → ◐** | `grep` shows `transitions.mjs` is imported **only by its own test**. The `UNKNOWN→PASS` law currently governs no production code path. Honest answer to §3 Q4: the transition half is four good unit tests |
| **54** | Cross-Product Isolation is a genuinely adversarial suite with a non-empty guard | **☑ → ◐** | It proves isolation of *licences and gaps*. *Costs* and *learning* do not exist (`U-ISO-1`), so half the PASS meaning is untestable rather than passing |
| **10** | Technical SEO Audit Engine — is a crawler with no detectors "not started" or "built"? | **☐ → ◐** | ◐ is the *higher* status here, so this is the one call I resolved upward. Justification: 35 tests and a working capture layer make "NOT STARTED" plainly false. The blocker names exactly what is absent |
| **47** | Paid Provider Controls — no paid provider exists, so the requirement is arguably met | **☑ → ☐** | Satisfied by absence is not satisfied by a control. Nothing would stop one being added tomorrow, and there is no test |
| **36** | Owner Authorization Gates — I ran the CLI refusal myself and saw exit 3 | **☑ → ◐** | My having run it once is not evidence in the repository. No test executes the CLI or the workflow guard |
| **6** | Axis Discovery — the axis mechanism exists and is well tested | **kept ☐, scope OUT** | Declaration is not discovery. Marking it PARTIAL would have let a built *declaration* flatter an unbuilt *discovery* |
| **25 / 26 / 42** | Three items where one component is in the v0.1 slice and the rest is not | **scope PARTIAL** | Using OUT would have hidden real gaps behind the boundary; using IN would have counted deferred work as missing |
| **11** | Existing Page Inventory works end-to-end against the fixture server | **☑ → ◐** | Integrated against a fixture is not integrated against reality. No real URL has ever entered it |
| **48** | Idempotency — content-derived ids are exactly this property | **☑ → ◐** | Testing my own claim found the opposite: re-running the ingest **appends duplicates**, because `observation_id` includes `observed_at` |

---

## WHAT THIS DOCUMENT IS NOT

- **Not the Final Independent Audit** (item 57). It is a self-audit and says so in every Verifier
  cell.
- **Not a set of N/A rulings.** Nothing is marked N/A. That is the owner's instrument.
- **Not a reopening of the gap register.** `CS-5`'s contradictory evidence is recorded; the row is
  untouched.
