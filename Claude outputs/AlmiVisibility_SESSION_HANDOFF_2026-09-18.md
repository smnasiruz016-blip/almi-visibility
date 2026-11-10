# AlmiVisibility — DETAILED SESSION HANDOFF

**Date:** 2026-09-18 (work ran ~03:00–04:50 local, continuing a session that began the previous day)
**Owner:** S.M. Nasir Uz Zaman
**Implementer:** CC — Claude Code, Windows, `C:\Projects\`
**Research / measurement / verification / command authorship:** beta-g
**Status of this document:** evidence record and working state. **It is not a ruling.** A ruling is not a tick. Evidence is the tick.

---

## 0 · HOW TO USE THIS DOCUMENT

Read §1 for where things stand, then **§13 and §14** — the owner's Complete Product Revisit, which sets the next session's order and supersedes anything earlier in this file about what to do first. §6 holds Row 1 in full, for when Row 1 reaches the closure queue.

Everything here is marked by kind. **OBSERVED** = measured on a tree, with an anchor. **OWNER RULING** = the owner said it. **INFERRED** = someone reasoned to it and it has not been measured. **UNKNOWN** = not measured. Those four are kept apart deliberately, because collapsing them is how this project has failed before.

Nothing in this file is authority. Where it quotes frozen text, **re-read that text on the tree before relying on it.** If the tree differs by one word, the tree wins and this file is stale.

---

## 1 · STATE AT A GLANCE

```
FAILED 2 · BUILT-NOT-PROVED 6 · TESTABLE-NOW 1 · VERIFIED-PASS 23
NOT-STARTED 2 · BLOCKED-UNKNOWN 4 · DEFERRED 23        = 61
```

**Progress against the real denominator: 23 / 38.**

| | |
|---|---|
| Engine repo | `C:\Projects\almi-visibility` at **`e15dcbd`**, working tree clean but for two pre-existing untracked entries |
| Main CI | run **35299004835** on `e15dcbd` — **success** |
| Handoffs repo | `C:\Projects\_handoffs`, `origin/main` at **`c9efc4b`** |
| Ledger movement this session | **one** — row 7 → VERIFIED-PASS, 22 → 23 |
| Engine lines shipped this session | **zero** after the row 7 tick |
| Data repo | untouched |

The 23 DEFERRED rows are outside frozen v0.1 by the Deferral Law (`PASS_BOUNDARIES_SOURCE.md:95-107`). They are neither ticks nor debts, and they are **not in the denominator**. 61 is the checklist; **38 is the product**.

**Frozen at their results, do not reopen without new authority:**

- **Row 5** — FAILED
- **Row 9** — BLOCKED-UNKNOWN (PROVED BLOCKER)
- **Row 1** — BLOCKED-UNKNOWN (PROVED BLOCKER); cost-population feasibility UNKNOWN pending U1. **Not the next thing worked** — see §13 / §14.
- **Row 54** — untouched throughout
- **Item 52** — SEALED. The seal opens once. NOT RUN = NOT TESTED.

---

## 2 · ROLES AND WORKING MODEL

**beta-g** researches, measures, verifies, and authors CC's commands. **beta-g runs no git operations** — that binds beta-g only, and the engine lives on the owner's machine.

**CC** implements. One command at a time. It runs git serially, one mutation per step, confirming no repository lock, never deleting or bypassing one.

**The owner rules and merges.** Row 58: *"🔴 Only the owner declares DONE. Not CC. Not Claude."*

Row 57's FAILURE clause is **"the auditor is the builder"** — which structurally excludes both CC and beta-g from auditing their own work. This is not a formality; it bit twice this session (§11).

**Communication:** Roman Urdu, "aap", never Urdu script, never mixed. Commands for CC in **ONE-CLICK COPY** format — a single fenced block.

---

## 3 · THE FROZEN OPERATING MODEL v1

Adopted after diagnosing that six PRs merged on 17 Sep without the ledger moving once.

```
ONE FEATURE AT A TIME.
ONE COMPLETE MASTER COMMAND.
BUILD → TEST → EVIDENCE → TICK OR PROVED BLOCKER.
```

### The standing laws

| law | meaning |
|---|---|
| **ONE PRODUCT LAW** | AlmiVisibility only. No first-product vocabulary in `src/` or `tools/`; the boundary census stays at 0 breaches. |
| **ANTI-CIRCLE LAW** | A thing built *for* a row cannot be read backwards to supply that row's evidence. |
| **LAW-ABSENT-1** | Absence of evidence is never a finding. It never defaults to safe, low, or broken. **Absence of measurement never becomes a proved blocker.** |
| **A RULING IS NOT A TICK. EVIDENCE IS THE TICK.** | A ruling reaches TESTABLE-NOW only, never PASS. (Amendment 2 rule 1; `src/checklist/classification.mjs:593`) |
| **DISCOVER ≠ INTERRUPT ≠ FIX ≠ PRIORITY** | **DEFAULT = PARK.** Discovery does not automatically become the next job. |
| **HISTORICAL RED ≠ CURRENT FAIL-CAPABILITY** | A recorded RED proof does not establish that an instrument still fires today. |
| **DETECTOR EXISTS+FIRES ≠ EXISTS+DOESN'T FIRE ≠ ABSENT** | An absent detector never silently PASSes. |
| **Count equality ≠ set equality** | Population equivalence must be proved before arithmetic. |
| **LATEST-RULING-WINS** | *Named this session, after a breach.* An explicit later owner ruling controls the exact issue it names. The earlier document's boundary on that same issue is **superseded and never authority again — even though it is still physically present in the file, unchanged and reading as law.** Before applying any boundary, ask which is the latest authority on that exact issue. |
| **DEFERRAL-ELIGIBLE ≠ LAWFULLY DEFERRED/APPLIED** | *New this session.* Eligibility under the Deferral Law does not apply a deferral. Per-limb ⏭ exists only through an owner split ruling naming both halves. |
| **DO NOT BUILD A KNOWN-INCAPABLE PARTIAL FIX** | *New this session.* A buildable gap is not an authorised build if another applicable frozen limb already makes closure impossible. |
| **BUILDABLE ≠ PROVABLE · MECHANISM EXISTS ≠ QUALIFYING POPULATION CAN OCCUR** | *New this session.* A working producer is not a qualifying population. |
| **PR GREEN FIRST. MERGE SECOND.** | `--watch` exit 0 ≠ PR GREEN. A later green main does not cure an early merge. The #117 ordering breach must not be repeated. |
| **Delivery** | One branch, one PR, one merge. Never bury a bad finding. Do not escalate or dramatise. |

### The seven-state ledger

`FAILED` · `BUILT-NOT-PROVED` · `TESTABLE-NOW` · `VERIFIED-PASS` · `NOT-STARTED` · `BLOCKED-UNKNOWN` · `DEFERRED`

**Row 58 has no word for PROVED BLOCKER.** Row 9 and Row 1 both sit in that gap. See §8 item 3 — and §13.2, where the owner's revisit reframes it as a symptom of equating a release milestone with full product DONE.

---

## 4 · THE GOVERNING DEFECT PATTERN — 12 instances

**A two-state check that cannot tell two different worlds apart.**

1. `gateOf`
2. `findCopiedFacts`
3. the 40-char window
4. the bare-number substring
5. the `PAGE_WRITE`-only census
6. exit code 2 read as refusal
7. the banner-only incident tests
8. **A49** — `--test-name-pattern "^(?!SYMLINK)"` excluded *nothing*; a damaged-permission run wrote a ledger through a junction. Fixed with `--test-skip-pattern` plus a pinned count, so the exclusion proves its own size.
9. the in-sample-only `clusteringErrors`
10. the `heldOutCheck` HIT / no-target collapse (**D-VERDICT-1**, still open)
11. the stale `axis-discovery` assertion
12. **beta-g's own one-line freeze-check grep** (this session) — a strict single-line match returned 0 for both *"not frozen"* and *"frozen but wrapped across two lines"*. Caught by CC. Fixed with a four-condition check whose mixed result is not a pass.

**THE FIX IS ALWAYS A THIRD STATE, AND THE THIRD STATE MUST FAIL.**

Instance 12 matters beyond itself: it is the first one authored *after* the law was written down, by the person writing it down. The pattern is not a property of old code.

---

## 5 · WHAT MOVED

### 5.1 Gap 2 — CLOSED at `ceee2a6`

**Result A:** the `.test-scratch` race is **outside** the frozen boundary — proved by **disjoint populations**, not by argument. The census enumerates `git ls-files src bin tools`; `.test-scratch` is git-ignored, so it is not in the census population and cannot be a census defect.

Two infrastructure defects were fixed on the way:

- **PR #116 (`98c4b15`)** — an undrained `process.exit(1)` truncating pipe-backed stdout. On POSIX pipes are async; on Windows they are sync. `bin/intent-clusters.mjs` exited before the pipe drained. Fixed via `exitAfterDrain`. **The latent defect predated #114; #114 only made it reachable.**
- **A49** — see pattern instance 8 above.

### 5.2 Row 7 — VERIFIED-PASS at `e15dcbd`

The session's only ledger movement, 22 → 23.

Reached by **two declared state moves**, not one silent edit. CC's first single-state edit was refused by the generator: *"A state never changes silently — declare the move, its kind, and what caused it."* CC complied rather than working around it.

**🔴 Provenance caveat, recorded so it is never lost:** the tick was gated by **beta-g's** §7A current-tree failure-proof replay. beta-g is not an independent auditor of row 7. Row 57's FAILURE clause is *"the auditor is the builder."* This tick is sound on its evidence but **not independently audited**, and the owner should know that when Row 58 is finally read.

---

## 6 · ROW 1 — THE FULL CHAIN

This is the longest thread of the session and the one the next session starts on.

### 6.1 The frozen text — and the framing error it corrected

`PASS_BOUNDARIES_SOURCE.md:193-197`. The file was committed once, `9b57f71`, 12 September 2026, and has not changed since.

> ### 1 · Product Intake & Isolation — **P**
> - **INPUT** two declared products, and an accessor from each reaching for the other's data, evidence, cost and learning records.
> - **EXPECTED** each of the four record classes is reachable only from its own product.
> - **FAILURE** any cross-product read succeeds, **or a class does not exist to be isolated**.
> - **EVIDENCE** adversarial accessor tests over **non-empty populations of all four classes**.

**Row 1 is not "per-product cost visibility."** Both the owner and beta-g had been calling it that. It is **Product Intake & Isolation** over **four** record classes — data, evidence, cost, learning. **Cost is one of four.** A cost fix alone could never have closed this row. CC caught the framing error while drafting and retitled the master command correctly.

**Governing law bearing on Row 1** — anchors to re-read, not summaries to trust:

- The Deferral Law — `PASS_BOUNDARIES_SOURCE.md:95-107`
- The DONE contract — `PASS_BOUNDARIES_SOURCE.md:518-524` (row 58)
- Owner Ruling 0, NO IMPLICIT MIXED STATUS — `OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md:23`
- Owner Ruling A, rows 1 / 4 / 54 — same file, `:34`, with cost's non-inheritance at `:44-45`
- The split as an act *"the owner has not taken here"* — same file, `:59-64`
- `assertLawful`'s refusal of DEFERRED on a row the frozen ruling classes other than D or S — `src/checklist/classification.mjs:1125`
- The row 1 / row 54 pin — `test/queue-rescan.test.mjs:141-147`

### 6.2 The master command — authored, frozen, executed

| step | artefact | commit |
|---|---|---|
| drafted by CC on the owner's authoring command | `_handoffs/AlmiVisibility_FEATURE_MASTER_COMMAND_ROW1_2026-09-18.md` | `2405032` |
| read independently by beta-g before the freeze | — | — |
| **frozen by the owner** (line 4 only; line 3 provenance deliberately kept) | same file | `cd61022` |
| executed | `_handoffs/AlmiVisibility_ROW1_FEATURE_RESULT_2026-09-18.md` | `fae7e99` |

**CC refused to declare the freeze itself:** *"a command that authorises its own authority is exactly the shape §3 exists to prevent."* The owner's freeze was delivered as a separate, isolated commit with a diff proved to touch line 4 alone.

### 6.3 The result — PROVED BLOCKER at Q5 = NO

**The §3 gate halted before any implementation write. Cost was not built. Engine untouched. Board unchanged.** This is the gate doing exactly the job it was written for.

**Q5 = NO, measured — all three routes to terminal satisfaction closed:**

| route | why it is closed |
|---|---|
| satisfy the learning limb | requires building class-D rows 39–41, deliberately outside frozen v0.1 |
| per-limb ⏭ | requires an owner split ruling naming both halves. **None exists.** The owner's own ruling at `:59-64` records the split as a boundary act *"the owner has not taken here."* |
| whole-row ⏭ | forbidden by Ruling A and rejected by `assertLawful` (`classification.mjs:1125`) |

Supporting measurements: class-S rows are exactly **3, 7, 10, 12, 13, 14, 25, 38** — Row 1 is class P and not among them. `git ls-files src bin tools runs | grep -i learning` → **0 files**; rows 39/40/41 are the only frozen rows specifying learning and all three measure class D.

**All six §4 cost observations CONFIRMED, none contradicted** — including a live probe: five identity keys passed to `makeCostEntry`, none survived, no throw. New measurement: **every frozen row naming cost — 1, 45, 48, 51, 54 — is class P**, so no frozen source defers per-product cost.

### 6.4 The proposition matrix — all thirteen

Six depend on learning: **P2, P6, P7, P8d, P9, P10**. All thirteen were tested; nothing added, nothing removed, no UNKNOWNs.

| id | clause | depends on learning | state after a learning-only ⏭ | must Option A name it | authority |
|---|---|---|---|---|---|
| P1 | INPUT | NO | SATISFIED | NO | `:194`; row 53 — first product + `products/neutral-test-ferments` |
| **P2** | INPUT | **PARTLY** — clause enumerates "learning records"; needs the class addressable, not populated | **STILL APPLICABLE+UNSATISFIED** | **YES** | `:194`; grep learning → 0 |
| P3 | EXPECTED | NO | SATISFIED | NO | `:195`; `runs/audit/row53-portability-red-2026-09-14.txt` |
| P4 | EXPECTED | NO | SATISFIED | NO | as P3 |
| P5 | EXPECTED cost | NO | STILL APPLICABLE+UNSATISFIED | NO | Ruling A `:44-45` — cost *"must not inherit the learning limb's deferral"* |
| **P6** | EXPECTED | **YES, wholly** | SATISFIED (justified ⏭, not a tick, `:102`) | **YES** | `:195`; Deferral Law `:97-98` |
| **P7** | FAILURE (a) | **PARTLY** | **STILL APPLICABLE+UNSATISFIED** — over learning the clause is **VACUOUS, not passing** | **YES** | `:196`; LAW-ABSENT-1 |
| P8a | FAILURE (b) | NO | SATISFIED | NO | 46 records |
| P8b | FAILURE (b) | NO | SATISFIED | NO | `runs/evidence/evidence.jsonl` non-empty |
| P8c | FAILURE (b) cost | NO | STILL APPLICABLE+UNSATISFIED | NO | 22 entries, 0 name a product |
| **P8d** | FAILURE (b) | **YES, wholly** | **STILL APPLICABLE+UNSATISFIED — a failure condition actively MET today** | **YES, most urgently** | `:196`; Deferral Law `:97-98` |
| **P9** | EVIDENCE | **PARTLY** — scoped to "all four classes" | **STILL APPLICABLE+UNSATISFIED** | **YES** (with P10) | `:197` |
| **P10** | EVIDENCE | **YES** — "all four" is a literal count | **STILL APPLICABLE+UNSATISFIED** | **YES** | `:197` |

**The decisive test, Part 1: NO.** A learning-only ⏭ resolves **R1-P6 alone — one of six.** **Recording that ruling would have produced a second Q5 = NO.**

**Part 2: YES** — an Option A that names all six and restates the v0.1 half's four clauses over data/evidence/cost would work. Precedent A4-ADD.1 confirms the form: rows 3 and 7's split did not defer a dimension and leave the clauses alone — **it rewrote them** (row 7's v0.1 EXPECTED ends *"the other three dimensions read UNKNOWN"*).

Draft: `_handoffs/AlmiVisibility_ROW1_OPTION_A_DRAFT_AGAINST_THE_PROPOSITION_MATRIX_2026-09-18.md` — brief `b62757e`, analysis `07e92cf`.

**🔴 That draft carries an uncured routing defect.** The instruction reached CC as a fragment beginning at §5A with no parent §5. CC inferred Option A's shape from the fragment's own words and **disclosed the inference at the top of the artefact** rather than proceeding silently. **No future ruling may treat that draft as verified against the missing §5.** Before any ruling turn, the complete instruction goes in one message and the draft is re-checked against it.

### 6.5 The machinery refuses the move — CONTRACT CONTRADICTION, preserved

`tools/verify-pass-boundaries-source.mjs`:

```js
if (frozen[id] !== "D") throw new Error(`Amendment 4 moves item ${id}, which the frozen ruling classes ${frozen[id]}, not D`);
```

Row 1's `frozenClass` is **P**. Both existing split precedents — rows 3 and 7 — were **D** and moved **D → S**, pulling a v0.1 half *into* scope. Option A moves **P → S**, pushing a limb *out*. **The guard throws on exactly that**, and `EXPECTED_EFFECTIVE_CLASS_COUNTS = {P:27, S:8, D:23}` would move too.

Classified **CONTRACT CONTRADICTION**, not stale inventory. It is a genuine guard against quietly narrowing a row. Giving Option A effect requires **an authorised code change in its own turn — never widening the guard to make a gate pass.** No guard widened, no guard weakened, no count edited.

### 6.6 Cost-population feasibility — VERDICT: UNKNOWN

`_handoffs/AlmiVisibility_ROW1_COST_POPULATION_FEASIBILITY_2026-09-18.md` — brief `c0623d3`, measurement `c9efc4b`.

**Eight of the ten closure propositions are PROVED. Two are not, and both trace to one root.**

#### 🔴 U1 — the decisive unknown

> **Does Row 1 require a non-empty cost population PER DECLARED PRODUCT, or ONE PER CLASS with the other product's accessor proved unable to reach it?**

Two readings survive the frozen text:

- **Reading 1 — per class.** EVIDENCE's plural maps to *"all four classes"*; EXPECTED says each class is reachable only from *"its own product"* — a singular owner.
- **Reading 2 — per product.** INPUT requires *"an accessor from **each** reaching for the other's … cost … records"*, and under Reading 1 one direction has an empty target and proves nothing.

**The decisive measurement:** Row 54 at `:497` says *"two declared products, **each holding** private evidence, facts, costs and learning."* **Row 1 does not say it.** No ruling has addressed the omission.

**Under Reading 1 the other eight propositions are already satisfied and the verdict is YES. Under Reading 2, propositions 6 and 10 fail on the fixture subject and it is NO.** The frozen text does not choose. Per LAW-ABSENT-1 the verdict is **UNKNOWN**, not NO.

**Standing precedent worth weighing:** rows 53 and 61 are both VERIFIED-PASS **using a neutral test product as the second party of an isolation proof.** CC recorded this even though it cuts against its own ROLE 1 classification.

#### What was measured cleanly

| measurement | result |
|---|---|
| **required population type** | **B** — a legitimate non-fixture cost record (`:196-197`). Neither clause names money, spend, amount, magnitude or an operating event; `src/cost/ledger.mjs` admits `ZERO_BY_TARIFF` and `UNKNOWN` money states, so a legitimate record need carry no spend. **Not A.** |
| **required cardinality** | **🔴 UNKNOWN — this is U1** |
| **subject set** | **THREE, not two.** `availableSubjects()` returns `almi-oet` (external root `../almi-visibility-data` — *"the products' own data"*, descriptor present) · `neutral-test-ferments` · `neutral-test-knots` (both fixtures root) |
| **cost producers** | **Seven. Exactly ONE is product-scoped:** `bin/source-integrity.mjs` (`--product=<id>`, owner-authorised 13 Sep 2026 with code-enforced bounds; `PRODUCT.productId` in scope at `:42`, entry built `:104`, appended `:131`). The other six never learn which product they run for: `bin/crawl.mjs` · `bin/gsc-ingest.mjs` · `bin/render-archive.mjs` · `bin/replay-crawl.mjs` · `bin/fetch-for-verification.mjs` · `bin/paid-provider-controls.mjs` (a declared test double). `bin/report.mjs` is product-scoped but only reads the ledger — not a producer. |
| **the 22 entries** | **TOTAL 22 · PRODUCT-BOUND 0 · UNBOUND 22 · FIXTURE 0 · NON-FIXTURE 22.** `FIXTURE = 0` is measured: no test writes this path (eleven test files read it; `owner-authorization-gates.test.mjs:122` asserts it did not change). |
| **backfill** | **NO.** The key union across all 22 holds no product/project/subject field — **including the one entry from the one product-scoped producer** (`link-check:2026-09-13T01:42:09.708Z` names no product; binding it would need the likely-caller inference the law forbids). The 22 remain evidence that a cost producer has operated. **They are not product-bound Row 1 proof.** |
| **`almi-oet` feasibility** | **YES** — authorised producer path, truthful identity at creation, only the missing generic binding, no credential / paid provider / connected write (the ledger lives in the **engine** repo; network is already authorised and bounded for this operation), and **it has already happened once for its own purpose on 13 Sep 2026** |
| **fixture subjects** | **NO** — sources are *"at a reserved address that does not exist"*; such an event would not exist for product purposes independently of Row 1 |
| **`neutral-test-ferments` role** | **ROLE 1 — test artefact only.** Authority: `config/subject-roots.mjs` — root kind `"fixtures"`, declared purpose *"this engine's own declared test material … not any product's data"*, against `"external"` / *"the products' own data"*; plus `src/product-cli.mjs:30`. Classified from the root's declared kind, **not from the name.** |

#### Two things CC recorded against its own reading

1. **`src/product-cli.mjs:30` cites Row 1 as its own reason for existing.** So the fixture/product separation was made *for* Row 1 and **cannot be read backwards to supply Row 1's evidence**. ANTI-CIRCLE LAW, caught unprompted.
2. **Rows 53 and 61 are VERIFIED-PASS on isolation proofs whose second party was a neutral test product** — standing precedent pointing toward Reading 1, recorded immediately after classifying `neutral-test-ferments` as ROLE 1.

Also recorded, not buried: 5 of the 22 entries record refusals against a declared test-double provider — real gate, real refusal, fake provider. Moot here; all 22 are unbound either way.

#### U2 — arises only under Reading 2

May an engine fixture subject, whose root is declared *"not any product's data"*, hold a qualifying Row 1 cost population? Measured as far as evidence goes: **ROLE 1, and no product-purposed cost event.**

---

## 7 · WHAT PROVED NOT TO MOVE

### 7.1 Row 9 — PROVED BLOCKER

Frozen there. The ⚠ NOTE in the frozen text (`PASS_BOUNDARIES_SOURCE.md:241-246`) attaches to the **FAILURE** clause, so it stops *"any dimension missing"* from firing — but it does **not** make *"all seven ingested"* true. Those are different sentences.

Row 9 therefore sits in a state Row 58 has no word for: **not ☑, not FAILED, not ⏭.**

Result: `_handoffs/AlmiVisibility_ROW9_FEATURE_RESULT_2026-09-18.md`, `20cac7c`.

### 7.2 Row 5 — FAILED

Two implementation attempts. Both reverted. **Nothing shipped.** Result: `_handoffs/AlmiVisibility_ROW5_FEATURE_RESULT_2026-09-18.md`, `ff8200d`.

**Row 5's complete frozen boundary** — `PASS_BOUNDARIES_SOURCE.md:217-221`, four lines, committed once at `9b57f71`, never changed:

```
5 · Intent & Question Clustering — D
- INPUT a set of differently worded questions with the same underlying intent.
- EXPECTED they cluster into one intent; local wording is preserved, not erased.
- FAILURE distinct intents merge, or identical intents stay split.
- EVIDENCE the cluster with its members and a held-out check.
```

**No tolerance exists anywhere** — 7 files searched with null controls.

**Baseline: 0 merges / 8 splits.**

| intent | in-sample members |
|---|---|
| `score-equivalence` | 83 |
| `cv-for-occupation` | 24 |
| `daily-habits` | 23 |
| `cv-no-experience` | 10 |
| `pte-destination-requirement` | 4 |
| `ielts-free-practice` | 2 |
| `pte-for-occupation` | 1 |
| `bilingual-licenciatura` | 0 |

| attempt | merges | splits | total |
|---|---|---|---|
| baseline | 0 | 8 | **8** |
| 1 — unseen tokens carry no evidence | 5 | 4 | **9** |
| 2 — frame completion alone | 3 | 8 | **11** |

Both confined to `place()` (whose only caller is `heldOutCheck`), both derived purely from in-sample clusters, **neither naming a held-out word** — so the held-out protocol was never contaminated. **Both were worse than doing nothing.** CC reverted: *"tuning against the reference is exactly what §5 forbids."*

Restoration proved **by hash, not inspection**: worktree blob `1abdaa38dd12e78895c9f3b544794e6e6f3b910b` = origin/main blob. Baseline re-measured after revert: 0 merges / 8 splits, `["record-split"]`, 38/38 on the row-5 and row-6 test files. Attempt branch deleted. Engine files changed: **NONE**.

**The root mechanism — one defect, not eight.** The lexicon's slot-value and filler lists are **closed enumerations**, so `doctor` and `bartender` resolve to `<occupation>` but `cardiology` and `architecture` do not, and survive as distinguishing tokens. Separately, `idfOf` gives a token with df = 0 the value `log(1+n)` — **the maximum weight** — which weighted Jaccard then counts in the union. So `cardiology` outweighs `cv`, and "cardiology cv" scores 0.276 against twenty-four `cv` queries, under the 0.5 threshold. This contradicts the reference's own R1 and R2.

**The real finding — why a lexicon fix will not save Row 5:**

> *"The two failure directions are coupled through the same weighting. `pte` and `ielts` recur across 75 intents, so the tokens that separate those intents are exactly the rare ones any relaxation discounts. **Closing splits opens merges.**"*

**CC's two notes for any future attempt, verbatim:**

> *"First, the hardest cases are the small ones: `pte-for-occupation` has one in-sample member and `bilingual-licenciatura` has zero — a cluster of one yields no variation to learn a slot from, and with no anchor the two bilingual queries can never meet under the held-out protocol. Second, there is one unexplored and possibly lawful device I deliberately did not reach for: letting `buildRecord` cluster unplaced held-out queries among themselves. That would not contaminate the held-out check, but it changes how the record is assembled, and that was beyond what this command's evidence settled — so I left it UNKNOWN rather than quietly using it."*

Leaving it UNKNOWN rather than quietly using it is LAW-ABSENT-1 applied correctly.

**Owner's governing law:** *"If implementation improves 8 splits to any nonzero number: ROW 5 STILL FAILS."* Both attempts went **up**, so there is not even a partial-progress question to rule on.

---

## 8 · OPEN OWNER DECISIONS

These are the owner's alone. None is blocked on evidence.

**0. 🔴 U1 — THE ONE THAT DECIDES EVERYTHING ABOUT ROW 1.** Per class, or per product? (§6.6) Row 54 `:497` says *"each holding"*; Row 1 does not. **One sentence.** Under Reading 1, cost feasibility is YES and eight of ten propositions already hold. Under Reading 2 it is NO, and the split ruling plus the machinery change would both be wasted. **Settle U1 before any split ruling** — settling it afterwards reaches Q5 = NO a second time, which is the exact waste the gate exists to prevent.

1. **Rows 1 / 4 / 54 — split-vs-whole-row.** For row 1 this now has a measured shape: Option A must name **all six** learning-dependent propositions (§6.4) and restate the v0.1 half's four clauses; its effect requires a **separately authorised machinery change** (§6.5).

2. **Row 6 — no authorised ⏭.** It reads as deferred but nothing authorises the deferral.

3. **Row 58's missing word.** The DONE contract has no term for *proved blocker*. **Row 9 and Row 1 both sit in that gap.** Two rows is no longer coincidence. Either Row 58 gains a word, or both rows are forced into one of the existing seven.

4. **Ruling C condition 4** — four dated checks. No network, no credentials needed.

5. **Path A — expand frozen v0.1 to build the learning capability.** Deliberately **not pursued**, not forgotten. *"Not pursued" ≠ "impossible." "Deferred from this turn" ≠ "N/A forever."* It is an owner-level scope decision of a different order.

Also standing, each needing something that is not code:

- **Row 25** — owner green for a bounded capture.
- **Row 50** — two human dependencies.
- **Row 17** — product decision on the fee-comparison derived fact.
- **Row 46** — does **not** require network. The live-researcher proof already ran on an authorised request (hits 1, misses 2). The only missing leg is a date: **2026-12-11**.

---

## 9 · FINDINGS REGISTER

| id | state | substance |
|---|---|---|
| **D-HELDOUT-1** | **CLOSED** (`fb68db9`) | Fixed via full-record `compareToReference` as the acceptance oracle. All six equivalence criteria proved read-only with fingerprint identity. |
| **D-VERDICT-1** | **OPEN** | `src/discovery/intent-clusters.mjs:263-270` — the H3 collapse. `verdict = intentInSample ? "MISS" : "HIT"` conflates *held-out query correctly placed* with *held-out query had no possible target*. The 44/12/5 correction is registered, **not implemented**. Pattern instance 10. |
| **D-SCRATCH-1** | **OPEN, PARKED** | Partly a consequence of beta-g's own `.test-scratch` fixture rule, which **moved** the concurrency problem rather than removing it. Outside Gap 2's boundary (§5.1). |
| **D-ADJUDICATION-1** | **OPEN, PARKED** | `config/discovery/intent-reference.mjs` — `REFERENCE_AUTHOR = "CC (model judgement standing in for a human reader; not owner-verified)"` (`:35`), and the post-result amendment mechanism (`:38-44`) has 2 recorded amendments, **both** moving the in-sample verdict RED→GREEN. Pinned original: `runs/audit/row5-reference-as-first-written-2026-09-14.mjs.txt`, sha256 `626a37ea124cab39e7c40c9417926673377d953573ef5d28ee31aca615c348f3`. |

**D-FACT-1 is CLOSED.** It is not row 16's live blocker; beta-g reported that in error.

**New findings this session: NONE chased.** DEFAULT = PARK held.

---

## 10 · PARKED — DECIDES NOTHING

- **`src/search/dimensions.mjs:85-86`** — `provenPull` exempts `:page-rows` from both the request count and `exhausted === true`. Deliberate (fixture at `:134`), but **no written reason** exists. Parked. Decides no dimension.
- **`src/cost/ledger.mjs:50`** — `makeCostEntry` destructures a fixed field list with **no product field**; extra keys are silently dropped. Live probe: five identity keys passed, none survived, no throw. This is Row 1's cost gap, now fully characterised (§6.6) and awaiting U1.

---

## 11 · beta-g's ERRORS — AND THE STANDING CORRECTION

Recorded because burying them would defeat the point of the register.

1. Relayed CC's *"closure-record branch local, unpushed"* into a **frozen brief as fact**. It was pushed at `203e24a`, with a third commit the brief never named; `b066ca0`'s message still falsely says *"Local, not pushed."* Caught only because beta-g had added the `PUSHED / STILL LOCAL-ONLY` line to the return format. **Standing fix: relayed state is marked "reported, unverified."**
2. The `.test-scratch` fixture rule **moved** the concurrency problem rather than removing it. D-SCRATCH-1 is partly its consequence.
3. Leaned NQ-A on the protocol-artefact argument. Owner's rule disqualified it: *"If the only reason is 'the evaluator cannot compare it' then NQ-A JUSTIFIED = NO. That establishes evaluator limitation, not substantive exclusion."*
4. Said row 46 requires network. It does not (§8).
5. Reported D-FACT-1 as row 16's live blocker. It is **CLOSED**.
6. **Classified row 4 NONCLOSABLE-BY-SCOPE via "no generator exists in v0.1."** 🔴 **Re-diagnosed by the owner, 18 Sep:** this was not merely an inference — it was **applying V5.1's original v0.1 boundary after the Page Generator Owner Ruling v2 had already superseded it.** The later ruling authorised LOCAL CONSTRUCTION; I used the earlier exclusion anyway. The owner's own revisit records the same thing independently at **R-04**. CC at the time: *"Landing in the right place by the wrong route is not being right."*
7. The 27/38 hypothesis — returned NOT AUTHORISED; now-closable measured at **0**.
8. Called row 7's owner-ruling route a *"cheap exit."* It is not; a ruling reaches TESTABLE-NOW only.
9. Wrote CC commands three times when the owner had asked for discussion first.
10. **Carried "Row 1 = per-product cost visibility" forward without reading Row 1's frozen text.** It is *Product Intake & Isolation* over four record classes. CC caught it while drafting.
11. **Said cost was "both buildable and provable."** Buildable was measured. **Provable was asserted.** CC named the gap.
12. **Wrote "both declared products" into the §4A role gate.** Frozen Row 1 does not require that population. CC corrected it per §1, and **the correction moved the answer from probably-NO to UNKNOWN.** The wording was stricter than the frozen text and would have produced a wrong NO.
13. **The one-line freeze-check grep** — pattern instance 12 (§4).

### 🔴 THE PATTERN — TWO AXES, NOT ONE

**First diagnosis (incomplete).** Errors **6, 10, 11 and 12** were read as one move: importing a specification from an **adjacent** source — a neighbouring row's text, a prior report's wording, a plausible framing — instead of reading the subject's own frozen text. That is the **SPATIAL** axis, and it is real: the difference between what row 54 says and what row 1 omits is exactly where U1 lives.

**🔴 The owner corrected that diagnosis on 18 Sep, and he was right.** It missed a second axis entirely.

**The TEMPORAL axis.** Error 6 was not an adjacent-source import at all. It was **applying a boundary that a later owner ruling had already replaced** — V5.1's generator exclusion, used after Page Generator Owner Ruling v2 had authorised local construction. The old rule stayed stuck after the new ruling arrived. The owner's revisit records the identical finding at **R-04**, reached independently.

**So the mechanism has two axes, and my own pattern statement had only one. That miss is itself the fifth instance — a mis-diagnosis of the diagnosis.**

| axis | the failure | the question that prevents it |
|---|---|---|
| **SPATIAL** | authority taken from a *neighbouring* subject | *Is this THIS row's own frozen text?* |
| **TEMPORAL** | authority taken from a *superseded* document | *Is this the LATEST ruling on this exact issue?* |

**STANDING CORRECTION, NOW LAW FOR beta-g — both questions, every time:**

> **Before writing one sentence about a row:**
> **1. Read that row's own frozen text and quote it.** An adjacent row's wording is never authority for this row.
> **2. Check whether a later owner ruling has changed the boundary that row sits in.** A superseded document's wording is never authority again — **even though it is still sitting there in the file, unchanged and looking authoritative.**

**Why the temporal axis is the more dangerous one.** A superseded clause does not announce itself. It is still in the document, still worded with authority, and nothing in the file marks it dead. The only thing that kills it is a *later* ruling living somewhere else. This is precisely what the revisit's authority hierarchy exists to fix (§13.3), and why its level 1 reads *"explicit later OWNER RULING — controls the exact issue it names."*

Had both questions been in force earlier, row 4 would not have been misclassified and U1 would have been found on the first reading of Row 1 rather than on the fourth artefact.

---

## 12 · STANDING CONSTRAINTS — IN FORCE, VERBATIM

**Secrets.** Never print, echo, log, expose, copy, transform, hash, encode, compare, inspect or measure any secret value — including length, prefix or suffix. Never screenshot a terminal. Never let a production env file reach disk. Never enter credentials on the owner's behalf. Do not access a credential merely to prove it exists.

**Writes.** No production write, no data-repo write, no connected-product write, no deploy without the owner's GREEN.

**Exam material.** Never store exam text — count, never quote. Never copy any sentence, question, option, passage, case note or script from a real exam.

**Build.** `npm run build` is banned locally on almi-oet and unauthorised in these turns.

**Git.** beta-g never runs git from the device shell — it binds beta-g only. CC runs git, **one mutation at a time**, confirming no lock, never deleting or bypassing one.

**Network.** No network fetch, crawl, paid provider or spend without a green.

**Item 52.** The seal opens ONCE. **NOT RUN = NOT TESTED.**

**Deploy key.** Data repository only, write access disabled, private key only in the GitHub secret, never exposed anywhere.

**Untracked files.** Do not touch the unrelated untracked files — the 22 ambiguous, plus `Claude outputs/` and `PHASE_0_ITEM_4_DECISION_BRIEF.md`.

**Delivery.** PR REQUIRED CHECKS GREEN FIRST. MERGE SECOND. `--watch` exit 0 ≠ PR GREEN.

---

## 13 · THE COMPLETE PRODUCT REVISIT — WHERE THE NEXT SESSION ACTUALLY STARTS

**`AlmiVisibility_COMPLETE_PRODUCT_REVISIT_AND_FINAL_REPLAN_v2_2026-09-18.docx`** — issued by the owner at the close of this session. **Status: OWNER REVIEW DRAFT · NO IMPLEMENTATION AUTHORITY.** It becomes the control map only after Step 0, D1 and D2, at the freeze step of its own order.

> 🔴 **v1 (`..._REPLAN_2026-09-18.docx`) IS SUPERSEDED BY v2 IN ITS ENTIRETY.** Mark it `.SUPERSEDED` in `_handoffs` and do not quote it. This is the first application of LATEST-RULING-WINS (§3) — recorded here because the law was written tonight after a breach of it, and the very next document to arrive superseded another.

**What v2 changed, and why it matters:** v2 closes the three risks §14.2 named, each with its own register entry — **R-08** the unindexed ruling set (Step 0), **R-09** recommendations mistaken for rulings (removed from D1/D2), **R-10** board recompute mistaken for progress. It also improves on the fix proposed here in two ways: it bounds the register itself — *"an authority-navigation instrument, not a new source of truth… it may not manufacture, reinterpret, or silently amend authority"* — and it makes the **D2 impact test its own numbered read-only step** rather than a clause inside the ruling, so it cannot be skipped. Its superseding rule is also sharper: a later ruling controls **only the proposition it names**, and does not globally kill the older document.

**Two additions still worth making to Step 0** (measured, not inferred):

1. **Validate the register against a known answer.** R-04 (V5.1's generator exclusion, superseded by Page Generator Owner Ruling v2) is a pair whose correct result is already known. **If the completed register does not independently mark it SUPERSEDED-ON-THIS-ISSUE, the register has a hole.** Null control, applied to the instrument.
2. **Prove the register's population; do not assume it.** The 32-file count was reached by *filename*. Page Generator Owner Ruling v2 is a `.docx`, and rulings may sit inside handoffs whose names do not contain "RULING". **Count equality ≠ set equality.** The register must record its own search method and its own known incompleteness — an incomplete register that looks complete is more dangerous than no register.

**It supersedes the next-moves this handoff carried before it.** Read it first, then §14 below.

### 13.1 Its diagnosis

The vision is **coherent and must not be rebuilt**. The failure is **organizational**: documents written at different stages now mix **three layers** — FULL PRODUCT VISION · CURRENT v0.1 RELEASE SCOPE · FEATURE-LEVEL EXECUTION & STATUS SEMANTICS — so implementation turns are forced to resolve product semantics late. *"The corrective action is therefore not 'more auditing' and not 'more code'."*

This corroborates §14's finding independently. Two of three feature commands halted on owner semantics, not code — the revisit says that is a structural property of the document set, not bad luck.

### 13.2 Three finish lines, separated

| finish line | what it means | status |
|---|---|---|
| **v0.1 INTERNAL RELEASE READY** | the frozen current-scope subset works truthfully, deferred capabilities visibly deferred | **this is what 23/38 measures** |
| **FULL ALMIVISIBILITY DONE** | the complete operating-loop DoD, including real post-publication indexation/learning | **not proven by the 38-row denominator alone** |
| **COMMERCIAL READY** | tenancy, billing, onboarding, client operations | future, not current scope |

**This is the answer to §8 item 3.** Row 58's missing word was a symptom; the disease was equating a release milestone with product DONE. **R-07: do not patch Row 58 in isolation — resolve after D1.**

### 13.3 The authority hierarchy

1. explicit later **owner ruling** — controls the exact issue it names, rewrites nothing else
2. frozen **Definition of Done / PASS boundary**
3. **product identity / architecture** contract
4. **feature checklist + frozen row boundaries**
5. **V5.1 master build** specification
6. **execution plans / process laws** — control HOW, not WHAT
7. **current code and tests** — evidence of implementation state only

> **NON-NEGOTIABLE: current code behaviour, a green test, a fixture, or an old implementation assumption must never silently become product authority.**

That last line is the same defect this session kept catching, stated at product level.

### 13.4 G1–G5 replaces the late Q5

```
SELECT → FREEZE PASS → RESOLVE OWNER SEMANTICS → MEASURE DEPENDENCIES &
EVIDENCE POPULATION → PROVE TERMINAL PATH (Q5) → ONLY THEN AUTHOR ONE
MASTER COMMAND → BUILD → ADVERSARIAL TEST → REAL EVIDENCE → PR/CI →
TICK OR TERMINAL DISPOSITION → FREEZE → NEXT
```

| gate | question | if NO / UNKNOWN |
|---|---|---|
| **G1** Acceptance | Is the exact PASS/failure contract unambiguous? | owner/authority resolution **before code** |
| **G2** Applicability | Which propositions are in this release, deferred, or N-A? | resolve release semantics |
| **G3** Evidence population | Can required real evidence legitimately exist? | block/measure; **do not manufacture** |
| **G4** Dependency closure | Are prerequisite capabilities/authority available? | do prerequisite, or terminally block |
| **G5** Terminal path | If the implementation succeeds, can the row reach a lawful terminal state **this cycle**? | **DO NOT BUILD** |

*"This directly incorporates the proven Row 1 lesson: DO NOT BUILD A KNOWN-INCAPABLE PARTIAL FIX."*

**Where Row 1's open questions land under G1–G5:** **U1 is a G1 question** (acceptance ambiguity), not a status-semantics one — **D2 does not answer it.** The split ruling is **G2**. Cost-population feasibility is **G3**, measured UNKNOWN pending U1. Q5 = NO was **G5**. All four survive the revisit; the revisit only changes *when* they are asked.

### 13.5 The contradiction register R-01 … R-07

| id | issue | recommended disposition |
|---|---|---|
| R-01 | v0.1 vs full DONE | **Owner D1** — separate them unless the DoD is amended |
| R-02 | mixed-limb deferral / status | **Owner D2** — one generic rule before further affected-row execution |
| R-03 | row-class guard vs later narrowing (**D→S precedent vs proposed P→S**) | **do not weaken the guard ad hoc**; resolve only after D2 |
| R-04 | V5.1 excluded the generator; a later ruling allows local construction | resolved by the later ruling — local construction authorized, publishing deferred |
| R-05 | "for AlmiWorld products" vs "all kinds of products/projects" | later generic-core ruling wins; AlmiWorld is the first owned environment |
| R-06 | checklist used as a flat completion instrument | keep the inventory; **add release-applicability, dependency and status layers** rather than changing row meanings |
| R-07 | Row 58 semantics | **resolve after D1**; do not patch Row 58 in isolation |

**R-02 and R-03 are exactly what this session hit — reached independently, from the other direction.** R-03 matches CC's measured guard finding (§6.5) word for word in substance.

### 13.6 The checklist's structural diagnosis

Keep the 61 rows as the **capability inventory**. The defect is using one flat list simultaneously as product architecture, release scope, implementation queue, status machine and Definition of Done. **Those are five different concerns and they need five layers, not one column.**

---

## 14 · NEXT SESSION — EXACT ORDER

**🔴 Do NOT resume Row 1 implementation first.** The revisit is explicit about this, and the reason is sound: Row 1's blockers are instances of a general problem, and solving them one row at a time is how the document set reached this state.

| # | action | output | code? |
|---|---|---|---|
| **0** | 🔴 **RULING REGISTER — READ-ONLY, MEASURED** (see §14.1 below; not in the revisit, added after measuring `_handoffs`) | one dated, issue-indexed register of every AlmiVisibility owner ruling, marking CURRENT vs SUPERSEDED | No |
| **1** | **OWNER D1** — freeze *v0.1 RELEASE READY* vs *FULL PRODUCT DONE* semantics | one short owner ruling | No |
| **2** | **OWNER D2** — freeze generic mixed-limb deferral and row-terminal semantics, tested against rows 1 / 4 / 9 / 54 / 58 **without moving them** | one generic status ruling | No |
| **3** | **FREEZE THE RECONCILIATION** with the two decisions inserted; existing source docs remain authority by layer | the control map | No |
| **4** | **BOARD RECOMPUTE — READ ONLY**; reclassify all 61 rows against release applicability + dependencies + status semantics | exact set delta, **no automatic movement** | No |
| **5** | **CLOSURE QUEUE** — precompute G1–G5 for every non-terminal current-release row; assign each an **OWNER / ENGINEERING / EVIDENCE / EXTERNAL** lane | the queue | No |
| **6** | **EXECUTE** — only rows with G1–G5 satisfied get one complete feature command | ticks or terminal dispositions | Yes, where needed |
| **7** | **v0.1 FINAL INDEPENDENT AUDIT** — frozen requirements and regressions only, no idea hunting | audit record | tests/evidence only |
| **8** | **v0.1 RELEASE DECLARATION** — only if its exact contract is satisfied | declaration | No |
| **9** | **FULL-PRODUCT ROADMAP DECISION** — whether to open the publishing / post-publish learning phase | owner decision | Later |

### The two rulings, verbatim

**D1** — *"Is the current 38-row denominator the contract for 'v0.1 INTERNAL RELEASE READY' while full AlmiVisibility DONE remains governed by the complete operating-loop DoD, including later publishing/learning capabilities?"* **RECOMMENDED: YES.**

**D2** — *"When a row is in the current release but one named sub-proposition belongs to an explicitly deferred capability, may that sub-proposition be marked release-DEFERRED while the remaining propositions stay applicable, without converting the whole row to DEFERRED or treating the deferred limb as satisfied/N-A?"* **RECOMMENDED: YES, but only through explicit owner/release authority and with a single generic status representation.**

**🔴 Note on both:** each carries a pre-registered recommendation. **A recommendation is not a measurement.** The owner should weigh it as a proposal, and where it bears on a frozen row, read that row's own text before agreeing.

### 14.1 🔴 STEP 0 — THE RULING REGISTER, AND WHY IT COMES FIRST

**This step is not in the owner's revisit. It was added after measuring `C:\Projects\_handoffs` on 18 Sep 2026, and the measurement is the argument for it.**

**MEASURED:**

| | |
|---|---|
| AlmiVisibility owner-ruling / amendment files in `_handoffs` | **32** |
| chronological or issue index of them | **NONE** |
| README or reading-order file | **NONE** |
| files marked superseded, out of 32+ | **ONE** — `ALMIVISIBILITY_BEST_PAGE_RECIPE_STRATEGY_FINAL.SUPERSEDED.md` |

**The problem.** The revisit's authority hierarchy makes level 1 *"explicit later OWNER RULING — controls the exact issue it names."* That is correct. But with **32 unindexed ruling files and no supersede marking**, the question *"which is the latest ruling on this exact issue?"* has **no instrument that can answer it.** LATEST-RULING-WINS (§3) is a law without a way to obey it.

**This is not hypothetical — it is the measured cause of a real error.** V5.1's generator exclusion still sits in its document, unchanged and reading as law, because the Page Generator Owner Ruling v2 that replaced it lives in a *different file* and nothing marks the older clause dead. beta-g applied the dead clause to row 4 (§11 error 6). The owner's revisit records the same collision independently at **R-04**.

**The good news: the instrument already exists and is simply unused.** The `.SUPERSEDED.md` naming convention is in the folder, applied exactly once. The fix is to apply an existing convention, not to invent one.

**Why it must come before step 3.** Step 3 freezes the reconciliation *as the control map* — it decides which documents remain authority. **That freeze cannot be done correctly over a document set where nobody knows which layer-1 rulings are still live.** Freezing first and indexing later would freeze the ambiguity in place, one level up from where it did the damage tonight.

**Scope of step 0 — read-only, and deliberately small:** list every AlmiVisibility owner ruling with its date and the exact issue it names; where two rulings touch the same issue, mark the later one CURRENT and the earlier one SUPERSEDED **on that issue only**; rename superseded *documents* with the existing `.SUPERSEDED.md` convention **only where a whole document is dead**. **Rule nothing. Move nothing. Reopen nothing.** Where two rulings appear to conflict and the register cannot settle which is later or narrower, record it as an **open conflict for the owner** — do not resolve it.

### 14.2 What could still go wrong tomorrow — three named risks

1. **Step 3 freezes over an unindexed ruling set.** Mitigated by step 0 above. Without it, this is the most likely failure, and it is the same failure as tonight one level higher.
2. **D1 and D2 are answered from their own recommendations.** Both questions ship with *"RECOMMENDED: YES"* in the same document. **A recommendation is not a measurement.** D2's own text requires it to be *"tested against Row1/4/9/54/58 implications without moving them"* — **that test has not been done.** Freezing D2 without it risks a generic status rule that breaks a specific row.
3. **The step-4 board recompute is read as progress.** A read-only reclassification may change 23, or 38, or both. **A reclassification must never produce a VERIFIED-PASS row** — that would be a ruling filed as a measurement, which the owner's own 18 Sep status-semantics ruling forbids. Expect the number to move; read it as reclassification, not as ticks.

### Carried into the new order, unchanged

- **U1** (§6.6) is a **G1** question for Row 1 and survives D1 and D2. It is answered when Row 1 enters the closure queue, not before.
- **Every ruling instruction is delivered as ONE unit.** Two fragments this session cost CC an inferred premise that is still uncured (§6.4).
- **Do not reopen Row 5 without a new device** (§7.2).
- **The P → S machinery contradiction stays preserved and unfixed** until D2 settles the semantics (R-03).
- **Expect the board to move at step 4** — a read-only recompute against release applicability may change 23 or 38 or both. **That is reclassification, not regression**, and it moves nothing without authority or evidence.

### Appendix A of the revisit — the carried-forward checkpoint

| metric | state |
|---|---|
| total feature inventory | 61 |
| current v0.1 in-scope denominator | 38 |
| VERIFIED-PASS | 23 |
| progress | **23 / 38** |
| Row 5 | FAILED / FROZEN; no further remediation cycle automatically authorized |
| Row 9 | BLOCKED-UNKNOWN / FROZEN; owner/status semantics implicated |
| Row 1 | PROVED BLOCKER / BLOCKED-UNKNOWN; cost-population feasibility UNKNOWN due to U1; no code or status movement |
| engine | preserve the current clean baseline; **this document authorizes no engine mutation** |

---

## 15 · THE SESSION'S STRATEGIC FINDING

Three feature master commands ran under the new model. **Zero ticks, zero lines of engine code shipped, board unchanged at 23/38.** Under the old model that reads as a wasted day. It is not, and the reason matters more than any single row.

| row | result | what actually blocks it |
|---|---|---|
| **9** | PROVED BLOCKER | Row 58 has no word for *proved blocker* — **owner decision** |
| **5** | FAILED | genuinely hard: coupled weighting, no lexicon fix — **engineering** |
| **1** | PROVED BLOCKER → then UNKNOWN on U1 | one unread sentence of frozen text — **owner decision** |

**Two of three halted on something only the owner can do. Neither halted on missing code.**

The bottleneck has moved. It is no longer implementation capacity — it is the **status model and the rulings it still needs**. The three commands cost a day and bought the knowledge that building harder would not have helped, plus the exact sentence that decides Row 1. **That is what the gate is for.**

Four process slips occurred in the last hour of the session — two routing (a command reaching beta-g but not CC), one instrument defect authored by beta-g, one duplicate paste. **None caused damage**, because every one of them met a gate and stopped. That was not luck; those gates were built deliberately and they held under a tired operator at 4am. It is the strongest evidence this session produced that the model works.

---

## 16 · ARTEFACT INDEX

| artefact | commit(s) |
|---|---|
| `AlmiVisibility_HANDOFF_2026-09-17_GAP2_PAUSE.md` | delivered + committed |
| `AlmiWorld_FEATURE_BY_FEATURE_EXECUTION_PLAN_v1.md` | delivered + committed |
| `AlmiVisibility_OWNER_DISPOSITION_PACKET_AND_ROW7_READING_2026-09-18.md` | `5b52e11` |
| `AlmiVisibility_OWNER_STATUS_SEMANTICS_RULING_RECORD_2026-09-18.md` | `ebdd154` |
| `AlmiVisibility_ROW9_FEATURE_RESULT_2026-09-18.md` | `20cac7c` |
| `AlmiVisibility_ROW5_FEATURE_RESULT_2026-09-18.md` | `ff8200d` |
| `AlmiVisibility_FEATURE_MASTER_COMMAND_ROW1_2026-09-18.md` | `2405032` → frozen `cd61022` |
| `AlmiVisibility_ROW1_FEATURE_RESULT_2026-09-18.md` | `fae7e99` |
| `AlmiVisibility_ROW1_OPTION_A_DRAFT_AGAINST_THE_PROPOSITION_MATRIX_2026-09-18.md` | `b62757e` → `07e92cf` |
| `AlmiVisibility_ROW1_COST_POPULATION_FEASIBILITY_2026-09-18.md` | `c0623d3` → `c9efc4b` |
| `AlmiVisibility_COMPLETE_PRODUCT_REVISIT_AND_FINAL_REPLAN_2026-09-18.docx` | saved to `_handoffs` 05:26 — **SUPERSEDED IN FULL by v2** |
| `AlmiVisibility_COMPLETE_PRODUCT_REVISIT_AND_FINAL_REPLAN_v2_2026-09-18.docx` | **current owner review draft — frozen only after Step 0 + D1 + D2** |

Engine: `e15dcbd`. Handoffs `origin/main`: `c9efc4b`.

---

## 17 · GLOSSARY

| term | meaning |
|---|---|
| **class P / S / D** | A row's frozen class. **D** = deliberately absent from v0.1. **S** = split. **P** = in scope, whole. `assertLawful` refuses DEFERRED on any row the frozen ruling classes other than D or S. |
| **⏭** | Justified deferral. **Never a tick, never counts as one** (`PASS_BOUNDARIES_SOURCE.md:102`). |
| **PROVED BLOCKER** | Closure measured impossible. **Different from UNKNOWN**, which is closure *not measured*. Row 58 has no word for either. |
| **split ruling** | An owner act naming **both halves** of a row, creating a v0.1 half and a deferred half. The only route to per-limb ⏭. Precedents: rows 3 and 7, both D → S. |
| **the item-50 convention** | Assert the adverse measurement, assert the FAILED state, carry a re-sit trigger (`test/queue-rescan.test.mjs:114-119`). CI stays green by asserting the truth. |
| **null control** | A search run against a pattern known to be absent, proving the search itself works. |
| **the denominator** | 38, not 61. The 23 DEFERRED rows are outside frozen v0.1. |

---

*End of handoff. `e15dcbd` · 23 / 38 · **Step 0 the ruling register, then D1 and D2.** U1 waits for the closure queue.*
