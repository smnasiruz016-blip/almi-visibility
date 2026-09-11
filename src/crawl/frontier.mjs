/**
 * 🔴 THE HARD CAP — `D-CRW-2`. THE ONE THAT CARRIES REAL MONEY.
 *
 * ── WHY THIS NUMBER IS IN THE SOURCE AND NOT IN A CONFIG FILE ───────────────
 *
 * One connected product serves 240,328 pages DYNAMICALLY, with caching off.
 * Every request to one of them runs a function. A crawler WE operate reading
 * those pages is BILLABLE TRAFFIC ON OUR OWN ACCOUNT.
 *
 * It is the SEV-0 failure seen from the other side: last time we generated the
 * pages, this time we would pay to read them. Nothing in the system connected
 * those two facts. This file is that connection.
 *
 * So `MAX_URLS_PER_RUN` is a MODULE-LEVEL CONSTANT:
 *
 *   - NOT an environment variable — a misconfigured job could raise it silently.
 *   - NOT a config file — a file can be edited by anything with write access.
 *   - NOT a CLI argument — an agent granted one permission too many could pass it.
 *
 * Raising it requires editing this line, in a pull request, that a human reads.
 * THAT IS THE POINT. The safest cost gate is the one with no switch.
 *
 * ── AND WHY THE QUEUE THROWS RATHER THAN DROPPING ───────────────────────────
 *
 * A queue that silently ignored pushes past capacity would produce a run that
 * looked complete and had quietly skipped the rest of the estate — the 11
 * September defect again. A throw is loud, and the caller must decide what to
 * do about it in code somebody reviews.
 */

/** 🔴 The hard cap. Raising this is a code change in a reviewed PR. */
export const MAX_URLS_PER_RUN = 500;

/**
 * Per-host ceiling, so one host cannot eat the whole run.
 *
 * Without it a sitemap with 240,328 entries would consume all 500 slots and the
 * inventory would describe one product while claiming to describe the estate.
 */
export const MAX_REQUESTS_PER_HOST = 200;

export class FrontierCapExceeded extends Error {
  constructor(message) {
    super(message);
    this.name = "FrontierCapExceeded";
  }
}

/**
 * A BOUNDED queue of URLs to fetch.
 *
 * Capacity defaults to the module constant. It is a parameter ONLY so a test
 * can drive a small queue quickly — production callers pass nothing, and the
 * CLI has no flag that reaches it.
 */
export class BoundedFrontier {
  #queue = [];
  #seen = new Set();
  #perHost = new Map();
  #capacity;
  #maxPerHost;
  #rejected = 0;

  constructor({ capacity = MAX_URLS_PER_RUN, maxPerHost = MAX_REQUESTS_PER_HOST } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new TypeError("capacity must be a positive integer");
    if (capacity > MAX_URLS_PER_RUN) {
      // 🔴 A test may shrink the cap. Nothing may raise it above the constant,
      // or the constant would be advisory and the gate would have a switch.
      throw new FrontierCapExceeded(
        `capacity ${capacity} exceeds MAX_URLS_PER_RUN ${MAX_URLS_PER_RUN}. ` +
          "Raise the constant in a reviewed PR, or do not raise it.",
      );
    }
    this.#capacity = capacity;
    this.#maxPerHost = Math.min(maxPerHost, capacity);
  }

  get capacity() { return this.#capacity; }
  get maxPerHost() { return this.#maxPerHost; }
  get size() { return this.#queue.length; }
  get rejected() { return this.#rejected; }
  /** True once a push has been refused for want of capacity. Drives coverageState. */
  get capReached() { return this.#rejected > 0; }

  /**
   * Offer a URL. Returns true if it was accepted.
   *
   * 🔴 A refusal for CAPACITY is counted and reported, not thrown — the caller
   * is seeding thousands of URLs on purpose and the cap doing its job is the
   * expected path. `push()` throws; `offer()` reports. A duplicate is not a
   * refusal and is not counted as one.
   */
  offer(url) {
    const canonical = String(url);
    if (this.#seen.has(canonical)) return false;

    let host;
    try {
      host = new URL(canonical).hostname.toLowerCase();
    } catch {
      return false;
    }

    if (this.#queue.length >= this.#capacity) {
      this.#rejected += 1;
      return false;
    }
    const used = this.#perHost.get(host) ?? 0;
    if (used >= this.#maxPerHost) {
      this.#rejected += 1;
      return false;
    }

    this.#seen.add(canonical);
    this.#perHost.set(host, used + 1);
    this.#queue.push(canonical);
    return true;
  }

  /** Strict push: THROWS past capacity. Used where a silent drop would be a defect. */
  push(url) {
    if (this.#queue.length >= this.#capacity) {
      throw new FrontierCapExceeded(
        `frontier is full at ${this.#capacity} URLs (MAX_URLS_PER_RUN=${MAX_URLS_PER_RUN})`,
      );
    }
    if (!this.offer(url)) {
      throw new FrontierCapExceeded(`URL refused by the frontier: ${url}`);
    }
    return true;
  }

  shift() { return this.#queue.shift(); }
  toArray() { return [...this.#queue]; }
  perHostCounts() { return Object.fromEntries(this.#perHost); }
}
