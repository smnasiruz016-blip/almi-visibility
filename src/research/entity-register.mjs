/**
 * 🔴 F49 · KNOWLEDGE GRAPH AND ENTITY-LINKING SUPPORT (acceptance _handoffs AlmiVisibility_F49_ACCEPTANCE_2026-10-18.md, RR-285 task 4).
 *
 *   C1 ONE ENTITY, ONE NAME   each mention resolves through the recorded entity list — canonical name and aliases, compared folded
 *                             (case, spacing, punctuation) — to exactly one entity; none is UNRESOLVED, two is AMBIGUOUS, each by name
 *   C2 APPROVED IDENTIFIERS   an identifier is attached only from Wikidata (an item page whose own "official website" statement names the
 *                             entity's official host) or from the entity's own official site (a stored READ on one of its official hosts),
 *                             with its source and read date; any other source is refused, named
 *   C3 NOTHING GUESSED        an entity with no such identifier is NO IDENTIFIER with the sources checked, their states and the date —
 *                             never an identifier from a name match
 *   C4 PAGE = DATA            every structured-data entry with a sameAs: its name is on the page and its sameAs is an identifier of the
 *                             entity that name resolves to — every mismatch named
 *   C5 OWN PRODUCT            the client's product entity comes only from the client's own declaration
 * Pure: records in, the register out. Names no product, tenant or host.
 */
export const RESOLVED = Object.freeze({ ONE: "RESOLVED", NONE: "UNRESOLVED", TWO: "AMBIGUOUS" });
export const ID_STATE = Object.freeze({ IDENTIFIED: "IDENTIFIED", NONE: "NO IDENTIFIER" });
export const ID_REFUSAL = Object.freeze({ SOURCE: "IDENTIFIER_SOURCE_NOT_APPROVED", NO_DATE: "IDENTIFIER_WITHOUT_ITS_READ_DATE", NAME_ONLY: "IDENTIFIER_FROM_A_NAME_MATCH" });
export const MISMATCH = Object.freeze({ NAME_NOT_ON_PAGE: "NAME_NOT_ON_THE_PAGE", UNRESOLVED: "NAME_RESOLVES_TO_NO_ONE_ENTITY", SAME_AS: "SAME_AS_IS_NOT_THE_ENTITYS" });
export const PRODUCT_REFUSAL = Object.freeze({ NOT_DECLARED: "PRODUCT_NOT_FROM_THE_CLIENTS_DECLARATION" });
export const WIKIDATA_HOST = "www.wikidata.org";

const fold = (s) => String(s ?? "").toLowerCase().replace(/[\s\p{P}]+/gu, "");
const hostOf = (u) => { try { return new URL(String(u)).host; } catch { return null; } };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** C1 · one mention → exactly one entity, or UNRESOLVED / AMBIGUOUS, by name. */
export function resolveMention(name, entities) {
  const f = fold(name);
  const hits = entities.filter((e) => [e.canonical, ...(e.aliases ?? [])].some((a) => fold(a) === f));
  if (hits.length === 1) return Object.freeze({ state: RESOLVED.ONE, entityId: hits[0].entityId });
  return Object.freeze({ state: hits.length ? RESOLVED.TWO : RESOLVED.NONE, name, ...(hits.length ? { entityIds: hits.map((e) => e.entityId) } : {}) });
}

const textOf = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
/**
 * C1 · the entity mentions of one published page: the responsible body of every claim the page shows (`bodyOf(claimId)`), and the body
 * named in every row of a table whose caption is about who requires a result ("… regulator …"), the part after the row's "place — ".
 */
export function pageMentions(page, bodyOf) {
  const out = [];
  for (const t of page.trace ?? []) { const b = bodyOf(t.claimId); if (b) out.push({ page: page.publishedUrl, name: b, where: `claim ${t.claimId}` }); }
  for (const t of String(page.html ?? "").matchAll(/<table class="cmp">([\s\S]*?)<\/table>/g)) {
    const caption = textOf(/<caption>([\s\S]*?)<\/caption>/.exec(t[1])?.[1] ?? "");
    if (!/regulator/i.test(caption)) continue;
    for (const r of t[1].matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>/g)) { const head = textOf(r[1]); out.push({ page: page.publishedUrl, name: head.split(/\s+—\s+/).at(-1), where: `table "${caption}" row "${head}"` }); }
  }
  return out;
}

/** C2 · a proposed identifier, accepted only from Wikidata or the entity's own official host, with its read date. */
export function acceptIdentifier(entity, candidate) {
  const host = hostOf(candidate?.source);
  if (candidate?.byName === true) return Object.freeze({ refused: ID_REFUSAL.NAME_ONLY });
  if (!(host === WIKIDATA_HOST || (entity.officialHosts ?? []).includes(host))) return Object.freeze({ refused: ID_REFUSAL.SOURCE });
  if (!DAY.test(candidate?.readOn ?? "")) return Object.freeze({ refused: ID_REFUSAL.NO_DATE });
  return Object.freeze({ identifier: Object.freeze({ scheme: host === WIKIDATA_HOST ? "WIKIDATA" : "OFFICIAL_SITE", value: candidate.value, source: candidate.source, readOn: candidate.readOn }) });
}

/** The identifier a stored read gives an entity: its official site from a READ on its own host; a Wikidata item only when the item's text names that host. */
export function identifierFromRead(entity, read) {
  if (read?.state !== "READ") return null;
  const host = hostOf(read.url);
  if ((entity.officialHosts ?? []).includes(host)) return { value: `https://${host}/`, source: read.url, readOn: read.readOn };
  if (host === WIKIDATA_HOST && typeof read.text === "string") {
    const q = /\/wiki\/(Q\d+)\b/.exec(read.landedUrl ?? "")?.[1];
    const named = (entity.officialHosts ?? []).some((h) => new RegExp(`official website[^]{0,200}?https?://(www\\.)?${h.replace(/^www\./, "").replace(/\./g, "\\.")}`, "i").test(read.text));
    if (q && named) return { value: q, source: read.url, readOn: read.readOn };
  }
  return null;
}

/** The one Wikidata page read for an entity (owner decision 1 of RR-285: one request per entity), by its English Wikipedia title. */
export const wikidataUrlOf = (e) => (e?.wikipediaTitle ? `https://${WIKIDATA_HOST}/wiki/Special:ItemByTitle/enwiki/${encodeURIComponent(e.wikipediaTitle.replace(/ /g, "_"))}` : null);

/** C2 + C3 · every entity's identifiers from the stored reads, or NO IDENTIFIER with what was checked. */
export function identify(entities, reads, { on }) {
  return entities.map((e) => {
    const mine = reads.filter((r) => (e.officialHosts ?? []).includes(hostOf(r.url)) || (hostOf(r.url) === WIKIDATA_HOST && wikidataUrlOf(e) === r.url));
    const ids = [], refused = [];
    for (const r of mine) { const c = identifierFromRead(e, r); if (!c) continue; const a = acceptIdentifier(e, c); if (a.identifier) { if (!ids.some((x) => x.scheme === a.identifier.scheme && x.value === a.identifier.value)) ids.push(a.identifier); } else refused.push(a.refused); }
    if (ids.length) return Object.freeze({ entityId: e.entityId, state: ID_STATE.IDENTIFIED, identifiers: Object.freeze(ids), refused });
    return Object.freeze({ entityId: e.entityId, state: ID_STATE.NONE, checked: Object.freeze(mine.map((r) => ({ url: r.url, state: r.state, reason: r.reason ?? null, readOn: r.readOn ?? null }))), on, line: "CHECKED_NOT_FOUND" });
  });
}

/** The JSON-LD entries of a page that carry a sameAs: [{ name, sameAs: [..] }]. */
export function sameAsEntries(html) {
  const out = [];
  for (const m of String(html ?? "").matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data; try { data = JSON.parse(m[1]); } catch { continue; }
    const walk = (v) => { if (Array.isArray(v)) return v.forEach(walk); if (v && typeof v === "object") { if (v.sameAs !== undefined) out.push({ name: v.name ?? null, sameAs: [].concat(v.sameAs) }); Object.values(v).forEach(walk); } };
    walk(data);
  }
  return out;
}
const visibleText = (html) => String(html ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");

/** C4 · every sameAs entry of a page checked against the visible page and the register. */
export function pageDataMismatches(html, entities, identified) {
  const text = fold(visibleText(html));
  const out = [];
  for (const s of sameAsEntries(html)) {
    if (!s.name || !text.includes(fold(s.name))) { out.push({ name: s.name, mismatch: MISMATCH.NAME_NOT_ON_PAGE }); continue; }
    const r = resolveMention(s.name, entities);
    if (r.state !== RESOLVED.ONE) { out.push({ name: s.name, mismatch: MISMATCH.UNRESOLVED }); continue; }
    const ids = (identified.find((x) => x.entityId === r.entityId)?.identifiers ?? []).map((i) => (i.scheme === "WIKIDATA" ? `https://www.wikidata.org/wiki/${i.value}` : i.value));
    for (const v of s.sameAs) if (!ids.includes(v)) out.push({ name: s.name, sameAs: v, mismatch: MISMATCH.SAME_AS });
  }
  return out;
}

/** C5 · the client's product entity, only from its own declaration: `declaration` is the subject's descriptor as read, with its path. */
export function productEntity(declaration) {
  if (declaration?.kind !== "OWNER_DECLARED_SUBJECT" || typeof declaration?.ownerValues?.product !== "string" || typeof declaration?.path !== "string") return Object.freeze({ refused: PRODUCT_REFUSAL.NOT_DECLARED });
  const canonical = declaration.ownerValues.product.split(/\s+[—-]\s+/)[0].trim();
  return Object.freeze({ entityId: `product:${declaration.subjectId}`, canonical, kind: "PRODUCT", aliases: Object.freeze([canonical]), source: Object.freeze({ kind: "CLIENT_DECLARATION", path: declaration.path }) });
}
