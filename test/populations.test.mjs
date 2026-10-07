/**
 * 🔴 ROW 60 — OPTION A: THREE LIVE POPULATIONS AND ONE ARCHIVE (owner's ruling, 14 September 2026,
 * ROW60_POPULATIONS_RULING.md). Every issue lands in exactly one; the four totals sum to the store; a decision on
 * record is MORE visible on the owner's report than a finding. GREEN on the real store; each limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { splitView } from "../src/audit/class-split.mjs";
import { populationErrors, populationsOf, fourWay, impressionsForClass, POPULATIONS } from "../src/audit/populations.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { CLASS_SPLITS } from "../config/class-splits.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const ALL = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());
const { view: VIEW } = splitView(ALL, CLASS_SPLITS);
const REGISTERS = { register: CONSEQUENCE_REGISTER, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL };
const REPORT = readFileSync(join(REPO, "runs", "report", "index.html"), "utf8");
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const clone = (x) => JSON.parse(JSON.stringify(x));
const check = (over = {}) => populationErrors({ view: VIEW, records: ALL, ...REGISTERS, orderIds: Object.keys(CONSEQUENCE_REGISTER), reportHtml: REPORT, ...over });

test("🔴 the ruling is frozen — its LF-normalised bytes hash to the value pinned here", () => {
  const raw = readFileSync(join(REPO, "ROW60_POPULATIONS_RULING.md"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(createHash("sha256").update(raw, "utf8").digest("hex"), "a0bc6e10c49be7476bb3c3ab17d73b70006f04c0a8e0f489bbcfd61d1083f939");
  assert.match(raw, /would this be proposed if row 60 were not blocked\?/);
  assert.match(raw, /A: Withdrawn claims only \(Recommended\)/);
});

test("🟢 MEASURED — the four-way split over every file under runs/, every issue in exactly one population", () => {
  const four = fourWay(VIEW, REGISTERS);
  /* RR-196: the 125 version-1 thin / near / template FAILs leave FINDINGS for the AUDIT TRAIL (withdrawn under PG-A1, all SUPERSEDED), and the
   * 125 version-2 review signals that replaced them are DECISIONS ON RECORD (all OPEN): 541/134/134 → 416/259/259, 2033 → 2158 distinct */
  assert.deepEqual(four.totals, { FINDINGS: 416, "COVERAGE GAP": 1224, "DECISION ON RECORD": 259, "AUDIT TRAIL": 259 });
  assert.deepEqual(four.open, { FINDINGS: 405, "COVERAGE GAP": 1224, "DECISION ON RECORD": 259, "AUDIT TRAIL": 0 });
  assert.equal(four.unplaced, 0);
  assert.equal(POPULATIONS.reduce((n, p) => n + four.totals[p], 0), four.distinct);
  assert.equal(four.distinct, 2158);
  // the proof, issue by issue: each lands in exactly one register
  for (const v of VIEW.values()) assert.equal(populationsOf(v.class, REGISTERS).length, 1, `${v.issue_id} (${v.class})`);
  // and the archive rule is the owner's answer: withdrawn claims only — instrument-disagreement (all CLOSED) is a live finding
  assert.ok(CONSEQUENCE_REGISTER["instrument-disagreement"]);
  assert.equal(CONSEQUENCE_REGISTER["instrument-disagreement"].level, "HIGH");
});

test("🟢 GREEN: every population check holds on the real store and the committed report", () => {
  assert.deepEqual(check(), []);
});

test("🔴 THE INVARIANT: the decision on record is MORE visible than a finding — first on the report, with its count, impressions and the recommendation it waits on", () => {
  const imp = impressionsForClass("noindex-declared-deliberate", { view: VIEW, records: ALL });
  assert.deepEqual([imp.state, imp.impressions, imp.pages, imp.pagesJoined], ["MEASURED", 484, 134, 134]);
  const decAt = REPORT.indexOf('<section id="decisions">');
  assert.ok(decAt > 0 && decAt < REPORT.indexOf('<section id="recommendations">') && decAt < REPORT.indexOf('<section id="issues">'), "the decisions are not above the findings");
  assert.ok(decAt < REPORT.indexOf('<section id="reconciliation">'), "the decisions are not directly under the header");
  const section = REPORT.match(/<section id="decisions">[\s\S]*?<\/section>/)[0];
  assert.match(section, /<code>noindex-declared-deliberate<\/code>/);
  assert.match(section, /<strong>134<\/strong> issues · 134 open/);
  assert.match(section, /<strong>484<\/strong> search impressions on 134 of the 134 pages/);
  assert.match(section, /<code>REC-NOINDEX-CV-GUIDE<\/code>/);
  assert.match(section, /the premise it cites is not confirmed by our similarity measurement/);
  // and the recommendation itself still carries its 484 impressions and its rank by volume
  assert.match(REPORT, /REC-NOINDEX-CV-GUIDE[\s\S]*?<strong>1 of 2<\/strong>[\s\S]*?484 search impressions on 134 of the 134 pages/);
});

test("🔴 RED: a decision on record or an audit-trail class given a level is refused, alone", () => {
  const d = clone(DECISION_REGISTER);
  d["noindex-declared-deliberate"].level = "NONE";
  assert.deepEqual(limbs(check({ decisions: d })), ["population-level"]);
  const a = clone(AUDIT_TRAIL);
  a["noindex-defect-claim-withdrawn"].severity = "low";
  assert.deepEqual(limbs(check({ auditTrail: a })), ["population-level"]);
});

test("🔴 RED: a decision on record or an audit-trail class ranked beside a finding is refused, alone", () => {
  assert.deepEqual(limbs(check({ orderIds: [...Object.keys(CONSEQUENCE_REGISTER), "noindex-declared-deliberate"] })), ["population-ranked"]);
  assert.deepEqual(limbs(check({ orderIds: [...Object.keys(CONSEQUENCE_REGISTER), "noindex-defect-claim-withdrawn"] })), ["population-ranked"]);
});

test("🔴 RED: a decision on record that does NOT surface on the owner's report is refused, alone — hidden, or pushed below the findings", () => {
  assert.deepEqual(limbs(check({ reportHtml: REPORT.replace('<section id="decisions">', '<section id="decisions-elsewhere">') })), ["decision-hidden"]);
  const section = REPORT.match(/<section id="decisions">[\s\S]*?<\/section>/)[0];
  const below = REPORT.replace(section, "").replace("</body>", `${section}</body>`);
  assert.deepEqual(limbs(check({ reportHtml: below })), ["decision-hidden"]);
  assert.deepEqual(limbs(check({ reportHtml: REPORT.replace("<strong>484</strong> search impressions", "search impressions") })), ["decision-hidden"]);
});

test("🔴 RED: an issue landing in two populations, or in none, is refused, alone", () => {
  const two = (cls, regs) => [...populationsOf(cls, regs), ...(cls === "canonical" ? ["DECISION ON RECORD"] : [])];
  const errs = check({ assign: two });
  assert.deepEqual(limbs(errs), ["population-membership"]);
  assert.match(errs[0].why, /lands in FINDINGS AND DECISION ON RECORD/);
  const none = (cls, regs) => (cls === "canonical" ? [] : populationsOf(cls, regs));
  assert.deepEqual(limbs(check({ assign: none })), ["population-membership"]);
});

test("🔴 RED: four totals that do not sum to the store's distinct issues are refused, alone", () => {
  const a = clone(AUDIT_TRAIL);
  a["noindex-defect-claim-withdrawn"].count = 135;
  const errs = check({ auditTrail: a });
  assert.deepEqual(limbs(errs), ["population-sum"]);
  assert.ok(errs.some((e) => /must sum to the store/.test(e.why)));
});

test("🔴 RED: a class with open issues put in the archive is refused, alone — and so is a closed real defect", () => {
  const { "noindex-declared-deliberate": moved, ...rest } = clone(DECISION_REGISTER);
  const archived = { ...clone(AUDIT_TRAIL), "noindex-declared-deliberate": { splitFrom: "noindex", count: moved.count, why: "archived by mistake" } };
  const errs = check({ decisions: rest, auditTrail: archived });
  assert.deepEqual(limbs(errs), ["archive"]);
  assert.match(errs[0].why, /134 OPEN issue\(s\) put in the audit trail/);
  // instrument-disagreement: 11 issues, 0 open, all CLOSED — the zero-open rule the owner did NOT adopt
  const { "instrument-disagreement": inst, ...findings } = clone(CONSEQUENCE_REGISTER);
  const errs2 = check({ register: findings, auditTrail: { ...clone(AUDIT_TRAIL), "instrument-disagreement": { splitFrom: null, count: 11, why: "zero open" } }, orderIds: Object.keys(findings) });
  assert.deepEqual(limbs(errs2), ["archive"]);
  assert.match(errs2[0].why, /11 issue\(s\) not SUPERSEDED in the audit trail/);
  assert.ok(inst);
});
