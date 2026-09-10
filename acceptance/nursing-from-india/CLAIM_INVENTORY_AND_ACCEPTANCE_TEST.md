# CLAIM INVENTORY + ACCEPTANCE TEST — `nursing/from-india` · 2026-09-10

**Nothing was published.** The augmented page exists only inside one Node process. No page
created, no page deleted, no DB table, no production write, no other product touched.

---

## PART ONE — THE CLAIM INVENTORY

The question: **how many distinct, sourced claims genuinely exist for this corridor — and
how many of them are actually about INDIA rather than about the UK?**

Sources were fetched and read. Every claim below is marked **VERIFIED** (I fetched the
page and have the verbatim sentence) or **CANDIDATE** (plausible and named, but the source
could not be read — see §1.3). Nothing is listed that was not found at a real URL.

### 1.1 · DESTINATION-scoped — identical on all 191 origin pages

| # | claim (subject · predicate · qualifier) | status | source |
|---|---|---|---|
| D1 | `uk-nmc` · `oet-minimum-grade` · `profession=nursing` | ✅ VERIFIED | nmc.org.uk — Accepted tests: OET |
| D2 | `uk-nmc` · `oet-combining-sittings` · `profession=nursing` | ✅ VERIFIED | same page |
| D3 | `uk-nmc` · `english-evidence-routes` · `profession=nursing` | ✅ VERIFIED | nmc.org.uk — English language requirements |
| D4 | `uk-nmc` · `qualified-in-english-evidence` · `profession=nursing` | ✅ VERIFIED | nmc.org.uk — Qualified in English |
| D5 | `uk-nmc` · `approved-programme-is-sufficient` · `profession=nursing` | ✅ VERIFIED | nmc.org.uk — Qualified in English |
| D6 | `uk-nmc` · `test-of-competence-parts` · `profession=nursing` (CBT + OSCE) | 🟡 CANDIDATE | the landing page links it; the text is on a page I did not open |
| D7 | `uk-nmc` · `id-check-at-toc-centre` · `profession=nursing` | 🟡 CANDIDATE | same |

### 1.2 · 🔴 ORIGIN-scoped — genuinely about India

| # | claim (subject · predicate · qualifier) | status | source |
|---|---|---|---|
| **O1** | `uk-ukvi` · `english-nationality-exemption` · `nationality=india` → **not exempt** | ✅ **VERIFIED** | gov.uk — Immigration Rules Appendix English Language, **EL 4.1** |
| O2 | `au-ahpra` · `on-recognised-country-list` · `country=india` | 🟡 CANDIDATE | ahpra.gov.au — **403 to our fetcher** |
| O3 | `nz-ncnz` · `on-exempt-education-country-list` · `country=india` | 🟡 CANDIDATE | nursingcouncil.org.nz — **403 to our fetcher** |
| O4 | `uk-nmc` · `on-accepted-english-speaking-country-list` · `country=india` | 🟡 CANDIDATE | nmc.org.uk PDF — **could not be parsed** |
| O5 | `in-inc` · `is-verification-body-for` · `country=india` (which body confirms an Indian nurse's registration) | 🟡 CANDIDATE | not located |
| O6 | `in-nursing-education` · `taught-and-examined-in-english` · `country=india` | 🟡 CANDIDATE | would need per-institution transcript evidence, per D4 |

### 1.3 · 🔴 AND A FINDING THE INVENTORY PRODUCED BY ACCIDENT

**Three of the sources that matter most refuse our fetcher.**

| source | result |
|---|---|
| ahpra.gov.au | **HTTP 403** |
| nursingmidwiferyboard.gov.au | **HTTP 403** |
| nursingcouncil.org.nz | **HTTP 403** |
| nmc.org.uk (PDF country list) | compressed stream; not parsed |
| nmc.org.uk (HTML), gov.uk | ✅ fetched and read |

This lands directly on the fact-cache design. `quoteMatchedOn` — the **nightly machine
re-check** the whole freshness mechanism rests on — **cannot run against these sources.**
For them, re-verification is a human job at human cost, and `FACT_FRESHNESS_DAYS = 180`
becomes a queue of manual work rather than a cron job. **That is not a reason to change
the design. It is a cost that has to be written into it**, and it was not.

### 1.4 · 🔴 THE SHAPE OF THE ORIGIN CLAIMS — this is the answer, not the count

Count them and origin-scoped claims look respectable: **1 verified + 5 candidates = 6.**
But look at what they *are*:

> **O1, O2, O3 and O4 are the SAME PREDICATE.**
> *"Is your country on this regulator's list?"* — asked of four different regulators.

Only O5 and O6 are a different shape, and neither is verified. So the corridor's genuine
origin content is **one question, repeated per destination regulator, answered yes or no**,
plus at most two administrative facts.

**And the answer varies — that part is real.** Of the 191 nursing origins in the corpus,
**13 are on the EL 4.1 list** (Antigua and Barbuda, Bahamas, Barbados, Belize, Dominica,
Grenada, Guyana, Jamaica, Malta, St Kitts and Nevis, St Lucia, St Vincent and the
Grenadines, Trinidad and Tobago) and **178 are not.** So `from-bahamas` and `from-india`
genuinely have different answers. **The variance is one bit.**

### 🔴 1.5 · CORRECTED THE SAME DAY — see `ORIGIN_CLAIM_SHAPE.md`

The owner ordered a last honest attempt: verify O5 and O6 for two deliberately different
countries. It changed two things above, and I am leaving the original text standing rather
than editing it quietly.

| | what §1.2 and §1.4 said | what verification found |
|---|---|---|
| **O5** | *"not located"*, and implicitly another yes/no | 🔴 **WRONG — and it understated it.** Nigeria's own regulator publishes a named body, **four fees** (₦66,875 · ₦8,750 · ₦8,750), two document lists, **and a UK-specific line at ₦17,500**. That is a value, not a bit. For **India** it is worse than not-found: it is a **BRANCH** over ~30 state councils |
| **O6** | listed as origin-scoped | 🔴 **MISCLASSIFIED BY ME.** The NMC's evidence is a **personal transcript** — per applicant, not per country. O6 is destination-scoped |
| — | — | **O7 found and verified:** UK Code of Practice **red / amber / green** (54 red incl. Nigeria and Pakistan; 2 amber; India and the Philippines green) |

**So "four of six are the same predicate" was too harsh, and the conclusion below stands
for a different reason than the one given here.** The binding constraint is not the SHAPE
of origin claims — it is their **AVAILABILITY**, which differs country by country and is
structurally absent for India. `ORIGIN_CLAIM_SHAPE.md` carries the full working.

---

## PART TWO — THE ACCEPTANCE TEST

Five facts were written by hand from the VERIFIED rows above — four destination (D1–D4),
one origin (O1) — each with a verbatim quoted span, tier 1, verified 2026-09-10. They are
in `facts.json`; the rendered block is in `fact-block.html`. Gate A was re-run on the real
2,292-page group with this one page's HTML augmented in memory.

### 2.1 · The result

| | BEFORE | AFTER |
|---|---|---|
| uniqueWords (bar 350) | 2,220 | **2,732** |
| — **prose** | **61** | **559** |
| — list | 2,118 | 2,118 |
| — heading | 40 | 54 |
| qualifying facts (bar 5) | 0 | **5** |
| linkChecked | 0 | 5 |
| **factChecked** | 0 | **0** |
| **overlap vs all 190 published siblings (bar 0.40)** | **0.9792** | **0.7364** |

```
PASS     1 · uniqueWords >= 350
PASS     2 · qualifying facts >= 5
🔴 FAIL  3 · overlap < 0.40 vs ALL published siblings
REJECT
```

**THE TEST FAILED, AND THE FAILURE IS THE RESULT.**

### 2.2 · The measured prior was right

`PROSE_VS_TABULAR.md` predicted, from the one hand-written fact already in the network,
that **one sourced fact ≈ 100 prose words.** Five facts added **498 prose words** —
99.6 per fact. The prior held, and it is now a measurement rather than an n = 1 guess.

### 2.3 · 🔴 THE ROLLOUT SIMULATION — and this is the decisive number

The single-page result **flatters itself**, and I nearly reported it without saying so.
With the block on one page only, its four DESTINATION facts look unique — because no
sibling has them **yet**. A real rollout gives every corridor page in the profession the
same four, and its own origin fact.

Simulated exactly that: all 191 nursing corridors get D1–D4 verbatim, and each gets its
own O1 paragraph built from the same EL 4.1 list with its own country name and its own
yes/no.

| | overlap vs nearest published sibling |
|---|---|
| before any facts | 0.9792 |
| **5 facts on ONE page only** | **0.7364** |
| **5 facts on ALL 191 pages — the real rollout** | 🔴 **0.9695** |

> ### THE WORK PUTS THE PAGE ALMOST EXACTLY BACK WHERE IT STARTED.
> ### 0.9792 → 0.9695. **A gain of 0.0097, against a gap of 0.5695.**

The reason is not subtle: four of the five facts are identical on every corridor page, so
they become shell. The fifth quotes the same 18-country list on all 191 pages; only the
country name and one yes/no differ.

### 2.4 · How much would actually be needed

Measured from the shingle sets of the nearest pair (`from-india` vs `from-argentina`):

| | |
|---|---|
| residual words, each page | 2,220 |
| 5-word shingles, each page | ~1,476 |
| **shingles the two pages SHARE** | **1,461** |
| **shingles that are page A's own** | **15** |

**Two nearly identical pages differ by fifteen 5-grams.**

To reach J < 0.40, each page needs about **1,081 additional distinct shingles ≈ 1,081
words of text no sibling shares.** Per page. Across 191 nursing corridors that is
**~206,000 words**; across all 2,292 corridors, **~2.5 million words** — and at the
measured ~100 words per hand-sourced fact, roughly **25,000 facts.**

**And the inventory says that content does not exist.** Six origin-scoped claims, four of
which are the same yes/no question, cannot produce 1,081 words of genuinely distinct text.
**Even if every origin claim that exists were written perfectly, the page would still
fail.**

### 2.5 · 🔴 THE OTHER LEVER — and it costs nothing

The same arithmetic, read the other way:

> **Remove the shared 469-organisation list from the corridor pages and the overlap
> problem disappears for ZERO new words written.**

The list is 2,118 of the page's 2,220 residual words — **95%** — and it is the same list on
every sibling. It is also, per the owner's own ruling, content that competes with the
organisations it was copied from. Deleting it does what 1,081 words per page would do,
and it is a deletion rather than a content project.

**⚠️ But it removes what the page was passing stage 1 on.** Strip the list and the corridor
page falls to roughly 100 unique words — well under 350 — and it needs those 1,081 words
anyway, just to exist rather than to be distinct. **There is no free version of this.**

---

## PART THREE — 🔴 TWO DEFECTS THIS TEST FOUND IN GATE A ITSELF

### 3.1 · The survivor-population false pass

D2-A runs overlap on **survivors only** — correct for a page's own verdict, and it has a
consequence nobody wrote down:

```
overlap vs SURVIVORS ONLY    0.0000    survivor population: 0
```

**Our page scored a perfect 0.0000 by being the last one standing.** Every sibling had
been rejected at the facts stage, so there was nobody left to compare it with — and an
empty comparison set reads as "no overlap".

That is a **FALSE PASS**, and it is the exact shape of a defect this project has already
named: *count the population before the guard.* The rejected siblings are all still
published and still indexed. **"Every sibling" has to mean every sibling a reader can
still reach — not every sibling that survived an earlier stage of the same run.**

**FIXED 10 September 2026, on the owner's ruling.** `runGateA` now scores survivors against
the **whole published group**, never against its own output. The rule is written beside the
code:

> **A GATE MAY NOT BUILD ITS DENOMINATOR OUT OF ITS OWN OUTPUT.**
> The more it rejects, the more unique the remainder looks. A gate that gets EASIER the
> more it rejects is not a gate.

**And the fixed gate reproduces this test's honest verdict on its own**, without the
acceptance harness computing anything itself:

```
reachedOverlap 1 · overlapPopulation 2292 · comparisons 2291
nursing__from-india  maxOverlap 0.7364  against nursing__from-argentina
                     overlapPass false · verdict REJECT · rejectedAt "overlap"
```

D2-A is untouched: only survivors are SCORED, so the work is candidates x population, not
population squared. **What changed is the denominator, not the workload.** Re-running Gate A
over the whole 3,414-page corpus produces **identical results to run 01** — nothing reached
stage 3 there either way, so **no published verdict changed.**

### 3.2 · The prose/tabular hole — confirmed from the other direction

`PROSE_VS_TABULAR.md` showed `uniqueWords` can be satisfied by a table. This page is the
proof in reverse: it passed stage 1 **before** any facts were written, on 2,118 list words
against 61 of prose. **A page can hold Gate A's word bar with sixty-one words of writing.**

---

## PART FOUR — THE ANSWER TO THE OWNER'S QUESTION

> *"If per-origin claims come out at nearly zero, then the corridor page's existence
> becomes doubtful — even if we do write the facts."*

**That is what came out, and it is measured rather than argued:**

1. **Origin-scoped claims: six, one verified.** Four of the six are the same yes/no
   question asked of four regulators. **The genuine per-origin variance is about one bit
   per destination.**
2. **A perfect five-fact rollout moves overlap by 0.0097.** The gap to the bar is 0.5695.
3. **Each page would need ~1,081 words nobody else has**, and the claims to write them
   with do not exist.
4. **The single alternative that works — removing the shared organisation list — is a
   deletion, not a content project**, and it drops the page below the word bar as well.

**The corridor ruling does not survive this test in its current form.** What is left of it
is narrower and worth stating precisely: *a corridor page is defensible only where the
origin genuinely changes the answer.* On this evidence that is a handful of claims and a
yes/no — which is **a table row, or a paragraph on the profession page**, not 191 pages.

**And what would overturn this finding is written down:** an origin-scoped claim of a
different shape from "is your country on the list" — a per-country verification body, a
per-country qualification-recognition rule, a per-country route that genuinely differs.
O5 and O6 are exactly that shape and **neither has been verified.** If a dozen such claims
turn out to exist per corridor, the arithmetic above changes and so does the conclusion.
**That is the next thing to measure, and it is cheap: verify O5 and O6 for two countries.**
