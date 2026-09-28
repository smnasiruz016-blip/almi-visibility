/**
 * 🔴 D-WHOLE-STORE-ATTACHMENT CLOSED BY PROOF (command 65d05e2 §3.1, repairing E-PARTE-KIND-RULE) — ON THE REAL, NON-EMPTY STRUCTURE.
 *
 * The first repair (775046a) refused an evidence store attached whole BY KIND, which also refused lawful single-tenant stores. This
 * one follows F02's own crawl-batch precedent (D6–D8): the governed intake cannot attach such a store at all (PROVABLE_KINDS), and a
 * whole attachment made by hand is a FAULT only when the store's own members PROVE it shared (proveSharedCollection). Proved on the
 * REAL pinned rows and the REAL declarations; the only simulated thing is the hand edit the guard exists to catch. Counts only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { sharedStoreAttachmentFaults, SHARED_STORE_KINDS, PROVABLE_KINDS } from "../src/tenancy/attachment-declaration.mjs";
import { pinnedObservationRows, rowMembers, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = createTenantResolver();
const rows = pinnedObservationRows({ repo: REPO });
const all = rowMembers(rows, "obs").filter((m) => m.identities.length);
const tenantOf = (m) => { const a = real(m.identities[0]); return a?.state === "RESOLVED" ? a.tenantId : null; };
const byTenant = new Map();
for (const m of all) { const t = tenantOf(m); if (t) byTenant.set(t, [...(byTenant.get(t) ?? []), m]); }
const [T, mine] = [...byTenant].sort((a, b) => b[1].length - a[1].length)[0] ?? [null, []];
const WHOLE = { resourceKind: "EVIDENCE_STORE", resourceRef: "evidence-store", tenantId: T };
const withAttachment = (a) => ({ ...real.declarations, attachments: [...(real.declarations.attachments ?? []), a] });

test("W0 · the structure is REAL, NON-EMPTY and genuinely mixed — the population before the guard", () => {
  assert.ok(rows.length > 0 && all.length > 0, "the pinned observation holds no members — an empty population proves nothing");
  assert.ok(byTenant.size >= 2, `the real rows resolve to ${byTenant.size} tenant(s); a mixed-tenant refusal needs at least two`);
  assert.ok(mine.length > 0);
  assert.deepEqual(SHARED_STORE_KINDS, ["EVIDENCE_STORE"]);
});

test("W1 · MIXED-TENANT REFUSAL: a hand-made whole attachment of the real (mixed) store is a FAULT, by proof", () => {
  const f = sharedStoreAttachmentFaults({ declarations: withAttachment(WHOLE), resolve: real, membersOf: () => all });
  assert.deepEqual(f.map((x) => x.code), ["SHARED_STORE_ATTACHED_WHOLE"], "a proved-shared store attached whole to one tenant was not caught");
  assert.ok(f[0].partitions >= 2);
  assert.deepEqual(sharedStoreAttachmentFaults({ declarations: withAttachment(WHOLE), resolve: real, membersOf: () => null }).map((x) => x.code), ["SHARED_STORE_MEMBERS_UNPROVED"], "a store whose members cannot be read was cleared");
});

test("W2 · LAWFUL SAME-TENANT SUCCESS: a store whose real members are all ONE tenant's is not shared — and the partition route reads that tenant's rows only", () => {
  assert.deepEqual(sharedStoreAttachmentFaults({ declarations: withAttachment(WHOLE), resolve: real, membersOf: () => mine }), [], "a genuinely single-tenant store was refused — that is the E-PARTE-KIND-RULE defect again");
  const part = readTenantPartition({ decision: decidePartition(real, T), tenantId: T, resolve: real, rows });
  assert.ok(part.items.length > 0, "the lawful per-tenant route returned an empty partition");
  assert.ok(part.items.every((it) => tenantOf(rowMembers([rows[it.rowIndex]], "x")[0]) === T), "a partition item belongs to another tenant");
});

test("W3 · the CURRENT real declarations hold no proved-shared whole store attachment (the D8 condition) — and the governed intake cannot make one", () => {
  assert.deepEqual(sharedStoreAttachmentFaults({ declarations: real.declarations, resolve: real, membersOf: () => all }), []);
  assert.ok(!PROVABLE_KINDS.includes("EVIDENCE_STORE"), "the governed intake would accept an evidence store");
  const r = spawnSync(process.execPath, ["bin/declare-attachment.mjs", `--tenant=${T}`, "--kind=EVIDENCE_STORE", "--ref=evidence-store"], { cwd: REPO, encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "1" } });
  assert.notEqual(r.status, 0, "the intake accepted an evidence store");
  assert.match(r.stderr, /usage: node bin\/declare-attachment\.mjs/, "the intake refused for some other reason");
});
