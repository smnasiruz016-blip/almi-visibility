/**
 * 🔴 THE RENDERER — A CAPABILITY, PROVED OFFLINE. NO SOURCE-VERSUS-RENDER CHECK.
 *
 * Three kinds of test, kept apart:
 *   PURE     the render-state law and the stored record's shape — run everywhere.
 *   LIVE     a real headless Chromium against local documents — skipped, with
 *            its reason, where playwright-core or the browser is absent (CI
 *            installs nothing).
 *   RECORDED the real run over the 394 committed bodies — see the end of this file.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

import { classify } from "../src/checklist/classification.mjs";

import { renderStateOf, summariseRequests, RENDER_STATES } from "../src/render/render-state.mjs";
import {
  renderedObservation, guardedLocalFetch, EgressError, OFFLINE_CHROMIUM_ARGS, RENDER_BOUNDS,
  loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument,
} from "../src/render/renderer.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const served = { host: "doc.example.com", resourceType: "document", outcome: "SERVED_LOCAL" };
const refusedScript = { host: "cdn.example.net", resourceType: "script", outcome: "REFUSED" };

/* ---- PURE: the three states ---------------------------------------------- */

test("🔴 COMPLETE only when NOTHING was refused — one refused script makes the render PARTIAL", () => {
  assert.equal(renderStateOf({ documentServed: true, requests: [served] }).renderState, "COMPLETE");
  const partial = renderStateOf({ documentServed: true, requests: [served, refusedScript] });
  assert.equal(partial.renderState, "PARTIAL", "a page with a refused script reported COMPLETE");
  assert.match(partial.reason, /1 request\(s\) to 1 host\(s\) were REFUSED/);
  assert.match(partial.reason, /LAW-ABSENT-1/, "a refusal was not labelled a fact about OUR environment");
});

test("🔴 FAILED when there is no render to speak of — never served, navigation error, crash, or a request the interception never saw", () => {
  assert.equal(renderStateOf({ documentServed: false, requests: [] }).renderState, "FAILED");
  assert.equal(renderStateOf({ documentServed: true, navigationError: "net::ERR_ABORTED", requests: [served] }).renderState, "FAILED");
  assert.equal(renderStateOf({ documentServed: true, crashed: true, requests: [served] }).renderState, "FAILED");
  const escaped = renderStateOf({ documentServed: true, requests: [served], unaccounted: 1 });
  assert.equal(escaped.renderState, "FAILED", "a request that bypassed the interception was allowed to read COMPLETE");
  assert.match(escaped.reason, /neither served nor refused/);
});

test("a render that did not settle inside its bound is PARTIAL, not COMPLETE — and an unknown outcome is refused outright", () => {
  assert.equal(renderStateOf({ documentServed: true, requests: [served], timedOut: true }).renderState, "PARTIAL");
  assert.throws(() => renderStateOf({ documentServed: true, requests: [{ ...served, outcome: "DROPPED" }] }), /not one of SERVED_LOCAL\|REFUSED/);
  assert.deepEqual(RENDER_STATES, ["COMPLETE", "PARTIAL", "FAILED"]);
});

test("the resource record counts every request by host, and refused ones by kind", () => {
  const s = summariseRequests([served, refusedScript, refusedScript, { host: "doc.example.com", resourceType: "fetch", outcome: "REFUSED" }]);
  assert.deepEqual([s.attempted, s.servedLocal, s.refused], [4, 1, 3]);
  assert.deepEqual(s.byHost, { "cdn.example.net": { attempted: 2, refused: 2 }, "doc.example.com": { attempted: 2, refused: 1 } });
  assert.deepEqual(s.refusedByType, { fetch: 1, script: 2 });
});

/* ---- PURE: offline by construction --------------------------------------- */

test("🔴 the Node side can reach 127.0.0.1 and NOTHING else — a non-local fetch THROWS before it is issued", async () => {
  const egress = [];
  let called = 0;
  const fake = async () => ((called += 1), { ok: true });
  await guardedLocalFetch("http://127.0.0.1:1/doc/x", egress, fake);
  await assert.rejects(guardedLocalFetch("https://almiworld.com/", egress, fake), EgressError);
  await assert.rejects(guardedLocalFetch("http://localhost:1/", egress, fake), EgressError);
  assert.equal(called, 1, "a non-local fetch reached the network layer");
  assert.deepEqual(egress, ["http://127.0.0.1:1/doc/x"]);
});

test("Chromium starts with every name except 127.0.0.1 resolving to NOTFOUND, and background networking off", () => {
  assert.ok(OFFLINE_CHROMIUM_ARGS.includes("--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"));
  for (const a of ["--disable-background-networking", "--disable-component-update", "--no-pings", "--dns-prefetch-disable"]) assert.ok(OFFLINE_CHROMIUM_ARGS.includes(a), a);
  assert.deepEqual(Object.keys(RENDER_BOUNDS), ["perPageTimeoutMs", "maxWallClockMs", "maxPages", "concurrency"]);
});

/* ---- PURE: the stored record --------------------------------------------- */

const rawOf = (body) =>
  makeObservation({
    observed_at: "2026-09-12T00:00:00.000Z", method: "crawl.fetch", target: { kind: "url", ref: "https://doc.example.com/a" },
    content_sha256: sha256Hex(body), collector: "bin/crawl.mjs", collector_version: "0.1.0",
    value: { requested_url: "https://doc.example.com/a", final_url: "https://doc.example.com/a", status: 200, redirect_chain: [], renderMode: "RAW_HTML" },
  });
const env = { browser: { name: "chromium", build: "chromium-headless-shell", version: "151.0.7922.34" }, playwright: { package: "playwright-core", version: "1.62.1" } };
const resultOf = (html, renderState = "PARTIAL") => ({
  html, renderState, reason: "r", duration_ms: 12, timedOut: false, unaccounted: 0,
  requests: summariseRequests([served, refusedScript]), egressProof: { responses: 1, nonLocal: [], unverified: [] },
});

test("🔴 a RENDERED observation sits BESIDE its raw one — the raw record is untouched, and both are stored", () => {
  const raw = rawOf("<html>raw</html>");
  const before = JSON.stringify(raw);
  const r = renderedObservation({ raw, result: resultOf("<html>rendered</html>"), environment: env, observedAt: "2026-09-13T00:00:00.000Z", documentUrl: "https://doc.example.com/a" });
  assert.equal(JSON.stringify(raw), before, "rendering changed the raw observation");
  assert.equal(raw.value.renderMode, "RAW_HTML");
  assert.equal(r.value.renderMode, "RENDERED");
  assert.equal(r.value.renderState, "PARTIAL");
  assert.equal(r.value.source_observation_id, raw.observation_id);
  assert.equal(r.value.raw_content_sha256, raw.content_sha256);
  assert.deepEqual([r.value.browser.version, r.value.playwright.version], ["151.0.7922.34", "1.62.1"], "versions missing from the observation");
  assert.deepEqual(r.value.bounds, RENDER_BOUNDS);
  assert.notEqual(r.measurement_key, raw.measurement_key);

  const dir = mkdtempSync(join(tmpdir(), "almivis-render-"));
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    store.appendIfNew(raw);
    assert.equal(store.appendIfNew(r).appended, true);
    assert.equal(store.appendIfNew(r).resighting, true, "the same render twice was stored twice");
    const all = store.readAll();
    assert.deepEqual(all.map((x) => x.record_type), ["observation", "observation", "resighting"]);
    assert.equal(all[0].content_sha256, raw.content_sha256, "the raw hash moved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 the state is part of the measurement: the same DOM at a different state is a NEW measurement, not a re-sighting", () => {
  const raw = rawOf("<html>raw</html>");
  const a = renderedObservation({ raw, result: resultOf("<html>x</html>", "PARTIAL"), environment: env, observedAt: "2026-09-13T00:00:00.000Z", documentUrl: "https://doc.example.com/a" });
  const b = renderedObservation({ raw, result: resultOf("<html>x</html>", "COMPLETE"), environment: env, observedAt: "2026-09-13T00:00:00.000Z", documentUrl: "https://doc.example.com/a" });
  assert.notEqual(a.measurement_key, b.measurement_key);
  assert.throws(() => renderedObservation({ raw: a, result: resultOf("<html>y</html>"), environment: env, observedAt: "x", documentUrl: "https://doc.example.com/a" }), /RAW_HTML observation/);
});

/* ---- LIVE: a real browser, offline --------------------------------------- */

const pw = await loadPlaywright();
let launched = null;
let skipLive = pw.unavailable ?? false;
if (!skipLive) {
  try {
    launched = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
  } catch (e) {
    skipLive = `no launchable Chromium here (${String(e.message).split("\n")[0]})`;
  }
}
test.after(async () => {
  await launched?.browser.close();
});

async function sentinel() {
  let hits = 0;
  const s = createServer((q, res) => ((hits += 1), res.end("sentinel")));
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  return { port: s.address().port, hits: () => hits, close: () => new Promise((r) => s.close(r)) };
}

test("🔴 LIVE CONTROL: the sentinel DOES count a request when nothing refuses it — so its zero below means something", { skip: skipLive }, async () => {
  const sen = await sentinel();
  const ctx = await launched.browser.newContext();
  try {
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${sen.port}/`);
    assert.ok(sen.hits() >= 1, "the sentinel could not see a request it was sent — its zero would prove nothing");
  } finally {
    await ctx.close();
    await sen.close();
  }
});

test("🔴 LIVE: EVERY outbound request is REFUSED and recorded by host — even to another port on 127.0.0.1 — with ZERO egress, and the page's own JS still runs", { skip: skipLive }, async () => {
  const sen = await sentinel();
  const body =
    `<!doctype html><html><head><script src="http://127.0.0.1:${sen.port}/s.js"></script><script src="/_next/static/chunk.js"></script></head>` +
    `<body><img src="https://img.example.org/a.png"><script>document.body.insertAdjacentHTML("beforeend", "<p id=js-ran>ran</p>");` +
    `fetch("/api/x").catch(() => {}); try { new WebSocket("ws://127.0.0.1:${sen.port}/ws"); } catch (e) {}</script></body></html>`;
  const docs = await startDocumentServer(new Map([["d1", { status: 200, contentType: "text/html; charset=utf-8", body }]]));
  const egress = [];
  try {
    const r = await renderDocument({ browser: launched.browser, origin: docs.origin, id: "d1", documentUrl: "https://site.example.com/guide/a", egress });
    assert.equal(sen.hits(), 0, "a request reached a server the renderer should have refused");
    assert.equal(r.renderState, "PARTIAL", "a page with refused scripts reported COMPLETE");
    assert.match(r.html, /<p id="js-ran">ran<\/p>/, "the page's inline JavaScript did not run");
    assert.equal(r.requests.byHost[`127.0.0.1:${sen.port}`]?.refused >= 1, true, "a request to another local port was not refused");
    assert.equal(r.requests.byHost["img.example.org"]?.refused, 1);
    assert.ok(r.requests.byHost["site.example.com"].refused >= 2, "same-host subresources were not refused under their real host");
    assert.equal(r.requests.servedLocal, 1);
    assert.equal(r.unaccounted, 0);
    assert.deepEqual([r.egressProof.nonLocal, r.egressProof.unverified], [[], []]);
    assert.deepEqual(egress.map((u) => new URL(u).hostname), ["127.0.0.1"]);
    assert.deepEqual(docs.requests, ["/doc/d1"]);
  } finally {
    await docs.close();
    await sen.close();
  }
});

test("🔴 LIVE: a page that asks for nothing renders COMPLETE, with its JavaScript's DOM", { skip: skipLive }, async () => {
  const body = `<!doctype html><html><body><script>document.body.append(Object.assign(document.createElement("div"), { id: "built" }))</script></body></html>`;
  const docs = await startDocumentServer(new Map([["d2", { status: 200, contentType: "text/html", body }]]));
  try {
    const r = await renderDocument({ browser: launched.browser, origin: docs.origin, id: "d2", documentUrl: "https://site.example.com/plain", egress: [] });
    assert.equal(r.renderState, "COMPLETE", r.reason);
    assert.equal(r.requests.refused, 0);
    assert.match(r.html, /<div id="built"><\/div>/);
  } finally {
    await docs.close();
  }
});

test("LIVE: an id the local server does not hold comes back as that server's own 404 — recorded as served from 127.0.0.1, not passed off as the page; a document never served is FAILED", { skip: skipLive }, async () => {
  const docs = await startDocumentServer(new Map());
  try {
    const r = await renderDocument({ browser: launched.browser, origin: docs.origin, id: "absent", documentUrl: "https://site.example.com/none", egress: [] });
    // The local server answers 404 for an unknown id; that 404 page is what was served, so it renders — and says so.
    assert.equal(r.requests.servedLocal, 1);
    assert.notEqual(r.renderState, "FAILED");
    const never = renderStateOf({ documentServed: false });
    assert.equal(never.renderState, "FAILED");
  } finally {
    await docs.close();
  }
});

/* ---- RECORDED: the real run over the 394 committed bodies ---------------- */

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RENDERED = createJsonlStore(`${REPO}runs/render/rendered-2026-09-13.jsonl`).readAll().filter((r) => r.record_type === "observation");
const RUN = readFileSync(`${REPO}runs/render/render-run-2026-09-13.txt`, "utf8");
const EVIDENCE = JSON.parse(readFileSync(`${REPO}runs/render/render-run-2026-09-13.json`, "utf8"));
const fileSha = (p) => createHash("sha256").update(readFileSync(`${REPO}${p}`)).digest("hex");

test("🔴 RECORDED: all 394 committed bodies rendered, and the three states are COUNTED with their bounds printed beside them", () => {
  assert.equal(RENDERED.length, 394);
  const count = (s) => RENDERED.filter((o) => o.value.renderState === s).length;
  assert.deepEqual([count("COMPLETE"), count("PARTIAL"), count("FAILED")], [0, 394, 0]);
  assert.deepEqual(EVIDENCE.states, { COMPLETE: 0, PARTIAL: 394, FAILED: 0 });
  assert.match(RUN, /RENDER STATES over 394 rendered of 394 stored bodies\r?\n\[bound: per-page timeout 15000 ms · max total wall clock 1800000 ms · hard page cap 500\]/);
  assert.match(RUN, /bounds hit: per-page timeout on 0 page\(s\) · wall clock not hit · page cap not hit/);
});

test("🔴 RECORDED: every observation carries RENDERED, its state and reason, the browser and Playwright versions, and its bounds", () => {
  for (const o of RENDERED) {
    assert.equal(o.value.renderMode, "RENDERED");
    assert.ok(RENDER_STATES.includes(o.value.renderState));
    assert.equal(o.method, `render.chromium:${o.value.renderState}`);
    assert.deepEqual([o.value.browser.version, o.value.playwright.package, o.value.playwright.version], ["151.0.7922.34", "playwright-core", "1.62.1"]);
    assert.deepEqual(o.value.bounds, RENDER_BOUNDS);
    if (o.value.requests.refused > 0) assert.notEqual(o.value.renderState, "COMPLETE", `${o.observation_id} refused a request and reads COMPLETE`);
    if (o.value.renderState === "PARTIAL") assert.match(o.value.reason, /LAW-ABSENT-1|did not settle/);
    assert.equal(Object.values(o.value.requests.byHost).reduce((n, h) => n + h.refused, 0), o.value.requests.refused, "the per-host record does not add up");
  }
});

test("🔴 RECORDED: ZERO EGRESS — every document from 127.0.0.1, no browser response from any other address, nothing unaccounted", () => {
  assert.deepEqual(EVIDENCE.egress, { nodeRequests: 394, nodeNonLocal: 0, browserResponses: 394, browserNonLocal: 0 });
  for (const o of RENDERED) {
    assert.deepEqual([o.value.egressProof.nonLocal, o.value.egressProof.unverified, o.value.unaccounted], [0, 0, 0], o.observation_id);
    assert.equal(o.value.requests.servedLocal, 1);
    assert.equal(o.value.documentServedFrom, "127.0.0.1");
  }
  assert.equal(RENDERED.reduce((n, o) => n + o.value.requests.refused, 0), 10222);
  assert.match(RUN, /egress: 394 Node request\(s\), 0 not to 127\.0\.0\.1 · 394 browser response\(s\), 0 from any address other than 127\.0\.0\.1/);
});

test("🔴 RECORDED: the raw observations are UNTOUCHED — same bytes as before the run — and every render points back to its raw one", () => {
  /* 🔴 PINNED AS GIT BLOBS, NOT AS CHECKED-OUT BYTES. The first pin was the sha256 of
   * the working-copy file — CRLF on the Windows machine that ran the render, LF on the
   * Linux CI runner — so the same unchanged file failed in CI. A blob id is what was
   * COMMITTED, independent of line endings; these are the ids on main before this PR
   * (9728f19). The run itself compared the bytes before and after, on one machine. */
  const blob = (p) => execFileSync("git", ["hash-object", p], { cwd: REPO, encoding: "utf8" }).trim();
  assert.equal(blob("runs/crawl/first-real-crawl-2026-09-12.jsonl"), "feabcaed628c8ffdd9a92df98b3ea463ab800ff7", "the raw observations changed");
  assert.equal(blob("runs/crawl/bodies-2026-09-12.jsonl.br"), "e7983d1a7976bc5970205b2965114b8567745c0a", "the raw archive changed");
  assert.equal(fileSha("runs/crawl/bodies-2026-09-12.jsonl.br"), "3d857a9e53fd4b015131bfd721788942a7c3df15b775e6633fb429bc84af3ded", "binary: its bytes do not depend on line endings");
  assert.deepEqual([EVIDENCE.input.rawUntouched, EVIDENCE.input.rawBefore.archive === EVIDENCE.input.rawAfter.archive, EVIDENCE.input.rawBefore.store === EVIDENCE.input.rawAfter.store], [true, true, true]);
  const raw = new Map(createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll().filter((r) => r.record_type === "observation").map((r) => [r.observation_id, r]));
  assert.equal(new Set(RENDERED.map((o) => o.value.source_observation_id)).size, 394);
  for (const o of RENDERED) {
    const r = raw.get(o.value.source_observation_id);
    assert.ok(r, `${o.observation_id} points at no raw observation`);
    assert.equal(r.value.renderMode, "RAW_HTML");
    assert.equal(o.value.raw_content_sha256, r.content_sha256);
    assert.deepEqual(o.target, r.target);
  }
});

test("🔴 RECORDED: the DIFFER count, and only the count — the run's transcript and evidence name no page", () => {
  assert.equal(RENDERED.filter((o) => o.value.bytes !== null && o.content_sha256 !== o.value.raw_content_sha256).length, 394);
  assert.deepEqual([EVIDENCE.differ.of, EVIDENCE.differ.count], [394, 394]);
  assert.ok(!/https?:\/\//.test(RUN), "the run's transcript names a URL");
  assert.ok(!/https?:\/\//.test(JSON.stringify(EVIDENCE)), "the run's evidence file names a URL");
});

test("RECORDED: the rendered bodies stay OUT of git with their size stated; the ledger holds both entries, every UNKNOWN with its reason", () => {
  const tracked = execFileSync("git", ["ls-files", "runs/render"], { cwd: REPO, encoding: "utf8" }).split("\n").filter(Boolean);
  assert.deepEqual(tracked.filter((f) => f.endsWith(".br")), []);
  assert.deepEqual([EVIDENCE.renderedArchive.committed, EVIDENCE.renderedArchive.domBytes, EVIDENCE.renderedArchive.compressedBytes], [false, 39886350, 661614]);
  const ledger = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll();
  const render = ledger.find((e) => e.entry_id === "render:2026-09-13T03:02:48.090Z");
  assert.deepEqual([render.money.amountState, render.money.amount, render.providerCalls.total, render.budget.used.urlsFetched, render.budget.used.requestsIssued], ["MEASURED", 0, 0, 0, 0]);
  assert.match(render.budget.zeroBasis, /D-CRW-5 green stays unspent/);
  assert.equal(render.founderTime.state, "MEASURED");
  const install = ledger.find((e) => e.entry_id === "tool-install:2026-09-13T02:54:16.342Z");
  assert.deepEqual([install.money.amountState, install.money.unknownKind], ["UNKNOWN", "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD"]);
  assert.ok(install.money.unknownReason.length > 40);
  assert.equal(install.budget.used.browserBytesDownloaded, 0);
  assert.match(install.budget.browserNote, /NOT downloaded by this run/);
});

test("🔴 NO ROW MOVED: item 10 and item 52 keep their states, and the renderer's code raises no issue and compares no render to its source", () => {
  assert.equal(classify()[10].state, "BUILT-NOT-PROVED");
  assert.equal(classify()[52].state, "BLOCKED-UNKNOWN");
  const code = ["src/render/renderer.mjs", "src/render/render-state.mjs"].map((f) => readFileSync(`${REPO}${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n");
  assert.ok(!/makeIssue|verdict|raw_content_sha256\s*[!=]==|[!=]==\s*\w*\.?raw_content_sha256/.test(code), "the renderer judges or compares");
});
