# DISTINGUISHING SUPPLY — WHERE THE UNIQUENESS ACTUALLY IS

**10 September 2026.** `npm run census:distinguishing` · clinical counts from `almi-oet`, **read
only**. No fetch. No page published. No production write. **No threshold moved.**

---

## 0 · THE FINDING THIS ANSWERS

Beta-g measured a competitor with **our own method** (5-word shingles, Jaccard, normalised):

| | overlap |
|---|---|
| their three profession pages against each other | **0.0828 – 0.1305** |
| our bar | 0.40 |
| our regulator-only `/speech-pathology` | 🔴 **0.6974** |

> ### THE BAR IS NOT THE PROBLEM. **0.40 is LENIENT against a market sitting at 0.08–0.13.**

And their regulator tables are near-identical page to page. Their uniqueness comes from the
**clinical layer** — who the letter goes to, which terminology, which criterion loses marks.

**Our `/speech-pathology` fell to 34 unique words because it was built ENTIRELY from regulator
facts — the one layer that is the same for all twelve.** We had already measured the cause without
naming it: five of HCPC's six professions share 1400/300, and AHPRA is profession-independent.

---

## 1 · KAAM 1 — THE CENSUS, REDONE ON DISTINGUISHING CLAIMS

The old census ranked professions by **how many regulators recognise OET**. AHPRA proved that the
wrong instrument: reachable, 31,848 characters, rich — and adding it makes a page **worse**.

> **A claim only helps a profession page if its value DIFFERS from at least one other profession.
> A `profession=` qualifier makes a claim ADDRESSABLE. It does not make it DISTINGUISHING.**

### The result — and it is not the table anyone wanted

| profession | total claims | per-profession | **distinguishing** | ⚠️ uncomparable |
|---|---|---|---|---|
| nursing | 43 | 11 | **0** | 11 |
| speech-pathology | 35 | 3 | **0** | 3 |
| the other ten | 32 | **0** | 0 | 0 |

| | |
|---|---|
| distinguishing predicates | **0** |
| shared predicates | **0** |
| ⚠️ **UNCOMPARABLE** | **14 of 14** |

> ### 🔴 THIS CENSUS CANNOT SIZE THE COHORT, AND SAYING SO IS THE RESULT.
>
> **All fourteen profession-qualified predicates are held by exactly ONE profession.** A value can
> only be called distinguishing by **comparing** it, and there is nothing to compare it to. The
> registry covers **2 of 12** professions.

**UNCOMPARABLE is kept as a third answer** rather than folded into "shared" or "distinguishing" —
folding it would be inventing a comparison nobody made. *(The same discipline as "could not check"
being a third check outcome.)*

**What the census does say: the missing thing is claims for the other ten professions — and, on the
evidence of §2, the regulator layer is the wrong place to go looking for them.**

---

## 2 · KAAM 2 — IS THE CLINICAL LAYER THERE? **YES, AND IT IS BETTER THAN THE MARKET.**

Measured from `almi-oet`'s per-profession item generators. **Read only. Counts only.**

### 🔴 OET IP LAW, OBEYED LITERALLY

**Not one sentence, question, option, passage, case note or script was printed, and no OET file was
copied into this repository.** Every value was **SHA-256 hashed the moment it was read**, so set
comparison works while no token can reach the output even by accident. What follows is counts and
similarity numbers.

### The supply exists, and it is uniform across all twelve

| | |
|---|---|
| professions with a per-profession bank | **12 of 12** |
| items per profession | **15 speaking + 15 writing = 30** |
| **total items** | **360** |
| files | 24, ~675 lines and ~86 KB each |

### And it distinguishes — this is the number that matters

| field | distinct per profession | mean pairwise Jaccard (66 pairs) | |
|---|---|---|---|
| **`setting`** | 3.6 | **0.0000** | 🔴 completely distinguishing |
| **`recipient`** | 13.5 | **0.0011** | 🔴 highly distinguishing |
| `candidateRole` | 0.2 | 0.0000 | distinguishing but sparse |
| `letterType` | 3.8 | **0.9242** | shared — referral/discharge/advice are the same everywhere |
| `topicTag` | 3.1 | 0.8040 | shared |
| `taskType` | 2.0 | **1.0000** | identical |

**Whole-bank overlap, our own shingle method, all 66 profession pairs:**

| | overlap |
|---|---|
| **our clinical bank** | **mean 0.0125** · min 0.0094 · max 0.0181 |
| the market (beta-g, competitor) | 0.0828 – 0.1305 |
| our regulator-only page | 🔴 0.6974 |

> ### 🔴 OUR CLINICAL LAYER IS AN ORDER OF MAGNITUDE MORE DISTINGUISHING THAN THE MARKET, AND 56× MORE THAN OUR OWN REGULATOR-ONLY PAGE.

**And it lands exactly where beta-g said it would.** *"Who the letter goes to"* is `recipient`, at
**0.0011**. *"Where it happens"* is `setting`, at **0.0000**. Meanwhile *"what kind of letter"*
(`letterType`) is **0.9242** — shared. **The distinguishing power is in the recipient and the
setting, not in the letter type.**

### ⚠️ AND THE LIMIT ON THIS SUPPLY, STATED PLAINLY

**Our item bank tells us what WE built. It is not a tier-1 source for a claim about what OET
requires.** A page claim drawn from it must be either:

- a claim **about our own practice bank**, sourced to ourselves and honestly labelled; or
- a claim about OET, which needs an OET source — and OET is `PROHIBITED`, so it can only ever be
  **in our own words**.

**No clinical claim has been written into the registry by this run.** The question asked was whether
the supply exists. **It does: 12 of 12 professions, 30 items each, overlap 0.0125.** Writing the
claims is the next job, not this one.

---

## 3 · KAAM 3 — THE HCPC LICENCE

**UNREAD = 7, all of them HCPC**, and `/speech-pathology` is built on them.

| | |
|---|---|
| status | 🔴 **a PUBLISH blocker, not an engine-test blocker** |
| meanwhile | every HCPC fact is in **our own words**, fingerprint-watched, no wording stored |
| the test | **counts the debt** rather than silencing it — `assert.equal(UNREAD, 7)` |
| before publish | reading hcpc-uk.org's terms is **mandatory** |

**Not stopping for it now**, per the ruling. It is counted, and it fails loudly the day somebody
tries to publish on it.

---

## 4 · WHAT THIS CHANGES

| | |
|---|---|
| ✅ **The bar is vindicated** | 0.40 is **lenient** against a market at 0.08–0.13. Nothing to move, and nothing was moved |
| 🔴 **The regulator layer cannot carry a profession page** | 0 distinguishing predicates, 14 uncomparable, and AHPRA would have made it worse |
| ✅ **The clinical layer can** | 12/12 professions, 360 items, overlap **0.0125** — better than the market |
| ⚠️ **The cohort still cannot be sized** | that needs claims for the other ten professions, and they must come from the clinical layer |

### The next job, named

**Write clinical claims into the registry for one profession and re-run the chain** — the runner is
already generalised (`--page=<slug>`). The prediction, recorded so it can be wrong: a page carrying
`recipient` and `setting` claims should land far below 0.40, because those two fields already
measure 0.0011 and 0.0000 across professions.

⚠️ **That is a PROJECTION, not a measurement.** Rule Eight. It is written down so the next run can
contradict it.

---

## WHAT THIS RUN DID NOT DO

- **No chain re-run** — the ruling said not until this census existed. It exists now.
- **No threshold moved.**
- **No WCS text read, copied or stored.** The finding is structural, and it arrived as numbers.
- **No OET content printed and no almi-oet file changed or copied.** Read only, counts only, values
  hashed before comparison.
- **No page published, no delete, no DB table, no production write.**
