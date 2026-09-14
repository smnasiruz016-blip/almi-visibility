#!/usr/bin/env node
/**
 * ROW 60 — THE CONSEQUENCE REGISTER, RECONCILED; AND EVERY PRESENTED PRIORITY'S BASIS, CHECKED.
 *
 *   node bin/consequence-census.mjs          report only — it reads, prints and exits; it writes nothing
 *
 * Prints every finding class present in the store beside its register entry (all UNCLASSIFIED until the owner
 * rules), reconciles the two line by line, and checks that every drafted recommendation's priority states its
 * basis and the register entries that applied — with no level the register does not declare.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { reconcileRegister, priorityCensus } from "../src/audit/consequence.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const audit = read("runs/audit");

const rec = reconcileRegister({ records: audit, register: CONSEQUENCE_REGISTER });
const fields = computeRecommendationFields({
  recommendations: audit.filter((r) => r.record_type === "draft_recommendation"),
  links: audit.filter((r) => r.record_type === "recommendation_evidence"),
  records: [...audit, ...read("runs/evidence"), ...read("runs/crawl")],
  ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
  consequenceRegister: CONSEQUENCE_REGISTER,
});
const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });

console.log("ROW 60 — CONSEQUENCE REGISTER\n");
console.log(`CLASSES IN USE: ${rec.classesInUse.length} · register entries: ${rec.entries} · UNCLASSIFIED: ${rec.unclassified.length}\n`);
console.log("| finding class | level | what it is |");
console.log("|---|---|---|");
for (const k of rec.classesInUse) console.log(`| ${k} | ${CONSEQUENCE_REGISTER[k]?.level ?? "🔴 NO ENTRY"} | ${CONSEQUENCE_REGISTER[k]?.what ?? ""} |`);
const list = (label, xs, fmt) => {
  console.log(`${xs.length ? "🔴" : "✅"} ${label}: ${xs.length}`);
  for (const x of xs) console.log(`     ${fmt(x)}`);
};
console.log("");
list("MISSING — a class in use with no register entry", rec.missing, (x) => x);
list("STALE — a register entry for a class not in use", rec.stale, (x) => x);
list("INVALID entry", rec.invalid, (x) => `${x.class}: ${x.why}`);
if (rec.vacuous) console.log("🔴 VACUOUS — no finding class is in use");

console.log(`\nPRESENTED RECOMMENDATIONS CHECKED: ${pc.checked}`);
for (const f of fields) {
  const p = f.priority;
  const entries = p.consequence.entries.map((e) => `${e.issue_class}=${e.level}`).join(", ") || "none";
  console.log(`  ${f.recommendation_id}: priority ${p.state === "DERIVED" ? `${p.rank} of ${p.of}` : "UNKNOWN"} · basis ${p.basisKind} · entries ${entries} · consequence ${p.consequence.state} · consequence-weighted rank ${p.consequenceWeightedRank.state}`);
}
list("PRIORITY ERROR", pc.errors, (x) => `[${x.limb}] ${x.id}: ${x.why}`);

console.log("\n🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW. Every level is the owner's to rule; none was filled in here.");
const ok = rec.ok && pc.ok;
console.log(ok ? "\n✅ the register reconciles and every priority states its basis and its entries" : "\n🔴 CENSUS FAILED");
process.exit(ok ? 0 : 1);
