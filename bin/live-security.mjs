#!/usr/bin/env node
/**
 * F27 · SECURITY AND TRANSPORT ON THE CLIENT'S LIVE PAGES (Acceptance Amendment 3, _handoffs 7b9a992; the owner's GREEN of 16 Oct 2026 for
 * read-only requests to the LIVE pages, their http: forms and the robots file, at most 60 in all, at least 2 s apart, no retries).
 *
 *   node bin/live-security.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id> [--max-requests=1..60] [--live --confirm]
 *
 * The population is the client's pages the engine built and recorded as published (LIVE), in this research batch — no crawl batch.
 * WITHOUT --live: the plan (counts only) and, from the batch's stored reads, the audit; NO request. WITH --live --confirm: through the
 * client's declared PUBLIC_SITE connector (src/tenancy/connectors.mjs — the one paced path, at least 2 s per host), ONE GET of each LIVE page's
 * https address and ONE of its http: form, no redirect followed, and ONE of the robots file — never retried, and NO request at all when they
 * would outnumber the limit (default and ceiling 60, the GREEN's). What each answered — status, Location, response headers, body, the TLS
 * facts — is appended, through the governed boundary, to the batch's live-security.jsonl; then the stored reads are audited (src/audit/
 * live-security.mjs). Nothing is written to the site. Counts only are printed.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { clientPages } from "../src/audit/built-page-links.mjs";
import { POPULATION } from "../src/audit/page-links.mjs";
import { auditLive, LIVE_SECURITY_RECORD } from "../src/audit/live-security.mjs";
import { LIVE_HEADER_BASELINE, LIVE_CHECK_CEILING } from "../config/security/live-header-baseline.mjs";
import { PUBLIC_EXPOSURE_DECLARATION } from "../config/security/public-exposure-declaration.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "PUBLIC_SITE";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on"), MAX = arg("max-requests");
const LIMIT = MAX === null ? LIVE_CHECK_CEILING : Number(MAX);
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || !(MAX === null || /^\d+$/.test(MAX)) || !(Number.isInteger(LIMIT) && LIMIT >= 1 && LIMIT <= LIVE_CHECK_CEILING)) { console.error(`usage: node bin/live-security.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--max-requests=1..${LIVE_CHECK_CEILING}] [--live --confirm] — nothing read, no request, nothing written`); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const live = process.argv.includes("--live");
const SCOPE = scopedEntryPoint({ entry: "bin/live-security.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/live-security.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; no request was made`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store; no request was made"); process.exit(3); }
const rows = (name) => (existsSync(join(batchDir, name)) ? createJsonlStore(join(batchDir, name)).readAll() : []);
const hosts = [...declaredSiteHosts({ tenantId: SCOPE.tenantId })].sort();
const population = clientPages({ batches: [{ batchId: BATCH, builds: rows("joined-pages.jsonl"), decisions: rows("built-page-needs.jsonl"), reads: [] }], tenantId: SCOPE.tenantId, hosts });
const livePages = population.pages.filter((p) => p.population === POPULATION.LIVE);
const robotsUrl = livePages.length ? `${new URL(livePages[0].canonical).origin}/robots.txt` : null;
const planned = livePages.length ? livePages.length * 2 + 1 : 0;

console.log("F27 · SECURITY AND TRANSPORT — this client's LIVE pages in this batch · counts only");
console.log(`  pages            LIVE ${livePages.length} · built and not published ${population.counts.built} (not this check's) · published on a host this client does not declare ${population.counts.publishedElsewhere} (never requested)`);
console.log(`  plan             ${planned} request(s): each LIVE page's https address and its http: form, and the robots file once · GET only · no redirect followed · no retry · at least 2000 ms between two requests to one host`);
console.log(`  bound            at most ${LIMIT} request(s) in this run`);
if (planned > LIMIT) { console.error(`🔴 REFUSED — REQUESTS_OUTNUMBER_THE_LIMIT: ${planned} planned against a limit of ${LIMIT}. NO REQUEST WAS MADE.`); process.exit(3); }

const stamp = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 24);
if (live) {
  if (planned === 0) { console.log("  nothing to read — this batch holds no LIVE page; no request was made"); process.exit(0); }
  const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
  const read = async (url) => { RUN_COST.noteRequests(KIND, 1); return CONNECTOR.readTransport(url); };
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const runId = `live-security:${instant}`;
  const out = [];
  for (const p of livePages) {
    const https = await read(p.canonical);
    const http = await read(`http:${p.canonical.slice(6)}`);
    out.push({ pageId: p.pageId, url: p.canonical, https, http });
  }
  const robots = await read(robotsUrl);
  const records = [...out.map((r) => ({ record_type: LIVE_SECURITY_RECORD, kind: "PAGE", tenantId: SCOPE.tenantId, pageId: r.pageId, url: r.url, readOn: ON, run: runId,
    read: r.https.error ? { error: r.https.error } : { finalUrl: r.https.status >= 200 && r.https.status < 300 ? r.url : null, status: r.https.status, location: r.https.location, headers: r.https.headers, tls: r.https.tls, body: r.https.body, truncated: r.https.truncated },
    http: r.http.error ? { error: r.http.error } : { status: r.http.status, location: r.http.location } })),
  { record_type: LIVE_SECURITY_RECORD, kind: "ROBOTS", tenantId: SCOPE.tenantId, url: robotsUrl, readOn: ON, run: runId, read: robots.error ? { error: robots.error } : { status: robots.status, body: robots.body, truncated: robots.truncated } }]
    .map((r) => ({ ...r, measurement_key: `${LIVE_SECURITY_RECORD}:${stamp([r.kind, r.url, r.run])}`, recorded_at: `${ON}T00:00:00Z` }));
  const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "live-security.jsonl")), records,
    targetClass: "GENERATED_CONFIG", action: "APPEND_LIVE_SECURITY_READS", occurredAt: instant, correlationId: `run:live-security:${instant}`, discipline: "APPEND_IF_NEW" }));
  if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the reads did NOT persist`); process.exit(1); }
  console.log(`  requests         ${RUN_COST.requests()} made of a limit of ${LIMIT} · errors ${[...out.flatMap((r) => [r.https, r.http]), robots].filter((x) => x.error).length} (never retried)`);
  console.log(`  kept             ${records.length} read(s) in the batch's live-security store`);
} else console.log("  NOT RUN — no --live: no request was made and nothing was written; the audit below reads the batch's stored reads");

/* the audit, from the STORED reads only: the latest of each LIVE page and of the robots file */
const stored = rows("live-security.jsonl").filter((r) => r?.record_type === LIVE_SECURITY_RECORD && r.tenantId === SCOPE.tenantId);
const lastOf = (pred) => stored.filter(pred).at(-1) ?? null;
const pages = livePages.map((p) => { const r = lastOf((x) => x.kind === "PAGE" && x.pageId === p.pageId && x.url === p.canonical); return { pageId: p.pageId, url: p.canonical, read: r && !r.read?.error ? r.read : null, http: r && !r.http?.error ? r.http : null }; });
const robotsRead = lastOf((x) => x.kind === "ROBOTS" && x.url === robotsUrl);
const a = auditLive({ pages, robots: robotsRead && !robotsRead.read?.error ? { url: robotsRead.url, status: robotsRead.read.status, body: robotsRead.read.body } : null, headerDeclaration: LIVE_HEADER_BASELINE, exposureDeclaration: PUBLIC_EXPOSURE_DECLARATION, on: ON });
const p = a.parts;
const t = (x) => `PASS ${x.PASS} · FAIL ${x.FAIL} · NOT MEASURED ${x["NOT MEASURED"]}`;
console.log(`  HTTPS: HTTPS ${p.https.https} · NOT HTTPS ${p.https.notHttps} of ${p.https.of} page(s) · http: redirect ${t(p.https.redirect)} · TLS ${t(p.https.tls)} — ${p.https.verdict}`);
console.log(`  MIXED CONTENT: http: references ${p.mixedContent.references} of ${p.mixedContent.referencesSeen} on ${p.mixedContent.pagesRead} of ${p.mixedContent.of} HTTPS page(s) read · pages running script ${p.mixedContent.pagesRunningScript} — ${p.mixedContent.verdict}`);
console.log(`  UNSAFE FORMS: unencrypted submissions ${p.unsafeForms.submissions} (forms seen ${p.unsafeForms.formsSeen}) · password inputs on NOT HTTPS pages ${p.unsafeForms.passwordsOnNotHttps} · on ${p.unsafeForms.pagesRead} of ${p.unsafeForms.of} page(s) — ${p.unsafeForms.verdict}`);
console.log(`  HEADERS (declared by ${p.headers.declaredBy}) — ${p.headers.verdict}`);
for (const h of p.headers.per ?? []) console.log(`    ${h.name}: ${t(h)} · NOT APPLICABLE ${h["NOT APPLICABLE"]} of ${h.of}`);
if (p.headers.csp) console.log(`    content-security-policy: enforced on ${p.headers.csp.enforced} · report-only on ${p.headers.csp.reportOnly} of ${p.headers.csp.of} — ${p.headers.csp.verdict}`);
console.log(`  PUBLIC EXPOSURE (the owner's declaration of 3 Oct 2026): ${p.publicExposure.exposures} of ${p.publicExposure.responses} recorded response(s) · outside: ${p.publicExposure.outside} — ${p.publicExposure.verdict}`);
console.log(`  population       ${a.incomplete ? `INCOMPLETE — absent: ${a.absent.join(" · ")}` : `COMPLETE — ${a.read} of ${a.pages} LIVE page(s) read`}`);
console.log(`  verdict          ${a.verdict}`);
