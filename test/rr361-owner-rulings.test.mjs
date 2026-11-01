/**
 * 🔴 OWNER'S RULINGS AFTER RR-360 (1 Nov 2026), server and website, one test per ruling:
 *   1 the top-pages collector: AlmiWorld's own products only, AlmiOET first, a TOTAL $50, "spent / $50" on the owner's page;
 *   2 outside clients get finished pages only — no keyword, volume, list, coverage or raw data ever leaves the server for them;
 *   3 no customer-facing page names where AlmiWorld's data comes from (the owner's own pages may);
 *   4 the public keyword finder shows visitors nothing: the free score instead.
 * A stand-in DataForSEO of its documented shape: no real paid search. A throwaway signing key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createServer } from "node:http";
import { createApp } from "../site/app.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { ENV_NAMES, topPagesBudget, spendLedger, allTopics, registerClient, planLimits, clientPagesOf, ownWordsQuestion, TOP_PAGES_JOB } from "../site/almiseo.mjs";
import { runTopPages } from "../site/top-pages.mjs";
import { licenceBytes, OWNER } from "../desktop/licence.mjs";
import { LICENCE_HEADER, licenceHeaderOf } from "../desktop/keyword-service.mjs";
import * as P from "../site/pages.mjs";
import { loadLegal, renderLegal } from "../site/legal.mjs";
import { readFileSync } from "node:fs";

const K = (() => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey }; })();
const signed = (licence) => ({ licence, signature: sign(null, licenceBytes(licence), K.priv).toString("base64") });
const OWNER_L = signed({ account: "av_owner_test0000000000000000", kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: "2026-10-26T00:00:00.000Z" });
const CLIENT_L = signed({ account: "av_client_test000000000000000", plan: "visibility_5", status: "ACTIVE", periodEnd: "2026-12-20T00:00:00.000Z", issuedAt: "2026-10-26T00:00:00.000Z" });
const NOW = Date.parse("2026-11-01T10:00:00Z"), now = () => NOW, DAY = "2026-11-01", AT = "2026-11-01T10:00:00.000Z", OFFICIAL = "https://www.oet.com/x";
/* words a client must never see: what the keyword data and the coverage data hold */
const KEYWORD = "oet fee pakistan", ROWKEY = "how much is oet", COVER = "Secret coverage topic", WORDING = "oet price in rupees";
const SOURCE_NAMES = /Google Ads|Keyword Planner|DataForSEO|Ads API|search volumes?|keyword volumes?|Google keyword|Google data|Google[’']s (own )?(search|monthly)|search figures?/i;

async function world() {
  const db = memoryStore(), cf = cfMemoryStore(), seo = seoMemoryStore();
  await db.saveFetch({ unitId: null, kind: "collector", group: "product:oet", seedKey: "s", location: "ALL", language: "en", day: DAY, at: AT, period: null, ops: 1, rows: [{ text: ROWKEY, said: 500 }] });
  const put = (f) => cf.putFact({ proposedBy: "official", aiWritten: false, readOn: DAY, sourceUrl: OFFICIAL, status: "confirmed", ...f }, { at: AT });
  await put({ key: "fee|Pakistan", country: "Pakistan", part: "fee", kind: "fee", value: { official: "AUD 587", line: "The full test costs AUD 587 (about PKR 100,000).", local: "PKR 100,000", currency: "PKR", amount: 100000 } });
  await put({ key: "centres|Pakistan", country: "Pakistan", part: "centres", kind: "venue", value: { venue: true, home: null, nearest: [] } });
  for (const [p, name, web] of [["nursing", "Pakistan Nursing Council", "https://pnc.org.pk"], ["medicine", "Pakistan Medical and Dental Council", "https://pmdc.pk"]]) await put({ key: `council|Pakistan|${p}`, country: "Pakistan", profession: p, part: "councils", kind: "council", value: { name, website: web, siteCheck: "read" }, sourceUrl: web });
  await put({ key: "rule|Pakistan|1", country: "Pakistan", part: "rules", kind: "rule", value: { rule: "A good-standing letter is asked for.", quote: "good standing" } });
  await put({ key: "q|Pakistan|fees", country: "Pakistan", part: "questions", kind: "question", value: { group: "fees", question: WORDING, answer: "AUD 587, on OET's own page.", answerKind: "official", pageable: true, volume: 800, keywords: [KEYWORD], asked: [{ text: KEYWORD, source: "keywords" }] } });
  await put({ key: "q|Pakistan|other", country: "Pakistan", part: "questions", kind: "question", value: { group: "other", question: "cheap oet coaching lahore", answer: "General guidance.", answerKind: "guidance", pageable: false, keywords: ["cheap oet coaching lahore"] } });
  await seo.putCoverage({ topic: "oet", intent: "OET in Pakistan", day: DAY, coverage: [{ topic: COVER }], second: [], read: ["https://a.example/1"] });
  return { db, cf, seo };
}
const kvMap = () => { const m = new Map(); return async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") { m.delete(k); return { result: 1 }; } if (C === "INCR" || C === "DECR") { const v = Number(m.get(k) ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; } if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { result: null }; }) }); };
const ENV = (more = {}) => ({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", LICENCE_PUBLIC_KEY: K.pub, CRON_SECRET: "x".repeat(20), GOOGLE_ADS_DEVELOPER_TOKEN: "t", ...more });
const serve = async (w, { mode = "sales", env = {}, ...o } = {}) => { const s = createServer(createApp({ mode, env: ENV(env), kvFetch: kvMap(), kwStore: w.db, cfStore: w.cf, seoStore: w.seo, now, ...o })); await new Promise((r) => s.listen(0, "127.0.0.1", r)); return { url: `http://127.0.0.1:${s.address().port}/`, close: () => new Promise((r) => s.close(r)) }; };

/* ── RULING 1 ── */
const TP = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "login-name", [ENV_NAMES.dfsPassword]: "pass-word" };
const answer = (k, cost = 0.002) => ({ status_code: 20000, tasks: [{ status_code: 20000, cost, result: [{ items: [{ type: "organic", url: "https://a.example/one", title: `${k} one` }] }] }] });
const reader = () => { let n = 0; return { requests: () => n, raw: async () => { n++; return "<main><h2>How much is the exam fee?</h2></main>"; } }; };
test("RULING 1: the TOTAL budget stops the collector by itself, whatever the day; a search that could pass it is not sent; spent / $50 is measured from what was charged", async () => {
  const w = await world(); let n = 0; const fetchImpl = async (u, init) => { n++; return { json: async () => answer(JSON.parse(init.body)[0].keyword, 0.01) }; };
  await w.seo.addSpend("2026-10-01", TOP_PAGES_JOB, { usd: 49.985, units: 9000 }); // the account's earlier days count
  const r = await runTopPages({ seo: w.seo, cf: w.cf, env: TP, reader: reader(), fetchImpl, now });
  assert.equal(n, 1, "one search of $0.01 fits; the next would pass $50 and is never sent"); assert.equal(r.stoppedBy, "BUDGET"); assert.match(r.why, /budget is spent \(\$50 in total\)/);
  const b = await topPagesBudget({ seo: w.seo, env: TP }); assert.equal(b.spent, 49.995); assert.match(b.line, /^DataForSEO: \$(49\.99|50\.00) spent \/ \$50$/);
  const again = await runTopPages({ seo: w.seo, cf: w.cf, env: TP, reader: reader(), fetchImpl, now: () => NOW + 864e5 });
  assert.equal(n, 1, "a new day buys nothing: the total is spent"); assert.equal(again.stoppedBy, "BUDGET");
});
test("RULING 1: each search is booked the moment it is charged: a run that dies later forgets nothing", async () => {
  const w = await world(), bad = { requests: () => 0, raw: async () => { throw new Error("the page read died"); } };
  await assert.rejects(Promise.resolve().then(async () => { const seo = { ...w.seo, putPage: async () => { throw new Error("the store died"); } }; await runTopPages({ seo, cf: w.cf, env: TP, reader: { ...reader(), ...bad, raw: async () => "<main></main>" }, fetchImpl: async (u, init) => ({ json: async () => answer(JSON.parse(init.body)[0].keyword) }), now }); }), /the store died/);
  assert.equal((await topPagesBudget({ seo: w.seo, env: TP })).spent, 0.002);
});
test("RULING 1: AlmiWorld's own products only, AlmiOET first; a client's topic and the owner's own ideas never spend it", async () => {
  const w = await world(), asked = [];
  await registerClient({ seo: w.seo, subject: "Pet Insurance", intents: ["pet insurance page"], lic: { owner: false, account: "c", plan: "visibility_5" }, limits: await planLimits(w.seo), at: AT });
  await w.seo.putTopic({ id: "t-idea", name: "Idea", subject: "Idea", words: ["idea"], seeds: ["idea"], owner: "owner", jobs: ["top-pages"], intents: ["an idea page"], paused: false }, { at: AT });
  await w.seo.putTopic({ id: "cv", intents: ["cv page"] }, { at: AT }); await w.seo.putTopic({ id: "oet", intents: ["oet page"] }, { at: AT });
  await runTopPages({ seo: w.seo, cf: w.cf, env: TP, reader: reader(), fetchImpl: async (u, init) => { asked.push(JSON.parse(init.body)[0].keyword); return { json: async () => answer("x") }; }, now });
  assert.ok(asked.includes("cv page") && asked.includes("oet page")); assert.ok(asked.indexOf("oet page") < asked.indexOf("cv page"), "AlmiOET first");
  assert.ok(!asked.includes("pet insurance page") && !asked.includes("an idea page"), JSON.stringify(asked));
});
test("RULING 1: spent / $50 stands on the owner's page and in the ledger", async () => {
  const w = await world(); await w.seo.addSpend(DAY, TOP_PAGES_JOB, { usd: 12.5, units: 6250 });
  const budget = await topPagesBudget({ seo: w.seo, env: TP }), ledger = await spendLedger({ cf: w.cf, seo: w.seo, env: TP, now });
  assert.equal(ledger.budget.line, "DataForSEO: $12.50 spent / $50"); assert.match(ledger.jobs[1].cap, /^\$50 in total, \$1 a day/);
  assert.match(P.ownerAlmiSeo({ budget, ledger }), /id="dfsbudget"><b>DataForSEO: \$12\.50 spent \/ \$50<\/b>/);
  assert.match(P.ownerMenu("almiseo", { keywordsToday: 0, dataForSeo: budget.line }), /DataForSEO: \$12\.50 spent \/ \$50/);
});

/* ── RULING 2 ── */
test("RULING 2: an outside client's whole answer holds no keyword, volume, list, coverage or raw value — only finished page content, each question in our own words", async () => {
  const w = await world(), s = await serve(w);
  try {
    const get = (part) => fetch(`${s.url}v1/almiseo?subject=OET&part=${part}`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(CLIENT_L) } });
    for (const part of ["keywords", "questions", "countries", "plan", "coverage"]) { const r = await get(part); assert.equal(r.status, 403, part); assert.match((await r.json()).why, /finished pages/); }
    const sum = await (await get("summary")).json(), kit = await (await get("pages")).json(), all = JSON.stringify([sum, kit]);
    assert.equal(sum.outside, true); assert.equal(sum.pages, 1); assert.deepEqual(Object.keys(sum).sort(), ["ok", "on", "outside", "pages", "subject", "topic"]);
    for (const word of [KEYWORD, ROWKEY, WORDING, COVER, '"volume"', '"keywords"', '"asked"', '"wordings"', '"pageable"', "cheap oet coaching", '"status"', '"coverage"']) assert.ok(!all.includes(word), `the client's answer holds "${word}"`);
    const q = kit.countries.Pakistan.parts.questions;
    assert.equal(q.length, 1, "a guidance answer makes no page"); assert.equal(q[0].value.question, ownWordsQuestion("fees", { subject: "OET", country: "Pakistan" })); assert.equal(q[0].value.question, "How much does OET cost in Pakistan?");
    assert.equal(q[0].value.answer, "AUD 587, on OET's own page."); assert.equal(q[0].source, OFFICIAL); assert.equal(q[0].readOn, DAY);
    assert.equal(kit.plan[0].title, "OET in Pakistan"); assert.equal(kit.plan.length, 1);
    assert.deepEqual(kit.countries.Pakistan.parts.fee[0].value, { text: "The full test costs AUD 587 (about PKR 100,000)." });
    assert.ok(kit.countries.Pakistan.parts.councils.some((c) => c.value.name === "Pakistan Nursing Council"));
    /* AlmiWorld's own licence still reads everything */
    const own = await (await fetch(`${s.url}v1/almiseo?subject=OET&part=keywords`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(OWNER_L) } })).json();
    assert.equal(own.rows[0].k, ROWKEY);
  } finally { await s.close(); }
});
test("RULING 2: registering tells an outside client nothing but that it started; Google is never asked for its subject", async () => {
  const w = await world(), s = await serve(w);
  try {
    const r = await fetch(`${s.url}v1/almiseo/topic`, { method: "POST", headers: { "content-type": "application/json", [LICENCE_HEADER]: licenceHeaderOf(CLIENT_L) }, body: JSON.stringify({ subject: "Pet Insurance" }) }), j = await r.json();
    assert.deepEqual(Object.keys(j).sort(), ["joined", "ok", "started"]);
    const none = await (await fetch(`${s.url}v1/almiseo?subject=Pet%20Insurance&part=summary`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(CLIENT_L) } })).json();
    assert.equal(none.outside, true); assert.equal(none.pages, 0);
    const { groupsForTopics } = await import("../site/almiseo.mjs");
    assert.deepEqual(groupsForTopics({ topics: await allTopics({ seo: w.seo }) }), [], "no Google request for a client's topic");
  } finally { await s.close(); }
});
test("RULING 2: a client's pages are built from checked facts only", async () => {
  const w = await world(), topic = (await allTopics({ seo: w.seo })).find((t) => t.id === "oet"), kit = clientPagesOf({ topic, facts: await w.cf.facts() });
  assert.ok(!JSON.stringify(kit).includes("good standing"), "a rule's quote stays behind"); assert.equal(kit.countries.Pakistan.parts.rules[0].value.text, "A good-standing letter is asked for.");
});

/* ── RULING 3 + 4: every public page, for real, through the handler ── */
const publicPages = () => ["/", "/pricing", "/download", "/privacy", "/terms", ...Object.keys(P.HELP)];
test("RULING 3: no customer-facing page of the website says where AlmiWorld's data comes from", async () => {
  const w = await world(), s = await serve(w, { env: { VISIBILITY_SETUP_URL: "https://blob.example/AlmiVisibility-Setup.exe" } });
  try {
    for (const path of publicPages()) {
      const r = await fetch(s.url + path.slice(1)), t = await r.text(); assert.equal(r.status === 200 || r.status === 404, true, `${path}: ${r.status}`);
      const hit = SOURCE_NAMES.exec(t.replace(/Google Ads, only if you connect your own account|your own Google Ads account/g, ""));
      assert.equal(hit?.[0] ?? null, null, `${path} names "${hit?.[0]}": …${hit ? t.slice(Math.max(0, hit.index - 60), hit.index + 60) : ""}…`);
    }
    assert.ok(!/Real Google data/.test(await (await fetch(s.url)).text()), "the home's claim about our data");
  } finally { await s.close(); }
});
test("RULING 3: the legal pages say it too, and the owner's Word file stays pinned as it was", () => {
  const L = loadLegal(), both = JSON.stringify([L.privacy, L.terms]);
  assert.match(L.source.sha256, /^[0-9a-f]{64}$/);
  assert.ok(!/through AlmiWorld’s own Google Ads account|free keyword finder/.test(both), "the old sentence"); assert.match(both, /only if you connect your own account/);
  assert.ok(!SOURCE_NAMES.test(renderLegal(L.privacy).replace(/Google Ads, only if you connect your own account/g, "")));
});
test("RULING 4: a visitor gets no keyword finder and no keyword data: the free score instead; the old addresses show nothing", async () => {
  const w = await world(), s = await serve(w);
  try {
    const home = await (await fetch(s.url)).text();
    assert.ok(!/id="keywords"|<form[^>]*kwform|action="\/keywords|keyword finder|keywords\.csv/i.test(home), "the form or its name"); assert.match(home, /Get my free site score/);
    const post = await fetch(`${s.url}keywords`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `q=${encodeURIComponent(ROWKEY)}&location=ALL` }); assert.equal(post.status, 303);
    const csv = await fetch(`${s.url}keywords.csv?q=oet&location=ALL`, { redirect: "manual" }); assert.equal(csv.status, 303); assert.ok(!(await csv.text()).includes(ROWKEY));
  } finally { await s.close(); }
  assert.ok(!readFileSync(new URL("../tools/bundle-site.mjs", import.meta.url), "utf8").includes("finderPublicForOldTests"), "no live function ever opens it");
});
