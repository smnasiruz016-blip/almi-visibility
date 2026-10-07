/**
 * 🔴 ROW 60 — CONSEQUENCE-WEIGHTED PRIORITY. THE DECLARED CONSEQUENCE REGISTER, RULED BY THE OWNER.
 *
 * Harm is a JUDGEMENT, not a measurement. If the engine invented a severity number it would become exactly the
 * comforting number this product refuses. So the judgement stays with the OWNER; the engine only applies what is
 * declared here, consistently (PASS_BOUNDARIES_AMENDMENT_3.md, row 60).
 *
 * Every finding class ACTUALLY PRESENT in the evidence store has one entry, enumerated from the store on
 * 14 September 2026 — no class invented, no list copied.
 *
 * ── RULED 14 SEPTEMBER 2026 ──────────────────────────────────────────────────
 *
 * The owner ruled the scale and the law (config/consequence-scale.mjs) and adopted the 17 assignments. The WORDING
 * of every entry below is beta-g's proposal, which he adopted — reproduced in ROW60_CONSEQUENCE_LAW.md, and
 * test/consequence-law.test.mjs holds every text field to that file word for word. Nothing here is paraphrased.
 *
 * ENTRY SHAPE — all six, and the census refuses a partial entry:
 *   FINDING CLASS (the key) → level → consequence → reversibility → blastRadius → why
 *
 * `escalatedFrom` names the level an entry stood at before blast radius objectively changed its consequence (A3).
 * It is the ONLY way a class crosses a level, it is the owner's, and it may cross exactly one.
 *
 * 🔴 UNCLASSIFIED IS NOT A LEVEL (A4). Three classes bundle two opposite consequences in their own definition, so
 * they carry no consequence, reversibility or blast radius — writing one would be picking a half. Each names what
 * it bundles and the split that would fix it. UNCLASSIFIED is UNKNOWN: never LOW, never NONE, never ranked, never
 * executed on a fallback.
 *
 * `severity` on an issue record is a DETECTOR's label about the defect, recorded when it was measured. It is not
 * a consequence level and is not read as one.
 */

import { CLASS_SPLITS } from "./class-splits.mjs";

const RULING = Object.freeze({
  ruledBy: "owner",
  ruledOn: "2026-09-14",
  wording: "beta-g's proposal (_handoffs/AlmiVisibility_ROW60_SEVERITY_ASSIGNMENTS_PROPOSAL.md), adopted by the owner on 14 September 2026 — reproduced in ROW60_CONSEQUENCE_LAW.md",
});

const ruled = (what, level, parts) => Object.freeze({ what, level, ...parts, ...RULING });

const BUNDLED = "A class whose own definition holds two opposite consequences cannot carry one severity.";

/* 🔴 A HALF IS A NEW CLASS. It arrives UNCLASSIFIED, unruled, with no consequence of its own — and no level of the
 * class it was split from carries down to it. The census refuses a half that arrives any other way. */
const half = (parent, what) =>
  Object.freeze({
    what,
    level: "UNCLASSIFIED",
    consequence: null,
    reversibility: null,
    blastRadius: null,
    why: `NEW — split from ${parent} on 14 September 2026 (config/class-splits.mjs). The owner has ruled nothing about this class, and no level of ${parent} carries to it.`,
    splitFrom: parent,
    ruledBy: null,
    ruledOn: null,
  });

/* A superseded entry keeps every word it had, and names the halves it became. It is not in use and ranks nothing. */
/* RR-196: a parent re-split later still names the halves it became ON ITS SPLIT DAY (`firstHalves`), never the later ones. */
const superseded = (parent, entry, record = {}) =>
  Object.freeze({ ...entry, ...record, supersededOn: CLASS_SPLITS[parent].splitOn, supersededBy: Object.freeze(CLASS_SPLITS[parent].firstHalves ?? CLASS_SPLITS[parent].halves.map((h) => h.class)) });

/* 🔴 RR-196 · A RULED HALF RETIRED (7 October 2026). Every word the owner ruled is kept; it names the two classes its records became
 * (config/class-splits.mjs, the T-2 re-split) and why. Its level carries to neither: one is a decision on record, the other audit trail. */
const T2_RETIRED = Object.freeze({
  on: "2026-10-07",
  why: "PG-A1 (the owner's ruling, recorded RR-192): the number this check compared no longer decides anything (RTP-1 S10). The 15 named T-2 runs (RR-195) superseded every version-1 FAIL by a version-2 review signal, so no record of this class is a defect found any more",
});
const retiredHalf = (parent, entry) =>
  Object.freeze({ ...entry, supersededOn: T2_RETIRED.on, supersededBy: Object.freeze([`${parent}-claim-withdrawn`, `${parent}-review-signal`]), retired: T2_RETIRED });

/* 🔴 A half the owner ruled: the ruling names THE HALF ITSELF (`ruledFor`). A copy of a parent's ruling cannot. */
const SPLIT_RULING = Object.freeze({
  ruledBy: "owner",
  ruledOn: "2026-09-14",
  wording: "the owner's ruling of 14 September 2026 on the split halves (ROW60_COVERAGE_AND_LEVELS_RULING.md) — beta-g's reasoning adopted, the 3b figures corrected to the store's real findings",
});
const ruledHalf = (parent, half, what, level, parts) => Object.freeze({ what, level, ...parts, splitFrom: parent, ruledFor: half, ...SPLIT_RULING });

/* 🔴 3a — THE ESCALATION IS VOID, recorded on the entry that made it. */
const ORPHAN_ESCALATION_VOID = Object.freeze({
  escalationVoid: Object.freeze({
    on: "2026-09-14",
    cause: "the blast-radius amplifier was applied to a count of records that were not findings — inside the very ruling whose purpose is to stop volume deciding severity. ALL 340 ARE UNMEASURED. Zero are findings; each record says \"This is not an orphan\".",
    nothingLeftToRule: "there is no orphan-within-crawled-set-found class in use — the store holds 0 real orphan findings — so there is nothing left to rule",
  }),
});
/* 🔴 3b — the figure in each content parent's blast radius counted checks that never ran. */
const figureCorrected = (was, real) => Object.freeze({ figureCorrection: Object.freeze({ on: "2026-09-14", was, realFindings: real, levelUnchanged: "MODERATE, now carried by the -found half — it rests on consequence, not on the count" }) });
const unclassified = (what, bundles, split) =>
  Object.freeze({ what, level: "UNCLASSIFIED", consequence: null, reversibility: null, blastRadius: null, why: BUNDLED, bundles, split, ...RULING });

export const CONSEQUENCE_REGISTER = Object.freeze({
  /* ── HIGH ── */
  "official-source-contradicts-itself": ruled("an official source states two things about the same fact that disagree", "HIGH", {
    consequence: "a person acting on a regulatory requirement could be misled in either direction — the harm lands on them, not on us",
    reversibility: "not ours to fix. The contradiction is inside the official source. Our only correct response is to withhold the claim and mark UNKNOWN",
    blastRadius: "1 fact today, but it is the kind of fact a reader acts on with money or a career",
    why: "material serious harm is credible and recovery for the person is not in our hands. It is not CRITICAL because our own response — refuse to publish it — is available, cheap and already enforced",
  }),
  "instrument-disagreement": ruled("two of our own instruments disagree about the same page over the same inputs", "HIGH", {
    consequence: "two of our own instruments disagree about the same page on the same inputs. Every tick downstream of either becomes suspect",
    reversibility: "reconcilable — all 11 were",
    blastRadius: "narrow in count, wide in effect: it undermines the evidence layer the whole product stands on",
    why: "the consequence is systemic to the product's credibility even at low volume. Base severity describes the class, not today's zero",
  }),
  "host-publishes-no-a-record": ruled("a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it", "HIGH", {
    consequence: "an entire host is unresolvable to every IPv4 client and crawler",
    reversibility: "one DNS record — trivially reversible",
    blastRadius: 'one host, therefore every page on it. This is the amplifier doing what it was ruled to do: blast radius objectively changes the consequence from "a page" to "a site"',
    why: "serious while it stands, recoverable. The record itself states it does NOT establish whether Googlebot is affected — so the level rests on the measured IPv4 fact, not on an assumed search impact",
  }),
  "exact-duplicate": ruled("a page's body is byte-identical to other pages'", "HIGH", {
    consequence: "bodies byte-identical to other pages. This is the unambiguous half of the failure class that made a 43-million-page estate worthless",
    reversibility: "reversible — merge, noindex or remove",
    blastRadius: "106 pages, and duplication degrades the standing of the estate around them, not only themselves",
    why: "assigned for the mechanism, not the memory: byte-identical inventory carries zero added value by definition, and it is the clearest low-value signal we produce about ourselves",
  }),

  /* ── MODERATE ── */
  "robots-blocks-search-crawler": ruled("robots.txt disallows a search crawler from a page that draws search impressions", "MODERATE", {
    consequence: "pages that are answering real searches (verified: all 106 draw impressions, 216 in total) are disallowed to the crawler",
    reversibility: "one robots.txt edit",
    blastRadius: "106 of roughly 1,497 URLs — meaningful, not systemic",
    why: "real, bounded, reversible by normal corrective work. Volume raises its priority inside MODERATE; it does not change what the defect is",
    // Provenance of the two figures above, measured from the store — not assignment wording. 216 impressions and a
    // 1,497-row pool are the COMPLETE page-rows pull c1154a02cd5e4168; the report ranks on the newer complete pull
    // of the same window, 9f8cbf772d1cd434 (219 on 1,525 rows). test/consequence-law.test.mjs holds both.
    figuresFrom: "c1154a02cd5e4168",
  }),
  "commencement-date-ambiguous-against-source": ruled("a fact's commencement date cannot be read unambiguously from its official source", "MODERATE", {
    consequence: "a date someone plans around cannot be read unambiguously from its source",
    reversibility: "our response is to mark UNKNOWN and withhold",
    blastRadius: "1",
    why: "bounded and handled.",
    condition: "It rises to HIGH the moment an ambiguous date is rendered on a page",
  }),

  /* ── LOW ── */
  "status-and-redirects": ruled("requesting a page's URL does not return 200 directly — it redirects or errors", "LOW", {
    consequence: "the URL does not return 200 directly — it redirects or errors",
    reversibility: "reversible",
    blastRadius: "7",
    why: "limited and reversible.",
    bundling: "has a milder version of the same impurity — a redirect and a 404 differ. It is proposed at LOW rather than UNCLASSIFIED because both halves are limited and reversible, so the bundling does not change the level.",
  }),
  "head-elements": ruled("a page's heading structure is broken — no h1, or a heading level used before it", "LOW", {
    consequence: "broken heading structure — no h1, or a level used before it",
    reversibility: "trivially reversible",
    blastRadius: "18",
    why: "affects comprehension and assistive technology; it threatens no integrity",
  }),
  canonical: ruled("a page's raw HTML carries no rel=canonical link", "LOW", {
    consequence: "no rel=canonical in the raw HTML, so a search engine chooses for us",
    reversibility: "trivially reversible",
    blastRadius: "6. ⚠️ it interacts with the 106 exact duplicates — on a duplicated page the absent canonical is what lets the wrong URL win",
    why: "LOW on its own evidence today.",
    // Measured, not assumed: test/consequence-law.test.mjs holds the intersection at 0 and fails the day it is not.
    condition: "If any of the 6 sit on duplicated pages, that intersection should be measured and the entry revisited",
  }),
  "query-parameters": ruled("a page's URL carries query parameters", "LOW", {
    consequence: "the URL carries query parameters",
    reversibility: "trivially reversible",
    blastRadius: "1",
    why: "limited, reversible, no integrity threat",
  }),


  /* ── 🔴 THE HALVES THE OWNER RULED, 14 September 2026 (ROW60_COVERAGE_AND_LEVELS_RULING.md) — each by a ruling that
   * names the half itself; no parent's ruling carried down. Their checks-not-run halves are in config/coverage-register.mjs. */
  "indexability-preflight-found": ruledHalf("indexability-preflight", "indexability-preflight-found", "the indexability check ran on a page and found a condition that blocks its eligibility", "MODERATE", {
    consequence: "a measured condition blocks the page's eligibility to be indexed, so a page that should be findable is not",
    reversibility: "reversible — it is configuration",
    blastRadius: "158 real findings; bounded, not systemic",
    why: "the same family as robots-blocks and a defect noindex: meaningful harm to discovery, bounded, recoverable by normal corrective work",
  }),
  /* RR-196: thin-content-found, near-duplicate-found and template-dominance-found are RETIRED — moved, word for word, to
   * SUPERSEDED_ENTRIES below (their records are now a decision on record and audit trail, config/class-splits.mjs) */

  /* ── the two noindex halves are NOT findings (owner's ruling, Option A, 14 September 2026): noindex-declared-deliberate is
   * a DECISION ON RECORD (config/decision-register.mjs) and noindex-defect-claim-withdrawn is AUDIT TRAIL (config/audit-trail.mjs) ── */
});

/**
 * 🔴 SPLIT 14 SEPTEMBER 2026 — THE SEVEN ENTRIES THAT BECAME HALVES. Superseded, never erased: each keeps its words
 * exactly as ruled or recorded, and names the halves it became. Four carried an owner's level (MODERATE); that level
 * applied to a class that no longer exists as one, and it carries to neither half.
 */
export const SUPERSEDED_ENTRIES = Object.freeze({
  /* ── RR-196 · the three ruled T-2 halves, retired 7 October 2026, every word kept (T2_RETIRED above) ── */
  "near-duplicate-found": retiredHalf("near-duplicate", ruledHalf("near-duplicate", "near-duplicate-found", "the near-duplicate check ran and found a page's body highly similar to a sibling page's", "MODERATE", {
    consequence: "bodies highly similar to a sibling",
    reversibility: "reversible — merge, differentiate or remove",
    why: "the same family as exact-duplicate but at a judged threshold rather than a byte match, so the consequence is weaker and the remedy is ordinary editorial work",
    blastRadius: "5",
    levelRestsOn: "consequence, not the count — the level stands because the consequence has not changed; PR #77's figure of 113 counted checks that never ran, the real findings are 5, and volume amplifies within a level and never defines it",
  })),
  "template-dominance-found": retiredHalf("template-dominance", ruledHalf("template-dominance", "template-dominance-found", "the template-dominance check ran and found the shared shell making up most of a page's words", "MODERATE", {
    consequence: "the shared shell makes up most of a page's words — the reader receives furniture, not answer",
    reversibility: "reversible — add real content or remove the page",
    why: "bounded and reversible; it is a quality failure, not an integrity failure",
    blastRadius: "2",
    levelRestsOn: "consequence, not the count — the level stands because the consequence has not changed; PR #77's figure of 110 counted checks that never ran, the real findings are 2, and volume amplifies within a level and never defines it",
  })),
  "thin-content-found": retiredHalf("thin-content", ruledHalf("thin-content", "thin-content-found", "the thin-content check ran and found fewer unique body words than the floor after the shell is subtracted", "MODERATE", {
    consequence: "fewer unique body words than the floor after the shell is subtracted",
    reversibility: "reversible — write it properly or remove it",
    why: "the other named half of the historical failure, but unlike exact-duplicate a thin page may still carry some value, so the consequence is weaker",
    blastRadius: "118, the largest content class",
    levelRestsOn: "consequence, not the count — the level stands because the consequence has not changed; PR #77's figure of 226 counted checks that never ran, the real findings are 118, and volume amplifies within a level and never defines it",
  })),
  "orphan-within-crawled-set": superseded("orphan-within-crawled-set", ruled("no page inside the crawled set links to this page", "MODERATE", {
    consequence: "no page inside the crawled set links to it — discovery depends entirely on sitemaps",
    reversibility: "add links",
    blastRadius: "340 is where the amplifier legitimately escalates: one orphan is a stranded page, 340 is a structural linking failure, and that is a different consequence, not merely more of the same",
    why: "escalated from LOW to MODERATE by blast radius, under the rule that volume may cross a boundary only when it objectively changes the consequence. Flagged as the one escalation in this proposal",
    escalatedFrom: "LOW",
  }), ORPHAN_ESCALATION_VOID),
  "near-duplicate": superseded("near-duplicate", ruled("a page's body is highly similar to a sibling page's", "MODERATE", {
    consequence: "bodies highly similar to a sibling",
    reversibility: "reversible — merge, differentiate or remove",
    blastRadius: "113",
    why: "the same family as exact-duplicate but at a judged threshold rather than a byte match, so the consequence is weaker and the remedy is ordinary editorial work",
  }), figureCorrected("113", 5)),
  "template-dominance": superseded("template-dominance", ruled("the shared shell makes up most of a page's words", "MODERATE", {
    consequence: "the shared shell makes up most of a page's words — the reader receives furniture, not answer",
    reversibility: "reversible — add real content or remove the page",
    blastRadius: "110",
    why: "bounded and reversible; it is a quality failure, not an integrity failure",
  }), figureCorrected("110", 2)),
  "thin-content": superseded("thin-content", ruled("a page has fewer unique body words than the floor after the shell is subtracted", "MODERATE", {
    consequence: "fewer unique body words than the floor after the shell is subtracted",
    reversibility: "reversible — write it properly or remove it",
    blastRadius: "226, the largest content class",
    why: "the other named half of the historical failure, but unlike exact-duplicate a thin page may still carry some value, so the consequence is weaker",
  }), figureCorrected("226", 118)),
  noindex: superseded("noindex", unclassified(
    "a page carries noindex in its meta robots tag or X-Robots-Tag header",
    "a defect and a deliberate decision. 134 of the 268 were already ruled SUPERSEDED as intentional de-indexing. The same class therefore holds pages we meant to hide and pages accidentally hidden — opposite consequences",
    "split into unintended noindex (a defect) and declared noindex (not a finding at all)",
  )),
  "indexability-preflight": superseded("indexability-preflight", unclassified(
    "a page's technical indexability state — a condition that blocks eligibility, or one left unmeasured",
    '"a condition blocks eligibility, or one left unmeasured" — a blocked page and an unrun check are not the same event, and only one of them is a defect',
    "split the blocked condition from the unmeasured check",
  )),
  "sitemap-advertises-blocked-url": superseded("sitemap-advertises-blocked-url", unclassified(
    "a sitemap advertises a URL that robots.txt blocks — or the inputs to check it are not stored",
    '"a sitemap advertises a URL that robots.txt blocks — or the inputs to check it are not stored" — same shape: a real contradiction bundled with a measurement gap',
    "split the contradiction from the missing input",
  )),
});

/**
 * 🔴 PART C — RECOMMENDATIONS NO CLASS-KEYED ENTRY CAN REACH. UNCLASSIFIED / UNKNOWN, as ruled.
 * No entry is stretched to reach one and no nearest class is guessed: the census refuses a recommendation whose
 * consequence names a class its own evidence does not link.
 */
export const UNREACHABLE_RECOMMENDATIONS = Object.freeze({
  "REC-AI-CRAWLER-BLOCK": Object.freeze({
    level: "UNCLASSIFIED",
    gap: "it rests on crawler observations, not on a finding class, so no class-keyed register entry can ever apply to it.",
    needs: Object.freeze(["affected scope", "crawler access", "robots directives in force", "reversibility", "the measured visibility or indexation consequence"]),
    why: 'Its severity was not taken from the words "AI" or "crawler" in its name, and no nearest class was guessed.',
    ...RULING,
  }),
});
