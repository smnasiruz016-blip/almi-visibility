/**
 * 🔴 F60 · EARNED CITATION AND DIGITAL PR OPPORTUNITIES (acceptance _handoffs AlmiVisibility_F60_ACCEPTANCE_2026-10-18.md, RR-287 task E).
 * Free data only (owner decision 3 of RR-285). Pure: records in, a list for the owner out — no file, network, process, message or clock.
 * Names no product, host or tenant.
 *
 *   C1  every opportunity names a source already recorded in the client's batch — a source its verified claims cite, a stored read, a page in
 *       its own export or a supplied file — with its URL and date; nothing is fetched to find one
 *   C2  only an OFFICIAL, EDITORIAL or COMMUNITY source is kept, by a RECORDED class: a claim citing it as the responsible body's own source
 *       is OFFICIAL; any other class comes only from a supplied class file. A source recorded as selling links, running a link scheme or
 *       hiding sponsorship is REFUSED, named; a source with no recorded class is dropped, its reason named — never assumed legitimate
 *   C3  each opportunity names the client page that answers what the source discusses, and the fact that makes it useful; a kept source no
 *       page answers is dropped with its reason
 *   C4  an unlinked mention of the client comes only from a stored read's text or a supplied file — found, or 0, stated
 *   C5  nothing is sent: no outreach, message or request — the list is for the owner
 */
export const SOURCE_CLASS = Object.freeze({ OFFICIAL: "OFFICIAL", EDITORIAL: "EDITORIAL", COMMUNITY: "COMMUNITY" });
export const REFUSED_CLASS = Object.freeze(["SELLS_LINKS", "LINK_SCHEME", "HIDDEN_SPONSORSHIP"]);
export const DROP = Object.freeze({ NO_CLASS: "its class is not recorded — official, editorial or community is never assumed", NO_PAGE: "no published page of the client answers what it discusses", NO_DATE: "no recorded date" });
export const STANDING = "a list for the owner — nothing is sent, no outreach, no request";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const fold = (s) => ` ${String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
const norm = (u) => String(u ?? "").replace(/#.*$/, "").replace(/\/$/, "");

/**
 * The recorded sources: `claims` on the client's published pages ({ page, claimId, text, source: { kind, link, readOn, name } }), stored
 * `reads` ({ url, readOn, state }), and supplied `classes` ({ url, class, file }). One row per source URL, with every date it was recorded on.
 */
export function recordedSources({ claims = [], reads = [], classes = [] }) {
  const by = new Map();
  const add = (url, on, how) => { const k = norm(url); if (!k) return; if (!by.has(k)) by.set(k, { url: k, dates: new Set(), how: new Set(), official: false, supplied: null }); const s = by.get(k); if (ISO.test(on ?? "")) s.dates.add(on); s.how.add(how); return s; };
  for (const c of claims) { const s = add(c.source?.link, c.source?.readOn, "CITED_BY_A_CLAIM"); if (s && c.source?.kind === "RESPONSIBLE_BODY") s.official = true; }
  for (const r of reads) add(r.url, r.readOn, "STORED_READ");
  for (const x of classes) { const s = by.get(norm(x.url)); if (s) s.supplied = x; }
  return [...by.values()].map((s) => Object.freeze({ url: s.url, on: [...s.dates].sort().at(-1) ?? null, how: Object.freeze([...s.how].sort()), class: s.supplied?.class ?? (s.official ? SOURCE_CLASS.OFFICIAL : null), classFrom: s.supplied ? `supplied file ${s.supplied.file ?? "(unnamed)"}` : s.official ? "a verified claim cites it as the responsible body's own source" : null }));
}

/** C1–C3, C5 · the opportunities, each with its source, date, class, the client page and the fact; every refusal and drop named. */
export function earnedCitations({ claims = [], reads = [], classes = [] }) {
  const sources = recordedSources({ claims, reads, classes });
  const opportunities = [], refused = [], dropped = [];
  for (const s of sources) {
    if (REFUSED_CLASS.includes(s.class)) { refused.push(Object.freeze({ url: s.url, class: s.class, why: `recorded as ${s.class} (${s.classFrom}) — never a citation target` })); continue; }
    if (!Object.values(SOURCE_CLASS).includes(s.class)) { dropped.push(Object.freeze({ url: s.url, why: DROP.NO_CLASS })); continue; }
    if (!ISO.test(s.on ?? "")) { dropped.push(Object.freeze({ url: s.url, why: DROP.NO_DATE })); continue; }
    const answering = claims.filter((c) => norm(c.source?.link) === s.url && c.page);
    if (!answering.length) { dropped.push(Object.freeze({ url: s.url, why: DROP.NO_PAGE })); continue; }
    for (const page of [...new Set(answering.map((c) => c.page))]) {
      const facts = answering.filter((c) => c.page === page);
      opportunities.push(Object.freeze({ source: s.url, on: s.on, class: s.class, classFrom: s.classFrom, page, fact: facts[0].claimId, facts: facts.length, why: "the page states, from this source, what the source itself discusses — a fair, useful citation to propose", standing: STANDING }));
    }
  }
  return Object.freeze({
    opportunities: Object.freeze(opportunities), refused: Object.freeze(refused), dropped: Object.freeze(dropped), standing: STANDING, sent: 0,
    counts: Object.freeze({ sources: sources.length, opportunities: opportunities.length, sourcesKept: new Set(opportunities.map((o) => o.source)).size, pages: new Set(opportunities.map((o) => o.page)).size, refused: refused.length, dropped: dropped.length, droppedNoClass: dropped.filter((d) => d.why === DROP.NO_CLASS).length }),
  });
}

/** C4 · unlinked mentions of the client: only in a stored read's text or a supplied file — each with its URL and date; 0 is stated. */
export function unlinkedMentions({ names = [], reads = [], files = [] }) {
  const hit = (t) => names.some((n) => String(n ?? "").trim() !== "" && fold(t).includes(fold(n)));
  const found = [
    ...reads.filter((r) => r?.state === "READ" && typeof r.text === "string" && hit(r.text)).map((r) => Object.freeze({ from: "STORED_READ", url: r.url, on: r.readOn ?? null })),
    ...files.filter((f) => hit(f.text)).map((f) => Object.freeze({ from: "CLIENT_SUPPLIED_FILE", url: f.url ?? null, on: f.date ?? null })),
  ];
  return Object.freeze({ mentions: Object.freeze(found), count: found.length, state: found.length ? `${found.length} found` : "0 found — stated", readsWithText: reads.filter((r) => r?.state === "READ" && typeof r.text === "string").length });
}
