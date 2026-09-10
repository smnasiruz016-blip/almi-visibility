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
 * ── WHY THE VERBATIM WORDING IS NOT HERE ────────────────────────────────────
 *
 * The inventory read this page and recorded its wording verbatim. Those quotes
 * stay in that measurement document — our own working notes — and are NOT
 * reproduced into this registry, because no licence permitting it has been
 * located. The terms page was looked for on 2026-09-10 and returned 404.
 * `sourceQuotable: "unknown"`, and the cost is a human re-read.
 */
import { fact } from "../src/facts/record.mjs";

const URL = "https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process/English-Language-Requirements";
const MR = "fetched and read 2026-09-10 (PROFESSION_PAGE_CLAIM_INVENTORY.md §1) — machine-readable, HTTP 200.";
const QUOTABLE_BASIS =
  "NO LICENCE LOCATED. A terms-and-conditions page was sought on 2026-09-10 and the candidate URL returned HTTP 404; no express grant or prohibition was found. Not a refusal — an unread licence. See FACT_CACHE_DESIGN.md §8.4.";

const common = {
  scope: "destination",
  locale: { destination: "ireland", profession: "nursing" },
  sourceMachineReadable: true,
  sourceMachineReadableBasis: MR,
  sourceQuotable: "unknown",
  sourceQuotableBasis: QUOTABLE_BASIS,
  queue: "MANUAL",
  freshness: { rule: "human-re-read", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
  source: {
    url: URL,
    label: "Nursing and Midwifery Board of Ireland — English Language Requirements",
    publisher: "Nursing and Midwifery Board of Ireland",
    tier: 1,
    documentRef: null,
  },
  provenance: { route: "R3", acquiredBy: "model:claude-opus-5", note: "Read from the fetched page. No span stored — see sourceQuotableBasis." },
  checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable" },
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
