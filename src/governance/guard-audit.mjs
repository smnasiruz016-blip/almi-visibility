/**
 * 🔴 F08 §6 · THE TWO SHARED GUARDS EMIT THEIR OWN DECISIONS — ONCE, AT THE GUARD, METADATA ONLY (23 September 2026).
 *
 * `readUnsealed` (sealed-paths.mjs) and `observedDataExemption` (evidence-roles.mjs) are where a sealed path is refused
 * and where an artefact's role is adjudicated. Until now neither recorded anything as it decided, so the decision-site
 * census rightly named both DEFECT. They are instrumented HERE, once, and not at each caller: a caller cannot forget,
 * and cannot duplicate, an emission it never makes.
 *
 * ── A SINK IS REQUIRED. THERE IS NO SILENT PATH. ─────────────────────────────
 *
 * Each guard now takes an `audit` sink and REFUSES to decide without one (GUARD_AUDIT_SINK_ABSENT) — before any read.
 * A default would be a silent path wearing a convenience's clothes. Two sinks exist, and the caller's nature chooses:
 *
 *   governedGuardSink  a GOVERNED run's decisions reach the durable audit store — the production trail, or the
 *                      confined store inside a verified test context (governed-run.mjs decides which, as it does for
 *                      every governed write).
 *   diagnosticGuardSink a READ-ONLY diagnostic's decisions (the held-out firewall, the audit-trail census) are emitted
 *                      and kept by the run that made them, and are NOT persisted. 🔴 That is deliberate and it is not a
 *                      gap: a read-only diagnostic may not mutate durable state (its census class says so), and letting
 *                      every firewall run append to the committed trail would make the production store's bytes
 *                      depend on how many times anyone ran a check. Its sink says `durable: false` on its face.
 *
 * ── WHAT AN EVENT CARRIES, AND WHAT IT NEVER CARRIES ─────────────────────────
 *
 * Carries: the event type, the outcome, the guard's reason code, a CLASSIFICATION (the registry entry id that decided
 * it and the role), the governing authority as it stood, the software version, occurredAt (recordedAt is the store's),
 * the actor and a GLOBAL_PRODUCT scope. Never: file content, a sealed path, an observed-data payload, a held-out string.
 * For an adjudicated artefact the reference is a 16-hex digest of `root:path`, stable and non-reversible — the path
 * itself is not written, because a path that matched held-out material is exactly what must not leak.
 */
import { createHash } from "node:crypto";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { metadataFaults } from "../audit-trail/event.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";

/** The ruling that governs evidence roles and sealed material. Resolved live, never pinned. */
export const GUARD_AUTHORITY = Object.freeze({ propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: Object.freeze(["ALMIVISIBILITY"]) });

export class GuardAuditAbsent extends Error {
  constructor(guard) {
    super(`GUARD_AUDIT_SINK_ABSENT: ${guard} decides only with an audit sink — there is no unaudited path`);
    this.name = "GuardAuditAbsent";
    this.code = "GUARD_AUDIT_SINK_ABSENT";
  }
}

/** Called FIRST by each guard, before any read. */
export function requireGuardSink(audit, guard) {
  if (!audit || typeof audit.emit !== "function") throw new GuardAuditAbsent(guard);
  return audit;
}

/** A 16-hex digest of `root:path` — a stable reference to WHICH artefact, that names no path. */
export const resourceRef = (root, path) => createHash("sha256").update(`${root}:${String(path).replace(/\\/g, "/")}`, "utf8").digest("hex").slice(0, 16);

/** The authority the guards decide under, resolved over the real corpus. Throws unless CURRENT — fail closed. */
export function guardAuthority({ now, records = AUTHORITY_CORPUS }) {
  const res = resolveAuthority({ records, propositionId: GUARD_AUTHORITY.propositionId, scope: [...GUARD_AUTHORITY.scope], now });
  if (!permits(res)) throw new Error(`GUARD_AUTHORITY_UNRESOLVED: ${res.outcome} — a guard decision is not recorded under an authority that does not currently resolve`);
  return { authorityRef: { propositionId: GUARD_AUTHORITY.propositionId, scope: [...GUARD_AUTHORITY.scope] }, authorityHash: res.authority.contentHash };
}

/**
 * The complete draft for one guard decision. `decision` is what the guard decided — never content:
 *   { eventType, action, outcome, reasonCode, metadata }
 */
export function guardEventDraft(decision, { actor, softwareVersion, correlationId, authorityRef, authorityHash, occurredAt }) {
  return {
    eventType: decision.eventType,
    action: decision.action,
    outcome: decision.outcome,
    reasonCode: decision.reasonCode,
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
    metadata: { family: "G", ...decision.metadata },
  };
}

/**
 * 🔴 THE DURABLE / DIAGNOSTIC LINE — DERIVED FROM WHAT HAPPENED (owner ruling, 23 September 2026, option b).
 *
 *   Nobody requested the material                        -> CLASSIFICATION  -> kept by the run, NOT persisted
 *   Something tried to obtain it, and was granted or refused -> ACCESS       -> durable, always
 *   A contamination / firewall finding                   -> VIOLATION       -> durable
 *   A governed change to seal, access rule, freeze or evaluation state -> GOVERNED_CHANGE -> durable
 *
 * The class is read from the decision's OWN eventType, action and outcome — never from who emitted it, which sink
 * it reached, or any flag it carries. There is no list of "diagnostic callers": a firewall run that meets a real
 * sealed refusal records it durably, and a clean sweep that only classified records nothing. What this cannot place
 * is durable (UNDERIVED): an unknown kind of decision fails closed into the trail, never out of it.
 */
export const AUDIT_CLASSES = Object.freeze(["ACCESS", "VIOLATION", "GOVERNED_CHANGE", "CLASSIFICATION", "UNDERIVED"]);
export function auditClassOf(decision) {
  const { eventType, action, outcome } = decision ?? {};
  if (eventType === "REFUSAL") return "ACCESS";
  if (eventType === "EVIDENCE_ROLE_DECISION") return outcome === "ALLOWED" ? "CLASSIFICATION" : "VIOLATION";
  if (eventType === "EVALUATION") return action === "HELDOUT_ACCESS" ? "ACCESS" : "GOVERNED_CHANGE";
  /* F06: a checked evidence-state supersession changes what an item may be reported as — a governed change. */
  if (eventType === "EVIDENCE_STATE_TRANSITION") return "GOVERNED_CHANGE";
  return "UNDERIVED";
}
export const isDurableDecision = (decision) => auditClassOf(decision) !== "CLASSIFICATION";

/** A decision may carry only these metadata keys. Anything else — a path, a body, a value — is refused before emission. */
export const GUARD_METADATA_KEYS = Object.freeze(["guard", "classification", "ruleEntry", "role", "root", "resourceRef"]);
function checkDecision(decision) {
  const extra = Object.keys(decision.metadata ?? {}).filter((k) => !GUARD_METADATA_KEYS.includes(k));
  if (extra.length) throw new Error(`GUARD_EVENT_NOT_METADATA_ONLY: undeclared metadata key(s) ${extra.join(", ")}`);
  const faults = metadataFaults(decision.metadata ?? {});
  if (faults.length) throw new Error(`GUARD_EVENT_NOT_METADATA_ONLY: ${faults.map((f) => f.code).join(", ")}`);
}

/**
 * The durable sink for a GOVERNED run: each decision is appended to the audit store it is handed — the one
 * `governedAuditContext` resolved (confined inside a verified test context). The store validates every event.
 */
export function durableGuardSink({ store, actor, softwareVersion, correlationId, authorityRef, authorityHash, clock = () => isoSeconds(Date.now()) }) {
  if (!store || typeof store.append !== "function") throw new GuardAuditAbsent("durableGuardSink");
  /* Every decision this run made, kept so a caller can REPORT it (F07: the firewall counts them) — appended or not. */
  const events = [];
  return {
    durable: true,
    emitted: 0,
    classified: 0,
    events,
    emit(decision) {
      checkDecision(decision);
      const draft = guardEventDraft(decision, { actor, softwareVersion, correlationId, authorityRef, authorityHash, occurredAt: clock() });
      /* THE LINE, applied at the one place every guard decision passes: a CLASSIFICATION is kept by the run and not
       * appended; everything else goes to the store exactly as before. */
      const auditClass = auditClassOf(draft);
      if (auditClass === "CLASSIFICATION") {
        this.classified += 1;
        events.push(draft);
        return { event: draft, appended: false, durable: false, auditClass };
      }
      /* 🔴 ONE EVENT PER DECISION — SO EACH DECISION GETS ITS OWN IDENTITY (found 23 September, before it shipped).
       * The store's default identity ignores metadata and resolves time to the second. Two sealed refusals in one
       * second would have derived the SAME eventId: identical content returns IDEMPOTENT_RETRY and the second decision
       * vanishes; different content (two artefacts) is EVENT_ID_CONFLICT and the guard fails. The identity is this
       * run, this instant and this sink's decision sequence — so two decisions are two events, while a replayed
       * append of the SAME decision still dedupes by eventId in the store. */
      const identity = { eventType: draft.eventType, action: draft.action, occurredAt: draft.occurredAt, correlationId, guardDecisionSeq: this.emitted + 1 };
      const r = store.append(draft, { identity });
      this.emitted += 1;
      events.push(r.event);
      return r;
    },
  };
}

/**
 * The sink for a READ-ONLY diagnostic: the decision is checked by the same metadata-only rule and KEPT BY THE RUN,
 * never persisted. `events` is what the diagnostic reports.
 */
export function diagnosticGuardSink({ actor = "read-only-diagnostic", softwareVersion = "diagnostic", correlationId = "run:diagnostic", authorityRef = { propositionId: GUARD_AUTHORITY.propositionId, scope: [...GUARD_AUTHORITY.scope] }, authorityHash = null, clock = () => isoSeconds(Date.now()) } = {}) {
  const events = [];
  return {
    durable: false,
    events,
    get emitted() { return events.length; },
    emit(decision) {
      checkDecision(decision);
      const draft = guardEventDraft(decision, { actor, softwareVersion, correlationId, authorityRef, authorityHash, occurredAt: clock() });
      events.push(draft);
      return { event: draft, appended: false, durable: false };
    },
  };
}
