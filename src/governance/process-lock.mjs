/**
 * 🔴 F77 M2 · CROSS-PROCESS EXCLUSION (RR-81; acceptance _handoffs 7042c77 R1 · R3; limb map 84f26b9).
 *
 * Measured before this module existed, on confined scratch stores: the SAME governed write from N processes at one instant —
 * 2 processes → 2 × COMMITTED and a corrupted audit chain (DUPLICATE_EVENT_ID, LINK_BROKEN); 8 → a failed rename and a head
 * count mismatch; 16 → EVENT_ID_CONFLICT thrown. Every append was "read the whole store, check, append" with nothing stopping a
 * second process between the read and the append.
 *
 * One exclusive lock file per protected resource, created with O_EXCL ("wx"): exactly one process holds it. A waiter polls
 * until the holder releases it, BOUNDED — LAW-BOUND-1: the bound is stated here and in every timeout message — and then FAILS
 * CLOSED (LOCK_TIMEOUT); it never proceeds unlocked. A lock whose holder process no longer exists is STALE and is cleared, only
 * if its content is still the stale holder's. The holder releases only a lock that still carries its own token.
 *
 * Synchronous on purpose: every governed write is synchronous, and a lock held across an await would be held by nobody.
 */
import { openSync, writeSync, closeSync, readFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** LAW-BOUND-1: the longest a writer waits for a lock before it refuses. */
export const LOCK_BOUND_MS = 30000;
export const LOCK_POLL_MS = 20;

export class LockTimeout extends Error {
  constructor(message) {
    super(message);
    this.name = "LockTimeout";
    this.code = "LOCK_TIMEOUT";
  }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/* process.kill(pid, 0) sends NO signal: it only asks whether the process exists. EPERM means it exists and is not ours. */
const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e?.code === "EPERM"; }
};
const readOrNull = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };

/**
 * Run `fn` while holding the exclusive lock at `lockPath`. Returns what `fn` returns; rethrows what it throws; always releases.
 */
export function withExclusiveLock(lockPath, fn, { boundMs = LOCK_BOUND_MS, pollMs = LOCK_POLL_MS } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const start = Date.now();
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      try { writeSync(fd, token); } finally { closeSync(fd); }
      break;
    } catch (e) {
      if (e?.code !== "EEXIST" && e?.code !== "EPERM" && e?.code !== "EBUSY") throw e;
      const held = readOrNull(lockPath);
      const pid = Number(String(held ?? "").split(":")[0]);
      if (held && Number.isInteger(pid) && pid > 0 && pid !== process.pid && !alive(pid)) {
        if (readOrNull(lockPath) === held) { try { unlinkSync(lockPath); } catch { /* another waiter cleared it first */ } }
        continue;
      }
      if (Date.now() - start > boundMs) throw new LockTimeout(`LOCK_TIMEOUT: the lock was not released within the bound of ${boundMs} ms; nothing was written`);
      sleep(pollMs);
    }
  }
  try {
    return fn();
  } finally {
    if (readOrNull(lockPath) === token) { try { unlinkSync(lockPath); } catch { /* already gone */ } }
  }
}
