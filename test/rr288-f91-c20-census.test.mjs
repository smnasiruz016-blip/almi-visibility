/**
 * RR-288 · F91 C20 — "A PRODUCT'S OLD PAGES ARE NEVER USED" — THE CENSUS, MEASURED; THE CLAUSE IS NOT YET MET (beta-g decision B).
 * Every F91 path (an entry point under bin/ that loads F91's planner, its demand connection, its spec compiler or F35's evidence reader) is
 * classed by whether it reads the product's existing-page population — the stored crawl of the product's site (readExistingPagePopulation,
 * directly or through readClientActionEvidence). C20 requires that none does, beyond pages Visibility built itself. Today some do: they are
 * pinned BY NAME as C20's open work, so a NEW path that reads the old pages turns this red, and the list only shrinks.
 * The filter is not wired: F34 C1/C2 and F33 C2/C3 (frozen, VERIFIED) require the SAME tenant's existing pages on those very paths — an
 * authority conflict named in the RR-288 report. Read-only; nothing fetched or written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const F91_MODULES = /src\/page\/(page-plan|demand-connection|spec-compiler|action-evidence)\.mjs/;
const READS_OLD_PAGES = /\b(readExistingPagePopulation|readClientActionEvidence)\(/;
export function c20Census(read = (f) => readFileSync(join(REPO, f), "utf8")) {
  const bins = readdirSync(join(REPO, "bin")).filter((f) => f.endsWith(".mjs")).map((f) => `bin/${f}`).sort();
  const paths = bins.filter((b) => F91_MODULES.test(read(b)));
  return { paths, readsOldPages: paths.filter((b) => READS_OLD_PAGES.test(read(b))) };
}
/* RR-288: measured on 19 Oct 2026 — C20's open work, by name (the 3 beta-g named, and the 4 F35 readers that share the population) */
const OPEN = ["bin/answer-first.mjs", "bin/build-page.mjs", "bin/demand-connect.mjs", "bin/media-visibility.mjs", "bin/page-actions.mjs", "bin/site-plan.mjs", "bin/trust-signals.mjs"];

test("C20 · CENSUS · every F91 path classed; the paths that read the product's old-page population are exactly the named open work — a new one is red", () => {
  const c = c20Census();
  assert.ok(c.paths.length >= 8, `EMPTY population: ${c.paths.length} F91 path(s)`);
  assert.deepEqual(c.readsOldPages, OPEN, "an F91 path reads the product's old pages beyond the named open work (or one was fixed — shrink the list)");
  console.log(`  C20 (count-only): F91 paths ${c.paths.length} · reading the old-page population ${c.readsOldPages.length} — NOT MET, named`);
  /* CONTROL: a planted read in a clean F91 path fires */
  const planted = c20Census((f) => { const t = readFileSync(join(REPO, f), "utf8"); return f === "bin/page-plan.mjs" ? `${t}\nreadExistingPagePopulation({});\n` : t; });
  assert.ok(planted.readsOldPages.includes("bin/page-plan.mjs"), "the census cannot see a planted read");
});
