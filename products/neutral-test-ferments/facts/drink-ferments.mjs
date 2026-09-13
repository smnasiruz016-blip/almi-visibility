/**
 * DECLARED TEST DATA — drink ferments. Not facts, not advice, never rendered.
 * See ../product.mjs for why this product exists (item 53's INPUT).
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
  life: { status: "lead", firstSeenOn: "2026-09-13", extractedOn: "2026-09-13" },
  provenance: { route: "R4", acquiredBy: "declared-test-product:item-53" },
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
    id: "tea-ferment.maximum-ph-at-bottling.ferment=kombucha",
    claim: { subject: "tea-ferment", predicate: "maximum-ph-at-bottling", qualifier: "ferment=kombucha" },
    value: { value: "4.2", valueType: "ph" },
    source: { url: "https://example.org/declared-test-product/ferments/tea-ferment-ph", label: "Declared test source — tea ferment acidity", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a tea ferment bottled at pH 4.2 or below. Not a verified claim." },
  }),
  fact({
    ...common,
    id: "sugar-water-ferment.sugar-per-litre.ferment=water-kefir",
    claim: { subject: "sugar-water-ferment", predicate: "sugar-per-litre", qualifier: "ferment=water-kefir" },
    value: { value: "50", valueType: "mass-per-volume", unit: "g/L" },
    source: { url: "https://example.org/declared-test-product/ferments/sugar-water", label: "Declared test source — sugar water", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: fifty grams of sugar per litre of water. Not a verified claim." },
  }),
];
