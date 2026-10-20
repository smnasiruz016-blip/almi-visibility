/**
 * 🔴 RR-303 A · BUYING A PLAN, THE ALMIWORLD WAY (almi-oet src/lib/billing/stripe.ts; almi-billing-router README "new product").
 *   · The site's own server opens a Stripe Checkout session for the plan's price — the price id read from the variable NAMED for that plan
 *     (STRIPE_PRICE_ID_VISIBILITY_1/_5/_10/_UNLIMITED), the key from the variable named STRIPE_SECRET_KEY; neither is printed or logged.
 *   · The session carries metadata.product = "almi-visibility" (the router's registry id), the plan, and the buyer's new LICENCE KEY
 *     (metadata.almiworld_account, also on the subscription), so every later event routes to this product and names the licence.
 *   · No free trial; a card is always collected. TEST MODE ONLY until the owner's launch GREEN: a live key is refused.
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
 * Open a checkout session. Returns { ok, url, sessionId, licenceKey } or { ok: false, state, why } — DEFERRED (a variable is missing,
 * named) or REFUSED (a live key before launch). `fetchImpl` is injected (tests answer it locally).
 */
export async function createCheckout({ plan, env = process.env, origin, fetchImpl = fetch }) {
  const priceName = PRICE_ENV[plan];
  if (!priceName) return { ok: false, state: "REFUSED", why: "unknown plan" };
  const key = env[BILLING_KEY_NAMES.stripeSecret];
  if (!key) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no Stripe key in the environment (${BILLING_KEY_NAMES.stripeSecret})` };
  if (!String(key).startsWith("sk_test_") && env[BILLING_KEY_NAMES.testModeOnly] !== "yes") return { ok: false, state: "REFUSED", why: "only a Stripe TEST-mode key is accepted before the owner's launch GREEN" };
  const priceId = env[priceName];
  if (!priceId) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no price for this plan (${priceName})` };
  const licenceKey = newLicenceKey();
  const r = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(checkoutFields({ plan, priceId, licenceKey, origin })).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || typeof j.url !== "string") return { ok: false, state: "FAILED", why: `Stripe answered HTTP ${r.status}` };
  return { ok: true, url: j.url, sessionId: j.id, licenceKey, plan };
}
