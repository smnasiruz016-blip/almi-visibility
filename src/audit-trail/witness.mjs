/**
 * 🔴 F08 · THE OUT-OF-TREE WITNESS — THE PRODUCTION TRAIL'S DURABLE SECOND COPY (27 September 2026).
 *
 * WHY IT EXISTS. The production trail lives in a git working tree, and on 27 Sep 2026 a census showed what that costs:
 * 65 governed events (2 of them ACCESS events of real sealed reads) had been appended through the production path and
 * then removed by ordinary `git checkout` of the trail files (_handoffs 5fd0435). A checkout restores the events file
 * AND its head record together. That is exactly the store's declared undetected case (store.mjs, "THE LIMIT,
 * DECLARED"), so nothing noticed. An append-only record that a routine tool can shorten is not append-only.
 *
 * WHAT IT IS. Every production append is also appended, fsync'd, to one file inside the repository's own git
 * directory: `<git dir>/audit-trail-witness.jsonl`. It is a plain line-for-line copy of the trail. Git's working-tree
 * operations never touch that file:
 *
 *   checkout · restore · reset --hard · stash · clean -fdx · switch
 *
 * All of these rewrite the working tree and the index. None of them touches an unknown file in the git directory. A
 * `git worktree` has its own git directory, so a scratch worktree has its own witness and can never pollute the main one.
 *
 * THE RULE, BEFORE EVERY PRODUCTION APPEND — the trail is compared with the witness, line for line:
 *
 *   EQUAL                   append; the witness receives the same line.
 *   TRAIL_EXTENDS_WITNESS   the trail holds committed lines the witness lacks (a pull, a merge). The witness catches up
 *                           first, then the append proceeds. Git history is never a loss.
 *   WITNESS_ABSENT          a fresh clone. It is SEEDED from the trail as it stands, then the append proceeds. (Trust on
 *                           first use — declared below.)
 *   WITNESS_AHEAD           🔴 REFUSED. The witness holds events the trail no longer has: they were appended and then
 *                           removed. Nothing more is appended onto a shortened trail.
 *   DIVERGED                🔴 REFUSED. The two disagree at a line both hold.
 *
 * `verify` reports WITNESS_AHEAD as TRAIL_BEHIND_WITNESS and DIVERGED as TRAIL_DIVERGES_FROM_WITNESS, so the
 * consistent truncation the store alone cannot see is now DETECTED whenever a witness exists.
 *
 * Confined test stores (`at` in wiring.mjs) have NO witness. The witness belongs to the production path only.
 */
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";

/** Product-neutral by construction: the name says what it is and names no client, product or subject. */
export const WITNESS_FILE = "audit-trail-witness.jsonl";

export const WITNESS_RELATIONS = Object.freeze(["EQUAL", "TRAIL_EXTENDS_WITNESS", "WITNESS_ABSENT", "WITNESS_AHEAD", "DIVERGED", "WITNESS_UNLOCATABLE"]);
export const WITNESS_FINDINGS = Object.freeze(["TRAIL_BEHIND_WITNESS", "TRAIL_DIVERGES_FROM_WITNESS"]);

/** The boundary this adds, as data — printed by `verify` beside the store's own. */
export const WITNESS_BOUNDARY = Object.freeze({
  consistentTailTruncation: "DETECTED_VIA_WITNESS when a witness exists: an append is refused and verify reports TRAIL_BEHIND_WITNESS",
  location: "a file inside the repository's git directory — never touched by checkout, restore, reset, stash, clean or switch",
  declaredLimit: "NOT DETECTED: a truncation that also truncates or deletes the witness; any loss where no witness exists (a fresh clone before its first append, CI); a trail that was already short when the witness was first seeded (trust on first use)",
  notClaimed: "the witness is a second copy under the same user's control, not an independent or remote notary",
});

export class AuditWitnessRefused extends Error {
  constructor(status) {
    super(`AUDIT_WITNESS_REFUSED: ${status.relation} — trail ${status.trail} line(s), witness ${status.witness} line(s), agreeing prefix ${status.common}; nothing is appended onto a trail the witness contradicts`);
    this.code = "AUDIT_WITNESS_REFUSED";
    this.status = status;
  }
}

/** Lines of a JSONL text, CRLF-normalised, the empty tail after a final newline dropped. */
export const linesOf = (text) => {
  const t = String(text).replace(/\r\n/g, "\n");
  const l = t.split("\n");
  if (l[l.length - 1] === "") l.pop();
  return l;
};

/** How the trail stands against the witness. Pure — reads nothing, writes nothing. */
export function relate(trailLines, witnessLines) {
  const trail = trailLines.length;
  if (witnessLines === null) return { relation: "WITNESS_ABSENT", trail, witness: 0, common: 0 };
  const witness = witnessLines.length;
  let common = 0;
  while (common < trail && common < witness && trailLines[common] === witnessLines[common]) common++;
  const relation =
    common < Math.min(trail, witness) ? "DIVERGED"
      : trail === witness ? "EQUAL"
        : trail > witness ? "TRAIL_EXTENDS_WITNESS"
          : "WITNESS_AHEAD";
  return { relation, trail, witness, common };
}

function appendDurably(path, text) {
  const fd = openSync(path, "a");
  try {
    writeSync(fd, text, null, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * The witness over one file. `locate` is called lazily — a reader that never appends never needs a git directory.
 * @param {object} o
 * @param {() => string} o.locate  returns the witness file's path, or throws when none can be located.
 */
export function createWitness({ locate }) {
  const path = () => locate();
  const read = (p) => (existsSync(p) ? linesOf(readFileSync(p, "utf8")) : null);

  /** Read-only status, for verify. An unlocatable witness is reported, never a finding. */
  function status(trailLines) {
    let p;
    try { p = path(); } catch { return { relation: "WITNESS_UNLOCATABLE", trail: trailLines.length, witness: 0, common: 0 }; }
    return relate(trailLines, read(p));
  }

  /** Before a production append: refuse on loss or divergence; otherwise bring the witness level with the trail. */
  function beforeAppend(trailLines) {
    let p;
    try { p = path(); } catch (e) {
      throw new AuditWitnessRefused({ relation: "WITNESS_UNLOCATABLE", trail: trailLines.length, witness: 0, common: 0, why: String(e?.message ?? e) });
    }
    const s = relate(trailLines, read(p));
    if (s.relation === "WITNESS_AHEAD" || s.relation === "DIVERGED") throw new AuditWitnessRefused(s);
    if (s.relation === "WITNESS_ABSENT" || s.relation === "TRAIL_EXTENDS_WITNESS") {
      const missing = trailLines.slice(s.witness);
      appendDurably(p, missing.length ? missing.join("\n") + "\n" : "");
    }
    return s;
  }

  /** After the trail append: the same line, durably. */
  function afterAppend(line) {
    appendDurably(path(), line);
  }

  return { path, status, beforeAppend, afterAppend };
}

/** The production locator: the witness lives in THIS working tree's git directory (a worktree has its own). */
export const gitDirWitnessLocator = (repo) => () => {
  const gitDir = execFileSync("git", ["-C", repo, "rev-parse", "--absolute-git-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (!gitDir) throw new Error("WITNESS_UNLOCATABLE: no git directory");
  return join(gitDir, WITNESS_FILE);
};
