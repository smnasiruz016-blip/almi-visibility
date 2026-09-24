#!/usr/bin/env node
/**
 * WHICH PROFESSION IS WEAKEST? — measured, so the next experiment is the HARDEST
 * one rather than the one that is going to pass.
 *
 *   node bin/profession-census.mjs
 *
 * Reads almi-oet's organisations.json READ-ONLY (the SCOPE LAW permits reading
 * any product; nothing is written, committed or changed there).
 *
 * 🔴 The raw organisation count is dominated by universities, NHS trusts and
 * recruiters. A profession page's regulator block is built from REGULATORS, so
 * that is what gets counted — and it is what separated nursing (6 regulators, 6
 * publishing a grade) from speech pathology (4 and 2, with New Zealand having
 * none at all).
 */
import { readFileSync } from "node:fs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/profession-census.mjs", governed: false, repoUrl: import.meta.url, resources: [RESOURCES.operatorDirectory("a connected product's repository files")] });

const d = JSON.parse(readFileSync("C:/Projects/almi-oet/src/lib/oet-seo/organisations.json", "utf8"));
const orgs = d.organisations;

const types = {};
for (const o of orgs) types[o.type ?? "(none)"] = (types[o.type ?? "(none)"] ?? 0) + 1;
console.log("\nORGANISATION TYPES IN THE DATASET");
console.log("=".repeat(70));
for (const [t, n] of Object.entries(types).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);

const REGULATOR_TYPES = Object.keys(types).filter((t) => /regulator/i.test(t));
console.log(`\ncounting types matching /regulator/i: ${JSON.stringify(REGULATOR_TYPES)}`);

const PROFESSIONS = [
  "Dentistry", "Dietetics", "Medicine", "Nursing", "Occupational Therapy", "Optometry",
  "Pharmacy", "Physiotherapy", "Podiatry", "Radiography", "Speech Pathology", "Veterinary Science",
];
const DESTINATIONS = ["United Kingdom", "Ireland", "Australia", "New Zealand"];

const rows = PROFESSIONS.map((p) => {
  const regs = orgs.filter(
    (o) => (o.professions ?? []).includes(p) && REGULATOR_TYPES.includes(o.type) && DESTINATIONS.includes(o.country),
  );
  const byDest = Object.fromEntries(DESTINATIONS.map((c) => [c, regs.filter((o) => o.country === c)]));
  const withGrade = regs.filter((o) => o.grade && Object.keys(o.grade).length > 0);
  return {
    p,
    total: regs.length,
    withGrade: withGrade.length,
    missing: DESTINATIONS.filter((c) => byDest[c].length === 0),
    byDest,
  };
});

rows.sort((a, b) => a.total - b.total || a.withGrade - b.withGrade);

console.log("\n🔴 DESTINATION REGULATORS PER PROFESSION — the claim-bearing entities");
console.log("=".repeat(96));
console.log("profession".padEnd(22) + "regulators".padStart(11) + "withGrade".padStart(11) + "   destinations with NO regulator");
console.log("-".repeat(96));
for (const r of rows) {
  console.log(
    r.p.padEnd(22) + String(r.total).padStart(11) + String(r.withGrade).padStart(11) +
    "   " + (r.missing.length ? "🔴 " + r.missing.join(", ") : "—"),
  );
}

console.log("\nNAMED, FOR THE WEAKEST FIVE AND FOR NURSING");
console.log("=".repeat(96));
for (const r of [...rows.slice(0, 5), rows.find((x) => x.p === "Nursing")]) {
  console.log(`\n${r.p}  —  ${r.total} regulators, ${r.withGrade} publishing an OET grade`);
  for (const c of DESTINATIONS) {
    const names = r.byDest[c].map((o) => `${o.name}${o.grade && Object.keys(o.grade).length ? ` [${Object.entries(o.grade).map(([k, v]) => k[0].toUpperCase() + v).join(" ")}]` : " [no grade]"}`);
    console.log(`   ${c.padEnd(16)} ${names.length ? names.join(" · ") : "🔴 NONE"}`);
  }
}
