/**
 * ITEMS 11, 42, 48 — THE LOCAL REPLAY OF THE REAL 12 SEPTEMBER CRAWL.
 *
 * THREE LAYERS, AND THEIR LIMITS:
 *   1. the RECORDED replay (`runs/replay/*`) — the full 394-body run, evidence
 *      of what happened once. Reading it reads a file.
 *   2. a LIVE replay over a SUBSET of the real bodies, run in this suite on
 *      every commit — the bodies are committed (runs/crawl/bodies-2026-09-12.jsonl.br,
 *      ruling of 13 September 2026), so CI replays the real bytes too.
 *   3. a MECHANICS CONTROL on three tiny bodies that CI does run: not evidence
 *      of anything about the estate, only proof that the comparison can fail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { buildInventory } from "../src/crawl/inventory.mjs";
import { replayEntriesFrom, runReplayPass, comparePasses } from "../src/crawl/replay.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const EVIDENCE = `${REPO}runs/replay/replay-2026-09-13.json`;
const CRAWL_STORE = `${REPO}runs/replay/replay-crawl-2026-09-13.jsonl`;
const CORPUS = `${REPO}runs/crawl/corpus`;
const ev = () => JSON.parse(readFileSync(EVIDENCE, "utf8"));

/* ---- 1 · the recorded replay -------------------------------------------- */

test("🔴 RECORDED: the replay served the REAL bodies — 394, every one matching its observation's hash — with ZERO egress", () => {
  const e = ev();
  assert.equal(e.ok, true, e.failures.join("\n"));
  assert.equal(e.recovery.integrity.bodies, 394);
  assert.equal(e.recovery.integrity.sha256Matches, 394);
  assert.equal(e.recovery.integrity.missing, 0);
  assert.equal(e.served.bodies, 394);
  assert.ok(e.egress.requests > 788, "the egress log is too small to cover two passes");
  assert.equal(e.egress.nonLocal, 0, "a replay request left 127.0.0.1");
});

test("🔴 RECORDED: the evidence states in its own words what the replay does NOT prove, and that the change was LOCAL", () => {
  const e = ev();
  assert.ok(e.doesNotProve.some((s) => /does not re-prove/.test(s) && /live internet/.test(s)));
  assert.ok(e.doesNotProve.some((s) => /RECORDED resolver answers/.test(s)));
  assert.match(e.changeKind, /NOT a change to any product's real page/);
  assert.match(e.changeKind, /NOT a write into any product repository/);
  assert.match(e.notAFixture, /production's own output/);
});

test("🔴 RECORDED (item 11): 5 named changes, the rest byte-identical; every page_id identical; changes are observations, not pages", () => {
  const e = ev();
  assert.deepEqual(e.changes.map((c) => c.id), ["C1", "C2", "C3", "C4", "C5"]);
  for (const c of e.changes) assert.notEqual(c.sha256Before, c.sha256After, `${c.id} did not change its body`);
  assert.equal(e.unchangedByteIdentical, 389);
  assert.equal(e.item11.pageIdsMoved.length, 0, `page_ids moved: ${e.item11.pageIdsMoved.join(", ")}`);
  assert.equal(e.item11.pageIdsIdentical, e.item11.urls);
  assert.equal(e.item11.pagesAcrossBothPasses, e.item11.pagesPass1, "a re-seen page became a second record");
  for (const ch of e.item11.changedChains) {
    assert.equal(ch.sameIdBothRuns, true);
    assert.equal(ch.pageRecordsWithThisUrl, 1);
    assert.ok(ch.observationsOnPage >= 2, `${ch.url}: its change did not add an observation to its page`);
  }
});

test("🔴 RECORDED (item 48): unchanged and changed counted APART — 389 unchanged → 0 new measurements; 5 changed → 5 new observations", () => {
  const { crawler, dnsAudit } = ev().item48;
  assert.equal(crawler.unchanged.count, 389);
  assert.equal(crawler.unchanged.newMeasurements, 0, `unchanged bodies duplicated: ${crawler.unchanged.newMeasurementUrls.join(", ")}`);
  assert.equal(crawler.unchanged.resightings, 389);
  assert.equal(crawler.changed.count, 5);
  assert.equal(crawler.changed.newObservations, 5);
  assert.match(dnsAudit.resolver, /^RECORDED/);
  assert.ok(dnsAudit.run1.appended > 0);
  assert.equal(dnsAudit.run2.appended, 0, "the DNS audit duplicated records on its second run");
});

test("🔴 RECORDED (item 42): every changed target re-tested on its LATEST observation, with the verdict the change predicts", () => {
  const rs = ev().item42;
  assert.equal(new Set(rs.map((r) => r.change)).size, 5);
  for (const r of rs) {
    assert.equal(r.meetsExpectation, true, `${r.change}/${r.check}: ${r.before.verdict} → ${r.after.verdict}`);
    assert.equal(r.servedCurrent, true, `${r.change}/${r.check}: a stale observation was re-tested`);
    assert.equal(r.evidenceBacked, true);
    assert.ok(["PASS", "FAIL"].includes(r.after.verdict), `${r.change}/${r.check}: re-test verdict ${r.after.verdict}`);
  }
  const by = (id, check) => rs.find((r) => r.change === id && r.check === check);
  assert.deepEqual([by("C1", "noindex").before.verdict, by("C1", "noindex").after.verdict], ["FAIL", "PASS"]);
  assert.deepEqual([by("C2", "noindex").before.verdict, by("C2", "noindex").after.verdict], ["PASS", "FAIL"]);
  assert.equal(by("C3", "canonical").after.verdict, "FAIL");
  assert.match(by("C4", "head-elements").after.summary, /no <title>/);
});

test("🔴 RECORDED STORE, RE-READ BY PRODUCTION CODE: observations = 394 + 5 changed, re-sightings = 389, and one page per identity", () => {
  const records = createJsonlStore(CRAWL_STORE).readAll();
  const obs = records.filter((r) => r.record_type === "observation");
  assert.equal(obs.length, 399);
  assert.equal(records.filter((r) => r.record_type === "resighting").length, 389);
  const inv = buildInventory({ observations: obs.map((o) => ({ ...o.value, observation_id: o.observation_id, observed_at: o.observed_at })), edges: [] });
  assert.equal(inv.pages.length, ev().item11.pagesPass1);
});

test("🔴 RECORDED (ledger): the replay and the artifact recovery each wrote a cost entry — money 0 MEASURED for the replay, UNKNOWN (not measurable) for the download", () => {
  const entries = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll();
  for (const id of ev().ledger) assert.ok(entries.some((x) => x.entry_id === id), `ledger entry ${id} is missing`);
  const replay = entries.find((x) => x.entry_id === ev().ledger[0]);
  assert.equal(replay.money.amountState, "MEASURED");
  assert.equal(replay.money.amount, 0);
  assert.equal(replay.providerCalls.total, 0);
  assert.equal(replay.budget.used.nonLocalRequests, 0);
  const recovery = entries.find((x) => x.entry_id === ev().ledger[1]);
  assert.equal(recovery.money.amountState, "UNKNOWN");
  assert.equal(recovery.money.unknownKind, "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD");
});

test("🔴 D-CRW-5 is recorded GRANTED AND UNUSED, with its reason — and it moves no row", () => {
  const reg = readFileSync(`${REPO}PHASE_0_FROZEN_GAP_REGISTER.md`, "utf8");
  assert.match(reg, /D-CRW-5 — A SECOND LIVE CRAWL: GRANTED AND UNUSED/);
  assert.match(reg, /ENGINE PROPERTIES/);
  assert.match(reg, /An unused green is not progress and moves no row/);
});

/* ---- 2 · a LIVE replay over real bodies, when they are on this machine -- */

/* 🔴 1C — THE #56 PROOF RE-RUN AFTER THE KEY CHANGED (D-KEY-1). Pinned apart
 * from the first run, so a moved split would show here and not be adjusted. */
test("🔴 RECORDED (1C): the replay re-run with the journey-aware key — the 389/5 split, the ids and the verdicts are UNCHANGED", () => {
  const first = ev();
  const again = JSON.parse(readFileSync(`${REPO}runs/replay/replay-2026-09-13-journey-key.json`, "utf8"));
  assert.equal(again.ok, true, again.failures.join("\n"));
  assert.deepEqual(again.item48.crawler.unchanged, { ...first.item48.crawler.unchanged });
  assert.deepEqual(again.item48.crawler.changed, first.item48.crawler.changed);
  assert.equal(again.item11.pageIdsIdentical, 394);
  assert.deepEqual(again.item11.pageIdsMoved, []);
  assert.equal(again.item11.pagesAcrossBothPasses, first.item11.pagesAcrossBothPasses);
  assert.deepEqual(again.item42.map((r) => `${r.change}/${r.check}:${r.before.verdict}->${r.after.verdict}`), first.item42.map((r) => `${r.change}/${r.check}:${r.before.verdict}->${r.after.verdict}`));
  assert.equal(again.egress.nonLocal, 0);
  assert.match(again.recovery.integrity.bodies === 394 ? "ok" : "", /ok/);
});

/* The corpus is now COMMITTED (ruling, 13 September 2026), so this runs in CI on real bodies. */
test("🔴 LIVE (real bodies, subset): two passes with one change — ids hold, the change is a new observation, the rest re-sighted", async () => {
  const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
  const { readBodyArchive } = await import("../src/evidence/body-archive.mjs");
  const all = replayEntriesFrom({ crawlRecords, bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")) }).entries;
  const entries = new Map([...all.entries()].slice(0, 12));
  for (const e of entries.values()) assert.equal(e.shaMatches, true, `${e.requested_url}: the local body is not the recorded one`);
  const dir = mkdtempSync(join(tmpdir(), "almivis-replay-test-"));
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    const robotsByHost = new Map();
    const p1 = await runReplayPass({ entries, robotsByHost, store, seedSource: "TEST" });
    const [changedUrl] = entries.keys();
    const p2 = await runReplayPass({ entries, robotsByHost, bodies: new Map([[changedUrl, `${entries.get(changedUrl).body}<!-- change -->`]]), store, seedSource: "TEST" });
    const cmp = comparePasses({ pass1: p1, pass2: p2, changedUrls: [changedUrl], storedObservations: store.readAll() });
    assert.deepEqual(cmp.pageIdsMoved, []);
    assert.equal(cmp.unchanged.newMeasurements, 0);
    assert.equal(cmp.changed.newObservations, 1);
    assert.equal(cmp.pagesAcrossBothPasses, cmp.pagesPass1);
    assert.ok([...p1.egress, ...p2.egress].every((u) => new URL(u).hostname === "127.0.0.1"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ---- 3 · mechanics control — CI runs this; it is NOT evidence ---------- */

function tinyReplay(dir, pages) {
  const crawlRecords = pages.map((p, i) => ({
    record_type: "observation", observation_id: `obs${i}`, content_sha256: sha256Hex(p.body),
    value: { requested_url: p.url, final_url: p.final ?? p.url, status: 200, response_headers_subset: { "content-type": "text/html" }, skipped: false },
  }));
  // test-owned temp files, outside the repository
  for (const [i, p] of pages.entries()) writeFileSync(join(dir, `obs${i}.html`), p.body, "utf8");
  return replayEntriesFrom({ crawlRecords, corpusDir: dir }).entries;
}

test("CONTROL (mechanics, not evidence): the comparison DETECTS a moved page_id and an unchanged page that was stored twice", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-replay-ctl-"));
  try {
    const pages = [
      { url: "https://a.example.test/x", body: "<html><head><title>x</title></head><body>x</body></html>" },
      { url: "https://a.example.test/y", body: "<html><head><title>y</title></head><body>y</body></html>" },
    ];
    const entries = tinyReplay(dir, pages);
    const store = createJsonlStore(join(dir, "s.jsonl"));
    const p1 = await runReplayPass({ entries, robotsByHost: new Map(), store, seedSource: "CTL" });
    // A second pass in which /y's recorded final URL MOVED — its identity must be reported as moved.
    // Its body changes too: with a byte-identical body the store records a RE-SIGHTING (the
    // measurement_key hashes the body, not the final URL), so the moved identity would never be
    // stored and the second-record detector would have nothing to see. ⚠️ That is itself a gap,
    // recorded in the PR: a redirect that changes while the body does not leaves no new record.
    const moved = new Map(entries);
    moved.set("https://a.example.test/y", { ...entries.get("https://a.example.test/y"), final_url: "https://a.example.test/elsewhere" });
    const p2 = await runReplayPass({ entries: moved, robotsByHost: new Map(), bodies: new Map([["https://a.example.test/y", "<html><head><title>y2</title></head><body>y2</body></html>"]]), store, seedSource: "CTL" });
    const cmp = comparePasses({ pass1: p1, pass2: p2, changedUrls: [], storedObservations: store.readAll() });
    assert.deepEqual(cmp.pageIdsMoved, ["https://a.example.test/y"], "a moved identity was not detected");
    assert.equal(cmp.pagesAcrossBothPasses, cmp.pagesPass1 + 1, "a second page record was not detected");
    // And a pass written to a FRESH store reports every unchanged body as a new measurement — the counter can fire.
    const fresh = createJsonlStore(join(dir, "fresh.jsonl"));
    const p3 = await runReplayPass({ entries, robotsByHost: new Map(), store: fresh, seedSource: "CTL" });
    const cmp2 = comparePasses({ pass1: p1, pass2: p3, changedUrls: [], storedObservations: fresh.readAll() });
    assert.equal(cmp2.unchanged.newMeasurements, 2, "the new-measurement counter cannot fire");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
