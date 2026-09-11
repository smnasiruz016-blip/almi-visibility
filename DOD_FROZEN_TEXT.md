# THE DEFINITION OF DONE — ✅ THE FROZEN TEXT IS NOW IN THE REPOSITORY

> ## ✅ UNKNOWN CLOSED — 11 September 2026.
>
> **The frozen text is at `DOD_FROZEN_TEXT_SOURCE.md`**, copied byte-for-byte (SHA-256 verified
> against the handoff copy) with its provenance header intact. **21 identifiers: `DOD-01`…`DOD-20`
> plus `DOD-03A`.**
>
> **Where it actually was:** the owner uploaded
> `ALMIVISIBILITY_DEFINITION_OF_DONE_FINAL_1.docx` into the **Cowork conversation on 10 September
> 2026, 18:25**. It lives in that session's upload store. **`C:\Projects\…` does not contain it and
> never did.**

## 🔴 THE SEARCH RECORD BELOW IS KEPT, NOT DELETED — IT IS THE USEFUL PART

**The search was correct and its `UNKNOWN` was correct.** The file was not in the estate, so no
amount of searching the estate could have found it. **What follows is the record of a search that
found nothing because there was nothing there** — and that is a different thing from a search that
missed something.

> **It is kept for one reason: the next time a document cannot be found, this is the evidence that
> "I looked and it is not here" is a finding, not a failure — and that the right response is to ask
> rather than to write one.**

⚠️ **And the discipline it bought was the expensive part.** Had a plausible Definition of Done been
reconstructed from the status labels, it would have been indistinguishable from an invented one —
and §3 below shows exactly what that would have cost: **the real text contains requirements the
labels never hinted at**, and a reconstruction would have contained the hints instead of the
requirements.

---

# 0 · WHAT THE REAL TEXT CHANGED — one correction to this document's own finding

This file originally recorded that *"the other 18 rows could be checked against nothing."*

**Half right, and the half that was wrong matters.** The table rows **are** labels — that part
stands. But **the requirements were never in the table**: they are in **§1 through §5A**, which
carry real, testable sentences. A map built from the table alone was reading the index and calling
it the book.

**The map has been rebuilt against the text — see `DOD_MAP_AGAINST_TEXT.md`.**

---

# 1 · THE SEARCH, SO IT CAN BE REPEATED OR CONTRADICTED

| where | command | result |
|---|---|---|
| every handoff document | `grep -rl "DOD-01" C:/Projects/_handoffs` | **4 files — all status tables or references** |
| every requirement-shaped statement | `grep -rhoE "DOD-[0-9]+[A]? *[—\|:] *[A-Za-z]..."` across all `*.md` | 🔴 **no matches. Not one DoD item is stated as a requirement** |
| every `.docx` in `_handoffs` (22 of them, unzipped and stripped of markup) | `zipfile` + tag strip, counting `DOD-\d` | 🔴 **0 hits in every single one** |
| the whole projects tree | `rg "DOD-03A\|DOD-19\|DOD-20"` | 19 files — **all statuses, all mentions, no text** |
| the AlmiVisibility spec texts | `grep -c "DOD-0…"` on `ALMIVISIBILITY_SPEC_v3_text.md`, `AlmiVisibility_V5_FINAL_text*.md` | **0, 0, 0** |
| a document named for it | `find C:/Projects -maxdepth 3 -iname "*definition*"` / `-iname "*dod*"` | nothing for this product |

⚠️ **`_handoffs` does hold a Definition of Done — for a different product.** `AlmiOET_FREEZE_2026-09-07.md`
§6 carries *"the sixteen lines"*, and `AlmiOET_DOD_LEDGER.docx` exists. **Neither is this product's,
and neither is used here.**

## 1.1 · What DOES exist, and exactly what it is worth

| artefact | what it is | what it is NOT |
|---|---|---|
| `AlmiVisibility_HANDOFF_2026-09-10.md` lines 37–56 | a **status table**: 21 rows of id, two-to-five-word label, and a RED/AMBER state | **not a requirement.** *"Cost governor"* does not say what a cost governor must do |
| `ALMIVISIBILITY_COMPLETION_PLAN.md` | a plan that **references** the frozen DoD | does not contain it |
| `FACT_CACHE_DESIGN.md` | 🔴 **three quoted FRAGMENTS of `§5A`** — see §2 | not §5A |

---

# 2 · THE ONLY DoD TEXT THAT EXISTS IN THIS REPOSITORY — THREE FRAGMENTS

**Quoted here because they are already quoted in the repository, and because the map in
`PHASE_0_ITEM_7_DOD_ARCHITECTURE_MAP.md` was checked against them.** They are **fragments of `§5A`
only**; `DOD-01`…`DOD-20` have none at all.

| fragment | quoted in |
|---|---|
| *"A REGISTRY SCHEMA WITH ZERO USABLE SUPPLY IS NOT PASS."* | `FACT_CACHE_DESIGN.md` §8 |
| *"without requiring manual hand-writing of **EVERY** record"* | `FACT_CACHE_DESIGN.md`, with a recorded correction: it had been read as *"no record is hand-written"*, **and it does not say that** |
| *"Facts must be reusable by reference. Page generation must not create independent untraceable copies of the same factual claim."* | `products/almi-oet/page-specs.mjs` header |

> ⚠️ **Three sentences are not a section.** They are what previous work happened to quote, which
> means **the parts nobody quoted are the parts nobody has ever checked against.**

---

# 3 · RE-CHECKING ITEM 7's MAP AGAINST THE TEXT — WHY IT COULD NOT BE DONE

Item 7's map was to be re-checked against the **text** rather than the table. **With three fragments
and no requirements, that check cannot run**, and reporting that it did would be worse than not
running it.

**What was checked, against the three fragments that do exist:**

| fragment | the map's row | agreed? |
|---|---|---|
| *"zero usable supply is NOT PASS"* | `DOD-03A` 🟡 built and running, **failing on SUPPLY** — 2 of 12 variants | ✅ **the fragment supports the row**, and sharpens it: the engine is not the question, supply is |
| *"hand-writing of EVERY record"* | — | ⚠️ bears on `DOD-03A`'s pass condition and **no row was written against it**, because the row was derived from a status label |
| *"reusable by reference… no untraceable copies"* | `DOD-08` 🟡 furthest along | ✅ consistent — `findCopiedFacts` enforces exactly this and is tested |

**Not one of the other 18 rows could be checked against anything.** They were derived from a
two-to-five-word label, and **that is the whole of `DOD-MAP-1`.**

---

# 4 · ~~WHAT IS NEEDED, AND FROM WHOM~~ — ✅ SUPPLIED

> ### ✅ THE OWNER'S DoD DOCUMENT ARRIVED, AND IS NOW AT `DOD_FROZEN_TEXT_SOURCE.md`.
>
> ~~The frozen text of `DOD-01`…`DOD-20`, `DOD-03A`, and `§5A` in full.~~ **Supplied 11 September
> 2026.** The request below is kept because its reasoning is what made the request specific enough
> to be answerable.

**Why it could not have been substituted:**

- **Four UNKNOWNs already turn on wording nobody can read** — `U-DOD-2` (does `DOD-06`'s *"semantic"*
  mean embeddings or a rule?), `U-DOD-3` (what must `DOD-17` explain, and to whom?), `U-DOD-4` (is
  `DOD-18`'s *"rollback"* content, database or deployment?), `U-DOD-1` (has the text changed?).
- **`DOD-19` is "no unresolved blocker" and `DOD-20` is "final independent audit"** — a completion
  claim measured against a definition nobody holds is not a measurement.
- **One row has already moved once** on evidence rather than text: `DOD-03A` was carried as *"not
  started"* after the engine was built, merged and measured.

✅ **It has arrived, and item 7's map has been rebuilt against the text** — `DOD_MAP_AGAINST_TEXT.md`.
The old map is **marked superseded, not deleted**: a reading that changed when the evidence arrived
is worth keeping visible, and the difference between the two is the measure of what a label-based
map was worth.

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **It did not write a Definition of Done.** No requirement text was drafted, paraphrased,
  reconstructed or inferred — **not one line.**
- It did not borrow another product's DoD, though one exists in `_handoffs` for AlmiOET.
- It did not upgrade or downgrade any status in item 7's map.
- It quotes only the three fragments this repository **already** quotes, each with its source.
