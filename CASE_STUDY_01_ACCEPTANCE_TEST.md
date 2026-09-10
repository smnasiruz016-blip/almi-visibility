# Case Study #1 — AlmiVisibility Acceptance Test

**Written 10 September 2026, BEFORE any engine exists.** That order is the whole point.

## FREEZE LAW

> **Once the owner approves this file it is FROZEN.**
>
> Neither Claude Code nor any later implementation may change this test to match the engine's
> behaviour. **The test comes first. The implementation comes second.** If the engine cannot pass
> a defect written here, the engine has failed — the test has not.
>
> A change to this file requires the owner's explicit approval, recorded with a date and a
> reason, and the reason may never be *"the engine reports it differently"*.

## PASS MARK — written before any result exists

| | |
|---|---|
| **PASS** | **6 of 6 RED defects found unaided** **AND** **0 of 3 CONTROL pages flagged** |
| **FAIL** | anything else — including 6/6 RED with **one** control false positive |

**There is no half pass.** A detector that finds every defect and also cries about clean pages is
not a detector; it is noise with a good recall score. **A false positive on any control is FAIL.**

## What the engine is told, and what it is not

- The engine is given: the corpus (below), the product's public URLs, its repository at a pinned
  commit, and the source registry.
- **The engine is NEVER told where the defects are, how many there are in each class, or that
  this file exists.** No hint, no list of suspect URLs, no "check these six".
- The engine must produce a findings ledger. This test is scored **against that ledger**, by a
  human, once.

---

## 🔴 THE FROZEN CORPUS — the finding that shapes this test

**Most of these defects were fixed.** AlmiOET has been audited hard for weeks; the register
exists because things were found and repaired. So:

- A test that runs against the **live** site would find nothing for several of the six, and would
  **decay every time a page changes**. That is an unfalsifiable test wearing a falsifiable name.
- **Therefore this test runs against a FROZEN CORPUS**, not the live network:
  - the repository at a **named commit**,
  - an **archived copy of the rendered HTML** of every URL listed here, captured on a stated date,
  - the sitemap XML as served on that date,
  - the source registry (`docs/sources/`) as it stood at that commit.

### ✅ THE FIRST PIN IS TAKEN — `case-study-01/corpus/`

**Captured 10 September 2026.** Full record: **`case-study-01/corpus/MANIFEST.md`**.

| | |
|---|---|
| repository pin | `smnasiruz016-blip/almi-oet` @ **`07852f9e87c4273c5486445986251d11e415ecdf`** |
| that commit | `fix: GAP-054 — omitted safety information is a PURPOSE failure… (#112)` |
| deployed | Production deployment `6360382081`, **state success**, 2026-09-09T22:16:29Z |
| captured | 9 URLs × **3 consecutive requests each**, with status, `x-vercel-cache`, `age`, `cache-control` and a **SHA-256 of every body** |
| plus | `robots.txt`, `sitemap-index.xml`, and the **SHA-256 + URL count of all six child sitemaps** (the sitemaps themselves are 240,328 URLs and are not stored — their hashes pin them) |
| size | 801 KB, 22 files |

**The repository half of the corpus is the commit, not a copy.** `git checkout 07852f9` restores
the source exactly.

**This pin serves two of the six defects — RED 2 and RED 3 — and it serves them completely.**
**Four still need a second, older pin** (RED 1, 4, 5, 6), because the defect must be *present* to
be *found* and those were fixed before this commit. Which commits those are is open question Q3
below, and it is the owner's to answer.

> **So: the test cannot be run yet. That is the correct state, not a blocker to route around.**
> Half a corpus does not become a whole one by lowering the pass mark.

**Two of the six are reproducible on the live site today** (measured 10 September 2026) and are
marked **✅ VERIFIED LIVE — IN THE CORPUS**. The other four are marked **⏳ NEEDS A SECOND PIN**
with the exact historical locator.

---

# THE SIX RED DEFECTS

## RED 1 — A public promise of a grade band the scoring engine never issued

**The class:** a page states, to the public, a grade or band that the product's own scoring code
does not and cannot produce.

**Pinned locator:** `src/lib/oet/scale.ts` — the block headed
**`🔴 OVERALL SCORE — DISPUTED, AND NOTHING HERE DECIDES IT`**, which records in the file's own
words that *"This file has asserted BOTH sides… Neither sentence ever had an artefact behind
it"*, against the owner's browser reading that OET reports no overall score. Any public surface
built on the "overall score" side of that flip-flop states a band the engine never issues.
Cross-reference: `_handoffs/AI_VISIBILITY_TARGETS.md`, question 10, still marked ❌ *"Hal hone
tak ye safha na banay"* — do not build that page until it is resolved.

**Status: ⏳ NEEDS A SECOND PIN.** The page was never built, precisely because the contradiction
was caught. The corpus must therefore include the **repository at the commit where `scale.ts`
asserted the second version**, so the claim is present to be found.

**What counts as FOUND:** the ledger names the scoring claim, says it is unsupported by any
artefact, and points at the file — without being told the file.

---

## RED 2 — An external-authority factual claim with no source-registry evidence

**The class:** the product states something about an outside body (a regulator, an exam board, a
standards agency) as fact, and the source registry holds nothing that supports it.

**Pinned locator — VERIFIED LIVE, 10 September 2026:**

- `src/lib/oet/professions.ts:1` — *"The 12 OET professions — the official CBLA / UK NARIC list."*
- `docs/sources/` — **contains one file, `README.md`.** There is no source artefact for CBLA, for
  UK NARIC, or for the number twelve.
- The claim is public: the twelve professions drive the `/[profession]/…` URL space, which is
  **240,328 live URLs**.
- Cross-reference: `_handoffs/AI_VISIBILITY_TARGETS.md` questions 1 and 5, both marked ⚠️ with
  *"12 ki fehrist ki sanad nahi"* — the list has no source.

**Status: ✅ VERIFIED LIVE — IN THE CORPUS.** Served by the pin `07852f9`; the claim is in `src/lib/oet/professions.ts:1` at that commit and `docs/sources/` at that commit holds only a README.

**What counts as FOUND:** the ledger names an external-authority claim, states that the source
registry has no evidence for it, and does not confuse it with a claim that *is* sourced.

---

## RED 3 — A wrong indexability / serving state: the declared render mode is not the served one

**The class:** the page declares one serving state and the deployment delivers another. The
declaration is in the repository, the truth is only in the response headers.

**Pinned locator — VERIFIED LIVE, 10 September 2026, traced end to end:**

| step | evidence |
|---|---|
| the declaration | `src/app/[profession]/[fromOrigin]/[organization]/page.tsx`: `export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes` |
| the rule the codebase already knows | `src/app/layout.tsx`: *"NO HEADER HERE, DELIBERATELY… reading the session in the ROOT layout makes every route under it dynamic"* |
| what voids it one level down | `src/app/[profession]/layout.tsx` → `export { default } from "@/components/SiteChrome"` → `SiteChrome.tsx` calls `await getCurrentUser()` (a cookie read) |
| the build's own verdict | `ƒ /[profession]/[fromOrigin]/[organization]` — **dynamic**, not static, not ISR |
| the served response | `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` |
| three requests in a row to `/nursing/from-bhutan/ie-nmbi` | `x-vercel-cache=MISS`, `age=0` — **every time** |
| the scale | **240,328 URLs** |

**Status: ✅ VERIFIED LIVE — IN THE CORPUS.** Four route patterns captured three times each in `case-study-01/corpus/pages/`, with two cached controls (`/` and `/forgot-password`, HIT HIT HIT) proving the platform caches correctly when nothing reads a cookie.

**What counts as FOUND:** the ledger reports that the served state contradicts the declared state,
**from the response**, not from reading the export. An engine that reads `revalidate = false` and
records "static" has failed this defect while appearing to pass it.

---

## RED 4 — A sitemap URL that 404s, redirects, or is non-indexable

**The class:** the sitemap admits a URL that a crawler cannot keep.

**Measured today, and the honest result:** **48 URLs sampled across all six AlmiOET child
sitemaps (8 per file, spread across each file, not the first eight): 48 of 48 returned HTTP
200.** No 404, no redirect, at this sample size.

**Status: ⏳ NEEDS A SECOND PIN.** The class is real and recorded in this project's own lessons —
the case where **8 of 9 indexed URLs returned 301 → 404** because the redirect targets had been
*derived* and never *checked*. It is not reproducible on AlmiOET today.

**Corpus requirement:** a pinned sitemap + response snapshot from a deployment where the breakage
existed, **or** the owner nominates a different product for this defect class. Section 4 of the
architecture report offers a candidate: **AlmiPathway is in the product registry and its domain
does not resolve at all** — no robots.txt, no sitemap, nothing. That is the same fault class at
product scale.

**What counts as FOUND:** the ledger names the specific URLs and their actual status, and does
not report a 200 as broken.

---

## RED 5 — A rendered count that does not match the underlying data

**The class:** a page tells the reader a number — how many items, how many organisations, how
many questions — and the data behind the page says something else.

**Pinned locator:** this project has already built a permanent guard for exactly this shape:
`scripts/gates/prompt-shape.ts` in AlmiOET, which exists because prompts stated a question count
or an option count that the item did not keep, and `scripts/gates/claims.ts`, which exists
because *"a promise on screen must match the symbol that delivers it"*. Both gates are green
today, which is the point: **the defect was real, and it was fixed by a check.**

**Status: ⏳ NEEDS A SECOND PIN**, at a commit **before** the relevant gate landed, so an instance is present.

**What counts as FOUND:** the ledger names the page, the number it renders, the number the data
holds, and the difference — without being told which page to compare.

---

## RED 6 — An internal link present in the source but absent from the rendered HTML

**The class:** the component links somewhere; the delivered HTML does not. Source proof is not
render proof.

**Pinned locator:** the recorded instance in this project is the case where a build pipeline
**changed the delivered output** relative to the source — *"Turbopack ate a space esbuild and SWC
kept"* — which is the same failure shape: a source-level assertion that the rendered artefact
does not satisfy.

**Supporting live measurement, 10 September 2026:** the sampled pSEO pages render **5 distinct
internal links each**, on pages that sit in a 240,328-URL space with siblings by profession, by
origin and by organisation. **Whether the template intends more than five is a question for the
frozen corpus, not an assertion made here.** It is recorded as an observation, not as the defect.

**Status: ⏳ NEEDS A SECOND PIN.**

**What counts as FOUND:** the ledger names the link that exists in the component and is missing
from the rendered HTML, having compared the two — not having read only one of them.

---

# THE THREE CONTROL PAGES

**All three are real, live AlmiOET URLs, verified 10 September 2026. The engine must report
NONE of them as carrying any of the six defects.**

## CONTROL 1 — `https://almioet.almiworld.com/nursing/from-india/uk-nmc`

**Why it is clean, and the trap it sets:** it carries a **legitimate, sourced, correct number** —
*"Required OET grade: Listening B · Reading B · Writing C+ · Speaking B"* — for the Nursing and
Midwifery Council. This is the control the owner required: **a page with a valid, referenced
number.** The organisation's grade is one of the **574 of 610** that carry a real published grade.

**The false positive it catches:** an engine that treats **any** public grade claim as RED 1
without checking whether the registry supports it. Recall without discrimination fails here.

**Verified:** HTTP 200 · canonical self-referential · `robots` default index,follow.

## CONTROL 2 — `https://almioet.almiworld.com/nursing/from-india/uk-ukvi`

**Why it is clean, and the trap it sets:** UK Visas and Immigration is one of the **36 of 610**
organisations with **no published grade**, and the page says exactly that:
*"Required OET grade: **Not published — confirm with UK Visas and Immigration (UKVI)**"*.

**This is the correct behaviour, and it is the hardest control in the set.** The page has a
missing value and says so instead of inventing one.

**The false positive it catches:** an engine that reads *absent data* as *a defect*, or that
flags "incomplete page" when declining to state an unknown is precisely what the product should
do. **Silence, correctly labelled, is not a fault.**

**Verified:** HTTP 200 · the "Not published" wording present in the rendered HTML.

## CONTROL 3 — `https://almioet.almiworld.com/nursing/from-bhutan/ie-nmbi`

**Why it is clean, and the trap it sets:** a second sourced grade — *"Listening B · Reading B ·
Writing B · Speaking B"* — on a different regulator, a different origin country and a different
grade shape from Control 1, so an engine cannot pass by memorising one string.

**The false positive it catches:** an engine that has learned "C+ is suspicious" or that keys off
one organisation.

**Verified:** HTTP 200 · canonical `https://almioet.almiworld.com/nursing/from-bhutan/ie-nmbi`
(self-referential, matches the URL) · indexable.

### 🔴 TWO properties all three controls share — and the scoring rule that follows

**This section is part of the test, not a caveat about it.** It was written after the corpus was
captured, because capturing it exposed a flaw in an earlier draft of this file: the three
controls are leaf pages, and **RED 3 is true of every leaf page**, so an earlier version of this
document asked the engine both to find RED 3 and not to report it on the same URLs. That was
incoherent. The fix is the distinction below, and it makes the test **harder**, not softer.

**Property 1 — all three are thin and duplicated.** 66–167 unique words against a threshold of
350, and 76–95 % sibling overlap (architecture report §10.1).

**Property 2 — all three sit on an uncached route.** `x-vercel-cache: MISS` on three consecutive
requests, `Cache-Control: private, no-store` — because they are under the same layout as the
RED 3 exhibit.

**THE SCORING RULE:**

| what the engine reports about a control page | verdict |
|---|---|
| **RED 1, 2, 5 or 6** — a defect *in this page's content, claims, counts or links* | 🔴 **FALSE POSITIVE → FAIL** |
| **RED 4** — that this page's own sitemap entry is broken | 🔴 **FALSE POSITIVE → FAIL** (all three are 200) |
| **RED 3** — that the **route** these pages sit on is served uncached | ✅ **CORRECT — not a false positive.** It is true, it is measured, and it is in the corpus |
| **"thin"** or **"duplicate"** — a Gate A publishing judgement | ✅ **not scored either way.** Gate A is a publishing gate, not one of the six classes |

**Why the test is built this way:** *"this route is served wrongly"*, *"this page should not have
been published"* and *"this page makes a false claim"* are three different sentences about the
same URL. **An engine that collapses them will hand the owner a list he cannot act on** — and
the whole reason this product exists is that a machine once produced pages nobody could act on,
at scale, for months.

**A control is therefore clean AT THE PAGE LEVEL.** Nothing in this test asks anyone to pretend
these pages are good.

---

# SCORING SHEET

| | class | status today | found? | notes |
|---|---|---|---|---|
| RED 1 | grade band never issued | ⏳ needs a second pin | ☐ | |
| RED 2 | external claim, no source evidence | ✅ **in the corpus** | ☐ | |
| RED 3 | declared render mode ≠ served state | ✅ **in the corpus** | ☐ | |
| RED 4 | sitemap URL 404 / redirect / non-indexable | ⏳ needs a second pin | ☐ | 48/48 are 200 today |
| RED 5 | rendered count ≠ underlying data | ⏳ needs a second pin | ☐ | |
| RED 6 | internal link in source, absent from render | ⏳ needs a second pin | ☐ | |
| CONTROL 1 | `/nursing/from-india/uk-nmc` | live | ☐ not flagged | sourced grade |
| CONTROL 2 | `/nursing/from-india/uk-ukvi` | live | ☐ not flagged | correctly declines |
| CONTROL 3 | `/nursing/from-bhutan/ie-nmbi` | live | ☐ not flagged | sourced grade |

**RESULT: PASS only if all six RED boxes are ticked and all three CONTROL boxes are ticked.**

---

## Open questions this test cannot answer alone

| # | question | who decides |
|---|---|---|
| Q1 | ~~Which commit pins the corpus?~~ **ANSWERED 10 Sep 2026:** `07852f9`, captured into `case-study-01/corpus/`. Covers RED 2 and RED 3. | done |
| Q2 | For RED 4, do we pin a historical AlmiOET deployment, or nominate AlmiPathway (registered, unreachable, no sitemap) as the instance? | **owner** |
| Q3 | For RED 1 and RED 5, which pre-fix commits contain the instances? | **owner**, with a repository search |
| Q4 | Is a *class* found if the engine reports a **different real instance** of the same class than the one pinned here? | **owner.** My recommendation: **yes** — the test asks whether the engine can find that kind of fault, not whether it can find one URL |

---

**Status: DRAFT — awaiting the owner's approval. On approval this file is FROZEN under the law at
the top of this document.**
