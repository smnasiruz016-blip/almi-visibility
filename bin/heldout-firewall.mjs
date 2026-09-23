#!/usr/bin/env node
/**
 * THE HELD-OUT FIREWALL, OVER THE REAL TREE.
 *
 *   node bin/heldout-firewall.mjs                       report only — reads, prints counts, writes nothing
 *   node bin/heldout-firewall.mjs --check               the same, and exit 1 on any failure
 *   node bin/heldout-firewall.mjs --extra-root=<dir>    also scan another tracked governance tree (a local check; its
 *                                                       *_learn_batch* product-content drafts are reported, not judged)
 *
 * Prints ONLY path, category and counts. Never a matched word.
 */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { queryObservation } from "../src/discovery/row5.mjs";
import { splitPopulation } from "../src/discovery/query-population.mjs";
import { isHeldOut } from "../src/discovery/intent-clusters.mjs";
import { contentHashOf } from "../src/governance/evidence-roles.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { scan, derivePopulation, distinctiveFragments, registeredHashErrors, registryErrors, trackedFiles, HELD_OUT_EVALUATORS } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const registry = EVIDENCE_ROLE_REGISTRY;
const failures = [];
const regErrs = registryErrors(registry);
for (const e of regErrs) failures.push(`REGISTRY ${e.code} ${e.id ?? ""}`);

const store = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const derive = (observationId) => {
  const rows = queryObservation(store, observationId).value.rows;
  const human = splitPopulation(rows).human;
  const members = human.filter((r) => isHeldOut(r.query)).map((r) => r.query);
  const memberSet = new Set(members.map((m) => m.toLowerCase()));
  return { members, others: rows.map((r) => r.query).filter((q) => !memberSet.has(String(q).toLowerCase())) };
};
const files = trackedFiles(REPO);
const productionTexts = files.filter((p) => /^(src|bin|tools|config)\/.*\.mjs$/.test(p)).map((p) => readFileSync(join(REPO, p), "utf8"));
const evaluatorSources = HELD_OUT_EVALUATORS.map((p) => readFileSync(join(REPO, p), "utf8"));

console.log("HELD-OUT FIREWALL — role and exposure; counts only\n");
for (const entry of registry.filter((e) => e.role === "RETIRED_CONTAMINATED")) {
  const pop = derivePopulation(entry, derive);
  if (!pop.ok) { failures.push(`${pop.code} ${entry.id}`); console.log(`  🔴 ${pop.code}: ${pop.why}`); continue; }
  const fragments = distinctiveFragments(pop.members, pop.others, productionTexts);
  console.log(`RETIRED SET ${entry.id} · ${pop.members.length} member(s) · fingerprint re-derived and matched · ${fragments.length} distinctive fragment(s)`);
  const engine = scan({ registry, root: "engine", base: REPO, files, members: pop.members, fragments, evaluatorSources });
  console.log(`\nENGINE — ${files.length} tracked file(s) · ${engine.sealedExcluded} sealed path(s) excluded unread`);
  /* F08 §6.2 — the role guard emitted one metadata-only event per decision into this run's diagnostic sink. Counted
   * here, never persisted: a read-only check may not change the durable trail. */
  const traced = (o) => engine.guardEvents.filter((e) => e.outcome === o).length;
  console.log(`  role decisions traced by the guard: ${engine.guardEvents.length} (ALLOWED ${traced("ALLOWED")} · REFUSED ${traced("REFUSED")}) — diagnostic sink, ${engine.guardDurable ? "DURABLE" : "not persisted"}`);
  for (const r of engine.rows) console.log(`  ${r.disposition.padEnd(34)} ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
  for (const f of engine.failures) failures.push(`${f.disposition} ${f.path}`);
  const extra = process.argv.find((a) => a.startsWith("--extra-root="))?.slice("--extra-root=".length);
  if (extra) {
    const xf = trackedFiles(extra);
    const drafts = xf.filter((p) => /_learn_batch/.test(p));
    const x = scan({ registry, root: "extra", base: extra, files: xf.filter((p) => !/_learn_batch/.test(p)), members: pop.members, fragments, evaluatorSources });
    const xd = scan({ registry, root: "extra", base: extra, files: drafts, members: pop.members, fragments, evaluatorSources });
    console.log(`\nEXTRA ROOT — ${xf.length} tracked file(s) · ${drafts.length} product-content draft(s) reported, not judged`);
    for (const r of x.rows) console.log(`  ${r.disposition.padEnd(34)} ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
    for (const r of xd.rows) console.log(`  REPORTED_PRODUCT_CONTENT_DRAFT     ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
    for (const f of x.failures) failures.push(`EXTRA ${f.disposition} ${f.path}`);
  }
}
for (const e of registeredHashErrors({ registry, root: "engine", base: REPO, hashOf: contentHashOf })) failures.push(`${e.code} ${e.id}`);
console.log(`\nFAILURES: ${failures.length}`);
for (const f of failures) console.log(`  🔴 ${f}`);
if (process.argv.includes("--check") && failures.length) process.exit(1);
