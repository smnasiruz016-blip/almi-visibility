/**
 * RR-324 · A GROWING KEYWORD DATABASE (owner, 24 Oct 2026: "the market tools keep a big keyword database built in advance"):
 *   A  every Keyword Planner file merged into ONE database — no duplicates; first / last seen; the range per period and location, its
 *      source file, its trend; a file read twice adds nothing; a newer file updates the ranges and keeps the history; the plan uses it at
 *      once; the store is handed in (later AlmiWorld's own keyword service, the screen unchanged)
 *   B  the Google Ads API connector (KeywordPlanIdeaService), READY BUT OFF — the access level said plainly, Google's documented answers
 *   C  the DataForSEO connector, READY BUT OFF ("waiting for the provider's written permission") — caps per day and month, a running
 *      total, a cache: a keyword bought once is never bought again
 *   D1 the harness lock covers the FULL local test suite   D2 the sample's label in the product's proper display name
 * Fixtures: invented keywords; Google's and DataForSEO's documented answer SHAPES with invented values. No network, no paid call, no key,
 * no real browser.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { searchFileText } from "../desktop/research5.mjs";
import { parseKeywordFile, mergeFile, mergeObservations, itemsOf, summaryOf, trendOf, currentOf, emptyDb, fileIdOf, periodOf, exportedOnOf, exportedAtOf, localKeywordStore, FILE_NAME, SOURCES } from "../desktop/keyword-db.mjs";
import { clusterKeywords } from "../desktop/demand.mjs";
import { adsStatus, ideasRequest, rowsOfIdeas, errorOf, errorLine, googleAds, periodOfRows, ADS_KEYS } from "../desktop/google-ads.mjs";
import { dfsStatus, planVolume, rowsOfAnswer, dataForSeo, emptyLedger, WAITING, DFS_KEYS } from "../desktop/dataforseo.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { displayNameOf, labelOf, checkSample } from "../desktop/samples.mjs";
import { planFromList } from "../desktop/plan-list.mjs";
import { builtInList } from "../desktop/lists.mjs";
import { recognitionOf } from "../desktop/recognition.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"), MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
const ON = "2026-10-24";
/* a Keyword Planner export as the tool writes it: UTF-16 with its mark, two title lines, tab-separated (invented keywords) */
const exportBytes = (rows, { title = `Keyword Stats ${ON} at 06_03_20`, period = "October 1, 2025 - September 30, 2026", months = [] } = {}) => {
  const head = ["Keyword", "Currency", "Avg. monthly searches", "Three month change", "YoY change", "Competition", ...months.map((m) => `Searches: ${m}`)];
  const t = [title, `"${period}"`, head.join("\t"), ...rows.map(([k, v, ms = []]) => [k, "USD", v, "0%", "0%", "Low", ...ms].join("\t"))].join("\r\n");
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, "utf16le")]);
};
const KW = [["oet practice test", 5000], ["oet exam fees", 500], ["oet booking", 500], ["oet writing sample for nurses", 500], ["e2 oet", 5000], ["OET  practice test", 5000]];
const merge = (db, bytes, name = `Keyword Stats ${ON} at 06_03_20.csv`, readOn = ON) => mergeFile(db, { name, bytes, text: searchFileText(bytes), readOn });

test("A · a Keyword Planner file → its rows, its period (the quoted date line) and the day it was exported (Google's own name)", () => {
  const p = parseKeywordFile(searchFileText(exportBytes(KW)));
  assert.deepEqual([p.ok, p.period, p.rows.length, p.rows[0].said, p.rows[0].competition, p.rows[0].change3m], [true, "2025-10-01..2026-09-30", 6, 5000, "Low", "0%"]);
  assert.equal(periodOf('"October 1, 2025 - September 30, 2026"'), "2025-10-01..2026-09-30");
  assert.equal(exportedOnOf("Keyword Stats 2026-10-24 at 06_03_20.csv"), "2026-10-24"); assert.equal(exportedOnOf("keyword-planner-uk.csv"), null);
  assert.deepEqual(["keyword-planner-all.csv", "Keyword Stats 2026-10-24 at 06_03_20.csv", "keyword-planner-uk.CSV", "notes.csv", "keyword-planner.txt"].map((n) => FILE_NAME.test(n)), [true, true, true, false, false]);
  assert.equal(parseKeywordFile("Keyword\tImpressions\nx\t3").ok, false, "a Bing file is not a Keyword Planner file");
  const m = parseKeywordFile(searchFileText(exportBytes([["oet listening", 500, [50, 500, 5000]]], { months: ["Jul 2026", "Aug 2026", "Sep 2026"] })));
  assert.deepEqual(m.rows[0].months, { "2026-07": 50, "2026-08": 500, "2026-09": 5000 }, "the file's own months are its trend");
});

test("A · merged without duplicates; the SAME file read twice changes nothing (a renamed copy too); first and last seen; its source file", () => {
  const b = exportBytes(KW), one = merge(emptyDb(), b);
  assert.deepEqual([one.added, one.merged, one.dupInFile, Object.keys(one.db.keywords).length], [5, 0, 1, 5], "'OET  practice test' is 'oet practice test'");
  const k = one.db.keywords["oet practice test"];
  assert.deepEqual([k.firstSeen, k.lastSeen, k.files, currentOf(k).label, currentOf(k).period, currentOf(k).source, currentOf(k).location], [ON, ON, [fileIdOf(b)], "1K–10K", "2025-10-01..2026-09-30", SOURCES.file, "not stated in the file"]);
  const again = merge(one.db, b, `Keyword Stats ${ON} at 06_03_20.csv`, "2026-10-25");
  assert.equal(again.alreadyRead, true); assert.equal(again.db, one.db, "nothing changed — the same database"); assert.match(again.line, /already read on 2026-10-24 — nothing changed/);
  assert.equal(merge(one.db, b, "copy of it.csv").alreadyRead, true, "a renamed copy is the same file (its bytes)");
  assert.deepEqual(Object.keys(one.db.files), [fileIdOf(b)]); assert.equal(one.db.files[fileIdOf(b)].rows, 6);
});

test("A · a NEWER file updates the range and keeps the history; an OLDER file read later goes into the history only; the trend", () => {
  const first = merge(emptyDb(), exportBytes(KW)).db;
  const newer = exportBytes([["oet practice test", 50000], ["oet exam fees", 500], ["oet results date", 500]], { title: "Keyword Stats 2026-11-24 at 07_00_00", period: "November 1, 2025 - October 31, 2026" });
  const n = merge(first, newer, "Keyword Stats 2026-11-24 at 07_00_00.csv", "2026-11-24");
  assert.deepEqual([n.added, n.merged, n.updated], [1, 2, 2], "1 new keyword; 2 held — both have a new period (one a new range)");
  const k = n.db.keywords["oet practice test"];
  assert.deepEqual([currentOf(k).label, currentOf(k).period, k.firstSeen, k.lastSeen], ["10K–100K", "2025-11-01..2026-10-31", ON, "2026-11-24"]);
  const t = trendOf(k); assert.deepEqual(t.points.map((p) => [p.period, p.label]), [["2025-10-01..2026-09-30", "1K–10K"], ["2025-11-01..2026-10-31", "10K–100K"]]); assert.equal(t.direction, "up");
  assert.equal(trendOf(n.db.keywords["oet exam fees"]).direction, "same");
  /* the same period, a newer export with another range: the current range changes, the old one is in the history */
  const corr = merge(first, exportBytes([["oet booking", 5000]], { title: "Keyword Stats 2026-10-30 at 08_00_00" }), "Keyword Stats 2026-10-30 at 08_00_00.csv", "2026-10-30").db.keywords["oet booking"];
  assert.deepEqual([currentOf(corr).label, corr.history.map((h) => h.label)], ["1K–10K", ["100–1K"]]);
  /* the owner renames his exports (keyword-planner-3.csv): the title line inside still says WHEN — two exports of one day keep their order */
  assert.equal(exportedAtOf("Keyword Stats 2026-10-24 at 22_09_36"), "2026-10-24T22:09:36"); assert.equal(exportedAtOf("keyword-planner-3.csv"), null);
  const late = exportBytes([["oet booking", 5000]], { title: "Keyword Stats 2026-10-24 at 22_09_36" }), early = exportBytes([["oet booking", 50]], { title: "Keyword Stats 2026-10-24 at 22_00_17" });
  const day = merge(merge(first, late, "keyword-planner-3.csv").db, early, "keyword-planner-2.csv.csv").db.keywords["oet booking"];
  assert.deepEqual([currentOf(day).label, currentOf(day).at, day.history.map((h) => h.label).sort()], ["1K–10K", "2026-10-24T22:09:36", ["100–1K", "10–100"]], "the 22:09 export is the current one, though read first");
  /* an older export read after: history only */
  const old = merge(first, exportBytes([["oet booking", 50]], { title: "Keyword Stats 2026-09-01 at 08_00_00" }), "Keyword Stats 2026-09-01 at 08_00_00.csv", "2026-10-31").db.keywords["oet booking"];
  assert.deepEqual([currentOf(old).label, old.history.map((h) => h.label), old.firstSeen], ["100–1K", ["10–100"], "2026-09-01"]);
});

test("A · the plan reads the database at once (each keyword once, its current range); the screen's numbers; the store is handed in", () => {
  const db = merge(emptyDb(), exportBytes(KW)).db, items = itemsOf(db);
  assert.deepEqual(items.map((x) => [x.text, x.kind, x.volume]).sort(), [["e2 oet", "tool", 5000], ["oet booking", "tool", 500], ["oet exam fees", "tool", 500], ["oet practice test", "tool", 5000], ["oet writing sample for nurses", "tool", 500]]);
  const d = clusterKeywords(items, { subject: "OET" }); assert.equal(d.keywords, 5); assert.equal(d.setAside.brand.length, 1, "e2 is a brand — set aside, as RR-323");
  const s = summaryOf(db, { today: ON, plan: { demand: { clusters: [{ page: "A" }, { page: "A" }, { page: "B" }] } } });
  assert.deepEqual([s.total, s.newToday, s.clusters, s.pages, s.files], [5, 5, 3, 2, 1]);
  assert.equal(summaryOf(db, { today: "2026-10-25" }).newToday, 0, "new TODAY only");
  assert.match(s.line, /^5 keywords in your database \(1 file read\), 5 new today → 3 clusters → 2 pages they feed\.$/);
  /* the store: today the product's folder; later a server implements the same load/save — the screen reads summaryOf either way */
  const files = new Map(), st = localKeywordStore({ read: (n, d0) => files.get(n) ?? d0, write: (n, v) => files.set(n, v) });
  assert.deepEqual(st.load(), emptyDb()); st.save(db); assert.equal(st.load(), db);
  const server = { load: () => structuredClone(db), save: () => {} }; assert.deepEqual(summaryOf(server.load(), { today: ON }).total, 5);
  /* the app: the Keyword Planner file goes to the database (not phrases.json), and the plan's items come from it */
  assert.match(MAIN, /if \(\/Avg\\\. monthly searches\/i\.test\(text\.slice\(0, 4000\)\)\) \{/);
  assert.match(MAIN, /\.\.\.itemsOf\(db\)\.map\(\(x\) => \(\{ \.\.\.x, on: x\.date \}\)\)\]; \};/);
  assert.match(MAIN, /filter\(\(p\) => !\(p\.kind === "tool" && held\.has\(keyOf\(p\.text\)\)\)\)/, "a phrase read before the database counts once");
});

/* ── B · Google Ads API ── */
const IDEAS = { results: [{ text: "oet practice test", keywordIdeaMetrics: { avgMonthlySearches: "12100", competition: "MEDIUM", competitionIndex: "54", lowTopOfPageBidMicros: "1450000", highTopOfPageBidMicros: "4800000", monthlySearchVolumes: [{ year: "2026", month: "AUGUST", monthlySearches: "9900" }, { year: "2026", month: "SEPTEMBER", monthlySearches: "14800" }] } }, { text: "oet mock test", keywordIdeaMetrics: { competition: "LOW" } }], totalSize: "2" };
const GERR = (code) => ({ error: { code: 403, message: "x", status: "PERMISSION_DENIED", details: [{ "@type": "type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure", errors: [{ errorCode: { authorizationError: code }, message: "x" }] }] } });
const fakeFetch = (answers) => { const calls = []; const f = async (u, i) => { calls.push({ u: String(u), i }); const a = answers(String(u), i); return { ok: a.status < 300, status: a.status, json: async () => a.body }; }; f.calls = calls; return f; };

test("B · the access level said plainly, with what to do next — and OFF sends nothing", async () => {
  const st = adsStatus({ access: "test", applied: ["explorer"] });
  assert.equal(st.line, "Google Ads API: Test access, Explorer under review; Basic access needed for keyword data."); assert.equal(st.state, "off"); assert.equal(st.offLine, "Switched off — nothing is sent to Google Ads.");
  assert.match(st.next.join(" "), /verify your project's brand in Google Cloud Console, then apply for Basic/); assert.doesNotMatch(st.next.join(" "), /apply for Explorer/, "Explorer is already under review");
  assert.equal(adsStatus({ access: "basic" }).line, "Google Ads API: Basic access — keyword data allowed.");
  assert.equal(adsStatus({ access: "explorer" }).line, "Google Ads API: Explorer access; Basic access needed for keyword data.");
  const f = fakeFetch(() => ({ status: 200, body: IDEAS })), keys = keyStore({ backend: memoryBackend(), env: {} }), g = googleAds({ keys, settings: { access: "basic", clientId: "x.apps.googleusercontent.com", customerId: "1234567890" }, fetchImpl: f });
  assert.deepEqual([(await g.ideas({ seeds: ["oet"] })).off, g.start("http://127.0.0.1/x").off], [true, true]); assert.equal(f.calls.length, 0, "nothing was sent while it is off");
  const ex = googleAds({ keys, settings: { on: true, access: "explorer", clientId: "x.apps.googleusercontent.com", customerId: "1234567890" }, fetchImpl: f });
  assert.match((await ex.ideas({ seeds: ["oet"] })).why, /Basic access needed for keyword data\. Nothing was sent\./); assert.equal(f.calls.length, 0);
});

test("B · Google's documented request and answer: generateKeywordIdeas (v26) → rows marked 'Google Ads API', ranges; its refusals in plain words", async () => {
  const q = ideasRequest({ customerId: "123-456-7890", seeds: ["oet", "oet practice"], geo: ["geoTargetConstants/2826"] });
  assert.equal(q.url, "https://googleads.googleapis.com/v26/customers/1234567890:generateKeywordIdeas");
  assert.deepEqual(q.body, { language: "languageConstants/1000", geoTargetConstants: ["geoTargetConstants/2826"], includeAdultKeywords: false, keywordPlanNetwork: "GOOGLE_SEARCH", pageSize: 1000, keywordSeed: { keywords: ["oet", "oet practice"] } });
  assert.deepEqual(ideasRequest({ customerId: "1234567890", url: "https://x.example/" }).body.urlSeed, { url: "https://x.example/" }); assert.throws(() => ideasRequest({ customerId: "123" }), /10 digits/);
  const rows = rowsOfIdeas(IDEAS); assert.deepEqual(rows[0], { text: "oet practice test", said: 12100, months: { "2026-08": 9900, "2026-09": 14800 }, competition: "Medium", change3m: null, yoy: null }); assert.equal(rows[1].said, null);
  assert.equal(periodOfRows(rows), "2026-08-01..2026-09-30");
  assert.equal(errorOf(GERR("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION")), "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION"); assert.equal(errorOf({}, 500), "HTTP_500");
  assert.match(errorLine("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION"), /Test access only/);
  /* ON, Basic, signed in (the stored access), a test account: Google's documented answer → the same database, marked with its source */
  const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set(ADS_KEYS.secret, "client-secret-for-tests"); keys.set(ADS_KEYS.refresh, "refresh-token-for-tests");
  const f = fakeFetch((u) => (/oauth2/.test(u) ? { status: 200, body: { access_token: "a-token-for-tests", expires_in: 3600 } } : { status: 200, body: IDEAS }));
  const g = googleAds({ keys, settings: { on: true, access: "basic", clientId: "x.apps.googleusercontent.com", customerId: "1234567890", loginCustomerId: "111-222-3333" }, fetchImpl: f });
  assert.equal(g.status().ready, true); const out = await g.ideas({ seeds: ["oet"] }); assert.equal(out.ok, true); assert.equal(out.rows.length, 2);
  const call = f.calls.find((c) => /generateKeywordIdeas/.test(c.u)); assert.equal(call.i.headers["login-customer-id"], "1112223333"); assert.equal(call.i.headers["developer-token"], undefined, "no developer token (sunset 9 Sep 2026)");
  const db = mergeObservations(emptyDb(), { id: "ads-1", name: "Google Ads API ideas", on: ON, source: out.source, period: out.period, location: "United Kingdom" }, out.rows).db;
  assert.deepEqual([currentOf(db.keywords["oet practice test"]).source, currentOf(db.keywords["oet practice test"]).label], ["Google Ads API", "10K–100K"]);
  const bad = googleAds({ keys, settings: { on: true, access: "basic", clientId: "x.apps.googleusercontent.com", customerId: "1234567890" }, fetchImpl: fakeFetch((u) => (/oauth2/.test(u) ? { status: 200, body: { access_token: "t", expires_in: 3600 } } : { status: 403, body: GERR("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION") })) });
  const r = await bad.ideas({ seeds: ["oet"] }); assert.deepEqual([r.ok, r.code], [false, "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION"]); assert.match(bad.status().next[0], /^Google's last answer: your project has Test access only/);
});

/* ── C · DataForSEO ── */
const DFS_ANSWER = (kws, cost = 0.075) => ({ version: "0.1.20260901", status_code: 20000, status_message: "Ok.", time: "0.5 sec.", cost, tasks_count: 1, tasks_error: 0, tasks: [{ id: "10241200-0000-0000-0000-000000000000", status_code: 20000, status_message: "Ok.", cost, result_count: kws.length, data: {}, result: kws.map((k) => ({ keyword: k, location_code: 2826, language_code: "en", search_partners: false, competition: "LOW", competition_index: 10, search_volume: 880, monthly_searches: [{ year: 2026, month: 9, search_volume: 1000 }] })) }] });

test("C · OFF: 'waiting for the provider's written permission' until the owner ticks it AND switches it on; a cap and a key first — nothing is bought", async () => {
  const keys = keyStore({ backend: memoryBackend(), env: {} }), f = fakeFetch(() => ({ status: 200, body: DFS_ANSWER(["x"]) }));
  assert.equal(dfsStatus({}).line, WAITING); assert.equal(WAITING, "Switched off — waiting for the provider's written permission.");
  assert.equal(dfsStatus({ on: true }).line, WAITING, "switched on without the permission: still off");
  assert.equal(dfsStatus({ permission: true }).line, "Switched off.");
  assert.match(dfsStatus({ permission: true, on: true }).line, /no key saved/);
  assert.match(dfsStatus({ permission: true, on: true, capDay: 0 }, emptyLedger(), { keySaved: true }).line, /no spending cap set/);
  for (const settings of [{}, { on: true }, { permission: true, on: true }]) { const d = dataForSeo({ keys, settings, fetchImpl: f }); assert.equal((await d.volume(["oet"])).off, true); assert.equal((await d.ideas(["oet"])).off, true); }
  assert.equal(f.calls.length, 0, "nothing sent, nothing bought");
});

test("C · caps per day and month (refused BEFORE sending, at the highest price), the running total, and the cache: a keyword bought once is never bought again", async () => {
  const now = Date.parse("2026-10-24T10:00:00Z"), keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set(DFS_KEYS.login, "login-for-tests@x.example"); keys.set(DFS_KEYS.password, "password-for-tests");
  const p = planVolume(Array.from({ length: 1500 }, (_, i) => `kw ${i}`), { settings: { capDay: 0.1, capMonth: 5 }, now });
  assert.deepEqual([p.buy.length, p.tasks, Math.round(p.most * 100) / 100, p.allowed], [1500, 2, 0.18, false]); assert.match(p.why, /today's cap \$0\.10 has \$0\.10 left/);
  const month = planVolume(["a"], { settings: { capDay: 5, capMonth: 1 }, ledger: { spent: [{ on: "2026-10-02T00:00:00Z", cost: 0.95 }], cache: {} }, now }); assert.match(month.why, /this month's cap \$1\.00 has \$0\.0500 left/);
  const ledger = emptyLedger(), saved = [], f = fakeFetch((u, i) => ({ status: 200, body: DFS_ANSWER(JSON.parse(i.body)[0].keywords) }));
  const d = dataForSeo({ keys, settings: { permission: true, on: true, capDay: 1, capMonth: 10 }, ledger, save: (l) => saved.push(structuredClone(l)), fetchImpl: f, now: () => now });
  const a = await d.volume(["OET practice", "oet fees"], { location: 2826, language: "en" });
  assert.deepEqual([a.ok, a.bought, a.cached, a.cost, a.rows.length, f.calls.length], [true, 2, 0, 0.075, 2, 1]);
  assert.equal(f.calls[0].u, "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live"); assert.deepEqual(JSON.parse(f.calls[0].i.body), [{ keywords: ["oet practice", "oet fees"], location_code: 2826, language_code: "en" }]);
  assert.match(f.calls[0].i.headers.authorization, /^Basic /);
  const b = await d.volume(["oet practice", "oet fees"], { location: 2826, language: "en" });
  assert.deepEqual([b.bought, b.cached, b.cost, b.rows.length, f.calls.length], [0, 2, 0, 2, 1], "the cache answered — nothing bought again");
  await d.volume(["oet fees", "oet dates"], { location: 2826, language: "en" }); assert.deepEqual(JSON.parse(f.calls[1].i.body)[0].keywords, ["oet dates"], "only the keyword not bought before");
  assert.equal(d.status().line, "On — $0.15 of $1.00 today, $0.15 of $10.00 this month.", "the running total"); assert.equal(saved.length, 2);
  assert.deepEqual(rowsOfAnswer({ status_code: 40210, status_message: "Insufficient funds." }), { ok: false, cost: 0, rows: [], why: "DataForSEO refused (40210: Insufficient funds.)." });
  const row = rowsOfAnswer(DFS_ANSWER(["oet"])).rows[0]; assert.deepEqual([row.text, row.said, row.months, row.competition], ["oet", 880, { "2026-09": 1000 }, "Low"]);
});

/* ── D ── */
test("D1 · the FULL local suite holds the harness lock: tools/full-suite.mjs marks its run (runner and tests pid) and the guard refuses edits, tests and git while either lives; the folder or npm test started directly is refused", () => {
  /* npm test stays what CI runs and the board's R-CI tests pin (CI found it: R33-E9, R3-CI, R4-CI) */
  const PKG = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")); assert.equal(PKG.scripts.test, "node --test test/*.test.mjs");
  const FS = readFileSync(join(REPO, "tools", "full-suite.mjs"), "utf8"); assert.match(FS, /SUITE_RUNS_DIR = "almivisibility-suite-runs"/); assert.match(FS, /write\(run\.pid\)/); assert.match(FS, /run\.on\("exit", \(code, sig\) => \{ off\(\);/);
  const GUARD = join(REPO, "tools", "harness-lock-guard.mjs");
  const guard = (repo, call) => spawnSync(process.execPath, [GUARD], { input: JSON.stringify(call), encoding: "utf8", env: { ...process.env, HARNESS_LOCK_REPOS: repo } });
  const dead = Number(spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout.trim());
  for (const [pid, child] of [[process.pid, null], [dead, process.pid]]) {
    const r = mkdtempSync(join(tmpdir(), "rr324-lock-")); mkdirSync(join(r, ".git", "almivisibility-suite-runs"), { recursive: true });
    writeFileSync(join(r, ".git", "almivisibility-suite-runs", `${pid}.json`), JSON.stringify({ pid, child, file: "the full test suite (tools/full-suite.mjs)" }));
    try {
      for (const call of [{ tool_name: "Edit", tool_input: { file_path: join(r, "desktop", "main.mjs") } }, { tool_name: "Bash", tool_input: { command: "node --test test/rr324-keyword-database.test.mjs" } }, { tool_name: "Bash", tool_input: { command: "git commit -m x" } }]) {
        const g = guard(r, call); assert.equal(g.status, 2, `${JSON.stringify(call)} was not refused (pid ${pid}, child ${child})`); assert.match(g.stderr, /REFUSED — a sabotage harness is running: the full test suite \(tools\/full-suite\.mjs\)/);
      }
      assert.equal(guard(r, { tool_name: "Read", tool_input: { file_path: join(r, "a.mjs") } }).status, 0);
    } finally { rmSync(r, { recursive: true, force: true }); }
  }
  const none = mkdtempSync(join(tmpdir(), "rr324-lock-")); mkdirSync(join(none, ".git"));
  try {
    for (const c of ["node --test test/*.test.mjs", "cd /c/x && node --test --test-concurrency=1 test/*.test.mjs 2>&1 | tail", "node --test test/*", "npm test", "cd /c/x && npm run test", "npm.cmd test 2>&1 | tail"]) { const g = guard(none, { tool_name: "Bash", tool_input: { command: c } }); assert.equal(g.status, 2, c); assert.match(g.stderr, /run with node tools\/full-suite\.mjs/); }
    for (const c of ["node tools/full-suite.mjs", "node --test test/rr324-keyword-database.test.mjs test/rr323-demand-first.test.mjs", "grep -n \"npm test\" test/x.mjs"]) assert.equal(guard(none, { tool_name: "Bash", tool_input: { command: c } }).status, 0, c);
  } finally { rmSync(none, { recursive: true, force: true }); }
});

test("D2 · the sample's label is the product's proper DISPLAY NAME of today — a sample checked under an earlier name is labelled with the corrected one", () => {
  assert.equal(displayNameOf({ name: "Almioet", displayName: "AlmiOET" }), "AlmiOET"); assert.equal(displayNameOf({ name: " AlmiOET " }), "AlmiOET"); assert.equal(displayNameOf(null), "this site");
  const PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase()), REC = recognitionOf(builtInList("recognising"), { professions: PROFS });
  const LETTER = Array.from({ length: 40 }, (_, i) => `invented sentence number ${i} for a practice letter`).join(" ");
  const sm = { title: "Practice", task: "Write a letter to the nurse.", caseNotes: Array.from({ length: 8 }, (_, i) => `invented note ${i}`), letter: LETTER, label: labelOf("Almioet", "OET") };
  sm.check = checkSample(sm, { subtest: "Writing", by: "Almioet", subject: "OET" }); assert.equal(sm.check.ok, true, sm.check.why);
  const plan = (by) => planFromList({ subject: "OET", rec: REC, professions: PROFS, venues: { countries: [], home: null }, on: ON, languages: ["en"], ai: { samples: { "practice|sample|Writing|nursing": sm } }, ...(by ? { by } : {}) }).kinds.practice.find((p) => p.key === "practice|sample|Writing|nursing");
  assert.equal(plan("AlmiOET").sample.label, "Practice sample written by AlmiOET, not an official OET paper");
  assert.equal(plan(null).sample.label, "Practice sample written by Almioet, not an official OET paper", "no name handed in: as stored");
  assert.match(MAIN, /const by = displayNameOf\(s\.product\), sh =/); assert.match(MAIN, /translatable: translatableOf\(id\), by: displayNameOf\(s\.product\) \}\);/);
});

/* ══ in the app, on stand-ins: the file twice, the folder, the two connectors OFF ══ */
test("IN THE APP · the client's file twice (the second adds nothing), the folder picked up, the screen's numbers, both connectors OFF — nothing sent", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr324-app-")), kp = generateKeyPairSync("ed25519"), folder = join(dir, "Visibility lists"); mkdirSync(folder);
  const site = createServer((q, r) => { if (q.url === "/robots.txt") { r.writeHead(200); return r.end("User-agent: *\nAllow: /\n"); } r.writeHead(200, { "content-type": "text/html" }); r.end("<!doctype html><html lang=\"en\"><head><title>X</title></head><body><main><h1>X</h1></main></body></html>"); });
  await new Promise((res) => site.listen(0, "127.0.0.1", res)); const base = `http://127.0.0.1:${site.address().port}`;
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, weeklyFirstMs: 2147483647, tourSeen: true, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", googleAdsTestEndpoints: { base: "http://127.0.0.1:9", token: "http://127.0.0.1:9/token", auth: "http://127.0.0.1:9/auth" }, dataForSeoTestBase: "http://127.0.0.1:9" }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD|CLIENT_SECRET|DATAFORSEO/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status })), get = (path) => fetch(`${url}${path}`).then((r) => r.json());
    await post("/api/company", { name: "X", site: base }); const id = (await post("/api/products", { name: "XPrep", site: base })).product.id;
    const b = exportBytes(KW).toString("base64"), name = `Keyword Stats ${ON} at 06_03_20.csv`;
    const one = await post(`/api/products/${id}/research/file`, { base64: b, name });
    assert.deepEqual([one.ok, one.alreadyRead, one.before, one.after, one.added], [true, false, 0, 5, 5], one.refused); assert.match(one.line, /5 new keywords, 0 already held/);
    const two = await post(`/api/products/${id}/research/file`, { base64: b, name });
    assert.deepEqual([two.ok, two.alreadyRead, two.before, two.after], [true, true, 5, 5]); assert.match(two.line, /already read on .* — nothing changed/);
    const dbBytes = readFileSync(join(dir, "products", id, "keyword-db.json"), "utf8");
    /* the folder: a new keyword-planner-*.csv is picked up when the screen opens; a file read before is skipped */
    writeFileSync(join(folder, "keyword-planner-uk.csv"), exportBytes([["oet practice test", 5000], ["oet results date", 50]], { title: "Keyword Stats" }));
    writeFileSync(join(folder, name), exportBytes(KW)); writeFileSync(join(folder, "notes.csv"), "Keyword,Avg. monthly searches\nnot me,50");
    const fo = await post(`/api/products/${id}/keywords/folder`, { dir: folder, auto: true, location: "United Kingdom" }); assert.match(fo.line ?? JSON.stringify(fo), /^1 new file read\. keyword-planner-uk\.csv: 2 rows — 1 new keywords, 1 already held/);
    const k = await get(`/api/products/${id}/keywords`);
    assert.deepEqual([k.summary.total, k.summary.files, k.picked.read], [6, 2, 0], "the screen opened again: nothing new to read");
    assert.notEqual(readFileSync(join(dir, "products", id, "keyword-db.json"), "utf8"), dbBytes);
    assert.deepEqual([k.ads.state, k.ads.line, k.ads.offLine], ["off", "Google Ads API: Test access; Basic access needed for keyword data.", "Switched off — nothing is sent to Google Ads."]);
    assert.deepEqual([k.dfs.on, k.dfs.line], [false, "Switched off — waiting for the provider's written permission."]);
    const ap = await post(`/api/products/${id}/keywords/ads`, { access: "test", applied: ["explorer"] }); assert.equal(ap.line, "Google Ads API: Test access, Explorer under review; Basic access needed for keyword data.");
    assert.equal((await post(`/api/products/${id}/keywords/ads/start`, {})).http, 400); assert.match((await post(`/api/products/${id}/keywords/ads/ideas`, { seeds: "oet" })).refused, /switched off — nothing was sent/);
    assert.match((await post(`/api/products/${id}/keywords/dfs/volume`, {})).refused, /waiting for the provider's written permission\. Nothing was bought\./);
    assert.equal((await post(`/api/products/${id}/keywords/dfs`, { on: true })).line, "Switched off — waiting for the provider's written permission.", "the switch alone does not turn it on");
    assert.equal((await post(`/api/products/${id}/keywords/ads`, { customerId: "12" })).http, 400);
    assert.equal(existsSync(join(dir, "dataforseo-ledger.json")), false, "nothing bought, no ledger written");
    const keys = await get("/api/keys"); for (const n of [ADS_KEYS.secret, DFS_KEYS.login, DFS_KEYS.password]) assert.equal(keys.keys[n].saved, false, `${n} is a key the app stores by name`);
  } finally { p.kill(); site.close(); await new Promise((r) => setTimeout(r, 300)); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});

test("SCREEN · the keyword database's numbers, the folder, the 25 keywords with their ranges and trend; the two connectors with their OFF lines", () => {
  for (const s of ["Your keyword database", "new today", "clusters", "pages they feed", "The page plan uses it at once — no extra click.", "Use this folder and read it now", "Read new files from it each time this screen opens", "Google's ranges, never exact", "Optional: your own Google Ads account — Keyword Planner's data, free", "AlmiWorld keyword service — included in your plan", "You need no Google account and no Google sign-in.", "Sign in to Google Ads yourself", "DataForSEO — paid, pay as you go", "Spending cap per day (US$)", "Spending cap per month (US$)", "I have DataForSEO's written permission to show their data to my customers", "A keyword already bought is never bought again"])
    assert.ok(UI.includes(s), s);
  assert.match(UI, /if \(\$\("#kwdb"\)\) keywordPanel\(P\);/); assert.match(UI, /name: f\.name, country: \$\("#sdcountry"\)\.value/);
  assert.match(UI, /id="dfson" \$\{D\.settings\.on \? "checked" : ""\} \$\{D\.permission \? "" : "disabled"\}/, "DataForSEO cannot be switched on without the permission ticked");
});
