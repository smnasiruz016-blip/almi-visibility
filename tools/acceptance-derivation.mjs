#!/usr/bin/env node
/**
 * 🔴 DERIVE AN F-ROW'S ACCEPTANCE CONTRACT HASH FRESHLY, FROM THE ACCEPTANCE FILE'S OWN COMMITTED BYTES.
 *
 *   node tools/acceptance-derivation.mjs --governance-root=<dir> --feature=F07
 *   node tools/acceptance-derivation.mjs --governance-root=<dir> --path=<file> --commit=<sha> [--control=<word>:<word>]
 *
 * READ-ONLY. The generic form of tools/f08-acceptance-derivation.mjs (kept unchanged, because F08's evidence cites it).
 *
 *   SOURCE   `git show <commit>:<path>` in the governance repository — COMMITTED bytes, never the working file. With
 *            --feature the path and commit are the ones config/fboard/acceptances.mjs pins; before a pin exists they are
 *            given explicitly.
 *   HASHED   the INPUT, EXPECTED, FAILURE and EVIDENCE blocks, parsed by the engine's own `parseContract`, each
 *            normalised CRLF→LF, whitespace runs→one space, trimmed, joined by "\n" (`contractSha256`).
 *   CHECKS   with a pin: file sha256 == ruling pin; derived == contract pin; each clause == the engine's carried copy.
 *   CONTROL  one word changed in memory must move the derived hash. A derivation that cannot move is not one.
 *
 * CI does not check out the governance repository; a recorded run is committed evidence instead.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { parseContract, contractSha256, CLAUSES } from "../src/fboard/acceptance.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const root = arg("governance-root");
const feature = arg("feature");
const pinned = feature ? ACCEPTANCES[feature] ?? null : null;
const path = arg("path") ?? pinned?.ruling.path;
const commit = arg("commit") ?? pinned?.ruling.commit;
const [fromWord, toWord] = (arg("control") ?? "product-neutral:product-specific").split(":");
if (!root || !path || !commit) { console.error("usage: --governance-root=<dir> (--feature=<Fnn> | --path=<file> --commit=<sha>)"); process.exit(2); }

const bytes = execFileSync("git", ["-C", root, "show", `${commit}:${path}`], { maxBuffer: 1 << 26 });
const fileSha = createHash("sha256").update(bytes).digest("hex");
const text = bytes.toString("utf8");
const lines = text.replace(/\r\n/g, "\n").split("\n");
const at = (h) => lines.findIndex((l) => l === h) + 1;
const parsed = parseContract(text);
const derived = contractSha256(parsed);
const mutated = text.replace(fromWord, toWord);
const control = mutated === text ? null : contractSha256(parseContract(mutated));

const checks = [["CONTROL: one changed word changes the derived hash", control !== null && control !== derived]];
if (pinned) {
  checks.unshift(["file bytes sha256 == engine ruling pin", fileSha === pinned.ruling.sha256], ["derived contract sha256 == engine contract pin", derived === pinned.contractSha256],
    ...CLAUSES.map((k) => [`parsed ${k.toUpperCase()} == engine carried copy`, parsed[k] === pinned[k]]));
}
console.log(`ACCEPTANCE — FRESH DERIVATION FROM COMMITTED BYTES${feature ? ` (${feature})` : ""}`);
console.log(`  source          ${path} at ${commit}`);
console.log(`  bytes           ${bytes.length} · sha256 ${fileSha}`);
console.log(`  blocks at lines FEATURE ${at("FEATURE")} · INPUT ${at("INPUT")} · EXPECTED ${at("EXPECTED")} · FAILURE ${at("FAILURE")} · EVIDENCE ${at("EVIDENCE")}`);
console.log(`  feature         ${parsed.feature}`);
console.log("  hashed          INPUT, EXPECTED, FAILURE, EVIDENCE — each CRLF→LF, whitespace runs→one space, trim — joined by \\n");
console.log(`  derived         ${derived}`);
if (pinned) console.log(`  engine pin      ${pinned.contractSha256}`);
console.log(`  control         ${control} ("${fromWord}" → "${toWord}")`);
for (const [label, ok] of checks) console.log(`  ${ok ? "ok  " : "🔴  "} ${label}`);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
