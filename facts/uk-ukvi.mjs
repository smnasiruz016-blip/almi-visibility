/**
 * UK — UKVI, Immigration Rules Appendix English Language.
 *
 * ── WHY gov.uk IS THE BEST SOURCE IN THIS REGISTRY ──────────────────────────
 *
 * It is the only publisher here that EXPRESSLY grants what the freshness model
 * needs. Every gov.uk page carries the Open Government Licence v3.0, which
 * permits copying and publishing the content. So `sourceQuotable` is `true` on
 * a licence somebody read, not on an absence of prohibition — and that is the
 * distinction the third value of that field exists to preserve.
 *
 * 🔴 AND NOTE WHICH CLAIM IS WHICH. The eighteen-country LIST is a shared,
 * destination-scoped fact: it is the same list on all 191 corridor pages.
 * "India is not on it" is the ORIGIN-scoped fact derived from it, and it is the
 * one that changes the answer for a reader. They are two records because they
 * go stale for different reasons — the list changes when the Home Office edits
 * it; India's membership changes only if India is added.
 */
import { fact } from "../src/facts/record.mjs";

const URL = "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-english-language";
const OGL =
  'EXPRESS PERMISSION. Open Government Licence v3.0 — read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026) at nationalarchives.gov.uk and gov.uk/help/terms-conditions. Grants a worldwide, royalty-free, perpetual licence to copy, publish, distribute, transmit, adapt AND EXPLOIT COMMERCIALLY. The commercial permission is the load-bearing part: AlmiWorld is a commercial product. Conditional on attribution, and subject to the per-page third-party check below.';
const MR = "fetched and read 2026-09-10 (acceptance/nursing-from-india); re-fetched 2026-09-10 by bin/quote-match.mjs, HTTP 200";

const LIST_SPAN =
  "An applicant will meet the English language requirement if they are a national of any of the following majority-English-speaking countries:";

const common = {
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MR,
  sourceQuotable: true,
  sourceQuotableBasis: OGL,
  licence: "OGL-v3.0",
  sourceDocumentClass: "rules",
  attributionStatement:
    "Contains public sector information licensed under the Open Government Licence v3.0. https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  // 🔴 GOV.UK says MOST of its content is Crown copyright under the OGL, and
  // that where it is not, "we'll usually credit the author or copyright
  // holder". So this page had to be READ for a third-party credit before its
  // text could be stored. Measured 2026-09-10: one notice, "© Crown copyright",
  // and no non-Crown notice anywhere on the page.
  thirdPartyRightsCheck: {
    checkedOn: "2026-09-10",
    clear: true,
    // 🔴 THE FIELD THAT DECIDES, narrowed by the owner's ruling: a notice only
    // bites when it sits INSIDE the content region the span was taken from.
    // Measured 2026-09-10 for every span in this file: region <main>, no
    // third-party notice in it.
    spanRegionConflict: false,
    spanRegion: "main",
    detail: "no third-party notice inside the <main> each span came from; the OGL statement is present",
    noticesFound: ["© Crown copyright"],
  },
  queue: "AUTOMATED",
  freshness: { rule: "machine-quote-match", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Immigration Rules Appendix English Language, EL 4.1",
    publisher: "UK Home Office",
    tier: 1,
    documentRef: "Immigration Rules Appendix English Language, paragraph EL 4.1",
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Span machine-matched before the record went active." },
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
};

export default [
  fact({
    ...common,
    id: "uk-ukvi.majority-english-speaking-countries",
    claim: { subject: "uk-ukvi", predicate: "majority-english-speaking-countries", qualifier: null },
    scope: "destination",
    locale: { destination: "uk" },
    value: {
      // Counted by hand from the page: eighteen entries.
      value:
        "Antigua and Barbuda, Australia, The Bahamas, Barbados, Belize, The British Overseas Territories, Canada, Dominica, Grenada, Guyana, Jamaica, Malta, New Zealand, St Kitts and Nevis, St Lucia, St Vincent and the Grenadines, Trinidad and Tobago, United States of America",
      valueType: "list",
      unit: "country",
    },
    evidence: { quotedSpan: LIST_SPAN, quoteLocation: "EL 4.1" },
  }),

  fact({
    ...common,
    id: "uk-ukvi.english-nationality-exemption.nationality=india",
    claim: { subject: "uk-ukvi", predicate: "english-nationality-exemption", qualifier: "nationality=india" },
    scope: "origin",
    locale: { destination: "uk", origin: "india" },
    value: {
      value:
        "India is NOT one of the majority-English-speaking countries listed at EL 4.1, so Indian nationality alone does not meet the UK immigration English language requirement.",
      valueType: "boolean-with-consequence",
      unit: null,
    },
    evidence: { quotedSpan: LIST_SPAN, quoteLocation: "EL 4.1 — India does not appear in the list that follows" },
    // ⚠️ THE SPAN PROVES THE LIST EXISTS. IT DOES NOT PROVE INDIA IS ABSENT FROM
    // IT — an absence is not a string and cannot be matched. So the nightly job
    // protects this record only against the list heading being removed, and a
    // person is still what stands between us and India being quietly added.
    // Recorded here rather than in a report, because the limitation belongs to
    // the record and travels with it.
  }),
];
