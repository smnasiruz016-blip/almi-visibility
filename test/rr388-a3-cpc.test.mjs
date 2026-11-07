/**
 * RR-388 PART B1 · A3 CPC (free): Keyword Planner's own top-of-page bids, from the owner's own Google Ads connection, kept per keyword in
 * the keyword database. Not connected → the collector waits and the Issues list says "You: connect Google Ads".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rowsOfIdeas, bidsOf } from "../desktop/ads-wire.mjs";
import { findIssues, WHO } from "../desktop/issues.mjs";

test("A3 · the bids as Google gives them (micros → the account's currency); none given → none written", () => {
  const rows = rowsOfIdeas({ results: [{ text: "oet exam", keywordIdeaMetrics: { avgMonthlySearches: "1000", competition: "LOW", lowTopOfPageBidMicros: "1230000", highTopOfPageBidMicros: "4560000" } }, { text: "oet nursing", keywordIdeaMetrics: { avgMonthlySearches: "100" } }] });
  assert.deepEqual([rows[0].bidLow, rows[0].bidHigh], [1.23, 4.56]); assert.deepEqual([rows[1].bidLow, rows[1].bidHigh], [null, null]);
  assert.deepEqual(bidsOf({ lowTopOfPageBidMicros: "x" }), { bidLow: null, bidHigh: null });
  const db = readFileSync(new URL("../desktop/keyword-db.mjs", import.meta.url), "utf8"); assert.match(db, /bidLow: r\.bidLow \?\? null, bidHigh: r\.bidHigh \?\? null/, "kept in the keyword database");
});

test("A3 · not connected → the Issues list: You: connect Google Ads; connected → no such line", () => {
  const off = findIssues({ ads: { connected: false } }).find((x) => x.source === "Google Ads");
  assert.ok(off); assert.equal(off.who, WHO.YOU); assert.match(off.step, /^You: connect Google Ads/);
  assert.equal(findIssues({ ads: { connected: true } }).some((x) => x.source === "Google Ads"), false);
});

test("A3 · on the SERVER too (the 7 Nov census found the bids dropped there): kept per keyword × place × language × day in kw_bid, the newest read back", async () => {
  const { memoryStore, SCHEMA } = await import("../site/kw-store.mjs");
  assert.match(SCHEMA, /CREATE TABLE IF NOT EXISTS kw_bid \(keyword text NOT NULL, location text NOT NULL, language text NOT NULL, day date NOT NULL, low numeric, high numeric/);
  const s = memoryStore(), rows = rowsOfIdeas({ results: [{ text: "OET exam", keywordIdeaMetrics: { avgMonthlySearches: "1000", lowTopOfPageBidMicros: "1230000", highTopOfPageBidMicros: "4560000" } }, { text: "oet nursing", keywordIdeaMetrics: { avgMonthlySearches: "100" } }] });
  await s.saveFetch({ kind: "collector", seedKey: "k1", location: "GB", language: "en", day: "2026-11-07", at: "2026-11-07T08:00:00Z", ops: 1, rows });
  await s.saveFetch({ kind: "collector", seedKey: "k2", location: "GB", language: "en", day: "2026-11-08", at: "2026-11-08T08:00:00Z", ops: 1, rows: rowsOfIdeas({ results: [{ text: "oet exam", keywordIdeaMetrics: { avgMonthlySearches: "1000", lowTopOfPageBidMicros: "1500000", highTopOfPageBidMicros: "5000000" } }] }) });
  const b = await s.bids(["oet exam", "oet nursing"], { location: "GB", language: "en" });
  assert.deepEqual(b.get("oet exam"), { low: 1.5, high: 5, day: "2026-11-08" }, "the newest"); assert.equal(b.has("oet nursing"), false, "none given → none written");
  assert.match(readFileSync(new URL("../site/kw-store.mjs", import.meta.url), "utf8"), /INSERT INTO kw_bid \(keyword, location, language, day, low, high, at\)/);
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(main, /ads: \{ connected: \(\(\) => \{ try \{ const s = ads\(\)\.status\(\);/);
});
