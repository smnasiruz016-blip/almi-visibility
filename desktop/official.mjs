/**
 * 🔴 RR-318 B6 + C3 · THE OFFICIAL SOURCE ANSWERS (the owner's sourcing law: "the fact's owner answers it, with date; else 'the official
 * page, checked <date>, does not say this'"). Visibility reads the OFFICIAL pages itself and keeps, for each country or profession, only what
 * those pages show — never what an AI or a guess says:
 *   · READ: http(s) on a PUBLIC address only (never a private or local one), ROBOTS OBEYED (an unreadable robots.txt fails closed), GET only,
 *     no cookie, no login, one request at a time, PACED (2 seconds per request); the page's text is used here and NEVER kept — only what was
 *     measured (does the page name the country, the subject, the organisations) with its address and the day it was checked.
 *   · THE SUBJECT'S OWN SITE (e.g. oet.com for an OET product): its sitemap lists its pages; a page for a country (its address or its heading
 *     names the country) that says the subject is recognised or accepted there KEEPS that country, with that page as its source.
 *   · A BODY'S OWN PAGE (a regulator's, a university's — named by the client, or found by the client's own AI and then READ here): it answers
 *     for that body only when its own text names the subject; otherwise "the official page, checked <date>, does not say this."
 * The answer lines are Visibility's own plain sentences about what the page shows (never the page's sentences copied — an official text may
 * not be ours to copy), each with the page's address and the day it was checked.
 */
import { createHash } from "node:crypto";
import { testableUrl } from "../site/free-test.mjs";
import { createRobotsCache } from "../src/crawl/robots.mjs";
import { parseSitemap } from "../src/crawl/seeds.mjs";
import { USER_AGENT } from "./site-read.mjs";
import { namesOf, slugOf, originsIn } from "./world.mjs";

export const OFFICIAL = Object.freeze({ paceMs: 2000, timeoutMs: 15000, maxBytes: 3_000_000, maxPages: 40 });
const decode = (s) => String(s ?? "").replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d{1,7});/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
/** a page's own readable text: no scripts, no menus, no footer */
export const pageText = (html) => decode(String(html ?? "").replace(/<(head|script|style|noscript|nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const one = (re, h) => { const m = re.exec(h); return m ? decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : null; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, word) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(word)}(?![\\p{L}\\p{N}])`, word.length <= 3 ? "u" : "iu").test(text);
const day = (d) => String(d ?? "").slice(0, 10);

/**
 * A reader for official pages, paced and robots-obedient. `read(url)` → { ok, url, title, h1, text, checkedOn } or { ok:false, why }.
 * `allowLocal` is for TESTS ONLY (a stand-in official site on this computer).
 */
export function officialReader({ fetchImpl = fetch, on = new Date().toISOString(), paceMs = OFFICIAL.paceMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), allowLocal = false, resolve } = {}) {
  let last = 0, count = 0;
  const pace = async () => { const wait = last + paceMs - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); };
  const robots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace });
  const cache = new Map();
  const get1 = async (u, accept) => { await pace(); count++; try { return await fetchImpl(u, { method: "GET", redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: accept }, signal: AbortSignal.timeout(OFFICIAL.timeoutMs) }); } catch (e) { return { failed: e?.name === "TimeoutError" ? "timed out" : "no answer" }; } finally { last = Date.now(); } };
  /* a move to another address is followed (up to 3), each new address checked as the first: public, and allowed by ITS robots.txt */
  const get = async (u, accept) => { let at = u; for (let hop = 0; hop < 4; hop++) { const r = await get1(at, accept); if (r.failed || !(r.status >= 300 && r.status < 400)) { if (!r.failed) Object.defineProperty(r, "finalUrl", { value: at }); return r; } const to = r.headers.get("location"); if (!to) return r; const next = new URL(to, at).href; const a = await allowedUrl(next); if (!a.ok) return { failed: `moves to an address that is not read (${a.why})` }; if (!(await robots.check(next)).allowed) return { failed: "moves to a page its robots.txt does not let us read" }; at = next; } return { failed: "moves too many times" }; };
  const allowedUrl = async (url) => { let u; try { u = new URL(url); } catch { return { ok: false, why: "not a web address" }; } if (!/^https?:$/.test(u.protocol)) return { ok: false, why: "not a web address" }; if (!allowLocal) { const t = await testableUrl(u.href, resolve ? { resolve } : {}); if (!t.ok) return { ok: false, why: t.why }; } return { ok: true, u }; };
  async function read(url) {
    if (cache.has(url)) return cache.get(url);
    const run = (async () => {
      const a = await allowedUrl(url); if (!a.ok) return { ok: false, url, why: a.why, checkedOn: day(on) };
      const r = await robots.check(a.u.href);
      if (!r.allowed) return { ok: false, url, why: r.state === "UNKNOWN" ? "its robots.txt could not be read — not read" : "its robots.txt asks us not to read it — not read", checkedOn: day(on) };
      const res = await get(a.u.href, "text/html,application/xhtml+xml");
      if (res.failed) return { ok: false, url, why: `could not be read (${res.failed})`, checkedOn: day(on) };
      if (!res.ok) return { ok: false, url, why: `the page answered ${res.status}`, checkedOn: day(on) };
      if (!/text\/html|application\/xhtml/i.test(res.headers.get("content-type") ?? "")) return { ok: false, url, why: "not a web page (a file Visibility does not read here)", checkedOn: day(on) };
      const html = Buffer.from(await res.arrayBuffer()).subarray(0, OFFICIAL.maxBytes).toString("utf8");
      return { ok: true, url: res.finalUrl ?? a.u.href, title: one(/<title\b[^>]*>([\s\S]*?)<\/title>/i, html), h1: one(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, html), text: pageText(html), checkedOn: day(on) };
    })();
    cache.set(url, run);
    return run;
  }
  /** the pages a site lists in its sitemap(s) — its robots.txt "Sitemap:" lines and /sitemap.xml, robots obeyed */
  async function sitemapOf(siteUrl) {
    const a = await allowedUrl(siteUrl); if (!a.ok) return { ok: false, why: a.why, urls: [] };
    const origin = a.u.origin;
    const rt = (await robots.check(`${origin}/`));
    if (!rt.allowed) return { ok: false, why: "its robots.txt does not let us read it", urls: [] };
    const rtxt = await get(`${origin}/robots.txt`, "text/plain");
    const listed = rtxt.ok ? [...(await rtxt.text()).matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
    const queue = [...new Set([...listed, `${origin}/sitemap.xml`])].filter((s) => { try { return new URL(s).origin === origin; } catch { return false; } }), urls = new Set(), seen = new Set();
    while (queue.length && seen.size < 8) {
      const s = queue.shift(); if (seen.has(s)) continue; seen.add(s);
      if (!(await robots.check(s)).allowed) continue;
      const r = await get(s, "application/xml,text/xml"); if (r.failed || !r.ok) continue;
      const sm = parseSitemap((await r.text()).slice(0, 5_000_000));
      for (const u of sm.urls) if (u.startsWith(origin)) urls.add(u);
      for (const x of sm.sitemaps) if (x.startsWith(origin)) queue.push(x);
    }
    return { ok: urls.size > 0, origin, urls: [...urls], why: urls.size ? null : "no sitemap could be read" };
  }
  return { read, sitemapOf, requests: () => count, on: day(on) };
}

/* an organisation a page names: capitalised words with a body word (Board, Council, …), and its short name in brackets when given */
const BODY = /\b(?:[A-Z][\p{L}'’.-]+|of|and|for|the|&)(?:\s+(?:[A-Z][\p{L}'’.-]+|of|and|for|the|&)){0,24}\s*(?:\(([A-Z][A-Za-z&]{1,9})\))?/gu;
const BODY_END = /\b(Board|Council|Agency|Authority|College|Ministry|Department|Federation|Commission|Registry|Regulator|Association|Service|Executive|Society|Institute)\b(?:\s+(?:of|for)(?:\s+the)?(?:\s+[A-Z][\p{L}'’-]+){1,3})?$/u;
const BODY_WORD = /^(Board|Council|Agency|Authority|College|Ministry|Department|Federation|Commission|Registry|Regulator|Association|Service|Executive|Society|Institute)$/;
const CONNECT = new Set(["of", "and", "for", "the", "&"]);
/* a new name starts at a capitalised word when the words before it already hold a body word and 1–3 capitalised words then a body word follow */
function splitBodies(run) {
  const out = [];
  for (const sent of String(run).split(/\.\s+/)) {
    const w = sent.split(/\s+/).filter(Boolean); let cur = [];
    for (let i = 0; i < w.length; i++) {
      const starts = cur.some((x) => BODY_WORD.test(x)) && (w[i] === "The" || !CONNECT.has(String(w[i - 1]).toLowerCase()) && /^[A-Z]/.test(w[i]) && [1, 2, 3].some((k) => w.slice(i, i + k).every((x) => /^[A-Z]/.test(x) && !BODY_WORD.test(x)) && BODY_WORD.test(w[i + k] ?? "")));
      /* "… College of Pharmacy and the Ministry of Education": an "and" after a whole name, before another one, starts a new name */
      if (w[i] === "and" && cur.some((x) => BODY_WORD.test(x)) && w.slice(i + 1, i + 6).some((x) => BODY_WORD.test(x))) { out.push(cur.join(" ")); cur = []; continue; }
      if (starts) { out.push(cur.join(" ")); cur = []; }
      cur.push(w[i]);
    }
    if (cur.length) out.push(cur.join(" "));
  }
  return out;
}
export function bodiesIn(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(BODY)) {
    /* a run of names with no comma between them ("Dental Council of Ireland Veterinary Council of Ireland") is split after each body */
    for (let part of splitBodies(m[0].replace(/\s*\([^)]*\)\s*$/, ""))) {
      for (let k = 0; k < 4; k++) part = part.replace(/^(?:of|and|for|the|The|&)\s+|\s+(?:of|and|for|the|&)$/g, "").trim();
      if (!BODY_END.test(part) || part.split(/\s+/).length < 2 || /-\S*-/.test(part)) continue;
      if (!out.some((x) => x.name === part)) out.push({ name: part, short: m[0].endsWith(")") ? m[1] ?? null : null });
    }
  }
  return out.slice(0, 12);
}
/* what a body's page says next to the subject: the grades and scores in the sentences that name it */
export function resultsNamedWith(text, subject) {
  const out = new Set();
  for (const s of String(text ?? "").split(/(?<=[.!?;])\s+/)) {
    if (!has(s, subject)) continue;
    for (const m of s.matchAll(/\bgrades?\s+([ABC]\+?)(?![\p{L}])|(?<![\p{L}])([ABC]\+?)\s+grades?\b/gu)) out.add(`grade ${m[1] ?? m[2]}`);
    for (const m of s.matchAll(/\b([1-5]\d0)\b/g)) out.add(m[1]);
  }
  return [...out].slice(0, 6);
}
const claimId = (link, text) => `official-${createHash("sha256").update(`${link}|${text}`).digest("hex").slice(0, 16)}`;
const RECOGNISED = /\b(recogni[sz]\w*|accept\w*|requir\w*|approved)\b|\b(trusted|preferred) by\b/i; // "the trusted English test" is praise, not recognition

/**
 * Does the SUBJECT'S OWN SITE keep this item (a country)? A page whose address or heading names it, read, that names the subject and says it
 * is recognised or accepted. → { kept, source:{ url, title }, checkedOn, how, bodies } or { kept:false, why }.
 */
export async function itemOnSubjectSite({ item, names = namesOf(item), subject, sitemapUrls, reader, subjectName }) {
  const slugs = names.map(slugOf).filter((s) => s.length >= 2);
  /* its recognition pages first ("who recognises", "recognising organisations"), then the shortest addresses — a blog post last */
  const blog = (u) => /\/(post|posts|blog|news|article|articles|story|stories)\//i.test(u);
  const rank = (u) => (/recogni|accept|requirement/i.test(u) ? 0 : 2) + (blog(u) ? 1 : 0);
  const cands = sitemapUrls.filter((u) => { const p = new URL(u).pathname.toLowerCase(); return slugs.some((s) => new RegExp(`(^|/|-)${esc(s)}(/|-|$)`).test(p)); }).sort((a, b) => rank(a) - rank(b) || a.length - b.length).slice(0, 2);
  for (const url of cands) {
    const r = await reader.read(url); if (!r.ok) continue;
    /* the SAME sentence names the place and says recognised / accepted / required ("…to Ireland with the OET Test, recognised by key
     * regulators") — a page that only mentions the place somewhere (a test centre, a story) does not keep it */
    /* …and the subject in that sentence, the place within 15 words of the recognising word; "from Brazil to Ireland" keeps Ireland, never Brazil */
    const near = (s) => { const w = s.split(/\s+/); const at = (re) => w.map((x, i) => (re(x, i) ? i : -1)).filter((i) => i >= 0); const P = at((x) => names.some((n) => has(x, n) || (n.includes(" ") && has(s, n) && has(x, n.split(" ")[0])))), R = at((x, i) => RECOGNISED.test(x) || (/^(trusted|preferred)$/i.test(x) && /^by$/i.test(w[i + 1] ?? ""))); return P.some((p) => R.some((q) => Math.abs(p - q) <= 15)); };
    const says = `${r.h1 ?? ""}. ${r.text}`.split(/(?<=[.!?”"])\s+/).some((s) => names.some((n) => has(s, n)) && RECOGNISED.test(s) && has(s, subject) && near(s) && !originsIn(s).includes(item));
    if (says && has(r.text, subject)) return { kept: true, source: { url: r.url, title: r.title }, checkedOn: r.checkedOn, how: `${subjectName}'s own page for ${item} says ${subject} is recognised or accepted there`, bodies: bodiesIn(r.text).map((b) => b.name) };
  }
  return { kept: false, why: cands.length ? `${subjectName}'s pages for ${item} do not say ${subject} is recognised there` : `${subjectName}'s own site lists no page for ${item}`, checkedOn: day(reader.on) };
}

/** The answer lines for one country: from the subject's own page (what it shows) and from each body's own page (read here). */
export async function officialClaims({ country, subject, subjectName, kept, bodyPages = [], reader }) {
  const claims = [], notSaid = [];
  if (kept?.kept) {
    const text = `${subjectName}'s own page for ${country} says ${subject} is recognised or accepted there${kept.bodies?.length ? `, and names ${kept.bodies.slice(0, 4).join(", ")}` : ""}.`;
    claims.push({ claimId: claimId(kept.source.url, text), text, link: kept.source.url, readOn: kept.checkedOn, source: `${subjectName} — its page for ${country}`, official: true, body: subjectName });
  }
  for (const b of bodyPages) {
    const r = await reader.read(b.url);
    const body = b.body || String(r.title ?? "").split(/\s+[|·—–-]\s+/).pop() || new URL(b.url).hostname;
    if (!r.ok) { notSaid.push({ body, url: b.url, checkedOn: r.checkedOn, line: `The official page of ${body} could not be read on ${r.checkedOn} (${r.why}).` }); continue; }
    if (!has(r.text, subject)) { notSaid.push({ body, url: r.url, checkedOn: r.checkedOn, line: `The official page of ${body}, checked ${r.checkedOn}, does not say this.` }); continue; }
    const results = resultsNamedWith(r.text, subject);
    const text = `${body} names ${subject} on its own page${RECOGNISED.test(r.text) ? " among the English tests it accepts" : ""}${results.length ? ` — the results it names with ${subject}: ${results.join(", ")}` : ""}.`;
    claims.push({ claimId: claimId(r.url, text), text, link: r.url, readOn: r.checkedOn, source: `${body} — its own page`, official: true, body });
  }
  return { claims, notSaid };
}
