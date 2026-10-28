/**
 * 🔴 RR-303 A · BUYING A PLAN, THE ALMIWORLD WAY (almi-oet src/lib/billing/stripe.ts; almi-billing-router README "new product").
 *   · The site's own server opens a Stripe Checkout session for the plan's price — the price id read from the variable NAMED for that plan
 *     (STRIPE_PRICE_ID_VISIBILITY_1/_5/_10/_UNLIMITED), the key from the variable named STRIPE_SECRET_KEY; neither is printed or logged.
 *   · The session carries metadata.product = "almi-visibility" (the router's registry id), the plan, and the buyer's new LICENCE KEY
 *     (metadata.almiworld_account, also on the subscription), so every later event routes to this product and names the licence.
 *   · A card is always collected. TEST MODE ONLY until the owner's launch GREEN: a live key is refused (RR-338: `closed`,
 *     and the buyer is told buying opens soon) until VISIBILITY_BILLING_LIVE=yes.
 *   · Stripe events arrive through the router at /api/webhooks/stripe (services/licence/service.mjs applies them).
 */
import { randomBytes } from "node:crypto";
import { PRICE_ENV } from "../services/licence/service.mjs";

export const PRODUCT_ID = "almi-visibility";
export const BILLING_KEY_NAMES = Object.freeze({ stripeSecret: "STRIPE_SECRET_KEY", testModeOnly: "VISIBILITY_BILLING_LIVE" });
export const newLicenceKey = () => `av_${randomBytes(18).toString("base64url")}`;

/** The checkout session's form fields (Stripe's form encoding). Pure — the test reads exactly what would be sent. */
export function checkoutFields({ plan, priceId, licenceKey, origin }) {
  return {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    payment_method_collection: "always",
    /* RR-338 (owner, 28 Oct 2026): Stripe Tax on — prices are tax-exclusive; the buyer's address is asked for the tax, and a business may
     * give its VAT number. A promotion-code field (only the codes the owner makes in Stripe work). */
    "automatic_tax[enabled]": "true",
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true",
    allow_promotion_codes: "true",
    success_url: `${origin}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: licenceKey,
    "metadata[product]": PRODUCT_ID,
    "metadata[plan]": plan,
    "metadata[almiworld_account]": licenceKey,
    "subscription_data[metadata][product]": PRODUCT_ID,
    "subscription_data[metadata][plan]": plan,
    "subscription_data[metadata][almiworld_account]": licenceKey,
  };
}

/**
 * RR-340 · "MANAGE OR CANCEL MY PLAN": the buyer's own Stripe customer portal. The buyer proves who they are with their licence key (a
 * random secret only they were shown); the key names ONE subscription in our store, Stripe names its customer, and the portal session is
 * for that customer only — no other buyer can be reached. Every miss answers the same words (a key is never confirmed or denied).
 * Returns { ok, url } or { ok: false, state, why }. `fetchImpl` is injected (tests answer it locally).
 */
export const PORTAL_CONFIG_NAME = "STRIPE_PORTAL_CONFIGURATION_VISIBILITY";
export const LICENCE_KEY_SHAPE = /^av_[A-Za-z0-9_-]{20,40}$/;
export const NO_PLAN_FOUND = "No paid plan was found for this licence key. Check the key (it starts with av_), or write to almiworld@almiworld.com.";
export async function portalSession({ licenceKey, accounts, env = process.env, origin, fetchImpl = fetch }) {
  const key = String(licenceKey ?? "").trim(), miss = { ok: false, state: "NOT_FOUND", why: NO_PLAN_FOUND };
  if (!LICENCE_KEY_SHAPE.test(key)) return miss;
  const sub = accounts?.[key]?.subscription;
  if (!sub || !/^sub_[A-Za-z0-9]+$/.test(sub)) return miss;
  const stripeKey = env[BILLING_KEY_NAMES.stripeSecret];
  if (!stripeKey) return { ok: false, state: "DEFERRED", why: `plan management is not connected: no Stripe key in the environment (${BILLING_KEY_NAMES.stripeSecret})` };
  if (!String(stripeKey).startsWith("sk_test_") && env[BILLING_KEY_NAMES.testModeOnly] !== "yes") return { ok: false, state: "REFUSED", closed: true, why: "payments are not switched on yet" };
  /* RR-340: the Stripe account's DEFAULT portal is shared by every AlmiWorld product — AlmiVisibility opens ONLY its own configuration
   * (site/owner-portal-config.mjs makes it), never the default */
  const config = String(env[PORTAL_CONFIG_NAME] ?? "").trim();
  if (!/^bpc_[A-Za-z0-9]+$/.test(config)) return { ok: false, state: "DEFERRED", why: `plan management is not set up: no AlmiVisibility portal configuration (${PORTAL_CONFIG_NAME})` };
  const auth = { Authorization: `Bearer ${stripeKey}` };
  const s = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub)}`, { headers: auth });
  const so = await s.json().catch(() => ({}));
  /* the subscription must still name this licence key (our checkout stamped it) — else the store and Stripe disagree, and nothing opens */
  if (!s.ok || typeof so.customer !== "string" || so.metadata?.almiworld_account !== key) return miss;
  const p = await fetchImpl("https://api.stripe.com/v1/billing_portal/sessions", { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ customer: so.customer, configuration: config, return_url: `${origin}/manage` }).toString() });
  const pj = await p.json().catch(() => ({}));
  if (!p.ok || typeof pj.url !== "string" || !pj.url.startsWith("https://billing.stripe.com/")) return { ok: false, state: "FAILED", why: `Stripe answered HTTP ${p.status} — is the customer portal switched on in Stripe (Settings → Billing → Customer portal)?` };
  return { ok: true, url: pj.url };
}

/**
 * Open a checkout session. Returns { ok, url, sessionId, licenceKey } or { ok: false, state, why } — DEFERRED (a variable is missing,
 * named) or REFUSED (a live key before launch). `fetchImpl` is injected (tests answer it locally).
 */
export async function createCheckout({ plan, env = process.env, origin, fetchImpl = fetch }) {
  const priceName = PRICE_ENV[plan];
  if (!priceName) return { ok: false, state: "REFUSED", why: "unknown plan" };
  const key = env[BILLING_KEY_NAMES.stripeSecret];
  if (!key) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no Stripe key in the environment (${BILLING_KEY_NAMES.stripeSecret})` };
  if (!String(key).startsWith("sk_test_") && env[BILLING_KEY_NAMES.testModeOnly] !== "yes") return { ok: false, state: "REFUSED", closed: true, why: "only a Stripe TEST-mode key is accepted before the owner's launch GREEN" };
  const priceId = env[priceName];
  if (!priceId) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no price for this plan (${priceName})` };
  const licenceKey = newLicenceKey();
  const r = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(checkoutFields({ plan, priceId, licenceKey, origin })).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || typeof j.url !== "string") return { ok: false, state: "FAILED", why: `Stripe answered HTTP ${r.status}` };
  return { ok: true, url: j.url, sessionId: j.id, licenceKey, plan };
}
