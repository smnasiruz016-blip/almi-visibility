/**
 * ITEM 14 (d) — "WRITES ONLY INSIDE THIS REPOSITORY", EXERCISED.
 *
 * Ruling, 12 September 2026, beta-g as technical owner: *"If --out can point
 * anywhere, that condition is not being MET — it is merely not being
 * EXERCISED. AN UNEXERCISED CONSTRAINT IS NOT A CONSTRAINT."*
 *
 * So the constraint is exercised three ways: the helper is attacked directly;
 * every registered writer is checked to call it before its first write; and a
 * REAL writer is pointed outside the repository with --confirm and must refuse
 * without creating anything.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, parse } from "node:path";

import { confineToRepo, REPO_ROOT } from "../src/write-law.mjs";
import { analyseWriters, confinementOf } from "../tools/permitted-writers.mjs";
import { PERMITTED_PAGE_WRITERS } from "../config/permitted-page-writers.mjs";

/* ---- the helper --------------------------------------------------------- */

test("inside the repository: a relative path, an absolute path, and the repo root itself are allowed", () => {
  assert.equal(confineToRepo("runs/report/index.html", { cwd: REPO_ROOT }), resolve(REPO_ROOT, "runs/report/index.html"));
  assert.equal(confineToRepo(join(REPO_ROOT, "runs", "x"), { cwd: REPO_ROOT }), join(REPO_ROOT, "runs", "x"));
  assert.equal(confineToRepo(".", { cwd: REPO_ROOT }), REPO_ROOT);
  assert.equal(confineToRepo(null), null, "no destination given is not a destination to refuse");
});

test("🔴 RED: a parent-directory escape is REFUSED", () => {
  assert.throws(() => confineToRepo("../almi-oet/public", { cwd: REPO_ROOT, label: "--out" }), /REFUSED — --out .* OUTSIDE this repository/);
  assert.throws(() => confineToRepo("runs/../../elsewhere", { cwd: REPO_ROOT }), /OUTSIDE this repository/);
});

test("🔴 RED: an absolute path outside, the OS temp directory, and another drive root are REFUSED", () => {
  assert.throws(() => confineToRepo(join(tmpdir(), "x.html"), { cwd: REPO_ROOT }), /OUTSIDE this repository/);
  assert.throws(() => confineToRepo(parse(REPO_ROOT).root, { cwd: REPO_ROOT }), /OUTSIDE this repository/);
  // A relative path resolved from a cwd OUTSIDE the repository lands outside too.
  assert.throws(() => confineToRepo("runs/_profession-cache", { cwd: tmpdir() }), /OUTSIDE this repository/);
});

test("🔴 a sibling whose name merely STARTS with the repository's name is outside", () => {
  assert.throws(() => confineToRepo(`${REPO_ROOT}-evil/x.html`, { cwd: REPO_ROOT }), /OUTSIDE this repository/);
});

test("CONTROL: a directory inside the repository whose name begins with two dots is inside", () => {
  assert.equal(confineToRepo("runs/..cache/x", { cwd: REPO_ROOT }), resolve(REPO_ROOT, "runs/..cache/x"));
});

test("an empty destination is refused rather than resolved to the cwd", () => {
  assert.throws(() => confineToRepo("  "), /empty destination/);
});

/* ---- every registered writer calls it before writing ------------------ */

test("(d) 🔴 all SEVEN registered writers call confineToRepo BEFORE their first filesystem write", () => {
  const r = analyseWriters();
  assert.deepEqual(r.unconfined, []);
  for (const e of PERMITTED_PAGE_WRITERS) {
    const c = confinementOf(readFileSync(join(REPO_ROOT, e.file), "utf8"));
    assert.equal(c.confinedBeforeFirstWrite, true, `${e.file}: confine line ${c.firstConfineLine}, first write line ${c.firstWriteLine}`);
  }
});

test("🔴 CONTROL: the static check FIRES on a writer with no confinement, and on one that confines too late", () => {
  const none = 'import { writeFileSync } from "node:fs";\nconst out = arg("out");\nwriteFileSync(out, html, "utf8");\n';
  assert.equal(confinementOf(none).confinedBeforeFirstWrite, false);
  const late = 'const out = arg("out");\nmkdirSync(dirname(out), { recursive: true });\nconst safe = confineToRepo(out);\n';
  assert.equal(confinementOf(late).confinedBeforeFirstWrite, false);
  // A comment naming the helper is not a call.
  assert.equal(confinementOf('// confineToRepo(out)\nwriteFileSync(out, h, "utf8");\n').confinedBeforeFirstWrite, false);
});

/* ---- a REAL writer, pointed outside, with --confirm --------------------- */

test("🔴 RED, REAL: bin/report.mjs --confirm --out=<outside> REFUSES, exits non-zero, and creates NOTHING", () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-confine-"));
  const target = join(dir, "nested", "index.html");
  try {
    const r = spawnSync(process.execPath, ["bin/report.mjs", `--out=${target}`, "--confirm"], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.notEqual(r.status, 0, "the writer exited 0 while pointed outside the repository");
    assert.match(r.stderr, /REFUSED — --out .* OUTSIDE this repository/);
    assert.equal(existsSync(join(dir, "nested")), false, "a directory was created outside the repository before the refusal");
    assert.equal(existsSync(target), false, "a file was written outside the repository");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 REAL: bin/report.mjs with NO flags writes nothing — dry-run is the default", () => {
  const dir = mkdtempSync(join(REPO_ROOT, "runs", ".confine-probe-"));
  const target = join(dir, "index.html");
  try {
    const r = spawnSync(process.execPath, ["bin/report.mjs", `--out=${target}`], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[dry-run\] would have written/);
    assert.equal(existsSync(target), false, "the report writer wrote without --confirm");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
