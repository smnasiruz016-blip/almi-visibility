/**
 * ITEM 15 — the verification verdicts of 12 September 2026, and the TWO DEFECTS
 * that ingesting real data exposed.
 *
 * ── 🔴 WHY THIS FILE EXISTS SEPARATELY ──────────────────────────────────────
 *
 * `facts-lifecycle.test.mjs` proves the machinery against fixtures. This file
 * proves it against WHAT ACTUALLY CAME BACK, and the difference between the two
 * is the entire value of the exercise: the fixtures were all green while the
 * conflict detector could not see a single one of the six real conflicts, and
 * while all thirty-two recheck dates were inert.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { fact, VERIFICATION_STATES, UNKNOWN_REASONS } from "../src/facts/record.mjs";
import { detectConflicts, freshnessOf, createFactCache, markForReview } from "../src/facts/lifecycle.mjs";
import { loadRegistry, primaryFacts, derivedFacts, REGISTRY_VERIFIED_COUNT } from "../src/facts/registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { records } = await loadRegistry((await (await import("./support/subjects.mjs")).subject("almi-oet")).factsDir, "almi-oet");

/**
 * 🔴 THE POPULATION THE 12 SEPTEMBER VERIFICATION RUN GOVERNS — SOURCE-BEARING RECORDS.
 *
 * This file is about INGESTING VERDICTS: a person opened a source, read it, and returned a check.
 * Every assertion below reads `checks.factCheckedOn`, `checks.factCheckedBy` or
 * `verification.reason` — the outcome of that reading. F28 waives F13 for a derived record and
 * `fact()` THROWS if one is handed a `factCheckedOn` at all, because its standing is inherited from
 * its weakest input rather than reached by anybody reading anything. So a derived record is not a
 * record this run under-checked; it is a record this run could not have checked.
 *
 * 🔴 `records` STILL MEANS THE WHOLE REGISTRY and is used where the whole registry is the subject.
 * The two names are kept apart so that neither question can be answered with the other's population.
 */
const checked = primaryFacts(records);

/**
 * 🔴 LAW-FIXTURE-1 — what F is NOT.
 *
 * A minimal record: id, claim, value, tier, freshness rule. Real records carry
 * licences, quotability, fingerprints and check outcomes, none of which this
 * exercises. Simplifications are NAMED here rather than discovered later. The
 * assertions against `checked` below run on the real 46 source-bearing records; `records` is the whole registry.
 */
const F = (id, over = {}) => ({
  id,
  claim: { subject: "s", predicate: "p", qualifier: null },
  scope: "destination",
  value: { value: 1, valueType: "count", unit: "x" },
  source: { tier: 1 },
  verificationState: "UNVERIFIED",
  life: { status: "active", extractedOn: "2026-09-01" },
  freshness: { rule: "machine-fingerprint", days: 180 },
  ...over,
});

/* ================================================================== *
 * DEFECT 1 — THE CONFLICT DETECTOR CANNOT SEE THE CONFLICTS WE HAVE.
 * ================================================================== */

/**
 * 🔴 THE SHAPE OF THE DEFECT, STATED ONCE.
 *
 * `detectConflicts` groups records by claim and reports a group whose members
 * disagree. That finds an INTRA-REGISTRY conflict: two things WE hold, at odds.
 *
 * All six conflicts beta-g actually found are a different shape —
 * REGISTRY-vs-SECOND-OFFICIAL-PAGE. We hold ONE record; the disagreeing value
 * is on a page we do not hold. Every group therefore has exactly one member and
 * the detector returns zero, which reads exactly like "no conflicts".
 *
 * 🔴 THE CONFLICTS ARE NOT HAND-PLACED TO MAKE THIS GREEN. Transcribing the
 * other page's numbers into our records would make the detector fire and would
 * prove nothing about the detector — it would prove I can type. The gap is
 * pinned as a gap.
 *
 * 🔴 UPDATED 15 September 2026 (row 16, the owner-authorised evidence run), AND THE TEST BELOW
 * STAYS EXACTLY AS IT IS. The external shape is now detected — by `detectExternalConflicts`, which
 * compares a held record against an external OBSERVATION that declares the claim it speaks to
 * (test/external-conflict.test.mjs, firing on a real capture). `detectConflicts` itself is
 * UNCHANGED and still narrow, so the assertion below still reads 0, and it is still the thing that
 * would tell us if it ever quietly widened. The defect note moves; the pin does not.
 */
test("🔴 DEFECT: a registry-vs-external conflict is INVISIBLE to detectConflicts", () => {
  // Exactly the shape of all six real ones: one record, marked UNKNOWN/CONFLICT
  // by a human who read a second official page we do not hold.
  const contested = fact(F("ng-nmcn.verification-fee.purpose=authentication", {
    value: { value: 8750, valueType: "amount", unit: "NGN" },
    verification: {
      state: "UNKNOWN",
      reason: "CONFLICT",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g",
      note: "a second official NMCN page states one combined fee instead",
    },
  }));

  assert.equal(contested.verificationState, "UNKNOWN");
  assert.equal(
    detectConflicts([contested]).length,
    0,
    "if this ever returns 1 the detector has learnt a new shape — update the defect note, do not delete this test",
  );
});

/**
 * 🔴 THE CONTROL. Without it the test above is satisfied by a detector that is
 * simply broken, and "returns 0" would prove nothing at all.
 */
test("CONTROL: the same detector DOES fire on the intra-registry shape", () => {
  const c = detectConflicts([
    F("a", { value: { value: 8750 }, source: { tier: 1 } }),
    F("b", { value: { value: 68875 }, source: { tier: 4 } }),
  ]);
  assert.equal(c.length, 1, "the detector is not broken — it is narrow, and only this control can tell those apart");
  assert.equal(c[0].resolvedState, "UNKNOWN");
});

test("🔴 REAL: the six human-found conflicts are all single-record, so 0 is the honest output", () => {
  const humanConflicts = records.filter((f) => f.verification?.reason === "CONFLICT");
  assert.equal(humanConflicts.length, 6, "beta-g marked six rows CONFLICT on 12 September 2026");

  // Each one's claim is held by exactly one record — that is WHY the detector is blind.
  const key = (f) => `${f.claim?.subject}|${f.claim?.predicate}|${f.claim?.qualifier ?? ""}|${f.scope ?? ""}`;
  const counts = new Map();
  for (const f of records) counts.set(key(f), (counts.get(key(f)) ?? 0) + 1);
  for (const f of humanConflicts) {
    assert.equal(counts.get(key(f)), 1, `${f.id}: more than one record now holds this claim — the detector may finally see it`);
  }
  assert.equal(detectConflicts(records).length, 0);
});

/* ================================================================== *
 * DEFECT 2 — THE INGESTED RECHECK DATES GOVERNED NOTHING.
 * ================================================================== */

/**
 * 🔴 A DATE THAT DECIDES NOTHING IS WORSE THAN NO DATE.
 *
 * The ingest wrote `verification.recheckAfter` on 32 records. `freshnessOf`
 * reads `checks.recheckAfter`. So all 32 still aged out on the old
 * `extractedOn + freshness.days` rule and the registry looked governed by dates
 * that governed nothing.
 *
 * 🔴 AND IT SURVIVED THE FIRST PROBE. That probe asked on a day PAST BOTH due
 * dates, saw STALE, and passed. Both rules answer the same on such a day, so it
 * could not fail. This test asks on a day where the two rules DISAGREE — which
 * is the only kind of day that carries information.
 */
test("🔴 the ingested recheck date GOVERNS freshness — asked on a day the two rules disagree", () => {
  const f = fact(F("x", {
    life: { status: "active", extractedOn: "2026-09-01" }, // old rule: due 2027-02-28
    freshness: { rule: "machine-fingerprint", days: 180 },
    verification: {
      state: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g",
      recheckAfter: "2027-06-01", // deliberately LATER than the old rule's due date
    },
  }));

  assert.equal(f.checks.recheckAfter, "2027-06-01", "the date must land where freshnessOf actually looks");

  const between = new Date("2027-03-15"); // past the old rule, inside the ingested one
  const res = freshnessOf(f, { now: between });
  assert.equal(res.state, "USABLE", "the old extractedOn+days rule is still deciding — the ingested date is inert");
  assert.match(res.why, /recheck due 2027-06-01/, "🔴 read the REASON: a right answer down the wrong path is not a pass");

  const after = freshnessOf(f, { now: new Date("2027-06-02") });
  assert.equal(after.state, "STALE");
});

// 🔴 34 since 13 Sep 2026: two OET records left UNKNOWN through the F24 guard (item 50), each with its recheck date.
// 🔴 33 since the item-50 reopen (13 Sep 2026): #63's 34 included the writing record, corrected to UNKNOWN.
// 🔴 25 since item 50's whole population was reconciled (13 Sep 2026 morning): 8 records whose verdicts named only part of their value returned to UNKNOWN.
// 🔴 16 since the 9 ambiguous labels were demoted by beta-g ruling (13 Sep 2026 evening).
test("🔴 REAL: all 16 VERIFIED records carry a recheck date, and it is the one freshness uses", () => {
  /* 🔴 SOURCE-BEARING ONLY — a recheck date is a promise to re-read a source, and a derived record
   * has none to re-read. `checked` is the population this whole file measures. */
  const verified = checked.filter((f) => f.verificationState === "VERIFIED");
  assert.equal(verified.length, REGISTRY_VERIFIED_COUNT);
  for (const f of verified) {
    assert.ok(f.verification.recheckAfter, `${f.id}: VERIFIED with no recheck date — it would never expire`);
    assert.equal(f.checks.recheckAfter, f.verification.recheckAfter, `${f.id}: the date did not reach freshnessOf`);
    const past = new Date(f.checks.recheckAfter);
    past.setDate(past.getDate() + 1);
    assert.equal(freshnessOf(f, { now: past }).why, `past its recheck date of ${f.checks.recheckAfter}`);
  }
});

test("a VERIFIED record with NO recheck date still ages out on its freshness rule — it is not immortal", () => {
  const f = fact(F("y", { verification: { state: "VERIFIED", checkedOn: "2026-09-12", checkedBy: "human:beta-g" } }));
  assert.equal(f.checks.recheckAfter, undefined);
  assert.equal(freshnessOf(f, { now: new Date("2027-06-01") }).state, "STALE");
});

/* ================================================================== *
 * THE THIRD STATE, AND WHAT IT REFUSES TO LET THROUGH.
 * ================================================================== */

test("UNKNOWN is a state a record may declare", () => {
  assert.deepEqual([...VERIFICATION_STATES], ["UNVERIFIED", "VERIFIED", "UNKNOWN"]);
});

test("🔴 UNKNOWN without a DATE is refused — it would be indistinguishable from unopened", () => {
  assert.throws(
    () => fact(F("z", { verificationState: "UNKNOWN" })),
    /UNKNOWN requires checks.factCheckedOn/,
  );
});

test("🔴 UNKNOWN without a declared REASON is refused", () => {
  assert.throws(
    () => fact(F("z", { verification: { state: "UNKNOWN", checkedOn: "2026-09-12", checkedBy: "human:beta-g" } })),
    /UNKNOWN needs a declared reason/,
  );
  assert.throws(
    () => fact(F("z", { verification: { state: "UNKNOWN", reason: "BECAUSE", checkedOn: "2026-09-12", checkedBy: "h" } })),
    /UNKNOWN needs a declared reason/,
  );
});

test("CONTROL: a well-formed UNKNOWN is accepted, so the two tests above are not passing on any throw", () => {
  const f = fact(F("z", {
    verification: { state: "UNKNOWN", reason: "SOURCE_UNREACHABLE", checkedOn: "2026-09-12", checkedBy: "human:beta-g" },
  }));
  assert.equal(f.verificationState, "UNKNOWN");
  assert.equal(f.checks.factCheckedOn, "2026-09-12");
});

/* ================================================================== *
 * THE CENSUS — WHAT THE 12 SEPTEMBER VERDICTS ACTUALLY SAID.
 * ================================================================== */

test("🔴 REAL: 46 records — 16 VERIFIED, 30 UNKNOWN, 0 left UNVERIFIED (after the 9 ambiguous labels were demoted 13 Sep evening)", () => {
  const by = {};
  for (const f of checked) by[f.verificationState] = (by[f.verificationState] ?? 0) + 1;
  // 🔴 18/28 since 21 Sep 2026: the owner verified the two pk-pnmc destination fees. 16/30 before.
  assert.deepEqual(by, { VERIFIED: 18, UNKNOWN: 28 });
});

// 🔴 13 Sep 2026 morning: of the four SOURCE_UNREACHABLE, two were VERIFIED, one is now PARTIAL_EVIDENCE, one stays SOURCE_UNREACHABLE.
// 🔴 13 Sep 2026 evening: 9 records demoted with reason PARTIAL_EVIDENCE (beta-g ruling). PARTIAL_EVIDENCE: 10 + 9 = 19.
test("🔴 REAL: the 30 UNKNOWNs break down 6 CONFLICT / 4 INCOMPLETE / 19 PARTIAL_EVIDENCE / 1 SOURCE_UNREACHABLE", () => {
  const by = {};
  for (const f of checked.filter((f) => f.verificationState === "UNKNOWN")) {
    by[f.verification.reason] = (by[f.verification.reason] ?? 0) + 1;
  }
  // 🔴 PARTIAL_EVIDENCE 19 → 17 on 21 Sep 2026: the two pk-pnmc fees left this column for VERIFIED
  // when the owner read the official source and the verdict named their destination element.
  assert.deepEqual(by, { CONFLICT: 6, INCOMPLETE: 4, PARTIAL_EVIDENCE: 17, SOURCE_UNREACHABLE: 1 });
  for (const r of Object.keys(by)) assert.ok(r in UNKNOWN_REASONS, `${r} is not a declared reason`);
});

test("🔴 REAL: every one of the 46 records names WHO checked it and WHEN", () => {
  // 🔴 The four OET records were checked again on 13 Sep 2026 (item 50); the other 42 carried the 12 Sep check.
  // 🔴 And two more on 21 Sep 2026, when the owner verified the pk-pnmc destination fees together
  // against the official source. 40 + 4 + 2 = 46. The dates are named by record, not by a range,
  // so a record that drifts onto the wrong day is still caught.
  const rechecked = ["oet.content-licence-permits-stored-quotation", "oet.writing-task-type.profession=nursing", "oet.speaking-roleplay-setting.profession=nursing", "oet.grade-bands-0-500"];
  const ownerVerified = ["pk-pnmc.verification-fee.destination=domestic", "pk-pnmc.verification-fee.destination=foreign"];
  for (const f of checked) {
    const expected = ownerVerified.includes(f.id) ? "2026-09-21" : rechecked.includes(f.id) ? "2026-09-13" : "2026-09-12";
    assert.equal(f.checks.factCheckedOn, expected, `${f.id}: no check date`);
    assert.match(f.checks.factCheckedBy, /^human:/, `${f.id}: a fact check must name a person, not a tool`);
  }
});

/**
 * 🔴 NO VALUE WAS AMENDED — THE ONE THING INGESTION MUST NOT DO.
 *
 * The four INCOMPLETE rows are the tempting ones: the source supports MORE than
 * the record says, and "just widening it" feels like a free improvement. It is
 * authoring, it is not what a verifier signed off, and it would launder new
 * content in under a verdict. So the values stay exactly as they were and the
 * shortfall is carried as the UNKNOWN/INCOMPLETE standing instead.
 */
test("🔴 REAL: the INCOMPLETE rows kept their original values and are NOT usable as verified", () => {
  const incomplete = records.filter((f) => f.verification?.reason === "INCOMPLETE");
  assert.equal(incomplete.length, 4);
  for (const f of incomplete) {
    assert.equal(f.verificationState, "UNKNOWN", `${f.id}: INCOMPLETE must not pass for VERIFIED`);
    assert.ok(!f.verification.recheckAfter, `${f.id}: an unresolved record must not be given an expiry that implies it is good until then`);
  }
});

/* ================================================================== *
 * DEFECT 3 — THE CACHE WAS SERVING CONTESTED VALUES AS CLEAN HITS.
 * ================================================================== */

/**
 * 🔴 THE WORST OF THE THREE, BECAUSE IT REACHED A CALLER.
 *
 * `createFactCache.get()` checked freshness and nothing else. So on the day 14
 * records were marked UNKNOWN, all 14 still came back `hit: true` with a bare
 * value — including an NMCN fee that one official page puts at ₦66,875 and
 * another contradicts. The hit rate read 100%.
 */
test("🔴 the cache REFUSES an UNKNOWN fact, and names which kind of unknown", () => {
  const contested = fact(F("c", {
    value: { value: 66875, valueType: "amount", unit: "NGN" },
    verification: { state: "UNKNOWN", reason: "CONFLICT", checkedOn: "2026-09-12", checkedBy: "human:beta-g" },
  }));
  const cache = createFactCache({ facts: [contested] });
  const r = cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" });

  assert.equal(r.hit, false, "a contested value must never be served as a clean hit");
  assert.equal(r.reason, "UNKNOWN_CONFLICT", "the caller must be told WHY, not merely that it missed");
  assert.equal(r.unresolved, true);
  // 🔴 The record still comes back. Both values are retained; withholding it
  // would destroy the evidence that there was ever a disagreement.
  assert.equal(r.fact.value.value, 66875);
});

test("CONTROL: a VERIFIED, in-window fact is still a hit — the cache was not simply switched off", () => {
  const good = fact(F("g", {
    verification: { state: "VERIFIED", checkedOn: "2026-09-12", checkedBy: "human:beta-g", recheckAfter: "2027-06-01" },
  }));
  const cache = createFactCache({ facts: [good], now: () => new Date("2026-09-13") });
  assert.equal(cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" }).hit, true);
});

test("🔴 REAL: not one of the 14 UNKNOWN records can be obtained as a cache hit", () => {
  const cache = createFactCache({ facts: checked, now: () => new Date("2026-09-12") });
  for (const f of checked.filter((f) => f.verificationState === "UNKNOWN")) {
    const r = cache.get({ subject: f.claim.subject, predicate: f.claim.predicate, qualifier: f.claim.qualifier, scope: f.scope });
    assert.equal(r.hit, false, `${f.id}: served as a clean hit while marked ${f.verification.reason}`);
  }
});

test("🔴 REAL: the honest hit rate is BELOW 100% — a perfect one would mean nothing is being refused", () => {
  const cache = createFactCache({ facts: checked, now: () => new Date("2026-09-12") });
  for (const f of checked) {
    const q = { subject: f.claim.subject, predicate: f.claim.predicate, qualifier: f.claim.qualifier, scope: f.scope };
    cache.get(q); cache.get(q);
  }
  const s = cache.stats();
  // 🔴 64/28 on 12 Sep 2026; two records verified through the guard on 13 Sep add 4 hits and remove 4 misses.
  // 68/24 after #63; 66/26 after #64; 50/42 once the whole population was reconciled (8 more records UNKNOWN).
  // 32/60 after the 13 Sep evening demotion of 9 ambiguous labels (each asked twice: 18 hits become 18 more misses).
  // 🔴 36/56 since 21 Sep 2026: two records became VERIFIED, and each is asked twice — 4 misses
  // become 4 hits. 32/60 from the 13 Sep evening demotion.
  assert.equal(s.hits, 36);
  assert.equal(s.misses, 56);
  assert.ok(s.hitRate < 1, "🔴 100% means the cache is serving everything, including what it should refuse");
  // 🔴 PARTIAL_EVIDENCE 38 → 34: the same two records, asked twice each, no longer refused.
  assert.deepEqual(s.missReasons, { UNKNOWN_CONFLICT: 12, UNKNOWN_INCOMPLETE: 8, UNKNOWN_PARTIAL_EVIDENCE: 34, UNKNOWN_SOURCE_UNREACHABLE: 2 });
});

/* ================================================================== *
 * DEFECT 4 — THE DEPENDENCY WALK HAS NOTHING TO WALK.
 * ================================================================== */

/**
 * 🔴 A ZERO FROM AN EMPTY POPULATION IS NOT A CLEAN BILL OF HEALTH.
 *
 * The walk reports 0 dependants of the 10 bad facts. That is not because
 * nothing depends on them — it is because NOTHING IN THE SYSTEM CITES A FACT ID
 * AT ALL. There are 0 derived facts, and 134 findings on disk of which 0 carry
 * `sources` or `factIds`. So the walk cannot fire on real data whatever goes
 * wrong, and its green fixtures say nothing about that.
 */
test("🔴 REAL: the dependency walk's population is EMPTY — count it before trusting its zero", () => {
  const bad = records.filter((f) => ["CONFLICT", "INCOMPLETE"].includes(f.verification?.reason)).map((f) => f.id);
  assert.equal(bad.length, 10);

  const findingsPath = `${REPO}runs/audit/findings.jsonl`;
  const findings = existsSync(findingsPath) ? createJsonlStore(findingsPath).readAll() : [];
  const derived = records.filter((f) => Array.isArray(f?.derivation?.inputs));
  const citing = findings.filter((x) => (x.sources ?? []).length || (x.factIds ?? []).length);

  const walk = markForReview({ facts: records, findings, badFactIds: bad, reason: "INPUT_CONFLICTED" });
  assert.equal(walk.total, 0);

  /* 🔴 19 SEPTEMBER 2026 — THE GLOBAL ZERO IS GONE, AND IT IS NOT BEING HIDDEN.
   *
   * This line used to read `derived.length === 0` with the note "derived facts now exist — the
   * walk's zero may finally mean something". A derived fact NOW EXISTS, so that tripwire has done
   * its job and fired; deleting it and keeping the walk's zero unexplained is exactly what it was
   * written to prevent. It is replaced by the narrower question row 16 actually governs.
   *
   * Row 16's frozen EVIDENCE asks for "the dependency walk ON REAL DEPENDENTS". A dependent is a
   * record that CITES a conflicted one. So the population that decides whether this zero is honest
   * is not "derived facts" — it is "derived facts citing an input row 16 has marked bad", and that
   * is the number pinned below. The registry now holds one derived record; NONE of its inputs is
   * CONFLICT or INCOMPLETE (both are PARTIAL_EVIDENCE), so it is not a dependent and the walk still
   * has nothing real to walk. 🔴 THE DAY A DERIVED FACT CITES A CONFLICTED INPUT THIS GOES RED and
   * row 16 is re-sat on a real dependency — which is the whole point of keeping a tripwire here. */
  assert.ok(derived.length > 0, "no derived record at all — this pin cannot tell a real zero from an empty population");
  const dependentOnConflicted = derived.filter((f) => f.derivation.inputs.some((i) => bad.includes(i)));
  assert.deepEqual(dependentOnConflicted.map((f) => f.id), [],
    "a derived fact now cites a CONFLICT/INCOMPLETE input — the walk has a real dependent and row 16 must be re-sat");
  assert.equal(citing.length, 0, "findings now cite fact ids — re-read this test, the walk can fire");
  assert.ok(findings.length > 0, "and it is not that there are no findings: there are plenty");
});

test("🔴 REAL: a SOURCE_UNREACHABLE row is not a finding about the subject (LAW-ABSENT-1)", () => {
  const unreachable = records.filter((f) => f.verification?.reason === "SOURCE_UNREACHABLE");
  assert.equal(unreachable.length, 1); // 4 on 12 Sep 2026; three re-read on 13 Sep (two VERIFIED, one PARTIAL_EVIDENCE)
  for (const f of unreachable) {
    assert.equal(f.verificationState, "UNKNOWN");
    assert.ok(f.value?.value !== null, `${f.id}: the value was voided because we could not read the source — that is our failure, not the source's`);
  }
});

/* ================================================================== *
 * PART 4 — THE TWO ISSUES, AND THE PROVENANCE OF THEIR EVIDENCE.
 * ================================================================== */

const ISSUES = `${REPO}runs/audit/verification-issues.jsonl`;
const issueRows = existsSync(ISSUES) ? createJsonlStore(ISSUES).readAll() : [];

test("🔴 REAL: both Issues are UNKNOWN, not FAIL — we cannot know which page is current", { skip: !issueRows.length }, () => {
  const issues = issueRows.filter((r) => r.record_type === "issue");
  assert.equal(issues.length, 2);
  for (const i of issues) {
    assert.equal(i.verdict, "UNKNOWN", `${i.issue_class}: FAIL would be a verdict on OUR value; the question is open`);
    assert.equal(i.state, "OPEN");
    assert.ok(i.evidence.length > 0, "C1: an Issue with no evidence is an opinion");
  }
  assert.deepEqual(
    issues.map((i) => i.issue_class).sort(),
    ["commencement-date-ambiguous-against-source", "official-source-contradicts-itself"],
  );
});

/**
 * 🔴 THE EVIDENCE MUST NOT CLAIM WE READ THE OFFICIAL PAGES. We did not.
 *
 * Every observation behind these Issues is of a verdict ROW that a human
 * returned to us, hashed from bytes we hold. A `method` of "fetch" here, or a
 * content hash attributed to a regulator's page, would be indistinguishable
 * from a real measurement to every later reader — and would be a fabrication.
 */
test("🔴 REAL: every observation is a human-verification return, NOT a page fetch", { skip: !issueRows.length }, () => {
  const obs = issueRows.filter((r) => r.record_type === "observation");
  assert.equal(obs.length, 6);
  for (const o of obs) {
    assert.equal(o.method, "human-verification-return", "the chain of custody must be legible");
    assert.equal(o.target.kind, "artifact");
    assert.match(o.target.ref, /^FACT_VERIFICATION_2026-09-12\.csv#/, "the target is the verdict row we hold");
    assert.ok(!/^https?:/.test(o.target.ref), "🔴 a URL target would claim we retrieved that page");
    assert.match(o.value.verifier, /^human:/);
  }
});

test("🔴 REAL: re-running the recorder duplicates NOTHING — ids are content-derived (C4)", { skip: !issueRows.length }, () => {
  const issues = issueRows.filter((r) => r.record_type === "issue");
  const obs = issueRows.filter((r) => r.record_type === "observation");
  assert.equal(new Set(issues.map((i) => i.issue_id)).size, issues.length, "a duplicate Issue was stacked");
  assert.equal(new Set(obs.map((o) => o.observation_id)).size, obs.length, "a duplicate observation was stacked");
  // A repeat sighting is RECORDED rather than dropped — append-only, C2.
  assert.ok(issueRows.some((r) => r.record_type === "resighting"), "a re-run must leave a trace that it re-checked");
});

/**
 * 🔴 THE BRIEFED FINDING WAS NOT THE REAL ONE, AND THIS PINS THE DIFFERENCE.
 *
 * The brief and the verifier's own note both say the NZ fact omits the 13 July
 * 2026 commencement and the transition for earlier results. The record carries
 * both. Recording the briefed omission would have put a false finding into the
 * store wearing a human verifier's signature.
 */
test("🔴 REAL: the NZ Issue is the date ambiguity, NOT the omission the brief described", { skip: !issueRows.length }, () => {
  const nz = records.find((f) => f.id === "nz-immigration-nz.oet-must-be-taken-in-person");
  assert.match(nz.value.value, /13 July 2026/, "the brief said this date was omitted — it is present");
  assert.match(nz.value.value, /remain usable/, "the brief said the transition was omitted — it is present");
  // And the real defect is still there, uncorrected: two different commencements.
  assert.match(nz.value.value, /midnight on 12 July 2026/);
  assert.match(nz.verification.note, /ONLY FROM 13 JULY 2026/);
  assert.ok(
    issueRows.some((r) => r.issue_class === "commencement-date-ambiguous-against-source"),
    "the real defect must be recorded even though the briefed one was not there",
  );
});
