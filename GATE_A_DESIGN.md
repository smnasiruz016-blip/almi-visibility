# Gate A — design, before any code

**Written 10 September 2026. This is the design report the implementation PR must follow.**
No code, no database table, no crawler. Where a decision is the owner's it says so and does not
pre-empt it.

**What Gate A is, restated so it is not softened later:** a candidate page that fails **any** check
is **not written**. Not "flagged for review". Not written. And:

> **A shortfall is a DATA problem. It is never a licence to lower the gate.**
> **REJECT is a valid and expected outcome.**

**Where it lives:** `almi-visibility`, as a PR. **No audit code goes into any product repository.**
Its first input is AlmiOET's 240,328 URLs, which does two things at once — produces the keep/kill
list, **and proves Gate A runs on real data before it is ever allowed to block a new page.**
*A gate that has never run on real data is not a tested gate.*

---

## 0 · 🔴 FIRST, THE TEST THAT TRIES TO PROVE THE OWNER WRONG

The ruling *"delete 237,413"* rests on an assumption the owner named and did not measure: **that
per-organisation, five sourced facts do not exist.** Two organisations were chosen — one large and
well known, one small and obscure — and the facts were counted.

### The famous one — `uk-nmc`, Nursing and Midwifery Council

```json
{ "id": "content-14160", "name": "Nursing and Midwifery Council (NMC)", "slug": "uk-nmc",
  "country": "United Kingdom", "countrySlug": "uk", "type": "Healthcare regulator",
  "professions": ["Nursing"],
  "grade": { "listening": "B", "reading": "B", "writing": "C+", "speaking": "B" },
  "website": "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/" }
```

| candidate fact | value | source URL | tier | verified date | qualifies? |
|---|---|---|---|---|---|
| name | ✅ | — | — | — | ❌ |
| country | ✅ | — | — | — | ❌ |
| type (regulator) | ✅ | — | — | — | ❌ |
| professions | ✅ | — | — | — | ❌ |
| required grade | ✅ | ✅ `website` | — | — | ❌ |

### The obscure one — `ph-aguinaldo-recruitment-agency`

```json
{ "id": "content-13955", "name": "Aguinaldo Recruitment Agency", "slug": "ph-aguinaldo-recruitment-agency",
  "country": "Philippines", "countrySlug": "ph", "type": "Employer",
  "professions": ["Nursing"], "grade": null, "website": null }
```

| candidate fact | value | source URL | tier | verified date | qualifies? |
|---|---|---|---|---|---|
| name / country / type / professions | ✅ ×4 | — | — | — | ❌ |
| required grade | **null** | — | — | — | ❌ |

### The result, and it is stronger than the assumption

**Measured across all 610 organisations:**

| | |
|---|---|
| organisations | **610** |
| with a grade | 574 (**36 without**) |
| with a website URL | 563 (**47 without**) |
| with both | 533 |
| with neither | 6 |
| **fields named `tier`, `verified`, `date` or `source`** | **ZERO — the dataset has none** |

The whole schema is `id, name, slug, country, countrySlug, type, professions, grade, website`.
And the repository's source registry, `docs/sources/README.md`, holds a citation table with
**two** entries — both OET's own site, retrieved 2026-08-31 — which support the **exam-wide**
facts in the shared shell (the 0–500 scale, the grade bands), **not** anything about an individual
organisation.

> ## VERDICT: THE RULING IS CONFIRMED, AND THE ASSUMPTION WAS TOO GENEROUS.
>
> It is not that the famous organisation has four facts instead of five. **It is that the fact
> RECORD does not exist for any of the 610.** There is no tier and no verified date anywhere in
> the dataset, so **even `uk-nmc` — the best-documented organisation in the file — produces ZERO
> facts that meet Gate A's standard.** The obscure one has no source URL at all.

**⚠️ And the honest limit of that verdict.** This measures **the data we have gathered**, not what
could be gathered. The NMC's own English-language requirements page plainly contains five or more
sourceable facts. **So the real sentence is: the data needed to make these pages worth having has
never been collected.** That is exactly the shortfall rule — a DATA problem — and the alternative
to deleting was a content project.

### 🔴 THE OWNER'S RULING, 10 September 2026: NO CONTENT PROJECT. DELETE.

> **An organisation page competes with that organisation.** Our NMC page is put in front of a
> reader beside **nmc.org.uk** — the primary source, the one Google already trusts, the one every
> link points at, and the one our own `website` field cites. **Gathering ~3,050 facts to build 610
> pages that lose to the pages the facts were taken from is the worst trade available.**
>
> **THE RULE: effort goes where we can be the BEST answer, never where we can be a second-rate
> copy.**

**Recorded as a decision, not as a measurement** — the measurement above is that the data does not
exist; **what to do about it is this ruling.**

### The target shape — Gate A's run replaces these numbers with real ones

| route | today | ruling |
|---|---|---|
| `/[profession]` | 12 | **KEEP** |
| `/[profession]/from-[origin]` | 2,292 | **KEEP ONLY the corridors with real regulatory data.** This is where we genuinely can be the best answer: *"OET for Indian nurses"* is answered by **neither NMC nor OET**, and **no single body owns it** |
| `/[profession]/from-[origin]/[organization]` | **237,413** | 🔴 **DELETE** |
| `/register/[organization]` | 610 | **a separate class — these are not SEO pages** and are not judged here |

**Estimate: one hundred to a few hundred pages.** ⚠️ **That is an estimate. Gate A's first run
replaces it with the real number**, and if the run disagrees, the run wins.

**Nothing is deleted yet.** Deletion waits on Gate A's result **and** 90 days of click data, and
when it happens it is **410 Gone, not 404** — the keep list comes from Gate A.

---

## 1 · "SHARED SHELL" — the exact definition, and how it is subtracted

**Why this definition decides everything:** measured on five live AlmiOET sibling pages, the raw
rendered text is 577–678 words and **511 of them are shell**. Get the definition wrong in either
direction and the gate either passes every page or fails every page.

### The unit

1. Take the **rendered HTML** of the page as served — never the source, never the template.
   *(GAP-055 is the standing reason: what the source says and what is served are different
   things.)*
2. Remove `<script>`, `<style>`, `<noscript>`, and all tags. Decode entities.
3. Normalise: lowercase, collapse whitespace, strip punctuation that is not word-internal.
4. The result is an ordered **token list**. Counts matter, so it is a **multiset**, not a set —
   a word appearing four times in the shell and five times on the page contributes one unique
   occurrence, not zero.

### The template group

Shell is only meaningful **within one template**. The group is the set of pages produced by the
same route shape — for AlmiOET, four groups:
`/[profession]` (12) · `/[profession]/from-[origin]` (2,292) ·
`/[profession]/from-[origin]/[organization]` (237,413) · `/register/[organization]` (610).
**Two different templates are never compared to each other.**

### The definition — and a decision for the owner

| option | definition | what it gets right | what it gets wrong |
|---|---|---|---|
| **A — exact intersection** | a token is shell at the **minimum count** it has across **every** page in the group | exactly what "shared by all" means; one pass, O(total tokens) | **brittle**: one odd page missing a word removes it from the shell everywhere, and the shell shrinks, and every page looks more unique than it is |
| **B — document frequency ≥ 98%** *(recommended)* | a token is shell at the count it reaches in **≥98%** of the pages in the group | survives a handful of odd pages; still one pass | the 98% is a number that has to be justified, and it is a knob |

**Recommendation: B, at 98%, with A computed alongside and both reported.** If the two disagree by
more than a few words on a group, that disagreement is itself a finding about the template.
**The owner rules; the implementation must make the choice a named constant with the reason on it,
never an inline number.**

### The subtraction

`uniqueWords(page) = |tokens(page)| − |shell ∩ tokens(page)|`, multiset intersection.
Threshold: **≥ 350**.

**Measured today on live AlmiOET pages** (shell estimated by option A from five siblings — a small
sample, so these unique counts are **upper bounds**):

| page | total | shell | unique | needs |
|---|---|---|---|---|
| `/nursing/from-bhutan/ie-nmbi` | 622 | 511 | **111** | ≥350 |
| `/nursing/from-india/ph-andrews-manpower-consulting` | 577 | 511 | **66** | ≥350 |
| `/nursing/from-austria/ca-cannn` | 678 | 511 | **167** | ≥350 |

---

## 2 · SIBLING OVERLAP — the algorithm (U14 is open; this is the proposal)

**The rule:** overlap ≤ **40%**, computed against **every** sibling in the template group, never a
sample.

### The metric

**Jaccard similarity over 5-word shingles of the RESIDUAL text** — the text left after the shell
is subtracted.

**Both halves of that sentence are load-bearing:**

- **Shingles, not bare words**, because bare-word overlap ignores order and two pages that say the
  same sentences in a different arrangement score as different. 5 is the usual choice; it must be
  a named constant with its reason.
- **Residual, not raw.** Measured today on raw rendered text, five siblings overlap **76.3% –
  94.5%** — but that is mostly the shell, so the number describes the template, not the page.
  **On raw text every sibling fails and the metric tells you nothing you did not already know.**
  Overlap is a question about what the pages *individually say*.

### "Every sibling" without 5.6 × 10¹⁰ comparisons

All-pairs on 237,413 pages is **28 billion comparisons**. That is the reason a sample is tempting,
and the reason a sample must still be refused. **Two-stage, and the second stage is exact:**

1. **Candidate generation — MinHash + LSH.** A 128-permutation MinHash signature per page
   (O(tokens)); band it so that any pair with true Jaccard ≥ 0.40 collides with high probability.
   Cost is linear in pages, not quadratic.
2. **Exact verification.** Every candidate pair from stage 1 is scored with **exact** Jaccard.
   No page is failed on an estimate.

**The honest cost of this, stated rather than buried:** LSH has a **false-negative rate** — a
genuinely similar pair can fail to collide. It is tunable (bands × rows) and must be **stated as a
number in the implementation**, with the parameters chosen to put it below a written bound.
**"Against every sibling" then means "against every sibling, with a stated and bounded probability
of missing a pair", and the report must say so** — not claim an exactness the method does not have.

**The alternative, for the owner:** for small groups (`/[profession]` = 12, `/register` = 610),
**exact all-pairs is cheap** — 66 and 185,745 comparisons. **Recommendation: exact all-pairs below
a group size of ~5,000; MinHash+LSH above it.** One rule, two implementations, and the threshold is
a named constant.

### What is reported

Per page: **max overlap** against any sibling, and **which** sibling. "This page is 94% the same as
that one" is actionable; "this page failed overlap" is not.

---

## 3 · VERIFIED FACTS — the counting standard

**Threshold: ≥ 5 facts per page.** A fact counts **only** when all four fields are present:

| field | what it means | rejected if |
|---|---|---|
| **value** | the claim itself, as rendered on the page | absent, empty, or `null` |
| **source URL** | a resolvable URL that supports **this specific value** | absent; a link to a site's home page rather than the page that carries the claim |
| **source tier** | how authoritative the source is | absent. **The tier vocabulary is the owner's to fix** — a proposal below |
| **verified date** | ISO date on which a person or a check saw the value at that URL | absent, or older than the freshness window for its tier |

**Proposed tiers, for the owner to rule on:**

| tier | meaning | example |
|---|---|---|
| **1 — primary** | the body that decides the fact, on its own site | NMC's English-language requirements page |
| **2 — official secondary** | another official body restating it | a government visa page quoting a regulator |
| **3 — reputable third party** | a well-known publication | a professional association's guide |
| **✗ not a source** | our own pages, aggregators, undated content | — |

**Two rules that decide whether this measures anything:**

- **A fact must be attached to the VALUE, not to the page.** One URL at the bottom of a page does
  not make five claims sourced. The fact record binds one value to one URL.
- **The shared shell's facts do not count towards a page's five.** The 0–500 scale and the grade
  bands are sourced (`docs/sources/README.md`, two citations retrieved 2026-08-31) and they appear
  on **every** page. **If shell facts counted, every page in the network would start at four or
  five and the check would be measuring the template again.** Only facts in the **residual** count.

**What section 0 measured means for this rule:** with today's data, an AlmiOET organisation page
scores **0**. Not 4, not 3 — **0**, because tier and verified date do not exist in the dataset at
all.

---

## 4 · THE WRITE LAW — day one, in the first PR

> Every write path **defaults to `--dry-run`**.
> A real write requires **BOTH** `--confirm` **AND** `ALLOW_PROD_WRITE=1`.

**Both, not either.** One flag is a typo away from a write; two of different kinds — an argument
and an environment variable — are not reached by accident.

**Why it is in the first PR and not a hardening task:** it costs nothing, waits on nothing, and
**until preview and production are split it is the whole of the protection** — §2b of the
architecture report measured that they are the same database. It stays afterwards, because
isolation stops a *preview deployment* while a dry-run default stops a *person*.

**Every write path** means: every migration runner, seeding or backfill script, every crawler that
persists a snapshot, every GSC ingestion, every fact-cache write, every ledger write, every purge
or retention job. **Read-only needs no flag. The moment it can write, it needs both.**

---

## 5 · WHAT THIS FIRST PR WILL AND WILL NOT CONTAIN

**Will:** the three measurements as pure functions over an input corpus; a CLI that reads a list of
URLs (or archived HTML) and emits **JSON + CSV**; the keep/kill list; the write law in place from
the first line; RED-first proofs for each measurement.

**Will not:** any database table, any crawler that runs on a schedule, any dashboard, any page
generation, any product-repository write, any paid provider.

### 🔴 THE STOP CONDITION, WRITTEN BEFORE IT IS REACHED

**No database table is created in this PR.** The first Gate A run reads a corpus and writes files.

**If the work reaches the point where the first table whose loss would actually cost something is
needed — the fact cache, the cost ledger, the GSC pulls, the page candidates, the crawl results —
I STOP AND SAY SO BEFORE WRITING THE MIGRATION.** The Neon preview branch is created **before** that
migration, and the fix has **two halves**: (a) the branch, and (b) moving `DATABASE_*` in Vercel off
"All Environments" onto a separate Preview set. **(a) alone changes nothing and looks solved.**

---

## 6 · Open decisions — the owner's, not mine

| # | decision | recommendation |
|---|---|---|
| D1 | Shell definition: exact intersection (A) or document frequency ≥98% (B)? | **B**, with A computed alongside and both reported |
| D2 | Overlap metric: Jaccard over 5-word shingles of the **residual** | as proposed — the residual part is not optional |
| D3 | Exact all-pairs vs MinHash+LSH, and the group-size threshold | exact below ~5,000; LSH above, with a stated false-negative bound |
| D4 | The tier vocabulary | the four rows in §3 |
| D5 | Do shell facts count towards a page's five? | **No.** Otherwise the check measures the template |
| D6 | ~~AlmiOET's 237,413 pages: delete, or gather the data?~~ | ✅ **RULED 10 Sep 2026: DELETE.** An organisation page competes with that organisation; effort goes where we can be the best answer, not where we can be a second-rate copy. See §0 |
