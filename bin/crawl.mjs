#!/usr/bin/env node
/**
 * THE CRAWLER CLI.
 *
 * 🔴 DEFAULT IS DRY RUN. `--live` is required to issue a single real request,
 * and even then the plan is printed first and the billing sentence is printed
 * for every host.
 *
 * 🔴 `D-CRW-4` — THE FIRST REAL RUN REQUIRES THE OWNER'S GREEN, AND IT HAS NOT
 * BEEN GIVEN. `--live` additionally requires `--i-have-the-owners-green`, which
 * exists so that nobody reaches a live crawl by adding one plausible-looking
 * flag. It is deliberately awkward to type.
 *
 * Usage:
 *   node bin/crawl.mjs --seeds=<file>                  # dry run, the default
 *   node bin/crawl.mjs --seeds=<file> --live --i-have-the-owners-green
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

import { crawl, renderPlan } from "../src/crawl/crawler.mjs";
import { buildInventory, unlinkedWithinCrawledSet } from "../src/crawl/inventory.mjs";
import { formatBoundedResult } from "../src/report/bounded.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { parseSitemap } from "../src/crawl/seeds.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const seedsFile = arg("seeds");
const sitemapFile = arg("sitemap");
const live = flag("live");
const green = flag("i-have-the-owners-green");
const out = arg("out", `${REPO}runs/crawl/crawl.jsonl`);

if (!seedsFile && !sitemapFile) {
  console.error("usage: node bin/crawl.mjs --seeds=<file.txt> | --sitemap=<file.xml> [--live --i-have-the-owners-green]");
  process.exit(2);
}

/* 🔴 THE GATE ON D-CRW-4. Two flags, and the second one cannot be typed by accident. */
if (live && !green) {
  console.error(
    [
      "🔴 REFUSED. --live requires --i-have-the-owners-green.",
      "",
      "D-CRW-4 is recorded in PHASE_0_FROZEN_GAP_REGISTER.md as NOT YET GIVEN:",
      '  "THE FIRST REAL RUN REQUIRES THE OWNER\'S GREEN"',
      "",
      "A live run issues billable requests against our own hosts. Run without --live",
      "to see exactly what it would do, at no cost.",
    ].join("\n"),
  );
  process.exit(3);
}

let seeds = [];
let seedSource = "EXPLICIT_LIST";
if (seedsFile) {
  seeds = readFileSync(seedsFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== "" && !s.startsWith("#"));
} else {
  seedSource = "SITEMAP";
  const parsed = parseSitemap(readFileSync(sitemapFile, "utf8"));
  seeds = parsed.urls;
  if (parsed.sitemaps.length) {
    console.log(`note: this is a sitemap INDEX naming ${parsed.sitemaps.length} sitemaps. Child sitemaps are not fetched here.`);
  }
}

const result = await crawl({
  seeds,
  seedSource,
  fetchImpl: fetch,
  live,
  onPlan: (plan) => {
    console.log(renderPlan(plan, { live }));
    console.log("");
  },
});

const run = result.run;

/* 🔴 LAW-BOUND-1 — the bounds print beside the result, every time. */
console.log(
  formatBoundedResult({
    label: "CRAWL RUN",
    bounds: {
      maxUrlsPerRun: run.maxUrlsPerRun,
      maxRequestsPerHost: run.maxRequestsPerHost,
      maxResponseBytes: run.maxResponseBytes,
    },
    fields: {
      urlsRequested: run.urlsRequested,
      urlsFetched: run.urlsFetched,
      requestsIssued: run.requestsIssued,
      capReached: run.capReached,
      coverageState: run.coverageState,
    },
  }),
);
console.log(`cost: ${run.cost.amount} [${run.cost.amountState}] — ${run.cost.basis}`);
console.log("");

/* 🔴 THE BILLING SENTENCE. EVERY RUN. NO EXCEPTIONS. */
for (const [host, n] of Object.entries(run.perHostRequests)) {
  console.log(`🔴 ${n} requests issued to host ${host} — this is billable traffic on our own Vercel account.`);
}
if (Object.keys(run.perHostRequests).length === 0) {
  console.log("0 requests issued — dry run. No billable traffic.");
}

if (run.robotsUnknownHosts.length) {
  console.log(`\n⚠️ robots.txt unreadable on ${run.robotsUnknownHosts.length} host(s) — treated as DISALLOW ALL:`);
  for (const h of run.robotsUnknownHosts) console.log(`   ${h}`);
}

const { pages, edgesOutsideInventory } = buildInventory({ observations: result.observations.map((o) => ({ ...o.value, observation_id: o.observation_id, observed_at: o.observed_at })), edges: result.edges });
console.log(`\nINVENTORY: ${pages.length} pages · ${result.edges.length} edges recorded (never followed) · ${edgesOutsideInventory} edges point outside the crawled set`);
if (pages.length) {
  console.log(`unlinked within the crawled set: ${unlinkedWithinCrawledSet(pages).length}`);
}

console.log("\n🔴 A FETCHED URL IS NOT AN INDEXED URL. A CRAWLED INVENTORY IS NOT THE SITE.");
console.log(`   coverageState=${run.coverageState} — this run saw what its seeds named, up to its bounds.`);

if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
const store = createJsonlStore(out);
store.appendAll(result.observations);
store.append(run);
console.log(`\nwritten: ${out}  (${result.observations.length} observations + 1 run)`);
