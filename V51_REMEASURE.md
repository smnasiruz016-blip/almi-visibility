# RE-MEASURED AGAINST THE V5.1 TEXT

**11 September 2026.** Source: `_handoffs/V51_MASTER_BUILD_COMMAND_SOURCE.md` — 13,701 words,
49 sections, verbatim with its provenance header.

> **Precedence, in the document's own words:** *"Where this addendum conflicts with an earlier V5
> capability description or the earlier final command, **this V5.1 addendum and the V5.1 Master Build
> Command below win**."*
>
> **So every count below is V5.1's, and where V5 differs, V5.1 is taken.**

🔴 **Measurement only. Nothing built, no document written, no status changed without a quote from
the text, no live fetch, no threshold moved.** 268 tests pass, boundary 0 code lines.

**Every count in this file was produced by a script over the section blocks, not by eye:**
**§24 = 12 · §26 = 18 · §27 = 17 · v0.1 DONE = 9.**

---

# A · §26 — THE REQUIRED DELIVERABLES, RE-MEASURED

## A.1 · 🔴 MY EARLIER COUNT WAS MEASURING THE WRONG LIST

| | named | present | absent |
|---|---|---|---|
| what I reported from **V5_FINAL.docx** | 20 | **2** | 18 |
| **V5.1 §26 — the list that wins** | **18** | 🔴 **0** | **18** |

**The 18 absent are the same 18.** What changed is the two I called *present*.

### The difference, named

`AI_VISIBILITY_TARGETS.md` and `KEYWORD_INTENT_MAP.md` are **not in §26 at all.** In V5.1 they appear
once, at line 967, in a row about *"Existing artifacts to ingest rather than rebuild"*, marked
**"EXISTS — ingest, do not re-derive."**

> ### 🔴 THEY ARE INPUTS, NOT DELIVERABLES. I COUNTED THEM AS DELIVERED WORK.
>
> **The corrected reading is worse than the one I gave: not 2 of 20 delivered, but ZERO of 18.**
> Every whole-document grep is a wider net than the section it is meant to measure, and the two
> extra names were the difference between "we have started" and "we have not".

⚠️ **And the direction of the error is the one that matters.** It made the position look better than
it is — which is the direction nobody double-checks.

## A.2 · The 18, and what exists under another name

**No document was written. This is the list and its state.**

| # | required by §26 | state | nearest existing thing |
|---|---|---|---|
| 1 | `ARCHITECTURE.md` | 🟡 **partly** | `ARCHITECTURE_AND_GAP_REPORT.md` — an **audit of what exists**, not a design of what is intended |
| 2 | `DATA_MODEL.md` | 🟡 **facts only** | `src/facts/schema.mjs` + `record.mjs`. **Nothing for pages, issues, crawls or costs** |
| 3 | `PRODUCT_FORMULAS.md` | 🔴 nothing | — |
| 4 | `COUNTRY_LOCALE_MODEL.md` | 🔴 nothing | — ⚠️ and §27 asks for **197 countries and directional corridors** |
| 5 | `SOURCE_PROVENANCE_STANDARD.md` | 🟡 **substantially** | `FACT_CACHE_DESIGN.md` + `_handoffs/SOURCE_QUOTABILITY.md` — tiering, provenance and licence law are specified in detail, under other names |
| 6 | `PAGE_OPPORTUNITY_MODEL.md` | 🟡 **one product's page shape** | `PROFESSION_PAGE_CLAIM_INVENTORY.md`, `TARGET_SHAPE.md` — not an opportunity model |
| 7 | `SEO_AUDIT_SPEC.md` | 🔴 nothing | — |
| 8 | `LOCAL_SEARCH_INTELLIGENCE_SPEC.md` | 🔴 nothing | — |
| 9 | `GEO_AEO_AI_VISIBILITY_SPEC.md` | 🔴 nothing | — |
| 10 | `AI_VISIBILITY_MEASUREMENT.md` | 🔴 nothing | — |
| 11 | `INTERNAL_LINK_ECOSYSTEM_SPEC.md` | 🔴 nothing | — |
| 12 | `API_CONNECTOR_INVENTORY.md` | 🔴 nothing | — |
| 13 | `SECURITY_AND_COST_GUARDRAILS.md` | 🟡 **half of one half** | `src/write-law.mjs` — **code, not a document**, and **cost guardrails do not exist at all** (`GATE-2`) |
| 14 | `TEST_PLAN.md` | 🟡 **tests, not a plan** | 268 tests + `CASE_STUDY_01_ACCEPTANCE_TEST.md` |
| 15 | `IMPLEMENTATION_CHANGELOG.md` | 🔴 nothing | — ⚠️ git history is not a changelog against this contract |
| 16 | `DEPLOYMENT_AND_ROLLBACK.md` | 🔴 nothing | — ⚠️ and **every merge deploys** (`DEP-1`) |
| 17 | `USER_GUIDE.md` | 🔴 nothing | — |
| 18 | `POST_BUILD_VERIFICATION.md` | 🔴 nothing | `PHASE_0_VERIFICATION.md` verifies **an audit, not a build** |

**0 delivered · 6 partly covered under other names · 12 with nothing at all.**

---

# B · §24, §27, §56 AND THE v0.1 DONE CONDITIONS — AGAINST THE TEXT

## B.1 · §24 — the twelve QA gates

| # | gate | state |
|---|---|---|
| 1 | unit tests for scoring, corridor direction, deduplication, source freshness | 🟡 **freshness and dedup yes** (134 registry tests); **scoring and corridor direction do not exist** |
| 2 | crawler fixtures — redirects, canonical conflicts, noindex, robots, JS rendering, broken links, schema | 🔴 **none.** There is no crawler |
| 3 | **deliberately broken test pages must produce RED findings** | 🔴 **not for pages.** Three *laws* are proven fail-capable — boundary, isolation, entry-points — **but no page fixture produces a RED finding, because nothing examines pages for defects** |
| 4 | **restore fixtures and prove GREEN** | 🟡 **the restore half is proven** on those same three laws, with restore-on-abort. **Not on pages** |
| 5 | golden test set of query clusters and expected classifications | 🔴 none — S2 absent |
| 6 | false-positive review for thin/duplicate detection | 🔴 none |
| 7 | Search Console connector test | 🔴 blocked on `B1` |
| 8 | AI visibility records preserve exact prompt/date/platform, never fake determinism | 🔴 none |
| 9 | desktop and **430px** dashboard visual QA | 🔴 no dashboard |
| 10 | security review — secrets, auth, external inputs | 🟡 **partial and undocumented.** The write law gates writes; `--product=<id>` is validated against path traversal; **no review exists as an artefact** |
| 11 | cost / rate-limit tests | 🔴 none (`GATE-2`) |
| 12 | end-to-end discover → recommend → CC command → mock implementation → re-crawl → verification | 🔴 none |

**0 complete · 4 partial · 8 absent.**

> 🔴 **Row 3 is the one that answers the standing instruction.** The demonstration was asked for **on
> the Case Study**, and it cannot be given: there is no page-defect detector to turn red. What is
> proven is that **three engine laws** go red on their exact regressions and green on restore —
> valuable, and **not what row 3 asks for.**

## B.2 · §27 — the seventeen capability conditions

| # | condition | state |
|---|---|---|
| 1 | inventory and audit an authorized product | 🔴 |
| 2 | model 197 countries and directional corridors | 🔴 |
| 3 | multiple languages/locales without equating translation with localization | 🔴 |
| 4 | ingest real search performance by country/query/page | 🔴 blocked on `B1` |
| 5 | create and cluster query opportunities | 🔴 S2 absent |
| 6 | distinguish mathematical universe from publishable set | 🟡 **the principle is enforced** — a page that fails Gate A is not published — **but there is no universe to distinguish from** |
| 7 | justify every recommended new URL | 🟡 **presence-checked only** (`GATE-4`) |
| 8 | reject thin/duplicate/doorway candidates | ✅ **the one that works.** `/speech-pathology` was rejected at 34/350 and **not rescued** |
| 9 | detect major technical SEO/indexability issues | 🔴 S5 absent |
| 10 | evaluate source freshness / entity consistency / GEO-AEO readiness | 🟡 **freshness yes**, in depth; entity consistency and GEO-AEO 🔴 |
| 11 | maintain honest AI visibility tests and trends | 🔴 |
| 12 | generate evidence-backed fix commands | 🔴 |
| 13 | re-crawl / re-test with before-and-after evidence | 🔴 |
| 14 | **deliberately failing QA that goes RED and returns GREEN** | 🟡 **proven on three laws, not on pages** — see `B.1` row 3 |
| 15 | **no ranking guarantee language, no fabricated scores** | ✅ **held.** No ranking has ever been promised, and every number in this repository names the command that produced it |
| 16 | **no destructive autonomous production behaviour** | ✅ **held and enforced in code** — the write law is dry-run by default and needs `--confirm` plus `ALLOW_PROD_WRITE=1` |
| 17 | documented rollback, security, cost and operational procedures | 🔴 none — §26 items 13 and 16 |

**3 met · 5 partial · 9 absent.**

## B.3 · The nine `v0.1 DONE` conditions — verbatim from line 712

> *"Do not declare v0.1 DONE because code exists."*

| # | condition | state |
|---|---|---|
| 1 | Phase 0 prerequisites **recorded** | ✅ **met** — the frozen gap register, with dates and evidence |
| 2 | the authorized AlmiOET audit slice works **end-to-end** | 🔴 **no** — there is no audit slice |
| 3 | **Case Study #1 passes with clean controls** | 🔴 **no** — attempted 11 Sep, **NOT RUN**: nothing implements it, and RED 2 has no frozen input |
| 4 | exports are usable | 🔴 no |
| 5 | costs/usage are visible | 🔴 no |
| 6 | secrets/security checks pass | 🟡 partial, undocumented |
| 7 | dashboard/report works on desktop and **430px** | 🔴 no |
| 8 | **RED→GREEN fail-capable QA is demonstrated** | 🟡 **on three laws, not on the Case Study** |
| 9 | evidence documented for the owner's expansion decision | 🟡 **this series is that evidence** — and it is not yet complete, because condition 3 is unmet |

**1 met · 3 partial · 5 absent.**

⚠️ **My earlier report gave `RED→GREEN` as 🟡 and Phase 0 as ✅, and both survive the text.** The one
that moved is condition 3: I had it as *"never run"*; the text's own word is **"passes"**, and the
measured answer is that it **cannot be run at all today.**

## B.4 · §56 — the sequencing ruling: **are we on it?**

> *"Do not commit nine phases in advance. **Commit Phase 0 and Case Study #1 only**, then put a
> decision gate in front of Phase 4."*

| | |
|---|---|
| Phase 0 | ✅ **committed and complete** — items 1–9, one frozen register |
| Case Study #1 | 🟡 **committed and attempted. It cannot run** — two blockers, both recorded |
| Phases 4–8 | ✅ **not committed, not begun, not funded** |
| the decision gate | ✅ **standing, untouched** |

> ### ✅ WE ARE ON §56's PATH, AND THE PATH HAS STOPPED WHERE IT SHOULD.
> §56 says phases 4–8 are *"funded by what Case Study #1 actually returns"*. **Case Study #1 has
> returned NOT RUN.** So the correct state is exactly where we are: **stopped at the gate, with the
> reason written down.**

⚠️ **And §56's own honest reading is worth quoting against our own numbers:** *"AlmiVisibility lifts
the AUDIT layer… On that night it would have carried roughly a quarter of the work."* **The one
capability measured working — rejecting a thin page — is in that audit layer.**

---

# C · PHASE 1 IS BLOCKED — THE SPEC'S OWN SENTENCE

**V5.1 line 556, verbatim:**

> *"**Phase 1 cannot begin while Search Console coverage/authorization, analytics availability,
> worker execution layer, database isolation/capacity, and reusable existing artifacts remain
> UNKNOWN or UNDECIDED.** Record each answer with a date."*

**Five conditions. Measured:**

| condition | state | register row | who |
|---|---|---|---|
| Search Console coverage / authorization | 🔴 **UNKNOWN** — the Domain property exists; **read-only API access is not granted** | **`B1`** | **owner** |
| analytics availability | 🟡 **ANSWERED, and the answer is adverse**: funnel evidence on **1 of 27** products, no page-view analytics anywhere | `ANL-1` | recorded |
| worker execution layer | 🔴 **UNDECIDED** — options, costs, limits and risks are measured and written; **only the decision is missing** | `CRW-1`, item 4 | **owner** |
| database isolation / capacity | 🟡 **isolation from product DBs: PASS** (Owner Ruling 1). 🔴 **capacity: the v0.1 workload needs 288% of the Free plan in month one**, and preview shares it | `DB-2`, `DB-3`, **`B2`** | **owner** |
| reusable existing artifacts | ✅ **ANSWERED** — 11 assets named with their state | items 1–2 §6 | recorded |

> ## 🔴 PHASE 1 IS BLOCKED. TWO CONDITIONS ARE UNKNOWN OR UNDECIDED AND BOTH ARE THE OWNER'S.
>
> **No attempt was made to resolve them, route around them, or start Phase 1 anyway.** They are
> recorded and the work stops here.

---

# D · `CS-4`, `CS-5`, `DOC-2` — ONE REGISTER, AND `CS-5` HAS A CLOCK ON IT

✅ **Confirmed: all three are in `PHASE_0_FROZEN_GAP_REGISTER.md` §1 and in no rival list.** The
register's purpose is to be the one place, and a second list would defeat it.

## 🔴 `CS-5` — RED 2's input is on the live site, and time is against it

| | |
|---|---|
| what RED 2 is | an external-authority factual claim with no source-registry evidence |
| where its input lives | 🔴 **the live site.** No exhibit, no corpus page — *"live-confirmed"* only |
| the clock | **the day that page is fixed, the defect becomes unreproducible for ever** |
| the consequence | Case Study #1 is then **permanently capped at 5/6 — a FAIL — for a reason that has nothing to do with the engine** |

⚠️ **This is the exact decay Amendment 1 was written to prevent**, still present in one of six — and
Amendment 1 froze the other five without it.

### The two ways out. **Both are the owner's.**

| | option | what it costs |
|---|---|---|
| **(a)** | **freeze a snapshot of that page** — one fetch, hashed and pinned like the other five | one fetch, and it must happen **before** the page is fixed |
| **(b)** | **remove RED 2 from the contract formally**, making the pass mark **5/5 RED + 0/3 CONTROL** | an amendment to a frozen contract — **and §12 governs it** |

> 🔴 **No fetch was made and no option was chosen.** Both are written down; the choice is the
> owner's. **Option (a) expires without warning.**

---

## WHAT THIS MEASUREMENT DID NOT DO

- 🔴 **No Phase 1 code** — no registry, crawler, DB, job queue, page inventory or issue model.
- 🔴 **No detector written.** Building the thing the Case Study judges, in order to pass it, is the
  circularity the contract exists to prevent.
- 🔴 **No live fetch.** `CS-5` was left to the owner rather than resolved with one request.
- **No document from §26 written.** The list was measured, not filled.
- **No status changed without a quote from the text**, and every change names its line.
- **No work on `PAGE-1`, `GATE-3`, `GATE-4`** — out of scope under V5.1's sequencing.
- No page, claim, schema, cost, publish, deploy, Vercel/Neon setting, threshold, or connected
  product touched.
