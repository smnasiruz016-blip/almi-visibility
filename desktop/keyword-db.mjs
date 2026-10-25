/**
 * RR-324 A · ONE GROWING KEYWORD DATABASE (owner decision 2026-10-24: "the market tools keep a big keyword database built in advance").
 * Every Keyword Planner file the client adds (keyword-planner-*.csv, or the "Keyword Stats …" name Google gives) — through the client's own
 * "Search-data files" path or picked up from the folder he names — is MERGED into one database per product, without duplicates:
 *   · each keyword once (its words, lower-case, spaces made single) with its FIRST SEEN and LAST SEEN day and the files it came in;
 *   · its RANGE per period and location (Google's range, never an exact number — demand.mjs rangeOf), from which source and file;
 *   · its TREND: every period it was seen in, oldest first, the months the file itself gives, and the file's own 3-month / year change.
 *   · A file is known by the fingerprint of its bytes: the same file read twice adds NOTHING. A NEWER file with another range for the same
 *     period and location becomes the current range; the old one stays in the history. An OLDER file read later goes into the history only.
 *   · Later sources (the Google Ads API, DataForSEO) go into the SAME database, each observation marked with its source.
 * THE STORE IS HANDED IN ({ load, save }): today a file in the product's folder (localKeywordStore); later AlmiWorld's own keyword service
 * (a server with Neon) implements the same two calls and the screen does not change. Nothing here touches a network or a database.
 * Pure functions, except the two store calls.
 */
import { createHash } from "node:crypto";
import { rangeOf } from "./demand.mjs";
import { periodOf, exportedOnOf, exportedAtOf, parseKeywordFile } from "./kp-file.mjs";
export { periodOf, exportedOnOf, exportedAtOf, parseKeywordFile };

export const DB_VERSION = 1;
export const SOURCES = Object.freeze({ file: "Keyword Planner file", ads: "Google Ads API", dataforseo: "DataForSEO", /* RR-326 E */ service: "AlmiWorld keyword service (Google Ads Keyword Planner data)" });
/** the names of the files the folder pick-up takes (the brief's own name, and the name Google gives an export) */
export const FILE_NAME = /^(keyword-planner-.*|keyword stats .*)\.csv$/i;

export const emptyDb = () => ({ v: DB_VERSION, files: {}, keywords: {} });
export const keyOf = (text) => String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
/** a file's fingerprint — of its bytes, so a renamed copy is still the same file */
export const fileIdOf = (bytes) => createHash("sha256").update(Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes ?? ""))).digest("hex").slice(0, 16);

/* RR-326 I: the file reader moved to kp-file.mjs, unchanged (the website reads the owner's uploads with it) */
const obsKey = (o) => `${o.period ?? "no period stated"}|${o.location}|${o.source}`;
const sameRange = (a, b) => a.said === b.said && JSON.stringify(a.months ?? null) === JSON.stringify(b.months ?? null);

/**
 * MERGE one batch of observations into the database → { db, added, merged, updated, unchanged, dupInFile, alreadyRead, line }.
 * file: { id, name, on, source, period, location } — `id` the bytes' fingerprint (a file) or the request's (an API answer); `on` the day
 * the data is from (the export day). rows: [{ text, said, months?, change3m?, yoy?, competition? }]. The database handed in is not changed.
 */
export function mergeObservations(db0, file, rows) {
  const db = structuredClone(db0 ?? emptyDb());
  if (db.files[file.id]) return { db: db0, added: 0, merged: 0, updated: 0, unchanged: 0, dupInFile: 0, alreadyRead: true, line: `${file.name}: already read on ${db.files[file.id].readOn} — nothing changed.` };
  const location = file.location || "not stated in the file", source = file.source ?? SOURCES.file, on = file.on;
  let added = 0, merged = 0, updated = 0, unchanged = 0, dupInFile = 0; const inFile = new Set();
  for (const r of rows) {
    const k = keyOf(r.text); if (!k) continue;
    if (inFile.has(k)) { dupInFile++; continue; } inFile.add(k);
    const range = rangeOf(r.said);
    const o = { period: file.period ?? null, location, source, said: r.said ?? null, low: range?.low ?? null, high: range?.high ?? null, label: range?.label ?? null, months: r.months ?? null, change3m: r.change3m ?? null, yoy: r.yoy ?? null, competition: r.competition ?? null, on, at: file.at ?? on, file: file.id };
    const kw = db.keywords[k];
    if (!kw) { db.keywords[k] = { text: String(r.text).trim(), firstSeen: on, lastSeen: on, files: [file.id], now: { [obsKey(o)]: o }, history: [] }; added++; continue; }
    merged++; kw.files.push(file.id); if (on < kw.firstSeen) kw.firstSeen = on; if (on > kw.lastSeen) kw.lastSeen = on;
    const cur = kw.now[obsKey(o)];
    if (!cur) { kw.now[obsKey(o)] = o; updated++; }
    else if (sameRange(cur, o)) unchanged++;
    else if (o.at >= (cur.at ?? cur.on)) { kw.history.push(cur); kw.now[obsKey(o)] = o; updated++; } // a newer file: its range is the current one, the old one kept
    else { kw.history.push(o); unchanged++; } // an older file read later: history only
  }
  db.files[file.id] = { name: file.name, on, at: file.at ?? on, readOn: file.readOn ?? on, source, period: file.period ?? null, location, rows: rows.length };
  return { db, added, merged, updated, unchanged, dupInFile, alreadyRead: false,
    line: `${file.name}: ${rows.length.toLocaleString("en-US")} rows — ${added.toLocaleString("en-US")} new keywords, ${merged.toLocaleString("en-US")} already held (merged, no duplicate)${updated ? `, ${updated.toLocaleString("en-US")} with a newer range (the old one kept in the history)` : ""}${dupInFile ? `, ${dupInFile} repeated inside the file` : ""}.` };
}

/** a Keyword Planner FILE (its bytes decoded by the caller) → the database. name, bytes, text, location, readOn (today) */
export function mergeFile(db, { name, bytes, text, location = null, readOn, exportedOn = null }) {
  const p = parseKeywordFile(text);
  if (!p.ok) return { db, refused: p.why, added: 0, merged: 0, updated: 0, unchanged: 0, dupInFile: 0, alreadyRead: false, line: `${name}: ${p.why}` };
  const at = exportedAtOf(name) ?? p.exportedAt ?? exportedOn ?? readOn;
  return mergeObservations(db, { id: fileIdOf(bytes), name, on: at.slice(0, 10), at, readOn, source: SOURCES.file, period: p.period, location }, p.rows);
}

/** a keyword's CURRENT range: the latest observation (newest data first; a Google source before DataForSEO's on the same day) */
export function currentOf(kw) { return Object.values(kw.now).sort((a, b) => String(b.at ?? b.on).localeCompare(String(a.at ?? a.on)) || String(b.period).localeCompare(String(a.period)))[0] ?? null; }

/** a keyword's TREND over time: every observation, oldest period first, and its direction where two periods (or the months) show one */
export function trendOf(kw) {
  const all = [...kw.history, ...Object.values(kw.now)].sort((a, b) => String(a.period).localeCompare(String(b.period)) || String(a.on).localeCompare(String(b.on)));
  const points = all.map((o) => ({ period: o.period, on: o.on, label: o.label, said: o.said, source: o.source, location: o.location }));
  const latest = currentOf(kw), ms = latest?.months ? Object.entries(latest.months).sort(([a], [b]) => a.localeCompare(b)) : [];
  const byPeriod = [...new Map(points.filter((p) => p.said !== null).map((p) => [p.period, p])).values()];
  let direction = null;
  if (byPeriod.length >= 2) { const [a, b] = byPeriod.slice(-2); direction = b.said > a.said ? "up" : b.said < a.said ? "down" : "same"; }
  else if (ms.length >= 6) { const avg = (xs) => xs.reduce((s, [, v]) => s + v, 0) / xs.length, a = avg(ms.slice(0, 3)), b = avg(ms.slice(-3)); direction = b > a * 1.2 ? "up" : b < a * 0.8 ? "down" : "same"; }
  return { points, months: ms.map(([month, n]) => ({ month, range: rangeOf(n)?.label ?? null })), change3m: latest?.change3m ?? null, yoy: latest?.yoy ?? null, direction };
}

/** the database → the plan's search-data items (one per keyword, its current range) — what demand.clusterKeywords reads */
export function itemsOf(db) {
  return Object.values(db?.keywords ?? {}).map((kw) => { const c = currentOf(kw); return { text: kw.text, kind: "tool", place: c?.location ?? null, date: c?.on ?? kw.lastSeen, volume: c?.said ?? null, source: `${c?.source ?? SOURCES.file} (${c?.on ?? kw.lastSeen}) — Google's range`, weight: 4 }; });
}

/** what the screen shows: total keywords, new today, the files read, by source — the clusters and pages come from the plan */
export function summaryOf(db, { today, plan = null } = {}) {
  const ks = Object.values(db?.keywords ?? {}), files = Object.values(db?.files ?? {}).sort((a, b) => String(b.readOn).localeCompare(String(a.readOn)) || String(b.on).localeCompare(String(a.on)));
  const bySource = {}; for (const kw of ks) for (const o of Object.values(kw.now)) bySource[o.source] = (bySource[o.source] ?? 0) + 1;
  const newToday = ks.filter((k) => db.files && k.files.length && db.files[k.files[0]]?.readOn === today).length;
  const clusters = plan?.demand?.clusters ?? [], pages = new Set(clusters.map((c) => c.page).filter(Boolean));
  const moving = ks.map((k) => trendOf(k).direction).filter(Boolean), up = moving.filter((d) => d === "up").length, down = moving.filter((d) => d === "down").length;
  return { total: ks.length, newToday, files: files.length, lastFiles: files.slice(0, 5), bySource, clusters: clusters.length, pages: pages.size, trend: { up, down, same: moving.length - up - down },
    line: `${ks.length.toLocaleString("en-US")} keywords in your database (${files.length} file${files.length === 1 ? "" : "s"} read), ${newToday.toLocaleString("en-US")} new today → ${clusters.length} clusters → ${pages.size} pages they feed.` };
}

/** TODAY's store: a file in the product's folder. read(name, fallback) / write(name, value) are the app's own (pread / pwrite) */
export function localKeywordStore({ read, write, name = "keyword-db.json" }) {
  return Object.freeze({ kind: "this computer (the product's folder)", load: () => { const d = read(name, null); return d && d.v === DB_VERSION ? d : emptyDb(); }, save: (db) => write(name, db) });
}
