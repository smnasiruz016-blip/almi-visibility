/**
 * 🔴 `U-CRW-IPv6` — DOES THE RUNNER HAVE IPv6 EGRESS? MEASURED, NEVER ASSUMED.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * `almipathway.almiworld.com` has an **AAAA record and no A record**. If the
 * machine doing the crawling has no IPv6 egress, that host is not reachable at
 * all — and that is a THIRD state, distinct from both of the ones we already
 * have:
 *
 *   FORBIDDEN            we lack a grant. Says nothing about the site.
 *   ZERO                 we reached it and there was no data.
 *   UNREACHABLE_NO_IPV6  we could not reach it, and the reason is OUR network,
 *                        not their server and not their robots.txt.
 *
 * Recording it as ZERO would be a measurement nobody took. Recording it as
 * FORBIDDEN would blame their permissions for our plumbing. Both are wrong in
 * ways that would survive review, because both look like ordinary rows.
 *
 * ── WHAT THIS MEASURES, AND WHAT IT DOES NOT ────────────────────────────────
 *
 * It measures whether THIS machine can open a connection to a known
 * IPv6-reachable host. It does NOT prove the whole internet is reachable over
 * IPv6, and it does not prove the target host is up. A false negative here is
 * safe: it produces UNREACHABLE, which is honest. A false positive would be
 * worse, so the probe requires an actual successful connection.
 */

import { resolve4, resolve6 } from "node:dns/promises";
import { connect } from "node:net";

export const IPV6_STATES = Object.freeze(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]);

/**
 * A host that is reliably IPv6-reachable and is not ours.
 *
 * 🔴 Deliberately a third party's well-known resolver rather than an AlmiWorld
 * host: probing our own estate would confuse "the runner has IPv6" with "that
 * particular product is up", and a failure would be unattributable.
 */
const PROBE_HOST = "2606:4700:4700::1111"; // Cloudflare DNS, IPv6
const PROBE_PORT = 443;

/** Can this machine open an IPv6 TCP connection at all? */
export async function measureIpv6Egress({ timeoutMs = 5000, probeHost = PROBE_HOST, probePort = PROBE_PORT } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    const done = (state, detail) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve({ state, detail, probeHost, probePort, elapsedMs: Date.now() - startedAt, measuredAt: new Date().toISOString() });
    };

    let socket;
    try {
      socket = connect({ host: probeHost, port: probePort, family: 6 });
    } catch (err) {
      return resolve({
        state: "UNAVAILABLE",
        detail: `could not create an IPv6 socket: ${err?.message ?? err}`,
        probeHost, probePort, elapsedMs: Date.now() - startedAt, measuredAt: new Date().toISOString(),
      });
    }

    const timer = setTimeout(() => done("UNAVAILABLE", `no IPv6 connection within ${timeoutMs}ms`), timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      done("AVAILABLE", "IPv6 TCP connection established");
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      done("UNAVAILABLE", `IPv6 connect failed: ${err?.code ?? err?.message ?? err}`);
    });
  });
}

/**
 * Which DNS families does a hostname PUBLISH?
 *
 * 🔴 `dns.resolve4` / `dns.resolve6`, NEVER `dns.lookup`.
 *
 * A first version of this used `dns.lookup(host, { family: 6 })` and reported
 * `hasAAAA: false` for a host whose AAAA record demonstrably exists — confirmed
 * against both the local resolver and 8.8.8.8. The reason: **`lookup` goes
 * through the OS resolver (`getaddrinfo`), which filters AAAA results on a
 * machine with no IPv6 connectivity.** It answers "what can this machine use",
 * not "what does DNS say".
 *
 * Those are exactly the two things this module must keep apart. Conflating them
 * would have made the third state unmeasurable: a host would look like it
 * published no AAAA precisely BECAUSE we had no IPv6, and the finding would
 * have vanished into "resolves to nothing".
 *
 * `resolve4`/`resolve6` query DNS directly and report the records.
 */
export async function addressFamilies(hostname) {
  /**
   * 🔴 `null` MEANS "COULD NOT DETERMINE", AND IT IS NOT `false`.
   *
   * The first version returned `false` on ANY error. On this machine Node's
   * resolver is configured to `127.0.0.1`, which refuses connections — so every
   * host came back `hasA: false, hasAAAA: false`, i.e. "publishes nothing".
   *
   * **A resolver failure had been rendered as a finding about the host.** That
   * is the same collapse as a FORBIDDEN reported as a zero, and it would have
   * been invisible: "resolves to nothing" is a plausible-looking row.
   *
   * Only `ENOTFOUND` / `ENODATA` — DNS actually answering "there is no such
   * record" — may produce `false`.
   */
  const probe = async (fn) => {
    try {
      return (await fn(hostname)).length > 0;
    } catch (err) {
      if (err?.code === "ENOTFOUND" || err?.code === "ENODATA") return false;
      return { unknown: err?.code ?? String(err) };
    }
  };

  const a = await probe(resolve4);
  const aaaa = await probe(resolve6);
  const errs = [a, aaaa].filter((v) => typeof v === "object").map((v) => v.unknown);

  return {
    hostname,
    hasA: typeof a === "boolean" ? a : null,
    hasAAAA: typeof aaaa === "boolean" ? aaaa : null,
    error: errs.length ? errs[0] : null,
    method: "dns.resolve4/resolve6",
  };
}

/**
 * Decide a host's reachability state from the two measurements.
 *
 * 🔴 Returns `null` when the host is ordinarily reachable — the caller then
 * uses its normal states. This function only ever ADDS the third state; it
 * never overrides a FORBIDDEN or a measured ZERO.
 */
export function reachabilityState({ families, egress }) {
  /* 🔴 A NULL IS NOT A NO. If DNS could not be read, we cannot say whether this
   * host is AAAA-only, so we may not conclude anything about reachability —
   * and we must not quietly fall through to "ordinary" either. */
  if (families.hasA === null || families.hasAAAA === null) {
    return {
      state: "UNKNOWN",
      because:
        `DNS for ${families.hostname} could not be read (${families.error ?? "no reason recorded"}), so whether it ` +
        "publishes only AAAA is UNKNOWN. This is a fact about our resolver, not about the host.",
    };
  }
  if (families.hasA) return null; // IPv4-reachable: nothing special to say
  if (!families.hasAAAA) return null; // resolves to nothing at all; not an IPv6 question
  if (egress.state === "AVAILABLE") return null; // AAAA-only, and we do have IPv6
  return {
    state: "UNREACHABLE_NO_IPV6",
    because:
      `${families.hostname} publishes AAAA and no A record, and this runner's IPv6 egress measured ` +
      `${egress.state} (${egress.detail}). The host was not reached, and the reason is our network — ` +
      "not their permissions and not an absence of data.",
  };
}
