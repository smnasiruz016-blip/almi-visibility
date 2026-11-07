/**
 * RR-387 PART D (owner, 7 Nov 06:20: "once the product is complete, it must not need beta-g"): ONE Issues list per product, every outside
 * error in the service's own words with its one fix, the money warning once, a bug report with no secret — and THE beta-g TEST: everything
 * beta-g found by hand on 7 Nov (notes items 2, 4, 5, 10, 14, 15) the app finds itself. Nothing leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findIssues, explainOutside, issuesMerge, bugReport, issuesWeek, WHO } from "../desktop/issues.mjs";
import { scanSite } from "../desktop/site-scan.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
/* a small live site as beta-g saw it on 7 Nov: an app page with a newer "Last checked", the site's own guide too, /login indexable and in no sitemap */
const appPage = (slug, last = "2026-11-06") => `<html><head><title>${slug}</title><link rel="canonical" href="https://ex.com/${slug}"></head><body><main><p class="checked" data-last-checked="${last}">Last checked ${last}</p><details data-need-id="q"><summary>Q?</summary><p>A. <a class="src" href="https://s.example/x">S</a><span class="src"> · checked 2026-10-31</span></p></details></main></body></html>`;
const site = { "/": '<html><head><title>Home</title><link rel="canonical" href="https://ex.com/"></head><body><main><a href="/a">a</a><a href="/guides/g">g</a><a href="/login">Log in</a></main></body></html>', "/a": appPage("a"), "/guides/g": appPage("guides/g", "2026-10-16").replace("checked 2026-10-31", "checked 2026-10-14"), "/login": '<html><head><title>Log in</title><link rel="canonical" href="https://ex.com/login"></head><body><main>Log in</main></body></html>' };
const fetchImpl = async (u) => { const p = new URL(u).pathname.replace(/\/+$/, "") || "/"; if (p === "/robots.txt") return new Response("User-agent: *\nAllow: /\nSitemap: https://ex.com/sitemap.xml\n", { status: 200, headers: { "content-type": "text/plain" } }); if (p === "/sitemap.xml") return new Response("<urlset><url><loc>https://ex.com/</loc></url><url><loc>https://ex.com/a</loc></url><url><loc>https://ex.com/guides/g</loc></url></urlset>", { status: 200, headers: { "content-type": "application/xml" } }); return site[p] ? new Response(site[p], { status: 200, headers: { "content-type": "text/html" } }) : new Response("nf", { status: 404, headers: { "content-type": "text/html" } }); };

test("1 · THE beta-g TEST: the 'Last checked' dates (app pages: the app fixes them; the site's guides: a developer, bug report ready), /login open to Google, the count that does not match, Search Console with Google's own reason", async () => {
  const scan = await scanSite({ origin: "https://ex.com", pages: ["https://ex.com/a"], fetchImpl, concurrency: 2 });
  const list = findIssues({ scan, appPages: new Set(["https://ex.com/a"]), counts: { inSitemap: 36, forGoogle: 45 }, google: { connected: false, signedIn: false, lastError: "Google said: The provided client secret is invalid (401)." } });
  const by = (re) => list.find((x) => re.test(x.what));
  assert.equal(by(/"Last checked": 1 of the app's pages/)?.who, WHO.NEXT, "beta-g item 10, the app's pages: the app writes them again");
  const g = by(/"Last checked": 1 page of your site's own code/); assert.equal(g?.who, WHO.DEV); assert.equal(g.bug, true, "the site's own guide: only code can fix it → a bug report");
  assert.equal(by(/sign-in or account page is open to Google/)?.where, "https://ex.com/login", "beta-g item 15");
  assert.match(by(/live sitemap lists 36/)?.what ?? "", /the app holds 45 for Google/, "beta-g items 4 + 9: one count, the mismatch said");
  const sc = list.find((x) => x.source === "Google"); assert.match(sc.what, /^Google said: The provided client secret is invalid/); assert.match(sc.step, /make a new one in Google Cloud → Credentials → your Desktop client → Add secret/); assert.equal(sc.who, WHO.YOU, "beta-g items 13 + 14");
  /* beta-g items 2 + 5 were app bugs fixed in RR-386 and are pinned here: the home is tested once; the sitemap warning names only pages the app wrote */
  const jobs = readFileSync(join(REPO, "desktop", "seo-jobs.mjs"), "utf8"), main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.match(jobs, /one address per page \(the home was tested twice/); assert.match(main, /an existing page the app only improved keeps its own robots line/);
});

test("2 · D2 OUTSIDE ERRORS: the service's own words, then ONE fix — Google, Bing, GitHub, Vercel, DataForSEO, Anthropic; never a secret", () => {
  const cases = [["Google", 401, "The provided client secret is invalid", /Add secret/], ["Google", 400, "invalid_grant: Token has been expired or revoked.", /sign in again/], ["Google", 403, "insufficient permission: scope", /tick the box/], ["Google", 0, "access_denied: this app hasn't verified", /Advanced → Continue|own Google client/],
    ["Bing", 403, "key file not found", /IndexNow key file/], ["GitHub", 401, "Bad credentials", /new fine-grained token/], ["GitHub", 403, "Protected branch: required status checks", /branch protection/], ["GitHub", 404, "Not Found", /repository name and branch/],
    ["Vercel", 401, "protected by SSO", /Protection Bypass for Automation/], ["Vercel", 0, "The preview did not build (failure).", /did not build/], ["DataForSEO", 402, "insufficient balance", /top it up/], ["DataForSEO", 401, "login failed", /API login and password/],
    ["Anthropic", 401, "invalid x-api-key", /new key in the Anthropic console/], ["Anthropic", 402, "credit balance is too low", /add credit/], ["Anthropic", 429, "rate limit", /slow down/]];
  for (const [svc, s, t, re] of cases) { const e = explainOutside(svc, s, t); assert.match(e.fix, re, `${svc} ${s}`); assert.ok(e.exact.startsWith(`${svc} said: `), "the exact words first"); }
  assert.doesNotMatch(bugReport({ issue: { what: "x", where: "https://ex.com/a", source: "scan", sample: ["token sk-ant-api03-SECRETSECRET and ghp_SECRETSECRETSECRET at https://ex.com/a?key=abc123"] }, version: "1.15.44", product: "P" }), /sk-ant-api03-SECRET|ghp_SECRET|key=abc123/, "D4: no secret in a bug report");
});

test("3 · D1 + D3: dates found and fixed; the money warning ONCE, never a raise; the week says only what changed and what needs the owner", () => {
  const a = findIssues({ budget: { left: 1.2 }, nextCycleUsd: 3.4, now: Date.parse("2026-11-20") });
  assert.equal(a.length, 1); assert.equal(a[0].what, "Next cycle about $3.40, left $1.20. The rest waits for 2026-12-01."); assert.doesNotMatch(a[0].what + (a[0].step ?? ""), /raise|increase/i);
  const l1 = issuesMerge([], a, "2026-11-20"), l2 = issuesMerge(l1, a, "2026-11-21"); assert.equal(l2.filter((x) => !x.fixed).length, 1, "said once, not again each day"); assert.equal(l2[0].found, "2026-11-20");
  const l3 = issuesMerge(l2, [], "2026-11-22"); assert.equal(l3[0].fixed, "2026-11-22"); assert.equal(l3[0].who, WHO.FIXED);
  const wk = issuesWeek([...l3, { id: "y", what: "Search Console is not connected", who: WHO.YOU, step: "Press Connect", found: "2026-11-21", fixed: null }], "2026-11-18"); assert.match(wk, /1 fixed this week, 1 new/); assert.match(wk, /Needs you: Search Console is not connected — Press Connect/);
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /writeFileSync\(pfile\(id, join\(BUG_DIR, name\)\), bugReport\(/, "D4: the bug report file in the product folder"); assert.match(main, /issuesWeek\(list,/); assert.match(ui, /issuesCard\(pid\); \/\/ RR-387 PART D: the one Issues list, on Home/);
});
