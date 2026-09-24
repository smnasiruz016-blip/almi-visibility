#!/usr/bin/env node
/**
 * 🔴 F06 §4 · THE STATE-VOCABULARY CENSUS — every `*State` name in the tracked src/, bin/, tools/ and config/ trees,
 * against its registration in config/evidence-state-vocabulary.mjs (24 September 2026).
 *
 *   node tools/evidence-state-vocabulary.mjs    exit 1 on a name found and not registered, a name registered and no longer
 *                                               found, or a registration outside the nine classes
 *
 * The pre-flight measured 33 distinct names with `grep -rhoE '\b[a-zA-Z]+State\b' src bin`; this reads the same
 * pattern from the tracked files themselves, so an untracked scratch file cannot move the count. It never decides what a
 * name MEANS — the register records that, from each name's defining code; this only keeps the register complete.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_VOCABULARY, VOCABULARY_CLASSES } from "../config/evidence-state-vocabulary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const STATE_NAME = /\b[a-zA-Z]+State\b/g;

/** The distinct `*State` names in the given texts, each with how many times it occurs. */
export function stateNamesIn(texts) {
  const counts = new Map();
  for (const t of texts) for (const m of t.matchAll(STATE_NAME)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  return counts;
}

/** The tracked sources the census reads. The register file itself is excluded: it NAMES every entry by construction. */
export function trackedSources() {
  return execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "tools", "config", "subjects"], { encoding: "utf8" }).trim().split("\n")
    .filter((p) => /\.mjs$/.test(p) && p !== "config/evidence-state-vocabulary.mjs" && p !== "tools/evidence-state-vocabulary.mjs");
}

export function vocabularyCensus({ texts = trackedSources().map((p) => readFileSync(join(REPO, p), "utf8")), register = STATE_VOCABULARY } = {}) {
  const found = stateNamesIn(texts);
  const registered = Object.keys(register);
  const unregistered = [...found.keys()].filter((n) => !Object.hasOwn(register, n)).sort();
  const stale = registered.filter((n) => !found.has(n)).sort();
  const badClass = registered.filter((n) => !VOCABULARY_CLASSES.includes(register[n].class) || !register[n].reason);
  const byClass = Object.fromEntries(VOCABULARY_CLASSES.map((c) => [c, registered.filter((n) => register[n].class === c && found.has(n)).length]));
  return { found: found.size, registered: registered.length, byClass, unregistered, stale, badClass, remainder: found.size - Object.values(byClass).reduce((a, b) => a + b, 0) - unregistered.length };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const c = vocabularyCensus();
  // CONTROL, proved capable: a planted name the register does not hold is reported, and a planted removal is stale.
  const planted = vocabularyCensus({ texts: ["const plantedProbeState = 1;"], register: { ...STATE_VOCABULARY } });
  console.log(`F06 §4 · STATE VOCABULARY — ${c.found} distinct *State names in tracked src/bin/tools/config · ${c.registered} registered`);
  console.log(`  by class: ${Object.entries(c.byClass).map(([k, v]) => `${k}=${v}`).join(" ")} · unregistered ${c.unregistered.length} · stale ${c.stale.length} · bad class ${c.badClass.length} · remainder ${c.remainder}`);
  for (const n of c.unregistered) console.log(`  🔴 UNREGISTERED ${n}`);
  for (const n of c.stale) console.log(`  🔴 STALE ${n}`);
  console.log(`  control: a planted unregistered name is reported ${planted.unregistered.includes("plantedProbeState")}; with only it present, ${planted.stale.length} registered names read stale`);
  process.exit(c.unregistered.length === 0 && c.stale.length === 0 && c.badClass.length === 0 && c.remainder === 0 && planted.unregistered.includes("plantedProbeState") ? 0 : 1);
}
