/**
 * 🔴 F02 · A STRUCTURALLY PROVED ATTACHMENT — the only way a new resource is attached to a tenant (owner ruling
 * `_handoffs` AlmiVisibility_OWNER_RULING_2026-09-24_F02_RESOURCE_ATTACHMENTS.md).
 *
 * The ruling allows an attachment only on an existing structural relationship that proves it UNIQUELY. The one proof this
 * module can carry today is rule 3: "every member of a collection independently resolves through current declarations to
 * the same tenant". The members' identities are fields the collection itself stores (a captured page's recorded URL and
 * origin); each is answered by the production resolver (src/tenancy/partition.mjs), never by a name, a filename, a host
 * alone, content, or the tenant a caller asked for. A caller's --tenant is only the REQUEST the proof must match.
 *
 * Refused, each by name:
 *   PROOF_NOT_UNIQUE        the members resolve to no tenant, to several, or some are quarantined — a shared collection is
 *                           never one tenant's resource; a partial majority is not a proof
 *   PROOF_NAMES_ANOTHER_TENANT  the members resolve uniquely, but to a tenant other than the one requested
 *   ALREADY_DECLARED        the exact (kind, ref) is already attached to that tenant — no duplicate
 *   CONFLICTING_ATTACHMENT  the exact (kind, ref) is attached to ANOTHER tenant — no silent reassignment
 *   NO_MEMBERS              an empty collection proves nothing
 *
 * Pure except `captureSetMembers`, which reads ONLY a capture manifest's recorded page identities (never a page body).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { partitionMembers } from "./partition.mjs";
import { decideResolvedTenants } from "./scope.mjs";

export const RULING_REF = "_handoffs:AlmiVisibility_OWNER_RULING_2026-09-24_F02_RESOURCE_ATTACHMENTS.md";
export const PROVABLE_KINDS = Object.freeze(["CAPTURE_SET"]);

const originOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin : null; } catch { return null; } };

/** A capture set's members: each captured page, identified by the URL and origin its manifest RECORDED — not its filename. */
export function captureSetMembers({ root, captureId }) {
  const path = join(root, "captures", captureId, "manifest.json");
  if (!existsSync(path)) return null;
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest?.captureId !== captureId || !Array.isArray(manifest.pages)) return null;
  return manifest.pages.map((p, i) => ({
    memberId: `page:${i}:${createHash("sha256").update(String(p?.url ?? "")).digest("hex").slice(0, 12)}`,
    identities: [...new Set([p?.url, p?.origin].map(originOf).filter(Boolean))].map((o) => ({ resourceKind: "SITE_ORIGIN", resourceRef: o })),
  }));
}

/** Rule 3: the members resolve to exactly ONE tenant with nothing quarantined — and it is the requested one. */
export function proveByMembers({ resolve, members, requestedTenantId }) {
  if (!Array.isArray(members) || members.length === 0) return { proved: false, code: "NO_MEMBERS" };
  const p = partitionMembers({ members, resolve });
  const tenants = [...p.partitions.keys()];
  if (tenants.length !== 1 || p.arithmetic.undeclared || p.arithmetic.ambiguous) return { proved: false, code: "PROOF_NOT_UNIQUE", arithmetic: p.arithmetic };
  if (!decideResolvedTenants(requestedTenantId, tenants[0]).allowed) return { proved: false, code: "PROOF_NAMES_ANOTHER_TENANT", arithmetic: p.arithmetic };
  return { proved: true, rule: 3, tenantId: tenants[0], arithmetic: p.arithmetic };
}

/** Duplicate and reassignment checks against the CURRENT declarations. */
export function attachmentConflict({ declarations, resourceKind, resourceRef, tenantId }) {
  const held = (declarations?.attachments ?? []).filter((a) => a?.resourceKind === resourceKind && a?.resourceRef === resourceRef);
  if (held.some((a) => decideResolvedTenants(tenantId, a.tenantId).allowed)) return "ALREADY_DECLARED";
  if (held.length) return "CONFLICTING_ATTACHMENT";
  return null;
}

/** The attachments file with ONE record appended — every existing record byte-identical, the file's own layout kept. */
export function appendAttachment({ fileText, record }) {
  const doc = JSON.parse(fileText);
  if (!Array.isArray(doc.attachments)) throw new TypeError("the declaration file holds no attachments array");
  if (fileText !== `${JSON.stringify(doc, null, 2)}\n`) throw new TypeError("the declaration file is not in its canonical layout — refusing to rewrite it");
  return `${JSON.stringify({ ...doc, attachments: [...doc.attachments, record] }, null, 2)}\n`;
}

/**
 * 🔴 RETIRING AN UNLAWFUL WHOLE-COLLECTION ATTACHMENT (owner ruling 25 Sep 2026, Decision 2). A collection whose members
 * resolve to more than one tenant, or whose members include any that resolve to none or several, is SHARED — attaching it
 * whole to one tenant is the ruling's NOT-ALLOWED case. Proved from the members' own recorded identities, never assumed.
 */
/**
 * 🔴 D-WHOLE-STORE-ATTACHMENT (28 Sep 2026; F02's crawl-batch precedent, D6–D8). A store whose content can span tenants — the
 * evidence store — is never attachable through the governed intake (PROVABLE_KINDS holds only CAPTURE_SET), so the only way it
 * could be attached WHOLE to one tenant is a hand edit of the declaration source. This guard is that edit's check: for every
 * whole attachment of such a store in the given declarations, the store's OWN member identities are proved by
 * proveSharedCollection — shared ⇒ a fault naming the attachment. A store whose members are all one tenant's is NOT shared, and
 * its attachment is lawful: the verdict is by PROOF, never by kind. `membersOf(attachment)` returns that store's members
 * ({ memberId, identities }), or null when they cannot be read — which is itself a fault (an unproved store is not cleared).
 */
export const SHARED_STORE_KINDS = Object.freeze(["EVIDENCE_STORE"]);
export function sharedStoreAttachmentFaults({ declarations, resolve, membersOf }) {
  const faults = [];
  for (const a of (declarations?.attachments ?? []).filter((x) => SHARED_STORE_KINDS.includes(x?.resourceKind))) {
    const members = membersOf(a);
    if (!Array.isArray(members) || members.length === 0) { faults.push({ code: "SHARED_STORE_MEMBERS_UNPROVED", resourceKind: a.resourceKind, resourceRef: a.resourceRef }); continue; }
    const p = proveSharedCollection({ resolve, members });
    if (p.shared) faults.push({ code: "SHARED_STORE_ATTACHED_WHOLE", resourceKind: a.resourceKind, resourceRef: a.resourceRef, partitions: p.partitions, arithmetic: p.arithmetic });
  }
  return faults;
}

export function proveSharedCollection({ resolve, members }) {
  if (!Array.isArray(members) || members.length === 0) return { shared: false, code: "NO_MEMBERS" };
  const p = partitionMembers({ members, resolve });
  const shared = p.partitions.size > 1 || p.arithmetic.undeclared > 0 || p.arithmetic.ambiguous > 0;
  return { shared, code: shared ? "MEMBERS_SPAN_MORE_THAN_ONE_SCOPE" : "SINGLE_TENANT_COLLECTION", arithmetic: p.arithmetic, partitions: p.partitions.size };
}

/**
 * The declaration file with EXACTLY ONE (kind, ref) record removed — current authority withdrawn, every other record
 * byte-identical, the file's own layout kept. The removed record stays in git history and in the F08 event that removed it.
 */
export function removeAttachment({ fileText, resourceKind, resourceRef }) {
  const doc = JSON.parse(fileText);
  if (!Array.isArray(doc.attachments)) throw new TypeError("the declaration file holds no attachments array");
  if (fileText !== `${JSON.stringify(doc, null, 2)}\n`) throw new TypeError("the declaration file is not in its canonical layout — refusing to rewrite it");
  const hits = doc.attachments.filter((a) => a?.resourceKind === resourceKind && a?.resourceRef === resourceRef);
  if (hits.length !== 1) throw new TypeError(`expected exactly one ${resourceKind} ${resourceRef} attachment, found ${hits.length}`);
  return { removed: hits[0], text: `${JSON.stringify({ ...doc, attachments: doc.attachments.filter((a) => a !== hits[0]) }, null, 2)}\n` };
}

export function attachmentRecord({ resourceKind, resourceRef, tenantId, declaredOn, proof }) {
  return {
    schemaVersion: 1, resourceKind, resourceRef, tenantId, declaredOn,
    declarationBasis: "STRUCTURAL_PROOF",
    structuralProof: { rule: proof.rule, ruling: RULING_REF, members: proof.arithmetic.population, resolvedTenants: proof.arithmetic.partitions, quarantined: proof.arithmetic.undeclared + proof.arithmetic.ambiguous },
  };
}
