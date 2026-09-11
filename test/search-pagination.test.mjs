import test from "node:test";
import assert from "node:assert/strict";

import { drainPages } from "../src/search/paginate.mjs";
import { classify, estateTable, QUERY_STATES } from "../src/search/query-state.mjs";
import { propertyCovers } from "../src/search/google-search-console.mjs";
import { costRecord, assertProviderShape } from "../src/search/provider.mjs";

/* ------------------------------------------------------------------ *
 * PART ONE — 🔴 THE PAGINATION LAW, AGAINST A MOCK THAT LIES.
 *
 * The 11 September 2026 defect: a rowLimit of 500 returned exactly 500 rows,
 * HTTP 200, and a hostname table naming 4 of 19 hostnames. Nothing errored.
 *
 * A live API cannot be asked to reproduce that on demand, which is why the
 * pagination loop takes an injectable page source. THIS is the test that would
 * have caught it.
 * ------------------------------------------------------------------ */

/** A source that ALWAYS returns a full page — i.e. never admits it is done. */
function neverEndingSource(rowLimit) {
  let served = 0;
  return async () => {
    const rows = Array.from({ length: rowLimit }, (_, i) => ({ n: served + i }));
    served += rowLimit;
    return { rows };
  };
}

test("🔴 THE 11 SEP DEFECT: a source that never returns a short page is NEVER 'COMPLETE'", async () => {
  const result = await drainPages(neverEndingSource(500), { rowLimitPerRequest: 500, maxRequests: 3 });

  assert.equal(result.exhausted, false, "exhausted must not be true without an observed short page");
  assert.equal(result.dataState, "UNKNOWN", "a capped read is UNKNOWN, never COMPLETE");
  assert.equal(result.truncationReason, "MAX_REQUESTS");
  assert.equal(result.requestCount, 3);
  assert.equal(result.rowCount, 1500);
});

test("exhausted becomes true ONLY on an observed short page", async () => {
  const pages = [{ rows: r(100) }, { rows: r(100) }, { rows: r(7) }];
  let i = 0;
  const result = await drainPages(async () => pages[i++], { rowLimitPerRequest: 100, maxRequests: 10 });

  assert.equal(result.exhausted, true);
  assert.equal(result.dataState, "COMPLETE");
  assert.equal(result.truncationReason, null);
  assert.equal(result.rowCount, 207);
  assert.equal(result.requestCount, 3);
});

test("a first page that is short is complete after ONE request — zero rows included", async () => {
  const empty = await drainPages(async () => ({ rows: [] }), { rowLimitPerRequest: 100, maxRequests: 5 });
  assert.equal(empty.exhausted, true);
  assert.equal(empty.dataState, "COMPLETE");
  assert.equal(empty.rowCount, 0);
  assert.equal(empty.requestCount, 1);
});

test("🔴 an EXACT multiple of the page size still costs one more request to prove", async () => {
  // 200 rows at rowLimit 100 looks finished after two full pages. It is not
  // PROVEN finished until a third request comes back short. Guessing here is
  // precisely the inference the law forbids.
  const pages = [{ rows: r(100) }, { rows: r(100) }, { rows: [] }];
  let i = 0;
  const result = await drainPages(async () => pages[i++], { rowLimitPerRequest: 100, maxRequests: 10 });
  assert.equal(result.requestCount, 3);
  assert.equal(result.exhausted, true);
  assert.equal(result.rowCount, 200);
});

test("startRow advances by the rows already collected, not by a page counter", async () => {
  const seen = [];
  const pages = [{ rows: r(50) }, { rows: r(50) }, { rows: r(3) }];
  let i = 0;
  await drainPages(
    async ({ startRow }) => {
      seen.push(startRow);
      return pages[i++];
    },
    { rowLimitPerRequest: 50, maxRequests: 10 },
  );
  assert.deepEqual(seen, [0, 50, 100]);
});

test("🔴 an API error KEEPS the rows already read and marks the result, never COMPLETE", async () => {
  let i = 0;
  const result = await drainPages(
    async () => {
      if (i++ === 0) return { rows: r(100) };
      throw new Error("HTTP 500");
    },
    { rowLimitPerRequest: 100, maxRequests: 10 },
  );
  assert.equal(result.rowCount, 100, "a partial read must not be discarded — that turns truncation into absence");
  assert.equal(result.exhausted, false);
  assert.equal(result.dataState, "UNKNOWN");
  assert.equal(result.truncationReason, "API_ERROR");
});

test("rowCount and requestCount are present on every result, always", async () => {
  for (const source of [
    async () => ({ rows: [] }),
    async () => ({ rows: r(10) }),
    neverEndingSource(10),
  ]) {
    const res = await drainPages(source, { rowLimitPerRequest: 10, maxRequests: 2 });
    assert.equal(typeof res.rowCount, "number");
    assert.equal(typeof res.requestCount, "number");
    assert.ok(res.requestCount >= 1);
  }
});

/* ------------------------------------------------------------------ *
 * PART TWO — 🔴 ZERO IS NOT ABSENT. FOUR STATES, NEVER COLLAPSED.
 * ------------------------------------------------------------------ */

test("200 with rows is ROWS; 200 without rows is a MEASURED ZERO", () => {
  assert.deepEqual(classify({ attempted: true, httpStatus: 200, rowCount: 12 }), {
    state: "ROWS", authState: "GRANTED", rowCount: 12,
  });
  assert.deepEqual(classify({ attempted: true, httpStatus: 200, rowCount: 0 }), {
    state: "ZERO", authState: "GRANTED", rowCount: 0,
  });
});

test("🔴 403 is FORBIDDEN with rowCount null — an absence that says NOTHING about the site", () => {
  const c = classify({ attempted: true, httpStatus: 403 });
  assert.equal(c.state, "FORBIDDEN");
  assert.equal(c.authState, "FORBIDDEN");
  assert.equal(c.rowCount, null, "0 here would be a number nobody counted");
});

test("🔴 NOT_QUERIED is rowCount null, and cannot carry an HTTP status", () => {
  assert.equal(classify({ attempted: false }).rowCount, null);
  assert.equal(classify({ attempted: false }).state, "NOT_QUERIED");
  assert.throws(() => classify({ attempted: false, httpStatus: 200 }), /cannot carry an HTTP status/);
});

test("an unexpected status THROWS rather than falling into ZERO", () => {
  // A 500 quietly classified as ZERO is the whole failure mode in one line.
  assert.throws(() => classify({ attempted: true, httpStatus: 500, rowCount: 0 }), /not a state this module can express/);
});

test("🔴 the estate table puts EVERY hostname in exactly one state, including the zeros", () => {
  const estate = ["a.example.com", "b.example.com", "c.example.com", "d.example.com"];
  const observed = new Map([["a.example.com", { urls: 5, clicks: 1, impressions: 9 }]]);
  const covered = (h) => h !== "d.example.com"; // d is under no queried property
  const { rows, counts } = estateTable({
    estateHostnames: estate,
    observed,
    coveredBy: covered,
    forbidden: new Set(["c.example.com"]),
  });

  assert.equal(rows.length, estate.length, "every estate hostname must appear exactly once");
  assert.deepEqual(counts, { ROWS: 1, ZERO: 1, FORBIDDEN: 1, NOT_QUERIED: 1 });

  // 🔴 b is the case the whole module exists for: covered by a queried property,
  // absent from the rows -> a MEASURED zero, not an omission.
  const b = rows.find((x) => x.hostname === "b.example.com");
  assert.equal(b.state, "ZERO");
  assert.equal(b.rowCount, 0);

  const d = rows.find((x) => x.hostname === "d.example.com");
  assert.equal(d.state, "NOT_QUERIED");
  assert.equal(d.rowCount, null, "never queried must not print as 0");
});

test("a hostname in the rows but NOT in the census is surfaced, not silently appended", () => {
  const { unlisted } = estateTable({
    estateHostnames: ["a.example.com"],
    observed: new Map([
      ["a.example.com", { urls: 1, clicks: 0, impressions: 1 }],
      ["surprise.example.com", { urls: 1, clicks: 0, impressions: 1 }],
    ]),
    coveredBy: () => true,
  });
  assert.deepEqual(unlisted, ["surprise.example.com"]);
});

test("an empty estate census is refused — the table would be vacuous", () => {
  assert.throws(() => estateTable({ estateHostnames: [], observed: new Map(), coveredBy: () => true }), /vacuous/);
});

test("every declared QUERY_STATE is reachable from classify() — no dead state", () => {
  const produced = new Set([
    classify({ attempted: true, httpStatus: 200, rowCount: 1 }).state,
    classify({ attempted: true, httpStatus: 200, rowCount: 0 }).state,
    classify({ attempted: true, httpStatus: 403 }).state,
    classify({ attempted: false }).state,
  ]);
  assert.deepEqual([...produced].sort(), [...QUERY_STATES].sort());
});

/* ------------------------------------------------------------------ *
 * PART THREE — PROPERTY COVERAGE. The thing that decides ZERO vs NOT_QUERIED.
 * ------------------------------------------------------------------ */

test("a DOMAIN property covers the apex and every subdomain", () => {
  assert.equal(propertyCovers("sc-domain:example.com", "example.com"), true);
  assert.equal(propertyCovers("sc-domain:example.com", "shop.example.com"), true);
  assert.equal(propertyCovers("sc-domain:example.com", "a.b.example.com"), true);
});

test("🔴 a DOMAIN property does NOT cover a lookalike suffix", () => {
  // "notexample.com" ends with "example.com" as a STRING. It is a different site.
  assert.equal(propertyCovers("sc-domain:example.com", "notexample.com"), false);
});

test("a URL_PREFIX property covers only its own host", () => {
  assert.equal(propertyCovers("https://example.com/", "example.com"), true);
  assert.equal(propertyCovers("https://example.com/", "shop.example.com"), false);
});

/* ------------------------------------------------------------------ *
 * PART FOUR — COST RECORDS INVENT NOTHING.
 * ------------------------------------------------------------------ */

test("🔴 an UNKNOWN amount must be null — a 0 there is a number nobody measured", () => {
  assert.throws(
    () => costRecord({ provider: "p", apiCalls: 1, billableUnits: 0, currency: "USD", amount: 0, amountState: "UNKNOWN", basis: "x" }),
    /must be null, not 0/,
  );
});

test("a cost figure without a basis is refused", () => {
  assert.throws(
    () => costRecord({ provider: "p", apiCalls: 1, billableUnits: 0, currency: "USD", amount: 0, amountState: "ZERO_BY_TARIFF", basis: "" }),
    /basis is required/,
  );
});

test("the provider shape assertion rejects a half-built adapter", () => {
  assert.throws(() => assertProviderShape({ providerId: "x", listProperties() {} }), /queryRows must be a function/);
  assert.throws(() => assertProviderShape({ listProperties() {}, queryRows() {} }), /providerId/);
});

function r(n) {
  return Array.from({ length: n }, (_, i) => ({ n: i }));
}
