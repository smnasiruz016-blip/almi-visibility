/**
 * 🔴 ROW 60 — THE CONSEQUENCE REGISTER, RULED BY THE OWNER ON 14 SEPTEMBER 2026. Every class present, 14 with a level
 * on the owner's scale and all six parts, 3 UNCLASSIFIED for a structural reason; every presented priority states its
 * basis and the entries that applied, consequence first. Real GREEN; every Amendment 3 limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { reconcileRegister, consequenceFor, priorityCensus, classesInUse, UNCLASSIFIED, BASIS_KINDS } from "../src/audit/consequence.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const AUDIT = read("runs/audit");
const fieldsWith = (register, scale = SEVERITY_SCALE) =>
  computeRecommendationFields({
    recommendations: AUDIT.filter((r) => r.record_type === "draft_recommendation"),
    links: AUDIT.filter((r) => r.record_type === "recommendation_evidence"),
    records: [...AUDIT, ...read("runs/evidence"), ...read("runs/crawl")],
    ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
    consequenceRegister: register,
    consequenceScale: scale,
  });
const clone = () => JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));
const reconcile = (register) => reconcileRegister({ records: AUDIT, register, scale: SEVERITY_SCALE });

test("🟢 REAL: the register holds exactly the 17 classes in the store — 14 ruled on the scale, 3 UNCLASSIFIED, every one dated by the owner", () => {
  const r = reconcile(CONSEQUENCE_REGISTER);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(Object.keys(CONSEQUENCE_REGISTER).sort(), classesInUse(AUDIT));
  assert.equal(r.classesInUse.length, 17);
  assert.deepEqual(r.unclassified, ["indexability-preflight", "noindex", "sitemap-advertises-blocked-url"]);
  const byLevel = {};
  for (const [k, e] of Object.entries(CONSEQUENCE_REGISTER)) {
    (byLevel[e.level] ??= []).push(k);
    assert.deepEqual([e.ruledBy, e.ruledOn], ["owner", "2026-09-14"], `${k} carries no dated owner ruling`);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(byLevel).map(([l, ks]) => [l, ks.length])), { HIGH: 4, MODERATE: 6, LOW: 4, UNCLASSIFIED: 3 });
  assert.equal(byLevel.CRITICAL, undefined);
  assert.equal(byLevel.NONE, undefined);
});

test("🟢 REAL: every presented recommendation states its priority, its BASIS and its entries — consequence first, UNKNOWN never ranked", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.deepEqual(pc.errors, []);
  assert.equal(pc.checked, 3);
  const by = Object.fromEntries(fields.map((f) => [f.recommendation_id, f.priority]));
  // today's basis — impressions alone, 484 and 219 — is still there, UNDER consequence
  assert.deepEqual([by["REC-NOINDEX-CV-GUIDE"].rank, by["REC-NOINDEX-CV-GUIDE"].basisKind], [1, "MEASURED VOLUME"]);
  assert.deepEqual([by["REC-ROBOTS-CORRIDOR"].rank, by["REC-ROBOTS-CORRIDOR"].basisKind], [2, "BOTH"]);
  assert.deepEqual(by["REC-NOINDEX-CV-GUIDE"].consequence.entries, [{ issue_class: "noindex", level: UNCLASSIFIED, inRegister: true }]);
  assert.deepEqual(by["REC-ROBOTS-CORRIDOR"].consequence.entries, [{ issue_class: "robots-blocks-search-crawler", level: "MODERATE", inRegister: true }]);
  assert.deepEqual([by["REC-ROBOTS-CORRIDOR"].consequence.state, by["REC-ROBOTS-CORRIDOR"].consequence.level], ["DECLARED", "MODERATE"]);
  const w = by["REC-ROBOTS-CORRIDOR"].consequenceWeightedRank;
  assert.deepEqual([w.state, w.rank, w.of, w.level], ["DERIVED", 1, 1, "MODERATE"]);
  assert.match(w.basis, /^declared consequence MODERATE first; 219 search impressions only as the amplifier inside MODERATE$/);
  // the highest volume does NOT rank when its consequence is unknown
  for (const id of ["REC-NOINDEX-CV-GUIDE", "REC-AI-CRAWLER-BLOCK"]) {
    assert.equal(by[id].consequence.state, "UNKNOWN");
    assert.match(by[id].consequence.reason, /never low/);
    assert.deepEqual([by[id].consequenceWeightedRank.state, by[id].consequenceWeightedRank.route], ["UNKNOWN", "OWNER REVIEW"]);
  }
  assert.deepEqual([by["REC-AI-CRAWLER-BLOCK"].state, by["REC-AI-CRAWLER-BLOCK"].basisKind, by["REC-AI-CRAWLER-BLOCK"].consequence.entries], ["UNKNOWN", "NONE", []]);
  for (const p of Object.values(by)) assert.ok(BASIS_KINDS.includes(p.basisKind));
});

test("🔴 no scale supplied → a ruled level cannot be stated, and nothing ranks", () => {
  const by = Object.fromEntries(fieldsWith(CONSEQUENCE_REGISTER, null).map((f) => [f.recommendation_id, f.priority]));
  assert.equal(by["REC-ROBOTS-CORRIDOR"].consequence.state, "UNKNOWN");
  assert.equal(by["REC-ROBOTS-CORRIDOR"].consequenceWeightedRank.state, "UNKNOWN");
});

test("🔴 RED: a level HARD-CODED in the engine — one the register does not declare — is refused, alone", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.consequence.entries = fields[0].priority.consequence.entries.map((e) => ({ ...e, level: "LOW" }));
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.ok(pc.errors.length > 0);
  assert.deepEqual([...new Set(pc.errors.map((e) => e.limb))], ["level"], JSON.stringify(pc.errors));
});

test("🔴 RED: a register entry REMOVED — the class becomes unclassified, is NOT ranked, and the register fails to reconcile, alone", () => {
  const reg = clone();
  delete reg["robots-blocks-search-crawler"];
  const r = reconcile(reg);
  assert.deepEqual([r.missing, r.stale, r.invalid], [["robots-blocks-search-crawler"], [], []]);
  assert.equal(r.ok, false);
  const c = consequenceFor(["robots-blocks-search-crawler"], reg, SEVERITY_SCALE);
  assert.equal(c.state, "UNKNOWN", "a class with no entry was given a consequence");
  const fields = fieldsWith(reg);
  assert.deepEqual(priorityCensus({ fields, register: reg }).errors, [], "the unclassified class was ranked or given a level");
  assert.equal(fields.find((f) => f.recommendation_id === "REC-ROBOTS-CORRIDOR").priority.consequenceWeightedRank.state, "UNKNOWN");
});

test("🔴 RED: the BASIS emptied is refused, alone", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.basisKind = "";
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.deepEqual(pc.errors.map((e) => e.limb), ["basis"]);
});

test("🔴 RED: a STALE register entry — a class not in use — is refused, alone", () => {
  const reg = { ...clone(), "a-class-no-store-holds": { what: "x".repeat(20), level: UNCLASSIFIED, consequence: null, reversibility: null, blastRadius: null, why: "y".repeat(20), ruledBy: null, ruledOn: null } };
  const r = reconcile(reg);
  assert.deepEqual([r.missing, r.stale, r.invalid], [[], ["a-class-no-store-holds"], []]);
  assert.equal(r.ok, false);
});

test("🔴 RED: a level with no dated OWNER ruling is refused — neither the engine nor CC may set one", () => {
  const reg = clone();
  reg.noindex = { ...reg.noindex, level: "HIGH", consequence: "c", reversibility: "r", blastRadius: "b", ruledBy: null, ruledOn: null };
  const r = reconcile(reg);
  assert.ok(r.invalid.some((x) => x.class === "noindex" && /no dated owner ruling/.test(x.why)));
  assert.equal(r.ok, false);
});

test("🔴 UNCLASSIFIED never becomes a consequence, and a claim of a consequence basis over it is refused", () => {
  assert.equal(consequenceFor(["noindex"], CONSEQUENCE_REGISTER, SEVERITY_SCALE).state, "UNKNOWN");
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  const noindex = fields.find((f) => f.recommendation_id === "REC-NOINDEX-CV-GUIDE");
  noindex.priority.basisKind = "BOTH";
  assert.ok(priorityCensus({ fields, register: CONSEQUENCE_REGISTER }).errors.some((e) => e.limb === "unclassified-ranked"));
});

test("🔴 REAL: the committed report leads with the consequence-weighted rank, and puts measured volume UNDER it", () => {
  const html = readFileSync(`${REPO}runs/report/index.html`, "utf8");
  assert.match(html, /REC-ROBOTS-CORRIDOR[\s\S]*?consequence-weighted rank: <strong>1 of 1<\/strong> at <strong>MODERATE<\/strong>[\s\S]*?under it, measured volume \(the amplifier inside a level\): <strong>2 of 2<\/strong>[\s\S]*?basis: <strong>BOTH<\/strong>[\s\S]*?<code>robots-blocks-search-crawler<\/code> = <strong>MODERATE<\/strong>/);
  assert.match(html, /REC-NOINDEX-CV-GUIDE[\s\S]*?consequence-weighted rank: <span class="lbl lbl-UNKNOWN">UNKNOWN<\/span>[\s\S]*?routed to owner review[\s\S]*?<strong>1 of 2<\/strong>[\s\S]*?basis: <strong>MEASURED VOLUME<\/strong>[\s\S]*?<code>noindex<\/code> = <strong>UNCLASSIFIED<\/strong>/);
  assert.match(html, /REC-AI-CRAWLER-BLOCK[\s\S]*?basis: <strong>NONE<\/strong>[\s\S]*?none — no finding class is linked/);
});
