/**
 * ITEM 9 — THE SEVEN DIMENSIONS.
 *
 * 🔴 A DIMENSION IS INGESTED ONLY WHERE THE STORE PROVES IT. The FAILURE clause
 * names "any result claiming completeness it cannot show", so a truncated pull,
 * or one stored without its bounds, must not count — and each is RED-proved.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runIngest } from "../src/search/ingest.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import {
  dimensionCensus, item9Verdict, PASS_DIMENSIONS, OUTCOMES_BLOCKED_BECAUSE, measurementOnlyViolations,
} from "../src/search/dimensions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** A provider shaped like Search Console, answering by dimension. */
function countryAwareProvider() {
  const seen = [];
  return {
    providerId: "fake",
    seen,
    async listProperties() {
      return [{ propertyId: "sc-domain:example.com", propertyType: "DOMAIN", permissionLevel: "siteFullUser", authState: "GRANTED", observedAt: "t" }];
    },
    async queryRows({ propertyId, dimensions, rowLimitPerRequest = 25000, maxRequests = 20 }) {
      seen.push(dimensions.join("+"));
      const forbidden = propertyId === "https://control.invalid/";
      const key = (d) => ({ page: "https://a.example.com/1", query: "a query", country: "gbr" }[d]);
      const rows = forbidden ? [] : dimensions.length === 0
        ? [{ clicks: 3, impressions: 30, ctr: 0.1, position: 5 }]
        : [
            { keys: dimensions.map(key), clicks: 2, impressions: 20, ctr: 0.1, position: 4 },
            { keys: dimensions.map((d) => (d === "country" ? "ind" : key(d))), clicks: 1, impressions: 10, ctr: 0.1, position: 6 },
          ];
      return {
        rows, rowCount: rows.length, requestCount: 1, exhausted: !forbidden, truncationReason: forbidden ? "API_ERROR" : null,
        dataState: forbidden ? "UNKNOWN" : "COMPLETE", rowLimitPerRequest, maxRequests, httpStatus: forbidden ? 403 : 200,
        cost: { provider: "fake", apiCalls: 1, billableUnits: 0, currency: "USD", amount: 0, amountState: "ZERO_BY_TARIFF", basis: "free" },
      };
    },
  };
}

async function ingestInto(dir) {
  const store = createJsonlStore(join(dir, "e.jsonl"));
  const provider = countryAwareProvider();
  const r = await runIngest({
    provider, store, propertyId: "sc-domain:example.com", estateHostnames: ["a.example.com"],
    controlProperty: "https://control.invalid/", now: () => new Date("2026-09-12T00:00:00.000Z"),
  });
  return { r, store, provider };
}

/* ================================================================== *
 * 3A — COUNTRIES, SAME LAW AS EVERY OTHER PULL.
 * ================================================================== */

test("🔴 the ingest issues BOTH country pulls — ['country'] and ['country','query']", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-dim-"));
  try {
    const { r, provider } = await ingestInto(dir);
    assert.ok(provider.seen.includes("country"));
    assert.ok(provider.seen.includes("country+query"));
    assert.deepEqual(Object.keys(r.countryPulls), ["country", "country-query"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 each stored country pull carries its row count, request count, BOTH bounds, dataState and cost", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-dim-"));
  try {
    const { store } = await ingestInto(dir);
    for (const method of ["gsc.searchAnalytics.query:country", "gsc.searchAnalytics.query:country-query"]) {
      const rec = store.readAll().find((x) => x.method === method);
      assert.ok(rec, `${method} was not stored`);
      const v = rec.value;
      assert.equal(v.rowCount, 2);
      assert.equal(v.requestCount, 1);
      assert.equal(v.rowLimitPerRequest, 25000);
      assert.equal(v.maxRequests, 20);
      assert.equal(v.exhausted, true);
      assert.equal(v.dataState, "COMPLETE");
      assert.equal(v.cost.amountState, "ZERO_BY_TARIFF");
      assert.deepEqual(Object.keys(v.rows[0]).sort(), ["clicks", "country", "ctr", "impressions", "position", "query"]);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * 3C — MEASUREMENT ONLY. Item 8's guard must keep holding.
 * ================================================================== */

test("🔴 a stored country measurement carries no recommendation field and no demand word", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-dim-"));
  try {
    const { store } = await ingestInto(dir);
    const country = store.readAll().filter((x) => /:country/.test(x.method ?? ""));
    assert.equal(country.length, 2);
    for (const rec of country) assert.deepEqual(measurementOnlyViolations(rec.value), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 CONTROL: the guard FIRES on a country row that became a claim", () => {
  assert.equal(measurementOnlyViolations({ rows: [{ country: "gbr", impressions: 9, recommendation: "expand" }] }).length, 1);
  assert.equal(measurementOnlyViolations({ rows: [{ country: "gbr", note: "underserved market" }] }).length, 1);
});

/* ================================================================== *
 * THE CENSUS — what counts as INGESTED.
 * ================================================================== */

const obs = (pull, value, at = "2026-09-12T00:00:00.000Z") => ({
  record_type: "observation", method: `gsc.searchAnalytics.query:${pull}`, observed_at: at, value,
});
const complete = (rows, extra = {}) => ({
  startDate: "a", endDate: "b", rowCount: rows.length, requestCount: 1, exhausted: true, dataState: "COMPLETE",
  rowLimitPerRequest: 25000, maxRequests: 20, rows, ...extra,
});
const metricRow = { clicks: 1, impressions: 2, ctr: 0.5, position: 3 };

function sixPulls(countryValue = complete([{ country: "gbr", ...metricRow }])) {
  return [
    obs("page-rows", { ...complete([{ url: "u", clicks: 1, impressions: 2 }]), exhausted: undefined, requestCount: undefined }),
    obs("query", complete([{ query: "q", ...metricRow }])),
    obs("query-page", complete([{ query: "q", url: "u", ...metricRow }])),
    obs("country", countryValue),
  ];
}

test("with every buildable pull proven, six are INGESTED and outcomes is BLOCKED — which is still not seven", () => {
  const c = dimensionCensus(sixPulls());
  assert.equal(c.ingested, 6);
  assert.equal(c.blocked, 1);
  assert.equal(item9Verdict(c), "ONLY_BLOCKED_DIMENSIONS_SHORT");
  assert.notEqual(item9Verdict(c), "ALL_SEVEN_INGESTED", "🔴 six of seven was rounded up to seven");
});

test("🔴 RED: a TRUNCATED country pull claims nothing — countries is not INGESTED", () => {
  const c = dimensionCensus(sixPulls(complete([{ country: "gbr", ...metricRow }], { exhausted: false, dataState: "UNKNOWN", truncationReason: "MAX_REQUESTS" })));
  assert.equal(c.dimensions.find((d) => d.dimension === "countries").state, "BUILT_NOT_RUN");
  assert.equal(item9Verdict(c), "NOT_ALL_INGESTED");
});

test("🔴 RED: a pull stored WITHOUT its bounds cannot show completeness — not INGESTED", () => {
  const c = dimensionCensus(sixPulls(complete([{ country: "gbr", ...metricRow }], { maxRequests: undefined })));
  assert.equal(c.dimensions.find((d) => d.dimension === "countries").state, "BUILT_NOT_RUN");
  assert.equal(c.pulls.find((p) => p.pull === "country").proven, false);
});

test("🔴 downstream outcomes is BLOCKED with its evidence, and has no pull or field that clicks could stand in for", () => {
  const outcomes = PASS_DIMENSIONS.find((d) => d.dimension === "downstream outcomes");
  assert.deepEqual(outcomes.pulls, []);
  assert.equal(outcomes.field, undefined, "outcomes was given a metric field — clicks would stretch into it");
  assert.ok(OUTCOMES_BLOCKED_BECAUSE.length >= 3);
  // Even a store full of clicks leaves it BLOCKED.
  assert.equal(dimensionCensus(sixPulls()).dimensions.find((d) => d.dimension === "downstream outcomes").state, "BLOCKED");
});

test("the seven are the boundary's seven, in its order", () => {
  assert.deepEqual(PASS_DIMENSIONS.map((d) => d.dimension), ["queries", "pages", "countries", "impressions", "clicks", "CTR", "downstream outcomes"]);
});

/**
 * 🔴 REAL — THE COMMITTED EVIDENCE STORE. Five of seven. When the owner runs the
 * country pull against the real property this test goes red and must be updated
 * deliberately, with the new counts shown.
 */
const STORE = `${REPO}runs/evidence/evidence.jsonl`;
test("🔴 REAL: the committed store holds 5 of 7 — countries BUILT_NOT_RUN, outcomes BLOCKED — so item 9 does NOT tick", { skip: !existsSync(STORE) }, () => {
  const c = dimensionCensus(createJsonlStore(STORE).readAll());
  const by = Object.fromEntries(c.dimensions.map((d) => [d.dimension, d.state]));
  assert.deepEqual(by, {
    queries: "INGESTED", pages: "INGESTED", countries: "BUILT_NOT_RUN", impressions: "INGESTED",
    clicks: "INGESTED", CTR: "INGESTED", "downstream outcomes": "BLOCKED",
  });
  assert.equal(c.ingested, 5);
  assert.equal(item9Verdict(c), "NOT_ALL_INGESTED");
});
