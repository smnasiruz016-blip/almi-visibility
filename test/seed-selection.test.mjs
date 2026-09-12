import test from "node:test";
import assert from "node:assert/strict";

import { selectSeeds, renderSelection, SELECTION_RULE, MAX_SEEDS, MAX_SEEDS_PER_HOST } from "../src/crawl/seed-selection.mjs";
import { reachabilityState, IPV6_STATES } from "../src/crawl/ipv6.mjs";

const rows = (spec) =>
  spec.flatMap(([host, n, impressions]) =>
    Array.from({ length: n }, (_, i) => ({
      url: `https://${host}/p${String(i).padStart(4, "0")}`,
      clicks: 0,
      impressions,
    })),
  );

/* ================================================================== *
 * A2 — THE SELECTION IS DETERMINISTIC AND REPRODUCIBLE.
 * ================================================================== */

test("🔴 the rule is a verbatim string that travels with the result", () => {
  const sel = selectSeeds(rows([["a.example.com", 3, 5]]));
  assert.equal(sel.rule, SELECTION_RULE);
  assert.match(sel.rule, /impressions DESC/);
  assert.match(sel.rule, /tie-break by URL ASC/);
  assert.match(sel.rule, /first 500/);
  assert.match(sel.rule, /per-host cap 150/);
});

test("🔴 the same input yields the SAME selection, in the same order, every time", () => {
  // 🔴 All ties on impressions. Without the URL tie-break the order would be
  // whatever the engine's sort happened to do, and the run would be
  // irreproducible — which is the same as having no rule at all.
  const input = rows([["a.example.com", 50, 1]]);
  const one = selectSeeds(input, { maxUrls: 10, maxPerHost: 10 });
  const two = selectSeeds([...input].reverse(), { maxUrls: 10, maxPerHost: 10 });
  assert.deepEqual(one.selected, two.selected, "the selection depends on input ORDER — it is not reproducible");
  assert.deepEqual(one.selected.slice(0, 3), [
    "https://a.example.com/p0000",
    "https://a.example.com/p0001",
    "https://a.example.com/p0002",
  ]);
});

test("impressions DESC really orders the selection", () => {
  const sel = selectSeeds(
    [
      { url: "https://a.example.com/low", impressions: 1 },
      { url: "https://a.example.com/high", impressions: 900 },
      { url: "https://a.example.com/mid", impressions: 50 },
    ],
    { maxUrls: 2, maxPerHost: 10 },
  );
  assert.deepEqual(sel.selected, ["https://a.example.com/high", "https://a.example.com/mid"]);
});

test("🔴 the per-host cap stops one host consuming the run — and the EXCLUDED count survives", () => {
  const sel = selectSeeds(rows([["big.example.com", 400, 10], ["small.example.com", 20, 5]]), {
    maxUrls: 500,
    maxPerHost: 150,
  });
  const big = sel.byHost.find((h) => h.host === "big.example.com");
  assert.equal(big.selected, 150);
  assert.equal(big.available, 400);
  // 🔴 "150 selected" and "this host has 150 pages" are different facts. The
  // second is what a reader infers if the excluded count is dropped.
  assert.equal(big.excludedByHostCap, 250);
  const small = sel.byHost.find((h) => h.host === "small.example.com");
  assert.equal(small.selected, 20);
  assert.equal(small.excludedByHostCap, 0);
});

test("🔴 the total cap is 500 and excess is COUNTED, not silently dropped", () => {
  const sel = selectSeeds(rows([...Array.from({ length: 10 }, (_, i) => [`h${i}.example.com`, 100, 5])]));
  assert.equal(sel.selected.length, MAX_SEEDS);
  assert.equal(sel.seedPoolSize, 1000);
  assert.ok(sel.excludedByTotalCap > 0, "500 of 1000 must record what was left behind");
  assert.equal(sel.bounds.maxUrls, MAX_SEEDS);
  assert.equal(sel.bounds.maxPerHost, MAX_SEEDS_PER_HOST);
});

test("an empty pool is refused — the selection would be vacuous", () => {
  assert.throws(() => selectSeeds([]), /vacuous/);
});

test("an unparseable URL is counted, not silently skipped", () => {
  const sel = selectSeeds([{ url: "not a url", impressions: 5 }, { url: "https://a.example.com/x", impressions: 1 }]);
  assert.equal(sel.unparseable.length, 1);
  assert.equal(sel.selected.length, 1);
});

/* ================================================================== *
 * A3 — THE BREAKDOWN IS PRINTED BEFORE ANY FETCH, WITH ITS DENOMINATOR.
 * ================================================================== */

test("🔴 the pre-fetch breakdown prints selected, excluded AND available", () => {
  const sel = selectSeeds(rows([["big.example.com", 400, 10]]));
  const text = renderSelection(sel);
  assert.match(text, /SELECTION RULE: sort by impressions DESC/);
  assert.match(text, /maxUrls=500 maxPerHost=150/, "LAW-BOUND-1: the bounds must print");
  assert.match(text, /big\.example\.com\s+150\s+250\s+400/, "selected, excluded and available must all appear");
  assert.match(text, /% of the pages with any search presence/, "the coverage fraction must be stated, not left to the reader");
});

/* ================================================================== *
 * B3 — THE THIRD STATE. MEASURED, NEVER INFERRED.
 * ================================================================== */

test("🔴 AAAA-only host + no IPv6 egress = UNREACHABLE_NO_IPV6", () => {
  const v = reachabilityState({
    families: { hostname: "ghost.example.com", hasA: false, hasAAAA: true },
    egress: { state: "UNAVAILABLE", detail: "no IPv6 connection within 5000ms" },
  });
  assert.equal(v.state, "UNREACHABLE_NO_IPV6");
  assert.match(v.because, /publishes AAAA and no A record/);
  assert.match(v.because, /not their permissions and not an absence of data/);
});

test("🔴 AAAA-only host + IPv6 egress AVAILABLE = ordinary; no special state", () => {
  assert.equal(
    reachabilityState({
      families: { hostname: "ghost.example.com", hasA: false, hasAAAA: true },
      egress: { state: "AVAILABLE", detail: "connected" },
    }),
    null,
  );
});

test("a host with an A record is never given the third state, whatever our IPv6 is", () => {
  assert.equal(
    reachabilityState({
      families: { hostname: "normal.example.com", hasA: true, hasAAAA: true },
      egress: { state: "UNAVAILABLE", detail: "none" },
    }),
    null,
  );
});

test("a host that resolves to nothing at all is not an IPv6 question", () => {
  assert.equal(
    reachabilityState({
      families: { hostname: "nx.example.com", hasA: false, hasAAAA: false },
      egress: { state: "UNAVAILABLE", detail: "none" },
    }),
    null,
  );
});

test("the IPv6 states are declared and include UNKNOWN", () => {
  assert.deepEqual([...IPV6_STATES], ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]);
});

/* ------------------------------------------------------------------ *
 * 🔴 A RESOLVER FAILURE IS NOT A FINDING ABOUT THE HOST.
 *
 * The first version of `addressFamilies` returned `false` on any DNS error. On
 * a machine whose Node resolver is 127.0.0.1 (refusing connections) that made
 * EVERY host report "publishes nothing" — a resolver failure rendered as a
 * fact about the host, and a plausible-looking row nobody would question.
 * ------------------------------------------------------------------ */

test("🔴 a DNS error yields UNKNOWN, never UNREACHABLE and never 'publishes nothing'", () => {
  const v = reachabilityState({
    families: { hostname: "x.example.com", hasA: null, hasAAAA: null, error: "ECONNREFUSED" },
    egress: { state: "UNAVAILABLE", detail: "none" },
  });
  assert.equal(v.state, "UNKNOWN");
  assert.match(v.because, /could not be read/);
  assert.match(v.because, /fact about our resolver, not about the host/);
});

test("🔴 an UNKNOWN DNS result must not fall through to 'ordinary' either", () => {
  // Returning null here would silently treat an unmeasured host as fine.
  const v = reachabilityState({
    families: { hostname: "x.example.com", hasA: null, hasAAAA: true, error: "ESERVFAIL" },
    egress: { state: "AVAILABLE", detail: "connected" },
  });
  assert.ok(v, "a partially-unknown DNS answer must still be reported");
  assert.equal(v.state, "UNKNOWN");
});
