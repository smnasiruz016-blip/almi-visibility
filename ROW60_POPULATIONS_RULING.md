# ROW 60 — OPTION A: A DECISION ON RECORD IS NOT A FINDING EITHER · 14 SEPTEMBER 2026

🔴 **FROZEN. Do not edit.** `test/populations.test.mjs` pins this file's hash.

- **Ruled by:** the owner, 14 September 2026 (Option A). Handing over the command reproduced in Part 1 is that
  ruling. CC stopped once before building, because the archive rule as written swept a class the owner had ruled.
  The owner's answer, recorded verbatim in Part 2, governs wherever it differs from the command.
- **What stays unchanged:** `ROW60_CONSEQUENCE_LAW.md` and the five-level scale. This ruling changes what is counted
  as a LIVE FINDING. It changes no level's meaning.

---

## PART 1 — THE RULING (the command's words, verbatim)

```
THE RULING — THERE ARE THREE LIVE POPULATIONS AND ONE ARCHIVE
  FINDINGS            a check ran and found something          → carries a level
  COVERAGE GAP        a check never ran                        → never a level   (already built)
  DECISION ON RECORD  a deliberate choice whose consequence is
                      not established                          → never a level, awaits the owner
  AUDIT TRAIL         a claim that was withdrawn; nothing open → not live at all

  → withdrawn-claim goes to AUDIT TRAIL. A class with zero open issues is not a live finding
    class; it is history, kept and queryable, never counted as live.
  → declared-deliberate goes to DECISION ON RECORD. Its detector is a REVIEW, not a detection,
    and its own record says: "Whether it is still the right rule is UNKNOWN from our evidence:
    the premise it cites is not confirmed by our similarity measurement. Owner's decision:
    REC-NOINDEX-CV-GUIDE."

THE INVARIANT THAT MATTERS MOST
Those 134 pages hold 484 impressions and NONE of them is thin (median 473 unique body words).
They are de-indexed on a near-duplicate premise our own measurement does not confirm — sibling
similarity averages 0.685 and none reaches 0.8.
A DECISION ON RECORD MUST BE MORE VISIBLE THAN A FINDING, NOT LESS. It is waiting on a human.
If this reclassification makes those pages quieter on the owner's report than they are today,
the change has done harm and must not ship. The report must show the decision population, its
count, its impressions, and the recommendation id it waits on.
```

## PART 2 — THE ARCHIVE RULE: THE OWNER'S ANSWER, 14 SEPTEMBER 2026 (verbatim), AND WHY IT WAS ASKED

```
Q: The command archives a class because it has zero open issues. That rule also sweeps
   instrument-disagreement (11, all CLOSED, ruled HIGH, reason 'Base severity describes the
   class, not today's zero'). Which rule decides what goes to the AUDIT TRAIL?
A: Withdrawn claims only (Recommended)
```

**The answer governs the command's "a class with zero open issues is not a live finding class".** What goes to the
audit trail is ONLY issues SUPERSEDED because their premise was wrong. `instrument-disagreement` keeps its ruled HIGH
and stays a live finding class: a real defect that was CLOSED is still a finding.

## PART 3 — THE SELF-CHECK, AS APPLIED (the ANTI-CIRCLE law)

This ruling moves a definition while row 60 is blocked by that definition. The test applied to each class was:
**would this be proposed if row 60 were not blocked?**

| class | the command's ground | CC's answer |
|---|---|---|
| `noindex-defect-claim-withdrawn` (134, detector `noindex`, verdict FAIL, all SUPERSEDED, 0 open) | "a class with zero open issues is not a live finding class" | **Fails on that ground, and passes on a narrower one.** The zero-open rule would also archive `instrument-disagreement`, whose owner-adopted reason is *"Base severity describes the class, not today's zero"*, so it is not a rule the project applies anywhere else. But every one of the 134 was SUPERSEDED by a state change reading *"this issue's premise was that noindex on this page is a DEFECT. Later evidence shows it is a DELIBERATE DE-INDEXING DECISION"*. A withdrawn claim is not a finding, whether or not any row is blocked. **PASSES on "withdrawn claims only", the owner's answer.** |
| `noindex-declared-deliberate` (134, detector `noindex.origin-review`, verdict UNKNOWN, all OPEN) | "its detector is a REVIEW, not a detection, and its own record declares a pending owner decision" | **PASSES.** The ground stands without row 60: the record was written on 12 September, two days before anyone asked whether row 60 could pass, and its own reason names the owner's decision (REC-NOINDEX-CV-GUIDE). Nothing was detected. A choice was recorded, and whether it harms is not established. |
