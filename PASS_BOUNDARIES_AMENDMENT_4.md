# ALMIVISIBILITY — PASS BOUNDARIES, AMENDMENT 4 · THE OWNER'S TEXT

**Provenance — read this before using the text below.**

- **Source file:** `AlmiVisibility_OWNER_RULING_2026-09-13_AMENDMENT_4_SCOPE_OPENS.md`
- **Location when read:** `C:\Projects\_handoffs\` on this machine, committed there (`e8d821a`) before anything was built from it.
- **Ruled:** **13 September 2026**, by the owner, under AlmiWorld Product Command §12 (owner override). Authored by beta-g.
- **Amends:** `PASS_BOUNDARIES_SOURCE.md` — the **class** of rows 3, 4, 5, 6 and 7, and nothing else. **No boundary
  text changes and no threshold moves.** `PASS_BOUNDARIES_SOURCE.md` is untouched and still verifies byte for byte.
- **Copy rule:** the body below is the brief's preamble, **§1, §3 and §4**, and its closing line — **verbatim**, cut by a
  script as contiguous slices of the file at the brief's own section headings. Nothing retyped, paraphrased or corrected.
- **Not carried:** §2 (the reason; it stays in `_handoffs`) · §5 (the gap-register correction, applied to
  `PHASE_0_FROZEN_GAP_REGISTER.md` in the same PR) · §6 (**not ruled** — waiting on the owner) · §7 (instructions to CC, not law).

## Why it exists

The 28 class-D rows included the discovery rows, and with them out of scope the only data the in-scope rows had to chew
on was one connected product's. The owner ruled that exclusion is what kept AlmiVisibility shaped like that product's
audit tool, and opened the rows whose **input is already in the owned evidence store** — testing each against its own
frozen INPUT clause rather than waiving the test. This is a boundary's **class** changing by owner ruling, recorded
with its date and reason — the mechanism Amendments 1 and 2 used.

## Hash verification

| artifact | bytes | sha256 |
|---|---|---|
| `AlmiVisibility_OWNER_RULING_2026-09-13_AMENDMENT_4_SCOPE_OPENS.md` as read | 9,970 | `06c69a50072f75f4d668aa4add9debb5ac3ab3b963efbd9ea6fc0e98f2bc3230` |
| the body below (LF-normalised) | — | `4d0dea705dbfb27e25263bca5bbc0c1efa79546b02dd6c7805e77380825f61d1` |

🔴 Verified by `tools/verify-pass-boundaries-source.mjs`. The class moves are **read out of the body's verdict table**,
not typed into code, and the census they produce is checked against the body's own count table.

## Independent census of the body

| | |
|---|---|
| rows moved **D → P** | **3** — 4, 5, 6 |
| rows moved **D → S** (split) | **2** — 3, 7 |
| rows that **stay D**, with the reason on the row | **1** — 2 |
| class census, frozen → effective | **P 24 → 27 · S 6 → 8 · D 28 → 23** |

## 🔴 What the ruling does not settle — raised, not filled in

1. **Row 7's five measurements are not all assigned.** The verdict names DEMAND and VISIBILITY as owned and SUPPLY and
   AUDIENCE as needing external evidence. **WORTHINESS is in neither half.** It is recorded on the row as unassigned.
2. **Rows 3 and 7 have no four-part contract for their owned half** — the gap Amendment 1 closed for the first six
   splits. The only four parts on file are the full §6 boundaries. The ledger names the halves as the verdict states
   them and does not author a v0.1-half INPUT / EXPECTED / FAILURE / EVIDENCE. Both are questions for the owner.

---

# OWNER RULING · AMENDMENT 4 — THE DISCOVERY ROWS ENTER SCOPE

**Ruled by the owner, S.M. Nasir Uz Zaman, 13 September 2026. Authored by beta-g at his instruction.**
Authority: **AlmiWorld Product Command §12, Owner override** — *"The owner may change commercial terms,
priority, scope or an explicit requirement. Record the change with date, reason and affected gates."*

Committed to `_handoffs` **before** it is given to CC, per the rule this project bought on 13 Sep morning.

> 🔴 **This amendment does NOT edit `PASS_BOUNDARIES_SOURCE.md`.** That file is hash-verified and the
> owner's frozen text stays byte-for-byte as ruled on 12 September. **No boundary is rewritten. No
> threshold moves.** Only the **class** of six rows changes — the same mechanism Amendments 1 and 2 used.

---

## 1 · THE RULING

**Rows 2, 3, 4, 5, 6 and 7 — the discovery rows — leave `class D` (deferred) and enter the completion path.**

The frozen v0.1 boundary excluded them. The owner has ruled that exclusion is what keeps AlmiVisibility
shaped like one product's audit tool instead of the independent, general product it is defined to be.

---

## 3 · THE INPUT TEST, APPLIED ROW BY ROW — NOT WAIVED

The owner's rule of 13 September morning:

> 🔴 *"A row whose INPUT does not exist in the current frozen phase must not be created. It would be born
> ⏭ DEFERRED, and a row born deferred is paperwork, not progress."*

**So each of the six was tested against its own frozen INPUT clause before being moved.** The input was
measured in `runs/evidence/evidence.jsonl`, from the Search Console ingest run of **2026-09-12T23:25Z**
(page rows from the 22:06Z run of the same day):

| owned evidence already captured | rows |
|---|---|
| `gsc.searchAnalytics.query:query` | **337** |
| `gsc.searchAnalytics.query:query-page` | **574** |
| `gsc.searchAnalytics.query:country` | **126** |
| `gsc.searchAnalytics.query:country-query` | **388** |
| `gsc.searchAnalytics.query:page-rows` | **1,525** |

All of it **owned, already captured, free**. Reading it costs no fetch, no crawl and no spend.

### The verdict per row

| row | its frozen INPUT clause, verbatim | is that input present today? | class |
|---|---|---|---|
| **4 · Localized Human Thinking** | *"the same goal expressed from two or more countries"* | ✅ **yes** — 388 country×query rows across 126 countries | **D → P** |
| **5 · Intent & Question Clustering** | *"a set of differently worded questions with the same underlying intent"* | ✅ **yes** — 337 owned queries | **D → P** |
| **6 · Axis Discovery** | *"the subject's real evidence"* | ✅ **yes** — the evidence store: queries, countries, pages | **D → P** |
| **3 · Keyword & Search-Language Discovery** | *"**owned search data** plus legitimate public search evidence"* | 🟡 **half** — the owned half is present; the public half needs an external fetch | **D → S (split)** |
| **7 · Market Measurement** | five measurements, separately: SUPPLY · VISIBILITY/REACH · DEMAND · AUDIENCE/NEED · WORTHINESS | 🟡 **two of five** — DEMAND and VISIBILITY are owned; SUPPLY and AUDIENCE need external evidence | **D → S (split)** |
| **2 · Human Question Discovery** | *"a declared subject and **legitimate public question evidence**"* | ❌ **no** — its input is public evidence, and no fetch is authorised | **stays D** |

🔴 **Row 2 is deliberately left deferred, and that is the amendment obeying the owner's own rule rather
than bending it.** Moving it in tonight would create exactly the paperwork row he forbade. It enters scope
on the day a bounded external-evidence GREEN is given, and not before.

**Class S is not a new invention** — six rows already carry it under the 12 September ruling. The owned
half of rows 3 and 7 may be ticked; the public half stays deferred and is named as such on the row.

### The count

| | before | after |
|---|---|---|
| DEFERRED | 28 | **23** |
| in scope | 30 | **35** |
| in scope once Amendment 3 (rows 59, 60) lands | 32 | **37** |

---

## 4 · WHAT DOES **NOT** CHANGE

Recorded explicitly, because a scope amendment is the easiest place to smuggle one in.

- **Page generation and publishing stay excluded from v0.1**, in every form. V5.1 §62 stands: *the safest
  cost gate is the absent feature*.
- **No writes to any other product's repository.** No edit, no PR, no branch anywhere but `almi-visibility`.
- **The SEV-0 mass-page and cost gates** are untouched.
- **Case Study #1's contract** is untouched: the full RED set with clean controls, and it may not be
  rewritten to fit what the engine happens to detect.
- **One product at a time. One branch, one PR, one merge. CC does not merge; Nasir merges.**
- **No network fetch, no crawl, no paid provider, no production write, no deploy** without the owner's GREEN.
  Reading the already-captured owned evidence store is none of those things.
- **Every frozen PASS boundary keeps its exact wording.** This amendment changes class, never text.
- **Nothing already CLOSED reopens.** Anti-circle law: audit once, freeze, fix, verify, close.

---

**END — AMENDMENT 4. The standard did not move. The scope did, by owner ruling, with its date and reason.**
