/**
 * 🔴 RR-319 B · THE LISTS "HOW MANY PAGES" WORKS ON (owner, 23 Oct 2026):
 *   1 BUILT IN for AlmiWorld's own products: AlmiStudy's universities (8,862), AlmiSalary's job roles (519) and AlmiStudy's 12 subjects —
 *     read-only copies (desktop/lists), each with its source; never a production database;
 *   2 for EVERY client: the countries built in; a list typed or pasted one per line; a CSV or Excel file (its header names the columns:
 *     name, country, website, subjects, aliases); and "Help me make my list" — Visibility drafts it from the client's own pages, menu and
 *     Search Console phrases (and the client's AI when connected), the client edits and saves it;
 *   3 general world lists (ILO ISCO-08 roles, UNESCO ISCED-F fields) are NOT built in: their reuse licence could not be confirmed from an
 *     official page (checked 23 Oct 2026) — so they are left out, said so on the screen.
 * Pure, except the built-in files it reads from the app's own folder.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unzip } from "./google-connect.mjs";
import { countriesIn } from "./world.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const WORLD_LISTS = Object.freeze({ included: false, line: "General world lists (ILO's ISCO-08 job roles, UNESCO's ISCED-F fields of study) are not built in: an official statement that they may be reused could not be found (checked 23 Oct 2026). Add your own list instead." });
/** AlmiWorld's own lists — offered only to AlmiWorld's own products */
export function builtInList(kind) {
  const f = join(HERE, "lists", { roles: "almiworld-job-roles.json", universities: "almiworld-universities.json", subjects: "almiworld-subjects.json", professions: "almiworld-oet-professions.json" /* RR-320 A: OET's 12, from oet.com */, recognising: "almiworld-oet-recognising.json" /* RR-321 A1: OET's "Who recognises OET" list, AlmiOET's own copy */, origins: "almiworld-oet-origins.json" /* RR-321 B3: the home councils, AlmiOET's records */ }[kind] ?? "none");
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, "utf8"));
  return { ...j, source: j.source, items: j.items.map((x) => ({ ...x, name: x.name })) };
}
export const HOWTO = Object.freeze({
  countries: { how: "Built in: the world's 197 countries. Or type the ones you mean, one per line.", example: "Ireland\nUnited Kingdom\nNew Zealand" },
  universities: { how: "Upload a CSV or Excel file with a header row: name, country, website, subjects. Or paste one university per line.", example: "name,country,website,subjects\nUniversity College Dublin,Ireland,https://www.ucd.ie,medicine-health-sciences" },
  roles: { how: "Upload a CSV or Excel file with a header row: name (or role), aliases. Or paste one role per line.", example: "Registered Nurse\nDoctor\nPharmacist" },
  subjects: { how: "Paste one subject per line, or upload a file with a header \"subject\".", example: "Medicine & Health Sciences\nLaw" },
  cities: { how: "Paste one city per line.", example: "Dublin\nAuckland" },
  own: { how: "Paste anything you want pages for, one per line.", example: "Night shifts\nAgency work" },
});

/** CSV text → rows (quoted cells, doubled quotes, commas and new lines inside quotes) */
export function csvRows(text) {
  const t = String(text ?? "").replace(/^﻿/, ""), out = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === "," || c === ";" && !t.slice(0, 200).includes(",")) { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell.replace(/\r$/, "")); out.push(row); row = []; cell = ""; } else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); out.push(row); }
  return out.filter((r) => r.some((c) => String(c).trim()));
}
/* the header's words for each field */
const FIELD = [["name", /^(name|role|job ?role|title|university|institution|subject|item|city|country name)$/i], ["country", /^(country|country_?name|nation)$/i], ["page", /^(website|url|official_?website|admissions_?url|page|link)$/i], ["subjects", /^(subjects?|subject_?categories|subject_?slugs|fields?)$/i], ["aliases", /^(aliases|also_?called|synonyms)$/i], ["sector", /^(sector|industry|field|category)$/i]];
/** rows (first row a header when it names the columns) → items { name, country?, page?, subjects?, aliases? } */
export function itemsFromRows(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => String(h).trim()), cols = head.map((h) => FIELD.find(([, re]) => re.test(h))?.[0] ?? null);
  const hasHeader = cols.includes("name") || cols.filter(Boolean).length >= 2;
  const nameCol = hasHeader ? Math.max(0, cols.indexOf("name")) : 0;
  return (hasHeader ? rows.slice(1) : rows).map((r) => {
    const get = (f) => { const i = cols.indexOf(f); return hasHeader && i >= 0 ? String(r[i] ?? "").trim() : ""; };
    const split = (s) => s.split(/\s*;\s*|\s*\|\s*/).filter(Boolean);
    return { name: String(r[nameCol] ?? "").trim(), country: get("country") || null, page: get("page") || null, subjects: split(get("subjects")), aliases: split(get("aliases")), sector: get("sector") || null };
  }).filter((x) => x.name);
}
/** an Excel file (.xlsx) → rows of its FIRST sheet */
export function xlsxRows(buf) {
  const files = unzip(buf); if (!files) return null;
  const shared = [...String(files["sharedStrings.xml"] ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  const sheet = files["sheet1.xml"]; if (!sheet) return null;
  const col = (ref) => { let n = 0; for (const ch of String(ref).replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((r) => { const out = []; for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1], type = /\bt="(\w+)"/.exec(c[1])?.[1], inner = c[2] ?? ""; const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]; const val = type === "s" ? shared[Number(v)] : type === "inlineStr" ? [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("") : v ?? ""; if (ref) out[col(ref)] = val; } return [...out].map((x) => x ?? ""); });
}
/** A list file the client adds — CSV, Excel, JSON or one name per line. `data` = the file's bytes (Buffer) or its text. */
export function listFromFile(name, data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data ?? ""), "utf8"), t = buf.toString("utf8").replace(/^﻿/, "");
  if (/\.xlsx$/i.test(name) || buf.subarray(0, 2).toString("latin1") === "PK") { const rows = xlsxRows(buf); if (!rows) return { ok: false, why: "That Excel file could not be read — save it as .xlsx or CSV and add it again." }; const items = itemsFromRows(rows); return items.length ? { ok: true, items } : { ok: false, why: "No names were found in that file." }; }
  if (/\.json$/i.test(name) || /^\s*[[{]/.test(t)) {
    let j; try { j = JSON.parse(t); } catch { return { ok: false, why: "That JSON file could not be read." }; }
    const arr = Array.isArray(j) ? j : j.items ?? Object.values(j).find(Array.isArray) ?? [];
    const items = arr.map((x) => (typeof x === "string" ? { name: x } : { name: x?.name ?? x?.title, aliases: x?.aliases ?? [], country: x?.country?.name ?? x?.countryName ?? x?.country ?? null, subjects: x?.subjectSlugs ?? x?.subjects ?? [], page: x?.admissionsUrl ?? x?.officialWebsite ?? x?.page ?? x?.url ?? null, sector: x?.sector ?? null })).filter((x) => typeof x.name === "string" && x.name.trim());
    return items.length ? { ok: true, items } : { ok: false, why: "No names were found in that file." };
  }
  const rows = /,/.test(t.split(/\r?\n/)[0] ?? "") ? csvRows(t) : t.split(/\r?\n/).map((l) => [l.trim()]).filter((r) => r[0]);
  const items = itemsFromRows(rows);
  return items.length ? { ok: true, items } : { ok: false, why: "No names were found in that file." };
}

/**
 * "HELP ME MAKE MY LIST": a first draft from what Visibility already read for this product — the client's own page titles, headings and
 * menu, and its Search Console phrases. Every item says where it was found; the client edits it before it is used.
 */
const STOPWORD = /^(the|a|an|and|or|of|in|for|to|your|our|my|with|how|what|why|when|is|are|test|exam|practice|guide|guides|home|pricing|blog|about|contact|login|sign up|ebooks?)$/i;
export function draftList({ dim, site = null, searchConsole = null, subject = null }) {
  const found = new Map();
  const add = (name, from) => { const n = String(name ?? "").replace(/\s+/g, " ").replace(/^[^\p{L}]+|[^\p{L})]+$/gu, "").trim(); if (!n || n.length > 60 || STOPWORD.test(n)) return; const k = n.toLowerCase(); if (!found.has(k)) found.set(k, { name: n, from: [] }); const f = found.get(k).from; if (f.length < 3 && !f.includes(from)) f.push(from); };
  const texts = [...(site?.pages ?? []).flatMap((p) => [[p.title, `your page ${p.url}`], [p.h1, `your page ${p.url}`], ...(p.h2 ?? []).map((h) => [h, `your page ${p.url}`])]), ...(site?.design?.menu ?? []).map((m) => [m, "your site's menu"]), ...(searchConsole?.queries ?? []).map((q) => [q.query, "your Search Console"])].filter(([t]) => t);
  if (dim === "countries") for (const [t, from] of texts) for (const c of countriesIn(t)) add(c, from);
  else if (dim === "roles" || dim === "subjects" || dim === "own") {
    /* "OET for Doctors 2026: Score, Fees" → Doctors; "oet for nurses in new zealand" → nurses */
    const re = subject ? new RegExp(`\\b${String(subject).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(?:for|in)\\s+([\\p{L} ]{3,40}?)(?=\\s+(?:in|for|to|from|20\\d\\d)\\b|[:|·—–,.?]|$)`, "giu") : /\bfor\s+([\p{L} ]{3,40}?)(?=\s+(?:in|for|to|from|20\d\d)\b|[:|·—–,.?]|$)/giu;
    for (const [t, from] of texts) for (const m of String(t).matchAll(re)) if (!countriesIn(m[1]).length) add(m[1], from);
    if (dim !== "roles") for (const [t, from] of texts.filter(([, f]) => f === "your site's menu")) add(t, from);
  } else if (dim === "cities") for (const [t, from] of texts) for (const m of String(t).matchAll(/\bin\s+(\p{Lu}[\p{Ll}]+(?:\s\p{Lu}[\p{Ll}]+)?)/gu)) if (!countriesIn(m[1]).length) add(m[1], from);
  const items = [...found.values()].slice(0, 200);
  return { items, line: items.length ? `Visibility drafted ${items.length} from your own pages and searches — check each one, remove what does not fit, add what is missing, then save.` : "Nothing for this list was found on your pages or in your searches yet — type it yourself, one per line." };
}
