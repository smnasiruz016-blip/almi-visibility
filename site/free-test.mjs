/**
 * 🔴 THE FREE WEBSITE TEST (RR-300 A; F66 on the public site). Anyone enters a URL and gets the instant visibility score and the next
 * actions — the engine's own checks (src/report/visibility-score.mjs), never a second scorer.
 *   · LIMITS: at most 3 tests per person per day (a person is a salted daily hash of their address — the address itself is never kept) and
 *     at most 10 pages per test.
 *   · ROBOTS OBEYED (src/crawl/robots.mjs; an unreadable robots.txt fails closed), PACED (one request at a time, a pause between them),
 *     GET only: no cookies sent, no form ever submitted, no login. Only the tested site's own pages, over http(s), on a PUBLIC address —
 *     a private, local or link-local address is refused (the test can never be turned on a network it should not see).
 *   · THE RESULT shows what was measured and what was NOT MEASURED (never as zero), and promises no ranking or citation.
 */
import { createHash } from "node:crypto";
import { memoryCounters } from "./leads.mjs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createRobotsCache } from "../src/crawl/robots.mjs";
import { runMode, findingsOf, evidenceByUrl } from "../src/report/visibility-score.mjs";
import { judgeHeaderRule, cspPresence } from "../src/audit/live-security.mjs";
import { LIVE_HEADER_BASELINE } from "../config/security/live-header-baseline.mjs";

export const LIMITS = Object.freeze({ testsPerPersonPerDay: 3, pagesPerTest: 10, paceMs: 1000, timeoutMs: 15000, maxBytes: 2_000_000, linkChecks: 10 });
export const USER_AGENT = "AlmiVisibilityFreeTest/1.0 (+https://almivisibility.almiworld.com/free-test)";
export const NO_PROMISE = "This test measures what it can see today. It promises no ranking, traffic or citation by any search or AI engine.";

/** Is this address private, local or otherwise not the public internet? (IPv4 and IPv6) */
export function privateAddress(ip) {
  if (isIP(ip) === 4) { const [a, b, c] = ip.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224; }
  const x = ip.toLowerCase();
  /* RR-325: an IPv4 address written as IPv6 (::ffff:a.b.c.d) is judged as the IPv4 address it is — every private range, not three */
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x)?.[1]; if (mapped) return privateAddress(mapped);
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:") || x.startsWith("64:ff9b:") || x.startsWith("2001:db8");
}

/** The URL a visitor typed, made safe to test: http(s), no credentials, a public host. Returns { ok, url } or { ok: false, why }. */
export async function testableUrl(input, { resolve = (h) => lookup(h, { all: true }) } = {}) {
  /* another scheme (ftp:, file:, javascript: …) is refused — never read as a host name */
  if (/^[a-z][a-z0-9+.-]*:/i.test(String(input ?? "").trim()) && !/^https?:\/\//i.test(String(input).trim())) return { ok: false, why: "Only http and https addresses can be tested." };
  let u;
  try { u = new URL(/^https?:\/\//i.test(String(input ?? "").trim()) ? String(input).trim() : `https://${String(input ?? "").trim()}`); } catch { return { ok: false, why: "That is not a web address." }; }
  if (!["http:", "https:"].includes(u.protocol)) return { ok: false, why: "Only http and https addresses can be tested." };
  if (u.username || u.password) return { ok: false, why: "An address with a login in it is never tested." };
  if (u.port && !["80", "443"].includes(u.port)) return { ok: false, why: "Only the standard web ports are tested." };
  let addrs;
  const host = u.hostname.replace(/^\[(.*)\]$/, "$1"); // RR-325: an IPv6 address comes in brackets ([::ffff:7f00:1]) — judged as the address it is
  try { addrs = isIP(host) ? [{ address: host }] : await resolve(host); } catch { return { ok: false, why: "That site's name could not be found." }; }
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) return { ok: false, why: "Only public websites can be tested." };
  u.hash = "";
  return { ok: true, url: u.href };
}

/**
 * The daily limit: a person is a hash of their address with TODAY's random salt, which the store keeps for today only (older salts are
 * deleted), so nothing links days. RR-305 B3: counted in the store — every Vercel instance counts the same person once.
 */
export function dailyLimiter({ limit = LIMITS.testsPerPersonPerDay, now = () => Date.now(), store = memoryCounters() } = {}) {
  return Object.freeze({
    async take(who) {
      const day = new Date(now()).toISOString().slice(0, 10);
      const k = `${day}:${createHash("sha256").update(await store.daySalt(day)).update(String(who)).digest("hex")}`;
      const r = await store.limitTake(k, limit, now());
      return r.ok ? { ok: true, left: limit - r.used } : { ok: false, left: 0, why: `The free test can be run ${limit} times a day. Please come back tomorrow.` };
    },
  });
}

/** RR-325 B: every request of a check — robots.txt and each page — goes to a PUBLIC address only, checked again just before it is sent */
export const publicOnly = (fetchImpl, { resolve } = {}) => async (u, init) => { const t = await testableUrl(String(u), resolve ? { resolve } : {}); if (!t.ok) throw Object.assign(new Error(t.why), { name: "PrivateAddress" }); return fetchImpl(u, init); };

const sameSite = (a, b) => { try { return new URL(a).origin === new URL(b).origin; } catch { return false; } };
const linksOf = (html, base) => [...String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).href.replace(/#.*$/, ""); } catch { return null; } }).filter(Boolean);
const headersOf = (res) => { try { return typeof res.headers?.entries === "function" ? Object.fromEntries(res.headers.entries()) : null; } catch { return null; } };
const quiet = async (res) => { try { await res.body?.cancel?.(); } catch { /* the body is never read */ } };
const htmlish = (u) => !/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|json|ico)(\?|$)/i.test(u);

/**
 * Run one test: the start page and up to 9 more pages of the same site, each allowed by robots.txt, one at a time, paced.
 * `fetchImpl` is injected (tests use a fixture server). Returns the result a visitor sees.
 * RR-325 (owner, 25 Oct) `linksAndSecurity` — the public-lite score also measures, inside the same limits (robots obeyed, paced, the same
 * time limit, every request through the same fetchImpl):
 *   · SECURITY (the engine's https-only check): the pages were read over https, and the start page's http:// address is asked once — does
 *     it move to https://? (its own robots.txt, RFC 9309, obeyed; not asked → Security stays "Not measured"); the start page's security
 *     headers are judged under the F27 baseline (config/security/live-header-baseline.mjs) and SHOWN — they are not in the score;
 *   · LINKS (the engine's links-resolve check): every internal link on the pages read — a page read opens; at most 10 other targets are
 *     asked once (GET, the body not read). A link not asked is not judged — never counted as broken.
 */
export async function runFreeTest({ url, fetchImpl = fetch, pages = LIMITS.pagesPerTest, paceMs = LIMITS.paceMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), on = new Date().toISOString(), deadlineMs = null, now = () => Date.now(), linksAndSecurity = false }) {
  const max = Math.min(pages, LIMITS.pagesPerTest);
  /* RR-325 B: a time limit for the whole check — no new page is read after it; a page being read gets only the time left */
  const end = deadlineMs ? now() + deadlineMs : Infinity, left = () => end - now();
  let last = 0;
  const pace = async () => { const wait = last + paceMs - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); };
  const robots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace });
  const queue = [url], seen = new Set(), reads = [], skipped = [], statusOf = new Map(), linkSets = new Map();
  let firstHeaders = null;
  while (queue.length && reads.length < max) {
    if (left() <= 1000) { skipped.push(...queue.splice(0).filter((x) => !seen.has(x)).slice(0, 3).map((x) => ({ url: x, why: "not read — the check's time limit was reached" }))); break; }
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const allowed = await robots.check(u);
    last = Math.max(last, Date.now()); /* the pause is counted from the END of the previous request (robots.txt included) */
    if (!allowed.allowed) { skipped.push({ url: u, why: allowed.state === "UNKNOWN" ? `robots.txt could not be read (${allowed.reason}) — not tested` : "robots.txt asks us not to read it — not tested" }); continue; }
    await pace();
    let res;
    try { res = await fetchImpl(u, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(Math.max(1, Math.min(LIMITS.timeoutMs, left()))) }); }
    catch (e) { skipped.push({ url: u, why: `could not be read (${e.name === "TimeoutError" ? "timed out" : "no answer"})` }); continue; }
    statusOf.set(u, res.status >= 300 && res.status < 400 ? 200 : res.status); /* a link that moves on opens (as the app's site read counts it) */
    if (res.status >= 300 && res.status < 400) { const to = res.headers.get("location"); if (to) { const next = new URL(to, u).href; if (sameSite(next, url) && reads.length === 0 && !seen.has(next)) queue.unshift(next); else skipped.push({ url: u, why: `redirects to ${next}` }); } continue; }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/text\/html|application\/xhtml/i.test(type)) { skipped.push({ url: u, why: `not an HTML page (HTTP ${res.status})` }); continue; }
    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, LIMITS.maxBytes);
    last = Date.now();
    const html = buf.toString("utf8");
    reads.push({ url: u, html, recorded_at: on, read_id: `free-test:${reads.length + 1}` });
    if (reads.length === 1) { firstHeaders = headersOf(res); for (const l of linksOf(html, u)) if (sameSite(l, u) && htmlish(l) && !seen.has(l) && !queue.includes(l)) queue.push(l); }
    linkSets.set(u, [...new Set(linksOf(html, u).filter((l) => sameSite(l, u)))]);
  }
  const securityReads = [], linkObs = [];
  let securityHeaders = null, linksAsked = 0;
  if (linksAndSecurity && reads.length) {
    const start = reads[0].url;
    /* SECURITY · the http:// form of the start page, asked once — its own robots.txt first (RFC 9309: a move to the same host is followed) */
    if (start.startsWith("https://")) {
      const plain = start.replace(/^https:/, "http:"), host = new URL(start).hostname;
      let http; // undefined: not measured · null: no answer on http:// (nothing is served without https) · { redirectsToHttps }
      if (left() > 1000) {
        const plainRobots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace, rfc9309: true, allowHop: async (x) => { try { return new URL(x).hostname === host; } catch { return false; } } });
        const ok = await plainRobots.check(plain);
        last = Math.max(last, Date.now());
        if (!ok.allowed) skipped.push({ url: plain, why: "robots.txt of the http:// address could not be read or asks us not to read it — whether it moves to https:// is not measured" });
        else {
          await pace();
          try { const p = await fetchImpl(plain, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(Math.max(1, Math.min(LIMITS.timeoutMs, left()))) }); await quiet(p); http = { redirectsToHttps: p.status >= 300 && p.status < 400 && /^https:\/\//i.test(p.headers.get("location") ?? "") }; }
          catch (e) { http = e.name === "TimeoutError" ? undefined : null; }
          finally { last = Date.now(); }
        }
      }
      if (http !== undefined) for (const x of reads) if (x.url.startsWith("https://")) securityReads.push({ url: x.url, kind: "PAGE", read: { status: 200 }, ...(x.url === start ? { http } : {}), recorded_at: on, measurement_key: "free-test:https" });
      if (firstHeaders) securityHeaders = Object.freeze({ rules: Object.freeze(LIVE_HEADER_BASELINE.rules.map((rule) => Object.freeze({ name: rule.name, ...judgeHeaderRule(rule, { finalUrl: start, headers: firstHeaders, body: reads[0].html }) }))), csp: Object.freeze(cspPresence({ headers: firstHeaders })) });
    }
    /* LINKS · every internal link on the pages read; at most LIMITS.linkChecks other targets asked once, robots obeyed */
    const targets = [...new Set([...linkSets.values()].flat())].filter((t) => !statusOf.has(t));
    for (const t of targets.slice(0, LIMITS.linkChecks)) {
      if (left() <= 1000) break;
      const allowed = await robots.check(t);
      last = Math.max(last, Date.now());
      if (!allowed.allowed) continue;
      await pace();
      linksAsked++;
      try { const p = await fetchImpl(t, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: "*/*" }, signal: AbortSignal.timeout(Math.max(1, Math.min(LIMITS.timeoutMs, left()))) }); await quiet(p); statusOf.set(t, p.status >= 300 && p.status < 400 ? 200 : p.status); }
      catch { /* no answer in time: not judged */ }
      finally { last = Date.now(); }
    }
    for (const [from, tos] of linkSets) for (const t of tos) if (statusOf.has(t)) linkObs.push({ fromUrl: from, to: t, finalStatus: statusOf.get(t) });
  }
  const r = runMode({ mode: "full", evidenceByUrl: evidenceByUrl({ pageReads: reads, securityReads, linkObs }) });
  const findings = findingsOf(r.results);
  return Object.freeze({
    url, testedOn: on, pagesRead: reads.length, pagesLimit: max, skipped: Object.freeze(skipped),
    score: r.score, byCategory: r.byCategory, evaluated: r.evaluated,
    measured: Object.freeze([...new Set(r.results.filter((x) => x.result !== "NOT MEASURED").map((x) => x.check))]),
    notMeasured: Object.freeze([...new Set(r.results.filter((x) => x.result === "NOT MEASURED").map((x) => `${x.check} — needs ${x.needs}`))]),
    nextActions: Object.freeze([...new Map(findings.map((f) => [f.check, f])).values()].slice(0, 8).map((f) => Object.freeze({ check: f.check, action: f.action ?? f.finding, pages: findings.filter((x) => x.check === f.check).length }))),
    ...(linksAndSecurity ? {
      securityHeaders,
      links: Object.freeze({ judged: new Set(linkObs.map((o) => o.to)).size, asked: linksAsked, of: new Set([...linkSets.values()].flat()).size }),
      brokenLinks: Object.freeze([...new Map(linkObs.filter((o) => !(o.finalStatus >= 200 && o.finalStatus < 400)).map((o) => [o.to, Object.freeze({ from: o.fromUrl, to: o.to, status: o.finalStatus })])).values()].slice(0, 10)),
    } : {}),
    noPromise: NO_PROMISE,
  });
}
