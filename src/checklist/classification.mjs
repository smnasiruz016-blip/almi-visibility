/**
 * THE SIX-STATE CLASSIFICATION OF ALL 58 FEATURES.
 *
 * ── 🔴 WHAT THE SIXTH STATE IS FOR, AND THE TRAP IN IT ──────────────────────
 *
 * The four-state vocabulary could not express two different things:
 *
 *   TESTABLE-NOW  — the input finally exists; the falsifiable test has NOT run.
 *   DEFERRED      — frozen v0.1 deliberately does not contain this.
 *
 * Both are improvements in honesty. Both also MOVE ROWS OUT OF "NOT STARTED"
 * WITHOUT ANYTHING BEING BUILT, and a ledger that looks better because we
 * renamed its columns is the exact failure this instrument exists to prevent.
 *
 * So every row records WHY it sits where it does, and `changeKind` separates
 * the two causes that a bare count would blend:
 *
 *   "work"       — the status moved because something was built or proved.
 *   "vocabulary" — the status moved ONLY because the words changed.
 *   "none"       — the status did not move.
 *
 * 🔴 AS OF 12 SEPTEMBER 2026 EVERY MOVED ROW IS "vocabulary". NOT ONE IS
 * "work". This PR classifies; it does not build and it does not verify.
 *
 * ── AND THE DEFERRAL LAW IS ENFORCED, NOT TRUSTED ───────────────────────────
 *
 * A row may be DEFERRED only where `PASS_BOUNDARIES_SOURCE.md` classes it `D`,
 * or where it classes it `S` and the deferred half is the part in question.
 * `assertLawful()` below refuses any other deferral, because "surely this one
 * is out of scope too" is how a deferral gets invented.
 */

import { loadBoundaries } from "./boundaries.mjs";

export const STATES = Object.freeze([
  "NOT-STARTED",
  "BUILT-NOT-PROVED",
  "TESTABLE-NOW",
  "VERIFIED-PASS",
  "BLOCKED-UNKNOWN",
  "DEFERRED",
]);

export const CHANGE_KINDS = Object.freeze(["work", "vocabulary", "none"]);

/**
 * 🔴 TESTABLE-NOW IS NOT A PASS, AND THIS IS WHERE THAT IS ENFORCED.
 *
 * Between TESTABLE-NOW and VERIFIED-PASS there is exactly one thing: the test,
 * run, with its evidence. So a TESTABLE-NOW row must name the single test that
 * would settle it. A row that cannot name its test is not testable now — it is
 * BUILT-NOT-PROVED wearing a more optimistic label.
 */

/**
 * 🔴 THE BEFORE-STATE IS RECORDED HERE, NOT RE-READ FROM THE TRACKER.
 *
 * The first version of this module computed "what it was" by parsing
 * `CHECKLIST_STATUS.md` — the very file the reclassification then overwrote.
 * So the moment the six-state words were written in, `before` and `after`
 * became the same thing, the change lists collapsed to zero, and **the evidence
 * that 37 rows had moved simply evaporated.** The measurement destroyed its own
 * baseline, and it would have looked like a clean run.
 *
 * This is the four-state tracker as committed at the end of PR #45 — 24 BUILT /
 * 33 NOT-STARTED / 1 BLOCKED — mapped onto the six-state words. It is data, it
 * is frozen, and a future reclassification adds a new snapshot beside it rather
 * than recomputing this one.
 */
export const BEFORE_2026_09_12 = Object.freeze({
  1: "BUILT-NOT-PROVED", 2: "NOT-STARTED", 3: "NOT-STARTED", 4: "NOT-STARTED", 5: "NOT-STARTED",
  6: "NOT-STARTED", 7: "NOT-STARTED", 8: "NOT-STARTED", 9: "BUILT-NOT-PROVED", 10: "BUILT-NOT-PROVED",
  11: "BUILT-NOT-PROVED", 12: "BUILT-NOT-PROVED", 13: "BUILT-NOT-PROVED", 14: "BUILT-NOT-PROVED",
  15: "BUILT-NOT-PROVED", 16: "BUILT-NOT-PROVED", 17: "BUILT-NOT-PROVED", 18: "NOT-STARTED",
  19: "NOT-STARTED", 20: "NOT-STARTED", 21: "NOT-STARTED", 22: "NOT-STARTED", 23: "NOT-STARTED",
  24: "NOT-STARTED", 25: "BUILT-NOT-PROVED", 26: "BUILT-NOT-PROVED", 27: "NOT-STARTED",
  28: "NOT-STARTED", 29: "NOT-STARTED", 30: "NOT-STARTED", 31: "NOT-STARTED", 32: "NOT-STARTED",
  33: "NOT-STARTED", 34: "NOT-STARTED", 35: "NOT-STARTED", 36: "BUILT-NOT-PROVED", 37: "NOT-STARTED",
  38: "BUILT-NOT-PROVED", 39: "NOT-STARTED", 40: "NOT-STARTED", 41: "NOT-STARTED", 42: "NOT-STARTED",
  43: "NOT-STARTED", 44: "NOT-STARTED", 45: "BUILT-NOT-PROVED", 46: "BUILT-NOT-PROVED",
  47: "NOT-STARTED", 48: "BUILT-NOT-PROVED", 49: "BUILT-NOT-PROVED", 50: "BUILT-NOT-PROVED",
  51: "BUILT-NOT-PROVED", 52: "BLOCKED-UNKNOWN", 53: "BUILT-NOT-PROVED", 54: "BUILT-NOT-PROVED",
  55: "BUILT-NOT-PROVED", 56: "BUILT-NOT-PROVED", 57: "NOT-STARTED", 58: "NOT-STARTED",
});

const D = (id, why) => ({ id, state: "DEFERRED", why });

/**
 * Every row's verdict.
 *
 * The 28 class-`D` rows are generated rather than typed out, because typing 28
 * near-identical justifications invites one of them to drift into a claim.
 */
const DEFERRED_IDS = [2, 3, 4, 5, 6, 7, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 39, 40, 41, 43, 44];

const EXPLICIT = {
  1: {
    state: "BLOCKED-UNKNOWN",
    why: "the boundary needs adversarial tests over NON-EMPTY populations of all four private classes. Evidence and facts are populated; COST and LEARNING records do not exist, and learning is itself deferred (items 39–41 are class D). 🔴 The ruling flags this explicitly only on item 54, but item 1 carries the identical four-class requirement — recorded as my judgement, not as the document's words",
  },
  8: {
    state: "TESTABLE-NOW",
    test: "run the four supply checks over the REAL 394-page corpus and assert no finding carries a RECOMMENDATION_FIELD or the word 'opportunity'",
    why: "🔴 THE RULING PUTS THIS IN SCOPE AND THE TRACKER HAD IT OUT. Class P, but CHECKLIST_STATUS.md carried it as scope OUT / NOT STARTED — the only class-vs-scope disagreement in all 58, and precedence says the ruling wins. The guard the EVIDENCE clause names EXISTS (test/content-checks.test.mjs) but runs on inline fixtures, not the real corpus",
  },
  9: {
    state: "BUILT-NOT-PROVED",
    why: "of the seven named dimensions, downstream OUTCOMES has no tool behind it — the ruling's own NOTE makes that ⚠ rather than a failure. But COUNTRIES is suppliable by the Search Console API and simply has not been ingested (2 mentions in the whole evidence store), so work we can do remains. Lower of the two readings taken",
  },
  10: {
    state: "BUILT-NOT-PROVED",
    why: "the v0.1 half's detectors all exist and ran on real data. The boundary requires them 'independently detected and RE-TESTED IN THE CASE STUDY', and the Case Study is item 52 — unrun, and gated behind the rendering trigger. Cannot advance until 52 does",
  },
  11: {
    state: "BLOCKED-UNKNOWN",
    why: "the ruling's own BLOCKER TODAY: one crawl run only, by the terms of D-CRW-4. 'Maintain' needs a second run and a second run needs the owner's green — an owner gate, not unbuilt work",
  },
  12: { state: "BUILT-NOT-PROVED", why: "the v0.1 half observes, classifies and produced real findings. 🔴 But §4 rules this row as a two-half table and never states its four parts, so there is no stated boundary to test it against" },
  13: { state: "BUILT-NOT-PROVED", why: "detection ran on real data (16 cannibalization findings). 🔴 Same gap as item 12: §4 gives halves, not the four parts" },
  14: {
    state: "TESTABLE-NOW",
    test: "a census proving NO generator and NO publish path exists in the repository — the ruling's own words, 'prove the absence, do not simulate the danger'",
    why: "uniquely among the splits, the v0.1 half is provable by census today and needs nothing built first. 🔴 Its four parts are still not stated in §4",
  },
  15: {
    state: "TESTABLE-NOW",
    test: "the whole loop over the 32 REAL verified facts: stored once, reused inside scope and window, refused outside either, expires on schedule",
    why: "🔴 THE INPUT ARRIVED ON 12 SEPTEMBER. 32 facts now carry a source, tier, scope, verification date and freshness window — the boundary's INPUT exactly. The refuse-outside-scope and expiry legs are still fixture-only, and the boundary says any fixture-only leg is a FAILURE",
  },
  16: {
    state: "BUILT-NOT-PROVED",
    why: "🔴 THE EVIDENCE CLAUSE DEMANDS 'THE DETECTOR FIRING ON REAL DATA', AND IT CANNOT. Six real conflicts exist and detectConflicts returns 0 on all six (D-FACT-1): it compares records we hold, and every real conflict is registry-versus-a-second-official-page. No real fact is past its recheck date either — the earliest falls due 2026-12-11",
  },
  17: { state: "BUILT-NOT-PROVED", why: "the ruling's own BLOCKER TODAY: zero derived facts exist, all 46 records are primary. Nothing to recompute" },
  25: { state: "BUILT-NOT-PROVED", why: "Gate A measures overlap, facts and shell. The v0.1 half also names SOURCE INTEGRITY, and the EVIDENCE wants all four over the real corpus each with a clean control" },
  26: { state: "BUILT-NOT-PROVED", why: "the graph, orphan counts and the UNKNOWN path all exist and ran. But the EVIDENCE wants the graph in DURABLE storage and the committed PageRecords still carry empty edge lists — the graph lives in an artifact that expires 2026-12-11" },
  36: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE wants a test that RUNS each guard per category — destructive, paid, production, large-scale, cross-product. Exactly one runs today (the D-CRW-4 live-run refusal). The rest are asserted in prose, which the FAILURE clause names as a failure in itself" },
  38: { state: "BUILT-NOT-PROVED", why: "indexability of existing pages was inspected on real data (134 noindexed pages traced to one commit). 🔴 Same gap as items 12 and 13: §4 gives halves, not the four parts" },
  42: { state: "BLOCKED-UNKNOWN", why: "the ruling's own BLOCKER TODAY: requires a second authorised crawl run. Owner gate" },
  45: { state: "BUILT-NOT-PROVED", why: "the ruling's own BLOCKER TODAY: the cap holds, the money does not. No ledger and no spend figure. Unbuilt rather than blocked — nothing external prevents building it" },
  46: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE demands hit/miss counts over a LIVE RESEARCHER, not a pre-loaded registry, and nothing researches. The cache did improve on 12 September — it now refuses UNKNOWN facts, and the hit rate fell 100% → 69.6% — but a pre-loaded shelf is still what is being measured" },
  47: { state: "NOT-STARTED", why: "the ruling's NOTE is explicit: no paid provider exists, and ABSENCE IS NOT A CONTROL. The controls — authorization, budget/cap, kill switch — must exist before a provider does, and none is built" },
  48: {
    state: "TESTABLE-NOW",
    test: "run an authorized job twice and assert identical logical-record counts, plus the existing test that fails if the retry rule changes",
    why: "both halves are in place: idempotency was exercised on real data this week (a re-run appended re-sightings and zero duplicate payloads) and the never-retry-a-4xx rule has a test. What is missing is one run recorded AS THIS ROW'S EVIDENCE, with before/after IDs and counts",
  },
  49: { state: "BUILT-NOT-PROVED", why: "🔴 THE FAILURE CONDITION IS CURRENTLY MET. The boundary requires the lifecycle to run to CLOSED or SUPERSEDED, and all 109 issues on disk are OPEN — not one record has ever completed its lifecycle" },
  50: { state: "BUILT-NOT-PROVED", why: "all four labels are live and 14 real records now carry UNKNOWN. But the boundary's guard is the UNKNOWN→PASS transition (F23), and 0 of 46 records carry life.supersedes, so that guard still polices an empty population — which the FAILURE clause names explicitly" },
  51: { state: "BUILT-NOT-PROVED", why: "the ruling's own BLOCKER TODAY: of the six the owner must be able to inspect, PRIORITY, CONFIDENCE and COST do not exist at all" },
  52: {
    state: "BLOCKED-UNKNOWN",
    why: "🔴 NOT RUN = NOT TESTED, and the rendering trigger is unmet. Two of the six RED classes cannot be detected without a renderer, so running the exam today would produce a FAIL that measures our sequencing rather than the engine — and the seal breaks only once",
  },
  53: { state: "BUILT-NOT-PROVED", why: "the boundary law and fixture tenants hold, but the INPUT is an UNSEEN product — a second real product or a neutral declared test product — and none has been declared and run" },
  54: { state: "BLOCKED-UNKNOWN", why: "the ruling's own BLOCKER TODAY: no cost record and no learning record exists, so two of the four classes cannot be tested. Learning is itself deferred, so this cannot be closed inside frozen v0.1" },
  55: { state: "BUILT-NOT-PROVED", why: "the no-leak property holds in practice — the Search Console key was never printed, hashed or length-measured — but the FAILURE clause forbids proving it BY MANUAL GREP, and no executing test hunts for a leak. Recovery has not been exercised either" },
  56: { state: "BLOCKED-UNKNOWN", why: "the walk must be recorded at both widths and the browser tooling failed on every attempt, including a trivial probe page. 🔴 That is a fact about our tooling, not about the interface (LAW-ABSENT-1) — so it is UNKNOWN, not a failure" },
  57: { state: "NOT-STARTED", why: "runs last, and requires an auditor who is not the builder" },
  58: { state: "NOT-STARTED", why: "🔴 only the owner declares DONE. Requires the full ledger, the audit, and his own signature" },
};

/** The 58 verdicts, with the recorded before-state folded in. */
export function classify(previousStates = BEFORE_2026_09_12) {
  const boundaries = loadBoundaries();
  const out = {};
  for (let id = 1; id <= 58; id += 1) {
    const b = boundaries[id];
    const row = DEFERRED_IDS.includes(id)
      ? D(id, `class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either`)
      : { id, ...EXPLICIT[id] };
    if (!row?.state) throw new Error(`item ${id} has no classification`);

    const was = previousStates?.[id] ?? null;
    out[id] = {
      ...row,
      name: b.name,
      class: b.class,
      via: b.via,
      missingParts: b.missingParts,
      was,
      /* 🔴 See the header. As of today every moved row is "vocabulary". */
      changeKind: was === null ? "none" : was === row.state ? "none" : "vocabulary",
    };
  }
  return out;
}

/**
 * 🔴 THE CONTRACT, ENFORCED BY THE REPOSITORY RATHER THAN BY MEMORY.
 *
 * Two laws, and both must be executable or they are decoration:
 *   1. no VERIFIED-PASS while any of the four parts is empty;
 *   2. no DEFERRED that the frozen document does not authorise.
 */
export function assertLawful(rows, boundaries = loadBoundaries()) {
  const errors = [];
  for (const r of Object.values(rows)) {
    if (!STATES.includes(r.state)) errors.push(`item ${r.id}: unknown state ${JSON.stringify(r.state)}`);
    if (!CHANGE_KINDS.includes(r.changeKind)) errors.push(`item ${r.id}: unknown changeKind ${JSON.stringify(r.changeKind)}`);

    if (r.state === "VERIFIED-PASS") {
      const b = boundaries[r.id];
      if (b.missingParts.length) {
        errors.push(
          `item ${r.id} (${b.name}) is VERIFIED-PASS but its boundary has no ${b.missingParts.join(", ")}. ` +
            "All four of INPUT, EXPECTED, FAILURE and EVIDENCE must be answered with real evidence — " +
            '"it is built" and "it looks right" are not verdicts.',
        );
      }
    }

    if (r.state === "DEFERRED" && !["D", "S"].includes(boundaries[r.id].class)) {
      errors.push(
        `item ${r.id} (${boundaries[r.id].name}) is DEFERRED but the frozen ruling classes it ` +
          `${boundaries[r.id].class}. A row is DEFERRED only where PASS_BOUNDARIES_SOURCE.md says so — ` +
          "believing one should be deferred is a question for the owner, not a reclassification.",
      );
    }

    if (r.state === "TESTABLE-NOW" && !r.test) {
      errors.push(
        `item ${r.id} (${boundaries[r.id].name}) is TESTABLE-NOW but names no test. Between TESTABLE-NOW ` +
          "and VERIFIED-PASS there is exactly one thing: the test, run. A row that cannot name it is " +
          "BUILT-NOT-PROVED wearing a more optimistic label.",
      );
    }
  }
  return errors;
}

export function tally(rows) {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const r of Object.values(rows)) counts[r.state] += 1;
  return counts;
}
