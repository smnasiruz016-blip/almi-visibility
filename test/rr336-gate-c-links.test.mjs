/**
 * RR-336 · Desktop Gate C (beta-g decision, 28 Oct 2026): a draft links at least 3 of the client's pages when the client's site has 3 or more
 * related pages; with fewer, a short list is a warning, never a block. Counted in the page's own text (navigation, header and footer excluded).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { seoPages, linksGate } from "../desktop/seo-pages.mjs";
import { readPage } from "../desktop/site-read.mjs";

const ON = "2026-10-28";
const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title><meta name="description" content="${t} at the clinic"></head><body><nav><a href="/">Home</a> <a href="/whitening">Whitening</a></nav><main>${b}</main><footer>Clinic</footer></body></html>`;
const siteOf = (extra) => ({ ok: true, origin: "https://clinic.example", readOn: ON, robotsTxt: "User-agent: *\nAllow: /\n", sitemapUrls: null, pages: [
  readPage(page("Clinic", "<h1>Family dentist</h1><p>Teeth whitening at the clinic takes 60 minutes in one visit.</p>"), "https://clinic.example/"),
  readPage(page("Teeth whitening", "<h1>Teeth whitening</h1><p>Teeth whitening at the clinic is done in one visit of 60 minutes, with results the same day.</p>"), "https://clinic.example/whitening"),
  ...extra.map(([path, t]) => readPage(page(t, `<h1>${t}</h1><p>${t} at the clinic, explained by our dentists.</p>`), `https://clinic.example${path}`))] });
const gsc = { queries: [{ query: "how long does teeth whitening take", impressions: 70 }], window: "28 days" };
const C = (d) => d.gates.find((g) => g.gate === "C");

test("RR-336 · Gate C: fewer than 3 related pages on the client's site is a warning, never a block", () => {
  const out = seoPages({ site: siteOf([]), searchConsole: gsc, on: `${ON}T10:00:00Z` });
  assert.equal(out.drafts.length, 1);
  const d = out.drafts[0];
  assert.equal(d.readyAsDraft, true, JSON.stringify(d.gates.filter((g) => g.failing.length)));
  assert.equal(d.warnings.length, 1, JSON.stringify(d.warnings));
  assert.match(d.warnings[0], /1 related page\(s\), fewer than 3/);
});

test("RR-336 · Gate C: with 3+ related pages the draft links them (ready); an edit that drops them to 2 BLOCKS it", () => {
  const site = siteOf([["/whitening-prices", "Whitening prices"], ["/whitening-aftercare", "Whitening aftercare"], ["/braces", "Braces"]]);
  const out = seoPages({ site, searchConsole: gsc, on: `${ON}T10:00:00Z` });
  const d = out.drafts[0];
  assert.equal(d.readyAsDraft, true, JSON.stringify(d.gates.filter((g) => g.failing.length)));
  assert.deepEqual(d.warnings, []);
  for (const p of ["/whitening", "/whitening-prices", "/whitening-aftercare"]) assert.ok(d.html.includes(`href="https://clinic.example${p}"`), p);
  assert.ok(!/<section class="related">[\s\S]*braces/i.test(d.html), "a page on another topic is not a related page");
  /* the client edits the draft: two links left in its own text (the menu's links do not count) */
  const edited = d.html.replace(/<section class="related">[\s\S]*?<\/section>/, '<p><a href="https://clinic.example/whitening">Whitening</a> <a href="https://clinic.example/whitening-prices">Prices</a></p>');
  const again = seoPages({ site, searchConsole: gsc, on: `${ON}T10:00:00Z`, overrides: { [d.url]: edited } }).drafts[0];
  assert.equal(again.readyAsDraft, false);
  assert.ok(C(again).failing.some((f) => /at least 3 internal links — it links 2 of the 3 related pages/.test(f)), JSON.stringify(C(again).failing));
});

test("RR-336 · linksGate counts links in the page's own text only, to the related pages", () => {
  const rel = ["/a", "/b", "/c"].map((p) => ({ href: `https://x.example${p}` }));
  const nav = '<nav><a href="/a">a</a><a href="/b">b</a><a href="/c">c</a></nav>';
  assert.match(linksGate(`${nav}<main>text</main>`, "https://x.example/new", [], rel).block, /links 0 of the 3/);
  assert.equal(linksGate(`<main><a href="/a">a</a><a href="/b#x">b</a><a href="https://x.example/c">c</a></main>`, "https://x.example/new", [], rel).block, null);
  assert.equal(linksGate("<main></main>", "https://x.example/new", [], rel.slice(0, 2)).block, null);
});

/* RR-336 · the owner's router tool: registers almi-visibility with its 4 prices, reads it back, and says only OK or FAILED */
test("RR-336 · router-register: the 4 price ids checked; POST then read back; the line never carries a secret", async () => {
  const { checkPrices, registerRoutes, PRODUCT } = await import("../tools/router-register.mjs");
  const ids = ["price_1AAAAAAA", "price_1BBBBBBB", "price_1CCCCCCC", "price_1DDDDDDD"];
  assert.equal(checkPrices(ids).ok, true);
  assert.match(checkPrices(ids.slice(0, 3)).why, /exactly 4/);
  assert.match(checkPrices([ids[0], ids[0], ids[2], ids[3]]).why, /the same/);
  assert.match(checkPrices([...ids.slice(0, 3), "prod_123456"]).why, /unlimited/);
  const A = "admin-SECRET-x", F = "forward-SECRET-y", calls = [];
  const registry = { products: [], counts: { openUnrouted: 0, failed: 0 } };
  const fake = async (url, o) => { calls.push(o); if (o.headers.Authorization !== `Bearer ${A}`) return { status: 401, ok: false };
    if (o.method === "POST") { const b = JSON.parse(o.body); registry.products = [{ id: b.product.id, forwardUrl: b.product.forwardUrl, forwardSecretSet: Boolean(b.product.forwardSecret), active: b.product.active, priceIds: b.priceIds }]; return { status: 200, ok: true }; }
    return { status: 200, ok: true, json: async () => registry }; };
  const r = await registerRoutes({ priceIds: ids, adminSecret: A, forwardSecret: F, fetchImpl: fake });
  assert.equal(r.ok, true, r.line);
  assert.deepEqual(JSON.parse(calls[0].body), { product: { ...PRODUCT, forwardSecret: F, active: true }, priceIds: ids });
  assert.equal((await registerRoutes({ priceIds: ids, adminSecret: A, checkOnly: true, fetchImpl: fake })).ok, true);
  const wrong = await registerRoutes({ priceIds: ids, adminSecret: "nope", forwardSecret: F, fetchImpl: fake });
  assert.match(wrong.line, /401/);
  const other = await registerRoutes({ priceIds: [...ids.slice(0, 3), "price_1EEEEEEE"], adminSecret: A, checkOnly: true, fetchImpl: fake });
  assert.match(other.line, /1 of the 4 price ids not routed/);
  const down = await registerRoutes({ priceIds: ids, adminSecret: A, forwardSecret: F, fetchImpl: async () => { throw new Error(`boom ${A}`); } });
  assert.match(down.line, /could not be reached/);
  for (const x of [r, wrong, other, down]) assert.ok(!x.line.includes(A) && !x.line.includes(F), x.line);
});
