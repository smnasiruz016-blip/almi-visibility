#!/usr/bin/env node
/**
 * 🔴 F22 · JAVASCRIPT RENDERING AUDIT OF THE CLIENT'S BUILT PAGES — source against render, count-only (F22 Acceptance Amendment 1,
 * _handoffs df82cbe; the owner's overnight command and GREEN of 16 Oct 2026).
 *
 *   node bin/render-built-pages.mjs --subject=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id>                    the audit of the stored renders
 *   node bin/render-built-pages.mjs … --render --confirm                                                         OFFLINE renders, stored
 *   node bin/render-built-pages.mjs … --live --confirm [--max-requests=1..100]                                   LIVE renders, stored
 *
 * THE POPULATION: every page the engine built for this client, in each research batch it DECLARES (no batch, no date is a default):
 * - OFFLINE: each page as published (re-made from its build at its recorded address; its sha256 must equal the one recorded at publication)
 *   or, before publication, as built — served locally from 127.0.0.1 with the files its own record names (each read from the client's
 *   declared root, and served only when its bytes match the recorded sha256). Every other request is refused.
 * - LIVE: each page recorded as published, at its address, through the client's declared PUBLIC_SITE connector and the bounded same-origin
 *   policy (src/render/same-origin-policy.mjs) under the owner's GREEN (config/audit/live-render-green.mjs; RR-272): the pages and their
 *   own same-origin subresources, at most 100 requests in the run, at least 2 s apart, no retry, robots obeyed; a subresource on any other
 *   origin is THIRD_PARTY — refused, recorded by host in the stored render, never requested. NO request without --confirm.
 * Each render — the source document read with JavaScript off and the rendered DOM, with their visible texts and the render's state — is
 * appended, through the governed boundary, to its batch's built-page-renders.jsonl. The audit (src/render/built-page-render.mjs) is made
 * from the stored renders only. Nothing is written to the site. Output: counts with their denominators — no host, URL or page content.
 * Generic: nothing here names a client, host, product or path shape.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { RENDER_BOUNDS, loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { createSameOriginPolicy, greenSubresources, LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";
import { renderJobs, offlineFiles, auditRenders, RENDER_READ_RECORD, MODE } from "../src/render/built-page-render.mjs";
import { DIMENSIONS, NOT_MEASURED } from "../src/audit/render-compare.mjs";
import { LIVE_RENDER_GREEN } from "../config/audit/live-render-green.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "PUBLIC_SITE";
const STORE_FILE = "built-page-renders.jsonl";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), ON = arg("on"), MAX = arg("max-requests");
const LIMIT = MAX === null ? LIVE_RENDER_GREEN.maxRequests : Number(MAX);
const live = process.argv.includes("--live"), render = process.argv.includes("--render");
if (!SUBJECT || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || (live && render) || !(MAX === null || /^\d+$/.test(MAX)) || !(Number.isInteger(LIMIT) && LIMIT >= 1 && LIMIT <= LIVE_RENDER_GREEN.maxRequests)) { console.error(`usage: node bin/render-built-pages.mjs --subject=<id> --on=YYYY-MM-DD [--render --confirm | --live --confirm [--max-requests=1..${LIVE_RENDER_GREEN.maxRequests}]] — nothing read, no request, nothing written`); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
/* the research batches the client DECLARES — read from its declaration, never from a default */
const index = rootIndexFor(process.env);
const BATCHES = (lookupSubject(index, SUBJECT).entry?.members ?? []).filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
const SCOPE = scopedEntryPoint({ entry: "bin/render-built-pages.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), ...BATCHES.map((b) => RESOURCES.researchBatch(b)), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/render-built-pages.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; nothing rendered, no request`); process.exit(3); }
/* every read below is of one of THIS client's declared batches, inside the RESEARCH store the gate decided */
const rows = (batch, name) => { const file = join(lookupStore(index, "RESEARCH").dir, batch, name); return existsSync(file) ? createJsonlStore(file).readAll() : []; };
const subject = lookupSubject(index, SUBJECT);
/* a file a page's record names is read from THIS subject's declared root only — a relative name with no step outside it */
const assetBytes = (file) => { if (typeof file !== "string" || !/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(file) || file.split("/").includes("..")) return null; const f = join(subject.dir, ...file.split("/")); return existsSync(f) ? readFileSync(f) : null; };
const batches = BATCHES.map((batchId) => ({ batchId, builds: rows(batchId, "joined-pages.jsonl"), decisions: rows(batchId, "built-page-needs.jsonl") }));
const hosts = [...declaredSiteHosts({ tenantId: SCOPE.tenantId })].sort();
const jobs = renderJobs({ batches, tenantId: SCOPE.tenantId, hosts, assetBytes });
const batchOf = new Map(batches.flatMap((b) => b.builds.map((r) => [r.value, b.batchId])));

console.log("F22 · JAVASCRIPT RENDERING AUDIT — this client's built pages · source against render · count-only");
console.log(`  population   OFFLINE ${jobs.offline.length} page(s) (LIVE ${jobs.counts.live} as published, BUILT ${jobs.counts.built} as built; not servable as they stand ${jobs.offline.filter((j) => j.refused).length}) · LIVE ${jobs.live.length} page(s) · published on a host this client does not declare ${jobs.counts.publishedElsewhere} (never requested) · research batch(es) declared ${BATCHES.length}`);
if (live) console.log(`  bound        at most ${LIMIT} request(s) in this run (the GREEN's ${LIVE_RENDER_GREEN.maxRequests}) · at least ${LIVE_RENDER_GREEN.intervalMs} ms between two requests · no retry · GET only · the declared origin only${LIVE_RENDER_GREEN.pagesOnly !== false ? " · the LIVE page addresses and the robots file only: a page's subresources are outside the GREEN and refused, never requested" : ""}${LIVE_RENDER_GREEN.sameOriginOnly !== false ? " · a subresource on any origin but its page's own is THIRD_PARTY: refused and recorded by host, never requested" : ""}`);

const stamp = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 24);
if (live || render) {
  if (!process.argv.includes("--confirm")) { console.error("🔴 REFUSED — NO_CONFIRM: a render run stores what it saw and needs --confirm. NOTHING WAS RENDERED AND NO REQUEST WAS MADE."); process.exit(3); }
  const targets = live ? jobs.live : jobs.offline;
  if (targets.length === 0) { console.log(`  nothing to render — this client has no ${live ? "LIVE" : "built"} page; no request was made`); process.exit(0); }
  if (live && targets.length + 1 > LIMIT) { console.error(`🔴 REFUSED — REQUESTS_OUTNUMBER_THE_LIMIT: ${targets.length + 1} (each page's document and the robots file) against a limit of ${LIMIT}. NO REQUEST WAS MADE.`); process.exit(3); }
  let CONNECTOR = null, policy = null;
  if (live) {
    CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
    if (targets.some((t) => !CONNECTOR.admits(t.url))) { console.error("🔴 REFUSED — a LIVE page is not on a site origin the subject declares. NO REQUEST WAS MADE."); process.exit(3); }
    policy = createSameOriginPolicy({ fetchImpl: CONNECTOR.fetch, admits: CONNECTOR.admits, bounds: Object.freeze({ ...LIVE_RENDER_BOUNDS, maxTotalRequests: LIMIT, intervalMs: Math.max(LIVE_RENDER_BOUNDS.intervalMs, LIVE_RENDER_GREEN.intervalMs), retries: LIVE_RENDER_GREEN.retries }) });
  }
  const pw = await loadPlaywright();
  if (pw.unavailable) { console.log(`  ${NOT_MEASURED} — no renderer here: ${pw.unavailable}; nothing stored`); process.exit(1); }
  const bounds = live ? Object.freeze({ ...RENDER_BOUNDS, perPageTimeoutMs: LIVE_RENDER_BOUNDS.perPageTimeoutMs }) : RENDER_BOUNDS;
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const runId = `built-page-render:${live ? "live" : "offline"}:${instant}`;
  const { browser } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
  const documents = new Map();
  const server = await startDocumentServer(documents);
  const egress = [];
  const reads = [];
  const read = (t, o) => reads.push({ record_type: RENDER_READ_RECORD, mode: live ? MODE.LIVE : MODE.OFFLINE, tenantId: SCOPE.tenantId, pageId: t.pageId, url: live ? t.url : t.documentUrl, readOn: ON, run: runId, ...o });
  try {
    for (const t of targets.slice(0, bounds.maxPages)) {
      const id = stamp([t.pageId]);
      if (!live) {
        if (t.refused) { read(t, { renderState: "FAILED", reason: `the page was never served: ${t.refused}` }); continue; }
        documents.set(id, { body: t.html, status: 200, contentType: "text/html; charset=utf-8" });
        const rendered = await renderDocument({ browser, origin: server.origin, id, documentUrl: t.documentUrl, egress, bounds, readVisibleText: true, subresources: offlineFiles(t) });
        const source = await renderDocument({ browser, origin: server.origin, id, documentUrl: t.documentUrl, egress, bounds, readVisibleText: true, javaScriptEnabled: false, subresources: offlineFiles(t) });
        read(t, { renderState: rendered.renderState, reason: rendered.reason, requests: rendered.requests, sourceHtml: t.html, renderedHtml: rendered.html, sourceText: source.visibleText, renderedText: rendered.visibleText });
        continue;
      }
      const pp = policy.forPage();
      const doc = await pp.resolve(t.url);
      if (!doc.served || doc.status < 200 || doc.status >= 300) { read(t, { renderState: "FAILED", reason: `the live document was not served: ${doc.served ? `HTTP_${doc.status}` : doc.refusal}` }); continue; }
      const sourceHtml = doc.body.toString("utf8");
      documents.set(id, { body: sourceHtml, status: doc.status, contentType: doc.contentType ?? "text/html" });
      const rendered = await renderDocument({ browser, origin: server.origin, id, documentUrl: t.url, egress, bounds, readVisibleText: true, subresources: greenSubresources({ green: LIVE_RENDER_GREEN, pageUrl: t.url, resolve: pp.resolve }) });
      const source = await renderDocument({ browser, origin: server.origin, id, documentUrl: t.url, egress, bounds, readVisibleText: true, javaScriptEnabled: false, subresources: (u) => pp.cacheOnly(u) });
      /* the render's requests, by host and outcome, are stored with it: a THIRD_PARTY refusal is named by its host there, never requested */
      read(t, { renderState: rendered.renderState, reason: rendered.reason, requests: rendered.requests, sourceHtml, renderedHtml: rendered.html, sourceText: source.visibleText, renderedText: rendered.visibleText });
    }
  } finally { await browser.close(); await server.close(); }
  /* each page's render is appended to its own batch's store, through the governed boundary */
  for (const batchId of [...new Set(reads.map((r) => batchOf.get(r.pageId)))]) {
    const records = reads.filter((r) => batchOf.get(r.pageId) === batchId).map((r) => ({ ...r, measurement_key: `${RENDER_READ_RECORD}:${stamp([r.mode, r.pageId, r.run])}`, recorded_at: `${ON}T00:00:00Z` }));
    const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(lookupStore(index, "RESEARCH").dir, batchId, STORE_FILE)), records,
      targetClass: "GENERATED_CONFIG", action: "APPEND_BUILT_PAGE_RENDERS", occurredAt: instant, correlationId: `run:built-page-render:${instant}`, discipline: "APPEND_IF_NEW" }));
    if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the renders did NOT persist`); process.exit(1); }
  }
  console.log(`  rendered     ${reads.length} page(s) · ${Object.entries(reads.reduce((m, r) => ((m[r.renderState] = (m[r.renderState] ?? 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(" · ")} — kept in the batch's render store`);
  if (policy) console.log(`  live bounds  requests ${policy.requestsIssued()} made of a limit of ${LIMIT} · pacing gaps ${policy.pacing().gaps}, breaches ${policy.pacing().breaches}`);
} else console.log("  NOT RENDERED — no --render and no --live: nothing was rendered, no request was made and nothing was written; the audit below reads the stored renders");

/* the audit, from the STORED renders only */
const stored = BATCHES.flatMap((b) => rows(b, STORE_FILE)).filter((r) => r?.record_type === RENDER_READ_RECORD);
const a = auditRenders({ reads: stored, expected: { OFFLINE: jobs.offline.map((j) => j.pageId), LIVE: jobs.live.map((j) => j.pageId) } });
for (const mode of Object.values(MODE)) {
  const m = a.modes[mode];
  console.log(`  ${mode.padEnd(8)} renders ${Object.entries(m.renderStates).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} of ${m.pages} page(s) · with no stored render ${m.absent}`);
  for (const d of DIMENSIONS) { const x = m.dimensions[d]; console.log(`    ${d.padEnd(15)} SAME ${x.SAME} · DIFFERS ${x.DIFFERS} · ${NOT_MEASURED} ${x[NOT_MEASURED]} — of ${x.denominator} page(s) · only in render ${x.onlyInRender} · only in source ${x.onlyInSource}`); }
  console.log(`    population   ${m.pages === 0 ? "0 page(s)" : m.incomplete ? `INCOMPLETE — absent: ${m.missing.join(" · ")}` : "COMPLETE"}`);
}
