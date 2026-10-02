/**
 * F87 · THE WATCHMAN — operational monitoring from records that already exist. READ-ONLY; pure: records in, counts out.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F87_ACCEPTANCE_AMENDMENT_1_2026-10-01.md (C1–C7).
 *
 * Nothing is fetched, run, rendered, retried or written; no failure is manufactured. Each record is classed ONLY by its own
 * recorded state; a record that carries none is NOT MEASURED — never a pass, never a failure, never 0.
 *
 *   C1 jobs        a cost entry recorded REFUSED is a REFUSED job, by its refusal code; a cost entry with no recorded outcome records
 *                  spend, not success — NOT MEASURED. A crawl run is COMPLETE / PARTIAL / NOT MEASURED by its coverageState AFTER its
 *                  latest recorded correction (UNKNOWN is NOT MEASURED). COMPLETE is the record's claim, not a bound check.
 *   C2 connectors  UNAVAILABLE on a recorded authState FORBIDDEN or a retrieval result FAILED; AVAILABLE on dataState COMPLETE or result
 *                  SUCCESS; otherwise NOT MEASURED. Counted per connector kind.
 *   C3 outputs     PARTIAL only where the producer recorded it (renderState / coverageState), with its recorded reason; no state is
 *                  NOT MEASURED.
 *   C4 staleness   facts by F45's verified rule (src/facts/fact-health.mjs, REUSED) on a STATED date; every other evidence record has no
 *                  declared window and is NOT MEASURED, the missing declaration named.
 *   C5 recovery    every governed write recorded ALLOWED (saga phase ATTEMPTED) is matched, IN TRAIL ORDER and by its recorded key, to
 *                  the first terminal after it. APPLIED or REFUSED → matched; FAIL or INDETERMINATE → a RECORDED FAILURE (an outcome
 *                  exists, so it is not silent); none → SILENT LOSS. Recovery is PROVED only when at least one real recorded failure
 *                  exists and every one was recovered; with no real failure it is COULD-NOT-PROVE — "no failure" never reads "recovered".
 *   C6 alerts      every detected condition, with its count and denominator; SENDING IS NOT BUILT — no channel is declared.
 *   C7 verdicts    DISPROVED when a part's defect is found; PROVED only when every record of the part is measured and none is defective
 *                  and the part is not empty; COULD-NOT-PROVE otherwise. Count-only: no host, URL, identifier or content.
 */
import { assessFactHealth } from "../facts/fact-health.mjs";
/* The saga phases, as src/governance/governed-write.mjs records them. Held here, not imported: that module's chain reaches the trail
 * witness, which spawns a process, and a read-only watchman loads no such module. test/f87-watchman.test.mjs pins these three equal
 * to the boundary's own SAGA, TERMINAL_PHASES and RECOVERY_PHASES, so they cannot drift apart unseen. */
export const SAGA = Object.freeze({ ATTEMPTED: "ATTEMPTED", COMMITTED: "COMMITTED", REFUSED: "REFUSED", FAILED: "FAILED", RECOVERY_REQUIRED: "RECOVERY_REQUIRED", RECOVERED_COMMITTED: "RECOVERED_COMMITTED", RECOVERY_FAILED: "RECOVERY_FAILED" });
export const TERMINAL_PHASES = Object.freeze([SAGA.COMMITTED, SAGA.REFUSED, SAGA.FAILED, SAGA.RECOVERY_REQUIRED]);
export const RECOVERY_PHASES = Object.freeze([SAGA.RECOVERED_COMMITTED, SAGA.RECOVERY_FAILED]);

export const NOT_MEASURED = "NOT MEASURED";
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const ALERT_SENDING = "NOT BUILT — no alert channel is declared; every alert below is printed, none is sent";

const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const codeOf = (v) => (typeof v === "string" && CODE.test(v) ? v : "UNCODED");
const bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; return o; };
const partVerdict = ({ defects, unmeasured, size }) =>
  defects > 0 ? VERDICT.DISPROVED : unmeasured === 0 && size > 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;

/** A crawl run's coverageState after its LATEST recorded correction of that field (corrections in recorded order). */
export function correctedCoverage(run, corrections = []) {
  const mine = corrections
    .filter((c) => c?.corrects_run_id === run.run_id && c.field === "coverageState")
    .sort((a, b) => String(a.corrected_at ?? "").localeCompare(String(b.corrected_at ?? "")));
  return { state: mine.length ? mine[mine.length - 1].corrected_value : run.coverageState, corrected: mine.length > 0 };
}
const coverageClass = (s) => (s === "COMPLETE" || s === "PARTIAL" ? s : NOT_MEASURED);

/** C1 */
export function classifyJobs({ costEntries = [], crawlRuns = [], corrections = [] }) {
  const cost = { REFUSED: 0, [NOT_MEASURED]: 0, of: costEntries.length, refusedByCode: {} };
  for (const e of costEntries) {
    if (e.outcome === "REFUSED") { cost.REFUSED += 1; bump(cost.refusedByCode, codeOf(e.refusal?.code)); }
    else cost[NOT_MEASURED] += 1;
  }
  const runs = { COMPLETE: 0, PARTIAL: 0, [NOT_MEASURED]: 0, of: crawlRuns.length, corrected: 0 };
  for (const r of crawlRuns) { const c = correctedCoverage(r, corrections); runs[coverageClass(c.state)] += 1; if (c.corrected) runs.corrected += 1; }
  const defects = cost.REFUSED + runs.PARTIAL, unmeasured = cost[NOT_MEASURED] + runs[NOT_MEASURED];
  return {
    cost, runs,
    note: "a run record does not carry the bounds of the command that ran it — COMPLETE is the record's claim, not a bound check; a job that left no record is not visible here",
    verdict: partVerdict({ defects, unmeasured, size: costEntries.length + crawlRuns.length }),
  };
}

/** C2 — evidence-store observations and external retrievals; anything else is outside the part, counted, never classed. */
export function classifyConnectors({ connectorObservations = [], externalObservations = [] }) {
  const perKind = {};
  const row = (k) => (perKind[k] ??= { AVAILABLE: 0, UNAVAILABLE: 0, [NOT_MEASURED]: 0, of: 0 });
  let outside = 0;
  for (const o of connectorObservations) {
    const v = o?.value ?? {}, r = row(o?.collector ? String(o.collector).replace(/^.*[\\/]/, "").replace(/\.m?js$/, "") : "unnamed collector");
    r.of += 1;
    r[v.authState === "FORBIDDEN" ? "UNAVAILABLE" : v.dataState === "COMPLETE" ? "AVAILABLE" : NOT_MEASURED] += 1;
  }
  for (const o of externalObservations) {
    const v = o?.value ?? {};
    if (v.kind !== "external_page_retrieval") { outside += 1; continue; }
    const r = row(v.kind); r.of += 1;
    r[v.result === "FAILED" ? "UNAVAILABLE" : v.result === "SUCCESS" ? "AVAILABLE" : NOT_MEASURED] += 1;
  }
  const sum = (k) => Object.values(perKind).reduce((n, r) => n + r[k], 0);
  const of = sum("of");
  return { perKind, of, unavailable: sum("UNAVAILABLE"), unmeasured: sum(NOT_MEASURED), outsideNotRetrievals: outside,
    verdict: partVerdict({ defects: sum("UNAVAILABLE"), unmeasured: sum(NOT_MEASURED), size: of }) };
}

/** C3 — renders, crawl runs (corrected) and coverage-bearing observations: PARTIAL only where the producer recorded it. */
export function classifyOutputs({ renders = [], crawlRuns = [], corrections = [], coverageObservations = [] }) {
  const out = { COMPLETE: 0, PARTIAL: 0, [NOT_MEASURED]: 0, of: 0, partialWithReason: 0, partialWithoutReason: 0, byProducer: {} };
  const take = (producer, state, reason) => {
    const s = state === "COMPLETE" || state === "PARTIAL" ? state : NOT_MEASURED;
    out[s] += 1; out.of += 1;
    bump((out.byProducer[producer] ??= {}), s);
    if (s === "PARTIAL") out[typeof reason === "string" && reason.trim() !== "" ? "partialWithReason" : "partialWithoutReason"] += 1;
  };
  for (const r of renders) take("render", r?.value?.renderState, r?.value?.reason);
  for (const r of crawlRuns) take("crawl run", correctedCoverage(r, corrections).state, r.coverageNote ?? r.why ?? correctionReason(r, corrections));
  for (const o of coverageObservations) take("coverage observation", o?.value?.coverageState, o?.value?.why);
  return { ...out, verdict: partVerdict({ defects: out.PARTIAL, unmeasured: out[NOT_MEASURED], size: out.of }) };
}
const correctionReason = (run, corrections) => corrections.filter((c) => c?.corrects_run_id === run.run_id && c.field === "coverageState").map((c) => c.because).pop();

/** C4 — facts by F45's verified rule on a STATED date; every other evidence record has no declared window. */
export function classifyStaleness({ facts = null, on, otherEvidence = 0 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) throw new TypeError("the judging date must be stated (YYYY-MM-DD) — never the clock's default");
  const f = facts === null ? null : assessFactHealth(facts, { on }).summary;
  const freshness = f ? { ...f.freshness } : null;
  const expired = freshness?.EXPIRED ?? 0;
  const unmeasured = (freshness?.NOT_MEASURED ?? 0) + otherEvidence + (f ? 0 : 1);
  return {
    on, facts: f ? { judged: f.facts, retiredNotJudged: f.retiredNotJudged, freshness, missing: f.freshnessMissing } : null,
    factsAbsent: f ? null : "no fact registry was named for this run",
    otherEvidence: { [NOT_MEASURED]: otherEvidence, missing: "a declared freshness window — no evidence record other than a fact declares one" },
    verdict: partVerdict({ defects: expired, unmeasured, size: (f?.facts ?? 0) + otherEvidence }),
  };
}

/** C5 — every ALLOWED governed write matched, in trail order and by its recorded key, to the first terminal after it. */
export function matchGovernedWrites(events = [], { malformedLines = 0 } = {}) {
  const open = new Map(), failed = new Map();
  const r = { allowed: 0, applied: 0, refused: 0, recordedFailures: 0, recovered: 0, recoveryFailed: 0, silentLoss: 0, refusedBeforeAttempt: 0, unclassified: 0, gateDecisionsAllowed: 0 };
  for (const e of events) {
    if (e?.eventType === "WRITE_GATE_DECISION" && e.outcome === "ALLOWED") { r.gateDecisionsAllowed += 1; continue; }
    if (e?.eventType !== "GOVERNED_WRITE") continue;
    const key = e.metadata?.governedWriteKey, phase = e.metadata?.governedWritePhase;
    if (!key || !phase) { r.unclassified += 1; continue; }
    if (phase === SAGA.ATTEMPTED) { r.allowed += 1; if (open.has(key)) r.silentLoss += 1; open.set(key, true); continue; }
    if (TERMINAL_PHASES.includes(phase)) {
      if (!open.has(key)) { if (phase === SAGA.REFUSED) r.refusedBeforeAttempt += 1; else r.unclassified += 1; continue; }
      open.delete(key);
      if (phase === SAGA.COMMITTED) { r.applied += 1; if (failed.has(key)) { r.recovered += 1; failed.delete(key); } }
      else if (phase === SAGA.REFUSED) r.refused += 1;
      else { r.recordedFailures += 1; failed.set(key, phase); }
      continue;
    }
    if (RECOVERY_PHASES.includes(phase)) {
      if (!failed.has(key)) { r.unclassified += 1; continue; }
      failed.delete(key);
      if (phase === SAGA.RECOVERED_COMMITTED) r.recovered += 1; else r.recoveryFailed += 1;
      continue;
    }
    r.unclassified += 1;
  }
  r.unclassified += malformedLines; /* a trail line that could not be read is never read as "no write" */
  r.silentLoss += open.size;
  r.unrecovered = failed.size;
  const lossVerdict = r.silentLoss > 0 ? VERDICT.DISPROVED : r.allowed > 0 && r.unclassified === 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  const recoveryVerdict = r.recoveryFailed > 0 ? VERDICT.DISPROVED
    : r.recordedFailures > 0 && r.recovered === r.recordedFailures ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  const recoveryWhy = r.recordedFailures === 0
    ? "no real recorded mid-write failure exists — recovery is UNPROVED, not passed"
    : `${r.recovered} of ${r.recordedFailures} recorded failure(s) recovered`;
  return { ...r, lossVerdict, recoveryVerdict, recoveryWhy,
    verdict: [lossVerdict, recoveryVerdict].includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED
      : lossVerdict === VERDICT.PROVED && recoveryVerdict === VERDICT.PROVED ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
}

/** C6 + C7 — the whole watch. Every alert carries its count and denominator; nothing is sent. */
export function watch({ costEntries, crawlRuns, corrections, connectorObservations, externalObservations, renders, coverageObservations, facts, otherEvidence, trailEvents, trailMalformedLines = 0, on }) {
  const parts = {
    jobs: classifyJobs({ costEntries, crawlRuns, corrections }),
    connectors: classifyConnectors({ connectorObservations, externalObservations }),
    outputs: classifyOutputs({ renders, crawlRuns, corrections, coverageObservations }),
    staleness: classifyStaleness({ facts, on, otherEvidence }),
    recovery: matchGovernedWrites(trailEvents, { malformedLines: trailMalformedLines }),
  };
  const { jobs, connectors, outputs, staleness, recovery } = parts;
  const alerts = [
    ["REFUSED job (cost entry)", jobs.cost.REFUSED, jobs.cost.of],
    ["PARTIAL crawl run", jobs.runs.PARTIAL, jobs.runs.of],
    ["NOT MEASURED crawl run", jobs.runs[NOT_MEASURED], jobs.runs.of],
    ["UNAVAILABLE connector observation", connectors.unavailable, connectors.of],
    ["PARTIAL output", outputs.PARTIAL, outputs.of],
    ["EXPIRED fact", staleness.facts?.freshness?.EXPIRED ?? 0, staleness.facts?.judged ?? 0],
    ["SILENT LOSS (ALLOWED governed write with no outcome)", recovery.silentLoss, recovery.allowed],
    ["RECORDED write failure not recovered", recovery.unrecovered + recovery.recoveryFailed, recovery.recordedFailures],
  ].filter(([, n]) => n > 0).map(([condition, count, denominator]) => ({ condition, count, denominator }));
  const absent = [
    jobs.cost[NOT_MEASURED] && `job outcome: ${jobs.cost[NOT_MEASURED]} of ${jobs.cost.of} cost entr(ies) record spend but no outcome`,
    jobs.runs[NOT_MEASURED] && `crawl coverage: ${jobs.runs[NOT_MEASURED]} of ${jobs.runs.of} run(s) recorded no COMPLETE or PARTIAL state`,
    connectors.unmeasured && `connector state: ${connectors.unmeasured} of ${connectors.of} connector observation(s) recorded no availability state`,
    outputs[NOT_MEASURED] && `output completeness: ${outputs[NOT_MEASURED]} of ${outputs.of} output(s) recorded no completeness state`,
    staleness.factsAbsent && `fact freshness: ${staleness.factsAbsent}`,
    staleness.facts?.freshness?.NOT_MEASURED && `fact freshness: ${staleness.facts.freshness.NOT_MEASURED} of ${staleness.facts.judged} fact(s) lack a declared window or a check date`,
    staleness.otherEvidence[NOT_MEASURED] && `evidence freshness: ${staleness.otherEvidence[NOT_MEASURED]} evidence record(s) — ${staleness.otherEvidence.missing}`,
    recovery.recordedFailures === 0 && `recovery: ${recovery.recoveryWhy}`,
    recovery.gateDecisionsAllowed && `write outcomes: ${recovery.gateDecisionsAllowed} write-gate decision(s) recorded ALLOWED carry no governed-write key, so their outcome cannot be matched`,
    recovery.unclassified && `write outcomes: ${recovery.unclassified} governed-write event(s) or unreadable trail line(s) could not be placed in a saga`,
  ].filter(Boolean);
  const verdicts = Object.values(parts).map((p) => p.verdict);
  return {
    parts, alerts, alertSending: ALERT_SENDING, absent, incomplete: absent.length > 0,
    verdict: verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE,
  };
}
