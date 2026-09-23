/**
 * 🔴 THE GOVERNED-WRITE BOUNDARY — TARGET-AWARE (23 September 2026).
 *
 * One explicit place where a governed state change is validated, gated, audited, committed and verified. Its
 * contract is fixed by an owner ruling identified here by hash alone:
 *
 *   ruling sha256 29ef6d74fc85944f7cf69f33c39fd0946e5eab77e8317fa5893fa086cfff4f0d
 *
 * ── WHY THIS IS TARGET-AWARE, AND NOT A TWO-PHASE COMMIT ────────────────────
 *
 * An earlier contract demanded a recoverable pending state from every governed write. Measured against this
 * engine's primitives, that state does not exist for an append-only log: an append either lands or it does not,
 * so a status meaning "prepared but not committed" could never be returned. Rather than ship a code that can
 * never fire, the boundary carries TWO PROFILES and promises each only what its target's primitive can deliver.
 *
 * ── TWO VOCABULARIES. THEY ARE NOT MIXED. ───────────────────────────────────
 *
 *   RETURNED OUTCOMES   what a call hands back to its caller.
 *   DISCOVERED STATES   what a later inspection finds on disk. Each names the owner that resolves it.
 *
 * Mixing them is precisely how a state ends up with no owner. A state measured UNREACHABLE is listed in
 * DECLARED_UNREACHABLE with its measurement and is NOT implemented — see that constant for the measurement.
 *
 * ── WHAT `COMMITTED` MEANS, AND WHAT IT DOES NOT ────────────────────────────
 *
 * 🔴 There is NO fsync law in this repository — measured, not assumed: no module mentions fsync, fdatasync or
 * O_SYNC. So COMMITTED means the primitive RETURNED and the record RE-READ in the same tick. It does NOT mean
 * durable through a power loss. The boundary makes no stronger claim, because no stronger claim is available.
 *
 * ── NO FALSE TRANSACTION CLAIM ──────────────────────────────────────────────
 *
 * Audit storage and target storage are NOT one atomic transaction and this module never says they are. It
 * guarantees instead: no governed action begins without a durable attempt record; every successful commit is
 * discoverable by idempotency key; a missing terminal outcome is recoverable; retries neither duplicate nor
 * overwrite the target; and an incomplete saga is EXPOSED rather than hidden.
 */
import { createHash } from "node:crypto";

/**
 * 🔴 THE THIRD PROFILE — STAGED_DIRECTORY_REPLACE (23 September 2026), MEASURED BEFORE IT WAS WRITTEN.
 *
 * One governed caller (the replay's `--recover`) replaces a WHOLE DIRECTORY that an external tool fills. Neither
 * ruled profile describes that: STAGED_REPLACE renames one file over another, and a directory cannot be renamed over
 * an existing one — measured on 23 September on the owner's host (win32, Node 24.15): `renameSync(dir, existingDir)`
 * throws EPERM whether the existing directory is empty or not, and succeeds only onto an ABSENT path. (POSIX rename(2)
 * replaces only an empty directory; that was not measured here and nothing below depends on it.) So the replace is
 * TWO atomic renames — the live copy aside, then the staged copy onto the now-absent path — which is NOT one atomic
 * step, and this profile says so rather than borrowing STAGED_REPLACE's promise:
 *
 *   · preparation is OBSERVABLE — the tool fills a staging directory beside the target, which is validated before
 *     anything live is touched, so a failed or partial download never becomes the target;
 *   · a failed second rename is ROLLED BACK by renaming the live copy back — the target is then unchanged and the
 *     outcome is FAILED_BEFORE_COMMIT;
 *   · a failed ROLLBACK leaves the target absent — that is RECOVERY_REQUIRED, returned, never called FAILED;
 *   · ALREADY_COMMITTED is DECLARED-UNREACHABLE: the intended bytes exist only after the tool has run, so no
 *     inspection before preparation can know the target already holds them.
 *
 * The ruling of 23 September governs the other two profiles unchanged; this one is added under the command that
 * required it (§4, "the smallest truthful target-aware profile"), not read into that ruling.
 */
export const PROFILES = Object.freeze(["STAGED_REPLACE", "VALIDATED_APPEND", "STAGED_DIRECTORY_REPLACE"]);
/** The two profiles the owner ruling of 23 September itemises and totals (9 · 2 · 1 = 12). */
export const RULED_PROFILES = Object.freeze(["STAGED_REPLACE", "VALIDATED_APPEND"]);
const STAGED = new Set(["STAGED_REPLACE", "STAGED_DIRECTORY_REPLACE"]);

/** Target classes a governed write may declare. A target whose class cannot be derived is refused, never defaulted. */
export const TARGET_CLASSES = Object.freeze([
  "GENERATED_CONFIG", "RUN_EVIDENCE", "OPERATOR_CHOSEN_OUTPUT", "REPOSITORY_FILE", "AUDIT_TRAIL",
]);

/** VOCABULARY 1 — what a call gives back. Nothing outside these lists is ever returned. */
export const RETURNED_OUTCOMES = Object.freeze({
  STAGED_REPLACE: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED", "RECOVERY_REQUIRED"]),
  VALIDATED_APPEND: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED"]),
  STAGED_DIRECTORY_REPLACE: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "RECOVERY_REQUIRED"]),
});

/** VOCABULARY 2 — what a later inspection finds. 🔴 EVERY ENTRY NAMES AN OWNER. A state with no owner is a leak. */
export const DISCOVERED_STATES = Object.freeze({
  STAGED_REPLACE: Object.freeze([
    Object.freeze({
      state: "PREPARED",
      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",
      how: "before preparing, it lists the target's confined directory and discards ITS OWN abandoned temporaries by name. It never adopts one, and never removes an unrelated file.",
    }),
  ]),
  VALIDATED_APPEND: Object.freeze([
    Object.freeze({
      state: "RECOVERY_REQUIRED",
      owner: "NEXT_RUN_OF_SAME_STORE",
      how: "readAll() reports MALFORMED_TAIL and append() refuses to extend a damaged chain. 🔴 THE OWNER BLOCKS; IT DOES NOT REPAIR — there is no recovery law in this repository and none is invented here. The condition halts the store rather than accumulating silently.",
    }),
  ]),
  STAGED_DIRECTORY_REPLACE: Object.freeze([
    Object.freeze({
      state: "PREPARED",
      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",
      how: "a staging directory that outlived its process (the tool was killed mid-download). Before preparing, the next write lists the target's parent and discards ITS OWN staging directories by name. It never adopts one — a directory the tool may not have finished is never made the target.",
    }),
    Object.freeze({
      state: "RETIRED",
      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",
      how: "the previous live copy, set aside by the first rename, left behind when the process died before its removal. The next write discards it by name. It is never restored automatically: whether it is complete is not recorded anywhere, so restoring it would adopt bytes nothing vouches for.",
    }),
    Object.freeze({
      state: "TARGET_ABSENT",
      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",
      how: "the process died between the two renames, or a rollback failed (returned as RECOVERY_REQUIRED). Every reader of the target refuses an absent directory rather than reading nothing as a clean zero, and the next governed write re-prepares a fresh, validated copy. 🔴 NO REPAIR IS INVENTED: there is no recovery law, so the owner re-runs the write.",
    }),
  ]),
});

/**
 * 🔴 MEASURED UNREACHABLE — DECLARED, NOT IMPLEMENTED, AND NEVER REPORTED AS PROVED.
 * A branch that cannot fire is a check that cannot fail, which is the most expensive kind of green.
 */
export const DECLARED_UNREACHABLE = Object.freeze([
  Object.freeze({
    profile: "VALIDATED_APPEND",
    outcome: "COMMIT_STATUS_UNKNOWN",
    measurement:
      "appendFileSync is SYNCHRONOUS: it returns or it throws, and the target is re-readable in the same tick. " +
      "Every return path is therefore resolvable by inspection, so the CALL can never hand back an unknown status; " +
      "and a process that dies mid-call leaves nothing alive to return one.",
  }),
  Object.freeze({
    profile: "STAGED_DIRECTORY_REPLACE",
    outcome: "ALREADY_COMMITTED",
    measurement:
      "the intended content is produced by an EXTERNAL tool during preparation, so it does not exist when the boundary " +
      "inspects the target — which it must do before any attempt is recorded. No inspection at that point can establish " +
      "that the target already holds bytes nobody has fetched yet. A retry therefore re-prepares and re-validates; it " +
      "never adopts or duplicates, and a partial result is never committed.",
  }),
]);

/** The saga phases. ATTEMPTED, then EXACTLY ONE terminal. A later recovery may append one recovery phase. */
export const SAGA = Object.freeze({
  ATTEMPTED: "ATTEMPTED",
  COMMITTED: "COMMITTED",
  REFUSED: "REFUSED",
  FAILED: "FAILED",
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
  RECOVERED_COMMITTED: "RECOVERED_COMMITTED",
  RECOVERY_FAILED: "RECOVERY_FAILED",
});
export const TERMINAL_PHASES = Object.freeze([SAGA.COMMITTED, SAGA.REFUSED, SAGA.FAILED, SAGA.RECOVERY_REQUIRED]);
export const RECOVERY_PHASES = Object.freeze([SAGA.RECOVERED_COMMITTED, SAGA.RECOVERY_FAILED]);

/**
 * 🔴 THE MAPPING BETWEEN THE TWO VOCABULARIES, WRITTEN DOWN RATHER THAN GUESSED.
 * ALREADY_COMMITTED appends NOTHING and no second ATTEMPTED: the saga for that key is already terminal in the
 * trail. That is what makes "one retry, one occurrence event" true instead of merely intended.
 */
export const TERMINAL_EVENT_FOR = Object.freeze({
  REFUSED: SAGA.REFUSED,
  COMMITTED: SAGA.COMMITTED,
  FAILED_BEFORE_COMMIT: SAGA.FAILED,
  RECOVERY_REQUIRED: SAGA.RECOVERY_REQUIRED,
  ALREADY_COMMITTED: null,
});

/** A saga phase, expressed in the audit store's own outcome vocabulary. */
export const OUTCOME_FOR_PHASE = Object.freeze({
  ATTEMPTED: "ALLOWED",
  COMMITTED: "APPLIED",
  REFUSED: "REFUSED",
  FAILED: "FAIL",
  RECOVERY_REQUIRED: "INDETERMINATE",
  RECOVERED_COMMITTED: "APPLIED",
  RECOVERY_FAILED: "FAIL",
});

/**
 * 🔴 THE AUDIT-STORE EXEMPTION, BY NAME — NOT BY LABEL.
 *
 * The audit trail's own event and head persistence cannot route through a boundary that audits by calling the
 * audit trail. That exemption is real, and it is fenced: it names ONE module and TWO writes. It is not a
 * category, not a comment and not a flag another file can set on itself. "Infrastructure" is not a word any
 * future write may claim for itself — a write anywhere else claiming this exemption is a bypass and counts as one.
 */
export const AUDIT_STORE_EXEMPTION = Object.freeze({
  module: "src/audit-trail/store.mjs",
  writes: Object.freeze(["EVENT_APPEND", "HEAD_RECORD"]),
});

const HEX64 = /^[0-9a-f]{64}$/;
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** A contract violation, not a business outcome. It throws so a governed caller FAILS CLOSED by construction. */
export class GovernedWriteRefused extends Error {
  constructor(code, why) {
    super(`${code}: ${why}`);
    this.name = "GovernedWriteRefused";
    this.code = code;
    this.why = why;
  }
}

/**
 * 🔴 THE IDEMPOTENCY KEY DERIVATION, DECLARED BEFORE IT IS USED.
 *
 * A key a caller may simply supply is a key a caller may get wrong, and then idempotency is a promise with
 * nothing behind it. So the derivation is fixed here, and a supplied key is VALIDATED against it, never trusted.
 *
 * `occurrenceFingerprint` is the content-identity of the mutation. It EXCLUDES recorder-execution metadata — the
 * recorder's software version, the wall-clock instant of recording, and any chain-position hash — so that the same
 * occurrence replayed from a later build derives the SAME key.
 */
export function deriveIdempotencyKey({ profile, targetClass, repoRelativeTarget, occurrenceFingerprint }) {
  if (!PROFILES.includes(profile)) throw new GovernedWriteRefused("PROFILE_UNDECLARED", `profile ${JSON.stringify(profile)} is not one of ${PROFILES.join(", ")}`);
  if (!TARGET_CLASSES.includes(targetClass)) throw new GovernedWriteRefused("TARGET_CLASS_UNDECLARED", `targetClass ${JSON.stringify(targetClass)} is not declared — a target whose class cannot be derived is refused, never defaulted`);
  if (typeof repoRelativeTarget !== "string" || repoRelativeTarget.trim() === "") throw new GovernedWriteRefused("TARGET_ABSENT", "a governed write names its target; it never infers one");
  if (repoRelativeTarget.includes("\\")) throw new GovernedWriteRefused("TARGET_NOT_NORMALISED", "the target must be repository-relative with forward slashes, so the same target derives the same key on every platform");
  if (!HEX64.test(String(occurrenceFingerprint ?? ""))) throw new GovernedWriteRefused("OCCURRENCE_FINGERPRINT_INVALID", "the occurrence fingerprint must be a sha256 hex digest of the mutation's content identity");
  return sha256([profile, targetClass, repoRelativeTarget, occurrenceFingerprint].join("\n"));
}

const REQUIRED_ADAPTER_METHODS = Object.freeze(["describeTarget", "prevalidate", "inspect", "commit", "verify"]);

function requireAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new GovernedWriteRefused("ADAPTER_ABSENT", "the boundary invokes only a declared durability adapter");
  if (!PROFILES.includes(adapter.profile)) throw new GovernedWriteRefused("PROFILE_UNDECLARED", `adapter profile ${JSON.stringify(adapter.profile)} is not one of ${PROFILES.join(", ")}`);
  for (const m of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[m] !== "function") throw new GovernedWriteRefused("ADAPTER_INCOMPLETE", `the adapter does not implement ${m}()`);
  }
  if (STAGED.has(adapter.profile) && typeof adapter.prepare !== "function") {
    throw new GovernedWriteRefused("ADAPTER_INCOMPLETE", `a ${adapter.profile} adapter must implement prepare()`);
  }
  return adapter;
}

function requireAction(action) {
  if (!action || typeof action !== "object") throw new GovernedWriteRefused("ACTION_ABSENT", "a governed write declares the action it performs");
  if (typeof action.name !== "string" || action.name.trim() === "") throw new GovernedWriteRefused("ACTION_ABSENT", "the action needs a name");
  /* 🔴 AN ABSENT SCOPE IS NEVER GLOBAL. It is refused. A default here would silently widen every write that
   * forgot to declare one, which is the opposite of what a scope is for. */
  if (typeof action.scopeType !== "string" || action.scopeType.trim() === "") {
    throw new GovernedWriteRefused("SCOPE_ABSENT", "scopeType is absent — AN ABSENT SCOPE IS NEVER GLOBAL, so it is refused rather than widened");
  }
  if (action.scopeType === "TENANT" && !action.tenantId) {
    throw new GovernedWriteRefused("TENANT_ABSENT", "a TENANT-scoped write must carry its declared tenant; tenancy is never inferred");
  }
  /* Declared once per occurrence, so every attempt at that occurrence carries the same instant — see appendPhase. */
  if (typeof action.occurredAt !== "string" || Number.isNaN(Date.parse(action.occurredAt))) {
    throw new GovernedWriteRefused("OCCURRED_AT_ABSENT", "the action declares WHEN it occurred; the boundary never substitutes the recording clock, because that would make an honest retry conflict with itself");
  }
  return action;
}

function requireAuditContext(audit) {
  if (!audit || typeof audit !== "object") throw new GovernedWriteRefused("AUDIT_CONTEXT_ABSENT", "a governed write is audited; there is no unaudited path");
  if (!audit.store || typeof audit.store.append !== "function") throw new GovernedWriteRefused("AUDIT_CONTEXT_ABSENT", "the audit context needs a store that can append");
  if (typeof audit.softwareVersion !== "string" || audit.softwareVersion.trim() === "") throw new GovernedWriteRefused("AUDIT_CONTEXT_ABSENT", "the audit context needs the recorder's software version");
  if (audit.actorType === "HUMAN") throw new GovernedWriteRefused("ACTOR_TYPE_FORBIDDEN", "this boundary never writes a HUMAN actor; an engine-performed write says ENGINE");
  /* 🔴 RESPONSIBILITY 1 — AUTHORITY IS VALIDATED HERE, NOT DISCOVERED LATER BY THE STORE. The store would refuse
   * these anyway; refusing them here names the boundary's own contract instead of leaking a storage fault upward. */
  if (typeof audit.correlationId !== "string" || audit.correlationId.trim() === "") {
    throw new GovernedWriteRefused("CORRELATION_ID_ABSENT", "every governed write belongs to a run and says which");
  }
  const ref = audit.authorityRef;
  if (!ref || typeof ref.propositionId !== "string" || ref.propositionId.trim() === "" || !Array.isArray(ref.scope) || ref.scope.length === 0) {
    throw new GovernedWriteRefused("AUTHORITY_REF_ABSENT", "a governed write names the proposition AND the scope it was decided under — an absent scope is never global");
  }
  if (!HEX64.test(String(audit.authorityHash ?? ""))) {
    throw new GovernedWriteRefused("AUTHORITY_HASH_MALFORMED", "the authority hash must be the sha256 of the authority bytes that governed AT THE TIME of the write");
  }
  return audit;
}

/**
 * 🔴 THE FENCE. A governed write may not target the audit store's own files, because auditing that write would
 * call the very store being written — responsibility 12, and the reason the exemption above is by name.
 */
function refuseAuditStoreTarget(repoRelativeTarget, store) {
  const own = [store?.eventsPath, store?.headPath].filter((p) => typeof p === "string").map((p) => p.split("\\").join("/"));
  const target = repoRelativeTarget.split("\\").join("/");
  if (own.some((p) => p.endsWith(target))) {
    throw new GovernedWriteRefused(
      "AUDIT_STORE_TARGET_FORBIDDEN",
      "the audit store's own persistence is exempt BY NAME and is not routed through this boundary; routing it here would audit the audit store by calling it",
    );
  }
}

/**
 * One saga event. The eventId is derived from the key and the phase, so an honest retry recomputes the same id.
 *
 * 🔴 `occurredAt` IS THE ACTION'S DECLARED INSTANT, NOT THE CLOCK. If the recording clock leaked into a saga
 * event, a retry a second later would produce the same eventId with different content — which the store would
 * correctly refuse as EVENT_ID_CONFLICT. The boundary would then be unable to retry itself. The store sets
 * `recordedAt` for when it was written down; `occurredAt` is when the governed action happened, and the caller
 * declares it once for all attempts at that occurrence.
 */
function appendPhase({ audit, action, profile, target, key, phase, reasonCode, parentEventId = null, extraMetadata = {} }) {
  const occurredAt = action.occurredAt;
  const draft = {
    eventType: "GOVERNED_WRITE",
    occurredAt,
    actor: audit.actor,
    actorType: audit.actorType ?? "ENGINE",
    scopeType: action.scopeType,
    tenantId: action.tenantId ?? null,
    subjectId: action.subjectId ?? null,
    action: action.name,
    outcome: OUTCOME_FOR_PHASE[phase],
    reasonCode,
    authorityRef: audit.authorityRef ?? null,
    authorityHash: audit.authorityHash ?? null,
    softwareVersion: audit.softwareVersion,
    evidenceRefs: action.evidenceRefs ?? [],
    correlationId: audit.correlationId,
    parentEventId,
    /* A governed write is performed, never reconstructed. Declared explicitly, because "absent" would otherwise
     * mean both "not migrated" and "nobody said". */
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: {
      governedWriteKey: key,
      governedWritePhase: phase,
      durabilityProfile: profile,
      targetClass: target.targetClass,
      ...extraMetadata,
    },
  };
  /**
   * The identity is the key, the phase and the RUN. It excludes softwareVersion, so the same phase replayed from
   * a later build is the same event.
   *
   * 🔴 THE RUN IS IN THE IDENTITY ON PURPOSE. Without it, a process that died after ATTEMPTED would poison every
   * later run: the next run would recompute the same eventId with a different `occurredAt`, and the store would
   * correctly refuse it as a conflicting duplicate — so one crash would block that target for ever. With the run
   * in the identity, the dead saga stays visible as INCOMPLETE (which is the point of exposing it) and the next
   * run proceeds. A retry WITHIN a run still recomputes the same id, so it appends nothing.
   */
  const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };
  return audit.store.append(draft, { identity });
}

/**
 * EXECUTE ONE GOVERNED WRITE.
 *
 * @returns {{outcome: string, idempotencyKey: string, profile: string, target: object,
 *            attemptedEventId: string|null, terminalEventId: string|null, faults: object[]}}
 */
export function executeGovernedWrite({ permission, audit, adapter, action, idempotencyKey = null }) {
  requireAuditContext(audit);
  requireAdapter(adapter);
  requireAction(action);

  const profile = adapter.profile;
  const described = adapter.describeTarget() ?? {};
  const target = { targetClass: described.targetClass, repoRelativeTarget: described.repoRelativeTarget };
  refuseAuditStoreTarget(String(target.repoRelativeTarget ?? ""), audit.store);

  const derived = deriveIdempotencyKey({
    profile,
    targetClass: target.targetClass,
    repoRelativeTarget: target.repoRelativeTarget,
    occurrenceFingerprint: action.occurrenceFingerprint,
  });
  /* 🔴 A SUPPLIED KEY IS VALIDATED, NEVER TRUSTED. */
  if (idempotencyKey !== null && idempotencyKey !== derived) {
    throw new GovernedWriteRefused("IDEMPOTENCY_KEY_NOT_DERIVABLE", "the supplied key is not the key this action derives; a key that may be supplied wrongly is not a key");
  }
  const key = derived;
  const base = { idempotencyKey: key, profile, target };

  // ── 1 · THE PURE PERMISSION RESULT IS CONSUMED, NOT RECOMPUTED ────────────
  if (!permission || permission.mayWrite !== true) {
    const refused = appendPhase({
      audit, action, profile, target, key, phase: SAGA.REFUSED,
      reasonCode: "GOVERNED_WRITE_REFUSED_BY_WRITE_LAW",
      extraMetadata: { permissionReason: String(permission?.reason ?? "NO_PERMISSION") },
    });
    return { ...base, outcome: "REFUSED", attemptedEventId: null, terminalEventId: refused.event.eventId, faults: [] };
  }

  // ── 2 · INSPECT BEFORE MUTATING. A retry neither duplicates nor overwrites. ──
  const found = adapter.inspect(key) ?? { state: "ABSENT" };
  if (found.state === "COMMITTED") {
    /* Appends nothing, and no second ATTEMPTED: this key's saga is already terminal in the trail. */
    return { ...base, outcome: "ALREADY_COMMITTED", attemptedEventId: null, terminalEventId: null, faults: [] };
  }
  if (found.state === "CONFLICTING") {
    const t = appendPhase({
      audit, action, profile, target, key, phase: SAGA.FAILED,
      reasonCode: "GOVERNED_WRITE_OCCURRENCE_CONFLICT",
      extraMetadata: { conflictingFields: String(found.fields ?? "UNNAMED") },
    });
    return { ...base, outcome: "FAILED_BEFORE_COMMIT", attemptedEventId: null, terminalEventId: t.event.eventId, faults: [{ code: "OCCURRENCE_CONFLICT" }] };
  }

  // ── 3 · PREVALIDATE THE COMPLETE RECORD, BEFORE ANY ATTEMPT IS RECORDED ───
  const pre = adapter.prevalidate() ?? [];
  if (pre.length) {
    const t = appendPhase({
      audit, action, profile, target, key, phase: SAGA.FAILED,
      reasonCode: "GOVERNED_WRITE_PREVALIDATION_FAILED",
      extraMetadata: { faultCodes: pre.map((f) => f.code).join(",").slice(0, 190) },
    });
    return { ...base, outcome: "FAILED_BEFORE_COMMIT", attemptedEventId: null, terminalEventId: t.event.eventId, faults: pre };
  }

  // ── 4 · ATTEMPTED, DURABLY, BEFORE THE MUTATION BEGINS ────────────────────
  /* If this append throws, it throws BEFORE anything is mutated. That is the fail-closed direction. */
  const attempted = appendPhase({
    audit, action, profile, target, key, phase: SAGA.ATTEMPTED, reasonCode: "GOVERNED_WRITE_ATTEMPTED",
  });
  const attemptedEventId = attempted.event.eventId;
  const withAttempt = { ...base, attemptedEventId };

  // ── 5 · THE MUTATION, THROUGH THE DECLARED ADAPTER ONLY ───────────────────
  const fail = (reasonCode, faults, extra = {}) => {
    const t = appendPhase({ audit, action, profile, target, key, phase: SAGA.FAILED, reasonCode, parentEventId: attemptedEventId, extraMetadata: extra });
    return { ...withAttempt, outcome: "FAILED_BEFORE_COMMIT", terminalEventId: t.event.eventId, faults };
  };

  let prepared = null;
  if (STAGED.has(profile)) {
    /* Discard OUR OWN abandoned temporaries — the named owner of the PREPARED discovered state. Never an
     * unrelated file, and never by adoption: a temporary of unknown provenance is deleted, not committed. */
    if (typeof adapter.discardAbandoned === "function") adapter.discardAbandoned();
    try {
      prepared = adapter.prepare();
    } catch (err) {
      /* A directory the external tool half-filled is discarded at once: it can never become the target, and leaving
       * it for the next write would only hold disk hostage to a download that is known to have failed. */
      if (profile === "STAGED_DIRECTORY_REPLACE" && typeof adapter.discardAbandoned === "function") adapter.discardAbandoned();
      return fail("GOVERNED_WRITE_PREPARE_FAILED", [{ code: "PREPARE_FAILED", why: String(err?.code ?? err?.name ?? "ERROR") }], { errorCode: String(err?.code ?? err?.name ?? "ERROR") });
    }
    const preparedFaults = typeof adapter.verifyPrepared === "function" ? (adapter.verifyPrepared(prepared) ?? []) : [];
    if (preparedFaults.length) {
      if (typeof adapter.discardAbandoned === "function") adapter.discardAbandoned();
      return fail("GOVERNED_WRITE_PREPARED_BYTES_INVALID", preparedFaults, { faultCodes: preparedFaults.map((f) => f.code).join(",").slice(0, 190) });
    }
  }

  let commitThrew = null;
  try {
    adapter.commit(prepared);
  } catch (err) {
    commitThrew = err;
  }

  // ── 6 · VERIFY THE TARGET AFTER COMMIT — PER PROFILE, AS MEASURED ─────────
  if (profile === "VALIDATED_APPEND") {
    /* 🔴 RECONCILE AN UNCERTAIN RETURN THROUGH TARGET INSPECTION. An append either landed or it did not, so
     * inspection always settles it — which is exactly why COMMIT_STATUS_UNKNOWN is DECLARED-UNREACHABLE here. */
    const after = adapter.inspect(key) ?? { state: "ABSENT" };
    if (after.state === "COMMITTED") {
      const t = appendPhase({ audit, action, profile, target, key, phase: SAGA.COMMITTED, reasonCode: "GOVERNED_WRITE_COMMITTED", parentEventId: attemptedEventId });
      return { ...withAttempt, outcome: "COMMITTED", terminalEventId: t.event.eventId, faults: [] };
    }
    if (after.state === "CONFLICTING") {
      return fail("GOVERNED_WRITE_OCCURRENCE_CONFLICT", [{ code: "OCCURRENCE_CONFLICT" }], { conflictingFields: String(after.fields ?? "UNNAMED") });
    }
    return fail(
      "GOVERNED_WRITE_APPEND_DID_NOT_LAND",
      [{ code: "APPEND_ABSENT", why: String(commitThrew?.code ?? commitThrew?.name ?? "ABSENT_AFTER_RETURN") }],
      { errorCode: String(commitThrew?.code ?? commitThrew?.name ?? "ABSENT_AFTER_RETURN") },
    );
  }

  // STAGED_REPLACE · STAGED_DIRECTORY_REPLACE
  if (commitThrew && commitThrew.governedTargetState === "TARGET_ABSENT") {
    /* 🔴 THE ROLLBACK FAILED. The live copy was moved aside, the staged copy did not take its place, and moving the
     * live copy back also failed — so the target is ABSENT. That is not FAILED_BEFORE_COMMIT (the target DID change)
     * and it is not COMMITTED. It is returned as what it is, and nothing is discarded: the retired copy stays on disk
     * as a DISCOVERED state for its named owner. */
    const t = appendPhase({
      audit, action, profile, target, key, phase: SAGA.RECOVERY_REQUIRED,
      reasonCode: "GOVERNED_WRITE_TARGET_ABSENT_AFTER_FAILED_ROLLBACK", parentEventId: attemptedEventId,
      extraMetadata: { errorCode: String(commitThrew?.code ?? commitThrew?.name ?? "ERROR") },
    });
    return { ...withAttempt, outcome: "RECOVERY_REQUIRED", terminalEventId: t.event.eventId, faults: [{ code: "TARGET_ABSENT_AFTER_FAILED_ROLLBACK" }] };
  }
  if (commitThrew) {
    if (typeof adapter.discardAbandoned === "function") adapter.discardAbandoned();
    return fail("GOVERNED_WRITE_COMMIT_FAILED", [{ code: "COMMIT_FAILED", why: String(commitThrew?.code ?? commitThrew?.name ?? "ERROR") }], { errorCode: String(commitThrew?.code ?? commitThrew?.name ?? "ERROR") });
  }
  const verifyFaults = adapter.verify(key) ?? [];
  if (verifyFaults.length) {
    /* 🔴 THE RENAME LANDED AND THE CONFIRMATION DID NOT. Reporting this COMMITTED would claim a confirmation
     * never obtained; reporting it FAILED would deny a mutation that really happened. It is neither. */
    const t = appendPhase({
      audit, action, profile, target, key, phase: SAGA.RECOVERY_REQUIRED,
      reasonCode: "GOVERNED_WRITE_COMMITTED_BUT_UNCONFIRMED", parentEventId: attemptedEventId,
      extraMetadata: { faultCodes: verifyFaults.map((f) => f.code).join(",").slice(0, 190) },
    });
    return { ...withAttempt, outcome: "RECOVERY_REQUIRED", terminalEventId: t.event.eventId, faults: verifyFaults };
  }
  const committed = appendPhase({ audit, action, profile, target, key, phase: SAGA.COMMITTED, reasonCode: "GOVERNED_WRITE_COMMITTED", parentEventId: attemptedEventId });
  return { ...withAttempt, outcome: "COMMITTED", terminalEventId: committed.event.eventId, faults: [] };
}

/**
 * RECOVER ONE GOVERNED WRITE BY IDEMPOTENCY KEY.
 *
 * 🔴 IT APPENDS A RECOVERY OUTCOME. IT NEVER REWRITES A PRIOR EVENT — history is not edited to manufacture
 * atomicity, and a recovery that cannot be settled says so rather than assuming success.
 */
export function recoverGovernedWrite({ audit, adapter, action, idempotencyKey }) {
  requireAuditContext(audit);
  requireAdapter(adapter);
  requireAction(action);
  if (!HEX64.test(String(idempotencyKey ?? ""))) throw new GovernedWriteRefused("IDEMPOTENCY_KEY_INVALID", "recovery is by idempotency key; it never guesses one");

  const profile = adapter.profile;
  const described = adapter.describeTarget() ?? {};
  const target = { targetClass: described.targetClass, repoRelativeTarget: described.repoRelativeTarget };

  const found = typeof adapter.recover === "function" ? (adapter.recover(idempotencyKey) ?? { state: "ABSENT" }) : (adapter.inspect(idempotencyKey) ?? { state: "ABSENT" });
  const phase = found.state === "COMMITTED" ? SAGA.RECOVERED_COMMITTED : SAGA.RECOVERY_FAILED;
  const t = appendPhase({
    audit, action, profile, target, key: idempotencyKey, phase,
    reasonCode: phase === SAGA.RECOVERED_COMMITTED ? "GOVERNED_WRITE_RECOVERED_COMMITTED" : "GOVERNED_WRITE_RECOVERY_FAILED",
    extraMetadata: { discoveredState: String(found.state ?? "ABSENT") },
  });
  return { idempotencyKey, profile, target, outcome: phase, terminalEventId: t.event.eventId, discovered: found.state ?? "ABSENT" };
}

/**
 * 🔴 EXPOSE INCOMPLETE SAGAS. An ATTEMPTED with no terminal event is the one thing this boundary cannot prevent
 * — the process can die between them — so it is REPORTED rather than hidden. A reader that quietly drops these
 * would turn a crash into a clean-looking trail.
 */
export function incompleteSagas(events) {
  const attempted = new Map();
  const terminal = new Set();
  for (const e of events ?? []) {
    if (e?.eventType !== "GOVERNED_WRITE") continue;
    const key = e.metadata?.governedWriteKey;
    const phase = e.metadata?.governedWritePhase;
    if (!key || !phase) continue;
    if (phase === SAGA.ATTEMPTED) attempted.set(key, e);
    else if (TERMINAL_PHASES.includes(phase)) terminal.add(key);
  }
  return [...attempted.entries()]
    .filter(([key]) => !terminal.has(key))
    .map(([key, e]) => ({ idempotencyKey: key, eventId: e.eventId, action: e.action, profile: e.metadata?.durabilityProfile ?? null }));
}
