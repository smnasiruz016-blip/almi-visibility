# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · RULED 14 SEPTEMBER 2026

> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/row60-ruling-sheet.mjs --confirm` writes it from the evidence store at 2026-09-14T03:12:24.449Z.
> Every count is derived by applying each state-change record to its issue on issue_id. Every description, level
> and Part C gap is copied from `config/consequence-register.mjs`, the scale from `config/consequence-scale.mjs`.
> The sheet sets no level. A detector's `severity` is not a consequence level and is not shown.

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

## Part B — the finding classes, by name

Units: **distinct** = issues, by issue_id · **open** = distinct issues still OPEN after every state change · **raw** = issue records, duplicate copies included.

| # | class | what it is (the register's words) | open | distinct | ruled | raw records | level |
|---|---|---|---|---|---|---|---|
| 1 | `canonical` | a page's raw HTML carries no rel=canonical link | 6 | 6 | — | 12 | LOW |
| 2 | `commencement-date-ambiguous-against-source` | a fact's commencement date cannot be read unambiguously from its official source | 1 | 1 | — | 1 | MODERATE |
| 3 | `exact-duplicate` | a page's body is byte-identical to other pages' | 106 | 106 | — | 106 | HIGH |
| 4 | `head-elements` | a page's heading structure is broken — no h1, or a heading level used before it | 18 | 18 | — | 36 | LOW |
| 5 | `host-publishes-no-a-record` | a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it | 1 | 1 | — | 3 | HIGH |
| 6 | `indexability-preflight` | a page's technical indexability state — a condition that blocks eligibility, or one left unmeasured | 368 | 368 | — | 720 | UNCLASSIFIED |
| 7 | `instrument-disagreement` | two of our own instruments disagree about the same page over the same inputs | 0 | 11 | 11 CLOSED | 11 | HIGH |
| 8 | `near-duplicate` | a page's body is highly similar to a sibling page's | 113 | 113 | — | 115 | MODERATE |
| 9 | `noindex` | a page carries noindex in its meta robots tag or X-Robots-Tag header | 134 | 268 | 134 SUPERSEDED | 402 | UNCLASSIFIED |
| 10 | `official-source-contradicts-itself` | an official source states two things about the same fact that disagree | 1 | 1 | — | 1 | HIGH |
| 11 | `orphan-within-crawled-set` | no page inside the crawled set links to this page | 340 | 340 | — | 340 | MODERATE (escalated from LOW) |
| 12 | `query-parameters` | a page's URL carries query parameters | 1 | 1 | — | 2 | LOW |
| 13 | `robots-blocks-search-crawler` | robots.txt disallows a search crawler from a page that draws search impressions | 106 | 106 | — | 318 | MODERATE |
| 14 | `sitemap-advertises-blocked-url` | a sitemap advertises a URL that robots.txt blocks — or the inputs to check it are not stored | 350 | 350 | — | 700 | UNCLASSIFIED |
| 15 | `status-and-redirects` | requesting a page's URL does not return 200 directly — it redirects or errors | 7 | 7 | — | 14 | LOW |
| 16 | `template-dominance` | the shared shell makes up most of a page's words | 110 | 110 | — | 114 | MODERATE |
| 17 | `thin-content` | a page has fewer unique body words than the floor after the shell is subtracted | 226 | 226 | — | 346 | MODERATE |

## Part B2 — the consequence-first order

Consequence first; the open count only amplifies INSIDE a level; the class name is the last, deterministic tie-break.

| rank | class | level | open |
|---|---|---|---|
| 1 of 14 | `exact-duplicate` | HIGH | 106 |
| 2 of 14 | `host-publishes-no-a-record` | HIGH | 1 |
| 3 of 14 | `official-source-contradicts-itself` | HIGH | 1 |
| 4 of 14 | `instrument-disagreement` | HIGH | 0 |
| 5 of 14 | `orphan-within-crawled-set` | MODERATE | 340 |
| 6 of 14 | `thin-content` | MODERATE | 226 |
| 7 of 14 | `near-duplicate` | MODERATE | 113 |
| 8 of 14 | `template-dominance` | MODERATE | 110 |
| 9 of 14 | `robots-blocks-search-crawler` | MODERATE | 106 |
| 10 of 14 | `commencement-date-ambiguous-against-source` | MODERATE | 1 |
| 11 of 14 | `head-elements` | LOW | 18 |
| 12 of 14 | `status-and-redirects` | LOW | 7 |
| 13 of 14 | `canonical` | LOW | 6 |
| 14 of 14 | `query-parameters` | LOW | 1 |
| — | `indexability-preflight` | UNCLASSIFIED → OWNER REVIEW | 368 |
| — | `noindex` | UNCLASSIFIED → OWNER REVIEW | 134 |
| — | `sitemap-advertises-blocked-url` | UNCLASSIFIED → OWNER REVIEW | 350 |

## Part C — recommendations no register entry can reach

- `REC-AI-CRAWLER-BLOCK` — its evidence links no issue, so no finding class — and no register entry — can apply to it. **UNCLASSIFIED** — it rests on crawler observations, not on a finding class, so no class-keyed register entry can ever apply to it. Needs, defined and tested: affected scope; crawler access; robots directives in force; reversibility; the measured visibility or indexation consequence.

Each level was ruled by the owner and is written into `config/consequence-register.mjs` with his name, the date
and the reason. Nothing else may set one.
