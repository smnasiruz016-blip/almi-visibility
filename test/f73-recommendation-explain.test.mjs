/**
 * F73 · RECOMMENDATION EXPLAINABILITY (acceptance _handoffs 366476c, RR-97).
 *
 * Every expected result below is written by hand from its fixture. Fixture stores live in a temp dir; the real stores are read, never
 * written; nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { explainRecommendations, FIELDS, EXPLAIN } from "../src/report/recommendation-explain.mjs";
import { readRecommendationExplanations, STORES } from "../src/report/recommendation-explain-reader.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const rec = (id, over = {}) => ({ record_type: "draft_recommendation", recommendation_id: id, status: "RECOMMENDED — NOT APPROVED — NOT APPLIED", applied: false, approved_by: null, finding: "a recorded finding", ...over });
const link = (id, ids) => ({ record_type: "recommendation_evidence", recommendation_id: id, issues: ids, observations: [], sources: [] });
const full = { priority: 1, confidence: "c", dependencies: ["d"], expectedCost: "c", reversibility: "r", reason: "r" };

/* ================= C1 — real recommendations only ================= */

test("C1 · only persisted recommendations are explained — issues, lifecycle records, evidence links, rankings and assessments never count", () => {
  const dir = mkdtempSync(join(tmpdir(), "f73-"));
  try {
    mkdirSync(join(dir, "audit"), { recursive: true });
    writeFileSync(join(dir, "audit", "recommendations.jsonl"), [rec("r1"), link("r1", ["i1"]), { record_type: "issue", issue_id: "i1", action: "fix it" }, { record_type: "issue_state_change", action: "bin/x.mjs" }, { record_type: "issue_ranking" }, { record_type: "page_assessment", verdict: "x" }].map((x) => JSON.stringify(x)).join("\n") + "\n");
    const r = readRecommendationExplanations({ root: `${dir}/`, stores: ["audit/recommendations.jsonl"] });
    assert.equal(r.explanation.recommendations, 1, "a record that is not a recommendation was counted as one");
    assert.equal(r.explanation.rows[0].fields.evidence.references, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= C2 — recorded or not measured ================= */

test("C2 · FIRING CONTROL: an absent cost and reversibility stay NOT MEASURED with the missing fact named — never estimated, defaulted or filled", () => {
  const e = explainRecommendations({ recommendations: [rec("r1")], links: [link("r1", ["i1"])], recordIds: new Set(["i1"]) });
  const f = e.rows[0].fields;
  assert.deepEqual(f.expectedCost, { state: "NOT_MEASURED", missing: "a recorded expected cost" }, "an absent cost was filled");
  assert.deepEqual(f.reversibility, { state: "NOT_MEASURED", missing: "a recorded reversibility" }, "an absent reversibility was filled");
  for (const k of ["priority", "confidence", "dependencies"]) assert.equal(f[k].state, "NOT_MEASURED");
  /* no field carries a value of its own making: RECORDED names where it came from, NOT_MEASURED names what is missing */
  for (const k of FIELDS) assert.ok(!("value" in f[k]) && !("estimate" in f[k]) && !("default" in f[k]), `${k} carries a manufactured value`);
  /* recorded fields are reported as recorded, and REASON from a finding is labelled as such */
  const g = explainRecommendations({ recommendations: [rec("r2", full)], links: [link("r2", ["i1"])], recordIds: new Set(["i1"]) }).rows[0].fields;
  assert.deepEqual(FIELDS.map((k) => g[k].state), FIELDS.map(() => "RECORDED"));
  assert.equal(f.reason.from, "the recorded finding it rests on");
  assert.equal(explainRecommendations({ recommendations: [rec("r3", { finding: null })], links: [], recordIds: new Set() }).rows[0].fields.evidence.state, "NOT_MEASURED", "evidence was assumed without a recorded link");
});

/* ================= C3 — evidence resolves ================= */

test("C3 · FIRING CONTROL: a linked evidence reference that resolves to nothing is BROKEN and disproves the explanation", () => {
  const ok = explainRecommendations({ recommendations: [rec("r1", full)], links: [link("r1", ["i1"])], recordIds: new Set(["i1"]) });
  assert.deepEqual([ok.broken, ok.rows[0].verdict], [0, EXPLAIN.PROVED]);
  const bad = explainRecommendations({ recommendations: [rec("r1", full)], links: [link("r1", ["i1", "gone"])], recordIds: new Set(["i1"]) });
  assert.deepEqual([bad.broken, bad.rows[0].verdict], [1, EXPLAIN.DISPROVED], "a dangling reference read resolved");
});

/* ================= C4 — status as recorded ================= */

test("C4 · status, approval and application are reported exactly as recorded, and never implied", () => {
  const e = explainRecommendations({ recommendations: [rec("r1"), rec("r2", { approved_by: "owner", applied: true, status: "APPROVED" })], links: [], recordIds: new Set() });
  assert.deepEqual(e.rows.map((r) => [r.status, r.approvedBy, r.applied]), [["RECOMMENDED — NOT APPROVED — NOT APPLIED", "NONE RECORDED", false], ["APPROVED", "RECORDED", true]]);
});

/* ================= C5 — verdict, real ================= */

test("C5 · REAL: the recorded recommendations — every field's recorded and NOT MEASURED counts; every reference resolved; no explanation PROVED with a field missing", () => {
  const r = readRecommendationExplanations();
  const e = r.explanation;
  assert.ok(e.recommendations > 0, "EMPTY population");
  for (const k of FIELDS) assert.equal(e.perField[k].recorded + e.perField[k].notMeasured, e.recommendations);
  for (const row of e.rows) if (row.notMeasured.length) assert.notEqual(row.verdict, EXPLAIN.PROVED, "an incomplete explanation read PROVED");
  assert.ok(e.references > 0, "no linked evidence reference was read — the resolution check would be vacuous");
  /* C3 cross-check, independent of the reader's store list: a reference read BROKEN must be a record in NO persisted store — otherwise a
   * resolving reference was read broken (the reader missed a store). Every persisted .jsonl under runs/ is searched. */
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(join(d, x.name)) : x.name.endsWith(".jsonl") ? [join(d, x.name)] : []));
  const brokenIds = new Set(e.rows.flatMap((row) => row.brokenIds));
  const heldSomewhere = brokenIds.size === 0 ? 0 : walk(join(REPO, "runs")).reduce((n, f) => n + readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).filter((l) => { try { const o = JSON.parse(l); return ["issue_id", "observation_id", "source_id", "id"].some((k) => brokenIds.has(o[k])); } catch { return false; } }).length, 0);
  assert.equal(heldSomewhere, 0, "a reference read BROKEN is a recorded record in a store the reader did not read");
  /* the resolution is not vacuous: the SAME real links against stores missing the one that holds observations and sources break */
  const narrowed = readRecommendationExplanations({ stores: STORES.filter((s) => !s.includes("crawler-classification")) });
  assert.ok(narrowed.explanation.broken > 0, "references resolved even with their store removed");
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify({ perField: e.perField, references: e.references, broken: e.broken, verdicts: e.verdicts })}`);
});

test("C5 · THE ENTRY POINT: it prints every field's counts, the broken count and its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/recommendation-explain.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ recommendation\(s\) .* nothing derived, estimated, fetched or written/);
    for (const k of FIELDS) assert.match(ok.stdout, new RegExp(`\\n  ${k} +recorded \\d+ · NOT MEASURED \\d+`), `${k} is missing from the output`);
    assert.match(ok.stdout, /an explanation missing any field is never presented as complete/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the explainer and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/report/recommendation-explain.mjs", "src/report/recommendation-explain-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
