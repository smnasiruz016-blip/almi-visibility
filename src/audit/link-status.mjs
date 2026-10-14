/**
 * F23 · THE BOUNDED LINK-STATUS CHECK (F23 Acceptance Amendment 1, C8; the owner's GREEN of 14 October 2026 for this check and nothing else).
 *
 * It observes the destinations of ONE client's own pages, and only those:
 *   WHAT IS REQUESTED   the link targets handed in, the hops their redirects name, and each host's robots file — nothing else
 *   ONCE                one request for each distinct address, never repeated, never retried (a redirect that names an address already
 *                       requested reuses that answer)
 *   PACED               at least the declared interval between two request STARTS to one host, on a monotonic clock, rechecked after
 *                       every wait
 *   ROBOTS              each host's robots file is read first and respected; a file that cannot be read fails closed
 *   LIMIT               at most the declared number of requests in one run — robots files and hops count; and NO request at all when the
 *                       distinct addresses outnumber it
 *   REFUSED ≠ BROKEN    disallowed, rate-limited, challenged, timed out, or left over at the limit → NOT MEASURED with its reason
 * Nothing is sent but a GET with the engine's own user agent; no body is kept unless a caller asks for one address's body (a client's own
 * live page). PURE of the outside world: the fetch, the sleep and the clock are handed in. It names no client, host or product.
 */
import { createHash } from "node:crypto";
import { parseRobots, isAllowedByRules, USER_AGENT } from "../crawl/robots.mjs";
import { STATE, LINK_STATUS_RECORD, linksOf } from "./page-links.mjs";
import { LINK_CHECK, NOT_MEASURED_REASON, CHALLENGE_HEADERS } from "../../config/audit/link-rules.mjs";

export const LIVE_READ_RECORD = "live_page_read";
export const REFUSAL = Object.freeze({ TOO_MANY: "DISTINCT_ADDRESSES_OUTNUMBER_THE_REQUEST_LIMIT", NOT_PLANNED: "ADDRESS_IS_NOT_A_LINK_TARGET_A_HOP_OR_A_ROBOTS_FILE" });
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

/** C8: the distinct web addresses the links of these pages point at, sorted; what is not a web address is counted, never requested. */
export function planLinkCheck({ pages = [], canon }) {
  const urls = new Set();
  let notHttp = 0, occurrences = 0;
  for (const p of pages) if (p.html !== null && p.html !== undefined) for (const l of linksOf(p.html, p.canonical)) {
    occurrences += 1;
    const c = /^https?:/i.test(l.to) ? canon(l.to) : null;
    if (c === null) notHttp += 1; else urls.add(c);
  }
  return Object.freeze({ urls: Object.freeze([...urls].sort()), occurrences, notHttp });
}

/** Did the host challenge the request instead of answering it? Read from the response headers only. */
export const challenged = (res) => CHALLENGE_HEADERS.some((h) => { const v = res?.headers?.get?.(h); return typeof v === "string" && v.trim() !== ""; });

/**
 * RUN the check over `urls`. `bodiesFor`: addresses whose body is kept (a client's own live pages) — every other body is discarded unread.
 * @returns {{ refused: string|null, distinct: number, requests: number, limit: number, observations: object[], bodies: Map<string,string>, log: object[] }}
 */
export async function checkLinks({ urls = [], fetchImpl, sleep, clock, limits = LINK_CHECK, userAgent = USER_AGENT, bodiesFor = new Set() }) {
  const distinct = [...new Set(urls)];
  const out = (extra) => Object.freeze({ refused: null, distinct: distinct.length, requests: 0, limit: limits.maxRequests, observations: Object.freeze([]), bodies: new Map(), log: Object.freeze([]), ...extra });
  /* 🔴 no request at all when the distinct addresses outnumber the limit */
  if (distinct.length > limits.maxRequests) return out({ refused: REFUSAL.TOO_MANY });
  const planned = new Set(distinct), allowedHops = new Set();
  const answers = new Map(), robots = new Map(), lastStart = new Map(), bodies = new Map(), log = [];
  let requests = 0;
  const pace = async (origin) => {
    for (;;) { const last = lastStart.get(origin); const wait = last === undefined ? 0 : limits.sameHostIntervalMs - (clock() - last); if (wait <= 0) break; await sleep(wait); }
    lastStart.set(origin, clock());
  };
  /* ONE place sends a request: counted, paced, and only to an address this run may ask for */
  const send = async (url, kind) => {
    const origin = originOf(url);
    if (!(kind === "robots" ? planned.has(`robots:${origin}`) : planned.has(url) || allowedHops.has(url))) throw new Error(REFUSAL.NOT_PLANNED);
    await pace(origin);
    requests += 1;
    log.push(Object.freeze({ kind, origin, at: lastStart.get(origin) }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limits.timeoutMs);
    try { return await fetchImpl(url, { method: limits.method, redirect: "manual", headers: { "User-Agent": userAgent }, signal: controller.signal }); } finally { clearTimeout(timer); }
  };
  const robotsFor = async (origin) => {
    if (robots.has(origin)) return robots.get(origin);
    let entry;
    if (requests >= limits.maxRequests) entry = { reason: NOT_MEASURED_REASON.REQUEST_LIMIT };
    else {
      planned.add(`robots:${origin}`);
      try {
        const res = await send(`${origin}/robots.txt`, "robots");
        if (res.status === 404 || res.status === 410) entry = { rules: [] };
        else if (res.status === 429) entry = { reason: NOT_MEASURED_REASON.RATE_LIMITED };
        else if (!res.ok) entry = { reason: NOT_MEASURED_REASON.ROBOTS_UNKNOWN };
        else entry = { rules: parseRobots(await res.text(), userAgent) };
      } catch (e) { if (e?.message === REFUSAL.NOT_PLANNED) throw e; entry = { reason: NOT_MEASURED_REASON.ROBOTS_UNKNOWN }; }
    }
    /* a robots answer left over at the limit is not remembered as the host's answer */
    if (entry.reason !== NOT_MEASURED_REASON.REQUEST_LIMIT) robots.set(origin, entry);
    return entry;
  };
  /* the answer of ONE address: requested at most once */
  const answerOf = async (url) => {
    if (answers.has(url)) return answers.get(url);
    const origin = originOf(url);
    let a;
    if (origin === null || !/^https?:/i.test(url)) a = { status: null, reason: NOT_MEASURED_REASON.NOT_HTTP };
    else {
      const rb = await robotsFor(origin);
      if (rb.reason) a = { status: null, reason: rb.reason };
      else if (!isAllowedByRules(rb.rules, url)) a = { status: null, reason: NOT_MEASURED_REASON.ROBOTS_DISALLOWED };
      else if (requests >= limits.maxRequests) a = { status: null, reason: NOT_MEASURED_REASON.REQUEST_LIMIT };
      else {
        try {
          const res = await send(url, "page");
          if (res.status === 429) a = { status: 429, reason: NOT_MEASURED_REASON.RATE_LIMITED };
          else if (challenged(res)) a = { status: res.status, reason: NOT_MEASURED_REASON.CHALLENGED };
          else a = { status: res.status, location: res.headers?.get?.("location") ?? null, reason: null };
          if (bodiesFor.has(url) && res.status >= 200 && res.status < 300 && a.reason === null) bodies.set(url, await res.text());
          else await res.body?.cancel?.().catch(() => {});
        } catch (e) { if (e?.message === REFUSAL.NOT_PLANNED) throw e; a = { status: null, reason: e?.name === "AbortError" ? NOT_MEASURED_REASON.TIMEOUT : NOT_MEASURED_REASON.NETWORK_ERROR }; }
      }
    }
    /* an address left over at the limit was never requested: it is not remembered as answered */
    if (a.reason !== NOT_MEASURED_REASON.REQUEST_LIMIT) answers.set(url, a);
    return a;
  };
  const observations = [];
  for (const url of distinct) {
    const chain = [], seen = new Set([url]);
    let cur = url, state = STATE.NOT_MEASURED, reason = null, finalStatus = null;
    for (;;) {
      const a = await answerOf(cur);
      finalStatus = a.status;
      if (a.reason) { reason = a.reason; break; }
      if (a.status >= 300 && a.status < 400) {
        chain.push(a.status);
        let next = null;
        try { const u = new URL(a.location ?? "", cur); u.hash = ""; next = a.location ? u.toString() : null; } catch { next = null; }
        if (next === null) { reason = NOT_MEASURED_REASON.NO_LOCATION; break; }
        if (seen.has(next)) { reason = NOT_MEASURED_REASON.REDIRECT_LOOP; break; }
        if (chain.length > limits.maxHops) { reason = NOT_MEASURED_REASON.TOO_MANY_HOPS; break; }
        seen.add(next); allowedHops.add(next); cur = next;
        continue;
      }
      if (a.status >= 200 && a.status < 300) state = chain.length ? STATE.REDIRECTED : STATE.WORKING;
      else if (a.status >= 400 && a.status < 600) state = STATE.BROKEN;
      else reason = NOT_MEASURED_REASON.NO_STATUS;
      break;
    }
    observations.push(Object.freeze({ url, state: reason ? STATE.NOT_MEASURED : state, reason, finalStatus, hops: chain.length, chain: Object.freeze([...chain]), finalUrl: cur }));
  }
  return out({ requests, observations: Object.freeze(observations), bodies, log: Object.freeze(log) });
}

/** The stored record of one observation. Its key covers the whole observation and the day, so a later check is a new record. */
export function observationRecord({ observation, tenantId, on, run }) {
  const body = { tenantId, url: observation.url, state: observation.state, reason: observation.reason ?? null, finalStatus: observation.finalStatus ?? null, hops: observation.hops, chain: observation.chain, finalUrl: observation.finalUrl, method: LINK_CHECK.method, checkedOn: on, run };
  const id = hash(body);
  return Object.freeze({ record_type: LINK_STATUS_RECORD, measurement_key: `${LINK_STATUS_RECORD}:${id}`, observation_id: id, recorded_at: `${on}T00:00:00Z`, ...body });
}

/** The stored read of one of the client's own live pages: its body as answered, with the address and the day. */
export function liveReadRecord({ pageId, url, html, tenantId, on, run }) {
  const body = { tenantId, pageId, url, bodySha256: createHash("sha256").update(html).digest("hex"), readOn: on, run };
  const id = hash(body);
  return Object.freeze({ record_type: LIVE_READ_RECORD, measurement_key: `${LIVE_READ_RECORD}:${id}`, read_id: id, recorded_at: `${on}T00:00:00Z`, ...body, html });
}

/** The pacing a run kept: the smallest gap between two request starts to one host, and how many gaps were under the interval. */
export function pacingOf(log, intervalMs = LINK_CHECK.sameHostIntervalMs) {
  const byHost = new Map();
  for (const l of log) (byHost.get(l.origin) ?? byHost.set(l.origin, []).get(l.origin)).push(l.at);
  const gaps = [...byHost.values()].flatMap((t) => t.slice(1).map((x, i) => x - t[i]));
  return Object.freeze({ hosts: byHost.size, gaps: gaps.length, smallestGapMs: gaps.length ? Math.min(...gaps) : null, underTheInterval: gaps.filter((g) => g < intervalMs).length });
}
