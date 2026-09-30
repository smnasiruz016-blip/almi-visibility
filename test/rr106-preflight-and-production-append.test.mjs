/**
 * RR-106 · THE RR-105 FAILURE, REPAIRED — evidence states for the three v0.2 record types, the preflight before any network activity,
 * and the PRODUCTION governed append tested directly (the path #209's tests never ran).
 *
 * In-process only: a synthetic site inside this process; the global fetch throws. The governed writes execute into a temp store, and
 * the audit store is confined by the verified test context (src/governance/governed-run.mjs) — the production trail is not written
 * (last test). No live page, no connector, no GREEN.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evidenceStateOf, adapterContext } from "../src/evidence/evidence-state-adapters.mjs";
import { syntheticRecordSet, preflightCrawlWrites, collectionVerdict, COLLECTED } from "../src/crawl/preflight.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { EVIDENCE_TYPES } from "../src/crawl/provenance.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const permission = writePermission({ target: LOCAL, argv: ["--confirm", "--actor=actor:cc"], env: {} });
const INSTANT = new Date().toISOString().slice(0, 19) + "Z";
/* the real builder, over a store in a temp directory */
const appendTo = (dir, records, n = 0) => governedStoreAppend({ repo: dir, auditRepo: REPO, permission, store: createJsonlStore(join(dir, "crawl.jsonl")), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_OBSERVATIONS", occurredAt: INSTANT, correlationId: `run:rr106-test:${n}`, discipline: "APPEND_IF_NEW" });
const withTemp = async (fn) => { const dir = mkdtempSync(join(tmpdir(), "rr106-")); try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } };

/* ================= §1 — the three evidence states ================= */

test("§1 · response_headers is OBSERVED (copied from the response); page_links and publication_date_claims are INFERRED from the observation they name", async () => {
  const { result } = await syntheticRecordSet();
  const ctx = adapterContext([...result.observations, ...result.evidence]);
  const of = (t) => result.evidence.find((e) => e.record_type === t);
  const h = evidenceStateOf(of(EVIDENCE_TYPES.HEADERS), ctx);
  assert.equal(h.state, "OBSERVED", h.why);
  const src = of(EVIDENCE_TYPES.HEADERS).source_observation_id;
  for (const t of [EVIDENCE_TYPES.LINKS, EVIDENCE_TYPES.DATE_CLAIMS]) {
    const s = evidenceStateOf(of(t), ctx);
    assert.equal(s.state, "INFERRED", `${t}: ${s.why}`);
    assert.deepEqual(s.inputRefs ?? s.metadata?.inputRefs ?? s.meta?.inputRefs, [`observation:${src}`], `${t} does not name its source observation as its input`);
  }
});

test("§1 · FIRING CONTROLS: a record missing what its state rests on is UNMAPPED — never placed by default", async () => {
  const { result } = await syntheticRecordSet();
  const of = (t) => result.evidence.find((e) => e.record_type === t);
  const drop = (r, k) => { const { [k]: _gone, ...rest } = r; return rest; };
  assert.equal(evidenceStateOf(drop(of(EVIDENCE_TYPES.HEADERS), "evidence_id")).unmapped, true);
  assert.equal(evidenceStateOf(drop(of(EVIDENCE_TYPES.HEADERS), "source_observation_id")).unmapped, true);
  assert.equal(evidenceStateOf({ ...of(EVIDENCE_TYPES.HEADERS), observed_at: "yesterday" }).unmapped, true);
  for (const t of [EVIDENCE_TYPES.LINKS, EVIDENCE_TYPES.DATE_CLAIMS]) assert.equal(evidenceStateOf(drop(of(t), "source_observation_id")).unmapped, true, `${t} placed with no input`);
  assert.equal(evidenceStateOf({ record_type: "mystery_evidence", measurement_key: "k" }).unmapped, true, "control: an undeclared type is still refused");
});

/* ================= §3 — the PRODUCTION governed append, executed ================= */

test("§3 · the PRODUCTION governed append COMMITS a full synthetic run — every observation kind and all three new record types land", async () => {
  await withTemp(async (dir) => {
    const { result } = await syntheticRecordSet();
    const records = [...result.observations, ...result.evidence];
    const out = executeGovernedWrite(appendTo(dir, records));
    assert.equal(out.outcome, "COMMITTED", JSON.stringify(out).slice(0, 300));
    const kept = createJsonlStore(join(dir, "crawl.jsonl")).readAll();
    const types = new Set(kept.map((r) => r.record_type));
    for (const t of ["observation", EVIDENCE_TYPES.HEADERS, EVIDENCE_TYPES.LINKS, EVIDENCE_TYPES.DATE_CLAIMS]) assert.ok(types.has(t), `${t} was not written`);
    assert.equal(kept.length, records.length);
  });
});

test("§3 · the PRODUCTION governed append REFUSES an unplaceable record — the whole write, nothing kept", async () => {
  await withTemp(async (dir) => {
    const { result } = await syntheticRecordSet();
    assert.throws(() => executeGovernedWrite(appendTo(dir, [...result.observations, { record_type: "mystery_evidence", measurement_key: "k" }])), /EVIDENCE_STATE_UNPLACEABLE/);
    assert.equal(existsSync(join(dir, "crawl.jsonl")), false, "a refused write left bytes behind");
  });
});

/* ================= §2 — the preflight, before any network activity ================= */

test("§2 · the PREFLIGHT drives the REAL builders over every record kind and passes — with zero network requests and nothing written", async () => {
  await withTemp(async (dir) => {
    const handed = new Set();
    const pf = await preflightCrawlWrites({ build: { observations: (r) => { for (const x of r) handed.add(x.record_type); return appendTo(dir, r); }, run: (run) => appendTo(dir, [run]), cost: () => ({}) } });
    assert.equal(pf.ok, true, JSON.stringify(pf.checks));
    for (const t of ["observation", EVIDENCE_TYPES.HEADERS, EVIDENCE_TYPES.LINKS, EVIDENCE_TYPES.DATE_CLAIMS]) assert.ok(handed.has(t), `the preflight never handed ${t} to the real builder`);
    assert.deepEqual([pf.networkRequests, pf.externalCalls], [0, 0]);
    for (const k of ["observation:crawl.fetch", "observation:crawl.skipped", "observation:crawl.fetch:error", EVIDENCE_TYPES.HEADERS, EVIDENCE_TYPES.LINKS, EVIDENCE_TYPES.DATE_CLAIMS]) assert.ok(pf.kinds.includes(k), `the preflight never produced ${k}`);
    assert.equal(existsSync(join(dir, "crawl.jsonl")), false, "the preflight EXECUTED a write — it must only build the descriptor");
  });
});

test("§2 · FIRING CONTROL: the preflight REFUSES when the real builder would refuse — ok false, the refusal named, zero network requests", async () => {
  await withTemp(async (dir) => {
    const pf = await preflightCrawlWrites({ build: { observations: (r) => appendTo(dir, [...r, { record_type: "mystery_evidence", measurement_key: "k" }]), run: (run) => appendTo(dir, [run]), cost: () => ({}) } });
    assert.equal(pf.ok, false);
    assert.match(pf.checks.find((c) => c.append === "observations and evidence").why, /EVIDENCE_STATE_UNPLACEABLE/);
    assert.deepEqual([pf.networkRequests, pf.externalCalls], [0, 0]);
  });
});

test("§2 · IN THE BINARY: the preflight runs before the connector, the IPv6 probe, DNS and the crawl, and a refusal exits 3", () => {
  const src = readFileSync(join(REPO, "bin/crawl.mjs"), "utf8");
  const at = (s) => { const i = src.indexOf(s); assert.ok(i >= 0, `${s} not found`); return i; };
  const pf = at("const pf = await preflightCrawlWrites(");
  for (const later of ["await measureIpv6Egress()", "await addressFamilies(", "openConnector({", "const result = await crawl("]) assert.ok(pf < at(later), `the preflight does not precede ${later}`);
  assert.match(src.slice(pf, pf + 2500), /if \(!pf\.ok\) \{[\s\S]*?process\.exit\(3\);/);
  assert.match(src, /\nif \(live\) \{\n  const PF_INSTANT = /, "the preflight is not run on every live run");
  assert.ok(src.slice(pf, pf + 2500).includes("observations: (records) => observationsAppend("), "the preflight does not use the live run's own builder");
  assert.ok(src.includes("executeGovernedWrite(observationsAppend("), "the live run does not use the builder the preflight checked");
});

/* ================= a failed write is never a successful collection ================= */

test("FIRING CONTROL: a failed or missing write is NOT KEPT — only every write committed is KEPT", () => {
  assert.equal(collectionVerdict({ observations: "COMMITTED", run: "COMMITTED", cost: "COMMITTED" }).verdict, COLLECTED.KEPT);
  assert.equal(collectionVerdict({ observations: "COMMITTED", run: "ALREADY_COMMITTED", cost: "COMMITTED" }).verdict, COLLECTED.KEPT);
  for (const bad of [{ observations: null }, { observations: "REFUSED", run: "COMMITTED" }, { observations: "COMMITTED", run: "COMMITTED", cost: "FAILED" }, {}]) {
    assert.equal(collectionVerdict(bad).verdict, COLLECTED.NOT_KEPT, JSON.stringify(bad));
  }
  assert.deepEqual(collectionVerdict({ observations: null }).failed, ["observations: NOT_REACHED"]);
  const src = readFileSync(join(REPO, "bin/crawl.mjs"), "utf8");
  assert.match(src, /catch \(e\) \{\s*console\.error\(`🔴 COLLECTION: \$\{collectionVerdict\(\{ observations: null \}\)\.verdict\}/, "the binary's refused-append path does not report NOT KEPT");
  assert.match(src, /if \(live && collection\.verdict !== "KEPT"\) process\.exitCode = 1;/);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
