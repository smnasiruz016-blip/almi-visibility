# PHASE 0 — THE FROZEN GAP REGISTER

> 🔴 LABELS SANITISED 2026-09-22 (same rulings): 11 occurrence(s) of expected labels from the retired reference replaced by [REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]. Pre-label-sanitisation blob 66f2d2130958223c546e095cc892a5d384ca316c; the originals remain ONLY in Git history.

> 🔴 SANITISED 2026-09-22 under the RETIRED_CONTAMINATED ruling (_handoffs a5452ee, clarified f4367b1): 3 retired held-out string occurrence(s) replaced by [REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]. Retired set fingerprint 3d4951d6…, population 61. The original bytes remain ONLY in Git history — blob 66f2d2130958223c546e095cc892a5d384ca316c, introduced in 8855fdc; they must not be used as held-out, unseen, marking-key or expected-answer evidence.

**11 September 2026.** The single register the frozen boundary requires:
**AUDIT ONCE → FREEZE GAP REGISTER → FIX → TARGETED VERIFY → CLOSE. No moving goalposts.**

**Everything is here. Nothing is duplicated elsewhere as a rival list.** The per-item documents
hold the working and the evidence; **this file holds the register**, and it is the one that is
frozen.

## The two registers, and the rule that keeps them apart

> **Connected product's missing data = PRODUCT DATA GAP.**
> **AlmiVisibility's missing generic mechanism = ALMIVISIBILITY CAPABILITY GAP.**
> **Phase 0 identifies, measures and documents both. It builds or fills neither.**

**No gap appears in both.** A third list — **OWNER ACTION** — holds the two items that are neither:
they are decisions or console work only the owner can do.
🔄 **13 September 2026: `B1` is CLOSED** (§3) — Search Console read-only access was granted on 11 September.
One owner action remains open: `B2`.

🔴 **Nothing in this register is fixed, and nothing in it is a request for permission.** A missing
capability is a gap, not a question.

---

# 0 · 🔴 OWNER RULINGS — FROZEN. NOT REOPENED BY ANY LATER AUDIT.

**Two questions this register raised were put to the owner and answered on 11 September 2026. They
are rulings, not opinions, and they are frozen here with their references.**

> ### 🔴 NO LATER AUDIT REOPENS THESE FOR RE-INTERPRETATION.
> Not this one, not the next one. **Two things, and only two, may disturb a ruling:**
>
> 1. **contradicting evidence**, or
> 2. **an owner-approved scope change.**
>
> In either case the response is to **write the reason down and stop — never to decide.**

## OWNER RULING 1 — `DOD-02` means isolation from PRODUCT databases

**Answers `Q-DOD-2`.** References: §11 *"Visibility-engine database is isolated from product
databases"*; ledger row *"`DOD-02` | Dedicated visibility data isolation"*.

| | |
|---|---|
| the requirement | isolation of AlmiVisibility's database **from connected product databases** |
| is it met? | ✅ **YES.** A dedicated Neon project satisfies it |
| **`DOD-02`** | 🔴 RED → ✅ **PASS** |
| what this is **not** | **Preview/Production separation is NOT `DOD-02`.** It is a separate infrastructure/safety requirement and **remains open as `B2`** |

⚠️ **This is the only status change the two rulings produce.** No other status moved, no gate was
touched, no threshold was moved.

## OWNER RULING 2 — Amendment 1 is a formal amendment, and it is now FROZEN

**Answers `Q-DOD-1`.** References: §12 *"The acceptance test may not be rewritten after
implementation to fit what the engine happens to detect"*; `CASE_STUDY_01_ACCEPTANCE_TEST.md`
Amendment 1; `PHASE_0_ITEM_6_CASE_STUDY_CONTRACT.md` §1.1a.

| | |
|---|---|
| the change | Case Study #1's **input / fixture**: live site → pinned, hash-verified corpus |
| its standing | ✅ **an OWNER-APPROVED AMENDMENT, not a rewrite** |
| the pass criteria | 🔴 **UNCHANGED: 6/6 RED and 0/3 CONTROL false positives** |
| its status now | ✅ **FROZEN** — it may not be amended again to suit an engine's output. §12 now protects this pass contract |

⚠️ **What the ruling did NOT do:** it closed the §12 question. **It did not pass the test.**
`DOD-15` stays 🟡 because **the test has never been run** (`CS-3`) — a closed question is not a
passed test.

## OWNER RULING 3 — every product is a subdomain of `almiworld.com`

**Answers `U-EST-1`**, raised by the Search Console ingest of 11 September 2026, which could measure
what the domain property covered but not what might sit outside it.

| | |
|---|---|
| the question | does any AlmiWorld product run on its **own registered domain**, outside `sc-domain:almiworld.com`? |
| the answer | 🔴 **NO.** All products are subdomains of `almiworld.com` |
| source | **OWNER RULING, 11 September 2026** |
| consequence | the DOMAIN property covers **the whole estate**. The **8 ZERO hostnames are real zeros** — hosts with no impressions, not hosts hiding outside the property |

> ### 🔴 EXPIRY CONDITION — WRITTEN DOWN, NOT LEFT TO MEMORY.
>
> **If any future product launches on its own registered domain, THIS ANSWER DIES THAT DAY.**
> That domain is then outside the property, its pages are invisible to every measurement built on
> this ruling, and **it needs its own Search Console property and its own grant.**
>
> A ruling with no expiry condition is a ruling that quietly stops being true. This one says when.

---

## OWNER RULING 4 — the KEY FEATURE CHECKLIST is the DONE standard

**Issued 11 September 2026** as `ALMIVISIBILITY_KEY_FEATURE_CHECKLIST_FINAL.docx`. Frozen verbatim
and hash-verified at `KEY_FEATURE_CHECKLIST_SOURCE.md`.

| | |
|---|---|
| what it is | the **completion instrument** for AlmiVisibility — 58 key features, a four-value status key, and a four-question evidence rule |
| its precedence | 🔴 **Where any internal status format of ours disagrees with it, THE CHECKLIST WINS** |
| what it does **not** do | it does **not** replace the Definition of Done or V5.1. The DoD says what the product must be, V5.1 says what may be built and when, **and the checklist says when we may call any of it done** |
| its first law | **"TICK LAW: A feature is not complete because code exists. Tick it only when real evidence proves it works."** |
| the standing tracker | `CHECKLIST_STATUS.md` — one row per item, all 58, in the checklist's own §4 format |

⚠️ **First measured status, 11 September 2026: ☑ 0 · ◐ 16 · ☐ 41 · ⚠ 1.** Of the 41 ☐, **32 are
`v0.1 SCOPE = OUT`** — excluded by V5.1's own boundary, which is the cost gate working, not a
failure.

🔴 **AND A CORRECTION TO A CONTRADICTION THIS AUDIT FOUND — recorded, NOT decided.**
`CS-5` below states that RED 2 has no frozen input and carries a clock. **Its premise is false.**
`case-study-01/corpus/MANIFEST.md` line 74 pins RED 2 to commit `07852f9`, and that commit
resolves today in `C:\Projects\almi-oet` with both halves of the evidence intact. A git commit is
immutable, so fixing the live page cannot unfreeze it. The error traces to
`CASE_STUDY_01_RUN_01.md` line 89, which quotes a phrase — *"live-confirmed"* — that appears
nowhere in the contract, having dropped *"— IN THE CORPUS"* from `✅ VERIFIED LIVE — IN THE
CORPUS`. **`CS-5` is left exactly as written: this register is frozen and its disposition is the
owner's.** See `CHECKLIST_STATUS.md` §"Item 52".

## OWNER RULINGS 4 AND 5 — 12 SEPTEMBER 2026, AND THE EVIDENCE THAT CONTRADICTS THEM

**RULING 4.** Asked: *was the `/from/` corridor robots.txt block on almiitalian, almidutch,
almiportuguese and almiicelandic deliberate?* Answered: **NO. The owner did not instruct it and does
not know of it. The finding stands as a defect.**

**RULING 5.** Asked: *was the AI-crawler block on 12 products (`U10`) deliberate?* Answered:
**NO. Same answer, same standing.** `U10` moves from *awaiting a ruling* to **a measured, unintended
state whose origin is unknown**.

**Neither ruling authorises a fix. Both authorise an investigation.** The investigation ran, and it
returned something the rulings did not anticipate.

> ### 🔴 CONTRADICTING EVIDENCE — RECORDED, NOT DECIDED.
>
> The register's own rule: *"Two things, and only two, may disturb a ruling: contradicting evidence,
> or an owner-approved scope change. In either case the response is to write the reason down and
> stop — never to decide."* This is the first case. **I am writing it down and stopping.**
>
> Git history shows **both rules were authored by the owner's own account**
> (`smnasiruz016@gmail.com`), and **the commit messages explain the intent in detail**:
>
> > *"Cuts ISR-write cost driven by bot crawls of the deep per-origin long-tail: robots.txt:
> > Googlebot/Bingbot keep full leaf access (SEO channel), generic bots get hubs+landing only (deep
> > `/from/` leaves disallowed + crawlDelay), and heavy no-SEO crawlers … are blocked."*
> > — `867790a`, `7fd0569`, `6054ed4`, 2026-07-20, byte-identical across three forks
>
> **What this does NOT establish:** that the owner recalls it, or that he intended the state we
> measure *today*. Every one of those commits is co-authored by an AI assistant, and the block that
> actually causes the defect — **extending the Disallow to Googlebot** — was a **separate, later**
> change (`5e3e211`, `e462310` on 2026-07-28; `0397abd` on 2026-08-09). The original commits
> explicitly *kept Googlebot's full leaf access*.
>
> **So the honest statement is:** the rules were authored deliberately, for a stated cost reason;
> the Googlebot extension came later; and whether the owner intended **the state as it now stands**
> is a question only he can answer. **The rulings are recorded as given and are not amended here.**

⚠️ **The DEFECT finding is unaffected either way.** Whether the block was intended or not, 106 URLs
carrying 216 impressions cannot be crawled by Googlebot. Intent changes what to do about it; it does
not change the measurement.

---

# 0A · 🔴 LAWS — GENERAL, AND THEY APPLY TO CODE NOT YET WRITTEN

## `LAW-BOUND-1` — EVERY BOUNDED OPERATION MUST PRINT ITS OWN BOUND NEXT TO ITS RESULT

**Raised by PR #35, 11 September 2026.**

That PR reported `requestCount=1` and `exhausted=true` — and did **not** print
`rowLimitPerRequest`. Both numbers were correct. **The report still could not verify itself**,
because "one request drained 1,527 rows" is only true if the per-request limit was above 1,527, and
the limit was nowhere on the page. A reader had to go and find the source.

> ### THAT IS THE 11 SEPTEMBER DEFECT IN A NEW COSTUME.
>
> The original was a cap that did not announce itself. This is a bound that does not announce
> itself. In both cases the output looks complete and the evidence for completeness is missing.

**The law:** any result produced under a limit — a row limit, a URL cap, a byte ceiling, a request
budget, a timeout — **prints that limit beside the result**, in the same report, every time.

**In force on:** `SearchQueryResult` (`rowLimitPerRequest`) and `CrawlRun` (`maxUrlsPerRun`).
Both are asserted by tests that read the emitted report text.

---

## `LAW-ORPHAN-1` — A MODULE IMPORTED ONLY BY ITS OWN TEST IS DEAD CODE

**Raised 12 September 2026, from two incidents of the same shape.**

1. `bin/placement-measure.mjs` imported constants that had been deleted. It threw on its first
   line from PR #20 onward and **nobody noticed for a day**.
2. `src/evidence/transitions.mjs` encoded the law that UNKNOWN never becomes PASS, was proved
   falsifiable by injection — and was **imported by nothing except its own test.**

> ### A GUARD THAT GOVERNS NO PRODUCTION PATH IS NOT A GUARD.
> Its tests pass, its coverage looks healthy, and it is doing no work at all.

**The law:** every module under `src/` must have at least one **non-test** importer. The census
lives in `test/entry-points.test.mjs` and fails the build. An exemption is permitted, must be
named in `ORPHAN_ALLOWLIST` with a written reason, and **the allowlist is empty today.**

---

## 🔴 RULE SWAP — "ZERO DETECTORS" ENDS, THE SEALED EXAM RULE REPLACES IT

**12 September 2026.** Every brief up to this point carried the rule **"zero detectors"**, enforced
by a census that counted files under `src/detectors/` and required 0.

**That rule has ended, because checklist items 10, 12 and 13 ARE detectors.** Keeping it would have
forbidden the product it was meant to protect.

> ### 🔴 THE SEALED EXAM RULE
>
> **While detectors are being written, `case-study-01/` IS NOT OPENED.**
>
> A detector is derived from the checklist's own PASS meanings, from CURRENT official search
> guidance, and from the evidence store's data model. **NEVER from the six known RED classes.**

**Why this is an honest exam.** The corpus is pinned to an immutable commit (`07852f9`), so it
cannot drift while we build. A detector written without ever looking at it, then run against it, is
a real test of the engine. One written while looking at it is a memorised answer sheet.

**Enforced mechanically, not by good intentions.** `tools/sealed-corpus-census.mjs` fails the build
if any file under `src/audit/` so much as names a path inside the sealed directory. It is wired
into `bin/product-boundary.mjs` and RED-proved against a fixture.

⚠️ **The old census was DELETED, not left passing.** `tools/detector-census.mjs` pointed at
`src/detectors/`; the detectors live in `src/audit/`, so it would have read 0 for ever. **A check
that cannot fail is the pattern this project hunts**, and a retired one left in place is the
quietest example of it.

---

## `LAW-FIXTURE-1` — A TEST DOUBLE MUST BE AT LEAST AS MESSY AS PRODUCTION

**Raised by PR #38, 12 September 2026.**

The fake Search Console provider returned a **constant timestamp**. Production returns a live
clock. So the fake was **more idempotent than reality**, and it hid the very defect it existed to
catch: `gsc.sites.list` was storing a per-property `observedAt` *inside the measured value*, so its
content hash changed on every run and it could never deduplicate.

> ### THE UNIT TEST WAS GREEN. THE DEFECT DIED ONLY WHEN THE THING WAS RUN FOR REAL.

**The law:** a fixture must reproduce the *variability* of the thing it stands in for. Where a
fixture is deliberately simpler than production, **that simplification is NAMED IN THE FIXTURE**,
so the next reader knows what it is not testing.

**In force on:** `test/idempotency-and-verification.test.mjs` (the fake now uses a live clock) and
`test/report-view.test.mjs` (its simplifications are named at the head of the file, and the same
assertions are re-run against the real store at the foot).

---

## `LAW-ABSENT-1` — A FAILURE TO MEASURE IS NEVER A FINDING ABOUT THE SUBJECT

**Raised 12 September 2026. This one has cost us three times.**

| # | the tool failed | and the SUBJECT got the blame | caught in |
|---|---|---|---|
| 1 | a property returned **403** | recorded as `rowCount: 0` — "this site has no data" | PR #35 |
| 2 | the resolver **refused connections** (`ECONNREFUSED` on 127.0.0.1) | recorded as "this host publishes nothing" | PR #39 |
| 3 | **`getaddrinfo` filtered AAAA** on a machine with no IPv6 | recorded as "no AAAA record exists" | PR #39 |

In all three the instrument broke and the reading was written down as a fact about the target. All
three produce **plausible-looking rows** — a zero, an absence, a missing record — which is why none
of them announces itself.

> ### THE LAW: ANY CODE PATH THAT CONVERTS AN ERROR INTO A NEGATIVE FINDING ABOUT A TARGET IS A BREACH.
>
> An error yields **UNKNOWN**, and the UNKNOWN says whose fault it was. Only the subject actually
> answering — a 200 with no rows, an `ENOTFOUND`, an empty result set — may produce a negative
> finding about the subject.

**In force on:** `classify()` (403 → `rowCount: null`), `addressFamilies()` (only `ENOTFOUND` /
`ENODATA` may yield `false`; anything else is `null` → UNKNOWN), `reachabilityState()` (a null
family yields UNKNOWN, never UNREACHABLE), and the export state guard.

---

# 0C · 🔴 A CORRECTION, RECORDED — THE 46 FACT RECORDS ARE RESTATED AS UNVERIFIED

**12 September 2026.** The checklist audit found `factCheckedOn` **null on all 46 records** while
the engine was being described as a *verified fact supply*. Key feature 15's PASS meaning requires
a verification date, and there was none.

| | |
|---|---|
| what changed | `verificationState` is **REQUIRED at construction**. A fact that will not declare `UNVERIFIED` or `VERIFIED` **throws**. `VERIFIED` without a date throws; `UNVERIFIED` carrying a date throws |
| what the 46 records now say | **`UNVERIFIED`** — declared, on every record |
| what did **not** change | their values, their sources, their tiers, their link/quote/fingerprint checks. **Nothing was deleted and no diff removed a line** (20 insertions, 0 deletions across 9 files) |

> ### 🔴 THE DATE WAS NOT BACKFILLED, AND THAT IS THE POINT.
>
> Writing today's date into `factCheckedOn` would have turned 46 items green in an afternoon. It
> would also have been **the exact failure key feature 50 forbids** — turning missing evidence into
> an observed fact. The records were never verified; now they say so.
>
> **This is a CORRECTION, not a REGRESSION.** Nothing got worse on 12 September. The registry
> stopped overstating what it had always been.

---

## OWNER RULING 6 — `PASS_BOUNDARIES_SOURCE.md`, AND WHICH DOCUMENT WINS

**Ruled 12 September 2026.** Frozen verbatim as `PASS_BOUNDARIES_SOURCE.md`, body sha256
`16c580160391eabb14a4d6754edfe18fe1def936384cf831d300640ef73d9e5c`, verified by
`tools/verify-pass-boundaries-source.mjs` and by `test/pass-boundaries.test.mjs`.

> ### PRECEDENCE
>
> The **KEY FEATURE CHECKLIST** states **WHAT** each feature must do.
> **PASS BOUNDARIES** states **EXACTLY WHEN** it may be ticked.
> Where any internal practice disagrees with either, **THEY WIN**.
> **A boundary changes ONLY by owner ruling, recorded with its date and reason.**

Its purpose is one sentence, in the owner's own words: *so that nobody can change what
"complete" means after the fact.* Every practice this repository has invented — the laws, the
sealed exam rule, the sabotage habit — is subordinate to these two documents. Where one of our
own rules would produce a tick the boundary forbids, **the boundary wins and the rule is wrong**.

### The four-part contract, enforced rather than remembered

No row may be `VERIFIED-PASS` unless **INPUT · EXPECTED BEHAVIOUR · FAILURE CONDITION ·
EVIDENCE** are all four answered with real evidence. This is not a review convention: it is
`assertLawful()` in `src/checklist/classification.mjs`, it fails the build, and it is
RED-proved by four sabotages.

### 🔴 SIX BOUNDARIES THE RULING DOES NOT STATE IN FULL — A QUESTION, NOT A GAP WE FILLED

§4 rules items **10, 12, 13, 14, 38** — and §6 rules item **25** — as `v0.1 PASS boundary` /
`deferred` tables rather than in the four-part form. **All six therefore cannot reach
`VERIFIED-PASS` as the ruling stands**, and the contract guard refuses them.

They were **not** filled in. Writing the missing parts ourselves would manufacture a boundary the
owner never ruled, which the repository would then enforce as if he had — the precise move
Ruling 6 exists to prevent. Recorded here for him to answer.

### 🔴 ONE CLASS-VERSUS-SCOPE DISAGREEMENT, AND THE RULING WON

Item **8 · HEAVY / THIN / EMPTY Discipline** is class **P** — passable in v0.1 — while
`CHECKLIST_STATUS.md` had carried it as scope **OUT / NOT STARTED**. It is the only such
disagreement in all 58. By precedence the ruling wins, and item 8 is now `TESTABLE-NOW`.

---

## AMENDMENT 1 TO RULING 6 — THE SIX SPLITS GET THEIR CONTRACT

**Ruled 12 September 2026.** Frozen verbatim as `PASS_BOUNDARIES_AMENDMENT_1.md`, body sha256
`ef874f095048938a095613d140aba10451237afa26e6ea14a8aef07a962cc723`.

PR #46 reported that items **10, 12, 13, 14, 25, 38** were ruled as two-column tables and never
given the four-part contract, so **none of them could ever have been ticked**. The owner accepted
that as his defect and amended the ruling. All six now carry INPUT · EXPECTED · FAILURE ·
EVIDENCE, and `via` records which document supplied them (`§4+A1`, `§6+A1`).

Two further corrections carried by the amendment:

- **The count is SIX, not five.** §4 named five split features while §6 marked a sixth (item 25);
  the document contradicted itself and now reads six.
- **Item 8 is IN scope.** The ruling beat the tracker, and the amendment gives the reason: HEAVY /
  THIN / EMPTY is not a discovery capability but a **guard**, and what it guards against is a
  supply label quietly becoming a demand claim. That guard must exist from the first day there
  are labels.

🔴 **This is the mechanism working, not being worked around.** The gap was reported rather than
filled in from this side, and it closed by owner ruling recorded with its date and reason —
exactly what Ruling 6 requires. Had the missing parts been invented here, the repository would
now be enforcing a boundary the owner never set.

---

## 🔴 A CORRECTED CLAIM — PR #45's ACCEPTANCE LINE WAS VACUOUS

**PR #45 reported "checklist frozen-source hash verified, exit 0". That route proved nothing.**

`tools/verify-checklist-source.mjs` is a pure module with **no main block at all**. Running it
from a shell executes nothing and exits 0 whatever the file contains. The underlying check does
run — in `test/checklist-status.test.mjs`, which passed — so the *claim* was true while the
*evidence offered for it* was empty.

The same trap was then hit a second time: the first version of
`tools/verify-pass-boundaries-source.mjs` guarded its main block with
`import.meta.url === "file://" + argv[1]`, which is **dead on Windows** — `import.meta.url` is
`file:///C:/…` with three slashes and the concatenation makes two. It printed nothing and exited
0, reading exactly like a pass.

Both are now fixed, and the CLI is **RED-proved**: corrupt one byte of a frozen source and it
exits 1; restore it and it exits 0.

> **Recorded because a false acceptance line that nobody corrects becomes evidence later.** A
> reader six months from now would find "hash verified, exit 0" in a merged PR and reasonably
> treat it as a check that had run.

---

## OWNER RULING 7 — ITEM 10's SPLIT, AND THE RENDERING TRIGGER ON ITEM 52

**Decided 12 September 2026 by beta-g as technical owner**, on the owner's instruction, after
§4 flagged that item 10's boundary names *"rendered-content evidence"* while v0.1 has no
JavaScript rendering and every record is `RAW_HTML` by deliberate design.

| | |
|---|---|
| **item 10, v0.1 PASSABLE half** | status · redirects · sitemap · robots/indexability · canonical · **SERVED-HTML** content and link evidence |
| **⏭ deferred** | the **post-JavaScript DOM**, and all advanced technical SEO beyond the named classes |

### 🔴 THE TRIGGER — HARD, NOT SOMEDAY

> ### RENDERING MUST BE BUILT **BEFORE ITEM 52 IS ATTEMPTED**.
>
> **Two of the six RED classes cannot be detected without it.** Running the Case Study before
> rendering exists would produce a FAIL that measures **our sequencing, not the engine** — and
> **the seal breaks only once.** There is no second attempt to spend.

This is why item 52 stays `BLOCKED-UNKNOWN` and not `TESTABLE-NOW`: **NOT RUN = NOT TESTED**, and
its precondition is unmet. Whoever runs the exam must read this row first.

### 🔴 AND THE DISTINCTION THAT KEEPS THE EXAM HONEST

> **A RENDERER IS A CAPABILITY. A SOURCE-VERSUS-RENDER CHECK IS A DETECTOR.**

The capability may be built **openly** — it is infrastructure, and nothing about a headless
browser reveals what is in the sealed corpus. The detector that compares served HTML against the
rendered DOM is written **under the sealed exam rule**, without opening the sealed directory,
exactly as every detector so far. Conflating the two would either stall the renderer needlessly
or leak the exam; they are separated here so that neither happens by accident.

---

## 🔴 `LAW-POPULATION-1` — FOUR DEFECTS THAT ONLY REAL DATA COULD FIND

**Every one of these lived under a green test suite.** On 12 September 2026 beta-g returned
verified verdicts for all 46 fact records, and putting real verdicts through machinery that had
only ever seen fixtures exposed four faults in a single afternoon. They are recorded together
because they share one shape:

> ### A GREEN TEST OVER AN EMPTY OR UNIFORM POPULATION MEASURES THE FIXTURE, NOT THE SYSTEM.
>
> Before ingestion every record was UNVERIFIED, no claim was held twice, no fact was derived and
> nothing cited a fact id. Under those conditions **all four defects below were unreachable** — so
> every test passed, and passing meant nothing. The population has to be counted before a zero
> from it is believed.

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-FACT-1`** | **`detectConflicts` cannot see the conflicts we actually have** | It groups records by claim and reports groups that disagree — an *intra-registry* conflict. All six real conflicts are *registry-vs-second-official-page*: we hold ONE record and the disagreeing value is on a page we do not hold. Every group has one member, so it returns **0**, which reads exactly like "no conflicts" | ✅ **CLOSED 15 September 2026** — by `detectExternalConflicts`, which compares a held record against an external OBSERVATION that DECLARES the claim it speaks to. It was exercised on the legitimate real captured-observation shape, **fired on real evidence** (a held document count of 3 against 4 stated on an authorised page), and an **agreeing control from the same page** was exercised alongside it, so firing can be told from flagging everything. 🔴 **What did NOT change:** `detectConflicts` is UNCHANGED, its pinned behaviour is intact, and it still returns **0** for the external-observation shape — that is NOT the shape it owns, so the zero is correct behaviour and not a residual defect. Nothing was transcribed into a record. 🔴 **CLOSING THIS GAP IS NOT A ROW 16 TICK: row 16 remains BUILT-NOT-PROVED**, its dependency-walk and stale-fact populations still empty (Reconciled 16 September 2026: this cell read OPEN while row 16's face and `CHECKLIST_STATUS.md` read CLOSED.) |
| **`D-FACT-2`** | **32 ingested recheck dates governed nothing** | The ingest wrote `verification.recheckAfter`; `freshnessOf` reads `checks.recheckAfter`. All 32 still aged out on the old `extractedOn + freshness.days` rule. 🔴 **It survived the first probe**, which asked on a day past BOTH due dates, saw `STALE` and passed — both rules answer alike on such a day. Only a day where they DISAGREE carries information: **32 of 32 inert** | ✅ **FIXED** — the date now lands where freshness looks, proved on a disagreeing day |
| **`D-FACT-3`** | **the cache served contested values as clean hits** | `get()` checked freshness and nothing else, so all 14 records a human had just marked UNKNOWN came back `hit: true` — including an NMCN fee one official page puts at ₦66,875 and another contradicts. **The hit rate read 100%.** This contradicted `lifecycle.mjs`'s own header: *"A STALE OR CONFLICTED FACT IS NEVER SILENTLY USED"* | ✅ **FIXED** — an UNKNOWN is now a MISS naming its reason. **Hit rate fell 100% → 69.6%, and that is the improvement** |
| **`D-FACT-4`** | **the dependency walk has nothing to walk** | It reports 0 dependants of the 10 bad facts. Not because none exist — because **nothing in the system cites a fact id at all**: 0 derived facts, and 134 findings on disk of which **0** carry `sources` or `factIds`. The walk cannot fire on real data whatever goes wrong | 🔴 **OPEN** — recorded with its population counted, so the zero is not mistaken for health |

**`D-FACT-3` is the one that reached a caller.** The other three are blind spots; that one handed
out a disputed number with nothing to indicate anybody disputed it.

### 🔴 `D-FACT-5` — ADDED 16 SEPTEMBER 2026, BY THE SAME ROUTE: REAL EVIDENCE, NOT A FIXTURE

The four above were found on 12 September 2026 by putting real verdicts through machinery that had
only seen fixtures. This fifth was found the same way on **15 September 2026**, when the owner's
bounded seven-URL capture let R5 read a source against the record we hold. It takes the next id in
the same series; the heading above still names the four that afternoon produced.

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-FACT-5`** | **a stored fact is NARROWER than the source it cites** — `uk-code-of-practice.red-list-rule` | The stored value states, in substance, that no active recruitment is permitted from red-list countries. The R5 source reading recorded an **additional condition**: an explicit government-to-government agreement, in which case the country is treated as amber. **The stored fact is therefore narrower than the source reading, in a way that may materially change the claim's meaning.** Same shape as `uk-code-of-practice.direct-application-exception`, already held **UNKNOWN — INCOMPLETE** for being narrower than its source | 🔴 **OPEN** · **SEVERITY: UNCLASSIFIED** — this register classifies by state and carries no severity scale; UNCLASSIFIED is **not** LOW, and is not defaulted to one (LAW-ABSENT-1). **Remedy:** a future AUTHORISED HUMAN source re-verification determines the exact claim and its provenance; if it confirms this finding, the remedy is a **NEW SUPERSEDING record** under the registry's existing append/supersede law — **never an in-place historical rewrite**. Until then this gap stays OPEN. **Recorded only:** the fact was not rewritten, its value and status are unchanged, no replacement record was created, no source was fetched, and the corrected wording was NOT inferred |

---

# 0B · DECISIONS — CRAWLER

Recorded as decisions, with their kind, their tier and their date. **A decision is not a gap and not
an UNKNOWN**, and it is not evidence either — it is a choice somebody made and can be held to.

| id | decision | kind | tier | date | state |
|---|---|---|---|---|---|
| **`D-CRW-1`** | execution layer = **GitHub Actions** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-2`** | hard cap = **500 URLs per run** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-3`** | **1 request/second, concurrency 1** | technical | beta-g | 11 Sep 2026 | ✅ recorded |
| **`D-CRW-4`** | 🔴 **THE FIRST REAL RUN REQUIRES THE OWNER'S GREEN** | owner | — | 12 Sep 2026 | ✅ **GRANTED — FOR ONE RUN ONLY** |

## 🔴 `D-CRW-4` — THE GREEN, AND ITS EXACT TERMS

**Granted by the owner on 12 September 2026.** Recorded here in full because a permission that is
remembered rather than written down becomes a standing one.

| | |
|---|---|
| what was granted | **ONE run.** Not a standing permission |
| URL ceiling | **at most 500** — the existing hard cap, **unchanged** |
| rate | **1 request/second, concurrency 1** |
| nature | **read-only.** No product repository is touched. Nothing is published |
| **a second run** | 🔴 **needs its own green.** This one does not carry forward |

### THE RUN THAT USED IT — 12 September 2026, GitHub Actions run `34662527129`

| | |
|---|---|
| execution layer | **GitHub Actions** (`D-CRW-1` proved by use, not assumed) |
| seeds | the evidence store's own 1,497 page rows — **item 4's output as item 1's input** |
| selection rule | `sort by impressions DESC, tie-break by URL ASC, take the first 500; per-host cap 150` |
| requested / fetched | **500 requested, 394 fetched** — 106 DISALLOWED by robots.txt and skipped |
| wall clock | **403 seconds** at 1 req/s, concurrency 1 |
| cap | **never exceeded.** `capReached=false`; the cap was not raised |
| coverage | 🔴 **PARTIAL** — see the correction below |
| cost | `amountState: UNKNOWN`. 394 billable requests on our own account, stated per host in words |
| corpus | 394 bodies, 38.07 MiB — **artifact `crawl-corpus-34662527129`, NOT committed** |
| records | 999, committed at `runs/crawl/first-real-crawl-2026-09-12.jsonl` (615 KiB, no bodies) |

**🔴 `U-CRW-IPv6` — ANSWERED BY MEASUREMENT.** The runner has **no IPv6 egress**: no global IPv6
address, no default IPv6 route, and a TCP probe returned `ENETUNREACH`. Therefore
`almipathway.almiworld.com`, which publishes **AAAA and no A record**, is
**`UNREACHABLE_NO_IPV6`** — a fifth state, recorded as such and never as `0`.

**🔴 A CORRECTION, APPENDED NOT EDITED.** The run recorded `coverageState: COMPLETE`. It is
**PARTIAL**: 500 URLs chosen from a 1,497 pool on a property with ~240,328 URLs, and 106 of the
500 never fetched. The old derivation read "the frontier drained" as "the site is covered". The
original record stands unaltered and a `crawl_run_correction` record supersedes it — rewriting it
would have destroyed the evidence that the derivation was wrong.

> ### 🔴 THE CAP WAS NOT RAISED FOR THIS, AND MUST NOT BE.
>
> `MAX_URLS_PER_RUN = 500` remains a module constant with no switch. The green authorises a run
> **within** the existing bound; it does not authorise changing the bound. The workflow demands
> both `live` and `owner_green` on **every** dispatch, so the grant cannot decay into a default.

> ### 🔴 `D-CRW-4` IS THE ONE THAT IS NOT DONE.
>
> The crawler exists, is tested, and **has never issued a request to any AlmiWorld host.** The
> workflow that would run it has **no schedule trigger** and cannot fire by itself. Until the owner
> gives `D-CRW-4`, every number the crawler has produced came from a local fixture server.

---

# 1 · ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence | state |
|---|---|---|---|
| **A1** | the boundary law verifies **vocabulary, not dependency direction** — a `src/` file could import a product through a neutral identifier and pass | Phase 0 report §3.1; verified independently: `src/` → `products/` imports **0** today | RECORD |
| **A2** | **every entry point is product-bound.** No runner accepts a product id or descriptor path as an argument; **7 of 16 `bin/` scripts resolve a product at import time** | Phase 0 report §3.2; `bin/distinguishing-census.mjs:45` | RECORD |
| **A3** | **portability is asserted, never demonstrated.** Every `registerProduct` call outside the one product sits inside `assert.throws`, and `registeredProducts()` returns a single entry | verification §3.3 | RECORD |
| **A4** | `package.json` is **one product's task list** — 13 scripts, 7 of them one product's workflow | Phase 0 report §3.4 | RECORD |
| **ISO-1** | **licence and gap registries are shared global namespaces.** Two tenants read each other's licence terms and declared gaps; registering a probe moved shared counters **7→8** and **12→13**. Redefinition is refused; **visibility is not** | items 1–2 §3.1, measured in memory, confirmed against beta-g's baseline | RECORD |
| **ANL-1** | **funnel evidence exists for 1 of 27 products and nowhere else**; no page-view analytics anywhere; AlmiVisibility reads neither | items 1–2 §4.3; `almi-oet`'s `FunnelEvent` table verified first-hand | RECORD |
| **SEO-1** | **no standing check of the public SEO surface.** Every figure in the sweep came from throwaway scripts kept outside the repository | items 1–2 §5.3 | RECORD |
| **DEP-1** | the repository **deploys on every push**, and **no CI** stands between a merge and that deployment. 🔄 **SUPERSEDED 14 September 2026 — both halves are now false** (a fifth instance of `DOC-1`). **(1) It does not deploy:** `vercel.json` reads `{"$schema": "https://openapi.vercel.sh/vercel.json", "git": {"deploymentEnabled": false}}`, committed in `774791b` (12 Sep 2026, 22:26Z — *"…deployments off"*) and merged with #51; GitHub's deployment records for this repository list none after `28864a0` (12 Sep 2026, 22:29Z), and none for merge commit `a498a85`. **(2) CI runs on every change:** `.github/workflows/test.yml` ran and passed on each pull request's head before it merged — #71 run 34790737377, #72 run 34793014789, #73 run 34794762738 — and on each merge commit on `main` — `a696427` run 34792014942, `bbcd692` run 34793194836, `a498a85` run 34794863435. ⚠️ **Whether that check is REQUIRED — whether a failing run would block a merge — is NOT measured:** branch protection and rulesets return HTTP 403 on this repository's plan (*"Upgrade to GitHub Pro or make this repository public to enable this feature"*), so it cannot be read, and "gates every merge" is not claimed | deployment §1.1–1.2, five events matched to the second · superseded by `vercel.json` and the six named CI runs | ~~RECORD~~ **SUPERSEDED 14 Sep 2026** |
| **DEP-2** | 🔴 **a settled rule — AlmiVisibility runs behind auth — had nothing enforcing it, so it broke silently across four merges and went unseen.** All 163 tracked files were publicly downloadable; `/robots.txt` 404 | deployment §1.3 | RECORD — **owner has ruled; auth is being applied. Do not reopen** |
| **AUD-1** | **seven of the nine frozen items already had a document**, and two successive audits were written without reading it | items 1–2 §10 | RECORD |
| **DOC-1** | **no mechanism makes a summary follow a correction made to its own body.** Observed **three times**, on three different facts: the GSC row, the Neon plan, and `DOD-03A`'s status. 🔴 **A fourth instance, 13 September 2026 — the GSC row again, and this time it cost something:** `B1` and `PRQ-1` still read *not granted* two days after access was granted (11 Sep) and used by nine ingest runs. A stale blocker made the discovery rows (checklist items 2–7) look impossible to start while their input had been in the evidence store for two days. 🔴 **A fifth, 14 September 2026 — `DEP-1`:** *"deploys on every push, and no CI"* stood in this register, in `PHASE_0_ITEM_1_2_ENVIRONMENT.md`, `PHASE_0_ITEM_3_AND_DEPLOYMENT.md`, `V51_REMEASURE.md` and the CI workflow's own header for two days after deployments were switched off (`774791b`) and CI had run on every change. 🔴 **A sixth, 14 September 2026 — `FACT-1`, and the first one beta-g caused:** *"No such field exists"* stood in this register and in `DOD_MAP_AGAINST_TEXT.md` two days after `CHECKLIST_STATUS.md` row 17 recorded the formula, the input ids and recompute as built and sabotage-proved. A command was written from this register's line instead of from `src/facts/lifecycle.mjs`, and **it cost a whole command** built against a capability that already existed | item 3 §2.2; item 5 §2; item 7 §2.1; `B1` / `PRQ-1` closure, §3–§4; `DEP-1` supersession, §1 | RECORD |
| **CRW-1** | **no crawler or research worker exists in any form, on any host** | item 4 §6 | RECORD |
| **CRW-2** | 🔴 **Gate C polices third-party crawlers; nothing applies it to a crawler we would operate ourselves** on our own ISR pages at our own expense | item 4 §4 `R1` | RECORD |
| **CRW-3** | **no politeness or rate-limit policy exists**, and none has been measured | item 4 §4 `R4` | RECORD |
| **DB-1** | **no persistence exists** — no schema, no table, no migration — so every growth figure is a projection against a store that has never held a row | item 5 §5 | RECORD |
| **DB-2** | **the plan's ceiling was never compared against the growth model**, because a correction in §15 never reached §8 | item 5 §2 | RECORD |
| **DB-3** | **the Free plan has three limits and any one suspends compute. Only storage is modelled**; egress and compute are not | item 5 §4 | RECORD |
| **CS-1** | the corpus manifest **cannot verify itself unaided** — one entry's hash field is a pointer, its size is another page's figure, and the size field is string length under a name that says bytes | item 6 §2.3 | RECORD |
| **CS-2** | the **34 exhibit copies are pinned by commit SHA only**; no content hash, so an edited copy would go unnoticed | item 6 §2.4 | RECORD |
| **CS-3** | **the acceptance test has never been run** — attempted 11 Sep and **NOT RUNNABLE**: nothing implements the contract. `bin/acceptance-test.mjs` is a different instrument (corridor Gate-A splice, verdict KEEP/REJECT) | `CASE_STUDY_01_RUN_01.md` §2 | RECORD |
| **CS-4** | **no runner exists that reads the corpus AND the four exhibits and scores 6/6 + 0/3** | same §6 | RECORD |
| **CS-5** | 🔴 **RED 2 has no frozen input** — *"live-confirmed"* only, no exhibit, no corpus page. **A frozen test with one unfrozen input is not frozen.** ⏳ **AND IT HAS A CLOCK: the day that page is fixed, the defect is unreproducible FOR EVER and the Case Study is capped at 5/6 — a permanent FAIL with no engine cause.** Two ways out, **both the owner's: (a) freeze a snapshot — one fetch, before the page is fixed; (b) remove RED 2 formally, pass mark becomes 5/5 + 0/3.** No fetch was made and no option chosen | `CASE_STUDY_01_RUN_01.md` §3 · `V51_REMEASURE.md` §D | RECORD — **owner ruling; option (a) expires without warning** |
| **DOC-2** | 🔄 **RE-MEASURED against V5.1 §26, which wins: 18 deliverables, and ZERO exist.** The two I had counted as present are **inputs, not deliverables** — V5.1 lists them under *"existing artifacts to ingest rather than rebuild"*. **6 are partly covered under other names; 12 have nothing at all** | `V51_REMEASURE.md` §A | RECORD |
| **GATE-1** | **four of seven gate families have no architectural home**: semantic, cannibalization, technical, cost | item 7 §3 | RECORD |
| **GATE-2** | 🔴 **Gate C is a gate, not a governor.** It judges cost; nothing caps, meters or refuses spend | item 7 §2 | RECORD |
| ~~DOD-MAP-1~~ | ~~the DoD is mapped from a status table, not its own text~~ | ✅ **CLOSED 11 Sep** — the text is at `DOD_FROZEN_TEXT_SOURCE.md`, hash-verified, and the map is rebuilt against §1–§5A | CLOSED |
| **FACT-1** | §5A requires a derived fact to store **its formula and its input fact IDs**. ~~No such field exists~~ 🔄 **SUPERSEDED 14 September 2026 — FALSE since at least 12 September 2026** (`DOC-1`'s sixth instance). `src/facts/lifecycle.mjs`: `makeDerivedFact` stores `derivation: { formula, inputs, inputValues }` — the formula one of the frozen `FORMULAS` (`sum · difference · product · ratio · max · min`), any other refused as *"a formula must be re-executable, not described"* — and throws *"a derived fact must cite the fact_ids of its inputs"*; `recomputeDerived` re-executes it. Both tested in `test/facts-lifecycle.test.mjs`, and `CHECKLIST_STATUS.md` row 17 recorded them on 12 Sep. **What was really missing, closed 14 Sep:** a derived record could not live in the registry (now kind `derived`, laws F28 and F29), nothing detected a changed input (now `detectInputChanges`), and the derivation read the clock (now it reads none). 🔴 **What the stale line cost:** a whole command — row 17, 14 Sep — written against a capability that already existed, and refused before any of it was built | `DOD_MAP_AGAINST_TEXT.md` §1 · superseded by `src/facts/lifecycle.mjs` and `test/derived-fact-registry.test.mjs` | ~~RECORD~~ **SUPERSEDED 14 Sep 2026** |
| **FACT-2** | §5A requires distinguishing **verified / derived / inference / recommendation / UNKNOWN**. The registry distinguishes acquisition confidence instead; **"derived" and "recommendation" have no representation**. 🔄 **NARROWED 14 September 2026.** Until today the `derived` half was true only **in the registry** — the constructor, recompute and the dependency walk existed outside it (`FACT-1`). It now has one there: `FACT_KINDS` `primary · derived`, judged by F28 and F29. **Still true, and not touched:** `recommendation` and `inference` have no representation in the registry | same §1 | RECORD — `derived` half closed 14 Sep 2026; `recommendation` and `inference` OPEN |
| **FACT-3** | §5A requires conflicts to be **detected**. One can be **recorded**, and one is — **written by hand.** Nothing detects one | same §3 | RECORD |
| **GATE-3** | §4: *"must not lower a frozen gate merely to increase page output"* — **nothing enforces it.** The thresholds are constants; only a written record has ever held them | same §2 | RECORD |
| **GATE-4** | §4 asks for a **specific** URL justification; the check accepts **any non-empty string** — a single character passes. 🔄 **14 September 2026 (Amendment 5, row 61): the MEASURABLE half is enforced in the page-construction path** — `src/gate-a/why-this-url.mjs`: the rationale is present · names a human need beyond the variant · is not a one-variable template · is not near-identical to any sibling's. 🔴 **The residue stays OPEN:** specificity beyond those four is not judged, and `runGateA`'s non-empty check is unchanged for its other callers | same §2 | RECORD — measurable half closed in the construction path; residue OPEN |
| **PAGE-1** | §3 makes five gates a **conjunction** before a new page. Two do not exist, so **the precondition for creating any page is unsatisfiable today** | same §4 | RECORD |
| **SUB-1** | 🔴 **our own submitter sends `/sitemap.xml` for three products where it 404s.** `almi-monitor` was corrected for this and the submitter was not | architecture report §12 blocker 10, §11a.2 | RECORD |

**24 capability gaps.**

---

# 2 · PRODUCT DATA GAPS

| id | gap | evidence | state |
|---|---|---|---|
| **B3** | **licence terms unread for 7 registry sources** — a **publish** blocker, not an engine blocker | `node bin/facts.mjs census` → `UNREAD 7`; a test counts the debt | RECORD |
| **B4** | **the registry covers 2 of 12 declared variants** — which is why the distinguishing census reports `UNCOMPARABLE 14 of 14`, **correctly** | `coverage()` → declared 12, built 2, missing 10 | RECORD |
| **PD-SEO-1** | `almiarchitect` declares `/sitemap.xml` in `robots.txt`; **both** that path and `/sitemap-index.xml` return **404** | items 1–2 §5.2, both paths probed | RECORD |
| **PD-SEO-2** | 🔴 `almihq` declares **no sitemap** and serves **`200 text/html` byte-identical to its own homepage** at both sitemap paths, **zero `<loc>`** | items 1–2 §5.2, SHA-256 of both bodies compared | RECORD |
| **PD-SEO-3** | `www.almiworld.com` declares an **underscore** sitemap **on a different host**, while its own `/sitemap-index.xml` 404s | items 1–2 §5.2 | RECORD |
| **PD-DNS-1** | three referenced hosts **fail DNS** — `almipathway`, `almixyz`, `swedish` | items 1–2 §5.1 | RECORD |
| **PD-STALE-1** | `almioet`'s `sitemap-nationality-nurse.xml` is a **stale submission, 404 since at least 21 August** | architecture report §11a.4 | RECORD |
| **PD-COST-1** | 🔴 **AlmiOET's 240,328 pSEO pages declare `revalidate = false` and are served dynamically with caching off** — every crawler visit runs a function | architecture report §11b | RECORD — **a live product cost; the owner decides** |
| **PD-AI-1** | **12 products' `robots.txt` disallow the AI crawlers an AI-visibility programme would measure**, including `Google-Extended`, `GPTBot`, `ClaudeBot` | architecture report §4.2 | RECORD — **policy, not a defect. The owner decides** |
| **PD-FUNNEL-1** | **26 of 27 products have no funnel instrumentation**, so visibility can be tied to traffic but not to conversion outside one product | items 1–2 §4.3 | RECORD |

**10 product data gaps.**

---

# 2A · 🔴 PHASE 1 IS BLOCKED — THE SPEC'S OWN SENTENCE

**`V51_MASTER_BUILD_COMMAND_SOURCE.md`, line 556, verbatim:**

> *"**Phase 1 cannot begin while Search Console coverage/authorization, analytics availability,
> worker execution layer, database isolation/capacity, and reusable existing artifacts remain
> UNKNOWN or UNDECIDED.** Record each answer with a date."*

| condition | state, 11 Sep 2026 | row | who |
|---|---|---|---|
| Search Console coverage / authorization | ~~🔴 **UNKNOWN** — the Domain property exists; **read-only API access is not granted**~~ ✅ **ANSWERED — read-only API access GRANTED 11 September 2026**, and used: nine `gsc-ingest` runs, 2026-09-11T22:58Z → 2026-09-12T23:25Z. Recorded here 13 September — two days late (`DOC-1`) | **`B1`** — CLOSED | **owner** |
| analytics availability | 🟡 **answered, and adverse** — funnel evidence on **1 of 27** products; no page-view analytics anywhere | `ANL-1` | recorded |
| worker execution layer | 🔴 **UNDECIDED** — options, costs, limits and risks measured and written; **only the decision is missing** | `CRW-1` | **owner** |
| database isolation / capacity | 🟡 isolation from product DBs **PASS** (Owner Ruling 1) · 🔴 **capacity: the v0.1 workload needs 288 % of the Free plan in month one**, and preview shares it | `DB-2`, `DB-3`, **`B2`** | **owner** |
| reusable existing artifacts | ✅ **answered** — 11 assets named with their state | items 1–2 §6 | recorded |

> ## 🔴 PHASE 1 IS BLOCKED. TWO OF THE FIVE ARE UNKNOWN OR UNDECIDED, AND BOTH ARE OWNER DECISIONS.
>
> 🔄 **13 September 2026 — this count was two, and the Search Console half of it is answered** (`B1` CLOSED, §3). The
> worker execution layer is the one of the two this register still records UNDECIDED; whether it has since been
> decided is **not re-measured here**.
>
> **No attempt was made to resolve them, route around them, or start Phase 1 anyway.**

---

# 3 · OWNER ACTION — neither register, and not a request

| id | item | why it is neither | who |
|---|---|---|---|
| ~~**B1**~~ | ~~**read-only Search Console API access.** The Domain property **already exists**; this is the one thing open~~ | ✅ **CLOSED 13 September 2026 — granted 11 September 2026.** Evidence: `bin/gsc-ingest.mjs` states the grant in its own header (*"a property the owner granted on 11 September 2026"*); `runs/cost/ledger.jsonl` records **nine `gsc-ingest` runs** from 2026-09-11T22:58Z to 2026-09-12T23:25Z *(the owner's Amendment 4 brief says eight; the ledger's count is the one recorded)*; `runs/evidence/evidence.jsonl` holds their rows — at 2026-09-12T23:25Z query 337 · query-page 574 · country 126 · country-query 388, and page rows 1,525 at 22:06Z. 🔴 **What the stale row cost:** it made the discovery rows look impossible to start while their input sat in the store for two days — a further instance of `DOC-1` | **owner** |
| **B2** | **preview/production database split** — the Neon branch **and** moving `DATABASE_*` off "All Environments" | ⚠️ **either half alone changes nothing and looks solved.** Deferred by the owner's 10 September ruling, with a written trigger: **before the first migration that creates a table worth losing** | **owner** |

---

# 4 · PREREQUISITES

| # | prerequisite | for | who |
|---|---|---|---|
| ~~**PRQ-1**~~ | ~~read-only Search Console API access~~ ✅ **CLOSED 13 September 2026 — granted 11 September 2026**, nine ingest runs recorded (evidence under `B1`, §3). The demand evidence it gates exists. The six UNKNOWNs in §5 marked *after PRQ-1* (U6, U7, U-SEO-1, U-SEO-2, U-DEP-2, U-GSC-1) are **no longer blocked by it — and none is answered by this closure** | any demand evidence, S11 | owner |
| **PRQ-2** | preview/production database separation, **both halves** | any AlmiVisibility persistence | owner |
| **PRQ-3** | first-party analytics on at least one more host | outcome/funnel learning | owner decides, then later phase |
| **PRQ-4** | a deployment surface that serves something intended | the operator interface | later phase |
| **PRQ-5** | a persistence store | growth/retention | later phase, after PRQ-2 |
| **PRQ-6** | licence terms read for 7 sources | **publish** of any page citing them | owner, or a person with a browser |
| **PRQ-7** | per-variant claim supply for 10 of 12 variants | a cohort larger than two | connected product |
| **PRQ-8** | a test gate before merge | safe landing — **merges deploy** | later phase |
| **PRQ-9** | crawler/worker hosting | S4/S5 at estate scale | owner (cost), later phase (build) |

---

## TECHNICAL-OWNER RULING — THE CRAWLER'S TWO FLAGS SATISFY "DRY-RUN BY DEFAULT"

**12 September 2026 · beta-g, as technical owner.**

> The crawler writes page bodies behind `--live` AND `--i-have-the-owners-green`, not behind
> `--confirm`. **THIS SATISFIES "dry-run by default."** The boundary's words name `--confirm`, but
> its PURPOSE is that nothing is written until a human says so explicitly, and two flags — one of
> them named for the owner's own green — say that MORE firmly than `--confirm` does, not less.

**Reason:** the purpose of the rule, not its letter. **Consequence recorded with it:** the register of
permitted writers (`config/permitted-page-writers.mjs`) now names, **per writer, which flag gates
it** (`gateFlags`), and a test checks each named flag is really parsed by that writer — so the
variation is visible and the next reader does not read the letter against the intent.

---

## TECHNICAL-OWNER RULING — ITEM 45's SCOPE BEGINS WHEN THE LEDGER EXISTED

**12 September 2026 · beta-g, as technical owner.**

> Item 45's boundary reads "INPUT: A RUN that spends money, provider calls, crawl budget or
> founder time." It does not say "all history." **A COMPONENT CANNOT BE FAILED FOR A PERIOD BEFORE
> IT EXISTED.** The ledger did not exist during those eight runs. Item 45's scope is runs **FROM THE
> LEDGER'S EXISTENCE ONWARD.**

**The goalpost check, recorded with the ruling so a later reader can judge it:** the owner checked
this against the rule that a bar may not move to reach a pass. **The bar is unchanged** — one real
run, all four costs, recorded. **Only the period is clarified.** The question for that reader is
whether a post was moved or drawn; the evidence for "drawn" is that the boundary's own INPUT names
*a run*, and that no ledger could have recorded a run before it existed.

**The scope start, measured, not chosen:** the ledger first exists in commit `8c9d68b`, committed
**2026-09-12T23:03:09Z** (PR #52). Runs that started before that instant are out of item 45's scope;
their losses are recorded permanently below and are never estimated.

---

## P-OET-1 — FOUR OET FACTS: PARKED, NOT VERIFIED

**Recorded 13 September 2026, on beta-g's instruction.**

| fact | state in the registry (unchanged) |
|---|---|
| `oet.grade-bands-0-500` | UNVERIFIED · UNKNOWN (SOURCE_UNREACHABLE) |
| `oet.writing-task-type.profession=nursing` | UNVERIFIED · UNKNOWN (SOURCE_UNREACHABLE) |
| `oet.speaking-roleplay-setting.profession=nursing` | UNVERIFIED · UNKNOWN (SOURCE_UNREACHABLE) |
| `oet.content-licence-permits-stored-quotation` | UNVERIFIED · UNKNOWN (SOURCE_UNREACHABLE) |

**Why they could now be verified:** each was UNKNOWN only because oet.com returned 403 to beta-g's fetcher on
12 September, and the source-integrity link check of 13 September got HTTP 200 from the same host.

**Why they are PARKED, in beta-g's words:** item 15 is already VERIFIED-PASS, these four move no row, and
"verifying them because the door opened is not the same as verifying them because they are next." The
opportunity is postponed, not lost.

⚠️ **Disclosed, because it happened:** an earlier version of the same night's brief asked for these pages to be
fetched for a verifier, and the replacement brief that parked them arrived after that fetch had run. At
2026-09-13T02:19:52Z a bounded fetch made **7 GET requests** to oet.com (hard cap 12, 1 per second, external host
only): all five pages returned HTTP 200, and the normalised-text fingerprint of each of the four CITED pages was
**unchanged** since the registry's fingerprint of 2026-09-10. **No verificationState was read as a verdict or
changed. No OET wording was stored.** Its outputs were NOT committed; the one cost-ledger line it wrote
(`source-fetch:2026-09-13T02:19:52.573Z`) is kept, because the ledger is append-only and the requests were real.

**Status:** ⏸️ PARKED — to be verified when they are next, by beta-g, who judges; this engine fetches.

### OWNER RULING — 13 SEPTEMBER 2026 — THE FOUR UN-PARKED FOR ITEM 50 ONLY (recorded verbatim, before it was applied)

⚠️ **Source of this text:** beta-g's brief of 13 September 2026 ("ITEM 50: THE REAL TRANSITION TEST"), Part 0,
which relays the owner's ruling. No document written by the owner himself was supplied, so what is recorded
here is that relay, word for word.

> He un-parked the four OET facts FOR THIS TEST ONLY, on these conditions:
>   - do not unnecessarily store or copy the original claim text
>   - use the existing safe status/hash/provenance mechanism
>   - verify the source genuinely
>   - evidence supports it -> UNKNOWN becomes the appropriate verified state
>   - evidence is insufficient -> it STAYS UNKNOWN
>   - 🔴 DO NOT FORCE A RESULT MERELY TO PASS ITEM 50
>   - if after genuine verification nothing can transition, RECORD THE ACTUAL RESULT.
>     Do not invent or change data to turn a test green.
>   - no connected-product modification, no publishing, no scope expansion.

**Status of P-OET-1:** ✅ **RETIRED — the four are no longer parked.** Verdicts ingested 13 September 2026; see
*ITEM 50 — THE REAL TRANSITION TEST* below.

---

## D-SEC-1 · D-INST-1 · D-GATEA-1 — FOUND WHILE RUNNING THE QUEUE, 13 SEPTEMBER 2026

| id | what | status |
|---|---|---|
| **D-SEC-1** | 🔴 **A SECRET LEAK, FOUND BY EXECUTION.** The Search Console adapter parsed the key file with a bare `JSON.parse`. On a key file that is not JSON, the error QUOTES the text it failed on — its first characters in the message, and, uncaught, Node prints the whole first line to stderr. The executing leak test (`test/secret-leak.test.mjs`), with a PLANTED fake secret, went red in-process and through the CLI (`runs/audit/item-55-leak-test-red-before-fix-2026-09-13.txt`). A manual grep would never have found it: the leaking code is Node's, not ours. | ✅ FIXED — the parse is caught and rethrown with no quote, no message and no cause; the test re-run passed; a sabotage that logs the key turns it red. |
| **D-INST-1** | 🔴 **TWO INSTRUMENTS DISAGREED ABOUT ONE POPULATION.** 340 vs 341 pages with no inbound links over the same bodies. Both were wrong: one counted per observation (5 pages twice), one ignored links from other hosts (6 sub-site homes linked from 359–393 pages). Raised as 11 Issues in `runs/audit/instrument-findings.jsonl`, one per page. | ✅ FIXED — one definition (`src/crawl/inbound.mjs`), one stored graph, both runners agree on 335; the Issues are closed on the runners' own recorded output. |
| **D-GATEA-1** | ⚠️ **GATE A CANNOT MEASURE OVERLAP IN A GROUP OF TWO.** Its shell for two pages is their intersection, so two identical pages subtract to nothing and score 0 — a duplicate pair reads as perfectly distinct. Found by the firing fixture for item 25's overlap measurement. 10 of the 389 existing pages sit in two-page groups. | ✅ FIXED 13 Sep 2026. **Cause:** the shell was learned from the very pages being compared — in a pair, their duplicated body IS "what nearly every page shares"; in a single page, the shell is the page. **Fix:** a group needs 3 pages to learn its own shell (`shellFor`, MIN_PAGES_FOR_OWN_SHELL); a smaller group borrows it from the other pages of its own site, else it is UNMEASURABLE; Gate A's publish run never keeps a pair on an overlap it could not measure. RED-proved both directions on the old code. **Effect on the real 389 — 47 pages moved:** the 10 pair pages became MEASURED (6 above 0.40: residence-permit 0.699, study-in-italy 0.741, pte-for 0.880; 4 within: 0.130 and 0.166); 31 single pages went from 0 unique words to a real count; 6 sub-site homes, the only crawled page on their site, are UNMEASURABLE. **Item 12 is not affected:** its near-duplicate check is a different metric (structural body extraction compared against every crawled page) — proved by an identical-pair fixture that fires. |
| **E-CL-1** | **My own errors in this run (Claude).** (a) The first CLI leak case PASSED WITHOUT TESTING ANYTHING: its network stub was an inline `NODE_OPTIONS` data URL, which splits on spaces, so the child died before reading the key. (b) I called `runs/nursing-chain/nursing.html` "the captured live /nursing page" — it was GENERATED by this engine from the registry on 10 September. (c) The leak test's LENGTH clause was BLIND: it computed the secret's lengths and never searched for them, so a sabotage that logged the key's length PASSED. All three caught before any verdict rested on them — (c) by the RED harness, which is what it is for. | ✅ corrected — the CLI case proves it reached the key before its silence counts; the generated page is labelled a control and never counted as an existing page; the planted secret is padded to an unmistakable length that every assertion searches for, and the length sabotage now turns the test red. |

---

## E-BG-1, E-BG-2, E-BG-3 — THREE ERRORS IN BETA-G'S OWN BRIEFS, AND THEIR MEASURED CORRECTIONS

**Recorded 13 September 2026, attributed to beta-g (technical owner), at beta-g's own instruction:
"My errors belong in the same register as everyone's."**

| id | the error | the measured correction |
|---|---|---|
| **E-BG-1** | The brief of 13 September said *"a row that nearly passes is a row that failed."* Taken literally it turns FAILED into "not good enough yet" — which TESTABLE-NOW already says. | **Ruling 0A:** FAILED means the boundary's FAILURE condition was met, and nothing else. Amendment 2 stands unchanged; items 13 and 26 stayed TESTABLE-NOW. **Ruling 0B:** a TESTABLE-NOW row that was RUN and fell short records `attemptCount`, `lastAttempt` and the SPECIFIC `gap` — enforced by `assertLawful`. |
| **E-BG-2** | Item 16 was named as unblocked because "six real conflicts now exist." | The six conflicts exist, but each one's second value is on a page we do not hold (D-FACT-1): there are not two real **records**. Item 16 did not move. |
| **E-BG-3** | Items 1 and 54 were named as half-unblocked because "a cost ledger now exists." | The ledger exists, but **no cost entry is tied to a product**, and **no learning record exists at all**. Half an input is not an input. Neither row moved. |

**E-BG-2 and E-BG-3 share one cause, in beta-g's words: mistaking "the thing was built" for "the input
exists."**

---

## D-KEY-1 — THE MEASUREMENT KEY COULD NOT SEE A CHANGED REDIRECT DESTINATION

**Recorded 13 September 2026. Defect in the SPECIFICATION — attributed to beta-g (technical owner), in beta-g's own words: "The cause is my specification."**

**What:** `measurement_key` was specified as `sha256(target + method + content_sha256)`, where
`target` is the URL **requested**, not the URL **reached**. A redirect that changed destination
while serving byte-identical bytes produced the same key, so the store recorded a re-sighting and
the new destination left no record. Found by Claude on 13 September 2026, while writing the
mechanics control for the item 11 replay (#56).

**Fixed:** the key now takes the **journey** — the final URL and the redirect chain — whenever a
request did not end where it started (`journeyOf` in `src/crawl/crawler.mjs`, `measurementKey` in
`src/evidence/ids.mjs`). Proved through the production crawler and store in all three directions
(`test/redirect-journey.test.mjs`):
same body + same destination → re-sighting; same body + **different** destination → new
observation; different body + same destination → new observation. **Not over-corrected:** an
unredirected page keeps its exact stored key. Re-keying the real 12 September run changes the key
of **7 of 394** pages (the 7 that redirected) and no other. Those 7 will each record **one** new
observation against the old key the next time they are crawled: a one-time, bounded consequence,
stated here. The #56 replay, re-run with the corrected key, is unchanged:
389 unchanged → 0 new, 5 changed → 5 new, 394/394 page_ids identical
(`runs/replay/replay-2026-09-13-journey-key.json`).

**Status:** ✅ FIXED — with one declared limit, D-KEY-2.

## D-KEY-2 — THE REDIRECT CHAIN IS NOT CAPTURED

**Recorded 13 September 2026.** The fetcher follows redirects with `redirect: "follow"`, which reports
where a request ENDED but not the hops in between, so `redirect_chain` is `[]` on every record. The
chain participates in the key the moment it is captured. Until then, a change of an **intermediate hop**
that keeps the same final URL and the same bytes is still invisible. Capturing hops means following
redirects by hand (robots and per-host caps on every hop), which is a crawler change and is not made
here. Item 10's INPUT names "redirect chains", so this also stands between item 10 and its test.

**Status:** 🔴 OPEN — declared, not worked around.

---

## D-CRW-5 — A SECOND LIVE CRAWL: GRANTED AND UNUSED

**Recorded 13 September 2026.** The owner's green for a second live crawl (`D-CRW-5`) was granted
and has **not** been spent. ⚠️ **The date it was granted is not recorded in this repository.**

**Why it was not used** (beta-g, withdrawing the brief that would have spent it): items 11, 42 and
48 test **ENGINE PROPERTIES**, not any one product — identity across runs, re-testing a changed
target, the same job twice. None needs the live internet, and a live second run would be worse:

- a live page changing naturally **muddies item 11** — a `page_id` that held on a page that never
  moved proves nothing about the engine;
- item 42 needs a **changed** target, and the live site might not have changed at all, leaving it
  unprovable through no fault of the engine;
- it costs money and minutes to learn less.

They are proved instead by a **local replay of the 12 September run's own captured bodies**
(`bin/replay-crawl.mjs`, evidence in `runs/replay/`), which does **not** prove live reachability.

**Status:** 🟢 **GRANTED AND UNUSED** — available when a live run is genuinely needed, which will be
after the renderer exists. **An unused green is not progress and moves no row.**

---

## R-REND-1 — THE RENDERER EXISTS: A CAPABILITY, NOT A DETECTOR

**Recorded 13 September 2026.** Built openly under Owner Ruling 7's distinction. `src/render/renderer.mjs`
renders a STORED body in headless Chromium (`playwright-core` 1.62.1, Chromium 151.0.7922.34) and
records what it saw. It raises no issue, judges no page and compares nothing against the served HTML.

**Offline by construction, and proved:** the document is served from 127.0.0.1; every other request
— any host, any port, 127.0.0.1 included — is REFUSED at interception and recorded by host; Chromium
resolves no name but 127.0.0.1; every browser response is asked for its server address. A live test
puts a sentinel server on another local port and shows it receives 0 requests, with a control
proving the sentinel would count one.

**Run over the 394 committed bodies** (`bin/render-archive.mjs --confirm`, transcript
`runs/render/render-run-2026-09-13.txt`) — bounds: 15,000 ms per page, 30 min wall clock, page cap 500,
concurrency 1; none hit:

| COMPLETE | PARTIAL | FAILED | refused requests | egress | rendered hash ≠ raw hash |
|---|---|---|---|---|---|
| 0 | 394 | 0 | 10,222, to 19 hosts | 0 | 394 of 394 |

PARTIAL means at least one refusal, which is a fact about **this environment**, not about any page
(LAW-ABSENT-1). The differ count is reported and **nothing about which pages, or why, was looked at**.
The raw observations and raw archive are byte-identical before and after (sha256 pinned in
`test/renderer.test.mjs`); the 394 RENDERED observations sit beside them in
`runs/render/rendered-2026-09-13.jsonl`. The rendered DOMs (39,886,350 bytes → 661,614 compressed) are
**not committed**: regenerable, and underpinning no VERIFIED-PASS row. **Proposed, not done:**
committing that archive, if the owner wants the DOMs to outlive this machine.

**Cost:** installing `playwright-core` — 1 registry request, tarball from the local npm cache, 2.342 s,
money UNKNOWN (not measurable); the browser build was already cached (installed 2026-09-01 for other
work), so this run downloaded 0 browser bytes. The render — money 0 (measured, basis stated), 0
provider calls, 0 crawl budget, 245.527 s. **D-CRW-5 stays unspent.**

**Rows:** none moved. Item 10's deferred half — the post-JavaScript DOM — is now **CAPABLE**, not
impossible; it is still DEFERRED by Ruling 7 until an owner rules otherwise. Item 52's rendering
trigger has a renderer to point at; the detector that compares source with render is **not written**
and is the sealed exam rule's to write.

**E-CL-2 (Claude), found by CI on this PR:** the "raw untouched" test first pinned the sha256 of the
raw `.jsonl` *as checked out* — CRLF on the Windows machine, LF on the Linux runner — so an unchanged
file failed in CI while passing locally and in a local depth-1 clone (also CRLF). Corrected to pin the
git blob ids from main (`9728f19`), which do not depend on line endings; the binary archive keeps its
byte sha256. The run's own before/after comparison was on one machine and was never affected.

**Status:** 🟢 BUILT — capability only.

---

## OWNER RULING — 13 SEPTEMBER 2026 — THE COMPLETION LAW (frozen)

**Frozen verbatim** as `OWNER_RULING_2026-09-13_COMPLETION_LAW.md`, from
`ALMIVISIBILITY_OWNER_REPLY_CURRENT_STATUS_AND_NEXT_STEPS.docx` (sha256 `fcc181f0…a680c`), which ends
*"OWNER RULING — FREEZE THIS INTERPRETATION"*. Verified by `tools/verify-owner-ruling.mjs` against
**git's stored blob** `33338a81c70791fbf03f71db10dba203c6771ca9` — never the checked-out bytes, which is
the trap `E-CL-2` fell into — and against the body's sha256 `40cb3ebc…9711d`. RED-proved: one corrupted
byte → exit 1; restored → exit 0 (`runs/owner-verification/ruling-verifier-red-2026-09-13.txt`).

**E-CL-3 (Claude), found by CI on this PR — the same family as E-CL-2, one layer down.** A test asserted
that the ruling's text *with CRLF line endings* hashes to the pinned blob. It passed on Windows and failed
on the Linux runner: `git hash-object` converts CRLF only where `core.autocrlf=true`, which this Windows
machine sets and the runner does not. The verifier itself was right on both — each platform checks the
file out in the form its own git stores back. The test now tells git the Windows condition explicitly
(`-c core.autocrlf=true` for the CRLF bytes, `false` for the LF bytes), so it proves the true claim
everywhere instead of a machine-specific one.

**Precedence — all three bind:**

| document | says |
|---|---|
| `KEY_FEATURE_CHECKLIST_SOURCE.md` | **WHAT** the 58 features are |
| `PASS_BOUNDARIES_SOURCE.md` + Amendments 1 and 2 | **WHEN** a row may tick |
| **this ruling** | **HOW THE PATH TO DONE IS WALKED** |

**The completion loop, as law:**
**BUILD / FIX → TARGETED VERIFY → EVIDENCE → CLOSE → NEXT ITEM → FINAL INDEPENDENT AUDIT → DONE.**

### 1D — THE FIVE REOPEN GROUNDS, COMPARED WORD FOR WORD — AND HIS WORDING WON

| # | what the ledger enforced until today (the checklist's sentence) | **the owner's wording (§6)** | same? |
|---|---|---|---|
| 1 | concrete contradictory evidence | **concrete contradictory evidence** | same |
| 2 | a real regression | **real regression** | same |
| 3 | **new authoritative evidence** | **authoritative requirement change** | 🔴 **DIFFERENT** — new evidence is not a changed requirement |
| 4 | **a security/data-safety risk** | **safety/data risk** | 🔴 **DIFFERENT** — his is not limited to security |
| 5 | an owner-approved scope change | **owner-approved scope change** | same |

Reopening a closed item is part of *how the path is walked*, so **his wording wins**: the enforced enum
is now `CONCRETE_CONTRADICTORY_EVIDENCE · REAL_REGRESSION · AUTHORITATIVE_REQUIREMENT_CHANGE ·
SAFETY_OR_DATA_RISK · OWNER_APPROVED_SCOPE_CHANGE` (`src/checklist/classification.mjs`). The checklist's
sentence is kept quoted beside it as the text it replaced. No existing move used either changed ground —
item 48's reopen was *concrete contradictory evidence*. beta-g's brief listed the five as the owner wrote
them ("safety or data risk" for his "safety/data risk").

---

## 🔴 THE ONE QUESTION — WHICH FILE SOMETHING GOES IN (rule, 13 September 2026)

> ### DOES SOME ROW'S FROZEN BOUNDARY REQUIRE IT?
> **yes → the completion path. no → `POST_DONE_BACKLOG.md`.**

A defect that breaches a boundary is on the path; an improvement that would be nice is not. The answer
**names the row and quotes the boundary** — an answer that cannot is a feeling, and this rule exists so it
is applied rather than felt. Required by the owner's ruling §2 (*"optional improvements … current
completion path mein inject mat karo"*) and §6 (*"Optional ideas POST-DONE backlog mein jayengi"*).

---

## 🔴 STANDING INSTRUCTION — FROM beta-g (technical owner), TO CLAUDE — 13 SEPTEMBER 2026

Recorded under beta-g's name, at beta-g's instruction:

> **Every part of every brief I send must name the row whose frozen boundary requires it. A part that
> names no row is scope creep wearing a helpful face.**
>
> **If a brief of mine contains a part that names no row — and is not recording an owner ruling — REFUSE
> THAT PART AND SAY SO IN YOUR REPORT. Not quietly, and not kindly.**

The one exception is named so it cannot be stretched: **a part that records an OWNER RULING is the law
itself and names no row.**

---

## E-BG-4 — THE BACKLOG BRIEF LISTED D-KEY-2 FOR THE BACKLOG; ITS OWN RULE SENDS IT BACK

**Recorded 13 September 2026, attributed to beta-g.** The brief that opened `POST_DONE_BACKLOG.md` named
`D-KEY-2` (redirect hops are not captured) as an entry. Asked the one question, it answers **yes**: item
10's v0.1 half, `PASS_BOUNDARIES_AMENDMENT_1.md`, INPUT — *"the crawled corpus, its served HTML and
headers, **redirect chains**, the edge graph …"*. A row's frozen boundary names it, so **D-KEY-2 stays on
the completion path**, blocking item 10, and the backlog records it under *listed and refused*. The rule
was applied, not the list.

---

## ITEM 56 — VERIFIED BY THE OWNER, AND THE FINDING HE OVERRULED

**13 September 2026. Item 56 → VERIFIED-PASS by OWNER VERIFICATION** — the only route that may set it
(owner ruling §4; `OWNER_VERIFIED_ITEMS` in `src/checklist/classification.mjs`, RED-proved in
`test/item-56-owner-verification.test.mjs`). His criteria, in his words: *"PASS ka sawal khoobsurti ka
nahi: critical information readable ho, workflow samajh aaye, controls/links usable hon, aur koi
clipping/overlap/broken critical view na ho."* Evidence: four screenshots committed beside the record,
`runs/owner-verification/item-56-2026-09-13/`, pinned by git blob.

| | |
|---|---|
| **F-56-1 · the finding, as raised by beta-g** | the cost ledger's lines extend past a narrow viewport and are reached by **horizontal scrolling** (`item56-narrow-3`, `-4`) |
| **the owner's ruling on it** | **NOT CLIPPING** — the content scrolls, nothing is lost, the view is not broken |
| **where it went** | `POST_DONE_BACKLOG.md` **PD-1** — an optional improvement, not a defect, not on the path |

A finding the owner overruled is still a finding that was raised, and it stays here.

⚠️ **Stated so it is not misread:** all four screenshots are at a **narrow** width (~750 px). The
boundary's EVIDENCE is *"the walk, recorded, at both widths"*; the desktop half rests on the owner's
verification itself and has **no screenshot in the record**.

---

## ITEM 9 — BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE

By the owner's ruling §3, applied as written: verify what Search Console and owned evidence can prove;
the rest is **BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE**; do not fabricate, infer or expand scope; do
not touch a connected product to turn a checklist green. The row now carries its **missing evidence**,
its **blocker**, its **future unlock condition**, and his sentence: *"Yeh status AlmiVisibility ki
machinery ki automatic failure declaration nahi hai."* — this is not the machinery declaring failure; six
of seven dimensions are ingested and complete. No instrumentation was added anywhere.

---

## R-REND-2 — THE TRAP AHEAD OF THE DETECTOR · THE COMMIT TRIGGER · ITEM 10 STAYS DEFERRED

**Recorded 13 September 2026 — before any source-versus-render check exists, because it is not
convenient later.** Rows **10** and **52**.

### 🔴 6A — "394 OF 394 RENDERED HASHES DIFFER FROM RAW" IS NOT INTERPRETABLE

Every one of the 394 offline renders is **PARTIAL**, because every page asked for something the renderer
refused. So the difference between a rendered hash and its raw hash mixes two things in one number: **the
page's own behaviour** and **our refusal**. Nothing in the 394 separates them.

> **ANY future source-versus-render detector that reads a PARTIAL render is measuring our own refusals as
> if they were the page's defects.** Whoever writes that detector must confront this first.

This is **LAW-ABSENT-1 applied to rendering**: a script that did not load did not load *here*, and its
absence is a fact about our environment, never a finding about the page.

### 6B — THE COMMIT TRIGGER FOR THE RENDERED HTML

The rendered DOMs are **not committed**, and that is correct: no passing row rests on them. **The day a
row's evidence depends on a rendered body, that body is committed** — because the evidence behind a tick
must outlive the tick. Until then it is `POST_DONE_BACKLOG.md` **PD-4**.

### 6C — ITEM 10's RENDERING CLAUSE STAYS DEFERRED, AND ITEM 52 DOES NOT NEED IT UN-DEFERRED

A renderer existing does **not** un-defer item 10's post-JavaScript half (Owner Ruling 7). And **item 52
does not need that clause un-deferred: item 52 needs DETECTORS**, written under the sealed exam rule —
which is a different thing from a deferred clause of item 10. Recorded so nobody creates work by
confusing the two.

---

## ITEM 47 — PAID PROVIDER CONTROLS, BUILT BEFORE ANY PAID PROVIDER EXISTS (13 September 2026)

The row's NOTE: *"no paid provider exists today. Absence is not a control — the controls must exist before one
does."* Built in `src/cost/paid-provider-gate.mjs` against a **FAKE provider** (a test double — **no account was
opened, no real paid provider was called**):

| control | what refuses | RED proof — removed, and its named test went red |
|---|---|---|
| **OFF BY DEFAULT** | a provider with no authorization | ✅ (also turns control 2's per-provider case and the ledger test red — both exercise it) |
| **EXPLICIT AUTHORIZATION** | anything short of named · per provider · dated · with a reason, a budget and a cap | ✅ |
| **KILL SWITCH** | the very next call once flipped (by a named person, with a reason and a time) | ✅ |
| **BUDGET AND CAP** | the call that WOULD exceed either — before it is made | ✅ cap and budget separately |
| **EVERY REFUSAL IN THE LEDGER** | a refusal with no trace | ✅ removed, and with the colliding id below restored |

Transcript: `runs/cost/paid-provider-controls-red-2026-09-13.txt`. The recorded run
(`runs/cost/paid-provider-controls-2026-09-13.txt`) wrote **five REFUSED entries, one per code**, into
`runs/cost/ledger.jsonl`; 2 calls inside cap and budget reached the fake provider. **Verdict: VERIFIED-PASS.**
⚠️ Declared limit: the gate binds every call made **through** it. No paid provider exists, so there is no
integration to census; the day one is written, its calls go through the gate or item 47 is breached.

### E-CL-4 (Claude) — THE FIRST GATE COULD LOSE A REFUSAL, AND ITS OWN RUN SAID SO

The first refusal id was the clock plus a per-gate counter. Two gates refusing in the same millisecond produced one
id, the ledger kept one entry, and the other refusal **left no trace** — the exact failure 1D forbids. The unit
test passed by timing; the demonstration run's own trace check printed **"3 of 5"** and exited 1. Fixed before
commit: every refused attempt carries its own id, and the test now drives every gate on one frozen clock — with the
old id restored, it goes red.

---

## ITEM 53 — PORTABILITY, PROVED ON A NEUTRAL DECLARED TEST PRODUCT (13 September 2026)

**The declaration** — `products/neutral-test-ferments/product.mjs`, the INPUT the boundary names ("a neutral declared
test product"). **Genuinely unseen:** home fermentation, pages varying by *ferment*, sources at a reserved
`example.org` address that does not exist, its own reserve-everything licence; it shares **no subject, predicate,
axis, variant, source host or licence** with the first product (asserted). Every record is declared test data —
status `lead`, route R4 — so nothing can render or cite it.

**The run** — through the same entry points a real product uses, no edit under `src/`: registered, **4 records from
2 files**, every registry law valid, census, coverage (5 declared, 0 pages), its one gap. Through
`bin/facts.mjs census` under a module/file probe: **no module of the first product loaded, none of its files read**
(the products folder is listed and each descriptor's existence checked — names only).

**The isolation, in that same run** — the first product's **46 records, private licence terms and gaps loaded in the
same process**: no record, id, source host, licence term or gap crossed; every licence accessor refused the first
product's terms; borrowing one failed F17.

**RED** (`runs/audit/item-53-portability-red-2026-09-13.txt`): making registration demand the first product's axis
turned *THE RUN* red; making every product's licence terms visible to every product turned *DURING THAT SAME RUN* red
("first-product licence NMC-6.3 is visible to the neutral product"). **Verdict: VERIFIED-PASS.**

### ITEM 54 — WHAT IT STILL LACKS, STATED PLAINLY

Item 54 needs two declared products **each holding private evidence, facts, costs and learning**. Item 53's run
produced **no cost record and no learning record tied to any product**: the cost ledger names no product (its
entries are runs of the engine — the five new refusal entries included), and no learning module, record or store
exists. **Two of its four classes still do not exist to be tested. It stays BLOCKED-UNKNOWN.**

---

## ITEM 50 — THE REAL TRANSITION TEST (13 September 2026)

**Input.** The four OET records of `P-OET-1`, UNKNOWN since 12 September, un-parked by the owner for this test
only (ruling recorded verbatim above, under P-OET-1). Verdicts by beta-g, 13 September 2026
(`_handoffs/OET_FACT_VERDICTS_2026-09-13.md`), **ingested, not re-judged**:

| record | verdict | what is stored |
|---|---|---|
| `oet.content-licence-permits-stored-quotation` | VERIFIED | source URL · read date · OFFICIAL · 1 element confirmed, 0 not found |
| `oet.writing-task-type.profession=nursing` | VERIFIED | source URL · read date · OFFICIAL · 3 elements confirmed, 0 not found |
| `oet.speaking-roleplay-setting.profession=nursing` | UNKNOWN — *"PARTIAL EVIDENCE — one element confirmed, two not found"* | source URL · read date · OFFICIAL · 1 confirmed, 2 not found |
| `oet.grade-bands-0-500` | UNKNOWN — *"SOURCE UNREACHABLE — three pages returned 403"* | the three URLs and their 403s · OFFICIAL · 0 confirmed |

**🔴 THE SPLIT IS THE SOURCES' DOING, NOT THE TESTER'S.** All four were attempted identically, in one pass, by one
verifier; two sources answered and two did not. That is recorded on each record (`verification.pass`) and asserted,
because it is the only reason the split can serve as evidence at all. **LAW-ABSENT-1:** the 403s are a fact about our
fetcher, not about OET — not verified, and not refuted.

**The guard.** Until today nothing governed a FACT leaving UNKNOWN: the 12 September verdicts were written straight
into the records, and F23 judges only supersessions, of which there are none. So `judgeLeavingUnknown`
(`src/evidence/verdict.mjs`) and **F24** (`src/facts/validate.mjs`) put every record whose verification names the
UNKNOWN it replaces to one question — *may it advance to VERIFIED?* — answered from the evidence (a check dated after
the UNKNOWN · a named checker · an OFFICIAL source actually read · an element confirmed · none not found), never from
the label. The record's declared state must be that answer.

| direction | records | guard | RED proof |
|---|---|---|---|
| evidence arrived → **must transition** | licence, writing | ADVANCED ON A NEW MEASUREMENT | guard made to refuse everything → *50 · DIRECTION ONE* red |
| evidence insufficient → **must be preserved** | speaking, grade bands | ASKED, **REFUSED** — "2 element(s) not found" · "source not read — 3 page(s) refused (403)" | guard made to ignore elements not found → *50 · DIRECTION TWO* red |

Transcript: `runs/audit/item-50-guard-red-2026-09-13.txt`. **2D — 4 real records have now passed through the guard
leaving UNKNOWN (2 advanced, 2 refused). "Polices an empty population" no longer holds.** A record that leaves UNKNOWN
without a judgement is caught against the frozen 12 September baseline of 14 UNKNOWN ids.

**Verdict: item 50 VERIFIED-PASS**, by rule 1's first route (re-run and passed). Item 15 stays VERIFIED-PASS with 34
verified facts (was 32); item 16 does not move.

### D-LIC-1 — THE REPOSITORY STORED OET's WORDING WHILE RECORDING THAT OET FORBIDS IT

Found while asserting *"no OET text anywhere in the repo"*: that assertion was **false before this change began**. Five
phrases of OET's Intellectual Property policy were quoted verbatim — in the licence record's quotability basis
(`products/almi-oet/facts/oet.mjs`), the licence entry (`products/almi-oet/licences.mjs`), `FACT_CACHE_DESIGN.md` and
`PROFESSION_PAGE_CLAIM_INVENTORY.md` — while the same records said the policy forbids storing its content in any
electronic retrieval system. **Removed from the current tree**, restated in our words. `tools/forbidden-text-census.mjs`
holds each phrase **only as a sha256** and scans every tracked text file by word window, so the check never becomes the
breach; a control proves it finds a phrase it holds the hash of. ⚠️ **Git history still contains the five phrases.**
Rewriting history is destructive and is the owner's call, not this change's. ⚠️ The census sees only wording this
repository is known to have quoted.

### E-BG-5 — THE ONE-QUESTION RULE CORRECTED ITS AUTHOR A SECOND TIME

`POST_DONE_BACKLOG.md` PD-2 answered "no row's boundary names these four facts". The boundary does not name facts: item
50's names a POPULATION — *"the guard exercised by real records"* — and FAILED *"the guard polices an empty population"*.
These four were members of it, which the owner then ruled. **PD-2 is retired.** The first correction was E-BG-4
(D-KEY-2 kept on the path by item 10's INPUT); this is the second, and the rule's author asked for both to be recorded.

### 🔴 ITEM 50 REOPENED — 13 SEPTEMBER 2026 — THE OBSERVATION BELOW WAS A DEFECT, AND IT MET THE FAILURE CONDITION

**The tick recorded by #63 is withdrawn by owner-side ruling (beta-g).** `oet.writing-task-type.profession=nursing`
stored `elementsConfirmed: 3, elementsNotFound: 0`, while its own value makes **six** claims: a 45-minute task · a
formal letter · on a matter of the candidate's own profession · worked from case notes · for nursing, a referral,
advice, or transfer or discharge letter · marked against six criteria. Three were confirmed. Its previous state was
UNKNOWN and it was labelled VERIFIED. **A label is wrong — item 50's FAILURE condition, met.** Item 50 is FAILED
(ledger move: VERIFIED-PASS → FAILED, `REOPENED`, concrete contradictory evidence).

**Part 1 — corrected, not re-verified.** No fetch, no network. The record now has the speaking record's shape:
UNKNOWN · PARTIAL_EVIDENCE · *"PARTIAL EVIDENCE — three elements confirmed, three not found"* · the same checker, date,
source URL, tier, `sourceRead` and `previous`. Its value and evidence hash exactly as on main.

| id | error | whose |
|---|---|---|
| **E-BG-6** | In one pass, beta-g applied *"partial confirmation is not verification"* to the speaking record and **not** to the writing record, whose verdict also confirmed only part of its value. | beta-g |
| **E-BG-7** | beta-g approved the #63 merge while item 50's failure condition was already met — the thinness had been flagged in #63's own report. | beta-g |

### D-GUARD-1 — THE GUARD TOOK `elementsNotFound` ON TRUST

**A check fed its own value.** The #63 guard answered "is anything missing?" from the number the verdict supplied, so
a supplied 0 advanced a partly confirmed record. **Fixed by the pattern Amendment 2 proved for item 14 — a declared
register reconciled against a census:**

| limb | rule | law | RED proof — alone, on the real registry |
|---|---|---|---|
| (a)(c) | each governed record DECLARES its elements (`claimElements`); the guard DERIVES confirmed / not confirmed by reconciling them against the keys a verdict NAMES; a supplied count is ignored, and refused once every governed record declares its list | **F25** | `elementsNotFound: 0` added to a record whose list says 3 → only F25 |
| (d) | a verdict key the record does not declare is STALE | **F26** | an undeclared key added to a verdict → only F26 |
| (d) | an element no verdict mentions is **NOT CONFIRMED**, never confirmed by omission — and the record is refused advancement | **F24** | the licence record's only key removed from its verdict → only F24 |
| (e) | a governed record with no element list is a FAILURE | **F27** | the writing record's list stripped → only F27 |

Transcript: `runs/audit/item-50-guard-limbs-red-2026-09-13.txt` — each limb printed exactly its own law code, the file
was restored byte for byte after each (sha256 checked), and the clean run is green.

**Re-run on the corrected population:** 4 real records judged leaving UNKNOWN — **1 advanced** (licence, 1 of 1
element confirmed), **3 refused** (writing 3 of 6 not confirmed · speaking 5 of 6 not confirmed · grade bands 5 of 5,
source not read). Item 50's own test passes. **Verified facts: 33, measured** (32 on 12 September; #63's 34 included
the writing record).

### 🔴 WHY ITEM 50 STAYS FAILED ALTHOUGH ITS TEST PASSES — a finding, for beta-g to rule on

- **32 of the 33 VERIFIED labels never passed through the guard.** Every one reached VERIFIED on 12 September from
  `UNVERIFIED` — a never-checked state the guard itself treats as UNKNOWN — with no `previous`, so F24 never judged it,
  and no element list, so nothing about it was reconciled. #63's baseline covered only the 14 records that were UNKNOWN
  on 12 September, not these.
- **11 of those 32 state more than one claim**, by a declared heuristic (a value of two or more sentences, or two or more
  commas): 12 of the 42 records outside item 50's four look multi-claim, and 11 of those are VERIFIED. The heuristic is a
  measurement of shape, not a judgement of claims; the count is what needs lists.
- That is **the defect class that reopened item 50, unexamined on 11 labels.** "A label is wrong" cannot be shown not-met
  while it stands. Moving item 50 back is a ruling, not a consequence of one passing test.
- **Rule (e)'s reach, stated plainly:** F27 is enforced on the four records item 50 governs. The other multi-claim
  records are counted above, not failed — failing them would need their element lists, which do not yet exist.

### 🔴 ITEM 50 — THE REMAINING POPULATION, RECONCILED (13 SEPTEMBER 2026, later)

**The work #64 named, done as item 50's own boundary (Q1).** The 32 records that reached VERIFIED on 12 September
without ever passing through the guard were each given:

- a declared element list — one short key per claim, derived from the record's **own value text**, never from a
  verdict, a source page or a brief;
- the keys their verdict's **own words** name. 🔴 **A blanket phrase names nothing:** "exact match", "matches item for
  item", "Confirmed" are summaries of a comparison, not the comparison — the same flaw D-GUARD-1 closed for a supplied
  count, and the same precedent as E-BG-6;
- a `previous` of never-checked (they were declared UNVERIFIED under A3 before their 12 September verdict).

**Nothing was re-verified.** No network, no fetch. Every verdict's `verdict`, `note`, dates and recheck fields are
untouched; every value and evidence block hashes exactly as before.

**Two guard changes, stated so they are not mistaken for softening:**

1. **A never-checked record's first dated check is its new measurement.** Without it every one of the 32 was refused on
   a date technicality — "not dated after the UNKNOWN it replaces" when there was no earlier check to be after.
2. **"Was the source read?" is derived for verdicts recorded before that field existed.** A verdict with no `sourceRead`
   whose own words name at least one declared element saw its source; one that names nothing was not read; an explicit
   `sourceRead: false` still refuses. Without it all 32 were refused for a field the 12 September format never had.

**The result, measured:**

| | before | after |
|---|---|---|
| records the guard polices (F24–F27) | 4 | **36** |
| advanced · refused | 1 · 3 | **25 · 11** |
| VERIFIED labels never judged by the guard | 32 | **0** |
| verified facts (census) | 33 | **25** |
| UNKNOWN | 13 | **21** — CONFLICT 6 · INCOMPLETE 4 · PARTIAL_EVIDENCE 10 · SOURCE_UNREACHABLE 1 |

**The 8 that returned to UNKNOWN / PARTIAL_EVIDENCE** (elements named of elements stated): Nigeria red-list
membership 1/2 · Pakistan 1/2 · Kenya amber 1/2 · amber-list rule 1/2 · NMC combining two sittings 1/5 · NMC
qualified-in-English evidence 2/3 · UKVI majority-English country list 0/18 · UKVI India exemption 1/2.

### 🔴 WHY ITEM 50 STAYS FAILED — THE TICK WITHHELD A THIRD TIME

Every label is now reconciled under the rule, and the guard's population is real and non-empty. But **9 of the 25
VERIFIED labels rest on a reading the reconciliation cannot settle**, each named on its record (`elementAmbiguity`):

| records | the unsettled reading |
|---|---|
| PNMC verification fee, foreign · PNMC verification fee, domestic | the value is a bare amount; which destination it applies to is the claim's qualifier, not value text, and the verdict does not name it |
| NMC minimum grade · NMC evidence routes · NMC combining floor · NMC delivery modes (all profession = nursing) | the profession the requirement applies to is the qualifier; the verdict does not name it |
| NMBI recognised English-speaking countries · HCPC accepted English tests | whether the list is also claimed COMPLETE; the verdict names the items, not a completeness check |
| UK Code red-list rule | read as one claim; whom the prohibition binds is not named — read as two, the second is unnamed |

The brief's two instructions pull opposite ways on exactly these — keys from the value text only, and never the
reading that keeps the label — so the reading is recorded, not resolved. **"A label is wrong" cannot be shown not-met
while 9 labels rest on it.** A ruling on qualifiers and list completeness would let item 50 re-run.

⚠️ **One quote in the brief, corrected.** It quoted #64's report as "11 of the 32 state more than one claim"; the report
said that was by a stated shape test (two sentences, or two commas). Counted from the declared element lists themselves,
**23 of the 32 declare more than one element** — more than the heuristic found, which is why a heuristic is not a count.

### ⚠️ FOUR THINGS IN THE REOPEN BRIEF, CHECKED AGAINST THE REPO

1. The speaking record is **one** fact below the writing record, not two. Cosmetic.
2. **The speaking record's own count has the same flaw.** Its value states six claims; its verdict confirmed one, named
   two not found, and was silent on three. Reconciled, that is **5 not confirmed, not 2** — its label (UNKNOWN) is right,
   its count was not. Its `verdictWords` are kept exactly; the guard's derived count is what decides.
3. **Part 1 prescribed counts that Part 2(c) refuses.** The record was corrected as Part 1 says, then its counts were
   replaced by element keys as Part 2 requires; no governed record now carries a count.
4. Line 474 of `PASS_BOUNDARIES_SOURCE.md` is item 50's heading; the EXPECTED and FAILURE wording quoted is exact.

### ⚠️ AN OBSERVATION FOR THE VERIFIER — NOT A RE-JUDGEMENT

The writing verdict confirms three elements (the 45-minute duration, a letter, profession-specific). The stored value
also asserts working from case notes, three letter types and six assessment criteria, which the verdict does not say
were read. By the verdicts file's own rule — *"a fact is one record with one value; if part is unevidenced, the record
is not verified"* — beta-g may wish to confirm those elements were seen. **The verdict is ingested as given; nothing was
overturned.**

---

## 🔴 `D-SWEEP-1` · `D-EXIT-1` · `D-MASK-1` · `D-OUTPUT-1` · `D-SPAWN-1` — RECORDED 16 SEPTEMBER 2026, ON THE OWNER'S RULING, NOTHING FIXED

These five were measured on **16 September 2026** during #99 / #100 (the `bin/build-page.mjs` drain-before-exit
work) and were reported there with no id. The owner ruled on 16 September 2026 that they are recorded here, in this
register only, with these ids — and that **recording a finding does not authorize its fix**: each gets its own
targeted slot only when the owner authorizes it. `D-SWEEP-1` is not `D-GUARD-*`: that id is already
`D-GUARD-1` above (item 50, 13 September 2026), and the defect here is ownership-blind sweep/delete behaviour, of which
`guardDir` is only the implementation. Before any was written, each id was searched for across the tracked files on
`origin/main` (`6927a7d`), the full working tree including untracked files, and git history on all refs: **0 hits for
each**, against **14** for `D-GUARD-1` as the positive control. **No checklist status moved; gap 2 stays OPEN** — these
five do not redefine, narrow or close it.

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-SWEEP-1`** | **`guardDir`'s delete-by-pattern may delete matching content under `runs/export`, `runs/evidence`, `runs/audit` or `runs/cost` that was not created or owned by the current operation** | Evidence as measured: `test/ungated-writers.test.mjs:42-59` — `for (const n of report.added) rmSync(join(dir, n), { force: true });` (the `rmSync` at :56). It filters `isFile()` (:43, :46), so it cannot remove a directory. **NOT a cause of #99:** cross-file interference via `.test-scratch` was excluded by measurement; `guardDir` never targets `.test-scratch` | 🔴 **OPEN** · RECORDED · measured 16 September 2026 · **SEVERITY: UNCLASSIFIED** — this register carries no severity scale; UNCLASSIFIED is **not** LOW (LAW-ABSENT-1). **Recorded only:** nothing in `guardDir` was changed |
| **`D-EXIT-1`** | **`src/product-cli.mjs:127` holds a direct `process.exit(1)` outside any authorised drain helper, in a module the #100 structural guard does not scan** | **MEASURED 2026-09-16 on `origin/main` `6927a7d`.** First reported as `:129`; the measured call site is `:127`, unchanged since `eff0233` (14 Sep 2026), so `:129` was incorrect on #99's tree as well. `:129` appears to be the file's line count (the file is 129 lines), not a call site. The earlier `:129` wording is left as written where it was written; this note connects the two, and they are **one finding, not two**. 🔴 **NOT MEASURED: whether any stdout write precedes that exit. The undrained-exit property is therefore NOT established at this site.** Historical #99 CI causation remains **UNKNOWN** unless separately proved | 🔴 **OPEN** · RECORDED · measured 16 September 2026 · **SEVERITY: UNCLASSIFIED** (not LOW). **Recorded only:** the file was not opened beyond confirming its path and line |
| **`D-MASK-1`** | **#100's structural-guard comment masker produced the measured false-positive shape** | Three things, verbatim, and nothing generalised beyond them: **(1) the masker** — quoted exactly below this table — is line-based, stateless, with no block-comment mode. **(2) SHAPE PROVEN (sabotage limb 4):** real code on the line immediately following a string literal containing `/*` is **CAUGHT, not swallowed** (`runs/audit/pr99-undrained-exit-red-2026-09-16.txt`). **(3) SHAPE NOT PROVEN:** real code inside an actual multi-line `/* … */` block, where the masker mis-reads the opposite way and flags commented-out text as UNSAFE — a false positive, fail-safe direction. **Constraint carried forward** from `test/build-page-exit-drain.test.mjs:47-49`, which describes the sabotage limb **by its shape** (a genuine `process.exit(9)` on the line following a string literal containing `/*`), not by a limb number: any future change giving the masker block-comment state, or any other stateful behaviour, **MUST re-run that shape before acceptance** | 🔴 **OPEN** · RECORDED · measured 16 September 2026 · **SEVERITY: UNCLASSIFIED** (not LOW). **Recorded only:** the masker was not changed |
| **`D-OUTPUT-1`** | **output volume — `bin/build-page.mjs` emitted 184 lines / 45,416 bytes of per-value NOT TESTED prose** | Approximately 90% of that command's stdout in the measured run (2 declared page specs, 2 requested; total stdout 50,335 bytes). **Classification: output-volume / usability finding ONLY.** 🔴 **NOT attributed to #99's CI failure.** It was recorded as an amplifier, not a cause — and that mechanism is itself **NAMED, NOT REPRODUCED** | 🔴 **OPEN** · RECORDED · measured 16 September 2026 · **SEVERITY: UNCLASSIFIED** (not LOW). **Recorded only:** the output was not changed |
| **`D-SPAWN-1`** | **Seven `spawnSync` call sites without explicit `maxBuffer`** — a bounded robustness **observation ONLY** | Measured by grep over tracked files on `origin/main` `6927a7d`, re-derivable from these lines: **12** `spawnSync(` matches. **4 set `maxBuffer`:** `test/owner-authorization-gates.test.mjs:170` · `test/page-construction.test.mjs:362` · `test/portability-neutral-product.test.mjs:114` · `test/ungated-writers.test.mjs:35`. **1 excluded** as a string literal, not a call: `test/search-language.test.mjs:116`. **7 call sites without explicit `maxBuffer`:** `test/build-page-exit-drain.test.mjs:163` · `test/owner-authorization-gates.test.mjs:61` · `test/owner-authorization-gates.test.mjs:115` · `test/page-construction.test.mjs:232` · `test/secret-leak.test.mjs:234` · `test/write-confinement.test.mjs:83` · `test/write-confinement.test.mjs:104`. 7 + 4 + 1 = 12. Separately: `bin/build-page.mjs:39` mentions `spawnSync` in a comment only and is **not** among the 12. 🔴 **Absence of an explicit `maxBuffer` is an observation — NOT a proven defect and NOT a proven failure mechanism. No site has per-site evidence.** The count matches the seven first reported | 🔴 **OPEN** · RECORDED · measured 16 September 2026 · **SEVERITY: UNCLASSIFIED** (not LOW). **Recorded only:** no site was opened beyond the grep, none was changed |

`D-MASK-1`'s masker, verbatim (`test/build-page-exit-drain.test.mjs:57` on `6927a7d`) — in a code block because its
`|` would break a table cell:

```js
isComment = (l) => /^\s*(\/\/|\*|\/\*)/.test(l)
```

---

## 🔴 `D-CENSUS-1` — RECORDED 17 SEPTEMBER 2026, A GAP 2 BLOCKER: THE WRITER CENSUS UNDER-COUNTED A STORE VERB

Found on **17 September 2026** during the Gap 2 difficult-five feasibility check, and ruled by the owner the same day
("D-CENSUS-1 · UNDER-COUNT BEFORE ANYTHING ELSE" and "D-CENSUS-1 · SET PROOF, RE-PIN, CLOSE DECISION"). It is the
opposite direction to Gap 2's closed Blocker 1 (the census's OVER-count, corrected in #103), in the same instrument;
Blocker 1 is not reopened. Before it was written, `D-CENSUS-1` was searched for across the tracked files on
`origin/main` (`e860f75`), the full working tree and git history on all refs: **0 hits**, against **16 / 16 / 6** for
`D-GUARD-1` as the positive control. Evidence: `runs/audit/gap2-close-decision-2026-09-16.txt` (sections dated 17 Sep).

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-CENSUS-1`** | **the writer census did not recognise `.appendAllWithoutDedupe(` as a write-helper call** | **OBSERVED:** the census's helper call shapes named `appendAll(`, which `appendAllWithoutDedupe(` does not contain, so three bin call sites were absent from its site enumeration — `bin/instrument-disagreement.mjs:90` · `bin/supersede-noindex.mjs:150` · `bin/supersede-duplicates.mjs:66` (measured on `e860f75`). **RISK / CONSEQUENCE — not an observation:** an ungated writer calling the store in that shape would not have been detected. **NOT OBSERVED:** any ungated writer at those sites — the corrected census classifies all three **GATED** (`:90` by the early exit at `:85`; `:150` by the else-branch of `:143`; `:66` by `permission.mayWrite` on its own line), with 0 CANNOT_DETERMINE. **CORRECTION:** the shape is now recognised (`tools/permitted-writers.mjs`, built from parts). The verb's own declaration, `src/evidence/store.mjs:196` (`function appendAllWithoutDedupe(`), then enters the enumeration and is excluded by the declaration exclusion #103 established — the excluded set was proved to gain exactly `{store.mjs:196}` and lose nothing, and its pin moved 8 → 9 with the reason in the test | ✅ **CLOSED on the landing of the change that records this entry**, on the owner's conditions: the correction landed · the 8 → 9 set proof in both directions · every existing positive and negative census control passing · the corrected census re-run beside the previous totals (whole 93 = 82 + 11 + 0 → 96 = 85 + 11 + 0; frozen Gap 2 population 15 = 10 + 5 + 0, unchanged) · the frozen-population reconciliation (`supersede-noindex` is not one of the six frozen bins). If that change is not merged, this entry is **OPEN**. **SEVERITY: UNCLASSIFIED** (not LOW) |

**A SEPARATE OBSERVED LIMITATION, INSIDE `D-CENSUS-1` — NOT A NEW ID, NOT A CURRENT DEFECT.** Two facts, neither
standing for the other:

- **Not recognised:** an ALIASED call — `const w = store.<verb>; w(r)` — is not a write site to the census, for all
  three write-capable verbs of `src/evidence/store.mjs` (`appendWithoutDedupe`, `appendIfNew`,
  `appendAllWithoutDedupe`). Qualified, unqualified and chained calls are recognised for all three.
- **Zero current occurrences:** a grep of `bin/`, `src/` and `tools/` on `e860f75` finds no such aliased assignment;
  the same pattern caught all 3 planted aliased lines and correctly skipped the plain call.

No fix is authorised. It is not an open blocker: no frozen Gap 2 criterion requires universal recognition of future
call syntax. The census's own list of what it cannot see does not yet name this shape; that is recorded here and was
not changed.

---

## 🔴 `D-SCRATCH-1` — RECORDED 17 SEPTEMBER 2026: THE WHOLE-TREE SYMLINK CENSUS RACES DISPOSABLE `.test-scratch` STATE

Observed on **17 September 2026** while recording Gap 2's closure, and ruled by the owner the same day ("GAP 2 FINAL
CLOSURE DECISION ONLY", brief committed at
`_handoffs/AlmiVisibility_GAP2_FINAL_CLOSURE_DECISION_ONLY_RESUME_2026-09-17.md`, `24d8189`). The owner ruled that it
gets a dedicated id **because an actual failure was observed**, that CI green and a non-reproduction do not cancel an
observed failure, and that **recording a finding does not authorize its fix**. Before this id was written it was
searched for across the tracked files on `origin/main` (`7470c06`), the full working tree including untracked files,
and git history on all refs: **0 / 0 / 0 hits**, against **9 / 9 / 7** for `D-GUARD-1` as the positive control. It is
**OUTSIDE Gap 2's frozen boundary** — that dependency was measured, not assumed, and Gap 2 closed on the same change.
Evidence: `runs/audit/gap2-close-decision-2026-09-16.txt` (A57, A58, B30, B31).

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-SCRATCH-1`** | **`tools/symlink-census.mjs` walks the whole repository, including the git-ignored disposable `.test-scratch/` state that tests create and delete in parallel, so an entry can be listed by `readdirSync` and gone before its `lstatSync`** | **OBSERVED, four times, all on Windows under `node --test`'s parallel runner.** 🔴 **OLD → CURRENT: the observed trigger population is WIDER than this entry first recorded.** As first written, all three observations involved `gsc-source-*` scratch directories (#111's test). **ADDED 17 September 2026, later:** a fourth instance was observed during the `D-HELDOUT-1` H2 run, the same `no-symlinks` test and the same ENOENT shape, on **`.test-scratch/ledger-seam-6WOWOr`** — a directory created by `test/gap2-ledger-seam.test.mjs` (#110), **not** by #111. Local full suite on that change: 1,297 tests · 1,296 pass · 1 fail. 🔴 **NOT PROVED:** that the `gsc-source-*` and `ledger-seam-*` observations share a root cause, or that one fix would address both. Both are ENOENT on a listed-then-vanished `.test-scratch` entry under a parallel runner; that is a shared SYMPTOM and a shared SHAPE, and nothing here establishes more. The A51 relationship, and the #110 junction held inside this entry as POSSIBLE-ONLY, stay exactly as strong as their own evidence — no stronger. **THE FIRST THREE, AS FIRST RECORDED:** twice on 16–17 September 2026 during the closure-record check (A57 — `.test-scratch/gsc-source-mrpC0A`, then `.test-scratch/gsc-source-LDgPWT`), and a third time on 17 September 2026 on merged main `7470c06` itself with a clean tracked tree (A58.1) — `npm test` → 1,290 tests · 1,289 pass · **1 fail**, the failure being `test/no-symlinks.test.mjs:13` with `Error: ENOENT: no such file or directory, lstat '…\.test-scratch\gsc-source-7RJ2Zx'` raised at `tools/symlink-census.mjs:34`. **Linux CI is green on the same commits** (#111 PR and merged main, run 35190981828) — environment-dependent, and 0 of 8 paired local reproductions **disprove nothing** (LAW-ABSENT-1). **OBSERVED, direction:** the instrument holds zero `try`/`catch`, and a positive control run on 17 September 2026 confirmed `lstatSync` **throws** `ENOENT` on a listed-then-removed entry, so the race can only make the test **RED** — it cannot today report a false clean zero (A58.5). **NOT PROVED CAUSE:** the exact interleaving is not instrumented; `gsc-source-` directories are created at exactly one place, `test/support/gsc-synthetic-source.mjs:39` from `test/gap2-gsc-ingest-source.test.mjs:60` (A58.7). **CONSEQUENCE, measured:** an unreliable **repository-wide symbolic-link guard**, which is the guard standing behind `confineToRepo`'s path-text check. **NOT a Gap 2 dependency:** the writer census enumerates `git ls-files src bin tools` and never walks `.test-scratch`, and `symlinkCensus` has exactly one consumer in the repository — its own test (A58.2, A58.3) | 🔴 **OPEN** · RECORDED · observed 16–17 September 2026 · **SEVERITY: UNCLASSIFIED** — this register carries no severity scale; UNCLASSIFIED is **not** LOW (LAW-ABSENT-1), and severity is withheld until consequence and reversibility evidence justify one. **Recorded only:** `tools/symlink-census.mjs`, `test/no-symlinks.test.mjs`, #110, #111, every scratch cleanup, the test ordering and the runner's concurrency are **unchanged** by the change that records this |

**RELATIONSHIP TO `A51`, IN THE OWNER'S WORDS AND NO STRONGER.** Recorded verbatim, on the owner's ruling:

> "Observed fourth instance consistent with the A51 shared-mutable / disposable-state concurrency pattern; common
> root cause and common fix NOT YET PROVED."

`A51`'s three measured instances are all under `runs/`; this one is under `.test-scratch/`, a directory `A51` did not
measure. The pattern relationship is useful; **causal equivalence is not proved**, and nothing here may be read as
"`A51`'s proven same root cause".

**🔴 THE FIX-DIRECTION GUARD, RECORDED NOW SO THE WRONG FIX CANNOT LATER BE ADOPTED BY DEFAULT.** Recorded verbatim,
on the owner's ruling:

> "Preferred investigation direction is POPULATION CORRECTION / ISOLATION: determine whether git-ignored disposable
> `.test-scratch` state belongs in the repository symlink-census population at all. Any future correction MUST
> preserve fail-closed census semantics and MUST include a positive control proving that a genuine in-population
> repository symlink is still DETECTED. Silently swallowing ENOENT or vanished entries is NOT an authorised fix."

**Why:** an `ENOENT`-tolerating census can no longer distinguish **VERIFIED ABSENT SYMLINK** from **ENTRY VANISHED
BEFORE INSPECTION** — the exact two-state collapse the whole of Gap 2 was about, and it must not be reintroduced in
the instrument that guards against symlinks. Measured today, that collapse **does not exist** in this instrument
(A58.5), and no correction may introduce it.

**🔴 THE DIRECTION IS FROZEN, THE IMPLEMENTATION IS NOT.** Population exclusion is **not** recorded as the final fix.
Any correction must first prove by measurement that `.test-scratch` legitimately sits outside the census population
**and** that excluding it removes no required security or integrity coverage.

**#110's JUNCTION — HELD INSIDE THIS ID AS A POSSIBLE-ONLY MECHANISM, NOT A SECOND GAP AND NOT A CAUSE.**
`test/gap2-ledger-seam.test.mjs` (#110) plants a junction inside its own `mkdtemp` directory under `.test-scratch` for
its SYMLINK case, and the same census reports a link under the repository as a failure — so a parallel run inside that
window could turn `no-symlinks` red on a real link report. A second, opposite possibility is recorded with it: a
junction created inside a directory the walk has **already passed** would not be seen at all (A58.6). **Both are
MECHANISTICALLY POSSIBLE and NEITHER IS OBSERVED.** A remaining hypothesis is not a proof, and **no fix may rest on
possibility alone**.

**Scratch state as measured on 17 September 2026:** every `.test-scratch` fixture in the repository is a
`mkdtempSync` directory with its own per-test prefix, no test removes another test's scratch directory, and `guardDir`
never targets `.test-scratch` (`D-SWEEP-1`, above). After one round of targeted runs the directory held **107**
leftover directories — `corpus` 56 · `verdicts` 32 · `gsc-incident` 10 · `confine-probe` 5 · `row61` 3 ·
`gap3-archive` 1 (A58.8). They are git-ignored and disposable, and every one of them is inside the walk's population
and inside no other instrument's.

---

## 🔴 `D-HELDOUT-1` — RECORDED 17 SEPTEMBER 2026: ROW 5's ACCEPTANCE INSTRUMENT CANNOT FAIL ON THE HELD-OUT LIMB IT IS REQUIRED TO JUDGE

Established **by property**, not by symptom, on **17 September 2026**, and ruled by the owner the same day ("ROW 5
OWNER RULINGS · REGISTER TWO FINDINGS + MEASURE SAFE INSTRUMENT PATH", brief committed at
`_handoffs/AlmiVisibility_ROW5_OWNER_RULINGS_REGISTER_TWO_FINDINGS_2026-09-17.md`, `2d19ac8`). The owner's **RULING 1**
of the same date settles the scope question this rests on: *a qualifying held-out identical-intent MISS falls under the
frozen Row 5 failure proposition "identical intents stay split"; there is no tolerance; **one** genuine qualifying
held-out MISS is sufficient for Row 5 failure.* That interpretation is not reopened here. Before this id was written it
was searched for across the tracked files on `origin/main` (`ceee2a6`), the full working tree including untracked
files, and git history on all refs: **0 / 0 / 0 hits**, against **9 / 9 / 8** for `D-GUARD-1` as the positive control.
**Recording a finding does not authorize its fix:** no instrument, test, clusterer, reference or row status is changed
by the change that records this.

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-HELDOUT-1`** | **Row 5's acceptance instrument does not fail when a qualifying held-out identical-intent pair remains split, despite that state violating the frozen Row 5 failure condition** | **OBSERVED, by property, 17 September 2026 on `ceee2a6`, read-only and in memory.** `clusteringErrors` (`src/discovery/intent-clusters.mjs:332`) computes its `merged` and `split` limbs at `:357-359` over `h.inSampleClusters` **only**; its single held-out limb, `held-out-unrun` (`:346-355`), asks whether the check ran, whether its results cover exactly the held-out population, whether the reported hit/miss/unscored counts agree with its own results, and whether every miss is named. **The MISS count is never compared to zero.** Driving the real store's held-out report through three states gave: **HIT 61 / MISS 0 → GREEN · HIT 49 / MISS 12 (the real store today) → GREEN · HIT 0 / MISS 61 → GREEN.** 🔴 **POSITIVE CONTROLS, same run, same harness — the limb list is alive:** merging two in-sample clusters fired `merged`; making the held-out counts disagree with their own results fired `held-out-unrun`. A third control already exists in the suite — the lexicon leakage limb at `test/intent-clustering.test.mjs:99`. **CONSEQUENCE, measured:** two materially different held-out outcomes — every qualifying pair clustered correctly, and every qualifying pair left split — are **indistinguishable** to the instrument, so `test/intent-clustering.test.mjs:81` ("every row-5 limb holds on the real store") is GREEN today while Row 5 is recorded **FAILED**. That GREEN is **narrower than the frozen Row 5 acceptance proposition**, and narrower in exactly the place the row was failed. **NOT CLAIMED:** that the in-sample limbs are wrong, that any past verdict was mis-recorded, or that the row's FAILED state is unsound — the row's FAILED state is the *correct* one and was reached by applying the frozen clause to the held-out result (`src/checklist/classification.mjs`, row 5 `why`: "FAILURE — met on the held-out fifth … 12 identical intents stayed split", "FAILED on the owner's answer, 14 September 2026") | ✅ **CLOSED 17 September 2026 against merged proof `fb68db9`** (PR #114; PR check `test` run 35286615410 SUCCESS, main CI run 35287647431 SUCCESS) — the acceptance instrument is fail-capable, and on merged main it truthfully fails: `node bin/intent-clusters.mjs --check` exits **1** at 0 distinct-intent merges · 8 identical-intent splits. 🔴 **This closes the INSTRUMENT, not the row: Row 5 remains FAILED and no row moved.** Full closure evidence below the table. · **SEVERITY: UNCLASSIFIED** — this register classifies by state and carries no severity scale (`D-FACT-5`, above); UNCLASSIFIED is **not** LOW and is not defaulted to one (LAW-ABSENT-1). **When it was recorded, nothing was changed:** `src/discovery/intent-clusters.mjs`, `src/discovery/row5.mjs`, `test/intent-clustering.test.mjs`, the intent reference, the lexicon, Row 3's artifact and Row 5's status are **unchanged** by the change that records this |

**🔴 WHAT THIS DOES AND DOES NOT MOVE.** Row 5 stays **FAILED**. `D-HELDOUT-1` is about the *instrument*, not the
*verdict*: **DETECTOR CORRECTNESS ≠ CURRENT ROW ACCEPTANCE STATE.** The practical consequence is forward-looking — a
future `RETEST_PASSED` for Row 5 (Amendment 2, rule 1) **cannot be relied upon** until this limb can fail, because a
re-run would go green at any MISS count. No row moved; the ledger is unchanged at 2 / 7 / 1 / 22 / 2 / 4 / 23 = 61.

**A RECORDED AMBIGUITY THAT TRAVELS WITH THIS ENTRY, AND IS NOT RESOLVED BY IT (owner RULING 2).** The frozen EVIDENCE
clause (`PASS_BOUNDARIES_SOURCE.md:221`) requires "the cluster with its members and a held-out check" but does **not**
independently specify what substantive proposition that check must establish. That ambiguity is **preserved as an
ambiguity**. It does not block this finding, because the substantive held-out failure condition comes from RULING 1's
Q1-A reading of the FAILURE clause, not from the EVIDENCE clause — and **no extra held-out requirement is invented from
it here.**

**🔴 REQUIRED PROPERTY PROOF FOR ANY FUTURE CORRECTION — RECORDED NOW, ON THE OWNER'S RULING, SO A WEAKER FIX CANNOT
LATER BE ADOPTED BY DEFAULT.** A correction must prove at minimum: **(1)** 61 HIT / 0 MISS → the held-out failure limb
does **not** fire · **(2)** 60 HIT / 1 qualifying identical-intent MISS → the limb **FIRES** · **(3)** 49 HIT / 12
current genuine MISS → the limb **FIRES** · **(4)** 0 HIT / 61 MISS → the limb **FIRES** · **(5)** the existing
in-sample `merged` control still fires · **(6)** the existing held-out count-integrity control still fires · **(7)** no
tolerance is introduced · **(8)** no held-out data leaks into learning or remediation · **(9)** Row 3's VERIFIED-PASS
artifact and state remain untouched. Exact intended test counts must be **PINNED** wherever filtering or sabotage could
silently omit a limb. **PROPERTY PROOF > SYMPTOM ABSENCE.**

**🔴 AND THE FIX MUST NOT BUY GREEN WITH A LIE.** A known FAILED row may not be disguised as PASS to keep CI green, and
a truthful detector must not be neutralised by `xfail`, `skip`, `ignore` or a tolerance. The repository already has a
convention for holding both truths at once — see `test/queue-rescan.test.mjs:114-119`, where item 50's adverse
measurement is asserted *as* the expectation together with `assert.equal(classify()[50].state, "FAILED")` and a re-sit
trigger message. CI is green there because the test asserts the truth, not because the row passes.

---

### ✅ `D-HELDOUT-1` — CLOSURE EVIDENCE, 17 SEPTEMBER 2026, AGAINST MERGED PROOF `fb68db9`

Closed on the owner's ruling ("ROW 5 · D-HELDOUT-1 H2 IMPLEMENTATION", `_handoffs` `d15b8c9`), on this evidence and
nothing wider:

- **The instrument is fail-capable, proved by property through the real `clusteringErrors` path.** Acceptance is now
  the SAME `compareToReference` the in-sample limbs already used, applied to the **whole record** — in-sample clusters
  **plus** held-out placements — as limbs `record-merged` / `record-split`. No new qualifier, no threshold, no
  tolerance. Controls, each on records rebuilt from the real members so no limb is bypassed: a clean state (one
  reference intent, one cluster) → **silent**; one legitimate merge → **`record-merged` fires**; one legitimate split
  → **`record-split` fires**. The three cases are pinned at 3 and counted as they run (A49).
- **The current real state fails, truthfully:** **0 distinct-intent merges · 8 identical-intent splits**, and
  `node bin/intent-clusters.mjs --check` exits **1** — re-verified on merged main `fb68db9`.
- **The eight split identities are pinned**, with the re-sit trigger beside them (where the 8 comes from, and what
  would legitimately move it): `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` ·
  `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` · `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]`.
- 🔴 **The case that justified rejecting the narrower qualifier is visible to acceptance.**
  `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]`'s two members are **both held out**, so the proposed `referenceIntent has in-sample
  members` qualifier — measured to cover only **7 of 8** — could never have seen it. The full-reference oracle does.
- **The existing controls stayed fail-capable.** The sabotage tests keep their "alone" claim at full strength: each
  now asserts the limbs its damage **adds** to the baseline and that it **removes none**, which still fails on any
  collateral limb. The held-out count-integrity control still fires. The lexicon held-out-leakage guard is intact,
  and `compareToReference` remains post-output evaluation — the clusterer still trains on the 268 in-sample alone.
- 🔴 **A stale assertion was EXPOSED by the corrected instrument, and corrected rather than worked around.**
  `test/axis-discovery.test.mjs` asserted that Row 5's errors were **empty** — true only while acceptance judged the
  training half of its own output. When the instrument began returning the truthful adverse result, that assertion
  went red. It now states the truth (exactly `["record-split"]`, length 8). **Row 6's own verdict was shown not to
  depend on it:** `row5Errors` is carried through for reporting only (`src/discovery/row6.mjs:129`), while row 6's
  limbs come from `axisErrors` — so row 6 is unaffected, and its own limbs still hold.
- **PR #114 check `test` run 35286615410 SUCCESS · merged `fb68db9` · main CI run 35287647431 SUCCESS**, each read
  from the checks API rather than a `--watch` exit code.
- 🔴 **Row 5 remains FAILED. Row 3 remains VERIFIED-PASS. No row moved; the ledger is unchanged at
  2 / 7 / 1 / 22 / 2 / 4 / 23 = 61.** Detector correctness is not row acceptance state, and this closure is not a
  Row 5 pass. The suite is green because it **asserts the failure** — together with `classify()[5].state === "FAILED"`
  and a re-sit trigger — never by `xfail`, `skip`, `ignore` or tolerance.

**🔴 CLOSURE SCOPE LIMITATION — LAW-ABSENT-1.** Recorded verbatim on the owner's ruling:

> During the D-HELDOUT-1 implementation, the stale assertion in `test/axis-discovery.test.mjs` was discovered
> INCIDENTALLY, when the corrected instrument began returning the truthful adverse Row 5 result.
>
> That observed instance was corrected and verified.
>
> NO systematic repository-wide sweep was performed for other tests or consumers that may encode the same or an
> analogous assumption — such as asserting an acceptance or error collection is empty when the underlying row is
> known FAILED.
>
> Therefore:
> - additional same-shape instances = UNKNOWN;
> - absence of additional instances is NOT established;
> - D-HELDOUT-1 closure does NOT certify repository-wide absence of this pattern;
> - no new finding is created merely from this UNKNOWN;
> - no sweep is authorised in this turn.
>
> This limitation does NOT prevent D-HELDOUT-1 closure, because its frozen proposition and bounded acceptance path
> have been directly corrected and verified.
>
> A future concrete contradictory instance may be handled under the standing reopen / new-finding law; UNKNOWN alone
> does not reopen the closed finding.

**WHAT THIS CLOSURE DOES NOT TOUCH.** The scorer's own HIT/UNEVALUATED collapse is a **separate** defect, registered
as `D-VERDICT-1` below and **OPEN**: acceptance is corrected, yet `heldOutCheck` can still independently report a
no-comparison-target case as HIT. `D-ADJUDICATION-1` and `D-SCRATCH-1` remain OPEN. The six R6-AMBIGUOUS members
remain **UNEVALUATED-BY-RULE** — neither passed nor failed — and the E-D evidence-clause ambiguity is unresolved.

---

## 🔴 `D-ADJUDICATION-1` — RECORDED 17 SEPTEMBER 2026: THE ACCEPTANCE REFERENCE MAY BE AMENDED AFTER THE RESULT IS KNOWN, AND THE CITED RULE VIOLATION IS RECORDED BUT NOT INDEPENDENTLY VERIFIED

Established on **17 September 2026** and ruled by the owner the same day (**RULING 4** of the brief above, `2d19ac8`).
Before this id was written it was searched for across the tracked files on `origin/main` (`ceee2a6`), the full working
tree including untracked files, and git history on all refs: **0 / 0 / 0 hits**, against **9 / 9 / 8** for `D-GUARD-1`
as the positive control. The namespace was chosen, not defaulted: the proposition registered here is an **established
absence of a verification step in an existing mechanism**, the same shape as `D-GUARD-1` ("the guard took
`elementsNotFound` on trust"), which is why it sits in `D-*` rather than in the `U-*` unknowns of section 5.

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-ADJUDICATION-1`** | **Row 5's acceptance reference can be amended after the clusterer's output is known, in a way that changes the acceptance verdict, while the mechanism records each amendment's cited rule violation without independently verifying it and carries no safeguard against amendments moving systematically in the evaluated clusterer's favour** | **OBSERVED, 17 September 2026 on `ceee2a6`, read-only.** The pinned pre-clustering reference (`runs/audit/row5-reference-as-first-written-2026-09-14.mjs.txt`, sha256 **`626a37ea124cab39e7c40c9417926673377d953573ef5d28ee31aca615c348f3`** — the exact full value recomputed this turn over its LF-normalised bytes, matching `test/intent-clustering.test.mjs:32`) was replayed against the same clusterer and the same input, inside disposable `.test-scratch` with a before/after fingerprint of the protected population proved **IDENTICAL**. **Result: original reference → in-sample merged 1 · split 1 · Row 5 verdict RED; current amended reference → in-sample merged 0 · split 0 · verdict GREEN.** The pin's own `AMENDMENTS` is `Object.freeze([])`; the current file carries **2** (`config/discovery/intent-reference.mjs:46-60`), each with a `brokenRule` citing R2 and R3. **The held-out result is 49 HIT / 12 MISS under BOTH references** — the amendments moved the in-sample verdict and left the held-out numbers untouched. **WHAT THE MECHANISM DOES ESTABLISH:** the original is immutable and byte-pinned, and every amendment must cite a rule matching `/^R[1-6] — /` (`test/intent-clustering.test.mjs:35-37`). **WHAT IT DOES NOT:** nothing verifies that the cited rule was in fact violated, and nothing flags or caps amendments all moving one way — the test's own title merely records that both did. **UNKNOWN, recorded as unknown (LAW-ABSENT-1):** git history cannot corroborate the claimed ordering "frozen before any clustering run" (`config/discovery/intent-reference.mjs:42-43`), because the pin, the clusterer, both amendments and the result all entered history in **one commit**, `dd15acf` (2026-09-14 22:36:10Z); the claimed freeze time of 21:44:57Z is consistent with that commit but is not independently provable | 🔴 **OPEN** · RECORDED · established 17 September 2026 · **SEVERITY: UNCLASSIFIED** — this register classifies by state and carries no severity scale (`D-FACT-5`, above); UNCLASSIFIED is **not** LOW (LAW-ABSENT-1). **Recorded only:** no amendment was modified, reverted or invalidated; the original pin, the current reference, the 49 / 12 result and Row 5's status are **unchanged** |

**🔴 WHAT THIS FINDING DOES NOT CLAIM — read this before citing it.** It does **not** claim that the amendments were
wrong · that the cited rules were not violated · deliberate manipulation · bad faith · reference corruption · or that
post-result adjudication is inherently forbidden. **None of those propositions is established, and this entry may not
be used to assert any of them.** Authorised and auditable is not the same proposition as independent of observed
output, and a cited adjudication rule is not proof that the cited rule was violated. Those are the only two
distinctions this entry rests on.

**REFERENCE POLICY IS NOT DECIDED HERE (owner RULING 5).** Post-result adjudication is neither banned nor blessed; the
two amendments stand; the original reference is not rewritten or regenerated; 49 / 12 is unchanged; Row 5's status is
unchanged. Historical evidence remains immutable and auditable. This entry exists to preserve the unresolved
policy-and-verification problem for a bounded prospective decision by the owner.

**CROSS-REFERENCES.** Row 5 (`PASS_BOUNDARIES_SOURCE.md:217-221`, FAILED since 14 September 2026) · `D-HELDOUT-1`
above, which concerns the *held-out* limb of the same row's instrument and is a **separate** finding from this one ·
the reference and its amendment record (`config/discovery/intent-reference.mjs`) · the immutable pin
(`runs/audit/row5-reference-as-first-written-2026-09-14.mjs.txt`).

**THE CURRENT LABEL FOR THE HELD-OUT NUMBERS, so a later reader does not overstate their independence:** 49 HIT /
12 MISS is the **CURRENT POST-AMENDMENT HELD-OUT RESULT**. It is not an "original", a "pre-result baseline" or an
"independent untouched reference result" — even though, as measured above, the original pinned reference yields the
same 49 / 12.

---

## 🔴 `D-VERDICT-1` — RECORDED 17 SEPTEMBER 2026: ROW 5's HELD-OUT SCORER REPORTS "NOTHING TO COMPARE AGAINST" AS A HIT

Measured on **17 September 2026** and ruled by the owner the same day ("REGISTER-ONLY CONSOLIDATION TURN", brief
committed at `_handoffs/AlmiVisibility_REGISTER_ONLY_CONSOLIDATION_HELDOUT_CLOSE_H3_SCRATCH_EXPAND_2026-09-17.md`,
`aecdb56`). This is the finding carried through the Row 5 work as **H3**. Before this id was written it was searched
for across the tracked files on `origin/main` (`fb68db9`), the full working tree including untracked files, and git
history on all refs: **0 / 0 / 0 hits**, against **9 / 9 / 9** for `D-GUARD-1` as the positive control. The namespace
was chosen, not defaulted: the collapse is an **established behaviour of existing code**, read directly at
`src/discovery/intent-clusters.mjs:263-270` and measured over the real population — not an unknown, so `D-*` and not
the `U-*` unknowns of section 5. It is the same shape as `D-GUARD-1`, "the guard took `elementsNotFound` on trust".

| id | defect | how it presented | state |
|---|---|---|---|
| **`D-VERDICT-1`** | **`heldOutCheck` gives the same `HIT` label to two different states: (A) a held-out query substantively evaluated and correctly placed, and (B) a held-out query for which no in-sample comparison target existed, so nothing could be evaluated at all** | **OBSERVED in the code**, `src/discovery/intent-clusters.mjs:263-270`: `intentInSample = train.some(…)` at `:263`, then for a query left `NEW` the verdict is `intentInSample ? "MISS" : "HIT"` at `:267`, and the no-target branch says so in its own words — `"NEW, and no in-sample query has its intent '…'"` at `:270`. Nothing downstream distinguishes the two: the report returns only `hits` / `misses` / `unscored`. **OBSERVED in the population**, measured over the real store: the published headline **49 HIT / 12 MISS** of 61 decomposes as **44 evaluated HIT · 12 evaluated MISS · 5 no-comparison-target**. 🔴 The 49 is therefore **not 49 evaluated HITs**. **THE FIVE, AND THEY ARE NOT ALIKE:** **3** are singleton intents with no same-intent partner anywhere, so no split was possible for them on this output — `[REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]` · `[REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]` · `[REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]`; **2** are the members of `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]`, where the reference asserts **SAME INTENT** (rule "R5: one degree, narrowed", `doubt: null`) and the clusterer's output leaves them **SPLIT**, yet the scorer reports **HIT** for both because no in-sample query carries that intent. **CONSEQUENCE, measured:** any report or re-sit reading `heldOutCheck`'s own counts reads 49 successes where 5 were never tested. **NOT CLAIMED:** that any of the 44 is wrong, that the 12 are wrong, or that the scorer mis-measures what it does measure — only that its verdict label cannot express "not determined by this protocol". The machinery already accepts that such a state exists: R6-AMBIGUOUS members get their own `UNSCORED` verdict at `:259` | 🔴 **OPEN** · RECORDED · measured 17 September 2026 · **SEVERITY: UNCLASSIFIED** — this register classifies by state and carries no severity scale (`D-FACT-5`, above); UNCLASSIFIED is **not** LOW, NONE or SAFE, and is not defaulted to one (LAW-ABSENT-1). **Recorded only:** `src/discovery/intent-clusters.mjs` and every other scoring path are **unchanged** by the change that records this |

**🔴 THIS IS NOT `D-HELDOUT-1`, AND IT MUST NOT BE FOLDED INTO IT.** `D-HELDOUT-1` was about **acceptance** — the
instrument could not fail when the frozen clause was violated — and it is **CLOSED** against `fb68db9`. This one is
about **scoring and reporting**. The two are independent, and the proof is that closing the first did not fix the
second: acceptance now correctly reports 8 identical-intent splits, and `heldOutCheck` still independently reports
the two `[REDACTED — RETIRED_CONTAMINATED EXPECTED LABEL]` members as HIT on the very same run.

**WHAT A FUTURE CORRECTION WOULD HAVE TO DO — recorded as direction, not as an authorised implementation.** Give the
no-comparison-target case its own verdict rather than `HIT`, so the report reads **44 · 12 · 5** instead of 49 · 12.
That is correcting a misleading number, **not** weakening acceptance: the frozen failure condition and the
`record-split` limbs are untouched by it. Any such change moves the pinned `[49, 12, 0]` in
`test/intent-clustering.test.mjs`, which must be re-based **with the reason recorded there**, never silently. Nothing
is authorised here: **no scoring code was modified by the change that records this entry.**

---

## 🔴 PERMANENT LOSSES — RECORDED, IRRECOVERABLE, NEVER DELETED

These rows are **not gaps that can close.** They record something measurable that was never
measured and can no longer be. **A row here outlives any tick it relates to.**

| # | what was lost | when | how much | why | status |
|---|---|---|---|---|---|
| **L-COST-1** | the costs of **eight Search Console ingest runs**: **12 measurable costs never recorded** — 8 wall-clocks (none recorded a start or finish) and 4 provider-call totals (stored only as re-sightings, which carry no cost) | runs of 2026-09-11T22:58Z … 2026-09-12T22:06Z | 8 runs · 12 costs · 0 estimated | **the cost ledger did not exist** — it first exists at `8c9d68b`, 2026-09-12T23:03:09Z | 🔴 **IRRECOVERABLE.** Each is carried in `runs/cost/ledger.jsonl` as `UNKNOWN · MEASURABLE_BUT_NOT_RECORDED`, with lower bounds in their own labelled fields. **Not estimated. Not closed by item 45's tick** (recorded 12 Sep 2026) |

---

# 5 · ITEM 9 — EVERY UNKNOWN, IN FOUR FIELDS

**Rule: what is not known is written UNKNOWN. No blank cell is filled by inference.**

## 5.1 · Closed by this Phase 0 — recorded, not deleted

| # | was | closed by |
|---|---|---|
| **U1** | Neon plan | owner, 10 Sep: **Free** |
| **U2** | Neon storage limit | 🔄 **measured 11 Sep: 0.5 GB/project**, and exceeding it **suspends compute** — `neon.com/pricing` |
| **U3** | Neon branch limit | owner, 10 Sep: **10** |
| **U5** | GSC property type | owner, 10 Sep: a **Domain property already exists** |
| **U9** | worker option costs | 🔄 **measured 11 Sep**, with URLs and date — item 4 §2 |
| **U-DB-1** | do preview and production share a database | 🔴 **yes**, architecture report §2b — *never unknown, only unread* |
| **U-DB-2** | which Postgres provider | **Neon**, same source |
| **U-DEP-3** | are preview deployments public | ✅ **no — 302 to SSO.** Only merges publish. 🔄 **RE-VERIFIED AND CLOSED WITH EVIDENCE, 12 Sep 2026.** *Dashboard (owner):* project `almi-visibility` (Pro) has **Vercel Authentication, "Require Log In" ON, scope Standard Protection** — which also restricts the generated `.vercel.app` URL; only a custom production domain would stay open, and there is none. *Measured (one request, status only, no content read):* PR #49's preview root answered **`HTTP 302` to `vercel.com/sso-api`**, `x-robots-tag: noindex` — **matches the dashboard.** The exposure raised in the brief never existed; *we looked and it was already protected* is now a fact, not an assumption. Deployments were then turned off for **waste**, not security: `vercel.json` `git.deploymentEnabled: false`, source `config/sources/vercel-git-configuration.mjs` (OFFICIAL, read 12 Sep 2026) |
| **U-EST-1** | does any product run on its **own registered domain**, outside the domain property | **OWNER RULING 3, 11 Sep: NO** — every product is a subdomain of `almiworld.com`. 🔴 **Carries an expiry condition**: a future product on its own domain kills this answer that day |

## 5.2 · Open

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U4** | Neon compute / autosuspend settings | console never opened | the Neon console | **owner** | before any crawl |
| **U6** | GSC URL Inspection quota | not measurable without access | the documented quota, read on the day | **owner** | after PRQ-1 |
| **U7** | GSC data lag | " — and **Gate B's waiting period depends on the real lag, not an assumed one** | the first week of real data | **owner**, then measurable | after PRQ-1 |
| **U8** | **Vercel plan** and its per-unit prices | `vercel teams ls` names the team, not the plan; no read-only CLI command exposes it | one read of the billing page, with a date | **owner** | when the plan changes |
| **U10** | whether the AI-crawler block on 12 products is intended | it is a policy, not a defect | a written ruling | **owner** | — |
| **U11** | whether AlmiPathway is meant to be live | 🔴 **PREMISE CORRECTED 11 Sep 2026 — the old text said "domain does not resolve", and that is false.** Measured: `almipathway.almiworld.com` **RESOLVES OVER IPv6 ONLY** — an AAAA record exists, there is **no A record**, and it was **not reachable over IPv4 from the measuring machine**. Registry still says `active:false`. **The row stays OPEN; only the premise changed** | a written ruling | **owner** | — |
| **U-TRUNC-1** | **what is producing TRUNCATED URLs that Google indexes?** | 🔴 **MEASURED, NOT EXPLAINED.** Two of the five folded URLs from the 12 Sep crawl are truncated — `https://almiworld.com/det-interactive-` and `https://almiworld.com/oet-for-australian-` — and **Google reports 7 and 2 impressions on them**. Confirmed from the STORED page rows, so the truncation is **not ours**: Google is reporting them that way. Both 301 to the full page. **Not chased in this PR** | the source of the truncated links — a template, an external link, or a Search Console artefact | later phase | if more truncated URLs appear |
| **U-CRW-IPv6** | **does the GitHub Actions runner have IPv6 egress?** | 🔴 **NOT MEASURED.** It matters because `U11`'s host is IPv6-only: if the runner has no IPv6 egress, our crawler **cannot reach that host at all** — and that is a **THIRD state**, distinct from both `FORBIDDEN` (a grant we lack) and `ZERO` (a host with no data). Collapsing it into either would be the same error the estate table exists to prevent. **Not guessed** | one dispatch of a workflow that reports the runner's own egress addressing | later phase, or **owner** | if the execution layer (`D-CRW-1`) changes |
| **U12** | endpoint isolation for products with no local env file | no evidence on this machine, **and the answer must come from a HOST comparison, never a credential** | per-project project id | **owner** | — |
| **U13** | whether AlmiOET's 240,328 pSEO pages are wanted at all | a product decision with a real cost attached | a ruling — *a product DECISION is not a defect* | **owner** | — |
| **U14** | Gate A's exact sibling-overlap algorithm as specified | *"≤ 40 %"* was never written as a definition | a written definition, **before implementation** | **owner** | before `DOD-06`/`08` work |
| **U15** | what `almi-swiss` is — a repository with no product in the registry | not in the seed, and its host is outside the earlier inventory | a one-line ruling: product, experiment or dead | **owner** | — |
| **U16** | whether `almi-monitor`'s live registry still holds `/sitemap.xml` | the seed file was corrected; **the seed is append-safe and never overwrites existing rows** | one `select` against that registry | **owner** | before the next submission run |
| **U-ENV-1** | which of 34 Vercel projects are live, retired or scratch | projects (34) exceed linked repos (27) and live hosts (27) | per-project domain assignment and last production deployment | **owner** | next estate change |
| **U-SEO-1** | whether the 25 healthy sitemaps are **submitted and fetched** | submission state lives in Search Console | the coverage report | **owner** | after PRQ-1 |
| **U-SEO-2** | whether `almihq`'s homepage-as-sitemap has been **indexed as one** | a `200 text/html` may or may not have been consumed | Search Console, or a crawl log | **owner** | after PRQ-1 |
| **U-DEP-1** | whether the 01:23 deployment was caused by the #23 merge. 🔄 **RESTATED 14 September 2026 — STILL OPEN.** Still unread: the commit that ONE deployment was built from — the 01:23 entry in Vercel's deployment history, with its commit SHA, compared with the #23 merge commit. That later merges (e.g. `a498a85`) produced no deployment, because Git deployments are now off, answers a different question and does **not** close this | timing matched to 3 seconds; **commit-to-deployment attribution was not read** | a read-only deployment list with commit SHAs | ~~**owner**, or a later sweep~~ **owner** — reading Vercel's deployment history is the owner's, as `U8`'s billing read is; no sweep here reads it | ~~next merge~~ when the owner reads that history — merges no longer deploy, so "next merge" cannot arrive |
| **U-DEP-2** | whether the published tree was **crawled or indexed** | unlinked, no `robots.txt`; discovery depends on external linking | Search Console for the host | **owner** | after PRQ-1 |
| **U-ISO-1** | isolation of **costs** and **learning** | neither exists, so neither can leak | the first cost record and the first learning record | later phase | when either exists |
| **U-GSC-1** | the real Search Console data lag *(duplicate of U7, kept for traceability)* | — | — | **owner** | after PRQ-1 |
| **U-DOC-1** | whether the same correction lags elsewhere | only three facts were traced across the document | a sweep of every fact stated in both a summary and a body | later phase | — |
| **U-COST-1** | **which GitHub plan**, and therefore the Actions allowance | `gh api user` returns `plan: null`; billing returns 404 needing the `user` scope, **and widening a token's scope is a change, not a measurement** | one read of the billing page, or a scoped token the owner grants | **owner** | when the plan changes |
| **U-COST-3** | Hetzner's prices | the public page renders figures client-side and returned placeholders. **Recorded as a refusal; not retried by another route** | a person with a browser | **owner**, or later phase | if Option B is chosen |
| **U-COST-4** | **crawl volume** — the denominator every price multiplies | no cohort is authorised | an authorised v0.1 scope | **owner** | when a cohort is authorised |
| **U-COST-5** | what our own crawler would cost us in ISR regeneration | Gate C quantifies the mechanism; nobody applied it to a crawler we operate | Gate C run against a named crawl plan | later phase | when a crawl plan exists |
| **U-DB-3** | whether **1.5 KB per page per pass** is real | it is an estimate; **every page count scales inversely with it** | measure one real snapshot row | later phase | first write |
| **U-DB-4** | current Neon storage consumed | measured as empty apart from scaffolding; **the bytes were never read** | the console's usage panel | **owner** | before any crawl |
| **U-DB-5** | the Launch tier's **included** storage, if any | the page states a per-GB rate and **no allowance**; inventing one would be a projection | Neon's plan comparison | **owner** | if the plan changes |
| **U-DB-6** | whether **egress** (5 GB free) binds before storage | egress was never modelled | model or measure one pass | later phase | when a crawl plan exists |
| **U-DB-7** | what **compute** (100 CU-hours) a crawl consumes | compute is a separate limit with the **same suspension penalty** | measure one pass | later phase | when a crawl plan exists |
| **U-CS-1** | whether `bin/acceptance-test.mjs` implements **this** contract | it exists; its behaviour against 6/6 + 0/3 has never been observed | one run against the frozen corpus | later phase | first run |
| **U-CS-2** | whether the 34 exhibit copies still match their source commits | pinned by commit SHA; **no content hash for the copies** | hash each copy against the file at its pinned commit | later phase | before the first run |
| **U-CS-3** | whether the 4 unfixed-side commits still contain the defect as described | the SHAs resolve; **presence was not re-verified** | read each file at its pinned commit | later phase | before the first run |
| **U-CS-4** | whether 9 pages can exercise 6 REDs and 3 CONTROLs | 3 are controls, leaving **6 for six defects — one-to-one, no margin** | map each RED to its page | later phase | before the first run |
| **U-DOD-1** | whether the DoD text has changed since the statuses were written | mapped from a handoff table, **not from a frozen DoD document in this repository** | the frozen DoD document | **owner** | when the DoD changes |
| **U-DOD-2** | what `DOD-06`'s "semantic" means — embeddings or a rule | named, never specified | the DoD's own wording | **owner** | before `06` |
| **U-DOD-3** | what `DOD-17` must explain, and to whom | names an audience, not a contract | the owner's description of what he needs to see | **owner** | before `17` |
| **U-DOD-4** | whether `DOD-18`'s "rollback" means content, database or deployment | three mechanisms, one word | the DoD's wording | **owner** | before `18` |

**36 open · 8 closed.**

---

# 6 · WHAT THE REGISTER SHOWS WHEN IT IS READ AS A WHOLE

| | |
|---|---|
| capability gaps | **32 open** of 33 rows — `DOD-MAP-1` **CLOSED**; +6 from reading the DoD text, +3 from attempting Case Study #1 (`CS-4`, `CS-5`, `DOC-2`) |
| product data gaps | **10** |
| owner actions | **2** — `B1` CLOSED 13 Sep 2026 · **1 open** (`B2`) |
| prerequisites | **9** — `PRQ-1` CLOSED 13 Sep 2026 · **8 open** |
| open UNKNOWNs | **36** |
| **DoD items complete** | **1 of 21** — `DOD-02`, by **OWNER RULING 1** |

⚠️ **The "1 of 21" follows from OWNER RULING 1 and from nothing else.** It is recorded here because
a summary that lagged its own document's ruling is exactly `DOC-1`, and this register has now
recorded that failure three times. **No other status moved.** *(A fourth, recorded 13 September 2026: `B1` and
`PRQ-1` read "not granted" for two days after the grant — see `DOC-1`.)* *(A fifth, recorded 14 September 2026: `DEP-1`
said the repository deploys on every push with no CI, two days after both stopped being true — see `DOC-1`.)* *(A sixth, recorded 14 September 2026: `FACT-1` said no derived-fact field existed two days after one was built and tested, and a command was written from it — see `DOC-1`.)*

> ### 🔴 THE SHAPE, STATED ONCE
> **The engine that exists is well built and narrow.** One stage of twelve is complete, three gates
> are frozen and measured, and 248 tests pass. **Twelve DoD requirements have no architectural home
> at all.**
>
> **And the two things that would move the most are not engineering:** read-only Search Console
> access unblocks four DoD items, and **claim supply for ten more variants** unblocks the cohort.
> Neither is code.
>
> 🔄 **13 September 2026: the first of the two happened on 11 September** — Search Console access was granted
> and used (`B1` CLOSED). This register did not record it for two days.

⚠️ **One pattern appears in every item and deserves naming once:** `DOC-1` was found **three
times**, on three unrelated facts, always the same way — **a correction landed in a body and never
reached the summary that people actually read.** Twice it made work look necessary that was already
done; once it made a known fact look unknowable.

🔴 **A fourth time, found 13 September 2026, and the first with a measured cost:** `B1` / `PRQ-1` kept Search Console
access "not granted" for two days after it was granted and used, and the discovery rows looked impossible to start
while their input was already in the evidence store.

🔴 **A fifth time, found 14 September 2026:** `DEP-1`'s *"deploys on every push, and no CI"* outlived both the switch-off
of Git deployments (`774791b`) and CI's arrival — in five copies, across four documents and a workflow's own header.

🔴 **A sixth time, found 14 September 2026, and the first a command was built on:** `FACT-1`'s *"No such field exists"*
outlived the field by two days, in this register and in `DOD_MAP_AGAINST_TEXT.md`, and a whole command for row 17 was
written from that line rather than from the code. `U-DOC-1`'s sweep of every fact stated in both a summary and a body has still not been run.

---

## WHAT THIS REGISTER DID NOT DO

- 🔴 **Nothing fixed.** `A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, `CS-1`, `CS-2`, `SUB-1`, CRLF — **all
  RECORD**. `DEP-2` is closed by the owner's ruling and **is not reopened**.
- **No claim, no page, no build, no schema, no refactor, no activation, no spend, no production
  change, no S2/S3, no Phase 1 code, no connected product's data filled.**
- **No new GREEN requested.** Every missing capability is written as a gap.
- **No gap in two registers.** The two owner actions are held in a third list and are not counted
  as either.
- **No blank cell filled by inference.** Where a thing is not known it says UNKNOWN, and where a
  measurement was refused — the GitHub billing scope, Hetzner's client-rendered prices — **the
  refusal is recorded rather than routed around.**
