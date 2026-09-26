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
import { governedGuardSink } from "../src/governance/governed-run.mjs";
import { requiredSources, manifestErrors } from "../src/governance/mandatory-reading.mjs";
import { MANDATORY_READING, BOARD_AND_AUTHORITY_CONFIG } from "../config/governance/mandatory-reading.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { census as authorityCensus } from "../src/authority/corpus.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { scan, derivePopulation, distinctiveFragments, registeredHashErrors, registryErrors, trackedFiles, HELD_OUT_EVALUATORS, censusEntries, censusNewRoles } from "../tools/heldout-firewall.mjs";
import { populationCommitment } from "../src/heldout/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const registry = EVIDENCE_ROLE_REGISTRY;
/* 🔴 F07 §5.3, as repaired by the owner's ruling of 23 September 2026 (option b). This run's decisions go through F08's
 * shipped boundary — the production trail, or the confined store in a verified test context — and the sink DERIVES
 * which of them the trail keeps (guard-audit.mjs `auditClassOf`): a clean sweep only CLASSIFIES (a registered
 * observed-data file judged lawful; a sealed path excluded unread) and appends NOTHING; a real refusal or a
 * contamination finding in the same run is an access or a violation and IS appended. */
const RUN_AT = isoSeconds(Date.now());
const AUDIT = governedGuardSink({ repo: REPO, correlationId: `run:heldout-firewall:${RUN_AT}`, now: RUN_AT.slice(0, 10), actor: "bin/heldout-firewall.mjs" });
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
const productionTexts = files.filter((p) => /^(src|bin|tools|config|subjects)\/.*\.mjs$/.test(p)).map((p) => readFileSync(join(REPO, p), "utf8"));
const evaluatorSources = HELD_OUT_EVALUATORS.map((p) => readFileSync(join(REPO, p), "utf8"));

console.log("HELD-OUT FIREWALL — role and exposure; counts only\n");
/* 🔴 F07 AMENDMENT 1 (governance a0b7e4b): the census enumerates EVERY registered sealed held-out role, with each role's
 * population stated — including zero. A zero is reported as NOT_MEASURED (F06), never as a clean real result. */
const CENSUS = censusEntries(registry);
const ofRole = (role) => CENSUS.filter((e) => e.role === role);
console.log(`SEALED ROLES ENUMERATED — RETIRED_CONTAMINATED ${ofRole("RETIRED_CONTAMINATED").length} · HELD_OUT_EVIDENCE ${ofRole("HELD_OUT_EVIDENCE").length} · MARKING_KEY ${ofRole("MARKING_KEY").length}`);
if (!ofRole("HELD_OUT_EVIDENCE").length && !ofRole("MARKING_KEY").length) console.log("  HELD_OUT_EVIDENCE and MARKING_KEY — 0 registered: the real population is NOT_MEASURED (F06); nothing real to scan, and zero is not a pass\n");
for (const entry of ofRole("RETIRED_CONTAMINATED")) {
  const pop = derivePopulation(entry, derive);
  if (!pop.ok) { failures.push(`${pop.code} ${entry.id}`); console.log(`  🔴 ${pop.code}: ${pop.why}`); continue; }
  const fragments = distinctiveFragments(pop.members, pop.others, productionTexts);
  console.log(`RETIRED SET ${entry.id} · ${pop.members.length} member(s) · fingerprint re-derived and matched · ${fragments.length} distinctive fragment(s)`);
  const engine = scan({ registry, root: "engine", base: REPO, files, members: pop.members, fragments, evaluatorSources, audit: AUDIT });
  console.log(`\nENGINE — ${files.length} tracked file(s) · ${engine.sealedExcluded} sealed path(s) excluded unread`);
  /* F08 §6.2 — the role guard emitted one metadata-only event per decision into this run's diagnostic sink. Counted
   * here, never persisted: a read-only check may not change the durable trail. */
  const traced = (o) => engine.guardEvents.filter((e) => e.outcome === o).length;
  console.log(`  role decisions traced by the guard: ${engine.guardEvents.length} (ALLOWED ${traced("ALLOWED")} · REFUSED ${traced("REFUSED")}) — appended to the audit trail: ${AUDIT.emitted} (access or violation) · classification only, not appended: ${AUDIT.classified}`);
  for (const r of engine.rows) console.log(`  ${r.disposition.padEnd(34)} ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
  for (const f of engine.failures) failures.push(`${f.disposition} ${f.path}`);
  const extra = process.argv.find((a) => a.startsWith("--extra-root="))?.slice("--extra-root=".length);
  if (extra) {
    const xf = trackedFiles(extra);
    const drafts = xf.filter((p) => /_learn_batch/.test(p));
    const x = scan({ registry, root: "extra", base: extra, files: xf.filter((p) => !/_learn_batch/.test(p)), members: pop.members, fragments, evaluatorSources, audit: AUDIT });
    const xd = scan({ registry, root: "extra", base: extra, files: drafts, members: pop.members, fragments, evaluatorSources, audit: AUDIT, judge: false });
    console.log(`\nEXTRA ROOT — ${xf.length} tracked file(s) · ${drafts.length} product-content draft(s) reported, not judged`);
    for (const r of x.rows) console.log(`  ${r.disposition.padEnd(34)} ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
    for (const r of xd.rows) console.log(`  REPORTED_PRODUCT_CONTENT_DRAFT     ${r.category.padEnd(22)} full ${String(r.full).padStart(3)} · fragments ${String(r.frag).padStart(2)} · ${r.path}`);
    for (const f of x.failures) failures.push(`EXTRA ${f.disposition} ${f.path}`);
  }
}
/* 🔴 F07 AMENDMENT 1 — every registered HELD_OUT_EVIDENCE and MARKING_KEY entry: its members obtained inside the boundary
 * (a registered derivation, or the files under its sealed prefix — that read recorded as a durable ACCESS), then the same
 * scan, the finding named by role. An entry that cannot be read or verified FAILS the census; it is never skipped. */
{
  const nr = censusNewRoles({ registry, root: "engine", base: REPO, files, roots: { engine: REPO }, filesOf: (r) => (r === "engine" ? files : []), derivers: { HOLD_OUT_RULE: derive }, commitment: populationCommitment, productionTexts, evaluatorSources, audit: AUDIT });
  for (const x of nr.results) {
    if (!x.ok) { console.log(`  🔴 ${x.code}: ${x.why}`); continue; }
    console.log(`${x.role} ${x.id} · ${x.members} member(s) · source ${x.source}${x.files ? ` (${x.files} file(s) under its sealed prefix)` : ""} · ${x.fragments} distinctive fragment(s)`);
    for (const row of x.rows) console.log(`  ${row.disposition.padEnd(34)} ${row.category.padEnd(22)} full ${String(row.full).padStart(3)} · fragments ${String(row.frag).padStart(2)} · ${row.path}`);
  }
  failures.push(...nr.failures);
}
for (const e of registeredHashErrors({ registry, root: "engine", base: REPO, hashOf: contentHashOf })) failures.push(`${e.code} ${e.id}`);

/* 🔴 F07 §5.6 — THE MANDATORY-READING MANIFEST, checked against what the loaders ACTUALLY read, in both directions:
 * a required source missing from it, or a sealed / protected entry in it, is a failure of this firewall. */
{
  const required = requiredSources({ corpus: AUTHORITY_CORPUS, dispositions: authorityCensus(AUTHORITY_CORPUS, CORPUS_PROVENANCE.now).dispositions, acceptances: ACCEPTANCES, boardConfig: BOARD_AND_AUTHORITY_CONFIG });
  const errs = manifestErrors({ manifest: MANDATORY_READING, required, registry });
  console.log(`\nMANDATORY READING — ${MANDATORY_READING.length} declared · ${required.length} required by the loaders · sealed or protected in it: ${errs.filter((e) => e.code !== "REQUIRED_SOURCE_MISSING").length} · required but missing: ${errs.filter((e) => e.code === "REQUIRED_SOURCE_MISSING").length}`);
  for (const e of errs) failures.push(`MANIFEST ${e.code} ${e.source ?? `entry ${e.at}`}`);
}
/* The whole run's audit, AFTER every root was scanned. The per-engine line above is printed before the extra root is
 * scanned; on 24 September 2026 it read "appended 0" while the extra root's draft scan appended 17. */
console.log(`\nAUDIT (whole run) — appended to the audit trail: ${AUDIT.emitted} · classification only, not appended: ${AUDIT.classified}`);
console.log(`\nFAILURES: ${failures.length}`);
for (const f of failures) console.log(`  🔴 ${f}`);
if (process.argv.includes("--check") && failures.length) process.exit(1);
