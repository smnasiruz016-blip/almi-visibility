/**
 * THE A-RECORD CHECK — what does DNS PUBLISH for each estate host?
 *
 * ── 🔴 THE TWO LESSONS THIS ALREADY COST US ─────────────────────────────────
 *
 * Both were paid for on 12 September 2026, and both are `LAW-ABSENT-1`:
 *
 *   1. `dns.lookup` / `getaddrinfo` answers **"what can THIS MACHINE use"**, not
 *      "what does DNS say". On a host with no IPv6 it filters AAAA out, so a
 *      record that demonstrably exists reads as absent. Use a RESOLVER query.
 *   2. Returning `false` on any resolver error turned `ECONNREFUSED` into
 *      "this host publishes nothing" — the instrument failed and the subject
 *      got the blame. **Only `ENOTFOUND` / `ENODATA` may mean "does not
 *      publish".** Everything else is UNKNOWN, and the reason names the
 *      resolver.
 *
 * ── AND WHAT THIS CHECK DELIBERATELY DOES NOT CONCLUDE ──────────────────────
 *
 * 🔴 It says nothing about whether Google can reach the host. An AAAA-only host
 * may be perfectly reachable by a crawler with IPv6. "Much of the internet
 * still reaches hosts over IPv4" is a reason to RAISE the question, not an
 * answer to it. Whether Googlebot reaches it is a separate measurement that
 * this check does not take and must not imply.
 */

import { Resolver } from "node:dns/promises";

export const FAMILY_STATES = Object.freeze(["A_AND_AAAA", "A_ONLY", "AAAA_ONLY", "NEITHER", "UNKNOWN"]);

/**
 * Public resolvers, used explicitly and RECORDED.
 *
 * 🔴 The resolver is part of the measurement's provenance. This machine's
 * default Node resolver is `127.0.0.1`, which refuses connections — a fact
 * about the laptop that would otherwise be written down as a fact about every
 * host in the estate.
 */
export const DEFAULT_RESOLVERS = Object.freeze(["8.8.8.8", "1.1.1.1"]);

/** Only these two codes are DNS answering "there is no such record". */
const MEANS_ABSENT = new Set(["ENOTFOUND", "ENODATA"]);

export async function familiesFor(hostname, { servers = DEFAULT_RESOLVERS, timeoutMs = 5000 } = {}) {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 2 });
  resolver.setServers([...servers]);

  const probe = async (fn) => {
    try {
      const recs = await fn.call(resolver, hostname);
      return { value: recs.length > 0, error: null };
    } catch (err) {
      const code = err?.code ?? String(err);
      if (MEANS_ABSENT.has(code)) return { value: false, error: null };
      // 🔴 The tool failed. Not a finding about the host.
      return { value: null, error: code };
    }
  };

  const a = await probe(resolver.resolve4);
  const aaaa = await probe(resolver.resolve6);

  const state =
    a.value === null || aaaa.value === null
      ? "UNKNOWN"
      : a.value && aaaa.value
        ? "A_AND_AAAA"
        : a.value
          ? "A_ONLY"
          : aaaa.value
            ? "AAAA_ONLY"
            : "NEITHER";

  return Object.freeze({
    hostname,
    hasA: a.value,
    hasAAAA: aaaa.value,
    state,
    // Provenance: which resolver said so, and when.
    resolvers: [...servers],
    method: "dns.Resolver.resolve4/resolve6",
    error: a.error ?? aaaa.error ?? null,
    measuredAt: new Date().toISOString(),
  });
}

/**
 * Should this host be raised as a finding?
 *
 * AAAA_ONLY → yes. UNKNOWN → yes, but as an UNKNOWN naming the resolver.
 * Everything else → no finding.
 */
export function assessFamilies(f) {
  if (f.state === "UNKNOWN") {
    return {
      raise: true,
      verdict: "UNKNOWN",
      reasonCode: "TOOL_FAILED",
      summary:
        `DNS for ${f.hostname} could not be read via ${f.resolvers.join(", ")} (${f.error}). ` +
        "This is a fact about our resolver, not about the host.",
    };
  }
  if (f.state === "AAAA_ONLY") {
    return {
      raise: true,
      verdict: "FAIL",
      severity: "medium",
      summary:
        `${f.hostname} publishes an AAAA record and NO A record. Clients and crawlers reaching it over ` +
        "IPv4 cannot resolve an address for it. This check does NOT establish whether Googlebot reaches " +
        "the host — that is a separate measurement.",
    };
  }
  return { raise: false, verdict: null };
}
