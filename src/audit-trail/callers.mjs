/**
 * 🔴 F08 · THE AUDITED PRODUCTION CALLERS — THE APPENDS THEMSELVES, GATED AT THEIR CALLER.
 *
 * The three appends below first sat in `bin/authority-migrate.mjs`, inside the branch the write law grants. The
 * writer-law census (tools/permitted-writers.mjs) refused them, and it was RIGHT: a write site in a binary must sit
 * inside a condition the census can READ, and a site inside a function body is not enclosed by the `if` at the call
 * site — so three real write paths would have been invisible to the law that exists to see them.
 *
 * They live here instead, which is this repository's own declared pattern: a module that takes its store from its
 * caller is reported GATED-AT-CALLER, never counted as gated, and is proved by the incident tests rather than by the
 * indentation reader. The gate did not move and nothing was exempted — only the place the site is written.
 *
 * 🔴 NOTHING HERE CATCHES. Every function throws on refusal, so a governed caller FAILS CLOSED by construction: the
 * governed write is on the line AFTER the call, and that line is never reached.
 */
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { writePermission, PRODUCTION } from "../write-law.mjs";
import { writeGateEvent } from "./recorder.mjs";
import { isoSeconds } from "./store.mjs";

/** The F05 command chain is what authorises regenerating the authority corpus. Resolved, never carried in. */
export const MIGRATION_AUTHORITY = Object.freeze({ propositionId: "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN", scope: Object.freeze(["ALMIVISIBILITY", "F05"]) });

/**
 * The migration's governing authority, resolved over the corpus THIS RUN derived. Throws unless it is CURRENT.
 * 🔴 CALLED BEFORE THE CORPUS WRITE, so an unresolved authority stops the write rather than being noticed after it.
 */
export function migrationAuthority({ records, now }) {
  const res = resolveAuthority({ records, propositionId: MIGRATION_AUTHORITY.propositionId, scope: [...MIGRATION_AUTHORITY.scope], now });
  if (!permits(res)) throw new Error(`AUDIT_REFUSED: the migration's governing authority resolves ${res.outcome}, not CURRENT — the governed write does not proceed`);
  return { authorityRef: { ...MIGRATION_AUTHORITY, scope: [...MIGRATION_AUTHORITY.scope] }, authorityHash: res.authority.contentHash };
}

/**
 * Record an authority-corpus migration AFTER its corpus write committed: the production write-gate decision (the
 * write beyond this machine that was, or was not, permitted) and the migration action itself, linked to the governed
 * write's terminal event. Returns the migration event; throws if any of it cannot be recorded honestly.
 *
 * 🔴 ONE DECISION, ONE RECORD (23 September 2026). This function used to append a LOCAL write-gate decision as well —
 * "the write law allowed writing the corpus here" — and the governed-write boundary then recorded the same decision
 * again as its ATTEMPTED event. Two records of one decision. The boundary's saga is now the only record of the local
 * decision, including its REFUSED form on a dry run, which this function never recorded at all.
 *
 * 🔴 AND IT IS NO LONGER WRITTEN BEFORE THE WRITE. It said APPLIED before the corpus write was attempted, so a write
 * that then failed left the trail claiming a migration that never happened. It is now appended only after the
 * boundary returns COMMITTED, and it names that terminal event as its parent.
 *
 * @param {object} o
 * @param {object} o.store         the audit store, handed in by the caller — this module never chooses one
 * @param {readonly object[]} o.records  the corpus THIS RUN derived; the authority is resolved over it
 * @param {string|null} [o.parentEventId]  the governed write's terminal (COMMITTED) event
 */
export function auditAuthorityMigration({ store, records, provenance, permission, counts, softwareVersion, actor, argv = [], env = {}, parentEventId = null }) {
  void permission;
  const { authorityRef, authorityHash } = migrationAuthority({ records, now: provenance.now });
  const occurredAt = isoSeconds(Date.now());
  const correlationId = `run:authority-migrate:${occurredAt}`;
  const common = { softwareVersion, correlationId, occurredAt, authorityRef, authorityHash, actor };

  store.append(writeGateEvent({ ...common, permission: writePermission({ target: PRODUCTION, argv, env }), target: "production", action: "WRITE_BEYOND_THIS_MACHINE" }));
  return store.append({
    eventType: "AUTHORITY_MIGRATION",
    action: "MIGRATE_AUTHORITY_CORPUS",
    outcome: "APPLIED",
    reasonCode: "CORPUS_REGENERATED_FROM_COMMITTED_BYTES",
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
    parentEventId,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: {
      family: "A", records: String(records.length), governanceCommit: provenance.governanceCommit,
      engineCommit: provenance.engineCommit, current: String(counts.CURRENT ?? 0), invalid: String(counts.INVALID ?? 0),
    },
  });
}
