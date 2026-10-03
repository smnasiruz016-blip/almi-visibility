#!/usr/bin/env node
/**
 * 🔴 F25 · MOBILE READINESS — ONE CLIENT'S OWN PAGES, COUNT-ONLY (acceptance _handoffs b56655a).
 *
 *   node bin/mobile-audit.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> [--corpus=<dir>]
 *   node bin/mobile-audit.mjs … --live-render --i-have-the-owners-green        (a reviewed bounded request only — RR-137 §3)
 *
 * READ-ONLY. It writes nothing.
 *
 * WHAT IT READS — exactly as bin/render-audit.mjs (F22) does:
 * - the declared research batch's own fetched observations;
 * - each page's stored body, accepted only when its sha256 equals the observation's recorded hash;
 * - only pages on the subject's declared site origins.
 *
 * TWO SETS, KEPT APART:
 * - The VIEWPORT comes from the stored HTML (no render).
 * - OVERFLOW, TAP TARGETS and MOBILE CONTENT come only from COMPLETE renders at the DECLARED viewports below. Offline, a page that needs
 *   anything but its own document renders PARTIAL, and these three are NOT MEASURED.
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
import { confineToRepo } from "../src/write-law.mjs";
import { RENDER_BOUNDS as OFFLINE_BOUNDS, loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { createSameOriginPolicy, LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";
import { assessPage, summariseMobile, NOT_MEASURED } from "../src/audit/mobile-readiness.mjs";
import { renderEvidenceFor } from "../src/render/render-evidence-reader.mjs";

/** The DECLARED viewports (C4–C6): printed beside every result. */
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
export const DESKTOP_VIEWPORT = Object.freeze({ width: 1366, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const flag = (n) => process.argv.includes(`--${n}`);
const BATCH = arg("research-batch");
const SUBJECT = arg("subject");
if (!BATCH || !/^[a-z0-9][a-z0-9-]*$/.test(BATCH) || !SUBJECT) {
  console.error("usage: node bin/mobile-audit.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> [--corpus=<dir>] [--live-render --i-have-the-owners-green]");
  process.exit(2);
}
const LIVE = flag("live-render");
/* RR-138 §2: --evidence-batch=<id> reads the shared render evidence a collection stored (bin/render-collect.mjs) instead of rendering */
const EVIDENCE_BATCH = arg("evidence-batch");
if (EVIDENCE_BATCH !== null && (!/^[a-z0-9][a-z0-9-]*$/.test(EVIDENCE_BATCH) || LIVE)) { console.error("🔴 REFUSED — --evidence-batch is a declared id, and it reads stored evidence: it never renders live"); process.exit(2); }
if (LIVE && !flag("i-have-the-owners-green")) {
  console.error("🔴 REFUSED — --live-render runs the page's own scripts against its live origin and needs the owner's reviewed bounded request (--i-have-the-owners-green). NO REQUEST WAS MADE.");
  process.exit(3);
}
const RENDER_BOUNDS = LIVE ? Object.freeze({ ...OFFLINE_BOUNDS, perPageTimeoutMs: LIVE_RENDER_BOUNDS.perPageTimeoutMs }) : OFFLINE_BOUNDS;
const SITE = lookupConnector(rootIndexFor(process.env), SUBJECT, "PUBLIC_SITE");
const SITE_ORIGINS = SITE.state === "DECLARED" ? [...siteOriginsOf(SITE.connector)] : [];
if (SITE_ORIGINS.length === 0) { console.error("🔴 REFUSED — NO_DECLARED_SITE: the subject declares no site origin. NOTHING WAS READ."); process.exit(3); }
/* Amendment 1 (C3): the page's OWN site, as hosts — a render that refused only hosts outside this set may be OWN-SITE COMPLETE */
const OWN_HOSTS = new Set(SITE_ORIGINS.map((o) => new URL(o).host));
/* 🔴 F02 — decided HERE, before anything is read */
const SCOPE = scopedEntryPoint({ entry: "bin/mobile-audit.mjs", governed: false, resources: [RESOURCES.researchBatch(BATCH), ...(EVIDENCE_BATCH ? [RESOURCES.researchBatch(EVIDENCE_BATCH)] : []), ...SITE_ORIGINS.map((o) => RESOURCES.siteOrigin(o)), ...(LIVE ? [RESOURCES.connector(SUBJECT, "PUBLIC_SITE")] : [])] });
const CORPUS = confineToRepo(arg("corpus") ?? `${REPO}runs/crawl/corpus`, { label: "--corpus" });

const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const crawlFile = join(store.dir, BATCH, "crawl.jsonl");
const records = existsSync(crawlFile) ? readFileSync(crawlFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const fetched = records.filter((r) => r.record_type === "observation" && r.method === "crawl.fetch" && Number.isInteger(r.value?.status) && r.value.status >= 200 && r.value.status < 300);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pages = [];
let withoutBody = 0, offSite = 0;
for (const o of fetched) {
  if (!SITE_ORIGINS.includes(new URL(o.value.final_url ?? o.value.requested_url).origin)) { offSite += 1; continue; }
  const f = join(CORPUS, `${o.observation_id}.html`);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  if (body === null || sha(body) !== o.content_sha256) { withoutBody += 1; continue; }
  pages.push({ id: o.observation_id, url: o.value.final_url ?? o.value.requested_url, body });
}
console.log(`F25 · MOBILE READINESS — one client's own pages, count-only · mode ${LIVE ? "LIVE SAME-ORIGIN" : "OFFLINE"} · declared viewports mobile ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height}, desktop ${DESKTOP_VIEWPORT.width}×${DESKTOP_VIEWPORT.height}`);
console.log(`  population   fetched pages ${fetched.length} · with a stored body matching its recorded hash ${pages.length} · without ${withoutBody}${offSite ? ` · not on the declared site ${offSite}` : ""}`);
if (fetched.length === 0) { console.log(`  ${NOT_MEASURED} — the batch holds no fetched page: an empty population is not a result`); process.exit(1); }

/* RR-138 §2 · FROM STORED SHARED EVIDENCE: no render here — F25 reads only the records that name F25 (MOBILE, DESKTOP), each body only
 * when its hash holds; the viewport (C2) is still read from the page's stored HTML */
if (EVIDENCE_BATCH) {
  const f = join(store.dir, EVIDENCE_BATCH, "render.jsonl");
  const recs = existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const ev = renderEvidenceFor({ records: recs, corpus: CORPUS, row: "F25" });
  if (!ev.run || ev.run.source_batch !== BATCH) { console.error("🔴 REFUSED — the evidence batch holds no render run collected from this source batch."); process.exit(3); }
  const collected = pages.filter((p) => ev.byPage.has(p.id));
  const verified = (r) => (!r ? { renderState: "ABSENT", reason: "no stored render of this kind" } : r.renderState !== "FAILED" && r.visibleText == null ? { renderState: "UNVERIFIED", reason: "the stored render does not match its recorded hash" } : r);
  /* RR-143 · C7: the population is EVERY page of the source batch (INPUT: "its own stored raw-HTML page bodies, and for each, renders").
   * A page the collection did not render stays in it, NOT MEASURED with that reason, and a page without a matching stored body is counted
   * too — the first version assessed the rendered pages only, so the denominator shrank to them and an unrendered page vanished. */
  const notRendered = { renderState: "ABSENT", reason: "the evidence batch holds no render of this page" };
  const out = pages.map((p) => { const e = ev.byPage.get(p.id); return e ? assessPage({ html: p.body, mobile: verified(e.MOBILE), desktop: verified(e.DESKTOP), ownHosts: OWN_HOSTS }) : assessPage({ html: p.body, mobile: notRendered, desktop: notRendered }); });
  const s = summariseMobile(out, { pagesWithoutBody: withoutBody });
  const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");
  const measuredTargets = out.filter((a) => a.tapTargets.state !== NOT_MEASURED).length;
  console.log(`  evidence     stored render evidence read by F25 for ${collected.length} of ${pages.length} page(s) · records not naming F25 skipped ${ev.notForThisRow} · bodies failing their hash ${ev.unverified}`);
  console.log(`  VIEWPORT     ${fmt(s.viewport)} — of ${s.pages} page(s) · width=device-width ${s.viewportDeviceWidth} · zoom restricted (WCAG 2.2 SC 1.4.4) ${s.viewportZoomRestricted}   [from the stored HTML]`);
  console.log(`  RESPONSIVE   ${fmt(s.responsive)} — of ${s.pages} page(s)`);
  console.log(`  TAP TARGETS  ${fmt(Object.fromEntries(Object.entries(s.tapTargets).filter(([k]) => k !== "targets" && k !== "undersized")))} — of ${s.pages} page(s) · undersized (WCAG 2.2 SC 2.5.8) ${measuredTargets ? `${s.tapTargets.undersized} of ${s.tapTargets.targets} measured target(s)` : NOT_MEASURED}`);
  console.log(`  MOBILE TEXT  ${fmt(s.mobileContent)} — of ${s.pages} page(s)`);
  console.log(`  OWN-SITE     renders measured as OWN-SITE COMPLETE (Amendment 1) ${s.ownSite.renders} · their refused requests, all to hosts outside the declared site, ${s.ownSite.refusedOutside}${s.ownSite.refusedOutside ? ` by reason ${fmt(s.ownSite.refusedByReason)}` : ""}`);
  console.log(`  population   ${s.incomplete ? "INCOMPLETE — a page or measure above is NOT MEASURED" : "COMPLETE"} · from stored evidence · nothing fetched, rendered or written`);
  process.exit(0);
}

let policy = null;
if (LIVE) {
  const CONNECTOR = openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" });
  policy = createSameOriginPolicy({ fetchImpl: CONNECTOR.fetch, admits: CONNECTOR.admits });
}
const pw = await loadPlaywright();
const assessments = [];
const states = { mobile: {}, desktop: {} };
if (pw.unavailable) {
  /* no renderer: the stored-HTML set is still measured; every rendered measure is NOT MEASURED, the reason named */
  for (const p of pages) assessments.push(assessPage({ html: p.body, mobile: { renderState: "ABSENT", reason: pw.unavailable }, desktop: { renderState: "ABSENT", reason: pw.unavailable } }));
} else {
  const { browser } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
  const documents = new Map(pages.map((p) => [p.id, { body: p.body, status: 200, contentType: "text/html; charset=utf-8" }]));
  const server = await startDocumentServer(documents);
  try {
    for (const p of pages.slice(0, RENDER_BOUNDS.maxPages)) {
      const pp = policy ? policy.forPage() : null;
      let html = p.body;
      if (pp) {
        const doc = await pp.resolve(p.url);
        if (!doc.served || doc.status < 200 || doc.status >= 300) { assessments.push(assessPage({ html: p.body, mobile: { renderState: "FAILED", reason: "the live document was not served" }, desktop: { renderState: "FAILED", reason: "the live document was not served" } })); continue; }
        html = doc.body.toString("utf8");
        documents.set(p.id, { body: html, status: doc.status, contentType: doc.contentType ?? "text/html" });
      }
      const sub = pp ? { subresources: async (u) => { const c = await pp.cacheOnly(u); return c.served ? c : pp.resolve(u); } } : {};
      const mobile = await renderDocument({ browser, origin: server.origin, id: p.id, documentUrl: p.url, egress: [], bounds: RENDER_BOUNDS, viewport: MOBILE_VIEWPORT, readLayout: true, readVisibleText: true, ...sub });
      const desktop = await renderDocument({ browser, origin: server.origin, id: p.id, documentUrl: p.url, egress: [], bounds: RENDER_BOUNDS, viewport: DESKTOP_VIEWPORT, readVisibleText: true, ...sub });
      states.mobile[mobile.renderState] = (states.mobile[mobile.renderState] ?? 0) + 1;
      states.desktop[desktop.renderState] = (states.desktop[desktop.renderState] ?? 0) + 1;
      assessments.push(assessPage({ html, mobile, desktop, ownHosts: OWN_HOSTS }));
    }
  } finally { await browser.close(); await server.close(); }
}
const s = summariseMobile(assessments, { pagesWithoutBody: withoutBody });
/* NOT MEASURED is never printed as 0: with no measured page there is no target count to give */
const measuredTargetPages = assessments.filter((a) => a.tapTargets.state !== NOT_MEASURED).length;
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");
console.log(`  renders      mobile ${fmt(states.mobile) || "none"} · desktop ${fmt(states.desktop) || "none"}`);
console.log(`  VIEWPORT     ${fmt(s.viewport)} — of ${s.pages} page(s) · width=device-width ${s.viewportDeviceWidth} · zoom restricted (WCAG 2.2 SC 1.4.4) ${s.viewportZoomRestricted}   [from the stored HTML]`);
console.log(`  RESPONSIVE   ${fmt(s.responsive)} — of ${s.pages} page(s)   [COMPLETE mobile render only]`);
console.log(`  TAP TARGETS  ${fmt(Object.fromEntries(Object.entries(s.tapTargets).filter(([k]) => k !== "targets" && k !== "undersized")))} — of ${s.pages} page(s) · undersized (WCAG 2.2 SC 2.5.8) ${measuredTargetPages ? `${s.tapTargets.undersized} of ${s.tapTargets.targets} measured target(s)` : NOT_MEASURED}   [COMPLETE mobile render only]`);
console.log(`  MOBILE TEXT  ${fmt(s.mobileContent)} — of ${s.pages} page(s)   [COMPLETE mobile AND desktop render only]`);
console.log(`  OWN-SITE     renders measured as OWN-SITE COMPLETE (Amendment 1) ${s.ownSite.renders} · their refused requests, all to hosts outside the declared site, ${s.ownSite.refusedOutside}${s.ownSite.refusedOutside ? ` by reason ${fmt(s.ownSite.refusedByReason)}` : ""}`);
if (policy) console.log(`  live bounds  requests ${policy.requestsIssued()} · per page cap ${LIVE_RENDER_BOUNDS.maxRequestsPerPage} · pacing breaches ${policy.pacing().breaches}`);
console.log(`  population   ${s.incomplete ? "INCOMPLETE — a page or measure above is NOT MEASURED" : "COMPLETE"} · nothing written`);
