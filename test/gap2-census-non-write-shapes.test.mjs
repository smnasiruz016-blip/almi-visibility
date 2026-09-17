/**
 * 🔴 GAP 2 · THE CENSUS'S THREE PROVED NON-WRITE SHAPES, AND THE FIVE REAL STORE WRITES (16 September 2026)
 *
 * tools/permitted-writers.mjs counted a helper verb followed by "(" as a write wherever it appeared.
 * Read by syntax and enclosing scope (runs/audit/gap2-close-decision-2026-09-16.txt), seven of the
 * twelve sites it reported in src/evidence/store.mjs are not writes, in exactly three shapes. The
 * census now excludes those three shapes and nothing else.
 *
 * Both directions are held here, on the REAL store, one assertion per shape and per write:
 *   · each proved shape is NOT a site, and is reported in excludedNonWrites under its own shape;
 *   · each of the five real writes IS a site — a correction that stopped seeing a real write would be
 *     worse than the over-count it fixed.
 *
 * Lines are found by what they SAY and by which factory encloses them, never by a remembered number,
 * so an unrelated edit to the store moves the lines without breaking the meaning of the test.
 * Scoped to these shapes on purpose: this is not a census test suite.
 *
 * 🔴 A FIXED INPUT, HELD OUTSIDE THE CENSUS'S OWN SOURCE. The census scans tools/ too, so a census run over
 * the repository includes the census's own file: mutating the implementation can alter the population and
 * the counts as well as the behaviour under test. This test therefore hands the census ONE input — the
 * store's own text, read here — through `sources`, and the census reads nothing else. Whatever is done to
 * the implementation, the population this test judges is the same bytes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { writeSiteCensus } from "../tools/permitted-writers.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILE = "src/evidence/store.mjs";
const TEXT = readFileSync(REPO + FILE, "utf8");
const lines = TEXT.split(/\r?\n/);
const census = writeSiteCensus({ sources: [{ file: FILE, text: TEXT }] });
const siteLines = new Set(census.sites.filter((s) => s.file === FILE).map((s) => s.line));
const excludedAs = new Map(census.excludedNonWrites.filter((e) => e.file === FILE).map((e) => [e.line, e.shape]));

/** 1-based lines whose trimmed text satisfies `pred`, within [from, to] (1-based, inclusive). */
const find = (pred, from = 1, to = lines.length) =>
  lines.map((l, i) => i + 1).filter((n) => n >= from && n <= to && pred(lines[n - 1].trim()));
const startOf = (re) => {
  const hits = find((t) => re.test(t));
  assert.equal(hits.length, 1, `expected exactly one line matching ${re} in ${FILE}, found ${hits.length}`);
  return hits[0];
};
const DRY_RUN = startOf(/^export function createDryRunStore\(/);
const JSONL = startOf(/^export function createJsonlStore\(/);
assert.ok(DRY_RUN < JSONL, "the dry-run factory is expected before the real one");

const exactlyOne = (hits, what) => {
  assert.equal(hits.length, 1, `expected exactly one ${what}, found ${hits.length} (${hits.join(", ")})`);
  return hits[0];
};
const assertExcluded = (n, shape, what) => {
  assert.equal(siteLines.has(n), false, `${FILE}:${n} (${what}) is still counted as a write site`);
  assert.equal(excludedAs.get(n), shape, `${FILE}:${n} (${what}) is not reported as excluded under "${shape}"`);
};
const assertSite = (n, what) => {
  assert.equal(siteLines.has(n), true, `${FILE}:${n} (${what}) is a REAL write and the census no longer counts it`);
  assert.equal(excludedAs.has(n), false, `${FILE}:${n} (${what}) is a REAL write and was reported as excluded`);
};

/* ---- the three proved non-write shapes ------------------------------------------------------ */

test("🔴 SHAPE declaration — the four helper-named function declarations in the store are not write sites", () => {
  const decls = find((t) => /^function (appendWithoutDedupe|appendIfNew)\(/.test(t));
  assert.equal(decls.length, 4, `expected the four helper declarations (two per factory), found ${decls.length}`);
  for (const n of decls) assertExcluded(n, "declaration", "a function declaration");
});

test("🔴 SHAPE string-literal — the two whole-line error-message strings that name a helper are not write sites", () => {
  const strings = find((t) => t.startsWith('"') && t.includes("use appendWithoutDedupe() for anything else"));
  assert.equal(strings.length, 2, `expected the two continued error messages, found ${strings.length}`);
  for (const n of strings) assertExcluded(n, "string-literal", "a string literal");
});

test("🔴 SHAPE dry-run-call — the dry-run factory's call to its own in-memory append is not a write site", () => {
  const n = exactlyOne(find((t) => t === "for (const r of records) appendWithoutDedupe(r);", DRY_RUN, JSONL - 1), "loop call inside createDryRunStore");
  assertExcluded(n, "dry-run-call", "a call to the dry-run store's in-memory append");
});

/* ---- the five real writes: each must still be counted -------------------------------------- */

test("🔴 REAL WRITE — mkdirSync in the real store's ensureDir is a write site", () => {
  assertSite(exactlyOne(find((t) => t.startsWith("if (!existsSync(dir)) mkdirSync(")), "mkdirSync line"), "mkdirSync");
});

test("🔴 REAL WRITE — appendFileSync in the real store's appendWithoutDedupe is a write site", () => {
  assertSite(exactlyOne(find((t) => t.startsWith("appendFileSync(filePath,")), "appendFileSync line"), "appendFileSync");
});

test("🔴 REAL WRITE — the real store's appendAllWithoutDedupe loop call is a write site", () => {
  const n = exactlyOne(find((t) => t === "for (const r of records) appendWithoutDedupe(r);", JSONL), "loop call inside createJsonlStore");
  assertSite(n, "the real store's loop call");
});

test("🔴 REAL WRITE — the real store's appendIfNew call for a NEW record is a write site", () => {
  assertSite(exactlyOne(find((t) => t === "appendWithoutDedupe(record);", JSONL), "new-record append call"), "the new-record append");
});

test("🔴 REAL WRITE — the real store's appendIfNew call for a RE-SIGHTING is a write site", () => {
  assertSite(exactlyOne(find((t) => t === "appendWithoutDedupe({", JSONL), "re-sighting append call"), "the re-sighting append");
});
