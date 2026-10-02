/**
 * 🔴 RR-135 · F19 · THE CRAWLER IS GENERIC, HELD TO THE DECLARED SITE, AND FOLLOWS REDIRECTS ONLY BY ITS OWN PACED HOPS.
 *
 * The owner, 2 Oct 2026: AlmiVisibility is a standalone product for ANY client and ANY declared product; a batch size is a test
 * population, never a product rule. What this file proves, each through the REAL bin/crawl.mjs live path (no egress, confined audit,
 * confined corpus) or the production fetcher:
 *   GENERIC     two unrelated declared sites — different subjects, different tenants, different origins, different batch sizes — run
 *               through the same code with no change, each writing only into its own batch.
 *   RESUMABLE   the same batch run twice: no saved observation is duplicated, the second run is recorded as a second run, and the
 *               first run's audit history is still there.
 *   SITE-HELD   a seed outside the subject's declared site origins, and an empty seed list, are each REFUSED before the first request
 *               (0 network calls); a redirect to an undeclared origin is recorded and NOT followed.
 *   PACED HOPS  a redirect hop is its own request: paced at the declared interval, counted, recorded in the chain — on the production
 *               fetcher against a local fixture server with the platform's own fetch, and in the binary.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { declaredWorld, inputPathRef, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";
import { createFetcher, MAX_REDIRECT_HOPS } from "../src/crawl/fetcher.mjs";
import { createRobotsCache } from "../src/crawl/robots.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;

/* SITE B — unrelated to the fixture subject in every declared respect */
const B_SUBJECT = "second-client-site";
const B_ORIGIN = "https://second-client.invalid";
const A_BATCH = "generic-batch-a", B_BATCH = "generic-batch-b";

/** One world, two clients: A (the fixture subject, the fixture tenant) and B (its own subject, origin and tenant). Seeds per batch. */
function twoClientWorld({ aSeeds, bSeeds }) {
  const WORLD = declaredWorld({ extra: [["RESEARCH_BATCH", A_BATCH], ["RESEARCH_BATCH", B_BATCH], ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: A_BATCH });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: B_BATCH }],
    connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  mkdirSync(join(WORLD.root, B_SUBJECT), { recursive: true });
  const research = roots.stores.find((x) => x.store === "RESEARCH");
  const dirs = {};
  for (const [batch, seeds] of [[A_BATCH, aSeeds], [B_BATCH, bSeeds]]) {
    dirs[batch] = join(WORLD.root, research.path, batch);
    mkdirSync(dirs[batch], { recursive: true });
    writeFileSync(join(dirs[batch], "seeds.txt"), `# test population\n${seeds.join("\n")}\n`);
  }
  /* B's batch belongs to B's tenant */
  const attPath = join(WORLD.root, "tenancy", "attachments.json");
  const att = JSON.parse(readFileSync(attPath, "utf8"));
  for (const a of att.attachments) if (a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === B_BATCH) a.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(attPath, JSON.stringify(att, null, 2) + "\n");
  return { WORLD, dirs, attPath };
}

/** Declare a confined corpus directory to a tenant (it is an input path the run names). */
function declareCorpus(attPath, dir, tenantId) {
  const att = JSON.parse(readFileSync(attPath, "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(dir), tenantId });
  writeFileSync(attPath, JSON.stringify(att, null, 2) + "\n");
}

/** Spawn the REAL binary, no egress, with an explicit tenant; a store dir may be shared across runs to read history. */
function runBin(WORLD, { tenantId, subject, batch, corpus, mode = "fixture", storeDir = null }) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const own = storeDir === null;
  const dir = storeDir ?? mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f19-generic-"));
  const log = join(dir, `egress-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  try {
    const args = ["bin/crawl.mjs", `--research-batch=${batch}`, `--subject=${subject}`, "--live", "--i-have-the-owners-green", `--corpus=${corpus}`, `--tenant=${tenantId}`, "--actor=actor:cc"];
    const r = spawnSync(process.execPath, ["--import", PRELOAD, ...args], { cwd: REPO, encoding: "utf8", timeout: 120000,
      env: { ...WORLD.envWith(), [AUDIT_STORE_OVERRIDE_ENV]: dir, [AUDIT_RUN_ENV]: `f19-generic-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log } });
    const counts = existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null;
    return { r, counts, events: readEvents(dir) };
  } finally { if (own) rmSync(dir, { recursive: true, force: true }); }
}
function readEvents(dir) {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name === "events.jsonl" && files.push(join(d, e.name))); };
  walk(dir);
  return files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
}
const kept = (dir) => (existsSync(join(dir, "crawl.jsonl")) ? readFileSync(join(dir, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const byType = (records) => records.reduce((m, x) => ((m[x.record_type] = (m[x.record_type] ?? 0) + 1), m), {});
const scratch = (p) => { mkdirSync(join(REPO, ".test-scratch"), { recursive: true }); return mkdtempSync(join(REPO, ".test-scratch", p)); };
const calls = (c) => (c ? c.fetch + c.dns + c.connect + c.otherEgress : "NOT MEASURED");
const A = (p) => `${FIXTURE_SUBJECT_ORIGIN}${p}`, Bu = (p) => `${B_ORIGIN}${p}`;

test("GENERIC · two unrelated declared sites, different tenants and batch sizes, through the same code — each KEPT into its own batch only", () => {
  const { WORLD, dirs, attPath } = twoClientWorld({ aSeeds: [A("/a"), A("/b"), A("/c")], bSeeds: [Bu("/one"), Bu("/two")] });
  const ca = scratch("f19-gen-a-"), cb = scratch("f19-gen-b-");
  try {
    declareCorpus(attPath, ca, FIXTURE_TENANT);
    declareCorpus(attPath, cb, SECOND_FIXTURE_TENANT);
    const a = runBin(WORLD, { tenantId: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: A_BATCH, corpus: ca });
    assert.equal(a.r.status, 0, `site A did not complete: ${a.r.stderr.slice(-400)}`);
    const b = runBin(WORLD, { tenantId: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, batch: B_BATCH, corpus: cb });
    assert.equal(b.r.status, 0, `site B did not complete: ${b.r.stderr.slice(-400)}`);
    for (const [run, dir, n, origin] of [[a, dirs[A_BATCH], 3, FIXTURE_SUBJECT_ORIGIN], [b, dirs[B_BATCH], 2, B_ORIGIN]]) {
      assert.match(run.r.stdout, /COLLECTION: KEPT/);
      const t = byType(kept(dir));
      assert.equal(t.observation, n, "each batch keeps exactly its own pages");
      assert.equal(t.crawl_run, 1);
      assert.deepEqual(Object.keys(run.counts.hosts), [new URL(origin).host], "a run read a host that is not its own declared site");
      assert.equal(run.counts.robots, 1);
      assert.equal(run.counts.pages, n);
      assert.equal(kept(dir).filter((x) => x.record_type === "observation").every((o) => o.value.requested_url.startsWith(origin)), true);
    }
    /* the two runs differ in size and site, and share every line of code — nothing above names either site */
    assert.notEqual(a.counts.pages, b.counts.pages);
  } finally { rmSync(ca, { recursive: true, force: true }); rmSync(cb, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("RESUMABLE · the same batch run twice: no saved observation duplicated, the second run recorded as a second run, the first run's audit history kept", () => {
  const { WORLD, dirs, attPath } = twoClientWorld({ aSeeds: [A("/a"), A("/b")], bSeeds: [Bu("/one")] });
  const ca = scratch("f19-res-a-");
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const store = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f19-resume-"));
  try {
    declareCorpus(attPath, ca, FIXTURE_TENANT);
    const first = runBin(WORLD, { tenantId: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: A_BATCH, corpus: ca, storeDir: store });
    assert.equal(first.r.status, 0, first.r.stderr.slice(-400));
    const afterFirst = kept(dirs[A_BATCH]);
    const firstEvents = first.events.map((e) => JSON.stringify(e));
    const second = runBin(WORLD, { tenantId: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: A_BATCH, corpus: ca, storeDir: store });
    assert.equal(second.r.status, 0, second.r.stderr.slice(-400));
    const afterSecond = kept(dirs[A_BATCH]);
    assert.equal(byType(afterSecond).observation, byType(afterFirst).observation, "resuming duplicated a saved observation");
    assert.equal(byType(afterSecond).observation, 2);
    assert.equal(byType(afterSecond).crawl_run, 2, "the second run was not recorded as a second run");
    const now = new Set(second.events.map((e) => JSON.stringify(e)));
    assert.ok(firstEvents.length > 0);
    assert.equal(firstEvents.filter((e) => !now.has(e)).length, 0, "the first run's audit history was lost");
    assert.ok(second.events.length > first.events.length);
  } finally { rmSync(ca, { recursive: true, force: true }); rmSync(store, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("SITE-HELD · a seed outside the declared site, and an empty seed list, are REFUSED before the first request — 0 network calls", () => {
  const { WORLD, dirs, attPath } = twoClientWorld({ aSeeds: [A("/a"), Bu("/not-a-site-of-this-subject")], bSeeds: [] });
  const ca = scratch("f19-held-a-"), cb = scratch("f19-held-b-");
  try {
    declareCorpus(attPath, ca, FIXTURE_TENANT);
    declareCorpus(attPath, cb, SECOND_FIXTURE_TENANT);
    const off = runBin(WORLD, { tenantId: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: A_BATCH, corpus: ca, mode: "refuse" });
    assert.equal(off.r.status, 3, off.r.stderr.slice(-400));
    assert.match(off.r.stderr, /SEED_OUTSIDE_DECLARED_SITE: 1 of 2/);
    assert.equal(calls(off.counts), 0, "a refused run made a network call");
    assert.equal(kept(dirs[A_BATCH]).length, 0);
    const empty = runBin(WORLD, { tenantId: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, batch: B_BATCH, corpus: cb, mode: "refuse" });
    assert.equal(empty.r.status, 3, empty.r.stderr.slice(-400));
    assert.match(empty.r.stderr, /NO_SEEDS/);
    assert.equal(calls(empty.counts), 0, "a refused run made a network call");
  } finally { rmSync(ca, { recursive: true, force: true }); rmSync(cb, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("SITE-HELD · in the binary, a redirect to the same declared site is followed by a PACED hop; one to an undeclared origin is recorded and NOT followed", () => {
  const { WORLD, dirs, attPath } = twoClientWorld({ aSeeds: [A("/redirect-in"), A("/redirect-out")], bSeeds: [Bu("/one")] });
  const ca = scratch("f19-redir-a-");
  try {
    declareCorpus(attPath, ca, FIXTURE_TENANT);
    const run = runBin(WORLD, { tenantId: FIXTURE_TENANT, subject: FIXTURE_SUBJECT, batch: A_BATCH, corpus: ca });
    assert.equal(run.r.status, 0, run.r.stderr.slice(-400));
    assert.deepEqual(Object.keys(run.counts.hosts), [new URL(FIXTURE_SUBJECT_ORIGIN).host], "an undeclared origin was requested");
    assert.equal(run.counts.fetch, 4, "robots + 2 seeds + 1 same-site hop");
    const recs = kept(dirs[A_BATCH]);
    const obs = recs.filter((x) => x.record_type === "observation");
    const inn = obs.find((o) => o.value.requested_url.endsWith("/redirect-in"));
    const out = obs.find((o) => o.value.requested_url.endsWith("/redirect-out"));
    assert.equal(inn.value.status, 200);
    assert.equal(inn.value.final_url, A("/a"));
    assert.equal(inn.value.redirect_chain.length, 1);
    assert.equal(out.value.status, 301);
    assert.equal(out.value.redirect_not_followed, "ORIGIN_NOT_ADMITTED");
    const runRec = recs.find((x) => x.record_type === "crawl_run");
    assert.equal(runRec.requestsIssued, 3, "the hop is a counted request");
    assert.equal(runRec.redirects.hopsFollowed, 1);
    assert.equal(runRec.redirects.notFollowed.ORIGIN_NOT_ADMITTED, 1);
    assert.equal(runRec.pacing.gaps, 3);
    assert.equal(runRec.pacing.breaches, 0, "a redirect hop was not paced");
    assert.ok(runRec.pacing.starts.some((s) => s.kind === "redirect"));
  } finally { rmSync(ca, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("PACED HOPS · the production fetcher against a local server, with the platform's own fetch: hops paced, counted, chained; an unadmitted target is not requested; the hop bound holds", async () => {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push({ path: req.url, at: performance.now() });
    if (req.url === "/r1") { res.writeHead(301, { location: "/r2" }); return res.end(); }
    if (req.url === "/r2") { res.writeHead(302, { location: "/final" }); return res.end(); }
    if (req.url === "/away") { res.writeHead(301, { location: "http://127.0.0.2:1/elsewhere" }); return res.end(); }
    if (req.url.startsWith("/loop")) { const n = Number(req.url.slice(5) || 0); res.writeHead(301, { location: `/loop${n + 1}` }); return res.end(); }
    if (req.url === "/robots.txt") { res.writeHead(301, { location: "/robots-moved.txt" }); return res.end(); }
    res.writeHead(200, { "content-type": "text/html" }); res.end("<title>ok</title>");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const admits = (u) => new URL(u).origin === origin;
    /* the pacer bounds request STARTS (RR-108). A server sees ARRIVALS, and an earlier request can be delayed in transit (connection
     * setup, a loaded machine), so the gap between two ARRIVALS can fall short of the start gap — RR-137's full suite measured 91 ms
     * against a 200 ms interval with a 50 ms tolerance. The load-independent invariant, on ONE clock (server and client share this
     * process): no request ARRIVES sooner than the full interval after the previous request was SENT. */
    const INTERVAL = 200;
    const sent = [];
    const f = createFetcher({ fetchImpl: (u, i) => { sent.push(performance.now()); return globalThis.fetch(u, i); }, intervalMs: INTERVAL, admits });
    const r = await f.fetchUrl(`${origin}/r1`);
    assert.equal(r.status, 200);
    assert.equal(r.finalUrl, `${origin}/final`);
    assert.deepEqual(r.redirectChain.map((h) => h.status), [301, 302]);
    assert.equal(f.requestsIssued(), 3);
    assert.deepEqual(seen.map((s) => s.path), ["/r1", "/r2", "/final"]);
    assert.equal(sent.length, seen.length);
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i].at - sent[i - 1] >= INTERVAL, `request ${i} arrived ${(seen[i].at - sent[i - 1]).toFixed(1)} ms after the previous one was sent`);
    assert.equal(f.pacing().breaches, 0);
    assert.ok(f.pacing().fastestGapMs >= INTERVAL, "a hop started before the interval");

    seen.length = 0;
    const away = await f.fetchUrl(`${origin}/away`);
    assert.equal(away.status, 301);
    assert.equal(away.redirectNotFollowed, "ORIGIN_NOT_ADMITTED");
    assert.deepEqual(seen.map((s) => s.path), ["/away"]);

    seen.length = 0;
    const loop = await f.fetchUrl(`${origin}/loop0`);
    assert.equal(loop.redirectNotFollowed, "MAX_HOPS");
    assert.equal(loop.redirectChain.length, MAX_REDIRECT_HOPS);
    assert.equal(seen.length, MAX_REDIRECT_HOPS + 1);

    /* robots.txt is never followed: a redirected robots.txt fails CLOSED */
    seen.length = 0;
    const robots = createRobotsCache({ fetchImpl: (u, i) => globalThis.fetch(u, i) });
    const v = await robots.check(`${origin}/page`);
    assert.equal(v.allowed, false);
    assert.equal(v.state, "UNKNOWN");
    assert.deepEqual(seen.map((s) => s.path), ["/robots.txt"]);
  } finally { await new Promise((r) => server.close(r)); }
});

test("the production trail is untouched", () => assert.equal(trailSha(), TRAIL_BEFORE));
