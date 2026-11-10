# AlmiVisibility — NIGHT SAVE, 21 September 2026

**Session:** 20 Sep 18:00 → 21 Sep ~06:30 (owner's hours, Reykjavík)
**Written by:** beta-g · **Implemented by:** CC · **Ruled and merged by:** Sheikh Muhammad Nasir Uz Zaman

> This document is the saved state of one working night. It is not a ruling and it is not a tick.
> Where it records a status, that status was measured; where it records a decision, the decision is the owner's.

> **Precedence.** This is beta-g's record. Every figure in it is **as CC reported it at 06:26 on 21 Sep**,
> not as beta-g re-measured it. CC's committed `_handoffs` session handoff recomputes these figures from
> the repositories, and **on any difference the recomputed figure wins and this document is the one that
> is wrong.** A number copied from a report is not a measurement.

---

## 0. READING ORDER

1. `ALMIWORLD_PRODUCT_MASTER_STANDARD_COMMAND.docx` — permanent, sits above this document
2. `ALMIWORLD_WORLD_CLASS_PRODUCT_COMMAND_FINAL.docx` — ONE PRODUCT LAW · ANTI-CIRCLE LAW
3. `AlmiVisibility_Unified_Product_and_Execution_Master v1.2 FINAL` — the controlling product document
4. `ALMIVISIBILITY_BEST_PAGE_RECIPE_STRATEGY_FINAL_v4` (21 Sep 2026) — **new this session, not yet formally adopted**
5. This document

Where an older handoff conflicts with items 1–3, the older handoff loses and the conflict is written down.

---

## 1. HEADS AT THE CLOSE

| | |
|---|---|
| Engine `almi-visibility` main | **`12956f2`** — `origin/main`, local HEAD and CI all agree |
| Main CI | **success on that exact SHA** (run 35568111759, 4m18s) |
| Data `almi-visibility-data` main | **`e0b85f9`** — pushed, clean |
| Suite | **1620 / 1620 · 0 fail** |
| Board | 61 rows → **26/61 · 26/38** |
| Row 6 | **BUILT-NOT-PROVED** — did not close |
| Spend | unchanged |

**Board detail:** BLOCKED-UNKNOWN 2 · BUILT-NOT-PROVED 5 · TESTABLE-NOW 1 · VERIFIED-PASS 26 · FAILED 2 · NOT-STARTED 2 · DEFERRED 23.

---

## 2. WHAT MERGED

### Engine

| PR | SHA | what |
|---|---|---|
| #129 | `ecfeb8f` | Route B declared tenancy — one generic resolver, opaque never-computed identifiers |
| #130 | `e0d3adb` | Row 50 evidence-state enforcement + pre-contract grandfathering |
| #131 | `60209a3` | Row 6 FIX 1–4 |
| #132 | `8f3f5b9` | Row 6 FIX 5 (BUILD reachability) |
| #133 | `7990d8c` | Row 61 amended (Amendment 7) and re-sat |
| #134 | `0554815` | main restored to green |
| #135 | **`12956f2`** | level-of-verdict law |

### Data

| PR | SHA | what |
|---|---|---|
| #5 | `a577c44` | axis/value corrections |
| #6 | **`e0b85f9`** | invented field `destinationVerified` removed (0 occurrences on main), original `previous` provenance restored, both PNMC records VERIFIED under the owner's name |

---

## 3. THE SUBSTANTIVE FINDING OF THE NIGHT

**Engine main's red was a product defect, not stale tests.**

`bin/report.mjs` selected VERIFIED across the whole registry and built a `Source` record from each. That was correct only for as long as the single derived record happened to stay UNKNOWN — the label filter never reached it. The owner's lawful verification of the two PNMC facts ended that condition, and the real reporting binary died in `makeSource` with `TypeError: source_url is required`. **Six call sites carried the same latent bug.**

A re-pinned assertion would have hidden this. It was fixed at source instead:

- `verifiedSourceBearingFacts` — the population named **once**, in `registry.mjs`, so no caller can re-admit a derived record by repeating the filter
- `sourceRecordFromFact` now refuses a derived record **by name**, per F28
- the binary exits 0

**Two further pre-existing defects fixed in the same pass:**

- **the `.test-scratch` symlink race** — `readdirSync` → `lstatSync` with another test deleting its scratch directory in between. A vanished path cannot be a symlink, but it is now **recorded, not swallowed**: a bare `catch {}` would let a census whose tree dissolved report the same clean zero as one that saw everything. Four consecutive green full-suite runs, one of them with everything staged.
- **`tools/` missing from the working-tree guard's allow-list** since the guard was written. It surfaced the first time a file there legitimately changed. All fourteen files are engine tooling — no data, no content — so widening it moves nothing the rule protects.

---

## 4. ROW 6 — A PROVED HALT, NOT A FAILURE TO TRY

The axis `destination` is discovered on **ten real countries** (peru, spain, australia, china, denmark, japan, netherlands, new_zealand, philippines, switzerland). The answer evidence speaks in **`domestic` / `foreign` / `uk-nmc`**. **Zero shared values.**

| hypothesis | result |
|---|---|
| **H0** the children are real destination values, not slug fragments | **PASS** — all ten carried by real query rows; 15 distinct natural-language queries (*"is pte accepted in denmark"*, *"study in philippines 2026"*); **0 slug-shaped** |
| **H1** PNMC defines within-Pakistan vs foreign | **PASS** — both records VERIFIED against `pnmc.gov.pk`, evidence states *inside / outside Pakistan* |
| **H2** the jurisdiction is explicitly recorded | **FAIL** — `jurisdiction`, `country`, `countryCode`, `issuingCountry`, `authorityCountry`, `territory`, `referenceCountry` are all absent from the schema. `scope: "origin"` names **which side of a corridor** a fact is about, not which country |
| **H3** every value is mechanically classifiable | **FAIL** — `domestic`/`foreign` are **relative classes**, `uk-nmc` is a **regulator id**; no declared country reference exists in either repository |
| **H5** a generic relation exists | **FAIL** — `IS_WITHIN` needs places on both sides, and "foreign" is not a place |

**H2 is the load-bearing one.** The reference point "foreign" is relative to appears only in free prose and in the `pk-` id prefix. Reading it out of either is **inference from a name** — exactly what the declared-tenancy ruling forbids.

### And the missing data would not have helped

**All ten discovered countries inherit the same parent answer.** None of them is the issuing jurisdiction. So even a perfect, properly declared country reference still leaves the axis **constant at the level people actually search**.

This is not *"blocked on data"*. It is **"blocked on data, and the data would not distinguish."**

§4 (the value hierarchy) was therefore **not built** — building it would require country reference data from a named declared source; none exists, and supplying it from the model's own knowledge is forbidden and would be fabrication.

---

## 5. THE LEVEL-OF-VERDICT LAW (PR #135)

**The obvious fix was the trap.** Supply a mapping, the DISJOINT refusal lifts, and the axis reads ANSWER_CHANGES because Rs.1,000 ≠ Rs.10,000 **at the parent level** — although the answer never changed for anyone who actually searched.

So the mapping path ships with its guard already on it:

- `projectToDiscoveredLevel` — counts answers at the **discovered** level
- `CONSTANT_AT_DISCOVERED_LEVEL` — refuses one-answer-for-all
- `INCOMPLETE_LEVEL_MAPPING` — refuses a mapping that drops values

**Sabotage:** counting at the parent level instead turns the suite RED from the assertion that names the discovered level, and restores clean.

**The production path is deliberately unchanged** — `destination` still reads `DISJOINT_VALUE_POPULATION`; verdicts still UNKNOWN 7 · MONITOR 7 over 14 candidates. This is a guard standing ready on a path nobody may lawfully take yet.

---

## 6. PROOF DISCIPLINE THAT HELD

**Frozen-clause census, run before any figure moved:** 14 moved figures × 61 rows × 4 parts = **244 clauses**, 14 live positive controls, clean negative control → **0 hits**. No moved figure was pinned in a frozen acceptance, so the assertions were lawfully updatable. Every replacement figure was **measured, not inferred**; superseded figures are kept dated in place.

**Sabotages: 4 designed · 4 landed · 4 RED from the named assertion · 4 restored.**

1. re-admitting the derived record
2. disabling F29's cap *(also reddened the F29 registry law — a correct additional consequence, not collateral)*
3. silently skipping a vanished path
4. counting answers at the parent level

**CI honesty check:** CI checks out `almi-visibility-data` at its default branch with **no pinned ref**, and data main is pushed and clean at `e0b85f9` — so a green check genuinely means *engine branch against owner-verified data*, not against a stale snapshot.

---

## 7. ERRORS RECORDED, SO THEY DO NOT REPEAT

### CC's — one shape, made twice: **a coincidence read as a dependency**

- `REGISTRY_VERIFIED_COUNT` was set to **19**. Its own contract is *"how many checks came back confirmed"*, paired with `REGISTRY_FACT_CHECK_COUNT = 46` checks that ran: **18 + 28 UNKNOWN = 46 ✓**, while 19 + 28 = 47 ✗. Nineteen came from a different population (registry-wide VERIFIED labels, including the derived ratio). **It is 18**, with the whole-registry total of 19 documented beside it and the arithmetic now asserted.
- `manualQueueCost(manual(16))` — the 16 is a **fixture size**. It was rewritten as though it were the registry's verified count, because both happened to read 16. Now bound to the fixture it is handed, and commented so the next reader does not repeat it.

Both were **self-reported**. Neither was buried.

### beta-g's — register now at #27

- **#26 — denominator dropped from a directive.** The handoff said *"measured dead in this batch"* (correct) and then *"do not begin by building a sitemap adapter against material that is not there"* (denominator gone). Read literally it would have prevented the gate that found **20,895 real sitemap URLs**.
- **#27 — the wrong detector's threshold relayed.** "40+ chars" belongs to `findCopiedFacts`; Row 25 uses `MIN_VALUE_CHARS = 8`, and the true denominator is **11**, not 16. Breach of standing-correction clause 3: measure that a law applies to *this* object first.
- **a two-state census rule** where three worlds existed → an empty tenant was lawfully kept.
- **F2b answered its own question** — it supplied the expected tenant string while asking CC to measure it.
- **E3 was unsatisfiable** — it required a crawl batch and a sitemap collection on the same tenant; measurement showed they span 18 and 5 origins.
- **the hours assumption** — asserted three times that the owner had been working since 07:00 and argued for stopping on that basis. He starts at **18:00**. Corrected; the argument was dropped.

---

## 8. LAWS EARNED THIS SESSION — CARRY THEM FORWARD

| law | bought with |
|---|---|
| **the suite exit code is not the signal in this repository** | measured twice returning 0 with failing tests; `node --test test/` once loaded no test at all, and a module-not-found would have read as a failure |
| **targeted green is not green** | four times a targeted run passed while the whole suite found a real consequence |
| **a rule that lives where no test runs cannot be proved** | placement is part of provability — three sabotages stayed green |
| **a sabotage can turn RED for the wrong reason** | after each RED, name the assertion and the branch removed |
| **derived artefacts** | a ledger change has four times invalidated artefacts built from it, none reachable from the row's own tests |
| **a correctly-scoped zero is a value, not an absence** | the owner's own catch |
| **assert the property, not the count** | an assertion pinning a count breaks every time the product does its job |
| **a coincidence read as a dependency** | the 19 and the 16, above |
| **cheapest blocking gates first** | a halt should cost ten minutes, not two hours |

And the one that governs all of them:

> **The governing defect pattern is a two-state check that cannot tell two worlds apart.
> THE FIX IS ALWAYS A THIRD STATE, AND THE THIRD STATE MUST FAIL.**

---

## 9. OWNER RULINGS MADE THIS SESSION

**Route B tenancy.** A tenant is an externally declared generic isolation scope. A crawl batch, a sitemap collection and an evidence run are **provenance, not the tenant**. A tenant may never be derived from a hostname, product name, repository name, folder path, batchId or page content. One generic resolver governs every resource kind. Unknown, missing, duplicate and conflicting declarations fail closed. Identifiers are **declared opaque** (`tenant:<32 hex>`), **never computed** — this superseded beta-g's own earlier SHA-256-of-origin specification.

**Row 50 pre-contract label reading.** A pre-contract record satisfies *"labelled on its face"* without retrospective `claimDimensions` only when all five hold: (1) lawfully date-exempt · (2) explicit `verificationState` · (3) a **named human** checker and date · (4) `notConfirmed = 0` via the real guard · (5) no UNKNOWN promoted and no missing evidence inferred. **A model re-check can never replace a named human verification.** No fact value, source, quote or verification decision changes under this ruling.

**FEATURE COMPLETION LAW.** A technical defect means FIX → TEST → CONTINUE the same feature. HALT only for a genuine owner business decision, human verification or signature, legal/licence authority, unavailable external access, or where the evidence would have to be fabricated.

**The working loop, restated and binding.** (1) the owner gives beta-g CC's report · (2) the owner writes the command · (3) beta-g reads it, corrects it and rewrites it in beta-g's own words · (4) the owner gives that final command to CC.

---

## 10. v4 — WHAT ARRIVED, WHAT IT CHANGES, WHAT IT STILL NEEDS

`ALMIVISIBILITY_BEST_PAGE_RECIPE_STRATEGY_FINAL_v4`, 21 September 2026, 23 sections, product-neutral.

**What it settles:**

- **§5** — impressions with zero clicks remain a **measured observation**, but zero clicks alone **never** unlock BUILD or REJECT. This closes the SILENT vs MONITOR ambiguity.
- **§7** — where verified answers remain **materially constant**, the verdict is **REJECT, not BUILD**. This makes the PNMC case REJECT *as doctrine*, not as a one-off judgement.
- **§13/§14** — the three universal thresholds are replaced: no ≥5-fact rule, no ≥350-word floor, no percentage-only 40%-overlap hard failure. Evidence-based completeness plus a **mandatory semantic review trigger** takes their place: a percentage may trigger a review; it may never alone be the rejection.
- **§18** — HEAVY / THIN / EMPTY supply against MEASURED / SPARSE / UNKNOWN demand. **"EMPTY supply plus UNKNOWN demand is not an opportunity."** Directly relevant: Row 6's last run emitted `demand [MEASURED · SPARSE · THIN]`.
- **CREATE** requires **three genuinely independent categories** of demand evidence, one ecosystem counting once.
- **Owner approval is mandatory** before any page goes live. **Anti-loop:** initial build plus at most two repair rounds.

**What it still needs before formal adoption:**

§21 requires that adoption **expressly amend and re-test** any frozen acceptance carrying the old thresholds. For the ≥5-fact rule that is **already satisfied** — Amendment 7 and the Row 61 re-sit (`7990d8c`) did exactly this, and the amendment made the gate **stricter**: `speech-pathology`'s facts part moved PASS → FAIL because 2 of its 9 cited claims lack a fresh approved source. The old ≥5 count had been hiding them.

But v4's **new** rules — three-independent-categories, the 28-day / 100-impression window, HEAVY/THIN/EMPTY — have **not** been censused against frozen acceptance, and **clicks and CTR are frozen for rows 9 and 29**. That census is the precondition for adoption.

**§22 Instant Website Visibility Score** is the first customer-facing capability in the document, and **§22.6 self-parks it** out of the 61-feature inventory and the current-release denominator. It changes no denominator and needs its own owner adoption naming a feature row before anything is built.

---

## 11. OPEN AT THE CLOSE — OWNER DECISIONS

1. **Adopt v4?** — requires the census of its new rules against frozen acceptance first. §21's re-test duty is already discharged for the ≥5-fact threshold.
2. **§22 Instant Website Visibility Score** — parked pending a separate adoption naming its feature row.
3. **Row 6** needs a **declared country reference from a named source** — and even then closes only if the parent-level constancy is broken, which the measurement says it is not.
4. **`config/discovery/axis-candidates.mjs`** hard-codes three client hosts and a client URL regex in a config the neutrality census does not cover. **PARKED twice.** On the standalone-product ruling this is the sharpest outstanding neutrality item.
5. **The crawl batch manifest** still carries no `sourceFile` / `sourceRepository`.
6. **Sitemap CLEAN caveat carried forward:** the 28 BOUND URLs read CLEAN through detector D, but that says nothing about `noindex` or `canonical` — the capture stores neither per URL.
7. `Claude outputs/` and `PHASE_0_ITEM_4_DECISION_BRIEF.md` are **untracked** in the engine root (owner documents, all timestamped 21 Sep 03:59). CC left them alone and never staged them. Standing instruction: do not touch.

---

## 12. WHAT WAS NOT DONE, STATED PLAINLY

- **§6–§7 of the Row 6 command were not reached** — they depend on §4, which is lawfully blocked.
- **CC wrote no `_handoffs` record of the command text**, because it no longer held it verbatim and reconstructing it would have fabricated a record. The results live in the RESUME memory instead. **This document is the replacement record.**
- **Row 6 did not close.** The night's exit is **EXIT B — main green · Row 6 proved halt.** The board did not move: 26/38 at the open, 26/38 at the close.

**That is the honest headline.** A twelve-hour night that moved the board by zero rows, and in which the single most valuable thing found was a crash in the real reporting binary that only appeared because the owner's own verification was lawful and correct. **A truthful FAILED is worth more than a false PASS, and a proved halt is worth more than a tick bought with inference.**

---

*End of night save. Nothing in this document is a ruling. Nothing in it is a tick.*
