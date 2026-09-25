#!/usr/bin/env node
/**
 * 🔴 F02 · RETIRE AN UNLAWFUL WHOLE-COLLECTION ATTACHMENT (owner ruling `_handoffs` 1145012, Decision 2).
 *
 *   node bin/retire-attachment.mjs --kind=CRAWL_BATCH|SITEMAP_COLLECTION --ref=<collection id>            dry run
 *   node bin/retire-attachment.mjs --kind=CRAWL_BATCH|SITEMAP_COLLECTION --ref=<collection id> --confirm  write
 *
 * It removes the CURRENT authority of one declaration that attaches a SHARED collection whole to one tenant — and only
 * when that is PROVED from the collection's own members (src/tenancy/attachment-declaration.mjs proveSharedCollection):
 * members resolving to more than one tenant, or to none, make the collection shared. A single-tenant collection is
 * refused (SINGLE_TENANT_COLLECTION): a lawful attachment is never retired here.
 *
 * Nothing else changes: the collection's immutable records stay where they are; per-tenant partitions and both
 * quarantines are computed from them as before; the removed record stays in git history and in this run's F08 events.
 * Removing CURRENT AUTHORITY is not deleting AUDIT HISTORY.
 *
 * A governance act on the declaration source, not a tenant run: it joins nothing and reads only member identity fields.
 * Writes: in a dry run, the write gate's REFUSED decision; with --confirm, the declaration file and its F08 events.
 */
import { readFileSync } from "node:fs";
import { dirname } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedContext } from "../src/governance/governed-run.mjs";
import { stagedReplaceAdapter } from "../src/governance/durability-adapters.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { collectionMembers } from "../src/crawl/batch-partition.mjs";
import { proveSharedCollection, removeAttachment } from "../src/tenancy/attachment-declaration.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const kind = arg("kind");
const ref = arg("ref");
if (!["CRAWL_BATCH", "SITEMAP_COLLECTION"].includes(kind) || !ref || !/^[a-z0-9][a-z0-9-]*$/.test(ref)) {
  console.error("🔴 usage: node bin/retire-attachment.mjs --kind=CRAWL_BATCH|SITEMAP_COLLECTION --ref=<collection id> [--confirm]");
  process.exit(2);
}
const resolve = createTenantResolver();
const decl = resolve.declarations;
if (!decl.readable) { console.error(`🔴 REFUSED — the declaration source is not readable: ${decl.reason}`); process.exit(1); }

let members;
try { members = collectionMembers({ batchId: ref }).map(({ memberId, identities }) => ({ memberId, identities })); }
catch (e) { console.error(`🔴 REFUSED — the collection ${ref} could not be read (${e.fault ?? e.name}); an unreadable collection proves nothing`); process.exit(1); }
const proof = proveSharedCollection({ resolve, members });
if (!proof.shared) { console.error(`🔴 REFUSED — ${proof.code}: ${kind} ${ref} is not proved shared; a lawful attachment is never retired here`); process.exit(1); }
const a = proof.arithmetic;
console.log(`PROOF: ${kind} ${ref} is SHARED — ${a.population} member(s) = ${a.inPartitions} in ${proof.partitions} tenant partitions + ${a.undeclared} UNDECLARED + ${a.ambiguous} AMBIGUOUS · remainder ${a.remainder}`);

const { removed, text } = removeAttachment({ fileText: readFileSync(`${decl.dir}/attachments.json`, "utf8"), resourceKind: kind, resourceRef: ref });
const instant = isoSeconds(Date.now());
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const adapter = stagedReplaceAdapter({ repo: dirname(decl.dir), repoRelativeTarget: "tenancy/attachments.json", targetClass: "REPOSITORY_FILE", bytes: text });
const audit = governedContext({ repo: REPO, env: process.env, correlationId: `run:retire-attachment:${instant}`, now: instant.slice(0, 10) });
const out = executeGovernedWrite({
  permission, audit, adapter,
  action: { name: "RETIRE_UNLAWFUL_WHOLE_COLLECTION_ATTACHMENT", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null, occurredAt: instant, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs: [] },
});
console.log(`${out.outcome} — ${permission.mayWrite ? `the ${kind} ${ref} attachment (declared ${removed.declaredOn}) no longer holds current authority` : "dry run: nothing written"}`);
process.exit(out.outcome === "COMMITTED" || (out.outcome === "REFUSED" && !permission.mayWrite) ? 0 : 1);
