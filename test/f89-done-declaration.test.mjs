/**
 * F89 · Final independent audit and done declaration (acceptance _handoffs AlmiVisibility_F89_ACCEPTANCE_2026-10-19.md; RR-291, light proof;
 * owner answer Q8). C1–C3 on fixtures with firing controls; REAL over the actual board (built as bin/fboard-status.mjs builds it), and — when
 * F89_AUDIT_RECORD names the separate auditor's JSON record — that record checked against the board and the frozen acceptances.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { doneDeclaration, declarationLines, auditRecordRefusals, notVerifiedReason, REASON_SOURCE, DEFERRED } from "../src/fboard/done-declaration.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { NOT_REQUIRED } from "../config/fboard/required-path.mjs";
import { buildBoard } from "../src/fboard/board.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const V = (clauses, deferred = {}) => ({ kind: "VERIFIED", on: "2026-10-19", clauses, deferred });
const fixture = () => [
  { featureId: "X1", state: "VERIFIED-PASS", events: [V({ C1: "PROVED", C2: "PROVED" })] },
  /* an older VERIFIED event deferred C1; the LATEST proves C1 and defers C2 */
  { featureId: "X2", state: "VERIFIED-PASS", events: [V({ C1: DEFERRED, C2: "PROVED" }, { C1: "old" }), V({ C1: "PROVED", C2: DEFERRED }, { C2: "a real client file" })] },
  { featureId: "X3", state: "IN-PROGRESS", events: [{ kind: "IMPLEMENTATION", on: "2026-10-19", reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN" }, V({ C1: DEFERRED }, { C1: "x" })] },
  { featureId: "X4", state: "BLOCKED-BY-EVIDENCE", blocker: "the source refuses robots", events: [] },
  { featureId: "X5", state: "IN-PROGRESS", events: [{ kind: "ACCEPTANCE_AMENDED", on: "2026-10-03" }] },
];
const ACC = { X1: { contractSha256: "a".repeat(64) }, X2: { contractSha256: "b".repeat(64) } };
const record = () => ({ auditor: "auditor agent", builder: "build agent", on: "2026-10-19", rows: { X1: { contractSha256: "a".repeat(64), clauses: { C1: { recorded: "PROVED", verdict: "AGREE", reason: "r" } } }, X2: { contractSha256: "b".repeat(64), clauses: { C2: { recorded: DEFERRED, verdict: "DISAGREE", reason: "r" } } } } });
const codes = (r) => r.map((x) => x.code);

test("C1 · an audit record is accepted only with an auditor who is not the builder, citing each audited row's frozen contract sha256", () => {
  const board = fixture();
  assert.deepEqual(auditRecordRefusals(record(), board, ACC, { mustCover: ["X1", "X2"] }), []);
  /* FIRING CONTROLS: each broken rule is refused, named */
  assert.deepEqual(codes(auditRecordRefusals({ ...record(), auditor: " Build  Agent " }, board, ACC)), ["AUDITOR_IS_BUILDER"]);
  assert.deepEqual(codes(auditRecordRefusals({ ...record(), auditor: "" }, board, ACC)), ["AUDITOR_UNNAMED"]);
  assert.deepEqual(codes(auditRecordRefusals({ ...record(), builder: undefined }, board, ACC)), ["BUILDER_UNNAMED"]);
  const noSha = record(); delete noSha.rows.X1.contractSha256;
  assert.deepEqual(codes(auditRecordRefusals(noSha, board, ACC)), ["CONTRACT_NOT_CITED"]);
  const wrongSha = record(); wrongSha.rows.X2.contractSha256 = "c".repeat(64);
  assert.deepEqual(codes(auditRecordRefusals(wrongSha, board, ACC)), ["CONTRACT_NOT_THE_FROZEN_ONE"]);
  assert.deepEqual(codes(auditRecordRefusals(record(), board, ACC, { mustCover: ["X1", "X2", "X4"] })), ["ROW_NOT_AUDITED"]);
  const noAcc = record(); noAcc.rows.X4 = { contractSha256: "d".repeat(64), clauses: { C1: { recorded: "NONE", verdict: "AGREE", reason: "r" } } };
  assert.deepEqual(codes(auditRecordRefusals(noAcc, board, ACC)), ["NO_FROZEN_CONTRACT"]);
  /* audited against another board's state, with no verdict, with no reason */
  const stale = record(); stale.rows.X2.clauses.C2.recorded = "PROVED";
  assert.deepEqual(codes(auditRecordRefusals(stale, board, ACC)), ["RECORDED_STATE_NOT_THE_BOARDS"]);
  const bad = record(); bad.rows.X1.clauses.C1 = { recorded: "PROVED", verdict: "MAYBE", reason: "" };
  assert.deepEqual(codes(auditRecordRefusals(bad, board, ACC)), ["NO_VERDICT", "VERDICT_WITHOUT_REASON"]);
  assert.deepEqual(codes(auditRecordRefusals(null, board, ACC)), ["NO_AUDIT_RECORD"]);
});

test("C2 · the declaration lists every deferred clause by row, from each row's LATEST VERIFIED event", () => {
  const d = doneDeclaration(fixture());
  assert.deepEqual(d.deferred.map((r) => [r.featureId, r.clauses.map((c) => [c.clause, c.why])]), [["X2", [["C2", "a real client file"]]]]);
  assert.equal(d.deferredClauseCount, 1);
  /* FIRING CONTROL: a reader of the FIRST VERIFIED event would list X2 C1 — the declaration does not */
  assert.ok(!d.deferred.some((r) => r.clauses.some((c) => c.clause === "C1")));
  /* FIRING CONTROL: a deferred clause with no reason is named, and the board is not done */
  const noWhy = fixture(); noWhy[1].events[1] = V({ C1: "PROVED", C2: DEFERRED });
  const n = doneDeclaration(noWhy);
  assert.deepEqual([n.deferredWithoutReason, n.deferred[0].clauses[0].why], [["X2 C2"], null]);
  /* a VERIFIED row with no VERIFIED event is named, never done silently */
  assert.deepEqual(doneDeclaration([{ featureId: "Y", state: "VERIFIED-PASS", events: [] }]).verifiedWithoutEvent, ["Y"]);
});

test("C3 · every row that is not VERIFIED is named with its recorded reason; a row with none is HIDDEN and the board is not done", () => {
  const d = doneDeclaration([...fixture(), { featureId: "X6", state: "IN-PROGRESS", events: [] }], { notRequired: { X5: { since: "2026-10-03", reason: "out of scope by owner decision" } } });
  assert.deepEqual(d.notVerified.map((n) => [n.featureId, n.state, n.reasonSource]), [["X3", "IN-PROGRESS", REASON_SOURCE.LATEST_EVENT], ["X4", "BLOCKED-BY-EVIDENCE", REASON_SOURCE.BLOCKER], ["X5", "IN-PROGRESS", REASON_SOURCE.NOT_REQUIRED], ["X6", "IN-PROGRESS", REASON_SOURCE.NONE]]);
  assert.equal(d.notVerified[1].reason, "the source refuses robots");
  /* an IN-PROGRESS row's VERIFIED event never puts it among the deferred — it is not VERIFIED */
  assert.ok(!d.deferred.some((r) => r.featureId === "X3"));
  /* FIRING CONTROLS: the hidden row is named, and the board is NOT DONE */
  assert.deepEqual([d.hidden, d.done], [["X6"], false]);
  assert.match(declarationLines(d)[0], /HIDDEN X6 · NOT DONE$/);
  assert.equal(notVerifiedReason({ featureId: "Z", state: "IN-PROGRESS" }).source, REASON_SOURCE.NONE);
  /* POSITIVE CONTROL: every row VERIFIED (or NOT REQUIRED) with reasons → DONE */
  const all = doneDeclaration(fixture().slice(0, 2));
  assert.deepEqual([all.notVerified.length, all.done], [0, true]);
  assert.equal(doneDeclaration([fixture()[0], fixture()[4]], { notRequired: { X5: { reason: "r" } } }).done, true);
});

/* ── REAL: the actual board, built exactly as bin/fboard-status.mjs builds it ── */
const board = buildBoard(CAPABILITIES, DECLARED);
const status = () => spawnSync(process.execPath, ["bin/fboard-status.mjs"], { cwd: REPO, encoding: "utf8" });

test("REAL · C2 + C3 · the declaration's deferred list equals the board's, and every row that is not VERIFIED is named with its reason", () => {
  const d = doneDeclaration(board, { notRequired: NOT_REQUIRED });
  assert.equal(d.total, 96);
  assert.equal(d.verified.length + d.notVerified.length, board.length, "a row left out of the declaration");
  /* C2 · independently from the raw declared rows: every DEFERRED clause of every VERIFIED-PASS row's latest VERIFIED event */
  const expected = Object.values(DECLARED).filter((r) => r.state === "VERIFIED-PASS").flatMap((r) => { const e = r.events.filter((x) => x.kind === "VERIFIED").at(-1); return Object.entries(e?.clauses ?? {}).filter(([, s]) => s === DEFERRED).map(([c]) => `${r.featureId} ${c}`); }).sort();
  const listed = d.deferred.flatMap((r) => r.clauses.map((c) => `${r.featureId} ${c.clause}`)).sort();
  assert.ok(expected.length > 0, "EMPTY real population: no deferred clause on the board");
  assert.deepEqual(listed, expected);
  assert.deepEqual(d.deferredWithoutReason, []);
  /* and equal to what the board's own production entry point prints */
  const r = status();
  assert.equal(r.status, 0, r.stderr);
  const printed = [...(r.stdout.split(/\r?\n/).find((l) => l.startsWith("deferred (light proof rule 3):")) ?? "").matchAll(/(F\d+) VERIFIED \(\d+ deferred: ([^)]+)\)/g)].flatMap((m) => m[2].split(", ").map((c) => `${m[1]} ${c}`)).sort();
  assert.deepEqual(listed, printed);
  /* C3 · a board census: the rows the entry point prints as not VERIFIED-PASS are exactly the declaration's, each with a reason */
  const notPassed = r.stdout.split(/\r?\n/).map((l) => /^ {2}(F\d+) (\S+)/.exec(l)).filter((m) => m && m[2] !== "VERIFIED-PASS" && m[2] !== "UNASSESSED").map((m) => m[1]).sort();
  const unassessed = board.filter((x) => x.state === "UNASSESSED").map((x) => x.featureId);
  assert.deepEqual(d.notVerified.map((n) => n.featureId).filter((id) => !unassessed.includes(id)).sort(), notPassed);
  assert.ok(d.notVerified.every((n) => n.reason.trim()), "a row not VERIFIED without its reason");
  assert.deepEqual(d.hidden, []);
  console.log(`  REAL: ${declarationLines(d).map((l) => l.trim()).join(" | ")}`);
});

const RECORD = process.env.F89_AUDIT_RECORD;
test("REAL · C1 · the separate auditor's record: auditor not the builder, every RR-291 row cited by its frozen contract sha256", { skip: RECORD && existsSync(RECORD) ? false : "no audit record named (set F89_AUDIT_RECORD to the auditor's JSON record)" }, () => {
  const rec = JSON.parse(readFileSync(RECORD, "utf8"));
  /* the rows built under the RR-291 command, except F89 itself — the auditor's own row */
  const built = board.filter((x) => (x.events ?? []).some((e) => /RR-291/.test(e.command?.path ?? ""))).map((x) => x.featureId).filter((id) => id !== "F89");
  assert.ok(built.length >= 28, `EMPTY or shrunken population: ${built.length}`);
  assert.deepEqual(auditRecordRefusals(rec, board, ACCEPTANCES, { mustCover: built }), []);
  /* FIRING CONTROL on the real record: the same record signed by the builder is refused */
  assert.ok(codes(auditRecordRefusals({ ...rec, auditor: rec.builder }, board, ACCEPTANCES, { mustCover: built })).includes("AUDITOR_IS_BUILDER"));
  const verdicts = Object.values(rec.rows).flatMap((r) => Object.values(r.clauses));
  console.log(`  REAL: auditor "${rec.auditor}" · ${built.length} rows · ${verdicts.length} clauses · DISAGREE ${verdicts.filter((v) => v.verdict === "DISAGREE").length}`);
});
