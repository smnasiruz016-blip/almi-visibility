# THE SHARED BLOCK, EXTRACTED — ARITHMETIC ONLY

**10 September 2026.** `npm run split`. **No new fetch, no new research, no new page published.**
The eleven sibling pages come from the cache `npm run chain` already wrote. The only new sentence
is the one-line link that replaces the extracted block — **and it is counted**, because it is words
on the page and it is the same words on all twelve.

---

## THE GAP THIS CLOSES

> **§5A: "Page generation must not create independent untraceable copies of the same factual
> claim."**

We built the facts **by reference** — and then rendered seven of them onto twelve pages. Every copy
was *traceable* (`data-claim-id` sees to that) but there were still **twelve of them**.

🔴 **The by-reference rule stopped at the page boundary.** That is the whole defect, and it is ours,
not the threshold's.

---

## THE RESULT

### Both bookkeeping readings, both variants. Neither picked over the other.

| | AS BUILT | **FULL SPLIT** | **READER-SAFE** |
|---|---|---|---|
| claims on the page | 19 | **12** | **13** |
| total words | 1,980 | 1,134 | 1,274 |
| — prose | 1,938 | 1,105 | 1,245 |
| — list | 0 | 0 | 0 |
| — heading | 42 | 29 | 29 |
| **uniqueWords, one page** | 1,643 | 850 | 964 |
| **overlap A** (citations per-profession) | **0.3921** | 🟢 **0.1292** | 🟢 **0.1945** |
| **overlap B** (citations shared) | **0.4003** 🔴 | 🟢 **0.1468** | 🟢 **0.2116** |
| vs the 0.40 bar | **straddles it** | **both pass, by 3×** | **both pass, by 2×** |
| S / U shingles (A) | 978 / 758 | 225 / 758 | 380 / 758 |

### 🔴 The answer to the question that was asked

> **CLEARLY BELOW 0.40 — AND NOT BY A LITTLE.**
> **0.3921 / 0.4003 → 0.1292 / 0.1468.** About **one third** of the bar, on both readings.

**So the problem was never the thresholds. The problem was that the shared thing was being copied
everywhere.** The owner's two constants survive this run untouched, and **nothing was changed to
make it pass** — the only edit was to stop duplicating what was already shared.

### The rollout, both models

| | AS BUILT | FULL SPLIT | READER-SAFE |
|---|---|---|---|
| shell after rollout | 1,935 | 1,091 | — |
| uniqueWords, **pessimistic** | 45 🔴 | 43 🔴 | — |
| uniqueWords, **best case** | 469 ✅ | **770** ✅ | **678** ✅ |
| two simulated siblings | 0.8464 | 0.7606 | — |

### ⚠️ AND THE PESSIMISTIC MODEL HAS GONE VACUOUS — SAY IT PLAINLY

The pessimistic rollout barely moves (45 → 43) and **that is not the split failing.** That model
makes the other eleven pages *the same sentences with the nouns changed*. Before the split it was
informative: it showed the shared block dominating. **After the split it tests only its own
premise** — it assumes the per-profession half is copied too, and if that were true no design of
any kind could pass.

**And we know the premise is false, from our own registry:** NMBI answers the recognised-country
question with **five** countries where UKVI says **eighteen**. Two regulators disagree on one claim
about one profession. **Twelve regulators of twelve professions will not be one text with the nouns
swapped.**

So the number that carries meaning after the split is the **best case**, and it is a comfortable
pass on every measure.

---

## 🔴 THE HONEST QUESTION: DOES THIS MAKE THE PAGE WORSE FOR THE READER?

**Yes, in two specific places. Here is exactly what leaves and whether a link really replaces it.**

| claim removed | kind | is a link enough? |
|---|---|---|
| `oet.subtests-and-which-are-profession-specific` | test-shared | 🔴 **NO — this is the page's own premise.** It is the claim that explains why there is a *nursing* page at all instead of one page about OET. Behind a link, `/nursing` starts mid-argument |
| `oet.grade-bands-0-500` | test-shared | ✅ yes — reference material, looked up once |
| `uk-ukvi.majority-english-speaking-countries` | **origin-shared** | ✅ yes on this page — see below |
| `uk-code-of-practice.red-list-rule` | **origin-shared** | 🔴 **NO, and this is the serious one** |
| `uk-code-of-practice.amber-list-rule` | **origin-shared** | 🔴 same |
| `uk-code-of-practice.direct-application-exception` | **origin-shared** | 🔴 same |
| `nz-immigration-nz.oet-must-be-taken-in-person` | destination-shared | 🟡 partly — it is a condition on the test, not on the profession |

### The serious one, stated without softening

`ORIGIN_CLAIM_SHAPE.md` §3 recorded the red list as **"the single most consequential thing a nurse
from Nigeria or Pakistan could read, and neither NMC nor OET puts it on a page about them."**

**Putting it behind a link is a smaller version of the same failure we convicted the incumbents
of.** A gate that calls the page better while the reader is worse off is measuring the wrong thing,
and this report will not pretend otherwise.

### 🔴 But the finding underneath is bigger than the link

**Four of the seven are ORIGIN-scoped — and a profession page never knows the reader's origin.**
`/nursing` was showing the red-list rules to every reader regardless of whether they were from
Nigeria, India or Ireland, because there was nowhere better to put them.

> **THEY WERE NOT MERELY DUPLICATED. THEY WERE MISPLACED.**

Their right home is a page that **knows the origin** — the origin table or a corridor page — where
the claim stops being *"here are the rules"* and becomes **"Nigeria is red-listed, and here is what
that means for you."** That is strictly better for the reader than what `/nursing` does today, and
it is the same conclusion the corridor work reached from the other direction.

**So: extracting them costs the reader nothing that the origin page should not be doing better.
Extracting the PREMISE does cost the reader, and that one should not move.**

### The reader-safe variant, measured rather than argued

Keeping `oet.subtests-and-which-are-profession-specific` on the profession page:

| | |
|---|---|
| overlap A / B | **0.1945 / 0.2116** — both pass, at half the bar |
| cost of keeping the premise | 0.1292 → 0.1945 |
| uniqueWords, one page | 964 |
| best-case rollout uniqueWords | 678 |

**One claim earns its repetition. It is paid for in overlap and the payment is affordable.**

---

## THE SHARED PAGE ITSELF

`/oet-scoring-and-uk-rules` — **7 claims, 921 words, 889 prose, 670 uniqueWords, 7 facts.**

It clears Gate A's fact bar on its own, and it is **one page carrying claims that were being
rendered twelve times.** That is the by-reference rule finally reaching past the page boundary.

⚠️ It is a *candidate*, not a recommendation: **four of its seven claims are origin-scoped and
probably belong on an origin page instead**, which would leave a genuinely small shared page about
the test alone.

---

## WHAT THIS SETTLES, AND WHAT IT DOES NOT

| | |
|---|---|
| ✅ **settled** | The overlap problem was **duplication, not the threshold.** Clearly below 0.40 on both readings, both variants |
| ✅ **settled** | `MIN_UNIQUE_WORDS = 350` and `MAX_SIBLING_OVERLAP = 0.40` **survive this run unchanged** — and were not touched to make it pass |
| 🟡 **not settled** | Whether those two constants are RIGHT. They still carry no sample, and Rule Twelve still applies to both. This run removes the *urgency*, not the *debt* |
| 🔴 **new, and it is a design finding** | Four of the seven shared claims are **origin-scoped and misplaced on a profession page at all** |

**The ranking recipe (measuring ten pages that actually rank) is therefore NOT needed to unblock
this** — the cause is identified and fixed. It remains worth doing to retire the threshold debt,
but it is no longer on the critical path.

---

## WHAT THIS RUN DID NOT DO

- **No page published. No page deleted. No DB table. No production write. No other product
  touched.** No fetch of any kind.
- **No threshold changed.** Not one constant moved, and none would have been moved to make this
  pass.
- **It did not hide the reader cost.** Two of the seven removals are a real loss; one of them is
  serious; and the reader-safe variant is measured rather than asserted.
