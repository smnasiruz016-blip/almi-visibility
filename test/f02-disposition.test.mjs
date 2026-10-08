/**
 * 🔴 F02 · RE-SIT UNDER THE OWNER'S DISPOSITION (25 Sep 2026) — Amendment 1, the retired whole-collection attachments, the
 * F79 freeze constraint, and the twelve unresolved resources, proved against the CURRENT real populations.
 *
 * Ruling `_handoffs` 1145012 · command ab2dfd8 · packet 2a22551 · Amendment 1 ad14a64 (bytes 19764797…, contract 4b153869…).
 * Every limb of the amendment's FAILURE clause and the F79 constraint has a proof here with a control capable of the
 * opposite verdict; the disposition sabotage (test/helpers/f02-disposition-sabotage.mjs) aims one defect at each.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ACCEPTANCES, F02_ORIGINAL } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ROW_CONSTRAINTS } from "../config/fboard/row-constraints.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES, decideRunResources } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { collectionMembers } from "../src/crawl/batch-partition.mjs";
import { partitionMembers } from "../src/tenancy/partition.mjs";
import { proveSharedCollection, removeAttachment } from "../src/tenancy/attachment-declaration.mjs";
import { census as resourceCensus } from "../tools/resource-census.mjs";
import { census as tenantScopeCensus } from "../tools/tenant-scope-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const resolve = createTenantResolver();
const DECL = resolve.declarations;
const ACTIVE = DECL.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
const AUTH = { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now };
const board = (declared = DECLARED) => buildBoard(CAPABILITIES, declared);

/* ─────────────────────────── AMENDMENT 1 ─────────────────────────── */
test("D1 · Amendment 1 is the CURRENT F02 contract, pinned to its committed bytes; it names the original it amends; a one-word change breaks it", () => {
  const a = ACCEPTANCES.F02;
  assert.equal(a.ruling.sha256, "19764797de24261a02725caa6786ec19d0c29e4f207a2db2b0dbbae6fc684db5");
  assert.equal(a.contractSha256, "4b153869c05b3563d313a9941fca874aef789732e842169671df80ccb48dbd3d");
  assert.equal(contractSha256(a), a.contractSha256, "the amended clauses no longer hash to the frozen contract");
  assert.deepEqual([a.amends.ruling.sha256, a.amends.contractSha256], ["e468526e1257fd6ac16505a5018398fb8701165da0f711edc44b1395673e79e5", "9b6273d6fdb92f7fa8f2d542a40cdb1a210cce6ad34b430bc3d7c7e0d2b03471"]);
  assert.equal(contractSha256(F02_ORIGINAL), F02_ORIGINAL.contractSha256, "the original acceptance changed");
  assert.equal(a.amends.supersededOnlyAs, "the demand for a presently non-empty real learning population");
  assert.equal(a.dependsOn.featureId, "F79");
  // CONTROL: one word changed in one clause changes the contract hash.
  assert.notEqual(contractSha256({ ...a, failure: a.failure.replace("accepted", "rejected") }), a.contractSha256);
  // The amendment keeps every existing population inside F02: the EXPECTED clause names all five.
  for (const w of ["evidence", "costs", "caches", "research inputs", "outputs"]) assert.match(a.expected, new RegExp(w));
});

test("D2 · the board accepts the amendment ONLY as a chain: it must name, by both hashes, the freeze it amends", () => {
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH }), []);
  const broken = { ...DECLARED, F02: { ...DECLARED.F02, events: DECLARED.F02.events.map((e) => (e.kind === "ACCEPTANCE_AMENDED" ? { ...e, amends: { ...e.amends, contractSha256: "0".repeat(64) } } : e)) } };
  assert.ok(boardErrors(board(broken), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((x) => x.code === "ACCEPTANCE_CHAIN_BROKEN" && x.id === "F02"));
  const noAmendEvent = { ...DECLARED, F02: { ...DECLARED.F02, events: DECLARED.F02.events.filter((e) => e.kind !== "ACCEPTANCE_AMENDED") } };
  assert.ok(boardErrors(board(noAmendEvent), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((x) => x.code === "ACCEPTANCE_TAMPERED" && x.id === "F02"), "an amended acceptance without its amendment event was accepted");
});

/* ─────────────────────────── THE F79 FREEZE CONSTRAINT ─────────────────────────── */
const standIn = (withPrecondition) => {
  const c = { featureId: "F79", feature: "F79 · stand-in", input: "A stand-in input.", expected: withPrecondition ? "A stand-in outcome, with F02 tenant-isolation conformance as a precondition." : "A stand-in outcome.", failure: "A stand-in failure.", evidence: "A stand-in evidence clause.", ruling: { sha256: "a".repeat(64) } };
  return { ...c, contractSha256: contractSha256(c) };
};
const withF79 = (acc) => ({ ...DECLARED, F79: { featureId: "F79", board: "F_BOARD", state: "ACCEPTANCE-FROZEN", events: [{ kind: "ACCEPTANCE_FROZEN", on: "2026-09-25", ruling: acc.ruling, contractSha256: acc.contractSha256 }] } });

test("D3 · F79's acceptance CANNOT be frozen without F02 tenant-isolation conformance — a stand-in freeze WITHOUT it is refused (firing control); WITH it, that refusal is gone", () => {
  assert.equal(ROW_CONSTRAINTS.find((c) => c.featureId === "F79").requires, "F02 tenant-isolation conformance");
  const without = standIn(false);
  const errsWithout = boardErrors(board(withF79(without)), { capabilities: CAPABILITIES, acceptances: { ...ACCEPTANCES, F79: without } });
  assert.ok(errsWithout.some((e) => e.code === "ROW_CONSTRAINT_UNMET" && e.id === "F79"), "a stand-in F79 freeze without the precondition was NOT refused");
  const withIt = standIn(true);
  const errsWith = boardErrors(board(withF79(withIt)), { capabilities: CAPABILITIES, acceptances: { ...ACCEPTANCES, F79: withIt } });
  assert.ok(!errsWith.some((e) => e.code === "ROW_CONSTRAINT_UNMET"), "the precondition was present and still refused");
  // A freeze EVENT without any acceptance is refused too. (Since F79 was frozen for real on 29 Sep 2026 — RR-93, _handoffs f34f3af —
  // ACCEPTANCES holds F79, so "without any acceptance" must take it OUT, or this control would test the real acceptance instead.)
  const { F79: _real, ...noF79 } = ACCEPTANCES;
  assert.ok(boardErrors(board(withF79(without)), { capabilities: CAPABILITIES, acceptances: noF79 }).some((e) => e.code === "ROW_CONSTRAINT_UNMET"));
  // The constraint is backed by the CURRENT disposition ruling; take the ruling out of the register and the board refuses the constraint itself.
  assert.ok(!boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH }).some((e) => e.code === "ROW_CONSTRAINT_WITHOUT_AUTHORITY"));
  const without_ruling = { records: AUTHORITY_CORPUS.filter((r) => r.propositionId !== "OWNER_RULING_F02_DISPOSITION"), now: AUTH.now };
  assert.ok(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: without_ruling }).some((e) => e.code === "ROW_CONSTRAINT_WITHOUT_AUTHORITY" && e.id === "F79"));
  // This ruling started nothing. F79 moved later ONLY under its own frozen acceptance (RR-93, _handoffs f34f3af, Amendment 1 60dee9b),
  // which carries the precondition in its frozen contract — and the real board raises no ROW_CONSTRAINT_UNMET for it.
  assert.ok([ACCEPTANCES.F79.input, ACCEPTANCES.F79.expected, ACCEPTANCES.F79.failure, ACCEPTANCES.F79.evidence].some((t) => t.includes("F02 tenant-isolation conformance")), "the real F79 acceptance lacks the F02 precondition");
  assert.ok(!boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH }).some((e) => e.code === "ROW_CONSTRAINT_UNMET"));
  assert.equal(DECLARED.F79.events[0].kind, "ACCEPTANCE_FROZEN");
});

/* ─────────────────────────── THE LEARNING POPULATION ─────────────────────────── */
test("D4 · an undeclared LEARNING resource is refused NOW, for every tenant, at the decision and at the gate; a learning read before any gate is UNSCOPED", () => {
  const learning = { label: "learning store", resourceKind: "LEARNING_STORE", resourceRef: "any-learning-store", scopeClass: "TENANT" };
  assert.ok(ACTIVE.every((t) => decideForTenant(resolve, t, learning).outcome === "UNDECLARED_REFUSED"));
  assert.equal(decideRunResources({ argv: [`--tenant=${ACTIVE[0]}`], resolve, resources: [learning] }).allowed, false);
  const planted = tenantScopeCensus({ sources: [{ file: "bin/planted-learning.mjs", text: 'import { readFileSync } from "node:fs";\nconst l = readFileSync("runs/learning/store.jsonl", "utf8");\n' }] });
  assert.equal(planted[0].cls, "UNSCOPED", "a learning read before any gate was not seen");
  // CONTROL, capable of the opposite verdict: a DECLARED resource is allowed for its own tenant through the same decision.
  const own = DECL.attachments.find((a) => a.resourceKind === "SITE_ORIGIN");
  assert.equal(decideForTenant(resolve, own.tenantId, RESOURCES.siteOrigin(own.resourceRef)).outcome, "SAME_TENANT_ALLOWED");
});

test("D5 · no existing learning population is reported — none is fabricated, none is stood in by a fixture — and the learning rows read DEFERRED-TO-F79", () => {
  const row = resourceCensus({ resolve }).find((r) => r.kind === "LEARNING_STORE");
  assert.equal(row.verdict, "NOT_GOVERNED");
  assert.match(row.locator, /no production learning store or path exists/);
  assert.equal(row.members, null, "a learning population was measured where none exists");
  const code = execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "subjects", "config"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  assert.deepEqual(code.filter((f) => /learning/i.test(f) || /\bLEARNING_STORE\b|learningStore/.test(readFileSync(join(REPO, f), "utf8"))), [], "a learning store now exists — F79's precondition applies and these rows must be re-sat");
  assert.deepEqual(DEFERRED.map((d) => d[1]), ["DEFERRED-TO-F79", "DEFERRED-TO-F79"]);
});

/* ─────────────────────────── THE WHOLE COLLECTIONS ─────────────────────────── */
test("D6 · neither WHOLE collection can authorise a tenant read — for every tenant — while each tenant's partition is its own", () => {
  for (const [kind, id, whole] of [["CRAWL_BATCH", "crawl-2026-09-12", RESOURCES.crawlBatch("crawl-2026-09-12")], ["SITEMAP_COLLECTION", "sitemap-2026-09-12", RESOURCES.sitemapCollection("sitemap-2026-09-12")]]) {
    assert.ok(ACTIVE.every((t) => !decideForTenant(resolve, t, whole).allowed), `a WHOLE ${kind} authorised a tenant read`);
    assert.ok(ACTIVE.every((t) => decideForTenant(resolve, t, RESOURCES.collectionPartition(kind, id)).allowed));
    const p = partitionMembers({ members: collectionMembers({ batchId: id }).map(({ memberId, identities }) => ({ memberId, identities })), resolve });
    assert.equal(p.arithmetic.remainder, 0);
  }
});

test("D7 · the retirement is lawful: a shared collection is PROVED shared from its members; a single-tenant collection is refused; exactly one record is removed and every other byte kept", () => {
  for (const id of ["crawl-2026-09-12", "sitemap-2026-09-12"]) assert.equal(proveSharedCollection({ resolve, members: collectionMembers({ batchId: id }).map(({ memberId, identities }) => ({ memberId, identities })) }).shared, true);
  // CONTROL: a collection whose members all resolve to one tenant (FIXTURE members on a real declared origin) is not shared.
  const one = DECL.attachments.find((a) => a.resourceKind === "SITE_ORIGIN");
  assert.equal(proveSharedCollection({ resolve, members: [{ memberId: "a", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: one.resourceRef }] }] }).shared, false);
  const text = readFileSync(join(DECL.dir, "attachments.json"), "utf8");
  const site = DECL.attachments.find((a) => a.resourceKind === "SITE_ORIGIN");
  const out = removeAttachment({ fileText: text, resourceKind: site.resourceKind, resourceRef: site.resourceRef });
  assert.equal(JSON.parse(out.text).attachments.length, DECL.attachments.length - 1);
  assert.throws(() => removeAttachment({ fileText: text, resourceKind: "CRAWL_BATCH", resourceRef: "no-such" }), /exactly one/);
});

test("D8 · CONDITION 2 · a shared collection holds NO whole-collection attachment in the CURRENT declarations (red until the data correction is merged — by design)", () => {
  const whole = DECL.attachments.filter((a) => a.resourceKind === "CRAWL_BATCH" || a.resourceKind === "SITEMAP_COLLECTION");
  const unlawful = whole.filter((a) => proveSharedCollection({ resolve, members: collectionMembers({ batchId: a.resourceRef }).map(({ memberId, identities }) => ({ memberId, identities })) }).shared);
  assert.deepEqual(unlawful.map((a) => `${a.resourceKind} ${a.resourceRef}`), [], "a shared collection is still attached whole to one tenant in the current declarations");
});

/* ─────────────────────────── THE TWELVE ─────────────────────────── */
test("D9 · the UNRESOLVED_OWNER resources (the packet's fourteen) are listed individually, stay UNDECLARED for every tenant, and the seven entry points blocked solely by them refuse (exit 3)", () => {
  const rows = resourceCensus({ resolve }).filter((r) => r.verdict === "UNRESOLVED_OWNER");
  /* Pinned by IDENTITY to the owner packet (_handoffs 744a240, re-issued: twelve → fourteen, because the first census was
   * environment-dependent). A change in membership, not only in count, fails here and requires a re-issued packet. */
  assert.deepEqual(rows.map((r) => r.id).sort(), [
    "CACHE_STORE:sibling-page cache",
    "INPUT_PATH:(per run)",
    "INPUT_PATH:a connected product's organisations file",
    "INPUT_PATH:a connected product's seed generator directory",
    "INPUT_PATH:a private export outside every repository",
    "INPUT_PATH:acceptance/nursing-from-india",
    "INPUT_PATH:case-study-01/exhibits/spec.json",
    "RUN_STORE:crawl store",
    "RUN_STORE:crawl store and seed inputs",
    "RUN_STORE:live sibling pages",
    "RUN_STORE:replay corpus",
    "RUN_STORE:sibling pages read from the cache directory",
    "RUN_STORE:stored discovery results",
    "RUN_STORE:stored source-integrity result",
  ], "the unresolved resources changed — the owner packet must be re-issued");
  const asResource = (r) => {
    const [kind, name] = [r.kind, r.id.slice(r.kind.length + 1)];
    if (kind === "CACHE_STORE") return RESOURCES.cache(name);
    if (kind === "RUN_STORE") return RESOURCES.runArtefacts(name);
    return RESOURCES.inputPath(`standing:${name}`, name);
  };
  for (const r of rows) assert.ok(ACTIVE.every((t) => !decideForTenant(resolve, t, asResource(r)).allowed), `${r.id} was allowed for a tenant`);
  const T = DECL.attachments.find((a) => a.resourceKind === "FACT_REGISTRY").tenantId;
  for (const f of ["subjects/almi-oet/tools/nursing-chain.mjs", "subjects/almi-oet/tools/placement-measure.mjs", "subjects/almi-oet/tools/profession-chain.mjs", "subjects/almi-oet/tools/acceptance-test.mjs", "subjects/almi-oet/tools/profession-census.mjs", "subjects/almi-oet/tools/clinical-layer-census.mjs", "bin/freeze-exhibit.mjs"]) {
    const r = spawnSync(process.execPath, [f, "--product=almi-oet", `--tenant=${T}`], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
    assert.equal(r.status, 3, `${f} exited ${r.status} — an unresolved resource was treated as operational`);
  }
});

/* ─────────────────────────── THE RE-SIT: one verdict per current clause ─────────────────────────── */
export const VERDICTS = Object.freeze([
  ["INPUT · judged over every tenant-governed population that presently exists", "PROVED", "f02-tenant-isolation R1–R5, f02-real-prerequisites Q1–Q7, resource census 53 rows remainder 0"],
  ["EXPECTED · existing evidence, costs, caches, research inputs and outputs remain tenant-isolated", "PROVED", "undeclared stores refuse for every tenant (R3, D9); partitions only for their own tenant (Q3, Q5, D6)"],
  ["EXPECTED · a future F79 learning path must use the F02 boundary before F79 may pass", "PROVED", "D3 — F79 cannot be frozen without F02 conformance (firing control)"],
  ["FAILURE · an existing population crosses tenants", "PROVED", "relationship census 0 SELF_DECIDED; D6 whole collections cannot authorise; Q6/Q7 consumers read only their partition"],
  ["FAILURE · an undeclared learning resource is accepted", "PROVED", "D4 (firing control)"],
  ["FAILURE · F79 later introduces learning without F02 isolation", "PROVED", "D3 — the freeze constraint is live and backed by CURRENT authority"],
  ["FAILURE · the absence of a learning population is disguised by fixtures or fabricated records", "PROVED", "D5"],
  ["EVIDENCE · real non-empty existing populations prove their isolation NOW", "PROVED", "441/462-decision real matrix, 999/5-member partitions, 126 undeclared refusals, real entry points"],
  ["EVIDENCE · the undeclared-learning refusal is proved with a firing control NOW", "PROVED", "D4"],
  ["CLAR 1–10 (original binding clarifications, unchanged)", "PROVED", "f02-tenant-isolation VERDICTS CLAR rows"],
  ["INV 1–12 (§6 invariants, unchanged)", "PROVED", "f02-tenant-isolation VERDICTS INV rows"],
]);
/** Rows the amendment DEFERS — not verdicts, and explicitly NOT PROVED. */
export const DEFERRED = Object.freeze([
  ["EVIDENCE · real learning WRITE evidence", "DEFERRED-TO-F79", "no production learning store or path exists (D5); mandatory when F79 creates the population"],
  ["EVIDENCE · real learning REUSE evidence", "DEFERRED-TO-F79", "as above"],
]);

test("V · every current clause has exactly ONE verdict, 0 DISPROVED, 0 COULD-NOT-PROVE; the two deferred rows are DEFERRED-TO-F79 and not verdicts", () => {
  const ok = ["PROVED", "DISPROVED", "COULD-NOT-PROVE"];
  assert.ok(VERDICTS.every(([, v]) => ok.includes(v)));
  assert.equal(new Set(VERDICTS.map((x) => x[0])).size, VERDICTS.length);
  assert.deepEqual(VERDICTS.filter((x) => x[1] !== "PROVED").map((x) => x[0]), []);
  assert.ok(DEFERRED.every(([, v]) => v === "DEFERRED-TO-F79" && !ok.includes(v)));
});

test("B · the board: F02 holds the state its evidence earned, and no other row moved (F79 UNASSESSED)", () => {
  const p = progress(board());
  const f02 = board().find((r) => r.featureId === "F02");
  assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(f02.state));
  if (f02.state === "VERIFIED-PASS") {
    assert.ok(DECLARED.F02.events.some((e) => e.kind === "VERIFIED" && e.featureId === "F02" && e.population === "REAL"));
    assert.equal(p.passed, 40); /* RR-216: F92 PROVED (rr216-sabotage-2026-10-08T0359: 35 of 35) */ /* RR-214: F93 PROVED (rr214-sabotage-2026-10-08T0218: 31 of 31) */ /* RR-210: F38 PROVED (rr210-sabotage-2026-10-07T2305: 37 of 37) */ /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */ /* RR-192: F39 re-proved under Amendment 1 */
  } else assert.equal(p.passed, 5);
  for (const id of ["F01", "F05", "F06", "F08"]) assert.equal(board().find((r) => r.featureId === id).state, "VERIFIED-PASS");
  assert.equal(board().find((r) => r.featureId === "F07").state, "IN-PROGRESS"); // F07 reopened 28 Sep (test/f07-closure.test.mjs owns it)
  assert.equal(board().find((r) => r.featureId === "F40").state, ((r) => (r.state === "IN-PROGRESS" && r.events.at(-1)?.kind === "REOPENED" && r.events.at(-1)?.reason === "AUTHORITATIVE_REQUIREMENT_CHANGE" && r.events.at(-2)?.kind === "ACCEPTANCE_AMENDED" ? "IN-PROGRESS" : "VERIFIED-PASS"))(board().find((x) => x.featureId === "F40"))); /* RR-188: F40's lawful state — VERIFIED-PASS, or IN-PROGRESS while its own Amendment 1 has reopened it */ /* RR-184: F40 frozen under its own acceptance (_handoffs 6d64c27), started after its lift, then PROVED (rr184-sabotage-2026-10-06T0301: 37 of 37) */ /* lifted 2 Oct 2026 by the owner ruling _handoffs 4761236 (RR-127 §2a) */
});
