# THE HARDEST PROFESSION — CENSUS, THEN THE CHAIN

**10 September 2026.** `npm run census` · `node bin/profession-chain.mjs --page=<slug>`
Nothing published, nothing deleted, no table, no production write.

---

> ## ✅ FIRST, THE MILESTONE
>
> **`/nursing` IS THE FIRST PAGE IN THIS PROJECT TO PASS GATE A — ROLLOUT INCLUDED.**
> And it passed **without a single threshold being moved.** `MIN_UNIQUE_WORDS = 350` and
> `MAX_SIBLING_OVERLAP = 0.40` are exactly where they were written.

### ⚠️ And the narrow sentence stays attached to it

> These thresholds have proven **they can discriminate.** It is **not** proven that their point is
> in the right place. Discriminating and being correctly placed are two different things, and the
> second is still unmeasured.

**RECIPE debt unchanged: mandatory before the first cohort publishes.**

---

## 1 · 🔴 THE NEXT EXPERIMENT MUST BE THE HARDEST, NOT THE EASIEST

Nursing passed. But nursing is very likely the best case in the entire set, so building eleven more
pages after it would have been **running the experiment that was going to pass.**

**So the profession was chosen by measurement.** Counted from `almi-oet`'s
`organisations.json` — OET's own "Who Recognises OET" index, 610 organisations, `fetchedAt`
2026-06-27 (read only; the SCOPE LAW permits reading any product):

| profession | recognising orgs | **destination regulators** | **publishing a grade** | destination with NO regulator |
|---|---|---|---|---|
| **Speech Pathology** | 46 | **4** | **2** | 🔴 **New Zealand** |
| Optometry | 40 | 4 | 3 | 🔴 United Kingdom |
| Dietetics | 39 | 5 | 3 | — |
| Podiatry | 39 | 5 | 3 | — |
| Occupational Therapy | 56 | 5 | 3 | — |
| Dentistry | 47 | 5 | 5 | 🔴 United Kingdom |
| Veterinary Science | 40 | 5 | 5 | 🔴 United Kingdom |
| Physiotherapy · Radiography | 56 · 44 | 6 | 4 | — |
| Medicine | 297 | 6 | 5 | — |
| Pharmacy | 70 | 6 | 6 | — |
| **Nursing** | **469** | **6** | **6** | — |

> **Nursing has 469 recognising organisations. The weakest has 39. Nursing is 12× the smallest —
> the assumption that it was the best case is now a measurement.**

**Chosen: SPEECH PATHOLOGY.** Four destination regulators, only **two** publishing an OET grade,
and **New Zealand has no regulator for it at all** (speech-language therapy is not statutorily
regulated there). Optometry is a near-tie; speech pathology loses on the grade count.

⚠️ **What this counts is regulators that RECOGNISE OET** — which is the right population, because a
regulator that does not accept OET generates no OET claim to make about it.

## 2 · WHAT COULD ACTUALLY BE ACQUIRED

| regulator | reachable? | usable? |
|---|---|---|
| **HCPC** (UK) | ✅ 8,472 chars | ✅ **7 claims** — and one of them is excellent |
| **AHPRA** (AU) | ✅ **31,848 chars** | 🟡 rich, but **profession-INDEPENDENT** — see §4 |
| **CORU** (IE) | ✅ 3,372 chars | 🔴 nothing: the pages are shells with no requirement text |
| **Speech Pathology Australia** | 🔴 404 on both candidate paths | 🔴 nothing |
| **New Zealand** | — | 🔴 **there is no regulator** |

### 🔴 A CORRECTION TO OUR OWN RECORD: AHPRA IS NO LONGER 403

`A1_FACT_SUPPLY_FEASIBILITY.md` recorded `ahpra.gov.au` as **HTTP 403**. Re-probed today it returns
**200 and 31,848 characters.** The technical claim is out of date, exactly as OET's was.
*(Rule Twelve, on our own memory, for the second time.)*

### And the fact that makes the page worth having

🔴 **HCPC sets a higher bar for speech and language therapists than for every other profession it
registers: OET 1800 (no element below 400) against 1400 (no element below 300); IELTS 8.0 against
7.0.** A speech therapist who reads a general OET page and prepares to the common standard misses
by four hundred marks and is never told a different standard applied.

---

## 3 · THE CHAIN — BOTH PROFESSIONS, IDENTICAL CODE

| | **nursing** | **speech pathology** |
|---|---|---|
| claims on the page | 14 | 9 |
| sources | 4 | 2 |
| words · prose | 1,394 · 1,365 | 972 · 946 |
| **STEP 3 — one page** | | |
| uniqueWords | 1,083 / 350 ✅ | 726 / 350 ✅ |
| facts | 14 / 5 ✅ | 9 / 5 ✅ |
| overlap | 0.0000 ✅ | 0.0000 ✅ |
| **verdict** | **KEEP** | **KEEP** |
| **STEP 4 — rollout** | | |
| identical across all twelve | **41.5%** | 🔴 **81.7%** |
| uniqueWords after rollout | **511** / 350 ✅ | 🔴 **34** / 350 |
| overlap A | 0.2890 ✅ | 🔴 **0.6974** |
| overlap B | 0.3059 ✅ | 🔴 **0.7167** |
| **VERDICT** | ✅ **KEEP** | 🔴 **REJECT** |

> ### 🔴 SPEECH PATHOLOGY PASSES ON ONE PAGE AND FAILS THE ROLLOUT — BADLY.
> Not by 34 words. **34 unique words survive out of a 350 bar, and overlap is 0.70 against 0.40.**
> This is not a near miss and it is not reported as one.

---

## 4 · 🔴 WHY — AND IT IS SHARPER THAN "NOT ENOUGH DATA"

**A profession page is distinguished only by claims that are ABOUT THE PROFESSION.**

| | nursing | speech pathology |
|---|---|---|
| per-profession claims (carrying a `profession=` qualifier) | **11** | **4** |
| profession-independent claims on the page | 3 | 5 |

**AHPRA is the proof.** It is reachable, detailed and useful — and it says *"any profession-specific
OET test can be accepted"*, B in listening/reading/speaking and C+ in writing, **the same for every
profession.** Adding it would have made the page longer and the rollout **worse**, because every
word of it is identical on all twelve pages.

> **MORE DATA DOES NOT HELP A PROFESSION PAGE UNLESS THE DATA IS PER-PROFESSION.**

And by the placement rule already ruled, AHPRA's requirement is **destination-scoped** — it belongs
to a layer that knows the destination, exactly as the New Zealand rule and the red list do. It was
never a candidate for this page.

### ⚠️ AND THE NEXT MEASUREMENT IS ALREADY VISIBLE IN HCPC'S OWN TABLE

HCPC publishes an OET minimum for six professions. **Five of them are identical — 1400 with no
element below 300** (podiatry, dietetics, occupational therapy, physiotherapy, radiography). Only
speech and language therapy differs.

So for those five, a "per-profession" claim **renders identical text** — per-profession in name
only. **The count of professions with genuinely distinguishing content is smaller than the count of
professions with regulators**, and that gap is now measurable rather than suspected.

---

## 5 · WHAT THIS MEANS — READ AS A COUNT, NOT AS A VERDICT ON THE METHOD

> **THE FIRST COHORT IS SMALLER THAN TWELVE. We know it now, not after building eleven pages.**

This is **not** "profession pages do not work" — `/nursing` works, measured, twice. The question it
answers is **"how many professions have enough per-profession data?"**, and that is a number.

**And Gate B asks for ten, not twelve.** A cohort of ten is still a cohort. What is not yet known is
whether ten is reachable, and the chain runner is now generalised (`--page=<slug>`) so answering it
costs one fact-acquisition pass per profession rather than a rebuild.

**The honest state: 1 measured pass, 1 measured fail, 10 unmeasured.**

---

## 6 · 🔴 A MEASUREMENT BUG I FOUND BY RUNNING A SECOND PROFESSION

The shared/unique split used `ALL_REPEATED_CLAIMS` — **a hardcoded list assembled from the nursing
page.** On a speech-pathology page it did not recognise HCPC's profession-independent claims and
**counted them as unique**, crediting text that would be identical on all twelve as
distinguishing. The same bug was already on `/nursing`:
`ie-nmbi.recognised-english-speaking-countries` has no profession qualifier and was being counted
as unique.

> **A CLAIM DISTINGUISHES A PROFESSION PAGE ONLY IF IT IS ABOUT THE PROFESSION.**
> **A hardcoded list is a check that silently stops being complete the moment the registry grows.**

Replaced with `isPerProfession()`, **derived from the record's own qualifier**. The first
speech-pathology figures were 316 uniqueWords / 0.3313 overlap; corrected, they are **34 / 0.6974**.

**And it moved nursing against my own interest too** — 606 → **511** uniqueWords, 0.2409 → **0.2890**
overlap. Nursing still passes, on worse numbers, which is the only way that result is worth
anything.

---

## WHAT THIS RUN DID NOT DO

- **No page published. No delete. No DB table. No production write.** `almi-oet` was **read** only.
- **No threshold moved** — and the fail was not softened by touching one.
- **It did not invent a fact to rescue a page.** CORU, Speech Pathology Australia and New Zealand
  contribute nothing, and the page is allowed to look like it.
