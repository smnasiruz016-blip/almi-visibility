/**
 * THE WRITE LAW. First file in the first PR, on the owner's ruling — not a
 * hardening task for later.
 *
 *   Every write path DEFAULTS TO --dry-run.
 *
 *   LOCAL write (a file on this machine)   →  --confirm
 *   PRODUCTION write (a database, a remote →  --confirm AND ALLOW_PROD_WRITE=1
 *   store, another product's data)
 *
 * ── 🔴 WHY THE TWO ARE NOT THE SAME, AND WHY THIS IS NOT A RELAXATION ───────
 *
 * The first version demanded both flags for everything, including writing a
 * report file into a local directory. Gate A's very first run writes such a file.
 * So the first thing anyone would ever have done with this tool is type
 * `ALLOW_PROD_WRITE=1` — for a CSV.
 *
 *     A SAFETY FLAG THAT IS NEEDED EVERY DAY STOPS BEING A SIGNAL AND BECOMES A
 *     KEYSTROKE. And on the day it is the one thing standing between somebody and
 *     production, IT IS ALREADY IN THEIR SHELL HISTORY.
 *
 * That is the same illness as a count that keeps being raised: the mechanism is
 * still there, still green, and it no longer means anything. So the strong flag
 * is spent only where it buys something — a write that leaves this machine.
 *
 * ⚠️ AND THE TIGHTENING IS NOT A LOOSENING. `--confirm` is still required for a
 * local write; dry-run is still the default for everything; `ALLOW_PROD_WRITE`
 * must still be exactly "1"; and NOTHING may quietly reclassify a production
 * write as local. The classification belongs to the CALLER and is named at the
 * call site, so it is visible in review rather than inferred.
 *
 * ── WHY ANY OF IT IS HERE ON DAY ONE ────────────────────────────────────────
 *
 * It is AlmiOET's law, and AlmiOET has it BECAUSE environment separation was
 * never achieved there. The same is true here today and it is measured, not
 * assumed: AlmiVisibility's Preview and Production point at the same Neon
 * project, the same endpoint and the same database (architecture report §2b).
 * Until that is split, THIS IS THE WHOLE OF THE PROTECTION.
 *
 * And it stays afterwards, because the two guards stop different mistakes: a
 * preview branch stops a DEPLOYMENT writing to production; a dry-run default
 * stops a PERSON writing when they meant to look.
 *
 * ⚠️ "Every write path" is not narrowed later: every migration runner, seeding
 * or backfill script, every crawler that persists a snapshot, every Search
 * Console ingestion, every fact-cache write, every ledger write, every purge or
 * retention job. Read-only needs no flag. The moment it CAN write, it needs at
 * least `--confirm`, and if it can reach production it needs both.
 */

import { resolve, relative, isAbsolute, sep } from "node:path";

import { namedActor, namedApproval } from "./governance/authorisation.mjs";

export const CONFIRM_FLAG = "--confirm";

/** This repository's root, resolved from this file's own location — never from the caller's cwd. */
export const REPO_ROOT = resolve(new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

/**
 * 🔴 CONFINE A WRITE DESTINATION TO THIS REPOSITORY — OR THROW BEFORE ANY BYTE.
 *
 * Ruling, 12 September 2026, beta-g as technical owner:
 *
 *   "My own boundary says 'writes only inside this repository.' If --out can
 *    point anywhere, that condition is not being MET — it is merely not being
 *    EXERCISED. AN UNEXERCISED CONSTRAINT IS NOT A CONSTRAINT."
 *
 * Every page writer takes at least one destination from an operator flag. This
 * resolves it (against the cwd, exactly as the write would) and refuses any
 * path whose relation to the repository root climbs out of it — including a
 * different drive letter, which `path.relative` returns as an absolute path.
 *
 * Called where the destination is PARSED, at the top of the runner, so the
 * refusal happens before a directory is created or a request is issued.
 *
 * ⚠️ Lexical, not physical: a symlink or junction INSIDE the repository that
 * points elsewhere is not followed. Stated, not solved.
 *
 * @returns {string|null} the absolute path, or null when no path was given
 */
export function confineToRepo(path, { label = "output path", repo = REPO_ROOT, cwd = process.cwd() } = {}) {
  if (path === null || path === undefined) return null;
  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError(`${label}: an empty destination is not a destination`);
  }
  const abs = resolve(cwd, path);
  const rel = relative(repo, abs);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(
      `REFUSED — ${label} ${JSON.stringify(path)} resolves to ${abs}, which is OUTSIDE this repository (${repo}). ` +
        "Nothing was written. Every local page writer writes only inside this repository.",
    );
  }
  return abs;
}
export const DRY_RUN_FLAG = "--dry-run";
export const ALLOW_ENV = "ALLOW_PROD_WRITE";

/** What a write can reach. Named at the call site, never inferred. */
export const LOCAL = "local";
export const PRODUCTION = "production";

/**
 * Decide whether a write is permitted. Pure — it reads nothing itself, so the
 * decision can be tested without a process, and its red can be forced.
 *
 * @param {{ target?: "local" | "production", argv?: readonly string[],
 *           env?: Record<string, string | undefined> }} input
 * @returns {{ mayWrite: boolean, mode: "DRY-RUN" | "WRITE", target: string, reason: string, actorRef: string|null, approvalRef: string|null }}
 *
 * 🔴 F04 (25 September 2026): THIS IS INTENT, NOT AUTHORITY. `mayWrite` says the operator ASKED for a write (--confirm,
 * and ALLOW_PROD_WRITE=1 for production); it grants nothing by itself (F04 clarification 16). The shared boundary
 * (src/governance/governed-write.mjs) writes only when src/governance/authorisation.mjs AUTHORISES the named actor
 * (`--actor=`) for the action, its scope and resource — with the named approval (`--approval=`) where one is required.
 * The two references are carried here as named, never inferred.
 */
export function writePermission({ target = PRODUCTION, argv = [], env = {} } = {}) {
  const intent = writeIntent({ target, argv, env });
  return { ...intent, actorRef: namedActor(argv), approvalRef: namedApproval(argv) };
}

function writeIntent({ target = PRODUCTION, argv = [], env = {} } = {}) {
  const confirmed = argv.includes(CONFIRM_FLAG);
  const allowed = env[ALLOW_ENV] === "1";

  if (target !== LOCAL && target !== PRODUCTION) {
    // An unknown class is treated as the strictest one. A typo must never widen
    // permission.
    return { mayWrite: false, mode: "DRY-RUN", target, reason: `unknown write target ${JSON.stringify(target)} — refused` };
  }

  if (!confirmed) {
    return {
      mayWrite: false,
      mode: "DRY-RUN",
      target,
      reason: allowed
        ? `${ALLOW_ENV}=1 is set but ${CONFIRM_FLAG} was NOT given — ${CONFIRM_FLAG} is required for every write`
        : "no --confirm — dry-run is the default, always",
    };
  }

  if (target === LOCAL) {
    return { mayWrite: true, mode: "WRITE", target, reason: `${CONFIRM_FLAG} given, and this write stays on this machine` };
  }

  if (!allowed) {
    return {
      mayWrite: false,
      mode: "DRY-RUN",
      target,
      reason: `${CONFIRM_FLAG} was given but ${ALLOW_ENV}=1 was NOT set — a PRODUCTION write needs both, and this is the half that is missing`,
    };
  }
  return { mayWrite: true, mode: "WRITE", target, reason: `${CONFIRM_FLAG} and ${ALLOW_ENV}=1 are both present` };
}

/**
 * Call this at the top of anything that can write. It never throws on the safe
 * path; it returns the permission so the caller prints it and behaves.
 *
 * The message is deliberately loud on a PRODUCTION write. A run about to change
 * something outside this machine should not look like a run about to write a CSV.
 */
export function announceWritePermission(permission, log = console.log) {
  if (permission.mayWrite && permission.target === PRODUCTION) {
    log(`\n*** PRODUCTION WRITE *** — ${permission.reason}. This run changes things OUTSIDE this machine.\n`);
  } else if (permission.mayWrite) {
    log(`[write:local] ${permission.reason}`);
  } else {
    log(`[dry-run] no writes will happen — ${permission.reason}`);
  }
  return permission;
}
