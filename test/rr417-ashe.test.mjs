/**
 * 🔴 RR-417 B · UK SALARIES (ONS ASHE Table 14.7a): what each stored row is, and that its codes are the classification its label says.
 * The fixture rows are the ONS file's OWN cells, copied by a script from "PROV - Occupation  SOC20 (4) Table 14.7a   Annual pay - Gross
 * 2026.xlsx" (sheet Full-Time; ashetable142026provisional.zip, read 27 Nov 2026) — only the columns the reader uses. No outside call.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { sheetRows, asheRows, socOf, titleOf, readAshe, ASHE, ASHE_BASIS } from "../site/ons-ashe.mjs";

function zip(files) {
  const parts = [], dir = []; let off = 0;
  for (const [name, body] of Object.entries(files)) { const raw = Buffer.isBuffer(body) ? body : Buffer.from(body), data = deflateRawSync(raw), n = Buffer.from(name), h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(n.length, 26); parts.push(h, n, data); const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42); dir.push(c, n); off += 30 + n.length + data.length; }
  const cd = Buffer.concat(dir), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(files).length, 8); e.writeUInt16LE(Object.keys(files).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const xlsxOf = (rows) => zip({ "xl/workbook.xml": '<workbook><sheets><sheet name="Notes" sheetId="1" r:id="rId1"/><sheet name="Full-Time" sheetId="5" r:id="rId5"/></sheets></workbook>', "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="rId5" Target="/xl/worksheets/sheet5.xml"/></Relationships>', "xl/worksheets/sheet1.xml": "<worksheet/>", "xl/worksheets/sheet5.xml": `<worksheet><sheetData>${rows.map((r) => `<row r="${r.row}">${Object.entries(r.cells).map(([k, v]) => (/^-?\d+(\.\d+)?$/.test(v) ? `<c r="${k}${r.row}"><v>${v}</v></c>` : `<c r="${k}${r.row}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>` });

/* the ONS file's own cells (2026 provisional, Full-Time) */
const REAL = [{"row":1,"cells":{"A":"Table 14 .7a   Annual pay - Gross (£) - For full-time employee jobsa: United Kingdom 2026"}},{"row":5,"cells":{"A":"Description","B":"Code","C":"(thousand)","D":"Median","F":"Mean","J":"25","O":"75"}},{"row":119,"cells":{"A":"   Other nursing professionals ","B":"'2237","C":"469","D":"44600.9","F":"45615.5","J":"37955.5","O":"51933.9"}},{"row":86,"cells":{"A":"   Programmers and software development professionals ","B":"'2134","C":"362","D":"59862.5","F":"69120.60000000001","J":"43509.4","O":"82148.7"}},{"row":384,"cells":{"A":"   Chefs","B":"'5434","C":"90","D":"33333.5","F":"34766.2","J":"27433.4","O":"40165.5"}},{"row":409,"cells":{"A":"   Care workers and home carers","B":"'6135","C":"340","D":"28737.8","F":"29128.8","J":"24274.2","O":"34110.7"}},{"row":134,"cells":{"A":"   Secondary education teaching professionals","B":"'2313","C":"344","D":"49491.8","F":"48962.4","J":"40183.8","O":"56330.5"}},{"row":11,"cells":{"A":"   Elected officers and representatives","B":"'1112","C":"x","D":"x","F":"x","J":"x","O":"x"}},{"row":30,"cells":{"A":"   Officers in armed forces","B":"'1161","C":":"}},{"row":21,"cells":{"A":"   Charitable organisation managers and directors","B":"'1135","C":"x","D":"54834.1","F":"x","J":"x","O":"x"}},{"row":113,"cells":{"A":"   Midwifery nurses","B":"'2231","C":"26","D":"47551.8","F":"48056.9","J":"40663.2","O":"53836.7"}}];
const FILE = "PROV - Occupation  SOC20 (4) Table 14.7a   Annual pay - Gross 2026.xlsx", URL0 = "https://www.ons.gov.uk/file?uri=/x/2026provisional/ashetable142026provisional.zip";
const real = () => sheetRows(xlsxOf(REAL), "Full-Time");

test("1 · FIVE OCCUPATIONS, CELL BY CELL: the stored median and mean are ONS's own cells (to the whole pound), under ONS's own title and SOC 2020 code", () => {
  const rows = asheRows(real(), { on: "2026-11-27", url: URL0, year: "2026", provisional: true }), by = (c) => rows.find((r) => r.data.soc2020 === c)?.data;
  for (const [code, title, median, mean] of [["2237", "Other nursing professionals", 44600.9, 45615.5], ["2134", "Programmers and software development professionals", 59862.5, 69120.6], ["5434", "Chefs", 33333.5, 34766.2], ["6135", "Care workers and home carers", 28737.8, 29128.8], ["2313", "Secondary education teaching professionals", 49491.8, 48962.4]]) {
    const d = by(code); assert.ok(d, `${code} was not kept`);
    assert.deepEqual([d.title, d.medianAnnualGbp, d.meanAnnualGbp], [title, Math.round(median), Math.round(mean)], code);
  }
});

test("2 · EVERY STORED ROW SAYS WHAT IT IS: 'median gross annual pay, full-time employee jobs', the year, and provisional where ONS says so — none is made without them", () => {
  for (const provisional of [true, false]) {
    const rows = asheRows(real(), { on: "2026-11-27", url: URL0, year: "2026", provisional }); assert.ok(rows.length >= 7);
    for (const r of rows) {
      assert.equal(r.data.basis, ASHE_BASIS, `${r.key}: basis`); assert.equal(ASHE_BASIS, "median gross annual pay, full-time employee jobs");
      assert.equal(r.data.year, "2026", `${r.key}: year`); assert.equal(r.data.provisional, provisional, `${r.key}: provisional`); assert.equal(r.data.edition, `2026 ${provisional ? "provisional" : "revised"}`);
      assert.equal(r.data.source.licence, "Open Government Licence v3.0"); assert.equal(r.data.source.url, URL0); assert.equal(r.data.source.readOn, "2026-11-27");
    }
  }
  for (const missing of [{ year: undefined, provisional: true }, { year: "2026", provisional: undefined }, { year: "2026 (provisional)", provisional: true }]) assert.deepEqual(asheRows(real(), { on: "2026-11-27", url: URL0, ...missing }), [], `rows made without ${JSON.stringify(missing)}`);
});

test("3 · UNRELIABLE FIGURES STAY OUT: 'x' (CV over 20%), '..' (disclosive), ':' (not available) — never a number; a reliable median keeps its row, its unreliable mean is empty", () => {
  const extra = [...REAL, { row: 500, cells: { A: "   Disclosive row", B: "'9999", D: "..", F: ".." } }, { row: 501, cells: { A: "   Disclosive mean", B: "'9998", D: "30000", F: "..", J: "..", O: ":" } }];
  const rows = asheRows(sheetRows(xlsxOf(extra), "Full-Time"), { on: "2026-11-27", url: URL0, year: "2026", provisional: true }), codes = rows.map((r) => r.data.soc2020);
  for (const c of ["1112", "1161", "9999"]) assert.ok(!codes.includes(c), `${c} (no reliable median) was kept`);
  const charity = rows.find((r) => r.data.soc2020 === "1135").data; assert.equal(charity.medianAnnualGbp, 54834); assert.equal(charity.meanAnnualGbp, null); assert.equal(charity.p25AnnualGbp, null);
  const d = rows.find((r) => r.data.soc2020 === "9998").data; assert.deepEqual([d.meanAnnualGbp, d.p25AnnualGbp, d.p75AnnualGbp], [null, null, null]);
  for (const r of rows) for (const v of [r.data.medianAnnualGbp, r.data.meanAnnualGbp, r.data.p25AnnualGbp, r.data.p75AnnualGbp]) assert.ok(v === null || Number.isInteger(v), `${r.key}: ${v}`);
});

test("4 · SOC FROM THE FILE ITSELF: the 2026 file is SOC 2020 by its name AND its codes; a SOC 2010-coded file is refused (never joined to the wrong occupation), whatever its name or address says", async () => {
  assert.deepEqual(socOf(FILE, real()), { soc: "SOC 2020", named: "SOC 2020", coded: "SOC 2020" });
  assert.deepEqual(titleOf(real()), { text: REAL[0].cells.A, year: "2026", basisOk: true });
  /* SOC 2010's own codes: 6145 care workers, 2136 programmers, 2231 nurses (in SOC 2020, 2231 is midwifery nurses and 2136 IT testing) */
  const OLD = [REAL[0], REAL[1], { row: 80, cells: { A: "   Programmers and software development professionals", B: "'2136", D: "40000", F: "42000" } }, { row: 81, cells: { A: "   Nurses", B: "'2231", D: "31000", F: "32000" } }, { row: 82, cells: { A: "   Care workers and home carers", B: "'6145", D: "17000", F: "17500" } }];
  assert.equal(socOf("Occupation SOC10 (4) Table 14.7a Annual pay - Gross 2019.xlsx", sheetRows(xlsxOf(OLD), "Full-Time")).soc, "SOC 2010");
  assert.equal(socOf(FILE, sheetRows(xlsxOf(OLD), "Full-Time")).soc, null, "a SOC 2010-coded file named SOC20 was taken");
  assert.equal(socOf("Occupation SOC10 (4) Table 14.7a.xlsx", real()).soc, null, "name and codes disagree, yet taken");
  /* the whole read, stand-ins only: the address says soc2010 (it always has) — the file decides */
  const page = `<a href="/file?uri=/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14/2026provisional/ashetable142026provisional.zip">x</a>`;
  const read = (inner, name = FILE) => readAshe({ on: "2026-11-27", userAgent: "t", fetchImpl: async (u) => (String(u) === ASHE.page ? new Response(page) : new Response(zip({ [name]: inner }))) });
  const good = await read(xlsxOf(REAL)); assert.equal(good.ok, true); assert.equal(good.edition.soc, "SOC 2020"); assert.ok(good.rows.every((r) => r.data.provisional === true && r.data.year === "2026" && r.data.basis === ASHE_BASIS));
  const bad = await read(xlsxOf(OLD)); assert.equal(bad.ok, false); assert.deepEqual(bad.rows, []); assert.match(bad.why, /not coded in SOC 2020/);
  const wrongYear = await read(xlsxOf([{ row: 1, cells: { A: "Table 14 .7a   Annual pay - Gross (£) - For full-time employee jobsa: United Kingdom 2025" } }, ...REAL.slice(1)])); assert.equal(wrongYear.ok, false); assert.match(wrongYear.why, /full-time employee jobs for 2026/);
  const allJobs = await read(xlsxOf([{ row: 1, cells: { A: "Table 14 .7a   Annual pay - Gross (£) - For all employee jobsa: United Kingdom 2026" } }, ...REAL.slice(1)])); assert.equal(allJobs.ok, false, "a table of ALL jobs was stored as full-time");
});
