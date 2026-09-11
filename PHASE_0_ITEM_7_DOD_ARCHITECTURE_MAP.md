# PHASE 0 · FROZEN ITEM 7 — QUALITY GATES AND THE DEFINITION OF DONE, MAPPED TO ARCHITECTURE

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

**Read first, per AUDIT ONCE:** `ARCHITECTURE_AND_GAP_REPORT.md` **§10** (Gate A), **§11** and
**§11a** (Gate B), **§11b** (Gate C). **None is rewritten.** All three gates are already **FROZEN**
there, with their thresholds, their denominator rule and Vercel's own documentation quoted.

🔴 **Nothing implemented. No gate written, changed, tightened, loosened or run for this document.
No threshold moved.** The DoD statuses below are read from measurements already taken in this
Phase 0, each naming its evidence.

---

# 1 · WHAT §10–§11b ALREADY ANSWER — RECORDED, NOT RE-DERIVED

| | already answered |
|---|---|
| **Gate A** — pre-publish | §10, **frozen**: unique words, factual support, sibling overlap, shell detection, and the denominator rule — *a gate may not build its denominator from its own output* |
| **Gate B** — post-publish | §11, **frozen**; §11a adds the evidence and the correction that stopped it being conjecture |
| **Gate C** — cost per crawl | §11b, **frozen**, with Vercel's ISR documentation quoted, dated and corrected in one place by the vendor's own text |
| gate families present vs absent | §9 of the Phase 0 report: **3 of 7** — factual, duplicate (lexical), right-to-exist present; **semantic, cannibalization, technical, cost absent** |

**The hole item 7 names is the other half of its own sentence:**

> *"existing quality gates **and the product Definition-of-Done** mapped into architecture" —
> **`DOD-01…DOD-20 + DOD-03A` is not mapped into the architecture anywhere.**"*

---

# 2 · THE MAP

**Architectural home** = the module or stage that would satisfy the requirement. **State** is
measured, not inherited. Where the state differs from the 10 September handoff table, it is marked
🔄 and the evidence is named.

| # | requirement | architectural home | state today | evidence |
|---|---|---|---|---|
| **01** | Phase 0 | the audit documents themselves | 🟡 **in progress** — items 1–6 done, 7 and 9 outstanding, one frozen register to follow | this series |
| **02** | Data isolation | Neon project + environment scoping | 🔴 **separate project ✅, but preview and production are THE SAME DATABASE** | §2b, measured by host comparison and by asking each server its identity |
| **03** | Crawler + cost controls | S4/S5 — **does not exist** | 🔴 **corpus builder only.** `bin/build-corpus.mjs` fetches; it audits nothing and controls no cost | item 4, `CRW-1` |
| **03A** | **Fact Supply Engine** | `src/facts/` — 11 modules, 59 exported names, **134 tests** | 🔄 🟡 **BUILT AND RUNNING — the handoff table's "not started" is stale.** 46 records validate clean; the engine is not the problem. **It fails on SUPPLY: 2 of 12 variants** | `npm run facts:validate`; the distinguishing census |
| **04** | Demand / query clusters | S2 — **does not exist** | 🔴 **blocked on read-only GSC access** | item 3 |
| **05** | Technical SEO engine | S5 — **does not exist** | 🔴 not built. Item 2 measured the surface **by throwaway script**, deliberately outside the repo | `SEO-1` |
| **06** | Duplicate / thin / cannibalization | `src/gate-a/overlap.mjs`, `tokens.mjs`, `shell.mjs` | 🟡 **lexical duplicate + thin ✅ · semantic ❌ · cannibalization ❌** | §10; the Phase 0 report §2 |
| **07** | No blind regeneration | S10 — **does not exist** | 🔴 not built | §2 of the Phase 0 report |
| **08** | Pre-publish gate | `src/gate-a/run.mjs` + `src/page/` | 🟡 **furthest along** — words, facts, overlap ✅ · URL justification, technical preflight, source integrity ❌ | §10 |
| **09** | Post-publish indexation | S11 — **does not exist** | 🔴 **blocked on read-only GSC access** | item 3 |
| **10** | Scaling pause / advance | S7 — partial | 🔴 designed in §11, not built | §11 |
| **11** | Entity / link / citation | **does not exist** | 🔴 not built | — |
| **12** | GEO / AEO / AIO | **does not exist** | 🔴 not built. ⚠️ **And 12 products' `robots.txt` disallow the very AI crawlers this would measure** | §4 of the architecture report |
| **13** | Funnel | **does not exist here** | 🔴 not built — **and the only data source in the estate is one product's own `FunnelEvent` table**, which nothing in AlmiVisibility reads | `ANL-1`, items 1–2 |
| **14** | Cost governor | **does not exist** | 🔴 not built. ⚠️ **Gate C is a GATE, not a GOVERNOR** — it judges; nothing stops spend | §11b; `CRW-2` |
| **15** | Case Study 6/6 + 0/3 | `case-study-01/` + `bin/acceptance-test.mjs` | 🟡 **corpus verified frozen — 9 of 9 pages intact. THE TEST HAS NEVER BEEN RUN** | item 6, `CS-3` |
| **16** | Real recrawl evidence | needs a published cohort | 🔴 needs publication **and** GSC | items 3, 4 |
| **17** | Owner-facing explainability | **does not exist** | 🔴 no interface. ⚠️ **The deployment surface that would host one currently serves the repository** | `DEP-2` |
| **18** | Safety / retry / audit / rollback | `src/write-law.mjs`, 7 exports | 🟡 **write law only** — dry-run default, `--confirm` local, `--confirm` + `ALLOW_PROD_WRITE=1` for production. **No retry, no audit trail, no rollback** | §2c |
| **19 · 20** | No blocker · final audit | — | 🔴 **`B1` and `B2` are open owner actions**, so 19 cannot be satisfied by definition | §5 of the Phase 0 report |

## 2.1 · 🔴 ONE STATUS CHANGED, AND IT CHANGED IN THE GOOD DIRECTION

The 10 September handoff records **`DOD-03A` as "not started. The key to 08, 09, 15, 16"**. Since
then the engine was built, merged and measured: **11 modules, 59 exported names, 134 tests, 46
records validating clean.**

> **`DOD-03A` is not unstarted. It is built and it is failing on SUPPLY, not on engineering** —
> the registry covers **2 of 12** declared variants, and the distinguishing census reports
> `UNCOMPARABLE 14 of 14` **correctly**, because it has nothing to compare.

**That distinction decides what work would close it, and the stale label pointed at the wrong
work.** It is the same defect class as `DOC-1`: **a status that did not follow the change.** Third
instance recorded in this Phase 0.

## 2.2 · What the map shows when it is read as a whole

| | count |
|---|---|
| 🔴 not built at all | **12** |
| 🟡 partial | **7** |
| ✅ complete | **0** |
| blocked on an **owner action** rather than on work | **4** — `04`, `09`, `16` on GSC; `02` on the database split |
| blocked on **supply**, not engineering | **1** — `03A` |

> ### 🔴 NOT ONE OF TWENTY-ONE IS COMPLETE, AND `DOD-19` CANNOT BE, BY DEFINITION, WHILE ANY BLOCKER IS OPEN.

⚠️ **And the gates are the exception that proves the shape:** the three that exist are **frozen and
measured**, while twelve requirements have no architectural home at all. **The estate is not half
built — it is three things built carefully and twelve not begun.**

---

# 3 · THE FOUR GATE FAMILIES THAT DO NOT EXIST

Named because §9 counts them and nothing maps them:

| family | would live in | why it is not a rename of an existing gate |
|---|---|---|
| **semantic duplication** | beside `src/gate-a/overlap.mjs` | lexical Jaccard passes a semantic rewrite. **The owner's own formula — same facts, local wording — is exactly that case**, so the gate would green-light the failure it exists to stop |
| **cannibalization** | a cross-page measure; **no module** | needs a corpus-wide view, which no runner has |
| **technical** | S5 | item 2's SEO sweep was run by **throwaway script**; nothing in the repository performs it |
| **cost** | a governor, not a gate | Gate C judges a crawl's cost. **Nothing caps, meters or refuses spend** |

---

# 4 · UNKNOWNs — FOUR FIELDS

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-DOD-1** | whether the DoD text itself has changed since the statuses were written | the list is read from a handoff table, not from a frozen DoD document in this repository | the frozen DoD document, wherever it is held | **owner** | when the DoD changes |
| **U-DOD-2** | whether `DOD-06`'s "semantic" requirement means embeddings or a rule | the requirement is named, never specified | the DoD's own wording for `DOD-06` | **owner** | before `06` is built |
| **U-DOD-3** | what `DOD-17` must explain, and to whom | "owner-facing explainability" names an audience, not a contract | the DoD's wording, or the owner's own description of what he needs to see | **owner** | before `17` is built |
| **U-DOD-4** | whether `DOD-18`'s "rollback" means content, database or deployment | three different mechanisms, one word | the DoD's wording | **owner** | before `18` is built |

⚠️ **All four are the same shape: the DoD is being mapped from a STATUS TABLE, not from its own
frozen text.** A map drawn from a summary inherits the summary's silences — **which is exactly the
failure `DOC-1` records, applied to a different document.**

---

# 5 · GAP REGISTER — ADDITIONS

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **GATE-1** | four of seven gate families have **no architectural home**: semantic, cannibalization, technical, cost | §3 |
| **GATE-2** | **Gate C is a gate, not a governor.** It judges cost; nothing caps, meters or refuses spend | §2, `DOD-14` |
| **DOD-MAP-1** | the DoD is mapped from a **status table**, not from its own frozen text, and that text is not held in this repository | §4 |
| **DOC-1** *(third instance)* | `DOD-03A` carried "not started" after the engine was built, merged and measured | §2.1 |

## PRODUCT DATA GAPS

**None added by this document.**

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **Nothing implemented.** No gate written, changed, tightened, loosened or run for this
  document. **No threshold moved.**
- **§10, §11, §11a, §11b not rewritten.** The three frozen gates are untouched.
- **No DoD item's requirement reworded**, and **no status upgraded without evidence** — the one
  status that changed (`DOD-03A`) names the measurement that changed it.
- **The four missing gate families were NAMED, not designed.** Where each would live is recorded;
  none is specified.
- **`A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, `CS-1`, `CS-2`, CRLF — recorded, not fixed.**
- **No claim, no page, no build, no schema, no refactor, no Phase 1 code. No new GREEN requested.**
