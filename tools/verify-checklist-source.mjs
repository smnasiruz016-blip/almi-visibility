/**
 * 🔴 THE FROZEN CHECKLIST TEXT VERIFIES ITSELF.
 *
 * `KEY_FEATURE_CHECKLIST_SOURCE.md` is the owner's governing DONE standard, and its
 * value depends entirely on the text being the text he sent. A provenance header
 * saying "verbatim" is a claim; a recomputed hash is that claim made falsifiable.
 *
 * ── WHY THE HASH COVERS THE BODY AND NOT THE WHOLE FILE ─────────────────────
 *
 * The file is header + body. If the hash covered the whole file, correcting a typo
 * in OUR header would look identical to tampering with HIS text — and the only way
 * to fix it would be to edit the recorded hash, which is exactly the move the hash
 * exists to detect. Hashing the body alone keeps the two separable: the header is
 * ours and may change, the body is his and may not.
 *
 * ── AND WHY THE COUNT IS CHECKED TOO ────────────────────────────────────────
 *
 * A hash catches a changed byte. It does not tell a reader WHAT the document is
 * supposed to contain. `58` is the number every status report is measured against,
 * so it is asserted independently — if the source ever carries 57 or 59 features,
 * the tracker is measuring a different document and must say so.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/** Everything after the first line that is exactly `---` on its own. */
export const BODY_MARKER = "\n---\n\n";

export const EXPECTED_BODY_SHA256 = "906efcc32b9a8553fb3b2f60a8736d6cf07d9bff3d49e4a93d34ecc5def768c6";
export const EXPECTED_DOCX_SHA256 = "e58fbeb4fcc6e4d967d87ad9b60fc7e8985c05a1c08cc833376c1c6aadf66a0e";
export const EXPECTED_FEATURE_COUNT = 58;

/** Split the frozen file into our header and the owner's body. */
export function splitSource(text) {
  const idx = text.indexOf(BODY_MARKER);
  if (idx === -1) throw new Error("KEY_FEATURE_CHECKLIST_SOURCE.md has no body marker");
  return { header: text.slice(0, idx), body: text.slice(idx + BODY_MARKER.length) };
}

/**
 * Count the numbered features in the body.
 *
 * The docx table renders each feature as a bare number on its own line followed by
 * a status cell. Counting the SEQUENCE 1..N rather than "lines that look numeric"
 * means a stray number elsewhere cannot inflate the count.
 */
export function countFeatures(body) {
  const lines = body.split("\n").map((l) => l.trim());
  let expected = 1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === String(expected) && (lines[i + 1] ?? "").startsWith("| ☐")) expected += 1;
  }
  return expected - 1;
}

export function verify(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const { body } = splitSource(text);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  return { sha, matches: sha === EXPECTED_BODY_SHA256, featureCount: countFeatures(body) };
}
