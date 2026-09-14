# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · OWNER RULING SHEET

> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/row60-ruling-sheet.mjs --confirm` writes it from the evidence store at 2026-09-14T02:11:42.069Z.
> Every count is derived by applying each state-change record to its issue on issue_id. Every description and
> current level is copied from `config/consequence-register.mjs`. **Nothing here proposes a level**, and classes are
> listed by name. A detector's `severity` is not a consequence level and is not shown.

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

## Part A — the scale (nothing can rank without it)

- **A1 · level names:** ______________________________
- **A2 · their order, strongest first** (a level with no place in the order cannot rank): ______________________________
- **A3 · does a declared consequence outrank measured volume, or combine with it?** ______________________________
- **A4 · keep UNCLASSIFIED ranking as UNKNOWN, never as low (LAW-ABSENT-1)?** ______________________________

## Part B — the finding classes

Units: **distinct** = issues, by issue_id · **open** = distinct issues still OPEN after every state change · **raw** = issue records, duplicate copies included.

| # | class | what it is (the register's words) | open | distinct | ruled | raw records | current level | LEVEL | WHY |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `canonical` | a page's raw HTML carries no rel=canonical link | 6 | 6 | — | 12 | UNCLASSIFIED | | |
| 2 | `commencement-date-ambiguous-against-source` | a fact's commencement date cannot be read unambiguously from its official source | 1 | 1 | — | 1 | UNCLASSIFIED | | |
| 3 | `exact-duplicate` | a page's body is byte-identical to other pages' | 106 | 106 | — | 106 | UNCLASSIFIED | | |
| 4 | `head-elements` | a page's heading structure is broken — no h1, or a heading level used before it | 18 | 18 | — | 36 | UNCLASSIFIED | | |
| 5 | `host-publishes-no-a-record` | a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it | 1 | 1 | — | 3 | UNCLASSIFIED | | |
| 6 | `indexability-preflight` | a page's technical indexability state — a condition that blocks eligibility, or one left unmeasured | 368 | 368 | — | 720 | UNCLASSIFIED | | |
| 7 | `instrument-disagreement` | two of our own instruments disagree about the same page over the same inputs | 0 | 11 | 11 CLOSED | 11 | UNCLASSIFIED | | |
| 8 | `near-duplicate` | a page's body is highly similar to a sibling page's | 113 | 113 | — | 115 | UNCLASSIFIED | | |
| 9 | `noindex` | a page carries noindex in its meta robots tag or X-Robots-Tag header | 134 | 268 | 134 SUPERSEDED | 402 | UNCLASSIFIED | | |
| 10 | `official-source-contradicts-itself` | an official source states two things about the same fact that disagree | 1 | 1 | — | 1 | UNCLASSIFIED | | |
| 11 | `orphan-within-crawled-set` | no page inside the crawled set links to this page | 340 | 340 | — | 340 | UNCLASSIFIED | | |
| 12 | `query-parameters` | a page's URL carries query parameters | 1 | 1 | — | 2 | UNCLASSIFIED | | |
| 13 | `robots-blocks-search-crawler` | robots.txt disallows a search crawler from a page that draws search impressions | 106 | 106 | — | 318 | UNCLASSIFIED | | |
| 14 | `sitemap-advertises-blocked-url` | a sitemap advertises a URL that robots.txt blocks — or the inputs to check it are not stored | 350 | 350 | — | 700 | UNCLASSIFIED | | |
| 15 | `status-and-redirects` | requesting a page's URL does not return 200 directly — it redirects or errors | 7 | 7 | — | 14 | UNCLASSIFIED | | |
| 16 | `template-dominance` | the shared shell makes up most of a page's words | 110 | 110 | — | 114 | UNCLASSIFIED | | |
| 17 | `thin-content` | a page has fewer unique body words than the floor after the shell is subtracted | 226 | 226 | — | 346 | UNCLASSIFIED | | |

## Part C — recommendations no register entry can reach

- `REC-AI-CRAWLER-BLOCK` — its evidence links no issue, so no finding class — and no register entry — can apply to it. **Ruling (its own entry, or leave UNKNOWN):** ______________________________

A class left blank stays UNCLASSIFIED — a real state, not a gap. Each ruled level is written into
`config/consequence-register.mjs` with the owner's name, the date and the reason. Nothing else may set one.
