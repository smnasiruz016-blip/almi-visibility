/**
 * 🔴 PLANS AND THE LICENCE, as the downloadable Visibility enforces them (RR-298 B; owner decisions 2 and 3).
 *   PLANS (per month, USD): $30 = 1 product · $40 = up to 5 · $60 = up to 10 · $80 = unlimited. NO free trial.
 *   The app checks the client's plan with AlmiWorld's licence service; the service answers with a SIGNED licence (Ed25519), which the app
 *   verifies with the service's public key — so a licence cannot be written by hand.
 *   OFFLINE: if the check cannot reach the service, the app keeps working for 7 days from the LAST GOOD check, then pauses NEW work (never
 *   deletes anything) until it can check again. The client is told in one plain line.
 * Pure (the clock and the check result are handed in). No key is held here: the public key is handed in by name of its file.
 */
import { createPublicKey, verify } from "node:crypto";

export const FREE_TRIAL = false;
export const PLANS = Object.freeze([
  { id: "visibility_1", priceUsd: 30, products: 1, words: "$30 a month — 1 product" },
  { id: "visibility_5", priceUsd: 40, products: 5, words: "$40 a month — up to 5 products" },
  { id: "visibility_10", priceUsd: 60, products: 10, words: "$60 a month — up to 10 products" },
  { id: "visibility_unlimited", priceUsd: 80, products: Infinity, words: "$80 a month — unlimited products" },
].map(Object.freeze));
export const OFFLINE_DAYS = 7;
const DAY = 86400000;
export const planOf = (id) => PLANS.find((p) => p.id === id) ?? null;

/** The licence's own bytes, as signed: a stable JSON of its fields. */
export const licenceBytes = (l) => Buffer.from(JSON.stringify({ account: l.account, plan: l.plan, status: l.status, periodEnd: l.periodEnd, issuedAt: l.issuedAt }));

/** Verify a signed licence { licence, signature (base64) } with the service's public key (PEM). */
export function verifyLicence(signed, publicKeyPem) {
  try {
    if (!signed?.licence || typeof signed.signature !== "string") return false;
    return verify(null, licenceBytes(signed.licence), createPublicKey(publicKeyPem), Buffer.from(signed.signature, "base64"));
  } catch { return false; }
}

/**
 * The licence STATE the app runs under. `check` is the latest attempt: { reached: true, signed } or { reached: false };
 * `last` is the last GOOD check { at, signed } (or null). Returns { state, mayStartNewWork, plan, line, last }.
 */
export function licenceState({ now, check, last = null, publicKeyPem }) {
  const good = (s) => s && verifyLicence(s, publicKeyPem);
  let lastGood = last;
  if (check?.reached) {
    if (!good(check.signed)) return Object.freeze({ state: "INVALID", mayStartNewWork: false, plan: null, last: lastGood, line: "The licence answer could not be verified — new work is paused until a valid licence is received. Nothing is deleted." });
    lastGood = { at: now, signed: check.signed };
  }
  if (!lastGood) return Object.freeze({ state: "NO_PLAN", mayStartNewWork: false, plan: null, last: null, line: "No plan yet — choose a plan to start (there is no free trial)." });
  const l = lastGood.signed.licence;
  /* RR-303: a verified "no plan yet" answer is NO_PLAN — never "an unknown plan" (a new buyer saw INVALID before the payment landed) */
  if (l.status === "NO_PLAN") return Object.freeze({ state: "NO_PLAN", mayStartNewWork: false, plan: null, last: lastGood, line: "No plan yet for this licence key — if you have just paid, it switches on within a minute." });
  const plan = planOf(l.plan);
  if (l.status === "PENDING" && plan) return Object.freeze({ state: "PENDING", mayStartNewWork: false, plan, last: lastGood, line: `Your plan (${plan.words}) is being confirmed — it switches on as soon as the payment is confirmed.` });
  if (!plan) return Object.freeze({ state: "INVALID", mayStartNewWork: false, plan: null, last: lastGood, line: "The licence names an unknown plan — new work is paused. Nothing is deleted." });
  if (l.status !== "ACTIVE" || Date.parse(l.periodEnd) < now) return Object.freeze({ state: "ENDED", mayStartNewWork: false, plan, last: lastGood, line: `Your plan (${plan.words}) is not active — new work is paused until it is renewed. Nothing is deleted.` });
  if (check?.reached) return Object.freeze({ state: "ACTIVE", mayStartNewWork: true, plan, last: lastGood, line: `Your plan: ${plan.words}. Licence checked just now.` });
  const days = Math.floor((now - lastGood.at) / DAY);
  if (now - lastGood.at <= OFFLINE_DAYS * DAY) return Object.freeze({ state: "OFFLINE_GRACE", mayStartNewWork: true, plan, last: lastGood, line: `Visibility cannot reach the licence service — it keeps working offline for ${OFFLINE_DAYS - days} more day(s) (${OFFLINE_DAYS} days from the last good check).` });
  return Object.freeze({ state: "OFFLINE_PAUSED", mayStartNewWork: false, plan, last: lastGood, line: `Visibility has not reached the licence service for ${days} days — new work is paused until it can check your plan again. Nothing is deleted.` });
}

/** The plan's product count, enforced: may the client add one more product? */
export function mayAddProduct(state, productCount) {
  if (!state.mayStartNewWork) return Object.freeze({ ok: false, line: state.line });
  if (productCount >= state.plan.products) return Object.freeze({ ok: false, line: `Your plan (${state.plan.words}) allows ${state.plan.products} product(s); you have ${productCount}. Choose a bigger plan to add another.` });
  return Object.freeze({ ok: true, line: `You can add a product (${productCount + 1} of ${state.plan.products === Infinity ? "unlimited" : state.plan.products}).` });
}

/** The plans, in plain words, as the client sees them. */
export const plansView = () => ["Plans (per month, USD) — there is no free trial:", ...PLANS.map((p) => `  • ${p.words}`), "Payment is by card through Stripe. You can change or cancel your plan at any time."];

/** RR-299 · the plan limit in plain words, on the products home screen. */
export const planLimitLine = (st, count) => (!st.plan ? st.line : st.plan.products === Infinity ? `Your plan allows unlimited products (${count} added).` : `Your plan allows ${st.plan.products} product${st.plan.products === 1 ? "" : "s"}${count >= st.plan.products ? ". Choose a bigger plan to add more." : ` — ${count} added.`}`);
