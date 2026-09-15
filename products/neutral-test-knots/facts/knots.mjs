/**
 * DECLARED TEST DATA — knots. Not facts, not advice, never rendered.
 * See ../product.mjs for why this product exists (row 61's INPUT).
 */
import { fact } from "../../../src/facts/record.mjs";

const common = {
  verificationState: "UNVERIFIED",
  scope: "shared",
  sourceMachineReadable: false,
  sourceMachineReadableBasis: "DECLARED TEST PRODUCT — no fetch was attempted: the source is a reserved example.org address that does not exist",
  sourceQuotable: false,
  sourceQuotableBasis: "DECLARED TEST PRODUCT — licence DECLARED-TEST-DATA reserves everything; nothing is quoted",
  licence: "DECLARED-TEST-DATA",
  sourceDocumentClass: "guidance",
  queue: "MANUAL",
  freshness: { rule: "human-re-read", days: 180 },
  life: { status: "lead", firstSeenOn: "2026-09-15", extractedOn: "2026-09-15" },
  provenance: { route: "R4", acquiredBy: "declared-test-product:row-61" },
  checks: {
    linkCheckedOn: null, linkCheckOutcome: "not-applicable",
    quoteMatchedOn: null, quoteMatchOutcome: "not-applicable",
    fingerprintCheckedOn: null, fingerprintOutcome: "not-applicable",
    factCheckedOn: null, factCheckedBy: null,
  },
};

export default [
  fact({
    ...common,
    id: "fixed-loop.turns-before-tuck.knot=bowline",
    claim: { subject: "fixed-loop", predicate: "turns-before-tuck", qualifier: "knot=bowline" },
    value: { value: "one turn", valueType: "text" },
    source: { url: "https://example.org/declared-test-product/knots/fixed-loop", label: "Declared test source — fixed loops", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a fixed loop tied with one turn before the tuck. Not a verified claim." },
  }),
  fact({
    ...common,
    id: "fixed-loop.holds-under-cyclic-load.knot=bowline",
    claim: { subject: "fixed-loop", predicate: "holds-under-cyclic-load", qualifier: "knot=bowline" },
    value: { value: "not declared to hold", valueType: "text" },
    source: { url: "https://example.org/declared-test-product/knots/cyclic-load", label: "Declared test source — cyclic load", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a fixed loop is not declared to hold under cyclic load. Not a verified claim." },
  }),
  fact({
    ...common,
    id: "post-hitch.crossing-turns.knot=clove-hitch",
    claim: { subject: "post-hitch", predicate: "crossing-turns", qualifier: "knot=clove-hitch" },
    value: { value: "two crossing turns", valueType: "text" },
    source: { url: "https://example.org/declared-test-product/knots/post-hitch", label: "Declared test source — post hitches", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a post hitch made of two crossing turns. Not a verified claim." },
  }),
];
