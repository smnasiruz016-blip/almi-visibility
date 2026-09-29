#!/usr/bin/env node
/**
 * 🔴 F33 C7 · EVERY MODULE THE NEED-COVERAGE DECISION LOADS, AND WHETHER ANY CAN CALL OUT (acceptance _handoffs 9dc9bc2).
 *
 *   node tools/need-coverage-call-paths.mjs      READ-ONLY report; exits 1 on any fault
 *
 * POPULATION: the transitive closure of STATIC relative imports from the decision's two entry modules
 * (src/page/need-coverage.mjs and src/page/existing-page-first.mjs). Each module in it is checked for:
 *   - a raw network call — the SAME pattern tools/paid-metered-call-census.mjs uses (RAW_EGRESS), so the two never disagree;
 *   - a process spawn, a connector, a paid-provider gate, or the cost governor — any of which could reach a paid or metered call.
 * A fault means the decision could make a paid, metered or live call, which RR-84 §5 puts behind the owner's GREEN.
 *
 * 🔴 CANNOT SEE: a dynamic import, a module reached through a variable, a Node built-in used under another name. Bound printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

import { RAW_EGRESS } from "./paid-metered-call-census.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
export const DECISION_ENTRIES = Object.freeze(["src/page/need-coverage.mjs", "src/page/existing-page-first.mjs"]);
export const CALL_OUT = Object.freeze([
  { code: "RAW_NETWORK_CALL", test: (t) => t.split("\n").some((l) => RAW_EGRESS.test(l)) },
  { code: "PROCESS_SPAWN", test: (t) => /from\s+["']node:child_process["']/.test(t) },
  { code: "CONNECTOR", test: (t) => /tenancy\/connectors\.mjs["']/.test(t) },
  { code: "PAID_PROVIDER_GATE", test: (t) => /cost\/(paid-provider-gate|governor)\.mjs["']/.test(t) },
]);

const importsOf = (file, text) => [...text.matchAll(/\bfrom\s+["'](\.{1,2}\/[^"']+)["']|\bimport\s+["'](\.{1,2}\/[^"']+)["']/g)]
  .map((m) => posix.normalize(posix.join(posix.dirname(file), m[1] ?? m[2])));

/** Pure over a reader: `read(file)` returns the source or null. */
export function decisionCallPaths({ read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null), entries = DECISION_ENTRIES } = {}) {
  const seen = new Map();
  const queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    const text = read(f);
    seen.set(f, text);
    if (text !== null) for (const i of importsOf(f, text)) if (!seen.has(i)) queue.push(i);
  }
  const faults = [];
  for (const [file, text] of seen) {
    if (text === null) { faults.push({ file, code: "UNREADABLE_MODULE" }); continue; }
    for (const c of CALL_OUT) if (c.test(text)) faults.push({ file, code: c.code });
  }
  return { modules: [...seen.keys()].sort(), faults };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = decisionCallPaths();
  console.log("F33 · THE NEED-COVERAGE DECISION'S CALL PATHS");
  console.log(`  bound       static relative imports from ${DECISION_ENTRIES.length} entry modules · ${r.modules.length} module(s) in the closure`);
  for (const f of r.faults) console.log(`  🔴 ${f.code}  ${f.file}`);
  console.log("  🔴 CANNOT SEE: a dynamic import, a module reached through a variable, a built-in used under another name");
  console.log(r.faults.length ? `  FAULTS ${r.faults.length} — the decision could make a paid, metered or live call` : "  faults 0 — no paid, metered or live call path");
  if (r.faults.length) process.exit(1);
}
