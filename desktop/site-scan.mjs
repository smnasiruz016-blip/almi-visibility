/**
 * 🔴 RR-386 §2.3 · THE SCAN (replaces RR-385 item h and "Check before going live"). What beta-g ran by hand on 7 Nov, as the app's own:
 * every page the site serves — the app's pages, what the sitemaps list, and everything linked from the home page, crawled on the same
 * domain — read once, then eleven checks, each with its count and the pages that fail it. It runs inside every autopilot cycle (on the
 * preview before going live, on the live site after), and behind "Check my site now". It reads only the client's own site (no search
 * engine, no third party). Pure but for the injected fetch.
 *   scanSite({ origin, pages, fetchImpl, maxPages, concurrency }) → { ok, on, origin, crawled, rows: [{ key, check, mustBe, ok, count, sample }], serious, listed }
 */
import { FORBIDDEN, visibleQa, faqData } from "./page-law.mjs";

export const SCAN_CHECKS = Object.freeze([
  Object.freeze({ key: "status", check: "Status", mustBe: "Every page answers 200" }),
  Object.freeze({ key: "links", check: "Internal links", mustBe: "0 broken (absolute links to the own domain included)" }),
  Object.freeze({ key: "noindexInSitemap", check: "Noindex pages in any sitemap", mustBe: "0" }),
  Object.freeze({ key: "notInSitemap", check: "Indexable pages in no sitemap", mustBe: "Listed, with the reason" }),
  Object.freeze({ key: "forbidden", check: "Forbidden texts (Q&A LAW 5.2)", mustBe: "0 (\"not confirmed yet\" is allowed)" }),
  Object.freeze({ key: "faq", check: "FAQ data", mustBe: "Equal to the visible Q&A on every page" }),
  Object.freeze({ key: "canonical", check: "Canonical", mustBe: "On every page, pointing to the live domain" }),
  Object.freeze({ key: "titles", check: "Titles", mustBe: "Unique among indexable pages" }),
  Object.freeze({ key: "robots", check: "robots.txt", mustBe: "Allows the indexable pages" }),
  Object.freeze({ key: "sitemap", check: "Sitemap", mustBe: "The sitemap robots.txt names answers 200" }),
  Object.freeze({ key: "lastChecked", check: "\"Last checked\"", mustBe: "The OLDEST fact date on the page (Q&A LAW 5A.6)" }),
]);
/* every numeric entity too (the live home page writes an apostrophe as &#x27;: the first real scan read it as a different answer) */
const decode = (s) => String(s ?? "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const text = (h) => decode(String(h ?? "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const norm = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mainOf = (h) => /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(String(h ?? ""))?.[1] ?? /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(String(h ?? ""))?.[1] ?? String(h ?? "");
/** one address per page: no fragment, no query, no trailing slash (the home is the origin) */
export const pageKey = (u, base = undefined) => { try { const x = new URL(decode(u), base); if (!/^https?:$/.test(x.protocol)) return null; return `${x.origin}${x.pathname.replace(/\/+$/, "")}`; } catch { return null; } };
const isAsset = (k) => /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|mp3|mp4|woff2?|ttf|map)$/i.test(new URL(k).pathname);
/** robots.txt → the Disallow / Allow rules for "*" (and Googlebot), and the sitemaps it names */
export function readRobots(txt) {
  const groups = [], sitemaps = []; let cur = null, lastWasAgent = false;
  for (const raw of String(txt ?? "").split(/\r?\n/)) { const line = raw.replace(/#.*$/, "").trim(); if (!line) continue; const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line); if (!m) continue; const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "sitemap") { sitemaps.push(v); continue; }
    if (k === "user-agent") { if (!lastWasAgent || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false; if (cur && (k === "disallow" || k === "allow")) cur.rules.push({ allow: k === "allow", path: v }); }
  const pick = groups.find((g) => g.agents.includes("googlebot")) ?? groups.find((g) => g.agents.includes("*")) ?? { rules: [] };
  return { rules: pick.rules.filter((r) => r.path !== "" || r.allow), sitemaps };
}
/** Google's rule: the longest matching path wins; Allow wins a tie */
export function robotsAllows(rules, path) {
  let best = null; for (const r of rules) { if (!r.path) continue; const re = new RegExp(`^${r.path.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*").replace(/\\\$$/, "$")}`); if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r; }
  return !best || best.allow;
}
/** the page's own facts: every "checked YYYY-MM-DD" / "read YYYY-MM-DD" in the page, and its "Last checked" date */
export function datesOf(html) {
  const m = mainOf(html), last = /Last checked[^0-9<]{0,40}(?:<[^>]+>[^0-9<]{0,20})*(\d{4}-\d{2}-\d{2})/i.exec(m)?.[1] ?? null;
  const facts = [...m.replace(/Last checked[^0-9<]{0,40}(?:<[^>]+>[^0-9<]{0,20})*\d{4}-\d{2}-\d{2}/gi, "").matchAll(/\b(?:checked|read)(?: on)? (\d{4}-\d{2}-\d{2})\b/gi)].map((x) => x[1]).sort();
  return { last, oldest: facts[0] ?? null };
}
/** FAQ data against the visible Q&A (Q&A LAW 5.4) → the differences */
export function faqDiff(html) {
  const qa = visibleQa(html), faq = faqData(html), out = []; if (!faq.length) return out;
  /* a page of the site's own code (no app question blocks): each FAQ question and answer must stand in the page's visible text */
  if (!qa.length) { const shown = norm(text(String(html).replace(/<script[\s\S]*?<\/script>/gi, " "))); for (const f of faq) { if (!shown.includes(norm(f.q))) out.push(`FAQ data asks "${f.q.slice(0, 60)}", not shown`); else if (!shown.includes(norm(f.a).slice(0, 80))) out.push(`FAQ data answers "${f.q.slice(0, 60)}" otherwise than the page`); } return out; }
  const seen = new Map(qa.map((x) => [norm(x.q), x]));
  for (const f of faq) { const v = seen.get(norm(f.q)); if (!v) out.push(`FAQ data asks "${f.q.slice(0, 60)}", not shown`); else if (!v.answers.some((a) => norm(a.words).includes(norm(f.a).slice(0, 120)) || norm(f.a).includes(norm(a.words).slice(0, 120)))) out.push(`FAQ data answers "${f.q.slice(0, 60)}" otherwise than the page`); }
  const asked = new Set(faq.map((f) => norm(f.q))); for (const x of qa) if (x.answers.length && !asked.has(norm(x.q))) out.push(`"${x.q.slice(0, 60)}" shown, not in the FAQ data`);
  return out;
}
const forbiddenIn = (html) => { const t = `${text(mainOf(html))} ${faqData(html).map((x) => `${x.q} ${x.a}`).join(" ")}`; return FORBIDDEN.filter((re) => re.test(t)).map((re) => re.source); };

export async function scanSite({ origin, pages = [], fetchImpl = fetch, maxPages = 900, concurrency = 6, timeoutMs = 20000, ua = "AlmiVisibility-scan", now = () => Date.now() }) {
  const home = pageKey(origin); if (!home) return { ok: false, why: "No site address to scan." };
  const host = new URL(home).origin, get = async (u) => { try { const r = await fetchImpl(u, { headers: { "user-agent": ua, accept: "text/html,application/xml;q=0.9,*/*;q=0.5" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) }); const ct = String(r.headers?.get?.("content-type") ?? ""); const body = /html|xml|text/i.test(ct) || !ct ? await r.text().catch(() => "") : ""; return { status: r.status, body, finalUrl: r.url || u, ct }; } catch (e) { return { status: 0, body: "", why: String(e?.message ?? e).slice(0, 80) }; } };
  /* robots.txt and every sitemap it names (one level of index) */
  const rb = await get(`${host}/robots.txt`), robots = readRobots(rb.status === 200 ? rb.body : ""), sitemapRows = [], inSitemap = new Set();
  const queue = robots.sitemaps.filter((u) => { try { return new URL(u).origin === host; } catch { return false; } }), seenMaps = new Set();
  while (queue.length && seenMaps.size < 30) { const u = queue.shift(); if (seenMaps.has(u)) continue; seenMaps.add(u); const r = await get(u); sitemapRows.push({ url: u, status: r.status, named: robots.sitemaps.includes(u) }); if (r.status !== 200) continue; const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1])); if (/<sitemapindex/i.test(r.body)) queue.push(...locs); else for (const l of locs) { const k = pageKey(l); if (k) inSitemap.add(k); } }
  /* the pages: the home, every app page, every sitemap address, and every same-domain link found, crawled */
  const want = [home, ...pages.map((u) => pageKey(u)).filter(Boolean), ...inSitemap].filter((k) => k.startsWith(host)), found = new Map(), linksFrom = new Map(), todo = [...new Set(want)], queued = new Set(todo);
  const visit = async (k) => {
    const r = await get(k), html = /html/i.test(r.ct) || /<html/i.test(r.body) ? r.body : null, p = { url: k, status: r.status, html: null, why: r.why ?? null };
    if (html && r.status === 200) { p.html = true; p.noindex = /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html); p.canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]*)"/gi)].map((m) => decode(m[1])); p.title = text(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""); p.forbidden = forbiddenIn(html); p.faq = faqDiff(html); p.dates = datesOf(html);
      const out = new Set(); for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)) { const t = pageKey(m[1], k); if (!t || !t.startsWith(host) || isAsset(t)) continue; out.add(t); if (!queued.has(t) && queued.size < maxPages) { queued.add(t); todo.push(t); } } linksFrom.set(k, out); }
    found.set(k, p);
  };
  while (todo.length) await Promise.all(todo.splice(0, concurrency).map(visit));
  const all = [...found.values()], htmlPages = all.filter((p) => p.html), indexable = htmlPages.filter((p) => !p.noindex), rows = [], listed = [];
  const row = (key, fails, extra = {}) => { const c = SCAN_CHECKS.find((x) => x.key === key); rows.push({ key, check: c.check, mustBe: c.mustBe, ok: fails.length === 0, count: fails.length, sample: fails.slice(0, 25), all: fails.slice(0, 3000) /* RR-387 D: the Issues list counts every page, not the sample */, ...extra }); };
  row("status", all.filter((p) => p.status !== 200).map((p) => `${p.url}: ${p.status || p.why || "no answer"}`));
  { const bad = []; for (const [from, to] of linksFrom) for (const t of to) { const p = found.get(t); if (p && p.status !== 200) bad.push(`${from} → ${t.slice(host.length) || "/"} (${p.status || "no answer"})`); } row("links", bad, { linksChecked: [...linksFrom.values()].reduce((n, s) => n + s.size, 0) }); }
  row("noindexInSitemap", htmlPages.filter((p) => p.noindex && inSitemap.has(p.url)).map((p) => p.url));
  for (const p of indexable) if (!inSitemap.has(p.url)) listed.push({ url: p.url, why: pages.some((u) => pageKey(u) === p.url) ? "an app page that is indexable but no sitemap lists it" : p.url === home ? "the home page (most sites list it; Google finds it anyway)" : "a page of the site's own code that its sitemap does not list" });
  rows.push({ key: "notInSitemap", check: "Indexable pages in no sitemap", mustBe: "Listed, with the reason", ok: true, count: listed.length, sample: listed.slice(0, 25).map((x) => `${x.url}: ${x.why}`) });
  row("forbidden", htmlPages.filter((p) => p.forbidden.length).map((p) => `${p.url}: /${p.forbidden.join("/, /")}/`));
  row("faq", htmlPages.filter((p) => p.faq.length).map((p) => `${p.url}: ${p.faq[0]}`));
  row("canonical", htmlPages.map((p) => (!p.canonical.length ? `${p.url}: no canonical` : p.canonical.length > 1 ? `${p.url}: ${p.canonical.length} canonicals` : (() => { try { return new URL(p.canonical[0], p.url).origin === host ? null : `${p.url}: points to ${p.canonical[0]}`; } catch { return `${p.url}: unreadable canonical`; } })())).filter(Boolean));
  { const by = new Map(); for (const p of indexable) { const t = norm(p.title); if (!t) continue; by.set(t, [...(by.get(t) ?? []), p.url]); } const bad = []; for (const p of indexable) { if (!norm(p.title)) bad.push(`${p.url}: no title`); else { const same = by.get(norm(p.title)); if (same.length > 1) bad.push(`${p.url}: same title as ${same.length - 1} other page(s) ("${p.title.slice(0, 60)}")`); } } row("titles", bad); }
  row("robots", rb.status !== 200 && rb.status !== 404 ? [`robots.txt answered ${rb.status || "nothing"}`] : indexable.filter((p) => !robotsAllows(robots.rules, new URL(p.url).pathname || "/")).map((p) => `${p.url}: disallowed by robots.txt`));
  row("sitemap", !robots.sitemaps.length ? ["robots.txt names no sitemap"] : sitemapRows.filter((s) => s.named && s.status !== 200).map((s) => `${s.url}: ${s.status || "no answer"}`), { sitemaps: sitemapRows.filter((s) => s.named).map((s) => s.url) });
  row("lastChecked", htmlPages.filter((p) => p.dates.last && p.dates.oldest && p.dates.last !== p.dates.oldest).map((p) => `${p.url}: says ${p.dates.last}, its oldest fact ${p.dates.oldest}`));
  /* serious (a rollback on the live site): an app page that does not answer, or the home page marked noindex */
  const appKeys = new Set(pages.map((u) => pageKey(u)).filter(Boolean)), serious = [...all.filter((p) => appKeys.has(p.url) && p.status === 404).map((p) => `${p.url} answers 404`), ...(found.get(home)?.noindex ? ["the home page is marked noindex"] : []), ...(found.get(home) && found.get(home).status !== 200 ? [`the home page answers ${found.get(home).status || "nothing"}`] : [])];
  return { ok: rows.every((r) => r.ok), on: new Date(now()).toISOString(), origin: host, crawled: all.length, html: htmlPages.length, indexable: indexable.length, inSitemap: inSitemap.size, rows, serious, listed };
}
/** the scan as one plain table (the report, the screen) */
export const scanTable = (s) => (s?.rows ?? []).map((r) => `| ${r.check} | ${r.mustBe} | ${r.ok ? "PASS" : "FAIL"} | ${r.count} |${r.sample.length ? ` ${r.sample.slice(0, 3).join("; ").replace(/\|/g, "/")}` : ""} |`).join("\n");
