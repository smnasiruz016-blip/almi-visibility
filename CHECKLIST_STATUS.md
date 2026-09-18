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
as amended by `PASS_BOUNDARIES_AMENDMENT_1.md`, `PASS_BOUNDARIES_AMENDMENT_2.md` and `PASS_BOUNDARIES_AMENDMENT_4.md`.**
The four-value vocabulary below has been replaced by **seven**. Every row's four-part boundary and
its verdict live in **`CHECKLIST_BOUNDARIES.md`**, generated from the frozen rulings.

| state | before (4-state) | after (7-state) |
|---|---|---|
| **NOT-STARTED** | 33 | **2** |
| **BUILT-NOT-PROVED** | 24 | **6** |
| **TESTABLE-NOW** | — | **1** |
| **VERIFIED-PASS** | 0 | **23** |
| **FAILED** | — | **2** |
| **BLOCKED-UNKNOWN** | 1 | **4** |
| **DEFERRED** | — | **23** |
| **total** | 58 | **61** |

> ### 🔴 ROW 7 TICKED — THE FROZEN TEXT NEVER ASKED FOR DEMAND TO BE SIZED — 18 SEPTEMBER 2026 — OWNER STATUS-SEMANTICS RULING D
>
> - **What changed is the READING, not the evidence.** Row 7's owned half was built and run on 15 September 2026 and
>   then withheld, because "DEMAND can only be BOUNDED on owned evidence, never sized". The frozen v0.1 clause
>   (`PASS_BOUNDARIES_AMENDMENT_4.md:178-186`) asks that DEMAND and VISIBILITY/REACH be **measured and reported
>   SEPARATELY, each naming its own method and date range, each carrying the store's own limits on its face, with the
>   other three dimensions reading UNKNOWN**. It contains no demand-sizing requirement. 🔴 **Sizing was a
>   stricter-than-frozen criterion, and it was NOT added to the boundary** — see
>   `OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md`, Ruling D.
> - **A ruling re-opens an exam; it does not pass it.** Two moves are declared, not one:
>   `BUILT-NOT-PROVED → TESTABLE-NOW` by `OWNER_RULING` (a ruling, never a tick — Amendment 2's item-14 precedent),
>   then `TESTABLE-NOW → VERIFIED-PASS` by `RETEST_PASSED` (the evidence).
> - **Re-verified on the CURRENT tree, not on the 15 September record** (main `98c4b15`, main CI run 35294137887):
>   `node --test test/market-measurement.test.mjs` — **19 of 19**. Clean side: `marketErrors` returns **0 limbs** over
>   the stored measurement *and* over a fresh `measureMarket(store)` run. 🔴 **Current-tree failure proof, because a
>   historical RED is not current fail-capability:** SUPPLY filled from an unmeasured source (our own page count,
>   1,525) raises exactly one limb, `third-dimension-filled`; all **eight** RED limbs fire alone. The instrument still
>   distinguishes required PASS from required FAIL.
> - **What the tick does NOT claim:** the deferred half — SUPPLY, AUDIENCE/NEED, WORTHINESS — is untouched and stays
>   DEFERRED; demand magnitude remains **UNKNOWN** and was never converted into a number; no new demand research was
>   done. 🔴 **The recorded coverage finding stands, unresolved:** rows 3, 5 and 6 stand on a query pull carrying
>   **22.8% of impressions and 0 of 20 clicks**.
> - 🔴 **Provenance of this tick, so a later auditor can weigh it:** the stricter-criterion reading was raised by CC,
>   the interpretation was ruled by the owner, and the re-verification was run by CC. The independent check is row 57,
>   which requires an auditor who is not the builder and has not run.
> - **Ledger 2 / 6 / 1 / 23 / 2 / 4 / 23 = 61.** Denominator unchanged: v0.1 in-scope is still 38, so progress is
>   **23 / 38**. 🔴 A progress fraction is not the DONE contract (row 58).

> ### 🔴 GAP 2 CLOSED (#101–#111) — EVERY CALLER IN ITS FROZEN POPULATION IS GATED, AND A TEST PROVES IT — 17 SEPTEMBER 2026 — NO ROW MOVED
>
> - **The frozen contract** (`_handoffs` 289d471, the write-law brief, option (C)): "Either the store refuses an unauthorised
>   caller, or every caller is gated and a test proves no ungated caller exists. 🔴 Choose the one the existing architecture
>   already implies — do not redesign the store." The architecture implies the second. Its population is the six bins named
>   in the `GAP 2's POPULATION RE-MEASURED` block below — audit · audit-content · audit-technical · supply-labels ·
>   verification-issues · gsc-ingest — with `src/evidence/store.mjs` beneath them, ungated by design.
> - **Verified on merged main `7470c06`** (main CI run 35190981828: success), targeted, not a new audit, and re-run in full
>   on 17 September 2026 before closure was recorded: census of the frozen population
>   **15 = 10 GATED + 5 UNGATED + 0 CANNOT_DETERMINE**, the 5 being the store's own writes (`src/evidence/store.mjs`
>   :144 :191 :197 :229 :232) · every site in each of the six GATED (1 · 2 · 3 · 1 · 1 · 2) · undeclared ungated **0** ·
>   CANNOT_DETERMINE **0** · stale **0** · unresolved declarations **0** · whole census 96 = 85 + 11 + 0 ·
>   `test/ungated-writers.test.mjs` **27 of 27 pass**, carrying the census case for the six and all six incident tests, each
>   asserting a line printed at or after its write decision · `test/gap2-gsc-ingest-source.test.mjs` **13 of 13 pass** ·
>   `test/permitted-writers.test.mjs` with `test/gap2-census-non-write-shapes.test.mjs` **29 of 29 pass**.
> - **The last in-boundary item, #111 (`7470c06`):** gsc-ingest's incident case asserted only the dry-run banner, which the bin
>   prints before building its provider, so it passed on a run that died before its write decision. `--source=<file>` —
>   confined like `--store`, absent by default, never permission — drives the real pipeline from a SYNTHETIC, marked source
>   with no network and no key; the case now requires "would have written 9 evidence record(s)", printed only after every
>   observation reached the store gate. The canonical evidence store holds 0 marked records, and the same guard fails on a
>   store the real bin wrote. Default behaviour identical to main's; six sabotage limbs, each at its pinned test count.
> - **🔴 The close law's last clause was RULED, not assumed — and the finding behind it is OPEN, not buried.** The law
>   (`_handoffs` `a079c38` §5) also asks that "no current evidence/provenance corruption or test unreliability remains inside
>   Gap 2's frozen boundary". A real test unreliability exists and was **observed a third time on this very commit** while
>   closure was being recorded: the full local suite gave **1,290 tests · 1,289 pass · 1 fail**, the failure being
>   `test/no-symlinks.test.mjs` with `ENOENT … lstat '.test-scratch\gsc-source-7RJ2Zx'`. It is recorded as its own OPEN
>   finding, **`D-SCRATCH-1`** (`PHASE_0_FROZEN_GAP_REGISTER.md`), severity UNCLASSIFIED, carrying the owner's A51
>   cross-reference and fix-direction guard, and **nothing about it was fixed here**. It is **OUTSIDE** Gap 2's frozen
>   boundary, and that was measured, not asserted: the writer census enumerates `git ls-files src bin tools` and never walks
>   `.test-scratch` · `symlinkCensus` has exactly one consumer in the repository, its own test, which no Gap 2 proposition
>   reads · the census writes nothing, and the tracked tree was byte-clean after the failing run · a positive control showed
>   the race can only make that test RED, never falsely green · and in the one run where it fired, **every** Gap 2 test
>   passed beside it. Neither "CI is green" nor "the full suite is red" decided this; dependence did. Evidence:
>   `runs/audit/gap2-close-decision-2026-09-16.txt` (A57, A58, B31).
> - **Blocker 2 is DECOUPLED, not closed** (owner ruling `_handoffs` 610e8cf): its wider caller population was a work
>   population and did not amend the contract. Still OPEN, outside Gap 2, with their recorded states: supersede-duplicates ·
>   replay-crawl (directory seam) · source-integrity · cost-ledger capture-actions (owner-authorised network) · render-archive
>   (owner-authorised browser runtime). Evidence: `runs/audit/gap2-close-decision-2026-09-16.txt` (A52–A58, B26–B31).
> - **Along the way:** Blocker 1 (census over-count, #103) and `D-CENSUS-1` (#107) CLOSED; the confined `--store` (#105) and
>   `--ledger` (#110) seams proved. **No row moved** — Gap 2's closure is not a row's acceptance. Ledger 2 / 7 / 1 / 22 / 2 / 4 / 23 = 61.

> ### 🔴 THE BOUNDED SEVEN-URL EVIDENCE RUN — D-FACT-1 CLOSED, R5 COMPLETE WITH NO PROMOTION, NO ROW MOVES — 15 SEPTEMBER 2026
>
> - **Authority:** the owner's ruling "MINIMAL ALMIVISIBILITY EVIDENCE PLAN APPROVED", brief committed at
>   `_handoffs/AlmiVisibility_BOUNDED_7URL_EVIDENCE_RUN_BRIEF_2026-09-16.md`. Seven URLs, seven requests, and no eighth.
> - **The network boundary held:** 7 requests for 7 manifest URLs, ≥1.1 s apart, GET only, no redirect followed, no
>   discovery, no robots or licence fetch. The guard refused the two named bad hosts and two off-manifest URLs with no
>   network at all. Six returned documents; **the second Nigerian page returned HTTP 404** and no substitute was sought.
>   Transcript `runs/audit/evidence-run-2026-09-15.txt`; observations `runs/evidence/external-observations-2026-09-15.jsonl`.
> - **Licence:** no page text is stored anywhere — no new span for the three quotable sources, and own words plus a
>   normalised-text sha256 for the four that may not be quoted. The captured bodies were deleted after reading.
> - **ROW 16 — D-FACT-1 closed on real data, row stays BUILT-NOT-PROVED.** `detectExternalConflicts` compares a held
>   record against an external observation that declares its claim: 1 real conflict (a document count, 3 held vs 4
>   stated) and 1 agreeing control from the same page. Never auto-resolved, both values retained. Four limbs RED-proved
>   alone (`runs/audit/row16-external-conflict-red-2026-09-15.txt`). Still not proved: the dependency walk has no
>   population and no fact is past its recheck date (earliest 2026-12-11). Neither was manufactured.
> - **R5 — COMPLETE, and NOTHING WAS PROMOTED.** All nine stay UNKNOWN / PARTIAL_EVIDENCE; the data repository is
>   untouched at `a4b38cf`. The pages support most of the missing dimensions, and that reading is a MODEL's.
>   **Why nothing was promoted — the REPOSITORY's law, not a ruling:** a fact check must name a person, not a tool,
>   pinned by `test/facts-verification-ingest.test.mjs`; a model may PROPOSE a fact, never BE the source.
>   **The owner's ruling, separately and verbatim:** *"Evidence decides each outcome. NO target number of VERIFIED
>   records. NO forced promotion. UNKNOWN / PARTIAL_EVIDENCE is valid where evidence is insufficient."* He forbade
>   FORCED promotion, not promotion. (Corrected 16 September 2026: this entry had put "evidence only, no promotion"
>   in his mouth.)
>   Per-record findings, including the declarations R4 would require: `runs/audit/r5-evidence-2026-09-15.md`.
> - **ROW 46 — two legs proved, row stays BUILT-NOT-PROVED.** The live researcher's lookup WAS the single authorised
>   request for the OET page: miss → 1 request; the same eligible fact again → hit, 0 requests; outside its scope →
>   miss, refused at the boundary, 0 requests. The past-window leg stays BLOCKED — no fact has expired.
> - **Item 50 stays FAILED**; rows 25, 17 and 10 untouched; no row changed status.

> ### 🔴 FAISLA 1 + FAISLA 2 — ROWS 3/5/6 CARRY THEIR QUERY-PULL LIMITATION; R4 LANDS; NO ROW MOVES — 16 SEPTEMBER 2026
>
> - **Authority:** the owner's ruling of 16 September 2026, committed at `_handoffs/AlmiVisibility_FAISLA_1_2_ROWS_3_5_6_AND_R4_BRIEF_2026-09-16.md`.
> - **FAISLA 1:** rows 3, 5 and 6 each carry, on their own face, *"Observed query-pull coverage: 22.8% of measured impressions; the 337 query
>   rows carried 0 of 20 measured clicks. This is query-pull coverage, not a claim of complete search-demand coverage."* — row 7's finding,
>   now on the rows it concerned. Row 3 stays VERIFIED-PASS, row 5 FAILED, row 6 BUILT-NOT-PROVED; row 7 is unchanged. No row was re-audited.
> - **FAISLA 2 — R4 only:** the declaration contract (`claimDimensions`, law F30, `src/facts/schema.mjs` · `src/evidence/verdict.mjs` ·
>   `src/facts/validate.mjs`; tests `test/r4-declaration-contract.test.mjs`). It binds verifications dated after 2026-09-13; all 36 governed records are
>   before it and were not re-judged. **The nine are untouched** and stay UNKNOWN / PARTIAL_EVIDENCE; the elementAmbiguity exemption stays.
> - **R5 = WAITING FOR GREEN A / AUTHORIZED EVIDENCE FETCH.** Not executed; nothing fetched. Page-generator ruling Q6 stays controlling.
> - **Item 50 stays FAILED** — remaining: R5, and the 12 September 2026 run's provenance declaration that would retire the pre-contract read derivation.
>   Headline counts unchanged.

> ### 🔴 ROW 61 TICKED — THE OWNER DECIDED ITS BLOCKER, AND THE MISSING LEG WAS RUN AND REFUSED CORRECTLY — 15 SEPTEMBER 2026
>
> - **Authority:** the owner's decision of 15 September 2026, committed at `_handoffs/AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md`:
>   *"use a SECOND DECLARED NEUTRAL TEST PRODUCT / PROJECT · use an evidence-bearing page spec · DO NOT change what Row 53 checks"*.
>   Row 61's recorded blocker — *"an OWNER DECISION, not yet made"* — was accurate until then.
> - **The input:** `products/neutral-test-knots/` — a second neutral declared test product (rope knots, axis `knot`), sharing no subject,
>   axis, variant, source host or licence with the first product or with row 53's product. Two page specs holding **claim ids only**;
>   three declared-test-data records, UNVERIFIED, status `lead` — **nothing in it is a fact, and none was made VERIFIED.**
> - **The run:** `bin/build-page.mjs` on almi-oet and on neutral-test-knots, `--all-slugs` and each `--slug` alone — **every candidate
>   REFUSED inside the construction path**, exit 2, `--confirm` wrote nothing; DATA GAP (facts 0 of 5, no WHY_THIS_URL) and BLOCKED /
>   NOT TESTED recorded, never PASS (`runs/audit/row61-second-product-construction-run-2026-09-15.txt`). `findCopiedFacts` is clean on
>   every spec of every declared product; the runner on the second product loads and reads nothing of the first.
> - **RED alone, restored byte for byte** (`runs/audit/row61-second-product-red-2026-09-15.txt`): the acceptance rule forced open · row 53's
>   product given a page spec · a record's sentence planted in the spec · the runner loading the first product — each RED on its named
>   test, GREEN after. ⚠️ The copied-fact limb's first attempt planted an 18-character value and did not go red: `findCopiedFacts` skips
>   text under 40 characters and catches a sentence, not a paraphrase, by its own recorded design. Re-run with the record's sentence;
>   the check is unchanged.
> - 🔴 **NAMED RESIDUE (close-out, 15 September 2026), AND WHAT CORRECTED IT (16 September 2026):** as first recorded, the residue named
>   two escapes — `findCopiedFacts` did not detect a copied fact value that is not a string, or a string shorter than 40 characters;
>   measured then as 13 non-strings and 5 short strings of the first product's 46 values, 18 of 46 unseen if copied.
>   **Measurement on 16 September found a second and LARGER escape, inside the fields that were reported clean:** the probe read only
>   `text.slice(0, 60)`, and **27 of 27 ownWords and 17 of 18 quotedSpans exceed 60 characters**, so their tails were never examined.
>   🔴 **Of 46 values, exactly ONE was ever fully checked.** The earlier "clean on every spec" therefore covered only the detector's
>   eligible first-60-character probes and excluded the 18 entirely.
>   **Corrected in this PR by declaration, not by coverage:** every value the detector cannot judge is now an accounted NOT_TESTED entry,
>   named with its reason — numeric 12, boolean 1, short-string 5, long-tail 27 (45 of 46; 1 fully checked and clean; 0 copied).
>   **A fixed-window method was measured and REJECTED:** at 40 characters / stride 20 it reported the 40-character run
>   `" not permit its wording to be reproduced"` as COPIED into both declared specs — a run equal in length to the window, beginning
>   mid-clause and joining two different subjects, occurring in 0 other fact records but in both specs as shared editorial boilerplate.
>   A false COPIED is a §5A refusal of a legitimate page, so the method does not ship and a committed control keeps it rejected.
>   **Numbers and the boolean stay NOT_TESTED by measurement** (10000 is found inside 110000 and 2100009; `"true"`/`"false"` are ordinary
>   language), and long-field tails stay NOT_TESTED for want of a proved-safe method. **Both escapes are DECLARED, not closed.**
>   **A further coverage limitation, stated not acted on:** free-text registry fields outside the detector's three-field scope
>   (`value.value`, `evidence.ownWords`, `evidence.quotedSpan`) are not read by it; whether any belongs in scope is a separate semantic
>   boundary decision and is not assumed here. The 40-character floor is unchanged. On the row, in the same shape as GATE-4.
> - **The provenance guard re-anchored in #92, re-proved against real breaks** (`runs/audit/row61-provenance-anchor-red-2026-09-15.txt`):
>   the amendment-mismatch rule disabled → the re-anchored test RED on its assertion; row 61's recorded move deleted → the transition
>   law refused item 61 by name ("no move was declared"). Every file restored byte for byte.
> - **Row 53 is untouched:** neutral-test-ferments still declares `pageSpecs {}`; row 53 stays VERIFIED-PASS. No file under `src/` changed
>   except the ledger (`src/checklist/classification.mjs`).
> - **#92 merged at 05:46:32Z as `6d536d2`, 83 s after its own CI finished green** (run 34933770349 on head `06a9dff`: 1,187 tests ·
>   1,183 pass · 0 fail · 4 skipped, the LIVE renderer tests only); the merge tree is identical to the approved head's. **Main's own
>   CI on `6d536d2`** (run 34934113268, push): green — 1,187 tests · 1,183 pass · 0 fail · 4 skipped; `node --test` 196 s.
> - 🔴 **No real page can be accepted, and the pass does not say otherwise:** no spec declares a WHY_THIS_URL, no template family has three
>   rendered specs, and PAGE-1 stays UNSATISFIED. Row 61 proves the generator refuses correctly on any declared product.
> - **Row 61 · BUILT-NOT-PROVED → VERIFIED-PASS (work, TEST_RUN).** Ledger 2 / 7 / 1 / 22 / 2 / 4 / 23 = 61.

> ### 🔴 GAP 3 CLOSED (#90) — AND ROW 36 TICKED: EVERY GUARD ITS FROZEN BOUNDARY NAMES NOW RUNS — 15 SEPTEMBER 2026
>
> - **Gap 3 (#90, merged as ce43c4b):** `bin/archive-corpus.mjs` takes `--out=` — default identical, confined to this repository —
>   and its overwrite refusal now RUNS: against a disposable read-only copy of the run's 394 real bodies in `.test-scratch/`, it
>   refuses `--confirm --out=<an existing archive>` with exit 2 and that file's sha256 unchanged. The run record stays hard-coded,
>   `verifyBodiesAgainstRun` is untouched, and the committed archive (`3d857a9e53fd4b015131bfd721788942a7c3df15b775e6633fb429bc84af3ded`)
>   and run record (`0b9fb848436eca43dac54b0a4d3f220bb637e3c35b18a9d6297bc50b71bcc345`) are asserted unchanged after every spawned run.
>   RED-proved by inverting the guard alone inside a filesystem fence (`runs/audit/gap3-archive-corpus-red-2026-09-15.txt`).
> - **CI, measured:** the job took **215 s** on the PR (run 34927611441, head 3c56cae) and **172 s** on main (run 34927704324,
>   ce43c4b) — `node --test` 206 s and 160 s — against a 20-minute ceiling (≥ 985 s headroom). At the Linux 2-core rate on the
>   record, **$0.006 / minute after the allowance** (`PHASE_0_ITEM_4_WORKER_HOSTING.md`), that is **$0.0215** and **$0.0172** of
>   runner time. 🔴 **`U-COST-1` stays UNREAD:** the rate is known, the allowance is not, so no run is recorded as costing money.
> - 🔴 **Merged before its own CI finished:** #90 merged at 04:09:08Z; its PR run completed green at 04:11:24Z. Recorded, as #89's was.
> - **Row 36 · BUILT-NOT-PROVED → VERIFIED-PASS (work)**, judged against its frozen boundary after main's CI went green:
>   **destructive** (replay-crawl `--recover`; archive-corpus's overwrite refusal) · **paid** · **large-scale** · **cross-product** ·
>   **production** each have a test that runs the guard and observes the refusal. 🔴 **Production is proved at the permission
>   function because NO PRODUCTION WRITE PATH EXISTS** — that residue stays on the row. Ledger 2 / 8 / 1 / 21 / 2 / 4 / 23 = 61.

> ### 🔴 GAP 1 CLOSED — THE FOUR UNGATED WRITE PATHS BEHIND THE WRITE LAW — 15 SEPTEMBER 2026 — NO ROW MOVED
>
> - **The incident:** on 14 September `node bin/facts-lifecycle.mjs` was run to read one number and rewrote
>   `runs/export/facts-for-verification.csv`, tracked evidence. **Fixed first, in its own commit**, on the owner's order.
> - **The fix is the dry-run DEFAULT, not the flag:** facts-lifecycle, export, checklist-boundaries and crawl's local record now
>   write only with `--confirm`, and every operator destination is confined to this repository before the first write. With no
>   flag each still prints what a reader came for. A LIVE crawl, already past D-CRW-4's two flags, still records what it spent.
> - 🔴 **`node bin/checklist-boundaries.mjs --confirm` now rebuilds `CHECKLIST_BOUNDARIES.md`**; without the flag it writes nothing
>   and says whether the file is UP TO DATE or STALE. `npm run export` is a dry run; `npm run export -- --confirm` writes.
> - **Declared** in `PERMITTED_LOCAL_WRITERS` beside the page register, and checked against each source. **Not a census:** widening
>   the census beyond PAGE_WRITE is gap 2, a separate slot, and was not done. Row 36 still waits on archive-corpus (gap 3).
> - Ledger unchanged: 2 / 9 / 1 / 20 / 2 / 4 / 23 = 61.

> ### 🔴 GAP 2's POPULATION RE-MEASURED — THE FROZEN REGISTER UNDERSTATED THE UNGATED WRITERS — RECORDED 15 SEPTEMBER 2026, NOTHING FIXED
>
> Recorded in three stages, on the owner's ruling. The gap 1 block above is left as it was written.
>
> - **PREVIOUS MEASUREMENT — beta-g, 14 September 2026:** four `bin/*.mjs` wrote with no gate (facts-lifecycle, export,
>   checklist-boundaries, crawl — closed by gap 1). Of the rest, beta-g's reading was **3 fully ungated + 3 partially gated**:
>   audit, audit-content, audit-technical fully; supply-labels, verification-issues, gsc-ingest partially.
> - **TARGETED RE-MEASUREMENT — CC, 15 September 2026, at each write site:**
>   `bin/audit.mjs` `mkdirSync` :51 · `bin/audit-content.mjs` `mkdirSync` :86, `appendIfNew` :107, :122 ·
>   `bin/audit-technical.mjs` `appendIfNew` :140, :222, `mkdirSync` :165 · `bin/supply-labels.mjs` `appendIfNew` :178 ·
>   `bin/verification-issues.mjs` `appendIfNew` :74, :99 · `bin/gsc-ingest.mjs` evidence writes through `runIngest` :64,
>   `ledger.append` :76, :173 (its cost governor bounds network spend; it gates no write). No site sits behind a condition,
>   and none of the six files references `writePermission`, `mayWrite` or `--confirm`.
> - 🔴 **CORRECTED FINDING — SIX fully ungated bins:** audit · audit-content · audit-technical · supply-labels ·
>   verification-issues · gsc-ingest — plus **`src/evidence/store.mjs`** (`mkdirSync` :74, `appendFileSync` :121), the
>   underlying store, ungated by design because its CALLERS are expected to enforce authorization; these six are callers
>   that do not.
> - **WHY the earlier figure was wrong:** it detected writes by PRIMITIVE NAME, so every write going through a helper —
>   `appendIfNew`, `ledger.append` — was never in the population at all. The same error shape as the PAGE_WRITE census it was
>   meant to expose: it checked the file, not the site.
> - 🔴 **This is gap 2's work, not gap 3's. None of them is fixed here**, and by the owner's ruling their discovery does not
>   start another broad plumbing audit.

> ### 🔴 ROW 7 BUILT — MARKET MEASUREMENT, THE OWNED HALF — BUILT-NOT-PROVED, BECAUSE DEMAND CAN ONLY BE BOUNDED — 15 SEPTEMBER 2026
>
> - **Totals, re-derived from the rows** (2026-08-15 → 2026-09-12, dataState COMPLETE on every pull): property 2,374 impressions ·
>   20 clicks · by country 126 rows · 2,374 · 20 · by page 1,525 rows · 3,289 · 21 · by query 337 rows · 541 · 0 · country×query
>   388 rows · 541 · 0 · query×page 574 rows · 807 · 0.
> - **VISIBILITY/REACH — MEASURED** (impressions, position, clicks, CTR, where shown). **DEMAND — BOUNDED, PRESENCE ONLY,
>   MAGNITUDE UNKNOWN**, by a distinct method on the `query` field alone: at least 329 distinct human wordings were each searched at
>   least once. Impressions are never an input to it; the two methods share no stored field.
> - 🔴 **Query truncation, on both faces:** truncationReason reads null, yet only **541 of 2,374 impressions (22.8%) and 0 of 20
>   clicks carry a query** (by page 807 of 3,289, 24.5%, and 0 of 21). The often-quoted 16.4% mixes two counting bases. That the
>   missing queries are Google's anonymisation is **UNKNOWN** — the store holds the gap, not its cause.
> - **807 vs 541 — LOCALISED, NOT CLOSED:** 324 of 337 queries agree; all 266 excess impressions sit on 13 queries shown with more
>   than one of our pages. A page-dimension pull counting once per page shown is **INFERRED**, not in the store.
> - **Data lag, observed:** the same range grew from 2,261 to 2,374 impressions in 23.2 hours. **SUPPLY, AUDIENCE/NEED and
>   WORTHINESS read UNKNOWN** — each filled from an unmeasured source in the real code and RED alone.
> - 🔴 **Reported for the owner, not acted on:** rows 3, 5 and 6 stand on the query pull — 22.8% of impressions, 0 of 20 clicks.
>   **Leaves BUILT-NOT-PROVED** by an owner ruling that a presence bound is what owned DEMAND can be, or an authorised demand-magnitude
>   source. Ledger 2 / 9 / 1 / 20 / 2 / 4 / 23 = 61.

> ### 🔴 ROW 4 BUILT — LOCALIZED HUMAN THINKING — BUILT-NOT-PROVED, BECAUSE HALF ITS FAILURE CLAUSE CANNOT BE TESTED — 15 SEPTEMBER 2026
>
> - **Input:** country×query `9bf50cfb134a0d7d` — 388 rows = 379 human + 9 operator; 337 strings, **33 seen from two or more
>   countries = 32 human + 1 operator string** (arg, bra), kept out and counted. 49 countries over all rows, 48 over human rows;
>   10 with five or more rows, 19 with exactly one.
> - **Built on row 3, not row 5.** A goal is joined only by row 3's discovered relations (19 SYNONYM · 1 ABBREVIATION · 10 VARIANT
>   links); row 5's clusters are FAILED and not read, and a test fails the build if the module's imports reach them. After the
>   first run an ABBREVIATION pair joins wordings only in the same frame — 13 pairs sharing only a landing page were refused.
> - **37 goals from two or more countries: 12 worded differently, 25 the same wording.** E.g. "daily habits" (can, gbr, hkg, ind,
>   qat, usa) beside "life habits" (usa). "daily lifestyle" and "personal habits" are **not** joined to it: row 3's evidence does
>   not link them. **Thin evidence:** 38 of 48 countries are UNKNOWN below a floor of 5 rows — never "no local difference".
>   Local REASONING is not observable in query rows.
> - **FAILURE (a), a country multiplying URLs — not met:** no consumer of the module builds an address from a country.
>   🔴 **FAILURE (b), materially different useful content — BLOCKED, NOT TESTED:** the answer at each country is not in the
>   store, and a different question is not a different answer. **Unblocked by per-value answer evidence — the owner's pending decision.**
> - 🔴 **What the census cannot see, above all:** the connected products' own pages. Origin is **already hard-coded into 775 of
>   the 1,525 pages** (1,179 impressions), on 2 supporting queries, with pages differing only by origin overlapping at median 0.806.
> - Each limb RED alone in the real files, containment proved first. Rows 3, 5 and 6 do not move. Ledger 3 / 8 / 1 / 20 / 2 / 4 / 23 = 61.

> ### 🔴 ROW 3 RUN — KEYWORD & SEARCH-LANGUAGE DISCOVERY — THE OWNED HALF ONLY — VERIFIED-PASS — 15 SEPTEMBER 2026
>
> - **Input:** the owned Search Console rows already in the store — query (`45ce21253a3fc58c`), query×page (`c97334fdd102df8e`)
>   and country×query (`9bf50cfb134a0d7d`). No fetch, crawl, provider or network of any kind.
> - **Stored:** 329 records in `runs/discovery/search-language-2026-09-15.json`, each carrying the original bytes, its kinds with
>   evidence, and every source observation_id and ingest date — **207 LONG_TAIL · 26 SYNONYM · 17 ABBREVIATION · 53 LOCAL**, and
>   **106 UNCLASSIFIED** counted separately. 8 operator strings excluded, by name.
> - **Each FAILURE limb RED alone** in the real files, then restored by sha256: wording normalised, keyword untraceable, a keyword→URL
>   path, and the intent lexicon read by the discovery code. **Held-out:** 61 of 61 hash-chosen records re-resolved against the raw
>   store — a TRACEABILITY check, not a generalisation check, and not row 5's held-out.
> - **The census's limits are on the row:** it cannot see a page written by hand, data copied elsewhere, a consumer outside src/ and
>   bin/, a computed import, or a path held only as text and run by another module. The lexicon was compared only AFTER discovery, both ways, and not tuned: the lexicon claims 103 of
>   its 115 pairs with no owned evidence; the owned data holds 6 pairs the lexicon does not.
> - 🔴 **The PUBLIC half stays DEFERRED.** Row 5 stays FAILED, row 6 stays BUILT-NOT-PROVED; no page, route or slug was made.
>   Ledger 4 / 7 / 1 / 20 / 2 / 4 / 23 = 61.

> ### 🔴 fcd27d6 — LOCALLY PASSING; CI NEVER RAN ON IT; FIRST EXECUTED ON 07df435 — CORRECTED 15 SEPTEMBER 2026 — NO ROW MOVED
>
> - **fcd27d6 (PR #82, the subject registry leaving this repository):** **LOCALLY PASSING** — 1,111 tests, 0 fail,
>   0 skipped, on the owner's machine.
> - 🔴 **CI NEVER EXECUTED ON fcd27d6 ITSELF.** Both of its runs — 34908985957 on the merge commit, and 34908203940 on head
>   eff0233 — failed at the data-repository checkout ("Bad credentials"); setup, the suite and the boundary census were skipped.
> - **CI first executed this code on 07df435** — fcd27d6 plus the read-only deploy key (PR #83, owner ruling A), run
>   **34910905742**; then on main at the merge **11ba98d**, run **34911433119**. Both printed **1,111 tests · 1,107 pass · 0 fail ·
>   4 skipped**, with the data repository checked out over SSH at a4b38cf, boundary 0 code lines, sealed-corpus census 0 breaches.
> - **The 4 skips are pre-existing** — the four LIVE tests in test/renderer.test.mjs, skipped on every push run because test.yml
>   installs no playwright-core (they skipped on 06050a8 and 0e3bbd0 too). **They executed separately in renderer-live run
>   34911619574 on 11ba98d**, pressed once: all four PASSED, including every outbound request refused with ZERO egress, and
>   test/renderer.test.mjs ran **19 · 19 pass · 0 fail · 0 skipped**.
> - 🔴 **No row moved on any of it, and none rests on it.** Running the renderer's LIVE tests is not item 52's rendering trigger
>   and not item 52's evidence. The ledger stays 5 / 7 / 1 / 19 / 2 / 4 / 23 = 61.

> ### 🔴 OPTION A — THE SUBJECT REGISTRY LEAVES THIS REPOSITORY — OWNER RULING, 14 SEPTEMBER 2026 — NO ROW MOVED
>
> - **The ruling:** row 1 says *"keep each product's data, evidence, costs and learning ISOLATED"*; a product's own data
>   inside this repository was never what it said. `products/almi-oet/**` — **16 files, 186,730 bytes as committed** — now
>   lives in its own private repository, `smnasiruz016-blip/almi-visibility-data` (`C:\Projects\almi-visibility-data`,
>   commit `a4b38cf`), written from the committed blobs and verified per file (sha256 and git object id) before `git rm`.
>   File history did not follow; the source commit `0e3bbd0` is named in its README. The neutral declared test product, all
>   of `runs/`, and this engine's own measurements OF a product stay.
> - **Found on the way:** this machine's checkout (`core.autocrlf=true`) held 15 of the 16 files as CRLF while every blob is
>   LF — a working-tree copy was refused by its own blob check and nothing was removed until the copy came from the blobs.
> - **Subjects are found through a LIST of roots** (`config/subject-roots.mjs`, override `ALMIVISIBILITY_SUBJECT_ROOTS`):
>   an id in two roots is refused naming both paths; a missing root is refused naming its path; the id law is unchanged.
>   The moved files are not edited — their `../../src/` imports resolve into THIS engine's `src/` through a resolution hook
>   that refuses any other escape.
> - **Five welded runners unwelded, not four:** `facts-lifecycle`, `page-quality`, `report`, `source-integrity` (a path
>   string) and `axis-discovery` (a folder listing). Each takes `--product=<id>` with no default; each output re-run
>   unchanged. `test/entry-points.test.mjs` now fails a runner that names a product folder in a STRING — RED-proved by putting
>   one line back (runs/audit/option-a-entry-points-red-2026-09-14.txt).
> - **Row 53 re-sat on the new layout: still VERIFIED-PASS**, three sabotages RED (runs/audit/row53-portability-red-2026-09-14.txt).
>   **Row 54 is BLOCKED-UNKNOWN, as it was** — no cost entry names a product and no learning record exists. **Row 61 is
>   unchanged** — the neutral product still declares no page spec.
> - ⚠️ **CI** checks out the data repository beside this one and needs the repository secret `ALMI_VISIBILITY_DATA_TOKEN`
>   (read-only), which only the owner can add.

> ### 🔴 ROW 6 BUILT AND RUN — AXIS DISCOVERY — NO AXIS ACCEPTED, NONE REJECTED — 14 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 6 | **5** (− 6) |
> | BUILT-NOT-PROVED | 6 | **7** (+ 6) |
>
> - **moved because WORK HAPPENED:** 6 NOT-STARTED → BUILT-NOT-PROVED — built and run on the subject's real evidence, and
>   stopped there on the owner's answer. **moved ONLY because a RULING changed:** none.
> - **Tested, not assumed:** the six axes the contract names, read from its own EXPECTED clause (origin/destination as its two
>   directions), and 7 slot types the evidence carried that none of them claims — each with seven legs, every leg with a basis.
>   **7 MONITOR · 7 UNKNOWN · 0 BUILD · 0 REJECT.**
> - 🔴 **The two axes this project built around, on their own evidence:** **profession UNKNOWN** — 3 human queries, yet the
>   connected product declares it by hand and 89 pages carry it. **origin UNKNOWN** — 2 human queries naming one nationality,
>   yet it is hard-coded into **775 of the 1,525 pages** (1,179 impressions), and our pages differing only by origin share a
>   median 0.806 of their body. Neither is rejected: thin evidence is a fact about our data (LAW-ABSENT-1).
> - **Locality:** the question mix differs from the rest in all **10** countries with five or more rows (aus, usa, gbr, ind at
>   p ≈ 0.001); the other **38** are UNKNOWN, never "no power". Measured once operator rows are out: **48** searcher countries.
> - **Why nothing is BUILD or REJECT:** whether the useful ANSWER changes along an axis is UNKNOWN everywhere — the answer at
>   each value is not in the store (row 7's SUPPLY and row 2 are deferred), and all 337 query rows carry 0 clicks.
> - 🔴 **Why not VERIFIED-PASS:** its EVIDENCE clause asks for the evidence behind each accepted axis and each rejected one, and
>   both populations are empty. **Evidence:** runs/audit/row6-census-2026-09-14.txt · runs/audit/row6-red-limbs-2026-09-14.txt.

> ### 🔴 ROW 5 RUN — INTENT & QUESTION CLUSTERING — AND FAILED ON ITS HELD-OUT CHECK — 14 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 7 | **6** (− 5) |
> | FAILED | 1 | **2** (+ 5) |
>
> - **moved because WORK HAPPENED:** 5 NOT-STARTED → FAILED — its test run against its frozen boundary on the real query
>   pull (`45ce21253a3fc58c`, 337 rows). **moved ONLY because a RULING changed:** none. FAILED is counted and named
>   separately, is **not progress**, and is worth more than a row nobody ran.
> - **The input, measured:** 337 query rows = **329 human** + **8 operator strings, classified and kept, not dropped** —
>   4 `site:` inspections of the estate's own hosts, 3 carrying one fixed exclusion list of 11 social and review platforms
>   on three unrelated terms (an automated monitoring or scraping tool, inferred from form), 1 exact-phrase fact lookup.
> - **In-sample — met:** 268 queries → 73 clusters, **0 merged · 0 split** against a reference written before the clusterer
>   ran (75 intents, 6 ambiguous; 2 amendments, each citing the rule the original broke). Every member keeps its wording
>   byte for byte; "47" and "65" inside a question are one intent with two slot values, by an explicit ruling.
> - 🔴 **Held-out — the FAILURE clause, met:** 61 held out → **49 HIT · 12 MISS**. All 12 are *identical intents left split*,
>   each on a word the frozen lexicon never saw; 0 joined a wrong intent. The owner's answer: FAILED.
> - **Evidence:** runs/audit/row5-census-2026-09-14.txt · runs/audit/row5-red-limbs-2026-09-14.txt (six limbs, each RED
>   alone in the real files, restored by sha256).
> - 🔴 **The limit, on the row:** the reference is a model's judgement standing in for a human's; clustering never proves a
>   group is the intent a real person had (row 2, DEFERRED).

> ### 🔴 ROW 60 TICKED — OPTION A: A DECISION ON RECORD IS NOT A FINDING EITHER — 14 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | BUILT-NOT-PROVED | 7 | **6** (− 60) |
> | VERIFIED-PASS | 18 | **19** (+ 60) |
>
> - **moved because WORK HAPPENED:** 60 BUILT-NOT-PROVED → VERIFIED-PASS — its census run over the real store and its four
>   frozen evidence limbs re-run alone (runs/audit/row60-populations-red-limbs-2026-09-14.txt). **moved ONLY because a RULING
>   changed:** none — 🔴 but the tick rests on three owner rulings of the same day that moved what counts as a finding, each
>   put to the ANTI-CIRCLE self-check with its answer recorded (`ROW60_POPULATIONS_RULING.md` Part 3).
> - **Four populations, every one of 2,033 distinct issues in exactly one:** FINDINGS **541** (530 open, 14 classes, every
>   one ruled) · COVERAGE GAPS **1,224** · DECISION ON RECORD **134** · AUDIT TRAIL **134**.
> - 🔴 **The decision is louder, not quieter:** `noindex-declared-deliberate` — 134 pages, 484 search impressions, waiting on
>   REC-NOINDEX-CV-GUIDE — now sits FIRST on the owner's report, above every finding.
> - **The archive rule, the owner's answer:** withdrawn claims only. `instrument-disagreement` (11, all CLOSED) stays a live
>   HIGH finding — a zero-open rule would have swept it, against its own ruled reason.
> - 🔴 **The limit, on the row:** it proves the engine applies the owner's judgement consistently; it never proves a level is
>   well chosen.

> ### 🔴 ROW 60 · AN UNMEASURED CHECK IS NOT A FINDING — 14 OF 16 CLASSES RULED — 14 SEPTEMBER 2026 — NO ROW MOVED
>
> - **No state moved, and the tally above is unchanged.** Row 60 stays BUILT-NOT-PROVED.
> - **The owner's ruling** (`ROW60_COVERAGE_AND_LEVELS_RULING.md`, hash-pinned): a check that never ran says nothing about
>   the product — it says we could not look. So the **1,224** left the findings population for
>   `config/coverage-register.mjs`: separately counted, never ranked, never given a level, each entry naming what input or
>   capability is missing. **Findings: 809 distinct issues, 664 open, 16 classes. Coverage: 1,224, 6 classes.**
> - **Levels ruled:** MODERATE for `indexability-preflight-found` (158), `thin-content-found` (118), `near-duplicate-found` (5)
>   and `template-dominance-found` (2), each resting on consequence, not on the count. **Corrected on the record:** the orphan
>   escalation (LOW → MODERATE) is VOID — it rested on 340 checks that never ran; the figures 113, 110 and 226 were not
>   real, and are now 5, 2 and 118. Every blast-radius figure is now held to the store's real findings.
> - **Not ruled, on the owner's answer:** the two noindex classes stay UNCLASSIFIED — NONE is *verified* no adverse
>   consequence, and their records are verdict UNKNOWN on whether the rule is right. **That is row 60's unmet clause.**
> - **WHY_THIS_URL:** both declared specs now carry beta-g's rationale word for word; Gate A part 4 PASSES on both, and both
>   candidates are still REFUSED (runs/audit/why-this-url-construction-run-2026-09-14.txt). No third spec; rows 21 and 61 unchanged.

> ### 🔴 ROW 60 · 1,224 "FINDINGS" WERE CHECKS THAT NEVER RAN — SEVEN CLASSES SPLIT — 14 SEPTEMBER 2026 — NO ROW MOVED
>
> - **No state moved, and the tally above is unchanged.** Row 60 stays BUILT-NOT-PROVED.
> - **What the store holds, measured over every file under `runs/` with state changes applied:** 2,033 distinct issues —
>   **673 FAIL** (a check found a defect), **1,224 checks that never ran** (verdict UNKNOWN with MISSING_INPUT,
>   NEEDS_RENDERED_HTML or TOOL_FAILED), 136 other UNKNOWN. The 1,224 sat under seven names that read as defects found.
>   🔴 That is absence of evidence presented as a finding — and `orphan-within-crawled-set`'s ruled MODERATE rested on
>   340 such records and **no found orphan**.
> - **Split on the owner's answer ("All seven"), each on the signal its own records carry** (`config/class-splits.mjs`):
>   `indexability-preflight` 158 found / 210 not run · `sitemap-advertises-blocked-url` 0 / 350 · `orphan-within-crawled-set`
>   0 / 340 · `thin-content` 118 / 108 · `near-duplicate` 5 / 108 · `template-dominance` 2 / 108 · `noindex` 134 withdrawn
>   defect claims (all SUPERSEDED) / 134 declared deliberate (all OPEN). No issue's id, evidence, opened_at or state changed.
> - **The register:** 10 ruled classes unchanged and attributed; 12 halves UNCLASSIFIED and unruled, no parent level carried
>   down; the 7 bundled entries superseded with every word kept. Six split limbs RED alone in the real files and restored
>   (runs/audit/row60-split-red-limbs-2026-09-14.txt). **Next:** the owner rules the 12 halves on the regenerated sheet.

> ### 🔴 ROW 60 RULED BY THE OWNER · ROW 17's REAL GAPS CLOSED — 14 SEPTEMBER 2026 — NO ROW MOVED
>
> - **No state moved, and the tally above is unchanged.** Rows 60 and 17 both stay BUILT-NOT-PROVED, each with its
>   exact unmet limb named on the row.
> - **Row 60 — the owner ruled the scale, the law and the assignments, and the row is still not proved.**
>   `ROW60_CONSEQUENCE_LAW.md` (hash-pinned) freezes the scale — CRITICAL · HIGH · MODERATE · LOW · NONE, with
>   UNCLASSIFIED a state and not a level — and A1–A4. The register holds the adopted assignments word for word:
>   **HIGH 4 · MODERATE 6 · LOW 4 · CRITICAL 0 · NONE 0 · UNCLASSIFIED 3**, every classified entry with all six parts,
>   and `orphan-within-crawled-set` the one escalation by blast radius. Priority is consequence first, with impressions
>   only amplifying inside a level. Seven limbs RED alone in the real files, restored and hash-checked
>   (runs/audit/row60-law-red-limbs-2026-09-14.txt). **Not met:** EXPECTED's *"every finding CLASS present in the store
>   carries a consequence level"* — `noindex`, `indexability-preflight` and `sitemap-advertises-blocked-url` bundle
>   two opposite consequences and stay UNCLASSIFIED until split. `REC-AI-CRAWLER-BLOCK` stays UNCLASSIFIED / UNKNOWN.
> - **Row 17 — the capability was already built; the command that said otherwise was written from a stale line**
>   (`FACT-1`, `DOC-1`'s sixth instance). Only the three real gaps were built: kind `derived` in the registry (F28,
>   F29), a changed input detected without a caller naming it, and a byte-stable derivation. **Not met:** its INPUT —
>   0 of 46 records are derived, and none was added.

> ### 🔴 AMENDMENT 3's WORK HALF — ROW 59 TICKED · ROW 60 BUILT, WAITING ON THE OWNER — 14 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 9 (3, 4, 5, 6, 7, 57, 58, 59, 60) | **7** (3, 4, 5, 6, 7, 57, 58) |
> | BUILT-NOT-PROVED | 6 | **7** (+ 60) |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | **18** (+ 59) |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 23 | 23 |
>
> - **moved because WORK HAPPENED:** 59 NOT-STARTED → VERIFIED-PASS · 60 NOT-STARTED → BUILT-NOT-PROVED.
>   **moved ONLY because a RULING changed:** none. The owner released the work half; no boundary moved.
> - **Row 59 · Falsifiability of Findings — VERIFIED-PASS.** `bin/refutation-census.mjs` read the presented population
>   from the store — **17 finding classes and 3 recommendations, 20** — and all 20 carry a structured refutation
>   (observation · source · condition) whose source names a method this product holds. Every EVIDENCE limb was
>   sabotaged ALONE in the real register — a refutation removed, each of the three parts emptied, a method we do not
>   hold — each RED on that limb only, each restored and hash-checked. **Backfill: 20 written, 0 that could not be
>   written.** 🔴 **The limit, on the row:** the census proves presence and a held method; it CANNOT prove a
>   refutation is well chosen — that is human judgement. Refutations are declared per finding class, never written
>   into the append-only evidence store.
> - **Row 60 is BUILT-NOT-PROVED by design — the row working, not falling short.** `config/consequence-register.mjs`
>   holds all 17 classes present in the store, every level **UNCLASSIFIED**, none filled in; it reconciles line by line.
>   Every presented priority now shows its basis (MEASURED VOLUME, or NONE), the register entries that applied, and a
>   consequence that reads UNKNOWN — never low. Every limb RED alone and restored. It waits on the owner's level for
>   each of the 17 classes.
> - 🔴 **The committed report was regenerated, and it had been STALE.** Rendering row 60's basis onto
>   `runs/report/index.html` also brought three older sections current: the label census (OBSERVED 614 → 598, UNKNOWN
>   14 → 30, after the nine facts demoted on 13 September), the source tiers (OFFICIAL 32 → 16), and seven cost-ledger
>   lines recorded on 13 September. **Item 56 was verified by the owner's own look at an earlier render of this page.**
>   Its state is not moved and its screenshots are unchanged, but the page he looked at is not the page committed now.

>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 7 (3, 4, 5, 6, 7, 57, 58) | **9** (+ 59, 60) |
> | BUILT-NOT-PROVED | 5 | **6** (+ 61) |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | 17 |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 23 | 23 |
> | **rows** | 58 (+ row 61 reserved) | **61** |
>
> **In scope, measured — not copied from any brief.** Amendment 4 left P 27 + S 8 = **35**. Amendment 5 added row 61
> (P) = **36**. Amendment 3 adds rows 59 and 60 (both P) = **38**. The ledger now holds P 30 · S 8 · D 23 over 61 rows,
> and `tools/verify-pass-boundaries-source.mjs` checks that count against the loaded rows. 🔴 **Disagreements found and
> recorded:** the Amendment 3 brief said *"in scope becomes 32"* (true before Amendments 4 and 5 — corrected in the
> amendment itself), and this file said *"in scope becomes 37 only when Amendment 3's rows 59 and 60 land"* (written
> before row 61 existed — corrected where it stands).
>
> - **Rows 59 · FALSIFIABILITY OF FINDINGS and 60 · CONSEQUENCE-WEIGHTED PRIORITY — NOT-STARTED.** Admitted by owner ruling
>   (13 September 2026 under §12, re-issued 14 September 2026). By the owner's answer of 14 September 2026 they are
>   **admitted only**: no census, no refutation backfill, no consequence register, no priority basis is built.
> - **moved because WORK HAPPENED:** row 61 only — NOT-STARTED → BUILT-NOT-PROVED, the work of PR #72.
>   **moved ONLY because a RULING changed:** none; rows 59 and 60 were ADDED and arrive NOT-STARTED.
> - 🔴 **Row 61 is CREATED, and it is BUILT-NOT-PROVED — not VERIFIED-PASS.** Work happened: the runner is generic, Gate A
>   fails closed, the RED/GREEN proof exists. Not proved: its EVIDENCE clause needs *"a run on two different products, one
>   of them the neutral test product"*, and the neutral product was refused AT THE RUNNER ("it declares no page spec") —
>   the full path was proved only with a spec declared inside a test, and a test fixture is not a declared product.
>   - **The missing leg:** a second DECLARED product with its own DECLARED page spec, reached end to end through
>     `bin/build-page.mjs`.
>   - **Blocked on an OWNER DECISION:** a second neutral declared test product that declares a page spec, or a
>     deliberate re-pin of row 53's coverage (row 53, VERIFIED-PASS, pins the neutral product's empty page specs).
>   - **What stops ANY real page:** no page spec declares a WHY_THIS_URL_DESERVES_TO_EXIST (whoever owns the evidence
>     writes them; none has been written; CC does not invent one) · and a template family needs at least THREE specs
>     before unique words and sibling overlap can be measured (D-GATEA-1); two exist.

> ### 🔴 AMENDMENT 5 — ROW 61 RESERVED: SAFE LOCAL PAGE CONSTRUCTION — OWNER RULING, 14 SEPTEMBER 2026
>
> | | before this change | after |
> |---|---|---|
> | the 58-row ledger | 7 / 5 / 1 / 17 / 1 / 4 / 23 | **unchanged** |
> | reserved rows | 0 | **1 — row 61, class P, NOT-STARTED** |
> | in scope (P + S, plus reserved rows) | 35 | **36** |
>
> - **moved because WORK HAPPENED:** none. **moved ONLY because a RULING changed:** none — row 61 was ADDED by ruling and arrives NOT-STARTED.
> - 🔴 **Row 61 is RESERVED, not created.** Rows 59 and 60 exist nowhere in this repository (Amendment 3 has not been given), and the
>   ruling says to reserve 61 and never renumber. Its four-part contract is read out of §4 of `PASS_BOUNDARIES_AMENDMENT_5.md`
>   (`cab59fe7…`), verbatim. Q7 was tested against the record: no dependency of 59 or 60 points into 61, so 61 does not wait.
> - **Built in the same change, and still NOT-STARTED:** the runner takes `--slug` / `--all-slugs` with no default, and Gate A's four
>   frozen parts are enforced inside the construction path, failing closed. **Accepted pages: 0 of 3 candidates across two products.**
>   A refusal is the deliverable; the row is not ticked here, and generator output is **not** item 25's evidence.
> - 🔴 **PAGE-1 stays UNSATISFIED:** four gate families (semantic, cannibalization, technical, cost) do not exist, and none was built.

> ### 🔴 AMENDMENT 4 — THE DISCOVERY ROWS ENTER SCOPE — OWNER RULING, 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 2 (57, 58) | **7** (3, 4, 5, 6, 7, 57, 58) |
> | BUILT-NOT-PROVED | 5 | 5 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | 17 |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | **23** |
>
> | class | as frozen (`PASS_BOUNDARIES_SOURCE.md` §6) | in force |
> |---|---|---|
> | P | 24 | **27** |
> | S | 6 | **8** |
> | D | 28 | **23** |
> | in scope (P + S) | 30 | **35** |
>
> - **moved because WORK HAPPENED:** none. **moved ONLY because a RULING changed:** 5.
> - **4 · Localized Human Thinking, 5 · Intent & Question Clustering, 6 · Axis Discovery — class D → P.** **3 · Keyword &
>   Search-Language Discovery — D → S:** the owned half in scope, the public half deferred and named. **7 · Market
>   Measurement — D → S:** DEMAND and VISIBILITY/REACH in scope; SUPPLY, AUDIENCE/NEED and WORTHINESS deferred and named.
> - **2 · Human Question Discovery stays DEFERRED, and why:** its input is legitimate public question evidence, and no
>   fetch is authorised. Moved in, it would be a row born without its input — paperwork, not progress.
>
> **A class change is not progress.** No row reached VERIFIED-PASS, none lost one, nothing was built or run for rows 2–7,
> and the five arrive NOT-STARTED. Each was tested against its own frozen INPUT clause first: their input is owned
> evidence already in `runs/evidence/evidence.jsonl` (Search Console ingest of 2026-09-12T23:25Z — query 337 ·
> query-page 574 · country 126 · country-query 388 rows; page rows 1,525 from 22:06Z the same day).
>
> 🔴 **The frozen text did not move.** `PASS_BOUNDARIES_SOURCE.md` is untouched and still verifies (`16c58016…`); the class
> moves are read out of `PASS_BOUNDARIES_AMENDMENT_4.md` (`c802429e…`, re-pinned for its addendum; first pinned
> `4d0dea70…`), and the census they produce is checked against the amendment's own count table by
> `tools/verify-pass-boundaries-source.mjs`.
>
> 🔴 **The three gaps PR #71 raised are closed by the owner's dated addendum (13 September 2026):** row 7's
> **WORTHINESS** goes to the deferred half, and rows 3 and 7 each have a **four-part contract for their owned half**,
> read from the amendment. The contract guard now finds both rows complete — and the ledger still refuses a tick on
> either, because **a contract is not progress: both stay NOT-STARTED.** One thing is recorded and not corrected:
> the addendum's reason calls rows 2, 19 and 21 WORTHINESS's *"own named inputs"*, and no frozen text in this
> repository names them so. *In scope becomes 37 only when Amendment 3's rows 59 and 60 land; that is a separate
> command and not in this change.* 🔄 **Corrected 14 September 2026:** that "37" was written before row 61 existed.
> With row 61 (Amendment 5) and rows 59 and 60 (Amendment 3), in scope is **38** — see the Amendment 3 block above.

> ### 🔴 THE 9 AMBIGUOUS LABELS DEMOTED — 13 SEPTEMBER 2026, EVENING
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 2 (57, 58) | 2 (57, 58) |
> | BUILT-NOT-PROVED | 5 | 5 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | 17 |
> | FAILED | 1 (50) | **1 (50)** |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 50, OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation, stays FAILED on a NEW reason.** The 9 previously-VERIFIED labels that rested on a reading the reconciliation could not settle were **DEMOTED** to UNKNOWN — PARTIAL_EVIDENCE by beta-g ruling under owner steer *"it will not be made by picking the reading that keeps the label"*: 6 whose qualifier (destination of a fee, or the practitioner group a requirement applies to) is not part of the value text and is not named by the verdict, 2 lists whose completeness is not named, 1 rule whose binding party is not named. **Item 50 STAYS FAILED** because the guard's formula (declared ∩ named-confirmed) still advances all 9 — the demotion required a human ruling to catch what the formula could not, and a fresh record with the same defect would still be advanced. The formula fix (R4 in the ruling brief) is a follow-up amendment, not part of this change.
>
> - **measured, not predicted:** verified facts **25 → 16**; UNKNOWN **21 → 30** (CONFLICT 6 · INCOMPLETE 4 · PARTIAL_EVIDENCE **19** · SOURCE_UNREACHABLE 1). Item 50's `remainingPopulation` message now names the guard-formula gap explicitly.
> - **moved because WORK HAPPENED:** none — no row moved. **moved ONLY because a RULING changed:** none — the ruling settles per-record labels, not row states.
>
> **No row reached VERIFIED-PASS; none lost one.** Row 15 stays VERIFIED-PASS on 16 verified facts; the real pair used to prove leg (iii) (IE-NMBI + UK-NMC nursing minimum grades) still exists as records with different values even though UK-NMC is now UNKNOWN. Row 16 unchanged; no real fact is stale. Row 50 stays FAILED with a NEW `remainingPopulation` message.
>
> 🔴 **The ruling brief lives at `_handoffs/AlmiVisibility_BETA_G_RULING_9_AMBIGUOUS_2026-09-13_NIGHT.md`** — R1/R2/R3 (per-category demotion) are what this change implements in the softest form; R4 (schema fix that hardens the guard) and R5 (bounded recheck of the 12 September verdicts) remain owner decisions.

> ### 🔴 ITEM 50 — THE REMAINING POPULATION RECONCILED, AND THE TICK WITHHELD A THIRD TIME — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 2 (57, 58) | 2 (57, 58) |
> | BUILT-NOT-PROVED | 5 | 5 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | 17 |
> | FAILED | 1 (50) | **1 (50)** |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 50, OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation.** Every
> VERIFIED label in the registry has now passed through the guard. The 32 records #64 named each declare their elements
> and name the keys their verdict's own words confirmed; the guard polices **36** records, **25 advanced, 11 refused**, and
> **8 returned to UNKNOWN / PARTIAL_EVIDENCE** with their verdict wording untouched. It stays FAILED because **9 of the 25
> VERIFIED labels rest on a reading the reconciliation cannot settle** (6 unnamed qualifiers, 2 lists whose completeness
> is unnamed, 1 rule whose binding party is unnamed) — those labels cannot be shown right. FAILED is not progress, and it
> is worth more than BUILT-NOT-PROVED: it means we looked.
>
> - **measured, not predicted:** verified facts **33 → 25**; UNKNOWN **13 → 21** (CONFLICT 6 · INCOMPLETE 4 ·
>   PARTIAL_EVIDENCE 10 · SOURCE_UNREACHABLE 1). A number that falls because it was finally counted.
> - **moved because WORK HAPPENED:** none. **moved ONLY because a RULING changed:** none.
>
> **No row reached VERIFIED-PASS; none lost one.** Row 15 stays VERIFIED-PASS on 25 verified facts. Row 16 is unchanged:
> no real fact is past its recheck date (the earliest still falls due 2026-12-11) and its conflicts are untouched.

> ### 🔴 ITEM 50 REOPENED — THE TICK OF #63 WITHDRAWN — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 2 (57, 58) | 2 (57, 58) |
> | BUILT-NOT-PROVED | 5 | 5 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 18 | **17** (−50) |
> | FAILED | 0 | **1 (50)** |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 50, OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation.** Its
> FAILURE condition — *a label is absent or wrong* — was met on a real record the guard had advanced: the writing record
> was labelled VERIFIED on a verdict that confirmed three of the six claims its value makes, with a supplied "not found"
> count of 0 that the guard trusted. FAILED is not progress, and it is worth more than BUILT-NOT-PROVED: it means we looked.
>
> - **moved because WORK HAPPENED:** 50 VERIFIED-PASS → FAILED, **reopened** on concrete contradictory evidence. The record
>   was corrected to UNKNOWN (not re-verified), and the guard now RECONCILES each record's declared elements against the
>   keys its verdict names (D-GUARD-1), each limb RED-proved alone. Its own test re-runs green on the corrected four
>   (1 advanced, 3 refused) — 🔴 **but the move back is WITHHELD:** 32 of the 33 VERIFIED labels reached VERIFIED on 12
>   September without the guard or any element reconciliation, and 11 of them state more than one claim. The defect that
>   reopened item 50 is unexamined on those labels, so its FAILURE condition cannot be shown not-met.
> - **moved ONLY because a RULING changed:** none.
>
> **No row reached VERIFIED-PASS; one LOST it — item 50.** Row 15 stays VERIFIED-PASS; its verified facts are **33**,
> measured (32 on 12 Sep; #63's 34 counted the writing record).

> ### 🔴 ITEM 50 — THE REAL TRANSITION TEST — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 2 (57, 58) | 2 (57, 58) |
> | BUILT-NOT-PROVED | 5 | 5 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 17 | **18** (+50) |
> | FAILED | 1 (50) | **0** |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 0. Item 50 LEFT FAILED by rule 1's first route** — its test re-run on real
> records, and passed. FAILED at zero is not a column tidied away: it is a known defeat that was repaired, and the move
> records its route. FAILED was never progress, and it was worth more than BUILT-NOT-PROVED: it meant we had looked.
>
> - **moved because WORK HAPPENED:** 50 FAILED → VERIFIED-PASS — four real OET records, un-parked by the owner for this
>   test only and verified by beta-g in one pass, were put to the F24 guard leaving UNKNOWN: two with sufficient
>   evidence advanced on a new measurement, two with insufficient evidence were REFUSED and stay UNKNOWN with their
>   reasons. Both directions RED-proved. The two-and-two split is the sources' doing, not the tester's.
> - **moved ONLY because a RULING changed:** none. The owner's un-park ruling supplied the input; no boundary changed.
>
> **One row reached VERIFIED-PASS; none lost one.** Item 15 stays VERIFIED-PASS (its verified facts 32 → 34); item 16
> does not move (its six conflicts and its freshness population are untouched). 🔴 **No OET text is stored** — and the
> policy wording this repository HAD quoted, while recording that the policy forbids storing it, was found by hash and
> removed from the current tree.

> ### 🔴 ITEM 47 AND ITEM 53 — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 (47, 57, 58) | **2** (57, 58) |
> | BUILT-NOT-PROVED | 6 | **5** |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 15 | **17** (+47, +53) |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 4 (1, 9, 52, 54) | 4 (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 50, unchanged.** FAILED is not progress.
>
> - **moved because WORK HAPPENED:** 47 NOT-STARTED → VERIFIED-PASS — the four paid-provider controls built against a
>   FAKE provider (no account, no real call), each RED-proved, every refusal in the cost ledger as REFUSED with its
>   reason; 53 BUILT-NOT-PROVED → VERIFIED-PASS — a neutral declared test product run through the generic core with no
>   first-product knowledge, and the first product's private records proved not to leak during that same run.
> - **moved ONLY because a RULING changed:** none.
>
> **Two rows reached VERIFIED-PASS; none lost one.** **Item 54 does not move:** the run produced no cost record and no
> learning record tied to any product, so two of its four classes still do not exist to be tested.

> ### 🔴 THE COMPLETION LAW FROZEN · ITEM 56 VERIFIED BY THE OWNER · THE BACKLOG OPENED — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 6 | 6 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 14 | **15** (+56) |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 5 | **4** (1, 9, 52, 54) |
> | DEFERRED | 28 | 28 |
>
> - **moved because WORK HAPPENED:** 56 BLOCKED-UNKNOWN → VERIFIED-PASS, by **OWNER VERIFICATION** — the owner's
>   own visual check, the only route that may set it; four screenshots committed; the finding he overruled
>   (the cost ledger scrolls sideways at narrow width — *not clipping*) kept on record and moved to PD-1.
> - **moved ONLY because a RULING changed:** none. **Item 9 kept its state**; its label is now **BLOCKED /
>   UNKNOWN BY EXTERNAL PREREQUISITE**, with its missing evidence, blocker and unlock condition on the row.
>
> The owner's completion ruling is frozen (`OWNER_RULING_2026-09-13_COMPLETION_LAW.md`): the checklist says
> WHAT, the boundaries say WHEN, the ruling says HOW the path is walked. Two of the five reopen grounds were
> worded differently in the ledger — his wording now governs. `POST_DONE_BACKLOG.md` is open; D-KEY-2 was
> listed for it and stays on the path, because item 10's frozen INPUT names redirect chains.

> ### 🔴 THE RENDERER, BUILT — THE CAPABILITY ONLY — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 6 | 6 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 14 | 14 |
> | FAILED | 1 (50) | 1 (50) |
> | BLOCKED-UNKNOWN | 5 | 5 |
> | DEFERRED | 28 | 28 |
>
> **No row moved, as expected.** An offline headless-Chromium renderer now exists (R-REND-1). Over the 394
> committed bodies: **COMPLETE 0 · PARTIAL 394 · FAILED 0**, 10,222 requests refused, **0 egress**, and
> rendered hash ≠ raw hash on **394 of 394** — a count, with nothing looked at about which pages or why.
> A renderer is a capability; the source-versus-render DETECTOR is not written. Item 10's post-JavaScript
> half is now capable rather than impossible, and stays DEFERRED until an owner rules.
> - **moved because WORK HAPPENED:** none. **moved ONLY because a RULING changed:** none.

> ### 🔴 GATE A's BLIND SPOT FIXED, AND THE TWO FAILED ROWS — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 6 | 6 |
> | TESTABLE-NOW | 1 (25) | 1 (25) |
> | VERIFIED-PASS | 13 | **14** (+51) |
> | FAILED | 2 (50, 51) | **1 (50)** |
> | BLOCKED-UNKNOWN | 5 | 5 |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 50, OBSERVED / INFERRED / RECOMMENDED / UNKNOWN
> Separation. Item 50 stays FAILED, on an argued reading of its own boundary.** The UNKNOWN→PASS guard now
> governs issue transitions too — closing an UNKNOWN issue was a real, unguarded path from UNKNOWN to PASS —
> and it judges 145 real transitions. But every one starts from FAIL: the population the guard exists to
> police, a real record leaving UNKNOWN, is still empty. FAILED is not progress, and it is worth more than
> BUILT-NOT-PROVED: it means we looked.
>
> **One row reached VERIFIED-PASS in this change: item 51. None lost one — item 12 included:** its
> near-duplicate check is a different metric from Gate A's overlap, proved by an identical-pair fixture.
>
> - **moved because WORK HAPPENED:** 51 FAILED → VERIFIED-PASS (priority, confidence and cost each computed
>   from stored evidence and each able to say UNKNOWN; all six on the real report).
> - **moved ONLY because a RULING changed:** none.
>
> 🔴 **D-GATEA-1 FIXED.** A group of one or two pages learned its shell from itself, so an identical pair
> scored 0 overlap and a single page 0 unique words. A group now needs 3 pages to learn its own shell and a
> smaller one borrows it from the rest of its site. On the real 389, **47 pages moved**: 10 pair pages became
> measured (6 above 0.40), 31 single pages got a real unique-word count, 6 sub-site homes are UNMEASURABLE.
>
> ⏸️ **The four OET facts are PARKED, not verified** (P-OET-1): item 15 is already VERIFIED-PASS and they move
> no row. Disclosed: a bounded fetch of those pages ran under an earlier brief before the parking instruction
> arrived — 7 requests, status and fingerprint only, nothing verified, nothing committed but its cost line.

> ### 🔴 THE FOUR IN THE QUEUE RUN — 13, 25, 26, 55 — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 6 | 6 |
> | TESTABLE-NOW | 4 (13, 25, 26, 55) | **1** (25) |
> | VERIFIED-PASS | 10 | **13** (+13, 26, 55) |
> | FAILED | 2 (50, 51) | 2 (50, 51) |
> | BLOCKED-UNKNOWN | 5 | 5 |
> | DEFERRED | 28 | 28 |
>
> **Ruling 0A, beta-g: FAILED means the boundary's FAILURE condition was met, and nothing else.** A row
> that was run and fell short stays TESTABLE-NOW, and (ruling 0B) now records its attemptCount, the date
> of its last attempt and the specific gap — so the queue tells "never tried" from "tried, and here is
> exactly what is missing".
>
> **FAILED — counted and named separately: 2 — item 50 and item 51, unchanged.** Item 55 passed THROUGH
> FAILED in this change: the executing leak test's first run met its FAILURE condition on a real leak
> (a key file that is not JSON was quoted by the parse error, and printed whole to stderr by the CLI);
> the leak was fixed and the test re-run and passed. FAILED is not progress; the repair is.
>
> **Three rows reached VERIFIED-PASS in this change: 13, 26 and 55. None lost one.**
>
> - **moved because WORK HAPPENED:** 13 TESTABLE-NOW → VERIFIED-PASS (every overlap reported with its
>   query, URLs and positions, beside 337 queries searched); 26 TESTABLE-NOW → VERIFIED-PASS (the 340/341
>   disagreement raised as 11 Issues, both instruments found wrong, one definition, one stored graph,
>   both runners print 335, the Issues closed); 55 TESTABLE-NOW → FAILED → VERIFIED-PASS (a planted fake
>   secret, a real leak found and fixed, recovery proved by hash). 25 was attempted and stays TESTABLE-NOW.
> - **moved ONLY because a RULING changed:** none. Rulings 0A and 0B moved no row.
>
> 🔴 **Item 25 does not tick.** All four parts were measured: unique value and sibling overlap on every
> existing page; verified-fact presence on every page — and it found **0 verified facts on all 389**; source
> integrity by the owner-authorised live link check — **15 of 15 sources LIVE**, 0 GONE, 0 disagreements with
> beta-g's 12 September reading, 18 of a hard cap of 40 requests, external hosts only. With no existing page
> carrying a fact, no page has a source to report.

> ### 🔴 THE QUEUE RE-SCANNED — AND EVERY ROW THAT COULD BE RUN, RUN — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 14 | **6** |
> | TESTABLE-NOW | 0 | **4** (13, 25, 26, 55) |
> | VERIFIED-PASS | 8 | **10** (8, 11, 12, 14, 15, 38, 42, 45, 48, 49) |
> | FAILED | 0 | **2** (50, 51) |
> | BLOCKED-UNKNOWN | 5 | 5 |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 2 — item 50, OBSERVED / INFERRED / RECOMMENDED / UNKNOWN
> Separation, and item 51, Explainability.** Both were run against their own boundaries and both
> FAILURE conditions are met on real data: item 50's UNKNOWN→PASS guard polices an empty population
> (0 of 46 real facts carry a supersession); item 51's three real recommendations carry no priority,
> no confidence and no cost, and the real report renders none of them. FAILED is not progress, and it
> is worth more than BUILT-NOT-PROVED: it means we looked.
>
> **Two rows reached VERIFIED-PASS in this change: item 12 and item 38. None lost one.**
>
> - **moved because WORK HAPPENED:** eight rows BUILT-NOT-PROVED → TESTABLE-NOW, because their input
>   now exists (12, 13, 25, 26, 38, 50, 51, 55); then, run: 12 and 38 → VERIFIED-PASS, 50 and 51 →
>   FAILED. 13 and 26 were run and stay TESTABLE-NOW: each missed EXPECTED without meeting its FAILURE
>   clause, and Amendment 2 allows FAILED only when the FAILURE condition is met. 25 and 55 were not run.
> - **moved ONLY because a RULING changed:** none. The evidence-retention ruling moved no row; it keeps
>   the evidence behind three of them reproducible.
>
> 🔴 **The re-scan did not move a row because it felt closer.** 16 stays: its second value lives on a
> page we do not hold, not in a record (D-FACT-1), and no fact is stale before 2026-12-11. 17 stays:
> 0 derived facts. 1 and 54 stay: **no learning record exists** — and no cost entry names a product,
> so the cost half is not product-private either. 10 stays: the Case Study is unrun and redirect
> chains are not captured (D-KEY-2). 36 stays: there is no paid path to attempt. 46 and 53 have no
> researcher and no unseen product. 9, 52 and 56 stay for the reasons on their rows.

> ### 🔴 ITEMS 11, 42 AND 48 PROVED BY A LOCAL REPLAY — NOT BY A SECOND LIVE CRAWL — 13 SEPTEMBER 2026
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 14 | 14 |
> | TESTABLE-NOW | 0 | 0 |
> | VERIFIED-PASS | 5 (8, 14, 15, 45, 49) | **8 (8, 11, 14, 15, 42, 45, 48, 49)** |
> | FAILED | 1 (48) | **0** |
> | BLOCKED-UNKNOWN | 7 | **5** |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 0.** Item 48 left it by the route rule 1 names first: the
> two jobs its reopen named — the crawl and the DNS audit — were run twice into one store, and nothing
> duplicated. Its reopen stays on the row. A FAILED count of zero is not progress in itself; the repair is.
>
> **D-CRW-5 — the green for a second live crawl — is GRANTED AND UNUSED, and moved nothing.** Items 11,
> 42 and 48 test engine properties; a live second run would have muddied 11, might have left 42
> unprovable, and cost money. They were proved instead by replaying the 12 September run's own 394
> captured bodies from 127.0.0.1, verified 394/394 against their hashes, with **0 requests leaving
> this machine**. 🔴 **The replay does NOT prove the crawler reaches the live internet today**, and the
> DNS double run used **RECORDED** resolver answers, not live ones.
>
> - **moved because WORK HAPPENED:** item 11, BLOCKED-UNKNOWN → VERIFIED-PASS (394/394 page_ids
>   identical across two runs, 389 pages before and after, 5 changes as new observations on existing
>   pages) · item 42, BLOCKED-UNKNOWN → VERIFIED-PASS (5 changed targets re-tested on their latest
>   observation: FAIL→PASS, PASS→FAIL ×3, PASS→PASS for a body-only change) · item 48, FAILED →
>   VERIFIED-PASS (389 unchanged → 0 new records; 5 changed → 5 new observations; DNS audit 134 → +0).
> - **moved ONLY because a RULING changed:** none. The withdrawal of the second crawl is not a ruling
>   on any boundary.

> ### 🔴 A TICK REMOVED — ITEM 48 — AND A TICK EARNED UNDER A SCOPE RULING — ITEM 45
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 14 | 14 |
> | TESTABLE-NOW | 0 | 0 |
> | VERIFIED-PASS | 5 (8, 14, 15, 48, 49) | **5 (8, 14, 15, 45, 49)** |
> | FAILED | 1 (45) | **1 (48)** |
> | BLOCKED-UNKNOWN | 7 | 7 |
> | DEFERRED | 28 | 28 |
>
> **The counts did not change. Two rows swapped places, and the ledger is more true for it.**
>
> **FAILED — counted and named separately: 1 — item 48, Idempotency & Retry Safety.** Reopened by the
> checklist's reopen rule for concrete contradictory evidence: its tick was earned on the ingest
> path, the audit writers were never in its tested population, and one of them stored 868 issues
> twice. **A tick removed is a real and healthy outcome.**
>
> **One row reached VERIFIED-PASS in this change: item 45. One row lost it: item 48.**
>
> - **moved because WORK HAPPENED:** item 45, TESTABLE-NOW → VERIFIED-PASS (one real run, all four
>   costs recorded) · item 48, VERIFIED-PASS → FAILED (reopened on real duplicates).
> - **moved ONLY because a RULING changed:** item 45, FAILED → TESTABLE-NOW (its scope is runs from
>   the ledger's existence onward). The eight earlier runs are a permanent loss, L-COST-1.

> ### 🔴 ITEMS 45 AND 49 RUN AGAINST THEIR BOUNDARIES — 12 SEPTEMBER 2026, NIGHT
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 16 | **14** |
> | TESTABLE-NOW | 0 | 0 |
> | VERIFIED-PASS | 4 | **5** |
> | FAILED | 0 | **1** |
> | BLOCKED-UNKNOWN | 7 | 7 |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 1 — item 45, Cost Governor.** The ledger exists and the
> hard stop holds, but 12 parts of the eight stored ingest runs read UNKNOWN although they were
> measurable at the time. FAILED is not progress, and it is worth more than BUILT-NOT-PROVED: it
> means we looked.
>
> **One row reached VERIFIED-PASS in this change: item 49.**
>
> - **moved because WORK HAPPENED:** item 45, BUILT-NOT-PROVED → FAILED · item 49,
>   BUILT-NOT-PROVED → VERIFIED-PASS.
> - **moved ONLY because a RULING changed:** none. (The crawler-flag ruling changed how the register
>   names a gate, not any row's boundary.)

> ### 🔴 ITEM 14 LEAVES FAILED — BY RULE 1's FIRST ROUTE. 12 SEPTEMBER 2026, NIGHT.
>
> | state | before this change | after |
> |---|---|---|
> | NOT-STARTED | 3 | 3 |
> | BUILT-NOT-PROVED | 16 | 16 |
> | TESTABLE-NOW | 0 | 0 |
> | VERIFIED-PASS | 3 | **4** |
> | FAILED | 1 | **0** |
> | BLOCKED-UNKNOWN | 7 | 7 |
> | DEFERRED | 28 | 28 |
>
> **FAILED — counted and named separately: 0.** Item 14 left it by the route rule 1 names first:
> the cause was fixed and the test was re-run and passed. It did not leave by a ruling, and it did
> not return to BUILT-NOT-PROVED. A FAILED count of zero is not progress in itself; the repair is.
>
> - **moved because WORK HAPPENED:** item 14, FAILED → VERIFIED-PASS. `bin/report.mjs` and the
>   chain runner's sibling cache now write only with `--confirm`; every one of the seven writers
>   confines its destination to this repository and refuses a path outside it; all five parts of
>   Amendment 2's contract re-tested and each RED-proved.
> - **moved ONLY because a RULING changed:** none.

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
> - **moved because WORK HAPPENED (follow-up, same night):** item 9, BUILT-NOT-PROVED →
>   BLOCKED-UNKNOWN. The country pulls ran against the real property; six of seven dimensions are
>   ingested and the seventh is supplied by no tool we hold. Not a tick. After it the counts are
>   BUILT-NOT-PROVED **16** and BLOCKED-UNKNOWN **7**; the table above records Amendment 2 alone.

> ### 🔴 TWENTY-TWO TICKS — ITEMS 3, 8, 11, 12, 13, 14, 15, 26, 36, 38, 42, 45, 47, 48, 49, 51, 53, 55, 56, 59, 60 AND 61
>
> **Items 3 (its owned half), 8, 11, 12, 13, 14, 15, 26, 36, 38, 42, 45, 48, 49, 51, 55, 59, 60 and 61.** Each has all four parts of its boundary
> answered with real-data evidence. They are the only twenty-two rows in the whole ledger that **hold a pass earned by work**;
> item 9 moved by work and ended BLOCKED-UNKNOWN; item 50 was run and stays FAILED; item 25 was run and is
> TESTABLE-NOW with its gap named; **items 48, 51 and 55 each passed through FAILED** and left it only by the
> test re-run and passing; items 11 and 42 were proved on a local replay of real bodies, which does not prove
> live reachability; the other 31 moved when the vocabulary changed and are counted apart.
>
> **Item 14 did NOT tick the first time it was sat against Amendment 2**, and that result is kept
> on the row: two write sites defaulted to writing, and it was FAILED. It ticked only after both
> writers were fixed and the whole test was run again.
>
> **DEFERRED IS NOT A TICK AND NEVER COUNTS AS ONE.** A v0.1 feature cannot FAIL for lacking
> something frozen v0.1 deliberately excludes — and cannot be given a final-product PASS either.
> The 23 DEFERRED rows are not progress and nothing was built for any of them.

**Of the 23 DEFERRED items, all 23 are class `D` in the owner's ruling as amended** — deliberately excluded.
A row is DEFERRED **only** where the frozen document, as amended, says so; the build fails on any other
deferral. Nine items are NOT-STARTED and in scope: **3, 4, 5, 6, 7** (opened by Amendment 4 on 13 September
2026; nothing built), **57, 58**, and **59, 60** (admitted by Amendment 3 on 14 September 2026; nothing built). *(Seven
until 14 September 2026.)* *(This sentence read "47, 57, 58" until 13 September — stale since item 47
passed the same day. Corrected here, and recorded as one more summary that did not follow its own body.)*

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
| 1 | Product Intake & Isolation | BLOCKED-UNKNOWN | IN — §62 l.553 provider-neutral foundation; DoD `DOD-02` | `test/product-registration.test.mjs`, `test/product-isolation.test.mjs` (16 tests, two real registered tenants, adversarial accessors, non-empty guard). `src/product.mjs` | 2026-09-13 | Claude (queue re-scan) | **Re-scanned 13 Sep: still blocked.** A cost ledger now exists, but **no cost entry names a product**, so no product holds private costs; and **no learning record exists** (`U-ISO-1`). Half an input is not an input | re-scan, 13 Sep 2026 |
| 2 | Human Question Discovery | DEFERRED | OUT — §62 l.553; phase table "Search Intelligence". **Kept class D by `PASS_BOUNDARIES_AMENDMENT_4.md` (13 Sep 2026): its input is legitimate public question evidence and no fetch is authorised** | none | 2026-09-13 | CC (Amendment 4 class change) | its input — public question evidence — needs an external fetch the owner has not authorised; it enters scope on a bounded external-evidence GREEN, and not before | — |
| 3 | Keyword & Search-Language Discovery | VERIFIED-PASS | PARTIAL — `PASS_BOUNDARIES_AMENDMENT_4.md` (owner ruling 13 Sep 2026), class D → S: the **owned** half (owned search data) IN; the **public** half (public search evidence) OUT, deferred and named. Was OUT — §62 l.553 | `node bin/search-language.mjs --check` · `test/search-language.test.mjs` · `runs/discovery/search-language-2026-09-15.json` (329 records, each with its source observation_id + ingest date) · `runs/audit/row3-census-2026-09-15.txt` · `runs/audit/row3-red-limbs-2026-09-15.txt` (4 limbs, each RED alone, restored by sha256) | 2026-09-15 | CC (work, TEST_RUN) | THE OWNED HALF ONLY: 207 LONG_TAIL · 26 SYNONYM · 17 ABBREVIATION · 53 LOCAL · 106 UNCLASSIFIED; held-out 61/61 traceable; keyword→URL census 0 breaches (limits stated); discovery never reads the intent lexicon. The PUBLIC half stays DEFERRED | — |
| 4 | Localized Human Thinking | BUILT-NOT-PROVED | IN — `PASS_BOUNDARIES_AMENDMENT_4.md` (owner ruling 13 Sep 2026), class D → P: its input, the same goal from two or more countries, is present (388 country×query rows across **49** countries — 48 once the 9 operator rows are out; the amendment's "126" is the row count of the separate country pull). Was OUT — v0.1 EXCLUDES l.974 "corridor engine (§6, §15)" | `node bin/localized-thinking.mjs --check` · `test/localized-thinking.test.mjs` · `runs/discovery/localized-thinking-2026-09-15.json` (37 goals from 2+ countries, every wording with its country row, observation id and ingest date) · `runs/audit/row4-census-2026-09-15.txt` · `runs/audit/row4-red-limbs-2026-09-15.txt` | 2026-09-15 | CC (work, BUILT) | built on row 3's relations, not row 5's clusters: 12 goals worded differently, 25 the same wording; 38 of 48 countries UNKNOWN below a floor of 5 rows; no consumer builds an address from a country. 🔴 FAILURE (b) — materially different useful content — BLOCKED, NOT TESTED: needs per-value answer evidence (owner's pending decision). The census cannot see the estate's own pages: origin is hard-coded into 775 of 1,525 | — |
| 5 | Intent & Question Clustering | FAILED | IN — `PASS_BOUNDARIES_AMENDMENT_4.md` (owner ruling 13 Sep 2026), class D → P: its input, differently worded questions, is present (337 owned queries). Was OUT — §62 l.553 | `bin/intent-clusters.mjs` over the real query pull `45ce21253a3fc58c`: 337 rows = 329 human + 8 operator strings classified and kept (4 site-inspection · 3 exclusion-list monitor · 1 exact-phrase lookup); in-sample 268 → 73 clusters, 0 merged · 0 split against a reference written first (`config/discovery/intent-reference.mjs`, first-written copy in runs/audit); wording kept byte for byte; `test/intent-clustering.test.mjs`; six limbs RED alone in the real files (runs/audit/row5-red-limbs-2026-09-14.txt). 🔴 **ACCEPTANCE CORRECTED 17 SEPTEMBER 2026 (`D-HELDOUT-1`) — the row's meaning has changed, its state has not.** Acceptance is now the SAME `compareToReference`, applied to the WHOLE record (in-sample clusters **plus** held-out placements) instead of the training half alone: limbs `record-merged` / `record-split`. On the real store it reports **0 distinct-intent merges · 8 identical-intent splits**, so `node bin/intent-clusters.mjs --check` exits **1**. The eight are `score-equivalence` · `cv-for-occupation` · `cv-no-experience` · `daily-habits` · `ielts-free-practice` · `pte-destination-requirement` · `pte-for-occupation` · `bilingual-licenciatura` — the last of these has **both** members held out, so the rejected `has in-sample members` qualifier could not have seen it. **RULE-EXCLUDED:** 6 R6-AMBIGUOUS members (`ielts pte` · `pte and ielts` · `pte ielts exam` · `pte 6.5` · `pte full form in ielts` · `i don t have a cv`) are **UNEVALUATED-BY-RULE** — neither passed nor failed by any limb, and printed by name. No tolerance, no skip, no acceptance weakening; the suite stays green by asserting the failure, not by hiding it | 2026-09-14 | CC (row 5 — test run; FAILED on the owner's answer) | 🔴 FAILURE MET. **ACCEPTANCE (full reference, 17 Sep 2026): 0 distinct-intent merges · 8 identical-intent splits.** 🔴 **The old headline "49 HIT / 12 MISS" is NOT a clean hit count** — measured, the scorer's own decomposition of the 61 held out is **44 evaluated HIT · 12 evaluated MISS · 5 no-comparison-target**. Those 5 are scored HIT only because no in-sample query carries their intent, so they were never substantively evaluated; three are singleton intents with nothing to split from, and two are the `bilingual-licenciatura` pair, which the reference calls ONE intent (R5, doubt null) and the clusterer left SPLIT. That HIT/UNEVALUATED collapse in the scorer is a **known, separately-tracked defect (H3), OPEN and NOT corrected here**; this change corrected ACCEPTANCE only. 44 + 12 + 5 = 61 is the held-out base; the 6 R6-AMBIGUOUS members are in-sample and are **not** a fourth term of that sum — a different base, measured disjoint. Limits: the reference is a model's judgement, not owner-verified; a cluster is not proved to be a real person's intent (row 2, DEFERRED). Leaves FAILED by the held-out check re-run and passing, or an owner ruling | — |
| 6 | Axis Discovery | BUILT-NOT-PROVED | IN — `PASS_BOUNDARIES_AMENDMENT_4.md` (owner ruling 13 Sep 2026), class D → P: its input, the subject's real evidence, is present (queries, countries, pages in the evidence store). Was OUT — discovery is "Search Intelligence"; §62 l.553 | `bin/axis-discovery.mjs` over row 5's intent record, the country×query pull `9bf50cfb134a0d7d` (379 human rows, 48 countries), the page rows (1,525) and 394 archived bodies: the six named axes (read from the contract) and 7 discovered slot types, each with seven legs and a basis — 7 MONITOR · 7 UNKNOWN · 0 BUILD · 0 REJECT; `test/axis-discovery.test.mjs` with BUILD/REJECT controls; six sabotages over five limbs RED alone in the real files (runs/audit/row6-red-limbs-2026-09-14.txt). Axis **declaration** (`test/product-registration.test.mjs`) is still not discovery | 2026-09-14 | CC (row 6 — built and run; BUILT-NOT-PROVED on the owner's answer) | 🔴 answer-level distinguishing power, evidence availability and human-value delta are UNKNOWN on every axis — the answer at each value is not owned (row 7 SUPPLY and row 2 deferred), so the accepted and rejected populations the EVIDENCE clause names are EMPTY. Moves on per-value answer evidence the owner authorises, and the row re-run | — |
| 7 | Market Measurement | VERIFIED-PASS | PARTIAL — `PASS_BOUNDARIES_AMENDMENT_4.md` (owner ruling 13 Sep 2026), class D → S: **DEMAND** and **VISIBILITY/REACH** (owned) IN; **SUPPLY**, **AUDIENCE/NEED** and **WORTHINESS** OUT, deferred and named (WORTHINESS by the owner's addendum, 13 Sep 2026). Was OUT — §62 l.553 | `node bin/market-measurement.mjs --check` · `test/market-measurement.test.mjs` · `runs/discovery/market-measurement-2026-09-15.json` (two measurements, each quoting its range and dataState) · `runs/audit/row7-census-2026-09-15.txt` · `runs/audit/row7-red-limbs-2026-09-15.txt` | 2026-09-15 | CC (work, BUILT) | VISIBILITY/REACH measured (impressions, position, clicks, CTR); DEMAND bounded by a distinct method on the query field alone — at least 329 wordings searched, magnitude UNKNOWN; SUPPLY, AUDIENCE/NEED and WORTHINESS UNKNOWN. 🔴 Only 541 of 2,374 impressions (22.8%) and 0 of 20 clicks carry a query; the 807-vs-541 discrepancy is localised, not closed. Leaves BUILT-NOT-PROVED by an owner ruling on a presence-bound DEMAND, or an authorised demand-magnitude source | — |
| 8 | HEAVY / THIN / EMPTY Discipline | VERIFIED-PASS | OUT — component of item 7 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 9 | Search Console / Analytics Intelligence | BLOCKED-UNKNOWN | IN — §62 l.553 "Search Console ingestion when authorized"; v0.1 CONTAINS l.974 (§9) | **BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE** (owner ruling, 13 Sep 2026, §3) — its missing evidence, blocker and future unlock condition are on the row; this is not the machinery declaring failure. **6 of 7 dimensions INGESTED from the real property**, window 2026-08-15..2026-09-12, every pull exhausted, `dataState=COMPLETE` [bound: rowLimitPerRequest=25000, maxRequests=20]: **country 126 rows, country×query 388 rows** (1 request each), queries 337, query×page 574, pages 1,525, plus impressions, clicks and CTR. Cost ZERO_BY_TARIFF. Country rows stored as measurement only and pass item 8's guard. `node bin/gsc-dimensions.mjs --countries` | 2026-09-12 | Claude (repo audit) | 🔴 **Downstream outcomes is supplied by no tool we hold** — Search Console has no outcome dimension; the credential is webmasters.readonly; 0 of 36 product repositories use an analytics package; the one first-party funnel-event table stores a path and a user id and no search source; the engine may read no product database. The NOTE makes that ⚠, so **BLOCKED-UNKNOWN, not FAILED** — and **six of seven does not tick** | real country run, 12 Sep 2026 night |
| 10 | Technical SEO Audit Engine | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 "Crawler and page inventory (§8)" | Seven of nine sub-requirements run over the 394 pages. **Part 0 adds the ORIGIN of the noindex finding**: all 134 come from one conditional gate in `almi-cv-v2`, traced to commit `50f8c20` (17 Aug 2026), and the commit's own "near-duplicates by construction" premise was measured — same-role siblings average 0.685 similarity, **none reaches 0.8** | 2026-09-12 | Claude (repo audit) | 🔴 **CANNOT REACH VERIFIED PASS IN v0.1 — a scope fact.** Rendering and crawl depth are structurally impossible: every record is `RAW_HTML`, and we seeded from Search Console and never followed links | hissa 3, 12 Sep 2026 |
| 11 | Existing Page Inventory | VERIFIED-PASS | IN — v0.1 CONTAINS l.974 (§8) | 495 real PageRecords from the 12 Sep run, 500→495 reconciled on the page. **"Maintain" proved 13 Sep by a LOCAL REPLAY** of the run's own 394 bodies, crawled twice with 5 named changes: **394/394 page_ids identical, 389 pages before and across both runs, each change a new observation on its existing page**; RED when the id takes the clock. `runs/replay/replay-2026-09-13.json` | 2026-09-13 | Claude (replay) | 🔴 Does NOT prove live reachability today. Committed PageRecords still carry empty edge lists (item 26) | replay, 13 Sep 2026 |
| 12 | Duplicate / Thin / Template Detection | VERIFIED-PASS | IN — required by Case Study #1 (§60) which v0.1 CONTAINS l.974 | **Re-scanned and run 13 Sep over the COMMITTED bodies**: each of the four classifications accounts for all 394 pages — exact-duplicate 0 · thin 118 · near-duplicate 5 · template-dominance 2, plus 6 UNKNOWN. Shell subtraction **defined, printed beside the result, and tested against a page whose shell is larger than its body**; the item-8 guard passes. `runs/audit/item-12-38-content-run-2026-09-13.txt` | 2026-09-13 | Claude (queue re-scan) | **Detection only — nothing BLOCKS duplicate or thin inventory** (the deferred half: no publish path). A clean page is the absence of a finding, counted, not a stored record | re-scan, 13 Sep 2026 |
| 13 | Cannibalization Prevention | VERIFIED-PASS | PARTIAL — detection rides on the GSC ingest (v0.1 CONTAINS l.974); prevention needs a URL proposer, which v0.1 excludes | **Run 13 Sep over the newest complete query×page pull** (c97334fdd102df8e, 574 rows): **21 of 337 queries searched** draw impressions on more than one URL, and **each is reported with its query, every competing URL and its position**, beside the number searched; 0 are two spellings of one page. Firing fixture and silent control for both the detector and the report. `runs/audit/item-13-26-content-run-2026-09-13.txt` | 2026-09-13 | Claude (queue run) | **Measurement only** — alphabetical, no ranking, no recommendation; item 8's guard holds over the report. The prevention half has nothing to act on in v0.1 | queue run, 13 Sep 2026 |
| 14 | No Blind Regeneration | VERIFIED-PASS | IN — the inventory is v0.1 CONTAINS l.974 (§8) | **Re-run against Amendment 2 after the fix, and PASSED.** (a) 0 product-repository writes · (b) 0 publish paths · (c) 0 bulk generation · (d) 8 write sites in 7 files, all named in `config/permitted-page-writers.mjs` and reconciling exactly; **all 8 dry-run by default**; **all 7 confine their destination** and a real writer pointed outside the repository with `--confirm` refuses and creates nothing; every reason stated · (e) rediscovered URLs fold to their EXISTING `page_id` on the real 495-page run. Each part RED-proved | 2026-09-12 | Claude (repo audit) | Was FAILED earlier the same night — `bin/report.mjs` had no gate and `bin/nursing-chain.mjs` wrote its cache with no flag; both fixed, and it left FAILED by re-run. ⚠️ Recorded, not hidden: the crawler's body write is gated by `--live` plus the owner's-green flag rather than `--confirm`. `nursing-chain.mjs` is half superseded — see `NURSING_CHAIN_SUPERSESSION.md`; removal is the owner's call | Item 14 re-run, 12 Sep 2026 night |
| 15 | Verified Fact Supply Engine | VERIFIED-PASS | IN — v0.1 CONTAINS l.974 "Source-of-truth and provenance layer (§14)" | 🔴 **THE FACTS ARE NOW CHECKED. ALL 46, BY A NAMED PERSON, ON A NAMED DATE.** beta-g read an official source for every record and returned a verdict: **32 VERIFIED, 14 UNKNOWN** (6 contested by a second official page, 4 true-but-incomplete, 4 source unreachable). Ingested as 456 added lines with **0 deletions — the proof that no value was amended**. A third state `UNKNOWN` was added because two could not tell "checked and contradicted" from "never opened". All 32 verified rows carry a recheck date that **governs freshness** (proved on a day the old and new rules disagree) | 2026-09-12 | Claude (repo audit) | 🔴 **STILL ◐, AND NOT BECAUSE 32 ROWS CHANGED COLOUR.** §3 Q4 asks for *integrated behaviour against real evidence*, and the integration is the part that does not exist: **the engine verified nothing — it ingested a spreadsheet a human filled in by hand.** There is no re-verification loop, so when the first recheck falls due **2026-12-11 nothing runs**. And ingesting real data exposed four defects the fixtures could not (`D-FACT-1..4`), two still open. A supply *engine* must produce supply; this one received a delivery | item 15 ingest, 12 Sep 2026 |
| 16 | Fact Conflict & Freshness | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 (§14) | Freshness now runs on **real ingested dates**: 32 records governed by a human-set recheck date, windows of 90 days (fees and document lists) and 180 days (requirements), earliest due **2026-12-11**. The 14 UNKNOWN records deliberately carry **no** recheck date — an expiry implies good-until-then. Conflict detection still never auto-resolves and retains both values | 2026-09-12 | Claude (repo audit) | 🔴 **THE PREVIOUS NOTE SAID "ZERO CONFLICTS EXIST". THAT IS NOW FALSE, AND WORSE THAN IT SOUNDS.** Six real conflicts exist and **`detectConflicts` returns 0 on all six** (`D-FACT-1`): it only sees two records of OURS disagreeing, and every real conflict is registry-vs-a-second-official-page we do not hold. The detector is not broken, it is **blind to the only shape we actually have** — pinned by a test with a firing control, deliberately not worked around. Freshness is real; conflict is fixture-only *and now known to be unreachable* | item 15 ingest, 12 Sep 2026 |
| 17 | Derived Fact Provenance | BUILT-NOT-PROVED | IN — v0.1 CONTAINS l.974 (§14) | A re-executable formula and every input's fact_id and value; recompute reports a mismatch as a **finding, never a repair**; the constructor refuses a fact more verified than its weakest input — since 12 Sep. **14 Sep 2026, the three real gaps:** kind `derived` in the registry (F28, F29), a changed input raises INPUT_CHANGED with no caller naming it, the derivation byte-stable — each RED alone and restored (runs/audit/row17-gaps-*) | 2026-09-14 | CC (row 17 gaps) | 🔴 **NOT ONE DERIVED FACT EXISTS IN THE REGISTRY, AND NONE WAS ADDED.** 0 of 46 records are derived, so 0 were recomputed; the capability is not what blocks it. ⚠️ `pk-pnmc.mjs` calls the foreign/domestic fee comparison *the fact a reader actually needs* — whether to hold it as a derived fact is the owner's call, and from two UNKNOWN inputs it could only be UNKNOWN. With 0 derived facts the dependency walk and the change detector still have an **empty population**, and their zero is not a clean bill of health (`D-FACT-4`) | item 15 ingest, 12 Sep 2026 · row 17 gaps, 14 Sep 2026 |
| 18 | Competitor Intelligence | DEFERRED | OUT — §16 is "Search Intelligence"/later; §62 l.553 | `DISTINGUISHING_SUPPLY.md` measured one competitor once (0.08–0.13). Not an engine | 2026-09-11 | Claude (repo audit) | — | — |
| 19 | Content / Information-Gap Intelligence | DEFERRED | OUT — §12, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 20 | Action Decision Engine | DEFERRED | OUT — §17/§18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 21 | URL Right-to-Exist Test | DEFERRED | OUT — gates page generation, excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 22 | Best Answer Architecture | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 23 | Answer-First Content | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | none | 2026-09-11 | Claude (repo audit) | — | — |
| 24 | Original Information Gain | DEFERRED | OUT — v0.1 EXCLUDES l.974 page generation | Gate A's sibling-overlap measure is a partial instrument for uniqueness, but it does not measure value beyond competitors | 2026-09-11 | Claude (repo audit) | — | — |
| 25 | Page Quality Gate | TESTABLE-NOW | PARTIAL — Gate A exists as the audit slice's quality instrument; the *publishing* gate is OUT (l.974) | **Attempted once, 13 Sep.** (1) unique value on 389/389 existing pages; (2) sibling overlap MEASURED on 327, with 52 VACUOUS and 10 UNMEASURABLE named (D-GATEA-1); (3) verified-fact presence on 389/389 — **0 carry a verified fact**; (4) source integrity by the owner-authorised live link check — **15/15 sources LIVE**, 0 GONE, 0 disagreements with the 12 Sep baseline, 18/40 requests | 2026-09-13 | Claude (queue run) | **Gap:** with no existing page carrying a verified fact, source integrity is reported for no page. Next: existing pages that state registry facts, which needs a bounded capture and the owner's green | queue run, 13 Sep 2026 |
| 26 | Internal-Link Intelligence | VERIFIED-PASS | PARTIAL — link capture rides on the crawler (IN, l.974); opportunity-finding is later | **The 340/341 disagreement raised as 11 Issues, both instruments found wrong** (one counted observations, one ignored other hosts), **one definition** (`src/crawl/inbound.mjs`), **one stored graph** (`runs/crawl/edges-2026-09-12.jsonl.br`), **both runners print 335**, the Issues closed on that evidence. 335 pages with no inbound link, all UNKNOWN, 0 'missing' | 2026-09-13 | Claude (queue run) | Raw HTML only: a JavaScript-injected link is invisible and reads UNKNOWN. No opportunity-finding exists (the later half) | queue run, 13 Sep 2026 |
| 27 | Entity Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 28 | International / Local SEO | DEFERRED | OUT — v0.1 EXCLUDES l.974 corridor engine (§6, §15) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 29 | SERP Hook / CTR Intelligence | DEFERRED | OUT — phase table "Search Intelligence" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 30 | GEO / AEO / AIO / AI Visibility | DEFERRED | OUT — phase table "GEO/AEO/AIO"; v0.1 EXCLUDES AI Visibility Lab l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 31 | AI Source Influence Graph | DEFERRED | OUT — v0.1 EXCLUDES l.974 "AI Visibility Lab (§11)" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 32 | Earned Authority / Off-Page Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 33 | Content Decay & Pruning | DEFERRED | OUT — acts on published inventory; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 34 | Content Brief Engine | DEFERRED | OUT — phase table "Controlled pSEO" | none | 2026-09-11 | Claude (repo audit) | — | — |
| 35 | Safe CC Command Generation | DEFERRED | OUT — §18, later phase | none | 2026-09-11 | Claude (repo audit) | — | — |
| 36 | Owner Authorization Gates | VERIFIED-PASS | IN — §32 cost/mass-page gate; safety applies to every phase | **VERIFIED-PASS 15 Sep 2026 on main (ce43c4b, CI run 34927704324):** the last named guard now runs — `bin/archive-corpus.mjs --confirm --out=<an existing archive>` → exit 2, that archive's sha256 unchanged, past the full 394-body verification (gap 3, #90; RED-proved inside a filesystem fence, runs/audit/gap3-archive-corpus-red-2026-09-15.txt). Every category the frozen boundary names runs its guard; production at the permission function because NO PRODUCTION WRITE PATH EXISTS. ── EARLIER, KEPT: **Re-measured 15 Sep 2026 on main (11ba98d), per category.** **paid** `test/paid-provider-controls.test.mjs` (the real gate refuses before the provider is called; every refusal ledgered) · **large-scale** `test/cost-governor.test.mjs` (cap throws before the call, stop latches, injected runaway hard-stopped) · **cross-product** `test/product-isolation.test.mjs` (accessors refuse the other tenant) + `test/write-confinement.test.mjs` (real `bin/report.mjs --confirm` aimed outside the repo refuses, creates nothing) · **production** `test/gate-a.test.mjs` (the write law's permission function only) · **destructive** NEW `test/owner-authorization-gates.test.mjs`: `bin/replay-crawl.mjs --recover` without `--confirm` → exit 2, REFUSED, scratch corpus intact byte for byte; RED-proved by inverting the guard (runs/audit/row36-destructive-red-2026-09-15.txt) · **network · D-CRW-4** NEW: `bin/crawl.mjs --live` without `--i-have-the-owners-green`, loopback-only seeds, scratch `--out`/`--corpus` → exit EXACTLY 3, REFUSED, nothing written, runs/crawl and the cost ledger unchanged; RED-proved under a network-and-runs/ containment preload (runs/audit/row36-dcrw4-red-2026-09-15.txt) | 2026-09-15 | CC (row 36 — gap 3, work) | ✅ **Ticked 15 Sep 2026 on its executed guards, judged against the frozen boundary after main's CI.** Production residue kept: proved at the permission function because no production write path exists. ── EARLIER VERDICT, KEPT: 🔴 **Still not ticked — ONE named guard does not run.** `bin/archive-corpus.mjs`'s overwrite refusal is NOT SAFELY TESTABLE: its destination is hard-coded to the committed body archive and the refusal sits behind `--confirm`; it needs an operator `--out=` first, in its own PR. And **production** runs only as a permission function, because no production write path exists. ⚠️ Found while proving D-CRW-4: a loopback seeds file does NOT bound an inverted gate — it reaches a third-party IPv6 probe and estate DNS before reading seeds, and a live run writes the cost ledger under runs/ | — |
| 37 | Controlled Publishing | DEFERRED | OUT — v0.1 EXCLUDES l.974 "Page generation, in every form" | none — and l.610 says the absent feature *is* the gate | 2026-09-11 | Claude (repo audit) | — | — |
| 38 | Indexability Preflight | VERIFIED-PASS | IN — §62 l.553; the preflight assesses pages that already exist | **Re-scanned and run 13 Sep over the COMMITTED bodies** in ASSESS MODE: a state for every page — **158 BLOCKED, 210 UNKNOWN, 26 ELIGIBLE** (total 394). **`INDEXABLE ≠ INDEXED` printed at the head of the run and in every preflight finding**, and a test fails the build on any wording that promises indexing, ranking or citation. `runs/audit/item-12-38-technical-run-2026-09-13.txt` | 2026-09-13 | Claude (queue re-scan) | **It assesses; it does not gate** (the deferred half: nothing is published). An ELIGIBLE page is the absence of a finding, counted, not a stored record | re-scan, 13 Sep 2026 |
| 39 | Real Indexation Learning | DEFERRED | OUT — post-publication; publishing excluded l.974 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 40 | Controlled Scaling | DEFERRED | OUT — phase table; expansion is a later gate | none | 2026-09-11 | Claude (repo audit) | — | — |
| 41 | Failed-Cohort Backpressure | DEFERRED | OUT — requires cohorts, which require publishing (excluded l.974) | none | 2026-09-11 | Claude (repo audit) | — | — |
| 42 | Re-crawl / Re-test Loop | VERIFIED-PASS | PARTIAL — the crawler is IN (l.974); the loop is not named in the v0.1 list | `src/audit/retest.mjs` re-tests a changed target on its **latest stored observation, chosen from the store**, with a verdict before and after naming the observation read. **5 LOCAL REPLAY changes:** noindex FAIL→PASS, noindex PASS→FAIL, canonical PASS→FAIL, head-elements PASS→FAIL, body-only PASS→PASS on three checks. `runs/replay/replay-2026-09-13.json` | 2026-09-13 | Claude (replay) | The changes were local replay changes, not product page changes. No scheduling (deliberately `workflow_dispatch`). A change on a LIVE page is not proved | replay, 13 Sep 2026 |
| 43 | Experiment / Change Impact | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 44 | Funnel / Business Outcome Intelligence | DEFERRED | OUT — later phase; §62 l.553 | none | 2026-09-11 | Claude (repo audit) | — | — |
| 45 | Cost Governor | VERIFIED-PASS | IN — §32; §33 cost ledger | **Held under real load, 12 Sep:** 500 selected against a 1,497 pool, cap never exceeded, per-host budget applied (almicv 150 of 482), 1 req/s over 403s. Every host's billable traffic stated in words in the run summary. `CostRecord.amountState = UNKNOWN` | 2026-09-12 | Claude (repo audit) | 🔴 **The cap holds; nothing tracks money.** No ledger, no metering, no spend figure — the run's own cost is UNKNOWN because Gate C has never been applied to a crawler we operate (`U-COST-5`, `GATE-2`) | first real crawl, 12 Sep 2026 |
| 46 | Cache Before Re-Research | BUILT-NOT-PROVED | IN — §41, named a hard gate | Built and measured. The same fact requested three times **reaches the source exactly once** (sabotage-proved). Outside its applicability scope or its freshness window it is a **MISS, not a stretch**. Hits and misses are both counted and the **freshness window prints beside the hit rate** (LAW-BOUND-1). 🔴 **AND IT NOW REFUSES WHAT IT SHOULD.** Over the real registry, 46 facts × 2 requests → **64 hits, 28 misses, hit rate 69.6%**, misses named: `UNKNOWN_CONFLICT` 12, `UNKNOWN_INCOMPLETE` 8, `UNKNOWN_SOURCE_UNREACHABLE` 8 | 2026-09-12 | Claude (repo audit) | 🔴 **THE PREVIOUS ROW REPORTED 92 HITS / 0 MISSES / 100%, AND THAT NUMBER WAS THE DEFECT** (`D-FACT-3`). `get()` checked freshness and nothing else, so all 14 records a human had just marked UNKNOWN were served as clean hits — **including an NMCN fee one official page puts at ₦66,875 and another contradicts** — against this module's own header law that a conflicted fact is never silently used. Fixed; **the hit rate fell to 69.6% and the fall is the improvement**, which is why hit rate must never be the measure. Remaining blocker unchanged: **nothing researches yet**, so even 69.6% measures a pre-loaded registry, not a research loop | item 15 ingest, 12 Sep 2026 |
| 47 | Paid Provider Controls | VERIFIED-PASS | IN — §62 l.555 "must not activate paid providers by default" | **13 Sep 2026: the controls exist, against a FAKE provider** — `src/cost/paid-provider-gate.mjs`: off by default, explicit named/dated/per-provider authorization with budget and cap, kill switch, budget and cap refused before the call; each RED-proved; five refusals in `runs/cost/ledger.jsonl` as REFUSED. No paid provider is wired anywhere in the repository. The one external API in use (Search Console) is free and read-only | 2026-09-11 | Claude (repo audit) | ✅ **Satisfied by CONTROLS now, not by absence.** ⚠️ The gate binds calls made through it; no paid provider exists to census. *Earlier, kept:* Satisfied **by absence, not by a control**: there is no budget, cap, kill switch or test that would stop a paid provider being added tomorrow | — |
| 48 | Idempotency & Retry Safety | VERIFIED-PASS | IN — safety; §62 l.553 audit slice | **Reopened 12 Sep (868 duplicate issues); left FAILED 13 Sep by a re-run that passed.** Every job that stores a record run twice into one store: **crawl (local replay) 389 unchanged → 0 new, 389 re-sightings; 5 changed → 5 new observations**; DNS audit on RECORDED resolver answers 134 → +0; technical 2328 → +0; content 1576 → +0; verification 8 → +0; supply labels 550 → +0. Issue-writer census holds every writer to appendIfNew. Retry rule tested (one request per 4xx) | 2026-09-13 | Claude (replay) | DNS answers were recorded, not live | replay, 13 Sep 2026 |
| 49 | Audit Trail & Provenance | VERIFIED-PASS | IN — v0.1 CONTAINS l.974 (§14) | **The evidence → claim chain now runs end to end on real data.** 107 Issues written, each citing the crawl observation AND the stored robots.txt or DNS observation it was derived from. **0 broken chains** in the rendered report. The four robots.txt files are stored as observations with hashes, not looked up. **Two further Issues added 12 Sep from the verification return**, both verdict `UNKNOWN` not `FAIL`, citing 6 observations whose `method` is `human-verification-return` and whose target is the **verdict row we hold** — 🔴 *not* the official pages, which we never fetched. A content hash attributed to a page we never retrieved would be indistinguishable from a real one | 2026-09-12 | Claude (repo audit) | **No Source record has been written** — the §623 tier layer is still unexercised; the new Issues' `sources` carry fact ids, which is not the same thing. And **no issue has ever been CLOSED or SUPERSEDED**, so the lifecycle half of the audit trail remains untested — the two new Issues open, they do not close | item 15 ingest, 12 Sep 2026 |
| 50 | OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation | FAILED | IN — DoD §170; v0.1 CONTAINS l.974 | **13 Sep 2026, later: whole population reconciled — 36 governed, 25 advanced, 11 refused, verified facts 33 → 25; stays FAILED: 9 VERIFIED labels rest on an unsettled reading (6 qualifiers, 2 list completeness, 1 rule scope).** **13 Sep 2026: REOPENED — the writing record's VERIFIED label was wrong (3 of 6 elements confirmed; a supplied 0 trusted). Record corrected; guard reconciles declared elements (D-GUARD-1); test re-runs green, move withheld: 32 VERIFIED labels were never reconciled, 11 multi-claim.** **13 Sep 2026: LEFT FAILED — the F24 guard judged 4 real records leaving UNKNOWN (2 advanced on a new measurement, 2 refused and kept UNKNOWN), both directions RED-proved.** **Argued 13 Sep from the boundary's words — stays FAILED.** "No path converts UNKNOWN into PASS": closing an UNKNOWN issue was such a path, unguarded — so the guard was widened to issue transitions (the same law, the same table) and now judges **145 real transitions**, RED-proved on the old lifecycle. Four stored record types gained declared labels, with a census that fails on any undeclared type. **But all 145 start from FAIL** — a real record leaving UNKNOWN has still never passed through the guard | 2026-09-13 | Claude (queue run) | 🔴 **FAILED:** the guard still polices an empty population where it matters. Leaves FAILED when a real UNKNOWN record leaves UNKNOWN through it, refused or on a new measurement | queue run, 13 Sep 2026 |
| 51 | Explainability | VERIFIED-PASS | IN — §62 l.553 "minimum internal report/action view" | **All six on the real report for all three recommendations** (`runs/report/index.html`). Evidence linked by a count-checked record; **priority** derived from measured impressions and ranked (1 of 2, 2 of 2, one UNKNOWN — no page); **confidence** the weakest source tier plus completeness; **cost** from the ledger entries that produced the evidence. No number chosen — a test fails on any constant | 2026-09-13 | Claude (queue run) | ⚠️ Cost reads UNKNOWN on all three (the audit and crawl runs behind the evidence were never costed; only lower bounds), and the cost of carrying one out is UNKNOWN — readable, stated, and not yet measurable | queue run, 13 Sep 2026 |
| 52 | Case Study Acceptance Test | BLOCKED-UNKNOWN | IN — v0.1 CONTAINS l.974 "Case Study #1 acceptance test (§60)" | `CASE_STUDY_01_ACCEPTANCE_TEST.md`, `case-study-01/corpus/MANIFEST.md`, `case-study-01/exhibits/` (34 files, 4 exhibits) | 2026-09-11 | Claude (repo audit) | 🔴 **NOT RUN = NOT TESTED.** `CS-3`: the test has never been executed. See the contradiction resolved below — **`CS-5`'s premise is false**, and the register, `CASE_STUDY_01_RUN_01.md` and `V51_REMEASURE.md` all carry the false version | contradictory evidence found — see §"Item 52" |
| 53 | Cross-Product Portability | VERIFIED-PASS | IN — §62 l.555 provider-neutral foundation; boundary law | `tools/product-boundary.mjs` + 13 tests: **`src/` names no product in code, 0 lines**, with an independent `git ls-files` census of the population. the first product's descriptor declares axis+variants — outside this repository since 14 Sep 2026 (Option A), and row 53 re-sat there and held, three sabotages RED (runs/audit/row53-portability-red-2026-09-14.txt) | 2026-09-11 | Claude (repo audit) | ✅ **13 Sep 2026: a neutral declared test product (`products/neutral-test-ferments`) initialized and discovered by the generic core with no first-product knowledge, and no first-product private record leaked during that run — both halves RED-proved.** *Earlier, kept:* **Only one real product exists in `products/`.** Portability is proved by a static boundary scan and by fixture tenants — **no second declared product has been operated end-to-end** | — |
| 54 | Cross-Product Isolation Test | BLOCKED-UNKNOWN | IN — DoD `DOD-02`; §62 l.553 | `test/product-isolation.test.mjs`: adversarial — "B cannot read A's licence terms by name", "every accessor refuses the other tenant's licence", plus a non-empty guard so it cannot pass vacuously | 2026-09-13 | Claude (queue re-scan) | **Re-scanned 14 Sep 2026 on the new layout (Option A): still blocked, and not because of the move** — the run's own check still finds no cost entry naming a product and no learning record. **After item 53's run (13 Sep): still blocked** — the run produced no cost and no learning record tied to a product. **Re-scanned 13 Sep: still blocked.** A cost ledger now exists, but **no cost entry names a product**, so neither product holds private costs; and **no learning record exists** (`U-ISO-1`). Half an input is not an input | re-scan, 13 Sep 2026 |
| 55 | Security / Secrets / Recovery | VERIFIED-PASS | IN — §37 API-key & secret architecture; DoD | **An EXECUTING leak test with a planted fake secret** (`test/secret-leak.test.mjs`): the adapter, the ingest and the CLI in a child process, searched for the marker, key lines, three digests and the secret's length. **Its first run FAILED on a real leak** (D-SEC-1) — fixed, re-run, passed; a sabotage that logs the key turns it red. **Recovery:** four committed stores and the body archive torn, detected and restored from git, byte-identical by blob hash | 2026-09-13 | Claude (queue run) | The real key was never read. A leak through a module this test does not drive is not covered — every credential path in the repository today is driven | queue run, 13 Sep 2026 |
| 56 | Desktop + Mobile Owner Experience | VERIFIED-PASS | IN — DoD v0.1 "dashboard/report works on desktop and 430px" | **VERIFIED BY THE OWNER, 13 Sep 2026** — four narrow-width screenshots in `runs/owner-verification/item-56-2026-09-13/`, the cost ledger's sideways scroll raised and ruled NOT clipping (PD-1). An owner-facing surface now exists. It declares `width=device-width`, a `@media (max-width:430px)` breakpoint, and `overflow-x:auto` on wide tables so the body never scrolls sideways — all asserted by test | 2026-09-12 | Claude (repo audit) | ✅ **VERIFIED BY THE OWNER'S LOOK, 13 Sep 2026** — no automated run may set this row. ⚠️ All four screenshots are narrow-width; the desktop half rests on the owner's verification. *Earlier, kept:* 🔴 **NOT VERIFIED BY LOOKING.** Chrome's screenshot injection timed out on every attempt, including on a trivial `<h1>probe ok</h1>` page — the extension, not this page. The structure is asserted; **the appearance is unverified** and a structural assertion is not a visual check | report view, 12 Sep 2026 |
| 57 | Final Independent Audit | NOT-STARTED | IN — checklist §1; DoD v0.1 | This document is the **first status baseline**, not the final audit | 2026-09-11 | Claude (repo audit) | Cannot run while 16 items are ◐ and 1 is ⚠; and it must be *independent*, which a self-audit is not | — |
| 58 | DONE Declaration | NOT-STARTED | IN — checklist §6, owner sign-off | none | 2026-09-11 | Claude (repo audit) | Requires every applicable item ☑ or justified N/A with no frozen blocker. **0 items are ☑**, and N/A justifications are the owner's — none exist | — |
| 59 | Falsifiability of Findings | VERIFIED-PASS | IN — `PASS_BOUNDARIES_AMENDMENT_3.md`, owner ruling under §12, 13 Sep 2026, re-issued 14 Sep 2026 (class P) | `bin/refutation-census.mjs` over the real store: population 20 (17 finding classes + 3 recommendations), 20 carry observation · source · condition with a held method (`config/refutation-register.mjs`); every EVIDENCE limb RED alone in the real register and restored, hash-checked (runs/audit/row59-*). Backfill 20 written, 0 not written | 2026-09-14 | CC (Amendment 3 work half) | none for the tick. The limit, on the row: the census cannot prove a refutation is well chosen — that is human judgement | — |
| 60 | Consequence-Weighted Priority | VERIFIED-PASS | IN — `PASS_BOUNDARIES_AMENDMENT_3.md`, owner ruling under §12, 13 Sep 2026, re-issued 14 Sep 2026 (class P) | `config/consequence-register.mjs` reconciled line by line with the 14 finding classes in use — HIGH 4 · MODERATE 6 · LOW 4, every one the owner's (`ROW60_CONSEQUENCE_LAW.md`, `ROW60_COVERAGE_AND_LEVELS_RULING.md`, `ROW60_POPULATIONS_RULING.md`); every issue in exactly one of four populations (541 findings · 1,224 coverage gaps · 134 decisions on record · 134 audit trail); the decision on record first on the owner's report; the basis on the real report; the four frozen limbs RED alone and restored (runs/audit/row60-*) | 2026-09-14 | CC (row 60 — Option A) | 🔴 the limit: it proves consistent application of the owner's judgement, never that a level is well chosen; the tick rests on three same-day rulings, each self-checked against the ANTI-CIRCLE law | — |
| 61 | Safe Local Page Construction | VERIFIED-PASS | IN — `PASS_BOUNDARIES_AMENDMENT_5.md` §4 (class P); reserved there, created 14 Sep 2026 once rows 59 and 60 existed | PR #72 built it: `bin/build-page.mjs` takes `--slug` / `--all-slugs` with no default; Gate A's four parts enforced in the construction path, failing closed; RED/GREEN in `runs/audit/row61-gate-a-*`. 15 Sep 2026, on the owner's decision (`_handoffs/AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md`): the second declared neutral test product `neutral-test-knots` run end to end through the runner — every spec REFUSED, DATA GAP / BLOCKED recorded, nothing written, no first-product load or read; four limbs RED alone (`runs/audit/row61-second-product-*`) | 2026-09-15 | CC (row 61 ticked on the owner's decision) | No real page can be accepted: no WHY_THIS_URL is written, no template family has three rendered specs, PAGE-1 UNSATISFIED. Row 53's product untouched | — |

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
