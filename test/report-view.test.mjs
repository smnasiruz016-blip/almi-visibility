import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { renderPage, renderHeader, renderRecords, renderIssues, renderFacts, summarise, reconcile } from "../src/report/view.mjs";
import { labelFor, labelCensus, LABELS, LABEL_BY_TYPE } from "../src/report/provenance-label.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 LAW-FIXTURE-1 IN FORCE ON THIS FILE.
 *
 * These fixtures are deliberately SMALLER than production — 4 records, not
 * 1,045 — and that simplification is NAMED here so the next reader knows what
 * this file is not testing:
 *
 *   · it does not test rendering at real volume (the real page is 48 KiB);
 *   · it does not test the real record mix, which includes types this fixture
 *     does not carry.
 *
 * The tests at the foot of the file run against the REAL store for exactly
 * that reason.
 */
const CRAWL = [
  {
    record_type: "observation", observation_id: "o1", measurement_key: "m1",
    method: "crawl.fetch", observed_at: "2026-09-12T00:00:00.000Z",
    value: { requested_url: "https://a.example.com/x", final_url: "https://a.example.com/x", skipped: false },
  },
  {
    record_type: "observation", observation_id: "o2", measurement_key: "m2",
    method: "crawl.skipped", observed_at: "2026-09-12T00:00:01.000Z",
    value: { requested_url: "https://a.example.com/y", final_url: null, skipped: true },
  },
  {
    record_type: "crawl_run", run_id: "r1", urlsRequested: 2, urlsFetched: 1, requestsIssued: 1,
    capReached: false, coverageState: "COMPLETE", seedPoolSize: 10,
    maxUrlsPerRun: 500, maxRequestsPerHost: 200, maxResponseBytes: 2097152,
    selectionRule: "sort by impressions DESC, tie-break by URL ASC, take the first 500; per-host cap 150",
    cost: { amount: null, amountState: "UNKNOWN", basis: "unmeasured" },
  },
  {
    record_type: "crawl_run_correction", corrects_run_id: "r1", field: "coverageState",
    recorded_value: "COMPLETE", corrected_value: "PARTIAL", corrected_at: "2026-09-12T01:00:00.000Z",
    because: "500 of 1497",
  },
  { record_type: "page", page_id: "p1", canonical_url: "https://a.example.com/x", observations: ["o1", "o2"], outbound_edges: [], inbound_edges: [] },
];

const EVIDENCE = [
  {
    record_type: "observation", observation_id: "e1", measurement_key: "k1",
    method: "gsc.searchAnalytics.query:by-page", observed_at: "2026-09-12T00:00:00.000Z",
    value: { rowCount: 1497, dataState: "COMPLETE", rowLimitPerRequest: 25000 },
  },
  { record_type: "resighting", observation_id: "e1", measurement_key: "k1", seen_at: "2026-09-12T06:00:00.000Z" },
];

const FACTS = [
  { id: "f1", verificationState: "UNVERIFIED", checks: { factCheckedOn: null }, source: { tier: 1 } },
  { id: "f2", verificationState: "UNVERIFIED", checks: { factCheckedOn: null }, source: { tier: 2 } },
];

const PAGE = () => renderPage({ crawlRecords: CRAWL, evidenceRecords: EVIDENCE, facts: FACTS, generatedAt: "2026-09-12T09:00:00.000Z" });

/* ================================================================== *
 * A2c — 🔴 THE BOUNDS AND COVERAGE BANNER. LAW-BOUND-1 ON A SCREEN.
 * ================================================================== */

test("🔴 the page states its COVERAGE STATE, and PARTIAL is not hidden", () => {
  const html = PAGE();
  assert.match(html, /COVERAGE:/, "the page must state its coverage");
  assert.match(html, /PARTIAL/, "a PARTIAL page that does not say PARTIAL is a wrong answer on a screen");
});

test("🔴 the banner appears BEFORE the record tables, not in a footnote", () => {
  const html = PAGE();
  const banner = html.indexOf("COVERAGE:");
  const firstTable = html.indexOf("<table");
  const footer = html.indexOf("<footer");
  assert.ok(banner > -1 && banner < firstTable, "coverage must come before the first table");
  assert.ok(banner < footer, "coverage must not be in the footer");
});

test("🔴 every bound that shaped the page is ON the page", () => {
  const html = PAGE();
  for (const bound of ["maxUrlsPerRun", "maxRequestsPerHost", "maxResponseBytes", "seed pool", "selection rule"]) {
    assert.ok(html.includes(bound), `the page omits the bound "${bound}"`);
  }
  assert.match(html, /500/);
  assert.match(html, /2097152/);
});

test("🔴 the page shows BOTH the recorded and the corrected coverage — neither is hidden", () => {
  const html = PAGE();
  assert.match(html, /RECORDED/, "hiding the wrong value hides that we got it wrong");
  assert.match(html, /corrected/i);
});

test("a truncated list SAYS it is truncated, with its bound", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ record_type: "observation", observation_id: `x${i}`, method: "m", observed_at: "t" }));
  const html = renderRecords(many, { title: "T", limit: 5 });
  assert.match(html, /Showing <strong>5<\/strong> of <strong>30<\/strong>/);
  assert.match(html, /limit=5/);
  assert.match(html, /TRUNCATED/);
});

/* ================================================================== *
 * A2a — 🔴 EVERY RECORD CARRIES ITS LABEL, ON ITS FACE.
 * ================================================================== */

test("🔴 EVERY rendered record row carries an OBSERVED/INFERRED/RECOMMENDED/UNKNOWN label", () => {
  const html = renderRecords([...CRAWL, ...EVIDENCE], { title: "All", limit: 100 });
  const rowCount = (html.match(/<tr>\s*<td>/g) ?? []).length;
  const labelCount = (html.match(/class="lbl lbl-(OBSERVED|INFERRED|RECOMMENDED|UNKNOWN)"/g) ?? []).length;
  assert.ok(rowCount > 0, "no rows rendered — this law would be vacuous");
  assert.equal(labelCount, rowCount, `${rowCount} rows but ${labelCount} labels — a record rendered unlabelled`);
});

test("🔴 the label is RENDERED TEXT, not only a tooltip", () => {
  const html = renderRecords([CRAWL[0]], { title: "T", limit: 1 });
  // The label must appear as element content, i.e. between > and <.
  assert.match(html, />OBSERVED</, "the label must be visible where the value is, not only in a title attribute");
});

test("🔴 an UNRECOGNISED record type is shown as UNKNOWN, never omitted", () => {
  const weird = { record_type: "something_new", observation_id: "w1" };
  const l = labelFor(weird);
  assert.equal(l.label, "UNKNOWN");
  assert.match(l.why, /no declared label — shown rather than hidden/);
  const html = renderRecords([weird], { title: "T", limit: 10 });
  assert.match(html, /something_new/, "the record must still appear");
  assert.match(html, />UNKNOWN</);
});

test("🔴 a SUMMARY is INFERRED, not OBSERVED — a derivation is not a measurement", () => {
  assert.equal(labelFor({ record_type: "crawl_run" }).label, "INFERRED");
  assert.equal(labelFor({ record_type: "page" }).label, "INFERRED");
  assert.equal(labelFor({ record_type: "observation" }).label, "OBSERVED");
});

test("every declared label is reachable, and the table is frozen", () => {
  const produced = new Set(Object.values(LABEL_BY_TYPE).map((v) => v.label));
  produced.add(labelFor({ record_type: "nope" }).label);
  assert.deepEqual([...produced].sort(), [...LABELS].sort(), "a declared label is unreachable — dead state");
  assert.throws(() => { LABEL_BY_TYPE.observation = "x"; }, TypeError);
});

/* ================================================================== *
 * A2d — 🔴 verificationState ON EVERY FACT.
 * ================================================================== */

test("🔴 every fact row shows its verificationState, and UNVERIFIED is said out loud", () => {
  const html = renderFacts(FACTS);
  const rows = (html.match(/<tr>\s*<td>/g) ?? []).length;
  const states = (html.match(/class="vs vs-(UNVERIFIED|VERIFIED)"/g) ?? []).length;
  assert.equal(states, rows, "a fact rendered without its verificationState");
  assert.match(html, /2 of 2<\/strong> are <strong>UNVERIFIED/);
});

test("an UNVERIFIED fact is labelled UNKNOWN — not verified is not observed", () => {
  assert.equal(labelFor({ verificationState: "UNVERIFIED" }).label, "UNKNOWN");
  assert.equal(labelFor({ verificationState: "VERIFIED", checks: {} }).label, "OBSERVED");
});

/* ================================================================== *
 * A2b — 🔴 THE ISSUE CHAIN, AND WHAT IS SAID WHEN THERE IS NONE.
 * ================================================================== */

test("🔴 zero issues is EXPLAINED, not left as an empty list that reads like health", () => {
  const html = renderIssues([], []);
  assert.match(html, /No detector exists in v0\.1/);
  assert.match(html, /not a measurement of health/);
});

test("🔴 an issue whose evidence is not in the store says the chain is BROKEN", () => {
  const html = renderIssues(
    [{ record_type: "issue", issue_id: "i1", verdict: "FAIL", evidence: ["missing-obs"] }],
    [{ observation_id: "other" }],
  );
  assert.match(html, /NOT IN THIS STORE/);
  assert.match(html, /the chain is BROKEN/);
});

test("🔴 an issue with NO evidence renders a refusal, never a bare claim", () => {
  const html = renderIssues([{ record_type: "issue", issue_id: "i2", verdict: "FAIL", evidence: [] }], []);
  assert.match(html, /NO EVIDENCE — this claim cannot show its chain/);
});

/* ================================================================== *
 * A2e — COST AND RE-SIGHTINGS.
 * ================================================================== */

test("🔴 the re-sighting count is shown BESIDE the new-measurement count", () => {
  const html = PAGE();
  assert.match(html, /re-sightings/);
  assert.match(html, /new measurements/);
  assert.match(html, /must not read as an empty run/);
});

test("cost shows its amountState, and UNKNOWN is not rendered as 0", () => {
  const html = PAGE();
  assert.match(html, /UNKNOWN<\/span>/);
  assert.ok(!/crawl cost<\/th><td>0 /.test(html), "an UNKNOWN cost must not render as 0");
});

/* ================================================================== *
 * A2f — THE RECONCILIATION.
 * ================================================================== */

test("🔴 the observation/page arithmetic is done ON THE PAGE and balances", () => {
  const rec = reconcile(CRAWL);
  assert.equal(rec.observations, 2);
  assert.equal(rec.pages, 1);
  assert.equal(rec.surplus, 1);
  assert.equal(rec.balances, true);
  const html = PAGE();
  assert.match(html, /balances/);
  assert.match(html, /redirected to the same final URL/);
});

test("🔴 an arithmetic that does NOT balance says so loudly", () => {
  const broken = [
    { record_type: "observation", observation_id: "a", value: {} },
    { record_type: "observation", observation_id: "b", value: {} },
    { record_type: "page", page_id: "p", canonical_url: "u", observations: ["a"] },
  ];
  const rec = reconcile(broken);
  assert.equal(rec.balances, false);
});

/* ================================================================== *
 * A3 — READ-ONLY. NO WRITE PATH OF ANY KIND.
 * ================================================================== */

test("🔴 the page has NO form, NO button, NO script and no write path", () => {
  const html = PAGE();
  for (const forbidden of ["<form", "<button", "<script", "onclick", "fetch(", "XMLHttpRequest", "<input"]) {
    assert.ok(!html.includes(forbidden), `the page contains ${forbidden} — it must be read-only`);
  }
});

test("the page declares its own read-only nature to the reader", () => {
  assert.match(PAGE(), /no action, no form and no write path/);
});

/* ================================================================== *
 * A4 — RESPONSIVE STRUCTURE.
 *
 * ⚠️ THIS IS NOT THE SAME AS LOOKING AT IT. These assertions prove the page
 * DECLARES responsive behaviour; they cannot prove it looks right. The visual
 * check is recorded separately in the PR.
 * ================================================================== */

test("the page declares a viewport and a 430px breakpoint, and lets wide tables scroll", () => {
  const html = PAGE();
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /@media \(max-width:430px\)/);
  assert.match(html, /overflow-x:auto/, "a wide table must scroll rather than force the body wide");
});

/* ================================================================== *
 * AGAINST THE REAL STORE — because the fixtures above are simpler than
 * production, and LAW-FIXTURE-1 says a fixture must not be the only witness.
 * ================================================================== */

test("🔴 the REAL evidence store renders, and the real page states PARTIAL", { skip: !existsSync(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`) }, () => {
  const crawlRecords = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
  const evidenceRecords = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
  const s = summarise({ crawlRecords, evidenceRecords, facts: [] });

  assert.equal(s.coverageState, "PARTIAL");
  assert.equal(s.recordedCoverageState, "COMPLETE", "the wrong recorded value must still be visible");
  assert.equal(s.fetched, 394);
  assert.equal(s.disallowed, 106);
  assert.equal(s.observations, 500);
  assert.equal(s.seedPoolSize, 1497);

  const rec = reconcile(crawlRecords);
  assert.equal(rec.observations, 500);
  assert.equal(rec.pages, 495);
  assert.equal(rec.surplus, 5);
  assert.equal(rec.balances, true, "500 − 5 must equal 495");
});

test("the real record set contains no label the census cannot place", () => {
  const crawlRecords = existsSync(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`)
    ? createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll()
    : [];
  const census = labelCensus(crawlRecords);
  const total = Object.values(census).reduce((a, b) => a + b, 0);
  assert.equal(total, crawlRecords.length, "a record escaped the census — it would be invisible on the page");
});
