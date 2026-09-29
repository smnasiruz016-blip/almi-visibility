/**
 * F43 · CONTENT DECAY, REFRESH AND PRUNING (acceptance _handoffs 6c7627a, RR-91).
 *
 * Ages below are counted by hand from the fixture dates to the recorded window end, 2026-09-12:
 *   published 2026-09-01 → 11 days · 2026-07-20 → 54 days · 2026-06-01 → 103 days · 2026-05-01 → 134 days.
 * Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { assessPage, MISSING } from "../src/page/content-decay.mjs";
import { readClientDecay, NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { decideForPage } from "../src/page/action-decision.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixtures ---- */
const perf = (impressions) => ({ windowStart: "2026-08-15", windowEnd: "2026-09-12", impressions, ref: "obs:window" });
const CLEAR = { state: "CLEAR", evidence: ["F21 CONSISTENT", "served 200"] };
const page = (over = {}) => assessPage({ pageId: "p1", publishedOn: "2026-05-01", performance: perf(3), technical: CLEAR, ...over });
const weakAfter = (improvement, remeasure) => page({ improvement, remeasure });
const PAGE_BUNDLE = { pageId: "p1", servedState: { state: "OBSERVED", status: 200, evidence: ["o1"] }, signals: { state: "CONSISTENT", classes: [] }, sameNeedPeers: [], inboundLinks: 3, completeness: "INCOMPLETE", completenessRef: "c", staleFacts: [], quality: null, questionCoverage: null };

/* ================= C1 — the evaluation window ================= */

test("C1 · exactly one evaluation state per page, by V3 §17.1, with the evidence that decided it", () => {
  assert.equal(page({ technical: { state: "BLOCKED", evidence: ["served 404"] } }).evaluation.state, "BLOCKED");
  assert.deepEqual(page({ technical: { state: "BLOCKED", evidence: ["served 404"] } }).evaluation.evidence, ["served 404"]);
  assert.equal(page({ publishedOn: "2026-09-01" }).evaluation.state, "TOO_EARLY");
  assert.deepEqual(page({ publishedOn: "2026-09-01" }).evaluation.evidence, ["age 11 days at 2026-09-12"]);
  assert.equal(page({ publishedOn: "2026-06-01", performance: perf(150) }).evaluation.state, "EVALUABLE");
  assert.equal(page().evaluation.state, "FALLBACK_REVIEW");
  const between = page({ publishedOn: "2026-07-20" });
  assert.equal(between.evaluation.state, "NOT_MEASURED", "54 days with 3 impressions is neither evaluable nor at the fallback review");
  assert.ok(between.missing.includes(`window: ${MISSING.BETWEEN}`));
  /* a blocker outranks age: a BLOCKED page is never judged on demand */
  assert.equal(page({ publishedOn: "2026-09-01", technical: { state: "BLOCKED", evidence: ["x"] } }).evaluation.state, "BLOCKED");
  /* an unknown technical state is not clear */
  assert.equal(page({ technical: { state: "UNKNOWN", evidence: [] } }).evaluation.state, "NOT_MEASURED");
});

/* ================= C6 — age is not measured where it is not recorded (RR-91 resumption) ================= */

test("C6 · FIRING CONTROL: no recorded publication date is NOT MEASURED — never 'old enough', never 'too new' — and an uncovered page is NOT MEASURED, never zero", () => {
  const plenty = page({ publishedOn: null, performance: perf(5000) });
  assert.equal(plenty.evaluation.state, "NOT_MEASURED", "a page with no recorded age was treated as old enough to evaluate");
  assert.equal(plenty.result, "UNKNOWN");
  const none = page({ publishedOn: null, performance: perf(0) });
  assert.equal(none.evaluation.state, "NOT_MEASURED", "a page with no recorded age reached the fallback review");
  assert.notEqual(none.evaluation.state, "TOO_EARLY", "a page with no recorded age was treated as too new");
  assert.ok(none.missing.includes(`age: ${MISSING.AGE}`), "the missing age is not named with what it would decide");
  assert.equal(none.world, "NOT_MEASURED");
  /* no age: no demand can be recorded, so removal is never supplied however the other two facts stand */
  const noAge = page({ publishedOn: null, performance: perf(0), notServed: { ref: "s" }, noSuccessor: { ref: "n" } });
  assert.equal(noAge.removal, null, "removal evidence was supplied on an unrecorded age");
  /* no recorded row: exposure is unknown, not zero */
  const uncovered = page({ performance: null, notServed: { ref: "s" }, noSuccessor: { ref: "n" } });
  assert.equal(uncovered.evaluation.state, "NOT_MEASURED");
  assert.ok(uncovered.missing.includes(`performance: ${MISSING.PERFORMANCE}`));
  assert.equal(uncovered.removal, null, "an uncovered page was read as zero impressions");
});

/* ================= C2 — weak is not failure ================= */

test("C2 · a technically clear page at the fallback review is WEAK — and WEAK alone supplies no removal and no noindex", () => {
  const w = page();
  assert.equal(w.result, "WEAK");
  assert.equal(w.postPublication, null, "WEAK alone became noindex evidence");
  assert.equal(w.removal, null, "WEAK alone became removal evidence");
  for (const early of [page({ publishedOn: "2026-09-01" }), page({ publishedOn: "2026-07-20" }), page({ technical: { state: "BLOCKED", evidence: ["x"] } })]) {
    assert.notEqual(early.result, "WEAK", `WEAK before its evaluation state permits: ${early.evaluation.state}`);
  }
  assert.equal(page({ publishedOn: "2026-06-01", performance: perf(150) }).result, "NOT_WEAK");
});

/* ================= C3 — improve once, then re-measure ================= */

test("C3 · FIRING CONTROL: a WEAK page with no improvement is sent to IMPROVE ONCE and yields NO noindex evidence; the cycle is never skipped", () => {
  assert.deepEqual([page().workflow.step, page().postPublication], ["IMPROVE_ONCE", null], "a WEAK page with no improvement yielded noindex evidence");
  const tooSoon = weakAfter({ on: "2026-09-13", ref: "imp" }, { windowStart: "2026-09-14", windowEnd: "2026-10-01", impressions: 2, ref: "re" });
  assert.equal(tooSoon.workflow.step, "RE_MEASURE", "a re-measurement ending under 28 days after the improvement counted");
  assert.equal(tooSoon.postPublication, null);
  const overlapping = weakAfter({ on: "2026-09-13", ref: "imp" }, { windowStart: "2026-09-01", windowEnd: "2026-10-20", impressions: 2, ref: "re" });
  assert.equal(overlapping.workflow.step, "RE_MEASURE", "a window starting before the improvement counted as a re-measurement");
  const stillWeak = weakAfter({ on: "2026-09-13", ref: "imp" }, { windowStart: "2026-09-14", windowEnd: "2026-10-20", impressions: 2, ref: "re" });
  assert.equal(stillWeak.workflow.step, "DECIDED");
  assert.deepEqual(stillWeak.postPublication, { weakResult: true, ownerApprovalPath: true, ref: "re" });
  const recovered = weakAfter({ on: "2026-09-13", ref: "imp" }, { windowStart: "2026-09-14", windowEnd: "2026-10-20", impressions: 180, ref: "re" });
  assert.deepEqual([recovered.workflow.step, recovered.postPublication], ["DECIDED", null], "a recovered page yielded noindex evidence");
});

/* ================= C4 — owner approval, no automatic deletion ================= */

test("C4 · removal evidence only with ALL THREE recorded facts; contraction leaves F35 only as an owner-approval recommendation; F43 writes nothing", () => {
  const zero = { publishedOn: "2026-05-01", performance: perf(0) };
  const all = page({ ...zero, notServed: { ref: "served:410" }, noSuccessor: { ref: "none" } });
  assert.deepEqual(all.removal, { notServed: true, noSuccessor: true, noDemand: true, ref: "served:410 + none + obs:window" });
  assert.equal(page({ ...zero, notServed: { ref: "s" } }).removal, null, "removal without a recorded no-successor");
  assert.ok(page({ ...zero, notServed: { ref: "s" } }).missing.includes(`removal: ${MISSING.NO_SUCCESSOR}`));
  assert.equal(page({ ...zero, noSuccessor: { ref: "n" } }).removal, null, "removal without a recorded not-served");
  assert.equal(page({ performance: perf(1), notServed: { ref: "s" }, noSuccessor: { ref: "n" } }).removal, null, "removal with demand recorded");
  const d = decideForPage({ ...PAGE_BUNDLE, servedState: { state: "OBSERVED", status: 410, evidence: ["o"] }, postPublication: null, removal: all.removal });
  /* FIX (non-successful served state) and REMOVE are both evidenced; REMOVE is exclusive — F35 says CANNOT DECIDE, never deletes */
  assert.equal(d.decision, "CANNOT_DECIDE");
  assert.deepEqual(d.actions, [], "a not-served page's removal was returned alongside its repair");
  assert.match(d.missing[0], /contradicting actions: FIX \+ REMOVE/);
  const code = readFileSync(join(REPO, "src/page/content-decay.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(code, /writeFileSync|executeGovernedWrite|unlink|rmSync/, "F43 writes or removes");
});

/* ================= C5 — a pruning path that works ================= */

test("C5 · the inventory can shrink: re-measured WEAK → F35 NOINDEX; three recorded removal facts → F35 REMOVE — each an owner-approval recommendation", () => {
  const weak = weakAfter({ on: "2026-09-13", ref: "imp" }, { windowStart: "2026-09-14", windowEnd: "2026-10-20", impressions: 2, ref: "re" });
  const n = decideForPage({ ...PAGE_BUNDLE, postPublication: weak.postPublication, removal: weak.removal });
  assert.deepEqual(n.actions.map((a) => a.action), ["NOINDEX"], "the weak-result path did not reach NOINDEX");
  assert.equal(n.actions[0].ownerApprovalRequired, true);
  const gone = page({ publishedOn: "2026-05-01", performance: perf(0), notServed: { ref: "served:410" }, noSuccessor: { ref: "none" } });
  const r = decideForPage({ ...PAGE_BUNDLE, servedState: { state: "OBSERVED", status: 200, evidence: ["o"] }, postPublication: null, removal: gone.removal });
  assert.deepEqual(r.actions.map((a) => a.action), ["REMOVE"], "three recorded removal facts did not reach REMOVE");
  assert.equal(r.actions[0].ownerApprovalRequired, true);
  /* firing control: with nothing supplied, the inventory does not shrink */
  assert.equal(decideForPage({ ...PAGE_BUNDLE, postPublication: page().postPublication, removal: page().removal }).actions.some((a) => ["NOINDEX", "REMOVE"].includes(a.action)), false);
});

/* ================= REAL — count-only; and the pruning path on the REAL structures ================= */

test("REAL · the client's recorded structures, as they are — every page NOT MEASURED with its missing facts; covered by the recorded window, never zero", () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientDecay({ tenantId, resolve, decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
  assert.equal(r.fault, null, r.bound);
  assert.ok(r.summary.population > 0, "EMPTY real population");
  assert.ok(r.performance.pagesCovered > 0, "no real page is covered by the recorded window — the control would prove nothing");
  assert.equal(r.summary.world.SUPPORTED ?? 0, 0, "contraction evidence without a recorded age");
  for (const a of r.assessments) {
    assert.ok(a.missing.some((m) => m.startsWith("age: ")), "a real page's missing age is not named");
    assert.notEqual(a.evaluation.state, "TOO_EARLY");
    assert.notEqual(a.evaluation.state, "FALLBACK_REVIEW");
  }
  assert.match(r.bound, /publication dates 0/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)} | performance ${JSON.stringify({ ...r.performance, window: undefined })}`);
});

test("C5 · REAL structures: one real page given TEST-ONLY records (publication date, indexing check, one improvement, one re-measurement) reaches an F35 NOINDEX recommendation — and only that page", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const base = readClientDecay({ tenantId, resolve, decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
  const target = base.assessments[0].pageId;
  const decayEvidence = {
    publications: [{ pageId: target, publishedOn: "2026-05-01", ref: "test-publication" }],
    indexing: [{ pageId: target, state: "CLEAR", ref: "test-indexing" }],
    improvements: [{ pageId: target, on: "2026-09-13", ref: "test-improvement" }],
    remeasures: [{ pageId: target, windowStart: "2026-09-14", windowEnd: "2026-10-20", impressions: 3, ref: "test-remeasure" }],
  };
  const d = readClientDecay({ tenantId, resolve, decayEvidence }).assessments.find((a) => a.pageId === target);
  assert.equal(d.evaluation.state, "FALLBACK_REVIEW", "the real recorded window did not reach the target page");
  assert.deepEqual(d.postPublication, { weakResult: true, ownerApprovalPath: true, ref: "test-remeasure" });
  const ae = readClientActionEvidence({ tenantId, product, records, resolve, reviews: [], decayEvidence });
  const noindex = ae.pages.filter((p) => p.actions.some((a) => a.action === "NOINDEX"));
  assert.deepEqual(noindex.map((p) => p.subject.pageId), [target], "the real pruning path did not reach NOINDEX, or reached another page");
  assert.equal(noindex[0].actions.find((a) => a.action === "NOINDEX").ownerApprovalRequired, true);
});

test("C7 · THE ENTRY POINT: in a declared world it prints counts only, with its bound, and writes nothing; evidence must be passed explicitly", () => {
  assert.throws(() => readClientDecay({ tenantId: "t", resolve: () => null, decayEvidence: { publications: [], improvements: [], remeasures: [] } }), /passed explicitly/);
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-decay.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.match(ok.stdout, /NOT_MEASURED is not a result/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the assessment and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/content-decay.mjs", "src/page/content-decay-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
