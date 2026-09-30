/**
 * F90 · FALSIFIABILITY OF FINDINGS (acceptance _handoffs 73b50bf, RR-99 §4; prerequisites #204, #205; RR-102).
 *
 * Every expected result below is written by hand from its fixture. Fixture stores live in memory or a temp dir; the real stores are read,
 * never written; nothing is fetched and no check's run() is called by the census; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { actionablePopulation, refutationOf, falsifiabilityCensus, PARTS } from "../src/audit/f90-falsifiability.mjs";
import { readFalsifiabilityCensus, trackedStores, readStore } from "../src/audit/f90-falsifiability-reader.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* a fixture check: never run — its run() throws, so a census that re-ran a check would fail here */
/* an explicit `undefined` must stay undefined (a default parameter would silently fill it) */
const chk = (id, over = {}) => ({
  id,
  version: "version" in over ? over.version : "1",
  boundary: "boundary" in over ? over.boundary : { observes: [`what ${id} observes`], fires: [{ id: `${id}-fires`, when: `${id}'s condition` }] },
  run: () => { throw new Error("the census re-ran a check"); },
});
const issue = (id, over = {}) => ({ record_type: "issue", issue_id: id, issue_class: "c1", verdict: "FAIL", state: "OPEN", detector: "d1", detector_version: "1", evidence: ["o1"], ...over });
const move = (id, to, over = {}) => ({ record_type: "issue_state_change", issue_id: id, from: "OPEN", to, changed_at: "2026-09-20T00:00:00Z", reason: "r", evidence: ["o9"], action: "bin/x.mjs", actor: "a", superseded_by: null, ...over });
const store = (name, records, unparseable = 0) => ({ name, records, unparseable });
const D1 = [chk("d1")];

/* ================= C1 — the actionable population ================= */

test("C1 · exactly OPEN + FAIL + not superseded is actionable; UNKNOWN, closed and superseded are counted apart; one finding in two stores is one", () => {
  const a = store("a", [
    issue("f-open"),
    issue("f-unknown", { verdict: "UNKNOWN" }),
    issue("f-closed"), move("f-closed", "CLOSED"),
    issue("f-old"), issue("f-new", { supersedes: "f-old" }), move("f-old", "SUPERSEDED", { superseded_by: "f-new" }),
  ]);
  const b = store("b", [issue("f-open")]);
  const p = actionablePopulation([a, b]);
  assert.deepEqual(p.actionable.map((f) => f.id).sort(), ["f-new", "f-open"]);
  assert.deepEqual(p.apart, { OPEN_NOT_FAIL: 1, CLOSED: 1, SUPERSEDED: 1 });
  assert.deepEqual(p.verdictsApart, { UNKNOWN: 1 });
  const open = p.actionable.find((f) => f.id === "f-open");
  assert.deepEqual([open.stores, open.copies], [["a", "b"], 2], "one finding in two stores must be ONE finding with both copies counted");
  assert.equal(p.unreadable.length, 0);
});

test("C1 · FIRING CONTROLS: an unreadable population fails closed — COULD-NOT-PROVE, never a silent drop", () => {
  const cases = {
    SUPERSEDED_WITHOUT_A_RECORDED_MOVE: [store("a", [issue("f1"), issue("f2", { supersedes: "f1" })])],
    ONE_FINDING_READS_DIFFERENTLY_ACROSS_STORES: [store("a", [issue("f1")]), store("b", [issue("f1", { verdict: "UNKNOWN" })])],
    UNPARSEABLE_LINES: [store("a", [issue("f1")], 1)],
    LIFECYCLE_ERRORS: [store("a", [issue("f1"), move("f-missing", "CLOSED")])],
  };
  for (const [reason, stores] of Object.entries(cases)) {
    const c = falsifiabilityCensus({ stores, checks: D1 });
    assert.equal(c.verdict, "COULD-NOT-PROVE", reason);
    assert.ok(c.population.unreadable.some((u) => u.reason === reason), `${reason} was not named`);
  }
});

/* ================= C2 — a held method ================= */

test("C2 · a held method is the registered check at its declared live version; anything else is named, never assumed", () => {
  const checks = new Map([["d1", chk("d1")], ["d-nover", chk("d-nover", { version: undefined })]]);
  const held = refutationOf({ id: "x", issue_class: "c", detector: "d1", detector_version: "1" }, checks);
  assert.deepEqual(held.method, { check: "d1", version: "1" });
  const cases = [
    [{ detector: "d-gone", detector_version: "1" }, /no registered check is named "d-gone"/],
    [{ detector: "d1", detector_version: "2" }, /live at version 1; the finding was recorded by version "2"/],
    [{ detector: "d-nover", detector_version: "1" }, /declares no live version .* NOT MEASURED/],
  ];
  for (const [f, fact] of cases) {
    const r = refutationOf({ id: "x", issue_class: "c", ...f }, checks);
    assert.equal(r.method, null);
    assert.equal(r.falsifiable, false);
    assert.match(r.missing.find((m) => m.part === "METHOD").fact, fact);
  }
});

/* ================= C3 — a structured refutation ================= */

test("C3 · the three parts are TAKEN from the held check's declaration — the same objects, never written freehand", () => {
  const c = chk("d1");
  const r = refutationOf({ id: "x", issue_class: "c", detector: "d1", detector_version: "1" }, new Map([["d1", c]]));
  assert.equal(r.observation, c.boundary.observes, "OBSERVATION is not the held check's own declaration");
  assert.equal(r.threshold, c.boundary.fires, "THRESHOLD is not the held check's own declaration");
  assert.deepEqual(r.missing, []);
  assert.equal(r.falsifiable, true);
});

test("C3 · FIRING CONTROL: a held check with no boundary leaves OBSERVATION and THRESHOLD NOT MEASURED, each naming its missing fact", () => {
  const r = refutationOf({ id: "x", issue_class: "c", detector: "d1", detector_version: "1" }, new Map([["d1", chk("d1", { boundary: undefined })]]));
  assert.equal(r.observation, null);
  assert.equal(r.threshold, null);
  assert.deepEqual(r.missing.map((m) => m.part), ["OBSERVATION", "THRESHOLD"]);
  assert.match(r.missing[0].fact, /d1 declares no boundary: what it observes/);
  assert.match(r.missing[1].fact, /d1 declares no boundary: the conditions it fires on/);
  const unheld = refutationOf({ id: "x", issue_class: "c", detector: "d9", detector_version: "1" }, new Map());
  assert.deepEqual(unheld.missing.map((m) => m.part), PARTS, "a finding with no held method must miss all three parts");
});

/* ================= C4 — the census ================= */

test("C4 · PROVED only when every actionable finding is falsifiable; one that is not DISPROVES, by its own class and missing part", () => {
  const stores = [store("a", [issue("f1"), issue("f2", { issue_class: "c2", detector: "d2" }), issue("f3", { verdict: "UNKNOWN", detector: "d9" })])];
  const ok = falsifiabilityCensus({ stores, checks: [chk("d1"), chk("d2")] });
  assert.equal(ok.verdict, "PROVED");
  assert.equal(ok.falsifiable, 2);
  const bad = falsifiabilityCensus({ stores, checks: [chk("d1"), chk("d2", { boundary: undefined })] });
  assert.equal(bad.verdict, "DISPROVED");
  assert.deepEqual(bad.byClass, { c1: { falsifiable: 1, notFalsifiable: 0 }, c2: { falsifiable: 0, notFalsifiable: 1 } }, "classes merged or mis-split");
  assert.deepEqual(bad.byMissingPart, { METHOD: 0, OBSERVATION: 1, THRESHOLD: 1 });
  assert.match(bad.bound, /1 store\(s\) holding findings · 3 logical finding\(s\) · 2 actionable \(2 physical copies\) · 2 registered check\(s\) · nothing fetched, re-run or written/);
});

test("C4 · FIRING CONTROL: an EMPTY actionable population is never PROVED", () => {
  const c = falsifiabilityCensus({ stores: [store("a", [issue("f1", { verdict: "UNKNOWN" })])], checks: D1 });
  assert.equal(c.verdict, "COULD-NOT-PROVE");
  assert.match(c.why, /EMPTY/);
});

test("C4 · the stores are the TRACKED ones: an untracked store is not read, and a newly committed store cannot be missed", () => {
  const dir = mkdtempSync(join(tmpdir(), "f90-"));
  try {
    const git = (...a) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" });
    git("init", "-q");
    mkdirSync(join(dir, "runs", "audit"), { recursive: true });
    writeFileSync(join(dir, "runs", "audit", "a.jsonl"), JSON.stringify(issue("f1")) + "\n");
    writeFileSync(join(dir, "runs", "audit", "b.jsonl"), JSON.stringify(issue("f2", { detector: "d-unheld" })) + "\n");
    git("add", "runs/audit/a.jsonl");
    assert.deepEqual(trackedStores(dir), ["runs/audit/a.jsonl"]);
    assert.equal(readFalsifiabilityCensus({ root: dir, checks: D1 }).census.verdict, "PROVED");
    git("add", "runs/audit/b.jsonl");
    const c = readFalsifiabilityCensus({ root: dir, checks: D1 }).census;
    assert.equal(c.verdict, "DISPROVED", "a committed store holding an unheld finding was missed");
    assert.equal(readStore(dir, "runs/audit/a.jsonl").records.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= REAL — the census over the recorded findings ================= */

/* an INDEPENDENT count, written without the lifecycle reader or the census: latest state from the recorded moves, by id */
function independentActionable() {
  const ids = new Map();
  for (const p of execFileSync("git", ["-C", REPO, "ls-files", "runs"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".jsonl"))) {
    const recs = readFileSync(join(REPO, p), "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
    const moved = new Map(recs.filter((r) => r.record_type === "issue_state_change").map((r) => [r.issue_id, r.to]));
    for (const r of recs) if (r.record_type === "issue") ids.set(r.issue_id, { detector: r.detector, open: (moved.get(r.issue_id) ?? r.state ?? "OPEN") === "OPEN", fail: r.verdict === "FAIL" });
  }
  return [...ids.entries()].filter(([, v]) => v.open && v.fail);
}

test("REAL · every recorded actionable finding is FALSIFIABLE from a held method — PROVED, non-empty, matched by an independent count", () => {
  const { census: c, storesListed } = readFalsifiabilityCensus();
  const indep = independentActionable();
  assert.ok(indep.length > 0, "the real population is empty — nothing would be proved");
  assert.equal(c.refutations.length, indep.length, "the census and an independent count disagree on the actionable population");
  assert.deepEqual(c.population.unreadable, []);
  assert.equal(c.verdict, "PROVED", c.why);
  assert.equal(c.notFalsifiable, 0);
  assert.ok(storesListed >= c.population.stores.length);
  const live = new Set(registeredChecks().map((k) => k.id));
  for (const [, v] of indep) assert.ok(live.has(v.detector), `${v.detector} is not a registered check`);
});

test("REAL · POSITIVE CONTROL: the same real census DISPROVES the moment one real detector's boundary or version is withdrawn", () => {
  const indep = independentActionable();
  const n = (d) => indep.filter(([, v]) => v.detector === d).length;
  for (const d of ["thin-content", "indexability-preflight", "exact-duplicate"]) {
    assert.ok(n(d) > 0, `${d} raised no real actionable finding — the control would be vacuous`);
    const noBoundary = registeredChecks().map((k) => (k.id === d ? { ...k, boundary: undefined } : k));
    const c1 = readFalsifiabilityCensus({ checks: noBoundary }).census;
    assert.deepEqual([c1.verdict, c1.notFalsifiable, c1.byMissingPart.OBSERVATION, c1.byMissingPart.THRESHOLD], ["DISPROVED", n(d), n(d), n(d)], d);
    const otherVersion = registeredChecks().map((k) => (k.id === d ? { ...k, version: "2" } : k));
    const c2 = readFalsifiabilityCensus({ checks: otherVersion }).census;
    assert.deepEqual([c2.verdict, c2.byMissingPart.METHOD], ["DISPROVED", n(d)], d);
  }
});

/* ================= C5 — recorded data only ================= */

test("C5 · the census module imports only the lifecycle reader; the reader imports nothing that can fetch or write", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const mod = strip(readFileSync(join(REPO, "src/audit/f90-falsifiability.mjs"), "utf8"));
  assert.deepEqual([...mod.matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]), ["../evidence/lifecycle.mjs"]);
  const reader = strip(readFileSync(join(REPO, "src/audit/f90-falsifiability-reader.mjs"), "utf8"));
  assert.match(reader, /import \{ readFileSync \} from "node:fs";/, "control: the reader's fs import is where this test looks for it");
  assert.doesNotMatch(reader, /writeFile|appendFile|mkdir|rmSync|unlink|createWriteStream|fetch\(|node:https?|node:net|connector|\.run\(/);
  assert.match(reader, /execFileSync\("git", \["ls-files"/, "the only process the reader starts is git ls-files");
});

test("C5 · THE ENTRY POINT: it prints the census, its bound and its verdict, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/finding-falsifiability.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ store\(s\) holding findings · \d+ logical finding\(s\) · \d+ actionable .* nothing fetched, re-run or written/);
    assert.match(ok.stdout, /FALSIFIABLE \d+ · NOT FALSIFIABLE \d+/);
    assert.match(ok.stdout, /verdict\s+(PROVED|DISPROVED|COULD-NOT-PROVE) — /);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
