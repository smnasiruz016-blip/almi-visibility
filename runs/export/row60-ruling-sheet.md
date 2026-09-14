# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · RULED 14 SEPTEMBER 2026 · SEVEN CLASSES SPLIT

> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/row60-ruling-sheet.mjs --confirm` writes it from the evidence store at 2026-09-14T03:55:30.039Z.
> Every count is derived by applying each state-change record to its issue on issue_id, with each issue counted under
> the class its own stored fields place it in (`config/class-splits.mjs`). Every description, level and attribution is
> copied from `config/consequence-register.mjs`, the scale from `config/consequence-scale.mjs`. The sheet sets no level.
> A detector's `severity` is not a consequence level and is not shown.

## Files read — every `.jsonl` under `runs/`

| file | records | issue records | state changes | recommendations |
|---|---|---|---|---|
| `runs/audit/content-findings.jsonl` | 471 | 471 | 0 | 0 |
| `runs/audit/crawler-classification.jsonl` | 32 | 0 | 0 | 0 |
| `runs/audit/findings.jsonl` | 134 | 107 | 0 | 0 |
| `runs/audit/instrument-findings.jsonl` | 22 | 11 | 11 | 0 |
| `runs/audit/recommendations.jsonl` | 10 | 0 | 0 | 3 |
| `runs/audit/source-integrity.jsonl` | 15 | 0 | 0 | 0 |
| `runs/audit/supply-labels.jsonl` | 550 | 550 | 0 | 0 |
| `runs/audit/technical-findings.jsonl` | 2888 | 1886 | 134 | 0 |
| `runs/audit/verification-issues.jsonl` | 15 | 2 | 0 | 0 |
| `runs/cost/actions-runs.jsonl` | 1 | 0 | 0 | 0 |
| `runs/cost/ledger.jsonl` | 22 | 0 | 0 | 0 |
| `runs/crawl/first-real-crawl-2026-09-12.jsonl` | 999 | 0 | 0 | 0 |
| `runs/evidence/evidence.jsonl` | 50 | 0 | 0 | 0 |
| `runs/evidence/robots.jsonl` | 5 | 0 | 0 | 0 |
| `runs/evidence/sitemaps.jsonl` | 5 | 0 | 0 | 0 |
| `runs/render/rendered-2026-09-13.jsonl` | 394 | 0 | 0 | 0 |
| `runs/replay/replay-audit-dns-2026-09-13-journey-key.jsonl` | 268 | 107 | 0 | 0 |
| `runs/replay/replay-audit-dns-2026-09-13.jsonl` | 268 | 107 | 0 | 0 |
| `runs/replay/replay-crawl-2026-09-13-journey-key.jsonl` | 788 | 0 | 0 | 0 |
| `runs/replay/replay-crawl-2026-09-13.jsonl` | 788 | 0 | 0 | 0 |
| **20 files** | **7725** | **3241** | **145** | **3** |

## Part A — the owner's scale, strongest first

- **CRITICAL** — consequence irreversible, or practical recovery not dependable; credible risk of catastrophic or systemic loss to security, data, production or search visibility.
- **HIGH** — material serious harm possible, but recovery is possible — costly, complex, slow, or demanding broad intervention.
- **MODERATE** — meaningful harm, bounded and reversible, recoverable by normal corrective work.
- **LOW** — limited or minor consequence; easily reversible; does not materially threaten core production, data, security or indexation integrity.
- **NONE** — verified no material adverse consequence.

**UNCLASSIFIED is not a level.** It is UNKNOWN: never low, never ranked, routed to owner review (A4).

Units: **distinct** = issues, by issue_id · **open** = distinct issues still OPEN after every state change · **raw** = issue records, duplicate copies included · **not run** = distinct issues that record a check that never ran — not a defect found.

## Part B — the 10 levels already ruled (unchanged, attributed)

| # | class | what it is (the register's words) | open | distinct | ruled states | raw | not run | level | ruled by |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `canonical` | a page's raw HTML carries no rel=canonical link | 6 | 6 | — | 12 | 0 | LOW | owner 2026-09-14 |
| 2 | `commencement-date-ambiguous-against-source` | a fact's commencement date cannot be read unambiguously from its official source | 1 | 1 | — | 1 | 0 | MODERATE | owner 2026-09-14 |
| 3 | `exact-duplicate` | a page's body is byte-identical to other pages' | 106 | 106 | — | 106 | 0 | HIGH | owner 2026-09-14 |
| 4 | `head-elements` | a page's heading structure is broken — no h1, or a heading level used before it | 18 | 18 | — | 36 | 0 | LOW | owner 2026-09-14 |
| 5 | `host-publishes-no-a-record` | a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it | 1 | 1 | — | 3 | 0 | HIGH | owner 2026-09-14 |
| 6 | `instrument-disagreement` | two of our own instruments disagree about the same page over the same inputs | 0 | 11 | 11 CLOSED | 11 | 0 | HIGH | owner 2026-09-14 |
| 7 | `official-source-contradicts-itself` | an official source states two things about the same fact that disagree | 1 | 1 | — | 1 | 0 | HIGH | owner 2026-09-14 |
| 8 | `query-parameters` | a page's URL carries query parameters | 1 | 1 | — | 2 | 0 | LOW | owner 2026-09-14 |
| 9 | `robots-blocks-search-crawler` | robots.txt disallows a search crawler from a page that draws search impressions | 106 | 106 | — | 318 | 0 | MODERATE | owner 2026-09-14 |
| 10 | `status-and-redirects` | requesting a page's URL does not return 200 directly — it redirects or errors | 7 | 7 | — | 14 | 0 | LOW | owner 2026-09-14 |

## Part B1 — the 12 classes for the owner to rule: LEVEL and WHY are blank

A half is a new class: no level of the class it was split from carries to it. A class whose name ends
`-check-not-run` holds checks that never ran — nothing was found in it, and nothing was ruled out.

| # | class | split from | what it is (the register's words) | open | distinct | ruled states | raw | not run | LEVEL | WHY |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `indexability-preflight-check-not-run` | `indexability-preflight` | the indexability check did not run for a page — a required input was absent. Nothing was found, and nothing was ruled out | 210 | 210 | — | 420 | 210 | | |
| 2 | `indexability-preflight-found` | `indexability-preflight` | the indexability check ran on a page and found a condition that blocks its eligibility | 158 | 158 | — | 300 | 0 | | |
| 3 | `near-duplicate-check-not-run` | `near-duplicate` | the near-duplicate check did not run — an input was absent, or the tool failed. No duplication was found, and none was ruled out | 108 | 108 | — | 110 | 108 | | |
| 4 | `near-duplicate-found` | `near-duplicate` | the near-duplicate check ran and found a page's body highly similar to a sibling page's | 5 | 5 | — | 5 | 0 | | |
| 5 | `noindex-declared-deliberate` | `noindex` | a page's noindex, recorded as a deliberate de-indexing decision; whether its near-duplicate premise holds is UNKNOWN | 134 | 134 | — | 134 | 0 | | |
| 6 | `noindex-defect-claim-withdrawn` | `noindex` | a claim that a page's noindex was a defect — SUPERSEDED on 12 September 2026 by a record declaring that noindex deliberate | 0 | 134 | 134 SUPERSEDED | 268 | 0 | | |
| 7 | `orphan-within-crawled-set-check-not-run` | `orphan-within-crawled-set` | the orphan check did not run — it needs rendered HTML and every record is raw HTML. No page was found orphaned, and none was ruled out | 340 | 340 | — | 340 | 340 | | |
| 8 | `sitemap-advertises-blocked-url-check-not-run` | `sitemap-advertises-blocked-url` | the sitemap-against-robots check did not run for a host — no robots.txt or no sitemap URLs were stored. No contradiction was found, and none was ruled out | 350 | 350 | — | 700 | 350 | | |
| 9 | `template-dominance-check-not-run` | `template-dominance` | the template-dominance check did not run — an input was absent, or shell subtraction was not confident. Nothing was found, and nothing was ruled out | 108 | 108 | — | 110 | 108 | | |
| 10 | `template-dominance-found` | `template-dominance` | the template-dominance check ran and found the shared shell making up most of a page's words | 2 | 2 | — | 4 | 0 | | |
| 11 | `thin-content-check-not-run` | `thin-content` | the thin-content check did not run — the stored body was absent, or rendered HTML was needed. No thin page was found, and none was ruled out | 108 | 108 | — | 110 | 108 | | |
| 12 | `thin-content-found` | `thin-content` | the thin-content check ran and found fewer unique body words than the floor after the shell is subtracted | 118 | 118 | — | 236 | 0 | | |

## Part B2 — the consequence-first order

Consequence first; the open count only amplifies INSIDE a level; the class name is the last, deterministic tie-break.

| rank | class | level | open |
|---|---|---|---|
| 1 of 10 | `exact-duplicate` | HIGH | 106 |
| 2 of 10 | `host-publishes-no-a-record` | HIGH | 1 |
| 3 of 10 | `official-source-contradicts-itself` | HIGH | 1 |
| 4 of 10 | `instrument-disagreement` | HIGH | 0 |
| 5 of 10 | `robots-blocks-search-crawler` | MODERATE | 106 |
| 6 of 10 | `commencement-date-ambiguous-against-source` | MODERATE | 1 |
| 7 of 10 | `head-elements` | LOW | 18 |
| 8 of 10 | `status-and-redirects` | LOW | 7 |
| 9 of 10 | `canonical` | LOW | 6 |
| 10 of 10 | `query-parameters` | LOW | 1 |
| — | `indexability-preflight-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 210 |
| — | `indexability-preflight-found` | UNCLASSIFIED → OWNER REVIEW | 158 |
| — | `near-duplicate-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 108 |
| — | `near-duplicate-found` | UNCLASSIFIED → OWNER REVIEW | 5 |
| — | `noindex-declared-deliberate` | UNCLASSIFIED → OWNER REVIEW | 134 |
| — | `noindex-defect-claim-withdrawn` | UNCLASSIFIED → OWNER REVIEW | 0 |
| — | `orphan-within-crawled-set-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 340 |
| — | `sitemap-advertises-blocked-url-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 350 |
| — | `template-dominance-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 108 |
| — | `template-dominance-found` | UNCLASSIFIED → OWNER REVIEW | 2 |
| — | `thin-content-check-not-run` | UNCLASSIFIED → OWNER REVIEW | 108 |
| — | `thin-content-found` | UNCLASSIFIED → OWNER REVIEW | 118 |

## Part B3 — the classes the split superseded (not in use; their words kept in the register)

| class | its level before the split | became |
|---|---|---|
| `indexability-preflight` | UNCLASSIFIED (owner) — carries to neither half | `indexability-preflight-found` + `indexability-preflight-check-not-run` |
| `near-duplicate` | MODERATE (owner) — carries to neither half | `near-duplicate-found` + `near-duplicate-check-not-run` |
| `noindex` | UNCLASSIFIED (owner) — carries to neither half | `noindex-defect-claim-withdrawn` + `noindex-declared-deliberate` |
| `orphan-within-crawled-set` | MODERATE (owner) — carries to neither half | `orphan-within-crawled-set-found` + `orphan-within-crawled-set-check-not-run` |
| `sitemap-advertises-blocked-url` | UNCLASSIFIED (owner) — carries to neither half | `sitemap-advertises-blocked-url-found` + `sitemap-advertises-blocked-url-check-not-run` |
| `template-dominance` | MODERATE (owner) — carries to neither half | `template-dominance-found` + `template-dominance-check-not-run` |
| `thin-content` | MODERATE (owner) — carries to neither half | `thin-content-found` + `thin-content-check-not-run` |

## Part C — recommendations no register entry can reach

- `REC-AI-CRAWLER-BLOCK` — its evidence links no issue, so no finding class — and no register entry — can apply to it. **UNCLASSIFIED** — it rests on crawler observations, not on a finding class, so no class-keyed register entry can ever apply to it. Needs, defined and tested: affected scope; crawler access; robots directives in force; reversibility; the measured visibility or indexation consequence.

Each level is ruled by the owner and written into `config/consequence-register.mjs` with his name, the date and
the reason. Nothing else may set one.
