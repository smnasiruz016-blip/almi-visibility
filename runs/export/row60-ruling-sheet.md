# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · RULED 14 SEPTEMBER 2026 · SEVEN CLASSES SPLIT

> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/row60-ruling-sheet.mjs --confirm` writes it from the evidence store at 2026-10-07T02:19:00.230Z.
> Every count is derived by applying each state-change record to its issue on issue_id, with each issue counted under
> the class its own stored fields place it in (`config/class-splits.mjs`). Every description, level and attribution is
> copied from `config/consequence-register.mjs`, the scale from `config/consequence-scale.mjs`. The sheet sets no level.
> A detector's `severity` is not a consequence level and is not shown.

## Files read — every `.jsonl` under `runs/`

| file | records | issue records | state changes | recommendations |
|---|---|---|---|---|
| `observations/crawl-2026-09-12/first-real-crawl-2026-09-12.jsonl` | 999 | 0 | 0 | 0 |
| `observations/sitemap-2026-09-12/sitemaps.jsonl` | 5 | 0 | 0 | 0 |
| `runs/audit/content-findings.jsonl` | 721 | 596 | 125 | 0 |
| `runs/audit/crawler-classification.jsonl` | 32 | 0 | 0 | 0 |
| `runs/audit/findings.jsonl` | 134 | 107 | 0 | 0 |
| `runs/audit/instrument-findings.jsonl` | 22 | 11 | 11 | 0 |
| `runs/audit/recommendations.jsonl` | 10 | 0 | 0 | 3 |
| `runs/audit/source-integrity.jsonl` | 15 | 0 | 0 | 0 |
| `runs/audit/supply-labels.jsonl` | 790 | 670 | 120 | 0 |
| `runs/audit/technical-findings.jsonl` | 2888 | 1886 | 134 | 0 |
| `runs/audit/verification-issues.jsonl` | 15 | 2 | 0 | 0 |
| `runs/cost/actions-runs.jsonl` | 1 | 0 | 0 | 0 |
| `runs/cost/ledger.jsonl` | 22 | 0 | 0 | 0 |
| `runs/evidence/evidence.jsonl` | 50 | 0 | 0 | 0 |
| `runs/evidence/external-observations-2026-09-15.jsonl` | 9 | 0 | 0 | 0 |
| `runs/evidence/robots.jsonl` | 5 | 0 | 0 | 0 |
| `runs/render/rendered-2026-09-13.jsonl` | 394 | 0 | 0 | 0 |
| `runs/replay/replay-audit-dns-2026-09-13-journey-key.jsonl` | 268 | 107 | 0 | 0 |
| `runs/replay/replay-audit-dns-2026-09-13.jsonl` | 268 | 107 | 0 | 0 |
| `runs/replay/replay-crawl-2026-09-13-journey-key.jsonl` | 788 | 0 | 0 | 0 |
| `runs/replay/replay-crawl-2026-09-13.jsonl` | 788 | 0 | 0 | 0 |
| **21 files** | **8224** | **3486** | **390** | **3** |

## Part A — the owner's scale, strongest first

- **CRITICAL** — consequence irreversible, or practical recovery not dependable; credible risk of catastrophic or systemic loss to security, data, production or search visibility.
- **HIGH** — material serious harm possible, but recovery is possible — costly, complex, slow, or demanding broad intervention.
- **MODERATE** — meaningful harm, bounded and reversible, recoverable by normal corrective work.
- **LOW** — limited or minor consequence; easily reversible; does not materially threaten core production, data, security or indexation integrity.
- **NONE** — verified no material adverse consequence.

**UNCLASSIFIED is not a level.** It is UNKNOWN: never low, never ranked, routed to owner review (A4).

Units: **distinct** = issues, by issue_id · **open** = distinct issues still OPEN after every state change · **raw** = issue records, duplicate copies included · **not run** = distinct issues that record a check that never ran — not a defect found.

## Part B — the 11 levels already ruled (unchanged, attributed)

| # | class | what it is (the register's words) | open | distinct | ruled states | raw | not run | level | ruled by |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `canonical` | a page's raw HTML carries no rel=canonical link | 6 | 6 | — | 12 | 0 | LOW | owner 2026-09-14 |
| 2 | `commencement-date-ambiguous-against-source` | a fact's commencement date cannot be read unambiguously from its official source | 1 | 1 | — | 1 | 0 | MODERATE | owner 2026-09-14 |
| 3 | `exact-duplicate` | a page's body is byte-identical to other pages' | 106 | 106 | — | 106 | 0 | HIGH | owner 2026-09-14 |
| 4 | `head-elements` | a page's heading structure is broken — no h1, or a heading level used before it | 18 | 18 | — | 36 | 0 | LOW | owner 2026-09-14 |
| 5 | `host-publishes-no-a-record` | a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it | 1 | 1 | — | 3 | 0 | HIGH | owner 2026-09-14 |
| 6 | `indexability-preflight-found` | the indexability check ran on a page and found a condition that blocks its eligibility | 158 | 158 | — | 300 | 0 | MODERATE | owner 2026-09-14 |
| 7 | `instrument-disagreement` | two of our own instruments disagree about the same page over the same inputs | 0 | 11 | 11 CLOSED | 11 | 0 | HIGH | owner 2026-09-14 |
| 8 | `official-source-contradicts-itself` | an official source states two things about the same fact that disagree | 1 | 1 | — | 1 | 0 | HIGH | owner 2026-09-14 |
| 9 | `query-parameters` | a page's URL carries query parameters | 1 | 1 | — | 2 | 0 | LOW | owner 2026-09-14 |
| 10 | `robots-blocks-search-crawler` | robots.txt disallows a search crawler from a page that draws search impressions | 106 | 106 | — | 318 | 0 | MODERATE | owner 2026-09-14 |
| 11 | `status-and-redirects` | requesting a page's URL does not return 200 directly — it redirects or errors | 7 | 7 | — | 14 | 0 | LOW | owner 2026-09-14 |

## Part B1 — the 0 finding classes for the owner to rule: LEVEL and WHY are blank

A half is a new class: no level of the class it was split from carries to it. A class whose name ends
`-check-not-run` holds checks that never ran — nothing was found in it, and nothing was ruled out.

| # | class | split from | what it is (the register's words) | open | distinct | ruled states | raw | not run | LEVEL | WHY |
|---|---|---|---|---|---|---|---|---|---|---|

## Part B2 — the consequence-first order

Consequence first; the open count only amplifies INSIDE a level; the class name is the last, deterministic tie-break.

| rank | class | level | open |
|---|---|---|---|
| 1 of 11 | `exact-duplicate` | HIGH | 106 |
| 2 of 11 | `host-publishes-no-a-record` | HIGH | 1 |
| 3 of 11 | `official-source-contradicts-itself` | HIGH | 1 |
| 4 of 11 | `instrument-disagreement` | HIGH | 0 |
| 5 of 11 | `indexability-preflight-found` | MODERATE | 158 |
| 6 of 11 | `robots-blocks-search-crawler` | MODERATE | 106 |
| 7 of 11 | `commencement-date-ambiguous-against-source` | MODERATE | 1 |
| 8 of 11 | `head-elements` | LOW | 18 |
| 9 of 11 | `status-and-redirects` | LOW | 7 |
| 10 of 11 | `canonical` | LOW | 6 |
| 11 of 11 | `query-parameters` | LOW | 1 |

## Part D — THE COVERAGE POPULATION: checks that never ran. Not findings, never a level, never ranked

A check that never ran says nothing about the product. It says something about our instrument: we could not look.

| class | split from | checks not run | raw | reason codes | what is missing |
|---|---|---|---|---|---|
| `indexability-preflight-check-not-run` | `indexability-preflight` | 210 | 420 | MISSING_INPUT | a required input was absent, so two eligibility conditions — notRobotsDisallowed and inSitemap — could not be evaluated for the page. The records name the unmeasured conditions, not the input that was missing |
| `near-duplicate-check-not-run` | `near-duplicate` | 108 | 110 | MISSING_INPUT / TOOL_FAILED | 106: a required input was absent, and the records do not name which. 2: the tool failed — shell subtraction was not confident, so nothing remained to compare |
| `orphan-within-crawled-set-check-not-run` | `orphan-within-crawled-set` | 340 | 340 | NEEDS_RENDERED_HTML | rendered HTML — every record is renderMode RAW_HTML in v0.1, so a link injected by JavaScript is invisible; and the crawled set is a sample of a much larger site |
| `sitemap-advertises-blocked-url-check-not-run` | `sitemap-advertises-blocked-url` | 350 | 700 | MISSING_INPUT | a stored robots.txt, or stored sitemap URLs, for the host — the records say "no stored robots.txt or no sitemap URLs for this host" |
| `template-dominance-check-not-run` | `template-dominance` | 108 | 110 | MISSING_INPUT / TOOL_FAILED | 106: a required input was absent, and the records do not name which. 2: the tool failed — shell subtraction was not confident, so nothing remained outside the shell to weigh |
| `thin-content-check-not-run` | `thin-content` | 108 | 110 | MISSING_INPUT / NEEDS_RENDERED_HTML | 106: the stored page body was not available to the run. 2: rendered HTML — the body is empty in raw HTML, and a client-rendered page cannot be told from an empty one |
| **total** | | **1224** | | | |

## Part E — DECISIONS ON RECORD: a deliberate choice whose consequence is not established. Never a level, never ranked — it waits on the owner

| class | split from | issues | open | raw | what was decided | why its consequence is not established | waits on |
|---|---|---|---|---|---|---|---|
| `near-duplicate-review-signal` | `near-duplicate` | 5 | 5 | 5 | PG-A1 (owner): body similarity to a sibling page no longer decides anything (RTP-1 S10); the 15 named T-2 runs (RR-195) superseded every version-1 FAIL by a version-2 review signal that keeps the page and its measured value, labelled | Whether any of these pages fails its need is NOT established by the number: completeness is judged for a need (P21), by a human, page by page | `PG-A1` |
| `noindex-declared-deliberate` | `noindex` | 134 | 134 | 134 | to de-index these cv-guide pages deliberately: noindex, correctly configured and crawlable, keyed on a country-verification gate (commit 50f8c20, as the review record reads) | Whether it is still the right rule is UNKNOWN from our evidence: the premise it cites is not confirmed by our similarity measurement. Owner's decision: REC-NOINDEX-CV-GUIDE. | `REC-NOINDEX-CV-GUIDE` |
| `template-dominance-review-signal` | `template-dominance` | 2 | 2 | 4 | PG-A1 (owner): the shell's share of a page's words no longer decides anything (RTP-1 S10); the 15 named T-2 runs (RR-195) superseded every version-1 FAIL by a version-2 review signal that keeps the page and its measured value, labelled | Whether any of these pages fails its need is NOT established by the number: completeness is judged for a need (P21), by a human, page by page | `PG-A1` |
| `thin-content-review-signal` | `thin-content` | 118 | 118 | 236 | PG-A1 (owner): the count of unique body words no longer decides anything (RTP-1 S10); the 15 named T-2 runs (RR-195) superseded every version-1 FAIL by a version-2 review signal that keeps the page and its measured value, labelled | Whether any of these pages fails its need is NOT established by the number: completeness is judged for a need (P21), by a human, page by page | `PG-A1` |

### `near-duplicate-review-signal` — every page and its measured signal (5); the value decides nothing (PG-A1)

| page (target_page_id) | signal | measured value | review bound | state |
|---|---|---|---|---|
| `70dd4bdbfdbfeb43` | body-similarity | 0.903 | 0.9 | OPEN |
| `c55222edeb1a7f19` | body-similarity | 0.908 | 0.9 | OPEN |
| `d2098da6971dafa4` | body-similarity | 0.908 | 0.9 | OPEN |
| `d6416221c5fb5823` | body-similarity | 0.911 | 0.9 | OPEN |
| `e56cb84e1c8ef1a6` | body-similarity | 0.911 | 0.9 | OPEN |

### `template-dominance-review-signal` — every page and its measured signal (2); the value decides nothing (PG-A1)

| page (target_page_id) | signal | measured value | review bound | state |
|---|---|---|---|---|
| `1ae7229a4c6c63cd` | shell-share | 0.76 | 0.75 | OPEN |
| `6dbc913d781d447e` | shell-share | 0.96 | 0.75 | OPEN |

### `thin-content-review-signal` — every page and its measured signal (118); the value decides nothing (PG-A1)

| page (target_page_id) | signal | measured value | review bound | state |
|---|---|---|---|---|
| `0062d5f3e556b0de` | unique-body-words | 206 | 350 | OPEN |
| `031b6876cda8cf9b` | unique-body-words | 256 | 350 | OPEN |
| `0374fe0a482873c7` | unique-body-words | 347 | 350 | OPEN |
| `080cc740ee5c6b1c` | unique-body-words | 204 | 350 | OPEN |
| `0885500bd0856856` | unique-body-words | 101 | 350 | OPEN |
| `0b78c4df190a4246` | unique-body-words | 86 | 350 | OPEN |
| `0cc3b6f139176072` | unique-body-words | 200 | 350 | OPEN |
| `0e420312cbd16341` | unique-body-words | 344 | 350 | OPEN |
| `11db5c8ea6ffa35c` | unique-body-words | 328 | 350 | OPEN |
| `13115853f5c75828` | unique-body-words | 340 | 350 | OPEN |
| `1ad3b4b025dbc0e2` | unique-body-words | 311 | 350 | OPEN |
| `1ae7229a4c6c63cd` | unique-body-words | 29 | 350 | OPEN |
| `1f6a3ad5e4767e07` | unique-body-words | 257 | 350 | OPEN |
| `212c7ca84b65e467` | unique-body-words | 101 | 350 | OPEN |
| `23fb5f51e14eb009` | unique-body-words | 232 | 350 | OPEN |
| `25066b5ff14ee813` | unique-body-words | 215 | 350 | OPEN |
| `28c24ba38dd43a5f` | unique-body-words | 233 | 350 | OPEN |
| `2d6cf82a519a04fb` | unique-body-words | 286 | 350 | OPEN |
| `2f7b78d64fe81454` | unique-body-words | 215 | 350 | OPEN |
| `3189e740766271e8` | unique-body-words | 333 | 350 | OPEN |
| `35776a8334251d9c` | unique-body-words | 162 | 350 | OPEN |
| `37e9bc34915ec485` | unique-body-words | 252 | 350 | OPEN |
| `3cdcc32d3aa6a001` | unique-body-words | 277 | 350 | OPEN |
| `3ce9e2e497d4859b` | unique-body-words | 114 | 350 | OPEN |
| `424114372a159300` | unique-body-words | 174 | 350 | OPEN |
| `42de49ceb98cad8f` | unique-body-words | 230 | 350 | OPEN |
| `42f94d2e797c14a5` | unique-body-words | 314 | 350 | OPEN |
| `45ee54cd2a3c9206` | unique-body-words | 101 | 350 | OPEN |
| `46ede219a1fa4651` | unique-body-words | 162 | 350 | OPEN |
| `48dda615cecaef4e` | unique-body-words | 276 | 350 | OPEN |
| `49769c9983efa118` | unique-body-words | 101 | 350 | OPEN |
| `49fcc296f36d5f1a` | unique-body-words | 311 | 350 | OPEN |
| `4d97e41599d93994` | unique-body-words | 217 | 350 | OPEN |
| `4de2148110a83e97` | unique-body-words | 204 | 350 | OPEN |
| `51d28730a20ba7e7` | unique-body-words | 186 | 350 | OPEN |
| `54e7b47bbc67a448` | unique-body-words | 212 | 350 | OPEN |
| `5642e98154f9d14b` | unique-body-words | 318 | 350 | OPEN |
| `5709ba906e254d40` | unique-body-words | 206 | 350 | OPEN |
| `5902bc0f841038e0` | unique-body-words | 346 | 350 | OPEN |
| `5b205913c59484ed` | unique-body-words | 86 | 350 | OPEN |
| `5e8fed8b809493be` | unique-body-words | 101 | 350 | OPEN |
| `603d69707f730c7a` | unique-body-words | 222 | 350 | OPEN |
| `61740f300e53a128` | unique-body-words | 205 | 350 | OPEN |
| `61a8f910901b13c4` | unique-body-words | 200 | 350 | OPEN |
| `644006003ef4349a` | unique-body-words | 199 | 350 | OPEN |
| `67863f818cb3da4f` | unique-body-words | 205 | 350 | OPEN |
| `67ce1a8bd57df8b5` | unique-body-words | 191 | 350 | OPEN |
| `685b569c81f15063` | unique-body-words | 347 | 350 | OPEN |
| `6ac6b0e5c74a043f` | unique-body-words | 329 | 350 | OPEN |
| `6ae6ab307bacd9f9` | unique-body-words | 323 | 350 | OPEN |
| `6dbc913d781d447e` | unique-body-words | 14 | 350 | OPEN |
| `709c97b4be9b5fda` | unique-body-words | 266 | 350 | OPEN |
| `718d8914ee85adeb` | unique-body-words | 215 | 350 | OPEN |
| `73c2ef80f43d620b` | unique-body-words | 199 | 350 | OPEN |
| `75290a39889ba930` | unique-body-words | 67 | 350 | OPEN |
| `78772aa7baba8950` | unique-body-words | 346 | 350 | OPEN |
| `78a51f495b2f4572` | unique-body-words | 293 | 350 | OPEN |
| `796cb0ca5942711a` | unique-body-words | 196 | 350 | OPEN |
| `7a7484eb48c69d0a` | unique-body-words | 267 | 350 | OPEN |
| `7a9d83b79385be20` | unique-body-words | 162 | 350 | OPEN |
| `8607cdc2ca05ea52` | unique-body-words | 345 | 350 | OPEN |
| `874e71a7f8392942` | unique-body-words | 304 | 350 | OPEN |
| `8767ab1401b86ab0` | unique-body-words | 114 | 350 | OPEN |
| `8be42b59bd2b6b06` | unique-body-words | 290 | 350 | OPEN |
| `8c063e035391b4ac` | unique-body-words | 169 | 350 | OPEN |
| `8eb04f89161a18c7` | unique-body-words | 162 | 350 | OPEN |
| `92cdce200077ac54` | unique-body-words | 330 | 350 | OPEN |
| `95936e8d40c94a60` | unique-body-words | 212 | 350 | OPEN |
| `975ef5b7071b364c` | unique-body-words | 192 | 350 | OPEN |
| `9d49bd9891280248` | unique-body-words | 310 | 350 | OPEN |
| `a209b7287c8f31ea` | unique-body-words | 204 | 350 | OPEN |
| `a2e6cbadbc62701a` | unique-body-words | 79 | 350 | OPEN |
| `a489fd1b2a4a8e41` | unique-body-words | 317 | 350 | OPEN |
| `a6931086f351ce01` | unique-body-words | 324 | 350 | OPEN |
| `a796ae7b7f9ff623` | unique-body-words | 267 | 350 | OPEN |
| `a8e8feacb5790667` | unique-body-words | 310 | 350 | OPEN |
| `affb1209f6ca0d22` | unique-body-words | 287 | 350 | OPEN |
| `b35242571896e85e` | unique-body-words | 203 | 350 | OPEN |
| `b400031a19dd207e` | unique-body-words | 305 | 350 | OPEN |
| `b53c35053ce26d95` | unique-body-words | 202 | 350 | OPEN |
| `b67e4bf38cfc7c0b` | unique-body-words | 311 | 350 | OPEN |
| `b84e30477ad5774f` | unique-body-words | 202 | 350 | OPEN |
| `b98442bee9e50332` | unique-body-words | 147 | 350 | OPEN |
| `bd3d1213f6f25dd2` | unique-body-words | 201 | 350 | OPEN |
| `bd684b549bc715f9` | unique-body-words | 208 | 350 | OPEN |
| `c44584783ef92378` | unique-body-words | 262 | 350 | OPEN |
| `c8f99b7185d3ea5e` | unique-body-words | 109 | 350 | OPEN |
| `c90dc73c6d134cf7` | unique-body-words | 65 | 350 | OPEN |
| `c9a13b8054597b1a` | unique-body-words | 204 | 350 | OPEN |
| `cbe8fdc71b9a5e39` | unique-body-words | 285 | 350 | OPEN |
| `ce79a16ed74ba7be` | unique-body-words | 256 | 350 | OPEN |
| `d558a783cbadc01b` | unique-body-words | 162 | 350 | OPEN |
| `d6416221c5fb5823` | unique-body-words | 211 | 350 | OPEN |
| `d797533fa3d72a9f` | unique-body-words | 320 | 350 | OPEN |
| `d8c0e5c424a38c9d` | unique-body-words | 163 | 350 | OPEN |
| `dd170fc8b4d96e08` | unique-body-words | 275 | 350 | OPEN |
| `de367b729d27f4d7` | unique-body-words | 164 | 350 | OPEN |
| `de5faebd7d179ff8` | unique-body-words | 307 | 350 | OPEN |
| `df2b1e4753a4ad85` | unique-body-words | 60 | 350 | OPEN |
| `dfe9bbb322dfcacf` | unique-body-words | 226 | 350 | OPEN |
| `e56cb84e1c8ef1a6` | unique-body-words | 214 | 350 | OPEN |
| `e58026581e4f6a3b` | unique-body-words | 313 | 350 | OPEN |
| `e60c92eca5b6c365` | unique-body-words | 247 | 350 | OPEN |
| `e8c47253e9117c1f` | unique-body-words | 279 | 350 | OPEN |
| `e9948c79dbf5b622` | unique-body-words | 346 | 350 | OPEN |
| `e9c697b786c11be4` | unique-body-words | 148 | 350 | OPEN |
| `e9fe8b05d1b6dc1c` | unique-body-words | 164 | 350 | OPEN |
| `ea88faef0aaa1afc` | unique-body-words | 328 | 350 | OPEN |
| `eb8a12a543e42fd1` | unique-body-words | 320 | 350 | OPEN |
| `edd20b7176efa9b4` | unique-body-words | 264 | 350 | OPEN |
| `eecca47959f9eef6` | unique-body-words | 193 | 350 | OPEN |
| `f112e7cdbbf1596b` | unique-body-words | 327 | 350 | OPEN |
| `f5daca8027b9e387` | unique-body-words | 310 | 350 | OPEN |
| `f6a5384a2d6788cf` | unique-body-words | 202 | 350 | OPEN |
| `f805e0b60d83ea51` | unique-body-words | 163 | 350 | OPEN |
| `f9ef69c6efa6b631` | unique-body-words | 157 | 350 | OPEN |
| `fccfc83d6a60c311` | unique-body-words | 234 | 350 | OPEN |
| `fe43fd2c4529ea68` | unique-body-words | 336 | 350 | OPEN |

## Part F — THE AUDIT TRAIL: claims withdrawn as wrong. History, never live

| class | split from | issues | states | raw | why it was withdrawn |
|---|---|---|---|---|---|
| `near-duplicate-claim-withdrawn` | `near-duplicate` | 5 | 5 SUPERSEDED | 5 | the claim that a body similarity decided a defect was withdrawn under the owner's PG-A1 (RTP-1 S10); each FAIL was superseded by the 15 named T-2 runs (RR-195) by a version-2 review signal, now held under near-duplicate-review-signal |
| `noindex-defect-claim-withdrawn` | `noindex` | 134 | 134 SUPERSEDED | 268 | the claim that noindex on these pages was a DEFECT was withdrawn on 12 September 2026 — later evidence showed a deliberate de-indexing decision — and each claim was superseded by the review record now held under noindex-declared-deliberate |
| `template-dominance-claim-withdrawn` | `template-dominance` | 2 | 2 SUPERSEDED | 4 | the claim that a shell share decided a defect was withdrawn under the owner's PG-A1 (RTP-1 S10); each FAIL was superseded by the 15 named T-2 runs (RR-195) by a version-2 review signal, now held under template-dominance-review-signal |
| `thin-content-claim-withdrawn` | `thin-content` | 118 | 118 SUPERSEDED | 236 | the claim that a count of unique body words decided a defect was withdrawn under the owner's PG-A1 (RTP-1 S10); each FAIL was superseded by the 15 named T-2 runs (RR-195) by a version-2 review signal, now held under thin-content-review-signal |

**Every issue in exactly one population:** findings **416** + coverage gaps **1224** + decisions on record **259** + audit trail **259** = **2158** of **2158** distinct issues.

## Part B3 — the classes the split superseded (not in use; their words kept in the register)

| class | its level before the split | became |
|---|---|---|
| `indexability-preflight` | UNCLASSIFIED (owner) — carries to neither half | `indexability-preflight-found` + `indexability-preflight-check-not-run` |
| `near-duplicate` | MODERATE (owner) — carries to neither half | `near-duplicate-found` + `near-duplicate-check-not-run` |
| `near-duplicate-found` | MODERATE (owner) — carries to neither half | `near-duplicate-claim-withdrawn` + `near-duplicate-review-signal` |
| `noindex` | UNCLASSIFIED (owner) — carries to neither half | `noindex-defect-claim-withdrawn` + `noindex-declared-deliberate` |
| `orphan-within-crawled-set` | MODERATE (owner) — carries to neither half | `orphan-within-crawled-set-found` + `orphan-within-crawled-set-check-not-run` |
| `sitemap-advertises-blocked-url` | UNCLASSIFIED (owner) — carries to neither half | `sitemap-advertises-blocked-url-found` + `sitemap-advertises-blocked-url-check-not-run` |
| `template-dominance` | MODERATE (owner) — carries to neither half | `template-dominance-found` + `template-dominance-check-not-run` |
| `template-dominance-found` | MODERATE (owner) — carries to neither half | `template-dominance-claim-withdrawn` + `template-dominance-review-signal` |
| `thin-content` | MODERATE (owner) — carries to neither half | `thin-content-found` + `thin-content-check-not-run` |
| `thin-content-found` | MODERATE (owner) — carries to neither half | `thin-content-claim-withdrawn` + `thin-content-review-signal` |

## Part C — recommendations no register entry can reach

- `REC-AI-CRAWLER-BLOCK` — its evidence links no issue, so no finding class — and no register entry — can apply to it. **UNCLASSIFIED** — it rests on crawler observations, not on a finding class, so no class-keyed register entry can ever apply to it. Needs, defined and tested: affected scope; crawler access; robots directives in force; reversibility; the measured visibility or indexation consequence.

Each level is ruled by the owner and written into `config/consequence-register.mjs` with his name, the date and
the reason. Nothing else may set one.
