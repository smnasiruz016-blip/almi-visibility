# AlmiVisibility — beta-g HANDOFF

**Written:** 21 September 2026, at the close of the 20–21 Sep night session
**For:** the next beta-g session · **Owner:** Sheikh Muhammad Nasir Uz Zaman
**Frozen at:** engine `12956f2` · data `e0b85f9` · handoffs `5069d3a`

---

## 0 · WHAT THIS DOCUMENT IS

This is the briefing a fresh beta-g session reads before writing one word about AlmiVisibility.
It is **not** a ruling, **not** a tick, and **not** authority. Where it records a status, that status was
measured by CC and reported; where it records a decision, the decision is the owner's.

**Precedence.** `_handoffs/AlmiVisibility_SESSION_HANDOFF_2026-09-21_MORNING.md` (commit `5069d3a`) is
the **committed** record, recomputed from the repositories. This document is beta-g's briefing.
**On any conflict of figures, the committed handoff wins and this document is the one that is wrong.**
A number copied from a report is not a measurement — and that rule binds beta-g too.

---

## 1 · READING ORDER AND AUTHORITY

Read in this order. Where an older document conflicts with a newer one, the newer wins **and the
conflict is written down**, never silently resolved.

1. `ALMIWORLD_PRODUCT_MASTER_STANDARD_COMMAND.docx` — permanent, sits above every handoff
2. `ALMIWORLD_WORLD_CLASS_PRODUCT_COMMAND_FINAL.docx` — ONE PRODUCT LAW · ANTI-CIRCLE LAW
3. `AlmiVisibility_Unified_Product_and_Execution_Master v1.2 FINAL` — the controlling product document
4. `_handoffs/AlmiVisibility_SESSION_HANDOFF_2026-09-21_MORNING.md` — the committed state
5. This document

**Authority hierarchy for conflicts** (from the Unified Master):
later explicit owner ruling → frozen Definition of Done / PASS boundary → product identity and
architecture contract → feature checklist and frozen row boundaries → V5.1 master build spec →
execution and process laws → current code and tests.

**Non-negotiable:** current code behaviour, a green test, a fixture or an old implementation assumption
**never silently becomes product authority**.

### The two questions, every time, before writing one sentence about a row

1. **Read that row's OWN frozen text and quote it.** An adjacent row's wording is never authority for this row.
2. **Check whether a later owner ruling has changed the boundary that row sits in.** A superseded
   document's wording is never authority again.

**LATEST-RULING-WINS.** A superseded clause does not announce itself. It is still physically present
in the file, unchanged, reading as law. Only a later ruling living somewhere else kills it.

---

## 2 · THE LOOP — WHO DOES WHAT

> **1.** The owner gives beta-g CC's report.
> **2.** The owner writes a draft command.
> **3.** beta-g reads it, corrects it, and **rewrites the whole thing in beta-g's own words**.
> **4.** The owner gives that final version to CC.

**beta-g** researches, measures, verifies and authors commands. **CC** implements. **The owner rules and merges.**

**Drafting rule §18: no instruction may presume its requested result.** If a command supplies the figure
it is asking CC to measure, the command has answered its own question and the measurement is worthless.

**Commands go to the owner in ONE-CLICK COPY format** — a single fenced block, nothing to select by hand.

---

## 3 · STANDING CONSTRAINTS — IN FORCE, VERBATIM

**Secrets.** Never print, echo, log, expose, copy, transform, hash, encode, compare, inspect or measure
any secret value — including its length, prefix or suffix. Never screenshot a terminal. Never let a
production env file reach disk. Never enter credentials on the owner's behalf. Do not access a
credential merely to prove it exists.

**Writes.** No production write, no data-repository write, no connected-product write, no deploy without
the owner's GREEN.

**Licence.** Never store exam text — count, never quote. Never copy any sentence, question, option,
passage, case note or script from a real exam. `npm run build` is banned locally on almi-oet.

**Git.** **beta-g never runs git from the device shell** — it binds beta-g only. CC runs git,
**ONE MUTATION AT A TIME**, confirming no `.git/index.lock` exists, never deleting or bypassing a lock.

**Network and spend.** No network fetch, crawl, paid provider or spend without a green.

**Scope.** No edit and no PR in any other product's repository. Do not touch `Claude outputs/`,
`PHASE_0_ITEM_4_DECISION_BRIEF.md`, or `runs/crawl/corpus`.

**Delivery.** One branch, one PR, one merge. CC does not merge; the owner merges.
`_handoffs` takes direct commits to main (RR-76) — no branch, no PR for housekeeping.

**Communication.** Roman Urdu only. Address him as "aap". Never Urdu script, never mixed.
**Never bury a bad finding. Do not escalate or dramatise.**

**Bot detection is a stop, never a puzzle** — a CAPTCHA, interstitial, rate-limit block or ToS refusal
means the source is recorded UNAVAILABLE and is never evaded.

**His hours: he works from 18:00.** Do not assume otherwise and do not build an argument on his fatigue.

---

## 4 · VERIFIED HEADS AT THE FREEZE

| | |
|---|---|
| Engine `almi-visibility` main | **`12956f2`** — local == origin, working tree clean |
| Main CI | **success** on that exact SHA — run `35568111759` |
| Data `almi-visibility-data` main | **`e0b85f9`** — local == origin, clean |
| `_handoffs` main | **`5069d3a`** |
| Suite | **1620 / 1620 · 0 fail** — measured on `12956f2`, not re-measured at handoff time |
| Open PRs | none |
| Spend | unchanged |

**Verification integrity:** `destinationVerified` = **0 occurrences** across all 27 tracked data files,
with a **live positive control** (the same search shape found 3 and 50 hits elsewhere) — so the zero is
about the corpus, not a dead search. The PNMC verifier is stored as **`human:Sheikh Muhammad Nasir Uz Zaman`**,
`checkedOn 2026-09-21` — the schema's typed prefix plus the owner's name, unedited.

---

## 5 · THE BOARD

**61 rows:** NOT-STARTED 2 · BUILT-NOT-PROVED 5 · TESTABLE-NOW 1 · **VERIFIED-PASS 26** · FAILED 2 ·
BLOCKED-UNKNOWN 2 · DEFERRED 23. **Sum = 61 ✓.**

**26 / 61 total product · 26 / 38 current release.**

Recomputed from `CHECKLIST_STATUS.md` itself and cross-checked independently against `classify()`.
**The board did not move this session.** 26/38 at the open, 26/38 at the close.

**Seven states:** `NOT-STARTED · BUILT-NOT-PROVED · TESTABLE-NOW · VERIFIED-PASS · FAILED ·
BLOCKED-UNKNOWN · DEFERRED`.

> **TESTABLE-NOW is not a pass. DEFERRED is never a tick.**
> **FAILED is worth MORE than BUILT-NOT-PROVED — it means we looked.**

---

## 6 · THE LAWS IN FORCE

### The governing defect pattern

> **A two-state check that cannot tell two worlds apart.**
> **THE FIX IS ALWAYS A THIRD STATE, AND THE THIRD STATE MUST FAIL.**

This one sentence explains most of what has gone wrong on this product, including three of beta-g's
last four errors. Before writing any check, count the worlds.

### Named laws

| law | meaning |
|---|---|
| **A RULING IS NOT A TICK. EVIDENCE IS THE TICK.** | every ledger move declares its kind (`ruling` vs `work`) and its route |
| **LAW-ABSENT-1** | a failure to measure is never a finding about the subject |
| **LAW-BOUND-1** | every bounded operation prints its own bound beside its result |
| **LAW-ORPHAN-1** | a module imported only by its own test governs nothing |
| **LAW-FIXTURE-1** | a test double must be at least as messy as production |
| **LATEST-RULING-WINS** | the latest authority on that exact issue controls; the older clause is dead but still reads as law |
| **DEFAULT = PARK** | a discovery is not automatically the next job; UNKNOWN parks, it does not stop |
| **DO NOT BUILD A KNOWN-INCAPABLE PARTIAL FIX** | |
| **PR REQUIRED CHECKS GREEN FIRST, MERGE SECOND** | the owner's own ruling after his own breach on #117 |
| **RR-76** | `_handoffs` takes direct commits to main |
| **Drafting rule §18** | no instruction may presume its requested result |

### Laws earned on this product, this session — carry them forward

| law | bought with |
|---|---|
| **the suite exit code is not the signal in this repository** | measured twice returning 0 with failing tests; `node --test test/` once loaded **no test at all**, and a module-not-found would have read as a failure |
| **targeted green is not green** | four times a targeted run passed while the whole suite found a real consequence |
| **a rule that lives where no test runs cannot be proved** | placement is part of provability — three sabotages stayed green |
| **a sabotage can turn RED for the wrong reason** | after each RED, name the assertion and the branch removed |
| **derived artefacts** | a ledger change has four times invalidated artefacts built from it, none reachable from the row's own tests |
| **a correctly-scoped zero is a value, not an absence** | the owner's own catch — and a zero must carry a live positive control |
| **assert the property, not the count** | an assertion pinning a count breaks every time the product does its job |
| **a coincidence read as a dependency** | two matching numbers are not a relationship |
| **cheapest blocking gates first** | a halt should cost ten minutes, not two hours |

### FEATURE COMPLETION LAW

A **technical defect** means **FIX → TEST → CONTINUE the same feature**.

**HALT only for:** a genuine owner business decision · human verification or signature ·
legal or licence authority · unavailable external access · or where the evidence would have to be fabricated.

Nothing else is a halt.

---

## 7 · THE ERROR REGISTERS

### beta-g — the register stands at #28

The live patterns, in the order they keep recurring:

**A · Inherited authority.** Taking authority from an **adjacent** source (a neighbouring row's text,
a prior report's wording) or from a **superseded** one. Both axes. This is what the two questions in §1 exist to stop.

**B · The search narrower than the thing searched for.** **#26** — the handoff said *"measured dead in
this batch"* (correct) and then *"do not begin by building a sitemap adapter against material that is
not there"* (denominator gone). Read literally it would have prevented the gate that found **20,895
real sitemap URLs**.

**C · The wrong object's law.** **#27** — relayed "40+ chars" as Row 25's threshold. The 40 belongs to
`findCopiedFacts`; Row 25 uses `MIN_VALUE_CHARS = 8`, and the true denominator was **11**, not 16.
**Measure that a law applies to THIS object before quoting it.**

**D · Two states where three exist.** The former-tenant census said *"any occurrence → keep"*; three
worlds existed and an empty tenant was lawfully kept. **#28** — the session-close command told CC to
record *"no renderer available"* if it could not look at the DOCX pages. Three worlds existed: no
renderer · a renderer that paginates but cannot be viewed · a renderer that can be viewed. Word **was**
available and **did** paginate, so the prescribed line would have been **false**. CC correctly refused
the template and recorded the precise reason. **The fix is always a third state.**

**E · The question that answers itself.** F2b supplied the expected tenant string while asking CC to
measure it. §18 exists because of this.

**F · The unsatisfiable requirement.** E3 required a crawl batch and a sitemap collection on the same
tenant; measurement showed they span 18 and 5 origins.

**G · Reaching for what just became possible instead of what is next.** Three times. The owner caught all three.

**H · Assumptions about him.** Asserted three times that he had been working since 07:00 and argued for
stopping on that basis. **He starts at 18:00.** The argument was dropped.

### CC — self-caught, self-reported, never buried

This session CC reported every one of its own defects before being asked. That is the behaviour to preserve.

- `createTenantResolver` takes `{env}` — the declarations object CC passed had no effect; a wrong call
  shape that *"worked only because destructuring a non-matching object fell through to its default"*
- **S11 passed with the branch deleted** — a different branch reported sources with no reference at all
- a ledger edit script would have orphaned the row's old `why` key (two `why` keys in one object literal,
  the later silently winning)
- **invented a `destinationVerified` field** — §3 forbade inventing vocabulary; the claimElement already
  carried the owner's word. Shipped to data main, then **removed by data PR #6**
- **overwrote the `previous` block** recording the never-checked state — provenance erased twice in one
  command; restored by the same PR
- called five suite failures *"a full-suite effect, not a defect"* — three were real consequences it had missed
- **the same shape twice, this session: a coincidence read as a dependency.**
  `REGISTRY_VERIFIED_COUNT` set to 19 mixed two populations (it counts confirmed **checks**: 18 + 28
  UNKNOWN = 46, not 47 — it is **18**). And `manualQueueCost(manual(16))` was rewritten as though the 16
  were the registry's verified count; it is a **fixture size**, and the match was coincidence.

---

## 8 · WHAT SHIPPED — THIS SESSION

| PR | SHA | what |
|---|---|---|
| engine #129 | `ecfeb8f` | Route B declared tenancy — one generic resolver, opaque never-computed identifiers |
| engine #130 | `e0d3adb` | Row 50 evidence-state enforcement + pre-contract grandfathering |
| engine #131 | `60209a3` | Row 6 FIX 1–4 |
| engine #132 | `8f3f5b9` | Row 6 FIX 5 (BUILD reachability) |
| engine #133 | `7990d8c` | Row 61 amended (Amendment 7) and re-sat |
| engine #134 | `0554815` | main restored to green |
| engine #135 | **`12956f2`** | level-of-verdict law |
| data #5 | `a577c44` | axis and value corrections |
| data #6 | **`e0b85f9`** | invented field removed, provenance restored, owner's verification preserved |

### The substantive find: the red main was a product defect, not stale tests

`bin/report.mjs` selected VERIFIED across the whole registry and built a `Source` record from each.
That was correct **only while the single derived record happened to stay UNKNOWN** — the label filter
never reached it. The owner's lawful verification of the two PNMC facts ended that condition, and the
real reporting binary died in `makeSource` with `TypeError: source_url is required`.
**Six call sites carried the same latent bug.**

A re-pinned assertion would have hidden this. Fixed at source instead: `verifiedSourceBearingFacts`
names the population **once**, in `registry.mjs`, so no caller can re-admit a derived record by repeating
the filter; `sourceRecordFromFact` refuses a derived record **by name** (F28).

**Two further pre-existing defects fixed:** the `.test-scratch` symlink race (vanished paths **recorded,
not swallowed** — a bare `catch {}` would let a census whose tree dissolved report the same clean zero as
one that saw everything), and `tools/` missing from the working-tree guard's allow-list since it was
written (all fourteen files there are engine tooling, so widening it moves nothing the rule protects).

### Proof discipline that held

**Frozen-clause census, run BEFORE any figure moved:** 14 moved figures × 61 rows × 4 parts = **244 clauses**,
14 live positive controls, clean negative control → **0 hits**. No moved figure was pinned in a frozen
acceptance, so the assertions were lawfully updatable. Every replacement figure was **measured**;
superseded figures are kept dated in place.

**Sabotages: 4 designed · 4 landed · 4 RED from the named assertion · 4 restored.**
Re-admitting the derived record · disabling F29's cap · silently skipping a vanished path ·
counting answers at the parent level.

---

## 9 · ROW 6 — A PROVED HALT

The axis `destination` is discovered on **ten real countries**. The answer evidence speaks in
**`domestic` / `foreign` / `uk-nmc`**. **Zero shared values.**

| | |
|---|---|
| **H0** the children are real destination values | **PASS** — 15 distinct natural-language queries, **0 slug-shaped** |
| **H1** PNMC defines within-Pakistan vs foreign | **PASS** — both records VERIFIED against `pnmc.gov.pk` |
| **H2** the jurisdiction is explicitly recorded | **FAIL** — `jurisdiction`, `country`, `countryCode`, `issuingCountry`, `authorityCountry`, `territory`, `referenceCountry` all absent |
| **H3** every value mechanically classifiable | **FAIL** — `domestic`/`foreign` are relative classes; `uk-nmc` is a regulator id |
| **H5** a generic relation exists | **FAIL** — `IS_WITHIN` needs places on both sides, and "foreign" is not a place |

**H2 is load-bearing.** The reference point "foreign" is relative to appears only in free prose and in
the `pk-` id prefix. `scope: "origin"` names **which side of a corridor** a fact is about, not which
country. Reading the reference point out of a name is **inference from a name** — exactly what the
declared-tenancy ruling forbids.

### And the missing data would not have helped

**All ten discovered countries inherit the same parent answer.** None is the issuing jurisdiction.
Even a perfect, properly declared country reference leaves the axis **constant at the level people
actually search**.

> This is not *"blocked on data"*. It is **"blocked on data, and the data would not distinguish."**

### The level-of-verdict law (#135) — the obvious fix was the trap

Supply a mapping and the disjoint refusal lifts, and the axis reads ANSWER_CHANGES because
Rs.1,000 ≠ Rs.10,000 **at the parent level** — although the answer never changed for anyone who searched.
So the mapping path ships with its guard already on it: `projectToDiscoveredLevel` counts at the
**discovered** level; `CONSTANT_AT_DISCOVERED_LEVEL` and `INCOMPLETE_LEVEL_MAPPING` refuse.

**Production path deliberately unchanged** — `destination` still reads `DISJOINT_VALUE_POPULATION`;
verdicts remain **UNKNOWN 7 · MONITOR 7** over 14 candidates.

> **Row 6 is a proved halt, not abandoned and not complete.**

**Do not retry the PNMC parent/child hierarchy as a Row 6 closure route.** It is measured, not assumed.

---

## 10 · PRODUCT IDENTITY — AND THE ONE OPEN EXCEPTION

AlmiVisibility is a **standalone, product-neutral, multi-tenant** SEO / AEO / GEO and wider visibility
platform, for AlmiWorld products **and for outside clients**. **AlmiOET is its first high-standard
subject, not its owner and not its boundary.** No generic engine rule may silently become
AlmiOET-specific. A subject's data lives in its own repository; the engine's in-repo subjects are
neutral fixtures explicitly marked as such.

**Subject-to-subject isolation is the commercial guarantee an outside client buys**, not a checklist formality.

**The one measured exception, so this is not an overclaim:** `config/discovery/axis-candidates.mjs`
hard-codes **three client hosts and a client URL regex** in a config the neutrality census does not cover.
**PARKED, twice.** It is the sharpest open neutrality item on the product.

**Route B tenancy, the owner's ruling:** a tenant is an **externally declared generic isolation scope**.
A crawl batch, a sitemap collection and an evidence run are **provenance, not the tenant**. A tenant may
**never** be derived from a hostname, product name, repository name, folder path, batchId or page content.
One generic resolver governs every resource kind. Unknown, missing, duplicate and conflicting declarations
**fail closed**. Identifiers are **declared opaque** (`tenant:<32 hex>`), **never computed** — this
superseded beta-g's own earlier SHA-256-of-origin specification.

---

## 11 · v4 — STATUS AND WHAT ADOPTION NEEDS

`ALMIVISIBILITY_BEST_PAGE_RECIPE_STRATEGY_FINAL_v4`, 21 September 2026, 23 sections, product-neutral.

**🔴 MEASURED: the file is ABSENT from `C:\Projects\_handoffs` and UNTRACKED.** A differently-named file,
`ALMIVISIBILITY_MASTER_BUILD_COMMAND_v4_WITH_BETA_G_REVIEW.docx`, is present there — **a different
document**. The controlling strategy document is **not yet in the governance record**. Putting it there
is the owner's step; CC correctly declined to add a file that is not its own measurement.

**What v4 settles:**

- **§5** — impressions with zero clicks remain a **measured observation**, but zero clicks alone
  **never** unlock BUILD or REJECT. This closes the SILENT vs MONITOR ambiguity.
- **§7** — where verified answers remain **materially constant**, the verdict is **REJECT, not BUILD**.
  This makes the PNMC case REJECT *as doctrine*, not as a one-off judgement.
- **§13/§14** — the three universal thresholds are gone: no ≥5-fact rule, no ≥350-word floor, no
  percentage-only 40%-overlap hard failure. Evidence-based completeness plus a **mandatory semantic
  review trigger** replaces them: a percentage may trigger a review; it may never alone be the rejection.
- **§18** — HEAVY / THIN / EMPTY supply against MEASURED / SPARSE / UNKNOWN demand.
  **"EMPTY supply plus UNKNOWN demand is not an opportunity."** Row 6's last run emitted
  `demand [MEASURED · SPARSE · THIN]`, so this bites immediately.
- **CREATE** requires **three genuinely independent categories** of demand evidence, one ecosystem
  counting once. **Owner approval is mandatory** before any page goes live.
  **Anti-loop:** initial build plus at most **two** repair rounds.

**🔴 v4 IS NOT YET ADOPTED AND HAS NO IMPLEMENTATION AUTHORITY.**

§21 requires that adoption **expressly amend and re-test** any frozen acceptance carrying the superseded
thresholds. That duty is **already discharged for the ≥5-fact threshold** by `PASS_BOUNDARIES_AMENDMENT_7`
and the Row 61 re-sit (`7990d8c`) — and the amendment made the gate **stricter**: `speech-pathology`'s
facts part moved PASS → FAIL because 2 of its 9 cited claims lack a fresh approved source. The old ≥5
count had been hiding them.

It is **not discharged** for v4's **new** rules — three-independent-categories, the 28-day / 100-impression
window, HEAVY/THIN/EMPTY semantics — and **clicks and CTR are frozen for rows 9 and 29**.
**That census is the precondition for adoption.**

**§22 Instant Website Visibility Score** is the first customer-facing capability in the document, and
**§22.6 self-parks it** out of the 61-feature inventory and the current-release denominator. It changes
no denominator and needs its own owner adoption naming a feature row before anything is built.
Its recorded shape: public URL in, quick evidence-backed score out; categories covering technical search
health, content usefulness, SEO, AEO, GEO readiness and trust/evidence; **NOT MEASURED and UNKNOWN must
never silently become zero**; quick and full modes share the same rules and quick simply evaluates less;
public HTTP/HTTPS only, private/local/credentialed targets refused; rate, page, byte and time limits;
tenant isolation; no login bypass, no publishing, no modification of the submitted site.

---

## 12 · OPEN — OWNER DECISIONS

1. **Adopt v4?** — needs the census of its new rules against frozen acceptance first, and needs the
   document itself committed to `_handoffs`.
2. **§22 Instant Website Visibility Score** — parked pending a separate adoption naming its feature row.
3. **`config/discovery/axis-candidates.mjs`** client hosts — parked twice; the sharpest neutrality item.
4. **Row 6** needs a **declared country reference from a named source** — and even then closes only if
   the parent-level constancy is broken, which the measurement says it is not.

## 13 · PARKED / CARRIED

- The crawl batch manifest still carries no `sourceFile` / `sourceRepository`.
- The 28 BOUND sitemap URLs read CLEAN through detector D, **but that says nothing about `noindex` or
  `canonical`** — the capture stores neither per URL. This caveat travels with every CLEAN claim.
- `Claude outputs/` and `PHASE_0_ITEM_4_DECISION_BRIEF.md` are untracked owner documents in the engine
  root. Never add, edit, delete or stage them.

---

## 14 · WHAT THE NEXT SESSION DOES FIRST

> Resume from engine main `12956f2` and data main `e0b85f9`, or their verified descendants if
> housekeeping commits change only `_handoffs`.
>
> **Do not reopen PRs #6, #134 or #135. Do not repeat the main-green repair. Do not retry the PNMC
> parent/child hierarchy as a Row 6 closure route. Row 6 remains a proved halt.**
>
> The next working session must select **one complete feature with a real, non-empty population** and
> issue **one complete command** for that feature: dependency fixes, implementation, tests, PR, merge,
> CI and truthful ledger movement must remain **inside that one command** unless an owner-only decision
> is genuinely unavoidable.

**The selection question is not "which row is executable?"** It is:
**"which legitimate in-scope feature has the strongest evidence-backed path to VERIFIED-PASS without
manufacturing evidence or violating a frozen dependency?"** An executable feature that predictably stays
FAILED is not automatically preferred.

**Before committing to a row, check its population is non-empty.** This session halted on Row 25 because
the page it needed does not exist, and on Row 6 four times. **Cheapest blocking gates first** — a halt
should cost ten minutes, not two hours.

---

## 15 · THE HONEST HEADLINE

A twelve-hour night that moved the board by **zero rows**. Seven PRs merged, two repositories corrected,
three pre-existing defects fixed, one new law shipped — and 26/38 at both ends.

The most valuable thing found was a **crash in the real reporting binary**, which appeared only because
the owner's own verification was lawful and correct, and which a re-pinned assertion would have buried.

> **A truthful FAILED is worth more than a false PASS.
> A proved halt is worth more than a tick bought with inference.**

---

*End of beta-g handoff. Nothing in this document is a ruling. Nothing in it is a tick.*
