# PHASE 0 — INDEPENDENT VERIFICATION

**11 September 2026.** Verification of `_handoffs/PHASE_0_REPORT.md` (written 11 Sep, 00:08).

**Measured against `origin/main = 27fa404`.** `HEAD` and `origin/main` were confirmed identical
before any number below was taken:

```
git rev-parse HEAD origin/main
  27fa40402781eb3c906aa1f00c194c10bc61bf53
  27fa40402781eb3c906aa1f00c194c10bc61bf53
```

**This document is documentation only.** No `src/`, `bin/` or `test/` file is touched. No claim is
written. No stage is implemented. Nothing is refactored. Nothing is published.

---

# 0 · THE STALE LOCK — REMOVED

`.git/index.lock` was present, **0 bytes, 10 Sep 23:57**, left by a `git fetch` that failed against
a proxy. Removed. The working tree is clean and `HEAD` matches `origin/main`.

Recorded rather than passed over, because it is the same shape as a rule already in this project's
record: **a process that dies between "take the lock" and "do the work" leaves a lock that looks
like a lock somebody is holding.** No blame attaches to it; the cost was one command.

---

# 1 · SCOPE — AND THE FIRST FINDING IS THAT I CANNOT JUDGE IT

## 1(a) · 🔴 THE FROZEN PHASE 0 COMMAND CANNOT BE PRODUCED. I HAVE NEVER SEEN IT EITHER.

I was asked to write the frozen Phase 0 command back in its own words. **I cannot, and I will not
reconstruct it from context, because a reconstruction would be indistinguishable from an invention
and would then be used to judge scope.**

It is not in my conversation record, and it is not on disk. The search, so it can be repeated or
contradicted:

| where | command | result |
|---|---|---|
| any file named for the phase | `find C:/Projects -maxdepth 3 -iname "*phase*"` | only `_handoffs/PHASE_0_REPORT.md` for this project |
| any handoff mentioning it | `grep -ril "phase 0\|PHASE_0" C:/Projects/_handoffs --include=*.md` | 11 files, **all citing it, none containing it** |
| any handoff carrying its criteria | `grep -rlE "\bF[1-8]\b" C:/Projects/_handoffs --include=*.md` | `PHASE_0_REPORT.md` only |
| the stage / condition vocabulary | `grep -rlE "\bS12\b\|\bP9\b" C:/Projects/_handoffs --include=*.md` | `PHASE_0_REPORT.md`, `STAGE_STATUS_OBSERVED.md` |
| the repository | `ls C:/Projects/almi-visibility/*.md` | 17 documents, **no Phase 0 command** |

The nearest things that exist are `ALMIVISIBILITY_COMPLETION_PLAN.md` (phases **A–E**, not 0),
`ALMIVISIBILITY_THE_PRODUCT.md` (which defines the stages), and `STAGE_STATUS_OBSERVED.md`.
**None of them is a Phase 0 command, and none contains `F1`…`F8` or `P1`…`P9`.**

> ## 🔴 CONSEQUENCE, STATED PLAINLY
> **§1(c) is unanswerable as asked.** Naming what falls outside a boundary requires the boundary.
> Judging the report against a command I would have to invent would be **a label without a
> record** — which is the exact failure the report's own §9 confesses to, committed a second time
> and in the act of auditing the first.

**This is not a refusal to check the report.** §1(c) below checks it against the authority that
*is* on the record.

## 1(b) · The report was read in full

`_handoffs/PHASE_0_REPORT.md`, 15,082 bytes, all nine sections.

## 1(c) · SCOPE, JUDGED AGAINST THE ONE AUTHORITY ON THE RECORD

The authority I hold is the ruling as quoted to me: **"Phase 0 = OBSERVE / MEASURE / DOCUMENT.
Bas."** — plus the report's own `F7`. Against those:

### Nothing was built, and it is measured, not assumed

| check | command | result |
|---|---|---|
| commits after the measured head | `git log --oneline 27fa404..origin/main \| wc -l` | **0** |
| repository files changed | `git status --porcelain \| wc -l` | **0** |
| claims written | `npm run facts:validate` | **46 records** — unchanged |
| report written into the product repo | `ls PHASE_0_REPORT.md` | **absent** — it lives in `_handoffs` |

**`F7` holds. No scope breach of the "do not build" kind exists.** On the four items beta-g
specifically worried about — drifting toward the connected product — I find **no drift**: the
report names the connected product only as the thing being measured, and it explicitly refuses to
fill `B3` or `B4`.

### 🔴 BUT THERE IS ONE STRUCTURAL PROBLEM, AND IT IS INDEPENDENT OF THE MISSING COMMAND

> ## THE REPORT WRITES ITS OWN ACCEPTANCE CRITERIA IN §7, THEN CERTIFIES ITSELF AGAINST THEM.
>
> *"F1–F8 are met by this document as written."*

Whether **writing** criteria was authorised is genuinely **UNKNOWN** — the report's §0 claims it
was, and the command that would settle it cannot be read. **I mark the authorisation UNKNOWN and do
not rule on it.**

The **circularity** needs no such ruling:

> **A GATE MAY NOT BUILD ITS DENOMINATOR FROM ITS OWN OUTPUT.**

That law is already in this repository, enforced in code, and it was earned here — a gate once
scored `0.0000` or `~0.99` on the same page on the same day depending only on which population it
was judged against. A document that authors the criteria, satisfies the criteria and declares the
criteria satisfied is the same shape. **`F1`…`F8` are good criteria. It is the self-certification
that has no independent term in it** — which is precisely why this verification exists, and why the
verdict in §6 below is mine and not the report's.

⚠️ **`F8` has a second, narrower defect, and this document triggers it.** `F8` binds
reproducibility to a commit id — *"F8 holds only while `origin/main` is 27fa404."* **Merging this
verification, which changes not one line of code, makes that sentence false.** A criterion that a
documentation commit can break is measuring the commit id, not the reproducibility. **Recommended
restatement — not made here, because editing another author's frozen criteria is outside anything I
can show I am authorised to do:** *every number names a command that reproduces it on a clean
checkout of the commit the report names.*

---

# 2 · EVERY NUMBER, RE-MEASURED, WITH ITS COMMAND

**Legend — ✅ reproduced · 🔴 differs · ⚠️ not reproducible as stated.**

## 2.1 · Tests

| | reported | measured | |
|---|---|---|---|
| tests / suites / pass / fail | 248 / 42 / 248 / 0 | **248 / 42 / 248 / 0** | ✅ |

`npm test 2>&1 | grep -E '^ℹ (tests\|suites\|pass\|fail)'`

## 2.2 · The boundary law

| | reported | measured | |
|---|---|---|---|
| code lines naming a product | 0 | **0** (0 occurrences) | ✅ |
| comment lines naming a product | 71 | **71** | ✅ |

`node bin/product-boundary.mjs`

## 2.3 · Dependency direction — `src/` → `products/`

| | reported | measured | |
|---|---|---|---|
| imports | 0 | **0** | ✅ |
| occurrences of the string | 1 comment, `licences.mjs:227` | **1 comment, `src/facts/licences.mjs:227`** | ✅ |

```
grep -rn 'from "[^"]*products/' src/ | wc -l      →  0
grep -rn "products/" src/                          →  src/facts/licences.mjs:227 (a comment)
```

⚠️ **One paraphrase correction:** the verification request cited this as *"licences.mjs:245-ish"*.
**The report is right and the paraphrase is off by 18 lines: it is line 227.**

## 2.4 · `bin/` → `products/almi-oet`

| script | reported | measured | |
|---|---|---|---|
| `build-page.mjs` | 2 | **2** | ✅ |
| `nursing-chain.mjs` | 2 | **2** | ✅ |
| `placement-measure.mjs` | 2 | **2** | ✅ |
| `profession-chain.mjs` | 2 | **2** | ✅ |
| `distinguishing-census.mjs` | 1 | **1** | ✅ |
| `facts.mjs` | 1 | **1** | ✅ |
| `quote-match.mjs` | 1 | **1** | ✅ |
| **bound files / total** | 7 of 16 | **7 of 16** | ✅ |

`grep -rc 'from "[^"]*products/almi-oet' bin/*.mjs | grep -v ':0'` · `ls bin/*.mjs | wc -l`

The nine scripts the report calls product-neutral or engine-free were checked individually:
`grep -c 'products/' bin/<name>.mjs` returns **0 for all nine**. ✅

## 2.5 · 🔴 Test files bound to the product — THE REPORT IS WRONG HERE

| | reported | measured | |
|---|---|---|---|
| test files importing `products/almi-oet` | **5 of 5** | **🔴 3 of 5** | 🔴 |

```
for f in test/*.test.mjs; do echo "$f $(grep -c 'from "[^"]*products/almi-oet' "$f")"; done
  test/facts-registry.test.mjs      1
  test/gate-a.test.mjs              0     ← product-neutral
  test/nursing-page.test.mjs        3
  test/product-boundary.test.mjs    0     ← product-neutral
  test/product-registration.test.mjs 3
```

**`gate-a.test.mjs` (55 tests) and `product-boundary.test.mjs` (13 tests) import nothing from any
product.** 68 of 248 tests — **27% of the suite** — already run with no product in sight.

**This weakens the report's stated evidence for `A3` but not `A3` itself.** See §3.3, where `A3` is
re-proved on better evidence.

## 2.6 · 🔴 Modules, exports and tests — three figures differ

Exports were counted **twice, by different methods that agree with each other**: by declaration
(`grep -h '^export ' <dir>/*.mjs | wc -l`) and by importing each module and counting
`Object.keys(mod).length`.

| area | modules | exports reported | exports measured | tests reported | tests measured |
|---|---|---|---|---|---|
| `src/facts/` | 11 ✅ | 61 | **🔴 59** | 135 | **🔴 134** |
| `src/gate-a/` | 6 ✅ | 30 ✅ | **30** | 52 | **🔴 55** |
| `src/product.mjs` | — | 4 ✅ | **4** | 26 ✅ | **26** |

Per-module, for anyone who wants to find the two: `schema.mjs` **16** (the report says 15),
`licences.mjs` 11, `queues.mjs` 6, `quote-match.mjs` 6, `registry.mjs` 4, `third-party.mjs` 4,
`fingerprint.mjs` 3, `freshness.mjs` 3, `gaps.mjs` 3, `validate.mjs` 2, `record.mjs` 1 — **59**.

Test counts per file: `facts-registry` **134** · `gate-a` **55** · `nursing-page` 20 ·
`product-boundary` 13 · `product-registration` 26 — summing to 248. ✅

⚠️ **A method note that matters more than the three digits:** mapping a test FILE to a `src/` AREA
is an approximation, and `product-registration.test.mjs` shows why — its 26 tests exercise
`product.mjs`, `licences.mjs`, `gaps.mjs` **and** `claim-placement.mjs`. Attributing all 26 to
`src/product.mjs` overstates that module's coverage. **None of the three corrections changes a
single conclusion in the report.**

## 2.7 · The two chains

| | reported | measured | |
|---|---|---|---|
| `/nursing` rollout uniqueWords | 511 / 350 | **511 / 350 PASS** | ✅ |
| `/nursing` overlap A | 0.2890 | **0.2890** (S/U 560/689) | ✅ |
| `/nursing` overlap B | 0.3059 | **0.3059** (S/U 520/590) | ✅ |
| `/nursing` verdict | KEEP | **KEEP** | ✅ |
| `/speech-pathology` uniqueWords | 34 / 350 | **34 / 350 FAIL** | ✅ |
| `/speech-pathology` overlap A | 0.6974 | **0.6974** (S/U 742/161) | ✅ |
| `/speech-pathology` overlap B | 0.7167 | **0.7167** (S/U 688/136) | ✅ |
| `/speech-pathology` verdict | REJECT | **REJECT** | ✅ |

`node bin/profession-chain.mjs --page=nursing` · `--page=speech-pathology`

## 2.8 · The distinguishing census

| | reported | measured | |
|---|---|---|---|
| distinguishing / shared / UNCOMPARABLE | 0 / 0 / 14 | **0 / 0 / 14** | ✅ |
| variants covered | 2 of 12 | **2 of 12** | ✅ |

`node bin/distinguishing-census.mjs`

## 2.9 · The `A2` evidence line

| | reported | measured | |
|---|---|---|---|
| `bin/distinguishing-census.mjs:45` resolves the product at import time | line 45 | **line 45**, verbatim | ✅ |

`grep -n "products/almi-oet/product.mjs" bin/distinguishing-census.mjs`

## 2.10 · The `B3` debt

| | reported | measured | |
|---|---|---|---|
| sources with an unread licence | 7 | **UNREAD 7** | ✅ |

`node bin/facts.mjs census` — alongside PERMITTED 20, RESERVED 14, PROHIBITED 5.

## 2.11 · ⚠️ `U4` — THE CRLF CHURN IS **NOT** REPRODUCIBLE, AND THE REASON IS INSTRUCTIVE

| | reported | measured now | |
|---|---|---|---|
| modified files | 95 | **⚠️ 0** | ⚠️ |
| `git diff --ignore-all-space` | empty | **empty (0 bytes)** | ✅ |
| raw diff | 49,152 lines | **0 lines** | ⚠️ |

```
git status --porcelain | wc -l          →  0
git diff --ignore-all-space | wc -c     →  0
git diff | wc -l                        →  0
```

**The report was not wrong when it was written.** The churn was cleared by a `git reset --hard`
during the sync to `origin/main` after PR #17 merged — before the report was written, but the
report measured a tree that had not yet been re-checked.

> ### ⚠️ AND THIS IS THE ONE NUMBER `F8` STRUCTURALLY CANNOT COVER.
> **95 modified files was a WORKING-TREE state, not a property of `origin/main`.** `F8` requires
> every number to be reproducible against the commit. A working-tree number never can be — by
> anyone, on any machine, at any time.

**`U4` should stay open anyway, and I say so against my own measurement.** The cause — mixed line
endings meeting `core.autocrlf` — is latent in the repository and produced the symptom once. Its
danger is unchanged and correctly stated: **a tree where 95 files always show modified is a tree
where a real modification can hide.** What must change is its evidence, from a tree state to
something reproducible, e.g. `git ls-files --eol | grep -c "w/crlf"`.

## 2.12 · ⚠️ Two numbers in the report carry NO command, and one cannot have one

| number | where | status |
|---|---|---|
| market sibling overlap **0.0828 – 0.1305** | `U3`, `P1` context | ⚠️ **cited, not reproducible.** `grep -rl '0.0828'` finds it only as a recorded constant in `DISTINGUISHING_SUPPLY.md`, a comment in `src/page/claim-placement.mjs` and one in `bin/clinical-layer-census.mjs`. **No command regenerates it, and by our own licence decision no market text is stored** — the number is real and its evidence is deliberately not kept |
| sitemap 404 **across every host**, submission retried since August | `P6` | ⚠️ **cited from an earlier document, un-reproduced here, no command given** |

**Neither is a fabrication and neither should be deleted.** But `F8` as written claims *every*
number is reproducible on `origin/main`, and these two are not. The honest fix is for `F8` to name
its exceptions — a licence-driven refusal to store evidence is a **good** reason for a number to be
unreproducible, and hiding it inside a blanket claim is what makes it look like a bad one.

---

# 3 · GAP CLASSIFICATION — CHECKED ONE BY ONE

The owner's rule:

> **Connected product's missing data = CONNECTED PRODUCT DATA GAP.**
> **AlmiVisibility's missing generic mechanism = ARCHITECTURE / CAPABILITY GAP.**

## 3.1 · `A1` — the boundary law checks vocabulary, not import direction → **AGREE, architecture**

Verified: the law scans words; `src/` imports from `products/` are **0 today**, so this is a
**missing check, not a present violation**. A `src/` file could import a product through a neutral
identifier and the law would pass it. The missing thing is a mechanism in AlmiVisibility.
**Register correct.**

## 3.2 · `A2` — every entry point is product-bound → **AGREE, architecture**

Verified at 7 of 16, with `distinguishing-census.mjs:45` resolving the product **at import time**.
No entry point accepts a product id or descriptor path. The arithmetic is generic; the binding is
not. **Register correct**, and this is the load-bearing one — see §3.4.

## 3.3 · `A3` — portability is asserted, not demonstrated → **AGREE with the gap, CORRECT its evidence, and it is now proved HARDER**

The stated evidence ("all five test files import `products/almi-oet`") is **wrong — it is 3 of 5**
(§2.5). The gap survives on stronger evidence:

```
grep -rn "registerProduct(" test/ bin/ products/ src/ | grep -v "^src/product.mjs"
  → 8 hits in test/product-registration.test.mjs, EVERY ONE inside assert.throws(...)
  → 1 hit: products/almi-oet/product.mjs:43

node -e "…import the product, then registeredProducts()"   →  [ 'almi-oet' ]
```

> ### 🔴 EVERY `registerProduct` CALL IN THE SUITE OTHER THAN ALMIOET'S IS ASSERTED TO **THROW**.
> **No second product is ever successfully registered, anywhere, at any point.** At runtime exactly
> one product exists.

That is a far better proof than counting imports: a file could import a product and still be
generic, and a file could import none and still be product-bound. **`A3` confirmed. Register
correct.**

## 3.4 · `A4` — `package.json` is one product's task list → **AGREE, architecture, with a refinement**

Verified: **13 scripts**, of which `chain`, `census`, `census:distinguishing`, `census:clinical`,
`page`, `placement` and `profession-chain` are one product's workflow.

**Refinement, offered rather than disputed:** `A4` is **downstream of `A2`, not independent of
it.** An operator surface can only be product-neutral once the entry points beneath it take a
product as an argument. Recorded so that a later phase does not price them as two jobs, and does
not "fix" `A4` cosmetically while `A2` stands.

## 3.5 · `B3` — 7 unread licences → **AGREE, connected product data gap**

The mechanism exists and works: `UNREAD` is a first-class quotability state, it is never a
permission, and a test counts the debt rather than hiding it. **What is missing is somebody reading
seven documents. That is data, not architecture.** Register correct.

## 3.6 · `B4` — registry covers 2 of 12 variants → **AGREE, connected product data gap**

`coverage()` reports declared 12 / built 2 / missing 10, and the census reports `UNCOMPARABLE 14`
**correctly** — it has nothing to compare. The capability behaved; the supply did not exist.
**Register correct**, and the report's §1 makes this argument well: read carelessly this looks like
a broken capability, and filing it that way would have produced work on the wrong product.

## 3.7 · `F3` — is any gap in BOTH registers?

**No.** Cross-checked all six plus `B1` and `B2`. The two owner-action blockers (`B1` GSC access,
`B2` the database split) sit in a third register — **owner action** — which is neither of the
owner's two and is not claimed to be. That is a reasonable extension and not a double-listing.
**`F3` holds.**

## 3.8 · Disagreements

**None on register.** All six classifications are correct. The corrections are to `A3`'s
**evidence** (§3.3) and to `A4`'s **independence** (§3.4).

---

# 4 · WHAT WAS ASKED ABOUT AND IS NOT IN THE REPORT

Beta-g flagged three suspected omissions and said the decision rests on §1(c). **§1(c) is blocked
by the missing command, so each is recorded as `UNKNOWN` rather than written.** Per the standing
instruction: *if in doubt whether something is in Phase 0 — write "UNKNOWN, not clear in the frozen
command" and do not do it.*

| suspected omission | what the report actually contains | verdict |
|---|---|---|
| **COSTS** | cost is **observed as absent** in four places: `S1` ("not present: cost limits and authorization boundaries in the descriptor"), `S9` (cost gate absent), `S10` (cost governor absent), `P9`. What is missing is any **measurement of what Phase 0 itself cost** | **UNKNOWN** whether Phase 0 requires cost measurement. **Not written.** |
| **ISOLATION contract** | §4 **describes** it — *"a run for one never reads another's evidence, axes, records, costs or learning"* — and `P5` marks it SPECIFY-now, PROVE-later. It is **not measured**, and it **cannot be**: measuring isolation requires a second registered product, and there is exactly one (§3.3) | **Correctly not measured.** `F4` asks only for description, and description exists. **Not a gap.** |
| **PREREQUISITES, complete list** | `B1`, `B2` (owner action), `B3`, `B4` (data), `U1`–`U4`. No section is titled "prerequisites" | **UNKNOWN** whether a distinct prerequisites list is required. The content appears to be present under other headings. **Not written.** |

**I add nothing to the report.** Writing sections into another author's frozen deliverable, on a
scope boundary I have just testified I cannot read, would be the scope expansion this verification
was commissioned to catch.

---

# 5 · ONE THING I WOULD HAVE MISSED, RECORDED

The verification request supplied the numbers to check. **Had I checked only those, I would have
confirmed `U4` as "95 files, ignore-all-space empty" — because the second half is still true.** It
was re-running `git status` from scratch, rather than re-reading the reported figure, that showed
**0 modified files**.

> **A number handed to you for verification arrives with its framing attached. Re-derive it from
> the source, not from the sentence.**

---

# 6 · VERDICT ON `F1`…`F8`

| # | criterion | verdict |
|---|---|---|
| **F1** | every stage `S1`…`S12` carries a status naming its evidence | ✅ **MET.** 12 of 12 rows, each naming a file, an export count or an explicit "no module, no script, no test". 1 present · 5 partial · 6 absent — re-counted from the table |
| **F2** | every product-bound dependency inventoried by file with import count | ✅ **MET**, and reproduced exactly — 7 of 16 `bin/`, counts per file all correct |
| **F3** | every gap in exactly one register, none in both | ✅ **MET.** All six checked individually; no double-listing |
| **F4** | required interfaces described, nothing implemented | ✅ **MET.** §4 describes five interfaces; `git status` shows 0 changed files and `registeredProducts()` returns one product |
| **F5** | every blocker names its owner; every UNKNOWN names its resolving measurement | ✅ **MET.** `B1`/`B2` owner action · `B3`/`B4` data gap · `U1`–`U4` each name a resolving measurement |
| **F6** | `P1`…`P9` mapped SPECIFY/MEASURE-now vs IMPLEMENT/PROVE-later | ✅ **MET.** All nine mapped |
| **F7** | nothing written, implemented, refactored, published or written to production | ✅ **MET, and measured** — 0 commits after `27fa404`, 0 changed files, 46 records unchanged, the report stored outside the product repository |
| **F8** | every number reproducible by a named command against `origin/main` | 🔴 **NOT MET.** Three exceptions: `U4`'s 95 modified files is a working-tree state and **cannot** be reproducible against a commit; the market overlap `0.0828–0.1305` and the sitemap 404 are **cited without a command**, the first deliberately so, because storing the evidence is refused on licence grounds |

## 🔴 AND THE VERDICT ON THE VERDICT

**Seven of eight met.** The report is accurate, and three small figures out of roughly forty differ
(§2.5, §2.6) — **none of which changes one of its conclusions.** Its six gap classifications are
all correct. Its central finding — that the distinguishing capability's arithmetic is generic while
its binding is not — is verified line by line.

Two things stand against it, and both are structural rather than sloppy:

1. **`F8` is not met**, and part of it **cannot** be met as written. It should name its exceptions
   and bind reproducibility to a clean checkout rather than to a commit id — a criterion that a
   documentation-only merge can falsify is measuring the wrong thing, and **merging this very
   document falsifies it.**
2. **The report certifies itself against criteria it wrote.** *A gate may not build its denominator
   from its own output.* Whether writing the criteria was authorised is **UNKNOWN** and I do not
   rule on it. The circularity needs no ruling, and this document is the independent term that was
   missing.

## 🔴 AND THE FINDING THAT OUTRANKS ALL OF THEM

> ## THE FROZEN PHASE 0 COMMAND EXISTS NOWHERE THAT EITHER OF US CAN READ.
>
> Two agents have now written substantial work against it — a report and this verification — and
> **neither can quote it.** Every scope judgement either of us makes is therefore made against a
> remembered boundary, and a remembered boundary drifts in the direction of whatever is currently
> being built.
>
> **This is the one item here that needs the owner, and it needs him before Phase 1 is scoped, not
> after.** If the command exists, it should be written to `_handoffs/` under its own name. If it
> only ever existed in conversation, then `F1`…`F8` are the *de facto* frozen criteria — which is
> defensible, but it should be **decided** rather than inherited by default from the only document
> that happens to contain them.

---

## WHAT THIS VERIFICATION DID NOT DO

- **No claim written**, of any kind, for any variant.
- **No stage implemented.** `A1`, `A2`, `A3`, `A4` are **recorded, not fixed.**
- **No refactor.** `bin/`'s product-bound imports are untouched — that is Phase 1.
- **CRLF not fixed** — measured and recorded only.
- **No `src/`, `bin/` or `test/` file touched.** This PR adds one document.
- No page published, generated or fixed. No production write. No deploy.
- **No threshold moved. No test silenced.**
- **No new authorisation requested**, except the one decision in §6 that only the owner can make.
