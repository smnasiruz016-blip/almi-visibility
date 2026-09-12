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
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { assessUrl } from "../src/audit/robots-scope.mjs";
import { familiesFor } from "../src/audit/dns-family.mjs";
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
import { ROBOTS_SCOPE, DNS_FAMILY } from "../src/audit/checks.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { ESTATE_HOSTNAME_LIST } from "../config/estate-hostnames.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const out = arg("out", `${REPO}runs/audit/findings.jsonl`);
const DETECTOR_VERSION = "1";
const openedAt = new Date().toISOString();

const load = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);
const robotsRecords = load(`${REPO}runs/evidence/robots.jsonl`);
const evidence = load(`${REPO}runs/evidence/evidence.jsonl`);
const crawl = load(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`);

if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
const store = createJsonlStore(out);

/* ================================================================== *
 * CHECK 1 — robots scope. Is a blocked URL blocked for GOOGLEBOT too?
 * ================================================================== */

const robotsByHost = new Map();
for (const r of robotsRecords) if (r.record_type === "observation") robotsByHost.set(r.value.host, r);

const impressions = new Map();
for (const r of evidence) {
  if (r.method !== "gsc.searchAnalytics.query:page-rows") continue;
  for (const row of r.value.rows) impressions.set(row.url, row);
}

const blockedObs = crawl.filter((r) => r.record_type === "observation" && r.value?.skipped);

let robotsFail = 0;
let robotsUnknown = 0;
let impressionsAtRisk = 0;
const perHost = new Map();

for (const obs of blockedObs) {
  const url = obs.value.requested_url;
  const host = new URL(url).hostname;
  const robotsObs = robotsByHost.get(host);

  const imp = impressions.get(url)?.impressions ?? null;

  /* 🔴 Through the REGISTERED check, not a copy of it. */
  const finding = await ROBOTS_SCOPE.run({
    page: { canonical_url: url },
    observations: [obs],
    siteContext: { openedAt, robotsObservation: robotsObs, impressions: imp },
  });

  if (robotsObs?.value?.body) {
    const a = assessUrl({ body: robotsObs.value.body, url });
    if (!perHost.has(host)) {
      perHost.set(host, { blockedForGoogle: 0, impressions: 0, sample: a, sha: robotsObs.content_sha256 });
    }
  }

  if (finding === null) continue;
  store.append(finding);

  if (finding.verdict === "UNKNOWN") {
    robotsUnknown += 1;
    continue;
  }
  const h = perHost.get(host);
  h.blockedForGoogle += 1;
  h.impressions += imp ?? 0;
  robotsFail += 1;
  impressionsAtRisk += imp ?? 0;
}

/* ================================================================== *
 * CHECK 2 — DNS families across the whole estate.
 * ================================================================== */

const familyRows = [];
let dnsFail = 0;
let dnsUnknown = 0;

for (const host of ESTATE_HOSTNAME_LIST) {
  const f = await familiesFor(host);
  familyRows.push(f);

  // The measurement itself is stored, so a finding can cite it.
  const fObs = makeObservation({
    observed_at: f.measuredAt,
    method: "dns.families",
    target: { kind: "url", ref: `https://${host}/` },
    content_sha256: sha256Hex(JSON.stringify({ hasA: f.hasA, hasAAAA: f.hasAAAA, state: f.state })),
    value: f,
    collector: "bin/audit.mjs",
    collector_version: DETECTOR_VERSION,
  });
  store.append(fObs);

  /* 🔴 Through the REGISTERED check. The families are passed in so the check
   * does not re-query DNS and produce a second, differently-timed measurement. */
  const finding = await DNS_FAMILY.run({
    page: { canonical_url: `https://${host}/` },
    observations: [fObs],
    siteContext: { openedAt, families: f },
  });
  if (finding === null) continue;
  store.append(finding);
  if (finding.verdict === "UNKNOWN") dnsUnknown += 1;
  else dnsFail += 1;
}

/* ---- report ------------------------------------------------------------ */

console.log("=== CHECK 1 · robots scope — is a blocked URL blocked for GOOGLEBOT? ===\n");
for (const [host, h] of perHost) {
  console.log(`${host}`);
  console.log(`  robots.txt sha256 : ${h.sha}`);
  console.log(`  our group         : ${h.sample.us.group} [${h.sample.us.agents.join(", ")}]`);
  console.log(`  Googlebot group   : ${h.sample.googlebot.group} [${h.sample.googlebot.agents.join(", ")}]`);
  console.log(`  matching rule     : ${h.sample.googlebot.because}`);
  console.log(`  🔴 blocked for Googlebot: ${h.blockedForGoogle}   impressions: ${h.impressions}`);
}
console.log(`\nTOTAL: ${robotsFail} of ${blockedObs.length} blocked URLs are blocked for GOOGLEBOT TOO.`);
console.log(`       ${impressionsAtRisk} impressions in 28 days sit on those URLs.`);
console.log(`       ${robotsUnknown} UNKNOWN (no robots evidence).`);

console.log("\n=== CHECK 2 · DNS families across the estate ===\n");
const w = Math.max(...familyRows.map((f) => f.hostname.length));
console.log(`${"host".padEnd(w)}  A      AAAA   state`);
console.log("-".repeat(w + 26));
for (const f of familyRows) {
  const b = (v) => (v === null ? "?" : v ? "yes" : "no");
  console.log(`${f.hostname.padEnd(w)}  ${b(f.hasA).padEnd(6)} ${b(f.hasAAAA).padEnd(6)} ${f.state}${f.error ? "  (" + f.error + ")" : ""}`);
}
const tally = {};
for (const f of familyRows) tally[f.state] = (tally[f.state] ?? 0) + 1;
console.log("-".repeat(w + 26));
console.log(`resolvers used: ${familyRows[0]?.resolvers.join(", ")}   ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(`findings: ${dnsFail} FAIL, ${dnsUnknown} UNKNOWN`);

console.log("\n=== CHECKS THAT RAN, AND THEIR CONTROLS ===");
for (const c of registeredChecks()) {
  console.log(`  ${c.id}`);
  console.log(`     fires on : ${c.firingFixture}`);
  console.log(`     control  : ${c.cleanControl}`);
}

console.log(`\nwritten: ${out}   (${store.count()} records)`);
console.log("🔴 Nothing was fixed. No product repository was touched.");
