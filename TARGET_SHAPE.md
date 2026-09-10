# THE TARGET SHAPE — and the ruling the measurements produced

**10 September 2026.** A design record. **Nothing here is built.** No page is created, no
page is deleted, no table exists, no production write happens. This is written so the next
piece of work stands on it instead of re-deriving it.

---

## 1 · 🔴 THE RULING — the corridor ruling is finished in the form it was given

Not weakened. **Finished, and by measurement.** What survives, in these words:

> **Corridor safha sirf wahan qabil-e-difa hay jahan origin waqai jawab BADAL de. Is
> saboot par wo mutthi bhar claims aur aik haan/nahi hay — yani aik TABLE ROW, ya
> profession safhay par aik PARAGRAPH. 191 safhay nahi.**
>
> *A corridor page is defensible only where the origin genuinely CHANGES the answer. On
> this evidence that is a handful of claims and a yes/no — that is, a TABLE ROW, or a
> PARAGRAPH on the profession page. Not 191 pages.*

### And the measurement underneath it

| | measured |
|---|---|
| overlap **between professions**, median | **0.0346** — professions are genuinely different |
| overlap **within** a profession, lowest pair anywhere | **0.6204** — origins are not |
| nearest neighbour of every one of 573 pages | **inside its own profession**, 573 of 573 |
| what an origin adds against its own profession's shell | median **31 words**, of which **25 prose** |
| distinct 5-grams between two neighbouring corridor pages | **15** |
| a full 5-fact rollout across all 191 corridors | overlap **0.9792 → 0.9695** |

> **PROFESSIONS ARE REALLY DIFFERENT. ORIGINS ARE NOT.**
> **That is the distinction everything after this stands on.**

### 🔴 One later finding, recorded here so the ruling is not read as harder than it is

`ORIGIN_CLAIM_SHAPE.md` (the last honest attempt) found that origin claims of a genuinely
different shape **do** exist — Nigeria's own regulator publishes a named body, four fees,
two document lists and a **UK-specific variant**; and the UK Code of Practice red/amber list
has three states rather than two. Six to ten such claims per corridor are plausible where
the origin's regulator publishes them.

**That does not restore 2,292 pages, and it does not contradict the ruling — it measures
it.** The corridors where the origin genuinely changes the answer are the ones whose own
regulator publishes that detail. **India, the largest corridor in the network, is not one
of them**: its verification is issued by ~30 state councils, so its answer is a branch, not
a value. **A few dozen corridors, not 2,292** — which is the same order of magnitude this
shape already reached from the other direction.

---

## 2 · THE SHAPE

| level | what it is | how many URLs |
|---|---|---|
| **`/[profession]`** | **the page.** Genuinely different from its eleven siblings — measured, median cross-profession overlap 0.0346. Real depth in each: **the exam, the conditions, the route, and the tables** | **12** |
| **origin** | **a TABLE on those same pages** — one row per origin, carrying the bits that genuinely vary: EL 4.1 nationality exemption, Code of Practice red/amber/green, and where it exists, the origin regulator's own fee and form | **0 new URLs** |
| **organisation** | **a TABLE.** The 469 recognising organisations belong in a sortable table on the profession page, not on 237,413 URLs of their own | **0 new URLs** |

**A few dozen URLs in total.** Plus whatever small number of corridors earn their own page
by having a regulator that publishes Nigeria-grade detail — and each of those has to clear
Gate A on its own evidence, not by being in a category.

### 🔴 AND WHY THIS IS NOT RETREAT — the sentence that must not be lost

> **240,328 pages are currently earning a bill and a crawl budget, and — beyond that —
> nothing anyone has MEASURED.**

Not one of the 3,414 pages measured clears the gate. Not one reaches 350 words on prose.
The best corridor page differs from its nearest sibling by **fifteen 5-grams**. Going from
240,328 URLs to a few dozen is not giving something up; it is **stopping paying for
something that was never shown to work**, and putting the same content where it can.

**And the cost of the current estate is measured too:** fetching it once at a polite rate is
**~12.8 hours and 240,335 requests**. That is what one full crawl costs us, and Google does
not ask permission.

---

## 3 · WHAT THIS SHAPE STILL OWES

- **It is not built, and nothing is deleted.** The 237,413 still wait on Gate A's result
  plus 90 days of clicks, then **410 Gone**, never 404.
- **The 610 `/register/[org]` pages are a different fix entirely** — they are functional
  pages that were never for search. **Remove from the sitemap ≠ delete.**
- **The 12 profession pages have not been measured against this shape.** They currently
  carry 70–88 unique words and 13 of prose. They are the whole plan and they are the
  thinnest thing in it. **That is the next measurement, not an assumption.**
- **Nothing here starts until the fact cache does.** A generator on an empty fact store
  rebuilds the estate being deleted.
