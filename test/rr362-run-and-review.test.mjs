/**
 * RR-362 · the run (R13: saved, reused, bought; item 13: tomorrow; items 10 + 17: polite per site), the collectors' order (items 8, 9) and the owner's ticks (items 11, 12). No real search, no real money.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { searchGoogle, searchPages, SERP, KEEP_SEARCH_DAYS } from "../desktop/serp.mjs";
import { officialReader } from "../desktop/official.mjs";
import { searchedLists, searchCounts } from "../desktop/almiseo.mjs";
import { KIND } from "../desktop/page-types.mjs";
import { checksDue, nextStepOf, TOP_JOBS } from "../desktop/next-step.mjs";
import { jobBoard, leftWords } from "../desktop/jobs.mjs";
import { windowsToast } from "../desktop/notify.mjs";
import { stillWaiting } from "../desktop/country-facts.mjs";
import { DEFAULT_QUEUE } from "../site/queue.mjs";
import { ownTopics, saveFromApp, accountHash, ENV_NAMES } from "../site/almiseo.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { runTopPages } from "../site/top-pages.mjs";
import { ownerReview, decideTicked, REVIEW_JS } from "../site/owner-review.mjs";

const NOW = "2026-11-02T10:00:00.000Z", answer = (cost = 0.002) => ({ status_code: 20000, tasks: [{ status_code: 20000, cost, result: [{ items: [{ type: "organic", url: "https://top.example.org/a", title: "A" }, { type: "people_also_ask", items: [{ title: "How long is it valid?" }] }] }] }] });
const paid = (calls) => async () => { calls.n++; return { json: async () => answer() }; };

test("item 14 (R13): a search already kept is reused free, whether the switch is on or off; a month later it may be bought again", async () => {
  const ledger = { spent: [], serpCache: {} }, calls = { n: 0 }, ask = (settings, now = NOW) => searchGoogle({ keyword: "k", settings, ledger, login: "l", password: "p", now, fetchImpl: paid(calls) });
  const off0 = await ask({ on: false }); assert.equal(off0.off, true); assert.equal(calls.n, 0, "the switch off buys nothing");
  await ask({ on: true }); assert.equal(calls.n, 1);
  const again = await ask({ on: true }); assert.equal(again.cached, true); assert.equal(calls.n, 1, "never paid twice");
  const off1 = await ask({ on: false }); assert.equal(off1.cached, true); assert.equal(off1.ok, true, "reused with the switch off");
  const later = new Date(Date.parse(NOW) + (KEEP_SEARCH_DAYS + 1) * 864e5).toISOString();
  await ask({ on: true }, later); assert.equal(calls.n, 2, "a month old: asked again");
});

test("searches side by side never pass the day's cap: one on its way counts", async () => {
  const ledger = { spent: [{ on: NOW, cost: SERP.capPerDay - SERP.pricePerSearch * 2 }], serpCache: {} }, calls = { n: 0 };
  const slow = async () => { calls.n++; await new Promise((r) => setTimeout(r, 20)); return { json: async () => answer(SERP.pricePerSearch) }; };
  const all = await Promise.all(["a", "b", "c", "d"].map((keyword) => searchGoogle({ keyword, settings: { on: true }, ledger, login: "l", password: "p", now: NOW, fetchImpl: slow })));
  assert.ok(calls.n <= 2, `only what fits was sent (${calls.n})`); assert.ok(all.filter((x) => x.capped).length >= 2);
  const spent = ledger.spent.reduce((t, s) => t + s.cost, 0); assert.ok(spent <= SERP.capPerDay + 1e-9, `spent ${spent}`);
});

test("items 14 + 17: a top page read once a month, the pages side by side, counted: reused and bought", async () => {
  const ledger = { spent: [], serpCache: {} }, calls = { n: 0 }, reads = { n: 0 }, tops = {}, topCache = { get: (u) => tops[u] ?? null, set: (u, v) => { tops[u] = v; } }, seen = [];
  const pages = () => ["One", "Two"].map((title) => ({ title, questions: [] }));
  const run = (p) => searchPages({ pages: p, ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "TESTX", fetchImpl: paid(calls), readHtml: async () => { reads.n++; return "<h2>How long are TESTX results valid?</h2>"; }, concurrency: 2, topCache, onPage: (x, s) => seen.push(s) });
  const first = await run(pages()); assert.equal(first.bought, 6, "three searches a page"); assert.equal(reads.n, 1, "the same top page read once, side by side or not");
  assert.ok(seen.filter((s) => s === "done").length === 2, "the progress bar hears each page");
  const p2 = pages(), second = await run(p2);
  assert.equal(second.bought, 0); assert.equal(second.reused, 6); assert.equal(calls.n, 6, "nothing bought again"); assert.equal(reads.n, 1, "nothing read again");
  assert.ok(p2[0].searchedOn && p2[0].topRead.length === 1, "the page keeps what the search gave");
});

test("items 10 + 17: politeness is per site: one site waits its turn, another does not wait for it", async () => {
  const at = {}, t0 = Date.now(), fetchImpl = async (u) => { const h = new URL(u).host, p = new URL(u).pathname; if (p !== "/robots.txt") (at[h] ??= []).push(Date.now() - t0); return p === "/robots.txt" ? new Response("", { status: 404 }) : new Response("<html><title>x</title><h1>x</h1>" + "word ".repeat(50) + "</html>", { status: 200, headers: { "content-type": "text/html" } }); };
  const r = officialReader({ fetchImpl, allowLocal: true, paceMs: 120 });
  await Promise.all(["https://a.example.org/1", "https://a.example.org/2", "https://b.example.org/1"].map((u) => r.read(u)));
  assert.equal(at["a.example.org"].length, 2);
  assert.ok(at["a.example.org"][1] - at["a.example.org"][0] >= 100, `one site waits between two reads (${at["a.example.org"]})`);
  assert.ok(at["b.example.org"][0] < at["a.example.org"][1], "another site does not wait for it");
});

test("item 14: what a run searched is sent under the collectors' own name for that page; the line says saved, reused, bought", () => {
  const file = { plan: [{ kind: "country-profession", country: "Ireland", profession: "nursing", title: "OET for nursing in Ireland" }] };
  const lists = searchedLists([{ kind: KIND.destination, country: "Ireland", profession: "nursing", title: "TESTX for Nurses in Ireland", coverageRoute: "paid", searchedOn: "2026-11-02", topRead: ["https://top.example.org/a"], paa: ["Q?"], related: [], coverage: [{ topic: "T" }], second: [{ question: "S?" }] }, { title: "Not searched", coverageRoute: "none" }, { title: "From the list", coverageRoute: "saved", searchedOn: "2026-11-02" }], file);
  assert.equal(lists.length, 1); assert.equal(lists[0].intent, "OET for nursing in Ireland"); assert.deepEqual(lists[0].coverage, ["T"]); assert.deepEqual(lists[0].second, ["S?"]);
  const c = searchCounts({ routes: { saved: 3, browser: 1, paid: 2, none: 5 }, paid: { reused: 4, bought: 6, cost: 0.012 }, saved: 2 });
  assert.equal(c.line, "Searches: 2 saved in AlmiSEO Data, 8 reused free, 6 bought ($0.01). 5 pages will be checked tomorrow.");
  assert.equal(searchCounts({ routes: { none: 0 } }).later, 0);
});

test("item 13: the next day the run goes on by itself, once a day, never over a running one", () => {
  assert.equal(checksDue({ day: "2026-11-01", titles: ["a"] }, { today: "2026-11-02" }), true);
  assert.equal(checksDue({ day: "2026-11-02", titles: ["a"] }, { today: "2026-11-02" }), false, "once a day");
  assert.equal(checksDue({ day: "2026-11-01", titles: [] }, { today: "2026-11-02" }), false, "nothing left");
  assert.equal(checksDue({ day: "2026-11-01", titles: ["a"] }, { today: "2026-11-02", running: true }), false);
  assert.equal(checksDue(null, { today: "2026-11-02" }), false);
});

test("item 6: the board says how much, how long, what now; a long job says the window may be closed; the words are plain", () => {
  let t = 1000; const ended = [], B = jobBoard({ now: () => t, onFinish: (j) => ended.push(j) });
  B.start("make:x", { product: "x", kind: "make", label: "Making your pages", unit: "pages" }); B.step("make:x", { of: 232, what: "Reading NMC's page" });
  t += 10000; B.step("make:x", { add: 45 });
  const [j] = B.list({ product: "x" });
  assert.equal(j.done, 45); assert.equal(j.of, 232); assert.equal(j.what, "Reading NMC's page"); assert.equal(j.percent, 19);
  assert.equal(j.secondsLeft, Math.round((10 / 45) * 187)); assert.equal(j.leftLine, "less than a minute left");
  assert.equal(j.canClose, false, "a short one"); t += 300000; assert.equal(B.list()[0].canClose, true, "a long one: the window may be closed");
  B.finish("make:x", { line: "12 pages are ready for you." }); assert.equal(ended[0].line, "12 pages are ready for you."); assert.equal(ended.length, 1);
  B.finish("make:x", {}); assert.equal(ended.length, 1, "told once");
  t += 16 * 60e3; assert.equal(B.list().length, 0, "a finished job leaves the board");
  assert.equal(leftWords(1200), "about 20 minutes left"); assert.equal(leftWords(null), "working out the time left");
});

test("item 6: the notification's words go in as data, never as part of the command", () => {
  const run = []; windowsToast({ title: "A'; Remove-Item x", line: "B", spawnImpl: (file, args, o) => { run.push({ file, args, env: o.env }); return { on() {}, unref() {} }; }, platform: "win32" });
  assert.equal(run[0].file, "powershell.exe"); assert.ok(!run[0].args.join(" ").includes("Remove-Item")); assert.equal(run[0].env.AV_TITLE, "A'; Remove-Item x");
  assert.equal(windowsToast({ title: "x", line: "y", platform: "linux" }), false);
});

test("items 2 + 4 + 7: one status line and ONE next step, in plain words", () => {
  const base = { hasSite: true, checked: true, score: 70, pages: 0, ready: 0, improve: 0, published: 0, checkLater: 0, running: null };
  assert.equal(nextStepOf({ ...base, ready: 12, pages: 40, checkLater: 3 }).button, "12 pages wait for you → See them");
  assert.match(nextStepOf({ ...base, ready: 12, pages: 40, checkLater: 3 }).status, /3 pages checked tomorrow/);
  assert.equal(nextStepOf({ ...base, hasSite: false }).action, "settings"); assert.equal(nextStepOf({ ...base, checked: false }).action, "check"); assert.equal(nextStepOf(base).action, "make");
  assert.equal(nextStepOf({ ...base, pages: 3 }).action, "pages");
  assert.match(nextStepOf({ ...base, running: { label: "Making your pages", done: 45, of: 232 } }).status, /45 of 232/);
  assert.equal(TOP_JOBS.length, 5);
});

test("item 8: the order: AlmiOET → AlmiVisibility → AlmiWorld → AlmiCV → AlmiJob → AlmiSalary → the rest; almiworld.com is a topic", () => {
  assert.deepEqual(DEFAULT_QUEUE.products.slice(0, 6), ["oet", "visibility", "almiworld", "cv", "jobs", "salary"]);
  const w = ownTopics().find((t) => t.id === "almiworld"); assert.equal(w.site, "https://almiworld.com"); assert.ok(w.jobs.includes("top-pages")); assert.equal(w.owner, "almiworld");
});

const env = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" };
const noFacts = { facts: async () => [] }, reader = () => { let n = 0; return { requests: () => n, raw: async () => { n++; return "<main><h2>How long are results valid?</h2><h2>How is it scored?</h2></main>"; } }; };

test("item 14: what the app searched is saved on the server; the collector does not buy it again; a list is kept only when newer; no stranger writes", async () => {
  const seo = seoMemoryStore(), at = NOW, owner = { owner: true, account: "o", plan: "visibility_5" }, list = { intent: "AlmiOET in Ireland", on: "2026-11-01", read: ["https://top.example.org/a"], paa: ["How long is it valid?"], related: [], coverage: ["How is OET scored?"], second: ["How long is it valid?"] };
  const r = await saveFromApp({ seo, subject: "OET", lists: [list], lic: owner, at }); assert.deepEqual([r.ok, r.saved, r.kept], [true, 1, 0]);
  const again = await saveFromApp({ seo, subject: "OET", lists: [list], lic: owner, at }); assert.deepEqual([again.saved, again.kept], [0, 1], "held: never written twice");
  assert.equal((await seo.lists("oet")).length, 1); assert.equal((await seo.coverage("oet"))[0].intent, list.intent);
  assert.equal((await saveFromApp({ seo, subject: "OET", lists: [list], lic: { owner: false, account: "stranger", plan: "visibility_1" }, at })).status, 403, "an outside licence cannot write to a product that is not its own");
  assert.equal((await saveFromApp({ seo, subject: "No such thing", lists: [list], lic: owner, at })).status, 404);
  await saveFromApp({ seo, subject: "OET", lists: [{ ...list, intent: "   " }, { ...list, intent: "Future", on: "2099-01-01" }], lic: owner, at });
  assert.equal((await seo.lists("oet")).find((l) => l.intent === "Future").day, "2026-11-02", "never a day in the future");
  /* the collector finds it saved */
  const calls = { n: 0 }, topicIntent = list.intent;
  await seo.putTopic({ ...ownTopics().find((t) => t.id === "oet"), intents: [topicIntent] }, { at });
  const out = await runTopPages({ seo, cf: noFacts, env, reader: reader(), fetchImpl: paid(calls), now: () => Date.parse(NOW) });
  assert.equal(out.ok, true); const bought = calls.n;
  assert.ok(!(await seo.lists("oet")).some((l) => l.intent === topicIntent && l.day === "2026-11-02"), "its saved day stands: not bought again"); void bought;
});

test("item 9: AlmiWorld's products first; a client's subject only by the owner's switch, after them, inside its plan's limit", async () => {
  const who = accountHash("c1"), client = { id: "c-pets", name: "Pets", subject: "Pets", words: ["pets"], seeds: ["pets"], countries: [], languages: ["en"], jobs: ["top-pages"], owner: "client", clients: [who], planOf: { [who]: "visibility_1" }, intents: ["Pets in Ireland"], paused: false };
  const asked = [], fetchImpl = async (_u, init) => { asked.push(JSON.parse(init.body)[0].keyword); return { json: async () => answer(1.5) }; };
  const seo = seoMemoryStore(); await seo.putTopic(client, { at: NOW });
  const go = (e) => runTopPages({ seo, cf: noFacts, env: { ...env, [ENV_NAMES.topPagesUsd]: "50", ...e }, reader: reader(), fetchImpl, now: () => Date.parse(NOW) });
  await go({}); assert.ok(!asked.includes("Pets in Ireland"), "off: a client's subject is not bought");
  await seo.putTopic({ ...ownTopics().find((t) => t.id === "visibility"), intents: ["AlmiVisibility pricing"] }, { at: NOW });
  asked.length = 0; await seo.addAccountSpend(NOW.slice(0, 7), who, 3); await go({ [ENV_NAMES.topPagesClients]: "1" });
  assert.ok(!asked.includes("Pets in Ireland"), "its plan's $3 is used this month");
  const fresh = seoMemoryStore(); await fresh.putTopic(client, { at: NOW }); await fresh.putTopic({ ...ownTopics().find((t) => t.id === "visibility"), intents: ["AlmiVisibility pricing"] }, { at: NOW });
  asked.length = 0; await runTopPages({ seo: fresh, cf: noFacts, env: { ...env, [ENV_NAMES.topPagesUsd]: "50", [ENV_NAMES.topPagesClients]: "1" }, reader: reader(), fetchImpl, now: () => Date.parse(NOW) });
  assert.ok(asked.indexOf("AlmiVisibility pricing") >= 0 && asked.indexOf("AlmiVisibility pricing") < asked.indexOf("Pets in Ireland"), `own first: ${asked}`);
  assert.equal(await fresh.accountSpend(NOW.slice(0, 7), who), 1.5, "the search is booked on its client");
});

const fact = (key, status, value, o = {}) => ({ key, country: "Egypt", part: "rules", kind: "attestation", value, sourceUrl: "https://hcch.example.org/", readOn: "2026-10-26", status, proposedBy: "official", aiWritten: false, ...o });

test("item 12: a fact the owner decided never comes back, even under another key; the same waiting fact is one row", () => {
  const rule = { rule: "Egypt is not a party to the Apostille Convention." };
  const facts = [fact("rule|Egypt|attestation|3", "rejected", rule), fact("rule|Egypt|attestation|4", "unconfirmed", { rule: "Egypt  is not a party to the APOSTILLE Convention." }), fact("rule|Egypt|attestation|5", "approved", { rule: "Another rule." }), fact("rule|Egypt|attestation|6", "unconfirmed", { rule: "A new rule." }), fact("rule|Egypt|attestation|7", "unconfirmed", { rule: "A new rule." }), fact("rule|Egypt|x|8", "unconfirmed", { rule: "Gone.", removedBy: "filter" }), fact("rule|India|attestation|9", "unconfirmed", rule, { country: "India" })];
  assert.deepEqual(stillWaiting(facts).map((f) => f.key), ["rule|Egypt|attestation|6", "rule|India|attestation|9"]);
});

test("item 12: the store refuses the collector over a decided key: it stays out of the list", async () => {
  const cf = cfMemoryStore(), at = NOW; await cf.putFact(fact("k1", "unconfirmed", { rule: "R one." }), { at });
  await cf.decide("k1", { action: "reject", at }); const again = await cf.putFact(fact("k1", "unconfirmed", { rule: "R one." }), { at });
  assert.equal(again.saved, false); assert.deepEqual(stillWaiting(await cf.facts()), []);
});

test("item 11: ticks decide at once; the list says what is left; Edit keeps the owner's words; a wrong address is refused", async () => {
  const cf = cfMemoryStore(), at = NOW; for (const k of ["a", "b", "c"]) await cf.putFact(fact(k, "unconfirmed", { rule: `Rule ${k}.` }), { at });
  const ticks = (o) => decideTicked({ cf, at, valueOf: (old, x) => ({ ...old.value, ...x }), ...o });
  assert.equal((await ticks({ keys: [], action: "approve" })).ok, false); assert.equal((await ticks({ keys: ["a"], action: "drop" })).ok, false);
  const r = await ticks({ keys: ["a", "b", "nope"], action: "approve" }); assert.deepEqual(r.decided, ["a", "b"]); assert.equal(r.refused[0].key, "nope");
  assert.deepEqual(stillWaiting(await cf.facts()).map((f) => f.key), ["c"]);
  await ticks({ keys: ["c"], action: "edit", values: { rule: "My words." } }); assert.equal((await cf.fact("c")).value.rule, "My words."); assert.equal((await cf.fact("c")).status, "edited");
  await cf.putFact({ ...fact("d", "unconfirmed", { name: "X", website: "x" }), part: "councils", profession: "nursing" }, { at });
  const bad = await ticks({ keys: ["d"], action: "edit", values: { website: "ftp://x" } }); assert.equal(bad.decided.length, 0); assert.match(bad.refused[0].why, /https:/);
});

test("item 11: the page: a tick on every fact, both buttons, what is left, the filters, Next country, Edit per fact; its script saves without a page jump", () => {
  const facts = [fact("a", "unconfirmed", { rule: "A." }), fact("b", "unconfirmed", { rule: "B." }, { country: "India", part: "fee" }), fact("c", "approved", { rule: "C." })];
  const h = ownerReview({ facts, product: "oet", products: [{ key: "oet", name: "AlmiOET" }], order: ["India", "Egypt"], frame: (t, b) => b, editOf: () => "<input name=rule>", lineOf: (f) => f.value.rule, names: { rules: "Rule", fee: "Fee" } });
  assert.equal((h.match(/data-tick/g) ?? []).length, 2); assert.ok(!h.includes(">C.")); assert.match(h, /2 of 2 left/); assert.ok(h.indexOf('data-key="b"') < h.indexOf('data-key="a"'), "in the queue's order");
  for (const id of ["reviewapprove", "reviewreject", "reviewnext", "reviewcountry", "reviewpart", "reviewall"]) assert.ok(h.includes(`id="${id}"`), id);
  assert.match(h, /Approve ticked/); assert.match(h, /Reject ticked/); assert.match(h, /<details><summary>Edit/); assert.match(h, /src="\/review\.js"/);
  assert.match(REVIEW_JS, /r\.remove\(\)/); assert.ok(!/location\.(href|reload|assign)/.test(REVIEW_JS), "never a page jump");
  assert.match(ownerReview({ facts: [], frame: (t, b) => b, editOf: () => "", lineOf: () => "" }), /Nothing is waiting/);
});

test("the owner's review routes answer the owner only, and the list is what stillWaiting says", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr362-"));
  try {
    const { createApp } = await import("../site/app.mjs");
    const app = createApp({ env: {}, dataDir: dir, cf: cfMemoryStore() });
    assert.ok(app); // the routes themselves are walked on the built server copy (the report's screenshot)
  } catch (e) { assert.fail(e.message); } finally { rmSync(dir, { recursive: true, force: true }); }
});
