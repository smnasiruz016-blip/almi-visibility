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
import { USER_AGENT } from "./user-agent.mjs"; // RR-328: not the whole site reader (the website uses this reader)
import { namesOf, slugOf, originsIn } from "./world.mjs";
import { pdfText, isPdf, PDF_TEXT } from "../src/facts/pdf-text.mjs";

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
  /* RR-321 A2: Google's robots rule (RFC 9309) — a 4xx robots.txt lets the site be read; a 5xx or no answer: not now, again next run */
  const robots = createRobotsCache({ fetchImpl, userAgent: USER_AGENT, beforeRequest: pace, rfc9309: true, allowHop: async (u) => (await allowedUrl(u)).ok });
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
      if (!r.allowed) return { ok: false, url, why: r.state === "UNKNOWN" ? `its robots.txt could not be read (${r.reason}) — not read now${r.retryLater ? ", tried again on the next run" : ""}` : "its robots.txt asks us not to read it — not read", robots: r.state, retryLater: Boolean(r.retryLater), checkedOn: day(on) };
      const res = await get(a.u.href, "text/html,application/xhtml+xml,application/pdf");
      if (res.failed) return { ok: false, url, why: `could not be read (${res.failed})`, checkedOn: day(on) };
      if (!res.ok) return { ok: false, url, why: `the page answered ${res.status}`, checkedOn: day(on) };
      const type = res.headers.get("content-type") ?? "", final = res.finalUrl ?? a.u.href;
      /* RR-319 C3: an official PDF (a registration standard, a guidance document) is read too — its text only, through the engine's PDF reader */
      if (/application\/pdf/i.test(type) || (/\.pdf($|\?)/i.test(final) && !/text\/html/i.test(type))) {
        const bytes = Buffer.from(await res.arrayBuffer()).subarray(0, OFFICIAL.maxBytes * 4);
        const p = isPdf(bytes) ? pdfText(bytes) : null;
        if (!p || p.state !== PDF_TEXT.TEXT) return { ok: false, url, why: p?.state === PDF_TEXT.NO_TEXT ? "a PDF with no text (a scanned image)" : "a PDF that could not be read", checkedOn: day(on) };
        const name = decodeURIComponent(new URL(final).pathname.split("/").pop() ?? "document.pdf");
        return { ok: true, url: final, title: name, h1: null, text: String(p.text).replace(/\s+/g, " ").trim(), links: [], pdf: true, checkedOn: day(on) };
      }
      if (!/text\/html|application\/xhtml/i.test(type)) return { ok: false, url, why: "not a web page (a file Visibility does not read here)", checkedOn: day(on) };
      const html = Buffer.from(await res.arrayBuffer()).subarray(0, OFFICIAL.maxBytes).toString("utf8");
      /* RR-321: a site's security service answering in the page's place (SBP: "Sorry, you have been blocked") is a refusal, never the page */
      if (/<title>\s*(Attention Required!|Just a moment\.\.\.)|Sorry, you have been blocked|cf-error-details/i.test(html.slice(0, 20000))) return { ok: false, url, why: "its security service refused the reading (a block page answered, not the page) — not read", blocked: true, checkedOn: day(on) };
      const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => { try { return { href: new URL(decode(m[1]), final).href, text: decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() }; } catch { return null; } }).filter(Boolean).slice(0, 3000); // RR-319: a regulator's page can carry hundreds of menu links before its own
      return { ok: true, url: final, title: one(/<title\b[^>]*>([\s\S]*?)<\/title>/i, html), h1: one(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, html), text: pageText(html), links, checkedOn: day(on) };
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
  /** RR-319: an official data file (the ECB's reference rates, XML) — public, robots obeyed, GET only; its text, or null */
  async function raw(url, accept = "text/xml,application/xml,text/plain") {
    const a = await allowedUrl(url); if (!a.ok) return null;
    if (!(await robots.check(a.u.href)).allowed) return null;
    const r = await get(a.u.href, accept); if (r.failed || !r.ok) return null;
    return Buffer.from(await r.arrayBuffer()).subarray(0, OFFICIAL.maxBytes).toString("utf8");
  }
  return { read, raw, sitemapOf, requests: () => count, on: day(on) };
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
/* RR-319 A3: a place where the test can be TAKEN — the same sentence names the place and a venue, a test centre or test dates (the country a
 * person comes FROM counts here: it is where they sit the test) */
const VENUE = /\b(venues?|test (centres?|centers?|locations?|dates?|sessions?)|test(ing)? cent(re|er)s?|sit(ting)? (the|your|an?)\b|take (the|your) (test|exam)|book(ing)? (a|the|your) (test|place))\b/i;
export async function itemOnSubjectSite({ item, names = namesOf(item), subject, sitemapUrls, reader, subjectName, mode = "recognised" }) {
  const WORD = mode === "venue" ? VENUE : RECOGNISED;
  const slugs = names.map(slugOf).filter((s) => s.length >= 2);
  /* its recognition pages first ("who recognises", "recognising organisations"), then the shortest addresses — a blog post last */
  const blog = (u) => /\/(post|posts|blog|news|article|articles|story|stories)\//i.test(u);
  const rank = (u) => ((mode === "venue" ? /test|venue|cent(re|er)|book|find|date/i : /recogni|accept|requirement/i).test(u) ? 0 : 2) + (blog(u) ? 1 : 0);
  const cands = sitemapUrls.filter((u) => { const p = new URL(u).pathname.toLowerCase(); return slugs.some((s) => new RegExp(`(^|/|-)${esc(s)}(/|-|$)`).test(p)); }).sort((a, b) => rank(a) - rank(b) || a.length - b.length).slice(0, 2);
  for (const url of cands) {
    const r = await reader.read(url); if (!r.ok) continue;
    /* the SAME sentence names the place and says recognised / accepted / required ("…to Ireland with the OET Test, recognised by key
     * regulators") — a page that only mentions the place somewhere (a test centre, a story) does not keep it */
    /* …and the subject in that sentence, the place within 15 words of the recognising word; "from Brazil to Ireland" keeps Ireland, never Brazil */
    const near = (s) => { const w = s.split(/\s+/); const at = (re) => w.map((x, i) => (re(x, i) ? i : -1)).filter((i) => i >= 0); const P = at((x) => names.some((n) => has(x, n) || (n.includes(" ") && has(s, n) && has(x, n.split(" ")[0])))), R = at((x, i) => (mode === "venue" ? VENUE.test(w.slice(Math.max(0, i - 1), i + 3).join(" ")) : RECOGNISED.test(x)) || (/^(trusted|preferred)$/i.test(x) && /^by$/i.test(w[i + 1] ?? ""))); return P.some((p) => R.some((q) => Math.abs(p - q) <= 15)); };
    const says = `${r.h1 ?? ""}. ${r.text}`.split(/(?<=[.!?”"])\s+/).some((s) => names.some((n) => has(s, n)) && WORD.test(s) && has(s, subject) && near(s) && (mode === "venue" || !originsIn(s).includes(item)));
    if (says && has(r.text, subject)) return { kept: true, source: { url: r.url, title: r.title }, checkedOn: r.checkedOn, how: mode === "venue" ? `${subjectName}'s own page says ${subject} can be taken in ${item}` : `${subjectName}'s own page for ${item} says ${subject} is recognised or accepted there`, bodies: bodiesIn(r.text).map((b) => b.name), regulatorLinks: regulatorLinks(r) };
  }
  return { kept: false, why: cands.length ? (mode === "venue" ? `${subjectName}'s pages for ${item} name no test venue there` : `${subjectName}'s pages for ${item} do not say ${subject} is recognised there`) : `${subjectName}'s own site lists no page for ${item}`, checkedOn: day(reader.on) };
}

/*
 * RR-319 C4 (owner: NMBI showed "350, 450, 300, 340" mixed): the result for EACH sub-test, as the official page states it — "Listening B
 * (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)". Read only near the subject's name; every distinct set the
 * page states is kept apart (Ahpra's page states two — its standard before and after a date), never mixed into one list of numbers.
 */
const SUBTESTS = ["Listening", "Reading", "Writing", "Speaking"];
export function subtestResults(text, subject) {
  const t = String(text ?? ""), sets = [];
  for (let i = t.indexOf(subject); i >= 0; i = t.indexOf(subject, i + subject.length)) {
    const win = t.slice(i, i + 700), set = {};
    for (const m of win.matchAll(/\b(Listening|Reading|Writing|Speaking)\b\s*[:\-–]?\s*(?:grade\s+)?([ABC]\+?)?\s*\(?\s*(\d{3})?(?:\s*[-–]\s*(\d{3}))?\s*\)?/g)) {
      if (set[m[1]] || (!m[2] && !m[3])) continue;
      set[m[1]] = [m[2], m[3] ? (m[4] ? `(${m[3]}–${m[4]})` : m[3]) : null].filter(Boolean).join(" ").replace(/^(\d{3})$/, "$1");
    }
    /* a TABLE whose header names the four sub-tests just before the subject's row ("Test Listening Reading Writing Speaking … OET B (350 or
     * above) B (350 or above) C+(300 or above) B (350 or above)" — the NMC's page): the row's four values in the header's order */
    if (!Object.keys(set).length) { // only where the words below name NO sub-test (NMBI: a half-read window took "C+ in one component" as a row)
      const before = t.slice(Math.max(0, i - 300), i), order = [...before.matchAll(/\b(Listening|Reading|Writing|Speaking)\b/g)].map((m) => m[1]).slice(-4);
      const vals = [...t.slice(i + subject.length, i + subject.length + 220).matchAll(/([ABC]\+?)\s*\(?\s*(\d{3})?\s*(or above|[-–]\s*\d{3})?\s*\)?/g)].filter((m) => m[1]).slice(0, 4);
      if (new Set(order).size === 4 && vals.length === 4) order.forEach((s, k) => { const v = vals[k]; set[s] = [v[1], v[2] ? `(${v[2]}${v[3] ? (/above/.test(v[3]) ? " or above" : `–${v[3].replace(/[-–\s]/g, "")}`) : ""})` : null].filter(Boolean).join(" "); });
    }
    if (SUBTESTS.every((s) => set[s])) { const line = SUBTESTS.map((s) => `${s} ${set[s]}`).join(" · "); if (!sets.includes(line)) sets.push(line); }
  }
  return sets;
}
/* which professions a body is for, from its own name ("Nursing and Midwifery Board of Ireland" → nursing; "Medical Council" → medicine) —
 * a body whose name names no profession (Ahpra, a ministry) is for every profession */
const BODY_PROFESSION = [[/\bnurs|midwi/i, "nursing"], [/\bmedic(al|ine)\b|physician|doctors?\b/i, "medicine"], [/\bdent/i, "dentistry"], [/\bpharma/i, "pharmacy"], [/\bphysiotherap|physical therap/i, "physiotherapy"], [/\boccupational therap/i, "occupational therapy"], [/\bradiograph|radiat|medical imaging/i, "radiography"], [/\bdiet|nutrition/i, "dietetics"], [/\boptom|optic/i, "optometry"], [/\bpodiat/i, "podiatry"], [/\bspeech/i, "speech pathology"], [/\bveterin/i, "veterinary science"]];
/* RR-319 ADD 3 (owner: "Australia listed only Department of Home Affairs") — a body that registers health professionals, never a visa or
 * education office: only such a body's rule splits or answers a requirement page */
const NOT_HEALTH = /\b(home affairs|immigration|visa|border|education|skills? assessment|citizenship|foreign affairs)\b/i;
const HEALTH = /\b(health(?:care)?|practitioner|nurs|midwi|medic|dent|pharma|physio|therap|radiograph|dietit|optom|podiat|speech|veterin|ahpra|nmbi|nmc|gmc|regulat|registration|council|board)\b/i;
export const isHealthRegulator = (name) => !NOT_HEALTH.test(String(name ?? "")) && HEALTH.test(String(name ?? ""));
/** the regulators' own sites the subject's country page links to (an official lead, read before it is used) */
export const regulatorLinks = (page) => {
  let own = ""; try { own = new URL(page.url).hostname.replace(/^www\./, ""); } catch { return []; }
  return [...new Map((page.links ?? []).map((l) => { try { const u = new URL(l.href, page.url); return { url: u.href.replace(/#.*$/, ""), host: u.hostname.replace(/^www\./, ""), text: String(l.text ?? "").trim() }; } catch { return null; } })
    .filter((l) => l && /^https?:$/.test(new URL(l.url).protocol) && l.host !== own && !l.host.endsWith(`.${own}`) && isHealthRegulator(`${l.text} ${l.host}`) && !/facebook|twitter|linkedin|youtube|instagram|x\.com/i.test(l.host))
    .map((l) => [l.host, { url: l.url, body: l.text.length >= 3 && l.text.length <= 90 ? l.text : l.host, from: "linked from the subject's own page for this country" }])).values()].slice(0, 6);
};
export const professionsOfBody = (name) => { const hit = BODY_PROFESSION.filter(([re]) => re.test(String(name ?? ""))).map(([, p]) => p); return hit.length ? [...new Set(hit)] : null; };
/* the related official pages worth reading when a body's page does not say it: its "accepted tests" / English requirements / registration
 * standard pages and their PDFs — on the body's own site, or a site of the same body family (the NMBA under Ahpra) */
const RELATED = [/accepted[^/]*(english|language)?[^/]*tests?|english[^/]*tests?/i, /english|language/i, /registration[^/]*standard|standard/i];
const sameFamily = (a, b) => { const base = (h) => h.replace(/^www\./, "").split(".").slice(-3).join("."); try { const x = new URL(a).hostname, y = new URL(b).hostname; return base(x) === base(y) || x.split(".").slice(-2).join(".") === y.split(".").slice(-2).join("."); } catch { return false; } };
/* a university's own pages that state its entry rules */
export const UNIVERSITY_RELATED = [/english[^/]*(language|requirement|proficien)|language requirement/i, /entry requirement|admission requirement|international (student|applicant)s?/i, /admission|international/i];
export function relatedLinks(page, ranks = RELATED) {
  const seen = new Set([page.url]);
  return (page.links ?? []).filter((l) => sameFamily(l.href, page.url) || /\.gov\.|\.gov$|\.govt\./i.test(new URL(l.href).hostname))
    .map((l) => ({ ...l, rank: ranks.findIndex((re) => re.test(`${l.text} ${l.href}`)) })).filter((l) => l.rank >= 0 && !seen.has(l.href) && seen.add(l.href))
    .sort((a, b) => a.rank - b.rank || /\.pdf/i.test(a.href) - /\.pdf/i.test(b.href)).slice(0, 4);
}
/**
 * One body's answer (RR-319 C3: "never conclude 'does not say' from a main page alone"): its page, and when that does not name the subject,
 * up to 4 of its related official pages (accepted tests, English requirements, the registration standard, their PDFs). → { claim } or
 * { notSaid } with EVERY page checked.
 */
const ENGLISH_PAGE = /english[-_]?language[-_]?(requirements?|proficiency|tests?|skills?|standards?)|english-requirements|language-requirements|english-proficiency|accepted[-_]english|overseas[-_]?(trained|qualified|educated|applicants?)|internationally[-_]?(qualified|educated|trained)|international[-_](applicants?|graduates?|nurses|doctors|pharmacists)|english[-_]?(test|language)/i; // RR-321 proof: the Ahpra boards' "English-language-skills" standard; RR-322 A2: the overseas-trained registration pages
export async function bodyAnswer({ url, body: bodyName = null, subject, reader, related = RELATED, sitemap = false }) {
  const first = await reader.read(url);
  const body = bodyName || String(first.title ?? "").split(/\s+[|·—–-]\s+/).pop() || new URL(url).hostname;
  const checked = [first], pages = [first];
  if (first.ok && !(has(first.text, subject) && (subtestResults(first.text, subject).length || resultsNamedWith(first.text, subject).length))) for (const l of relatedLinks(first, related)) { const r = await reader.read(l.href); checked.push(r); pages.push(r); }
  /* RR-319 A2 (real run: 0 of 15 universities — their English page is deeper than a home page's links): a university's OWN sitemap names its
   * English-language-requirements page; read up to two of them (robots obeyed) */
  if (sitemap && first.ok && !pages.some((p) => p.ok && has(p.text, subject)) && reader.sitemapOf) { const sm = await reader.sitemapOf(new URL(first.url ?? url).origin).catch(() => null); for (const u of (sm?.urls ?? []).filter((x) => ENGLISH_PAGE.test(x)).sort((a, b) => a.length - b.length).slice(0, 3)) { const r = await reader.read(u); checked.push(r); pages.push(r); } }
  const good = pages.filter((p) => p.ok && has(p.text, subject)).sort((a, b) => subtestResults(b.text, subject).length - subtestResults(a.text, subject).length || resultsNamedWith(b.text, subject).length - resultsNamedWith(a.text, subject).length)[0];
  if (!good) {
    const read = checked.filter((p) => p.ok), failed = checked.filter((p) => !p.ok);
    const line = read.length ? `The official ${read.length === 1 ? "page" : `pages (${read.length})`} of ${body}, checked ${first.checkedOn}, ${read.length === 1 ? "does" : "do"} not say this${failed.length ? `; ${failed.length} more could not be read` : ""}.` : `The official page of ${body} could not be read on ${first.checkedOn} (${first.why}).`;
    return { notSaid: { body, url, checkedOn: first.checkedOn, line, checked: checked.map((p) => ({ url: p.url, ok: p.ok, why: p.why ?? null })) } };
  }
  const sets = subtestResults(good.text, subject), loose = sets.length ? [] : resultsNamedWith(good.text, subject);
  const results = sets.length ? (sets.length === 1 ? ` — ${sets[0]}` : ` — ${sets.map((s, i) => `set ${i + 1} on the page: ${s}`).join("; ")}`) : loose.length ? ` — the results it names with ${subject}: ${loose.join(", ")}` : "";
  const text = `${body} names ${subject} on its own ${good.pdf ? "document" : "page"}${RECOGNISED.test(good.text) ? " among the English tests it accepts" : ""}${results}.`;
  return { claim: { claimId: claimId(good.url, text), text, link: good.url, readOn: good.checkedOn, source: `${body} — its own ${good.pdf ? "document" : "page"}`, official: true, body, professions: professionsOfBody(body), named: professionsNamedIn(good.text), rule: `${sets.join("|") || loose.join(",") || "named"}`, sets } };
}
/* RR-320 · the professions a regulator's OWN page names as the people it registers ("pharmacists", "medical practitioners") — for a body
 * whose name names no profession (Ahpra), the page says which professions its rule is for; a page that names none says nothing about one */
const PEOPLE = [[/\bnurses?\b|\bnursing\b|\bmidwi(fe|ves|fery)\b/i, "nursing"], [/\bmedical practitioners?\b|\bdoctors\b|\bphysicians?\b|\bmedical graduates?\b/i, "medicine"], [/\bdentists?\b|\bdental practitioners?\b/i, "dentistry"], [/\bpharmacists?\b/i, "pharmacy"], [/\bphysiotherapists?\b|\bphysical therapists?\b/i, "physiotherapy"], [/\boccupational therapists?\b/i, "occupational therapy"], [/\bradiographers?\b|\bmedical radiation practitioners?\b/i, "radiography"], [/\bdietitians?\b|\bdieticians?\b/i, "dietetics"], [/\boptometrists?\b/i, "optometry"], [/\bpodiatrists?\b/i, "podiatry"], [/\bspeech (and language )?(pathologists?|therapists?)\b/i, "speech pathology"], [/\bveterinar(y surgeons?|ians?)\b/i, "veterinary science"]];
export const professionsNamedIn = (text) => PEOPLE.filter(([re]) => re.test(String(text ?? ""))).map(([, p]) => p);

/** The answer lines for one country: from the subject's own page (what it shows) and from each body's own page (read here). */
export async function officialClaims({ country, subject, subjectName, kept, bodyPages = [], reader }) {
  const claims = [], notSaid = [];
  if (kept?.kept) {
    const text = `${subjectName}'s own page for ${country} says ${subject} is recognised or accepted there${kept.bodies?.length ? `, and names ${kept.bodies.slice(0, 4).join(", ")}` : ""}.`;
    claims.push({ claimId: claimId(kept.source.url, text), text, link: kept.source.url, readOn: kept.checkedOn, source: `${subjectName} — its page for ${country}`, official: true, body: subjectName });
  }
  for (const b of bodyPages) {
    const got = await bodyAnswer({ url: b.url, body: b.body, subject, reader });
    if (got.claim) claims.push(got.claim); else notSaid.push(got.notSaid);
  }
  return { claims, notSaid };
}
