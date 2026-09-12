/**
 * NIGERIA — NURSING AND MIDWIFERY COUNCIL OF NIGERIA. Origin regulator.
 *
 * ── WHY THESE SIX RECORDS MATTER OUT OF PROPORTION TO THEIR NUMBER ──────────
 *
 * `ORIGIN_CLAIM_SHAPE.md` went looking for whether origin claims of a genuinely
 * DIFFERENT SHAPE exist — or whether every origin fact collapses into the same
 * yes/no. Nigeria is the country that answered it. A named body, FOUR separate
 * fees, two document lists, and — the part that matters — a fee that exists
 * ONLY BECAUSE THE DESTINATION IS THE UK.
 *
 * 🔴 `ng-nmcn.verification-fee.destination=uk-nmc` IS THE ONLY GENUINELY
 * CORRIDOR-SCOPED FACT IN THIS REGISTRY. Every other record here is either
 * destination-scoped (the same on all 191 nursing pages) or origin-scoped (the
 * same for every destination). This one changes with BOTH ends, and it is the
 * entire evidential basis for a corridor page existing at all.
 *
 * ── AND WHY THEY ARE IN THE EXPENSIVE QUEUE ANYWAY ──────────────────────────
 *
 * NMCN is not a 403. It fetches perfectly. What it does not do is grant
 * permission: the page carries "Copyright © 2022 Nursing & Midwifery Council of
 * Nigeria. All Rights Reserved." and no express licence either way. Under the
 * conservative reading (see FACT_CACHE_DESIGN.md §8.4 — THIS IS AN OPEN RULING
 * FOR THE OWNER, NOT A SETTLED FACT) that is `sourceQuotable: "unknown"`, which
 * costs a human re-read every 180 days.
 *
 * ⚠️ SO THE VALUES BELOW ARE IN OUR OWN WORDS, AND THE FIGURES ARE FIGURES.
 * A fee is a number the Council published; it is not their prose, and stating
 * ₦66,875 is not a reproduction of their wording.
 */
import { fact } from "../../../src/facts/record.mjs";

const URL = "https://nmcn.gov.ng/verify.html";
const MR = "fetched and read 2026-09-10 (ORIGIN_CLAIM_SHAPE.md §1.2); re-fetched 2026-09-10, HTTP 200. It is not a 403.";
const QUOTABLE_BASIS =
  'PROHIBITED. Read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026): "Copyright © 2026 Nursing & Midwifery Council of Nigeria. ALL RIGHTS RESERVED." and no grant of reuse anywhere. 🔴 "All rights reserved" is not silence to be interpreted — it is a reservation of every right. PR #9 recorded this as "unknown" and left a ruling open; the owner has closed it as false.';

const common = {
  // 🔴 A3, 12 Sep 2026: declared UNVERIFIED. The value and source stand; nobody has fact-checked it.
  verificationState: "UNVERIFIED",
  scope: "origin",
  locale: { origin: "nigeria", profession: "nursing" },
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
  pageFingerprint: "d7a4dc14e31ae0964372e83a9aca4b1137ce41d0318deff687c0a0cef1dffee5",
  pageFingerprintNormalisedLength: 6202,
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Nursing and Midwifery Council of Nigeria — Verification",
    publisher: "Nursing and Midwifery Council of Nigeria",
    tier: 1,
    documentRef: null,
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Read from the fetched page. No span stored — see sourceQuotableBasis." },
  // 🔴 The link check RAN and passed. The quote match was never attempted,
  // lawfully, so it is "not-applicable" and carries NO DATE. It is not a
  // failure and it is not a could-not-check: this source is not broken.
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
};

const fee = (id, qualifier, amount, ownWords) =>
  fact({
    ...common,
    id,
    verification: INGESTED_VERIFICATION[id],
    claim: { subject: "ng-nmcn", predicate: "verification-fee", qualifier },
    value: { value: amount, valueType: "money", unit: "NGN" },
    evidence: { ownWords },
  });

/**
 * 🔴 VERIFICATION VERDICTS FOR THE RECORDS BUILT BY THE FACTORY ABOVE.
 *
 * These records take their id as a parameter, so they cannot carry a literal
 * `verification:` block the way the hand-written ones do. The verdicts are
 * keyed by fact_id here and read by the factory — one table, one lookup, and
 * no existing line rewritten.
 *
 * Ingested 12 September 2026 from FACT_VERIFICATION_2026-09-12.csv.
 * 🔴 NO VALUE WAS AMENDED. Only the verification standing was ingested.
 */
const INGESTED_VERIFICATION = {
  "ng-nmcn.verification-fee.purpose=certificate-verification": {"state":"UNKNOWN","verdict":"CONFLICT","reason":"CONFLICT","checkedOn":"2026-09-12","checkedBy":"human:beta-g (Cowork)","sourceUrl":"https://www.nmcn.gov.ng/verify.html","sourceTier":"OFFICIAL","note":"N66,875 on verify.html — matches our value EXACTLY.  🔴 BUT THE REGULATOR CONTRADICTS ITSELF. A second official NMCN page, https://nmcn.gov.ng/verification-of-certificates/, states ONE COMBINED FEE of N68,875 for verification/authentication/good standing. Two pages of the same regulator disagree. Per the frozen conflict rule this is NOT auto-resolved: the fact becomes UNKNOWN, both values are retained, and it is marked for review."},
  "ng-nmcn.verification-fee.purpose=authentication": {"state":"UNKNOWN","verdict":"CONFLICT","reason":"CONFLICT","checkedOn":"2026-09-12","checkedBy":"human:beta-g (Cowork)","sourceUrl":"https://www.nmcn.gov.ng/verify.html","sourceTier":"OFFICIAL","note":"N8,750 on verify.html — matches our value EXACTLY.  🔴 BUT THE REGULATOR CONTRADICTS ITSELF. A second official NMCN page, https://nmcn.gov.ng/verification-of-certificates/, states ONE COMBINED FEE of N68,875 for verification/authentication/good standing. Two pages of the same regulator disagree. Per the frozen conflict rule this is NOT auto-resolved: the fact becomes UNKNOWN, both values are retained, and it is marked for review."},
  "ng-nmcn.verification-fee.purpose=letter-of-good-standing": {"state":"UNKNOWN","verdict":"CONFLICT","reason":"CONFLICT","checkedOn":"2026-09-12","checkedBy":"human:beta-g (Cowork)","sourceUrl":"https://www.nmcn.gov.ng/verify.html","sourceTier":"OFFICIAL","note":"N8,750 on verify.html — matches our value EXACTLY.  🔴 BUT THE REGULATOR CONTRADICTS ITSELF. A second official NMCN page, https://nmcn.gov.ng/verification-of-certificates/, states ONE COMBINED FEE of N68,875 for verification/authentication/good standing. Two pages of the same regulator disagree. Per the frozen conflict rule this is NOT auto-resolved: the fact becomes UNKNOWN, both values are retained, and it is marked for review."},
  "ng-nmcn.verification-fee.destination=uk-nmc": {"state":"UNKNOWN","verdict":"CONFLICT","reason":"CONFLICT","checkedOn":"2026-09-12","checkedBy":"human:beta-g (Cowork)","sourceUrl":"https://www.nmcn.gov.ng/verify.html","sourceTier":"OFFICIAL","note":"N17,500 on verify.html — matches our value EXACTLY.  🔴 BUT THE REGULATOR CONTRADICTS ITSELF. A second official NMCN page, https://nmcn.gov.ng/verification-of-certificates/, states ONE COMBINED FEE of N68,875 for verification/authentication/good standing. Two pages of the same regulator disagree. Per the frozen conflict rule this is NOT auto-resolved: the fact becomes UNKNOWN, both values are retained, and it is marked for review."},
};

export default [
  fact({
    ...common,
    id: "ng-nmcn.issuing-body",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.nmcn.gov.ng/verify.html",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "NMCN issues verification of registration for Nigerian nurses going abroad.",
    },
    claim: { subject: "ng-nmcn", predicate: "issuing-body", qualifier: null },
    value: {
      value: "The Nursing and Midwifery Council of Nigeria issues verification of registration for Nigerian nurses going abroad.",
      valueType: "entity",
      unit: null,
    },
    evidence: {
      ownWords:
        "Nigeria has a single national body that issues verification of a nurse's registration — the Nursing and Midwifery Council of Nigeria. Unlike India, there is one answer rather than one per state.",
    },
  }),

  fee(
    "ng-nmcn.verification-fee.purpose=certificate-verification",
    "purpose=certificate-verification",
    66875,
    "Verification of certificates costs ₦66,875, paid to the Council through REMITA. The application also needs a letter stating the purpose and destination, a completed verification form, a photocopy of the current licence, photocopies of the certificates of registration, and a photocopy of a birth certificate or declaration of age.",
  ),
  fee(
    "ng-nmcn.verification-fee.purpose=authentication",
    "purpose=authentication",
    8750,
    "Authentication is a separate process costing ₦8,750 through REMITA (TSA), and the Council states the amount covers any number of certificates. It requires two copies of everything the verification process requires.",
  ),
  fee(
    "ng-nmcn.verification-fee.purpose=letter-of-good-standing",
    "purpose=letter-of-good-standing",
    8750,
    "A Letter of Good Standing is a third separate process, also ₦8,750 through REMITA (TSA), on top of the verification requirements.",
  ),

  // 🔴 THE CORRIDOR FACT. Nigeria → UK has its own price and its own process,
  // different from Nigeria → anywhere else. This is the shape the corridor idea
  // needed in order to exist, and it is the only instance of it we have found.
  fee(
    "ng-nmcn.verification-fee.destination=uk-nmc",
    "destination=uk-nmc",
    17500,
    "Verification and a Letter of Good Standing sent to the NMC in the United Kingdom is its own line on the Council's fee schedule, at ₦17,500 through REMITA, with its own document list — a different price and a different process from verification to any other destination.",
  ),

  fact({
    ...common,
    id: "ng-nmcn.verification-documents",
    verification: {
      state: "UNKNOWN",
      verdict: "CONFLICT",
      reason: "CONFLICT",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.nmcn.gov.ng/verify.html",
      sourceTier: "OFFICIAL",
      note: "We store 5. verify.html lists SIX required items (application letter, completed form, current licence photocopy, registration certificate photocopies, birth certificate/age declaration, payment receipt). The other official page lists THREE. Three sources, three counts. UNKNOWN pending review.",
    },
    claim: { subject: "ng-nmcn", predicate: "verification-documents", qualifier: null },
    value: { value: 5, valueType: "count", unit: "document" },
    evidence: {
      ownWords:
        "Five documents accompany a verification request, besides the payment receipt: an application letter stating the purpose and destination, a completed verification form, a photocopy of the current licence, photocopies of the certificates of registration, and a photocopy of a birth certificate or declaration of age.",
    },
  }),
];
