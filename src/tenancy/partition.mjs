/**
 * 🔴 F02 · THE ONE PARTITION MECHANISM — a shared collection is split by its MEMBERS' own declared scopes. It is never
 * attached whole to one tenant: the owner's resource-attachment ruling (24 Sep 2026) lists "treating a shared
 * collection as one tenant's resource" among the things that are NOT ALLOWED, and "every member of a collection
 * independently resolves through current declarations to the same tenant" as a structural proof that IS.
 *
 * A MEMBER is { memberId, identities: [{ resourceKind, resourceRef }], provenance? } — its identities are fields the
 * member itself stores (a page's canonical URL, an observation's requested and final URL), read before any protected
 * payload. Each identity is answered by the production resolver alone; this module never compares two tenant ids.
 *
 *   exactly one declared tenant            → that tenant's partition
 *   no declared tenant                     → UNDECLARED quarantine (an identity nobody declared makes no competing claim)
 *   more than one, or a conflicting,
 *   invalid or unanswerable attachment     → AMBIGUOUS quarantine
 *
 * The declaration source unreadable → the whole partition REFUSES (throws): nothing is partitioned by default.
 * A member is never duplicated across partitions and never discarded: every member lands in exactly one place, and the
 * arithmetic is returned with its remainder — population = Σ tenant partitions + UNDECLARED + AMBIGUOUS.
 *
 * Product-neutral: it knows no collection, host or tenant. A collection supplies its members (src/crawl/observation-
 * batch.mjs does for the observation batch and the sitemap collection).
 */
import { createHash } from "node:crypto";

export const QUARANTINE = Object.freeze({ UNDECLARED: "UNDECLARED", AMBIGUOUS: "AMBIGUOUS" });

export class PartitionRefused extends Error {
  constructor(code, detail) { super(`${code}: ${detail}`); this.name = "PartitionRefused"; this.code = code; }
}

const digest = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/** Decide ONE member: the tenant its identities resolve to, or the quarantine it belongs in, with the reason. */
export function classifyMember(resolve, member) {
  const answers = (member.identities ?? []).map((id) => resolve({ resourceKind: id.resourceKind, resourceRef: id.resourceRef }));
  if (answers.some((a) => a?.state === "UNKNOWN")) throw new PartitionRefused("DECLARATION_SOURCE_NOT_READ", "a member's scope could not be answered — nothing is partitioned by default");
  if (answers.some((a) => a?.state === "AMBIGUOUS" || a?.state === "INVALID")) return { place: QUARANTINE.AMBIGUOUS, reason: "MEMBER_IDENTITY_ATTACHMENT_CONFLICT" };
  const tenants = new Set();
  for (const a of answers) if (a?.state === "RESOLVED") tenants.add(a.tenantId);
  if (tenants.size === 0) return { place: QUARANTINE.UNDECLARED, reason: (member.identities ?? []).length ? "NO_IDENTITY_DECLARED" : "MEMBER_CARRIES_NO_IDENTITY" };
  if (tenants.size > 1) return { place: QUARANTINE.AMBIGUOUS, reason: "MEMBER_IDENTITIES_DECLARED_TO_DIFFERENT_TENANTS" };
  return { place: "TENANT", tenantId: [...tenants][0], reason: "EVERY_DECLARED_IDENTITY_RESOLVES_TO_ONE_TENANT" };
}

/**
 * Partition a collection's members. Returns the partitions (tenant id → member ids), both quarantines (member ids with
 * reasons), and the arithmetic. It carries member ids and tenant ids for the CALLER; the F08 event below carries neither.
 */
export function partitionMembers({ members, resolve }) {
  if (!Array.isArray(members)) throw new TypeError("a partition needs the collection's members");
  if (typeof resolve !== "function" || !resolve.declarations?.readable) throw new PartitionRefused("DECLARATION_SOURCE_NOT_READ", "the declaration source is not readable — nothing is partitioned by default");
  const seen = new Set();
  const partitions = new Map();
  const quarantine = { [QUARANTINE.UNDECLARED]: [], [QUARANTINE.AMBIGUOUS]: [] };
  for (const m of members) {
    if (typeof m?.memberId !== "string" || m.memberId === "") throw new PartitionRefused("MEMBER_ID_ABSENT", "every member keeps its immutable id");
    if (seen.has(m.memberId)) throw new PartitionRefused("MEMBER_DUPLICATED", `member ${digest(m.memberId)} occurs twice — a member is never counted in two places`);
    seen.add(m.memberId);
    const c = classifyMember(resolve, m);
    if (c.place === "TENANT") {
      if (!partitions.has(c.tenantId)) partitions.set(c.tenantId, []);
      partitions.get(c.tenantId).push(m.memberId);
    } else quarantine[c.place].push({ memberId: m.memberId, reason: c.reason });
  }
  const inPartitions = [...partitions.values()].reduce((n, ids) => n + ids.length, 0);
  const arithmetic = {
    population: members.length,
    partitions: partitions.size,
    inPartitions,
    undeclared: quarantine.UNDECLARED.length,
    ambiguous: quarantine.AMBIGUOUS.length,
  };
  arithmetic.remainder = arithmetic.population - arithmetic.inPartitions - arithmetic.undeclared - arithmetic.ambiguous;
  return Object.freeze({ partitions, quarantine, arithmetic });
}

/**
 * The F08 guard-sink decision for a partition's quarantine — counts and digests only: no member id, no tenant id, no
 * URL, no payload. A partition with nothing quarantined decides no refusal and emits nothing.
 */
export function partitionRefusalEvent(p, { collectionKind, collectionRef }) {
  const q = p.arithmetic.undeclared + p.arithmetic.ambiguous;
  if (q === 0) return null;
  return {
    eventType: "REFUSAL",
    action: "QUARANTINE_UNPARTITIONED_MEMBERS",
    outcome: "REFUSED",
    reasonCode: p.arithmetic.ambiguous ? "AMBIGUOUS_REFUSED" : "UNDECLARED_REFUSED",
    metadata: {
      guard: "tenant-partition",
      classification: `population=${p.arithmetic.population} partitioned=${p.arithmetic.inPartitions} undeclared=${p.arithmetic.undeclared} ambiguous=${p.arithmetic.ambiguous}`,
      ruleEntry: "one member, one declared tenant, or quarantine",
      role: `${collectionKind}>TENANT_PARTITION`,
      resourceRef: digest(`${collectionKind}:${collectionRef}`),
    },
  };
}
