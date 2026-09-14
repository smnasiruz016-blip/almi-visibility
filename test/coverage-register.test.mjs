/**
 * 🔴 ROW 60 — AN UNMEASURED CHECK IS NOT A FINDING (owner's ruling, 14 September 2026, ROW60_COVERAGE_AND_LEVELS_RULING.md).
 * The coverage population apart from the findings population; the levels ruled for the real halves; the void orphan
 * escalation; the blast-radius figures held to real findings; and the two WHY_THIS_URL rationales through Gate A.
 * GREEN on the real store; each limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { splitView, coverageClassesOf, isUnmeasured } from "../src/audit/class-split.mjs";
import { coverageErrors, blastRadiusErrors, voidEscalationErrors, populationOf } from "../src/audit/coverage.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { constructCandidates, selectCandidates, REFUSED, PASS, FAIL, NOT_TESTED } from "../src/page/construct.mjs";
import { CONSEQUENCE_REGISTER, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { CLASS_SPLITS, UNMEASURED_REASON_CODES } from "../config/class-splits.mjs";
import { subject } from "./support/subjects.mjs";
const PRODUCT = await subject("almi-oet");

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const ALL = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());
const { view: VIEW } = splitView(ALL, CLASS_SPLITS);
const U = UNMEASURED_REASON_CODES;
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const clone = (x) => JSON.parse(JSON.stringify(x));
const cov = (over = {}) => coverageErrors({ coverage: COVERAGE_REGISTER, register: CONSEQUENCE_REGISTER, view: VIEW, unmeasuredCodes: U, orderIds: Object.keys(CONSEQUENCE_REGISTER), ...over });

const RULING_RAW = readFileSync(join(REPO, "ROW60_COVERAGE_AND_LEVELS_RULING.md"), "utf8").replace(/\r\n/g, "\n");
const LAW_RAW = readFileSync(join(REPO, "ROW60_CONSEQUENCE_LAW.md"), "utf8").replace(/\r\n/g, "\n");
const norm = (s) => s.replace(/[*`]/g, "").replace(/🔴 /g, "").replace(/\s+/g, " ").trim();

/* ================================================================== *
 * THE RULING IS FROZEN, AND THE RULED HALVES ARE ITS WORDS
 * ================================================================== */

test("🔴 the ruling is frozen — its LF-normalised bytes hash to the value pinned here", () => {
  assert.equal(createHash("sha256").update(RULING_RAW, "utf8").digest("hex"), "0a35ca15f0a54722453d31b6c5af9490c3cf7d3ad872d18a4f647d1a0e95da52");
});

test("🔴 every ruled half's words are the ruling's or the law's, WORD FOR WORD — except the 3b figures, which must be the store's", () => {
  const words = norm(`${RULING_RAW} ${LAW_RAW}`);
  const ruled = Object.entries(CONSEQUENCE_REGISTER).filter(([, e]) => e.splitFrom && e.level !== "UNCLASSIFIED");
  assert.deepEqual(ruled.map(([k]) => k).sort(), ["indexability-preflight-found", "near-duplicate-found", "template-dominance-found", "thin-content-found"]);
  for (const [k, e] of ruled) {
    assert.deepEqual([e.level, e.ruledFor, e.ruledBy, e.ruledOn], ["MODERATE", k, "owner", "2026-09-14"], k);
    for (const f of ["consequence", "reversibility", "why"]) assert.ok(words.includes(norm(e[f])), `${k}.${f} is not the ruling's or the law's words`);
  }
  assert.ok(words.includes(norm(CONSEQUENCE_REGISTER["indexability-preflight-found"].blastRadius)));
  for (const k of ["near-duplicate-found", "template-dominance-found", "thin-content-found"]) assert.match(CONSEQUENCE_REGISTER[k].levelRestsOn, /^consequence, not the count/);
  // the noindex halves were never given NONE — and since Option A they are not findings at all
  for (const k of ["noindex-declared-deliberate", "noindex-defect-claim-withdrawn"]) assert.equal(CONSEQUENCE_REGISTER[k], undefined, k);
  assert.ok(DECISION_REGISTER["noindex-declared-deliberate"] && AUDIT_TRAIL["noindex-defect-claim-withdrawn"]);
  assert.ok(!Object.values(CONSEQUENCE_REGISTER).some((e) => e.level === "NONE"), "a NONE was written — the owner's answer left the noindex classes UNCLASSIFIED");
});

/* ================================================================== *
 * TWO POPULATIONS
 * ================================================================== */

test("🟢 MEASURED — the findings population and the coverage population, apart, over every file under runs/", () => {
  const all = [...VIEW.values()];
  const findings = all.filter((v) => !isUnmeasured(v, U));
  const coverage = all.filter((v) => isUnmeasured(v, U));
  assert.deepEqual([all.length, findings.length, findings.filter((v) => v.state === "OPEN").length, coverage.length, coverage.filter((v) => v.state === "OPEN").length], [2033, 809, 664, 1224, 1224]);
  const codes = {};
  for (const v of coverage) codes[v.reason_code] = (codes[v.reason_code] ?? 0) + 1;
  assert.deepEqual(codes, { MISSING_INPUT: 878, NEEDS_RENDERED_HTML: 342, TOOL_FAILED: 4 });
  assert.deepEqual(Object.keys(COVERAGE_REGISTER).sort(), [...coverageClassesOf(CLASS_SPLITS)].sort());
  assert.deepEqual(Object.fromEntries(Object.entries(COVERAGE_REGISTER).map(([k, e]) => [k, e.count])), {
    "indexability-preflight-check-not-run": 210,
    "near-duplicate-check-not-run": 108,
    "orphan-within-crawled-set-check-not-run": 340,
    "sitemap-advertises-blocked-url-check-not-run": 350,
    "template-dominance-check-not-run": 108,
    "thin-content-check-not-run": 108,
  });
  // every finding class in use carries a register entry, and not one coverage class does
  const pop = populationOf(VIEW, U);
  assert.deepEqual([...pop.keys()].filter((k) => pop.get(k).real > 0 && !DECISION_REGISTER[k] && !AUDIT_TRAIL[k]).sort(), Object.keys(CONSEQUENCE_REGISTER).sort());
});

test("🟢 GREEN: the coverage register, the blast-radius figures and the void escalation all hold on the real store", () => {
  assert.deepEqual(cov(), []);
  assert.deepEqual(blastRadiusErrors({ register: CONSEQUENCE_REGISTER, view: VIEW, unmeasuredCodes: U }), []);
  assert.deepEqual(voidEscalationErrors({ register: CONSEQUENCE_REGISTER, superseded: SUPERSEDED_ENTRIES, view: VIEW, unmeasuredCodes: U }), []);
  const v = SUPERSEDED_ENTRIES["orphan-within-crawled-set"].escalationVoid;
  assert.match(v.cause, /applied to a count of records that were not findings/);
  assert.match(v.nothingLeftToRule, /nothing left to rule/);
  assert.equal(populationOf(VIEW, U).get("orphan-within-crawled-set-found"), undefined, "an orphan finding class is in use after all");
  assert.deepEqual(["near-duplicate", "template-dominance", "thin-content"].map((k) => [SUPERSEDED_ENTRIES[k].figureCorrection.was, SUPERSEDED_ENTRIES[k].figureCorrection.realFindings]), [["113", 5], ["110", 2], ["226", 118]]);
});

/* ================================================================== *
 * EVERY LIMB, ALONE
 * ================================================================== */

test("🔴 RED: a check that never ran given a severity level is refused, alone — in the register, or on its coverage entry", () => {
  const reg = { ...CONSEQUENCE_REGISTER, "orphan-within-crawled-set-check-not-run": { what: "x", level: "MODERATE" } };
  assert.deepEqual(limbs(cov({ register: reg })), ["coverage-level"]);
  const c = clone(COVERAGE_REGISTER);
  c["thin-content-check-not-run"].level = "LOW";
  assert.deepEqual(limbs(cov({ coverage: c })), ["coverage-level"]);
});

test("🔴 RED: a coverage class ranked beside a finding is refused, alone", () => {
  assert.deepEqual(limbs(cov({ orderIds: [...Object.keys(CONSEQUENCE_REGISTER), "sitemap-advertises-blocked-url-check-not-run"] })), ["coverage-ranked"]);
});

test("🔴 RED: a coverage count or reason code that disagrees with the store is refused, alone — and a gap with no entry", () => {
  const c = clone(COVERAGE_REGISTER);
  c["near-duplicate-check-not-run"].count = 113;
  assert.deepEqual(limbs(cov({ coverage: c })), ["coverage-count"]);
  const c2 = clone(COVERAGE_REGISTER);
  delete c2["orphan-within-crawled-set-check-not-run"];
  assert.deepEqual(limbs(cov({ coverage: c2 })), ["coverage-missing"]);
});

test("🔴 RED 3c: a blast-radius figure that is not the store's count of REAL findings is refused, alone — the 113 that was never real", () => {
  const reg = clone(CONSEQUENCE_REGISTER);
  reg["near-duplicate-found"].blastRadius = "113";
  const errs = blastRadiusErrors({ register: reg, view: VIEW, unmeasuredCodes: U });
  assert.deepEqual(limbs(errs), ["blast-radius"]);
  assert.match(errs[0].why, /cites 113, and the store holds 5 real finding/);
  // and real findings are not FAIL alone: an UNKNOWN human-verification finding counts (owner's answer)
  assert.equal(populationOf(VIEW, U).get("official-source-contradicts-itself").real, 1);
});

test("🔴 RED 3a: a void escalation still standing is refused, alone — and so is one applied on a live entry", () => {
  const sup = clone(SUPERSEDED_ENTRIES);
  delete sup["orphan-within-crawled-set"].escalationVoid;
  const errs = voidEscalationErrors({ register: CONSEQUENCE_REGISTER, superseded: sup, view: VIEW, unmeasuredCodes: U });
  assert.deepEqual(limbs(errs), ["void-escalation"]);
  assert.match(errs[0].why, /rests on 340 while the store holds 0 real finding/);
  const reg = clone(CONSEQUENCE_REGISTER);
  reg["near-duplicate-found"] = { ...reg["near-duplicate-found"], escalatedFrom: "LOW", escalationVoid: SUPERSEDED_ENTRIES["orphan-within-crawled-set"].escalationVoid };
  assert.deepEqual(limbs(voidEscalationErrors({ register: reg, superseded: SUPERSEDED_ENTRIES, view: VIEW, unmeasuredCodes: U })), ["void-escalation"]);
});

/* ================================================================== *
 * PART 4 — THE TWO RATIONALES, THROUGH GATE A
 * ================================================================== */

const section = (slug) => {
  const m = RULING_RAW.match(new RegExp(`### ${slug}\\n\\n([\\s\\S]*?)(?:\\n###|$)`));
  return norm(m[1]);
};

test("🔴 each spec's rationale is the brief's, WORD FOR WORD, cut at its own sentence 'This page exists to…'", () => {
  for (const [slug, spec] of Object.entries(PRODUCT.pageSpecs)) {
    const w = spec.whyThisUrlDeservesToExist;
    assert.equal(norm(`${w.humanNeed} ${w.distinctValue}`), section(slug), `${slug}'s rationale is not the brief's`);
    assert.match(w.distinctValue, /^This page exists to /, `${slug} was not cut at "This page exists"`);
    assert.doesNotMatch(w.humanNeed, /This page exists/);
  }
  assert.equal(Object.keys(PRODUCT.pageSpecs).length, 2, "a third page spec was added");
});

test("🟢 Gate A part 4 PASSES on both — and both candidates are still REFUSED, each with its full record", async () => {
  const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
  const res = constructCandidates({ pageSpecs: PRODUCT.pageSpecs, variants: PRODUCT.variants, records, requested: selectCandidates(PRODUCT.pageSpecs, { allSlugs: true }) });
  const by = Object.fromEntries(res.map((c) => [c.slug, c]));
  for (const c of res) {
    assert.equal(c.parts.whyThisUrl.state, PASS, `${c.slug}: ${c.parts.whyThisUrl.reason}`);
    assert.equal(c.verdict, REFUSED);
    assert.deepEqual([c.parts.uniqueWords.state, c.parts.overlap.state], [NOT_TESTED, NOT_TESTED], c.slug);
  }
  assert.equal(by.nursing.parts.facts.state, FAIL);
  assert.equal(by["speech-pathology"].parts.facts.state, PASS);
  const score = by.nursing.parts.whyThisUrl.checks.find((x) => x.check === "near-identical");
  assert.ok(score.score <= score.bar, `the two rationales are near-identical: ${score.score}`);
});
