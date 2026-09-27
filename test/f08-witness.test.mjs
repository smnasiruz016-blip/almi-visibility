/**
 * 🔴 F08 · THE OUT-OF-TREE WITNESS (27 September 2026) — src/audit-trail/witness.mjs, wired in wiring.mjs.
 *
 * The defect it answers: 65 governed events were appended through the production path and then removed by git
 * checkout of the trail files (_handoffs 5fd0435), and nothing noticed, because a checkout rewrites the events file
 * and its head record TOGETHER — the store's declared undetected case.
 *
 * Every git proof here runs in a throwaway repository under the OS temporary directory, through the PRODUCTION store
 * (productionAuditStore). It writes a real trail, runs a real git operation over it, and asserts two things. Detection:
 * verify reports TRAIL_BEHIND_WITNESS. Refusal: the next append throws AUDIT_WITNESS_REFUSED and writes nothing. Each
 * firing case has a control that shares its code and reaches the other verdict: the same writes with no git operation.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { AuditWitnessRefused, WITNESS_FILE, createWitness, gitDirWitnessLocator, linesOf, relate } from "../src/audit-trail/witness.mjs";

const F08_AUTHORITY = { propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F08"] };
const F08_RECORD = AUTHORITY_CORPUS.find((r) => r.propositionId === F08_AUTHORITY.propositionId);
assert.ok(F08_RECORD, "the real corpus must hold F08's acceptance ruling");

const BASE = Date.now() - 3600 * 1000;
const clock = () => isoSeconds(Date.now());
let n = 0;
/** A lawful draft; each call a distinct occurrence (its own occurredAt), so each append is a new event. */
const draft = () => ({
  eventType: "BOARD_TRANSITION", action: "TEST_WITNESS_ACTION", outcome: "RECORDED", reasonCode: "TEST",
  occurredAt: isoSeconds(BASE + 1000 * ++n), actor: "test/f08-witness.test.mjs", actorType: "ENGINE",
  scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
  authorityRef: { ...F08_AUTHORITY, scope: [...F08_AUTHORITY.scope] }, authorityHash: F08_RECORD.contentHash,
  softwareVersion: "engine:test", evidenceRefs: [], correlationId: "witness-test", parentEventId: null,
  migration: false, migrationSource: null, migratedAt: null, metadata: {},
});

const dirs = [];
test.after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const git = (repo, ...a) => execFileSync("git", ["-C", repo, "-c", "user.name=witness-test", "-c", "user.email=witness-test@invalid", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const TRAIL = [AUDIT_STORE.eventsPath, AUDIT_STORE.headPath];

/** A fresh repository holding one COMMITTED event, then one more appended and left uncommitted — the incident's shape. */
function repoWithUncommittedEvent() {
  const repo = mkdtempSync(join(tmpdir(), "f08-witness-"));
  dirs.push(repo);
  git(repo, "init", "-q");
  const store = productionAuditStore({ repo, clock, forbiddenSubstrings: [] });
  store.append(draft());
  git(repo, "add", "--", ...TRAIL);
  git(repo, "commit", "-q", "-m", "one committed event");
  store.append(draft());
  return { repo, store };
}
const lineCount = (p) => (existsSync(p) ? linesOf(readFileSync(p, "utf8")).length : 0);
const refusalOf = (fn) => { try { fn(); return null; } catch (e) { return e; } };

/* ── W1 · the relation, hand-worked ───────────────────────────────────────────────────────────────────────────── */
test("W1 · relate: EQUAL, TRAIL_EXTENDS_WITNESS, WITNESS_ABSENT, WITNESS_AHEAD, DIVERGED — hand-worked", () => {
  assert.deepEqual(relate(["a", "b"], ["a", "b"]), { relation: "EQUAL", trail: 2, witness: 2, common: 2 });
  assert.deepEqual(relate(["a", "b", "c"], ["a"]), { relation: "TRAIL_EXTENDS_WITNESS", trail: 3, witness: 1, common: 1 });
  assert.deepEqual(relate(["a"], null), { relation: "WITNESS_ABSENT", trail: 1, witness: 0, common: 0 });
  assert.deepEqual(relate(["a"], ["a", "b", "c"]), { relation: "WITNESS_AHEAD", trail: 1, witness: 3, common: 1 });
  assert.deepEqual(relate(["a", "x"], ["a", "b"]), { relation: "DIVERGED", trail: 2, witness: 2, common: 1 });
  assert.deepEqual(relate([], []), { relation: "EQUAL", trail: 0, witness: 0, common: 0 });
  assert.deepEqual(linesOf("a\r\nb\r\n"), ["a", "b"], "CRLF must not read as a divergence");
});

/* ── W2 · write → git operation → detection AND refusal, one case per destructive operation ───────────────────── */
const OPS = {
  "checkout -- <trail>": (r) => git(r, "checkout", "-q", "--", ...TRAIL),
  "restore <trail>": (r) => git(r, "restore", "--", ...TRAIL),
  "reset --hard": (r) => git(r, "reset", "-q", "--hard"),
  "stash": (r) => git(r, "stash", "-q"),
};
for (const [name, op] of Object.entries(OPS)) {
  test(`W2 · ${name} after an uncommitted production append — verify DETECTS it and the next append is REFUSED`, () => {
    const { repo, store } = repoWithUncommittedEvent();
    const witnessPath = gitDirWitnessLocator(repo)();
    assert.equal(lineCount(join(repo, AUDIT_STORE.eventsPath)), 2);
    assert.equal(lineCount(witnessPath), 2, "WITNESS-RECORD: the witness must hold both appends before the git operation");

    op(repo);
    assert.equal(lineCount(join(repo, AUDIT_STORE.eventsPath)), 1, `the operation must actually have removed the event (${name})`);
    assert.equal(lineCount(witnessPath), 2, `${name} must not reach the witness`);

    const v = store.verify();
    assert.deepEqual(v.findings.map((f) => f.code), ["TRAIL_BEHIND_WITNESS"], "WITNESS-DETECT: verify did not report the event the git operation removed");
    assert.equal(v.ok, false, "WITNESS-DETECT: verify called a shortened trail clean");
    assert.equal(v.findings[0].missing, 1);
    assert.equal(v.witness.relation, "WITNESS_AHEAD");

    const before = readFileSync(join(repo, AUDIT_STORE.eventsPath), "utf8");
    const e = refusalOf(() => store.append(draft()));
    assert.ok(e instanceof AuditWitnessRefused, `WITNESS-REFUSE: an append onto the shortened trail was not refused (got ${e?.message ?? "an append"})`);
    assert.equal(e.status.relation, "WITNESS_AHEAD");
    assert.equal(readFileSync(join(repo, AUDIT_STORE.eventsPath), "utf8"), before, "a refused append wrote to the trail");
    assert.equal(lineCount(witnessPath), 2, "a refused append wrote to the witness");
  });
}

test("W2 · CONTROL — the same writes with NO git operation: verify is clean, the witness EQUAL, the next append lands in both", () => {
  const { repo, store } = repoWithUncommittedEvent();
  const witnessPath = gitDirWitnessLocator(repo)();
  const v = store.verify();
  assert.equal(v.ok, true, "WITNESS-CONTROL: clean writes were reported as a loss " + JSON.stringify(v.findings));
  assert.equal(v.witness.relation, "EQUAL");
  assert.equal(store.append(draft()).status, "APPENDED");
  assert.equal(lineCount(join(repo, AUDIT_STORE.eventsPath)), 3);
  assert.equal(lineCount(witnessPath), 3);
  assert.equal(readFileSync(witnessPath, "utf8"), readFileSync(join(repo, AUDIT_STORE.eventsPath), "utf8").replace(/\r\n/g, "\n"));
});

test("W2 · the witness lives in the git directory, so clean -fdx cannot reach it either", () => {
  const { repo } = repoWithUncommittedEvent();
  const witnessPath = gitDirWitnessLocator(repo)();
  assert.equal(witnessPath, join(git(repo, "rev-parse", "--absolute-git-dir").trim(), WITNESS_FILE), "WITNESS-LOCATION: the witness is not inside the git directory");
  git(repo, "clean", "-q", "-fdx");
  assert.equal(lineCount(witnessPath), 2, "WITNESS-LOCATION: clean -fdx reached the witness");
});

/* ── W3 · the lawful directions: seed and catch-up ──────────────────────────────────────────────────────────── */
test("W3 · WITNESS_ABSENT is seeded from the trail; TRAIL_EXTENDS_WITNESS catches up — neither is refused", () => {
  const { repo, store } = repoWithUncommittedEvent();
  const witnessPath = gitDirWitnessLocator(repo)();
  rmSync(witnessPath);
  assert.equal(store.verify().witness.relation, "WITNESS_ABSENT");
  assert.equal(store.verify().ok, true, "an absent witness is NOT MEASURED, not a finding");
  assert.equal(store.append(draft()).status, "APPENDED");
  assert.equal(lineCount(witnessPath), 3, "WITNESS-SEED: an absent witness was not seeded with the 2 existing lines before the new one");

  writeFileSync(witnessPath, linesOf(readFileSync(witnessPath, "utf8")).slice(0, 1).join("\n") + "\n");
  assert.equal(store.verify().witness.relation, "TRAIL_EXTENDS_WITNESS");
  assert.equal(store.append(draft()).status, "APPENDED");
  assert.equal(store.verify().witness.relation, "EQUAL");
  assert.equal(lineCount(witnessPath), 4);
});

/* ── W4 · divergence ────────────────────────────────────────────────────────────────────────────────────────── */
test("W4 · DIVERGED — a line both hold differs: verify reports TRAIL_DIVERGES_FROM_WITNESS and the append is refused", () => {
  const { repo, store } = repoWithUncommittedEvent();
  const witnessPath = gitDirWitnessLocator(repo)();
  const w = linesOf(readFileSync(witnessPath, "utf8"));
  w[0] = w[0].replace("TEST_WITNESS_ACTION", "TEST_WITNESS_ALTERED");
  writeFileSync(witnessPath, w.join("\n") + "\n");
  const v = store.verify();
  assert.deepEqual(v.findings.map((f) => f.code), ["TRAIL_DIVERGES_FROM_WITNESS"], "WITNESS-DIVERGE: verify did not report the divergence");
  assert.equal(v.findings[0].at, 1);
  const e = refusalOf(() => store.append(draft()));
  assert.ok(e instanceof AuditWitnessRefused, "WITNESS-DIVERGE: an append onto a diverged trail was not refused");
  assert.equal(e.status.relation, "DIVERGED");
});

/* ── W5 · scope of the witness ─────────────────────────────────────────────────────────────────────────────── */
test("W5 · a confined store (`at`) has NO witness; an unlocatable witness refuses the production append, and verify only reports it", () => {
  const dir = mkdtempSync(join(tmpdir(), "f08-witness-confined-"));
  dirs.push(dir);
  const confined = productionAuditStore({ repo: dir, clock, forbiddenSubstrings: [], at: { eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json") } });
  assert.equal(confined.append(draft()).status, "APPENDED");
  assert.equal(confined.verify().witness, null);

  const notARepo = productionAuditStore({ repo: dir, clock, forbiddenSubstrings: [] });
  assert.equal(notARepo.verify().witness.relation, "WITNESS_UNLOCATABLE");
  const e = refusalOf(() => notARepo.append(draft()));
  assert.ok(e instanceof AuditWitnessRefused, "WITNESS-FAILCLOSED: a production append with no locatable witness was not refused");
  assert.equal(e.status.relation, "WITNESS_UNLOCATABLE");
});

test("W5 · a git worktree has its OWN witness — a scratch worktree can never write into the main one", () => {
  const { repo } = repoWithUncommittedEvent();
  const wt = join(mkdtempSync(join(tmpdir(), "f08-witness-wt-")), "wt");
  dirs.push(wt);
  git(repo, "worktree", "add", "-q", "--detach", wt, "HEAD");
  assert.notEqual(gitDirWitnessLocator(wt)(), gitDirWitnessLocator(repo)());
});

test("W6 · createWitness writes only through the declared calls — status() never writes", () => {
  const dir = mkdtempSync(join(tmpdir(), "f08-witness-pure-"));
  dirs.push(dir);
  const p = join(dir, WITNESS_FILE);
  const w = createWitness({ locate: () => p });
  assert.equal(w.status(["a"]).relation, "WITNESS_ABSENT");
  assert.equal(existsSync(p), false, "status() created the witness");
  w.beforeAppend(["a"]);
  w.afterAppend("b\n");
  assert.equal(readFileSync(p, "utf8"), "a\nb\n");
});
