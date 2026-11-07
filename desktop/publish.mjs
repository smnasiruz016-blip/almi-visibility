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
import { mkdirSync, writeFileSync, existsSync, renameSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { asPublished, THIN_MARK } from "../src/page/one-builder.mjs";
import { visibleQa } from "./page-law.mjs";
/* 🔴 RR-383 item 2 (Q&A LAW 6): the PAGE carries noindex when it shows fewer than 6 real Q&A (the fee question not counted). Counted on the
 * finished page, the last word before it goes, so no page is indexable on a count made elsewhere (the real proof: 8 drafts with 5 went out "index") */
export { THIN_MARK }; /* RR-383: main reads the mark through here (it never imports the builder) */
export const REAL_QA_MIN = 6;
const FEE_Q = /\bhow much (?:does|is|do)\b[^?]*\b(?:cost|fees?)\b|\b(?:exam|test) fees?\b/i;
export const realQa = (html) => visibleQa(html).filter((q) => q.answers.length && !FEE_Q.test(q.q)).length;
/* 🔴 RR-385 item e (beta-g: /oet-exam-price, 1,578 words and 26 country fee fold-outs, went out noindex because fee rows were not counted): a fee
 * row that shows its own source link and the day it was read is checked content and counts toward the 6 */
export const checkedFeeRows = (html) => (mainOf(html).match(/<details\b[^>]*data-foldout[^>]*>[\s\S]*?<\/details>/gi) ?? []).filter((x) => /<span class="citation">[\s\S]*?<a\b[^>]*href="https?:\/\/[^"]+"[\s\S]*?read \d{4}-\d{2}-\d{2}/.test(x) && /\b(?:fee|costs?|price)\b/i.test(x)).length;
export const indexCount = (html) => realQa(html) + checkedFeeRows(html);
/* only a Q&A or fee page is counted (Q&A LAW 6); a page with neither (an article, a client's own page) goes out as it was made. Below 6 → noindex;
 * a fee page that reaches 6 with its checked fee rows is indexed even when its draft was marked "needs more answers" */
export const asPublishedGuarded = (html, url) => { const fees = checkedFeeRows(html), counted = visibleQa(html).length > 0 || fees > 0, n = indexCount(html); let h = String(html); if (counted && n < REAL_QA_MIN) h = asNoindex(h); else if (fees && n >= REAL_QA_MIN && h.includes(THIN_MARK)) h = h.replace(THIN_MARK, ""); return asPublished(h, url); };

export const TARGETS = Object.freeze([
  Object.freeze({ id: "wordpress", label: "WordPress", chooseIf: "your site is built with WordPress (you sign in at your-site/wp-admin).", needs: "your site's address, your WordPress user name, and an application password (WordPress → Users → Profile → Application Passwords → Add new).", keyName: "WORDPRESS_APP_PASSWORD" }),
  Object.freeze({ id: "github", label: "GitHub + Vercel (like AlmiWorld)", chooseIf: "your site's files live in a GitHub repository that Vercel (or Netlify) builds by itself after every change.", needs: "the repository (owner/name), its branch, the folder for new pages, and a GitHub access token that may change only that repository (GitHub → Settings → Developer settings → Fine-grained tokens → Contents: Read and write).", keyName: "GITHUB_TOKEN" }),
  Object.freeze({ id: "shopify", label: "Shopify", chooseIf: "your shop runs on Shopify.", needs: "your shop's address (your-shop.myshopify.com) and an access token from a custom app you make in your Shopify admin (Settings → Apps → Develop apps → allow \"write online store pages\").", keyName: "SHOPIFY_ADMIN_TOKEN" }),
  Object.freeze({ id: "download", label: "Download the files, I'll add them myself", chooseIf: "your site is built another way, or you want to add the pages yourself.", needs: "nothing — each page is saved as a file in a folder on this computer, with where to put it.", keyName: null }),
]);
/* 🔴 RR-370 item 12: a GitHub branch other than the site's main one is a preview: nothing there is live */
/* 🔴 RR-371: a connection with no folder writes to the top of the repository, where a site that serves its pages from a folder of its own never shows them. Read from that site's own code (lists/publish-folders.json); a folder the client set stands */
export const PUBLISH_FOLDERS = Object.freeze(JSON.parse(readFileSync(new URL("./lists/publish-folders.json", import.meta.url), "utf8")).rows);
export const withKnownFolder = (t, rows = PUBLISH_FOLDERS) => { if (t?.kind !== "github" || String(t.folder ?? "").replace(/^\/+|\/+$/g, "")) return t; const r = rows.find((x) => x.repo.toLowerCase() === String(t.repo ?? "").toLowerCase()); return r ? { ...t, folder: r.folder } : t; };
export const previewOf = (t) => (t?.kind === "github" && t.branch && !/^(?:main|master|production)$/i.test(String(t.branch)) ? { branch: t.branch, repo: t.repo, folder: String(t.folder ?? "").replace(/^\/+|\/+$/g, "") } : null);
export const SHOPIFY_API_VERSION = "2026-07"; // Shopify's dated admin version — not yet tried against a live shop (none available to AlmiWorld)
const slugOf = (url) => String(url).replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9/-]+/gi, "-").slice(0, 120) || "page";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/* the page's own content (its <main>, else its <body>) — for a builder that puts it inside its own page frame */
export const mainOf = (html) => (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? String(html)).trim();
export const titleOf = (html, fallback = "") => (/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? fallback).trim();

/** 🔴 RR-373 item 8: a site names its own sitemap in robots.txt (AlmiOET: /sitemap-index.xml; /sitemap.xml is a 404 there) */
export function sitemapAddress(origin, robotsTxt = null) { for (const m of String(robotsTxt ?? "").matchAll(/^\s*sitemap:\s*(\S+)/gim)) { try { if (new URL(m[1]).origin === origin) return m[1]; } catch { /* not an address */ } } return `${origin}/sitemap.xml`; }
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
    /* 🔴 RR-373 item 4: 403 is two things: said which */
    if (status === 429 || (status === 403 && /rate limit/i.test(msg))) return `GitHub's limit on how fast a token may write was reached: your token is fine. Wait about an hour, then press Publish all ready: it goes on from where it stopped.${none}`;
    if (status === 403) return `Your token cannot write files in ${repo} — on GitHub, give the token "Contents: Read and write" permission for this repository, then paste it again in Publish settings.${none}`;
    /* 🔴 RR-373 item 4: a 404 on a write while the repository can be read and the branch is there: GitHub hides a write this token may not make. Never "branch missing" */
    if (status === 404 && what === "no-access") return `Your token has no access to write in ${repo} — the repository and the branch "${branch}" are there. On GitHub, open the token, and under Repository access choose ${repo}, with "Contents: Read and write". Then press Test connection.${none}`;
    if (status === 404 && what === "branch") return `The branch "${branch}" does not exist in ${repo} — check the branch name in Publish settings (it is often "main").${none}`;
    if (status === 404) return `GitHub cannot find the repository "${repo}" with this token — check its name (owner/name) in Publish settings, or give the token access to that repository.${none}`;
    if (/secret/i.test(msg)) return `GitHub's secret protection stopped this page: it found something in the page that looks like a password or key. Open the page and remove it.${none}`;
    if ((status === 409 || status === 422) && /branch/i.test(msg)) return `The branch "${branch}" does not exist in ${repo} or is protected — check the branch name in Publish settings.${none}`;
    if (status === 409 || status === 422) return `GitHub refused the file even when tried again with its newest version (${status}${msg ? `: ${msg.slice(0, 160)}` : ""}).${none}`;
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

/* 🔴 RR-373: one call to the site: every failure keeps the status and the site's own message. Never a header, never the key */
const netWords = (e) => (/header|ByteString/i.test(`${e?.message ?? ""} ${e?.cause?.message ?? ""}`) && e?.name === "TypeError" ? "the saved key holds a hidden character" : String(e?.cause?.code ?? e?.name ?? "no answer"));
const isRate = (status, msg, headers) => status === 429 || (status === 403 && (/rate limit/i.test(msg) || headers?.get?.("x-ratelimit-remaining") === "0"));
const caller = ({ target, fetchImpl, allowLocal }) => async (url, init, timeoutMs = 20000) => {
  if (!keyMayGo(target, url, { allowLocal })) return { ok: false, status: 0, message: "refused here", why: "Refused: the key may go only to your own site's address." };
  let r; try { r = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }); } catch (e) { const message = netWords(e); return { ok: false, status: 0, message, why: /hidden character/.test(message) ? "The saved key holds a hidden character, so it cannot be sent: copy it again and paste it in Publish settings. Nothing was published." : "Your site did not answer — nothing was published." }; }
  const body = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, status: r.status, body };
  const message = String(body?.message ?? body?.code ?? "").slice(0, 300), rate = isRate(r.status, message, r.headers);
  return { ok: false, status: r.status, message, rate, body, why: refusedWhy(target, r.status, rate ? { message: "rate limit" } : body) };
};
/* 🔴 RR-373 item 6: an answer that says every next page gets the same: the run stops at the first */
export const stopsTheRun = (o) => o?.status === 0 || o?.status === 401 || o?.status === 403 || o?.status === 404 || o?.status === 429 || o?.rate === true;
const clean = ({ body, ...o }) => o;
const ghPath = (target, url) => [String(target.folder ?? "").replace(/^\/+|\/+$/g, ""), slugOf(url).split("/").pop(), "index.html"].filter(Boolean).join("/");
/* 🔴 RR-373 item 4: GitHub answers 404 for a repository the token cannot see, for a missing branch, and for a write it hides: asked which */
const read404 = async (target, key, send, api) => { const repo = await send(`${api}/repos/${target.repo}`, { method: "GET", headers: ghHeaders(key) }); if (!repo.ok) return refusedWhy(target, 404, { message: "Not Found" }, "repo"); const br = await send(`${api}/repos/${target.repo}/branches/${target.branch}`, { method: "GET", headers: ghHeaders(key) }); return refusedWhy(target, 404, { message: "Not Found" }, br.ok || br.status !== 404 ? "no-access" : "branch"); };
const ghHeaders = (key) => ({ authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" });

export async function publishDraft({ draft, target, key, fetchImpl = fetch, downloadsDir, allowLocal = false, testBase = null }) {
  /* only a draft the five gates passed (as judged again right before, by the caller) ever leaves — here too, never only in the caller */
  if (draft.readyAsDraft !== true) return { ok: false, why: "Not published — this draft has not passed the five checks." };
  const slug = slugOf(draft.url).split("/").pop();
  /* the page as it goes live: the draft stamp and the "do not index" mark removed, its own address as canonical (the same text the gates judged) */
  const html = asPublishedGuarded(draft.html, draft.url);
  const title = titleOf(html, draft.title);
  const send = caller({ target, fetchImpl, allowLocal });
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
    if (!r.ok) return clean(r);
    return { ok: true, status: r.status, live: r.body.link ?? `${base}/${slug}/`, remote: { id: r.body.id } };
  }
  if (target.kind === "github") {
    const api = testBase ?? "https://api.github.com";
    const path = ghPath(target, draft.url);
    const gh = ghHeaders(key);
    const put = (sha = null) => send(`${api}/repos/${target.repo}/contents/${path}`, { method: "PUT", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ message: `${sha ? "Update" : "Add"} page ${slug} (AlmiVisibility)`, content: Buffer.from(html).toString("base64"), branch: target.branch, ...(sha ? { sha } : {}) }) });
    let r = await put();
    if (!r.ok && r.status === 0 && r.message !== "refused here" && !/hidden/.test(r.message ?? "")) r = await put(); /* 🔴 RR-373: a connection dropped on the way, once more */
    /* RR-355: the page is already in the repository (published before) — GitHub asks for its current version; it is updated, never refused */
    /* 🔴 RR-373 item 4: any 409 or 422 is a conflict: once more, with the newest version GitHub has */
    if (!r.ok && (r.status === 422 || r.status === 409)) { const cur = await send(`${api}/repos/${target.repo}/contents/${path}?ref=${encodeURIComponent(target.branch ?? "")}`, { method: "GET", headers: gh }); r = await put(cur.ok ? cur.body?.sha ?? null : null); }
    /* RR-355 (owner: "say exactly why — repository not found / no permission / branch not found / token expired"): GitHub answers 404 both for
     * a repository the token cannot see and for a missing branch — asked which, so the client knows what to change */
    if (!r.ok && r.status === 404) r = { ...r, why: await read404(target, key, send, api) };
    if (!r.ok) return clean(r);
    /* 🔴 RR-373 item 1: published only when GitHub names the file it wrote */
    if (!r.body?.content?.sha && !r.body?.commit?.sha) return { ok: false, status: r.status, message: "no file named in the answer", why: "GitHub answered without confirming the file was written. Nothing is counted as published." };
    const preview = previewOf(target); /* 🔴 RR-370 item 12: never said as live, never sent to a search engine */
    return { ok: true, status: r.status, live: preview ? null : `${String(target.site).replace(/\/+$/, "")}/${slug}/`, ...(preview ? { preview: { ...preview, path } } : {}), remote: { path, sha: r.body.content?.sha ?? null } };
  }
  if (target.kind === "shopify") {
    const base = testBase ?? `https://${target.shop}`;
    const r = await send(`${base}/admin/api/${SHOPIFY_API_VERSION}/pages.json`, { method: "POST", headers: { "content-type": "application/json", "x-shopify-access-token": key }, body: JSON.stringify({ page: { title, body_html: mainOf(html), handle: slug, published: true } }) });
    if (!r.ok) return clean(r);
    return { ok: true, status: r.status, live: `https://${target.shop}/pages/${r.body.page?.handle ?? slug}`, remote: { id: r.body.page?.id } };
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

/*
 * 🔴 RR-356 PART B · AN EXISTING PAGE IMPROVED THROUGH THE SITE'S OWN CONNECTION: the improvement pack's section (desktop/improve.mjs) is
 * added to the page — GitHub: the page's own HTML file (before its </main>, else before its footer); WordPress: the page's own content. A
 * page written in code (a framework's page, a Shopify theme) cannot be changed this way: Visibility gives the content to paste instead.
 */
export const improveVia = (target) => target?.kind === "github" || target?.kind === "wordpress";
export const withSection = (html, section) => { const h = String(html ?? ""); if (h.includes("data-improve-for")) return h.replace(/<section class="av-page" data-improve-for="[^"]*">[\s\S]*?<\/section>/, section); return /<\/main>/i.test(h) ? h.replace(/<\/main>/i, `${section}</main>`) : /<footer\b/i.test(h) ? h.replace(/<footer\b/i, `${section}<footer`) : /<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${section}</body>`) : `${h}${section}`; };
export async function improveExisting({ target, key, url, section, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  if (!improveVia(target)) return { ok: false, why: "Your site's connection cannot change an existing page — copy the content Visibility made for it (Get the content)." };
  if (!section) return { ok: false, why: "Your page already answers every question Visibility has for it — nothing to add." };
  const call = async (u, init) => { if (!keyMayGo(target, u, { allowLocal })) return { ok: false, why: "Refused: the key may go only to your own site's address." }; let r; try { r = await fetchImpl(u, { ...init, signal: AbortSignal.timeout(20000) }); } catch { return { ok: false, why: "Your site did not answer — nothing was changed." }; } const body = await r.json().catch(() => ({})); return r.ok ? { ok: true, body } : { ok: false, status: r.status, body, why: refusedWhy(target, r.status, body).replace("Nothing was published.", "Nothing was changed.") }; };
  const path = (() => { try { return new URL(url).pathname.replace(/^\/+|\/+$/g, ""); } catch { return null; } })(); if (path === null) return { ok: false, why: "Not a page address." };
  if (target.kind === "github") {
    const api = testBase ?? "https://api.github.com", gh = { authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "user-agent": "AlmiVisibility" };
    for (const p of path ? [`${path}/index.html`, `${path}.html`, `public/${path}/index.html`, `public/${path}.html`] : ["index.html", "public/index.html"]) {
      const got = await call(`${api}/repos/${target.repo}/contents/${p}?ref=${encodeURIComponent(target.branch ?? "")}`, { method: "GET", headers: gh });
      if (!got.ok) { if (got.status === 404) continue; return got; }
      if (!got.body?.content || !got.body.sha) continue;
      const next = withSection(Buffer.from(got.body.content, "base64").toString("utf8"), section);
      const put = await call(`${api}/repos/${target.repo}/contents/${p}`, { method: "PUT", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ message: `Improve ${path || "home"} (AlmiVisibility)`, content: Buffer.from(next).toString("base64"), branch: target.branch, sha: got.body.sha }) });
      return put.ok ? { ok: true, line: previewOf(target) ? `Improved in the preview: branch ${target.branch} of ${target.repo} (in ${p}). Not live until that branch is merged.` : `Improved on your site: ${url} (in ${p}) — it goes live with your site's next deploy.` } : put;
    }
    return { ok: false, why: `Visibility found no file for ${url} in ${target.repo} — the page is made by your site's code. Copy the content Visibility made for it (Get the content).` };
  }
  const base = testBase ?? new URL(target.site).origin, auth = { authorization: `Basic ${Buffer.from(`${target.user}:${key}`).toString("base64")}` };
  const slug = path.split("/").pop(); if (!slug) return { ok: false, why: "Your home page is changed in WordPress itself — copy the content (Get the content)." };
  const found = await call(`${base}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit`, { method: "GET", headers: auth }); if (!found.ok) return found;
  const pg = Array.isArray(found.body) ? found.body[0] : null; if (!pg?.id) return { ok: false, why: `WordPress has no page at ${url} — copy the content (Get the content).` };
  const up = await call(`${base}/wp-json/wp/v2/pages/${pg.id}`, { method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ content: withSection(pg.content?.raw ?? pg.content?.rendered ?? "", section) }) });
  return up.ok ? { ok: true, line: `Improved on your site: ${url}.` } : up;
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

/**
 * 🔴 RR-373 item 6 · MANY PAGES, ONE COMMIT. A file written alone is a commit, and every commit starts one site build and one test run: 295 pages would be 295 builds. A group of pages goes as one commit,
 * with GitHub's own tree calls. Counted as written only when GitHub moved the branch to that commit. A conflict (409, 422: someone else moved the branch) is tried once more from the newest commit.
 */
export async function publishPagesGithub({ drafts, target, key, fetchImpl = fetch, allowLocal = false, testBase = null, message = null }) {
  const api = testBase ?? "https://api.github.com", repo = `${api}/repos/${target.repo}`, gh = ghHeaders(key), send = caller({ target, fetchImpl, allowLocal }), post = (url, body, ms) => send(url, { method: "POST", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify(body) }, ms);
  const files = drafts.map((d) => ({ url: d.url, path: ghPath(target, d.url), content: asPublishedGuarded(d.html, d.url) })), preview = previewOf(target);
  const attempt = async () => {
    const ref = await send(`${repo}/git/ref/heads/${target.branch}`, { method: "GET", headers: gh }); if (!ref.ok) return ref;
    const head = ref.body?.object?.sha, base = await send(`${repo}/git/commits/${head}`, { method: "GET", headers: gh }); if (!base.ok) return base;
    const tree = await post(`${repo}/git/trees`, { base_tree: base.body?.tree?.sha, tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })) }, 120000); if (!tree.ok) return tree;
    const commit = await post(`${repo}/git/commits`, { message: message ?? `Add ${files.length} page${files.length === 1 ? "" : "s"} (AlmiVisibility)`, tree: tree.body?.sha, parents: [head] }, 60000); if (!commit.ok) return commit;
    const up = await send(`${repo}/git/refs/heads/${target.branch}`, { method: "PATCH", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ sha: commit.body?.sha, force: false }) }); if (!up.ok) return up;
    if (!commit.body?.sha || up.body?.object?.sha !== commit.body.sha) return { ok: false, status: up.status, message: "the branch did not move to the new commit", why: "GitHub answered without moving the branch to these pages. Nothing is counted as published." };
    return { ok: true, status: up.status, commit: commit.body.sha };
  };
  let r = await attempt();
  /* 🔴 RR-373: (the built app's own proof: ECONNRESET between two groups) a connection dropped on the way is tried once more; the same files again change nothing */
  if (!r.ok && (r.status === 409 || r.status === 422 || (r.status === 0 && r.message !== "refused here" && !/hidden/.test(r.message ?? "")))) r = await attempt();
  if (!r.ok && r.status === 404) r = { ...r, why: await read404(target, key, send, api) };
  if (!r.ok) return { ...clean(r), paths: files.map((f) => ({ url: f.url, path: f.path })) };
  return { ok: true, status: r.status, commit: r.commit, pages: files.map((f) => ({ url: f.url, ok: true, status: r.status, live: preview ? null : `${String(target.site).replace(/\/+$/, "")}/${f.path.split("/").slice(-2, -1)[0]}/`, ...(preview ? { preview: { ...preview, path: f.path } } : {}), remote: { path: f.path, commit: r.commit } })) };
}

/**
 * 🔴 RR-383 item 1 (beta-g's scan of the AlmiOET preview, 6 Nov 22:40: the app held 131 pages as ready, the branch held 311; 180 kept their
 * 01:59 version with lines the truth pass had not checked) · PUBLISH MIRRORS THE APP. After every publish the target's folder equals what the app
 * holds now: a page the app holds as ready is written; a page it does not is REWRITTEN from its current draft (only checked lines; noindex,
 * follow, so it stays for visitors and out of search) when the only gates it fails are about having too few answers, or REMOVED otherwise
 * (a duplicate, a copy, a work note, no draft any more). Nothing older stays.
 */
export const REWRITE_GATES = Object.freeze(["answers its core questions", "technically ready for search and AI engines"]);
/* 🔴 RR-385 (beta-g's scan of the mirrored preview, 7 Nov 00:30: the 18 pages the mirror removed were linked from every page's menu and
 * "Choose your country" list, so every page carried 404 links; Australia, the US, Reading, Writing, Speaking and Online OET were among them).
 * The owner's rule: a page is never deleted; a page with few checked answers stays as noindex. Only a true duplicate (R-C) may go, and only
 * when no page that stays links to it */
export const DUPLICATE_GATES = Object.freeze(["not a duplicate", "not a copy of another page"]);
const DRAFT_ROBOTS = '<meta name="robots" content="noindex, nofollow">';
/** words of rules the owner superseded (RR-383 item 3): a "Confirm with …" sentence and an inline "(Source: X.)", taken out of the page and its FAQ data alike */
export const cleanSuperseded = (html) => String(html ?? "").replace(/\s*\b(?:Please\s+)?Confirm (?:this |the (?:details|fee|rules?) )?with\b[^.<"\\]{0,200}\./g, "").replace(/\s*\((?:Source|Sources):\s*[^()<"\\]{1,160}\)\.?/g, "");
/** may a not-ready draft stand on the site (noindex) as it is now? → null, or why it may not (its gates are NOT a reason: the page goes out noindex) */
export function rewriteRefusal(d, { noteOf = () => null, faultsOf = () => [] } = {}) {
  if (!d?.html) return "the app no longer makes this page";
  if (!/data-cta>/.test(d.html)) return "it has no offer button";
  const n = noteOf(d.html); if (n) return `it still shows a work note ("${n}")`;
  const f = faultsOf(d.html, d.url) ?? []; if (f.length) return `the page law: ${f[0]}`; /* Q&A LAW 5 and 5A, as for a ready page */
  if (!d.html.includes(DRAFT_ROBOTS) && !d.html.includes(THIN_MARK)) return "it cannot be marked noindex";
  return null;
}
/** a not-ready draft as it may stand: noindex, follow (asPublished turns THIN_MARK into it) */
export const asNoindex = (html) => (String(html).includes(THIN_MARK) ? String(html) : String(html).replace(DRAFT_ROBOTS, (m) => `${m}${THIN_MARK}`));
/** the app's own pages a page links to: every link (menu, lists, answers) whose last path part is one of `slugs` → Set(slug) */
export const linkedSlugs = (html, slugs, origin = null) => { const out = new Set(); for (const m of String(html ?? "").matchAll(/<a\b[^>]*href="([^"#?]+)/gi)) { let u; try { u = new URL(m[1].replace(/&amp;/g, "&"), origin ?? "https://x.invalid/"); } catch { continue; } if (origin && u.origin !== new URL(origin).origin) continue; const s = u.pathname.replace(/^\/+|\/+$/g, "").split("/").pop(); if (s && slugs.has(s)) out.add(s); } return out; };
/**
 * held: the target's page addresses (slug → path); drafts: the app's current drafts; readyUrls: what the app holds as ready (written now or before).
 * → { keep: [path], keepItems, rewrite: [{ url, path, html }], remove: [{ path, slug, why }], blocked: [{ path, slug, why, linkedBy }], broken: [{ from, to }] }
 */
export function mirrorPlan({ held, drafts, readyUrls, noteOf = () => null, faultsOf = () => [] }) {
  const bySlug = new Map((drafts ?? []).map((d) => [slugOf(d.url).split("/").pop(), d])), out = { keep: [], keepItems: [], rewrite: [], remove: [], blocked: [], broken: [] }, gone = [];
  let origin = null; try { origin = new URL((drafts ?? [])[0]?.url).origin; } catch { origin = null; }
  for (const [slug, path] of held) {
    const d0 = bySlug.get(slug);
    if (d0 && readyUrls.has(d0.url)) { out.keep.push(path); out.keepItems.push({ url: d0.url, path, html: d0.html }); continue; } /* RR-384: refreshed when its file is in the wrong index state */
    const d = d0 ? { ...d0, html: cleanSuperseded(d0.html) } : null, why = rewriteRefusal(d, { noteOf, faultsOf });
    const dup = (d0?.gates ?? []).filter((g) => !g.pass && DUPLICATE_GATES.includes(g.words)).map((g) => g.words);
    if (why) gone.push({ path, slug, why }); else if (dup.length) gone.push({ path, slug, why: `a true duplicate (${dup.join(", ")})`, canStand: { url: d.url, path, html: asNoindex(d.html) } }); else out.rewrite.push({ url: d.url, path, html: asNoindex(d.html) });
  }
  /* 🔴 never remove a page that a staying page links to: a duplicate stays as noindex; a page that cannot stand at all is reported, never removed */
  const managed = new Set([...held.keys(), ...bySlug.keys()]), staying = () => [...out.keepItems, ...out.rewrite], linkers = (slug) => staying().filter((p) => linkedSlugs(p.html, managed, origin).has(slug)).map((p) => p.url);
  for (let changed = true; changed;) { changed = false; for (const g of [...gone]) { const by = linkers(g.slug); if (!by.length) continue; gone.splice(gone.indexOf(g), 1); changed = true; if (g.canStand) out.rewrite.push(g.canStand); else out.blocked.push({ path: g.path, slug: g.slug, why: g.why, linkedBy: by.slice(0, 20) }); } }
  out.remove = gone.map(({ path, slug, why }) => ({ path, slug, why }));
  /* an app page a staying page links to that is not on the site yet is ADDED as noindex when it can stand (its path as the site's other pages) */
  const sample = [...held.values()][0] ?? null, pathOf = (slug) => (sample ? sample.replace(/[^/]+\/index\.html$/, `${slug}/index.html`) : `${slug}/index.html`), slugsOn = () => new Set([...out.keepItems, ...out.rewrite].map((p) => slugOf(p.url).split("/").pop()).concat(out.blocked.map((b) => b.slug)));
  for (let added = true; added;) { added = false; const on = slugsOn(); for (const p of staying()) for (const s of linkedSlugs(p.html, managed, origin)) { if (on.has(s) || held.has(s)) continue; const d0 = bySlug.get(s); if (!d0) continue; const d = { ...d0, html: cleanSuperseded(d0.html) }; if (rewriteRefusal(d, { noteOf, faultsOf })) continue; out.rewrite.push({ url: d.url, path: pathOf(s), html: d0.readyAsDraft ? d.html : asNoindex(d.html), added: true, ready: d0.readyAsDraft === true /* a ready page goes out as the guarded publish writes it, and is recorded as published, not as a noindex rewrite */ }); on.add(s); added = true; } }
  /* 🔴 RR-385 item d · the link guard: no page that stays may link to an app page that will not be on the site */
  const onSite = slugsOn(); for (const p of staying()) for (const s of linkedSlugs(p.html, managed, origin)) if (!onSite.has(s) && !(held.has(s) && !out.remove.some((r) => r.slug === s))) out.broken.push({ from: p.url, to: s });
  return out;
}
/** the pages a GitHub target's folder holds now (one tree read) → Map(slug → path) */
export async function githubFolderPages({ target, key, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  const api = testBase ?? "https://api.github.com", send = caller({ target, fetchImpl, allowLocal }), folder = String(target.folder ?? "").replace(/^\/+|\/+$/g, "");
  const t = await send(`${api}/repos/${target.repo}/git/trees/${encodeURIComponent(target.branch)}?recursive=1`, { method: "GET", headers: ghHeaders(key) }, 60000);
  if (!t.ok) return { ok: false, why: t.why, status: t.status };
  const re = new RegExp(`^${folder ? `${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/` : ""}([^/]+)/index\\.html$`), held = new Map();
  const shas = new Map(); for (const e of t.body?.tree ?? []) { const m = e.type === "blob" ? re.exec(e.path) : null; if (m) { held.set(m[1], e.path); if (e.sha) shas.set(e.path, e.sha); } }
  return { ok: true, held, shas, truncated: t.body?.truncated === true };
}
/** 🔴 RR-384: what the mirror writes for a rewrite, and Git's own name for that content (sha1 of "blob <bytes>\0<content>"): a file whose
 *  name on the branch is already this one is equal, so a second press changes nothing */
export const mirrorContent = (f) => asPublishedGuarded(f.html, f.url);
export const gitBlobSha = (text) => { const b = Buffer.from(String(text), "utf8"); return createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex"); };
export const notYetEqual = (rewrite, shas) => rewrite.filter((x) => shas?.get(x.path) !== gitBlobSha(mirrorContent(x)));
/** is a page file on the site indexable while it shows fewer than 6 real Q&A (a ready page written before the RR-383 guard)? */
export const unsafeIndexable = (text) => { const t = String(text ?? ""); return (visibleQa(t).length > 0 || checkedFeeRows(t) > 0) && indexCount(t) < REAL_QA_MIN && !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(t); };
/** 🔴 RR-385: a ready page's file says index where the guarded publish now says noindex, or the other way round (/oet-exam-price: noindex on the
 *  site, indexed now that its checked fee rows count) → it is written again */
const saysNoindex = (t) => /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(String(t ?? ""));
export const wrongIndexState = (fileText, item) => fileText != null && saysNoindex(fileText) !== saysNoindex(mirrorContent(item));
/** one file's text from the branch (GitHub's documented git/blobs answer: base64 content) → text, or null */
export async function githubBlobText({ target, key, sha, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  const api = testBase ?? "https://api.github.com", send = caller({ target, fetchImpl, allowLocal }), r = await send(`${api}/repos/${target.repo}/git/blobs/${sha}`, { method: "GET", headers: ghHeaders(key) });
  return r.ok && typeof r.body?.content === "string" ? Buffer.from(r.body.content, r.body.encoding === "base64" ? "base64" : "utf8").toString("utf8") : null;
}
/** the rewrites and removals as ONE commit (a removal is a tree entry with no content: sha null) */
export async function mirrorGithub({ target, key, rewrite = [], remove = [], fetchImpl = fetch, allowLocal = false, testBase = null }) {
  if (!rewrite.length && !remove.length) return { ok: true, rewritten: 0, removed: 0, commit: null };
  const api = testBase ?? "https://api.github.com", repo = `${api}/repos/${target.repo}`, gh = ghHeaders(key), send = caller({ target, fetchImpl, allowLocal }), post = (url, body, ms) => send(url, { method: "POST", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify(body) }, ms);
  const attempt = async () => {
    const ref = await send(`${repo}/git/ref/heads/${target.branch}`, { method: "GET", headers: gh }); if (!ref.ok) return ref;
    const head = ref.body?.object?.sha, base = await send(`${repo}/git/commits/${head}`, { method: "GET", headers: gh }); if (!base.ok) return base;
    const tree = await post(`${repo}/git/trees`, { base_tree: base.body?.tree?.sha, tree: [...rewrite.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: mirrorContent(f) })), ...remove.map((f) => ({ path: f.path, mode: "100644", type: "blob", sha: null }))] }, 120000); if (!tree.ok) return tree;
    const commit = await post(`${repo}/git/commits`, { message: `Mirror the app: rewrite ${rewrite.length} page${rewrite.length === 1 ? "" : "s"} (noindex), remove ${remove.length} (AlmiVisibility)`, tree: tree.body?.sha, parents: [head] }, 60000); if (!commit.ok) return commit;
    const up = await send(`${repo}/git/refs/heads/${target.branch}`, { method: "PATCH", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ sha: commit.body?.sha, force: false }) }); if (!up.ok) return up;
    if (!commit.body?.sha || up.body?.object?.sha !== commit.body.sha) return { ok: false, status: up.status, why: "GitHub answered without moving the branch. Nothing is counted as changed." };
    return { ok: true, commit: commit.body.sha };
  };
  let r = await attempt(); if (!r.ok && (r.status === 409 || r.status === 422)) r = await attempt();
  return r.ok ? { ok: true, rewritten: rewrite.length, removed: remove.length, commit: r.commit } : { ...clean(r), rewritten: 0, removed: 0 };
}
/** 🔴 RR-383 item 2: the site's own sitemap still lists pages marked noindex (the site's code must leave them out) → those addresses */
export const sitemapNoindexed = (sitemapXml, noindexUrls) => { const listed = new Set([...String(sitemapXml ?? "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/\/+$/, ""))); return [...noindexUrls].filter((u) => listed.has(String(u).replace(/\/+$/, ""))); };

/**
 * 🔴 RR-373 item 3 · TEST CONNECTION: the token, the repository, the branch, and the right to write, each said in plain words, and NOTHING written. The write check asks GitHub to make a branch from a commit that
 * cannot exist: a token that may write is answered 422 ("Object does not exist": seen on the real almi-oet, 5 Nov 2026, nothing made), one that may not is stopped before that, 403 or 404.
 */
export const NO_COMMIT = "0".repeat(40);
export async function testGithubConnection({ target, key, fetchImpl = fetch, allowLocal = false, testBase = null }) {
  const api = testBase ?? "https://api.github.com", repo = target?.repo ?? "your repository", branch = target?.branch ?? "main", rows = [], gh = ghHeaders(key), send = caller({ target, fetchImpl, allowLocal });
  const row = (check, ok, r, line) => { rows.push({ check, ok, status: r?.status ?? null, message: r?.ok ? null : r?.message || null, line }); return ok; };
  const done = (ok, line) => ({ ok, rows, line });
  if (!key) { row("token", false, null, "No token is saved. Paste it in Publish settings and press Save."); return done(false, rows[0].line); }
  if (/[^\x21-\x7e]/.test(key)) { row("token", false, null, "The saved token holds a hidden character. Copy it again from GitHub, paste it here and press Save."); return done(false, rows[0].line); }
  const rate = "GitHub's limit on how fast a token may call it was reached: your token is not the problem. Wait about an hour and test again.";
  const a = await send(`${api}/repos/${repo}`, { method: "GET", headers: gh });
  if (a.rate) { row("token", false, a, rate); return done(false, rate); }
  if (a.status === 0) { row("token", false, a, "GitHub did not answer from this computer. Check the internet connection and test again."); return done(false, rows[0].line); }
  if (a.status === 401) { row("token", false, a, "GitHub does not accept this token: it is wrong or has expired. Make a new one and paste it here."); return done(false, rows[0].line); }
  row("token", true, a, "GitHub accepts the token.");
  if (!a.ok) { row("repository", false, a, `The token cannot see ${repo}. Check the name (owner/name), or give the token access to that repository.`); return done(false, rows.at(-1).line); }
  row("repository", true, a, `The token can see ${repo}.`);
  const b = await send(`${api}/repos/${repo}/branches/${branch}`, { method: "GET", headers: gh });
  if (!b.ok) { if (b.rate) row("branch", false, b, rate); else row("branch", false, b, b.status === 404 ? `The branch "${branch}" does not exist in ${repo}. Check its name here in Publish settings.` : `GitHub would not show the branch "${branch}" (${b.status}).`); return done(false, rows.at(-1).line); }
  row("branch", true, b, `The branch "${branch}" is there.`);
  const w = await send(`${api}/repos/${repo}/git/refs`, { method: "POST", headers: { "content-type": "application/json", ...gh }, body: JSON.stringify({ ref: "refs/heads/almivisibility-access-check", sha: NO_COMMIT }) });
  if (w.status === 422) { row("write", true, w, `The token may write in ${repo}.${b.body?.protected ? ` But the branch "${branch}" is protected: GitHub may still refuse direct writes to it.` : ""} Nothing was written by this test.`); return done(true, "All good: the token, the repository, the branch and the right to write. Nothing was written."); }
  if (w.rate) { row("write", false, w, rate); return done(false, rate); }
  if (w.ok) { row("write", false, w, "GitHub gave an answer this test does not expect. Tell support."); return done(false, rows.at(-1).line); }
  row("write", false, w, `The token may read ${repo} but not write in it. On GitHub, open the token, under Repository access choose ${repo}, and give it "Contents: Read and write". Then test again.`);
  return done(false, rows.at(-1).line);
}
