/**
 * F87 · THE WATCHMAN (Acceptance Amendment 1, _handoffs 2026-10-01) — C1–C7 on FAILURE FIXTURES, then on the REAL records.
 *
 * Two populations, never mixed: every "FIXTURE" test hands the pure assessment constructed records (a refused job, a lost write, a
 * recovered failure …) — those figures prove the RULE can fire. Every "REAL" test reads the engine's own recorded stores — those
 * figures are the real result. No failure is manufactured in any real store; nothing is fetched, run, rendered or written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { classifyJobs, classifyConnectors, classifyOutputs, classifyStaleness, matchGovernedWrites, correctedCoverage, watch, VERDICT, NOT_MEASURED, ALERT_SENDING } from "../src/ops/watchman.mjs";
import { readOperations } from "../src/ops/watchman-reader.mjs";
import { incompleteSagas, SAGA as BOUNDARY_SAGA, TERMINAL_PHASES as BOUNDARY_TERMINAL, RECOVERY_PHASES as BOUNDARY_RECOVERY } from "../src/governance/governed-write.mjs";
import { SAGA as WATCH_SAGA, TERMINAL_PHASES as WATCH_TERMINAL, RECOVERY_PHASES as WATCH_RECOVERY } from "../src/ops/watchman.mjs";
import { factFreshness } from "../src/facts/fact-health.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { readDeclarations } from "../src/tenancy/resolver.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixture builders: the smallest record each producer writes ---- */
const refused = (code) => ({ record_type: "cost_entry", outcome: "REFUSED", refusal: { code } });
const spent = () => ({ record_type: "cost_entry" });
const run = (id, coverageState) => ({ record_type: "crawl_run", run_id: id, coverageState });
const fix = (id, value, at) => ({ record_type: "crawl_run_correction", corrects_run_id: id, field: "coverageState", recorded_value: "COMPLETE", corrected_value: value, corrected_at: at, because: "recorded reason" });
const gw = (key, phase, outcome = "x") => ({ eventType: "GOVERNED_WRITE", outcome, metadata: { governedWriteKey: key, governedWritePhase: phase } });
const fact = (id, days, checkedOn) => ({ id, freshness: { days }, verification: { checkedOn } });

test("C1 · FIXTURE · FIRING CONTROL: a job is classed only by its own recorded outcome; the LATEST correction governs; UNKNOWN is NOT MEASURED", () => {
  const j = classifyJobs({
    costEntries: [refused("KILL_SWITCH_ON"), refused("CAP_WOULD_BE_EXCEEDED"), refused("KILL_SWITCH_ON"), spent()],
    crawlRuns: [run("a", "COMPLETE"), run("b", "UNKNOWN"), run("c", "COMPLETE")],
    corrections: [fix("a", "COMPLETE", "2026-09-14"), fix("a", "PARTIAL", "2026-09-13")].reverse(),
  });
  assert.deepEqual(j.cost.refusedByCode, { KILL_SWITCH_ON: 2, CAP_WOULD_BE_EXCEEDED: 1 });
  assert.equal(j.cost[NOT_MEASURED], 1, "a cost entry with no outcome was read as a success or a failure");
  /* a: corrected twice — PARTIAL on the 13th, COMPLETE again on the 14th: the later one governs whatever order the records sit in */
  assert.equal(correctedCoverage(run("a", "COMPLETE"), [fix("a", "COMPLETE", "2026-09-14"), fix("a", "PARTIAL", "2026-09-13")]).state, "COMPLETE");
  assert.equal(correctedCoverage(run("a", "COMPLETE"), [fix("a", "PARTIAL", "2026-09-13")]).state, "PARTIAL", "a correction was ignored");
  assert.deepEqual([j.runs.COMPLETE, j.runs.PARTIAL, j.runs[NOT_MEASURED], j.runs.of], [2, 0, 1, 3]);
  assert.match(j.note, /COMPLETE is the record's claim, not a bound check/);
  assert.match(j.note, /a job that left no record is not visible here/);
  assert.equal(j.verdict, VERDICT.DISPROVED);
  assert.equal(classifyJobs({ crawlRuns: [run("a", "COMPLETE")] }).verdict, VERDICT.PROVED);
  assert.equal(classifyJobs({}).verdict, VERDICT.COULD_NOT_PROVE, "an empty population read PROVED");
  assert.equal(classifyJobs({ costEntries: [spent()] }).verdict, VERDICT.COULD_NOT_PROVE, "spend with no outcome read PROVED");
});

test("C2 · FIXTURE · FIRING CONTROL: FORBIDDEN is UNAVAILABLE even beside a data state; a missing state is counted neither way; a claim is not a retrieval", () => {
  const ev = (value, collector = "src/search/ingest.mjs") => ({ record_type: "observation", collector, value });
  const ex = (kind, result) => ({ value: { kind, result } });
  const c = classifyConnectors({
    connectorObservations: [ev({ authState: "FORBIDDEN", dataState: "COMPLETE" }), ev({ dataState: "COMPLETE" }), ev({ dataState: "UNKNOWN" }), ev({})],
    externalObservations: [ex("external_page_retrieval", "SUCCESS"), ex("external_page_retrieval", "FAILED"), ex("external_page_retrieval", undefined), ex("external_claim_observation", undefined)],
  });
  assert.deepEqual(c.perKind.ingest, { AVAILABLE: 1, UNAVAILABLE: 1, [NOT_MEASURED]: 2, of: 4 });
  assert.deepEqual(c.perKind.external_page_retrieval, { AVAILABLE: 1, UNAVAILABLE: 1, [NOT_MEASURED]: 1, of: 3 });
  assert.equal(c.outsideNotRetrievals, 1);
  assert.equal(c.verdict, VERDICT.DISPROVED);
  assert.equal(classifyConnectors({ connectorObservations: [ev({ dataState: "COMPLETE" })] }).verdict, VERDICT.PROVED);
  assert.equal(classifyConnectors({ connectorObservations: [ev({ dataState: "COMPLETE" }), ev({})] }).verdict, VERDICT.COULD_NOT_PROVE);
  assert.equal(classifyConnectors({}).verdict, VERDICT.COULD_NOT_PROVE);
});

test("C3 · FIXTURE · FIRING CONTROL: PARTIAL only where the producer recorded it, with its reason; no state is NOT MEASURED; a PARTIAL is never dropped", () => {
  const r = (renderState, reason) => ({ value: { renderState, reason } });
  const o = classifyOutputs({
    renders: [r("PARTIAL", "network idle not reached"), r("PARTIAL", ""), r("COMPLETE"), r(undefined)],
    crawlRuns: [run("a", "COMPLETE")], corrections: [fix("a", "PARTIAL", "2026-09-13")],
    coverageObservations: [{ value: { coverageState: "COMPLETE" } }],
  });
  assert.deepEqual([o.COMPLETE, o.PARTIAL, o[NOT_MEASURED], o.of], [2, 3, 1, 6]);
  assert.deepEqual([o.partialWithReason, o.partialWithoutReason], [2, 1], "the corrected run's PARTIAL lost its recorded reason, or an empty reason was counted as one");
  assert.equal(o.verdict, VERDICT.DISPROVED);
  assert.equal(classifyOutputs({ renders: [r("COMPLETE")] }).verdict, VERDICT.PROVED);
  assert.equal(classifyOutputs({ renders: [r(undefined)] }).verdict, VERDICT.COULD_NOT_PROVE);
});

test("C4 · FIXTURE · FIRING CONTROL: facts by F45's VERIFIED rule on a STATED date; other evidence has no window and is NOT MEASURED — never fresh, never stale", () => {
  assert.throws(() => classifyStaleness({ facts: null, otherEvidence: 3 }), /never the clock's default/, "with no registry named, a missing date was defaulted");
  const facts = [fact("f1", 30, "2026-08-01"), fact("f2", 30, "2026-09-20"), fact("f3", null, "2026-09-20")];
  const s = classifyStaleness({ facts, on: "2026-10-02", otherEvidence: 5 });
  /* the same rule, not a copy: every count equals F45's own factFreshness on the same date */
  const direct = facts.map((f) => factFreshness(f, { on: "2026-10-02" }).state);
  assert.deepEqual(direct, ["EXPIRED", "CURRENT", "NOT_MEASURED"]);
  assert.deepEqual(s.facts.freshness, { EXPIRED: 1, CURRENT: 1, NOT_MEASURED: 1 });
  assert.equal(s.otherEvidence[NOT_MEASURED], 5);
  assert.match(s.otherEvidence.missing, /a declared freshness window/);
  assert.equal(s.verdict, VERDICT.DISPROVED);
  assert.equal(classifyStaleness({ facts: [fact("f2", 30, "2026-09-20")], on: "2026-10-02", otherEvidence: 0 }).verdict, VERDICT.PROVED);
  assert.equal(classifyStaleness({ facts: [fact("f2", 30, "2026-09-20")], on: "2026-10-02", otherEvidence: 1 }).verdict, VERDICT.COULD_NOT_PROVE, "evidence with no window read fresh");
  assert.equal(classifyStaleness({ facts: null, on: "2026-10-02", otherEvidence: 0 }).verdict, VERDICT.COULD_NOT_PROVE, "no registry read PROVED");
});

test("C5 · FIXTURE · FIRING CONTROL: an ALLOWED write with no outcome is a SILENT LOSS — matched IN ORDER, so a refusal BEFORE the attempt is no outcome for it", () => {
  const ok = matchGovernedWrites([gw("k1", "ATTEMPTED"), gw("k1", "COMMITTED"), gw("k2", "REFUSED"), gw("k3", "ATTEMPTED"), gw("k3", "REFUSED")]);
  assert.deepEqual([ok.allowed, ok.applied, ok.refused, ok.refusedBeforeAttempt, ok.silentLoss], [2, 1, 1, 1, 0]);
  assert.equal(ok.lossVerdict, VERDICT.PROVED);
  const lost = [gw("k1", "ATTEMPTED"), gw("k1", "COMMITTED"), gw("k2", "REFUSED"), gw("k2", "ATTEMPTED")];
  const m = matchGovernedWrites(lost);
  assert.equal(m.silentLoss, 1, "an attempt followed by no terminal was not flagged");
  assert.equal(m.lossVerdict, VERDICT.DISPROVED);
  /* the order blind spot this part closes: the boundary's own incompleteSagas counts k2's EARLIER refusal as its terminal */
  assert.equal(incompleteSagas(lost).length, 0, "CONTROL: the existing exposure is order-blind on this shape — if it now sees it, this test's claim is stale");
  assert.equal(matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "ATTEMPTED"), gw("k", "COMMITTED")]).silentLoss, 1, "a re-attempt hid the first attempt's lost outcome");
  assert.equal(matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "COMMITTED")], { malformedLines: 1 }).lossVerdict, VERDICT.COULD_NOT_PROVE, "an unreadable trail line read as no write");
  assert.equal(matchGovernedWrites([]).lossVerdict, VERDICT.COULD_NOT_PROVE, "an empty population read PROVED");
});

test("C5 · FIXTURE · FIRING CONTROL: recovery is PROVED only on a real recorded failure that was recovered — no failure is UNPROVED, never passed", () => {
  const none = matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "COMMITTED")]);
  assert.equal(none.recordedFailures, 0);
  assert.equal(none.recoveryVerdict, VERDICT.COULD_NOT_PROVE);
  assert.match(none.recoveryWhy, /recovery is UNPROVED, not passed/);
  assert.equal(none.verdict, VERDICT.COULD_NOT_PROVE, "a trail with no failure read PROVED");
  const retried = matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "FAILED"), gw("k", "ATTEMPTED"), gw("k", "COMMITTED")]);
  assert.deepEqual([retried.recordedFailures, retried.recovered, retried.silentLoss], [1, 1, 0], "a FAILED outcome was called silent, or its retry was not seen");
  assert.equal(retried.recoveryVerdict, VERDICT.PROVED);
  const rescued = matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "RECOVERY_REQUIRED"), gw("k", "RECOVERED_COMMITTED")]);
  assert.equal(rescued.recoveryVerdict, VERDICT.PROVED);
  const failedRecovery = matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "RECOVERY_REQUIRED"), gw("k", "RECOVERY_FAILED")]);
  assert.equal(failedRecovery.recoveryVerdict, VERDICT.DISPROVED);
  const outstanding = matchGovernedWrites([gw("k", "ATTEMPTED"), gw("k", "RECOVERY_REQUIRED")]);
  assert.deepEqual([outstanding.unrecovered, outstanding.recoveryVerdict], [1, VERDICT.COULD_NOT_PROVE]);
});

test("C6 · C7 · FIXTURE · FIRING CONTROL: every detected condition is an alert with its count and denominator; none is sent; an incomplete population names what is absent", () => {
  const w = watch({
    costEntries: [refused("KILL_SWITCH_ON"), spent()], crawlRuns: [run("a", "UNKNOWN")], corrections: [],
    connectorObservations: [{ collector: "x.mjs", value: { authState: "FORBIDDEN" } }], externalObservations: [],
    renders: [{ value: { renderState: "PARTIAL", reason: "r" } }], coverageObservations: [],
    facts: [fact("f1", 30, "2026-08-01")], otherEvidence: 2, trailEvents: [gw("k", "ATTEMPTED")], on: "2026-10-02",
  });
  const byCondition = Object.fromEntries(w.alerts.map((a) => [a.condition, [a.count, a.denominator]]));
  assert.deepEqual(byCondition, {
    "REFUSED job (cost entry)": [1, 2], "NOT MEASURED crawl run": [1, 1], "UNAVAILABLE connector observation": [1, 1],
    "PARTIAL output": [1, 2], "EXPIRED fact": [1, 1], "SILENT LOSS (ALLOWED governed write with no outcome)": [1, 1],
  });
  assert.ok(w.alerts.every((a) => Number.isInteger(a.count) && Number.isInteger(a.denominator)), "an alert lacks its denominator");
  assert.equal(w.alertSending, ALERT_SENDING);
  assert.match(w.alertSending, /NOT BUILT — no alert channel is declared/);
  assert.equal(w.incomplete, true);
  assert.ok(w.absent.some((s) => s.startsWith("recovery: no real recorded mid-write failure exists")));
  assert.equal(w.verdict, VERDICT.DISPROVED);
  const clean = watch({ crawlRuns: [run("a", "COMPLETE")], connectorObservations: [{ value: { dataState: "COMPLETE" } }], renders: [{ value: { renderState: "COMPLETE" } }], facts: [fact("f2", 30, "2026-09-20")], otherEvidence: 0, trailEvents: [gw("k", "ATTEMPTED"), gw("k", "COMMITTED")], on: "2026-10-02" });
  assert.deepEqual(clean.alerts, []);
  assert.equal(clean.verdict, VERDICT.COULD_NOT_PROVE, "a clean population with NO recorded failure read PROVED — recovery is unproved");
});

/* ================= REAL — the engine's own recorded stores ================= */

test("REAL · the engine's recorded operations: populations add up, no silent loss is hidden, and recovery is UNPROVED — never PROVED", () => {
  const ops = readOperations();
  const w = watch({ ...ops, facts: null, on: "2026-10-02" });
  const { jobs, connectors, outputs, staleness, recovery } = w.parts;
  assert.ok(ops.bound.costEntries > 0 && ops.bound.crawlRuns > 0 && ops.bound.trailEvents > 0 && ops.bound.renders > 0, "an EMPTY real store would make every zero meaningless");
  assert.equal(jobs.cost.REFUSED + jobs.cost[NOT_MEASURED], jobs.cost.of);
  assert.equal(jobs.runs.COMPLETE + jobs.runs.PARTIAL + jobs.runs[NOT_MEASURED], jobs.runs.of);
  assert.equal(outputs.COMPLETE + outputs.PARTIAL + outputs[NOT_MEASURED], outputs.of);
  assert.equal(recovery.applied + recovery.refused + recovery.recordedFailures + recovery.silentLoss, recovery.allowed, "an ALLOWED write is unaccounted");
  /* cross-check with the boundary's own exposure — the two must agree wherever its order blind spot cannot apply */
  if (recovery.silentLoss === 0) assert.equal(incompleteSagas(ops.trailEvents).length, 0);
  assert.equal(recovery.recordedFailures === 0 ? recovery.recoveryVerdict : VERDICT.COULD_NOT_PROVE, VERDICT.COULD_NOT_PROVE, "recovery read PROVED with no real recorded failure");
  assert.notEqual(w.verdict, VERDICT.PROVED);
  /* every recorded correction reaches the classifier — counted independently from the batch files */
  const raw = batchJsonlFiles().flatMap((p) => readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const recordedCorrections = raw.filter((r) => r.record_type === "crawl_run_correction").length;
  assert.ok(recordedCorrections > 0, "the real batch holds no correction — this check would prove nothing");
  assert.equal(ops.corrections.length, recordedCorrections, "a recorded correction was not read");
  console.log(`  REAL (count-only; engine stores; RR-107 research records not read): ${JSON.stringify({
    bound: ops.bound,
    C1: { refused: jobs.cost.REFUSED, byCode: jobs.cost.refusedByCode, costNoOutcome: jobs.cost[NOT_MEASURED], costOf: jobs.cost.of, runs: jobs.runs },
    C2: { perKind: connectors.perKind, outside: connectors.outsideNotRetrievals },
    C3: { COMPLETE: outputs.COMPLETE, PARTIAL: outputs.PARTIAL, NOT_MEASURED: outputs[NOT_MEASURED], of: outputs.of, withReason: outputs.partialWithReason },
    C4: { otherEvidenceNotMeasured: staleness.otherEvidence[NOT_MEASURED] },
    C5: { allowed: recovery.allowed, applied: recovery.applied, refused: recovery.refused, failures: recovery.recordedFailures, silentLoss: recovery.silentLoss, gateDecisionsAllowed: recovery.gateDecisionsAllowed, unclassified: recovery.unclassified },
    verdicts: Object.fromEntries(Object.entries(w.parts).map(([k, p]) => [k, p.verdict])), alerts: w.alerts.length, verdict: w.verdict,
  })}`);
});

test("C5 · FIXTURE · the reader reports an unreadable trail line, and the watch never reads it as no write", () => {
  const dir = mkdtempSync(join(tmpdir(), "almi-f87-engine-"));
  try {
    mkdirSync(join(dir, "audit-trail"), { recursive: true });
    writeFileSync(join(dir, "audit-trail", "events.jsonl"), JSON.stringify(gw("k", "ATTEMPTED")) + "\n" + JSON.stringify(gw("k", "COMMITTED")) + "\n{torn\n");
    const ops = readOperations({ engine: dir });
    assert.equal(ops.trailMalformedLines, 1);
    assert.equal(ops.bound.costEntries, 0, "a fixture engine read the real ledger");
    const w = watch({ ...ops, facts: null, on: "2026-10-02" });
    assert.equal(w.parts.recovery.lossVerdict, VERDICT.COULD_NOT_PROVE, "a torn trail line was read as no write");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= the entry point ================= */

test("C7 · THE ENTRY POINT: through the declared world it prints every part with its denominator, no URL or host, sends nothing, writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const noDate = spawnSync(process.execPath, WORLD.argv(["bin/watchman.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(noDate.status, 1, "a run with no stated date was judged on the clock's");
    assert.match(noDate.stderr, /--on=<YYYY-MM-DD> is required. There is no default/);
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/watchman.mjs", "--on=2026-10-02"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    for (const re of [/C1 jobs\s+cost entries: REFUSED \d+ .* of \d+ — /, /COMPLETE is the record's claim, not a bound check/, /C2 connectors\s+/, /C3 outputs\s+COMPLETE \d+ · PARTIAL \d+/, /C4 staleness\s+facts: NOT MEASURED — no fact registry was named/, /C5 silent loss\s+ALLOWED governed writes \d+: .* SILENT LOSS \d+ of \d+/, /recovery\s+no real recorded mid-write failure exists — recovery is UNPROVED, not passed — COULD-NOT-PROVE/, /sending: NOT BUILT — no alert channel is declared/, /C7 population\s+INCOMPLETE/]) assert.match(ok.stdout, re);
    for (const line of ok.stdout.split("\n").filter((l) => /^\s+ALERT\s/.test(l))) assert.match(line, /: \d+ of \d+$/, "an alert was printed without its denominator");
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\/|[a-z0-9-]+\.(com|org|net|io|pk|uk)\b/i, "the entry point printed a URL or host");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · THE REAL DECLARATIONS: every declared tenant is REFUSED by scope today — the cost ledger and evidence store are declared to no tenant", () => {
  const d = readDeclarations();
  const tenants = (d.tenants?.tenants ?? d.tenants).filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
  assert.ok(tenants.length > 0);
  for (const t of tenants) {
    const r = spawnSync(process.execPath, ["bin/watchman.mjs", "--on=2026-10-02", `--tenant=${t}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
    assert.equal(r.status, 3, `a real tenant read the engine-wide stores: ${r.status}`);
    assert.doesNotMatch(r.stdout, /C1 jobs/, "a refused run printed a part");
  }
});

test("the watchman and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/ops/watchman.mjs", "src/ops/watchman-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("C5 · the watchman's saga phases are the boundary's own — the list it holds cannot drift from the one the trail is written with", () => {
  assert.deepEqual(WATCH_SAGA, BOUNDARY_SAGA);
  assert.deepEqual(WATCH_TERMINAL, BOUNDARY_TERMINAL);
  assert.deepEqual(WATCH_RECOVERY, BOUNDARY_RECOVERY);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
