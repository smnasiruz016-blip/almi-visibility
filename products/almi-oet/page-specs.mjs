/**
 * THE `/nursing` PAGE SPEC — CLAIM IDs, AND NOT ONE FACT.
 *
 * ══ §5A, VERBATIM, AND IT IS THE WHOLE CONSTRAINT ═════════════════════════
 *
 *   "Facts must be reusable by reference. Page generation must not create
 *    independent untraceable copies of the same factual claim."
 *
 * 🔴 SO THIS FILE CONTAINS NO FACTS. It contains claim ids and section
 * headings. Every factual sentence on the rendered page is fetched from the
 * registry at build time, and `test/nursing-page.test.mjs` asserts that no
 * value or ownWords text from any record appears in this file.
 *
 * ── WHY THAT MATTERS MORE THAN IT SOUNDS ────────────────────────────────────
 *
 * The alternative — a template with the facts written into it — is what the
 * network already has 240,328 times, and it is why the estate cannot be
 * defended. When the NMC changes a grade, a page that COPIED the grade is a page
 * nobody can find. A page that REFERENCES `uk-nmc.oet-minimum-grade` is fixed by
 * fixing one record, and the nightly quote match already knows the day it moved.
 *
 * ⚠️ THE FRAMING TEXT BELOW IS DELIBERATELY NOT FACTUAL. Headings and
 * connective sentences carry no claim about the world, so they need no source.
 * The moment a line here would need a citation, IT BELONGS IN THE REGISTRY
 * INSTEAD — and that rule is enforced, not merely stated: framing text is
 * counted separately in the render report so it can never quietly grow into an
 * unsourced fact bank.
 */


/**
 * The page, as a list of sections. `claims` are ids into the registry.
 *
 * The order follows `PROFESSION_PAGE_CLAIM_INVENTORY.md` §3: what the test IS
 * (Block A), then the destination regulators (Block B). Nothing was added for
 * shape; a section exists only where the registry can fill it.
 */
export const NURSING_PAGE = Object.freeze({
  slug: "nursing",
  variant: "nursing",
  title: "OET for nurses: what each regulator actually requires",
  // 🔴 WHY_THIS_URL_DESERVES_TO_EXIST — authored by beta-g on the owner's instruction (_handoffs/
  // AlmiVisibility_WHY_THIS_URL_RATIONALES.md), word for word, cut at its own sentence "This page exists to…"
  // (owner's answer, 14 September 2026). Framing, not fact: it names the reader's decision and cites nothing.
  whyThisUrlDeservesToExist: Object.freeze({
    humanNeed:
      "A nurse deciding where to register is not looking up one requirement. She is choosing between four authorities across three destination countries, and one of them can end the journey before any exam matters: the United Kingdom's recruitment code decides whether she may be recruited from her country at all. Each authority publishes only its own rule, so no source she can reach answers the two questions she actually has — which of these applies to me, and am I permitted to be recruited in the first place.",
    distinctValue:
      "This page exists to put the recruitment gate ahead of the exam requirements, in the order the decision is really made, and to set the regulators side by side so the choice between them can be seen at once.",
  }),
  // Framing only. No claim, therefore no citation, therefore nothing that can
  // go stale without anybody noticing.
  intro:
    "This page states what the test involves for nurses, and what each regulator that accepts it asks for. Every statement below is followed by the source it came from and the date that source was last checked. Where a source does not permit its wording to be reproduced, the requirement is stated in our own words and the link is given so it can be read at first hand.",
  sections: [
    {
      heading: "What the OET Nursing test is",
      framing:
        "Nurses do not sit a general English exam. Two of the four sub-tests are built around the profession itself, and that is what regulators are referring to when they name a version of the test.",
      claims: [
        "oet.subtests-and-which-are-profession-specific",
        "oet.writing-task-type.profession=nursing",
        "oet.speaking-roleplay-setting.profession=nursing",
        "oet.grade-bands-0-500",
      ],
    },
    {
      heading: "United Kingdom — the Nursing and Midwifery Council",
      framing:
        "The NMC sets both the scores and the conditions attached to them. The conditions matter as much as the scores, because most of the ways an application fails are conditions rather than marks.",
      claims: [
        "uk-nmc.oet-minimum-grade.profession=nursing",
        "uk-nmc.oet-profession-version.profession=nursing",
        "uk-nmc.accepted-oet-delivery-modes.profession=nursing",
        "uk-nmc.oet-combining-sittings.profession=nursing",
        "uk-nmc.oet-combining-sittings-floor.profession=nursing",
        "uk-nmc.english-evidence-routes.profession=nursing",
        "uk-nmc.qualified-in-english-evidence.profession=nursing",
      ],
    },
    {
      heading: "Ireland — the Nursing and Midwifery Board of Ireland",
      framing:
        "Ireland asks for the same test and answers two of the same questions differently. Comparing the two regulators side by side is the point of stating both.",
      claims: [
        "ie-nmbi.oet-minimum-grade.profession=nursing",
        "ie-nmbi.oet-version-required.profession=nursing",
        "ie-nmbi.recognised-english-speaking-countries",
      ],
    },
    {
      heading: "New Zealand — Immigration New Zealand",
      framing:
        "An immigration authority can impose a condition on the test that the professional regulator does not, and it applies to how the test was taken rather than to the score.",
      claims: ["nz-immigration-nz.oet-must-be-taken-in-person"],
    },
    {
      heading: "Before you book: the United Kingdom's recruitment rules",
      framing:
        "Two rules decide whether a nurse can be recruited at all, and neither is set by a nursing regulator. Both are easy to miss because they sit with immigration and with health policy rather than with registration.",
      claims: [
        "uk-ukvi.majority-english-speaking-countries",
        "uk-code-of-practice.red-list-rule",
        "uk-code-of-practice.amber-list-rule",
        "uk-code-of-practice.direct-application-exception",
      ],
    },
  ],
});


/**
 * 🔴 THE HARDEST PROFESSION IN THE SET — chosen by measurement, not by taste.
 *
 * PROFESSION_STRENGTH_CENSUS.md counted the recognising organisations and the
 * destination regulators for all twelve. Speech pathology came out weakest:
 *
 *   nursing            469 organisations · 6 destination regulators, 6 with a grade
 *   speech pathology    46 organisations · 4 destination regulators, 2 with a grade,
 *                       and NEW ZEALAND HAS NO REGULATOR AT ALL
 *
 * /nursing passed Gate A including rollout. Building eleven more after it would
 * have been running the experiment that was going to pass.
 *
 * ⚠️ THIS PAGE IS DELIBERATELY THINNER, AND NOT BY CHOICE. Ireland, Australia
 * and New Zealand contribute NOTHING here — see src/facts/gaps.mjs. Where the
 * /nursing page has four destinations, this has one. That is the profession, not
 * the method, and the page is allowed to look like it.
 */
export const SPEECH_PATHOLOGY_PAGE = Object.freeze({
  slug: "speech-pathology",
  variant: "speech-pathology",
  title: "OET for speech and language therapists: the bar is higher than you think",
  // 🔴 WHY_THIS_URL_DESERVES_TO_EXIST — as for /nursing: word for word from the brief, cut at "This page exists to…".
  whyThisUrlDeservesToExist: Object.freeze({
    humanNeed:
      "A speech and language therapist has to clear a bar that no other profession the HCPC registers has to clear — a higher total and a higher floor on every sub-test — and must sit a profession-specific version of the test rather than the general one. The HCPC's own page states the requirement but never states the comparison, so a reader who was told the number by a colleague in another HCPC profession has no way to discover that the number does not apply to them.",
    distinctValue:
      "This page exists to state the difference itself, and what it changes about which test to book, how long a certificate stays valid, and where it may be taken.",
  }),
  intro:
    "This page states what the test involves and what the regulator that accepts it asks for. Every statement below is followed by the source it came from and the date that source was last checked. Where a source does not permit its wording to be reproduced, or its terms have not been read, the requirement is stated in our own words and the link is given so it can be read at first hand.",
  sections: [
    {
      heading: "What the OET test is",
      framing:
        "Two of the four sub-tests are built around the profession itself, which is why a regulator can ask for a named version of the test rather than for OET in general.",
      claims: ["oet.subtests-and-which-are-profession-specific", "oet.grade-bands-0-500"],
    },
    {
      heading: "United Kingdom — the Health and Care Professions Council",
      framing:
        "The HCPC registers speech and language therapists, and it does not apply one English standard across the professions on its register. The difference is large and it is easy to miss.",
      claims: [
        "uk-hcpc.oet-minimum-score.profession=speech-pathology",
        "uk-hcpc.oet-score-differs-by-profession",
        "uk-hcpc.ielts-minimum.profession=speech-pathology",
        "uk-hcpc.oet-profession-version.profession=speech-pathology",
        "uk-hcpc.accepted-english-tests",
        "uk-hcpc.certificate-maximum-age",
        "uk-hcpc.test-venue-requirement",
      ],
    },
  ],
});

