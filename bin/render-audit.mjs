#!/usr/bin/env node
/**
 * 🔴 F22 · JAVASCRIPT RENDERING AUDIT — ONE CLIENT'S OWN PAGES, SOURCE AGAINST RENDER, COUNT-ONLY (acceptance _handoffs 2d20a63).
 *
 *   node bin/render-audit.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> [--corpus=<dir>]
 *   node bin/render-audit.mjs … --live-render --i-have-the-owners-green          (a reviewed bounded request only — RR-137 §3)
 *
 * READ-ONLY. It writes nothing: it renders, compares and prints counts.
 *
 * WHAT IT READS — this client's own pages only (F02):
 * - the declared research batch's own fetched observations, decided at entry;
 * - each page's stored body from the local corpus, accepted ONLY when its sha256 equals the content_sha256 that observation recorded.
 *   A body is attributed to this batch by its hash, never by its location, and a page with no matching body is counted, never skipped.
 *
 * HOW IT RENDERS — OFFLINE by default:
 * - every request but the stored document is refused, so a page whose scripts need anything else renders PARTIAL, and every dimension
 *   of it is NOT MEASURED (C2);
 * - with --live-render, a page's subresources come only from its own DECLARED origin, through the opened PUBLIC_SITE connector, under
 *   src/render/same-origin-policy.mjs's bounds. The browser itself still resolves no name.
 *
 * THE SOURCE SIDE is the page's document read with JavaScript OFF. Offline that document is the stored body and gets nothing else.
 * LIVE (acceptance INPUT: "the page and its subresources requested only from the page's own declared site origin") the document itself
 * is requested first, under the same bounds, and THAT is the source: it and its subresources come from one moment, so a stored page
 * naming files the site has since replaced cannot pose as the live page. Its subresources come only from what that page's own render
 * already fetched, so the source pass makes no request.
 *
 * Generic: nothing here names a client, host, product or path shape.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { lookupStore, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { openConnector, siteOriginsOf } from "../src/tenancy/connectors.mjs";
import { confineToRepo, writePermission, LOCAL } from "../src/write-law.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { RENDER_BOUNDS as OFFLINE_BOUNDS, loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { createSameOriginPolicy, LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";
import { compareSourceRender, summariseComparisons, DIMENSIONS, NOT_MEASURED } from "../src/audit/render-compare.mjs";
import { renderEvidenceFor } from "../src/render/render-evidence-reader.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const flag = (n) => process.argv.includes(`--${n}`);
const BATCH = arg("research-batch");
const SUBJECT = arg("subject");
if (!BATCH || !/^[a-z0-9][a-z0-9-]*$/.test(BATCH) || !SUBJECT) {
  console.error("usage: node bin/render-audit.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> [--corpus=<dir>] [--live-render --i-have-the-owners-green]");
  process.exit(2);
}
const LIVE = flag("live-render");
/* RR-138 §2: --evidence-batch=<id> reads the shared render evidence a collection stored (bin/render-collect.mjs) instead of rendering */
const EVIDENCE_BATCH = arg("evidence-batch");
if (EVIDENCE_BATCH !== null && (!/^[a-z0-9][a-z0-9-]*$/.test(EVIDENCE_BATCH) || LIVE)) { console.error("🔴 REFUSED — --evidence-batch is a declared id, and it reads stored evidence: it never renders live"); process.exit(2); }
/* the per-page bound: the offline renderer's, or the live path's own (src/render/same-origin-policy.mjs) */
const RENDER_BOUNDS = LIVE ? Object.freeze({ ...OFFLINE_BOUNDS, perPageTimeoutMs: LIVE_RENDER_BOUNDS.perPageTimeoutMs }) : OFFLINE_BOUNDS;
/* The subject's declared site: the origins its PUBLIC_SITE connector reaches. The stored bodies this run reads are copies of THOSE
 * pages, so each origin is a resource the scope decision must allow; a subject that declares no site has nothing to render. */
const SITE = lookupConnector(rootIndexFor(process.env), SUBJECT, "PUBLIC_SITE");
const SITE_ORIGINS = SITE.state === "DECLARED" ? [...siteOriginsOf(SITE.connector)] : [];
/* 🔴 F02 — decided HERE, before anything is read: this batch, the subject's declared site origins (the stored bodies are copies of
 * their pages), and (live only) this subject's PUBLIC_SITE connector. */
const SCOPE = scopedEntryPoint({ entry: "bin/render-audit.mjs", governed: LIVE, resources: [RESOURCES.researchBatch(BATCH), ...(EVIDENCE_BATCH ? [RESOURCES.researchBatch(EVIDENCE_BATCH)] : []), ...SITE_ORIGINS.map((o) => RESOURCES.siteOrigin(o)), ...(LIVE ? [RESOURCES.connector(SUBJECT, "PUBLIC_SITE"), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78 Amendment 1 C8/C9 (RR-243): a LIVE run (the only mode that opens a connector) writes its one cost entry into its tenant's own
 * declared ledger, whatever ends it; without --confirm it makes no request at all */
const RUN_COST = LIVE ? runCost({ entryPoint: "bin/render-audit.mjs", scope: SCOPE, permission: writePermission({ target: LOCAL, argv: process.argv, env: process.env }), write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;
/* RR-244 (F78 Amendment 2): a refusal of this connector mode comes AFTER the scope gate and the cost recorder, so it is recorded on the
 * trail — without --confirm the write law refuses the run's cost entry, and that refusal is the record; with --confirm the entry is written */
if (LIVE && !flag("i-have-the-owners-green")) {
  console.error("🔴 REFUSED — --live-render runs the page's own scripts against its live origin and needs the owner's reviewed bounded request (--i-have-the-owners-green). NO REQUEST WAS MADE.");
  process.exit(3);
}
if (SITE_ORIGINS.length === 0) { console.error("🔴 REFUSED — NO_DECLARED_SITE: the subject declares no site origin to render. NOTHING WAS READ."); process.exit(3); }
const CORPUS = confineToRepo(arg("corpus") ?? `${REPO}runs/crawl/corpus`, { label: "--corpus" });

const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const crawlFile = join(store.dir, BATCH, "crawl.jsonl");
const records = existsSync(crawlFile) ? readFileSync(crawlFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const fetched = records.filter((r) => r.record_type === "observation" && r.method === "crawl.fetch" && Number.isInteger(r.value?.status) && r.value.status >= 200 && r.value.status < 300);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pages = [];
let withoutBody = 0;
let offSite = 0;
for (const o of fetched) {
  /* only pages of the subject's declared site are this run's population */
  if (!SITE_ORIGINS.includes(new URL(o.value.final_url ?? o.value.requested_url).origin)) { offSite += 1; continue; }
  const f = join(CORPUS, `${o.observation_id}.html`);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  if (body === null || sha(body) !== o.content_sha256) { withoutBody += 1; continue; }
  pages.push({ id: o.observation_id, url: o.value.final_url ?? o.value.requested_url, body });
}
console.log(`F22 · JAVASCRIPT RENDERING AUDIT — one client's own pages, source against render, count-only · mode ${LIVE ? "LIVE SAME-ORIGIN" : "OFFLINE"}`);
console.log(`  population   fetched pages ${fetched.length} · with a stored body matching its recorded hash ${pages.length} · without ${withoutBody}${offSite ? ` · not on the declared site ${offSite}` : ""}`);
if (fetched.length === 0) { console.log(`  ${NOT_MEASURED} — the batch holds no fetched page: an empty population is not a result`); process.exit(1); }

/* RR-138 §2 · FROM STORED SHARED EVIDENCE: no render here — F22 reads only the records that name F22, each body only when its hash holds */
if (EVIDENCE_BATCH) {
  const f = join(store.dir, EVIDENCE_BATCH, "render.jsonl");
  const recs = existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const ev = renderEvidenceFor({ records: recs, corpus: CORPUS, row: "F22" });
  if (!ev.run || ev.run.source_batch !== BATCH) { console.error("🔴 REFUSED — the evidence batch holds no render run collected from this source batch."); process.exit(3); }
  const collected = pages.filter((p) => ev.byPage.has(p.id));
  const out = [];
  for (const p of collected) {
    const e = ev.byPage.get(p.id);
    const d = e.DESKTOP, src = e.SOURCE;
    const unverified = !d || !src || (d.renderState !== "FAILED" && d.html == null) || src.html == null;
    out.push(compareSourceRender(unverified
      ? { renderState: "UNVERIFIED", renderReason: "a stored render of this page is missing or does not match its recorded hash", pageUrl: p.url }
      : { renderState: d.renderState, renderReason: d.reason, pageUrl: p.url, sourceHtml: src.html, renderedHtml: d.html, sourceText: src.visibleText, renderedText: d.visibleText }));
  }
  const s = summariseComparisons(out);
  console.log(`  evidence     stored render evidence read by F22 for ${collected.length} of ${pages.length} page(s) · records not naming F22 skipped ${ev.notForThisRow} · bodies failing their hash ${ev.unverified}`);
  console.log(`  renders      ${Object.entries(s.renderStates).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} of ${out.length}`);
  for (const dim of DIMENSIONS) { const x = s.dimensions[dim]; console.log(`  ${dim.padEnd(15)} SAME ${x.SAME} · DIFFERS ${x.DIFFERS} · ${NOT_MEASURED} ${x[NOT_MEASURED]} — of ${x.denominator} page(s) · only in render ${x.onlyInRender} · only in source ${x.onlyInSource}`); }
  console.log(`  population   ${s.incomplete ? "INCOMPLETE — a page or dimension above is NOT MEASURED" : "COMPLETE"} · from stored evidence · nothing fetched, rendered or written`);
  process.exit(0);
}

let CONNECTOR = null;
let policy = null;
if (LIVE) {
  CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" }));
  const outside = pages.filter((p) => !CONNECTOR.admits(p.url)).length;
  if (outside > 0) { console.error(`🔴 REFUSED — ${outside} page(s) are not on a site origin the subject declares. NO REQUEST WAS MADE.`); process.exit(3); }
  policy = createSameOriginPolicy({ fetchImpl: CONNECTOR.fetch, admits: CONNECTOR.admits });
}
/* OFFLINE needs no guard of its own: no connector is opened, the Node side fetches only the stored documents through the renderer's
 * guardedLocalFetch (which THROWS on any host but 127.0.0.1), and the browser resolves no name (OFFLINE_CHROMIUM_ARGS). */

const pw = await loadPlaywright();
if (pw.unavailable) { console.log(`  ${NOT_MEASURED} — no renderer here: ${pw.unavailable}`); process.exit(1); }
const { browser } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
const documents = new Map(pages.map((p) => [p.id, { body: p.body, status: 200, contentType: "text/html; charset=utf-8" }]));
const server = await startDocumentServer(documents);
const documentsRefused = {};
let liveDocumentChanged = 0;
const egress = [];
const comparisons = [];
const refusedByReason = {};
/* a FAILED render's reason, as a CATEGORY only: a navigation error's own text may carry a URL, and output is count-only */
const failedBy = {};
const failCategory = (reason) => (/neither served nor refused/.test(reason) ? "UNACCOUNTED_REQUESTS" : /never served/.test(reason) ? "DOCUMENT_NOT_SERVED" : /crashed/.test(reason) ? "CRASHED" : /navigation failed|could not be read/.test(reason) ? "NAVIGATION_FAILED" : "OTHER");
try {
  for (const p of pages.slice(0, RENDER_BOUNDS.maxPages)) {
    const pp = policy ? policy.forPage() : null;
    let sourceHtml = p.body;
    if (pp) {
      /* LIVE: the document first, through the same policy (declared origin, robots, pacing, timeout, size, redirect rule) */
      const doc = await pp.resolve(p.url);
      if (!doc.served || doc.status < 200 || doc.status >= 300) {
        documentsRefused[doc.served ? `HTTP_${doc.status}` : doc.refusal] = (documentsRefused[doc.served ? `HTTP_${doc.status}` : doc.refusal] ?? 0) + 1;
        comparisons.push(compareSourceRender({ renderState: "FAILED", renderReason: "the live document was not served", pageUrl: p.url }));
        continue;
      }
      sourceHtml = doc.body.toString("utf8");
      if (sha(sourceHtml) !== sha(p.body)) liveDocumentChanged += 1;
      documents.set(p.id, { body: sourceHtml, status: doc.status, contentType: doc.contentType ?? "text/html" });
    }
    const rendered = await renderDocument({ browser, origin: server.origin, id: p.id, documentUrl: p.url, egress, bounds: RENDER_BOUNDS, readVisibleText: true, ...(pp ? { subresources: (u) => pp.resolve(u) } : {}) });
    const source = await renderDocument({ browser, origin: server.origin, id: p.id, documentUrl: p.url, egress, bounds: RENDER_BOUNDS, readVisibleText: true, javaScriptEnabled: false, ...(pp ? { subresources: (u) => pp.cacheOnly(u) } : {}) });
    for (const [k, n] of Object.entries(rendered.requests.refusedByReason ?? {})) refusedByReason[k] = (refusedByReason[k] ?? 0) + n;
    if (rendered.renderState === "FAILED") { const c = failCategory(rendered.reason); failedBy[c] = (failedBy[c] ?? 0) + 1; }
    comparisons.push(compareSourceRender({ renderState: rendered.renderState, renderReason: rendered.reason, pageUrl: p.url, sourceHtml, renderedHtml: rendered.html, sourceText: source.visibleText, renderedText: rendered.visibleText }));
  }
} finally { await browser.close(); await server.close(); }

const s = summariseComparisons(comparisons, { pagesWithoutBody: withoutBody });
console.log(`  renders      ${Object.entries(s.renderStates).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} of ${comparisons.length} · refused requests by reason ${JSON.stringify(refusedByReason)} · failed by reason ${JSON.stringify(failedBy)}`);
for (const d of DIMENSIONS) { const x = s.dimensions[d]; console.log(`  ${d.padEnd(15)} SAME ${x.SAME} · DIFFERS ${x.DIFFERS} · ${NOT_MEASURED} ${x[NOT_MEASURED]} — of ${x.denominator} page(s) · only in render ${x.onlyInRender} · only in source ${x.onlyInSource}`); }
if (policy) console.log(`  live document  served ${pages.length - Object.values(documentsRefused).reduce((a, b) => a + b, 0)} of ${pages.length} · not served ${JSON.stringify(documentsRefused)} · differs from the stored body ${liveDocumentChanged}`);
if (policy) console.log(`  live bounds  requests ${policy.requestsIssued()} · per page cap ${LIVE_RENDER_BOUNDS.maxRequestsPerPage} · per page ${LIVE_RENDER_BOUNDS.perPageTimeoutMs} ms · pacing gaps ${policy.pacing().gaps}, breaches ${policy.pacing().breaches}`);
console.log(`  population   ${s.incomplete ? "INCOMPLETE — a page or dimension above is NOT MEASURED" : "COMPLETE"} · nothing written`);
