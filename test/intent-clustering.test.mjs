/**
 * 🔴 ROW 5 — INTENT & QUESTION CLUSTERING. Acceptance FAILS on the real query pull, truthfully; every limb RED, ALONE.
 *
 * The frozen contract: INPUT differently worded questions with the same intent · EXPECTED they cluster into one
 * intent, local wording preserved · FAILURE distinct intents merge, or identical intents stay split · EVIDENCE the
 * cluster with its members and a held-out check.
 *
 * 🔴 THIS FILE IS GREEN WHILE ROW 5 IS FAILED, AND THAT IS THE POINT. It asserts what acceptance truthfully says —
 * 8 identical-intent splits, so `--check` exits 1 — together with `classify()[5].state === "FAILED"`. Detector truth
 * is not row state. Nothing here is skipped, tolerated or weakened; the day row 5 legitimately passes, these
 * assertions go red and the row is re-sat with them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { classify } from "../src/checklist/classification.mjs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { row5, QUERY_OBSERVATION } from "../src/discovery/row5.mjs";
import { splitPopulation, populationErrors, operatorKind, hasOperatorSyntax } from "../src/discovery/query-population.mjs";
import { clusteringErrors, compareToReference, isHeldOut, lexiconWordsAbsentFrom, normalise, sha } from "../src/discovery/intent-clusters.mjs";
import { LEXICON } from "../config/discovery/intent-lexicon.mjs";
import { INTENT_REFERENCE, AMBIGUOUS, AMENDMENTS } from "../config/discovery/intent-reference.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RECORDS = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const R = row5({ records: RECORDS, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS });
const HUMAN = R.population.human;
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
/* 🔴 WHAT THE SABOTAGE ADDED, AND NOTHING ELSE — the "alone" claim, kept exactly as strong after D-HELDOUT-1.
 * The real store now genuinely fails acceptance (8 `record-split`), so every check() over it carries that baseline.
 * A sabotage limb is proved ALONE by showing the limbs it ADDS to the baseline are exactly the expected one, and
 * that it REMOVES none. Asserting the raw limb list instead would either go red for the wrong reason or have to be
 * weakened — this weakens nothing, and it still fails on any collateral limb. */
const BASELINE_LIMBS = ["record-split"];
const added = (errs) => limbs(errs).filter((l) => !BASELINE_LIMBS.includes(l));
const kept = (errs) => BASELINE_LIMBS.every((l) => limbs(errs).includes(l));
const lf = (p) => readFileSync(join(REPO, p), "utf8").replace(/\r\n/g, "\n");
const hash = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const check = (over = {}) => clusteringErrors({ humanRows: HUMAN, record: R.record, heldOut: R.heldOut, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS, lexicon: LEXICON, ...over });
const clone = (x) => JSON.parse(JSON.stringify(x));

test("🔴 the reference as FIRST written is kept byte for byte, frozen before any clustering run", () => {
  assert.equal(hash(lf("runs/audit/row5-reference-as-first-written-2026-09-14.mjs.txt")), "626a37ea124cab39e7c40c9417926673377d953573ef5d28ee31aca615c348f3");
});

test("🔴 every change to the reference since is an AMENDMENT naming the rule the original broke — two, both in the clusterer's favour", () => {
  assert.equal(AMENDMENTS.length, 2);
  for (const a of AMENDMENTS) assert.match(a.brokenRule, /^R[1-6] — /);
  const first = lf("runs/audit/row5-reference-as-first-written-2026-09-14.mjs.txt");
  assert.match(first, /"pte-ukvi": I\(/);
  assert.doesNotMatch(lf("config/discovery/intent-reference.mjs"), /"pte-ukvi": I\(/);
});

test("🟢 MEASURED — the input is ONE named pull: 337 rows, 8 operator strings in three kinds, 329 human queries", () => {
  assert.equal(R.input.observationId, QUERY_OBSERVATION);
  assert.equal(R.input.observedAt, "2026-09-12T23:25:03.868Z");
  assert.equal(R.input.rowCount, 337);
  assert.equal(R.population.human.length, 329);
  assert.equal(R.population.operators.length, 8);
  const kinds = {};
  for (const o of R.population.operators) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  assert.deepEqual(kinds, { EXCLUSION_LIST_MONITOR: 3, EXACT_PHRASE_LOOKUP: 1, SITE_INSPECTION: 4 });
  // the law's own syntax test and the classifier agree on every real row
  for (const r of R.population.operators) assert.equal(hasOperatorSyntax(r.query), true, r.query);
  for (const r of HUMAN) assert.equal(hasOperatorSyntax(r.query), false, r.query);
});

test("🟢 MEASURED — the reference places every human query exactly once: 75 intents, 6 ambiguous", () => {
  const placed = [...Object.values(INTENT_REFERENCE).flatMap((i) => i.members), ...Object.keys(AMBIGUOUS)];
  assert.equal(placed.length, 329);
  assert.equal(new Set(placed).size, 329);
  assert.deepEqual([...placed].sort(), HUMAN.map((r) => r.query).sort());
  assert.equal(Object.keys(INTENT_REFERENCE).length, 75);
});

test("🟢 MEASURED — held-out 61 of 329: 49 HIT · 12 MISS · 0 UNSCORED, every miss named; in-sample 268 → 73 clusters, 0 merged, 0 split", () => {
  const h = R.heldOut;
  assert.equal(h.ran, true);
  assert.deepEqual([h.inSample, h.heldOut, h.inSampleClusters.length], [268, 61, 73]);
  assert.deepEqual([h.hits, h.misses, h.unscored], [49, 12, 0]);
  assert.deepEqual(h.missed.map((m) => m.original).sort(), [
    "business intelligence cv", "cardiology cv", "free ielts academic speaking on paper mock test in cameroon", "habits to improve your life",
    "how to make a cv for students with no experience", "ielts and pte academic score comparison", "neurologist resume", "psychologist cv",
    "pte architecture", "pte points to ielts", "pte score for nz residency", "pte to ielts conversion table",
  ]);
  // every miss is the same direction: left NEW although its intent exists in-sample — no held-out query joined a wrong intent
  for (const m of h.missed) assert.equal(m.placedIn, "NEW", m.original);
  const { merged, split } = compareToReference(h.inSampleClusters, INTENT_REFERENCE, AMBIGUOUS);
  assert.deepEqual([merged.length, split.length], [0, 0]);
});

/**
 * 🔴 ROW 5 ACCEPTANCE — D-HELDOUT-1's CORRECTION, AND WHAT IT TRUTHFULLY REPORTS TODAY.
 *
 * This replaces the assertion that once stood here, `assert.deepEqual(R.errors, [])`. That assertion was GREEN while
 * row 5 was FAILED, because the limbs it read judged only the in-sample half of the output. It is not deleted: it is
 * replaced by assertions on what acceptance now says, which is that row 5 fails.
 *
 * 🔴 THE TWO LAYERS, NEVER COLLAPSED — the same numbers appear on row 5's evidence line in CHECKLIST_STATUS.md:
 *   SCORER OBSERVATION        44 evaluated HIT · 12 evaluated MISS · 5 no-comparison-target (NOT substantively
 *                             evaluated — the scorer labels them HIT because no in-sample query carries their intent;
 *                             that representation is the KNOWN-OPEN H3 defect and is NOT corrected here)
 *   FULL-REFERENCE ACCEPTANCE 0 distinct-intent merges · 8 identical-intent splits
 *   RULE-EXCLUDED             6 R6-AMBIGUOUS members, UNEVALUATED-BY-RULE — neither passed nor failed
 * 🔴 The old headline "49 HIT" is NOT a clean hit count and is not used as one. 44 + 12 + 5 = 61 is the held-out base;
 * the 6 R6 members are in-sample, so they are NOT a fourth term of that sum — different base, proved disjoint.
 */
test("🔴 ACCEPTANCE on the real store: 0 merges, 8 identical-intent splits — row 5 FAILS, and the row says so", () => {
  assert.deepEqual(limbs(R.errors), ["record-split"]);
  /* 🔴 PINNED 8. WHERE 8 COMES FROM (measured 17 September 2026): compareToReference over R.record — the in-sample
   * clusters plus every held-out placement — against config/discovery/intent-reference.mjs, one entry per reference
   * intent whose members occupy more than one cluster. WHAT WOULD LEGITIMATELY MOVE IT: a change to the clusterer or
   * its lexicon, a different query observation, or an amendment to the reference. Then re-measure, and re-base this
   * number with the reason recorded HERE — never silently. */
  assert.equal(R.errors.length, 8);
  assert.deepEqual(R.errors.map((e) => e.why.match(/^intent (\S+)/)[1]).sort(), [
    "bilingual-licenciatura", "cv-for-occupation", "cv-no-experience", "daily-habits",
    "ielts-free-practice", "pte-destination-requirement", "pte-for-occupation", "score-equivalence",
  ]);
  // 🔴 THE CASE THE REJECTED `has in-sample members` QUALIFIER COULD NOT SEE: both members are held out, so the
  // scorer called both HIT — and the reference (R5, doubt null) says they are ONE intent. Acceptance sees it.
  const bil = R.errors.find((e) => e.why.startsWith("intent bilingual-licenciatura"));
  assert.ok(bil, "the held-out-only same-intent split is invisible to acceptance again");
  assert.match(bil.why, /licenciatura en bilingüismo/);
  // 🔴 DETECTOR TRUTH IS NOT ROW STATE. Acceptance failing is the CORRECT reading of a row that is FAILED.
  assert.equal(classify()[5].state, "FAILED", "row 5 left FAILED — re-sit this test and the row together");
});

test("🔴 the acceptance command exits non-zero on that failure, and reports the rule-excluded population by name", () => {
  const run = spawnSync(process.execPath, [join(REPO, "bin", "intent-clusters.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(run.status, 1, "--check must fail while row 5 fails acceptance");
  assert.match(run.stdout, /distinct-intent merges: 0 · identical-intent splits: 8/);
  assert.match(run.stdout, /FAILED LIMBS: record-split/);
  // P7 — every R6 member visible, and named as neither passed nor failed
  assert.equal(R.ruleExcluded.members.length, 6);
  assert.equal(R.ruleExcluded.state, "UNEVALUATED-BY-RULE");
  assert.deepEqual(R.ruleExcluded.members, Object.keys(AMBIGUOUS));
  for (const q of R.ruleExcluded.members) assert.ok(run.stdout.includes(`${JSON.stringify(q)} — neither passed nor failed`), q);
});

/**
 * 🔴 THE LIMB IS FAIL-CAPABLE, PROVED BOTH DIRECTIONS, THROUGH THE REAL `clusteringErrors` PATH.
 * Each case rebuilds the record from the REAL members — every store wording kept, so `wording-lost` stays silent and
 * the only thing that varies is which cluster a member sits in. No limb is bypassed and nothing is injected below it.
 */
const byIntent = () => {
  const home = new Map();
  for (const c of R.record) for (const m of c.members) home.set(m.ref, m);
  const groups = new Map();
  for (const [intent, def] of Object.entries(INTENT_REFERENCE)) {
    const ms = def.members.map((q) => home.get(sha(q))).filter(Boolean);
    if (ms.length) groups.set(intent, ms);
  }
  const placed = new Set([...groups.values()].flat().map((m) => m.ref));
  const rest = [...home.values()].filter((m) => !placed.has(m.ref));
  const clusters = [...groups.entries()].map(([intent, members]) => ({ id: `clean:${intent}`, members }));
  if (rest.length) clusters.push({ id: "clean:unreferenced", members: rest });
  return clusters;
};

const FAIL_CAPABILITY = [
  ["P1 CLEAN — one reference intent, one cluster", (cs) => cs, []],
  ["P2 MERGE — two distinct intents in one cluster", (cs) => { const c = clone(cs); c[0].members.push(...c[1].members); c.splice(1, 1); return c; }, ["record-merged"]],
  ["P3 SPLIT — one intent across two clusters", (cs) => { const c = clone(cs); const v = c.find((x) => x.members.length > 1); c.push({ id: "clean:extra", members: [v.members.pop()] }); return c; }, ["record-split"]],
];

// 🔴 PINNED 3 — a filtered or short-circuited table would otherwise prove one direction and claim both (A49).
assert.equal(FAIL_CAPABILITY.length, 3);
let failCapabilityRan = 0;
for (const [name, mutate, expected] of FAIL_CAPABILITY) {
  test(`🔴 ${name}`, () => {
    const errs = check({ record: mutate(byIntent()) }).filter((e) => e.limb.startsWith("record-"));
    assert.deepEqual(limbs(errs), expected, JSON.stringify(errs.map((e) => e.why.slice(0, 90))));
    failCapabilityRan += 1;
  });
}
test("🔴 all three fail-capability cases ran — a limb that does not run its pinned count is refused", () => {
  assert.equal(failCapabilityRan, 3);
});

test("🔴 P8: the held-out count-integrity control is still alive, and P9: acceptance learns nothing from the held-out half", () => {
  const bad = clone(R.heldOut);
  bad.hits -= 1;
  assert.deepEqual(limbs(check({ heldOut: bad })).filter((l) => l === "held-out-unrun"), ["held-out-unrun"]);
  // P9 — the clusterer trains on the in-sample half ALONE, so acceptance is post-output evaluation, never learning.
  assert.equal(R.heldOut.inSample, 268);
  assert.equal(R.heldOut.inSampleClusters.some((c) => c.members.some((m) => isHeldOut(m.original))), false);
});

test("🔴 P10: row 3 is untouched by this correction and stays VERIFIED-PASS", () => {
  assert.equal(classify()[3].state, "VERIFIED-PASS");
});

test("🟢 local wording PRESERVED: every record member's original equals its store row byte for byte, and the record holds all 329 once", () => {
  const byRef = new Map(HUMAN.map((r) => [sha(r.query), r.query]));
  const members = R.record.flatMap((c) => c.members);
  assert.equal(members.length, 329);
  for (const m of members) assert.equal(m.original, byRef.get(m.ref));
  // a real family with a numeric variable inside it: one cluster, every wording kept, the numbers kept as slot values
  const family = ["47 pte score in ielts", "49 pte to ielts", "50 pte to ielts", "50 score in pte equal to ielts", "52 pte to ielts", "6.5 band in pte"];
  const homes = new Set(family.map((q) => R.record.find((c) => c.members.some((m) => m.original === q)).id));
  assert.equal(homes.size, 1);
  const home = R.record.find((c) => c.id === [...homes][0]);
  for (const v of ["47", "49", "50", "52", "6.5"]) assert.ok(home.slots.number.includes(v), v);
  assert.match(home.slotRulings.number.ruling, /'47' and '65' are the same intent with different slot values/);
  assert.equal(home.slotRulings.number.inKey, false);
});

test("🔴 the lexicon law: no word in it occurs only in held-out queries", () => {
  assert.deepEqual(lexiconWordsAbsentFrom(LEXICON, HUMAN.filter((r) => !isHeldOut(r.query))), []);
});

test("🔴 RED: two distinct intents merged into one cluster is refused, alone", () => {
  const h = clone(R.heldOut);
  const a = h.inSampleClusters.find((c) => c.members.some((m) => m.original === "pte result"));
  const b = h.inSampleClusters.find((c) => c.members.some((m) => m.original === "daily habits"));
  a.members.push(...b.members);
  h.inSampleClusters = h.inSampleClusters.filter((c) => c !== b);
  const errs = check({ heldOut: h });
  assert.deepEqual(added(errs), ["merged"]); assert.ok(kept(errs));
  assert.match(errs[0].why, /pte-result .* \+ daily-habits|daily-habits .* \+ pte-result/);
});

test("🔴 RED: one intent split across two clusters is refused, alone", () => {
  const h = clone(R.heldOut);
  const c = h.inSampleClusters.find((x) => x.members.some((m) => m.original === "bartender cv"));
  const moved = c.members.splice(c.members.findIndex((m) => m.original === "bartender cv"), 1);
  h.inSampleClusters.push({ id: "intent-sabotaged", size: 1, members: moved });
  const errs = check({ heldOut: h });
  assert.deepEqual(added(errs), ["split"]); assert.ok(kept(errs));
  assert.match(errs[0].why, /cv-for-occupation is split across 2 clusters/);
});

test("🔴 RED: a member whose original wording was normalised away is refused, alone", () => {
  const record = clone(R.record);
  const m = record.flatMap((c) => c.members).find((x) => x.original === "licenciatura en bilingüismo");
  m.original = normalise(m.original, LEXICON).key.join(" ");
  const errs = check({ record });
  assert.deepEqual(added(errs), ["wording-lost"]); assert.ok(kept(errs));
  assert.match(errs[0].why, /is stored as "licenciatura en bilingüismo"/);
});

test("🔴 RED: a held-out check reporting zero misses without having run is refused, alone — not run, run over nothing, or misses hidden", () => {
  assert.deepEqual(added(check({ heldOut: { ...R.heldOut, ran: false } })), ["held-out-unrun"]);
  assert.deepEqual(added(check({ heldOut: { ...R.heldOut, results: [], hits: 0, misses: 0, unscored: 0, missed: [] } })), ["held-out-unrun"]);
  const hidden = check({ heldOut: { ...R.heldOut, misses: 0, hits: 61, missed: [] } });
  assert.deepEqual(added(hidden), ["held-out-unrun"]); assert.ok(kept(hidden));
  assert.match(hidden[0].why, /its own results say 49 · 12 · 0/);
});

test("🔴 RED: an operator query counted inside the human population is refused, alone — and so is a row dropped from both", () => {
  const rows = R.population.human.concat(R.population.operators.map(({ kind, form, inference, ...row }) => row));
  const site = R.population.operators.find((o) => o.kind === "SITE_INSPECTION");
  const human = [...R.population.human, site];
  const operators = R.population.operators.filter((o) => o !== site);
  const errs = populationErrors({ rows, human, operators });
  assert.deepEqual(limbs(errs), ["operator-in-population"]);
  assert.match(errs[0].why, /site:/);
  const dropped = populationErrors({ rows, human: R.population.human, operators: operators });
  assert.deepEqual(limbs(dropped), ["row-dropped"]);
});

test("🔴 RED: a lexicon word taken from a held-out query is refused, alone", () => {
  const lexicon = { ...LEXICON, synonyms: { ...LEXICON.synonyms, neurologist: "cv" } };
  assert.deepEqual(added(check({ lexicon })), ["lexicon-held-out-word"]);
});

test("operator kinds are read from FORM: site-only, an exclusion list, an exact phrase — and a plain question is human", () => {
  assert.equal(operatorKind("site:example.org"), "SITE_INSPECTION");
  assert.equal(operatorKind('"x" -site:a.com -site:b.com -site:c.com'), "EXCLUSION_LIST_MONITOR");
  assert.equal(operatorKind('"founded in 1908" university'), "EXACT_PHRASE_LOOKUP");
  assert.equal(operatorKind("how to write a cv"), null);
  const p = splitPopulation([{ query: "a" }, { query: "site:x.org" }]);
  assert.deepEqual([p.human.length, p.operators.length], [1, 1]);
});
