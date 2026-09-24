/**
 * 🔴 F01 §4 / §11 A · THE EXISTING DECLARATIONS, READ THROUGH THE CONTRACT — LOSSLESSLY, AND NOTHING FABRICATED.
 *
 * Before F01, the only declarations of a tenant and its public properties are the tenancy registry's: one record per
 * declared isolation scope (tenants.json) and one per resource attached to it (attachments.json), read by the
 * production resolver (src/tenancy/resolver.mjs). This module turns each declared tenant into the project-declaration
 * CANDIDATE those records actually support, and hands it to the same validator a new submission meets.
 *
 * WHAT MAPS, BECAUSE IT IS DECLARED THERE:
 *   tenantId      the tenant's own declared id
 *   displayName   the tenant's own declared label (owner wording, kept verbatim)
 *   properties    each SITE_ORIGIN attachment, as { kind: "WEB_ORIGIN", origin } — its origin normalised by structure
 * WHAT DOES NOT, AND STAYS VISIBLY ABSENT:
 *   declarationId · projectId · submittedBy · submittedAt · environments · goals · permissions · constraints ·
 *   connectors · each property's id, environment and authority. The registry declares none of them, and none may be
 *   derived: an id from a label is an id from a name, a time from a date is a time nobody recorded, and an environment
 *   or a permission from a hostname is exactly what F01 forbids.
 * Attachments of other kinds (fact registries, crawl batches, sitemap collections) are resource attachments, not
 * public properties; they are counted and excluded by their declared kind — never dropped silently.
 *
 * So a legacy candidate is expected to be REFUSED by the contract, with every absent field named. That is the
 * contract working on real input, not a defect to paper over.
 */
import { validateDeclaration, TOP_LEVEL_FIELDS } from "./contract.mjs";
import { normaliseOrigin } from "./origin.mjs";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";

export const PROPERTY_RESOURCE_KIND = "SITE_ORIGIN";

/**
 * Every declared tenant as a contract candidate, with the arithmetic that accounts for every registry record.
 * `declarations` is what the production resolver read: { readable, tenants, attachments }.
 */
export function legacyTenancyCandidates(declarations) {
  if (!declarations?.readable) return Object.freeze({ readable: false, reason: declarations?.reason ?? "UNREADABLE", candidates: [], attachments: null });
  const active = declarations.tenants.filter((t) => t?.status === "ACTIVE" && TENANT_ID_PATTERN.test(String(t?.tenantId)));
  const activeIds = active.map((t) => t.tenantId);
  const byKind = {};
  const orphanAttachments = [];
  const candidates = active.map((t) => {
    const attached = declarations.attachments.filter((a) => a?.tenantId === t.tenantId);
    const sites = attached.filter((a) => a.resourceKind === PROPERTY_RESOURCE_KIND);
    const candidate = { tenantId: t.tenantId, displayName: t.label, properties: sites.map((a) => ({ kind: "WEB_ORIGIN", origin: a.resourceRef })) };
    const v = validateDeclaration(candidate, { tenants: activeIds });
    return Object.freeze({
      tenantId: t.tenantId,
      fieldsPresent: Object.keys(candidate),
      fieldsAbsent: TOP_LEVEL_FIELDS.filter((f) => !Object.hasOwn(candidate, f)),
      properties: sites.map((a) => ({ origin: normaliseOrigin(a.resourceRef) })),
      excludedAttachments: attached.filter((a) => a.resourceKind !== PROPERTY_RESOURCE_KIND).map((a) => a.resourceKind),
      outcome: v.ok ? "ADAPTED" : "REFUSED",
      refusalCodes: [...new Set(v.refusals.map((r) => r.code))].sort(),
    });
  });
  for (const a of declarations.attachments) {
    byKind[a?.resourceKind] = (byKind[a?.resourceKind] ?? 0) + 1;
    if (!activeIds.includes(a?.tenantId)) orphanAttachments.push(a?.resourceKind);
  }
  return Object.freeze({
    readable: true,
    tenantRecords: declarations.tenants.length,
    activeTenants: active.length,
    inactiveOrInvalidTenants: declarations.tenants.length - active.length,
    attachmentRecords: declarations.attachments.length,
    attachmentsByKind: byKind,
    attachmentsNamingNoActiveTenant: orphanAttachments.length,
    candidates,
  });
}
