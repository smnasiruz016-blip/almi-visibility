/**
 * 🔴 F89 · FINAL INDEPENDENT AUDIT AND DONE DECLARATION (acceptance _handoffs AlmiVisibility_F89_ACCEPTANCE_2026-10-19.md, RR-291; owner
 * answer Q8: the final audit is made by a separate agent that did not build the rows).
 *
 *   C1 · an audit record is accepted only when it names its auditor, that auditor is not the builder, and it cites the frozen contract
 *        sha256 of every row it audits (config/fboard/acceptances.mjs ACCEPTANCES[id].contractSha256) — otherwise it is refused, named;
 *   C2 · the declaration lists every deferred clause by row, read from each row's LATEST VERIFIED event (src/fboard/deferred.mjs) — nothing
 *        inferred, nothing dropped;
 *   C3 · no hidden blocker: every row that is not VERIFIED-PASS is named with its state and the reason the board itself records (its
 *        blocker, its NOT REQUIRED entry, or its latest event); a row with no recorded reason is named HIDDEN, and the board is not done.
 * Pure: it reads the board it is given and writes nothing. Generic: it names no client, product or host.
 */
import { deferredRows, DEFERRED } from "./deferred.mjs";

export const VERIFIED_PASS = "VERIFIED-PASS";
export const VERDICTS = Object.freeze(["AGREE", "DISAGREE"]);
export const REASON_SOURCE = Object.freeze({ BLOCKER: "BLOCKER", NOT_REQUIRED: "NOT_REQUIRED", LATEST_EVENT: "LATEST_EVENT", NONE: "NONE" });
const present = (v) => typeof v === "string" && v.trim() !== "";
const latestVerified = (r) => (r?.events ?? []).filter((e) => e.kind === "VERIFIED").at(-1) ?? null;

/** C3 · the reason the board records for a row that is not VERIFIED-PASS — its own words, never one made up here. */
export function notVerifiedReason(row, { notRequired = {} } = {}) {
  if (present(row?.blocker)) return Object.freeze({ source: REASON_SOURCE.BLOCKER, reason: row.blocker.trim() });
  const nr = notRequired?.[row?.featureId];
  if (nr && present(nr.reason)) return Object.freeze({ source: REASON_SOURCE.NOT_REQUIRED, reason: `NOT REQUIRED since ${nr.since ?? "?"}: ${nr.reason}` });
  const e = (row?.events ?? []).at(-1);
  if (e && (present(e.reason) || present(e.kind))) return Object.freeze({ source: REASON_SOURCE.LATEST_EVENT, reason: `${e.kind}${present(e.reason) ? ` ${e.reason}` : ""}${e.on ? ` (${e.on})` : ""}` });
  return Object.freeze({ source: REASON_SOURCE.NONE, reason: "no blocker, no NOT REQUIRED entry and no event — the board records no reason" });
}

/** The done declaration over a built board (src/fboard/board.mjs buildBoard). */
export function doneDeclaration(board, { notRequired = {} } = {}) {
  const rows = Array.isArray(board) ? board : [];
  const verified = rows.filter((r) => r.state === VERIFIED_PASS);
  /* C2 · every deferred clause of every VERIFIED row, from its latest VERIFIED event, with the reason that event gives */
  const deferred = deferredRows(rows).map((d) => Object.freeze({ featureId: d.featureId, clauses: Object.freeze(d.deferred.map((c) => Object.freeze({ clause: c, why: present(d.why[c]) ? d.why[c] : null }))) }));
  const deferredWithoutReason = deferred.flatMap((d) => d.clauses.filter((c) => !c.why).map((c) => `${d.featureId} ${c.clause}`));
  /* a VERIFIED row with no VERIFIED event cannot show its clauses: named, never counted as done silently */
  const verifiedWithoutEvent = verified.filter((r) => !latestVerified(r)).map((r) => r.featureId);
  /* C3 · every other row, named with its state and its recorded reason */
  const notVerified = rows.filter((r) => r.state !== VERIFIED_PASS).map((r) => { const why = notVerifiedReason(r, { notRequired }); return Object.freeze({ featureId: r.featureId, state: r.state, reason: why.reason, reasonSource: why.source, notRequired: Object.hasOwn(notRequired ?? {}, r.featureId) }); });
  const hidden = notVerified.filter((n) => n.reasonSource === REASON_SOURCE.NONE).map((n) => n.featureId);
  return Object.freeze({
    total: rows.length,
    verified: Object.freeze(verified.map((r) => r.featureId)),
    deferred: Object.freeze(deferred),
    deferredClauseCount: deferred.reduce((t, d) => t + d.clauses.length, 0),
    deferredWithoutReason: Object.freeze(deferredWithoutReason),
    verifiedWithoutEvent: Object.freeze(verifiedWithoutEvent),
    notVerified: Object.freeze(notVerified),
    hidden: Object.freeze(hidden),
    /* done only when every row that is not NOT REQUIRED is VERIFIED-PASS, nothing is hidden and every deferral names its reason */
    done: notVerified.every((n) => n.notRequired) && !hidden.length && !deferredWithoutReason.length && !verifiedWithoutEvent.length,
  });
}

/** The declaration as lines — the deferred list by row, then every row that is not VERIFIED with its reason. */
export function declarationLines(d) {
  return [
    `done declaration · ${d.verified.length} of ${d.total} rows VERIFIED-PASS · ${d.deferredClauseCount} deferred clause(s) in ${d.deferred.length} row(s) · ${d.notVerified.length} row(s) not VERIFIED${d.hidden.length ? ` · HIDDEN ${d.hidden.join(", ")}` : ""} · ${d.done ? "DONE" : "NOT DONE"}`,
    ...d.deferred.map((r) => `  deferred ${r.featureId} ${r.clauses.map((c) => c.clause).join(", ")}`),
    ...d.notVerified.map((n) => `  not verified ${n.featureId} ${n.state}${n.notRequired ? " (NOT REQUIRED)" : ""} — ${n.reason}`),
  ];
}

/**
 * C1 · the refusals of an audit record { auditor, builder, on, rows: { <id>: { contractSha256, clauses: { Cn: { recorded, verdict, reason } } } } }
 * against the board and the frozen acceptances. [] means the record is accepted. `mustCover` names rows the audit has to hold.
 */
export function auditRecordRefusals(record, board, acceptances, { mustCover = [] } = {}) {
  const out = [];
  const refuse = (code, why, id = null) => out.push(Object.freeze({ code, id, why }));
  if (!record || typeof record !== "object") { refuse("NO_AUDIT_RECORD", "no audit record was given"); return Object.freeze(out); }
  const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!present(record.auditor)) refuse("AUDITOR_UNNAMED", "the record names no auditor");
  if (!present(record.builder)) refuse("BUILDER_UNNAMED", "the record names no builder, so the auditor cannot be shown to be another agent");
  if (present(record.auditor) && present(record.builder) && norm(record.auditor) === norm(record.builder)) refuse("AUDITOR_IS_BUILDER", `the auditor "${record.auditor}" is the builder`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.on ?? "")) refuse("AUDIT_UNDATED", "the record carries no date (YYYY-MM-DD)");
  const rows = record.rows && typeof record.rows === "object" ? record.rows : {};
  if (!Object.keys(rows).length) refuse("NO_ROW_AUDITED", "the record audits no row");
  for (const id of mustCover) if (!Object.hasOwn(rows, id)) refuse("ROW_NOT_AUDITED", `${id} is not in the audit record`, id);
  const byId = new Map((Array.isArray(board) ? board : []).map((r) => [r.featureId, r]));
  for (const [id, a] of Object.entries(rows)) {
    const row = byId.get(id), acc = acceptances?.[id];
    if (!row) { refuse("ROW_NOT_ON_BOARD", `${id} is not a row of the board`, id); continue; }
    if (!acc || !present(acc.contractSha256)) { refuse("NO_FROZEN_CONTRACT", `${id} has no frozen acceptance to be checked against`, id); continue; }
    if (!present(a?.contractSha256)) refuse("CONTRACT_NOT_CITED", `${id}: the record cites no frozen contract sha256`, id);
    else if (a.contractSha256 !== acc.contractSha256) refuse("CONTRACT_NOT_THE_FROZEN_ONE", `${id}: the record cites ${a.contractSha256.slice(0, 12)}…, the frozen contract is ${acc.contractSha256.slice(0, 12)}…`, id);
    /* each audited clause: the state the board records, a verdict, and its reason */
    const states = latestVerified(row)?.clauses ?? {};
    const clauses = a?.clauses && typeof a.clauses === "object" ? a.clauses : {};
    if (!Object.keys(clauses).length) refuse("NO_CLAUSE_AUDITED", `${id}: no clause is audited`, id);
    for (const [c, v] of Object.entries(clauses)) {
      const onBoard = states[c] ?? "NONE";
      if (v?.recorded !== onBoard) refuse("RECORDED_STATE_NOT_THE_BOARDS", `${id} ${c}: the record says ${v?.recorded ?? "nothing"}, the board says ${onBoard}`, id);
      if (!VERDICTS.includes(v?.verdict)) refuse("NO_VERDICT", `${id} ${c}: the verdict is neither ${VERDICTS.join(" nor ")}`, id);
      if (!present(v?.reason)) refuse("VERDICT_WITHOUT_REASON", `${id} ${c}: the verdict gives no reason`, id);
    }
  }
  return Object.freeze(out);
}

export { DEFERRED };
