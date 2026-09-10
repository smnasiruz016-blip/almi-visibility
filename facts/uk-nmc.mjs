/**
 * UK — NURSING AND MIDWIFERY COUNCIL. Destination regulator, nursing.
 *
 * These four are the tier-1 facts the `nursing/from-india` acceptance test was
 * built on (`acceptance/nursing-from-india/facts.json`). They are promoted here
 * unchanged in substance and re-shaped into full records: what that file called
 * one `verifiedDate` is split into the three dates of `FACT_CACHE_DESIGN.md` §3,
 * and none of the three is `factCheckedOn`.
 *
 * ── WHY THIS WHOLE FILE IS IN THE AUTOMATED QUEUE ───────────────────────────
 *
 * The NMC is the rare source that permits both halves. It serves 200 to a
 * machine, and — unlike a bare "all rights reserved" — its terms EXPRESSLY
 * permit reproducing extracts of its standards and guidance. So the nightly
 * quote match is both possible and lawful here, and these facts cost a cron job
 * rather than a person.
 *
 * ⚠️ ONE JUDGEMENT IS RECORDED RATHER THAN HIDDEN. The NMC's express permission
 * names "rules, standards and guidance". These are registration-requirement
 * pages, which I have classified AS guidance. That classification is mine, it
 * is the only thing standing between this file and the manual queue, and the
 * owner can overturn it — in which case all four records move, and the manual
 * queue grows by four.
 */
import { fact } from "../src/facts/record.mjs";

const MACHINE_READABLE_BASIS =
  "fetched and read 2026-09-10 (A1_FACT_SUPPLY_FEASIBILITY.md); re-fetched 2026-09-10 by bin/quote-match.mjs";
const QUOTABLE_BASIS =
  'EXPRESS PERMISSION. nmc.org.uk terms, read 2026-09-10: users may reproduce the content of its rules, standards and guidance "in part or in full" given current versions, unaltered meaning and credit — and "You do not need our permission to quote from our rules, standards or guidance". ⚠️ These are registration-guidance pages; that classification is ours.';

const OET_URL =
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/oet/";
const EL_URL = "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/";
const QIE_URL = "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/qualified-in-english/";

const common = {
  scope: "destination",
  locale: { destination: "uk", profession: "nursing" },
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MACHINE_READABLE_BASIS,
  sourceQuotable: true,
  sourceQuotableBasis: QUOTABLE_BASIS,
  queue: "AUTOMATED",
  freshness: { rule: "machine-quote-match", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  provenance: {
    route: "R3",
    acquiredBy: "model:claude-opus-5",
    note: "Proposed by a model reading the fetched page, then the span was machine-matched. A model may PROPOSE a fact; it may never BE the source.",
  },
};

export default [
  fact({
    ...common,
    id: "uk-nmc.oet-minimum-grade.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "oet-minimum-grade", qualifier: "profession=nursing" },
    value: {
      value: "Reading, listening and speaking: grade B (350 or above). Writing: grade C+ (300 or above).",
      valueType: "grade-set",
      unit: "OET grade",
    },
    source: {
      url: OET_URL,
      label: "Nursing and Midwifery Council — OET",
      publisher: "Nursing and Midwifery Council",
      tier: 1,
      documentRef: null,
    },
    evidence: {
      quotedSpan: "At least grade B (350 or above) for reading, listening, and speaking",
      quoteLocation: "OET requirements section",
    },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    // The page's own last-updated date, which is NOT our extraction date and is
    // not a substitute for one. Kept because a source that has not changed
    // since 2024 is a different freshness risk from one edited last week.
    sourceStatedUpdatedOn: "2024-03-08",
  }),

  fact({
    ...common,
    id: "uk-nmc.oet-combining-sittings.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "oet-combining-sittings", qualifier: "profession=nursing" },
    value: {
      value:
        "Scores may be combined across two OET sittings provided one reading, one listening and one speaking score of at least grade B (350-440) and one writing score of at least grade C+ (300-340) are achieved between them.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: OET_URL,
      label: "Nursing and Midwifery Council — OET",
      publisher: "Nursing and Midwifery Council",
      tier: 1,
      documentRef: null,
    },
    evidence: { quotedSpan: "You can combine scores across two OET test sittings", quoteLocation: "OET requirements section" },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
  }),

  fact({
    ...common,
    id: "uk-nmc.english-evidence-routes.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "english-evidence-routes", qualifier: "profession=nursing" },
    value: {
      value:
        "Three accepted routes: an approved English language test; a pre-registration qualification taught and examined in English; or one year of recent practice in a country where English is the majority-spoken language.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: EL_URL,
      label: "Nursing and Midwifery Council — English language requirements",
      publisher: "Nursing and Midwifery Council",
      tier: 1,
      documentRef: null,
    },
    evidence: {
      quotedSpan:
        "You have one year of recent practice as a nurse, midwife, or nursing associate in a country where English is the majority-spoken language",
      quoteLocation: "the three evidence routes",
    },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
  }),

  fact({
    ...common,
    id: "uk-nmc.qualified-in-english-evidence.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "qualified-in-english-evidence", qualifier: "profession=nursing" },
    value: {
      value:
        "A transcript must show that at least half the applicant's time was spent interacting with patients, service users, their families and other healthcare professionals, and that at least 75% of those interactions were in English.",
      valueType: "rule",
      unit: null,
    },
    source: {
      url: QIE_URL,
      label: "Nursing and Midwifery Council — Qualified in English",
      publisher: "Nursing and Midwifery Council",
      tier: 1,
      documentRef: null,
    },
    evidence: {
      quotedSpan:
        "you spent at least half of your time interacting with patients, service users, their families and other healthcare professionals, and that at least 75% of these interactions were in English.",
      quoteLocation: "transcript evidence requirements",
    },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    // 🔴 ORIGIN_CLAIM_SHAPE.md §2 corrected its own earlier classification using
    // exactly this record: the evidence is PER APPLICANT, so the claim is
    // destination-scoped and identical on all 191 corridor pages. It is not an
    // origin fact and must never be counted as one.
  }),
];
