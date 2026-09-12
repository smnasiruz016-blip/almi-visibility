import test from "node:test";
import assert from "node:assert/strict";

import { collect, buildMarkdown, buildJson, buildCsv } from "../src/export/build.mjs";
import { toCsv, toJson, toMarkdown, provenanceBlock } from "../src/export/exporters.mjs";
import { assertNoUpgrade, STATE_NEVER_UPGRADES } from "../src/export/state-guard.mjs";

/** A store whose by-page measurement covers all four hostname states. */
const RECORDS = [
  {
    record_type: "observation",
    observation_id: "obs00000000000001",
    measurement_key: "mk0000000000001",
    method: "gsc.searchAnalytics.query:by-page",
    observed_at: "2026-09-12T00:00:00.000Z",
    target: { kind: "property", ref: "sc-domain:example.com" },
    content_sha256: "abc",
    collector: "t",
    collector_version: "1",
    value: {
      startDate: "2026-08-15", endDate: "2026-09-12",
      rowLimitPerRequest: 25000, maxRequests: 20,
      dataState: "PARTIAL_INPUT_MARKER_NOT_USED",
      estateTable: [
        { hostname: "a.example.com", state: "ROWS", authState: "GRANTED", rowCount: 5, clicks: 1, impressions: 9 },
        { hostname: "b.example.com", state: "ZERO", authState: "GRANTED", rowCount: 0, clicks: 0, impressions: 0 },
        { hostname: "c.example.com", state: "FORBIDDEN", authState: "FORBIDDEN", rowCount: null },
        { hostname: "d.example.com", state: "NOT_QUERIED", authState: "UNKNOWN", rowCount: null },
      ],
    },
  },
  {
    record_type: "crawl_run",
    run_id: "r1",
    coverageState: "PARTIAL",
    maxUrlsPerRun: 500, maxRequestsPerHost: 200, maxResponseBytes: 2097152,
  },
  { record_type: "resighting", observation_id: "obs00000000000001", measurement_key: "mk0000000000001", seen_at: "2026-09-12T06:00:00.000Z" },
];

const C = () => collect(RECORDS, { generatedAt: "2026-09-12T09:00:00.000Z" });

/* ================================================================== *
 * B2 — 🔴 LAW-BOUND-1 APPLIES TO EXPORTS TOO.
 * ================================================================== */

test("🔴 an export with NO stated bound is refused", () => {
  assert.throws(
    () => provenanceBlock({ title: "x", generatedAt: "t", covers: ["a"], doesNotCover: ["b"], states: {}, bounds: {} }),
    /LAW-BOUND-1/,
  );
});

test("🔴 an export that does not say what it OMITS is refused", () => {
  assert.throws(
    () => provenanceBlock({ title: "x", generatedAt: "t", covers: ["a"], doesNotCover: [], states: {}, bounds: { a: 1 } }),
    /does NOT cover/,
  );
});

test("🔴 every format states its bounds IN THE FILE", () => {
  const c = C();
  const md = buildMarkdown(c);
  const json = buildJson(c);
  const csv = buildCsv(c);
  for (const [name, text] of [["markdown", md], ["json", json], ["csv", csv]]) {
    assert.match(text, /rowLimitPerRequest/, `${name} omits the row-limit bound`);
    assert.match(text, /25000/, `${name} omits the row-limit VALUE`);
    assert.match(text, /maxUrlsPerRun/, `${name} omits the crawl cap`);
    assert.match(text, /500/, `${name} omits the crawl cap VALUE`);
  }
});

test("🔴 every format states the coverageState of its inputs", () => {
  const c = C();
  for (const text of [buildMarkdown(c), buildJson(c), buildCsv(c)]) {
    assert.match(text, /PARTIAL/, "an export of a PARTIAL inventory that does not say PARTIAL is a wrong answer on disk");
  }
});

test("every format says what it does NOT cover", () => {
  const c = C();
  for (const text of [buildMarkdown(c), buildJson(c), buildCsv(c)]) {
    assert.match(text, /not fetched|does not cover|DOES NOT COVER|doesNotCover/i);
  }
});

/* ================================================================== *
 * B3 — 🔴 AN EXPORT MAY NEVER UPGRADE A STATE.
 * ================================================================== */

test("🔴 FORBIDDEN exports as FORBIDDEN with an EMPTY count — never 0", () => {
  const c = C();

  const csv = buildCsv(c);
  const forbiddenRow = csv.split("\n").find((l) => l.startsWith("c.example.com"));
  assert.equal(forbiddenRow, "c.example.com,FORBIDDEN,,,", "a FORBIDDEN row must have empty cells, not zeros");

  const md = buildMarkdown(c);
  assert.match(md, /\| c\.example\.com \| FORBIDDEN \| — \| — \| — \|/, "markdown must render null as —, not 0");

  const json = JSON.parse(buildJson(c));
  const f = json.estate.find((r) => r.hostname === "c.example.com");
  assert.equal(f.rowCount, null, "JSON must keep null");
  assert.notEqual(f.rowCount, 0);
});

test("🔴 NOT_QUERIED exports as NOT_QUERIED with an empty count — 'we did not look' is not 'zero'", () => {
  const c = C();
  const json = JSON.parse(buildJson(c));
  const d = json.estate.find((r) => r.hostname === "d.example.com");
  assert.equal(d.state, "NOT_QUERIED");
  assert.equal(d.rowCount, null);
});

test("a MEASURED zero still exports as 0 — the distinction runs both ways", () => {
  const json = JSON.parse(buildJson(C()));
  const b = json.estate.find((r) => r.hostname === "b.example.com");
  assert.equal(b.state, "ZERO");
  assert.equal(b.rowCount, 0, "a measured zero IS zero, and must not be blanked either");
});

test("🔴 the guard THROWS if a protected state is paired with a count", () => {
  assert.throws(
    () => assertNoUpgrade({ estate: [{ hostname: "x", state: "FORBIDDEN", rowCount: 0 }] }),
    /state is FORBIDDEN but rowCount is 0/,
  );
  assert.throws(
    () => assertNoUpgrade({ rows: [{ state: "NOT_QUERIED", rowCount: 0 }] }),
    /state is NOT_QUERIED/,
  );
});

test("the guard names the PATH so a big payload can be repaired", () => {
  try {
    assertNoUpgrade({ a: { b: [{ state: "FORBIDDEN", rowCount: 3 }] } });
    assert.fail("should have thrown");
  } catch (e) {
    assert.match(e.message, /\$\.a\.b\[0\]/);
  }
});

test("the guard's protected states are declared in one table with reasons", () => {
  for (const [state, rule] of Object.entries(STATE_NEVER_UPGRADES)) {
    assert.equal(rule.countMustBe, null);
    assert.ok(rule.because.length > 20, `${state} has no written reason`);
  }
});

/* ================================================================== *
 * B1 — STABLE IDS TRAVEL WITH THE ROWS.
 * ================================================================== */

test("🔴 exports carry stable ids so a row can be referenced without re-sending it", () => {
  const c = C();
  const json = JSON.parse(buildJson(c));
  assert.equal(json.observations[0].observation_id, "obs00000000000001");
  assert.equal(json.observations[0].measurement_key, "mk0000000000001");
  assert.match(buildMarkdown(c), /obs00000000000001/);
});

test("empty issue and source sets are PRESENT with a reason, not absent", () => {
  const json = JSON.parse(buildJson(C()));
  assert.deepEqual(json.issues, []);
  assert.match(json.issuesNote, /no detector exists/);
  assert.deepEqual(json.sources, []);
});

/* ================================================================== *
 * FORMAT MECHANICS.
 * ================================================================== */

test("CSV quotes a value containing a comma, and doubles an embedded quote", () => {
  const csv = toCsv({
    provenance: provenanceBlock({ title: "t", generatedAt: "g", covers: ["c"], doesNotCover: ["d"], states: {}, bounds: { b: 1 } }),
    columns: ["a"],
    rows: [{ a: 'x,y "z"' }],
  });
  assert.match(csv, /"x,y ""z"""/);
});

test("markdown escapes a pipe so a value cannot forge a column", () => {
  const md = toMarkdown({
    provenance: provenanceBlock({ title: "t", generatedAt: "g", covers: ["c"], doesNotCover: ["d"], states: {}, bounds: { b: 1 } }),
    sections: [{ title: "s", columns: ["a"], rows: [{ a: "x|y" }] }],
  });
  assert.match(md, /x\\\|y/);
});

test("JSON export runs the upgrade guard on the real payload", () => {
  assert.throws(
    () => toJson({
      provenance: provenanceBlock({ title: "t", generatedAt: "g", covers: ["c"], doesNotCover: ["d"], states: {}, bounds: { b: 1 } }),
      data: { rows: [{ state: "FORBIDDEN", rowCount: 0 }] },
    }),
    /may never upgrade a state/,
  );
});
