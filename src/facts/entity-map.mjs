/**
 * F47 · ENTITY RELATIONSHIP MAP (acceptance _handoffs ccd4c1e, RR-96).
 *
 * Spec row: "Represent important entities, attributes, questions, sources and relationships consistently." Historical row 27 (provenance):
 * "mapped consistently across pages and machine-readable data".
 *
 *   NODES   ENTITY (claim subject) · ATTRIBUTE (predicate) · SCOPE · SOURCE (cited source identity) · PUBLISHER · FACT · PAGE · QUESTION
 *   EDGES   ABOUT · HAS-ATTRIBUTE · IN-SCOPE · CITES · PUBLISHED-BY · PLACED (placement lists and page-spec claims) · ASKS (page → question)
 *   Built ONLY from recorded fields; questions come from each page's machine-readable data (F48's discoverBlocks), never from prose, and
 *   their text is never kept.
 *
 *   CONSISTENCY  a reference resolves to exactly one fact, or is UNRESOLVED (where named) — a reference in a list the subject names
 *                "awaiting" is DECLARED AWAITING, apart; one source identity has one publisher; one fact id is held once; entity names
 *                that differ only in case, spacing or punctuation are NEEDS A PERSON — never merged by the code.
 *   VERDICT      DISPROVED on any inconsistency · COULD-NOT-PROVE when anything is left open · PROVED only when nothing is.
 * Pure; names no product.
 */
import { discoverBlocks } from "../page/structured-data.mjs";

export const MAP_VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const AWAITING_LIST = "awaiting";

const fold = (s) => String(s ?? "").toLowerCase().replace(/[\s\p{P}]+/gu, "");

/** Every page-spec fact reference: each string in a section's `claims` list, with where it appears. */
export function specReferences(pageSpecs) {
  const out = [];
  for (const [spec, s] of Object.entries(pageSpecs ?? {})) {
    (s?.sections ?? []).forEach((sec, i) => { for (const c of sec?.claims ?? []) if (typeof c === "string") out.push({ ref: c, where: `spec ${spec} section ${i}` }); });
  }
  return out;
}

/**
 * Every placement entry, with the list it is in — EVERY entry, never only the strings: a declared pending claim (an object) is a
 * reference too, and dropping it would make an open reference silent (C2).
 */
export function placementReferences(placement) {
  const out = [];
  for (const [list, v] of Object.entries(placement ?? {})) if (Array.isArray(v)) for (const r of v) out.push({ ref: typeof r === "string" ? r : null, where: `placement ${list}`, list });
  return out;
}

/**
 * @param records     the fact registry's records
 * @param placement   the subject's declared placement lists
 * @param pageSpecs   the subject's page specs
 * @param pages       [{ pageId, html }] — the client's pages with stored bodies (html null = no stored body)
 */
export function buildEntityMap({ records, placement, pageSpecs, pages }) {
  const facts = records.filter((f) => f?.life?.status !== "retired");
  const idCount = new Map();
  for (const f of facts) idCount.set(f.id, (idCount.get(f.id) ?? 0) + 1);
  const entities = new Set(facts.map((f) => f.claim?.subject).filter(Boolean));
  const attributes = new Set(facts.map((f) => f.claim?.predicate).filter(Boolean));
  const scopes = new Set(facts.map((f) => f.scope).filter(Boolean));
  const publishersBySource = new Map();
  for (const f of facts) {
    const src = f.source?.url ?? f.source?.documentRef ?? null;
    if (!src) continue;
    if (!publishersBySource.has(src)) publishersBySource.set(src, new Set());
    if (f.source?.publisher) publishersBySource.get(src).add(f.source.publisher);
  }
  const publishers = new Set([...publishersBySource.values()].flatMap((s) => [...s]));

  /* C2 — references */
  const refs = [...placementReferences(placement), ...specReferences(pageSpecs)];
  const resolution = refs.map((r) => {
    /* a reference in the list the subject names "awaiting" is DECLARED AWAITING — never resolved, never broken */
    if (r.list === AWAITING_LIST) return { ...r, state: "DECLARED_AWAITING" };
    const n = r.ref === null ? 0 : idCount.get(r.ref) ?? 0;
    if (n === 1) return { ...r, state: "RESOLVED" };
    if (n > 1) return { ...r, state: "AMBIGUOUS" };
    return { ...r, state: "UNRESOLVED" };
  });

  /* C3 — one identity, one representation */
  const inconsistent = [
    ...[...idCount].filter(([, n]) => n > 1).map(([id]) => ({ kind: "FACT_ID_HELD_TWICE", id })),
    ...[...publishersBySource].filter(([, s]) => s.size > 1).map(([src]) => ({ kind: "SOURCE_WITH_TWO_PUBLISHERS", source: src })),
    ...resolution.filter((r) => r.state === "AMBIGUOUS").map((r) => ({ kind: "REFERENCE_RESOLVES_TWICE", where: r.where })),
  ];
  const byFold = new Map();
  for (const e of entities) byFold.set(fold(e), [...(byFold.get(fold(e)) ?? []), e]);
  const needsAPerson = [...byFold.values()].filter((g) => g.length > 1).map((g) => ({ kind: "ENTITY_NAMES_DIFFER_ONLY_IN_FORM", names: g.length }));

  /* C4 — questions from machine-readable data */
  const pageRows = pages.map((p) => {
    if (typeof p.html !== "string" || p.html === "") return { pageId: p.pageId, questions: null, missing: "a stored body" };
    const blocks = discoverBlocks(p.html);
    return { pageId: p.pageId, questions: blocks.flatMap((b) => b.texts).filter((t) => t.kind === "question").length, invalidBlocks: blocks.filter((b) => !b.valid).length };
  });
  const measured = pageRows.filter((r) => r.questions !== null);

  const count = (xs, k) => xs.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});
  const open = resolution.some((r) => r.state !== "RESOLVED") || needsAPerson.length > 0 || measured.length < pageRows.length;
  const verdict = inconsistent.length ? MAP_VERDICT.DISPROVED : open ? MAP_VERDICT.COULD_NOT_PROVE : MAP_VERDICT.PROVED;

  return Object.freeze({
    nodes: Object.freeze({ entities: entities.size, attributes: attributes.size, scopes: scopes.size, sources: publishersBySource.size, publishers: publishers.size, facts: facts.length, pages: pageRows.length, questions: measured.reduce((n, r) => n + r.questions, 0) }),
    edges: Object.freeze({ about: facts.filter((f) => f.claim?.subject).length, hasAttribute: facts.filter((f) => f.claim?.predicate).length, inScope: facts.filter((f) => f.scope).length, cites: facts.filter((f) => f.source?.url ?? f.source?.documentRef).length, publishedBy: [...publishersBySource.values()].reduce((n, s) => n + s.size, 0), placed: resolution.filter((r) => r.state === "RESOLVED").length, asks: measured.reduce((n, r) => n + r.questions, 0) }),
    references: Object.freeze({ total: resolution.length, byState: count(resolution, "state"), unresolvedWhere: resolution.filter((r) => r.state === "UNRESOLVED").map((r) => r.where) }),
    inconsistent,
    needsAPerson,
    pages: Object.freeze({ measured: measured.length, notMeasured: pageRows.length - measured.length, invalidBlocks: measured.reduce((n, r) => n + r.invalidBlocks, 0) }),
    verdict,
  });
}
