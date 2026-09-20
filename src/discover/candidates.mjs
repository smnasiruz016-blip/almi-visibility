/**
 * AUTOMATIC CANDIDATE DISCOVERY for the four capabilities that had none: A, B, E and F's source half.
 *
 * ── 🔴 THE RULE THAT SHAPES ALL FOUR ────────────────────────────────────────────────────────────
 *
 * A BINDING IS AN EDGE SOMEBODY ELSE WROTE, NOT A RESEMBLANCE WE NOTICED. A shared word, a matching
 * number or a similar name is never a binding. Every bind below rests on something reproducible and
 * machine-checkable — an import statement, an exported identifier used by name, a route derived from
 * a published framework convention, a citation the document itself carries.
 *
 * The reason is the exam's own arithmetic: a clean page must come back CLEAN on the comparators that
 * examine it, and a FINDING on any control is an outright fail. A binder that guesses will eventually
 * bind a correct page to an unrelated collection and invent a defect. So an unbound candidate stays
 * visible and returns UNKNOWN; it never becomes a relationship.
 *
 * 🔴 AND "NOTHING OF THIS KIND HERE" IS NOT UNKNOWN. It is NOT_APPLICABLE, carried separately, and
 * unscored — see src/detect/outcome.mjs. Collapsing the two would fail every control automatically.
 */
import { routeOf, pathOfUrl, renderedLinksOf } from "./corpus.mjs";

/** The record every candidate carries. §3's contract, enforced rather than described. */
export function candidate({ type, comparator, value, origin, location, method, bindingEvidence, confidence, boundTo = null }) {
  for (const [k, v] of Object.entries({ type, comparator, origin, location, method, confidence })) {
    if (typeof v !== "string" || v.trim() === "") throw new TypeError(`candidate.${k} is required`);
  }
  return Object.freeze({
    type, comparator, value, origin, location, method,
    bindingEvidence: Object.freeze([...(bindingEvidence ?? [])]),
    confidence, boundTo, bound: boundTo !== null,
  });
}

/* ================================================================================================
 * A · CLAIM ↔ PRODUCER
 * ================================================================================================
 *
 * A producer is an exported, machine-readable CLOSED SET of short tokens — a frozen array or a
 * string-union type. A claim is a rendered enumeration of short tokens of the same shape.
 *
 * 🔴 THE BINDING IS THE EXPORTED IDENTIFIER, USED BY NAME. A page is bound to a producer only where
 * the page's own source module references that producer's exported name, directly or through an
 * import. Overlapping values alone bind NOTHING: two unrelated closed sets of letters would
 * otherwise bind to each other and invent a defect on a correct page.
 */
const TOKEN_SET = /^[A-Za-z][A-Za-z0-9+.\-]{0,11}$/;

export function discoverProducers(files) {
  const producers = [];
  for (const f of files) {
    for (const m of f.text.matchAll(/export\s+(?:const|let)\s+([A-Z][A-Z0-9_]{2,40})\s*(?::[^=]*)?=\s*(?:Object\.freeze\(\s*)?\[([^\]]{0,400})\]/g)) {
      const values = m[2].split(",").map((s) => s.trim().replace(/^["'`]|["'`]$/g, "")).filter((s) => TOKEN_SET.test(s));
      if (values.length >= 2) producers.push(candidate({
        type: "producer-value-set", comparator: "A", value: values,
        origin: f.path, location: `${f.path}:${m[1]}`, method: "exported frozen array of short tokens",
        bindingEvidence: [`exported identifier ${m[1]}`], confidence: "exact: the values are literals in the export",
        boundTo: m[1],
      }));
    }
    for (const m of f.text.matchAll(/export\s+type\s+([A-Z][A-Za-z0-9_]{2,40})\s*=\s*([^;]{0,300});/g)) {
      const values = [...m[2].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]).filter((s) => TOKEN_SET.test(s));
      if (values.length >= 2) producers.push(candidate({
        type: "producer-value-set", comparator: "A", value: values,
        origin: f.path, location: `${f.path}:${m[1]}`, method: "exported string-union type",
        bindingEvidence: [`exported type ${m[1]}`], confidence: "exact: the members are literals in the type",
        boundTo: m[1],
      }));
    }
  }
  return producers;
}

/** A rendered enumeration: "A, B, C or D" / "A–E" — a closed list of short tokens shown to a reader. */
export function discoverValueClaims(files, producers) {
  const exported = new Set(producers.map((p) => p.boundTo));
  const claims = [];
  for (const f of files) {
    const referenced = [...exported].filter((name) => new RegExp(`\\b${name}\\b`).test(f.text));
    for (const m of f.text.matchAll(/["'`]([A-Za-z0-9+]{1,12}(?:\s*(?:,|–|—|-|\bor\b|\bto\b)\s*[A-Za-z0-9+]{1,12}){1,9})["'`]/g)) {
      const raw = m[1];
      const parts = raw.split(/\s*(?:,|–|—|-|\bor\b|\bto\b)\s*/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2 || !parts.every((p) => TOKEN_SET.test(p))) continue;
      const isRange = /–|—|-|\bto\b/.test(raw) && parts.length === 2 && /^[A-Za-z]$/.test(parts[0]) && /^[A-Za-z]$/.test(parts[1]);
      const values = isRange
        ? Array.from({ length: parts[1].charCodeAt(0) - parts[0].charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(parts[0].charCodeAt(0) + i))
        : parts;
      if (values.length < 2) continue;
      claims.push(candidate({
        type: "rendered-value-enumeration", comparator: "A", value: values,
        origin: f.path, location: `${f.path}:${raw}`, method: isRange ? "literal range shown to a reader" : "literal enumeration shown to a reader",
        bindingEvidence: referenced.length ? referenced.map((n) => `its module references exported ${n} by name`) : [],
        confidence: referenced.length ? "bound: the same module names the producer" : "unbound: no producer identifier is referenced here",
        boundTo: referenced.length === 1 ? referenced[0] : null,
      }));
    }
  }
  return claims;
}

/* ================================================================================================
 * B · AUTHORITY CLAIM ↔ SOURCE REGISTRY
 * ================================================================================================
 *
 * 🔴 NO AUTHORITY DICTIONARY. An authority is recognised only where the DOCUMENT ITSELF presents one
 * — a citation, an outbound link to a domain it treats as the decider, or structured metadata naming
 * a source. Shipping a list of regulator names would be a product-specific rule wearing a generic
 * coat, and it would also be exactly the answer key.
 */
export function discoverAuthorityClaims(files) {
  const claims = [];
  for (const f of files) {
    for (const m of f.text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})\/[^\s"'`)<>]{0,200}/gi)) {
      const host = m[1].toLowerCase();
      const line = f.text.slice(Math.max(0, m.index - 160), m.index + 160).replace(/\s+/g, " ");
      /* The claim is the sentence that CITES the outside host — the document's own act of deferring
       * to someone else. Nothing infers an authority from a word we recognise. */
      claims.push(candidate({
        type: "authority-citation", comparator: "B", value: { host, context: line.slice(0, 200) },
        origin: f.path, location: `${f.path}@${m.index}`, method: "outbound citation the document itself carries",
        bindingEvidence: [`cited host ${host}`], confidence: "exact: the host is a literal in the document",
        boundTo: host,
      }));
    }
  }
  return claims;
}

/* ================================================================================================
 * E · RENDERED COUNT ↔ UNDERLYING COLLECTION
 * ================================================================================================
 *
 * 🔴 A COUNT IS BOUND ONLY BY A NAMED COLLECTION, NEVER BY PROXIMITY. The bind requires the SAME
 * module to state the number and to reference an exported collection by name. Comparing every
 * number with every array — the obvious implementation — manufactures false positives on correct
 * pages, and one false positive on a control loses the whole examination.
 */
const NUMBER_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 });

export function discoverCollections(files) {
  const out = [];
  for (const f of files) {
    for (const m of f.text.matchAll(/export\s+(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]{2,40})\s*(?::[^=]*)?=\s*(?:Object\.freeze\(\s*)?\[([\s\S]{0,4000}?)\]\s*\)?\s*;/g)) {
      const body = m[2];
      const items = body.split(/\},\s*\{|,(?![^[{(]*[\]})])/).map((s) => s.trim()).filter((s) => s !== "");
      if (items.length === 0) continue;
      out.push(candidate({
        type: "collection", comparator: "E", value: items.length,
        origin: f.path, location: `${f.path}:${m[1]}`, method: "exported array literal, items counted",
        bindingEvidence: [`exported identifier ${m[1]}`], confidence: "exact: the items are literals in the export",
        boundTo: m[1],
      }));
    }
  }
  return out;
}

export function discoverCountClaims(files, collections) {
  const byName = new Map(collections.map((c) => [c.boundTo, c]));
  const claims = [];
  for (const f of files) {
    const named = [...byName.keys()].filter((n) => new RegExp(`\\b${n}\\b`).test(f.text));
    /* 🔴 NO COLLECTION NAMED HERE MEANS NO CANDIDATE OF THIS KIND — NOT AN UNRESOLVED ONE.
     *
     * This comparator judges a stated count against the collection that supplies it. A module that
     * references no exported collection at all has no such pair to judge: the numerals in it are
     * link text, prices, years, anything. Emitting them as unbindable candidates would answer
     * UNKNOWN on ordinary pages, and an UNKNOWN on a control fails the control under Amendment 2.
     * A module naming TWO OR MORE collections is a different matter — a real pair exists and cannot
     * be resolved — and that one does return UNKNOWN, below. */
    if (named.length === 0) continue;
    for (const m of f.text.matchAll(/["'`][^"'`]{0,60}?\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\b[^"'`]{0,60}["'`]/gi)) {
      const tok = m[1].toLowerCase();
      const n = /^\d+$/.test(tok) ? Number(tok) : NUMBER_WORDS[tok];
      if (!Number.isFinite(n) || n === 0 || n > 200) continue;
      claims.push(candidate({
        type: "rendered-count", comparator: "E", value: n,
        origin: f.path, location: `${f.path}@${m.index}`, method: "number stated in reader-visible text",
        bindingEvidence: named.length === 1 ? [`its module references exported collection ${named[0]} by name`] : [],
        confidence: named.length === 1 ? "bound: exactly one collection is named in this module" : `unbound: ${named.length} collections named here, so no unambiguous reference`,
        boundTo: named.length === 1 ? named[0] : null,
      }));
    }
  }
  return claims;
}

/* ================================================================================================
 * F · SOURCE-DECLARED LINK ↔ RENDERED LINK
 * ================================================================================================
 *
 * The bind is the ROUTE, derived from a published framework convention — the strongest edge of the
 * four, because the framework itself decides it.
 */
export function discoverSourceLinks(files) {
  const out = [];
  for (const f of files) {
    const hrefs = new Set();
    for (const m of f.text.matchAll(/href\s*=\s*(?:["']([^"']+)["']|\{\s*["'`]([^"'`]+)["'`]\s*\})/g)) hrefs.add(m[1] ?? m[2]);
    for (const m of f.text.matchAll(/\]\((\/[^)\s]+)\)/g)) hrefs.add(m[1]);
    const internal = [...hrefs].filter((h) => h.startsWith("/") && !h.startsWith("//"));
    if (internal.length === 0) continue;
    const r = routeOf(f.path);
    out.push(candidate({
      type: "source-declared-links", comparator: "F", value: internal,
      origin: f.path, location: f.path, method: "internal href literals in the source file",
      bindingEvidence: r ? [`route ${r.route} derived by the ${r.convention} convention`] : [],
      confidence: r ? "bound: a published framework convention maps this file to a route" : "unbound: the file matches no known routing convention",
      boundTo: r ? r.route : null,
    }));
  }
  return out;
}

/** Pair each rendered page with the source file whose derived route equals its path. */
export function bindPagesToSources(pages, sourceLinkCandidates) {
  const byRoute = new Map();
  for (const c of sourceLinkCandidates) if (c.boundTo) byRoute.set(c.boundTo, c);
  return pages.map((p) => {
    const path = pathOfUrl(p.url);
    const src = byRoute.get(path) ?? null;
    return { page: p, path, source: src, renderedLinks: renderedLinksOf(p.html) };
  });
}
