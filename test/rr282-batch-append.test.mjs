/**
 * RR-282 · ONE WRITE PER BATCH — the governed append lands a batch of records in one write, deciding each record exactly as before.
 *
 * Measured on this machine (RR-282 item 3): each append to a large store costs about as much as the whole file (a 10 MB store, about
 * 1.8 s per append, one line or six), so the builder's twelve pages cost ~20 s. The store's appendAllIfNew decides each record as
 * appendIfNew does — new, or a re-sighting, in order — and lands the same lines, in the same order, in one append.
 *
 * In-process only: temp stores; the audit store is confined by the verified test context; the global fetch throws; the production
 * trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { syntheticRecordSet } from "../src/crawl/preflight.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { storeAppendAdapter } from "../src/governance/durability-adapters.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const permission = writePermission({ target: LOCAL, argv: ["--confirm", "--actor=actor:cc"], env: {} });
const INSTANT = new Date().toISOString().slice(0, 19) + "Z";
const SEEN = "2026-10-17T00:00:00.000Z";
const withTemp = (fn) => { const dir = mkdtempSync(join(tmpdir(), "rr282-")); try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } };
const bytes = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

test("RR-282 · ONE WRITE PER BATCH · FIRING CONTROL: a batch lands the same lines, in the same order, as the records appended one by one — new records, a record the store holds and a repeat inside the batch each decided alone; a record that throws stops the batch with every line before it written", async () => {
  const { result } = await syntheticRecordSet();
  const records = [...result.observations, ...result.evidence].filter((r) => r.measurement_key);
  assert.ok(records.length >= 3, "the synthetic run has too few keyed records to show anything");
  withTemp((dir) => {
    const one = createJsonlStore(join(dir, "one.jsonl")), all = createJsonlStore(join(dir, "all.jsonl"));
    one.appendIfNew(records[0], { seenAt: SEEN }); all.appendIfNew(records[0], { seenAt: SEEN });
    /* the batch: new records, one the store already holds, and a repeat of a record earlier in the same batch */
    const batch = [...records.slice(1), records[0], records[1]];
    const r1 = batch.map((r) => one.appendIfNew(r, { seenAt: SEEN }));
    const r2 = all.appendAllIfNew(batch, { seenAt: SEEN });
    assert.deepEqual(r2, r1, "a record was decided otherwise in a batch");
    assert.equal(bytes(all.path), bytes(one.path), "the batch did not land the same lines in the same order");
    assert.deepEqual(r2.slice(-2).map((x) => x.resighting), [true, true], "a held record, or a repeat inside the batch, was appended again");
    /* a record that throws: every line decided before it is written, as before; nothing after it */
    const t1 = createJsonlStore(join(dir, "t1.jsonl")), t2 = createJsonlStore(join(dir, "t2.jsonl"));
    const broken = [records[0], { record_type: "observation" }, records[1]];
    assert.throws(() => { for (const r of broken) t1.appendIfNew(r, { seenAt: SEEN }); }, /no measurement_key/);
    assert.throws(() => t2.appendAllIfNew(broken, { seenAt: SEEN }), /no measurement_key/);
    assert.equal(bytes(t2.path), bytes(t1.path), "a throw lost the lines decided before it, or wrote one after it");
    assert.equal(bytes(t2.path).split("\n").filter(Boolean).length, 1);
  });
});

test("RR-282 · ONE WRITE PER BATCH · THE GOVERNED APPEND: the production append hands the whole batch to the store at once, never record by record, and its verify still counts every line — a batch that lands one line short fails the write", async () => {
  const { result } = await syntheticRecordSet();
  const records = [...result.observations, ...result.evidence];
  withTemp((dir) => {
    const real = createJsonlStore(join(dir, "crawl.jsonl"));
    const calls = { all: [], one: 0 };
    const store = { ...real, appendAllIfNew: (rs, o) => { calls.all.push(rs.length); return real.appendAllIfNew(rs, o); }, appendIfNew: (r, o) => { calls.one += 1; return real.appendIfNew(r, o); } };
    const out = executeGovernedWrite(governedStoreAppend({ repo: dir, auditRepo: REPO, permission, store, records, targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_OBSERVATIONS", occurredAt: INSTANT, correlationId: "run:rr282-test:0", discipline: "APPEND_IF_NEW" }));
    assert.equal(out.outcome, "COMMITTED", JSON.stringify(out).slice(0, 300));
    assert.deepEqual([calls.all, calls.one], [[records.length], 0], "the governed append did not hand the batch to the store at once");
    assert.equal(real.readAll().length, records.length);
    /* the verify is unchanged: a batch that lands one line short is caught */
    const short = createJsonlStore(join(dir, "short.jsonl"));
    const adapter = storeAppendAdapter({ repo: dir, repoRelativeTarget: "short.jsonl", targetClass: "GENERATED_CONFIG", store: short, records: records.slice(0, 3), keyOf: short.dedupeKeyOf,
      append: (s, r) => s.appendIfNew(r), appendAll: (s, rs) => s.appendAllIfNew(rs.slice(0, 2)).concat([{ appended: true }]), occurrenceScope: "x" });
    adapter.commit();
    assert.deepEqual(adapter.verify().map((f) => f.code), ["OCCURRENCE_COUNT_WRONG"], "a batch one line short was not caught");
  });
});

test("the production trail is untouched by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
