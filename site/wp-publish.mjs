/**
 * RR-344 (owner, 29 Oct 2026) · ALMIWORLD'S OWN ARTICLES → the almiworld.com blog (WordPress). After the owner's Approve on /owner/articles,
 * the article is published there through WordPress's own REST interface, signed in with an APPLICATION PASSWORD the owner makes in
 * WordPress himself and puts in Vercel (never printed, never in a page, never in a log):
 *   ALMIWORLD_WP_USER          his WordPress user name
 *   ALMIWORLD_WP_APP_PASSWORD  the application password (WordPress → Users → Profile → Application Passwords)
 *   ALMIWORLD_WP_URL           optional — the WordPress site (default https://almiworld.com)
 *   ALMIWORLD_WP_CATEGORY      optional — the category's name (an existing one; none is made)
 * The key goes ONLY to that site's own /wp-json/ (https). One article is published once: its post id and link are kept on the article.
 * A tag per product (found, or made); the article's own "About" links lead back to the product. No featured image in this version:
 * WordPress refuses SVG uploads by default, and our page images are SVG.
 */
import { articleQuality } from "./articles.mjs";

export const WP_KEYS = Object.freeze({ user: "ALMIWORLD_WP_USER", password: "ALMIWORLD_WP_APP_PASSWORD", url: "ALMIWORLD_WP_URL", category: "ALMIWORLD_WP_CATEGORY" });
export const WP_DEFAULT_URL = "https://almiworld.com";
export const wpConfigured = (env) => Boolean(String(env?.[WP_KEYS.user] ?? "").trim() && String(env?.[WP_KEYS.password] ?? "").trim());
/** the site's own origin (https only) or null */
export function wpOrigin(env) { try { const u = new URL(String(env?.[WP_KEYS.url] ?? "").trim() || WP_DEFAULT_URL); return u.protocol === "https:" ? u.origin : null; } catch { return null; } }
/** what the WordPress post holds: the article without its own <h1> (WordPress prints the title) */
export const wpContent = (html) => String(html ?? "").replace(/^<article>\s*<h1>[\s\S]*?<\/h1>/, "<article>");

/** → { ok, id, link } or { ok: false, why } — never the key, a part of it or its length in a why */
export async function publishToWordPress({ env, fetchImpl = fetch, article, html, tagName = null, timeoutMs = 20000 }) {
  if (!wpConfigured(env)) return { ok: false, why: `the blog is not connected yet (${WP_KEYS.user} and ${WP_KEYS.password} in Vercel)` };
  const origin = wpOrigin(env); if (!origin) return { ok: false, why: `${WP_KEYS.url} must be an https address` };
  const auth = `Basic ${Buffer.from(`${String(env[WP_KEYS.user]).trim()}:${String(env[WP_KEYS.password]).replace(/\s+/g, "")}`).toString("base64")}`;
  const call = async (path, init = {}) => {
    try {
      const r = await fetchImpl(`${origin}/wp-json/wp/v2/${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs), headers: { authorization: auth, "content-type": "application/json", accept: "application/json", ...(init.headers ?? {}) } });
      const body = await r.json().catch(() => null); return { ok: r.ok, status: r.status, body };
    } catch { return { ok: false, status: 0, body: null }; }
  };
  const said = (r) => (r.status === 401 || r.status === 403 ? "WordPress refused the sign-in — check the user name and the application password in Vercel" : r.status === 0 ? "WordPress could not be reached" : `WordPress answered ${r.status}${r.body?.code ? ` (${String(r.body.code).slice(0, 60)})` : ""}`);
  /* the category: an existing one by its name (none is made); the tag: found by its name, or made */
  let categories = [];
  const catName = String(env[WP_KEYS.category] ?? "").trim();
  if (catName) { const c = await call(`categories?search=${encodeURIComponent(catName)}&per_page=20`); const hit = c.ok && Array.isArray(c.body) ? c.body.find((x) => String(x.name ?? "").toLowerCase() === catName.toLowerCase()) : null; if (hit) categories = [hit.id]; }
  let tags = [];
  if (tagName) {
    const t = await call(`tags?search=${encodeURIComponent(tagName)}&per_page=20`), hit = t.ok && Array.isArray(t.body) ? t.body.find((x) => String(x.name ?? "").toLowerCase() === tagName.toLowerCase()) : null;
    if (hit) tags = [hit.id]; else { const made = await call("tags", { method: "POST", body: JSON.stringify({ name: tagName }) }); if (made.ok && made.body?.id) tags = [made.body.id]; }
  }
  const r = await call("posts", { method: "POST", body: JSON.stringify({ title: article.title, content: wpContent(html), status: "publish", ...(categories.length ? { categories } : {}), ...(tags.length ? { tags } : {}) }) });
  if (!r.ok || !r.body?.id) return { ok: false, why: said(r) };
  return { ok: true, id: r.body.id, link: String(r.body.link ?? `${origin}/?p=${r.body.id}`) };
}

/** RR-344 A2 · the ready-to-copy posts for a published article: 2–3 lines + the blog link (the owner posts them himself) */
export function socialPosts({ article, link }) {
  const first = (article.body?.blocks ?? []).map((b) => String(b.text ?? "").trim()).find(Boolean) ?? "";
  const sentence = (/^[\s\S]*?[.!?](\s|$)/.exec(first)?.[0] ?? first).trim().slice(0, 240);
  return [
    { network: "LinkedIn", text: `${article.title}\n\n${sentence}\n\nRead it on the AlmiWorld blog: ${link}` },
    { network: "Facebook", text: `${article.title} — ${sentence}\n${link}` },
  ];
}

/** RR-344 A3 · the owner's daily line on /owner: published today (its link) · ready (approve) · none today, and why */
export function todayArticle({ articles = [], today, aiOn = false, blogOn = false }) {
  const pub = articles.find((a) => a.body?.published?.on === today);
  if (pub) return { state: "published", line: `published: ${pub.body.published.link}`, link: pub.body.published.link };
  const drafts = articles.filter((a) => a.status === "draft"), ready = drafts.filter((a) => articleQuality(a.body, a.body?.judged).state === "PASS");
  const approved = articles.filter((a) => a.status === "approved" && !a.body?.published?.link);
  if (ready.length) return { state: "ready", line: `ready — approve (${ready.length} pass the quality check)${blogOn ? "" : "; the blog is not connected yet, so Approve keeps it here"}` };
  if (approved.length && blogOn) return { state: "ready", line: `${approved.length} approved, not on the blog yet — press "Publish on the blog"` };
  const why = !aiOn ? "the AI is not connected (ANTHROPIC_API_KEY), so no article is written" : !articles.length ? "the collector has not written a draft yet — it does in its daily step" : drafts.length ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} wait for the AI judge or did not pass the quality check` : "every draft is decided — a new one comes with the next new question";
  return { state: "none", line: `none today — ${why}` };
}
