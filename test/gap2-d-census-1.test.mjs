/**
 * 🔴 D-CENSUS-1 · THE `appendAllWithoutDedupe(` UNDER-COUNT (owner ruling, 17 September 2026)
 *
 * The census's write-helper call shapes named `appendAll(`, which `appendAllWithoutDedupe(` does not contain, so
 * three real bin call sites were never enumerated. The shape is now recognised. This file holds both directions:
 *
 *   POSITIVE — the three call sites are write sites, and each is GATED;
 *   NEGATIVE — the verb's own declaration (store.mjs, `function appendAllWithoutDedupe(`) is excluded as a
 *              declaration, never a site, and every exclusion proved before it (#103) still holds.
 *
 * 🔴 A FIXED INPUT. The census scans tools/ too, so a census run over the repository includes the census's own
 * file. This file hands it exactly the five files it judges, read here, through `sources`; nothing else is read.
 * Lines are found by what they say, never by a remembered number.
 *
 * GAP2_CENSUS_IMPL — for the sabotage harness only: it names a COPY of the census to test, so the live file is
 * never mutated. Unset, the live tools/permitted-writers.mjs is tested.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const IMPL = process.env.GAP2_CENSUS_IMPL ? pathToFileURL(process.env.GAP2_CENSUS_IMPL).href : new URL("../tools/permitted-writers.mjs", import.meta.url).href;
const { writeSiteCensus } = await import(IMPL);

const VERB = ["append", "AllWithoutDedupe"].join("");
const FILES = ["bin/instrument-disagreement.mjs", "bin/supersede-noindex.mjs", "bin/supersede-duplicates.mjs", "src/evidence/store.mjs", "src/crawl/persist.mjs"];
const sources = FILES.map((file) => ({ file, text: readFileSync(REPO + file, "utf8") }));
const census = writeSiteCensus({ sources });
const linesOf = (file) => sources.find((s) => s.file === file).text.split(/\r?\n/);
const find = (file, pred) => linesOf(file).map((l, i) => [l.trim(), i + 1]).filter(([t]) => pred(t)).map(([, n]) => n);
const one = (file, pred, what) => {
  const hits = find(file, pred);
  assert.equal(hits.length, 1, `${file}: expected exactly one ${what}, found ${hits.length}`);
  return hits[0];
};
const siteAt = (file, n) => census.sites.find((s) => s.file === file && s.line === n);
const excludedAt = (file, n) => census.excludedNonWrites.find((e) => e.file === file && e.line === n);
const assertExcluded = (file, n, shape, what) => {
  assert.equal(siteAt(file, n), undefined, `${file}:${n} (${what}) is counted as a write site`);
  assert.equal(excludedAt(file, n)?.shape, shape, `${file}:${n} (${what}) is not excluded as "${shape}"`);
};

test("🔴 POSITIVE · every bin call of the store's bulk verb is a GATED write site — or its caller is ROUTED", () => {
  for (const file of ["bin/instrument-disagreement.mjs", "bin/supersede-noindex.mjs", "bin/supersede-duplicates.mjs"]) {
    const text = sources.find((s) => s.file === file).text;
    if (/executeGovernedWrite\(/.test(text)) {
      /* 🔴 STRICTER, AND THIS ROUTING IS WHAT MADE THE OLD FORM WRONG. A routed caller performs the bulk verb
       * NOWHERE: it names the discipline and the boundary performs it in src/. So the demand becomes no call site
       * at all, PLUS a real boundary call naming this very verb — neither of which a gate can satisfy. The
       * under-count this file exists to prevent is still impossible: a caller that stopped naming the verb
       * without routing would fail the else branch below. */
      assert.deepEqual(find(file, (t) => t.includes(`store.${VERB}(`)), [], `${file}: routed, yet still calls store.${VERB}( directly`);
      assert.match(text, /discipline: "APPEND_ALL_WITHOUT_DEDUPE"/, `${file}: routed but does not name the bulk discipline`);
      continue;
    }
    const n = one(file, (t) => t.includes(`store.${VERB}(`), `store.${VERB}( call`);
    const s = siteAt(file, n);
    assert.ok(s, `${file}:${n} calls store.${VERB}( and is not a write site`);
    assert.equal(s.state, "GATED", `${file}:${n} is ${s.state}, not GATED`);
  }
});

test("🔴 NEGATIVE · the verb's own declaration in the real store is excluded as a declaration, never a site", () => {
  const n = one("src/evidence/store.mjs", (t) => t.startsWith(`function ${VERB}(`), `function ${VERB}( declaration`);
  assertExcluded("src/evidence/store.mjs", n, "declaration", `the ${VERB} declaration`);
});

test("NEGATIVE · the four helper declarations proved in #103 remain excluded", () => {
  const decls = find("src/evidence/store.mjs", (t) => /^function (appendWithoutDedupe|appendIfNew)\(/.test(t));
  assert.equal(decls.length, 4);
  for (const n of decls) assertExcluded("src/evidence/store.mjs", n, "declaration", "a #103 declaration");
});

test("NEGATIVE · the two whole-line strings proved in #103 remain excluded", () => {
  const strings = find("src/evidence/store.mjs", (t) => t.startsWith('"') && t.includes("use appendWithoutDedupe() for anything else"));
  assert.equal(strings.length, 2);
  for (const n of strings) assertExcluded("src/evidence/store.mjs", n, "string-literal", "a #103 string literal");
});

test("NEGATIVE · the dry-run store's own call proved in #103 remains excluded", () => {
  const dry = one("src/evidence/store.mjs", (t) => t.startsWith("export function createDryRunStore("), "createDryRunStore");
  const real = one("src/evidence/store.mjs", (t) => t.startsWith("export function createJsonlStore("), "createJsonlStore");
  const n = find("src/evidence/store.mjs", (t) => t === "for (const r of records) appendWithoutDedupe(r);").filter((k) => k > dry && k < real);
  assert.equal(n.length, 1);
  assertExcluded("src/evidence/store.mjs", n[0], "dry-run-call", "the #103 dry-run call");
});

test("NEGATIVE · the persist.mjs declaration proved in #103 remains excluded", () => {
  const n = one("src/crawl/persist.mjs", (t) => t.startsWith("export function persistCrawlObservations("), "persistCrawlObservations declaration");
  assertExcluded("src/crawl/persist.mjs", n, "declaration", "the #103 persist declaration");
});
