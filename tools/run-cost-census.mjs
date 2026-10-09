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

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = liveRunCostCensus();
  console.log(`RUN-COST CENSUS — ${rows.length} entry point(s) that open a connector · ${rows.reduce((n, r) => n + r.sites, 0)} connector site(s)`);
  for (const r of rows) console.log(`  ${r.ok ? "COMPLETE  " : "INCOMPLETE"} ${r.file} — sites ${r.sites} · metered ${r.metered} · recorder ${r.recorder} · own ledger ${r.ownLedger}`);
  if (process.argv.includes("--check") && rows.some((r) => !r.ok)) process.exit(1);
}
