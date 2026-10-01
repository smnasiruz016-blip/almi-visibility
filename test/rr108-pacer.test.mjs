/**
 * RR-108 · THE PACER, REPAIRED — the full interval is rechecked on a monotonic clock after every wait, every request start is recorded,
 * the robots-to-first-page gap is measured and bound, a retry is paced like any request, and a pacing failure is never a collection.
 *
 * In-process only: a fake monotonic clock and a fake sleep that can wake EARLY drive the real fetcher and crawler; an in-process site
 * answers; the global fetch is trapped and counted. Governed writes execute into a temp store with the audit confined by the test context;
 * the production trail is not written (last test).
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFetcher, mayStart, pacingSummary, PACING_CLOCK } from "../src/crawl/fetcher.mjs";
import { crawl } from "../src/crawl/crawler.mjs";
import { collectionVerdict, COLLECTED } from "../src/crawl/preflight.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
let globalFetchCalls = 0;
globalThis.fetch = () => { globalFetchCalls += 1; throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };
let inProcessCalls = 0;
after(() => console.log(`  RR-108 network: HTTP requests 0 (no socket opened) · global fetch calls ${globalFetchCalls} · in-process site calls ${inProcessCalls}`));

/* a fake monotonic clock and a sleep that wakes `early` ms BEFORE the time asked — the RR-107 failure mode, on purpose */
function fakeTime({ early = 1 } = {}) {
  let t = 5000;
  let sleeps = 0;
  /* wakes `early` ms short of what was asked, but a timer always lets SOME time pass (at least 1 ms) — a fake that let none pass would
   * model no real timer and would spin any recheck loop forever (the first version of this fake did exactly that) */
  return { monotonic: () => t, sleepImpl: async (ms) => { sleeps += 1; t += Math.max(1, ms - early); }, advance: (ms) => { t += ms; }, sleeps: () => sleeps };
}
const site = (fail = 0) => {
  let n = 0;
  return async (url) => {
    inProcessCalls += 1;
    if (new URL(String(url)).pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
    if (n++ < fail) throw new TypeError("in-process network failure");
    return new Response("<html><nav>n</nav><main><a href=\"/x\">x</a></main></html>", { status: 200, headers: { "content-type": "text/html" } });
  };
};
const O = "https://pacer.invalid";

/* ================= the exact boundary, both directions ================= */

test("BOUNDARY · one unit short is REFUSED, exactly at the bound is ALLOWED (1 ms unit, and sub-millisecond)", () => {
  assert.equal(mayStart(0, 999, 1000), false, "999 ms after the last start was allowed");
  assert.equal(mayStart(0, 999.999, 1000), false, "999.999 ms was allowed");
  assert.equal(mayStart(0, 1000, 1000), true, "exactly 1000 ms was refused");
  assert.equal(mayStart(null, 0, 1000), true, "the first request of a run was refused");
});

test("EARLY WAKE-UP · a timer that fires 1 ms early cannot shorten the interval — the pacer rechecks and waits again", async () => {
  const clk = fakeTime({ early: 1 });
  const f = createFetcher({ fetchImpl: site(), intervalMs: 1000, monotonic: clk.monotonic, sleepImpl: clk.sleepImpl, now: () => 0 });
  for (const p of ["/a", "/b", "/c"]) await f.fetchUrl(`${O}${p}`);
  const s = f.pacing();
  assert.equal(s.gaps, 2);
  assert.ok(s.fastestGapMs >= 1000, `a request started ${s.fastestGapMs} ms after the last`);
  assert.equal(s.breaches, 0);
  assert.ok(clk.sleeps() > 2, "the early wake-up was not rechecked (one sleep per gap means the pacer waited once)");
  assert.equal(s.clock, PACING_CLOCK);
});

test("RETRY · a retry is a request and is paced by the same rule", async () => {
  const clk = fakeTime({ early: 1 });
  const f = createFetcher({ fetchImpl: site(1), intervalMs: 1000, monotonic: clk.monotonic, sleepImpl: clk.sleepImpl, now: () => 0 });
  const r = await f.fetchUrl(`${O}/a`);
  assert.equal(r.ok, true);
  const s = f.pacing();
  assert.deepEqual(s.starts.map((x) => x.kind), ["page", "retry"]);
  assert.ok(s.fastestGapMs >= 1000, `the retry started ${s.fastestGapMs} ms after its first attempt`);
});

test("ROBOTS → FIRST PAGE · the gap is measured, named and bound like every other", async () => {
  const clk = fakeTime({ early: 1 });
  const res = await crawl({ seeds: [`${O}/a`, `${O}/b`], seedSource: "rr108", fetchImpl: site(), live: true, fetcherOptions: { intervalMs: 1000, monotonic: clk.monotonic, sleepImpl: clk.sleepImpl } });
  const p = res.run.pacing;
  assert.deepEqual(p.starts.map((x) => x.kind), ["robots", "page", "page"]);
  assert.ok(p.robotsToFirstPageMs !== null && p.robotsToFirstPageMs >= 1000, `robots→first page ${p.robotsToFirstPageMs}`);
  assert.equal(p.breaches, 0);
  assert.equal(p.ok, true);
});

test("DETECTION · RR-107's shape — a 999 ms gap — is a BREACH, and no gaps at all is NOT a pass", () => {
  const s = pacingSummary([{ kind: "page", at: 0 }, { kind: "page", at: 999 }, { kind: "page", at: 2000 }], 1000);
  assert.deepEqual([s.breaches, s.fastestGapMs, s.ok], [1, 999, false]);
  assert.equal(pacingSummary([{ kind: "page", at: 0 }], 1000).ok, false, "a run with no measured gap reads as paced");
});

/* ================= the production governed path ================= */

test("PRODUCTION APPEND · the run record carrying its pacing COMMITS through the real governed append, and is read back intact", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr108-"));
  try {
    const clk = fakeTime({ early: 1 });
    const res = await crawl({ seeds: [`${O}/a`], seedSource: "rr108", fetchImpl: site(), live: true, fetcherOptions: { intervalMs: 1000, monotonic: clk.monotonic, sleepImpl: clk.sleepImpl } });
    const permission = writePermission({ target: LOCAL, argv: ["--confirm", "--actor=actor:cc"], env: {} });
    const at = new Date().toISOString().slice(0, 19) + "Z";
    const out = executeGovernedWrite(governedStoreAppend({ repo: dir, auditRepo: REPO, permission, store: createJsonlStore(join(dir, "crawl.jsonl")), records: [res.run], targetClass: "GENERATED_CONFIG", action: "APPEND_CRAWL_RUN_RECORD", occurredAt: at, correlationId: "run:rr108-test", discipline: "APPEND_WITHOUT_DEDUPE" }));
    assert.equal(out.outcome, "COMMITTED");
    const [stored] = createJsonlStore(join(dir, "crawl.jsonl")).readAll();
    assert.equal(stored.record_type, "crawl_run");
    assert.deepEqual(stored.pacing.starts.map((x) => x.kind), ["robots", "page"]);
    assert.ok(stored.pacing.robotsToFirstPageMs >= 1000);
    assert.equal(stored.pacing.breaches, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= a failed pacing check is never a collection ================= */

test("CONTROL · a pacing breach, or pacing not measured, is NEVER a successful collection — even with every write committed", () => {
  const all = { observations: "COMMITTED", run: "COMMITTED", cost: "COMMITTED" };
  assert.equal(collectionVerdict(all, { pacing: { ok: true, breaches: 0, gaps: 26, intervalMs: 1000 } }).verdict, COLLECTED.KEPT);
  const breach = collectionVerdict(all, { pacing: { ok: false, breaches: 1, gaps: 26, intervalMs: 1000 } });
  assert.equal(breach.verdict, COLLECTED.NOT_KEPT);
  assert.deepEqual(breach.failed, ["pacing: 1 of 26 gap(s) under 1000 ms"]);
  assert.equal(collectionVerdict(all, { pacing: null }).verdict, COLLECTED.NOT_KEPT, "pacing NOT MEASURED read as a collection");
  const src = readFileSync(join(REPO, "bin/crawl.mjs"), "utf8");
  assert.ok(src.includes("live ? { pacing: run.pacing ?? null } : {}"), "the binary does not pass a live run's pacing into its verdict");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
  assert.equal(globalFetchCalls, 0, "the global fetch was called");
});
