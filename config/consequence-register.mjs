/**
 * 🔴 ROW 60 — CONSEQUENCE-WEIGHTED PRIORITY. THE DECLARED CONSEQUENCE REGISTER, ARRIVING EMPTY ON PURPOSE.
 *
 * Harm is a JUDGEMENT, not a measurement. If the engine invented a severity number it would become exactly the
 * comforting number this product refuses. So the judgement stays with the OWNER; the engine only applies what is
 * declared here, consistently (PASS_BOUNDARIES_AMENDMENT_3.md, row 60).
 *
 * Every finding class ACTUALLY PRESENT in the evidence store has one entry, enumerated from the store on
 * 14 September 2026 — no class invented, no list copied. Each entry states what the class is, its level, and why.
 *
 * 🔴 EVERY LEVEL IS UNCLASSIFIED. Not one was filled in — not even an obvious one. The whole point of the row is
 * that the engine, and whoever writes the engine, cannot. The owner rules each level; a ruled level carries
 * `ruledBy: "owner"`, the date and the reason, and nothing else may set one.
 *
 * 🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW. LAW-ABSENT-1: the absence of a harm rating is a fact about this register,
 * never a finding that the harm is small. An unrated class ranks as UNKNOWN and says so.
 *
 * `severity` on an issue record is a DETECTOR's label about the defect, recorded when it was measured. It is not
 * a consequence level and is not read as one.
 */

const UNRULED = "not ruled — a consequence level is the owner's judgement, and none has been given for this class";
const entry = (what) => Object.freeze({ what, level: "UNCLASSIFIED", why: UNRULED, ruledBy: null, ruledOn: null });

export const CONSEQUENCE_REGISTER = Object.freeze({
  canonical: entry("a page's raw HTML carries no rel=canonical link"),
  "commencement-date-ambiguous-against-source": entry("a fact's commencement date cannot be read unambiguously from its official source"),
  "exact-duplicate": entry("a page's body is byte-identical to other pages'"),
  "head-elements": entry("a page's heading structure is broken — no h1, or a heading level used before it"),
  "host-publishes-no-a-record": entry("a host publishes no IPv4 address, so IPv4 clients and crawlers cannot resolve it"),
  "indexability-preflight": entry("a page's technical indexability state — a condition that blocks eligibility, or one left unmeasured"),
  "instrument-disagreement": entry("two of our own instruments disagree about the same page over the same inputs"),
  "near-duplicate": entry("a page's body is highly similar to a sibling page's"),
  noindex: entry("a page carries noindex in its meta robots tag or X-Robots-Tag header"),
  "official-source-contradicts-itself": entry("an official source states two things about the same fact that disagree"),
  "orphan-within-crawled-set": entry("no page inside the crawled set links to this page"),
  "query-parameters": entry("a page's URL carries query parameters"),
  "robots-blocks-search-crawler": entry("robots.txt disallows a search crawler from a page that draws search impressions"),
  "sitemap-advertises-blocked-url": entry("a sitemap advertises a URL that robots.txt blocks — or the inputs to check it are not stored"),
  "status-and-redirects": entry("requesting a page's URL does not return 200 directly — it redirects or errors"),
  "template-dominance": entry("the shared shell makes up most of a page's words"),
  "thin-content": entry("a page has fewer unique body words than the floor after the shell is subtracted"),
});
