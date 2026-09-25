#!/usr/bin/env node
/**
 * ROW 50 — IS EVERY GOVERNED RECORD LABELLED ON ITS FACE?
 *
 *   node bin/label-on-face.mjs --product=<id>           report only — it reads, prints and exits; it writes nothing
 *   node bin/label-on-face.mjs --product=<id> --check   the report, and exit 1 unless Row 50's census passes
 *
 * Judged from each record's declarations through the production dimension judge, whatever its verification date
 * (owner ruling, 21 September 2026). A date exemption keeps a record stored; it never makes it Row 50 evidence.
 */
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { row50Census } from "../src/evidence/label-on-face.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { factRegistryRef, externalRootContaining } from "../src/adapter/external-subject.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: "node bin/label-on-face.mjs --product=<id> [--check]" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/label-on-face.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/label-on-face.mjs --product=<id> [--check]", scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const root = externalRootContaining(PRODUCT.factsDir, process.env);
const ref = root ? factRegistryRef({ factsDir: PRODUCT.factsDir, rootPath: root.path }) : null;
if (!ref) {
  console.log("🔴 the registry has no declared resource reference — its subject cannot be established. NOT MEASURED.");
  process.exit(process.argv.includes("--check") ? 1 : 0);
}
const subject = { ...ref, evidenceClass: "REAL" };
// Every record comes from the one registry the loader read: that is the declared registry, never read from an id.
const census = row50Census({ records, subject, registryOf: () => subject, resolve: createTenantResolver() });
const c = census.counts;

console.log(`ROW 50 — LABELLED ON ITS FACE · registry ${subject.resourceKind} ${subject.resourceRef} · ${records.length} record(s) loaded`);
console.log(`  considered ${c.considered} = governed ${c.governed} + derived ${c.DERIVED} · LABELLED ${c.LABELLED} · UNLABELLED ${c.UNLABELLED} · INVALID ${c.INVALID} · DERIVED ${c.DERIVED} · remainder ${c.remainder}`);
const byState = new Map();
for (const r of census.results) byState.set(r.state, [...(byState.get(r.state) ?? []), r]);
for (const [state, rs] of byState) {
  console.log(`\n${state} (${rs.length})`);
  for (const r of rs) console.log(`  ${r.id} [${r.verificationState}]${r.reasons.length ? ` — ${r.reasons.join(", ")}` : ""}`);
}
const codes = new Map();
for (const r of census.results) for (const x of r.reasons) { const k = x.split(":")[0]; codes.set(k, (codes.get(k) ?? 0) + 1); }
console.log(`\nREASON CODES: ${[...codes].map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}`);
console.log(`ROW 50 VERDICT: ${census.verdict}`);
for (const r of census.reasons) console.log(`  🔴 ${r.code}: ${r.why}`);
if (process.argv.includes("--check") && census.verdict !== "PASS") process.exitCode = 1;
