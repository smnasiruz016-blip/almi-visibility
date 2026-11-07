/**
 * RR-388 PART A · a product's own subject pages (lists/own-pages.json, by its site) and the publish route with the PC off (GitHub repo →
 * Vercel's Git link → the main site serves /<slug>, off until ALMIVISIBILITY_PAGES_ORIGIN is set).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ownPlanPages, ownPagesFor } from "../desktop/own-pages.mjs";
import { ownPage, ownPageSlugs, slugOf, pagesOrigin, resetOwnPagesCache, PAGES_ENV } from "../site/own-pages-proxy.mjs";
import { siteFiles } from "../tools/bundle-site.mjs";

const LIST = { sites: { "example-tool.com": { on: "2026-11-07", proof: "proof.json", pages: [
  { title: "What is technical SEO, and how do you do it?", kind: "seo-kind", screen: "Technical SEO", items: [{ question: "What is crawling?", answers: [{ text: "Google's own guide: …", link: "https://developers.google.com/search/x", source: "Google Search Central", readOn: "2026-11-07" }] }, { question: "Which screen does this?", answers: [{ text: "Example Tool's own site: the Technical SEO screen …", link: "https://example-tool.com/features", source: "Example Tool", readOn: "2026-11-07", ownProduct: true }] }] },
  { title: "Example Tool vs Rival", kind: "comparison", items: [{ question: "How much does Rival cost?", answers: [{ text: "Rival's own pricing page: …", link: "https://rival.example/pricing", source: "Rival", readOn: "2026-11-07" }] }] },
  { title: "Empty", items: [] },
] } } };

test("A · the plan: pages → items → claims, each claim with its link and day; a judged line enters as judged (filled), our own line as our own product text", () => {
  assert.equal(ownPlanPages({ site: "https://www.other.com/", list: LIST }), null, "a product without its own list gets none");
  const x = ownPlanPages({ site: "https://example-tool.com/", list: LIST });
  assert.equal(x.pages.length, 2); assert.deepEqual(x.notBuilt, [{ title: "Empty", why: "no judged answer" }]);
  const [p, c] = x.pages; assert.equal(p.items.length, 2); assert.equal(p.items[0].claims[0].filled, true); assert.equal(p.items[0].claims[0].link, "https://developers.google.com/search/x"); assert.equal(p.items[0].claims[0].readOn, "2026-11-07");
  assert.equal(p.items[1].claims[0].ownProduct, true); assert.equal(p.items[1].claims[0].filled, undefined, "our own line is not 'judged': it is our product text (LAW 5A.5)");
  assert.deepEqual(c.links, [p.title], "a comparison links to the kinds of SEO");
  assert.ok(ownPagesFor("example-tool.com", LIST));
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  assert.equal((main.match(/buildGeneric\(\) \?\? buildOwn\(\)/g) ?? []).length, 2, "both places a plan is chosen");
  assert.match(main, /const buildOwn = \(\) => \{ const x = ownPlanPages\(\{ site: site\?\.origin/);
  assert.match(readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8"), /"own-pages\.mjs"/);
});

test("A2 · the main site serves a page from the pages project: off while unset; one plain slug only; only a 200 HTML answer", async () => {
  const asked = [], fx = async (u) => { asked.push(u); if (u.endsWith("/visibility-pages/index.json")) return new Response(JSON.stringify({ pages: [{ slug: "what-is-technical-seo" }, { slug: "../etc" }] }), { status: 200, headers: { "content-type": "application/json" } }); if (u.includes("/visibility-pages/what-is-technical-seo/")) return new Response("<!doctype html><h1>T</h1>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }); return new Response("no", { status: 404 }); };
  assert.equal(await ownPage("/what-is-technical-seo", { env: {}, fetchImpl: fx }), null); assert.equal(asked.length, 0, "unset → nothing asked");
  const env = { [PAGES_ENV]: "https://almivisibility-pages.vercel.app/" }; assert.equal(pagesOrigin(env), "https://almivisibility-pages.vercel.app");
  assert.deepEqual(await ownPage("/what-is-technical-seo/", { env, fetchImpl: fx }), { status: 200, html: "<!doctype html><h1>T</h1>" });
  assert.equal(await ownPage("/nothing-here", { env, fetchImpl: fx }), null);
  for (const p of ["/a/b", "/../x", "/UPPER", "/x?y", "/"]) assert.equal(slugOf(p), null, p);
  assert.equal(pagesOrigin({ [PAGES_ENV]: "http://x.com" }), null, "https only");
  resetOwnPagesCache(); assert.deepEqual(await ownPageSlugs({ env, fetchImpl: fx, now: 1e12 }), ["what-is-technical-seo"]);
  const app = readFileSync(new URL("../site/app.mjs", import.meta.url), "utf8"); assert.match(app, /const own = await ownPage\(u\.pathname, \{ env, fetchImpl \}\); if \(own\) return send\(200/); assert.match(app, /\.\.\.\(await ownPageSlugs\(\{ env, fetchImpl \}\)/);
  assert.ok(siteFiles().includes("site/own-pages-proxy.mjs"), "the site bundle carries it");
  const folders = JSON.parse(readFileSync(new URL("../desktop/lists/publish-folders.json", import.meta.url), "utf8")).rows; assert.ok(folders.some((r) => r.repo === "smnasiruz016-blip/almivisibility-pages" && r.folder === "visibility-pages"));
});

test("A2 · the pages repo's own build: copies the published pages, writes the list, the project answers noindex", () => {
  const d = mkdtempSync(join(tmpdir(), "pagesrepo-"));
  try {
    for (const f of ["build.mjs", "vercel.json"]) writeFileSync(join(d, f), readFileSync(new URL(`../site/pages-repo-template/${f}`, import.meta.url)));
    mkdirSync(join(d, "visibility-pages", "what-is-local-seo"), { recursive: true }); writeFileSync(join(d, "visibility-pages", "what-is-local-seo", "index.html"), "<h1>L</h1>");
    mkdirSync(join(d, "visibility-pages", "no-page"), { recursive: true });
    const r = spawnSync(process.execPath, ["build.mjs"], { cwd: d, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(d, "out", "visibility-pages", "what-is-local-seo", "index.html")));
    assert.deepEqual(JSON.parse(readFileSync(join(d, "out", "visibility-pages", "index.json"), "utf8")).pages, [{ slug: "what-is-local-seo" }]);
    const v = JSON.parse(readFileSync(join(d, "vercel.json"), "utf8")); assert.equal(v.headers[0].headers[0].value, "noindex"); assert.equal(v.outputDirectory, "out");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("A · the real list: 17 pages from the owners' own pages, every line judged PASS (proof named), a card standing in its sentence, our own site's lines as our own text", () => {
  const l = JSON.parse(readFileSync(new URL("../desktop/lists/own-pages.json", import.meta.url), "utf8")).sites["almivisibility.almiworld.com"];
  assert.equal(l.pages.length, 17); assert.match(l.proof, /proof-rr388-own-truth\.json$/); assert.equal(l.cta.label, "Get AlmiVisibility"); assert.equal(l.cta.href, "https://almivisibility.almiworld.com/pricing");
  for (const p of l.pages) { assert.ok(p.items.length >= 6, p.title); for (const it of p.items) for (const a of it.answers) { assert.match(a.link, /^https:\/\//); assert.equal(a.readOn, "2026-11-07"); if (a.card) assert.ok(a.text.includes(a.card)); assert.doesNotMatch(a.text, /DataForSEO|leapscholar/i); } }
  const x = ownPlanPages({ site: "https://almivisibility.almiworld.com/" }), own = x.pages.flatMap((p) => p.items.flatMap((it) => it.claims)).filter((c) => /almivisibility\.almiworld\.com/.test(c.link));
  assert.ok(own.length > 0 && own.every((c) => c.ownProduct === true && !c.filled)); assert.ok(x.pages.every((p) => p.links.length >= 3), "at least 3 internal links");
  assert.ok(x.pages.filter((p) => p.kind === "comparison").every((p) => !p.items.some((it) => /^How much does AlmiVisibility cost/.test(it.question))), "the price question names both (the writer joined two 'how much' questions)");
  assert.match(readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), /a\.fromOwnList === true \/\* RR-388 A \*\//, "the writer takes the own plan");
});

test("A2 · a noindex page is served but never on the list the sitemap reads; every site page carries a canonical", async () => {
  const d = mkdtempSync(join(tmpdir(), "pagesrepo2-"));
  try {
    writeFileSync(join(d, "build.mjs"), readFileSync(new URL("../site/pages-repo-template/build.mjs", import.meta.url)));
    for (const [s, h] of [["a-page", '<meta name="robots" content="index, follow"><h1>A</h1>'], ["thin-page", '<meta name="robots" content="noindex, follow"><h1>T</h1>']]) { mkdirSync(join(d, "visibility-pages", s), { recursive: true }); writeFileSync(join(d, "visibility-pages", s, "index.html"), h); }
    assert.equal(spawnSync(process.execPath, ["build.mjs"], { cwd: d }).status, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(d, "out", "visibility-pages", "index.json"), "utf8")).pages, [{ slug: "a-page" }]); assert.ok(existsSync(join(d, "out", "visibility-pages", "thin-page", "index.html")));
  } finally { rmSync(d, { recursive: true, force: true }); }
  const { findIssues, WHO } = await import("../desktop/issues.mjs");
  const waiting = findIssues({ ownPages: { count: 17, publishSet: false } }).find((x) => x.source === "publish"); assert.equal(waiting.who, WHO.YOU); assert.match(waiting.step, /smnasiruz016-blip\/almivisibility-pages, branch main, folder visibility-pages/);
  assert.equal(findIssues({ ownPages: { count: 17, publishSet: true } }).some((x) => /pages of your own/.test(x.what)), false, "connected: no line");
  const { managePage } = await import("../site/pages.mjs");
  assert.match(managePage({ sales: true }), /<meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https:\/\/almivisibility\.almiworld\.com\/manage">/);
});
