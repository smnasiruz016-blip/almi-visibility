/**
 * RR-340 (owner GREEN, 28 Oct 2026) · "MANAGE OR CANCEL MY PLAN": a buyer opens their OWN Stripe customer portal with their licence key —
 * on the site (/manage) and from the app (Your plan) — and never another buyer's. A switch in the portal changes the plan; a cancel ends
 * it (at the period's end). "No free trial" is gone from the site, the app, the services and the Terms.
 * Stripe and the billing router are answered IN THIS PROCESS; every key here is a fake made for the test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { portalSession, NO_PLAN_FOUND } from "../site/billing.mjs";
import { planOf } from "../services/licence/service.mjs";
import { licenceState, plansView } from "../desktop/licence.mjs";
import { browserOpener, STRIPE_BILLING_ORIGIN } from "../desktop/open-browser.mjs";
import * as P from "../site/pages.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ROUTER = "fake-router-secret-for-this-test-only";
const keys = generateKeyPairSync("ed25519");
const PRIV = keys.privateKey.export({ type: "pkcs8", format: "pem" }), PUB = keys.publicKey.export({ type: "spki", format: "pem" });
const ENV = { STRIPE_SECRET_KEY: "sk_test_fakeForThisTestOnly", STRIPE_PRICE_ID_VISIBILITY_1: "price_fake1", STRIPE_PRICE_ID_VISIBILITY_5: "price_fake5", STRIPE_PRICE_ID_VISIBILITY_10: "price_fake10", STRIPE_PRICE_ID_VISIBILITY_UNLIMITED: "price_fakeU", ROUTER_WEBHOOK_SECRET: ROUTER, LICENCE_SIGNING_KEY: PRIV, STRIPE_PORTAL_CONFIGURATION_VISIBILITY: "bpc_visibilityOwn1" };
const A = "av_buyerAaaaaaaaaaaaaaaaaaaaaaa", B = "av_buyerBbbbbbbbbbbbbbbbbbbbbbb";
/* Stripe, in this process: two subscriptions, each of its own customer and stamped with its own licence key */
const SUBS = { sub_A: { customer: "cus_A", metadata: { almiworld_account: A } }, sub_B: { customer: "cus_B", metadata: { almiworld_account: B } } };
function stripe(calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const m = /^https:\/\/api\.stripe\.com\/v1\/subscriptions\/(sub_\w+)$/.exec(String(url));
    if (m) return SUBS[m[1]] ? new Response(JSON.stringify({ id: m[1], ...SUBS[m[1]] }), { status: 200 }) : new Response("{}", { status: 404 });
    if (String(url) === "https://api.stripe.com/v1/billing_portal/sessions") { const c = new URLSearchParams(init.body).get("customer"); return new Response(JSON.stringify({ url: `https://billing.stripe.com/p/session/test_${c}` }), { status: 200 }); }
    return new Response("{}", { status: 404 });
  };
}
const routed = (base, event) => { const body = JSON.stringify(event); const t = Math.floor(Date.now() / 1000); return fetch(`${base}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "x-almi-router-signature": `t=${t},v1=${createHmac("sha256", ROUTER).update(`${t}.${body}`).digest("hex")}` }, body }); };
const sub = (id, key, status, price, extra = {}) => ({ id, status, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: key }, items: { data: [{ price: { id: price } }] }, ...extra });
async function site(env = ENV) {
  const dir = mkdtempSync(join(tmpdir(), "rr340-")), calls = [];
  const h = createApp({ mode: "sales", env, dataDir: dir, stripeFetch: stripe(calls), fetchImpl: async () => new Response("", { status: 404 }), kvFetch: async () => new Response("", { status: 500 }) });
  const srv = createServer((q, r) => { h(q, r); }); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${srv.address().port}`, calls, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const form = (o) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o).toString(), redirect: "manual" });

test("RR-340 · portalSession: only a stamped subscription of THIS key opens, for its own customer; every miss says the same words", async () => {
  const calls = [], f = stripe(calls), accounts = { [A]: { plan: "visibility_1", status: "ACTIVE", subscription: "sub_A" }, [B]: { plan: "visibility_5", status: "ACTIVE", subscription: "sub_B" }, av_noSubscriptionHereXXXXXXXXX: { plan: "visibility_1", status: "PENDING", subscription: null } };
  const r = await portalSession({ licenceKey: ` ${A} `, accounts, env: ENV, origin: "https://o.example", fetchImpl: f });
  assert.deepEqual(r, { ok: true, url: "https://billing.stripe.com/p/session/test_cus_A" });
  assert.equal(new URLSearchParams(calls[1].init.body).get("return_url"), "https://o.example/manage");
  assert.equal(new URLSearchParams(calls[1].init.body).get("configuration"), "bpc_visibilityOwn1", "the shared default portal");
  const { STRIPE_PORTAL_CONFIGURATION_VISIBILITY, ...noConfig } = ENV, before = calls.length;
  assert.equal((await portalSession({ licenceKey: A, accounts, env: noConfig, origin: "x", fetchImpl: f })).state, "DEFERRED", "without its own configuration, nothing opens");
  assert.equal(calls.length, before, "Stripe was asked without the configuration");
  for (const k of ["", "not-a-key", "av_unknownKeyUnknownKeyUnknown", "av_noSubscriptionHereXXXXXXXXX", "avo_ownerlicence"]) assert.deepEqual(await portalSession({ licenceKey: k, accounts, env: ENV, origin: "x", fetchImpl: f }), { ok: false, state: "NOT_FOUND", why: NO_PLAN_FOUND }, k);
  /* the store and Stripe disagree (A's key pointing at B's subscription): nothing opens */
  assert.equal((await portalSession({ licenceKey: A, accounts: { [A]: { subscription: "sub_B" } }, env: ENV, origin: "x", fetchImpl: f })).state, "NOT_FOUND");
  assert.equal((await portalSession({ licenceKey: A, accounts, env: { ...ENV, STRIPE_SECRET_KEY: "sk_live_fake" }, origin: "x", fetchImpl: f })).closed, true);
});

test("RR-340 · a switch in the portal changes the plan (the price decides, not the old metadata)", () => {
  assert.equal(planOf(sub("sub_A", A, "active", "price_fake5"), ENV), "visibility_5");
  assert.equal(planOf(sub("sub_A", A, "active", "price_unknown"), ENV), "visibility_1", "an unknown price falls back to the stamped plan");
});

test("RR-340 · THE SITE: buy → manage → the buyer's own portal; switch to 5; cancel at the period's end keeps it on, the end switches it off", async () => {
  const s = await site();
  try {
    for (const [key, id, price] of [[A, "sub_A", "price_fake1"], [B, "sub_B", "price_fake5"]]) {
      assert.equal((await routed(s.base, { type: "checkout.session.completed", data: { object: { id: `cs_${id}`, subscription: id, client_reference_id: key, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: key } } } })).status, 200);
      assert.equal((await routed(s.base, { type: "customer.subscription.created", data: { object: sub(id, key, "active", price) } })).status, 200);
    }
    const page = await (await fetch(`${s.base}/manage`)).text();
    assert.match(page, /<h1>Manage or cancel my plan<\/h1>/); assert.match(page, /name="licenceKey" type="password"/);
    const go = await fetch(`${s.base}/manage`, form({ licenceKey: A }));
    assert.deepEqual([go.status, go.headers.get("location")], [303, "https://billing.stripe.com/p/session/test_cus_A"]);
    const app = await fetch(`${s.base}/v1/manage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ licenceKey: B }) });
    assert.deepEqual(await app.json(), { ok: true, url: "https://billing.stripe.com/p/session/test_cus_B" });
    const wrong = await fetch(`${s.base}/manage`, form({ licenceKey: "av_guessGuessGuessGuessGuess01" }));
    assert.equal(wrong.status, 404); assert.ok((await wrong.text()).includes("No paid plan was found for this licence key"));
    const customers = s.calls.filter((c) => c.url.endsWith("/billing_portal/sessions")).map((c) => new URLSearchParams(c.init.body).get("customer"));
    assert.deepEqual(customers, ["cus_A", "cus_B"], "a portal for someone else's customer");
    assert.ok(!s.calls.some((c) => c.url.includes(A) || c.url.includes(B)), "a licence key in an address");
    const licence = async (k) => licenceState({ now: Date.now(), check: { reached: true, signed: await (await fetch(`${s.base}/v1/licence?account=${k}`)).json() }, publicKeyPem: PUB });
    assert.equal((await routed(s.base, { type: "customer.subscription.updated", data: { object: sub("sub_A", A, "active", "price_fake5") } })).status, 200);
    assert.equal((await licence(A)).plan?.id, "visibility_5", "the switch in the portal");
    assert.equal((await routed(s.base, { type: "customer.subscription.updated", data: { object: sub("sub_A", A, "active", "price_fake5", { cancel_at_period_end: true }) } })).status, 200);
    assert.equal((await licence(A)).state, "ACTIVE", "a cancel keeps the paid month");
    assert.equal((await routed(s.base, { type: "customer.subscription.deleted", data: { object: sub("sub_A", A, "canceled", "price_fake5") } })).status, 200);
    assert.equal((await licence(A)).state, "ENDED");
    assert.equal((await licence(B)).state, "ACTIVE", "the other buyer is untouched");
    assert.ok(P.pricing({ sales: true }).includes('<a href="/manage">Manage or cancel my plan</a>'));
    assert.ok(P.buySuccess({ licenceKey: A }, { sales: true }).includes('<a href="/manage">Manage or cancel my plan</a>'));
  } finally { s.close(); }
});

test("RR-340 · THE APP: Your plan → Manage or cancel my plan asks the site for THIS licence's portal; the browser may open Stripe's billing address only", async () => {
  const spawned = [], opener = browserOpener({ only: [STRIPE_BILLING_ORIGIN], spawnImpl: (f, a) => { spawned.push(a[0]); return { on() {}, unref() {} }; }, exists: () => true, chromePaths: ["chrome"] });
  assert.equal(opener("https://accounts.google.com/o/oauth2/v2/auth"), false);
  assert.equal(opener("https://evil.example/billing.stripe.com"), false);
  assert.equal(opener("https://billing.stripe.com/p/session/test_x"), "Chrome");
  assert.deepEqual(spawned, ["https://billing.stripe.com/p/session/test_x"]);
  const s = await site(), dir = mkdtempSync(join(tmpdir(), "rr340-app-"));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, licenceUrl: `${s.base}/`, updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    await routed(s.base, { type: "checkout.session.completed", data: { object: { id: "cs_A", subscription: "sub_A", client_reference_id: A, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: A } } } });
    for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
    assert.match((await (await post("/api/plan/manage", {})).json()).refused, /Add your licence key first/);
    assert.equal((await post("/api/account", { licenceKey: A })).status, 200);
    const m = await post("/api/plan/manage", {}), mj = await m.json();
    assert.equal(m.status, 200);
    assert.deepEqual([mj.opened, mj.url], [false, "https://billing.stripe.com/p/session/test_cus_A"], "tests never open a browser");
    const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
    assert.match(ui, /<button class="ghost" id="manage">Manage or cancel my plan<\/button>/);
  } finally { p.kill(); s.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("RR-340 · the owner's portal tool: AlmiVisibility's OWN configuration — the 4 plans only, cancel at the period's end, its Terms; never the key in a line", async () => {
  const { configFields, makePortalConfig, vercelStep } = await import("../site/owner-portal-config.mjs");
  const ids = ["price_1AAAAAAA", "price_1BBBBBBB", "price_1CCCCCCC", "price_1DDDDDDD"], KEY = "sk_live_SECRET_for_this_test", sent = [];
  const fake = async (url, o = {}) => { sent.push({ url: String(url), o }); if (o.headers.Authorization !== `Bearer ${KEY}`) return new Response("{}", { status: 401 });
    const m = /\/v1\/prices\/(price_\w+)$/.exec(String(url)); if (m) return new Response(JSON.stringify({ id: m[1], product: m[1] === "price_1DDDDDDD" ? "prod_U" : "prod_V", currency: "usd", recurring: { interval: "month" } }), { status: 200 });
    return new Response(JSON.stringify({ id: "bpc_made1" }), { status: 200 }); };
  const r = await makePortalConfig({ priceIds: ids, stripeKey: KEY, fetchImpl: fake });
  assert.deepEqual([r.ok, r.id], [true, "bpc_made1"], r.line);
  const body = new URLSearchParams(sent.at(-1).o.body);
  assert.deepEqual([body.get("features[subscription_cancel][mode]"), body.get("business_profile[terms_of_service_url]"), body.get("business_profile[privacy_policy_url]")], ["at_period_end", "https://almivisibility.almiworld.com/terms", "https://almivisibility.almiworld.com/privacy"]);
  const listed = [...body].filter(([k]) => /\[products\]\[\d+\]\[prices\]/.test(k)).map(([, v]) => v).sort();
  assert.deepEqual(listed, [...ids].sort(), "only the 4 AlmiVisibility prices may be switched to");
  assert.equal(Object.keys(configFields([])).some((k) => /trial/.test(k)), false);
  const wrong = await makePortalConfig({ priceIds: ids, stripeKey: "nope", fetchImpl: fake });
  assert.match(wrong.line, /refused the key \(401\)/);
  for (const x of [r, wrong]) assert.ok(!x.line.includes(KEY), x.line);
  assert.match(vercelStep("bpc_made1"), /STRIPE_PORTAL_CONFIGURATION_VISIBILITY = bpc_made1/);
});

test("RR-340 · 'no free trial' is gone (owner decision): the site, the app, the services and the Terms; the cancel line is true now", () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(join(REPO, d))) { const x = `${d}/${f}`; if (statSync(join(REPO, x)).isDirectory()) { if (f !== "lists" && f !== "brand") walk(x); } else if (/\.(mjs|html|json)$/.test(f)) files.push(x); } };
  for (const d of ["site", "desktop", "services"]) walk(d);
  /* desktop/describe.mjs only RECOGNISES other sites' "start a 14-day free trial" boilerplate in a client's pages */
  const hits = files.filter((f) => f !== "desktop/describe.mjs" && /free trial|no trial/i.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(hits, []);
  const terms = JSON.parse(readFileSync(join(REPO, "site", "legal.generated.json"), "utf8")).terms.map((b) => b.runs.map((r) => r.text).join("")).join("\n");
  assert.match(terms, /Try the free site score first, no card needed\./);
  assert.match(terms, /You may cancel at any time yourself, with “Manage or cancel my plan” on our website or in the app\./);
  assert.match(plansView().join("\n"), /cancel your plan at any time with “Manage or cancel my plan”/);
});
