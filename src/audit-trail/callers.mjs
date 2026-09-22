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
 * Record an authority-corpus migration: the write-gate decision that authorised it (local and production), and the
 * migration action itself. Returns the migration event; throws if any of it cannot be recorded honestly.
 *
 * @param {object} o
 * @param {object} o.store         the audit store, handed in by the caller — this module never chooses one
 * @param {readonly object[]} o.records  the corpus THIS RUN derived; the authority is resolved over it
 */
export function auditAuthorityMigration({ store, records, provenance, permission, counts, softwareVersion, actor, argv = [], env = {} }) {
  const res = resolveAuthority({ records, propositionId: MIGRATION_AUTHORITY.propositionId, scope: [...MIGRATION_AUTHORITY.scope], now: provenance.now });
  if (!permits(res)) throw new Error(`AUDIT_REFUSED: the migration's governing authority resolves ${res.outcome}, not CURRENT — the governed write does not proceed`);
  const occurredAt = isoSeconds(Date.now());
  const correlationId = `run:authority-migrate:${occurredAt}`;
  const common = { softwareVersion, correlationId, occurredAt, authorityRef: { ...MIGRATION_AUTHORITY, scope: [...MIGRATION_AUTHORITY.scope] }, authorityHash: res.authority.contentHash, actor };

  store.append(writeGateEvent({ ...common, permission, target: "local", action: "WRITE_AUTHORITY_CORPUS" }));
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
    authorityRef: { ...MIGRATION_AUTHORITY, scope: [...MIGRATION_AUTHORITY.scope] },
    authorityHash: res.authority.contentHash,
    softwareVersion,
    evidenceRefs: [],
    correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: {
      family: "A", records: String(records.length), governanceCommit: provenance.governanceCommit,
      engineCommit: provenance.engineCommit, current: String(counts.CURRENT ?? 0), invalid: String(counts.INVALID ?? 0),
    },
  });
}
