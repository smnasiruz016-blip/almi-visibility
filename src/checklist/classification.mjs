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
  /* Items 45 and 49 — the cost ledger and the audit-trail lifecycle, both run
   * against their boundaries on real data, 12 September 2026 (night). */
  45: Object.freeze([
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "FAILED",
      kind: "work",
      route: "TEST_RUN",
      test: "test/cost-ledger.test.mjs · test/cost-governor.test.mjs · node bin/cost-ledger.mjs",
      date: "2026-09-12",
      reason: "the ledger was built and backfilled from real records and the hard stop proved by injection; the FAILURE condition 'a cost reads UNKNOWN when it was measurable' is met by 12 parts of the eight stored ingest runs",
    }),
    /* 🔴 LEFT FAILED BY RULE 1's SECOND ROUTE — AN OWNER RULING — and then SAT
     * AGAIN. The ruling drew the scope (runs from the ledger's existence
     * onward); it did not pass the row. The pass is the next, separate move. */
    Object.freeze({
      from: "FAILED",
      to: "TESTABLE-NOW",
      kind: "ruling",
      route: "OWNER_RULING",
      ruling: "TECHNICAL-OWNER RULING — ITEM 45's SCOPE BEGINS WHEN THE LEDGER EXISTED (PHASE_0_FROZEN_GAP_REGISTER.md)",
      date: "2026-09-12",
      reason: "'A component cannot be failed for a period before it existed.' The boundary's INPUT is a run; the scope is runs from 8c9d68b (2026-09-12T23:03:09Z) onward. The bar is unchanged; the eight earlier runs are recorded as a permanent loss (L-COST-1)",
    }),
    Object.freeze({
      from: "TESTABLE-NOW",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "test/item45-scope.test.mjs · node bin/gsc-ingest.mjs (one real run, ledger live)",
      date: "2026-09-12",
      reason: "one real Search Console run inside the scope recorded all four: money 0 ZERO_BY_TARIFF with basis, 9 provider calls, crawl budget 0 with its basis, 2.238 s wall-clock; item45Verdict over the real ledger returns PASS",
    }),
  ]),
  /* Items 11 and 42 — proved by a LOCAL REPLAY of the 12 September crawl's own
   * captured bodies (bin/replay-crawl.mjs), 13 September 2026. WORK moves: the
   * BLOCKER was "a second run needs the owner's green", and the engine property
   * was tested without spending that green (D-CRW-5 is GRANTED AND UNUSED and
   * moves nothing). No boundary changed. */
  11: Object.freeze([
    Object.freeze({
      from: "BLOCKED-UNKNOWN",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node bin/replay-crawl.mjs · test/replay.test.mjs",
      date: "2026-09-13",
      reason: "the same 394 URLs crawled twice through the production crawler and store, 5 named bodies changed between runs: 394/394 page_ids identical, 389 pages before and across both runs, each change a new observation on its existing page; RED when the id takes the clock",
    }),
  ]),
  42: Object.freeze([
    Object.freeze({
      from: "BLOCKED-UNKNOWN",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node bin/replay-crawl.mjs · test/replay.test.mjs",
      date: "2026-09-13",
      reason: "each of 5 changed targets re-tested on its LATEST stored observation, chosen from the store, with a verdict before and after naming the observation read: noindex FAIL→PASS and PASS→FAIL, canonical PASS→FAIL, head-elements PASS→FAIL, and a body-only change PASS→PASS on three checks",
    }),
  ]),
  48: Object.freeze([
    /* 🔴 THE FIRST TICK THIS PROJECT HAS REMOVED — by the checklist's reopen
     * rule, now executable. The tick was earned on the ingest path; the audit
     * writers were never in its population, and one of them duplicated. */
    Object.freeze({
      from: "VERIFIED-PASS",
      to: "FAILED",
      kind: "work",
      route: "REOPENED",
      reopenReason: "CONCRETE_CONTRADICTORY_EVIDENCE",
      evidence: [
        "runs/audit/technical-findings.jsonl — 868 extra copies of issues written by the same job run twice (02:49 and 02:57, 12 Sep 2026)",
        "test/idempotency-retry.test.mjs — its 'same job run twice' test drives a synthetic observation through appendIfNew; no audit writer was ever run twice",
      ],
      date: "2026-09-12",
      reason: "the tick was earned on a narrower population than the boundary names ('the same authorized job'), and outside that population the FAILURE condition 'a record duplicates' is met on real data",
    }),
    /* 🔴 LEFT FAILED BY RULE 1's FIRST ROUTE. The reopen named what was missing:
     * the crawl and the DNS audit had never been run twice. Both now have, and so
     * has every other writer. No boundary changed and no ruling was asked for. */
    Object.freeze({
      from: "FAILED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "RETEST_PASSED",
      test: "node bin/replay-crawl.mjs · test/replay.test.mjs · test/duplicate-writers.test.mjs · test/issue-writer-census.test.mjs · test/idempotency-retry.test.mjs",
      date: "2026-09-13",
      reason: "every authorized job that stores a record has now been run twice into one store with zero duplicates on the second run — crawl (replay: 389 unchanged → 0 new, 389 re-sightings), DNS audit (RECORDED resolver answers: 134 → +0), technical, content, verification and supply-label writers — and the census holds every issue writer to appendIfNew; RED when the key takes the clock",
    }),
  ]),
  /* 🔴 THE QUEUE RE-SCAN, 13 September 2026. Each non-deferred row was asked
   * one question — DOES ITS INPUT NOW EXIST? — against its own boundary. Where
   * it did, the row moved to TESTABLE-NOW by route INPUT_EXISTS, naming the
   * input (a WORK move: work made the input exist; nothing about the boundary
   * changed). Where the test then needed nothing new, it was RUN, and the row
   * moved again by TEST_RUN to wherever the run put it. An input that exists is
   * not a verdict, and no row moved on how close it felt. */
  12: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "the 394 served bodies of 12 September, committed as runs/crawl/bodies-2026-09-12.jsonl.br, with shell subtraction defined in src/audit/shell.mjs",
      reason: "the corpus with shell subtraction defined and printed exists in the repository" }),
    Object.freeze({ from: "TESTABLE-NOW", to: "VERIFIED-PASS", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "node bin/audit-content.mjs over the committed archive · test/queue-rescan.test.mjs · test/content-checks.test.mjs · test/supply-labels.test.mjs",
      reason: "each of the four classifications accounts for all 394 pages (0/118/5/2 FAIL), the shell definition printed beside the result, the shell-heavier-than-body control and the item-8 guard passing" }),
  ]),
  13: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "three query×page pulls with query text in runs/evidence/evidence.jsonl (543, 574, 574 rows, COMPLETE), in which 21 queries draw impressions on more than one URL",
      reason: "query×page data with real overlaps exists; run, it detects all 21 and none falsely, but reports only a count — EXPECTED missed, FAILURE not met, so it stays here" }),
    /* The queue run, 13 September 2026 (later): the report was built and the test sat again. */
    Object.freeze({ from: "TESTABLE-NOW", to: "VERIFIED-PASS", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "node bin/audit-content.mjs · test/content-checks.test.mjs · test/queue-rescan.test.mjs",
      reason: "every overlap reported with its query, competing URLs and positions — 21 of 337 queries searched, printed beside the result, from the newest complete pull; firing fixture and clean control for detector and report; item 8's guard holds" }),
  ]),
  25: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "existing pages with their siblings (the 394 committed bodies) and the claims they make (the 32 verified facts)",
      reason: "the input exists; not run, because its source-integrity leg is a live link check this change may not make" }),
  ]),
  26: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "the crawled corpus (committed bodies) and its edge graph, 19,926 links read from the served HTML",
      reason: "the input exists; run, the two runners' zero-inbound counts over the same bodies disagree (340 vs 341) — EXPECTED missed, FAILURE not met, so it stays here" }),
    /* The queue run, 13 September 2026 (later): the disagreement raised as Issues, both found wrong, one definition, one stored graph. */
    Object.freeze({ from: "TESTABLE-NOW", to: "VERIFIED-PASS", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "node bin/edge-graph.mjs · node bin/audit-content.mjs · node bin/audit-technical.mjs · node bin/instrument-disagreement.mjs --close · test/edge-graph.test.mjs · test/queue-rescan.test.mjs",
      reason: "both runners read one stored graph through one definition and print 335; the 11 disagreement Issues closed on their recorded output; 335 pages with no inbound link, every one UNKNOWN and none 'missing'; the graph in durable storage" }),
  ]),
  38: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "each existing page's status, canonical, meta robots and X-Robots-Tag (committed bodies, recorded headers), robots.txt rule and sitemap membership (stored observations)",
      reason: "every input the preflight names exists in the repository" }),
    Object.freeze({ from: "TESTABLE-NOW", to: "VERIFIED-PASS", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "node bin/audit-technical.mjs over the committed archive · test/queue-rescan.test.mjs · test/technical-checks.test.mjs",
      reason: "a state for all 394 pages — 158 BLOCKED, 210 UNKNOWN, 26 ELIGIBLE — with INDEXABLE ≠ INDEXED printed, and the build failing on any indexing promise" }),
  ]),
  50: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "real records of all four kinds — observations, run summaries, issues and UNKNOWN findings and facts",
      reason: "records of all four kinds exist on the real verdict path" }),
    Object.freeze({ from: "TESTABLE-NOW", to: "FAILED", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "test/queue-rescan.test.mjs (item 50)",
      reason: "FAILURE met: the UNKNOWN→PASS guard (F23) judges only fact supersessions, and 0 of 46 real facts carry one — the guard polices an empty population" }),
  ]),
  51: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "three real recommendations in runs/audit/recommendations.jsonl",
      reason: "a real recommendation exists" }),
    Object.freeze({ from: "TESTABLE-NOW", to: "FAILED", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "test/queue-rescan.test.mjs (item 51)",
      reason: "FAILURE met: priority, confidence and cost are missing on all three, and the real report renders none of the six" }),
  ]),
  55: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "the Search Console key-handling path, and the append-only stores that must be recoverable",
      reason: "the input exists; not run, because the executing leak test it needs does not exist yet" }),
    /* The queue run, 13 September 2026 (later): the executing leak test was built and its first honest run met the FAILURE condition. */
    Object.freeze({ from: "TESTABLE-NOW", to: "FAILED", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "test/secret-leak.test.mjs (first honest run, before any fix)",
      reason: "FAILURE met — any leak: a key file that is not JSON was quoted by the adapter's parse error in-process and printed whole to stderr by the CLI (D-SEC-1)" }),
    /* 🔴 Rule 1's first route: the cause fixed, the test re-run and passed. No boundary changed. */
    Object.freeze({ from: "FAILED", to: "VERIFIED-PASS", kind: "work", route: "RETEST_PASSED", date: "2026-09-13",
      test: "test/secret-leak.test.mjs · test/store-recovery.test.mjs",
      reason: "the parse is caught and rethrown with nothing from the file; the leak test re-run passed on every credential path, RED when the key or its length is logged; recovery proved by restoring torn stores from git, byte-identical by blob hash" }),
  ]),
  49: Object.freeze([
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "test/issue-lifecycle.test.mjs · test/source-tiers.test.mjs",
      date: "2026-09-12",
      reason: "a real chain walked end to end with all five parts present, 134 real issues superseded with the originals retained, and the tier layer ordering the real verified facts",
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
    /* 🔴 THE FIRST USE OF A ROUTE OUT OF FAILED — and it is rule 1's first
     * route: the cause was fixed (both writers gated, every destination
     * confined), and the test was RE-RUN and PASSED. No boundary changed. */
    Object.freeze({
      from: "FAILED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "RETEST_PASSED",
      test: "test/permitted-writers.test.mjs · test/write-confinement.test.mjs · test/no-blind-regeneration.test.mjs · node tools/permitted-writers.mjs",
      date: "2026-09-12",
      reason: "report.mjs and the chain runner's cache now write only with --confirm; every destination is confined to this repository and refused outside it; all five parts re-tested and each RED-proved",
    }),
  ]),
});

/** How a row may leave FAILED. Exactly two. Amendment 2, rule 1. */
export const LEAVE_FAILED_ROUTES = Object.freeze(["RETEST_PASSED", "OWNER_RULING"]);

/**
 * 🔴 AND HOW A ROW MAY LOSE A VERIFIED-PASS — the gap in the seven states.
 *
 * Amendment 2 wrote rules for leaving FAILED and none for losing a tick. The
 * KEY FEATURE CHECKLIST already has the rule; until 12 September 2026 it lived
 * in a document nothing executed. It is quoted here verbatim — a test checks it
 * is a substring of `KEY_FEATURE_CHECKLIST_SOURCE.md` — and enforced below: a
 * VERIFIED-PASS row leaves only by a `REOPENED` move naming ONE of these five
 * reasons, with its evidence, date and reason. Any other move off a tick fails
 * the build. First invoked for item 48.
 */
export const REOPEN_RULE_TEXT =
  "Closed items reopen only for concrete contradictory evidence, a real regression, new authoritative evidence, a security/data-safety risk, or an owner-approved scope change.";
export const REOPEN_REASONS = Object.freeze([
  "CONCRETE_CONTRADICTORY_EVIDENCE",
  "REAL_REGRESSION",
  "NEW_AUTHORITATIVE_EVIDENCE",
  "SECURITY_OR_DATA_SAFETY_RISK",
  "OWNER_APPROVED_SCOPE_CHANGE",
]);

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
      // A reopen for an owner-approved scope change is a ruling; every other reopen is evidence, i.e. work.
      const isRuling = step.route === "OWNER_RULING" || (step.route === "REOPENED" && step.reopenReason === "OWNER_APPROVED_SCOPE_CHANGE");
      if ((step.kind === "ruling") !== isRuling) {
        errors.push(`item ${r.id}: a "${step.kind}" move by route ${step.route} — only an owner ruling is a ruling move, and an owner ruling is never work`);
      }
      errors.push(...losingPass(r.id, step.from, step.to, step));
      if (step.route === "OWNER_RULING" && !(step.ruling && step.date && step.reason)) {
        errors.push(`item ${r.id}: an owner-ruling move must record the ruling, its date AND its reason`);
      }
      errors.push(...leavingFailed(r.id, step.from, step.to, step));
      at = step.to;
    }
    if (at !== r.state) {
      errors.push(...leavingFailed(r.id, at, r.state, null));
      errors.push(...losingPass(r.id, at, r.state, null));
      errors.push(
        `item ${r.id}: is ${r.state} but its recorded state is ${at} and no move was declared. ` +
          "A state never changes silently — declare the move, its kind, and what caused it.",
      );
    }
  }
  return errors;
}

function losingPass(id, from, to, step) {
  if (from !== "VERIFIED-PASS" || to === "VERIFIED-PASS") return [];
  const evidenceGiven = Array.isArray(step?.evidence) ? step.evidence.length > 0 : typeof step?.evidence === "string" && step.evidence.length > 10;
  const lawful = step?.route === "REOPENED" && REOPEN_REASONS.includes(step.reopenReason) && evidenceGiven && Boolean(step.date && step.reason);
  if (lawful) return [];
  return [
    `item ${id}: loses VERIFIED-PASS for ${to} by ${step ? `route ${step.route}` : "no declared route"}. "${REOPEN_RULE_TEXT}" ` +
      `A tick leaves only by a REOPENED move naming one of ${REOPEN_REASONS.join(" | ")}, with its evidence, date and reason.`,
  ];
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
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: STILL BLOCKED — HALF AN INPUT IS NOT AN INPUT.** The boundary needs adversarial tests over NON-EMPTY populations of all four private classes, per product. Evidence and facts are populated. **COST: a ledger now exists, but no cost entry names a product** — every entry is a run of the engine — so no product holds private costs and there is nothing to isolate. **LEARNING: no learning record exists** (no module, no record, no store), and learning is itself deferred (items 39–41 are class D). 🔴 The ruling flags this explicitly only on item 54, but item 1 carries the identical four-class requirement — recorded as my judgement, not as the document's words",
    whyBefore: "the boundary needs adversarial tests over NON-EMPTY populations of all four private classes. Evidence and facts are populated; COST and LEARNING records do not exist, and learning is itself deferred (items 39–41 are class D). 🔴 The ruling flags this explicitly only on item 54, but item 1 carries the identical four-class requirement — recorded as my judgement, not as the document's words",
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
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/replay-crawl.mjs · node --test test/replay.test.mjs",
    why: "🔴 **PROVED BY A LOCAL REPLAY, NOT A SECOND LIVE CRAWL — AND THE REPLAY SAYS WHAT IT DOES NOT PROVE.** **INPUT** the 12 September run's own 394 captured bodies, recovered from its Actions artifact and verified 394/394 against each observation's content_sha256, served from 127.0.0.1 and crawled TWICE through the production crawler, store and inventory; between the runs 5 NAMED bodies changed (C1 noindex removed, C2 noindex added, C3 canonical removed, C4 title removed, C5 body text only on a redirected page) and 389 stayed byte-identical. **EXPECTED met:** 394/394 page_ids identical, 0 moved; 389 pages after run 1 and 389 across both runs — no re-seen page became a second record; each of the 5 changes is a NEW OBSERVATION on its EXISTING page (2 observations, 1 page record each). **RED-proved:** a page_id that takes the clock moves 394 of 394 ids and the job fails on it. **Zero egress:** 822 requests, 0 not to 127.0.0.1. 🔴 **NOT PROVED:** that the crawler reaches the live internet today — the 12 September run proved that and the replay does not re-prove it. D-CRW-5, the green for a second live crawl, is GRANTED AND UNUSED and moved nothing",
    whyBlocked: "the ruling's own BLOCKER TODAY: one crawl run only, by the terms of D-CRW-4. 'Maintain' needs a second run and a second run needs the owner's green — an owner gate, not unbuilt work",
  },
  12: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/audit-content.mjs --out=<scratch> (reads the committed body archive) · node --test test/queue-rescan.test.mjs test/content-checks.test.mjs test/supply-labels.test.mjs",
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND PASSED.** **INPUT** the 394 real bodies of 12 September, now COMMITTED (runs/crawl/bodies-2026-09-12.jsonl.br), with shell subtraction defined and printed. **EXPECTED met:** each of the four classifications accounts for EVERY page — exact-duplicate FAIL 0 · UNKNOWN 0 · clean 394; thin-content 118 · 2 · 274; near-duplicate 5 · 2 · 387; template-dominance 2 · 2 · 390 — each total 394, and every finding is evidence only. ⚠️ A clean page is recorded as the ABSENCE of a finding and counted, not stored as a record of its own. **FAILURE not met:** the shell definition is printed at the head of the run and inside every shell-based finding; no supply label carries a demand or opportunity conclusion. **EVIDENCE:** the run over the real corpus (runs/audit/item-12-38-content-run-2026-09-13.txt); the shell-heavier-than-body control (a 2,000-word shell with a 900-word body must NOT fire as thin) in test/content-checks.test.mjs; and the item-8 guard (test/supply-labels.test.mjs) passing",
    whyBefore: "the v0.1 half observes, classifies and produced real findings. Amendment 1 now supplies its four-part contract, so it CAN be tested — but the EVIDENCE clause wants the four classifications over the real corpus with shell subtraction printed, plus the item-8 guard, and that run has not been made for this row. Not touched in this PR",
  },
  13: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    attemptCount: 2,
    lastAttempt: "2026-09-13",
    test: "node bin/audit-content.mjs · node --test test/content-checks.test.mjs test/queue-rescan.test.mjs test/supply-labels.test.mjs",
    why: "🔴 **REPORTED, NOT COUNTED — AND THEN IT PASSED.** **INPUT** the newest COMPLETE query×page pull (c97334fdd102df8e, window 2026-08-15 → 2026-09-12, 574 rows) — one pull, because merging the three stored pulls of the same window mixes positions (12 query-URL pairs differ between pulls). **EXPECTED met:** every overlap is reported with its QUERY, every COMPETING URL and each URL's POSITION and impressions — **21 of 337 queries searched**, the number searched printed beside the result (LAW-BOUND-1). **FAILURE not met:** no real overlap missed (the detector reads every row of the pull) and none false — 0 of the 21 are two spellings of one canonical page. **EVIDENCE:** detection and report over real data (runs/audit/item-13-26-content-run-2026-09-13.txt); a firing fixture and a silent clean control for the detector AND for the report. **Measurement only:** alphabetical by query so nothing reads as a ranking, and item 8's demand-word guard holds over the report text",
    whyAttempted: "🔴 **RE-SCANNED AND RUN 13 SEPTEMBER 2026 — IT DOES NOT TICK, AND BY AMENDMENT 2's OWN DEFINITION IT IS NOT FAILED EITHER.** **INPUT exists:** three query×page pulls for 2026-08-15 → 2026-09-12 carry query text (543, 574 and 574 rows, each COMPLETE and exhausted). **The detector is right on real data:** 337 distinct queries searched, 21 drawing impressions on more than one URL, and 0 of those 21 are two spellings of one canonical page — no single-URL query reported as an overlap. **EXPECTED NOT met:** the runner prints a COUNT ('21 queries on >1 URL'); it does not report any overlap's query, competing URLs or positions, and it never states how many queries it searched. **FAILURE not met** — no real overlap is missed and none is false — so Amendment 2 does not allow FAILED ('the boundary's FAILURE condition was met'), and a row that did not meet EXPECTED cannot pass. It stays TESTABLE-NOW with the one change and test named. ⚠️ The earlier '16 findings' was one of the three pulls; merged, it is 21",
    whyBefore: "detection ran on real data (16 cannibalization findings). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants a firing fixture, a clean control and the number of queries searched stated. Not touched in this PR",
  },
  14: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node --test test/permitted-writers.test.mjs test/write-confinement.test.mjs test/no-blind-regeneration.test.mjs · node tools/permitted-writers.mjs",
    why: "🔴 **LEFT FAILED BY RULE 1's FIRST ROUTE — THE CAUSE WAS FIXED AND THE TEST RE-RUN AND PASSED.** All five parts against Amendment 2's contract, the census not narrowed and the contract not softened. **(a)** 0 writes into a product repository. **(b)** 0 publish paths. **(c)** 0 bulk generation. **(d)** 8 write sites in 7 files, all 7 named in the register and reconciling exactly (both directions RED-proved); **all 8 sites dry-run by default** — the owner report writer and the chain runner's sibling cache, which #49 failed on, now write only with --confirm; **every destination confined**: all 7 call the confinement check before their first write, and a real writer pointed outside the repository with --confirm REFUSES and creates nothing; every register reason stated (the one UNKNOWN was DETERMINED, not filled in). **(e)** a rediscovered URL resolves to its existing page_id on the real 495-page run. Each part RED-proved by injection, each landing in its intended test. ⚠️ One reading recorded rather than hidden: the crawler's body write is gated by --live plus the owner's-green flag, two explicit flags, rather than --confirm",
    whyFailed: "🔴 **SAT AGAIN AGAINST AMENDMENT 2, AND FAILED.** The owner's ruling returned it to TESTABLE-NOW (a RULING move); the re-test then ran (a WORK move). **(a)** 0 writes into a product repository — PASS. **(b)** 0 publish paths — PASS. **(c)** 0 bulk generation — PASS. **(d)** NOT MET: the widened census finds **8 write sites in 7 files** (the census merged in #47 found 6 and was blind to two writes whose `.html` target is named one line up); all 7 are now named in the register and reconcile exactly; but **2 sites DEFAULT TO WRITING** — the owner report writer has no gate at all, and a chain runner writes its cache of fetched sibling pages with no flag. Also not met, and recorded rather than decided: **7 of 7 writers take their destination from an operator flag and nothing contains it to this repository**; the literal-path detector finds 0 outside writes, which is all a source scan can see. **(e)** a rediscovered URL resolves to its existing page_id — PASS on the real 495-page run, sabotage-proved. One reason is UNKNOWN in the register and says so. Closing (d) is a code change to two writers and a re-run — the route out of FAILED that rule 1 names",
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
  25: {
    state: "TESTABLE-NOW",
    changeKind: "work",
    attemptCount: 1,
    lastAttempt: "2026-09-13",
    gap: "verified-fact presence finds 0 verified facts on all 389 existing pages, so source integrity — measured on all 15 cited sources, 15 LIVE — can be reported for NO existing page; the only page carrying verified facts is one this engine generated from the registry, which cannot show the check sees facts on a page someone else wrote",
    test: "node bin/page-quality.mjs over an existing page set that includes pages known to state registry facts (a bounded capture of such pages needs the owner's green), with node bin/source-integrity.mjs's recorded run folded in per page · node --test test/existing-pages.test.mjs test/source-integrity.test.mjs",
    why: "🔴 **RUN 13 SEPTEMBER 2026 — ALL FOUR PARTS MEASURED, AND IT DOES NOT TICK, AND IT IS NOT FAILED.** **(1) UNIQUE VALUE — proved:** measured on all 389 existing pages with a served body (122 at or above 350 unique words after the group's shell, 267 below), firing fixture and clean control. **(2) SIBLING OVERLAP — proved, with its limits named:** MEASURED on 327 pages (239 within 0.40, 88 above); 52 pages sit alone in their template group (VACUOUS) and 10 in groups of two, where Gate A's shell is the pair's intersection and a duplicate pair would score 0 (UNMEASURABLE, D-GATEA-1) — neither is counted a pass. **(3) VERIFIED-FACT PRESENCE — measured, no real positive:** 0 of 389 existing pages carry a verified fact; the rule fires on real registry values on a page this engine GENERATED (14 present), which is a control and never an existing page. **(4) SOURCE INTEGRITY — measured live, per source, not per page:** the owner-authorised link check requested 18 of a hard cap of 40, 1/s, external hosts only, HEAD first — all 15 cited sources LIVE, 0 GONE, 0 UNKNOWN, 0 disagreements with beta-g's 12 September reading (the exam provider's site answered HEAD with 200 where beta-g's fetcher got 403). But with no existing page carrying a fact, no page has a source to report. **EXPECTED** ('each measured and reported per page') is not met for part 4; **FAILURE** ('fixture-only or absent') is not met — every part ran on real data. So: TESTABLE-NOW, attempted once, gap named",
    whyBefore: "Gate A measures overlap, facts and shell. The v0.1 half also names SOURCE INTEGRITY, and the EVIDENCE wants all four over the real corpus each with a clean control",
  },
  26: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    attemptCount: 2,
    lastAttempt: "2026-09-13",
    test: "node bin/edge-graph.mjs · node bin/audit-content.mjs · node bin/audit-technical.mjs · node bin/instrument-disagreement.mjs --close · node --test test/edge-graph.test.mjs test/queue-rescan.test.mjs",
    why: "🔴 **THE DISAGREEMENT WAS ITSELF A FINDING — RAISED, EXPLAINED, FIXED, AND CLOSED ON EVIDENCE. THEN THE ROW PASSED.** **Raised:** 340 against 341 over the same bodies became **11 Issues** in runs/audit/instrument-findings.jsonl, one per page the two instruments treated differently. **Explained — both were wrong:** bin/audit-content.mjs counted once per OBSERVATION, so the 5 pages two requested URLs reached were counted twice (its 340 was 335 pages); bin/audit-technical.mjs IGNORED A LINK FROM ANOTHER HOST, so the 6 sub-site homes linked from 359–393 crawled pages on other hosts read as unlinked (341). Neither said which question it answered. **Fixed:** ONE definition (src/crawl/inbound.mjs — a distinct page, a link from any crawled host, never a self-link) over ONE stored graph (runs/crawl/edges-2026-09-12.jsonl.br, 19,730 links, re-derived from the archive and compared on every commit). **Agreement shown:** both runners re-run print **335**, and the 11 Issues are CLOSED on their recorded output, not on a recount. **Item 26's own test:** links read from served HTML only; orphans detected — 335 pages with no inbound link inside the crawled set; every one reported UNKNOWN (NEEDS_RENDERED_HTML), **0 reported as 'missing'**, because a JavaScript-injected link is invisible to raw HTML; the graph in durable storage; the UNKNOWN path exercised on real data. **FAILURE not met.** Every other audit tally is identical before and after",
    whyAttempted: "🔴 **RE-SCANNED AND RUN 13 SEPTEMBER 2026 — IT DOES NOT TICK, AND IT IS NOT FAILED BY AMENDMENT 2's DEFINITION.** **INPUT exists:** the 394 served bodies are committed, and 19,926 links are read out of them. **What holds:** every edge is read from served HTML; a page with no inbound edge is reported UNKNOWN (NEEDS_RENDERED_HTML), never 'orphan' — 340 real UNKNOWN records. **What does not:** the two runners that count zero-inbound pages over the SAME bodies disagree — 340 (bin/audit-content.mjs, counts a link from any crawled host) against 341 (bin/audit-technical.mjs, same host only) — and neither states its scope, so 'orphan counts' has two answers. The graph is also still not stored as a graph. **FAILURE not met** — nothing unseen is recorded as absent and the graph is available — so it is TESTABLE-NOW with the fix and test named, not FAILED and not a pass",
    whyBefore: "the graph, orphan counts and the UNKNOWN path all exist and ran. But the EVIDENCE wants the graph in DURABLE storage and the committed PageRecords still carry empty edge lists — the graph lives in an artifact that expires 2026-12-11",
  },
  36: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE wants a test that RUNS each guard per category — destructive, paid, production, large-scale, cross-product. Exactly one runs today (the D-CRW-4 live-run refusal). The rest are asserted in prose, which the FAILURE clause names as a failure in itself" },
  38: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/audit-technical.mjs --out=<scratch> (reads the committed body archive) · node --test test/queue-rescan.test.mjs test/technical-checks.test.mjs",
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND PASSED.** **INPUT** each of the 394 real pages with its status, canonical, meta robots and X-Robots-Tag (from the committed bodies and recorded headers), the matching robots.txt rule and sitemap membership (from the stored robots and sitemap observations). **EXPECTED met:** a state for every page over the real corpus — **158 BLOCKED · 210 UNKNOWN · 26 ELIGIBLE**, total 394 — and `INDEXABLE ≠ INDEXED` printed at the head of the run and inside every preflight finding; no report view shows the state without it. ⚠️ An ELIGIBLE page is recorded as the ABSENCE of a finding and counted, not stored as a record of its own. **FAILURE not met:** nothing reports indexability as indexation, and test/technical-checks.test.mjs fails the build on any output promising a page will be indexed, ranked or cited. **EVIDENCE:** runs/audit/item-12-38-technical-run-2026-09-13.txt, identical in every tally to the same run over the unpacked artifact",
    whyBefore: "indexability of existing pages was inspected on real data (134 noindexed pages traced to one commit). Amendment 1 now supplies its four-part contract. Its EVIDENCE wants the state over the real corpus plus a test failing the build on any indexing promise. Not touched in this PR",
  },
  42: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/replay-crawl.mjs · node --test test/replay.test.mjs",
    why: "🔴 **FIVE CHANGED TARGETS, EACH RE-TESTED ON ITS LATEST OBSERVATION — AND THE CHANGE WAS A LOCAL REPLAY CHANGE, NOT A PRODUCT PAGE CHANGE.** **INPUT** 5 targets whose served body changed between two replay runs of the real 12 September corpus. **EXPECTED met:** the re-test picks the newest stored observation of the page FROM THE STORE, not the one the caller holds, and records a verdict before and after, each naming the observation it read: C1 noindex **FAIL → PASS**; C2 noindex **PASS → FAIL**; C3 canonical **PASS → FAIL** ('no rel=canonical'); C4 head-elements **PASS → FAIL** ('no <title>'); C5 body-text only, **PASS → PASS** on noindex, canonical and head-elements — a change that should move no verdict moved none. **FAILURE not met:** every re-test read an observation newer than the one before the change (no stale observation served as current), and every verdict names its evidence. **The change is legitimate:** in-memory copies of recovered bodies served on 127.0.0.1 — no product's real page was changed and nothing was written to any product repository, which would be forbidden. 🔴 **NOT PROVED:** that a change on a LIVE page is noticed by a live crawl; that needs a live second run, and D-CRW-5 stays unused for it",
    whyBlocked: "the ruling's own BLOCKER TODAY: requires a second authorised crawl run. Owner gate",
  },
  45: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node --test test/item45-scope.test.mjs test/cost-ledger.test.mjs test/cost-governor.test.mjs · node bin/cost-ledger.mjs",
    why: "🔴 **TICKED UNDER A SCOPE RULING, ON ONE REAL RUN — AND THE LOSS BEFORE IT STAYS ON THE RECORD.** The technical owner ruled that a component cannot be failed for a period before it existed: item 45's scope is runs from the ledger's existence (8c9d68b, 2026-09-12T23:03:09Z) onward, the bar unchanged. The row left FAILED by that ruling (a RULING move) and was then sat again (a WORK move). **One real Search Console run inside the scope recorded all four**: money 0 ZERO_BY_TARIFF with its basis; 9 provider calls, counted by the governor; crawl budget 0 fetched and 0 requests against the caps 500 and 200, with its basis — a tracked zero, not an absent field, and the ledger now refuses a zero without one; founder time 2.238 s wall-clock. `item45Verdict` over the real ledger: PASS, 1 run in scope, 0 measurable UNKNOWNs in scope. **The hard stop** remains proved by injection. **Out of scope and NOT forgotten:** 9 earlier runs, 12 measurable costs never recorded — permanent loss L-COST-1, never estimated, and the row outlives this tick",
    whyFailed: "🔴 **THE LEDGER EXISTS AND THE HARD STOP HOLDS — AND THE FAILURE CONDITION IS MET, ON THE RECORDS WE ALREADY HAD.** Built: an append-only ledger tracking all four — money, provider calls, budget against its cap, founder time — every line printing its bound, every UNKNOWN required to say whether it WAS measurable. Backfilled from real records, nothing estimated: **the 12 September crawl** — 394 calls, founder time 403.268 s (the Actions run that hosted it: 423 s), 500 requested / 394 fetched / 106 disallowed against caps 500 and 200, cap not reached; money UNKNOWN and NOT measurable with tools we hold (the plan's price and allowance, U-COST-1; our own hosting's invocations, U-COST-5 — GitHub's reported 0 billable ms is not read as $0). **Eight stored ingest runs** — money ZERO_BY_TARIFF; calls MEASURED on 4; founder time on NONE. **12 parts read UNKNOWN although they were measurable at the time**, which is the FAILURE clause exactly. **Hard stop proved by injection** through the real adapter: pages that never end stop at the run cap with exactly that many requests reaching the boundary, the stop latches and is not swallowed as an API error. `apiCalls` is now per pull, with the running total in its own field. Every future ingest records all four as it happens. ⚠️ The eight past runs cannot be re-measured: leaving FAILED needs a run that records all four AND either a re-run that passes or an owner ruling on those eight",
  },
  46: { state: "BUILT-NOT-PROVED", why: "the EVIDENCE demands hit/miss counts over a LIVE RESEARCHER, not a pre-loaded registry, and nothing researches. The cache did improve on 12 September — it now refuses UNKNOWN facts, and the hit rate fell 100% → 69.6% — but a pre-loaded shelf is still what is being measured" },
  47: { state: "NOT-STARTED", why: "the ruling's NOTE is explicit: no paid provider exists, and ABSENCE IS NOT A CONTROL. The controls — authorization, budget/cap, kill switch — must exist before a provider does, and none is built" },
  48: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/replay-crawl.mjs · node --test test/replay.test.mjs test/duplicate-writers.test.mjs test/issue-writer-census.test.mjs test/idempotency-retry.test.mjs · node tools/duplicate-writer-census.mjs",
    failureMetThen: "a record duplicates — the technical audit writer, run twice on 12 September 2026, stored 868 issues twice with a bare append; it was never inside the population the tick was earned on",
    why: "🔴 **LEFT FAILED BY RULE 1's FIRST ROUTE — THE JOBS THE REOPEN NAMED WERE RUN TWICE, AND NOTHING DUPLICATED.** The reopen said exactly what was missing: two authorized jobs, the crawl and the DNS audit, had never been run twice. **Both now have.** **The crawl**, by a LOCAL REPLAY of the 12 September run's own 394 bodies through the production crawler and store, counted APART: **389 unchanged bodies → 0 new measurement records, 389 re-sightings**; **5 changed bodies → 5 new observations**, which is correct and not a duplicate. **The DNS audit**, run twice into one store on **RECORDED resolver answers** (the dns.families observations stored on 12 September — not a live query, and it says so): **134 records on the first run, +0 and 134 re-sightings on the second.** With the writers already proved, **every job that stores a record has now been run twice for real**: technical (2328 issues, +0), content (1576, +0), verification (2 issues and 6 observations, +0), supply labels (550, +0), Search Console ingest (re-sightings on real re-runs), crawl, DNS audit. **Two layers, and neither is enough alone:** the recorded double runs prove the writers WORKED; the issue-writer census proves on every commit that every issue writer is STILL WIRED to appendIfNew. **RED-proved through the real replay job:** a measurement_key that takes the clock turns all 389 unchanged bodies into new records and the job fails on it. **The retry half is unchanged and still tested**: one request per 4xx, one retry on a network error, none on a 5xx. **Cost side effects:** the cost ledger refuses a second entry with the same entry_id. 🔴 **NOT PROVED:** what DNS answers LIVE today, or that a live second crawl would behave the same against changed live pages — D-CRW-5 stays unused",
    whyFailed: "🔴 **REOPENED — THE FIRST TICK THIS PROJECT HAS REMOVED.** By the checklist's reopen rule, for concrete contradictory evidence. **Was the audit writer inside the tested population? NO.** The tick's 'same job run twice' test drives one synthetic observation through appendIfNew, and its REAL test counts only the crawl file; no audit writer was ever run twice. Outside that population the FAILURE condition was met on real data: 868 extra copies in the technical findings. **Is an audit writer 'an authorized job'? Yes** — it is run deliberately by an operator, reads authorized evidence, and writes stored conclusions; nothing in the boundary limits 'job' to ingests. **Fixed in this change:** the store deduplicates an issue by its content-derived issue_id; all four unguarded writers (three audit writers and the crawler's observations) now use appendIfNew; the 868 copies are SUPERSEDED by append-only notes, none removed. **Re-test:** both offline audit writers run twice for real add 0 issues on the second run; a census finds 0 unguarded record writes. **The proof is in TWO LAYERS, and neither is enough alone:** the RECORDED double runs prove the audit writers WORKED, once, for real — but a test reading that file reads a file, not the code; the ISSUE-WRITER CENSUS proves, on every commit, that every writer of issue records (six, found from the code — including the supply-label writer, which overwrote its file and was not append-only) is STILL WIRED to appendIfNew. **Why it does NOT re-tick here:** two authorized jobs — the crawl (a second run needs the owner's green) and the DNS audit (network) — cannot be run twice in this change, so their fix is proved in source and through the store, not by the double run the boundary names. Leaves FAILED by that run passing, or an owner ruling",
    whyPassed: "**INPUT** the same authorized job run twice, and a retry against a 4xx. **EXPECTED** the re-run appends no duplicate payload and mints no new id for the same measurement — before 1 / after 1, with the re-sighting recorded rather than dropped; and requests are counted at the boundary: 7 different 4xx statuses each issue exactly ONE request, a network error gets exactly ONE retry (2 attempts, never 3), and a 5xx is not retried at all. **FAILURE** not met, on real data: the 12 September crawl holds 500 observations with 500 distinct measurement keys and 500 distinct ids. **COST** — requests are the only metered thing this system issues (no paid provider exists, item 47), and a re-run over held input issues zero. 🔴 **The retry rule had NO test until now**; the code was right since PR #36 and nothing would have caught it changing. Three sabotages — retry a 4xx, retry twice, stop deduplicating — each landed in the intended test",
  },
  49: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node --test test/issue-lifecycle.test.mjs test/source-tiers.test.mjs",
    why: "🔴 **THE FIRST LIFECYCLES THIS PROJECT HAS COMPLETED.** An issue now leaves OPEN by a second, append-only record naming the move, when, why, its evidence and the action that made it; SUPERSEDED must name a replacement that names it back. **134 real noindex issues SUPERSEDED**: they claimed a DEFECT, and later evidence — the commit that set the gate and states its intent, plus search guidance that the pages are configured as de-indexing needs — shows a DELIBERATE decision. The replacements are UNKNOWN, not PASS: the near-duplicate premise the commit cites is NOT confirmed by our similarity measurement (0.685 average, none reaching 0.8), so whether the gate is still right is the owner's decision. The originals are retained byte for byte — the store before this change is a prefix of it now. **One real chain walked end to end in the report, all five present**: what, why, from which evidence (every id resolved), when, and what changed it. **The robots issues were NOT closed** — 106 remain OPEN, because they are not fixed and not superseded. **The §623 tier layer exercised on real records**: the 32 verified facts become OFFICIAL Source records and are ranked against our own analytics property and a drafted inference. ⚠️ Found on the way: the technical findings store holds every one of these issues TWICE — the audit writer appended the same issue_id on two runs; recorded, not fixed here",
  },
  50: {
    state: "FAILED",
    changeKind: "work",
    test: "node --test test/queue-rescan.test.mjs (item 50) · a real fact supersession through src/facts/validate.mjs's F23 arbiter",
    failureMet: "the guard polices an empty population — the UNKNOWN→PASS arbiter (F23) judges only fact supersessions, and 0 of 46 real facts carry life.supersedes",
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND ITS FAILURE CONDITION IS MET.** **INPUT exists:** records of all four kinds on real data — observations (OBSERVED), run summaries (INFERRED), issues (RECOMMENDED) and UNKNOWN findings and facts. **The labels hold.** **The guard does not govern real records:** the only UNKNOWN→PASS arbiter on a real verdict path is F23 in src/facts/validate.mjs, it judges a fact that supersedes another, and **0 of 46 real facts carry life.supersedes** — the population is empty, which the FAILURE clause names word for word. The 134 superseded issues do not pass through it: issue lifecycle records are not check outcomes. ⚠️ Also found: a real `draft_recommendation` has no declared label and would render UNKNOWN. **Leaves FAILED** by a real record passing through the guard and the test re-run, or an owner ruling",
    whyBefore: "all four labels are live and 14 real records now carry UNKNOWN. But the boundary's guard is the UNKNOWN→PASS transition (F23), and 0 of 46 records carry life.supersedes, so that guard still polices an empty population — which the FAILURE clause names explicitly",
  },
  51: {
    state: "FAILED",
    changeKind: "work",
    test: "node --test test/queue-rescan.test.mjs (item 51) · node bin/report.mjs, inspected for all six on a real recommendation",
    failureMet: "priority, confidence and cost are missing on every real recommendation, and the real report renders no recommendation at all",
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND ITS FAILURE CONDITION IS MET.** **INPUT exists:** three real recommendations (runs/audit/recommendations.jsonl, drafted 12 September). **Of the six the owner must be able to inspect:** status ✅ (RECOMMENDED — NOT APPROVED — NOT APPLIED), evidence ✅ (a cited official source), reason ✅ (the finding and its origin); **priority ❌, confidence ❌, cost ❌** — no such field exists. And **on the real report none of the six is visible**: bin/report.mjs reads a recommendation only as a source-tier row. 'Any of the six is missing or unreadable' — met. **Leaves FAILED** when a real recommendation shows all six on the real report and the test is re-run",
    whyBefore: "the ruling's own BLOCKER TODAY: of the six the owner must be able to inspect, PRIORITY, CONFIDENCE and COST do not exist at all",
  },
  52: {
    state: "BLOCKED-UNKNOWN",
    why: "🔴 NOT RUN = NOT TESTED, and the rendering trigger is unmet. Two of the six RED classes cannot be detected without a renderer, so running the exam today would produce a FAIL that measures our sequencing rather than the engine — and the seal breaks only once",
  },
  53: { state: "BUILT-NOT-PROVED", why: "the boundary law and fixture tenants hold, but the INPUT is an UNSEEN product — a second real product or a neutral declared test product — and none has been declared and run" },
  54: {
    state: "BLOCKED-UNKNOWN",
    why: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: STILL BLOCKED — HALF AN INPUT IS NOT AN INPUT.** The INPUT is two declared products EACH holding private evidence, facts, costs and learning. **COST: a cost ledger now exists, but no cost entry names a product**, so neither product holds a private cost to be isolated. **LEARNING: no learning record exists** — no module, no record, no store. Two of the four classes still do not exist to be tested, which the FAILURE clause names ('a class does not exist to be tested') — but the test cannot be run without them, so it is not FAILED either. Learning is itself deferred, so this cannot be closed inside frozen v0.1",
    whyBefore: "the ruling's own BLOCKER TODAY: no cost record and no learning record exists, so two of the four classes cannot be tested. Learning is itself deferred, so this cannot be closed inside frozen v0.1",
  },
  55: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    attemptCount: 2,
    lastAttempt: "2026-09-13",
    test: "node --test test/secret-leak.test.mjs test/store-recovery.test.mjs",
    failureMetThen: "any leak — a key file that is not JSON was quoted by the adapter's parse error in-process, and printed whole to stderr by the CLI",
    why: "🔴 **LEFT FAILED BY RULE 1's FIRST ROUTE — A REAL LEAK, FOUND BY EXECUTION, FIXED, AND THE TEST RE-RUN AND PASSED.** **INPUT** the credential code path (the Search Console adapter, the ingest, and the CLI in a child process) and the recoverable state (the committed evidence stores). **The leak test EXECUTES, it does not grep:** a FAKE service-account key generated in the test, with an unmistakable marker inside the private key, padded so its lengths are unmistakable too; every path that touches it is driven — a successful ingest, a refused token exchange, a key file that is not JSON, a broken PEM, and the CLI in a child process whose network is replaced by a thrower — and the marker (any 8 consecutive characters), a key line, its sha256/sha1/md5 digests and its lengths are searched for in console output, stdout, stderr, error messages, stack traces, returned results and stored records. The real key is never read. **RED-proved twice:** logging the key, and logging its length, each turn the test red. **RECOVERY:** four committed stores and the body archive are torn the way a crashed write tears them, the damage is caught by the store's own reader, and each is restored from the committed state — byte-identical, by git's own blob hash. **FAILURE not met after the fix**",
    whyFailed: "🔴 **ITS FIRST HONEST RUN FOUND A LEAK — THE FAILURE CONDITION 'ANY LEAK' WAS MET.** The adapter parsed the key file with a bare JSON.parse. On a key file that is not JSON, the SyntaxError quotes the text it failed on: in-process its first characters appeared in the error; through the CLI, Node printed the WHOLE FIRST LINE of the file to stderr (runs/audit/item-55-leak-test-red-before-fix-2026-09-13.txt). A manual grep of this repository would never have found it — the quoting is Node's, not ours. That is the FAILURE clause's own point. (D-SEC-1)",
    whyAttempted: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: THE INPUT EXISTS, AND THE TEST WAS NOT RUN.** **INPUT** 'a code path that handles a secret, and a state that must be recoverable' — the key-file path through the Search Console adapter exists, and the append-only stores are the state. **Not run in this change:** no executing leak test exists yet — the FAILURE clause forbids proving it by manual grep, so it waits for that test, named here. Not a pass",
    whyBefore: "the no-leak property holds in practice — the Search Console key was never printed, hashed or length-measured — but the FAILURE clause forbids proving it BY MANUAL GREP, and no executing test hunts for a leak. Recovery has not been exercised either",
  },
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

    /* 🔴 RULING 0B, beta-g, 13 September 2026 — "NEVER TRIED" AND "TRIED, AND
     * HERE IS EXACTLY WHAT IS MISSING" ARE DIFFERENT ROWS. A TESTABLE-NOW row
     * carries attemptCount (0 when never run), and once it has been run it must
     * carry the date of its last attempt and the SPECIFIC gap that stopped it —
     * or the queue lets rows drift in a comfortable middle with nothing said. */
    if (r.state === "TESTABLE-NOW") {
      if (!Number.isInteger(r.attemptCount) || r.attemptCount < 0) {
        errors.push(`item ${r.id} (${boundaries[r.id].name}) is TESTABLE-NOW with no attemptCount — record 0 if it has never been run`);
      } else if (r.attemptCount > 0) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.lastAttempt ?? "")) {
          errors.push(`item ${r.id} (${boundaries[r.id].name}) has been attempted ${r.attemptCount} time(s) but records no lastAttempt date`);
        }
        if (typeof r.gap !== "string" || r.gap.trim().length < 20) {
          errors.push(
            `item ${r.id} (${boundaries[r.id].name}) is TESTABLE-NOW, was attempted ${r.attemptCount} time(s), and names no gap. ` +
              "A row that was run and fell short must say EXACTLY what stopped it.",
          );
        }
      }
    }
  }
  return errors;
}

export function tally(rows) {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const r of Object.values(rows)) counts[r.state] += 1;
  return counts;
}
