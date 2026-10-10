/**
 * 🔴 RR-248 Q4 · NO HARNESS RUN APPENDS TO THE PRODUCTION TRAIL OR ITS WITNESS (src/audit-trail/harness-run.mjs).
 *
 * On 10 Oct 2026 the f16-collection harness's limb S19 removed a bin's test-seam halt; a proof test then ran that bin outside a
 * test context and it appended 5 events to the production trail and its witness (7226 → 7231, committed as the true record,
 * RR-248 Q3). The owner's ruling (Q4): by code, no deliberate harness run can append there, whatever limb it applies.
 *
 *   HR-1  ONE ROUTE: the production store is built in one place, it asks for live harness runs before every append, the witness is
 *         written only by that append, and the gate marks every deliberate run after its refusal check
 *   HR-2  THE REFUSAL, on the real production wiring in a disposable git repository: unmarked → the append lands in the trail and
 *         the witness; a LIVE mark → refused, trail and witness byte-identical; a mark whose process has exited → the append lands
 *   HR-3  THE GATE, end to end in a disposable copy: a deliberate run is marked while it runs — visible to a grandchild whose
 *         environment is EMPTY — and unmarked when it exits; a bare run marks nothing
 *
 * Nothing here touches the real trail: every store is in a fresh temporary repository. test/helpers/rr248-sabotage.mjs R11–R14
 * prove these tests can fail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { WITNESS_FILE } from "../src/audit-trail/witness.mjs";
import { HARNESS_RUNS_DIR, HarnessRunAppendRefused, liveHarnessRuns, markHarnessRun } from "../src/audit-trail/harness-run.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTH = { propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F08"] };
const RECORD = AUTHORITY_CORPUS.find((r) => r.propositionId === AUTH.propositionId);
const BASE = Date.now() - 3600 * 1000;
let n = 0;
const draft = () => ({
  eventType: "BOARD_TRANSITION", action: "TEST_HARNESS_RUN_ACTION", outcome: "RECORDED", reasonCode: "TEST",
  occurredAt: isoSeconds(BASE + 1000 * ++n), actor: "test/rr248-harness-run-refusal.test.mjs", actorType: "ENGINE",
  scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
  authorityRef: { ...AUTH, scope: [...AUTH.scope] }, authorityHash: RECORD.contentHash,
  softwareVersion: "engine:test", evidenceRefs: [], correlationId: "rr248-harness-run", parentEventId: null,
  migration: false, migrationSource: null, migratedAt: null, metadata: {},
});
const dirs = [];
test.after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const git = (repo, ...a) => execFileSync("git", ["-C", repo, "-c", "user.name=rr248", "-c", "user.email=rr248@invalid", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const fresh = (tag) => { const d = mkdtempSync(join(tmpdir(), `rr248-${tag}-`)); dirs.push(d); git(d, "init", "-q"); return d; };
const bytes = (p) => (existsSync(p) ? readFileSync(p).toString("base64") : "absent");
const lines = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).length : 0);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("HR-1 · ONE ROUTE: one production store, asked before every append; the witness written only by that append; the gate marks every deliberate run", () => {
  const files = execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "tools", "config"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  assert.ok(files.length >= 300, `${files.length} production files — the census cannot be this small`);
  const creators = files.filter((f) => /\bcreateAuditStore\s*\(/.test(strip(readFileSync(join(REPO, f), "utf8")))).sort();
  assert.deepEqual(creators, ["src/audit-trail/store.mjs", "src/audit-trail/wiring.mjs"], "a second place builds an audit store — it would append without the harness-run refusal");
  const afterAppend = files.filter((f) => /\.afterAppend\s*\(/.test(strip(readFileSync(join(REPO, f), "utf8"))));
  assert.deepEqual(afterAppend, ["src/audit-trail/store.mjs"], "the witness is written somewhere other than the store's append");
  const wiring = strip(readFileSync(join(REPO, "src/audit-trail/wiring.mjs"), "utf8"));
  assert.match(wiring, /assertLocation: at \? \(\) => \{\} : \(\) => \{ assertDeclaredAuditLocation\(repo\); assertNoHarnessRun\(repo\); \}/, "the production store does not ask for live harness runs before an append");
  const gate = strip(readFileSync(join(REPO, "test/helpers/harness-gate.mjs"), "utf8"));
  const refusal = gate.indexOf("process.exit(2);"), mark = gate.indexOf("markHarnessRun(");
  assert.ok(refusal > 0 && mark > refusal, "the gate does not mark a deliberate run (after its refusal check)");
});

test("HR-2 · THE REFUSAL on the real production wiring: unmarked appends; a LIVE mark refuses with trail and witness unchanged; an exited process's mark is ignored", () => {
  const repo = fresh("store");
  const store = productionAuditStore({ repo, clock: () => isoSeconds(Date.now()), forbiddenSubstrings: [] });
  const trail = join(repo, AUDIT_STORE.eventsPath), witness = join(git(repo, "rev-parse", "--absolute-git-dir").trim(), WITNESS_FILE);
  store.append(draft());
  assert.equal(lines(trail), 1, "CONTROL: an unmarked append did not land in the trail");
  assert.equal(lines(witness), 1, "CONTROL: an unmarked append did not land in the witness");

  const mark = markHarnessRun(repo, { pid: process.pid, onExit: () => {} });
  try {
    assert.deepEqual(liveHarnessRuns(repo), [process.pid]);
    const [t0, w0] = [bytes(trail), bytes(witness)];
    assert.throws(() => store.append(draft()), (e) => e instanceof HarnessRunAppendRefused && e.code === "HARNESS_RUN_APPEND_REFUSED", "a harness run appended to the production trail");
    assert.equal(bytes(trail), t0, "the refused append changed the trail");
    assert.equal(bytes(witness), w0, "the refused append changed the witness");
  } finally { rmSync(mark, { force: true }); }

  const gone = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8" }).pid;
  const stale = markHarnessRun(repo, { pid: gone, onExit: () => {} });
  try {
    assert.deepEqual(liveHarnessRuns(repo), [], "a mark left by an exited process still refuses");
    store.append(draft());
    assert.equal(lines(trail), 2);
    assert.equal(lines(witness), 2);
  } finally { rmSync(stale, { force: true }); }
});

test("HR-3 · THE GATE end to end: a deliberate run is marked while it runs (seen by a grandchild with an EMPTY environment) and unmarked when it exits; a bare run marks nothing", () => {
  const dir = fresh("gate");
  mkdirSync(join(dir, "test", "helpers"), { recursive: true });
  mkdirSync(join(dir, "src", "audit-trail"), { recursive: true });
  for (const f of ["test/helpers/harness-gate.mjs", "src/audit-trail/harness-run.mjs"]) writeFileSync(join(dir, f), readFileSync(join(REPO, f)));
  writeFileSync(join(dir, "test", "helpers", "probe-sabotage.mjs"), [
    'import "./harness-gate.mjs";',
    'import { spawnSync } from "node:child_process";',
    'const repo = new URL("../../", import.meta.url);',
    'const child = `import { liveHarnessRuns } from ${JSON.stringify(new URL("src/audit-trail/harness-run.mjs", repo).href)}; console.log(JSON.stringify(liveHarnessRuns(${JSON.stringify(decodeURIComponent(repo.pathname.replace(/^\\/([A-Za-z]:)/, "$1")))})));`;',
    'const r = spawnSync(process.execPath, ["--input-type=module", "-e", child], { encoding: "utf8", env: {} });',
    'console.log(`SELF ${process.pid} SEEN ${r.stdout.trim()} ERR ${r.stderr.trim().slice(0, 200)}`);',
    "",
  ].join("\n"));
  const marks = () => { const d = join(git(dir, "rev-parse", "--absolute-git-dir").trim(), HARNESS_RUNS_DIR); return existsSync(d) ? readdirSync(d) : []; };
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; delete env.NODE_TEST_WORKER_ID;

  const bare = spawnSync(process.execPath, ["test/helpers/probe-sabotage.mjs"], { cwd: dir, env, encoding: "utf8" });
  assert.equal(bare.status, 2, bare.stderr);
  assert.deepEqual(marks(), [], "a bare (refused) run left a mark");

  const run = spawnSync(process.execPath, ["test/helpers/probe-sabotage.mjs", "--deliberate"], { cwd: dir, env, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const m = run.stdout.match(/SELF (\d+) SEEN (\[[^\]]*\])/);
  assert.ok(m, `the probe printed no verdict: ${run.stdout} ${run.stderr}`);
  assert.deepEqual(JSON.parse(m[2]), [Number(m[1])], "the deliberate run was not seen as a live harness run by its own grandchild");
  assert.deepEqual(marks(), [], "the deliberate run's mark outlived it");
});
