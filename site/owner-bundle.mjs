#!/usr/bin/env node
/**
 * 🔴 RR-369b · THE SERVER'S DEPLOY FOLDER, FROM THE CODE IN THIS CHECKOUT. Run on fresh main, by the owner. Writes only into --out. It reads no key and no env file, and it deploys nothing.
 * The folder holds exactly what the function serves: the file list of the last deploy folder (--like), each file taken from this checkout's HEAD, plus whatever site/app.mjs now imports that the list lacks. The folder's own api/, package.json, vercel.json and .vercelignore come from --like: the repo's package.json and vercel.json are other files, never the server's.
 *   node site/owner-bundle.mjs --like=C:\Projects\_deploy\almivisibility-rr369 --out=C:\Projects\_deploy\almivisibility-rr369b
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const OWN_FILES = new Set([".vercelignore", "package.json", "vercel.json", "api/index.mjs", "owner-google-sign-in.mjs"]);
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** every local file a module imports, from HEAD's text */
export function importClosure(start, read) {
  const seen = new Set(), todo = [...start];
  while (todo.length) { const f = todo.pop(); if (seen.has(f)) continue; const t = read(f); if (t === null) continue; seen.add(f); if (!f.endsWith(".mjs")) continue; for (const m of t.matchAll(/(?:^|[\s;])(?:import|export)\s[^"'`;]*?from\s+["'](\.\.?\/[^"']+)["']|import\(\s*["'](\.\.?\/[^"']+)["']\s*\)|new URL\(\s*["'](\.\.?\/[^"']+)["']\s*,\s*import\.meta\.url/g)) todo.push(posix.normalize(posix.join(posix.dirname(f), m[1] ?? m[2] ?? m[3]))); }
  return seen;
}
export function bundle({ repo, like, out }) {
  if (resolve(like) === resolve(out)) throw new Error("--out must be a new folder");
  const inHead = new Set(execFileSync("git", ["-C", repo, "ls-tree", "-r", "--name-only", "HEAD"], { encoding: "utf8", maxBuffer: 1e9 }).split("\n")), show = (f) => (inHead.has(f) ? execFileSync("git", ["-C", repo, "show", `HEAD:${f}`], { maxBuffer: 1e9 }) : null);
  const list = walk(like).map((f) => relative(like, f).replace(/\\/g, "/")), kept = [], fromHead = [], added = [];
  const closure = importClosure(["site/app.mjs"], (f) => show(f)?.toString("utf8") ?? null);
  rmSync(out, { recursive: true, force: true });
  const put = (rel, b) => { const to = join(out, rel); mkdirSync(dirname(to), { recursive: true }); writeFileSync(to, b); };
  for (const rel of list) { if (OWN_FILES.has(rel) || !inHead.has(rel)) { put(rel, readFileSync(join(like, rel))); kept.push(rel); } else { put(rel, show(rel)); fromHead.push(rel); } }
  for (const rel of closure) if (!list.includes(rel)) { put(rel, show(rel)); added.push(rel); }
  return { head: execFileSync("git", ["-C", repo, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(), fromHead: fromHead.length, kept, added };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3), like = arg("like"), out = arg("out"), repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!like || !out || !existsSync(like)) { console.error("usage: node site/owner-bundle.mjs --like=<the last deploy folder> --out=<a new folder>"); process.exit(1); }
  const r = bundle({ repo, like, out }); console.log(`from HEAD ${r.head}: ${r.fromHead} files; kept from the last folder: ${r.kept.join(", ")}; new: ${r.added.join(", ") || "none"}`); console.log(`ready: ${out}`);
}
