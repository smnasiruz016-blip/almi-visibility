/**
 * ITEM 49 — A CONCLUSION'S LIFECYCLE, AND THE FIRST ONE THIS PROJECT COMPLETED.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { makeIssueStateChange, lifecycleOf, walkChain, ISSUE_TRANSITIONS } from "../src/evidence/lifecycle.mjs";
import { makeIssue } from "../src/evidence/records.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const issue = (over = {}) => makeIssue({ issue_class: "c", target_page_id: "p", verdict: "FAIL", severity: "low", evidence: ["o1"], opened_at: "2026-09-12T00:00:00Z", detector: "d", detector_version: "1", ...over });
const move = (over = {}) => makeIssueStateChange({ issue_id: "x", from: "OPEN", to: "CLOSED", changed_at: "2026-09-12T01:00:00Z", reason: "fixed, with evidence", evidence: ["o2"], action: "fix deployed", actor: "a", ...over });

/* ---- the laws ---------------------------------------------------------- */

test("only OPEN may leave, and CLOSED and SUPERSEDED are terminal", () => {
  assert.deepEqual(ISSUE_TRANSITIONS, { OPEN: ["CLOSED", "SUPERSEDED"], CLOSED: [], SUPERSEDED: [] });
  assert.throws(() => move({ from: "CLOSED", to: "SUPERSEDED", superseded_by: "y" }), /not a legal move/);
  assert.throws(() => move({ from: "SUPERSEDED", to: "OPEN" }), /not a legal move/);
});

test("🔴 a move with no reason, no evidence or no action is refused — a move nobody can explain is an edit", () => {
  assert.throws(() => move({ reason: "" }), /reason is required/);
  assert.throws(() => move({ evidence: [] }), /evidence is required/);
  assert.throws(() => move({ action: "" }), /action is required/);
});

test("🔴 SUPERSEDED must name its replacement, and the replacement must name it back", () => {
  assert.throws(() => move({ to: "SUPERSEDED" }), /must name the record that supersedes it/);
  const old = issue();
  const orphan = issue({ verdict: "UNKNOWN", detector: "review", supersedes: null });
  const r = lifecycleOf([old, orphan, move({ issue_id: old.issue_id, to: "SUPERSEDED", superseded_by: orphan.issue_id })]);
  assert.match(r.errors[0], /does not name it in supersedes/);
  assert.equal(r.issues.get(old.issue_id).state, "OPEN", "an unlawful move was applied");
});

test("🔴 a move for an issue the store does not hold is REFUSED, not ignored", () => {
  assert.match(lifecycleOf([move({ issue_id: "ghost" })]).errors[0], /no such issue/);
});

test("CONTROL: a lawful supersession applies, keeps the original record, and the chain shows all five", () => {
  const old = issue();
  const replacement = issue({ verdict: "UNKNOWN", detector: "review", supersedes: old.issue_id });
  const obs = [{ record_type: "observation", observation_id: "o1", method: "m1", observed_at: "t1", target: { ref: "u" } }, { record_type: "observation", observation_id: "o2", method: "m2", observed_at: "t2", target: { ref: "v" } }];
  const records = [...obs, old, replacement, move({ issue_id: old.issue_id, to: "SUPERSEDED", superseded_by: replacement.issue_id })];
  const r = lifecycleOf(records);
  assert.deepEqual(r.errors, []);
  assert.equal(r.issues.get(old.issue_id).state, "SUPERSEDED");
  assert.equal(r.issues.get(old.issue_id).issue.state, "OPEN", "the stored original was altered");
  const w = walkChain(old.issue_id, records);
  assert.deepEqual(w.present, { what: true, why: true, evidence: true, when: true, changedBy: true });
});

test("🔴 CONTROL: the walk reports a MISSING part rather than filling it in", () => {
  const lone = issue({ evidence: ["not-stored"] });
  const w = walkChain(lone.issue_id, [lone]);
  assert.equal(w.present.evidence, false);
  assert.equal(w.present.changedBy, false);
});

/* ---- REAL ----------------------------------------------------------------- */

const audit = () => readdirSync(`${REPO}runs/audit`).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(`${REPO}runs/audit/${f}`).readAll());
const crawl = () => batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll());

/* RR-196: 134 → 259 SUPERSEDED — the 125 version-1 thin / near / template FAILs the 15 named T-2 runs superseded (RR-195) join the 134
 * noindex claims, and nothing else moved. Each T-2 move is written into BOTH stores holding the finding's copies; read as one population
 * those 120 identical second copies are ONE move each (src/evidence/lifecycle.mjs changeCopies), so there is still no lifecycle error. */
test("🔴 REAL: 259 issues are SUPERSEDED — the 134 cv-guide noindex claims and the 125 T-2 version-1 FAILs — with no lifecycle error", () => {
  const r = lifecycleOf([...audit(), ...crawl()]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.changeCopies, 120, "the T-2 moves' copies in the second store");
  const superseded = [...r.issues.values()].filter((e) => e.state === "SUPERSEDED");
  assert.equal(superseded.length, 259);
  const byClass = {};
  for (const e of superseded) byClass[e.issue.issue_class] = (byClass[e.issue.issue_class] ?? 0) + 1;
  assert.deepEqual(byClass, { "thin-content": 118, "near-duplicate": 5, "template-dominance": 2, noindex: 134 });
  // 🔴 13 September 2026: the first CLOSED issues — the 11 raised when two instruments disagreed (item 26),
  // closed only after both runners' recorded re-runs printed the same count. Nothing else may be CLOSED.
  const closed = [...r.issues.values()].filter((e) => e.state === "CLOSED");
  assert.equal(closed.length, 11, "an issue was CLOSED that nothing in these changes fixed");
  assert.ok(closed.every((e) => e.issue.issue_class === "instrument-disagreement"), "an issue of another class was CLOSED");
  assert.ok(closed.every((e) => e.changes.at(-1)?.evidence?.length > 0 && /same count: 335/.test(e.changes.at(-1).reason)), "a closure carries no evidence of the fix");
});

test("🔴 REAL: the ROBOTS issues are all still OPEN — they are not fixed and not superseded", () => {
  const r = lifecycleOf(audit());
  const robots = [...r.issues.values()].filter((e) => e.issue.issue_class === "robots-blocks-search-crawler");
  assert.equal(robots.length, 106);
  assert.ok(robots.every((e) => e.state === "OPEN"));
});

/**
 * 🔴 THE PRE-CHANGE FILE IS FROZEN AS A MEASUREMENT, NOT READ FROM GIT HISTORY.
 *
 * The first version ran `git show aa9a66b:…`. It passed locally, where the full
 * history exists — and FAILED IN CI, whose checkout is shallow (depth 1), with
 * "fatal: invalid object name 'aa9a66b'". The PR merged with that red check.
 *
 * So the file as committed at aa9a66b is recorded here as what it measured:
 * 1752 lines, 925,748 characters after LF normalisation, sha256 9ebca205…,
 * read from the git blob as a raw buffer (927,216 bytes, no BOM, no CR). The
 * test needs no history, and the claim is still falsifiable: edit or delete any
 * pre-existing record and the prefix hash changes.
 */
const BEFORE_AA9A66B = Object.freeze({
  chars: 925748,
  lines: 1752,
  sha256: "9ebca205515cee901727dd98b18008357da80ce3277cac25b10e1582be9e52fb",
});

test("🔴 REAL: nothing was edited or deleted — the findings file as committed before this change is a byte-for-byte PREFIX of it now", () => {
  const now = readFileSync(`${REPO}runs/audit/technical-findings.jsonl`, "utf8").replace(/\r\n/g, "\n");
  const prefix = now.slice(0, BEFORE_AA9A66B.chars);
  assert.ok(now.length > prefix.length, "nothing was appended after the pre-change records");
  assert.equal(prefix.split("\n").filter(Boolean).length, BEFORE_AA9A66B.lines);
  assert.equal(
    createHash("sha256").update(prefix, "utf8").digest("hex"),
    BEFORE_AA9A66B.sha256,
    "a record that existed before this change was altered or removed",
  );
});

test("🔴 CONTROL: the prefix check FIRES when one pre-existing byte changes", () => {
  const now = readFileSync(`${REPO}runs/audit/technical-findings.jsonl`, "utf8").replace(/\r\n/g, "\n");
  const i = now.indexOf('"state":"OPEN"');
  assert.ok(i !== -1 && i < BEFORE_AA9A66B.chars, "no pre-existing record to tamper with");
  const tampered = `${now.slice(0, i)}"state":"CLOS"${now.slice(i + 14)}`;
  assert.notEqual(createHash("sha256").update(tampered.slice(0, BEFORE_AA9A66B.chars), "utf8").digest("hex"), BEFORE_AA9A66B.sha256);
});

test("🔴 REAL: one chain walked end to end shows all five — what, why, evidence, when, and what changed it", () => {
  const records = [...audit(), ...crawl()];
  /* RR-196: the chain this test walks is a NOINDEX one — the first SUPERSEDED issue in store order is now a T-2 one (walked below) */
  const moved = [...lifecycleOf(records).issues.values()].find((e) => e.state === "SUPERSEDED" && e.issue.issue_class === "noindex");
  const w = walkChain(moved.issue.issue_id, records);
  assert.deepEqual(w.present, { what: true, why: true, evidence: true, when: true, changedBy: true });
  assert.equal(w.why.verdict, "FAIL");
  assert.equal(w.changedBy[0].replacement.verdict, "UNKNOWN", "the replacement claims more than the evidence supports");
  assert.match(w.changedBy[0].reason, /DELIBERATE/);
  assert.match(w.changedBy[0].reason, /NOT established/);
  assert.equal(w.copies, 2, "the duplicate append of the original is no longer visible");
});

/* RR-196: and a T-2 chain, walked the same way — the version-1 FAIL, superseded under PG-A1 by a version-2 REVIEW SIGNAL that decides nothing */
test("🔴 REAL: a T-2 chain walked end to end — the FAIL, why it was superseded (PG-A1), and the review signal that replaced it", () => {
  const records = [...audit(), ...crawl()];
  const moved = [...lifecycleOf(records).issues.values()].find((e) => e.state === "SUPERSEDED" && e.issue.issue_class === "thin-content");
  const w = walkChain(moved.issue.issue_id, records);
  assert.deepEqual(w.present, { what: true, why: true, evidence: true, when: true, changedBy: true });
  assert.equal(w.why.verdict, "FAIL");
  assert.equal(w.changedBy[0].replacement.verdict, "UNKNOWN", "the replacement claims more than the evidence supports");
  assert.match(w.changedBy[0].reason, /PG-A1/);
  assert.match(w.changedBy[0].reason, /no longer decides anything/);
});

test("🔴 REAL: the report shows the walked chain", () => {
  const html = readFileSync(join(REPO, "runs/report/index.html"), "utf8");
  for (const part of ["WHAT", "WHY", "FROM WHICH EVIDENCE", "WHEN", "WHAT CHANGED IT"]) assert.match(html, new RegExp(`<th>${part} ✅ present</th>`));
});
