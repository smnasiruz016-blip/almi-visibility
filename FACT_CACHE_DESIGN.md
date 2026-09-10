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

## 4b · 🔴 TWO QUEUES — THE OWNER'S RULING, AND THE CONTRACT IS NOT TOUCHED

**A1 measured 2 of 8 origin regulators as machine-readable and I proposed a scope change.
THE OWNER REFUSED IT, AND THE REFUSAL IS CORRECT:**

> `§5A.1` says *"without requiring manual hand-writing of **EVERY** record."*
> **A hybrid satisfies that text.** Some records are acquired automatically, therefore **not
> every record is hand-written.** The frozen contract needs no amendment — **and must not get
> one. Being frozen is the entire point of it.**

I had read `§5A.1` as *"no record is hand-written"*. It does not say that. **Recorded so the
mistake is not repeated: do not amend a frozen contract to fit a measurement until the
contract's own words have been read against that measurement.**

### The build, unchanged from what the measurement suggested

| | AUTOMATED queue | MANUAL queue |
|---|---|---|
| entered when | `sourceMachineReadable: true` | `false` |
| acquisition | fetch + model proposal + machine quote-match | a person reads the source |
| re-verification at 180 days | nightly `quoteMatchedOn` string match | a person opens the page and looks |
| cost | a cron job | **human minutes, twice a year, per fact** |

**`sourceMachineReadable` is a FIELD, set from the last fetch attempt, never guessed.** And
"could not check" remains a **third outcome** — never a failed match, never a successful check.

### 🔴 DOD-03A's PASS CONDITION IS UNCHANGED AND STAYS HARD

> **The AUTOMATED queue must genuinely run unattended.**

Not "mostly". Not "with a nudge". If the automated queue needs a person, it is not automated
and DOD-03A does not pass. **Nothing here becomes unfalsifiable, and the manual queue is not a
place to hide work that failed to automate.**

### AND THE MANUAL QUEUE'S COST IS DECLARED — this is an ANNOUNCEMENT, not a pass condition

Counted in `TARGET_SHAPE_FACT_COUNT.md` against the real target shape — **12 profession pages
plus tables**, not 2,292 corridor pages:

| | |
|---|---|
| distinct fact **records** | ~1,300 |
| distinct **acquisitions** | **~58** |
| manual acquisitions | **~25** 🟡 |
| **human passes per year** (2 per fact at 180 days) | **~50** |
| **per week** | **≈ 1** |

**A1's 75%-manual does NOT carry over.** A1 measured *origin regulators*; the target shape
barely uses them — the origin table is **eight list facts filling 191 rows**, and the
organisation table is **1,243 records from ONE automated import**. The manual share here is
**~43%**, and about one verification a week.

⚠️ **This is a DECLARATION so the owner can accept or reject it — it is not a new gate.** And
its 🟡 marks are real: the profession-page block is a floor I chose rather than counted, and
NMBI, NNAS and OET's own profession materials have never been fetched. **One profession-page
claim inventory replaces every 🟡 in that document.**

## 4c · 🔴 `sourceQuotable` — A SOURCE A MACHINE MAY READ AND MAY NOT QUOTE

**Found 10 September 2026 by the profession-page claim inventory, and it is a third failure
mode for the freshness mechanism — one this design had no field for.**

§4a's barriers were all technical: a 403, a scanned PDF, an HTTP 500, a broken TLS chain.
**OET's own site is none of those. It serves 200 to an automated fetch.** The barrier is its
licence:

> *"Any redistribution or reproduction of part or all of the Content in any form is
> prohibited"* … *"store the Content in any other website or **other form of electronic
> retrieval system**"* — OET Intellectual Property policy

**A fact cache storing `quotedSpan` IS an electronic retrieval system holding a reproduction of
their wording.**

| | OET |
|---|---|
| can a machine FETCH it? | ✅ **yes** |
| may we STORE its wording as `quotedSpan`? | 🔴 **no** |
| may the nightly quote-match run? | 🔴 **no — there is nothing lawful to match against** |

### The field, and the rule that comes with it

**`sourceQuotable: true | false`**, beside `sourceMachineReadable`, and **set from the source's
licence terms — never from whether a fetch succeeded.** The two are independent, and OET is the
proof: machine-readable **and** un-quotable.

When `sourceQuotable` is false:

- store **a URL, a date, and the fact stated IN OUR OWN WORDS** — never their sentence;
- mark the record so **nothing attempts a quote-match on it**, because a permanent "could not
  check" would look like a broken source rather than a lawful one;
- **freshness is a human re-read**, at the same cost as a 403. It joins the MANUAL queue.

⚠️ **AND THIS IS A LIMIT ON THE PRODUCT, NOT ONLY ON THE CACHE.** AlmiOET's own record already
flags that `docs/sources/oet-…pdf` is committed to git and that `exam-shape.ts` holds short
quoted sentences — raised on 1 September and still unresolved. **This design does not expand
that practice**, and no OET file is committed by it.

**No workaround is proposed.** The answer to a licence is the same as the answer to a 403:
**record the cost, do not route around it.**

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

---

# 8 · 🔴 THE REGISTRY AS BUILT — §5A, and it is FULL

> ## ⚠️ §8 IS SUPERSEDED IN PART BY §9. READ BOTH, AND §9 WINS.
>
> The owner read six licences first-hand on 11 September 2026 and **three findings invalidated
> the record shape below.** §8 is kept unedited because it is the reasoning that produced the
> registry, and because deleting a superseded conclusion hides that it was ever held — but a
> record written to §8's shape is **rejected by the validator today.**
>
> | §8 said | §9 says |
> |---|---|
> | `sourceQuotable` is a per-DOMAIN boolean | 🔴 per DOCUMENT CLASS — the NMC grants for guidance what it refuses for news |
> | NMBI, NMCN, PNMC are `"unknown"`, ruling open | 🔴 **`false`. The owner ruled. Silence is not uncertainty** |
> | queues 16 AUTOMATED / 16 MANUAL | **32 / 0** — fingerprinting watches what it may not quote |
> | `sourceQuotable` is the whole answer | §10: **PERMITTED · RESERVED · PROHIBITED · UNREAD**, never merged |
> | Immigration NZ is `unknown-not-read` | §10: **PERMITTED — CC BY 3.0 NZ**, read first-hand |
> | OET prohibited on one ground | **three**, and the non-commercial limit is decisive |


**10 September 2026.** Everything above this line was design. This section is what exists, what
it measured, and the three things it got wrong on the way.

> **§5A.1: *"A registry schema with zero usable supply is NOT PASS."***
> **32 records. 8 sources. Every one tier 1. Not one of them is a blog.**

`npm run facts` · `npm run facts:validate` · `npm run quote-match`

---

## 8.1 · WHERE THEY LIVE — files, and the ruling in §5 is unchanged

**`facts/*.mjs`. One file per subject. No table, no migration, no provider, no Neon branch needed
and none created.** The trigger in §5 has not fired: nothing writes facts faster than a person
reviews them, because **`bin/quote-match.mjs` deliberately does not edit a fact file.** The
machine proposes an outcome, a person merges it, the file records it. The day that stops being
fast enough is the day a table starts earning itself — and on that day the branch comes first, in
both halves.

## 8.2 · THE RECORD — every field §5A named, and where it went

| §5A asked for | where it lives | note |
|---|---|---|
| fact ID | `id`, **derived** from the claim | F1 rejects an id that disagrees with its claim |
| subject / entity | `claim.subject` | |
| claim / value | `claim.predicate` · `value.value` | |
| unit | `value.unit` | F2 rejects money, duration or count without one |
| locale / scope | `scope` · `locale` | |
| source URL / document reference | `source.url` · `source.documentRef` | one or the other is mandatory |
| source tier / authority | `source.tier` · `source.publisher` | **tier 4 may only be `status: "lead"`** |
| extraction date | `life.extractedOn` | |
| **verified date** | 🔴 **split into three** | see 8.3 |
| freshness / expiry rule | `freshness.rule` · `.days` | **derived from the queue, never chosen** |
| status | `life.status` | active · candidate · lead · conflict · retired |
| provenance | `provenance.route` · `.acquiredBy` | R1–R4 |

**Plus the two things that sit above that list**, and they are why the registry works:

- **the claim triple** — a fact binds to **(subject · predicate · qualifier)** and **never to a
  page**. 237,413 pages are being deleted; one NMC fact serves 193 of them; freshness is a
  property of the claim. F15 enforces one active record per claim, so a fact is researched once.
- **`quotedSpan`** — the field the design turns on, and the one the nightly job runs on.

## 8.3 · THE THREE DATES, MEASURED OVER THE REAL 32

| | | count |
|---|---|---|
| `linkCheckedOn` | machine · the URL opened. **SAYS NOTHING ABOUT THE CLAIM** | **31 / 32** |
| `quoteMatchedOn` | machine · the span is still verbatim at that URL | **16 / 32** |
| | *not-applicable* — lawfully not attempted | **16** |
| | *could-not-check* — a third outcome | **1** |
| 🔴 `factCheckedOn` + `factCheckedBy` | **a named person or model read it and judged** | **0 / 32** |

### 🔴 AND THE COUNTER DOES NOT MOVE

§3 promised `factChecked` stays hard-coded 0 until `factCheckedOn` exists on real records, with
its test. **Real records now exist and the counter is still 0**, because what §3 requires was
never "records" — it is somebody having read the source and judged that the quote supports the
value. `REGISTRY_FACT_CHECK_COUNT = 0` in `src/facts/registry.mjs`, four tests hold it there, and
the day it changes it will be a deliberate edit, not a field a script filled in.

**The NZ record came closest and still did not qualify.** Its note says a person read Immigration
New Zealand's own page on 2026-07-15 — but **that person is not named**, and `factCheckedBy` is
mandatory. "Somebody, months ago" cannot be weighed against `model:claude-opus-5`, so the count
stays at zero rather than admitting one record on a recollection. **Whoever did the reading can
claim it in one line and it becomes the registry's first real fact check.**

## 8.4 · 🔴 `sourceQuotable` HAS A THIRD VALUE — AND ONE RULING IS THE OWNER'S

§4c gave the field two values because OET needed two. **Filling the registry needed a third**, and
the reason is measurable: of eight sources, exactly one expressly prohibits, two expressly permit,
and **five say nothing either way**.

| value | meaning | sources |
|---|---|---|
| `true` | the licence **expressly permits** | gov.uk (**OGL v3.0**, stated on the page) · nmc.org.uk (express permission to quote its standards and guidance) |
| `false` | the licence **expressly prohibits** | **oet.com** — the IP policy, unchanged and still binding |
| `"unknown"` | **no express term either way was located** | nmcn.gov.ng · pnmc.gov.pk (both a bare "All Rights Reserved") · nmbi.ie (terms page sought, **HTTP 404**) · immigration.govt.nz (never read) |

**Forced to choose true or false, every bare copyright notice would have to be GUESSED at — and a
guess written into a field is indistinguishable, six months later, from a licence somebody read.**
`sourceQuotableBasis` is mandatory in all three cases, so the reason is always legible.

**And "unknown" is deliberately the EXPENSIVE answer** — it routes to the MANUAL queue exactly as a
403 does. Nobody can reach for it to make work cheaper, which is the only real defence against it
becoming a hiding place.

### ⚠️ THE RULING THE OWNER OWNS, WITH ITS NUMBER ATTACHED

**Treating "no express permission" as un-quotable is a LEGAL-RISK choice, not a technical one, and
it is not mine to make.** The conservative reading is what is implemented. Its measured cost:

| | |
|---|---|
| records in the MANUAL queue **only** because a licence was not read | **14 of 16** |
| what closes it | **reading four licence pages** — NMCN, PNMC, NMBI, Immigration NZ |
| if they expressly permit | those 14 move to AUTOMATED. **Manual queue 16 → 2. Human passes/year 32 → 4** |
| if the owner rules a bare copyright notice does not bar a short stored extract | the same movement, without the reading |
| if they expressly prohibit | nothing moves — and we will know rather than assume |

🔴 ~~**This is the single highest-leverage open question in DOD-03A. Four pages of reading moves
87% of the expensive queue.**~~

> ### ✅ ANSWERED 11 SEPTEMBER 2026 — AND THE ANSWER WAS "NO"
>
> The owner read all four licences first-hand. **NMBI, NMCN and PNMC grant nothing at all** — a
> bare copyright notice and no reuse terms. So those 14 records did **NOT** move to quotable, and
> the prediction above was wrong in its optimism: **the absence of a licence is not permission,
> and "all rights reserved" is what silence means.**
>
> ### 🔴 AND THIS CORRECTION WAS ITSELF INCOMPLETE — SEE §10.1
>
> It says "the answer was NO", which is true of three sources and **WRONG ABOUT THE FOURTH.**
> **Immigration New Zealand DOES permit reuse — CC BY 3.0 NZ** — and had simply not been read when
> this note was written. **One of four permits; three reserve.** Left in place, struck through,
> because a correction that deletes what it corrects hides that the mistake was possible.
>
> What rescued them was not a permission but a different check — see **§9.6 and §9.7**.

## 8.5 · THE TWO QUEUES — MEASURED, and the pass condition RUN rather than claimed

| | AUTOMATED | MANUAL |
|---|---|---|
| records | **16** | **16** |
| entered when | machine-readable **AND** quotable | either is false or unknown |
| re-verification | `bin/quote-match.mjs`, nightly | 🔴 a person opens the page and looks |

**The queue is DERIVED, and a record that disagrees with its derivation is REJECTED (F11).** That
is the whole defence against §4b's named failure — the manual queue becoming somewhere to hide
work that failed to automate. Moving a fact into the expensive queue now requires stating a false
fact about a source, in a mandatory field a reviewer reads. **Both directions are red: a record
hidden in MANUAL is rejected exactly as loudly as one over-claimed as AUTOMATED.**

### 🔴 DOD-03A's PASS CONDITION — RUN, ON THE REAL REGISTRY, AGAINST THE LIVE WEB

> **`✅ YES` — measured over its 16 records; 0 need a person.**

`bin/quote-match.mjs` fetched **5 distinct URLs**, matched **16 spans verbatim**, and exited 0. It
takes no input, asks nothing, and needs no flag to do its work. **This is not a design claim. It
is a run.**

### THE MANUAL QUEUE'S COST — declared, and one number is NOT invented

| | |
|---|---|
| facts | **16** |
| human passes per year (2 per fact at 180 days) | **32** |
| per week | **0.62** |
| minutes per pass | 🔴 **UNKNOWN** |

🔴 **`minutesPerFact` HAS NO DEFAULT AND NEVER GETS ONE.** §4 records it as UNKNOWN — "one record
exists and nobody timed it" — and a plausible default would convert that honest UNKNOWN into a
number that gets quoted, planned against, and eventually believed. The CLI takes it as an explicit
input and prints UNKNOWN otherwise. **One afternoon closes it: time ten R2 acquisitions by hand.**

⚠️ **0.62/week is NOT the ~2.5/week of `PROFESSION_PAGE_CLAIM_INVENTORY.md`, and the two do not
conflict.** That figure projects **~150 acquisitions** across all twelve profession pages. This one
counts **the 32 records that exist**. The gap between them is the work not yet done, and §8.7
counts it.

## 8.6 · 🔴 THREE THINGS THIS GOT WRONG, EACH CAUGHT BY A MACHINE

**1 · A MODEL COUNTED, AND IT WAS WRONG.** Asked to summarise the Code of Practice, a model
reported **62** red list countries. Our own reading the same day said **54**. It was settled by
asking for the **LIST** instead of the count and counting it with `tr | wc -l`: **54 entries, no
duplicates.** The extraction was right and the arithmetic was wrong — which is exactly the line §2
draws when it says a model may PROPOSE a fact and may never BE the source. **The conflict is kept
on the record after being resolved**, because the obvious way to ask still produces 62.

**2 · SIX SPANS I WROTE WERE PARAPHRASES, AND THE FIRST REAL RUN WENT RED ON ALL SIX.** I recorded
`"should not be targeted for recruitment"` from a model's summary. The page says **"Countries on
the red list must not be targeted for international recruitment"**. The matcher refused all six
records. **The check earned its keep before the registry was even committed.**

**3 · 🔴 A PASSING CHECK THAT PROVED ALMOST NOTHING.** The span `"on their own behalf"` matched —
because those four words also sit in the page's glossary. It would have gone on matching after the
rule it evidenced was deleted. So the job now counts **occurrences**, and a span found more than
once is reported as a **weak pass**: not a failure, nothing has been shown to have changed, but it
is the exact shape of a check that has quietly lost the ability to go red.

⚠️ **And the obvious fix was measured and REJECTED.** A minimum span length looks like the answer
and is not: of 17 spans, the one other weak pass is **190 characters long**
(`uk-nmc.qualified-in-english-evidence`, which the NMC states twice). **Length does not predict
anchoring — n=17, measured.** So no length rule was added; ambiguity is measured at match time,
where it is real.

### And one limitation that has no fix here, only a name

**A QUOTE MATCH CANNOT PROVE AN ABSENCE, AND IT CANNOT PROVE AN AGGREGATE.**

- `country=india` and `country=philippines` say a country is **not on the red list**. An absence is
  not a string. The span proves the red-list mechanism still exists; **it does not prove India
  stayed off it.**
- `red-list-country-count = 54` — **no sentence on that page contains "54"**. Its span proves only
  where the list ends. A count must be **re-derived**, which is a different job from matching a
  string, and the nightly matcher does not do it.

**Three records therefore carry a `quoteMatchProves` field stating what their green actually
buys.** They are protected LESS than the others and the record says so — because a page that keeps
telling an Indian nurse she is green-listed for a year after she stopped being is the exact failure
this registry exists to prevent.

## 8.7 · 🔴 WHAT IS MISSING IS COUNTED TOO — 9 DECLARED GAPS

A store of facts cannot report what it lacks; absence leaves no row. **And the alternative to
declaring a gap is inventing a plausible value to fill it** — which a model could do for every one
of these, in a sentence that would look exactly like a real record.

| gap | blocked by |
|---|---|
| 4 × OET Block A claims (nursing writing task, speaking role-play, subtests, grade bands) | 🔴 **LICENCE** — acquirable, but only in our own words, by a person |
| Ahpra/NMBA · NCNZ (~10 claims) | 🔴 **HTTP 403** — recorded, never routed around |
| Canada (~5 **per province**) | 🔴 **STRUCTURAL** — NNAS is not a language regulator. A FRAGMENTED destination |
| India · verification issuing body | 🔴 **STRUCTURAL** — ~30 State Nursing Councils. A **BRANCH**, not a fact |
| Philippines PRC | 🔴 **HTTP 403** |

## 8.8 · WHAT THIS SECTION DID NOT DO

- **No table, no migration, no provider, no Neon branch, no production write.** No page created or
  deleted. No other product changed — `almi-oet` was **read** for `org-notes.ts`, which the SCOPE
  LAW permits.
- **It did not turn on `factChecked`.** 0/32, with four tests holding it there.
- **It did not route around a single refusal.** No user-agent spoofing, no proxy, no third-party
  mirror, and no paraphrase that is really a quote. Four 403s and one licence are recorded as costs.
- **It did not invent `minutesPerFact`**, and it did not quietly widen `sourceQuotable`'s meaning
  to make the automated queue look bigger.

---

# 9 · 🔴 THE LICENCE CENSUS — AND IT CHANGED THE RECORD'S SHAPE

**The owner read six licences first-hand in a browser** — not through a fetch tool, per the
project's own rule that a summarising fetch may not be a source-of-truth citation. Full
clause-by-clause record: `_handoffs/SOURCE_QUOTABILITY.md`.

**Three of the findings invalidated the shape §8 shipped.** They are not refinements; a record
written under §8 is wrong under §9.

---

## 9.1 · 🔴 `sourceQuotable` COULD NOT BE A PER-DOMAIN BOOLEAN

**The NMC proves it. ONE DOMAIN, TWO ANSWERS, decided by WHICH DOCUMENT you are standing on.**

| NMC content | quotable? | clause |
|---|---|---|
| **rules, standards and guidance** | ✅ **YES — "in part or in full"** | **6.3** |
| everything else on the same site | 🔴 **NO** — storage "on any server or other storage device connected to the network" is expressly excluded | **6.2** |

**This registry is a git repository deployed to Vercel. That is precisely a networked server.**
So the identical fact is quotable taken from NMC *guidance* and NOT quotable taken from an NMC
*news item* — and §8's per-domain boolean could not express it.

### What was added

- **`sourceDocumentClass`** — `rules · standards · guidance · news · general`. Mandatory on every
  record, even where a source answers the same for all five, because the field is what makes the
  question askable at all.
- **`licence`** — `OGL-v3.0 · NMC-6.3 · proprietary-no-reuse · OET-CBLA-IP ·
  unknown-licence-unreachable · unknown-not-read`. Named, so a later reader can re-argue the
  reasoning against the clause instead of against a boolean.
- 🔴 **`sourceQuotable` is now DERIVED** by `quotableUnder(licence, documentClass)`, and **F18
  rejects any record that disagrees with the derivation.** Same defence as the queue: a licence
  judgement typed by hand cannot be re-checked, and six months later it is indistinguishable
  from a licence somebody actually read.

⚠️ **One judgement is still ours and it is recorded, not buried:** clause 6.3 names "rules,
standards and guidance", and the NMC registration pages are classified by us **as guidance**. The
owner can overturn that, and the four NMC records then lose their quotes, keep their facts in our
own words, and drop to fingerprint watching.

## 9.2 · `attributionStatement` — THE CREDIT IS PART OF THE PERMISSION

Both permissive licences require a credit, and **each requires a DIFFERENT one**.

| licence | what must be attached |
|---|---|
| **OGL v3.0** | *"Contains public sector information licensed under the Open Government Licence v3.0."* plus a link to the licence |
| **NMC 6.3** | credit **NMC as author**, plus a link to the NMC website |

> 🔴 **A record carrying the quote but not the credit is a licence breach THAT LOOKS EXACTLY LIKE
> COMPLIANCE.** The quote is there, the source is there, the date is there — and the permission
> has been exceeded.

**F20** requires the statement and checks it contains what *that* licence asks for. An OGL credit
on an NMC record is not attribution; it is noise, and it is rejected.

## 9.3 · 🔴 FOR THE NMC, STALENESS IS A LICENCE BREACH — NOT A DATA-QUALITY PROBLEM

Clause 6.3's **first** condition: *"ensure that you are using the most up-to-date version of any
source document."*

**That is a CONDITION OF THE PERMISSION.** An expired NMC quote is not a stale fact — **it is
their content reproduced outside the terms that allowed it.** The whole freshness model was
designed as hygiene, and for this source that framing is simply wrong.

So expiry here cannot be advisory, and it cannot be a flag on a report somebody reads on Tuesday:

- **`quoteUsableNow(record, now)`** returns `usable: false, legal: true` once the window lapses,
  with a reason worded so it can never be reported as a freshness nag: **WITHDRAWN, not stale.**
- **`renderableQuote()`** returns `null`, and **anything putting a quote in front of a reader must
  come through it** — reading `evidence.quotedSpan` directly is exactly how an out-of-licence
  reproduction reaches a page, because the field is still populated and the string says nothing.
- **F21** forbids watching an NMC record by fingerprint: only the quote match can *demonstrate*
  currency. A fingerprint proves the page did not move, which is a different claim.

### And the mechanism was already built — it just had the wrong job

The nightly quote match confirms the stored span is still verbatim on the live document. Under a
hygiene model that is a staleness check. **Under NMC-6.3 it IS the compliance mechanism**: a span
that still matches the live page IS the most up-to-date version, demonstrated rather than assumed.
A passing match **renews the permission**.

⚠️ **And I had one detail wrong, caught by its own test: EXTRACTION IS ALSO A DEMONSTRATION.** The
span was taken off the live page the day it was extracted, which is what the clause asks for. So
the clock runs from whichever demonstration is later, and `quoteUsableNow` **reports which** —
"confirmed by a machine last week" and "typed in by somebody last week" are not equal evidence and
must not read the same. A **failing** match is not a demonstration and renews nothing.

## 9.4 · GOV.UK — QUOTABLE, COMMERCIALLY, WITH A PER-PAGE CHECK

The OGL grants a worldwide, royalty-free, perpetual, non-exclusive licence to copy, publish,
distribute, transmit, adapt **and exploit the Information COMMERCIALLY**.

🔴 **The commercial permission is the load-bearing part. AlmiWorld is a commercial product** — it
is what makes gov.uk usable to us and, in §9.5, what puts OET's carve-outs out of reach.

**But GOV.UK's own word is "MOST".** Where content is not Crown copyright, *"we'll usually credit
the author or copyright holder"* — and the OGL itself excludes personal data, departmental logos,
crests, the Royal Arms and third-party rights.

> **So a page is not quotable because it is on gov.uk. It is quotable because THIS PAGE carries no
> third-party credit — a per-page fact that can change when a page is edited.**

**F22** requires a recorded per-page check before an OGL page's text may be stored, and
`scanForThirdPartyRights()` runs it in the nightly job. **Measured on both our gov.uk pages: the
OGL statement present, and ZERO non-Crown copyright notices.** The scanner **reports what it found
rather than deciding** — it cannot tell a cookie-banner "© 2026 Cookie Information" from a claim
over the page's text, so it hands a person the notices and the judgement.

**This covers our two largest list-facts** — the red/amber/green list and the UKVI eighteen.

## 9.5 · OET — OUR OWN RECORD WAS UNDERSTATING IT

§8 cited one clause. **There are three, and the third was the weakest of them.**

| prohibited without CBLA's prior express written permission | |
|---|---|
| *"transmit or reproduce **any part** of the Content"* | 🔴 broader than storage |
| *"distribute or **commercially exploit** the Content"* | 🔴 |
| *"store the Content in any other website or other form of electronic retrieval system"* | the one §8 had |

**And every permitted use is expressly for *"your own personal and NON-COMMERCIAL use only"*.
AlmiWorld is commercial, so the carve-outs never reach us** — we are outside the permission before
the retrieval-system clause is even argued.

### 🔴 AND THE SENTENCE THE WHOLE REGISTRY STANDS ON

> **A FACT IS NOT COPYRIGHTABLE. ITS EXPRESSION IS.**
> *"OET is scored 0–500"* is a fact. **We may state it in our own words, with a citation.**
> **The prohibition is on their WORDING, not on the TRUTH.**

That is exactly what `sourceQuotable: false` already required — a URL, a date, and the fact in our
own words — so the registry survives its most important source being un-quotable. **It also
confirms the project's standing OET rule was right all along: never copy an OET sentence, never
commit an OET file.**

## 9.6 · 🔴 SILENCE IS `false`, AND ONLY AN UNREAD LICENCE IS `unknown`

**§8 recorded NMBI, NMCN and PNMC as `"unknown"` and left the ruling open for the owner. THE
OWNER HAS RULED, AND THE ANSWER IS `false`.** All three carry a bare copyright notice and no
grant of reuse.

> **THE ABSENCE OF A LICENCE IS NOT PERMISSION.**
> **"ALL RIGHTS RESERVED" IS WHAT SILENCE MEANS.**

**F19 now rejects `"unknown"` under any licence we have read.** `"unknown"` survives in exactly two
states — `unknown-not-read` and `unknown-licence-unreachable` — and both behave as prohibitions.
Four of the sources still to assess return **403**, and **a licence cannot be read from a page that
will not open**, so they will be `unreachable` and **never "permitted"**.

### The census — a CENSUS, not a sample

These are not eight of the world's regulators; they are the sources this registry actually holds,
so for our purposes it is the whole population.

| | | |
|---|---|---|
| **GOV.UK** | ✅ quotable, commercially, with attribution | OGL v3.0 |
| **NMC** | 🟡 **SPLIT** — guidance yes, the rest no | 6.3 / 6.2 |
| **OET** | ❌ no, on three grounds | non-commercial carve-outs only |
| **NMBI · PNMC · NMCN** | ❌ no | bare copyright, no grant |

**One of six fully quotable. One partial. FOUR prohibited.**

## 9.7 · 🔴 THE WAY OUT — STORE A FINGERPRINT, NOT THE TEXT

The compounding problem, stated plainly: `quoteMatchedOn` needs a stored span, and **most of our
sources may never have one**. Two independent filters, and they are **not the same filter**:

| filter | asks | result |
|---|---|---|
| A1 — machine-readable? | can a machine FETCH it? | 2 of 8 |
| §9 — quotable? | may we STORE its words? | 1 of 6 fully |

> **We do not need to store their words to detect that their words CHANGED.**
> **Fetch the page, hash it, store ONLY THE HASH.**

A cryptographic hash is a one-way digest: the original cannot be recovered from it, it cannot
substitute for the work, and **it is not a copy**. It converts a **calendar** obligation into an
**event** one — *re-verify when the source moves, not when 180 days pass* — which is GATE C's
"regenerate on change, not on a timer" arriving at the fact layer from the other direction.

### 🔴 AND IT WAS MEASURED BEFORE IT WAS BUILT, BECAUSE IT NEARLY DID NOT WORK

A fingerprint that changes on its own is worthless: a timestamp, a rotating banner or a build id
would trip it every night, produce a permanent queue of false flags, and get switched off inside a
week. So each of the registry's 9 distinct source URLs was fetched **twice in succession**:

| | |
|---|---|
| **raw HTML** hash stable across two fetches | 🔴 **3 of 9** |
| **normalised text** hash stable | ✅ **9 of 9** |

**Six of nine pages differ between two consecutive fetches at the byte level.** Hashing the raw
response would have looked correct in review and failed in production on two thirds of the
registry. **The idea works only because of the normalisation**, and it hashes
`normaliseText(body)` using the quote match's own normaliser so the two can never drift.

⚠️ n=9, two fetches, one moment. It shows these pages are not *trivially* unstable. It does **not**
establish stability over days, and a page that turns out to churn must be **recorded as churning**
rather than have its threshold loosened until it goes quiet.

### What this does to the queues

| | §8 | §9 |
|---|---|---|
| AUTOMATED | 16 | **32** |
| MANUAL | 16 | **0** |

**And that is not a 16-record improvement in honesty — it is a change of question.** The queue now
turns on ONE thing: can a machine reach the page unattended. Quotability no longer decides the
queue; **it decides WHICH CHECK RUNS, and how much that check's green is worth:**

| check | records | evidence |
|---|---|---|
| `machine-quote-match` | **16** | **STRONG** — the exact wording carrying the value is still there |
| `machine-fingerprint` | **16** | **WEAK** — only that the page did not move. Stores no words |

🔴 **The two are never summed.** A single "pass" column would let the registry's evidence weaken
while its score went up, which is the failure this project keeps finding in other people's gates.

### ⚠️ AND THE COST MOVED RATHER THAN DISAPPEARED

Sixteen records left the manual queue. **The human work attached to them did not leave with them**
— when a hash goes red a person must still open the page, because a hash cannot say what moved. It
changed TRIGGER, **at an unmeasured frequency**. A regulator editing monthly costs MORE than the
twice-a-year calendar it replaced.

**So the calendar is KEPT as a backstop and the fingerprint ADDED as an early trigger** —
re-read on change **or** at 180 days, whichever comes first. Strictly better than either alone, and
it claims no saving nobody has measured. Both bounds are printed and **neither is called the
answer**:

| | |
|---|---|
| human passes/year, FLOOR (a clean fingerprint renews freshness) | **0** |
| human passes/year, CEILING (calendar backstop retained) | **32** |

🔴 **The MANUAL queue is now EMPTY, so its cost block is a VACUOUS ZERO and the CLI says so.**
An empty population is a finding, never a pass.

⚠️ **NEITHER THE OWNER NOR I IS A LAWYER**, and this is the one mechanism here that *reasons* about
a licence rather than obeying one. The reasoning is standard; where money meets a licensor's
rights, ~~**the owner may want it confirmed by somebody qualified before it ships.**~~
✅ **WITHDRAWN — see §11.2.** The owner ruled that no legal review is needed: hashing a public page
to see whether it changed is what every monitoring tool does. **The flag was mine, and it
manufactured a blocker out of an ordinary operation.**

## 9.8 · 🔴 THE TRAP — A CITATION CAN CHANGE OWNER WITHOUT ANYONE TOUCHING THE RECORD

The owner reached **`nmcnigeria.org`** by guessing it — the domain a reasonable person guesses for
the Nigerian regulator. **The real regulator is `nmcn.gov.ng`.**

**Verified, and it is worse than a redirect:**

```
nmcnigeria.org  →  HTTP 200, 114 bytes, and the entire body is
                   <script>window.onload=function(){window.location.href="/lander"}</script>
                   Normalised: ZERO CHARACTERS OF TEXT.
```

**`res.ok` is TRUE. The host never changes, so a redirect check does not catch it either.** A link
check that asks only *"did something answer"* goes green on a domain-parking lander forever — and
a fingerprint check goes green on it too, because a parked page is beautifully stable.

**So the link check now verifies three things, not one:**

1. the response is 2xx;
2. 🔴 **it landed on the host we asked for** — a citation must not silently change owner;
3. 🔴 **the body contains a substantive document** — measured floor **500 normalised characters**,
   set from the sample: the smallest real source here normalises to **3,535** (oet.com) and the
   parked domain to **0**. ⚠️ PROVISIONAL, n=10 — a gap in one measured distribution, not a
   considered threshold.

**And every source URL in the registry was re-resolved: 9 of 9 same-host, none parked, and Nigeria
uses `nmcn.gov.ng`.** A test asserts no record may ever cite `nmcnigeria.org`.

## 9.9 · WHAT §9 CHANGED, IN ONE LIST

1. `sourceQuotable` is **derived per document class**, not typed per domain. **F18.**
2. `licence`, `sourceDocumentClass`, `attributionStatement`, `pageFingerprint` are new and
   mandatory. **F17, F20.**
3. **Silence is `false`.** NMBI, NMCN, PNMC corrected from `"unknown"`. **F19.**
4. **NMC staleness withdraws the quote** rather than flagging it. **F21.**
5. **OGL pages need a per-page third-party check** before their text is stored. **F22.**
6. **OET is prohibited on three grounds**, and the non-commercial limit is decisive.
7. **Fingerprint watching** rescues automated detection for un-quotable sources — measured first.
8. **The link check verifies where it landed** and that it landed on a document.

**100 tests, all six new laws red-forced against synthetic records AND sabotaged against the real
fact files. Nothing routed around: four 403s, one licence prohibition and five unread licences are
all recorded as costs.**

---

# 10 · 🔴 THE FOUR LICENCES WERE READ — AND THE PREDICTION WAS WRONG

**PR #9 merged (`b342ecc`), verified on `origin/main`.** The owner then read the four outstanding
licences first-hand. **§8.4 predicted what they would say. §8.4 was wrong, and the shape of the
error is worth more than the correction.**

---

## 10.1 · THE PREDICTION, AND THE MEASUREMENT — Rule Eight, again

| | §8.4 predicted | 🔴 what the reading found |
|---|---|---|
| Immigration NZ | permissive → record moves | ✅ **PERMITTED — CC BY 3.0 NZ** |
| NMBI | permissive → record moves | ❌ **RESERVED** — only `Copyright ©`, no licence exists at all |
| NMCN | permissive → record moves | ❌ **RESERVED** — "All Rights Reserved." |
| PNMC | permissive → record moves | ❌ **RESERVED** — "All rights reserved." |
| **net effect** | **manual queue 16 → 2, passes/year 32 → 4** | **ONE of four permits. Manual queue: unchanged by this** |

> **ONE GRANTS PERMISSION. THREE GRANT NOTHING.** The prediction was not merely optimistic — it was
> **a projection offered where a measurement was cheaply available**, which is Rule Eight, and the
> measurement disagreed with it **record by record** rather than in aggregate. Had the aggregate
> happened to land near 14, the reasoning would still have been wrong.

⚠️ **§8.4's own correction was ALSO incomplete.** It was struck through and annotated *"the answer
was NO"* — true of NMBI, NMCN and PNMC, and **wrong about Immigration New Zealand**, which was not
yet read at the time. Both the prediction and its first correction are left in place, struck
through, because **a correction that deletes what it corrects hides that the mistake was possible.**

## 10.2 · THE RECOUNT — and the manual queue did not move for the reason anyone expected

| | §8 | §9 | **§10** |
|---|---|---|---|
| AUTOMATED | 16 | 32 | **32** |
| MANUAL | 16 | 0 | **0** |
| PERMITTED | — | — | **17** |
| RESERVED | — | — | **14** |
| PROHIBITED | — | — | **1** |
| UNREAD | — | — | **0** ✅ every licence in the registry has now been read |

> 🔴 **THE MANUAL QUEUE EMPTIED BECAUSE OF FINGERPRINTING, NOT BECAUSE OF A LICENCE.**
> Reading four licences moved **one record's quotability and zero records between queues.** The
> thing §8.4 expected to buy 14 records was bought by a completely different mechanism, and if the
> licences had been read first the queue would have looked exactly as bad as before.

**~~Manual queue 16 → 2, human passes/year 32 → 4.~~ SUPERSEDED.** The correct figures are
**manual 0**, with the human cost living in the **fingerprint-watched population** and reported as
**floor 0 / ceiling 32** passes a year — neither called the answer, because page-change frequency
is still unmeasured.

## 10.3 · THREE STATES, AND TWO OF THEM MUST NEVER MERGE

`sourceQuotable` is a boolean-plus-unknown and it answers what the CODE may do. It cannot answer
what a PERSON should do, and the owner's ruling is that collapsing the middle two destroys exactly
the thing worth knowing:

| state | meaning | ours |
|---|---|---|
| ✅ **PERMITTED** | a licence was granted | gov.uk OGL v3.0 · INZ CC BY 3.0 NZ · NMC 6.3 (**guidance only**) |
| 🔴 **RESERVED** | copyright asserted, **no licence granted — THE DEFAULT** | PNMC · NMCN · NMBI |
| 🔴 **PROHIBITED** | a specific act **expressly forbidden** | OET |
| ⚠️ **UNREAD** | nobody read it, or the page would not open | none, today |

> 🔴 **RESERVED says "NOBODY HAS ASKED THEM."**
> 🔴 **PROHIBITED says "THE ANSWER IS WRITTEN IN THEIR POLICY."**

Both stop a quote, so a boolean makes them identical. **One is closed by an email to a regulator.
The other is closed by nothing short of the licensor changing their mind, and asking would waste a
day.** A single `false` would have made those look like the same piece of work forever.

⚠️ **AND RESERVED IS NOT A WEAKER "NO".** It is the **legal default** — silence reserves every
right. The conservative reading is not caution; it is the law as it stands until somebody grants
otherwise. **Every state stores its exact clause** (`licenceClause()`), so the reasoning can be
re-argued against the words rather than re-guessed.

## 10.4 · IMMIGRATION NZ — permitted, with the OGL's caveat in a different accent

**CC BY 3.0 New Zealand: it *"licenses you to copy, distribute and adapt"*, conditional on
attribution to the Crown and to the Ministry's website.**

⚠️ **And it carries the same SHAPE of caveat as the OGL's word "MOST": PDFs, text files, documents,
extracts and DATA may not be Crown copyright, so EACH DOCUMENT MUST BE ASSESSED SEPARATELY.**
`requiresPerPageThirdPartyCheck` is therefore true for this licence too — **a site-wide licence
does not licence every artefact on the site.**

**Measured on the NZ page, 2026-09-10:** the footer carries `Crown copyright` **and** a separate
`© 2026 Cookie Information` — a cookie-consent vendor's banner, almost certainly not a claim over
the page's text. **The scanner cannot tell those apart and is not allowed to guess**, so it records
`clear: false` with the notice attached and **a person rules.** It blocks nothing today because no
span is stored; it would have to be settled before one ever is.

## 10.5 · 🔴 AND THE NZ RECORD FOUND A DEFECT IN OUR OWN LAW

**F6 demanded a `quotedSpan` wherever the licence permitted one.** Immigration New Zealand permits
quoting — and our record holds the fact **in our own words**, because it reached us through
`org-notes.ts` and nobody ever extracted a span.

> **A PERMISSION IS NOT AN OBLIGATION. MAY QUOTE IS NOT MUST QUOTE.**

That record was lawful, useful, and **rejected by our own rule.** Four corrections followed, and
they all share one shape — *ask what the record HOLDS, never what its licence would have allowed
it to hold*:

| | keyed on | now keyed on |
|---|---|---|
| **F6** | permission | **evidence of some kind** — a span *or* our own words |
| **F13** (a model proposes, never IS the source) | permission | **a stored span** — no span, no proposal to verify |
| **F20 · F21 · F22** (credit · currency · per-page check) | permission | **a stored span** — all three are conditions on a *reproduction* |
| `freshnessRuleFor` | permission | **a stored span** |

🔴 **The last one was the dangerous one.** The old rule prescribed a **quote match for a record
with no span**, which can never return anything but `could-not-check` — **a check assigned to a
record it cannot run on**, permanently inconclusive, and indistinguishable in a report from a
blocked source. That is the exact shape this project keeps finding in other people's gates, and it
was in ours for two commits.

**And the same bug was in the runner**, found by running it: `runQuoteMatch` routed by
`sourceQuotable === true` and sent the NZ record to the matcher, which duly reported *"quotable but
carries no quotedSpan"*. **The job now routes on the stored span**, and the registry returns
**32/32 pass, 0 fail, 0 could-not-check**.

## 10.6 · THE NIGERIA URL — CHECKED, AS INSTRUCTED

**`nmcnigeria.org` is not ours and never was.** Every Nigeria record cites **`nmcn.gov.ng`**,
re-resolved same-host, and a test forbids any record ever citing the parked domain. §9.8 has the
full measurement — **HTTP 200, 114 bytes, a script redirect to a parking lander, zero normalised
characters** — and the link check now verifies **where it landed** and **that it landed on a
document.**

## 10.7 · WHAT §10 CHANGED

1. **Immigration NZ: `unknown-not-read` → `CC-BY-3.0-NZ`, PERMITTED.** New licence, with its
   per-document caveat encoded as a per-page check.
2. **Three states — PERMITTED · RESERVED · PROHIBITED · UNREAD** — counted apart and never summed,
   each carrying its exact clause.
3. **F6 corrected**: a permission is not an obligation. **F13, F20, F21, F22 and the freshness rule
   re-keyed to the stored span.** The runner too.
4. **The "16 → 2" prediction is marked SUPERSEDED, not deleted**, alongside its own first
   correction, which was also incomplete.

**176 tests. Every new guard red-forced and sabotaged against the real fact files. The nightly job
run: 32/32 pass.** No table, no migration, no production write, no other product touched.

---

# 11 · THREE RULINGS, AND ONE OF THEM CHANGES A CHECK

**10 September 2026.** PR #10 merged (`fd8c045`). Three things settled before the chain work, so
none of them has to be argued again.

---

## 11.1 · 🔴 THE THIRD-PARTY CHECK WAS ASKING THE WRONG QUESTION

| | |
|---|---|
| ❌ what it asked | *"is there a third-party notice anywhere on this page?"* |
| ✅ what it must ask | *"THE TEXT I AM ABOUT TO STORE — is IT a third party's?"* |

Immigration New Zealand showed what the difference costs. Its page carries `Crown copyright` in
the footer **and** a separate `© 2026 Cookie Information` from a consent widget. The scan reported
`clear: false` — **correct as an observation and useless as a decision.** A cookie banner in the
page furniture had acquired a veto over a fact taken from the article body.

### The narrowing is STRUCTURAL, never an opinion

🔴 **`src/facts/third-party.mjs` does not know what "Cookie Information" is, and must not.**
Recognising a vendor by name and deciding what its notice covers would be a judgement about
somebody's rights made by pattern-matching a brand. So the decision rests on one thing **the
publisher has already declared in their own markup**:

> **IS THE NOTICE IN THE SAME CONTENT REGION AS THE TEXT I AM STORING?**

| | |
|---|---|
| notice in `<footer>` / `<nav>` / `<aside>`, span from `<main>` | **no conflict** — the span stands |
| notice **inside the region the span came from** | 🔴 **a real block** — the span is not stored |
| span found in **no** content region | 🔴 **also a block** — we will not store what we cannot place |

A page that puts a copyright line inside its own article body is telling us something about that
article. A page that puts one in a consent widget is telling us about the widget. **We do not
interpret either. We read where they are.**

### ⚠️ AND THE OBSERVATION IS KEPT, NOT ERASED

**`clear: false` stays on the New Zealand record.** What changed is what it is allowed to *decide*.
`F22` now blocks on `spanRegionConflict`, and `clear` is deliberately not consulted.

> **An observation that quietly became a veto is how a check ends up switched off by whoever it
> inconveniences first.**

### Red forced BOTH ways

| fixture | whole page | region | result |
|---|---|---|---|
| notice in `<footer>`, span in `<main>` | — | `<main>` | **no conflict** ✅ |
| notice **inside** `<article>`, span in it | — | `<main>` | 🔴 **conflict** |
| the real NZ page | `clear: false` | `<main>` | **no conflict** — furniture |

**Re-measured across the twelve gov.uk records that store a span: region `<main>`, conflict `false`
on every one.**

## 11.2 · ✅ NO LEGAL REVIEW IS NEEDED FOR THE HASH — AND THE FLAG WAS MY ERROR

§9.7 flagged the page fingerprint as reasoning that might want a qualified eye. **The owner
withdrew that, and he is right:**

> **Taking a hash of a public page to see whether it changed is what every monitoring tool, every
> uptime checker and every archive does.**

It is not a new argument. Dressing it up as one **manufactured a blocker out of an ordinary
operation** — and that is the part worth keeping, because an over-cautious flag is not free: it
parks work, and it spends the owner's attention on a question nobody actually had.

**The flag is removed from `fingerprint.mjs`, from `licences.mjs`, and from §9.7.** The mechanism
is unchanged; only the warning that was never earned has gone.

## 11.3 · 🔴 THE LICENCE AND THE FINGERPRINT ANSWER DIFFERENT QUESTIONS

The finding the recount produced, stated as the rule it actually is:

> **THE LICENCE DECIDES WHETHER WHAT WE HOLD IS LAWFUL.**
> **THE FINGERPRINT DECIDES HOW MUCH IT COSTS.**
> **TWO DIFFERENT QUESTIONS THAT LOOKED LIKE ONE.**

Measured: **reading four licences moved ONE record's quotability and ZERO records between queues.**
The manual queue emptied because of fingerprinting. §8.4 predicted the licences would move
fourteen, and they moved none, because it had the two questions fused.

### ⚠️ And the licence work was not wasted — it simply gets no credit for the cost

Without it there would be no `attributionStatement`, no NMC guidance/news split, and no
PERMITTED · RESERVED · PROHIBITED at all. It is what makes eleven of the nineteen facts on the
`/nursing` page quotable **with the credit their licence requires**, instead of all nineteen being
paraphrased.

**What it never touched is the cost question — and it must not be given the credit for that.**
Conflating the two is what produced a wrong prediction with a confident number attached.
