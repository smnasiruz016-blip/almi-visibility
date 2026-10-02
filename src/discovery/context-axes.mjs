/**
 * F13 · CONTEXT AND AXIS DISCOVERY (acceptance _handoffs 0ca24d3, RR-131 §3).
 *
 * "Discover evidence-backed dimensions such as role, stage, language, location or use case instead of hard-coding them." A dimension is
 * DISCOVERED only where a record carries it — never supplied by this code:
 *
 *   FACT QUALIFIER   a `key=value` pair in the claim qualifier of one of the product's fact records; the key is the dimension, its values
 *                    are counted (never printed), and VERIFIED records are counted apart from every other verification state
 *   PAGE LANGUAGE    the `lang` attribute a stored page body declares on its <html> element (the attribute's own name is the dimension's
 *                    key — the HTML standard names it, this code does not); a page declaring none is counted apart, never assigned one
 *
 * Each dimension the product DECLARES is EVIDENCED when at least one record carries it, else NOT EVIDENCED; each discovered dimension the
 * product does not declare is a CANDIDATE — never added to the declaration, never combined, never made a page dimension here (F91 decides
 * what enters page planning, and only from the product's own declaration). An evidence kind the product lacks — no registry, no stored body,
 * a truncated body — is NOT MEASURED with its missing input named, never 0. No minimum, share, probability, weight or period decides
 * anything: one record suffices, and its count is printed beside it.
 *
 * Pure: records in, counts out. Names no product, host, dimension or value. Never fetches, renders or writes.
 */
export const NOT_MEASURED = "NOT MEASURED";
export const STATUS = Object.freeze({ EVIDENCED: "EVIDENCED", NOT_EVIDENCED: "NOT EVIDENCED", CANDIDATE: "CANDIDATE" });
export const KIND = Object.freeze({ FACT_QUALIFIER: "fact-record qualifier", PAGE_LANGUAGE: "declared page language" });
export const MISSING = Object.freeze({
  registry: "the product's fact registry — none could be read",
  pages: "stored page bodies of the product's tenant — none is held",
});
const PAIR = /([A-Za-z][A-Za-z0-9_-]*)=([^,]*)/g;
const LANG = /<html\b[^>]*?\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** The `key=value` pairs of one fact record's claim qualifier (a string, or an object of key → value). */
export function qualifierPairs(record) {
  const q = record?.claim?.qualifier;
  if (q && typeof q === "object") return Object.entries(q).filter(([k]) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(k)).map(([k, v]) => [k, String(v).trim()]);
  if (typeof q !== "string") return [];
  return [...q.matchAll(PAIR)].map((m) => [m[1], m[2].trim()]);
}

/** The language a stored body declares on its <html> element, or null when it declares none. */
export function declaredLanguage(html) {
  const m = typeof html === "string" ? html.match(LANG) : null;
  const v = m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
  return v === "" ? null : v;
}

/**
 * @param {{ declared: string[], facts: object[]|null, pages: {fetched:boolean, html:string|null, truncated:boolean}[]|null }} input
 *   `facts` null → the registry could not be read; `pages` null → no stored body is held for the tenant.
 */
export function discoverAxes({ declared = [], facts = null, pages = null }) {
  const dims = new Map();
  const add = (key, kind, value, verified) => {
    const k = `${kind}\u0000${key}`;
    if (!dims.has(k)) dims.set(k, { key, kind, records: 0, verifiedRecords: 0, unverifiedRecords: 0, values: new Set() });
    const d = dims.get(k);
    d.records += 1;
    d[verified ? "verifiedRecords" : "unverifiedRecords"] += 1;
    if (value !== "") d.values.add(value);
  };
  const notMeasured = [];
  let factRecords = null, recordsWithQualifier = null;
  if (facts === null) notMeasured.push({ kind: KIND.FACT_QUALIFIER, missing: MISSING.registry });
  else {
    factRecords = facts.length; recordsWithQualifier = 0;
    for (const r of facts) {
      const pairs = qualifierPairs(r);
      if (pairs.length) recordsWithQualifier += 1;
      /* one record counts once per key, however many times the key repeats in its qualifier */
      const byKey = new Map();
      for (const [k, v] of pairs) byKey.set(k, [...(byKey.get(k) ?? []), v]);
      for (const [k, vs] of byKey) { add(k, KIND.FACT_QUALIFIER, vs[0], r?.verificationState === "VERIFIED"); for (const v of vs.slice(1)) if (v !== "") dims.get(`${KIND.FACT_QUALIFIER}\u0000${k}`).values.add(v); }
    }
  }
  const pageCounts = { held: 0, readable: 0, declaringNone: 0, truncatedNotMeasured: 0, unfetchedNotMeasured: 0 };
  if (pages === null || pages.length === 0) notMeasured.push({ kind: KIND.PAGE_LANGUAGE, missing: MISSING.pages });
  else {
    for (const p of pages) {
      pageCounts.held += 1;
      if (!p.fetched || typeof p.html !== "string") { pageCounts.unfetchedNotMeasured += 1; continue; }
      if (p.truncated) { pageCounts.truncatedNotMeasured += 1; continue; }
      pageCounts.readable += 1;
      const lang = declaredLanguage(p.html);
      if (lang === null) { pageCounts.declaringNone += 1; continue; }
      /* a page body carries no verification state: it is what the site served, recorded — never a VERIFIED fact */
      add("lang", KIND.PAGE_LANGUAGE, lang, false);
    }
  }
  const discovered = [...dims.values()]
    .map((d) => ({ key: d.key, kind: d.kind, records: d.records, verifiedRecords: d.verifiedRecords, unverifiedRecords: d.unverifiedRecords, distinctValues: d.values.size, verified: d.verifiedRecords > 0 }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
  const keys = new Set(discovered.map((d) => d.key));
  const declaredSet = [...new Set(declared.filter((k) => typeof k === "string" && k !== ""))];
  return {
    discovered,
    declared: declaredSet.map((key) => ({ key, status: keys.has(key) ? STATUS.EVIDENCED : STATUS.NOT_EVIDENCED, records: discovered.filter((d) => d.key === key).reduce((n, d) => n + d.records, 0) })),
    candidates: [...keys].filter((k) => !declaredSet.includes(k)).sort().map((key) => ({ key, status: STATUS.CANDIDATE })),
    notMeasured,
    facts: { records: factRecords ?? NOT_MEASURED, withQualifier: recordsWithQualifier ?? NOT_MEASURED },
    pages: pages === null || pages.length === 0 ? NOT_MEASURED : pageCounts,
    incomplete: notMeasured.length > 0 || (pageCounts.truncatedNotMeasured + pageCounts.unfetchedNotMeasured) > 0,
  };
}
