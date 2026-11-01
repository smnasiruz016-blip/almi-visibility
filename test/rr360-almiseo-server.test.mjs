/**
 * 🔴 RR-360 · ALMISEO DATA ON THE SERVER (owner, 1 Nov 2026, ruling R13): the collectors connected to the app for every client — the store, the routes,
 * the isolation, the terms' switches, the top-pages collector, the findings, the spend ledger, the plans' limits, the owner's page.
 * A throwaway signing key; the store and the collectors' facts are made here. No network, no real key, no real paid search.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createApp } from "../site/app.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { seoMemoryStore, seoPgStore } from "../site/almiseo-store.mjs";
import { almiSeoAnswer, parseTopicLine, topicForSubject, allTopics, ownTopics, registerClient, planLimits, DEFAULT_PLAN_LIMITS, clientTopicsToWork, queueWithClients, groupsForTopics, syncFindings, alertChanged, spendLedger, collectorPlan, counterTotal, keywordsAllowed, ENV_NAMES, KEYWORDS_OFF_LINE, questionBank, accountHash, LIVE_JOBS } from "../site/almiseo.mjs";
import { runTopPages, pageStructure, walled, topPagesConnected, intentsOf } from "../site/top-pages.mjs";
import { unitsOf } from "../site/kw-seeds.mjs";
import { DEFAULT_QUEUE, orderWork } from "../site/queue.mjs";
import { licenceBytes, OWNER } from "../desktop/licence.mjs";
import { LICENCE_HEADER, licenceHeaderOf } from "../desktop/keyword-service.mjs";
import { setClientTemplates } from "../desktop/product-facts.mjs";
import { almiSeoClient, syncProduct } from "../desktop/almiseo.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const K = (() => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey }; })();
const signed = (licence) => ({ licence, signature: sign(null, licenceBytes(licence), K.priv).toString("base64") });
const OWNER_L = signed({ account: "av_owner_test0000000000000000", kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: "2026-10-26T00:00:00.000Z" });
const CLIENT_L = signed({ account: "av_client_test000000000000000", plan: "visibility_5", status: "ACTIVE", periodEnd: "2026-12-20T00:00:00.000Z", issuedAt: "2026-10-26T00:00:00.000Z" });
const NOW = Date.parse("2026-11-01T10:00:00Z"), now = () => NOW, DAY = "2026-11-01", AT = "2026-11-01T10:00:00.000Z";
const OFFICIAL = "https://www.oet.com/x";
const kvMap = () => { const m = new Map(); const kvFetch = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") { m.delete(k); return { result: 1 }; } if (C === "INCR" || C === "DECR") { const v = Number(m.get(k) ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { result: null }; }) }); return { kvFetch, kv: { run: async (cmds) => (await (await kvFetch("", { body: JSON.stringify(cmds) })).json()).map((x) => x.result) } }; };

/* a subject with facts: Pakistan all five parts, a council per profession, a question group; another subject's keywords beside it */
async function world() {
  const db = memoryStore(), cf = cfMemoryStore(), seo = seoMemoryStore();
  const fetch1 = (group, location, rows, day = DAY) => db.saveFetch({ unitId: null, kind: "collector", group, seedKey: `seeds:${group}:${location}`, location, language: "en", day, at: AT, period: null, ops: 1, rows });
  await fetch1("product:oet", "ALL", [{ text: "oet exam", said: 9000 }, { text: "how much is oet", said: 500 }, { text: "ielts band score", said: 99999 }]);
  await fetch1("product:oet", "PK", [{ text: "oet in pakistan", said: 800 }, { text: "oet exam", said: 300 }]);
  await fetch1("product:prep", "ALL", [{ text: "ielts practice", said: 70000 }]);
  const put = (f) => cf.putFact({ proposedBy: "official", aiWritten: false, readOn: DAY, sourceUrl: OFFICIAL, status: "confirmed", ...f }, { at: AT });
  await put({ key: "fee|Pakistan", country: "Pakistan", part: "fee", kind: "fee", value: { official: "AUD 587", line: "AUD 587 (about PKR 100,000)", local: "PKR 100,000", currency: "PKR", amount: 100000 } });
  await put({ key: "centres|Pakistan", country: "Pakistan", part: "centres", kind: "venue", value: { venue: true, home: null, nearest: [] } });
  for (const [p, name, web] of [["nursing", "Pakistan Nursing Council", "https://pnc.org.pk"], ["medicine", "Pakistan Medical and Dental Council", "https://pmdc.pk"]]) await put({ key: `council|Pakistan|${p}`, country: "Pakistan", profession: p, part: "councils", kind: "council", value: { name, website: web, siteCheck: "read" }, sourceUrl: web });
  await put({ key: "rule|Pakistan|good-standing|1", country: "Pakistan", part: "rules", kind: "good standing", value: { rule: "A good-standing letter is asked for.", quote: "good standing" } });
  await put({ key: "q|Pakistan|fees", country: "Pakistan", part: "questions", kind: "question", value: { group: "fees", question: "How much does OET cost in Pakistan?", answer: "AUD 587.", answerKind: "official", pageable: true, volume: 800, keywords: ["oet fee pakistan"], asked: [{ text: "oet fee pakistan", source: "keywords" }] } });
  await put({ key: "unconfirmed|Pakistan", country: "Pakistan", part: "rules", kind: "x", value: { rule: "An unchecked rule." }, status: "unconfirmed" });
  await cf.putQuestions({ product: "oet", country: "Pakistan", source: "owner", items: [{ text: "can a nurse take oet twice?" }], at: AT });
  await cf.putQuestions({ product: "prep", country: "Pakistan", source: "owner", items: [{ text: "is ielts harder?" }], at: AT });
  return { db, cf, seo, stores: { db, cf, seo } };
}
const OWNER_LIC = { ok: true, owner: true, account: "o", plan: OWNER.plan, limit: null }, CLIENT_LIC = { ok: true, owner: false, account: "c", plan: "visibility_5", limit: 1000 };

test("A: ALL the subject's keywords by relevance with volumes — its OWN subject only; question-type keywords are marked", async () => {
  const w = await world(), a = await almiSeoAnswer({ part: "keywords", subject: "OET", lic: OWNER_LIC, stores: w.stores, now });
  assert.deepEqual(a.rows.map((r) => r.k), ["oet exam", "oet in pakistan", "how much is oet"]); // most searched first; "ielts band score" and another group's never
  assert.equal(a.total, 3); assert.equal(a.rows[0].v, 9000);
  assert.equal(a.rows.find((r) => r.k === "how much is oet").q, 1);
  assert.equal(a.rows.find((r) => r.k === "oet exam").l, 2, "the number of places it was asked in");
  const other = await almiSeoAnswer({ part: "keywords", subject: "IELTS", lic: OWNER_LIC, stores: w.stores, now });
  assert.deepEqual(other.rows.map((r) => r.k), ["ielts practice"], "its own group only: \"ielts band score\" was asked for AlmiOET and stays out of both");
});
test("A: the keywords come in pages until the whole list is read — never a sample", async () => {
  const db = memoryStore(), rows = Array.from({ length: 12345 }, (_, i) => ({ text: `oet word ${i}`, said: i }));
  await db.saveFetch({ unitId: null, kind: "collector", group: "product:oet", seedKey: "s", location: "ALL", language: "en", day: DAY, at: AT, ops: 1, rows });
  const stores = { db, cf: cfMemoryStore(), seo: seoMemoryStore() };
  const first = await almiSeoAnswer({ part: "keywords", subject: "OET", lic: OWNER_LIC, stores, now }), got = [...first.rows];
  assert.equal(first.pages, 3);
  for (let p = 1; p < first.pages; p++) got.push(...(await almiSeoAnswer({ part: "keywords", subject: "OET", page: p, lic: OWNER_LIC, stores, now })).rows);
  assert.equal(got.length, 12345); assert.equal(new Set(got.map((r) => r.k)).size, 12345); assert.equal(got[0].v, 12344);
});
test("A: the subject decides the topic: exact words only, no guess; unknown subject → nothing, and never another's data", async () => {
  const w = await world(), topics = await allTopics({ seo: w.seo });
  assert.equal(topicForSubject("OET", topics).id, "oet"); assert.equal(topicForSubject("oet", topics).id, "oet"); assert.equal(topicForSubject("AlmiOET", topics).id, "oet");
  assert.equal(topicForSubject("oet coaching", topics), null); assert.equal(topicForSubject("pet insurance", topics), null);
  const a = await almiSeoAnswer({ part: "summary", subject: "pet insurance", lic: OWNER_LIC, stores: w.stores, now });
  assert.equal(a.topic, null); assert.match(a.line, /holds nothing about "pet insurance"/);
});
test("A: the country facts carry all five parts and their review state — only checked facts; unconfirmed ones only as a count", async () => {
  const w = await world(), a = await almiSeoAnswer({ part: "countries", subject: "OET", lic: OWNER_LIC, stores: w.stores, now }), p = a.countries.Pakistan;
  assert.equal(p.complete, true); assert.deepEqual(p.missing, []);
  assert.equal(p.fee.value.official, "AUD 587"); assert.equal(p.fee.status, "confirmed");
  assert.ok(p.councils.nursing.found); assert.equal(p.waitingReview, 1);
  assert.ok(!JSON.stringify(p).includes("An unchecked rule"), "an unconfirmed fact never travels");
});
test("A: the plan equals the owner's page counter (the same facts, the same rules) and has no second page for one thing", async () => {
  const w = await world(), a = await almiSeoAnswer({ part: "plan", subject: "OET", lic: OWNER_LIC, stores: w.stores, now });
  assert.equal(a.pages.length, a.counter); assert.equal(a.pages.length, 4);
  assert.deepEqual(a.pages.map((p) => p.kind).sort(), ["country", "country-profession", "country-profession", "question"]);
  assert.equal(new Set(a.pages.map((p) => p.title)).size, a.pages.length);
});
test("A/F: ONE question bank — the groups answered and every stored question holding this subject's words; another subject's never", async () => {
  const w = await world(), b = await questionBank({ cf: w.cf, topic: (await allTopics({ seo: w.seo })).find((t) => t.id === "oet") });
  assert.equal(b.groups[0].question, "How much does OET cost in Pakistan?"); assert.equal(b.groups[0].answerKind, "official");
  assert.deepEqual(b.asked.map((q) => q.text), ["can a nurse take oet twice?"]);
});
test("TERMS: an outside client gets no keyword from Google — not the words, not the volumes, not inside a question group; the rest it gets", async () => {
  const w = await world(), env = {};
  assert.equal(keywordsAllowed(OWNER_LIC, env), true); assert.equal(keywordsAllowed(CLIENT_LIC, env), false); assert.equal(keywordsAllowed(CLIENT_LIC, { [ENV_NAMES.keywordsForClients]: "1" }), true);
  const k = await almiSeoAnswer({ part: "keywords", subject: "OET", lic: CLIENT_LIC, stores: w.stores, env, now });
  assert.deepEqual(k.rows, []); assert.equal(k.total, 0); assert.equal(k.line, KEYWORDS_OFF_LINE);
  const q = await almiSeoAnswer({ part: "questions", subject: "OET", lic: CLIENT_LIC, stores: w.stores, env, now });
  assert.ok(q.groups.length); assert.ok(!JSON.stringify(q).includes("oet fee pakistan"), "a group's wordings are Google's words"); assert.ok(!("volume" in q.groups[0]));
  const c = await almiSeoAnswer({ part: "countries", subject: "OET", lic: CLIENT_LIC, stores: w.stores, env, now });
  assert.equal(c.countries.Pakistan.complete, true);
  assert.ok(!JSON.stringify(c).includes("oet fee pakistan"), "the country packets carry no keyword from Google either");
  const s = await almiSeoAnswer({ part: "summary", subject: "OET", lic: CLIENT_LIC, stores: w.stores, env, now });
  assert.equal(s.keywords.allowed, false); assert.equal(s.keywords.total, 0);
});
test("B: a client's product starts the collectors on its subject, in the same queue; the same subject of two clients is ONE topic; never Google for it unless the switch is on", async () => {
  const seo = seoMemoryStore(), limits = await planLimits(seo);
  const r = await registerClient({ seo, subject: "Pet Insurance", name: "PetCo", seeds: ["vet cost"], lic: CLIENT_LIC, limits, at: AT });
  assert.equal(r.ok, true); assert.equal(r.started, true);
  const again = await registerClient({ seo, subject: "pet insurance", lic: { ...CLIENT_LIC, account: "c2" }, limits, at: AT });
  assert.equal(again.joined, true); assert.equal(again.topic.id, r.topic.id);
  const topics = await allTopics({ seo }), t = topics.find((x) => x.id === r.topic.id);
  assert.equal(t.clients.length, 2); assert.equal(t.countries.length, 5); assert.deepEqual(t.jobs, [...LIVE_JOBS]);
  const work = await clientTopicsToWork({ seo, topics, today: DAY, limits });
  assert.deepEqual(work.map((x) => x.id), [t.id]);
  const q = queueWithClients(DEFAULT_QUEUE, work);
  assert.ok(q.products.indexOf(t.id) > q.products.indexOf("oet") && q.products.indexOf(t.id) < q.products.indexOf("cv"), "after AlmiOET and AlmiVisibility");
  const units = [{ id: "a", product: t.id, country: "Pakistan" }, { id: "b", product: "cv", country: "Pakistan" }, { id: "c", product: "oet", country: "Pakistan" }];
  assert.deepEqual(orderWork(units, { queue: q }).map((u) => u.id), ["c", "a", "b"]);
  assert.deepEqual(groupsForTopics({ topics, work, clientsAllowed: false }), [], "no Google request for a client's subject while the switch is off");
  const on = groupsForTopics({ topics, work, clientsAllowed: true }); assert.equal(on[0].key, t.id);
  const us = unitsOf(on); assert.ok(us.length === 6 && us.every((u) => u.product === t.id), "All locations and its own five countries only");
});
test("B: AlmiWorld's own product is never made a client's: the subject of a product of ours joins our topic, its intents only by the owner's licence", async () => {
  const seo = seoMemoryStore(), limits = await planLimits(seo);
  const r = await registerClient({ seo, subject: "OET", intents: ["some page"], lic: CLIENT_LIC, limits, at: AT });
  assert.equal(r.topic.id, "oet"); assert.equal(r.own, true);
  assert.equal((await allTopics({ seo })).find((t) => t.id === "oet").intents, undefined, "an outsider never changes our topic");
  await registerClient({ seo, subject: "OET", intents: ["OET for Nurses"], lic: OWNER_LIC, limits, at: AT });
  assert.deepEqual((await allTopics({ seo })).find((t) => t.id === "oet").intents, ["OET for Nurses"]);
});
test("B: the plans' monthly limits are a setting with defaults; a client past its month waits; the cap is the plan's", async () => {
  const seo = seoMemoryStore(); let limits = await planLimits(seo);
  assert.deepEqual(limits.visibility_1, { ...DEFAULT_PLAN_LIMITS.visibility_1 }); assert.equal(limits.visibility_unlimited.usdMonth, 12);
  await seo.setSetting("plan-limits", { visibility_5: { usdMonth: 1, countries: 3 } }, { at: AT }); limits = await planLimits(seo);
  assert.equal(limits.visibility_5.usdMonth, 1);
  const r = await registerClient({ seo, subject: "Pet Insurance", lic: CLIENT_LIC, limits, at: AT });
  assert.equal(r.topic.countries.length, 3, "the plan's countries");
  const topics = await allTopics({ seo });
  assert.equal((await clientTopicsToWork({ seo, topics, today: DAY, limits })).length, 1);
  await seo.addAccountSpend("2026-11", accountHash("c"), 1.0);
  assert.equal((await clientTopicsToWork({ seo, topics, today: DAY, limits })).length, 0, "the month is used");
  assert.equal((await clientTopicsToWork({ seo, topics, today: "2026-12-01", limits })).length, 1, "next month it runs again");
});
test("F1: ONE topic list — the owner adds any topic in one line; nothing is tied to exams or languages", async () => {
  const p = parseTopicLine("Pet insurance | pet insurance, vet cost | Pakistan, India | keywords, questions");
  assert.equal(p.ok, true); assert.deepEqual(p.topic.seeds, ["pet insurance", "vet cost"]); assert.deepEqual(p.topic.countries, ["Pakistan", "India"]); assert.deepEqual(p.topic.jobs, ["keywords", "questions"]);
  assert.equal(parseTopicLine("App idea | budget app").ok, true);
  for (const bad of ["", "No seeds", "X | y | Atlantis", "X | y | Pakistan | astrology"]) assert.equal(parseTopicLine(bad).ok, false, bad);
  assert.equal(ownTopics().length, 24, "every product of ours is on it");
  const seo = seoMemoryStore(); await seo.putTopic(p.topic, { at: AT });
  assert.ok((await allTopics({ seo })).some((t) => t.name === "Pet insurance"));
  assert.equal(groupsForTopics({ topics: await allTopics({ seo }) })[0].key, p.topic.id, "the keyword collector reads the same list");
  /* found on the owner's page: a stored pause must not freeze an own topic's seeds */
  await seo.putTopic({ id: "oet", seeds: ["stale"], paused: true }, { at: AT });
  const live = (await allTopics({ seo, groups: [{ kind: "product", key: "oet", seeds: ["oet", "oet exam"] }] })).find((t) => t.id === "oet");
  assert.deepEqual(live.seeds, ["oet", "oet exam"]); assert.equal(live.paused, true);
});
test("F2: ONE findings store — a source link and a date are required, no repeats, a changed fee raises the flag and tells the owner by e-mail, once", async () => {
  const seo = seoMemoryStore(), cf = cfMemoryStore(), f = (official, readOn = DAY) => ({ key: "fee|Pakistan", country: "Pakistan", part: "fee", kind: "fee", value: { official, line: `${official} (about PKR ${official === "AUD 587" ? 100 : 120})`, local: "x" }, sourceUrl: OFFICIAL, readOn, status: "confirmed", proposedBy: "official" });
  await assert.rejects(seo.addFinding({ id: "x", topic: "t", job: "facts", kind: "fee", text: "t", on: DAY, value: "v" }, { at: AT }), /source link/);
  await assert.rejects(seo.addFinding({ id: "x", topic: "t", job: "facts", kind: "fee", text: "t", sourceUrl: OFFICIAL, value: "v" }, { at: AT }), /date/);
  await cf.putFact(f("AUD 587"), { at: "2026-11-01T01:00:00.000Z" });
  assert.deepEqual(await syncFindings({ seo, cf, at: "2026-11-01T02:00:00.000Z" }), { noted: 1, changed: 0 }, "the first sync only remembers");
  /* the rate moved, the official fee did not: no flag */
  await cf.putFact({ ...f("AUD 587"), value: { ...f("AUD 587").value, line: "AUD 587 (about PKR 111)" } }, { at: "2026-11-01T03:00:00.000Z" });
  assert.deepEqual(await syncFindings({ seo, cf, at: "2026-11-01T04:00:00.000Z" }), { noted: 1, changed: 0 }, "a day's exchange rate is no changed fee");
  assert.equal((await seo.findings()).length, 1, "no repeats");
  await cf.putFact(f("AUD 620", "2026-11-02"), { at: "2026-11-02T01:00:00.000Z" });
  assert.deepEqual(await syncFindings({ seo, cf, at: "2026-11-02T02:00:00.000Z" }), { noted: 1, changed: 1 });
  const [c] = await seo.findings({ changed: true });
  assert.equal(c.was, "AUD 587"); assert.equal(c.value, "AUD 620"); assert.equal(c.review, "needed"); assert.equal(c.sourceUrl, OFFICIAL); assert.equal(c.on, "2026-11-02");
  const mail = []; const env = { [ENV_NAMES.alertEmail]: "owner@example.test" };
  assert.deepEqual((await alertChanged({ seo, env, send: async (m) => { mail.push(m); return { sent: true }; }, now })).sent, 1);
  assert.equal(mail[0].to, "owner@example.test"); assert.match(mail[0].subject, /1 fact changed — review needed/); assert.match(mail[0].text, /was "AUD 587", now "AUD 620"/);
  assert.equal((await alertChanged({ seo, env, send: async (m) => { mail.push(m); return { sent: true }; }, now })).sent, 0, "told once"); assert.equal(mail.length, 1);
  /* it reaches the app's summary as "review needed" */
  const s = await almiSeoAnswer({ part: "summary", subject: "OET", lic: OWNER_LIC, stores: { db: memoryStore(), cf, seo }, now });
  assert.equal(s.review[0].now, "AUD 620");
  await seo.settleReview(c.id); assert.equal((await seo.findings({ changed: true })).length, 0);
});
test("F3: ONE spend ledger: the AI, top pages and research, each with its cap, from the same stores; the AI cap stays the one the owner set", async () => {
  const seo = seoMemoryStore(), cf = cfMemoryStore();
  await cf.addSpend(DAY, { aiUsd: 1.25, reads: 10 }); await seo.addSpend(DAY, "top-pages", { usd: 0.02, units: 10 });
  const l = await spendLedger({ cf, seo, env: { COUNTRY_FACTS_AI_USD_PER_DAY: "5" }, now });
  assert.equal(l.jobs[0].today, 1.25); assert.match(l.jobs[0].cap, /^\$5 a day/);
  assert.equal(l.jobs[1].today, 0.02); assert.match(l.jobs[1].cap, /^\$1 a day/); assert.equal(l.jobs[2].today, 0); assert.match(l.jobs[2].units, /not built yet/);
});

/* ── THE TOP-PAGES COLLECTOR ── a stand-in DataForSEO of its documented shape; no real paid search ── */
const serpAnswer = (k) => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "organic", url: "https://a.example/one", title: `${k} one` }, { type: "organic", url: "https://b.example/two", title: `${k} two` }, { type: "organic", url: "https://www.reddit.com/r/x", title: "reddit" }, { type: "people_also_ask", items: [{ title: `Is ${k} hard?` }] }] }] }] });
const PAGE = (extra = "") => `<html><head><meta property="article:modified_time" content="2026-09-01"><script>var secret = "not text";</script></head><body><nav><h2>Home</h2></nav><main><h2>How much is the exam fee?</h2><h2>Exam fee</h2><h3>Scores and grades</h3><h2>Leave a Reply</h2><h2>25% off today</h2><p>A SENTENCE OF THEIR OWN TEXT that must never be saved.</p><table></table><ul></ul>${extra}</main></body></html>`;
const standinReader = (pages) => { let n = 0; return { requests: () => n, raw: async (u) => { n++; return pages[u] ?? null; } }; };
const TP_ENV = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "login-name", [ENV_NAMES.dfsPassword]: "pass-word" };
test("C: a page's structure only: headings through the junk filter, counts, length, date — never a sentence of its text", () => {
  const s = pageStructure(PAGE(), { now: AT });
  assert.ok(s.headings.includes("How much is the exam fee?")); assert.ok(!s.headings.includes("Leave a Reply")); assert.ok(!s.headings.includes("25% off today")); assert.ok(!s.headings.includes("Home"));
  assert.deepEqual(s.questions, ["How much is the exam fee?"]); assert.equal(s.tables, 1); assert.equal(s.lists, 1); assert.equal(s.date, "2026-09-01"); assert.ok(s.words > 5);
  assert.ok(!JSON.stringify(s).includes("SENTENCE"), "their text is never in the structure"); assert.ok(!JSON.stringify(s).includes("secret"));
  assert.equal(walled('<form><input type="password"></form>'), true); assert.equal(walled("<p>Subscribe to continue reading</p>"), true); assert.equal(walled(PAGE()), false);
});
test("C: OFF until the owner's own switch AND account — no search, no read, said so", async () => {
  const w = await world(); let calls = 0;
  for (const env of [{}, { [ENV_NAMES.topPagesOn]: "1" }, { [ENV_NAMES.dfsLogin]: "a", [ENV_NAMES.dfsPassword]: "b" }]) {
    assert.equal(topPagesConnected(env), false);
    const r = await runTopPages({ seo: w.seo, cf: w.cf, env, reader: standinReader({}), fetchImpl: async () => { calls++; return {}; }, now });
    assert.equal(r.ok, false); assert.match(r.why, /off/);
  }
  assert.equal(calls, 0);
});
test("C + Part D's source: each intent once, saved with its date, reused free; a coverage list and second-search questions ready; refresh about monthly; robots-refused pages never gone around; the text never saved", async () => {
  const w = await world(), asked = []; let t = NOW;
  const fetchImpl = async (u, init) => { const body = JSON.parse(init.body)[0]; asked.push({ k: body.keyword, auth: init.headers.authorization }); return { json: async () => serpAnswer(body.keyword) }; };
  const pages = { "https://a.example/one": PAGE(), "https://b.example/two": PAGE() }; // the reddit address is never opened
  const reader = standinReader(pages), run = () => runTopPages({ seo: w.seo, cf: w.cf, env: TP_ENV, reader, fetchImpl, now: () => t });
  const r1 = await run();
  assert.equal(r1.ok, true); assert.equal(r1.searches, 4, "the 4 planned intents of AlmiOET, once each"); assert.equal(r1.stoppedBy, null);
  assert.ok(asked.some((a) => a.k === "OET in Pakistan")); assert.equal(asked[0].auth, `Basic ${Buffer.from("login-name:pass-word").toString("base64")}`);
  assert.ok(reader.requests() <= 2, "each top page read once");
  const list = (await w.seo.coverage("oet")).find((c) => c.intent === "OET in Pakistan");
  assert.ok(list.coverage.length, "a coverage list"); assert.ok(list.coverage.some((c) => /fee/i.test(c.topic))); assert.ok(!list.coverage.some((c) => /Leave a Reply|25%/.test(c.topic)));
  assert.equal(list.day, DAY); assert.ok(list.read.length === 2); assert.ok(list.second.length);
  const stored = JSON.stringify(await w.seo.pages(["https://a.example/one"]));
  assert.ok(!stored.includes("SENTENCE"), "never their text"); assert.ok(stored.includes("Scores and grades"));
  assert.ok(!JSON.stringify(await w.seo.lists("oet")).includes("SENTENCE"));
  /* the same run again: nothing bought, nothing read */
  const n = asked.length, reads = reader.requests(), r2 = await run();
  assert.equal(r2.searches, 0); assert.equal(asked.length, n); assert.equal(reader.requests(), reads);
  /* a month later: asked again */
  t = NOW + 31 * 864e5; const r3 = await run(); assert.equal(r3.searches, 4);
  /* the ledger holds what was spent */
  assert.equal((await w.seo.spend(DAY, "top-pages")).units, 4);
  /* a page that refused is saved as unread, with why */
  const w2 = await world(); await runTopPages({ seo: w2.seo, cf: w2.cf, env: TP_ENV, reader: standinReader({ "https://a.example/one": '<input type="password">' }), fetchImpl, now });
  const [a, b] = await w2.seo.pages(["https://a.example/one", "https://b.example/two"]);
  assert.equal(a.ok, false); assert.match(a.why, /login or a paywall/); assert.equal(a.structure, null); assert.equal(b.ok, false); assert.match(b.why, /never gone around/);
});
test("C + Part D's source: a list already saved is never bought again, even when its coverage list was not finished (a run stopped between)", async () => {
  const w = await world(); let n = 0;
  await w.seo.putList({ topic: "oet", intent: "OET in Pakistan", location: "United States", language: "en", day: DAY, results: [{ url: "https://a.example/one", title: "x" }], paa: ["Is OET hard?"], related: [] });
  const r = await runTopPages({ seo: w.seo, cf: w.cf, env: TP_ENV, reader: standinReader({ "https://a.example/one": PAGE() }), fetchImpl: async (u, init) => { n++; return { json: async () => serpAnswer(JSON.parse(init.body)[0].keyword) }; }, now });
  assert.equal(r.ok, true); assert.equal(n, 3, "only the other three intents");
  assert.ok((await w.seo.coverage("oet")).some((c) => c.intent === "OET in Pakistan" && c.coverage.length), "its coverage list is finished from the saved list");
});
test("C: its own daily cap: a search that could pass it is not sent; a DataForSEO refusal stops the run once", async () => {
  const w = await world(); let n = 0;
  const fetchImpl = async (u, init) => { n++; return { json: async () => serpAnswer(JSON.parse(init.body)[0].keyword) }; };
  const r = await runTopPages({ seo: w.seo, cf: w.cf, env: { ...TP_ENV, [ENV_NAMES.topPagesUsd]: "0.004" }, reader: standinReader({}), fetchImpl, now });
  assert.equal(n, 2); assert.equal(r.stoppedBy, "CAP"); assert.match(r.why, /cap/);
  const w2 = await world(); let m = 0;
  const r2 = await runTopPages({ seo: w2.seo, cf: w2.cf, env: TP_ENV, reader: standinReader({}), fetchImpl: async () => { m++; return { json: async () => ({ status_code: 40100, status_message: "You are not authorized" }) }; }, now });
  assert.equal(m, 1); assert.equal(r2.stoppedBy, "DATAFORSEO"); assert.equal((await w2.seo.spend(DAY, "top-pages")).usd, 0, "a refused search costs nothing");
});
test("C: the app's own intents join the collector's for that topic", async () => {
  const w = await world(), t = (await allTopics({ seo: w.seo })).find((x) => x.id === "oet");
  assert.ok(intentsOf({ topic: { ...t, intents: ["OET for Nurses"] }, facts: await w.cf.facts() }).includes("OET for Nurses"));
});

/* ── THE ROUTES, for real, through the handler — and the app's own client reading them ── */
function appOf(w, { mode = "sales", env: more = {} } = {}) {
  const { kvFetch } = kvMap();
  return createApp({ mode, env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", LICENCE_PUBLIC_KEY: K.pub, CRON_SECRET: "x".repeat(20), OWNER_KEY: "y".repeat(40), ...more }, kvFetch, kwStore: w.db, cfStore: w.cf, seoStore: w.seo, now, dataDir: join(REPO, ".site-data-test-none") });
}
const serve = async (handler) => { const s = createServer(handler); await new Promise((r) => s.listen(0, "127.0.0.1", r)); return { url: `http://127.0.0.1:${s.address().port}/`, close: () => new Promise((r) => s.close(r)) }; };
test("ROUTES: a licence is required; the app's own client reads a whole subject; its files are complete; an outside client's stays without Google's words", async () => {
  const w = await world(), srv = await serve(appOf(w));
  try {
    const none = await fetch(`${srv.url}v1/almiseo?subject=OET`); assert.equal(none.status, 401);
    const bad = await fetch(`${srv.url}v1/almiseo?subject=OET&part=secrets`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(OWNER_L) } }); assert.equal(bad.status, 400);
    const files = {}, read = (n, d) => files[n] ?? d, write = (n, v) => { files[n] = JSON.parse(JSON.stringify(v)); };
    const r = await syncProduct({ client: almiSeoClient({ siteUrl: srv.url, signed: OWNER_L }), subject: "OET", intents: ["OET for Nurses"], read, write, now: AT });
    assert.equal(r.ok, true, r.why); assert.deepEqual([r.counts.keywords, r.counts.questions, r.counts.countries, r.counts.allParts, r.counts.plan], [3, 1, 1, 1, 4]);
    assert.equal(files["almiseo-keywords.json"].rows.length, 3); assert.equal(files["almiseo.json"].readOn, AT);
    assert.equal(files["almiseo.json"].countries.Pakistan.complete, true); assert.equal(files["almiseo.json"].summary.keywords.total, 3);
    assert.deepEqual((await allTopics({ seo: w.seo })).find((t) => t.id === "oet").intents, ["OET for Nurses"], "the plan's intents reached the collector");
    const c = {}; const r2 = await syncProduct({ client: almiSeoClient({ siteUrl: srv.url, signed: CLIENT_L }), subject: "OET", read: (n, d) => c[n] ?? d, write: (n, v) => { c[n] = JSON.parse(JSON.stringify(v)); }, now: AT });
    assert.equal(r2.ok, true, r2.why); assert.equal(r2.counts.keywords, 0); assert.equal(c["almiseo.json"].keywordsAllowed, false);
    assert.ok(!JSON.stringify(c).includes("oet fee pakistan") && !JSON.stringify(c).includes("how much is oet"), "not one of Google's keywords reaches an outside client");
    /* a client's new subject: registered, and the file says so */
    const d = {}; const r3 = await syncProduct({ client: almiSeoClient({ siteUrl: srv.url, signed: CLIENT_L }), subject: "Pet Insurance", name: "PetCo", read: (n, v) => d[n] ?? v, write: (n, v) => { d[n] = JSON.parse(JSON.stringify(v)); }, now: AT });
    assert.equal(r3.ok, true); assert.ok((await allTopics({ seo: w.seo })).some((t) => t.subject === "Pet Insurance"));
  } finally { await srv.close(); }
});
test("ROUTES: while sales are not open an outside client is refused; the owner reads", async () => {
  const w = await world(), srv = await serve(appOf(w, { mode: "public-lite" }));
  try {
    const out = await fetch(`${srv.url}v1/almiseo?subject=OET`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(CLIENT_L) } }); assert.equal(out.status, 403);
    const own = await fetch(`${srv.url}v1/almiseo?subject=OET`, { headers: { [LICENCE_HEADER]: licenceHeaderOf(OWNER_L) } }); assert.equal(own.status, 200); assert.equal((await own.json()).keywords.total, 3);
  } finally { await srv.close(); }
});
test("ROUTES: the top-pages cron answers only Vercel's own call", async () => {
  const w = await world(), srv = await serve(appOf(w));
  try {
    assert.equal((await fetch(`${srv.url}cron/top-pages`)).status, 401);
    const r = await fetch(`${srv.url}cron/top-pages`, { headers: { authorization: `Bearer ${"x".repeat(20)}` } }); assert.equal(r.status, 200); assert.match((await r.json()).why, /off/);
  } finally { await srv.close(); }
});
test("OWNER'S PAGE: the topic list and the spend ledger, a topic added in one line; settings by NAME only", async () => {
  const P = await import("../site/pages.mjs");
  const html = P.ownerAlmiSeo({ topics: ownTopics(), ledger: { jobs: [{ job: "AI", cap: "$5 a day", today: 1, month: 2, units: "x" }] }, changed: [{ id: "1", topic: "oet", text: "Pakistan: fee", was: "AUD 587", value: "AUD 620", sourceUrl: OFFICIAL, on: DAY }], limits: DEFAULT_PLAN_LIMITS, fields: [{ id: "visibility_1", words: "$30 a month" }], names: ENV_NAMES, envSet: { [ENV_NAMES.dfsPassword]: true } });
  assert.match(html, /The topic list \(24\)/); assert.match(html, /AlmiOET/); assert.match(html, /name="line"/); assert.match(html, /Spend — every collector, one ledger/); assert.match(html, /was|AUD 587/); assert.match(html, /ALMISEO_DATAFORSEO_PASSWORD: set/);
  assert.match(html, /visibility_1_usd/);
});
test("STORES: Postgres speaks the same contract's SQL (no write can lose the changed flag); the schema is made by the code itself", () => {
  const src = readFileSync(join(REPO, "site/almiseo-store.mjs"), "utf8"), both = [seoMemoryStore(), seoPgStore({ url: "postgres://x", Pool: class {} })];
  const keys = (o) => Object.keys(o).sort(), [a, b] = both.map(keys);
  assert.deepEqual(a, b, "one contract");
  assert.match(src, /changed = true, review = 'needed'/);
  for (const t of ["seo_topic", "seo_finding", "seo_spend", "seo_account", "seo_setting", "tp_list", "tp_page", "tp_coverage"]) assert.match(src, new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\b`));
  /* a top page's text has no column */
  assert.ok(!/\btext\b/.test(/CREATE TABLE IF NOT EXISTS tp_page \(([^;]*)\);/.exec(src)[1].replace(/\b(url|why) text\b/g, "")));
});
/* ALMIV_TEST_PG_URL names a THROWAWAY Postgres on 127.0.0.1 (the same rule as rr326); CI has none: it is skipped there, and said so */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "", pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
test("the same contract on a real throwaway Postgres: topics, findings, spend, top pages, a subject's keywords in pages, the question bank", { skip: pgOk ? false : "no throwaway Postgres named" }, async () => {
  const { pgStore } = await import("../site/kw-store.mjs"), { cfPgStore } = await import("../site/cf-store.mjs"), { pathToFileURL } = await import("node:url");
  const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default, seo = seoPgStore({ url: PG_URL, Pool }), db = pgStore({ url: PG_URL, Pool }), cf = cfPgStore({ url: PG_URL, Pool });
  try {
    await seo.putTopic({ id: "t-x", name: "X", seeds: ["x"], paused: false }, { at: AT }); assert.equal((await seo.topics())[0].name, "X");
    const f = { id: "f1", topic: "oet", job: "facts", kind: "fee", text: "Pakistan: fee", sourceUrl: OFFICIAL, on: DAY, value: "AUD 587" };
    assert.deepEqual(await seo.addFinding(f, { at: AT }), { added: true, changed: false }); assert.deepEqual(await seo.addFinding(f, { at: AT }), { added: false, changed: false });
    assert.deepEqual(await seo.addFinding({ ...f, value: "AUD 620", on: "2026-11-02" }, { at: AT }), { added: false, changed: true, was: "AUD 587" });
    const [c] = await seo.findings({ topic: "oet", changed: true }); assert.equal(c.was, "AUD 587"); assert.equal(c.on, "2026-11-02"); assert.equal(c.review, "needed"); assert.equal(c.alerted, false);
    await seo.markAlerted(["f1"]); assert.equal((await seo.findings({ changed: true }))[0].alerted, true); await seo.settleReview("f1"); assert.equal((await seo.findings({ changed: true })).length, 0);
    await seo.addSpend(DAY, "top-pages", { usd: 0.002, units: 1 }); await seo.addSpend(DAY, "top-pages", { usd: 0.002, units: 1 }); assert.deepEqual(await seo.spend(DAY, "top-pages"), { usd: 0.004, units: 2 }); assert.equal((await seo.spendSince(DAY)).length, 1);
    await seo.addAccountSpend("2026-11", "a", 1.5); await seo.addAccountSpend("2026-11", "a", 0.5); assert.equal(await seo.accountSpend("2026-11", "a"), 2);
    await seo.setSetting("plan-limits", { visibility_1: { usdMonth: 2, countries: 3 } }, { at: AT }); assert.equal((await planLimits(seo)).visibility_1.usdMonth, 2);
    await seo.putList({ topic: "oet", intent: "OET in Pakistan", location: "United States", language: "en", day: DAY, results: [{ url: "https://a.example/one", title: "t" }], paa: ["Q?"], related: [] }); assert.deepEqual((await seo.lists("oet"))[0].results[0].url, "https://a.example/one"); assert.equal((await seo.lists("oet"))[0].day, DAY);
    await seo.putPage({ url: "https://a.example/one", day: DAY, ok: true, structure: { headings: ["H"] } }); assert.deepEqual((await seo.pages(["https://a.example/one"]))[0].structure.headings, ["H"]); assert.equal((await seo.pages(["https://a.example/one"]))[0].day, DAY);
    await seo.putCoverage({ topic: "oet", intent: "OET in Pakistan", day: DAY, coverage: [{ topic: "Fees" }], second: [], read: ["https://a.example/one"] }); assert.equal((await seo.coverage("oet"))[0].coverage[0].topic, "Fees");
    const save = (group, location, rows) => db.saveFetch({ unitId: null, kind: "collector", group, seedKey: `seeds:${group}:${location}`, location, language: "en", day: DAY, at: AT, period: null, ops: 1, rows });
    await save("product:oet", "ALL", [{ text: "oet exam", said: 9000 }, { text: "how much is oet", said: 500 }, { text: "ielts band score", said: 99999 }]); await save("product:oet", "PK", [{ text: "oet in pakistan", said: 800 }, { text: "oet exam", said: 300 }]); await save("product:prep", "ALL", [{ text: "ielts practice", said: 70000 }]);
    const a = await db.topicKeywords({ groups: ["product:oet"], pattern: "\\m(?:oet)\\M", offset: 0, limit: 2, day: DAY });
    assert.deepEqual(a.rows.map((r) => [r.keyword, r.volume, r.places]), [["oet exam", 9000, 2], ["oet in pakistan", 800, 1]], "its own words, All locations' figure first, the most searched first"); assert.equal(a.total, 3); assert.equal(a.today, 3); assert.equal(a.week, 3);
    assert.deepEqual((await db.topicKeywords({ groups: ["product:oet"], pattern: "\\m(?:oet)\\M", offset: 2, limit: 2, day: DAY })).rows.map((r) => r.keyword), ["how much is oet"], "the next page");
    assert.deepEqual((await db.topicKeywords({ groups: ["product:oet"], pattern: "\\m(?:oet)\\M", limit: 0, day: DAY })).rows, []);
    await cf.putQuestions({ product: "oet", country: "Pakistan", source: "owner", items: [{ text: "Can a nurse take OET twice?" }], at: AT }); await cf.putQuestions({ product: "prep", country: "Pakistan", source: "owner", items: [{ text: "is ielts harder?" }], at: AT });
    assert.deepEqual((await cf.bankQuestions(["oet"])).map((q) => q.text), ["Can a nurse take OET twice?"]);
  } finally { await seo.close(); await db.close(); await cf.close(); }
});
test.after?.(() => setClientTemplates({}));
