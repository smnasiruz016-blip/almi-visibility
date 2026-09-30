/**
 * F20 · STATUS, REDIRECT AND URL AUDIT (acceptance _handoffs f566059, RR-96).
 *
 * Every expected result below is written by hand from its fixture. Real partition data is read, never written; plants are made on
 * in-memory copies. Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditUrls, statusOf, redirectsOf, hrefForm, formKey, AUDIT_VERDICT } from "../src/audit/url-audit.mjs";
import { readClientUrlAudit } from "../src/audit/url-audit-reader.mjs";
import { readTenantPartition, readPartitionBodies, readPartitionEdges } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const obs = (id, v) => ({ observation_id: id, value: { requested_url: "https://a.example/p", final_url: "https://a.example/p", status: 200, redirect_chain: [], ...v } });
const page = (canonical, links = "") => `<html><head>${canonical === null ? "" : `<link rel="canonical" href="${canonical}">`}</head><body>${links}</body></html>`;
const real = () => {
  const resolve = createTenantResolver();
  const t = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId: t, resolve });
  return { resolve, tenantId: t, observations: part.records.filter((r) => r.record_type === "observation"), bodies: readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds }), edges: readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds }) };
};

/* ================= C1 — status ================= */

test("C1 · each observed URL has exactly one status; a recorded fetch error is NOT MEASURED, never broken; a linked-only URL is NOT MEASURED", () => {
  assert.equal(statusOf({ status: 200 }).state, "OK");
  assert.equal(statusOf({ status: 404 }).state, "CLIENT_ERROR");
  assert.equal(statusOf({ status: 503 }).state, "SERVER_ERROR");
  assert.equal(statusOf({ status: 304 }).state, "OTHER");
  assert.equal(statusOf({ status: null, error: "timeout" }).state, "NOT_MEASURED", "a failed fetch read as a status");
  assert.equal(statusOf({}).state, "NOT_MEASURED");
  const a = auditUrls({ observations: [obs("o1", {})], bodies: new Map([["o1", page("https://a.example/p")]]), edges: [{ to: "https://a.example/other" }, { to: "https://a.example/p/" }] });
  assert.equal(a.linkedOnly.urls, 1, "an observed page reached by a link in another form was counted as linked-only, or a linked-only URL was dropped");
  assert.equal(a.linkedOnly.status, "NOT_MEASURED");
});

/* ================= C2 — redirects ================= */

test("C2 · a recorded chain is NONE, CHAIN (hops counted) or LOOP; no recorded chain is NOT MEASURED", () => {
  assert.deepEqual(redirectsOf({ redirect_chain: [] }), { state: "NONE", hops: 0 });
  assert.deepEqual(redirectsOf({ requested_url: "a", redirect_chain: ["b", "c"] }), { state: "CHAIN", hops: 2 });
  assert.equal(redirectsOf({ requested_url: "a", redirect_chain: [{ url: "b" }, { url: "a" }] }).state, "LOOP", "a repeated location was not a loop");
  assert.equal(redirectsOf({ requested_url: "a", redirect_chain: ["b", "c", "b"] }).state, "LOOP");
  assert.deepEqual(redirectsOf({}), { state: "NOT_MEASURED", missing: "a recorded redirect chain" });
  const loop = auditUrls({ observations: [obs("o1", { redirect_chain: ["https://a.example/q", "https://a.example/p"] })], bodies: new Map([["o1", page("https://a.example/p")]]), edges: [] });
  assert.equal(loop.verdict, AUDIT_VERDICT.DISPROVED, "a loop did not disprove the audit");
});

/* ================= C3 — malformed URLs ================= */

test("C3 · FIRING CONTROL on REAL bodies: a malformed target planted in a real page is found; well-formed and non-web targets are not malformed", () => {
  assert.equal(hrefForm("https://a.example/x y", "https://a.example/").form, "MALFORMED");
  assert.equal(hrefForm("https://a.example\\x", "https://a.example/").form, "MALFORMED");
  assert.equal(hrefForm("http://[::1", "https://a.example/").form, "MALFORMED", "a string the WHATWG parser rejects read well-formed");
  assert.equal(hrefForm("/relative/path?q=1#top", "https://a.example/").form, "WELL_FORMED");
  assert.equal(hrefForm("mailto:someone", "https://a.example/").form, "NON_WEB");
  const { observations, bodies, edges } = real();
  const base = auditUrls({ observations, bodies, edges });
  const id = observations[0].observation_id;
  const planted = new Map(bodies);
  planted.set(id, bodies.get(id).replace(/<body\b[^>]*>/i, (m) => `${m}<a href="/bad path">x</a><a href="http://[::1">y</a><a href="tel:1">z</a>`));
  const a = auditUrls({ observations, bodies: planted, edges });
  assert.deepEqual([a.linkTargets.MALFORMED - base.linkTargets.MALFORMED, a.linkTargets.NON_WEB - base.linkTargets.NON_WEB], [2, 1], "a malformed target planted in a real body was missed, or a non-web scheme was called malformed");
  assert.equal(a.verdict, AUDIT_VERDICT.DISPROVED);
});

/* ================= C4 — preferred location ================= */

test("C4 · FIRING CONTROL on REAL bodies: a page linked in two forms, or canonical to another form of itself, is INCONSISTENT; no canonical is NOT MEASURED", () => {
  assert.equal(formKey("http://A.example/p/"), formKey("https://a.example/p"));
  const two = auditUrls({ observations: [obs("o1", {}), obs("o2", { requested_url: "https://a.example/q", final_url: "https://a.example/q" })], bodies: new Map([["o1", page("https://a.example/p")], ["o2", page("https://a.example/q", '<a href="https://a.example/p">1</a><a href="https://a.example/p/">2</a>')]]), edges: [] });
  assert.equal(two.preferredLocation.linkedInMoreThanOneForm, 1, "two forms of one page read consistent");
  const self = auditUrls({ observations: [obs("o1", {})], bodies: new Map([["o1", page("https://a.example/p/")]]), edges: [] });
  assert.equal(self.preferredLocation.canonicalInconsistent, 1, "a canonical naming another form of the page was missed");
  const none = auditUrls({ observations: [obs("o1", {})], bodies: new Map([["o1", page(null)]]), edges: [] });
  assert.deepEqual([none.preferredLocation.canonicalMissing, none.verdict], [1, AUDIT_VERDICT.COULD_NOT_PROVE], "a page without a canonical read consistent");
  /* on a REAL body: its canonical re-planted in another form of itself is found */
  const { observations, bodies, edges } = real();
  const o = observations[0];
  const u = new URL(o.value.final_url);
  const otherForm = u.pathname.endsWith("/") ? u.href.replace(/\/$/, "") : `${u.href}/`;
  const planted = new Map(bodies);
  planted.set(o.observation_id, bodies.get(o.observation_id).replace(/(<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["'])[^"']*/i, `$1${otherForm}`));
  assert.equal(auditUrls({ observations, bodies: planted, edges }).preferredLocation.canonicalInconsistent, 1, "a real canonical re-planted in another form was missed");
});

/* ================= C5 — verdict, real ================= */

test("C5 · FIRING CONTROL: PROVED only when nothing is open; REAL: observed and linked-only populations apart, verdict with its reasons", () => {
  assert.equal(auditUrls({ observations: [obs("o1", {})], bodies: new Map([["o1", page("https://a.example/p")]]), edges: [] }).verdict, AUDIT_VERDICT.PROVED);
  assert.equal(auditUrls({ observations: [obs("o1", {})], bodies: new Map([["o1", page("https://a.example/p")]]), edges: [{ to: "https://a.example/z" }] }).verdict, AUDIT_VERDICT.COULD_NOT_PROVE, "an unfetched linked URL left the audit PROVED");
  const { resolve, tenantId } = real();
  const r = readClientUrlAudit({ tenantId, resolve });
  assert.ok(r.audit.observed.urls > 0 && r.audit.linkTargets.bodiesRead === r.audit.observed.urls, "EMPTY population, or a body was not read");
  assert.equal(Object.values(r.audit.observed.status).reduce((a, b) => a + b, 0), r.audit.observed.urls);
  assert.match(r.bound, /linked-only URL\(s\), never fetched/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.audit)}`);
});

test("C5 · THE ENTRY POINT: in a declared world it prints this tenant's audit with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/url-audit.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readClientUrlAudit({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ observed URL\(s\)/);
    assert.match(ok.stdout, new RegExp(`observed\\s+${r.audit.observed.urls}:`), "the entry point printed another tenant's audit");
    assert.match(ok.stdout, /linked-only .* NOT MEASURED/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/url-audit.mjs", "src/audit/url-audit-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
