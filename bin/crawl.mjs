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
import { dirname, join } from "node:path";

import { crawl, renderPlan } from "../src/crawl/crawler.mjs";
import { buildInventory, unlinkedWithinCrawledSet } from "../src/crawl/inventory.mjs";
import { formatBoundedResult } from "../src/report/bounded.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { parseSitemap } from "../src/crawl/seeds.mjs";
import { selectSeeds, renderSelection, SELECTION_RULE } from "../src/crawl/seed-selection.mjs";
import { measureIpv6Egress, addressFamilies, reachabilityState } from "../src/crawl/ipv6.mjs";
import { ESTATE_HOSTNAME_LIST } from "../config/estate-hostnames.mjs";
import { confineToRepo, writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createCostLedger, entryFromCrawlRun, formatLedgerLine } from "../src/cost/ledger.mjs";
import { persistCrawlObservations } from "../src/crawl/persist.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const seedsFile = arg("seeds");
const sitemapFile = arg("sitemap");
const fromEvidence = arg("seeds-from-evidence");
const live = flag("live");
const green = flag("i-have-the-owners-green");
// 🔴 Confined here, BEFORE the egress measurement and DNS lookups below: a
// destination outside this repository is refused before any network activity.
const out = confineToRepo(arg("out", `${REPO}runs/crawl/crawl.jsonl`), { label: "--out" });
const corpusDir = confineToRepo(arg("corpus", `${REPO}runs/crawl/corpus`), { label: "--corpus" });
/* 🔴 GAP 1 (15 September 2026) — THE LOCAL RECORD. D-CRW-4's two flags gate the NETWORK and the bodies; until today
 * every DRY run still appended a run record to --out. A dry run now records nothing unless --confirm. A LIVE run has
 * already passed D-CRW-4's two flags and records what it fetched and spent: a billable run that kept no record would be
 * the worse failure. */
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const mayRecord = live || permission.mayWrite;
/* 🔴 THE CALLER'S OWN GATE IS PRESERVED, NOT REPLACED. This binary records when EITHER --live or --confirm is
 * given, which is a wider rule than the write law alone; handing the boundary `permission` would have silently
 * narrowed it. The boundary is given the decision this caller actually makes, and audits both outcomes of it. */
const recordPermission = { ...permission, mayWrite: mayRecord, reason: mayRecord ? permission.reason : "no --live and no --confirm" };

if (!seedsFile && !sitemapFile && !fromEvidence) {
  console.error(
    "usage: node bin/crawl.mjs (--seeds=<file.txt> | --sitemap=<file.xml> | --seeds-from-evidence=<evidence.jsonl>)\n" +
      "                         [--live --i-have-the-owners-green]",
  );
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

/* ---- 🔴 U-CRW-IPv6, MEASURED BEFORE ANYTHING IS FETCHED ----------------- *
 *
 * Measured even on a dry run: the answer is a fact about the runner, it costs
 * one TCP connection to a third party, and knowing it BEFORE the live pass is
 * the difference between recording a third state and inventing a zero.
 */
console.log(live ? "[write:local] a LIVE run records what it fetches and spends — D-CRW-4's two flags were given" : permission.mayWrite ? `[write:local] ${permission.reason}` : `[dry-run] no writes will happen — ${permission.reason}`);
const egress = await measureIpv6Egress();
console.log(`IPv6 EGRESS     : ${egress.state} — ${egress.detail} (${egress.elapsedMs}ms)`);

const unreachable = new Map();
const dnsUnknown = [];
for (const host of ESTATE_HOSTNAME_LIST) {
  const families = await addressFamilies(host);
  if (families.hasA === true) continue; // the ordinary case; nothing to say
  const verdict = reachabilityState({ families, egress });
  if (!verdict) {
    if (families.hasAAAA) console.log(`   ${host}: AAAA-only, and this runner HAS IPv6 egress — reachable.`);
    continue;
  }
  if (verdict.state === "UNREACHABLE_NO_IPV6") {
    unreachable.set(host, verdict);
    console.log(`🔴 ${host}: ${verdict.state}`);
    console.log(`   ${verdict.because}`);
  } else {
    /* 🔴 UNKNOWN is NOT filed as UNREACHABLE. "Our resolver failed" and "this
     * host cannot be reached" are different facts, and the first one must not
     * be allowed to masquerade as a finding about their site. */
    dnsUnknown.push({ host, because: verdict.because });
    console.log(`⚠️  ${host}: DNS UNKNOWN — ${families.error ?? "no reason recorded"}`);
  }
}
if (dnsUnknown.length) {
  console.log(`⚠️  DNS could not be read for ${dnsUnknown.length} host(s) from this machine.`);
  console.log("   Recorded as UNKNOWN, not as unreachable and not as absent.");
}
console.log("");

let seeds = [];
let seedSource = "EXPLICIT_LIST";
let selection = null;

if (fromEvidence) {
  /* 🔴 SEEDS FROM THE EVIDENCE STORE — item 4's output is item 1's input. */
  seedSource = "SEARCH_CONSOLE";
  const records = createJsonlStore(fromEvidence).readAll();
  const pageRows = records
    .filter((r) => r.record_type === "observation" && r.method === "gsc.searchAnalytics.query:page-rows")
    .at(-1)?.value?.rows;
  if (!pageRows?.length) {
    console.error(
      `no page rows in ${fromEvidence}. Run bin/gsc-ingest.mjs first — the by-page HOSTNAME aggregate\n` +
        "is not the page list, and this seeding mode needs the URLs themselves.",
    );
    process.exit(4);
  }
  selection = selectSeeds(pageRows);
  seeds = selection.selected;
  console.log(renderSelection(selection));
  console.log("");
} else if (seedsFile) {
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
  seedPoolSize: selection?.seedPoolSize ?? seeds.length,
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

/* Routed. The bare mkdir is gone: each governed write's prepare step creates the directory it writes into.
 *
 * 🔴 appendIfNew, not appendAll: a measurement_key carries no clock, so the same page read twice with the same
 * bytes is ONE observation plus a RE-SIGHTING — that repeat behaviour is deliberate and is preserved. The run
 * record below is NOT deduplicated, because its run_id carries the start time and a second run is genuinely a
 * second run. */
const CRAWL_INSTANT = governedInstant(Date.now());
const CRAWL_CORRELATION = `run:crawl:${CRAWL_INSTANT}`;
const store = createJsonlStore(out);
const observationsGoverned = executeGovernedWrite(governedStoreAppend({
  repo: REPO, permission: recordPermission, store, records: result.observations,
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_OBSERVATIONS",
  occurredAt: CRAWL_INSTANT, correlationId: CRAWL_CORRELATION, discipline: "APPEND_IF_NEW",
}));
if (observationsGoverned.outcome !== "REFUSED" && observationsGoverned.outcome !== "COMMITTED" && observationsGoverned.outcome !== "ALREADY_COMMITTED") {
  console.error(`🔴 ${observationsGoverned.outcome} — the observations were not written; the governed attempt is on the audit trail`);
  process.exit(1);
}

/**
 * 🔴 RAW BODIES GO TO A CORPUS DIRECTORY, NOT INTO GIT.
 *
 * 500 pages of somebody's rendered HTML is not repository content: it is large,
 * it is regenerable, and a repo is not a cache. What IS committed is the record
 * and its `content_sha256`, so anyone can verify a body against its hash later
 * without the body ever having been versioned.
 *
 * The directory is uploaded as a CI artifact and named in the run record.
 */
let corpusFiles = 0;
let corpusBytes = 0;
if (mayRecord) {
  if (live && result.bodies?.size) {
    for (const [observationId, body] of result.bodies) {
      /* One body is one target, so this is per-TARGET and not per-record. */
      const bodyGoverned = executeGovernedWrite(governedFileWrite({
        repo: REPO, permission: recordPermission, target: join(corpusDir, `${observationId}.html`),
        targetClass: "GENERATED_CONFIG", bytes: body,
        action: "WRITE_CRAWL_BODY", occurredAt: CRAWL_INSTANT, correlationId: CRAWL_CORRELATION,
      }));
      if (bodyGoverned.outcome !== "COMMITTED" && bodyGoverned.outcome !== "ALREADY_COMMITTED") {
        console.error(`🔴 ${bodyGoverned.outcome} — a crawl body was not written; the governed attempt is on the audit trail`);
        process.exitCode = 1;
        continue;
      }
      corpusFiles += 1;
      corpusBytes += Buffer.byteLength(body, "utf8");
    }
    console.log(`\ncorpus: ${corpusFiles} bodies, ${(corpusBytes / 1024 / 1024).toFixed(2)} MiB → ${corpusDir}`);
    console.log("  🔴 NOT committed. Verify any body against its content_sha256 in the run record.");
  }
}

/* The selection rule and the CI identifiers travel WITH the run record: a
 * selection nobody can reproduce is not evidence. */
const runRecord = {
  ...run,
  selectionRule: selection?.rule ?? SELECTION_RULE,
  seedPoolSize: selection?.seedPoolSize ?? seeds.length,
  seedSelection: selection?.byHost ?? null,
  ipv6Egress: egress,
  unreachableHosts: [...unreachable.entries()].map(([host, v]) => ({ host, ...v })),
  dnsUnknownHosts: dnsUnknown,
  corpus: {
    files: corpusFiles,
    bytes: corpusBytes,
    committed: false,
    artifactName: process.env.CRAWL_ARTIFACT_NAME ?? null,
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
  },
};
/* Declared: the RUN record is unique by construction — run_id carries the start time — so it uses the
 * without-dedupe discipline and needs no key. */
const runGoverned = executeGovernedWrite(governedStoreAppend({
  repo: REPO, permission: recordPermission, store, records: [runRecord],
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_RUN_RECORD",
  occurredAt: CRAWL_INSTANT, correlationId: CRAWL_CORRELATION, discipline: "APPEND_WITHOUT_DEDUPE",
}));
if (runGoverned.outcome === "COMMITTED" || runGoverned.outcome === "ALREADY_COMMITTED") {
  console.log(`\nwritten: ${out}  (${result.observations.length} observations + 1 run)`);
} else if (runGoverned.outcome === "REFUSED") {
  console.log(`\n[dry-run] the crawl record was NOT written to ${out} — a dry run records nothing unless --confirm`);
} else {
  console.error(`🔴 ${runGoverned.outcome} — the run record was not written; the governed attempt is on the audit trail`);
  process.exit(1);
}

/* 🔴 ITEM 45 — a live run is costed in the ledger as it happens. A dry run
 * issues no request and spends nothing, so it writes no cost entry. */
if (live) {
  /* A dry run issues no request and spends nothing, so it writes no cost entry — that rule is preserved by the
   * `live` condition. The ledger SKIPS a duplicate entry_id and writes nothing, so the expected line count is
   * asked of that discipline. */
  const costEntry = entryFromCrawlRun(runRecord, { recordedAt: new Date().toISOString() });
  const ledgerPath = confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });
  const costGoverned = executeGovernedWrite(governedStoreAppend({
    repo: REPO, permission: recordPermission, store: createCostLedger(ledgerPath), records: [costEntry],
    targetClass: "RUN_EVIDENCE", action: "APPEND_CRAWL_COST_ENTRY",
    occurredAt: CRAWL_INSTANT, correlationId: CRAWL_CORRELATION,
    discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
  }));
  if (costGoverned.outcome === "COMMITTED" || costGoverned.outcome === "ALREADY_COMMITTED") {
    console.log(`cost ledger: ${formatLedgerLine(costEntry)}`);
  } else if (costGoverned.outcome !== "REFUSED") {
    console.error(`🔴 ${costGoverned.outcome} — the cost entry was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}
