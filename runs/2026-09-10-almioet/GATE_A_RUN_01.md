# GATE A — RUN 01 · AlmiOET · 2026-09-10

**Gate A's first run on real data.** Two things happened at once: a measurement of the
old stock, and proof that the gate runs on something other than its own fixtures.
No page was deleted. No page was created. Nothing was written outside this machine.

- corpus built: `2026-09-10T03:05Z` → `03:16Z`
- gate run: `2026-09-10T03:18:07Z`, wall clock **3.5 s** for all 3,414 pages
- shell definition: **B** (`df >= 98%`), with **A** computed alongside
- artefacts: `corpus-manifest.json` (the exact 500 sampled URLs), `gate-a.csv` (one row per page)

---

## 0 · WHAT THE FETCH COST — a number we did not have

| | |
|---|---|
| URLs published in the sitemap | **240,328** |
| pages fetched | **3,414** |
| failures | **0** |
| HTTP requests (1 index + 6 child sitemaps + 3,414 pages) | **3,421** |
| wall clock | **663 s** (11 min 3 s) |
| rate | **5.2 pages/s**, concurrency 6, min spacing 120 ms |

**Extrapolation, and it is an extrapolation, not a measurement (RULE EIGHT):** at this
same polite rate, fetching all 240,328 would take **~12.8 hours** and 240,335 requests.
That is exactly the full crawl GAP-055 was opened to stop paying for, which is why the
leaf group was sampled and the other three were not.

**Sample:** the leaf group `/[prof]/from-[origin]/[org]` has **2,292 strata**
(profession x origin) covering all 237,413 URLs. **500 strata** were drawn, one page
from each. **SEED = 20260910**, PRNG mulberry32, keys sorted before shuffling — the
same 500 URLs come back on a re-run, and they are listed in `corpus-manifest.json`.

---

## 1 · `/[profession]` — 12 pages, ALL of them

| | |
|---|---|
| shell | **A = 669 tokens · B = 669 tokens · difference 0** |
| B's threshold | needs a word on **12 of 12** pages |
| uniqueWords | min **70** · p25 74 · **median 76** · p75 81 · p95 88 · **MAX 88** |
| KEEP | **0** |
| reached stage 2 (facts) | **0** |
| reached stage 3 (overlap) | **0** |

🔴 **B IS A here, exactly as ruled in D1.** `ceil(0.98 x 12) = 12`, so "on 98% of pages"
and "on every page" are the same sentence for twelve pages. The knob does nothing on
this group and the run says so in its own output.

**In words: NO PAGE REACHED THE FACT STAGE, AND NO PAGE REACHED THE OVERLAP STAGE.**
That is not a pass. It is a finding about the corpus: the best of the twelve profession
pages carries **88 unique words** against a threshold of 350 — **25% of the bar**.

---

## 2 · `/[profession]/from-[origin]` — 2,292 pages, ALL of them

| | |
|---|---|
| shell | **A = 803 tokens · B = 803 tokens · difference 0** |
| B's threshold | needs a word on **2,247 of 2,292** pages |
| uniqueWords | min **114** · p25 141 · **median 220** · p75 **470** · p95 **2,220** · **MAX 2,236** |
| rejected at uniqueWords | **1,719** |
| **reached stage 2 (facts)** | **573** |
| rejected at facts | **573** — all of them |
| reached stage 3 (overlap) | **0** |
| KEEP | **0** |

🔴 **THIS IS THE ONE GROUP WITH A LIVING POPULATION, AND ITS SHAPE IS BIMODAL.**
The 573 that passed are not scattered — they are exactly three professions:

| profession | passed uniqueWords |
|---|---|
| medicine | **191 / 191** |
| nursing | **191 / 191** |
| pharmacy | **191 / 191** |
| the other nine professions | **0 / 191 each** |

3 x 191 = 573. The split is a property of the DATA, not of the page: medicine, nursing
and pharmacy have long recognising-organisation lists (the top page reaches 3,039 total
/ 2,236 unique words, most of it a list of 469 organisations with their grade rows);
dentistry, dietetics, optometry, physiotherapy, podiatry, radiography, speech pathology,
occupational therapy and veterinary science have short ones and top out around 220.

**And all 573 were then rejected at the FACT stage, with `qualifying = 0`.**
Not a single one — because **no fact record exists anywhere in the corpus**: zero
`*.facts.json` files were produced, because AlmiOET stores no fact with the four fields
(value + source URL + tier + verified date). The number is not "few". It is **0 of 0**.

⚠️ And by the honesty correction already in the code: `linkChecked = 0` and
`factChecked = 0`, reported as separate columns. Nothing here read a source and confirmed
a value, and nothing pretends to have.

**In words: NO PAGE REACHED THE OVERLAP STAGE**, and by D2-A's ordering that is the
design working, not a gap: the quadratic check never ran because nothing survived to it.

---

## 3 · `/[profession]/from-[origin]/[organization]` — a 500-page SAMPLE of 237,413

| | |
|---|---|
| shell | **A = 457 tokens · B = 460 tokens · difference 3** (the only group where A and B differ) |
| B's threshold | needs a word on **490 of 500** pages |
| uniqueWords | min **86** · p25 115 · **median 131** · p75 150 · p95 195 · **MAX 303** |
| KEEP | **0** |
| reached stage 2 (facts) | **0** |
| reached stage 3 (overlap) | **not applicable — see below** |

### 🔴 THE OWNER'S OWN PRE-WRITTEN RULE HAS FIRED. I AM NOT RULING ON THIS GROUP.

> *"If anything comes out CLOSE to 350, the sample has done its job — count that group IN FULL."*

**The sample's MAXIMUM is 303.** That is **86.6% of the threshold** — inside 20% of it.
The rule fires. So:

- **The 237,413 are NOT ruled on from this sample.** Not kept, not killed, not counted.
- The distribution says the *typical* page is far below the bar (median 131, p95 195),
  but the tail reached 303 in only 500 draws, and 237,413 pages have 474x more chances
  to go further. A "delete them all" ruling taken from this sample would be a ruling
  taken from a number that the sample itself flagged as unsafe.
- **Counting that group in full costs ~12.7 hours of polite fetching and 237,413
  requests** — i.e. a full crawl of the leaf group, on the route GAP-055 has now made
  cacheable. That is the price of the ruling and it is the owner's call to spend it.

### And overlap is INAPPLICABLE here, not merely empty

Overlap is a claim about a PARTICULAR PAIR. "Every sibling, never a sample" does not
weaken on a sample — it makes the measurement inapplicable. An overlap computed inside a
500-page sample of a 237,413-page group is not that group's overlap, so it is not
reported, not stored, and not to be quoted later.

---

## 4 · `/register/[org]` — 610 pages, ALL of them

| | |
|---|---|
| shell | **A = 320 tokens · B = 320 tokens · difference 0** |
| B's threshold | needs a word on **598 of 610** pages |
| uniqueWords | min **14** · p25 25 · **median 30** · p75 34 · p95 43 · **MAX 141** |
| KEEP | **0** |
| reached stage 2 (facts) | **0** |
| reached stage 3 (overlap) | **0** |

**The thinnest group in the network by an order of magnitude: a median of 30 unique
words per page.** These are the pages the owner has already classed as *not SEO pages, a
separate class* — and the measurement agrees with that classification rather than
contradicting it. Gate A's verdict on them is REJECT, but the right conclusion is the
owner's: they should not be in a sitemap at all, which is a different fix from deleting
a thin page.

---

## 5 · THE WHOLE RUN IN ONE TABLE

| group | pages | shell A / B | min | median | MAX | KEEP | reached facts | reached overlap |
|---|---|---|---|---|---|---|---|---|
| `/[profession]` | 12 (ALL) | 669 / 669 | 70 | 76 | **88** | **0** | 0 | 0 |
| `/[prof]/from-[origin]` | 2,292 (ALL) | 803 / 803 | 114 | 220 | **2,236** | **0** | **573** | 0 |
| `/[prof]/from-[o]/[org]` | 500 (SAMPLE of 237,413) | 457 / 460 | 86 | 131 | **303** | **0** | 0 | n/a (sample) |
| `/register/[org]` | 610 (ALL) | 320 / 320 | 14 | 30 | **141** | **0** | 0 | 0 |

**KEEP = 0 across 3,414 measured pages.**

---

## 6 · IS THE GATE MEASURING WRONGLY? — the question the owner ordered asked

> *"The owner has already been told the surviving pages will be in the hundreds. If your
> result comes out in the MILLIONS, that is not good news."*

It came out at **zero**, which is the opposite error and deserves the same suspicion.
Three checks against the gate itself:

1. **The shell is not eating the page.** The `/[prof]/from-[origin]` group's top page has
   3,039 total words and 2,236 survive the shell — the shell removed 26%, not 99%.
   A shell that was swallowing content would show a max near zero, not near 2,236.
2. **The gate can say yes.** 573 pages passed stage 1. The gate is not stuck on REJECT;
   it rejected them at a LATER stage, for a different and checkable reason.
3. **The zero at stage 2 has a verifiable cause outside the gate.** `qualifying = 0`
   because `total = 0`: there are no fact records to qualify. That is a statement about
   AlmiOET's data model, and it is falsifiable — produce one fact record with the four
   fields and the number moves.

**So the honest reading is: the gate works, and the stock genuinely does not clear the
bar.** The "hundreds of survivors" estimate assumed facts existed to be counted. They do
not exist yet — anywhere. **The 573 pages are the only real candidates in the network,
and what stands between them and KEEP is not word count. It is that nobody has ever
recorded a fact with a source, a tier and a verified date.**

---

## 7 · WHAT THIS RUN DOES **NOT** SAY

- It does not delete anything. (Gate A's result + 90 days of clicks first, then 410 Gone.)
- It does not rule on the 237,413 — the sample forbade it, in advance, by the owner's rule.
- It does not report any overlap number for any group. Nothing reached that stage.
- It does not claim any fact was checked. `factChecked = 0`, hard-coded, with a test.
- It says nothing about almiprep, almipte, the 1,172,926-URL host, or world. Each runs
  its own Gate A in its own turn.
