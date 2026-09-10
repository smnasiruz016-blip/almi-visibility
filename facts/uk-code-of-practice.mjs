/**
 * UK CODE OF PRACTICE for the international recruitment of health and social
 * care personnel — drawn from the WHO Health Workforce Support and Safeguards
 * List 2023.
 *
 * ── 🔴 THE MOST CONSEQUENTIAL ORIGIN FACT IN THE PRODUCT ────────────────────
 *
 * `ORIGIN_CLAIM_SHAPE.md` §3 found this late and called it the strongest
 * per-origin claim yet, for a reason worth repeating here: it GENUINELY CHANGES
 * THE ANSWER PER ORIGIN, it has THREE states rather than the usual yes/no, and
 * NEITHER THE NMC NOR OET PUTS IT ON A PAGE ABOUT THESE COUNTRIES. It is the
 * single most useful thing a nurse from Nigeria or Pakistan could read, and the
 * whole 240,328-page estate never said it once.
 *
 * ── ONE MEMBERSHIP CLAIM PER COUNTRY, AND NOT ONE LIST CLAIM ────────────────
 *
 * Five records below, one per country, rather than one record holding the whole
 * red list. Because membership is what a page asserts — `/nursing/from-nigeria`
 * says "Nigeria is red-listed", not "here are 54 countries" — and binding to
 * the claim a page actually makes is the difference between researching a fact
 * once and researching it per page (§1).
 */
import { fact } from "../src/facts/record.mjs";

const URL =
  "https://www.gov.uk/government/publications/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel-in-england";
const OGL =
  'EXPRESS PERMISSION. Open Government Licence v3.0, stated on the page: "© Crown copyright 2025. This publication is licensed under the terms of the Open Government Licence v3.0 except where otherwise stated." Licence read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026); it permits copying, publishing, transmitting, adapting AND COMMERCIAL EXPLOITATION, conditional on attribution.';
const MR = "fetched and read 2026-09-10; re-fetched 2026-09-10 by bin/quote-match.mjs, HTTP 200";

const RED_SPAN = "Countries on the red list must not be targeted for international recruitment";
const AMBER_SPAN =
  "Amber countries - international recruitment is only permitted in compliance with the terms of the government-to-government agreement";
const AMBER_COUNTRIES_SPAN = `${AMBER_SPAN} Kenya Nepal`;
const DIRECT_APPLICATION_SPAN =
  "may consider direct applications from an individual resident in a country on the red list if that individual is making a direct application on their own behalf and not using a third party";
const RED_LIST_TERMINUS_SPAN = "Zambia Zimbabwe Amber countries";

const common = {
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MR,
  sourceQuotable: true,
  sourceQuotableBasis: OGL,
  licence: "OGL-v3.0",
  sourceDocumentClass: "guidance",
  attributionStatement:
    "Contains public sector information licensed under the Open Government Licence v3.0. https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  // The per-page check the word "MOST" forces. Measured 2026-09-10: two notices,
  // both Crown, and the OGL statement present. No third-party credit.
  thirdPartyRightsCheck: {
    checkedOn: "2026-09-10",
    clear: true,
    detail: "no non-Crown copyright notice on the page; the OGL statement is present",
    noticesFound: ["© Crown copyright 2025 This publication is licensed under the terms of the Open G", "© Crown copyright"],
  },
  queue: "AUTOMATED",
  freshness: { rule: "machine-quote-match", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Code of Practice for the international recruitment of health and social care personnel in England",
    publisher: "UK Department of Health and Social Care",
    tier: 1,
    documentRef: "Code of Practice, red and amber list annexes. Page states its own last update as 27 March 2025.",
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Span machine-matched before the record went active." },
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
};

const membership = (country, listName, valueText, span) =>
  fact({
    ...common,
    id: `uk-code-of-practice.recruitment-list-membership.country=${country}`,
    claim: { subject: "uk-code-of-practice", predicate: "recruitment-list-membership", qualifier: `country=${country}` },
    scope: "origin",
    locale: { destination: "uk", origin: country },
    value: { value: valueText, valueType: "enum", unit: "red | amber | not-listed" },
    evidence: { quotedSpan: span, quoteLocation: `${listName} list` },
  });

export default [
  membership("nigeria", "red", "Nigeria is on the RED list: UK health and care employers should not actively recruit from it.", RED_SPAN),
  membership("pakistan", "red", "Pakistan is on the RED list: UK health and care employers should not actively recruit from it.", RED_SPAN),
  membership(
    "kenya",
    "amber",
    "Kenya is on the AMBER list: international recruitment is permitted only in compliance with the government-to-government agreement in place for it.",
    AMBER_SPAN,
  ),

  // 🔴 A NEGATIVE MEMBERSHIP IS A DIFFERENT KIND OF RECORD AND IT IS MARKED AS
  // ONE. "India is not listed" cannot be proved by a string, because an absence
  // is not a string. The span below proves the red list still exists and is
  // still the mechanism; it does NOT prove India stayed off it. The nightly job
  // therefore protects these two records LESS than it protects the three above,
  // and pretending otherwise is how a page keeps telling an Indian nurse she is
  // green-listed for a year after she stopped being.
  fact({
    ...common,
    id: "uk-code-of-practice.recruitment-list-membership.country=india",
    claim: { subject: "uk-code-of-practice", predicate: "recruitment-list-membership", qualifier: "country=india" },
    scope: "origin",
    locale: { destination: "uk", origin: "india" },
    value: {
      value: "India appears on neither the red nor the amber list, so active recruitment from India is permitted.",
      valueType: "enum",
      unit: "red | amber | not-listed",
    },
    evidence: { quotedSpan: RED_SPAN, quoteLocation: "red list annex — India does not appear in it" },
    quoteMatchProves: "the red-list mechanism still exists — NOT that India is still absent from it",
  }),
  fact({
    ...common,
    id: "uk-code-of-practice.recruitment-list-membership.country=philippines",
    claim: { subject: "uk-code-of-practice", predicate: "recruitment-list-membership", qualifier: "country=philippines" },
    scope: "origin",
    locale: { destination: "uk", origin: "philippines" },
    value: {
      value: "The Philippines appears on neither the red nor the amber list, so active recruitment from the Philippines is permitted.",
      valueType: "enum",
      unit: "red | amber | not-listed",
    },
    evidence: { quotedSpan: RED_SPAN, quoteLocation: "red list annex — the Philippines does not appear in it" },
    quoteMatchProves: "the red-list mechanism still exists — NOT that the Philippines is still absent from it",
  }),

  fact({
    ...common,
    id: "uk-code-of-practice.red-list-rule",
    claim: { subject: "uk-code-of-practice", predicate: "red-list-rule", qualifier: null },
    scope: "shared",
    value: {
      value:
        "Health and care professionals from red list countries should not be targeted for active recruitment by UK health and social care employers.",
      valueType: "rule",
      unit: null,
    },
    evidence: { quotedSpan: RED_SPAN, quoteLocation: "red list section" },
  }),
  fact({
    ...common,
    id: "uk-code-of-practice.amber-list-rule",
    claim: { subject: "uk-code-of-practice", predicate: "amber-list-rule", qualifier: null },
    scope: "shared",
    value: {
      value:
        "For amber list countries, international recruitment is permitted only in compliance with the terms of the government-to-government agreement in place for that country. A red list country moves to amber when such an agreement is signed.",
      valueType: "rule",
      unit: null,
    },
    evidence: { quotedSpan: AMBER_SPAN, quoteLocation: "amber list section" },
  }),
  fact({
    ...common,
    id: "uk-code-of-practice.amber-list-countries",
    claim: { subject: "uk-code-of-practice", predicate: "amber-list-countries", qualifier: null },
    scope: "shared",
    value: { value: "Kenya, Nepal", valueType: "list", unit: "country" },
    evidence: { quotedSpan: AMBER_COUNTRIES_SPAN, quoteLocation: "Annex A, amber list" },
  }),
  fact({
    ...common,
    id: "uk-code-of-practice.direct-application-exception",
    claim: { subject: "uk-code-of-practice", predicate: "direct-application-exception", qualifier: null },
    scope: "shared",
    value: {
      value:
        "An employer may consider a direct application from an individual resident in a red list country where that individual applies on their own behalf and does not use a third party.",
      valueType: "rule",
      unit: null,
    },
    evidence: { quotedSpan: DIRECT_APPLICATION_SPAN, quoteLocation: "red list exceptions" },
  }),

  /**
   * ── 🔴 THE COUNT, AND THE DISAGREEMENT THAT ALMOST GOT WRITTEN DOWN WRONG ──
   *
   * Asked to summarise this page, a model reported SIXTY-TWO red list
   * countries. Our own reading on the same day, in `ORIGIN_CLAIM_SHAPE.md`, said
   * FIFTY-FOUR. Same page, same day, two model readings, two answers.
   *
   * It was settled by asking the model for the LIST rather than the COUNT, and
   * then counting the list with `tr | wc -l`: 54 entries, no duplicates.
   *
   * THE EXTRACTION WAS RIGHT AND THE COUNT WAS WRONG — which is precisely the
   * split §2 draws when it says a model may propose a fact and may never be the
   * source. A model reading text and returning a span is doing the thing it is
   * reliable at. A model counting fifty-four items is doing arithmetic, and
   * arithmetic belongs to the machine.
   *
   * The conflict is kept on the record rather than deleted once resolved,
   * because the next person to re-derive this number needs to know that the
   * obvious way to ask produces 62.
   */
  fact({
    ...common,
    id: "uk-code-of-practice.red-list-country-count",
    claim: { subject: "uk-code-of-practice", predicate: "red-list-country-count", qualifier: null },
    scope: "shared",
    value: { value: 54, valueType: "count", unit: "country" },
    evidence: { quotedSpan: RED_LIST_TERMINUS_SPAN, quoteLocation: "Annex A — the end of the red list, where the amber list begins" },
    // 🔴 A DERIVED AGGREGATE CANNOT BE QUOTE-MATCHED, AND THIS RECORD SAYS SO.
    // No sentence on that page contains "54". The span above proves only where
    // the red list ENDS. A count is re-established by re-extracting the list and
    // counting it, which is a different job from matching a string, and the
    // nightly matcher does not do it. Until something does, this record's
    // freshness rests on the terminus moving — which it would if a country were
    // appended, and which it would NOT if one were inserted in the middle.
    quoteMatchProves: "the red list still ends at Zimbabwe — NOT that it still contains exactly 54 countries",
    conflict: {
      disagreement: "A summarising model reported 62 red list countries for this page on 2026-09-10; ORIGIN_CLAIM_SHAPE.md recorded 54 the same day.",
      settledBy: "The list was extracted verbatim and counted by machine: 54 entries, 0 duplicates. 54 stands.",
      resolution:
        "Re-extract the list (never the count) and count it by machine. Any future disagreement is settled the same way — a model may propose the span, the machine does the arithmetic.",
    },
  }),
];
