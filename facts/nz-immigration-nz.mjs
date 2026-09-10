/**
 * NEW ZEALAND — IMMIGRATION NEW ZEALAND.
 *
 * ── THE NETWORK'S ONLY PRE-EXISTING SOURCED FACT ────────────────────────────
 *
 * Gate A run 01 measured 3,414 pages across four groups that differ in every
 * way supposed to matter — twelve pages against 237,413, a median of 30 unique
 * words against 2,236 — and they failed for one single shared reason: NOBODY
 * HAD EVER RECORDED A FACT WITH A SOURCE, A TIER AND A DATE.
 *
 * The whole network's stock was ONE record, hand-written, in
 * `almi-oet/src/lib/oet-seo/org-notes.ts`, attached to no page. This is it,
 * promoted into the registry as its thirty-second member. It is here first
 * because it is the prior art the design was built from, not despite being
 * old.
 *
 * ── AND IT IS ALSO THE PROOF THAT THE TIER-4 RULE WORKS ─────────────────────
 *
 * 🔴 THIS FACT EXISTS BECAUSE A LEAD WAS TREATED AS A LEAD. The AlmiMonitor
 * pulse surfaced the change on 2026-07-15 — from a law firm's blog, which is
 * tier 4 and is not a citation. A person then went to Immigration New Zealand's
 * own news centre and read it there, and THAT is the source on this record.
 *
 * The rule the original author wrote by hand is adopted as law rather than
 * reinvented, and it is enforced by F4 and F13 in `src/facts/validate.mjs`:
 *
 *   "Cite an OFFICIAL source — the authority's or organisation's own site. A
 *    law firm's summary or a prep-industry blog is a lead to verify, never the
 *    citation itself."
 *
 * ── 🔴 AND THE ONE THING THAT DID NOT SURVIVE PROMOTION ─────────────────────
 *
 * The original carried `verifiedOn: "2026-07-15"` and the note says a person
 * read the source that day. That is genuinely closer to a FACT CHECK than
 * anything else in this registry — and `factCheckedOn` is still null below.
 *
 * Because the person is not named. `factCheckedBy` is mandatory whenever
 * `factCheckedOn` is set, and "somebody, fourteen months ago" is not evidence
 * that can be weighed against `model:claude-opus-5`. The honest move is to
 * leave it null and let the count stay at zero rather than admit one record on
 * a recollection. Whoever did the reading can claim it in one line, and it will
 * be the registry's first real fact check.
 */
import { fact } from "../src/facts/record.mjs";

export default [
  fact({
    id: "nz-immigration-nz.oet-must-be-taken-in-person",
    claim: { subject: "nz-immigration-nz", predicate: "oet-must-be-taken-in-person", qualifier: null },
    scope: "destination",
    locale: { destination: "new-zealand" },
    value: {
      value:
        "For immigration applications, Immigration New Zealand accepts OET only where every part of the test was taken in person at a supervised test centre, from midnight on 12 July 2026 NZST. Computer-based results with a remotely administered speaking component completed before 13 July 2026 remain usable.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: "https://www.immigration.govt.nz/about-us/news-centre/update-on-english-language-testing-for-immigration-applications/",
      label: "Immigration New Zealand — Update on English language testing for immigration applications",
      publisher: "Immigration New Zealand",
      tier: 1,
      documentRef: null,
    },
    sourceMachineReadable: "unknown",
    sourceMachineReadableBasis:
      "🔴 NEVER FETCHED BY US. The original record was read by a person on 2026-07-15 and no automated fetch has been attempted since. Unknown means unattempted, and it is not a guess dressed as one.",
    sourceQuotable: "unknown",
    sourceQuotableBasis:
      "NO LICENCE READ. New Zealand government material is commonly released under a Creative Commons licence, but that was NOT checked for this page and a convention is not a licence. See FACT_CACHE_DESIGN.md §8.4.",
    evidence: {
      ownWords:
        "Immigration New Zealand requires every part of the OET to have been sat in person at a supervised test centre for immigration applications, with effect from midnight on 12 July 2026 New Zealand Standard Time. Results from a computer-based OET with a remotely administered speaking component are still accepted if they were completed before 13 July 2026. The two dates are not a typo — the cutoff falls at midnight on the 12th. This is Immigration New Zealand's acceptance rule and not a change to OET's test format, and it applies to OET only, not to other English language tests.",
    },
    queue: "MANUAL",
    freshness: { rule: "human-re-read", days: 180 },
    // The original was read on 2026-07-15, so at 180 days this record falls due
    // for re-reading on 2027-01-11. It is the OLDEST thing in the registry by
    // fifty-seven days and it is NOT yet overdue — `bin/facts.mjs census`
    // computes that against the real clock rather than taking anyone's word,
    // and it will surface this record on its own the day it expires.
    //
    // 🔴 It is also the only record whose source we have never fetched, which is
    // why its link check is could-not-check and its status is `candidate`
    // rather than `active`. A candidate may not reach a page.
    checks: { linkCheckedOn: null, linkCheckOutcome: "could-not-check", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable" },
    life: { status: "candidate", firstSeenOn: "2026-07-15", extractedOn: "2026-07-15" },
    provenance: {
      route: "R2",
      acquiredBy: "human:unattributed",
      note: "Surfaced by the AlmiMonitor pulse from a tier-4 law-firm blog on 2026-07-15, then read at Immigration New Zealand's own news centre. Promoted from almi-oet/src/lib/oet-seo/org-notes.ts.",
    },
  }),
];
