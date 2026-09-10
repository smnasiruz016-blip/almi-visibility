# 🔴 DIAGNOSTIC — CORRIDOR OVERLAP · 2026-09-10

## THIS IS NOT A GATE RESULT. READ THIS PARAGRAPH BEFORE ANY NUMBER BELOW.

Every page measured here was **already rejected** by Gate A run 01, at the **FACTS**
stage, two stages before overlap. **None of them reached the overlap stage, and none of
them passed it.** By D2-A that is the design working, not a gap.

This run computed their overlap anyway, deliberately, to test something that is not a
claim about the pages at all. It tests **the owner's CORRIDOR RULING**:

> *"`/[prof]/from-[origin]` — ONLY those corridors with real regulatory data; this is
> where we genuinely can be the best answer."*

That ruling rests on an assumption nobody had measured: **that those pages differ from
each other.** Run 01 showed most of their words come from a list of recognising
organisations. If that list is the same on `from-india` and `from-pakistan`, then a
profession's 191 corridor pages are copies of one another.

**No page's verdict changes. No number here may ever be quoted as "these pages passed
overlap."** It is a measurement taken to falsify a ruling, not to grade a page.

**Command (reproducible):**
`node bin/diagnose-overlap.mjs --corpus <corpus> --group profession-origin --out ... --confirm`
**163,878 exact comparisons in 2.0 s.** Residual = the gate's own residual (group shell
B, 803 tokens, subtracted exactly as `runGateA` subtracts it). Residual words per
surviving page: min 470 · median 1,346 · max 2,236 — nowhere near the noise floor of 40,
so these Jaccards are taken over real text.

---

## 1 · WITHIN a profession — its own 191 corridor pages against each other

| profession | pairs | min | median | p95 | **MAX** |
|---|---|---|---|---|---|
| medicine | 18,145 | **0.7816** | 0.8363 | 0.9744 | **0.9745** |
| nursing | 18,145 | **0.8498** | 0.8926 | 0.9839 | **0.9839** |
| pharmacy | 18,145 | **0.6204** | 0.7321 | 0.9360 | **0.9367** |

🔴 **The MINIMUM matters more than the maximum here.** The lowest-scoring pair anywhere
inside a profession is **0.6204**, against Gate A's `MAX_SIBLING_OVERLAP = 0.40`. So:

**ALL 573 PAGES WOULD ALSO HAVE FAILED OVERLAP.** Not most — all, with no pair even
close to the bar. Three independent stages, three rejections, for three different
reasons: too few words (1,719 of them), no facts (all 573), and now near-duplication
(all 573).

Most alike pairs:

```
0.9839  nursing__from-bahamas               vs  nursing__from-gambia
0.9839  nursing__from-equatorial-guinea     vs  nursing__from-guinea
0.9839  nursing__from-south-sudan           vs  nursing__from-sudan
0.9745  medicine__from-bahamas              vs  medicine__from-gambia
0.9367  pharmacy__from-south-sudan          vs  pharmacy__from-sudan
```

The pattern in those names is not a coincidence — see §3.

## 2 · BETWEEN professions

| | pairs | min | median | p95 | MAX |
|---|---|---|---|---|---|
| cross-profession | 109,443 | 0.0221 | **0.0346** | 0.1225 | **0.1303** |

**The professions ARE genuinely different from one another** — a median of 0.035 is
effectively nothing shared. The highest cross-profession pair in 109,443 is 0.1303, and
it is `medicine__from-saint-vincent…` against `nursing__from-saint-vincent…` — the same
origin, different profession, which is the only cross-profession signal that exists.

**And the nearest neighbour of every single page — 573 of 573 — is inside its own
profession.** Not one page is more like a page of another profession than like its own
siblings.

---

## 3 · 🔴 WHAT AN ORIGIN ACTUALLY ADDS — the decisive measurement

The overlap above is taken against the *group* shell (803 tokens, computed over all
2,292 pages), which cannot see profession-level boilerplate: a word on 191 of 2,292
pages is not shell by that definition. So the org list survives into the residual and
inflates every score.

So the same measurement was taken again with each profession's **own** shell — computed
over its own 191 pages. That number answers the question exactly:
**what does this corridor page say that its own profession's other 190 corridor pages do not?**

| profession | own shell (B) | min | p25 | median | p75 | p95 | **MAX** |
|---|---|---|---|---|---|---|---|
| medicine | 2,118 tokens | 29 | 31 | **31** | 37 | 39 | **47** |
| nursing | 2,992 tokens | 29 | 31 | **31** | 37 | 39 | **47** |
| pharmacy | 1,244 tokens | 29 | 31 | **31** | 37 | 39 | **47** |

**An origin adds a median of 31 words. Its maximum, anywhere, across 573 pages, is 47.**

And the three distributions are **identical to the digit** — min 29, p25 31, median 31,
p75 37, p95 39, max 47, in all three professions. Three separate professions cannot
produce the same six order statistics by accident. **It is one template with one slot.**

Here is a complete residual, verbatim — everything `medicine/from-afghanistan` says that
the other 190 medicine corridor pages do not:

```
afghanistan afghanistan professionals afghanistan usually prove separately their
built exactly that academic english general qualifications need their applying
afghanistan healthcare from clinical communication for to from english is not
```

**Twenty-nine words, of which the country name is five, and the rest is not a sentence —
it is the scattered remainder of one shared sentence whose word order differs slightly
between pages.** That is the entire content of the origin dimension.

It also explains §1's top pairs exactly: `bahamas`/`gambia`, `equatorial-guinea`/`guinea`,
`south-sudan`/`sudan`. Those pairs score highest because the only thing that differs
between two corridor pages is the country name, and those country names share tokens.

---

## 4 · WHAT THIS DOES AND DOES NOT DO TO THE CORRIDOR RULING

### FALSIFIED — the assumption, as stated

> *"those pages differ FROM EACH OTHER"*

**They do not.** A corridor page differs from its 190 siblings by a median of 31 words,
mostly the country name. As stock, the 2,292 corridor pages are 12 pages wearing 2,292
URLs. On today's content, the corridor dimension buys nothing, and a content project
aimed at these URLs as they stand would be decorating duplicates.

### NOT falsified — and I will not overclaim it

This run measured **what the pages contain**, not **whether per-corridor facts exist in
the world**. Those are two different claims, and only the first was tested here. The
reasoning behind the ruling — that "OET for Indian nurses" is a question neither NMC nor
OET answers, and that no single body owns it — is untouched by this measurement.

**But the ruling's dependency has changed, and this is the finding:**

> The corridor ruling now rests on **exactly the same thing** as every other group:
> whether anyone can produce sourced, tiered, dated facts. It has no independent
> support left. Before this run, "corridors are where we can be the best answer" looked
> like a claim about page structure. It is not. It is a claim about a fact supply that
> does not exist yet.

The corridor is still the most defensible *place* to put facts. It is not, today, a
place where facts are.

### And the organisation ruling is corroborated from a second direction

The 469-organisation list is the bulk of these pages' text, and it is **near-identical
across every origin**. The owner's ruling — that an organisation page competes with that
organisation and loses — already killed `/[o]/[org]`. This run shows the same list is
also what is padding the corridor pages. Reusing it does not become a good trade by
being shown on a different URL.
