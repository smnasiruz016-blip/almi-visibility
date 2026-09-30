/**
 * F90 · THE RECORDED FINDINGS STORES, READ FOR THE FALSIFIABILITY CENSUS (acceptance _handoffs 73b50bf).
 *
 *   the stores     every TRACKED .jsonl under runs/ that holds at least one issue record — enumerated from git, never from the working
 *                  tree, so an untracked local file cannot change the verdict and a new committed store cannot be missed
 *   the methods    the engine's registered checks, loaded from the four modules that register them
 * Read only; nothing fetched, re-run or written. A line that does not parse is counted, never dropped.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import "./checks.mjs";
import "./technical-checks.mjs";
import "./content-checks.mjs";
import "./sitemap-check.mjs";
import { registeredChecks } from "./check.mjs";
import { falsifiabilityCensus } from "./f90-falsifiability.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

/** Tracked .jsonl paths under runs/, from the index of the repository at `root`. */
export function trackedStores(root = REPO) {
  return execFileSync("git", ["ls-files", "-z", "--", "runs"], { cwd: root, encoding: "utf8" }).split("\0").filter((p) => p.endsWith(".jsonl")).sort();
}

export function readStore(root, path) {
  let unparseable = 0;
  const records = [];
  for (const l of readFileSync(join(root, path), "utf8").split(/\r?\n/)) {
    if (!l.trim()) continue;
    try { records.push(JSON.parse(l)); } catch { unparseable += 1; }
  }
  return { name: path, records, unparseable };
}

export function readFalsifiabilityCensus({ root = REPO, paths = trackedStores(root), checks = registeredChecks() } = {}) {
  const all = paths.map((p) => readStore(root, p));
  const stores = all.filter((s) => s.unparseable > 0 || s.records.some((r) => r?.record_type === "issue"));
  return { census: falsifiabilityCensus({ stores, checks }), storesListed: paths.length };
}
