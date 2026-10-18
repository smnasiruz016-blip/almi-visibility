/**
 * 🔴 F61 · BRAND MENTION MONITORING (acceptance _handoffs AlmiVisibility_F61_ACCEPTANCE_2026-10-18.md, RR-287 task F). Free data only (owner
 * decision 3 of RR-285). Pure: records in, mentions out — no file, network, process or clock. Names no product, host or tenant: the brand is
 * the client's own product entity (F49 C5, from its own declaration) and every other entity is F49's register.
 *
 *   C1  every mention comes from a Links export row, a query in the client's own Search Console export that names the brand, a stored read,
 *       or a supplied file — each with its source and date; 0 is stated as 0
 *   C2  each mention is LINKED (a link row to the client's site) or UNLINKED — never both, never merged
 *   C3  a mention counts only when the brand's name in it resolves to the client's own product entity and to no other; a name another
 *       entity also carries is a NAMESAKE, listed apart, named
 *       (a page on the client's OWN site naming its own brand is not a public mention: listed apart as OWN_SITE, never counted)
 *   C4  two dated exports give mentions gained and lost — NOT MEASURED, the missing export named, until then
 */
export const MENTION_SOURCE = Object.freeze({ LINKS: "SEARCH_CONSOLE_LINKS_EXPORT", QUERY: "SEARCH_CONSOLE_QUERY", READ: "STORED_READ", FILE: "CLIENT_SUPPLIED_FILE" });
export const MENTION = Object.freeze({ LINKED: "LINKED", UNLINKED: "UNLINKED" });
export const WAITS = Object.freeze({ C4: "a second dated export of the client's own" });
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const fold = (s) => ` ${String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
const namesIn = (text, names) => (names ?? []).filter((n) => String(n ?? "").trim() !== "" && fold(text).includes(fold(n)));

/**
 * Candidate mentions from the client's own data. `links`: link rows from its Links exports ({ from, to, exportedOn, file }); `queries`: its
 * Search Console query records ({ phrase, date, source }); `reads`: its stored reads ({ url, readOn, state, text }); `files`: supplied
 * mention rows ({ url, date, text, file }). Each mention keeps its source and date.
 */
export function candidateMentions({ product, links = [], queries = [], reads = [], files = [] }) {
  const names = product?.aliases ?? [];
  const out = [];
  for (const l of links) out.push({ source: MENTION_SOURCE.LINKS, where: l.from ?? null, on: l.exportedOn ?? null, text: l.anchor ?? "", linked: true, file: l.file ?? null });
  for (const q of queries) if (namesIn(q.phrase, names).length) out.push({ source: MENTION_SOURCE.QUERY, where: null, on: q.date ?? null, text: q.phrase, linked: false });
  for (const r of reads) if (r?.state === "READ" && typeof r.text === "string" && namesIn(r.text, names).length) out.push({ source: MENTION_SOURCE.READ, where: r.url, on: r.readOn ?? null, text: null, named: namesIn(r.text, names), linked: false });
  for (const f of files) if (namesIn(f.text, names).length) out.push({ source: MENTION_SOURCE.FILE, where: f.url ?? null, on: f.date ?? null, text: f.text, linked: f.linked === true, file: f.file ?? null });
  return out;
}

/** C1–C3 · the mentions, each traced, classed LINKED or UNLINKED, and resolved to the client's own entity — namesakes listed apart. */
export function brandMentions({ product, entities = [], links = [], queries = [], reads = [], files = [], ownHosts = [] }) {
  if (!product?.entityId || !(product.aliases ?? []).length) return Object.freeze({ measured: false, missing: "the client's own product entity, from its own declaration (F49 C5)" });
  const others = entities.filter((e) => e?.entityId !== product.entityId);
  const mentions = [], namesakes = [], untraced = [], ownSite = [];
  const own = new Set(ownHosts.map((h) => String(h).toLowerCase().replace(/^www\./, "")));
  const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };
  for (const m of candidateMentions({ product, links, queries, reads, files })) {
    if (!ISO.test(m.on ?? "") || !Object.values(MENTION_SOURCE).includes(m.source)) { untraced.push(Object.freeze({ ...m, why: "no source or no date — not a mention" })); continue; }
    if (m.source !== MENTION_SOURCE.LINKS && m.where && own.has(hostOf(m.where))) { ownSite.push(Object.freeze({ source: m.source, where: m.where, on: m.on })); continue; }
    const named = m.named ?? namesIn(m.text, product.aliases);
    /* C3: the brand's name in it also names another entity (one of its aliases) — a namesake, never the client */
    const shared = others.filter((e) => named.some((n) => (e.aliases ?? [e.canonical]).some((a) => fold(a) === fold(n))));
    const row = Object.freeze({ source: m.source, where: m.where, on: m.on, class: m.linked ? MENTION.LINKED : MENTION.UNLINKED });
    if (m.source !== MENTION_SOURCE.LINKS && shared.length) namesakes.push(Object.freeze({ ...row, alsoNames: Object.freeze(shared.map((e) => e.entityId)) }));
    else mentions.push(row);
  }
  const n = (c) => mentions.filter((m) => m.class === c).length;
  return Object.freeze({
    measured: true, entity: product.entityId,
    mentions: Object.freeze(mentions), namesakes: Object.freeze(namesakes), untraced: Object.freeze(untraced), ownSite: Object.freeze(ownSite),
    counts: Object.freeze({ mentions: mentions.length, LINKED: n(MENTION.LINKED), UNLINKED: n(MENTION.UNLINKED), namesakes: namesakes.length, untraced: untraced.length, ownSite: ownSite.length, bySource: Object.freeze(Object.fromEntries(Object.values(MENTION_SOURCE).map((s) => [s, mentions.filter((m) => m.source === s).length]))) }),
  });
}

/** C4 · mentions gained and lost between two export dates — NOT MEASURED, the missing export named: not built until a second export exists. */
export function mentionsOverTime({ exportDates = [] }) {
  const days = [...new Set(exportDates.filter((d) => ISO.test(d ?? "")))].sort();
  return Object.freeze({ measured: false, missing: days.length < 2 ? WAITS.C4 : "C4 is built when the second export arrives — it is not built yet", exports: days.length });
}
