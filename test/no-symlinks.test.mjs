/**
 * 🔴 NO SYMBOLIC LINK INSIDE THIS REPOSITORY — so `confineToRepo`'s path-text
 * check cannot be bypassed through one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, writeFileSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { symlinkCensus } from "../tools/symlink-census.mjs";

test("🔴 the repository holds ZERO symbolic links — on disk or in git's index", () => {
  const r = symlinkCensus();
  assert.ok(r.scanned > 100, `only ${r.scanned} entries walked — the census population is too small to trust a zero`);
  assert.deepEqual(r.links, [], `symbolic link(s) inside the repository: ${r.links.join(", ")} — confineToRepo can be bypassed through them`);
  assert.deepEqual(r.trackedLinks, [], `symbolic link(s) committed to git: ${r.trackedLinks.join(", ")}`);
  /* 🔴 A ZERO OFF A DISSOLVING TREE IS NOT A ZERO. Entries may vanish mid-walk because other tests
   * are deleting their scratch directories, and that is the only reason permitted: anything else
   * disappearing under a census that is looking for escape routes is itself the finding. */
  for (const v of r.vanished) {
    assert.match(v, /^\.test-scratch\//, `${v} disappeared while the census walked, and it is not test scratch`);
  }
});

test("🔴 CONTROL: a path that vanishes mid-walk is RECORDED, not silently skipped", () => {
  const repo = mkdtempSync(join(tmpdir(), "almivis-vanish-"));
  try {
    mkdirSync(join(repo, "runs"));
    writeFileSync(join(repo, "runs", "gone.txt"), "x");
    writeFileSync(join(repo, "runs", "stays.txt"), "x");
    /* the same race the suite hit, made deterministic: this one name is gone by the time the walk
     * asks what it is, and every other entry is read normally. */
    const lstat = (p) => {
      if (p.endsWith("gone.txt")) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
      return lstatSync(p);
    };
    const r = symlinkCensus({ repo, git: false, lstat });
    assert.deepEqual(r.vanished, ["runs/gone.txt"], "the vanished path was swallowed instead of recorded");
    assert.deepEqual(r.links, [], "a vanished path must not be reported as a link");
    assert.ok(r.scanned >= 2, "the walk stopped at the vanished entry instead of carrying on");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("🔴 CONTROL: the census FIRES on a planted link, and does not follow it", () => {
  const repo = mkdtempSync(join(tmpdir(), "almivis-links-"));
  const outside = mkdtempSync(join(tmpdir(), "almivis-outside-"));
  try {
    mkdirSync(join(repo, "runs"));
    // A junction needs no privilege on Windows and reports as a symbolic link.
    symlinkSync(outside, join(repo, "runs", "escape"), "junction");
    const r = symlinkCensus({ repo, git: false });
    assert.deepEqual(r.links, ["runs/escape"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
