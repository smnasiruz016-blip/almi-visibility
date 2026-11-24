/**
 * RR-390 PART B · Visibility's leftovers from RR-389: UK salaries from ONS ASHE Table 14 (its own spreadsheet), the language products asked
 * in their own languages, a page with no figure or term gets a proper non-card form (nothing invented), IRCC news from the Government of
 * Canada's own Atom feed. Stand-ins only: no outside call.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { zipFiles, sheetRows, asheRows, newestZip, ASHE } from "../site/ons-ashe.mjs";
import { languageUnits, NEWS_SOURCES, feedItems, PRODUCT_LANGUAGES, TEACHES } from "../site/rr389-collectors.mjs";

/* a real zip (deflate), written here: the reader must take the central directory and inflate */
function zip(files) {
  const parts = [], dir = []; let off = 0;
  for (const [name, text] of Object.entries(files)) { const raw = Buffer.from(text), data = deflateRawSync(raw), n = Buffer.from(name), h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(n.length, 26); parts.push(h, n, data); const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42); dir.push(c, n); off += 30 + n.length + data.length; }
  const cd = Buffer.concat(dir), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(files).length, 8); e.writeUInt16LE(Object.keys(files).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const cell = (ref, v) => (typeof v === "number" ? `<c r="${ref}" t="n"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`);
const SHEET = `<worksheet><sheetData>
<row r="5">${cell("A5", "Description")}${cell("B5", "Code")}${cell("C5", "(thousand)")}${cell("D5", "Median")}${cell("F5", "Mean")}${cell("J5", "25")}${cell("O5", "75")}</row>
<row r="6">${cell("A6", "All employees")}${cell("D6", 40911.2)}</row>
<row r="86">${cell("A86", "   Programmers and software development professionals ")}${cell("B86", "'2134")}${cell("C86", 362)}${cell("D86", 59862.5)}${cell("F86", 69120.6)}${cell("J86", 43509.4)}${cell("O86", 82148.7)}</row>
<row r="87">${cell("A87", "   Elected officers and representatives")}${cell("B87", "'1112")}${cell("D87", "x")}</row>
</sheetData></worksheet>`;
const XLSX = zip({ "xl/workbook.xml": '<workbook><sheets><sheet name="Notes" sheetId="1" r:id="rId1"/><sheet name="Full-Time" sheetId="5" r:id="rId5"/></sheets></workbook>', "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="rId5" Target="/xl/worksheets/sheet5.xml"/></Relationships>', "xl/worksheets/sheet1.xml": "<worksheet/>", "xl/worksheets/sheet5.xml": SHEET });

test("B1 · ONS ASHE Table 14.7a, Full-Time: one row per 4-digit occupation with a reliable median; 'x' (unreliable) is never kept; source, licence and date on every row", () => {
  const outer = zip({ "PROV - Occupation SOC20 (4) Table 14.7a   Annual pay - Gross 2026.xlsx": XLSX.toString("latin1") }); assert.equal(zipFiles(outer).length, 1);
  const rows = asheRows(sheetRows(XLSX, "Full-Time"), { on: "2026-11-07", url: "https://www.ons.gov.uk/file?uri=/x.zip", year: "2026 (provisional)" });
  assert.equal(rows.length, 1, "the 'x' row and the headline row are not occupations with a figure");
  assert.deepEqual([rows[0].data.soc2020, rows[0].data.medianAnnualGbp, rows[0].data.meanAnnualGbp, rows[0].data.p25AnnualGbp, rows[0].data.p75AnnualGbp], ["2134", 59863, 69121, 43509, 82149]);
  assert.equal(rows[0].data.source.licence, "Open Government Licence v3.0"); assert.equal(rows[0].data.source.readOn, "2026-11-07");
  assert.deepEqual(newestZip('<a href="/file?uri=/a/b/2026provisional/ashetable142026provisional.zip">x</a><a href="/file?uri=/a/b/2025revised/y.zip">'), { url: `${ASHE.origin}/file?uri=/a/b/2026provisional/ashetable142026provisional.zip`, year: "2026", provisional: true });
  const rc = readFileSync(new URL("../site/rr389-collectors.mjs", import.meta.url), "utf8"); assert.match(rc, /if \(await mayRead\(ASHE\.page, \{ fetchImpl, cache: robots \}\)\) \{ const u = await readAshe\(/, "inside the jobs run: robots.txt first");
});

test("B2 · the language products are asked in the language they prepare for, where it is spoken; the seed groups' real keys (prep, jobs)", () => {
  const locs = ["FR", "BE", "CH", "CA", "JP", "KR", "DE", "AT", "PK", "IN", "AE", "SA", "QA", "BD"].map((code) => ({ code, name: code, geo: `g/${code}` }));
  const u = languageUnits([{ id: "product:french", key: "french", kind: "product", seeds: ["tcf canada"] }, { id: "product:swiss", key: "swiss", kind: "product", seeds: ["fide"] }, { id: "product:prep", key: "prep", kind: "product", seeds: ["ielts"] }, { id: "product:jobs", key: "jobs", kind: "product", seeds: ["jobs"] }], { locations: locs });
  const by = (p) => u.filter((x) => x.product === p).map((x) => `${x.location}:${x.language}`);
  assert.deepEqual(by("french"), ["FR:fr", "BE:fr", "CH:fr", "CA:fr"]); assert.deepEqual(by("swiss"), ["CH:de", "CH:fr"]);
  assert.ok(by("prep").includes("PK:ur") && by("jobs").includes("IN:hi"), "IELTS (prep) and AlmiJob (jobs) are asked in their learners' languages (RR-389 used wrong keys)");
  assert.ok(!("ielts" in PRODUCT_LANGUAGES) && !("job" in PRODUCT_LANGUAGES));
  for (const k of ["french", "spanish", "japanese", "korean", "italian", "goethe", "portuguese", "dutch", "danish", "norwegian", "swedish", "icelandic", "swiss"]) assert.ok(TEACHES[k]?.length, k);
});

test("B3 · a page with no figure or named term in its sourced lines gets the non-card form (said in its warnings); a page with one still needs its card", () => {
  const sp = readFileSync(new URL("../desktop/seo-pages.mjs", import.meta.url), "utf8");
  assert.match(sp, /if \(claims\.some\(\(x\) => \/\\d\/\.test\(x\.text\) \|\| termIn\(x\.text\)\)\) return;/, "a figure or a term: the card is still required");
  assert.match(sp, /d\.warnings\.push\("No figure or named term stands in its sourced answers, so it has no key-fact card: each answer shows its source and checked date instead\."\)/);
  assert.match(sp, /\(\?<=\(\?:\^\|\[a-z,\]\) \?\)\(\?:\[A-Z\]\[A-Za-z\]\* \)\{1,3\}\[A-Z\]\[a-zA-Z\]\+\\b/, "named terms such as \"AI Marketer\"");
});

test("B4 · IRCC news from the Government of Canada's own Canada News Centre feed (Atom); its items read", () => {
  const s = NEWS_SOURCES.find((x) => x.id === "ircc"); assert.match(s.url, /^https:\/\/api\.io\.canada\.ca\/io-server\/gc\/news\/en\/v2\?dept=departmentofcitizenshipandimmigration&.*format=atom/);
  const it = feedItems('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>New rules for study permits from 1 January</title><id>https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/x.html</id><updated>2026-11-06T15:32:00-05:00</updated><link href="https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/x.html"/></entry></feed>');
  assert.deepEqual(it, [{ title: "New rules for study permits from 1 January", link: "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/x.html", date: "2026-11-06" }]);
});
