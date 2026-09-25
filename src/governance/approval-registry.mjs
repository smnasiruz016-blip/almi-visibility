/**
 * 🔴 F04 · THE APPROVAL REGISTRY — proposal, verification, approval and execution are FOUR different things, and only the
 * third is recorded here.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md (b439309) — clarifications 3, 4, 10, 11, 13, 17.
 *
 * A record here is an APPROVAL a declared HUMAN gave, transcribed by whoever records it. Transcription is not approval: the
 * recorder is named separately (`recordedBy`) and is never the approver. An approval is valid only when it points at the
 * governance record the human issued — a CURRENT proposition in the authority corpus whose issuer is the OWNER, whose
 * source blob equals the approval's evidence blob. So a record cannot be conjured from a git author, a chat speaker or an
 * environment user (clarification 4): without an owner-issued governing record it does not validate.
 *
 * THE HISTORY IS IMMUTABLE. config/governance/approvals.jsonl only ever grows by one of three events — ISSUED, REVOKED,
 * CONSUMED — each through the governed boundary (src/governance/governed-write.mjs). The current state is COMPUTED
 * (src/governance/authorisation.mjs readApprovals). Nothing edits a past line.
 *
 * WHAT A RECORD CARRIES (clarification 10): approver identity (a declared actor reference, never a name or an address) ·
 * the approver's actor class · the executor's reference and class · action · resource and scope · decision · issued time ·
 * expiry and one-use rule · evidence reference · governing authority · revocation state (derived). NEVER: a credential, a
 * protected payload, a person's name, an email address, a tenant's protected datum (clarification 11, L5).
 */
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { ACTORS } from "../../config/governance/authorisation.mjs";
import { actionEntry } from "./authorisation.mjs";

export const APPROVAL_EVENTS = Object.freeze(["ISSUED", "REVOKED", "CONSUMED"]);
export const APPROVAL_DECISIONS = Object.freeze(["APPROVED"]);
const REQUIRED = Object.freeze(["approvalId", "approverRef", "approverClass", "executorRef", "executorClass", "action", "resource", "scope", "decision", "issuedAt", "expiresAt", "oneUse", "evidenceRef", "governingAuthority"]);
/* Keys a record may hold. Anything else — a value, a body, a name — is refused. */
const ALLOWED_KEYS = new Set([...REQUIRED, "conditions"]);
const SECRETISH = /(password|secret|token|api[_-]?key|bearer|@[a-z0-9-]+\.[a-z]|https?:\/\/)/i;

/**
 * Validate one approval record for ISSUE. Returns a list of fault codes; empty means it may be recorded.
 * Pure over its inputs: the actors, the corpus and `now` are handed in (defaults: the declared ones).
 */
export function approvalFaults(record, { actors = ACTORS, corpus = AUTHORITY_CORPUS, now } = {}) {
  const faults = [];
  if (record === null || typeof record !== "object" || Array.isArray(record)) return ["NOT_A_RECORD"];
  for (const k of REQUIRED) if (!(k in record)) faults.push(`MISSING_${k.toUpperCase()}`);
  for (const k of Object.keys(record)) if (!ALLOWED_KEYS.has(k)) faults.push(`UNDECLARED_KEY_${k.toUpperCase()}`);
  if (SECRETISH.test(JSON.stringify(record))) faults.push("CARRIES_A_CREDENTIAL_ADDRESS_OR_URL_SHAPE");
  if (faults.length) return faults;

  if (!/^approval:[a-z0-9][a-z0-9-]*$/.test(record.approvalId)) faults.push("APPROVAL_ID_MALFORMED");
  const approver = actors.find((a) => a.actorRef === record.approverRef);
  const executor = actors.find((a) => a.actorRef === record.executorRef);
  if (!approver) faults.push("APPROVER_UNDECLARED");
  else if (approver.actorClass !== "HUMAN" || record.approverClass !== "HUMAN") faults.push("APPROVER_NOT_HUMAN");
  if (!executor) faults.push("EXECUTOR_UNDECLARED");
  else if (record.executorClass !== executor.actorClass) faults.push("EXECUTOR_CLASS_MISSTATED");
  if (record.approverRef === record.executorRef) faults.push("SELF_APPROVAL");
  const entry = actionEntry(record.action);
  if (!entry) faults.push("ACTION_UNSUPPORTED");
  else if (record.resource?.resourceClass !== entry.resourceClass) faults.push("RESOURCE_CLASS_MISMATCH");
  if (typeof record.resource?.resourceRef !== "string" || record.resource.resourceRef === "") faults.push("RESOURCE_UNNAMED");
  if (!["TENANT", "GLOBAL_PRODUCT"].includes(record.scope?.scopeType)) faults.push("SCOPE_UNDECLARED");
  if (!APPROVAL_DECISIONS.includes(record.decision)) faults.push("DECISION_UNDECLARED");
  if (record.oneUse !== true && !record.expiresAt) faults.push("NEITHER_EXPIRY_NOR_ONE_USE");
  if (record.expiresAt && !(record.expiresAt > record.issuedAt)) faults.push("EXPIRES_BEFORE_ISSUE");
  if (now && record.expiresAt && record.expiresAt <= now) faults.push("ALREADY_EXPIRED");
  faults.push(...governanceFaults(record, { corpus, now }));
  return faults;
}

/** The approval's governing authority must resolve CURRENT, be OWNER-issued, and be the very record its evidence names. */
export function governanceFaults(record, { corpus = AUTHORITY_CORPUS, now } = {}) {
  const g = record.governingAuthority;
  const ev = record.evidenceRef;
  if (!g?.propositionId || !Array.isArray(g.scope)) return ["GOVERNING_AUTHORITY_UNNAMED"];
  if (!ev?.repo || !ev?.path || !ev?.blob) return ["EVIDENCE_REFERENCE_INCOMPLETE"];
  const res = resolveAuthority({ records: corpus, propositionId: g.propositionId, scope: [...g.scope], now: (now ?? record.issuedAt).slice(0, 10) });
  if (!permits(res)) return [`GOVERNING_AUTHORITY_${res.outcome}`];
  /* The resolution names the record(s) that govern (authorityIds) and their sources (sourceRefs): every governing record
   * must be OWNER-issued, and the approval's evidence must be one of those very sources, blob for blob. */
  const governing = (res.authority.authorityIds ?? []).map((id) => corpus.find((r) => r.authorityId === id));
  const faults = [];
  if (governing.length === 0 || governing.some((r) => r?.issuer?.class !== "OWNER")) faults.push("GOVERNING_AUTHORITY_NOT_OWNER_ISSUED");
  if (!(res.authority.sourceRefs ?? []).some((s) => s?.repo === ev.repo && s?.path === ev.path && s?.blob === ev.blob)) faults.push("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD");
  return faults;
}

/** The three history events — each a new line, never an edit. */
export const issuedEvent = (approval, { recordedBy, recordedAt }) => ({ event: "ISSUED", recordedBy, recordedAt, approval });
export const revokedEvent = (approvalId, { recordedBy, recordedAt, reasonCode }) => ({ event: "REVOKED", approvalId, recordedBy, recordedAt, reasonCode });
export const consumedEvent = (approvalId, { recordedBy, recordedAt, executionRef }) => ({ event: "CONSUMED", approvalId, recordedBy, recordedAt, executionRef });
