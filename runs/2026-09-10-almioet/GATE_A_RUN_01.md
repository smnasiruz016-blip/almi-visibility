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

🔴 **AND THE SPLIT HAS AN EXACT CAUSE, CONFIRMED FROM THE SOURCE DATA.**
`organisations.json`'s own `meta.roleCounts` — how many recognising organisations OET
lists per profession — sorts the twelve professions like this:

| nursing | medicine | pharmacy | — the bar falls here — | occ. therapy | physio | dentistry | speech | radiography | optometry | veterinary | dietetics | podiatry |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **469** | **297** | **70** | | 56 | 56 | 47 | 46 | 44 | 40 | 40 | 39 | 39 |

The three that passed are exactly the three with the longest lists, and the cut lands
**between 70 and 56 organisations**. Nothing about the page changed — only how many rows
its list has. That is not a content difference; it is a table length.

**And all 573 were then rejected at the FACT stage, with `qualifying = 0`.**
Not a single one. **Zero `*.facts.json` files were produced for any of the 3,414 pages** —
the corpus carries no fact records at all, so at the gate the number is **0 of 0**.

⚠️ **A PRECISION I OWE, BECAUSE I FIRST WROTE THIS TOO BROADLY.** "None in the corpus" is
measured and true. **"None anywhere" is not.** What AlmiOET's codebase actually holds:

| where | how many | value | source URL | tier | verified date |
|---|---|---|---|---|---|
| `src/lib/oet-seo/org-notes.ts` | **1** (`nz-immigration-nz`) | ✅ | ✅ resolvable, official | ❌ none | ✅ `2026-07-15` |
| `src/lib/oet-seo/organisations.json` | 610 orgs / **1,243** profession-grade rows | ✅ | ❌ one collective `meta.source` naming an Algolia index — not a per-fact URL | ❌ none | ⚠️ one collective `fetchedAt 2026-06-27`, not per fact |

So the network's total stock of facts in the four-field shape is **one**, and it was
hand-written. The 1,243 grade rows are real data from OET's own index and are the best
raw material there is — but as records they are missing a per-fact source and a tier, and
they share a single fetch date. **None of it is attached to a page as a fact**, which is
why the gate saw zero and was right to.

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

### 🔴 VERDICT: **UNDECIDED ON WORDS · DECIDED ON FACTS · verdict: delete**

**That exact sentence is the ruling, and each half of it is load-bearing.**

**UNDECIDED ON WORDS.** The sample's MAXIMUM is **303** — **86.6% of the 350 threshold**,
inside 20% of it. The owner's own pre-written rule fired: *"if anything comes out CLOSE
to 350, the sample has done its job — count that group IN FULL."* So the word question
was NOT answered from this sample, and it is **still not answered.** Counting it would
cost ~12.7 hours and 237,413 requests. **That count is not being run** — see the next
paragraph — which leaves the word question **OPEN AND MOOT**.

⚠️ **It must never be quoted later as though it had been answered.** Nobody knows whether
those 237,413 pages clear 350 unique words. The group is being deleted for a different
reason, and if someone in six months needs the word answer, they will have to go and
measure it.

**DECIDED ON FACTS.** The owner rescinded his own rule, and the reason is that the rule
assumed `uniqueWords` was the deciding check. **It is not.** FACTS is — and facts are
zero for a **STRUCTURAL** reason that no larger word sample can move:

1. every page of that group must pass stage 2 to survive;
2. qualifying facts are **0 of 0** across the entire corpus — and the network's whole
   stock in the four-field shape is **one** hand-written record about New Zealand
   immigration (§2), which belongs to no corridor and to none of these 237,413;
3. the only content project that could have produced them — per-organisation research —
   **was already rejected**, because an organisation's page competes with that
   organisation and loses.

**THAT GROUP HAS NO ROUTE TO A FACT AT ALL.** The word count cannot rescue it, so
measuring the word count cannot change the outcome. A 12.7-hour crawl to answer a
question that decides nothing is the crawl GAP-055 exists to prevent.

**verdict: delete** — and still not yet: Gate A's result **plus 90 days of clicks**, then
**410 Gone**, never 404.

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
words per page.**

### 🔴 GATE A SAYS REJECT. THE RIGHT ANSWER IS THE OWNER'S, AND IT IS A DIFFERENT ANSWER.

> **A FUNCTIONAL PAGE THAT FAILS A CONTENT GATE IS NOT A BAD PAGE. IT IS A PAGE THAT
> SHOULD NEVER HAVE BEEN IN THE SITEMAP.**

`/register/[org]` is a *sign-up* page. It is doing its job. Gate A measured it against a
bar built for pages whose job is to answer a search — a bar it was never meant to face,
and could not clear even if it were perfect at what it does.

**REMOVING FROM THE SITEMAP AND DELETING ARE TWO DIFFERENT FIXES:**

| | what it does | what it costs |
|---|---|---|
| remove from sitemap | stops asking Google to index a page that was never for Google | nothing — the page keeps working for the people who use it |
| delete (410 Gone) | destroys the page | breaks a live function |

**These 610 belong to the first fix.** They are not part of the delete list, they are not
part of the keep list, and they do not need 90 days of clicks — they need to stop being
advertised as search results.

⚠️ **And this is a lesson about the gate, not only about these pages.** Gate A cannot tell
a thin content page from a functional page. Whoever runs it next must classify a group's
PURPOSE before reading its verdict, or a working checkout page will one day be deleted
for having 30 unique words.

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
   because `total = 0`: no page carries a fact record to qualify. That is a statement
   about AlmiOET's data model, and it is falsifiable — attach one four-field record to
   one page and the number moves. (The codebase holds exactly one such record and it is
   attached to no page — §2.)

**So the honest reading is: the gate works, and the stock genuinely does not clear the
bar.** The "hundreds of survivors" estimate assumed there were facts to count. There is
**one** in the whole network, hand-written, attached to nothing. **The 573 pages were the
only candidates that got past the first stage, and what stands between them and KEEP is
not word count — it is that fact-recording has never been anybody's job here.**

⚠️ And the diagnostic run that followed removes even that consolation: all 573 would also
have failed **overlap**, every pair, with no pair close to the bar. See
`CORRIDOR_OVERLAP_DIAGNOSTIC.md`.

---

## 7 · WHAT THIS RUN DOES **NOT** SAY

- It does not delete anything. (Gate A's result + 90 days of clicks first, then 410 Gone.)
- It does not answer whether the 237,413 clear 350 unique words. That question is **open
  and moot** — the group is ruled on facts, not words (§3).
- It does not report any overlap number for any group. Nothing reached that stage.
  A separate **DIAGNOSTIC** run later computed overlap on the 573 already-rejected
  corridor pages — see `CORRIDOR_OVERLAP_DIAGNOSTIC.md`. That is not a gate result and
  changes no page's verdict.
- It does not claim any fact was checked. `factChecked = 0`, hard-coded, with a test.
- It says nothing about almiprep, almipte, the 1,172,926-URL host, or world. Each runs
  its own Gate A in its own turn.
