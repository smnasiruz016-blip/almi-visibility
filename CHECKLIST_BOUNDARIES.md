# ALMIVISIBILITY — THE 58 PASS BOUNDARIES AND THE SIX-STATE LEDGER

> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/checklist-boundaries.mjs` rebuilds it.
> Every boundary below is read out of `PASS_BOUNDARIES_SOURCE.md`, whose body is verified
> against sha256 `16c580160391eabb14a4d6754edfe18fe1def936384cf831d300640ef73d9e5c`. Nothing here is retyped, so `verbatim` is a
> property of the mechanism rather than a promise about anyone's typing.

Frozen source verified: **YES** · features **58**
(sequence 1..58) · classes **P=24 S=6 D=28**

## Precedence

> The **KEY FEATURE CHECKLIST** states WHAT each feature must do.
> **PASS BOUNDARIES** states EXACTLY WHEN it may be ticked.
> Where any internal practice disagrees with either, **THEY WIN**.
> A boundary changes **only by owner ruling**, recorded with its date and reason.

---

## THE HEADLINE — BEFORE AND AFTER

| state | before (4-state) | after (6-state) |
|---|---|---|
| **NOT-STARTED** | 33 | **3** |
| **BUILT-NOT-PROVED** | 24 | **18** |
| **TESTABLE-NOW** | 0 | **0** |
| **VERIFIED-PASS** | 0 | **3** |
| **BLOCKED-UNKNOWN** | 1 | **6** |
| **DEFERRED** | 0 | **28** |
| **total** | 58 | **58** |

### 🔴 THE MOST IMPORTANT LINE IN THIS DOCUMENT

> **3 row(s) changed because work happened.** Listed in (i) below.

#### (i) changed because WORK HAPPENED

| # | feature | from | to |
|---|---|---|---|
| 8 | HEAVY / THIN / EMPTY Discipline | NOT-STARTED | **VERIFIED-PASS** |
| 15 | Verified Fact Supply Engine | BUILT-NOT-PROVED | **VERIFIED-PASS** |
| 48 | Idempotency & Retry Safety | BUILT-NOT-PROVED | **VERIFIED-PASS** |

#### (ii) changed ONLY because the vocabulary changed

| move | count | features |
|---|---|---|
| NOT-STARTED → DEFERRED | 28 | 2, 3, 4, 5, 6, 7, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 39, 40, 41, 43, 44 |
| BUILT-NOT-PROVED → BLOCKED-UNKNOWN | 4 | 1, 11, 54, 56 |
| NOT-STARTED → BLOCKED-UNKNOWN | 1 | 42 |

**Did not move: 22** — 9, 10, 12, 13, 14, 16, 17, 25, 26, 36, 38, 45, 46, 47, 49, 50, 51, 52, 53, 55, 57, 58

---

## 🧪 THE TESTABLE-NOW WORK QUEUE

🔴 **TESTABLE-NOW IS NOT A PASS.** The input finally exists; the falsifiable test has not
been run. Between here and VERIFIED-PASS there is exactly one thing: the test, run, with
its evidence. Each row names the single test that would settle it.

---

## 🔴 SIX BOUNDARIES THE DOCUMENT DOES NOT STATE IN FULL

§4 rules the split features as `v0.1 PASS boundary` / `deferred` tables rather than in the
four-part form. **These six therefore cannot reach VERIFIED-PASS as the ruling stands** —
the contract guard refuses it, and correctly.

**They are not filled in.** Writing the missing parts myself would manufacture a boundary
the owner never ruled, which the repository would then enforce as if he had. This is a
question for the owner, recorded as one.

| # | feature | class | parts the document does not state |
|---|---|---|---|

---

## ALL 58 — BOUNDARY, VERBATIM, AND VERDICT

### 1 · Product Intake & Isolation

**BLOCKED-UNKNOWN** · class `P` · ruled in `§6` · was BUILT-NOT-PROVED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | two declared products, and an accessor from each reaching for the other's data, evidence, cost and learning records. |
| **EXPECTED** | each of the four record classes is reachable only from its own product. |
| **FAILURE** | any cross-product read succeeds, **or** a class does not exist to be isolated. |
| **EVIDENCE** | adversarial accessor tests over non-empty populations of all four classes. |

**Verdict —** the boundary needs adversarial tests over NON-EMPTY populations of all four private classes. Evidence and facts are populated; COST and LEARNING records do not exist, and learning is itself deferred (items 39–41 are class D). 🔴 The ruling flags this explicitly only on item 54, but item 1 carries the identical four-class requirement — recorded as my judgement, not as the document's words

### 2 · Human Question Discovery

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a declared subject and legitimate public question evidence. |
| **EXPECTED** | real questions, goals, confusions and likely follow-ups are discovered and stored with provenance. |
| **FAILURE** | questions are invented, or sourced from the product's own marketing. |
| **EVIDENCE** | the source of every stored question, with its read date. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 3 · Keyword & Search-Language Discovery

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | owned search data plus legitimate public search evidence. |
| **EXPECTED** | keywords, long-tail wording, synonyms and local phrasing discovered; **no keyword ever becomes a page by itself.** |
| **FAILURE** | a keyword is promoted to a URL without an intent decision. |
| **EVIDENCE** | the cluster records, and the absence of any keyword→URL path. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 4 · Localized Human Thinking

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the same goal expressed from two or more countries. |
| **EXPECTED** | local phrasing and reasoning are researched; **country is a research lens, never an automatic URL axis.** |
| **FAILURE** | a country multiplies URLs without evidence of materially different useful content. |
| **EVIDENCE** | the local-wording records and their sources. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 5 · Intent & Question Clustering

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a set of differently worded questions with the same underlying intent. |
| **EXPECTED** | they cluster into one intent; local wording is preserved, not erased. |
| **FAILURE** | distinct intents merge, or identical intents stay split. |
| **EVIDENCE** | the cluster with its members and a held-out check. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 6 · Axis Discovery

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the subject's real evidence. |
| **EXPECTED** | axes (profession, role, stage, origin/destination, language, locality) are **discovered and tested**, not assumed. |
| **FAILURE** | an obvious axis is hard-coded by habit without evidence. |
| **EVIDENCE** | the evidence behind each accepted axis and each rejected one. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 7 · Market Measurement

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a market or segment. |
| **EXPECTED** | SUPPLY, VISIBILITY/REACH, DEMAND, AUDIENCE/NEED and WORTHINESS measured **separately**. |
| **FAILURE** | any two are conflated — above all, supply reported as demand. |
| **EVIDENCE** | five separate measurements with five separate methods. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 8 · HEAVY / THIN / EMPTY Discipline

**VERIFIED-PASS** · class `P` · ruled in `§6` · was NOT-STARTED (work)

| part | the owner's words |
|---|---|
| **INPUT** | a corpus of pages. |
| **EXPECTED** | the labels describe **observed content supply only**. |
| **FAILURE** | any of the three is converted, silently or otherwise, into a demand or opportunity conclusion. |
| **EVIDENCE** | a test that fails the build if a supply label emits a recommendation. |

**Verdict —** all four parts answered on real data. **INPUT** the real 495-page corpus of 12 September, 389 with a stored body. **EXPECTED** the labels are a supply census and nothing else: HEAVY 269 · THIN 118 · EMPTY 0 · UNKNOWN 108 (106 no stored body, 2 empty in raw HTML), and the run states in its own output that these say nothing about demand. **FAILURE** not met — 0 of 550 real findings carries a recommendation field or any demand word. **EVIDENCE** `test/supply-labels.test.mjs` fails the build if a supply label emits one, RED-proved twice (an injected 'opportunity' and an injected `recommendation` field), each landing in the intended test

### 9 · Search Console / Analytics Intelligence

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | an authorized property and the seven dimensions the PASS meaning names: queries, pages, **countries**, impressions, clicks, CTR, **downstream outcomes**. |
| **EXPECTED** | all seven ingested, paginated to exhaustion, with every bound printed. |
| **FAILURE** | any dimension missing, or any result claiming completeness it cannot show. |
| **EVIDENCE** | row counts, request counts, bounds, and `dataState` per pull. |
| **NOTE** | "where authorized and available" — a dimension no tool can supply is `⚠`, not a failure. |

**Verdict —** of the seven named dimensions, downstream OUTCOMES has no tool behind it — the ruling's own NOTE makes that ⚠ rather than a failure. But COUNTRIES is suppliable by the Search Console API and simply has not been ingested (2 mentions in the whole evidence store), so work we can do remains. Lower of the two readings taken

### 10 · Technical SEO Audit Engine

**BUILT-NOT-PROVED** · class `S` · ruled in `§4+A1`

| part | the owner's words |
|---|---|
| **INPUT** | the crawled corpus, its served HTML and headers, redirect chains, the edge graph, and the `robots.txt` and sitemap files of the hosts involved |
| **EXPECTED** | each of the six named classes — status · redirects · sitemap · robots/indexability · canonical · **served-HTML content and link evidence** — returns, for every page, either a finding or an explicit UNKNOWN carrying its reason |
| **FAILURE** | any of the six classes is absent; or a class returns `null` where it could not run; or a served-HTML conclusion is drawn on a body that was truncated |
| **EVIDENCE** | per class: a firing fixture, a silent clean control, and the class run over the real corpus with its counts — plus the UNKNOWN path exercised at least once on real data |
| **v0.1 PASS boundary** | the frozen v0.1 audit classes — **status, redirects, sitemap, robots/indexability, canonical, rendered-content/link evidence** — are **independently detected and re-tested in the Case Study** |
| **⏭ deferred half** | all advanced technical SEO beyond those classes |

**Verdict —** the v0.1 half's detectors all exist and ran on real data. The boundary requires them 'independently detected and RE-TESTED IN THE CASE STUDY', and the Case Study is item 52 — unrun, and gated behind the rendering trigger. Cannot advance until 52 does

### 11 · Existing Page Inventory

**BLOCKED-UNKNOWN** · class `P` · ruled in `§6` · was BUILT-NOT-PROVED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the same URL set crawled twice, with a real change between runs. |
| **EXPECTED** | stable identity across runs; changes appear as new observations, not new pages. |
| **FAILURE** | a `page_id` moves, or a re-seen page becomes a second record. |
| **EVIDENCE** | two runs, the ID set compared, the changed page's observation chain. |
| **BLOCKER TODAY** | one run only, by the terms of `D-CRW-4`. **"Maintain" cannot be tested until a second run is authorised.** |

**Verdict —** the ruling's own BLOCKER TODAY: one crawl run only, by the terms of D-CRW-4. 'Maintain' needs a second run and a second run needs the owner's green — an owner gate, not unbuilt work

### 12 · Duplicate / Thin / Template Detection

**BUILT-NOT-PROVED** · class `S` · ruled in `§4+A1`

| part | the owner's words |
|---|---|
| **INPUT** | the corpus, with shell subtraction defined and printed |
| **EXPECTED** | exact-duplicate, near-duplicate, thin and template-dominance each classify every page and each emits **evidence only** |
| **FAILURE** | any supply label produces a demand or opportunity conclusion; or shell subtraction is undefined, untested, or not printed beside the result |
| **EVIDENCE** | the four classifications over the real corpus; the shell definition printed; the shell-heavier-than-body test; and the item-8 guard passing |
| **v0.1 PASS boundary** | observe, classify and produce evidence |
| **⏭ deferred half** | a candidate or page failing the frozen duplicate/thin limits → **publishing path HARD BLOCK** |

**Verdict —** the v0.1 half observes, classifies and produced real findings. Amendment 1 now supplies its four-part contract, so it CAN be tested — but the EVIDENCE clause wants the four classifications over the real corpus with shell subtraction printed, plus the item-8 guard, and that run has not been made for this row. Not touched in this PR

### 13 · Cannibalization Prevention

**BUILT-NOT-PROVED** · class `S` · ruled in `§4+A1`

| part | the owner's words |
|---|---|
| **INPUT** | query×page data in which one query draws impressions on more than one URL |
| **EXPECTED** | every such overlap detected and reported with its query, the competing URLs and their positions |
| **FAILURE** | a real overlap is missed, **or** a single-URL query is reported as an overlap |
| **EVIDENCE** | detection over real query data, a firing fixture, a clean control, and the number of queries searched stated |
| **v0.1 PASS boundary** | detect and report overlap between existing URLs and intents |
| **⏭ deferred half** | where a suitable existing URL already serves the same intent → **default CREATE is not allowed**; the decision routes to IMPROVE or MERGE on the existing resource |

**Verdict —** detection ran on real data (16 cannibalization findings). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants a firing fixture, a clean control and the number of queries searched stated. Not touched in this PR

### 14 · No Blind Regeneration

**BUILT-NOT-PROVED** · class `S` · ruled in `§4+A1`

| part | the owner's words |
|---|---|
| **INPUT** | the repository as it stands, and a rediscovered URL |
| **EXPECTED** | a census proves **no generator, no page-writing path and no product-repository write path exists**; and a rediscovered URL resolves to its **existing** `page_id` |
| **FAILURE** | any generation or page-write path is found; or a rediscovered URL creates a second record |
| **EVIDENCE** | the census output RED-proved by adding a throwaway generator and removing it; and the ID-stability test sabotaged and restored |
| **v0.1 PASS boundary** | **the absence of the generator IS the strongest safety proof.** Prove the absence, do not simulate the danger |
| **⏭ deferred half** | an unchanged existing page rediscovered → **KEEP**; automatic recreate or overwrite forbidden |

**Verdict —** 🔴 **ITS FAILURE CONDITION IS CURRENTLY MET, WHICH IS STRONGER THAN 'NOT PROVED'.** Amendment 1 requires a census proving no generator, no page-writing path and no product-repository write path exists. **Six page-writing paths exist** — four of them render a candidate page from the registry, via one renderer driven by four runners, built deliberately for earlier gate work. The other two write an audit report and stored corpus bodies. Every one is a LOCAL write behind write-law.mjs and --confirm, and **0 write into a product repository**, so the danger this item names is absent — but the boundary as written is not met, and closing the gap between those two is the owner's ruling to make, not mine. The other halves DO hold: 0 product-repo writes, 0 bulk generate-all paths, and ID stability proved on the real 495-page run (one record per page_id, every id derivable from its own URL). 🔴 The six paths are named in the census output, not here: the engine may not know which product it serves

### 15 · Verified Fact Supply Engine

**VERIFIED-PASS** · class `P` · ruled in `§6` · was BUILT-NOT-PROVED (work)

| part | the owner's words |
|---|---|
| **INPUT** | a fact with source, tier, scope, verification date and freshness window. |
| **EXPECTED** | it is stored once, reused **within** its scope and window, **refused outside** either, and expires on schedule. |
| **FAILURE** | any leg of that loop is fixture-only, or a fact is reused out of scope or past expiry. |
| **EVIDENCE** | the whole loop demonstrated end to end on real verified facts. |

**Verdict —** the whole loop demonstrated end to end on the 32 REAL verified facts, **no leg fixture-only**. **(i) stored once** — one fact requested three times reaches the source 0 times, and a miss is memoised so it is researched once, not repeatedly. **(ii) reused within scope and window** — all 32 hit today, each returning its own record. **(iii) refused outside scope**, proved on a REAL PAIR: two regulators in different jurisdictions publish a minimum grade for the same qualification, and holding only one of them, a question about the other MISSES and hands back nothing. The two values genuinely differ, so a candidate given the wrong one would prepare to the wrong threshold. The same refusal holds across scopes within a jurisdiction. **(iv) expires on schedule** — each of the 32 goes STALE the day after its own recorded recheck date (earliest 2026-12-11, latest 2027-03-11), for that reason and not down the old extractedOn path; 0 of 32 are served once every date has passed. Four sabotages, each landing in the intended test. 🔴 The real pair is NAMED IN THE TEST, not here: the engine may not know which product it serves

### 16 · Fact Conflict & Freshness

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | two real records asserting different values for one claim in one scope; and a real fact past its recheck date. |
| **EXPECTED** | conflict detected and **never auto-resolved**; both values retained; the fact becomes UNKNOWN; every dependent is marked for review. |
| **FAILURE** | a conflict resolves itself, or a stale fact is used silently. |
| **EVIDENCE** | the detector firing **on real data**, and the dependency walk on real dependents. |

**Verdict —** 🔴 THE EVIDENCE CLAUSE DEMANDS 'THE DETECTOR FIRING ON REAL DATA', AND IT CANNOT. Six real conflicts exist and detectConflicts returns 0 on all six (D-FACT-1): it compares records we hold, and every real conflict is registry-versus-a-second-official-page. No real fact is past its recheck date either — the earliest falls due 2026-12-11

### 17 · Derived Fact Provenance

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | a real derived fact with real inputs. |
| **EXPECTED** | formula and input IDs stored; the value recomputable; **never more verified than its least-verified input**; dependents marked for review when an input changes. |
| **FAILURE** | a derived fact exceeds its weakest input, or cannot be recomputed. |
| **EVIDENCE** | recomputation of every derived fact, and the constructor refusing an over-verified one. |
| **BLOCKER TODAY** | **zero derived facts exist.** All 46 records are primary. |

**Verdict —** the ruling's own BLOCKER TODAY: zero derived facts exist, all 46 records are primary. Nothing to recompute

### 18 · Competitor Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a query cluster and the competitors visible on it. |
| **EXPECTED** | coverage, surfaced resources, gaps and citation patterns measured. |
| **FAILURE** | **absence is treated as opportunity**, or proprietary wording is copied. |
| **EVIDENCE** | the measurement, and a test that absence alone never produces an opportunity. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 19 · Content / Information-Gap Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | real unanswered or second-search evidence. |
| **EXPECTED** | genuine information gaps identified. |
| **FAILURE** | a gap is asserted merely because competitors are absent. |
| **EVIDENCE** | the demand evidence behind each gap, separate from the supply evidence. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 20 · Action Decision Engine

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a page or cluster with its evidence. |
| **EXPECTED** | exactly **one** primary action from KEEP / FIX / IMPROVE / ADD SECTION / MERGE / REFRESH / LINK / CREATE / MONITOR / NOINDEX / REDIRECT / REJECT. |
| **FAILURE** | more than one primary action, none, or one unsupported by the evidence cited. |
| **EVIDENCE** | the decision with its evidence chain, and a held-out set. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 21 · URL Right-to-Exist Test

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a proposed new URL. |
| **EXPECTED** | a specific `WHY_THIS_URL_DESERVES_TO_EXIST`, unique to that URL. |
| **FAILURE** | the reason is absent, generic, or equally true of a sibling. |
| **EVIDENCE** | the stored reason, and a sibling-overlap check on it. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 22 · Best Answer Architecture

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the question universe, the search-language universe and the verified-fact universe for one intent. |
| **EXPECTED** | they combine into one coherent useful resource. |
| **FAILURE** | any of the three is missing, or the result is a stitched template. |
| **EVIDENCE** | the three inputs, traceable into the output. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 23 · Answer-First Content

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a page and its primary question. |
| **EXPECTED** | the useful answer appears clearly and early; keyword-aware without stuffing. |
| **FAILURE** | the answer is buried, or keyword density is engineered. |
| **EVIDENCE** | position of the answer, and a stuffing check. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 24 · Original Information Gain

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the page, its competitors and its siblings. |
| **EXPECTED** | materially useful value beyond all three. |
| **FAILURE** | the value is restatement, or is shared template content. |
| **EVIDENCE** | the gain named and measured against both baselines. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 25 · Page Quality Gate

**BUILT-NOT-PROVED** · class `S` · ruled in `§6+A1`

| part | the owner's words |
|---|---|
| **INPUT** | an existing page, its siblings, and the claims it makes |
| **EXPECTED** | unique value, sibling overlap, verified-fact presence and source integrity each measured and reported per page |
| **FAILURE** | any of the four in-scope checks is fixture-only or absent. |
| **EVIDENCE** | the four checks over the real corpus, each with a clean control. |
| **v0.1 PASS boundary** | unique value, verified facts, sibling overlap and source integrity measured on existing pages. |
| **⏭ deferred half** | right-to-exist, cannibalization and technical-readiness **as pre-publish gates** — they need a publish path. |

**Verdict —** Gate A measures overlap, facts and shell. The v0.1 half also names SOURCE INTEGRITY, and the EVIDENCE wants all four over the real corpus each with a clean control

### 26 · Internal-Link Intelligence

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | the crawled corpus and its edge graph. |
| **EXPECTED** | links verified **present in the served HTML**; orphans detected; a JS-injected link reported **UNKNOWN, never "missing"**. |
| **FAILURE** | "we could not see it" is recorded as "it is not there"; or the graph is unavailable. |
| **EVIDENCE** | the graph in durable storage, orphan counts, and the UNKNOWN path exercised. |

**Verdict —** the graph, orphan counts and the UNKNOWN path all exist and ran. But the EVIDENCE wants the graph in DURABLE storage and the committed PageRecords still carry empty edge lists — the graph lives in an artifact that expires 2026-12-11

### 27 · Entity Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the subject's entities, topics, questions and relationships. |
| **EXPECTED** | mapped consistently across pages and machine-readable data. |
| **FAILURE** | the same entity carries different facts in two places. |
| **EVIDENCE** | a cross-surface consistency check. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 28 · International / Local SEO

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | two locales with evidence of genuinely different need. |
| **EXPECTED** | locale handling only where evidence supports it; **origin→destination direction preserved**; country ≠ language. |
| **FAILURE** | doorway-style multiplication, or translation presented as localization. |
| **EVIDENCE** | the local evidence per locale, and a multiplication guard. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 29 · SERP Hook / CTR Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | real impression, CTR and position evidence. |
| **EXPECTED** | truthful titles, H1s, meta and answer-first wording, tested before/after. |
| **FAILURE** | clickbait, stuffing, fake urgency, unsupported promise, or a claim of causation from correlation. |
| **EVIDENCE** | versioned before/after with the evidence that drove it. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 30 · GEO / AEO / AIO / AI Visibility

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a recorded prompt on a named platform, with date, locale and method. |
| **EXPECTED** | mention, citation, cited URL/domain, competitors and source gaps recorded exactly as observed. |
| **FAILURE** | any fabricated rank or citation; any automated consumer-chat session; **NOT RUN presented as anything but NOT TESTED**. |
| **EVIDENCE** | the full record per test, including the method. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 31 · AI Source Influence Graph

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | observed prompt→response→mention→citation chains. |
| **EXPECTED** | the chain mapped through to cited source, domain, competitor, gap and action. |
| **FAILURE** | a link in the chain inferred rather than observed, without being labelled INFERRED. |
| **EVIDENCE** | the graph with per-edge provenance. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 32 · Earned Authority / Off-Page Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | legitimate available link and mention data. |
| **EXPECTED** | credible gaps and opportunities identified; earned actions only. |
| **FAILURE** | any automated outreach, paid-link scheme or link-farm suggestion. |
| **EVIDENCE** | the data source per finding, and a test forbidding manipulative actions. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 33 · Content Decay & Pruning

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | an ageing inventory with performance evidence. |
| **EXPECTED** | REFRESH / IMPROVE / MERGE / NOINDEX / REDIRECT / REMOVE decisions, evidence-backed. |
| **FAILURE** | the inventory only ever grows. |
| **EVIDENCE** | decisions with their evidence, and a pruning path that works. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 34 · Content Brief Engine

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the evidence for one approved action. |
| **EXPECTED** | an implementation-ready brief: intent, entities, questions, verified facts and sources, unique value, locale terms, internal links, CTA, schema, prohibited claims, acceptance criteria. |
| **FAILURE** | any required section missing, or a fact without a source. |
| **EVIDENCE** | the brief, and a completeness check over its sections. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 35 · Safe CC Command Generation

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | one approved action. |
| **EXPECTED** | **one** consolidated, reviewable command with evidence, stable IDs, affected files, expected behaviour, acceptance criteria, tests, cost/safety and rollback. |
| **FAILURE** | more than one command, or any required section missing. |
| **EVIDENCE** | the command, and a section-completeness check. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 36 · Owner Authorization Gates

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | an attempt at a destructive, paid, production, large-scale or cross-product action **without** authorization. |
| **EXPECTED** | refusal. |
| **FAILURE** | it proceeds — **or the guard is asserted only as text and never executed**. |
| **EVIDENCE** | a test that **runs** each guard and observes the refusal, per category. |

**Verdict —** the EVIDENCE wants a test that RUNS each guard per category — destructive, paid, production, large-scale, cross-product. Exactly one runs today (the D-CRW-4 live-run refusal). The rest are asserted in prose, which the FAILURE clause names as a failure in itself

### 37 · Controlled Publishing

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | an approved cohort, and an attempt to publish outside it. |
| **EXPECTED** | only the owner-authorized cohort publishes; **no generate-all or publish-all path exists.** |
| **FAILURE** | any path publishes more than the authorized cohort. |
| **EVIDENCE** | the cohort boundary enforced in code, and the absence of a bulk path proved by census. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 38 · Indexability Preflight

**BUILT-NOT-PROVED** · class `S` · ruled in `§4+A1`

| part | the owner's words |
|---|---|
| **INPUT** | an existing page with its status, canonical, meta robots, `X-Robots-Tag`, matching `robots.txt` rule and sitemap membership |
| **EXPECTED** | an indexability **state** per page, and the words **INDEXABLE ≠ INDEXED** printed wherever that state is shown |
| **FAILURE** | indexability is reported as indexation; or any output states or implies that a page **will** be indexed, ranked or cited |
| **EVIDENCE** | the state over the real corpus, plus a test that fails the build on any indexing, ranking or citation promise in output |
| **v0.1 PASS boundary** | inspect the indexability of pages that already exist |
| **⏭ deferred half** | a candidate failing required status / canonical / noindex / robots / renderability → **publish BLOCK** |

**Verdict —** indexability of existing pages was inspected on real data (134 noindexed pages traced to one commit). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants the state over the real corpus plus a test failing the build on any indexing promise. Not touched in this PR

### 39 · Real Indexation Learning

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a published cohort after publication. |
| **EXPECTED** | discovery, crawl, index state, impressions and queries observed; **INDEXABLE ≠ INDEXED preserved throughout**. |
| **FAILURE** | indexability reported as indexation, or any promise of future indexing. |
| **EVIDENCE** | the post-publication observations with dates. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 40 · Controlled Scaling

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a completed cohort and its frozen evidence rule. |
| **EXPECTED** | expansion only when that rule is satisfied. 10 must earn 100; 100 must earn 1,000. |
| **FAILURE** | expansion without the rule being met, or the rule changed to fit the result. |
| **EVIDENCE** | the frozen rule, the measurement, the decision. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 41 · Failed-Cohort Backpressure

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a cohort that fails its evidence rule. |
| **EXPECTED** | expansion **pauses automatically**, and a diagnosis is produced instead of more output. |
| **FAILURE** | expansion continues, or the response is more pages. |
| **EVIDENCE** | the pause triggered by injection, and the diagnosis it produced. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 42 · Re-crawl / Re-test Loop

**BLOCKED-UNKNOWN** · class `P` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a target that changed since it was last observed. |
| **EXPECTED** | it is re-tested and an evidence-backed PASS or FAIL recorded against the change. |
| **FAILURE** | a stale observation is served as current, or the re-test is not evidence-backed. |
| **EVIDENCE** | two observations of one target across a real change, with the verdict on each. |
| **BLOCKER TODAY** | requires a second authorised crawl run. |

**Verdict —** the ruling's own BLOCKER TODAY: requires a second authorised crawl run. Owner gate

### 43 · Experiment / Change Impact

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | a material change with before and after evidence. |
| **EXPECTED** | what happened is measured; **causation is never claimed from correlation**. |
| **FAILURE** | a causal claim without a design that supports it. |
| **EVIDENCE** | the versioned before/after and the wording of the conclusion. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 44 · Funnel / Business Outcome Intelligence

**DEFERRED** · class `D` · ruled in `§6` · was NOT-STARTED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | visibility actions and the downstream funnel. |
| **EXPECTED** | connection made **where measurable**; anything not instrumented marked UNKNOWN / NOT MEASURABLE. |
| **FAILURE** | attribution invented for an uninstrumented step. |
| **EVIDENCE** | the instrumentation map, and the UNKNOWNs stated. |

**Verdict —** class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either

### 45 · Cost Governor

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | a run that spends money, provider calls, crawl budget or founder time; and a runaway loop. |
| **EXPECTED** | all four tracked in a ledger; the runaway **hard-stopped**. |
| **FAILURE** | any is untracked, or a cost reads UNKNOWN when it was measurable, or the loop continues. |
| **EVIDENCE** | the ledger with real figures, and the hard stop proved by injection. |
| **BLOCKER TODAY** | **no ledger exists and no spend figure is recorded.** The cap holds; the money does not. |

**Verdict —** the ruling's own BLOCKER TODAY: the cap holds, the money does not. No ledger and no spend figure. Unbuilt rather than blocked — nothing external prevents building it

### 46 · Cache Before Re-Research

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | the same fact requested twice, and once outside its scope, and once past its window. |
| **EXPECTED** | one source lookup; a miss outside scope; a miss past expiry. |
| **FAILURE** | a second lookup for an unchanged fact, or a hit outside scope or window. |
| **EVIDENCE** | hit/miss counts with the freshness window printed, over a **live researcher** — not a pre-loaded registry. |
| **BLOCKER TODAY** | nothing researches yet, so a 100% hit rate measures a full shelf, not a working cache. |

**Verdict —** the EVIDENCE demands hit/miss counts over a LIVE RESEARCHER, not a pre-loaded registry, and nothing researches. The cache did improve on 12 September — it now refuses UNKNOWN facts, and the hit rate fell 100% → 69.6% — but a pre-loaded shelf is still what is being measured

### 47 · Paid Provider Controls

**NOT-STARTED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | an attempt to use a paid provider with no authorization, no budget and no cap. |
| **EXPECTED** | refusal. Paid services are **OFF by default**; each needs explicit authorization, a budget/cap and a kill switch. |
| **FAILURE** | any paid call proceeds unauthorized, or a cap or kill switch is absent. |
| **EVIDENCE** | the refusal test per control, and the kill switch exercised. |
| **NOTE** | no paid provider exists today. **Absence is not a control** — the controls must exist before one does. |

**Verdict —** the ruling's NOTE is explicit: no paid provider exists, and ABSENCE IS NOT A CONTROL. The controls — authorization, budget/cap, kill switch — must exist before a provider does, and none is built

### 48 · Idempotency & Retry Safety

**VERIFIED-PASS** · class `P` · ruled in `§6` · was BUILT-NOT-PROVED (work)

| part | the owner's words |
|---|---|
| **INPUT** | the same authorized job, run twice; and a retry against a 4xx. |
| **EXPECTED** | no duplicate logical record and no duplicate side effect; **at most one retry, never on a 4xx**. |
| **FAILURE** | a record, page, action or cost duplicates; or a 4xx is retried. |
| **EVIDENCE** | before/after IDs and counts, plus a test that fails if the retry rule is changed. |

**Verdict —** **INPUT** the same authorized job run twice, and a retry against a 4xx. **EXPECTED** the re-run appends no duplicate payload and mints no new id for the same measurement — before 1 / after 1, with the re-sighting recorded rather than dropped; and requests are counted at the boundary: 7 different 4xx statuses each issue exactly ONE request, a network error gets exactly ONE retry (2 attempts, never 3), and a 5xx is not retried at all. **FAILURE** not met, on real data: the 12 September crawl holds 500 observations with 500 distinct measurement keys and 500 distinct ids. **COST** — requests are the only metered thing this system issues (no paid provider exists, item 47), and a re-run over held input issues zero. 🔴 **The retry rule had NO test until now**; the code was right since PR #36 and nothing would have caught it changing. Three sabotages — retry a 4xx, retry twice, stop deduplicating — each landed in the intended test

### 49 · Audit Trail & Provenance

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | any stored conclusion. |
| **EXPECTED** | it explains what happened, why, from which evidence, when, and what version or action changed it — **and its lifecycle runs to CLOSED or SUPERSEDED**. |
| **FAILURE** | any of the five is missing, or no record has ever completed its lifecycle. |
| **EVIDENCE** | a real chain walked end to end, and a real record closed or superseded. |

**Verdict —** 🔴 THE FAILURE CONDITION IS CURRENTLY MET. The boundary requires the lifecycle to run to CLOSED or SUPERSEDED, and all 109 issues on disk are OPEN — not one record has ever completed its lifecycle

### 50 · OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | records of all four kinds passing through the real verdict path. |
| **EXPECTED** | each labelled on its face; **no path converts UNKNOWN into PASS**, and the guard governs **real** records. |
| **FAILURE** | a label is absent or wrong, or the guard polices an empty population. |
| **EVIDENCE** | the guard exercised by real records, not fixtures, and the forbidden transition proved impossible by injection. |

**Verdict —** all four labels are live and 14 real records now carry UNKNOWN. But the boundary's guard is the UNKNOWN→PASS transition (F23), and 0 of 46 records carry life.supersedes, so that guard still polices an empty population — which the FAILURE clause names explicitly

### 51 · Explainability

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | one recommendation or action. |
| **EXPECTED** | the owner can inspect its **priority, evidence, confidence, cost, status and reason** — all six. |
| **FAILURE** | any of the six is missing or unreadable. |
| **EVIDENCE** | the six visible for a real recommendation, on the real report. |
| **BLOCKER TODAY** | priority, confidence and cost do not exist. |

**Verdict —** the ruling's own BLOCKER TODAY: of the six the owner must be able to inspect, PRIORITY, CONFIDENCE and COST do not exist at all

### 52 · Case Study Acceptance Test

**BLOCKED-UNKNOWN** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | the sealed corpus at its pinned commit, and detectors that have **never seen it**. |
| **EXPECTED** | every required RED defect detected independently; **every clean control unflagged**. |
| **FAILURE** | a required RED is missed, **or any control false-positives — that alone is FAIL**. |
| **EVIDENCE** | the run, its per-class result, and proof the seal was never opened during construction. |
| **RULE** | one shot. **NOT RUN = NOT TESTED.** It is run when the syllabus is built, not before. |

**Verdict —** 🔴 NOT RUN = NOT TESTED, and the rendering trigger is unmet. Two of the six RED classes cannot be detected without a renderer, so running the exam today would produce a FAIL that measures our sequencing rather than the engine — and the seal breaks only once

### 53 · Cross-Product Portability

**BUILT-NOT-PROVED** · class `P` · ruled in `§5`

| part | the owner's words |
|---|---|
| **INPUT** | AlmiVisibility is given an **unseen** subject or product — a second real product, or a neutral declared test product |
| **EXPECTED** | the generic core initializes and discovers **without any hard-coded first-product knowledge** |
| **FAILURE** | the core needs first-product knowledge to run — **or the first product's private evidence leaks during the test** |
| **EVIDENCE** | the declaration, the run, and an isolation assertion across the boundary during that same run |

**Verdict —** the boundary law and fixture tenants hold, but the INPUT is an UNSEEN product — a second real product or a neutral declared test product — and none has been declared and run

### 54 · Cross-Product Isolation Test

**BLOCKED-UNKNOWN** · class `P` · ruled in `§6` · was BUILT-NOT-PROVED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | two declared products, each holding private evidence, facts, **costs** and **learning**. |
| **EXPECTED** | neither can see any of the other's four classes. |
| **FAILURE** | any cross read succeeds, **or a class does not exist to be tested**. |
| **EVIDENCE** | adversarial tests over non-empty populations of all four. |
| **BLOCKER TODAY** | no cost record and no learning record exists — two of the four cannot be tested. |

**Verdict —** the ruling's own BLOCKER TODAY: no cost record and no learning record exists, so two of the four classes cannot be tested. Learning is itself deferred, so this cannot be closed inside frozen v0.1

### 55 · Security / Secrets / Recovery

**BUILT-NOT-PROVED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | a code path that handles a secret, and a state that must be recoverable. |
| **EXPECTED** | no secret value is ever printed, logged, hashed or length-measured; recovery or rollback works. |
| **FAILURE** | any leak — **or the no-leak property proved only by a manual grep, which would not catch a future change**. |
| **EVIDENCE** | an executing test for the leak property, and a recovery exercised. |

**Verdict —** the no-leak property holds in practice — the Search Console key was never printed, hashed or length-measured — but the FAILURE clause forbids proving it BY MANUAL GREP, and no executing test hunts for a leak. Recovery has not been exercised either

### 56 · Desktop + Mobile Owner Experience

**BLOCKED-UNKNOWN** · class `P` · ruled in `§5` · was BUILT-NOT-PROVED (vocabulary)

| part | the owner's words |
|---|---|
| **INPUT** | the critical owner workflow, walked on desktop **and** at the intended mobile width |
| **EXPECTED** | the owner can **see the evidence**, **understand the issue or recommendation**, **read its status, confidence and cost**, and **reach the required action** |
| **FAILURE** | any of those is broken, hidden or unusable |
| **EVIDENCE** | the walk, recorded, at both widths |

**Verdict —** the walk must be recorded at both widths and the browser tooling failed on every attempt, including a trivial probe page. 🔴 That is a fact about our tooling, not about the interface (LAW-ABSENT-1) — so it is UNKNOWN, not a failure

### 57 · Final Independent Audit

**NOT-STARTED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | the integrated system and every applicable frozen requirement. |
| **EXPECTED** | re-checked against **real integrated evidence**, by someone other than the builder. |
| **FAILURE** | any closed requirement fails on re-check; or the auditor is the builder. |
| **EVIDENCE** | the audit, its findings, and the auditor's identity. |
| **RULE** | confirmation, **not a new idea hunt.** Closed items reopen only on the five listed grounds. |

**Verdict —** runs last, and requires an auditor who is not the builder

### 58 · DONE Declaration

**NOT-STARTED** · class `P` · ruled in `§6`

| part | the owner's words |
|---|---|
| **INPUT** | the full ledger. |
| **EXPECTED** | every applicable item is ☑ or a **justified** ⏭/N-A, and no frozen blocker remains. |
| **FAILURE** | any applicable item is not ☑, or an N/A carries no justification, or a blocker stands. |
| **EVIDENCE** | the ledger, the audit, and the **owner's own signature.** |
| **RULE** | 🔴 **Only the owner declares DONE. Not CC. Not Claude.** |

**Verdict —** 🔴 only the owner declares DONE. Requires the full ledger, the audit, and his own signature

