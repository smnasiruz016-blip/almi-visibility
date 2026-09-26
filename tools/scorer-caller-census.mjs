#!/usr/bin/env node
/**
 * 🔴 F10 · C4 · THE AGGREGATE-SCORER CALLER CENSUS (owner ruling 1.2, _handoffs 3adb716).
 *
 *   node tools/scorer-caller-census.mjs [--check]
 *
 * READ-ONLY. Over EVERY tracked production module (src/, bin/, tools/, subjects/, config/ — tests excluded, they are not
 * production), it finds every CALL of the mixed-writer aggregate scorer `scoreClassification` and every import of it, and
 * classifies each:
 *   GOVERNED_ROUTE   the call sits inside the governed scoring route (src/governance/governed-scoring.mjs), which reaches it
 *                    only as the mutation of executeGovernedWrite;
 *   DEFINITION       its own definition (src/heldout/lifecycle.mjs);
 *   BYPASS           anything else — a direct call, an alias, a re-export. FAILS.
 * There is no allowlist and no exception: the route is the one module the ruling names. A zero-call population fails too —
 * a census that finds the governed route missing is not clean, it is blind.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const SCORER = "scoreClassification";
export const DEFINING_MODULE = "src/heldout/lifecycle.mjs";
export const GOVERNED_ROUTE_MODULE = "src/governance/governed-scoring.mjs";
const PRODUCTION = /^(src|bin|tools|subjects|config)\/.*\.m?js$/;
const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l);

/** Every site that names the scorer in production code, classified. `files` and `read` are injectable for the proofs. */
export function scorerCallSites({ files = null, read = null } = {}) {
  const list = (files ?? execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8" }).split("\n")).filter((p) => PRODUCTION.test(p));
  const text = read ?? ((p) => readFileSync(join(REPO, p), "utf8"));
  const sites = [];
  for (const file of list) {
    text(file).split("\n").forEach((raw, i) => {
      /* A name inside a string literal is a MENTION (a description, a vocabulary note, this census's own constant), not code
       * that can reach the scorer. Import specifiers are kept: the import clause itself is outside the quotes. */
      const l = raw.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (s) => (/\bfrom\s*$/.test(raw.slice(0, raw.indexOf(s))) ? s : '""'));
      if (!isCode(l) || !new RegExp(`\\b${SCORER}\\b`).test(l)) return;
      const kind = /^\s*import\b/.test(l) || /\bfrom\s+["']/.test(l) ? "IMPORT" : new RegExp(`\\bfunction\\s+${SCORER}\\b`).test(l) ? "DEFINITION" : new RegExp(`\\b${SCORER}\\s*\\(`).test(l) ? "CALL" : "REFERENCE";
      const cls = kind === "DEFINITION" && file === DEFINING_MODULE ? "DEFINITION"
        : file === GOVERNED_ROUTE_MODULE && (kind === "CALL" || kind === "IMPORT") ? "GOVERNED_ROUTE"
        : "BYPASS";
      sites.push({ file, line: i + 1, kind, cls });
    });
  }
  return sites;
}

/** The census verdict: failures (each a BYPASS site, or the governed route's call missing). */
export function scorerCensus(opts = {}) {
  const sites = scorerCallSites(opts);
  const failures = sites.filter((s) => s.cls === "BYPASS").map((s) => `BYPASS ${s.file}:${s.line} (${s.kind})`);
  if (!sites.some((s) => s.cls === "GOVERNED_ROUTE" && s.kind === "CALL")) failures.push("GOVERNED_ROUTE_CALL_ABSENT");
  if (!sites.some((s) => s.cls === "DEFINITION")) failures.push("DEFINITION_ABSENT");
  return { sites, failures };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const { sites, failures } = scorerCensus();
  console.log(`AGGREGATE-SCORER CALLER CENSUS — ${sites.length} site(s): ${["DEFINITION", "GOVERNED_ROUTE", "BYPASS"].map((c) => `${c} ${sites.filter((s) => s.cls === c).length}`).join(" · ")}`);
  for (const s of sites) console.log(`  ${s.cls.padEnd(15)} ${s.kind.padEnd(10)} ${s.file}:${s.line}`);
  console.log(`FAILURES: ${failures.length}`);
  for (const f of failures) console.log(`  🔴 ${f}`);
  if (process.argv.includes("--check") && failures.length) process.exit(1);
}
