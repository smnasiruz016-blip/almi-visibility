/**
 * 🔴 ROW 60 — THE CONSEQUENCE REGISTER, ARRIVING EMPTY ON PURPOSE. Every class present, every level UNCLASSIFIED,
 * no level filled in by the engine or by whoever wrote it; every presented priority states its basis and the entries
 * that applied. Real GREEN; every limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { reconcileRegister, consequenceFor, priorityCensus, classesInUse, UNCLASSIFIED, BASIS_KINDS } from "../src/audit/consequence.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const AUDIT = read("runs/audit");
const fieldsWith = (register) =>
  computeRecommendationFields({
    recommendations: AUDIT.filter((r) => r.record_type === "draft_recommendation"),
    links: AUDIT.filter((r) => r.record_type === "recommendation_evidence"),
    records: [...AUDIT, ...read("runs/evidence"), ...read("runs/crawl")],
    ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
    consequenceRegister: register,
  });
const clone = () => JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));

test("🟢 REAL: the register holds exactly the 17 classes in the store — each UNCLASSIFIED, each unruled, none filled in", () => {
  const r = reconcileRegister({ records: AUDIT, register: CONSEQUENCE_REGISTER });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(Object.keys(CONSEQUENCE_REGISTER).sort(), classesInUse(AUDIT));
  assert.equal(r.classesInUse.length, 17);
  for (const [k, e] of Object.entries(CONSEQUENCE_REGISTER)) {
    assert.equal(e.level, UNCLASSIFIED, `${k} was given a level — only the owner rules a level`);
    assert.deepEqual([e.ruledBy, e.ruledOn], [null, null], `${k} claims a ruling`);
    assert.ok(e.what.length > 10 && e.why.length > 10, `${k} does not say what it is and why`);
  }
});

test("🟢 REAL: every presented recommendation states its priority, its BASIS and the register entries that applied — and an unrated consequence is UNKNOWN, never low", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.deepEqual(pc.errors, []);
  assert.equal(pc.checked, 3);
  const by = Object.fromEntries(fields.map((f) => [f.recommendation_id, f.priority]));
  assert.deepEqual([by["REC-NOINDEX-CV-GUIDE"].rank, by["REC-NOINDEX-CV-GUIDE"].basisKind], [1, "MEASURED VOLUME"]);
  assert.deepEqual(by["REC-NOINDEX-CV-GUIDE"].consequence.entries, [{ issue_class: "noindex", level: UNCLASSIFIED, inRegister: true }]);
  assert.deepEqual(by["REC-ROBOTS-CORRIDOR"].consequence.entries, [{ issue_class: "robots-blocks-search-crawler", level: UNCLASSIFIED, inRegister: true }]);
  assert.deepEqual([by["REC-AI-CRAWLER-BLOCK"].state, by["REC-AI-CRAWLER-BLOCK"].basisKind, by["REC-AI-CRAWLER-BLOCK"].consequence.entries], ["UNKNOWN", "NONE", []]);
  assert.match(by["REC-AI-CRAWLER-BLOCK"].consequence.reason, /no register entry applies/);
  for (const p of Object.values(by)) {
    assert.ok(BASIS_KINDS.includes(p.basisKind));
    assert.equal(p.consequence.state, "UNKNOWN");
    assert.match(p.consequence.reason, /never low/);
    assert.equal(p.consequenceWeightedRank.state, "UNKNOWN");
  }
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
  delete reg.noindex;
  const r = reconcileRegister({ records: AUDIT, register: reg });
  assert.deepEqual([r.missing, r.stale, r.invalid], [["noindex"], [], []]);
  assert.equal(r.ok, false);
  const c = consequenceFor(["noindex"], reg);
  assert.equal(c.state, "UNKNOWN", "a class with no entry was given a consequence");
  assert.deepEqual(c.entries, [{ issue_class: "noindex", level: UNCLASSIFIED, inRegister: false }]);
  assert.deepEqual(priorityCensus({ fields: fieldsWith(reg), register: reg }).errors, [], "the unclassified class was ranked or given a level");
});

test("🔴 RED: the BASIS emptied is refused, alone", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.basisKind = "";
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.deepEqual(pc.errors.map((e) => e.limb), ["basis"]);
});

test("🔴 RED: a STALE register entry — a class not in use — is refused, alone", () => {
  const reg = { ...clone(), "a-class-no-store-holds": { what: "x".repeat(20), level: UNCLASSIFIED, why: "y".repeat(20), ruledBy: null, ruledOn: null } };
  const r = reconcileRegister({ records: AUDIT, register: reg });
  assert.deepEqual([r.missing, r.stale, r.invalid], [[], ["a-class-no-store-holds"], []]);
  assert.equal(r.ok, false);
});

test("🔴 RED: a level with no dated OWNER ruling is refused — neither the engine nor CC may set one", () => {
  const reg = clone();
  reg.noindex = { ...reg.noindex, level: "HIGH", why: "wrong regulator fee = high, obviously" };
  const r = reconcileRegister({ records: AUDIT, register: reg });
  assert.ok(r.invalid.some((x) => x.class === "noindex" && /no dated owner ruling/.test(x.why)));
  assert.equal(r.ok, false);
});

test("🔴 UNCLASSIFIED never becomes a consequence, and a claim of a consequence basis over it is refused", () => {
  const c = consequenceFor(["noindex"], CONSEQUENCE_REGISTER);
  assert.equal(c.state, "UNKNOWN");
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.basisKind = "BOTH";
  assert.ok(priorityCensus({ fields, register: CONSEQUENCE_REGISTER }).errors.some((e) => e.limb === "unclassified-ranked"));
});

test("🔴 REAL: the committed report SHOWS each recommendation's basis, its register entries and its UNKNOWN consequence", () => {
  const html = readFileSync(`${REPO}runs/report/index.html`, "utf8");
  assert.match(html, /REC-NOINDEX-CV-GUIDE[\s\S]*?<strong>1 of 2<\/strong>[\s\S]*?basis: <strong>MEASURED VOLUME<\/strong>[\s\S]*?<code>noindex<\/code> = <strong>UNCLASSIFIED<\/strong>/);
  assert.match(html, /REC-AI-CRAWLER-BLOCK[\s\S]*?basis: <strong>NONE<\/strong>[\s\S]*?none — no finding class is linked/);
  assert.match(html, /consequence-weighted rank: <span class="lbl lbl-UNKNOWN">UNKNOWN<\/span>/);
});
