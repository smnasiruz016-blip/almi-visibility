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
import { createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createRobotsCache } from "../src/crawl/robots.mjs";
import { runMode, findingsOf, evidenceByUrl } from "../src/report/visibility-score.mjs";

export const LIMITS = Object.freeze({ testsPerPersonPerDay: 3, pagesPerTest: 10, paceMs: 1000, timeoutMs: 15000, maxBytes: 2_000_000 });
export const USER_AGENT = "AlmiVisibilityFreeTest/1.0 (+https://almivisibility.almiworld.com/free-test)";
export const NO_PROMISE = "This test measures what it can see today. It promises no ranking, traffic or citation by any search or AI engine.";

/** Is this address private, local or otherwise not the public internet? (IPv4 and IPv6) */
export function privateAddress(ip) {
  if (isIP(ip) === 4) { const [a, b] = ip.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224; }
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.") || x.startsWith("::ffff:192.168.");
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
  try { addrs = isIP(u.hostname) ? [{ address: u.hostname }] : await resolve(u.hostname); } catch { return { ok: false, why: "That site's name could not be found." }; }
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) return { ok: false, why: "Only public websites can be tested." };
  u.hash = "";
  return { ok: true, url: u.href };
}

/** The daily limit: a person is a salted hash of their address for TODAY only; the salt is new each start, so nothing links days. */
export function dailyLimiter({ limit = LIMITS.testsPerPersonPerDay, now = () => Date.now() } = {}) {
  const salt = randomBytes(16);
  const counts = new Map();
  const key = (who) => `${new Date(now()).toISOString().slice(0, 10)}:${createHash("sha256").update(salt).update(String(who)).digest("hex")}`;
  return Object.freeze({
    take(who) { const k = key(who); const n = counts.get(k) ?? 0; if (n >= limit) return { ok: false, left: 0, why: `The free test can be run ${limit} times a day. Please come back tomorrow.` }; counts.set(k, n + 1); return { ok: true, left: limit - n - 1 }; },
  });
}

const sameSite = (a, b) => { try { return new URL(a).origin === new URL(b).origin; } catch { return false; } };
const linksOf = (html, base) => [...String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).href.replace(/#.*$/, ""); } catch { return null; } }).filter(Boolean);
const htmlish = (u) => !/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|json|ico)(\?|$)/i.test(u);

/**
 * Run one test: the start page and up to 9 more pages of the same site, each allowed by robots.txt, one at a time, paced.
 * `fetchImpl` is injected (tests use a fixture server). Returns the result a visitor sees.
 */
export async function runFreeTest({ url, fetchImpl = fetch, pages = LIMITS.pagesPerTest, paceMs = LIMITS.paceMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), on = new Date().toISOString() }) {
  const max = Math.min(pages, LIMITS.pagesPerTest);
  let last = 0;
  const pace = async () => { const wait = last + paceMs - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); };
  const robots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace });
  const queue = [url], seen = new Set(), reads = [], skipped = [];
  while (queue.length && reads.length < max) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const allowed = await robots.check(u);
    last = Math.max(last, Date.now()); /* the pause is counted from the END of the previous request (robots.txt included) */
    if (!allowed.allowed) { skipped.push({ url: u, why: allowed.state === "UNKNOWN" ? `robots.txt could not be read (${allowed.reason}) — not tested` : "robots.txt asks us not to read it — not tested" }); continue; }
    await pace();
    let res;
    try { res = await fetchImpl(u, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(LIMITS.timeoutMs) }); }
    catch (e) { skipped.push({ url: u, why: `could not be read (${e.name === "TimeoutError" ? "timed out" : "no answer"})` }); continue; }
    if (res.status >= 300 && res.status < 400) { const to = res.headers.get("location"); if (to) { const next = new URL(to, u).href; if (sameSite(next, url) && reads.length === 0 && !seen.has(next)) queue.unshift(next); else skipped.push({ url: u, why: `redirects to ${next}` }); } continue; }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/text\/html|application\/xhtml/i.test(type)) { skipped.push({ url: u, why: `not an HTML page (HTTP ${res.status})` }); continue; }
    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, LIMITS.maxBytes);
    last = Date.now();
    const html = buf.toString("utf8");
    reads.push({ url: u, html, recorded_at: on, read_id: `free-test:${reads.length + 1}` });
    if (reads.length === 1) for (const l of linksOf(html, u)) if (sameSite(l, u) && htmlish(l) && !seen.has(l) && !queue.includes(l)) queue.push(l);
  }
  const r = runMode({ mode: "full", evidenceByUrl: evidenceByUrl({ pageReads: reads }) });
  const findings = findingsOf(r.results);
  return Object.freeze({
    url, testedOn: on, pagesRead: reads.length, pagesLimit: max, skipped: Object.freeze(skipped),
    score: r.score, byCategory: r.byCategory, evaluated: r.evaluated,
    measured: Object.freeze([...new Set(r.results.filter((x) => x.result !== "NOT MEASURED").map((x) => x.check))]),
    notMeasured: Object.freeze([...new Set(r.results.filter((x) => x.result === "NOT MEASURED").map((x) => `${x.check} — needs ${x.needs}`))]),
    nextActions: Object.freeze([...new Map(findings.map((f) => [f.check, f])).values()].slice(0, 8).map((f) => Object.freeze({ check: f.check, action: f.action ?? f.finding, pages: findings.filter((x) => x.check === f.check).length }))),
    noPromise: NO_PROMISE,
  });
}
