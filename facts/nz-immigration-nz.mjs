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
    // Corrected 2026-09-10: it HAS now been fetched. PR #9 said "never fetched
    // by us", which was true when written; leaving it would have been a stale
    // claim about our own work.
    sourceMachineReadable: true,
    sourceMachineReadableBasis:
      "fetched 2026-09-10, HTTP 200, same host, 7,823 characters of normalised text, and the normalised hash was identical across two consecutive fetches.",
    // ✅ READ 2026-09-11 by the owner, first-hand, at
    // immigration.govt.nz/about-us/about-this-site/copyright/ — and the
    // CONVENTION TURNED OUT TO BE TRUE, which does not retrospectively make
    // assuming it correct. It was "unknown-not-read" until somebody read it.
    sourceQuotable: true,
    sourceQuotableBasis:
      "PERMITTED. Creative Commons Attribution 3.0 New Zealand, read first-hand by the owner at immigration.govt.nz/about-us/about-this-site/copyright/ (_handoffs/SOURCE_QUOTABILITY.md): it \"licenses you to copy, distribute and adapt\", conditional on attribution to the Crown and to the Ministry website. ⚠️ PER-DOCUMENT CAVEAT: PDFs, text files, documents, extracts and DATA may NOT be Crown copyright and must each be assessed separately — the same shape of limit as the OGL's word MOST. This page is HTML and its footer carries \"Crown copyright\".",
    licence: "CC-BY-3.0-NZ",
    sourceDocumentClass: "news",
    // 🔴 NO SPAN IS STORED, AND THE LICENCE IS NOT THE REASON.
    //
    // Quoting is permitted here. Nobody has ever extracted a span, because this
    // fact reached us through org-notes.ts in a person's own words. A permission
    // is not an obligation — and that distinction was a DEFECT IN OUR OWN LAW
    // until this record found it: F6 demanded a quotedSpan wherever one was
    // allowed, so this lawful, useful record was rejected.
    //
    // With no span there is nothing to attribute and nothing to re-match, so the
    // credit is null and the record is fingerprint-watched.
    attributionStatement: null,
    evidence: {
      ownWords:
        "Immigration New Zealand requires every part of the OET to have been sat in person at a supervised test centre for immigration applications, with effect from midnight on 12 July 2026 New Zealand Standard Time. Results from a computer-based OET with a remotely administered speaking component are still accepted if they were completed before 13 July 2026. The two dates are not a typo — the cutoff falls at midnight on the 12th. This is Immigration New Zealand's acceptance rule and not a change to OET's test format, and it applies to OET only, not to other English language tests.",
    },
    queue: "AUTOMATED",
    freshness: { rule: "machine-fingerprint", days: 180 },
    // ⚠️ AND THE PER-PAGE CHECK ON THIS PAGE IS NOT CLEAR, MEASURED 2026-09-10.
    // The footer carries "Crown copyright" AND a separate "© 2026 Cookie
    // Information" — a cookie-consent vendor's notice, which is almost certainly
    // not a claim over this page's text. The scanner CANNOT TELL THOSE APART and
    // is not allowed to guess, so it reports and a person rules.
    //
    // It blocks nothing today, because no span is stored. It would have to be
    // resolved before one ever is. Recorded here rather than in a report,
    // because the limitation belongs to the record and travels with it.
    // 🔴 RULED 2026-09-10, AND THE OBSERVATION IS KEPT RATHER THAN ERASED.
    //
    // `clear: false` stands: this page really does carry a non-Crown notice. What
    // changed is what that is allowed to DECIDE. The notice is in a cookie
    // consent widget, structurally outside the <main> the facts come from — so
    // it is a fact about the widget, not about the article, and it never had a
    // veto over the article body.
    //
    // The narrowing is structural: nothing here knows what "Cookie Information"
    // is, and nothing here should. It reads WHERE the notice sits, in the markup
    // the publisher wrote, and nothing else.
    thirdPartyRightsCheck: {
      checkedOn: "2026-09-10",
      clear: false,
      spanRegionConflict: null,
      spanRegion: null,
      detail:
        "a non-Crown notice is present in a consent widget outside <main>. No span is stored from this page, so there is nothing to place; were one taken from <main>, the widget would not block it",
      noticesFound: ["© 2026 Cookie Information We use cookies on this website to show you relevant inf"],
    },
    // The page digest taken on 2026-09-10, and the ONLY thing about this page
    // the registry stores. A sha256 is one-way: the wording cannot be recovered
    // from it, it cannot substitute for the source, and it is not a copy — which
    // is why it is lawful to hold where the wording is not. It is normalised text,
    // not raw HTML: raw HTML differed between two consecutive fetches on 6 of 9
    // pages, and normalised text on 0 of 9.
    pageFingerprint: "d8dbf42496701223f7cb65312f83c662d0965f5671085b8bf110bc52217ec4b5",
    pageFingerprintNormalisedLength: 7823,
    // The original was read on 2026-07-15, so at 180 days this record falls due
    // for re-reading on 2027-01-11. It is the OLDEST thing in the registry by
    // fifty-seven days and it is NOT yet overdue — `bin/facts.mjs census`
    // computes that against the real clock rather than taking anyone's word,
    // and it will surface this record on its own the day it expires.
    //
    // 🔴 AND IT IS THE ONLY RECORD IN THE REGISTRY ACQUIRED BY A PERSON.
    // Every other one was proposed by a model and machine-checked. That makes it
    // the best-evidenced fact here AND the one whose evidence this system cannot
    // reproduce, because the person who did the reading is not named.
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    // Promoted candidate -> active on 2026-09-10: the one thing holding it back,
    // a link check nobody had run, has now been run and passed.
    life: { status: "active", firstSeenOn: "2026-07-15", extractedOn: "2026-07-15" },
    provenance: {
      route: "R2",
      acquiredBy: "human:unattributed",
      note: "Surfaced by the AlmiMonitor pulse from a tier-4 law-firm blog on 2026-07-15, then read at Immigration New Zealand's own news centre. Promoted from almi-oet/src/lib/oet-seo/org-notes.ts.",
    },
  }),
];
