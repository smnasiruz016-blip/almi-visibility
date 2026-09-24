/**
 * 🔴 ROW 59 — FALSIFIABILITY OF FINDINGS. THE DECLARED REFUTATION REGISTER.
 *
 * Every finding the product presents as actionable must say what would prove it WRONG — as three named parts,
 * never as prose (PASS_BOUNDARIES_AMENDMENT_3.md, row 59):
 *
 *   observation  what would have to be seen to overturn it
 *   source       the method it comes from — `method` MUST name a method this product actually holds: a detector
 *                recorded in the evidence store, or a runner that exists in bin/. `detail` says how.
 *   condition    the threshold at which the finding is void
 *
 * WHY STRUCTURED: prose invites the vacuous refutation ("this would be refuted if it were not true"), and no
 * census can reliably detect that in prose. Three named parts make emptiness visible without any cleverness.
 *
 * THE POPULATION is NOT this file. `src/audit/falsifiability.mjs` reads it from the evidence store — every
 * `issue_class` present, and every drafted recommendation — so this register can never certify itself. A key
 * here that the store does not hold is STALE and fails the census.
 *
 * KEYED BY CLASS, NOT BY RECORD. A refutation names a method and a condition, and those belong to the kind of
 * finding: every `robots-blocks-search-crawler` issue is overturned the same way. Writing one per record would be
 * thousands of copies of the same three sentences — and writing into the append-only evidence store would edit
 * evidence. Declared once per class, applied to every record of it.
 *
 * 🔴 THE LIMIT, stated where the refutations live: the census proves the three parts are PRESENT and point at a
 * method we HOLD. It CANNOT prove a refutation is well chosen. That is human judgement.
 *
 * A finding nobody can write a refutation for is declared `unrefutable: { reason }` — counted as NOT WRITTEN, and
 * failing the census. It is never skipped.
 */

const r = (observation, method, detail, condition) => Object.freeze({ observation, source: Object.freeze({ method, detail }), condition });

export const REFUTATION_REGISTER = Object.freeze({
  classes: Object.freeze({
    "robots-blocks-search-crawler": r(
      "a re-evaluation of the host's robots.txt returns Allow for the search crawler on the issue's URL",
      "robots-scope",
      "our robots evaluation (longest-match rule) over a freshly stored robots.txt for that host",
      "void for each URL the re-evaluation allows; the class is void in the proportion of its URLs that are allowed",
    ),
    "host-publishes-no-a-record": r(
      "a DNS lookup of the host returns at least one A record",
      "dns-family",
      "our DNS audit, resolving the host's A and AAAA families",
      "void the moment the host resolves one A record",
    ),
    "thin-content": r(
      "the stored body, re-measured after shell subtraction, has at least the floor of unique body words",
      "thin-content",
      "our content audit over the committed body archive, with the shell definition printed beside the count",
      "a FAIL is void for any page at or above the floor on the same body; an UNKNOWN is void when a body is stored and measured",
    ),
    "template-dominance": r(
      "the shell's share of the page's words, re-measured on the same body, is at or below the threshold",
      "template-dominance",
      "our content audit over the committed body archive",
      "a FAIL is void when the shell share is at or below the threshold; an UNKNOWN is void when the share is measured",
    ),
    "near-duplicate": r(
      "the page's body similarity to every sibling it was matched to, re-measured, is below the threshold",
      "near-duplicate",
      "our content audit's similarity measure over the committed body archive",
      "a FAIL is void when similarity falls below the threshold against every named sibling; an UNKNOWN is void when it is measured",
    ),
    "exact-duplicate": r(
      "the page's stored body hash differs from the body hash of every URL it was listed as identical to",
      "exact-duplicate",
      "our supply-label pass over the committed bodies, comparing content hashes",
      "void for each URL whose body hash matches none of the URLs it was grouped with",
    ),
    "orphan-within-crawled-set": r(
      "the stored edge graph of the crawled set holds at least one inbound link to the page",
      "orphan-within-crawled-set",
      "bin/edge-graph.mjs re-derives the graph from the committed archive; the detector counts inbound links in it",
      "void when the inbound count inside the crawled set is one or more",
    ),
    "instrument-disagreement": r(
      "both instruments, re-run over the same stored bodies, print the same inbound-link count for the page",
      "instrument-agreement",
      "bin/instrument-disagreement.mjs compares the two runners' recorded outputs",
      "void when the two counts are equal",
    ),
    "indexability-preflight": r(
      "every condition the preflight names is measured from stored observations, and each is satisfied",
      "indexability-preflight",
      "our technical audit, reading status, canonical, meta robots, X-Robots-Tag, the robots rule and sitemap membership",
      "a FAIL is void when every condition passes; an UNKNOWN is void when no condition is left unmeasured",
    ),
    "sitemap-advertises-blocked-url": r(
      "a stored robots.txt and stored sitemap for the host exist, and no URL the sitemap advertises is Disallowed by it",
      "sitemap-vs-robots",
      "our technical audit comparing stored sitemap URLs against the stored robots rules",
      "a FAIL is void for each advertised URL the rules allow; an UNKNOWN is void when both inputs are stored for the host",
    ),
    "head-elements": r(
      "the served HTML, re-parsed, has an h1 and no heading level used before it",
      "head-elements",
      "our technical audit over the committed body archive",
      "void when the page has an h1 and its heading order is complete",
    ),
    canonical: r(
      "the raw HTML carries a rel=canonical link",
      "canonical",
      "our technical audit over the committed body archive",
      "void when a rel=canonical is present",
    ),
    "status-and-redirects": r(
      "requesting the URL returns 200 on the first response, with no redirect",
      "status-and-redirects",
      "our technical audit over the stored response chain for that URL",
      "void when the first response is 200 with no redirect",
    ),
    noindex: r(
      "neither the meta robots tag nor the X-Robots-Tag header carries noindex",
      "noindex",
      "our technical audit over the stored body and headers; noindex.origin-review records when noindex is a deliberate decision rather than a defect",
      "void when neither carries noindex; void AS A DEFECT when the origin review records a deliberate de-indexing decision",
    ),
    "query-parameters": r(
      "the URL, after canonical resolution, carries no query parameters",
      "query-parameters",
      "our technical audit over the stored URL and its canonical",
      "void when the canonical URL carries none",
    ),
    "official-source-contradicts-itself": r(
      "a dated re-read of the official source records that its statements agree, or that one of them was withdrawn",
      "human-verification",
      "a named person re-reads the source; the subject package's verification-issues tool records the reading",
      "void when a dated re-read records agreement or withdrawal",
    ),
    "commencement-date-ambiguous-against-source": r(
      "a dated re-read of the source records one unambiguous commencement date",
      "human-verification",
      "a named person re-reads the source; the subject package's verification-issues tool records the reading",
      "void when a dated re-read records a single date",
    ),
  }),

  recommendations: Object.freeze({
    // The brief's own worked shape, as written.
    "REC-ROBOTS-CORRIDOR": r(
      "a re-crawl returns Allow for Googlebot on these URLs",
      "robots-scope",
      "our own crawler, robots evaluation, the same 106 URLs",
      "if fewer than 106 remain disallowed, this finding is void in that proportion",
    ),
    "REC-AI-CRAWLER-BLOCK": r(
      "the served robots.txt of the hosts it names allows any of the 16 user-agents it says are blocked",
      "robots-scope",
      "our robots evaluation over freshly stored robots.txt files for those hosts, one evaluation per user-agent",
      "void in the proportion of the 16 user-agents, across the hosts it names, that are no longer disallowed",
    ),
    "REC-NOINDEX-CV-GUIDE": r(
      "the 134 sampled pages, re-measured, no longer carry noindex — or any of them measures thin",
      "noindex",
      "our technical audit for noindex over the 134 sampled pages; the thin-content detector for the 'none is thin' half",
      "void in the proportion of the 134 that no longer carry noindex; its 'none is thin' premise is void if any of them measures thin",
    ),
  }),
});
