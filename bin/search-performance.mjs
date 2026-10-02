#!/usr/bin/env node
/**
 * F81 · SEARCH PERFORMANCE AND RANK TRACKING — one client's own Search Console rows, count-only.
 *
 *   node bin/search-performance.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, pulled, rendered or written
 *
 * 🔴 A ROW REACHES THIS CLIENT ONLY BY THE PAGE ORIGIN IT STORES (F02's partition). A site-wide row of a property that covers several
 * declared tenants is UNATTRIBUTED and never this client's performance. An absent device or dated observation is NOT MEASURED — never 0,
 * never a flat line. Tracker: src/search/performance-tracker.mjs; reader: src/search/performance-reader.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { readClientPerformance } from "../src/search/performance-reader.mjs";
import { NOT_MEASURED } from "../src/search/performance-tracker.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCOPE = scopedEntryPoint({ entry: "bin/search-performance.mjs", governed: false, resources: [RESOURCES.evidenceStore()] });
const r = readClientPerformance({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), repo: REPO });
const val = (x) => (typeof x === "number" ? (Number.isInteger(x) ? String(x) : x.toFixed(4)) : x);
console.log("F81 · SEARCH PERFORMANCE AND RANK TRACKING — this client only, its own attributed rows only, count-only");
console.log(`  bound        ${r.label} · recorded observations only, nothing pulled · the latest reading of each pull and window (${r.supersededReadings} earlier reading(s) superseded)`);
for (const [d, s] of Object.entries(r.dimensions)) console.log(`  ${d.padEnd(8)}     ${s.state === "TRACKED" ? `TRACKED — ${s.rows} row(s) from ${s.pulls.join(", ")}` : `${NOT_MEASURED} — missing ${s.missing}`}`);
for (const p of r.perPull) {
  console.log(`  pull ${p.pull} (${p.window}, row limit ${p.rowLimit}, ${p.requests} request(s), ${p.state}): ${p.rows} row(s) · impressions ${p.impressions} · clicks ${p.clicks} · CTR ${val(p.ctr.value)} (${p.ctr.clicks} / ${p.ctr.impressions}) · position ${val(p.position.value)}${p.position.method ? ` — ${p.position.method}` : p.position.why ? ` — ${p.position.why}` : ""}`);
}
console.log(`  trend        ${r.trend.state === "TRACKED" ? `TRACKED — ${r.trend.series.map((s) => `${s.pull} by ${s.by}: ${s.points.length} point(s)`).join(" · ")}` : `${NOT_MEASURED} — missing ${r.trend.missing}`}`);
console.log(`  unattributed ${r.unattributedSiteWideRows} site-wide row(s) carry no page — never this client's · quarantined ${r.quarantinedRows} row(s) whose origin no declaration claims, or two do`);
for (const n of r.notComplete) console.log(`  ${NOT_MEASURED}  pull ${n.pull}: recorded ${n.state}, not COMPLETE — contributes nothing`);
