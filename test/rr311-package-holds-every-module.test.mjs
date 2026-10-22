/**
 * RR-311 (found while building Setup-12): three new modules (youtube-signin, youtube-insights, ai-coach) were imported by the app but missing
 * from the Setup's file list — the installed app would have stopped at its first line. Every file the app imports, from desktop/main.mjs
 * onwards, must be in what desktop/build.mjs packs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("THE SETUP PACKS EVERY MODULE THE APP IMPORTS: desktop files by name; src, config and site by their folders", () => {
  const build = readFileSync(join(REPO, "desktop", "build.mjs"), "utf8");
  const listed = new Set([...build.matchAll(/for \(const f of \[([^\]]+)\]\) copyFileSync\(join\(REPO, "desktop", f\)/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])));
  const folders = [...build.matchAll(/for \(const d of \[([^\]]+)\]\) cpSync/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  const siteFiles = [...build.matchAll(/for \(const f of \[([^\]]+)\]\) copyFileSync\(join\(REPO, "site", f\)/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => `site/${x[1]}`));
  assert.ok(listed.has("main.mjs") && folders.includes("src"), "the build's lists were not read");
  const seen = new Set(), todo = [join(REPO, "desktop", "main.mjs")], missing = [];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    const rel = relative(REPO, f).replace(/\\/g, "/");
    const packed = rel.startsWith("desktop/") ? listed.has(rel.slice(8)) : folders.some((d) => rel.startsWith(`${d}/`)) || siteFiles.includes(rel);
    if (!packed) missing.push(rel);
    for (const m of readFileSync(f, "utf8").matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) { const next = resolve(dirname(f), m[1]); if (existsSync(next) && /\.m?js$/.test(next)) todo.push(next); }
  }
  assert.deepEqual(missing, [], `imported by the app but not packed by the Setup: ${missing.join(", ")}`);
  assert.ok(seen.size > 20, `only ${seen.size} files reached — the import reader is broken`);
});
