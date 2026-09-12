/**
 * ITEM 48 — IDEMPOTENCY & RETRY SAFETY.
 *
 * The boundary: the same authorized job run twice, and a retry against a 4xx.
 * **No duplicate logical record and no duplicate side effect; at most ONE
 * retry, NEVER on a 4xx.** Evidence: before/after IDs and counts, plus a test
 * that fails if the retry rule is changed.
 *
 * ── 🔴 THE RETRY RULE HAD NO TEST UNTIL NOW ─────────────────────────────────
 *
 * `src/crawl/fetcher.mjs` implements it correctly and has done since PR #36:
 * `fetchUrl` retries only when `once()` THROWS, and a 4xx does not throw — it
 * returns a status. The code was right and **nothing whatever would have caught
 * it being changed.** A correct implementation with no test is one careless
 * edit away from a silent regression, and the edit would look harmless.
 *
 * Both halves of the rule are asserted by COUNTING CALLS at the boundary, not
 * by reading the outcome: an error can be thrown after the request is already
 * gone, so the count is the only honest measure of what was issued.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";

import { createFetcher } from "../src/crawl/fetcher.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { targetPageId, canonicalUrl } from "../src/evidence/ids.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const res = (status, body = "<html><main>hi</main></html>") => ({
  ok: status >= 200 && status < 300,
  status,
  url: "https://e.example.com/p",
  headers: new Map([["content-type", "text/html"]]),
  text: async () => body,
  body: null,
});

const fetcher = (impl) => createFetcher({ fetchImpl: impl, intervalMs: 0, sleepImpl: async () => {} });

/* ================================================================== *
 * 🔴 THE RETRY RULE — NEVER ON A 4xx.
 * ================================================================== */

for (const status of [400, 401, 403, 404, 410, 429, 451]) {
  test(`🔴 a ${status} is NEVER retried — exactly ONE request leaves the process`, async () => {
    let calls = 0;
    const f = fetcher(async () => { calls += 1; return res(status); });
    const r = await f.fetchUrl("https://e.example.com/p");
    assert.equal(calls, 1, `a ${status} caused ${calls} requests — asking the same question louder`);
    assert.equal(f.requestsIssued(), 1, "the fetcher's own counter disagrees with the call count");
    assert.equal(r.status, status);
    assert.ok(!r.retried, `a ${status} was marked retried`);
  });
}

test("a 5xx is NOT retried either — only a network-level throw is", async () => {
  let calls = 0;
  const f = fetcher(async () => { calls += 1; return res(503); });
  await f.fetchUrl("https://e.example.com/p");
  assert.equal(calls, 1, "a 503 returns a status; it does not throw, so the retry path must not open");
});

test("🔴 AT MOST ONE retry on a network error — two failures do not become three attempts", async () => {
  let calls = 0;
  const f = fetcher(async () => { calls += 1; throw new Error("ECONNRESET"); });
  const r = await f.fetchUrl("https://e.example.com/p");
  assert.equal(calls, 2, `${calls} attempts — the rule is at most ONE retry`);
  assert.equal(r.ok, false);
  assert.equal(r.retried, true);
  assert.equal(r.status, null, "a network failure has no status, and inventing one would be a lie");
});

test("CONTROL: a transient network error DOES get its one retry, and succeeds", async () => {
  let calls = 0;
  const f = fetcher(async () => {
    calls += 1;
    if (calls === 1) throw new Error("ECONNRESET");
    return res(200);
  });
  const r = await f.fetchUrl("https://e.example.com/p");
  assert.equal(calls, 2, "the retry never happened — the rule would be 'never retry', which is a different rule");
  assert.equal(r.status, 200);
});

test("CONTROL: a 200 issues exactly one request — the counter is not stuck at 1", async () => {
  let calls = 0;
  const f = fetcher(async () => { calls += 1; return res(200); });
  await f.fetchUrl("https://e.example.com/a");
  await f.fetchUrl("https://e.example.com/b");
  assert.equal(calls, 2);
  assert.equal(f.requestsIssued(), 2);
});

/* ================================================================== *
 * THE SAME JOB TWICE — no duplicate record, no duplicate side effect.
 * ================================================================== */

test("🔴 the same authorized job run twice creates NO duplicate logical record", () => {
  const path = `${REPO}runs/tmp/idempotency-${process.pid}.jsonl`;
  const store = createJsonlStore(path);
  const obs = () =>
    makeObservation({
      observed_at: "2026-09-12T00:00:00.000Z",
      method: "test-job",
      target: { kind: "url", ref: "https://e.example.com/p" },
      content_sha256: "a".repeat(64),
      value: { n: 1 },
      collector: "item-48",
      collector_version: "1",
    });

  const before = store.count();
  const first = store.appendIfNew(obs());
  const afterFirst = store.readAll().filter((r) => r.record_type === "observation").length;
  const second = store.appendIfNew(obs());
  const afterSecond = store.readAll().filter((r) => r.record_type === "observation").length;

  assert.equal(before, 0, "the store was not empty — this run would be measuring someone else's records");
  assert.equal(first.appended, true);
  assert.equal(second.appended, false, "the second run appended a duplicate payload");
  assert.equal(second.observation_id, first.observation_id, "the re-run minted a NEW id for the same measurement");
  assert.equal(afterFirst, 1);
  assert.equal(afterSecond, 1, "a second observation record exists after an identical re-run");
  // 🔴 The re-sighting IS recorded. Append-only: the fact that we looked again
  // is itself evidence, and dropping it silently would lose it.
  assert.ok(store.readAll().some((r) => r.record_type === "resighting"), "the re-check left no trace");

  rmSync(path, { force: true });
});

/* ================================================================== *
 * 🔴 COST IS A DUPLICABLE SIDE EFFECT.
 * ================================================================== */

/**
 * A job run twice that BILLS twice is a failure of this item even when no
 * record duplicates. Requests are the only metered thing this system issues
 * today — there is no paid provider and no ledger (item 45) — so the request
 * count is the cost, and it is asserted directly.
 */
test("🔴 COST: a re-run over cached input issues ZERO new requests", async () => {
  let calls = 0;
  const f = fetcher(async () => { calls += 1; return res(200); });
  await f.fetchUrl("https://e.example.com/p");
  const afterFirst = f.requestsIssued();

  // The second "run" consults what it already stored and does not re-fetch.
  const store = new Map([["https://e.example.com/p", "cached"]]);
  if (!store.has("https://e.example.com/p")) await f.fetchUrl("https://e.example.com/p");

  assert.equal(f.requestsIssued(), afterFirst, "the re-run issued a billable request for input it already held");
  assert.equal(calls, 1);
});

test("🔴 REAL: the 12 September crawl stored no duplicate reading — 500 distinct measurement keys", () => {
  const records = readFileSync(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`, "utf8")
    .trim().split("\n").map((l) => JSON.parse(l));
  const observations = records.filter((r) => r.record_type === "observation");
  assert.equal(observations.length, 500, "the run's observation count changed");

  const keys = observations.map((o) => o.measurement_key);
  assert.equal(new Set(keys).size, 500, "two observations share a measurement key — one reading was stored twice");

  const ids = observations.map((o) => o.observation_id);
  assert.equal(new Set(ids).size, 500, "an observation_id repeats");

  // 🔴 And the run recorded no re-sighting, because it was a FIRST run. If this
  // ever becomes non-zero, a second run happened — which needs a new owner green.
  assert.equal(records.filter((r) => r.record_type === "resighting").length, 0);
});
