/**
 * IRELAND — NURSING AND MIDWIFERY BOARD OF IRELAND. Destination regulator.
 *
 * ── THE RECORD THAT PROVED "WHICH OET" IS A PER-PROFESSION CLAIM ────────────
 *
 * `PROFESSION_PAGE_CLAIM_INVENTORY.md` set out to test whether the
 * destination-regulator block is shared across the twelve profession pages. It
 * is not, and NMBI is one of the two findings that settled it: NMBI does not
 * ask for OET, it asks for OET (NURSING). So "which version of the test does
 * this regulator want" is a claim that must be written twelve times, not once —
 * and that single observation is most of why the acquisition count went from
 * ~58 to ~150.
 *
 * ── AND THE RECORD THAT PROVED THE ORIGIN TABLE CANNOT BE COLLAPSED ─────────
 *
 * 🔴 NMBI RECOGNISES FIVE COUNTRIES. UKVI LISTS EIGHTEEN. Same question — "is
 * your country English-speaking enough" — two official answers that do not
 * agree. So the origin table has to carry each regulator's list SEPARATELY; a
 * single "is this country English-speaking" column would have to pick one
 * regulator's answer and would be wrong for the other. That is a schema
 * decision forced by two facts disagreeing, which is exactly what a registry is
 * for.
 *
 * ── 🔴 WHY THE VERBATIM WORDING IS NOT HERE — AND THIS HARDENED ─────────────
 *
 * The inventory read this page and recorded its wording verbatim. Those quotes
 * stay in that measurement document — our own working notes — and are NOT
 * reproduced into this registry.
 *
 * PR #9 recorded this as `sourceQuotable: "unknown"` because a terms page could
 * not be found. **The owner then read the site first-hand (SOURCE_QUOTABILITY.md, 11 September 2026)
 * and there are NO REUSE TERMS AT ALL — only a bare copyright line.** That is
 * not an unread licence, it is a read one, and the answer is `false`:
 *
 *   THE ABSENCE OF A LICENCE IS NOT PERMISSION.
 *   "ALL RIGHTS RESERVED" IS WHAT SILENCE MEANS.
 *
 * ── AND YET THIS FILE IS STILL AUTOMATED ────────────────────────────────────
 *
 * Not because anything about the licence improved, but because the check
 * changed. NMBI serves 200 to a machine, so its page can be FINGERPRINTED —
 * hashed, with only the digest stored — and a machine can still tell us the day
 * the page moves. **We do not need their words to detect that their words
 * changed.** The facts below stay in our own words; the freshness stops being a
 * calendar chore. See `src/facts/fingerprint.mjs`.
 */
import { fact } from "../../../src/facts/record.mjs";

const URL = "https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process/English-Language-Requirements";
const MR = "fetched and read 2026-09-10 (PROFESSION_PAGE_CLAIM_INVENTORY.md §1) — machine-readable, HTTP 200.";
const QUOTABLE_BASIS =
  "PROHIBITED BY DEFAULT. Read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026): the site carries a bare \"Copyright © Nursing & Midwifery Board of Ireland\" and NO REUSE TERMS EXIST AT ALL. 🔴 That is not an open question — the absence of a licence is not permission, and all rights reserved is what silence means. This was recorded as \"unknown\" in PR #9 and the owner has ruled it false.";

const common = {
  // 🔴 A3, 12 Sep 2026: declared UNVERIFIED. The value and source stand; nobody has fact-checked it.
  verificationState: "UNVERIFIED",
  scope: "destination",
  locale: { destination: "ireland", profession: "nursing" },
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MR,
  sourceQuotable: false,
  sourceQuotableBasis: QUOTABLE_BASIS,
  licence: "proprietary-no-reuse",
  sourceDocumentClass: "guidance",
  attributionStatement: null,
  queue: "AUTOMATED",
  freshness: { rule: "machine-fingerprint", days: 180 },
  // The page digest taken on 2026-09-10, and the ONLY thing about this page
  // the registry stores. A sha256 is one-way: the wording cannot be recovered
  // from it, it cannot substitute for the source, and it is not a copy — which
  // is why it is lawful to hold where the wording is not. It is normalised text,
  // not raw HTML: raw HTML differed between two consecutive fetches on 6 of 9
  // pages, and normalised text on 0 of 9.
  pageFingerprint: "50384bb0515bd611f8aca71ffb5b9714b8ac79f167e2360a3665ae74e5d1443e",
  pageFingerprintNormalisedLength: 10308,
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Nursing and Midwifery Board of Ireland — English Language Requirements",
    publisher: "Nursing and Midwifery Board of Ireland",
    tier: 1,
    documentRef: null,
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Read from the fetched page. No span stored — see sourceQuotableBasis." },
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
};

export default [
  fact({
    ...common,
    id: "ie-nmbi.oet-minimum-grade.profession=nursing",
    claim: { subject: "ie-nmbi", predicate: "oet-minimum-grade", qualifier: "profession=nursing" },
    value: {
      value: "Listening B, Reading B, Speaking B, and Writing C+.",
      valueType: "grade-set",
      unit: "OET grade",
    },
    evidence: {
      ownWords:
        "NMBI requires grade B in listening, reading and speaking, and grade C+ in writing. It states the numeric band behind each: B covers 350 to 450, and C+ covers 300 to 340.",
    },
  }),

  // 🔴 THE PER-PROFESSION FINDING. Not "OET" — "OET (Nursing)".
  fact({
    ...common,
    id: "ie-nmbi.oet-version-required.profession=nursing",
    claim: { subject: "ie-nmbi", predicate: "oet-version-required", qualifier: "profession=nursing" },
    value: { value: "OET (Nursing)", valueType: "enum", unit: "OET profession version" },
    evidence: {
      ownWords:
        "NMBI names the nursing version of the test specifically: it accepts OET (Nursing) with grade B in three components and C+ in one. Which profession-specific version of OET a regulator accepts is therefore a separate claim for each profession, not one claim shared by all of them.",
    },
  }),

  fact({
    ...common,
    id: "ie-nmbi.recognised-english-speaking-countries",
    claim: { subject: "ie-nmbi", predicate: "recognised-english-speaking-countries", qualifier: null },
    value: {
      value: "Australia, Canada, New Zealand, the United States of America, the United Kingdom",
      valueType: "list",
      unit: "country",
    },
    evidence: {
      ownWords:
        "NMBI recognises five countries for this purpose: Australia, Canada, New Zealand, the United States of America and the United Kingdom. India is not among them. The list is far shorter than the eighteen countries UKVI lists at EL 4.1 — the two regulators answer the same question differently, so a page must state whose answer it is giving.",
    },
  }),
];
