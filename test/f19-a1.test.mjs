/**
 * 🔴 RR-227 · F19 · ACCEPTANCE AMENDMENT 1 (_handoffs b6b3382; file e2a49c26…, contract 4bf4fac9…) — THE FIXTURE PROOFS.
 *
 *   B   the whole sitemap stored: every URL read, read = stored, a hash over the whole list; COMPLETE only when the root and every child
 *       was fetched whole and parsed, none skipped, every nested index followed — else PARTIAL with each cause; a byte bound and a
 *       timeout on every sitemap request; a listing past the store ceiling refused whole, the refusal recorded
 *   C   one tenant's sitemap re-collected (bin/crawl.mjs --research-batch --subject --sitemaps) into its own batch's sitemaps.jsonl only;
 *       refused with ZERO requests for another tenant's batch, a batch attached to none, a batch its subject does not name; dry run and
 *       owner green; the older capped writer retired; the engine holds no sitemap capture afterwards
 *   E   a research-batch crawl stores each body in its batch (bodies.jsonl, F31's format), its hash its observation's, a truncated body
 *       marked, a body past the ceiling counted and not stored, nothing in the engine's corpus; the preflight builds both new appends
 *   F31 reads the stored listing as not cut short and the stored bodies as measured, by its own UNCHANGED code (and a PARTIAL listing as
 *       cut short — the INCOMPLETE the RR-227 gate names); F02's tenant-scope census is unchanged.
 *
 * Fixtures only (RR-177): in-process fetches and the no-egress preload; no real page, no real request. Expectations are written by hand.
 * The production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

import { collectSitemap, sitemapListingRecord, storeCeilingDecision, recordLineBytes, BATCH_STORE_CEILING_BYTES, SITEMAP_BOUNDS } from "../src/crawl/sitemap-collect.mjs";
import { pageBodyRecords, bodiesUnderCeiling, BATCH_FILES } from "../src/crawl/batch-bodies.mjs";
import { collectSitemapUrls } from "../src/audit/sitemap-check.mjs";
import { preflightCrawlWrites, preflightSitemapWrite } from "../src/crawl/preflight.mjs";
import { readNewerCollections, mergeCollections, NEWER_FILES } from "../src/crawl/newer-collections.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { classifySitemapArtifact } from "../src/tenancy/sitemap-residency.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { census, classifyEntryPoint } from "../tools/tenant-scope-census.mjs";
import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const O = "https://site.invalid";

/* ── an in-process site: path → { status, body } | (url, init) => Response-like; every call counted ───────────────────────── */
function site(routes, { robots = "User-agent: *\nAllow: /\n" } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(String(url));
    const path = new URL(String(url)).pathname;
    if (path === "/robots.txt") return new Response(robots, { status: 200, headers: { "content-type": "text/plain" } });
    const r = routes[path];
    if (typeof r === "function") return r(url, init);
    if (!r) return new Response("not found", { status: 404 });
    return new Response(r.body, { status: r.status ?? 200, headers: { "content-type": "application/xml" } });
  };
  return { fetchImpl, calls };
}
const urlset = (paths) => ({ body: `<?xml version="1.0"?><urlset>${paths.map((p) => `<url><loc>${O}${p}</loc></url>`).join("")}</urlset>` });
const index = (children) => ({ body: `<?xml version="1.0"?><sitemapindex>${children.map((c) => `<sitemap><loc>${O}${c}</loc></sitemap>`).join("")}</sitemapindex>` });
const FAST = { intervalMs: 0, timeoutMs: 2000 };
const collect = (fetchImpl, bounds = {}, extra = {}) => collectSitemap({ origin: O, fetchImpl, bounds: { ...FAST, ...bounds }, ...extra });

/* ══════════ B · THE WHOLE SITEMAP, COLLECTED HONESTLY ══════════ */

test("B1 · WHOLE · an index whose children hold 21,000 URLs (more than the old 20,000 cap) is stored whole: read = stored, the hash covers every URL", async () => {
  const paths = (k) => Array.from({ length: 7000 }, (_, i) => `/p${k}-${i}`);
  const { fetchImpl } = site({ "/sitemap-index.xml": index(["/s1.xml", "/s2.xml", "/s3.xml"]), "/s1.xml": urlset(paths(1)), "/s2.xml": urlset(paths(2)), "/s3.xml": urlset(paths(3)) });
  const r = await collect(fetchImpl);
  assert.equal(r.coverageState, "COMPLETE", r.why);
  assert.equal(r.urls.length, 21000);
  const rec = sitemapListingRecord({ result: r, observedAt: "2026-10-08T00:00:00.000Z" });
  assert.deepEqual([rec.value.urlsTotal, rec.value.urlsStored, rec.value.urls.length], [21000, 21000, 21000], "the stored listing is not the whole listing");
  const expected = [...paths(1), ...paths(2), ...paths(3)].map((p) => `${O}${p}`);
  assert.equal(rec.value.urlsSha256, sha(JSON.stringify(expected)), "the hash does not cover the whole list, in order");
  assert.equal(rec.content_sha256, rec.value.urlsSha256);
  assert.equal(rec.value.storageBound, null, "a storage cap is still declared");
  assert.equal(rec.method, "sitemap.collect");
});

test("B2 · FAILED CHILD · a child answering 500 keeps the listing PARTIAL, counted — never COMPLETE with its URLs missing (RR-226 finding 1)", async () => {
  const ok = await collect(site({ "/sitemap-index.xml": index(["/s1.xml", "/s2.xml"]), "/s1.xml": urlset(["/a"]), "/s2.xml": urlset(["/b"]) }).fetchImpl);
  assert.equal(ok.coverageState, "COMPLETE", "CONTROL: with both children served the listing must be COMPLETE");
  const r = await collect(site({ "/sitemap-index.xml": index(["/s1.xml", "/s2.xml"]), "/s1.xml": urlset(["/a"]), "/s2.xml": { status: 500, body: "" } }).fetchImpl);
  assert.equal(r.coverageState, "PARTIAL");
  assert.equal(r.causes.childrenFailed, 1);
  assert.equal(r.childrenFetched, 1, "a failed child was counted as fetched");
  assert.deepEqual(r.urls, [`${O}/a`]);
  assert.match(r.why, /childrenFailed 1/);
});

test("B3 · BYTE BOUND · a child larger than the per-file byte bound is read only to the bound, marked truncated, and the listing is PARTIAL", async () => {
  const big = urlset(Array.from({ length: 400 }, (_, i) => `/long-path-${i}`));
  const { fetchImpl } = site({ "/sitemap-index.xml": index(["/s1.xml"]), "/s1.xml": big });
  const r = await collect(fetchImpl, { maxSitemapBytes: 2000 });
  assert.equal(r.causes.childrenTruncated, 1);
  assert.equal(r.coverageState, "PARTIAL");
  assert.ok(r.urls.length < 400, "a cut file yielded every URL — the bound was not applied");
  const whole = await collect(fetchImpl);
  assert.equal(whole.coverageState, "COMPLETE", "CONTROL: under the declared bound the same file is whole");
  assert.equal(SITEMAP_BOUNDS.maxSitemapBytes, 52428800, "the declared per-file bound moved");
});

test("B4 · UNPARSED · a child that is not a sitemap document (an HTML page) is PARTIAL, counted — never 'no URLs, COMPLETE'", async () => {
  const r = await collect(site({ "/sitemap-index.xml": index(["/s1.xml", "/s2.xml"]), "/s1.xml": urlset(["/a"]), "/s2.xml": { body: "<!doctype html><html><body>oops</body></html>" } }).fetchImpl);
  assert.equal(r.causes.childrenUnparsed, 1);
  assert.equal(r.coverageState, "PARTIAL");
});

test("B5 · SKIPPED · children past the children bound are not requested, counted, and the listing is PARTIAL", async () => {
  const kids = Array.from({ length: 12 }, (_, i) => `/s${i}.xml`);
  const routes = { "/sitemap-index.xml": index(kids) };
  for (const k of kids) routes[k] = urlset([`/x${k}`]);
  const { fetchImpl, calls } = site(routes);
  const r = await collect(fetchImpl);
  assert.deepEqual([r.childrenTotal, r.childrenFetched, r.causes.childrenSkipped, r.childrenSkipped], [12, 10, 2, 2]);
  assert.equal(r.coverageState, "PARTIAL");
  assert.equal(calls.filter((u) => /\/s\d+\.xml$/.test(u)).length, 10, "a skipped child was requested");
});

test("B6 · NESTED INDEX · a child index is FOLLOWED (its URLs read, COMPLETE); past the depth bound it is NOT followed, counted, PARTIAL", async () => {
  const routes = { "/sitemap-index.xml": index(["/inner.xml"]), "/inner.xml": index(["/leaf.xml"]), "/leaf.xml": urlset(["/deep"]) };
  const r = await collect(site(routes).fetchImpl);
  assert.equal(r.coverageState, "COMPLETE", r.why);
  assert.deepEqual(r.urls, [`${O}/deep`], "the nested index's children were not followed");
  assert.deepEqual([r.nestedIndexes, r.nestedIndexesFollowed], [1, 1]);
  const shallow = await collect(site(routes).fetchImpl, { maxIndexDepth: 1 });
  assert.equal(shallow.causes.nestedIndexesNotFollowed, 1);
  assert.equal(shallow.coverageState, "PARTIAL");
  assert.deepEqual(shallow.urls, []);
});

test("B7 · TIMEOUT · a sitemap request that never answers is aborted at the declared timeout, counted FAILED, and the listing is PARTIAL", async () => {
  const hang = (url, init) => new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const t0 = Date.now();
  const r = await collect(site({ "/sitemap-index.xml": index(["/s1.xml", "/slow.xml"]), "/s1.xml": urlset(["/a"]), "/slow.xml": hang }).fetchImpl, { timeoutMs: 100 });
  const elapsed = Date.now() - t0;
  assert.equal(r.causes.childrenFailed, 1);
  assert.equal(r.coverageState, "PARTIAL");
  assert.ok(elapsed < 5000, `the hung request was not aborted at its timeout (${elapsed} ms)`);
});

test("B8 · ROBOTS · a sitemap robots.txt disallows is not requested, counted; a disallowed root is UNKNOWN", async () => {
  const routes = { "/sitemap-index.xml": index(["/s1.xml", "/private/s2.xml"]), "/s1.xml": urlset(["/a"]), "/private/s2.xml": urlset(["/b"]) };
  const { fetchImpl, calls } = site(routes, { robots: "User-agent: *\nDisallow: /private/\n" });
  const r = await collect(fetchImpl);
  assert.equal(r.causes.childrenRobotsRefused, 1);
  assert.equal(r.coverageState, "PARTIAL");
  assert.ok(!calls.some((u) => u.includes("/private/")), "a disallowed sitemap was requested");
  const root = await collect(site(routes, { robots: "User-agent: *\nDisallow: /\n" }).fetchImpl);
  assert.equal(root.coverageState, "UNKNOWN");
  assert.deepEqual(root.urls, []);
});

test("B9 · SITE-HELD · a child on an origin the connector does not admit is never requested, counted, PARTIAL", async () => {
  const routes = { "/sitemap-index.xml": { body: `<sitemapindex><sitemap><loc>${O}/s1.xml</loc></sitemap><sitemap><loc>https://elsewhere.invalid/s2.xml</loc></sitemap></sitemapindex>` }, "/s1.xml": urlset(["/a"]) };
  const { fetchImpl, calls } = site(routes);
  const r = await collect(fetchImpl, {}, { admits: (u) => new URL(u).origin === O });
  assert.equal(r.causes.childrenOffSite, 1);
  assert.equal(r.coverageState, "PARTIAL");
  assert.ok(!calls.some((u) => u.startsWith("https://elsewhere.invalid")), "an undeclared origin was requested");
});

test("B10 · CEILING · at the ceiling a write fits; one byte past it is refused WHOLE; bodies past it are counted, never cut", () => {
  assert.equal(storeCeilingDecision({ existingBytes: 100, addBytes: 900, ceiling: 1000 }).fits, true);
  assert.equal(storeCeilingDecision({ existingBytes: 101, addBytes: 900, ceiling: 1000 }).fits, false);
  assert.equal(BATCH_STORE_CEILING_BYTES, 47185920, "the declared store ceiling moved");
  assert.ok(BATCH_STORE_CEILING_BYTES < 50 * 1000 * 1000, "the ceiling is not below the host's 50 MB warning");
  const recs = ["aa", "bbbb", "c"].map((body, i) => ({ record_type: "page_body", observation_id: `o${i}`, body, bytes: body.length }));
  const sizes = recs.map(recordLineBytes);
  const fit = bodiesUnderCeiling({ records: recs, existingBytes: 0, ceiling: sizes[0] + sizes[2] });
  assert.deepEqual(fit.kept.map((r) => r.observation_id), ["o0", "o2"], "a body was stored past the ceiling, or a fitting one dropped");
  assert.equal(fit.notStored.OVER_THE_BATCH_STORE_CEILING, 1);
  assert.deepEqual(fit.kept.map((r) => r.body), ["aa", "c"], "a kept body was cut");
});

test("B11 · FINDING 1 AT ITS SOURCE · the old collector's name now gives the honest answer: a failed child is PARTIAL", async () => {
  const fetchImpl = async (url) => (String(url).endsWith("sitemap-index.xml")
    ? { ok: true, status: 200, text: async () => `<sitemapindex><sitemap><loc>${O}/s1.xml</loc></sitemap><sitemap><loc>${O}/s2.xml</loc></sitemap></sitemapindex>` }
    : String(url).endsWith("s1.xml") ? { ok: true, status: 200, text: async () => `<urlset><url><loc>${O}/a</loc></url></urlset>` } : { ok: false, status: 503, text: async () => "" });
  const r = await collectSitemapUrls({ origin: O, fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.coverageState, "PARTIAL");
  assert.equal(r.causes.childrenFailed, 1);
});

/* ══════════ E · PURE · BODIES ARE THEIR OBSERVATIONS' ══════════ */

test("E1 · a body record is built only for its own observation: same hash, truncated flag carried; a mismatched body is refused", () => {
  const body = "<html>one</html>";
  const obs = [{ observation_id: "o1", content_sha256: sha(body), observed_at: "2026-10-08T00:00:00.000Z", value: { truncated: true } }];
  const [r] = pageBodyRecords({ observations: obs, bodies: new Map([["o1", body]]) });
  assert.deepEqual([r.record_type, r.observation_id, r.content_sha256, r.truncated, r.body], ["page_body", "o1", sha(body), true, body]);
  assert.equal(evidenceStateOf(r).state, "OBSERVED", "a page body record has no lawful evidence state");
  assert.throws(() => pageBodyRecords({ observations: obs, bodies: new Map([["o1", "<html>another</html>"]]) }), /BODY_NOT_ITS_OBSERVATIONS/);
});

test("E2 · PREFLIGHT · both new appends are built before any request: the bodies (crawl) and the listing (sitemaps); a refusing builder stops the run", async () => {
  const seen = {};
  const crawlPf = await preflightCrawlWrites({ build: { observations: () => {}, run: () => {}, cost: () => {}, bodies: (r) => { seen.bodies = pageBodyRecords({ observations: r.observations, bodies: r.bodies }).length; } } });
  assert.equal(crawlPf.ok, true);
  assert.ok(crawlPf.checks.some((c) => c.append === "page bodies" && c.ok), "the bodies append was not preflighted");
  assert.ok(seen.bodies >= 1, "the preflight built no body record");
  const refusing = await preflightCrawlWrites({ build: { observations: () => {}, run: () => {}, cost: () => {}, bodies: () => { throw new Error("refused"); } } });
  assert.equal(refusing.ok, false, "a refusing bodies builder did not stop the run");
  const smPf = await preflightSitemapWrite({ build: { sitemaps: (records) => { seen.listing = records[0]; } } });
  assert.deepEqual([smPf.ok, smPf.externalCalls, smPf.networkRequests, seen.listing?.method], [true, 0, 0, "sitemap.collect"]);
  const smRefused = await preflightSitemapWrite({ build: { sitemaps: () => { throw new Error("refused"); } } });
  assert.equal(smRefused.ok, false, "a refusing listing builder did not stop the run");
});

/* ══════════ C / E · THE BINARY, IN A DECLARED FIXTURE WORLD, NO EGRESS ══════════ */

const BATCH = "f19-a1-batch";
const SEEDS = ["/a", "/b", "/c"].map((p) => `${FIXTURE_SUBJECT_ORIGIN}${p}`);
/** A world whose fixture subject has ONE research batch: attached (to `tenant`, or to none) and a member (or not). */
function world({ attach = "fixture", member = true, seeds = SEEDS } = {}) {
  const W = declaredWorld({ extra: attach === "fixture" ? [["RESEARCH_BATCH", BATCH]] : [], secondTenantOrigins: attach === "second" ? ["https://second.invalid"] : [] });
  if (attach === "second") {
    const p = join(W.root, "tenancy", "attachments.json");
    const doc = JSON.parse(readFileSync(p, "utf8"));
    doc.attachments.push({ schemaVersion: 1, resourceKind: "RESEARCH_BATCH", resourceRef: BATCH, tenantId: SECOND_FIXTURE_TENANT, declaredOn: "2026-09-24", declarationBasis: doc.attachments[0].declarationBasis });
    writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
  }
  const roots = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  if (member) {
    const s = roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT);
    s.members = [...s.members, { resourceKind: "RESEARCH_BATCH", resourceRef: BATCH }];
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  }
  const dir = join(W.root, roots.stores.find((x) => x.store === "RESEARCH").path, BATCH);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "seeds.txt"), `# fixture seeds\n${seeds.join("\n")}\n`);
  return { W, dir };
}
function runBin(W, args, { mode, bin = "bin/crawl.mjs" }) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const storeDir = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f19-a1-"));
  const log = join(storeDir, "egress.json");
  try {
    const r = spawnSync(process.execPath, ["--import", PRELOAD, ...W.argv([bin, ...args])], {
      cwd: REPO, encoding: "utf8", timeout: 180000,
      env: { ...W.envWith(), [AUDIT_STORE_OVERRIDE_ENV]: storeDir, [AUDIT_RUN_ENV]: `f19-a1-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log },
    });
    const counts = existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null;
    const files = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name === "events.jsonl" && files.push(join(d, e.name))); };
    walk(storeDir);
    return { r, counts, events: files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))) };
  } finally { rmSync(storeDir, { recursive: true, force: true }); }
}
const committed = (events) => events.filter((e) => e.eventType === "GOVERNED_WRITE" && e.metadata?.governedWritePhase === "COMMITTED").map((e) => e.action).sort();
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const engineStatus = () => execFileSync("git", ["-C", REPO, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }).split("\n").filter((l) => l && !l.includes(".test-scratch") && !l.includes(TEST_SCRATCH_AUDIT_ROOT)).sort().join("\n");
const SITEMAPS = ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, "--sitemaps"];
const GREEN = ["--live", "--i-have-the-owners-green"];

test("C1 · RE-COLLECT · one tenant's sitemap into its own batch's sitemaps.jsonl ONLY — whole, COMPLETE, robots read first, one governed append, nothing in the engine", () => {
  const { W, dir } = world();
  const before = engineStatus();
  try {
    const { r, counts, events } = runBin(W, [...SITEMAPS, ...GREEN], { mode: "fixture" });
    assert.equal(r.status, 0, r.stdout.slice(-2000) + r.stderr.slice(-2000));
    assert.match(r.stdout, /PREFLIGHT\s+: PASS/);
    assert.match(r.stdout, /COLLECTION: KEPT/);
    assert.deepEqual(readdirSync(dir).sort(), ["seeds.txt", "sitemaps.jsonl"], "the re-collection wrote a file other than the batch's sitemaps.jsonl");
    const [l, ...more] = jsonl(join(dir, "sitemaps.jsonl"));
    assert.equal(more.length, 0);
    assert.deepEqual([l.method, l.value.coverageState, l.value.urlsTotal, l.value.urlsStored], ["sitemap.collect", "COMPLETE", 3, 3]);
    assert.deepEqual(l.value.urls.sort(), SEEDS.slice().sort(), "the listing is not the fixture site's three URLs");
    assert.deepEqual([counts.robots, counts.paths["/sitemap-index.xml"], counts.paths["/sitemap-1.xml"], counts.paths["/sitemap-2.xml"]], [1, 1, 1, 1], "not robots then index then each child once");
    assert.deepEqual(Object.keys(counts.hosts), [new URL(FIXTURE_SUBJECT_ORIGIN).host], "a host the subject does not declare was reached");
    assert.deepEqual(committed(events), ["APPEND_SITEMAP_LISTING"], "the re-collection made a governed write other than its one listing");
    assert.equal(engineStatus(), before, "the re-collection changed a file in the engine");
    /* residency: the engine holds no real sitemap capture — every tracked or untracked engine file the run could have touched is unchanged,
     * and the record it wrote IS a capture (a control that the classifier would have caught it there) */
    assert.equal(classifySitemapArtifact({ content: readFileSync(join(dir, "sitemaps.jsonl"), "utf8") }), "FORBIDDEN_REAL_OBSERVATIONS", "CONTROL: the residency classifier must see the written listing as a capture");
  } finally { W.cleanup(); }
});

test("C2 · REFUSED WITH ZERO REQUESTS · another tenant's batch, a batch attached to none, a batch the subject does not name", () => {
  for (const [label, opts, code] of [["another tenant's batch", { attach: "second" }, 3], ["a batch attached to none", { attach: "none" }, 3], ["a batch the subject does not name", { member: false }, 3]]) {
    const { W, dir } = world(opts);
    try {
      const { r, counts } = runBin(W, [...SITEMAPS, ...GREEN], { mode: "refuse" });
      assert.equal(r.status, code, `${label}: not refused (${r.status}) ${r.stderr.slice(-800)}`);
      assert.deepEqual([counts.fetch, counts.dns, counts.connect], [0, 0, 0], `${label}: a network call was made before the refusal`);
      assert.ok(!existsSync(join(dir, "sitemaps.jsonl")), `${label}: a refused run wrote a listing`);
      if (label === "a batch the subject does not name") assert.match(r.stderr, /BATCH_NOT_A_MEMBER_OF_THE_SUBJECT/);
    } finally { W.cleanup(); }
  }
});

test("C3 · DRY RUN and OWNER GREEN · no --live: the plan, ZERO requests, nothing written; --live without the green: refused, ZERO requests", () => {
  const { W, dir } = world();
  try {
    const dry = runBin(W, [...SITEMAPS, "--confirm"], { mode: "refuse" });
    assert.equal(dry.r.status, 0, dry.r.stderr.slice(-800));
    assert.match(dry.r.stdout, /SITEMAP PLAN \(DRY RUN/);
    assert.equal(dry.counts.fetch, 0, "a dry run issued a request");
    assert.ok(!existsSync(join(dir, "sitemaps.jsonl")), "a dry run wrote a listing");
    const nogreen = runBin(W, [...SITEMAPS, "--live"], { mode: "refuse" });
    assert.notEqual(nogreen.r.status, 0, "a live re-collection without the owner's green proceeded");
    assert.match(nogreen.r.stderr, /--live requires --i-have-the-owners-green/);
    assert.deepEqual([nogreen.counts.fetch, nogreen.counts.dns, nogreen.counts.connect], [0, 0, 0]);
  } finally { W.cleanup(); }
});

/** A store file already holding exactly `size` bytes: ONE valid JSONL line of filler (a store that is lawfully full, not a corrupt one). */
function prefill(path, size) {
  const head = '{"record_type":"filler","pad":"';
  const tail = '"}\n';
  writeFileSync(path, head + "x".repeat(size - head.length - tail.length) + tail);
  assert.equal(statSync(path).size, size);
}

test("C4 · CEILING · a listing that would put the batch's sitemap store past its ceiling is REFUSED WHOLE, the refusal recorded, the store untouched", () => {
  const { W, dir } = world();
  try {
    const file = join(dir, "sitemaps.jsonl");
    prefill(file, BATCH_STORE_CEILING_BYTES - 10);
    const { r, events } = runBin(W, [...SITEMAPS, ...GREEN], { mode: "fixture" });
    assert.equal(r.status, 1, r.stdout.slice(-800));
    assert.match(r.stderr, /REFUSED WHOLE — OVER_THE_BATCH_STORE_CEILING/);
    assert.equal(statSync(file).size, BATCH_STORE_CEILING_BYTES - 10, "the store changed — the listing was cut or partly written");
    assert.equal(events.filter((e) => e.action === "REFUSE_SITEMAP_LISTING_OVER_CEILING" && e.outcome === "REFUSED").length, 1, "the refusal was not recorded");
    assert.deepEqual(committed(events), [], "a governed write committed past the ceiling");
  } finally { W.cleanup(); }
});

test("C5 · THE OLDER CAPPED WRITER IS RETIRED · bin/audit-technical.mjs --sitemaps writes no listing, reaches nothing, and names the route", () => {
  const W = declaredWorld();
  const target = join(REPO, "runs", "evidence", "sitemaps.jsonl");
  const had = existsSync(target) ? statSync(target).size : "ABSENT";
  try {
    const { r, counts } = runBin(W, ["--sitemaps", `--subject=${FIXTURE_SUBJECT}`, "--confirm"], { mode: "refuse", bin: "bin/audit-technical.mjs" });
    assert.equal(r.status, 2, r.stdout.slice(-600) + r.stderr.slice(-600));
    assert.match(r.stderr, /RETIRED — --sitemaps no longer collects or writes a sitemap listing here/);
    assert.match(r.stderr, /bin\/crawl\.mjs --research-batch=<declared id> --tenant=<t> --subject=<s> --sitemaps/);
    assert.deepEqual([counts.fetch, counts.dns, counts.connect], [0, 0, 0]);
    assert.equal(existsSync(target) ? statSync(target).size : "ABSENT", had, "the retired writer wrote a listing into the engine");
    assert.doesNotMatch(readFileSync(join(REPO, "bin", "audit-technical.mjs"), "utf8"), /slice\(0, 20000\)|storageBound: 20000/, "the 20,000 cap is still in the writer");
  } finally { W.cleanup(); }
});

test("E3 · BODIES IN THE BATCH · each body stored in bodies.jsonl with its observation's hash; a body past the 2 MiB bound stored cut AND marked; nothing in the engine's corpus", () => {
  const seeds = [...SEEDS, `${FIXTURE_SUBJECT_ORIGIN}/big`];
  const { W, dir } = world({ seeds });
  const ENGINE_CORPUS = join(REPO, "runs", "crawl", "corpus");
  const corpusState = () => (existsSync(ENGINE_CORPUS) ? readdirSync(ENGINE_CORPUS).length : "ABSENT");
  const before = corpusState();
  try {
    const { r, events } = runBin(W, ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, ...GREEN], { mode: "fixture" });
    assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-1500));
    assert.equal(corpusState(), before, "a research-batch crawl wrote into the engine's corpus");
    const obs = jsonl(join(dir, "crawl.jsonl")).filter((x) => x.record_type === "observation");
    const bodies = jsonl(join(dir, "bodies.jsonl"));
    assert.equal(bodies.length, seeds.length, "a fetched body was not stored in the batch");
    for (const b of bodies) {
      const o = obs.find((x) => x.observation_id === b.observation_id);
      assert.ok(o, "a stored body names no observation of its batch");
      assert.equal(b.content_sha256, o.content_sha256, "a body's hash is not its observation's");
      assert.equal(sha(b.body), o.content_sha256, "the stored bytes do not hash to the observation");
    }
    const big = bodies.find((b) => obs.find((x) => x.observation_id === b.observation_id)?.target?.ref?.endsWith("/big"));
    assert.equal(big.truncated, true, "a body cut by the response bound is not marked truncated");
    assert.ok(Buffer.byteLength(big.body, "utf8") <= 2 * 1024 * 1024, "a body past the response bound was stored whole");
    const run = jsonl(join(dir, "crawl.jsonl")).find((x) => x.record_type === "crawl_run");
    assert.deepEqual([run.bodies.store, run.bodies.stored, run.bodies.notStored.OVER_THE_BATCH_STORE_CEILING], ["bodies.jsonl", seeds.length, 0]);
    assert.ok(!JSON.stringify(run).includes("<html"), "the run record carries page content");
    assert.deepEqual(committed(events), ["APPEND_CRAWL_BODIES", "APPEND_CRAWL_COST_ENTRY", "APPEND_CRAWL_OBSERVATIONS", "APPEND_CRAWL_RUN_RECORD"]);
    assert.ok(!events.some((e) => JSON.stringify(e).includes("<html")), "the audit trail carries page content");
  } finally { W.cleanup(); }
});

test("E4 · BODY CEILING · bodies that would put the batch's body store past its ceiling are COUNTED and NOT stored; their observations are kept", () => {
  const { W, dir } = world();
  try {
    const file = join(dir, "bodies.jsonl");
    prefill(file, BATCH_STORE_CEILING_BYTES - 50);
    const { r } = runBin(W, ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, ...GREEN], { mode: "fixture" });
    assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-1500));
    assert.equal(statSync(file).size, BATCH_STORE_CEILING_BYTES - 50, "a body was written past the ceiling, or cut to fit");
    const crawl = jsonl(join(dir, "crawl.jsonl"));
    assert.equal(crawl.filter((x) => x.record_type === "observation").length, SEEDS.length, "an observation was dropped with its body");
    const run = crawl.find((x) => x.record_type === "crawl_run");
    assert.deepEqual([run.bodies.stored, run.bodies.notStored.OVER_THE_BATCH_STORE_CEILING], [0, SEEDS.length], "the bodies not stored were not counted");
  } finally { W.cleanup(); }
});

test("F31 · READ BY F31'S UNCHANGED CODE · the stored listing is not cut short and its URLs are listed; the stored bodies are measured; a PARTIAL listing is cut short", () => {
  const { W, dir } = world();
  try {
    assert.equal(runBin(W, [...SITEMAPS, ...GREEN], { mode: "fixture" }).r.status, 0);
    assert.equal(runBin(W, ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, ...GREEN], { mode: "fixture" }).r.status, 0);
    const env = W.envWith();
    const newer = readNewerCollections({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env, batches: [BATCH] });
    assert.equal(newer.length, 1);
    assert.deepEqual([BATCH_FILES.SITEMAPS, BATCH_FILES.BODIES], [NEWER_FILES.SITEMAPS, NEWER_FILES.BODIES], "F19 writes files F31's reader does not read");
  const m = mergeCollections({ fixed: { batchId: "none", records: [], bodies: new Map(), sitemaps: [], edges: [] }, newer });
    assert.equal(m.sitemaps.length, 1, "F31 did not read the batch's listing");
    assert.equal(m.observations.length, SEEDS.length);
    for (const o of m.observations) assert.equal(typeof m.bodies.get(o.observation_id), "string", "F31 reads a stored body as NOT MEASURED");
    const v = scopeCompleteness({ origins: [FIXTURE_SUBJECT_ORIGIN], observations: m.observations, sitemaps: m.sitemaps, edges: m.edges, freshnessRule: { freshnessDays: 30 } });
    assert.deepEqual([v.basis.counts.sitemapCutShort, v.basis.counts.listedTotal, v.basis.counts.listedUnobserved], [0, 3, 0], "F31 reads the whole listing as cut short, or a listed URL as unobserved");
    assert.ok(!v.basis.reasons.includes("SITEMAP_CUT_SHORT"));
    const partial = { ...m.sitemaps[0], value: { ...m.sitemaps[0].value, coverageState: "PARTIAL" } };
    const vp = scopeCompleteness({ origins: [FIXTURE_SUBJECT_ORIGIN], observations: m.observations, sitemaps: [partial], edges: [], freshnessRule: { freshnessDays: 30 } });
    assert.equal(vp.state, "INCOMPLETE", "a PARTIAL listing let F31 say anything but INCOMPLETE");
    assert.equal(vp.basis.counts.sitemapCutShort, 1);
    const whole = scopeCompleteness({ origins: [FIXTURE_SUBJECT_ORIGIN], observations: m.observations, sitemaps: m.sitemaps, edges: [], freshnessRule: { freshnessDays: 30 } });
    assert.equal(whole.state, "COMPLETE", "CONTROL: the same records with the whole listing must be COMPLETE when nothing else is open");
  } finally { W.cleanup(); }
});

test("F02 · the tenant-scope census is unchanged: 114 entry points, 90 SCOPED · 18 EXCLUDED · 6 NOT_TENANT_GOVERNED; the crawler SCOPED", () => {
  const rows = census();
  const by = rows.reduce((m, r) => ((m[r.cls] = (m[r.cls] ?? 0) + 1), m), {});
  assert.equal(rows.length, 114);
  assert.deepEqual([by.SCOPED, by.EXCLUDED, by.NOT_TENANT_GOVERNED, by.UNSCOPED ?? 0], [90, 18, 6, 0]);
  const crawl = classifyEntryPoint("bin/crawl.mjs", readFileSync(join(REPO, "bin", "crawl.mjs"), "utf8"));
  assert.equal(crawl.cls, "SCOPED", crawl.why);
  const planted = readFileSync(join(REPO, "bin", "crawl.mjs"), "utf8").replace("RESOURCES.researchBatch(researchBatch), ", "");
  assert.equal(classifyEntryPoint("bin/crawl.mjs", planted).cls, "UNSCOPED", "CONTROL: the crawler without its batch named must be UNSCOPED");
  /* the batch's own sitemap store is named through F31's reader's constant (RESEARCH, the batch decided by F02); the census still reads a
   * literal sitemap-store name as the SHARED sitemap collection — shown here, so the crawler's SCOPED is not an accident of spelling */
  const literal = readFileSync(join(REPO, "bin", "crawl.mjs"), "utf8").replace("join(batchDir, BATCH_FILES.SITEMAPS)", 'join(batchDir, "sitemaps.jsonl")');
  const lit = classifyEntryPoint("bin/crawl.mjs", literal);
  assert.deepEqual([lit.cls, lit.missing], ["UNSCOPED", ["SITEMAPS"]], "CONTROL: a literal sitemap-store name in the crawler must read as the unnamed SITEMAPS family");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
