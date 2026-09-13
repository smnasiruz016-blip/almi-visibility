/**
 * ITEM 48 — THE SAME JOB RUN TWICE, ACROSS EVERY WRITER THAT STORES A RECORD.
 *
 * The tick this item held was earned on one synthetic observation. The census
 * below covers the writers themselves.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore, RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { makeIssue } from "../src/evidence/records.mjs";
import { duplicateCensus } from "../src/evidence/lifecycle.mjs";
import { sourceCensus, dataCensus } from "../tools/duplicate-writer-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const tmp = () => mkdtempSync(join(tmpdir(), "almivis-dupe-"));

/* ---- the store ------------------------------------------------------------ */

const issue = () => makeIssue({ issue_class: "c", target_page_id: "p", verdict: "FAIL", severity: "low", evidence: ["o1"], opened_at: "2026-09-12T00:00:00Z", detector: "d", detector_version: "1" });

test("🔴 appendIfNew deduplicates an ISSUE by its content-derived issue_id — a second write is a re-sighting", () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    assert.equal(store.appendIfNew(issue()).appended, true);
    const second = store.appendIfNew({ ...issue(), opened_at: "2026-09-12T08:00:00Z" });
    assert.equal(second.appended, false, "the same finding was stored twice");
    const all = store.readAll();
    assert.equal(all.filter((r) => r.record_type === "issue").length, 1);
    const re = all.find((r) => r.record_type === RESIGHTING_TYPE);
    assert.equal(re.issue_id, issue().issue_id, "the re-sighting does not point at the issue it confirms");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 a legacy issue stored WITHOUT any key is still found — a re-run cannot duplicate what was written before the fix", () => {
  const dir = tmp();
  try {
    const path = join(dir, "s.jsonl");
    createJsonlStore(path).append(issue()); // written the old way, with a bare append
    assert.equal(createJsonlStore(path).appendIfNew(issue()).appended, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a record that is neither a measurement nor an issue is refused by appendIfNew", () => {
  const dir = tmp();
  try {
    assert.throws(() => createJsonlStore(join(dir, "s.jsonl")).appendIfNew({ record_type: "note" }), /no measurement_key and is not an issue/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ---- 🔴 THE CENSUS — source ---------------------------------------------- */

/**
 * Every append that is NOT deduplicated at its own call site, with the reason
 * it is still safe. Each reason is a CLAIM, and the claim is checked below —
 * an exemption nobody verifies is how the audit writers got through.
 */
const DECLARED = Object.freeze({
  "src/evidence/store.mjs": "the store's own primitive — appendIfNew is built on it",
  "src/cost/ledger.mjs": "createCostLedger.append refuses a second entry with the same entry_id (tested in cost-ledger.test.mjs)",
  "bin/gsc-ingest.mjs": "ledger.append — the ledger's own dedupe by entry_id",
  "bin/crawl.mjs": "the RUN record and its ledger entry: run_id includes the start time, so a second run is a new run, not a duplicate; observations use appendIfNew",
  "bin/cost-ledger.mjs": "ledger.append — the ledger's own dedupe by entry_id",
  "bin/replay-crawl.mjs": "ledger.append — the ledger's own dedupe by entry_id; its crawl observations go through persistCrawlObservations (appendIfNew) and its audit through runRobotsAndDnsAudit (appendIfNew)",
  "bin/supersede-noindex.mjs": "writes only for issues still OPEN; its re-run appends 0 (proved when it was committed)",
  "bin/supersede-duplicates.mjs": "writes only for copies with no note yet; its re-run appends 0",
});

test("🔴 CENSUS (source): every record writer is guarded or declared with a checked reason — ZERO unexplained bare appends", () => {
  const unguarded = sourceCensus().filter((s) => !s.guarded);
  const unexplained = unguarded.filter((s) => !DECLARED[s.file]);
  assert.deepEqual(unexplained.map((s) => `${s.file}:${s.line}  ${s.text}`), [], "a writer appends records with no dedupe and no declared reason");
  // No audit writer may be in the declared list — they are exactly the ones that duplicated.
  for (const f of ["bin/audit.mjs", "bin/audit-content.mjs", "bin/audit-technical.mjs"]) {
    assert.ok(!DECLARED[f], `${f} was exempted`);
    assert.ok(!unguarded.some((s) => s.file === f), `${f} still appends with no dedupe`);
  }
  // The crawl's claim, checked: run_id is derived from the start time.
  assert.match(readFileSync(`${REPO}src/crawl/crawler.mjs`, "utf8"), /const run_id = sha256Hex\(`\$\{started_at\}\|/);
});

test("🔴 CONTROL: the source census FIRES on a bare append, and a directory check is NOT mistaken for a guard", () => {
  const sites = sourceCensus({
    sources: [{ file: "bin/x.mjs", text: 'if (!existsSync(dirname(out))) mkdirSync(dirname(out));\nconst store = createJsonlStore(out);\nstore.appendAll(result.observations);\n' }],
  });
  assert.equal(sites.length, 1);
  assert.equal(sites[0].guarded, false, "existsSync was read as a dedupe guard — the defect the first census had");
  const guarded = sourceCensus({ sources: [{ file: "bin/y.mjs", text: "if (store.readAll().some((r) => r.id === x.id)) return;\nstore.append(x);\n" }] });
  assert.equal(guarded[0].guarded, true);
});

/* ---- 🔴 THE CENSUS — data ------------------------------------------------ */

test("🔴 CENSUS (data): no store holds an UNSUPERSEDED duplicate — of an issue, an observation, or anything else", () => {
  for (const d of dataCensus()) {
    assert.equal(d.unsupersededIssueCopies, 0, `${d.file}: an extra issue copy carries no supersession note`);
    assert.equal(d.observations.extraCopies, 0, `${d.file}: an observation's measurement is stored twice`);
    assert.equal(d.other.extraCopies, 0, `${d.file}: a record is stored twice apart from its clock`);
  }
});

test("🔴 REAL (2B/2C): the technical findings — 868 extra copies, all SUPERSEDED, none removed", () => {
  const records = createJsonlStore(`${REPO}runs/audit/technical-findings.jsonl`).readAll();
  const c = duplicateCensus(records);
  assert.equal(c.logicalIssues, 1018);
  assert.equal(c.physicalIssueRecords, 1886);
  assert.equal(c.extraCopies, 868);
  assert.equal(c.superseded, 868);
  assert.deepEqual(c.unsuperseded, []);
});

/* ---- 🔴 THE SAME JOB, RUN TWICE FOR REAL ---------------------------------- */

/**
 * 🔴 THE SAME JOB, RUN TWICE FOR REAL — RECORDED, NOT RE-RUN IN THE SUITE.
 *
 * The first version spawned both audit writers twice inside `npm test`. One
 * technical run takes minutes (every page against every stored sitemap URL) and
 * one content run about a minute and a half, so the suite ran past ten minutes
 * and was stopped by PID. Each real double run is therefore EVIDENCE, captured
 * once into `runs/audit/idempotency-double-run-*.json` with counts and wall-clock
 * per run, and pinned here. The store-level dedupe both rely on is tested above
 * in milliseconds.
 */
for (const [job, file] of [
  ["bin/audit-technical.mjs", "idempotency-double-run-technical-2026-09-12.json"],
  ["bin/audit-content.mjs", "idempotency-double-run-content-2026-09-12.json"],
  // 13 Sep 2026 — the two remaining issue writers, run twice offline into one store.
  ["bin/verification-issues.mjs", "idempotency-double-run-verification-2026-09-13.json"],
  ["bin/supply-labels.mjs", "idempotency-double-run-supply-labels-2026-09-13.json"],
]) {
  test(`🔴 REAL, RECORDED: ${job} run twice into one store added ZERO issues the second time`, () => {
    const r = JSON.parse(readFileSync(`${REPO}runs/audit/${file}`, "utf8"));
    assert.equal(r.job, job);
    assert.equal(r.runs.length, 2, "the recorded evidence is not a double run");
    assert.ok(r.runs.every((x) => x.exit === 0), "a run did not complete");
    assert.ok(r.runs[0].after.issues > 0, "the first run wrote no issues — the double run would be vacuous");
    assert.equal(r.secondRunAddedIssues, 0, `${job} duplicated issues on its second run`);
    // A writer that also stores observations re-sights those too — every record of run 1 is looked at again.
    assert.equal(r.secondRunResightings, r.runs[0].after.issues + (r.runs[0].after.observations ?? 0), "the second run did not record that it looked again");
    if ("secondRunAddedObservations" in r) assert.equal(r.secondRunAddedObservations, 0, `${job} duplicated observations on its second run`);
    assert.equal(r.runs[1].after.distinctIssueIds, r.runs[1].after.issues, "the store holds an issue_id twice");
  });
}
