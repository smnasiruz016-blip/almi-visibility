# ALMIVISIBILITY — PASS BOUNDARIES, AMENDMENT 1 · THE OWNER'S TEXT

**Provenance — read this before using the text below.**

- **Source file:** `AlmiVisibility_PASS_BOUNDARIES_AMENDMENT_1.md`
- **Location when read:** `C:\Projects\_handoffs\` on this machine.
- **Ruled:** **12 September 2026**, by the owner. Authored by beta-g.
- **Amends:** `PASS_BOUNDARIES_SOURCE.md`. It does **not** replace it — the frozen ruling stands
  except where this amends it, and both are law.
- **Copy rule:** the body below is the file, **verbatim**. Nothing paraphrased or corrected.

## Why it exists

PR #46 reported that six features were ruled as two-column tables and never given the four-part
contract, so **none of them could ever have been ticked**. The owner accepted that as his defect
and closed it here. This is what a boundary changing *by owner ruling, recorded with its date and
reason* looks like — the mechanism working, not being worked around.

## Hash verification

| artifact | bytes | sha256 |
|---|---|---|
| `AlmiVisibility_PASS_BOUNDARIES_AMENDMENT_1.md` as read | 5,524 | `ef874f095048938a095613d140aba10451237afa26e6ea14a8aef07a962cc723` |
| the body below (LF-normalised) | — | `ef874f095048938a095613d140aba10451237afa26e6ea14a8aef07a962cc723` |

🔴 Verified by `tools/verify-pass-boundaries-source.mjs`, whose CLI **exits non-zero on a single
corrupted byte** — RED-proved, not assumed. A verifier that prints nothing and exits 0 reads
exactly like a pass, and this repository has already shipped one of those.

## Independent census of the body

| | |
|---|---|
| v0.1-half contracts | **6** — items 10, 12, 13, 14, 25, 38 |
| four-part rows across them | **24** (6 × 4) |

Counted apart from the hash. A hash catches a changed byte; it does not say what the document is
supposed to contain. **Six** is the number §4's "five" got wrong, so it is asserted on its own.

---

# PASS BOUNDARIES — AMENDMENT 1

**12 September 2026. Authored by beta-g. Amends `AlmiVisibility_PASS_BOUNDARIES_FROZEN.md`.**
Raised by CC in PR #46 and correct: six features were ruled as two-column tables and never given
the four-part contract, so **none of them could ever have been ticked.** That was my defect, not
CC's, and this closes it.

---

## A1 · THE COUNT IS SIX, NOT FIVE

§4 of the frozen document named five split features. §6 marked a sixth — **item 25**. The document
contradicted itself.

> **There are SIX split features: 10, 12, 13, 14, 25, 38.**

§4's heading is amended to read six. Item 25's split, already stated in §6, stands.

---

## A2 · THE FOUR-PART CONTRACT FOR EACH v0.1 HALF

The deferred half of each split needs no testable contract — it cannot be run. Its final boundary
stays exactly as §4 and §5 record it. **What was missing is the v0.1 half, and here it is.**

---

### 10 · Technical SEO Audit Engine — v0.1 half

| | |
|---|---|
| **INPUT** | the crawled corpus, its served HTML and headers, redirect chains, the edge graph, and the `robots.txt` and sitemap files of the hosts involved |
| **EXPECTED** | each of the six named classes — status · redirects · sitemap · robots/indexability · canonical · **served-HTML content and link evidence** — returns, for every page, either a finding or an explicit UNKNOWN carrying its reason |
| **FAILURE** | any of the six classes is absent; or a class returns `null` where it could not run; or a served-HTML conclusion is drawn on a body that was truncated |
| **EVIDENCE** | per class: a firing fixture, a silent clean control, and the class run over the real corpus with its counts — plus the UNKNOWN path exercised at least once on real data |

### 12 · Duplicate / Thin / Template Detection — v0.1 half

| | |
|---|---|
| **INPUT** | the corpus, with shell subtraction defined and printed |
| **EXPECTED** | exact-duplicate, near-duplicate, thin and template-dominance each classify every page and each emits **evidence only** |
| **FAILURE** | any supply label produces a demand or opportunity conclusion; or shell subtraction is undefined, untested, or not printed beside the result |
| **EVIDENCE** | the four classifications over the real corpus; the shell definition printed; the shell-heavier-than-body test; and the item-8 guard passing |

### 13 · Cannibalization Prevention — v0.1 half

| | |
|---|---|
| **INPUT** | query×page data in which one query draws impressions on more than one URL |
| **EXPECTED** | every such overlap detected and reported with its query, the competing URLs and their positions |
| **FAILURE** | a real overlap is missed, **or** a single-URL query is reported as an overlap |
| **EVIDENCE** | detection over real query data, a firing fixture, a clean control, and the number of queries searched stated |

### 14 · No Blind Regeneration — v0.1 half

| | |
|---|---|
| **INPUT** | the repository as it stands, and a rediscovered URL |
| **EXPECTED** | a census proves **no generator, no page-writing path and no product-repository write path exists**; and a rediscovered URL resolves to its **existing** `page_id` |
| **FAILURE** | any generation or page-write path is found; or a rediscovered URL creates a second record |
| **EVIDENCE** | the census output RED-proved by adding a throwaway generator and removing it; and the ID-stability test sabotaged and restored |

> This is the one feature whose PASS is **an absence**. Prove the absence. Do not simulate the danger.

### 25 · Page Quality Gate — v0.1 half

| | |
|---|---|
| **INPUT** | an existing page, its siblings, and the claims it makes |
| **EXPECTED** | unique value, sibling overlap, verified-fact presence and source integrity each measured and reported per page |
| **FAILURE** | any of the four is fixture-only or absent; or a page carrying unsourced claims passes source integrity |
| **EVIDENCE** | the four measures over the real corpus, each with a firing fixture and a silent clean control |

### 38 · Indexability Preflight — v0.1 half

| | |
|---|---|
| **INPUT** | an existing page with its status, canonical, meta robots, `X-Robots-Tag`, matching `robots.txt` rule and sitemap membership |
| **EXPECTED** | an indexability **state** per page, and the words **INDEXABLE ≠ INDEXED** printed wherever that state is shown |
| **FAILURE** | indexability is reported as indexation; or any output states or implies that a page **will** be indexed, ranked or cited |
| **EVIDENCE** | the state over the real corpus, plus a test that fails the build on any indexing, ranking or citation promise in output |

---

## A3 · ITEM 8 — THE ONE CLASS-VERSUS-SCOPE DISAGREEMENT

CC found item 8 marked **P** in the ruling and **OUT** in the tracker — the only such disagreement
in 58 rows. **The ruling wins, and item 8 is in scope.**

The reason it belongs in v0.1: HEAVY / THIN / EMPTY is not a discovery capability, it is a
**guard** — and the thing it guards against is a supply label quietly becoming a demand claim.
That guard must exist from the first day there are labels, which is now. It is the cheapest and
earliest defence this product has against the failure that produced 43 million pages.

---

## A4 · WHAT THIS AMENDMENT DOES NOT DO

It does not tick anything. It does not change any deferred boundary. It does not lower any bar.
It gives six features the paimana they were missing, so that they can be **tested** — and,
if the evidence is not there, **failed**.
