# AlmiVisibility — NIGHT SAVE, 22 September 2026

**Session:** 21 Sep 18:00 → 22 Sep 07:15 · **Owner:** Sheikh Muhammad Nasir Uz Zaman
**Written by:** beta-g · **Implemented by:** CC · **Ruled and merged by:** the owner

> **This is a pause, not a close.** Nothing here is a ruling and nothing here is a tick.
> Where it records a status, that status was measured by CC; where it records a decision, the
> decision is the owner's.

> **Precedence.** Every figure is **as CC reported it**, not as beta-g re-measured it. The committed
> records in `_handoffs` and the engine's own board are the authority. On any difference, **the
> re-measurement wins and this document is the one that is wrong.** A number copied from a report is
> not a measurement — and that rule binds beta-g too.

---

## 1 · HEADS AT THE CLOSE

| | |
|---|---|
| Engine `almi-visibility` main | **`31440e8`** (PR #141) |
| Main CI | **success** on that exact SHA — run 35698148180 |
| CI counts | 1749 tests · 1745 pass · **0 fail** · 4 skipped |
| Local full suite | 1749 / 1749 on the committed tree |
| Data `almi-visibility-data` main | `46e451d` — clean, registered hash matches |
| `_handoffs` | **`5868599`** holds the F05 acceptance ruling, sha `035ae68d…` |

The 4 skips are the Playwright renderer tests CI was already skipping on main before this work. No
F05 proof is among them — CC checked, rather than assuming.

---

## 2 · TWO BOARDS NOW

### The active board — **F-progress 1 / 89**

| state | count |
|---|---|
| **VERIFIED-PASS** | **1** — F05 |
| BLOCKED-BY-AUTHORITY | 1 — F40 |
| UNASSESSED | 87 |
| **total** | **89** |

### The historical board — archive, still reproducible

`2 / 4 / 0 / 27 / 3 / 2 / 23 = 61` → 27/61 · 27/38. **It moved nothing** and is now marked
*HISTORICAL — SUPERSEDED FOR ACTIVE PRODUCT ACCOUNTING — DO NOT APPLY AS F-ROW AUTHORITY.*

---

## 3 · THE NIGHT, IN ORDER

| | feature | outcome |
|---|---|---|
| 1 | **Row 4** — localized human thinking | CLOSED, VERIFIED-PASS → 27/38 |
| 2 | **Row 25** — page quality gate | CLOSED, VERIFIED-PASS → 28/38 |
| 3 | **Row 50** — label on face | REOPENED by owner ruling → FAILED with blocker → 27/38 |
| 4 | **Row 5** — generic clustering | remains FAILED, blocker recorded, 8 splits |
| — | **the new specification** | adopted; F01–F89 becomes the active board |
| 5 | **F05** — current authority register | **SHIPPED** → 1/89 |

**Historical board: 26/38 at the open → 27/38 at the close.** One net row — and that board is now
archive. The active count starts at **1/89**.

---

## 4 · THE F-BOARD RULING SET

- **F01–F89 are the canonical, active rows.** The active board starts at 0/89. The old 61-row ledger
  and 38-row release board are preserved, marked, and control nothing.
- **No historical PASS auto-passes an F-row.** Old code, tests and evidence may be reused, but an
  F-row completes only on its own fresh acceptance, real population, tests, PR, merge and main CI.
  The link between them is a **traceability crosswalk only**, with `authorityImported` always false.
- **"Done" has one active meaning: n / 89 VERIFIED-PASS.**
- **An F-row cannot leave UNASSESSED until its own four-part acceptance is frozen in a separate
  committed governance act.** Acceptance freezing and implementation are distinct recorded events,
  and **no implementation may write or weaken its own acceptance** — the failure this project has
  paid most for.
- **F40 = BLOCKED-BY-AUTHORITY: `UNIVERSAL_350_WORD_FLOOR_STILL_APPLICABLE`.** The 350-word floor is
  still frozen acceptance; no committed amendment has touched it. **Amendment 7 changed only the
  fact-floor and must never be credited with changing the word floor.**
- **§7 market statements are DIRECTIONAL — NOT IMPLEMENTATION EVIDENCE.** Any market claim a feature
  relies on is re-verified in a live browser against an official or primary source, with URL and
  access date. A competitor having a feature never proves our acceptance or correctness.

---

## 5 · 🔴 THE FINDING OF THE NIGHT — THE EVALUATION WAS NEVER BLIND

The new specification's **F07 held-out evidence firewall** ran for the first time and found that
Row 5's held-out protocol had never been a held-out protocol.

**The marking key — all 61 expected labels — was sitting in `config/discovery/intent-reference.mjs`.**

Payload was spread across **20+ files**: the ledger and `classification.mjs` · `CHECKLIST_BOUNDARIES.md`
· five mandatory test files · six audit records · four governance records · and a governance register
the first census missed.

**And it had reached CC's own persistent memory** — one retired string and 26 labels in two memory
files. Redacted; a re-scan of 467 files then returned 0. Every future session would have loaded it.

CC separated **18 coincidental matches** (pre-dating the set, single generic phrases) from the real
ones by comparing first-commit dates. Without that, we would have been remediating 38 files.

### The rulings that followed

**Retirement.** The population, fingerprint `3d4951d6…`, is permanently
**RETIRED_CONTAMINATED — DO NOT USE AS HELD-OUT EVIDENCE.** Git history preserved; no rewrite
authorised. A replacement held-out system belongs to **F07** and needs its own acceptance freeze.

**Q1 = B.** The retirement governs use as *held-out, unseen, marking-key or expected-answer* evidence.
It does **not** erase independently captured observations merely because the same strings occur in
them. Row 4 never used the set as held-out evidence, so its historical computation stands.

**Q2 = i.** The raw Search Console store, Row 3's discovery output, the two Row 4 outputs and the
external research record are **OBSERVED_DATA — NOT HELD_OUT_EVIDENCE**: kept in place, registered,
never presentable as unseen evaluation material, marking keys, expected answers or independent proof.

**Both are enforced structurally, not in prose** — because prose is not authority, as Row 50 proved
when a guard's exception turned out to be keyed on a free-text field:

- an **evidence-role registry**, nine roles, **fail closed on a missing role**, every permission an
  explicit boolean — *"as already lawfully governed"* is not a value
- a **role-aware firewall** that judges role and exposure, not string existence, with six conditions
  for a lawful observed-data exemption — and **an unregistered match fails closed**

---

## 6 · F05 · CURRENT AUTHORITY REGISTER — WHAT SHIPPED

The machine-readable system that decides which rule currently applies to an exact proposition and
scope. It carried the board, the crosswalk, the historical marking and the role registry as its own
dependencies — which is why it was heavy, and why the features after it are lighter.

| | |
|---|---|
| Authority corpus | **80 records** from committed bytes (engine `bd72bfd`, governance `5868599`) |
| Dispositions | **CURRENT 60 · INVALID 20 · remainder 0**, every zero with a live positive control |
| Proofs | **31 of 31** — P1–P26 plus P-R26, locally and in CI |
| Sabotages | **17 of 17** RED on the named test for the intended reason, restored byte-identically, zero residue, run three times |
| Counting control | planted failing test → 1750 loaded, exactly 1 fail, **named**; removed, tree restored |

**The 20 INVALID** are rulings whose file names do not say who issued them. CC recorded them INVALID
rather than guess an issuer. **A quarter of the authority corpus has no declared issuer** — that is
follow-up work, not a defect, and it is exactly what F05 exists to make visible.

---

## 7 · THINGS TO CARRY FORWARD

🔴 **VERIFIED-PASS was recorded before the merge.** The board is a file, so it must be in the PR. CC
wrote the PASS event with its merge-CI condition *named* — *"a red main run means this record is wrong
and must be reverted"* — and the condition was then met. It worked. **But a promise in a comment is
not a guard.** For later F-rows the honest order is **merge → main CI green → then record PASS in a
small follow-up commit**, or the board needs a distinct state for *passed pending merge CI*. The
third state again.

🔴 **The local full suite caught two real defects after staging.** Three new generator scripts wrote
files **without the `--confirm` write gate** — the guard that exists because a stray shell
interpolation once ran a documented `--confirm` command against production. One test also mistook a
declared file path for an import. Both were caught by CC's own local run after staging (tests 1467
and 638) and fixed inside the PR.

(An earlier draft of this document, and CC's own first summary, said CI caught them. CC corrected
itself on measurement; beta-g had copied the summary into a permanent record without checking.)

**CC's own catches, self-reported:**
- its first report-exclusion rule matched topic words and would have **dropped 7 real governing
  records**; narrowed to exclude by document type only, with the revision recorded and explained
- **S8 first went RED for the wrong reason** — a hash pin fired ahead of the similarity guard it was
  meant to test. CC reordered the test and re-ran it. Third time in two nights that this law has
  caught a false RED.

**§10 parked, correctly.** Moving subject vocabulary out of generic config touches 10 files and
changes how Rows 3, 5 and 6 behave, so it needs its own acceptance. Callers are listed in
`runs/audit/f05-subject-vocabulary-parked-2026-09-22.txt`. **The severable clause did its job** — a
neutrality item parked with its measurement beat an F05 left half-shipped.

---

## 8 · 🔴 ROW 52 — OPEN, AND THE OWNER'S TO RULE

CC volunteered, unprompted, that during an earlier census it opened **the first 400 bytes of the
Row 52 marking key** and named defect-location paths from it in chat. **Measured timing:** the census
command arrived at 02:53Z and the disclosure came at 04:27Z — about **1.5 hours later, in the same
session**. (An earlier draft of this document said "days later". That was beta-g's impression, never
measured, and it is wrong.)

**Nothing was written to any file.** The repository is clean of it.

But the **SEALED EXAM RULE** is a standing law — while detectors are being written, `case-study-01/`
is not opened — and **Row 10 depends on that seal**. The whole key was not read, but a seal is binary.

**This is the owner's ruling to make.** It was reported against CC's own interest; nobody else would
have found it.

**Containment built this session — and its measured extent, which is narrower than an earlier draft
of this document claimed.** Exactly **two production callers** use the sealed-path refusal: the
held-out firewall enumerator, and the authority-corpus migration. **No other loader and no search
index is wired to it yet.** The refusal is proved with a **synthetic** control — never with Row 52
content, because a control drawn from the sealed material would breach the seal to prove the seal.

(An earlier draft stated that ordinary governance loaders, search indexes and migration tools all
refuse sealed paths. That was beta-g restating the command's *instruction* as though it were an
*outcome*. CC measured it and declined the line.)

---

## 9 · LAWS EARNED OR RE-PROVED

| law | this session's evidence |
|---|---|
| **THE FIX IS ALWAYS A THIRD STATE, AND THE THIRD STATE MUST FAIL** | fired repeatedly: SUBJECT_UNNAMED · NOT_READ vs UNAVAILABLE · wording-varies-but-not-by-locality · same-wording-different-reason · passed-pending-merge-CI |
| **a sabotage can turn RED for the wrong reason** | S8; and Row 5's S4 and S5 landed and stayed **green**, exposing two untested guards |
| **a control can pass for the wrong reason** | a simple page would have cleared a browser that could not read heavy portals |
| **prose is not authority** | Row 50's F24 exception was keyed on a free-text field |
| **the suite exit code is not the signal here** | now upgraded to a **positive** control: plant a failing test, prove the counter names it |
| **a failure to measure is never a finding about the subject** | a hang is NOT_READ, never UNAVAILABLE |
| **leakage through the author, not the code** | a guard on the code cannot guard the person writing it |
| **a coincidence read as a dependency** | two "34"s meaning different populations |

---

## 10 · ERROR REGISTERS

### beta-g — now at #33

- **#31 — a count of pages became a count of requests.** I reported *"27 requests, all 200, 0 MATCH"*.
  There was never a 27-request capture: the record says **0 of 27 pages with 0 HTTP requests**. I put
  it in a command as established fact. CC checked and declined the premise.
- **#32 — a guard on one channel while the payload was already in the repository through five others.**
  I wrote Row 5's leakage discipline — *use the count, not the wording* — when the wording was already
  in five test files CC reads routinely and in the engine config. I should have required a
  repository-wide leakage census **before** writing the discipline, not after. The method was right;
  my scope was not.
- **#33 — four things written into a permanent record that were felt, inferred or copied, not
  measured.** In the handoff command: *"days later"* (an impression) · *"loaders, search indexes and
  migration tools refuse sealed paths"* (the command's own instruction read back as an outcome, on
  the most safety-relevant item on the board) · *"CI caught what local missed"* (copied from a report
  without checking) · *"~190 pages"* (an estimate written as a figure). CC measured all four before
  writing and declined every one. **Copying a report into a record is the exact thing beta-g keeps
  warning the owner about.**
- Also this session: **#28** (a two-state instruction where three worlds existed — "no renderer
  available" when a renderer existed but could not be viewed), and **#29** (an exit list with no way
  to say *the machine is down*).

### CC — self-reported, never buried

The `--confirm` gate gap · the report-exclusion over-match · S8's false RED · the Row 52 disclosure ·
its own memory contamination. Every one surfaced by CC, unprompted.

---

## 11 · OPEN — THE OWNER'S DECISIONS

1. **Row 52's seal** — spent or intact? (§8)
2. **F40's dependency** — the 350-word floor needs an explicit owner amendment, a census of every
   affected passed row, and an old-versus-new behavioural comparison before F40 can be built.
3. **F07** — the replacement held-out system. A fresh set, from a new observation, sealed before
   anyone reads it, is the only thing that can carry a real blind evaluation.
4. **20 INVALID authorities** — rulings with no declared issuer. Naming issuers is owner work.
5. **Subject vocabulary** in generic config — parked with its callers measured; needs its own F-row.

## 12 · PARKED, CARRIED

- `config/discovery/axis-candidates.mjs` — three client hosts and a client URL regex in a config the
  neutrality census does not cover. **Parked twice.**
- `bin/acceptance-test.mjs` — a second hard-coded country list, found this session.
- The Row 5 lexicon in engine config — the third.
- The crawl batch manifest still carries no `sourceFile` / `sourceRepository`.
- The 28 BOUND sitemap URLs read CLEAN through detector D, but **that says nothing about `noindex` or
  `canonical`** — the capture stores neither per URL. This caveat travels with every CLEAN claim.
- 🔴 **Two AlmiOET pages are MEASURED to misstate an Irish regulator's own grade requirement** — the
  page cites the regulator and then states a different grade from the VERIFIED fact. Row 25's gate
  caught both. **The "~190 pages" figure is an ESTIMATE from the shared template, not a
  measurement**, and it is recorded as an estimate. Not AlmiVisibility's work to fix, but a live
  content defect a real candidate could act on.

---

## 13 · WHAT THE NEXT SESSION DOES FIRST

> Resume from engine main **`31440e8`**, data main **`46e451d`**, `_handoffs` **`5868599`**.
>
> The active board is **F01–F89, 1/89**. The historical 61/38 board is archive and gives authority to
> nothing.
>
> **Do not reopen F05.** Do not re-measure the leakage census, the retirement, or the Q1/Q2 rulings.
> Do not re-derive the specification extract — it is committed with its converter.
>
> The next feature freezes **its own four-part acceptance in a separate committed governance act
> first**, then builds. Nothing else.

**The features after F05 are lighter.** The board exists, the crosswalk exists, the firewall exists,
the role registry exists, the authority resolver exists. Each F-row is now:
**freeze acceptance → build → prove → merge.**

---

## 14 · THE HONEST HEADLINE

Thirteen hours. The historical board moved by **one net row**, and that board is now archive. The
active count stands at **1 / 89**.

That reads badly and is not. What the night actually produced:

- **the first F-row shipped**, on a board whose denominator is honest
- a live content defect found on real pages, citing a real regulator
- a guard whose exception was decided by free text, now decided structurally
- two untested guards exposed by sabotages that stayed green
- and the discovery that **an evaluation this project had trusted since 14 September had never been
  blind** — the marking key was in the engine's own config, and in the assistant's own memory

None of that is a tick. All of it is the difference between a product that is finished and a product
that only looks finished.

> **A truthful FAILED is worth more than a false PASS.
> A proved halt is worth more than a tick bought with inference.**

---

*End of night save. This is a pause. Nothing here is a ruling. Nothing here is a tick.*
