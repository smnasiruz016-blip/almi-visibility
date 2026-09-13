/**
 * DECLARED TEST DATA — vegetable ferments. Not facts, not advice, never rendered.
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
    id: "cabbage-brine.minimum-salt-by-weight.ferment=sauerkraut",
    claim: { subject: "cabbage-brine", predicate: "minimum-salt-by-weight", qualifier: "ferment=sauerkraut" },
    value: { value: "2", valueType: "percentage", unit: "% w/w" },
    source: { url: "https://example.org/declared-test-product/ferments/cabbage-brine", label: "Declared test source — cabbage brine", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a cabbage brine at two percent salt by weight. Not a verified claim." },
  }),
  fact({
    ...common,
    id: "fermented-paste.minimum-maturation.ferment=miso",
    claim: { subject: "fermented-paste", predicate: "minimum-maturation", qualifier: "ferment=miso" },
    value: { value: "6", valueType: "duration", unit: "months" },
    source: { url: "https://example.org/declared-test-product/ferments/paste-maturation", label: "Declared test source — paste maturation", publisher: "Declared test publisher (does not exist)", tier: 3 },
    evidence: { quotedSpan: null, ownWords: "DECLARED TEST DATA: a paste matured for six months. Not a verified claim." },
  }),
];
