/**
 * F23 · THE DECLARED DATA OF THE LINK AUDIT (F23 Acceptance Amendment 1, _handoffs 24df018; RR-263).
 *
 * DATA, not code, and it names no product, client or host.
 *   GENERIC_LINK_NAMES  the generic link names per language (C6). They are EXACTLY the examples the authority page itself gives as too
 *                       generic — nothing is added by guess. A language with no entry here has no declared names: the generic limb is
 *                       then NOT MEASURED for that language, by name. A link is matched on its WHOLE name, trimmed, without regard to case.
 *   LINK_NAME_AUTHORITY where those names and the three limbs of a weak link come from: beta-g's technical decisions (not owner policy),
 *                       each limb traced to the authority page as read in raw bytes; the bytes are kept in the private records only.
 *   LINK_CHECK          the bounds of the link-status check the owner allowed (C8). Every one is a ceiling enforced where it is spent.
 *   CHALLENGE_HEADERS   response headers by which a host says it challenged the request rather than answered it.
 */
export const GENERIC_LINK_NAMES = Object.freeze({
  en: Object.freeze(["click here", "read more", "website", "article"]),
});

export const LINK_NAME_AUTHORITY = Object.freeze({
  decision: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_BETA_G_DECISION_2026-10-14_RR-263_EXCESSIVE_AND_WEAK_LINKS.md", by: "BETA_G", kind: "TECHNICAL DECISION — not owner policy" }),
  page: Object.freeze({ title: "Link best practices", readOn: "2026-10-14", bytesSha256: "6132efe9c36b47c07c9001194ff4346f55f3a7f3cc4761ddbe94a51b9a1dc86b", keptIn: "the private records only" }),
});

/** C6 · the three limbs of a weakly contextual link. */
export const WEAK = Object.freeze({ EMPTY_NAME: "EMPTY NAME", IMAGE_NO_ALT: "IMAGE LINK WITH NO ALT TEXT", GENERIC_NAME: "GENERIC NAME" });

/** C8 · the bounds of one run of the link-status check. */
export const LINK_CHECK = Object.freeze({ maxRequests: 100, sameHostIntervalMs: 2000, maxHops: 5, timeoutMs: 15000, method: "GET" });

/** C2, C8 · why a destination is NOT MEASURED. A refused request is never BROKEN. "ROBOTS FILE COULD NOT BE READ" is the robots file
 * UNAVAILABLE in RFC 9309's sense (a 5xx, a timeout, an unreachable host, or a redirect this check does not follow): the host is treated
 * as disallowing every address. */
export const ACCESS_REFUSED_STATUSES = Object.freeze([401, 403, 407]);
export const NOT_MEASURED_REASON = Object.freeze({
  NEVER_CHECKED: "NO RECORDED OBSERVATION",
  ROBOTS_DISALLOWED: "DISALLOWED BY ROBOTS",
  ROBOTS_UNKNOWN: "ROBOTS FILE COULD NOT BE READ",
  RATE_LIMITED: "RATE LIMITED",
  CHALLENGED: "CHALLENGED",
  /* RR-263 (beta-g, 14 Oct 2026): a 401, 403 or 407 answer refuses access — the destination is not shown to be broken */
  ACCESS_REFUSED: "ACCESS REFUSED",
  TIMEOUT: "TIMED OUT",
  NETWORK_ERROR: "NO ANSWER",
  REQUEST_LIMIT: "REQUEST LIMIT REACHED",
  TOO_MANY_HOPS: "REDIRECT CHAIN LONGER THAN THE DECLARED MAXIMUM",
  REDIRECT_LOOP: "REDIRECT LOOP",
  NO_LOCATION: "REDIRECT WITH NO DESTINATION",
  NO_STATUS: "NO USABLE RECORDED STATUS",
  NOT_HTTP: "NOT A WEB ADDRESS",
});

export const CHALLENGE_HEADERS = Object.freeze(["cf-mitigated", "x-amzn-waf-action", "x-datadome", "x-sucuri-block"]);
