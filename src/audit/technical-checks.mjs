/**
 * ITEM 10 — the remaining technical sub-requirements, over pages ALREADY in the
 * store. No new crawl.
 *
 * ── 🔴 TWO OF THE NINE ARE STRUCTURALLY IMPOSSIBLE IN v0.1 ──────────────────
 *
 * RENDERING — every record is `renderMode: RAW_HTML` and no JavaScript was ever
 * executed. There is no approximation of this that is honest. A check that
 * inferred "renders fine" from raw markup would be guessing about the exact
 * thing the field exists to flag.
 *
 * CRAWL DEPTH — we seeded from Search Console and never followed links, so
 * depth was never measured. That was a deliberate design choice (the frontier
 * refuses discovered links), not an oversight. It must read UNKNOWN rather than
 * as a number nobody can defend.
 *
 * Both are exported as permanent UNKNOWNs with their reasons, so the gap is
 * visible in the data rather than absent from it.
 *
 * ── AND THE SEALED EXAM HOLDS ───────────────────────────────────────────────
 *
 * Nothing here has read the sealed corpus. These come from item 10's own PASS
 * meaning and from the technical-SEO paragraph of the frozen build command.
 */

import { registerCheck, fail, unknown } from "./check.mjs";

/** 🔴 Printed by every report that uses a preflight state. */
export const INDEXABLE_IS_NOT_INDEXED =
  "INDEXABLE ≠ INDEXED. This is a technical eligibility state, not a prediction. " +
  "It says nothing about whether Google will index, rank or cite the page.";

/* ------------------------------------------------------------------ *
 * Small parsers. Deliberately narrow, and they report what they cannot see.
 * ------------------------------------------------------------------ */

const attr = (tag, name) => {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return m ? m[1].trim() : null;
};

export function parseHead(html) {
  const s = String(html ?? "");
  const canonicalTag = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(s);
  const metaRobots = [...s.matchAll(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*>/gi)]
    .map((m) => (attr(m[0], "content") ?? "").toLowerCase());
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(s);
  const h1s = [...s.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  const desc = [...s.matchAll(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*>/gi)]
    .map((m) => attr(m[0], "content") ?? "");
  const headings = [...s.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]));
  return {
    canonical: canonicalTag ? attr(canonicalTag[0], "href") : null,
    metaRobots,
    title: title ? title[1].replace(/<[^>]+>/g, "").trim() : null,
    description: desc[0] ?? null,
    descriptionCount: desc.length,
    h1s,
    headings,
  };
}

/** meta robots + X-Robots-Tag, and whether they disagree. */
export function noindexState({ metaRobots, xRobotsTag }) {
  const inMeta = metaRobots.some((c) => c.split(",").map((x) => x.trim()).includes("noindex"));
  /**
   * 🔴 AN ABSENT HEADER IS NOT A CONTRADICTING HEADER — LAW-ABSENT-1.
   *
   * The first version of this treated a missing `X-Robots-Tag` as
   * `inHeader: false` and then called `meta=true, header=false` a
   * DISAGREEMENT. It fired on **134 of 394 real pages**, every one of which
   * simply had meta noindex and no header at all — the ordinary way to
   * noindex a page.
   *
   * That is the absence of a measurement reported as a conflicting
   * measurement. A disagreement requires the header to be PRESENT and to say
   * something different.
   */
  const headerPresent = typeof xRobotsTag === "string" && xRobotsTag.trim() !== "";
  const header = (xRobotsTag ?? "").toLowerCase();
  const headerTokens = header.split(",").map((x) => x.trim());
  const inHeader = headerPresent && headerTokens.includes("noindex");
  const headerSaysIndex = headerPresent && headerTokens.includes("index") && !headerTokens.includes("noindex");

  return {
    inMeta,
    inHeader,
    headerPresent,
    noindexed: inMeta || inHeader,
    /* A real disagreement: both sources speak, and they say different things.
     * Google takes the most restrictive, so the page is noindexed either way —
     * but a site whose header and markup conflict does not know its own mind,
     * and the next edit may flip it. */
    disagree: (inMeta && headerSaysIndex) || (inHeader && !inMeta && metaRobots.some((c) => c.includes("index") && !c.includes("noindex"))),
  };
}

/* ------------------------------------------------------------------ *
 * 1 — STATUS CODES AND REDIRECT CHAINS
 * ------------------------------------------------------------------ */

export const STATUS_AND_REDIRECTS = registerCheck({
  id: "status-and-redirects",
  description: "A non-200 final status, or a redirect chain longer than one hop.",
  firingFixture: "an observation with status 404 — must fire",
  cleanControl: "an observation with status 200 and no redirect — must NOT fire",
  /* RR-100: read from run() — silent only when status === 200, the chain has at most one hop and the final URL is the requested one. */
  boundary: {
    observes: ["the recorded final status", "the recorded redirect chain", "the recorded requested and final URLs"],
    fires: [
      { id: "status-not-200", when: "the recorded final status is anything other than 200 (a failed fetch with no status included)" },
      { id: "chain-over-one-hop", when: "the recorded redirect chain has more than one entry" },
      { id: "redirected", when: "the recorded final URL differs from the requested URL" },
    ],
  },
  run({ page, observations, siteContext }) {
    const o = observations[0]?.value;
    if (!o || o.status === undefined) {
      return unknown({
        issueClass: "status-and-redirects", canonicalUrl: page.canonical_url, reasonCode: "NO_OBSERVATION",
        evidence: observations.map((x) => x.observation_id),
        detector: "status-and-redirects", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    const chain = o.redirect_chain ?? [];
    const redirected = o.final_url && o.requested_url && o.final_url !== o.requested_url;
    if (o.status === 200 && chain.length <= 1 && !redirected) return null;
    if (o.status === 200 && redirected) {
      return fail({
        issueClass: "status-and-redirects", canonicalUrl: page.canonical_url, severity: "low",
        evidence: observations.map((x) => x.observation_id),
        detector: "status-and-redirects", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `the requested URL redirected: ${o.requested_url} → ${o.final_url}`,
      });
    }
    return fail({
      issueClass: "status-and-redirects", canonicalUrl: page.canonical_url,
      severity: o.status === null || o.status >= 500 ? "high" : "medium",
      evidence: observations.map((x) => x.observation_id),
      detector: "status-and-redirects", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `final status ${o.status ?? "none — the request failed"}; redirect chain length ${chain.length}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 2 — HTTPS
 * ------------------------------------------------------------------ */

export const HTTPS_ONLY = registerCheck({
  id: "https-only",
  description: "A page served over plain HTTP.",
  firingFixture: "an http:// final URL — must fire",
  cleanControl: "an https:// final URL — must NOT fire",
  run({ page, observations, siteContext }) {
    const url = observations[0]?.value?.final_url ?? page.canonical_url;
    if (!url) {
      return unknown({
        issueClass: "https-only", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "https-only", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    if (new URL(url).protocol === "https:") return null;
    return fail({
      issueClass: "https-only", canonicalUrl: page.canonical_url, severity: "high",
      evidence: observations.map((x) => x.observation_id),
      detector: "https-only", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `served over ${new URL(url).protocol}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 3 — CANONICALS
 * ------------------------------------------------------------------ */

export const CANONICAL = registerCheck({
  id: "canonical",
  description: "A missing canonical, or one pointing off-host, or one pointing at a URL we saw as non-200.",
  firingFixture: "a page whose canonical points at another host — must fire",
  cleanControl: "a page whose canonical is its own URL — must NOT fire",
  /* RR-100: read from run() — four firing paths, each tested in both directions. */
  boundary: {
    observes: ["the stored body's rel=canonical", "the page URL", "the recorded statuses of this site's URLs"],
    fires: [
      { id: "canonical-missing", when: "the stored body carries no rel=canonical" },
      { id: "canonical-unparseable", when: "the canonical is not a parseable URL relative to the page" },
      { id: "canonical-off-host", when: "the canonical resolves to a different hostname than the page" },
      { id: "canonical-target-not-200", when: "the canonical's same-host target was recorded with a status other than 200" },
    ],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "canonical", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "canonical", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: "the stored body is not available to this run",
      });
    }
    const { canonical } = parseHead(html);
    if (!canonical) {
      return fail({
        issueClass: "canonical", canonicalUrl: page.canonical_url, severity: "low",
        evidence: observations.map((x) => x.observation_id),
        detector: "canonical", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: "no rel=canonical in the raw HTML",
      });
    }
    let resolved;
    try {
      resolved = new URL(canonical, page.canonical_url);
    } catch {
      return fail({
        issueClass: "canonical", canonicalUrl: page.canonical_url, severity: "medium",
        evidence: observations.map((x) => x.observation_id),
        detector: "canonical", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `canonical is not a parseable URL: ${JSON.stringify(canonical)}`,
      });
    }
    const here = new URL(page.canonical_url);
    if (resolved.hostname !== here.hostname) {
      return fail({
        issueClass: "canonical", canonicalUrl: page.canonical_url, severity: "high",
        evidence: observations.map((x) => x.observation_id),
        detector: "canonical", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `canonical points at another host: ${resolved.href}`,
      });
    }
    /* 🔴 A cross-URL canonical INSIDE the host is normal and not a finding. Only
     * a canonical we can SHOW points at a non-200 is one, and we can only show
     * that for URLs we actually fetched. */
    const target = siteContext.statusByUrl?.get(resolved.href.replace(/\/$/, ""));
    if (target !== undefined && target !== 200) {
      return fail({
        issueClass: "canonical", canonicalUrl: page.canonical_url, severity: "high",
        evidence: observations.map((x) => x.observation_id),
        detector: "canonical", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `canonical points at ${resolved.href}, which we observed as HTTP ${target}`,
      });
    }
    return null;
  },
});

/* ------------------------------------------------------------------ *
 * 4 — NOINDEX, IN MARKUP AND IN THE HEADER
 * ------------------------------------------------------------------ */

export const NOINDEX = registerCheck({
  id: "noindex",
  description: "A page carrying noindex, and any disagreement between meta robots and X-Robots-Tag.",
  firingFixture: "a page with <meta name=robots content=noindex> — must fire",
  cleanControl: "a page with meta robots 'index,follow' and no X-Robots-Tag — must NOT fire",
  /* RR-100: read from run() and noindexState() — every disagreement implies a noindex on one side, so disagreement sets severity only. */
  boundary: {
    observes: ["the stored body's meta robots", "the recorded X-Robots-Tag header"],
    fires: [{ id: "noindexed", when: "meta robots or a recorded X-Robots-Tag carries the noindex token" }],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "noindex", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "noindex", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    const head = parseHead(html);
    const xr = observations[0]?.value?.response_headers_subset?.["x-robots-tag"] ?? null;
    const s = noindexState({ metaRobots: head.metaRobots, xRobotsTag: xr });
    if (!s.noindexed && !s.disagree) return null;
    return fail({
      issueClass: "noindex", canonicalUrl: page.canonical_url,
      severity: s.disagree ? "high" : "medium",
      evidence: observations.map((x) => x.observation_id),
      detector: "noindex", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: s.disagree
        ? `meta robots and X-Robots-Tag DISAGREE (meta noindex=${s.inMeta}, header noindex=${s.inHeader}). ` +
          "Google takes the most restrictive, so the page is noindexed — but the site does not know its own mind."
        : `noindex present (meta=${s.inMeta}, header=${s.inHeader})`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 5 — TITLE, DESCRIPTION, H1, HEADING STRUCTURE
 * ------------------------------------------------------------------ */

export const HEAD_ELEMENTS = registerCheck({
  id: "head-elements",
  description: "Missing or empty title/description/H1, more than one H1, duplicate titles, or a skipped heading level.",
  firingFixture: "a page with no <h1> and an empty <title> — must fire",
  cleanControl: "a page with one title, one description and one H1 — must NOT fire",
  /* RR-100: read from run() — eight firing conditions (its separate "empty title" branch is unreachable: an empty title is already "no title"). */
  boundary: {
    observes: ["the stored body's title, meta descriptions, h1 elements and heading levels", "the titles of this site's other pages"],
    fires: [
      { id: "no-title", when: "the title is missing or empty" },
      { id: "no-description", when: "the meta description is missing or empty" },
      { id: "multiple-descriptions", when: "more than one meta description" },
      { id: "no-h1", when: "no h1 element" },
      { id: "multiple-h1", when: "more than one h1 element" },
      { id: "empty-h1", when: "an h1 element whose text is empty" },
      { id: "shared-title", when: "the title is shared with at least one other page of the site" },
      { id: "skipped-heading-level", when: "a heading level h2-h6 is used while the level above it is not" },
    ],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "head-elements", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "head-elements", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    const h = parseHead(html);
    const problems = [];
    if (!h.title) problems.push("no <title>");
    else if (h.title === "") problems.push("<title> is empty");
    if (!h.description) problems.push("no meta description");
    if (h.descriptionCount > 1) problems.push(`${h.descriptionCount} meta descriptions`);
    if (h.h1s.length === 0) problems.push("no <h1>");
    if (h.h1s.length > 1) problems.push(`${h.h1s.length} <h1> elements`);
    if (h.h1s.some((t) => t === "")) problems.push("an <h1> is empty");
    const dupTitle = h.title && (siteContext.titleCounts?.get(h.title) ?? 0) > 1;
    if (dupTitle) problems.push(`title is shared with ${siteContext.titleCounts.get(h.title) - 1} other page(s)`);
    // A skipped level: h1 then h3 with no h2.
    const seen = new Set(h.headings);
    for (let lvl = 2; lvl <= 6; lvl += 1) {
      if (seen.has(lvl) && !seen.has(lvl - 1)) {
        problems.push(`heading level h${lvl} used with no h${lvl - 1}`);
        break;
      }
    }
    if (problems.length === 0) return null;
    return fail({
      issueClass: "head-elements", canonicalUrl: page.canonical_url,
      severity: problems.some((p) => p.includes("no <title>") || p.includes("no <h1>")) ? "medium" : "low",
      evidence: observations.map((x) => x.observation_id),
      detector: "head-elements", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: problems.join("; "),
    });
  },
});

/* ------------------------------------------------------------------ *
 * 6 — BROKEN INTERNAL LINKS
 * ------------------------------------------------------------------ */

export const BROKEN_INTERNAL_LINK = registerCheck({
  id: "broken-internal-link",
  description: "A link to a same-host URL we observed as non-200.",
  firingFixture: "a page linking to a URL observed as 404 — must fire",
  cleanControl: "a page linking only to URLs observed as 200 — must NOT fire",
  run({ page, observations, siteContext }) {
    const links = siteContext.outboundLinks;
    if (!links) {
      return unknown({
        issueClass: "broken-internal-link", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "broken-internal-link", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: "no edge graph available for this page",
      });
    }
    const broken = [];
    for (const to of links) {
      const status = siteContext.statusByUrl?.get(to.replace(/\/$/, ""));
      /* 🔴 A link to a URL WE NEVER FETCHED is not broken — it is unmeasured.
       * The crawled set is 394 pages of a much larger site. */
      if (status !== undefined && status !== 200) broken.push(`${to} (HTTP ${status})`);
    }
    if (broken.length === 0) return null;
    return fail({
      issueClass: "broken-internal-link", canonicalUrl: page.canonical_url, severity: "medium",
      evidence: observations.map((x) => x.observation_id),
      detector: "broken-internal-link", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `${broken.length} internal link(s) to a non-200 URL: ${broken.slice(0, 3).join("; ")}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 7 — QUERY PARAMETERS AND FACETS
 * ------------------------------------------------------------------ */

export const QUERY_PARAMETERS = registerCheck({
  id: "query-parameters",
  description: "An indexed URL carrying query parameters — a facet surface Google is spending crawl on.",
  firingFixture: "a URL with ?sort=asc&page=2 — must fire",
  cleanControl: "a URL with no query string — must NOT fire",
  /* RR-100: read from run(). */
  boundary: {
    observes: ["the page URL's query string"],
    fires: [{ id: "has-query-parameter", when: "the page URL carries at least one query parameter" }],
  },
  run({ page, observations, siteContext }) {
    const u = new URL(page.canonical_url);
    const params = [...u.searchParams.keys()];
    if (params.length === 0) return null;
    return fail({
      issueClass: "query-parameters", canonicalUrl: page.canonical_url,
      severity: params.length > 2 ? "medium" : "low",
      evidence: observations.map((x) => x.observation_id),
      detector: "query-parameters", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `${params.length} query parameter(s): ${params.join(", ")}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 🔴 THE TWO THAT CANNOT BE MEASURED IN v0.1.
 * ------------------------------------------------------------------ */

export const STRUCTURALLY_UNKNOWN = Object.freeze({
  rendering: {
    reasonCode: "NEEDS_RENDERED_HTML",
    why:
      "renderMode is RAW_HTML on every record and no JavaScript was ever executed. There is no honest " +
      "approximation: inferring 'renders fine' from raw markup would be guessing about the exact thing " +
      "this field exists to flag.",
  },
  crawlDepth: {
    reasonCode: "NOT_APPLICABLE_YET",
    why:
      "we seeded from Search Console and never followed links — the frontier refuses discovered links by " +
      "design — so depth was never measured. A deliberate design choice, not an oversight, and it must " +
      "read UNKNOWN rather than as a number nobody can defend.",
  },
});

/* ------------------------------------------------------------------ *
 * ITEM 38 — INDEXABILITY PREFLIGHT, ASSESS MODE.
 * ------------------------------------------------------------------ */

export const PREFLIGHT_CONDITIONS = Object.freeze([
  "reachable200",
  "notRobotsDisallowed",
  "notNoindexed",
  "canonicalSelfOrResolving",
  "inSitemap",
  "contentInRawHtml",
]);

/**
 * Assess a page's technical eligibility.
 *
 * 🔴 IT NEVER PREDICTS. `ELIGIBLE` means every condition we could check passed.
 * It does not mean the page will be indexed, ranked or cited, and a test fails
 * the build on any such wording in the output.
 */
export function preflight({ status, robotsAllowed, noindexed, canonicalOk, inSitemap, hasContent }) {
  const conditions = {
    reachable200: status === 200 ? true : status === undefined ? null : false,
    notRobotsDisallowed: robotsAllowed === undefined ? null : robotsAllowed,
    notNoindexed: noindexed === undefined ? null : !noindexed,
    canonicalSelfOrResolving: canonicalOk === undefined ? null : canonicalOk,
    inSitemap: inSitemap === undefined ? null : inSitemap,
    contentInRawHtml: hasContent === undefined ? null : hasContent,
  };
  const failed = Object.entries(conditions).filter(([, v]) => v === false).map(([k]) => k);
  const unmeasured = Object.entries(conditions).filter(([, v]) => v === null).map(([k]) => k);
  const state = failed.length > 0 ? "BLOCKED" : unmeasured.length > 0 ? "UNKNOWN" : "ELIGIBLE";
  return {
    state,
    conditions,
    failed,
    unmeasured,
    // 🔴 Printed with every result, in every report.
    note: INDEXABLE_IS_NOT_INDEXED,
  };
}

export const INDEXABILITY_PREFLIGHT = registerCheck({
  id: "indexability-preflight",
  description: "Technical eligibility for indexing, in ASSESS MODE over pages that already exist. Never a prediction.",
  firingFixture: "a page that is noindexed and robots-disallowed — must fire as BLOCKED",
  cleanControl: "a page passing every condition — must NOT fire",
  /* RR-100: read from run() and preflight() — BLOCKED (a finding) when any of the six PREFLIGHT_CONDITIONS is false; a condition that is
   * unmeasured makes the result UNKNOWN, never a finding. */
  boundary: {
    observes: ["the recorded status", "the robots decision", "the noindex state", "the canonical state", "sitemap membership", "content present in raw HTML"],
    fires: [
      { id: "reachable200", when: "the recorded status is not 200" },
      { id: "notRobotsDisallowed", when: "robots disallows the page" },
      { id: "notNoindexed", when: "the page is noindexed" },
      { id: "canonicalSelfOrResolving", when: "the canonical is neither self nor resolving" },
      { id: "inSitemap", when: "the page is not in the sitemap" },
      { id: "contentInRawHtml", when: "the raw HTML carries no content" },
    ],
  },
  run({ page, observations, siteContext }) {
    const p = preflight(siteContext.preflightInputs ?? {});
    if (p.state === "ELIGIBLE") return null;
    if (p.state === "UNKNOWN") {
      return unknown({
        issueClass: "indexability-preflight", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((x) => x.observation_id),
        detector: "indexability-preflight", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `${p.unmeasured.length} condition(s) unmeasured: ${p.unmeasured.join(", ")}. ${INDEXABLE_IS_NOT_INDEXED}`,
      });
    }
    return fail({
      issueClass: "indexability-preflight", canonicalUrl: page.canonical_url,
      severity: "medium",
      evidence: observations.map((x) => x.observation_id),
      detector: "indexability-preflight", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `technically BLOCKED: ${p.failed.join(", ")} failed. ${INDEXABLE_IS_NOT_INDEXED}`,
    });
  },
});
