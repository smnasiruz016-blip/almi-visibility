/**
 * RR-414 B · THE ALMIVISIBILITY ADMIN PANEL (owner-only /admin on the sales site) and HQ's two endpoints — all LOCAL: Stripe and the
 * Upstash store are answered in this process; every key is a fake made here. Proves:
 *   · a non-owner cannot open /admin (or post to it); the panel is noindex and disallowed in robots.txt;
 *   · customers and licences (Stripe joined in), search and paging; grant / extend / revoke (confirm step) of a FREE licence, recorded
 *     (who, when, why), and the app's licence check answering it; the owner's own licence is never changed;
 *   · sales are READ ONLY: every Stripe call the panel makes is a GET with no body;
 *   · leads + free tests (a /score run is logged: site, score, date — never the visitor) with CSV downloads;
 *   · /api/admin/stats and /api/billing/health in the network's format, behind ADMIN_API_SECRET (fail-closed).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { kvStore } from "../site/limits.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { OWNER } from "../desktop/licence.mjs";
import { refOf, grantFree, extendFree, revokeFree, licenceRows, pageOf, salesOf, statsOf, stripeGet, isVisibilitySub } from "../site/admin-panel.mjs";
import { keepPanelFields, fileSiteStore } from "../site/leads.mjs";
import { runFreeTest } from "../site/free-test.mjs";
import { KEEP_LINE, liteHome } from "../site/pages.mjs";

const T0 = Date.parse("2026-11-24T10:00:00Z"), S = T0 / 1000, DAY = 86400;
const OWNER_KEY = "owner-key-for-tests-only-0123456789abcdef";
const HQ_SECRET = "hq-admin-secret-for-tests-only-123456";
const keys = generateKeyPairSync("ed25519");
const PRIV = keys.privateKey.export({ type: "pkcs8", format: "pem" }), PUB = keys.publicKey.export({ type: "spki", format: "pem" });
const ENV = {
  OWNER_ACCESS_KEY: OWNER_KEY, KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", ADMIN_API_SECRET: HQ_SECRET,
  STRIPE_SECRET_KEY: "sk_test_fakeForThisTestOnly", STRIPE_PRICE_ID_VISIBILITY_1: "price_vis1", STRIPE_PRICE_ID_VISIBILITY_5: "price_vis5", STRIPE_PRICE_ID_VISIBILITY_10: "price_vis10", STRIPE_PRICE_ID_VISIBILITY_UNLIMITED: "price_visU",
  LICENCE_SIGNING_KEY: PRIV, LICENCE_PUBLIC_KEY: PUB,
};

function fakeKv() {
  const m = new Map();
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; } if (C === "DECR") { const v = Number(m.get(k) ?? 0) - 1; m.set(k, String(v)); return { result: v }; } if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) });
  return { m, fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}

const item = (price, amount = 3000, product = "prod_vis") => ({ data: [{ quantity: 1, price: { id: price, unit_amount: amount, recurring: { interval: "month", interval_count: 1 }, product }, current_period_end: S + 20 * DAY }] });
const SUBS = [
  { id: "sub_paid1", status: "active", created: S - 3 * DAY, start_date: S - 3 * DAY, current_period_end: S + 27 * DAY, customer: { id: "cus_1", email: "buyer.one@example.com" }, metadata: { product: "almi-visibility", plan: "visibility_1" }, items: item("price_vis1") },
  { id: "sub_paid2", status: "active", created: S - 20 * DAY, start_date: S - 20 * DAY, current_period_end: S + 10 * DAY, customer: { id: "cus_2", email: "buyer.two@example.com" }, metadata: { product: "almi-visibility", plan: "visibility_1" }, items: item("price_vis1") },
  { id: "sub_gone", status: "canceled", created: S - 25 * DAY, canceled_at: S - 2 * DAY, start_date: S - 25 * DAY, customer: { id: "cus_3", email: "left@example.com" }, metadata: { product: "almi-visibility", plan: "visibility_1" }, items: item("price_vis1") },
  { id: "sub_trial", status: "trialing", created: S - DAY, start_date: S - DAY, customer: { id: "cus_4", email: "trying@example.com" }, metadata: {}, items: item("price_vis5", 4000) },
  { id: "sub_other", status: "active", created: S - DAY, customer: { id: "cus_9", email: "oet.buyer@example.com" }, metadata: { product: "almi-oet" }, items: item("price_oet", 1900, "prod_oet") },
];
const SEED = {
  av_ownerLicenceForTestsOnly000000: { kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, subscription: null },
  av_paidOneForTestsOnly0000000000: { plan: "visibility_1", status: "ACTIVE", periodEnd: new Date((S + 27 * DAY) * 1000).toISOString(), subscription: "sub_paid1" },
  av_paidTwoForTestsOnly0000000000: { plan: "visibility_1", status: "ACTIVE", periodEnd: new Date((S + 10 * DAY) * 1000).toISOString(), subscription: "sub_paid2" },
  av_goneForTestsOnly0000000000000: { plan: "visibility_1", status: "CANCELED", periodEnd: new Date((S - 2 * DAY) * 1000).toISOString(), subscription: "sub_gone" },
  av_trialForTestsOnly000000000000: { plan: "visibility_5", status: "ACTIVE", periodEnd: new Date((S + 13 * DAY) * 1000).toISOString(), subscription: "sub_trial" },
};

/* an invented public site for the free score (rr325's pattern) */
const SITES = {
  "https://tested-shop.example/robots.txt": [200, "text/plain", "User-agent: *\nAllow: /\n"],
  "https://tested-shop.example/": [200, "text/html", '<!doctype html><html lang="en"><head><title>Tested shop</title><meta name="description" content="An invented shop for the RR-414 tests."></head><body><main><h1>Shop</h1><p>Words.</p></main></body></html>'],
};
const siteFetch = async (u) => { const s = SITES[String(u)]; return s ? new Response(s[2], { status: s[0], headers: { "content-type": s[1] } }) : new Response("no", { status: 404, headers: { "content-type": "text/plain" } }); };

async function site({ env = ENV } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr414-")), calls = [], clock = { t: T0 }, kv = fakeKv();
  writeFileSync(join(dir, "accounts.json"), JSON.stringify(SEED));
  writeFileSync(join(dir, "leads.json"), JSON.stringify([{ email: "lead@example.com", marketing: true, testedUrl: "https://lead-site.example/", score: 61, at: "2026-11-20T09:00:00.000Z" }]));
  const stripeFetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: init.body });
    if (String(url).startsWith("https://api.stripe.com/v1/subscriptions?")) return new Response(JSON.stringify({ data: SUBS, has_more: false }), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  const freeTest = (o) => runFreeTest({ ...o, paceMs: 0 });
  const resolve = async () => [{ address: "93.184.216.34" }];
  const app = createApp({ mode: "sales", env, dataDir: dir, stripeFetch, kvFetch: kv.fetchImpl, resolve, freeTest, now: () => clock.t, fetchImpl: siteFetch });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const cookie = ownerCookie(env, T0).split(";")[0];
  const get = (p, h = {}) => fetch(base + p, { redirect: "manual", headers: h }).then(async (r) => ({ status: r.status, text: await r.text(), headers: r.headers }));
  const post = (p, form, h = {}) => fetch(base + p, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", ...h }, body: new URLSearchParams(form) }).then(async (r) => ({ status: r.status, text: await r.text() }));
  const accounts = () => JSON.parse(readFileSync(join(dir, "accounts.json"), "utf8"));
  return { base, dir, calls, clock, get, post, cookie, owner: { cookie }, accounts, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test("RR-414 · a NON-OWNER cannot open /admin, cannot post to it, and the panel is never indexed", async () => {
  const a = await site();
  try {
    for (const p of ["/admin", "/admin/customers", "/admin/leads", "/admin/leads.csv", "/admin/tests.csv", "/admin/licences/revoke?ref=x"]) {
      const r = await a.get(p);
      assert.equal(r.status, 401, p);
      assert.doesNotMatch(r.text, /buyer\.one@example\.com|lead@example\.com|Grant a free licence/, `${p} shows nothing private`);
      assert.match(r.text, /owner key/i, `${p} asks for the owner sign-in`);
      assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/);
    }
    // a forged cookie (signed with another key) is not the owner
    const forged = ownerCookie({ ...ENV, OWNER_ACCESS_KEY: "someone-elses-key-0123456789abcdef-xx" }, T0).split(";")[0];
    assert.equal((await a.get("/admin", { cookie: forged })).status, 401);
    const before = a.accounts();
    const g = await a.post("/admin/licences/grant", { email: "x@example.com", plan: "visibility_1", until: "2026-12-31" });
    assert.equal(g.status, 403);
    assert.deepEqual(a.accounts(), before, "nothing was granted");
    const robots = (await a.get("/robots.txt")).text;
    assert.match(robots, /Disallow: \/admin/); assert.match(robots, /Disallow: \/api\//);
    const own = await a.get("/admin", { cookie: a.cookie });
    assert.equal(own.status, 200);
    assert.match(own.text, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(own.headers.get("x-robots-tag") ?? "", /noindex/);
  } finally { a.close(); }
});

test("RR-414 · sales on the overview: read from Stripe — 2 active paid, $60 MRR, new and cancelled over 7 and 30 days; collectors linked, not copied", async () => {
  const a = await site();
  try {
    const r = await a.get("/admin", { cookie: a.cookie });
    assert.equal(r.status, 200);
    assert.match(r.text, /<b>2<\/b>active paid licences/);
    assert.match(r.text, /<b>\$60<\/b>MRR/);
    assert.match(r.text, /<tr><td>New sales<\/td><td>1<\/td><td>3<\/td><\/tr>/, "7 d: sub_paid1; 30 d: paid1, paid2 and the one cancelled since (a trial is not a sale)");
    assert.match(r.text, /<tr><td>Cancellations<\/td><td>1<\/td><td>1<\/td><\/tr>/);
    assert.match(r.text, /href="\/owner"/); assert.match(r.text, /href="\/owner\/almiseo"/);
    assert.doesNotMatch(r.text, /oet\.buyer@example\.com/, "another product's subscription is not AlmiVisibility's");
  } finally { a.close(); }
});

test("RR-414 · THE PANEL NEVER WRITES TO STRIPE: every call it makes is a GET with no body", async () => {
  const a = await site();
  try {
    for (const p of ["/admin", "/admin/customers", "/admin/customers?q=buyer"]) assert.equal((await a.get(p, { cookie: a.cookie })).status, 200);
    await a.post("/admin/licences/grant", { email: "free.one@example.com", plan: "visibility_1", until: "2026-12-31" }, { cookie: a.cookie });
    await a.get("/api/admin/stats", { "x-admin-secret": HQ_SECRET });
    assert.ok(a.calls.length >= 4, `the panel read Stripe (${a.calls.length} calls)`);
    for (const c of a.calls) {
      assert.equal(String(c.method).toUpperCase(), "GET", `${c.method} ${c.url}`);
      assert.equal(c.body, undefined, `a body was sent to ${c.url}`);
      assert.match(c.url, /^https:\/\/api\.stripe\.com\/v1\/subscriptions\?/, "only the subscriptions list is read");
    }
    await assert.rejects(stripeGet({ path: "refunds", key: "k", fetchImpl: async () => new Response("{}"), init: { method: "POST" } }), /reads Stripe only/);
    await assert.rejects(stripeGet({ path: "x", key: "k", fetchImpl: async () => new Response("{}"), init: { body: "a=1" } }), /sends nothing/);
  } finally { a.close(); }
});

test("RR-414 · customers and licences: email, plan, status, start, renewal, last app check; search and paging", async () => {
  const a = await site();
  try {
    const r = await a.get("/admin/customers", { cookie: a.cookie });
    assert.equal(r.status, 200);
    for (const e of ["buyer.one@example.com", "buyer.two@example.com", "left@example.com", "trying@example.com"]) assert.ok(r.text.includes(e), e);
    assert.match(r.text, /class="st active">active/); assert.match(r.text, /class="st trial">trial/); assert.match(r.text, /class="st cancelled">cancelled/); assert.match(r.text, /class="st owner">owner/);
    assert.match(r.text, /your own licence — not changed here/);
    assert.ok(!r.text.includes("av_paidOneForTestsOnly"), "a licence key is never listed — only its ref");
    assert.ok(r.text.includes(refOf("av_paidOneForTestsOnly0000000000")));
    const q = await a.get("/admin/customers?q=trying", { cookie: a.cookie });
    assert.ok(q.text.includes("trying@example.com") && !q.text.includes("buyer.one@example.com"), "search narrows");
    // paging, on the pure helper (25 a page)
    const rows = Array.from({ length: 60 }, (_, i) => ({ ref: `r${i}`, email: `p${i}@example.com`, plan: "x", status: "free" }));
    const p3 = pageOf(rows, { page: 3 });
    assert.deepEqual([p3.page, p3.pages, p3.rows.length, p3.total], [3, 3, 10, 60]);
    assert.equal(pageOf(rows, { page: 99 }).page, 3); assert.equal(pageOf(rows, { q: "p59@" }).total, 1);
  } finally { a.close(); }
});

test("RR-414 · GRANT a free licence on a test email → the key shown once → the app's check answers ACTIVE → EXTEND → REVOKE behind a confirm step", async () => {
  const a = await site();
  try {
    const g = await a.post("/admin/licences/grant", { email: "Free.Tester@Example.com", plan: "visibility_5", until: "2026-12-31", reason: "beta tester" }, { cookie: a.cookie });
    assert.equal(g.status, 200);
    const key = /data-testid="granted-key">([^<]+)</.exec(g.text)?.[1];
    assert.match(key ?? "", /^av_[A-Za-z0-9_-]{20,40}$/, "the new key, shown once");
    const rec = a.accounts()[key];
    assert.deepEqual([rec.kind, rec.plan, rec.status, rec.email, rec.reason, rec.periodEnd.slice(0, 10)], ["FREE", "visibility_5", "ACTIVE", "free.tester@example.com", "beta tester", "2026-12-31"]);
    assert.match(rec.grantedBy, /owner/); assert.equal(rec.grantedAt, new Date(T0).toISOString()); assert.equal(rec.log[0].what, "granted");
    // the list never shows the key again
    const list = await a.get("/admin/customers", { cookie: a.cookie });
    assert.ok(!list.text.includes(key) && list.text.includes("free.tester@example.com") && /class="st free">free/.test(list.text));
    // a second grant to the same email while it runs is refused
    const twice = await a.post("/admin/licences/grant", { email: "free.tester@example.com", plan: "visibility_1", until: "2027-01-31" }, { cookie: a.cookie });
    assert.equal(twice.status, 400); assert.match(twice.text, /already has a free licence/);
    // the app's licence check: ACTIVE, until the chosen day — and the panel's "last app check" is recorded
    const chk = JSON.parse((await a.post("/v1/licence", { account: key })).text);
    assert.deepEqual([chk.licence.status, chk.licence.plan, chk.licence.periodEnd.slice(0, 10)], ["ACTIVE", "visibility_5", "2026-12-31"]);
    assert.equal(a.accounts()[key].lastSeen, new Date(T0).toISOString());
    // EXTEND
    const ref = refOf(key);
    assert.equal((await a.post("/admin/licences/extend", { ref, until: "2026-12-01" }, { cookie: a.cookie })).status, 400, "an earlier date is refused");
    assert.equal((await a.post("/admin/licences/extend", { ref, until: "2027-03-31", reason: "longer test" }, { cookie: a.cookie })).status, 200);
    assert.equal(a.accounts()[key].periodEnd.slice(0, 10), "2027-03-31"); assert.equal(a.accounts()[key].log.at(-1).what, "extended");
    assert.equal(a.accounts()[key].lastSeen, new Date(T0).toISOString(), "the last check survives the change");
    // REVOKE: the confirm page first; a post without the confirm changes nothing
    const conf = await a.get(`/admin/licences/revoke?ref=${ref}`, { cookie: a.cookie });
    assert.equal(conf.status, 200); assert.match(conf.text, /Yes, revoke it/); assert.match(conf.text, /name="confirm" value="yes"/);
    assert.equal((await a.post("/admin/licences/revoke", { ref }, { cookie: a.cookie })).status, 400);
    assert.equal(a.accounts()[key].status, "ACTIVE", "not revoked without the confirm step");
    assert.equal((await a.post("/admin/licences/revoke", { ref, confirm: "yes", reason: "test done" }, { cookie: a.cookie })).status, 200);
    assert.equal(a.accounts()[key].status, "REVOKED"); assert.equal(a.accounts()[key].log.at(-1).what, "revoked");
    const after = JSON.parse((await a.post("/v1/licence", { account: key })).text);
    assert.equal(after.licence.status, "REVOKED", "the app's check now ends it");
  } finally { a.close(); }
});

test("RR-414 · the owner's own unlimited licence is never changed by the panel; a paid licence is not extended or revoked here", async () => {
  const a = await site();
  try {
    const before = a.accounts().av_ownerLicenceForTestsOnly000000;
    for (const [p, f] of [["/admin/licences/extend", { until: "2030-01-01" }], ["/admin/licences/revoke", { confirm: "yes" }]]) {
      const r1 = await a.post(p, { ref: refOf("av_ownerLicenceForTestsOnly000000"), ...f }, { cookie: a.cookie });
      assert.equal(r1.status, 400); assert.match(r1.text, /owner licence is not changed/);
      const r2 = await a.post(p, { ref: refOf("av_paidOneForTestsOnly0000000000"), ...f }, { cookie: a.cookie });
      assert.equal(r2.status, 400); assert.match(r2.text, /Only a free licence/);
    }
    await a.post("/admin/licences/grant", { email: "another@example.com", plan: "visibility_1", until: "2026-12-31" }, { cookie: a.cookie });
    assert.deepEqual(a.accounts().av_ownerLicenceForTestsOnly000000, before, "the owner licence, byte for byte");
  } finally { a.close(); }
});

test("RR-414 · leads: the emails and the free site tests (a /score run is logged — site, score, date, never the visitor), each with a CSV", async () => {
  const a = await site();
  try {
    const home = (await a.get("/")).text; const ticket = /name="ticket" value="([^"]+)"/.exec(home)?.[1]; assert.ok(ticket, "the score form is on");
    a.clock.t += 3000;
    const s = await a.post("/score", { url: "https://tested-shop.example/", ticket }, { "x-real-ip": "203.0.113.77" });
    assert.equal(s.status, 200, s.text.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400));
    const tests = JSON.parse(readFileSync(join(a.dir, "tests.json"), "utf8"));
    assert.equal(tests.length, 1);
    assert.deepEqual(Object.keys(tests[0]).sort(), ["at", "pages", "score", "site"], "only the site, its score, the pages read and the date");
    const score = tests[0].score;
    assert.equal(tests[0].site, "https://tested-shop.example/"); assert.ok(Number.isInteger(score) && score >= 0 && score <= 100, `a score (${score})`);
    assert.ok(!JSON.stringify(tests).includes("203.0.113.77"), "never the visitor's address");
    const l = await a.get("/admin/leads", { cookie: a.cookie });
    assert.equal(l.status, 200);
    assert.ok(l.text.includes("lead@example.com") && l.text.includes("tested-shop.example") && l.text.includes(`${score} / 100`));
    const c1 = await a.get("/admin/leads.csv", { cookie: a.cookie });
    assert.match(c1.headers.get("content-type"), /text\/csv/); assert.match(c1.text, /^email,site,date,marketing\r\nlead@example\.com,https:\/\/lead-site\.example\/,2026-11-20,yes\r\n$/);
    const c2 = await a.get("/admin/tests.csv", { cookie: a.cookie });
    assert.equal(c2.text, `site,score,pages,date\r\nhttps://tested-shop.example/,${score},${tests[0].pages},${String(tests[0].at).slice(0, 10)}\r\n`);
  } finally { a.close(); }
});

test("RR-414 addition · the sales home says truthfully what a free test keeps; no public text there says it is not stored", async () => {
  const a = await site();
  try {
    const home = (await a.get("/")).text;
    const KEEP = "We keep the address of the site you test, its score and the date, to improve the service. We do not store your name, email or IP address with it.";
    assert.equal(KEEP_LINE, KEEP, "the owner's words, exactly");
    const form = /<form class="testform" method="post" action="\/score">[\s\S]*?<\/form>/.exec(home)?.[0] ?? "";
    assert.ok(form.includes(`<span data-keep-line>${KEEP}</span>`), "the sentence is under the free test form");
    assert.match(home, /We keep the site address, its score and the date/, "the score picture's footer says it too");
    for (const old of ["the result is shown here only", "Shown on screen, never stored"]) assert.ok(!home.includes(old), `the sales home still says "${old}"`);
  } finally { a.close(); }
  // the pre-sales (public-lite) site keeps nothing, so it keeps its old, still true, line
  const lite = liteHome({ scoreOn: true, ticket: "t" });
  assert.ok(lite.includes("the result is shown here only") && !lite.includes(KEEP_LINE));
});

test("RR-414 · HQ's /api/admin/stats and /api/billing/health: the network's format, behind ADMIN_API_SECRET, fail-closed, no secret shape", async () => {
  const a = await site();
  try {
    for (const h of [{}, { "x-admin-secret": "wrong" }, { "x-admin-secret": `${HQ_SECRET}x` }]) {
      assert.equal((await a.get("/api/admin/stats", h)).status, 401);
      assert.equal((await a.get("/api/billing/health", h)).status, 401);
    }
    const st = JSON.parse((await a.get("/api/admin/stats", { "x-admin-secret": HQ_SECRET })).text);
    assert.equal(typeof st.accounts, "number"); assert.deepEqual(Object.keys(st.signups).sort(), ["d30", "d7", "today"]);
    assert.equal(st.trialing + st.paid + st.free + st.owner, st.accounts, "the buckets add up (HQ's reconcile check)");
    assert.deepEqual([st.accounts, st.paid, st.trialing, st.owner, st.free], [5, 2, 1, 1, 1]);
    assert.deepEqual([st.customers, st.licencesActive, st.leads, st.mrrCents], [4, 3, 1, 6000]);
    const hraw = (await a.get("/api/billing/health", { "x-admin-secret": HQ_SECRET })).text, h = JSON.parse(hraw);
    assert.equal(h.ok, true); assert.equal(h.keyMode, "test"); assert.equal(h.priceVarsPresent.length, 4);
    for (const v of [ENV.STRIPE_SECRET_KEY, HQ_SECRET, "price_vis1"]) assert.ok(!hraw.includes(v), "no key and no value is echoed");
    assert.ok(!/len|last4|length/i.test(hraw), "no secret shape");
    // no secret set on the site → always 401
    const b = await site({ env: { ...ENV, ADMIN_API_SECRET: "" } });
    try { assert.equal((await b.get("/api/admin/stats", { "x-admin-secret": "" })).status, 401); } finally { b.close(); }
  } finally { a.close(); }
});

test("RR-414 · pure parts: statuses, a Stripe event keeps the panel's fields, AlmiVisibility's subscriptions only", () => {
  const now = T0;
  const acc = { ...SEED };
  const g = grantFree(acc, { email: "p@example.com", until: "2026-12-01", by: "owner", now });
  assert.ok(g.ok);
  assert.equal(grantFree(acc, { email: "bad", until: "2026-12-01", by: "o", now }).ok, false);
  assert.equal(grantFree(acc, { email: "q@example.com", until: "2026-01-01", by: "o", now }).ok, false, "a past date");
  const rows = licenceRows({ accounts: acc, subs: SUBS, env: ENV, now });
  const st = Object.fromEntries(rows.map((r) => [r.email ?? r.kind, r.status]));
  assert.deepEqual(st, { OWNER: "owner", "buyer.one@example.com": "active", "buyer.two@example.com": "active", "left@example.com": "cancelled", "trying@example.com": "trial", "p@example.com": "free" });
  const later = licenceRows({ accounts: acc, subs: SUBS, env: ENV, now: Date.parse("2026-12-05T00:00:00Z") });
  assert.equal(later.find((r) => r.email === "p@example.com").status, "expired");
  assert.equal(extendFree(acc, { ref: refOf(g.account), until: "2027-01-01", by: "o", now }).ok, true);
  assert.equal(revokeFree(acc, { ref: refOf(g.account), by: "o", now }).ok, false);
  // a Stripe event rewrites a licence from its own fields; what the panel recorded stays
  assert.deepEqual(keepPanelFields({ email: "e@x.com", lastSeen: "t", plan: "a" }, { plan: "b", status: "ACTIVE" }), { plan: "b", status: "ACTIVE", email: "e@x.com", lastSeen: "t" });
  const dir = mkdtempSync(join(tmpdir(), "rr414s-"));
  try {
    const s = fileSiteStore(dir);
    return (async () => {
      await s.saveAccounts({ av_k: { plan: "visibility_1", status: "ACTIVE", periodEnd: "2026-12-01T00:00:00.000Z", subscription: "sub_1", email: "kept@example.com" } });
      await s.touchLicence("av_k", "2026-11-24T10:00:00.000Z");
      await s.saveAccounts({ av_k: { plan: "visibility_5", status: "ACTIVE", periodEnd: "2026-12-01T00:00:00.000Z", subscription: "sub_1" } });
      const k = (await s.accounts()).av_k;
      assert.deepEqual([k.plan, k.email, k.lastSeen], ["visibility_5", "kept@example.com", "2026-11-24T10:00:00.000Z"]);
      assert.equal(isVisibilitySub(SUBS[4], ENV), false); assert.equal(isVisibilitySub(SUBS[3], ENV), true, "by its price");
      const sales = salesOf(SUBS.filter((x) => isVisibilitySub(x, ENV)), now);
      assert.deepEqual([sales.activePaid, sales.mrrCents, sales.new7, sales.new30, sales.cancelled7, sales.cancelled30], [2, 6000, 1, 3, 1, 1]);
      assert.equal(statsOf({ rows, sales, now }).accounts, rows.length);
    })().finally(() => rmSync(dir, { recursive: true, force: true }));
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e; }
});
