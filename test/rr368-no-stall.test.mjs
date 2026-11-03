/**
 * 🔴 RR-368 (owner's real run on 1.15.21: "Making your pages — 6 of 18", on one page, over 7 minutes). No single site or queue may hold a run. No paid call: every server here is on this computer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { officialReader, OFFICIAL } from "../desktop/official.mjs";
import { createRobotsCache } from "../src/crawl/robots.mjs";
import { searchGoogle } from "../desktop/serp.mjs";
import { jobBoard, STILL_MS } from "../desktop/jobs.mjs";
import { examPlan } from "../desktop/exam-plan.mjs";
import { HONEST } from "../desktop/answer-ladder.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), ON = "2026-11-03";
const serve = (handler) => new Promise((ok) => { const s = createServer(handler); s.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${s.address().port}`, stop: () => { s.closeAllConnections?.(); s.close(); } })); });
const within = async (ms, p) => { let t; const r = await Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(new Error(`still waiting after ${ms} ms`)), ms); })]); clearTimeout(t); return r; };
const reader = (o = {}) => officialReader({ allowLocal: true, paceMs: 0, sleep: async () => {}, retries: 0, readLimitMs: 300, ...o });

test("a site that never answers: the read gives up at its limit and says so", async () => {
  const s = await serve((q, r) => { if (/robots/.test(q.url)) return r.end("User-agent: *\nAllow: /\n"); /* never answers */ });
  try { const r = await within(3000, reader().read(`${s.url}/page`)); assert.equal(r.ok, false); assert.match(r.why, /could not be read/); assert.equal(r.timedOut, true); assert.ok(r.checkedOn); } finally { s.stop(); }
});
test("a site that sends half a page and goes silent: the same", async () => {
  const s = await serve((q, r) => { if (/robots/.test(q.url)) return r.end("User-agent: *\nAllow: /\n"); r.writeHead(200, { "content-type": "text/html" }); r.write("<html><title>half"); });
  try { const r = await within(3000, reader().read(`${s.url}/page`)); assert.equal(r.ok, false); assert.match(r.why, /could not be read/); } finally { s.stop(); }
});
test("robots.txt: headers then silence ends at the time limit, as an unknown, never a hang", async () => {
  const s = await serve((q, r) => { r.writeHead(200, { "content-type": "text/plain" }); r.write("User-agent: *"); });
  try { const c = createRobotsCache({ fetchImpl: fetch, timeoutMs: 200, rfc9309: true }), r = await within(3000, c.check(`${s.url}/page`)); assert.equal(r.allowed, false); assert.equal(r.state, "UNKNOWN"); } finally { s.stop(); }
});
test("the limit is the same for a data file and a sitemap; a good page is unchanged; waiting in line does not count", async () => {
  const s = await serve((q, r) => { if (/robots/.test(q.url)) return r.end("User-agent: *\nAllow: /\n"); if (/good/.test(q.url)) { r.setHeader("content-type", "text/html"); return r.end("<html><title>Good</title><h1>Good</h1><p>The board registers nurses.</p></html>"); } });
  try { const rd = reader(); assert.equal(await within(3000, rd.raw(`${s.url}/file.xml`)), null); const sm = await within(3000, rd.sitemapOf(`${s.url}/`)); assert.equal(sm.ok, false); const ok = await within(3000, reader({ readLimitMs: 2000 }).read(`${s.url}/good`)); assert.equal(ok.ok, true); assert.equal(ok.h1, "Good"); } finally { s.stop(); }
  assert.equal(OFFICIAL.readLimitMs, 60000); assert.ok(OFFICIAL.readLimitMs > OFFICIAL.timeoutMs * 3, "three honest tries fit inside it");
  let at = 0; const fakeFetch = async (u) => { at++; await new Promise((r) => setTimeout(r, 30)); return new Response(/robots/.test(u) ? "User-agent: *\nAllow: /" : "<html><title>x</title><h1>x</h1></html>", { headers: { "content-type": "text/html" } }); };
  const paced = officialReader({ fetchImpl: fakeFetch, allowLocal: true, paceMs: 150, retries: 0, readLimitMs: 450 }), all = await Promise.all(["a", "b", "c", "d", "e"].map((x) => paced.read(`http://127.0.0.1:9/${x}`))); assert.ok(all.every((r) => r.ok), "five on one site: all read, in turn"); assert.ok(at >= 5);
});
test("a search during research is posted, kept and never waited for: the queue that never finishes holds nothing", async () => {
  let polls = 0, posts = 0; const fetchImpl = async (u, i) => { if (/task_post/.test(u)) { posts++; return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t1", status_code: 20100, status_message: "Task Created.", cost: 0.0006 }] })); } polls++; return new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 40602 }] })); };
  const ledger = {}, settings = { on: true, capDay: 1 }, go = () => searchGoogle({ keyword: "NMC OET", settings, ledger, login: "standin", password: "standin", fetchImpl, postOnly: true });
  const r = await within(2000, go()); assert.equal(r.ok, false); assert.equal(r.waiting, true); assert.equal(posts, 1); assert.equal(polls, 0, "no poll"); assert.equal(ledger.pending["NMC OET||"].id, "t1", "paid and kept, for the next run"); assert.equal(ledger.spent.length, 1);
  await within(2000, go()); assert.equal(posts, 1, "never paid twice");
  ledger.serpCache = { "NMC OET||": { ok: true, results: [{ url: "https://x.example/" }], at: new Date().toISOString() } }; delete ledger.pending["NMC OET||"]; assert.equal((await go()).ok, true, "once collected, it is used");
  const MAIN = read("desktop/main.mjs"); assert.equal((MAIN.match(/postOnly: true/g) ?? []).length, 2, "both searches of a run's research"); assert.ok(MAIN.includes("reading = (name) => step({ add: 1, what: `Reading ${name}'s page` }), sayingWhat = (what) => step({ what });")); assert.match(MAIN, /onWhat\?\.\(`Asking Google where/); assert.match(MAIN, /await collectQueued\(\{ ledger, login, password, maxMs: 0, everyMs: 0, \.\.\.serpTest\(\) \}\); writeFileSync\(DFS_LEDGER_FILE/);
});
test("the time left comes from real progress: nothing moved, no number; it moves again, a number", () => {
  let t = 0; const b = jobBoard({ now: () => t }), one = () => b.list().find((j) => j.key === "k"); b.start("k", { label: "Making", of: 18, unit: "official pages" }); t = 1000; b.step("k", { add: 1 }); t = 2000; b.step("k", { add: 1 }); assert.match(one().leftLine, /left$/); assert.ok(one().secondsLeft > 0);
  t += STILL_MS - 1; assert.ok(one().secondsLeft > 0, "not yet"); t += 2; assert.equal(one().secondsLeft, null); assert.equal(one().leftLine, "no change for 45 seconds, so no time left can be given"); t += 400000; assert.match(one().leftLine, /no change for 7 minutes/);
  b.step("k", { what: "Asking Google" }); assert.ok(!/no change/.test(one().leftLine ?? ""), "saying what it does now counts"); t += 100; b.step("k", { add: 1 }); assert.ok(!/no change/.test(one().leftLine));
});
test("a score never read is said as never read; a page read and silent as silent; never searched stays open", () => {
  const F = (key, text) => ({ claimId: `subject-${key}`, fact: key, text, link: `https://oet.com/${key}`, readOn: ON, source: "OET", official: true });
  const q = (country, s) => ({ kind: "score", country, question: `What OET score does a board in ${country} ask of nurses?`, answer: null, searched: [s] }), research = { nursing: [q("Nepal", { body: "Silent Board", url: "https://a.example/", on: ON, found: false, why: "could not be read (no answer within 60 seconds)" }), q("Ghana", { body: "Quiet Board", url: "https://b.example/", on: ON, found: false, why: "its page does not state the OET scores" }), q("Kenya", { body: "Later Board", url: "https://c.example/", found: false, why: "not searched yet" })] };
  const p = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Nepal"], research, facts: [], subjectFacts: { scale: F("scale", "OET's own page: each sub-test is reported on a scale from 0 to 500.") }, maxCountries: 50 }), hub = p.pages.find((x) => x.kind === "profession"), line = (c) => hub.items.find((i) => i.question.includes(c))?.claims[0].text;
  assert.equal(line("Nepal"), "Silent Board's own page could not be read on 2026-11-03; this is still being looked for."); assert.ok(HONEST.test(line("Nepal"))); assert.equal(line("Ghana"), "Quiet Board's official page, checked 2026-11-03, does not say this."); assert.equal(line("Kenya"), undefined); assert.ok(hub.open.some((x) => x.includes("Kenya")));
});

test("a read that breaks halfway is said in plain words; the one wait left is said with its limit", async () => {
  let n = 0; const broken = officialReader({ fetchImpl: async (u) => { if (/robots/.test(u)) return new Response("User-agent: *\nAllow: /"); n++; return { ok: true, status: 200, headers: new Headers({ "content-type": "text/html" }), arrayBuffer: async () => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); } }; }, allowLocal: true, paceMs: 0, sleep: async () => {}, retries: 0 });
  const r = await within(2000, broken.read("http://127.0.0.1:9/page")); assert.equal(r.ok, false); assert.equal(r.why, "could not be read (it stopped answering)"); assert.equal(n, 1);
  const MAIN = read("desktop/main.mjs"); assert.match(MAIN, /if \(left\) onWhat\?\.\(`Waiting for Google's results: \$\{left\} still being prepared\. The wait ends by itself within 15 minutes/); assert.match(MAIN, /return serpStep\(id, \{ pages: left \}, [^\n]*, sayingWhat\)/);
  assert.match(MAIN, /postOnly: true, retry: [^\n]*\.\.\.serpTest\(\) \}\); writeFileSync\(DFS_LEDGER_FILE, JSON\.stringify\(ledger\)\);/, "a paid search is kept at once");
});

test("the limit stays firm when several reads on one silent site wait for each other: one extension, then each gives up", async () => {
  const s = await serve((q, r) => { if (/robots/.test(q.url)) return r.end("User-agent: *\nAllow: /\n"); /* never answers */ });
  try { const rd = officialReader({ allowLocal: true, paceMs: 10, sleep: async () => {}, retries: 0, readLimitMs: 100 }), all = await within(3000, Promise.all(["a", "b", "c"].map((x) => rd.read(`${s.url}/${x}`)))); assert.ok(all.every((r) => r.ok === false && /could not be read/.test(r.why))); } finally { s.stop(); }
});
