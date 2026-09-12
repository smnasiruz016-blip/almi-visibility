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
 * On the 12 September re-classification EVERY moved row was "vocabulary" and
 * not one was "work": that PR classified, it did not build.
 *
 * 🔴 THE AMENDMENT-1 PR IS THE FIRST TO CLAIM "work" — items 8, 15 and 48, each
 * with real-data evidence for all four parts of its boundary and each RED-proved
 * by sabotage. The claim is DECLARED per row and never inferred from the move,
 * so a row cannot drift into the "work" column merely by changing state.
 *
 * ── AND THE DEFERRAL LAW IS ENFORCED, NOT TRUSTED ───────────────────────────
 *
 * A row may be DEFERRED only where `PASS_BOUNDARIES_SOURCE.md` classes it `D`,
 * or where it classes it `S` and the deferred half is the part in question.
 * `assertLawful()` below refuses any other deferral, because "surely this one
 * is out of scope too" is how a deferral gets invented.
 */

import { loadBoundaries } from "./boundaries.mjs";

/**
 * 🔴 SEVEN STATES SINCE AMENDMENT 2 (12 September 2026, night).
 *
 * FAILED — the row's test was RUN against its own frozen boundary and the
 * boundary's FAILURE condition was MET. Before it existed, item 14 had been
 * proved to fail and could only be filed as BUILT-NOT-PROVED, which hid a known
 * defeat among rows nobody had looked at.
 */
export const STATES = Object.freeze([
  "NOT-STARTED",
  "BUILT-NOT-PROVED",
  "TESTABLE-NOW",
  "VERIFIED-PASS",
  "FAILED",
  "BLOCKED-UNKNOWN",
  "DEFERRED",
]);

/**
 * 🔴 RULE 4 — A FAILED ROW IS WORTH MORE THAN A BUILT-NOT-PROVED ONE. It means
 * we looked. These are the two states that can only be reached by running a
 * row's test against its boundary; every report reads them as knowledge.
 */
export const LOOKED = Object.freeze(["VERIFIED-PASS", "FAILED"]);
export const hasBeenLookedAt = (state) => LOOKED.includes(state);

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
 * 🔴 THE LEDGER AS MERGED IN PR #48, BEFORE AMENDMENT 2. Frozen data, for the
 * same reason as the snapshot above: the transitions this PR makes are measured
 * against it, and it must not be re-read from a file the PR then overwrites.
 * 3 NOT-STARTED · 18 BUILT-NOT-PROVED · 0 TESTABLE-NOW · 3 VERIFIED-PASS ·
 * 6 BLOCKED-UNKNOWN · 28 DEFERRED — no FAILED, because the word did not exist.
 */
export const BEFORE_AMENDMENT_2 = Object.freeze((() => {
  const out = {};
  for (let id = 1; id <= 58; id += 1) out[id] = "BUILT-NOT-PROVED";
  const set = (state, ids) => ids.forEach((id) => { out[id] = state; });
  set("DEFERRED", [2, 3, 4, 5, 6, 7, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 39, 40, 41, 43, 44]);
  set("VERIFIED-PASS", [8, 15, 48]);
  set("BLOCKED-UNKNOWN", [1, 11, 42, 52, 54, 56]);
  set("NOT-STARTED", [47, 57, 58]);
  return out;
})());

/**
 * 🔴 EVERY MOVE THIS PR MAKES, DECLARED — AND OF WHICH KIND.
 *
 *   kind "ruling" — the row moved ONLY because the owner changed its boundary.
 *   kind "work"   — the row moved because its test was run.
 *
 * A row whose state differs from BEFORE_AMENDMENT_2 without a declared chain
 * here fails the build. A move is never inferred.
 */
export const MOVES_AMENDMENT_2 = Object.freeze({
  /* Added by the follow-up PR stacked on #49, 12 September 2026 night: the
   * country pulls ran against the real property. A WORK move — the test of all
   * seven dimensions was run — and no boundary changed. */
  9: Object.freeze([
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "BLOCKED-UNKNOWN",
      kind: "work",
      route: "TEST_RUN",
      test: "node bin/gsc-ingest.mjs --property=sc-domain:almiworld.com · node bin/gsc-dimensions.mjs · test/search-dimensions.test.mjs",
      date: "2026-09-12",
      reason: "six of seven dimensions ingested from the real property, each pull exhausted and COMPLETE with its bounds; downstream outcomes is supplied by no tool this engine holds, which the NOTE makes ⚠ rather than a failure",
    }),
  ]),
  14: Object.freeze([
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "TESTABLE-NOW",
      kind: "ruling",
      route: "OWNER_RULING",
      ruling: "PASS_BOUNDARIES_AMENDMENT_2.md §A2.2 and §A2.4",
      date: "2026-09-12",
      reason: "the owner narrowed the boundary to product-repository writes and publishing, and added the register of permitted writers; its earlier result no longer applies, so the exam must be sat again. Not a tick and not a pass",
    }),
    Object.freeze({
      from: "TESTABLE-NOW",
      to: "FAILED",
      kind: "work",
      route: "TEST_RUN",
      test: "test/permitted-writers.test.mjs",
      date: "2026-09-12",
      reason: "the re-test was run against the new contract, and its FAILURE condition 'defaults to writing' was met at two write sites",
    }),
  ]),
});

/** How a row may leave FAILED. Exactly two. Amendment 2, rule 1. */
export const LEAVE_FAILED_ROUTES = Object.freeze(["RETEST_PASSED", "OWNER_RULING"]);

/**
 * 🔴 RULES 1 AND 2, ENFORCED.
 *
 * Walks every row from its recorded before-state through its declared moves to
 * its current state, and refuses:
 *   - a state change with no declared move;
 *   - a chain that does not join up (a step's `from` is not the previous `to`);
 *   - ANY step out of FAILED into BUILT-NOT-PROVED, whatever its route (rule 2);
 *   - any other step out of FAILED that is neither a re-run that passed (to
 *     VERIFIED-PASS, naming its test) nor an owner ruling with its date and
 *     reason (rule 1);
 *   - a "ruling" move that is not an owner ruling, or a "work" move that is.
 */
export function assertTransitions(rows, before = BEFORE_AMENDMENT_2, moves = MOVES_AMENDMENT_2) {
  const errors = [];
  for (const r of Object.values(rows)) {
    const chain = moves[r.id] ?? [];
    let at = before[r.id];
    for (const step of chain) {
      if (step.from !== at) {
        errors.push(`item ${r.id}: a declared move starts at ${step.from} but the row was at ${at} — the chain does not join up`);
      }
      if (!["ruling", "work"].includes(step.kind)) errors.push(`item ${r.id}: move kind ${JSON.stringify(step.kind)} is neither "ruling" nor "work"`);
      if ((step.kind === "ruling") !== (step.route === "OWNER_RULING")) {
        errors.push(`item ${r.id}: a "${step.kind}" move by route ${step.route} — only an owner ruling is a ruling move, and an owner ruling is never work`);
      }
      if (step.route === "OWNER_RULING" && !(step.ruling && step.date && step.reason)) {
        errors.push(`item ${r.id}: an owner-ruling move must record the ruling, its date AND its reason`);
      }
      errors.push(...leavingFailed(r.id, step.from, step.to, step));
      at = step.to;
    }
    if (at !== r.state) {
      errors.push(...leavingFailed(r.id, at, r.state, null));
      errors.push(
        `item ${r.id}: is ${r.state} but its recorded state is ${at} and no move was declared. ` +
          "A state never changes silently — declare the move, its kind, and what caused it.",
      );
    }
  }
  return errors;
}

function leavingFailed(id, from, to, step) {
  if (from !== "FAILED" || to === "FAILED") return [];
  if (to === "BUILT-NOT-PROVED") {
    return [
      `item ${id}: FAILED may NEVER be returned to BUILT-NOT-PROVED (Amendment 2, rule 2). ` +
        "That would hide a known defeat inside a crowd of unproven rows.",
    ];
  }
  const retest = step?.route === "RETEST_PASSED" && to === "VERIFIED-PASS" && Boolean(step.test) && Boolean(step.date);
  const ruling = step?.route === "OWNER_RULING" && Boolean(step.ruling && step.date && step.reason);
  if (retest || ruling) return [];
  return [
    `item ${id}: leaves FAILED for ${to} by ${step ? `route ${step.route}` : "no declared route"}. A row leaves FAILED by ` +
      "EXACTLY TWO routes — its test re-run and passing (to VERIFIED-PASS, naming the test and date), or an owner " +
      "ruling changing its boundary, recorded with date and reason (Amendment 2, rule 1).",
  ];
}

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
    state: "VERIFIED-PASS",
    changeKind: "work",
    why: "all four parts answered on real data. **INPUT** the real 495-page corpus of 12 September, 389 with a stored body. **EXPECTED** the labels are a supply census and nothing else: HEAVY 269 · THIN 118 · EMPTY 0 · UNKNOWN 108 (106 no stored body, 2 empty in raw HTML), and the run states in its own output that these say nothing about demand. **FAILURE** not met — 0 of 550 real findings carries a recommendation field or any demand word. **EVIDENCE** `test/supply-labels.test.mjs` fails the build if a supply label emits one, RED-proved twice (an injected 'opportunity' and an injected `recommendation` field), each landing in the intended test",
  },
  9: {
    state: "BLOCKED-UNKNOWN",
    changeKind: "work",
    why: "🔴 **SIX OF SEVEN DIMENSIONS ARE INGESTED FROM THE REAL PROPERTY; THE SEVENTH IS BLOCKED; IT DOES NOT TICK.** On 12 September 2026 (night) the owner supplied the read-only key and the country pulls ran: **country** 126 rows and **country×query** 388 rows, each ONE request, exhausted, dataState COMPLETE, bounds rowLimitPerRequest=25000 / maxRequests=20, cost ZERO_BY_TARIFF. Queries (337), pages (1,525), impressions, clicks and CTR re-ingested in the same run, all COMPLETE. **DOWNSTREAM OUTCOMES** is not measurable by any tool this engine holds: Search Console has no outcome dimension; the credential is webmasters.readonly; 0 of 36 product repositories use an analytics package; the one first-party funnel-event table stores a path and a user id and no search source; and this engine may read no product database. The ruling's NOTE makes a dimension no tool can supply ⚠ — so the honest state is **BLOCKED-UNKNOWN, not FAILED** (every suppliable dimension was ingested and none claims a completeness it cannot show) and **not VERIFIED-PASS** (six of seven is not seven). The country distribution is recorded as measurement only and passes item 8's guard",
    whyBefore: "🔴 **FIVE OF SEVEN DIMENSIONS ARE INGESTED; IT DOES NOT TICK.** Queries, pages, impressions, clicks and CTR are in the evidence store, each pull exhausted with dataState COMPLETE and its bounds recorded. **COUNTRIES** — the country and country×query pulls are now BUILT and tested against a fake provider (same pagination law, bounds and cost record), but have **NOT RUN against the real property**: the read-only Search Console key was not available to the session that built them, and a pull that has not run is not ingested. **DOWNSTREAM OUTCOMES** is BLOCKED, not failed, with evidence: the Search Console API has no outcome dimension; this engine's only credential is webmasters.readonly; 0 of 36 product repositories use a third-party analytics package; the one first-party funnel-event table in the estate stores a path and a user id and no search source, and this engine holds no authorization to read any product database. Whether the row can then tick turns on the NOTE — see `src/search/dimensions.mjs`. Not FAILED: the test of all seven has not been run, and NOT RUN = NOT TESTED",
  },
  10: {
    state: "BUILT-NOT-PROVED",
    why: "the v0.1 half's detectors all exist and ran on real data. The boundary requires them 'independently detected and RE-TESTED IN THE CASE STUDY', and the Case Study is item 52 — unrun, and gated behind the rendering trigger. Cannot advance until 52 does",
  },
  11: {
    state: "BLOCKED-UNKNOWN",
    why: "the ruling's own BLOCKER TODAY: one crawl run only, by the terms of D-CRW-4. 'Maintain' needs a second run and a second run needs the owner's green — an owner gate, not unbuilt work",
  },
  12: { state: "BUILT-NOT-PROVED", why: "the v0.1 half observes, classifies and produced real findings. Amendment 1 now supplies its four-part contract, so it CAN be tested — but the EVIDENCE clause wants the four classifications over the real corpus with shell subtraction printed, plus the item-8 guard, and that run has not been made for this row. Not touched in this PR" },
  13: { state: "BUILT-NOT-PROVED", why: "detection ran on real data (16 cannibalization findings). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants a firing fixture, a clean control and the number of queries searched stated. Not touched in this PR" },
  14: {
    state: "FAILED",
    changeKind: "work",
    test: "node --test test/permitted-writers.test.mjs · node tools/permitted-writers.mjs",
    failureMet: "DEFAULTS TO WRITING — two of the eight page-write sites write with no flag at all: the owner report writer, on every run, and one chain runner's cache of the sibling pages it fetches",
    why: "🔴 **SAT AGAIN AGAINST AMENDMENT 2, AND FAILED.** The owner's ruling returned it to TESTABLE-NOW (a RULING move); the re-test then ran (a WORK move). **(a)** 0 writes into a product repository — PASS. **(b)** 0 publish paths — PASS. **(c)** 0 bulk generation — PASS. **(d)** NOT MET: the widened census finds **8 write sites in 7 files** (the census merged in #47 found 6 and was blind to two writes whose `.html` target is named one line up); all 7 are now named in the register and reconcile exactly; but **2 sites DEFAULT TO WRITING** — the owner report writer has no gate at all, and a chain runner writes its cache of fetched sibling pages with no flag. Also not met, and recorded rather than decided: **7 of 7 writers take their destination from an operator flag and nothing contains it to this repository**; the literal-path detector finds 0 outside writes, which is all a source scan can see. **(e)** a rediscovered URL resolves to its existing page_id — PASS on the real 495-page run, sabotage-proved. One reason is UNKNOWN in the register and says so. Closing (d) is a code change to two writers and a re-run — the route out of FAILED that rule 1 names",
    whyBefore: "🔴 **ITS FAILURE CONDITION IS CURRENTLY MET, WHICH IS STRONGER THAN 'NOT PROVED'.** Amendment 1 requires a census proving no generator, no page-writing path and no product-repository write path exists. **Six page-writing paths exist** — four of them render a candidate page from the registry, via one renderer driven by four runners, built deliberately for earlier gate work. The other two write an audit report and stored corpus bodies. Every one is a LOCAL write behind write-law.mjs and --confirm, and **0 write into a product repository**, so the danger this item names is absent — but the boundary as written is not met, and closing the gap between those two is the owner's ruling to make, not mine. The other halves DO hold: 0 product-repo writes, 0 bulk generate-all paths, and ID stability proved on the real 495-page run (one record per page_id, every id derivable from its own URL). 🔴 The six paths are named in the census output, not here: the engine may not know which product it serves",
  },
  15: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    why: "the whole loop demonstrated end to end on the 32 REAL verified facts, **no leg fixture-only**. **(i) stored once** — one fact requested three times reaches the source 0 times, and a miss is memoised so it is researched once, not repeatedly. **(ii) reused within scope and window** — all 32 hit today, each returning its own record. **(iii) refused outside scope**, proved on a REAL PAIR: two regulators in different jurisdictions publish a minimum grade for the same qualification, and holding only one of them, a question about the other MISSES and hands back nothing. The two values genuinely differ, so a candidate given the wrong one would prepare to the wrong threshold. The same refusal holds across scopes within a jurisdiction. **(iv) expires on schedule** — each of the 32 goes STALE the day after its own recorded recheck date (earliest 2026-12-11, latest 2027-03-11), for that reason and not down the old extractedOn path; 0 of 32 are served once every date has passed. Four sabotages, each landing in the intended test. 🔴 The real pair is NAMED IN THE TEST, not here: the engine may not know which product it serves",
  },
  16: {
    state: "BUILT-NOT-PROVED",
    why: "🔴 THE EVIDENCE CLAUSE DEMANDS 'THE DETECTOR FIRING ON REAL DATA', AND IT CANNOT. Six real conflicts exist and detectConflicts returns 0 on all six (D-FACT-1): it compares records we hold, and every real conflict is registry-versus-a-second-official-page. No real fact is past its recheck date either — the earliest falls due 2026-12-11",
  },
  17: { state: "BUILT-NOT-PROVED", why: "the ruling's own BLOCKER TODAY: zero derived facts exist, all 46 records are primary. Nothing to recompute" },
  25: { state: "BUILT-NOT-PROVED", why: "Gate A measures overlap, facts and shell. The v0.1 half also names SOURCE INTEGRITY, and the EVIDENCE wants all four over the real corpus each with a clean control" },
  26: { state: "BUILT-NOT-PROVED", why: "the graph, orphan counts and the UNKNOWN path all exist and ran. But the EVIDENCE wants the graph in DURABLE storage and the committed PageRecords still carry empty edge lists — the graph lives in an artifact that expires 2026-12-11" },
  36: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE wants a test that RUNS each guard per category — destructive, paid, production, large-scale, cross-product. Exactly one runs today (the D-CRW-4 live-run refusal). The rest are asserted in prose, which the FAILURE clause names as a failure in itself" },
  38: { state: "BUILT-NOT-PROVED", why: "indexability of existing pages was inspected on real data (134 noindexed pages traced to one commit). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants the state over the real corpus plus a test failing the build on any indexing promise. Not touched in this PR" },
  42: { state: "BLOCKED-UNKNOWN", why: "the ruling's own BLOCKER TODAY: requires a second authorised crawl run. Owner gate" },
  45: { state: "BUILT-NOT-PROVED", why: "the ruling's own BLOCKER TODAY: the cap holds, the money does not. No ledger and no spend figure. Unbuilt rather than blocked — nothing external prevents building it" },
  46: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE demands hit/miss counts over a LIVE RESEARCHER, not a pre-loaded registry, and nothing researches. The cache did improve on 12 September — it now refuses UNKNOWN facts, and the hit rate fell 100% → 69.6% — but a pre-loaded shelf is still what is being measured" },
  47: { state: "NOT-STARTED", why: "the ruling's NOTE is explicit: no paid provider exists, and ABSENCE IS NOT A CONTROL. The controls — authorization, budget/cap, kill switch — must exist before a provider does, and none is built" },
  48: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    why: "**INPUT** the same authorized job run twice, and a retry against a 4xx. **EXPECTED** the re-run appends no duplicate payload and mints no new id for the same measurement — before 1 / after 1, with the re-sighting recorded rather than dropped; and requests are counted at the boundary: 7 different 4xx statuses each issue exactly ONE request, a network error gets exactly ONE retry (2 attempts, never 3), and a 5xx is not retried at all. **FAILURE** not met, on real data: the 12 September crawl holds 500 observations with 500 distinct measurement keys and 500 distinct ids. **COST** — requests are the only metered thing this system issues (no paid provider exists, item 47), and a re-run over held input issues zero. 🔴 **The retry rule had NO test until now**; the code was right since PR #36 and nothing would have caught it changing. Three sabotages — retry a 4xx, retry twice, stop deduplicating — each landed in the intended test",
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
      /**
       * 🔴 "work" IS DECLARED BY THE ROW, NEVER INFERRED FROM THE MOVE.
       *
       * Until 12 September every moved row was "vocabulary", and the default
       * below still is — because a status that changed when the words changed
       * must not be able to drift into the "work" column just by moving. A row
       * claims `changeKind: "work"` only where evidence was actually produced
       * for it, and the PR that claims it has to show that evidence.
       */
      changeKind: was === null || was === row.state ? "none" : (row.changeKind ?? "vocabulary"),
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

    /* 🔴 FAILED IS A RESULT, SO IT MUST SAY WHAT RAN AND WHAT WAS MET. A FAILED
     * with no test is an opinion, and an opinion filed as a defeat is as
     * dishonest as one filed as a pass. */
    if (r.state === "FAILED" && !(r.test && r.failureMet)) {
      errors.push(
        `item ${r.id} (${boundaries[r.id].name}) is FAILED but does not name ${r.test ? "the FAILURE condition that was met" : "the test that was run"}. ` +
          "FAILED means the row's test was RUN against its own frozen boundary and the FAILURE condition was MET.",
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
