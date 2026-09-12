/**
 * UK — HEALTH AND CARE PROFESSIONS COUNCIL. Destination regulator for speech
 * and language therapy (and for podiatry, dietetics, occupational therapy,
 * physiotherapy and radiography — but NOT nursing, which is the NMC's).
 *
 * ══ 🔴 WHY THIS FILE EXISTS: THE HARDEST PROFESSION, NOT THE EASIEST ═══════
 *
 * `/nursing` passed Gate A including rollout. But nursing is the best case in
 * the whole set and it was measured, not assumed:
 *
 *   nursing            469 recognising organisations · 6 destination regulators,
 *                      all 6 publishing an OET grade
 *   speech pathology    46 recognising organisations · 4 destination regulators,
 *                      only 2 publishing a grade, and NEW ZEALAND HAS NONE
 *
 * Building eleven more pages after nursing would have been running the
 * experiment that was going to pass. So the next chain runs on the weakest
 * profession in the set. See PROFESSION_STRENGTH_CENSUS.md.
 *
 * ══ AND THE FACT THAT MAKES THE PAGE WORTH HAVING ═════════════════════════
 *
 * 🔴 HCPC SETS A HIGHER BAR FOR SPEECH AND LANGUAGE THERAPISTS THAN FOR EVERY
 * OTHER PROFESSION IT REGISTERS — OET 1800 against 1400, IELTS 8.0 against 7.0.
 * A speech therapist who reads a generic "OET requirements" page and prepares to
 * 1400 will fail by 400 marks and not know why. That is precisely the thing a
 * profession page exists to say, and it is invisible on a page about "OET".
 *
 * ══ LICENCE ══════════════════════════════════════════════════════════════
 *
 * ⚠️ NOT READ. hcpc-uk.org's terms have not been opened by anybody, and the page
 * itself carries no copyright notice at all (checked 2026-09-10). Under the
 * standing rule an unread licence is NOT a permissive one, so every fact here is
 * in OUR OWN WORDS with a URL and a date, and the page is watched by fingerprint.
 * Reading those terms is cheap and would move all of this to quote-matching.
 */
import { fact } from "../../../src/facts/record.mjs";

const URL =
  "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/";

const common = {
  // 🔴 A3, 12 Sep 2026: declared UNVERIFIED. The value and source stand; nobody has fact-checked it.
  verificationState: "UNVERIFIED",
  scope: "destination",
  locale: { destination: "uk", profession: "speech-pathology" },
  sourceMachineReadable: true,
  sourceMachineReadableBasis: "fetched 2026-09-10, HTTP 200, same host, 8,472 characters of normalised text",
  sourceQuotable: "unknown",
  sourceQuotableBasis:
    "🔴 UNKNOWN — NOT READ. No terms page has been opened for hcpc-uk.org, and this page carries no copyright notice of its own. An unread licence is not a permissive one, so nothing of theirs is stored.",
  licence: "unknown-not-read",
  sourceDocumentClass: "guidance",
  attributionStatement: null,
  queue: "AUTOMATED",
  freshness: { rule: "machine-fingerprint", days: 180 },
  pageFingerprint: "de74bee06687d543fa082c823407eab5a6f2cfc265fd77bc6f1b6316d1d26c62",
  pageFingerprintNormalisedLength: 8472,
  source: {
    url: URL,
    label: "HCPC — Certificate of English language proficiency",
    publisher: "Health and Care Professions Council",
    tier: 1,
    documentRef: "page states its own last update as 13/06/2025",
  },
  provenance: {
    route: "R3",
    acquiredBy: "model:claude-opus-5",
    note: "Read from the fetched page and restated in our own words. No span stored — the licence has not been read.",
  },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  checks: {
    linkCheckedOn: "2026-09-10",
    linkCheckOutcome: "pass",
    quoteMatchedOn: null,
    quoteMatchOutcome: "not-applicable",
    fingerprintCheckedOn: "2026-09-10",
    fingerprintOutcome: "pass",
  },
};

export default [
  // 🔴 THE CLAIM THE WHOLE PAGE IS FOR.
  fact({
    ...common,
    id: "uk-hcpc.oet-minimum-score.profession=speech-pathology",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "OET table: Speech and Language Therapists, 1800 with no elements below 400.",
    },
    claim: { subject: "uk-hcpc", predicate: "oet-minimum-score", qualifier: "profession=speech-pathology" },
    value: { value: 1800, valueType: "count", unit: "OET total scale score (sum of four sub-tests)" },
    evidence: {
      ownWords:
        "A speech and language therapist registering with the HCPC must reach a total OET score of 1800, with no individual sub-test below 400. The test taken must be the Speech and Language version.",
    },
  }),

  // 🔴 AND THE ONE THAT MAKES IT MEAN SOMETHING. A number without its comparison
  // is a number a reader cannot act on.
  fact({
    ...common,
    id: "uk-hcpc.oet-score-differs-by-profession",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "Table confirms 1800/400 for SLT and 1400/300 for the other five OET professions HCPC lists.",
    },
    claim: { subject: "uk-hcpc", predicate: "oet-score-differs-by-profession", qualifier: null },
    scope: "destination",
    locale: { destination: "uk" },
    value: {
      value:
        "Speech and language therapists must reach 1800 with no element below 400. Every other profession HCPC registers via OET needs 1400 with no element below 300.",
      valueType: "rule",
      unit: null,
    },
    evidence: {
      ownWords:
        "The HCPC does not apply one OET standard across the professions it registers. Chiropodists and podiatrists, dietitians, occupational therapists, physiotherapists and radiographers each need a total of 1400 with no element below 300. Speech and language therapists need 1800 with no element below 400 — four hundred marks higher in total and a hundred higher in every single sub-test. A speech therapist who reads a general page about OET and prepares to the common standard will miss the requirement without ever being told a different one applied.",
    },
  }),

  fact({
    ...common,
    id: "uk-hcpc.ielts-minimum.profession=speech-pathology",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "Page: 8.0 with no element below 7.5 for speech and language therapists.",
    },
    claim: { subject: "uk-hcpc", predicate: "ielts-minimum", qualifier: "profession=speech-pathology" },
    value: { value: "8.0 overall with no element below 7.5", valueType: "grade-set", unit: "IELTS band" },
    evidence: {
      ownWords:
        "The same split runs through the alternative test. On IELTS the HCPC asks all other professions for 7.0 with no element below 6.5, and speech and language therapists for 8.0 with no element below 7.5. The higher bar for this profession is not an artefact of one test; it is the standard itself.",
    },
  }),

  fact({
    ...common,
    id: "uk-hcpc.accepted-english-tests",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "Page accepts IELTS, TOEFL iBT and OET.",
    },
    claim: { subject: "uk-hcpc", predicate: "accepted-english-tests", qualifier: null },
    scope: "destination",
    locale: { destination: "uk" },
    value: { value: "IELTS, TOEFL iBT, and OET", valueType: "list", unit: "test" },
    evidence: {
      ownWords:
        "The HCPC accepts certificates from three providers: the International English Language Testing System, the Test of English as a Foreign Language internet-based test, and the Occupational English Test. For OET it accepts only the profession-specific version matching the profession being registered.",
    },
  }),

  fact({
    ...common,
    id: "uk-hcpc.certificate-maximum-age",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "Page: 'no more than two years old when we receive your application'.",
    },
    claim: { subject: "uk-hcpc", predicate: "certificate-maximum-age", qualifier: null },
    scope: "destination",
    locale: { destination: "uk" },
    value: { value: 2, valueType: "duration", unit: "year" },
    evidence: {
      ownWords:
        "The certificate must be no more than two years old when the HCPC receives the application — not when the applicant sits the test, and not when they start preparing the paperwork. The clock is measured against the day the regulator receives it.",
    },
  }),

  fact({
    ...common,
    id: "uk-hcpc.test-venue-requirement",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "Page: 'taken at an official test centre and not at home'.",
    },
    claim: { subject: "uk-hcpc", predicate: "test-venue-requirement", qualifier: null },
    scope: "destination",
    locale: { destination: "uk" },
    value: { value: "The test must be taken at an official test centre, not at home.", valueType: "rule", unit: null },
    evidence: {
      ownWords:
        "The HCPC requires the test to have been taken at an official test centre rather than at home, and says so for IELTS and for OET alike. Immigration New Zealand imposes the same condition for its own purposes, which is worth noticing: two regulators on opposite sides of the world independently rule out the at-home version of the same test.",
    },
  }),

  // ⚠️ A NAMING MISMATCH BETWEEN THE TEST AND ITS REGULATOR, AND IT IS THE KIND
  // OF THING THAT COSTS SOMEBODY A BOOKING.
  fact({
    ...common,
    id: "uk-hcpc.oet-profession-version.profession=speech-pathology",
    verification: {
      state: "VERIFIED",
      verdict: "VERIFIED",
      checkedOn: "2026-09-12",
      checkedBy: "human:beta-g (Cowork)",
      sourceUrl: "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
      sourceTier: "OFFICIAL",
      recheckAfter: "2027-03-11",
      recheckWindowDays: 180,
      note: "HCPC's own table names the OET test 'Speech and Language'. NOTE: OET's own catalogue calls this profession version 'Speech Pathology'. Our fact quotes HCPC correctly; the naming difference is HCPC's, not ours. Recorded as a note, not a defect.",
    },
    claim: { subject: "uk-hcpc", predicate: "oet-profession-version", qualifier: "profession=speech-pathology" },
    value: { value: "Speech and Language", valueType: "enum", unit: "OET profession version, as HCPC names it" },
    evidence: {
      ownWords:
        "HCPC's table names the required test 'Speech and Language'. OET's own list of profession versions calls it 'Speech Pathology'. They are the same test under two names, and an applicant searching OET's booking pages for 'Speech and Language' will not find it listed that way.",
    },
  }),
];
