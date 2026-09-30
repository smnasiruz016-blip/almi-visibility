#!/usr/bin/env node
/**
 * F90 · FALSIFIABILITY OF FINDINGS — the census over every recorded actionable finding; count-only.
 *
 *   node bin/finding-falsifiability.mjs      READ-ONLY; nothing fetched, re-run or written
 *
 * 🔴 Each refutation part comes from the held check's declaration or is NOT MEASURED with the missing fact named — never freehand.
 * Census: src/audit/f90-falsifiability.mjs · stores and methods: src/audit/f90-falsifiability-reader.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readFalsifiabilityCensus } from "../src/audit/f90-falsifiability-reader.mjs";

scopedEntryPoint({ entry: "bin/finding-falsifiability.mjs", governed: false, resources: [RESOURCES.runArtefacts("audit finding stores")] });

const { census: c, storesListed } = readFalsifiabilityCensus();
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${typeof n === "object" ? JSON.stringify(n) : n}`).join(" · ") || "none";
const perStore = {};
for (const f of c.population.actionable) for (const s of new Set(f.stores)) perStore[s] = (perStore[s] ?? 0) + 1;
const facts = {};
for (const r of c.refutations) for (const m of r.missing) facts[`${m.part}: ${m.fact}`] = (facts[`${m.part}: ${m.fact}`] ?? 0) + 1;
console.log("F90 · FALSIFIABILITY OF FINDINGS — recorded data only, count-only");
console.log(`  bound            ${c.bound} · ${storesListed} tracked store(s) listed`);
console.log(`  actionable       ${c.refutations.length} · counted apart: ${fmt(c.population.apart)} (OPEN but not FAIL by verdict: ${fmt(c.population.verdictsApart)})`);
for (const [s, n] of Object.entries(perStore)) console.log(`    store          ${s} · ${n} actionable`);
console.log(`  by method        ${fmt(c.byMethod)}`);
console.log(`  by class         ${fmt(c.byClass)}`);
console.log(`  by missing part  ${fmt(c.byMissingPart)}`);
for (const [f, n] of Object.entries(facts)) console.log(`    NOT MEASURED   ${n} × ${f}`);
for (const u of c.population.unreadable) console.log(`  UNREADABLE       ${u.store} · ${u.reason}${u.count ? ` · ${u.count}` : ""}`);
console.log(`  FALSIFIABLE ${c.falsifiable} · NOT FALSIFIABLE ${c.notFalsifiable}`);
console.log(`  verdict          ${c.verdict} — ${c.why}`);
console.log(`  limit            ${c.limit}`);
