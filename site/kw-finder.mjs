/**
 * 🔴 RR-326 C · THE PUBLIC KEYWORD FINDER — a word or topic and a country → Google's keyword ideas with Google's average monthly searches,
 * grouped, and a CSV. Served from the database when it already holds that search (30 days — Keyword Planner's figures are monthly);
 * otherwise asked of Google ONCE, stored, and served — so the database keeps growing. No invented number: no difficulty, no CPC, no
 * estimate — a keyword Google gives no figure for says so.
 */
import { normSeed, locationOf, seedKeyOf, LANGUAGES } from "./kw-seeds.mjs";
import { rangeOf } from "../desktop/kp-file.mjs";
export { rangeOf };

export const FINDER = Object.freeze({ reuseDays: 30, maxLength: 80, maxWords: 10, shownPerGroup: 50, perVisitorPerDay: 5, siteSearchesPerDay: 300, language: "en" });
export const SOURCE_LINE = "Search volumes: Google Ads Keyword Planner data";
export const GROUPS = Object.freeze([
  ["howto", "How to …", (k) => /\bhow to\b/.test(k)],
  ["nearme", "Near me", (k) => /\bnear me\b|\bnearby\b|\bnear\b.*\bme\b/.test(k)],
  ["prices", "Prices and fees", (k) => /\b(price|prices|pricing|cost|costs|fee|fees|cheap|cheapest|how much|rates?|charges?|affordable|budget)\b/.test(k)],
  ["compare", "Comparisons", (k) => /\b(vs|versus|or|compare|comparison|difference|better|best|top)\b/.test(k)],
  ["questions", "Questions", (k) => /^(who|what|whats|when|where|why|how|which|can|is|are|does|do|should|will|was)\b/.test(k) || k.endsWith("?")],
  ["other", "Other ideas", () => true],
]);
export const groupOf = (keyword) => GROUPS.find(([, , t]) => t(keyword))[0];

/** what a visitor typed → the seed Google receives, or why not */
export function finderQuery(input) {
  const q = normSeed(input);
  if (!q) return { ok: false, why: "Type a word or a topic." };
  if (q.length > FINDER.maxLength) return { ok: false, why: `At most ${FINDER.maxLength} characters.` };
  if (q.split(" ").length > FINDER.maxWords) return { ok: false, why: `At most ${FINDER.maxWords} words.` };
  if (/https?:|www\.|[<>{}\\]|\.(com|net|org)\b/.test(q)) return { ok: false, why: "Type a word or a topic, not a web address." };
  if (!/\p{L}|\p{N}/u.test(q)) return { ok: false, why: "Type a word or a topic." };
  return { ok: true, q };
}
const today = (t) => new Date(t).toISOString().slice(0, 10);
const daysBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

/**
 * ONE lookup for the finder and the app's keyword service: seeds (already clean) at a location → the database's fetch of the last 30 days,
 * or Google asked ONCE, stored, and read back. → { ok, location, locationName, language, period, day, fromDatabase, rows } | { ok: false }
 */
export async function lookupKeywords({ seeds, location = "ALL", store, ads, purpose, kind = purpose, now = () => Date.now() }) {
  const loc = locationOf(location); if (!loc) return { ok: false, why: "Choose a country from the list." };
  const lang = FINDER.language, key = { seedKey: seedKeyOf(seeds), location: loc.code, language: lang };
  const d = today(now());
  let found = await store.findFetch({ ...key, since: daysBefore(d, FINDER.reuseDays) }), fromDatabase = true;
  if (!found) {
    const r = await ads.ideas({ seeds, geo: loc.geo, language: LANGUAGES[lang].constant, purpose, maxPages: 1 });
    if (!r.ok) {
      /* RR-326 I: Google refused (or is not connected) — the owner's Keyword Planner files answer, when they hold these words. Not saved
         as a fetch: once Google answers, the search is asked of Google */
      const file = await store.fileKeywords({ phrases: seeds, location: loc.code, language: lang }).catch(() => null);
      if (file) return { ok: true, location: loc.code, locationName: loc.name, language: LANGUAGES[lang].name, period: file.period, day: file.day, fromDatabase: true, source: "file", rows: file.rows };
      return { ok: false, code: r.code, why: r.why };
    }
    await store.saveFetch({ unitId: null, kind, group: null, ...key, day: d, at: new Date(now()).toISOString(), period: r.period, ops: r.ops, rows: r.rows });
    found = await store.findFetch({ ...key, since: d }); fromDatabase = false;
  }
  return { ok: true, location: loc.code, locationName: loc.name, language: LANGUAGES[lang].name, period: found.period, day: found.day, fromDatabase, rows: found.rows };
}

/** one finder search → { ok, q, location, period, day, fromDatabase, rows: [{ keyword, volume, group }], groups } | { ok: false, why } */
export async function findKeywords({ q, location = "ALL", store, ads, purpose = "finder", now = () => Date.now() }) {
  const qq = finderQuery(q); if (!qq.ok) return qq;
  const r = await lookupKeywords({ seeds: [qq.q], location, store, ads, purpose, kind: purpose === "owner" ? "owner" : "finder", now }); if (!r.ok) return r;
  const rows = r.rows.map((x) => ({ ...x, group: groupOf(x.keyword) }));
  return { ...r, q: qq.q, rows, groups: GROUPS.map(([id, name]) => ({ id, name, rows: rows.filter((x) => x.group === id) })).filter((g) => g.rows.length) };
}

/** the CSV of a search (a cell that would start a spreadsheet formula is made plain text) */
export function csvOf(result) {
  const cell = (v) => { let s = v === null || v === undefined ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["keyword", "avg_monthly_searches", "group", "location", "language", "period", "source"];
  /* RR-326 I: from the owner's Keyword Planner files, Google's RANGE (an account with no ads sees rounded values), never the rounded number */
  const file = result.source === "file", vol = (v) => (file ? rangeOf(v)?.label ?? null : v);
  const lines = result.rows.map((r) => [r.keyword, vol(r.volume), GROUPS.find(([id]) => id === r.group)[1], result.locationName, result.language, result.period ?? "", file ? "Google Ads Keyword Planner (export file)" : "Google Ads Keyword Planner"].map(cell).join(","));
  return `${head.join(",")}\r\n${lines.join("\r\n")}${lines.length ? "\r\n" : ""}`;
}

/** "2025-10-01..2026-09-30" → "Oct 2025 – Sep 2026" */
export function periodWords(p) {
  const m = /^(\d{4})-(\d{2})-\d{2}\.\.(\d{4})-(\d{2})-\d{2}$/.exec(String(p ?? "")); if (!m) return null;
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[Number(m[2]) - 1]} ${m[1]} – ${M[Number(m[4]) - 1]} ${m[3]}`;
}
