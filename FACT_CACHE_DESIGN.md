# FACT CACHE — DESIGN REPORT

**Design only. No code, no PR, no table, no provider.** 10 September 2026.

---

## 0 · WHY THIS COMES FIRST — and it is measured, not argued

Gate A run 01 measured 3,414 real pages across four groups. The groups differ in every
way that was supposed to matter — 12 pages against 237,413, a median of 30 unique words
against 2,236 — and **they fail for the same single reason**: nobody has ever recorded a
fact with a source, a tier and a date.

The network's entire stock of four-field facts is **one record** (`org-notes.ts`,
`nz-immigration-nz`), hand-written, attached to no page.

> **UNTIL SOMETHING PRODUCES SOURCED FACTS, ANYTHING THAT PRODUCES PAGES IS POINTLESS.**
> A page generator sitting on an empty fact store rebuilds exactly the estate we are
> deleting — faster, and with better templates.

240,328 URLs exist and not one of them can be defended. That is not a page problem. It is
a **content-infrastructure** problem, and this document is its design.

---

## 1 · WHAT A FACT IS BOUND TO — and it is **not** a page

This is the first decision and it decides everything downstream.

### 🔴 A fact is bound to a **CLAIM**, not to a URL, not to a page, not to a template.

A claim is a **(subject · predicate · qualifier)** triple:

| part | meaning | example |
|---|---|---|
| **subject** | a stable entity id — a regulator, an organisation, a country, a profession | `uk-nmc` |
| **predicate** | what is being asserted about it | `oet-minimum-grade` |
| **qualifier** | the scope that makes the claim precise, or none | `profession=nursing` |
| **value** | the answer, typed | `{listening: "B", reading: "B", writing: "C+", speaking: "B"}` |

**Why not bind to a page — three reasons, each of which has already bitten this network:**

1. **A page is a rendering decision; a fact is not.** We are about to delete 237,413
   pages. Every fact bound to one of them would die with it, and the same fact would be
   re-researched for whatever replaces it. Facts must outlive the page estate that is
   currently being demolished.
2. **One fact serves many pages.** The NMC's OET requirement belongs on `/nursing`, on
   `/nursing/from-india`, and on all 191 nursing corridors. Bound to a page it is
   researched 193 times, dated 193 times, and goes stale in 193 places independently.
   Bound to a claim it is researched **once**.
3. **Freshness is a property of the claim, not the page.** `FACT_FRESHNESS_DAYS = 180`
   cannot be enforced sanely if the same fact has 193 different verified dates.

**What a page gets is a REFERENCE**, resolved at build time:
`page → [claim ids] → facts`. A page's fact count is then a *query*, not a stored number,
and it cannot drift from the truth.

### The full record

```
claim     subject · predicate · qualifier          <- the identity; unique key
value     value · valueType · unit                 <- typed, not free text
source    url · label · tier (1-4) · publisher
evidence  quotedSpan · quoteLocation               <- 🔴 WHAT WAS ACTUALLY SEEN
checks    linkCheckedOn · quoteMatchedOn · factCheckedOn · factCheckedBy
life      firstSeenOn · supersedes · supersededBy · retiredOn · retiredReason
```

🔴 **`quotedSpan` is the field the design turns on, and it is new.** It is the verbatim
text at the source that carries the value. Without it, "verified" is an assertion nobody
can re-check; with it, "does the source still say this?" becomes a **string match a
machine can run every night for the price of one HTTP GET**. `org-notes.ts` already does
this by hand, in a code comment — *"INZ's wording: 'From midnight 12 July 2026…'"*. The
design's only change is to make that comment a field.

**Nothing is ever edited in place.** A changed value writes a NEW record and sets
`supersededBy` on the old one. A fact cache that overwrites cannot answer *"when did this
change, and what did it say before?"* — which is the question a stale page always raises.

---

## 2 · WHERE FACTS COME FROM — four routes, and they are not interchangeable

| route | trust | cost per fact | coverage | example in this network |
|---|---|---|---|---|
| **R1 · official structured source** — an index, API or dataset the authority itself publishes | **highest**, and re-runnable | lowest — one fetch yields thousands | narrow; only what they chose to publish | `organisations.json` — 610 orgs / **1,243** grade rows from OET's own Algolia index, `fetchedAt 2026-06-27` |
| **R2 · official page, read by a HUMAN** | **highest for a specific claim** — this is the only route that today can honestly set `factCheckedOn` | **highest** (UNKNOWN — see §4) | anything, one at a time | `org-notes.ts` — **1** record |
| **R3 · official page, read by a MODEL, quote extracted** | **medium — a LEAD until the quote is machine-matched against the fetched page** | low (§4) | wide, fast | none yet |
| **R4 · third party** — law-firm summary, prep blog, aggregator | **NOT a citation. A LEAD ONLY.** | low | wide | the AlmiMonitor pulse that surfaced the NZ change |

### 🔴 The rule that makes R3 usable, and it is the design's second load-bearing idea

A model may **propose** a fact. It may never **be** the source. The pipeline is:

```
model reads fetched page  →  returns {value, quotedSpan, url}
        ↓
  MACHINE CHECK: is quotedSpan present, verbatim, in the text we fetched from url?
        ↓                                          ↓
       no → DISCARD, log as hallucinated span     yes → record, quoteMatchedOn = today
```

That check costs nothing and it converts *"a model said so"* into *"this exact string is
on this page today"*. It is **still not a fact check** — the string could be quoted out
of context, or contradicted three paragraphs later — but it is enormously more than a
link check, and it is the only part of R3 that can be trusted without a person.

### And R4's rule is already written, in AlmiOET, by hand

> *"Cite an OFFICIAL source — the authority's or organisation's own site. A law firm's
> summary or a prep-industry blog is a lead to verify, never the citation itself."*
> — `src/lib/oet-seo/org-notes.ts`

That header is the best prior art in the network. The NZ record exists **because** a
third-party lead was treated as a lead: the pulse found it, and a person then went to
Immigration New Zealand's own news centre and read it. **The design adopts that header as
law rather than inventing a new one.**

### What R1 already gives us, and what it is missing

`organisations.json`'s 1,243 profession-grade rows are the best raw material that exists.
As records they are **incomplete in three ways**: no per-fact source URL (the collective
`meta.source` names an Algolia index, which is not a citation a reader can open); no tier;
and one collective `fetchedAt` shared by 1,243 facts, so **the freshness window cannot be
applied to any of them individually.**

**They are not facts yet. They are a very good import.** Promoting them is a concrete,
scoped first job — and the honest cost of it is in §4.

---

## 3 · 🔴 WHAT "VERIFIED DATE" MEANS — the honesty correction, closed

The design's §3 correction said a resolvable URL and a supporting URL are two different
things. **The fix is that `verifiedOn` was one field doing three jobs, and it is split
into three dated fields that can never be confused:**

| field | question it answers | who can do it | cost | what it does **not** say |
|---|---|---|---|---|
| `linkCheckedOn` | did the URL return 200, and not a redirect to a home page? | machine | one GET | **nothing at all about the claim** |
| `quoteMatchedOn` | is `quotedSpan` still present, verbatim, at that URL? | machine | one GET | that the quote supports the value, or that it is in context |
| `factCheckedOn` + `factCheckedBy` | did a **person or model read the source and judge that the quote supports this value**? | human (tier 1 confidence) or model (lower) | §4 | that it is still true today — that is what the freshness window is for |

**Only the third deserves the word "verified".** `factCheckedBy` is mandatory when
`factCheckedOn` is set, and it records **which** — `human:<initials>` or `model:<id>` —
because those are not the same evidence and must never average into one number.

**Gate A's `factChecked` counter stays hard-coded 0 until `factCheckedOn` exists on real
records.** The test that asserts it stays. This design does not quietly switch it on.

> **A fact whose URL opened has passed a LINK CHECK.**
> **A fact whose quote still matches has passed a QUOTE CHECK.**
> **Only a fact somebody read and judged has passed a FACT CHECK.**

And this is what makes `FACT_FRESHNESS_DAYS = 180` enforceable instead of decorative:
**re-checking the quote is a nightly machine job**. When a quote stops matching, that
record is flagged and a human looks — which is a tiny queue, not a re-research of
everything.

---

## 4 · WHAT A FACT COSTS

### The one MEASURED number in this section

**AlmiOET's Writing control run, real cost from `AICostLedger`: `$0.0236`.** That is a
production Claude call that read a ~180-word letter plus a six-criterion rubric and
returned structured per-criterion output. It is the only measured LLM cost this network
has, and it is the honest anchor for everything below.

### Everything else here is an ESTIMATE, and RULE EIGHT applies

| item | figure | status |
|---|---|---|
| R3 — one model extraction over one fetched official page (2–8k input tokens, structured output) | **$0.01 – $0.05** | 🟡 **ESTIMATE**, by analogy with the $0.0236 measurement above. Not measured. |
| R3 — facts yielded per source page | **3 – 10** | 🟡 **ESTIMATE**. Unmeasured. |
| R3 — cost per fact | **~$0.005** | 🟡 **ESTIMATE built on two estimates.** Treat as an order of magnitude, nothing finer. |
| R2 — human minutes per fact | **UNKNOWN** | 🔴 **UNKNOWN.** One record exists and nobody timed it. |
| R1 — import of the 1,243 existing grade rows | **UNKNOWN** | 🔴 Depends entirely on whether OET's index exposes a per-organisation URL. **Not yet checked.** |

**What would replace the UNKNOWNs — and it is cheap:** time-box one session, write **ten**
facts by hand at R2, record the clock. Then run R3 over the same ten sources and compare
both the cost and the agreement. That single afternoon converts three estimates into
measurements and is the right first experiment.

### The arithmetic the owner asked for — and its assumption is visible

Gate A requires **5 qualifying facts** per page.

| scenario | pages | fact-slots | **distinct claims needed** | why the two columns differ |
|---|---|---|---|---|
| the target shape | ~200 | 1,000 | **~250 – 400** 🟡 | claim-binding: one regulator fact serves every corridor into that country |
| all 12 professions × 191 origins | 2,292 | 11,460 | **~1,500 – 2,500** 🟡 | ditto, at scale |
| per page, bound to PAGES instead | ~200 | 1,000 | **1,000** | 🔴 no reuse — this is the cost of getting §1 wrong |

🟡 **The distinct-claim column is an ESTIMATE and it is the least trustworthy number in
this document.** It assumes corridor facts are mostly about the **destination** regulator
(a few dozen entities) rather than the **origin** country (191 entities). **Nobody has
checked that.** If corridor value turns out to be genuinely per-origin, the middle column
is the real one and the cost is 4–7× higher.

**So the first deliverable after this design is not code. It is a CLAIM INVENTORY:** for
**one** corridor, list every claim a good page would need to make, and mark each as
destination-scoped or origin-scoped. That is a morning's work and it decides whether this
project costs hundreds of facts or thousands.

At the estimated ~$0.005/fact via R3, even the largest row above is **tens of dollars of
model spend**. **Money is not the constraint. The constraint is that a human must read
and judge**, because §3 says no fact is verified until somebody did.

---

## 4a · 🔴 THE COST THIS DESIGN WAS NOT CARRYING — SOURCES THAT REFUSE A MACHINE

**Measured 10 September 2026**, while building the `nursing/from-india` claim inventory.
The whole freshness mechanism rests on `quoteMatchedOn` being a **cheap nightly machine
re-check**: fetch the URL, string-match the stored `quotedSpan`, flag it if it stopped
matching. That assumption was never tested. It is now.

| source | attempted | result |
|---|---|---|
| `nmc.org.uk` (HTML) | fetch | ✅ fetched and read |
| `gov.uk` | fetch | ✅ fetched and read |
| `nmcn.gov.ng` (Nigeria) | fetch | ✅ fetched and read |
| **`ahpra.gov.au`** | fetch | 🔴 **HTTP 403** |
| **`nursingmidwiferyboard.gov.au`** | fetch | 🔴 **HTTP 403** |
| **`nursingcouncil.org.nz`** | fetch | 🔴 **HTTP 403** |
| **`prc.gov.ph`** (Philippines) | fetch | 🔴 **HTTP 403** |
| `nmc.org.uk` accepted-countries **PDF** | fetch + parse | 🔴 compressed stream, **not parsed** |

**Four of eight regulator sources cannot be read by a machine at all, and a fifth is a PDF
our parser could not open.** These are not obscure sources — they are AHPRA and the Nursing
Council of New Zealand, two of the four destination regulators that matter most.

### What this changes — and what it does NOT change

**It does not change the design.** `quotedSpan`, the three dated check fields, and the
tier vocabulary are all still right, and for `nmc.org.uk`, `gov.uk` and `nmcn.gov.ng` the
nightly re-check works exactly as designed.

**It changes the COST MODEL, and the design must carry it:**

| class | how a fact is re-verified | who pays |
|---|---|---|
| **machine-readable source** | nightly fetch + string match on `quotedSpan` | a cron job, effectively free |
| 🔴 **machine-refused source** | **a person opens the page and looks** | **human minutes, every 180 days, per fact** |

**So a fact record must carry which class its source is in.** A new field —
`sourceMachineReadable: true \| false \| "unknown"` — set from the last fetch attempt, not
from a guess. Without it, the freshness queue silently mixes free work with expensive work
and nobody can plan either.

⚠️ **AND THE DANGEROUS FAILURE IS THE QUIET ONE.** A 403 must never be recorded as "the
quote no longer matches", and must never be recorded as a successful check. It is a
**third outcome — could not check** — and it needs its own state, or a blocked source
will drift into looking either broken or verified, and both are lies.

**What is deliberately NOT proposed:** no scraping workaround, no user-agent spoofing, no
third-party proxy. A regulator that declines automated access has declined it. **The
answer is to record the cost, not to route around the refusal** — and a tier-4 aggregator
that *is* fetchable is still a lead, never a citation.

## 5 · 🔴 NO DATABASE TABLE — AND WHERE FACTS LIVE INSTEAD

**No table is designed here and none will be created without stopping first.**

### Facts live in the REPOSITORY, as files, until a table earns itself

The precedent is `org-notes.ts` and it works: version-controlled, diffable, reviewable in
a PR, impossible to corrupt silently, and it costs nothing to run. One file per subject,
records as data.

**And this is a test, not a compromise.** If facts cannot be maintained as reviewed files
at the scale of a few hundred, a table will not rescue them — it will only make the
disorder invisible. **A table earns itself when a machine writes facts faster than a
person reviews them** (nightly quote re-checks, GSC pulls, crawl results), which is not
today.

### When that day comes, I STOP — and the fix has TWO HALVES

**The trigger is already written** (`ARCHITECTURE_AND_GAP_REPORT.md` §2b): the Neon
branch is created **before** the migration that creates the first table whose loss would
cost something. The fact cache **is** that table. So when a fact-cache migration is
written, I stop and say *"now is the time for the branch"* — before it is committed, not
after, and not in the same PR as an afterthought.

| | |
|---|---|
| **(a)** | a **preview branch in Neon** |
| **(b)** | in **Vercel**, move `DATABASE_*` off "All Environments" and give **Preview** its own set, pointing at that branch |

🔴 **(a) without (b) changes nothing and will look solved.** The branch exists, it has a
name, it shows in the console — and every preview deployment keeps writing to production,
because that is still what its environment variables say. **The proof of the fix is the
measurement repeated, not the existence of a branch:** ask each environment
`select current_database()` and compare hosts. Different answers, or it is not fixed.

Until then the **WRITE LAW** is the whole of the protection.

---

## 6 · THE ACCEPTANCE TEST — how we will know this design is right

Before any generator, any table, any provider:

1. Pick **one** corridor — `nursing/from-india` — and write its claim inventory.
2. Record **5 facts** by hand at R2, with quotes, tiers and `factCheckedBy: human`.
3. Re-run **Gate A** on that one page.

**PASS** = it clears uniqueWords, clears facts, and its overlap against its 190 siblings
drops below 0.40. **That last one is the real test**, and today it is the hardest: the
diagnostic measured a *minimum* within-profession overlap of **0.6204**. Five facts will
not move a page from 0.62 to below 0.40 on their own — so this test will also tell us
**how much genuinely per-corridor content a page needs**, which is a number nobody has.

**FAIL is informative and must not be argued away:** if a hand-built, honestly-sourced,
five-fact page still cannot clear Gate A, then either the gate's thresholds came from the
wrong place, or corridors are not where the best answer lives — and that is a finding
worth far more than a generator.

---

## 7 · WHAT THIS DOCUMENT DOES NOT DO

- No code, no PR, no schema, no migration, no table, no provider, no paid activation.
- It does not turn on `factChecked`. That counter stays 0, with its test.
- It does not commit to the claim-count estimates in §4. They are marked, and the claim
  inventory replaces them.
- It does not create or delete a page, and it does not touch another product.
