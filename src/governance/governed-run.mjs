/**
 * 🔴 WHERE A GOVERNED WRITE'S AUDIT TRAIL LIVES — AND WHY A TEST MAY NOT CHOOSE IT FREELY.
 *
 * Auditing a REFUSED decision means every dry run of every governed binary appends an event, and many test files
 * spawn one. Without a confined store, running the suite would rewrite the production trail on every run. So the
 * confined store is LOAD-BEARING, not a convenience — and an override that could point anywhere would be a
 * production escape hatch wearing a test's clothes.
 *
 * The override is therefore honoured ONLY inside a verified test context, and even then only beneath one declared
 * scratch root, checked lexically AND through realpath so a symlink cannot walk out.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { AUDIT_STORE } from "../../config/audit-store.mjs";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { productionAuditStore } from "../audit-trail/wiring.mjs";
import { softwareVersionOf } from "../audit-trail/wiring.mjs";
import { stagedReplaceAdapter, stagedDirectoryReplaceAdapter, jsonlAppendAdapter, storeAppendAdapter, APPEND_DISCIPLINES } from "./durability-adapters.mjs";
import { durableGuardSink, guardAuthority } from "./guard-audit.mjs";

export const AUDIT_STORE_OVERRIDE_ENV = "ALMIVISIBILITY_AUDIT_STORE";

/** The nonce that scopes a confined store to ONE suite invocation. A harness may set it; otherwise it is minted. */
export const AUDIT_RUN_ENV = "ALMIVISIBILITY_AUDIT_RUN";

/** The ONE declared root a confined test store may live beneath. Repository-relative, and never outside it. */
export const TEST_SCRATCH_AUDIT_ROOT = ".test-scratch/audit";

/** Events written to a confined store carry this, so they can never be mistaken for real evidence. */
export const SYNTHETIC_LABEL = "SYNTHETIC_TEST_FIXTURE";

export class AuditStoreOverrideForbidden extends Error {
  constructor(why) {
    super(`AUDIT_STORE_OVERRIDE_FORBIDDEN: ${why}`);
    this.name = "AuditStoreOverrideForbidden";
    this.code = "AUDIT_STORE_OVERRIDE_FORBIDDEN";
    this.why = why;
  }
}

/**
 * 🔴 NODE'S OWN TEST SIGNALS, BOTH REQUIRED — MEASURED TO SURVIVE `spawnSync` INTO A CHILD BINARY.
 *
 * A home-made signal would be a variable any process could set, which is exactly the hole this is meant to close.
 * These two are set by the test runner itself. Both are required: either alone is easier to set by accident.
 */
export function inVerifiedTestContext(env = process.env) {
  return env.NODE_TEST_CONTEXT === "child-v8" && typeof env.NODE_TEST_WORKER_ID === "string" && env.NODE_TEST_WORKER_ID !== "";
}

/**
 * 🔴 ONE RUN, ONE STORE — AND A LATER RUN NEVER INHERITS AN EARLIER ONE'S EVENTS.
 *
 * Confining by worker id alone was not enough: `worker-3` means the same directory in every invocation, so events
 * ACCUMULATED across suite runs (measured: a store grew 6 -> 7 -> 8 lines over three consecutive runs). A test that
 * reads a store it did not fill is a test whose result depends on how many times the suite has been run before,
 * which is exactly the kind of evidence that cannot be reproduced.
 *
 * The nonce is minted ONCE per process and written back into the environment, so anything this process SPAWNS
 * inherits it — a binary spawned by a test shares that test's store, while an unrelated test and every later run
 * get their own. A harness that sets the variable itself owns the whole run's directory and can remove exactly it.
 */
export function auditRunScope(env = process.env) {
  let nonce = env[AUDIT_RUN_ENV];
  if (!nonce) {
    nonce = `${process.pid}-${randomBytes(4).toString("hex")}`;
    env[AUDIT_RUN_ENV] = nonce;
    MINTED_HERE.add(nonce);
  }
  /* It becomes a PATH SEGMENT, so it is validated rather than trusted: a separator or `..` here would walk the
   * confined store straight out of its root. */
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(nonce) || nonce.includes("..")) {
    throw new AuditStoreOverrideForbidden(`${AUDIT_RUN_ENV} is not a safe path segment`);
  }
  return `run-${nonce}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 🔴 F08 §7 · A CONFINED STORE IS REMOVED BY THE PROCESS THAT OWNS IT — AND BY NOBODY ELSE (23 September 2026).
 *
 * Measured: the plain suite command (`node --test test/*.test.mjs`, which CI runs) left ~40 run directories under
 * .test-scratch/audit per run — one per test-file process, each minting its own nonce — and nothing ever removed
 * them (584 → 624 in one run). The suite HARNESS already removed the one directory IT owned; the plain command had
 * no owner at all.
 *
 * OWNERSHIP IS PROVED, NOT INFERRED: a process owns a run directory only when it MINTED that directory's nonce
 * itself (MINTED_HERE). A nonce inherited from the environment belongs to whoever set it — a parent test process,
 * or the harness — and is never touched here. At exit the owner removes exactly `…/run-<its nonce>`, after
 * re-checking by realpath that the directory lies beneath the declared scratch root. No pattern, no sweep, no
 * directory this process did not create.
 *
 * A FAILED RUN KEEPS ITS EVIDENCE. When the process exits non-zero the directory is left in place with a RETAINED
 * marker naming the exit code and pid, and `retainedRunDirs` / `removeRetainedRunDirs` (below) list and remove
 * exactly those — the bounded cleanup for a run that failed on purpose or by accident.
 * ───────────────────────────────────────────────────────────────────────────── */
const MINTED_HERE = new Set();
const OWNED_RUN_DIRS = new Map(); // absolute run dir -> scratch root it must lie beneath
export const RETAINED_MARKER = "RETAINED";

function ownRunDir(runDir, scratchRoot) {
  if (OWNED_RUN_DIRS.size === 0) process.on("exit", (code) => releaseOwnedRunDirs({ exitCode: code }));
  OWNED_RUN_DIRS.set(runDir, scratchRoot);
}

/** At exit: remove every run directory this process OWNS, or — on a failed run — mark it RETAINED and keep it. */
export function releaseOwnedRunDirs({ exitCode = process.exitCode ?? 0 } = {}) {
  const out = [];
  for (const [dir, root] of OWNED_RUN_DIRS) {
    if (!existsSync(dir)) { out.push({ dir, action: "ABSENT" }); continue; }
    const realRoot = existsSync(root) ? realpathSync(root) : null;
    const realDir = realpathSync(dir);
    if (!realRoot || !isBeneath(realRoot, realDir)) { out.push({ dir, action: "REFUSED_OUTSIDE_SCRATCH_ROOT" }); continue; }
    if (exitCode !== 0) {
      writeFileSync(join(dir, RETAINED_MARKER), `exitCode=${exitCode} pid=${process.pid}\n`, "utf8");
      out.push({ dir, action: "RETAINED" });
      continue;
    }
    rmSync(dir, { recursive: true, force: true });
    out.push({ dir, action: "REMOVED" });
  }
  return out;
}

/** Run directories a FAILED run kept, each named by its RETAINED marker. Only those — never an unmarked one. */
export function retainedRunDirs({ repo }) {
  const root = join(repo, TEST_SCRATCH_AUDIT_ROOT);
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((n) => /^run-[A-Za-z0-9_.-]{1,64}$/.test(n) && existsSync(join(root, n, RETAINED_MARKER)))
    .map((n) => ({ dir: join(root, n), marker: readFileSync(join(root, n, RETAINED_MARKER), "utf8").trim() }));
}

/** The bounded cleanup for retained evidence: removes ONLY RETAINED-marked run directories beneath the scratch root. */
export function removeRetainedRunDirs({ repo }) {
  const realRoot = realpathSync(join(repo, TEST_SCRATCH_AUDIT_ROOT));
  const removed = [];
  for (const { dir } of retainedRunDirs({ repo })) {
    if (!isBeneath(realRoot, realpathSync(dir))) continue;
    rmSync(dir, { recursive: true, force: true });
    removed.push(dir);
  }
  return removed;
}

/** Lexical containment that cannot be fooled by `..`, plus the separator so `/a/bc` is not "inside" `/a/b`. */
const isBeneath = (parent, child) => {
  const p = resolve(parent);
  const c = resolve(child);
  return c !== p && c.startsWith(p.endsWith(sep) ? p : p + sep);
};

/** realpath of the nearest EXISTING ancestor — so a symlinked parent is caught before anything is created. */
function realAncestor(path) {
  let cur = resolve(path);
  for (let i = 0; i < 64; i += 1) {
    if (existsSync(cur)) return realpathSync(cur);
    const up = resolve(cur, "..");
    if (up === cur) return null;
    cur = up;
  }
  return null;
}

/**
 * Decide where this process's audit store lives.
 *
 * @returns {{eventsPath: string, headPath: string, synthetic: boolean}}
 * @throws {AuditStoreOverrideForbidden} when an override is present and may not be honoured. 🔴 A STRAY
 *   ENVIRONMENT VARIABLE HALTING THE ENGINE IS THE INTENDED BEHAVIOUR, not an inconvenience to be softened:
 *   silently ignoring it would send a governed write to production while its author believed it was confined.
 */
export function resolveAuditStoreLocation({ repo, env = process.env } = {}) {
  const production = {
    eventsPath: join(repo, AUDIT_STORE.eventsPath),
    headPath: join(repo, AUDIT_STORE.headPath),
    synthetic: false,
  };
  const override = env[AUDIT_STORE_OVERRIDE_ENV];

  /**
   * 🔴 A VERIFIED TEST CONTEXT IS CONFINED BY DEFAULT, NOT BY REMEMBERING TO ASK.
   *
   * Auditing refused decisions means every dry run of a governed binary appends, and many test files spawn one.
   * If confinement depended on each test setting a variable, the first test that forgot would quietly rewrite the
   * production trail — and it would pass, because nothing it asserts would notice. Defaulting the other way makes
   * that impossible rather than merely discouraged. The override then only RELOCATES within the scratch root; it
   * never enables production writing, which is the direction that could do harm.
   */
  if ((override === undefined || override === "") && inVerifiedTestContext(env)) {
    const scope = auditRunScope(env);
    const dir = join(repo, TEST_SCRATCH_AUDIT_ROOT, scope, `worker-${env.NODE_TEST_WORKER_ID}`);
    if (MINTED_HERE.has(scope.slice(4))) ownRunDir(join(repo, TEST_SCRATCH_AUDIT_ROOT, scope), join(repo, TEST_SCRATCH_AUDIT_ROOT));
    return { eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json"), synthetic: true };
  }
  if (override === undefined || override === "") return production;

  if (!inVerifiedTestContext(env)) {
    throw new AuditStoreOverrideForbidden(
      `${AUDIT_STORE_OVERRIDE_ENV} is set outside a verified test context — both NODE_TEST_CONTEXT=child-v8 and NODE_TEST_WORKER_ID are required, and no governed write is performed`,
    );
  }

  const scratchRoot = join(repo, TEST_SCRATCH_AUDIT_ROOT);
  const requested = isAbsolute(override) ? resolve(override) : resolve(join(repo, override));

  if (requested === resolve(repo)) throw new AuditStoreOverrideForbidden("the repository root is not a store location");
  if (!isBeneath(repo, requested)) throw new AuditStoreOverrideForbidden("an outside-repository store location is refused");
  if (!isBeneath(scratchRoot, requested) && requested !== resolve(scratchRoot)) {
    throw new AuditStoreOverrideForbidden(`a confined store lives beneath ${TEST_SCRATCH_AUDIT_ROOT}, and nowhere else`);
  }
  if (isBeneath(resolve(join(repo, AUDIT_STORE.eventsPath, "..")), requested) || requested === resolve(production.eventsPath)) {
    throw new AuditStoreOverrideForbidden("the production store is never an override target");
  }

  /* 🔴 FAIL CLOSED WHEN THE PARENT CANNOT BE RESOLVED. An unresolvable parent means the containment above was
   * checked against a path that may not be the path that gets written. */
  const realScratch = realAncestor(scratchRoot);
  const realRequested = realAncestor(requested);
  if (realScratch === null || realRequested === null) throw new AuditStoreOverrideForbidden("the store's parent directory could not be resolved");
  if (realRequested !== realScratch && !isBeneath(realScratch, realRequested)) {
    throw new AuditStoreOverrideForbidden("the resolved store location escapes the scratch root — a symlinked path is refused");
  }

  /* Unique per RUN and per WORKER by construction, not by test discipline: two workers cannot be handed the same
   * file, and a later invocation cannot be handed an earlier one's. */
  const scope = auditRunScope(env);
  const dir = join(requested, scope, `worker-${env.NODE_TEST_WORKER_ID}`);
  if (MINTED_HERE.has(scope.slice(4))) ownRunDir(join(requested, scope), scratchRoot);
  return { eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json"), synthetic: true };
}

/** A store whose every event is labelled synthetic, so a test fixture can never be counted as real evidence. */
function labelSynthetic(store) {
  return {
    ...store,
    append: (draft, opts) => store.append({ ...draft, metadata: { ...(draft.metadata ?? {}), evidenceClass: SYNTHETIC_LABEL } }, opts),
  };
}

/** True when an event may stand as real F08 evidence. A synthetic fixture never may. */
export const isRealEvidence = (event) => event?.metadata?.evidenceClass !== SYNTHETIC_LABEL;

/**
 * The production audit context a governed binary hands to the boundary: the store this process is entitled to,
 * the build that is running, and the engine as actor. 🔴 NEVER A HUMAN ACTOR — a write the engine performed is
 * recorded as the engine's, whoever asked for it.
 */
export function governedAuditContext({ repo, env = process.env, correlationId = null, authorityRef = null, authorityHash = null, clock = undefined } = {}) {
  const location = resolveAuditStoreLocation({ repo, env });
  if (location.synthetic) mkdirSync(resolve(location.eventsPath, ".."), { recursive: true });
  /* Same validation either way — only the two file paths move. A confined store is not a laxer store. */
  const built = productionAuditStore({
    repo,
    clock,
    at: location.synthetic ? { eventsPath: location.eventsPath, headPath: location.headPath } : null,
  });
  const store = location.synthetic ? labelSynthetic(built) : built;
  return {
    store,
    actor: "engine",
    actorType: "ENGINE",
    softwareVersion: softwareVersionOf(repo),
    correlationId,
    authorityRef,
    authorityHash,
    synthetic: location.synthetic,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ROUTING HELPERS — what a governed binary actually calls.
 *
 * They exist so a call site is one line instead of fifteen. 🔴 THEY DO NOT REPLACE THE BOUNDARY: each returns the
 * ARGUMENTS, and the binary still calls `executeGovernedWrite` itself. A helper that called the boundary on the
 * caller's behalf would let a caller look routed in the census while doing something else entirely.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * 🔴 THE AUTHORITY A GOVERNED WRITE IS DECIDED UNDER — RESOLVED LIVE, NEVER PINNED.
 *
 * It is an EXISTING proposition: the ruling that established that writers must be gated. Nothing is added to the
 * authority corpus to make this work, because inventing an authority to authorise your own change is how an
 * authority register stops meaning anything.
 */
export const GOVERNED_WRITE_AUTHORITY = Object.freeze({
  propositionId: "CC_COMMAND_GAP1_UNGATED_WRITERS",
  scope: Object.freeze(["ALMIVISIBILITY"]),
});

/** Fails closed: an unresolved or superseded authority stops the write rather than proceeding unauthorised. */
export function governedWriteAuthority({ now }) {
  const res = resolveAuthority({
    records: AUTHORITY_CORPUS,
    propositionId: GOVERNED_WRITE_AUTHORITY.propositionId,
    scope: [...GOVERNED_WRITE_AUTHORITY.scope],
    now,
  });
  if (!permits(res)) {
    throw new Error(`GOVERNED_WRITE_AUTHORITY_UNRESOLVED: ${res.outcome} — a governed write does not proceed under an authority that does not currently resolve`);
  }
  return {
    authorityRef: { propositionId: GOVERNED_WRITE_AUTHORITY.propositionId, scope: [...GOVERNED_WRITE_AUTHORITY.scope] },
    authorityHash: res.authority.contentHash,
  };
}

/**
 * 🔴 THE DURABLE SINK FOR A SHARED GUARD, INSIDE A GOVERNED RUN (F08 §6). Same store resolution as every governed
 * write — the production trail, or the confined store in a verified test context — and the guards' own governing
 * authority, resolved live (guard-audit.mjs). A read-only diagnostic uses diagnosticGuardSink instead.
 */
export function governedGuardSink({ repo, env = process.env, correlationId, now, actor }) {
  const ctx = governedAuditContext({ repo, env, correlationId });
  const { authorityRef, authorityHash } = guardAuthority({ now });
  return durableGuardSink({ store: ctx.store, actor, softwareVersion: ctx.softwareVersion, correlationId, authorityRef, authorityHash });
}

/* One context per process. Building it shells out to git and re-derives the protected-payload population, so
 * rebuilding it per write site would make a binary with ten sites ten times slower for no added truth. */
const contextCache = new Map();
export function governedContext({ repo, env = process.env, correlationId, now }) {
  const cacheKey = `${repo}\u0000${correlationId}\u0000${now}`;
  if (!contextCache.has(cacheKey)) {
    const { authorityRef, authorityHash } = governedWriteAuthority({ now });
    contextCache.set(cacheKey, governedAuditContext({ repo, env, correlationId, authorityRef, authorityHash }));
  }
  return contextCache.get(cacheKey);
}

const repoRelative = (repo, target) => (isAbsolute(target) ? relative(repo, target) : target).split(sep).join("/");
const dayOf = (iso) => String(iso).slice(0, 10);

/** A whole-file replacement, through STAGED_REPLACE. */
export function governedFileWrite({ repo, permission, target, targetClass, bytes, action, occurredAt, correlationId, env = process.env, scopeType = "GLOBAL_PRODUCT", tenantId = null, subjectId = null, evidenceRefs = [] }) {
  const adapter = stagedReplaceAdapter({ repo, repoRelativeTarget: repoRelative(repo, target), targetClass, bytes });
  return {
    permission,
    audit: governedContext({ repo, env, correlationId, now: dayOf(occurredAt) }),
    adapter,
    action: { name: action, scopeType, tenantId, subjectId, occurredAt, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs },
  };
}

/**
 * One record onto the shared evidence store, through VALIDATED_APPEND.
 *
 * `append` is supplied by the caller because the stores offer several append disciplines — `appendIfNew` with a
 * `seenAt`, `appendWithoutDedupe`, `appendAllWithoutDedupe` — and which one a caller uses is part of that caller's
 * meaning, not something this helper may choose for it.
 */
export function governedStoreAppend({ repo, permission, store, records, targetClass = "RUN_EVIDENCE", action, occurredAt, correlationId, env = process.env, scopeType = "GLOBAL_PRODUCT", tenantId = null, subjectId = null, evidenceRefs = [], keyOf = null, discipline = "APPEND_IF_NEW", seenAt = null }) {
  const chosen = APPEND_DISCIPLINES[discipline];
  if (!chosen) throw new Error(`UNKNOWN_APPEND_DISCIPLINE: ${discipline} is not one of ${Object.keys(APPEND_DISCIPLINES).join(", ")}`);
  /* Not every governed target is the evidence store: the cost ledger identifies an entry by entry_id and exposes
   * no dedupeKeyOf. A caller writing to such a target must SAY what identifies a record there; guessing would be
   * this module inventing an identity rule for a store it does not own. */
  const identity = keyOf ?? store.dedupeKeyOf;
  if (chosen.requiresKey && typeof identity !== "function") {
    throw new Error("GOVERNED_STORE_APPEND_NEEDS_A_KEY: this target exposes no dedupeKeyOf, so the caller must supply keyOf");
  }
  const adapter = storeAppendAdapter({
    repo,
    repoRelativeTarget: repoRelative(repo, store.path),
    targetClass,
    store,
    records,
    keyOf: identity ?? (() => null),
    append: (s, r) => chosen.apply(s, r, { seenAt }),
    linesWritten: chosen.linesWritten,
    requiresKey: chosen.requiresKey,
    /* The run is part of the occurrence: a later run's observation of the same finding is a NEW occurrence, which
     * is what lets the store record the re-check instead of the boundary suppressing it. */
    occurrenceScope: correlationId,
  });
  return {
    permission,
    audit: governedContext({ repo, env, correlationId, now: dayOf(occurredAt) }),
    adapter,
    action: { name: action, scopeType, tenantId, subjectId, occurredAt, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs },
  };
}

/**
 * A whole directory filled by an external step, through STAGED_DIRECTORY_REPLACE. `occurrenceFingerprint` is the
 * caller's DECLARED content identity of what it fetches (e.g. the hash of an artifact's name and run), because the
 * bytes do not exist until `populate` has run; it is validated as a sha256, never trusted as anything more.
 */
export function governedDirectoryReplace({ repo, permission, target, targetClass, populate, validate, occurrenceFingerprint, action, occurredAt, correlationId, env = process.env, scopeType = "GLOBAL_PRODUCT", tenantId = null, subjectId = null, evidenceRefs = [] }) {
  const adapter = stagedDirectoryReplaceAdapter({ repo, repoRelativeTarget: repoRelative(repo, target), targetClass, occurrenceFingerprint, populate, validate });
  return {
    permission,
    audit: governedContext({ repo, env, correlationId, now: dayOf(occurredAt) }),
    adapter,
    action: { name: action, scopeType, tenantId, subjectId, occurredAt, occurrenceFingerprint, evidenceRefs },
  };
}

/** One record onto an append-only log, through VALIDATED_APPEND. */
export function governedRecordAppend({ repo, permission, target, targetClass, record, occurrenceKeyOf, action, occurredAt, correlationId, env = process.env, scopeType = "GLOBAL_PRODUCT", tenantId = null, subjectId = null, evidenceRefs = [] }) {
  const adapter = jsonlAppendAdapter({ repo, repoRelativeTarget: repoRelative(repo, target), targetClass, record, occurrenceKeyOf });
  return {
    permission,
    audit: governedContext({ repo, env, correlationId, now: dayOf(occurredAt) }),
    adapter,
    action: { name: action, scopeType, tenantId, subjectId, occurredAt, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs },
  };
}
