/**
 * 🔴 RR-325 B · THE FREE SCORE'S LIMITS ON A PUBLIC SERVER — counted in ONE store every Vercel instance shares (RR-303: a count in memory
 * is per instance, so a visitor gets the limit once per instance). The store is Upstash for Redis, added by the OWNER in Vercel
 * (Storage → Upstash for Redis → connect to the project), which gives the project its address and token by NAME:
 *   KV_REST_API_URL + KV_REST_API_TOKEN (Vercel's own names), or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 * Never printed, logged or hashed here; with no store the free score is OFF and says so — the page still goes live.
 *   · per visitor per day (a hash of their address with TODAY's random salt, which the store keeps two days — nothing links days)
 *   · one daily total for the whole site, after which it politely says to try tomorrow
 *   · a one-use form ticket (bot protection): written when the page is shown, used once, too fast (< 2 s) or too old (15 min) is refused
 * Everything is a counter or a random ticket — no email, no address, no result is stored.
 */
import { createHash, randomBytes } from "node:crypto";

export const STORE_NAMES = Object.freeze([["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]]);
export const LITE_LIMITS = Object.freeze({ perVisitorPerDay: 3, siteTotalPerDay: 200, ticketMinMs: 2000, ticketMaxMs: 15 * 60000, checkDeadlineMs: 30000 });

/** the store's address and token, by name — or null (the free score is off) */
export function storeOf(env = process.env) {
  for (const [u, t] of STORE_NAMES) if (env[u] && env[t] && /^https:\/\//.test(env[u])) return { url: env[u], token: env[t] };
  if (env.ALMIV_TEST_KV_URL && env[STORE_NAMES[0][1]] && /^http:\/\/127\.0\.0\.1:\d+$/.test(env.ALMIV_TEST_KV_URL)) return { url: env.ALMIV_TEST_KV_URL, token: env[STORE_NAMES[0][1]] }; // tests only: a stand-in on this computer
  return null;
}

/** Upstash's REST pipeline: [[command, ...args], …] → their results, in order (its documented shape: [{ result } | { error }]) */
export function kvStore({ url, token }, { fetchImpl = fetch } = {}) {
  const run = async (cmds) => {
    const r = await fetchImpl(`${url.replace(/\/$/, "")}/pipeline`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(cmds), signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`the limit store answered ${r.status}`);
    const j = await r.json(); if (j.some((x) => x.error)) throw new Error("the limit store refused a command");
    return j.map((x) => x.result);
  };
  return Object.freeze({ run });
}

const day = (now) => new Date(now).toISOString().slice(0, 10);
const TWO_DAYS = 2 * 86400;

/**
 * The public-lite limits on a shared store. who: the visitor's address (never kept). → { ok, left, why }
 * The site total is counted FIRST and given back if the visitor's own limit refuses, so a refused visitor never uses the site's total.
 */
/* RR-326 C: the keyword finder counts with the same rules under its own names and words */
export const SCORE_COUNTS = Object.freeze({ visitor: "av:visitor", total: "av:total", full: "Today's free scores are all used. Please try again tomorrow.", mine: (n) => `The free score can be run ${n} times a day. Please come back tomorrow.` });
export const FINDER_COUNTS = Object.freeze({ visitor: "av:kwvisitor", total: "av:kwtotal", full: "Today's free keyword searches are all used. Please try again tomorrow.", mine: (n) => `The free keyword finder can be used ${n} times a day. Please come back tomorrow.` });
export function liteLimits({ kv, now = () => Date.now(), perVisitor = LITE_LIMITS.perVisitorPerDay, siteTotal = LITE_LIMITS.siteTotalPerDay, counts = SCORE_COUNTS } = {}) {
  return Object.freeze({
    async take(who) {
      const d = day(now()), saltKey = `av:salt:${d}`;
      const [, salt] = await kv.run([["SET", saltKey, randomBytes(16).toString("hex"), "NX", "EX", TWO_DAYS], ["GET", saltKey]]);
      const me = `${counts.visitor}:${d}:${createHash("sha256").update(String(salt)).update(String(who)).digest("hex").slice(0, 32)}`, all = `${counts.total}:${d}`;
      const [total] = await kv.run([["INCR", all], ["EXPIRE", all, TWO_DAYS]]);
      if (total > siteTotal) { await kv.run([["DECR", all]]); return { ok: false, left: 0, why: counts.full }; }
      const [mine] = await kv.run([["INCR", me], ["EXPIRE", me, TWO_DAYS]]);
      if (mine > perVisitor) { await kv.run([["DECR", all]]); return { ok: false, left: 0, why: counts.mine(perVisitor) }; }
      return { ok: true, left: perVisitor - mine };
    },
    /** a one-use form ticket, written when the page is shown */
    async ticket() { const t = randomBytes(18).toString("base64url"); await kv.run([["SET", `av:ticket:${t}`, String(now()), "EX", Math.ceil(LITE_LIMITS.ticketMaxMs / 1000)]]); return t; },
    /** the ticket used once: missing, used, too fast or too old → refused */
    async useTicket(t) {
      if (!/^[\w-]{20,40}$/.test(String(t ?? ""))) return { ok: false, why: "Please use the form on this page." };
      const [at] = await kv.run([["GETDEL", `av:ticket:${t}`]]);
      if (at === null || at === undefined) return { ok: false, why: "That form has expired. Please try again." };
      const age = now() - Number(at);
      if (age < LITE_LIMITS.ticketMinMs) return { ok: false, why: "Please try again." };
      return age > LITE_LIMITS.ticketMaxMs ? { ok: false, why: "That form has expired. Please try again." } : { ok: true };
    },
  });
}
