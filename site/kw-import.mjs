/**
 * 🔴 RR-326 I · THE OWNER'S KEYWORD PLANNER FILES INTO THE LIVE KEYWORD DATABASE — uploaded on /owner (owner only), read on the SERVER with
 * the app's own reader (desktop/kp-file.mjs: UTF-16 or UTF-8, tab or comma, Google's two title lines), merged into the SAME tables the
 * collector and the finder use (kw-store.mjs). Nobody connects to the database from a computer: the deployed site does it.
 *   · a file is known by the fingerprint of its BYTES (a renamed copy is the same file): read twice — with any country or date — adds NOTHING;
 *   · each keyword once per (location, language, day) — a keyword already there from another file of the same day is MERGED (its figure
 *     updated), a later day adds a row and the old one stays (history);
 *   · source = "Keyword Planner file" (kw_fetch.kind "file"); location = the country the owner picks (else "All locations", as Google's
 *     export has none); day = the date the owner gives, else the export day in the file's own title line, else today;
 *   · a keyword is put under an AlmiWorld product when it holds one of the product's seed phrases as whole words (oet → AlmiOET).
 * → per file: { name, ok, why, duplicate, read, new, merged, location, day, period, products: { "product:oet": n } }
 */
import { createHash } from "node:crypto";
import { searchFileText, parseKeywordFile } from "../desktop/kp-file.mjs";
import { locationOf, normSeed } from "./kw-seeds.mjs";

export const IMPORT = Object.freeze({ maxFiles: 6, maxFileBytes: 1500000, maxBodyBytes: 4000000, language: "en", kind: "file", source: "Keyword Planner file" });
export const fileKeyOf = (bytes) => `file:${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** a phrase → a test that its every word is in a keyword, as whole words, in any order */
export const phraseTest = (phrase) => { const ws = normSeed(phrase).split(" ").filter(Boolean); const res = ws.map((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(w)}($|[^\\p{L}\\p{N}])`, "u")); return (k) => res.length > 0 && res.every((r) => r.test(k)); };

/** multipart/form-data → { fields: { name: text }, files: { name: { filename, bytes } } } (only what the owner's form sends) */
export function parseMultipart(buf, type) {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(type ?? "")); if (!m) return null;
  const sep = Buffer.from(`--${m[1] ?? m[2]}`), fields = {}, files = {};
  let at = buf.indexOf(sep);
  while (at >= 0) {
    const start = at + sep.length; if (buf.subarray(start, start + 2).toString() === "--") break;
    const next = buf.indexOf(sep, start); if (next < 0) break;
    const part = buf.subarray(start + 2, next - 2), h = part.indexOf("\r\n\r\n");
    if (h >= 0) {
      const head = part.subarray(0, h).toString("utf8"), data = part.subarray(h + 4);
      const name = /name="([^"]*)"/i.exec(head)?.[1], filename = /filename="([^"]*)"/i.exec(head)?.[1];
      if (name) { if (filename !== undefined) { if (filename && data.length) files[name] = { filename: filename.split(/[\\/]/).pop(), bytes: data }; } else fields[name] = data.toString("utf8"); }
    }
    at = next;
  }
  return { fields, files };
}

/** one uploaded file → what is stored, or why not (nothing sent anywhere) */
export function readUpload({ filename, bytes, country = "", date = "", today }) {
  if (!bytes?.length) return { ok: false, why: "The file is empty." };
  if (bytes.length > IMPORT.maxFileBytes) return { ok: false, why: `The file is larger than ${(IMPORT.maxFileBytes / 1e6).toFixed(1)} MB.` };
  const p = parseKeywordFile(searchFileText(bytes)); if (!p.ok) return { ok: false, why: p.why };
  if (!p.rows.length) return { ok: false, why: "The file has no keywords." };
  const loc = locationOf(country || "ALL"); if (!loc) return { ok: false, why: "Choose a country from the list." };
  const d = String(date ?? "").trim();
  if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`)) || d > today)) return { ok: false, why: "The date must be a real day, not in the future (YYYY-MM-DD)." };
  const day = d || (p.exportedAt ? p.exportedAt.slice(0, 10) : today);
  return { ok: true, seedKey: fileKeyOf(bytes), location: loc.code, locationName: loc.name, day, period: p.period, rows: p.rows };
}

/**
 * the owner's files into the database. uploads: [{ filename, bytes, country, date }]; groups: the seed list's groups (kw-collector
 * currentGroups) — products only are matched. → { files: [...], read, new, merged, duplicates }
 */
export async function importFiles({ uploads, store, groups = [], now = () => Date.now() }) {
  const today = new Date(now()).toISOString().slice(0, 10), products = groups.filter((g) => g.kind === "product").map((g) => ({ id: g.id, name: g.name, tests: g.seeds.map(phraseTest) }));
  const out = { files: [], read: 0, new: 0, merged: 0, duplicates: 0 };
  for (const u of uploads.slice(0, IMPORT.maxFiles)) {
    const r = readUpload({ ...u, today }), f = { name: u.filename, ok: r.ok, why: r.why ?? null };
    out.files.push(f); if (!r.ok) continue;
    Object.assign(f, { location: r.locationName, day: r.day, period: r.period });
    if (await store.fileSeen(r.seedKey)) { f.duplicate = true; f.read = 0; out.duplicates++; continue; }
    const keys = [...new Set(r.rows.map((x) => normSeed(x.text)).filter((k) => k && k.length <= 200))];
    const known = await store.knownKeywords(keys, { location: r.location, language: IMPORT.language });
    const s = await store.saveFetch({ unitId: null, kind: IMPORT.kind, group: null, seedKey: r.seedKey, location: r.location, language: IMPORT.language, day: r.day, at: new Date(now()).toISOString(), period: r.period, ops: 0, rows: r.rows });
    if (s.duplicate) { f.duplicate = true; f.read = 0; out.duplicates++; continue; }
    f.read = keys.length; f.new = keys.filter((k) => !known.has(k)).length; f.merged = f.read - f.new; f.products = {};
    for (const p of products) {
      const mine = keys.filter((k) => p.tests.some((t) => t(k))); if (!mine.length) continue;
      await store.addGroupKeywords(p.id, mine, r.location, r.day); f.products[p.name] = mine.length;
    }
    out.read += f.read; out.new += f.new; out.merged += f.merged;
  }
  return out;
}
