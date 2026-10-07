/**
 * 🔴 ROW 60 — THE SEVEN SPLITS (14 September 2026). A split is a reading of the store, never a write to it.
 * GREEN on the real store, with every measured count held; each limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { classOf, splitView, splitErrors, isUnmeasured, effectiveClassesInUse } from "../src/audit/class-split.mjs";
import { reconcileRegister } from "../src/audit/consequence.mjs";
import { CLASS_SPLITS, UNMEASURED_REASON_CODES } from "../config/class-splits.mjs";
import { CONSEQUENCE_REGISTER, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const ALL = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());
const AUDIT = readdirSync(join(REPO, "runs", "audit")).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, "runs", "audit", f)).readAll());
const { view: VIEW } = splitView(ALL, CLASS_SPLITS);
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const check = (over = {}) => splitErrors({ records: ALL, splits: CLASS_SPLITS, unmeasuredCodes: UNMEASURED_REASON_CODES, ...over });
const clone = (x) => JSON.parse(JSON.stringify(x));

test("🟢 GREEN: every issue in the store is placed by its own stored signal, untouched, and every class is named for what it holds", () => {
  assert.deepEqual(check(), []);
});

test("🟢 MEASURED — the split, per class and per half, distinct and open, over every file under runs/", () => {
  const count = (cls) => {
    const m = [...VIEW.values()].filter((v) => v.class === cls);
    return [m.length, m.filter((v) => v.state === "OPEN").length];
  };
  assert.deepEqual(
    Object.fromEntries(Object.values(CLASS_SPLITS).flatMap((s) => s.halves.map((h) => [h.class, count(h.class)]))),
    {
      "indexability-preflight-found": [158, 158],
      "indexability-preflight-check-not-run": [210, 210],
      "sitemap-advertises-blocked-url-found": [0, 0],
      "sitemap-advertises-blocked-url-check-not-run": [350, 350],
      "orphan-within-crawled-set-found": [0, 0],
      "orphan-within-crawled-set-check-not-run": [340, 340],
      /* RR-196: the T-2 re-split — each *-found half RETIRED; its version-1 FAILs are withdrawn claims (all SUPERSEDED, so 0 open) and the
       * version-2 review signals that replaced them are decisions on record (all OPEN) */
      "thin-content-check-not-run": [108, 108],
      "thin-content-claim-withdrawn": [118, 0],
      "thin-content-review-signal": [118, 118],
      "near-duplicate-check-not-run": [108, 108],
      "near-duplicate-claim-withdrawn": [5, 0],
      "near-duplicate-review-signal": [5, 5],
      "template-dominance-check-not-run": [108, 108],
      "template-dominance-claim-withdrawn": [2, 0],
      "template-dominance-review-signal": [2, 2],
      "noindex-defect-claim-withdrawn": [134, 0],
      "noindex-declared-deliberate": [134, 134],
    },
  );
  const all = [...VIEW.values()];
  const notRun = all.filter((v) => isUnmeasured(v, UNMEASURED_REASON_CODES));
  /* RR-196: 2033 → 2158 distinct — the 125 version-2 review signals (UNKNOWN) are new issues; the 673 FAIL records stand as written */
  assert.deepEqual([all.length, all.filter((v) => v.verdict === "FAIL").length, notRun.length, notRun.filter((v) => v.state === "OPEN").length], [2158, 673, 1224, 1224]);
  // every check that never ran now sits under a name that says so
  assert.ok(notRun.every((v) => v.class.endsWith("-check-not-run")), "a check that never ran is still counted under a defect's name");
  // 🔴 no split class is in use without an entry, and the two empty "found" halves are not in use at all
  // since 14 Sep 2026 the checks-not-run halves are the COVERAGE register's, and every other class in use is a finding's
  // since Option A (14 Sep 2026) every class in use sits in exactly one of the four registers
  assert.deepEqual(effectiveClassesInUse(ALL, CLASS_SPLITS), [...Object.keys(CONSEQUENCE_REGISTER), ...Object.keys(COVERAGE_REGISTER), ...Object.keys(DECISION_REGISTER), ...Object.keys(AUDIT_TRAIL)].sort());
});

test("🔴 the store is untouched: the split writes nothing, and a record reads the same before and after it is classified", () => {
  const r = AUDIT.find((x) => x.issue_class === "orphan-within-crawled-set");
  const before = JSON.stringify(r);
  assert.equal(classOf(r, CLASS_SPLITS).class, "orphan-within-crawled-set-check-not-run");
  assert.equal(JSON.stringify(r), before);
  assert.equal(r.issue_class, "orphan-within-crawled-set", "the stored class name is unchanged — only the class it is COUNTED under differs");
  // and the superseded parents keep every word, naming the halves they became
  /* RR-196: a parent names the halves it became ON ITS SPLIT DAY (a re-split parent's firstHalves); a RETIRED half names the two classes its
   * records became, each a half of its own parent's split */
  for (const [k, e] of Object.entries(SUPERSEDED_ENTRIES)) {
    if (e.retired) assert.deepEqual([...e.supersededBy].filter((c) => CLASS_SPLITS[e.splitFrom].halves.some((h) => h.class === c)).length, 2, k);
    else assert.deepEqual([...e.supersededBy], CLASS_SPLITS[k].firstHalves ?? CLASS_SPLITS[k].halves.map((h) => h.class));
  }
  assert.deepEqual(Object.keys(SUPERSEDED_ENTRIES).filter((k) => SUPERSEDED_ENTRIES[k].retired).sort(), ["near-duplicate-found", "template-dominance-found", "thin-content-found"]);
  assert.equal(SUPERSEDED_ENTRIES["orphan-within-crawled-set"].level, "MODERATE", "the ruled level is kept on the superseded entry, where it ranks nothing");
});

test("🔴 RED signal: a record placed in a half whose stored signal it does not carry is refused, alone", () => {
  const splits = clone(CLASS_SPLITS);
  /* RR-196: on indexability-preflight-found — the thin-content-found half this test used is retired */
  splits["indexability-preflight"].halves[0].when.verdict = "PASS"; // 158 FAIL records now carry no half's signal…
  const view = new Map([...splitView(ALL, splits).view].map(([id, v]) => [id, v.storedClass === "indexability-preflight" && v.verdict === "FAIL" ? { ...v, class: "indexability-preflight-found" } : v])); // …and are placed anyway
  const errs = splitErrors({ records: ALL, splits, unmeasuredCodes: UNMEASURED_REASON_CODES, view });
  assert.deepEqual(limbs(errs), ["signal"], JSON.stringify(errs.slice(0, 3)));
  assert.equal(errs.length, 158);
});

test("🔴 RED signal: a half declared with NO stored signal is refused", () => {
  const splits = clone(CLASS_SPLITS);
  splits.noindex.halves[1].when = {};
  assert.ok(splitErrors({ records: ALL, splits, unmeasuredCodes: UNMEASURED_REASON_CODES }).some((e) => e.limb === "signal" && /declares no stored signal/.test(e.why)));
});

test("🔴 RED half-level: a half arriving with a level — its parent's ruling carried down — is refused, alone", () => {
  /* RR-196: on indexability-preflight-found, the one ruled half still in use — the thin-content-found / near-duplicate-found halves this
   * test used are retired. A PARENT's ruling (thin-content's MODERATE, owner) copied onto the half is the same carry-down. */
  const reg = clone(CONSEQUENCE_REGISTER);
  const parent = SUPERSEDED_ENTRIES["thin-content"];
  reg["indexability-preflight-found"] = { ...clone(parent), what: reg["indexability-preflight-found"].what, splitFrom: "indexability-preflight" };
  delete reg["indexability-preflight-found"].supersededOn;
  delete reg["indexability-preflight-found"].supersededBy;
  delete reg["indexability-preflight-found"].figureCorrection;
  const r = reconcileRegister({ records: AUDIT, register: reg, scale: SEVERITY_SCALE, splits: CLASS_SPLITS });
  assert.deepEqual([r.missing, r.stale, r.invalid], [[], [], []]);
  assert.deepEqual(r.inherited.map((x) => x.class), ["indexability-preflight-found"]);
  assert.equal(r.ok, false);
  // and a half given any level of its own, unruled, is refused the same way
  const reg2 = clone(CONSEQUENCE_REGISTER);
  reg2["indexability-preflight-found"].ruledFor = "indexability-preflight"; // a ruling that names the parent, not the half
  assert.deepEqual(reconcileRegister({ records: AUDIT, register: reg2, scale: SEVERITY_SCALE, splits: CLASS_SPLITS }).inherited.map((x) => x.class), ["indexability-preflight-found"]);
});

test("🔴 RED identity: an issue's opened_at or evidence changed by the split is refused, alone", () => {
  const view = new Map([...VIEW].map(([id, v]) => [id, v.splitFrom === "near-duplicate" ? { ...v, opened_at: "2026-09-14T00:00:00.000Z" } : v]));
  assert.deepEqual(limbs(check({ view })), ["identity"]);
  const view2 = new Map([...VIEW].map(([id, v]) => [id, v.splitFrom === "near-duplicate" ? { ...v, evidence: [] } : v]));
  assert.deepEqual(limbs(check({ view: view2 })), ["identity"]);
});

test("🔴 RED reopened: a SUPERSEDED issue read as OPEN by the split is refused, alone — and the 134 stay SUPERSEDED", () => {
  const view = new Map([...VIEW].map(([id, v]) => [id, v.class === "noindex-defect-claim-withdrawn" ? { ...v, state: "OPEN" } : v]));
  const errs = check({ view });
  assert.deepEqual(limbs(errs), ["reopened"]);
  assert.equal(errs.length, 134);
  assert.ok([...VIEW.values()].filter((v) => v.class === "noindex-defect-claim-withdrawn").every((v) => v.state === "SUPERSEDED"));
});

test("🔴 RED misnamed: a class of checks that never ran named as a defect is refused, alone", () => {
  const splits = clone(CLASS_SPLITS);
  splits["orphan-within-crawled-set"].halves[1].class = "orphan-within-crawled-set-structural-failure";
  const errs = splitErrors({ records: ALL, splits, unmeasuredCodes: UNMEASURED_REASON_CODES });
  assert.deepEqual(limbs(errs), ["misnamed"]);
  // two faces of the one limb: the records say "never ran", and the declaration's measure disagrees with the name
  assert.ok(errs.some((e) => /all 340 of its records are checks that never ran/.test(e.why)), JSON.stringify(errs));
  assert.ok(errs.some((e) => /declared to measure "unmeasured"/.test(e.why)), JSON.stringify(errs));
});

test("🔴 RED mixed: a class left unsplit while it holds both found defects and checks that never ran is refused, alone", () => {
  const { "thin-content": _gone, ...splits } = clone(CLASS_SPLITS);
  const errs = splitErrors({ records: ALL, splits, unmeasuredCodes: UNMEASURED_REASON_CODES });
  assert.deepEqual(limbs(errs), ["mixed"]);
  /* RR-196: 118 → 236 other records — unsplit, thin-content now bundles its 118 withdrawn claims AND its 118 review signals */
  assert.match(errs[0].why, /108 checks that never ran and 236 other records/);
});
