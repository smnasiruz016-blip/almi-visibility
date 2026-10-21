/**
 * 🔴 RR-308 D · PUBLISH (owner, 21 Oct 2026: "the Publish button is missing"). A finished draft is published to the CLIENT'S OWN site, through
 * a connection the CLIENT makes (their own sign-in key, kept in Windows' secure store — desktop/secrets.mjs), only after the five gates pass
 * again right before publishing. Every publish is recorded so it can be undone (Unpublish).
 *   · "Where is your site built?" — WordPress · GitHub + Vercel (like AlmiWorld) · Shopify · "Download the files, I'll add them myself".
 *   · WordPress: a page through the site's own WordPress REST interface (an application password the client makes in WordPress); undo = the
 *     page back to draft. GitHub + Vercel: the page's file committed to the client's repository (Vercel builds it); undo = the file removed by a
 *     second commit. Shopify: an online-store page through the shop's admin interface (an access token from the client's own custom app); undo =
 *     the page hidden. Download: the page's files saved in a folder on this computer; undo = the files moved aside.
 *   · A key goes ONLY to the place it belongs: the client's own WordPress site, api.github.com, the client's own *.myshopify.com shop — never
 *     anywhere else (a stand-in on this computer only when the app runs with testAllowLocalSites, for tests).
 * Nothing here decides WHEN to publish: the app calls it after the client's "Approve & Publish", or by itself only when the client chose
 * "publish automatically after the gates" AND a connection exists.
 */
import { mkdirSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { asPublished } from "../src/page/one-builder.mjs";

export const TARGETS = Object.freeze([
  Object.freeze({ id: "wordpress", label: "WordPress", chooseIf: "your site is built with WordPress (you sign in at your-site/wp-admin).", needs: "your site's address, your WordPress user name, and an application password (WordPress → Users → Profile → Application Passwords → Add new).", keyName: "WORDPRESS_APP_PASSWORD" }),
  Object.freeze({ id: "github", label: "GitHub + Vercel (like AlmiWorld)", chooseIf: "your site's files live in a GitHub repository that Vercel (or Netlify) builds by itself after every change.", needs: "the repository (owner/name), its branch, the folder for new pages, and a GitHub access token that may change only that repository (GitHub → Settings → Developer settings → Fine-grained tokens → Contents: Read and write).", keyName: "GITHUB_TOKEN" }),
  Object.freeze({ id: "shopify", label: "Shopify", chooseIf: "your shop runs on Shopify.", needs: "your shop's address (your-shop.myshopify.com) and an access token from a custom app you make in your Shopify admin (Settings → Apps → Develop apps → allow \"write online store pages\").", keyName: "SHOPIFY_ADMIN_TOKEN" }),
  Object.freeze({ id: "download", label: "Download the files, I'll add them myself", chooseIf: "your site is built another way, or you want to add the pages yourself.", needs: "nothing — each page is saved as a file in a folder on this computer, with where to put it.", keyName: null }),
]);
export const SHOPIFY_API_VERSION = "2026-07"; // Shopify's dated admin version — not yet tried against a live shop (none available to AlmiWorld)
const slugOf = (url) => String(url).replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9/-]+/gi, "-").slice(0, 120) || "page";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/* the page's own content (its <main>, else its <body>) — for a builder that puts it inside its own page frame */
export const mainOf = (html) => (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? String(html)).trim();
export const titleOf = (html, fallback = "") => (/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? fallback).trim();

/** Is this address one the key may go to? */
export function keyMayGo(target, url, { allowLocal = false } = {}) {
  let u; try { u = new URL(url); } catch { return false; }
  if (allowLocal && u.protocol === "http:" && u.hostname === "127.0.0.1") return true;
  if (u.protocol !== "https:") return false;
  if (target.kind === "wordpress") return u.origin === new URL(target.site).origin;
  if (target.kind === "github") return u.origin === "https://api.github.com";
  if (target.kind === "shopify") return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(u.hostname) && u.hostname === new URL(`https://${target.shop}`).hostname;
  return false;
}

/** The connection's settings, checked — what the client typed (never the key itself, which goes to the secure store by its NAME). */
export function checkTarget(t, { allowLocal = false } = {}) {
  const kind = TARGETS.find((x) => x.id === t?.kind);
  if (!kind) return "Choose where your site is built.";
  if (t.kind === "wordpress") { try { const u = new URL(t.site); if (u.protocol !== "https:" && !(allowLocal && u.hostname === "127.0.0.1")) return "Your WordPress site's address must start with https://"; } catch { return "Give your WordPress site's address, for example https://www.example.com"; } if (!String(t.user ?? "").trim()) return "Give your WordPress user name."; }
  if (t.kind === "github") { if (!/^[\w.-]+\/[\w.-]+$/.test(String(t.repo ?? ""))) return "Give the repository as owner/name, for example almiworld/site."; if (!/^[\w./-]{1,100}$/.test(String(t.branch ?? ""))) return "Give the branch, for example main."; if (!/^[\w./-]{0,100}$/.test(String(t.folder ?? ""))) return "The folder may hold only letters, numbers, - _ . and /."; try { new URL(t.site); } catch { return "Give your site's address, for example https://www.example.com — the live link is made from it."; } }
  if (t.kind === "shopify") { if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(String(t.shop ?? "")) && !(allowLocal && /^127\.0\.0\.1:\d+$/.test(String(t.shop ?? "")))) return "Give your shop's address, for example your-shop.myshopify.com"; }
  return null;
}

/**
 * Publish ONE draft. `draft` = { url, title, html }; `target` = the checked connection; `key` = the client's key (from the secure store, handed
 * straight in, never kept). Returns { ok, live, remote } or { ok:false, why }.
 */
export async function publishDraft({ draft, target, key, fetchImpl = fetch, downloadsDir, allowLocal = false, testBase = null }) {
  /* only a draft the five gates passed (as judged again right before, by the caller) ever leaves — here too, never only in the caller */
  if (draft.readyAsDraft !== true) return { ok: false, why: "Not published — this draft has not passed the five checks." };
  const slug = slugOf(draft.url).split("/").pop();
  /* the page as it goes live: the draft stamp and the "do not index" mark removed, its own address as canonical (the same text the gates judged) */
  const html = asPublished(draft.html, draft.url);
  const title = titleOf(html, draft.title);
  const send = async (url, init) => {
    if (!keyMayGo(target, url, { allowLocal })) return { ok: false, why: "Refused: the key may go only to your own site's address." };
    let r; try { r = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20000) }); } catch { return { ok: false, why: "Your site did not answer — nothing was published." }; }
    const body = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) return { ok: false, why: "Your site refused the key — check it in Publish settings. Nothing was published." };
    if (!r.ok) return { ok: false, why: `Your site answered with an error (${r.status}) — nothing was published.` };
    return { ok: true, body };
  };
  if (target.kind === "download") {
    const dir = resolve(downloadsDir, slug);
    if (!dir.startsWith(resolve(downloadsDir) + sep)) return { ok: false, why: "Refused: a page name that leaves the folder." };
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
    writeFileSync(join(dir, "WHERE-TO-PUT-IT.txt"), `Put index.html on your site at: ${draft.url}\nThen add this address to your sitemap: ${draft.url}\nMade by AlmiVisibility.\n`);
    return { ok: true, live: null, saved: dir, remote: { dir } };
  }
  if (target.kind === "wordpress") {
    const base = testBase ?? new URL(target.site).origin;
    const r = await send(`${base}/wp-json/wp/v2/pages`, { method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${target.user}:${key}`).toString("base64")}` }, body: JSON.stringify({ title, content: mainOf(html), status: "publish", slug }) });
    if (!r.ok) return r;
    return { ok: true, live: r.body.link ?? `${base}/${slug}/`, remote: { id: r.body.id } };
  }
  if (target.kind === "github") {
    const api = testBase ?? "https://api.github.com";
    const path = [String(target.folder ?? "").replace(/^\/+|\/+$/g, ""), slug, "index.html"].filter(Boolean).join("/");
    const r = await send(`${api}/repos/${target.repo}/contents/${path}`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" }, body: JSON.stringify({ message: `Add page ${slug} (AlmiVisibility)`, content: Buffer.from(html).toString("base64"), branch: target.branch }) });
    if (!r.ok) return r;
    return { ok: true, live: `${String(target.site).replace(/\/+$/, "")}/${slug}/`, remote: { path, sha: r.body.content?.sha ?? null } };
  }
  if (target.kind === "shopify") {
    const base = testBase ?? `https://${target.shop}`;
    const r = await send(`${base}/admin/api/${SHOPIFY_API_VERSION}/pages.json`, { method: "POST", headers: { "content-type": "application/json", "x-shopify-access-token": key }, body: JSON.stringify({ page: { title, body_html: mainOf(html), handle: slug, published: true } }) });
    if (!r.ok) return r;
    return { ok: true, live: `https://${target.shop}/pages/${r.body.page?.handle ?? slug}`, remote: { id: r.body.page?.id } };
  }
  return { ok: false, why: "Choose where your site is built." };
}

/** Undo ONE publish (the record made by publishDraft). */
export async function unpublish({ record, target, key, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  const go = async (url, init) => { if (!keyMayGo(target, url, { allowLocal })) return { ok: false, why: "Refused: the key may go only to your own site's address." }; try { const r = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20000) }); return r.ok ? { ok: true } : { ok: false, why: `Your site answered with an error (${r.status}) — nothing was changed.` }; } catch { return { ok: false, why: "Your site did not answer — nothing was changed." }; } };
  if (target.kind === "download") { const d = record.remote?.dir; if (d && existsSync(d)) renameSync(d, `${d}.removed-${Date.now()}`); return { ok: true }; }
  if (target.kind === "wordpress") return go(`${testBase ?? new URL(target.site).origin}/wp-json/wp/v2/pages/${record.remote.id}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${target.user}:${key}`).toString("base64")}` }, body: JSON.stringify({ status: "draft" }) });
  if (target.kind === "github") {
    const api = testBase ?? "https://api.github.com";
    /* the file's current version is asked first — a delete needs it */
    let sha = record.remote.sha;
    try { const r = await fetchImpl(`${api}/repos/${target.repo}/contents/${record.remote.path}?ref=${encodeURIComponent(target.branch)}`, { headers: { authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" }, signal: AbortSignal.timeout(20000) }); if (r.ok) sha = (await r.json()).sha ?? sha; } catch {}
    return go(`${api}/repos/${target.repo}/contents/${record.remote.path}`, { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" }, body: JSON.stringify({ message: `Remove page ${record.remote.path} (AlmiVisibility)`, sha, branch: target.branch }) });
  }
  if (target.kind === "shopify") return go(`${testBase ?? `https://${target.shop}`}/admin/api/${SHOPIFY_API_VERSION}/pages/${record.remote.id}.json`, { method: "PUT", headers: { "content-type": "application/json", "x-shopify-access-token": key }, body: JSON.stringify({ page: { id: record.remote.id, published: false } }) });
  return { ok: false, why: "Unknown connection." };
}

/** "Edit": the client's changes to a draft — its title and its main text — put back into the page (the gates judge it again before publishing). */
export function editDraft(draft, { title, main }) {
  let html = String(draft.html);
  if (typeof title === "string" && title.trim()) { html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${esc(title.trim())}</title>`).replace(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i, `<h1$1>${esc(title.trim())}</h1>`); }
  if (typeof main === "string" && main.trim()) {
    /* only plain words and simple formatting come back from the editor — no script, no style, no event handler */
    const clean = main.replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");
    html = /<main\b[^>]*>[\s\S]*?<\/main>/i.test(html) ? html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/i, `$1${clean}$2`) : html.replace(/(<body\b[^>]*>)[\s\S]*?(<\/body>)/i, `$1${clean}$2`);
  }
  return { ...draft, html, title: typeof title === "string" && title.trim() ? title.trim() : draft.title, edited: true };
}
