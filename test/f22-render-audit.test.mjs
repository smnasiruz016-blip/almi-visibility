/**
 * 🔴 RR-137 · F22 · JAVASCRIPT RENDERING AUDIT (acceptance _handoffs 2d20a63; Owner Ruling 7 — the detector is written under the sealed
 * exam rule). Clauses:
 *   C1 one client, any client (two unrelated declared subjects, the same binary)   C2 measured only against a COMPLETE render
 *   C3 four dimensions                                                             C4 the bounded same-origin live path, on FIXTURES only
 *   C5 the sealed exam directory is never named or read                            C6 denominators and INCOMPLETE
 * No live render call is made by this file: every "live" request goes to a local fixture server or is answered in-process.
 * Browser tests need playwright-core; where it cannot load (CI installs nothing) they SKIP with that reason, as test/renderer.test.mjs does.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { compareSourceRender, summariseComparisons, multisetDiff, jsonLdIn, canonicalsIn, DIMENSIONS, NOT_MEASURED } from "../src/audit/render-compare.mjs";
import { createSameOriginPolicy } from "../src/render/same-origin-policy.mjs";
import { loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PW = await loadPlaywright();
const NO_BROWSER = PW.unavailable ? `no browser here: ${PW.unavailable}` : false;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const URL0 = "https://site.invalid/page";

/* ---------------- C2 · C3 · C6 — the detector, pure ---------------- */
test("C2 · against a PARTIAL or FAILED render every dimension is NOT MEASURED with the render's reason — never SAME, never 0", () => {
  for (const state of ["PARTIAL", "FAILED"]) {
    const c = compareSourceRender({ renderState: state, renderReason: "3 request(s) refused", pageUrl: URL0, sourceHtml: "<a href=/a>a</a>", renderedHtml: "<a href=/a>a</a>", sourceText: "a", renderedText: "a" });
    for (const d of DIMENSIONS) {
      assert.equal(c.dimensions[d].state, NOT_MEASURED, `${state} ${d}`);
      assert.match(c.dimensions[d].reason, new RegExp(`${state}: 3 request\\(s\\) refused`));
      assert.equal(c.dimensions[d].onlyInRender, undefined, "a NOT MEASURED dimension carries no count");
    }
  }
  /* CONTROL: the same documents against a COMPLETE render ARE measured */
  const ok = compareSourceRender({ renderState: "COMPLETE", renderReason: "", pageUrl: URL0, sourceHtml: "<a href=/a>a</a>", renderedHtml: "<a href=/a>a</a>", sourceText: "a", renderedText: "a" });
  for (const d of DIMENSIONS) assert.equal(ok.dimensions[d].state, "SAME");
});

test("C3 · four dimensions, source against render: JS-only links, a script-changed canonical, script-inserted JSON-LD and text are DIFFERS with counts; unparseable JSON-LD is counted", () => {
  const source = `<html><head><link rel="canonical" href="/a"><script type="application/ld+json">{"@type":"Thing","name":"x"}</script></head><body><a href="/one">one</a><p>alpha beta</p></body></html>`;
  const rendered = `<html><head><link rel="canonical" href="/b"><script type="application/ld+json">{"name":"x","@type":"Thing"}</script><script type="application/ld+json">{"@type":"Extra"}</script><script type="application/ld+json">{ broken</script></head><body><a href="/one">one</a><a href="/two#frag">two</a><p>alpha beta gamma</p></body></html>`;
  const c = compareSourceRender({ renderState: "COMPLETE", renderReason: "", pageUrl: URL0, sourceHtml: source, renderedHtml: rendered, sourceText: "one alpha beta", renderedText: "one two alpha beta gamma" });
  assert.deepEqual([c.dimensions.LINKS.state, c.dimensions.LINKS.onlyInRender, c.dimensions.LINKS.onlyInSource], ["DIFFERS", 1, 0]);
  assert.deepEqual([c.dimensions.CANONICAL.state, c.dimensions.CANONICAL.onlyInRender, c.dimensions.CANONICAL.onlyInSource], ["DIFFERS", 1, 1]);
  /* key order does not make two equal blocks differ; the extra block is JS-only; the broken one is counted, never dropped */
  assert.deepEqual([c.dimensions.STRUCTURED_DATA.state, c.dimensions.STRUCTURED_DATA.onlyInRender, c.dimensions.STRUCTURED_DATA.unparseableInRender], ["DIFFERS", 1, 1]);
  assert.deepEqual([c.dimensions.CONTENT.state, c.dimensions.CONTENT.onlyInRender, c.dimensions.CONTENT.onlyInSource], ["DIFFERS", 2, 0]);
  /* removed by script is counted on the source side */
  assert.deepEqual(multisetDiff(["a", "a", "b"], ["a"]), { onlyInRender: 0, onlyInSource: 2 });
  assert.equal(canonicalsIn(`<link href="/x" rel="alternate canonical">`, URL0)[0], "https://site.invalid/x");
  assert.equal(jsonLdIn(`<script type='application/ld+json'>[1]</script><script>{"not":"ld"}</script>`).blocks.length, 1);
  /* CONTENT with no read text is NOT MEASURED, never SAME */
  assert.equal(compareSourceRender({ renderState: "COMPLETE", pageUrl: URL0, sourceHtml: "", renderedHtml: "", sourceText: null, renderedText: "x" }).dimensions.CONTENT.state, NOT_MEASURED);
});

test("C6 · denominators on every count; a page without a stored body and any NOT MEASURED dimension make the population INCOMPLETE", () => {
  const complete = compareSourceRender({ renderState: "COMPLETE", pageUrl: URL0, sourceHtml: "<a href=/a>a</a>", renderedHtml: "<a href=/a>a</a>", sourceText: "a", renderedText: "a" });
  const partial = compareSourceRender({ renderState: "PARTIAL", renderReason: "1 refused", pageUrl: URL0, sourceHtml: "", renderedHtml: "" });
  const s = summariseComparisons([complete, partial], { pagesWithoutBody: 1 });
  assert.equal(s.pages, 3);
  for (const d of DIMENSIONS) { assert.equal(s.dimensions[d].denominator, 3); assert.equal(s.dimensions[d].SAME + s.dimensions[d].DIFFERS + s.dimensions[d][NOT_MEASURED], 3); }
  assert.equal(s.incomplete, true);
  assert.equal(summariseComparisons([complete]).incomplete, false, "CONTROL: a fully measured population is COMPLETE");
  assert.doesNotMatch(JSON.stringify(s), /https?:|site\.invalid/, "the summary carries a host or URL");
});

/* ---------------- C4 · the live same-origin policy, against a local fixture server (no browser) ---------------- */
function fixtureSite({ robots = "User-agent: *\nDisallow: /blocked/\n", big = 0 } = {}) {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push({ path: req.url, at: performance.now() });
    if (req.url === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain" }); return res.end(robots); }
    if (req.url === "/hop") { res.writeHead(301, { location: "/app.js" }); return res.end(); }
    if (req.url === "/away") { res.writeHead(301, { location: "http://127.0.0.2:9/x.js" }); return res.end(); }
    if (req.url === "/slow.js") { setTimeout(() => { res.writeHead(200); res.end("1"); }, 400); return; }
    if (req.url === "/big.js") { res.writeHead(200, { "content-type": "text/javascript" }); return res.end("x".repeat(big)); }
    if (req.url === "/img.png") { res.writeHead(200, { "content-type": "image/png" }); return res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])); }
    res.writeHead(200, { "content-type": "text/javascript" }); res.end("/* ok */");
  });
  return { seen, start: () => new Promise((r) => server.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${server.address().port}`))), stop: () => new Promise((r) => server.close(r)) };
}

test("C4 · the live policy: an undeclared host and the request cap refuse with NO request; robots refuse; a redirect is followed only on-origin, paced; size and time bounded; bytes kept exact", async () => {
  const site = fixtureSite({ big: 5000 });
  const origin = await site.start();
  try {
    const INTERVAL = 60;
    const policy = createSameOriginPolicy({ fetchImpl: (u, i) => globalThis.fetch(u, i), admits: (u) => new URL(u).origin === origin, bounds: { maxRequestsPerPage: 7, intervalMs: INTERVAL, timeoutMs: 200, maxResponseBytes: 1000 } });
    /* the cap counts REQUESTS STARTED: below, the hop costs 2, the off-origin redirect 1, the oversized body 1, the timed-out one 2 (its retry), the image 1 = 7 */
    const page = policy.forPage();
    assert.deepEqual(await page.resolve("http://127.0.0.2:9/other.js"), { served: false, refusal: "UNDECLARED_HOST" });
    assert.equal(site.seen.length, 0, "an undeclared host cost a request");
    assert.deepEqual(await page.resolve(`${origin}/blocked/x.js`), { served: false, refusal: "ROBOTS" });
    assert.deepEqual(site.seen.map((s) => s.path), ["/robots.txt"], "robots.txt first, and the disallowed path never requested");
    const hop = await page.resolve(`${origin}/hop`);
    assert.equal(hop.served, true);
    assert.deepEqual(site.seen.map((s) => s.path).slice(1), ["/hop", "/app.js"], "the on-origin redirect was followed by its own request");
    assert.deepEqual(await page.resolve(`${origin}/away`), { served: false, refusal: "REDIRECT_OFF_ORIGIN" });
    assert.deepEqual(await page.resolve(`${origin}/big.js`), { served: false, refusal: "SIZE_CAP" });
    assert.deepEqual(await page.resolve(`${origin}/slow.js`), { served: false, refusal: "NETWORK" }, "a request past its timeout is refused");
    const img = await page.resolve(`${origin}/img.png`);
    assert.deepEqual([...img.body], [0x89, 0x50, 0x4e, 0x47, 0x00, 0xff], "binary bytes were re-encoded");
    assert.deepEqual(await page.resolve(`${origin}/app.js`), { served: false, refusal: "REQUEST_CAP" });
    const before = site.seen.length;
    assert.equal((await page.cacheOnly(`${origin}/img.png`)).served, true, "the source pass reads what the render fetched");
    assert.deepEqual(await page.cacheOnly(`${origin}/never.js`), { served: false, refusal: "NOT_FETCHED_IN_RENDER" });
    assert.equal(site.seen.length, before, "the source pass made a request");
    /* rate: every request start, robots and hops included, at least the interval apart */
    const p = policy.pacing();
    assert.equal(p.breaches, 0);
    assert.ok(p.fastestGapMs >= INTERVAL);
    /* a NEW page starts with its own count and an empty cache — nothing crosses pages */
    const next = policy.forPage();
    assert.equal(next.requestsMade(), 0);
    assert.deepEqual(await next.cacheOnly(`${origin}/img.png`), { served: false, refusal: "NOT_FETCHED_IN_RENDER" });
  } finally { await site.stop(); }
});

/* ---------------- C4 · scripts and storage, in a real browser, against fixtures ---------------- */
test("C4 · in the browser: a page's OWN script runs and changes the DOM (COMPLETE); a script from another host is refused (PARTIAL); no state crosses from one page to the next", { skip: NO_BROWSER }, async () => {
  const site = fixtureSite();
  const origin = await site.start();
  const { browser } = await launchOfflineChromium({ chromium: PW.chromium, playwrightVersion: PW.version });
  const docs = new Map([
    ["own", { body: `<html><body><p>alpha</p><script src="/inject.js"></script></body></html>` }],
    ["foreign", { body: `<html><body><p>alpha</p><script src="https://elsewhere.invalid/x.js"></script></body></html>` }],
    ["writer", { body: `<html><body><script>localStorage.setItem("k","v");document.cookie="c=1";</script></body></html>` }],
    ["reader", { body: `<html><body><script>document.body.setAttribute("data-seen", (localStorage.getItem("k")||"") + "|" + document.cookie);</script></body></html>` }],
  ]);
  const server = await startDocumentServer(docs);
  try {
    /* the fixture's /inject.js: a script that adds a link and text */
    const policy = createSameOriginPolicy({ fetchImpl: async (u, i) => (new URL(u).pathname === "/inject.js" ? new Response(`document.body.insertAdjacentHTML("beforeend", '<a href="/added">added</a><p>gamma</p>');`, { status: 200, headers: { "content-type": "text/javascript" } }) : globalThis.fetch(u, i)), admits: (u) => new URL(u).origin === origin, bounds: { maxRequestsPerPage: 10, intervalMs: 20, timeoutMs: 2000, maxResponseBytes: 100000 } });
    const render = async (id, pp, js = true) => renderDocument({ browser, origin: server.origin, id, documentUrl: `${origin}/${id}`, egress: [], readVisibleText: true, javaScriptEnabled: js, subresources: js ? (u) => pp.resolve(u) : (u) => pp.cacheOnly(u) });
    const pp = policy.forPage();
    const own = await render("own", pp);
    const src = await render("own", pp, false);
    assert.equal(own.renderState, "COMPLETE", own.reason);
    const c = compareSourceRender({ renderState: own.renderState, renderReason: own.reason, pageUrl: `${origin}/own`, sourceHtml: docs.get("own").body, renderedHtml: own.html, sourceText: src.visibleText, renderedText: own.visibleText });
    assert.deepEqual([c.dimensions.LINKS.state, c.dimensions.LINKS.onlyInRender], ["DIFFERS", 1]);
    assert.deepEqual([c.dimensions.CONTENT.state, c.dimensions.CONTENT.onlyInRender], ["DIFFERS", 2]);
    const foreign = await render("foreign", policy.forPage());
    assert.equal(foreign.renderState, "PARTIAL");
    assert.equal(foreign.requests.refusedByReason.UNDECLARED_HOST, 1);
    await render("writer", policy.forPage());
    const reader = await render("reader", policy.forPage());
    assert.match(reader.html, /data-seen="\|"/, "storage or a cookie crossed from one page's context to the next");
    /* CONTROL: storage works in this environment — within ONE page a script reads back what it wrote — so the empty read above is isolation */
    docs.set("both", { body: `<html><body><script>localStorage.setItem("k","v");document.body.setAttribute("data-seen", localStorage.getItem("k"));</script></body></html>` });
    const both = await render("both", policy.forPage());
    assert.match(both.html, /data-seen="v"/, "CONTROL: storage did not work even within one page — the isolation test could not fail");
  } finally { await browser.close(); await server.close(); await site.stop(); }
});

/* ---------------- C1 · C5 · the binary, two unrelated declared subjects, offline ---------------- */
const B_SUBJECT = "second-client-site", B_ORIGIN = "https://second-client.invalid";
function twoClientWorld() {
  const WORLD = declaredWorld({ extra: [["RESEARCH_BATCH", "render-a"], ["RESEARCH_BATCH", "render-b"], ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: "render-a" });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: "render-b" }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  mkdirSync(join(WORLD.root, B_SUBJECT), { recursive: true });
  const att = JSON.parse(readFileSync(join(WORLD.root, "tenancy", "attachments.json"), "utf8"));
  for (const a of att.attachments) if (a.resourceRef === "render-b") a.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(join(WORLD.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2) + "\n");
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "f22-corpus-"));
  const research = roots.stores.find((s) => s.store === "RESEARCH").path;
  const batch = (id, origin, bodies) => {
    mkdirSync(join(WORLD.root, research, id), { recursive: true });
    const lines = bodies.map((body, i) => {
      const oid = `${id}-obs-${i}`;
      writeFileSync(join(corpus, `${oid}.html`), body);
      return JSON.stringify({ record_type: "observation", method: "crawl.fetch", observation_id: oid, content_sha256: sha(body), value: { status: 200, requested_url: `${origin}/p${i}`, final_url: `${origin}/p${i}` } });
    });
    writeFileSync(join(WORLD.root, research, id, "crawl.jsonl"), lines.join("\n") + "\n");
  };
  /* A: two pages whose scripts are INLINE — the offline renderer can measure them; B: three pages, one needing an external script */
  batch("render-a", FIXTURE_SUBJECT_ORIGIN, [
    `<html><body><a href="/x">x</a><script>document.body.insertAdjacentHTML("beforeend","<a href='/js'>js</a>")</script></body></html>`,
    `<html><body><p>plain</p></body></html>`,
  ]);
  batch("render-b", B_ORIGIN, [
    `<html><body><p>one</p></body></html>`,
    `<html><body><p>two</p><script src="/app.js"></script></body></html>`,
    `<html><body><p>three</p></body></html>`,
  ]);
  return { WORLD, corpus };
}
function runAudit(WORLD, corpus, { tenant, subject, batch, extra = [], preload = null, env = {} }) {
  /* the corpus is read only for bodies whose hash this batch recorded, on the subject's declared site — no path attachment is needed */
  const args = [...(preload ? ["--import", preload] : []), "bin/render-audit.mjs", `--research-batch=${batch}`, `--subject=${subject}`, `--corpus=${corpus}`, `--tenant=${tenant}`, "--actor=actor:cc", ...extra];
  return spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 180000, env: { ...WORLD.envWith(), ...env } });
}
const line = (out, d) => (out.split("\n").find((l) => l.trim().startsWith(d)) ?? "").trim();

test("C1 · GENERIC — two unrelated declared subjects, different tenants, origins and page counts, through the same binary; each reads only its own pages", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus } = twoClientWorld();
  try {
    const a = runAudit(WORLD, corpus, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: "render-a" });
    const b = runAudit(WORLD, corpus, { tenant: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, batch: "render-b" });
    assert.equal(a.status, 0, a.stderr.slice(-400));
    assert.equal(b.status, 0, b.stderr.slice(-400));
    assert.match(a.stdout, /fetched pages 2 · with a stored body matching its recorded hash 2/);
    assert.match(b.stdout, /fetched pages 3 · with a stored body matching its recorded hash 3/);
    /* the offline renderer MEASURES inline-script pages: A's JS-only link is found */
    assert.match(a.stdout, /renders\s+COMPLETE 2 of 2/);
    assert.match(line(a.stdout, "LINKS"), /SAME 1 · DIFFERS 1 · NOT MEASURED 0 — of 2 page\(s\) · only in render 1/);
    /* B's external-script page is PARTIAL and its dimensions NOT MEASURED — never SAME */
    assert.match(b.stdout, /COMPLETE 2 · PARTIAL 1 of 3/);
    assert.match(line(b.stdout, "LINKS"), /NOT MEASURED 1 — of 3 page\(s\)/);
    assert.match(b.stdout, /INCOMPLETE/);
    /* a client cannot read the other's batch: A's tenant asking for B's batch is refused at F02 */
    const cross = runAudit(WORLD, corpus, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: "render-b" });
    assert.notEqual(cross.status, 0);
    assert.doesNotMatch(cross.stdout, /fetched pages/);
    for (const r of [a, b]) assert.doesNotMatch(r.stdout, /https?:\/\/|\.invalid/, "the output carries a host or URL");
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C1 · a body whose bytes do not match its observation's recorded hash is NOT read as that page, and a page off the subject's declared site is not rendered — both counted", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus } = twoClientWorld();
  try {
    writeFileSync(join(corpus, "render-b-obs-0.html"), "<html><body>tampered</body></html>");
    /* an observation in the batch whose page is on ANOTHER origin than the subject declares */
    const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
    const crawl = join(WORLD.root, roots.stores.find((s) => s.store === "RESEARCH").path, "render-b", "crawl.jsonl");
    const offBody = "<html><body>off</body></html>";
    writeFileSync(join(corpus, "render-b-off.html"), offBody);
    writeFileSync(crawl, readFileSync(crawl, "utf8") + JSON.stringify({ record_type: "observation", method: "crawl.fetch", observation_id: "render-b-off", content_sha256: sha(offBody), value: { status: 200, requested_url: "https://another-site.invalid/z", final_url: "https://another-site.invalid/z" } }) + "\n");
    const b = runAudit(WORLD, corpus, { tenant: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, batch: "render-b" });
    assert.match(b.stdout, /fetched pages 4 · with a stored body matching its recorded hash 2 · without 1 · not on the declared site 1/);
    assert.match(line(b.stdout, "CONTENT"), /— of 3 page\(s\)/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C4 · the binary's live mode refuses without the owner's green, with no request; C5 · the render path never reads the sealed exam directory", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus } = twoClientWorld();
  const log = join(corpus, "reads.json");
  try {
    const noGreen = runAudit(WORLD, corpus, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: "render-a", extra: ["--live-render"] });
    assert.equal(noGreen.status, 3);
    assert.match(noGreen.stderr, /NO REQUEST WAS MADE/);
    const r = runAudit(WORLD, corpus, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: "render-a", preload: pathToFileURL(join(REPO, "test", "helpers", "fs-read-log-preload.mjs")).href, env: { FS_READ_LOG: log } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const reads = JSON.parse(readFileSync(log, "utf8"));
    assert.ok(reads.length > 10, "the read log recorded nothing — the spy cannot fire");
    assert.ok(reads.some((p) => p.includes("render-a")), "CONTROL: the batch the run did read is in the log");
    assert.deepEqual(reads.filter((p) => /case-study-01/.test(p)), [], "the render path read the sealed exam directory");
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C4 · the binary's LIVE path, in-process (no egress): the DOCUMENT itself is requested through the policy and becomes the source; robots first; only the declared host is touched", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus } = twoClientWorld();
  const log = join(corpus, "egress.json");
  try {
    const r = runAudit(WORLD, corpus, { tenant: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: "render-a", extra: ["--live-render", "--i-have-the-owners-green"], preload: pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href, env: { NO_EGRESS_MODE: "fixture", NO_EGRESS_LOG: log } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const c = JSON.parse(readFileSync(log, "utf8"));
    assert.deepEqual(Object.keys(c.hosts), [new URL(FIXTURE_SUBJECT_ORIGIN).host], "a host other than the subject's declared site was requested");
    assert.equal(c.robots, 1, "robots.txt was not read exactly once, first");
    assert.equal(c.order[0], "fetch");
    assert.equal(c.pages, 2, "each page's document was not requested exactly once");
    assert.equal(c.otherEgress, 0);
    /* the fixture answers every page with its own HTML: the live document differs from the stored one, and is the source compared */
    assert.match(r.stdout, /live document\s+served 2 of 2 · not served \{\} · differs from the stored body 2/);
    assert.match(r.stdout, /renders\s+COMPLETE 2 of 2/);
    assert.doesNotMatch(r.stdout, /https?:\/\/|\.invalid/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C5 · the detector, the renderer and the audit binary never NAME the sealed exam directory; the detector's output carries no id, path or URL", () => {
  for (const f of ["src/audit/render-compare.mjs", "src/render/renderer.mjs", "src/render/render-state.mjs", "src/render/same-origin-policy.mjs", "bin/render-audit.mjs"]) {
    assert.doesNotMatch(readFileSync(join(REPO, f), "utf8"), /case-study/i, `${f} names the sealed directory`);
  }
  /* the detector is handed documents, never a path or an id: two identical pages compare identically wherever they came from */
  const page = { renderState: "COMPLETE", renderReason: "", pageUrl: URL0, sourceHtml: "<a href=/a>a</a>", renderedHtml: "<a href=/a>a</a><a href=/b>b</a>", sourceText: "a", renderedText: "a b" };
  assert.deepEqual(compareSourceRender(page), compareSourceRender({ ...page }));
  assert.doesNotMatch(JSON.stringify(compareSourceRender(page)), /https?:|\.invalid|case-study/);
});

test("the production trail is untouched", () => assert.equal(trailSha(), TRAIL_BEFORE));
