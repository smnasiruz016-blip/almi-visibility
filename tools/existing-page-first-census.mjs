#!/usr/bin/env node
/**
 * 🔴 F34 C5 · THE PAGE-PRODUCING PATHS, DISCOVERED AND CHECKED (acceptance _handoffs 53f74b4).
 *
 *   node tools/existing-page-first-census.mjs            report
 *   node tools/existing-page-first-census.mjs --check    exit 1 on any fault
 *
 * READ-ONLY. POPULATION: every git-tracked `.mjs` outside test/ whose STATIC imports resolve to the candidate-page renderer
 * (src/page/render.mjs) or constructor (src/page/construct.mjs), plus every file in the permitted page-writer register. Each must
 * be classified in config/page-production.mjs; a CHECKS or ROUTED file must really contain every one of its marks — the call AND
 * the condition its production depends on; a NOT_PAGE_PRODUCTION file
 * must not import the renderer or constructor at all.
 *
 * 🔴 CANNOT SEE, stated so an empty fault list is not read as more than it is: a dynamic import, a module reached through a
 * variable, a renderer copied rather than imported, and anything run by hand. The bound is printed beside the result (LAW-BOUND-1).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_PRODUCTION, PAGE_PRODUCTION_CLASSES } from "../config/page-production.mjs";
import { PERMITTED_PAGE_WRITERS } from "../config/permitted-page-writers.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
export const PRODUCERS = Object.freeze(["src/page/render.mjs", "src/page/construct.mjs"]);

/** The repo-relative modules a source statically imports (relative specifiers only). */
export function staticImports(file, text) {
  const out = [];
  for (const m of text.matchAll(/\bfrom\s+["'](\.{1,2}\/[^"']+)["']|\bimport\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    out.push(posix.normalize(posix.join(posix.dirname(file), m[1] ?? m[2])));
  }
  return out;
}

/**
 * Pure. `files` is [{ file, text }] for the whole scanned tree; `register` the page-writer register; `classes` the classification.
 * Returns the population, each file's verdict, and the faults.
 */
export function pageProductionCensus({ files, register = PERMITTED_PAGE_WRITERS, classes = PAGE_PRODUCTION }) {
  const text = new Map(files.map((f) => [f.file, f.text]));
  const importers = files.filter((f) => !PRODUCERS.includes(f.file) || f.file === "src/page/construct.mjs")
    .filter((f) => staticImports(f.file, f.text).some((i) => PRODUCERS.includes(i))).map((f) => f.file);
  const registered = register.map((e) => e.file);
  const population = [...new Set([...importers, ...registered])].sort();
  const faults = [];
  const rows = population.map((file) => {
    const c = classes[file];
    const src = text.get(file);
    if (!c || !PAGE_PRODUCTION_CLASSES.includes(c.class)) { faults.push({ file, code: "UNCLASSIFIED_PAGE_PATH" }); return { file, class: null }; }
    if (src === undefined) { faults.push({ file, code: "CLASSIFIED_FILE_NOT_IN_TREE" }); return { file, class: c.class }; }
    if (c.class === "NOT_PAGE_PRODUCTION" && importers.includes(file)) faults.push({ file, code: "RENDERS_A_CANDIDATE_BUT_CLASSIFIED_NOT_PAGE_PRODUCTION" });
    if (c.class !== "NOT_PAGE_PRODUCTION" && !(Array.isArray(c.marks) && c.marks.length >= 2 && c.marks.every((m) => typeof m === "string" && m !== "" && src.includes(m)))) {
      faults.push({ file, code: "ROUTED_WITHOUT_THE_CHECK" });
    }
    return { file, class: c.class };
  });
  for (const file of Object.keys(classes)) if (!population.includes(file)) faults.push({ file, code: "CLASSIFIED_BUT_NOT_IN_THE_POPULATION" });
  return { population, importers, registered, rows, faults, scanned: files.length };
}

function treeFiles() {
  const listed = execFileSync("git", ["-C", REPO, "ls-files", "*.mjs"], { encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => !f.startsWith("test/") && !f.includes("node_modules/"));
  return listed.map((file) => ({ file, text: readFileSync(REPO + file, "utf8") }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = pageProductionCensus({ files: treeFiles() });
  const count = (k) => r.rows.filter((x) => x.class === k).length;
  console.log("F34 · PAGE-PRODUCING PATHS — the existing-page check census");
  console.log(`  bound       ${r.scanned} git-tracked .mjs outside test/ · static relative imports only · plus ${r.registered.length} register entries`);
  console.log(`  population  ${r.population.length} path(s): ${r.importers.length} import the candidate renderer/constructor · ${r.registered.length} registered page writer(s)`);
  console.log(`  classified  CHECKS ${count("CHECKS")} · ROUTED ${count("ROUTED")} · NOT_PAGE_PRODUCTION ${count("NOT_PAGE_PRODUCTION")} · unclassified ${r.rows.filter((x) => x.class === null).length}`);
  for (const f of r.faults) console.log(`  🔴 ${f.code}  ${f.file}`);
  console.log("  🔴 CANNOT SEE: a dynamic import, a module reached through a variable, a renderer copied rather than imported, anything run by hand");
  console.log(r.faults.length ? `  FAULTS ${r.faults.length}` : "  faults 0");
  if (process.argv.includes("--check") && r.faults.length) process.exit(1);
}
