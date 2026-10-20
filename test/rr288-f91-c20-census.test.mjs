/**
 * F91 C20 — "A PAGE GENERATED BEFORE VISIBILITY IS NEVER USED" (Acceptance Amendment 7, RR-289; beta-g decision A; RR-288's census restated).
 * Every F91 path (an entry point under bin/ that loads F91's planner, its demand connection, its spec compiler or F35's evidence reader) that
 * reads the client's page population reads it ONLY through the C20 filter: KEEP from its own batch (src/page/c20-keep.mjs readC20Keep) handed
 * to the reader (keep: c20.keep). A path that reads the population without it turns this red. REAL: the declared batch's filter keeps the pages
 * Visibility built and the client's current live site pages, and drops every page of the stored crawl generated before Visibility.
 * Nothing fetched or written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readC20Keep, C20_NOT_DECLARED } from "../src/page/c20-keep.mjs";
import { withoutGeneratedPages } from "../src/page/existing-page-population.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const F91_MODULES = /src\/page\/(page-plan|demand-connection|spec-compiler|action-evidence)\.mjs/;
const READS = /\b(readExistingPagePopulation|readClientActionEvidence)\(\{([^\n]*)/g;
/** each F91 path; each population read it makes, and whether that read is handed C20's KEEP from readC20Keep */
export function c20Census(read = (f) => readFileSync(join(REPO, f), "utf8")) {
  const bins = readdirSync(join(REPO, "bin")).filter((f) => f.endsWith(".mjs")).map((f) => `bin/${f}`).sort();
  const paths = bins.filter((b) => F91_MODULES.test(read(b)));
  const reading = [], unfiltered = [];
  for (const b of paths) {
    const t = read(b); const calls = [...t.matchAll(READS)];
    if (!calls.length) continue;
    reading.push(b);
    if (!/readC20Keep\(/.test(t) || calls.some((m) => !/keep: c20\.keep/.test(m[2]))) unfiltered.push(b);
  }
  return { paths, reading, unfiltered };
}

test("C20 · CENSUS · every F91 path that reads the client's page population reads it through the C20 filter — none without it", () => {
  const c = c20Census();
  /* RR-295: bin/build-page.mjs left the F91 paths — it builds only the one builder's stored pages and reads no page population (9 -> 8, 7 -> 6) */
  assert.equal(c.paths.length, 8, `the F91 paths moved: ${c.paths.join(", ")}`);
  assert.equal(c.reading.length, 6, "the paths that read the population moved");
  assert.deepEqual(c.unfiltered, [], "an F91 path reads the page population without the C20 filter — a page generated before Visibility could stand");
  /* CONTROL: a planted unfiltered read in a clean F91 path fires */
  const planted = c20Census((f) => { const t = readFileSync(join(REPO, f), "utf8"); return f === "bin/page-plan.mjs" ? `${t}\nreadExistingPagePopulation({ scope });\n` : t; });
  assert.deepEqual(planted.unfiltered, ["bin/page-plan.mjs"], "the census cannot see a planted unfiltered read");
});

test("C20 · THE FILTER · FIRING CONTROL: only pages Visibility built and the client's current site stand; every other page is excluded by URL; no KEEP leaves the population as read", () => {
  const pop = { tenantId: "t", coverageState: "PARTIAL", pages: [{ pageId: "a", url: "https://c.example/old-1", html: "x" }, { pageId: "b", url: "https://c.example/guide", html: "y" }] };
  const keep = { pages: [{ url: "https://c.example/guide/", html: "G", origin: "VISIBILITY_BUILT" }, { url: "https://c.example/", html: "", origin: "CURRENT_SITE" }] };
  const out = withoutGeneratedPages(pop, keep);
  assert.deepEqual(out.pages.map((p) => p.url), ["https://c.example/guide", "https://c.example/"]);
  assert.deepEqual([...out.excludedGenerated], ["https://c.example/old-1"]);
  assert.equal(out.coverageState, "COMPLETE");
  assert.equal(withoutGeneratedPages(pop, null), pop, "no KEEP changed the population");
  assert.equal(readC20Keep(join(REPO, "no-such-batch")).line, C20_NOT_DECLARED);
});

const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "current-site-2026-10-19.json"));
test("REAL · C20 on the declared batch: the 12 pages Visibility built and the 2 current site pages stand; the 27 crawled pages generated before Visibility are all excluded", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const k = readC20Keep(BATCH);
  assert.deepEqual([k.declared, k.counts.built, k.counts.current], [true, 12, 2]);
  const data = lookupStore(rootIndexFor(process.env), "RESEARCH").rootPath;
  const crawl = readFileSync(join(data, "observations", "crawl-2026-09-12", "first-real-crawl-2026-09-12.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => r.record_type === "page" && /^https:\/\/almioet\./.test(r.canonical_url ?? ""));
  assert.ok(crawl.length > 0, "EMPTY real population: no crawled page of the client");
  const out = withoutGeneratedPages({ tenantId: "t", coverageState: "PARTIAL", pages: crawl.map((r) => ({ pageId: r.page_id, url: r.canonical_url, html: "" })) }, k.keep);
  assert.equal(out.excludedGenerated.length, crawl.length, "a page generated before Visibility stands");
  assert.deepEqual(out.pages.map((p) => p.origin).sort(), [...Array(2).fill("CURRENT_SITE"), ...Array(12).fill("VISIBILITY_BUILT")]);
  console.log(`  REAL (count-only): crawled pages of the client ${crawl.length} — all excluded · standing ${out.pages.length} (built 12, current site 2)`);
});
