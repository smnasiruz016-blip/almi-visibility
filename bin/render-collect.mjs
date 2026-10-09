#!/usr/bin/env node
/**
 * 🔴 RR-138 §2 · THE ONE BOUNDED LIVE SAME-ORIGIN RENDER COLLECTION — SHARED EVIDENCE FOR F22 AND F25, STORED ONCE.
 *
 *   node bin/render-collect.mjs --source-batch=<declared id> --evidence-batch=<declared id> --tenant=<t> --subject=<s>
 *        --live --i-have-the-owners-green --confirm [--max-pages=N] [--max-total-requests=N] [--max-requests-per-page=N] [--corpus=<dir>]
 *
 * LIVE ONLY, and only on the owner's reviewed GREEN for the exact run. Everything below happens BEFORE any request, and any refusal
 * makes ZERO HTTP requests:
 *   1. the GREEN (--live --i-have-the-owners-green) and the STORAGE PERMISSION (--confirm, the write law's local flag) — refused without;
 *   2. F02: the source batch, the evidence batch, the subject's declared site origins and its PUBLIC_SITE connector, all this tenant's;
 *   3. the population: the source batch's own fetched pages whose stored body matches its recorded hash, on the declared site, the first
 *      --max-pages of them (which may only LOWER the count);
 *   4. a CLEAN evidence batch (no render.jsonl yet);
 *   5. the PREFLIGHT: every governed write this run makes is BUILT over synthetic render records of every kind and state — a write that
 *      would be refused stops the run here.
 * Then each page: its document is requested first, under the policy (declared origin, robots, ≥ the interval, timeout, size cap,
 * on-origin redirects, GET or HEAD only, 401/402/407 refused, the per-page cap, and the run's TOTAL ceiling, which nothing can exceed);
 * then three renders that share one per-page cache, so a resource is fetched once however many renders read it (render-evidence.mjs).
 * FETCHED, NOT YET KEPT is printed before any write; KEPT only when every write committed.
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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { authorise } from "../src/governance/authorisation.mjs";
import { preflightRenderWrites } from "../src/render/render-preflight.mjs";
import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { RENDER_BOUNDS as OFFLINE_BOUNDS, loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { createSameOriginPolicy, LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { renderEvidenceObservation, renderRunRecord, RENDER_KINDS, VIEWPORT_OF } from "../src/render/render-evidence.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const flag = (n) => process.argv.includes(`--${n}`);
const SOURCE_BATCH = arg("source-batch");
const EVIDENCE_BATCH = arg("evidence-batch");
const SUBJECT = arg("subject");
const ID = /^[a-z0-9][a-z0-9-]*$/;
if (!SOURCE_BATCH || !ID.test(SOURCE_BATCH) || !EVIDENCE_BATCH || !ID.test(EVIDENCE_BATCH) || !SUBJECT || SOURCE_BATCH === EVIDENCE_BATCH) {
  console.error("usage: node bin/render-collect.mjs --source-batch=<id> --evidence-batch=<another id> --tenant=<t> --subject=<s> --live --i-have-the-owners-green --confirm [--max-pages=N] [--max-total-requests=N] [--max-requests-per-page=N]");
  process.exit(2);
}
/* 1 · the GREEN, and the STORAGE PERMISSION — before anything else */
if (!flag("live") || !flag("i-have-the-owners-green")) {
  console.error("🔴 REFUSED — NO_GREEN: this collection runs a page's own scripts against its live origin; it needs --live and the owner's reviewed GREEN (--i-have-the-owners-green). NO REQUEST WAS MADE.");
  process.exit(3);
}
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) {
  console.error(`🔴 REFUSED — STORAGE_PERMISSION_MISSING: the evidence could not be kept (${permission.reason}); a collection that cannot be kept is not collected. NO REQUEST WAS MADE.`);
  process.exit(3);
}
const lower = (name, ceiling) => {
  const v = arg(name);
  if (v === null) return ceiling;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > ceiling) { console.error(`🔴 REFUSED — --${name} must be an integer from 1 to ${ceiling} (it may only lower the bound). NO REQUEST WAS MADE.`); process.exit(2); }
  return n;
};
const MAX_PAGES = lower("max-pages", OFFLINE_BOUNDS.maxPages);
const MAX_TOTAL = lower("max-total-requests", LIVE_RENDER_BOUNDS.maxTotalRequests);
/* RR-144 §2: the per-page cap is no longer fixed. A run may DECLARE it — set from the page's measured need plus headroom — from 1 up to
 * the run's own TOTAL ceiling, never above it; undeclared, it is the recorded default. It is printed in the PLAN and stored in the run
 * record's bounds, so the cap a run used is always on its record. The TOTAL ceiling still bounds everything. */
const PER_PAGE = (() => {
  const v = arg("max-requests-per-page");
  if (v === null) return LIVE_RENDER_BOUNDS.maxRequestsPerPage;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_TOTAL) { console.error(`🔴 REFUSED — --max-requests-per-page must be an integer from 1 to the run's total ceiling (${MAX_TOTAL}). NO REQUEST WAS MADE.`); process.exit(2); }
  return n;
})();
const BOUNDS = Object.freeze({ ...LIVE_RENDER_BOUNDS, maxTotalRequests: MAX_TOTAL, maxRequestsPerPage: PER_PAGE });
const RENDER_BOUNDS = Object.freeze({ ...OFFLINE_BOUNDS, perPageTimeoutMs: BOUNDS.perPageTimeoutMs });

/* 2 · F02 — the subject's declared site, then every resource this run reads or writes, decided before any of it is touched */
const SITE = lookupConnector(rootIndexFor(process.env), SUBJECT, "PUBLIC_SITE");
const SITE_ORIGINS = SITE.state === "DECLARED" ? [...siteOriginsOf(SITE.connector)] : [];
if (SITE_ORIGINS.length === 0) { console.error("🔴 REFUSED — NO_DECLARED_SITE. NO REQUEST WAS MADE."); process.exit(3); }
const SCOPE = scopedEntryPoint({ entry: "bin/render-collect.mjs", governed: true, resources: [RESOURCES.researchBatch(SOURCE_BATCH), RESOURCES.researchBatch(EVIDENCE_BATCH), ...SITE_ORIGINS.map((o) => RESOURCES.siteOrigin(o)), RESOURCES.connector(SUBJECT, "PUBLIC_SITE"), RESOURCES.costLedger(ownLedgerRef())] });
/* F78 Amendment 1 C8/C9 (RR-243): this run's one cost entry, into its tenant's own declared ledger, whatever ends the run */
const RUN_COST = runCost({ entryPoint: "bin/render-collect.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO });
const CORPUS = confineToRepo(arg("corpus") ?? `${REPO}runs/crawl/corpus`, { label: "--corpus" });

/* 3 · the population */
const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}. NO REQUEST WAS MADE.`); process.exit(3); }
const sourceFile = join(store.dir, SOURCE_BATCH, "crawl.jsonl");
const evidenceDir = join(store.dir, EVIDENCE_BATCH);
const records = existsSync(sourceFile) ? readFileSync(sourceFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pages = [];
for (const o of records.filter((r) => r.record_type === "observation" && r.method === "crawl.fetch" && Number.isInteger(r.value?.status) && r.value.status >= 200 && r.value.status < 300)) {
  const url = o.value.final_url ?? o.value.requested_url;
  if (!SITE_ORIGINS.includes(new URL(url).origin)) continue;
  const f = join(CORPUS, `${o.observation_id}.html`);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  if (body === null || sha(body) !== o.content_sha256) continue;
  pages.push({ obs: o, url, id: o.observation_id });
  if (pages.length === MAX_PAGES) break;
}
if (pages.length === 0) { console.error("🔴 REFUSED — NO_PAGES: the source batch holds no page with a matching stored body on the declared site. NO REQUEST WAS MADE."); process.exit(3); }

/* 4 · a clean evidence batch */
if (!existsSync(evidenceDir)) { console.error("🔴 REFUSED — the evidence batch has no directory in the RESEARCH store. NO REQUEST WAS MADE."); process.exit(3); }
const RENDER_FILE = join(evidenceDir, "render.jsonl");
if (existsSync(RENDER_FILE)) { console.error("🔴 REFUSED — NOT_CLEAN: the evidence batch already holds render evidence; one collection per batch. NO REQUEST WAS MADE."); process.exit(3); }

/* 5 · THE PREFLIGHT — every governed write, BUILT over synthetic records of every kind and state, before any request */
/* the render observations dedupe by their measurement key (APPEND_IF_NEW); the RUN record is unique by its run_id and carries no such
 * key, so — exactly as the crawler's run record — it is appended WITHOUT dedupe (found by this collector's first test run: one append of
 * both failed before commit) */
const appendRecords = (recs, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(RENDER_FILE), records: recs, targetClass: "GENERATED_CONFIG", action: "APPEND_RENDER_EVIDENCE", occurredAt, correlationId, discipline: "APPEND_IF_NEW" });
const appendRun = (run, occurredAt, correlationId) => governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(RENDER_FILE), records: [run], targetClass: "GENERATED_CONFIG", action: "APPEND_RENDER_EVIDENCE", occurredAt, correlationId, discipline: "APPEND_WITHOUT_DEDUPE" });
const writeBody = (path, bytes, occurredAt, correlationId) => governedFileWrite({ ...SCOPE.writeScope, repo: REPO, permission, target: path, targetClass: "GENERATED_CONFIG", bytes, action: "WRITE_RENDER_BODY", occurredAt, correlationId });
{
  const at = governedInstant(Date.now());
  const synthSource = { record_type: "observation", observation_id: "preflight-source", content_sha256: sha("preflight"), target: { kind: "url", ref: "https://preflight.invalid/p" } };
  const synthetic = [];
  for (const kind of Object.keys(RENDER_KINDS)) for (const state of ["COMPLETE", "PARTIAL", "FAILED"]) {
    synthetic.push(renderEvidenceObservation({ sourceObservation: synthSource, kind, observedAt: new Date().toISOString(), liveDocumentSha256: null,
      result: { renderState: state, reason: "preflight", html: state === "FAILED" ? null : "<html></html>", visibleText: state === "FAILED" ? null : "x", layout: kind === "MOBILE" && state !== "FAILED" ? { scrollWidth: 1, viewportWidth: 1, targets: [] } : null, requests: { attempted: 0, servedLocal: 0, servedSameOrigin: 0, refused: 0, byHost: {}, refusedByType: {}, refusedByReason: {} } } }));
  }
  /* placement, dedupe key and the F04 decision — all three, before any request (src/render/render-preflight.mjs) */
  const corr0 = `run:render-preflight:${at}`;
  const synthRun = renderRunRecord({ runId: "preflight", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), pages: 0, bounds: BOUNDS, requestsIssued: 0, pacing: null, refusedByReason: {}, renderStates: {}, sourceBatch: SOURCE_BATCH });
  const { ok, checks } = preflightRenderWrites({
    authorise, permission, dedupeKeyOf: (r) => createJsonlStore(RENDER_FILE).dedupeKeyOf(r),
    attempts: [
      { what: `render evidence (${synthetic.length} kinds × states)`, records: synthetic, needsKey: true, build: () => appendRecords(synthetic, at, corr0) },
      { what: "render run record", build: () => appendRun(synthRun, at, corr0) },
      { what: "rendered body", build: () => writeBody(join(CORPUS, "preflight.render.html"), "<html></html>", at, corr0) },
    ],
  });
  console.log(`PREFLIGHT       : ${ok ? "PASS" : "REFUSED"} — ${checks.map((c) => `${c.what} ${c.ok ? "keepable" : `REFUSED (${c.why})`}`).join(" · ")} · network requests 0`);
  if (!ok) { console.error("🔴 NO REQUEST WAS MADE. A result that cannot be kept is not collected."); process.exit(3); }
}
console.log(`PLAN            : pages ${pages.length} (declared site only) · renders per page 3 (SOURCE js-off, DESKTOP ${VIEWPORT_OF.DESKTOP.width}×${VIEWPORT_OF.DESKTOP.height}, MOBILE ${VIEWPORT_OF.MOBILE.width}×${VIEWPORT_OF.MOBILE.height}) · TOTAL request ceiling ${BOUNDS.maxTotalRequests} (robots, documents, subresources, redirects and retries all count) · per page ${BOUNDS.maxRequestsPerPage} · ≥ ${BOUNDS.intervalMs} ms between request starts · ${BOUNDS.timeoutMs} ms per request · ${BOUNDS.perPageTimeoutMs} ms per page · ${BOUNDS.maxResponseBytes} bytes per response · retry ≤ 1 on a network error · GET/HEAD only · nothing but the declared origin`);

/* THE RUN */
const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" }));
const policy = createSameOriginPolicy({ fetchImpl: CONNECTOR.fetch, admits: CONNECTOR.admits, bounds: BOUNDS });
const pw = await loadPlaywright();
if (pw.unavailable) { console.error(`🔴 REFUSED — no renderer here (${pw.unavailable}). NO REQUEST WAS MADE.`); process.exit(3); }
const startedAt = new Date().toISOString();
const { browser } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
const documents = new Map();
const server = await startDocumentServer(documents);
const observations = [];
const bodies = [];
const refusedByReason = {};
const renderStates = {};
try {
  for (const p of pages) {
    const pp = policy.forPage();
    const doc = await pp.resolve(p.url);
    const liveOk = doc.served && doc.status >= 200 && doc.status < 300;
    if (liveOk) documents.set(p.id, { body: doc.body.toString("utf8"), status: doc.status, contentType: doc.contentType ?? "text/html" });
    else refusedByReason[`DOCUMENT_${doc.served ? `HTTP_${doc.status}` : doc.refusal}`] = (refusedByReason[`DOCUMENT_${doc.served ? `HTTP_${doc.status}` : doc.refusal}`] ?? 0) + 1;
    const liveSha = liveOk ? sha(doc.body) : null;
    for (const kind of [RENDER_KINDS.DESKTOP, RENDER_KINDS.MOBILE, RENDER_KINDS.SOURCE]) {
      const result = liveOk
        ? await renderDocument({ browser, origin: server.origin, id: p.id, documentUrl: p.url, egress: [], bounds: RENDER_BOUNDS, viewport: VIEWPORT_OF[kind], javaScriptEnabled: kind !== "SOURCE", readVisibleText: true, readLayout: kind !== "SOURCE",
            subresources: kind === "SOURCE" ? (u) => pp.cacheOnly(u) : (u, _t, method) => pp.cacheOrResolve(u, { method }) })
        : { renderState: "FAILED", reason: "the live document was not served", html: null, visibleText: null, layout: null, requests: null };
      for (const [k, n] of Object.entries(result.requests?.refusedByReason ?? {})) refusedByReason[k] = (refusedByReason[k] ?? 0) + n;
      renderStates[`${kind}:${result.renderState}`] = (renderStates[`${kind}:${result.renderState}`] ?? 0) + 1;
      const o = renderEvidenceObservation({ sourceObservation: p.obs, kind, result, observedAt: new Date().toISOString(), liveDocumentSha256: liveSha });
      observations.push(o);
      if (result.html != null) bodies.push([join(CORPUS, `${o.observation_id}.render.html`), result.html]);
      if (result.visibleText != null) bodies.push([join(CORPUS, `${o.observation_id}.render.txt`), result.visibleText]);
    }
  }
} finally { await browser.close(); await server.close(); }
const run = renderRunRecord({ runId: sha(`${startedAt}|${SOURCE_BATCH}|${pages.length}`).slice(0, 16), startedAt, finishedAt: new Date().toISOString(), pages: pages.length, bounds: BOUNDS, requestsIssued: policy.requestsIssued(), pacing: policy.pacing(), refusedByReason, renderStates, sourceBatch: SOURCE_BATCH });
console.log(`FETCHED, NOT YET KEPT — requests ${policy.requestsIssued()} of a ceiling of ${BOUNDS.maxTotalRequests} · pacing gaps ${run.pacing.gaps}, breaches ${run.pacing.breaches} · renders ${JSON.stringify(renderStates)} · refused ${JSON.stringify(refusedByReason)}`);

/* KEEP — every write through the governed path; KEPT only when every one committed */
const at = governedInstant(Date.now());
const corr = `run:render:${at}`;
const outcomes = [];
const notCommitted = {};
const keep = (what, d) => { let o; try { o = executeGovernedWrite(d).outcome; } catch (e) { o = `THREW_${e.code ?? e.name}`; } outcomes.push(o); if (o !== "COMMITTED" && o !== "ALREADY_COMMITTED") notCommitted[`${what}:${o}`] = (notCommitted[`${what}:${o}`] ?? 0) + 1; };
keep("evidence", appendRecords(observations, at, corr));
keep("run record", appendRun(run, at, corr));
for (const [path, bytes] of bodies) keep("body", writeBody(path, bytes, at, corr));
const kept = outcomes.every((o) => o === "COMMITTED" || o === "ALREADY_COMMITTED") && run.pacing.ok === true;
console.log(`KEEP            : evidence records ${observations.length + 1} · bodies ${bodies.length} · ${outcomes.filter((o) => o === "COMMITTED" || o === "ALREADY_COMMITTED").length} of ${outcomes.length} write(s) committed${Object.keys(notCommitted).length ? ` · NOT committed ${JSON.stringify(notCommitted)}` : ""}`);
console.log(`COLLECTION: ${kept ? "KEPT" : "NOT KEPT"}${run.pacing.ok === true ? "" : " — pacing not proved"}`);
if (!kept) process.exitCode = 1;
