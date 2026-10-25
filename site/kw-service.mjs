/**
 * 🔴 RR-326 E · ALMIWORLD'S KEYWORD SERVICE FOR THE VISIBILITY APP — the SAME database and Google connection as the finder, behind a small
 * API on almivisibility.almiworld.com that checks the client's LICENCE. The client needs no Google Ads account and no Google sign-in.
 *   POST /v1/keywords        { seeds: [1–20 words], location: "PK" | "ALL" … } → keyword ideas with Google's average monthly searches
 *   GET  /v1/keywords/usage  → this month's searches against the plan's limit
 *   · the licence comes in the header X-AlmiVisibility-Licence: the app's own SIGNED licence (avl_… — or the owner's avo_… text), checked
 *     with the licence service's PUBLIC key (LICENCE_PUBLIC_KEY, the same public key the app ships with — it can verify, never sign).
 *     Nothing secret is read: not the signing key, not a token. An answer never repeats the licence.
 *   · a search not yet in the database is asked of Google ONCE by the server, stored and returned — within the plan's MONTHLY limit and
 *     the service's share of Google's day (kw-google.mjs QUOTA.app). The owner's licence has no monthly limit.
 *   · WHILE SALES ARE NOT OPEN (public-lite) it answers the OWNER's licence only.
 * The monthly count is kept in the shared store under a hash of the licence's account — no name, no email.
 */
import { createHash, createPublicKey } from "node:crypto";
import { verifyLicence, isOwnerLicence, readOwnerLicenceText, planOf } from "../desktop/licence.mjs";
import { normSeed } from "./kw-seeds.mjs";

export const LICENCE_HEADER = "x-almivisibility-licence";
export const PUBLIC_KEY_ENV = "LICENCE_PUBLIC_KEY";
/* the plans' monthly keyword searches (a search is one request of up to 20 seed words, from the database or from Google) — the owner's
 * numbers to change; the owner's licence: no limit */
export const MONTHLY_SEARCHES = Object.freeze({ visibility_1: 300, visibility_5: 1000, visibility_10: 2000, visibility_unlimited: 4000 });
export const SERVICE_RULES = Object.freeze({ maxSeeds: 20, maxSeedLength: 80 });

/** RR-327 · for the owner's page: is LICENCE_PUBLIC_KEY there, and is it a public key? — "set" | "missing" | "not a public key" (never the value) */
export function publicKeyState(env = process.env) {
  const pem = String(env[PUBLIC_KEY_ENV] ?? "").replace(/\\n/g, "\n").trim();
  if (!pem) return "missing";
  if (!/-----BEGIN PUBLIC KEY-----/.test(pem) || /PRIVATE KEY/.test(pem)) return "not a public key";
  try { createPublicKey(pem); return "set"; } catch { return "not a public key"; }
}
/** the licence in the header: avo_<owner text> or avl_<base64url of the signed licence JSON> → the signed licence, or null */
export function readLicenceHeader(v) {
  const t = String(v ?? "").trim();
  if (t.startsWith("avo_")) return readOwnerLicenceText(t);
  if (!/^avl_[A-Za-z0-9_-]{40,6000}$/.test(t)) return null;
  try { const s = JSON.parse(Buffer.from(t.slice(4), "base64url").toString("utf8")); return s?.licence && typeof s.signature === "string" ? s : null; } catch { return null; }
}
export const licenceHeaderOf = (signed) => (isOwnerLicence(signed?.licence) ? `avo_${Buffer.from(JSON.stringify(signed)).toString("base64url")}` : `avl_${Buffer.from(JSON.stringify(signed)).toString("base64url")}`);

/** → { ok, owner, account, plan, limit } | { ok: false, status, why } */
export function checkLicence({ header, env = process.env, now = Date.now(), salesOpen = false }) {
  /* the owner's switch: public-lite has no admin to revoke a licence, so KEYWORD_SERVICE_OFF=1 in Vercel stops the service for everyone */
  if (env.KEYWORD_SERVICE_OFF === "1") return { ok: false, status: 503, why: "The keyword service is switched off just now." };
  let pem = String(env[PUBLIC_KEY_ENV] ?? "").replace(/\\n/g, "\n").trim();
  try { if (!pem) throw new Error(); createPublicKey(pem); } catch { pem = null; }
  if (!pem) return { ok: false, status: 503, why: "The keyword service is not connected yet." };
  const signed = readLicenceHeader(header);
  if (!signed) return { ok: false, status: 401, why: "Your licence was not sent. Check “Your plan” in the app." };
  if (!verifyLicence(signed, pem)) return { ok: false, status: 401, why: "Your licence could not be verified." };
  const l = signed.licence, owner = isOwnerLicence(l);
  if (!owner) {
    if (!salesOpen) return { ok: false, status: 403, why: "The keyword service opens for clients when sales open." };
    if (l.status !== "ACTIVE" || !planOf(l.plan) || !(Date.parse(l.periodEnd ?? "") > now)) return { ok: false, status: 402, why: "Your plan is not active." };
  }
  return { ok: true, owner, account: String(l.account), plan: l.plan, limit: owner ? null : MONTHLY_SEARCHES[l.plan] ?? 0 };
}

const monthKey = (account, now) => `av:app:${new Date(now).toISOString().slice(0, 7)}:${createHash("sha256").update(`almivisibility-app|${account}`).digest("hex").slice(0, 24)}`;
/** one search counted for this month — refused (and given back) over the plan's limit; the owner is counted, never refused */
export async function takeSearch({ kv, lic, now = Date.now() }) {
  const k = monthKey(lic.account, now);
  const [used] = await kv.run([["INCR", k], ["EXPIRE", k, 40 * 86400]]);
  if (lic.limit !== null && used > lic.limit) { await kv.run([["DECR", k]]); return { ok: false, used: lic.limit, why: `This month's ${lic.limit.toLocaleString("en-US")} keyword searches of your plan are used. They start again next month.` }; }
  return { ok: true, used };
}
/** a search that Google could not answer is given back — it never uses the month */
export async function giveBack({ kv, lic, now = Date.now() }) { await kv.run([["DECR", monthKey(lic.account, now)]]); }
export async function usageOf({ kv, lic, now = Date.now() }) { const [u] = await kv.run([["GET", monthKey(lic.account, now)]]); return { month: new Date(now).toISOString().slice(0, 7), used: Number(u ?? 0), limit: lic.limit }; }

/** the request's seed words, clean, or why not */
export function serviceSeeds(v) {
  const raw = Array.isArray(v) ? v : String(v ?? "").split(/[,\n]/);
  const seeds = [...new Set(raw.map(normSeed).filter(Boolean))];
  if (!seeds.length) return { ok: false, why: "Give at least one word." };
  if (seeds.length > SERVICE_RULES.maxSeeds) return { ok: false, why: `At most ${SERVICE_RULES.maxSeeds} words in one search.` };
  if (seeds.some((s) => s.length > SERVICE_RULES.maxSeedLength || /https?:|www\.|[<>{}\\]/.test(s))) return { ok: false, why: `Words of at most ${SERVICE_RULES.maxSeedLength} characters — not web addresses.` };
  return { ok: true, seeds };
}
