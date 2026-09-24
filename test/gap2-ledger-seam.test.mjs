/**
 * 🔴 GAP 2 · THE CONFINED LEDGER-PATH SEAM — paid-provider-controls ALONE (owner ruling, 17 September 2026)
 *
 * bin/paid-provider-controls.mjs appended its refusals to the one real cost ledger, so its --confirm leg could not
 * run in a test without changing committed evidence (test/paid-provider-controls.test.mjs pins that ledger to
 * exactly one refusal per code). It now takes `--ledger=`, resolved by the SAME confineToRepo as its default, AT
 * BIN LEVEL — src/cost/ledger.mjs is untouched, so no other ledger-constructing bin gains an override.
 *
 *   DEFAULT          — no --ledger: the run is what it was, and the real ledger is not touched.
 *   CONFINEMENT      — a ledger outside this repository (an absolute temp path, and a ../ escape) is REFUSED, by
 *                      the confinement gate, before the gate is built or the ledger opened, even WITH --confirm.
 *   POSITIVE CONTROL — a ledger inside the repository, with --confirm: the five refusals land there, and only there.
 *   NOT PERMISSION   — the same inside ledger WITHOUT --confirm: refused by the write law, the file untouched.
 *                      An override chooses WHERE, never WHETHER.
 *   SYMLINK          — the override inherits confineToRepo's stated semantics (src/write-law.mjs: lexical, not
 *                      physical). Shown WITHOUT --confirm only; nothing is written through a link.
 *
 * WHICH GATE FIRED is read from what the binary prints, never from the exit code alone:
 *   CONFINEMENT   — "REFUSED — --ledger "<path>" resolves to … OUTSIDE this repository" (confineToRepo)
 *   AUTHORIZATION — "every refusal left a trace: 5 of 5 in the dry-run ledger (in memory)"
 *   WRITE         — "every refusal left a trace: 5 of 5 in the REAL ledger (<path>)"
 * exactly one must be present; a run showing none never reached either gate.
 *
 * 🔴 SAFETY: the ../ escape is built to climb out of the repository and land INSIDE this test's own disposable
 * temp directory — never beside the repository, where other repositories live. If confinement were broken, the
 * write would land only in that directory. The provider is the in-process FAKE double; no paid provider, network,
 * browser or data repository is touched. Fixtures live in git-ignored .test-scratch — never under runs/export,
 * runs/evidence, runs/audit or runs/cost, where test/ungated-writers.test.mjs's guardDir sweeps by pattern
 * (D-SWEEP-1, recorded and not fixed here).
 */
import { test } from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { REFUSAL_CODES } from "../src/cost/paid-provider-gate.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BIN = "bin/paid-provider-controls.mjs";
const DEFAULT_LEDGER = join(REPO, "runs", "cost", "ledger.jsonl");
const fingerprint = (f) => (existsSync(f) ? createHash("sha256").update(readFileSync(f)).digest("hex") : "ABSENT");
const lines = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim() !== "") : []);

const SWEPT = ["export", "evidence", "audit", "cost"].map((d) => join(REPO, "runs", d) + sep);
function scratchDir() {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO, ".test-scratch", "ledger-seam-"));
  assert.ok(SWEPT.every((s) => !(dir + sep).startsWith(s)), `fixture ${dir} sits under a guardDir-swept directory`);
  return dir;
}
const outsideDir = () => mkdtempSync(join(tmpdir(), "ledger-seam-outside-"));

const CONFINEMENT = /REFUSED — --ledger "[^\n]*" resolves to [^\n]*, which is OUTSIDE this repository/;
const AUTHORIZATION = /every refusal left a trace: 5 of 5 in the dry-run ledger \(in memory\)/;
const WRITE = /every refusal left a trace: 5 of 5 in the REAL ledger \(([^\n]*)\)/;
const REACHED = /calls that reached the fake provider: 2/;

const run = (args) => spawnSync(process.execPath, WORLD.argv([BIN, ...args]), { cwd: REPO, encoding: "utf8", timeout: 60_000, env: WORLD.envWith() });
function gateFired(r) {
  const seen = [CONFINEMENT.test(r.stderr) && "CONFINEMENT", AUTHORIZATION.test(r.stdout) && "AUTHORIZATION", WRITE.test(r.stdout) && "WRITE"].filter(Boolean);
  assert.ok(seen.length <= 1, `more than one gate outcome printed (${seen.join(", ")})`);
  return seen[0] ?? "NEITHER";
}
const show = (r) => `\nstatus: ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`;

/** The five refusal entries a run appends: one per code, every one against the FAKE provider. */
function assertFiveFakeRefusals(entries) {
  assert.equal(entries.length, 5, `expected 5 ledger entries, got ${entries.length}`);
  assert.ok(entries.every((e) => e.run_kind === "paid-provider-call" && e.outcome === "REFUSED"), "an appended entry is not a paid-provider refusal");
  assert.ok(entries.every((e) => e.refusal.fake === true), "an appended refusal is not against the fake provider");
  assert.deepEqual(entries.map((e) => e.refusal.code).sort(), [...REFUSAL_CODES].sort());
}

test("DEFAULT · no --ledger: the dry run is unchanged — five refusals, two fake calls, the in-memory ledger — and the real ledger is untouched", () => {
  const before = fingerprint(DEFAULT_LEDGER);
  const r = run([]);
  assert.equal(r.status, 0, show(r));
  assert.equal(gateFired(r), "AUTHORIZATION", show(r));
  assert.match(r.stdout, /\[dry-run\] no writes will happen — no --confirm/);
  assert.match(r.stdout, /refusals: 5 · codes: /);
  assert.match(r.stdout, REACHED);
  assert.match(r.stdout, /no real paid provider was called and no account exists/);
  assert.equal(fingerprint(DEFAULT_LEDGER), before, "the default run changed the real ledger");
});

test("DEFAULT · the default ledger is still runs/cost/ledger.jsonl, under its old label, when no --ledger is given", () => {
  const src = readFileSync(join(REPO, BIN), "utf8");
  assert.match(src, /confineToRepo\(ledgerArg \?\? `\$\{REPO\}runs\/cost\/ledger\.jsonl`, \{ label: ledgerArg === undefined \? "the cost ledger" : "--ledger" \}\)/);
  assert.match(src, /LEDGER_SHOWN = ledgerArg === undefined \? "runs\/cost\/ledger\.jsonl" : LEDGER/);
});

test("🔴 CONFINEMENT · an absolute ledger OUTSIDE the repository is refused by the confinement gate, even with --confirm, before the gate is built", () => {
  const before = fingerprint(DEFAULT_LEDGER);
  const outside = outsideDir();
  const target = join(outside, "ledger.jsonl");
  try {
    const r = run([`--ledger=${target}`, "--confirm"]);
    assert.equal(gateFired(r), "CONFINEMENT", show(r));
    assert.notEqual(r.status, 0, "a refused destination must not exit 0");
    assert.doesNotMatch(r.stdout, /calls that reached the fake provider/, "the provider gate ran after a refused destination");
    assert.equal(existsSync(target), false, "the outside ledger was created");
    assert.deepEqual(readdirSync(outside), [], "something was written outside the repository");
    assert.equal(fingerprint(DEFAULT_LEDGER), before, "the real ledger changed");
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("🔴 CONFINEMENT · a ../ escape out of the repository is refused by the confinement gate, even with --confirm", (t) => {
  const before = fingerprint(DEFAULT_LEDGER);
  const outside = outsideDir();
  const target = join(outside, "ledger.jsonl");
  // SAFE ADVERSARIAL FORM: a relative path that climbs out of the repository and lands in OUR temp directory
  const escape = relative(REPO, target);
  try {
    if (isAbsolute(escape)) return t.skip(`the temp directory is on another drive (${outside}); no ../ path reaches it`);
    assert.ok(escape.startsWith(`..${sep}`), `the escape ${escape} does not climb out of the repository`);
    assert.equal(resolve(REPO, escape), target);
    const r = run([`--ledger=${escape}`, "--confirm"]);
    assert.equal(gateFired(r), "CONFINEMENT", show(r));
    assert.notEqual(r.status, 0);
    assert.deepEqual(readdirSync(outside), [], "something was written outside the repository");
    assert.equal(fingerprint(DEFAULT_LEDGER), before, "the real ledger changed");
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CONTROL · a ledger INSIDE the repository, with --confirm: the five refusals land there, and only there — and a second run appends five more", () => {
  const before = fingerprint(DEFAULT_LEDGER);
  const dir = scratchDir();
  const ledger = join(dir, "ledger.jsonl");
  try {
    assert.equal(existsSync(ledger), false);
    const r = run([`--ledger=${ledger}`, "--confirm"]);
    assert.equal(r.status, 0, show(r));
    assert.equal(gateFired(r), "WRITE", show(r));
    assert.equal(r.stdout.match(WRITE)[1], ledger, "the run reported a different ledger than the one it was given");
    assert.match(r.stdout, REACHED);
    const first = lines(ledger);
    assertFiveFakeRefusals(first.map((l) => JSON.parse(l)));

    // paired transition: the ledger is read and appended to, not rewritten
    const r2 = run([`--ledger=${ledger}`, "--confirm"]);
    assert.equal(gateFired(r2), "WRITE", show(r2));
    const second = lines(ledger);
    assert.equal(second.length, 10);
    assert.deepEqual(second.slice(0, 5), first, "the second run changed the entries the first one wrote");
    assertFiveFakeRefusals(second.slice(5).map((l) => JSON.parse(l)));

    assert.deepEqual(readdirSync(dir), ["ledger.jsonl"], "the run wrote something beside its ledger");
    assert.equal(fingerprint(DEFAULT_LEDGER), before, "the run wrote to the real ledger");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CONTROL · a relative ledger whose ../ stays inside the repository resolves lexically, exactly as confineToRepo resolves it", () => {
  const before = fingerprint(DEFAULT_LEDGER);
  const dir = scratchDir();
  const name = relative(join(REPO, ".test-scratch"), dir);
  const winding = [".test-scratch", name, "..", name, "ledger.jsonl"].join("/");
  try {
    const r = run([`--ledger=${winding}`, "--confirm"]);
    assert.equal(gateFired(r), "WRITE", show(r));
    assert.equal(r.stdout.match(WRITE)[1], join(dir, "ledger.jsonl"));
    assertFiveFakeRefusals(lines(join(dir, "ledger.jsonl")).map((l) => JSON.parse(l)));
    assert.equal(fingerprint(DEFAULT_LEDGER), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 NOT PERMISSION · the same inside ledger WITHOUT --confirm: the controls run and are refused the write, and the ledger is untouched", () => {
  const before = fingerprint(DEFAULT_LEDGER);
  const dir = scratchDir();
  const absent = join(dir, "absent.jsonl");
  const held = join(dir, "held.jsonl");
  try {
    // a ledger that does not exist stays absent
    const r1 = run([`--ledger=${absent}`]);
    assert.equal(r1.status, 0, show(r1));
    assert.equal(gateFired(r1), "AUTHORIZATION", show(r1));
    assert.match(r1.stdout, /\[dry-run\] no writes will happen — no --confirm/);
    assert.match(r1.stdout, REACHED, "the refusals were not reached");
    assert.equal(existsSync(absent), false, "a ledger was created without --confirm");

    // a ledger that holds entries stays byte-identical
    assert.equal(gateFired(run([`--ledger=${held}`, "--confirm"])), "WRITE");
    const fixture = fingerprint(held);
    const r2 = run([`--ledger=${held}`]);
    assert.equal(gateFired(r2), "AUTHORIZATION", show(r2));
    assert.equal(fingerprint(held), fixture, "the ledger changed without --confirm");

    assert.equal(fingerprint(DEFAULT_LEDGER), before, "the real ledger changed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SYMLINK · a link inside the repository is judged lexically, as src/write-law.mjs states — shown without --confirm, nothing written through it", (t) => {
  const dir = scratchDir();
  const outside = outsideDir();
  const link = join(dir, "link");
  try {
    try {
      symlinkSync(outside, link, "junction");
    } catch (e) {
      return t.skip(`this machine cannot create a directory link (${e.code})`);
    }
    const r = run([`--ledger=${join(link, "ledger.jsonl")}`]);
    // accepted by confinement (the path is lexically inside), then refused by the write law
    assert.equal(gateFired(r), "AUTHORIZATION", show(r));
    assert.deepEqual(readdirSync(outside), [], "something was written through the link");
  } finally {
    rmSync(link, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("the controlled ledgers are created directly inside .test-scratch, outside every guardDir-swept directory", () => {
  const dir = scratchDir();
  try {
    assert.equal(dirname(dir), join(REPO, ".test-scratch"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
