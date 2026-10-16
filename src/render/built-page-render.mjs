/**
 * 🔴 F22 · THE CLIENT'S BUILT PAGES, RENDERED (F22 Acceptance Amendment 1, _handoffs df82cbe; the owner's overnight command of 16 Oct 2026).
 *
 * PURE: stored records in, render jobs and the audit out. Nothing here renders, fetches or writes; it names no client, host or product.
 *
 *   THE POPULATION (INPUT) every page the engine built for the client, in each research batch the client declares (src/audit/built-page-
 *                  links.mjs clientPages — the same reader F23 uses):
 *     OFFLINE      each page as published (its build made the published page at its recorded address, and that page's sha256 must equal
 *                  the one recorded at publication) or, before publication, as built — served locally with the files its own record says
 *                  it is served with, each only when its bytes match the recorded sha256; every other request refused
 *     LIVE         each page recorded as published, at its recorded address, through the bounded same-origin path
 *   THE STORED READ one record per render: the source document and the rendered DOM with their visible texts and the render's state, so
 *                  the comparison is re-made from the stored bytes — never from a summary
 *   THE AUDIT      src/audit/render-compare.mjs on each stored read: seven dimensions, COMPLETE renders only (C2, C3), every count with its
 *                  denominator, the population INCOMPLETE whenever a page or dimension is NOT MEASURED, naming what is absent (C6)
 */
import { createHash } from "node:crypto";
import { clientPages, NO_ADDRESS_BASE } from "../audit/built-page-links.mjs";
import { POPULATION } from "../audit/page-links.mjs";
import { publishedHtml } from "../page/publish-page.mjs";
import { compareSourceRender, summariseComparisons, DIMENSIONS, NOT_MEASURED } from "../audit/render-compare.mjs";

export const RENDER_READ_RECORD = "built_page_render_read";
export const MODE = Object.freeze({ OFFLINE: "OFFLINE", LIVE: "LIVE" });

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const list = (v) => (Array.isArray(v) ? v : []);

/**
 * The render jobs of one client. `batches`: [{ batchId, builds, decisions }] — every research batch the client declares. `hosts`: its
 * declared hosts. `assetBytes(file)`: the bytes of a file under the client's declared root, or null.
 * Each OFFLINE job: { pageId, population, documentUrl, html, files: Map(url -> { body, contentType }), refused } — `refused` names why the
 * page cannot be served as it stands (it is then rendered by nobody and counted). Each LIVE job: { pageId, url }.
 */
export function renderJobs({ batches = [], tenantId, hosts = [], assetBytes = () => null }) {
  const population = clientPages({ batches: list(batches).map((b) => ({ batchId: b.batchId, builds: b.builds, decisions: b.decisions, reads: [] })), tenantId, hosts });
  const recordOf = new Map(list(batches).flatMap((b) => list(b.builds)).filter((r) => typeof r?.measurement_key === "string").map((r) => [r.measurement_key, r]));
  const offline = [], live = [];
  for (const p of population.pages) {
    const record = recordOf.get(p.build) ?? null;
    const isLive = p.population === POPULATION.LIVE;
    const documentUrl = isLive ? p.canonical : `${NO_ADDRESS_BASE}${encodeURIComponent(p.pageId)}`;
    let html = null, refused = null;
    if (!record || typeof record.html !== "string") refused = "NO_STORED_BUILD";
    else if (!isLive) html = record.html;
    else {
      const pub = publishedHtml(record, { url: p.canonical });
      if (pub.state !== "PUBLISHED") refused = `NOT_REPRODUCIBLE_${pub.reason}`;
      else if (pub.sha256 !== record.publishedSha256) refused = "PUBLISHED_BYTES_DIFFER";
      else html = pub.html;
    }
    const files = new Map();
    for (const a of list(record?.assets)) {
      const bytes = assetBytes(a.file);
      if (bytes === null || sha256(bytes) !== a.sha256) continue;
      files.set(new URL(a.name, documentUrl).href, Object.freeze({ body: bytes, contentType: contentTypeOf(a.name) }));
    }
    offline.push(Object.freeze({ pageId: p.pageId, population: p.population, documentUrl, html, files, refused }));
    if (isLive) live.push(Object.freeze({ pageId: p.pageId, url: p.canonical }));
  }
  return Object.freeze({ offline: Object.freeze(offline), live: Object.freeze(live), counts: population.counts });
}

const TYPES = Object.freeze({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", webp: "image/webp", gif: "image/gif" });
export const contentTypeOf = (name) => TYPES[String(name).split(".").at(-1).toLowerCase()] ?? "application/octet-stream";

/** The offline subresource handler of one job: a file its record names, at its own address, served locally; anything else refused. */
export const offlineFiles = (job) => async (url) => {
  const f = job.files.get(url);
  return f ? { served: true, local: true, status: 200, contentType: f.contentType, body: f.body } : { served: false, refusal: "OFFLINE" };
};

/**
 * The audit, from the STORED reads only. `expected`: { OFFLINE: [pageId], LIVE: [pageId] } — the population each mode must cover.
 * The latest stored read of each page in each mode is compared; a page with none is counted absent, never skipped.
 */
export function auditRenders({ reads = [], expected = { OFFLINE: [], LIVE: [] } }) {
  const out = {};
  for (const mode of Object.values(MODE)) {
    const ids = list(expected[mode]);
    const latest = new Map();
    for (const r of list(reads)) if (r?.record_type === RENDER_READ_RECORD && r.mode === mode && ids.includes(r.pageId)) latest.set(r.pageId, r);
    const comparisons = ids.filter((id) => latest.has(id)).map((id) => {
      const r = latest.get(id);
      return compareSourceRender({ renderState: r.renderState, renderReason: r.reason, pageUrl: r.url, sourceHtml: r.sourceHtml, renderedHtml: r.renderedHtml, sourceText: r.sourceText ?? null, renderedText: r.renderedText ?? null });
    });
    const absent = ids.filter((id) => !latest.has(id)).length;
    const s = summariseComparisons(comparisons, { pagesWithoutBody: absent });
    const notMeasured = DIMENSIONS.filter((d) => s.dimensions[d][NOT_MEASURED] > 0);
    out[mode] = Object.freeze({ ...s, absent, missing: Object.freeze([...(absent ? [`${absent} page(s) with no stored render`] : []), ...notMeasured.map((d) => `${d} NOT MEASURED on ${s.dimensions[d][NOT_MEASURED]} of ${s.pages}`)]) });
  }
  const incomplete = Object.values(out).some((m) => m.incomplete);
  const empty = Object.values(out).every((m) => m.pages === 0);
  return Object.freeze({ modes: Object.freeze(out), incomplete, empty });
}
