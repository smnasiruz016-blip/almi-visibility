/**
 * RR-326 E · the Visibility app's keyword data from AlmiWorld's OWN keyword service (the same database and Google connection as the
 * finder), checked by the client's LICENCE — no Google account and no Google sign-in for the client; per-plan monthly limits; the owner's
 * licence without a limit; while sales are not open, the owner's licence ONLY; the client's own Google Ads sign-in stays an optional extra.
 * A throwaway signing key made here; Google, the store and the database are stand-ins of their documented shapes. No network, no real key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { createApp } from "../site/app.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { siteAds } from "../site/kw-google.mjs";
import { runCollector } from "../site/kw-collector.mjs";
import { checkLicence, takeSearch, readLicenceHeader, MONTHLY_SEARCHES, LICENCE_HEADER } from "../site/kw-service.mjs";
import { licenceBytes, ownerLicenceText, OWNER, PLANS } from "../desktop/licence.mjs";
import { keywordService, licenceHeaderOf, usageLine } from "../desktop/keyword-service.mjs";
import { SOURCES } from "../desktop/keyword-db.mjs";

const keys = () => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey }; };
const K1 = keys(), OTHER = keys();
const signed = (licence, k = K1) => ({ licence, signature: sign(null, licenceBytes(licence), k.priv).toString("base64") });
const ownerL = (k = K1) => signed({ account: "av_owner_test0000000000000000", kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: "2026-10-26T00:00:00.000Z" }, k);
const paidL = (plan = "visibility_5", periodEnd = "2026-11-20T00:00:00.000Z", status = "ACTIVE") => signed({ account: "av_client_test000000000000000", plan, status, periodEnd, issuedAt: "2026-10-26T00:00:00.000Z" });
const SECRETS = { GOOGLE_ADS_CLIENT_ID: "client-for-tests.apps.googleusercontent.com", GOOGLE_ADS_CLIENT_SECRET: "client-secret-for-tests-XYZ", GOOGLE_ADS_REFRESH_TOKEN: "refresh-token-for-tests-QRS", GOOGLE_ADS_CUSTOMER_ID: "1234567890" };
const ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", ...SECRETS, LICENCE_PUBLIC_KEY: K1.pub };

const clockAt = (iso = "2026-10-26T10:00:00Z") => { const c = { t: Date.parse(iso) }; c.now = () => c.t; c.sleep = async (ms) => { c.t += ms; }; return c; };
function fakeKv(clock) {
  const m = new Map();
  const live = (k) => { const e = m.get(k); if (e && e.until !== null && e.until <= clock.t) m.delete(k); return m.get(k); };
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => {
    const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && live(k)) return { result: null }; const ex = a.indexOf("EX"), px = a.indexOf("PX"); m.set(k, { v: String(a[0]), until: ex > 0 ? clock.t + Number(a[ex + 1]) * 1000 : px > 0 ? clock.t + Number(a[px + 1]) : null }); return { result: "OK" }; }
    if (C === "GET") return { result: live(k)?.v ?? null };
    if (C === "GETDEL") { const v = live(k)?.v ?? null; m.delete(k); return { result: v }; }
    if (C === "DEL") return { result: m.delete(k) ? 1 : 0 };
    if (C === "INCR" || C === "DECR") { const v = Number(live(k)?.v ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, { v: String(v), until: live(k)?.until ?? null }); return { result: v }; }
    if (C === "EXPIRE") { const e = live(k); if (e) e.until = clock.t + Number(a[0]) * 1000; return { result: e ? 1 : 0 }; }
    return { error: "ERR" };
  }) });
  return { m, fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}
function fakeGoogle({ fail = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    if (String(url) === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "a", expires_in: 3599 }), { status: 200 });
    const body = JSON.parse(init.body); calls.push(body);
    if (fail) return new Response(JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
    return new Response(JSON.stringify({ results: body.keywordSeed.keywords.flatMap((s) => [s, `${s} online`]).map((text, i) => ({ text, keywordIdeaMetrics: { avgMonthlySearches: String(1000 - i), monthlySearchVolumes: [{ month: "SEPTEMBER", year: "2026", monthlySearches: "900" }] } })) }), { status: 200 });
  };
  return { calls, fetchImpl };
}
async function site({ env = ENV, clock = clockAt(), G = fakeGoogle(), store = memoryStore(), K = null } = {}) {
  const KV = K ?? fakeKv(clock);
  const srv = createServer(createApp({ mode: "public-lite", env, kvFetch: KV.fetchImpl, adsFetch: G.fetchImpl, kwStore: store, now: clock.now, sleep: clock.sleep }));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const call = (path, { lic = null, body = null, method = body ? "POST" : "GET" } = {}) => fetch(new URL(path, base), { method, headers: { ...(lic ? { [LICENCE_HEADER]: lic } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, text: await r.text() }));
  return { base, call, G, KV, store, clock, close: () => new Promise((r) => srv.close(r)) };
}

test("E · the service: the owner's licence gets keyword ideas with Google's volumes — no Google account of his own; asked of Google ONCE, then from the database; no limit; nothing secret in an answer", async () => {
  const a = await site(), lic = licenceHeaderOf(ownerL());
  try {
    assert.equal(lic, ownerLicenceText(ownerL()), "the app sends the owner's text as it is");
    const r1 = await a.call("v1/keywords", { lic, body: { seeds: ["OET", "oet exam"], location: "PK" } }), j1 = JSON.parse(r1.text);
    assert.equal(r1.status, 200); assert.equal(j1.fromDatabase, false); assert.equal(a.G.calls.length, 1);
    assert.deepEqual(j1.seeds, ["oet", "oet exam"]); assert.equal(j1.locationName, "Pakistan"); assert.equal(j1.source, "Google Ads Keyword Planner"); assert.equal(j1.period, "2026-09-01..2026-09-30");
    assert.deepEqual(j1.rows.map((x) => [x.keyword, x.volume]), [["oet", 1000], ["oet online", 999], ["oet exam", 998], ["oet exam online", 997]]);
    assert.deepEqual(j1.usage, { month: "2026-10", used: 1, limit: null });
    assert.equal(a.G.calls[0].geoTargetConstants[0], "geoTargetConstants/2586");
    const r2 = JSON.parse((await a.call("v1/keywords", { lic, body: { seeds: ["oet", "oet exam"], location: "PK" } })).text);
    assert.equal(r2.fromDatabase, true); assert.equal(a.G.calls.length, 1, "the same search went to Google again");
    const u = JSON.parse((await a.call("v1/keywords/usage", { lic })).text); assert.deepEqual([u.owner, u.used, u.limit], [true, 2, null]);
    for (const t of [r1.text, JSON.stringify(r2), JSON.stringify(u)]) { for (const v of Object.values(SECRETS)) assert.ok(!t.includes(v)); assert.ok(!t.includes(lic.slice(4, 40)), "the licence came back"); assert.ok(!t.includes("signature")); }
    assert.equal(Number(a.KV.m.get("av:ads:ops:2026-10-26:owner").v), 1, "the owner's searches are counted apart, inside the total");
  } finally { await a.close(); }
});

test("E · the SAME database as the collector: a product's seeds the collector fetched today come back with no Google request", async () => {
  const clock = clockAt("2026-10-26T01:00:00Z"), G = fakeGoogle(), store = memoryStore(), K = fakeKv(clock);
  const ads = siteAds({ env: ENV, kv: K.kv, fetchImpl: G.fetchImpl, now: clock.now, sleep: clock.sleep });
  await store.setSeedList("product:oet | AlmiOET | oet, oet exam, oet practice test", "2026-10-26T00:00:00.000Z");
  await runCollector({ store, ads, kv: K.kv, now: clock.now, budgetMs: 1e9 });
  const before = G.calls.length; assert.equal(before, 193, "RR-329 (rule R5): every location Google can target (it was 19)");
  const a = await site({ clock, G, store, K });
  try {
    const j = JSON.parse((await a.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: "oet, oet exam, oet practice test", location: "IN" } })).text);
    assert.equal(j.fromDatabase, true); assert.equal(G.calls.length, before, "Google was asked for what the collector holds");
  } finally { await a.close(); }
});

test("E · the licence decides — and while sales are not open, the owner's licence ONLY; a licence not signed by AlmiWorld's key, no licence, a switched-off service: refused in plain words", async () => {
  const a = await site();
  try {
    const no = await a.call("v1/keywords", { body: { seeds: ["x"] } }); assert.equal(no.status, 401); assert.match(no.text, /Your licence was not sent/);
    assert.equal((await a.call("v1/keywords", { lic: "avl_not-a-licence", body: { seeds: ["x"] } })).status, 401);
    const forged = await a.call("v1/keywords", { lic: licenceHeaderOf(ownerL(OTHER)), body: { seeds: ["x"] } }); assert.equal(forged.status, 401); assert.match(forged.text, /could not be verified/);
    const paid = await a.call("v1/keywords", { lic: licenceHeaderOf(paidL()), body: { seeds: ["x"] } }); assert.equal(paid.status, 403); assert.match(paid.text, /opens for clients when sales open/);
    assert.equal(a.G.calls.length, 0, "nothing reached Google");
    const bad = await a.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: ["https://x.example"] } }); assert.equal(bad.status, 400);
    assert.equal((await a.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: Array.from({ length: 21 }, (_, i) => `w${i}`) } })).status, 400);
    assert.equal((await a.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: ["x"], location: "ZZ" } })).status, 400);
  } finally { await a.close(); }
  for (const env of [{ ...ENV, LICENCE_PUBLIC_KEY: "" }, { ...ENV, LICENCE_PUBLIC_KEY: "not a key" }, { ...ENV, KEYWORD_SERVICE_OFF: "1" }]) {
    const b = await site({ env }); try { const r = await b.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: ["x"] } }); assert.equal(r.status, 503); assert.equal(b.G.calls.length, 0); } finally { await b.close(); }
  }
  /* Google could not answer: the search is given back */
  const c = await site({ G: fakeGoogle({ fail: true }) });
  try { const r = await c.call("v1/keywords", { lic: licenceHeaderOf(ownerL()), body: { seeds: ["fresh"] } }); assert.equal(r.status, 503); assert.equal(JSON.parse((await c.call("v1/keywords/usage", { lic: licenceHeaderOf(ownerL()) })).text).used, 0); } finally { await c.close(); }
});

test("E · when sales open: each plan's MONTHLY searches (shown in the app), refused politely over it, a new month starts again; an ended plan is refused", async () => {
  assert.deepEqual(Object.keys(MONTHLY_SEARCHES), PLANS.map((p) => p.id), "every plan has its monthly searches");
  const now = Date.parse("2026-10-26T10:00:00Z"), clock = clockAt(), K = fakeKv(clock);
  const lic = checkLicence({ header: licenceHeaderOf(paidL("visibility_1")), env: ENV, now, salesOpen: true });
  assert.deepEqual([lic.ok, lic.owner, lic.plan, lic.limit], [true, false, "visibility_1", MONTHLY_SEARCHES.visibility_1]);
  for (let i = 0; i < lic.limit; i++) assert.equal((await takeSearch({ kv: K.kv, lic, now })).ok, true);
  const over = await takeSearch({ kv: K.kv, lic, now }); assert.equal(over.ok, false); assert.match(over.why, /This month's 300 keyword searches of your plan are used\. They start again next month\./);
  assert.equal((await takeSearch({ kv: K.kv, lic, now: Date.parse("2026-11-01T00:00:00Z") })).ok, true, "a new month");
  assert.equal(checkLicence({ header: licenceHeaderOf(paidL("visibility_5", "2026-10-01T00:00:00.000Z")), env: ENV, now, salesOpen: true }).status, 402, "an ended plan");
  assert.equal(checkLicence({ header: licenceHeaderOf(paidL("visibility_5", "2026-12-01T00:00:00.000Z", "CANCELLED")), env: ENV, now, salesOpen: true }).status, 402);
  assert.equal(checkLicence({ header: licenceHeaderOf(ownerL()), env: ENV, now, salesOpen: true }).limit, null, "the owner: no limit");
  assert.deepEqual(readLicenceHeader(licenceHeaderOf(paidL())), paidL(), "what the app sends is what the service reads");
});

test("E · the app: AlmiWorld's keyword service with the licence it runs under — rows for its keyword database, the month's line; no plan, no request", async () => {
  const a = await site();
  try {
    const none = keywordService({ siteUrl: a.base, signed: null }); assert.match((await none.search({ seeds: ["oet"] })).why, /Add your plan first/);
    const svc = keywordService({ siteUrl: a.base, signed: ownerL() });
    const r = await svc.search({ seeds: ["oet"], location: "GB" });
    assert.equal(r.ok, true); assert.equal(r.locationName, "United Kingdom"); assert.deepEqual(r.rows[0], { text: "oet", said: 1000, months: { "2026-09": 900 }, competition: null, change3m: null, yoy: null });
    assert.equal(usageLine(r.usage), "Keyword searches this month: 1 — no limit (owner).");
    assert.equal(usageLine({ used: 12, limit: 300 }), "Keyword searches this month: 12 of 300.");
    const client = keywordService({ siteUrl: a.base, signed: paidL() }); assert.match((await client.search({ seeds: ["oet"] })).why, /opens for clients when sales open/);
  } finally { await a.close(); }
  assert.equal(SOURCES.service, "AlmiWorld keyword service (Google Ads Keyword Planner data)");
});
