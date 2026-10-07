/**
 * 🔴 RR-196 · R6b part 3 — the controls for the three decisions.
 *
 * DECISION 3 (one move across two stores): a state change identical in every field and read from a DIFFERENT store is a copy of one
 * move; the same move twice in ONE store is still refused, and so is a duplicate whose store is unknown (fail closed).
 * DECISION 2 (the ruling sheet, a GLOBAL read under F02, owner approved): F04 decides READ_OWNER_RULING_SHEET at GLOBAL_PRODUCT scope
 * before anything is read — no actor, or a denied one, refuses (exit 5); and a reconcile run (no --confirm) writes NOTHING to any trail.
 * DECISION 1 (the T-2 taxonomy): every review-signal page is on the owner's committed sheet with its value; the version-1 claims are audit
 * trail. Nothing here writes to a real store, the sheet or the production trail (each test proves it for itself, last test overall).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { lifecycleOf, makeIssueStateChange } from "../src/evidence/lifecycle.mjs";
import { storeOfRecord } from "../src/evidence/provenance.mjs";
import { authorise } from "../src/governance/authorisation.mjs";
import { ACTIONS } from "../config/governance/authorisation.mjs";
import { EXCLUDED_ENTRY_POINTS } from "../tools/tenant-scope-census.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const PROTECTED = ["audit-trail/events.jsonl", "runs/export/row60-ruling-sheet.json", "runs/export/row60-ruling-sheet.md", "runs/audit/content-findings.jsonl", "runs/audit/supply-labels.jsonl"].map((f) => join(REPO, f));
const BEFORE = PROTECTED.map(sha);
const SCRATCH = join(REPO, ".test-scratch", `rr196-${process.pid}-${randomBytes(3).toString("hex")}`);
mkdirSync(SCRATCH, { recursive: true });

/* ── decision 3 ── */
const issue = { record_type: "issue", issue_id: "i-1", issue_class: "fixture-class", verdict: "FAIL", evidence: ["e-1"], opened_at: "2026-10-01T00:00:00Z", detector: "fixture", detector_version: "1" };
const replacement = { ...issue, issue_id: "i-2", verdict: "UNKNOWN", supersedes: "i-1", detector_version: "2" };
const move = makeIssueStateChange({ issue_id: "i-1", from: "OPEN", to: "SUPERSEDED", changed_at: "2026-10-02T00:00:00Z", reason: "fixture", evidence: ["e-2"], action: "fixture move", actor: "actor:cc", superseded_by: "i-2" });
const writeStore = (name, records) => { const p = join(SCRATCH, name); writeFileSync(p, records.map((r) => JSON.stringify(r)).join("\n") + "\n"); return createJsonlStore(p).readAll(); };

test("DECISION 3 · the same move written into TWO stores is ONE move — counted as a copy, judged once, no error", () => {
  const a = writeStore("two-a.jsonl", [issue, replacement, move]);
  const b = writeStore("two-b.jsonl", [issue, replacement, move]);
  assert.notEqual(storeOfRecord(a[2]), storeOfRecord(b[2]), "the reader did not record where each record came from");
  const r = lifecycleOf([...a, ...b]);
  assert.deepEqual([r.errors, r.changeCopies, r.guard.judged, r.issues.get("i-1").state, r.issues.get("i-1").changeCopies], [[], 1, 1, "SUPERSEDED", 1]);
});

test("DECISION 3 · CONTROL: the same move written twice into ONE store still FAILS — each store keeps its own duplicate guard", () => {
  const one = writeStore("one.jsonl", [issue, replacement, move, move]);
  const r = lifecycleOf(one);
  assert.equal(r.changeCopies, 0);
  assert.deepEqual(r.errors, ["state change for i-1: recorded from OPEN but the issue was SUPERSEDED"]);
  // and inside a union too: store A holds it twice, store B once — the second copy in A is still refused
  const a = writeStore("dup-a.jsonl", [issue, replacement, move, move]);
  const b = writeStore("dup-b.jsonl", [issue, replacement, move]);
  const u = lifecycleOf([...a, ...b]);
  assert.equal(u.errors.length, 1, JSON.stringify(u.errors));
});

test("DECISION 3 · CONTROL: a duplicate whose store is UNKNOWN (records built in memory, or cloned) fails closed — as before", () => {
  assert.deepEqual(lifecycleOf([issue, replacement, move, { ...move }]).errors, ["state change for i-1: recorded from OPEN but the issue was SUPERSEDED"]);
  const a = writeStore("clone-a.jsonl", [issue, replacement, move]);
  const b = writeStore("clone-b.jsonl", [issue, replacement, move]).map((r) => ({ ...r })); // a clone loses where it came from
  assert.equal(lifecycleOf([...a, ...b]).errors.length, 1);
  // a move that differs in ANY field is not a copy — it is judged, and refused, on its own
  const c = writeStore("diff-c.jsonl", [issue, replacement, move]);
  const d = writeStore("diff-d.jsonl", [issue, replacement, { ...move, reason: "another reason" }]);
  assert.equal(lifecycleOf([...c, ...d]).errors.length, 1);
});

/* ── decision 2 ── */
test("DECISION 2 · the GLOBAL read is DECLARED (357a138): one F04 action, the entry point named in the tenant-scope census", () => {
  assert.deepEqual(ACTIONS.READ_OWNER_RULING_SHEET, { family: "RESEARCH", resourceClass: "PROTECTED_TENANT_DATA" });
  assert.match(EXCLUDED_ENTRY_POINTS["bin/row60-ruling-sheet.mjs"], /GLOBAL read declared under F02/);
  const src = readFileSync(join(REPO, "bin", "row60-ruling-sheet.mjs"), "utf8");
  assert.ok(!/scopedEntryPoint\(/.test(src), "the sheet still asks for a tenant scope");
  assert.match(src, /action: "READ_OWNER_RULING_SHEET"/);
  const ask = (actorRef) => authorise({ actorRef, action: "READ_OWNER_RULING_SHEET", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: "row60-ruling-sheet", now: "2026-10-07T00:00:00Z" }).allowed;
  assert.deepEqual([ask("actor:cc"), ask("actor:owner"), ask(null), ask("actor:model")], [true, true, false, false]);
});

const AUDIT_DIR = `.test-scratch/audit/rr196-${process.pid}-${randomBytes(3).toString("hex")}`;
let RUNS = 0;
const scratchTrail = () => { const root = join(REPO, AUDIT_DIR); if (!existsSync(root)) return 0; let n = 0; const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (e === "events.jsonl") n += readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).length; } }; walk(root); return n; };
const sheet = (args) => spawnSync(process.execPath, ["bin/row60-ruling-sheet.mjs", ...args], { cwd: REPO, encoding: "utf8", env: { ...process.env, ALMIVISIBILITY_AUDIT_STORE: AUDIT_DIR, ALMIVISIBILITY_AUDIT_RUN: `rr196-${process.pid}-${++RUNS}` } });

test("DECISION 2 · CONTROL: no actor, or a denied one, is REFUSED before anything is read (exit 5) — even with --confirm; the sheet is untouched", () => {
  for (const args of [["--confirm"], ["--confirm", "--actor=actor:model"], []]) {
    const r = sheet(args);
    assert.equal(r.status, 5, `${args.join(" ")}: ${r.stderr}`);
    assert.match(r.stderr, /AUTHORISATION REFUSED — READ_OWNER_RULING_SHEET/);
    assert.ok(!/files read:/.test(r.stdout), "it read the stores before the decision");
  }
  assert.deepEqual(PROTECTED.map(sha), BEFORE);
});

test("DECISION 2 · a RECONCILE run (no --confirm) writes NOTHING to any trail — and the committed sheet, the register and the store agree", () => {
  const before = scratchTrail();
  const r = sheet(["--actor=actor:cc"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /the committed sheet, the register and the store agree/);
  assert.equal(scratchTrail(), before, "a dry run appended to its trail");
  assert.deepEqual(PROTECTED.map(sha), BEFORE, "a dry run changed the production trail, a store or the sheet");
});

/* ── decision 1 ── */
test("DECISION 1 · every review-signal page is on the owner's committed sheet with its measured value; the version-1 claims are audit trail", () => {
  const committed = JSON.parse(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.json"), "utf8"));
  const md = readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8");
  for (const p of ["thin-content", "near-duplicate", "template-dominance"]) {
    const d = committed.decisions.find((x) => x.issue_class === `${p}-review-signal`);
    assert.equal(d.signals.length, DECISION_REGISTER[`${p}-review-signal`].count);
    assert.ok(d.signals.every((s) => Number.isFinite(s.value) && Number.isFinite(s.bound) && md.includes(`| \`${s.target_page_id}\` | ${s.signal} | ${s.value} |`)), p);
    assert.equal(committed.auditTrail.find((x) => x.issue_class === `${p}-claim-withdrawn`).count, AUDIT_TRAIL[`${p}-claim-withdrawn`].count);
  }
  assert.equal(committed.decisions.reduce((n, d) => n + d.signals.length, 0), 125);
});

test("DECISION 1 · the owner's REPORT view lists every review-signal page and its value too — the same rule as the sheet (signalsForClass)", async () => {
  const { renderDecisions } = await import("../src/report/view.mjs");
  const { signalsForClass } = await import("../src/audit/populations.mjs");
  const view = new Map([["i-2", { issue_id: "i-2", class: "fixture-review-signal", state: "OPEN" }], ["i-3", { issue_id: "i-3", class: "fixture-other", state: "OPEN" }]]);
  const records = [{ record_type: "issue", issue_id: "i-2", target_page_id: "page-0001", signal: { name: "unique-body-words", value: 65, bound: 350 } }, { record_type: "issue", issue_id: "i-3", target_page_id: "page-0002" }];
  const signals = signalsForClass("fixture-review-signal", { view, records });
  assert.deepEqual(signals, [{ target_page_id: "page-0001", issue_id: "i-2", signal: "unique-body-words", value: 65, bound: 350, state: "OPEN" }]);
  const html = renderDecisions({ entries: [{ issue_class: "fixture-review-signal", count: 1, open: 1, impressions: { state: "UNKNOWN", reason: "fixture" }, decided: "d", notEstablished: "n", awaits: "PG-A1", signals }], fourWay: { totals: { FINDINGS: 0, "COVERAGE GAP": 0, "DECISION ON RECORD": 1, "AUDIT TRAIL": 0 }, distinct: 1 }, auditTrail: [] });
  assert.match(html, /<tr><td><code>page-0001<\/code><\/td><td>unique-body-words<\/td><td>65<\/td><td>350<\/td><td>OPEN<\/td><\/tr>/);
  // and a decision with no signal (noindex) renders no page list at all
  assert.ok(!/<details>/.test(renderDecisions({ entries: [{ issue_class: "n", count: 1, open: 1, impressions: { state: "UNKNOWN", reason: "x" }, decided: "d", notEstablished: "n", awaits: "A", signals: [] }], fourWay: { totals: { FINDINGS: 0, "COVERAGE GAP": 0, "DECISION ON RECORD": 1, "AUDIT TRAIL": 0 }, distinct: 1 }, auditTrail: [] })));
});

test("the production trail, the committed sheet and both stores are byte-identical after this file", () => {
  assert.deepEqual(PROTECTED.map(sha), BEFORE);
});
