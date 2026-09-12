# ALMIVISIBILITY — KEY FEATURE CHECKLIST · THE FROZEN TEXT

**Provenance — read this before using the text below.**

- **Source file:** `ALMIVISIBILITY_KEY_FEATURE_CHECKLIST_FINAL.docx`
- **Location when read:** the owner's Desktop on this machine.
- **Received / file timestamp:** **11 September 2026, 23:34** (clock-read from the file).
- **Extracted:** **11 September 2026**, by unzipping the `.docx` and reading `word/document.xml`
  directly. No converter, no dependency, no network.
- **Extraction rule:** paragraphs and table rows, in document order, **verbatim**. Table cells are
  separated by ` | `. **Nothing was paraphrased, summarised, reordered, corrected or invented.**
- **Content:** **58 numbered key features**, a four-value status key, the TICK LAW, the §3
  four-question evidence rule, the §4 tracking row, and the §6 owner sign-off block.

## Hash verification

| artifact | bytes | sha256 |
|---|---|---|
| `ALMIVISIBILITY_KEY_FEATURE_CHECKLIST_FINAL.docx` | 44,797 | `e58fbeb4fcc6e4d967d87ad9b60fc7e8985c05a1c08cc833376c1c6aadf66a0e` |
| the extracted body below | — | `906efcc32b9a8553fb3b2f60a8736d6cf07d9bff3d49e4a93d34ecc5def768c6` |

🔴 **The body hash covers the extracted text ONLY** — everything after the `---` marker below, as
a standalone file with LF endings. It deliberately does **not** cover this provenance header,
because a header that hashed itself could never be corrected without appearing to corrupt the
source it describes. `tools/verify-checklist-source.mjs` recomputes both and a test asserts them.

> ## 🔴 PRECEDENCE — RULED 11 SEPTEMBER 2026
>
> **The KEY FEATURE CHECKLIST is the DONE standard for AlmiVisibility.** Where any internal status
> format of ours disagrees with it, **THE CHECKLIST WINS.**
>
> It does **not** replace the Definition of Done or V5.1. It is the **completion instrument that
> sits on top of them**: the DoD says what the product must be, V5.1 says what may be built and
> when, and the checklist says **when we are allowed to call any of it done.**
>
> Its first law governs every status this repository publishes from now on:
>
> > **"TICK LAW: A feature is not complete because code exists. Tick it only when real evidence
> > proves it works."**

---

ALMIVISIBILITY
KEY FEATURE CHECKLIST
Build-time verification + final completion audit
TICK LAW: A feature is not complete because code exists. Tick it only when real evidence proves it works.
 |

Status key:  ☐ NOT STARTED    ◐ BUILT / NOT PROVED    ☑ VERIFIED PASS    ⚠ UNKNOWN / BLOCKED

1. How to use this checklist
Use this checklist throughout the build, not only at the end. When a feature is implemented, run its targeted verification immediately. Mark it ☑ only when evidence proves the requirement. At product completion, run one final independent audit across the integrated system.
BUILD → TARGETED TEST → EVIDENCE → ☑ TICK → NEXT FEATURE.  At the end: FINAL INDEPENDENT AUDIT → NO FROZEN BLOCKER → DONE.
 |

The final audit is confirmation, not a new idea-hunting exercise. Closed items reopen only for concrete contradictory evidence, a real regression, new authoritative evidence, a security/data-safety risk, or an owner-approved scope change.
2. Master feature checklist
#
 | Status
 | Key feature
 | PASS meaning
 |
1
 | ☐
 | Product Intake & Isolation
 | Connect/declare an AlmiWorld product; keep each product's data, evidence, costs and learning isolated.
 |
2
 | ☐
 | Human Question Discovery
 | Discover what people actually ask, their goals, confusions, concerns and likely follow-up questions.
 |
3
 | ☐
 | Keyword & Search-Language Discovery
 | Discover keywords, long-tail wording, synonyms and local phrasing; never treat a keyword as an automatic page.
 |
4
 | ☐
 | Localized Human Thinking
 | Research how people in different contexts/countries phrase and think about the same goal; country is a research lens, not an automatic URL axis.
 |
5
 | ☐
 | Intent & Question Clustering
 | Cluster equivalent wording and questions into genuine underlying intents.
 |
6
 | ☐
 | Axis Discovery
 | Discover and test evidence-backed axes such as profession, role, stage, origin/destination, language or locality; do not hard-code an obvious axis by habit.
 |
7
 | ☐
 | Market Measurement
 | Measure SUPPLY, VISIBILITY/REACH, DEMAND, AUDIENCE/NEED and WORTHINESS separately.
 |
8
 | ☐
 | HEAVY / THIN / EMPTY Discipline
 | Use these only as observed content-supply labels; never silently convert them into demand or opportunity conclusions.
 |
9
 | ☐
 | Search Console / Analytics Intelligence
 | Where authorized and available, analyze queries, pages, countries, impressions, clicks, CTR and downstream outcomes.
 |
10
 | ☐
 | Technical SEO Audit Engine
 | Audit status codes, redirects, sitemaps, robots, canonicals, noindex, rendering, crawl/indexability conflicts, broken/orphan links.
 |
11
 | ☐
 | Existing Page Inventory
 | Maintain stable identity and evidence for existing URLs and their current state.
 |
12
 | ☐
 | Duplicate / Thin / Template Detection
 | Detect and block duplicate, near-duplicate, thin and template-dominated inventory.
 |
13
 | ☐
 | Cannibalization Prevention
 | Check whether an existing URL already satisfies the same intent before proposing a new URL.
 |
14
 | ☐
 | No Blind Regeneration
 | Do not recreate or overwrite an existing good page merely because it is rediscovered.
 |
15
 | ☐
 | Verified Fact Supply Engine
 | Maintain reusable verified facts with source, tier, scope, verification date, freshness and provenance.
 |
16
 | ☐
 | Fact Conflict & Freshness
 | Detect conflicting/stale/expired facts; reverify or mark UNKNOWN instead of silently using them.
 |
17
 | ☐
 | Derived Fact Provenance
 | Preserve formulas and input fact IDs for calculated/derived facts.
 |
18
 | ☐
 | Competitor Intelligence
 | Measure competitor coverage, surfaced resources, gaps and source/citation patterns without assuming absence equals opportunity.
 |
19
 | ☐
 | Content / Information-Gap Intelligence
 | Identify real unanswered or second-search information gaps, not merely topics where competitors appear absent.
 |
20
 | ☐
 | Action Decision Engine
 | Choose evidence-based actions: KEEP / FIX / IMPROVE / ADD SECTION / MERGE / REFRESH / LINK / CREATE / MONITOR / NOINDEX / REDIRECT / REJECT.
 |
21
 | ☐
 | URL Right-to-Exist Test
 | Every proposed new URL must have a specific WHY_THIS_URL_DESERVES_TO_EXIST.
 |
22
 | ☐
 | Best Answer Architecture
 | Combine Human Question Universe + Search-Language Universe + Verified Fact Universe into a coherent useful resource.
 |
23
 | ☐
 | Answer-First Content
 | Give the useful answer clearly and early; remain naturally keyword-aware without stuffing.
 |
24
 | ☐
 | Original Information Gain
 | Provide materially useful value beyond competitors, existing pages and shared templates.
 |
25
 | ☐
 | Page Quality Gate
 | Enforce unique value, verified facts, sibling overlap, right-to-exist, cannibalization, technical readiness and source integrity before publishing.
 |
26
 | ☐
 | Internal-Link Intelligence
 | Find useful internal-link opportunities and verify important links actually render in HTML.
 |
27
 | ☐
 | Entity Intelligence
 | Map important entities, topics, questions and relationships consistently.
 |
28
 | ☐
 | International / Local SEO
 | Handle genuine locale/country differences only where evidence supports them; avoid doorway-style multiplication.
 |
29
 | ☐
 | SERP Hook / CTR Intelligence
 | Improve truthful titles, H1, meta and answer-first wording using real performance evidence.
 |
30
 | ☐
 | GEO / AEO / AIO / AI Visibility
 | Observe prompts/questions, mentions, citations, cited URLs/domains and competitor/source gaps where legitimately measurable.
 |
31
 | ☐
 | AI Source Influence Graph
 | Where observable, map prompt/query → response → mention → citation → cited source/domain → gap → action.
 |
32
 | ☐
 | Earned Authority / Off-Page Intelligence
 | Identify legitimate authority, link and citation opportunities; no spammy schemes.
 |
33
 | ☐
 | Content Decay & Pruning
 | Support REFRESH / IMPROVE / MERGE / NOINDEX / REDIRECT / REMOVE decisions for stale or low-value inventory.
 |
34
 | ☐
 | Content Brief Engine
 | Turn evidence into an implementation-ready content/action brief.
 |
35
 | ☐
 | Safe CC Command Generation
 | Turn an approved action into one clear, reviewable, consolidated implementation command.
 |
36
 | ☐
 | Owner Authorization Gates
 | Require explicit approval for destructive, paid, production, large-scale or cross-product actions.
 |
37
 | ☐
 | Controlled Publishing
 | Publish only owner-authorized work in controlled cohorts; no generate-all/publish-all path.
 |
38
 | ☐
 | Indexability Preflight
 | Check technical eligibility before publication and preserve INDEXABLE ≠ INDEXED.
 |
39
 | ☐
 | Real Indexation Learning
 | After publication, observe discovery/crawl/indexation and real query/impression evidence where available.
 |
40
 | ☐
 | Controlled Scaling
 | Allow expansion only after the prior cohort satisfies its frozen evidence rule.
 |
41
 | ☐
 | Failed-Cohort Backpressure
 | Automatically pause expansion when required evidence fails and produce diagnosis instead of more output.
 |
42
 | ☐
 | Re-crawl / Re-test Loop
 | Re-test changed targets and record evidence-backed PASS/FAIL.
 |
43
 | ☐
 | Experiment / Change Impact
 | Measure what happened after changes without inventing causality.
 |
44
 | ☐
 | Funnel / Business Outcome Intelligence
 | Where measurable, connect visibility actions to qualified visits, signup/trial, product use, paid conversion or owner-approved outcomes.
 |
45
 | ☐
 | Cost Governor
 | Track money, provider/crawl/research usage and operational burden; hard-stop runaway loops.
 |
46
 | ☐
 | Cache Before Re-Research
 | Reuse valid verified evidence instead of repeatedly paying to research unchanged facts.
 |
47
 | ☐
 | Paid Provider Controls
 | Paid services default OFF; require explicit owner authorization, budgets/caps and kill switches.
 |
48
 | ☐
 | Idempotency & Retry Safety
 | Repeated jobs/retries must not duplicate records/pages or repeat destructive/paid side effects.
 |
49
 | ☐
 | Audit Trail & Provenance
 | Explain what happened, why, from which evidence, when, and what version/action changed it.
 |
50
 | ☐
 | OBSERVED / INFERRED / RECOMMENDED / UNKNOWN Separation
 | Never turn missing evidence or inference into an observed fact or PASS.
 |
51
 | ☐
 | Explainability
 | Owner can inspect priority, evidence, confidence, cost, status and reason behind each recommendation/action.
 |
52
 | ☐
 | Case Study Acceptance Test
 | Pass the frozen acceptance contract: all required RED defects detected independently and clean controls not falsely flagged.
 |
53
 | ☐
 | Cross-Product Portability
 | Operate on a newly declared product without hard-coded subject knowledge in the generic core.
 |
54
 | ☐
 | Cross-Product Isolation Test
 | Prove connected products cannot see each other's private evidence, facts, costs or learning.
 |
55
 | ☐
 | Security / Secrets / Recovery
 | Protect secrets and product/user data; support safe recovery/rollback where applicable.
 |
56
 | ☐
 | Desktop + Mobile Owner Experience
 | Critical owner workflows are usable on intended desktop and mobile surfaces.
 |
57
 | ☐
 | Final Independent Audit
 | Re-check all applicable frozen requirements against integrated real evidence.
 |
58
 | ☐
 | DONE Declaration
 | Declare DONE only when every applicable item is verified PASS or justified N/A and no frozen blocker remains.
 |
3. Evidence rule for every tick
Before changing ☐ or ◐ to ☑, record enough evidence to answer all four questions:
What exact requirement was tested?
What real evidence proves it passed?
Where is that evidence stored or referenced?
Did the test prove the integrated behavior, rather than merely the existence of code/config/schema?
4. Recommended tracking row
Feature
 | Status
 | Evidence
 | Verified date
 | Verifier
 | Blocker/UNKNOWN
 | Reopen reason
 |
Example
 | ☐ / ◐ / ☑ / ⚠
 | link / test / report
 | YYYY-MM-DD
 | Claude / CC / Owner / independent
 | if any
 | only if allowed by closure rule
 |
5. Completion discipline
AUDIT ONCE → FREEZE GAP REGISTER → FIX → TARGETED VERIFY → CLOSE → FINAL AUDIT → DONE.
 |

Do not wait until the entire product is built to discover whether its features work. Verify each capability as it is completed, retain the evidence, and use the final independent audit to confirm that integration and later changes have not broken previously closed requirements.
Optional improvements discovered after a frozen requirement has passed go to the post-DONE backlog unless they reveal a real frozen-requirement failure, regression, authoritative contradiction, safety risk or owner-approved scope change.
6. Final owner sign-off
All applicable key features
 | ☐ PASS / justified N/A
 |
Frozen blockers remaining
 | ☐ NONE
 |
Final independent audit
 | ☐ PASS
 |
Owner declaration
 | ☐ ALMIVISIBILITY = DONE
 |
Date / evidence pack
 | ____________________________
 |
