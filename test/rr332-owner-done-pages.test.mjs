/**
 * RR-332 · the owner's pages: the fee itself in the table (not "true"); ONE meaning of done (five parts; councils = nursing + medicine)
 * read by the queue line, the first-15 line and the table; the page counter from collected data; the review queue; Search Console now.
 * Every name, site and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { doneIn, pageCounts, partsOf, CF_PROFESSIONS } from "../desktop/country-facts.mjs";
import { reviewQueueOf } from "../site/owner-status.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T10:00:00Z`);
const F = (country, part, key, value, extra = {}) => ({ key, country, profession: null, part, kind: part, value, sourceUrl: `https://${part}.example/${country.toLowerCase()}`, sourceTitle: part, readOn: ON, status: "confirmed", by: "collector", aiWritten: false, proposedBy: "official", why: null, product: "oet", ...extra });
const council = (c, p, whole = true) => F(c, "councils", `council|${c}|${p}`, { name: `Invented ${p} council`, website: whole ? "https://ic.example.org" : null, address: whole ? "1 Invented Road, City 44000" : null, siteCheck: "read" } /* RR-343: not whole = no official website */, { profession: p });
const DONE = (c) => [F(c, "fee", `fee|${c}`, { official: "AUD 587", amount: 114260, currency: "PKR", rate: { date: "2026-10-26", source: "ExchangeRate-API" }, line: "AUD 587 — about 114,260 PKR (ExchangeRate-API's open rate of 2026-10-26: 1 AUD = 194.65 PKR; Rates By Exchange Rate API), not an official price", local: true }),
  F(c, "questions", `question|${c}|home`, { question: "can i take oet at home", answer: "Yes …", answerKind: "official", pageable: true }), F(c, "questions", `question|${c}|fees~x`, { question: "fee in rupees", answer: "General …", answerKind: "guidance", pageable: false }),
  F(c, "centres", `centres|${c}`, { venue: true }), council(c, "nursing"), council(c, "medicine"), F(c, "rules", `rule|${c}|x|1`, { rule: "A rule." })];

test("A · RR-332: done = all five parts, the councils part filled by nursing AND medicine (whole); the page counter from collected data only; the review queue", () => {
  const facts = [...DONE("Pakistan"), ...DONE("India").filter((f) => f.profession !== "medicine"), council("India", "medicine", false), council("Kenya", "pharmacy"), F("Kenya", "fee", "fee|Kenya", { line: "x", local: true }, { status: "unconfirmed" })];
  const done = doneIn(facts);
  assert.deepEqual(["Pakistan", "India", "Kenya"].map((c) => done("oet", c)), [true, false, false]);
  assert.match(partsOf("India", facts).parts.councils.missing[0], /^the medicine council is not found yet/);
  const p = pageCounts(facts, { product: "oet", countries: ["Pakistan", "India", "Kenya"] });
  assert.deepEqual([p.country.ready, p.country.waiting], [1, 2]); assert.equal(p.country.why.councils, 2); assert.equal(p.country.why.fee, 1, "an unconfirmed fee counts for nothing");
  assert.equal(p.countryProfession.ready, 5, "Pakistan 2 + India 2 (medicine found by its name, not whole) + Kenya pharmacy 1 — only where a council is found");
  assert.deepEqual([p.questions.ready, p.questions.waiting], [2, 2]); assert.equal(p.questions.why["no official answer yet"], 2); assert.equal(p.city, 0);
  assert.equal(p.countryProfession.searching, 3 * CF_PROFESSIONS.length - 5);
  const rq = reviewQueueOf([...facts, F("Nepal", "rules", "rule|Nepal|x|1", { rule: "y" })]);
  assert.deepEqual(rq, { total: 15, local: 14, unverified: 1 }, "Pakistan and India's own (14) and the unverified (1); Nepal's verified rule is approved by itself");
});

const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
function fakeKv() { const m = new Map(); const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) }); return { fetchImpl }; }
test("B · RR-332: /owner and /owner/countries agree — the fee itself in the table (never \"true\"), the same done count on the queue line and the first-15 line, the page counter, the review queue; Search Console read on one tap (owner only)", async () => {
  const store = cfMemoryStore(); for (const f of [...DONE("India"), ...DONE("Pakistan")]) await store.putFact(f, { at: `${ON}T09:00:00Z` });
  const K = fakeKv(), env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t-kv-0000000000", OWNER_ACCESS_KEY: OWNER_KEY, ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", GOOGLE_ADS_CLIENT_ID: "c.apps.googleusercontent.com", GOOGLE_ADS_CLIENT_SECRET: "test-secret-0000000000", GOOGLE_ADS_REFRESH_TOKEN: "test-refresh-0000000000" };
  const gscFetch = async (url) => { const u = String(url); if (u.includes("oauth2")) return new Response(JSON.stringify({ access_token: "ya29.t", scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly" }), { status: 200 }); if (u.endsWith("/sites")) return new Response(JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:almiworld.com", permissionLevel: "siteOwner" }] }), { status: 200 }); return new Response(JSON.stringify({ rows: [] }), { status: 200 }); };
  const app = createApp({ mode: "public-lite", env, kvFetch: K.fetchImpl, kwStore: memoryStore(), cfStore: store, cfReader: { read: async () => ({ ok: false }), requests: () => 0 }, cfAi: async () => ({ ok: false, why: "x" }), now: () => T0, gscFetch });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
  const req = async (p, { method = "GET", owner = true } = {}) => { const r = await fetch(base + p, { method, headers: owner ? { cookie } : {}, redirect: "manual" }); return { status: r.status, text: await r.text() }; };
  try {
    const c = (await req("/owner/countries")).text;
    assert.match(c, /<tr><td><a href="\/owner\/countries\?c=India">India<\/a><\/td><td>AUD 587 — about 114,260 PKR \(2026-10-26\) <span class="fine">2026-10-27<\/span><\/td><td>2 \/ 2 <span class="fine">2026-10-27<\/span><\/td><td>a venue <span class="fine">2026-10-27<\/span><\/td><td>2\/12 <span class="fine">2026-10-27<\/span><\/td><td>1 <span class="fine">2026-10-27<\/span><\/td>/);
    assert.doesNotMatch(c, /<td>true|<td>false|\[object/, "never a yes/no or a raw object in a cell");
    assert.match(c, /First 15 countries: \d+% done<\/b> · fee 2\/15 · questions 2\/15 · centres 2\/15 · councils 2\/15/);
    assert.match(c, /13 still to try in full/, "13 of the first 15 not done — the same count as /owner");
    const o = (await req("/owner")).text;
    assert.match(o, /AlmiOET: 2 of 30 first countries done \(all five parts\)/, "the same meaning of done as the first-15 line and the table");
    assert.match(o, /<h2>Pages — ready by the rules<\/h2><details><summary>AlmiOET 8<\/summary>/, "2 country pages + 2 question pages + 4 country × profession");
    assert.match(o, /<td>AlmiOET<\/td><td><b>2<\/b> ready · 195 waiting/); assert.match(o, /<td><b>4<\/b> ready \(council found\)<\/td><td><b>2<\/b> ready · 2 waiting <span class="fine">\(no official answer yet 2\)<\/span><\/td><td>0<\/td>/);
    assert.match(o, /<b>14<\/b> facts in your review queue \(Pakistan and India: 14 · not verified on an official page: 0, never shown\)/);
    const g = await req("/owner/search-console", { method: "POST" });
    assert.match(g.text, /Search Console read: 1 almiworld\.com site, 0 rows — 0 questions, 0 keywords \(Search Console impressions, 2026-09-27\.\.2026-10-24\)\./);
    assert.equal((await req("/owner/search-console", { method: "POST", owner: false })).status, 403);
  } finally { await new Promise((r) => srv.close(r)); }
});
