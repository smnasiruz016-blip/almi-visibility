/**
 * 🔴 F07 §5.2–§5.5 · THE HELD-OUT EVALUATION LIFECYCLE — FREEZE, THEN ACCESS, THEN A COMPLETE SCORE (23 September 2026).
 *
 * Product-neutral: it knows sealed-set identifiers, mechanism identifiers and hashes, and counts. It never sees, stores or
 * reports a held-out item's content, label or expected answer.
 *
 * ── ONE AUDIT SYSTEM ────────────────────────────────────────────────────────
 * Every step is a metadata-only `EVALUATION` event appended to the F08 audit store it is handed (the production trail, or
 * the confined store in a verified test context). "Has this set been seen?", "is this a rerun?" and "was the mechanism
 * frozen?" are all answered FROM THE TRAIL. There is no second ledger to drift from the first.
 *
 * ── THE RULES ───────────────────────────────────────────────────────────────
 *   · An access request must name all eight: mechanism id, mechanism hash, sealed-set id, the set's population
 *     commitment, scoring protocol, evaluator authority, access purpose and timestamp. Any missing → REFUSED.
 *   · Only a registry entry of role HELD_OUT_EVIDENCE that permits evaluation is an evaluation set. A RETIRED population,
 *     a SEALED store readable only by its own evaluation, or an undeclared id → REFUSED, and recorded.
 *   · The exact mechanism (id AND hash) must have been FROZEN — recorded in the trail — at or before the request.
 *   · The first ALLOWED access to a set is its only UNTOUCHED access. Afterwards the set is SEEN: the same mechanism is
 *     a RERUN, a changed mechanism is an AFTER_MECHANISM_CHANGE access, and neither is ever untouched.
 *   · A score is refused if the mechanism changed after access (the evaluation is INVALIDATED, and recorded so); every
 *     declared item must be accounted for (remainder 0); UNKNOWN and UNAVAILABLE are never PASS and never dropped; an
 *     exclusion needs a declared reason.
 *   · A report says whether it is untouched, and `presentAsUntouched` refuses one that is not.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { classifySealed } from "../governance/sealed-paths.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";
import { metadataFaults } from "../audit-trail/event.mjs";

export const EVALUATION_ACTIONS = Object.freeze({
  FROZEN: "HELDOUT_MECHANISM_FROZEN",
  ACCESS: "HELDOUT_ACCESS",
  INVALIDATED: "HELDOUT_EVALUATION_INVALIDATED",
  SCORED: "HELDOUT_EVALUATION_SCORED",
});
export const ACCESS_STATUS = Object.freeze(["FIRST_ACCESS", "RERUN", "AFTER_MECHANISM_CHANGE", "SET_PREVIOUSLY_ACCESSED"]);
export const REQUIRED_REQUEST_FIELDS = Object.freeze(["mechanismId", "mechanismHash", "sealedSetId", "populationCommitment", "protocolId", "evaluatorAuthority", "purpose", "at"]);
export const VERDICTS = Object.freeze(["PASS", "FAIL", "REFUSED", "UNAVAILABLE", "INVALID", "UNKNOWN", "EXCLUDED"]);
/** The only lawful reasons to leave an item unscored. A reason outside this list is not a reason. */
export const EXCLUSION_REASONS = Object.freeze(["ITEM_WITHDRAWN_BY_RULING", "ITEM_OUT_OF_PROTOCOL_SCOPE", "ITEM_DUPLICATE_OF_DECLARED_ITEM"]);

const HEX64 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9:._-]{1,80}$/;

export class HeldOutRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "HeldOutRefused"; this.code = code; }
}

/** The mechanism's immutable identity: sha256 over its files' names and raw-byte hashes, sorted. Content never leaves. */
export function mechanismHash(files) {
  const lines = Object.entries(files).map(([name, bytes]) => `${name}\u0000${createHash("sha256").update(Buffer.from(bytes)).digest("hex")}`).sort();
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

/** A sealed set's population commitment: sha256 over its item IDENTIFIERS (never their content), sorted, LF-joined. */
export const populationCommitment = (itemIds) => createHash("sha256").update([...itemIds].map(String).sort().join("\n"), "utf8").digest("hex");

const eventsOf = (audit) => audit.store.readAll().events.filter((e) => e.eventType === "EVALUATION" && e.metadata?.family === "H");

function emit(audit, { action, outcome, reasonCode, metadata, occurredAt, identityExtra }) {
  const md = { family: "H", ...metadata };
  const faults = metadataFaults(md);
  if (faults.length) throw new HeldOutRefused("EVALUATION_EVENT_NOT_METADATA_ONLY", faults.map((f) => f.code).join(","));
  const draft = {
    eventType: "EVALUATION", action, outcome, reasonCode, occurredAt,
    actor: audit.actor, actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
    authorityRef: audit.authorityRef, authorityHash: audit.authorityHash, softwareVersion: audit.softwareVersion,
    evidenceRefs: [], correlationId: audit.correlationId, parentEventId: null,
    migration: false, migrationSource: null, migratedAt: null, metadata: md,
  };
  /* One decision, one event: the identity carries the run, the instant, the action and a sequence over what the trail
   * already holds for this action — so two decisions in one second are two events (the F08 guard lesson). */
  const seq = eventsOf(audit).filter((e) => e.action === action).length + 1;
  return audit.store.append(draft, { identity: { action, occurredAt, correlationId: audit.correlationId, seq, ...identityExtra } });
}

/** Append a run's write-gate decision drafts (built by `writeGateEvent`) to the audit store it is handed — nothing else. */
export function recordGateDecisions({ audit, drafts }) {
  return drafts.map((d) => audit.store.append(d));
}

/** Freeze a mechanism: record its id and hash BEFORE any held-out access. */
export function freezeMechanism({ audit, mechanismId, mechanismHash: hash, frozenAt = isoSeconds(Date.now()) }) {
  if (!SAFE_ID.test(String(mechanismId ?? ""))) throw new HeldOutRefused("MECHANISM_ID_INVALID", "a mechanism id is a short safe identifier");
  if (!HEX64.test(String(hash ?? ""))) throw new HeldOutRefused("MECHANISM_HASH_INVALID", "a mechanism hash is a sha256");
  const r = emit(audit, { action: EVALUATION_ACTIONS.FROZEN, outcome: "RECORDED", reasonCode: "MECHANISM_FROZEN", occurredAt: frozenAt, metadata: { mechanismId, mechanismHash: hash } });
  return { eventId: r.event.eventId, mechanismId, mechanismHash: hash, frozenAt };
}

/** The declared evaluation set, or the reason there is none. */
function evaluationSet(registry, sealedSetId) {
  const e = (registry ?? []).find((x) => x.id === sealedSetId);
  if (!e) return { refuse: "SET_UNDECLARED" };
  if (e.role === "RETIRED_CONTAMINATED") return { refuse: "SET_RETIRED_CONTAMINATED" };
  if (e.role !== "HELD_OUT_EVIDENCE" || e.mayEvaluate !== true || e.sealed !== true) return { refuse: "SET_NOT_AN_EVALUATION_SET" };
  return { entry: e };
}

/**
 * Request access to a held-out set. EVERY request is recorded — refused or allowed — before anything is returned.
 * @returns {{ allowed: boolean, code: string, status: string|null, untouched: boolean, eventId: string, request: object }}
 */
export function requestHeldOutAccess({ audit, registry, request, authorityRecords = AUTHORITY_CORPUS }) {
  const r = request ?? {};
  const at = typeof r.at === "string" && !Number.isNaN(Date.parse(r.at)) ? isoSeconds(Date.parse(r.at)) : isoSeconds(Date.now());
  const base = {
    mechanismId: SAFE_ID.test(String(r.mechanismId ?? "")) ? r.mechanismId : "INVALID",
    mechanismHash: HEX64.test(String(r.mechanismHash ?? "")) ? r.mechanismHash : "INVALID",
    sealedSetId: SAFE_ID.test(String(r.sealedSetId ?? "")) ? r.sealedSetId : "INVALID",
    protocolId: SAFE_ID.test(String(r.protocolId ?? "")) ? r.protocolId : "INVALID",
    purpose: SAFE_ID.test(String(r.purpose ?? "")) ? r.purpose : "INVALID",
    role: SAFE_ID.test(String(r.role ?? "")) ? r.role : "evaluator",
  };
  const refuse = (code) => {
    const ev = emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: { ...base, accessStatus: "REFUSED", untouched: "false" } });
    return { allowed: false, code, status: null, untouched: false, eventId: ev.event.eventId, request: base };
  };

  const missing = REQUIRED_REQUEST_FIELDS.filter((k) => r[k] === undefined || r[k] === null || r[k] === "" || (k === "evaluatorAuthority" && !r[k]?.propositionId));
  if (missing.length) return refuse("FREEZE_DECLARATION_INCOMPLETE");
  if (Object.values(base).includes("INVALID")) return refuse("REQUEST_FIELD_INVALID");

  const set = evaluationSet(registry, r.sealedSetId);
  if (set.refuse) return refuse(set.refuse);
  if (set.entry.contentHash !== r.populationCommitment) return refuse("POPULATION_COMMITMENT_MISMATCH");

  const res = resolveAuthority({ records: authorityRecords, propositionId: r.evaluatorAuthority.propositionId, scope: r.evaluatorAuthority.scope ?? [], now: at.slice(0, 10) });
  if (!permits(res)) return refuse("EVALUATOR_AUTHORITY_NOT_CURRENT");

  const trail = eventsOf(audit);
  const frozen = trail.filter((e) => e.action === EVALUATION_ACTIONS.FROZEN && e.metadata.mechanismId === r.mechanismId);
  if (!frozen.some((e) => e.metadata.mechanismHash === r.mechanismHash && e.occurredAt <= at)) {
    /* Three different refusals, named apart: never frozen · this exact hash frozen only AFTER the request · only other
     * hashes of this mechanism frozen. The first draft called the second "hash not frozen", which it was not. */
    const sameHash = frozen.filter((e) => e.metadata.mechanismHash === r.mechanismHash);
    return refuse(frozen.length === 0 ? "MECHANISM_NOT_FROZEN" : sameHash.length ? "MECHANISM_FROZEN_AFTER_REQUEST" : "MECHANISM_HASH_NOT_FROZEN");
  }

  const prior = trail.filter((e) => e.action === EVALUATION_ACTIONS.ACCESS && e.outcome === "ALLOWED" && e.metadata.sealedSetId === r.sealedSetId);
  const status = prior.length === 0 ? "FIRST_ACCESS"
    : prior.some((e) => e.metadata.mechanismId === r.mechanismId && e.metadata.mechanismHash === r.mechanismHash) ? "RERUN"
    : prior.some((e) => e.metadata.mechanismId === r.mechanismId) ? "AFTER_MECHANISM_CHANGE"
    : "SET_PREVIOUSLY_ACCESSED";
  const untouched = status === "FIRST_ACCESS";
  const ev = emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "ALLOWED", reasonCode: `ACCESS_${status}`, occurredAt: at, metadata: { ...base, accessStatus: status, untouched: String(untouched) } });
  return { allowed: true, code: `ACCESS_${status}`, status, untouched, eventId: ev.event.eventId, request: base };
}

/**
 * Score an evaluation over its COMPLETE declared population. Refused — and the evaluation INVALIDATED on the trail — if
 * the mechanism changed after access. Counts only; no item's content, label or answer is ever in the report.
 */
export function scoreHeldOutEvaluation({ audit, grant, currentMechanismHash, declaredItems, outcomes }) {
  if (!grant?.allowed) throw new HeldOutRefused("NO_ACCESS_GRANT", "scoring requires an allowed, recorded access");
  const at = isoSeconds(Date.now());
  const meta = { mechanismId: grant.request.mechanismId, mechanismHash: grant.request.mechanismHash, sealedSetId: grant.request.sealedSetId };
  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0]));
  const faults = [];
  const declared = [...new Set(declaredItems.map(String))];
  for (const id of declared) {
    const o = outcomes.get(id);
    if (!o) { faults.push("ITEM_UNACCOUNTED"); continue; }
    if (!VERDICTS.includes(o.verdict)) { faults.push("VERDICT_UNDECLARED"); continue; }
    if (o.verdict === "EXCLUDED" && !EXCLUSION_REASONS.includes(o.reason)) { faults.push("EXCLUSION_WITHOUT_LAWFUL_REASON"); continue; }
    counts[o.verdict] += 1;
  }
  const extra = [...outcomes.keys()].filter((k) => !declared.includes(k)).length;
  if (extra) faults.push("OUTCOME_FOR_UNDECLARED_ITEM");
  const accounted = VERDICTS.reduce((n, v) => n + counts[v], 0);
  const report = {
    sealedSetId: meta.sealedSetId, mechanismId: meta.mechanismId, mechanismHash: meta.mechanismHash,
    declared: declared.length,
    scored: counts.PASS + counts.FAIL, pass: counts.PASS, fail: counts.FAIL,
    refused: counts.REFUSED, unavailable: counts.UNAVAILABLE, invalid: counts.INVALID,
    unscoredWithReason: counts.UNKNOWN + counts.EXCLUDED, unknown: counts.UNKNOWN, excluded: counts.EXCLUDED,
    remainder: declared.length - accounted,
    untouched: grant.untouched, accessStatus: grant.status,
    label: grant.untouched ? "UNTOUCHED HELD-OUT EVALUATION" : `NOT AN UNTOUCHED HELD-OUT EVALUATION — ${grant.status}`,
  };
  if (faults.length || report.remainder !== 0) {
    emit(audit, { action: EVALUATION_ACTIONS.SCORED, outcome: "INVALID", reasonCode: "POPULATION_NOT_ACCOUNTED", occurredAt: at, metadata: { ...meta, remainder: String(report.remainder), faults: [...new Set(faults)].join(",").slice(0, 190) } });
    throw new HeldOutRefused("POPULATION_NOT_ACCOUNTED", `${report.remainder} of ${declared.length} declared item(s) unaccounted; ${[...new Set(faults)].join(", ")}`);
  }
  emit(audit, {
    action: EVALUATION_ACTIONS.SCORED, outcome: "RECORDED", reasonCode: grant.untouched ? "SCORED_UNTOUCHED" : "SCORED_NOT_UNTOUCHED", occurredAt: at,
    metadata: { ...meta, declared: String(report.declared), scored: String(report.scored), pass: String(report.pass), fail: String(report.fail), refused: String(report.refused), unavailable: String(report.unavailable), invalid: String(report.invalid), unscoredWithReason: String(report.unscoredWithReason), remainder: "0", untouched: String(report.untouched), accessStatus: String(grant.status) },
  });
  return report;
}

/**
 * A mechanism change after access, recorded ONCE PER ATTEMPT: the first attempt records the evaluation INVALIDATED;
 * any later attempt against the same grant records a REFUSED access naming that invalidation. One attempt, one event.
 */
function refuseChangedMechanism(audit, grant, at, meta) {
  const already = eventsOf(audit).some((e) => e.action === EVALUATION_ACTIONS.INVALIDATED && e.metadata.accessEventId === grant.eventId);
  if (already) emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: "MECHANISM_CHANGED_AFTER_ACCESS", occurredAt: at, metadata: { ...meta, accessStatus: "EVALUATION_ALREADY_INVALIDATED", untouched: "false" } });
  else emit(audit, { action: EVALUATION_ACTIONS.INVALIDATED, outcome: "INVALID", reasonCode: "MECHANISM_CHANGED_AFTER_ACCESS", occurredAt: at, metadata: { ...meta, accessEventId: grant.eventId } });
  throw new HeldOutRefused("MECHANISM_CHANGED_AFTER_ACCESS", "the mechanism was modified after held-out access; this evaluation is invalid and is recorded so");
}

/**
 * Read ONE sealed item for a granted evaluation — the only lawful read of a held-out store. Refused, recorded and unread
 * unless: the grant is an allowed, recorded access; the mechanism has not changed since it; and the path lies inside the
 * GRANTED set (classified by the same classifier the ordinary loader uses). Ordinary loaders keep refusing these paths.
 */
export function readHeldOutItem({ audit, grant, currentMechanismHash, registry, root, base, path, read = readFileSync }) {
  const at = isoSeconds(Date.now());
  const meta = { mechanismId: grant?.request?.mechanismId ?? "NONE", mechanismHash: grant?.request?.mechanismHash ?? "NONE", sealedSetId: grant?.request?.sealedSetId ?? "NONE" };
  const refuse = (code) => {
    emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: { ...meta, accessStatus: "ITEM_READ_REFUSED", untouched: "false" } });
    throw new HeldOutRefused(code, "the held-out item was not read");
  };
  if (!grant?.allowed) refuse("NO_ACCESS_GRANT");
  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const v = classifySealed({ registry, root, base, path });
  if (!(v.refuse && v.code === "SEALED_PATH_REFUSED" && v.entryId === grant.request.sealedSetId)) refuse("ITEM_OUTSIDE_GRANTED_SET");
  return read(join(base, path));
}

/** A report may be presented as an untouched held-out evaluation ONLY when it is one. */
export function presentAsUntouched(report) {
  if (report?.untouched !== true) throw new HeldOutRefused("NOT_AN_UNTOUCHED_EVALUATION", `this evaluation is ${report?.accessStatus ?? "unknown"} — it may not be presented as untouched`);
  return report;
}
