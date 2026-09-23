#!/usr/bin/env node
/**
 * 🔴 F08 §0.3 · DERIVE THE ACCEPTANCE CONTRACT HASH FRESHLY, FROM THE RULING'S OWN COMMITTED BYTES (23 September 2026).
 *
 *   node tools/f08-acceptance-derivation.mjs --governance-root=<dir>
 *
 * READ-ONLY. It writes nothing.
 *
 * WHY THIS EXISTS. A hash was once carried forward and labelled "the F08 contract hash" on the strength of a summary;
 * the ruling it was attributed to does not contain it as text. The value may still be CORRECT — it is a hash OF the
 * ruling's four clauses, not a string written IN the ruling — but a value nobody re-derives is a value nobody has
 * checked. This re-derives it from the source, every time, and says exactly what was hashed:
 *
 *   SOURCE   the ruling file named by config/fboard/acceptances.mjs, read with `git show <commit>:<path>` from the
 *            governance repository — COMMITTED bytes, never the working file.
 *   CHECK 1  sha256 of those bytes == the ruling pin the engine carries.
 *   CHECK 2  the FEATURE / INPUT / EXPECTED / FAILURE / EVIDENCE blocks, parsed by the engine's own parser
 *            (src/fboard/acceptance.mjs `parseContract`), hash under the engine's one declared normalisation
 *            (`contractSha256`: CRLF→LF, whitespace runs→one space, trim, the four clauses joined by "\n")
 *            to the contract pin the engine carries — and each parsed clause equals the engine's carried copy.
 *   CHECK 3  a CONTROL: one word of the EXPECTED clause changed in memory must change the derived hash. A derivation
 *            that cannot move is not a derivation.
 *
 * CI does not check out the governance repository, so this cannot run there; its recorded run is committed beside
 * the other F08 evidence, and the engine-side pins are checked by the suite on every run.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { parseContract, contractSha256, CLAUSES } from "../src/fboard/acceptance.mjs";

const root = process.argv.find((a) => a.startsWith("--governance-root="))?.slice("--governance-root=".length);
if (!root) { console.error("usage: node tools/f08-acceptance-derivation.mjs --governance-root=<dir>"); process.exit(2); }

const acc = ACCEPTANCES.F08;
const bytes = execFileSync("git", ["-C", root, "show", `${acc.ruling.commit}:${acc.ruling.path}`], { maxBuffer: 1 << 26 });
const fileSha = createHash("sha256").update(bytes).digest("hex");
const text = bytes.toString("utf8");
const lines = text.replace(/\r\n/g, "\n").split("\n");
const at = (h) => lines.findIndex((l) => l === h) + 1;
const parsed = parseContract(text);
const derived = contractSha256(parsed);
const mutated = text.replace("append-only, product-neutral", "append-only, product-specific");
const control = mutated === text ? null : contractSha256(parseContract(mutated));

const checks = [
  ["ruling bytes sha256 == engine ruling pin", fileSha === acc.ruling.sha256],
  ["derived contract sha256 == engine contract pin", derived === acc.contractSha256],
  ...CLAUSES.map((k) => [`parsed ${k.toUpperCase()} == engine carried copy`, parsed[k] === acc[k]]),
  ["CONTROL: one changed word changes the derived hash", control !== null && control !== derived],
];

console.log("F08 ACCEPTANCE — FRESH DERIVATION FROM COMMITTED BYTES");
console.log(`  source          ${acc.ruling.repo}:${acc.ruling.path} at ${acc.ruling.commit}`);
console.log(`  bytes           ${bytes.length} · sha256 ${fileSha}`);
console.log(`  blocks at lines FEATURE ${at("FEATURE")} · INPUT ${at("INPUT")} · EXPECTED ${at("EXPECTED")} · FAILURE ${at("FAILURE")} · EVIDENCE ${at("EVIDENCE")}`);
console.log("  hashed          the four clauses INPUT, EXPECTED, FAILURE, EVIDENCE, each normalised (CRLF→LF, whitespace runs→one space, trim), joined by \\n");
console.log(`  derived         ${derived}`);
console.log(`  engine pin      ${acc.contractSha256}`);
console.log(`  control         ${control} (EXPECTED: "product-neutral" → "product-specific")`);
for (const [label, ok] of checks) console.log(`  ${ok ? "ok  " : "🔴  "} ${label}`);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
