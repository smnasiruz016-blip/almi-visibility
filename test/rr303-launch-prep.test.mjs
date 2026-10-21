/* RR-303 · launch prep, LOCAL only: buying through the AlmiWorld billing router's way (checkout → licence key → router-signed events →
 * a signed licence ACTIVE → cancel / failed payment ends it), the full-report email (Resend; told only what happened; unsubscribe), the
 * family list from almi-data (generated, never typed), the Vercel bundle. Stripe and Resend are answered IN THIS PROCESS by stand-ins:
 * nothing leaves the machine, and every key here is a fake made for the test. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { checkoutFields, createCheckout, PRODUCT_ID } from "../site/billing.mjs";
import { reportEmail } from "../site/email.mjs";
import { FAMILY, FAMILY_PRODUCTS, familyStrip } from "../site/family.mjs";
import { familyFromPackage } from "../tools/family-from-almi-data.mjs";
import { siteFiles, VERCEL_JSON } from "../tools/bundle-site.mjs";
import { licenceState } from "../desktop/licence.mjs";
import { PILOT_CHANNELS } from "../config/youtube/pilot-channels.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ROUTER = "fake-router-secret-for-this-test-only";
const keys = generateKeyPairSync("ed25519");
const PRIV = keys.privateKey.export({ type: "pkcs8", format: "pem" }), PUB = keys.publicKey.export({ type: "spki", format: "pem" });
const ENV = { STRIPE_SECRET_KEY: "sk_test_fakeForThisTestOnly", STRIPE_PRICE_ID_VISIBILITY_1: "price_fake1", STRIPE_PRICE_ID_VISIBILITY_5: "price_fake5", STRIPE_PRICE_ID_VISIBILITY_10: "price_fake10", STRIPE_PRICE_ID_VISIBILITY_UNLIMITED: "price_fakeU", ROUTER_WEBHOOK_SECRET: ROUTER, LICENCE_SIGNING_KEY: PRIV, VISIBILITY_SITE_DATABASE_URL: "" };
const RESULT = { url: "https://x.example/", testedOn: "2026-10-21T10:00:00Z", pagesRead: 4, pagesLimit: 10, skipped: [], score: 81, byCategory: { TECHNICAL: 90, CONTENT: 70, ACCESSIBILITY: 100, LINKS: null, SECURITY: null }, measured: ["title"], notMeasured: ["https-only — needs x"], nextActions: [{ check: "one-h1", action: "keep one h1", pages: 1 }], noPromise: "no promise" };

/** Run the app on 127.0.0.1 with its own data folder; `outside` answers every call the app makes to Stripe or Resend. */
async function app(env, outside) {
  const dir = mkdtempSync(join(tmpdir(), "rr303-"));
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url: String(url), init }); return outside(String(url), init); };
  const h = createApp({ env, dataDir: dir, fetchImpl, freeTest: async ({ url }) => ({ ...RESULT, url }) });
  const srv = createServer((q, r) => { h(q, r); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, dir, calls, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const form = (o) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o).toString(), redirect: "manual" });
const routed = (base, event, secret = ROUTER) => { const body = JSON.stringify(event); const t = Math.floor(Date.now() / 1000); return fetch(`${base}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "x-almi-router-signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}` }, body }); };

test("A · CHECKOUT the AlmiWorld way: metadata.product names the router's product, the plan and the licence key travel on the session AND the subscription; a card always; no trial; test key only; no key → DEFERRED, named", async () => {
  const f = checkoutFields({ plan: "visibility_5", priceId: "price_x", licenceKey: "av_k", origin: "https://o.example" });
  assert.deepEqual([f.mode, f["metadata[product]"], f["subscription_data[metadata][product]"], f["subscription_data[metadata][plan]"], f["subscription_data[metadata][almiworld_account]"], f.payment_method_collection, f.client_reference_id], ["subscription", PRODUCT_ID, "almi-visibility", "visibility_5", "av_k", "always", "av_k"]);
  assert.ok(!Object.keys(f).some((k) => /trial/.test(k)), "a trial field was sent");
  assert.match(f.success_url, /\/buy\/success\?session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.match((await createCheckout({ plan: "visibility_1", env: {}, origin: "x" })).why, /\(STRIPE_SECRET_KEY\)/);
  assert.equal((await createCheckout({ plan: "visibility_1", env: { ...ENV, STRIPE_SECRET_KEY: "sk_live_x" }, origin: "x" })).state, "REFUSED");
  assert.match((await createCheckout({ plan: "visibility_1", env: { STRIPE_SECRET_KEY: "sk_test_x" }, origin: "x" })).why, /\(STRIPE_PRICE_ID_VISIBILITY_1\)/);
  assert.equal((await createCheckout({ plan: "free", env: ENV, origin: "x" })).state, "REFUSED");
});

test("A · END TO END (local; Stripe answered in-process): Buy → a checkout → the licence key on the success page → router-signed events → a SIGNED licence ACTIVE in the app → cancel ENDS it; a failed payment ends it; a forged event changes nothing", async () => {
  const a = await app(ENV, async (url) => (url === "https://api.stripe.com/v1/checkout/sessions" ? new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }), { status: 200 }) : new Response("{}", { status: 404 })));
  try {
    const buy = await fetch(`${a.base}/api/billing/checkout`, form({ plan: "visibility_10" }));
    assert.deepEqual([buy.status, buy.headers.get("location")], [303, "https://checkout.stripe.com/c/pay/cs_test_1"]);
    const sent = new URLSearchParams(a.calls[0].init.body);
    assert.deepEqual([sent.get("line_items[0][price]"), sent.get("metadata[product]"), a.calls[0].init.headers.Authorization.startsWith("Bearer sk_test_")], ["price_fake10", "almi-visibility", true]);
    const key = sent.get("metadata[almiworld_account]");
    assert.match(key, /^av_[A-Za-z0-9_-]{20,}$/);
    const ok = await (await fetch(`${a.base}/buy/success?session_id=cs_test_1`)).text();
    assert.ok(ok.includes(key), "the success page does not show the licence key");
    assert.equal((await fetch(`${a.base}/buy/success?session_id=cs_unknown`)).status, 404);
    const licence = async () => licenceState({ now: Date.now(), check: { reached: true, signed: await (await fetch(`${a.base}/v1/licence?account=${key}`)).json() }, publicKeyPem: PUB });
    assert.equal((await licence()).state, "NO_PLAN", "a licence before payment");
    const sub = (status, extra = {}) => ({ id: "sub_1", status, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: { product: "almi-visibility", plan: "visibility_10", almiworld_account: key }, items: { data: [{ price: { id: "price_fake10" } }] }, ...extra });
    assert.equal((await routed(a.base, { type: "checkout.session.completed", data: { object: { id: "cs_test_1", subscription: "sub_1", client_reference_id: key, metadata: { product: "almi-visibility", plan: "visibility_10", almiworld_account: key } } } })).status, 200);
    assert.equal((await licence()).state, "PENDING", "the paid checkout is not shown as being confirmed");
    assert.equal((await routed(a.base, { type: "customer.subscription.created", data: { object: sub("active") } })).status, 200);
    const on = await licence();
    assert.deepEqual([on.state, on.mayStartNewWork, on.plan?.id], ["ACTIVE", true, "visibility_10"]);
    /* a forged event (wrong secret) is refused and changes nothing */
    assert.equal((await routed(a.base, { type: "customer.subscription.deleted", data: { object: sub("canceled") } }, "a-wrong-secret")).status, 400);
    assert.equal((await licence()).state, "ACTIVE");
    /* a failed payment ends it */
    assert.equal((await routed(a.base, { type: "invoice.payment_failed", data: { object: { subscription: "sub_1" } } })).status, 200);
    assert.equal((await licence()).state, "ENDED");
    assert.equal((await routed(a.base, { type: "customer.subscription.updated", data: { object: sub("active") } })).status, 200);
    assert.equal((await licence()).state, "ACTIVE", "a paid-again subscription did not come back");
    /* cancel ends it */
    assert.equal((await routed(a.base, { type: "customer.subscription.deleted", data: { object: sub("canceled") } })).status, 200);
    assert.equal((await licence()).state, "ENDED");
    assert.equal(a.calls.length, 1, "the app called outside more than the one checkout");
  } finally { a.close(); }
});

test("B · THE REPORT EMAIL: no key → no email box anywhere (no promise); with the key the email goes through Resend with an unsubscribe link and header, and the visitor is told it was emailed; a failed send is said plainly; never \"we have your request\"; unsubscribe needs a button press", async () => {
  const off = await app(ENV, async () => new Response("{}", { status: 500 }));
  try {
    for (const p of ["/", "/free-test"]) assert.doesNotMatch(await (await fetch(`${off.base}${p}`)).text(), /name="email"|name="marketing"/, `${p} asks for an email it cannot send`);
    const r = await (await fetch(`${off.base}/free-test`, form({ url: "93.184.216.34", email: "a@example.com" }))).text();
    assert.ok(!/emailed|we have your request/i.test(r), "a page promised an email with sending off");
  } finally { off.close(); }
  const on = await app({ ...ENV, RESEND_API_KEY: "re_fakeForThisTestOnly" }, async (url) => (url === "https://api.resend.com/emails" ? new Response(JSON.stringify({ id: "email_1" }), { status: 200 }) : new Response("{}", { status: 404 })));
  try {
    const home = await (await fetch(`${on.base}/`)).text();
    assert.match(home, /name="email"/); assert.match(home, /<input type="checkbox" name="marketing" value="yes"> /);
    const page = await (await fetch(`${on.base}/free-test`, form({ url: "93.184.216.34", email: "Visitor@Example.com", back: "/" }))).text();
    assert.match(page, /We have emailed your full report to <b>visitor@example\.com<\/b>\./);
    assert.doesNotMatch(page, /we have your request/i);
    const sent = JSON.parse(on.calls.find((c) => c.url === "https://api.resend.com/emails").init.body);
    assert.deepEqual([sent.to, sent.from], [["visitor@example.com"], "AlmiVisibility <almiworld@almiworld.com>"]);
    const unsub = /<(http:\/\/127\.0\.0\.1:\d+\/unsubscribe\?t=[^>]+)>/.exec(sent.headers["List-Unsubscribe"])[1];
    assert.ok(sent.html.includes(unsub.replace(/&/g, "&amp;")) && sent.text.includes(unsub), "the email has no unsubscribe link");
    const leads = () => JSON.parse(readFileSync(join(on.dir, "leads.json"), "utf8"));
    assert.deepEqual([leads()[0].marketing, leads()[0].reportEmailed], [false, true]);
    /* opening the link changes nothing; the button does */
    await fetch(unsub);
    assert.equal(leads()[0].unsubscribed, false, "opening the link unsubscribed (a mail scanner would)");
    assert.equal((await fetch(unsub, { method: "POST" })).status, 200);
    assert.equal(leads()[0].unsubscribed, true);
    assert.equal((await fetch(`${on.base}/unsubscribe?t=unknown`, { method: "POST" })).status, 404);
  } finally { on.close(); }
  const failing = await app({ ...ENV, RESEND_API_KEY: "re_fakeForThisTestOnly" }, async () => new Response("{}", { status: 500 }));
  try {
    const page = await (await fetch(`${failing.base}/free-test`, form({ url: "93.184.216.34", email: "v@example.com" }))).text();
    assert.match(page, /We could not send the email just now — nothing was sent\./);
  } finally { failing.close(); }
  const m = reportEmail({ result: RESULT, unsubscribeUrl: "https://u.example/x" });
  assert.ok(/Links: Not measured/.test(m.text) && !/Links: 0/.test(m.text), "a not-measured area became a number");
});

test("C · THE FAMILY LIST comes from almi-data (generated, with its version and file hash), Visibility omits itself; when almi-data is checked out beside this repo at the same version, the file is EXACTLY what the package exports", () => {
  assert.equal(FAMILY.source.package, "@smnasiruz016-blip/almi-data");
  assert.match(FAMILY.source.sha256, /^[0-9a-f]{64}$/);
  assert.ok(FAMILY.products.some((p) => p.key === "visibility"), "the list this file came from does not hold AlmiVisibility");
  assert.ok(!FAMILY_PRODUCTS.some((p) => /visibility/i.test(p.href)) && familyStrip().length === FAMILY_PRODUCTS.length + 4);
  const dir = join(REPO, "..", "almi-data");
  const built = existsSync(join(dir, "dist", "family.js")) && JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version === FAMILY.source.version;
  if (built) assert.deepEqual(familyFromPackage(dir), FAMILY, "site/family.generated.json is not what almi-data exports — re-run tools/family-from-almi-data.mjs");
});

test("D · the two YouTube pilot channels are registered by @handle; F · the Vercel bundle holds every module the site reaches and sends every path to one function; this repository's own vercel.json still deploys nothing", () => {
  assert.deepEqual(PILOT_CHANNELS.map((c) => [c.tier, c.handle]), [["T1", "@dhanakkiduniya"], ["T2", "@Almiworld-world"]]);
  const files = siteFiles();
  for (const f of ["site/app.mjs", "site/pages.mjs", "services/licence/service.mjs", "src/report/visibility-score.mjs", "site/family.generated.json", "installer/almiworld.ico"]) assert.ok(files.includes(f), f);
  assert.deepEqual(VERCEL_JSON.rewrites, [{ source: "/(.*)", destination: "/api/index" }]);
  assert.deepEqual(JSON.parse(readFileSync(join(REPO, "vercel.json"), "utf8")).git, { deploymentEnabled: false });
});

test("THE APP · the licence key is saved (a value that is not a key is refused, the key is never echoed); YouTube settings open any time for an existing product, offer the two pilot channels, take a key NAME only; no key → the tab says where to add it", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const { spawn } = await import("node:child_process");
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "rr303-app-"));
  const store = productStore(dir);
  store.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  const id = store.create({ name: "Fixture product", site: "https://fixture.invalid/p" }).id;
  /* the licence and update addresses point at nothing on this machine: no request leaves it */
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const env = { ...process.env }; delete env.YOUTUBE_API_KEY;
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  try {
    for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
    assert.equal((await post("/api/account", { licenceKey: "my-card-number" })).status, 400);
    const key = "av_fixtureLicenceKeyForThisTest01";
    const saved = await post("/api/account", { licenceKey: key });
    assert.equal(saved.status, 200);
    assert.ok(!(await saved.text()).includes(key) && !(await (await fetch(`${base}/api/home`)).text()).includes(key), "the licence key was echoed");
    assert.equal(JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).account, key);
    const y = await (await fetch(`${base}/api/products/${id}/youtube`)).json();
    /* RR-306 A3 (owner decision, 21 Oct 2026): no key NAME any more — the key is pasted in the app (Windows' secure store); the settings say only whether it is saved */
    assert.deepEqual([y.handle, y.key.saved, y.pilots.map((c) => c.handle)], ["", false, ["@dhanakkiduniya", "@Almiworld-world"]]);
    /* a key typed into an old name field is ignored — it is never stored in the product's settings */
    assert.equal((await post(`/api/products/${id}/youtube`, { handle: "@dhanakkiduniya", keyName: "AIzaFakeLookingValue123" })).status, 200);
    assert.ok(!readFileSync(join(dir, "products", id, "state.json"), "utf8").includes("AIzaFakeLookingValue123"), "a key was stored in the product's settings");
    assert.equal((await fetch(`${base}/api/products/..%2F..%2Fx/youtube`)).status >= 400, true, "an id outside the products folder was read");
    const views = await (await fetch(`${base}/api/products/${id}/views`)).json();
    assert.match(views.youtube[0], /Your YouTube key is not saved yet — paste it in YouTube settings\./);
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true }); }
});
