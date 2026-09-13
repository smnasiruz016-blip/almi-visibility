/**
 * 🔴 THE OWNER'S COMPLETION RULING VERIFIES ITSELF — AGAINST GIT'S STORED BLOB.
 *
 * `OWNER_RULING_2026-09-13_COMPLETION_LAW.md` is the owner's reply of 13 September
 * 2026, frozen verbatim. "Verbatim" is a claim; these two pins make it falsifiable:
 *
 *   1. THE BLOB — `git hash-object` of the file, which is what git STORES. It is
 *      the same on a Windows checkout (CRLF) and on the Linux CI runner (LF). The
 *      sha256 of the checked-out bytes is NOT: E-CL-2 (PR #60) failed CI for
 *      exactly that, and the trap is one line away in any file-hash pin.
 *   2. THE BODY — the sha256 of the text below the first `---` rule, line endings
 *      normalised to LF. The blob covers our header too; the body hash says
 *      whether it was HIS words that moved or only ours.
 *
 * Plus three things that must be IN the body: the completion loop, the five
 * reopen grounds as he wrote them, and his closing instruction to freeze it.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export const RULING_FILE = "OWNER_RULING_2026-09-13_COMPLETION_LAW.md";
export const EXPECTED_BLOB = "33338a81c70791fbf03f71db10dba203c6771ca9";
export const EXPECTED_BODY_SHA256 = "40cb3ebc2257373b99a3f682a4e7c6ab01d7243fc54164bfecb0a4798ab9711d";
export const BODY_MARKER = "\n---\n\n";

export const COMPLETION_LOOP = "BUILD / FIX → TARGETED VERIFY → EVIDENCE → CLOSE → NEXT ITEM → FINAL INDEPENDENT AUDIT → DONE.";
export const OWNER_REOPEN_SENTENCE =
  "Closed item ko dobara sirf concrete contradictory evidence, real regression, authoritative requirement change, safety/data risk, ya owner-approved scope change par kholo.";
export const FREEZE_LINE = "OWNER RULING — FREEZE THIS INTERPRETATION";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** The blob id git would store for these bytes at the ruling's path — its attributes and EOL filter applied. */
export function blobOf(bytes, repo = REPO) {
  return execFileSync("git", ["hash-object", "--stdin", `--path=${RULING_FILE}`], { cwd: repo, input: bytes, encoding: "utf8" }).trim();
}

export function bodyOf(bytes) {
  const text = Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n");
  const at = text.indexOf(BODY_MARKER);
  return at === -1 ? null : text.slice(at + BODY_MARKER.length);
}

export function verifyRuling({ repo = REPO, bytes = readFileSync(`${repo}${RULING_FILE}`) } = {}) {
  const blob = blobOf(bytes, repo);
  const body = bodyOf(bytes);
  const bodySha = body === null ? null : createHash("sha256").update(body, "utf8").digest("hex");
  const checks = {
    blobMatches: blob === EXPECTED_BLOB,
    bodyMatches: bodySha === EXPECTED_BODY_SHA256,
    hasCompletionLoop: Boolean(body?.includes(COMPLETION_LOOP)),
    hasReopenGrounds: Boolean(body?.includes(OWNER_REOPEN_SENTENCE)),
    endsWithFreeze: Boolean(body?.trimEnd().endsWith(FREEZE_LINE)),
  };
  return { blob, bodySha, checks, ok: Object.values(checks).every(Boolean) };
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (invokedDirectly) {
  const r = verifyRuling();
  console.log(RULING_FILE);
  console.log(`  git blob    : ${r.blob}  ${r.checks.blobMatches ? "matches" : `🔴 expected ${EXPECTED_BLOB}`}`);
  console.log(`  body sha256 : ${r.bodySha}  ${r.checks.bodyMatches ? "matches" : `🔴 expected ${EXPECTED_BODY_SHA256}`}`);
  console.log(`  completion loop present : ${r.checks.hasCompletionLoop}`);
  console.log(`  reopen grounds present  : ${r.checks.hasReopenGrounds}`);
  console.log(`  ends with the freeze    : ${r.checks.endsWithFreeze}`);
  console.log(r.ok ? "\nthe owner's ruling is verified" : "\n🔴 VERIFICATION FAILED — the frozen ruling has changed");
  process.exit(r.ok ? 0 : 1);
}
