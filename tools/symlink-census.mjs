#!/usr/bin/env node
/**
 * 🔴 NO SYMBOLIC LINK MAY EXIST INSIDE THIS REPOSITORY.
 *
 * `confineToRepo` (src/write-law.mjs) decides whether a destination is inside
 * this repository from the PATH TEXT. A symlink or junction inside the repo that
 * points outside would pass that check and send a write elsewhere. That hole was
 * disclosed when the check was written; this closes it the cheap way. There are
 * no links today, so a guard that requires zero costs nothing — and the hole
 * cannot open without the build going red.
 *
 * Two independent readings, so a blind walk cannot report a clean zero:
 *   - the FILESYSTEM, walked with lstat (a link is reported, never followed —
 *     on Windows a junction reports as a symbolic link too);
 *   - GIT's index, where a committed symlink has mode 120000.
 *
 * ⚠️ Skips `.git` only. `node_modules` is NOT skipped: there are no
 * dependencies, and if there ever are, a linked package is exactly the case.
 */

import { readdirSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export function symlinkCensus({ repo = REPO, git = true } = {}) {
  const links = [];
  let scanned = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (dir === repo.replace(/[\\/]$/, "") && name === ".git") continue;
      const full = join(dir, name);
      const st = lstatSync(full);
      scanned += 1;
      if (st.isSymbolicLink()) {
        links.push(relative(repo, full).split("\\").join("/"));
        continue; // reported, never followed
      }
      if (st.isDirectory()) walk(full);
    }
  };
  walk(repo.replace(/[\\/]$/, ""));

  // `git: false` only for the control, whose planted directory is not a repository.
  const tracked = git
    ? execFileSync("git", ["ls-files", "-s"], { cwd: repo, encoding: "utf8" })
        .split("\n")
        .filter((l) => l.startsWith("120000 "))
        .map((l) => l.split("\t")[1])
    : [];

  return { scanned, links: links.sort(), trackedLinks: tracked.sort() };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = symlinkCensus();
  console.log(`SYMLINK CENSUS [bound: ${r.scanned} filesystem entries walked, .git skipped; git index read]`);
  console.log(`  links on disk       : ${r.links.length ? r.links.join(", ") : 0}`);
  console.log(`  links in git (120000): ${r.trackedLinks.length ? r.trackedLinks.join(", ") : 0}`);
  const bad = r.links.length + r.trackedLinks.length;
  console.log(bad ? "🔴 a symbolic link exists — confineToRepo can be bypassed through it" : "✅ no symbolic links — confineToRepo's path check cannot be bypassed by one");
  process.exit(bad ? 1 : 0);
}
