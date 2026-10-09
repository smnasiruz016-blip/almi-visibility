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
 *   node bin/crawl.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> [--live --i-have-the-owners-green]
 *
 * 🔴 A TENANT'S RUN STORE (F09, 25 Sep 2026 — generic, needed by every tenant). Without --research-batch the crawl scopes
 * the engine's SHARED evidence store, cost ledger and run store. Those hold more than one tenant's records, so no tenant can
 * lawfully be attached to them, and every tenant's production crawl is refused at F02. With --research-batch=<id>, the run
 * scopes ONE resource instead: that RESEARCH_BATCH, declared in the data root's RESEARCH store (F03) and attached to the
 * run's tenant (F02). Its seeds are read from the batch (seeds.txt), and its observations, run record and cost entry are
 * written INTO the batch through the governed boundary. The shared stores are never touched. Without --research-batch, bodies
 * still go only to --corpus and are never committed. Nothing here names a subject.
 *
 * 🔴 F19 ACCEPTANCE AMENDMENT 1 (_handoffs b6b3382, RR-227):
 *   E  a crawl ON A RESEARCH BATCH stores each fetched body in that batch's own body store (bodies.jsonl, the format F31's reader
 *      reads: src/crawl/batch-bodies.mjs), in the same run as its observation, under the batch store's ceiling — a body past it is
 *      counted, never cut — and never in the engine's corpus. The run record carries the counts only.
 *   C  `--sitemaps` (with --research-batch and --subject) re-collects the sitemap of every site origin the subject's PUBLIC_SITE
 *      connector declares, for ONE tenant, into that batch's own sitemap store (sitemaps.jsonl) — and writes nothing else. The batch
 *      must be attached to the tenant (F02) and a member of the subject, which must resolve to the tenant (F03); robots honoured; a
 *      dry run issues no request; a live run needs the owner's green.
 *   B  the listing is stored WHOLE (src/crawl/sitemap-collect.mjs): every URL read, COMPLETE only when nothing failed, was cut,
 *      unparsed or skipped; a listing that would put the store over its ceiling is refused whole, and the refusal recorded.
 *   node bin/crawl.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> --sitemaps [--live --i-have-the-owners-green]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import { crawl, renderPlan } from "../src/crawl/crawler.mjs";
import { buildInventory, unlinkedWithinCrawledSet } from "../src/crawl/inventory.mjs";
import { formatBoundedResult } from "../src/report/bounded.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { parseSitemap } from "../src/crawl/seeds.mjs";
import { selectSeeds, renderSelection, SELECTION_RULE } from "../src/crawl/seed-selection.mjs";
import { measureIpv6Egress, addressFamilies, reachabilityState } from "../src/crawl/ipv6.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { confineToRepo, writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createCostLedger, entryFromCrawlRun, formatLedgerLine } from "../src/cost/ledger.mjs";
import { persistCrawlObservations } from "../src/crawl/persist.mjs";
import { preflightCrawlWrites, preflightSitemapWrite, collectionVerdict } from "../src/crawl/preflight.mjs";
import { collectSitemap, sitemapListingRecord, recordLineBytes, storeCeilingDecision, ceilingRefusalEvent, renderSitemapPlan, BATCH_STORE_CEILING_BYTES } from "../src/crawl/sitemap-collect.mjs";
import { pageBodyRecords, bodiesUnderCeiling, BATCH_FILES } from "../src/crawl/batch-bodies.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { openConnector, NO_REQUEST_FETCH } from "../src/tenancy/connectors.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const researchBatch = arg("research-batch");
if (researchBatch !== null && !/^[a-z0-9][a-z0-9-]*$/.test(researchBatch)) {
  console.error("🔴 USAGE REFUSED: --research-batch is a declared id — lowercase letters, digits and hyphens only");
  process.exit(2);
}
const seedsFile = arg("seeds");
const sitemapFile = arg("sitemap");
const fromEvidence = arg("seeds-from-evidence");
const live = flag("live");
const green = flag("i-have-the-owners-green");
/* RR-227 (F19 A1 · C): a sitemap re-collection, only ever into a declared research batch, only for a named subject */
const sitemapMode = flag("sitemaps");
if (sitemapMode && (researchBatch === null || !arg("subject"))) {
  console.error("🔴 USAGE REFUSED: --sitemaps re-collects into ONE declared research batch for ONE subject — it needs --research-batch=<id> and --subject=<id>");
  process.exit(2);
}
// 🔴 Confined here, BEFORE the egress measurement and DNS lookups below: a
// destination outside this repository is refused before any network activity.
let out = researchBatch ? null : confineToRepo(arg("out", `${REPO}runs/crawl/crawl.jsonl`), { label: "--out" });
const corpusDir = confineToRepo(arg("corpus", `${REPO}runs/crawl/corpus`), { label: "--corpus" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
/* 🔴 F03 — a LIVE crawl reaches the web only through the PUBLIC_SITE connector of the subject it runs for
 * (--subject=<declared id>), decided here with everything else. A dry run opens no connector and is handed a fetch that
 * refuses every request, so it needs no connector decision and can reach nothing. */
const SUBJECT = arg("subject");
/* RR-227: a sitemap re-collection also names the SUBJECT's data root, so F03 decides it resolves to the run's tenant before anything */
const STORES = researchBatch ? [RESOURCES.researchBatch(researchBatch), ...(sitemapMode ? [RESOURCES.subject(SUBJECT)] : [])] : [RESOURCES.evidenceStore(), RESOURCES.costLedger(), RESOURCES.runArtefacts("crawl store and seed inputs")];
const SCOPE = scopedEntryPoint({ entry: "bin/crawl.mjs", governed: true, resources: [...(live ? [RESOURCES.connector(SUBJECT, "PUBLIC_SITE"), RESOURCES.costLedger(ownLedgerRef())] : []), ...STORES, RESOURCES.inputPath(seedsFile, "--seeds"), RESOURCES.inputPath(sitemapFile, "--sitemap"), RESOURCES.inputPath(fromEvidence, "--seeds-from-evidence")] });
/* RR-244 (F78 Amendment 2): the cost recorder is constructed immediately after the scope gate — nothing can end a run that passed
 * the gate before it is recorded */
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
/* 🔴 F78 Amendment 1 C8/C9 (RR-243): a LIVE run (the only kind that opens a connector or makes any request) writes its cost into its
 * tenant's own declared ledger — its crawl entry, or, when it ends before that entry, one run entry, whatever ended it. It is handed the
 * WRITE LAW's permission (--confirm), never --live's wider recording rule: without --confirm it makes no request at all. */
const RUN_COST = live ? runCost({ entryPoint: "bin/crawl.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;
/* F02: this run's hosts are the site origins DECLARED to its tenant — no estate list in shared code (relocated, 24 Sep 2026). */
const DECLARED_HOSTS = declaredSiteHosts({ tenantId: SCOPE.tenantId });
/* The run store, located only AFTER F02 decided it belongs to this run's tenant. Its root is where every write of this run
 * lands; its seeds file is this run's input. */
let WRITE_ROOT = REPO;
let batchSeeds = null;
let ledgerFile = null;
let batchDir = null;
if (researchBatch) {
  const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
  if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state} (${store.reason})`); process.exit(3); }
  batchDir = join(store.dir, researchBatch);
  if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
  WRITE_ROOT = store.rootPath;
  out = join(batchDir, "crawl.jsonl");
  ledgerFile = join(batchDir, "ledger.jsonl");
  batchSeeds = join(batchDir, "seeds.txt");
}

/* ---- 🔴 RR-227 · F19 A1 · C — ONE TENANT'S SITEMAP, RE-COLLECTED INTO ITS OWN RESEARCH BATCH, AND NOTHING ELSE --------------------- *
 * Decided above, before anything here: the batch is attached to the run's tenant (F02) and the subject's data root resolves to it (F03).
 * Here, still before any request: the batch must be a MEMBER of that subject; the live run needs the owner's green (checked below with
 * the crawl's own gate wording); the governed append is preflighted; only then is the connector opened. The only write is the batch's
 * sitemaps.jsonl. No seed file, no crawl store, no ledger and no shared store is read or written. */
if (sitemapMode) await recollectSitemaps();

if (!seedsFile && !sitemapFile && !fromEvidence && !batchSeeds) {
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
      "A live run issues real requests to the declared hosts. Run without --live",
      "to see exactly what it would do, at no cost.",
    ].join("\n"),
  );
  process.exit(3);
}

/* ---- 🔴 RR-135 — THE SEEDS ARE READ, AND HELD TO THE DECLARED SITE, BEFORE ANY NETWORK ACTIVITY ------------------------------ *
 * Reading them is local (a file, a sitemap file, a stored evidence record). A LIVE run then opens its PUBLIC_SITE connector — no
 * request — and refuses, with ZERO requests made, when it has no seed at all (an empty population proves nothing) or when ANY seed is
 * outside the site origins its subject declares (F19 FAILURE: "the crawl reads a resource not declared for the requested tenant").
 * The check itself sits just after the preflight below, which RR-106 requires to come before the connector is opened.
 * Generic: the origins are the client's own declaration; nothing here names a host. */
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
} else if (seedsFile || batchSeeds) {
  seeds = readFileSync(seedsFile ?? batchSeeds, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== "" && !s.startsWith("#"));
} else {
  seedSource = "SITEMAP";
  const parsed = parseSitemap(readFileSync(sitemapFile, "utf8"));
  seeds = parsed.urls;
  if (parsed.sitemaps.length) {
    console.log(`note: this is a sitemap INDEX naming ${parsed.sitemaps.length} sitemaps. Child sitemaps are not fetched here.`);
  }
}
/* ---- 🔴 RR-106 — THE THREE GOVERNED APPENDS, BUILT ONE WAY, AND PROVED KEEPABLE BEFORE ANY NETWORK ACTIVITY ---------- *
 * RR-105 made 28 live requests and then lost them all: the governed append refused records it had no evidence-state rule for.
 * Each append this run makes is built by ONE function below, used by the preflight AND by the live run, so the preflight checks
 * the very descriptor that will run. The preflight builds (never executes) them over every record kind the crawler can emit,
 * from an in-process synthetic site — before the connector is opened, before the IPv6 probe, before DNS, before any request.
 * A refusal stops a live run here with ZERO requests made. */
const ledgerPathOf = () => RUN_COST?.ledgerPath ?? ledgerFile ?? confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });
const observationsAppend = (records, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope,
  repo: WRITE_ROOT, auditRepo: REPO, permission: recordPermission, store: createJsonlStore(out), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_OBSERVATIONS",
  occurredAt, correlationId, discipline: "APPEND_IF_NEW",
});
/* RR-135: the opened PUBLIC_SITE connector of a live run — opened only after the preflight, below */
let CONNECTOR = null;
/* RR-227 (F19 A1 · E): a research-batch run's bodies go into the batch's own body store, as ONE governed append */
const BODIES_FILE = batchDir ? join(batchDir, BATCH_FILES.BODIES) : null;
const bodiesAppend = (records, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope,
  repo: WRITE_ROOT, auditRepo: REPO, permission: recordPermission, store: createJsonlStore(BODIES_FILE), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_BODIES",
  occurredAt, correlationId, discipline: "APPEND_IF_NEW",
});
const runRecordOf = (run, { selection = null, seedCount = 0, egress = null, unreachable = new Map(), dnsUnknown = [], corpusFiles = 0, corpusBytes = 0, bodies = null } = {}) => ({
  ...run,
  selectionRule: selection?.rule ?? SELECTION_RULE,
  seedPoolSize: selection?.seedPoolSize ?? seedCount,
  seedSelection: selection?.byHost ?? null,
  ipv6Egress: egress,
  unreachableHosts: [...unreachable.entries()].map(([host, v]) => ({ host, ...v })),
  dnsUnknownHosts: dnsUnknown,
  /* RR-135: the declared site this run was held to (counts only) */
  seedScope: CONNECTOR ? { declaredOrigins: CONNECTOR.origins.length, seeds: seedCount, seedsOutside: 0 } : null,
  corpus: {
    files: corpusFiles,
    bytes: corpusBytes,
    committed: false,
    artifactName: process.env.CRAWL_ARTIFACT_NAME ?? null,
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
  },
  /* RR-227 (F19 A1 · E): count-only — the bodies stored in the batch, their bytes, and every body not stored with its reason */
  bodies: researchBatch ? (bodies ?? { store: BATCH_FILES.BODIES, stored: 0, bytes: 0, notStored: {}, ceiling: BATCH_STORE_CEILING_BYTES }) : null,
});
/* Declared: the RUN record is unique by construction — run_id carries the start time — so it uses the
 * without-dedupe discipline and needs no key. */
const runAppend = (runRecord, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope,
  repo: WRITE_ROOT, auditRepo: REPO, permission: recordPermission, store: createJsonlStore(out), records: [runRecord],
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_RUN_RECORD",
  occurredAt, correlationId, discipline: "APPEND_WITHOUT_DEDUPE",
});
const costAppend = (costEntry, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope,
  repo: RUN_COST?.ledgerRoot ?? WRITE_ROOT, auditRepo: REPO, permission: RUN_COST ? permission : recordPermission, store: createCostLedger(ledgerPathOf()), records: [RUN_COST ? { ...costEntry, scope: { tenantId: SCOPE.tenantId } } : costEntry],
  targetClass: "RUN_EVIDENCE", action: "APPEND_CRAWL_COST_ENTRY",
  occurredAt, correlationId,
  discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
});
if (live) {
  const PF_INSTANT = governedInstant(Date.now());
  const PF_CORRELATION = `run:crawl-preflight:${PF_INSTANT}`;
  const pf = await preflightCrawlWrites({ build: {
    observations: (records) => observationsAppend(records, PF_INSTANT, PF_CORRELATION),
    run: (run) => runAppend(runRecordOf(run), PF_INSTANT, PF_CORRELATION),
    cost: (run) => costAppend(entryFromCrawlRun(runRecordOf(run), { recordedAt: new Date().toISOString() }), PF_INSTANT, PF_CORRELATION),
    ...(researchBatch ? { bodies: (r) => bodiesAppend(pageBodyRecords({ observations: r.observations, bodies: r.bodies }), PF_INSTANT, PF_CORRELATION) } : {}),
  } });
  console.log(`PREFLIGHT       : ${pf.ok ? "PASS" : "REFUSED"} — record kinds ${pf.kinds.length} (${pf.kinds.join(", ")}) · ${pf.checks.map((c) => `${c.append} ${c.ok ? "keepable" : "REFUSED"} (${c.records})`).join(" · ")} · synthetic in-process calls ${pf.syntheticCalls} · network requests ${pf.networkRequests}`);
  if (!pf.ok) {
    for (const c of pf.checks.filter((x) => !x.ok)) console.error(`🔴 PREFLIGHT REFUSED — ${c.append}: ${c.why}`);
    console.error("🔴 NO REQUEST WAS MADE. The run stops before the connector, the IPv6 probe, DNS or any fetch: a result that cannot be kept is not collected.");
    process.exit(3);
  }
}

/* RR-135: after the preflight (RR-106: nothing opens before it), before the IPv6 probe, DNS or any request. */
CONNECTOR = live ? RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" })) : null;
if (live) {
  if (seeds.length === 0) {
    console.error("🔴 REFUSED — NO_SEEDS: a live run needs at least one declared seed. NO REQUEST WAS MADE.");
    process.exit(3);
  }
  const outside = seeds.filter((u) => !CONNECTOR.admits(u)).length;
  if (outside > 0) {
    console.error(`🔴 REFUSED — SEED_OUTSIDE_DECLARED_SITE: ${outside} of ${seeds.length} seed(s) are not on a site origin the subject declares (${CONNECTOR.origins.length} declared). NO REQUEST WAS MADE.`);
    process.exit(3);
  }
  console.log(`SEED SCOPE      : ${seeds.length} seed(s), every one on a declared site origin (${CONNECTOR.origins.length} declared) · redirects followed only to a declared origin, each hop paced`);
}

/* ---- 🔴 U-CRW-IPv6, MEASURED BEFORE ANYTHING IS FETCHED ----------------- *
 *
 * Measured even on a dry run: the answer is a fact about the runner, it costs
 * one TCP connection to a third party, and knowing it BEFORE the live pass is
 * the difference between recording a third state and inventing a zero.
 */
console.log(live ? "[write:local] a LIVE run records what it fetches and spends — D-CRW-4's two flags were given" : permission.mayWrite ? `[write:local] ${permission.reason}` : `[dry-run] no writes will happen — ${permission.reason}`);
/* RR-243 (F78 C8): the probe and the lookups are requests — made only by a LIVE run, which records its cost; a dry run makes none */
const egress = live ? await measureIpv6Egress() : { state: "NOT_MEASURED", detail: "a dry run makes no request (F78 Amendment 1, C8)", elapsedMs: 0 };
if (live) RUN_COST.noteRequests("ipv6-egress-probe", 1);
console.log(`IPv6 EGRESS     : ${egress.state} — ${egress.detail} (${egress.elapsedMs}ms)`);

const unreachable = new Map();
const dnsUnknown = [];
for (const host of live ? DECLARED_HOSTS : []) {
  const families = await addressFamilies(host);
  RUN_COST.noteRequests("dns-lookup", 1);
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


const result = await crawl({
  seeds,
  seedSource,
  seedPoolSize: selection?.seedPoolSize ?? seeds.length,
  fetchImpl: live ? CONNECTOR.fetch : NO_REQUEST_FETCH,
  fetcherOptions: live ? { admits: CONNECTOR.admits } : {},
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
      capacity: run.capacity,
      maxDepth: run.maxDepth,
      requestIntervalMs: run.requestIntervalMs,
      requestTimeoutMs: run.requestTimeoutMs,
    },
    fields: {
      urlsRequested: run.urlsRequested,
      urlsFetched: run.urlsFetched,
      requestsIssued: run.requestsIssued,
      robotsRequestsIssued: run.robotsRequestsIssued,
      truncations: run.truncations,
      refusals: run.refusals,
      capReached: run.capReached,
      coverageState: run.coverageState,
    },
  }),
);
console.log(`cost: ${run.cost.amount} [${run.cost.amountState}] — ${run.cost.basis}`);
console.log("");

/* 🔴 THE BILLING SENTENCE. EVERY RUN. NO EXCEPTIONS. */
for (const [host, n] of Object.entries(run.perHostRequests)) {
  console.log(`🔴 ${n} requests issued to host ${host} — real traffic to that host; whatever it cost the host's operator is NOT MEASURED.`);
}
if (Object.keys(run.perHostRequests).length === 0) {
  console.log("0 requests issued — dry run. No traffic.");
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
/* RR-104: the headers, link and date-claim records ride the SAME governed append (their own measurement keys, APPEND_IF_NEW) */
/* 🔴 RR-106 — FETCHED IS NOT KEPT. The summary above counts what was FETCHED; nothing is collected until the writes below commit. A
 * refusal here (RR-105: EVIDENCE_STATE_UNPLACEABLE) ends the run as NOT KEPT, saying what was spent and that nothing was written. */
console.log("FETCHED, NOT YET KEPT — the collection verdict follows the governed writes below.");
let observationsGoverned;
try {
  observationsGoverned = executeGovernedWrite(observationsAppend([...result.observations, ...(result.evidence ?? [])], CRAWL_INSTANT, CRAWL_CORRELATION));
} catch (e) {
  console.error(`🔴 COLLECTION: ${collectionVerdict({ observations: null }).verdict} — the observations append was refused (${e.code ?? e.name}): 0 observations, 0 evidence records, 0 bodies, 0 run record and 0 cost entry were written; ${run.requestsIssued + run.robotsRequestsIssued} request(s) had been made.`);
  process.exit(1);
}
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
let bodiesCount = null;
let bodiesOutcome;
if (mayRecord && live && researchBatch) {
  /* 🔴 RR-227 (F19 A1 · E): INTO THE BATCH, never the engine's corpus. Each body is its observation's (same hash, or nothing is built),
   * checked against the batch store's ceiling before the write: a body past it is counted and not stored — never cut. */
  const all = pageBodyRecords({ observations: result.observations, bodies: result.bodies ?? new Map() });
  const fit = bodiesUnderCeiling({ records: all, existingBytes: existsSync(BODIES_FILE) ? statSync(BODIES_FILE).size : 0 });
  if (fit.kept.length) {
    const g = executeGovernedWrite(bodiesAppend(fit.kept, CRAWL_INSTANT, CRAWL_CORRELATION));
    bodiesOutcome = g.outcome;
    if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") { console.error(`🔴 ${g.outcome} — the bodies were not written; the governed attempt is on the audit trail`); process.exitCode = 1; }
  }
  const stored = bodiesOutcome === "COMMITTED" || bodiesOutcome === "ALREADY_COMMITTED";
  bodiesCount = { store: BATCH_FILES.BODIES, stored: stored ? fit.kept.length : 0, bytes: stored ? fit.keptBytes : 0, notStored: { ...fit.notStored, ...(fit.kept.length && !stored ? { WRITE_NOT_COMMITTED: fit.kept.length } : {}) }, ceiling: fit.ceiling };
  console.log(`\nbodies: ${bodiesCount.stored} stored in the batch (${bodiesCount.bytes} bytes) · not stored: ${Object.entries(bodiesCount.notStored).map(([k, n]) => `${k} ${n}`).join(", ") || "none"} · nothing written to the engine's corpus`);
} else if (mayRecord) {
  if (live && result.bodies?.size) {
    for (const [observationId, body] of result.bodies) {
      /* One body is one target, so this is per-TARGET and not per-record. */
      const bodyGoverned = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
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
const runRecord = runRecordOf(run, { selection, seedCount: seeds.length, egress, unreachable, dnsUnknown, corpusFiles, corpusBytes, bodies: bodiesCount });
const runGoverned = executeGovernedWrite(runAppend(runRecord, CRAWL_INSTANT, CRAWL_CORRELATION));
if (runGoverned.outcome === "COMMITTED" || runGoverned.outcome === "ALREADY_COMMITTED") {
  console.log(`\nwritten: ${out}  (${result.observations.length} observations + 1 run)`);
} else if (runGoverned.outcome === "REFUSED") {
  console.log(`\n[dry-run] the crawl record was NOT written to ${out} — a dry run records nothing unless --confirm`);
} else {
  console.error(`🔴 ${runGoverned.outcome} — the run record was not written; the governed attempt is on the audit trail`);
  process.exit(1);
}

let costOutcome = null;
/* 🔴 ITEM 45 — a live run is costed in the ledger as it happens. A dry run
 * issues no request and spends nothing, so it writes no cost entry. */
if (live) {
  /* A dry run issues no request and spends nothing, so it writes no cost entry — that rule is preserved by the
   * `live` condition. The ledger SKIPS a duplicate entry_id and writes nothing, so the expected line count is
   * asked of that discipline. */
  const costEntry = entryFromCrawlRun(runRecord, { recordedAt: new Date().toISOString() });
  const costGoverned = executeGovernedWrite(costAppend(costEntry, CRAWL_INSTANT, CRAWL_CORRELATION));
  costOutcome = costGoverned.outcome;
  if (costGoverned.outcome === "COMMITTED" || costGoverned.outcome === "ALREADY_COMMITTED") {
    RUN_COST?.covered(costEntry.entry_id);
    console.log(`cost ledger: ${formatLedgerLine(costEntry)}`);
  } else if (costGoverned.outcome !== "REFUSED") {
    console.error(`🔴 ${costGoverned.outcome} — the cost entry was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}

/* 🔴 RR-106 — THE COLLECTION VERDICT, from the writes themselves: KEPT only when every governed write this run depends on committed. */
/* RR-108: the pacing bound prints beside its measured result, and a live run passes its pacing into the verdict. */
if (live) { const rd = run.redirects; console.log(rd ? `REDIRECTS: hops followed ${rd.hopsFollowed} (each paced, max ${rd.maxHops} per page) · not followed: origin not declared ${rd.notFollowed.ORIGIN_NOT_ADMITTED}, past the hop bound ${rd.notFollowed.MAX_HOPS}` : "REDIRECTS: NOT MEASURED"); }
if (live) { const p = run.pacing; console.log(p ? `PACING: declared ${p.intervalMs} ms · gaps ${p.gaps} · fastest ${p.fastestGapMs?.toFixed(3) ?? "NOT MEASURED"} ms · slowest ${p.slowestGapMs?.toFixed(3) ?? "NOT MEASURED"} ms · robots→first page ${p.robotsToFirstPageMs?.toFixed(3) ?? "NOT MEASURED"} ms · breaches ${p.breaches} of ${p.gaps} · clock ${p.clock}` : "PACING: NOT MEASURED"); }
const collection = collectionVerdict(live ? { observations: observationsGoverned.outcome, ...(bodiesOutcome !== undefined ? { bodies: bodiesOutcome } : {}), run: runGoverned.outcome, cost: costOutcome } : { observations: observationsGoverned.outcome, run: runGoverned.outcome }, live ? { pacing: run.pacing ?? null } : {});
console.log(`COLLECTION: ${collection.verdict}${collection.failed.length ? ` — not committed: ${collection.failed.join(" · ")}` : ""}`);
if (live && collection.verdict !== "KEPT") process.exitCode = 1;

/** RR-227 · F19 A1 · C — the sitemap re-collection (called above, before any seed is read; it always exits). */
async function recollectSitemaps() {
  if (live && !green) {
    console.error("🔴 REFUSED. --live requires --i-have-the-owners-green. NO REQUEST WAS MADE.");
    process.exit(3);
  }
  const subject = lookupSubject(rootIndexFor(process.env), SUBJECT);
  const member = subject.state === "DECLARED" && (subject.entry?.members ?? []).some((m) => m?.resourceKind === "RESEARCH_BATCH" && m?.resourceRef === researchBatch);
  if (!member) {
    console.error("🔴 REFUSED — BATCH_NOT_A_MEMBER_OF_THE_SUBJECT: the research batch is not declared as a member of the subject this run is for. NO REQUEST WAS MADE.");
    process.exit(3);
  }
  /* the batch's OWN sitemap store, named by F19's BATCH_FILES — the very name F31's reader reads (held equal by test/f19-a1.test.mjs). It lives inside
   * the research batch decided above (RESEARCH), never the shared sitemap collection. */
  const SITEMAPS_FILE = join(batchDir, BATCH_FILES.SITEMAPS);
  const sitemapsAppend = (records, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope,
    repo: WRITE_ROOT, auditRepo: REPO, permission: recordPermission, store: createJsonlStore(SITEMAPS_FILE), records,
    targetClass: "GENERATED_CONFIG", action: "APPEND_SITEMAP_LISTING",
    occurredAt, correlationId, discipline: "APPEND_IF_NEW",
  });
  if (live) {
    const PF_INSTANT = governedInstant(Date.now());
    const pf = await preflightSitemapWrite({ build: { sitemaps: (records) => sitemapsAppend(records, PF_INSTANT, `run:crawl-sitemaps-preflight:${PF_INSTANT}`) } });
    console.log(`PREFLIGHT       : ${pf.ok ? "PASS" : "REFUSED"} — ${pf.checks.map((c) => `${c.append} ${c.ok ? "keepable" : "REFUSED"} (${c.records})`).join(" · ")} · synthetic in-process calls ${pf.syntheticCalls} · network requests ${pf.networkRequests}`);
    if (!pf.ok) {
      for (const c of pf.checks.filter((x) => !x.ok)) console.error(`🔴 PREFLIGHT REFUSED — ${c.append}: ${c.why}`);
      console.error("🔴 NO REQUEST WAS MADE. A listing that cannot be kept is not collected.");
      process.exit(3);
    }
  }
  const SM_CONNECTOR = live ? RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" })) : null;
  const origins = live ? SM_CONNECTOR.origins : DECLARED_HOSTS.map((h) => `https://${h}`);
  console.log(renderSitemapPlan({ origins: origins.length, live }));
  if (!live) {
    console.log("0 requests issued — dry run. No traffic. Nothing is written.");
    process.exit(0);
  }
  const results = [];
  for (const origin of origins) {
    const r = await collectSitemap({ origin, fetchImpl: SM_CONNECTOR.fetch, admits: SM_CONNECTOR.admits });
    results.push(r);
    console.log(`  origin ${results.length}: urls ${r.urls.length} · children fetched ${r.childrenFetched}/${r.childrenTotal ?? "?"} · nested indexes followed ${r.nestedIndexesFollowed}/${r.nestedIndexes} · requests ${r.requests} · coverage ${r.coverageState} — ${r.why}`);
    console.log(`🔴 ${r.requests} requests issued to declared origin ${results.length} — real traffic to that host; whatever it cost the host's operator is NOT MEASURED.`);
  }
  const records = results.map((result) => sitemapListingRecord({ result, observedAt: new Date().toISOString() }));
  /* 🔴 B — THE CEILING, BEFORE THE WRITE: past it, the listing is refused WHOLE and the refusal recorded; never cut to fit */
  const decision = storeCeilingDecision({ existingBytes: existsSync(SITEMAPS_FILE) ? statSync(SITEMAPS_FILE).size : 0, addBytes: records.reduce((n, r) => n + recordLineBytes(r), 0) });
  if (!decision.fits) {
    SCOPE.recordDecision(ceilingRefusalEvent({ store: "sitemaps" }));
    console.error(`🔴 REFUSED WHOLE — OVER_THE_BATCH_STORE_CEILING: the listing would put the batch's sitemap store at ${decision.after} bytes, past its ceiling of ${decision.ceiling}. Nothing was written; the refusal is recorded. COLLECTION: NOT KEPT`);
    process.exit(1);
  }
  const SM_INSTANT = governedInstant(Date.now());
  const governed = executeGovernedWrite(sitemapsAppend(records, SM_INSTANT, `run:crawl-sitemaps:${SM_INSTANT}`));
  const pacing = { ok: results.every((r) => (r.pacing?.breaches ?? 1) === 0), breaches: results.reduce((n, r) => n + (r.pacing?.breaches ?? 0), 0), gaps: results.reduce((n, r) => n + (r.pacing?.gaps ?? 0), 0), intervalMs: results[0]?.bound?.intervalMs ?? null };
  const collection = collectionVerdict({ sitemaps: governed.outcome }, { pacing });
  console.log(`LISTINGS: ${records.length} · URLs stored ${records.reduce((n, r) => n + r.value.urlsStored, 0)} of ${records.reduce((n, r) => n + r.value.urlsTotal, 0)} read · store ${decision.after} of ${BATCH_STORE_CEILING_BYTES} bytes`);
  console.log(`COLLECTION: ${collection.verdict}${collection.failed.length ? ` — not committed: ${collection.failed.join(" · ")}` : ""}`);
  process.exit(collection.verdict === "KEPT" ? 0 : 1);
}
