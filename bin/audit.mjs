#!/usr/bin/env node
/**
 * HISSA 2a — run the two checks and write their findings as Issues.
 *
 * 🔴 NO CRAWL. It reads the evidence store and queries DNS. The robots.txt
 * bodies were fetched once and STORED as observations; this reads those, so the
 * analysis is reproducible without touching any host again.
 *
 * Findings are Issues under the existing model, so each one carries an evidence
 * chain back to the observations it was derived from — C1 makes an issue with
 * no evidence unconstructible.
 *
 * 🔴 THE AUDIT ITSELF IS `src/audit/run-audit.mjs`, with the resolver injected.
 * This file passes the LIVE resolver; `bin/replay-crawl.mjs` passes RECORDED
 * answers to prove the job does not duplicate records without the network.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { familiesFor } from "../src/audit/dns-family.mjs";
import { runRobotsAndDnsAudit } from "../src/audit/run-audit.mjs";
/**
 * 🔴 THE REGISTERED CHECKS ARE THE PRODUCTION PATH.
 *
 * An earlier draft of this file reimplemented the two checks inline and imported
 * only the helpers. The orphan census caught it: `src/audit/checks.mjs` was
 * imported by nothing but its own test, so the harness that enforces the
 * false-positive-control requirement governed no code that actually ran.
 *
 * A registry nothing runs is the same defect as a law nothing calls.
 */
import { registeredChecks } from "../src/audit/check.mjs";
import { ESTATE_HOSTNAME_LIST } from "../config/estate-hostnames.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const out = arg("out", `${REPO}runs/audit/findings.jsonl`);
const openedAt = new Date().toISOString();

const load = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);
const robotsRecords = load(`${REPO}runs/evidence/robots.jsonl`);
const evidence = load(`${REPO}runs/evidence/evidence.jsonl`);
const crawl = load(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`);

if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
const store = createJsonlStore(out);

const r = await runRobotsAndDnsAudit({
  store, robotsRecords, evidence, crawl,
  hosts: ESTATE_HOSTNAME_LIST,
  familiesFor: (host) => familiesFor(host), // 🔴 LIVE resolver
  openedAt,
});

console.log("=== CHECK 1 · robots scope — is a blocked URL blocked for GOOGLEBOT? ===\n");
for (const [host, h] of r.perHost) {
  console.log(`${host}`);
  console.log(`  robots.txt sha256 : ${h.sha}`);
  console.log(`  our group         : ${h.sample.us.group} [${h.sample.us.agents.join(", ")}]`);
  console.log(`  Googlebot group   : ${h.sample.googlebot.group} [${h.sample.googlebot.agents.join(", ")}]`);
  console.log(`  matching rule     : ${h.sample.googlebot.because}`);
  console.log(`  🔴 blocked for Googlebot: ${h.blockedForGoogle}   impressions: ${h.impressions}`);
}
console.log(`\nTOTAL: ${r.robotsFail} of ${r.blockedCount} blocked URLs are blocked for GOOGLEBOT TOO.`);
console.log(`       ${r.impressionsAtRisk} impressions in 28 days sit on those URLs.`);
console.log(`       ${r.robotsUnknown} UNKNOWN (no robots evidence).`);

console.log("\n=== CHECK 2 · DNS families across the estate ===\n");
const w = Math.max(...r.familyRows.map((f) => f.hostname.length));
console.log(`${"host".padEnd(w)}  A      AAAA   state`);
console.log("-".repeat(w + 26));
for (const f of r.familyRows) {
  const b = (v) => (v === null ? "?" : v ? "yes" : "no");
  console.log(`${f.hostname.padEnd(w)}  ${b(f.hasA).padEnd(6)} ${b(f.hasAAAA).padEnd(6)} ${f.state}${f.error ? "  (" + f.error + ")" : ""}`);
}
const tally = {};
for (const f of r.familyRows) tally[f.state] = (tally[f.state] ?? 0) + 1;
console.log("-".repeat(w + 26));
console.log(`resolvers used: ${r.familyRows[0]?.resolvers.join(", ")}   ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(`findings: ${r.dnsFail} FAIL, ${r.dnsUnknown} UNKNOWN`);

console.log("\n=== CHECKS THAT RAN, AND THEIR CONTROLS ===");
for (const c of registeredChecks()) {
  console.log(`  ${c.id}`);
  console.log(`     fires on : ${c.firingFixture}`);
  console.log(`     control  : ${c.cleanControl}`);
}

console.log(`\nwritten: ${out}   (${store.count()} records) — this run: ${r.writes.appended} new, ${r.writes.resighted} re-sighting(s)`);
console.log("🔴 Nothing was fixed. No product repository was touched.");
