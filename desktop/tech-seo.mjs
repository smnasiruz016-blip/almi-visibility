/**
 * 🔴 RR-379 item 3 (owner, 6 Nov 2026) · TECHNICAL SEO — what the "SEO check", "Links check" and "Languages" cards did not hold yet:
 *   · SPEED: Google's PageSpeed Insights API (free; the client's own key optional): Core Web Vitals from real Chrome users where Google has
 *     them (LCP, INP, CLS, each with Google's own good / needs improvement / poor), and the lab test's score and biggest fixes.
 *   · STRUCTURED DATA: every JSON-LD block read and checked against the fields Google documents for its rich results (FAQ, Organization,
 *     Product, LocalBusiness, SoftwareApplication, Article, BreadcrumbList); broken JSON said; the ready fix built only from the page's own data.
 *   · REDIRECTS: each page's chain followed hop by hop (never more than 5): chains, temporary redirects, http→https, loops, dead ends.
 *   · Canonical, robots, sitemap and hreflang stay in the existing checks; "is it indexed" is Search Console's URL Inspection (the client's
 *     own Google connection) and is added here for the pages checked.
 * Every problem comes with its fix and, where the page gives the facts, ready text. Pure: fetch is handed in.
 */
export const PSI = Object.freeze({ url: "https://www.googleapis.com/pagespeedonline/v5/runPagespeed", source: { name: "Google PageSpeed Insights API", url: "https://developers.google.com/speed/docs/insights/v5/get-started", checked: "2026-11-06" } });
/** Google's own thresholds (web.dev/articles/vitals, read 2026-11-06): good ≤ the first, poor > the second */
export const VITALS = Object.freeze({ LARGEST_CONTENTFUL_PAINT_MS: { name: "Largest Contentful Paint", good: 2500, poor: 4000, unit: "ms" }, INTERACTION_TO_NEXT_PAINT: { name: "Interaction to Next Paint", good: 200, poor: 500, unit: "ms" }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { name: "Cumulative Layout Shift", good: 0.1, poor: 0.25, unit: "", scale: 100 } });
export const VITALS_SOURCE = { name: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals", checked: "2026-11-06" };
export const psiUrl = (page, { strategy = "mobile", key = null } = {}) => `${PSI.url}?url=${encodeURIComponent(page)}&strategy=${strategy}&category=performance&category=seo${key ? `&key=${encodeURIComponent(key)}` : ""}`;
const FIX_OF = Object.freeze({
  "render-blocking-resources": "Load the CSS and scripts the first screen does not need later (defer / async), and inline the small CSS the first screen needs.",
  "unused-javascript": "Remove scripts the page does not use, or load them only on the pages that need them.",
  "unused-css-rules": "Remove CSS rules the page does not use.",
  "uses-optimized-images": "Compress the images (most site builders have an image-optimisation setting).",
  "modern-image-formats": "Serve images as WebP or AVIF.",
  "uses-responsive-images": "Serve each image at the size it is shown (srcset).",
  "offscreen-images": "Lazy-load images below the first screen (loading=\"lazy\").",
  "server-response-time": "The server answers slowly: turn on page caching or a CDN, or ask the host.",
  "uses-text-compression": "Turn on gzip or Brotli compression on the server.",
  "uses-long-cache-ttl": "Give static files (images, CSS, scripts) a long cache time.",
  "total-byte-weight": "The page is heavy: remove large files it does not need.",
  "largest-contentful-paint-element": "Make the biggest element of the first screen load first (preload its image, no lazy-load on it).",
  "layout-shift-elements": "Give images, ads and embeds a fixed width and height so the page does not jump.",
  "third-party-summary": "Third-party scripts (chat, ads, trackers) slow the page: remove the ones you do not need, load the rest later.",
  "font-display": "Use font-display: swap so text shows while fonts load.",
});
/** PageSpeed Insights' documented answer → { score, vitals:[{name, value, category, ok}], lab, fixes } */
export function psiResult(j, page) {
  if (!j?.lighthouseResult) return { ok: false, page, why: j?.error?.message ? `PageSpeed Insights: ${String(j.error.message).slice(0, 160)}` : "PageSpeed Insights gave no result." };
  const lh = j.lighthouseResult, a = lh.audits ?? {}, m = j.loadingExperience?.metrics ?? null, origin = j.loadingExperience?.origin_fallback === true;
  const vitals = m ? Object.entries(VITALS).filter(([k]) => m[k]).map(([k, v]) => { const p = Number(m[k].percentile), value = v.scale ? p / v.scale : p; return { name: v.name, value, unit: v.unit, category: m[k].category ?? null, ok: m[k].category === "FAST" }; }) : [];
  const fixes = Object.values(a).filter((x) => x && FIX_OF[x.id] && typeof x.score === "number" && ((x.score < 0.9 && (x.details?.overallSavingsMs ?? 0) >= 100) || x.score < 0.5)).map((x) => ({ id: x.id, title: x.title, saves: x.details?.overallSavingsMs ? Math.round(x.details.overallSavingsMs) : null, fix: FIX_OF[x.id] })).sort((p, q) => (q.saves ?? 0) - (p.saves ?? 0)).slice(0, 5);
  return { ok: true, page, score: Math.round((lh.categories?.performance?.score ?? 0) * 100), seo: lh.categories?.seo ? Math.round(lh.categories.seo.score * 100) : null, vitals, field: m ? (origin ? "whole site (Google has too little data for this page alone)" : "this page") : null, lab: { lcp: a["largest-contentful-paint"]?.displayValue ?? null, tbt: a["total-blocking-time"]?.displayValue ?? null, cls: a["cumulative-layout-shift"]?.displayValue ?? null }, fixes };
}
export function speedLines(r) {
  if (!r.ok) return [{ ok: null, area: "Speed", line: `${r.page}: ${r.why}` }];
  const out = [], poor = r.vitals.filter((v) => !v.ok);
  if (!r.vitals.length) out.push({ ok: null, area: "Speed", line: `${r.page}: Google has no real-user speed data for this page yet; the lab test scored it ${r.score} of 100.` });
  else if (!poor.length) out.push({ ok: true, area: "Speed", line: `${r.page}: all Core Web Vitals are good for real users (${r.field}).` });
  else out.push({ ok: false, area: "Speed", line: `${r.page}: ${poor.map((v) => `${v.name} ${v.unit === "ms" ? `${v.value} ms` : v.value} (${String(v.category).toLowerCase().replace("_", " ")})`).join("; ")} for real users (${r.field}).`, problem: `${r.page}: ${poor.map((v) => v.name).join(", ")} not good for real users.`, solution: `${r.fixes.map((f) => f.fix).join(" ") || "See the lab test's biggest fixes."} Google's limits: ${VITALS_SOURCE.name}, checked ${VITALS_SOURCE.checked}.`, ready: [] });
  if (r.score < 50) out.push({ ok: false, area: "Speed", line: `${r.page}: the lab test scored ${r.score} of 100 on a phone.`, problem: `${r.page} is slow on a phone (lab score ${r.score}).`, solution: r.fixes.map((f) => `${f.title}${f.saves ? ` (saves about ${f.saves} ms)` : ""}: ${f.fix}`).join(" ") || "Make the page lighter.", ready: [] });
  else out.push({ ok: r.score >= 90 ? true : null, area: "Speed", line: `${r.page}: lab score ${r.score} of 100 on a phone.` });
  return out;
}

/* ── structured data ── */
/** Google's required fields (developers.google.com/search/docs/appearance/structured-data/*, read 2026-11-06) */
export const SCHEMA_RULES = Object.freeze({
  FAQPage: { needs: ["mainEntity"], each: { at: "mainEntity", needs: ["name", "acceptedAnswer.text"] }, doc: "faqpage" },
  Organization: { needs: ["name", "url"], wants: ["logo"], doc: "organization" },
  Product: { needs: ["name"], oneOf: ["offers", "review", "aggregateRating"], doc: "product" },
  LocalBusiness: { needs: ["name", "address"], wants: ["telephone", "openingHoursSpecification", "url"], doc: "local-business" },
  SoftwareApplication: { needs: ["name"], oneOf: ["aggregateRating", "review"], wants: ["offers.price", "applicationCategory", "operatingSystem"], doc: "software-app" },
  MobileApplication: { same: "SoftwareApplication" },
  WebApplication: { same: "SoftwareApplication" },
  Article: { wants: ["headline", "image", "datePublished", "author"], doc: "article" },
  NewsArticle: { same: "Article" }, BlogPosting: { same: "Article" },
  BreadcrumbList: { needs: ["itemListElement"], each: { at: "itemListElement", needs: ["position", "name"] }, doc: "breadcrumb" },
});
const LOCAL_TYPES = /^(?:Restaurant|Dentist|Physician|MedicalClinic|Hospital|Store|Mosque|PlaceOfWorship|ProfessionalService|LegalService|HomeAndConstructionBusiness|.+Store|.+Business)$/;
const get = (o, path) => path.split(".").reduce((x, k) => (Array.isArray(x) ? x[0]?.[k] : x?.[k]), o);
const has = (o, path) => { const v = get(o, path); return v !== undefined && v !== null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length); };
/** the page's JSON-LD blocks → [{ ok, type, problems, wants, node }] (broken JSON is a problem of its own) */
export function schemaCheck(html) {
  const out = [], re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(String(html ?? "")))) {
    let j; try { j = JSON.parse(m[1].trim()); } catch (e) { out.push({ ok: false, type: "(unreadable)", problems: [`the JSON-LD block cannot be read (${String(e.message).slice(0, 80)})`], wants: [] }); continue; }
    const nodes = (Array.isArray(j) ? j : j?.["@graph"] ? j["@graph"] : [j]).filter((n) => n && typeof n === "object");
    for (const n of nodes) {
      const types = [].concat(n["@type"] ?? []).map(String); if (!types.length) { out.push({ ok: false, type: "(no @type)", problems: ["a block has no @type"], wants: [] }); continue; }
      const t = types.find((x) => SCHEMA_RULES[x]) ?? (types.some((x) => LOCAL_TYPES.test(x)) ? "LocalBusiness" : null); if (!t) { out.push({ ok: true, type: types.join(", "), problems: [], wants: [], unknown: true }); continue; }
      const rule = SCHEMA_RULES[t].same ? SCHEMA_RULES[SCHEMA_RULES[t].same] : SCHEMA_RULES[t], problems = [], wants = [];
      for (const f of rule.needs ?? []) if (!has(n, f)) problems.push(`${t} needs "${f}"`);
      if (rule.oneOf && !rule.oneOf.some((f) => has(n, f))) problems.push(`${t} needs one of ${rule.oneOf.map((f) => `"${f}"`).join(", ")}`);
      if (rule.each) { const list = [].concat(n[rule.each.at] ?? []); list.forEach((x, i) => { for (const f of rule.each.needs) if (!has(x, f)) problems.push(`${t} item ${i + 1} needs "${f}"`); }); }
      for (const f of rule.wants ?? []) if (!has(n, f)) wants.push(f);
      out.push({ ok: !problems.length, type: types.join(", "), problems, wants, doc: `https://developers.google.com/search/docs/appearance/structured-data/${(SCHEMA_RULES[t].same ? SCHEMA_RULES[SCHEMA_RULES[t].same] : SCHEMA_RULES[t]).doc}`, node: n });
    }
  }
  return out;
}
export function schemaLines(page, blocks, { kind = null } = {}) {
  const out = [];
  if (!blocks.length) out.push({ ok: false, area: "Structured data", line: `${page}: no structured data (JSON-LD).`, problem: `${page} has no structured data.`, solution: kind === "local" ? "Add LocalBusiness markup with your name, address, phone and hours (Local SEO makes it from your profile)." : "Add Organization markup on the home page, and the markup that fits each page (Product, FAQ, Article, SoftwareApplication).", ready: [] });
  for (const b of blocks) {
    if (b.unknown) continue;
    if (!b.ok) out.push({ ok: false, area: "Structured data", line: `${page}: ${b.type} — ${b.problems.join("; ")}.`, problem: `${page}: the ${b.type} markup is incomplete, so Google cannot use it.`, solution: `Add ${b.problems.map((p) => p.replace(/^.*? needs /, "")).join(", ")}. Google's rules: ${b.doc ?? "developers.google.com/search/docs/appearance/structured-data"}.`, ready: [] });
    else out.push({ ok: b.wants.length ? null : true, area: "Structured data", line: `${page}: ${b.type} markup has every field Google needs${b.wants.length ? `; Google also recommends ${b.wants.join(", ")}` : ""}.` });
  }
  return out;
}

/* ── redirects ── */
/** follow one address hop by hop (redirect: manual) → { hops:[{url,status,to}], final, status, loop } */
export async function redirectChain(url, { fetchImpl = fetch, max = 5, ua = "AlmiVisibility" } = {}) {
  const hops = [], seen = new Set(); let u = url;
  for (let i = 0; i <= max; i++) {
    if (seen.has(u)) return { hops, final: u, status: null, loop: true }; seen.add(u);
    let r; try { r = await fetchImpl(u, { method: "GET", redirect: "manual", headers: { "user-agent": ua }, signal: AbortSignal.timeout(20000) }); } catch { return { hops, final: u, status: null, failed: true }; }
    const to = r.headers?.get?.("location");
    if (r.status >= 300 && r.status < 400 && to) { const next = new URL(to, u).toString(); hops.push({ url: u, status: r.status, to: next }); u = next; continue; }
    return { hops, final: u, status: r.status };
  }
  return { hops, final: u, status: null, tooLong: true };
}
export function redirectLines(start, c) {
  const out = [];
  if (c.loop) return [{ ok: false, area: "Redirects", line: `${start} redirects in a loop.`, problem: `${start} never arrives: its redirects go round in a loop.`, solution: "Fix the redirect rules on the server or in your site builder so this address points to one final page.", ready: [] }];
  if (c.failed) return [{ ok: null, area: "Redirects", line: `${start} could not be opened.` }];
  if (c.tooLong) out.push({ ok: false, area: "Redirects", line: `${start} goes through more than 5 redirects.`, problem: `${start} has too many redirects.`, solution: "Point the first address straight at the final page.", ready: [] });
  else if (c.hops.length > 1) out.push({ ok: false, area: "Redirects", line: `${start} goes through ${c.hops.length} redirects before it arrives at ${c.final}.`, problem: `${start} has a redirect chain (${c.hops.length} hops).`, solution: `Redirect ${start} straight to ${c.final} (one 301), and change your links to the final address.`, ready: [{ label: "Final address to link to", text: c.final, source: "followed by Visibility" }] });
  const temp = c.hops.filter((h) => h.status === 302 || h.status === 307);
  if (temp.length) out.push({ ok: false, area: "Redirects", line: `${start} uses a temporary redirect (${temp.map((h) => h.status).join(", ")}).`, problem: `${start} uses a temporary redirect where a permanent one is usual.`, solution: "If the move is for good, make it a 301 (permanent) redirect so Google moves the page's value to the new address.", ready: [] });
  if (c.status >= 400) out.push({ ok: false, area: "Redirects", line: `${start} ends at ${c.final}, which answers ${c.status}.`, problem: `${start} ends on a dead page (${c.status}).`, solution: "Point it at a page that exists, or remove the links to it.", ready: [] });
  if (/^http:\/\//.test(start) && !c.hops.length && c.status < 400) out.push({ ok: false, area: "Redirects", line: `${start} opens without https.`, problem: "The site opens on http:// without moving to https://.", solution: "Turn on HTTPS and redirect every http:// address to https:// (301).", ready: [] });
  if (!out.length) out.push({ ok: true, area: "Redirects", line: `${start}: ${c.hops.length ? `one ${c.hops[0].status} redirect to ${c.final}` : "no redirect"}, answers ${c.status}.` });
  return out;
}

/* ── is it indexed (Search Console's URL Inspection; read-only) ── */
export function indexLine(page, j) {
  const s = j?.inspectionResult?.indexStatusResult; if (!s) return { ok: null, area: "Indexed", line: `${page}: Google's URL Inspection gave no answer (connect Search Console, or Google's daily limit).` };
  const ok = s.verdict === "PASS", canon = s.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical;
  if (ok && !canon) return { ok: true, area: "Indexed", line: `${page}: in Google (${s.coverageState ?? "indexed"}${s.lastCrawlTime ? `, last crawled ${String(s.lastCrawlTime).slice(0, 10)}` : ""}).` };
  return { ok: false, area: "Indexed", line: `${page}: ${s.coverageState ?? "not in Google"}${canon ? `; Google chose ${s.googleCanonical} as the main address, not ${s.userCanonical}` : ""}.`, problem: `${page} is ${ok ? "in Google under another address" : "not in Google"} (${s.coverageState ?? s.verdict}).`, solution: canon ? "Make the page's canonical link and your internal links point to one address, the one you want in Google." : s.robotsTxtState === "DISALLOWED" ? "Your robots.txt blocks this page: allow it." : s.indexingState && s.indexingState !== "INDEXING_ALLOWED" ? "The page says noindex: remove it if the page should be in Google." : "Link to the page from your other pages, keep it in your sitemap, and ask Google to index it in Search Console (URL Inspection → Request indexing).", ready: [] };
}
/** one score from the lines: the share of checked lines that pass (unknowns not counted) */
export const linesScore = (lines) => { const k = lines.filter((l) => l.ok === true || l.ok === false); return k.length ? Math.round((k.filter((l) => l.ok).length / k.length) * 100) : null; };
