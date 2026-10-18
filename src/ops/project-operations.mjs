/**
 * 🔴 F87 · OPERATIONAL MONITORING ALERTS AND RECOVERY — one client project's own operations (acceptance _handoffs
 * AlmiVisibility_F87_ACCEPTANCE_2026-10-17.md; scope by beta-g decision B of 18 Oct 2026, RR-284: "each client project's own operations
 * (failed runs, stale facts, blocked sources, partial outputs of that project)"). Pure: records and bytes in, lists and counts out.
 *
 *   C1 FAILED JOBS        every trail event of the project's tenant whose outcome is REFUSED, FAILED, INVALID or ERROR, with its reason
 *                         code — the count listed is the count in the trail. An event with no tenant is the engine's, never the project's:
 *                         it is counted apart, never listed as the project's.
 *   C2 STALE EVIDENCE     every fact of the project's pages whose read date plus its own recheck interval has passed on the STATED date
 *                         (src/facts/source-reader.mjs dueOn, held here and pinned equal); a kept recheck that found the source CURRENT
 *                         moves its read date.
 *                         A fact with no interval or no read date is NOT MEASURED, never "not stale".
 *   C3 UNAVAILABLE        every source whose LATEST stored read is BLOCKED, with its reason; a source read since is not listed.
 *   C4 PARTIAL OUTPUTS    a store left half-written (a JSONL line that does not parse, or a last line with no line end; a JSON file that
 *                         does not parse) and a governed write of the project begun (ATTEMPTED) with no terminal after it — the saga
 *                         phases of src/ops/watchman.mjs, REUSED.
 *   C5 RECOVERY           on a scratch copy only: each half-written JSONL store keeps every whole record, byte for byte, and its broken
 *                         tail is MOVED to a sidecar file beside it — nothing is deleted; only what failed is touched and only what failed
 *                         is listed to re-run. A file that is not half-written is never opened for writing. The plan is pure; its caller
 *                         hands the writer.
 *   C6 ALERT              one plain-text report the owner reads on this machine; nothing is sent (src/ops/watchman.mjs ALERT_SENDING).
 *
 * Generic: no product, tenant or host is named here.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { SAGA, TERMINAL_PHASES, ALERT_SENDING } from "./watchman.mjs";

/* Held here, not imported: src/facts/source-reader.mjs reaches the network (it reads sources), and a monitor loads no such module.
 * test/f87-project-operations.test.mjs pins these equal to that module's own SOURCE_READ_RECORD, READ_STATE.BLOCKED and dueOn. */
export const SOURCE_READ_RECORD = "source_page_read";
export const BLOCKED = "BLOCKED";
export function dueOn(f, on) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "");
  if (!ok(f?.readOn) || !ok(on) || !(Number.isInteger(f?.recheckDays) && f.recheckDays > 0)) return null;
  return (Date.parse(`${on}T00:00:00Z`) - Date.parse(`${f.readOn}T00:00:00Z`)) / 86400000 >= f.recheckDays;
}
const hostOf = (url) => { try { return new URL(String(url)).host; } catch { return null; } };

export const FAILED_OUTCOMES = Object.freeze(["REFUSED", "FAILED", "INVALID", "ERROR"]);
export const PARTIAL = Object.freeze({ LINE_UNREADABLE: "A_LINE_DOES_NOT_PARSE", NO_LINE_END: "LAST_LINE_HAS_NO_LINE_END", JSON_UNREADABLE: "JSON_FILE_DOES_NOT_PARSE", WRITE_NEVER_FINISHED: "WRITE_BEGUN_NEVER_FINISHED" });
export const RECOVERY_REFUSAL = Object.freeze({ NOT_A_SCRATCH_COPY: "RECOVERY_RUNS_ON_A_SCRATCH_COPY_ONLY" });
export const SIDECAR = ".partial-tail";

/** C1 · the project's failed or refused runs, each with its reason; the engine's own (no tenant) counted apart. */
export function failedRuns(events, { tenantId }) {
  const failed = (events ?? []).filter((e) => FAILED_OUTCOMES.includes(e?.outcome));
  const mine = failed.filter((e) => e.tenantId === tenantId);
  return Object.freeze({
    listed: Object.freeze(mine.map((e) => Object.freeze({ eventId: e.eventId, occurredAt: e.occurredAt, eventType: e.eventType, action: e.action, outcome: e.outcome, reason: e.reasonCode ?? null }))),
    inTrail: mine.length,
    engineOwn: failed.filter((e) => !e.tenantId).length,
  });
}

/** C2 · facts past their own recheck interval on `on`; a CURRENT kept recheck moves a fact's read date to its own day. */
export function staleFacts(facts, { on, rechecks = [] }) {
  const lastCurrent = new Map();
  for (const r of rechecks) if (r?.state === "CURRENT" && typeof r.recorded_at === "string") {
    const d = r.recorded_at.slice(0, 10), was = lastCurrent.get(r.factId);
    if (!was || d > was) lastCurrent.set(r.factId, d);
  }
  const stale = [], notMeasured = [];
  let current = 0;
  for (const f of facts ?? []) {
    const moved = lastCurrent.get(f.factId);
    const readOn = moved && (!f.readOn || moved > f.readOn) ? moved : f.readOn;
    const due = dueOn({ readOn, recheckDays: f.recheckDays }, on);
    if (due === null) notMeasured.push(Object.freeze({ factId: f.factId, missing: !f.readOn && !moved ? "a read date" : "a recheck interval" }));
    else if (due) stale.push(Object.freeze({ factId: f.factId, readOn, recheckDays: f.recheckDays, pages: f.pages ?? [] }));
    else current += 1;
  }
  return Object.freeze({ stale: Object.freeze(stale), current, notMeasured: Object.freeze(notMeasured), of: (facts ?? []).length });
}

/** C3 · sources whose latest stored read is BLOCKED, with its reason. Reads in stored order; a later one replaces an earlier one. */
export function blockedSources(reads) {
  const latest = new Map();
  for (const r of reads ?? []) if (r?.record_type === SOURCE_READ_RECORD && typeof r.url === "string") {
    const was = latest.get(r.url);
    if (!was || String(r.readOn ?? "") >= String(was.readOn ?? "")) latest.set(r.url, r);
  }
  const blocked = [...latest.values()].filter((r) => r.state === BLOCKED)
    .map((r) => Object.freeze({ url: r.url, host: r.host ?? hostOf(r.url), reason: r.reason ?? null, readOn: r.readOn ?? null }));
  return Object.freeze({ blocked: Object.freeze(blocked), sources: latest.size });
}

/** C4 · one stored file's bytes: half-written or whole. */
export function fileState(name, text) {
  if (name.endsWith(".json")) { try { JSON.parse(text); return null; } catch { return PARTIAL.JSON_UNREADABLE; } }
  if (!name.endsWith(".jsonl") || text === "") return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[lines.length - 1] !== "") return PARTIAL.NO_LINE_END;
  for (const l of lines.slice(0, -1)) { if (l.trim() === "") continue; try { JSON.parse(l); } catch { return PARTIAL.LINE_UNREADABLE; } }
  return null;
}

/** C4 · governed writes of the project begun and never finished (no terminal phase after the attempt, by its recorded key). */
export function writesNeverFinished(events, { tenantId }) {
  const open = new Map();
  for (const e of events ?? []) {
    if (e?.eventType !== "GOVERNED_WRITE" || e.tenantId !== tenantId) continue;
    const key = e.metadata?.governedWriteKey, phase = e.metadata?.governedWritePhase;
    if (!key || !phase) continue;
    if (phase === SAGA.ATTEMPTED) open.set(key, e);
    else if (TERMINAL_PHASES.includes(phase)) open.delete(key);
  }
  return [...open.values()].map((e) => Object.freeze({ eventId: e.eventId, occurredAt: e.occurredAt, action: e.action, state: PARTIAL.WRITE_NEVER_FINISHED }));
}

const storeFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /\.jsonl?$/.test(f) && statSync(join(dir, f)).isFile()).sort() : []);

/** C4 · every half-written store of a batch directory, and every write begun and never finished. */
export function partialOutputs({ dir, events = [], tenantId }) {
  const halfWritten = storeFiles(dir).map((f) => ({ file: f, state: fileState(f, readFileSync(join(dir, f), "utf8")) })).filter((x) => x.state).map((x) => Object.freeze(x));
  return Object.freeze({ halfWritten: Object.freeze(halfWritten), neverFinished: Object.freeze(writesNeverFinished(events, { tenantId })), files: storeFiles(dir).length });
}

const wholeLines = (text) => { const lines = text.replace(/\r\n/g, "\n").split("\n"); const keep = []; const broken = []; lines.forEach((l, i) => { if (l.trim() === "") return; try { JSON.parse(l); if (i < lines.length - 1) keep.push(l); else broken.push(l); } catch { broken.push(l); } }); return { keep, broken }; };
export const recordCount = (dir) => storeFiles(dir).filter((f) => f.endsWith(".jsonl")).reduce((n, f) => n + wholeLines(readFileSync(join(dir, f), "utf8")).keep.length, 0);

/**
 * C5 · the recovery of a scratch copy, as a PLAN (this module writes nothing): only half-written JSONL stores are touched; each keeps its
 * whole records in order and its broken bytes move to `<file>.partial-tail` (appended to what it holds, never replaced). A JSON file that
 * does not parse and a write never finished are NOT repaired — they are listed to re-run, by name. Refused unless `dir` lies outside every
 * path in `real`. `applyRecovery` carries the plan out through the writer its caller hands it.
 */
export function recoveryPlan({ dir, real = [] }) {
  const d = resolve(dir);
  if (real.some((r) => { const rel = relative(resolve(r), d); return rel === "" || (!rel.startsWith("..") && !/^[A-Za-z]:/.test(rel)); })) return Object.freeze({ refused: RECOVERY_REFUSAL.NOT_A_SCRATCH_COPY });
  const writes = [], repaired = [], rerun = [];
  for (const f of storeFiles(d)) {
    const text = readFileSync(join(d, f), "utf8"), state = fileState(f, text);
    if (!state) continue;
    if (state === PARTIAL.JSON_UNREADABLE) { rerun.push(Object.freeze({ file: f, state })); continue; }
    const { keep, broken } = wholeLines(text);
    const side = join(d, f + SIDECAR);
    writes.push(Object.freeze({ path: side, text: (existsSync(side) ? readFileSync(side, "utf8") : "") + broken.join("\n") + "\n" }));
    writes.push(Object.freeze({ path: join(d, f), text: keep.map((l) => l + "\n").join("") }));
    repaired.push(Object.freeze({ file: f, state, kept: keep.length, movedLines: broken.length, sidecar: f + SIDECAR }));
    rerun.push(Object.freeze({ file: f, state, what: "the write that left this store half-written" }));
  }
  return Object.freeze({ dir: d, writes: Object.freeze(writes), repaired: Object.freeze(repaired), rerun: Object.freeze(rerun), before: recordCount(d) });
}
/** C5 · carry a plan out: the sidecar first, then the store, through `write(path, text)`; the record count is read again after. */
export function applyRecovery(plan, { write }) {
  if (plan.refused) return plan;
  for (const w of plan.writes) write(w.path, w.text);
  return Object.freeze({ ...plan, after: recordCount(plan.dir) });
}

/** C6 · the report, as plain text for the owner; nothing is sent. */
export function operationsReport({ subject, on, runs, facts, sources, partial }) {
  const L = [
    `OPERATIONS REPORT · ${subject} · ${on}`,
    `ALERTS: ${ALERT_SENDING}`,
    "",
    `1. FAILED OR REFUSED RUNS OF THIS PROJECT: ${runs.inTrail} (the engine's own, with no project: ${runs.engineOwn}, not listed)`,
    ...runs.listed.map((r) => `   - ${r.occurredAt} ${r.eventType} ${r.action} ${r.outcome} — ${r.reason ?? "no reason recorded"}`),
    `2. FACTS PAST THEIR OWN RECHECK INTERVAL: ${facts.stale.length} of ${facts.of} (current ${facts.current}, not measured ${facts.notMeasured.length})`,
    ...facts.stale.map((f) => `   - ${f.factId} · read ${f.readOn} · every ${f.recheckDays} days · pages ${f.pages.join(", ") || "-"}`),
    ...facts.notMeasured.map((f) => `   - NOT MEASURED ${f.factId} · missing ${f.missing}`),
    `3. SOURCES BLOCKED IN THEIR LATEST READ: ${sources.blocked.length} of ${sources.sources}`,
    ...sources.blocked.map((s) => `   - ${s.url} · ${s.reason ?? "no reason recorded"} · ${s.readOn ?? "-"}`),
    `4. PARTIAL OUTPUTS: stores half-written ${partial.halfWritten.length} of ${partial.files} · writes begun and never finished ${partial.neverFinished.length}`,
    ...partial.halfWritten.map((p) => `   - ${p.file} · ${p.state}`),
    ...partial.neverFinished.map((p) => `   - ${p.occurredAt} ${p.action} · ${p.state}`),
  ];
  return L.join("\n") + "\n";
}
