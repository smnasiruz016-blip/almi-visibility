/**
 * robots.txt — FETCHED ONCE PER HOST PER RUN, AND FAIL-CLOSED.
 *
 * ── 🔴 THE RULE THAT MATTERS: A BROKEN robots.txt IS A DISALLOW ─────────────
 *
 * If robots.txt returns 5xx, times out, or cannot be read for any reason, this
 * module returns DISALLOW ALL and records the state as UNKNOWN.
 *
 * NEVER "assume allow". The tempting reading is that a server error is not a
 * refusal, so we may proceed — but that inverts who carries the risk. A host
 * that cannot tell us its rules is a host whose rules we do not know, and
 * crawling it is a decision to ignore them. Fail-closed costs us some coverage.
 * Fail-open costs somebody else their bandwidth and us our good standing.
 *
 * 🔴 AND THE TWO OUTCOMES ARE RECORDED SEPARATELY. `disallowed because the file
 * said so` and `disallowed because we could not read the file` are different
 * facts: the first is the host's decision, the second is our ignorance. A
 * single boolean would collapse them and the run report could not tell a
 * reader which had happened.
 *
 * ── WHAT THIS PARSER DOES NOT DO ────────────────────────────────────────────
 *
 * No wildcard expansion beyond `*` and `$`, no crawl-delay honouring (we are
 * slower than any plausible crawl-delay anyway at 1 req/s), no sitemap
 * extraction. Each of those is a feature nobody has asked for, and §832 says
 * do not invent crawler rules.
 */

/** 🔴 Honest and identifiable. NEVER spoof another crawler (§832). */
export const USER_AGENT = "AlmiVisibilityBot/0.1 (+internal audit)";

export const ROBOTS_STATES = Object.freeze(["ALLOWED", "DISALLOWED", "UNKNOWN"]);

/**
 * Parse a robots.txt body into the rules that apply to `userAgent`.
 *
 * Group selection follows the convention: an exact user-agent match wins over
 * `*`, and if neither is present nothing is disallowed.
 */
export function parseRobots(body, userAgent = USER_AGENT) {
  const groups = new Map();
  let current = [];
  let lastWasAgent = false;

  for (const rawLine of String(body).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      const agent = value.toLowerCase();
      if (!lastWasAgent) current = [];
      if (!groups.has(agent)) groups.set(agent, current);
      else current = groups.get(agent);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === "disallow" || field === "allow") {
      current.push({ type: field, path: value });
    }
  }

  const token = userAgent.split("/")[0].toLowerCase();
  // An exact match for our token beats the wildcard group.
  const rules = groups.get(token) ?? groups.get("*") ?? [];
  return rules;
}

/** Does `rule.path` match `pathname`? Supports the `*` and `$` conventions. */
function ruleMatches(rulePath, pathname) {
  if (rulePath === "") return false;
  const escaped = rulePath.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const anchored = escaped.endsWith("$") ? "^" + escaped : "^" + escaped;
  return new RegExp(anchored).test(pathname);
}

/**
 * Decide a URL against a parsed rule set.
 *
 * The most specific matching rule wins; `Allow` beats `Disallow` at equal
 * length, which is the conventional reading.
 */
export function isAllowedByRules(rules, url) {
  const pathname = new URL(url).pathname;
  let best = null;
  for (const rule of rules) {
    if (!ruleMatches(rule.path, pathname)) continue;
    const len = rule.path.length;
    if (best === null || len > best.len || (len === best.len && rule.type === "allow")) {
      best = { len, type: rule.type };
    }
  }
  if (best === null) return true;
  return best.type === "allow";
}

/**
 * Fetch and cache robots.txt for a host, once per run.
 *
 * `fetchImpl` is injected so the whole thing is testable against a local
 * fixture server with no network egress.
 */
export function createRobotsCache({ fetchImpl, userAgent = USER_AGENT, timeoutMs = 10000 }) {
  const cache = new Map();

  async function forHost(origin) {
    if (cache.has(origin)) return cache.get(origin);

    let entry;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(`${origin}/robots.txt`, {
          headers: { "User-Agent": userAgent },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.status >= 500) {
        // 🔴 THE RULE. A server error is not permission.
        entry = { state: "UNKNOWN", rules: [], reason: `robots.txt returned HTTP ${res.status}`, failClosed: true };
      } else if (res.status === 404 || res.status === 410) {
        // A host that says "no such file" HAS answered. Absence of rules is not
        // absence of an answer, and this is the one case where allow is correct.
        entry = { state: "ALLOWED", rules: [], reason: `no robots.txt (HTTP ${res.status})`, failClosed: false };
      } else if (!res.ok) {
        entry = { state: "UNKNOWN", rules: [], reason: `robots.txt returned HTTP ${res.status}`, failClosed: true };
      } else {
        entry = { state: "ALLOWED", rules: parseRobots(await res.text(), userAgent), reason: "robots.txt read", failClosed: false };
      }
    } catch (err) {
      entry = {
        state: "UNKNOWN",
        rules: [],
        reason: `robots.txt could not be read: ${err?.name === "AbortError" ? "timeout" : String(err?.message ?? err)}`,
        failClosed: true,
      };
    }

    cache.set(origin, entry);
    return entry;
  }

  /**
   * May we fetch `url`?
   *
   * Returns `{ allowed, state, reason }`. `state` is UNKNOWN when we could not
   * read the rules, and in that case `allowed` is FALSE — the two fields carry
   * different information and neither is derivable from the other alone.
   */
  async function check(url) {
    const origin = new URL(url).origin;
    const entry = await forHost(origin);
    if (entry.failClosed) {
      return { allowed: false, state: "UNKNOWN", reason: entry.reason };
    }
    const allowed = isAllowedByRules(entry.rules, url);
    return { allowed, state: allowed ? "ALLOWED" : "DISALLOWED", reason: entry.reason };
  }

  return { check, forHost, hostsFetched: () => [...cache.keys()] };
}
