/**
 * 🔴 C5 — THE DETECTOR CENSUS. IT MUST READ ZERO IN THIS PR.
 *
 * ── WHY A COUNT OF ZERO IS THE DELIVERABLE ──────────────────────────────────
 *
 * Six RED issue classes are already known from the Phase 0 work. A detector
 * written today would be shaped by those six — it would find them because it was
 * built from them, and its passing would prove nothing except that the author
 * had read the list.
 *
 * That is building to the test, and it is exactly the circularity the Case Study
 * contract exists to prevent. The contract requires the detector to be specified
 * BEFORE the cases it is judged on, or the case study measures the author rather
 * than the product.
 *
 *   THIS PR BUILDS THE SHELF. IT DOES NOT BUILD WHAT GOES ON IT.
 *
 * ── AND WHY THE CENSUS EXISTS AT ALL IF THE ANSWER IS ZERO ──────────────────
 *
 * Because "we did not write any detectors" is a claim, and an unenforced claim
 * decays on the first afternoon somebody has a good idea. A count that fails the
 * build is the same claim made falsifiable. When detectors ARE authorised, this
 * file is where the ceiling is deliberately raised — a visible edit, in a PR,
 * with a reason — rather than a rule quietly discovered to have never applied.
 *
 * ── 🔴 AND WHY IT LIVES IN tools/ ───────────────────────────────────────────
 *
 * Same reason as product-boundary.mjs: a law that lives inside the territory it
 * polices ends up needing an exemption for itself, and an exemption is a hole
 * that outlives the reason for it.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Where a detector would live. Counting a DIRECTORY rather than matching a
 * filename pattern is deliberate: a pattern (`*-detector.mjs`) is defeated by
 * naming the file something else, and the next author would not even know they
 * had defeated it.
 */
export const DETECTOR_DIRS = Object.freeze(["src/detectors", "src/detect", "src/rules"]);

/** The ceiling. Raising it is a deliberate, reviewable edit. */
export const MAX_DETECTOR_FILES = 0;

/**
 * Count detector implementation files under `repoRoot`.
 *
 * Takes the root as an argument so the test can point it at a fixture and prove
 * the counter can actually COUNT — a counter only ever run against an empty
 * directory is indistinguishable from one that returns zero unconditionally,
 * and that is the pattern this project hunts.
 */
export function countDetectorFiles(repoRoot) {
  const files = [];
  for (const rel of DETECTOR_DIRS) {
    const dir = join(repoRoot, rel);
    if (!existsSync(dir)) continue;
    files.push(...walk(dir).map((f) => rel + "/" + f));
  }
  return { count: files.length, files: files.sort() };
}

function walk(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, prefix + entry + "/"));
    else if (entry.endsWith(".mjs")) out.push(prefix + entry);
  }
  return out;
}
