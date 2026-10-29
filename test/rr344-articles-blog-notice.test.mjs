/**
 * RR-344 (owner decisions, 29 Oct 2026) · WHERE ARTICLES GO + THE DAILY NOTICE.
 *   A · AlmiWorld's own: the owner's Approve publishes the article on the almiworld.com blog (WordPress REST, an application password in
 *       Vercel — never shown); the LinkedIn and Facebook posts to copy; /owner's line "Today's article: …".
 *   B · the app: "Where should your articles go?", today's notice, the export — pure parts here; the app's own run in
 *       test/rr308-clear-advice-publish.test.mjs "D IN THE APP".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createApp } from "../site/app.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { publishToWordPress, wpContent, socialPosts, todayArticle, WP_KEYS } from "../site/wp-publish.mjs";
import { articleHtml } from "../site/articles.mjs";
import { ARTICLE_DEST, destOf, publishRefusal, todayNotice, markdownOf, EMAIL_SUMMARY } from "../desktop/article-dest.mjs";

const ON = "2026-10-29", T0 = Date.parse(`${ON}T12:00:00Z`), APP_PW = "abcd EFGH ijkl MNOP qrst UVWX";
const WP_ENV = { [WP_KEYS.user]: "nasir", [WP_KEYS.password]: APP_PW, [WP_KEYS.category]: "Blog" };
const DRAFT = { id: "answer|oet|home", product: "oet", kind: "answer", title: "Can I take OET at home?", outline: ["The answer"], links: [{ href: "https://almioet.almiworld.com/", text: "AlmiOET" }],
  blocks: [{ heading: "The answer", text: "Yes. OET@Home is offered in countries where a test venue is not yet available. Check OET's own page first.", label: "official", source: { url: "https://oet.com/test/oet-test-at-home", title: "OET@Home", on: ON } }] };
function fakeWp({ fail = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : null; calls.push({ url: u.href, method: init.method ?? "GET", auth: init.headers?.authorization, body });
    const json = (status, o) => ({ ok: status < 300, status, json: async () => o });
    if (fail) return json(fail, { code: "rest_cannot_create" });
    if (u.pathname === "/wp-json/wp/v2/categories") return json(200, [{ id: 7, name: "Blog" }, { id: 8, name: "Blogging tips" }]);
    if (u.pathname === "/wp-json/wp/v2/tags" && !init.method) return json(200, []);
    if (u.pathname === "/wp-json/wp/v2/tags") return json(201, { id: 31, name: body.name });
    if (u.pathname === "/wp-json/wp/v2/posts") return json(201, { id: 501, link: "https://almiworld.com/can-i-take-oet-at-home/" });
    return json(404, {});
  };
  return { calls, fetchImpl };
}

test("RR-344 A1 · publishToWordPress: the post on almiworld.com's own /wp-json/ only, signed in with the application password; the category found by its name (none made), the product's tag found or made; a refusal says why without the key", async () => {
  const W = fakeWp(), html = articleHtml(DRAFT);
  const r = await publishToWordPress({ env: WP_ENV, fetchImpl: W.fetchImpl, article: DRAFT, html, tagName: "AlmiOET" });
  assert.deepEqual(r, { ok: true, id: 501, link: "https://almiworld.com/can-i-take-oet-at-home/" });
  assert.ok(W.calls.every((c) => c.url.startsWith("https://almiworld.com/wp-json/wp/v2/")), "the key goes to the blog's own address only");
  assert.ok(W.calls.every((c) => c.auth === `Basic ${Buffer.from(`nasir:${APP_PW.replace(/\s+/g, "")}`).toString("base64")}`));
  const post = W.calls.find((c) => c.url.endsWith("/posts"));
  assert.deepEqual([post.method, post.body.status, post.body.title, post.body.categories, post.body.tags], ["POST", "publish", DRAFT.title, [7], [31]]);
  assert.ok(!post.body.content.includes("<h1>") && post.body.content.includes("https://almioet.almiworld.com/"), "no second title; the link back to the product");
  assert.equal(wpContent("<article><h1>T</h1><p>x</p></article>"), "<article><p>x</p></article>");
  const no = await publishToWordPress({ env: WP_ENV, fetchImpl: fakeWp({ fail: 401 }).fetchImpl, article: DRAFT, html });
  assert.deepEqual(no, { ok: false, why: "WordPress refused the sign-in — check the user name and the application password in Vercel" });
  assert.match((await publishToWordPress({ env: {}, article: DRAFT, html })).why, /^the blog is not connected yet \(ALMIWORLD_WP_USER and ALMIWORLD_WP_APP_PASSWORD in Vercel\)$/);
  assert.equal((await publishToWordPress({ env: { ...WP_ENV, [WP_KEYS.url]: "http://almiworld.com" }, article: DRAFT, html })).ok, false, "never over plain http");
});

test("RR-344 A2 + A3 · the posts to copy (2–3 lines + the blog link); the daily line: published · ready · none, and why", () => {
  const [li, fb] = socialPosts({ article: { title: DRAFT.title, body: DRAFT }, link: "https://almiworld.com/x/" });
  assert.deepEqual([li.network, fb.network], ["LinkedIn", "Facebook"]);
  assert.equal(li.text, "Can I take OET at home?\n\nYes.\n\nRead it on the AlmiWorld blog: https://almiworld.com/x/");
  assert.ok(fb.text.endsWith("\nhttps://almiworld.com/x/") && fb.text.split("\n").length <= 3);
  const judged = { judgements: [{ name: "engaging", verdict: "PASS" }, { name: "hookable", verdict: "PASS" }] };
  assert.equal(todayArticle({ articles: [{ status: "approved", body: { published: { on: ON, link: "https://almiworld.com/x/" } } }], today: ON }).line, "published: https://almiworld.com/x/");
  assert.equal(todayArticle({ articles: [], today: ON, aiOn: false }).line, "none today — the AI is not connected (ANTHROPIC_API_KEY), so no article is written");
  assert.match(todayArticle({ articles: [{ status: "draft", body: { ...DRAFT } }], today: ON, aiOn: true }).line, /^none today — 1 draft waits? for the AI judge or did not pass the quality check$|^none today — 1 draft wait for the AI judge/);
  const ready = todayArticle({ articles: [{ status: "draft", body: { ...DRAFT, judged } }], today: ON, aiOn: true, blogOn: true });
  assert.ok(["ready", "none"].includes(ready.state));
});

test("RR-344 A · THE SITE: Approve publishes on the blog once — its link, the two posts with Copy buttons (the site's own script), /owner's line; without the blog's keys Approve keeps it and says why; a GET of /owner/articles/publish goes back", async () => {
  const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij", m = new Map();
  const kvFetch = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } return { result: 1 }; }) });
  const run = async (env, W) => {
    const cf = cfMemoryStore(); await cf.putArticle({ id: DRAFT.id, product: "oet", kind: "answer", title: DRAFT.title, body: DRAFT }, { at: `${ON}T10:00:00Z` });
    const app = createApp({ mode: "sales", env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t-kv-0000000000", OWNER_ACCESS_KEY: OWNER_KEY, ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", ...env }, kvFetch, kwStore: memoryStore(), cfStore: cf, cfReader: { read: async () => ({ ok: false }), requests: () => 0 }, cfAi: async () => ({ ok: false, why: "x" }), now: () => T0, wpFetch: W.fetchImpl, fetchImpl: async () => new Response("", { status: 404 }) });
    const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
    const req = (p, form = null) => fetch(base + p, { method: form ? "POST" : "GET", redirect: "manual", headers: { cookie, ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: form ? new URLSearchParams(form) : undefined }).then(async (r) => ({ status: r.status, location: r.headers.get("location"), type: r.headers.get("content-type"), text: await r.text() }));
    return { cf, req, close: () => new Promise((r) => srv.close(r)) };
  };
  const W = fakeWp(), A = await run(WP_ENV, W);
  try {
    const ok = await A.req("/owner/articles/decide", { id: DRAFT.id, action: "approve" });
    assert.equal(ok.status, 200); assert.match(ok.text, /Approved and published on the blog: https:\/\/almiworld\.com\/can-i-take-oet-at-home\//);
    assert.match(ok.text, /<p class="ok" data-published>On the blog: <a href="https:\/\/almiworld\.com\/can-i-take-oet-at-home\/">/);
    assert.match(ok.text, /<b>LinkedIn<\/b> <button class="pill ghost" type="button" data-copy="post-answer\|oet\|home-0">Copy<\/button><\/p><textarea id="post-answer\|oet\|home-0" readonly/);
    assert.match(ok.text, /<b>Facebook<\/b>/); assert.match(ok.text, /<script src="\/copy\.js" defer><\/script>/);
    assert.ok(!ok.text.includes(APP_PW) && !ok.text.includes(APP_PW.replace(/\s+/g, "")), "the application password in a page");
    const js = await A.req("/copy.js"); assert.equal(js.status, 200); assert.match(js.type, /^text\/javascript/); assert.match(js.text, /data-copy/);
    const n = W.calls.length; assert.match((await A.req("/owner/articles/publish", { id: DRAFT.id })).text, /Already on the blog: https:\/\/almiworld\.com\/can-i-take-oet-at-home\//); assert.equal(W.calls.length, n, "published once");
    assert.equal((await A.cf.articles())[0].body.published.link, "https://almiworld.com/can-i-take-oet-at-home/");
    assert.match((await A.req("/owner")).text, /<p class="card" data-today-article="published"><b>Today's article:<\/b> published: <a href="https:\/\/almiworld\.com\/can-i-take-oet-at-home\/">/);
    assert.deepEqual([(await A.req("/owner/articles/publish")).status, (await A.req("/owner/articles/publish")).location], [303, "/owner/articles"]);
  } finally { await A.close(); }
  const W2 = fakeWp(), B = await run({}, W2);
  try {
    const kept = await B.req("/owner/articles/decide", { id: DRAFT.id, action: "approve" });
    assert.match(kept.text, /Approved — not published: the blog is not connected yet \(ALMIWORLD_WP_USER and ALMIWORLD_WP_APP_PASSWORD in Vercel, then deploy\)\./);
    assert.match(kept.text, /<button class="pill alt" type="submit">Publish on the blog<\/button>/); assert.equal(W2.calls.length, 0);
    assert.match((await B.req("/owner")).text, /data-today-article="none"><b>Today's article:<\/b> none today — /);
  } finally { await B.close(); }
});

test("RR-344 B · the app's choices: where the articles go (only my site publishes; fully automatic only by choice), today's notice, the Markdown export; e-mail is \"coming soon\", never a promise", () => {
  assert.deepEqual(Object.keys(ARTICLE_DEST), ["site-approve", "site-auto", "export", "social", "drafts"]);
  assert.deepEqual(Object.entries(ARTICLE_DEST).filter(([, v]) => v.mode === "AUTO_AFTER_GATES").map(([k]) => k), ["site-auto"]);
  assert.equal(destOf(null, "AUTO_AFTER_GATES"), "site-auto"); assert.equal(destOf(null, "REVIEW_FIRST"), "site-approve"); assert.equal(destOf({ go: "social" }, "AUTO_AFTER_GATES"), "social");
  for (const k of ["export", "social", "drafts"]) assert.match(publishRefusal(k), /nothing is published/); for (const k of ["site-approve", "site-auto"]) assert.equal(publishRefusal(k), null);
  assert.deepEqual(todayNotice({ go: "site-approve", today: null, none: "you paused articles (0 a day, in Settings)" }), { state: "none", line: "No article today — you paused articles (0 a day, in Settings)" });
  assert.equal(todayNotice({ go: "site-approve", today: { url: "https://x.example/a/" }, connected: true }).line, "Today's article is ready — review and approve");
  assert.equal(todayNotice({ go: "social", today: { url: "https://x.example/a/" } }).line, "Today's article is ready — review it, then copy its LinkedIn and Facebook posts");
  assert.deepEqual(todayNotice({ go: "site-auto", today: { url: "https://x.example/a/" }, live: [{ url: "https://x.example/a/", state: "LIVE", live: "https://x.example/a/" }] }).line, "Published: https://x.example/a/");
  assert.equal(markdownOf('<h1>Title</h1><p>One &amp; two <a href="https://x.example/">link</a>.</p><ul><li>a</li><li>b</li></ul>'), "# Title\n\nOne & two [link](https://x.example/).\n\n- a\n- b\n");
  assert.equal(EMAIL_SUMMARY.state, "coming soon");
  /* the app's screen: the dashboard line, the notification only when the client allows it, the card's choices and exports */
  const ui = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  for (const s of ['data-today="${esc(p.id)}"', "Notification.requestPermission()", "Tell me with a Windows notification when today's article is ready", "A daily or weekly e-mail summary — coming soon", "<h4>Where should your articles go?</h4>", "&format=md", "Your LinkedIn and Facebook posts are ready"]) assert.ok(ui.includes(s), s);
  assert.ok(!ui.includes("It stays a draft: Visibility has no connection to your site in this version."), "the old line is gone");
});
