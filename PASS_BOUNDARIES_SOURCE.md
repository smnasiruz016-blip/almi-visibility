# ALMIVISIBILITY — FROZEN PASS BOUNDARIES · THE OWNER'S TEXT

**Provenance — read this before using the text below.**

- **Source file:** `AlmiVisibility_PASS_BOUNDARIES_FROZEN.md`
- **Location when read:** `C:\Projects\_handoffs\` on this machine.
- **File timestamp:** **12 September 2026, 05:13** (clock-read from the file).
- **Ruled:** **12 September 2026**, by the owner. Authored by beta-g at his instruction.
- **Copy rule:** the body below is the file, **verbatim**. Nothing paraphrased, summarised,
  reordered, corrected or invented.
- **Content:** the six-state vocabulary, the four-part contract, the deferral law, five split
  features, two precisely-defined features, and **exact PASS boundaries for all 58**.

## Hash verification

| artifact | bytes | sha256 |
|---|---|---|
| `AlmiVisibility_PASS_BOUNDARIES_FROZEN.md` as read | 27,541 | `16c580160391eabb14a4d6754edfe18fe1def936384cf831d300640ef73d9e5c` |
| the body below (LF-normalised) | — | `16c580160391eabb14a4d6754edfe18fe1def936384cf831d300640ef73d9e5c` |

🔴 **The body hash covers the owner's text ONLY** — everything after the `---` marker below.
Verified by `tools/verify-pass-boundaries-source.mjs`, which recomputes it. A provenance note
saying "verbatim" is a claim; a recomputed hash is that claim made falsifiable.

## 🔴 PRECEDENCE — WHICH DOCUMENT WINS

> **The KEY FEATURE CHECKLIST states WHAT each feature must do.**
> **PASS BOUNDARIES states EXACTLY WHEN it may be ticked.**
> **Where any internal practice disagrees with either, THEY WIN.**
> **A boundary changes ONLY by owner ruling, recorded with its date and reason.**

Neither document yields to a convenience found later. If a boundary turns out to be expensive,
that is a fact about the cost, not grounds to move the line — and the one move this file exists
to prevent is redefining "complete" after the work is done.

## Independent census of the body

| | |
|---|---|
| boundary sections `### N · ` | **58** |
| in unbroken sequence 1..N | **58** |
| class **P** (passable in v0.1) | **24** |
| class **S** (split) | **6** |
| class **D** (deferred) | **28** |

The count is asserted apart from the hash on purpose. A hash catches a changed byte; it does not
tell a reader what the document is supposed to contain. **58** is the number every status report
is measured against, so if this source ever carries 57 or 59 the tracker is measuring a different
document and must say so.

---

# ALMIVISIBILITY — FROZEN PASS BOUNDARIES FOR ALL 58 FEATURES

**Ruled by the owner, 12 September 2026. Authored by beta-g. This is law.**
It sits on top of `ALMIVISIBILITY_KEY_FEATURE_CHECKLIST_FINAL.docx` and does not replace it.
Its purpose is one sentence: **so that nobody — not CC, not Claude — can change what "complete"
means after the fact.**

---

## 1 · THE SIX STATES

```
☐  NOT STARTED
◐  BUILT / NOT PROVED
🧪 TESTABLE NOW          ← the input exists; the falsifiable test has not been run
☑  VERIFIED PASS
⚠  BLOCKED / UNKNOWN
⏭  DEFERRED / N/A IN CURRENT FROZEN PHASE
```

🔴 **`🧪 TESTABLE NOW` is not a pass.** Real data arriving is a *prerequisite unlock*, not a
verdict. Between 🧪 and ☑ there is exactly one thing: **the test, run, and its evidence.**

---

## 2 · THE FOUR-PART CONTRACT — no ☑ without all four

> ### INPUT → EXPECTED BEHAVIOUR → FAILURE CONDITION → EVIDENCE

The owner's own worked example, kept as the template:

| | item 48, Idempotency & Retry Safety |
|---|---|
| **INPUT** | the same authorized job, run twice |
| **EXPECTED** | the second run creates no duplicate logical record and no duplicate side effect |
| **FAILURE** | a record, page, action or cost is duplicated |
| **EVIDENCE** | before/after IDs and counts, plus the test result |

**This formula ends subjective passing.** "It looks right" and "it is built" are not verdicts.

---

## 3 · 🔴 THE DEFERRAL LAW

> **A v0.1 feature cannot FAIL on something that deliberately does not exist in frozen v0.1.
> It also cannot be given a final-product PASS. Its status is `⏭ DEFERRED`.**

Two consequences, and both matter:

- **CC gets no excuse** to build page generation, publishing or gating in order to "finish" a row.
- **We give no false green** either. `⏭` is not a tick and never counts as one.

Where a feature has a v0.1 half and a deferred half, **the two halves are scored separately.**
The v0.1 half gets a real verdict. The deferred half gets `⏭` and its final boundary is written
down now, so that when the phase opens nobody re-invents it.

---

## 4 · THE FIVE SPLIT FEATURES — the owner's rulings, recorded

These five were previously heading for a false FAIL. They are split.

### 10 · Technical SEO Audit Engine

| | |
|---|---|
| **v0.1 PASS boundary** | the frozen v0.1 audit classes — **status, redirects, sitemap, robots/indexability, canonical, rendered-content/link evidence** — are **independently detected and re-tested in the Case Study** |
| **deferred** | all advanced technical SEO beyond those classes |

🔴 **ONE FLAG FOR THE OWNER, NOT RESOLVED BY ME.** The boundary names *rendered-content
evidence*. v0.1 has **no JavaScript rendering** — every record is `RAW_HTML` by deliberate design.
Two readings are possible and they are not the same test:

- **(a)** "rendered content" = the **served HTML body as fetched** — then it is in scope today.
- **(b)** "rendered content" = the DOM **after JavaScript executes** — then it is **not possible in
  v0.1** and that clause must be `⏭` until a renderer is authorised.

I have not chosen. **This needs one word from the owner.** Until then the clause is `⚠`.

### 12 · Duplicate / Thin / Template Detection

| | |
|---|---|
| **v0.1 PASS boundary** | observe, classify and produce evidence |
| **deferred** | a candidate or page failing the frozen duplicate/thin limits → **publishing path HARD BLOCK** |

### 13 · Cannibalization Prevention

| | |
|---|---|
| **v0.1 PASS boundary** | detect and report overlap between existing URLs and intents |
| **deferred** | where a suitable existing URL already serves the same intent → **default CREATE is not allowed**; the decision routes to IMPROVE or MERGE on the existing resource |

### 14 · No Blind Regeneration

| | |
|---|---|
| **v0.1 PASS boundary** | **the absence of the generator IS the strongest safety proof.** Prove the absence, do not simulate the danger |
| **deferred** | an unchanged existing page rediscovered → **KEEP**; automatic recreate or overwrite forbidden |

### 38 · Indexability Preflight

| | |
|---|---|
| **v0.1 PASS boundary** | inspect the indexability of pages that already exist |
| **deferred** | a candidate failing required status / canonical / noindex / robots / renderability → **publish BLOCK** |

---

## 5 · TWO FEATURES THE OWNER DEFINED PRECISELY

### 53 · Cross-Product Portability — **not to be invented**

| | |
|---|---|
| **INPUT** | AlmiVisibility is given an **unseen** subject or product — a second real product, or a neutral declared test product |
| **EXPECTED** | the generic core initializes and discovers **without any hard-coded first-product knowledge** |
| **FAILURE** | the core needs first-product knowledge to run — **or the first product's private evidence leaks during the test** |
| **EVIDENCE** | the declaration, the run, and an isolation assertion across the boundary during that same run |

### 56 · Desktop + Mobile Owner Experience — **not "I liked it"**

| | |
|---|---|
| **INPUT** | the critical owner workflow, walked on desktop **and** at the intended mobile width |
| **EXPECTED** | the owner can **see the evidence**, **understand the issue or recommendation**, **read its status, confidence and cost**, and **reach the required action** |
| **FAILURE** | any of those is broken, hidden or unusable |
| **EVIDENCE** | the walk, recorded, at both widths |

> **Aesthetic preference alone is not a blocker.** Ugly passes. Unusable does not.

---

## 6 · ALL 58 — EXACT PASS BOUNDARIES

Legend for the class column: **P** = passable in v0.1 · **S** = split (v0.1 half scored, rest `⏭`)
· **D** = deferred by frozen scope, final boundary recorded for when the phase opens.

---

### 1 · Product Intake & Isolation — **P**
- **INPUT** two declared products, and an accessor from each reaching for the other's data, evidence, cost and learning records.
- **EXPECTED** each of the four record classes is reachable only from its own product.
- **FAILURE** any cross-product read succeeds, **or** a class does not exist to be isolated.
- **EVIDENCE** adversarial accessor tests over non-empty populations of all four classes.

### 2 · Human Question Discovery — **D**
- **INPUT** a declared subject and legitimate public question evidence.
- **EXPECTED** real questions, goals, confusions and likely follow-ups are discovered and stored with provenance.
- **FAILURE** questions are invented, or sourced from the product's own marketing.
- **EVIDENCE** the source of every stored question, with its read date.

### 3 · Keyword & Search-Language Discovery — **D**
- **INPUT** owned search data plus legitimate public search evidence.
- **EXPECTED** keywords, long-tail wording, synonyms and local phrasing discovered; **no keyword ever becomes a page by itself.**
- **FAILURE** a keyword is promoted to a URL without an intent decision.
- **EVIDENCE** the cluster records, and the absence of any keyword→URL path.

### 4 · Localized Human Thinking — **D**
- **INPUT** the same goal expressed from two or more countries.
- **EXPECTED** local phrasing and reasoning are researched; **country is a research lens, never an automatic URL axis.**
- **FAILURE** a country multiplies URLs without evidence of materially different useful content.
- **EVIDENCE** the local-wording records and their sources.

### 5 · Intent & Question Clustering — **D**
- **INPUT** a set of differently worded questions with the same underlying intent.
- **EXPECTED** they cluster into one intent; local wording is preserved, not erased.
- **FAILURE** distinct intents merge, or identical intents stay split.
- **EVIDENCE** the cluster with its members and a held-out check.

### 6 · Axis Discovery — **D**
- **INPUT** the subject's real evidence.
- **EXPECTED** axes (profession, role, stage, origin/destination, language, locality) are **discovered and tested**, not assumed.
- **FAILURE** an obvious axis is hard-coded by habit without evidence.
- **EVIDENCE** the evidence behind each accepted axis and each rejected one.

### 7 · Market Measurement — **D**
- **INPUT** a market or segment.
- **EXPECTED** SUPPLY, VISIBILITY/REACH, DEMAND, AUDIENCE/NEED and WORTHINESS measured **separately**.
- **FAILURE** any two are conflated — above all, supply reported as demand.
- **EVIDENCE** five separate measurements with five separate methods.

### 8 · HEAVY / THIN / EMPTY Discipline — **P**
- **INPUT** a corpus of pages.
- **EXPECTED** the labels describe **observed content supply only**.
- **FAILURE** any of the three is converted, silently or otherwise, into a demand or opportunity conclusion.
- **EVIDENCE** a test that fails the build if a supply label emits a recommendation.

### 9 · Search Console / Analytics Intelligence — **P**
- **INPUT** an authorized property and the seven dimensions the PASS meaning names: queries, pages, **countries**, impressions, clicks, CTR, **downstream outcomes**.
- **EXPECTED** all seven ingested, paginated to exhaustion, with every bound printed.
- **FAILURE** any dimension missing, or any result claiming completeness it cannot show.
- **EVIDENCE** row counts, request counts, bounds, and `dataState` per pull.
- **NOTE** "where authorized and available" — a dimension no tool can supply is `⚠`, not a failure.

### 10 · Technical SEO Audit Engine — **S** — see §4

### 11 · Existing Page Inventory — **P**
- **INPUT** the same URL set crawled twice, with a real change between runs.
- **EXPECTED** stable identity across runs; changes appear as new observations, not new pages.
- **FAILURE** a `page_id` moves, or a re-seen page becomes a second record.
- **EVIDENCE** two runs, the ID set compared, the changed page's observation chain.
- **BLOCKER TODAY** one run only, by the terms of `D-CRW-4`. **"Maintain" cannot be tested until a second run is authorised.**

### 12 · Duplicate / Thin / Template Detection — **S** — see §4

### 13 · Cannibalization Prevention — **S** — see §4

### 14 · No Blind Regeneration — **S** — see §4

### 15 · Verified Fact Supply Engine — **P**
- **INPUT** a fact with source, tier, scope, verification date and freshness window.
- **EXPECTED** it is stored once, reused **within** its scope and window, **refused outside** either, and expires on schedule.
- **FAILURE** any leg of that loop is fixture-only, or a fact is reused out of scope or past expiry.
- **EVIDENCE** the whole loop demonstrated end to end on real verified facts.

### 16 · Fact Conflict & Freshness — **P**
- **INPUT** two real records asserting different values for one claim in one scope; and a real fact past its recheck date.
- **EXPECTED** conflict detected and **never auto-resolved**; both values retained; the fact becomes UNKNOWN; every dependent is marked for review.
- **FAILURE** a conflict resolves itself, or a stale fact is used silently.
- **EVIDENCE** the detector firing **on real data**, and the dependency walk on real dependents.

### 17 · Derived Fact Provenance — **P**
- **INPUT** a real derived fact with real inputs.
- **EXPECTED** formula and input IDs stored; the value recomputable; **never more verified than its least-verified input**; dependents marked for review when an input changes.
- **FAILURE** a derived fact exceeds its weakest input, or cannot be recomputed.
- **EVIDENCE** recomputation of every derived fact, and the constructor refusing an over-verified one.
- **BLOCKER TODAY** **zero derived facts exist.** All 46 records are primary.

### 18 · Competitor Intelligence — **D**
- **INPUT** a query cluster and the competitors visible on it.
- **EXPECTED** coverage, surfaced resources, gaps and citation patterns measured.
- **FAILURE** **absence is treated as opportunity**, or proprietary wording is copied.
- **EVIDENCE** the measurement, and a test that absence alone never produces an opportunity.

### 19 · Content / Information-Gap Intelligence — **D**
- **INPUT** real unanswered or second-search evidence.
- **EXPECTED** genuine information gaps identified.
- **FAILURE** a gap is asserted merely because competitors are absent.
- **EVIDENCE** the demand evidence behind each gap, separate from the supply evidence.

### 20 · Action Decision Engine — **D**
- **INPUT** a page or cluster with its evidence.
- **EXPECTED** exactly **one** primary action from KEEP / FIX / IMPROVE / ADD SECTION / MERGE / REFRESH / LINK / CREATE / MONITOR / NOINDEX / REDIRECT / REJECT.
- **FAILURE** more than one primary action, none, or one unsupported by the evidence cited.
- **EVIDENCE** the decision with its evidence chain, and a held-out set.

### 21 · URL Right-to-Exist Test — **D**
- **INPUT** a proposed new URL.
- **EXPECTED** a specific `WHY_THIS_URL_DESERVES_TO_EXIST`, unique to that URL.
- **FAILURE** the reason is absent, generic, or equally true of a sibling.
- **EVIDENCE** the stored reason, and a sibling-overlap check on it.

### 22 · Best Answer Architecture — **D**
- **INPUT** the question universe, the search-language universe and the verified-fact universe for one intent.
- **EXPECTED** they combine into one coherent useful resource.
- **FAILURE** any of the three is missing, or the result is a stitched template.
- **EVIDENCE** the three inputs, traceable into the output.

### 23 · Answer-First Content — **D**
- **INPUT** a page and its primary question.
- **EXPECTED** the useful answer appears clearly and early; keyword-aware without stuffing.
- **FAILURE** the answer is buried, or keyword density is engineered.
- **EVIDENCE** position of the answer, and a stuffing check.

### 24 · Original Information Gain — **D**
- **INPUT** the page, its competitors and its siblings.
- **EXPECTED** materially useful value beyond all three.
- **FAILURE** the value is restatement, or is shared template content.
- **EVIDENCE** the gain named and measured against both baselines.

### 25 · Page Quality Gate — **S**
- **v0.1 PASS boundary** unique value, verified facts, sibling overlap and source integrity measured on existing pages.
- **deferred** right-to-exist, cannibalization and technical-readiness **as pre-publish gates** — they need a publish path.
- **FAILURE (v0.1 half)** any of the four in-scope checks is fixture-only or absent.
- **EVIDENCE** the four checks over the real corpus, each with a clean control.

### 26 · Internal-Link Intelligence — **P**
- **INPUT** the crawled corpus and its edge graph.
- **EXPECTED** links verified **present in the served HTML**; orphans detected; a JS-injected link reported **UNKNOWN, never "missing"**.
- **FAILURE** "we could not see it" is recorded as "it is not there"; or the graph is unavailable.
- **EVIDENCE** the graph in durable storage, orphan counts, and the UNKNOWN path exercised.

### 27 · Entity Intelligence — **D**
- **INPUT** the subject's entities, topics, questions and relationships.
- **EXPECTED** mapped consistently across pages and machine-readable data.
- **FAILURE** the same entity carries different facts in two places.
- **EVIDENCE** a cross-surface consistency check.

### 28 · International / Local SEO — **D**
- **INPUT** two locales with evidence of genuinely different need.
- **EXPECTED** locale handling only where evidence supports it; **origin→destination direction preserved**; country ≠ language.
- **FAILURE** doorway-style multiplication, or translation presented as localization.
- **EVIDENCE** the local evidence per locale, and a multiplication guard.

### 29 · SERP Hook / CTR Intelligence — **D**
- **INPUT** real impression, CTR and position evidence.
- **EXPECTED** truthful titles, H1s, meta and answer-first wording, tested before/after.
- **FAILURE** clickbait, stuffing, fake urgency, unsupported promise, or a claim of causation from correlation.
- **EVIDENCE** versioned before/after with the evidence that drove it.

### 30 · GEO / AEO / AIO / AI Visibility — **D**
- **INPUT** a recorded prompt on a named platform, with date, locale and method.
- **EXPECTED** mention, citation, cited URL/domain, competitors and source gaps recorded exactly as observed.
- **FAILURE** any fabricated rank or citation; any automated consumer-chat session; **NOT RUN presented as anything but NOT TESTED**.
- **EVIDENCE** the full record per test, including the method.

### 31 · AI Source Influence Graph — **D**
- **INPUT** observed prompt→response→mention→citation chains.
- **EXPECTED** the chain mapped through to cited source, domain, competitor, gap and action.
- **FAILURE** a link in the chain inferred rather than observed, without being labelled INFERRED.
- **EVIDENCE** the graph with per-edge provenance.

### 32 · Earned Authority / Off-Page Intelligence — **D**
- **INPUT** legitimate available link and mention data.
- **EXPECTED** credible gaps and opportunities identified; earned actions only.
- **FAILURE** any automated outreach, paid-link scheme or link-farm suggestion.
- **EVIDENCE** the data source per finding, and a test forbidding manipulative actions.

### 33 · Content Decay & Pruning — **D**
- **INPUT** an ageing inventory with performance evidence.
- **EXPECTED** REFRESH / IMPROVE / MERGE / NOINDEX / REDIRECT / REMOVE decisions, evidence-backed.
- **FAILURE** the inventory only ever grows.
- **EVIDENCE** decisions with their evidence, and a pruning path that works.

### 34 · Content Brief Engine — **D**
- **INPUT** the evidence for one approved action.
- **EXPECTED** an implementation-ready brief: intent, entities, questions, verified facts and sources, unique value, locale terms, internal links, CTA, schema, prohibited claims, acceptance criteria.
- **FAILURE** any required section missing, or a fact without a source.
- **EVIDENCE** the brief, and a completeness check over its sections.

### 35 · Safe CC Command Generation — **D**
- **INPUT** one approved action.
- **EXPECTED** **one** consolidated, reviewable command with evidence, stable IDs, affected files, expected behaviour, acceptance criteria, tests, cost/safety and rollback.
- **FAILURE** more than one command, or any required section missing.
- **EVIDENCE** the command, and a section-completeness check.

### 36 · Owner Authorization Gates — **P**
- **INPUT** an attempt at a destructive, paid, production, large-scale or cross-product action **without** authorization.
- **EXPECTED** refusal.
- **FAILURE** it proceeds — **or the guard is asserted only as text and never executed**.
- **EVIDENCE** a test that **runs** each guard and observes the refusal, per category.

### 37 · Controlled Publishing — **D**
- **INPUT** an approved cohort, and an attempt to publish outside it.
- **EXPECTED** only the owner-authorized cohort publishes; **no generate-all or publish-all path exists.**
- **FAILURE** any path publishes more than the authorized cohort.
- **EVIDENCE** the cohort boundary enforced in code, and the absence of a bulk path proved by census.

### 38 · Indexability Preflight — **S** — see §4

### 39 · Real Indexation Learning — **D**
- **INPUT** a published cohort after publication.
- **EXPECTED** discovery, crawl, index state, impressions and queries observed; **INDEXABLE ≠ INDEXED preserved throughout**.
- **FAILURE** indexability reported as indexation, or any promise of future indexing.
- **EVIDENCE** the post-publication observations with dates.

### 40 · Controlled Scaling — **D**
- **INPUT** a completed cohort and its frozen evidence rule.
- **EXPECTED** expansion only when that rule is satisfied. 10 must earn 100; 100 must earn 1,000.
- **FAILURE** expansion without the rule being met, or the rule changed to fit the result.
- **EVIDENCE** the frozen rule, the measurement, the decision.

### 41 · Failed-Cohort Backpressure — **D**
- **INPUT** a cohort that fails its evidence rule.
- **EXPECTED** expansion **pauses automatically**, and a diagnosis is produced instead of more output.
- **FAILURE** expansion continues, or the response is more pages.
- **EVIDENCE** the pause triggered by injection, and the diagnosis it produced.

### 42 · Re-crawl / Re-test Loop — **P**
- **INPUT** a target that changed since it was last observed.
- **EXPECTED** it is re-tested and an evidence-backed PASS or FAIL recorded against the change.
- **FAILURE** a stale observation is served as current, or the re-test is not evidence-backed.
- **EVIDENCE** two observations of one target across a real change, with the verdict on each.
- **BLOCKER TODAY** requires a second authorised crawl run.

### 43 · Experiment / Change Impact — **D**
- **INPUT** a material change with before and after evidence.
- **EXPECTED** what happened is measured; **causation is never claimed from correlation**.
- **FAILURE** a causal claim without a design that supports it.
- **EVIDENCE** the versioned before/after and the wording of the conclusion.

### 44 · Funnel / Business Outcome Intelligence — **D**
- **INPUT** visibility actions and the downstream funnel.
- **EXPECTED** connection made **where measurable**; anything not instrumented marked UNKNOWN / NOT MEASURABLE.
- **FAILURE** attribution invented for an uninstrumented step.
- **EVIDENCE** the instrumentation map, and the UNKNOWNs stated.

### 45 · Cost Governor — **P**
- **INPUT** a run that spends money, provider calls, crawl budget or founder time; and a runaway loop.
- **EXPECTED** all four tracked in a ledger; the runaway **hard-stopped**.
- **FAILURE** any is untracked, or a cost reads UNKNOWN when it was measurable, or the loop continues.
- **EVIDENCE** the ledger with real figures, and the hard stop proved by injection.
- **BLOCKER TODAY** **no ledger exists and no spend figure is recorded.** The cap holds; the money does not.

### 46 · Cache Before Re-Research — **P**
- **INPUT** the same fact requested twice, and once outside its scope, and once past its window.
- **EXPECTED** one source lookup; a miss outside scope; a miss past expiry.
- **FAILURE** a second lookup for an unchanged fact, or a hit outside scope or window.
- **EVIDENCE** hit/miss counts with the freshness window printed, over a **live researcher** — not a pre-loaded registry.
- **BLOCKER TODAY** nothing researches yet, so a 100% hit rate measures a full shelf, not a working cache.

### 47 · Paid Provider Controls — **P**
- **INPUT** an attempt to use a paid provider with no authorization, no budget and no cap.
- **EXPECTED** refusal. Paid services are **OFF by default**; each needs explicit authorization, a budget/cap and a kill switch.
- **FAILURE** any paid call proceeds unauthorized, or a cap or kill switch is absent.
- **EVIDENCE** the refusal test per control, and the kill switch exercised.
- **NOTE** no paid provider exists today. **Absence is not a control** — the controls must exist before one does.

### 48 · Idempotency & Retry Safety — **P**
- **INPUT** the same authorized job, run twice; and a retry against a 4xx.
- **EXPECTED** no duplicate logical record and no duplicate side effect; **at most one retry, never on a 4xx**.
- **FAILURE** a record, page, action or cost duplicates; or a 4xx is retried.
- **EVIDENCE** before/after IDs and counts, plus a test that fails if the retry rule is changed.

### 49 · Audit Trail & Provenance — **P**
- **INPUT** any stored conclusion.
- **EXPECTED** it explains what happened, why, from which evidence, when, and what version or action changed it — **and its lifecycle runs to CLOSED or SUPERSEDED**.
- **FAILURE** any of the five is missing, or no record has ever completed its lifecycle.
- **EVIDENCE** a real chain walked end to end, and a real record closed or superseded.

### 50 · OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation — **P**
- **INPUT** records of all four kinds passing through the real verdict path.
- **EXPECTED** each labelled on its face; **no path converts UNKNOWN into PASS**, and the guard governs **real** records.
- **FAILURE** a label is absent or wrong, or the guard polices an empty population.
- **EVIDENCE** the guard exercised by real records, not fixtures, and the forbidden transition proved impossible by injection.

### 51 · Explainability — **P**
- **INPUT** one recommendation or action.
- **EXPECTED** the owner can inspect its **priority, evidence, confidence, cost, status and reason** — all six.
- **FAILURE** any of the six is missing or unreadable.
- **EVIDENCE** the six visible for a real recommendation, on the real report.
- **BLOCKER TODAY** priority, confidence and cost do not exist.

### 52 · Case Study Acceptance Test — **P (⚠ today)**
- **INPUT** the sealed corpus at its pinned commit, and detectors that have **never seen it**.
- **EXPECTED** every required RED defect detected independently; **every clean control unflagged**.
- **FAILURE** a required RED is missed, **or any control false-positives — that alone is FAIL**.
- **EVIDENCE** the run, its per-class result, and proof the seal was never opened during construction.
- **RULE** one shot. **NOT RUN = NOT TESTED.** It is run when the syllabus is built, not before.

### 53 · Cross-Product Portability — **P** — see §5

### 54 · Cross-Product Isolation Test — **P**
- **INPUT** two declared products, each holding private evidence, facts, **costs** and **learning**.
- **EXPECTED** neither can see any of the other's four classes.
- **FAILURE** any cross read succeeds, **or a class does not exist to be tested**.
- **EVIDENCE** adversarial tests over non-empty populations of all four.
- **BLOCKER TODAY** no cost record and no learning record exists — two of the four cannot be tested.

### 55 · Security / Secrets / Recovery — **P**
- **INPUT** a code path that handles a secret, and a state that must be recoverable.
- **EXPECTED** no secret value is ever printed, logged, hashed or length-measured; recovery or rollback works.
- **FAILURE** any leak — **or the no-leak property proved only by a manual grep, which would not catch a future change**.
- **EVIDENCE** an executing test for the leak property, and a recovery exercised.

### 56 · Desktop + Mobile Owner Experience — **P** — see §5

### 57 · Final Independent Audit — **P (last)**
- **INPUT** the integrated system and every applicable frozen requirement.
- **EXPECTED** re-checked against **real integrated evidence**, by someone other than the builder.
- **FAILURE** any closed requirement fails on re-check; or the auditor is the builder.
- **EVIDENCE** the audit, its findings, and the auditor's identity.
- **RULE** confirmation, **not a new idea hunt.** Closed items reopen only on the five listed grounds.

### 58 · DONE Declaration — **P (last)**
- **INPUT** the full ledger.
- **EXPECTED** every applicable item is ☑ or a **justified** ⏭/N-A, and no frozen blocker remains.
- **FAILURE** any applicable item is not ☑, or an N/A carries no justification, or a blocker stands.
- **EVIDENCE** the ledger, the audit, and the **owner's own signature.**
- **RULE** 🔴 **Only the owner declares DONE. Not CC. Not Claude.**

---

## 7 · WHAT THIS DOCUMENT FORBIDS

- Giving ☑ to anything missing any of the four parts.
- Treating a prerequisite unlock — real data arriving, a component being built — as a pass.
- Marking a feature FAIL for lacking a capability frozen v0.1 deliberately excludes.
- Marking that same feature PASS.
- Changing any boundary above to make work fit. **A boundary changes only by owner ruling,
  recorded with its date and reason.**
