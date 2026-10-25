/**
 * 🔴 RR-326 D · THE OWNER, WITHOUT LIMITS — on his own browser only. The owner sets OWNER_ACCESS_KEY in Vercel himself (a long random
 * value, at least 32 characters; never in a page, a link or a file of ours). He types it ONCE in the form at /owner (a POST — never in an
 * address, so never in a log or the browser's history); the site answers with a cookie that proves it without holding it:
 *   av_owner = <expiry>.<HMAC-SHA256(key, "av-owner-v1|" + expiry)> — HttpOnly, Secure, SameSite=Strict, 180 days.
 * Changing the key in Vercel signs every browser out. Wrong keys are counted in the store: at most 5 an hour from one address, 30 an hour
 * in all — then the form refuses until the hour ends. Compared in constant time.
 */
import { createHash, createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const OWNER_ENV = "OWNER_ACCESS_KEY";
export const OWNER_COOKIE = "av_owner";
export const OWNER_RULES = Object.freeze({ minKeyLength: 32, days: 180, triesPerAddressPerHour: 5, triesPerHour: 30 });

const keyOf = (env) => { const k = String(env[OWNER_ENV] ?? ""); return k.length >= OWNER_RULES.minKeyLength ? k : null; };
export const ownerOn = (env = process.env) => keyOf(env) !== null;
const sign = (key, exp) => createHmac("sha256", key).update(`av-owner-v1|${exp}`).digest("base64url");
const same = (a, b) => { const x = createHash("sha256").update(String(a)).digest(), y = createHash("sha256").update(String(b)).digest(); return timingSafeEqual(x, y); };

/** is this request the owner's? (the cookie, signed with today's key, not expired) */
export function isOwner(req, env = process.env, now = Date.now()) {
  const key = keyOf(env); if (!key) return false;
  const c = String(req.headers.cookie ?? "").split(/;\s*/).find((x) => x.startsWith(`${OWNER_COOKIE}=`)); if (!c) return false;
  const [exp, mac] = c.slice(OWNER_COOKIE.length + 1).split(".");
  if (!/^\d{10,13}$/.test(exp ?? "") || !mac || Number(exp) < now) return false;
  return same(mac, sign(key, exp));
}
/** the Set-Cookie header for a signed-in owner */
export function ownerCookie(env = process.env, now = Date.now()) {
  const key = keyOf(env), exp = String(now + OWNER_RULES.days * 86400000);
  return `${OWNER_COOKIE}=${exp}.${sign(key, exp)}; Path=/; Max-Age=${OWNER_RULES.days * 86400}; HttpOnly; Secure; SameSite=Strict`;
}
export const ownerSignOut = () => `${OWNER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

/** a sign-in try: { ok } | { ok: false, why } — counted (wrong ones) per address and in all, per hour */
export async function ownerSignIn({ typed, who, env = process.env, kv, now = Date.now() }) {
  const key = keyOf(env); if (!key) return { ok: false, why: "Not available." };
  /* the address is never kept: a hash with TODAY's random salt (the same salt the free score's limits use — limits.mjs) */
  const hour = new Date(now).toISOString().slice(0, 13), saltKey = `av:salt:${hour.slice(0, 10)}`;
  const [, salt] = await kv.run([["SET", saltKey, randomBytes(16).toString("hex"), "NX", "EX", 2 * 86400], ["GET", saltKey]]);
  const me = `av:ownerfail:${hour}:${createHash("sha256").update(String(salt)).update(String(who)).digest("hex").slice(0, 24)}`, all = `av:ownerfail:${hour}`;
  const [m, a] = await kv.run([["GET", me], ["GET", all]]);
  if (Number(m ?? 0) >= OWNER_RULES.triesPerAddressPerHour || Number(a ?? 0) >= OWNER_RULES.triesPerHour) return { ok: false, why: "Too many tries. Please wait an hour." };
  if (same(String(typed ?? ""), key)) return { ok: true };
  await kv.run([["INCR", me], ["EXPIRE", me, 3600], ["INCR", all], ["EXPIRE", all, 3600]]);
  return { ok: false, why: "That is not the key." };
}
