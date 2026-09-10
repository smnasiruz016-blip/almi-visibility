/**
 * PAKISTAN — PAKISTAN NURSING & MIDWIFERY COUNCIL. Origin regulator.
 *
 * The second of only two NIGERIA-GRADE origins in eight probed (A1). Same
 * shape as Nigeria and it independently confirms the shape is real rather than
 * a peculiarity of one country: a named national body, a published fee, a
 * document list, a stated response time — and a fee that changes because the
 * destination is foreign.
 *
 * 🔴 Rs.10,000 AGAINST Rs.1,000. A TENFOLD DIFFERENCE THAT EXISTS ONLY BECAUSE
 * THE NURSE IS LEAVING. That is why the two fees are two records and not one
 * with a note: they are different claims, they will change independently, and
 * the comparison between them is the fact a reader actually needs.
 *
 * ── AND PAKISTAN IS RED-LISTED ──────────────────────────────────────────────
 *
 * See `uk-code-of-practice.recruitment-list-membership.country=pakistan`. A
 * page built from this file alone would tell a Pakistani nurse what verification
 * costs while omitting that UK employers should not be actively recruiting her.
 * The two records are bound to different subjects and only a page that pulls
 * both is honest — which is the argument for claim-binding restated as a
 * consequence.
 */
import { fact } from "../src/facts/record.mjs";

const URL = "https://pnmc.gov.pk/verification-registration-2/";
const MR = "fetched and read 2026-09-10 (A1_FACT_SUPPLY_FEASIBILITY.md §1), plain HTML; re-fetched 2026-09-10, HTTP 200.";
const QUOTABLE_BASIS =
  'PROHIBITED. Read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026): "Copyright © 2026 Pakistan Nursing & Midwifery Council. ALL RIGHTS RESERVED." and no grant of reuse. 🔴 Recorded as "unknown" in PR #9; the owner has ruled it false. An absent licence reserves everything.';

const common = {
  scope: "origin",
  locale: { origin: "pakistan", profession: "nursing" },
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MR,
  sourceQuotable: false,
  sourceQuotableBasis: QUOTABLE_BASIS,
  licence: "proprietary-no-reuse",
  sourceDocumentClass: "general",
  attributionStatement: null,
  queue: "AUTOMATED",
  freshness: { rule: "machine-fingerprint", days: 180 },
  // The page digest taken on 2026-09-10, and the ONLY thing about this page
  // the registry stores. A sha256 is one-way: the wording cannot be recovered
  // from it, it cannot substitute for the source, and it is not a copy — which
  // is why it is lawful to hold where the wording is not. It is normalised text,
  // not raw HTML: raw HTML differed between two consecutive fetches on 6 of 9
  // pages, and normalised text on 0 of 9.
  pageFingerprint: "f3740f058f6df75846b99b66d49450291809aa875413a9a9c5f82a4e54324a92",
  pageFingerprintNormalisedLength: 5058,
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Pakistan Nursing & Midwifery Council — Verification of Registration",
    publisher: "Pakistan Nursing & Midwifery Council",
    tier: 1,
    documentRef: null,
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Read from the fetched page. No span stored — see sourceQuotableBasis." },
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
};

export default [
  fact({
    ...common,
    id: "pk-pnmc.issuing-body",
    claim: { subject: "pk-pnmc", predicate: "issuing-body", qualifier: null },
    value: {
      value: "The Pakistan Nursing & Midwifery Council issues verification of registration and Good Standing certificates.",
      valueType: "entity",
      unit: null,
    },
    evidence: {
      ownWords:
        "Pakistan has a single national body issuing verification of registration and Good Standing certificates for nurses — the Pakistan Nursing & Midwifery Council.",
    },
  }),

  fact({
    ...common,
    id: "pk-pnmc.verification-fee.destination=foreign",
    claim: { subject: "pk-pnmc", predicate: "verification-fee", qualifier: "destination=foreign" },
    value: { value: 10000, valueType: "money", unit: "PKR" },
    evidence: {
      ownWords:
        "Verification sent to a body outside Pakistan carries a processing fee of Rs.10,000 — ten times the domestic fee, and the difference exists only because the destination is foreign.",
    },
  }),
  fact({
    ...common,
    id: "pk-pnmc.verification-fee.destination=domestic",
    claim: { subject: "pk-pnmc", predicate: "verification-fee", qualifier: "destination=domestic" },
    value: { value: 1000, valueType: "money", unit: "PKR" },
    evidence: { ownWords: "Verification sent to a body inside Pakistan carries a processing fee of Rs.1,000." },
  }),

  fact({
    ...common,
    id: "pk-pnmc.verification-documents",
    claim: { subject: "pk-pnmc", predicate: "verification-documents", qualifier: null },
    value: { value: 3, valueType: "count", unit: "document" },
    evidence: {
      ownWords:
        "Three documents are required: the application form for verification of registration or a Good Standing certificate; a letter, verification form or printed email giving the full address of the council, regulatory body or organisation the verification must be sent to; and photocopies of the applicant's PNMC or PNC registration card together with all nursing, midwifery, LHV, post-basic diplomas and degrees.",
    },
  }),

  fact({
    ...common,
    id: "pk-pnmc.verification-response-time",
    claim: { subject: "pk-pnmc", predicate: "verification-response-time", qualifier: null },
    value: { value: 3, valueType: "duration", unit: "working day" },
    evidence: {
      ownWords: "The Council states that it aims to respond within three working days.",
      // ⚠️ AN AIM IS NOT A GUARANTEE, and the value keeps the distinction: the
      // claim is what the Council undertakes to try for, not what an applicant
      // will experience. A page that renders this as "takes 3 days" is making a
      // stronger claim than the source does.
    },
  }),
];
