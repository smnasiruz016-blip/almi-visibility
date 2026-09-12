/**
 * ITEM 49 — A CONCLUSION'S LIFECYCLE, AND THE FIRST ONE THIS PROJECT COMPLETED.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { makeIssueStateChange, lifecycleOf, walkChain, ISSUE_TRANSITIONS } from "../src/evidence/lifecycle.mjs";
import { makeIssue } from "../src/evidence/records.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

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
const crawl = () => readdirSync(`${REPO}runs/crawl`).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(`${REPO}runs/crawl/${f}`).readAll());

test("🔴 REAL: 134 cv-guide noindex issues are SUPERSEDED — the first lifecycles this project has completed — with no lifecycle error", () => {
  const r = lifecycleOf([...audit(), ...crawl()]);
  assert.deepEqual(r.errors, []);
  const superseded = [...r.issues.values()].filter((e) => e.state === "SUPERSEDED");
  assert.equal(superseded.length, 134);
  assert.ok(superseded.every((e) => e.issue.issue_class === "noindex"));
  assert.equal(r.census.CLOSED, 0, "an issue was CLOSED — nothing in this change fixed anything");
});

test("🔴 REAL: the ROBOTS issues are all still OPEN — they are not fixed and not superseded", () => {
  const r = lifecycleOf(audit());
  const robots = [...r.issues.values()].filter((e) => e.issue.issue_class === "robots-blocks-search-crawler");
  assert.equal(robots.length, 106);
  assert.ok(robots.every((e) => e.state === "OPEN"));
});

test("🔴 REAL: nothing was edited or deleted — the committed findings file before this change is a byte-for-byte PREFIX of it now", () => {
  const before = execFileSync("git", ["show", "aa9a66b:runs/audit/technical-findings.jsonl"], { cwd: REPO, encoding: "utf8" }).replace(/\r\n/g, "\n");
  const now = readFileSync(`${REPO}runs/audit/technical-findings.jsonl`, "utf8").replace(/\r\n/g, "\n");
  assert.ok(now.length > before.length);
  assert.ok(now.startsWith(before), "a record that existed before this change was altered or removed");
});

test("🔴 REAL: one chain walked end to end shows all five — what, why, evidence, when, and what changed it", () => {
  const records = [...audit(), ...crawl()];
  const moved = [...lifecycleOf(records).issues.values()].find((e) => e.state === "SUPERSEDED");
  const w = walkChain(moved.issue.issue_id, records);
  assert.deepEqual(w.present, { what: true, why: true, evidence: true, when: true, changedBy: true });
  assert.equal(w.why.verdict, "FAIL");
  assert.equal(w.changedBy[0].replacement.verdict, "UNKNOWN", "the replacement claims more than the evidence supports");
  assert.match(w.changedBy[0].reason, /DELIBERATE/);
  assert.match(w.changedBy[0].reason, /NOT established/);
  assert.equal(w.copies, 2, "the duplicate append of the original is no longer visible");
});

test("🔴 REAL: the report shows the walked chain", () => {
  const html = readFileSync(join(REPO, "runs/report/index.html"), "utf8");
  for (const part of ["WHAT", "WHY", "FROM WHICH EVIDENCE", "WHEN", "WHAT CHANGED IT"]) assert.match(html, new RegExp(`<th>${part} ✅ present</th>`));
});
