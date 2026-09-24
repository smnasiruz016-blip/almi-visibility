#!/usr/bin/env node
/**
 * HISSA 2c — item 10's remaining sub-checks, the sitemap contradiction, and
 * item 38's preflight, over pages ALREADY in the store.
 *
 * 🔴 NO CRAWL. Bodies come from the corpus artifact. The ONLY network requests
 * are sitemap discovery files, hard-bounded and counted (see --sitemaps).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex, canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";
import { extractLinks } from "../src/crawl/seeds.mjs";
import { measure } from "../src/audit/shell.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import {
  STATUS_AND_REDIRECTS, HTTPS_ONLY, CANONICAL, NOINDEX, HEAD_ELEMENTS,
  BROKEN_INTERNAL_LINK, QUERY_PARAMETERS, INDEXABILITY_PREFLIGHT,
  parseHead, noindexState, preflight, STRUCTURALLY_UNKNOWN, INDEXABLE_IS_NOT_INDEXED,
} from "../src/audit/technical-checks.mjs";
import { SITEMAP_VS_ROBOTS, collectSitemapUrls, contradictions, MAX_CHILD_SITEMAPS } from "../src/audit/sitemap-check.mjs";
import { parseGroups, selectGroup, decide } from "../src/audit/robots-scope.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 GAP 2 (16 September 2026) — DRY-RUN BY DEFAULT, for the findings AND for the sitemap
 * observations. Until now both appended on every run with no flag and no gate. */
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:audit-technical:${RUN_INSTANT}`;
/* Routed: the sitemap observations and the findings are COLLECTED and committed as two governed decisions. */
const pendingSitemapObservations = [];
const pendingFindings = [];
const wouldWrite = { findings: 0, sitemapObservations: 0 };
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const corpusDir = arg("corpus", null);
const doSitemaps = flag("sitemaps");
const out = confineToRepo(arg("out", `${REPO}runs/audit/technical-findings.jsonl`), { label: "--out" });
const openedAt = new Date().toISOString();
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/audit-technical.mjs", governed: true, resources: [RESOURCES.crawlBatch(BATCH_ID), RESOURCES.evidenceStore(), RESOURCES.operatorDirectory("--corpus")] });

const crawl = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const evidence = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
const robotsRecords = createJsonlStore(`${REPO}runs/evidence/robots.jsonl`).readAll();

const fetched = crawl.filter((r) => r.record_type === "observation" && !r.value?.skipped);
/* 🔴 With no --corpus, the COMMITTED body archive is read — the evidence that
 * outlives the artifact (ruling, 13 September 2026). */
const ARCHIVE = batchFile("bodies-2026-09-12.jsonl.br");
const archiveBodies = !corpusDir && existsSync(ARCHIVE) ? (await import("../src/evidence/body-archive.mjs")).readBodyArchive(ARCHIVE) : null;
const haveCorpus = Boolean((corpusDir && existsSync(corpusDir)) || archiveBodies);

console.log(`corpus  : ${archiveBodies ? `${ARCHIVE} (committed archive)` : haveCorpus ? corpusDir : "🔴 NOT AVAILABLE"}`);
console.log(`pages   : ${fetched.length}`);
console.log(`${INDEXABLE_IS_NOT_INDEXED}\n`);

/* ---- 0B — THE EDGE GRAPH, RESTORED FROM THE ARTIFACT --------------------- */
const pages = [];
const statusByUrl = new Map();
const titleCounts = new Map();
for (const o of fetched) {
  const raw = o.value.final_url ?? o.value.requested_url;
  let c;
  try {
    c = canonicalUrl(raw);
  } catch {
    continue;
  }
  const file = haveCorpus && !archiveBodies ? join(corpusDir, `${o.observation_id}.html`) : null;
  const html = archiveBodies ? archiveBodies.get(o.observation_id) ?? null : file && existsSync(file) ? readFileSync(file, "utf8") : null;
  pages.push({ canonical: c, o, html });
  statusByUrl.set(c.replace(/\/$/, ""), o.value.status);
  if (html) {
    const t = parseHead(html).title;
    if (t) titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
  }
}
for (const o of crawl.filter((r) => r.record_type === "observation" && r.value?.skipped)) {
  // A robots-skipped URL was never fetched: its status is UNKNOWN, not 200.
  try {
    statusByUrl.set(canonicalUrl(o.value.requested_url).replace(/\/$/, ""), undefined);
  } catch {}
}

/* ---- 🔴 ITEM 26 — THE STORED GRAPH, THROUGH THE ONE DEFINITION -----------
 * Until 13 September 2026 this runner derived its own graph and IGNORED A LINK
 * FROM ANOTHER HOST when counting inbound links (341, where the definition
 * gives 335). Inbound is now src/crawl/inbound.mjs over the stored graph.
 * broken-internal-link still asks its own, stated question — a link WITHIN ONE
 * SITE — so its outbound lists keep the same-host filter, read from the same graph. */
const { pagesFromRun, deriveEdges, inboundOf, unpackGraph, ZERO_INBOUND_DEFINITION } = await import("../src/crawl/inbound.mjs");
const GRAPH = batchFile("edges-2026-09-12.jsonl.br");
const distinctPages = pagesFromRun({ crawlRecords: crawl, bodies: new Map(pages.filter((p) => p.html).map((p) => [p.o.observation_id, p.html])) });
const graphEdges = existsSync(GRAPH) ? unpackGraph(readFileSync(GRAPH)) : deriveEdges(distinctPages);
const { inbound, zero } = inboundOf({ pages: distinctPages, edges: graphEdges });
const sameSite = new Map();
for (const e of graphEdges) {
  if (!e.to_parsed || new URL(e.to).hostname !== new URL(e.from).hostname) continue;
  if (!sameSite.has(e.from)) sameSite.set(e.from, new Set());
  sameSite.get(e.from).add(e.to);
}
const outboundByPage = new Map([...sameSite].map(([k, v]) => [k, [...v]]));
console.log(ZERO_INBOUND_DEFINITION);
console.log(`0B — EDGES: ${graphEdges.length} links in served HTML (${existsSync(GRAPH) ? "the stored graph" : "🔴 derived here — no stored graph"}) over ${distinctPages.length} distinct pages.`);
console.log(`     pages with no inbound links inside the crawled set: ${zero.length}\n`);

/* ---- PART 2 — sitemaps, bounded ---------------------------------------- */
/* F02 relocation: the hosts are the site origins DECLARED to this run's tenant — never a list of one estate's hosts. */
const SITEMAP_HOSTS = declaredSiteHosts({ tenantId: SCOPE.tenantId });
const sitemapByHost = new Map();
const sitemapStore = createJsonlStore(`${REPO}runs/evidence/sitemaps.jsonl`);
if (doSitemaps) {
  let totalRequests = 0;
  console.log(`PART 2 — SITEMAPS  [bound: maxChildren=${MAX_CHILD_SITEMAPS}/host, 1 request/second]`);
  for (const host of SITEMAP_HOSTS) {
    const r = await collectSitemapUrls({ origin: `https://${host}`, fetchImpl: fetch });
    totalRequests += r.requests;
    sitemapByHost.set(host, r);
    const obs = makeObservation({
      observed_at: new Date().toISOString(), method: "sitemap.collect",
      target: { kind: "url", ref: `https://${host}/sitemap-index.xml` },
      content_sha256: sha256Hex(JSON.stringify(r.urls)),
      /* 🔴 THE STORED LIST IS CAPPED, AND THE RECORD SAYS SO.
       * almioet's sitemap carries 240,328 URLs; storing them all would put ~20 MB
       * of somebody else's URL list in git. The cap is a BOUND on the stored
       * evidence, and a later reader must not mistake `urls.length` for the real
       * total (LAW-BOUND-1). */
      value: {
        ...r,
        urls: r.urls.slice(0, 20000),
        urlsTotal: r.urls.length,
        urlsStored: Math.min(20000, r.urls.length),
        storageBound: 20000,
        storageNote:
          r.urls.length > 20000
            ? `only the first 20,000 of ${r.urls.length} sitemap URLs are stored; the contradiction check ran on ALL ${r.urls.length} at collection time`
            : "all sitemap URLs are stored",
      },
      collector: "bin/audit-technical.mjs", collector_version: "1",
    });
    pendingSitemapObservations.push(obs);
    if (!permission.mayWrite) wouldWrite.sitemapObservations += 1;
    r.observationId = obs.observation_id;
    console.log(
      `  ${host.padEnd(30)} urls=${String(r.urls.length).padStart(6)}  children ${r.childrenFetched}/${r.childrenTotal ?? "?"}` +
        `  skipped=${r.childrenSkipped ?? "?"}  requests=${r.requests}  coverage=${r.coverageState}`,
    );
  }
  console.log(`  🔴 ${totalRequests} requests issued in total — sitemap discovery files only. This is not a crawl.\n`);
} else {
  for (const r of sitemapStore.readAll()) {
    if (r.record_type === "observation") sitemapByHost.set(r.value.origin.replace("https://", ""), { ...r.value, observationId: r.observation_id });
  }
  console.log(`PART 2 — SITEMAPS: reading ${sitemapByHost.size} stored sitemap observation(s). Pass --sitemaps to re-read.\n`);
}

const robotsByHost = new Map();
for (const r of robotsRecords) if (r.record_type === "observation") robotsByHost.set(r.value.host, r);

const impressions = new Map();
for (const r of evidence) {
  if (r.method !== "gsc.searchAnalytics.query:page-rows") continue;
  for (const row of r.value.rows) impressions.set(row.url, row.impressions);
}

/* ---- run every check ---------------------------------------------------- */
/* The bare mkdir is gone rather than gated — the boundary's prepare step creates the directory it writes into. */
const store = createJsonlStore(out);
const writes = { appended: 0, resighted: 0 };
const tally = {};
const bump = (id, v) => {
  tally[id] = tally[id] ?? { FAIL: 0, UNKNOWN: 0, silent: 0 };
  if (v) tally[id][v] += 1;
  else tally[id].silent += 1;
};

const CHECKS = [STATUS_AND_REDIRECTS, HTTPS_ONLY, CANONICAL, NOINDEX, HEAD_ELEMENTS, BROKEN_INTERNAL_LINK, QUERY_PARAMETERS, INDEXABILITY_PREFLIGHT];

for (const p of pages) {
  const host = new URL(p.canonical).hostname;
  const robotsObs = robotsByHost.get(host);
  const head = p.html ? parseHead(p.html) : null;
  const xr = p.o.value.response_headers_subset?.["x-robots-tag"] ?? null;
  const ni = head ? noindexState({ metaRobots: head.metaRobots, xRobotsTag: xr }) : null;

  let robotsAllowed;
  if (robotsObs?.value?.body) {
    robotsAllowed = decide(selectGroup(parseGroups(robotsObs.value.body), "Googlebot"), p.canonical).allowed;
  }
  const sm = sitemapByHost.get(host);
  const inSitemap = sm ? sm.urls.includes(p.canonical) || sm.urls.includes(p.canonical + "/") : undefined;
  const m = p.html ? measure(p.html) : null;

  const ctx = {
    openedAt,
    bodyHtml: p.html,
    statusByUrl,
    titleCounts,
    outboundLinks: outboundByPage.get(p.canonical),
    inboundCount: p.html ? inbound.get(p.canonical) : null,
    robotsObservation: robotsObs,
    sitemapUrls: sm?.urls,
    sitemapObservationId: sm?.observationId,
    impressions: impressions.get(p.canonical) ?? impressions.get(p.canonical + "/") ?? null,
    preflightInputs: {
      status: p.o.value.status,
      robotsAllowed,
      noindexed: ni ? ni.noindexed : undefined,
      canonicalOk: head ? Boolean(head.canonical) : undefined,
      inSitemap,
      hasContent: m ? m.confident && m.bodyWordCount > 0 : undefined,
    },
  };
  const page = { canonical_url: p.canonical, page_id: targetPageId(p.canonical) };

  for (const check of [...CHECKS, SITEMAP_VS_ROBOTS]) {
    const f = await check.run({ page, observations: [p.o], siteContext: ctx });
    if (f === null) {
      bump(check.id, null);
      continue;
    }
    // 🔴 appendIfNew, not append: this job run twice stored 868 issues twice
    // (12 Sep 2026). The same finding is now one record plus a re-sighting.
    pendingFindings.push(f);
    if (!permission.mayWrite) wouldWrite.findings += 1;
    bump(check.id, f.verdict);
  }
}

/* ---- the two governed writes, before anything is reported ---------------- */

for (const [target, records, action] of [
  [sitemapStore, pendingSitemapObservations, "APPEND_SITEMAP_OBSERVATIONS"],
  [store, pendingFindings, "APPEND_TECHNICAL_AUDIT_FINDINGS"],
]) {
  const args = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store: target, records, targetClass: "RUN_EVIDENCE",
    action, occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: openedAt,
  });
  const governed = executeGovernedWrite(args);
  if (governed.outcome !== "REFUSED" && governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${governed.outcome} — ${action} was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
  /* The store still decides appended-versus-re-sighted, and the run still reports its answer. */
  if (action === "APPEND_TECHNICAL_AUDIT_FINDINGS") {
    for (const w of args.adapter.result ?? []) writes[w?.appended ? "appended" : "resighted"] += 1;
  }
}

/* ---- report ------------------------------------------------------------- */
console.log("=== ITEM 10 SUB-CHECKS + ITEM 38, over the 394 pages ===");
for (const [id, t] of Object.entries(tally)) {
  console.log(`  ${id.padEnd(28)} FAIL=${String(t.FAIL).padStart(4)}  UNKNOWN=${String(t.UNKNOWN).padStart(4)}  silent=${String(t.silent).padStart(4)}`);
}

if (!permission.mayWrite) {
  console.log(`\n[dry-run] would have written ${wouldWrite.findings} finding(s) → ${out}` +
    (wouldWrite.sitemapObservations ? ` and ${wouldWrite.sitemapObservations} sitemap observation(s) → ${REPO}runs/evidence/sitemaps.jsonl` : "") +
    " — nothing written, --confirm to write");
}

console.log("\n=== 🔴 STRUCTURALLY UNKNOWN IN v0.1 — NOT MEASURED, NOT APPROXIMATED ===");
for (const [k, v] of Object.entries(STRUCTURALLY_UNKNOWN)) {
  console.log(`  ${k}: UNKNOWN (${v.reasonCode})`);
  console.log(`     ${v.why}`);
}

if (sitemapByHost.size) {
  console.log("\n=== PART 2 — SITEMAP ADVERTISES A URL ROBOTS FORBIDS ===");
  for (const [host, sm] of sitemapByHost) {
    const rb = robotsByHost.get(host)?.value?.body;
    if (!rb) {
      console.log(`  ${host.padEnd(30)} UNKNOWN — no stored robots.txt for this host`);
      continue;
    }
    const c = contradictions({ sitemapUrls: sm.urls, robotsBody: rb });
    const imp = c.blocked.reduce((n, b) => n + (impressions.get(b.url) ?? 0), 0);
    console.log(
      `  ${host.padEnd(30)} ${String(c.blocked.length).padStart(6)} of ${String(c.checked).padStart(6)} sitemap URLs are ` +
        `DISALLOWED for Googlebot   impressions=${imp}   [coverage ${sm.coverageState}: ${sm.why}]`,
    );
  }
}

console.log("\n=== EVERY CHECK, AND ITS CONTROL ===");
for (const c of registeredChecks()) console.log(`  ${c.id.padEnd(30)} fires: ${c.firingFixture.slice(0, 60)}…`);
console.log(`\nwritten: ${out}  (${store.count()} records) — this run: ${writes.appended} new issue(s), ${writes.resighted} re-sighting(s)`);
console.log("🔴 Nothing was fixed. No product repository was touched.");
