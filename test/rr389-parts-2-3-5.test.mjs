/**
 * RR-389 PART 2 (one upload button; every action big and clear; no "check the official page"), PART 3 (the preview branch remade by the app;
 * AlmiVisibility's own site says who it is, with a description on every page; the Issues list names a product whose autopilot runs only
 * while the app is open) and PART 5 (guidance: the guided setup, the next step on every screen, help beside every field that needs outside
 * knowledge, every refusal with its fix, the Guide's names are the UI's, expiry warnings).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { ensurePreviewBranch, publishPagesGithub, testGithubConnection } from "../desktop/publish.mjs";
import { findIssues, WHO } from "../desktop/issues.mjs";
import { setupSteps, refusalFix, SETUP_STEPS } from "../desktop/setup-guide.mjs";
import { ctaFrom } from "../desktop/setup.mjs";
import { frame, fitDescription, siteLd, ORG, PLANS } from "../site/pages.mjs";
import { GUIDES } from "../desktop/guides.mjs";

const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");

test("Part 2.1 · ONE button for every kind of file, on the Pages tab and the Data screen, never 'not a facts file'", () => {
  assert.match(UI, /const ADD_FILE_ACCEPT = "\.json,application\/json,\.odt,\.docx,\.txt,\.md";/);
  assert.match(UI, /<button class="big alt" id="ffile">Add research or facts file<\/button><\/p><div id="addfilebox"><\/div>/, "always on the Pages tab, not in a fold");
  assert.match(UI, /<div id="addfiledata"><\/div>/); assert.match(UI, /addFileBox\(\$\("#addfiledata"\)\);/, "on the Data screen");
  assert.match(UI, /if \(\/\\\.\(\?:odt\|docx\|txt\|md\)\$\/i\.test\(f\.name\)\)[^\n]*research\/document/, "a document goes to the research route");
  assert.match(UI, /if \(Array\.isArray\(j\?\.countries\)\) \{ const r = await post\(`\/api\/products\/\$\{id\}\/facts-file`/, "a facts file to the facts route");
  assert.match(UI, /councils\/browser`, j\)/, "the file your AI wrote to its own route");
  assert.doesNotMatch(UI.slice(UI.indexOf("async function addAnyFile"), UI.indexOf("function addFileBox")), /not a facts file/);
});

test("Part 2.2 · every action is big and found without opening a fold: no <details> holds a button closed; the server button beside the switch says its state", () => {
  const closed = [...UI.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].filter((m) => /<button\b/.test(m[2]) && !/\bopen\b/.test(m[1]));
  assert.equal(closed.length, 0, closed.map((m) => m[2].slice(0, 80)).join(" | "));
  assert.match(UI, /button\{font:inherit;font-weight:700;font-size:16px;min-height:46px;padding:12px 22px;/);
  assert.match(UI, /data-apserver>\$\{srv \? "Runs with your PC off ✓" : "Turn on our server"\}<\/button> <span class="meta" data-apsrvstate>\$\{srv \? "Runs with your PC off ✓" : "Only while this app is open"\}/);
  assert.match(UI, /<details class="more" id="apwrap" open>/);
  assert.doesNotMatch(UI, /<a href="#" id="chgappr">/, "no action as a small text link");
});

test("Part 2.3 · no 'check the official page' anywhere a customer or the owner reads it: unproved facts are hidden", () => {
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), lp = readFileSync(new URL("../desktop/local-pages.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(UI, /show only "check the official page"|"check the official page" with its link/);
  assert.doesNotMatch(main.slice(main.indexOf('r[2] === "facts-file" && req.method === "POST"'), main.indexOf('r[2] === "facts-file" && req.method === "POST"') + 1600), /show only "check the official page"/);
  assert.doesNotMatch(lp, /heading: "Check on the official page"/);
});

/* a stand-in GitHub: the preview branch was deleted after a go-live merge */
function standInGithub({ previewExists = false } = {}) {
  const calls = [], refs = new Map([["main", "a".repeat(40)]]); if (previewExists) refs.set("visibility-pages", "b".repeat(40));
  const s = createServer((req, res) => { let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => { calls.push(`${req.method} ${req.url}`); const send = (code, j) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(j)); };
    const m = /^\/repos\/o\/r(\/.*)?$/.exec(req.url.split("?")[0]); if (!m) return send(404, { message: "Not Found" }); const p = m[1] ?? "";
    if (p === "" && req.method === "GET") return send(200, { default_branch: "main" });
    const ref = /^\/git\/ref\/heads\/(.+)$/.exec(p); if (ref && req.method === "GET") return refs.has(ref[1]) ? send(200, { object: { sha: refs.get(ref[1]) } }) : send(404, { message: "Not Found" });
    if (p === "/git/refs" && req.method === "POST") { const j = JSON.parse(body); const name = j.ref.replace("refs/heads/", ""); if (refs.has(name)) return send(422, { message: "Reference already exists" }); refs.set(name, j.sha); return send(201, { ref: j.ref, object: { sha: j.sha } }); }
    if (/^\/git\/commits\//.test(p) && req.method === "GET") return send(200, { tree: { sha: "t".repeat(40) } });
    if (p === "/git/trees" && req.method === "POST") return send(201, { sha: "u".repeat(40) });
    if (p === "/git/commits" && req.method === "POST") return send(201, { sha: "c".repeat(40) });
    const up = /^\/git\/refs\/heads\/(.+)$/.exec(p); if (up && req.method === "PATCH") { refs.set(up[1], "c".repeat(40)); return send(200, { object: { sha: "c".repeat(40) } }); }
    send(404, { message: "Not Found" }); }); });
  return { s, calls, refs };
}
test("Part 3.1 · the preview branch was deleted after a go-live merge: the app makes it again from production, by itself, writes the pages, and says so once; main is never touched; no repo setting is changed", async () => {
  const g = standInGithub(); await new Promise((r) => g.s.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${g.s.address().port}`;
  try {
    const target = { kind: "github", repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://example.org" };
    const r = await publishPagesGithub({ drafts: [{ url: "https://example.org/a", html: '<!doctype html><html><head><title>A</title><meta name="robots" content="noindex, nofollow"></head><body><main><p data-cta><a href="/x">Go</a></p></main></body></html>' }], target, key: "k", allowLocal: true, testBase: base });
    assert.equal(r.ok, true, JSON.stringify(r)); assert.deepEqual(r.branchMade && { created: r.branchMade.created, from: r.branchMade.from, branch: r.branchMade.branch }, { created: true, from: "main", branch: "visibility-pages" });
    assert.equal(g.refs.get("main"), "a".repeat(40), "production untouched"); assert.equal(g.refs.get("visibility-pages"), "c".repeat(40), "the pages went to the remade preview branch");
    assert.ok(!g.calls.some((c) => /PATCH \/repos\/o\/r($|\?)|\/settings|delete_branch_on_merge/.test(c)), "no repository setting is changed");
    const again = await ensurePreviewBranch({ target, key: "k", allowLocal: true, testBase: base }); assert.deepEqual(again, { ok: true, created: false }, "there now: nothing made");
    const prod = await ensurePreviewBranch({ target: { ...target, branch: "main" }, key: "k", allowLocal: true, testBase: base }); assert.deepEqual(prod, { ok: true, created: false }, "a production target is never made or touched");
    const n0 = g.calls.length, gone = await ensurePreviewBranch({ target: { ...target, branch: "production" }, key: "k", allowLocal: true, testBase: base }); assert.deepEqual(gone, { ok: true, created: false }, "a missing production branch is never made"); assert.equal(g.calls.length, n0, "not even asked about"); assert.equal(g.refs.has("production"), false);
    const iss = findIssues({ branchMade: { on: "2026-11-07T18:02:00Z", branch: "visibility-pages", from: "main" } }).find((x) => x.source === "publish"); assert.equal(iss?.who, WHO.FIXED); assert.match(iss.what, /preview branch "visibility-pages" was missing.*made it again from "main"/);
  } finally { g.s.close(); }
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.equal((main.match(/branchMadeNote\(id, [rf]\.branchMade\)/g) ?? []).length, 3, "every publish and mirror path records it");
});

test("Part 3.2 · AlmiVisibility's own site: Organization with sameAs and SoftwareApplication with the real offer on every page; a description of 50–170 characters on every page; none on a noindex page's markup", () => {
  const html = frame({ path: "/x", title: "T", description: "Short.", body: "<p>x</p>" }), ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  const org = ld["@graph"].find((x) => x["@type"] === "Organization"), app = ld["@graph"].find((x) => x["@type"] === "SoftwareApplication");
  assert.deepEqual(org.sameAs, [...ORG.sameAs]); assert.equal(org.name, "AlmiWorld");
  assert.deepEqual(app.offers.map((o) => Number(o.price)), PLANS.map((p) => p.price), "the offer IS the pricing page's list");
  const d = /<meta name="description" content="([^"]*)">/.exec(html)[1]; assert.ok(d.length >= 50 && d.length <= 170, d);
  for (const t of ["x".repeat(10), "A sentence. ".repeat(30), "word ".repeat(60)]) { const f = fitDescription(t); assert.ok(f.length >= 50 && f.length <= 170, `${f.length}: ${f}`); }
  assert.doesNotMatch(frame({ path: "/y", title: "T", description: "d".repeat(80), body: "", noindex: true }), /SoftwareApplication/);
  assert.match(siteLd(), /"@type":"Organization"/);
});

test("Part 3.3 + 5 · the Issues list: autopilot only while the app is open → the one step; the offer button's words mixed up → the fix; a token that expires within 7 days → warned", () => {
  const a = findIssues({ autopilot: { on: true, server: false } }).find((x) => x.source === "autopilot"); assert.equal(a.who, WHO.YOU); assert.match(a.step, /Turn on our server/);
  assert.equal(findIssues({ autopilot: { on: true, server: true } }).some((x) => x.source === "autopilot"), false);
  assert.ok(findIssues({ cta: { label: "Get AlmiVisibility, link /pricing, subject SEO" } }).some((x) => x.source === "setup"));
  assert.equal(findIssues({ cta: { label: "Get AlmiVisibility" } }).some((x) => x.source === "setup"), false);
  const e = findIssues({ now: "2026-11-07T00:00:00Z", expiries: [{ name: "Your GitHub token", expires: "2026-11-12T00:00:00Z", where: "Publish settings" }, { name: "Far", expires: "2027-01-01T00:00:00Z" }] }).filter((x) => x.source === "expiry");
  assert.equal(e.length, 1); assert.match(e[0].what, /expires on 2026-11-12 \(in 5 days\)/);
  assert.match(ctaFrom({ ctaLabel: "Get AlmiVisibility, link /pricing, subject SEO", ctaHref: "https://almivisibility.almiworld.com" }).refused, /The button's words hold only what the button says/);
  assert.ok(ctaFrom({ ctaLabel: "Get AlmiVisibility", ctaHref: "https://almivisibility.almiworld.com/pricing" }).cta);
});

test("Part 5.6 · GitHub's own expiry header is read by Test connection and said", async () => {
  const s = createServer((req, res) => { res.writeHead(req.url.includes("/git/refs") ? 422 : 200, { "content-type": "application/json", "github-authentication-token-expiration": "2026-11-20 10:00:00 UTC" }); res.end(JSON.stringify({ message: "x" })); });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  try { const t = await testGithubConnection({ target: { kind: "github", repo: "o/r", branch: "visibility-pages", site: "https://example.org" }, key: "k", allowLocal: true, testBase: `http://127.0.0.1:${s.address().port}` }); assert.equal(t.ok, true); assert.equal(t.expires, "2026-11-20 10:00:00 UTC"); assert.match(t.rows[0].line, /expires on 2026-11-20: the app warns you 7 days before/); } finally { s.close(); }
});

test("Part 5.2 · the guided setup: each step done or not, the ONE next step is the first needed one not done, the research file is optional", () => {
  assert.deepEqual(SETUP_STEPS.map((x) => x.id), ["website", "searchData", "publish", "subject", "research", "autopilot"]);
  let g = setupSteps({}); assert.equal(g.next.id, "website"); assert.match(g.line, /^Next: add your product's website/);
  g = setupSteps({ site: "x", checked: true, bing: true, publishKind: "github", publishTested: false }); assert.equal(g.next.id, "publish", "publish set but not tested is not done");
  g = setupSteps({ site: "x", checked: true, searchConsole: true, publishKind: "github", publishTested: true, subject: "SEO", cta: { label: "Go" }, autopilot: true, server: false }); assert.equal(g.next.id, "autopilot");
  g = setupSteps({ site: "x", checked: true, searchConsole: true, publishKind: "github", publishTested: true, subject: "SEO", cta: { label: "Go" }, autopilot: true, server: true }); assert.equal(g.done, true, "the research file is optional"); assert.match(g.line, /runs with your PC off ✓/);
});

test("Part 5.1 + 5.3 + 5.4 + 5.5 · next step on every screen, help beside every field, a fix for every refusal, the Guide's names are the UI's own", () => {
  assert.match(UI, /get\(`\/api\/products\/\$\{encodeURIComponent\(pid\)\}\/setup-guide`\)\.then\(\(G\) => \{ if \(P !== pid \|\| !G\?\.next/);
  assert.match(UI, /setupChecklist\(\); \/\/ RR-389 Part 5\.2/);
  for (const g of ["github-token", "publish-branch", "vercel-bypass", "google-client", "anthropic-key", "dataforseo-login"]) { assert.ok(GUIDES[g]?.steps?.length >= 3, g); assert.ok(UI.includes(`"${g}"]`), `the field help points to ${g}`); }
  assert.match(GUIDES["github-token"].steps.map((s) => s.do).join(" "), /github\.com\/settings\/personal-access-tokens\/new[\s\S]*Contents: Read and write; Pull requests: Read and write/);
  for (const [t, screen] of [["Not published — the page has no offer button.", "Settings"], ["No publish connection: nothing can go out.", "Publish settings"], ["The AI limit for this month was reached", "Settings"], ["Your Bing key was refused", "Bing Webmaster Tools"]]) assert.equal(refusalFix(t)?.screen, screen, t);
  for (const x of SETUP_STEPS) assert.ok(UI.includes(x.screen), `the guided setup names a screen the app has: ${x.screen}`);
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(main, /typeof obj\.refused === "string" && !obj\.fix\) \{ const fix = refusalFix\(obj\.refused\)/);
  /* 5.5: every name the Guide quotes is shown elsewhere in the app */
  const g = UI.slice(UI.indexOf("const SCREEN_GUIDE = {"), UI.indexOf("function guideBars(")), rest = UI.replace(g, "");
  for (const m of g.matchAll(/\\"([^"\\]{3,60})\\"/g)) assert.ok(rest.includes(m[1].replace(/\$\{[^}]*\}/g, "").replace(/[.…]+$/, "").trim()), `the Guide names "${m[1]}", which the app does not show`);
});
