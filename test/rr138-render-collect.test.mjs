/**
 * 🔴 RR-138 §2 · THE SHARED RENDER COLLECTION — refused before any request, bounded when it runs, stored once, read only by the rows
 * it names. Every run here is IN-PROCESS: test/helpers/no-egress-preload.mjs answers every request (nothing leaves the machine), the
 * audit store is confined, the corpus is confined. No live render call is made by this file.
 *   R1  before ANY request: no GREEN · no storage permission · an evidence batch that is not clean · a batch outside the tenant — each
 *       refused with 0 network calls
 *   R2  the run: a THIRD-PARTY subresource refused (never requested) · a script's POST refused (no login or payment can leave) · 401
 *       and 402 routes refused · one fetch per resource per page however many renders read it · KEPT through the governed path ·
 *       every record names the rows that read it
 *   R3  the TOTAL ceiling cannot be exceeded, robots and documents included
 *   R4  each row reads ONLY the records that name it; a body failing its hash is not read; the two rows give separate verdicts
 *   R5  GENERIC: a second, unrelated subject on another tenant and origin, through the same code
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { loadPlaywright } from "../src/render/renderer.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PW = await loadPlaywright();
const NO_BROWSER = PW.unavailable ? `no browser here: ${PW.unavailable}` : false;
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const FSLOG = pathToFileURL(join(REPO, "test", "helpers", "fs-read-log-preload.mjs")).href;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const B_SUBJECT = "second-client-site", B_ORIGIN = "https://second-client.invalid";

function world() {
  const WORLD = declaredWorld({ extra: [["RESEARCH_BATCH", "src-a"], ["RESEARCH_BATCH", "ev-a"], ["RESEARCH_BATCH", "src-b"], ["RESEARCH_BATCH", "ev-b"], ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: "src-a" }, { resourceKind: "RESEARCH_BATCH", resourceRef: "ev-a" });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: "src-b" }, { resourceKind: "RESEARCH_BATCH", resourceRef: "ev-b" }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  mkdirSync(join(WORLD.root, B_SUBJECT), { recursive: true });
  const att = JSON.parse(readFileSync(join(WORLD.root, "tenancy", "attachments.json"), "utf8"));
  for (const a of att.attachments) if (a.resourceRef === "src-b" || a.resourceRef === "ev-b") a.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(join(WORLD.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2) + "\n");
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "rr138-corpus-"));
  const research = join(WORLD.root, roots.stores.find((s) => s.store === "RESEARCH").path);
  const source = (id, origin, paths) => {
    mkdirSync(join(research, id), { recursive: true });
    writeFileSync(join(research, id, "crawl.jsonl"), paths.map((p, i) => {
      const body = `<html><body><p>stored ${p}</p></body></html>`;
      writeFileSync(join(corpus, `${id}-${i}.html`), body);
      return JSON.stringify({ record_type: "observation", method: "crawl.fetch", observation_id: `${id}-${i}`, content_sha256: sha(body), target: { kind: "url", ref: `${origin}${p}` }, value: { status: 200, requested_url: `${origin}${p}`, final_url: `${origin}${p}` } });
    }).join("\n") + "\n");
  };
  source("src-a", FIXTURE_SUBJECT_ORIGIN, ["/doc-rich", "/p1"]);
  source("src-b", B_ORIGIN, ["/q1"]);
  for (const e of ["ev-a", "ev-b"]) mkdirSync(join(research, e), { recursive: true });
  return { WORLD, corpus, research };
}

function collect(WORLD, corpus, { tenant = FIXTURE_TENANT, subject = FIXTURE_SUBJECT, source = "src-a", evidence = "ev-a", extra = ["--live", "--i-have-the-owners-green", "--confirm"], mode = "fixture", more = [] } = {}) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const store = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "rr138-"));
  const log = join(store, "egress.json"), reads = join(store, "reads.json");
  try {
    const r = spawnSync(process.execPath, ["--import", PRELOAD, "--import", FSLOG, "bin/render-collect.mjs", `--source-batch=${source}`, `--evidence-batch=${evidence}`, `--subject=${subject}`, `--tenant=${tenant}`, "--actor=actor:cc", `--corpus=${corpus}`, ...extra, ...more],
      { cwd: REPO, encoding: "utf8", timeout: 300000, env: { ...WORLD.envWith(), [AUDIT_STORE_OVERRIDE_ENV]: store, [AUDIT_RUN_ENV]: `rr138-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log, FS_READ_LOG: reads } });
    return { r, counts: existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null, reads: existsSync(reads) ? JSON.parse(readFileSync(reads, "utf8")) : [] };
  } finally { rmSync(store, { recursive: true, force: true }); }
}
const calls = (c) => (c ? c.fetch + c.dns + c.connect + c.otherEgress : "NOT MEASURED");
const jsonl = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const audit = (WORLD, corpus, binName, { tenant = FIXTURE_TENANT, subject = FIXTURE_SUBJECT, source = "src-a", evidence = "ev-a" } = {}) =>
  spawnSync(process.execPath, [binName, `--research-batch=${source}`, `--evidence-batch=${evidence}`, `--subject=${subject}`, `--tenant=${tenant}`, "--actor=actor:cc", `--corpus=${corpus}`], { cwd: REPO, encoding: "utf8", timeout: 120000, env: WORLD.envWith() });

test("R1 · refused BEFORE any request: no GREEN, no storage permission, an evidence batch that is not clean, a batch outside the tenant — 0 network calls each", () => {
  const { WORLD, corpus, research } = world();
  try {
    const noGreen = collect(WORLD, corpus, { extra: ["--live", "--confirm"], mode: "refuse" });
    assert.equal(noGreen.r.status, 3); assert.match(noGreen.r.stderr, /NO_GREEN/); assert.equal(calls(noGreen.counts), 0);
    const noStore = collect(WORLD, corpus, { extra: ["--live", "--i-have-the-owners-green"], mode: "refuse" });
    assert.equal(noStore.r.status, 3); assert.match(noStore.r.stderr, /STORAGE_PERMISSION_MISSING/); assert.equal(calls(noStore.counts), 0);
    writeFileSync(join(research, "ev-a", "render.jsonl"), "{}\n");
    const dirty = collect(WORLD, corpus, { mode: "refuse" });
    assert.equal(dirty.r.status, 3); assert.match(dirty.r.stderr, /NOT_CLEAN/); assert.equal(calls(dirty.counts), 0);
    rmSync(join(research, "ev-a", "render.jsonl"));
    const foreign = collect(WORLD, corpus, { evidence: "ev-b", mode: "refuse" });
    assert.equal(foreign.r.status, 3, "another tenant's evidence batch was accepted"); assert.equal(calls(foreign.counts), 0);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("R2 · the run: third-party refused and never requested; a script's POST refused; 401/402 refused; one fetch per resource per page; KEPT; every record names its readers; the sealed directory never read", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus, research } = world();
  try {
    const { r, counts, reads } = collect(WORLD, corpus);
    assert.equal(r.status, 0, r.stdout.slice(-700) + r.stderr.slice(-500));
    assert.match(r.stdout, /PREFLIGHT\s+: PASS/);
    assert.match(r.stdout, /COLLECTION: KEPT/);
    assert.deepEqual(Object.keys(counts.hosts), [new URL(FIXTURE_SUBJECT_ORIGIN).host], "a host other than the declared site was requested");
    assert.equal(counts.paths["/app.js"], 1, "a resource was fetched more than once for one page");
    assert.equal(counts.paths["/api"] ?? 0, 0, "a POST left");
    const recs = jsonl(join(research, "ev-a", "render.jsonl"));
    const run = recs.find((x) => x.record_type === "render_run");
    for (const k of ["UNDECLARED_HOST", "METHOD_NOT_ALLOWED", "AUTH_OR_PAYMENT"]) assert.ok((run.refusedByReason[k] ?? 0) >= 1, `${k} was not refused`);
    assert.equal(run.requestsIssued, counts.fetch, "the run's own count differs from what actually left");
    assert.ok(run.requestsIssued <= run.bounds.maxTotalRequests);
    assert.equal(run.pacing.ok, true);
    const obs = recs.filter((x) => x.record_type === "observation");
    assert.equal(obs.length, 6, "3 renders × 2 pages");
    const readers = Object.fromEntries(obs.map((o) => [o.value.kind, o.value.readBy.join("+")]));
    assert.deepEqual(readers, { SOURCE: "F22", DESKTOP: "F22+F25", MOBILE: "F25" });
    assert.doesNotMatch(readFileSync(join(research, "ev-a", "render.jsonl"), "utf8"), /<html|scripted words|stored \//, "page content in the stored record");
    assert.ok(readdirSync(corpus).some((f) => f.endsWith(".render.html")), "no rendered body kept");
    assert.deepEqual(reads.filter((p) => /case-study-01/.test(p)), [], "the sealed exam directory was read");
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("R3 · the TOTAL request ceiling cannot be exceeded — robots, documents and subresources all count", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus, research } = world();
  try {
    const { r, counts } = collect(WORLD, corpus, { more: ["--max-total-requests=3"] });
    assert.equal(counts.fetch <= 3, true, `${counts.fetch} requests left against a ceiling of 3`);
    const run = jsonl(join(research, "ev-a", "render.jsonl")).find((x) => x.record_type === "render_run");
    assert.equal(run.bounds.maxTotalRequests, 3);
    assert.ok((run.refusedByReason.RUN_CAP ?? 0) + (run.refusedByReason.DOCUMENT_RUN_CAP ?? 0) >= 1, "the ceiling never refused");
    assert.ok(r.status === 0 || r.status === 1);
    const raise = collect(WORLD, corpus, { evidence: "ev-a", more: ["--max-total-requests=100000"], mode: "refuse" });
    assert.equal(raise.r.status, 2, "the ceiling could be RAISED");
    assert.equal(calls(raise.counts), 0);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("R4 · each row reads ONLY the records that name it; a body failing its hash is not read; F22 and F25 give separate verdicts", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus, research } = world();
  try {
    assert.equal(collect(WORLD, corpus).r.status, 0);
    const f22 = audit(WORLD, corpus, "bin/render-audit.mjs");
    const f25 = audit(WORLD, corpus, "bin/mobile-audit.mjs");
    assert.equal(f22.status, 0, f22.stderr.slice(-300)); assert.equal(f25.status, 0, f25.stderr.slice(-300));
    assert.match(f22.stdout, /read by F22 for 2 of 2 page\(s\) · records not naming F22 skipped 2 · bodies failing their hash 0/);
    assert.match(f25.stdout, /read by F25 for 2 of 2 page\(s\) · records not naming F25 skipped 2 · bodies failing their hash 0/);
    assert.match(f22.stdout, /LINKS\s+/); assert.match(f25.stdout, /TAP TARGETS\s+/);
    assert.doesNotMatch(f22.stdout, /TAP TARGETS/); assert.doesNotMatch(f25.stdout, /CANONICAL/);
    /* tamper one stored DESKTOP body — chosen by its record, not by file order (a MOBILE body is one F22 never reads) */
    const desktop = jsonl(join(research, "ev-a", "render.jsonl")).find((x) => x.value?.kind === "DESKTOP" && x.value.renderState !== "FAILED");
    writeFileSync(join(corpus, `${desktop.observation_id}.render.html`), "<html>tampered</html>");
    const again = audit(WORLD, corpus, "bin/render-audit.mjs");
    assert.match(again.stdout, /bodies failing their hash [1-9]/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("R5 · GENERIC — an unrelated subject on another tenant and origin through the same collector", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus, research } = world();
  try {
    const { r, counts } = collect(WORLD, corpus, { tenant: SECOND_FIXTURE_TENANT, subject: B_SUBJECT, source: "src-b", evidence: "ev-b" });
    assert.equal(r.status, 0, r.stdout.slice(-700) + r.stderr.slice(-400));
    assert.deepEqual(Object.keys(counts.hosts), [new URL(B_ORIGIN).host]);
    assert.equal(jsonl(join(research, "ev-b", "render.jsonl")).filter((x) => x.record_type === "observation").length, 3);
    assert.doesNotMatch(r.stdout, /https?:\/\/|\.invalid/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("R6 · the PREFLIGHT refuses a write F04 would refuse, and an append-if-new record without a dedupe key — before any request; a keepable set passes (control)", async () => {
  const { preflightRenderWrites } = await import("../src/render/render-preflight.mjs");
  const descriptor = { action: { name: "APPEND_RENDER_EVIDENCE", scopeType: "TENANT", tenantId: "t", occurredAt: "2026-10-02T00:00:00Z" }, adapter: { repoRelativeTarget: "x" } };
  const allow = () => ({ allowed: true, outcome: "AUTHORISED" });
  const refuse = () => ({ allowed: false, outcome: "ACTION_UNSUPPORTED" });
  const key = (r) => (r.k ?? null);
  const base = { permission: { actorRef: "actor:cc" }, dedupeKeyOf: key };
  const ok = preflightRenderWrites({ ...base, authorise: allow, attempts: [{ what: "w", records: [{ k: "1" }], needsKey: true, build: () => descriptor }] });
  assert.equal(ok.ok, true, "CONTROL: a keepable set did not pass");
  const f04 = preflightRenderWrites({ ...base, authorise: refuse, attempts: [{ what: "w", build: () => descriptor }] });
  assert.equal(f04.ok, false); assert.match(f04.checks[0].why, /AUTHORISATION_REFUSED/);
  const keyless = preflightRenderWrites({ ...base, authorise: allow, attempts: [{ what: "w", records: [{ k: "1" }, {}], needsKey: true, build: () => descriptor }] });
  assert.equal(keyless.ok, false); assert.match(keyless.checks[0].why, /NO_DEDUPE_KEY/);
  const unplaceable = preflightRenderWrites({ ...base, authorise: allow, attempts: [{ what: "w", build: () => { throw Object.assign(new Error("no rule"), { code: "EVIDENCE_STATE_UNPLACEABLE" }); } }] });
  assert.equal(unplaceable.ok, false); assert.match(unplaceable.checks[0].why, /EVIDENCE_STATE_UNPLACEABLE/);
  assert.equal(preflightRenderWrites({ ...base, authorise: allow, attempts: [] }).ok, false, "an empty preflight passed");
});

test("R7 · the TOTAL ceiling holds INSIDE a resource: a redirect hop that would pass it is never sent", async () => {
  const { createSameOriginPolicy } = await import("../src/render/same-origin-policy.mjs");
  const sent = [];
  const fetchImpl = async (u) => {
    sent.push(new URL(u).pathname);
    if (new URL(u).pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { status: 200 });
    if (new URL(u).pathname === "/hop") return new Response(null, { status: 301, headers: { location: "/target.js" } });
    return new Response("x", { status: 200 });
  };
  const policy = createSameOriginPolicy({ fetchImpl, admits: (u) => new URL(u).origin === "https://site.invalid", bounds: { maxRequestsPerPage: 50, maxTotalRequests: 2, intervalMs: 0, timeoutMs: 1000, maxResponseBytes: 1000 } });
  const r = await policy.forPage().resolve("https://site.invalid/hop");
  assert.equal(r.served, false);
  assert.deepEqual(sent, ["/robots.txt", "/hop"], "a request past the total ceiling was sent");
  assert.equal(policy.requestsIssued(), 2);
});

test("R8 · a script that sends the page elsewhere is refused (NAVIGATION_AWAY): nothing from elsewhere enters, and the render is PARTIAL, never COMPLETE", { skip: NO_BROWSER }, async () => {
  const { launchOfflineChromium, startDocumentServer, renderDocument } = await import("../src/render/renderer.mjs");
  const { browser } = await launchOfflineChromium({ chromium: PW.chromium, playwrightVersion: PW.version });
  const server = await startDocumentServer(new Map([["n", { body: `<html><body><p id="here">requested page</p><script>location.href = "/somewhere-else";</script></body></html>` }]]));
  try {
    const r = await renderDocument({ browser, origin: server.origin, id: "n", documentUrl: "https://site.invalid/n", egress: [], subresources: async () => ({ served: true, status: 200, contentType: "text/html", body: Buffer.from("<html><body>ELSEWHERE</body></html>") }) });
    assert.equal(r.requests.refusedByReason.NAVIGATION_AWAY, 1);
    /* Chromium keeps no DOM of the requested page once a navigation away is aborted — so the render cannot be a measurement of it:
     * the refusal makes it PARTIAL (every compared dimension NOT MEASURED), and nothing of the page elsewhere was served */
    assert.equal(r.renderState, "PARTIAL");
    assert.doesNotMatch(r.html ?? "", /ELSEWHERE/);
  } finally { await browser.close(); await server.close(); }
});

test("the production trail is untouched", () => assert.equal(trailSha(), TRAIL_BEFORE));
