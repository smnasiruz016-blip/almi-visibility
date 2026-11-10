# AlmiVisibility — SESSION HANDOFF

**Date:** 20 September 2026 (the long session, ~23 hours)
**Author:** beta-g, for the next session
**Supersedes:** `AlmiVisibility_SESSION_HANDOFF_2026-09-19.md`
**Status:** STANDING until superseded

---

## 0 · HOW TO READ THIS

**Working model.** beta-g researches, measures, verifies and authors CC commands.
CC implements on Windows at `C:\Projects\`. The owner — S.M. Nasir Uz Zaman —
rules and merges. beta-g has no repository access and never runs git.

**The rule that matters most:** *A RULING IS NOT A TICK. EVIDENCE IS THE TICK.*

**The owner's standing direction on scope, stated 19 September and load-bearing:**

> *"AlmiVisibility is a standalone product to do all kinds of SEO for all kinds of
> AlmiWorld and outside clients' products, so if there is any data of any other
> product in AlmiVisibility it will be wrong."*

AlmiOET is a **subject**, not the owner of the engine. Never answer a question
about the engine from a subject's content. That mistake is beta-g error #22.

---

## 1 · STATE AT HANDOFF

| | |
|---|---|
| Engine `main` | `ff55f4a` — clean |
| Data `main` | `25fc564` |
| AlmiOET / AlmiItalian | untouched, 0 modified |
| **BOARD** | **25 / 38** |
| Seven-state split | `2 / 5 / 1 / 25 / 3 / 2 / 23 = 61` |
| Full suite | **1500 / 1500**, 0 failures |
| Denominator | 38, unchanged |
| Item 52 | seal **SPENT** |

Vocabulary: `NOT-STARTED · BUILT-NOT-PROVED · TESTABLE-NOW · VERIFIED-PASS ·
FAILED · BLOCKED-UNKNOWN · DEFERRED`. Still no machine-readable field for a
blocker's KIND.

---

## 2 · BOARD MOVEMENT

Opened at **23 / 38**. Closed at **25 / 38**. Two rows ticked, one row failed
truthfully, and a large amount of capability was built that the board does not
count.

| row | from | to | how |
|---|---|---|---|
| 9 | BLOCKED-UNKNOWN | VERIFIED-PASS | evidence, `changeKind: "work"` |
| 17 | BUILT-NOT-PROVED | VERIFIED-PASS | evidence, via TESTABLE-NOW |
| 52 | BLOCKED-UNKNOWN | **FAILED** | the sealed exam, sat once |

---

## 3 · WHAT SHIPPED — TEN MERGES

```
ENGINE
  PR #120 → b99dffb   Row 9 · justified-unavailable dimension, ⚠ machine-readable
  PR #121 → 7d2a2cb   Row 9 correction · reSatOn REMOVED, not repaired
  PR #122 → f4232d6   Row 17 · registry holds a second record kind
  PR #123 → e5f58f6   six generic comparators A–F
  PR #124 → 3b5f7af   Row 52 sealed run + truthful FAILED evidence
  PR #125 → 3a26e86   Subject Binding Contract V1
  PR #126 → 5cab320   real external subject adapter (47 fact records)
  PR #127 → b4525aa   crawl store externalised out of the engine
  PR #128 → ff55f4a   observed page subject adapter (389 real pages)

DATA
  PR #1  → 89818f6   the first derived fact record
  PR #2  → 25fc564   999 records · 394 bodies · 19,730 edges

GOVERNANCE
  Amendment 2 → ccaf9c8   three-state exam scoring; UNKNOWN settled

SUITE   1349 → 1500, zero failures at every merge
```

---

## 4 · ROW REGISTER

### Row 9 — VERIFIED-PASS, FROZEN

Six of seven dimensions INGESTED; the seventh carried as **⚠ with its unlock
condition machine-readable**. Closed on that day's measurement: four unlock
predicates FALSE, 36 product repos, 0 analytics package, producer ABSENT.

Then an owner post-merge correction: `row9Terminal()` had allowed a later
`reSatOn` **date alone** to restore terminal status. **Fixed by REMOVING
`reSatOn` entirely** — there is now no date input to misuse. A fourth state was
discovered unasked: `NOT_TERMINAL_MARK_CLAIMED_ON_AN_INGESTED_DIMENSION`.

`UNSUPPLIABLE_MEASUREMENT` is a **dated snapshot, not a live detector**;
`MEASUREMENT_PRODUCER = null` is exported and a test fails on any claim otherwise.

### Row 17 — VERIFIED-PASS, FROZEN

The engine can now hold a fact it computed, not only one it copied: formula and
both input ids stored, value recomputable, never more verified than its weakest
input, dependents marked for review when an input changes.

The real record: `pk-pnmc.verification-fee-foreign-to-domestic-ratio`, ratio of
10,000 PKR to 1,000 PKR = 10, `UNKNOWN` (its weakest input's state). Its need was
declared nine days earlier, in `pk-pnmc.mjs:13` — provenance proved, which is what
keeps it outside the ANTI-CIRCLE LAW.

**First attempt was reverted**: one lawful record broke **21 tests across 9
files**, six rows' frozen evidence. Classification on the second attempt:
**B 15 · A 4 · C 2 · D 0** — the majority was production code that could not
process a second kind, not brittle counts.

### Row 52 — FAILED. The seal is spent.

**Score: 1/6 RED detected · 0/3 controls unflagged · 0 false positives → FAIL.**

- 6,640 findings fired, almost all on file-path subjects nobody scores.
- All three controls came back UNEVALUATED — every comparator NOT_APPLICABLE.
- Zero false positives: not one finding landed on a control.

**The diagnosis is binding, not detection.** The nine captured pages and the five
pinned trees share almost no exported-identifier or derived-route edge, so
findings and scored subjects were largely **disjoint populations**. The engine
was not short of sensitivity; it was short of a way to know which subject it was
talking about.

The implementation stayed **byte-identical** after the seal — 17 of 17 files
verified against the frozen blobs. Nothing was repaired after seeing the result.

**Row 10** did not move: sitemap comparator 0 FINDING / 0 CLEAN / 6 UNKNOWN;
declared-vs-served 0 / 0 / 1. Not one class was independently detected.

### Rows untouched

1, 4, 5, 25, 50, 54, 58 — unchanged. Row 5 stays FAILED with three named
blockers; Row 25 stays TESTABLE-NOW with 0 of 495 pages qualifying under its
declared selection rule; Row 1 stays BLOCKED-UNKNOWN, blocker kind PROVED.

---

## 5 · THE CAPABILITY NOW BUILT

None of this shows on the board. All of it is merged and tested.

**Six generic comparators A–F** — claim↔producer · claim↔registry ·
declared↔served · sitemap↔observed · rendered count↔data · source link↔rendered
link. Each returns FINDING / CLEAN / UNKNOWN with a reason code, never null.

**Automatic discovery** — `src/discover/{corpus,candidates,bundle}.mjs`. A
binding is an edge someone else wrote: an exported identifier the page's own
module names; a citation the document itself carries; exactly one exported
collection named in the module; a route from published framework conventions.

**Subject Binding Contract V1** — `src/detect/{subject,binding}.mjs`, wrapped at
the single shared integration point `runDetectors`, so no detector can bypass it.
Four states: BOUND / AMBIGUOUS / UNBOUND / INVALID. **FINDING requires BOUND.
CLEAN requires BOUND and actual evaluation. A file path alone cannot become a
page-level finding.** `subjectRef` throws on SIMILAR_TEXT, SAME_NUMBER,
FILENAME_RESEMBLANCE, DIRECTORY_PROXIMITY, ARRAY_POSITION, FIRST_MATCH.

**External subject adapter** — reads `almi-visibility-data` read-only; 47 fact
records bind through `CLAIM_SUPPORTED_BY_FACT` edges the material already carries.

**Observed page subject adapter** — 495 real pages from the external observation
batch. **389 BOUND · 106 UNBOUND · 0 AMBIGUOUS · 0 INVALID = 495, remainder 0.**
The 106 are bodiless because `robots.txt` disallowed them and they were never
fetched — a property of the capture, not a fault, and all 106 stay visible with
reason `NO_BODY`.

**The crawl store is out of the engine** — 999 records, 394 bodies, 19,730 edges
now live in `almi-visibility-data/observations/crawl-2026-09-12/`, marked
`classificationState: "UNASSIGNED"`. Eleven callers that globbed the old
directory now fail closed, proved both ways.

---

## 6 · THREE DEFINITIONS SETTLED FROM FROZEN TEXT

Each was a gap that would have decided a result if chosen after seeing one.

**1 · UNKNOWN in the exam (Amendment 2, owner ruling).** The frozen contract
scored only "found" and "flagged"; `UNKNOWN` appeared once in 375 lines and was
not a scoring rule. The contract proves it knows how to express a third verdict —
it writes *"not scored either way"* for thin/duplicate — so its silence was an
**omission, not an implied rule**. Owner ruling: UNKNOWN on a RED is not
detected → FAIL; UNKNOWN on a control is FAIL, **recorded as UNEVALUATED, not as
a false positive**; an absent detector, crash or no output never earns
"unflagged". *(beta-g had recommended the weaker reading on the control limb and
was wrong: it would have permitted a vacuous pass.)*

**2 · NOT_APPLICABLE.** Derived from the contract's own words —
*"A control is therefore clean AT THE PAGE LEVEL"* — so a control is scored per
page, not per comparator. `NO_CANDIDATE_OF_THIS_KIND` is distinguishable from
every UNKNOWN reason code. Without this, all three controls would have failed on
a labelling choice.

**3 · The tenant of an UNASSIGNED observed page.** It is the **batch itself** —
`observation-batch:crawl-2026-09-12`, from the manifest's `batchId`. Basis:
`subject.mjs:86` (*"an absent tenant never means 'the usual one'"*),
`binding.mjs:16-18`, `subject.mjs:54` (identity is *"a stable identifier something
else already assigned"*), and data commit `24e2bc8` (*"No product owns these
records here."*). **A tenant is an isolation scope, not an owner.** Nothing was
derived from a hostname. Self-enforcing: any edge from these pages to a product's
subject is `INVALID_CROSS_TENANT`.

---

## 7 · BETA-G ERRORS ADDED TODAY

| # | mechanism | what happened |
|---|---|---|
| **#22** | A — inherited authority | Reasoned about Row 17 in Row 25's world (pages and claims) and recommended an outcome **without ever having read Row 17's own frozen text**. Recommendation withdrawn. Rooted in treating AlmiVisibility as AlmiOET's engine rather than a standalone product. |
| **#23** | C — two-state instrument | Wrote the HALT clause *"if any row other than 17 changes state"*. No row's **state** changed while **six rows' frozen evidence** stopped passing. Read literally it would have ticked Row 17 on a board that had quietly gone false. CC read the intent, not the letter. |
| **#24** | rehearsal shape | Specified the pre-seal dry run as machinery only — same entry points, same scorer — but **not the same structural shape as the sealed input**. The synthetic products kept a page and its source in one tree; the real corpus does not. The rehearsal scored 6/6 and the exam scored 1/6. The shape was available from metadata without opening the seal. |
| **#25** | wrong arithmetic relayed | Wrote *"at least 101 pages have no body"* (495 − 394), subtracting across two different populations. The real figure is **106**, because 5 pages hold two bodies each. |

Also relayed a wrong number twice — "27 failures" (actually **21**; the earlier
count included node's trailing summary block) and "nine demoted records". Both
were caught only because the commands ordered them re-measured.

### STANDING CORRECTION — four clauses, law for beta-g

1. Read that row's own frozen text and quote it.
2. Check whether a later owner ruling changed the boundary that row sits in.
3. Measure that a law applies to THIS object before writing it.
4. **A rehearsal on material easier than the real thing predicts nothing.**
   Match the structural shape, not only the machinery.

---

## 8 · THE GOVERNING DEFECT PATTERN — NOW 19 REACHED INSTANCES

A two-state check that cannot tell two different worlds apart.
**THE FIX IS ALWAYS A THIRD STATE, AND THE THIRD STATE MUST FAIL.**

New today:

- **17** — beta-g's §8 HALT clause: *state* changed vs *evidence* stopped passing.
  The first instance that would have produced a **false PASS**.
- **18** — a scoped zero: the census searched for `*.headers.json`, the shape the
  case-study corpus uses, while the real crawl store is JSONL plus a brotli
  archive. It matched nothing and reported **"0"**. Taken at face value it would
  have produced a false "no real population exists" halt.
- **19** — the caller census: a literal-substring search missed 5 files using
  `${REPO}runs/crawl` and 3 using `join(REPO,"runs","crawl",…)`. 28 readers
  reported where 33 exist.

**The shape these three share, and it is now the common one:** *the search was
narrower than the thing being searched for.* Same as beta-g #15 (bounded by
location, not subject) and #21 (bounded by the query corpus, not the declared
vocabulary).

Caught before reaching a report or merge, and therefore **not counted**: a
generic-word matcher returning 27/27; an inconsistent clause definition returning
0 near-misses where 18 existed; two sensitive-data scanners that returned 0 on
**planted** material (missing `/i`); a proof harness passing `subject` where
`bindSubject` takes `tenantId`, making everything INVALID for the wrong reason;
and `toBundle` handing all **106 bodiless pages back BOUND** via the runner's
`BELONGS_TO_TENANT` fallback — caught only by the bucket arithmetic requiring
389 + 106 + 0 + 0 = 495 with no remainder.

### Rules earned today

- State the **scored population size** next to every zero. A zero from an empty,
  unresolved or wrongly-scoped query is invalid.
- Prefer **removing** a misusable input over repairing it.
- No absent parameter may carry a permissive default.
- A sabotage whose **bytes changed but whose defect did not form** is not a proof.
- **A guard no input can reach is a comment**, not a guard — drive it directly.
- **Buckets must sum to the population with no remainder.** A row that silently
  disappears is the false green.
- When an assertion is changed: name what the old one caught, prove the new one
  still catches it, and name anything lost.

---

## 9 · OPEN OWNER DECISIONS

1. 🔴 **Engine history still holds the three crawl blobs.** Measured with
   `git cat-file -e`, not assumed. They are out of the working tree and every
   future checkout; **not out of the repository**. For a product meant to hold
   outside clients' material this is a real choice. No history was rewritten.
2. **RR-77** — did the owner issue the `ARTEFACT_PERSISTENCE` ruling? 16 citations
   across 6 files in `_handoffs`, 0 in engine or data. Nothing may cite it until
   answered.
3. **Row 5's gap-vs-leakage question** — `lexiconWordsAbsentFrom` knows two states
   where three exist. Note this ruling **alone will not close Row 5**:
   `bilingual-licenciatura` is a threshold effect untouched by any vocabulary
   decision.
4. **Row 4** — how a conjunctive FAILURE clause may be lawfully halved.
5. **Row 50** — nine VERIFIED labels resting on an unsettled reading.
6. **Row 58** — requires the owner's own signature; 0 items ticked.
7. **Row 46** — needs only the date 2026-12-11. **Row 6** — no authorised ⏭.
8. **Case Study #1 is spent.** Whether a second case study exists, and on what
   terms, is the owner's to decide. Nothing in this session assumes one.

---

## 10 · PARKED

- The A–F run over the 389 bound pages yields **495 NOT_APPLICABLE per
  comparator**: the bundle carries page subjects but no claims, producers or
  sitemap. The pages are in; there is nothing yet to compare them against.
- `runs/audit`, `runs/discovery` and `runs/evidence` hold real page URLs in
  committed derived artifacts, outside the raw-artifact guard's scope,
  pre-existing.
- The data repo has **no CI**; branch protection is unavailable on the plan
  (HTTP 403). Its only validation is the engine suite reading it. Deliveries
  there use the no-required-checks rule (RR-76's reasoning).
- The data repo's README does not mention the `observations/` tree or the
  UNASSIGNED law; that law lives only in the manifest fields and commit `24e2bc8`.
- The CI deploy key is removable by de-authorising the GitHub CLI token — the
  checkout then goes **red**, never silently dataless.
- The legacy `synthetic-bundle.mjs` fixture carries no `pageSubjects`, so under
  V1 the non-discovery CLI path yields only UNKNOWNs. Correct fail-closed, but it
  no longer demonstrates a passing run.
- `runs/crawl/corpus` — 394 files — untracked, gitignored, untouched.
- Two untracked files out of scope: `Claude outputs/`,
  `PHASE_0_ITEM_4_DECISION_BRIEF.md`.
- The `.test-scratch` symlink race: did not reproduce today.
- The missing blocker-KIND field; P1, P2, P3; D-VERDICT-1, D-SCRATCH-1,
  D-ADJUDICATION-1.

---

## 11 · WHAT THE NEXT SESSION SHOULD KNOW

**The board says 25/38. That understates the day and overstates the product.**

Understates: six comparators, automatic discovery, a binding contract enforced at
a single un-bypassable point, two real-subject adapters, and the engine cleaned of
client material — none of which the board counts.

Overstates: the one time this pipeline met real material under exam conditions,
it scored 1 of 6. The bindings it can now make are the easy ones — exact stored
identifier chains, where the page names the id and the id keys the archive. The
bindings the sealed run actually failed on — **sitemap-to-served and
claim-to-producer** — remain unbuilt.

**Do not start by writing a document.** The owner stopped governance work on
19 September and the rule held all day: *"kaam ko feature building per rehnay do."*

Every command this session that produced something took the same shape: measure
first with denominators, branch three ways, halt honestly, prove each guard goes
RED, and never let a zero stand without its population.

---

*End of handoff. Board 25 / 38. Engine `ff55f4a`. Data `25fc564`.*
