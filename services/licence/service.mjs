/**
 * 🔴 ALMIWORLD'S LICENCE SERVICE (RR-298 B; owner decision 3). LOCAL ONLY in this round — it is NOT deployed (deploy needs the owner's
 * GREEN). It keeps each client account's plan from Stripe's subscription events and answers the app with a SIGNED licence.
 *   · Stripe events arrive at POST /v1/stripe/webhook and are trusted only when their Stripe-Signature verifies (HMAC-SHA256 with the
 *     endpoint's secret, named STRIPE_WEBHOOK_SECRET; 5-minute tolerance). The plan is read from the price's lookup key (visibility_1 …).
 *   · GET /v1/licence?account=… answers { licence, signature } signed with the service's Ed25519 key (its file named by
 *     LICENCE_SIGNING_KEY_FILE). An unknown account gets NO_PLAN — there is no free trial.
 *   · POST /v1/checkout creates a Stripe Checkout session in TEST MODE only, with the key named STRIPE_SECRET_KEY; with no key in the
 *     environment it answers DEFERRED and names the missing key — never asks for it, never prints it.
 * Keys are referred to by NAME only: no value is printed, logged or hashed.
 */
import { createHmac, timingSafeEqual, sign, createPrivateKey, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { PLANS, licenceBytes, OWNER } from "../../desktop/licence.mjs";

export const KEY_NAMES = Object.freeze({ webhookSecret: "STRIPE_WEBHOOK_SECRET", stripeSecret: "STRIPE_SECRET_KEY", signingKeyFile: "LICENCE_SIGNING_KEY_FILE" });
const TOLERANCE_S = 300;

/** Verify a Stripe-Signature header ("t=…,v1=…") over the raw body, the way Stripe signs webhook events. */
export function verifyStripeSignature({ header, body, secret, nowS }) {
  if (!secret || typeof header !== "string") return { ok: false, why: "no signature or no secret" };
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")).filter((x) => x.length === 2));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowS - t) > TOLERANCE_S) return { ok: false, why: "the signature's time is outside the tolerance" };
  const want = createHmac("sha256", secret).update(`${t}.${body}`).digest();
  const v1 = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => Buffer.from(kv.slice(3), "hex"));
  return v1.some((s) => s.length === want.length && timingSafeEqual(s, want)) ? { ok: true, why: null } : { ok: false, why: "the signature does not match" };
}

const STATUS = { active: "ACTIVE", trialing: "ACTIVE", past_due: "PAST_DUE", unpaid: "PAST_DUE", canceled: "CANCELED", incomplete: "PAST_DUE", incomplete_expired: "CANCELED" };
/**
 * RR-303 A · THE ALMIWORLD WAY (almi-billing-router README; almi-oet src/lib/billing): every Stripe event reaches the product through the
 * network's ONE event destination, the router, which forwards it signed with the product's own secret (X-Almi-Router-Signature,
 * "t=…,v1=…", HMAC-SHA256 over "t.body", 5-minute replay guard; the secret named ROUTER_WEBHOOK_SECRET).
 */
export const ROUTER_KEY_NAME = "ROUTER_WEBHOOK_SECRET";
export function verifyRouterSignature({ header, body, secret, nowS }) {
  if (!secret || typeof header !== "string") return { ok: false, why: "no router signature or no secret" };
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")).filter((x) => x.length === 2));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(nowS - t) > TOLERANCE_S) return { ok: false, why: "the router signature's time is outside the tolerance" };
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  const got = Buffer.from(parts.v1);
  return got.length === want.length && timingSafeEqual(got, want) ? { ok: true, why: null } : { ok: false, why: "the router signature does not match" };
}
/** The Stripe price ids of the four plans, each in the variable NAMED here (almi-oet's STRIPE_PRICE_ID_* pattern) — never a literal id. */
export const PRICE_ENV = Object.freeze({ visibility_1: "STRIPE_PRICE_ID_VISIBILITY_1", visibility_5: "STRIPE_PRICE_ID_VISIBILITY_5", visibility_10: "STRIPE_PRICE_ID_VISIBILITY_10", visibility_unlimited: "STRIPE_PRICE_ID_VISIBILITY_UNLIMITED" });
const isPlan = (id) => PLANS.some((p) => p.id === id);
/** The plan of a subscription: the plan our checkout stamped in its metadata, else the price's lookup key, else its price id by the env map. */
export function planOf(o, env = process.env) {
  if (isPlan(o?.metadata?.plan)) return o.metadata.plan;
  const price = o?.items?.data?.[0]?.price;
  if (isPlan(price?.lookup_key)) return price.lookup_key;
  const hit = Object.entries(PRICE_ENV).find(([, name]) => env[name] && env[name] === price?.id);
  return hit ? hit[0] : null;
}
const periodEndOf = (o) => new Date(((o.current_period_end ?? o.items?.data?.[0]?.current_period_end) ?? 0) * 1000).toISOString();

/**
 * Apply one verified Stripe event to the accounts. Returns the account changed, or null for an event this service does not use.
 * A subscription that is paid makes the licence ACTIVE; a cancel makes it CANCELED; a failed payment makes it PAST_DUE — either ends it.
 */
export function applyEvent(accounts, event, { env = process.env } = {}) {
  const o = event?.data?.object ?? {};
  const bySubscription = (id) => (id ? Object.keys(accounts).find((a) => accounts[a].subscription === id) ?? null : null);
  if (event.type === "invoice.payment_failed") {
    const meta = o.subscription_details?.metadata ?? o.parent?.subscription_details?.metadata ?? {};
    const sub = typeof o.subscription === "string" ? o.subscription : o.parent?.subscription_details?.subscription ?? null;
    const account = meta.almiworld_account ?? bySubscription(sub);
    if (!account || !accounts[account] || accounts[account].kind === OWNER.kind) return null;
    accounts[account] = { ...accounts[account], status: "PAST_DUE" };
    return account;
  }
  const account = o.metadata?.almiworld_account ?? o.client_reference_id ?? null;
  /* RR-304: no Stripe event ever changes the owner licence */
  if (!account || accounts[account]?.kind === OWNER.kind) return null;
  if (event.type === "checkout.session.completed") {
    /* the link only: the session names the account and its subscription; the licence turns ACTIVE on the subscription's own event */
    const plan = isPlan(o.metadata?.plan) ? o.metadata.plan : null;
    if (!plan) return null;
    accounts[account] = { plan, status: accounts[account]?.status ?? "PENDING", periodEnd: accounts[account]?.periodEnd ?? new Date(0).toISOString(), subscription: o.subscription ?? accounts[account]?.subscription ?? null };
    return account;
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const plan = planOf(o, env);
    if (!plan) return null;
    accounts[account] = { plan, status: event.type === "customer.subscription.deleted" ? "CANCELED" : STATUS[o.status] ?? "PAST_DUE", periodEnd: periodEndOf(o), subscription: o.id ?? null };
    return account;
  }
  return null;
}

/** The signed licence of an account. */
export function signedLicence({ accounts, account, privateKeyPem, now }) {
  const a = accounts[account];
  /* RR-304: an OWNER licence answers as itself — unlimited, no expiry — ACTIVE, or REVOKED from the admin */
  if (a?.kind === OWNER.kind) {
    const licence = { account, kind: OWNER.kind, licensee: a.licensee, plan: OWNER.plan, status: a.status === "REVOKED" ? "REVOKED" : "ACTIVE", periodEnd: null, issuedAt: new Date(now).toISOString() };
    return { licence, signature: sign(null, licenceBytes(licence), createPrivateKey(privateKeyPem)).toString("base64") };
  }
  const licence = a ? { account, plan: a.plan, status: a.status, periodEnd: a.periodEnd, issuedAt: new Date(now).toISOString() } : { account, plan: null, status: "NO_PLAN", periodEnd: new Date(0).toISOString(), issuedAt: new Date(now).toISOString() };
  return { licence, signature: sign(null, licenceBytes(licence), createPrivateKey(privateKeyPem)).toString("base64") };
}

/**
 * RR-304 · make the OWNER licence, signed with the licence signing key: a new random licence id (av_owner_…), licensee "AlmiWorld (owner)",
 * the unlimited plan, ACTIVE, no expiry. Returns the signed licence; ownerLicenceText() turns it into the text the owner pastes.
 */
export function makeOwnerLicence({ privateKeyPem, now }) {
  const licence = { account: `av_owner_${randomBytes(18).toString("base64url")}`, kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: new Date(now).toISOString() };
  return { licence, signature: sign(null, licenceBytes(licence), createPrivateKey(privateKeyPem)).toString("base64") };
}
/** The site's record of a verified owner licence (what the admin lists and can revoke). */
export const ownerRecord = (licence) => ({ kind: OWNER.kind, licensee: licence.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, subscription: null });

/** The HTTP service, bound to 127.0.0.1 only. `env` is read by key NAME; `dataDir` holds its accounts file. */
export function licenceService({ env = process.env, dataDir, now = () => Date.now() }) {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, "accounts.json");
  const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
  const save = (a) => { writeFileSync(`${file}.tmp`, JSON.stringify(a, null, 1)); renameSync(`${file}.tmp`, file); };
  const keyFile = env[KEY_NAMES.signingKeyFile];
  const server = createServer((req, res) => {
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (req.method === "POST" && url.pathname === "/v1/stripe/webhook") {
        const v = verifyStripeSignature({ header: req.headers["stripe-signature"], body, secret: env[KEY_NAMES.webhookSecret], nowS: Math.floor(now() / 1000) });
        if (!v.ok) return send(400, { refused: v.why });
        const accounts = load();
        const changed = applyEvent(accounts, JSON.parse(body));
        if (changed) save(accounts);
        return send(200, { received: true, account: changed });
      }
      if (req.method === "GET" && url.pathname === "/v1/licence") {
        if (!keyFile || !existsSync(keyFile)) return send(503, { deferred: `the licence signing key is not configured (${KEY_NAMES.signingKeyFile})` });
        return send(200, signedLicence({ accounts: load(), account: url.searchParams.get("account"), privateKeyPem: readFileSync(keyFile, "utf8"), now: now() }));
      }
      if (req.method === "POST" && url.pathname === "/v1/checkout") {
        if (!env[KEY_NAMES.stripeSecret]) return send(503, { deferred: `DEFERRED — no Stripe test key in the environment (${KEY_NAMES.stripeSecret}); the live Stripe check was not run` });
        if (!String(env[KEY_NAMES.stripeSecret]).startsWith("sk_test_")) return send(403, { refused: "only a Stripe TEST-mode key is accepted in this round" });
        return send(501, { deferred: "the checkout call to Stripe is an outside call — not made in this round" });
      }
      send(404, { refused: "not found" });
    });
  });
  return { listen: (port = 0) => new Promise((r) => server.listen(port, "127.0.0.1", () => r(server.address().port))), close: () => new Promise((r) => server.close(r)) };
}
