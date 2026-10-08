/**
 * 🔴 RR-229 (c) · F19 ACCEPTANCE AMENDMENT 1 · THE REAL POPULATION — every sitemap listing and every batch body store the crawler has
 * committed to the data repository, censused COUNT-ONLY against every declared bound (A1 EVIDENCE: "the committed record of one real
 * tenant-scoped sitemap re-collection into a declared research batch (its listing whole, its counts stated) and of one real research-batch
 * crawl with its bodies stored in the batch, each censused count-only against every declared bound and never empty").
 *
 * GENERIC: the population is DISCOVERED (every research batch whose sitemaps.jsonl holds a listing of the A1 collector, and every batch body
 * store) — this file names no batch, subject, tenant or site. Each clause is a pure check that returns its faults; each check has a CONTROL
 * that drives it on a corrupted COPY of a real record (in memory) and requires it to fire — a census that cannot fail proves nothing.
 * Reads only; writes nothing; prints counts only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { SITEMAP_BOUNDS, BATCH_STORE_CEILING_BYTES } from "../src/crawl/sitemap-collect.mjs";
import { MAX_RESPONSE_BYTES } from "../src/crawl/fetcher.mjs";
import { DATA_ROOT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

const roots = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8"));
const research = roots.stores.find((s) => s.store === "RESEARCH");
const STORE = join(DATA_ROOT, research.path);
const attachments = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const batches = readdirSync(STORE, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const tenantOf = (batch) => attachments.find((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === batch)?.tenantId ?? null;
const originsOf = (tenant) => new Set(attachments.filter((a) => a.resourceKind === "SITE_ORIGIN" && a.tenantId === tenant).map((a) => originOf(a.resourceRef)));

/* THE POPULATIONS, discovered */
const LISTINGS = batches.flatMap((batch) => jsonl(join(STORE, batch, "sitemaps.jsonl"))
  .filter((r) => r.record_type === "observation" && r.method === "sitemap.collect" && r.collector === "bin/crawl.mjs" && r.collector_version === "2")
  .map((record) => ({ batch, record, fileBytes: statSync(join(STORE, batch, "sitemaps.jsonl")).size })));
const BODY_STORES = batches.filter((b) => existsSync(join(STORE, b, "bodies.jsonl"))).map((batch) => {
  const crawl = jsonl(join(STORE, batch, "crawl.jsonl"));
  return { batch, bodies: jsonl(join(STORE, batch, "bodies.jsonl")), observations: crawl.filter((r) => r.record_type === "observation"), runs: crawl.filter((r) => r.record_type === "crawl_run"), fileBytes: statSync(join(STORE, batch, "bodies.jsonl")).size };
});

/* ── THE CLAUSES: each a pure check over one listing or one body store, returning its faults ── */
export const LISTING_CHECKS = Object.freeze({
  WHOLE: ({ record: r }) => (r.value.urlsTotal === r.value.urls.length && r.value.urlsStored === r.value.urls.length && r.value.storageBound === null ? [] : ["the stored listing is not the whole listing read"]),
  HASH: ({ record: r }) => (r.value.urlsSha256 === sha(JSON.stringify(r.value.urls)) && r.content_sha256 === r.value.urlsSha256 ? [] : ["the hash does not cover the whole stored list"]),
  COVERAGE: ({ record: r }) => {
    const open = Object.values(r.value.causes ?? {}).reduce((n, x) => n + x, 0) + (r.value.childrenSkipped ?? 0);
    return r.value.coverageState === "COMPLETE" ? (open === 0 ? [] : ["COMPLETE with a cause open"]) : r.value.coverageState === "PARTIAL" ? (open > 0 ? [] : ["PARTIAL with no cause"]) : r.value.coverageState === "UNKNOWN" ? [] : ["an undeclared coverage state"];
  },
  BOUNDS: ({ record: r }) => {
    const b = r.value.bound ?? {};
    const f = [];
    for (const k of ["maxChildren", "maxSitemapBytes", "timeoutMs", "intervalMs", "maxIndexDepth"]) if (b[k] !== SITEMAP_BOUNDS[k]) f.push(`bound ${k} undeclared or not the declared value`);
    if (b.robots !== "HONOURED") f.push("robots not honoured");
    if (!(r.value.childrenFetched <= b.maxChildren)) f.push("more children fetched than the bound");
    if (!(r.value.requests <= 3 + b.maxChildren * 2)) f.push("more requests than robots, two root candidates and the children (each with one retry) allow");
    if ((r.value.pacing?.breaches ?? 1) !== 0) f.push("two requests closer than the declared interval");
    return f;
  },
  SITE_HELD: ({ batch, record: r }) => {
    const own = originsOf(tenantOf(batch));
    return own.size > 0 && originOf(r.value.origin) && own.has(originOf(r.value.origin)) && r.value.urls.every((u) => own.has(originOf(u))) ? [] : ["a listed URL or the collected origin is not a site origin of the batch's own tenant"];
  },
  CEILING: ({ fileBytes }) => (fileBytes <= BATCH_STORE_CEILING_BYTES ? [] : ["the sitemap store is past its ceiling"]),
  COUNT_ONLY: ({ record: r }) => (/<html|<body|<!doctype/i.test(JSON.stringify(r)) ? ["the listing record carries page content"] : []),
});
export const BODY_CHECKS = Object.freeze({
  OWN_OBSERVATION: ({ bodies, observations }) => { const ids = new Set(observations.map((o) => o.observation_id)); return bodies.every((b) => ids.has(b.observation_id)) ? [] : ["a stored body names no observation of its batch"]; },
  SAME_HASH: ({ bodies, observations }) => { const m = new Map(observations.map((o) => [o.observation_id, o])); return bodies.every((b) => b.content_sha256 === m.get(b.observation_id)?.content_sha256 && sha(b.body) === b.content_sha256) ? [] : ["a stored body is not its observation's bytes"]; },
  TRUNCATED_MARKED: ({ bodies, observations }) => { const m = new Map(observations.map((o) => [o.observation_id, o])); return bodies.every((b) => b.truncated === (m.get(b.observation_id)?.value?.truncated === true)) ? [] : ["a body's truncated flag is not its observation's"]; },
  RESPONSE_BOUND: ({ bodies }) => (bodies.every((b) => Buffer.byteLength(b.body, "utf8") <= MAX_RESPONSE_BYTES) ? [] : ["a body past the response bound is stored whole"]),
  CEILING: ({ fileBytes }) => (fileBytes <= BATCH_STORE_CEILING_BYTES ? [] : ["the body store is past its ceiling"]),
  RUN_COUNTS: ({ bodies, runs }) => { const counted = runs.filter((r) => r.bodies).reduce((n, r) => n + r.bodies.stored, 0); const ok = runs.filter((r) => r.bodies).every((r) => Number.isInteger(r.bodies.stored) && Object.values(r.bodies.notStored ?? {}).every(Number.isInteger)); return ok && counted === bodies.length ? [] : ["the run records do not count the bodies stored"]; },
  RECORD_COUNT_ONLY: ({ runs }) => (runs.some((r) => /<html|<body|<!doctype/i.test(JSON.stringify(r))) ? ["a run record carries page content"] : []),
});

test("F19 A1 · REAL · the populations are never empty: at least one A1 listing and one batch body store are committed", () => {
  assert.ok(LISTINGS.length >= 1, "no committed A1 sitemap listing — an empty population is not a pass");
  assert.ok(BODY_STORES.length >= 1, "no committed batch body store — an empty population is not a pass");
  console.log(`[F19 A1 REAL] listings ${LISTINGS.length} · URLs stored ${LISTINGS.reduce((n, l) => n + l.record.value.urlsStored, 0)} · COMPLETE ${LISTINGS.filter((l) => l.record.value.coverageState === "COMPLETE").length} · body stores ${BODY_STORES.length} · bodies ${BODY_STORES.reduce((n, s) => n + s.bodies.length, 0)} · truncated ${BODY_STORES.reduce((n, s) => n + s.bodies.filter((b) => b.truncated).length, 0)}`);
});
for (const [name, check] of Object.entries(LISTING_CHECKS)) {
  test(`F19 A1 · REAL LISTING · ${name}`, () => { for (const l of LISTINGS) assert.deepEqual(check(l), [], `${name} fails on a committed listing`); });
}
for (const [name, check] of Object.entries(BODY_CHECKS)) {
  test(`F19 A1 · REAL BODIES · ${name}`, () => { for (const s of BODY_STORES) assert.deepEqual(check(s), [], `${name} fails on a committed body store`); });
}

/* ── CONTROLS: each clause fires on a corrupted COPY of a real record (in memory; nothing is written) ── */
const clone = (x) => JSON.parse(JSON.stringify(x));
const L0 = () => clone(LISTINGS[0]);
const S0 = () => clone(BODY_STORES[0]);
const LISTING_CORRUPTIONS = {
  WHOLE: (l) => { l.record.value.urls.pop(); return l; },
  HASH: (l) => { l.record.value.urlsSha256 = "0".repeat(64); return l; },
  COVERAGE: (l) => { l.record.value.coverageState = "COMPLETE"; l.record.value.causes = { ...l.record.value.causes, childrenFailed: 1 }; return l; },
  BOUNDS: (l) => { l.record.value.bound.maxSitemapBytes += 1; return l; },
  SITE_HELD: (l) => { l.record.value.urls.push("https://another-site.invalid/x"); return l; },
  CEILING: (l) => { l.fileBytes = BATCH_STORE_CEILING_BYTES + 1; return l; },
  COUNT_ONLY: (l) => { l.record.value.note = "<html><body>x</body></html>"; return l; },
};
const BODY_CORRUPTIONS = {
  OWN_OBSERVATION: (s) => { s.bodies[0].observation_id = "not-an-observation"; return s; },
  SAME_HASH: (s) => { s.bodies[0].body += " "; return s; },
  TRUNCATED_MARKED: (s) => { s.bodies[0].truncated = !s.bodies[0].truncated; return s; },
  RESPONSE_BOUND: (s) => { s.bodies[0].body = "x".repeat(MAX_RESPONSE_BYTES + 1); return s; },
  CEILING: (s) => { s.fileBytes = BATCH_STORE_CEILING_BYTES + 1; return s; },
  RUN_COUNTS: (s) => { s.bodies.pop(); return s; },
  RECORD_COUNT_ONLY: (s) => { s.runs[0].note = "<html>x</html>"; return s; },
};
test("F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing", () => {
  assert.deepEqual(Object.keys(LISTING_CORRUPTIONS).sort(), Object.keys(LISTING_CHECKS).sort(), "a listing clause has no control");
  for (const [name, corrupt] of Object.entries(LISTING_CORRUPTIONS)) assert.ok(LISTING_CHECKS[name](corrupt(L0())).length > 0, `CONTROL ${name}: the clause did not fire on its corruption`);
});
test("F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store", () => {
  assert.deepEqual(Object.keys(BODY_CORRUPTIONS).sort(), Object.keys(BODY_CHECKS).sort(), "a body clause has no control");
  for (const [name, corrupt] of Object.entries(BODY_CORRUPTIONS)) assert.ok(BODY_CHECKS[name](corrupt(S0())).length > 0, `CONTROL ${name}: the clause did not fire on its corruption`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
