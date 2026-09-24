/**
 * 🔴 ROW 5 — INTENT & QUESTION CLUSTERING.
 *
 * Rewritten 22 September 2026 under the RETIRED_CONTAMINATED rulings (_handoffs a5452ee, clarified by f4367b1): the Row 5
 * held-out population and the reference placement that scored it are retired. This file names no real query and no real
 * expected label.
 *
 * TWO KINDS OF TEST, NEVER MIXED:
 *   REAL — the production path over the real store. The population, the clustering and the record still run; SCORING IS
 *          REFUSED BY NAME (HELD_OUT_REFERENCE_RETIRED), and nothing here is a pass. Counts, outcome categories and
 *          reconciliation only.
 *   SYNTHETIC — NOT REAL EVIDENCE. The scoring MECHANISM, proved on generated nonsense corpora from
 *          test/support/synthetic-queries.mjs (its RULE). SEEDS: 7101 (scoring and its refusal), 7102 (limbs), 7103
 *          (lexicon law), 7104 (operator forms). A synthetic test proves a mechanism, never real-world effectiveness.
 */
import test from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { classify } from "../src/checklist/classification.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { row5, QUERY_OBSERVATION } from "../src/discovery/row5.mjs";
import { splitPopulation, populationErrors, operatorKind, hasOperatorSyntax } from "../src/discovery/query-population.mjs";
import { clusteringErrors, heldOutCheck, buildRecord, isHeldOut, lexiconWordsAbsentFrom, normalise, sha, REFERENCE_REFUSALS } from "../src/discovery/intent-clusters.mjs";
import { LEXICON } from "../subjects/almiworld-estate/config/intent-lexicon.mjs";
import { INTENT_REFERENCE, AMBIGUOUS, REFERENCE_STATUS } from "../config/discovery/intent-reference.mjs";
import { syntheticCorpus, EVIDENCE_CLASS } from "./support/synthetic-queries.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RECORDS = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const R = row5({ records: RECORDS, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS, referenceStatus: REFERENCE_STATUS });
const HUMAN = R.population.human;
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ═════════ REAL ═════════ */

test("🟢 REAL — the input is ONE named pull: 337 rows, 8 operator strings in three kinds, 329 human queries", () => {
  assert.equal(R.input.observationId, QUERY_OBSERVATION);
  assert.equal(R.input.observedAt, "2026-09-12T23:25:03.868Z");
  assert.equal(R.input.rowCount, 337);
  assert.equal(R.population.human.length, 329);
  assert.equal(R.population.operators.length, 8);
  const kinds = {};
  for (const o of R.population.operators) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  assert.deepEqual(kinds, { EXCLUSION_LIST_MONITOR: 3, EXACT_PHRASE_LOOKUP: 1, SITE_INSPECTION: 4 });
  for (const r of R.population.operators) assert.equal(hasOperatorSyntax(r.query), true);
  for (const r of HUMAN) assert.equal(hasOperatorSyntax(r.query), false);
});

test("🔴 REAL — SCORING IS REFUSED BY NAME: HELD_OUT_REFERENCE_RETIRED, never zero defects, never a pass — and row 5 stays FAILED", () => {
  assert.deepEqual(R.scoring, { state: "REFUSED", code: "HELD_OUT_REFERENCE_RETIRED", why: REFERENCE_REFUSALS.HELD_OUT_REFERENCE_RETIRED });
  assert.deepEqual(limbs(R.errors), ["scoring-refused"]);
  assert.equal(R.errors[0].code, "HELD_OUT_REFERENCE_RETIRED");
  // every held-out row is UNSCORED by name — none is a HIT because nothing could say it missed
  assert.deepEqual([R.heldOut.hits, R.heldOut.misses, R.heldOut.unscored, R.heldOut.heldOut], [0, 0, 61, 61]);
  for (const x of R.heldOut.results) assert.ok(x.verdict === "UNSCORED" && x.why.startsWith("HELD_OUT_REFERENCE_RETIRED"));
  assert.equal(R.splitCauses, null);
  assert.equal(classify()[5].state, "FAILED");
});

test("🟢 REAL — clustering still runs, blind to the reference: 268 in-sample → 73 clusters; the record holds all 329 in 90 clusters", () => {
  assert.deepEqual([R.heldOut.inSample, R.heldOut.inSampleClusters.length], [268, 73]);
  assert.equal(R.record.length, 90);
  assert.equal(R.record.reduce((n, c) => n + c.size, 0), 329);
});

test("🟢 REAL — local wording PRESERVED: every record member's original equals its store row byte for byte, each exactly once", () => {
  const byRef = new Map(HUMAN.map((r) => [sha(r.query), r.query]));
  const members = R.record.flatMap((c) => c.members);
  assert.equal(members.length, 329);
  assert.equal(new Set(members.map((m) => m.ref)).size, 329);
  for (const m of members) assert.equal(m.original, byRef.get(m.ref));
});

test("🔴 REAL — the lexicon law: no word in it occurs only outside the in-sample queries", () => {
  assert.deepEqual(lexiconWordsAbsentFrom(LEXICON, HUMAN.filter((r) => !isHeldOut(r.query))), []);
});

test("🔴 REAL — the retired reference holds no expected answer; its first-written copy survives only as a tombstone", () => {
  assert.equal(INTENT_REFERENCE, null);
  assert.equal(AMBIGUOUS, null);
  assert.deepEqual([REFERENCE_STATUS.state, REFERENCE_STATUS.role, REFERENCE_STATUS.retiredSetFingerprint, REFERENCE_STATUS.population], ["HELD_OUT_REFERENCE_RETIRED", "RETIRED_CONTAMINATED", "3d4951d6673301bc", 61]);
  const tomb = readFileSync(join(REPO, "runs", "audit", "row5-reference-as-first-written-2026-09-14.mjs.txt"), "utf8");
  assert.match(tomb, /^TOMBSTONE — RETIRED_CONTAMINATED HELD-OUT PAYLOAD REMOVED FROM THE WORKING TREE/);
  assert.match(tomb, /original blob {8}5c2e3bd4423d/);
  assert.match(tomb, /REPRODUCIBLE ONLY FROM GIT HISTORY, NOT FROM THE\n {2}WORKING TREE/);
});

test("🔴 REAL — the acceptance command exits non-zero and names the refusal, from the production path", () => {
  const run = spawnSync(process.execPath, WORLD.argv([join(REPO, "bin", "intent-clusters.mjs"), "--check", "--subject=almiworld-estate"]), { encoding: "utf8", env: WORLD.envWith() });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /SCORING REFUSED: HELD_OUT_REFERENCE_RETIRED/);
  assert.match(run.stdout, /NOT MEASURED — HELD_OUT_REFERENCE_RETIRED/);
  assert.match(run.stdout, /HIT 0 · MISS 0 · UNSCORED 61/);
  assert.match(run.stdout, /FAILED LIMBS: scoring-refused/);
});

test("🔴 REAL — an operator query counted inside the human population is refused, alone — and so is a row dropped from both", () => {
  const rowsAll = R.population.human.concat(R.population.operators.map(({ kind, form, inference, ...row }) => row));
  const site = R.population.operators.find((o) => o.kind === "SITE_INSPECTION");
  const errs = populationErrors({ rows: rowsAll, human: [...R.population.human, site], operators: R.population.operators.filter((o) => o !== site) });
  assert.deepEqual(limbs(errs), ["operator-in-population"]);
  assert.match(errs[0].why, /site:/);
  assert.deepEqual(limbs(populationErrors({ rows: rowsAll, human: R.population.human, operators: R.population.operators.filter((o) => o !== site) })), ["row-dropped"]);
});

/* ═════════ SYNTHETIC — NOT REAL EVIDENCE ═════════ */

const S = syntheticCorpus({ seed: 7101, intents: 8, queriesPerIntent: 8 });
const run = (reference, referenceStatus, ambiguous = {}) => {
  const h = heldOutCheck(S.rows, S.lexicon, reference, ambiguous, { referenceStatus });
  const record = buildRecord(S.rows, h, S.lexicon);
  return { h, record, errs: clusteringErrors({ humanRows: S.rows, record, heldOut: h, reference, ambiguous, lexicon: S.lexicon, referenceStatus }) };
};

test(`SYNTHETIC · seed 7101 · ${EVIDENCE_CLASS} — WITH a lawful reference, scoring RUNS: every held-out row is scored HIT or MISS`, () => {
  const { h, errs } = run(S.reference);
  assert.ok(h.heldOut > 0, "the generated corpus must hold some rows out");
  assert.deepEqual(h.scoring, { state: "SCORED" });
  assert.equal(h.unscored, 0);
  assert.equal(h.hits + h.misses, h.heldOut);
  assert.equal(limbs(errs).includes("scoring-refused"), false);
});

for (const [name, ref, status, code] of [
  ["null + a retirement status", null, { state: "HELD_OUT_REFERENCE_RETIRED" }, "HELD_OUT_REFERENCE_RETIRED"],
  ["null, no status", null, undefined, "HELD_OUT_REFERENCE_ABSENT"],
  ["an empty object", {}, undefined, "HELD_OUT_REFERENCE_ABSENT"],
  ["intents with no members", { a: { members: [] } }, undefined, "HELD_OUT_REFERENCE_ABSENT"],
]) {
  test(`SYNTHETIC · seed 7101 — WITHOUT a lawful reference (${name}): the named refusal ${code}, never zero defects, never a HIT`, () => {
    const { h, errs } = run(ref, status);
    assert.deepEqual(h.scoring, { state: "REFUSED", code, why: REFERENCE_REFUSALS[code] });
    assert.ok(errs.length > 0, "an unscoreable population reported zero defects");
    assert.ok(limbs(errs).includes("scoring-refused"));
    assert.equal(errs.find((e) => e.limb === "scoring-refused").code, code);
    for (const l of ["merged", "split", "record-merged", "record-split"]) assert.equal(limbs(errs).includes(l), false, l);
    assert.deepEqual([h.hits, h.misses, h.unscored], [0, 0, h.heldOut]);
  });
}

const byIntent = (record, reference) => {
  const home = new Map(record.flatMap((c) => c.members.map((m) => [m.ref, m])));
  return Object.entries(reference).map(([id, i]) => ({ id: `clean:${id}`, members: i.members.map((q) => home.get(sha(q))).filter(Boolean) })).filter((c) => c.members.length);
};

for (const [name, mutate, expected] of [
  ["P1 CLEAN — one reference intent, one cluster", (cs) => cs, []],
  ["P2 MERGE — two distinct intents in one cluster", (cs) => { const c = clone(cs); c[0].members.push(...c[1].members); c.splice(1, 1); return c; }, ["record-merged"]],
  ["P3 SPLIT — one intent across two clusters", (cs) => { const c = clone(cs); const v = c.find((x) => x.members.length > 1); c.push({ id: "clean:extra", members: [v.members.pop()] }); return c; }, ["record-split"]],
]) {
  test(`SYNTHETIC · seed 7102 — the record limbs are fail-capable: ${name}`, () => {
    const T = syntheticCorpus({ seed: 7102 });
    const h = heldOutCheck(T.rows, T.lexicon, T.reference, {});
    const record = mutate(byIntent(buildRecord(T.rows, h, T.lexicon), T.reference));
    const errs = clusteringErrors({ humanRows: T.rows, record, heldOut: h, reference: T.reference, ambiguous: {}, lexicon: T.lexicon }).filter((e) => e.limb.startsWith("record-"));
    assert.deepEqual(limbs(errs), expected);
  });
}

test("SYNTHETIC · seed 7102 — merged, split and wording-lost limbs each fire alone on the generated corpus", () => {
  const T = syntheticCorpus({ seed: 7102 });
  const h = heldOutCheck(T.rows, T.lexicon, T.reference, {});
  const record = buildRecord(T.rows, h, T.lexicon);
  const check = (over) => clusteringErrors({ humanRows: T.rows, record, heldOut: h, reference: T.reference, ambiguous: {}, lexicon: T.lexicon, ...over });
  const base = new Set(limbs(check({})));
  const added = (errs) => limbs(errs).filter((l) => !base.has(l));
  const hm = clone(h);
  hm.inSampleClusters[0].members.push(...hm.inSampleClusters[1].members);
  hm.inSampleClusters.splice(1, 1);
  assert.deepEqual(added(check({ heldOut: hm })), ["merged"]);
  const hs = clone(h);
  const big = hs.inSampleClusters.find((c) => c.members.length > 1);
  hs.inSampleClusters.push({ id: "intent-sabotaged", size: 1, members: [big.members.pop()] });
  assert.deepEqual(added(check({ heldOut: hs })), ["split"]);
  const rw = clone(record);
  rw[0].members[0].original = normalise(rw[0].members[0].original, T.lexicon).key.join(" ") + " x";
  assert.deepEqual(added(check({ record: rw })), ["wording-lost"]);
});

test("SYNTHETIC · seed 7102 — a held-out check not run, run over nothing, or miscounted is refused", () => {
  const T = syntheticCorpus({ seed: 7102 });
  const h = heldOutCheck(T.rows, T.lexicon, T.reference, {});
  const record = buildRecord(T.rows, h, T.lexicon);
  const check = (heldOut) => limbs(clusteringErrors({ humanRows: T.rows, record, heldOut, reference: T.reference, ambiguous: {}, lexicon: T.lexicon }));
  assert.ok(check({ ...h, ran: false }).includes("held-out-unrun"));
  assert.ok(check({ ...h, results: [], hits: 0, misses: 0, unscored: 0, missed: [] }).includes("held-out-unrun"));
  assert.ok(check({ ...h, hits: h.hits + 1 }).includes("held-out-unrun"));
});

test("SYNTHETIC · seed 7103 — a lexicon word no in-sample query contains is refused", () => {
  const T = syntheticCorpus({ seed: 7103 });
  const unseen = syntheticCorpus({ seed: 7199 }).lexicon.filler[0]; // a generated word from another seed, absent here
  assert.equal(T.rows.some((r) => r.query.split(" ").includes(unseen)), false);
  const lexicon = { ...T.lexicon, synonyms: { [unseen]: "x" } };
  assert.deepEqual(lexiconWordsAbsentFrom(lexicon, T.rows.filter((r) => !isHeldOut(r.query))), [unseen]);
});

test("SYNTHETIC · seed 7103 — a number inside a query is a slot value, never part of the key", () => {
  const T = syntheticCorpus({ seed: 7103 });
  const [a, b] = normalise(T.rows[0].query, T.lexicon).key;
  const k1 = normalise(`${a} ${b} 47`, T.lexicon), k2 = normalise(`${a} ${b} 65`, T.lexicon);
  assert.deepEqual(k1.key, k2.key);
  assert.deepEqual([k1.slots, k2.slots], [[{ type: "number", value: "47" }], [{ type: "number", value: "65" }]]);
});

test("SYNTHETIC · seed 7104 — operator kinds are read from FORM, on generated strings", () => {
  const g = syntheticCorpus({ seed: 7104 }).lexicon.filler;
  assert.equal(operatorKind(`site:${g[0]}.org`), "SITE_INSPECTION");
  assert.equal(operatorKind(`"${g[0]}" -site:${g[1]}.com -site:${g[2]}.com -site:${g[0]}.net`), "EXCLUSION_LIST_MONITOR");
  assert.equal(operatorKind(`"${g[0]} ${g[1]}" ${g[2]}`), "EXACT_PHRASE_LOOKUP");
  assert.equal(operatorKind(`${g[0]} ${g[1]}`), null);
  const p = splitPopulation([{ query: g[0] }, { query: `site:${g[1]}.org` }]);
  assert.deepEqual([p.human.length, p.operators.length], [1, 1]);
});
