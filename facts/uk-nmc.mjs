/**
 * UK — NURSING AND MIDWIFERY COUNCIL. Destination regulator, nursing.
 *
 * These four are the tier-1 facts the `nursing/from-india` acceptance test was
 * built on (`acceptance/nursing-from-india/facts.json`). They are promoted here
 * unchanged in substance and re-shaped into full records: what that file called
 * one `verifiedDate` is split into the three dates of `FACT_CACHE_DESIGN.md` §3,
 * and none of the three is `factCheckedOn`.
 *
 * ── 🔴 THE SOURCE THAT PROVED QUOTABILITY IS NOT A PROPERTY OF A DOMAIN ─────
 *
 * ONE DOMAIN, TWO ANSWERS. Clause 6.3 permits reproducing "rules, standards and
 * guidance" in part or in full. Clause 6.2 — the surrounding default for
 * everything else — permits local storage "(but not on any server or other
 * storage device connected to the network)". **This registry is a git
 * repository deployed to Vercel, which is precisely a networked server.**
 *
 * So the identical fact is quotable taken from NMC guidance and NOT quotable
 * taken from an NMC news item, and `sourceDocumentClass` is what decides it.
 * A per-domain boolean could not express this, and the version of this registry
 * that shipped in PR #9 could not either.
 *
 * ── 🔴 AND HERE FRESHNESS IS A LICENCE CONDITION, NOT HYGIENE ───────────────
 *
 * Clause 6.3's FIRST condition is "ensure that you are using the most
 * up-to-date version of any source document". A lapsed record here is not a
 * stale fact — IT IS THEIR CONTENT REPRODUCED OUTSIDE THE TERMS THAT ALLOWED
 * IT. So these four may only be watched by the quote match, which can
 * DEMONSTRATE currency; a fingerprint cannot, and F21 rejects the attempt.
 * When the window lapses the quote is WITHDRAWN by `quoteUsableNow`, not
 * flagged as old.
 *
 * ⚠️ ONE JUDGEMENT IS RECORDED RATHER THAN HIDDEN. Clause 6.3 names "rules,
 * standards and guidance". These are registration-requirement pages, which I
 * have classified AS guidance. That classification is mine and the owner can
 * overturn it — in which case all four records lose their quotes, keep their
 * facts in our own words, and drop to fingerprint watching.
 */
import { fact } from "../src/facts/record.mjs";

const MACHINE_READABLE_BASIS =
  "fetched and read 2026-09-10 (A1_FACT_SUPPLY_FEASIBILITY.md); re-fetched 2026-09-10 by bin/quote-match.mjs";
const QUOTABLE_BASIS =
  'EXPRESS PERMISSION, SCOPED. NMC terms clause 6.3, read first-hand by the owner (_handoffs/SOURCE_QUOTABILITY.md, dated 11 September 2026): "you may reproduce the content of any of our rules, standards and guidance in part or in full", on four conditions — most up-to-date version, unaltered meaning, credit to NMC, and a link. 🔴 Clause 6.2 is the surrounding default and it EXCLUDES storage "on any server or other storage device connected to the network", which is exactly what this registry is. So quotability here is decided by sourceDocumentClass, NOT by the domain. ⚠️ These are registration-GUIDANCE pages; that classification is ours and the owner can overturn it, in which case all four records lose their quotes.';

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
  licence: "NMC-6.3",
  sourceDocumentClass: "guidance",
  // Condition 3 and 4 of clause 6.3. The credit is part of the permission, not
  // a courtesy — a record carrying the quote without it is a breach that looks
  // exactly like compliance.
  attributionStatement: "Nursing and Midwifery Council — https://www.nmc.org.uk/",
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
