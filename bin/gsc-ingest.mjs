#!/usr/bin/env node
/**
 * ITEM 4 — the connector test (V5.1 §252) and the estate table.
 *
 * ── 🔴 WHAT THIS TOUCHES ────────────────────────────────────────────────────
 *
 * The ONLY network call is an authenticated READ of Google's Search Console API
 * against a property the owner granted on 11 September 2026. It fetches NO
 * AlmiWorld page, contacts NO AlmiWorld server, and writes NOTHING anywhere but
 * a local JSONL file. There is no crawler here and no page is rendered.
 *
 * ── 🔴 AND WHAT IT PRINTS ───────────────────────────────────────────────────
 *
 * Counts, hostnames, property ids and the project id. NOTHING derived from the
 * key file — not a prefix, not a length. `--show-queries` does not exist.
 *
 * Usage:
 *   GSC_SERVICE_ACCOUNT_KEY_FILE=<path> node bin/gsc-ingest.mjs --property=sc-domain:example.com
 */

import { createGoogleSearchConsoleProvider, propertyCovers } from "../src/search/google-search-console.mjs";
import { estateTable, classify } from "../src/search/query-state.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { ESTATE_HOSTNAME_LIST, KNOWN_UNKNOWNS } from "../config/estate-hostnames.mjs";

const COLLECTOR = "bin/gsc-ingest.mjs";
const COLLECTOR_VERSION = "1";

const arg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const property = arg("property");
const days = Number(arg("days", "28"));
const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);
/** A property the account is NOT a user on. The control that makes a zero mean something. */
const controlProperty = arg("control", "https://example.com/");

if (!property) {
  console.error("usage: node bin/gsc-ingest.mjs --property=sc-domain:<domain> [--days=28]");
  process.exit(2);
}

const iso = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const startDate = iso(days);
const endDate = iso(0);

const provider = createGoogleSearchConsoleProvider();
const store = createJsonlStore(storePath);

const record = (target, method, value) =>
  store.append(
    makeObservation({
      observed_at: new Date().toISOString(),
      method,
      target,
      // The hash is of the VALUE WE STORED, so a later reader can prove the
      // record was not edited after the fact.
      content_sha256: sha256Hex(JSON.stringify(value)),
      value,
      collector: COLLECTOR,
      collector_version: COLLECTOR_VERSION,
    }),
  );

console.log(`window          : ${startDate} .. ${endDate} (${days} days)`);
console.log(`evidence store  : ${storePath}`);
console.log("");

/* ---- 1. properties ------------------------------------------------------ */
const properties = await provider.listProperties();
record({ kind: "property", ref: "*" }, "gsc.sites.list", { properties });
console.log(`=== PROPERTIES VISIBLE TO THE SERVICE ACCOUNT: ${properties.length} ===`);
for (const p of properties) console.log(`  ${p.propertyId}  [${p.permissionLevel}]  ${p.propertyType}`);
const queried = properties.filter((p) => p.propertyId === property);
if (queried.length === 0) {
  console.error(`\n🔴 ${property} is not among the properties this account can see. Stopping.`);
  process.exit(1);
}
console.log("");

/* ---- 2. the aggregate site total, uncapped ------------------------------ */
const agg = await provider.queryRows({ propertyId: property, startDate, endDate, dimensions: [] });
record({ kind: "property", ref: property }, "gsc.searchAnalytics.query:aggregate", {
  startDate, endDate, dimensions: [],
  rowCount: agg.rowCount, requestCount: agg.requestCount, exhausted: agg.exhausted,
  dataState: agg.dataState, truncationReason: agg.truncationReason, cost: agg.cost,
  totals: agg.rows[0] ?? null,
});
const t = agg.rows[0];
console.log("=== SITE TOTAL (dimensions:[], one aggregate row) ===");
console.log(`  clicks=${t?.clicks ?? 0}  impressions=${t?.impressions ?? 0}  ` +
  `ctr=${((t?.ctr ?? 0) * 100).toFixed(2)}%  position=${(t?.position ?? 0).toFixed(2)}`);
console.log(`  rowCount=${agg.rowCount} requestCount=${agg.requestCount} exhausted=${agg.exhausted} dataState=${agg.dataState}`);
console.log("");

/* ---- 3. by page, paginated to exhaustion -------------------------------- */
const pages = await provider.queryRows({
  propertyId: property, startDate, endDate, dimensions: ["page"], rowLimitPerRequest: 25000, maxRequests: 20,
});

const observed = new Map();
let unparsed = 0;
for (const row of pages.rows) {
  let host;
  try {
    host = new URL(row.keys?.[0] ?? "").hostname.toLowerCase();
  } catch {
    unparsed += 1;
    continue;
  }
  const h = observed.get(host) ?? { urls: 0, clicks: 0, impressions: 0 };
  if ((row.impressions || 0) > 0) h.urls += 1;
  h.clicks += row.clicks || 0;
  h.impressions += row.impressions || 0;
  observed.set(host, h);
}

/* ---- 4. the control: a property we are NOT a user on -------------------- */
const control = await provider.queryRows({ propertyId: controlProperty, startDate, endDate, dimensions: [] });
/**
 * 🔴 THE CONTROL GOES THROUGH classify() LIKE EVERYTHING ELSE.
 *
 * The drained result carries `rowCount: 0` because the loop collected no rows
 * before the 403 — but 0 is WRONG here and recording it would be the exact
 * collapse A3 forbids. A 403 tells us nothing about the site, so the stored
 * rowCount is `null`. The raw drained value is kept beside it, named, so the
 * two are never confused.
 */
const controlState = classify({ attempted: true, httpStatus: control.httpStatus });
record({ kind: "property", ref: controlProperty }, "gsc.searchAnalytics.query:control", {
  httpStatus: control.httpStatus,
  state: controlState.state,
  authState: controlState.authState,
  rowCount: controlState.rowCount,
  rawDrainedRowCount: control.rowCount,
  requestCount: control.requestCount,
  exhausted: control.exhausted,
  truncationReason: control.truncationReason,
  dataState: control.dataState, cost: control.cost, expected: 403,
});

/* ---- 5. the estate table ------------------------------------------------ */
const table = estateTable({
  estateHostnames: [...ESTATE_HOSTNAME_LIST],
  observed,
  coveredBy: (h) => queried.some((p) => propertyCovers(p.propertyId, h)),
});
record({ kind: "property", ref: property }, "gsc.searchAnalytics.query:by-page", {
  startDate, endDate, dimensions: ["page"],
  rowCount: pages.rowCount, requestCount: pages.requestCount, exhausted: pages.exhausted,
  dataState: pages.dataState, truncationReason: pages.truncationReason, cost: pages.cost,
  hostnameCounts: table.counts, unlistedHostnames: table.unlisted, unparsedRows: unparsed,
  estateTable: table.rows,
});

console.log(`=== BY PAGE — paginated to exhaustion ===`);
console.log(`  rowCount=${pages.rowCount} requestCount=${pages.requestCount} exhausted=${pages.exhausted} dataState=${pages.dataState} truncationReason=${pages.truncationReason}`);
console.log(`  cost: ${pages.cost.amount} ${pages.cost.currency} [${pages.cost.amountState}] apiCalls=${pages.cost.apiCalls}`);
console.log("");

const w = Math.max(...table.rows.map((r) => r.hostname.length));
console.log("=== ESTATE TABLE — every known hostname in exactly one state ===\n");
console.log(`${"hostname".padEnd(w)}  STATE        URLs  clicks  impressions`);
console.log("-".repeat(w + 36));
const order = { ROWS: 0, ZERO: 1, FORBIDDEN: 2, NOT_QUERIED: 3 };
for (const row of [...table.rows].sort((a, b) => order[a.state] - order[b.state] || (b.impressions ?? 0) - (a.impressions ?? 0))) {
  const n = (v) => (v === null || v === undefined ? "   —" : String(v).padStart(4));
  console.log(
    `${row.hostname.padEnd(w)}  ${row.state.padEnd(11)} ${n(row.rowCount)}  ${n(row.clicks)}  ${n(row.impressions).padStart(11)}`,
  );
}
console.log("-".repeat(w + 36));
console.log(`\nSTATE COUNTS: ${Object.entries(table.counts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(`total hostnames in the census: ${table.rows.length}`);
if (table.unlisted.length) console.log(`🔴 in the rows but NOT in the census: ${table.unlisted.join(", ")}`);
if (unparsed) console.log(`rows with an unparseable page key: ${unparsed}`);

console.log("");
console.log("=== PROPERTY STATES — visible is not the same as queried ===");
for (const p of properties) {
  const st = p.propertyId === property ? "QUERIED" : "NOT_QUERIED";
  console.log(`  ${p.propertyId.padEnd(26)} ${st}`);
}
console.log(`  ${controlProperty.padEnd(26)} FORBIDDEN  (control — not an estate property)`);
console.log("");

console.log("=== CONTROL — a property the account is NOT a user on ===");
console.log(`  ${controlProperty}  HTTP ${control.httpStatus}  state=${controlState.state}  rowCount=${controlState.rowCount}`);
if (control.httpStatus === 403) {
  console.log("  ✅ CONTROL PASS: 403. A zero above is a measured zero, not a silent failure.");
} else {
  console.log(`  🔴 CONTROL FAILED: expected 403, got ${control.httpStatus}. The auth is not doing what we think it is.`);
}

console.log("");
console.log(`evidence records appended: 4   total in store: ${store.count()}`);
console.log("\n⚠️ KNOWN UNKNOWNS — the census denominator is not proven total:");
for (const u of KNOWN_UNKNOWNS) console.log(`  · ${u}`);

process.exit(control.httpStatus === 403 ? 0 : 1);
