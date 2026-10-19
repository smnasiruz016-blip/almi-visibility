/**
 * 🔴 RTP-1 D5 · THE OWNER PREVIEW — a complete local set of pages put before the owner for approval BEFORE any publish (owner decisions of
 * RR-293). Built from the approved plan's pages (src/page/plan-batch.mjs), each made publish-ready: no noindex, one self-canonical, a concise
 * title, a unique meta description from its own first verified fact, the direct answer first, every fact with its visible source and the day
 * it was read, links in (from the index) and out (to the index and its siblings), a robots file that admits every crawler and AI search bot,
 * and a sitemap of exactly the planned pages. Plain words; readable on a phone. NOTHING IS PUBLISHED: it is a folder of local files.
 * The pages are TEST DATA (owner decision 3 of RR-293: the tool is attached to no product) — the address is a placeholder, never a live site.
 * Pure: it returns files; the caller writes them. Generic: it names no client, product or host.
 */
import { plannedPages } from "./plan-batch.mjs";
import { sitemapXml } from "./publishing-control.mjs";
import { AI_SEARCH_BOTS } from "./page-gates.mjs";

export const PREVIEW_ORIGIN = "https://preview.invalid";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => String(s).replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const titleOf = (row) => `${cap(row.primary.replace(/-/g, " "))} in ${cap(row.secondary.replace(/-/g, " "))}: the official rules`;
const STYLE = "body{font-family:system-ui,sans-serif;margin:0 auto;padding:16px;max-width:42rem;line-height:1.55;color:#111;background:#fff}a{color:#1f4f8f}small{color:#444}nav{margin-top:2rem;font-size:.95rem}";

/** The preview files: Map(relative path → text). `plan` is approvedPlan()'s result. */
export function buildPreview(plan, { origin = PREVIEW_ORIGIN, on, only = null } = {}) {
  /* `only`: the planned paths that passed every gate — the preview holds those alone, and its links and sitemap name no other */
  const pages = plannedPages(plan).filter((p) => !only || only.has(p.path));
  const claimsOf = (row) => (row.answer ?? []).map((c) => (typeof c === "string" ? plan.claimsById?.get(c) : c)).filter((c) => c && c.text);
  const files = new Map();
  const urls = pages.map((p) => `${origin}${p.path}/`);
  for (const p of pages) {
    const url = `${origin}${p.path}/`;
    const claims = claimsOf(p.row);
    const first = claims[0]?.text ?? "";
    const desc = `${cap(p.row.primary.replace(/-/g, " "))} in ${cap(p.row.secondary.replace(/-/g, " "))}: ${first}`.slice(0, 155).replace(/\s+\S*$/, "") + (first.length > 120 ? "…" : "");
    const siblings = pages.filter((x) => x !== p && x.row.primary === p.row.primary);
    const merged = (plan.rows ?? []).filter((r) => r.label === "MERGED" && r.target === p.combination);
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titleOf(p.row))}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<style>${STYLE}</style></head><body>
<h1>${esc(titleOf(p.row))}</h1>
${claims.map((c) => `<p>${esc(c.text)} <small>Source: ${c.source?.link ? `<a href="${esc(c.source.link)}">${esc(c.source.name ?? c.body ?? c.source.link)}</a>` : esc(c.body ?? "not recorded")}${c.source?.readOn ? `, checked ${esc(c.source.readOn)}` : ""}</small></p>`).join("\n")}
${merged.length ? `<p>The same rule applies to ${esc(merged.map((m) => `${m.primary.replace(/-/g, " ")} in ${cap(m.secondary.replace(/-/g, " "))}`).join(", "))}.</p>` : ""}
<nav><p><a href="${esc(origin)}/">All pages</a>${siblings.map((s) => ` · <a href="${esc(origin)}${esc(s.path)}/">${esc(titleOf(s.row))}</a>`).join("")}</p></nav>
</body></html>
`;
    files.set(`${p.path.slice(1)}/index.html`, html);
  }
  const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Owner preview: ${pages.length} pages for your approval</title>
<meta name="description" content="A local preview of ${pages.length} planned pages, for the owner's approval before any publish. Nothing is published.">
<link rel="canonical" href="${esc(origin)}/">
<style>${STYLE}</style></head><body>
<h1>Owner preview: ${pages.length} pages for your approval</h1>
<p>These are local preview pages, made from stored test data${on ? ` on ${esc(on)}` : ""}. Nothing is published. Each page passed the five page gates before it was put here. Approve them, or say what to change.</p>
<ul>
${pages.map((p) => `<li><a href="${esc(origin)}${esc(p.path)}/">${esc(titleOf(p.row))}</a></li>`).join("\n")}
</ul>
</body></html>
`;
  files.set("index.html", index);
  files.set("robots.txt", `User-agent: *\nAllow: /\n\n${AI_SEARCH_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  files.set("sitemap.xml", sitemapXml([`${origin}/`, ...urls]));
  return Object.freeze({ files, urls: [`${origin}/`, ...urls], pages: pages.map((p) => Object.freeze({ path: `${p.path}/`, url: `${origin}${p.path}/`, combination: p.combination, answer: (p.row.answer ?? []).map((c) => (typeof c === "string" ? c : c.claimId)), claims: claimsOf(p.row) })) });
}

/** The facts of a preview page, for gate C: each claim with a visible source link and a day read. */
export const factsOf = (claims) => claims.map((c) => ({ hasSource: Boolean(c.source?.link), hasDate: /^\d{4}-\d{2}-\d{2}$/.test(c.source?.readOn ?? "") }));
