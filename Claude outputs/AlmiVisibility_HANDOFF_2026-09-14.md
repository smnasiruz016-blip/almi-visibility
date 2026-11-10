# ALMIVISIBILITY — HANDOFF, 14 SEPTEMBER 2026

**Session 21:00 (13 Sep) → 05:30 (14 Sep). Fourth consecutive session, and the longest.**
Owner: S.M. Nasir Uz Zaman · beta-g researched, ruled and authored · CC implemented ·
every PR merged by the owner.

> ⚠️ **This replaces two earlier versions of itself**, written at 01:40 and 05:25. Neither was
> wrong; both were early. This one is the complete record.

---

# PART I — THE TWO HEADLINES

## 1 · 🔴 Three out of five of this product's own "findings" were not findings

| | |
|---|---|
| distinct issues in the store | **2,033** |
| a check ran and found something | **673** |
| **a check never ran** | **1,224** |
| the rest | 136 — 134 review records and 2 human-verification findings |

The not-run records carry three reason codes: `MISSING_INPUT` **878** · `NEEDS_RENDERED_HTML`
**342** · `TOOL_FAILED` **4**. They were spread over **seven** classes and carried names that
read as defects found.

**The two largest counts on the whole report were entirely unrun:**

```
sitemap-advertises-blocked-url    0 real   350 never ran
orphan-within-crawled-set         0 real   340 never ran
```

🔴 **Every one of the 340 orphan records says, in its own words, "This is not an orphan."**

And three more classes were mostly unrun: `near-duplicate` 113 → **5 real**,
`template-dominance` 110 → **2 real**, `indexability-preflight` 368 → **158 real**,
`thin-content` 226 → **118 real**.

This is the failure mode the product exists to refuse — **absence of evidence presented as a
finding** — and the product found it in itself.

## 2 · ☑ Rows 59 and 60 passed. 17 ticks → 19

**Row 59 · Falsifiability of Findings** — every presented finding now carries a **structured**
refutation: `observation` (what would have to be seen to overturn it), `source` (a method this
product actually holds), `condition` (the threshold at which it is void). A census proves all
three parts are present on all 20 findings and prints the population it checked. Its own written
limit: *the census proves the parts exist and point at a real method; it cannot prove a
refutation is well chosen.*

**Row 60 · Consequence-Weighted Priority** — harm now outranks volume, by the owner's law, and
the amplifier is structurally unable to cross a level boundary.

## 3 · The first real commercial finding this engine has produced

Not a ledger row. Real traffic.

> **134 AlmiCV `cv-guide` pages, holding 484 search impressions, are de-indexed on a
> near-duplicate premise our own measurement does not confirm.**
> NONE is thin — median **473** unique body words. Same-role sibling similarity averages
> **0.685** and **none reaches 0.8**. They fail the gate on the **country** side only.

It was hiding under a "deliberate decision" label, and surfaced only because CC refused beta-g's
proposal to mark it `NONE`. It now sits **first** on the owner's report, waiting on
`REC-NOINDEX-CV-GUIDE` — whose three options are recorded in the store:

| | |
|---|---|
| **A** | leave the gate as is — status quo, and it was a reasoned decision |
| **B** | promote specific countries via `COUNTRY_OVERRIDES` with real sourced conventions. **No code change — the promotion path is DATA** |
| **C** | key the gate on a measurement of the page's own content rather than a country flag. 🔴 our measurement bears on this: a content-keyed gate would admit most of them |

🔴 **The trap, recorded on the record:** these pages are noindexed but **crawlable**, which is the
correct configuration. **Do NOT add a robots.txt Disallow on top** — that would hide the noindex
and strand the URLs as indexed-but-uncrawlable, which is exactly the state the `/from/` corridor
is already in.

🔴 **This decision is the owner's and it lives in AlmiCV's repository — untouchable during
AlmiVisibility's turn.**

---

# PART II — WHERE IT STANDS

| | |
|---|---|
| `origin/main` | **`06050a8`** after PR #80 · CI green on the merge commit · 0 open PRs |
| tests | **940 → 1,075**, all passing |
| spend | **$0.00** — no crawl, no fetch, no paid provider, no network call of any kind |
| production writes · deploys | **none.** `vercel.json` carries `deploymentEnabled: false` |
| Neon | untouched, and it cannot be otherwise: **the app has no database code at all** — no `DATABASE_URL`, no driver, no package. All 51 MB of evidence is JSONL in the repo |

## The ten PRs

| PR | merge | what it did |
|---|---|---|
| **#71** | `a696427` | evidence protected from EOL conversion (69 files were unguarded) + Amendment 4: the discovery rows enter scope + `B1`/`PRQ-1` closed |
| **#72** | `bbcd692` | **Amendment 5 · row 61** — the page generator freed from one subject, Gate A moved *inside* the construction path and made to fail closed |
| **#73** | `a498a85` | Amendment 3: rows 59 and 60 admitted; row 61 created BUILT-NOT-PROVED; test scratch moved out of the evidence folder |
| **#74** | `2858812` | ledger provenance — admitted rows now say who admitted them; three stale deploy records superseded |
| **#75** | `65cd13a` | ☑ **row 59 VERIFIED-PASS**; row 60's register built, arriving deliberately empty |
| **#76** | `733f259` | the ruling sheet generated **from the store**, refusing to print on any disagreement |
| **#77** | `988cc84` | row 60's consequence law + 17 assignments; row 17's three real gaps |
| **#78** | `1277631` | **the 1,224 discovered** — seven classes split into found / never-ran |
| **#79** | `91dce3e` | the coverage population separated; levels ruled; four false blast-radius figures corrected |
| **#80** | `06050a8` | ☑ **row 60 VERIFIED-PASS** — decisions-on-record and audit trail separated |

## The ledger — 61 rows

| state | count |
|---|---|
| ☑ **VERIFIED-PASS** | **19** |
| 🔴 FAILED | 1 |
| 🧪 TESTABLE-NOW | 1 |
| ◐ BUILT / NOT-PROVED | 6 |
| ⚠ BLOCKED / UNKNOWN | 4 |
| ☐ NOT-STARTED | 7 |
| ⏭ DEFERRED | 23 |

**In scope 30 → 38.** Classes: as frozen `P=24 S=6 D=28` · in force `P=30 S=8 D=23`.

### Every row that is not yet passed

| state | row | |
|---|---|---|
| 🔴 **FAILED** | 50 | OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation |
| 🧪 TESTABLE-NOW | 25 | Page Quality Gate |
| ◐ BUILT-NOT-PROVED | 10 · 16 · 17 · 36 · 46 · 61 | Technical SEO Audit · Fact Conflict & Freshness · Derived Fact Provenance · Owner Authorization Gates · Cache Before Re-Research · Safe Local Page Construction |
| ⚠ BLOCKED-UNKNOWN | 1 · 9 · 52 · 54 | Product Intake & Isolation · Search Console Intelligence · Case Study Acceptance Test · Cross-Product Isolation |
| ☐ NOT-STARTED | 3 · 4 · 5 · 6 · 7 | the discovery rows, in scope since last night and not yet begun |
| ☐ NOT-STARTED | 57 · 58 | Final Independent Audit · DONE Declaration |

---

# PART III — WHAT THE OWNER RULED

## Amendment 4 — the discovery rows enter scope

The owner's finding: *"AlmiVisibility ek open, separate product hai har qism ke projects ke liye"*
— and every night was being spent inside one connected product's regulator facts.

**Measured before it was accepted.** The generic core was clean: `npm run boundary` reports
*code lines: 0 · comment lines: 72 — allowed*. The cause was not the code — **the 28 deferred
rows WERE the general product**, so what remained in scope had only one product's data to chew on.

Each row was tested against its own frozen INPUT clause:

| row | input present? | class |
|---|---|---|
| 4 · Localized Human Thinking | ✅ 388 country×query rows across 126 countries | D → P |
| 5 · Intent & Question Clustering | ✅ 337 owned queries | D → P |
| 6 · Axis Discovery | ✅ the owned evidence store | D → P |
| 3 · Keyword & Search-Language | 🟡 owned half only | D → S |
| 7 · Market Measurement | 🟡 DEMAND + VISIBILITY only | D → S |
| 🔴 **2 · Human Question Discovery** | ❌ needs *public* evidence, no fetch authorised | **stays D** |

Row 2 was deliberately left out, obeying the owner's own rule that a row whose input does not
exist must not be created.

**Addendum, same PR:** `WORTHINESS` assigned to row 7's deferred half (its own inputs — rows 2,
19, 21 — are themselves deferred), and four-part contracts written for rows 3 and 7's owned
halves, which Amendment 4 had owed and not delivered.

## Amendment 5 — the page generator becomes a product capability (row 61)

The owner's eight answers: **local construction only · output stays a local artefact · refuse and
show DATA GAP · only evidence-backed specs · generic core, tenancy is a future business layer ·
R5 stays separate · two nights**.

His success test, which decided the shape of the work:

> **THE GENERATOR IS SUCCESSFUL WHEN IT REFUSES BAD OR UNSUPPORTED PAGES CORRECTLY — NOT WHEN IT
> PRODUCES MANY PAGES.**

What the code actually showed: **the engine was never subject-shaped — its RUNNER was**
(`renderPage(PRODUCT.pageSpecs.nursing, …)`, one hard-coded slug). And a worse defect: **Gate A
was never called inside the construction path** — the runner printed *"TEXT AS BUILT (before
Gate A)"* and wrote the file anyway.

## The consequence law (rows 59–60)

The owner first named a **17-level** scale. beta-g showed it could not satisfy the owner's own
A2 (determinism): no rule separates `HIGH-MODERATE` from `MODERATE-HIGH`, and with 17 levels for
17 classes the A3 amplifier would never fire. **The owner adopted Option B** — five levels, each
with a written test:

| level | meaning |
|---|---|
| **CRITICAL** | irreversible, or recovery not dependable; credible risk of catastrophic or systemic loss |
| **HIGH** | material serious harm possible, recovery possible but costly, complex, slow or broad |
| **MODERATE** | meaningful harm, bounded, reversible by normal corrective work |
| **LOW** | limited consequence, easily reversible, no threat to core integrity |
| **NONE** | **verified** no material adverse consequence |

And the law:

- **A1** every class carries an explicit level and an evidence-based reason; never assigned from a name
- **A2** strongest-first, **deterministic** — same evidence, same classification, twice
- **A3** 🔴 **CONSEQUENCE FIRST; VOLUME / BLAST RADIUS = AMPLIFIER.** Order: consequence →
  reversibility → blast radius. Volume amplifies **within** a level; it escalates across one only
  when increased blast radius objectively changes the material consequence
- **A4** `UNCLASSIFIED = UNKNOWN`. Never LOW, never safe-by-default. **UNKNOWN is a classification
  state, not a sixth severity.** `INFORMATIONAL` and `OBSERVATION` likewise are not severities
- **entry shape** LEVEL → CLASS → CONSEQUENCE → REVERSIBILITY → BLAST-RADIUS → REASON, all six or refused

## The four populations — the ruling that finally passed row 60

| population | meaning | level? |
|---|---|---|
| **FINDINGS** | a check ran and found something | ✅ carries one |
| **COVERAGE GAP** | a check never ran | ❌ never |
| **DECISION ON RECORD** | a deliberate choice whose consequence is not established | ❌ never — awaits the owner |
| **AUDIT TRAIL** | a claim withdrawn; nothing open | ❌ not live at all |

**Every issue lands in exactly one, and they sum to the store:**

```
findings 541  +  coverage 1,224  +  decisions 134  +  audit trail 134  =  2,033 of 2,033
```

🔴 **The self-check that was applied and recorded**, because this moved a definition while row 60
was blocked by that definition — exactly what the ANTI-CIRCLE law watches for. The test: *would
this be proposed if row 60 were not blocked?* Both classes pass independently — one has **zero
open issues**, the other's own record declares itself a pending owner decision.

🔴 **And the invariant that protected it:** a decision on record must be **more** visible than a
finding, not less, because it waits on a human. A sabotage that hid it from the report is refused.

## The severity register as it now stands — 14 classes, all ruled by the owner, 14 Sep

| level | classes |
|---|---|
| **CRITICAL** | *(none)* |
| **HIGH** | `official-source-contradicts-itself` · `instrument-disagreement` · `host-publishes-no-a-record` · `exact-duplicate` |
| **MODERATE** | `robots-blocks-search-crawler` · `commencement-date-ambiguous-against-source` · `indexability-preflight-found` · `near-duplicate-found` · `template-dominance-found` · `thin-content-found` |
| **LOW** | `status-and-redirects` · `head-elements` · `canonical` · `query-parameters` |
| **NONE** | *(none)* |

🔴 **CRITICAL is empty, and that is a finding, not a clean bill of health.** Every class in the
store is a configuration or content defect a commit can undo. Nothing here destroys data, leaks a
secret, or costs money that cannot be recovered. That is a fact about **where this engine has
looked so far.** When the first irreversible class appears, the level is defined and waiting.

---

# PART IV — 🔴 BETA-G'S SEVENTEEN ERRORS

Recorded in full, because a report that hides its author's errors is worth less than no report.

| # | error | caught by |
|---|---|---|
| 1 | ran git from the device shell and left `.git/index.lock` on the owner's machine — the exact thing beta-g is forbidden to do | itself, same session |
| 2 | 🔴 a command whose step order would have staged **69 evidence files as new CRLF blobs**, breaking their hash pins | **CC, before committing** |
| 3 | stated a "4 FAIL" test baseline from its own environment as the owner's | CC |
| 4 | prescribed `git checkout -- .`, a no-op under `core.autocrlf=true` | CC |
| 5 | trusted a commit tool's "written"; the **older brief stayed on disk** and CC planned from a superseded file three sections shorter | CC |
| 6 | a command and its own brief contradicted each other on rows 59/60 — **the owner had to arbitrate** between two documents the same author wrote | the owner |
| 7 | wrote *"CI gates every merge"* — a control never measured; branch protection returns 403 on this plan | CC, which refused the claim |
| 8 | said the stale deploy claim had **three** copies; it had **five**, and one of the missed two was visible in beta-g's own search output | CC |
| 9 | ruled `WHY_THIS_URL` a *"slot, declared but never judged"*; it is one of Gate A's own frozen four, and its weakness is the recorded defect `GATE-4` | **the owner**, and the record agreed with him |
| 10 | 🔴 an **entire command** written to build `makeDerivedFact`, which already existed with its ceiling, recompute and review walk, all tested — built from a stale register line instead of the module. **`DOC-1`'s sixth instance, and the first beta-g caused** | CC, which refused to build |
| 11 | claimed the Pakistan fee comparison is arithmetic *"no page or decision uses"*; that fact file's own header calls it *"the fact a reader actually needs"* | CC |
| 12 | wrote `216 impressions / 1,497 URLs` from an older Search Console pull; the current one measures 219 on 1,525 | CC |
| 13 | 🔴 **escalated `orphan-within-crawled-set` LOW → MODERATE on 340 records, every one of which says "This is not an orphan"** — the amplifier fed fake volume, inside the very ruling meant to stop volume deciding severity | CC |
| 14 | proposed `NONE` for 134 pages whose own record says the premise is unconfirmed — **read "declared deliberate" as "verified harmless"** | CC |
| 15 | wrote *"word for word"* for a field that requires `{humanNeed, distinctValue}` — never read the interface | CC |
| 16 | a new gate keyed on `FAIL` alone, which would have refused two correct human-verification findings whose verdict is `UNKNOWN` | CC |
| 17 | called briefs **"committed"** when they were only **written** — `_handoffs` is a git repo, and writing into one is not committing. **Three times** | CC |

## The shape, which is the useful part

Five of the first ten shared one shape: **stated as measured what was only inferred or sampled.**
Two more: **read a summary instead of the source.** Two: **wrote a command without reading the
interface it targets.** One: **contradicted itself between two of its own documents.**

The night's worst number is beta-g's own: it reported **560** unmeasured checks. The real figure
was **1,224** — less than half, and the correction came from CC looking at **verdicts** where
beta-g had looked at **counts**.

---

# PART V — WHAT CC DID, AND IT IS THE NIGHT'S REAL MECHANISM

**It refused six commands, and was right every time.** Beyond that it:

- refused to build from a stale brief, and said so rather than filling the gap itself
- refused to claim a control it could not read, and wrote the limitation onto the record instead
- caught a product name leaking into `src/` — its own change — before committing
- diagnosed a "flake" and found there was no flake: the leak was beta-g's mount, where directory
  deletion is refused outright
- recorded its own **uncalibrated** thresholds in the code at `src/gate-a/why-this-url.mjs:36`,
  not only in its report, which is what `RULE TWELVE` demands
- stopped and asked when a command's scope grew from three classes to seven, instead of deciding
  silently

> **The most valuable thing in this project is not a gate or a test. It is that the implementer
> examines the command it was sent and refuses it.** That is now §13.7 of the law.

---

# PART VI — THE LAW GAINED A SECTION

**§13 · Measurement discipline** was added to `almiworld-product-law` by owner ruling. Seven
rules, each carrying what its absence cost:

| rule | |
|---|---|
| 13.1 | a number you did not watch a command produce is not a number you may write — name the command |
| 13.2 | read the source, never the summary about it |
| 13.3 | a control is not a control until you have seen it refuse |
| 13.4 | re-read the brief immediately before writing the command that stands on it |
| 13.5 | mark environment-dependent facts as environment-dependent |
| 13.6 | a tool reporting success is not evidence that it succeeded — read the file back |
| 13.7 | write commands as goals and invariants; treat the implementer's refusal as evidence |

It loads at the start of every session that touches any AlmiWorld product, so it does not die
with this conversation.

⚠️ **13.6 needs an addition, learned after it was written:** reading a file back proves the file
exists; **it does not prove it is in git history.** Writing into a repo is not committing.
And 🔴 **`device_commit_files` reported `written` while leaving the older content on disk twice
tonight** — both times caught only because the file was read back.

---

# PART VII — WAITING ON THE OWNER

| # | decision | where it lives |
|---|---|---|
| 1 | 🔴 **`REC-NOINDEX-CV-GUIDE`** — 134 pages, 484 impressions. Options A / B / C above. **Do not add a robots Disallow** | AlmiCV's repo — a later turn |
| 2 | **Row 61's missing leg** — a second DECLARED product with its own DECLARED spec, through the runner. Either a second neutral test product, or a deliberate re-pin of row 53's coverage | owner |
| 3 | **Row 17** — whether to hold the Pakistan foreign-vs-domestic fee comparison as a derived fact. Its own fact file calls that comparison *"the fact a reader actually needs"* | owner |
| 4 | **Item 25** — needs existing pages carrying verified facts; a bounded capture needs a green | owner |
| 5 | **R5** — the bounded recheck of the nine demoted fact records, unruled since 13 September | owner |
| 6 | **`U-DEP-1`** — which commit the 01:23 deployment was built from; one read of Vercel history | owner |
| 7 | **Item 56** — the report has been regenerated several times since the owner verified it | owner's eye |
| 8 | **The 1,224 coverage gaps** — closing them needs inputs the store does not hold, and a green. Naming them was this night's work; closing them is a later phase | owner |
| 9 | **The three bundled classes' remaining halves** and `noindex`'s two classes — now in the decision and coverage populations, not blocking row 60 | settled |

---

# PART VIII — THE GENERATOR, AND WHAT IT IS ACTUALLY WAITING FOR

Row 61 is built and portable: any declared product, any declared slug, Gate A inside the
construction path, failing closed. It accepted **zero of three** candidates — and the owner ruled
in advance that *"zero eligible pages would also be an acceptable generator outcome if the
evidence says zero."*

Not one refusal was the generator's fault:

| candidate | verdict |
|---|---|
| `nursing` | REFUSED — verified facts **4 of 5** (only 4 of its 19 cited claims are verified). Unique words and sibling overlap **BLOCKED / NOT TESTED** |
| `speech-pathology` | REFUSED — facts **PASS (7)**. Unique words and sibling overlap **BLOCKED / NOT TESTED** |
| neutral test product | REFUSED — declares no page spec |

**`WHY_THIS_URL_DESERVES_TO_EXIST` is now written for both specs and passes** — similarity
between the two rationales is **0.0087** against a **0.40** bar, so they describe genuinely
different reader problems rather than one problem with a profession swapped.

**Three things still stand between the generator and a page, and none is code:**

1. verified facts — **16** in the registry; `nursing` needs one more of its own
2. a **third** page spec — a shared shell cannot be learned from fewer than three, so unique
   words and sibling overlap can never be measured with two. 🔴 **It must come from a real need,
   never to make a gate measurable**
3. `PAGE-1`, already on the record: §3 makes five gates a conjunction before any new page, and
   **two of the five do not exist** — of seven gate families, three are present; semantic,
   cannibalization, technical and cost are not

---

# PART IX — STANDING CONSTRAINTS

ONE BRANCH · ONE PR · ONE MERGE. **CC does not merge; Nasir merges.**
No production write, no deploy, no spend without the owner's GREEN.
Never print, log, hash or length-measure a secret. **Never store exam text — count, never quote.**
No publishing, no route, no sitemap entry, no product-repository write. **Row 37 stays DEFERRED.**
No commercial tenancy, billing or onboarding — a future business layer, not this product's scope.
`git` from the device shell binds **beta-g only**; CC must run git, one command at a time.
**Every brief is committed to `_handoffs` before it is given — and "written" is not "committed".**
**Every commit to the owner's machine is read back. A tool's "written" is not evidence.**

⚠️ **For the day the app needs a database:** Phase 0's `02` is still open — the Neon project is
separate, but **preview and production are the same database.** It has cost nothing so far only
because there is no database code and deployments are off. It must close before that changes.

---

**TEN PRs · TWO TICKS · SEVENTEEN AUTHORING ERRORS, ALL RECORDED · $0.00 SPENT.**

**AND ONE NUMBER THAT PAID FOR THE WHOLE NIGHT: THREE OUT OF FIVE OF THIS PRODUCT'S OWN FINDINGS
WERE NOT FINDINGS — AND IT IS THE PRODUCT THAT SAID SO.**
