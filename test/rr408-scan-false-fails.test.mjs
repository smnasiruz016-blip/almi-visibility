/**
 * 🔴 RR-408 Part B · THREE FALSE FAILS IN THE SITE SCAN (C:\Projects\_handoffs\VISIBILITY_SCAN_FALSE_POSITIVES_2026-11-09.md, beta-g by hand):
 *   B1 forbidden texts are matched inside ONE text block (almicv /learn/cv-europass: heading "What officialdom does not say" + paragraph
 *      "This is the part…" were joined and read as "does not say this");
 *   B2 the canonical check reads the INDEXABLE pages only (almicv /login, /signup, /forgot-password are noindex): noindex = "not needed";
 *   B3 the 404 rule looks for an ERROR MESSAGE, never the digits inside a longer number (AlmiSalary "৳1,404,000").
 * Each fix: the exact shape passes, the real fault still fails, and a sabotaged copy of the code (the fix reverted, in a temp folder;
 * the repository is never edited) turns the shape RED again.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanSite } from "../desktop/site-scan.mjs";
import { pageFaults, ERROR_404, textBlocks } from "../desktop/page-law.mjs";

const DESK = join(dirname(fileURLToPath(import.meta.url)), "..", "desktop");
const O = "https://site.example";
const head = (slug, { noindex = "", canonical = true, title = `Page ${slug}` } = {}) => `<head><title>${title}</title>${canonical ? `<link rel="canonical" href="${O}/${slug}">` : ""}${noindex ? `<meta name="robots" content="${noindex}">` : ""}</head>`;
const doc = (slug, body, o = {}) => `<!doctype html><html>${head(slug, o)}<body><main>${body}<a href="${O}/">Home</a></main></body></html>`;
/* a site of named pages; the sitemap lists only the indexable ones */
function site(pages) {
  const home = `<html><head><title>Home</title><link rel="canonical" href="${O}/"></head><body><main>${Object.keys(pages).map((s) => `<a href="/${s}">${s}</a>`).join("")}</main></body></html>`;
  const listed = Object.entries(pages).filter(([, h]) => !/name="robots" content="[^"]*noindex/.test(h)).map(([s]) => `<url><loc>${O}/${s}</loc></url>`).join("");
  return async (u) => { const p = new URL(u).pathname.replace(/^\/+|\/+$/g, ""); const ok = (b, ct = "text/html") => new Response(b, { status: 200, headers: { "content-type": ct } });
    if (p === "robots.txt") return ok(`User-agent: *\nAllow: /\nSitemap: ${O}/sitemap.xml\n`, "text/plain"); if (p === "sitemap.xml") return ok(`<urlset><url><loc>${O}/</loc></url>${listed}</urlset>`, "application/xml");
    if (p === "") return ok(home); return pages[p] ? ok(pages[p]) : new Response("nf", { status: 404, headers: { "content-type": "text/html" } }); };
}
const scanWith = (scan, pages) => scan({ origin: O, fetchImpl: site(pages), concurrency: 3 });
const rowOf = (s, key) => s.rows.find((r) => r.key === key);

/* the exact shapes beta-g found, and the faults that must still fail */
const EUROPASS = doc("learn/cv-europass", `<h2>What officialdom does not say</h2><p>This is the part worth slowing down for: the format says nothing about length.</p>`);
const REAL_PHRASE = doc("real-phrase", `<p>Its official page does not say this.</p>`);
const REAL_PHRASE_INLINE = doc("real-inline", `<p>Its official page does not <em>say</em> this.</p>`);
const LOGIN = doc("login", `<h1>Log in</h1><p>Your email</p>`, { noindex: "noindex", canonical: false });
const FORGOT = doc("forgot-password", `<h1>Forgot your password?</h1>`, { noindex: "noindex, nofollow", canonical: false });
const NO_CANONICAL = doc("guide", `<h1>A guide</h1><p>Read it.</p>`, { canonical: false });
const TAKA = doc("bangladesh", `<h1>Salaries in Bangladesh</h1><table><tr><td>Software engineer</td><td>৳1,404,000 a year</td></tr></table><p>Median ৳404,500; 1404 people asked.</p>`);
const NOT_FOUND = doc("gone", `<h1>404 – Page not found</h1><p>Try the home page.</p>`);
const NEXT_404 = doc("next-404", `<h1>404</h1><div><h2>This page could not be found.</h2></div>`);

test("B1 · a forbidden phrase is matched inside ONE text block: the cv-europass heading + paragraph pass; the phrase in one paragraph still fails", async () => {
  const s = await scanWith(scanSite, { "learn/cv-europass": EUROPASS, "real-phrase": REAL_PHRASE, "real-inline": REAL_PHRASE_INLINE });
  const fails = rowOf(s, "forbidden").all;
  assert.ok(!fails.some((x) => x.includes("cv-europass")), `the heading and the next paragraph are two blocks: ${JSON.stringify(fails)}`);
  assert.ok(fails.some((x) => x.startsWith(`${O}/real-phrase:`) && x.includes("does not say this")), "the phrase inside one paragraph still fails");
  assert.ok(fails.some((x) => x.startsWith(`${O}/real-inline:`)), "an inline tag (em) does not split a block");
  assert.deepEqual(textBlocks("<h2>What officialdom does not say</h2><p>This is <a href='#'>the part</a></p>"), ["What officialdom does not say", "This is the part"]);
  /* the publish gate reads the same blocks */
  assert.ok(!pageFaults(EUROPASS).some((f) => /forbidden/.test(f)), JSON.stringify(pageFaults(EUROPASS)));
  assert.ok(pageFaults(REAL_PHRASE).some((f) => /forbidden words \(\/\\bdoes not say this/.test(f)));
});

test("B2 · the canonical check reads indexable pages only: /login, /signup, /forgot-password show 'not needed (noindex)'; a real missing canonical still fails", async () => {
  const s = await scanWith(scanSite, { login: LOGIN, signup: LOGIN.replace(/login/g, "signup"), "forgot-password": FORGOT, "learn/cv-europass": EUROPASS });
  const c = rowOf(s, "canonical");
  assert.equal(c.ok, true, JSON.stringify(c.all)); assert.equal(c.count, 0);
  assert.deepEqual(c.notNeeded.sort(), [`${O}/forgot-password: not needed (noindex)`, `${O}/login: not needed (noindex)`, `${O}/signup: not needed (noindex)`]);
  const bad = rowOf(await scanWith(scanSite, { login: LOGIN, guide: NO_CANONICAL }), "canonical");
  assert.equal(bad.ok, false); assert.deepEqual(bad.all, [`${O}/guide: no canonical`], "an indexable page without a canonical still fails, and only it");
});

test("B3 · the 404 rule finds an error message, never digits inside a longer number", async () => {
  const s = await scanWith(scanSite, { bangladesh: TAKA, gone: NOT_FOUND, "next-404": NEXT_404 });
  const fails = rowOf(s, "forbidden").all;
  assert.ok(!fails.some((x) => x.includes("/bangladesh")), `৳1,404,000 is a number, not an error: ${JSON.stringify(fails)}`);
  assert.ok(fails.some((x) => x.startsWith(`${O}/gone:`) && x.includes("a 404 error message")), "\"404 – Page not found\" still fails");
  assert.ok(fails.some((x) => x.startsWith(`${O}/next-404:`)), "a heading that says only 404 still fails");
  for (const t of ["404 – Page not found", "404 Not Found", "Error 404", "404 | This page could not be found.", "HTTP 404", "Page not found (404)", "404 error", "404"]) assert.ok(ERROR_404.test(t), `must fail: ${t}`);
  for (const t of ["৳1,404,000", "৳1,404,000 a year", "1404 people", "404,500", "4.404", "Room 404 is on the left", "the 404 bus", "$12,404"]) assert.ok(!ERROR_404.test(t), `must pass: ${t}`);
});

/* sabotage: a copy of page-law.mjs + site-scan.mjs in a temp folder with ONE fix reverted (the rest imported from the repository) */
async function sabotaged(name, edits) {
  const dir = mkdtempSync(join(tmpdir(), `rr408-${name}-`));
  try {
    let law = readFileSync(join(DESK, "page-law.mjs"), "utf8").replace('from "./empty-answers.mjs"', `from ${JSON.stringify(pathToFileURL(join(DESK, "empty-answers.mjs")).href)}`);
    let scan = readFileSync(join(DESK, "site-scan.mjs"), "utf8");
    for (const [file, from, to] of edits) { const src = file === "law" ? law : scan; assert.ok(src.includes(from), `sabotage ${name}: the line to revert must exist (else the sabotage proves nothing): ${from.slice(0, 60)}`); if (file === "law") law = src.replace(from, to); else scan = src.replace(from, to); }
    writeFileSync(join(dir, "page-law.mjs"), law); writeFileSync(join(dir, "site-scan.mjs"), scan);
    return (await import(pathToFileURL(join(dir, "site-scan.mjs")).href)).scanSite;
  } finally { /* the module is loaded; the folder can go */ rmSync(dir, { recursive: true, force: true }); }
}

test("SABOTAGE · each fix reverted turns its shape RED; the real code is GREEN on the same shapes", async () => {
  const shapes = { "learn/cv-europass": EUROPASS, login: LOGIN, "forgot-password": FORGOT, bangladesh: TAKA };
  const green = await scanWith(scanSite, shapes);
  assert.equal(rowOf(green, "forbidden").ok, true, JSON.stringify(rowOf(green, "forbidden").all)); assert.equal(rowOf(green, "canonical").ok, true);

  const b1 = await sabotaged("b1", [["scan", "const forbiddenIn = (html) => forbiddenInBlocks([...textBlocks(mainOf(html), decode), ...faqData(html).flatMap((x) => [x.q, x.a])]);", "const forbiddenIn = (html) => forbiddenInBlocks([`${text(mainOf(html))} ${faqData(html).map((x) => `${x.q} ${x.a}`).join(\" \")}`]);"]]);
  const r1 = rowOf(await scanWith(b1, shapes), "forbidden"); assert.equal(r1.ok, false, "B1 reverted: RED"); assert.ok(r1.all.some((x) => x.includes("cv-europass") && x.includes("does not say this")), `RED for the right reason: ${JSON.stringify(r1.all)}`);

  const b2 = await sabotaged("b2", [["scan", 'row("canonical", indexable.map((p) =>', 'row("canonical", htmlPages.map((p) =>']]);
  const r2 = rowOf(await scanWith(b2, shapes), "canonical"); assert.equal(r2.ok, false, "B2 reverted: RED"); assert.deepEqual(r2.all.sort(), [`${O}/forgot-password: no canonical`, `${O}/login: no canonical`], "RED for the right reason");

  const b3 = await sabotaged("b3", [["law", "ERROR_404, /\\bwork note\\b/i", "/\\b404\\b/, /\\bwork note\\b/i"]]);
  const r3 = rowOf(await scanWith(b3, shapes), "forbidden"); assert.equal(r3.ok, false, "B3 reverted: RED"); assert.deepEqual(r3.all, [`${O}/bangladesh: /\\b404\\b/`], "RED for the right reason");

  const back = await scanWith(scanSite, shapes); assert.equal(rowOf(back, "forbidden").ok, true); assert.equal(rowOf(back, "canonical").ok, true, "GREEN again");
});
