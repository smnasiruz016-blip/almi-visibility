# CASE STUDY #1 — RUN 01

**11 September 2026.** The instruction was: **run it.** This document reports what happened.

> # 🔴 IT COULD NOT BE RUN.
>
> **And that is NOT a FAIL.** A FAIL means the engine ran and missed defects. **Nothing ran**, for
> two independent reasons, either of which alone is sufficient.

🔴 **Nothing was tuned, nothing was adjusted and no result was manufactured.** No live fetch, no
product repository touched, no cost incurred, no threshold moved. **The corpus, the exhibits,
Amendment 1 and the pass mark were not touched.**

---

# 1 · THE PASS CRITERIA, RESTATED BEFORE THE RESULT

| | |
|---|---|
| **PASS** | **6 / 6 RED** found independently **AND** **0 / 3 CONTROL** false positives |
| **FAIL** | anything else — **one control false positive is a FAIL** |

**Frozen by Amendment 1, owner-approved, and protected by §12's anti-rewrite law.** Written here
first, before any result, so the result cannot be read backwards into the criteria.

---

# 2 · 🔴 BLOCKER ONE — NOTHING IN THE REPOSITORY IMPLEMENTS THIS TEST

## 2.1 · `bin/acceptance-test.mjs` is a different instrument

It exists, and `U-CS-1` asked whether it implements **this** contract. **Measured: it does not.**

| | |
|---|---|
| what it does | splices a hand-written fact block into **one corridor page's** HTML and re-runs Gate A |
| its verdict | **`KEEP` / `REJECT`** for that page |
| what the contract needs | **`6/6 RED` and `0/3 CONTROL`** across nine defect fixtures |
| its arguments | `--corpus --group --page --facts` — a corridor group, not a defect set |

**Evidence, not reading:** pointed at the frozen corpus it does not run at all.

```
node bin/acceptance-test.mjs --corpus case-study-01/corpus
  → usage: ... [--group g] [--page id] [--facts dir]     (exit 2)
```

It expects `<corpus>/<group>/` and a `facts.json` + `fact-block.html`. **The Case Study corpus has
no such shape, because it is not that kind of input.**

## 2.2 · No code anywhere knows the contract

```
grep -rniE "red-?[1-6]\b|control-?[1-3]\b|6/6|0/3|falsePositive" src bin test
  → no matches
```

**Not one module names a RED, a CONTROL, a false positive, or the pass mark.**

## 2.3 · And each of the six needs a capability the register already records as ABSENT

| RED | what must be detected | capability | state |
|---|---|---|---|
| **1** | a public promise of a grade band the scoring engine never issues | content ↔ data cross-check (S8) | 🔴 absent |
| **2** | an external-authority claim with **no source-registry evidence** | factual-evidence on rendered content (S8) | 🔴 absent |
| **3** | declared render mode ≠ served state | technical audit (S5) | 🔴 absent |
| **4** | a sitemap URL that 404s / redirects / is non-indexable | technical audit (S5) | 🔴 absent |
| **5** | a rendered count that disagrees with the underlying data | content ↔ data cross-check (S8) | 🔴 absent |
| **6** | a link present in source, absent from rendered HTML | source-vs-rendered (S5/S8) | 🔴 absent |

⚠️ **RED 2 was checked most carefully, because Gate A does have a facts gate.** It does not reach:
`countFacts` **counts fact objects handed to it by the caller** and requires value + source URL +
tier + verified date. **It never reads a page to find a claim that has no evidence.** The module's
own header says as much — *"the URL RESOLVES ✅ checkable · the page at it SUPPORTS this claim ❌ NOT
TODAY."*

> ### **THE ENGINE THIS TEST EXISTS TO PROVE HAS NOT BEEN BUILT YET. GATE A IS A PAGE-QUALITY GATE, NOT A DEFECT DETECTOR.**

---

# 3 · 🔴 BLOCKER TWO — ONE OF THE SIX INPUTS IS NOT FROZEN

Measured from the corpus, the exhibit index and Amendment 1's own table. **The six REDs do not live
in one place — they live in three:**

| RED | input | frozen? |
|---|---|---|
| **1** | exhibit — `almi-oet` @ `8877c6e` | ✅ pinned by commit |
| **2** | 🔴 **the live site** — recorded as *"live-confirmed"*, and it has **no exhibit and no corpus page** | ❌ **NOT FROZEN** |
| **3** | corpus — 4 × `red3-*` pages | ✅ hash-verified |
| **4** | exhibit — `almi-italian` @ `d83ddd9` | ✅ |
| **5** | exhibit — `almi-oet` @ `e99b199` | ✅ |
| **6** | exhibit — `almi-italian` @ `14a0f7d` | ✅ |
| **CONTROL 1–3** | corpus — 3 pages | ✅ |

> ### 🔴 RED 2 CANNOT BE EXERCISED UNDER THIS COMMAND AT ALL — A LIVE FETCH IS FORBIDDEN, AND IT HAS NO FROZEN COPY.
>
> **So even with a finished detector, the best obtainable result today would be 5/6 — a FAIL — for a
> reason that has nothing to do with the engine.**

**This also answers `U-CS-4`,** which asked whether nine pages could exercise six REDs and three
controls. **They cannot, and they were never meant to:** the corpus carries RED 3 and the controls;
the exhibits carry four; **RED 2 carries nothing.**

---

# 4 · §24 — THE FAIL-CAPABLE DEMONSTRATION, AND WHY IT COULD NOT BE DONE HERE

The instruction was to show deliberately broken pages going RED and restored pages going GREEN — **on
the Case Study, not only on the boundary law.**

🔴 **It cannot be demonstrated on a detector that does not exist.** There is nothing to turn red.

**What HAS been demonstrated, on three other laws, with restore-on-abort — recorded so the gap is
exact rather than general:**

| law | sabotage | result |
|---|---|---|
| the product-boundary law | a string literal · a product word as an object key · a comment full of product words | **RED · RED · green** (the third correctly) |
| the isolation law | `resolve()` searching every tenant · `declaredGaps()` returning everyone's | **RED · RED** |
| the entry-point law | a runner importing a deleted export · a runner importing a product | **RED · RED** |

> **Three laws are fail-capable and proven so. The one that matters most for `DOD-15` has nothing to
> prove it with.**

---

# 5 · THE RESULT, STATED PLAINLY

| | |
|---|---|
| REDs found | **0 of 6** — because nothing looked |
| CONTROLs falsely flagged | **0 of 3** — ⚠️ **and this number is meaningless.** Nothing examined them either. **A detector that never runs has a perfect false-positive rate** |
| **verdict** | 🔴 **NOT RUN.** Not PASS. **Not FAIL.** |
| `DOD-15` | 🟡 **unchanged** |
| `CS-3` | **unchanged** — the test has still never been run |

> ### 🔴 THE ZERO FALSE POSITIVES IS THE MOST DANGEROUS NUMBER IN THIS DOCUMENT.
> It is the half of the pass mark that a broken run satisfies **by doing nothing**, and it would read
> as good news in any summary that quoted it alone. **It is quoted here only with the reason it is
> worthless.**

**And §16 of the DoD names this exact shape as something that does NOT mean done:** *"One successful
demo works"* · *"The engine detects defects but also flags clean control pages."* **Neither applies
yet, because there is no engine to describe either way.**

---

# 6 · WHAT WOULD MAKE THIS RUNNABLE — recorded, not requested, not built

| # | need | belongs to |
|---|---|---|
| **1** | a defect detector for the six types — S5 (technical audit) and S8 (content ↔ data) | `DOD-05`, `DOD-11`; both 🔴 not built |
| **2** | a runner that reads the corpus **and** the four exhibits, scores 6/6 + 0/3, and reports per-defect | new — `CS-4` |
| **3** | 🔴 **a frozen input for RED 2**, or an owner ruling that RED 2 is exercised live | **owner** — `CS-5` |

⚠️ **Need 3 is the one that cannot be engineered around.** A frozen test with one unfrozen input is
not fully frozen, and **the day RED 2's live page is fixed, that RED becomes unreproducible for
ever** — which is the exact decay Amendment 1 was written to prevent, still present in one of six.

---

# 7 · §26 — THE REQUIRED DOCUMENTS, MEASURED

⚠️ **Source caveat, stated first:** the V5.1 build spec is **not on this machine** — the same place
the DoD text turned out to be. The list below is extracted from **`AlmiVisibility_V5_FINAL.docx`**,
the newest spec that IS here. **It names 20 documents; V5.1 may differ, and no name was invented.**

| | count |
|---|---|
| named by the spec | **20** |
| **present** | **2** |
| **absent** | **18** |

## Present

| document | where |
|---|---|
| `AI_VISIBILITY_TARGETS.md` | `_handoffs` |
| `KEYWORD_INTENT_MAP.md` | `_handoffs` |

## Absent — and what, if anything, covers part of the ground under another name

| required | nearest existing thing | is it the same? |
|---|---|---|
| `ARCHITECTURE.md` | `ARCHITECTURE_AND_GAP_REPORT.md` | 🟡 **partly** — it is an audit of what exists, not a design of what is intended |
| `TEST_PLAN.md` | the 268-test suite + `CASE_STUDY_01_ACCEPTANCE_TEST.md` | 🟡 **partly** — tests exist; a **plan** does not |
| `SOURCE_PROVENANCE_STANDARD.md` | `FACT_CACHE_DESIGN.md` + `_handoffs/SOURCE_QUOTABILITY.md` | 🟡 **substantially** — provenance, tiering and licence law are specified in detail, under other names |
| `SECURITY_AND_COST_GUARDRAILS.md` | `src/write-law.mjs` | 🟡 **the write law only** — that is code, not a document, and **cost guardrails do not exist at all** (`GATE-2`) |
| `POST_BUILD_VERIFICATION.md` | `PHASE_0_VERIFICATION.md` | 🔴 **no** — that verifies an audit, not a build |
| `DATA_MODEL.md` | the registry's `schema.mjs` + `record.mjs` | 🟡 **for facts only**; nothing for pages, issues, crawls or costs |
| `PAGE_OPPORTUNITY_MODEL.md` | `PROFESSION_PAGE_CLAIM_INVENTORY.md`, `TARGET_SHAPE.md` | 🟡 **one product's page shape**, not an opportunity model |
| `DEPLOYMENT_AND_ROLLBACK.md` · `IMPLEMENTATION_CHANGELOG.md` · `USER_GUIDE.md` · `API_CONNECTOR_INVENTORY.md` · `PRODUCT_FORMULAS.md` · `COUNTRY_LOCALE_MODEL.md` · `SEO_AUDIT_SPEC.md` · `GEO_AEO_AI_VISIBILITY_SPEC.md` · `INTERNAL_LINK_ECOSYSTEM_SPEC.md` · `LOCAL_SEARCH_INTELLIGENCE_SPEC.md` · `AI_VISIBILITY_MEASUREMENT.md` | — | 🔴 **nothing** |

**No document was written. Only the list and its state.**

---

## WHAT THIS RUN DID NOT DO

- 🔴 **The engine was not changed to suit a result.** There was no result to suit.
- 🔴 **The corpus, the exhibits, Amendment 1 and the pass mark were not touched.**
- **No live fetch.** RED 2 was left unexercised rather than fetched.
- **No connected product modified** — `almi-oet` and `almi-italian` were read only, and only through
  commit existence checks already made.
- **No detector written.** Building the thing this test exists to judge, in order to pass it, is the
  circularity the whole contract guards against.
- **No document from §26 was written.** Measured only.
- **No claim, page, build, DB, schema, crawler, cost, publish, deploy, Vercel/Neon setting, or
  threshold.** No Phase 1 code.
