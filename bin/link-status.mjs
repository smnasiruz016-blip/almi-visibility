#!/usr/bin/env node
/**
 * F23 · THE BOUNDED LINK-STATUS CHECK of one client's own pages in one research batch (F23 Acceptance Amendment 2, C8; the owner's GREEN
 * of 14 October 2026 for this check and for nothing else).
 *
 *   node bin/link-status.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id> [--live --confirm]
 *
 * WITHOUT --live: the plan is printed (counts only) and NO request is made. --live without --confirm opens nothing that can request
 * (F78: the metered connector refuses before any request when the run cannot record its cost). WITH both: one GET for each distinct address the links of
 * the batch's own built and live pages point at, the hops their redirects name and each host's robots file — never repeated, paced per
 * host, robots respected, at most the declared number of requests; and NO request at all when the distinct addresses outnumber that
 * number. A refused request is NOT MEASURED with its reason — never BROKEN. Written, through the governed boundary, into the batch's own
 * stores: the observations (link-status.jsonl) and the body of each of the client's own live pages as answered (live-pages.jsonl).
 * The connector is the client's declared LINK_DESTINATIONS connector, and it must reach this batch. Counts only are printed.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { canon } from "../src/audit/link-audit-reader.mjs";
import { clientPages } from "../src/audit/built-page-links.mjs";
import { planLinkCheck, checkLinks, observationRecord, liveReadRecord, pacingOf, REFUSAL } from "../src/audit/link-status.mjs";
import { POPULATION, STATE } from "../src/audit/page-links.mjs";
import { LINK_CHECK, LINK_CHECK_OWNER_CEILING } from "../config/audit/link-rules.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "LINK_DESTINATIONS";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
/* RR-271 §4: a run may be given a higher request limit, never above the owner's ceiling; every other bound stands */
const MAX = arg("max-requests");
const LIMITS = Object.freeze({ ...LINK_CHECK, maxRequests: MAX === null ? LINK_CHECK.maxRequests : Number(MAX) });
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || !(Number.isInteger(LIMITS.maxRequests) && LIMITS.maxRequests >= 1 && LIMITS.maxRequests <= LINK_CHECK_OWNER_CEILING && (MAX === null || /^\d+$/.test(MAX)))) { console.error(`usage: node bin/link-status.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--max-requests=1..${LINK_CHECK_OWNER_CEILING}] [--live --confirm] — nothing read, no request, nothing written`); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const live = process.argv.includes("--live");
const SCOPE = scopedEntryPoint({ entry: "bin/link-status.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/link-status.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; no request was made`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store; no request was made"); process.exit(3); }
const rows = (name) => (existsSync(join(batchDir, name)) ? createJsonlStore(join(batchDir, name)).readAll() : []);
const hosts = [...declaredSiteHosts({ tenantId: SCOPE.tenantId })].sort();
const population = clientPages({ batches: [{ batchId: BATCH, builds: rows("joined-pages.jsonl"), decisions: rows("built-page-needs.jsonl"), reads: rows("live-pages.jsonl") }], tenantId: SCOPE.tenantId, hosts });
/* the client's own live pages are read at their own address; every page's links are planned from its stored body */
const livePages = population.pages.filter((p) => p.population === POPULATION.LIVE);
const liveAddresses = new Map(livePages.map((p) => [canon(p.canonical), p]).filter(([u]) => u !== null));
const plan = planLinkCheck({ pages: population.pages, canon });
const urls = [...new Set([...liveAddresses.keys(), ...plan.urls])].sort();
const hostCount = new Set(urls.map((u) => new URL(u).host)).size;

console.log("F23 · LINK-STATUS CHECK — this client's own pages in this batch · counts only");
console.log(`  pages            BUILT, NOT YET PUBLISHED ${population.counts.built} · LIVE ${population.counts.live} (their own addresses are read: ${liveAddresses.size}) · published on a host this client does not declare ${population.counts.publishedElsewhere} (never requested)`);
console.log(`  plan             ${plan.occurrences} link occurrence(s) · ${urls.length} distinct address(es) on ${hostCount} host(s) · not a web address ${plan.notHttp} (never requested)`);
console.log(`  bound            at most ${LIMITS.maxRequests} request(s) in this run — robots files and redirect hops count · one ${LINK_CHECK.method} for each distinct address, never repeated · at least ${LINK_CHECK.sameHostIntervalMs} ms between two requests to one host · each host's robots file respected · at most ${LINK_CHECK.maxHops} hop(s) per chain · ${LINK_CHECK.timeoutMs} ms per request`);
/* 🔴 C8: no request at all when the distinct addresses outnumber the limit — decided before the connector is opened */
if (urls.length > LIMITS.maxRequests) { console.error(`🔴 REFUSED — ${REFUSAL.TOO_MANY}: ${urls.length} distinct address(es) against a limit of ${LIMITS.maxRequests}. NO REQUEST WAS MADE.`); process.exit(3); }
if (!live) { console.log("  NOT RUN — no --live: the plan only; no request was made and nothing was written"); process.exit(0); }
if (urls.length === 0) { console.log("  nothing to check — this batch holds no built or live page with a link to a web address; no request was made"); process.exit(0); }
/* the declared connector must reach THIS batch: a connector declared for another batch's pages is not this run's */
const declared = lookupConnector(index, SUBJECT, KIND);
if (declared.state !== "DECLARED" || !(declared.connector.reaches ?? []).some((x) => x.resourceKind === "RESEARCH_BATCH" && x.resourceRef === BATCH)) { console.error("🔴 REFUSED — LINK_DESTINATIONS_CONNECTOR_DOES_NOT_REACH_THIS_BATCH: the client declares no such connector for this batch. NO REQUEST WAS MADE."); process.exit(3); }

const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
const run = await checkLinks({ urls, fetchImpl: CONNECTOR.fetch, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), clock: () => performance.now(), bodiesFor: new Set(liveAddresses.keys()), limits: LIMITS });
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const runId = `link-status:${instant}`;
const observations = run.observations.map((observation) => observationRecord({ observation, tenantId: SCOPE.tenantId, on: ON, run: runId }));
const reads = [...run.bodies].map(([url, html]) => liveReadRecord({ pageId: liveAddresses.get(url).pageId, url: liveAddresses.get(url).canonical, html, tenantId: SCOPE.tenantId, on: ON, run: runId }));
const tally = (xs, key) => Object.entries(xs.reduce((m, x) => ((m[x[key] ?? "-"] = (m[x[key] ?? "-"] ?? 0) + 1), m), {})).sort().map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
const pacing = pacingOf(run.log);
console.log(`  requests         ${run.requests} made of a limit of ${run.limit} (robots ${run.log.filter((l) => l.kind === "robots").length} · addresses and hops ${run.log.filter((l) => l.kind === "page").length}) · hosts ${pacing.hosts} · smallest gap between two requests to one host ${pacing.smallestGapMs === null ? "none (one request per host)" : `${Math.round(pacing.smallestGapMs)} ms`} · gaps under ${LINK_CHECK.sameHostIntervalMs} ms: ${pacing.underTheInterval} of ${pacing.gaps}`);
console.log(`  destinations     ${run.observations.length} of ${urls.length} classed: ${tally(run.observations, "state")} · redirect chains ${run.observations.filter((o) => o.hops > 0).length} (hops in all ${run.observations.reduce((n, o) => n + o.hops, 0)}, longest ${Math.max(0, ...run.observations.map((o) => o.hops))})`);
console.log(`  NOT MEASURED     ${run.observations.filter((o) => o.state === STATE.NOT_MEASURED).length} of ${run.observations.length}: ${tally(run.observations.filter((o) => o.state === STATE.NOT_MEASURED), "reason")} — a refused request is never BROKEN and is never retried`);
console.log(`  live pages read  ${reads.length} of ${liveAddresses.size} (the links of a page read in this run are checked from its stored read on the next run)`);

const append = (records, file) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_LINK_STATUS", occurredAt: instant, correlationId: `run:link-status:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
const kept = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
const g = append(observations, "link-status.jsonl");
if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the observations did NOT persist`); process.exit(1); }
if (reads.length) { const h = append(reads, "live-pages.jsonl"); if (!kept(h)) { console.error(`  🔴 ${h.outcome} — the live-page reads did NOT persist`); process.exit(1); } }
console.log(`  kept             ${observations.length} observation(s) in the batch's link-status store · ${reads.length} live-page read(s) in its live-pages store`);
