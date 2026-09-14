# ROW 60 — AN UNMEASURED CHECK IS NOT A FINDING · THE REMAINING LEVELS · THE VOID ESCALATION · 14 SEPTEMBER 2026

🔴 **FROZEN. Do not edit.** `test/coverage-register.test.mjs` pins this file's hash, and every text field of an entry
ruled here must appear in it word for word.

- **Ruled by:** the owner, 14 September 2026. Handing over the command reproduced in Part 1 is his ruling on its
  PART 1 and PART 2, beta-g's reasoning adopted. Three parts of it contradicted their own evidence or could not be
  applied as written. CC stopped and asked, and the owner's three answers, recorded verbatim in Part 2, govern
  wherever they differ from the command.
- **What stays unchanged:** `ROW60_CONSEQUENCE_LAW.md` and the five-level scale. This ruling changes what is
  COUNTED as a finding, and it names levels for classes that had none. It changes no level's meaning.

---

## PART 1 — THE COMMAND'S RULING TEXT (Parts 1–4, verbatim)

```
PART 1 — THE RULING: AN UNMEASURED CHECK IS NOT A FINDING

Measured across all 20 .jsonl files under runs/: 2,033 distinct issues — 673 FAIL, and 1,224
carrying a not-run reason code (MISSING_INPUT 878 · NEEDS_RENDERED_HTML 342 · TOOL_FAILED 4).

The six `-check-not-run` halves hold all 1,224:
    indexability-preflight-check-not-run            210
    near-duplicate-check-not-run                    108
    template-dominance-check-not-run                108
    thin-content-check-not-run                      108
    orphan-within-crawled-set-check-not-run         340
    sitemap-advertises-blocked-url-check-not-run    350

🔴 THESE ARE NOT FINDINGS AND MUST LEAVE THE FINDINGS POPULATION.
A check that never ran says nothing about the product. It says something about OUR INSTRUMENT:
we could not look. It has no consequence to a person, so no severity on the scale is true of
it, and putting one there would rank "we did not look" alongside "we found something".

Move them to a COVERAGE REGISTER of their own — a separate population, separately counted,
never ranked beside findings, and never given a severity level. Each entry records the class,
the count, the reason code, and what input or capability is missing.

🔴 AND THIS IS WHY IT MATTERS BEYOND TIDINESS: row 60's EXPECTED requires every finding class
to carry a consequence level. While unmeasured checks are counted as finding classes, row 60
CAN NEVER PASS, because no level is honestly true of them. Separating them is the only path by
which row 60 can ever be proved.

The owner's law applies unchanged: UNKNOWN is a classification state, not a severity. A
coverage gap is the same kind of thing, one level up — it is a fact about the instrument.

PART 2 — LEVELS FOR THE REMAINING REAL CLASSES

Six classes have no level. The owner rules these; the reasoning is beta-g's, adopted.
Take the CONSEQUENCE / REVERSIBILITY / BLAST-RADIUS / REASON shape the register already uses.

  indexability-preflight-found            158   MODERATE
      consequence   a measured condition blocks the page's eligibility to be indexed, so a page
                    that should be findable is not
      reversibility reversible — it is configuration
      blast radius  158 real findings; bounded, not systemic
      why           the same family as robots-blocks and a defect noindex: meaningful harm to
                    discovery, bounded, recoverable by normal corrective work

  near-duplicate-found                      5   MODERATE
  template-dominance-found                  2   MODERATE
  thin-content-found                      118   MODERATE
      🔴 These keep MODERATE because CONSEQUENCE decides the level and the consequence has not
      changed. Only their counts changed. Under the owner's rule volume amplifies WITHIN a
      level and never defines it, so a smaller real count does not demote them.

  noindex-declared-deliberate             134   NONE
      consequence   none adverse — the record declares an intentional de-indexing decision that
                    an earlier review verified
      reversibility not applicable; there is nothing to recover from
      blast radius  134 pages, all deliberate
      why           NONE means verified no material adverse consequence, and that is exactly
                    what these records verify. This is the only class in the store that meets
                    NONE's standard.

  noindex-defect-claim-withdrawn          134   NONE   (0 open, all SUPERSEDED)
      consequence   none — the defect claim was withdrawn and replaced by the decision record
      why           a withdrawn claim carries no consequence. It is kept for the audit trail.

PART 3 — FOUR REASONS BUILT ON VOLUME THAT WAS NOT REAL

🔴 beta-g's own error, and it must be corrected on the record, not quietly.

3a. orphan-within-crawled-set was escalated LOW → MODERATE in PR #77 on this reasoning:
    "340 is where the amplifier legitimately escalates: one orphan is a stranded page, 340 is a
    structural linking failure."
    🔴 ALL 340 ARE UNMEASURED. Zero are findings; each record says "This is not an orphan".
    THE ESCALATION IS VOID. Supersede it in place, name the cause: the blast-radius amplifier
    was applied to a count of records that were not findings — inside the very ruling whose
    purpose is to stop volume deciding severity.
    There is no `orphan-within-crawled-set-found` class in use, so there is nothing left to
    rule. Record that too.

3b. near-duplicate, template-dominance and thin-content keep MODERATE, but their REASON text
    cites 113, 110 and 226. The real figures are 5, 2 and 118. Correct the text; do not change
    the level. State on each entry that the level rests on consequence, not on the count.

3c. Add a limb that makes this class of error impossible to repeat: a register entry whose
    blast-radius figure does not match the store's REAL (FAIL) count for that class → refused.

PART 4 — WHY_THIS_URL FOR THE TWO DECLARED SPECS

The owner instructed beta-g to author these. Put each on its own spec in
products/almi-oet/page-specs.mjs, in whyThisUrlDeservesToExist, WORD FOR WORD from
AlmiVisibility_WHY_THIS_URL_RATIONALES.md. Do not paraphrase, shorten, or write a third.
```

## PART 2 — THE OWNER'S THREE ANSWERS, 14 SEPTEMBER 2026 (verbatim), AND WHY THEY WERE ASKED

```
Q: NONE means 'verified no material adverse consequence', but the 134 noindex-declared-deliberate
   records are verdict UNKNOWN — their own reason says whether the rule is right is 'UNKNOWN from
   our evidence', and the pages are not thin and hold 484 impressions. What level should the two
   noindex classes carry?
A: Leave UNCLASSIFIED (Recommended)

Q: Gate A part 4 requires whyThisUrlDeservesToExist as two fields — humanNeed and distinctValue.
   Each rationale in the brief is one paragraph. How should the two rationales be entered?
A: Split at 'This page exists' (Recommended)

Q: Rule 3c says a blast-radius figure must match the store's REAL (FAIL) count. But
   official-source-contradicts-itself and commencement-date-ambiguous-against-source are real
   findings whose verdict is UNKNOWN (FAIL count 0, text says 1). What should the check count?
A: Every real finding (Recommended)
```

- **Answer 1 governs Part 2's two NONE lines.** Both noindex classes stay UNCLASSIFIED. Neither NONE is written.
- **Answer 2 governs Part 4.** Each rationale is word for word, cut at its own sentence "This page exists to…":
  everything before that sentence is `humanNeed`, and that sentence onward is `distinctValue`. The brief's
  italics marks are dropped; no word is changed.
- **Answer 3 governs 3c.** A blast-radius figure must equal the store's count of REAL FINDINGS for that class:
  distinct issues that are not checks that never ran.
- **The 3b figures are the halves'.** 113, 110 and 226 stood in each parent's blast radius, not in its reason. The
  real findings, 5, 2 and 118, are now the `-found` halves'.

## PART 3 — THE TWO RATIONALES, REPRODUCED FROM `AlmiVisibility_WHY_THIS_URL_RATIONALES.md` (italics marks dropped)

### nursing

A nurse deciding where to register is not looking up one requirement. She is choosing between four authorities
across three destination countries, and one of them can end the journey before any exam matters: the United
Kingdom's recruitment code decides whether she may be recruited from her country at all. Each authority publishes
only its own rule, so no source she can reach answers the two questions she actually has — which of these applies
to me, and am I permitted to be recruited in the first place. This page exists to put the recruitment gate ahead of
the exam requirements, in the order the decision is really made, and to set the regulators side by side so the
choice between them can be seen at once.

### speech-pathology

A speech and language therapist has to clear a bar that no other profession the HCPC registers has to clear — a
higher total and a higher floor on every sub-test — and must sit a profession-specific version of the test rather
than the general one. The HCPC's own page states the requirement but never states the comparison, so a reader who
was told the number by a colleague in another HCPC profession has no way to discover that the number does not apply
to them. This page exists to state the difference itself, and what it changes about which test to book, how long a
certificate stays valid, and where it may be taken.
