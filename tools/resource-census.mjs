#!/usr/bin/env node
/**
 * 🔴 F02 · THE REAL RESOURCE CENSUS — every resource the governed entry points consume, its locator, its current
 * declaration, the STRUCTURAL evidence of who owns it, and one verdict, with a remainder of zero.
 *
 *   node tools/resource-census.mjs [--check] [--table]
 *
 * Verdicts (owner ruling `_handoffs` AlmiVisibility_OWNER_RULING_2026-09-24_F02_RESOURCE_ATTACHMENTS.md):
 *   DECLARABLE        a structural proof attaches it to exactly one tenant (rule 5: an existing single current attachment;
 *                     rule 3: every member resolves, through current declarations, to the same tenant, none quarantined)
 *   MUST_PARTITION    its members belong to more than one tenant, or some to none — a SHARED collection, never one tenant's
 *   GLOBAL_PRODUCT    no tenant-owned payload, and it cannot let one tenant's evidence, costs, learning or outputs reach another
 *   UNRESOLVED_OWNER  tenant payload, but nothing recorded proves an owner; only an owner act could create the proof (e.g.
 *                     a product descriptor declaring the exact path, rule 2)
 *   NOT_GOVERNED      not a stored tenant resource at all (the engine's own test material; a resource that does not exist)
 *
 * MEASURED, not typed: the declaration (the production resolver), every JSONL member's recorded identities and their
 * partition (src/tenancy/partition.mjs), a capture's recorded page origins. STATED, with a reason, where only reading
 * would tell and the store is not a member collection: whether it carries tenant payload.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { partitionMembers } from "../src/tenancy/partition.mjs";
import { recordIdentities, memberIdOf, collectionMembers } from "../src/crawl/batch-partition.mjs";
import { captureSetMembers, proveByMembers } from "../src/tenancy/attachment-declaration.mjs";
import { productionEntryPoints } from "../src/entry-points.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const VERDICTS = Object.freeze(["DECLARABLE", "MUST_PARTITION", "GLOBAL_PRODUCT", "UNRESOLVED_OWNER", "NOT_GOVERNED"]);

const jsonlFiles = (rel) => {
  const p = join(REPO, rel);
  if (!existsSync(p)) return [];
  if (statSync(p).isFile()) return rel.endsWith(".jsonl") ? [rel] : [];
  return readdirSync(p).filter((f) => f.endsWith(".jsonl")).map((f) => `${rel.replace(/\/$/, "")}/${f}`);
};
function storeMembers(rels) {
  const out = [];
  for (const rel of rels.flatMap(jsonlFiles)) {
    readFileSync(join(REPO, rel), "utf8").split(/\r?\n/).filter(Boolean).forEach((l, i) => {
      let r; try { r = JSON.parse(l); } catch { return; }
      /* A stored LINE is the member here: an append-only store may hold one logical issue several times (its superseded
       * duplicates are records too), and each line is counted once, in exactly one place. */
      out.push({ memberId: `${rel}:${i}`, identities: recordIdentities(r) });
    });
  }
  return out;
}

/** Every run store a gate names, by the name it names it with → where it lives, and whether it records member identities. */
const RUN_STORES = Object.freeze({
  "run stores": ["runs/audit"], "audit finding stores": ["runs/audit"], "audit findings": ["runs/audit/findings.jsonl"],
  "verification issue store": ["runs/audit/verification-issues.jsonl"], "technical findings store": ["runs/audit/technical-findings.jsonl"],
  "instrument findings": ["runs/audit/instrument-findings.jsonl"], "source-integrity stores": ["runs/audit/source-integrity.jsonl"],
  "recommendation and finding stores": ["runs/audit/recommendations.jsonl", "runs/audit/crawler-classification.jsonl", "runs/audit/findings.jsonl", "runs/audit/technical-findings.jsonl"],
  "render store": ["runs/render"], "Actions run timings": ["runs/cost/actions-runs.jsonl"],
  "stored source-integrity result": ["runs/audit/source-integrity-2026-09-13.json"], "stored discovery results": ["runs/discovery"],
  "replay corpus": ["runs/crawl/corpus"], "crawl store": ["runs/crawl/crawl.jsonl"], "crawl store and seed inputs": ["runs/crawl/crawl.jsonl"],
  "sibling pages read from the cache directory": ["runs/_profession-cache"], "live sibling pages": [],
});

export function census({ resolve = createTenantResolver() } = {}) {
  const decl = resolve.declarations;
  const dataRoot = decl.readable ? dirname(decl.dir) : null;
  const rows = [];
  const add = (r) => rows.push(r);
  const partitionOf = (members) => (members.length ? partitionMembers({ members, resolve }).arithmetic : null);
  const byMembers = (a) => (!a ? null : a.partitions === 1 && a.undeclared === 0 && a.ambiguous === 0 ? "DECLARABLE" : "MUST_PARTITION");

  /* 1 · the current declarations themselves (rule 5), and the two shared collections (partitioned, never attached whole) */
  for (const a of decl.readable ? decl.attachments : []) {
    if (a.resourceKind === "CAPTURE_SET") continue; // its own row below, measured by its members, declared or not
    if (a.resourceKind === "CRAWL_BATCH" || a.resourceKind === "SITEMAP_COLLECTION") {
      const p = partitionOf(collectionMembers({ batchId: a.resourceRef }).map(({ memberId, identities }) => ({ memberId, identities })));
      add({ id: `${a.resourceKind}:${a.resourceRef}`, kind: a.resourceKind, locator: `data:observations/${a.resourceRef}/`, owner: "none — a capture of many site origins", declared: "attached WHOLE to one tenant (declarationBasis OWNER_AUTHORISED_ATTACHMENT) — the ruling's NOT-ALLOWED case; the partition ignores it", evidence: "rule 3 per member", payload: true, members: p, verdict: "MUST_PARTITION", attachment: "none — members go to their own tenant's partition (src/tenancy/partition.mjs)" });
    } else {
      add({ id: `${a.resourceKind}:${a.resourceRef}`, kind: a.resourceKind, locator: a.resourceKind === "FACT_REGISTRY" ? `data:${a.resourceRef}/` : a.resourceRef, owner: a.resourceKind === "FACT_REGISTRY" ? "the subject descriptor that exports this factsDir (rule 1)" : "the declaration", declared: "one current attachment", evidence: a.resourceKind === "FACT_REGISTRY" ? "rules 1 and 5" : "rule 5", payload: true, members: null, verdict: "DECLARABLE", attachment: "already declared — unchanged" });
    }
  }
  /* 2 · the engine's own neutral test products: fixtures, never a real tenant's resource */
  for (const id of ["neutral-test-knots", "neutral-test-ferments"]) add({ id: `FACT_REGISTRY:engine-fixtures:${id}/facts`, kind: "FACT_REGISTRY", locator: `products/${id}/facts`, owner: "the engine's own test material", declared: "none (real)", evidence: "fixtures root (config/subject-roots.mjs)", payload: false, members: null, verdict: "NOT_GOVERNED", attachment: "none — a fixture is never the real population" });
  /* 3 · the evidence store and the cost ledger: member collections */
  const ev = partitionOf(storeMembers(["runs/evidence"]));
  add({ id: "EVIDENCE_STORE:evidence-store", kind: "EVIDENCE_STORE", locator: "runs/evidence/*.jsonl", owner: "none recorded — Search Console properties (incl. a multi-tenant domain property), robots and external observations", declared: "none", evidence: "rule 3 per member", payload: true, members: ev, verdict: byMembers(ev), attachment: "none" });
  const cost = partitionOf(storeMembers(["runs/cost/ledger.jsonl"]));
  add({ id: "COST_LEDGER:cost-ledger", kind: "COST_LEDGER", locator: "runs/cost/ledger.jsonl", owner: "none — each entry is one run over many hosts", declared: "none", evidence: "rule 3 per member", payload: true, members: cost, verdict: byMembers(cost) === "DECLARABLE" ? "DECLARABLE" : "MUST_PARTITION", attachment: "none" });
  /* 4 · the capture set: members are the pages its manifest RECORDED (url, origin) */
  const cap = dataRoot ? captureSetMembers({ root: dataRoot, captureId: "row25-2026-09-21" }) : null;
  const capProof = cap && cap.length ? (() => { const p = partitionMembers({ members: cap, resolve }); const t = [...p.partitions.keys()]; return { arithmetic: p.arithmetic, proof: t.length === 1 ? proveByMembers({ resolve, members: cap, requestedTenantId: t[0] }) : { proved: false } }; })() : null;
  add({ id: "CAPTURE_SET:row25-2026-09-21", kind: "CAPTURE_SET", locator: "data:captures/row25-2026-09-21/", owner: "the recorded origin of every captured page", declared: decl.readable && decl.attachments.some((a) => a.resourceKind === "CAPTURE_SET" && a.resourceRef === "row25-2026-09-21") ? "one current attachment" : "none", evidence: "rule 3 — every member's recorded origin resolves to one tenant", payload: true, members: capProof?.arithmetic ?? null, verdict: capProof?.proof?.proved ? "DECLARABLE" : "MUST_PARTITION", attachment: !capProof?.proof?.proved ? "none" : decl.readable && decl.attachments.some((a) => a.resourceKind === "CAPTURE_SET" && a.resourceRef === "row25-2026-09-21") ? "declared by this command (structural proof, rule 3, bin/declare-attachment.mjs)" : "attach the exact CAPTURE_SET id to the proved tenant (bin/declare-attachment.mjs)" });
  /* 5 · the research batch: records carry public-source hosts and a SELF-declared tenant — a caller-supplied tenant is not proof */
  const rbFile = dataRoot ? join(dataRoot, "research", "local-reasoning-2026-09-21", "records.jsonl") : null;
  const rb = rbFile && existsSync(rbFile) ? partitionOf(readFileSync(rbFile, "utf8").split(/\r?\n/).filter(Boolean).map((l, i) => { const r = JSON.parse(l); return { memberId: memberIdOf(r, "records.jsonl", i), identities: recordIdentities(r) }; })) : null;
  add({ id: "RESEARCH_BATCH:local-reasoning-2026-09-21", kind: "RESEARCH_BATCH", locator: "data:research/local-reasoning-2026-09-21/", owner: "none recorded — public-source hosts; each record's own tenantId is self-declared", declared: "none", evidence: "rule 3 per member", payload: true, members: rb, verdict: byMembers(rb) ?? "UNRESOLVED_OWNER", attachment: "none" });
  /* 6 · the one stored cache */
  add({ id: "CACHE_STORE:sibling-page cache", kind: "CACHE_STORE", locator: "runs/_profession-cache/ (gitignored; this machine only)", owner: "none recorded — cached pages keyed by file name; a name is not proof", declared: "none", evidence: "none structural", payload: true, members: null, verdict: "UNRESOLVED_OWNER", attachment: "none — a product descriptor could declare the exact path (rule 2): an owner act" });
  /* 7 · every named run store */
  for (const [name, locs] of Object.entries(RUN_STORES)) {
    const m = partitionOf(storeMembers(locs));
    const absent = locs.length > 0 && locs.every((l) => !existsSync(join(REPO, l)));
    const tracked = locs.some((l) => execFileSync("git", ["-C", REPO, "ls-files", l], { encoding: "utf8" }).trim() !== "");
    const verdict = absent ? "NOT_GOVERNED" : name === "live sibling pages" ? "UNRESOLVED_OWNER" : m ? byMembers(m) : "UNRESOLVED_OWNER";
    const owner = absent ? "— it does not exist in the real population" : m ? "per member" : tracked ? "none recorded — documents, no member identity the partition reads" : "none recorded — this machine only (untracked)";
    add({ id: `RUN_STORE:${name}`, kind: "RUN_STORE", locator: locs.join(", ") || "the network (live page reads)", owner, declared: "none", evidence: m ? "rule 3 per member" : "no member identity recorded", payload: absent ? null : true, members: m, verdict, attachment: "none" });
  }
  /* 8 · standing operator input paths (a default a gate names when the flag is absent) */
  for (const [id, where] of [["acceptance/nursing-from-india", "subjects/almi-oet/tools/acceptance-test.mjs --facts default"], ["case-study-01/exhibits/spec.json", "bin/freeze-exhibit.mjs --spec default (not opened)"], ["a private export outside every repository", "subjects/almi-oet/tools/verification-issues.mjs --csv default"], ["a connected product's organisations file", "subjects/almi-oet/tools/profession-census.mjs (DEAD)"], ["a connected product's seed generator directory", "subjects/almi-oet/tools/clinical-layer-census.mjs (DEAD)"]]) {
    add({ id: `INPUT_PATH:${id}`, kind: "INPUT_PATH", locator: where, owner: "none recorded", declared: "none", evidence: "no descriptor declares the exact path (rule 2)", payload: true, members: null, verdict: "UNRESOLVED_OWNER", attachment: "none" });
  }
  add({ id: "INPUT_PATH:(per run)", kind: "INPUT_PATH", locator: "any path an operator hands a run", owner: "decided per run", declared: "none", evidence: "each exact path would need its own structural proof", payload: true, members: null, verdict: "UNRESOLVED_OWNER", attachment: "none" });
  add({ id: "TENANT_PARTITION:(F01 declaration store)", kind: "TENANT_PARTITION", locator: "data:declarations/tenants/<tenant>/", owner: "the declared tenant id is the partition key", declared: "by construction", evidence: "the key is a declaration", payload: true, members: null, verdict: "DECLARABLE", attachment: "none needed" });
  add({ id: "LEARNING_STORE:(none exists)", kind: "LEARNING_STORE", locator: "— no production learning store or path exists", owner: "—", declared: "—", evidence: "capability gap (its own F-row, unaccepted)", payload: null, members: null, verdict: "NOT_GOVERNED", attachment: "none — NOT built here (scope law)" });
  return rows;
}

/** Every resource call in every production gate → the census rows that cover it. Unmapped calls are the remainder. */
export function gateCoverage(rows) {
  const ids = new Set(rows.map((r) => r.id));
  const out = { calls: 0, mapped: 0, unmapped: [] };
  for (const file of productionEntryPoints()) {
    const text = readFileSync(join(REPO, file), "utf8");
    const gate = text.split(/\r?\n/).find((l) => /scopedEntryPoint\(\{/.test(l) && !/^\s*(\*|\/\/)/.test(l));
    if (!gate) continue;
    for (const m of gate.matchAll(/RESOURCES\.(\w+)\(([^()]*(?:\([^()]*\))?[^()]*)\)|everySubjectRegistry\(\)/g)) {
      out.calls += 1;
      const [builder, raw = ""] = m[1] ? [m[1], m[2].trim()] : ["factRegistryAt", "*"];
      const lit = /^"([^"]*)"$/.exec(raw)?.[1];
      const covered =
        builder === "siteOrigin" ? rows.some((r) => r.kind === "SITE_ORIGIN")
        : builder === "factRegistryAt" ? rows.some((r) => r.kind === "FACT_REGISTRY")
        : builder === "crawlBatch" || (builder === "collectionPartition" && /CRAWL_BATCH/.test(raw)) ? rows.some((r) => r.kind === "CRAWL_BATCH")
        : builder === "sitemapCollection" || (builder === "collectionPartition" && /SITEMAP_COLLECTION/.test(raw)) ? rows.some((r) => r.kind === "SITEMAP_COLLECTION")
        : builder === "evidenceStore" ? ids.has("EVIDENCE_STORE:evidence-store")
        : builder === "costLedger" ? ids.has("COST_LEDGER:cost-ledger")
        : builder === "captures" ? ids.has("CAPTURE_SET:row25-2026-09-21")
        : builder === "cache" ? ids.has(`CACHE_STORE:${lit}`)
        : builder === "runArtefacts" ? ids.has(`RUN_STORE:${lit}`)
        : builder === "inputPath" ? ids.has("INPUT_PATH:(per run)")
        : builder === "tenantPartition" ? ids.has("TENANT_PARTITION:(F01 declaration store)")
        : false;
      if (covered) out.mapped += 1; else out.unmapped.push(`${file}: ${builder}(${raw})`);
    }
  }
  return out;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/").replace(/^\//, "")}`) {
  const rows = census();
  const by = Object.fromEntries(VERDICTS.map((v) => [v, rows.filter((r) => r.verdict === v).length]));
  const cov = gateCoverage(rows);
  console.log(`RESOURCE CENSUS — ${rows.length} resource(s) · ${VERDICTS.map((v) => `${v} ${by[v]}`).join(" · ")} · remainder ${rows.length - Object.values(by).reduce((a, b) => a + b, 0)}`);
  console.log(`gate coverage: ${cov.calls} resource call(s) in production gates · ${cov.mapped} mapped · ${cov.unmapped.length} unmapped`);
  for (const u of cov.unmapped) console.log(`  🔴 UNMAPPED ${u}`);
  if (process.argv.includes("--table")) for (const r of rows) console.log(`  ${r.verdict.padEnd(16)} ${r.id.padEnd(58)} ${r.members ? `members ${r.members.population} = ${r.members.inPartitions} in ${r.members.partitions} + ${r.members.undeclared} U + ${r.members.ambiguous} A` : ""}`);
  if (process.argv.includes("--check") && (cov.unmapped.length || rows.some((r) => !VERDICTS.includes(r.verdict)))) process.exit(1);
}
