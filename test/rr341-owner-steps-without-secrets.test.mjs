/**
 * RR-341 (owner GREEN, 28 Oct 2026) · launch steps WITHOUT the owner handling a secret.
 *   · /owner "Create Manage-plan portal": AlmiVisibility's OWN Stripe portal configuration, made with the key and the 4 prices already in
 *     Vercel; ONCE (a second press finds the first); the shared default portal is never touched; the site then finds it by its tag.
 *   · the release tool publishes with the owner's own `gh` and prints the two plain links.
 * Stripe and `gh` are answered IN THIS PROCESS; every key here is a fake made for the test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../site/app.mjs";
import { ensurePortalConfig, findPortalConfig, portalSession, portalConfigFields } from "../site/billing.mjs";
import { publishRelease } from "../site/owner-release.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { ownerCookie } from "../site/owner.mjs";

const KEY = "sk_live_SECRET_for_this_test_only";
const PRICES = { STRIPE_PRICE_ID_VISIBILITY_1: "price_1AAAAAAA", STRIPE_PRICE_ID_VISIBILITY_5: "price_1BBBBBBB", STRIPE_PRICE_ID_VISIBILITY_10: "price_1CCCCCCC", STRIPE_PRICE_ID_VISIBILITY_UNLIMITED: "price_1DDDDDDD" };
/* Stripe, in this process: the account already has a DEFAULT portal (shared, other products) and another product's own one */
function stripe() {
  const configs = [{ id: "bpc_default", active: true, is_default: true, metadata: {} }, { id: "bpc_otherProduct", active: true, is_default: false, metadata: { product: "almioet" } }], calls = [];
  const fetchImpl = async (url, o = {}) => {
    const u = String(url); calls.push({ url: u, method: o.method ?? "GET", body: o.body ?? null, auth: o.headers?.Authorization });
    if (o.headers?.Authorization !== `Bearer ${KEY}`) return new Response("{}", { status: 401 });
    if (u.startsWith("https://api.stripe.com/v1/billing_portal/configurations?")) return new Response(JSON.stringify({ data: configs }), { status: 200 });
    const m = /\/v1\/prices\/(price_\w+)$/.exec(u); if (m) return new Response(JSON.stringify({ id: m[1], product: "prod_AV", currency: "usd", recurring: { interval: "month" } }), { status: 200 });
    if (u === "https://api.stripe.com/v1/billing_portal/configurations" && o.method === "POST") { const meta = new URLSearchParams(o.body).get("metadata[product]"); const id = `bpc_made${configs.length}`; configs.push({ id, active: true, is_default: false, metadata: { product: meta } }); return new Response(JSON.stringify({ id }), { status: 200 }); }
    if (/\/v1\/subscriptions\/sub_A$/.test(u)) return new Response(JSON.stringify({ id: "sub_A", customer: "cus_A", metadata: { almiworld_account: "av_buyerAaaaaaaaaaaaaaaaaaaaaaa" } }), { status: 200 });
    if (u === "https://api.stripe.com/v1/billing_portal/sessions") return new Response(JSON.stringify({ url: "https://billing.stripe.com/p/session/test_cus_A" }), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  return { fetchImpl, calls, configs };
}

test("RR-341 · the portal: made ONCE with Vercel's key and prices, tagged as AlmiVisibility's; the default and other products' portals are never touched", async () => {
  const S = stripe();
  assert.match((await ensurePortalConfig({ env: {}, fetchImpl: S.fetchImpl })).line, /no Stripe key in Vercel \(STRIPE_SECRET_KEY\)/);
  assert.match((await ensurePortalConfig({ env: { STRIPE_SECRET_KEY: KEY }, fetchImpl: S.fetchImpl })).line, /missing in Vercel: STRIPE_PRICE_ID_VISIBILITY_1/);
  const first = await ensurePortalConfig({ env: { STRIPE_SECRET_KEY: KEY, ...PRICES }, fetchImpl: S.fetchImpl });
  assert.deepEqual([first.ok, first.created, first.id], [true, true, "bpc_made2"], first.line);
  const second = await ensurePortalConfig({ env: { STRIPE_SECRET_KEY: KEY, ...PRICES }, fetchImpl: S.fetchImpl });
  assert.deepEqual([second.ok, second.created, second.id], [true, false, "bpc_made2"], "a second press made a second configuration");
  assert.equal(S.calls.filter((c) => c.method === "POST").length, 1);
  assert.ok(S.calls.filter((c) => c.method === "POST").every((c) => c.url === "https://api.stripe.com/v1/billing_portal/configurations"), "a write to anything but a NEW configuration (the default portal is never changed)");
  assert.equal(await findPortalConfig({ stripeKey: KEY, fetchImpl: S.fetchImpl }), "bpc_made2");
  assert.equal(portalConfigFields([])["metadata[product]"], "almi-visibility");
  for (const r of [first, second]) assert.ok(!r.line.includes(KEY));
});

test("RR-341 · the site finds AlmiVisibility's own portal by its tag — no Vercel variable needed; before it exists, nothing opens", async () => {
  const S = stripe(), accounts = { av_buyerAaaaaaaaaaaaaaaaaaaaaaa: { subscription: "sub_A" } }, env = { STRIPE_SECRET_KEY: KEY, VISIBILITY_BILLING_LIVE: "yes" };
  const before = await portalSession({ licenceKey: "av_buyerAaaaaaaaaaaaaaaaaaaaaaa", accounts, env, origin: "https://o.example", fetchImpl: S.fetchImpl });
  assert.equal(before.state, "DEFERRED"); assert.match(before.why, /Create Manage-plan portal/);
  assert.ok(!S.calls.some((c) => c.url.endsWith("/billing_portal/sessions")), "a session on the shared default portal");
  await ensurePortalConfig({ env: { ...env, ...PRICES }, fetchImpl: S.fetchImpl });
  const after = await portalSession({ licenceKey: "av_buyerAaaaaaaaaaaaaaaaaaaaaaa", accounts, env, origin: "https://o.example", fetchImpl: S.fetchImpl });
  assert.equal(after.ok, true);
  assert.equal(new URLSearchParams(S.calls.find((c) => c.url.endsWith("/billing_portal/sessions")).body).get("configuration"), "bpc_made2");
});

const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
function fakeKv() { const m = new Map(); return { fetchImpl: async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) }) }; }

test("RR-341 · /owner: the button is there; only the owner may press it; the answer names the configuration, never the key", async () => {
  const S = stripe(), K = fakeKv(), T0 = Date.parse("2026-10-28T12:00:00Z");
  const env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t-kv-0000000000", OWNER_ACCESS_KEY: OWNER_KEY, STRIPE_SECRET_KEY: KEY, ...PRICES };
  const app = createApp({ mode: "sales", env, kvFetch: K.fetchImpl, kwStore: memoryStore(), cfStore: cfMemoryStore(), cfReader: { read: async () => ({ ok: false }), requests: () => 0 }, cfAi: async () => ({ ok: false, why: "x" }), now: () => T0, stripeFetch: S.fetchImpl, fetchImpl: async () => new Response("", { status: 404 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
  try {
    assert.match(await (await fetch(`${base}/owner`, { headers: { cookie } })).text(), /<form method="post" action="\/owner\/portal" data-portal>[\s\S]*Create Manage-plan portal/);
    const stranger = await fetch(`${base}/owner/portal`, { method: "POST", redirect: "manual" });
    assert.notEqual(stranger.status, 200); assert.equal(S.calls.length, 0, "Stripe was called for someone who is not the owner");
    const r = await fetch(`${base}/owner/portal`, { method: "POST", headers: { cookie } }), t = await r.text();
    assert.equal(r.status, 200); assert.match(t, /Manage-plan portal: OK — AlmiVisibility&#39;s own customer portal is made: bpc_made2|Manage-plan portal: OK — AlmiVisibility's own customer portal is made: bpc_made2/);
    assert.ok(!t.includes(KEY));
    assert.match(await (await fetch(`${base}/owner/portal`, { method: "POST", headers: { cookie } })).text(), /already there: bpc_made2/);
  } finally { srv.close(); }
});

test("RR-341 · the release publishes with the owner's own gh: the repo once, the release with the three files, then the two plain links", () => {
  const calls = [], run = (exists) => (args) => { calls.push(args.join(" ")); return args[0] === "repo" && args[1] === "view" ? (exists ? 0 : 1) : 0; };
  const r = publishRelease({ version: "1.15.1", out: "C:/rel", owner: "someone", run: run(false) });
  assert.deepEqual([r.ok, r.setupUrl, r.updateBase], [true, "https://github.com/someone/almivisibility-releases/releases/latest/download/AlmiVisibility-Setup.exe", "https://github.com/someone/almivisibility-releases/releases/latest/download/"]);
  assert.ok(calls.some((c) => c.startsWith("repo create someone/almivisibility-releases --public")));
  assert.match(calls.at(-1), /^release create v1\.15\.1 --repo someone\/almivisibility-releases .*AlmiVisibility-Setup\.exe .*AlmiVisibility-1\.15\.1\.zip .*manifest\.json$/);
  calls.length = 0; publishRelease({ version: "1.15.1", out: "C:/rel", owner: "someone", run: run(true) });
  assert.ok(!calls.some((c) => c.startsWith("repo create")), "the repo was made twice");
  assert.match(publishRelease({ version: "1.15.1", out: "x", owner: "s", run: (a) => (a[0] === "auth" ? 1 : 0) }).why, /gh auth login/);
  assert.ok(!calls.some((c) => /pem|private/i.test(c)), "a key file was uploaded");
});
