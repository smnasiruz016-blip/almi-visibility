# THE FIRST COMPLETE CHAIN — REGISTRY → PAGE → GATE A → ROLLOUT

**10 September 2026.** Run with `npm run chain`. Nothing published, nothing deleted, no table,
no production write, no other product changed.

> ### 🔴 FIRST, THE HONEST STATUS: **DOD-03A DOES NOT PASS.**
>
> `§5A.1`'s fifth condition is that the registry be **filled with real data, sufficient for the
> first cohort.** **39 records do not meet it.**
>
> **The engine is ready. The supply is insufficient.** That is the sentence to carry forward, and
> it is not the same sentence as "pass". Every mechanism DOD-03A asks for exists, is tested, and
> has been run against the live web — and a cohort needs more facts than this registry holds.

---

## STEP 1 · THE REGISTRY, FILLED FOR `/nursing`

`PROFESSION_PAGE_CLAIM_INVENTORY.md` §3 says what this page needs. **Exactly those claims were
acquired — none "for later".**

| added | records | queue | check |
|---|---|---|---|
| **OET Block A** — writing task, speaking role-play, sub-tests, grade bands | **4** | AUTOMATED | fingerprint |
| **NMC Block B** — profession version, combining floor, delivery modes | **3** | AUTOMATED | quote-match |
| **total new** | **7** | **7 AUTOMATED · 0 MANUAL** | |

**Registry: 32 → 39 records.** The nightly job runs **39/39 pass, 0 fail, 0 could-not-check.**

### Two deviations from the inventory, recorded rather than taken quietly

1. **The inventory's fifth NMC claim was an "approved-programme rule". No such rule exists on the
   English-language pages.** What is there, and is far more nursing-specific, is the requirement to
   sit the **Nursing version** of OET. That is taken as the fifth.
2. **Two claims beyond the inventory's five**, and the reason is not "useful later":
   - the **combining FLOOR**. A page that says "you can combine two sittings" without saying every
     score in both must still clear a floor is **misleading in the direction that costs a nurse a
     fee.**
   - the **accepted delivery modes**, because the combining rule cannot be stated accurately
     without them.

   Both are conditions **on** a claim the inventory already required.

### The four OET gaps are CLOSED — and closed the right way

They were acquirable all along; the licence was never the obstacle to *knowing* the fact, only to
*quoting* it. **All four are in our own words with a URL and a date.** OET's licence prohibits
holding its wording; it does not prohibit the truth.

---

## STEP 2 · THE PAGE, BY REFERENCE

`§5A`: *"Facts must be reusable by reference. Page generation must not create independent
untraceable copies of the same factual claim."*

- **`src/page/spec.mjs` contains claim IDs and section headings. Not one fact.**
- **Every rendered fact carries `data-claim-id` into the HTML**, so the page is traceable back to
  the registry by anybody reading the markup.
- `findCopiedFacts()` checks the spec for copied record text: **0**, and its red is forced by
  planting a real record's sentence into the spec and watching it trip.
- The renderer **throws** on a claim the registry lacks — never skips it. It **refuses** any record
  that is not `active`. It puts every quote through `renderableQuote()`, so a lapsed licence
  condition **withholds the reproduction while the fact survives**.

| | |
|---|---|
| claims referenced / rendered | **19 / 19** |
| sources | 6 — uk-nmc 7 · oet 4 · ie-nmbi 3 · uk-code-of-practice 3 · nz-immigration-nz 1 · uk-ukvi 1 |
| their words, quoted with the required credit | **11** |
| 🔴 **our words, because theirs may not be held** | **8** |
| quotability states on the page | PERMITTED 12 · PROHIBITED 4 · RESERVED 3 |
| words | **1,980** — prose 1,938 · list 0 · heading 42 |

---

## STEP 3 · GATE A — ONE PAGE

| check | result | |
|---|---|---|
| **uniqueWords** | **1,643** / 350 | ✅ PASS |
| prose / list split | 1,938 / 0 | reported, not thresholded |
| **verified facts** | **19** / 5 | ✅ PASS |
| — linkChecked 19 · **factChecked 0** | | 🔴 still zero, and it must be |
| **overlap vs the 11 published siblings** | **0.0000** / 0.40 | ✅ PASS |
| whyThisUrl | present | ✅ |
| | | |
| **VERDICT** | **KEEP** | |

**Population: the 11 other profession pages, fetched live from what AlmiOET serves today** — the
published population, not survivors. Group shell **337 tokens** over 12 pages.

For scale: the live `/nursing` page scores **73** unique words. This candidate scores **1,643**.

> ### ⚠️ AND THIS NUMBER IS WORTH ALMOST NOTHING ON ITS OWN.
> Overlap 0.0000 is what you get for being the only page in the group that is not built from the
> existing template. It measures novelty against **the estate we are deleting**, not against what
> the estate would become. **Step 4 is the test.**

---

## STEP 4 · 🔴 THE ROLLOUT — WHERE THE VERDICT IS ACTUALLY READ

On 10 September this was measured once already: five facts on ONE corridor page moved overlap
**0.9792 → 0.7364**, and the same five rolled out across all 191 put it back at **0.9695**. A
one-page pass proves nothing.

### 4a · The part that needs NO simulation — measured off the page as built

| | words |
|---|---|
| shared facts (7 of 19 claims render identical text on all twelve pages) | **623** |
| framing text (title, intro, headings — identical on all twelve) | **273** |
| **identical across all twelve, by construction** | **896 of 1,980 = 45.3%** |

**Nearly half the page is the same on every profession page before anybody writes a word.**

### 4b · The pessimistic simulation — an UPPER bound on overlap

🟡 The other eleven pages are modelled as the same sentences with the proper nouns changed. We do
not have the GMC's or the GDC's facts and **inventing them would be the exact thing this registry
exists to prevent**, so the model keeps structure identical — the worst case.

| | one page | after rollout |
|---|---|---|
| uniqueWords | 1,643 | 🔴 **45** / 350 |
| group shell | 337 tokens | **1,935 tokens** — the shared half becomes shell |
| overlap | 0.0000 | — *(never reached: rejected at uniqueWords first)* |
| **VERDICT** | KEEP | 🔴 **REJECT** |

Two simulated siblings against each other: **0.8464**.

### 4c · The best case — DERIVED, not simulated

If two profession pages shared **exactly** the shared half `S` and their per-profession halves were
**entirely disjoint**, then by the definition of Jaccard over shingles:

> **overlap = |S| / (|S| + |Uₐ| + |U_b|)**

Every term measured off the real candidate. Nothing invented.

| bookkeeping | shared shingles | per-profession | overlap | vs 0.40 |
|---|---|---|---|---|
| citations counted **per-profession** | 978 | 758 | **0.3921** | PASS |
| citations counted **shared** | 873 | 654 | **0.4003** | 🔴 FAIL |

> ### 🔴 THE TWO READINGS STRADDLE THE BAR.
> A verdict that flips depending on **which side of a citation line you draw** is a design sitting
> **on** the threshold, not clearing it. And this is the **floor** — the friendliest number this
> design will ever produce, assuming twelve pages about the same test share **not one 5-gram**
> outside the shared half. **No two such pages ever will.**

---

## THE RESULT, AS IT CAME

> ## 🔴 STEP 3: KEEP. STEP 4: REJECT. THE DECISION IS STEP 4's.

**This is a FAIL, and it is reported as a number, not as "nearly".** The pessimistic rollout does
not miss by a little: uniqueWords falls to **45 against a bar of 350**. And the most generous
arithmetic anyone can construct lands at **0.3921–0.4003 against a bar of 0.40**.

### What this rules OUT

**Building the other eleven profession pages the same way.** Doing so would produce twelve pages
that are 45% identical by construction, and the shared half would become shell and stop
distinguishing them — exactly what happened to the 240,328 pages being deleted, arrived at from a
better starting point.

### The two explanations, and they are not the same

The brief named both, and the measurement does not choose between them:

1. **Gate A's thresholds came from the wrong place.** `MIN_UNIQUE_WORDS = 350` and
   `MAX_SIBLING_OVERLAP = 0.40` were **reasoned to, not measured from a ranking page.** They carry
   no sample. A design that lands at 0.3921 against a bar nobody measured is not obviously failing
   the world — it may be failing an assumption.
2. **A profession page is not enough on its own.** The shared half is shared because the facts
   genuinely ARE shared: OET's grade bands are the same for a dentist and a nurse, and so is the
   red list. **That is not padding to be removed — it is true, and a reader needs it.**

### 🔴 The finding that sits underneath both

**The per-profession half of a well-sourced profession page is about 1,084 words and 758 shingles,
and the shared half is about 896 words and 978 shingles. THE SHARED HALF IS BIGGER THAN THE UNIQUE
HALF.** No amount of writing changes that while the shared facts stay on the page — and removing
them makes the page worse for the reader.

**The next cheap thing that would resolve it:** measure `MIN_UNIQUE_WORDS` and
`MAX_SIBLING_OVERLAP` against pages that actually rank, instead of against a number this project
reasoned its way to. **Rule Twelve: a threshold that justifies itself with a measurement must name
that measurement, and neither of these can.**

---

## WHAT THIS RUN DID NOT DO

- **No page published. No page deleted. No DB table. No production write. No other product
  changed** — the eleven siblings were **read**, which the SCOPE LAW permits.
- **It did not turn on `factChecked`.** 0 / 39.
- **It did not report DOD-03A as passing.** Engine ready, supply insufficient.
- **It did not soften the result.** Step 4 is a REJECT and the numbers are printed.
