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
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(main, /ads: \{ connected: \(\(\) => \{ try \{ const s = ads\(\)\.status\(\);/);
});
