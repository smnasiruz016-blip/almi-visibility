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
/**
 * 🔴 RR-355 (owner's publish: "Your site refused the key" — and nothing more) · WHY THE SITE REFUSED, in plain words, with what to change.
 * `what` (GitHub's 404) is "repo" or "branch" once asked. Nothing was published in every case — said once, at the end.
 */
export function refusedWhy(target, status, body = {}, what = null) {
  const msg = String(body?.message ?? body?.code ?? ""), none = " Nothing was published.";
  if (target?.kind === "github") {
    const repo = target.repo ?? "your repository", branch = target.branch || "main";
    if (status === 401) return `GitHub says your token is not valid or has expired — make a new token on GitHub (Settings → Developer settings → Personal access tokens), give it "Contents: Read and write" for ${repo}, and paste it in Publish settings.${none}`;
    if (status === 403 && /rate limit/i.test(msg)) return `GitHub asks to wait a little (too many requests in a short time) — try again in an hour.${none}`;
    if (status === 403) return `Your token cannot write files in ${repo} — on GitHub, give the token "Contents: Read and write" permission for this repository, then paste it again in Publish settings.${none}`;
    if (status === 404 && what === "branch") return `The branch "${branch}" does not exist in ${repo} — check the branch name in Publish settings (it is often "main").${none}`;
    if (status === 404) return `GitHub cannot find the repository "${repo}" with this token — check its name (owner/name) in Publish settings, or give the token access to that repository.${none}`;
    if ((status === 409 || status === 422) && /branch/i.test(msg)) return `The branch "${branch}" does not exist in ${repo} or is protected — check the branch name in Publish settings.${none}`;
  }
  if (target?.kind === "wordpress") {
    if (status === 401) return `WordPress did not accept the user name and application password — make a new application password (Users → Profile → Application Passwords) and paste it in Publish settings.${none}`;
    if (status === 403) return `This WordPress user may not create pages — use an Administrator or Editor account in Publish settings.${none}`;
    if (status === 404) return `WordPress's page service was not found at ${target.site ?? "this address"} — check the site address, and that no security plugin blocks the WordPress REST API.${none}`;
  }
  if (target?.kind === "shopify") {
    if (status === 401) return `Shopify did not accept the access token — make a new one in your store's custom app and paste it in Publish settings.${none}`;
    if (status === 403) return `The Shopify token may not write pages — give your custom app the "write_content" permission, then paste the new token.${none}`;
    if (status === 404) return `Shopify cannot find the store "${target.shop ?? ""}" — check its address (name.myshopify.com) in Publish settings.${none}`;
  }
  if (status === 401 || status === 403) return `Your site refused the key (${status}) — make a new key and paste it in Publish settings.${none}`;
  return `Your site answered with an error (${status}${msg ? `: ${msg.slice(0, 80)}` : ""}).${none}`;
}

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
    if (!r.ok) return { ok: false, status: r.status, body, why: refusedWhy(target, r.status, body) };
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
    const gh = { authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" };
    const put = (sha = null) => send(`${api}/repos/${target.repo}/contents/${path}`, { method: "PUT", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ message: `${sha ? "Update" : "Add"} page ${slug} (AlmiVisibility)`, content: Buffer.from(html).toString("base64"), branch: target.branch, ...(sha ? { sha } : {}) }) });
    let r = await put();
    /* RR-355: the page is already in the repository (published before) — GitHub asks for its current version; it is updated, never refused */
    if (!r.ok && (r.status === 422 || r.status === 409) && /\bsha\b/i.test(String(r.body?.message ?? ""))) { const cur = await send(`${api}/repos/${target.repo}/contents/${path}?ref=${encodeURIComponent(target.branch ?? "")}`, { method: "GET", headers: gh }); if (cur.ok && cur.body?.sha) r = await put(cur.body.sha); }
    /* RR-355 (owner: "say exactly why — repository not found / no permission / branch not found / token expired"): GitHub answers 404 both for
     * a repository the token cannot see and for a missing branch — asked which, so the client knows what to change */
    if (!r.ok && r.status === 404) { const repo = await send(`${api}/repos/${target.repo}`, { method: "GET", headers: gh }); r = { ...r, why: !repo.ok ? refusedWhy(target, 404, { message: "Not Found" }, "repo") : refusedWhy(target, 404, { message: "Branch not found" }, "branch") }; }
    if (!r.ok) return { ok: false, why: r.why };
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

/*
 * 🔴 RR-355 (owner: "'Fix it for me' while the screen says 'Visibility cannot change a page already on your site': when a GitHub / WordPress /
 * Shopify connection exists, the app does the fix through it; otherwise the button says 'Give me the content'") · A FIX TO A PAGE ALREADY ON
 * THE CLIENT'S SITE, through its own connection — only where the connection can really make it:
 *   · GitHub, a site of plain HTML files: the page's own file gets its new <title> or meta description (a site built by a framework, such as
 *     Next.js, writes its titles in code — Visibility gives the content instead);
 *   · WordPress: the page's title (a meta description lives in an SEO plugin, which its REST service does not write).
 * Anything else: no "Fix it for me" — the content to paste.
 */
export function fixVia(target, kind, { framework = false } = {}) {
  if (target?.kind === "github" && !framework) return ["title", "meta-description"].includes(kind);
  if (target?.kind === "wordpress") return kind === "title";
  return false;
}
const escA = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function withFix(html, kind, text) {
  const h = String(html ?? "");
  if (kind === "title") return /<title\b[^>]*>[\s\S]*?<\/title>/i.test(h) ? h.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escA(text)}</title>`) : h.replace(/<\/head>/i, `<title>${escA(text)}</title></head>`);
  if (kind === "meta-description") return /<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/i.test(h) ? h.replace(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/i, `<meta name="description" content="${escA(text)}">`) : h.replace(/<\/head>/i, `<meta name="description" content="${escA(text)}"></head>`);
  return h;
}
export async function fixExisting({ target, key, url, kind, text, framework = false, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  if (!fixVia(target, kind, { framework })) return { ok: false, why: "Visibility cannot change this on your site through its connection — use \"Give me the content\" and paste it in your site's editor." };
  const call = async (u, init) => { if (!keyMayGo(target, u, { allowLocal })) return { ok: false, why: "Refused: the key may go only to your own site's address." }; let r; try { r = await fetchImpl(u, { ...init, signal: AbortSignal.timeout(20000) }); } catch { return { ok: false, why: "Your site did not answer — nothing was changed." }; } const body = await r.json().catch(() => ({})); return r.ok ? { ok: true, body } : { ok: false, status: r.status, body, why: refusedWhy(target, r.status, body).replace("Nothing was published.", "Nothing was changed.") }; };
  const path = (() => { try { return new URL(url).pathname.replace(/^\/+|\/+$/g, ""); } catch { return null; } })(); if (path === null) return { ok: false, why: "Not a page address." };
  if (target.kind === "github") {
    const api = testBase ?? "https://api.github.com", gh = { authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" };
    const tries = path ? [`${path}/index.html`, `${path}.html`, `public/${path}/index.html`, `public/${path}.html`] : ["index.html", "public/index.html"];
    for (const p of tries) {
      const got = await call(`${api}/repos/${target.repo}/contents/${p}?ref=${encodeURIComponent(target.branch ?? "")}`, { method: "GET", headers: gh });
      if (!got.ok) { if (got.status === 404) continue; return got; }
      if (!got.body?.content || !got.body.sha) continue;
      const html = Buffer.from(got.body.content, "base64").toString("utf8"), next = withFix(html, kind, text);
      if (next === html) return { ok: true, line: `Already right on ${url}.` };
      const put = await call(`${api}/repos/${target.repo}/contents/${p}`, { method: "PUT", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ message: `Fix ${kind} of ${path || "home"} (AlmiVisibility)`, content: Buffer.from(next).toString("base64"), branch: target.branch, sha: got.body.sha }) });
      return put.ok ? { ok: true, line: `Fixed on your site: the ${kind === "title" ? "title" : "description"} of ${url} (in ${p}).` } : put;
    }
    return { ok: false, why: `Visibility found no file for ${url} in ${target.repo} — use "Give me the content" and paste it yourself.` };
  }
  if (target.kind === "wordpress") {
    const base = testBase ?? new URL(target.site).origin, auth = { authorization: `Basic ${Buffer.from(`${target.user}:${key}`).toString("base64")}` };
    const slug = path.split("/").pop(); if (!slug) return { ok: false, why: "Your home page's title is set in WordPress → Settings → General — use \"Give me the content\"." };
    const found = await call(`${base}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`, { method: "GET", headers: auth }); if (!found.ok) return found;
    const pg = Array.isArray(found.body) ? found.body[0] : null; if (!pg?.id) return { ok: false, why: `WordPress has no page at ${url} — use "Give me the content".` };
    const up = await call(`${base}/wp-json/wp/v2/pages/${pg.id}`, { method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ title: text }) });
    return up.ok ? { ok: true, line: `Fixed on your site: the title of ${url}.` } : up;
  }
  return { ok: false, why: "Not possible through this connection." };
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
