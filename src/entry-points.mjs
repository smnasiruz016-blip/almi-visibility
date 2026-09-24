/**
 * 🔴 EVERY PRODUCTION ENTRY POINT — ONE DEFINITION (F02 relocation, 24 Sep 2026).
 *
 * Production entry points are the engine's own `bin/*.mjs` AND every tool a declared subject package owns
 * (`subjects/<id>/tools/*.mjs`, listed in its package.mjs). Before the relocation every census enumerated `bin/` for
 * itself; moving a governed tool into a subject package would then have hidden a production caller from every census —
 * the one thing a census may never allow. They all read this instead.
 *
 * Tracked files only (git's index), so an untracked scratch file is never counted and a committed tool never missed.
 * Generic: names no subject.
 */
import { execFileSync } from "node:child_process";

const ENGINE_ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const SUBJECT_TOOL = /^subjects\/[a-z0-9]+(?:-[a-z0-9]+)*\/tools\/[^/]+\.mjs$/;

/** @returns {string[]} repository-relative paths, sorted: bin/ first, then subject tools. */
export function productionEntryPoints({ repo = ENGINE_ROOT } = {}) {
  const tracked = execFileSync("git", ["-C", repo, "ls-files", "bin", "subjects"], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean);
  const bins = tracked.filter((f) => /^bin\/[^/]+\.mjs$/.test(f)).sort();
  const tools = tracked.filter((f) => SUBJECT_TOOL.test(f)).sort();
  return [...bins, ...tools];
}
