/**
 * RR-333 D · AlmiVisibility as a product in the collectors (owner decision, 27 Oct 2026): SECOND in the queue; its seeds cover what it
 * does; no country five-part pages (software); its own families (features, use-cases, how-to, free tools, comparisons) counted from
 * collected data only; locations where demand is shown. Every figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUEUE } from "../site/queue.mjs";
import { queueNow, QUEUE_KEY } from "../site/owner-status.mjs";
import { visibilityPages, VIS_GROUPS } from "../desktop/visibility-pages.mjs";
import { FACT_PRODUCTS } from "../desktop/product-facts.mjs";
import { DEFAULT_SEEDS } from "../site/kw-seeds.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { kvStore } from "../site/limits.mjs";

const ON = "2026-10-27";
function fakeKv() { const m = new Map(); const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; return { result: null }; }) }); return { m, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) }; }

test("D · RR-333: AlmiVisibility SECOND in the queue (a queue the owner saved before gets it once, his later moves kept); its seeds cover what it does; no country five-part pages", async () => {
  assert.deepEqual(DEFAULT_QUEUE.products.slice(0, 3), ["oet", "visibility", "cv"]);
  const K = fakeKv(); K.m.set(QUEUE_KEY, JSON.stringify({ products: ["oet", "cv", "jobs", "visibility"], countries: ["Kenya"] }));
  assert.deepEqual((await queueNow(K.kv)).products.slice(0, 3), ["oet", "visibility", "cv"]); assert.equal(JSON.parse(K.m.get(QUEUE_KEY)).rr333, true);
  K.m.set(QUEUE_KEY, JSON.stringify({ products: ["cv", "oet", "visibility"], countries: [], rr333: true }));
  assert.deepEqual((await queueNow(K.kv)).products.slice(0, 3), ["cv", "oet", "visibility"], "his own later order is kept");
  assert.match(DEFAULT_SEEDS, /product:visibility \| AlmiVisibility \| keyword research tool, free seo checker, website audit, seo site checker, ai search visibility, rank in chatgpt/);
  assert.equal(FACT_PRODUCTS.includes("visibility"), false, "software: no country five-part pages");
});

test("D · RR-333: AlmiVisibility's own page families — ready / waiting / why from collected data only; locations where demand is shown", async () => {
  const kw = [{ keyword: "keyword research tool", location: "IN", volume: 2400 }, { keyword: "free seo checker", location: "PK", volume: 320 }, { keyword: "seo for restaurants", location: "US", volume: 90 }, { keyword: "how to rank in chatgpt", location: "US", volume: 210 }, { keyword: "what is aeo", location: "ALL", volume: 5 }, { keyword: "restaurant menu ideas", location: "US", volume: 9000 }];
  const v = visibilityPages({ keywords: kw, questions: [{ text: "How do I check if ChatGPT mentions my website?", source: "owner" }], comparisons: [{ tool: "Another tool", facts: [] }] });
  assert.deepEqual(v.features.items.filter((x) => x.ready).map((x) => x.name), ["keyword research", "free site checker", "AI search visibility"], "AEO's 5 searches are too few");
  assert.deepEqual(v.useCases.items.filter((x) => x.ready).map((x) => x.name), ["restaurant"], "\"restaurant menu ideas\" has no SEO word — not a use-case");
  assert.equal(v.howTo.ready, 0, "nothing answered from AlmiVisibility's own pages yet — never a page by itself"); assert.match(v.howTo.why, /^\d+ asked enough but not yet answered from AlmiVisibility's own pages/);
  assert.deepEqual([v.freeTools.ready, v.comparisons.ready, v.comparisons.waiting], [2, 0, 1]); assert.match(v.comparisons.why, /without a fact verified on its own page/);
  assert.deepEqual(v.locations.map((l) => l.location), ["IN", "PK", "US"], "where demand is shown — not 197 by default");
  assert.deepEqual([...VIS_GROUPS], ["product:visibility", "our Search Console · visibility"]);
  const s = memoryStore(); await s.saveFetch({ kind: "collector", group: "product:visibility", seedKey: "seed:v", location: "IN", language: "en", day: ON, at: `${ON}T01:00:00Z`, period: "p", ops: 1, rows: [{ text: "keyword research tool", said: 2400 }] });
  assert.deepEqual(await s.groupKeywords(["product:visibility"]), [{ keyword: "keyword research tool", location: "IN", volume: 2400, group: "product:visibility" }]);
  const c = cfMemoryStore(); await c.putQuestions({ product: "visibility", country: "*", source: "owner", items: [{ text: "Is AlmiVisibility free?" }], at: `${ON}T01:00:00Z` });
  assert.deepEqual((await c.productQuestions("visibility")).map((q) => q.text), ["Is AlmiVisibility free?"]);
});
