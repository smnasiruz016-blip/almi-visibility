/**
 * 🔴 RR-390 PART B1 · UK SALARIES BY OCCUPATION from the Office for National Statistics' own published file: the Annual Survey of Hours and
 * Earnings, Table 14 (occupation by four-digit SOC 2020 — checked in the file itself, RR-417), the newest edition on its dataset page. ONS publishes it as a zip of spreadsheets,
 * not in its API, so the zip and the "Table 14.7a Annual pay - Gross" spreadsheet (its "Full-Time" sheet) are read here, with no outside
 * library: the zip's own directory and deflate, the sheet's own XML. Open Government Licence v3.0; the source and date on every row.
 * A figure ONS marks "x" (unreliable), ".." (disclosive) or ":" is not kept.
 */
import { inflateRawSync } from "node:zlib";

export const ASHE = Object.freeze({ page: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14", origin: "https://www.ons.gov.uk", licence: "Open Government Licence v3.0", sheet: "Full-Time" });

/** a zip's files (central directory) → [{ name, read() → Buffer }] */
export function zipFiles(buf) {
  let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } if (eocd < 0) return [];
  const out = []; let p = buf.readUInt32LE(eocd + 16); const count = buf.readUInt16LE(eocd + 10);
  for (let k = 0; k < count && p + 46 <= buf.length; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42), name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    out.push({ name, read: () => { const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), data = buf.subarray(start, start + size); return method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data) : null; } });
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
const unXml = (s) => String(s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#163;/g, "£").replace(/&amp;/g, "&");
/** one sheet of an xlsx, by its name → rows: [{ row, cells: { A: "…", B: "…" } }] (inline strings, shared strings and numbers) */
export function sheetRows(xlsx, sheetName) {
  const files = new Map(zipFiles(xlsx).map((f) => [f.name.replace(/^\//, ""), f])), text = (n) => files.get(n)?.read()?.toString("utf8") ?? null;
  const wb = text("xl/workbook.xml"), rels = text("xl/_rels/workbook.xml.rels"); if (!wb || !rels) return [];
  const rid = new RegExp(`<sheet\\b[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*r:id="([^"]+)"`).exec(wb)?.[1]; if (!rid) return [];
  const target = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels); const path = String(target?.[1] ?? target?.[2] ?? "").replace(/^\//, "").replace(/^(?!xl\/)/, "xl/");
  const shared = (text("xl/sharedStrings.xml") ?? "").split(/<si>/).slice(1).map((s) => unXml([...s.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join("")));
  const xml = text(path) ?? "";
  return [...xml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map((r) => ({ row: Number(r[1]), cells: Object.fromEntries([...r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => { const t = /\bt="([^"]+)"/.exec(c[2])?.[1], v = /<v>([^<]*)<\/v>/.exec(c[3] ?? "")?.[1]; return [c[1], t === "s" ? shared[Number(v)] ?? "" : t === "inlineStr" ? unXml([...(c[3] ?? "").matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join("")) : v ?? ""]; }).filter(([, v]) => v !== "")) }));
}
/* only a plain number is a figure: ONS's "x" (CV over 20%, unreliable), ".." (disclosive) and ":" (not available) are never kept */
const num = (v) => (/^-?\d+(?:\.\d+)?$/.test(String(v ?? "").trim()) ? Math.round(Number(v)) : null);
/* 🔴 RR-417 · what every stored row says it is (the owner's words): the figure, the jobs it covers, the year, provisional or not */
export const ASHE_BASIS = "median gross annual pay, full-time employee jobs";
/* 🔴 RR-417 · WHICH SOC the file is coded in, read from the FILE (its name and its own codes), never from the dataset address — the address
 * still says "soc2010" while the editions since 2021 are SOC 2020. Codes that changed between the two tell them apart, each checked with
 * the title ONS prints in the same row. A file that is not SOC 2020 is refused (the rows are labelled soc2020). */
const SOC_MARKS = Object.freeze({ "SOC 2020": [["6135", /^care workers and home carers$/i], ["2134", /^programmers and software development professionals$/i], ["2231", /^midwifery nurses$/i]], "SOC 2010": [["6145", /^care workers and home carers$/i], ["2136", /^programmers and software development professionals$/i], ["2231", /^nurses$/i]] });
export function socOf(fileName, rows) {
  const by = new Map(rows.filter((r) => /^'?\d{4}$/.test(String(r.cells.B ?? "").trim())).map((r) => [String(r.cells.B).replace(/^'/, "").trim(), String(r.cells.A ?? "").trim()]));
  const fits = (soc) => SOC_MARKS[soc].every(([c, t]) => t.test(by.get(c) ?? "")), named = /\bSOC\s?20\b|SOC\s?2020/i.test(fileName) ? "SOC 2020" : /\bSOC\s?10\b|SOC\s?2010/i.test(fileName) ? "SOC 2010" : null;
  const coded = fits("SOC 2020") ? "SOC 2020" : fits("SOC 2010") ? "SOC 2010" : null;
  return { soc: coded && (!named || named === coded) ? coded : null, named, coded };
}
/** the sheet's own title row → { year, basisOk }: "Table 14 .7a Annual pay - Gross (£) - For full-time employee jobs…: United Kingdom 2026" */
export function titleOf(rows) { const t = String(rows.find((r) => /Annual pay/i.test(String(r.cells.A ?? "")))?.cells.A ?? ""); return { text: t, year: /\b(20\d\d)\s*$/.exec(t.trim())?.[1] ?? null, basisOk: /Annual pay - Gross/i.test(t) && /full-time employee jobs/i.test(t) }; }
/** the Full-Time sheet of Table 14.7a → one row per four-digit occupation that has a reliable median; every row carries its basis, year and
 * whether ONS calls the edition provisional — without a year or that flag, nothing is made */
export function asheRows(rows, { on, url, year, provisional }) {
  if (!/^\d{4}$/.test(String(year ?? "")) || typeof provisional !== "boolean") return [];
  const head = rows.find((r) => r.cells.A === "Description" && r.cells.B === "Code"); if (!head) return [];
  const col = Object.fromEntries(Object.entries(head.cells).map(([k, v]) => [String(v).trim(), k]));
  return rows.filter((r) => /^'?\d{4}$/.test(String(r.cells.B ?? "").trim())).flatMap((r) => { const code = String(r.cells.B).replace(/^'/, "").trim(), median = num(r.cells[col.Median]); if (median == null) return []; return [{ topic: "jobs:UK", key: `wage|UK|${code}`, kind: "wage", day: on, data: { country: "UK", soc2020: code, title: String(r.cells.A).trim(), basis: ASHE_BASIS, medianAnnualGbp: median, meanAnnualGbp: num(r.cells[col.Mean]), p25AnnualGbp: num(r.cells[col["25"]]), p75AnnualGbp: num(r.cells[col["75"]]), year: String(year), provisional, edition: `${year} ${provisional ? "provisional" : "revised"}`, source: { name: "Office for National Statistics, Annual Survey of Hours and Earnings, Table 14.7a (annual pay, gross)", licence: ASHE.licence, url, readOn: on } } }]; });
}
/** the newest edition's zip on the dataset page → { url, year, provisional } or null */
export function newestZip(html) { const m = /href="(\/file\?uri=[^"]*?\/(\d{4})(provisional|revised)\/[^"]+\.zip)"/i.exec(String(html ?? "")); return m ? { url: `${ASHE.origin}${m[1]}`, year: m[2], provisional: m[3].toLowerCase() === "provisional" } : null; }
/** the whole read: page → zip → Table 14.7a → rows */
export async function readAshe({ fetchImpl = fetch, on, userAgent }) {
  const page = await fetchImpl(ASHE.page, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(30000) }).then((r) => (r.ok ? r.text() : null)).catch(() => null); if (!page) return { ok: false, why: "the ONS dataset page did not answer" };
  const z = newestZip(page); if (!z) return { ok: false, why: "no Table 14 file on the ONS dataset page" };
  const buf = await fetchImpl(z.url, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(120000) }).then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null)).catch(() => null); if (!buf) return { ok: false, why: "the ONS file did not answer" };
  const file = zipFiles(buf).find((f) => /Table 14\.7a\s+Annual pay - Gross/i.test(f.name) && !/\bCV\.xlsx$/i.test(f.name)); if (!file) return { ok: false, why: "Table 14.7a is not in the ONS file" };
  const sheet = sheetRows(file.read(), ASHE.sheet), soc = socOf(file.name, sheet), title = titleOf(sheet);
  /* 🔴 RR-417: the file itself must be SOC 2020 (the rows say soc2020), annual GROSS pay of FULL-TIME employee jobs, of the year its address names */
  if (soc.soc !== "SOC 2020") return { ok: false, rows: [], edition: { ...z, soc: soc.soc }, why: `Table 14.7a is not coded in SOC 2020 (its name says ${soc.named ?? "nothing"}, its codes ${soc.coded ?? "neither"}): not read` };
  if (!title.basisOk || title.year !== z.year) return { ok: false, rows: [], edition: { ...z, soc: soc.soc }, why: `Table 14.7a's own title is not annual gross pay of full-time employee jobs for ${z.year}: not read` };
  const rows = asheRows(sheet, { on, url: z.url, year: z.year, provisional: z.provisional });
  return { ok: rows.length > 0, rows, edition: { ...z, soc: soc.soc }, why: rows.length ? null : "no row could be read from Table 14.7a" };
}
