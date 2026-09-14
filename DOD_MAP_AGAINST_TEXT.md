# THE DoD MAPPED AGAINST ITS OWN TEXT

**11 September 2026.** Rebuilt against `DOD_FROZEN_TEXT_SOURCE.md` — **§1 through §5A and the
frozen tables** — rather than against the 21-row status table of labels.

**`PHASE_0_ITEM_7_DOD_ARCHITECTURE_MAP.md` is superseded by this document and kept, not deleted.**

🔴 **Nothing was implemented, no status was changed, no gate was touched and no threshold was
moved.** Where the old map and the text disagree, **the disagreement is recorded and left standing**
— deciding what to do about it is the next Phase 1 decision, not this document's work.

---

# 1 · WHAT CHANGED BY READING THE TEXT INSTEAD OF THE LABELS

The old map read 21 rows of the form *"`DOD-14` | Cost governor + paid-provider authorization
controls | PASS"*. **A label tells you a subject. It does not tell you what passing means.**

> ### 🔴 THE REQUIREMENTS WERE NEVER IN THE TABLE. THEY ARE IN §1–§5A, AND THEY ARE TESTABLE SENTENCES.

**Four things the text requires that no label hinted at**, each now measured:

| # | the text requires | measured today |
|---|---|---|
| **1** | §5A: *"Where a fact is derived from other verified values, **the derivation/formula and input fact IDs must be stored**"* | 🔴 ~~**no such field exists.** `grep` for `derivedFrom\|formula\|inputFactIds` across `src/facts/` returns nothing~~ 🔄 **SUPERSEDED 14 September 2026 — true when written on 11 September, false from 12 September** (`DOC-1`'s sixth instance, `PHASE_0_FROZEN_GAP_REGISTER.md` `FACT-1`): `makeDerivedFact` in `src/facts/lifecycle.mjs` stores `derivation: { formula, inputs, inputValues }` with the formula from the frozen `FORMULAS` table, and `recomputeDerived` re-executes it. On 14 September a derived record also became a registry kind (`FACT_KINDS`, laws F28 and F29) |
| **2** | §5A: *"The system must distinguish **verified fact, derived/calculated fact, inference, recommendation, and UNKNOWN**"* | 🔴 **a different taxonomy.** We distinguish `active / candidate / lead / conflict / retired` by acquisition confidence, and `R1–R4` by route. **"derived" and "recommendation" have no representation at all** 🔄 **NARROWED 14 September 2026:** `derived` now has a representation in the registry — `FACT_KINDS` `primary · derived` (`FACT-2`). `recommendation` and `inference` still have none |
| **3** | §3: a new page may be created *"only after **cannibalization, duplication, thinness, factual-evidence and WHY_THIS_URL** gates pass"* — a **conjunction of five** | 🔴 **3 of 5 are real.** Cannibalization does not exist; `whyThisUrl` is checked for **presence** (`trim().length > 0`), and the text asks for a *"Specific"* rationale |
| **4** | §5A.1: *"The owner can inspect where an important page fact came from **and when it was last verified**"* | 🟡 **half.** Provenance is complete; `factCheckedOn` is **null on 46 of 46 records**. What exists is a machine **check** date, and this project has always refused to call that "verified" |

**None of these four is visible from a label.** Two of them (`#1`, `#2`) are requirements the
registry was built without ever being measured against.

---

# 2 · §4 — THE FROZEN PRE-PUBLISH GATE, ROW BY ROW

The text names **seven** gates in a table with minimum requirements, failure actions and required
evidence. The old map said *"3 of 7 gate families"* from a different source. **The text confirms the
count and names them exactly:**

| # | gate | minimum requirement (text) | built? | evidence |
|---|---|---|---|---|
| 1 | **Unique value** | *"≥350 unique words after shared shell/template subtraction"* | ✅ | `MIN_UNIQUE_WORDS = 350`, shell subtraction at `SHELL_DOC_FREQUENCY = 0.98` |
| 2 | **Verified facts** | *"≥5 verified sourced facts where the page type requires factual claims"* | ✅ | `countFacts`, and the fact must carry source + tier + date |
| 3 | **Sibling overlap** | *"≤40% meaningful overlap against every relevant sibling"* | ✅ | `MAX_SIBLING_OVERLAP = 0.40`, 5-gram Jaccard, every sibling |
| 4 | **URL justification** | *"**Specific** WHY_THIS_URL_DESERVES_TO_EXIST"* · evidence: *"stored rationale"* | 🟡 **presence only** | `run.mjs:141` — `typeof p.whyThisUrl === "string" && p.whyThisUrl.trim().length > 0`. **A single character passes** |
| 5 | **Cannibalization** | *"No existing URL already satisfies the same intent better"* | 🔴 **absent** | no module; needs a corpus-wide view no runner has |
| 6 | **Technical readiness** | *"200/expected status, self-consistent canonical, no accidental noindex/robots block, renderable content"* | 🔴 **absent** | measured by throwaway script in Phase 0; nothing in the repository does it |
| 7 | **Source integrity** | *"No unsupported high-risk or measurable claim"* | 🔴 **absent** | the registry enforces provenance per record; **nothing checks the assembled page** |

> **3 built · 1 presence-only · 3 absent.** The old map's "3 of 7" was right, and the text makes it
> precise: **the fourth is not missing, it is WEAK — and a weak gate reads as a built one.**

⚠️ **And §4 carries a sentence with no code behind it at all:**

> *"A shortfall is a data/content problem. **The system must not lower a frozen gate merely to
> increase page output.**"*

**Nothing enforces that.** The thresholds are constants any edit can change, and the only thing that
has ever held them is the record of having refused to move them. **`GATE-3`.**

---

# 3 · §5A — THE FACT SUPPLY ENGINE, CLAUSE BY CLAUSE

This is the section the registry was built for, and it is the one the old map could say least about.

| clause | built? | measured |
|---|---|---|
| *"registry schema with zero usable supply is **NOT PASS**"* | ✅ **honoured** | recorded as "engine ready, supply insufficient" — never claimed as PASS |
| *"demand but insufficient verified facts → **DATA GAP / REJECT**, never generic padding or a lowered threshold"* | ✅ | `/speech-pathology` REJECTS at 34/350 and was **not** rescued |
| *"Fact ingestion… must preserve source provenance and respect cost controls"* | 🟡 | provenance ✅; **cost controls do not exist** (`GATE-2`) |
| *"Source quality must be **tiered**"* | ✅ | `TIERS` 1–4, tier 4 is lead-only and may never be a citation |
| *"derivation/formula and **input fact IDs must be stored**"* | 🔴 **absent** | §1 `#1` |
| *"Stale/expired facts must enter a **refresh/reverification workflow**"* | ✅ | `FRESHNESS_RULES`, `quoteUsableNow`, two queues, the NMC currency condition withdrawing a quote |
| *"**Conflicting sources must be detected and surfaced**… must not silently choose the convenient value"* | 🟡 **surfaced, not detected** | a `conflict` **status** exists and a `conflict` **field** is carried by **1 record** (`uk-code-of-practice.red-list-country-count`, the 62-vs-54 reading). **It was written by hand. No mechanism detects a conflict** |
| *"distinguish verified / derived / inference / recommendation / UNKNOWN"* | 🔴 **partial, different axis** | §1 `#2` |
| *"Facts must be **reusable by reference**… no independent untraceable copies"* | ✅ | specs hold claim **ids**; `findCopiedFacts` proves it and is tested |
| the **field list** — *"fact ID, subject/entity, claim/value, unit, locale/scope, source URL, source tier, extraction date, verified date, freshness/expiry rule, status, provenance"* | 🟡 **11 of 12 populated** | every field exists. **`verified date` is null on 46 of 46** — by design, and the design is the honest one |
| *"Maintain a **central VERIFIED FACT REGISTRY**"* | ✅ | 46 records, 11 modules, 134 tests, validates clean |

## 3.1 · §5A.1 — the five PASS conditions, each judged

| | condition | verdict |
|---|---|---|
| 1 | owner can inspect **where a fact came from and when last verified** | 🟡 provenance yes; **"last verified" is a machine check date, never a human one** |
| 2 | supply continues *"without requiring manual hand-writing of **every** record"* | 🟡 **45 of 46 are route R3** — official page read by a **model**, span machine-matched. One is R2 (human). The automated queue is genuinely unattended, **so this is met in mechanism**; whether it is met in practice depends on sources that return 403 |
| 3 | conflict, expiry, reuse, provenance and UNKNOWN behaviour are **tested** | ✅ all five have tests |
| 4 | **one end-to-end sample**: source → record → page use → citation → freshness path | ✅ `/nursing` is exactly this, and it passes Gate A including rollout |
| 5 | *"populated with a **non-trivial, real verified dataset sufficient to support the first owner-authorized publishing cohort**"* | 🔴 **NOT MET — 2 of 12 variants.** This is the one that decides `DOD-03A`, and it is a **supply** question |

> ### 🔴 §17's FACT-SUPPLY COMPLETION RULE SAYS THE SAME THING IN THE TEXT'S OWN WORDS
> *"`DOD-03A` cannot PASS merely because a table/schema or ingestion interface exists."*
>
> **The text and the measurement agree exactly: the engine is not the question. Supply is.**

---

# 4 · 🔴 WHERE THE OLD MAP AND THE TEXT DISAGREE

**Recorded, not fixed.** Four disagreements, and two of them move in our favour — which is the
reason to read the text rather than trust a label in either direction.

| # | old map said | the text says | who is right |
|---|---|---|---|
| **1** | `DOD-02` 🔴 RED — *"preview and production are the same database"* | §11: *"Visibility-engine database **is isolated from product databases**"* · `DOD-02`: *"Dedicated visibility data isolation"* | ⚠️ **the old map was harsher than the requirement.** A dedicated Neon project **does** isolate the visibility store from the product stores, which is what is asked. **Preview↔production sharing is a real risk and it is NOT what `DOD-02` measures** — it belongs to `B2` and to §13's safety criteria. ✅ **CLOSED BY OWNER RULING 1 — the text's reading is confirmed and `DOD-02` is PASS.** |
| **2** | `DOD-06` 🟡 *"lexical ✅ · semantic ❌ · cannibalization ❌"* | §3 makes the five gates a **conjunction** before any new page | ⚠️ **the text is harsher.** Under §3, three of five passing does not mean "partial" — **it means the precondition for creating a page is not satisfied.** The old map's 🟡 reads as progress; the text reads as a gate that is shut |
| **3** | `DOD-15` 🟡 *"corpus verified frozen — the test has never been run"* | §12: *"The acceptance test **may not be rewritten after implementation to fit what the engine happens to detect**"* | ⚠️ **a question the old map never asked.** Amendment 1 (owner-approved, 10 Sep) changed the **input** from the live site to a frozen corpus and **did not touch the 6/6 + 0/3 mark**. ✅ **ANSWERED BY OWNER RULING 2: no.** Amendment 1 is a formal, owner-approved amendment to the **input/fixture**, it is now **FROZEN**, and §12's anti-rewrite law **protects that pass contract**. ⚠️ `DOD-15` stays 🟡 anyway — **for a different reason: the test has never been run** |
| **4** | 12 requirements *"have no architectural home at all"* | §6–§14 specify them in detail — e.g. §7 lists nine technical-audit behaviours, §13 lists seven reliability behaviours | ✅ **both true, and the text makes it worse-defined rather than better**: the twelve are not merely unbuilt, **they are unbuilt against requirements that are fully written down.** No design work was ever blocked for want of a specification |

---

# 5 · THE 21 IDENTIFIERS, AGAINST THE TEXT

**Statuses are carried over unchanged from the superseded map** — beta-g's instruction was to change
none. What is new is the **criterion column**: what the text actually asks, which the label never
said.

| id | what the TEXT requires (§ cited) | state (unchanged) |
|---|---|---|
| **01** | §1 safe operation across AlmiWorld *"without silently modifying another product"* | 🟡 |
| **02** | §11 visibility DB isolated **from product databases** | ✅ **PASS — OWNER RULING 1, 11 Sep 2026.** A dedicated Neon project satisfies §11. **Preview/Production separation is NOT `DOD-02`** — it stays open as `B2` |
| **03** | §11 crawl work off *"an unsuitable request/response hosting path"* + budgets, caps, kill switches, hard stop on runaway | 🔴 |
| **03A** | §5A + §5A.1's five conditions + §17's completion rule | 🟡 **4 of 5 met; condition 5 (real cohort supply) is not** |
| **04** | §6 scores *"rankable QUERY CLUSTERS rather than treating isolated keywords as pages"* | 🔴 |
| **05** | §7 nine named behaviours, incl. source-vs-rendered links and sitemap URLs that 404 | 🔴 |
| **06** | §3 the five-gate conjunction + §4 rows 1, 3, 5 | 🟡 — see §4 `#2` |
| **07** | §3 identity resolved first; **KEEP is the default**; regeneration is not | 🔴 |
| **08** | §4's seven-row table in full | 🟡 **3 built · 1 weak · 3 absent** |
| **09** | §5 discovery, crawl, canonical, indexed status, impressions, query coverage | 🔴 |
| **10** | §5 **10 → 50 → 200**; next batch unavailable until the previous passes; repeated failure ⇒ **diagnosis, not more pages** | 🔴 |
| **11** | §8 six behaviours incl. verifying links appear in **rendered** HTML | 🔴 |
| **12** | §9 dated observations; *"absence of evidence is not reported as a guaranteed absence"*; never fabricate a citation | 🔴 |
| **13** | §10 mark missing instrumentation **UNKNOWN/NOT MEASURABLE** rather than inventing attribution | 🔴 |
| **14** | §11 budgets, caps, kill switches, cost per action, hard stop | 🔴 |
| **15** | §12 6/6 RED, 0/3 CONTROL, **not rewritten after implementation** | 🟡 **UNCHANGED — and the reason is now a different one.** OWNER RULING 2 closes the anti-rewrite question: Amendment 1 is an approved, **frozen** amendment to the INPUT and the pass mark was never touched. 🔴 **But §12 requires AlmiVisibility to PASS the test, and the test has never been run** (`CS-3`). A closed question is not a passed test |
| **16** | §7 *"Recrawls/retests changed targets and records PASS/FAIL with evidence"* | 🔴 |
| **17** | §14 owner distinguishes OBSERVED FACT / INFERENCE / RECOMMENDATION / UNKNOWN; **430px mobile** | 🔴 |
| **18** | §13 idempotency, dedup, retry safety, audit trail, owner control, rollback, **UNKNOWN never converts to PASS** | 🟡 write law only |
| **19** | §18 no unresolved frozen blocker | 🔴 — `B1`, `B2` open |
| **20** | §15 + final declaration: independent audit against **this** contract | 🔴 |

---

# 6 · GAP REGISTER — ADDITIONS FROM THE TEXT

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **FACT-1** | §5A requires a derived fact to store **its formula and its input fact IDs**. ~~No such field exists~~ 🔄 **SUPERSEDED 14 Sep 2026** — see the register's `FACT-1` | §1 `#1`, §3 |
| **FACT-2** | §5A requires distinguishing **verified / derived / inference / recommendation / UNKNOWN**. The registry distinguishes acquisition confidence instead; **"derived" and "recommendation" have no representation** 🔄 **NARROWED 14 Sep 2026** — `derived` now has one in the registry; `recommendation` and `inference` do not | §1 `#2`, §3 |
| **FACT-3** | §5A requires conflicts to be **detected**. A conflict can be **recorded** and one is; **nothing detects one** | §3 |
| **GATE-3** | §4: *"must not lower a frozen gate merely to increase page output"* — **nothing enforces this.** Thresholds are constants, and only a written record has ever held them | §2 |
| **GATE-4** | §4's URL-justification gate asks for a **specific** rationale; the check accepts **any non-empty string** | §2 row 4 |
| **PAGE-1** | §3 makes five gates a **conjunction** before a new page. Two of the five do not exist, so **the precondition for creating any page is not satisfiable today** | §4 `#2` |

## PRODUCT DATA GAPS

**None added by this document.**

## ✅ Questions for the owner — BOTH ANSWERED, 11 September 2026

| # | question | ruling |
|---|---|---|
| **Q-DOD-1** | Does Amendment 1 (live site → frozen corpus) count as *"rewriting the acceptance test"* under §12? | ✅ **OWNER RULING 2 — NO.** A formal, approved amendment to the **input/fixture**. Pass criteria unchanged: **6/6 RED + 0/3 CONTROL**. **Amendment 1 is now FROZEN**, and §12 protects it |
| **Q-DOD-2** | Does `DOD-02` mean isolation **from product databases** or **preview/production separation**? | ✅ **OWNER RULING 1 — from product databases.** A dedicated Neon project satisfies it. **`DOD-02` → PASS.** Preview/Production is a separate infrastructure/safety requirement and **stays open as `B2`** |

> 🔴 **Both rulings are FROZEN in `PHASE_0_FROZEN_GAP_REGISTER.md` §0 and are not reopened by any
> later audit** — not unless contradicting evidence appears or the owner changes scope, and in
> either case the response is to **write the reason and stop**, not to decide.

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **No status changed.** Every state in §5 is carried over from the superseded map unaltered.
- 🔴 **No gate touched. No threshold moved.** `MIN_UNIQUE_WORDS`, `MAX_SIBLING_OVERLAP` and every
  other constant are exactly as they were.
- **Nothing implemented.** The six new gaps are recorded; **not one is fixed**, and no interface for
  fixing them is designed here.
- **The DoD text was not edited, reordered, summarised or corrected** — it is copied verbatim and
  hash-verified.
- **The old map is superseded, not deleted.**
- No claim, page, build, DB, crawler, cost, connected product, publish, deploy, or Vercel/Neon
  setting was touched.
