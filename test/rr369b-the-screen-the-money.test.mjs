/**
 * 🔴 RR-369b · the Pages screen follows the run; the line matches the ledger; marked pages really ask; the collector's reuse is kept; what is known to fail is not paid for.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { searchCounts, coverageRoutes } from "../desktop/almiseo.mjs";
import { searchPages, serpKey, autoKey } from "../desktop/serp.mjs";
import { readFailures, failuresOfLedger, hostFails, replayRule, READ_RULE } from "../desktop/read-failures.mjs";
import { uploadBought, askServerFirst, emptySaved, unsaved } from "../desktop/search-store.mjs";
import { applyPairQuestions } from "../desktop/exam-plan.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { saveBought, heldBought, sharedFailHosts, collectorReuse, allTopics, ENV_NAMES, FAIL_KEY, PAID_FAIL } from "../site/almiseo.mjs";
import { runTopPages } from "../site/top-pages.mjs";
import { recordRun } from "../site/health.mjs";
import { bundle, importClosure } from "../site/owner-bundle.mjs";

const NOW = "2026-11-03T20:00:00.000Z", DAY = "2026-11-03", OWNER = { owner: true, account: "o", plan: "owner" }, read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ok = (q, cost = 0.00015) => ({ on: NOW, what: "top page read", q, cost, ok: true }), bad = (q, why = "Ok.", cost = 0.00015) => ({ on: NOW, what: "top page read", q, cost, ok: false, why });

test("ITEM 1: an open Pages screen is drawn again when a run or its improving line ends; summary, list and buttons are one answer; the words say new and existing", () => {
  const UI = read("desktop/ui.html");
  assert.match(UI, /const PAGES_JOB = \/\^\(\?:make\|improve\)\$\//);
  assert.match(UI, /function pagesAfterJobs\(jobs\) \{ const ended = jobs\.some\(\(j\) => PAGES_JOB\.test\(j\.kind\) && j\.product === P && !j\.running && JOBS_RUNNING\.has\(j\.key\)\)/, "only a job seen running here, now ended");
  assert.match(UI, /if \(ended && \$\("#pubbox"\)\) pagesBox\(PAGES_WAITING\)/); assert.match(UI, /if \(J\) pagesAfterJobs\(J\.jobs\);/); assert.match(UI, /PAGES_WAITING = waitingOnly;/);
  const f = /const readyWords = (\(n\) => `[^\n]*`);/.exec(UI)?.[1]; assert.ok(f); const words = new Function(`return ${f}`)();
  assert.equal(words({ newReady: 311, newAll: 311, existingReady: 12, existingAll: 12 }), "311 new pages and 12 existing pages ready");
  assert.equal(words({ newReady: 305, newAll: 311, existingReady: 10, existingAll: 12 }), "305 new pages of 311 and 10 existing pages of 12 ready");
  assert.equal(words({ newReady: 1, newAll: 1, existingReady: 0, existingAll: 0 }), "1 new page ready");
  assert.match(UI, /id="readywords"><b>✅ \$\{readyWords\(/, "the summary"); assert.match(UI, /topic pages planned\.<\/b> ✅ \$\{readyWords\(/, "the plan block"); assert.doesNotMatch(UI, /made are ✅ ready/);
});

test("ITEM 2: the line counts every charged row of the run, a failed read too, and matches the ledger; a free failure is no purchase", () => {
  const rows = [ok("u1"), ok("u2"), bad("u3"), bad("u4", "Target page took too long to respond.", 0), { on: NOW, what: "autocomplete", q: "a", cost: 0.0006, ok: true, queued: true }];
  const c = searchCounts({ routes: { saved: 2, browser: 0, none: 0 }, paid: { reused: 3, bought: 99, cost: 9 }, charged: rows, saved: 1 });
  assert.deepEqual([c.bought, c.failed], [4, 1]); assert.ok(Math.abs(c.cost - 0.00105) < 1e-9); assert.match(c.line, /^Searches: 1 saved in AlmiSEO Data \(confirmed by the server\), 5 reused free, 4 bought \(\$0\.00\), 1 of them charged though the page could not be read\./);
  assert.doesNotMatch(searchCounts({ charged: [ok("u")] }).line, /could not be read/);
  assert.match(read("desktop/main.mjs"), /charged: \(led\.spent \?\? \[\]\)\.slice\(councilFrom\)/, "from the run's first row, not from one pass");
});

test("ITEM 3: a marked page with a saved list goes to the paid step for its seeds only, with no page search; inside the cap; nothing is bought for an unmarked one; its phrases reach the page", async () => {
  const marked = { kind: "origin-profession", title: "OET for Vets from Nepal", country: "Nepal", profession: "veterinary science", questionsWanted: true, askSeeds: ["oet vets", "oet vets nepal"] }, plain = { kind: "origin-profession", title: "OET for Nurses from Nepal", country: "Nepal", profession: "nursing" };
  const file = { plan: [], coverage: [{ intent: marked.title, on: DAY, coverage: [], second: [], read: [], asked: [] }, { intent: plain.title, on: DAY, coverage: [], second: [], read: [], asked: [] }] }; let got = null;
  await coverageRoutes({ pages: [marked, plain], file, paidOn: true, paid: async (left, askOnly) => { got = { left, askOnly }; return { reused: 0, bought: 0, cost: 0 }; } });
  assert.deepEqual(got.left, []); assert.deepEqual(got.askOnly.map((p) => p.title), [marked.title]); assert.equal(marked.coverageRoute, "saved", "the saved list still answers it");
  const posted = []; const fetchImpl = async (u, init) => { if (/task_post/.test(u)) { const ts = JSON.parse(init.body); for (const t of ts) posted.push(`${/autocomplete/.test(u) ? "auto" : "serp"}:${t.keyword}`); return { json: async () => ({ status_code: 20000, tasks: ts.map((_, i) => ({ status_code: 20100, id: `t${posted.length}-${i}`, cost: 0.0006 })) }) }; } return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ items: [{ type: "autocomplete", suggestion: "oet vets nepal fee" }] }] }] }) }; };
  const ledger = { spent: [] }; await searchPages({ pages: [], askOnly: [marked], ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, retry: { times: 0 } });
  assert.deepEqual(posted.sort(), ["auto:oet vets", "auto:oet vets nepal"], "its seeds, no page search"); assert.deepEqual(marked.localAsked, ["oet vets nepal fee"]);
  /* the cap */
  const capped = { spent: [{ on: NOW, cost: 1, q: "x" }] }; posted.length = 0; const m2 = { ...marked, localAsked: undefined }; const out = await searchPages({ pages: [], askOnly: [m2], ledger: capped, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, retry: { times: 0 } }); assert.equal(posted.length, 0, "not past $1 a day"); assert.match(out.stopped, /cap is reached/);
  /* a word people type takes the verified answer, in their words; never a question of ours */
  const answers = { claimId: "r", fact: "resultsComputer", text: "OET's own page: results come in about 10 working days.", link: "https://oet.com/results", readOn: DAY, source: "OET", official: true }, plan = { pages: [{ ...marked, items: [], localAsked: ["oet vets nepal result"] }, { ...marked, title: "no wording", items: [], localAsked: ["oet vets nepal"] }] };
  applyPairQuestions(plan, { subject: "OET", ctxFor: () => ({ subjectFacts: { resultsComputer: answers, results95: answers, resultsPaper: answers }, country: "Nepal" }) }); assert.ok(plan.pages.flatMap((p) => p.items).every((i) => !/^Can /.test(i.question)), "never a question of ours"); assert.deepEqual(plan.questionsWanted.map((w) => w.title), ["no wording"], "a wording that asks takes the verified answer; one that does not stays marked"); assert.ok(plan.pages[0].items.some((i) => i.realQuestion && i.localWording));
  const headed = { pages: [{ ...marked, items: [{ part: "fee", question: "How much?", claims: [answers] }], localAsked: ["oet vets nepal fee"] }] }; applyPairQuestions(headed, { subject: "OET", ctxFor: () => ({}) }); assert.equal(headed.pages[0].items[0].question, "OET vets Nepal fee?", "a part it already answers takes their words"); assert.deepEqual(headed.pages[0].askedHeads, ["OET vets Nepal fee?"]); assert.deepEqual(headed.questionsWanted, []);
  assert.match(read("desktop/almiseo.mjs"), /if \(\(left\.length \|\| askOnly\.length\) && paidOn && paid\) \{ paidResult = await paid\(left, askOnly\);/);
});

test("ITEM 4: the collector's reuse is kept in recordRun and on the server's own count, and the owner's read shows it", async () => {
  const mem = new Map(), kv = { run: async (c) => c.map(([cmd, k, v]) => { if (cmd === "GET") return mem.get(k) ?? null; if (cmd === "SET") { mem.set(k, v); return "OK"; } return null; }) };
  await recordRun(kv, "top-pages", DAY, { progress: 1, reused: 6, readsSkipped: 2 }); await recordRun(kv, "top-pages", DAY, { progress: 1, reused: 4 });
  const r = JSON.parse([...mem.values()][0]); assert.deepEqual([r.reused, r.readsSkipped, r.runs], [10, 2, 2]);
  const seo = seoMemoryStore(), topic = (await allTopics({ seo })).find((t) => t.id === "oet"), intent = "OET for Nurses in Kenya"; await seo.putTopic({ ...topic, intents: [intent], owner: "almiworld", jobs: ["top-pages"] }, { at: NOW });
  await saveBought({ seo, subject: "OET", searches: [{ key: serpKey(intent), on: DAY, results: [{ url: "https://t.example/a", title: "A" }], paa: [], related: [] }], pages: [{ url: "https://t.example/a", on: DAY, headings: ["Fees"], blocks: {} }], lic: OWNER, at: NOW });
  const out = await runTopPages({ seo, cf: cfMemoryStore(), env: { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" }, reader: { requests: () => 0, raw: async () => null }, fetchImpl: async () => assert.fail("nothing is paid"), now: () => Date.parse(NOW), kv });
  assert.equal(out.reused, 1); assert.deepEqual(await collectorReuse(seo), { reused: 1, readsSkipped: 0 }); { const h = [...mem.values()].map((v) => { try { return JSON.parse(v); } catch { return null; } }).find((v) => v?.runs); assert.deepEqual([h.runs, h.reused], [3, 11], "the run's own reuse is in recordRun"); }
  assert.match(read("site/almiseo.mjs"), /\.\.\.\(await collectorReuse\(seo\)\)/);
});

test("ITEM 5, THE RULE: an address that failed, a document, a site that nearly always fails: not paid; a site that mostly works: paid; a timeout counts for nothing; measured on the owner's shape", () => {
  assert.deepEqual(READ_RULE, { minFails: 2, failsPerGood: 5 });
  assert.equal(hostFails({ ok: 3, fail: 179 }), true, "facebook.com, whose 3 good reads would pass a no-success rule"); assert.equal(hostFails({ ok: 36, fail: 12 }), false, "oet.com"); assert.equal(hostFails({ ok: 0, fail: 1 }), false, "one failure proves nothing about a site"); assert.equal(hostFails({ ok: 0, fail: 2 }), true); assert.equal(hostFails({ ok: 4, fail: 3 }), false);
  const f = readFailures({ urls: new Map([["https://a.example/x", {}]]), own: { "facebook.com": { ok: 3, fail: 179 } }, shared: { "seen.example": { ok: 0, fail: 2 } } });
  assert.match(f.skip("https://a.example/x"), /failed before/); assert.equal(f.skip("https://a.example/y"), null); assert.match(f.skip("https://www.facebook.com/p"), /nearly always/); assert.match(f.skip("https://seen.example/p"), /nearly always/, "learned from the server"); assert.match(f.skip("https://b.example/form.PDF?x=1"), /document/); assert.equal(f.skipped(), 4);
  f.note("https://c.example/1", { ok: false, why: "Ok." }); f.note("https://c.example/2", { ok: false, why: "Ok." }); assert.match(f.skip("https://c.example/3"), /nearly always/, "learned in the run"); assert.match(f.skip("https://c.example/1"), /failed before/);
  f.note("https://d.example/1", { ok: false, why: "Target page took too long to respond." }); assert.equal(f.skip("https://d.example/1"), null, "not charged; it may pass another day");
  const led = { spent: [ok("https://o.example/1"), bad("https://f.example/1"), bad("https://f.example/2"), bad("https://f.example/3"), ok("https://f.example/4"), bad("https://t.example/1", "Target page took too long to respond.", 0), { what: "search results", q: "x" }] }, kn = failuresOfLedger(led);
  assert.deepEqual(kn.hosts, { "o.example": { ok: 1, fail: 0 }, "f.example": { ok: 1, fail: 3 } }); assert.equal(kn.urls.size, 3);
  const rp = replayRule(led.spent); assert.deepEqual([rp.savedFails, rp.skippedGood], [1, 1], "f.example: two failures paid to learn it, the third failure and the good read not paid");
});

test("ITEM 5, THE RUN: what is known to fail is not bought and the free read still tries it; what fails is remembered; never paid twice for one address across pages", async () => {
  const urls = ["https://www.facebook.com/a", "https://new.example/a", "https://good.example/a", "https://twice.example/a"], ledger = { spent: [], serpCache: { [serpKey("OET one")]: { ok: true, at: NOW, results: urls.map((url) => ({ url, title: "t" })), paa: [], related: [] }, [serpKey("OET two")]: { ok: true, at: NOW, results: [{ url: urls[1], title: "t" }, { url: urls[3], title: "t" }], paa: [], related: [] }, [serpKey("OET one reddit")]: { ok: true, at: NOW, results: [], paa: [], related: [] }, [serpKey("OET one quora")]: { ok: true, at: NOW, results: [], paa: [], related: [] }, [serpKey("OET two reddit")]: { ok: true, at: NOW, results: [], paa: [], related: [] }, [serpKey("OET two quora")]: { ok: true, at: NOW, results: [], paa: [], related: [] } } };
  const paid = [], free = []; const fetchImpl = async (u, init) => { const url = JSON.parse(init.body)[0].url; paid.push(url); return { json: async () => (/good/.test(url) ? { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.00015, result: [{ items: [{ page_content: { main_topic: [{ h_title: "Fees", primary_content: [{ text: "x" }] }] } }] }] }] } : { status_code: 20000, tasks: [{ status_code: 20000, status_message: "Ok.", cost: 0.00015, result: [{ items: [{}] }] }] }) }; };
  const tops = {}, fails = readFailures({ own: { "facebook.com": { ok: 3, fail: 179 } } });
  const out = await searchPages({ pages: [{ kind: "topic", title: "OET one" }, { kind: "topic", title: "OET two" }], ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, parse: true, readFails: fails, topCache: { get: (u) => tops[u] ?? null, set: (u, v) => { tops[u] = v; } }, readHtml: async (u) => { free.push(u); return "<h2>Fees</h2>"; }, wait: false, concurrency: 1, retry: { times: 0 } });
  assert.ok(!paid.includes(urls[0]), "facebook.com: not paid"); assert.ok(free.includes(urls[0]), "the free read still tries it"); assert.equal(tops[urls[0]].paidFail, true); assert.equal(new Set(paid).size, paid.length, "no address paid twice"); assert.equal(tops[urls[1]].paidFail, true, "failed: remembered"); assert.ok(!tops[urls[2]].paidFail); assert.equal(out.readsSkipped, 1);
  assert.equal(ledger.spent.filter((r) => r.what === "top page read").length, 3); assert.equal(fails.own()["new.example"].fail, 1);
});

test("ITEM 5, THE SERVER: what failed goes up once (the old ones too), the sites' counts add across everyone, the server tells the owner's app; an outside client is told nothing; the collector does not pay for them and books what fails", async () => {
  const seo = seoMemoryStore(), client = { sent: [], saveBought: async function (b) { this.sent.push(b); return saveBought({ seo, ...b, lic: OWNER, at: NOW }); } };
  const ledger = { spent: [bad("https://www.facebook.com/1"), bad("https://www.facebook.com/2"), ok("https://o.example/1")], serpCache: {} }, tops = { "https://www.facebook.com/1": { on: DAY, headings: null, blocks: null }, "https://www.facebook.com/2": { on: DAY, headings: ["Free read"], blocks: { tables: 0 } } }, saved = { ...emptySaved(), pages: { "https://www.facebook.com/1": NOW, "https://www.facebook.com/2": NOW } };
  assert.equal(unsaved({ ledger, tops, saved }).pages.length, 0, "already confirmed as pages: the failure still has to go");
  await uploadBought({ client, ledger, tops, saved, subjectOf: () => "OET", examSubject: "OET", now: NOW });
  assert.deepEqual(Object.keys(saved.failures).sort(), ["https://www.facebook.com/1", "https://www.facebook.com/2"]); assert.deepEqual((await sharedFailHosts(seo))["facebook.com"], { ok: 0, fail: 2 }); assert.equal((await seo.searchCount("oet")), 0, "these rows are no searches");
  const pages = await seo.pages(["https://www.facebook.com/1", "https://www.facebook.com/2"]); assert.match(pages.find((p) => p.url.endsWith("/1")).why, new RegExp(PAID_FAIL)); assert.equal(pages.find((p) => p.url.endsWith("/2")).structure.paidFail, true); assert.deepEqual(pages.find((p) => p.url.endsWith("/2")).structure.headings, ["Free read"], "the free read's headings stay");
  const n = client.sent.length; await uploadBought({ client, ledger, tops, saved, subjectOf: () => "OET", examSubject: "OET", now: NOW }); assert.equal(client.sent.filter((b) => b.failHosts || b.pages?.length).length, client.sent.slice(0, n).filter((b) => b.failHosts || b.pages?.length).length, "sent once");
  /* the owner's app asks */
  const h = await heldBought({ seo, subject: "OET", keys: [], urls: ["https://www.facebook.com/2"], lic: OWNER, at: NOW }); assert.equal(h.pages["https://www.facebook.com/2"].paidFail, true); assert.equal(h.failHosts["facebook.com"].fail, 2);
  const led2 = { spent: [] }, sv2 = emptySaved(), tp2 = {}; await askServerFirst({ client: { heldBought: async (b) => heldBought({ seo, subject: "OET", ...b, lic: OWNER, at: NOW }) }, subject: "OET", urls: ["https://www.facebook.com/2"], ledger: led2, tops: tp2, saved: sv2 }); assert.equal(tp2["https://www.facebook.com/2"].paidFail, true); assert.equal(sv2.failHosts["facebook.com"].fail, 2);
  await saveBought({ seo, subject: "OET", pages: [], failHosts: { "bad host!": { ok: 1 } }, lic: OWNER, at: NOW }); assert.equal((await sharedFailHosts(seo))["bad host!"], undefined);
  /* the collector */
  const topic = (await allTopics({ seo })).find((t) => t.id === "oet"), intent = "OET for Nurses in Ghana"; await seo.putTopic({ ...topic, intents: [intent], owner: "almiworld", jobs: ["top-pages"] }, { at: NOW });
  await saveBought({ seo, subject: "OET", searches: [{ key: serpKey(intent), on: DAY, results: [{ url: "https://www.facebook.com/3", title: "F" }, { url: "https://fresh.example/1", title: "N" }], paa: [], related: [] }], lic: OWNER, at: NOW });
  const parsed = []; const fetchImpl = async (u, init) => { const url = JSON.parse(init.body)[0].url; parsed.push(url); return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, status_message: "Ok.", cost: 0.00015, result: [{ items: [{}] }] }] }) }; };
  const out = await runTopPages({ seo, cf: cfMemoryStore(), env: { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" }, reader: { requests: () => 0, raw: async () => "<h2>Fees</h2><p>x</p>" }, fetchImpl, now: () => Date.parse(NOW) });
  assert.deepEqual(parsed, ["https://fresh.example/1"], "facebook.com is not paid for"); assert.equal(out.readsSkipped, 1); assert.ok(out.cost >= 0.00015, "a failed reading is booked"); assert.equal((await seo.pages(["https://fresh.example/1"]))[0].structure.paidFail, true); assert.equal((await sharedFailHosts(seo))["fresh.example"].fail, 1, "remembered for everyone"); assert.ok(String(FAIL_KEY).length);
});

test("THE BUNDLE: the last folder's files from HEAD; the folder's own package.json and vercel.json kept; what the server newly imports added; a key or env file never", () => {
  const closure = importClosure(["site/app.mjs"], (f) => { try { return read(f); } catch { return null; } }); assert.ok(closure.has("desktop/read-failures.mjs")); assert.ok(closure.has("site/top-pages.mjs"));
  const repo = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), like = mkdtempSync(join(tmpdir(), "like-")), out = join(tmpdir(), `out-${Date.now()}`); mkdirSync(join(like, "api")); mkdirSync(join(like, "site"));
  writeFileSync(join(like, "package.json"), "{\"deploy\":true}"); writeFileSync(join(like, "vercel.json"), "{\"deploy\":true}"); writeFileSync(join(like, "api/index.mjs"), "// the function"); writeFileSync(join(like, "site/app.mjs"), "// old"); writeFileSync(join(like, ".vercelignore"), ".env\n");
  const r = bundle({ repo, like, out }), head = execFileSync("git", ["-C", repo, "show", "HEAD:site/app.mjs"], { encoding: "utf8" });
  assert.equal(readFileSync(join(out, "package.json"), "utf8"), "{\"deploy\":true}"); assert.equal(readFileSync(join(out, "vercel.json"), "utf8"), "{\"deploy\":true}"); assert.equal(readFileSync(join(out, "site/app.mjs"), "utf8"), head); assert.ok(r.added.length > 0); assert.equal(existsSync(join(out, ".env")), false); assert.equal(existsSync(join(out, ".vercel")), false);
  assert.throws(() => bundle({ repo, like, out: like }), /new folder/); rmSync(like, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true });
});
