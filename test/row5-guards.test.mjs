/**
 * 🔴 ROW 5 — THE GUARDS AROUND THE CLUSTERER (22 September 2026). GUARD, NOT EVIDENCE.
 *
 * Row 5 stays FAILED: no generic mechanism measured on 22 September was eligible (runs/audit/row5-feasibility-2026-09-22.txt).
 * What this file proves is that the clusterer cannot be made to look better than it is:
 *   · every remaining split is VISIBLE with a named reason code, and an unknown word stays UNKNOWN;
 *   · an empty or unscorable population is a failure, not a pass;
 *   · the output is byte-identical under any reordering of its input;
 *   · fitting reads neither the reference nor the held-out rows;
 *   · the §6 controls: a join needs a structural relation; surface likeness, a shared rare word, an edit-near word, a
 *     bilingual pair with no declared relation, a weaker competing family and a transitive chain all stay apart.
 * The controls marked FIXTURE use invented strings and a two-line lexicon; they are never Row 5's evidence.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { classify } from "../src/checklist/classification.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { row5, QUERY_OBSERVATION } from "../src/discovery/row5.mjs";
import { clusterIntents, clusteringErrors, heldOutCheck, buildRecord, place, idfOf, normalise, isHeldOut, sha, SPLIT_CAUSES } from "../src/discovery/intent-clusters.mjs";
import { LEXICON } from "../config/discovery/intent-lexicon.mjs";
import { INTENT_REFERENCE, AMBIGUOUS } from "../config/discovery/intent-reference.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RECORDS = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const run5 = (records = RECORDS) => row5({ records, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS });
const R = run5();
const HUMAN = R.population.human;
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const withRows = (rows) => RECORDS.map((r) => (r.record_type === "observation" && r.observation_id === QUERY_OBSERVATION ? { ...r, value: { ...r.value, rows } } : r));
const OBS_ROWS = RECORDS.find((r) => r.record_type === "observation" && r.observation_id === QUERY_OBSERVATION).value.rows;

/* ═════════ THE REMAINING SPLITS, VISIBLE ═════════ */

test("🔴 REAL — every remaining split carries a named reason code; an unknown word is listed and left UNKNOWN", () => {
  const got = R.splitCauses.map((s) => [s.intent, s.inSample, s.heldOut, s.codes, s.apart.map((a) => [a.original, a.codes, a.unknownTokens])]);
  assert.deepEqual(got, [
    ["bilingual-licenciatura", 0, 2, ["SPLIT_NO_IN_SAMPLE_MEMBER", "SPLIT_UNKNOWN_TOKEN"], [
      ["licenciatura en bilingüismo", ["SPLIT_NO_IN_SAMPLE_MEMBER", "SPLIT_UNKNOWN_TOKEN"], ["bilinguismo"]],
      ["licenciatura en bilingüismo con énfasis en inglés", ["SPLIT_NO_IN_SAMPLE_MEMBER", "SPLIT_UNKNOWN_TOKEN"], ["bilinguismo", "con", "enfasis"]]]],
    ["cv-for-occupation", 24, 5, ["SPLIT_UNKNOWN_TOKEN"], [
      ["business intelligence cv", ["SPLIT_UNKNOWN_TOKEN"], ["intelligence"]], ["cardiology cv", ["SPLIT_UNKNOWN_TOKEN"], ["cardiology"]],
      ["neurologist resume", ["SPLIT_UNKNOWN_TOKEN"], ["neurologist"]], ["psychologist cv", ["SPLIT_UNKNOWN_TOKEN"], ["psychologist"]]]],
    ["cv-no-experience", 10, 2, ["SPLIT_UNKNOWN_TOKEN"], [["how to make a cv for students with no experience", ["SPLIT_UNKNOWN_TOKEN"], ["students"]]]],
    ["daily-habits", 23, 2, ["SPLIT_UNKNOWN_TOKEN"], [["habits to improve your life", ["SPLIT_UNKNOWN_TOKEN"], ["your"]]]],
    ["ielts-free-practice", 2, 1, ["SPLIT_UNKNOWN_TOKEN"], [["free ielts academic speaking on paper mock test in cameroon", ["SPLIT_UNKNOWN_TOKEN"], ["mock", "paper", "speaking"]]]],
    ["pte-destination-requirement", 4, 2, ["SPLIT_UNKNOWN_TOKEN"], [["pte score for nz residency", ["SPLIT_UNKNOWN_TOKEN"], ["nz", "residency"]]]],
    ["pte-for-occupation", 1, 2, ["SPLIT_UNKNOWN_TOKEN"], [["pte architecture", ["SPLIT_UNKNOWN_TOKEN"], ["architecture"]]]],
    ["score-equivalence", 83, 30, ["SPLIT_UNKNOWN_TOKEN"], [
      ["ielts and pte academic score comparison", ["SPLIT_UNKNOWN_TOKEN"], ["comparison"]], ["pte points to ielts", ["SPLIT_UNKNOWN_TOKEN"], ["points"]],
      ["pte to ielts conversion table", ["SPLIT_UNKNOWN_TOKEN"], ["table"]]]],
  ]);
  // the causes cover exactly the splits acceptance reports — no split without a cause, no cause without a split
  assert.deepEqual(R.splitCauses.map((s) => s.intent), R.errors.filter((e) => e.limb === "record-split").map((e) => e.why.match(/^intent (\S+)/)[1]).sort());
  // only named codes, and a code never names what a word means
  for (const s of R.splitCauses) for (const a of s.apart) for (const c of a.codes) assert.ok(Object.hasOwn(SPLIT_CAUSES, c), c);
});

test("🔴 the causes change nothing: the record, the errors and the held-out verdicts are those the clusterer produced", () => {
  assert.deepEqual(limbs(R.errors), ["record-split"]);
  assert.equal(R.errors.length, 8);
  assert.deepEqual([R.heldOut.hits, R.heldOut.misses, R.heldOut.unscored], [49, 12, 0]);
});

test("🔴 the runner prints every remaining split with its code, from the production path", () => {
  const out = spawnSync(process.execPath, [join(REPO, "bin", "intent-clusters.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(out.status, 1);
  assert.match(out.stdout, /SPLIT CAUSES — 8 split intent\(s\)/);
  for (const s of R.splitCauses) assert.ok(out.stdout.includes(`  ${s.intent} · in-sample ${s.inSample} · held out ${s.heldOut} · ${s.codes.join(" · ")}`), s.intent);
  assert.match(out.stdout, /"how to make a cv for students with no experience" — SPLIT_UNKNOWN_TOKEN · UNKNOWN: students/);
});

/* ═════════ AN EMPTY POPULATION IS NOT A PASS ═════════ */

test("🔴 an empty human population is refused, even with no lexicon to trip the lexicon law", () => {
  const h = heldOutCheck([], LEXICON, INTENT_REFERENCE, AMBIGUOUS);
  const errs = clusteringErrors({ humanRows: [], record: buildRecord([], h, LEXICON), heldOut: h, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS });
  assert.deepEqual(limbs(errs), ["empty-population"]);
  // its OWN branch, not the scored-population branch below it: the reason names the missing rows
  assert.match(errs[0].why, /^no human query row was given/);
});

test("🔴 a scored population of 0 — every row ambiguous — is refused, where it once returned no error at all", () => {
  const allAmb = Object.fromEntries(HUMAN.map((r) => [r.query, "control: all ambiguous"]));
  const h = heldOutCheck(HUMAN, LEXICON, INTENT_REFERENCE, allAmb);
  const errs = clusteringErrors({ humanRows: HUMAN, record: buildRecord(HUMAN, h, LEXICON), heldOut: h, reference: INTENT_REFERENCE, ambiguous: allAmb, lexicon: LEXICON });
  assert.deepEqual(limbs(errs), ["empty-population"]);
});

test("🟢 the real population is not empty: 329 human, 323 scored — the limb stays silent on it", () => {
  assert.equal(limbs(R.errors).includes("empty-population"), false);
  assert.equal(HUMAN.length, 329);
  assert.equal(HUMAN.filter((r) => !Object.hasOwn(AMBIGUOUS, r.query)).length, 323);
});

/* ═════════ DETERMINISM, MEASURED ═════════ */

test("🔴 the production path twice, over the store's order and over two reorderings, is BYTE-IDENTICAL", () => {
  const body = (r) => JSON.stringify({ record: r.record, errors: r.errors, heldOut: r.heldOut, splitCauses: r.splitCauses, ruleExcluded: r.ruleExcluded });
  const a = body(R);
  assert.equal(body(run5(withRows([...OBS_ROWS].reverse()))), a, "reversed input changed the output");
  assert.equal(body(run5(withRows([...OBS_ROWS.slice(100), ...OBS_ROWS.slice(0, 100)]))), a, "rotated input changed the output");
});

/* ═════════ FITTING READS NEITHER THE REFERENCE NOR THE HELD-OUT ROWS ═════════ */

test("🔴 REFERENCE-LEAK CENSUS — the clusterer's module imports no reference, and fitting is identical under a scrambled one", () => {
  const src = readFileSync(join(REPO, "src", "discovery", "intent-clusters.mjs"), "utf8");
  assert.deepEqual([...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]), ["node:crypto"]);
  /* 🔴 The alternates must CHANGE THE PARTITION the reference draws. Renaming intents, or rotating member lists between
   * names, keeps every grouping intact, and a leak that compares two rows' intents cannot be seen through it — a
   * sabotage proved exactly that (22 Sep 2026). So: no reference at all, and every row in ONE intent. */
  const everyRowOneIntent = { all: { members: Object.values(INTENT_REFERENCE).flatMap((v) => v.members) } };
  const fit = (ref) => { const h = heldOutCheck(HUMAN, LEXICON, ref, AMBIGUOUS); return JSON.stringify({ c: h.inSampleClusters, p: h.results.map((r) => [r.ref, r.placedIn, r.similarity]) }); };
  const real = fit(INTENT_REFERENCE);
  assert.equal(fit({}), real, "clustering or placement moved when the reference was removed — the reference is read during fitting");
  assert.equal(fit(everyRowOneIntent), real, "clustering or placement moved when the reference was collapsed — the reference is read during fitting");
});

test("🔴 HELD-OUT INTEGRITY — the in-sample clusters are the same with the held-out rows present or removed, and hold none of them", () => {
  const train = HUMAN.filter((r) => !isHeldOut(r.query));
  assert.equal(JSON.stringify(clusterIntents(train, LEXICON)), JSON.stringify(R.heldOut.inSampleClusters));
  assert.equal(R.heldOut.inSampleClusters.some((c) => c.members.some((m) => isHeldOut(m.original))), false);
});

/* ═════════ §6 — THREE WORLDS, AND THE CONTROLS (FIXTURE) ═════════ */

const FX = { phrases: [], synonyms: {}, filler: ["to", "the", "for"], slotTypes: {}, exclusive: [["alpha", "beta"]] };
const rows = (...qs) => qs.map((query) => ({ query, impressions: 1, clicks: 0 }));
const together = (cs, a, b) => cs.some((c) => c.members.some((m) => m.original === a) && c.members.some((m) => m.original === b));
const nearest = (q, cs) => place(q, cs, FX, idfOf(cs.flatMap((c) => c.members.map((m) => m.key))));

test("FIXTURE · world A — same intent, a structural relation (word order and filler) → JOIN", () => {
  const cs = clusterIntents(rows("alpha price list", "price list for the alpha", "gamma route"), FX);
  assert.ok(together(cs, "alpha price list", "price list for the alpha"));
});

test("FIXTURE · world B — different intent despite surface likeness (declared exclusive entities) → KEEP SEPARATE", () => {
  const cs = clusterIntents(rows("alpha price list", "beta price list"), FX);
  assert.equal(together(cs, "alpha price list", "beta price list"), false);
});

test("FIXTURE · world C — no structural relation → UNKNOWN: NO JOIN (placed NEW)", () => {
  const cs = clusterIntents(rows("alpha price list", "alpha price list"), FX);
  assert.equal(nearest("delta harbour tide", cs).id, "NEW");
  /* 🔴 THE CASE THAT MAKES C A THIRD STATE: a query that SHARES a word — a real but ambiguous relationship, similarity
   * above 0 and below the threshold. A zero-overlap query cannot tell "ambiguity stays apart" from "ambiguity joins",
   * because its best cluster scores 0 either way; a sabotage proved that (22 Sep 2026). This one can. */
  const p = nearest("alpha harbour tide", cs);
  assert.ok(p.avg > 0 && p.avg < 0.5, `the control must be ambiguous, not unrelated: ${p.avg}`);
  assert.equal(p.id, "NEW");
});

test("FIXTURE · subset wording, different intent: the shorter key inside the longer does not pull it in", () => {
  const cs = clusterIntents(rows("visa fee", "visa fee"), FX);
  assert.equal(nearest("visa fee refund deadline", cs).id, "NEW");
});

test("FIXTURE · the same rare anchor, different intents, stay apart", () => {
  const cs = clusterIntents(rows("zeta course harbour", "omega exam harbour"), FX);
  assert.equal(together(cs, "zeta course harbour", "omega exam harbour"), false);
});

test("FIXTURE · edit-near words with different meanings stay apart — no fuzzy matching joins them", () => {
  const cs = clusterIntents(rows("reading tips", "leading tips"), FX);
  assert.equal(together(cs, "reading tips", "leading tips"), false);
});

test("FIXTURE · bilingual surface forms with no declared relation stay apart", () => {
  const cs = clusterIntents(rows("licence fee", "licencia fee"), FX);
  assert.equal(together(cs, "licence fee", "licencia fee"), false);
});

test("FIXTURE · a nearest neighbour broken by a better competing family: the query goes to the better one", () => {
  const cs = clusterIntents(rows("kappa lambda", "kappa lambda", "kappa lambda sigma", "kappa lambda sigma"), FX);
  const better = cs.find((c) => c.members.some((m) => m.original === "kappa lambda sigma"));
  assert.equal(nearest("kappa lambda sigma", cs).id, better.id);
});

test("FIXTURE · a transitive chain whose endpoints differ does not close into one cluster", () => {
  const cs = clusterIntents(rows("pa pb pc", "pb pc pd", "pc pd pe"), FX);
  assert.equal(together(cs, "pa pb pc", "pc pd pe"), false);
});

test("🟢 operator rows are unchanged: the 8 store operator strings are kept verbatim and none enters the record", () => {
  assert.equal(R.population.operators.length, 8);
  for (const o of R.population.operators) assert.ok(OBS_ROWS.some((r) => r.query === o.query));
  const inRecord = new Set(R.record.flatMap((c) => c.members.map((m) => m.ref)));
  for (const o of R.population.operators) assert.equal(inRecord.has(sha(o.query)), false, o.query);
});

/* ═════════ RUNTIME, AND THE LEDGER ═════════ */

test("🟢 RUNTIME — the production path over the measured population (329 human rows) completes within 10 s", () => {
  const t0 = process.hrtime.bigint();
  run5();
  assert.ok(Number(process.hrtime.bigint() - t0) / 1e9 < 10);
});

test("🔴 row 5 stays FAILED, its blocker named and its unlock condition checkable by one command", () => {
  const row = classify()[5];
  assert.equal(row.state, "FAILED");
  assert.match(row.blocker, /^ENGINE_CAPABILITY_GAP \+ SUBJECT_VOCABULARY_DEFERRED_TO_SUBJECT_PHASE — /);
  assert.match(row.blocker, /cv-no-experience, daily-habits, bilingual-licenciatura/);
  assert.match(row.blocker, /score-equivalence, cv-for-occupation, pte-destination-requirement, ielts-free-practice, pte-for-occupation/);
  assert.match(row.unlockCondition, /node bin\/intent-clusters\.mjs --check/);
  assert.equal(row.ruling, "_handoffs/AlmiVisibility_CC_COMMAND_2026-09-22_ROW5_COMPLETE.md");
});
