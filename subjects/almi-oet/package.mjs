/**
 * SUBJECT PACKAGE · almi-oet — subject-owned tooling, relocated OUT of the shared engine (F02, 24 September 2026).
 *
 *   Owner decision (b) RELOCATE: _handoffs/AlmiVisibility_OWNER_DECISION_2026-09-24_F02_RELOCATE_SINGLE_CLIENT_TOOLS.md
 *
 * These tools serve one subject by purpose. They were moved unchanged in behaviour — NOT generalised (rule 6) and NOT
 * deleted (rule 2). Historical evidence that names their old `bin/` paths is immutable history and was not rewritten
 * (rule 5).
 *
 * 🔴 THIS LOCATION GRANTS NO TENANT AUTHORITY (rule 4). Every tool enters through the F02 tenant boundary: it calls
 * `scopedEntryPoint` (src/governance/scoped-entry.mjs) with the resources it reads, BEFORE reading any of them, under an
 * explicitly requested `--tenant`. With no declared tenant, or a resource declared elsewhere, it refuses (exit 3).
 *
 * Run from the engine root:  node subjects/almi-oet/tools/<tool>.mjs --product=almi-oet --tenant=<declared tenant> …
 */
const CONFINED = "confined by confineToRepo: a path outside this repository is REFUSED before anything is written";

/**
 * What a verifier must go and READ, for this subject's facts (moved verbatim from bin/facts-lifecycle.mjs, F02 relocation).
 * My judgement of the KIND of authority — never a guessed URL, and UNKNOWN where I do not know.
 */
export function whatWouldVerify(f) {
  const s = f.claim?.subject ?? "";
  const p = f.claim?.predicate ?? "";
  if (/nmc|nmbi|nmcn|pnmc|hcpc/.test(s)) {
    return `the regulator's own current registration/English-language requirements page for ${s.toUpperCase()}, read on the day`;
  }
  if (s === "oet") return "OET's own official published score/format documentation";
  if (/ukvi|immigration/.test(s)) return "the government department's own current immigration guidance page";
  if (/code-of-practice/.test(s)) return "the published code of practice document itself, at its current revision";
  if (/fee|cost/.test(p)) return "the issuing body's own current fee schedule — fees change without notice";
  return "UNKNOWN";
}

/* The source-integrity control: what beta-g fetched and read on 12 September 2026, and the host that answers 403 by
 * design (moved verbatim from bin/source-integrity.mjs, F02 relocation). */
const READ_BY_BETA_G = new Set([
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/",
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/oet/",
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/qualified-in-english/",
  "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
  "https://www.gov.uk/government/publications/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel-in-england",
  "https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process/English-Language-Requirements",
  "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-english-language",
  "https://nmcn.gov.ng/verify.html",
  "https://pnmc.gov.pk/verification-registration-2/",
  "https://www.immigration.govt.nz/about-us/news-centre/update-on-english-language-testing-for-immigration-applications/",
]);
export const sourceBaselineFor = (url) => {
  if (new URL(url).hostname === "oet.com") return { expected: "HTTP 403" };
  return READ_BY_BETA_G.has(url) ? { expected: "CONTENT" } : null;
};

export const SUBJECT_PACKAGE = Object.freeze({
  subjectId: "almi-oet",
  /** Every file this package owns. The relocation proof requires each to exist here and not under its old shared path. */
  owns: Object.freeze([
    /* RR-295 (owner decision 3): tools/nursing-chain.mjs, tools/profession-chain.mjs and tools/placement-measure.mjs rendered pages with the
     * removed old template (src/page/render.mjs) — removed with it; git history keeps them. A page is built only by the one builder. */
    Object.freeze({ file: "tools/acceptance-test.mjs", relocatedFrom: "bin/acceptance-test.mjs", state: "LIVE",
      contract: "one corridor page, a hand-written fact block, Gate A re-run (KEEP/REJECT). NOT the Case Study #1 contract (6/6 RED + 0/3 CONTROL): measured 24 Sep 2026 — neither contract document names this tool, nothing calls it, and its inputs (--corpus --group --page --facts) are a corridor, not a defect set. Relocation changed no corpus, pass mark, input or word of that contract." }),
    /* DEAD (clarification C): no importer, no test, no production caller — measured with a positive control that the same
     * search finds the importers of nursing-chain. Relocated anyway; not deleted, not revived, not folded in. */
    Object.freeze({ file: "tools/profession-census.mjs", relocatedFrom: "bin/profession-census.mjs", state: "DEAD" }),
    Object.freeze({ file: "tools/clinical-layer-census.mjs", relocatedFrom: "bin/clinical-layer-census.mjs", state: "DEAD" }),
    /* Not in the owner's list by name — CC's placement decision under the same rule 1, recorded in the F02 evidence: each
     * encodes THIS subject's URL grammar (variant / from-origin / organisation; page ids `variant__origin`) as its logic,
     * so making it neutral would mean generalising it (rule 6 forbids that inside F02). Relocated with behaviour preserved. */
    /* Not in the owner's list by name — same placement decision: a one-off importer whose logic is one client's human
     * verification (its fact ids and findings are that subject's answers). Relocated with behaviour preserved. */
    Object.freeze({ file: "tools/verification-issues.mjs", relocatedFrom: "bin/verification-issues.mjs", state: "LIVE" }),
    Object.freeze({ file: "tools/build-corpus.mjs", relocatedFrom: "bin/build-corpus.mjs", state: "LIVE" }),
    Object.freeze({ file: "tools/diagnose-overlap.mjs", relocatedFrom: "bin/diagnose-overlap.mjs", state: "LIVE" }),
  ]),
  /**
   * The vocabulary SHARED engine code must never contain — this subject's own words, kept with the subject, so the law
   * lives outside the territory it polices (tools/product-boundary.mjs reads it). Substrings: `nmc` catches `NMCN`,
   * `pharmac` catches pharmacy and pharmacist, `midwif` midwife and midwifery.
   */
  vocabulary: Object.freeze(["profession", "nursing", "nurse", "oet", "hcpc", "ahpra", "nmc", "nmbi", "pnmc", "podiatr", "pharmac", "midwif"]),
  /** This package's LOCAL writers (moved verbatim from config/permitted-page-writers.mjs PERMITTED_LOCAL_WRITERS). */
  permittedLocalWriters: Object.freeze([
    {
      file: "subjects/almi-oet/tools/verification-issues.mjs",
      /* 🔴 ROUTED (23 September 2026). Observations and issues are collected and committed as two governed
       * decisions — one per kind, because they are genuinely different writes. The store still decides
       * appended-versus-re-sighted, and the report still prints its answer. */
      routed: true,
      sites: 0,
      writes: "the issues a human verification returned, each citing an observation of the VERDICT ROW we hold — never of a page we did not fetch",
      where: `runs/audit/verification-issues.jsonl by default, or the file given by --out; ${CONFINED}`,
      gatedBy: "write-law LOCAL: the append sits behind permission.mayWrite, which only --confirm grants. With no flag it prints every issue it would record, marked already-present or new. 🔴 Until 16 September 2026 it had NO gate",
      gateFlags: ["--confirm"],
      gateToken: "permission.mayWrite",
      destinationOverridable: true,
      why: "item 15, part 4: what the 12 September verification turned up, recorded as issues with an honest chain of custody",
      whyKnown: true,
    },
  ]),
  /** This package's writers, as the permitted-writers census reads them (moved verbatim from config/permitted-page-writers.mjs). */
  permittedPageWriters: Object.freeze([
    {
      file: "subjects/almi-oet/tools/build-corpus.mjs",
      /* 🔴 ROUTED (23 September 2026). One fetched page is one target, so each is its own governed occurrence; the
       * manifest is another. The bare mkdir is gone — each write's prepare step creates its directory. */
      routed: true,
      sites: 0,
      writes: "copies of pages FETCHED from a live sitemap (their HTML, as served), plus a corpus manifest",
      where: `the directory given by --out (required, no default); ${CONFINED}`,
      gatedBy: "write-law LOCAL: every write sits behind permission.mayWrite, which only --confirm grants",
      gateFlags: ["--confirm"],
      gateToken: "permission.mayWrite",
      destinationOverridable: true,
      why: "builds the corpus Gate A was first calibrated on (runs/2026-09-10-almioet/GATE_A_RUN_01.md). It stores pages that already exist; it generates none",
      whyKnown: true,
    },
  ]),
  /** F34 C5 · this package's page-producing paths, classified for tools/existing-page-first-census.mjs (merged into
   * config/page-production.mjs, which carries no subject's words). `marks` = the call AND the condition production depends on. */
  pageProduction: Object.freeze({
    "subjects/almi-oet/tools/build-corpus.mjs": Object.freeze({ class: "NOT_PAGE_PRODUCTION", why: "stores copies of pages FETCHED from a sitemap, as served — evidence, never a new page" }),
  }),
});
