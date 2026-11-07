/**
 * 🔴 RR-388 PART A2 · THE PUBLISH ROUTE FOR ALMIVISIBILITY'S OWN PAGES, WITH THE PC OFF. The site (almivisibility.almiworld.com) is deployed
 * from a local folder; its pages cannot be. So the app (or autopilot on GitHub Actions) publishes them, like every client's, to a GitHub
 * repository (the owner's private almivisibility-pages, folder visibility-pages/<slug>/index.html) that Vercel builds by itself (its Git
 * link). This site then serves each page at its own address (/<slug>) from that project, and lists them in its sitemap.
 *   · OFF until the owner sets ALMIVISIBILITY_PAGES_ORIGIN (the pages project's https address). Nothing changes while it is unset.
 *   · Only a one-segment address of plain letters, digits and dashes is asked for; only a 200 HTML answer is served; everything else stays 404.
 *   · The page list (visibility-pages/index.json, written by the pages repo's own build) is read at most once an hour.
 */
export const PAGES_ENV = "ALMIVISIBILITY_PAGES_ORIGIN", PAGES_DIR = "visibility-pages";
const SLUG = /^\/([a-z0-9][a-z0-9-]{1,90})\/?$/;
export const pagesOrigin = (env = process.env) => { const o = String(env[PAGES_ENV] ?? "").replace(/\/+$/, ""); return /^https:\/\/[a-z0-9.-]+$/i.test(o) ? o : null; };
export const slugOf = (pathname) => SLUG.exec(String(pathname ?? ""))?.[1] ?? null;

/** one page from the pages project → { status, html } or null (not ours: the caller answers 404 as before) */
export async function ownPage(pathname, { env = process.env, fetchImpl = fetch } = {}) {
  const o = pagesOrigin(env), s = slugOf(pathname); if (!o || !s) return null;
  try { const r = await fetchImpl(`${o}/${PAGES_DIR}/${s}/`, { redirect: "manual", signal: AbortSignal.timeout(8000) }); if (r.status !== 200 || !/text\/html/i.test(r.headers.get("content-type") ?? "")) return null; return { status: 200, html: await r.text() }; } catch { return null; }
}
let LISTED = { at: 0, slugs: [] };
/** the pages' own addresses for the sitemap (cached an hour; nothing when off or unreadable) */
export async function ownPageSlugs({ env = process.env, fetchImpl = fetch, now = Date.now() } = {}) {
  const o = pagesOrigin(env); if (!o) return [];
  if (now - LISTED.at < 3600000) return LISTED.slugs;
  try { const r = await fetchImpl(`${o}/${PAGES_DIR}/index.json`, { signal: AbortSignal.timeout(8000) }); const j = r.ok ? await r.json() : null; const slugs = Array.isArray(j?.pages) ? j.pages.map((x) => String(x.slug ?? x)).filter((x) => /^[a-z0-9][a-z0-9-]{1,90}$/.test(x)) : []; LISTED = { at: now, slugs }; return slugs; } catch { return LISTED.slugs; }
}
export const resetOwnPagesCache = () => { LISTED = { at: 0, slugs: [] }; };
