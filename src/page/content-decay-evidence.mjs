/**
 * F43 · ONE CLIENT'S DECAY EVIDENCE, FROM RECORDED STRUCTURES ONLY (acceptance _handoffs 6c7627a, RR-91).
 *
 *   pages, served states, completeness   F31 (src/page/existing-page-population.mjs)
 *   performance                          the RECORDED Search Console page rows in the shared evidence store — the latest page-rows
 *                                        observation, attributed by DECLARED host (src/tenancy/row-partition.mjs, as F21 reads its
 *                                        store) and then kept only where the row maps to one of this client's inventory pages
 *   technical state                      F21 (src/audit/indexability-reader.mjs) and the recorded served state
 *   no successor                         recorded only when no other page shares the need (F33) within a COMPLETE inventory
 *   publication dates · improvements · re-measurements · indexing checks   NONE recorded — the caller passes them EXPLICITLY; a
 *                                        recorded indexing check ({ pageId, state: CLEAR | BLOCKED, ref }) is consulted only where F21
 *                                        cannot decide (NOT_MEASURED) — it never overrides a recorded F21 contradiction
 * Count-only output; no page content, host, URL or query.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJsonlStore } from "../evidence/store.mjs";
import { partitionRowsByDeclaredHost } from "../tenancy/row-partition.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { readClientIndexabilitySignals } from "../audit/indexability-reader.mjs";
import { sameNeedPeers } from "./action-evidence.mjs";
import { assessPage, summariseDecay } from "./content-decay.mjs";

export const EVIDENCE_STORE = fileURLToPath(new URL("../../runs/evidence/evidence.jsonl", import.meta.url));
export const PAGE_ROWS_METHOD = "gsc.searchAnalytics.query:page-rows";
/** None of these is recorded today and no store of them exists: [] is that recorded fact. Callers pass it EXPLICITLY. */
export const NO_RECORDED_DECAY_EVIDENCE = Object.freeze({ publications: Object.freeze([]), improvements: Object.freeze([]), remeasures: Object.freeze([]), indexing: Object.freeze([]) });

const pageIdOf = (url) => { try { return targetPageId(canonicalUrl(url)); } catch { return null; } };

/** The latest recorded page-rows window, attributed to this tenant by declared host, keyed by this tenant's own page ids. */
export function clientPerformance({ tenantId, resolve, pageIds, path = EVIDENCE_STORE }) {
  if (!existsSync(path)) return { byPage: new Map(), window: null, rows: 0, attributed: 0, rejected: 0, readable: false };
  const obs = createJsonlStore(path).readAll().filter((r) => r.record_type === "observation" && r.method === PAGE_ROWS_METHOD)
    .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));
  const latest = obs.at(-1);
  if (!latest) return { byPage: new Map(), window: null, rows: 0, attributed: 0, rejected: 0, readable: true };
  const rows = (latest.value?.rows ?? []).map((row) => ({ url: row.url, row }));
  const p = partitionRowsByDeclaredHost({ rows, resolve });
  const byPage = new Map();
  for (const { row } of p.byTenant[tenantId] ?? []) {
    const id = pageIdOf(row.url);
    if (!id || !pageIds.has(id)) continue;
    const cur = byPage.get(id);
    const impressions = (cur?.impressions ?? 0) + (Number(row.impressions) || 0);
    byPage.set(id, { windowStart: latest.value.startDate, windowEnd: latest.value.endDate, impressions, ref: latest.observation_id });
  }
  return { byPage, window: { start: latest.value.startDate, end: latest.value.endDate }, rows: rows.length, attributed: (p.byTenant[tenantId] ?? []).length, rejected: p.rejected.length, readable: true };
}

export function readClientDecay({ tenantId, resolve, values = [], decayEvidence, env = process.env, now = new Date(), storePath = EVIDENCE_STORE }) {
  const d = decayEvidence;
  if (!d || !Array.isArray(d.publications) || !Array.isArray(d.improvements) || !Array.isArray(d.remeasures) || !Array.isArray(d.indexing)) {
    throw new TypeError("decay evidence must be passed explicitly (publications, improvements, remeasures, indexing) — an empty list is a recorded fact, not a default");
  }
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const pages = population.inventory.pages;
  const perf = clientPerformance({ tenantId, resolve, pageIds: new Set(pages.map((p) => p.pageId)), path: storePath });
  const signals = new Map(readClientIndexabilitySignals({ tenantId, resolve, env }).urls.map((u) => [u.pageId, u]));
  const complete = population.completeness.state === "COMPLETE";
  const peers = complete ? sameNeedPeers(population.pages, values) : null;
  const find = (list, id) => list.find((x) => x.pageId === id) ?? null;
  /* where F21 cannot decide, a RECORDED indexing check may: CLEAR only with a recorded successful served state as well */
  const indexingCheck = (id, served) => {
    const c = d.indexing.find((x) => x.pageId === id && typeof x.ref === "string" && x.ref !== "");
    if (c?.state === "BLOCKED") return { state: "BLOCKED", evidence: [c.ref] };
    if (c?.state === "CLEAR" && served !== null && served >= 200 && served < 300) return { state: "CLEAR", evidence: [c.ref, `served ${served}`] };
    return { state: "UNKNOWN", evidence: [] };
  };

  const assessments = pages.map((p) => {
    const s = signals.get(p.pageId);
    const served = p.servedState.state === "OBSERVED" ? p.servedState.status : null;
    const technical = s?.state === "CONTRADICTED" || (served !== null && (served < 200 || served >= 300))
      ? { state: "BLOCKED", evidence: [s?.state === "CONTRADICTED" ? `F21 CONTRADICTED ${s.classes.join(",")}` : null, served !== null && (served < 200 || served >= 300) ? `served ${served}` : null] }
      : s?.state === "CONSISTENT" && served !== null ? { state: "CLEAR", evidence: ["F21 CONSISTENT", `served ${served}`] }
      : indexingCheck(p.pageId, served);
    const pub = find(d.publications, p.pageId);
    return assessPage({
      pageId: p.pageId,
      publishedOn: pub?.publishedOn ?? null,
      performance: perf.byPage.get(p.pageId) ?? null,
      technical,
      improvement: find(d.improvements, p.pageId),
      remeasure: find(d.remeasures, p.pageId),
      notServed: served !== null && served >= 400 ? { ref: `served:${served}:${p.pageId}` } : null,
      noSuccessor: peers && (peers.get(p.pageId)?.size ?? 0) === 0 ? { ref: `no-same-need-page-in-a-COMPLETE-inventory:${p.pageId}` } : null,
    });
  });

  const covered = assessments.filter((a) => perf.byPage.has(a.pageId)).length;
  return {
    fault: null,
    assessments,
    summary: summariseDecay(assessments),
    performance: { window: perf.window, rows: perf.rows, attributed: perf.attributed, rejected: perf.rejected, pagesCovered: covered, pagesNotCovered: assessments.length - covered },
    bound: `recorded data only · ${assessments.length} page(s) · performance window ${perf.window ? `${perf.window.start}..${perf.window.end}` : "NONE"} covering ${covered} of ${assessments.length} page(s) · publication dates ${d.publications.length} · improvements ${d.improvements.length} · re-measurements ${d.remeasures.length} · indexing checks ${d.indexing.length} · inventory ${population.completeness.state} · nothing collected`,
  };
}
