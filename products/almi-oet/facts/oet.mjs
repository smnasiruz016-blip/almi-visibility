/**
 * OET — AND THIS FILE EXISTS TO CARRY ONE RECORD AND ONE PROOF.
 *
 * ══ THE CASE THAT SPLIT `sourceMachineReadable` FROM `sourceQuotable` ═══════
 *
 * Every barrier A1 found was technical: a 403, a scanned PDF, an HTTP 500, a
 * broken TLS chain. Each of them stops a machine from READING a page, and the
 * design's single field `sourceMachineReadable` described all four correctly.
 *
 * OET IS NONE OF THEM. IT SERVES 200. THERE IS NO 403.
 *
 * (And an entry in our own records claiming oet.com 403s an automated fetch was
 * re-probed on 2026-09-10 and is WRONG — it returns 200. The technical claim
 * was out of date. The legal claim below is unaffected and still binding.)
 *
 * The barrier is the licence. OET's Intellectual Property policy prohibits
 * redistribution or reproduction of its Content and prohibits storing that
 * Content in any other form of electronic retrieval system.
 *
 *   🔴 A FACT CACHE HOLDING `quotedSpan` IS AN ELECTRONIC RETRIEVAL SYSTEM
 *      HOLDING A REPRODUCTION OF THEIR WORDING.
 *
 * So: a source a machine can read perfectly and may not quote. One field could
 * not express that, and the two independent fields exist because of this file.
 *
 * ══ AND THE CONSEQUENCE IS NOT COSMETIC ════════════════════════════════════
 *
 * THE NIGHTLY QUOTE MATCH — the mechanism the entire freshness model rests on —
 * CANNOT RUN AGAINST THE SINGLE MOST IMPORTANT SOURCE IN THE PRODUCT. Not
 * because it is blocked, but because there is lawfully nothing to match
 * against. Freshness here is a person re-reading the page, at exactly the cost
 * of a 403.
 *
 * ⚠️ `quoteMatchOutcome` IS `"not-applicable"`, NOT `"could-not-check"`, AND THE
 * DIFFERENCE IS THE POINT. A permanent "could not check" would report a lawful
 * state as a broken source — and six months later somebody would "fix" it.
 *
 * ══ NO WORKAROUND IS PROPOSED ══════════════════════════════════════════════
 *
 * The answer to a licence is the same as the answer to a 403: RECORD THE COST,
 * DO NOT ROUTE AROUND THE REFUSAL. No paraphrase-that-is-really-a-quote, no
 * storing the span "just for matching", no third-party mirror.
 *
 * ══ WHAT IS DELIBERATELY ABSENT ════════════════════════════════════════════
 *
 * 🔴 The four Block A claims the profession-page inventory says `/nursing`
 * needs — the nursing writing task type, the nursing speaking role-play
 * setting, which subtests are profession-specific, and the 0–500 grade bands —
 * ARE NOT HERE. They have not been acquired. Writing plausible values for them
 * from general knowledge would be the exact failure this registry exists to
 * prevent, and a registry that quietly invents its most important facts is
 * worse than an empty one. They are reported as a NAMED GAP by
 * `bin/facts.mjs census`, so their absence is counted rather than forgotten.
 */
import { fact } from "../../../src/facts/record.mjs";

/**
 * Shared by the four Block A records. Every one of them is watched by a
 * FINGERPRINT rather than a quote match: the pages fetch perfectly, and there is
 * lawfully nothing to store that a matcher could compare against.
 */
const oetCommon = {
  sourceMachineReadable: true,
  sourceMachineReadableBasis: "fetched 2026-09-10, HTTP 200, same host, substantive body",
  sourceQuotable: false,
  sourceQuotableBasis:
    "PROHIBITED. OET Intellectual Property policy, read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md): no transmitting or reproducing any part of the Content, no distribution or commercial exploitation, no storage in another electronic retrieval system — and every carve-out is for personal NON-COMMERCIAL use, which AlmiWorld is not.",
  licence: "OET-CBLA-IP",
  sourceDocumentClass: "general",
  attributionStatement: null,
  queue: "AUTOMATED",
  freshness: { rule: "machine-fingerprint", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  provenance: {
    route: "R3",
    acquiredBy: "model:claude-opus-5",
    note: "Read from the fetched page and restated in our own words. No span stored — storing one would be the act the policy forbids.",
  },
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
  fact({
    verificationState: "UNVERIFIED", // 🔴 A3, 12 Sep 2026 — declared, not defaulted
    id: "oet.content-licence-permits-stored-quotation",
    claim: { subject: "oet", predicate: "content-licence-permits-stored-quotation", qualifier: null },
    scope: "shared",
    value: { value: false, valueType: "boolean-with-consequence", unit: null },
    source: {
      url: "https://oet.com/en-us/Intellectual-Property-policy",
      label: "OET — Intellectual Property policy",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: "OET Intellectual Property policy",
    },
    sourceMachineReadable: true,
    sourceMachineReadableBasis:
      "HTTP 200 on 2026-09-10 for oet.com/, /en-us/about, /en-us/Intellectual-Property-policy and /robots.txt. It is NOT a 403 — an earlier record of ours saying otherwise was wrong and is corrected.",
    sourceQuotable: false,
    licence: "OET-CBLA-IP",
    sourceDocumentClass: "general",
    attributionStatement: null,
    sourceQuotableBasis:
      'EXPRESS PROHIBITION, ON THREE INDEPENDENT GROUNDS. Read first-hand by the owner at oet.com/Intellectual-Property-policy (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026). Without CBLA prior express written permission it is prohibited to (1) "transmit or reproduce any part of the Content", (2) "distribute or commercially exploit the Content", and (3) store the Content "in any other website or other form of electronic retrieval system". 🔴 AND THE CARVE-OUTS DO NOT REACH US AT ALL: every permitted use is expressly for "your own personal and NON-COMMERCIAL use only", and AlmiWorld is a commercial product. PR #9 cited only ground (3); grounds (1) and (2) bite harder, and the non-commercial limit puts us outside the permission before ground (3) is even reached.',
    evidence: {
      ownWords:
        "OET's own intellectual property terms do not permit its wording to be reproduced or stored in a retrieval system. Facts sourced from OET are therefore recorded in our own words with a URL and a date, no verbatim extract is kept, and their freshness is a person re-reading the page rather than an automated match.",
    },
    queue: "AUTOMATED",
    freshness: { rule: "machine-fingerprint", days: 180 },
    // The page digest taken on 2026-09-10, and the ONLY thing about this page
    // the registry stores. A sha256 is one-way: the wording cannot be recovered
    // from it, it cannot substitute for the source, and it is not a copy — which
    // is why it is lawful to hold where the wording is not. It is normalised text,
    // not raw HTML: raw HTML differed between two consecutive fetches on 6 of 9
    // pages, and normalised text on 0 of 9.
    pageFingerprint: "9dfd7546793cf1acc911eae52ca393990fa419396ecb3c3532dab27118a0f4a7",
    pageFingerprintNormalisedLength: 3535,
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: {
      route: "R3",
      acquiredBy: "model:claude-opus-5",
      note: "The licence itself, read from the policy page. No span stored — storing one would be the very act the policy forbids.",
    },
  }),

  /**
   * ── BLOCK A · WHAT OET NURSING IS ───────────────────────────────────────
   *
   * `PROFESSION_PAGE_CLAIM_INVENTORY.md` §3 names exactly four claims the
   * `/nursing` page needs from OET, and lists all four as declared gaps in
   * `src/facts/gaps.mjs`. These are those four, and nothing else — no claim was
   * added because it "might be useful later".
   *
   * 🔴 EVERY ONE IS IN OUR OWN WORDS. OET's IP policy prohibits transmitting or
   * reproducing any part of the Content, prohibits commercial exploitation, and
   * permits only personal non-commercial use — and AlmiWorld is commercial. So
   * these carry a URL, a date and OUR SENTENCE, never theirs.
   *
   *   A FACT IS NOT COPYRIGHTABLE. ITS EXPRESSION IS.
   *
   * Read from the fetched pages on 2026-09-10. Watched by fingerprint, because
   * there is lawfully nothing to quote-match.
   */
  fact({
    verificationState: "UNVERIFIED", // 🔴 A3, 12 Sep 2026 — declared, not defaulted
    ...oetCommon,
    id: "oet.writing-task-type.profession=nursing",
    // Digest taken 2026-09-10 — the only thing about this page the registry
    // stores, and lawful precisely because it is not a copy.
    pageFingerprint: "b73777e16f94afea311a32b54b5a5173d23f7d174b3248cbcab0e7020e9d5fbf",
    pageFingerprintNormalisedLength: 5358,
    claim: { subject: "oet", predicate: "writing-task-type", qualifier: "profession=nursing" },
    scope: "test",
    locale: { profession: "nursing" },
    value: {
      value:
        "A 45-minute task in which the candidate writes a formal letter about a matter specific to their own profession, working from a set of case notes. For nursing this is typically a referral, a letter of advice, or a transfer or discharge letter. It is marked against six assessment criteria.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: "https://oet.com/en-us/learn/writing",
      label: "OET — the Writing sub-test",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: "also oet.com/en-us/test/oet-test, OET Test structure",
    },
    evidence: {
      ownWords:
        "The Writing sub-test lasts 45 minutes. The candidate writes a formal letter on a matter specific to their own profession, using case notes supplied with the task. OET describes the document types as a referral, a letter of advice, or a letter of transfer or discharge — the paperwork a nurse actually produces in the role. Six assessment criteria are applied: purpose, content, conciseness and clarity, genre and style, organisation and layout, and language. The scores from those criteria are combined and converted to the 0-500 scale.",
    },
  }),

  fact({
    verificationState: "UNVERIFIED", // 🔴 A3, 12 Sep 2026 — declared, not defaulted
    ...oetCommon,
    id: "oet.speaking-roleplay-setting.profession=nursing",
    // Digest taken 2026-09-10 — the only thing about this page the registry
    // stores, and lawful precisely because it is not a copy.
    pageFingerprint: "4a419b241cdbc86a6ebd1fa2ae8b6d847fdb0c58d5db45ec5a1457dd6bc680c7",
    pageFingerprintNormalisedLength: 5001,
    claim: { subject: "oet", predicate: "speaking-roleplay-setting", qualifier: "profession=nursing" },
    scope: "test",
    locale: { profession: "nursing" },
    value: {
      value:
        "Approximately 20 minutes, built from two role-plays of about five minutes each, set in scenarios specific to the candidate's own profession. Assessed on linguistic criteria and on clinical communication criteria.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: "https://oet.com/en-us/learn/speaking",
      label: "OET — the Speaking sub-test",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: "also oet.com/en-us/test/results-and-scoring, Speaking assessment",
    },
    evidence: {
      ownWords:
        "The Speaking sub-test runs about 20 minutes and is made up of two role-plays of roughly five minutes each. The scenarios are specific to the candidate's profession, so a nurse role-plays nursing situations rather than generic ones. Two families of criteria are applied: four linguistic criteria marked out of six, and five clinical communication categories marked out of three, each carrying between three and five sub-indicators. The criterion scores are combined and converted to the 0-500 scale.",
    },
  }),

  fact({
    verificationState: "UNVERIFIED", // 🔴 A3, 12 Sep 2026 — declared, not defaulted
    ...oetCommon,
    id: "oet.subtests-and-which-are-profession-specific",
    // Digest taken 2026-09-10 — the only thing about this page the registry
    // stores, and lawful precisely because it is not a copy.
    pageFingerprint: "78a166107e1015399dfa582dfaffd1fa8cf8cb2c57a6f76653ca6dfd2e48ca96",
    pageFingerprintNormalisedLength: 7933,
    claim: { subject: "oet", predicate: "subtests-and-which-are-profession-specific", qualifier: null },
    scope: "test",
    value: {
      value:
        "Four sub-tests: Listening, Reading, Writing and Speaking. Listening and Reading are common to candidates of every profession; Writing and Speaking are specific to the candidate's own profession.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: "https://oet.com/en-us/test/oet-test",
      label: "OET — the OET Test, test structure",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: null,
    },
    evidence: {
      ownWords:
        "OET has four sub-tests. Listening runs about 40 minutes and OET describes its topics as being of generic healthcare interest and accessible to candidates across all professions. Reading likewise draws on texts spanning a variety of healthcare professions and subjects. Writing and Speaking are the two that change with the candidate's profession: the writing task and the speaking role-plays are both set for the profession the candidate registers under. This is the reason a regulator can ask for a named profession version of the test rather than simply for OET. OET is offered for twelve healthcare professions in total.",
    },
  }),

  fact({
    verificationState: "UNVERIFIED", // 🔴 A3, 12 Sep 2026 — declared, not defaulted
    ...oetCommon,
    id: "oet.grade-bands-0-500",
    // Digest taken 2026-09-10 — the only thing about this page the registry
    // stores, and lawful precisely because it is not a copy.
    pageFingerprint: "702862440f210ffb683d386437ee3d5fd94619e1cc084ebaa2e6bc26a4a445c1",
    pageFingerprintNormalisedLength: 4628,
    claim: { subject: "oet", predicate: "grade-bands-0-500", qualifier: null },
    scope: "test",
    value: {
      value:
        "Each sub-test is reported separately on a 0-500 scale in ten-point increments, and each numerical score maps to its own letter grade from A (highest) to E (lowest).",
      valueType: "rule",
      unit: "OET scale score",
    },
    source: {
      url: "https://oet.com/en-us/test/results-and-scoring",
      label: "OET — Results and scoring",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: null,
    },
    evidence: {
      ownWords:
        "A candidate receives a Statement of Results carrying a separate score for each of the four sub-tests, on a scale running from 0 to 500 in ten-point steps such as 350, 360 and 370. Each numerical score is then mapped to its own letter grade, from A at the top to E at the bottom. Because the mapping is per sub-test, a candidate holds four grades rather than one overall grade, which is what makes a regulator able to set a different minimum for writing than for the other three. OET states that in Reading, a candidate awarded Grade B — a scale score of 350 — typically achieves at least 30 marks out of the 42 questions.",
    },
  }),
];
