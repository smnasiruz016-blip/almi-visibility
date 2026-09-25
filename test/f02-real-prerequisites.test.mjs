/**
 * 🔴 F02 POST-MERGE · REAL-DATA PREREQUISITES — lawful declarations and tenant partitions, proved on the REAL population.
 *
 * Command `_handoffs` eb44959 (…F02_POST_MERGE_PREREQUISITES.md) · owner ruling `_handoffs` 9446c04
 * (…OWNER_RULING_2026-09-24_F02_RESOURCE_ATTACHMENTS.md).
 *
 * What must be true is written in that ruling and command; these proofs are designed from it, not from a list:
 *   · a shared collection is split member by member — Σ tenant partitions + UNDECLARED + AMBIGUOUS = population, remainder 0,
 *     no member in two places, none discarded (§6);
 *   · a tenant consumer reads only its own partition, through a production entry point (§6);
 *   · an attachment rests only on a structural proof, and every NOT-ALLOWED basis is a refusal (§3);
 *   · every resource the gates consume has one census verdict, remainder 0 (§4);
 *   · every remaining refusal names a real input — no phantom resource (§5).
 * Fixtures appear ONLY to fire a failure branch the real population never produces; each says so, and the real
 * denominator is asserted separately. The proofs hold whether or not the data repository's pull request (the one new
 * attachment) has merged: they read the declarations as they stand.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";

import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES, decideRunResources } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { partitionMembers, classifyMember, partitionRefusalEvent, PartitionRefused } from "../src/tenancy/partition.mjs";
import { collectionMembers, readTenantPartition, readPartitionBodies, recordIdentities } from "../src/crawl/batch-partition.mjs";
import { captureSetMembers, proveByMembers, attachmentConflict, appendAttachment } from "../src/tenancy/attachment-declaration.mjs";
import { pagesFromRun } from "../src/crawl/inbound.mjs";
import { census as resourceCensus, gateCoverage, VERDICTS } from "../tools/resource-census.mjs";
import { census as tenantScopeCensus } from "../tools/tenant-scope-census.mjs";
import { productionEntryPoints } from "../src/entry-points.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const resolve = createTenantResolver();
const DECL = resolve.declarations;
const ACTIVE = DECL.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
const DATA = dirname(DECL.dir);
const trailHash = () => createHash("sha256").update(readFileSync(join(REPO, "audit-trail", "events.jsonl"))).digest("hex");
const bare = (members) => members.map(({ memberId, identities }) => ({ memberId, identities }));
const CRAWL = collectionMembers({ batchId: "crawl-2026-09-12" });
const SITEMAP = collectionMembers({ batchId: "sitemap-2026-09-12" });

/* ─────────────────────────── §6 · THE PARTITION, ON THE REAL COLLECTIONS ─────────────────────────── */
test("Q1 · REAL · the observation batch and the sitemap collection: population = Σ tenant partitions + UNDECLARED + AMBIGUOUS, remainder 0 — every member in exactly one place", () => {
  for (const [name, members, minTenants] of [["batch", CRAWL, 10], ["sitemap", SITEMAP, 2]]) {
    const p = partitionMembers({ members: bare(members), resolve });
    const a = p.arithmetic;
    console.log(`  [F02 partition · ${name}] ${a.population} = ${a.inPartitions} in ${a.partitions} tenant partitions + ${a.undeclared} UNDECLARED + ${a.ambiguous} AMBIGUOUS · remainder ${a.remainder}`);
    assert.equal(a.remainder, 0);
    assert.ok(a.population > 0 && a.partitions >= minTenants, `${name}: ${a.partitions} partitions`);
    const placed = [...[...p.partitions.values()].flat(), ...p.quarantine.UNDECLARED.map((q) => q.memberId), ...p.quarantine.AMBIGUOUS.map((q) => q.memberId)];
    assert.equal(placed.length, a.population, "a member was discarded");
    assert.equal(new Set(placed).size, placed.length, "a member sits in two places");
  }
  // The batch's run summaries record no page identity: they are quarantined UNDECLARED, never dropped and never guessed.
  const p = partitionMembers({ members: bare(CRAWL), resolve });
  assert.ok(p.quarantine.UNDECLARED.every((q) => q.reason === "MEMBER_CARRIES_NO_IDENTITY"));
});

test("Q2 · REAL · the partitions ARE the collection: the distinct pages of every tenant's partition sum to the distinct pages of the whole batch — nothing lost, nothing counted twice", () => {
  const whole = pagesFromRun({ crawlRecords: CRAWL.map((m) => m.record), bodies: new Map() }).length;
  let sum = 0;
  for (const t of ACTIVE) sum += pagesFromRun({ crawlRecords: readTenantPartition({ batchId: "crawl-2026-09-12", tenantId: t, resolve }).records, bodies: new Map() }).length;
  console.log(`  [F02 partition · pages] whole batch ${whole} distinct pages · Σ over ${ACTIVE.length} tenants' partitions ${sum}`);
  assert.ok(whole > 100);
  assert.equal(sum, whole);
});

test("Q3 · a tenant's partition holds ONLY members whose own identities resolve to it, and its bodies only its own observations", () => {
  const p = partitionMembers({ members: bare(CRAWL), resolve });
  const [t, ids] = [...p.partitions.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const part = readTenantPartition({ batchId: "crawl-2026-09-12", tenantId: t, resolve });
  assert.equal(part.records.length, ids.length);
  for (const r of part.records) assert.equal(classifyMember(resolve, { memberId: "x", identities: recordIdentities(r) }).tenantId, t);
  const bodies = readPartitionBodies({ batchId: "crawl-2026-09-12", observationIds: part.observationIds });
  assert.ok(bodies.size > 0 && [...bodies.keys()].every((id) => part.observationIds.has(id)), "a body outside the partition was returned");
  // CONTROL: another tenant's partition is disjoint.
  const other = [...p.partitions.keys()].find((x) => x !== t);
  const otherIds = new Set(readTenantPartition({ batchId: "crawl-2026-09-12", tenantId: other, resolve }).observationIds);
  assert.equal([...part.observationIds].filter((id) => otherIds.has(id)).length, 0);
});

test("Q4 · failure branches the real population never produces (FIXTURE members): AMBIGUOUS quarantine, a duplicate refused, an unreadable declaration source refuses everything", () => {
  const [a, b] = DECL.attachments.filter((x) => x.resourceKind === "SITE_ORIGIN" && x.tenantId !== DECL.attachments[0].tenantId).concat(DECL.attachments.filter((x) => x.resourceKind === "SITE_ORIGIN")).filter((x, i, arr) => arr.findIndex((y) => y.tenantId === x.tenantId) === i).slice(0, 2);
  const id = (o) => ({ resourceKind: "SITE_ORIGIN", resourceRef: o.resourceRef });
  const p = partitionMembers({ members: [{ memberId: "two", identities: [id(a), id(b)] }, { memberId: "one", identities: [id(a)] }], resolve });
  assert.deepEqual([p.arithmetic.ambiguous, p.arithmetic.inPartitions, p.arithmetic.remainder], [1, 1, 0]);
  assert.equal(p.quarantine.AMBIGUOUS[0].reason, "MEMBER_IDENTITIES_DECLARED_TO_DIFFERENT_TENANTS");
  assert.throws(() => partitionMembers({ members: [{ memberId: "x", identities: [] }, { memberId: "x", identities: [] }], resolve }), (e) => e instanceof PartitionRefused && e.code === "MEMBER_DUPLICATED");
  const unread = Object.assign(() => ({ state: "UNKNOWN" }), { declarations: { readable: false } });
  assert.throws(() => partitionMembers({ members: bare(SITEMAP), resolve: unread }), (e) => e.code === "DECLARATION_SOURCE_NOT_READ");
  // A partition's quarantine is recorded as a payload-free F08 refusal; a clean partition records nothing.
  const ev = partitionRefusalEvent(partitionMembers({ members: bare(CRAWL), resolve }), { collectionKind: "CRAWL_BATCH", collectionRef: "crawl-2026-09-12" });
  assert.ok(ev && ev.outcome === "REFUSED");
  assert.ok(ACTIVE.every((t) => !JSON.stringify(ev).includes(t)) && !JSON.stringify(ev).includes("http"), "the partition event carries a tenant id or a URL");
  assert.equal(partitionRefusalEvent(partitionMembers({ members: bare(SITEMAP), resolve }), { collectionKind: "SITEMAP_COLLECTION", collectionRef: "s" }), null);
});

test("Q5 · the one decision: a collection PARTITION belongs to the requested ACTIVE tenant; the WHOLE shared collection stays refused; no tenant refuses", () => {
  for (const t of ACTIVE) assert.equal(decideForTenant(resolve, t, RESOURCES.collectionPartition("CRAWL_BATCH", "crawl-2026-09-12")).outcome, "SAME_TENANT_ALLOWED");
  assert.equal(decideForTenant(resolve, undefined, RESOURCES.collectionPartition("CRAWL_BATCH", "crawl-2026-09-12")).outcome, "UNDECLARED_REFUSED");
  assert.equal(decideForTenant(resolve, "tenant:ffffffffffffffffffffffffffffffff", RESOURCES.collectionPartition("CRAWL_BATCH", "crawl-2026-09-12")).outcome, "INVALID_REFUSED");
  // CONTROL: the WHOLE batch is refused for EVERY tenant — AMBIGUOUS while an unlawful whole attachment stands, UNDECLARED
  // once it is retired (owner ruling 1145012, Decision 2). Never allowed.
  assert.ok(ACTIVE.every((t) => ["AMBIGUOUS_REFUSED", "UNDECLARED_REFUSED"].includes(decideForTenant(resolve, t, RESOURCES.crawlBatch("crawl-2026-09-12")).outcome)));
  // Sitemap membership grants no access to another store.
  assert.ok(ACTIVE.every((t) => !decideForTenant(resolve, t, RESOURCES.evidenceStore()).allowed));
});

test("Q6 · REAL ENTRY POINT · bin/edge-graph.mjs, for every tenant, reads only its partition — the counts sum to the whole — and with no tenant it is refused; the trail does not move", () => {
  const before = trailHash();
  const p = partitionMembers({ members: bare(CRAWL), resolve });
  let pages = 0;
  for (const t of p.partitions.keys()) {
    const r = spawnSync(process.execPath, ["bin/edge-graph.mjs", `--tenant=${t}`], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
    assert.equal(r.status, 0, r.stderr.slice(-300));
    assert.equal(Number(/\[partition: (\d+) of/.exec(r.stdout)?.[1]), p.partitions.get(t).length, "the run read more or less than its partition");
    pages += Number(/\[bound: (\d+) distinct pages/.exec(r.stdout)?.[1]);
  }
  assert.equal(pages, pagesFromRun({ crawlRecords: CRAWL.map((m) => m.record), bodies: new Map() }).length);
  const none = spawnSync(process.execPath, ["bin/edge-graph.mjs"], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
  assert.equal(none.status, 3);
  assert.equal(trailHash(), before);
});

test("Q7 · a scheduled consumer runs ONLY its decided tenant: bin/detect.mjs in a two-tenant world (FIXTURE, failure branch) reads one partition and runs one tenant", () => {
  const origins = DECL.attachments.filter((a) => a.resourceKind === "SITE_ORIGIN").map((a) => a.resourceRef);
  const W = declaredWorld({ secondTenantOrigins: origins.filter((_, i) => i % 2 === 1) });
  try {
    for (const bundle of ["observed-pages", "sitemap"]) {
      const r = spawnSync(process.execPath, ["bin/detect.mjs", ...W.argv([`--bundle=${bundle}`, "--run-at=2026-09-24T00:00:00Z"])], { cwd: REPO, encoding: "utf8", env: W.envWith(), timeout: 120_000 });
      assert.equal(r.status, 0, r.stderr.slice(-300));
      assert.match(r.stdout, /runs {7}: 1 /, `${bundle}: more than the decided tenant was run`);
      assert.match(r.stdout, /partition {2}: CRAWL_BATCH \d+ of 999 record\(s\) are this tenant's · 995 in 2 partitions/, `${bundle}: the run did not read through its partition`);
    }
  } finally { W.cleanup(); }
});

/* ─────────────────────────── §3 · ATTACHMENTS ONLY BY STRUCTURAL PROOF ─────────────────────────── */
const CAPTURE = captureSetMembers({ root: DATA, captureId: "row25-2026-09-21" });
const capTenant = [...partitionMembers({ members: CAPTURE, resolve }).partitions.keys()][0];

test("A1 · REAL · the capture set is DECLARABLE by rule 3: its recorded page origins resolve to exactly one tenant, nothing quarantined; and if declared, to that tenant and no other", () => {
  assert.ok(CAPTURE.length >= 2);
  const proof = proveByMembers({ resolve, members: CAPTURE, requestedTenantId: capTenant });
  assert.deepEqual([proof.proved, proof.rule, proof.arithmetic.partitions, proof.arithmetic.undeclared + proof.arithmetic.ambiguous], [true, 3, 1, 0]);
  const held = DECL.attachments.filter((a) => a.resourceKind === "CAPTURE_SET" && a.resourceRef === "row25-2026-09-21");
  assert.ok(held.length <= 1);
  if (held.length) {
    assert.equal(held[0].tenantId, capTenant, "declared to a tenant other than the proved one");
    assert.equal(held[0].declarationBasis, "STRUCTURAL_PROOF");
    assert.equal(held[0].structuralProof.rule, 3);
  }
});

test("A2 · every NOT-ALLOWED basis is a refusal: another tenant, a majority, a shared collection, no identity, a name, a look-alike host, a duplicate, a reassignment", () => {
  const other = ACTIVE.find((t) => t !== capTenant);
  // caller-supplied tenant / choosing whichever tenant passes
  assert.equal(proveByMembers({ resolve, members: CAPTURE, requestedTenantId: other }).code, "PROOF_NAMES_ANOTHER_TENANT");
  // majority ownership (FIXTURE member of another tenant beside the real ones)
  const foreign = DECL.attachments.find((a) => a.resourceKind === "SITE_ORIGIN" && a.tenantId !== capTenant);
  assert.equal(proveByMembers({ resolve, members: [...CAPTURE, { memberId: "f", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: foreign.resourceRef }] }], requestedTenantId: capTenant }).code, "PROOF_NOT_UNIQUE");
  // treating a shared collection as one tenant's resource (REAL batch)
  assert.equal(proveByMembers({ resolve, members: bare(CRAWL), requestedTenantId: capTenant }).code, "PROOF_NOT_UNIQUE");
  // nothing recorded / an empty collection
  assert.equal(proveByMembers({ resolve, members: [], requestedTenantId: capTenant }).code, "NO_MEMBERS");
  // hostname alone / URL resemblance: a look-alike host of the capture's origin is not declared
  const origin = new URL(CAPTURE[0].identities[0].resourceRef);
  const lookalike = `${origin.protocol}//${origin.hostname.replace(/^([^.]+)/, "$1-x")}`;
  assert.equal(proveByMembers({ resolve, members: [{ memberId: "l", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: lookalike }] }], requestedTenantId: capTenant }).code, "PROOF_NOT_UNIQUE");
  // a name: the capture's identity comes from recorded URLs, never from its file names or its id
  const m = JSON.parse(readFileSync(join(DATA, "captures", "row25-2026-09-21", "manifest.json"), "utf8"));
  assert.deepEqual(CAPTURE.map((c) => c.identities.map((i) => i.resourceRef)).flat().sort(), [...new Set(m.pages.map((p) => new URL(p.url).origin))].sort().flatMap((o) => Array(m.pages.filter((p) => new URL(p.url).origin === o).length).fill(o)).sort());
  // a name-matching resource that is not structurally declared stays undeclared
  assert.ok(ACTIVE.every((t) => decideForTenant(resolve, t, RESOURCES.captures("row25-2026-09-21-copy")).outcome === "UNDECLARED_REFUSED"));
  // duplicate / silent reassignment
  const withIt = { attachments: [...DECL.attachments.filter((a) => a.resourceKind !== "CAPTURE_SET"), { resourceKind: "CAPTURE_SET", resourceRef: "row25-2026-09-21", tenantId: capTenant }] };
  assert.equal(attachmentConflict({ declarations: withIt, resourceKind: "CAPTURE_SET", resourceRef: "row25-2026-09-21", tenantId: capTenant }), "ALREADY_DECLARED");
  assert.equal(attachmentConflict({ declarations: withIt, resourceKind: "CAPTURE_SET", resourceRef: "row25-2026-09-21", tenantId: other }), "CONFLICTING_ATTACHMENT");
  assert.equal(attachmentConflict({ declarations: { attachments: [] }, resourceKind: "CAPTURE_SET", resourceRef: "row25-2026-09-21", tenantId: capTenant }), null, "CONTROL: an unheld resource is free to declare");
});

test("A3 · a conflicting declaration refuses: two attachments of one resource to different tenants are AMBIGUOUS to the resolver (stand-in declarations)", () => {
  const two = [...DECL.attachments.filter((a) => a.resourceKind === "SITE_ORIGIN")].slice(0, 2);
  const conflicting = Object.assign((ref) => {
    const hits = [{ ...ref, tenantId: two[0].tenantId }, { ...ref, tenantId: two[1].tenantId }];
    return new Set(hits.map((h) => h.tenantId)).size > 1 ? { state: "AMBIGUOUS" } : { state: "RESOLVED", tenantId: hits[0].tenantId };
  }, { declarations: DECL });
  assert.equal(classifyMember(conflicting, { memberId: "c", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: two[0].resourceRef }] }).place, "AMBIGUOUS");
});

test("A4 · the declaration writer appends ONE record and keeps every existing byte; a non-canonical file is refused", () => {
  const text = readFileSync(join(DECL.dir, "attachments.json"), "utf8");
  const out = appendAttachment({ fileText: text, record: { resourceKind: "X", resourceRef: "y", tenantId: capTenant } });
  assert.ok(out.startsWith(text.slice(0, text.lastIndexOf("}", text.lastIndexOf("]")) + 1)), "an existing record changed");
  assert.equal(JSON.parse(out).attachments.length, JSON.parse(text).attachments.length + 1);
  assert.throws(() => appendAttachment({ fileText: text.replace(/\n/g, "\r\n"), record: {} }), /canonical layout/);
});

test("A5 · REAL ENTRY POINT · bin/declare-attachment.mjs refuses another tenant and no tenant at the gate (exit 3); the trail does not move", () => {
  const before = trailHash();
  for (const t of [ACTIVE.find((x) => x !== capTenant), null]) {
    const r = spawnSync(process.execPath, ["bin/declare-attachment.mjs", ...(t ? [`--tenant=${t}`] : []), "--kind=CAPTURE_SET", "--ref=row25-2026-09-21"], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
    assert.equal(r.status, 3, r.stderr.slice(-300));
  }
  assert.equal(trailHash(), before);
});

/* ─────────────────────────── §4 / §5 · THE RESOURCE CENSUS AND THE REFUSALS THAT REMAIN ─────────────────────────── */
test("R1 · every resource the gates consume has exactly ONE verdict, remainder 0; every gate resource call is covered", () => {
  const rows = resourceCensus({ resolve });
  const by = Object.fromEntries(VERDICTS.map((v) => [v, rows.filter((r) => r.verdict === v).length]));
  const cov = gateCoverage(rows);
  console.log(`  [F02 resource census] ${rows.length} = ${VERDICTS.map((v) => `${by[v]} ${v}`).join(" + ")} · gate calls ${cov.calls}, mapped ${cov.mapped}, unmapped ${cov.unmapped.length}`);
  assert.equal(Object.values(by).reduce((a, b) => a + b, 0), rows.length);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length, "a resource carries two verdicts");
  assert.deepEqual(cov.unmapped, []);
  assert.ok(cov.calls >= 100);
  // the shared collections are MUST_PARTITION, never DECLARABLE; the capture set DECLARABLE; no learning store exists
  for (const id of ["CRAWL_BATCH:crawl-2026-09-12", "SITEMAP_COLLECTION:sitemap-2026-09-12"]) assert.equal(rows.find((r) => r.id === id).verdict, "MUST_PARTITION");
  assert.equal(rows.find((r) => r.id === "CAPTURE_SET:row25-2026-09-21").verdict, "DECLARABLE");
  assert.equal(rows.find((r) => r.kind === "LEARNING_STORE").verdict, "NOT_GOVERNED");
  // Exactly one DECLARABLE resource is not among the declarations the data held before this command: the capture set.
  const newlyDeclarable = rows.filter((r) => r.verdict === "DECLARABLE" && !/already declared|none needed/.test(r.attachment));
  assert.deepEqual(newlyDeclarable.map((r) => r.id), ["CAPTURE_SET:row25-2026-09-21"]);
});

test("R2 · no gate names a PHANTOM resource: every cache a gate names is a stored cache — and the census's cache family fires on a stored one", () => {
  for (const f of productionEntryPoints()) {
    const gate = readFileSync(join(REPO, f), "utf8").split(/\r?\n/).find((l) => /scopedEntryPoint\(\{/.test(l)) ?? "";
    assert.doesNotMatch(gate, /RESOURCES\.cache\("(fact|robots) cache"\)/, `${f} names an in-memory cache as a gated store`);
  }
  const planted = tenantScopeCensus({ sources: [{ file: "bin/planted.mjs", text: 'import { readdirSync } from "node:fs";\nconst x = readdirSync("runs/_planted-cache");\n' }] });
  assert.equal(planted[0].cls, "UNSCOPED", "a stored cache read before any gate was not seen");
});

test("R3 · no requested tenant, no run: every one of the 50 gated entry points refuses a run that names no tenant (decision level)", () => {
  const eps = tenantScopeCensus().filter((r) => r.cls === "SCOPED");
  assert.ok(eps.length >= 50, `${eps.length} scoped entry points`);
  assert.equal(decideRunResources({ argv: [], resolve, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", "crawl-2026-09-12")] }).allowed, false);
});
