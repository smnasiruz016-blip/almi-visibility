/**
 * F16 · PRODUCT-LED RESEARCH ROUTES (RR-146 §2) — a declared product's EVIDENCED dimensions become BOUNDED research routes. Pure; it
 * fetches nothing and names no product, host, tenant or dimension.
 *
 *   DIMENSIONS   taken from F13's output (src/discovery/context-axes.mjs), never found again here: only a dimension the product DECLARES
 *                and F13 marks EVIDENCED yields routes. A NOT EVIDENCED declaration yields none, with its reason. An F13 CANDIDATE
 *                (discovered, not declared) never yields a route — discovery never declares.
 *   VALUES       the product's own declared values for that dimension (its axis variants, or a planning dimension's values) — never a
 *                value read from a question, a page or a lead.
 *   BOUNDED      one route for the declared research topic, plus one per declared value of each EVIDENCED dimension. Dimensions are NEVER
 *                multiplied into combined routes. The product of every discovered dimension's distinct values is printed as the
 *                CANDIDATE UNIVERSE, a count only, never a work plan (the owner's three-count ruling). Routes over the declared
 *                maxRoutes REFUSE the whole set; they are never silently truncated.
 *   FIVE KINDS   a PROPOSED ROUTE is not a SEARCH LEAD, a lead is not a VERIFIED PUBLIC QUESTION, and neither is a KEYWORD IDEA or a CLIENT
 *                CLAIM. Each has its own record type and its own count, and none is ever counted as another.
 *   DECLARED     the research block is the product's own declaration: { topic, maxRoutes, language?, sources: [{ sourceId, site }] }.
 *                With none, routes are NOT MEASURED, the missing declaration named. A client's staff MAY add seeds; nothing here needs
 *                them.
 */
import { createHash } from "node:crypto";

export const NOT_MEASURED = "NOT MEASURED";
export const RESEARCH_KINDS = Object.freeze({
  PROPOSED_ROUTE: "PROPOSED_ROUTE — a place to look, never a lead and never a question",
  SEARCH_LEAD: "SEARCH_LEAD — a hit from a source's own listing or search, never an observed question",
  VERIFIED_PUBLIC_QUESTION: "VERIFIED_PUBLIC_QUESTION — the author's own wording, read from its original post and rechecked",
  KEYWORD_IDEA: "KEYWORD_IDEA — a generated idea, never a question someone asked",
  CLIENT_CLAIM: "CLIENT_CLAIM — the client's own statement, never evidence",
});
export const ROUTE_RECORD = "research_route";
export const MISSING = Object.freeze({
  research: "the product's declared research block { topic, maxRoutes, sources }",
  topic: "a declared research topic",
  bound: "a declared maxRoutes (a positive integer)",
  sources: "at least one declared source { sourceId, site }",
});
const present = (v) => typeof v === "string" && v.trim() !== "";
const id = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);

/** The product's declared values for one declared dimension key: its axis variants, or a planning dimension's values; else null. */
export function declaredValuesOf(product, key) {
  if (product?.axis?.key === key && Array.isArray(product.variants)) return [...product.variants];
  const d = (product?.planning?.dimensions ?? []).find((x) => x?.key === key);
  return Array.isArray(d?.values) ? [...d.values] : null;
}

/**
 * @param {{ subject: string, product: object, axes: { declared: {key,status}[], candidates: {key}[], discovered: {key,distinctValues}[] } }} input
 * @returns routes (PROPOSED only), the candidate universe as a count, every exclusion with its reason, and refusals
 */
export function researchRoutes({ subject, product, axes }) {
  const r = product?.research;
  const refusals = [];
  if (!r || typeof r !== "object") refusals.push(MISSING.research);
  else {
    if (!present(r.topic)) refusals.push(MISSING.topic);
    if (!Number.isInteger(r.maxRoutes) || r.maxRoutes < 1) refusals.push(MISSING.bound);
    if (!Array.isArray(r.sources) || r.sources.length === 0 || r.sources.some((s) => !present(s?.sourceId) || !present(s?.site))) refusals.push(MISSING.sources);
  }
  const universe = (axes?.discovered ?? []).length ? (axes.discovered ?? []).reduce((n, d) => n * Math.max(1, d.distinctValues ?? 1), 1) : NOT_MEASURED;
  const excluded = [
    ...(axes?.declared ?? []).filter((d) => d.status !== "EVIDENCED").map((d) => ({ key: d.key, why: `declared but ${d.status} by F13 — no route until evidenced` })),
    ...(axes?.candidates ?? []).map((c) => ({ key: c.key, why: "an F13 CANDIDATE (discovered, not declared) — discovery never declares, so it yields no route" })),
  ];
  if (refusals.length) return { routes: NOT_MEASURED, refusals, universe, excluded, dimensionsUsed: [] };
  const evidenced = (axes?.declared ?? []).filter((d) => d.status === "EVIDENCED");
  const dimensionsUsed = [], noValues = [];
  const routes = [{ dimension: null, value: null }];
  for (const d of evidenced) {
    const values = declaredValuesOf(product, d.key);
    if (!values || values.length === 0) { noValues.push({ key: d.key, why: "EVIDENCED, but the product declares no values for it — no route" }); continue; }
    dimensionsUsed.push({ key: d.key, values: values.length });
    for (const v of values) routes.push({ dimension: d.key, value: v });
  }
  if (routes.length > r.maxRoutes) return { routes: NOT_MEASURED, refusals: [`ROUTE_BOUND_EXCEEDED — ${routes.length} route(s) against a declared maxRoutes of ${r.maxRoutes}; refused whole, never truncated`], universe, excluded: [...excluded, ...noValues], dimensionsUsed };
  const built = routes.map((x) => Object.freeze({
    record_type: ROUTE_RECORD, kind: "PROPOSED_ROUTE", route_id: id([subject, r.topic, x.dimension, x.value]), subject,
    topic: r.topic, dimension: x.dimension, value: x.value, status: "PROPOSED — not a lead, not a question",
  }));
  return { routes: Object.freeze(built), refusals: [], universe, excluded: [...excluded, ...noValues], dimensionsUsed };
}

/**
 * One route on one declared source → the parameters a collector would send (src/research/adapters/*-collector.mjs). A plan, never a
 * request: nothing here holds a transport. The query is the declared topic and, where the route has one, the declared value — never more.
 */
export function requestPlanFor(route, source, product) {
  if (route?.record_type !== ROUTE_RECORD || !present(source?.sourceId) || !present(source?.site)) return null;
  const q = [route.topic, route.value].filter(present).join(" ");
  return Object.freeze({ routeId: route.route_id, sourceId: source.sourceId, site: source.site, q, language: present(product?.research?.language) ? product.research.language : NOT_MEASURED });
}
