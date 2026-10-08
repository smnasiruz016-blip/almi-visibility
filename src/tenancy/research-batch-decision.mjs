/**
 * 🔴 F02 · ACCEPTANCE AMENDMENT 2 — A RESEARCH BATCH LOCATED BY F31'S READER IS READ ONLY ON F02'S RECORDED DECISION
 * (_handoffs fb0613a, RR-225; approved by its hash 05e36910…, contract fe78ea0c…).
 *
 * Before F31's existing-page reader (src/crawl/newer-collections.mjs) reads a research batch for a tenant, F02 decides it:
 *   ALLOWED   the batch is attached to that tenant — F02's one decision over the RESEARCH_BATCH resource (decideForTenant: the
 *             run's requested tenant against the batch's declared one) — AND it is a member of a subject that resolves to that
 *             same tenant;
 *   REFUSED   otherwise, with its reason: NOT_ATTACHED_TO_THIS_TENANT · NOT_A_MEMBER_OF_THIS_TENANTS_SUBJECT.
 * Only an ALLOWED batch is read. Every decision — allowed or refused — is returned with a payload-free event naming the batch (its
 * reference's digest, as every scope event does: no batch name, tenant id, path or host), the tenant decision (classification:
 * F02's outcome for the batch) and the reason (reasonCode), for the run's own scope record; in a governed run that record is the
 * audit trail.
 *
 * Only batches this tenant's own declarations name are located — attached to it, or named by a subject one of whose members is
 * attached to it — so another tenant's own batch is never located, never read and never named in this tenant's record.
 */
import { decideForTenant } from "./scope.mjs";
import { RESOURCES } from "./scoped-run.mjs";

export const BATCH_DECISION = Object.freeze({
  ALLOWED: "ATTACHED_AND_A_MEMBER_OF_THIS_TENANTS_SUBJECT",
  NOT_ATTACHED: "NOT_ATTACHED_TO_THIS_TENANT",
  NOT_A_MEMBER: "NOT_A_MEMBER_OF_THIS_TENANTS_SUBJECT",
});
export const RULE = "F02 A2: a research batch F31's reader locates is read only when attached to the run's tenant and a member of its subject";

/**
 * @param resolve   the production resolver
 * @param tenantId  the run's decided tenant
 * @param batchId   a research batch this tenant's declarations name
 * @param named     the research batches named by subjects that resolve to this tenant
 */
export function decideResearchBatch({ resolve, tenantId, batchId, named }) {
  const tenant = decideForTenant(resolve, tenantId, RESOURCES.researchBatch(batchId));
  const attached = tenant.allowed === true;
  const member = named.has(batchId);
  const allowed = attached && member;
  const outcome = allowed ? BATCH_DECISION.ALLOWED : !attached ? BATCH_DECISION.NOT_ATTACHED : BATCH_DECISION.NOT_A_MEMBER;
  const metadata = { guard: "tenant-scope", classification: tenant.outcome, ruleEntry: RULE.slice(0, 120), role: `${tenant.source.scopeClass}>${tenant.target.scopeClass}`, resourceRef: tenant.target.resourceRefDigest };
  const event = allowed
    ? { eventType: "SCOPE_RESOLUTION", action: "RESOLVE_RESEARCH_BATCH", outcome: "ALLOWED", reasonCode: outcome, metadata }
    : { eventType: "REFUSAL", action: "REFUSE_RESEARCH_BATCH", outcome: "REFUSED", reasonCode: outcome, metadata };
  return Object.freeze({ batchId, allowed, outcome, tenantDecision: tenant.outcome, event: Object.freeze(event) });
}
