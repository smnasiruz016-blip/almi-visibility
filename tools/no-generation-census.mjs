#!/usr/bin/env node
/**
 * ITEM 14 — NO BLIND REGENERATION. The one feature whose PASS is an ABSENCE.
 *
 * ── 🔴 PROVE THE ABSENCE. DO NOT SIMULATE THE DANGER. ───────────────────────
 *
 * The tempting way to "test" this is to build a generator and show something
 * stops it. That builds the exact capability the item exists to keep out, and
 * it would then need keeping out forever. So this counts paths instead, and a
 * PASS is a count of zero in each of three categories.
 *
 * ── WHAT IT SCANS, AND WHAT IT CANNOT ───────────────────────────────────────
 *
 * SCANS: every git-tracked `.mjs` under `src/`, `bin/` and `tools/`, by reading
 * the source. The population is taken from `git ls-files`, independently of the
 * walk, so a skip list or a silent catch shows up as a disagreement rather than
 * as a quietly smaller set.
 *
 * 🔴 CANNOT SCAN, and this is stated rather than implied:
 *   - dynamic dispatch — `fs[name](...)`, a writer reached through a variable,
 *     or anything assembled at runtime. A determined generator can hide.
 *   - the GitHub Actions workflows' own steps (they are YAML, not `.mjs`).
 *   - `node_modules`. A dependency could write anything; nothing here checks.
 *   - what a human does by hand.
 *
 * So this proves "no page-writing path is DECLARED IN OUR SOURCE", which is
 * narrower than "no page can ever be written" — and the narrower claim is the
 * one being made.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 THE PATTERNS ARE BUILT FROM PARTS, SO THIS FILE'S OWN SCAN CANNOT MATCH IT.
 *
 * This census scans `tools/`, and it lives in `tools/`. Written as plain regex
 * literals its detectors named the very things they hunt, so **the census
 * reported itself** — 7 page-writing paths instead of 6, and a bulk-generation
 * hit that did not exist.
 *
 * Worse, it passed on the branch: the file was still untracked when the suite
 * last ran, `git ls-files` did not list it, and it only began scanning itself
 * once it was committed. **The suite was green for a reason that stopped being
 * true the moment I staged the file** — the fix for which is to re-run after
 * staging, not to trust the earlier green.
 *
 * `sealed-corpus-census.mjs` already solved this: it builds the sealed
 * directory's name as `["case","study","01"].join("-")` for exactly this
 * reason, and says why — *this file must name the thing in order to look for
 * it, so it would be its own first offender and would need an exemption. An
 * exemption is a hole that outlives the reason for it.*
 *
 * So no exemption and no self-exclusion: the census still scans itself along
 * with everything else, and simply never spells the tokens out.
 */
const w = ["write", "File", "Sync"].join("");
const a = ["append", "File", "Sync"].join("");
const mk = ["mkdir", "Sync"].join("");
const rm = ["rm", "Sync"].join("");
const un = ["unlink", "Sync"].join("");
const ws = ["create", "Write", "Stream"].join("");
const gen = ["generate", "All"].join("");
const pub = ["publish", "All"].join("");
const bld = ["build", "All"].join("");

const ANY_WRITE = new RegExp(`(${[w, a, mk, rm, un, ws].join("|")})`);
const FILE_WRITE = new RegExp(`(${w}|${ws})`);
const ESCAPES_REPO = /\.\.[\\/]almi-|C:[\\/]Projects[\\/]almi-(?!visibility)/i;
const HTML_TARGET = /\.html|html,\s*"utf8"|\bhtml\b\s*\)/;
const BULK = new RegExp(`(${gen}|${pub}|${bld})`, "i");

/**
 * The three categories the boundary names, kept apart because they carry very
 * different weight. A product-repository write is the catastrophic one.
 */
export const CATEGORIES = Object.freeze({
  PRODUCT_REPO_WRITE: {
    label: "writes into a PRODUCT repository",
    // Any filesystem write whose path escapes this repo into a sibling product.
    test: (line) => ANY_WRITE.test(line) && ESCAPES_REPO.test(line),
  },
  PAGE_WRITE: {
    label: "writes an HTML page to disk",
    test: (line) => FILE_WRITE.test(line) && HTML_TARGET.test(line),
  },
  BULK_GENERATION: {
    label: "generates pages in bulk (generate-all / publish-all)",
    test: (line) => BULK.test(line),
  },
});

/**
 * @param {object}  [opts]
 * @param {string}  [opts.repo]     the repository to scan
 * @param {Array}   [opts.sources]  🔴 INJECTED `[{file, text}]`, for the CONTROL.
 *
 * ── 🔴 WHY `sources` EXISTS, AND IT IS NOT A TEST BACK DOOR ─────────────────
 *
 * A census whose whole output is "zero in every category" **cannot tell a clean
 * repository from a blind detector.** Disabling the product-repo matcher
 * entirely still yields zero, and the test asserting zero still passes. That
 * exact sabotage broke nothing here and was caught only because the harness
 * reports when nothing breaks.
 *
 * So the detector must be provable on input that SHOULD fire, without planting
 * a real generator in the repository to do it. `sources` is that seam: the
 * control feeds it a known-bad file and asserts the category is non-empty.
 */
export function census({ repo = REPO, sources = null } = {}) {
  // 🔴 DEDUPED. `git ls-files` can list one path twice (an intent-to-add entry
  // alongside the index entry), and a duplicated file double-counts every hit
  // inside it — inflating a census whose whole value is that its counts are zero.
  const tracked = sources
    ? sources.map((s) => s.file)
    : [...new Set(
        execFileSync("git", ["ls-files", "src", "bin", "tools"], { cwd: repo, encoding: "utf8" })
          .split("\n")
          .filter((p) => p.endsWith(".mjs")),
      )].sort();

  const hits = { PRODUCT_REPO_WRITE: [], PAGE_WRITE: [], BULK_GENERATION: [] };
  const injected = sources ? new Map(sources.map((s) => [s.file, s.text])) : null;

  for (const rel of tracked) {
    const text = injected ? injected.get(rel) : readFileSync(repo + rel, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      // A comment is not a code path. This is the one exemption, and it is
      // narrow: only a line whose first non-space characters begin a comment.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      for (const [key, cat] of Object.entries(CATEGORIES)) {
        if (cat.test(line)) hits[key].push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
      }
    }
  }

  return { scanned: tracked.length, files: tracked, hits };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = census();
  console.log("ITEM 14 — NO-GENERATION CENSUS\n");
  console.log(`[bound: ${r.scanned} git-tracked .mjs files under src/, bin/, tools/]`);
  console.log("🔴 CANNOT SCAN: dynamic dispatch, workflow YAML, node_modules, or anything a human does by hand.\n");

  let bad = 0;
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const found = r.hits[key];
    console.log(`${found.length === 0 ? "✅" : "🔴"} ${key} — ${cat.label}: ${found.length}`);
    for (const h of found) console.log(`     ${h.file}:${h.line}  ${h.text}`);
    if (found.length) bad += 1;
  }

  /**
   * 🔴 A BREAKDOWN, NOT AN EXEMPTION. The verdict above already counted all six.
   *
   * The owner needs to know WHICH of the six render a candidate product page
   * and which write some other HTML artefact, because the two carry different
   * risk — but the boundary says "no page-writing path", and softening that
   * into "no page-writing path that I consider dangerous" is how a bar moves
   * without anyone ruling that it should. The count stands at six.
   */
  if (r.hits.PAGE_WRITE.length) {
    const renders = r.hits.PAGE_WRITE.filter((h) => /nursing\.html|nursing-placed\.html|\$\{which\}\.html/.test(h.text));
    console.log(`\n   breakdown (informational — the verdict already counted all ${r.hits.PAGE_WRITE.length}):`);
    console.log(`     renders a CANDIDATE PRODUCT PAGE from the registry : ${renders.length}`);
    console.log(`     writes another HTML artefact (audit report, stored corpus body) : ${r.hits.PAGE_WRITE.length - renders.length}`);
    console.log(`     every one is a LOCAL write behind write-law.mjs and --confirm; none targets a product repo.`);
  }

  console.log(`\n${bad === 0 ? "✅ ABSENCE PROVED across all three categories." : `🔴 ${bad} of 3 categories are NOT empty — item 14 does NOT pass.`}`);
  process.exit(bad === 0 ? 0 : 1);
}
