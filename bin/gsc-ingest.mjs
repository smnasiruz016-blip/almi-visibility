#!/usr/bin/env node
/**
 * ITEM 4 — the connector test (V5.1 §252) and the estate table.
 *
 * ── 🔴 WHAT THIS TOUCHES ────────────────────────────────────────────────────
 *
 * The ONLY network call is an authenticated READ of Google's Search Console API
 * against a property the owner granted on 11 September 2026. It fetches NO
 * AlmiWorld page, contacts NO AlmiWorld server, and writes NOTHING anywhere but
 * a local JSONL file.
 *
 * ── 🔴 AND WHAT IT PRINTS ───────────────────────────────────────────────────
 *
 * Counts, hostnames, property ids and the project id. NOTHING derived from the
 * key file — not a prefix, not a length. `--show-queries` does not exist.
 *
 * ── WHY THE PIPELINE IS NOT IN THIS FILE ────────────────────────────────────
 *
 * It used to be, and that made "re-running the ingest is idempotent" a claim
 * that could only be tested against production — so nobody tested it, and it
 * was false. The pipeline is `src/search/ingest.mjs`, which takes its provider
 * and its store as arguments and runs in the suite against a fake provider.
 * This file is argument parsing and printing.
 *
 * Usage:
 *   GSC_SERVICE_ACCOUNT_KEY_FILE=<path> node bin/gsc-ingest.mjs --property=sc-domain:example.com
 */

import { createGoogleSearchConsoleProvider } from "../src/search/google-search-console.mjs";
import { runIngest } from "../src/search/ingest.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { formatBoundedResult } from "../src/report/bounded.mjs";
import { ESTATE_HOSTNAME_LIST, KNOWN_UNKNOWNS } from "../config/estate-hostnames.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const propertyId = arg("property");
const days = Number(arg("days", "28"));
const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);
const controlProperty = arg("control", "https://example.com/");

if (!propertyId) {
  console.error("usage: node bin/gsc-ingest.mjs --property=sc-domain:<domain> [--days=28]");
  process.exit(2);
}

const provider = createGoogleSearchConsoleProvider();
const store = createJsonlStore(storePath);

const r = await runIngest({
  provider,
  store,
  propertyId,
  estateHostnames: ESTATE_HOSTNAME_LIST,
  days,
  controlProperty,
});

console.log(`window          : ${r.startDate} .. ${r.endDate} (${days} days)`);
console.log(`evidence store  : ${storePath}`);
console.log("");

console.log(`=== PROPERTIES VISIBLE TO THE SERVICE ACCOUNT: ${r.properties.length} ===`);
for (const p of r.properties) console.log(`  ${p.propertyId}  [${p.permissionLevel}]  ${p.propertyType}`);
console.log("");

const t = r.agg.rows[0];
console.log("=== SITE TOTAL (dimensions:[], one aggregate row) ===");
console.log(`  clicks=${t?.clicks ?? 0}  impressions=${t?.impressions ?? 0}  ` +
  `ctr=${((t?.ctr ?? 0) * 100).toFixed(2)}%  position=${(t?.position ?? 0).toFixed(2)}`);
console.log("  " + formatBoundedResult({
  label: "searchAnalytics:aggregate",
  bounds: { rowLimitPerRequest: r.agg.rowLimitPerRequest, maxRequests: r.agg.maxRequests },
  fields: { rowCount: r.agg.rowCount, requestCount: r.agg.requestCount, exhausted: r.agg.exhausted, dataState: r.agg.dataState },
}));
console.log("");

console.log(`=== BY PAGE — paginated to exhaustion ===`);
console.log("  " + formatBoundedResult({
  label: "searchAnalytics:by-page",
  bounds: { rowLimitPerRequest: r.pages.rowLimitPerRequest, maxRequests: r.pages.maxRequests },
  fields: {
    rowCount: r.pages.rowCount, requestCount: r.pages.requestCount,
    exhausted: r.pages.exhausted, dataState: r.pages.dataState, truncationReason: r.pages.truncationReason,
  },
}));
console.log(`  cost: ${r.pages.cost.amount} ${r.pages.cost.currency} [${r.pages.cost.amountState}] apiCalls=${r.pages.cost.apiCalls}`);
console.log("");

/* 🔴 ITEM 9 — COUNTRIES. MEASUREMENT ONLY: row counts, request counts, bounds,
 * dataState and cost. No ranking, no top-N, no interpretation — a country row
 * is where impressions happened, never a market or a demand claim (item 8). */
console.log("=== COUNTRY DIMENSIONS — paginated to exhaustion ===");
for (const [key, pull] of Object.entries(r.countryPulls)) {
  console.log("  " + formatBoundedResult({
    label: `searchAnalytics:${key}`,
    bounds: { rowLimitPerRequest: pull.res.rowLimitPerRequest, maxRequests: pull.res.maxRequests },
    fields: {
      rowCount: pull.res.rowCount, requestCount: pull.res.requestCount,
      exhausted: pull.res.exhausted, dataState: pull.res.dataState, truncationReason: pull.res.truncationReason,
    },
  }));
  console.log(`  cost: ${pull.res.cost.amount} ${pull.res.cost.currency} [${pull.res.cost.amountState}] apiCalls=${pull.res.cost.apiCalls}`);
  console.log(`  distinct countries: ${new Set(pull.rows.map((x) => x.country)).size}`);
}
console.log("");

const w = Math.max(...r.table.rows.map((x) => x.hostname.length));
console.log("=== ESTATE TABLE — every known hostname in exactly one state ===\n");
console.log(`${"hostname".padEnd(w)}  STATE        URLs  clicks  impressions`);
console.log("-".repeat(w + 36));
const order = { ROWS: 0, ZERO: 1, FORBIDDEN: 2, NOT_QUERIED: 3 };
for (const row of [...r.table.rows].sort((a, b) => order[a.state] - order[b.state] || (b.impressions ?? 0) - (a.impressions ?? 0))) {
  const n = (v) => (v === null || v === undefined ? "   —" : String(v).padStart(4));
  console.log(`${row.hostname.padEnd(w)}  ${row.state.padEnd(11)} ${n(row.rowCount)}  ${n(row.clicks)}  ${n(row.impressions).padStart(11)}`);
}
console.log("-".repeat(w + 36));
console.log(`\nSTATE COUNTS: ${Object.entries(r.table.counts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(`total hostnames in the census: ${r.table.rows.length}`);
if (r.table.unlisted.length) console.log(`🔴 in the rows but NOT in the census: ${r.table.unlisted.join(", ")}`);

console.log("");
console.log("=== PROPERTY STATES — visible is not the same as queried ===");
for (const p of r.properties) {
  console.log(`  ${p.propertyId.padEnd(26)} ${p.propertyId === propertyId ? "QUERIED" : "NOT_QUERIED"}`);
}
console.log(`  ${controlProperty.padEnd(26)} FORBIDDEN  (control — not an estate property)`);
console.log("");

console.log("=== CONTROL — a property the account is NOT a user on ===");
console.log(`  ${controlProperty}  HTTP ${r.control.httpStatus}  state=${r.controlState.state}  rowCount=${r.controlState.rowCount}`);
if (r.control.httpStatus === 403) {
  console.log("  ✅ CONTROL PASS: 403. A zero above is a measured zero, not a silent failure.");
} else {
  console.log(`  🔴 CONTROL FAILED: expected 403, got ${r.control.httpStatus}.`);
}

/* 🔴 IDEMPOTENCY, REPORTED RATHER THAN ASSUMED. A second run over unchanged
 * data appends re-sightings and no new measurements — and says which happened. */
console.log("");
console.log(`evidence: ${r.appended} NEW measurement(s), ${r.resighted} re-sighting(s)   total records in store: ${store.count()}`);
if (r.appended === 0 && r.resighted > 0) {
  console.log("  ↳ nothing changed since the last run. Re-sightings recorded; no duplicate payload written.");
}

console.log("\n⚠️ KNOWN UNKNOWNS — the census denominator is not proven total:");
for (const u of KNOWN_UNKNOWNS) console.log(`  · ${u}`);

process.exit(r.control.httpStatus === 403 ? 0 : 1);
