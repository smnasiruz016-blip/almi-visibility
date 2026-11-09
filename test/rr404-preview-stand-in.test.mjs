// 🔴 RR-404 · the preview stand-in answers as the preview will: a page the branch removes is 404 and out of the sitemap; a live scan
// looks for the LIVE pages only. Real proof: AlmiOET 8 Nov 23:57 — the preview held back on "Last checked" 16 (all 16 pages the branch
// removes, read from the live site), and the live scan said "Status 11" (the 11 new pages written only to the preview).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { previewStandIn, removedSlugs, withoutRemoved, scanPagesWritten } from "../desktop/preview-stand-in.mjs";
import { scanSite } from "../desktop/site-scan.mjs";

const LIVE = "https://ex.com";
const page = (title, last, fact, links = "") => `<!doctype html><html><head><title>${title}</title><link rel="canonical" href="${LIVE}/x"></head><body><main><h1>${title}</h1><p class="checked" data-last-checked="${last}">Last checked ${last}</p><p>Fee: 455 USD (checked ${fact})</p>${links}</main></body></html>`;
const sitemap = (slugs) => `<?xml version="1.0"?><urlset>${slugs.map((s) => `<url><loc>${LIVE}/${s}</loc></url>`).join("")}</urlset>`;

/** the live site: home, robots, sitemap listing kept + removed; the removed page's OLD live copy says a newer "Last checked" */
function liveSite({ homeLinks = "" } = {}) {
  const files = {
    "/": page("Home", "2026-10-01", "2026-10-01", homeLinks),
    "/robots.txt": `User-agent: *\nAllow: /\nSitemap: ${LIVE}/sitemap.xml`,
    "/sitemap.xml": sitemap(["kept", "gone"]),
    "/gone": page("Gone", "2026-11-06", "2026-10-27"),
    "/kept": page("Kept OLD", "2026-11-06", "2026-10-27"),
  };
  return async (u) => { const p = new URL(u).pathname; const body = files[p]; const ct = p.endsWith(".xml") ? "application/xml" : p.endsWith(".txt") ? "text/plain" : "text/html"; return new Response(body ?? "not found", { status: body == null ? 404 : 200, headers: { "content-type": ct } }); };
}
const branchHeld = new Map([["kept", "visibility-pages/kept/index.html"]]);
const prodHeld = new Map([["kept", "visibility-pages/kept/index.html"], ["gone", "visibility-pages/gone/index.html"]]);
const branchFiles = { kept: page("Kept", "2026-10-27", "2026-10-27") };
const scanWith = (gone, fetchImpl = liveSite()) => scanSite({ origin: LIVE, pages: [`${LIVE}/kept`], fetchImpl: previewStandIn({ live: LIVE, held: branchHeld, gone, readPage: (s) => branchFiles[s] ?? null, fetchImpl }) });
const row = (s, key) => s.rows.find((r) => r.key === key);

test("removedSlugs: in production's folder, not in the branch's", () => {
  assert.deepEqual([...removedSlugs(prodHeld, branchHeld)], ["gone"]);
  assert.deepEqual([...removedSlugs(branchHeld, branchHeld)], []);
});

test("withoutRemoved drops only the removed pages' <url> entries", () => {
  const x = withoutRemoved(sitemap(["kept", "gone", "gone-not"]), new Set(["gone"]));
  assert.match(x, /\/kept</); assert.match(x, /\/gone-not</); assert.doesNotMatch(x, /\/gone</);
});

test("🔴 the 23:57 failure, reproduced: without the removed pages known, the stand-in scans the OLD live copy and fails \"Last checked\"", async () => {
  const s = await scanWith(new Set());
  assert.equal(row(s, "lastChecked").count, 1); assert.match(row(s, "lastChecked").sample[0], /\/gone: says 2026-11-06, its oldest fact 2026-10-27/);
});

test("with them known: the preview's answer — 0 \"Last checked\", 0 Status, and the removed page is not crawled", async () => {
  const s = await scanWith(new Set(["gone"]));
  assert.equal(row(s, "lastChecked").count, 0); assert.equal(row(s, "status").count, 0); assert.equal(s.ok, true, JSON.stringify(s.rows.filter((r) => !r.ok)));
});

test("🔴 the scan is not weakened: a page that still links to a removed page fails Status and Internal links (as on the preview)", async () => {
  const s = await scanWith(new Set(["gone"]), liveSite({ homeLinks: `<a href="${LIVE}/gone">old</a>` }));
  assert.equal(row(s, "status").count, 1); assert.match(row(s, "status").sample[0], /\/gone: 404/);
  assert.equal(row(s, "links").count, 1); assert.equal(s.ok, false);
});

test("the branch's own file is what the scan reads for a kept page (not the live copy)", async () => {
  const s = await scanWith(new Set(["gone"]));
  assert.equal(row(s, "titles").ok, true); assert.ok(!row(s, "lastChecked").sample.some((x) => x.includes("/kept")));
});

test("🔴 scanPagesWritten: a live scan looks for LIVE pages; PREVIEW ones only on the preview or right after the merge", () => {
  const pub = [{ url: "a", state: "LIVE" }, { url: "b", state: "PREVIEW" }, { url: "c", state: "DRAFT" }];
  assert.deepEqual([...scanPagesWritten(pub, { preview: false })], ["a"]);
  assert.deepEqual([...scanPagesWritten(pub, { preview: true })], ["a", "b"]);
  assert.deepEqual([...scanPagesWritten(pub, { afterMerge: true })], ["a", "b"]);
});

test("wiring: scanFor uses the stand-in with production's folder, read only; go-live passes prod and afterMerge; the build packs the module", () => {
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), gl = readFileSync(new URL("../desktop/go-live.mjs", import.meta.url), "utf8"), build = readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8");
  assert.match(main, /githubFolderPages\(\{ target: \{ \.\.\.conn, branch: prod \}[^)]*make: false \}\)/);
  assert.match(main, /fetchImpl = previewStandIn\(\{ live, held: f\.held, gone,/);
  assert.match(main, /const written = scanPagesWritten\(pread\(id, "published\.json", \[\]\), \{ preview, afterMerge \}\)/);
  assert.match(gl, /scan\(pv\.d\.url, \{ preview: true, bypass, head, prod \}\)/);
  assert.match(gl, /scan\(conn\.site, \{ preview: false, afterMerge: true \}\)/);
  assert.match(build, /"preview-stand-in\.mjs"/);
});
