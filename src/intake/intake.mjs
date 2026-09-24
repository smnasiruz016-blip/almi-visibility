/**
 * 🔴 F01 §6 · THE INTAKE DECISION — ONE SUBMISSION, ONE OUTCOME, DECIDED BEFORE ANYTHING IS WRITTEN (24 September 2026).
 *
 *   SUBMITTED → VALIDATED → ACCEPTED        the contract holds, the tenant resolves, and the project's history allows it
 *   SUBMITTED → REFUSED                     the contract refuses it (reason codes, never values)
 *   VALIDATED → REFUSED                     a lawful document the store cannot take: another tenant's project, an id
 *                                           already used for different content, or a supersession that names the wrong
 *                                           current declaration
 *   ACCEPTED  → SUPERSEDED                  only by a NEW accepted declaration that names it in `supersedes`
 *   replay                                  the same bytes again: nothing new is written and nothing new is recorded
 *
 * 🔴 PURE. It reads the store and returns what must happen — the writes, in order, and the audit decisions. The entry
 * point performs them through F08's boundary. A refusal therefore cannot touch the accepted store: it has no writes.
 */
import { createHash, randomBytes } from "node:crypto";

import { validateDeclaration } from "./contract.mjs";
import {
  serialise, submissionRel, currentRel, currentDeclaration, tenantHoldingProject, declarationIdHolder, currentPointer,
} from "./store.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { ACCEPTANCES } from "../../config/fboard/acceptances.mjs";
import { isDurableDecision } from "../governance/guard-audit.mjs";

/** The authority a declaration decision is taken under: F01's frozen acceptance, resolved LIVE. Fails closed. */
export function intakeAuthority({ now, records = AUTHORITY_CORPUS }) {
  const acc = ACCEPTANCES.F01?.authority;
  if (!acc) throw new Error("INTAKE_AUTHORITY_UNRESOLVED: no frozen F01 acceptance is pinned");
  const res = resolveAuthority({ records, propositionId: acc.propositionId, scope: [...acc.scope], now });
  if (!permits(res)) throw new Error(`INTAKE_AUTHORITY_UNRESOLVED: ${res.outcome} — no declaration is decided under an authority that does not currently resolve`);
  return { authorityRef: { propositionId: acc.propositionId, scope: [...acc.scope] }, authorityHash: res.authority.contentHash };
}

/**
 * Decide one submission against the store and the tenant registry.
 * Returns { outcome: "REFUSED"|"ACCEPT"|"REPLAY", stage, refusals, normalised, writes, transitions }.
 */
export function decideSubmission({ doc, root, tenants, attachedTo, acceptedAt }) {
  const v = validateDeclaration(doc, { tenants, attachedTo });
  if (!v.ok) {
    return Object.freeze({ outcome: "REFUSED", stage: "CONTRACT", refusals: v.refusals, normalised: null, writes: [], transitions: [t("SUBMITTED", "REFUSED", doc)] });
  }
  const n = v.normalised;
  const bytes = serialise(n);
  const refuseStore = (code, path = "$") => Object.freeze({
    outcome: "REFUSED", stage: "STORE", refusals: Object.freeze([Object.freeze({ code, path })]), normalised: n, writes: [],
    transitions: [t("SUBMITTED", "VALIDATED", n), t("VALIDATED", "REFUSED", n)],
  });

  // 🔴 One project, one tenant — for ever. A project id already held by ANOTHER tenant is refused, whatever else is true.
  const holders = tenantHoldingProject(root, n.projectId) ?? [];
  if (holders.some((h) => h !== n.tenantId)) return refuseStore("PROJECT_BELONGS_TO_ANOTHER_TENANT", "$.projectId");

  // 🔴 An id names ONE submission. The same id with other bytes is a conflict; the same bytes again is a replay.
  const held = declarationIdHolder(root, n.declarationId);
  const current = currentDeclaration(root, n.tenantId, n.projectId);
  if (held) {
    if (held.tenantId !== n.tenantId || held.projectId !== n.projectId || held.bytes !== bytes) return refuseStore("DECLARATION_ID_CONFLICT", "$.declarationId");
    if (current?.record.declarationId === n.declarationId || currentPointer(root, n.tenantId, n.projectId)?.declarationId === n.declarationId) {
      return Object.freeze({ outcome: "REPLAY", stage: "STORE", refusals: Object.freeze([]), normalised: n, writes: [], transitions: [] });
    }
  }

  // 🔴 History is never overwritten. A project with a current declaration moves only by a submission that names it.
  if (current) {
    if (n.supersedes === null) return refuseStore("SUPERSESSION_REQUIRED", "$.supersedes");
    if (n.supersedes !== current.record.declarationId) return refuseStore("SUPERSEDES_NOT_CURRENT", "$.supersedes");
  } else if (n.supersedes !== null) {
    return refuseStore("SUPERSEDES_UNKNOWN_DECLARATION", "$.supersedes");
  }

  const pointer = serialise({ schemaVersion: 1, tenantId: n.tenantId, projectId: n.projectId, declarationId: n.declarationId, acceptedAt });
  /* 🔴 The ACCEPTED decision carries the sha256 of the exact bytes accepted — the store's tamper evidence, kept in the
   * hash-chained trail. Only ACCEPTED bytes are ever hashed: the secret firewall has already refused anything shaped
   * like a credential, so no secret can reach this hash. */
  const transitions = [t("SUBMITTED", "VALIDATED", n), { ...t("VALIDATED", "ACCEPTED", n), submissionSha256: createHash("sha256").update(bytes, "utf8").digest("hex") }];
  if (current) transitions.push(t("ACCEPTED", "SUPERSEDED", current.record, n.declarationId));
  return Object.freeze({
    outcome: "ACCEPT",
    stage: "STORE",
    refusals: Object.freeze([]),
    normalised: n,
    writes: [
      Object.freeze({ rel: submissionRel(n.tenantId, n.projectId, n.declarationId), bytes, action: "WRITE_PROJECT_DECLARATION" }),
      Object.freeze({ rel: currentRel(n.tenantId, n.projectId), bytes: pointer, action: "WRITE_PROJECT_DECLARATION_CURRENT_VIEW" }),
    ],
    transitions,
  });
}

function t(from, to, subject, supersededBy = null) {
  return Object.freeze({ from, to, declarationId: safeId(subject?.declarationId, /^decl_[0-9a-f]{32}$/), projectId: safeId(subject?.projectId, /^proj_[0-9a-f]{32}$/), tenantId: safeId(subject?.tenantId, /^tenant:[0-9a-f]{32}$/), supersededBy });
}
/** Only an identifier that passed its own pattern ever reaches an audit event; anything else is recorded as INVALID. */
const safeId = (v, re) => (typeof v === "string" && re.test(v) ? v : null);

/** The audit event for one declaration transition. Metadata only: states, codes and validated identifiers. */
export function decisionDraft({ transition, refusals = [], ctx, occurredAt }) {
  const scoped = transition.tenantId !== null && transition.tenantId !== undefined;
  const codes = [...new Set(refusals.map((r) => r.code))].join(",");
  return {
    eventType: "DECLARATION_DECISION",
    action: "DECLARATION_TRANSITION",
    outcome: transition.to === "REFUSED" ? "REFUSED" : "RECORDED",
    reasonCode: `DECLARATION_${transition.from}_TO_${transition.to}`,
    occurredAt,
    actor: ctx.actor,
    actorType: "ENGINE",
    scopeType: scoped ? "TENANT" : "GLOBAL_PRODUCT",
    tenantId: scoped ? transition.tenantId : null,
    subjectId: null,
    authorityRef: ctx.authorityRef,
    authorityHash: ctx.authorityHash,
    softwareVersion: ctx.softwareVersion,
    evidenceRefs: [],
    correlationId: ctx.correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: {
      family: "F01",
      from: transition.from,
      to: transition.to,
      declarationId: transition.declarationId ?? "INVALID",
      projectId: transition.projectId ?? "INVALID",
      supersededBy: transition.supersededBy ?? "",
      submissionSha256: transition.submissionSha256 ?? "",
      refusalCodes: codes.slice(0, 190),
    },
  };
}

/**
 * Record declaration decisions through the F08 audit store it is handed — exactly one event per transition, and
 * nothing for a transition that was not decided. 🔴 THE DURABLE LINE IS DERIVED, NOT DECLARED: each draft is kept
 * only when `isDurableDecision` (auditClassOf) says so, read from its own eventType — there is no list of callers.
 * This module holds no filesystem write primitive; the audit store is the only thing it can reach.
 */
export function recordDeclarationDecisions({ audit, drafts }) {
  return drafts.filter((d) => isDurableDecision(d)).map((d) => audit.store.append(d, { identity: decisionIdentity(d) }));
}

/** One event per transition per run: the identity is the run, the declaration and the movement. */
export const decisionIdentity = (draft) => ({
  eventType: draft.eventType, correlationId: draft.correlationId, declarationId: draft.metadata.declarationId, from: draft.metadata.from, to: draft.metadata.to,
});

/**
 * A correlation id for one intake run: the instant and a random nonce. 🔴 NOT a hash of the submission — a refused
 * document may carry a secret, and a secret is never hashed (standing owner ruling).
 */
export const intakeCorrelationId = (instant) => `intake:${instant}:${randomBytes(8).toString("hex")}`;
