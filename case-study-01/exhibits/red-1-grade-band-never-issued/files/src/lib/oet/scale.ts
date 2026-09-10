// The single source of truth for the Occupational English Test scale in AlmiOET.
//
// OET reports a score from 0 to 500 for each sub-test (in 10-point increments),
// each mapped to an A–E grade.
//
// GRADE BOUNDARIES — CITED, not remembered. The artefact is no longer stored.
//
//   "Understanding OET scores", Occupational English Test, retrieved 2026-08-31
//   via https://www.occupationalenglishtest.org/re-marking-policy -> "Learn more"
//   Citation register: docs/sources/README.md
//
// 🔴 THE PDF WAS REMOVED FROM THIS REPOSITORY ON 2026-09-02. It is OET's own
// copyrighted publication, and keeping a byte-perfect copy of it here was
// redistribution, not provenance. The numbers below stay, because a published
// grade boundary is a FACT and facts are not the copyrighted part — but nobody
// can re-hash the artefact any more. What guards them now is the citation above
// plus two independent hand-typed transcriptions (this file and
// scripts/gates/sources.ts) that gate S3 cross-checks. Two readers agreeing is
// weaker than a hash. Re-verification is a human opening the cited page.
//
// Its published table, transcribed row for row:
//
//     A   450–500
//     B   400–440
//     B   350–390
//     C+  300–340
//     C   250–290
//     C   200–240
//
// So the floors are A 450, B 350, C+ 300, C 200.
//
// 🔴 WHAT WAS HERE BEFORE, AND WHY IT IS GONE. This file used to carry a comment
// claiming the earlier values "were WRONG below C+" and that "a 220 was shown as
// C when OET awards D". THAT COMMENT WAS FALSE. The PDF above puts 200–240 under
// C. It was written on 2026-08-04 with the word "re-verified" and no artefact of
// any kind, and it shipped a C floor of 250 for 27 days — so a score of 220 was
// graded D by us and C by OET's own document. A confident sentence with no file
// beside it is a claim, not evidence. `npm run gate:sources` now fails if
// "verified"/"re-verified" appears beside a number in this file without a
// docs/sources/ filename in the same comment block.
//
// 🔴 D AND E ARE NOT DEFINED HERE, DELIBERATELY. The PDF has NO D row and NO E
// row. OET's Results-and-Scoring page nevertheless says grades run "from A
// (highest) to E (lowest)". Two official OET sources, and they disagree about
// what lies below 200. Both are recorded (see docs/sources/README.md); neither is
// resolved in the other's favour. Restoring C's floor to 200 is sourced.
// Inventing a D range or an E range beneath it is not — so `gradeForScore`
// returns null below 200 and callers print the score range with the words
// "below the published grade bands" rather than a letter nothing backs.
//
// OVERALL SCORE: this file previously asserted "There is NO composite/overall".
// That is no longer true — since 29 January 2025 OET also reports an overall
// score alongside the four sub-test scores. The false claim is removed here, but
// AlmiOET deliberately does NOT compute one yet: OET's official method for
// deriving it is not something we will guess at, and an invented formula printed
// next to real sub-test grades would be worse than no number at all. See
// `overallScoreSupported()` below.
//
// AlmiOET turns practice performance into an HONEST estimate RANGE on this scale
// — deliberately wide, because a practice task is not the calibrated live exam.
// The fraction→range buckets are a documented practice heuristic, NOT OET's
// scoring algorithm (which is proprietary and varies slightly per test form). We
// always tell the user to confirm the score they need with their regulator.

import type { OetGrade, Range } from "@/lib/oet/types";

export const OET_MIN = 0;
export const OET_MAX = 500;
export const OET_STEP = 10; // OET reports in 10-point increments
export const OET_BENCHMARK_B = 350; // Grade B — the common regulator benchmark

// Official grade boundaries (lower bound of each grade), highest first.
//
// Every floor here is read off the transcribed table at the top of this file.
// There is no row below C, because the artefact publishes none. Adding one is a
// content decision that needs a new artefact in docs/sources/, not an edit here.
//
// `scripts/gates/sources.ts` cross-checks this array, floor for floor, against
// GRADE_FLOORS_PUBLISHED in src/lib/oet/exam-shape.ts. Both sides are hand-typed
// from the PDF; neither is derived from the other.
const GRADE_FLOORS: { grade: OetGrade; floor: number }[] = [
  { grade: "A", floor: 450 },
  { grade: "B", floor: 350 },
  { grade: "C+", floor: 300 },
  { grade: "C", floor: 200 },
];

/** The wording every caller must use where `gradeForScore` returns null. It is
 *  not "Grade E" and not "below E": it is the absence of a published band, and it
 *  says so. Exported so the phrase exists once, and so a gate can grep for it. */
export const BELOW_PUBLISHED_BANDS = "below the published grade bands";

/** OET has reported an overall score since 29 Jan 2025, alongside the four
 *  sub-test scores. AlmiOET does not yet derive one: the official method is not
 *  published in a form we have verified, and a plausible-looking invented number
 *  shown beside real sub-test grades would read as authoritative while being
 *  guesswork. Kept as an explicit, greppable "not yet" rather than silence, so
 *  the gap is visible instead of looking like an oversight. */
export function overallScoreSupported(): false {
  return false;
}

/** Clamp to [0,500] and snap to the nearest multiple of 10 — the OET grid. */
export function snapToScale(n: number): number {
  const clamped = Math.min(OET_MAX, Math.max(OET_MIN, n));
  return Math.round(clamped / OET_STEP) * OET_STEP;
}

export function snapRange(lo: number, hi: number): Range {
  const a = snapToScale(Math.min(lo, hi));
  const b = snapToScale(Math.max(lo, hi));
  return [a, b] as const;
}

/** The official OET letter grade for a 0–500 score, or null below 200.
 *
 *  null is not "we failed to compute one". It means OET's own scoring document
 *  publishes no band containing this score, and we will not print a letter we
 *  cannot source. Render `BELOW_PUBLISHED_BANDS` beside the score range instead.
 *
 *  This previously returned "E". "E" is a grade OET's Results-and-Scoring page
 *  names but the scoring PDF gives no range for — so returning it put a specific
 *  letter on a score whose band no official source defines. */
export function gradeForScore(score: number): OetGrade | null {
  for (const { grade, floor } of GRADE_FLOORS) {
    if (score >= floor) return grade;
  }
  return null;
}

// Coarse performance buckets. `fraction` is 0..1 — the share of the available
// quality signal earned (objective: correct/total; productive: AI trait level
// normalised to 0..1). Each maps to a wide, humble range on the 0–500 scale.
// Intentionally overlapping — we never claim a precise OET number.
const BUCKETS: { min: number; range: Range }[] = [
  { min: 0.0, range: [0, 120] },
  { min: 0.35, range: [90, 220] },
  { min: 0.55, range: [180, 320] },
  { min: 0.7, range: [280, 400] },
  { min: 0.82, range: [350, 450] },
  { min: 0.92, range: [430, 500] },
];

/** Map a 0..1 performance fraction to a practice-estimate range on 0–500. */
export function fractionToRange(fraction: number): Range {
  const f = Math.min(1, Math.max(0, fraction));
  let chosen = BUCKETS[0];
  for (const b of BUCKETS) {
    if (f >= b.min) chosen = b;
  }
  return snapRange(chosen.range[0], chosen.range[1]);
}

export type GradeEstimate = { lo: number; hi: number; grade: OetGrade | null };

/** Turn a 0..1 fraction into a full estimate: a 0–500 range + the grade of its
 *  midpoint. The grade is the honest "most likely" band for this practice run. */
export function fractionToEstimate(fraction: number): GradeEstimate {
  const [lo, hi] = fractionToRange(fraction);
  const grade = gradeForScore(rangeMidpoint([lo, hi]));
  return { lo, hi, grade };
}

export function rangeMidpoint(range: Range): number {
  return (range[0] + range[1]) / 2;
}

/** CEFR alignment for a 0–500 score:
 *
 *      A  (450–500) → C2
 *      B  (350–440) → C1
 *      C+ (300–340) → B2
 *      C and below  → NO CEFR level is claimed
 *
 *  🔴 THIS MAPPING IS UNSOURCED IN THIS REPO. It previously carried the words
 *  "re-verified 2026-08-04 against OET's own published CEFR alignment". No
 *  artefact backing that exists. The one artefact we cite,
 *  "Understanding OET scores" (see docs/sources/README.md), was read end to end
 *  on 2026-08-31: it contains the grade table and the band descriptors and NO
 *  CEFR alignment of any kind. So the claim of verification was removed — the
 *  same failure that put a wrong C floor in this file for 27 days, caught here by
 *  `npm run gate:sources`, which fails on "verified" beside a score with no
 *  docs/sources/ file named in the same comment block.
 *
 *  THE NUMBERS ARE UNCHANGED. Removing an unsourced claim is not licence to
 *  invent a sourced one: a number moves only together with a quoted sentence and
 *  a URL, and there is none here yet. Treat this function as an open item for the
 *  owner — either an artefact lands in docs/sources/ and this comment names it,
 *  or the hint stops being shown.
 *
 *  The previous version mapped anything ≥200 to B2 and everything below to
 *  "below B2", citing the UK NARIC study. That over-claimed: it handed a B2
 *  label to grades OET does not align to a CEFR level at all, and "below B2"
 *  read as a measurement when it was an absence of one.
 *
 *  Returns null rather than a string for the unaligned grades, so a caller has
 *  to decide what to show. A hint that cannot be sourced should be missing from
 *  the UI, not rendered as a vaguer hint. */
export function cefrHint(score: number): "B2" | "C1" | "C2" | null {
  if (score >= 450) return "C2";
  if (score >= 350) return "C1";
  if (score >= 300) return "B2";
  return null;
}

/** Honest readiness label relative to the common Grade B (350) benchmark.
 *  A label for orientation, never a number we'd defend as an OET score. */
export type ReadinessBand =
  | "Below benchmark"
  | "Approaching benchmark"
  | "At benchmark"
  | "Above benchmark";

export function readinessBand(midpoint: number): ReadinessBand {
  if (midpoint >= 450) return "Above benchmark";
  if (midpoint >= 350) return "At benchmark";
  if (midpoint >= 280) return "Approaching benchmark";
  return "Below benchmark";
}

/** Format a range for display, e.g. "350–450". */
export function formatRange(range: Range): string {
  return `${range[0]}–${range[1]}`;
}
