/**
 * F86 · INDEPENDENT ACCEPTANCE AND PORTABILITY SUITE (acceptance _handoffs 903f361, AlmiVisibility_F86_ACCEPTANCE_2026-10-17.md, RR-283).
 *
 * The suite's verdicts are pure (src/acceptance/suite.mjs); the one entry (test/helpers/f86-acceptance-suite.mjs) runs them for real, here and
 * in a fresh clone, and keeps its report under runs/audit. These are the firing controls of every verdict, and the checks that the declared
 * parts are what the approved clauses ask for. Nothing is run, fetched or written here; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PARTS, partVerdict, suiteVerdict, cloneVerdict, countsIn, totalsOf, report, VERDICT } from "../src/acceptance/suite.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const part = (id) => PARTS.find((p) => p.id === id);
const green = (n = 3, extra = "") => `${extra}\nℹ tests ${n}\nℹ suites 0\nℹ pass ${n}\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\n`;
const limbOut = (id, proved = true, residue = 0, unchanged = true) => `${id} limb [f] → t: landed true · restored true · ${proved ? "PROVED" : "NOT PROVED"}\nproved ${proved ? 1 : 0} of 1 · residue ${residue} · production trail sha256 after: x · unchanged ${unchanged}\n`;
const passingRuns = (p) => (p.kind === "TESTS" ? p.files.map((file) => ({ file, exit: 0, out: green(3, p.counts ? "  REAL (count-only): x" : "") })) : p.limbs.map((l) => ({ limb: l.limb, exit: 0, out: limbOut(l.limb) })));

test("C1 · ONE SUITE: every declared part has a verdict and a line; the suite is PASS only when every part ran and passed — a failed or a missing part makes it FAIL", () => {
  assert.deepEqual(PARTS.map((p) => p.clause), ["C3", "C4", "C5"], "a clause has no part, or a part was added without its clause");
  const all = PARTS.map((p) => partVerdict(p, passingRuns(p)));
  assert.deepEqual(suiteVerdict(all), { verdict: VERDICT.PASS, missing: [], failed: [] });
  const oneFailed = all.map((v, i) => (i === 1 ? { ...v, verdict: VERDICT.FAIL } : v));
  assert.equal(suiteVerdict(oneFailed).verdict, VERDICT.FAIL, "a failed part was reported PASS");
  assert.deepEqual(suiteVerdict(all.slice(1)).missing, [PARTS[0].id], "a part that did not run was not named");
  assert.equal(suiteVerdict(all.slice(1)).verdict, VERDICT.FAIL);
  const lines = report({ where: "HERE", head: "h", verdicts: all.slice(1) });
  for (const p of PARTS) assert.ok(lines.some((l) => l.includes(p.id) && /PASS|FAIL/.test(l)), `${p.id} has no PASS / FAIL line`);
  assert.match(lines.find((l) => l.includes(PARTS[0].id)), /FAIL — did not run/);
});

test("C2 · PORTABLE: a clone run passes only when it finished, its suite passed and it changed no tracked file", () => {
  assert.equal(cloneVerdict({ finished: true, exit: 0, suite: VERDICT.PASS, trackedChanged: false }).verdict, VERDICT.PASS);
  for (const [why, x] of [["unfinished", { finished: false, exit: null, suite: null, trackedChanged: false }], ["exit 1", { finished: true, exit: 1, suite: VERDICT.FAIL, trackedChanged: false }],
    ["suite failed", { finished: true, exit: 0, suite: VERDICT.FAIL, trackedChanged: false }], ["no suite line", { finished: true, exit: 0, suite: null, trackedChanged: false }], ["a tracked file changed", { finished: true, exit: 0, suite: VERDICT.PASS, trackedChanged: true }]]) {
    assert.equal(cloneVerdict(x).verdict, VERDICT.FAIL, `${why}: the clone run read as passing`);
  }
});

test("C3 · DEFECTS CAUGHT: the sample spans rows, each limb run alone; a limb not PROVED, a residue or a moved trail fails the part", () => {
  const p = part("DEFECTS_CAUGHT");
  assert.ok(new Set(p.limbs.map((l) => l.row)).size >= 3, "the sample does not span rows");
  for (const l of p.limbs) assert.ok(existsSync(join(REPO, l.harness)), `${l.harness} is missing`);
  assert.equal(partVerdict(p, passingRuns(p)).verdict, VERDICT.PASS);
  const first = p.limbs[0].limb;
  for (const [why, out] of [["not proved", limbOut(first, false)], ["residue", limbOut(first, true, 1)], ["trail moved", limbOut(first, true, 0, false)]]) {
    const runs = passingRuns(p).map((r, i) => (i === 0 ? { ...r, out } : r));
    assert.equal(partVerdict(p, runs).verdict, VERDICT.FAIL, `${why}: the part passed`);
  }
  assert.equal(partVerdict(p, passingRuns(p).slice(1)).verdict, VERDICT.FAIL, "a limb that did not run passed the part");
});

test("C4 · NEUTRAL AND ISOLATED: the part runs the existing censuses, each holding its planted controls; a failing census fails the part", () => {
  const p = part("NEUTRAL_AND_ISOLATED");
  for (const f of p.files) assert.match(readFileSync(join(REPO, f), "utf8"), /planted/i, `${f} holds no planted control`);
  const text = p.files.map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.match(text, /planted client word|client host planted/, "no planted-name control is in the part");
  assert.match(text, /cross-tenant/, "no cross-tenant control is in the part");
  assert.equal(partVerdict(p, passingRuns(p)).verdict, VERDICT.PASS);
  /* each sign of a failing census fails the part on its own: its exit code, and its own count of failed tests */
  const exited = passingRuns(p).map((r, i) => (i === 0 ? { ...r, exit: 1 } : r));
  assert.equal(partVerdict(p, exited).verdict, VERDICT.FAIL, "a census that exited non-zero passed the part");
  const failedOne = passingRuns(p).map((r, i) => (i === 0 ? { ...r, out: green(3).replace("ℹ fail 0", "ℹ fail 1") } : r));
  assert.equal(partVerdict(p, failedOne).verdict, VERDICT.FAIL, "a census with a failed test passed the part");
});

test("C5 · REAL POPULATION: every real-population file must run, pass, skip nothing and print its counts; the counts are carried into the report", () => {
  const p = part("REAL_POPULATION");
  for (const f of p.files) assert.match(readFileSync(join(REPO, f), "utf8"), /count-only/, `${f} prints no counts`);
  assert.equal(partVerdict(p, passingRuns(p)).verdict, VERDICT.PASS);
  const skipped = passingRuns(p).map((r, i) => (i === 0 ? { ...r, out: r.out.replace("ℹ skipped 0", "ℹ skipped 1") } : r));
  assert.match(partVerdict(p, skipped).why.join(" "), /skipped/, "a skipped real test passed the part");
  const silent = passingRuns(p).map((r, i) => (i === 0 ? { ...r, out: green(3) } : r));
  assert.match(partVerdict(p, silent).why.join(" "), /no counts line/, "a real test with no counts passed the part");
  assert.deepEqual(countsIn("x\n  REAL (count-only): a · b\nREAL2 (2026, count-only): c\nother"), ["REAL (count-only): a · b", "REAL2 (2026, count-only): c"]);
  assert.deepEqual(totalsOf(green(4)), { tests: 4, pass: 4, fail: 0, skipped: 0, cancelled: 0, todo: 0 });
});

test("the suite's verdicts name no product and load no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/acceptance/suite.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
