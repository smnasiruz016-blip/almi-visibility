/**
 * F44 · ACCEPTANCE AMENDMENT 2 (RR-268) · THE SOURCE READER — the engine reads an official page itself (C7), falls back to the client's
 * own browser route only when it is connected and started (C8), lets the client's own AI propose facts under the paid-provider controls
 * (C9), admits a fact only when its quotation is word for word in the stored page text (C10), and rechecks every fact on its recheck date
 * (C11) — named nowhere for a product, client, exam or host (C12).
 *
 * Fixtures DRIVE the mechanism on two unrelated subjects — a language test's rules page and a town's recycling rules page (outside the
 * exam family) — and prove the mechanism only. The production path runs the entry point in a scratch world with no egress. The REAL test
 * reads the declared batch's stored recheck, counts only. The production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { engineRead, browserRead, readSource, extractFacts, recheckFacts, recheckCounts, readRecord, recheckRecord, robotsOn, quotationIn, isOneSentence, dueOn,
  ROUTE, READ_STATE, BLOCK, RECHECK, REJECT, FALLBACK_ON, BROWSER_GAP_MS, SOURCE_READ, SOURCE_READ_RECORD, FACT_RECHECK_RECORD, extractionRecord, EXTRACTION, EXTRACTION_RECORD,
  captureRead, clientFileRead, pdfRead, VIA, CURRENCY, CAPTURE_REFUSE, hostOf, ROUTE_STOPS, SAVE_THE_PAGE, BROWSER_WALL_BELOW, quotationShape, REJECT_PLAIN } from "../src/facts/source-reader.mjs";
import { browserSignal, robotsVerdict, openBrowserRoute, WALL_COVERS_BELOW } from "../src/facts/browser-route.mjs";
import { pdfText, PDF_TEXT } from "../src/facts/pdf-text.mjs";
import { deflateSync } from "node:zlib";
import { batchFacts, quotationsOf, QUOTATION_MIN_CHARS } from "../src/facts/batch-facts.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider } from "../src/cost/paid-provider-gate.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { PACE_FLOOR_MS } from "../src/tenancy/connectors.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { classifyEntryPoint } from "../tools/tenant-scope-census.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { privateSourcesRoot, withPrivateTexts, publicCopy, TEXT_AT, TEXT_MISSING } from "../src/facts/private-texts.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-09-10";

/* ── two unrelated subjects ── */
const filler = (topic) => Array.from({ length: 12 }, (_, i) => `<p>Paragraph ${i + 1} about ${topic}, written in plain words so the page is a real document and not a stub.</p>`).join("");
const LANG = { url: "https://tests.invalid/rules", html: `<html><body><h1>Rules</h1><p>Each sub-test is scored from 0 to 500 and a score of 350 is a grade B.</p><p>Results arrive within &ldquo;ten&rdquo; working days.</p>${filler("the language test")}</body></html>` };
const TOWN = { url: "https://town.invalid/recycling", html: `<html><body><h1>Recycling</h1><p>Glass bottles go in the green bin, emptied every second Tuesday.</p><p>Batteries are taken at the depot only.</p>${filler("recycling")}</body></html>` };

/* a network handed in: each URL answers as declared; a robots file that is not declared answers 404 (no rules); every call is logged */
function network(pages = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const p = pages[String(url)];
    if (!p) return new Response("not here", { status: 404 });
    if (p.throws) throw new TypeError(p.throws);
    const r = new Response(p.body ?? "", { status: p.status ?? 200, headers: { "content-type": p.type ?? "text/html" } });
    if (p.landed) Object.defineProperty(r, "url", { value: p.landed });
    return r;
  };
  return { fetchImpl, calls };
}
const pagesOf = (...xs) => Object.fromEntries(xs.map((x) => [x.url, { body: x.html }]));
const fresh = () => ({ engineReads: 0, reads: 0, stopped: null });

/* ================= C7 · READ ================= */

test("C7 · FIRING CONTROL: the engine reads a public page itself — robots first through the same fetch, a plain GET with no credential, cookie or body; a disallowed path, an unreadable robots file and a login wall are not read past", async () => {
  for (const s of [LANG, TOWN]) {
    const n = network(pagesOf(s));
    const r = await engineRead(s.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
    assert.deepEqual([r.state, r.route, r.readOn, r.sha256, n.calls.map((c) => new URL(c.url).pathname)], [READ_STATE.READ, ROUTE.ENGINE, ON, createHash("sha256").update(r.text).digest("hex"), ["/robots.txt", new URL(s.url).pathname]], "robots is not read first, or the page is not read through the fetch handed in");
    const page = n.calls[1].init;
    assert.deepEqual([page.method, page.body, page.credentials, Object.keys(page.headers)], ["GET", undefined, "omit", ["User-Agent"]], "the request carries more than a plain public GET");
    assert.ok(!/<[a-z]/i.test(r.text) && r.text.includes("Paragraph 1"), "the stored text is not the page's words");
  }
  const robots = (rules, extra = {}) => network({ "https://tests.invalid/robots.txt": rules, [LANG.url]: { body: LANG.html }, ...extra });
  const dis = robots({ body: "User-agent: *\nDisallow: /rules\n" });
  assert.deepEqual([(await engineRead(LANG.url, { fetchImpl: dis.fetchImpl, robots: robotsOn(dis.fetchImpl), on: ON })).reason, dis.calls.length], [BLOCK.ROBOTS_DISALLOWED, 1], "a disallowed path was read");
  const broken = robots({ status: 500, body: "" });
  assert.deepEqual([(await engineRead(LANG.url, { fetchImpl: broken.fetchImpl, robots: robotsOn(broken.fetchImpl), on: ON })).reason, broken.calls.length], [BLOCK.ROBOTS_UNREADABLE, 1], "a page was read when its robots file could not be");
  const wall = network({ [LANG.url]: { body: `<form><input type="password" name="p"></form>${filler("x")}` } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: wall.fetchImpl, robots: robotsOn(wall.fetchImpl), on: ON })).reason, BLOCK.LOGIN_WALL, "a login wall was read past");
  const sent = network({ [LANG.url]: { body: LANG.html, landed: "https://tests.invalid/account/login?next=/rules" } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: sent.fetchImpl, robots: robotsOn(sent.fetchImpl), on: ON })).reason, BLOCK.LOGIN_WALL);
  const away = network({ [LANG.url]: { body: LANG.html, landed: "https://parked.invalid/" } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: away.fetchImpl, robots: robotsOn(away.fetchImpl), on: ON })).reason, BLOCK.OFF_HOST);
  await assert.rejects(engineRead(LANG.url, { robots: robotsOn(async () => new Response("", { status: 404 })), on: ON }), /one paced path/, "the engine read without an opened connector's fetch");
  /* RR-268 C: a document that is not text is never kept as a page's text — B3 stored four PDFs' raw bytes as READ */
  for (const [body, type] of [[`%PDF-1.5 ${filler("bytes")}`, "text/html"], [LANG.html, "application/pdf"], [LANG.html, "image/png"]]) {
    const pdf = network({ [LANG.url]: { body, type } });
    const r = await engineRead(LANG.url, { fetchImpl: pdf.fetchImpl, robots: robotsOn(pdf.fetchImpl), on: ON });
    assert.deepEqual([r.state, r.reason, r.text], [READ_STATE.BLOCKED, BLOCK.NOT_TEXT, undefined], `${type}: a document that is not text was kept as its text`);
  }
  const plain = network({ [LANG.url]: { body: LANG.html, type: "text/plain; charset=utf-8" } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: plain.fetchImpl, robots: robotsOn(plain.fetchImpl), on: ON })).state, READ_STATE.READ, "CONTROL: a plain-text page must still be read");
  assert.equal(PACE_FLOOR_MS, 2000, "the paced path's floor is not 2 s");
});

/* RR-269 §2 · a PDF built here, byte by byte: a simple font with no widths, a composite font read through its own ToUnicode map, a TJ gap,
 * a new line; or a page drawn only from an image (a scanned document). Nothing is downloaded. */
function makePdf({ scanned = false, raw = null, lines = ["Each sub-test is scored from 0 to 500.", ["A score of", -300, "350 is a grade B."]] } = {}) {
  const esc = (t) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const ops = raw ?? (scanned ? "q 100 0 0 100 0 0 cm /Im1 Do Q" : null) ?? ["BT /F1 12 Tf 72 720 Td", ...lines.map((l, i) => `${i ? "0 -16 Td " : ""}${Array.isArray(l) ? `[${l.map((x) => (typeof x === "number" ? x : `(${esc(x)})`)).join("")}] TJ` : `(${esc(l)}) Tj`}`), "0 -16 Td /F2 12 Tf <00480049> Tj ET"].join("\n");
  const content = deflateSync(Buffer.from(ops, "latin1"));
  const cmap = deflateSync(Buffer.from("begincmap 1 begincodespacerange <0000> <FFFF> endcodespacerange 2 beginbfchar <0048> <0048> <0049> <0069> endbfchar endcmap", "latin1"));
  const simpleCmap = deflateSync(Buffer.from("begincmap 1 begincodespacerange <0000> <FFFF> endcodespacerange 2 beginbfchar <48> <0048> <69> <0069> endbfchar endcmap", "latin1"));
  const parts = [Buffer.from("%PDF-1.7\n"), Buffer.from("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"),
    Buffer.from(`3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 6 0 R /F3 10 0 R >> /XObject << /Im1 9 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n`),
    /* RR-270: a simple TrueType font whose own ToUnicode map declares a two-byte code space (as Speech Pathology Australia's eligibility PDF does) */
    Buffer.from("10 0 obj << /Type /Font /Subtype /TrueType /BaseFont /Calibri /Encoding /WinAnsiEncoding /ToUnicode 11 0 R >> endobj\n"),
    Buffer.from(`11 0 obj << /Length ${simpleCmap.length} /Filter /FlateDecode >> stream\n`), simpleCmap, Buffer.from("\nendstream endobj\n"),
    Buffer.from(`5 0 obj << /Length ${content.length} /Filter /FlateDecode >> stream\n`), content, Buffer.from("\nendstream endobj\n"),
    Buffer.from("6 0 obj << /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H /DescendantFonts [8 0 R] /ToUnicode 7 0 R >> endobj\n"),
    Buffer.from(`7 0 obj << /Length ${cmap.length} /Filter /FlateDecode >> stream\n`), cmap, Buffer.from("\nendstream endobj\n8 0 obj << /Type /Font /Subtype /CIDFontType2 /DW 600 >> endobj\n"),
    Buffer.from("9 0 obj << /Type /XObject /Subtype /Image /Width 1 /Height 1 /BitsPerComponent 8 /ColorSpace /DeviceGray /Length 1 >> stream\n\u0000\nendstream endobj\n%%EOF\n")];
  return Buffer.concat(parts);
}
const LONG = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} of the rules, written in plain words so the document is a real one and not a stub.`);

test("C7 · PDF READER · FIRING CONTROL (RR-269 §2): a PDF is read by the PDF reader — its text, each font decoded (its own ToUnicode map first), a gap a space, a new line a line; the text kept with its sha256 and checked word for word; a scanned PDF or a document that is not one is NOT_A_TEXT_DOCUMENT, named, its bytes never kept", async () => {
  const r = pdfText(makePdf());
  assert.deepEqual([r.state, r.pages, r.text], [PDF_TEXT.TEXT, 1, "Each sub-test is scored from 0 to 500.\nA score of 350 is a grade B.\nHi"], "the PDF's text is not its words, in order, decoded through its fonts");
  /* a page that draws its lower line first, and the words of a line right to left, is read top to bottom, left to right */
  assert.equal(pdfText(makePdf({ raw: "BT /F1 12 Tf 72 704 Td (second line) Tj 0 16 Td (first line) Tj ET BT /F1 12 Tf 190 688 Td (end.) Tj -118 0 Td (third line at the) Tj ET" })).text, "first line\nsecond line\nthird line at the end.", "the PDF's text is in the order it was drawn, not the order the page shows it");
  /* RR-270: a simple font's codes are one byte each, whatever code space its ToUnicode map declares — read two at a time, every other letter was lost */
  assert.equal(pdfText(makePdf({ raw: "BT /F3 12 Tf 72 720 Td (Hi there, OET results) Tj ET" })).text, "Hi there, OET results", "a simple font's text was read two bytes to a letter");
  const pdfUrl = "https://tests.invalid/rules.pdf";
  const bytes = makePdf({ lines: ["Each sub-test is scored from 0 to 500.", ["A score of", -300, "350 is a grade B."], ...LONG] });
  for (const type of ["application/pdf", "text/html", ""]) {
    const n = network({ [pdfUrl]: { body: bytes, type } });
    const got = await engineRead(pdfUrl, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
    assert.deepEqual([got.state, got.route, got.document, got.pages, got.sha256 === createHash("sha256").update(got.text).digest("hex"), quotationIn("A score of 350 is a grade B.", got.text), /%PDF|endstream|FlateDecode/.test(got.text)], [READ_STATE.READ, ROUTE.ENGINE, "PDF", 1, true, true, false], `${type || "no type"}: the PDF's text was not read, or its bytes were kept`);
    assert.deepEqual([readRecord({ read: got, tenantId: "t", on: ON, run: "r" }).document, readRecord({ read: got, tenantId: "t", on: ON, run: "r" }).via], ["PDF", VIA.ENGINE]);
  }
  /* each fault alone: a scanned PDF, a document that only says it is a PDF, an encrypted PDF */
  for (const [body, type, why] of [[makePdf({ scanned: true }), "application/pdf", /shows no text \(a scanned document\)/], [LANG.html, "application/pdf", /not a PDF/], [Buffer.concat([makePdf(), Buffer.from("trailer << /Encrypt 10 0 R >>")]), "application/pdf", /encrypted/]]) {
    const n = network({ [pdfUrl]: { body, type } });
    const got = await engineRead(pdfUrl, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
    assert.deepEqual([got.state, got.reason, got.text, why.test(got.detail)], [READ_STATE.BLOCKED, BLOCK.NOT_TEXT, undefined, true], `${got.detail}: a PDF with no readable text was kept as text`);
  }
  assert.equal(pdfRead(pdfUrl, ROUTE.ENGINE, makePdf(), ON).reason, BLOCK.NOT_TEXT, "a PDF with fewer characters than a document was kept as a document");
});

test("CAPTURE · CLIENT FILE · FIRING CONTROL (RR-269 §1): a page read in the client's own browser is imported with its URL, read date and route as VIA CAPTURE — never an engine-driven C8 read; a capture that does not say all three, or holds no text, is refused, named; a supplied file the client says is out of date is kept, and no fact stands on it", async () => {
  const raw = (head) => `${head}\n---\nRules. A score of 350 is a grade B.\n${LONG.join("\n")}\n`;
  const ok = captureRead({ raw: raw("URL: https://tests.invalid/rules\nREAD: 2026-09-11 · route: client browser (a person, in the client's own browser)"), file: "browser-captures-2026-09-11/01.txt" });
  assert.deepEqual([ok.state, ok.route, ok.via, ok.readOn, ok.url, ok.capture.file, ok.sha256 === createHash("sha256").update(ok.text).digest("hex"), quotationIn("A score of 350 is a grade B.", ok.text)], [READ_STATE.READ, ROUTE.BROWSER, VIA.CAPTURE, "2026-09-11", "https://tests.invalid/rules", "browser-captures-2026-09-11/01.txt", true, true]);
  const rec = readRecord({ read: ok, tenantId: "t", on: ON, run: "r" });
  assert.deepEqual([rec.via, rec.readOn, rec.capture.file, rec.route], [VIA.CAPTURE, "2026-09-11", "browser-captures-2026-09-11/01.txt", ROUTE.BROWSER], "the capture's own read date and file are not kept with it");
  for (const [head, why] of [["READ: 2026-09-11 · route: client browser", CAPTURE_REFUSE.NO_URL], ["URL: https://tests.invalid/rules\nREAD: soon · route: client browser", CAPTURE_REFUSE.NO_DATE], ["URL: https://tests.invalid/rules\nREAD: 2026-09-11 · route: a search engine", CAPTURE_REFUSE.NOT_CLIENT_BROWSER]])
    assert.deepEqual([captureRead({ raw: raw(head), file: "x" }).state, captureRead({ raw: raw(head), file: "x" }).reason], ["REFUSED", why], `${why} did not refuse`);
  assert.equal(captureRead({ raw: "URL: https://tests.invalid/rules\nREAD: 2026-09-11 · route: client browser\n---\n \n", file: "x" }).reason, CAPTURE_REFUSE.NO_TEXT);
  /* a capture of PART of a page: a quotation not in the part is BLOCKED, named — never CHANGED; control: the whole page shows it CHANGED */
  const fact = { factId: "f1", link: "https://tests.invalid/rules", quotations: ["Results arrive within ten working days."], pages: ["p"] };
  const part = (await recheckFacts({ facts: [fact], readOf: async () => ok, on: ON }))[0];
  assert.deepEqual([ok.capture.whole, part.state, part.reason, part.rebuild.length], [false, RECHECK.BLOCKED, BLOCK.CAPTURE_PART, 0], "a quotation missing from a captured PART was read as gone from the page");
  const whole = captureRead({ raw: raw("URL: https://tests.invalid/rules\nREAD: 2026-09-11 · route: client browser · captured: main page text"), file: "w" });
  assert.deepEqual([whole.capture.whole, (await recheckFacts({ facts: [fact], readOf: async () => whole, on: ON }))[0].state], [true, RECHECK.CHANGED], "CONTROL: a quotation missing from the whole captured page must be CHANGED");
  assert.equal(captureRead({ raw: raw("URL: https://tests.invalid/rules\nREAD: 2026-09-11 · route: client browser · captured: main page text (excerpt)"), file: "e" }).capture.whole, false, "an excerpt was read as the whole page");
  /* a supplied file: kept with its original URL and day; out of date, no fact stands on it — control: the same file, current, admits */
  const bytes = makePdf({ lines: ["Price list.", "The fee is 30,000 for the test.", ...LONG] });
  const old = clientFileRead({ bytes, file: "client-files/old.pdf", url: "https://tests.invalid/prices.pdf", suppliedOn: "2026-09-10", outOfDate: "the client says these are last year's prices" });
  assert.deepEqual([old.state, old.route, old.via, old.readOn, old.currency.state, old.clientFile.suppliedOn, old.clientFile.fileSha256 === createHash("sha256").update(bytes).digest("hex")], [READ_STATE.READ, ROUTE.CLIENT_FILE, VIA.CLIENT_FILE, "2026-09-10", CURRENCY.OUT_OF_DATE, "2026-09-10", true]);
  const p = { sentence: "The fee is 30,000 for the test.", source: "https://tests.invalid/prices.pdf", quotation: "The fee is 30,000 for the test." };
  const refused = await extractFacts({ read: old, propose: async () => [p] });
  assert.deepEqual([refused.state, refused.admitted.length, refused.rejected[0].reason], ["OUT_OF_DATE", 0, REJECT.OUT_OF_DATE], "a fact stood on a file the client says is out of date");
  const current = clientFileRead({ bytes, file: "client-files/old.pdf", url: "https://tests.invalid/prices.pdf", suppliedOn: "2026-09-10" });
  assert.deepEqual([current.currency.state, (await extractFacts({ read: current, propose: async () => [p] })).admitted.length], [CURRENCY.AS_SUPPLIED, 1], "CONTROL: a current supplied file must admit its word-for-word fact");
});

/* ================= C8 · FALLBACK ================= */

test("C8 · FIRING CONTROL: a refusal, a challenge or an empty page goes to the client's own browser route only when it is connected and started — 5 s per host, a run cap, a stop on a captcha or login wall; with no route the source is BLOCKED with its URL, never an error", async () => {
  const refused = network({ [TOWN.url]: { status: 403, body: "no" } });
  const ask = (route, state = fresh(), paced = []) => readSource(TOWN.url, { fetchImpl: refused.fetchImpl, robots: robotsOn(refused.fetchImpl), route, state, on: ON, pace: async (u, gap) => { paced.push(gap); }, hosts: new Map() });
  const none = await ask(null);
  assert.deepEqual([none.state, none.reason, none.url, none.engineBlocked], [READ_STATE.BLOCKED, BLOCK.NO_ROUTE, TOWN.url, BLOCK.REFUSED], "a blocked read with no route is not BLOCKED with its URL");
  const reads = [];
  const route = (over = {}) => ({ connected: true, startedByClient: true, cap: 2, read: async (u) => { reads.push(u); return { text: TOWN.html }; }, ...over });
  assert.equal((await ask(route({ startedByClient: false }))).reason, BLOCK.NO_ROUTE, "a route the client did not start was used");
  assert.equal(reads.length, 0);
  const paced = [];
  const ok = await ask(route(), fresh(), paced);
  assert.deepEqual([ok.state, ok.route, ok.engineBlocked, paced, BROWSER_GAP_MS], [READ_STATE.READ, ROUTE.BROWSER, BLOCK.REFUSED, [5000], 5000], "the route did not read, or read without its 5 s gap");
  const st = fresh();
  await ask(route({ cap: 1 }), st); const capped = await ask(route({ cap: 1 }), st);
  assert.equal(capped.reason, BLOCK.ROUTE_CAP, "the route read past its run cap");
  const st2 = fresh(); const before = reads.length;
  const stopped = await ask(route({ read: async () => ({ text: "<p>Please solve this captcha</p>" }) }), st2);
  const after = await ask(route(), st2);
  assert.deepEqual([stopped.reason, st2.stoppedHosts.get(hostOf(TOWN.url)), after.reason, reads.length - before], [BLOCK.CAPTCHA, BLOCK.CAPTCHA, BLOCK.ROUTE_STOPPED, 0], "a captcha did not stop the route for its host");
  assert.equal((await ask(route({ read: async () => ({ text: "x", signal: BLOCK.LOGIN_WALL }) }))).reason, BLOCK.LOGIN_WALL);
  /* only a refusal, a challenge or an empty page falls back: a page that is not found never does */
  /* RR-277: a robots file the engine could not read falls back too — the route then reads the robots file itself (see C8 · RR-277) */
  assert.deepEqual(FALLBACK_ON, [BLOCK.REFUSED, BLOCK.CHALLENGE, BLOCK.EMPTY, BLOCK.ROBOTS_UNREADABLE]);
  const gone = network({});
  const seen = reads.length;
  assert.equal((await readSource(TOWN.url, { fetchImpl: gone.fetchImpl, robots: robotsOn(gone.fetchImpl), route: route(), state: fresh(), on: ON, pace: async () => {}, hosts: new Map() })).reason, BLOCK.NOT_FOUND);
  for (const body of ["<title>Just a moment...</title>", "<p>tiny</p>"]) {
    const n = network({ [TOWN.url]: { body } });
    const r = await readSource(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), route: route(), state: fresh(), on: ON, pace: async () => {}, hosts: new Map() });
    assert.equal(r.route, ROUTE.BROWSER, `${body}: a challenge or an empty page did not go to the client's route`);
  }
  assert.equal(reads.length, seen + 2, "a not-found page went to the browser route");
  /* the run's bound is honoured before any request */
  const bound = network(pagesOf(TOWN));
  const over = await readSource(TOWN.url, { fetchImpl: bound.fetchImpl, robots: robotsOn(bound.fetchImpl), state: fresh(), on: ON, maxReads: 1 });
  assert.deepEqual([over.reason, bound.calls.length], [BLOCK.READ_CAP, 0]);
});

/* ================= C9 · EXTRACT and C10 · VERBATIM ================= */

test("C9 · FIRING CONTROL: the client's own AI proposes facts only through the paid-provider gate — off by default, nothing is called and nothing admitted; a proposal of more than one sentence, or of another source, is refused, named", async () => {
  const n = network(pagesOf(TOWN));
  const read = await engineRead(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const dir = mkdtempSync(join(tmpdir(), "f44-c9-"));
  try {
    const fake = createFakePaidProvider({ name: "fake-paid-provider" });
    const gate = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, killSwitch: createKillSwitch(), ledger: createCostLedger(join(dir, "l.jsonl")), spendAuthority: { actorRef: "actor:cc", scope: { scopeType: "TENANT", tenantId: "tenant:00000000000000000000000000000f02" } } });
    const viaGate = async (text, url) => (await gate.call("fake-paid-provider", { task: "PROPOSE_FACTS", url, chars: text.length })).result;
    const off = await extractFacts({ read, propose: viaGate });
    assert.deepEqual([off.state, off.admitted.length, fake.callsReceived(), gate.refusals().length], ["REFUSED", 0, 0, 1], "the client's AI was called while the paid provider is off");
    assert.match(off.code, /^NOT_AUTHORI[SZ]ED/);
    const props = await extractFacts({ read, propose: async (_, url) => [
      { sentence: "Glass bottles go in the green bin.", quotation: "Glass bottles go in the green bin", source: url },
      { sentence: "Glass goes green. Batteries go to the depot.", quotation: "Batteries are taken at the depot only.", source: url },
      { sentence: "Batteries are taken at the depot.", quotation: "Batteries are taken at the depot only.", source: "https://elsewhere.invalid/" },
    ] });
    assert.deepEqual([props.admitted.length, props.rejected.map((r) => r.reason)], [1, [REJECT.NOT_ONE_SENTENCE, REJECT.NOT_ONE_SOURCE]]);
    assert.deepEqual([isOneSentence("One. Two."), isOneSentence("A rule holds."), isOneSentence("no end")], [false, true, false]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("C10 · FIRING CONTROL: a proposed fact is admitted only when its quotation is in the stored page text word for word — a changed number, a changed word or a lower-cased span is REJECTED with its reason; markup, entities and curly quotes do not decide", async () => {
  const n = network(pagesOf(LANG));
  const read = await engineRead(LANG.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const p = (quotation) => ({ sentence: "A score of 350 is a grade B.", quotation, source: LANG.url });
  const r = await extractFacts({ read, propose: async () => [p("a score of 350 is a grade B"), p("a score of 300 is a grade B"), p("A SCORE OF 350 IS A GRADE B"), p("Results arrive within \"ten\" working days."), p(""), p("a score of 350 is a grade C")] });
  assert.deepEqual([r.admitted.map((a) => a.quotation), r.rejected.map((x) => x.reason)], [["a score of 350 is a grade B", "Results arrive within \"ten\" working days."], [REJECT.NOT_IN_TEXT, REJECT.NOT_IN_TEXT, REJECT.NO_QUOTATION, REJECT.NOT_IN_TEXT]]);
  assert.ok(r.admitted.every((a) => a.pageSha256 === read.sha256 && a.readOn === ON), "an admitted fact does not name the stored text it was checked against");
  /* nothing is admitted from a page that was not read and stored */
  assert.deepEqual((await extractFacts({ read: { state: READ_STATE.BLOCKED }, propose: async () => [p("a score of 350 is a grade B")] })).rejected.map((x) => x.reason), [REJECT.NO_PAGE_TEXT]);
  assert.deepEqual([quotationIn("grade B", "<b>grade</b> B"), quotationIn("grade b", "grade B"), quotationIn("", "x")], [true, false, false]);
  /* the stored read keeps the text with its sha256, URL and read date */
  const rec = readRecord({ read, tenantId: "t", on: ON, run: "r" });
  assert.deepEqual([rec.record_type, rec.url, rec.sha256, rec.readOn, rec.text === read.text, evidenceStateOf(rec).state], [SOURCE_READ_RECORD, LANG.url, read.sha256, ON, true, "OBSERVED"]);
  assert.equal(evidenceStateOf(readRecord({ read: { state: READ_STATE.BLOCKED, url: LANG.url, route: ROUTE.ENGINE, reason: BLOCK.REFUSED }, tenantId: "t", on: ON, run: "r" })).state, "UNKNOWN");
});

/* ================= C11 · RECHECK ================= */

test("RR-282 · ONE SENTENCE · FIRING CONTROL: a new fact's quotation is one sentence or one table row, word for word — two sentences, or a line, tab or list-bullet break, is refused with a plain message; an existing fact's quotation is never judged by it", async () => {
  const n = network(pagesOf(TOWN));
  const read = await engineRead(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const p = (quotation) => ({ sentence: "Glass goes in the green bin.", quotation, source: TOWN.url });
  const two = "Glass bottles go in the green bin, emptied every second Tuesday. Batteries are taken at the depot only.";
  assert.ok(quotationIn(two, read.text), "the control's two sentences are not in the stored text — the refusal below would prove nothing");
  const r = await extractFacts({ read, propose: async () => [p("Glass bottles go in the green bin, emptied every second Tuesday."), p(two), p("emptied every second Tuesday.\nBatteries are taken"), p("Glass bottles go in the green bin, • emptied every second Tuesday"), p("Glass bottles go in the green bin, emptied every second Tuesday")] });
  assert.deepEqual([r.admitted.map((a) => a.quotation), r.rejected.map((x) => x.reason)],
    [["Glass bottles go in the green bin, emptied every second Tuesday.", "Glass bottles go in the green bin, emptied every second Tuesday"], [REJECT.QUOTATION_TOO_LONG, REJECT.QUOTATION_SPANS_LAYOUT, REJECT.QUOTATION_SPANS_LAYOUT]]);
  assert.deepEqual(r.rejected.map((x) => x.message), [REJECT_PLAIN[REJECT.QUOTATION_TOO_LONG], REJECT_PLAIN[REJECT.QUOTATION_SPANS_LAYOUT], REJECT_PLAIN[REJECT.QUOTATION_SPANS_LAYOUT]], "a refused quotation carries no plain message");
  assert.ok(Object.values(REJECT_PLAIN).every((m) => /^The quotation [a-z ,]+\. Quote only/.test(m)), "a plain message is not plain");
  /* one table row, a mid-sentence abbreviation and a sentence ending at its end each pass; a second sentence after a spaced stop does not */
  assert.deepEqual(["Reading B (350 - 450) Writing C+ (300 - 340) Speaking B (350 - 450)", "reported in ten-point steps (e.g. 350, 360, 370 etc)", "The fee is AU$120.", "the fee is AU$120 . If you reschedule late", "One. (Two)", "  \t  "].map(quotationShape),
    [null, null, null, REJECT.QUOTATION_TOO_LONG, REJECT.QUOTATION_TOO_LONG, REJECT.QUOTATION_SPANS_LAYOUT]);
  /* an EXISTING fact of two sentences is not rewritten and still rechecks CURRENT against its stored text: the rule binds new facts only */
  const facts = [{ factId: "both", link: TOWN.url, quotations: [two], readOn: "2026-09-01", recheckDays: 90, pages: ["town-a"] }];
  const snapshot = JSON.stringify(facts);
  const [c] = await recheckFacts({ facts, readOf: async () => read, on: ON });
  assert.deepEqual([c.state, JSON.stringify(facts)], [RECHECK.CURRENT, snapshot], "an existing fact was judged by the new-fact rule, or rewritten");
});

test("C11 · FIRING CONTROL: each fact is exactly one of CURRENT, CHANGED, BLOCKED or REJECTED — a quotation gone flags every page that uses it; a blocked source is never CURRENT; a fact with no quotation is REJECTED, named; nothing stored is rewritten", async () => {
  const changed = { ...TOWN, html: TOWN.html.replace("every second Tuesday", "every Monday") };
  const facts = [
    { factId: "glass", link: TOWN.url, quotations: ["Glass bottles go in the green bin, emptied every second Tuesday."], readOn: "2026-06-01", recheckDays: 90, pages: ["town-a", "town-b"] },
    { factId: "battery", link: TOWN.url, quotations: ["Batteries are taken at the depot only."], readOn: "2026-09-01", recheckDays: 90, pages: ["town-a"] },
    { factId: "grade", link: LANG.url, quotations: ["a score of 350 is a grade B"], readOn: "2026-09-01", recheckDays: 7, pages: ["test-a"] },
    { factId: "loose", link: LANG.url, quotations: [], readOn: "2026-09-01", recheckDays: 7, pages: ["test-a"] },
  ];
  const snapshot = JSON.stringify(facts);
  const run = async (pages) => { const n = network(pages); const reads = new Map(); for (const u of [TOWN.url, LANG.url]) reads.set(u, await readSource(u, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), state: fresh(), on: ON })); return recheckFacts({ facts, readOf: async (u) => reads.get(u), on: ON }); };
  const same = await run(pagesOf(TOWN, LANG));
  assert.deepEqual(same.map((r) => [r.factId, r.state]), [["glass", RECHECK.CURRENT], ["battery", RECHECK.CURRENT], ["grade", RECHECK.CURRENT], ["loose", RECHECK.REJECTED]]);
  assert.equal(same[3].reason, REJECT.NO_QUOTATION);
  const moved = await run({ ...pagesOf(changed), [LANG.url]: { status: 403, body: "" } });
  assert.deepEqual(moved.map((r) => [r.factId, r.state, r.rebuild]), [["glass", RECHECK.CHANGED, ["town-a", "town-b"]], ["battery", RECHECK.CURRENT, []], ["grade", RECHECK.BLOCKED, []], ["loose", RECHECK.REJECTED, []]], "a changed quotation did not flag its pages, or a blocked source read CURRENT");
  assert.equal(moved[2].reason, BLOCK.NO_ROUTE);
  const c = recheckCounts(moved);
  assert.deepEqual([c.byState, c.byHost["town.invalid"], c.pagesFlagged], [{ CURRENT: 1, CHANGED: 1, BLOCKED: 1, REJECTED: 1 }, { CURRENT: 1, CHANGED: 1, BLOCKED: 0, REJECTED: 0 }, ["town-a", "town-b"]]);
  assert.equal(JSON.stringify(facts), snapshot, "a stored fact was rewritten");
  assert.deepEqual([moved[0].due, moved[1].due, dueOn({ readOn: ON }, ON)], [true, false, null], "the recheck date is not the fact's own read date plus its interval");
  const rec = recheckRecord({ result: moved[0], tenantId: "t", on: ON, run: "r" });
  assert.deepEqual([rec.record_type, rec.factId, rec.state, evidenceStateOf(rec).state], [FACT_RECHECK_RECORD, "glass", RECHECK.CHANGED, "INFERRED"]);
});

test("C11 · BATCH FACTS · FIRING CONTROL: the facts a batch's pages use are its registry records named by a claim's finding, else one per (link, claim text); a recorded quotation is a span in straight double quotation marks of at least eight characters", () => {
  const drafts = { pages: [
    { combination: { kind: "a" }, needs: [{ key: "n1", answer: { claims: [{ claimId: "c1", text: "One.", source: { link: "https://x.invalid/1", readOn: "2026-09-01" } }, { claimId: "c2", text: "Two.", source: { link: "https://x.invalid/2", readOn: "2026-09-01" } }] } }] },
    { combination: { kind: "b" }, needs: [{ key: "n2", answer: { claims: [{ claimId: "c3", text: "One.", source: { link: "https://x.invalid/1", readOn: "2026-09-01" } }] } }] },
  ] };
  const findings = [{ claimId: "c1", factId: "f1" }, { claimId: "c3", factId: "f1" }, { claimId: "c2", whatSupportsIt: "the page says \"two is the rule here\" and \"no\"" }];
  const registry = { facts: [{ factId: "f1", link: "https://x.invalid/1", readOn: "2026-09-01", recheckDays: 30, whatSupportsIt: "the page says \"one is the rule\"" }] };
  const f = batchFacts({ drafts, findings, registry, intervals: [{ claimId: "c2", recheckDays: 7 }] });
  assert.deepEqual(f.map((x) => [x.factId, x.pages, x.quotations, x.recheckDays]), [["f1", ["a", "b"], ["one is the rule"], 30], ["claim:c2", ["a"], ["two is the rule here"], 7]]);
  assert.deepEqual([QUOTATION_MIN_CHARS, quotationsOf("say \"yes\" or \"a longer span\"")], [8, ["a longer span"]]);
  /* RR-268 C: a claim carrying the quotation the engine admitted for it adds it to its fact — a short one does not */
  const quoted = JSON.parse(JSON.stringify(drafts));
  quoted.pages[0].needs[0].answer.claims[1].quotation = "two is now the rule";
  quoted.pages[0].needs[0].answer.claims[0].quotation = "one";
  const q = batchFacts({ drafts: quoted, findings, registry, intervals: [] });
  assert.deepEqual(q.map((x) => x.quotations), [["one is the rule"], ["two is the rule here", "two is now the rule"]], "an admitted claim quotation was not counted, or a short one was");
});

test("C9 + C10 · EXTRACTION RECORD · FIRING CONTROL: each proposal's verdict is stored beside the facts — RE_ADMITTED only on the fact's own source, NEW_FOR_NEED on another source, REJECTED with its reason; derived, never an observation", async () => {
  const n = network(pagesOf(TOWN));
  const read = await engineRead(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const judge = async (p) => extractFacts({ read, propose: async () => [p] });
  const p = (over = {}) => ({ proposalId: "p1", fact: "glass", source: TOWN.url, sentence: "Glass bottles go in the green bin.", quotation: "Glass bottles go in the green bin", ...over });
  const rec = async (prop, factLink) => extractionRecord({ proposal: prop, result: await judge(prop), factLink, route: "CLIENT_AI", tenantId: "t", on: ON, run: "r" });
  const same = await rec(p(), TOWN.url), other = await rec(p({ fact: null, need: "n-bins" }), null), moved = await rec(p(), "https://town.invalid/old-page"), bad = await rec(p({ quotation: "Glass bottles go in the blue bin" }), TOWN.url);
  assert.deepEqual([same.outcome, other.outcome, moved.outcome, bad.outcome, bad.reason], [EXTRACTION.RE_ADMITTED, EXTRACTION.NEW_FOR_NEED, EXTRACTION.NEW_FOR_NEED, EXTRACTION.REJECTED, REJECT.NOT_IN_TEXT], "a proposal on another source re-admitted the fact, or a changed quotation was admitted");
  assert.deepEqual([same.record_type, same.pageSha256, same.route, evidenceStateOf(same).state, evidenceStateOf(bad).state], [EXTRACTION_RECORD, read.sha256, "CLIENT_AI", "INFERRED", "INFERRED"]);
  assert.notEqual(same.extraction_id, bad.extraction_id);
});

/* ================= C12 · NEUTRAL ================= */

const READER = ["src/facts/source-reader.mjs", "src/facts/batch-facts.mjs", "bin/source-facts.mjs", "src/facts/pdf-text.mjs", "src/facts/checked-not-found.mjs"];
test("C12 · NEUTRAL: the reader's code names no product, client, exam or host; the entry point is scoped and reaches the network only through the declared connector's fetch", () => {
  const NAMES = /\b(oet|ielts|pte|toefl|celpip|almi|nursing|nmc|ahpra|gmc|\w+\.(com|org|net|gov|uk|au|nz|ie)\b)/i;
  for (const f of READER) {
    /* comments out — but never a scheme's "://", so an address inside a string stays visible */
    const code = readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, " ");
    assert.equal(NAMES.exec(code)?.[0] ?? null, null, `${f} names a product, client, exam or host`);
  }
  assert.equal(classifyEntryPoint("bin/source-facts.mjs", readFileSync(join(REPO, "bin/source-facts.mjs"), "utf8")).cls, "SCOPED");
  const bin = readFileSync(join(REPO, "bin/source-facts.mjs"), "utf8");
  assert.ok(bin.includes("fetchImpl: CONNECTOR.fetch") && bin.includes("RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }))"), "the reader does not read through the declared connector");
  assert.ok(!/globalThis\.fetch|\bfetch\(/.test(readFileSync(join(REPO, "src/facts/source-reader.mjs"), "utf8").replace(/fetchImpl\(/g, "")), "the reader touches the network itself");
  assert.equal(SOURCE_READ.maxRequests, 100);
});

/* ================= the entry point ================= */

const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const rowsIn = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type !== "resighting") : []);

test("PRODUCTION PATH · C7 C10 C11: in a scratch world with no egress, for two unrelated subjects — no request without --live or --confirm, a batch the connector does not reach is refused, and with both each source is read once through the declared connector, its text kept, each fact rechecked and stored beside it", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const SUBJECTS = [["fixture-tests", "fixture-test-facts", LANG, "a score of 350 is a grade B"], ["fixture-town", "fixture-town-facts", TOWN, "Glass bottles go in the green bin"]];
  const W = declaredWorld({ extra: [...SUBJECTS.map(([, batch]) => ["RESEARCH_BATCH", batch]), ["FACT_REGISTRY", "fixture-town/facts"]] });
  const dir = mkdtempSync(join(tmpdir(), "f44-pp-"));
  /* RR-274: the private sources root of this world — every page text, capture and client file lives there, never in the public batch */
  const P = mkdtempSync(join(tmpdir(), "f44-priv-"));
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    for (const [subjectId, batch] of SUBJECTS) { mkdirSync(join(W.root, subjectId), { recursive: true }); reg.subjects.push({ subjectId, path: subjectId, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }, ...(subjectId === "fixture-town" ? [{ resourceKind: "FACT_REGISTRY", resourceRef: "fixture-town/facts" }] : [])], connectors: [{ connectorId: "cited-sources", kind: "CITED_SOURCES", credential: null, reaches: subjectId === "fixture-tests" ? [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }] : [{ resourceKind: "FACT_REGISTRY", resourceRef: "fixture-town/facts" }] }] }); }
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const replay = {};
    for (const [, batch, page, quote] of SUBJECTS) {
      const b = join(W.root, "research", batch); mkdirSync(b, { recursive: true });
      writeFileSync(join(b, "page-drafts.json"), JSON.stringify({ pages: [{ combination: { kind: "one" }, needs: [{ key: "n1", answer: { claims: [{ claimId: "c1", text: "A rule.", source: { link: page.url, readOn: "2026-09-01" } }, { claimId: "c2", text: "Unquoted.", source: { link: page.url, readOn: "2026-09-01" } }] } }] }] }));
      writeFileSync(join(b, "findings.json"), JSON.stringify([{ claimId: "c1", factId: "f1" }, { claimId: "c2", whatSupportsIt: "the page describes it" }]));
      writeFileSync(join(b, "facts-registry-2026-09-01.json"), JSON.stringify({ facts: [{ factId: "f1", link: page.url, readOn: "2026-09-01", recheckDays: 7, whatSupportsIt: `the page says "${quote}"` }] }));
      writeFileSync(join(b, "recheck-intervals.json"), "[]");
      writeFileSync(join(dir, `${batch}.html`), page.html);
      replay[page.url] = join(dir, `${batch}.html`);
    }
    writeFileSync(join(dir, "replay.json"), JSON.stringify(replay));
    const log = join(dir, "egress.json");
    const run = (subject, batch, mode, ...extra) => spawnSync(process.execPath, ["--import", PRELOAD, "bin/source-facts.mjs", ...W.argv([`--subject=${subject}`, `--research-batch=${batch}`, `--on=${ON}`, ...extra])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), ALMIVISIBILITY_PRIVATE_SOURCES: P, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log, NO_EGRESS_REPLAY: join(dir, "replay.json") } });
    const egress = () => JSON.parse(readFileSync(log, "utf8")).fetch;
    const dry = run("fixture-tests", "fixture-test-facts", "refuse");
    assert.deepEqual([dry.status, /facts {12}2 \(registry 1 · claims naming no registry record 1\) · with a recorded word-for-word quotation 1 of 2/.test(dry.stdout), /NOT RUN — no --live/.test(dry.stdout), egress()], [0, true, true, 0], dry.stdout + dry.stderr);
    const unconfirmed = run("fixture-tests", "fixture-test-facts", "refuse", "--live");
    assert.notEqual(unconfirmed.status, 0, unconfirmed.stdout);
    assert.equal(egress(), 0, "a run without --confirm made a request");
    const unreached = run("fixture-town", "fixture-town-facts", "refuse", "--live", "--confirm");
    /* the connector is declared, and reaches the client's fact registry — not this batch: refused by the reach check, before any request */
    assert.deepEqual([unreached.status, /CITED_SOURCES_CONNECTOR_DOES_NOT_REACH_THIS_BATCH/.test(unreached.stderr), egress(), existsSync(join(W.root, "research", "fixture-town-facts", "source-reads.jsonl"))], [3, true, 0, false], unreached.stdout + unreached.stderr);
    /* RR-274 CONTROL: without the private sources root a live read keeps no text anywhere — refused before the connector, no request */
    const noPriv = spawnSync(process.execPath, ["--import", PRELOAD, "bin/source-facts.mjs", ...W.argv(["--subject=fixture-tests", "--research-batch=fixture-test-facts", `--on=${ON}`, "--live", "--confirm"])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), ALMIVISIBILITY_PRIVATE_SOURCES: join(P, "absent"), NO_EGRESS_MODE: "replay", NO_EGRESS_LOG: log, NO_EGRESS_REPLAY: join(dir, "replay.json") } });
    assert.deepEqual([noPriv.status, /REFUSED — PRIVATE_SOURCES_ABSENT/.test(noPriv.stderr), egress(), existsSync(join(W.root, "research", "fixture-test-facts", "source-reads.jsonl"))], [3, true, 0, false], noPriv.stdout + noPriv.stderr);
    const live = run("fixture-tests", "fixture-test-facts", "replay", "--live", "--confirm");
    assert.equal(live.status, 0, live.stdout + live.stderr);
    assert.match(live.stdout, /requests {9}2 released through the paced path \(robots 1 · sources 1\) of a bound of 100/);
    assert.match(live.stdout, /recheck {10}2 fact\(s\): CURRENT 1 · CHANGED 0 · BLOCKED 0 · REJECTED 1/);
    const b = join(W.root, "research", "fixture-test-facts"), pb = join(P, "research", "fixture-test-facts");
    /* RR-274: the public read keeps no text — it names where the text is; the private read holds it, under the same key and sha256 */
    const pub = rowsIn(join(b, "source-reads.jsonl")), reads = rowsIn(join(pb, "source-reads.jsonl")), checks = rowsIn(join(b, "fact-rechecks.jsonl"));
    assert.deepEqual([pub.length, pub[0].text, pub[0].textAt, pub[0].measurement_key === reads[0].measurement_key, pub[0].sha256 === reads[0].sha256], [1, null, TEXT_AT, true, true], "a page text reached the public batch, or the two records are not one read");
    assert.deepEqual([reads.length, reads[0].state, reads[0].sha256 === createHash("sha256").update(reads[0].text).digest("hex"), reads[0].readOn, checks.map((c) => [c.factId, c.state]).sort()], [1, READ_STATE.READ, true, ON, [["claim:c2", RECHECK.REJECTED], ["f1", RECHECK.CURRENT]]]);
    assert.equal(JSON.parse(readFileSync(join(b, "facts-registry-2026-09-01.json"), "utf8")).facts[0].readOn, "2026-09-01", "a stored fact was rewritten");
    /* RR-268 C · --extract: the filed proposals judged on the STORED text — no connector, no request; kept only with --confirm, with the
     * route's NOT METERED cost entry */
    const url = SUBJECTS[0][2].url;
    writeFileSync(join(b, "fact-proposals-2026-09-10.json"), JSON.stringify({ route: "CLIENT_SUBSCRIPTION_SESSION", proposals: [
      { proposalId: "p1", fact: "claim:c2", source: url, sentence: "A score of 350 is a grade B.", quotation: "a score of 350 is a grade B" },
      { proposalId: "p2", fact: "claim:c2", source: url, sentence: "A score of 300 is a grade B.", quotation: "a score of 300 is a grade B" },
      { proposalId: "p3", fact: null, need: "n1", source: url, sentence: "Results arrive within ten working days.", quotation: "Results arrive within \"ten\" working days." },
    ] }));
    const ext = (...extra) => run("fixture-tests", "fixture-test-facts", "refuse", "--extract=fact-proposals-2026-09-10.json", ...extra);
    const xdry = ext();
    assert.deepEqual([xdry.status, /proposals {8}3: NEW_FOR_NEED 1 · REJECTED 1 · RE_ADMITTED 1 · rejected by reason: QUOTATION_NOT_WORD_FOR_WORD_IN_THE_STORED_PAGE_TEXT 1/.test(xdry.stdout), /RE-ADMITTED 1 · STILL REJECTED 0/.test(xdry.stdout), /NOT WRITTEN/.test(xdry.stdout), existsSync(join(b, "fact-extractions.jsonl")), egress()], [0, true, true, true, false, 0], xdry.stdout + xdry.stderr);
    assert.equal(run("fixture-tests", "fixture-test-facts", "refuse", "--extract=../elsewhere.json", "--confirm").status, 2, "a proposals file outside the batch's own name was read");
    /* RR-282 · a quotation of two sentences, or across a line break, is refused at the entry point in plain words, naming its proposal */
    writeFileSync(join(b, "fact-proposals-2026-09-10-3.json"), JSON.stringify({ route: "CLIENT_SUBSCRIPTION_SESSION", proposals: [
      { proposalId: "p5", fact: null, need: "n1", source: url, sentence: "A score of 350 is a grade B.", quotation: "Rules. Each sub-test is scored from 0 to 500" },
      { proposalId: "p6", fact: null, need: "n1", source: url, sentence: "A score of 350 is a grade B.", quotation: "scored from 0 to 500\nand a score of 350" },
    ] }));
    const x3 = run("fixture-tests", "fixture-test-facts", "refuse", "--extract=fact-proposals-2026-09-10-3.json");
    assert.deepEqual([x3.status, /proposals {8}2: REJECTED 2 · rejected by reason: QUOTATION_IS_MORE_THAN_ONE_SENTENCE_OR_TABLE_ROW 1 · QUOTATION_SPANS_A_LAYOUT_BREAK 1/.test(x3.stdout),
      /refused {8}p5 — The quotation holds more than one sentence\./.test(x3.stdout), /refused {8}p6 — The quotation runs across a line, list or table break/.test(x3.stdout), egress()], [0, true, true, true, 0], x3.stdout + x3.stderr);
    const xok = ext("--confirm");
    assert.equal(xok.status, 0, xok.stdout + xok.stderr);
    const verdicts = rowsIn(join(b, "fact-extractions.jsonl"));
    assert.deepEqual([verdicts.map((v) => [v.proposalId, v.outcome]), verdicts.every((v) => v.route === "CLIENT_SUBSCRIPTION_SESSION"), egress()], [[["p1", "RE_ADMITTED"], ["p2", "REJECTED"], ["p3", "NEW_FOR_NEED"]], true, 0], "the verdicts are not the engine's, or a request was made");
    const ledgers = readdirSync(W.root, { recursive: true }).map(String).filter((f) => f.endsWith(".jsonl")).flatMap((f) => rowsIn(join(W.root, f)).filter((e) => e.run_kind === "ai-extraction").map((e) => ({ ...e, file: f })))
      /* the world is a copy of the declared data root: the real tenant's own ledger travels with it — only this run's tenant is counted */
      .filter((e) => e.scope?.tenantId === FIXTURE_TENANT);
    assert.deepEqual([ledgers.length, ledgers[0]?.aiRoute, ledgers[0]?.money.amountState, ledgers[0]?.providerCalls.total], [1, { name: "CLIENT_SUBSCRIPTION_SESSION", metered: false }, "ZERO_BY_TARIFF", 0], `the route's NOT METERED cost entry was not kept once: ${ledgers.map((e) => e.file).join(" | ")}`);
    /* RR-269 §1 · --import of the client's own reads: no connector, no request; a capture is VIA CAPTURE with its own read date; the facts
     * citing it are rechecked against its text; a refused capture is named; nothing kept without --confirm */
    const cap = join(pb, "browser-captures-2026-09-11"); mkdirSync(cap, { recursive: true });
    writeFileSync(join(cap, "01-rules.txt"), `URL: ${url}\nREAD: 2026-09-11 · route: client browser (a person, in the client's own browser) · captured: main page text\n---\nRules. Each sub-test is scored from 0 to 500 and a score of 400 is a grade B.\n${LONG.join("\n")}\n`);
    writeFileSync(join(cap, "02-elsewhere.txt"), `URL: ${url}\nREAD: 2026-09-11 · route: a search engine\n---\nAnything.\n`);
    writeFileSync(join(cap, "00-README.md"), "not a capture");
    const imp = (folder, ...extra) => run("fixture-tests", "fixture-test-facts", "refuse", `--import=${folder}`, ...extra);
    assert.deepEqual([imp("../elsewhere").status, imp("browser-captures-2026-09-11", "--live").status], [2, 2], "an import outside the batch's own folders, or with --live, was run");
    const idry = imp("browser-captures-2026-09-11");
    assert.deepEqual([idry.status, /files {12}2: imported 1 \(READ 1\) · refused 1 \(browser-captures-2026-09-11\/02-elsewhere.txt CAPTURE_ROUTE_IS_NOT_CLIENT_BROWSER\)/.test(idry.stdout), /recheck {10}2 fact\(s\) cite an imported source: CURRENT 0 · CHANGED 1 · BLOCKED 0 · REJECTED 1/.test(idry.stdout), /NOT WRITTEN/.test(idry.stdout), rowsIn(join(b, "source-reads.jsonl")).length, egress()], [0, true, true, true, 1, 0], idry.stdout + idry.stderr);
    const iok = imp("browser-captures-2026-09-11", "--confirm");
    assert.equal(iok.status, 0, iok.stdout + iok.stderr);
    const capRead = rowsIn(join(pb, "source-reads.jsonl")).at(-1), capCheck = rowsIn(join(b, "fact-rechecks.jsonl")).filter((c) => c.factId === "f1").at(-1);
    assert.deepEqual([capRead.via, capRead.route, capRead.readOn, capRead.capture.file, capCheck.state, capCheck.route, egress()], [VIA.CAPTURE, ROUTE.BROWSER, "2026-09-11", "browser-captures-2026-09-11/01-rules.txt", RECHECK.CHANGED, ROUTE.BROWSER, 0], "the capture is not kept as the client's own read, or the fact it changed is not CHANGED");
    /* a supplied file: kept with its URL, its day and OUT_OF_DATE; no fact is rechecked against it, and a proposal on it is REJECTED */
    mkdirSync(join(pb, "client-files"));
    writeFileSync(join(pb, "client-files", "old.pdf"), makePdf({ lines: ["Price list.", "The fee is 30,000 for the test.", ...LONG] }));
    writeFileSync(join(pb, "client-files", "manifest.json"), JSON.stringify({ files: [{ file: "old.pdf", url, suppliedOn: "2026-09-10", outOfDate: "the client says these are last year's prices" }] }));
    const fok = imp("client-files", "--confirm");
    assert.deepEqual([fok.status, new RegExp(`read  CLIENT_FILE ${url} · read 2026-09-10 · \\d+ chars · PDF 1 page\\(s\\) · OUT_OF_DATE`).test(fok.stdout), /recheck {10}0 fact\(s\)/.test(fok.stdout), rowsIn(join(b, "source-reads.jsonl")).at(-1).currency.state], [0, true, true, CURRENCY.OUT_OF_DATE], fok.stdout + fok.stderr);
    writeFileSync(join(b, "fact-proposals-2026-09-10-2.json"), JSON.stringify({ route: "CLIENT_SUBSCRIPTION_SESSION", proposals: [{ proposalId: "p4", fact: null, need: "n1", source: url, sentence: "The fee is 30,000 for the test.", quotation: "The fee is 30,000 for the test." }] }));
    const x2 = run("fixture-tests", "fixture-test-facts", "refuse", "--extract=fact-proposals-2026-09-10-2.json");
    assert.deepEqual([x2.status, /proposals {8}1: REJECTED 1 · rejected by reason: SOURCE_IS_OUT_OF_DATE 1/.test(x2.stdout)], [0, true], x2.stdout + x2.stderr);
    /* RR-277 · C11: a dated historical snapshot — the client's out-of-date file's one quotation — rechecked against the page today: CHANGED,
     * flagging no page; a snapshot whose quotation the stored file does not hold is refused, named; the browser route only with --live */
    writeFileSync(join(b, "historical-snapshots-2026-09-12.json"), JSON.stringify({ snapshots: [
      { snapshotId: "old-fee", source: url, file: "client-files/old.pdf", quotation: "The fee is 30,000 for the test.", period: "last year", suppliedOn: "2026-09-10", state: "OUT_OF_DATE", publishable: false },
      { snapshotId: "not-in-the-file", source: url, file: "client-files/old.pdf", quotation: "The fee is 99,000 for the test.", period: "last year", suppliedOn: "2026-09-10", state: "OUT_OF_DATE", publishable: false },
    ] }));
    assert.equal(run("fixture-tests", "fixture-test-facts", "refuse", "--browser-route").status, 2, "the browser route was taken without a live read");
    /* RR-269 §2 · --read-list: only the listed sources are read, live, through the paced path — a PDF by the PDF reader */
    writeFileSync(join(b, "read-list-2026-09-10.json"), JSON.stringify({ sources: [url, "https://tests.invalid/rules.pdf"] }));
    writeFileSync(join(dir, "rules.pdf"), makePdf({ lines: ["Each sub-test is scored from 0 to 500.", ["A score of", -300, "350 is a grade B."], ...LONG] }));
    writeFileSync(join(dir, "replay.json"), JSON.stringify({ ...replay, "https://tests.invalid/rules.pdf": join(dir, "rules.pdf") }));
    assert.equal(run("fixture-tests", "fixture-test-facts", "refuse", "--read-list=read-list-2026-09-10.json").status, 2, "a read list ran without --live");
    const rl = run("fixture-tests", "fixture-test-facts", "replay", "--live", "--read-list=read-list-2026-09-10.json", "--confirm");
    assert.equal(rl.status, 0, rl.stdout + rl.stderr);
    assert.match(rl.stdout, /read list {8}read-list-2026-09-10.json: 2 source\(s\) named — no other source is read · facts citing them 2/);
    assert.match(rl.stdout, /requests {9}3 released through the paced path \(robots 1 · sources 2\)/);
    assert.match(rl.stdout, /PDF documents {4}1: text read 1 · NOT_A_TEXT_DOCUMENT 0/);
    assert.match(rl.stdout, /fallback order {3}1 the engine's paced request → 2 the browser route OFF \(start the run with --browser-route to use it\) → 3 the client's own file/);
    assert.match(rl.stdout, /snapshots {8}2 historical snapshot\(s\) filed \(OUT OF DATE, never publishable\): rechecked 1 · refused 1 \(not-in-the-file:/);
    const snap = rowsIn(join(b, "fact-rechecks.jsonl")).filter((c) => c.factId === "snapshot:old-fee").at(-1);
    assert.deepEqual([snap?.state, snap?.missing, snap?.rebuild, snap?.readOnBefore], [RECHECK.CHANGED, 1, [], "2026-09-10"], "the old snapshot did not read CHANGED against today's page, or flagged a page");
    assert.equal(rowsIn(join(b, "fact-rechecks.jsonl")).some((c) => c.factId === "snapshot:not-in-the-file"), false, "a snapshot its file does not hold was rechecked");
    const pdfStored = rowsIn(join(pb, "source-reads.jsonl")).filter((r) => r.url === "https://tests.invalid/rules.pdf").at(-1);
    assert.deepEqual([pdfStored.state, pdfStored.document, quotationIn("A score of 350 is a grade B.", pdfStored.text), /%PDF/.test(pdfStored.text)], [READ_STATE.READ, "PDF", true, false], "the PDF's text was not kept, or its bytes were");
    /* RR-274: after every mode, the public batch holds no page text at all */
    assert.equal(rowsIn(join(b, "source-reads.jsonl")).filter((r) => typeof r.text === "string").length, 0, "a page text reached the public batch");
  } finally { W.cleanup(); rmSync(dir, { recursive: true, force: true }); rmSync(P, { recursive: true, force: true }); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

/* ================= RR-277 · the browser route the engine starts on the client's computer ================= */
test("C8 · RR-277 · FIRING CONTROL: a stop holds for its host only; the route reads the host's robots file itself and obeys it (fail closed), paced and within its cap; a robots file the engine could not read falls back; a consent wall stops; a footer's captcha mark beside a whole page does not; the client is told to save the page", async () => {
  const OTHER = { url: "https://other.invalid/rules", html: TOWN.html };
  const reads = [], robotsAsked = [];
  const route = (over = {}) => ({ connected: true, startedByClient: true, cap: 10, robots: async (u) => { robotsAsked.push(u); return { state: "ALLOWED" }; }, read: async (u) => { reads.push(u); return { text: TOWN.html }; }, ...over });
  const go = (url, r, st, paced = []) => browserRead(url, { route: r, state: st, on: ON, pace: async (u, gap) => { paced.push([new URL(u).pathname, gap]); }, hosts: new Map() });
  /* a captcha stops ITS host — another host is still read */
  const st = { engineReads: 0, reads: 0 };
  const cap = await go(TOWN.url, route({ read: async () => ({ text: "x", signal: BLOCK.CAPTCHA }) }), st);
  const again = await go(TOWN.url, route(), st), other = await go(OTHER.url, route(), st);
  assert.deepEqual([cap.reason, again.reason, other.state], [BLOCK.CAPTCHA, BLOCK.ROUTE_STOPPED, READ_STATE.READ], "a stop did not hold for its host, or spread to another");
  assert.ok(cap.detail.includes(SAVE_THE_PAGE) && again.detail.includes(SAVE_THE_PAGE), "the client is not told to save the page into the client-file folder");
  for (const signal of ROUTE_STOPS) assert.equal((await go(TOWN.url, route({ read: async () => ({ text: "x", signal }) }), { engineReads: 0, reads: 0 })).reason, signal, `${signal} did not stop the route`);
  assert.deepEqual(ROUTE_STOPS, [BLOCK.CAPTCHA, BLOCK.CHALLENGE, BLOCK.LOGIN_WALL, BLOCK.CONSENT_WALL]);
  /* the route's own robots read: a disallow is never read past, an unreadable robots file fails closed — no page read either way */
  const before = reads.length;
  assert.equal((await go(TOWN.url, route({ robots: async () => ({ state: "DISALLOWED", reason: "x" }) }), { engineReads: 0, reads: 0 })).reason, BLOCK.ROBOTS_DISALLOWED);
  assert.equal((await go(TOWN.url, route({ robots: async () => ({ state: "UNKNOWN", reason: "x" }) }), { engineReads: 0, reads: 0 })).reason, BLOCK.ROBOTS_UNREADABLE);
  assert.equal(reads.length, before, "a page was read past its robots file");
  /* the robots read and the page read are each paced at the browser gap, and both count against the cap */
  const paced = [], st3 = { engineReads: 0, reads: 0 };
  await go(TOWN.url, route({ cap: 2 }), st3, paced);
  assert.deepEqual([paced.map(([, g]) => g), paced.map(([p]) => p).includes("/robots.txt"), st3.reads], [[BROWSER_GAP_MS, BROWSER_GAP_MS], true, 2], "a read was not paced, or the robots read did not count");
  assert.equal((await go(OTHER.url, route({ cap: 2 }), st3)).reason, BLOCK.ROUTE_CAP, "the robots read did not count against the cap");
  /* a footer's mark beside a whole page is not a wall; the same mark on a short page is */
  const longPage = "Rules of the scheme. ".repeat(120) + " This site is protected by reCAPTCHA.";
  assert.equal((await go(TOWN.url, route({ read: async () => ({ text: longPage }) }), { engineReads: 0, reads: 0 })).state, READ_STATE.READ, "a footer's captcha mark stopped a whole page");
  assert.equal((await go(TOWN.url, route({ read: async () => ({ text: "Please solve this captcha to continue." }) }), { engineReads: 0, reads: 0 })).reason, BLOCK.CAPTCHA);
  assert.ok(longPage.length > BROWSER_WALL_BELOW && BROWSER_WALL_BELOW === WALL_COVERS_BELOW);
  /* the window landing on another host is not the page */
  assert.equal((await go(TOWN.url, route({ read: async () => ({ text: TOWN.html, landedUrl: "https://elsewhere.invalid/" }) }), { engineReads: 0, reads: 0 })).reason, BLOCK.OFF_HOST);
  /* the engine's plain request finds the robots file unreadable (refused) → the route is asked, and reads the robots file itself */
  const blockedRobots = network({ "https://tests.invalid/robots.txt": { status: 403, body: "no" }, [LANG.url]: { body: LANG.html } });
  const fb = await readSource(LANG.url, { fetchImpl: blockedRobots.fetchImpl, robots: robotsOn(blockedRobots.fetchImpl), route: route(), state: fresh(), on: ON, pace: async () => {}, hosts: new Map() });
  assert.deepEqual([fb.state, fb.route, fb.engineBlocked, robotsAsked.includes(LANG.url)], [READ_STATE.READ, ROUTE.BROWSER, BLOCK.ROBOTS_UNREADABLE, true], "a robots file the engine could not read did not go to the route's own robots read");
  /* CONTROL: without a route it stays BLOCKED with its reason */
  assert.equal((await readSource(LANG.url, { fetchImpl: blockedRobots.fetchImpl, robots: robotsOn(blockedRobots.fetchImpl), route: null, state: fresh(), on: ON, pace: async () => {}, hosts: new Map() })).reason, BLOCK.NO_ROUTE);
});

test("C8 · RR-277 · THE WINDOW'S SIGNALS AND ROBOTS VERDICT (pure): a captcha, a bot-check, a login wall and a consent wall are named only when they ARE the page; a robots file disallows, allows or fails closed; the route opens only when the client starts it", async () => {
  assert.equal(browserSignal({ html: '<div class="g-recaptcha"></div>', text: "Please confirm" }), BLOCK.CAPTCHA);
  assert.equal(browserSignal({ html: "<title>Just a moment...</title>", text: "Checking your browser" }), BLOCK.CHALLENGE);
  assert.equal(browserSignal({ html: '<input type="password">', text: "Sign in" }), BLOCK.LOGIN_WALL);
  assert.equal(browserSignal({ html: "", text: "Rules", landedUrl: "https://x.invalid/account/login" }), BLOCK.LOGIN_WALL);
  assert.equal(browserSignal({ html: "", text: "We use cookies. Accept all cookies to continue." }), BLOCK.CONSENT_WALL);
  const page = "The scheme's rules, in full. ".repeat(80);
  for (const [html, text] of [['<div class="g-recaptcha"></div>', page], ['<input type="password">', page], ["", page + " We use cookies."]]) assert.equal(browserSignal({ html, text }), null, "a mark beside a whole page was named a wall");
  assert.deepEqual(robotsVerdict({ status: 200, body: "User-agent: *\nDisallow: /rules\n", url: "https://x.invalid/rules" }).state, "DISALLOWED");
  assert.deepEqual(robotsVerdict({ status: 200, body: "User-agent: *\nAllow: /\n", url: "https://x.invalid/rules" }).state, "ALLOWED");
  assert.deepEqual(robotsVerdict({ status: 404, body: "", url: "https://x.invalid/rules" }).state, "ALLOWED");
  for (const [status, body] of [[403, "no"], [200, "<html><body>Just a moment...</body></html>"], [null, null]]) assert.equal(robotsVerdict({ status, body, url: "https://x.invalid/rules" }).state, "UNKNOWN", `${status} did not fail closed`);
  let loaded = 0;
  await assert.rejects(openBrowserRoute({ cap: 5, startedByClient: false, loadPlaywright: async () => { loaded += 1; return {}; } }), /only when the client starts it/);
  assert.equal(loaded, 0, "a browser was loaded for a route the client did not start");
  /* F03: the window is launched only by an opened connector — never by the route itself */
  await assert.rejects(openBrowserRoute({ cap: 5, startedByClient: true, loadPlaywright: async () => { loaded += 1; return {}; } }), /opened connector's launchBrowser/);
  assert.equal(loaded, 0, "a browser was loaded without an opened connector");
});

/* ================= RR-274 · the page texts kept privately ================= */
test("RR-274 · PRIVATE TEXTS · FIRING CONTROL: a public copy keeps no text and names where it is; a join takes the private text only by key and only when it hashes to the public sha256; without the root, nothing is joined", () => {
  const text = "Each sub-test is scored from 0 to 500.";
  const full = { measurement_key: "source_page_read:a", url: "https://tests.invalid/a", state: READ_STATE.READ, sha256: createHash("sha256").update(text).digest("hex"), text };
  const pub = publicCopy(full);
  assert.deepEqual([pub.text, pub.textAt, pub.sha256, pub.url, publicCopy({ state: "BLOCKED", reason: "x" }).textAt], [null, TEXT_AT, full.sha256, full.url, undefined]);
  assert.equal(withPrivateTexts([pub], [full])[0].text, text);
  assert.deepEqual(withPrivateTexts([pub], [{ ...full, text: "Each sub-test is scored from 0 to 600." }])[0].textMissing, TEXT_MISSING.HASH_DIFFERS, "a private text that is not the one the public record states was taken");
  assert.equal(withPrivateTexts([pub], [{ ...full, measurement_key: "source_page_read:b" }])[0].textMissing, TEXT_MISSING.ABSENT, "a text of another read was taken");
  assert.equal(withPrivateTexts([pub], [full], { privateRoot: "ABSENT" })[0].textMissing, TEXT_MISSING.ROOT_ABSENT);
  /* CONTROL: a record that never held a text is passed through untouched */
  assert.equal(withPrivateTexts([full], [])[0].text, text);
  assert.equal(privateSourcesRoot({ ALMIVISIBILITY_PRIVATE_SOURCES: join(tmpdir(), "rr274-no-such-root") }).state, "ABSENT");
});

/* ================= REAL ================= */

test("REAL · the declared batch's stored recheck: every fact its pages use has exactly one state, counted per source host; every CHANGED fact flags its pages; every READ keeps its text with its sha256 — counts only", async (t) => {
  const index = rootIndexFor(process.env);
  const research = lookupStore(index, "RESEARCH");
  const dir = research.state === "DECLARED" ? join(research.dir, "rr254-test-pages-2026-10-12") : null;
  if (!dir || !existsSync(join(dir, "fact-rechecks.jsonl"))) { t.skip("no stored recheck in the declared batch"); return; }
  /* RR-274: the public batch keeps no page text; each READ's text is joined from the private sources root by key and sha256 */
  const priv = privateSourcesRoot(process.env);
  const publicReads = rowsIn(join(dir, "source-reads.jsonl"));
  assert.equal(publicReads.filter((r) => typeof r.text === "string").length, 0, "a page text is kept in the public data repository");
  assert.equal(priv.state, "DECLARED", "the private sources root is not here — the texts cannot be rechecked");
  const privPath = join(priv.dir, relative(research.rootPath, dir), "source-reads.jsonl");
  const checks = rowsIn(join(dir, "fact-rechecks.jsonl")), reads = withPrivateTexts(publicReads, existsSync(privPath) ? rowsIn(privPath) : [], { privateRoot: priv.state });
  const latest = [...new Map(checks.map((c) => [c.factId, c])).values()];
  assert.ok(latest.length > 0 && latest.every((c) => Object.values(RECHECK).includes(c.state)), "a fact has no state");
  /* a historical snapshot (RR-277) is used by no page: CHANGED, it flags nothing; every other CHANGED fact flags each page that uses it */
  const isSnap = (c) => String(c.factId).startsWith("snapshot:");
  assert.ok(latest.filter((c) => c.state === RECHECK.CHANGED && !isSnap(c)).every((c) => c.rebuild.length === c.pages.length && c.pages.length > 0), "a CHANGED fact flags no page");
  assert.ok(latest.filter(isSnap).every((c) => c.pages.length === 0 && c.rebuild.length === 0), "a snapshot flagged a page");
  /* RR-277 · C11 real: the dated 2020-21 fee snapshot reads CHANGED against the page today; C8 real: the browser route READ sources the
   * engine was refused, and stopped on others, BLOCKED with the line telling the client to save the page */
  assert.equal(latest.find((c) => c.factId === "snapshot:bc-pk-ielts-fee-2020-21")?.state, RECHECK.CHANGED, "C11: no real CHANGED case is stored");
  const routeReads = reads.filter((r) => r.readOn === "2026-10-17" && r.route === ROUTE.BROWSER);
  assert.ok(routeReads.filter((r) => r.state === READ_STATE.READ).length >= 1 && routeReads.every((r) => r.state === READ_STATE.READ ? r.engineBlocked : /save it as a PDF/.test(r.detail ?? "")), "C8: no real browser-route read, or a stop without the client's line");
  assert.ok(reads.filter((r) => r.state === READ_STATE.READ).every((r) => r.sha256 === createHash("sha256").update(r.text).digest("hex") && /^\d{4}-\d{2}-\d{2}$/.test(r.readOn)), "a stored read lost its text, hash or date");
});

test("the production trail is untouched by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
