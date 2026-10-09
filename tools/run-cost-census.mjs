#!/usr/bin/env node
/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 1, C8/C9 — THE RUN-COST CENSUS: every entry point that opens a connector, found by the F03 root and
 * connector census (tools/root-connector-census.mjs, its CONNECTOR sites) — never a list — and, for each, whether:
 *
 *   metered     every connector it opens is held through its run-cost recorder (RUN_COST.metered(openConnector(…))): no request without
 *               --confirm, and every request counted
 *   recorder    it creates the recorder under its OWN name (runCost({ entryPoint: "<this file>" … })): one entry for every run
 *   ownLedger   its scoped entry names its tenant's own declared ledger (RESOURCES.costLedger(ownLedgerRef())): decided by F02 first
 *
 *   node tools/run-cost-census.mjs [--check]      READ-ONLY; --check exits 1 on any entry point that is not complete
 *
 * 🔴 RR-244 · Amendment 2: amendment2Census() reads the same population against Amendment 2's text (see below).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { productionFiles, censusOf } from "./root-connector-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const METERED = /\.metered\(openConnector\(/;
export const OWN_LEDGER = /RESOURCES\.costLedger\(ownLedgerRef\(\)\)/;
const recorderName = (text) => [...text.matchAll(/\brunCost\(\{ entryPoint: "([^"]+)"/g)].map((m) => m[1]);

/** The census over { file, text } (pure — a firing control hands it a stand-in). */
export function runCostCensus(files) {
  const { sites } = censusOf(files);
  const byFile = new Map();
  for (const s of sites.filter((x) => x.kind === "CONNECTOR")) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s.line]);
  const text = new Map(files.map((f) => [f.file, f.text]));
  return [...byFile].sort(([a], [b]) => a.localeCompare(b)).map(([file, lines]) => {
    const t = text.get(file).replace(/\r\n/g, "\n");
    const ls = t.split("\n");
    const metered = lines.every((n) => METERED.test(ls[n - 1]));
    const names = recorderName(t);
    const recorder = names.length > 0 && names.every((n) => n === file);
    const ownLedger = OWN_LEDGER.test(t);
    return Object.freeze({ file, sites: lines.length, metered, recorder, ownLedger, ok: metered && recorder && ownLedger });
  });
}

/** The census over the production code as it stands. */
export const liveRunCostCensus = (repo = REPO) => runCostCensus(productionFiles(repo).map((file) => ({ file, text: readFileSync(join(repo, file), "utf8") })));

/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 2 (RR-244) — the same population, read against the Amendment 2 text, per entry point:
 *
 *   connectorMode      the mode that opens a connector: the condition the recorder is built under (`const RUN_COST = <cond> ? runCost(`),
 *                      or ALWAYS when the recorder is unconditional; every other mode opens no connector
 *   gateDurable        in its connector mode the scope gate decides through the DURABLE sink (scopedEntryPoint governed: true, or
 *                      governed: <the same condition>) — a scope-gate refusal is recorded on the trail
 *   recorderFollowsGate  nothing between the scope gate and the recorder can end the run (no exit, no …OrExit, no confinement, no await,
 *                      no throw) — a run that passed its gate is always recorded: with --confirm its one cost entry, without it the write
 *                      law's refusal of that entry
 *   preGateExits       every way the run can end BEFORE its scope gate, each classified: USAGE (the invocation's own arguments are
 *                      malformed or missing — no mode is formed yet), CONFINEMENT (an output path outside this repository, refused before
 *                      anything happens), SEAM (a test seam set outside a test run), or REFUSAL (a decision about the mode — a green, a
 *                      permission, a declaration — taken where nothing records it: never lawful)
 */
const EXITS = /process\.exit\(|OrExit\(|confineToRepo\(/;
const USAGE = /usage|USAGE REFUSED|is a declared id|productIdOrExit\(/;
export function amendment2Census(files) {
  const text = new Map(files.map((f) => [f.file, f.text.replace(/\r\n/g, "\n")]));
  return runCostCensus(files).map(({ file }) => {
    const ls = text.get(file).split("\n");
    const gateAt = ls.findIndex((l) => /scopedEntryPoint\(\{/.test(l));
    const recAt = ls.findIndex((l) => /^const RUN_COST = /.test(l));
    const cond = recAt < 0 ? null : (ls[recAt].match(/^const RUN_COST = (.+?) \? runCost\(/)?.[1] ?? "ALWAYS");
    const governed = gateAt < 0 ? null : (ls[gateAt].match(/governed: ([^,]+),/)?.[1] ?? null);
    const gateDurable = governed === "true" || (cond !== "ALWAYS" && governed === cond);
    const between = gateAt < 0 || recAt < 0 ? ["(no gate or no recorder)"] : ls.slice(gateAt + 1, recAt).filter((l) => !/^\s*(\/\*|\*)/.test(l) && /process\.exit\(|OrExit\(|confineToRepo\(|\bawait\b|\bthrow\b/.test(l));
    const preGateExits = ls.slice(0, Math.max(gateAt, 0)).map((l, i) => [l, i]).filter(([l]) => !/^\s*(\/\/|\/\*|\*)/.test(l) && EXITS.test(l)).map(([l, i]) => {
      const ctx = ls.slice(Math.max(0, i - 3), i + 1).join("\n");
      const kind = /HALTED/.test(l) && /inVerifiedTestContext/.test(l) ? "SEAM" : /confineToRepo\(/.test(l) ? "CONFINEMENT" : USAGE.test(ctx) ? "USAGE" : "REFUSAL";
      return Object.freeze({ line: i + 1, kind });
    });
    const ok = gateDurable && between.length === 0 && preGateExits.every((x) => x.kind !== "REFUSAL");
    return Object.freeze({ file, connectorMode: cond, governed, gateDurable, recorderFollowsGate: between.length === 0, preGateExits, ok });
  });
}

/** Amendment 2's census over the production code as it stands. */
export const liveAmendment2Census = (repo = REPO) => amendment2Census(productionFiles(repo).map((file) => ({ file, text: readFileSync(join(repo, file), "utf8") })));

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = liveRunCostCensus();
  console.log(`RUN-COST CENSUS — ${rows.length} entry point(s) that open a connector · ${rows.reduce((n, r) => n + r.sites, 0)} connector site(s)`);
  for (const r of rows) console.log(`  ${r.ok ? "COMPLETE  " : "INCOMPLETE"} ${r.file} — sites ${r.sites} · metered ${r.metered} · recorder ${r.recorder} · own ledger ${r.ownLedger}`);
  if (process.argv.includes("--check") && rows.some((r) => !r.ok)) process.exit(1);
}
