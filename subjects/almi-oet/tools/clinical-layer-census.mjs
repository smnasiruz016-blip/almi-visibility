#!/usr/bin/env node
/**
 * DOES THE CLINICAL LAYER DISTINGUISH? — similarity numbers only.
 *
 * 🔴 OET IP LAW: this compares SETS of short enum tokens across professions and
 * prints ONLY counts and Jaccard numbers. No token, sentence, case note, script,
 * prompt or option is ever printed. Nothing in almi-oet is modified.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scopedEntryPoint } from "../../../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../../../src/tenancy/scoped-run.mjs";

const GEN = "C:/Projects/almi-oet/scripts/seed/gen";
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "subjects/almi-oet/tools/clinical-layer-census.mjs", governed: false, resources: [RESOURCES.operatorDirectory("a connected product's repository files")] });
const PROFESSIONS = [
  "dentistry", "dietetics", "medicine", "nursing", "occupational_therapy", "optometry",
  "pharmacy", "physiotherapy", "podiatry", "radiography", "speech_pathology", "veterinary_science",
];
// Fields that carry the CLINICAL layer beta-g identified: who the letter goes to,
// where it happens, what the concern is.
const CLINICAL_FIELDS = ["letterType", "recipient", "setting", "topicTag", "patientRole", "candidateRole", "taskType"];

// Values are hashed the moment they are read, so no token can reach stdout even
// by accident. Set comparison works identically on digests.
const h = (v) => createHash("sha256").update(v.toLowerCase().trim()).digest("hex").slice(0, 12);

function valuesFor(profession, field) {
  const out = new Set();
  for (const f of readdirSync(GEN).filter((x) => x.includes(profession))) {
    const src = readFileSync(join(GEN, f), "utf8");
    for (const m of src.matchAll(new RegExp('^\\s+"?' + field + '"?\\s*:\\s*"([^"]{1,80})"', "gm"))) out.add(h(m[1]));
  }
  return out;
}

const jac = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni === 0 ? null : inter / uni;
};

console.log("DOES THE CLINICAL LAYER DISTINGUISH? — values hashed before comparison");
console.log("=".repeat(88));
console.log("field".padEnd(16) + "distinct/profession".padStart(20) + "mean pairwise Jaccard".padStart(24) + "verdict".padStart(24));
console.log("-".repeat(88));

for (const field of CLINICAL_FIELDS) {
  const sets = Object.fromEntries(PROFESSIONS.map((p) => [p, valuesFor(p, field)]));
  const sizes = PROFESSIONS.map((p) => sets[p].size);
  if (sizes.every((s) => s === 0)) { console.log(field.padEnd(16) + "0".padStart(20) + " — field absent".padStart(24)); continue; }
  const pairs = [];
  for (let i = 0; i < PROFESSIONS.length; i++)
    for (let j = i + 1; j < PROFESSIONS.length; j++) {
      const v = jac(sets[PROFESSIONS[i]], sets[PROFESSIONS[j]]);
      if (v !== null) pairs.push(v);
    }
  const mean = pairs.reduce((a, b) => a + b, 0) / pairs.length;
  const avgSize = (sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1);
  const verdict = mean <= 0.15 ? "🔴 HIGHLY distinguishing" : mean <= 0.5 ? "partly distinguishing" : "shared across professions";
  console.log(field.padEnd(16) + String(avgSize).padStart(20) + mean.toFixed(4).padStart(24) + verdict.padStart(24));
}

console.log("\nAND THE SAME MEASURE ON THE FULL ITEM TEXT (hashed 5-word shingles)");
console.log("=".repeat(88));
// Shingle the whole file, hash every shingle, compare. Nothing readable emerges.
function shingleDigests(profession) {
  const s = new Set();
  for (const f of readdirSync(GEN).filter((x) => x.includes(profession))) {
    const words = readFileSync(join(GEN, f), "utf8").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i + 5 <= words.length; i++) s.add(h(words.slice(i, i + 5).join(" ")));
  }
  return s;
}
const digs = Object.fromEntries(PROFESSIONS.map((p) => [p, shingleDigests(p)]));
const pairs = [];
for (let i = 0; i < PROFESSIONS.length; i++)
  for (let j = i + 1; j < PROFESSIONS.length; j++) pairs.push(jac(digs[PROFESSIONS[i]], digs[PROFESSIONS[j]]));
pairs.sort((a, b) => a - b);
const mean = pairs.reduce((a, b) => a + b, 0) / pairs.length;
console.log(`  66 profession pairs · mean ${mean.toFixed(4)} · min ${pairs[0].toFixed(4)} · max ${pairs[pairs.length - 1].toFixed(4)}`);
console.log(`  (market benchmark measured by beta-g on a competitor: 0.0828 – 0.1305)`);
console.log(`  (our regulator-only /speech-pathology page: 0.6974)`);
