/**
 * F82 · ONE CLIENT'S INDEX STATES, FROM RECORDED OWNED SEARCH EVIDENCE (acceptance _handoffs 25c7f49, RR-92).
 *
 *   pages                    F31's inventory
 *   page windows             the recorded owned Search Console page rows (F43's reader: declared host, then the client's own pages)
 *   queries observed         the recorded owned query-page rows, attributed the same way, counted per page (count-only)
 *   indexability             F21 — reported beside the index state, never as it
 *   inspections / coverage   NONE recorded — the caller passes them EXPLICITLY
 * Owned evidence only: never public research, never demand. Count-only output; no page content, host, URL or query.
 */
import { existsSync } from "node:fs";
import { createJsonlStore } from "../evidence/store.mjs";
import { partitionRowsByDeclaredHost } from "../tenancy/row-partition.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { readClientIndexabilitySignals } from "../audit/indexability-reader.mjs";
import { clientPerformance, EVIDENCE_STORE } from "./content-decay-evidence.mjs";
import { indexState, indexingChecks, summariseIndexation } from "./indexation.mjs";

export const QUERY_PAGE_METHOD = "gsc.searchAnalytics.query:query-page";
const pageIdOf = (url) => { try { return targetPageId(canonicalUrl(url)); } catch { return null; } };

/** Distinct queries per client page, from the latest recorded owned query-page rows — attributed by declared host, then own pages. */
export function clientQueriesPerPage({ tenantId, resolve, pageIds, path = EVIDENCE_STORE }) {
  if (!existsSync(path)) return new Map();
  const latest = createJsonlStore(path).readAll().filter((r) => r.record_type === "observation" && r.method === QUERY_PAGE_METHOD)
    .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at))).at(-1);
  if (!latest) return new Map();
  const p = partitionRowsByDeclaredHost({ rows: (latest.value?.rows ?? []).map((row) => ({ url: row.url, row })), resolve });
  const out = new Map();
  for (const { row } of p.byTenant[tenantId] ?? []) {
    const id = pageIdOf(row.url);
    if (!id || !pageIds.has(id)) continue;
    if (!out.has(id)) out.set(id, new Set());
    out.get(id).add(row.query);
  }
  return new Map([...out].map(([id, s]) => [id, s.size]));
}

export function readClientIndexation({ tenantId, resolve, inspections, env = process.env, now = new Date(), storePath = EVIDENCE_STORE }) {
  if (!Array.isArray(inspections)) throw new TypeError("inspections must be passed explicitly — an empty list is a recorded fact, not a default");
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const pageIds = new Set(population.inventory.pages.map((p) => p.pageId));
  const perf = clientPerformance({ tenantId, resolve, pageIds, path: storePath });
  const queries = clientQueriesPerPage({ tenantId, resolve, pageIds, path: storePath });
  const signals = new Map(readClientIndexabilitySignals({ tenantId, resolve, env }).urls.map((u) => [u.pageId, u.state]));
  const states = [...pageIds].map((pageId) => indexState({
    pageId,
    observation: perf.byPage.get(pageId) ?? null,
    inspection: inspections.find((i) => i.pageId === pageId) ?? null,
    indexability: signals.get(pageId) ?? "NOT_MEASURED",
    /* a page with no recorded query-page row has queries NOT OBSERVED (Search Console withholds rare queries) — never zero */
    queries: queries.get(pageId) ?? null,
  }));
  return {
    fault: null,
    states,
    summary: summariseIndexation(states),
    indexingChecks: indexingChecks(states),
    bound: `recorded data only · OWNED Search Console evidence · ${states.length} page(s) · window ${perf.window ? `${perf.window.start}..${perf.window.end}` : "NONE"} · inspections ${inspections.length} · no inspection request, no live call · ${states[0]?.notice ?? "INDEXABLE ≠ INDEXED"}`,
  };
}
