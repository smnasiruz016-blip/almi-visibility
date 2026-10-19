/**
 * 🔴 F96 · E-COMMERCE VISIBILITY (acceptance _handoffs AlmiVisibility_F96_ACCEPTANCE_2026-10-18.md, RR-287 task G; built in RR-290 under the
 * owner's light-proof rule, beta-g decision B). For a project that declares it sells listed products and names its own feed or listing files:
 * its feed matched to its verified facts (C2), its merchant-listing export matched to its feed (C3), and every paginated or filter URL of its
 * own crawl classed (C4). Any other project is NOT APPLICABLE, by name, with the reason (C1), and shows no F96 number at all (C5).
 *
 * The declaration is the project's own commerce file: { sellsListedProducts: true|false, reason?, feedFiles?: string[], listingFiles?: string[] }.
 * Nothing is fetched, crawled, bought, edited or sent. Pure: records in, a verdict out. Names no product, host or tenant.
 */

export const F96_STATE = Object.freeze({ APPLICABLE: "APPLICABLE", NOT_APPLICABLE: "NOT APPLICABLE" });
export const NO_DECLARATION = "the project files no commerce declaration: it does not declare that it sells listed products";
export const FIELDS = Object.freeze(["name", "price", "currency", "availability", "identifier"]);
export const FACET = Object.freeze({ OWN_CONTENT: "INDEXABLE_WITH_OWN_CONTENT", CANONICAL: "CANONICAL_TO_PARENT", BLOCKED: "NOINDEX_OR_BLOCKED", NEAR_COPY: "NEAR_COPY_LEFT_INDEXABLE" });
/** C4's declared near-copy rule: share of the parent's 5-word sequences the page repeats, at or above which an indexable page is a near-copy. */
export const NEAR_COPY_SHARE = 0.9;

const present = (v) => typeof v === "string" && v.trim() !== "";
const files = (v) => (Array.isArray(v) ? v.filter(present) : []);

/** C1 · one declared project's applicability, from its own commerce declaration (or none). */
export function applicability({ projectId, declaration }) {
  if (!present(projectId)) throw new TypeError("a project id");
  const d = declaration && typeof declaration === "object" ? declaration : null;
  const feeds = files(d?.feedFiles), listings = files(d?.listingFiles);
  if (d?.sellsListedProducts === true && feeds.length + listings.length > 0)
    return Object.freeze({ projectId, state: F96_STATE.APPLICABLE, reason: null, feedFiles: Object.freeze(feeds), listingFiles: Object.freeze(listings) });
  const reason = !d ? NO_DECLARATION
    : d.sellsListedProducts === true ? "it declares that it sells listed products but names no feed or listing file of its own"
    : present(d.reason) ? d.reason.trim() : "it declares that it sells no listed product";
  return Object.freeze({ projectId, state: F96_STATE.NOT_APPLICABLE, reason });
}

const idOf = (p) => [p?.gtin, p?.mpn, p?.sku, p?.id].find(present) ?? null;
const norm = (v) => (typeof v === "number" ? String(v) : present(v) ? v.trim().toLowerCase() : null);
const fieldOf = (p, f) => (f === "identifier" ? idOf(p) : p?.[f]);

/** C2 · every feed product against its verified facts (matched by identifier): MATCH, DIFFERENT (each field named) or UNVERIFIED. */
export function feedAgainstFacts({ feed = [], facts = [] }) {
  const byId = new Map(facts.filter((f) => idOf(f)).map((f) => [idOf(f), f]));
  const products = feed.map((p) => {
    const id = idOf(p);
    const fact = id ? byId.get(id) : null;
    if (!fact) return Object.freeze({ id, verdict: "UNVERIFIED", differences: Object.freeze([]), why: id ? "no verified fact for this identifier" : "the feed row carries no identifier" });
    const differences = FIELDS.filter((f) => norm(fieldOf(p, f)) !== norm(fieldOf(fact, f))).map((f) => Object.freeze({ field: f, feed: fieldOf(p, f) ?? null, verified: fieldOf(fact, f) ?? null }));
    return Object.freeze({ id, verdict: differences.length ? "DIFFERENT" : "MATCH", differences: Object.freeze(differences), why: null });
  });
  const count = (v) => products.filter((x) => x.verdict === v).length;
  return Object.freeze({ products: Object.freeze(products), counts: Object.freeze({ products: products.length, MATCH: count("MATCH"), DIFFERENT: count("DIFFERENT"), UNVERIFIED: count("UNVERIFIED") }) });
}

/** C3 · the merchant-listing export against the feed: each field difference named, and each product on one side only named. */
export function listingsAgainstFeed({ feed = [], listings = [] }) {
  const f = new Map(feed.filter((p) => idOf(p)).map((p) => [idOf(p), p]));
  const l = new Map(listings.filter((p) => idOf(p)).map((p) => [idOf(p), p]));
  const differences = [];
  for (const [id, item] of l) {
    if (!f.has(id)) { differences.push(Object.freeze({ id, kind: "LISTED_NOT_IN_FEED" })); continue; }
    for (const field of FIELDS) if (norm(fieldOf(item, field)) !== norm(fieldOf(f.get(id), field))) differences.push(Object.freeze({ id, kind: "FIELD_DIFFERS", field, listing: fieldOf(item, field) ?? null, feed: fieldOf(f.get(id), field) ?? null }));
  }
  for (const id of f.keys()) if (!l.has(id)) differences.push(Object.freeze({ id, kind: "IN_FEED_NOT_LISTED" }));
  return Object.freeze({ differences: Object.freeze(differences), counts: Object.freeze({ listed: l.size, inFeed: f.size, differences: differences.length }) });
}

const PAGINATION = /^(page|p|pg|offset|start)$/i;
/** Whether a URL is paginated or a filter (facet) URL, and its parent (the URL with those parameters, or a trailing /page/N, removed). */
export function facetOf(url) {
  let u; try { u = new URL(url); } catch { return null; }
  const params = [...u.searchParams.keys()];
  const pathPage = /\/page\/\d+\/?$/i.test(u.pathname);
  if (!params.length && !pathPage) return null;
  const parent = new URL(u.origin + u.pathname.replace(/\/page\/\d+\/?$/i, "/"));
  return Object.freeze({ paginated: pathPage || params.some((k) => PAGINATION.test(k)), filtered: params.some((k) => !PAGINATION.test(k)), parent: parent.href });
}
const shingles = (t) => { const w = String(t ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []; const s = new Set(); for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" ")); return s; };
const sameUrl = (a, b) => { try { const x = new URL(a), y = new URL(b); return x.origin === y.origin && x.pathname.replace(/\/$/, "") === y.pathname.replace(/\/$/, "") && x.search === y.search; } catch { return false; } };

/**
 * C4 · every paginated or filter URL of the client's own crawl, classed. A page: { url, canonical?, noindex?, blocked?, text? }.
 * Blocked or noindex → NOINDEX_OR_BLOCKED; a canonical elsewhere (to its parent) → CANONICAL_TO_PARENT; indexable and repeating its parent's
 * text at or above NEAR_COPY_SHARE → NEAR_COPY_LEFT_INDEXABLE (named); otherwise INDEXABLE_WITH_OWN_CONTENT.
 */
export function classFacetPages({ pages = [] }) {
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const classed = [];
  for (const p of pages) {
    const f = facetOf(p.url);
    if (!f) continue;
    let cls;
    if (p.blocked === true || p.noindex === true) cls = FACET.BLOCKED;
    else if (present(p.canonical) && !sameUrl(p.canonical, p.url)) cls = FACET.CANONICAL;
    else {
      const parent = [...byUrl.values()].find((x) => sameUrl(x.url, f.parent));
      const mine = shingles(p.text), theirs = shingles(parent?.text);
      const share = theirs.size ? [...theirs].filter((s) => mine.has(s)).length / theirs.size : 0;
      cls = parent && share >= NEAR_COPY_SHARE ? FACET.NEAR_COPY : FACET.OWN_CONTENT;
    }
    classed.push(Object.freeze({ url: p.url, parent: f.parent, paginated: f.paginated, filtered: f.filtered, class: cls }));
  }
  const count = (c) => classed.filter((x) => x.class === c).length;
  return Object.freeze({ pages: Object.freeze(classed), nearCopies: Object.freeze(classed.filter((x) => x.class === FACET.NEAR_COPY).map((x) => x.url)),
    counts: Object.freeze({ facetPages: classed.length, [FACET.OWN_CONTENT]: count(FACET.OWN_CONTENT), [FACET.CANONICAL]: count(FACET.CANONICAL), [FACET.BLOCKED]: count(FACET.BLOCKED), [FACET.NEAR_COPY]: count(FACET.NEAR_COPY) }) });
}

/**
 * C5 · the report's F96 lines for one project. NOT APPLICABLE: exactly one line, its name and reason, and no number. APPLICABLE: one line per
 * measured part; a part whose files are not filed reads NOT MEASURED, never zero.
 */
export function f96Lines({ verdict, feed = null, listings = null, facets = null }) {
  if (verdict?.state !== F96_STATE.APPLICABLE) return Object.freeze([`F96 · ${verdict?.projectId ?? "?"} — NOT APPLICABLE: ${verdict?.reason ?? NO_DECLARATION}`]);
  const nm = (what) => `NOT MEASURED — ${what} not filed`;
  return Object.freeze([
    `F96 · ${verdict.projectId} — APPLICABLE (feed files ${verdict.feedFiles.length}, listing files ${verdict.listingFiles.length})`,
    `  feed vs facts    ${feed ? `${feed.counts.products} product(s): MATCH ${feed.counts.MATCH} · DIFFERENT ${feed.counts.DIFFERENT} · UNVERIFIED ${feed.counts.UNVERIFIED}` : nm("the feed or its verified facts")}`,
    `  listing vs feed  ${listings ? `${listings.counts.listed} listed · ${listings.counts.differences} difference(s) named` : nm("the merchant-listing export")}`,
    `  facet pages      ${facets ? `${facets.counts.facetPages} classed · near-copies left indexable ${facets.counts[FACET.NEAR_COPY]}` : nm("the client's own crawl")}`,
  ]);
}
