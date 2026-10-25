/**
 * RR-326 I · A KEYWORD PLANNER EXPORT, READ — pure (no import, no network, no file): its bytes → its text (UTF-16 or UTF-8), the text → its
 * rows (tab or comma, Google's two title lines, the period, the export moment), and Google's ranges behind the rounded values. Moved here
 * UNCHANGED from keyword-db.mjs, research5.mjs and demand.mjs (which re-export them), so the website's bundle reads the owner's uploaded
 * files with the very same reader the app uses, without carrying the app's keyword database.
 */
/** RR-323: a search-data file's BYTES → its text. Keyword Planner exports are UTF-16 (byte-order mark FF FE); read as UTF-8 they were
 * refused as "not a Keyword Planner file" — the client's own export could not be imported */
export function searchFileText(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf ?? []);
  if (b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString("utf16le");
  if (b[0] === 0xfe && b[1] === 0xff) { const s = Buffer.from(b.subarray(2)); s.swap16(); return s.toString("utf16le"); }
  return b.toString("utf8").replace(/^﻿/, "");
}

/* Google's ranges behind the rounded values of an account with no ads (Keyword Planner shows "10 – 100", "100 – 1K" …) */
export const RANGES = Object.freeze([[0, 0, 10, "0–10"], [50, 10, 100, "10–100"], [500, 100, 1000, "100–1K"], [5000, 1000, 10000, "1K–10K"], [50000, 10000, 100000, "10K–100K"], [500000, 100000, 1000000, "100K–1M"]]);
export const rangeWord = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1000 ? `${+(n / 1000).toFixed(n % 1000 ? 1 : 0)}K` : String(n));
/** one keyword's value → Google's range (a value Keyword Planner did not round to a bucket is kept as said, its own range) */
export function rangeOf(v) {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return null;
  const r = RANGES.find(([said]) => said === n) ?? RANGES.find(([, lo, hi]) => n >= lo && n < hi) ?? [n, n, n, rangeWord(n)];
  return { said: n, low: r[1], high: r[2], label: r[3] };
}

const MONTH = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ymd = (s) => { const m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(String(s ?? "")); if (!m) return null; const mo = MONTH.indexOf(m[1].toLowerCase()); return mo < 0 ? null : `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`; };
/** "October 1, 2025 - September 30, 2026" → "2025-10-01..2026-09-30" (the period the file's averages cover) */
export function periodOf(line) { const [a, b] = String(line ?? "").replace(/"/g, "").split(/\s+[-–]\s+/); const from = ymd(a), to = ymd(b); return from && to ? `${from}..${to}` : null; }
/** the day a file was exported: from Google's own name ("Keyword Stats 2026-10-24 at 06_03_20.csv"), else null */
export const exportedOnOf = (name) => /(\d{4}-\d{2}-\d{2})/.exec(String(name ?? ""))?.[1] ?? null;
/** the moment a file was exported, from its own title line or Google's name ("Keyword Stats 2026-10-24 at 22_09_36") → "2026-10-24T22:09:36";
 * the owner renames his exports (keyword-planner-3.csv) — the title line inside still says when, so several files of one day keep their order */
export const exportedAtOf = (s) => { const m = /(\d{4}-\d{2}-\d{2})(?:\s+at\s+(\d{2})_(\d{2})_(\d{2}))?/.exec(String(s ?? "")); return m ? (m[2] ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}` : m[1]) : null; };

/* one line of a delimited export, quotes honoured (as search-phrase-sources.mjs reads it) */
const cells = (line, d) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === "\"" && line[i + 1] === "\"") { cur += "\""; i++; } else if (c === "\"") q = false; else cur += c; } else if (c === "\"") q = true; else if (c === d) { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };
const MON = /^Searches:\s*([A-Za-z]{3})[a-z]*\s+(\d{4})$/i;

/**
 * a Keyword Planner file's TEXT (research5.searchFileText decodes its bytes) → { ok, period, rows: [{ text, said, months, change3m, yoy,
 * competition }], why }. The header is the line whose CELL is "Keyword"; the period is the quoted date line above it.
 */
export function parseKeywordFile(text) {
  const lines = String(text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const at = lines.findIndex((l) => /(^|[\t,"])Keyword([\t,"]|$)/.test(l));
  if (at < 0) return { ok: false, rows: [], why: "That is not a Keyword Planner file (no \"Keyword\" column)." };
  const d = lines[at].includes("\t") ? "\t" : ",", head = cells(lines[at], d).map((h) => h.trim());
  const col = (re) => head.findIndex((h) => re.test(h)), kw = head.indexOf("Keyword"), vol = col(/^Avg\. monthly searches$/i);
  if (vol < 0) return { ok: false, rows: [], why: "That is not a Keyword Planner file (no \"Avg. monthly searches\" column)." };
  const c3 = col(/^Three month change$/i), cy = col(/^YoY change$/i), comp = col(/^Competition$/i);
  const months = head.map((h, i) => { const m = MON.exec(h); return m ? [i, `${m[2]}-${String(MONTH.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}`] : null; }).filter(Boolean);
  const period = lines.slice(0, at).map(periodOf).find(Boolean) ?? null;
  const rows = [];
  for (const l of lines.slice(at + 1)) {
    const c = cells(l, d), t = String(c[kw] ?? "").trim(); if (!t) continue;
    const said = String(c[vol] ?? "").trim(), m = Object.fromEntries(months.map(([i, ym]) => [ym, String(c[i] ?? "").trim()]).filter(([, v]) => v !== "").map(([ym, v]) => [ym, Number(v.replace(/[^\d.]/g, ""))]));
    rows.push({ text: t, said: said === "" ? null : Number(said.replace(/[^\d.]/g, "")), months: Object.keys(m).length ? m : null, change3m: c3 >= 0 && c[c3]?.trim() ? c[c3].trim() : null, yoy: cy >= 0 && c[cy]?.trim() ? c[cy].trim() : null, competition: comp >= 0 && c[comp]?.trim() ? c[comp].trim() : null });
  }
  const exportedAt = lines.slice(0, at).map((l) => (/keyword stats/i.test(l) ? exportedAtOf(l) : null)).find(Boolean) ?? null;
  return { ok: true, period, exportedAt, rows, why: null };
}
