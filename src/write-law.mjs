/**
 * THE WRITE LAW. First file in the first PR, on the owner's ruling — not a
 * hardening task for later.
 *
 *   Every write path DEFAULTS TO --dry-run.
 *   A real write requires BOTH --confirm AND ALLOW_PROD_WRITE=1.
 *
 * BOTH, NOT EITHER. One flag is a typo away from a write. Two of different kinds
 * — an argument and an environment variable — are not reached by accident.
 *
 * ── WHY IT IS HERE ON DAY ONE ───────────────────────────────────────────────
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
 * retention job. Read-only needs no flag. The moment it CAN write, it needs both.
 */

export const CONFIRM_FLAG = "--confirm";
export const DRY_RUN_FLAG = "--dry-run";
export const ALLOW_ENV = "ALLOW_PROD_WRITE";

/**
 * Decide whether a write is permitted. Pure — it reads nothing itself, so the
 * decision can be tested without a process, and its red can be forced.
 *
 * @param {{ argv?: readonly string[], env?: Record<string, string | undefined> }} input
 * @returns {{ mayWrite: boolean, mode: "DRY-RUN" | "WRITE", reason: string }}
 */
export function writePermission({ argv = [], env = {} } = {}) {
  const confirmed = argv.includes(CONFIRM_FLAG);
  const allowed = env[ALLOW_ENV] === "1";

  if (confirmed && allowed) {
    return { mayWrite: true, mode: "WRITE", reason: `${CONFIRM_FLAG} and ${ALLOW_ENV}=1 are both present` };
  }
  if (confirmed && !allowed) {
    return {
      mayWrite: false,
      mode: "DRY-RUN",
      reason: `${CONFIRM_FLAG} was given but ${ALLOW_ENV}=1 was NOT set — both are required, and this is the half that is missing`,
    };
  }
  if (!confirmed && allowed) {
    return {
      mayWrite: false,
      mode: "DRY-RUN",
      reason: `${ALLOW_ENV}=1 is set but ${CONFIRM_FLAG} was NOT given — both are required, and this is the half that is missing`,
    };
  }
  return { mayWrite: false, mode: "DRY-RUN", reason: "neither flag given — dry-run is the default, always" };
}

/**
 * Call this at the top of anything that can write. It never throws on the safe
 * path; it returns the permission so the caller prints it and behaves.
 *
 * The message is deliberately loud on the WRITE path. A run that is about to
 * change something should not look like a run that is about to report something.
 */
export function announceWritePermission(permission, log = console.log) {
  if (permission.mayWrite) {
    log(`\n*** WRITE MODE *** — ${permission.reason}. This run CHANGES things.\n`);
  } else {
    log(`[dry-run] no writes will happen — ${permission.reason}`);
  }
  return permission;
}
