/**
 * ITEM 14 — NO BLIND REGENERATION. The one feature whose PASS is an ABSENCE.
 *
 * 🔴 THE ABSENCE IS PROVED BY COUNTING, NOT BY SIMULATING THE DANGER. Building
 * a generator to test that something stops it would create the exact capability
 * the item exists to keep out, and it would then need keeping out forever.
 *
 * The second half is ID stability: a URL seen again must resolve to the page
 * record it already has. If it minted a new `page_id`, the same page would
 * become two records and "rediscovered" would be indistinguishable from "new"
 * — which is the mechanism by which a regeneration goes unnoticed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { census, CATEGORIES } from "../tools/no-generation-census.mjs";
import { targetPageId, canonicalUrl } from "../src/evidence/ids.mjs";
import { buildInventory } from "../src/crawl/inventory.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* ================================================================== *
 * THE CENSUS — what exists, counted.
 * ================================================================== */

test("population: the census scans every tracked source, deduplicated", () => {
  const r = census();
  assert.ok(r.scanned >= 80, `only ${r.scanned} files scanned — the census population is too small`);
  assert.equal(new Set(r.files).size, r.files.length, "a path was listed twice — every hit inside it double-counts");
});

test("✅ NO path writes into a product repository — the catastrophic category is empty", () => {
  assert.deepEqual(census().hits.PRODUCT_REPO_WRITE, []);
});

test("✅ NO bulk generate-all / publish-all path exists", () => {
  assert.deepEqual(census().hits.BULK_GENERATION, []);
});

/**
 * 🔴 THE CONTROL THE TWO TESTS ABOVE CANNOT DO WITHOUT.
 *
 * "The category is empty" passes when the repository is clean AND when the
 * detector is blind. A sabotage that replaced the product-repo matcher with
 * `() => false` broke NOTHING — both assertions above stayed green over a
 * detector that had stopped looking. That is a check that cannot fail, which is
 * the pattern this project hunts, and I had just written one.
 *
 * So the detectors are driven with input that MUST fire. No generator is
 * planted in the repository to do it: the source is injected.
 */
test("(b) ✅ NO path publishes — no deploy, push, package publish or release", () => {
  assert.deepEqual(census().hits.PUBLISH, []);
});

test("🔴 CONTROL: the detectors FIRE on planted paths — an empty result means clean, not blind", () => {
  const planted = census({
    sources: [
      { file: "planted/product-write.mjs", text: 'writeFileSync("C:/Projects/almi-oet/public/x.html", html, "utf8");\n' },
      { file: "planted/relative-write.mjs", text: 'writeFileSync("../almi-cv-v2/app/page.html", html, "utf8");\n' },
      { file: "planted/bulk.mjs", text: "export function generateAll(pages) { return pages; }\n" },
      { file: "planted/page.mjs", text: 'writeFileSync(join(out, "thing.html"), html, "utf8");\n' },
      { file: "planted/two-line.mjs", text: 'const target = join(dir, `${id}.html`);\nwriteFileSync(target, body, "utf8");\n' },
      { file: "planted/publish.mjs", text: 'execFileSync("vercel", ["deploy", "--prod"]);\n' },
      { file: "planted/outside.mjs", text: 'writeFileSync(join(tmpdir(), "x.json"), data);\n' },
    ],
  });
  assert.equal(planted.hits.PRODUCT_REPO_WRITE.length, 2, "the product-repo detector is blind");
  assert.equal(planted.hits.BULK_GENERATION.length, 1, "the bulk-generation detector is blind");
  assert.equal(planted.hits.PUBLISH.length, 1, "the publish detector is blind");
  // 🔴 FOUR, NOT ONE. The categories OVERLAP on purpose: a write into a product
  // repo that lands a `.html` file is both a product-repo write and a page
  // write, and it should be counted under both. Expecting the smaller number is
  // the direction that flatters a census.
  assert.equal(planted.hits.PAGE_WRITE.length, 4, "the page-write detector is blind");
  // Both product-repo writes name a path outside this repository, and so does the temp write.
  assert.equal(planted.hits.OUTSIDE_REPO_WRITE.length, 3, "the outside-repo detector is blind");
});

/**
 * 🔴 THE SHAPE THE #47 CENSUS COULD NOT SEE. A writer that names its `.html`
 * target on one line and writes a bare variable on the next. Two real writers
 * have exactly this shape, so the census reported six writers where there are
 * seven. Detecting it is a WIDENING — nothing that fired before stops firing.
 */
test("🔴 CONTROL: a page write whose target was named on the line ABOVE is still a page write", () => {
  const two = census({ sources: [{ file: "planted/x.mjs", text: 'const file = join(corpusDir, `${observationId}.html`);\nwriteFileSync(file, body, "utf8");\n' }] });
  assert.deepEqual(two.hits.PAGE_WRITE.map((h) => h.line), [2]);
  // And a variable named from a NON-html path is not.
  const json = census({ sources: [{ file: "planted/y.mjs", text: 'const file = join(dir, "report.json");\nwriteFileSync(file, body, "utf8");\n' }] });
  assert.deepEqual(json.hits.PAGE_WRITE, []);
});

/**
 * 🔴 THE CENSUS MUST NOT REPORT ITSELF, AND IT DID.
 *
 * It scans `tools/` and it lives in `tools/`. With its detectors written as
 * plain regex literals, its own source named every token it hunts — so once the
 * file was committed and `git ls-files` began listing it, the census found
 * itself: 7 page-writing paths instead of 6, plus a bulk-generation hit that
 * did not exist.
 *
 * 🔴 AND IT WAS GREEN ON THE BRANCH. The file was still untracked when the
 * suite last ran there, so it was not in the scanned population at all. The
 * suite was green for a reason that stopped being true the moment it was
 * staged — which is why a merge gets its own full run.
 *
 * Fixed the way `sealed-corpus-census.mjs` already fixes it: the tokens are
 * built from parts, never spelled out. No exemption and no self-exclusion —
 * the census still scans its own file along with everything else.
 */
test("🔴 the census does not report ITSELF — the law names nothing it hunts", () => {
  const r = census();
  assert.ok(r.files.includes("tools/no-generation-census.mjs"), "the census is not scanning itself — it must");
  for (const [key, hits] of Object.entries(r.hits)) {
    const self = hits.filter((h) => h.file === "tools/no-generation-census.mjs");
    assert.deepEqual(self, [], `${key} matched the census's own source — its detectors are spelling out their tokens`);
  }
});

test("🔴 CONTROL: a COMMENT describing a generator is not a generator", () => {
  const planted = census({
    sources: [{ file: "planted/comment.mjs", text: '// writeFileSync("C:/Projects/almi-oet/x.html", h);\n * generateAll(pages)\n' }],
  });
  assert.deepEqual(planted.hits.PRODUCT_REPO_WRITE, [], "a commented-out path was counted as a real one");
  assert.deepEqual(planted.hits.BULK_GENERATION, []);
});

/**
 * 🔴 EIGHT PAGE-WRITE SITES IN SEVEN FILES — AND UNDER AMENDMENT 2 THAT IS NOT
 * ITSELF THE FAILURE.
 *
 * Amendment 1's boundary forbade every page-writing path, and #47 pinned SIX
 * here and failed item 14 on them. Amendment 2 narrowed "page-writing path" to
 * one that writes into a product repository or publishes, and permits local
 * writers that are declared, gated and justified. So a local page write is now
 * allowed to EXIST — whether each is lawful is `test/permitted-writers.test.mjs`.
 *
 * 🔴 AND #47's SIX WAS UNDERCOUNTED. The census could not see a write whose
 * `.html` target is named on the line above: the crawler's stored bodies and a
 * chain runner's cache of fetched pages. Widened, it finds eight sites.
 *
 * Pinned so the count cannot move without somebody reading why.
 */
test("🔴 EIGHT page-write sites in SEVEN files — pinned, and reconciled against the register elsewhere", () => {
  const found = census().hits.PAGE_WRITE;
  assert.equal(found.length, 8, "the number of page-write sites changed — update the register and re-read item 14");
  const files = [...new Set(found.map((h) => h.file))].sort();
  assert.deepEqual(files, [
    "bin/build-corpus.mjs",
    "bin/build-page.mjs",
    "bin/crawl.mjs",
    "bin/nursing-chain.mjs",
    "bin/placement-measure.mjs",
    "bin/profession-chain.mjs",
    "bin/report.mjs",
  ]);
});

test("(d) ✅ NO write names a literal path outside this repository", () => {
  assert.deepEqual(census().hits.OUTSIDE_REPO_WRITE, []);
});

test("the census names what it CANNOT scan — an unstated blind spot is a false absence", () => {
  const src = readFileSync(`${REPO}tools/no-generation-census.mjs`, "utf8");
  for (const blind of ["dynamic dispatch", "node_modules", "by hand"]) {
    assert.ok(src.includes(blind), `the census does not disclose that it cannot see ${blind}`);
  }
});

test("the five categories are kept apart — a product-repo write is not a local page write", () => {
  assert.deepEqual(Object.keys(CATEGORIES).sort(), ["BULK_GENERATION", "OUTSIDE_REPO_WRITE", "PAGE_WRITE", "PRODUCT_REPO_WRITE", "PUBLISH"]);
});

/* ================================================================== *
 * ID STABILITY — a rediscovered URL is the SAME page.
 * ================================================================== */

test("🔴 a rediscovered URL resolves to its EXISTING page_id, not a second record", () => {
  const first = targetPageId("https://almiprep.almiworld.com/learn/ielts-band-scores");
  // The same page, seen again in a later run, written the way a link might be:
  // upper-case host, a trailing slash, a fragment, and parameters out of order.
  for (const variant of [
    "https://ALMIPREP.almiworld.com/learn/ielts-band-scores",
    "https://almiprep.almiworld.com/learn/ielts-band-scores/",
    "https://almiprep.almiworld.com/learn/ielts-band-scores#section-2",
  ]) {
    assert.equal(targetPageId(variant), first, `${variant} minted a new id — a re-crawl would duplicate the record`);
  }
  assert.equal(
    targetPageId("https://x.example.com/p?b=2&a=1"),
    targetPageId("https://x.example.com/p?a=1&b=2"),
    "parameter order changed the identity",
  );
});

/**
 * 🔴 AND THE DELIBERATE NON-MERGE, WHICH LOOKS LIKE A BUG UNTIL YOU READ WHY.
 *
 * A first version of the test above asserted that `?utm_source=x` collapsed to
 * the bare URL. It does not, on purpose: `canonicalUrl` refuses to drop query
 * parameters because stripping `?variant=2` would silently merge two pages that
 * serve different content — and in an append-only store a merge is
 * unrecoverable, the two sharing one id for ever. Losing a tracking parameter
 * is cheap; merging two real pages is not, so the code takes the cheap loss.
 */
test("🔴 a DIFFERENT query string is a DIFFERENT page — merging would be unrecoverable", () => {
  assert.notEqual(
    targetPageId("https://x.example.com/p?variant=2"),
    targetPageId("https://x.example.com/p"),
    "two pages that may serve different content were given one identity",
  );
});

test("🔴 REAL: the 12 September crawl holds one record per page_id — no page became two", () => {
  const records = readFileSync(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`, "utf8")
    .trim().split("\n").map((l) => JSON.parse(l));
  const pages = records.filter((r) => r.record_type === "page");
  assert.ok(pages.length > 400, `only ${pages.length} pages — too few to prove anything`);
  assert.equal(new Set(pages.map((p) => p.page_id)).size, pages.length, "a page_id appears twice in the real run");
  // And every id is the one its own URL derives — not a stored value that drifted.
  for (const p of pages) {
    assert.equal(p.page_id, targetPageId(canonicalUrl(p.canonical_url)), `${p.canonical_url}: stored id is not derivable from its URL`);
  }
});

test("🔴 re-running the inventory over the SAME observations yields the SAME ids", () => {
  const records = readFileSync(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`, "utf8")
    .trim().split("\n").map((l) => JSON.parse(l));
  // buildInventory reads `final_url`/`requested_url` off the observation's own
  // value block, so the stored records are flattened the way the crawler hands
  // them over. Edges are required and empty here: identity must not depend on
  // the graph.
  const observations = records
    .filter((r) => r.record_type === "observation")
    .map((o) => ({ ...o.value, observation_id: o.observation_id, observed_at: o.observed_at }));
  const a = buildInventory({ observations, edges: [] });
  const b = buildInventory({ observations, edges: [] });
  assert.deepEqual(
    a.pages.map((p) => p.page_id).sort(),
    b.pages.map((p) => p.page_id).sort(),
    "two runs over identical input produced different ids — identity depends on the run, not the page",
  );
  assert.equal(a.pages.length, b.pages.length);
});
