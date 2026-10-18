/**
 * 🔴 RR-285 task 1 · THE CLIENT'S OWN SEARCH CONSOLE EXPORT, READ FROM ITS FILES — nothing is fetched from Google.
 *
 * The client exports its Search Console performance (Queries, Pages, Chart) and its Links files from its own account and files them in the
 * batch. Each query row becomes a phrase record through the engine's existing Search Console route (src/discovery/search-phrase-sources.mjs
 * searchConsoleRows: source SEARCH_CONSOLE, label OBSERVED), dated the day the client exported it. The pages, the totals, the window and the
 * links are kept as ONE summary record, derived from the files by their sha256 — a link file with no data row is 0 links on that day, never
 * NOT MEASURED. Pure: texts in, rows and one record out. Names no product, tenant or host.
 */
import { createHash } from "node:crypto";
import { searchConsoleRows } from "./search-phrase-sources.mjs";

export const EXPORT_RECORD = "search_console_export";
export const EXPORT_REFUSAL = Object.freeze({ NO_QUERIES: "QUERIES_FILE_UNREADABLE", NO_PAGES: "PAGES_FILE_UNREADABLE", NO_CHART: "CHART_FILE_UNREADABLE", NO_DATE: "EXPORT_DATE_NOT_A_DAY", NO_SOURCE: "SOURCE_NOT_NAMED" });
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One CSV line, quotes honoured. */
const cells = (line) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === "\"" && line[i + 1] === "\"") { cur += "\""; i++; } else if (c === "\"") q = false; else cur += c; } else if (c === "\"") q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };
/** A CSV's data rows by its own header — null when the file is not the named kind. */
export function csvRows(text, firstHeader) {
  const lines = String(text ?? "").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return null;
  const head = cells(lines[0]).map((h) => h.trim());
  if (head[0] !== firstHeader) return null;
  return lines.slice(1).map((l) => Object.fromEntries(cells(l).map((v, i) => [head[i], v.trim()])));
}
const num = (v) => { const n = Number(String(v ?? "").replace(/[%,]/g, "")); return Number.isFinite(n) ? n : 0; };

/**
 * The export, read: { phrases, refused, record } or { refusal }. `files`: { queries, pages, chart, links: [text, …] } (texts);
 * `meta`: { exportedOn, source }.
 */
export function readSearchConsoleExport(files, meta) {
  if (!DAY.test(meta?.exportedOn ?? "")) return Object.freeze({ refusal: EXPORT_REFUSAL.NO_DATE });
  if (typeof meta?.source !== "string" || meta.source.trim() === "") return Object.freeze({ refusal: EXPORT_REFUSAL.NO_SOURCE });
  const queries = csvRows(files?.queries, "Top queries"), pages = csvRows(files?.pages, "Top pages"), chart = csvRows(files?.chart, "Date");
  if (!queries) return Object.freeze({ refusal: EXPORT_REFUSAL.NO_QUERIES });
  if (!pages) return Object.freeze({ refusal: EXPORT_REFUSAL.NO_PAGES });
  if (!chart) return Object.freeze({ refusal: EXPORT_REFUSAL.NO_CHART });
  /* the engine's existing Search Console route: one phrase record per query, dated the day the client exported it */
  const { records: phrases, refused } = searchConsoleRows(queries.map((r) => ({ query: r["Top queries"] })), { date: meta.exportedOn });
  const days = chart.map((r) => r.Date).filter((d) => DAY.test(d)).sort();
  const links = (files?.links ?? []).map((t) => (csvRows(t, "Linking page") ?? []).length);
  const summary = {
    source: meta.source, exportedOn: meta.exportedOn,
    window: { from: days[0] ?? null, to: days.at(-1) ?? null, days: days.length },
    totals: { clicks: chart.reduce((s, r) => s + num(r.Clicks), 0), impressions: chart.reduce((s, r) => s + num(r.Impressions), 0) },
    queries: { rows: queries.length, impressions: queries.reduce((s, r) => s + num(r.Impressions), 0), phrasesRecorded: phrases.length, refused: refused.length },
    pages: { rows: pages.length, clicks: pages.reduce((s, r) => s + num(r.Clicks), 0), impressions: pages.reduce((s, r) => s + num(r.Impressions), 0), urls: pages.map((r) => ({ url: r["Top pages"], clicks: num(r.Clicks), impressions: num(r.Impressions) })) },
    links: { files: links.length, rows: links.reduce((s, n) => s + n, 0) },
    files: Object.fromEntries(["queries", "pages", "chart"].map((k) => [k, sha(files[k])]).concat((files?.links ?? []).map((t, i) => [`links${i + 1}`, sha(t)]))),
  };
  const key = sha(JSON.stringify([summary.source, summary.exportedOn, summary.files])).slice(0, 24);
  const record = Object.freeze({ record_type: EXPORT_RECORD, measurement_key: `${EXPORT_RECORD}:${key}`, export_id: key, recorded_at: `${meta.exportedOn}T00:00:00Z`, ...summary });
  return Object.freeze({ phrases: Object.freeze(phrases), refused: Object.freeze(refused), record });
}
