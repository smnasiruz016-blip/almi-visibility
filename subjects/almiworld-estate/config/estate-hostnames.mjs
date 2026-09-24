/**
 * THE ESTATE HOSTNAME CENSUS — measured 11 September 2026.
 *
 * ── 🔴 WHY THIS FILE HAS TO EXIST ───────────────────────────────────────────
 *
 * Search Console returns rows for hostnames that HAVE data. It cannot tell you
 * about a hostname with none — that host simply is not in the response.
 *
 * So without an independent census of what EXISTS, a hostname with zero
 * impressions and a hostname that was never in the query render identically: as
 * nothing at all. On 11 September 2026 that is exactly what happened, and six
 * live products were invisible in a table that looked complete.
 *
 * This list is the denominator. The zero states in the estate table are computed
 * as a SET DIFFERENCE against it, which is the only way a zero can be measured
 * rather than assumed.
 *
 * ── HOW EXISTENCE WAS ESTABLISHED, PER ENTRY ────────────────────────────────
 *
 * `existence` records the METHOD, not a verdict, so a reader can weigh it:
 *
 *   GSC_ROWS      the property returned search rows for it — it exists and is indexed
 *   DNS_HTTP_200  A record resolves and an HTTPS HEAD returned 200 (11 Sep 2026)
 *   UNVERIFIED    something is in DNS but serving was NOT established — see the note
 *
 * 🔴 THE CONTROL THAT MAKES DNS_HTTP_200 MEAN ANYTHING:
 * `almi-definitely-not-real-zzz.almiworld.com` was queried by the same method on
 * the same day and DID NOT RESOLVE. So there is no wildcard DNS on this zone,
 * and "it resolves" is evidence rather than an artefact of the zone's setup.
 * Without that control a 200 from every guessed name would have proved nothing.
 *
 * ⚠️ WHAT DNS_HTTP_200 DOES NOT PROVE: that the host serves a real product page.
 * No response body was read. It proves a host answers, and no more.
 *
 * ⚠️ AND WHAT THIS LIST IS NOT: a census of AlmiWorld products. It is a census of
 * hostnames UNDER almiworld.com. A product on its own registered domain would be
 * outside the domain property altogether and would not appear here — that is an
 * open question, not a settled zero. See `KNOWN_UNKNOWNS` at the foot.
 */

export const ESTATE_HOSTNAMES = Object.freeze([
  // ---- returned search rows on 11 Sep 2026 --------------------------------
  { hostname: "almicv.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almipte.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almiworld.com", existence: "GSC_ROWS", note: "apex" },
  { hostname: "almiitalian.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almioet.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almistudy.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almidutch.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almitoefl.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almidet.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almijob.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almispanish.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almiportuguese.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almidanish.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almigoethe.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almisalary.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almiswiss.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "world.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "alminorwegian.almiworld.com", existence: "GSC_ROWS" },
  { hostname: "almiicelandic.almiworld.com", existence: "GSC_ROWS" },

  // ---- exist, but returned NO search rows ---------------------------------
  // 🔴 These seven are the reason this file exists. Every one is a live host
  // that a rows-only table would have shown as absent.
  {
    hostname: "almiprep.almiworld.com",
    existence: "DNS_HTTP_200",
    note: "owner-confirmed live: a production submit returned HTTP 200 with a Vercel request id, 22 Aug 2026",
  },
  {
    hostname: "almicelpip.almiworld.com",
    existence: "DNS_HTTP_200",
    note: "consistent with the 30 Aug 2026 record of a sitemap discovering 0 pages",
  },
  { hostname: "almifrench.almiworld.com", existence: "DNS_HTTP_200" },
  { hostname: "almijapanese.almiworld.com", existence: "DNS_HTTP_200" },
  { hostname: "almikorean.almiworld.com", existence: "DNS_HTTP_200" },
  { hostname: "almiswedish.almiworld.com", existence: "DNS_HTTP_200" },
  {
    hostname: "almiarchitect.almiworld.com",
    existence: "DNS_HTTP_200",
    note: "answers, but whether it is MEANT to be public was not established",
  },

  // ---- in DNS, serving not established ------------------------------------
  {
    hostname: "almipathway.almiworld.com",
    existence: "UNVERIFIED",
    note:
      "AAAA record only — NO A record — and unreachable over IPv4 from the measuring host. " +
      "Recorded as unverified rather than assigned to either column. A separate finding.",
  },
]);

export const ESTATE_HOSTNAME_LIST = Object.freeze(ESTATE_HOSTNAMES.map((e) => e.hostname));

/**
 * 🔴 WRITTEN DOWN SO A ZERO IS NOT MISTAKEN FOR A COMPLETE ANSWER.
 *
 * These are not gaps in the code. They are gaps in the census, and a reader of
 * the estate table is entitled to know the denominator is not proven total.
 */
export const KNOWN_UNKNOWNS = Object.freeze([
  "Whether any AlmiWorld product is served from its own registered domain rather than a " +
    "subdomain of almiworld.com. Such a host would be outside the DOMAIN property entirely and " +
    "would need its own Search Console grant. NOT measured.",
  "Whether the seven DNS_HTTP_200 hosts serve real product pages. Only that they answer.",
  "almipathway: IPv6-only in DNS and unreachable over IPv4 from the measuring host.",
]);
