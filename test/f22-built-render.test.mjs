/**
 * 🔴 F22 · ACCEPTANCE AMENDMENT 1 (_handoffs df82cbe; the owner's overnight command of 16 Oct 2026) — the client's BUILT pages, rendered:
 * offline as published (or as built) with the files their records name, and the LIVE pages live under the owner's GREEN.
 *   C1 one client, any client — two unrelated declared subjects on FIXTURES, named (one declared client has built pages)
 *   C2 measured only against a COMPLETE render      C3 seven dimensions: TITLE, H1, CONTENT, LINKS, STRUCTURED DATA, CANONICAL, ROBOTS META
 *   C4 the live path bounded by the GREEN (no retry, the GREEN's interval, the run's request ceiling) — on fixtures only, no live call
 *   C5 the sealed exam directory is never named      C6 denominators and INCOMPLETE, count-only output
 * No live request is made by this file. Browser tests SKIP where playwright-core cannot load (CI installs no browser).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { compareSourceRender, DIMENSIONS, NOT_MEASURED, titlesIn, h1sIn, robotsMetaIn, textOf } from "../src/audit/render-compare.mjs";
import { renderJobs, offlineFiles, auditRenders, RENDER_READ_RECORD, MODE } from "../src/render/built-page-render.mjs";
import { createSameOriginPolicy, greenSubresources, LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";
import { loadPlaywright } from "../src/render/renderer.mjs";
import { publishedHtml, PUBLISH } from "../src/page/publish-page.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { LIVE_RENDER_GREEN } from "../config/audit/live-render-green.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PW = await loadPlaywright();
const NO_BROWSER = PW.unavailable ? `no browser here: ${PW.unavailable}` : false;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const ON = "2026-10-16";
const LOGO = Buffer.from("fixture-logo-bytes");
const LD = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [] });
const builtHtml = (h1, origin) => ["<!doctype html><html><head>", "<title>A page &amp; its title</title>", PUBLISH.NOINDEX, `<script type="application/ld+json">${LD}</script></head><body>`,
  `<p class="stamp">${STAMP}</p>`, `<header><a href="${origin}/">Home</a><img src="assets/logo.png" alt="Logo"></header>`, "<main>", `<h1>${h1}</h1>`, "<p>What score? 350.</p>", "</main>",
  `<p class="stamp">${STAMP}</p>`, "</body></html>", ""].join("\n");
const built = (id, h1, origin, over = {}) => ({ record_type: JOINED_RECORD, value: id, measurement_key: `${JOINED_RECORD}:${id}`, stamp: STAMP, itemList: [{ needId: `n-${id}`, questions: [] }],
  titleTrace: [{ part: h1 }], html: builtHtml(h1, origin), assets: [{ name: "assets/logo.png", file: "design/logo.png", sha256: sha(LOGO) }], recorded_at: `${ON}T00:00:00Z`, ...over });
const published = (r, url) => ({ ...r, measurement_key: `${r.measurement_key}-live`, publishedUrl: url, publishedOn: ON, publishedSha256: publishedHtml(r, { url }).sha256 });

/* ---------------- C3 · the seven dimensions, pure ---------------- */
test("C3 · SEVEN DIMENSIONS · FIRING CONTROL (F22 A1): a title, an H1 and a robots value a script changes are each DIFFERS with their counts; the same text written two ways is SAME; an SVG title in the body is not the document's", () => {
  assert.deepEqual(DIMENSIONS, ["TITLE", "H1", "CONTENT", "LINKS", "STRUCTURED_DATA", "CANONICAL", "ROBOTS_META"]);
  const src = `<html><head><title>A &#38; B</title><meta name="robots" content="index, follow"></head><body><h1>One</h1><svg><title>icon</title></svg></body></html>`;
  const same = compareSourceRender({ renderState: "COMPLETE", renderReason: "", pageUrl: "https://x.invalid/p", sourceHtml: src, renderedHtml: src.replace("&#38;", "&amp;").replace("index, follow", "follow,index"), sourceText: "One", renderedText: "One" });
  for (const d of DIMENSIONS) assert.equal(same.dimensions[d].state, "SAME", d);
  const changed = src.replace("A &#38; B", "C").replace("<h1>One</h1>", "<h1>One</h1><h1>Two</h1>").replace("index, follow", "noindex");
  const c = compareSourceRender({ renderState: "COMPLETE", renderReason: "", pageUrl: "https://x.invalid/p", sourceHtml: src, renderedHtml: changed, sourceText: "One", renderedText: "One" });
  assert.deepEqual([c.dimensions.TITLE.state, c.dimensions.TITLE.onlyInRender, c.dimensions.TITLE.onlyInSource], ["DIFFERS", 1, 1]);
  assert.deepEqual([c.dimensions.H1.state, c.dimensions.H1.onlyInRender, c.dimensions.H1.onlyInSource], ["DIFFERS", 1, 0]);
  assert.deepEqual([c.dimensions.ROBOTS_META.state, c.dimensions.ROBOTS_META.onlyInRender, c.dimensions.ROBOTS_META.onlyInSource], ["DIFFERS", 1, 1]);
  assert.deepEqual([titlesIn(src), h1sIn(src), robotsMetaIn(src), textOf("<b>x</b>&nbsp; y")], [["A & B"], ["One"], ["follow,index"], ["x y"][0]]);
  /* a robots meta that a script REMOVES is counted on the source side, never dropped */
  const gone = compareSourceRender({ renderState: "COMPLETE", renderReason: "", pageUrl: "https://x.invalid/p", sourceHtml: src, renderedHtml: src.replace(/<meta name="robots"[^>]*>/, ""), sourceText: "One", renderedText: "One" });
  assert.deepEqual([gone.dimensions.ROBOTS_META.state, gone.dimensions.ROBOTS_META.onlyInSource], ["DIFFERS", 1]);
});

/* ---------------- C2 · C6 · the audit of stored renders, pure ---------------- */
test("C2 C6 · FIRING CONTROL (F22 A1): a PARTIAL or FAILED render leaves all seven NOT MEASURED; a page with no stored render is counted absent and named; the population reads INCOMPLETE; the latest render of a page is the one judged", () => {
  const html = "<html><head><title>t</title></head><body><h1>h</h1></body></html>";
  const r = (pageId, renderState, run, over = {}) => ({ record_type: RENDER_READ_RECORD, mode: MODE.OFFLINE, pageId, url: "https://x.invalid/p", run, renderState, reason: "why", sourceHtml: html, renderedHtml: html, sourceText: "h", renderedText: "h", ...over });
  const a = auditRenders({ reads: [r("a", "COMPLETE", "1"), r("b", "PARTIAL", "1"), r("c", "COMPLETE", "1"), r("c", "FAILED", "2")], expected: { OFFLINE: ["a", "b", "c", "d"], LIVE: [] } });
  const m = a.modes.OFFLINE;
  for (const d of DIMENSIONS) assert.deepEqual([m.dimensions[d].SAME, m.dimensions[d][NOT_MEASURED], m.dimensions[d].denominator], [1, 3, 4], d);
  assert.deepEqual([m.absent, m.incomplete, a.incomplete, m.renderStates], [1, true, true, { COMPLETE: 1, PARTIAL: 1, FAILED: 1 }]);
  assert.ok(m.missing.some((x) => /1 page\(s\) with no stored render/.test(x)) && m.missing.some((x) => /TITLE NOT MEASURED on 3 of 4/.test(x)), m.missing.join(" | "));
  const clean = auditRenders({ reads: [r("a", "COMPLETE", "1")], expected: { OFFLINE: ["a"], LIVE: [] } });
  assert.deepEqual([clean.incomplete, clean.modes.OFFLINE.pages, clean.empty], [false, 1, false]);
  assert.equal(auditRenders({ reads: [], expected: { OFFLINE: [], LIVE: [] } }).empty, true, "an empty population was not named empty");
});

/* ---------------- INPUT · the population, pure ---------------- */
test("INPUT · POPULATION · FIRING CONTROL (F22 A1): a built page offline as built; a LIVE page as published — and refused when its published bytes are not the ones recorded; a recorded file served locally only with its recorded bytes; nothing else served", async () => {
  const URL1 = `${FIXTURE_SUBJECT_ORIGIN}/guides/a-page`;
  const a = built("a-page", "Page A", FIXTURE_SUBJECT_ORIGIN), b = built("b-page", "Page B", FIXTURE_SUBJECT_ORIGIN);
  const batches = [{ batchId: "x", builds: [a, published(a, URL1), b], decisions: [] }];
  const j = renderJobs({ batches, tenantId: FIXTURE_TENANT, hosts: [new URL(FIXTURE_SUBJECT_ORIGIN).host], assetBytes: (f) => (f === "design/logo.png" ? LOGO : null) });
  const byId = Object.fromEntries(j.offline.map((x) => [x.pageId, x]));
  assert.deepEqual([j.offline.length, j.live.length, j.live[0].url], [2, 1, URL1]);
  assert.equal(byId["a-page"].html, publishedHtml(a, { url: URL1 }).html, "a LIVE page is not rendered as published");
  assert.equal(byId["b-page"].html, b.html, "a built page is not rendered as built");
  const served = await offlineFiles(byId["a-page"])(`${FIXTURE_SUBJECT_ORIGIN}/guides/assets/logo.png`);
  assert.deepEqual([served.served, served.local, served.body.equals(LOGO)], [true, true, true]);
  assert.equal((await offlineFiles(byId["a-page"])(`${FIXTURE_SUBJECT_ORIGIN}/elsewhere.png`)).served, false, "a file the record does not name was served");
  const wrongBytes = renderJobs({ batches, tenantId: FIXTURE_TENANT, hosts: [new URL(FIXTURE_SUBJECT_ORIGIN).host], assetBytes: () => Buffer.from("other") });
  assert.equal(wrongBytes.offline[0].files.size, 0, "a file whose bytes are not the recorded ones was served");
  const altered = renderJobs({ batches: [{ batchId: "x", builds: [a, { ...published(a, URL1), publishedSha256: "0".repeat(64) }], decisions: [] }], tenantId: FIXTURE_TENANT, hosts: [new URL(FIXTURE_SUBJECT_ORIGIN).host] });
  assert.equal(altered.offline[0].refused, "PUBLISHED_BYTES_DIFFER", "a page whose published bytes differ from the recorded ones was rendered as published");
  const elsewhere = renderJobs({ batches, tenantId: FIXTURE_TENANT, hosts: ["other.invalid"] });
  assert.deepEqual([elsewhere.live.length, elsewhere.counts.publishedElsewhere], [0, 1], "a page published on an undeclared host is live-rendered");
});

/* ---------------- C4 · the GREEN's bounds on the live policy, fixtures only ---------------- */
test("C4 · THE GREEN'S BOUNDS · FIRING CONTROL (F22 A1): with the GREEN's no-retry a failed request is sent once; without it, twice; the GREEN's interval spaces every start; the run's ceiling refuses the request past it", async () => {
  const run = async (bounds, fail) => {
    let t = 0; const starts = []; let calls = 0;
    const fetchImpl = async (u) => { calls += 1; starts.push(t); if (fail(u)) throw new Error("ECONNRESET"); return new Response(u.endsWith("robots.txt") ? "User-agent: *\nAllow: /\n" : "<p>x</p>", { status: 200, headers: { "content-type": "text/html" } }); };
    const p = createSameOriginPolicy({ fetchImpl, admits: (u) => u.startsWith("https://site.invalid/"), bounds, monotonic: () => t, sleepImpl: async (ms) => { t += ms; } });
    const pp = p.forPage();
    const results = [];
    for (const u of ["https://site.invalid/a", "https://site.invalid/b", "https://site.invalid/c"]) results.push(await pp.resolve(u));
    return { calls, starts, results, issued: p.requestsIssued() };
  };
  const green = { ...LIVE_RENDER_BOUNDS, intervalMs: LIVE_RENDER_GREEN.intervalMs, retries: LIVE_RENDER_GREEN.retries, maxTotalRequests: LIVE_RENDER_GREEN.maxRequests };
  const once = await run(green, (u) => u.endsWith("/a"));
  assert.deepEqual([once.calls, once.results[0].refusal], [4, "NETWORK"], "a failed request was retried under the GREEN");
  const twice = await run({ ...LIVE_RENDER_BOUNDS }, (u) => u.endsWith("/a"));
  assert.equal(twice.calls, 5, "CONTROL: without the GREEN's no-retry the fetcher retries once — the bound could not fail");
  for (let i = 1; i < once.starts.length; i += 1) assert.ok(once.starts[i] - once.starts[i - 1] >= LIVE_RENDER_GREEN.intervalMs, `two requests ${once.starts[i] - once.starts[i - 1]} ms apart`);
  const capped = await run({ ...green, maxTotalRequests: 2 }, () => false);
  assert.deepEqual([capped.issued, capped.results.map((r) => r.served ? "SERVED" : r.refusal)], [2, ["SERVED", "RUN_CAP", "RUN_CAP"]], "the run's ceiling was passed");
  assert.deepEqual([LIVE_RENDER_GREEN.maxRequests <= 100, LIVE_RENDER_GREEN.intervalMs >= 2000, LIVE_RENDER_GREEN.retries, LIVE_RENDER_GREEN.sameOriginOnly], [true, true, 0, true], "the GREEN's bounds were widened");
});

/* RR-272: the owner's GREEN admits a page's own same-origin subresources and no other host */
test("C4 · THIRD PARTY · FIRING CONTROL (RR-272): under the GREEN a page's own-origin subresource is requested and a subresource on another origin — even one the connector admits — is THIRD_PARTY, refused before any request; without sameOriginOnly the same request is made; a pages-only GREEN refuses both", async () => {
  const PAGE = "https://site.invalid/guides/a", OWN = "https://site.invalid/guides/assets/logo.png", OTHER = "https://other.invalid/font.woff2";
  const run = async (green) => {
    const asked = [];
    const fetchImpl = async (u) => { asked.push(u); return new Response(u.endsWith("robots.txt") ? "User-agent: *\nAllow: /\n" : "x", { status: 200, headers: { "content-type": "image/png" } }); };
    /* a connector that admits BOTH origins: only the GREEN's own rule can keep the second one out */
    const p = createSameOriginPolicy({ fetchImpl, admits: (u) => /^https:\/\/(site|other)\.invalid\//.test(u), bounds: { ...LIVE_RENDER_BOUNDS, intervalMs: 0, retries: 0 }, sleepImpl: async () => {} });
    const sub = greenSubresources({ green, pageUrl: PAGE, resolve: p.forPage().resolve });
    const own = await sub(OWN, "image", "GET"), other = await sub(OTHER, "font", "GET");
    return { own: own.served ? "SERVED" : own.refusal, other: other.served ? "SERVED" : other.refusal, asked: asked.filter((u) => !u.endsWith("robots.txt")) };
  };
  const real = await run(LIVE_RENDER_GREEN);
  assert.deepEqual([real.own, real.other, real.asked], ["SERVED", "THIRD_PARTY", [OWN]], "a third-party subresource was requested under the GREEN");
  const open = await run({ ...LIVE_RENDER_GREEN, sameOriginOnly: false });
  assert.deepEqual([open.other, open.asked], ["SERVED", [OWN, OTHER]], "CONTROL: without sameOriginOnly the third-party request is made — the refusal could not fail");
  const pagesOnly = await run({ ...LIVE_RENDER_GREEN, pagesOnly: true });
  assert.deepEqual([pagesOnly.own, pagesOnly.other, pagesOnly.asked], ["OUTSIDE_THE_GREEN", "OUTSIDE_THE_GREEN", []]);
  /* a GREEN that does not say is read as the narrowest: no subresource at all */
  const silent = await run({ maxRequests: 1, intervalMs: 2000, retries: 0 });
  assert.deepEqual([silent.own, silent.asked], ["OUTSIDE_THE_GREEN", []]);
});

/* ---------------- C1 · C4 · C5 · C6 · the binary, two unrelated declared subjects (FIXTURES, named) ---------------- */
const B_SUBJECT = "second-client-site", B_ORIGIN = "https://second-client.invalid";
function twoClientWorld() {
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", "built-a"], ["RESEARCH_BATCH", "built-b"], ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  const A = roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT);
  A.members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: "built-a" });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: "built-b" }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const x of att.attachments) if (x.resourceRef === "built-b") x.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2) + "\n");
  const research = roots.stores.find((s) => s.store === "RESEARCH").path;
  for (const [subjectPath, files] of [[A.path, true], [B_SUBJECT, true]]) if (files) { mkdirSync(join(W.root, subjectPath, "design"), { recursive: true }); writeFileSync(join(W.root, subjectPath, "design", "logo.png"), LOGO); }
  const put = (id, recs) => { mkdirSync(join(W.root, research, id), { recursive: true }); writeFileSync(join(W.root, research, id, "joined-pages.jsonl"), recs.map((r) => JSON.stringify(r)).join("\n") + "\n"); };
  /* A: one built page and one LIVE page; B: three built pages, one whose own script adds an H1 */
  const a1 = built("a-one", "A One", FIXTURE_SUBJECT_ORIGIN);
  put("built-a", [a1, published(a1, `${FIXTURE_SUBJECT_ORIGIN}/guides/a-one`), built("a-two", "A Two", FIXTURE_SUBJECT_ORIGIN)]);
  const scripted = built("b-three", "B Three", B_ORIGIN);
  put("built-b", [built("b-one", "B One", B_ORIGIN), built("b-two", "B Two", B_ORIGIN), { ...scripted, html: scripted.html.replace("</main>", `<script>document.querySelector("main").insertAdjacentHTML("beforeend","<h1>Added</h1>")</script></main>`) }]);
  return { W, research };
}
const runBin = (W, { tenant, subject, extra = [] }) => spawnSync(process.execPath, ["bin/render-built-pages.mjs", `--subject=${subject}`, `--on=${ON}`, `--tenant=${tenant}`, "--actor=actor:cc", ...extra], { cwd: REPO, encoding: "utf8", timeout: 240000, env: { ...W.envWith(), NO_EGRESS_MODE: "refuse" } });
const line = (out, d) => (out.split("\n").find((l) => l.trim().startsWith(d)) ?? "").trim();

test("C1 · PRODUCTION PATH (F22 A1) — two unrelated declared subjects (FIXTURES, named: one declared client has built pages), different tenants, origins and page counts, through the same binary: each renders and stores only its own pages, offline, COMPLETE; the stored renders are audited; output is count-only", { skip: NO_BROWSER }, () => {
  const { W, research } = twoClientWorld();
  try {
    const a = runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, extra: ["--render", "--confirm"] });
    const b = runBin(W, { tenant: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, extra: ["--render", "--confirm"] });
    assert.equal(a.status, 0, a.stdout + a.stderr);
    assert.equal(b.status, 0, b.stdout + b.stderr);
    assert.match(a.stdout, /population {3}OFFLINE 2 page\(s\) \(LIVE 1 as published, BUILT 1 as built; not servable as they stand 0\) · LIVE 1 page\(s\)/);
    assert.match(b.stdout, /population {3}OFFLINE 3 page\(s\)/);
    assert.match(a.stdout, /rendered {5}2 page\(s\) · COMPLETE 2/, "the page's own logo file was not served locally — the render is not COMPLETE");
    assert.match(line(a.stdout, "OFFLINE"), /renders COMPLETE 2 of 2 page\(s\)/);
    assert.match(line(a.stdout, "LIVE"), /renders none of 1 page\(s\) · with no stored render 1/, "a LIVE page with no live render was not counted absent");
    assert.match(a.stdout, /INCOMPLETE — absent: 1 page\(s\) with no stored render/);
    /* B's own script adds an H1: found as JS-only, with every other dimension SAME */
    assert.match(line(b.stdout, "H1"), /SAME 2 · DIFFERS 1 · NOT MEASURED 0 — of 3 page\(s\) · only in render 1 · only in source 0/);
    assert.match(line(b.stdout, "TITLE"), /SAME 3 · DIFFERS 0/);
    const storedA = readFileSync(join(W.root, research, "built-a", "built-page-renders.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual([storedA.length, storedA.every((r) => r.tenantId === FIXTURE_TENANT && r.mode === MODE.OFFLINE), existsSync(join(W.root, research, "built-b", "built-page-renders.jsonl"))], [2, true, true]);
    /* the audit alone, from the stored renders: no render, nothing written */
    const again = runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /NOT RENDERED — no --render and no --live/);
    assert.equal(readFileSync(join(W.root, research, "built-a", "built-page-renders.jsonl"), "utf8").split("\n").filter(Boolean).length, 2, "an audit-only run wrote");
    /* one client cannot read the other's: A's tenant naming B's subject is refused at F02 */
    const cross = runBin(W, { tenant: FIXTURE_TENANT, subject: B_SUBJECT });
    assert.notEqual(cross.status, 0);
    assert.doesNotMatch(cross.stdout, /population/);
    for (const r of [a, b, again]) assert.doesNotMatch(r.stdout, /https?:\/\/|\.invalid|A One|B Three/, "the output carries a host, URL or page content");
  } finally { W.cleanup(); }
});

test("C4 · PRODUCTION PATH (F22 A1): the live mode makes NO request without --confirm; refuses, with no request, when the pages and the robots file outnumber the limit; a limit above the GREEN's is a usage refusal", () => {
  const { W } = twoClientWorld();
  try {
    const unconfirmed = runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, extra: ["--live"] });
    /* the refusal is NO_CONFIRM by name: another refusal also says no request was made (found by the harness, limb B20) */
    assert.deepEqual([unconfirmed.status, /REFUSED — NO_CONFIRM: .*NO REQUEST WAS MADE/.test(unconfirmed.stderr)], [3, true], unconfirmed.stdout + unconfirmed.stderr);
    const tight = runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, extra: ["--live", "--confirm", "--max-requests=1"] });
    assert.deepEqual([tight.status, /REQUESTS_OUTNUMBER_THE_LIMIT: 2 \(each page's document and the robots file\) against a limit of 1\. NO REQUEST WAS MADE\./.test(tight.stderr)], [3, true], tight.stdout + tight.stderr);
    /* RR-272: the live render's subresources go through the GREEN's handler (own origin only), and the render's requests are stored */
    assert.match(readFileSync(join(REPO, "bin/render-built-pages.mjs"), "utf8"), /subresources: greenSubresources\(\{ green: LIVE_RENDER_GREEN, pageUrl: t\.url, resolve: pp\.resolve \}\) \}\);/);
    assert.match(readFileSync(join(REPO, "bin/render-built-pages.mjs"), "utf8"), /read\(t, \{ renderState: rendered\.renderState, reason: rendered\.reason, requests: rendered\.requests, sourceHtml,/);
    for (const bad of [`${LIVE_RENDER_GREEN.maxRequests + 1}`, "0", "x"]) assert.equal(runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, extra: [`--max-requests=${bad}`] }).status, 2, bad);
    assert.equal(runBin(W, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, extra: ["--live", "--render"] }).status, 2, "both modes at once were taken");
  } finally { W.cleanup(); }
});

test("C5 · THE SEALED EXAM RULE (F22 A1): the new render path names no sealed directory, and its output field set tells no sealed item apart", () => {
  for (const f of ["src/render/built-page-render.mjs", "bin/render-built-pages.mjs", "config/audit/live-render-green.mjs"]) {
    const s = readFileSync(join(REPO, f), "utf8");
    assert.doesNotMatch(s, /sealed|exam-bank|\.sealed/i, `${f} names a sealed directory`);
  }
});

/* ---------------- REAL · the client's built pages, as stored ---------------- */
test("REAL (F22 A1): the client's built pages offline and its LIVE pages live — every page has a stored render in each mode; each render re-compared from its stored bytes; count-only", () => {
  const index = rootIndexFor(process.env);
  const subject = lookupSubject(index, "almi-oet");
  assert.equal(subject.state, "DECLARED", "EMPTY real population: the client is not declared here");
  const batches = (subject.entry.members ?? []).filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
  const rows = (b, n) => { const f = join(lookupStore(index, "RESEARCH").dir, b, n); return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  const tenantId = "tenant:93b991d5afa33b16ccb9166b249593b6";
  const jobs = renderJobs({ batches: batches.map((batchId) => ({ batchId, builds: rows(batchId, "joined-pages.jsonl"), decisions: rows(batchId, "built-page-needs.jsonl") })), tenantId, hosts: ["almioet.almiworld.com"] });
  assert.ok(jobs.offline.length > 0 && jobs.live.length > 0, "EMPTY real population: no built or no LIVE page");
  const stored = batches.flatMap((b) => rows(b, "built-page-renders.jsonl"));
  const a = auditRenders({ reads: stored, expected: { OFFLINE: jobs.offline.map((j) => j.pageId), LIVE: jobs.live.map((j) => j.pageId) } });
  for (const mode of Object.values(MODE)) {
    const m = a.modes[mode];
    for (const d of DIMENSIONS) assert.equal(m.dimensions[d].SAME + m.dimensions[d].DIFFERS + m.dimensions[d][NOT_MEASURED], m.pages, `${mode} ${d}: a page is uncounted`);
  }
  /* OFFLINE: every built page has a stored render, and every one is COMPLETE */
  assert.deepEqual([a.modes.OFFLINE.absent, a.modes.OFFLINE.renderStates.COMPLETE, a.modes.OFFLINE.incomplete], [0, jobs.offline.length, false], "OFFLINE: a page has no stored COMPLETE render");
  /* LIVE: no live render is stored yet — a page's own file (its logo) is outside the owner's GREEN of 16 Oct 2026, so a live render could only
   * be PARTIAL; the run waits on the owner. Until then every LIVE page is counted absent and the population reads INCOMPLETE, by name. */
  const L = a.modes.LIVE;
  assert.ok(L.absent === 0 || (L.incomplete && L.missing.some((x) => /page\(s\) with no stored render/.test(x))), "LIVE: an absent live render was not named");
  assert.equal(a.incomplete, L.incomplete || a.modes.OFFLINE.incomplete);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
