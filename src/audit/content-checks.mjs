/**
 * ITEM 12 — duplicate / near-duplicate / thin / template dominance.
 * ITEM 13 — cannibalization, DETECTION MODE ONLY.
 * ITEM 26 — internal links present in the SERVED HTML.
 *
 * ── 🔴 CHECKLIST ITEM 8 GOVERNS WHAT THESE LABELS MEAN ──────────────────────
 *
 *   "Use these only as observed content-supply labels; never silently convert
 *    them into demand or opportunity conclusions."
 *
 * HEAVY / THIN / EMPTY describe WHAT CONTENT EXISTS. They say nothing whatever
 * about what anyone wants. A check that turns "thin" into "opportunity" has
 * invented a demand it never measured — and it would be believed, because it
 * arrives wearing a measurement's clothes.
 *
 * So **no check in this file emits a recommendation**, and a test fails the
 * build if one ever does. `RECOMMENDATION_FIELDS` below is the list it hunts.
 *
 * ── AND THE SEALED EXAM STILL HOLDS ─────────────────────────────────────────
 *
 * Nothing here has read the sealed corpus. These four checks come from item
 * 12's own PASS meaning — "duplicate, near-duplicate, thin and
 * template-dominated inventory" — and from Gate A's existing 350-unique-word
 * floor.
 *
 * ⚠️ An earlier draft of this comment spelled the sealed directory's name out
 * in full, and the sealed corpus census failed the build for it. That is the
 * census working exactly as intended: it cannot tell a mention in a comment
 * from a path in an import, and it should not try — a rule that reasons about
 * intent is a rule with a loophole.
 */

import { registerCheck, fail, unknown } from "./check.mjs";
import { measure, shingles, jaccard, SHELL_DEFINITION, THIN_UNIQUE_WORD_FLOOR } from "./shell.mjs";

/** 🔴 If any finding from this file ever carries one of these, item 8 is breached. */
export const RECOMMENDATION_FIELDS = Object.freeze(["recommendation", "action", "opportunity", "suggest", "shouldCreate"]);

/**
 * Words that turn a measurement into a demand claim. Moved here from the item-8
 * test on 12 September 2026 so the country measurement (item 9) is policed by
 * the SAME list rather than a copy of it — a copy drifts, and the guard it came
 * from would keep passing while the copy went stale.
 */
export const DEMAND_WORDS = Object.freeze(["opportunity", "should create", "worth creating", "demand", "underserved", "gap to fill"]);

export const NEAR_DUPLICATE_THRESHOLD = 0.9;
export const TEMPLATE_DOMINANCE_THRESHOLD = 0.75;

/* 🔴 RR-102 — WHAT THE `boundary` DECLARATIONS BELOW ARE, AND ARE NOT. Each states the condition this file's run() ACTUALLY fires on,
 * crossed both ways by test/rr102-content-check-boundaries.test.mjs, so a finding it raised can be overturned. It is NOT a claim that
 * the threshold is authoritative: V3 (quoted in src/page/duplication.mjs, F32) says the 350-word threshold does not control, treats
 * textual overlap as a review trigger rather than a verdict, and sets no dominance threshold; F40 is BLOCKED-BY-AUTHORITY on the floor.
 * These constants are unchanged here; whether their findings stay actionable is the owner's, recorded apart. */

/* ------------------------------------------------------------------ *
 * 12a — EXACT DUPLICATE. The one check that needs no body at all.
 * ------------------------------------------------------------------ */

export const EXACT_DUPLICATE = registerCheck({
  id: "exact-duplicate",
  version: "1",
  description: "Two different URLs whose stored content_sha256 is identical.",
  firingFixture: "two observations on different URLs sharing one content_sha256 — must fire",
  cleanControl: "two observations on different URLs with different hashes — must NOT fire",
  /* RR-102: read from run() — it fires only when another URL (never this page's own) is filed under this observation's content_sha256.
   * The hash is of the stored bytes, not of the shell-subtracted body. A missing hash is UNKNOWN, never a finding. */
  boundary: {
    observes: ["the content_sha256 recorded for this page's observation", "the content_sha256 recorded for each other crawled URL of the site"],
    fires: [{ id: "byte-identical-to-another-url", when: "at least one crawled URL other than this page's own canonical URL carries the same content_sha256" }],
  },
  run({ page, observations, siteContext }) {
    const mine = observations[0];
    if (!mine?.content_sha256) {
      return unknown({
        issueClass: "exact-duplicate",
        canonicalUrl: page.canonical_url,
        reasonCode: "NO_OBSERVATION",
        evidence: observations.map((o) => o.observation_id).filter(Boolean).length
          ? observations.map((o) => o.observation_id)
          : [siteContext.anchorObservationId],
        detector: "exact-duplicate",
        detectorVersion: "1",
        openedAt: siteContext.openedAt,
      });
    }
    const twins = (siteContext.byHash?.get(mine.content_sha256) ?? []).filter((u) => u !== page.canonical_url);
    if (twins.length === 0) return null;
    return fail({
      issueClass: "exact-duplicate",
      canonicalUrl: page.canonical_url,
      severity: "high",
      evidence: [mine.observation_id, ...(siteContext.twinObservationIds ?? [])].filter(Boolean),
      detector: "exact-duplicate",
      detectorVersion: "1",
      openedAt: siteContext.openedAt,
      summary: `byte-identical to ${twins.length} other URL(s): ${twins.slice(0, 3).join(", ")}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 12b — THIN, after shell subtraction.
 * ------------------------------------------------------------------ */

export const THIN_CONTENT = registerCheck({
  id: "thin-content",
  version: "1",
  description:
    `Body unique-word count below the Gate A floor of ${THIN_UNIQUE_WORD_FLOOR}, measured AFTER shell ` +
    "subtraction. An observed content-supply label — it implies nothing about demand (item 8).",
  firingFixture: "a page with a 2,000-word shell and a 40-word body — must fire",
  cleanControl:
    "a page with the SAME 2,000-word shell and a 900-word body — must NOT fire. This is the control " +
    "that proves the shell is being subtracted rather than counted.",
  /* RR-102: read from run() — the only firing path is a confident shell subtraction whose body unique-word count is under the floor.
   * An absent body, an empty body and an unrecognised layout are UNKNOWN, never a finding. The floor in `when` is the live constant. */
  boundary: {
    observes: ["the stored body, split into shell and body by src/audit/shell.mjs"],
    fires: [{ id: "below-unique-word-floor", when: `shell subtraction is confident and the body's unique-word count is below ${THIN_UNIQUE_WORD_FLOOR} (void at ${THIN_UNIQUE_WORD_FLOOR} or more)` }],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "thin-content",
        canonicalUrl: page.canonical_url,
        reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "thin-content",
        detectorVersion: "1",
        openedAt: siteContext.openedAt,
        summary: "the stored body is not available to this run",
      });
    }
    const m = measure(html);
    if (!m.confident) {
      /**
       * 🔴 TWO DIFFERENT UNKNOWNS, AND THEY MUST NOT SHARE A REASON CODE.
       *
       * EMPTY_BODY — we found the container and it holds no text. On a RAW_HTML
       * crawl that is almost certainly a client-rendered page, and reporting it
       * as THIN would be our blind spot written down as a fact about the page.
       * Found twice on the real corpus (`body=0, shell=85`).
       *
       * UNRECOGNISED_LAYOUT — our parser could not tell body from shell. That
       * is a tool failure and says nothing at all (LAW-ABSENT-1).
       */
      const emptyBody = m.reason === "EMPTY_BODY";
      return unknown({
        issueClass: "thin-content",
        canonicalUrl: page.canonical_url,
        reasonCode: emptyBody ? "NEEDS_RENDERED_HTML" : "TOOL_FAILED",
        evidence: observations.map((o) => o.observation_id),
        detector: "thin-content",
        detectorVersion: "1",
        openedAt: siteContext.openedAt,
        summary: emptyBody
          ? `the body is EMPTY in raw HTML (${m.why}). A client-rendered page is indistinguishable from an ` +
            "empty one without executing JavaScript, and every record is RAW_HTML — so this is UNKNOWN, not thin."
          : `shell subtraction is not confident on this page: ${m.why}. ${SHELL_DEFINITION}`,
      });
    }
    if (m.bodyUniqueWordCount >= THIN_UNIQUE_WORD_FLOOR) return null;
    return fail({
      issueClass: "thin-content",
      canonicalUrl: page.canonical_url,
      severity: "medium",
      evidence: observations.map((o) => o.observation_id),
      detector: "thin-content",
      detectorVersion: "1",
      openedAt: siteContext.openedAt,
      // 🔴 LAW-BOUND-1: the floor prints beside the result, every time.
      summary:
        `${m.bodyUniqueWordCount} unique body words [bound: floor=${THIN_UNIQUE_WORD_FLOOR}]; ` +
        `shell was ${m.shellWordCount} words (${((m.shellShare ?? 0) * 100).toFixed(0)}% of the page). ${SHELL_DEFINITION}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 12c — NEAR-DUPLICATE, over body shingles.
 * ------------------------------------------------------------------ */

export const NEAR_DUPLICATE = registerCheck({
  id: "near-duplicate",
  version: "1",
  description: `Body-text Jaccard similarity at or above ${NEAR_DUPLICATE_THRESHOLD} against another crawled page.`,
  firingFixture: "two pages whose bodies differ by one word — must fire",
  cleanControl:
    "two pages sharing a large identical shell but with wholly different bodies — must NOT fire. " +
    "This is the control that proves similarity is measured on BODY, not on chrome.",
  /* RR-102: read from run() — the highest body-shingle Jaccard against any OTHER URL's peer entry is compared with the live threshold,
   * inclusively. A peer at this page's own URL is skipped; an undefined similarity (both empty) never counts. */
  boundary: {
    observes: ["the stored body's 8-word shingles, after shell subtraction", "the body shingles of each other confidently measured crawled page of the site"],
    fires: [{ id: "body-similarity-at-or-above-threshold", when: `shell subtraction is confident and the highest body Jaccard similarity to another URL is ${NEAR_DUPLICATE_THRESHOLD} or more (void below ${NEAR_DUPLICATE_THRESHOLD})` }],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "near-duplicate", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "near-duplicate", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    const m = measure(html);
    if (!m.confident) {
      return unknown({
        issueClass: "near-duplicate", canonicalUrl: page.canonical_url, reasonCode: "TOOL_FAILED",
        evidence: observations.map((o) => o.observation_id),
        detector: "near-duplicate", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `shell subtraction is not confident: ${m.why}`,
      });
    }
    const mine = shingles(m.bodyText);
    let best = null;
    for (const other of siteContext.peers ?? []) {
      if (other.url === page.canonical_url) continue;
      const score = jaccard(mine, other.shingles);
      if (score !== null && (best === null || score > best.score)) best = { url: other.url, score };
    }
    if (!best || best.score < NEAR_DUPLICATE_THRESHOLD) return null;
    return fail({
      issueClass: "near-duplicate", canonicalUrl: page.canonical_url, severity: "medium",
      evidence: observations.map((o) => o.observation_id),
      detector: "near-duplicate", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary: `body similarity ${best.score.toFixed(3)} to ${best.url} [bound: threshold=${NEAR_DUPLICATE_THRESHOLD}]. ${SHELL_DEFINITION}`,
    });
  },
});

/* ------------------------------------------------------------------ *
 * 12d — TEMPLATE DOMINANCE.
 * ------------------------------------------------------------------ */

export const TEMPLATE_DOMINANCE = registerCheck({
  id: "template-dominance",
  version: "1",
  description: `Shell accounts for ${TEMPLATE_DOMINANCE_THRESHOLD * 100}% or more of the page's words.`,
  firingFixture: "a page that is 90% chrome by word count — must fire",
  cleanControl: "a page that is 20% chrome — must NOT fire",
  /* RR-102: read from run() — shell words / (shell words + body words) compared with the live threshold, inclusively. A non-confident
   * subtraction or a page with no words at all is UNKNOWN, never a finding. */
  boundary: {
    observes: ["the stored body's shell and body word counts, from src/audit/shell.mjs"],
    fires: [{ id: "shell-share-at-or-above-threshold", when: `shell subtraction is confident and the shell is ${TEMPLATE_DOMINANCE_THRESHOLD} or more of the page's words (void below ${TEMPLATE_DOMINANCE_THRESHOLD})` }],
  },
  run({ page, observations, siteContext }) {
    const html = siteContext.bodyHtml;
    if (html == null) {
      return unknown({
        issueClass: "template-dominance", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "template-dominance", detectorVersion: "1", openedAt: siteContext.openedAt,
      });
    }
    const m = measure(html);
    if (!m.confident || m.shellShare === null) {
      return unknown({
        issueClass: "template-dominance", canonicalUrl: page.canonical_url, reasonCode: "TOOL_FAILED",
        evidence: observations.map((o) => o.observation_id),
        detector: "template-dominance", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: `shell subtraction is not confident: ${m.why}`,
      });
    }
    if (m.shellShare < TEMPLATE_DOMINANCE_THRESHOLD) return null;
    return fail({
      issueClass: "template-dominance", canonicalUrl: page.canonical_url, severity: "low",
      evidence: observations.map((o) => o.observation_id),
      detector: "template-dominance", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary:
        `shell is ${(m.shellShare * 100).toFixed(0)}% of the page's words ` +
        `[bound: threshold=${TEMPLATE_DOMINANCE_THRESHOLD * 100}%]. ${SHELL_DEFINITION}`,
    });
  },
});

/* 🔴 F75 (RR-103) — THE CONTENT-SUPPLY CHECKS, DECLARED HERE, BESIDE THEM: item 12's four (duplicate, near-duplicate, thin, template).
 * A ticket raised by one of these is a CONTENT ticket; every other registered check makes a DEVELOPER ticket (acceptance _handoffs
 * 01275a9). The orphan check below is item 26 (internal links), not content supply, and is deliberately not listed. */
export const CONTENT_SUPPLY_CHECK_IDS = Object.freeze([EXACT_DUPLICATE.id, THIN_CONTENT.id, NEAR_DUPLICATE.id, TEMPLATE_DOMINANCE.id]);

/* ------------------------------------------------------------------ *
 * ITEM 13 — CANNIBALIZATION, DETECTION MODE ONLY.
 * ------------------------------------------------------------------ */

/**
 * 🔴 DETECTION ONLY, AND THE ROW SAYS SO.
 *
 * Item 13's PASS meaning is "check whether an existing URL already satisfies
 * the same intent BEFORE proposing a new URL". **Nothing proposes a new URL in
 * v0.1**, so the prevention half has nothing to act on. Reporting this check as
 * "cannibalization prevention" would claim a gate that does not exist.
 */
export function detectCannibalization(queryRows, { minUrls = 2 } = {}) {
  const byQuery = new Map();
  for (const row of queryRows) {
    if (!row.query || !row.url) continue;
    if (!byQuery.has(row.query)) byQuery.set(row.query, []);
    byQuery.get(row.query).push(row);
  }
  const findings = [];
  for (const [query, rows] of byQuery) {
    const urls = [...new Set(rows.map((r) => r.url))];
    if (urls.length < minUrls) continue;
    findings.push({
      query,
      urls,
      positions: rows.map((r) => ({ url: r.url, position: r.position ?? null, impressions: r.impressions ?? 0 })),
    });
  }
  return findings;
}

/**
 * 🔴 ITEM 13 — REPORT EACH OVERLAP, NOT A COUNT, AND PRINT WHAT WAS SEARCHED.
 *
 * Every overlap with its query, its competing URLs and their positions, and the
 * number of queries searched beside the result (LAW-BOUND-1). MEASUREMENT ONLY:
 * the order is alphabetical by query, so nothing reads as a ranking, and no
 * line says what anyone should do (item 8's guard holds over this text).
 */
export function reportCannibalization({ findings, queriesSearched, rowsSearched, source }) {
  const lines = [
    `ITEM 13 — CANNIBALIZATION, MEASUREMENT ONLY. [bound: ${queriesSearched} queries searched · ${rowsSearched} query×page rows · ${source}]`,
    `${findings.length} of ${queriesSearched} queries drew impressions on more than one URL:`,
  ];
  for (const f of [...findings].sort((a, b) => a.query.localeCompare(b.query))) {
    lines.push(`  query: ${JSON.stringify(f.query)}  (${f.urls.length} URLs)`);
    for (const p of [...f.positions].sort((a, b) => a.url.localeCompare(b.url))) {
      lines.push(`     position ${p.position === null ? "—" : Number(p.position).toFixed(1)} · ${p.impressions} impression(s) · ${p.url}`);
    }
  }
  return lines;
}

/* ------------------------------------------------------------------ *
 * ITEM 26 — INTERNAL LINKS IN THE SERVED HTML.
 * ------------------------------------------------------------------ */

/**
 * 🔴 LAW-ABSENT-1, APPLIED TO LINKS.
 *
 * A link injected by JavaScript is invisible to a raw-HTML crawler. "We could
 * not see it" and "it is not there" are different facts, and this product
 * exists because somebody once collapsed two facts like those.
 *
 * Every record we hold is `renderMode: RAW_HTML`, so **a page with no inbound
 * edge is reported UNKNOWN, never "orphan"** — unless we can also show the page
 * carries no client-side routing at all, which we cannot from raw HTML.
 */
export const ORPHAN_LINK = registerCheck({
  id: "orphan-within-crawled-set",
  description:
    "A page with zero inbound edges inside the crawled set. Reported UNKNOWN, never as an orphan, " +
    "because renderMode is RAW_HTML and a JS-injected link would be invisible.",
  firingFixture: "a page with zero inbound edges — must produce an UNKNOWN finding",
  cleanControl: "a page with one inbound edge — must NOT fire at all",
  run({ page, observations, siteContext }) {
    const inbound = siteContext.inboundCount;
    if (inbound === undefined || inbound === null) {
      return unknown({
        issueClass: "orphan-within-crawled-set", canonicalUrl: page.canonical_url, reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "orphan-within-crawled-set", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: "no edge graph is available for this run",
      });
    }
    if (inbound > 0) return null;
    return unknown({
      issueClass: "orphan-within-crawled-set",
      canonicalUrl: page.canonical_url,
      /* 🔴 NEEDS_RENDERED_HTML, not a FAIL. We cannot see JS-injected links, and
       * the crawled set is a 394-page sample of a 240,328-URL site, so an
       * inbound link may simply live on a page we never fetched. */
      reasonCode: "NEEDS_RENDERED_HTML",
      evidence: observations.map((o) => o.observation_id),
      detector: "orphan-within-crawled-set",
      detectorVersion: "1",
      openedAt: siteContext.openedAt,
      summary:
        "zero inbound links INSIDE the crawled set. This is not an orphan: every record is RAW_HTML so a " +
        "JS-injected link is invisible, and the crawled set is 394 pages of a much larger site.",
    });
  },
});
