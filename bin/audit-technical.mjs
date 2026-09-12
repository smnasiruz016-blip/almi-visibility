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

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const corpusDir = arg("corpus", null);
const doSitemaps = flag("sitemaps");
const out = arg("out", `${REPO}runs/audit/technical-findings.jsonl`);
const openedAt = new Date().toISOString();

const crawl = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
const evidence = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
const robotsRecords = createJsonlStore(`${REPO}runs/evidence/robots.jsonl`).readAll();

const fetched = crawl.filter((r) => r.record_type === "observation" && !r.value?.skipped);
const haveCorpus = corpusDir && existsSync(corpusDir);

console.log(`corpus  : ${haveCorpus ? corpusDir : "🔴 NOT AVAILABLE"}`);
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
  const file = haveCorpus ? join(corpusDir, `${o.observation_id}.html`) : null;
  const html = file && existsSync(file) ? readFileSync(file, "utf8") : null;
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

const outboundByPage = new Map();
const inbound = new Map(pages.map((p) => [p.canonical, 0]));
const known = new Set(pages.map((p) => p.canonical));
let edgesTotal = 0;
for (const p of pages) {
  if (!p.html) continue;
  const links = [];
  for (const to of extractLinks(p.html, p.canonical)) {
    edgesTotal += 1;
    let c;
    try {
      c = canonicalUrl(to);
    } catch {
      continue;
    }
    if (new URL(c).hostname !== new URL(p.canonical).hostname) continue;
    links.push(c);
    if (known.has(c) && c !== p.canonical) inbound.set(c, (inbound.get(c) ?? 0) + 1);
  }
  outboundByPage.set(p.canonical, [...new Set(links)]);
}
const orphans = [...inbound.values()].filter((n) => n === 0).length;
console.log(`0B — EDGES RESTORED FROM THE ARTIFACT: ${edgesTotal} links, ${[...inbound.values()].reduce((a, b) => a + b, 0)} internal inbound.`);
console.log(`     pages with zero inbound links inside the crawled set: ${orphans}  (was 340 UNKNOWN with an empty graph)\n`);

/* ---- PART 2 — sitemaps, bounded ---------------------------------------- */
const SITEMAP_HOSTS = [
  "almiitalian.almiworld.com", "almidutch.almiworld.com",
  "almiportuguese.almiworld.com", "almiicelandic.almiworld.com", "almioet.almiworld.com",
];
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
      value: { ...r, urls: r.urls.slice(0, 20000) },
      collector: "bin/audit-technical.mjs", collector_version: "1",
    });
    sitemapStore.appendIfNew(obs);
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
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
const store = createJsonlStore(out);
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
    store.append(f);
    bump(check.id, f.verdict);
  }
}

/* ---- report ------------------------------------------------------------- */
console.log("=== ITEM 10 SUB-CHECKS + ITEM 38, over the 394 pages ===");
for (const [id, t] of Object.entries(tally)) {
  console.log(`  ${id.padEnd(28)} FAIL=${String(t.FAIL).padStart(4)}  UNKNOWN=${String(t.UNKNOWN).padStart(4)}  silent=${String(t.silent).padStart(4)}`);
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
console.log(`\nwritten: ${out}  (${store.count()} records)`);
console.log("🔴 Nothing was fixed. No product repository was touched.");
