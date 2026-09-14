/**
 * 🔴 ROW 60 — THE COVERAGE REGISTER. AN UNMEASURED CHECK IS NOT A FINDING (owner's ruling, 14 September 2026).
 *
 * A check that never ran says nothing about the product. It says something about OUR INSTRUMENT: we could not look.
 * It has no consequence to a person, so no severity on the scale is true of it, and ranking it would put "we did not
 * look" alongside "we found something". So these classes are not in the consequence register at all: they are a
 * separate population, separately counted, never ranked beside a finding, and never given a level.
 *
 * Each entry records the class, the count, the reason codes, and what input or capability is missing — in the
 * records' own words where they say it, and saying plainly where they do not. `count` and `reasonCodes` are checked
 * against the store (src/audit/coverage.mjs, limb coverage-count), so this file cannot quietly drift from it.
 *
 * Closing a gap is NOT this register's work: it names the gap. Running a detector to fill one needs the owner's green.
 */

const gap = (splitFrom, count, reasonCodes, missing) => Object.freeze({ splitFrom, count, reasonCodes: Object.freeze(reasonCodes), missing, recordedOn: "2026-09-14" });

export const COVERAGE_REGISTER = Object.freeze({
  "indexability-preflight-check-not-run": gap(
    "indexability-preflight",
    210,
    ["MISSING_INPUT"],
    "a required input was absent, so two eligibility conditions — notRobotsDisallowed and inSitemap — could not be evaluated for the page. The records name the unmeasured conditions, not the input that was missing",
  ),
  "near-duplicate-check-not-run": gap(
    "near-duplicate",
    108,
    ["MISSING_INPUT", "TOOL_FAILED"],
    "106: a required input was absent, and the records do not name which. 2: the tool failed — shell subtraction was not confident, so nothing remained to compare",
  ),
  "orphan-within-crawled-set-check-not-run": gap(
    "orphan-within-crawled-set",
    340,
    ["NEEDS_RENDERED_HTML"],
    "rendered HTML — every record is renderMode RAW_HTML in v0.1, so a link injected by JavaScript is invisible; and the crawled set is a sample of a much larger site",
  ),
  "sitemap-advertises-blocked-url-check-not-run": gap(
    "sitemap-advertises-blocked-url",
    350,
    ["MISSING_INPUT"],
    "a stored robots.txt, or stored sitemap URLs, for the host — the records say \"no stored robots.txt or no sitemap URLs for this host\"",
  ),
  "template-dominance-check-not-run": gap(
    "template-dominance",
    108,
    ["MISSING_INPUT", "TOOL_FAILED"],
    "106: a required input was absent, and the records do not name which. 2: the tool failed — shell subtraction was not confident, so nothing remained outside the shell to weigh",
  ),
  "thin-content-check-not-run": gap(
    "thin-content",
    108,
    ["MISSING_INPUT", "NEEDS_RENDERED_HTML"],
    "106: the stored page body was not available to the run. 2: rendered HTML — the body is empty in raw HTML, and a client-rendered page cannot be told from an empty one",
  ),
});
