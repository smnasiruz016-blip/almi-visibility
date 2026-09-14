/**
 * 🔴 ROW 5 — INTENT & QUESTION CLUSTERING. GREEN on the real query pull in the store; every limb RED, ALONE.
 *
 * The frozen contract: INPUT differently worded questions with the same intent · EXPECTED they cluster into one
 * intent, local wording preserved · FAILURE distinct intents merge, or identical intents stay split · EVIDENCE the
 * cluster with its members and a held-out check.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

test("🟢 GREEN: every row-5 limb holds on the real store", () => {
  assert.deepEqual(R.errors, []);
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
  assert.deepEqual(limbs(errs), ["merged"]);
  assert.match(errs[0].why, /pte-result .* \+ daily-habits|daily-habits .* \+ pte-result/);
});

test("🔴 RED: one intent split across two clusters is refused, alone", () => {
  const h = clone(R.heldOut);
  const c = h.inSampleClusters.find((x) => x.members.some((m) => m.original === "bartender cv"));
  const moved = c.members.splice(c.members.findIndex((m) => m.original === "bartender cv"), 1);
  h.inSampleClusters.push({ id: "intent-sabotaged", size: 1, members: moved });
  const errs = check({ heldOut: h });
  assert.deepEqual(limbs(errs), ["split"]);
  assert.match(errs[0].why, /cv-for-occupation is split across 2 clusters/);
});

test("🔴 RED: a member whose original wording was normalised away is refused, alone", () => {
  const record = clone(R.record);
  const m = record.flatMap((c) => c.members).find((x) => x.original === "licenciatura en bilingüismo");
  m.original = normalise(m.original, LEXICON).key.join(" ");
  const errs = check({ record });
  assert.deepEqual(limbs(errs), ["wording-lost"]);
  assert.match(errs[0].why, /is stored as "licenciatura en bilingüismo"/);
});

test("🔴 RED: a held-out check reporting zero misses without having run is refused, alone — not run, run over nothing, or misses hidden", () => {
  assert.deepEqual(limbs(check({ heldOut: { ...R.heldOut, ran: false } })), ["held-out-unrun"]);
  assert.deepEqual(limbs(check({ heldOut: { ...R.heldOut, results: [], hits: 0, misses: 0, unscored: 0, missed: [] } })), ["held-out-unrun"]);
  const hidden = check({ heldOut: { ...R.heldOut, misses: 0, hits: 61, missed: [] } });
  assert.deepEqual(limbs(hidden), ["held-out-unrun"]);
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
  assert.deepEqual(limbs(check({ lexicon })), ["lexicon-held-out-word"]);
});

test("operator kinds are read from FORM: site-only, an exclusion list, an exact phrase — and a plain question is human", () => {
  assert.equal(operatorKind("site:example.org"), "SITE_INSPECTION");
  assert.equal(operatorKind('"x" -site:a.com -site:b.com -site:c.com'), "EXCLUSION_LIST_MONITOR");
  assert.equal(operatorKind('"founded in 1908" university'), "EXACT_PHRASE_LOOKUP");
  assert.equal(operatorKind("how to write a cv"), null);
  const p = splitPopulation([{ query: "a" }, { query: "site:x.org" }]);
  assert.deepEqual([p.human.length, p.operators.length], [1, 1]);
});
