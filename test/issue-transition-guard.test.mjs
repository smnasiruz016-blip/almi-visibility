/**
 * 🔴 ITEM 50 — THE UNKNOWN→PASS GUARD GOVERNS THE ISSUE PATH, AND REAL RECORDS PASS THROUGH IT.
 *
 * The boundary: records of all four kinds pass through the real verdict path;
 * each is labelled on its face; NO PATH converts UNKNOWN into PASS; and the guard
 * governs REAL records. Its FAILURE: a label absent or wrong, or the guard
 * policing an empty population.
 *
 * The fact guard (F23) judges only fact supersessions, and no real fact has one.
 * But closing an issue asserts the defect is gone — a PASS — and until
 * 13 September 2026 an UNKNOWN issue could be CLOSED on any evidence at all. That
 * was a path turning UNKNOWN into PASS with nothing measured, inside the
 * boundary's own words. The guard now judges every issue transition through the
 * one table in transitions.mjs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import { lifecycleOf, makeIssueStateChange } from "../src/evidence/lifecycle.mjs";
import { makeIssue } from "../src/evidence/records.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { LABEL_BY_TYPE, labelFor, adapterContext } from "../src/report/provenance-label.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const issue = (verdict, evidence = ["obs-1"]) =>
  makeIssue({ issue_class: "c", canonical_url: "https://e.example.com/p", verdict, severity: "low", evidence, opened_at: "2026-09-13T00:00:00Z", detector: "d", detector_version: "1" });
const close = (i, evidence) =>
  makeIssueStateChange({ issue_id: i.issue_id, from: "OPEN", to: "CLOSED", changed_at: "2026-09-13T01:00:00Z", reason: "closed", evidence, action: "a", actor: "test" });

test("🔴 RED: an UNKNOWN issue CLOSED on the evidence it already had is REFUSED — no path turns UNKNOWN into PASS", () => {
  const i = issue("UNKNOWN");
  const r = lifecycleOf([i, close(i, ["obs-1"])]);
  assert.ok(r.errors.some((e) => /UNKNOWN → PASS is forbidden/.test(e)), r.errors.join("\n"));
  assert.equal(r.issues.get(i.issue_id).state, "OPEN", "the forbidden close took effect");
  assert.equal(r.guard.refused, 1);
});

test("an UNKNOWN issue CLOSED on a NEW measurement is allowed, and counted as such", () => {
  const i = issue("UNKNOWN");
  const r = lifecycleOf([i, close(i, ["obs-1", "obs-2-new"])]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.guard.onNewMeasurement, 1);
});

test("CONTROL: a FAIL issue CLOSED, and a FAIL superseded by an UNKNOWN, pass the guard", () => {
  const f = issue("FAIL");
  assert.deepEqual(lifecycleOf([f, close(f, ["obs-1"])]).errors, []);
  const old = issue("FAIL", ["obs-9"]);
  const repl = makeIssue({ issue_class: "c", canonical_url: "https://e.example.com/p", verdict: "UNKNOWN", severity: "low", evidence: ["obs-9"], opened_at: "2026-09-13T00:00:00Z", detector: "d", detector_version: "2", supersedes: old.issue_id });
  const sup = makeIssueStateChange({ issue_id: old.issue_id, from: "OPEN", to: "SUPERSEDED", changed_at: "2026-09-13T01:00:00Z", reason: "r", evidence: ["obs-9"], action: "a", actor: "t", superseded_by: repl.issue_id });
  const r = lifecycleOf([old, repl, sup]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.guard.judged, 1);
});

const audit = () => readdirSync(`${REPO}runs/audit`).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(`${REPO}runs/audit/${f}`).readAll());
const crawl = () => batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll());

test("🔴 REAL: the guard judges every real issue transition — 145, none refused — so it no longer polices an empty population", () => {
  const r = lifecycleOf([...audit(), ...crawl()]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.guard.judged, 145, "134 supersessions and 11 closures");
  assert.equal(r.guard.refused, 0);
});

/** Every directory of stored records the report and the tests read. 🔴 runs/crawl is no longer one of
 * them: the observation batch moved to the external data repository on 20 September 2026, and after
 * the move a fresh checkout has no runs/crawl directory at all — readdirSync would throw rather than
 * quietly find nothing. Its record types are gathered from the batch instead, below. */
const STORE_DIRS = ["runs/audit", "runs/evidence", "runs/cost", "runs/replay"];

test("🔴 REAL: every record type in every committed store has a DECLARED label — none falls through to UNKNOWN", () => {
  const types = new Set();
  for (const d of STORE_DIRS) {
    for (const f of readdirSync(`${REPO}${d}`).filter((x) => x.endsWith(".jsonl"))) for (const r of createJsonlStore(`${REPO}${d}/${f}`).readAll()) types.add(r.record_type);
  }
  for (const p of batchJsonlFiles()) for (const r of createJsonlStore(p).readAll()) types.add(r.record_type);
  assert.ok(types.size >= 12);
  const undeclared = [...types].filter((t) => !(t in LABEL_BY_TYPE));
  assert.deepEqual(undeclared, [], "a stored record type has no declared label and would render UNKNOWN by default");
  /* F06: a drafted recommendation is RECOMMENDED only on the evidence linked to it — alone, it is UNMAPPED. */
  const draft = { record_type: "draft_recommendation", recommendation_id: "REC-X", drafted_at: "2026-09-13T00:00:00Z" };
  assert.equal(labelFor(draft).label, "UNMAPPED");
  const link = { record_type: "recommendation_evidence", recommendation_id: "REC-X", linked_at: "2026-09-13T00:00:00Z", issues: ["i1"], observations: [], sources: [] };
  assert.equal(labelFor(draft, adapterContext([draft, link])).label, "RECOMMENDED");
});
