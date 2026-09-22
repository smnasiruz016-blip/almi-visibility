/**
 * 🔴 F08 · THE RECORDER — TURNS REAL GOVERNED DECISIONS INTO AUDIT EVENTS, AND ACCOUNTS FOR EVERY ONE (§9 and §10).
 *
 * It invents nothing. A candidate whose required fields are not all derivable from committed evidence is recorded as
 * NOT_MIGRATABLE with its reason, and no malformed event is written. A candidate the store refuses is recorded as
 * INVALID with the refusal's codes. The arithmetic must reconcile to a ZERO remainder, and the reconciliation is
 * computed here rather than asserted anywhere else:
 *
 *     real candidate events = migrated + already audited + not migratable + invalid + excluded
 *
 * 🔴 MIGRATION PROVES THE RECORD EXISTS. IT DOES NOT PROVE THE ORIGINAL ACTION WAS CORRECT. Every migrated event
 * carries that sentence through the reader (src/audit-trail/reader.mjs, MIGRATION_NOTE), and it is repeated here so
 * nobody reading only this file can miss it.
 */
import { AuditRefused } from "./store.mjs";
import { authorityAt } from "./population.mjs";

export const MIGRATION_PROVES =
  "migration proves the record exists and what it was reconstructed from; it does not prove the original action was correct";

/**
 * Give a candidate its authorityHash — THE BYTES THAT GOVERNED AT THE TIME. Either the source's own committed hash
 * (an authority record is its own authority), or F05's resolver asked at the EVENT'S day.
 * A resolution that is not CURRENT is a real refusal, and the candidate becomes NOT_MIGRATABLE.
 */
export function withAuthority(candidate, { corpus }) {
  const d = candidate.draft;
  if (!d) return candidate;
  const { authorityHashOverride, ...rest } = d;
  if (authorityHashOverride) return { ...candidate, draft: { ...rest, authorityHash: authorityHashOverride } };
  const day = candidate.authorityDay ?? String(d.occurredAt).slice(0, 10);
  const a = authorityAt({ records: corpus, propositionId: d.authorityRef?.propositionId, scope: d.authorityRef?.scope, day });
  if (!a.ok) return { family: candidate.family, sourceId: candidate.sourceId, notMigratable: `AUTHORITY_NOT_CURRENT_AT_EVENT: ${a.why}`, refusalOutcome: a.outcome };
  return { ...candidate, draft: { ...rest, authorityHash: a.hash } };
}

/**
 * Append every candidate that can lawfully be appended, in occurredAt order, and account for all of them.
 * Nothing here repairs a candidate; the store's refusal is recorded as it came.
 */
export function recordCandidates({ store, candidates, corpus, excluded = [] }) {
  const prepared = candidates.map((c) => (c.draft ? withAuthority(c, { corpus }) : c));
  const appendable = prepared.filter((c) => c.draft).sort((a, b) => String(a.draft.occurredAt).localeCompare(String(b.draft.occurredAt)));
  const results = { migrated: [], alreadyAudited: [], notMigratable: prepared.filter((c) => c.notMigratable), invalid: [], excluded };

  for (const c of appendable) {
    try {
      const r = store.append(c.draft);
      if (r.status === "APPENDED") results.migrated.push({ sourceId: c.sourceId, family: c.family, eventId: r.event.eventId });
      else results.alreadyAudited.push({ sourceId: c.sourceId, family: c.family, eventId: r.event.eventId });
    } catch (e) {
      if (!(e instanceof AuditRefused)) throw e;
      results.invalid.push({ sourceId: c.sourceId, family: c.family, codes: e.faults.map((f) => f.code) });
    }
  }

  const total = candidates.length + excluded.length;
  const accounted = results.migrated.length + results.alreadyAudited.length + results.notMigratable.length + results.invalid.length + excluded.length;
  return {
    ...results,
    total,
    counts: {
      realCandidateEvents: total,
      migrated: results.migrated.length,
      alreadyAudited: results.alreadyAudited.length,
      notMigratable: results.notMigratable.length,
      invalid: results.invalid.length,
      excluded: excluded.length,
    },
    remainder: total - accounted,
    note: MIGRATION_PROVES,
  };
}

/**
 * FAMILY D — a write-gate decision, recorded ONCE whatever its outcome. `permission` is the real answer the
 * production write law gave this run, for a named target; nothing here re-decides it.
 */
export function writeGateEvent({ permission, target, action, actor, softwareVersion, correlationId, occurredAt, authorityRef, authorityHash }) {
  return {
    eventType: "WRITE_GATE_DECISION",
    action,
    outcome: permission.mayWrite ? "ALLOWED" : "REFUSED",
    reasonCode: permission.mayWrite ? `WRITE_PERMITTED_${target.toUpperCase()}` : `WRITE_REFUSED_${target.toUpperCase()}`,
    occurredAt,
    actor,
    actorType: "ENGINE",
    scopeType: "GLOBAL_PRODUCT",
    tenantId: null,
    subjectId: null,
    authorityRef,
    authorityHash,
    softwareVersion,
    evidenceRefs: [],
    correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: { family: "D", target, mode: permission.mode, why: String(permission.reason).slice(0, 190) },
  };
}

/**
 * FAMILY E — an explicit refusal that protects tenant, evidence or authority, and that is NOT a write-gate decision
 * (those are family D, recorded once, there). The refusal it records is one the production guard actually returned.
 */
export function refusalEvent({ reasonCode, action, actor, softwareVersion, correlationId, occurredAt, authorityRef, authorityHash, evidenceRefs = [], metadata = {} }) {
  return {
    eventType: "REFUSAL",
    action,
    outcome: "REFUSED",
    reasonCode,
    occurredAt,
    actor,
    actorType: "ENGINE",
    scopeType: "GLOBAL_PRODUCT",
    tenantId: null,
    subjectId: null,
    authorityRef,
    authorityHash,
    softwareVersion,
    evidenceRefs,
    correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: { family: "E", ...metadata },
  };
}
