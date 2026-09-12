/**
 * ITEM 45 — THE COST GOVERNOR'S HARD STOP.
 *
 * ── 🔴 A GOVERNOR THAT HAS NEVER STOPPED ANYTHING IS A GOVERNOR IN NAME ONLY ─
 *
 * The pagination law already bounds ONE pull at `maxRequests`. It does not bound
 * a RUN: eight pulls at twenty requests each is 160 calls, and a loop that kept
 * issuing pulls would never meet a per-pull cap at all. This bounds the run.
 *
 * ── THE THREE RULES ─────────────────────────────────────────────────────────
 *
 *   1. CHARGE BEFORE THE CALL. The call that would exceed the cap is never
 *      issued — counted at the boundary, not reconciled afterwards.
 *   2. THE STOP LATCHES. Once stopped, every later charge throws the same stop.
 *      A governor that trips and then lets the next call through has not
 *      stopped a runaway, it has slowed it.
 *   3. THE STOP PROPAGATES. It carries `hardStop: true`, and the pagination
 *      loop rethrows it rather than recording it as an API_ERROR — otherwise
 *      a stop inside one pull becomes a quiet UNKNOWN and the run carries on.
 *
 * Founder time is bounded too: a wall-clock budget, read from an injectable
 * clock so the stop can be proved without waiting for it.
 */

export const DEFAULT_MAX_API_CALLS_PER_RUN = 200;
export const DEFAULT_MAX_WALL_CLOCK_MS = 10 * 60 * 1000;

export class CostCapExceeded extends Error {
  constructor(message, snapshot) {
    super(message);
    this.name = "CostCapExceeded";
    this.hardStop = true;
    this.snapshot = snapshot;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.label           what is being governed, printed with every stop
 * @param {number} opts.maxApiCalls     calls permitted in the run
 * @param {number} opts.maxWallClockMs  wall-clock permitted for the run
 * @param {() => number} [opts.now]     injectable clock (ms)
 */
export function createCostGovernor({
  label,
  maxApiCalls = DEFAULT_MAX_API_CALLS_PER_RUN,
  maxWallClockMs = DEFAULT_MAX_WALL_CLOCK_MS,
  now = () => Date.now(),
} = {}) {
  if (typeof label !== "string" || label === "") throw new TypeError("governor: a label is required — a stop must say what it stopped");
  for (const [k, v] of Object.entries({ maxApiCalls, maxWallClockMs })) {
    if (!Number.isInteger(v) || v < 1) throw new TypeError(`governor: ${k} must be a positive integer`);
  }
  const startedAt = now();
  let apiCalls = 0;
  let refused = 0;
  let stopped = null;

  const snapshot = () => ({
    label,
    apiCalls,
    refused,
    elapsedMs: now() - startedAt,
    maxApiCalls,
    maxWallClockMs,
    stopped: stopped ? stopped.message : null,
  });

  function charge(n = 1) {
    if (!Number.isInteger(n) || n < 1) throw new TypeError("governor.charge: a positive integer number of calls is required");
    if (stopped) {
      refused += 1;
      throw stopped;
    }
    const elapsedMs = now() - startedAt;
    if (apiCalls + n > maxApiCalls) {
      refused += 1;
      stopped = new CostCapExceeded(
        `HARD STOP — ${label}: ${apiCalls} calls issued, the next would exceed maxApiCalls=${maxApiCalls}. Nothing further is issued in this run.`,
        null,
      );
    } else if (elapsedMs > maxWallClockMs) {
      refused += 1;
      stopped = new CostCapExceeded(
        `HARD STOP — ${label}: ${elapsedMs} ms elapsed, beyond maxWallClockMs=${maxWallClockMs}. Nothing further is issued in this run.`,
        null,
      );
    }
    if (stopped) {
      stopped.snapshot = snapshot();
      throw stopped;
    }
    apiCalls += n;
    return apiCalls;
  }

  return Object.freeze({ charge, snapshot });
}
