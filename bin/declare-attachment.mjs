#!/usr/bin/env node
/**
 * 🔴 F02 · DECLARE ONE STRUCTURALLY PROVED ATTACHMENT (owner ruling, 24 Sep 2026 — resource attachments).
 *
 *   node bin/declare-attachment.mjs --tenant=<declared tenant> --kind=CAPTURE_SET --ref=<capture id>            dry run
 *   node bin/declare-attachment.mjs --tenant=<declared tenant> --kind=CAPTURE_SET --ref=<capture id> --confirm  write
 *
 * The PROOF is the gate: every member identity the collection itself recorded is decided against the requested tenant by
 * the one decision (src/tenancy/scope.mjs) BEFORE anything is written; one member that does not resolve to that tenant
 * refuses the run (exit 3). Then rule 3 is checked in full (src/tenancy/attachment-declaration.mjs): exactly one tenant,
 * nothing quarantined. A duplicate or a reassignment is refused. The write goes through the governed boundary (F08) into
 * the declaration source's own tenancy/attachments.json, one record appended, every existing record untouched.
 *
 * Writes: in a dry run, the write gate's REFUSED decision (governed runs record it); with --confirm, the attachments file
 * and its F08 events. Nothing else.
 */
import { readFileSync } from "node:fs";
import { dirname } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedContext } from "../src/governance/governed-run.mjs";
import { stagedReplaceAdapter } from "../src/governance/durability-adapters.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { PROVABLE_KINDS, captureSetMembers, proveByMembers, attachmentConflict, appendAttachment, attachmentRecord } from "../src/tenancy/attachment-declaration.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const kind = arg("kind");
const ref = arg("ref");
if (!PROVABLE_KINDS.includes(kind) || !ref || !/^[a-z0-9][a-z0-9-]*$/.test(ref)) {
  console.error(`🔴 usage: node bin/declare-attachment.mjs --tenant=<declared tenant> --kind=${PROVABLE_KINDS.join("|")} --ref=<id> [--confirm]`);
  process.exit(2);
}

/* The members' recorded identities — the thing the gate decides about (read before it, identity fields only). */
const decl = readDeclarations();
if (!decl.readable) { console.error(`🔴 REFUSED — the declaration source is not readable: ${decl.reason}`); process.exit(1); }
const ROOT = dirname(decl.dir);
const members = captureSetMembers({ root: ROOT, captureId: ref });
if (!members || members.length === 0) { console.error(`🔴 REFUSED — NO_MEMBERS: ${kind} ${ref} records no member in the declaration source's root`); process.exit(1); }
const origins = [...new Set(members.flatMap((m) => m.identities.map((i) => i.resourceRef)))];
if (origins.length === 0) { console.error("🔴 REFUSED — PROOF_NOT_UNIQUE: no member records an identity"); process.exit(1); }

/* 🔴 THE PROOF IS THE GATE: each member identity against the requested tenant, by the one decision. */
const SCOPE = scopedEntryPoint({ entry: "bin/declare-attachment.mjs", governed: true, resources: origins.map((o) => RESOURCES.siteOrigin(o)) });
const proof = proveByMembers({ resolve: createTenantResolver(), members, requestedTenantId: SCOPE.tenantId });
if (!proof.proved) { console.error(`🔴 REFUSED — ${proof.code} · ${JSON.stringify(proof.arithmetic ?? {})}`); process.exit(1); }
const conflict = attachmentConflict({ declarations: decl, resourceKind: kind, resourceRef: ref, tenantId: SCOPE.tenantId });
if (conflict) { console.error(`🔴 REFUSED — ${conflict}: ${kind} ${ref} — no duplicate, no reassignment`); process.exit(1); }

const instant = isoSeconds(Date.now());
const record = attachmentRecord({ resourceKind: kind, resourceRef: ref, tenantId: SCOPE.tenantId, declaredOn: instant.slice(0, 10), proof });
const target = "tenancy/attachments.json";
const bytes = appendAttachment({ fileText: readFileSync(`${decl.dir}/attachments.json`, "utf8"), record });
console.log(`PROOF: rule ${proof.rule} — ${proof.arithmetic.population} member(s) · ${proof.arithmetic.partitions} tenant · ${proof.arithmetic.undeclared + proof.arithmetic.ambiguous} quarantined · requested tenant matches (exact ${kind} ${ref})`);

const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const adapter = stagedReplaceAdapter({ repo: ROOT, repoRelativeTarget: target, targetClass: "REPOSITORY_FILE", bytes });
const audit = governedContext({ repo: REPO, env: process.env, correlationId: `run:declare-attachment:${instant}`, now: instant.slice(0, 10) });
const out = executeGovernedWrite({
  permission, audit, adapter,
  action: { name: "DECLARE_STRUCTURAL_ATTACHMENT", ...SCOPE.writeScope, subjectId: null, occurredAt: instant, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs: [] },
});
console.log(`${out.outcome} — ${permission.mayWrite ? `${target} in the declaration source` : "dry run: nothing written"}`);
process.exit(out.outcome === "COMMITTED" || out.outcome === "REFUSED" && !permission.mayWrite ? 0 : 1);
