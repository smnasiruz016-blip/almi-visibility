/**
 * 🔴 NO SYMBOLIC LINK INSIDE THIS REPOSITORY — so `confineToRepo`'s path-text
 * check cannot be bypassed through one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { symlinkCensus } from "../tools/symlink-census.mjs";

test("🔴 the repository holds ZERO symbolic links — on disk or in git's index", () => {
  const r = symlinkCensus();
  assert.ok(r.scanned > 100, `only ${r.scanned} entries walked — the census population is too small to trust a zero`);
  assert.deepEqual(r.links, [], `symbolic link(s) inside the repository: ${r.links.join(", ")} — confineToRepo can be bypassed through them`);
  assert.deepEqual(r.trackedLinks, [], `symbolic link(s) committed to git: ${r.trackedLinks.join(", ")}`);
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
