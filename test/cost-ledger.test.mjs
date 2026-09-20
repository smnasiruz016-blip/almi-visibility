/**
 * ITEM 45 — THE COST LEDGER. Four things tracked, nothing estimated, every
 * UNKNOWN saying whether it could have been measured.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  makeCostEntry, coverageFailures, formatLedgerLine, createCostLedger, entryFromCrawlRun, ingestRunsOf, entryFromIngestRun, UNKNOWN_KINDS,
} from "../src/cost/ledger.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const valid = () => ({
  entry_id: "x", run_kind: "k", run_ref: "r", recorded_at: "2026-09-12T00:00:00Z",
  money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "free tariff, stated by the provider" },
  providerCalls: { state: "MEASURED", total: 3 },
  budget: { kind: "api-pagination", used: { requests: 3 }, bounds: { maxRequests: 20 }, capReached: false },
  founderTime: { state: "MEASURED", seconds: 1.5 },
});

/* ---- the laws ---------------------------------------------------------- */

test("CONTROL: a complete entry is accepted", () => {
  assert.equal(makeCostEntry(valid()).record_type, "cost_entry");
});

test("🔴 all FOUR are required — an entry missing any is untracked, and refused", () => {
  for (const k of ["money", "providerCalls", "budget", "founderTime"]) {
    assert.throws(() => makeCostEntry({ ...valid(), [k]: undefined }), new RegExp(`${k} is required`));
  }
});

test("🔴 an UNKNOWN amount must be null — 0 or an estimate is refused", () => {
  const e = valid();
  e.money = { amountState: "UNKNOWN", amount: 0, unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", unknownReason: "the plan price was never read" };
  assert.throws(() => makeCostEntry(e), /never 0 and never an estimate/);
});

test("🔴 an UNKNOWN must carry its reason AND say whether it was measurable", () => {
  const noReason = valid();
  noReason.founderTime = { state: "UNKNOWN", seconds: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED" };
  assert.throws(() => makeCostEntry(noReason), /UNKNOWN with no reason/);
  const noKind = valid();
  noKind.founderTime = { state: "UNKNOWN", seconds: null, unknownReason: "the run recorded no start" };
  assert.throws(() => makeCostEntry(noKind), /without saying whether it was measurable/);
  assert.deepEqual([...UNKNOWN_KINDS], ["NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", "MEASURABLE_BUT_NOT_RECORDED"]);
});

test("🔴 LAW-BOUND-1: an entry with no bounds is refused, and every printed line carries its bound", () => {
  const e = valid();
  e.budget = { ...e.budget, bounds: {} };
  assert.throws(() => makeCostEntry(e), /LAW-BOUND-1/);
  assert.match(formatLedgerLine(makeCostEntry(valid())), /\[bound: maxRequests=20\]$/);
});

test("🔴 coverageFailures names every UNKNOWN that was measurable — and only those", () => {
  const measurable = valid();
  measurable.entry_id = "m";
  measurable.founderTime = { state: "UNKNOWN", seconds: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED", unknownReason: "the run recorded no start" };
  const notMeasurable = valid();
  notMeasurable.entry_id = "n";
  notMeasurable.money = { amountState: "UNKNOWN", amount: null, unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", unknownReason: "the plan price was never read" };
  assert.deepEqual(coverageFailures([makeCostEntry(measurable), makeCostEntry(notMeasurable)]).map((f) => `${f.entry_id}:${f.part}`), ["m:founderTime"]);
});

test("the ledger is append-only and refuses a second entry with the same entry_id", () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-ledger-"));
  try {
    const l = createCostLedger(join(dir, "l.jsonl"));
    assert.equal(l.append(makeCostEntry(valid())).appended, true);
    assert.equal(l.append(makeCostEntry(valid())).appended, false);
    assert.equal(l.readAll().length, 1);
    assert.throws(() => l.append({ record_type: "observation" }), /only a cost entry/);
    assert.equal(typeof l.update, "undefined");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ---- REAL: the 12 September crawl and the stored ingest runs ------------- */

const crawlRecords = () => batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll());

test("🔴 REAL: the 12 Sep crawl — 394 requests, 403.268 s, caps 500/200, money UNKNOWN and NOT measurable with tools we hold", () => {
  const crawl = crawlRecords();
  const live = crawl.filter((r) => r.record_type === "crawl_run" && r.requestsIssued > 0);
  assert.equal(live.length, 1);
  const correction = crawl.find((r) => r.record_type === "crawl_run_correction");
  const e = entryFromCrawlRun(live[0], { correction, recordedAt: "t" });
  assert.equal(e.providerCalls.total, 394);
  assert.equal(e.founderTime.state, "MEASURED");
  assert.equal(e.founderTime.seconds, 403.268);
  assert.deepEqual(e.budget.used, { urlsRequested: 500, urlsFetched: 394, requestsIssued: 394, disallowedByRobots: 106 });
  assert.equal(e.budget.bounds.maxUrlsPerRun, 500);
  assert.equal(e.budget.bounds.maxRequestsPerHost, 200);
  assert.equal(e.money.amountState, "UNKNOWN");
  assert.equal(e.money.amount, null, "an unmeasured crawl cost was given a number");
  assert.equal(e.money.unknownKind, "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD");
  assert.match(e.money.unknownReason, /U-COST-1/);
  assert.match(e.money.unknownReason, /U-COST-5/);
});

/* NINE since the real run of 12 Sep 23:25Z — which wrote its OWN measured
 * ledger entry. Derived from the evidence store alone, even that run reads
 * UNKNOWN for founder time, because the evidence store never held a start: the
 * wall-clock lives in the ledger entry the run wrote as it happened. */
test("🔴 REAL: nine stored ingest runs derived from evidence — money ZERO_BY_TARIFF, and founder time UNKNOWN from evidence alone", () => {
  const evidence = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
  const runs = ingestRunsOf(evidence);
  assert.equal(runs.length, 9);
  const entries = runs.map((r) => entryFromIngestRun(r, { recordedAt: "t" }));
  for (const e of entries) {
    assert.equal(e.money.amountState, "ZERO_BY_TARIFF");
    assert.equal(e.founderTime.state, "UNKNOWN");
    assert.equal(e.founderTime.unknownKind, "MEASURABLE_BUT_NOT_RECORDED");
    assert.ok(e.founderTime.lowerBoundSeconds >= 0);
  }
  // The country run of 12 Sep night: its control pull was new, so its total is MEASURED — 9 calls.
  const country = entries.find((e) => e.entry_id === "gsc-ingest:2026-09-12T22:06:42.662Z");
  assert.ok(country, "the country run was not found as its own run");
  assert.equal(country.providerCalls.state, "MEASURED");
  assert.equal(country.providerCalls.total, 9);
  assert.equal(country.budget.used.newPulls, 7);
});

const LEDGER = `${REPO}runs/cost/ledger.jsonl`;
test("🔴 REAL: the committed ledger holds exactly the backfill, and names every measurable UNKNOWN", { skip: !existsSync(LEDGER) }, () => {
  const entries = createCostLedger(LEDGER).readAll();
  assert.equal(entries.filter((e) => e.run_kind === "crawl").length, 1);
  // 8 backfilled + 1 written live, as it happened, on 12 Sep 23:25Z.
  assert.equal(entries.filter((e) => e.run_kind === "gsc-ingest").length, 9);
  for (const e of entries) makeCostEntry(e); // every stored entry still satisfies the laws
  const failures = coverageFailures(entries);
  // 8 unrecorded wall-clocks + the ingest runs whose final call count was never written.
  assert.ok(failures.some((f) => f.part === "founderTime"));
  assert.ok(failures.every((f) => f.entry_id.startsWith("gsc-ingest:")), "the crawl entry was reported as a coverage failure");
  const crawl = entries.find((e) => e.run_kind === "crawl");
  assert.match(crawl.founderTime.note, /Actions run that hosted it took 423s/);
});
