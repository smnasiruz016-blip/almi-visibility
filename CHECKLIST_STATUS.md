# ALMIVISIBILITY — KEY FEATURE CHECKLIST · STATUS

**Audited 11 September 2026 against the repository at branch `v0.1/checklist-freeze-and-status`,
base `50e81da` (PR #36 merged). 349 tests green.**

Governing standard: `KEY_FEATURE_CHECKLIST_SOURCE.md` (hash-verified, 58 features).

> ## 🔴 TICK LAW
> **"A feature is not complete because code exists. Tick it only when real evidence proves it
> works."**

---

## THE HEADLINE

| | count |
|---|---|
| ☑ **VERIFIED PASS** | **0** |
| ◐ **BUILT / NOT PROVED** | **16** |
| ☐ **NOT STARTED** | **41** |
| ⚠ **UNKNOWN / BLOCKED** | **1** |
| **total** | **58** |

**Of the 41 ☐ items, 32 are `v0.1 SCOPE = OUT`** — deliberately excluded by V5.1's own boundary.
**Those are not failures. They are the cost gate working.** Nine ☐ items are IN or PARTIAL scope
and genuinely not started.

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
| **IN** | 23 | inside V5.1's v0.1 audit slice |
| **PARTIAL** | 3 | one component in, the rest deferred |
| **OUT** | 32 | excluded by the v0.1 boundary |

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

- **Status** — one of the checklist's own four values. Nothing else is used.
- **v0.1 SCOPE** — `IN` / `OUT` / `PARTIAL`, cited to the V5.1 section that puts it there.
  **Nothing is marked N/A.** N/A is a justification and justifications are the owner's.
- **Verified date** — for a ☑ this would be the date evidence proved a pass. **For every other
  status it is the date the STATUS was measured**, which is what all 58 currently carry.
- **Blocker/UNKNOWN** — for every ◐, the *specific* missing test or measurement. Not "needs work".

| # | Feature | Status | v0.1 SCOPE | Evidence | Verified date | Verifier | Blocker/UNKNOWN | Reopen reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Product Intake & Isolation | ◐ | IN — §62 l.553 provider-neutral foundation; DoD `DOD-02` | `test/product-registration.test.mjs`, `test/product-isolation.test.mjs` (16 tests, two real registered tenants, adversarial accessors, non-empty guard). `src/product.mjs` | 2026-09-11 | Claude (repo audit) | **No cost record and no learning record exists for any product** (`U-ISO-1`), so two of the four things the PASS meaning names cannot be isolated or tested | — |
| 2 | Human Question Discovery | ☐ | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 3 | Keyword & Search-Language Discovery | ☐ | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 4 | Localized Human Thinking | ☐ | OUT — v0.1 EXCLUDES l.974 "corridor engine (§6, §15)" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 5 | Intent & Question Clustering | ☐ | OUT — §62 l.553; phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 6 | Axis Discovery | ☐ | OUT — discovery is "Search Intelligence"; §62 l.553 | Axis **declaration** exists and is tested (`test/product-registration.test.mjs`: "a product must say what its pages vary BY"). **Declaration is not discovery** | 2026-09-11 | Claude (repo audit) | — | — |
| 7 | Market Measurement | ☐ | OUT — §62 l.553; phase table "Search Intelligence" | `DISTINGUISHING_SUPPLY.md` is a one-off measurement, not an engine | 2026-09-11 | Claude (repo audit) | — | — |
| 8 | HEAVY / THIN / EMPTY Discipline | ☐ | OUT — component of item 7 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 9 | Search Console / Analytics Intelligence | ◐ | IN — §62 l.553 "Search Console ingestion when authorized"; v0.1 CONTAINS l.974 (§9) | PR #35. `src/search/*`, `bin/gsc-ingest.mjs`. **Real authenticated read executed**: 2,318 impressions, 1,527 page rows, 4 observations in `runs/evidence/evidence.jsonl`. Live 403 control. 21 tests | 2026-09-11 | Claude (repo audit) | **Ingestion is proven; ANALYSIS is not.** No `country` dimension is ever queried, no query-level data is stored, and no downstream outcome is linked — three of the seven things the PASS meaning names | — |
| 10 | Technical SEO Audit Engine | ◐ | IN — v0.1 CONTAINS l.974 "Crawler and page inventory (§8)" | PR #36. `src/crawl/*`: status, redirect chain, `x-robots-tag`, robots decision, sitemap parse, edge graph. 35 tests | 2026-09-11 | Claude (repo audit) | **Captures the inputs, audits nothing.** Zero detectors exist (C5 ceiling 0, deliberate), so canonicals, noindex conflicts, rendering and broken links are never *evaluated*; and no run has touched a real host (`D-CRW-4` not given) | — |
| 11 | Existing Page Inventory | ◐ | IN — v0.1 CONTAINS l.974 (§8) | `src/crawl/inventory.mjs`, stable `page_id` (C4, two-path hash test), `first_seen`/`last_seen`, edges | 2026-09-11 | Claude (repo audit) | **No real URL has ever entered the inventory** — every page in it came from the 127.0.0.1 fixture server. Needs one live run (`D-CRW-4`) | — |
| 12 | Duplicate / Thin / Template Detection | ☐ | IN — required by Case Study #1 (§60) which v0.1 CONTAINS l.974 | none. `tools/detector-census.mjs` reads **0** and a test enforces it | 2026-09-11 | Claude (repo audit) | No detector exists, by deliberate decision (C5): a detector written now would be shaped by the six known RED classes, which is building to the test | — |
| 13 | Cannibalization Prevention | ☐ | OUT — phase table, "Search Intelligence" row names cannibalization | none | 2026-09-11 | Claude (repo audit) | — | — |
| 14 | No Blind Regeneration | ☐ | OUT — v0.1 EXCLUDES l.974 "Page generation, in every form" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 15 | Verified Fact Supply Engine | ◐ | IN — v0.1 CONTAINS l.974 "Source-of-truth and provenance layer (§14)" | `src/facts/*`, 46 real records, F1–F22 laws, ~29 tests. **A3 (12 Sep):** `verificationState` is now REQUIRED at construction — a fact that will not declare its standing throws — and all 46 are honestly restated as **UNVERIFIED** | 2026-09-12 | Claude (repo audit) | 🔴 **0 of 46 records are verified.** The engine can no longer let an unverified record pass for a verified one, but the PASS meaning needs a *verification date* and none exists. **The date was NOT backfilled** — inventing one is the item-50 failure | A3 fix, 12 Sep 2026 — restatement, not regression |
| 16 | Fact Conflict & Freshness | ◐ | IN — v0.1 CONTAINS l.974 (§14) | `src/facts/freshness.mjs`, `conflict` field + `schema.mjs` conflict state, F21 staleness tests, "the nightly job routes by the STORED SPAN" | 2026-09-11 | Claude (repo audit) | **No scheduled job runs it** — the "nightly job" is a tested function with no workflow; and no test proves two genuinely conflicting records are *detected* (the conflict state is set by hand, not found) | — |
| 17 | Derived Fact Provenance | ☐ | IN — v0.1 CONTAINS l.974 (§14) | none. No `formula`, `derivedFrom` or `inputFacts` field exists anywhere in `src/facts/` or `products/` | 2026-09-11 | Claude (repo audit) | No derived/calculated fact type exists | — |
| 18 | Competitor Intelligence | ☐ | OUT — §16 is "Search Intelligence"/later; §62 l.553 | `DISTINGUISHING_SUPPLY.md` measured one competitor once (0.08–0.13). Not an engine | 2026-09-11 | Claude (repo audit) | — | — |
| 19 | Content / Information-Gap Intelligence | ☐ | OUT — §12, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 20 | Action Decision Engine | ☐ | OUT — §17/§18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 21 | URL Right-to-Exist Test | ☐ | OUT — gates page generation, excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 22 | Best Answer Architecture | ☐ | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 23 | Answer-First Content | ☐ | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 24 | Original Information Gain | ☐ | OUT — v0.1 EXCLUDES l.974 page generation | Gate A's sibling-overlap measure is a partial instrument for uniqueness, but it does not measure value beyond competitors | 2026-09-11 | Claude (repo audit) | — | — |
| 25 | Page Quality Gate | ◐ | PARTIAL — Gate A exists as the audit slice's quality instrument; the *publishing* gate is OUT (l.974) | `src/gate-a/*`, `bin/gate-a.mjs`, 11 tests. `/nursing` passed Gate A including ROLLOUT with no threshold moved | 2026-09-11 | Claude (repo audit) | Gate A covers **overlap, facts and shell only**. No right-to-exist, cannibalization, technical-readiness or source-integrity check exists — four of the seven the PASS meaning names — and there is no publish path to gate | — |
| 26 | Internal-Link Intelligence | ◐ | PARTIAL — link capture rides on the crawler (IN, l.974); opportunity-finding is later | `src/crawl/seeds.mjs` `extractLinks`, edge graph, `unlinkedWithinCrawledSet`, 3 tests | 2026-09-11 | Claude (repo audit) | 🔴 **Links are read from RAW HTML only** (`renderMode: 'RAW_HTML'`), so a JS-injected link is invisible — the PASS meaning's "verify important links actually render" is exactly what cannot be checked. No opportunity-finding exists | — |
| 27 | Entity Intelligence | ☐ | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 28 | International / Local SEO | ☐ | OUT — v0.1 EXCLUDES l.974 corridor engine (§6, §15) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 29 | SERP Hook / CTR Intelligence | ☐ | OUT — phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 30 | GEO / AEO / AIO / AI Visibility | ☐ | OUT — phase table "GEO/AEO/AIO"; v0.1 EXCLUDES AI Visibility Lab l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 31 | AI Source Influence Graph | ☐ | OUT — v0.1 EXCLUDES l.974 "AI Visibility Lab (§11)" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 32 | Earned Authority / Off-Page Intelligence | ☐ | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 33 | Content Decay & Pruning | ☐ | OUT — acts on published inventory; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 34 | Content Brief Engine | ☐ | OUT — phase table "Controlled pSEO" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 35 | Safe CC Command Generation | ☐ | OUT — §18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 36 | Owner Authorization Gates | ◐ | IN — §32 cost/mass-page gate; safety applies to every phase | `src/write-law.mjs` (2 tests: production needs both flags; local needs `--confirm`). `D-CRW-4` gate: `bin/crawl.mjs` refuses `--live` without `--i-have-the-owners-green` (exit 3), workflow refuses without `owner_green`. 2 workflow tests | 2026-09-11 | Claude (repo audit) | 🔴 **The CLI refusal is demonstrated by hand, not by a test**, and the workflow guard is asserted only as YAML *text* — no test executes either. A guard nothing exercises is a guard nobody has proved | — |
| 37 | Controlled Publishing | ☐ | OUT — v0.1 EXCLUDES l.974 "Page generation, in every form" | none — and l.610 says the absent feature *is* the gate | 2026-09-11 | Claude (repo audit) | — | — |
| 38 | Indexability Preflight | ☐ | OUT — pre-publication; publishing excluded l.974 | The invariant `INDEXABLE ≠ INDEXED` is recorded in `README.md`; no preflight is built | 2026-09-11 | Claude (repo audit) | — | — |
| 39 | Real Indexation Learning | ☐ | OUT — post-publication; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 40 | Controlled Scaling | ☐ | OUT — phase table; expansion is a later gate | none | 2026-09-11 | Claude (repo audit) | — | — |
| 41 | Failed-Cohort Backpressure | ☐ | OUT — requires cohorts, which require publishing (excluded l.974) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 42 | Re-crawl / Re-test Loop | ☐ | PARTIAL — the crawler is IN (l.974); the loop is not named in the v0.1 list | The crawler can be re-run by hand. No comparison, no PASS/FAIL record, no scheduling (the workflow is `workflow_dispatch` only, deliberately) | 2026-09-11 | Claude (repo audit) | No re-test or diff mechanism exists | — |
| 43 | Experiment / Change Impact | ☐ | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 44 | Funnel / Business Outcome Intelligence | ☐ | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 45 | Cost Governor | ◐ | IN — §32; §33 cost ledger | `MAX_URLS_PER_RUN=500` module constant, bounded frontier, per-host budget, dry-run default, `CostRecord` with `amountState` on every result, `LAW-BOUND-1`. Cap proved falsifiable by injection | 2026-09-11 | Claude (repo audit) | 🔴 **The URL cap hard-stops a crawl; nothing tracks money.** No cost ledger exists, no spend is metered (`GATE-2`: "Gate C is a gate, not a governor"), and the crawl's own cost is `amountState: UNKNOWN` because Gate C has never been applied to a crawler we operate (`U-COST-5`) | — |
| 46 | Cache Before Re-Research | ☐ | IN — §41, named a hard gate; l.971 | `FACT_CACHE_DESIGN.md` — its own first line reads **"Design only. No code, no PR, no table, no provider."** | 2026-09-11 | Claude (repo audit) | The design exists; no cache is implemented | — |
| 47 | Paid Provider Controls | ☐ | IN — §62 l.555 "must not activate paid providers by default" | No paid provider is wired anywhere in the repository. The one external API in use (Search Console) is free and read-only | 2026-09-11 | Claude (repo audit) | Satisfied **by absence, not by a control**: there is no budget, cap, kill switch or test that would stop a paid provider being added tomorrow | — |
| 48 | Idempotency & Retry Safety | ◐ | IN — safety; §62 l.553 audit slice | **A1 FIXED (12 Sep):** `measurement_key` (target+method+content, **no clock**) plus `store.appendIfNew`, which appends a **re-sighting** instead of a duplicate payload. Proved against the REAL API: run 4 → **0 new, 4 re-sightings**. Also fixed a second clock hidden *inside* the `sites.list` value | 2026-09-12 | Claude (repo audit) | **The "at most one retry, NEVER on a 4xx" rule still has no test.** The code is right; nothing would catch it being changed | A1 fix, 12 Sep 2026 |
| 49 | Audit Trail & Provenance | ◐ | IN — v0.1 CONTAINS l.974 (§14) | `src/evidence/records.mjs` (Observation/Source/Issue), `collector` + `collector_version` + `content_sha256` + `supersedes`, append-only JSONL, frozen §623 tier order. 4 real records committed | 2026-09-11 | Claude (repo audit) | **No Source record and no Issue record has ever been written** — only Observations. The evidence → claim → action chain the PASS meaning describes is untested end-to-end | — |
| 50 | OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation | ◐ | IN — DoD §170; v0.1 CONTAINS l.974 | C3 transition table (no `UNKNOWN→PASS` edge, enumerated not sampled, proved RED by injection and restored). Four query states with a **live 403 → FORBIDDEN, rowCount null**. `dataState`, `coverageState`, `amountState`, robots `UNKNOWN` vs `DISALLOWED`, facts' `could-not-check` | 2026-09-12 | Claude (repo audit) | **A2 (12 Sep): the dead-code half is fixed, the population half is not.** `transitions.mjs` now governs the registry through `src/evidence/verdict.mjs` and law **F23** in `validateRegistry`, and an **ORPHAN MODULE CENSUS** fails the build on any `src/` module imported only by its own test. 🔴 **But 0 of 46 records carry `life.supersedes`, so F23 polices an EMPTY POPULATION** — live in code, exercised only by fixtures, never yet by a real record | A2 fix, 12 Sep 2026 |
| 51 | Explainability | ☐ | IN — §62 l.553 "minimum internal report/action view" | none. CLI output only | 2026-09-11 | Claude (repo audit) | No report or action view exists; there are no recommendations to explain | — |
| 52 | Case Study Acceptance Test | ⚠ | IN — v0.1 CONTAINS l.974 "Case Study #1 acceptance test (§60)" | `CASE_STUDY_01_ACCEPTANCE_TEST.md`, `case-study-01/corpus/MANIFEST.md`, `case-study-01/exhibits/` (34 files, 4 exhibits) | 2026-09-11 | Claude (repo audit) | 🔴 **NOT RUN = NOT TESTED.** `CS-3`: the test has never been executed. See the contradiction resolved below — **`CS-5`'s premise is false**, and the register, `CASE_STUDY_01_RUN_01.md` and `V51_REMEASURE.md` all carry the false version | contradictory evidence found — see §"Item 52" |
| 53 | Cross-Product Portability | ◐ | IN — §62 l.555 provider-neutral foundation; boundary law | `tools/product-boundary.mjs` + 13 tests: **`src/` names no product in code, 0 lines**, with an independent `git ls-files` census of the population. `products/almi-oet/product.mjs` declares axis+variants | 2026-09-11 | Claude (repo audit) | **Only one real product exists in `products/`.** Portability is proved by a static boundary scan and by fixture tenants — **no second declared product has been operated end-to-end** | — |
| 54 | Cross-Product Isolation Test | ◐ | IN — DoD `DOD-02`; §62 l.553 | `test/product-isolation.test.mjs`: adversarial — "B cannot read A's licence terms by name", "every accessor refuses the other tenant's licence", plus a non-empty guard so it cannot pass vacuously | 2026-09-11 | Claude (repo audit) | **Isolation is proved for licences and gaps only.** No cost record and no learning record exists (`U-ISO-1`), so two of the four things the PASS meaning names cannot be tested at all | — |
| 55 | Security / Secrets / Recovery | ◐ | IN — §37 API-key & secret architecture; DoD | Key path via `GSC_SERVICE_ACCOUNT_KEY_FILE`; scope is a frozen `webmasters.readonly` constant with no setter; nothing derived from the key is printed, logged, hashed or length-measured; append-only store + `supersedes` as the recovery model | 2026-09-11 | Claude (repo audit) | 🔴 **The no-leak property is verified by a manual grep, not by a test** — nothing would catch a future change that logged key material. No rollback/recovery procedure is documented or exercised | — |
| 56 | Desktop + Mobile Owner Experience | ☐ | IN — DoD v0.1 "dashboard/report works on desktop and 430px" | none. CLI only | 2026-09-11 | Claude (repo audit) | No owner-facing surface exists on any device | — |
| 57 | Final Independent Audit | ☐ | IN — checklist §1; DoD v0.1 | This document is the **first status baseline**, not the final audit | 2026-09-11 | Claude (repo audit) | Cannot run while 16 items are ◐ and 1 is ⚠; and it must be *independent*, which a self-audit is not | — |
| 58 | DONE Declaration | ☐ | IN — checklist §6, owner sign-off | none | 2026-09-11 | Claude (repo audit) | Requires every applicable item ☑ or justified N/A with no frozen blocker. **0 items are ☑**, and N/A justifications are the owner's — none exist | — |

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
