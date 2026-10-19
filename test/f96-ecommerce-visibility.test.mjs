/**
 * F96 · E-commerce visibility (acceptance _handoffs AlmiVisibility_F96_ACCEPTANCE_2026-10-18.md; RR-290 T3, light proof). C1 and C5 are proved
 * here on the REAL declared projects; C2–C4 on fixtures with firing controls — their REAL limbs wait for a declared client that sells listed
 * products and files its own feed, listing export and crawl (DEFERRED-TO-FIRST-CLIENT, beta-g decision B).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { applicability, feedAgainstFacts, listingsAgainstFeed, classFacetPages, facetOf, f96Lines, F96_STATE, FACET, NO_DECLARATION } from "../src/commerce/ecommerce-visibility.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("C1 · APPLICABLE only by the project's own declaration and files; otherwise NOT APPLICABLE by name, with the reason", () => {
  const sells = applicability({ projectId: "shop", declaration: { sellsListedProducts: true, feedFiles: ["feed.json"] } });
  assert.equal(sells.state, F96_STATE.APPLICABLE);
  assert.deepEqual(sells.feedFiles, ["feed.json"]);
  const none = applicability({ projectId: "p", declaration: null });
  assert.deepEqual([none.state, none.reason], [F96_STATE.NOT_APPLICABLE, NO_DECLARATION]);
  /* FIRING CONTROL: a declaration that sells but names no file of its own is not APPLICABLE */
  assert.equal(applicability({ projectId: "p", declaration: { sellsListedProducts: true } }).state, F96_STATE.NOT_APPLICABLE);
  assert.equal(applicability({ projectId: "p", declaration: { sellsListedProducts: false, reason: "sells a service" } }).reason, "sells a service");
});

test("C2 · every feed product matched to its verified facts by identifier; each difference named; no fact → UNVERIFIED, never passed", () => {
  const facts = [{ gtin: "1", name: "Mug", price: 10, currency: "USD", availability: "in stock" }, { sku: "B", name: "Cap", price: 5, currency: "USD", availability: "in stock" }];
  const feed = [{ gtin: "1", name: "Mug", price: "10", currency: "usd", availability: "in stock" }, { sku: "B", name: "Cap", price: 6, currency: "USD", availability: "in stock" }, { sku: "Z", name: "Hat" }, { name: "no id" }];
  const r = feedAgainstFacts({ feed, facts });
  assert.deepEqual(r.counts, { products: 4, MATCH: 1, DIFFERENT: 1, UNVERIFIED: 2 });
  assert.deepEqual(r.products[1].differences.map((d) => [d.field, d.feed, d.verified]), [["price", 6, 5]]);
  /* FIRING CONTROL: a changed availability is named */
  assert.equal(feedAgainstFacts({ feed: [{ ...feed[0], availability: "out of stock" }], facts }).products[0].differences[0].field, "availability");
});

test("C3 · the merchant-listing export says the same as the feed — each field difference and each one-sided product named", () => {
  const feed = [{ sku: "A", name: "Mug", price: 10, currency: "USD", availability: "in stock" }, { sku: "B", name: "Cap", price: 5, currency: "USD", availability: "in stock" }];
  const same = listingsAgainstFeed({ feed, listings: feed });
  assert.equal(same.counts.differences, 0);
  const r = listingsAgainstFeed({ feed, listings: [{ ...feed[0], price: 12 }, { sku: "C", name: "Hat" }] });
  assert.deepEqual(r.differences.map((d) => `${d.id}:${d.kind}${d.field ? `:${d.field}` : ""}`).sort(), ["A:FIELD_DIFFERS:price", "B:IN_FEED_NOT_LISTED", "C:LISTED_NOT_IN_FEED"]);
});

test("C4 · every paginated and filter URL classed; an indexable near-copy is named; a non-facet URL is not counted", () => {
  const body = "red shoes for running and walking in the city with a soft sole and a light upper made to last for years";
  const pages = [
    { url: "https://s.example/shoes", text: body },
    { url: "https://s.example/shoes?page=2", text: "page two lists twelve other models with their own names prices sizes colours and short notes on each one" },
    { url: "https://s.example/shoes?colour=red", text: body },
    { url: "https://s.example/shoes?colour=blue", canonical: "https://s.example/shoes", text: body },
    { url: "https://s.example/shoes/page/3", noindex: true, text: body },
  ];
  const r = classFacetPages({ pages });
  assert.deepEqual(r.counts, { facetPages: 4, [FACET.OWN_CONTENT]: 1, [FACET.CANONICAL]: 1, [FACET.BLOCKED]: 1, [FACET.NEAR_COPY]: 1 });
  assert.deepEqual(r.nearCopies, ["https://s.example/shoes?colour=red"]);
  assert.equal(facetOf("https://s.example/shoes"), null);
  assert.deepEqual([facetOf("https://s.example/x?page=2").paginated, facetOf("https://s.example/x?size=9").filtered], [true, true]);
  /* FIRING CONTROL: give the near-copy its own canonical to the parent — it is no longer a near-copy left indexable */
  assert.equal(classFacetPages({ pages: [pages[0], { ...pages[2], canonical: "https://s.example/shoes" }] }).counts[FACET.NEAR_COPY], 0);
});

test("C5 · a NOT APPLICABLE project shows one line — its name and reason — and no number; an APPLICABLE part without its files reads NOT MEASURED, never 0", () => {
  const lines = f96Lines({ verdict: applicability({ projectId: "client", declaration: { sellsListedProducts: false, reason: "sells a service" } }) });
  assert.deepEqual(lines, ["F96 · client — NOT APPLICABLE: sells a service"]);
  assert.ok(!/\d/.test(lines.join(" ").replace(/^F96 · /, "")), "a number on a NOT APPLICABLE project");
  const a = f96Lines({ verdict: applicability({ projectId: "shop", declaration: { sellsListedProducts: true, feedFiles: ["f.json"] } }) });
  assert.ok(a.slice(1).every((l) => /NOT MEASURED/.test(l)), "an unfiled part reads as a number");
});

test("REAL · C1 and C5 · the declared projects: AlmiOET NOT APPLICABLE (\"sells a subscription, no listed product\"), the run's only F96 line; nothing fetched", () => {
  const r = spawnSync(process.execPath, ["bin/ecommerce-visibility.mjs", "--subject=almi-oet", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const f96 = r.stdout.split(/\r?\n/).filter((l) => /^\s+F96 ·/.test(l));
  assert.deepEqual(f96.map((l) => l.trim()), ["F96 · almi-oet — NOT APPLICABLE: sells a subscription, no listed product"]);
  assert.ok(!/\d/.test(f96[0].trim().replace(/^F96 · /, "")), "a number on a NOT APPLICABLE project");
  console.log(`  REAL: ${f96[0].trim()}`);
});

test("NEUTRALITY · the F96 module names no product, host or tenant", () => {
  const src = readFileSync(`${REPO}src/commerce/ecommerce-visibility.mjs`, "utf8");
  assert.ok(!/almi(?!visibility)|\boet\b|lamzish|shamool|tenant:[0-9a-f]/i.test(src));
  /* FIRING CONTROL */
  assert.ok(/almi(?!visibility)|\boet\b/i.test(`${src}\n// OET`));
});
