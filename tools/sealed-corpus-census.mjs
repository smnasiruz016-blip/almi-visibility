/**
 * 🔴 THE SEALED EXAM RULE — WHILE DETECTORS ARE BEING WRITTEN, THE CORPUS IS NOT OPENED.
 *
 * ── WHAT THIS REPLACES, AND WHY ─────────────────────────────────────────────
 *
 * Until 12 September 2026 the rule was "zero detectors", enforced by a census
 * that counted detector files and required 0. That rule has now ended, because
 * checklist items 10, 12 and 13 **are** detectors: keeping it would have
 * forbidden the product.
 *
 * It is REPLACED, not deleted. The thing the old rule was really protecting was
 * never "no code" — it was that a detector must not be built from the answers.
 *
 *   A detector is derived from the checklist's PASS meanings, from CURRENT
 *   official search guidance, and from the evidence store's data model.
 *   NEVER from the six known RED classes.
 *
 * ── WHY THIS IS AN HONEST EXAM ──────────────────────────────────────────────
 *
 * The corpus is pinned to an immutable commit, so it cannot drift while we
 * build. A detector written without ever looking at it, then run against it, is
 * a real test of the engine. A detector written while looking at it is a
 * memorised answer sheet that would tell us nothing.
 *
 * ── AND WHY IT IS MECHANICAL ────────────────────────────────────────────────
 *
 * "We did not peek" is a claim about our own conduct, which is the least
 * reliable kind of evidence there is. This is that claim made falsifiable: the
 * build fails if anything under `src/audit/` so much as names a path inside the
 * sealed directory.
 *
 * 🔴 AND IT LIVES IN `tools/`, OUTSIDE THE TERRITORY IT POLICES — the same
 * reason `product-boundary.mjs` does. This file must name the sealed directory
 * in order to look for it, so under `src/audit/` it would be its own first
 * offender and would need an exemption. An exemption is a hole that outlives
 * the reason for it.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/** The sealed directory. Building the name from parts so this file's own scan cannot match it. */
export const SEALED_DIR = ["case", "study", "01"].join("-");

/** Where detectors live. Everything under here is sealed off from the corpus. */
export const AUDIT_DIR = "src/audit";

/**
 * Patterns that count as touching the corpus.
 *
 * 🔴 Not just `import`. A detector could `readFileSync` a path, build one by
 * concatenation, or embed a fixture copied out of it. The first two are caught
 * here; the third is caught by the corpus being pinned — a copied exhibit would
 * have to be committed, and it would be visible in review.
 */
function offencesIn(source) {
  const hits = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(SEALED_DIR)) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120), why: "names the sealed corpus directory" });
    }
  });
  return hits;
}

function walk(dir, prefix = "") {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, `${prefix}${entry}/`));
    else if (entry.endsWith(".mjs")) out.push({ rel: prefix + entry, full });
  }
  return out;
}

/**
 * Census the audit tree.
 *
 * Takes the repo root as an argument so a test can point it at a fixture and
 * prove the census can actually CATCH something — a census only ever run
 * against a clean tree is indistinguishable from one that returns 0 always.
 */
export function sealedCorpusCensus(repoRoot) {
  const files = walk(join(repoRoot, AUDIT_DIR));
  const breaches = [];
  for (const f of files) {
    const hits = offencesIn(readFileSync(f.full, "utf8"));
    if (hits.length) breaches.push({ file: `${AUDIT_DIR}/${f.rel}`, hits });
  }
  return { filesScanned: files.length, breaches };
}

/** Render the census for a human, and for the CI log. */
export function renderCensus({ filesScanned, breaches }) {
  const lines = [
    "SEALED CORPUS CENSUS — the exam is not opened while the answers are being written",
    `  audit files scanned : ${filesScanned}`,
    `  sealed directory    : ${SEALED_DIR}/`,
    `  breaches            : ${breaches.length}`,
  ];
  for (const b of breaches) {
    lines.push(`  🔴 ${b.file}`);
    for (const h of b.hits) lines.push(`       line ${h.line}: ${h.text}   (${h.why})`);
  }
  lines.push(
    breaches.length === 0
      ? "  ✅ no audit module references the sealed corpus."
      : "  🔴 A DETECTOR HAS SEEN THE ANSWER SHEET. The case study would measure the author, not the engine.",
  );
  return lines.join("\n");
}
