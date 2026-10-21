/**
 * 🔴 RR-307 B1 · VISIBILITY READS THE CLIENT'S OWN SITE (owner: "it didn't get any info other than the description"). The full version of
 * the public free test's reader (site/free-test.mjs): the same safety — only http(s) on a PUBLIC address (never a private or local one),
 * ROBOTS OBEYED (an unreadable robots.txt fails closed), GET only, no cookies, no form, no login, ONE request at a time, PACED — but more:
 *   · the pages: from the sitemap (robots.txt "Sitemap:" lines and /sitemap.xml) and from the links on EVERY page read, up to 50 pages;
 *   · per page: its title, description, headings, prices, facts (sentences with numbers), questions and answers (FAQ markup, <details>,
 *     headings that ask), structured data types, images without a text, links;
 *   · the design: the logo, the menu and the footer — for drafts that look like the client's own pages;
 *   · security: does http:// lead to https://?  links: does each internal link open? — so Security and Links are measured, not left out.
 * Fetches through the injected fetchImpl; writes nothing (the caller keeps the result in the product's own folder, never the pages' HTML).
 */
import { testableUrl, privateAddress } from "../site/free-test.mjs";
import { createRobotsCache, parseRobots, isAllowedByRules } from "../src/crawl/robots.mjs";
import { parseSitemap, extractLinkDetails } from "../src/crawl/seeds.mjs";
import { discoverBlocks } from "../src/page/structured-data.mjs";
import { visibleText } from "../src/audit/shell.mjs";
import { AI_SEARCH_BOTS } from "../src/page/page-gates.mjs";

export const FULL = Object.freeze({ pages: 50, linkChecks: 60, paceMs: 1000, timeoutMs: 15000, maxBytes: 2_000_000, sitemaps: 3 });
export const USER_AGENT = "AlmiVisibility/1.0 (+https://almivisibility.almiworld.com)";
const htmlish = (u) => !/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|json|ico|txt|woff2?)(\?|$)/i.test(u);
const decode = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
const strip = (s) => decode(String(s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const one = (re, html) => { const m = re.exec(html); return m ? strip(m[1]) : null; };
const all = (re, html) => [...String(html).matchAll(re)].map((m) => strip(m[1])).filter(Boolean);
const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag); return m ? decode(m[1]) : null; };
const PRICE = /(?:[$£€₹]|\b(?:USD|GBP|EUR|PKR|INR|AUD|CAD|Rs\.?)\s?)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:\/|per)\s?(?:month|mo|year|yr|week|day))?/gi;

/** What one page says — pure: html in, facts out (the HTML itself is not kept). */
export function readPage(html, url) {
  const h = String(html ?? "");
  const body = visibleText(h.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " "));
  const blocks = discoverBlocks(h);
  const ldQA = [];
  for (const b of blocks) { const t = b.texts ?? []; for (let i = 0; i < t.length; i++) if (t[i].kind === "question" && t[i + 1]?.kind === "answer") ldQA.push({ q: strip(t[i].text), a: strip(t[i + 1].text).slice(0, 400), from: "structured data" }); }
  const details = [...h.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)].map((m) => ({ q: strip(m[1]), a: strip(m[2]).slice(0, 400), from: "an open/close answer on the page" }));
  /* a heading that asks, and the paragraph that follows it (its direct answer, when there is one) */
  const asked = [...h.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>\s*(?:<[^p][^>]*>\s*)*(?:<p\b[^>]*>([\s\S]*?)<\/p>)?/gi)].map((m) => ({ q: strip(m[1]), a: m[2] ? strip(m[2]).slice(0, 600) : null })).filter((x) => /\?\s*$/.test(x.q)).map((x) => ({ ...x, from: "a heading on the page" }));
  const qa = [...new Map([...ldQA, ...details, ...asked].filter((x) => x.q && x.q.length <= 200).map((x) => [x.q.toLowerCase(), x])).values()];
  const facts = [...new Set(body.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => /\d/.test(x) && x.length >= 25 && x.length <= 220))].slice(0, 8);
  const imgs = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  return Object.freeze({
    url,
    title: one(/<title\b[^>]*>([\s\S]*?)<\/title>/i, h),
    description: (() => { const m = /<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/i.exec(h); return m ? attr(m[0], "content") : null; })(),
    h1: one(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, h),
    h2: all(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, h).slice(0, 12),
    lang: attr(/<html\b[^>]*>/i.exec(h)?.[0] ?? "", "lang"),
    canonical: (() => { const m = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(h); return m ? attr(m[0], "href") : null; })(),
    noindex: [...h.matchAll(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*>/gi)].some((m) => /noindex/i.test(attr(m[0], "content") ?? "")),
    hreflang: [...h.matchAll(/<link\b[^>]*rel\s*=\s*["']alternate["'][^>]*>/gi)].map((m) => attr(m[0], "hreflang")).filter(Boolean),
    prices: [...new Set((body.match(PRICE) ?? []).map((p) => p.trim().replace(/[,.;:]+$/, "")))].slice(0, 10),
    facts, qa,
    structuredTypes: [...new Set(blocks.flatMap((b) => b.types))],
    imagesWithoutText: imgs.filter((t) => attr(t, "alt") === null).length, images: imgs.length,
    words: body ? body.split(/\s+/).length : 0,
  });
}

/** The client's design from its home page: logo, menu, footer, colours named in the page — for drafts that look like its own pages. */
export function readDesign(html, url) {
  const h = String(html ?? "");
  const abs = (s) => { try { return s ? new URL(s, url).href : null; } catch { return null; } };
  const logoTag = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).find((t) => /logo/i.test(`${attr(t, "src")} ${attr(t, "alt")} ${attr(t, "class")}`));
  const og = /<meta\b[^>]*property\s*=\s*["']og:image["'][^>]*>/i.exec(h)?.[0];
  const icon = /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/i.exec(h)?.[0];
  const nav = /<nav\b[^>]*>([\s\S]*?)<\/nav>/i.exec(h)?.[1] ?? /<header\b[^>]*>([\s\S]*?)<\/header>/i.exec(h)?.[1] ?? "";
  const footer = /<footer\b[^>]*>([\s\S]*?)<\/footer>/i.exec(h)?.[1] ?? "";
  const colours = [...new Set((h.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase()))].slice(0, 6);
  return Object.freeze({
    siteName: (() => { const m = /<meta\b[^>]*property\s*=\s*["']og:site_name["'][^>]*>/i.exec(h); return m ? attr(m[0], "content") : one(/<title\b[^>]*>([\s\S]*?)<\/title>/i, h); })(),
    logo: abs(logoTag ? attr(logoTag, "src") : og ? attr(og, "content") : icon ? attr(icon, "href") : null),
    menu: [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => strip(m[1])).filter((x) => x && x.length <= 40).slice(0, 12),
    footer: strip(footer).slice(0, 300) || null,
    colours,
  });
}

/**
 * Read the site. Returns { ok, origin, readOn, pages:[readPage…], design, sitemap, robots, skipped, pageReads, securityReads, linkObs } —
 * pageReads/securityReads/linkObs are what the engine's own score (src/report/visibility-score.mjs) is made from; the caller does not keep
 * the HTML. `allowLocal` is for TESTS ONLY (a stand-in site on this computer).
 */
export async function readSite({ url, fetchImpl = fetch, maxPages = FULL.pages, paceMs = FULL.paceMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), on = new Date().toISOString(), allowLocal = false, resolve }) {
  let start;
  if (allowLocal) { try { start = new URL(url).href; } catch { return { ok: false, why: "That is not a web address." }; } }
  else { const t = await testableUrl(url, resolve ? { resolve } : {}); if (!t.ok) return { ok: false, why: t.why }; start = t.url; }
  const origin = new URL(start).origin;
  let last = 0;
  const pace = async () => { const wait = last + paceMs - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); };
  const get = async (u, accept = "text/html") => { await pace(); try { return await fetchImpl(u, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: accept }, signal: AbortSignal.timeout(FULL.timeoutMs) }); } catch (e) { return { failed: e.name === "TimeoutError" ? "timed out" : "no answer" }; } finally { last = Date.now(); } };
  const robots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace });
  const skipped = [];
  /* robots.txt as text too: its Sitemap lines, and what it says to the AI search bots */
  const rt = await get(`${origin}/robots.txt`, "text/plain");
  const robotsTxt = rt.ok ? (await rt.text()).slice(0, 200000) : null;
  const sitemapUrls = new Set();
  const sitemaps = [...new Set([...(robotsTxt ? [...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : []), `${origin}/sitemap.xml`])].filter((s) => { try { return new URL(s).origin === origin; } catch { return false; } });
  let sitemapFound = false;
  for (let i = 0; i < sitemaps.length && i < FULL.sitemaps; i++) {
    const r = await get(sitemaps[i], "application/xml");
    if (!r.ok) continue;
    sitemapFound = true;
    const sm = parseSitemap((await r.text()).slice(0, 5_000_000));
    for (const u of sm.urls) if (u.startsWith(origin)) sitemapUrls.add(u);
    for (const s of sm.sitemaps) if (s.startsWith(origin) && sitemaps.length < 10) sitemaps.push(s);
  }
  const queue = [start, ...[...sitemapUrls].filter((u) => htmlish(u))], seen = new Set(), pages = [], pageReads = [], linkSets = new Map();
  let design = null;
  while (queue.length && pages.length < maxPages) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const allowed = await robots.check(u);
    if (!allowed.allowed) { skipped.push({ url: u, why: allowed.state === "UNKNOWN" ? "robots.txt could not be read — not read" : "robots.txt asks us not to read it — not read" }); continue; }
    const res = await get(u);
    if (res.failed) { skipped.push({ url: u, why: `could not be read (${res.failed})` }); continue; }
    if (res.status >= 300 && res.status < 400) { const to = res.headers.get("location"); if (to) { const next = new URL(to, u).href; if (new URL(next).origin === origin && !seen.has(next)) queue.unshift(next); else skipped.push({ url: u, why: `moves to ${next}` }); } continue; }
    if (!res.ok || !/text\/html|application\/xhtml/i.test(res.headers.get("content-type") ?? "")) { skipped.push({ url: u, why: `not a web page (answer ${res.status})` }); continue; }
    const html = Buffer.from(await res.arrayBuffer()).subarray(0, FULL.maxBytes).toString("utf8");
    pageReads.push({ url: u, html, recorded_at: on, read_id: `site-read:${pages.length + 1}` });
    pages.push(readPage(html, u));
    if (!design) design = readDesign(html, u);
    const links = extractLinkDetails(html, u, { maxLinks: 300 }).links.map((l) => l.to.replace(/#.*$/, "")).filter((l) => { try { return new URL(l).origin === origin; } catch { return false; } });
    linkSets.set(u, [...new Set(links)]);
    for (const l of links) if (htmlish(l) && !seen.has(l) && !queue.includes(l)) queue.push(l);
  }
  if (!pages.length) return { ok: false, why: skipped[0] ? `The site could not be read: ${skipped[0].why}.` : "The site could not be read.", skipped };
  /* security: does the http:// address lead to https://? (the start page) */
  const securityReads = [];
  if (start.startsWith("https://")) {
    const plain = await get(start.replace(/^https:/, "http:"));
    if (!plain.failed) securityReads.push({ url: start, kind: "PAGE", read: { status: 200 }, http: { redirectsToHttps: plain.status >= 300 && plain.status < 400 && /^https:\/\//i.test(plain.headers.get("location") ?? "") }, recorded_at: on, measurement_key: "site-read:https" });
  }
  /* links: each internal link target once — read pages are known to open; the rest are asked, robots obeyed, up to 60 */
  const status = new Map(pages.map((p) => [p.url, 200]));
  const targets = [...new Set([...linkSets.values()].flat())].filter((t) => !status.has(t));
  for (const t of targets.slice(0, FULL.linkChecks)) {
    const allowed = await robots.check(t);
    if (!allowed.allowed) continue;
    const r = await get(t, "*/*");
    if (r.failed) status.set(t, 0); else status.set(t, r.status >= 300 && r.status < 400 ? 200 : r.status);
  }
  const linkObs = [...linkSets.entries()].flatMap(([from, tos]) => tos.filter((t) => status.has(t)).map((t) => ({ fromUrl: from, finalStatus: status.get(t), to: t })));
  /* what robots.txt tells the AI search bots about the start page */
  const aiBots = Object.fromEntries(AI_SEARCH_BOTS.map((b) => [b, robotsTxt === null ? (rt.status === 404 ? true : null) : isAllowedByRules(parseRobots(robotsTxt, b), start)]));
  return Object.freeze({
    ok: true, origin, start, readOn: on, pages, design, skipped,
    sitemap: { found: sitemapFound, urls: sitemapUrls.size },
    robots: { found: robotsTxt !== null, aiBots },
    /* for the five gates: the site's own robots.txt and its sitemap's addresses */
    robotsTxt, sitemapUrls: [...sitemapUrls].slice(0, 5000),
    brokenLinks: linkObs.filter((o) => o.finalStatus >= 400 || o.finalStatus === 0).map((o) => ({ from: o.fromUrl, to: o.to, status: o.finalStatus })),
    pageReads, securityReads, linkObs,
  });
}

/** E3 · does this address really open? (one GET, following moves). A "www." the client did not type is never added. */
export async function addressOpens(url, { fetchImpl = fetch, allowLocal = false } = {}) {
  let u; try { u = new URL(url); } catch { return { ok: false, why: "That is not a web address." }; }
  const noWww = u.hostname.startsWith("www.") ? u.href.replace("://www.", "://") : null;
  if (!allowLocal) { const t = await testableUrl(u.href); if (!t.ok) return { ok: false, why: t.why, suggestion: noWww }; }
  try {
    const r = await fetchImpl(u.href, { method: "GET", redirect: "follow", headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(10000) });
    if (r.status < 400) return { ok: true, finalUrl: r.url || u.href };
    return { ok: false, why: `That address answers with an error (${r.status}).`, suggestion: u.hostname.startsWith("www.") ? u.href.replace("://www.", "://") : null };
  } catch { return { ok: false, why: "That address does not open — check it in your browser.", suggestion: u.hostname.startsWith("www.") ? u.href.replace("://www.", "://") : null }; }
}
export { privateAddress };
