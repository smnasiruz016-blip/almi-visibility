/**
 * 🔴 THE SITEMAP RESIDENCY CENSUS — real captured sitemap material may not live in this repository.
 *
 * The engine held 1.7 MB of real sitemap observations for eight days: 5 collections, 20,895 real
 * URLs from live hosts. Nobody decided that. The collector wrote beside itself and the file was
 * committed, exactly as had already happened once with the crawl store. Both times the fix was to
 * move the material out; this census is what stops a third time.
 *
 * ── IT POLICES WHAT IS COMMITTED, NOT WHAT EXISTS ──────────────────────────
 *
 * The collector still writes to a path inside this repository when an operator runs it. That is not
 * what this census prevents, and pretending otherwise would be a guard that has to be obeyed by
 * every future script author to work. What it prevents is that material becoming part of the
 * repository — so it reads the COMMITTED file list, which is the thing that actually travels.
 *
 * ── AND IT READS CONTENT, NOT FILENAMES ────────────────────────────────────
 *
 * A rule keyed to a path is defeated by `git mv`. What makes a file forbidden is that it CONTAINS a
 * real captured population, so that is what gets judged. A fixture must DECLARE itself synthetic;
 * an undeclared record of capture shape is forbidden. That is the same principle as the tenancy it
 * sits beside — the engine reads declarations and never infers, and an absent declaration is never
 * "probably fine".
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { classifySitemapArtifact, RESIDENCY } from "../src/tenancy/sitemap-residency.mjs";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Files big enough that reading them all would be slow, and never plausible record files. */
const SKIP_EXT = [".br", ".png", ".jpg", ".gif", ".ico", ".woff", ".woff2", ".pdf", ".zip"];
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Classify every committed text file. Returns the forbidden ones with their reason.
 *
 * 🔴 It reports the POPULATION it examined alongside the verdict. A census that says "0 forbidden"
 * without saying how many files it read is indistinguishable from one that read nothing.
 */
export function sitemapResidencyCensus({ repo = REPO } = {}) {
  const tracked = execFileSync("git", ["-C", repo, "ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n").filter(Boolean);

  const forbidden = [];
  const fixtures = [];
  let examined = 0, skipped = 0;

  for (const rel of tracked) {
    if (SKIP_EXT.some((e) => rel.endsWith(e))) { skipped += 1; continue; }
    const abs = join(repo, rel);
    let size;
    try { size = statSync(abs).size; } catch { skipped += 1; continue; }
    if (size > MAX_BYTES) { skipped += 1; continue; }
    let content;
    try { content = readFileSync(abs, "utf8"); } catch { skipped += 1; continue; }
    examined += 1;

    const verdict = classifySitemapArtifact({ content });
    if (verdict === "FORBIDDEN_REAL_OBSERVATIONS") forbidden.push({ file: rel, verdict, why: RESIDENCY[verdict] });
    else if (verdict === "ALLOWED_FIXTURE") fixtures.push(rel);
  }

  return { repo, tracked: tracked.length, examined, skipped, forbidden, fixtures };
}

/* Runnable on its own, the way the other censuses in this directory are. */
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = sitemapResidencyCensus();
  console.log(`SITEMAP RESIDENCY CENSUS — ${r.repo}`);
  console.log(`  tracked ${r.tracked} · examined ${r.examined} · skipped ${r.skipped} (binary or oversized)`);
  console.log(`  declared synthetic fixtures: ${r.fixtures.length}${r.fixtures.length ? ` — ${r.fixtures.join(", ")}` : ""}`);
  console.log(`  FORBIDDEN: ${r.forbidden.length}`);
  for (const f of r.forbidden) console.log(`     ${f.file} — ${f.why}`);
  process.exitCode = r.forbidden.length === 0 ? 0 : 1;
}
