# PHASE 0 · FROZEN ITEM 6 — THE CASE STUDY #1 ACCEPTANCE CONTRACT, FROZEN

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

**Read first, per AUDIT ONCE:** `ARCHITECTURE_AND_GAP_REPORT.md` **§9** and
`CASE_STUDY_01_ACCEPTANCE_TEST.md` in full. **Neither is rewritten.**

🔴 **No new corpus was built. Nothing was captured, re-fetched, re-hashed into place, edited or
deleted.** The corpus and the exhibits were **read and verified**, and the artefacts themselves were
not touched — **you do not edit the thing you are freezing.** `almi-oet` and `almi-italian` were
read only; both working trees show **0 changes** after this work.

---

# 1 · THE CONTRACT — FROZEN AS IT STANDS, IN ONE PLACE

**Nothing below is new. It is what already exists, gathered so the contract can be pointed at.**

## 1.1 · The pass mark — unchanged, and it was written before any result existed

| | |
|---|---|
| **PASS** | **6 of 6 RED defects found unaided** **AND** **0 of 3 CONTROL pages flagged** |
| **FAIL** | anything else — **including 6/6 RED with one control false positive** |

**There is no half pass.** Amendment 1 (10 September, owner-approved) states explicitly: *"THE PASS
MARK IS 6 of 6. IT HAS NOT BEEN LOWERED."*

## 1.2 · What the engine is told, and what it is not

**The engine is never told where the defects are.** That clause is in the test document and is part
of this freeze.

## 1.3 · The inputs, exactly

| | count |
|---|---|
| tracked files under `case-study-01/` | **57** |
| corpus files | **23** — 9 `.html`, 9 `.headers.json`, `manifest.json`, `MANIFEST.md` |
| exhibit files | **34**, in **4** exhibit entries |
| corpus captured at | **2026-09-10T01:13:58.421Z** |
| exhibits frozen at | **2026-09-10T06:25:57.955Z** |

## 1.4 · Why the input is frozen at all — §9's finding, restated not re-derived

> *"Most of these defects were **fixed**. A test that runs against the live site would find nothing
> and would decay every time a page changes. **The test therefore requires a FROZEN INPUT
> CORPUS.**"*

**Two of the six remain reproducible live**, measured in Phase 0 and marked as such.

---

# 2 · 🔴 THE FREEZE, VERIFIED — BECAUSE A FREEZE NOBODY CHECKED IS A CLAIM

## 2.1 · Corpus content — **9 of 9 verified intact**

Every `.html` file was re-hashed with SHA-256 and compared against its recorded pin.

| | |
|---|---|
| pages pinned **in `manifest.json`**, hash matches the file | **8 of 9** |
| pages pinned **in their `headers.json`** as `bodySha256`, hash matches the file | **1 of 9** |
| 🔴 **pages whose content has drifted** | **0** |
| files on disk not pinned by anything | **0** |

> ### ✅ THE CORPUS IS GENUINELY FROZEN. NOT ONE BYTE OF CONTENT HAS MOVED.

## 2.2 · ⚠️ AND MY FIRST READING OF IT WAS WRONG — RECORDED, NOT QUIETLY FIXED

The first pass of this verification reported **"0 of 9 match, 9 drifted"**. **That was false**, and
it was false for two reasons, both mine:

| my error | the truth |
|---|---|
| I compared `Buffer.length` against the manifest's `bytes` field | 🔴 **`bytes` is STRING length, not byte length.** Verified exactly: `control-1` manifest 62,938 = `String.length` 62,938, while `Buffer.length` is 63,062. The difference is the multi-byte characters. **The field is misnamed; nothing drifted** |
| I read `"sha256": "see red3-leaf-org-page.headers.json"` as a missing hash | it is a **pointer**, and the hash it points at **matches the file exactly** |

> **A verification that reports drift because it measured the wrong unit is worse than no
> verification.** It would have condemned an intact corpus. **Caught inside the same measurement,
> and recorded here rather than silently corrected.**

## 2.3 · Two real defects in the pin **metadata** — which do not void the freeze

| | |
|---|---|
| 🔴 `red3-leaf-org-page.sha256` holds a **sentence, not a hash** | the real pin exists in `headers.json` and matches — **but a machine reading `manifest.json` alone cannot verify that page** |
| 🔴 the same entry's `bytes: 63404` is **wrong by any convention** | its actual string length is **64,748**; `63404` is **exactly the figure recorded for `control-3-ie-nmbi`** — a copy-paste |
| ⚠️ the `bytes` field is **string length throughout**, under a name that says bytes | harmless until something compares it to a byte count. Something did: this document's first pass |

**None of these touches content. All nine pages are intact.** What is defective is the **manifest's
ability to prove it unaided.**

🔴 **Not fixed here, deliberately.** Editing a manifest during the act of freezing it would mean the
frozen artefact is one nobody has yet verified. **Recorded as `CS-1`; the correction belongs to
whoever re-pins next, and it must be a re-pin, not an edit.**

## 2.4 · Exhibit pins — **8 of 8 commits resolve**

`exhibits/index.json` carries `frozenAt` and 4 exhibit entries, pinned **by commit SHA** rather than
by content hash. Every SHA named in Amendment 1's table was checked with `git cat-file -t`:

| repository | defect-present → fixed | resolve? |
|---|---|---|
| `almi-oet` | `8877c6e` → `4ed34bb` | ✅ both `commit` |
| `almi-italian` | `d83ddd9` → `a191883` | ✅ both `commit` |
| `almi-oet` | `e99b199` → `45355be` | ✅ both `commit` |
| `almi-italian` | `14a0f7d` → `a2a6a2a` | ✅ both `commit` |

⚠️ **But `exhibits/index.json` contains no `sha256` anywhere.** A commit SHA pins what the *source
repository* held; it does **not** pin the 34 copied files sitting in this repository. **If one of
those copies were edited, nothing would notice** — `CS-2`.

---

# 3 · WHAT THIS FREEZE DOES **NOT** COVER

| | |
|---|---|
| the corpus is 9 pages | §9's design needs a frozen input **for the defects it can still exercise**. It is not a sample of the network and must not be reported as one |
| no run has ever happened | **the test has never been executed.** A frozen contract with no result is a contract, not evidence |
| `bin/acceptance-test.mjs` exists | it is product-neutral and present; **whether it implements this contract has not been verified**, and verifying it is not Phase 0 |
| **2 of 6 live-reproducible** | recorded in the test document; **not re-measured here** |

---

# 4 · UNKNOWNs — FOUR FIELDS

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-CS-1** | whether `bin/acceptance-test.mjs` implements **this** contract | it exists and is product-neutral; its behaviour against the 6/6 + 0/3 mark has never been observed | one run against the frozen corpus | later phase | first run |
| **U-CS-2** | whether the 34 exhibit copies still match their source commits | they are pinned by commit SHA, and **no content hash exists for the copies** | hash each copy against the file at its pinned commit | later phase | before the first run |
| **U-CS-3** | whether the 4 unfixed-side commits still contain the defect as described | the SHAs resolve; **the defect's presence at that SHA was not re-verified today** | read each file at its pinned commit | later phase | before the first run |
| **U-CS-4** | whether 9 pages are enough to exercise 6 REDs and 3 CONTROLs | 3 pages are the controls, leaving 6 for six defects — **a one-to-one fit with no margin** | map each RED to the page that carries it | later phase | before the first run |

---

# 5 · GAP REGISTER — ADDITIONS

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **CS-1** | the corpus manifest cannot verify itself unaided — one entry's `sha256` is a pointer, its `bytes` is another page's figure, and `bytes` is string length under a name that says bytes | §2.3 |
| **CS-2** | the 34 exhibit copies are pinned by **commit SHA only**; no content hash exists, so an edited copy would go unnoticed | §2.4 |
| **CS-3** | **the acceptance test has never been run.** A frozen contract with no result is a contract, not evidence | §3 |

## PRODUCT DATA GAPS

**None added by this document.**

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **No new corpus built. Nothing captured, re-fetched, re-hashed into place, edited or deleted.**
- **The manifest's two real defects were NOT fixed** — editing an artefact during the act of
  freezing it would leave a frozen artefact nobody has verified. Recorded as `CS-1`.
- **The acceptance test was not run.** Running it is not Phase 0.
- **The pass mark was not touched.** 6 of 6 and 0 of 3, exactly as the owner approved.
- **`almi-oet` and `almi-italian` read only** — `git cat-file -t` only; both working trees show
  **0 changes**.
- **No section of §9 or of the acceptance-test document rewritten.**
- **`A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, CRLF — recorded, not fixed.**
- **No claim, no page, no build, no schema, no refactor, no Phase 1 code. No new GREEN requested.**
