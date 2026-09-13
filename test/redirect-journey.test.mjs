/**
 * 🔴 THE REDIRECT BLIND SPOT — AND THE OVER-CORRECTION IT MUST NOT BECOME.
 *
 * Defect (specification, 13 September 2026): the measurement key was
 * target + method + content, where target is the URL REQUESTED. A redirect that
 * changed destination while serving identical bytes was recorded as a
 * re-sighting, and the new destination left no trace.
 *
 * All three directions are proved THROUGH THE PRODUCTION CRAWLER AND STORE, on
 * a local replay. And the fix is held to the other side too: an unchanged page
 * must still be unchanged, or the blind spot has only been traded for a flood.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { measurementKey, sha256Hex } from "../src/evidence/ids.mjs";
import { journeyOf } from "../src/crawl/crawler.mjs";
import { replayEntriesFrom, runReplayPass } from "../src/crawl/replay.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const A = "https://a.example.test/start";
const X = "https://a.example.test/destination-x";
const Y = "https://a.example.test/destination-y";
const BODY = "<html><head><title>t</title></head><body>same bytes</body></html>";
const OTHER = "<html><head><title>t</title></head><body>different bytes</body></html>";

function entriesFor(final, body) {
  const crawlRecords = [{ record_type: "observation", observation_id: "o1", content_sha256: sha256Hex(body), value: { requested_url: A, final_url: final, status: 200, response_headers_subset: { "content-type": "text/html" }, skipped: false } }];
  return replayEntriesFrom({ crawlRecords, bodies: new Map([["o1", body]]) }).entries;
}

async function twoPasses(first, second) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-journey-"));
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    const p1 = await runReplayPass({ entries: entriesFor(...first), robotsByHost: new Map(), store, seedSource: "JOURNEY" });
    const p2 = await runReplayPass({ entries: entriesFor(...second), robotsByHost: new Map(), store, seedSource: "JOURNEY" });
    return { first: p1.persisted.outcomes[0], second: p2.persisted.outcomes[0], records: store.readAll() };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("🔴 same body, same destination → RE-SIGHTING (the correction does not flood)", async () => {
  const r = await twoPasses([X, BODY], [X, BODY]);
  assert.equal(r.first.appended, true);
  assert.equal(r.second.appended, false, "an unchanged redirected page was stored as new — the fix over-corrected");
  assert.equal(r.records.filter((x) => x.record_type === "observation").length, 1);
});

test("🔴 same body, DIFFERENT destination → NEW OBSERVATION (the blind spot is closed)", async () => {
  const r = await twoPasses([X, BODY], [Y, BODY]);
  assert.equal(r.second.appended, true, "a changed destination with identical bytes left no record");
  const obs = r.records.filter((x) => x.record_type === "observation");
  assert.deepEqual(obs.map((o) => o.value.final_url), [X, Y]);
});

test("🔴 different body, same destination → NEW OBSERVATION", async () => {
  const r = await twoPasses([X, BODY], [X, OTHER]);
  assert.equal(r.second.appended, true);
});

test("🔴 a page that STOPS redirecting is a change too, and an unredirected unchanged page is still a re-sighting", async () => {
  assert.equal((await twoPasses([X, BODY], [A, BODY])).second.appended, true, "a redirect that disappeared left no record");
  assert.equal((await twoPasses([A, BODY], [A, BODY])).second.appended, false, "an unredirected unchanged page was stored as new");
});

test("the journey participates ONLY when the request did not end where it started", () => {
  assert.equal(journeyOf({ requested_url: A, final_url: A, redirect_chain: [] }), null);
  assert.equal(journeyOf({ requested_url: A, final_url: null, redirect_chain: [] }), null);
  assert.notEqual(journeyOf({ requested_url: A, final_url: X, redirect_chain: [] }), null);
  assert.notEqual(journeyOf({ requested_url: A, final_url: A, redirect_chain: [A] }), null, "a captured chain must participate even if it returns home");
  const base = { target: `url:${A}`, method: "crawl.fetch", contentSha256: sha256Hex(BODY) };
  assert.equal(measurementKey({ ...base, journey: null }), measurementKey(base));
  assert.notEqual(measurementKey({ ...base, journey: journeyOf({ requested_url: A, final_url: X, redirect_chain: [] }) }), measurementKey({ ...base, journey: journeyOf({ requested_url: A, final_url: Y, redirect_chain: [] }) }));
});

/**
 * 🔴 NOTHING ALREADY STORED LOOKS NEW. Every fetched observation of the real
 * 12 September run is re-keyed with the corrected key: the ones that did not
 * redirect keep their stored key EXACTLY; the ones that did are counted and
 * named, because for those — and only those — a future run will record one new
 * observation against the old key. That is a one-time, bounded consequence of
 * the correction, stated rather than hidden.
 */
test("🔴 REAL: re-keying the stored 12 September run — unredirected keys unchanged; the redirected ones counted", () => {
  const records = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
  const fetched = records.filter((r) => r.record_type === "observation" && r.method === "crawl.fetch");
  let unchanged = 0;
  const moved = [];
  for (const o of fetched) {
    const journey = journeyOf({ requested_url: o.value.requested_url, final_url: o.value.final_url, redirect_chain: o.value.redirect_chain ?? [] });
    const key = measurementKey({ target: `url:${o.value.requested_url}`, method: o.method, contentSha256: o.content_sha256, journey });
    if (journey === null) {
      assert.equal(key, o.measurement_key, `${o.value.requested_url}: an unredirected page's key changed`);
      unchanged += 1;
    } else {
      assert.notEqual(key, o.measurement_key);
      moved.push(o.value.requested_url);
    }
  }
  assert.equal(fetched.length, 394);
  assert.equal(unchanged + moved.length, 394);
  assert.equal(moved.length, 7, `redirected pages re-keyed: ${moved.join(", ")}`);
});
