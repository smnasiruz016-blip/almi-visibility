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

import { readFileSync } from "node:fs";

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
/**
 * 🔴 ROWS ADMITTED BY OWNER RULING, AND THE STATE EACH ARRIVED IN.
 *
 * BEFORE_AMENDMENT_2 knows the frozen 58 and nothing else. A row admitted later has no before-state there, and
 * a transition law that met `undefined` would either crash or wave the row through. So each admitted row
 * declares the ruling that admitted it and the state it arrived in; that is where its chain starts. A row that
 * is in neither place fails the build.
 */
export const ADMITTED_ROWS = Object.freeze({
  59: Object.freeze({ arrivedAs: "NOT-STARTED", ruling: "PASS_BOUNDARIES_AMENDMENT_3.md — owner ruling under §12, 13 September 2026, re-issued 14 September 2026", date: "2026-09-14" }),
  60: Object.freeze({ arrivedAs: "NOT-STARTED", ruling: "PASS_BOUNDARIES_AMENDMENT_3.md — owner ruling under §12, 13 September 2026, re-issued 14 September 2026", date: "2026-09-14" }),
  61: Object.freeze({ arrivedAs: "NOT-STARTED", ruling: "PASS_BOUNDARIES_AMENDMENT_5.md §4 — reserved there as NOT-STARTED; created once rows 59 and 60 existed (Amendment 3)", date: "2026-09-14" }),
});

export const MOVES_AMENDMENT_2 = Object.freeze({
  /* 🔴 ROWS 59 AND 60 — AMENDMENT 3's WORK HALF, released by the owner on 14 September 2026. WORK moves: 59's test
   * was run against its own boundary and passed; 60 was built and waits on the owner's levels. No boundary changed. */
  59: Object.freeze([
    Object.freeze({
      from: "NOT-STARTED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node bin/refutation-census.mjs · node --test test/falsifiability.test.mjs · runs/audit/row59-census-2026-09-14.txt · runs/audit/row59-red-limbs-2026-09-14.txt",
      date: "2026-09-14",
      reason: "the census over the real store checked a population of 20 read from it — 17 finding classes and 3 recommendations — and all 20 carry observation, source and condition with a held method; each evidence limb was sabotaged alone in the real register, went RED on that limb only, and was restored and hash-checked. It proves presence and a held method, never that a refutation is well chosen",
    }),
  ]),
  60: Object.freeze([
    Object.freeze({
      from: "NOT-STARTED",
      to: "BUILT-NOT-PROVED",
      kind: "work",
      route: "BUILT",
      test: "node bin/consequence-census.mjs · node --test test/consequence-register.test.mjs · runs/audit/row60-census-2026-09-14.txt · runs/audit/row60-red-limbs-2026-09-14.txt",
      date: "2026-09-14",
      reason: "the register was built with every class in the store and every level UNCLASSIFIED, every presented priority states its basis and the entries that applied, and each limb went RED alone and was restored — and it stops at BUILT-NOT-PROVED because only the owner may declare the levels its EXPECTED requires",
    }),
    /* 🔴 14 SEPTEMBER 2026 — its FIRST TICK, by its test, after the owner ruled the levels (#77), the coverage gaps (#79) and
     * the decisions on record and audit trail (Option A). WORK: the census run over the real store and the four frozen
     * limbs re-run alone. The rulings moved what counts as a finding; the move to VERIFIED-PASS is the test passing. */
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node bin/consequence-census.mjs · node --test test/consequence-register.test.mjs test/populations.test.mjs test/row60-ruling-sheet.test.mjs · runs/audit/row60-populations-red-limbs-2026-09-14.txt",
      date: "2026-09-14",
      reason: "the census over the real store reconciled the register line by line against the 14 finding classes in use, every one carrying the owner's level; the real report shows every presented recommendation's basis and the entries that applied; and row 60's four frozen evidence limbs were sabotaged alone in today's real files, each RED on its own limb, restored and hash-checked. It proves consistent application of the owner's judgement, never that a level is well chosen",
    }),
  ]),
  /* 🔴 ROW 61 — WORK HAPPENED, AND IT IS NOT PROVED. PR #72 built it (merged 14 September 2026); the row was
   * reserved then and could not carry a state of its own. Created now, it records that work as a WORK move —
   * to BUILT-NOT-PROVED, never further: the EVIDENCE clause's portability leg was not run through the runner. */
  61: Object.freeze([
    Object.freeze({
      from: "NOT-STARTED",
      to: "BUILT-NOT-PROVED",
      kind: "work",
      route: "BUILT",
      test: "node --test test/page-construction.test.mjs · node bin/build-page.mjs --product=<the first product> --all-slugs · runs/audit/row61-gate-a-red-2026-09-14.txt · runs/audit/row61-gate-a-green-2026-09-14.txt",
      date: "2026-09-14",
      reason: "the runner takes --slug / --all-slugs with no default; Gate A's four frozen parts are enforced inside the construction path and fail closed; seen RED with the acceptance rule bypassed and GREEN restored; 0 of 3 candidates accepted — and the neutral product was refused AT THE RUNNER, so the portability leg is not proved",
    }),
  ]),
  /* 🔴 AMENDMENT 4 — owner ruling, 13 September 2026. Rows 3–7 leave class D. RULING moves and nothing else:
   * no row was built, no test was run, and each arrives NOT-STARTED. Row 2 was put to the same input test,
   * failed it, and stays DEFERRED — it has no move. */
  ...Object.fromEntries(Object.entries({ 3: "S", 4: "P", 5: "P", 6: "P", 7: "S" }).map(([id, to]) => [id, Object.freeze([
    Object.freeze({
      from: "DEFERRED",
      to: "NOT-STARTED",
      kind: "ruling",
      route: "OWNER_RULING",
      ruling: "PASS_BOUNDARIES_AMENDMENT_4.md §1 and §3 — the discovery rows enter scope",
      date: "2026-09-13",
      reason: to === "P"
        ? "class D → P: its frozen INPUT clause was tested against the owned evidence store and the input is present. Nothing was built or run; a class change is not progress"
        : "class D → S (split): its frozen INPUT clause was tested against the owned evidence store and only the owned half is present — that half enters scope, the rest stays deferred and is named on the row. Nothing was built or run; a class change is not progress",
    }),
    /* 🔴 WORK SINCE AMENDMENT 4, per row — each move declared, never inferred from the ruling that opened the row. */
    ...(({
      /* Row 3, 15 September 2026: its OWNED half run against its boundary on the three owned pulls — and passed. The public half stays deferred. */
      3: [
        Object.freeze({
          from: "NOT-STARTED",
          to: "VERIFIED-PASS",
          kind: "work",
          route: "TEST_RUN",
          test: "node bin/search-language.mjs --check · node --test test/search-language.test.mjs · runs/discovery/search-language-2026-09-15.json · runs/audit/row3-red-limbs-2026-09-15.txt",
          date: "2026-09-15",
          reason: "329 pieces of real wording discovered from the owned pulls and stored with a pointer to every row (observation id, ingest date, row), kinds evidenced or UNCLASSIFIED, no hand-written lexicon read; the held-out sample re-read from the raw store resolves 61 of 61; the keyword→URL census finds no path; each FAILURE limb RED alone in the real files and restored. The owned half passes; the public half stays deferred",
        }),
      ],
      /* Row 4, 15 September 2026: built and run on owned evidence — and it stops at BUILT-NOT-PROVED, because half (b) of
       * its FAILURE clause needs the answer at each country, which the store does not hold. */
      4: [
        Object.freeze({
          from: "NOT-STARTED",
          to: "BUILT-NOT-PROVED",
          kind: "work",
          route: "BUILT",
          test: "node bin/localized-thinking.mjs --check · node --test test/localized-thinking.test.mjs · runs/discovery/localized-thinking-2026-09-15.json · runs/audit/row4-red-limbs-2026-09-15.txt",
          date: "2026-09-15",
          reason: "37 goals seen from two or more countries grouped on row 3's discovered relations only (12 worded differently, 25 the same wording), each wording traceable to its country row; 38 of 48 countries UNKNOWN below a floor of 5 rows; no consumer builds an address from a country; each limb RED alone in the real files and restored. Stops at BUILT-NOT-PROVED because half (b) — materially different useful content — needs per-value answer evidence the owner has not authorised",
        }),
      ],
      /* Row 5, 14 September 2026: its test run against its boundary on the real query pull — and its FAILURE clause met on the held-out check. */
      5: [
        Object.freeze({
          from: "NOT-STARTED",
          to: "FAILED",
          kind: "work",
          route: "TEST_RUN",
          test: "node bin/intent-clusters.mjs --check · node --test test/intent-clustering.test.mjs · runs/audit/row5-census-2026-09-14.txt · runs/audit/row5-red-limbs-2026-09-14.txt",
          date: "2026-09-14",
          reason: "329 human queries (8 operator strings classified and kept apart); in-sample 268 → 73 clusters, 0 merged and 0 split against a reference written before the clusterer ran; the held-out check left 12 of 61 identical intents split — FAILURE met on the evidence the contract names; six limbs RED alone in the real files and restored. FAILED on the owner's answer",
        }),
      ],
      /* Row 6, 14 September 2026: built and run on the subject's real evidence — and it stops at BUILT-NOT-PROVED, because
       * no axis can be accepted or rejected on owned evidence, so the populations its EVIDENCE clause names are empty. */
      6: [
        Object.freeze({
          from: "NOT-STARTED",
          to: "BUILT-NOT-PROVED",
          kind: "work",
          route: "BUILT",
          test: "node bin/axis-discovery.mjs --check · node --test test/axis-discovery.test.mjs · runs/audit/row6-census-2026-09-14.txt · runs/audit/row6-red-limbs-2026-09-14.txt",
          date: "2026-09-14",
          reason: "the six named axes (read from the contract) and 7 discovered slot types each tested with seven legs on real evidence: 7 MONITOR, 7 UNKNOWN, 0 BUILD, 0 REJECT — answer-level distinguishing power is UNKNOWN on every axis because the answer at each value is not owned; locality tested on the 10 countries with five or more rows, the other 38 UNKNOWN by LAW-ABSENT-1; every limb RED alone and restored; BUILD and REJECT shown reachable when measured. BUILT-NOT-PROVED on the owner's answer",
        }),
      ],
      /* Row 7, 15 September 2026: the owned half built and run — VISIBILITY/REACH measured, DEMAND only bounded, the three
       * deferred dimensions UNKNOWN — and it stops at BUILT-NOT-PROVED, because owned evidence cannot size demand. */
      7: [
        Object.freeze({
          from: "NOT-STARTED",
          to: "BUILT-NOT-PROVED",
          kind: "work",
          route: "BUILT",
          test: "node bin/market-measurement.mjs --check · node --test test/market-measurement.test.mjs · runs/discovery/market-measurement-2026-09-15.json · runs/audit/row7-red-limbs-2026-09-15.txt",
          date: "2026-09-15",
          reason: "VISIBILITY/REACH measured (impressions, position, clicks, CTR by property, country and page) and DEMAND bounded by a distinct method on the query field alone (at least 329 wordings searched; magnitude UNKNOWN), each quoting its range and dataState and carrying query truncation (22.8% of impressions, 0 of 20 clicks carry a query), data lag and dataState on its face; SUPPLY, AUDIENCE/NEED and WORTHINESS UNKNOWN; each limb RED alone. Stops at BUILT-NOT-PROVED: DEMAND cannot be sized on owned evidence",
        }),
      ],
    })[id] ?? []),
  ])])),
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
  /* Items 47 and 53 — each run against its frozen boundary on 13 September 2026. WORK moves: each
   * test was run and passed, and each was RED-proved by removing what it tests. No boundary changed. */
  47: Object.freeze([
    Object.freeze({
      from: "NOT-STARTED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node --test test/paid-provider-controls.test.mjs · node bin/paid-provider-controls.mjs --confirm",
      date: "2026-09-13",
      reason: "the four paid-provider controls built against a FAKE provider and each refused a call before it was made — off by default, explicit authorization, kill switch, budget and cap; each RED-proved; five refusals recorded in the cost ledger as REFUSED with their reasons",
    }),
  ]),
  53: Object.freeze([
    Object.freeze({
      from: "BUILT-NOT-PROVED",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "TEST_RUN",
      test: "node --test test/portability-neutral-product.test.mjs · node bin/facts.mjs census --product=neutral-test-ferments",
      date: "2026-09-13",
      reason: "a neutral declared test product run through the generic core with no first-product knowledge (no module or file of the first product loaded or read), and the first product's private records, licence terms and gaps proved not to cross during that same run; both halves RED-proved",
    }),
  ]),
  /* Item 56 — VERIFIED BY THE OWNER, 13 September 2026. The owner's ruling (§4) makes
   * item 56 an owner-verification item: its test is the owner's own look at the report,
   * and only a dated record of that look may set it (OWNER_VERIFIED_ITEMS). A WORK move —
   * the test was sat — and no boundary changed. */
  56: Object.freeze([
    Object.freeze({
      from: "BLOCKED-UNKNOWN",
      to: "VERIFIED-PASS",
      kind: "work",
      route: "OWNER_VERIFICATION",
      date: "2026-09-13",
      record: "runs/owner-verification/item-56-2026-09-13/owner-verification.json",
      test: "the owner's visual check of runs/report/index.html · test/item-56-owner-verification.test.mjs",
      reason: "the owner looked at the report and verified it against his own criteria — critical information readable, workflow understandable, controls and links usable, no clipping, overlap or broken critical view; four screenshots committed; the cost ledger's horizontal scroll was raised and ruled not clipping",
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
    /* 🔴 Rule 1's first route (13 September 2026): the population the boundary names now exists — real records leaving UNKNOWN — and the guard was re-run over it in both directions. No boundary changed; the owner's un-park ruling supplied the input. */
    Object.freeze({ from: "FAILED", to: "VERIFIED-PASS", kind: "work", route: "RETEST_PASSED", date: "2026-09-13",
      test: "node --test test/item-50-real-transitions.test.mjs · node bin/facts.mjs validate --product=<the first product> · node tools/forbidden-text-census.mjs",
      reason: "four real records put to the F24 guard leaving UNKNOWN: two with sufficient evidence advanced on a new measurement, two with insufficient evidence were refused and stay UNKNOWN with their reasons; both directions RED-proved" }),
    /* 🔴 REOPENED (13 September 2026) — the tick #63 recorded is withdrawn. A label was wrong on a real record, which is the FAILURE
     * clause word for word; the reopen names concrete contradictory evidence, so it is a WORK move, not a ruling. */
    Object.freeze({ from: "VERIFIED-PASS", to: "FAILED", kind: "work", route: "REOPENED", reopenReason: "CONCRETE_CONTRADICTORY_EVIDENCE", date: "2026-09-13",
      evidence: [
        "the first product's writing record: its value states six claims; its verdict confirmed three; it was stored VERIFIED with elementsNotFound 0 (E-BG-6)",
        "src/evidence/verdict.mjs as merged in #63: the guard read elementsNotFound from the verdict itself, so a supplied 0 advanced a partly confirmed record (D-GUARD-1)",
      ],
      reason: "a label is absent or wrong — item 50's FAILURE condition — met on a real record the guard had advanced; the record corrected to UNKNOWN and the guard made to reconcile declared elements instead of trusting a count" }),
  ]),
  51: Object.freeze([
    Object.freeze({ from: "BUILT-NOT-PROVED", to: "TESTABLE-NOW", kind: "work", route: "INPUT_EXISTS", date: "2026-09-13",
      input: "three real recommendations in runs/audit/recommendations.jsonl",
      reason: "a real recommendation exists" }),
    Object.freeze({ from: "TESTABLE-NOW", to: "FAILED", kind: "work", route: "TEST_RUN", date: "2026-09-13",
      test: "test/queue-rescan.test.mjs (item 51)",
      reason: "FAILURE met: priority, confidence and cost are missing on all three, and the real report renders none of the six" }),
    /* 🔴 Rule 1's first route (13 September 2026, later): the three fields built from stored evidence, the test re-run and passed. */
    Object.freeze({ from: "FAILED", to: "VERIFIED-PASS", kind: "work", route: "RETEST_PASSED", date: "2026-09-13",
      test: "node bin/link-recommendation-evidence.mjs · node bin/report.mjs --confirm · test/recommendation-fields.test.mjs",
      reason: "priority, confidence and cost each computed from stored evidence and each able to say UNKNOWN — two recommendations ranked by measured impressions, one UNKNOWN; confidence derived on all three; cost UNKNOWN on all three with lower bounds — and all six visible on the real report" }),
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

/**
 * 🔴 SINCE 13 SEPTEMBER 2026 THE OWNER'S WORDING GOVERNS THE FIVE GROUNDS.
 *
 * `OWNER_RULING_2026-09-13_COMPLETION_LAW.md` §6 names them in his own sentence.
 * Compared word for word with the checklist sentence above, TWO GROUNDS DIFFER:
 *
 *   checklist "new authoritative evidence"      → his "authoritative requirement change"
 *   checklist "a security/data-safety risk"     → his "safety/data risk"
 *
 * The other three are the same words. His ruling says HOW the path to done is
 * walked, and reopening a closed item is part of that walk — so HIS WORDING WINS,
 * and the enum below is his five. The checklist's sentence stays quoted above as
 * the text it replaced; a test holds each to its own document.
 */
export const OWNER_REOPEN_RULE_TEXT =
  "Closed item ko dobara sirf concrete contradictory evidence, real regression, authoritative requirement change, safety/data risk, ya owner-approved scope change par kholo.";
export const REOPEN_REASONS = Object.freeze([
  "CONCRETE_CONTRADICTORY_EVIDENCE",
  "REAL_REGRESSION",
  "AUTHORITATIVE_REQUIREMENT_CHANGE",
  "SAFETY_OR_DATA_RISK",
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
/**
 * 🔴 ITEM 56 IS THE OWNER'S EYE — NO AUTOMATED RUN MAY EVER SET IT.
 *
 * The owner's ruling of 13 September 2026, §4: "Owner visual check ke baad hi Item
 * 56 ko VERIFIED-PASS mark karo. Automated GREEN is owner-eye requirement ko
 * replace nahi karta." So a row in this list reaches VERIFIED-PASS by exactly one
 * route, OWNER_VERIFICATION, carrying a date and the path of a committed owner
 * verification record — and the record itself is read and must be the owner's, for
 * this item, on that date, with its screenshots. The route belongs to these rows
 * only, so no other row can borrow it to tick.
 */
export const OWNER_VERIFIED_ITEMS = Object.freeze([56]);

const REPO_ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export function readOwnerVerificationRecord(path) {
  try {
    return JSON.parse(readFileSync(`${REPO_ROOT}${path}`, "utf8"));
  } catch {
    return null;
  }
}

function ownerVerification(id, step, to, readRecord) {
  const errors = [];
  if (step?.route === "OWNER_VERIFICATION" && !OWNER_VERIFIED_ITEMS.includes(id)) {
    errors.push(`item ${id}: route OWNER_VERIFICATION belongs only to ${OWNER_VERIFIED_ITEMS.join(", ")} — no other row may borrow the owner's eye to tick`);
  }
  if (!OWNER_VERIFIED_ITEMS.includes(id) || to !== "VERIFIED-PASS") return errors;
  if (step?.route !== "OWNER_VERIFICATION") {
    errors.push(
      `item ${id}: reaches VERIFIED-PASS by ${step ? `route ${step.route}` : "no declared route"} — only a dated owner verification record can set it. ` +
        "No automated run may (owner ruling of 13 September 2026, §4).",
    );
    return errors;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(step.date ?? "") || typeof step.record !== "string" || step.record === "") {
    errors.push(`item ${id}: an OWNER_VERIFICATION move must carry a date and a record path`);
    return errors;
  }
  const rec = readRecord(step.record);
  if (!rec || rec.record_type !== "owner_verification" || rec.verifiedBy !== "owner" || rec.item !== id || rec.date !== step.date || !Array.isArray(rec.screenshots) || rec.screenshots.length === 0) {
    errors.push(`item ${id}: ${step.record} is not an owner verification record of item ${id} dated ${step.date} with its screenshots`);
  }
  return errors;
}

export function assertTransitions(rows, before = BEFORE_AMENDMENT_2, moves = MOVES_AMENDMENT_2, readRecord = readOwnerVerificationRecord) {
  const errors = [];
  for (const r of Object.values(rows)) {
    const chain = moves[r.id] ?? [];
    let at = before[r.id] ?? ADMITTED_ROWS[r.id]?.arrivedAs;
    if (at === undefined) {
      errors.push(`item ${r.id}: is neither one of the frozen 58 nor a row admitted by a recorded owner ruling — a row never appears silently`);
      continue;
    }
    if (chain.length === 0 && at !== r.state) errors.push(...ownerVerification(r.id, null, r.state, readRecord));
    for (const step of chain) {
      errors.push(...ownerVerification(r.id, step, step.to, readRecord));
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
    `item ${id}: loses VERIFIED-PASS for ${to} by ${step ? `route ${step.route}` : "no declared route"}. "${OWNER_REOPEN_RULE_TEXT}" ` +
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
 * The class-`D` rows are generated rather than typed out, because typing 23
 * near-identical justifications invites one of them to drift into a claim.
 *
 * 🔴 WHICH rows are D is READ from the class in force (PASS_BOUNDARIES_SOURCE.md
 * §6 as amended by Amendment 4), no longer typed as a list of ids. The typed list
 * was 28 long and would have kept rows 3–7 DEFERRED after the owner opened them —
 * a list that agrees with a ruling only until the ruling changes.
 */
const A4_STATIC = "🔴 **NOT-STARTED — IN SCOPE SINCE AMENDMENT 4** (owner ruling under §12, 13 September 2026). **Nothing has been built for it and nothing was run.** It left DEFERRED ONLY because a ruling changed its class — a class change is not progress. Its input is owned evidence already captured in `runs/evidence/evidence.jsonl` (Search Console ingest of 2026-09-12T23:25Z: query 337 · query-page 574 · country 126 · country-query 388 rows; page rows 1,525 from the 22:06Z run of the same day).";
const A4_HALF_CONTRACT = "🔴 **The owned half has its four-part contract** — stated by the owner's dated addendum to Amendment 4 (13 September 2026), and read from it. **A contract is not progress:** nothing is built and nothing was run, so the row stays NOT-STARTED. The §6 boundary stays on the row as the final boundary for when the deferred half opens.";

const EXPLICIT = {
  3: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/search-language.mjs --check · node --test test/search-language.test.mjs · runs/discovery/search-language-2026-09-15.json · runs/audit/row3-census-2026-09-15.txt · runs/audit/row3-red-limbs-2026-09-15.txt",
    why: "🔴 **THE OWNED HALF, RUN AGAINST ITS BOUNDARY ON 15 SEPTEMBER 2026 — AND PASSED.** **INPUT** the three owned Search Console pulls, each with its ingest date and the store's own row count: query `45ce21253a3fc58c` (2026-09-12T23:25:03.868Z, 337 rows), query×page `c97334fdd102df8e` (23:25:04.172Z, 574), country×query `9bf50cfb134a0d7d` (23:25:04.608Z, 388); the 8 search-operator strings are an engine's instruction, kept out of people's wording and counted. **EXPECTED met:** 329 pieces of real wording stored (runs/discovery/search-language-2026-09-15.json), each with a pointer to every owned row it came from — observation id, ingest date, row — and every kind DISCOVERED FROM THE EVIDENCE, never read from the hand-written row-5 lexicon (a test fails the build if the discovery module names it, by import or by path string): LONG_TAIL 207 · SYNONYM 26 · ABBREVIATION 17 · LOCAL 53 · **UNCLASSIFIED 106**. Discovered: 7 synonyms (e.g. equivalent↔score, 5 query pairs landing on one page), 3 abbreviations (cv = curriculum vitae, nz = new zealand, pte = pearson test of english), 10 local words, 8 variant forms; no keyword becomes a URL. **FAILURE not met — each limb RED-proved alone in the real files and restored by sha256** (runs/audit/row3-red-limbs-2026-09-15.txt): wording normalised (one accent stripped from a stored original — lower-casing could not land, as no owned query holds an uppercase letter), untraceable (a stored pointer to an observation the store does not hold), a keyword turned into a route (the keyword→URL census over src/ and bin/), and the discovery module naming the lexicon by a bare path string. **EVIDENCE:** the stored records; the held-out sample (61 of 329, by hash, fixed before any rule) re-read from the raw store text resolves 61 of 61 byte for byte and completely — a TRACEABILITY check, not row 5's generalisation test; and the census proving no code path takes a stored keyword to a URL. 🔴 **Limits, on the row:** a SYNONYM is interchangeable use in the same query frame for the same page, not proof of the same meaning — daily↔life passes the rule; the abbreviation rule gained one constraint after its first run (a short form cannot stand for an expansion whose own words sit in the same query), which removed a false is = ielts score; LOCAL rests on the searcher's country, and only 32 of 329 queries have more than one country row; the census reads code, so it cannot see a page written by hand, wording copied out of the records, a consumer outside src/ and bin/, a computed import, or a path held only as text and run by another module. **Measured against the hand-written lexicon afterwards, never tuned:** the evidence yields 6 pairs the lexicon never named; the lexicon claims 103 of its 115 pairs — 11 of its 17 groups — that the owned evidence does not support. **Class S: the PUBLIC half stays DEFERRED** — legitimate public search evidence needs an external fetch no one has authorised",
  },
  4: {
    state: "BUILT-NOT-PROVED",
    changeKind: "work",
    test: "node bin/localized-thinking.mjs --check · node --test test/localized-thinking.test.mjs · runs/discovery/localized-thinking-2026-09-15.json · runs/audit/row4-census-2026-09-15.txt · runs/audit/row4-red-limbs-2026-09-15.txt — and, to leave BUILT-NOT-PROVED, per-value answer evidence the owner authorises, with half (b) of FAILURE run on it",
    why: "🔴 **BUILT AND RUN ON OWNED EVIDENCE, 15 SEPTEMBER 2026 — AND STOPPED AT BUILT-NOT-PROVED, BECAUSE HALF OF ITS FAILURE CLAUSE CANNOT BE TESTED ON WHAT THE STORE HOLDS.** **INPUT** the country×query pull `9bf50cfb134a0d7d` (2026-09-12T23:25:04.608Z): 388 rows = 379 human + 9 operator; 337 query strings, 33 seen from two or more countries — 32 human and 1 operator string (from arg and bra), kept out and counted; 49 countries over all rows, 48 once the operator rows are out. **Built on row 3, not row 5:** two wordings are one goal only when row 3's discovered relations link them (VERIFIED-PASS, earned from the evidence) — 19 SYNONYM, 1 ABBREVIATION and 10 VARIANT links; row 5's clusters (FAILED) are not read, and a test fails the build if the module's import closure reaches them. The grouping rule gained one constraint after its first run: a row-3 ABBREVIATION pair joins two wordings only in the same frame — 13 pairs sharing only a landing page were refused, after one joined \"i don t have a cv\" to \"how to write a curriculum vitae with no experience\". **EXPECTED — local PHRASING researched:** 37 goals seen from two or more countries — **12 worded differently** (e.g. \"daily habits\" can,gbr,hkg,ind,qat,usa beside \"life habits\" usa; \"good daily habits\" aus,can,gbr beside \"best daily habits\" ind and \"best life habits\" usa; \"pte result\" aus,can beside \"pte results\" aus,gbr) and **25 the same wording in several countries**, kept apart because the same words in two places are not a goal expressed differently. \"daily lifestyle\" and \"personal habits\" are NOT joined to \"daily habits\": row 3's evidence does not link them. Every wording keeps its original bytes, its country and its source row, observation id and ingest date (runs/discovery/localized-thinking-2026-09-15.json). **Thin evidence:** a floor of 5 human rows (row 6's locality floor) — 10 countries above it, **38 UNKNOWN** (19 with a single row), never 'no local difference'; a wording not seen from a country is UNKNOWN there. 🔴 **Local REASONING is not observable in query rows** — only phrasing is. **FAILURE (a), a country multiplying URLs — not met:** the country→URL census finds no consumer of the module building a URL-shaped value. **FAILURE (b), without evidence of materially different useful content — 🔴 BLOCKED, NOT TESTED:** the answer at each country is not in the store, and a different question is not a different answer (row 6's finding that the question mix differs in all 10 countries with five or more rows is NOT used as evidence here). **Unblocked by:** per-value answer evidence — the useful answer at each country compared, from a source that is not our own page (row 7 SUPPLY or row 2, both deferred) — the owner's pending decision. **EVIDENCE** each limb RED alone in the real files, containment proved first, restored by sha256 and against the git index (runs/audit/row4-red-limbs-2026-09-15.txt): a wording recorded from the wrong country, a one-row country recorded as 'no local difference', a goal joined by hand, half (b) recorded as PASS, the runner building an address from a country, and the module naming row 5's clusterer. 🔴 **What the census cannot see:** a page written by hand, countries or wording copied out of the records, a consumer outside src/ and bin/, a computed import, a path held only as text and run by another module — and, **above all, the connected products' own pages: origin is ALREADY hard-coded into 775 of the 1,525 pages in the page rows (1,179 impressions), on 2 supporting queries, with our pages differing only by origin overlapping at median 0.806 (23 pairs, row 6). That is a country-like axis already multiplying pages without evidence, and no census of this engine's code can see it.** Row 3 stays VERIFIED-PASS, row 5 FAILED and row 6 BUILT-NOT-PROVED; nothing here is evidence for them",
  },
  5: {
    state: "FAILED",
    changeKind: "work",
    test: "node bin/intent-clusters.mjs --check · node --test test/intent-clustering.test.mjs · runs/audit/row5-census-2026-09-14.txt · runs/audit/row5-red-limbs-2026-09-14.txt",
    failureMet: "identical intents stay split — on the held-out check the EVIDENCE clause names, 12 of 61 held-out queries were left in a new cluster although their intent had in-sample members, each on a word the frozen lexicon never saw",
    why: "🔴 **RUN AGAINST ITS FROZEN BOUNDARY ON 14 SEPTEMBER 2026 — AND ITS FAILURE CONDITION IS MET, ON THE HELD-OUT CHECK ITS OWN EVIDENCE CLAUSE NAMES.** **INPUT** the Search Console query pull `45ce21253a3fc58c` (2026-09-12T23:25:03.868Z, 337 rows). 8 are search-operator strings, classified and kept out of the human population, not dropped: 4 SITE_INSPECTION of the estate's own hosts, 3 EXCLUSION_LIST_MONITOR (one fixed exclusion list of 11 social and review platforms appended to three unrelated terms — an automated monitoring or scraping tool, inferred from form), 1 EXACT_PHRASE_LOOKUP. **329 human queries.** **EXPECTED — met in-sample:** a generic clusterer (its subject words in config/discovery/intent-lexicon.mjs, none taken from a held-out query) groups the 268 in-sample queries into 73 clusters with **0 distinct intents merged and 0 identical intents split** against a reference placement written before it ran (75 intents; 6 ambiguous, scored in neither direction; 2 later amendments, each citing the rule the original broke — the first-written file kept byte for byte). Every member keeps its store wording byte for byte; a number, a year or an occupation inside a question is recorded as a slot value under an explicit ruling, never left to a threshold. **FAILURE — met on the held-out fifth:** of 61 held-out queries, 49 landed where the reference puts them and **12 identical intents stayed split** — each left NEW on a word the frozen lexicon never saw (neurologist, cardiology, psychologist, business intelligence, points, table, comparison, nz residency, architecture, students, your, speaking/mock); **0 joined a wrong intent**. **EVIDENCE** the census and six limbs — merged, split, wording lost, held-out unrun, operator counted as human, a held-out lexicon word — each RED alone in the real files and restored by sha256. FAILED on the owner's answer, 14 September 2026. 🔴 **Limits:** the reference is a model's judgement standing in for a human's and is not owner-verified; clustering proves wordings group together, never that a group is the intent a real person had — that needs row 2 (DEFERRED). **Leaves FAILED** by the held-out check re-run and passing, or an owner ruling",
  },
  6: {
    state: "BUILT-NOT-PROVED",
    changeKind: "work",
    test: "node bin/axis-discovery.mjs --check · node --test test/axis-discovery.test.mjs · runs/audit/row6-census-2026-09-14.txt · runs/audit/row6-red-limbs-2026-09-14.txt — and, to leave BUILT-NOT-PROVED, per-value answer evidence the owner authorises, with the row re-run",
    why: "🔴 **BUILT AND RUN ON THE SUBJECT'S REAL EVIDENCE, 14 SEPTEMBER 2026 — AND STOPPED AT BUILT-NOT-PROVED ON THE OWNER'S ANSWER, BECAUSE NO AXIS CAN BE ACCEPTED OR REJECTED ON OWNED EVIDENCE.** **INPUT** row 5's intent record (329 human queries); the country×query pull `9bf50cfb134a0d7d` (388 rows = 379 human + 9 operator — **48** searcher countries once the operator rows are out); the page-rows pull (1,525 pages); 394 archived page bodies. **EXPECTED — discovered and tested, not assumed:** the six axes the contract names, READ from its own EXPECTED clause (origin/destination tested as its two directions), and 7 slot types the evidence carried that none of them claims — each with seven legs, every leg with a state and a basis. **Verdicts: 7 MONITOR · 7 UNKNOWN · 0 BUILD · 0 REJECT.** **the licensed-occupation axis (the first the contract names) UNKNOWN** — 3 human queries, each naming one licensed occupation, yet declared by hand as the connected product's axis and hard-coded on 89 pages. **role MONITOR** — 28 queries over 28 values, each seen once; our pages differing only by occupation overlap at median 0.561 (474 pairs). **stage MONITOR** — 64 queries, 7 values. **origin UNKNOWN** — 2 queries naming one nationality, yet hard-coded into 775 of the 1,525 pages (1,179 impressions), and our pages differing only by origin overlap at median 0.806 (23 pairs). **destination MONITOR** — 12 queries over 10 values, 80% seen once. **language MONITOR** — 8 queries (es 5, it 3). **locality MONITOR** — the question mix differs from the rest in all 10 countries with five or more rows (aus, usa, gbr and ind at p ≈ 0.001), and the other 38 countries are UNKNOWN by LAW-ABSENT-1, never 'no power'. Discovered: the score number (65 queries, 38 values) and the test variant MONITOR; year, budget, purpose, field and skill UNKNOWN. **Why none is BUILD or REJECT:** answer-level distinguishing power, evidence availability and human-value delta are UNKNOWN on every axis — the answer at each value is not in the store (row 7's SUPPLY and row 2 are deferred), and all 337 query rows carry 0 clicks. **FAILURE not met by this row:** it adopts no axis without a measurement — it adopts none; the axes the estate already hard-codes are reported beside their evidence, not endorsed. **EVIDENCE** the census and six sabotages over five limbs (accepted unmeasured, rejected on thin evidence — per axis and per country, a named axis untested, an inconsistent verdict, a leg with no basis), each RED alone in the real files and restored by sha256; and controls showing BUILD and REJECT ARE reachable when their measurement exists. 🔴 **Why not VERIFIED-PASS:** its EVIDENCE clause asks for the evidence behind each accepted axis and each rejected one, and both populations are EMPTY — a law seen only to refuse has not been seen to decide. BUILT-NOT-PROVED on the owner's answer, 14 September 2026",
  },
  7: {
    state: "BUILT-NOT-PROVED",
    changeKind: "work",
    test: "node bin/market-measurement.mjs --check · node --test test/market-measurement.test.mjs · runs/discovery/market-measurement-2026-09-15.json · runs/audit/row7-census-2026-09-15.txt · runs/audit/row7-red-limbs-2026-09-15.txt — and, to leave BUILT-NOT-PROVED, an owner ruling that a presence bound with its magnitude UNKNOWN is what \"DEMAND measured\" asks of owned evidence, or a demand-magnitude source the owner authorises",
    why: "🔴 **THE OWNED HALF, BUILT AND RUN ON 15 SEPTEMBER 2026 — AND STOPPED AT BUILT-NOT-PROVED, BECAUSE DEMAND CAN ONLY BE BOUNDED ON OWNED EVIDENCE, NEVER SIZED.** **INPUT** the newest owned pull of each cut, all over 2026-08-15 → 2026-09-12, dataState COMPLETE, quoted from each observation: the property total `8c5f987dc5074cd5` 2,374 impressions · 20 clicks; by country `59535dbde94fbacd` 126 rows · 2,374 · 20; by page `9f8cbf772d1cd434` 1,525 rows · 3,289 · 21 (exhausted and truncationReason NOT STORED on that pull); by query `45ce21253a3fc58c` 337 rows · 541 · 0; country×query `9bf50cfb134a0d7d` 388 rows · 541 · 0; query×page `c97334fdd102df8e` 574 rows · 807 · 0. **VISIBILITY/REACH — MEASURED** by its own method (impressions, position, clicks, CTR, where shown): property position 36.07; by country and by page side by side, never summed; position by page NOT STORED. **DEMAND — BOUNDED, PRESENCE ONLY, MAGNITUDE UNKNOWN** by a distinct method that reads the `query` field alone: at least 329 distinct human wordings (8 operator strings excluded) were each searched at least once; how many people searched is not in the owned evidence, and a need the property was never shown for cannot appear — demand seen through our own visibility. Impressions are not an input to it. **The two methods share no stored field.** 🔴 **Query truncation, on both faces:** truncationReason reads null on every query pull — the pager drained every row, not every search was reported: only 541 of 2,374 impressions (22.8%) and 0 of 20 clicks carry a query (by page, 807 of 3,289 — 24.5% — and 0 of 21). The 16.4% often quoted divides a count without the page dimension by one with it. **OBSERVED / INFERRED kept apart:** that the missing queries are Google's anonymisation is UNKNOWN — the store holds the gap, not its cause. **The 807-vs-541 discrepancy is LOCALISED, NOT CLOSED:** 324 of 337 queries agree; all 266 excess impressions sit on 13 queries shown with more than one of our pages; a finer cut never loses impressions; the same gap separates page (3,289) from property (2,374). That a page-dimension pull counts once per page shown is INFERRED — the request named no aggregationType and no stored field records Google's counting. **Data lag, observed:** the range ends on the day it was pulled, and the same range grew from 2,261 to 2,374 impressions in 23.2 hours; whether it is final is UNKNOWN. dataState COMPLETE is the pager's word, not freshness. **The other three read UNKNOWN** — present, unmeasured, valueless, never low. Deferred, and named: **SUPPLY**, **AUDIENCE/NEED** and **WORTHINESS**. SUPPLY and AUDIENCE/NEED need external evidence; **WORTHINESS was assigned to the deferred half by the owner's addendum** (13 September 2026), on the reason that its inputs are themselves deferred. **FAILURE not met:** not conflated, no impressions as demand, no deferred dimension filled. **EVIDENCE** the EVIDENCE clause's test — a third dimension filled from an unmeasured source — RED-proved in the code that builds the measurement, once per dimension (SUPPLY from our own page count, AUDIENCE/NEED from the searcher-country mix, WORTHINESS defaulted to LOW behind an UNKNOWN label), and impressions-as-demand, a conflated method and an inference promoted to OBSERVED in the stored measurement — each RED alone, containment proved first, restored by sha256 and against the git index (runs/audit/row7-red-limbs-2026-09-15.txt). 🔴 **A finding for the owner, reported and not acted on:** rows 3, 5 and 6 stand on the query pull — 22.8% of impressions and 0 of 20 clicks; row 6 names the 0 clicks, none of the three names the coverage. No row was changed by row 7. **Class S: the deferred half stays DEFERRED**",
  },
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
    label: "BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE",
    changeKind: "work",
    ruling: "OWNER_RULING_2026-09-13_COMPLETION_LAW.md §3 — verify what Search Console and owned evidence can prove; record the rest BLOCKED/UNKNOWN BY EXTERNAL PREREQUISITE; do not fabricate, infer or expand scope; do not touch a connected product to turn a checklist green",
    missingEvidence: "a downstream outcome tied to a search — any stored record joining a product outcome (a signup, a purchase, a completed step) to the search query, landing page or search source that brought the visitor",
    blocker: "no analytics package in any of the 36 product repositories (0 of 36 product repositories use one); the one first-party funnel-event table in the estate holds page path and user id but NO SEARCH SOURCE; and this engine cannot read product databases — its only credential is Search Console webmasters.readonly, and Search Console has no outcome dimension",
    unlockCondition: "the seventh dimension becomes measurable when ALL THREE are true: (1) a connected product stores, for each downstream outcome, the search source that brought it — at least the landing page and a search referrer or campaign marker — with a date; (2) the owner authorises this engine in writing to READ that store read-only, and supplies the credential the way the Search Console key was supplied; (3) that instrumentation was built by the product's own work under its own brief, never by this engine and never to turn this row green. THEN: ingest downstream outcomes with row counts, request counts, bounds and dataState exactly as the other six dimensions were, and sit item 9's test again against its unchanged boundary",
    ownerSentence: "Yeh status AlmiVisibility ki machinery ki automatic failure declaration nahi hai.",
    why: "🔴 **BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE — the owner's ruling of 13 September 2026, §3, applied as written.** This is NOT the machinery declaring failure: Six of seven dimensions are ingested and complete — queries, pages, countries, impressions, clicks and CTR, each pull exhausted with dataState COMPLETE and its bounds printed. The seventh, downstream outcomes, needs evidence that exists only inside a connected product, and the ruling forbids fabricating it, inferring it, expanding scope for it, or touching a product to get it. The exact MISSING EVIDENCE, BLOCKER and FUTURE UNLOCK CONDITION are on this row",
    whyMeasured: "🔴 **SIX OF SEVEN DIMENSIONS ARE INGESTED FROM THE REAL PROPERTY; THE SEVENTH IS BLOCKED; IT DOES NOT TICK.** On 12 September 2026 (night) the owner supplied the read-only key and the country pulls ran: **country** 126 rows and **country×query** 388 rows, each ONE request, exhausted, dataState COMPLETE, bounds rowLimitPerRequest=25000 / maxRequests=20, cost ZERO_BY_TARIFF. Queries (337), pages (1,525), impressions, clicks and CTR re-ingested in the same run, all COMPLETE. **DOWNSTREAM OUTCOMES** is not measurable by any tool this engine holds: Search Console has no outcome dimension; the credential is webmasters.readonly; 0 of 36 product repositories use an analytics package; the one first-party funnel-event table stores a path and a user id and no search source; and this engine may read no product database. The ruling's NOTE makes a dimension no tool can supply ⚠ — so the honest state is **BLOCKED-UNKNOWN, not FAILED** (every suppliable dimension was ingested and none claims a completeness it cannot show) and **not VERIFIED-PASS** (six of seven is not seven). The country distribution is recorded as measurement only and passes item 8's guard",
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
    afterRemainingPopulation: "13 September 2026, evening (item 50, beta-g demotion): MEASURED 16 verified facts, down from 25 morning and from 33 before that — the 9 whose verdicts named their elements but did not name the qualifier / list-completeness / binding-party were demoted under owner steer. The row does not move: the loop the row's evidence describes still runs on the 16 verified facts, and the real pair used to prove leg (iii) still exists as two records that differ by value even though one side is now UNKNOWN — the pair test asserts existence and value inequality, not verification state, and the leg's cache mechanism refuses out-of-scope hits on records-in-cache, not on verification state. If the owner rules this leg needs both sides of the pair VERIFIED, item 15 would move; the ruling brief lives in _handoffs/",
    after13Sep: "13 September 2026 (item 50): MEASURED 33 verified facts, not 32 — one record left UNKNOWN through the reconciled guard (the licence record); a second that #63 counted as verified (the writing record) was reopened and corrected to UNKNOWN, because its verdict confirmed three of its six elements. The loop the row's evidence describes is unchanged, and the row does not move — it was already VERIFIED-PASS",
    why: "the whole loop demonstrated end to end on the 32 REAL verified facts, **no leg fixture-only**. **(i) stored once** — one fact requested three times reaches the source 0 times, and a miss is memoised so it is researched once, not repeatedly. **(ii) reused within scope and window** — all 32 hit today, each returning its own record. **(iii) refused outside scope**, proved on a REAL PAIR: two regulators in different jurisdictions publish a minimum grade for the same qualification, and holding only one of them, a question about the other MISSES and hands back nothing. The two values genuinely differ, so a candidate given the wrong one would prepare to the wrong threshold. The same refusal holds across scopes within a jurisdiction. **(iv) expires on schedule** — each of the 32 goes STALE the day after its own recorded recheck date (earliest 2026-12-11, latest 2027-03-11), for that reason and not down the old extractedOn path; 0 of 32 are served once every date has passed. Four sabotages, each landing in the intended test. 🔴 The real pair is NAMED IN THE TEST, not here: the engine may not know which product it serves",
  },
  16: {
    state: "BUILT-NOT-PROVED",
    afterRemainingPopulation: "13 September 2026 (item 50, morning then evening): nothing changes for this row. Its six real conflicts are untouched and still invisible to the detector (D-FACT-1); of the 8 records returned to UNKNOWN in the morning plus the 9 demoted in the evening, none is past its recheck date, and among the 16 still VERIFIED the earliest recheck still falls due 2026-12-11 — so no real fact is stale, and the freshness half still has no real stale population to fire on",
    why: "🔴 THE EVIDENCE CLAUSE DEMANDS 'THE DETECTOR FIRING ON REAL DATA', AND IT CANNOT. Six real conflicts exist and detectConflicts returns 0 on all six (D-FACT-1): it compares records we hold, and every real conflict is registry-versus-a-second-official-page. No real fact is past its recheck date either — the earliest falls due 2026-12-11",
  },
  17: {
    state: "BUILT-NOT-PROVED",
    why: "🔴 **BUILT-NOT-PROVED — THE CAPABILITY IS COMPLETE; ITS INPUT DOES NOT EXIST.** Built and tested since 12 September 2026: `makeDerivedFact` stores a re-executable formula from the frozen `FORMULAS` table with every input's fact_id and value, and refuses a derived fact more verified than its weakest input; `recomputeDerived` reports a mismatch as a finding, never a repair; `markForReview` walks dependents transitively. **The three real gaps closed 14 September 2026:** a derived record lives in the registry as kind `derived` — F28 judges its own shape and waives the source laws for it alone, F29 holds it to the records it cites (every input resolves, its standing IS its weakest input's, its value is its formula's over the inputs as they stand) — with every primary law unchanged; a changed stored input value raises INPUT_CHANGED with no caller naming a fact (`detectInputChanges` → `reviewChangedInputs`); and the derivation reads no clock, so the same derivation is byte-identical. Each RED alone in the real files, restored and hash-checked (runs/audit/row17-gaps-red-limbs-2026-09-14.txt). **Not proved — its INPUT, a real derived fact with real inputs, does not exist: 0 of 46 registry records are derived**, so nothing was recomputed, and none was added to exercise the code. ⚠️ **The blocker is not missing capability:** the Pakistan origin regulator fact file itself calls the foreign/domestic verification-fee comparison (Rs.10,000 against Rs.1,000) *the fact a reader actually needs*. Whether to hold it as a derived fact is the owner's decision — no page uses it today, and from two UNKNOWN inputs it could only ever be UNKNOWN",
  },
  25: {
    state: "TESTABLE-NOW",
    changeKind: "work",
    attemptCount: 1,
    lastAttempt: "2026-09-13",
    gap: "verified-fact presence finds 0 verified facts on all 389 existing pages, so source integrity — measured on all 15 cited sources, 15 LIVE — can be reported for NO existing page; the only page carrying verified facts is one this engine generated from the registry, which cannot show the check sees facts on a page someone else wrote",
    test: "node bin/page-quality.mjs over an existing page set that includes pages known to state registry facts (a bounded capture of such pages needs the owner's green), with node bin/source-integrity.mjs's recorded run folded in per page · node --test test/existing-pages.test.mjs test/source-integrity.test.mjs",
    why: "🔴 **RUN 13 SEPTEMBER 2026 — ALL FOUR PARTS MEASURED, AND IT DOES NOT TICK, AND IT IS NOT FAILED.** **(1) UNIQUE VALUE — proved:** measured on 383 of the 389 existing pages with a served body (155 at or above 350 unique words after the page's shell, 228 below); 6 sub-site homes are UNMEASURABLE, each the only crawled page on its site, so no shell can be learned; firing fixture and clean control. **(2) SIBLING OVERLAP — proved:** MEASURED on 337 pages (243 within 0.40, 94 above); 52 pages sit alone in their template group (VACUOUS, never a pass). ⚠️ These are the numbers AFTER D-GATEA-1 was fixed on 13 September 2026 — the first attempt reported 122 / 327 / 10 UNMEASURABLE, because a group of one or two pages learned its shell from itself; the recorded first run is kept (runs/audit/item-25-page-quality-run-2026-09-13.txt) beside the re-run. **(3) VERIFIED-FACT PRESENCE — measured, no real positive:** 0 of 389 existing pages carry a verified fact; the rule fires on real registry values on a page this engine GENERATED (14 present), which is a control and never an existing page. **(4) SOURCE INTEGRITY — measured live, per source, not per page:** the owner-authorised link check requested 18 of a hard cap of 40, 1/s, external hosts only, HEAD first — all 15 cited sources LIVE, 0 GONE, 0 UNKNOWN, 0 disagreements with beta-g's 12 September reading (the exam provider's site answered HEAD with 200 where beta-g's fetcher got 403). But with no existing page carrying a fact, no page has a source to report. **EXPECTED** ('each measured and reported per page') is not met for part 4; **FAILURE** ('fixture-only or absent') is not met — every part ran on real data. So: TESTABLE-NOW, attempted once, gap named",
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
  36: {
    state: "BUILT-NOT-PROVED",
    test: "node --test test/owner-authorization-gates.test.mjs test/paid-provider-controls.test.mjs test/cost-governor.test.mjs test/product-isolation.test.mjs test/write-confinement.test.mjs test/gate-a.test.mjs · runs/audit/row36-destructive-red-2026-09-15.txt · runs/audit/row36-dcrw4-red-2026-09-15.txt — and, to tick, the one guard named below executed",
    why: "🔴 **RE-MEASURED AGAIN 15 SEPTEMBER 2026 (b5cc745): THE D-CRW-4 REFUSAL NOW RUNS — AND THE ROW STILL STAYS BUILT-NOT-PROVED, BECAUSE ONE NAMED GUARD CANNOT BE RUN TODAY.** **network · D-CRW-4 — executed:** test/owner-authorization-gates.test.mjs spawns bin/crawl.mjs --live WITHOUT --i-have-the-owners-green, with a seeds file holding only a 127.0.0.1 URL and --out/--corpus inside .test-scratch/; it asserts exit EXACTLY 3 (2 is the usage gate), the REFUSED message, and that it DID NOTHING — no scratch output created, runs/crawl/ and runs/cost/ledger.jsonl unchanged. The gate (:60-72) stands before the first network call (:81) and every write, measured. **RED-proved under containment** (runs/audit/row36-dcrw4-red-2026-09-15.txt): with the guard inverted the test went red on the no-write claim. 🔴 A loopback seeds file does NOT bound an inverted gate — the run reaches a third-party IPv6 egress probe (:81) and DNS lookups of every estate host (:86) BEFORE it reads its seeds (:134), and a live run appends to the cost ledger under runs/ (:259) — so the sabotaged run was confined by a preload refusing every non-loopback socket, DNS query, non-loopback fetch and runs/ write, proved on the real modules before any sabotage; it refused 55 external attempts, and the ledger's sha256 and runs/ were unchanged. The authorised path (a live crawl; D-CRW-4 was granted for ONE run, and it is spent) is not run. **What is still missing, exactly: ONE guard** — bin/archive-corpus.mjs's overwrite refusal is NOT SAFELY TESTABLE TODAY: its destination is hard-coded to the committed body archive under runs/ and the refusal sits behind --confirm and a full 394-body verification, so a test would aim a --confirm run at the live evidence; it needs an operator --out= first, in its own PR. **And the residue on production stays:** its guard runs only as the write law's permission function, because no production write path exists. The EVIDENCE clause asks for a test that runs EACH guard; one does not, so the row does not tick. ── EARLIER, 15 SEPTEMBER 2026 (11ba98d), KEPT: 🔴 **RE-MEASURED 15 SEPTEMBER 2026 ON main (11ba98d): FOUR CATEGORIES AND ONE DESTRUCTIVE GUARD EXECUTE A REFUSAL — AND THE ROW STAYS BUILT-NOT-PROVED, BECAUSE TWO NAMED GUARDS STILL DO NOT.** The 11 September verdict (\"exactly one runs today — the D-CRW-4 live-run refusal\") was wrong both ways: four categories now run, and the D-CRW-4 refusal is not among them. **paid** — test/paid-provider-controls.test.mjs drives the real gate: no authorization, incomplete authorization, the kill switch, the cap and the budget are each REFUSED before the provider is called, and every refusal is in the ledger. **large-scale** — test/cost-governor.test.mjs: the call that would exceed the cap throws before it is issued, the stop latches, and an injected runaway is hard-stopped at the run cap with exactly that many requests reaching the boundary. **cross-product** — test/product-isolation.test.mjs: every accessor refuses the other tenant's licences and gaps; test/write-confinement.test.mjs spawns bin/report.mjs --confirm aimed outside this repository and it refuses and creates nothing (an out-of-repository write in general, not a named product repository). **production** — test/gate-a.test.mjs executes the write law's permission function (--confirm alone, and ALLOW_PROD_WRITE=1 alone, each refused); 🔴 NO TEST ATTEMPTS A PRODUCTION WRITE, BECAUSE NO PRODUCTION WRITE PATH EXISTS — the guard runs as a function, never in front of a write. **destructive** — test/owner-authorization-gates.test.mjs spawns bin/replay-crawl.mjs --recover without --confirm at a scratch corpus: exit 2, REFUSED, every file intact byte for byte; RED-proved by inverting the guard in the real file, where the refused run deleted the scratch corpus and the test caught it (runs/audit/row36-destructive-red-2026-09-15.txt); its authorised half (a directory replace and a real artifact download) is deliberately not run. **What is still missing, exactly:** (1) bin/archive-corpus.mjs's overwrite refusal is real but NOT SAFELY TESTABLE TODAY — its destination is hard-coded to the committed body archive under runs/, and the refusal sits behind --confirm and a full verification of all 394 bodies, so a test would aim a --confirm run at the live evidence (an operator --out= would make it testable; not done here — it changes an evidence writer's interface and the write censuses); (2) the D-CRW-4 refusal — bin/crawl.mjs --live without --i-have-the-owners-green, exit 3 — is still asserted only as workflow YAML text and a static flag census; no test executes it. The EVIDENCE clause asks for a test that runs EACH guard; two do not run, so the row does not tick",
  },
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
  47: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node --test test/paid-provider-controls.test.mjs · node bin/paid-provider-controls.mjs --confirm",
    why: "🔴 **THE CONTROLS EXIST BEFORE THE THING THEY CONTROL.** No paid provider exists and absence is not a control, so the controls were built against a FAKE provider — a test double; no account was opened and no real provider was called. **INPUT** an attempt to use a paid provider with no authorization, no budget and no cap. **EXPECTED** refusal, and every control exercised: (1) OFF BY DEFAULT — a provider with no authorization is refused; (2) EXPLICIT AUTHORIZATION — only a named, per-provider, dated authorization with a reason, a budget and a cap authorizes anything; (3) KILL SWITCH — flipped by a named person with a reason and a time, the very next call is refused; (4) BUDGET AND CAP — the call that would exceed either is refused BEFORE it is made. A gate cannot be built without a kill switch or a ledger. **FAILURE not met** — no unauthorized call reached the provider, and neither a cap nor a kill switch can be absent. **EVIDENCE** one refusal test per control, each RED-proved by removing that control (runs/cost/paid-provider-controls-red-2026-09-13.txt), and the kill switch exercised in the recorded run, whose five refusals — one per code — are in runs/cost/ledger.jsonl as REFUSED with their reasons. ⚠️ Declared limit: the gate binds every call made THROUGH it; with no paid provider in existence there is no integration to census, and the day one is written its calls must go through the gate",
    whyBefore: "the ruling's NOTE is explicit: no paid provider exists, and ABSENCE IS NOT A CONTROL. The controls — authorization, budget/cap, kill switch — must exist before a provider does, and none is built",
  },
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
    test: "node --test test/item-50-real-transitions.test.mjs · node bin/facts.mjs validate --product=<the first product> · node tools/forbidden-text-census.mjs",
    remainingPopulation: "🔴 **13 SEPTEMBER 2026 EVENING — THE 9 THAT RESTED ON AN UNSETTLED READING WERE DEMOTED; AND ITEM 50 STAYS FAILED, ON A DIFFERENT REASON.** The 32 records that reached VERIFIED on 12 September without the guard each now declare their elements (keys from their own value text), carry a previous of never-checked, and name the keys their verdict's own words confirmed. F24–F27 now police 36 records: 25 advanced, 11 refused — 8 of the 32 returned to UNKNOWN / PARTIAL_EVIDENCE on 13 Sep morning with their verdict wording untouched. **9 previously-VERIFIED labels were DEMOTED** by beta-g ruling on 13 Sep evening under the owner steer 'it will not be made by picking the reading that keeps the label' — 6 whose qualifier (the destination of a fee, or the practitioner group a requirement applies to) is not part of the value text and is not named by the verdict, 2 lists whose completeness is not named, and 1 rule whose binding party is not named. Record count now 16 verified, down from 25. **Item 50 stays FAILED:** the guard's formula (declared ∩ named-confirmed) still advances all 9 of the demoted records — it does not police the qualifier / list completeness / binding party, and a human ruling had to catch what it could not. 'A label is absent or wrong' held on these 9 and the guard did not catch it, so the FAILURE condition cannot be shown not-met while the formula would advance a fresh record with the same defect. The formula fix (R4 in the beta-g ruling brief) is a follow-up amendment / row, not part of this change",
    failureMet: "a label is wrong: the first product's writing record was labelled VERIFIED on a verdict that confirmed three of the six claims its value makes, with a supplied 'not found' count of 0 — and the guard that should have caught it took that count on trust",
    why: "🔴 **REOPENED 13 SEPTEMBER 2026 — THE TICK OF PR #63 IS WITHDRAWN, AND THE ROW IS FAILED.** **The label was wrong:** the writing record's value makes six claims (a 45-minute task · a formal letter · on a matter of the candidate's own discipline · worked from case notes · for the variant, three named letter types · marked against six criteria); its verdict confirmed the first three and said nothing of the rest, yet it was ingested VERIFIED with elementsNotFound 0 — a number the verdict supplied and the guard trusted. **Corrected, not re-verified:** UNKNOWN, PARTIAL_EVIDENCE, three confirmed and three not found. **D-GUARD-1 fixed:** each governed record now DECLARES its elements (claimElements), a verdict NAMES the keys it confirmed, and the guard RECONCILES the two and derives what is missing — an unmentioned element is NOT CONFIRMED, a stale key is F26, a supplied count is F25, a governed record with no list is F27; each limb RED-proved alone (runs/audit/item-50-guard-limbs-red-2026-09-13.txt). **Re-run on the corrected population:** 4 real records judged leaving UNKNOWN, 1 advanced, 3 refused — the row's own test passes. 🔴 **THE MOVE IS WITHHELD, AND IT STAYS FAILED:** 32 of the registry's 33 VERIFIED labels reached VERIFIED on 12 September from UNVERIFIED — a never-checked state the guard treats as UNKNOWN — without passing through the guard and without any element reconciliation, and 11 of them state more than one claim by a declared heuristic. That is the exact defect class that reopened this row, unexamined on 11 labels; 'a label is wrong' cannot be shown not-met while it stands. Moving this row back is a ruling for beta-g, not a consequence of one passing test",
    whyPassedThenReopened: "🔴 **LEFT FAILED BY RULE 1's FIRST ROUTE — THE GUARD NOW GOVERNS REAL RECORDS LEAVING UNKNOWN, IN BOTH DIRECTIONS.** **INPUT:** four real fact records of the first product, UNKNOWN since 12 September, un-parked by the owner for this test only and verified by beta-g on 13 September in ONE pass, attempted identically — two sources answered and two did not, so the two-and-two split is the sources' doing, not the tester's. **EXPECTED — both directions on REAL records, through the REAL validation path (F24 in src/facts/validate.mjs, judgeLeavingUnknown in src/evidence/verdict.mjs):** (1) evidence arrived → the licence record and the writing record were ASKED to advance, the guard found a new measurement, a named checker, an OFFICIAL source read and no element unfound, and they left UNKNOWN; (2) evidence insufficient → the speaking record (one element confirmed, two not found) and the grade-bands record (three pages returned 403) were ASKED the same question and REFUSED with their reasons, and stay UNKNOWN. A record declared past a refusal, or held back when its evidence is sufficient, fails validation; a record that left UNKNOWN without a judgement is caught against the 12 September baseline. **FAILURE not met:** the labels hold, and the guard no longer polices an empty population — 4 real records judged leaving UNKNOWN, 2 advanced, 2 refused. **EVIDENCE:** both directions RED-proved on the real records (runs/audit/item-50-guard-red-2026-09-13.txt). No text of the source was stored: the verdicts carry only verdict, URL, date, tier and counts, and the policy wording this repository had quoted was found by hash and removed. The earlier FAILED results are kept on the row",
    failureMetThen: "the guard polices an empty population — the transitions it exists to police, out of UNKNOWN on real records, number 0: 0 of 46 facts carry a supersession, and 0 of the 145 real issue transitions it now judges start from UNKNOWN",
    whyStillFailed: "🔴 **ARGUED 13 SEPTEMBER 2026 FROM THE BOUNDARY'S OWN WORDS — AND IT STAYS FAILED.** **Should the guard govern issue transitions? Yes, and not to clear this row.** The boundary says 'NO PATH converts UNKNOWN into PASS'. Closing an issue asserts the defect is gone — a PASS — and until today an UNKNOWN issue could be CLOSED on any evidence at all: a real, unguarded path from UNKNOWN to PASS, inside the boundary's words. That is the same law over the same outcomes (an issue's verdict is FAIL or UNKNOWN, a closure is PASS, a supersession hands the verdict on), so it belongs to the SAME guard and the one table in transitions.mjs — not a new guard with a new boundary. **Widened:** lifecycleOf now judges every issue transition, and an UNKNOWN issue leaves for PASS only on a new measurement; RED-proved on the old lifecycle. **Labels:** four stored record types (draft_recommendation, issue_state_change, duplicate_record_superseded, cost_entry) had no declared label and would have rendered UNKNOWN — 'a label wrong' — now declared, with a census that fails on any undeclared type. **Why it stays FAILED:** the guard now judges 145 real transitions — 134 supersessions and 11 closures — but EVERY ONE starts from FAIL. The population the guard exists to police, a real record trying to leave UNKNOWN, is still EMPTY, for facts and issues alike. 145 transitions that never approach the forbidden edge do not show the guard governs it; the FAILURE clause's 'polices an empty population' is still met, just more precisely. **Leaves FAILED** when a real UNKNOWN record leaves UNKNOWN through the guard — refused, or allowed on a new measurement — and the test is re-run",
    whyFailedOnRescan: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND ITS FAILURE CONDITION IS MET.** **INPUT exists:** records of all four kinds on real data — observations (OBSERVED), run summaries (INFERRED), issues (RECOMMENDED) and UNKNOWN findings and facts. **The labels hold.** **The guard does not govern real records:** the only UNKNOWN→PASS arbiter on a real verdict path is F23 in src/facts/validate.mjs, it judges a fact that supersedes another, and **0 of 46 real facts carry life.supersedes** — the population is empty, which the FAILURE clause names word for word. The 134 superseded issues do not pass through it: issue lifecycle records are not check outcomes. ⚠️ Also found: a real `draft_recommendation` has no declared label and would render UNKNOWN. **Leaves FAILED** by a real record passing through the guard and the test re-run, or an owner ruling",
    whyBefore: "all four labels are live and 14 real records now carry UNKNOWN. But the boundary's guard is the UNKNOWN→PASS transition (F23), and 0 of 46 records carry life.supersedes, so that guard still polices an empty population — which the FAILURE clause names explicitly",
  },
  51: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node bin/link-recommendation-evidence.mjs · node bin/report.mjs --confirm · node --test test/recommendation-fields.test.mjs",
    failureMetThen: "priority, confidence and cost were missing on every real recommendation, and the real report rendered no recommendation at all",
    why: "🔴 **LEFT FAILED BY RULE 1's FIRST ROUTE — THE THREE MISSING FIELDS BUILT, EACH COMPUTED FROM STORED EVIDENCE, AND THE TEST RE-RUN AND PASSED.** **Evidence linked, not invented:** the three drafts named their findings in prose only, so each now has a recommendation_evidence record naming the stored records it stands on — refused unless the count its own finding states is reproduced (106 robots issues · 134 noindex issues · 16 crawler classifications). **PRIORITY, derived:** measured search impressions on the pages its issues name, from the newest COMPLETE page-rows pull, and the rank that gives — REC-NOINDEX-CV-GUIDE **1 of 2** (484 on 134 of 134 pages); REC-ROBOTS-CORRIDOR **2 of 2** (219 on 106 of 106 — its own text says 216, from the pull its audit read); REC-AI-CRAWLER-BLOCK **UNKNOWN** — its evidence names no page, so nothing measured can rank it. **CONFIDENCE, derived:** the WEAKEST §623 tier of the evidence and how complete it is — VERIFIED_ALMIWORLD at worst on all three, every linked id resolved, 0 linked issues UNKNOWN. **COST, from the ledger:** the entries that produced the evidence — and it reads **UNKNOWN on all three**, because the audit and crawl runs that raised most of that evidence were never costed; only lower bounds exist (9 provider calls where a Search Console pull is involved). The cost of CARRYING OUT a recommendation is **UNKNOWN**: no such run has happened. **No number was chosen:** the module holds no weight, threshold or score, and a test fails if one appears. **All six are visible on the real report** (runs/report/index.html, 'Recommendations'). **FAILURE not met:** none of the six is missing or unreadable — an UNKNOWN that states why is readable. ⚠️ Recorded rather than hidden: cost is UNKNOWN on every real recommendation, and stays so until the runs that raise issues are costed",
    whyFailed: "🔴 **RE-SCANNED 13 SEPTEMBER 2026: ITS INPUT EXISTED, SO THE TEST WAS RUN — AND ITS FAILURE CONDITION IS MET.** **INPUT exists:** three real recommendations (runs/audit/recommendations.jsonl, drafted 12 September). **Of the six the owner must be able to inspect:** status ✅ (RECOMMENDED — NOT APPROVED — NOT APPLIED), evidence ✅ (a cited official source), reason ✅ (the finding and its origin); **priority ❌, confidence ❌, cost ❌** — no such field exists. And **on the real report none of the six is visible**: bin/report.mjs reads a recommendation only as a source-tier row. 'Any of the six is missing or unreadable' — met. **Leaves FAILED** when a real recommendation shows all six on the real report and the test is re-run",
    whyBefore: "the ruling's own BLOCKER TODAY: of the six the owner must be able to inspect, PRIORITY, CONFIDENCE and COST do not exist at all",
  },
  52: {
    state: "BLOCKED-UNKNOWN",
    why: "🔴 NOT RUN = NOT TESTED, and the rendering trigger is unmet. Two of the six RED classes cannot be detected without a renderer, so running the exam today would produce a FAIL that measures our sequencing rather than the engine — and the seal breaks only once",
  },
  53: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    test: "node --test test/portability-neutral-product.test.mjs · node bin/facts.mjs census --product=neutral-test-ferments",
    why: "🔴 **RE-SAT 14 SEPTEMBER 2026 ON THE NEW LAYOUT, AND IT HOLDS.** The owner's ruling (Option A) took the first product's own data out of this repository into its own (almi-visibility-data); only the neutral declared test product stays here, in the fixtures root. The same five tests were run end to end with the neutral product resolved from the fixtures root and the first product from the external root — 5 of 5 pass — and all three sabotages went RED on their named test and were restored byte for byte (runs/audit/row53-portability-red-2026-09-14.txt): the two of 13 September replayed, and a NEW one for the new layout (subject discovery reading inside the external first product's folder), which the entry-point probe caught. The isolation it asserts now spans a repository boundary, reached through the same entry points and a list of subject roots — which is closer to what its boundary asks. No state moved. 🔴 **PORTABILITY PROVED ON SOMETHING UNSEEN, WITH THE ISOLATION ASSERTED DURING THE SAME RUN.** **INPUT** a NEUTRAL DECLARED TEST PRODUCT, declared as one on 13 September 2026 (products/neutral-test-ferments): home fermentation, pages varying by ferment, sources at a reserved address that does not exist, its own reserve-everything licence — sharing no subject, predicate, axis, variant, source host or licence with the first product. **EXPECTED** the generic core initialized and discovered it through the same entry points a real product uses — registered, 4 records loaded from 2 files, every registry law valid, census, coverage (5 declared ferments, 0 pages) and its one declared gap — with no edit under src/. **FAILURE not met on either half.** (a) The core needed no first-product knowledge: bin/facts.mjs, run under a probe, loaded no module of the first product and read none of its files (it listed the products folder and checked each has a descriptor — names only). (b) With the first product's 46 records, private licence terms and gaps loaded in the SAME process, none crossed: no record, id, source host, licence term or gap reached the neutral run, every licence accessor refused the first product's terms, and borrowing one failed validation (F17). **EVIDENCE** the declaration, the run, and the isolation assertion during that run — both halves RED-proved (runs/audit/item-53-portability-red-2026-09-13.txt). ⚠️ No cost and no learning record is tied to any product, so nothing of those two classes could leak and nothing about them is proved here — that is item 54",
    whyBefore: "the boundary law and fixture tenants hold, but the INPUT is an UNSEEN product — a second real product or a neutral declared test product — and none has been declared and run",
  },
  54: {
    state: "BLOCKED-UNKNOWN",
    afterItem53: "13 September 2026, item 53's run: a second declared product now exists (the neutral test product), and its evidence, facts, licence terms and gaps were proved isolated from the first product's during that run. The run produced NO cost record and NO learning record tied to any product — the cost ledger names no product, and no learning module, record or store exists. So item 54 still lacks exactly what it lacked: costs and learning TIED TO A PRODUCT, two of its four classes, do not exist to be tested",
    why: "🔴 **RE-SCANNED AGAIN 14 SEPTEMBER 2026, ON THE NEW LAYOUT (Option A): STILL BLOCKED, AND NOT BECAUSE OF THE MOVE.** The first product's own data now lives in its own repository and the neutral product stays here; the isolation half re-sat and held (row 53, runs/audit/row53-portability-red-2026-09-14.txt). But this row's INPUT still lacks two of its four classes — the run's own check found no cost entry naming a product and no learning record — so nothing here can be tested yet. 🔴 **RE-SCANNED 13 SEPTEMBER 2026: STILL BLOCKED — HALF AN INPUT IS NOT AN INPUT.** The INPUT is two declared products EACH holding private evidence, facts, costs and learning. **COST: a cost ledger now exists, but no cost entry names a product**, so neither product holds a private cost to be isolated. **LEARNING: no learning record exists** — no module, no record, no store. Two of the four classes still do not exist to be tested, which the FAILURE clause names ('a class does not exist to be tested') — but the test cannot be run without them, so it is not FAILED either. Learning is itself deferred, so this cannot be closed inside frozen v0.1",
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
  56: {
    state: "VERIFIED-PASS",
    changeKind: "work",
    route: "OWNER_VERIFICATION",
    test: "the owner's visual check of runs/report/index.html · test/item-56-owner-verification.test.mjs",
    verifiedOn: "2026-09-13",
    record: "runs/owner-verification/item-56-2026-09-13/owner-verification.json",
    criteriaOwnerWords: "PASS ka sawal khoobsurti ka nahi: critical information readable ho, workflow samajh aaye, controls/links usable hon, aur koi clipping/overlap/broken critical view na ho.",
    criteria: ["critical information readable", "workflow understandable", "controls and links usable", "no clipping, overlap or broken critical view", "beauty is not the question"],
    findingRaised: "F-56-1, raised by beta-g: the cost ledger's lines extend past a narrow viewport and are reached by horizontal scrolling",
    ownerRulingOnFinding: "the owner ruled it NOT CLIPPING — the content scrolls, nothing is lost, the view is not broken. Not a defect and not on the path: POST_DONE_BACKLOG.md PD-1",
    evidenceNote: "four screenshots, all at a narrow (mobile-class) width of about 750 px. The boundary's EVIDENCE names both widths; the desktop half rests on the owner's verification itself, and no desktop screenshot is in the record",
    why: "🔴 **VERIFIED-PASS BY OWNER VERIFICATION, 13 SEPTEMBER 2026.** The owner's ruling makes this an owner-verification item — 'Automated GREEN is owner-eye requirement ko replace nahi karta' — and the owner looked at the report and verified it against his own criteria. Four screenshots are committed beside the record and pinned by git blob. The one finding raised, the cost ledger scrolling sideways at narrow width, was ruled not clipping. No automated run set this row, and the ledger refuses any that tries",
    whyBefore: "the walk must be recorded at both widths and the browser tooling failed on every attempt, including a trivial probe page. 🔴 That is a fact about our tooling, not about the interface (LAW-ABSENT-1) — so it is UNKNOWN, not a failure",
  },
  57: { state: "NOT-STARTED", why: "runs last, and requires an auditor who is not the builder" },
  58: { state: "NOT-STARTED", why: "🔴 only the owner declares DONE. Requires the full ledger, the audit, and his own signature" },
  59: {
    state: "VERIFIED-PASS",
    why: "🔴 **VERIFIED-PASS — 14 SEPTEMBER 2026**, on the owner's release of Amendment 3's work half (admitted 14 September as NOT-STARTED). **INPUT** every finding the product presents as actionable, READ FROM THE STORE: 17 finding classes and 3 drafted recommendations — a population of **20**, printed by the census. **EXPECTED** each carries a structured `refutation` — observation · source · condition — declared in `config/refutation-register.mjs`: **20 of 20** carry all three parts and a source naming a method this product holds (a detector recorded in the store, or a runner in bin/). **FAILURE** not met: 0 missing · 0 unrefutable · 0 empty parts · 0 unobtainable · 0 stale · the population is not empty, and it is read from the store, never from the register. **EVIDENCE** `bin/refutation-census.mjs` over the real store (runs/audit/row59-census-2026-09-14.txt); every limb sabotaged ALONE in the real register — one refutation removed, the observation emptied, the source emptied, the condition emptied, a method we do not hold — each RED on that limb only, each restored and hash-checked (runs/audit/row59-red-limbs-2026-09-14.txt). **Backfill: 20 written, 0 that could not be written.** 🔴 **THE LIMIT, as ruled:** the census proves each refutation's three parts are present and that its source names a method this product holds; it CANNOT prove the refutation is well chosen — that is human judgement. ⚠️ **Declared interpretation:** a refutation is declared once per finding CLASS and applies to every record of it; nothing is written into the append-only evidence store",
  },
  60: {
    state: "VERIFIED-PASS",
    why: "🔴 **VERIFIED-PASS — 14 SEPTEMBER 2026 — ITS FIRST TICK, EVERY CLAUSE OF ITS CONTRACT MET ON THE REAL STORE.** **INPUT** every finding the product presents as actionable, and a consequence register the owner controls: `config/consequence-register.mjs`, under the owner's rulings `ROW60_CONSEQUENCE_LAW.md`, `ROW60_COVERAGE_AND_LEVELS_RULING.md` and `ROW60_POPULATIONS_RULING.md`, all hash-pinned. **EXPECTED** every finding class present carries a declared level, each entry stating what, the level and why — the 14 finding classes, HIGH 4 · MODERATE 6 · LOW 4 — and every presented recommendation shows its priority, its basis and which entry applied: REC-ROBOTS-CORRIDOR 1 of 1 at MODERATE, basis BOTH; REC-NOINDEX-CV-GUIDE's evidence is the audit trail, shown as not a finding, consequence UNKNOWN; REC-AI-CRAWLER-BLOCK none (Part C). **What is a finding, by the owner's rulings of 14 September 2026:** of 2,033 distinct issues, **541 are FINDINGS**; 1,224 are COVERAGE GAPS (checks that never ran); 134 are a DECISION ON RECORD awaiting REC-NOINDEX-CV-GUIDE, shown FIRST on the owner's report with its 484 search impressions; 134 are AUDIT TRAIL (claims withdrawn as wrong) — every issue in exactly one population. **EVIDENCE** the register reconciled line by line against the 14 finding classes in use (0 missing · 0 stale · 0 invalid); the real report shows the basis on the real recommendations; row 60's four frozen limbs re-run on today's real files — a level hard-coded in code, a register entry removed, the basis emptied, a stale entry — each RED alone, restored and hash-checked, beside the seven limbs of the population ruling (runs/audit/row60-populations-red-limbs-2026-09-14.txt). 🔴 **The limit, on the row:** the pass rests on three owner rulings that moved what counts as a finding while this row was blocked — each put to the ANTI-CIRCLE self-check, its answer recorded in the ruling. It proves the engine applies the owner's judgement consistently; it can never prove a level is well chosen — that is his. 🔴 **UNCLASSIFIED IS A REAL STATE AND NEVER DEFAULTS TO LOW** (LAW-ABSENT-1)",
  },
  /* Row 61's work is recorded as its declared move in MOVES_AMENDMENT_2 — it has no 11 September baseline to
   * have "changed" against, so it carries no changeKind of its own. */
  61: {
    state: "BUILT-NOT-PROVED",
    why: "🔴 **BUILT / NOT-PROVED — CREATED 14 SEPTEMBER 2026** (reserved by Amendment 5 until rows 59 and 60 existed). **Work happened (PR #72):** the runner is generic — `--slug` / `--all-slugs`, no default, specs from the product's declaration; Gate A's four frozen parts are enforced inside the construction path and FAIL CLOSED; the refusal was seen RED with the acceptance rule bypassed and GREEN restored (runs/audit/row61-gate-a-*); 0 of 3 candidates accepted. **Not proved:** the EVIDENCE clause requires *\"a run on two different products, one of them the neutral test product\"*. The neutral product was REFUSED AT THE RUNNER (\"it declares no page spec\"), and the full path was proved only with a spec declared inside a test — **a test fixture is not a declared product**, so the portability leg has not been run through the runner",
    missingLeg: "a second DECLARED product with its own DECLARED page spec, reached end to end through bin/build-page.mjs",
    blockedOn: "an OWNER DECISION, not yet made: either a second neutral declared test product that declares a page spec, or a deliberate re-pin of row 53's coverage (the neutral product declares pageSpecs {} today, and row 53 — VERIFIED-PASS — pins exactly that)",
    realPageInputs: Object.freeze([
      "no page spec declares a WHY_THIS_URL_DESERVES_TO_EXIST — whoever owns the evidence writes them, none has been written, and CC must not invent one",
      "a template family needs at least THREE rendered specs before unique words and sibling overlap can be measured at all (D-GATEA-1: a group of one or two learns its shell from itself); two specs exist, so those two Gate A parts stay BLOCKED / NOT TESTED until a third does",
    ]),
  },
};

/** Every verdict — the frozen 58 and the rows admitted by ruling — with the recorded before-state folded in. */
export function classify(previousStates = BEFORE_2026_09_12) {
  const boundaries = loadBoundaries();
  const out = {};
  for (const id of Object.keys(boundaries).map(Number).sort((a, b) => a - b)) {
    const b = boundaries[id];
    let row = b.class === "D"
      ? D(id, `class D in the frozen ruling — frozen v0.1 deliberately does not contain this. It cannot FAIL for lacking it, and it cannot PASS either`)
      : { id, ...EXPLICIT[id] };
    /* 🔴 WHY a row stayed deferred, not merely that it did — and the input test that moved the others — both
     * READ from Amendment 4's verdict table rather than retyped. */
    if (b.a4 && b.class === "D") {
      row = D(id, `🔴 **class D in the frozen ruling, and KEPT D by Amendment 4** (owner ruling, 13 September 2026) — the amendment tested its frozen INPUT clause, ${b.a4.inputClause}, and found: ${b.a4.inputPresent}. Moving it in would create a row whose input does not exist in the current phase — paperwork, not progress. It enters scope on the day a bounded external-evidence GREEN is given, and not before. It cannot FAIL for lacking it, and it cannot PASS either`);
    } else if (b.a4) {
      row = { ...row, why: `${row.why} The amendment's test of its frozen INPUT clause, ${b.a4.inputClause}: ${b.a4.inputPresent}.` };
    }
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

    /* 🔴 THE OWNER'S RULING OF 13 SEPTEMBER 2026, §3 — an UNKNOWN BY EXTERNAL PREREQUISITE must
     * say exactly what evidence is missing, what blocks it, and what would unlock it. */
    if (r.label === "BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE") {
      if (r.state !== "BLOCKED-UNKNOWN") errors.push(`item ${r.id}: labelled BY EXTERNAL PREREQUISITE but its state is ${r.state}`);
      for (const field of ["missingEvidence", "blocker", "unlockCondition"]) {
        if (typeof r[field] !== "string" || r[field].trim().length < 20) {
          errors.push(`item ${r.id} (${boundaries[r.id].name}) is BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE with no ${field} — the ruling requires the exact missing evidence, blocker and future unlock condition`);
        }
      }
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
