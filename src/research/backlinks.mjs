/**
 * 🔴 F59 · BACKLINK PROFILE AND LINK-GAP INTELLIGENCE (acceptance _handoffs AlmiVisibility_F59_ACCEPTANCE_2026-10-18.md, RR-287 task F).
 * Free data only (owner decision 3 of RR-285): the client's own Search Console Links exports and the files it supplies. Pure: records in,
 * a profile out — no file, network, process or clock. Names no product, host or tenant.
 *
 *   C1  every link comes from a Links export or a file the client supplied, with its file, export date and window; any other is REFUSED, named
 *   C2  an export with no link rows is 0 links on its date — a result, never NOT MEASURED, never a guess; rows the export counts but no
 *       record carries are a FAULT, never 0
 *   C3  links grouped by referring domain, each with its anchors as exported; on 0 links, 0 domains, stated
 *   C4  new and lost need two exports of different dates — NOT MEASURED, the missing export named, until then
 *   C5  quality only from a recorded signal; C6 a competitor gap only from a supplied competitor file — not built: each waits, named
 */
export const LINK_SOURCE = Object.freeze({ EXPORT: "SEARCH_CONSOLE_LINKS_EXPORT", CLIENT_FILE: "CLIENT_SUPPLIED_FILE" });
export const LINK_REFUSAL = Object.freeze({ OTHER_SOURCE: "NOT_FROM_THE_CLIENT_S_OWN_EXPORT_OR_FILE", NO_FILE: "NO_FILE", NO_DATE: "NO_EXPORT_DATE", NO_WINDOW: "NO_WINDOW" });
export const WAITS = Object.freeze({
  C4: "a second Links export of a different date",
  C5: "links that carry a recorded quality signal (today 0 links)",
  C6: "a competitor link file the client supplies",
});
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };

/** The client's Links exports, from its stored Search Console export records: each with its date, window, link files and counted rows. */
export function linkExports(records) {
  return (records ?? []).filter((r) => r?.record_type === "search_console_export" && r.links).map((r) => Object.freeze({
    exportId: r.export_id ?? r.measurement_key ?? null, exportedOn: r.exportedOn ?? null, window: r.window ?? null,
    files: Object.entries(r.files ?? {}).filter(([k]) => /^links/i.test(k)).map(([k, sha]) => Object.freeze({ file: k, sha256: sha })), rows: r.links.rows,
  }));
}

/** C1 · admit a link only from the client's own export or supplied file, with its file, date and window; every other is refused, named. */
export function admitLinks(links) {
  const admitted = [], refused = [];
  for (const l of links ?? []) {
    const why = !Object.values(LINK_SOURCE).includes(l?.source) ? LINK_REFUSAL.OTHER_SOURCE : !present(l?.file) ? LINK_REFUSAL.NO_FILE : !ISO.test(l?.exportedOn ?? "") ? LINK_REFUSAL.NO_DATE : !(l?.window?.from && l?.window?.to) ? LINK_REFUSAL.NO_WINDOW : null;
    if (why) refused.push(Object.freeze({ from: l?.from ?? null, source: l?.source ?? null, refused: why })); else admitted.push(l);
  }
  return Object.freeze({ admitted: Object.freeze(admitted), refused: Object.freeze(refused) });
}

/** C2 + C3 · the profile of each export date: its link count (0 is a result), its referring domains with their anchors as exported. */
export function linkProfile({ exports, links }) {
  const { admitted, refused } = admitLinks(links);
  const faults = [];
  const dates = (exports ?? []).map((e) => {
    const mine = admitted.filter((l) => l.exportedOn === e.exportedOn);
    if (!ISO.test(e.exportedOn ?? "")) faults.push(Object.freeze({ exportId: e.exportId, fault: "an export without its date" }));
    if (Number.isInteger(e.rows) && e.rows !== mine.filter((l) => l.source === LINK_SOURCE.EXPORT).length) faults.push(Object.freeze({ exportId: e.exportId, fault: `the export counts ${e.rows} link row(s) and ${mine.length} are recorded — never read as 0` }));
    const domains = new Map();
    for (const l of mine) { const d = hostOf(l.from); if (!d) continue; if (!domains.has(d)) domains.set(d, { domain: d, links: 0, anchors: [] }); const x = domains.get(d); x.links += 1; x.anchors.push(l.anchor ?? ""); }
    return Object.freeze({
      exportedOn: e.exportedOn, window: e.window, files: e.files.length, links: mine.length,
      state: mine.length === 0 ? `0 links on ${e.exportedOn} — a result, not a gap` : `${mine.length} link(s) on ${e.exportedOn}`,
      domains: Object.freeze([...domains.values()].map((x) => Object.freeze({ ...x, anchors: Object.freeze(x.anchors) }))),
    });
  });
  return Object.freeze({ measured: dates.length > 0, missing: dates.length ? null : "a Links export of the client's own", dates: Object.freeze(dates), refused, faults: Object.freeze(faults), waits: WAITS });
}

/** C4 · links gained and lost between the two latest export dates — NOT MEASURED, the missing export named, until two dates exist. */
export function newAndLost({ exports, links }) {
  const days = [...new Set((exports ?? []).map((e) => e.exportedOn).filter((d) => ISO.test(d ?? "")))].sort();
  if (days.length < 2) return Object.freeze({ measured: false, missing: WAITS.C4 });
  const [a, b] = days.slice(-2);
  const key = (l) => `${l.from} → ${l.to ?? ""}`;
  const at = (d) => new Set(admitLinks(links).admitted.filter((l) => l.exportedOn === d).map(key));
  const A = at(a), B = at(b);
  return Object.freeze({ measured: true, from: a, to: b, gained: Object.freeze([...B].filter((k) => !A.has(k))), lost: Object.freeze([...A].filter((k) => !B.has(k))) });
}
