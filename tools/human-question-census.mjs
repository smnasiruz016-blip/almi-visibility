#!/usr/bin/env node
/**
 * 🔴 F10 · THE HUMAN-QUESTION CENSUS — COUNT-ONLY, OVER THE REAL DECLARATIONS AND THE REAL STORE.
 *
 *   node tools/human-question-census.mjs [--check]
 *
 * READ-ONLY. It writes nothing and records nothing. It prints counts and codes only — never a query, URL, host or tenant id.
 *   C1  every ACTIVE tenant's partition decided by F02 and read through the production partition reader; the full accounting
 *       with its remainder; reconciliation with the committed accounting (a difference FAILS);
 *   C2  the frozen mechanism over every eligible tenant's items: entries, abstentions, per-class counts, trace faults;
 *   C7  the sequence-evidence census over every tracked store of both repositories (sealed paths excluded unread): the
 *       reopen trigger fires on the first store carrying a sequence field.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { COMMITTED_ACCOUNTING, SEQUENCE_FIELD_NAMES } from "../config/human-questions.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { pinnedObservationRows, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";
import { accountPopulation, reconcileWithCommitted, retiredMembers } from "../src/discovery/human-question-population.mjs";
import { runMechanism, outputFaults, CLASSES } from "../src/discovery/human-questions.mjs";
import { allocate } from "../src/discovery/seat-allocation.mjs";
import { SCORING_RULE } from "../config/human-questions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * C7 · which files carry a sequence field. `files` are { root, path, text() }. A field is a JSON key, matched case-insensitively
 * with "-" and "_" ignored. Returns counts and the paths that fire — never a value.
 */
export function sequenceFieldCensus({ files, names = SEQUENCE_FIELD_NAMES }) {
  const wanted = new Set(names.map((n) => n.toLowerCase().replace(/[-_]/g, "")));
  const hits = [];
  for (const f of files) {
    const keys = [...String(f.text()).matchAll(/"([A-Za-z0-9_-]{2,40})"\s*:/g)].map((m) => m[1].toLowerCase().replace(/[-_]/g, ""));
    if (keys.some((k) => wanted.has(k))) hits.push(`${f.root}:${f.path}`);
  }
  return { scanned: files.length, withSequenceField: hits.length, hits, trigger: hits.length > 0 ? "FIRED" : "NOT_FIRED", state: hits.length > 0 ? "MEASURABLE_REOPEN_REQUIRED" : "NOT_MEASURED" };
}

/** The tracked store files of both repositories (.json/.jsonl), sealed paths excluded before they are opened. */
export function trackedStoreFiles({ engine = REPO, data = join(REPO, "..", "almi-visibility-data"), registry = EVIDENCE_ROLE_REGISTRY } = {}) {
  const ls = (dir) => execFileSync("git", ["-C", dir, "ls-files"], { encoding: "utf8" }).split("\n").filter((p) => /\.jsonl?$/.test(p));
  const out = [];
  let sealedExcluded = 0;
  for (const p of ls(engine)) { if (isSealed(registry, "engine", p)) { sealedExcluded += 1; continue; } out.push({ root: "engine", path: p, text: () => readFileSync(join(engine, p), "utf8") }); }
  for (const p of ls(data)) out.push({ root: "data", path: p, text: () => readFileSync(join(data, p), "utf8") });
  return { files: out, sealedExcluded };
}

/** C1 + C2 over the real declarations and store. Returns counts only (plus per-tenant counts keyed by position, not id). */
export function realCensus({ repo = REPO } = {}) {
  const records = createJsonlStore(join(repo, "runs", "evidence", "evidence.jsonl")).readAll();
  const rows = pinnedObservationRows({ repo, records });
  const resolve = createTenantResolver();
  const active = resolve.declarations.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
  const decisions = {};
  const partitions = new Map();
  for (const t of active) {
    const d = decidePartition(resolve, t);
    decisions[d.outcome] = (decisions[d.outcome] ?? 0) + 1;
    const p = readTenantPartition({ decision: d, tenantId: t, resolve, rows });
    if (p.items.length) partitions.set(t, p);
  }
  const retired = retiredMembers({ records, entry: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED") });
  const account = accountPopulation({ start: rows.length, partitions, retired });
  const diffs = reconcileWithCommitted(account, COMMITTED_ACCOUNTING);
  const mech = { tenants: 0, items: 0, entries: 0, abstentions: 0, perClass: Object.fromEntries(CLASSES.map((c) => [c, 0])), traceFaults: [] };
  for (const [, items] of account.eligibleItems) {
    if (!items.length) continue;
    const out = runMechanism(items);
    mech.tenants += 1; mech.items += items.length; mech.entries += out.size;
    for (const o of out.values()) { if (!o.classes.length) mech.abstentions += 1; for (const c of o.classes) mech.perClass[c] += 1; }
    mech.traceFaults.push(...outputFaults(items, out));
  }
  mech.traceFaults = [...new Set(mech.traceFaults)];
  /* C3 · the adopted allocation over the recounted capacities — seat COUNTS only; nothing is selected. */
  const caps = [...account.perTenant].filter(([, c]) => c.eligible > 0).map(([id, c]) => ({ id, cap: c.eligible }));
  const seats = allocate(caps, SCORING_RULE.declaredItems);
  const allocation = { seatsDescending: [...seats.values()].sort((a, b) => b - a), consumedToCapacity: caps.filter((c) => seats.get(c.id) === c.cap).length };
  return { activeTenants: active.length, decisions, partitionsWithRows: partitions.size, partitionArithmetic: [...partitions.values()][0]?.arithmetic ?? null, totals: account.totals, reconciliation: account.reconciliation, remainder: account.remainder, eligibleTenants: [...account.perTenant.values()].filter((c) => c.eligible > 0).length, eligibleCapacities: [...account.perTenant.values()].map((c) => c.eligible).filter(Boolean).sort((a, b) => b - a), diffs, mechanism: mech, allocation };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const r = realCensus();
  const seq = sequenceFieldCensus(trackedStoreFiles());
  const failures = [...(JSON.stringify(r.allocation.seatsDescending) !== JSON.stringify(COMMITTED_ACCOUNTING.allocationDescending) ? ["C3_ALLOCATION_DIFFERS"] : []), ...r.diffs.map((d) => `C1_RECONCILIATION ${d}`), ...(r.remainder !== 0 ? ["C1_REMAINDER"] : []), ...r.mechanism.traceFaults.map((f) => `C2 ${f}`), ...(r.mechanism.entries !== r.mechanism.items ? ["C2_ENTRY_COUNT"] : [])];
  console.log("HUMAN-QUESTION CENSUS — counts only\n");
  console.log(`C1 · ${r.activeTenants} ACTIVE tenants decided (${Object.entries(r.decisions).map(([k, v]) => `${k} ${v}`).join(" · ")}) · ${r.partitionsWithRows} partitions hold rows · partition arithmetic ${JSON.stringify(r.partitionArithmetic)}`);
  console.log(`C1 · ${r.reconciliation} · remainder ${r.remainder} · eligible tenants ${r.eligibleTenants} · capacities ${r.eligibleCapacities.join(",")} · reconciliation with the committed accounting: ${r.diffs.length ? r.diffs.join(",") : "IDENTICAL"}`);
  console.log(`C2 · ${r.mechanism.tenants} tenants · ${r.mechanism.items} items · ${r.mechanism.entries} entries · ${r.mechanism.abstentions} abstentions · ${CLASSES.map((c) => `${c} ${r.mechanism.perClass[c]}`).join(" · ")} · trace faults ${r.mechanism.traceFaults.length} · evidence state INFERRED`);
  console.log(`C3 · allocation of ${SCORING_RULE.declaredItems} seats (adopted as written): ${r.allocation.seatsDescending.join(",")} · tenants consumed to capacity ${r.allocation.consumedToCapacity} · nothing selected`);
  console.log(`C7 · ${seq.scanned} tracked store files scanned · ${seq.withSequenceField} carry a sequence field · reopen trigger ${seq.trigger} · follow-up limb ${seq.state}`);
  console.log(`\nFAILURES: ${failures.length}`);
  for (const f of failures) console.log(`  🔴 ${f}`);
  if (process.argv.includes("--check") && failures.length) process.exit(1);
}
