/**
 * RR-338 · THE SALES SITE (owner GREEN, 28 Oct 2026): everything public-lite has, PLUS selling — and the owner's three decisions.
 * The buyer's whole path, LOCAL: Stripe and the billing router are answered IN THIS PROCESS by stand-ins; every key is a fake made here.
 *   home (the marketing lines) → /pricing (4 plans, the tax line) → Buy → checkout with Stripe Tax and a promotion-code field →
 *   /buy/success (the licence key) → router-signed events → a SIGNED licence ACTIVE → cancel ENDS it.
 *   A live key before VISIBILITY_BILLING_LIVE=yes: refused, and the buyer reads "Buying opens soon". Admin stays hidden.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, modeOf, isSalesPath, launchVarsOf } from "../site/app.mjs";
import { checkoutFields } from "../site/billing.mjs";
import { MARKETING } from "../site/pages.mjs";
import { licenceState } from "../desktop/licence.mjs";
import { FUNCTION_SALES } from "../tools/bundle-site.mjs";
import { makeRelease, nextSteps, SETUP_NAME } from "../site/owner-release.mjs";
import { verifyManifest } from "../desktop/updater.mjs";

const ROUTER = "fake-router-secret-for-this-test-only";
const keys = generateKeyPairSync("ed25519");
const PRIV = keys.privateKey.export({ type: "pkcs8", format: "pem" }), PUB = keys.publicKey.export({ type: "spki", format: "pem" });
const ENV = { STRIPE_SECRET_KEY: "sk_test_fakeForThisTestOnly", STRIPE_PRICE_ID_VISIBILITY_1: "price_fake1", STRIPE_PRICE_ID_VISIBILITY_5: "price_fake5", STRIPE_PRICE_ID_VISIBILITY_10: "price_fake10", STRIPE_PRICE_ID_VISIBILITY_UNLIMITED: "price_fakeU", ROUTER_WEBHOOK_SECRET: ROUTER, LICENCE_SIGNING_KEY: PRIV, VISIBILITY_SETUP_URL: "https://github.com/o/almivisibility-releases/releases/latest/download/AlmiVisibility-Setup.exe", VISIBILITY_UPDATE_BASE_URL: "https://github.com/o/almivisibility-releases/releases/latest/download/" };

async function salesSite(env) {
  const dir = mkdtempSync(join(tmpdir(), "rr338-")), calls = [];
  const stripeFetch = async (url, init) => { calls.push({ url: String(url), init }); return String(url) === "https://api.stripe.com/v1/checkout/sessions" ? new Response(JSON.stringify({ id: "cs_test_338", url: "https://checkout.stripe.com/c/pay/cs_test_338" }), { status: 200 }) : new Response("{}", { status: 404 }); };
  const h = createApp({ mode: "sales", env, dataDir: dir, stripeFetch, fetchImpl: async () => new Response("", { status: 404 }), kvFetch: async () => new Response("", { status: 500 }) });
  const srv = createServer((q, r) => { h(q, r); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${srv.address().port}`, calls, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const form = (o) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o).toString(), redirect: "manual" });
const routed = (base, event, secret = ROUTER) => { const body = JSON.stringify(event); const t = Math.floor(Date.now() / 1000); return fetch(`${base}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "x-almi-router-signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}` }, body }); };

test("RR-338 · the mode: sales is its own; the Vercel function fixes it; only the selling paths reach the full handler", () => {
  assert.equal(modeOf({}, "sales"), "sales");
  assert.equal(modeOf({ VERCEL: "1" }), "public-lite");
  assert.equal(modeOf({ VISIBILITY_SITE_MODE: "anything" }), "public-lite");
  assert.match(FUNCTION_SALES, /createApp\(\{ mode: "sales" \}\)/);
  for (const [m, p] of [["GET", "/pricing"], ["POST", "/api/billing/checkout"], ["POST", "/api/webhooks/stripe"], ["GET", "/v1/licence"], ["GET", "/updates/manifest.json"], ["GET", "/updates/packages/AlmiVisibility-1.15.0.zip"]]) assert.ok(isSalesPath(m, p), `${m} ${p}`);
  for (const [m, p] of [["GET", "/admin"], ["POST", "/admin/login"], ["GET", "/admin/sales"], ["GET", "/free-test"], ["GET", "/features"], ["GET", "/unsubscribe"], ["GET", "/updates/../x"]]) assert.ok(!isSalesPath(m, p), `${m} ${p}`);
});

test("RR-338 · checkout: Stripe Tax on, the address and a VAT number asked, a promotion-code field; still no trial and a card always", () => {
  const f = checkoutFields({ plan: "visibility_1", priceId: "price_x", licenceKey: "av_k", origin: "https://o.example" });
  assert.deepEqual([f["automatic_tax[enabled]"], f.billing_address_collection, f["tax_id_collection[enabled]"], f.allow_promotion_codes, f.payment_method_collection], ["true", "required", "true", "true", "always"]);
  assert.ok(!Object.keys(f).some((k) => /trial/.test(k)));
});

test("RR-338 · THE BUYER'S PATH on the sales site (local, Stripe and the router answered in-process)", async () => {
  const a = await salesSite(ENV);
  try {
    const home = await (await fetch(`${a.base}/`)).text();
    assert.ok(home.includes(MARKETING.headline) && home.includes(MARKETING.data), "the marketing lines");
    assert.ok(!/guarantee/i.test(home), "never 'guaranteed'");
    assert.ok(home.includes('href="/pricing"') && home.includes('href="/download"') && !home.includes('href="/features"') && !home.includes('href="/free-test"'), "the nav opens only pages this site has");
    assert.ok(home.includes('id="score"') && home.includes('id="keywords"'), "the free score and the keyword finder stay");
    const pricing = await fetch(`${a.base}/pricing`), pt = await pricing.text();
    assert.equal(pricing.status, 200);
    for (const p of ["$30", "$40", "$60", "$80"]) assert.ok(pt.includes(`${p}<small> / month`), p);
    assert.match(pt, /Prices exclude VAT and sales tax/);
    assert.match(pt, /promotion code/);
    assert.ok(!/href="\/#test"/.test(pt), "a link to a section this site does not have");
    const buy = await fetch(`${a.base}/api/billing/checkout`, form({ plan: "visibility_1" }));
    assert.deepEqual([buy.status, buy.headers.get("location")], [303, "https://checkout.stripe.com/c/pay/cs_test_338"]);
    const sent = new URLSearchParams(a.calls[0].init.body), key = sent.get("metadata[almiworld_account]");
    assert.deepEqual([sent.get("line_items[0][price]"), sent.get("automatic_tax[enabled]"), sent.get("allow_promotion_codes"), sent.get("metadata[product]")], ["price_fake1", "true", "true", "almi-visibility"]);
    const ok = await (await fetch(`${a.base}/buy/success?session_id=cs_test_338`)).text();
    assert.ok(ok.includes(key) && ok.includes('href="/pricing"'), "the licence key, in the sales frame");
    const licence = async () => licenceState({ now: Date.now(), check: { reached: true, signed: await (await fetch(`${a.base}/v1/licence?account=${key}`)).json() }, publicKeyPem: PUB });
    assert.equal((await licence()).state, "NO_PLAN");
    const sub = (status) => ({ id: "sub_338", status, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: key }, items: { data: [{ price: { id: "price_fake1" } }] } });
    assert.equal((await routed(a.base, { type: "checkout.session.completed", data: { object: { id: "cs_test_338", subscription: "sub_338", client_reference_id: key, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: key } } } })).status, 200);
    assert.equal((await routed(a.base, { type: "customer.subscription.created", data: { object: sub("active") } })).status, 200);
    const on = await licence();
    assert.deepEqual([on.state, on.plan?.id], ["ACTIVE", "visibility_1"]);
    assert.equal((await routed(a.base, { type: "customer.subscription.deleted", data: { object: sub("canceled") } }, "a-wrong-secret")).status, 400, "a forged event");
    assert.equal((await routed(a.base, { type: "customer.subscription.deleted", data: { object: sub("canceled") } })).status, 200);
    assert.equal((await licence()).state, "ENDED");
    /* download and updates: the GitHub release */
    const dl = await fetch(`${a.base}/download/AlmiVisibility-Setup.exe`, { redirect: "manual" });
    assert.deepEqual([dl.status, dl.headers.get("location")], [302, ENV.VISIBILITY_SETUP_URL]);
    const pk = await fetch(`${a.base}/updates/packages/AlmiVisibility-1.15.0.zip`, { redirect: "manual" });
    assert.equal(pk.headers.get("location"), `${ENV.VISIBILITY_UPDATE_BASE_URL}AlmiVisibility-1.15.0.zip`);
    assert.equal((await fetch(`${a.base}/updates/manifest.json`, { redirect: "manual" })).headers.get("location"), `${ENV.VISIBILITY_UPDATE_BASE_URL}manifest.json`);
    assert.match(await (await fetch(`${a.base}/sitemap.xml`)).text(), /\/pricing<\/loc>[\s\S]*\/download<\/loc>/);
    /* admin, the old free test and unsubscribe stay hidden */
    for (const p of ["/admin", "/admin/sales", "/free-test", "/features", "/unsubscribe?t=x"]) assert.equal((await fetch(`${a.base}${p}`, { redirect: "manual" })).status, 404, p);
    assert.equal((await fetch(`${a.base}/admin/login`, form({ email: "a@b.c", password: "x" }))).status, 404);
  } finally { a.close(); }
});

test("RR-338 · a LIVE key before VISIBILITY_BILLING_LIVE=yes: nothing reaches Stripe and the buyer reads 'Buying opens soon'", async () => {
  const a = await salesSite({ ...ENV, STRIPE_SECRET_KEY: "sk_live_fakeForThisTestOnly" });
  try {
    const r = await fetch(`${a.base}/api/billing/checkout`, form({ plan: "visibility_5" })), t = await r.text();
    assert.equal(r.status, 400);
    assert.match(t, /Buying opens soon/);
    assert.match(t, /Nothing was charged/);
    assert.equal(a.calls.length, 0, "Stripe was called");
  } finally { a.close(); }
  const b = await salesSite({ ...ENV, STRIPE_SECRET_KEY: "sk_live_fakeForThisTestOnly", VISIBILITY_BILLING_LIVE: "yes" });
  try { assert.equal((await fetch(`${b.base}/api/billing/checkout`, form({ plan: "visibility_5" }))).status, 303, "with the owner's switch on, checkout opens"); } finally { b.close(); }
});

test("RR-338 · /owner launch settings: the database row is set by the Neon DATABASE_URL too; the Setup and update links are needed", () => {
  const rows = launchVarsOf({ DATABASE_URL: "postgres://u@h/db" });
  assert.equal(rows.find((r) => r.name.startsWith("VISIBILITY_SITE_DATABASE_URL")).set, true);
  for (const n of ["VISIBILITY_SETUP_URL", "VISIBILITY_UPDATE_BASE_URL"]) assert.equal(rows.find((r) => r.name === n).needed, true, n);
  assert.equal(rows.find((r) => r.name === "SITE_ADMIN_PASSWORD_HASH").needed, false, "admin is hidden on the sales site");
});

test("RR-338 · the owner's release tool: three files, a manifest signed AND verified, the private key never in the output", () => {
  const root = mkdtempSync(join(tmpdir(), "rr338rel-")), from = join(root, "built"), k = join(root, "keys"), out = join(root, "release");
  try {
    mkdirSync(from); mkdirSync(k);
    writeFileSync(join(from, "AlmiVisibility-Setup-1.15.0.exe"), "setup-bytes"); writeFileSync(join(from, "AlmiVisibility-1.15.0.zip"), "zip-bytes");
    const u = generateKeyPairSync("ed25519"), upub = u.publicKey.export({ type: "spki", format: "pem" }), upriv = u.privateKey.export({ type: "pkcs8", format: "pem" });
    writeFileSync(join(k, "update-private.pem"), upriv); writeFileSync(join(k, "update-public.pem"), upub);
    const r = makeRelease({ from, keys: k, out });
    assert.deepEqual([r.ok, r.version, r.files], [true, "1.15.0", [SETUP_NAME, "AlmiVisibility-1.15.0.zip", "manifest.json"]]);
    const m = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
    assert.equal(m.package, "packages/AlmiVisibility-1.15.0.zip");
    assert.ok(verifyManifest(m, upub));
    for (const f of r.files) assert.ok(!readFileSync(join(out, f), "latin1").includes("PRIVATE KEY"), f);
    assert.match(makeRelease({ from, keys: k, out }).why, /not empty/);
    const other = generateKeyPairSync("ed25519");
    writeFileSync(join(k, "update-public.pem"), other.publicKey.export({ type: "spki", format: "pem" }));
    assert.match(makeRelease({ from, keys: k, out: join(root, "r2") }).why, /not a pair/);
    assert.ok(!existsSync(join(root, "r2")), "a refused release writes nothing");
    const steps = nextSteps({ version: "1.15.0", out, owner: "someone" }).join("\n");
    assert.match(steps, /VISIBILITY_SETUP_URL = https:\/\/github\.com\/someone\/almivisibility-releases\/releases\/latest\/download\/AlmiVisibility-Setup\.exe/);
    assert.ok(!steps.includes("PRIVATE"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
