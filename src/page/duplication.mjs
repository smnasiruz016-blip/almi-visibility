/**
 * F32 · DUPLICATE, THIN AND TEMPLATE DETECTION — one client's pages measured against each other (acceptance _handoffs a0b9776, RR-87).
 *
 * Spec row: "Measure exact duplication, semantic overlap, shared-shell dominance and insufficient unique value."
 * V3 G15 and §13–§14: textual overlap is a REVIEW TRIGGER (above 40 percent), never a verdict; the final duplication judgement is
 * semantic, comparing intent, answer, facts, architecture, examples and user value; low overlap cannot rescue semantic duplication;
 * there is no fixed minimum length, and the 350-word threshold does not control.
 *
 * ── THE FOUR MEASURES, EACH WITH ITS STATED METHOD ──────────────────────────────────────────────────────────────────────
 *
 *   exact duplication     sha256 of the MAIN TEXT (shell.mjs extractBody → lower-cased words, space-joined); equal hashes group
 *   textual overlap       Jaccard similarity of 8-word shingles of the main text, per sibling pair; > 0.40 → REVIEW REQUIRED
 *   semantic duplication  ONLY from a recorded semantic review of the pair; none → NOT JUDGED, the missing review named
 *   shared-shell share    the share of a page's 8-word shingles (whole visible text, chrome kept) that occur on ANOTHER of the
 *                         client's measured pages; 1 → SHELL ONLY. No dominance threshold: V3 sets none, so none is invented.
 *
 * Unique value is never a word count: INSUFFICIENT only for an exact duplicate, a SHELL ONLY page, or a recorded review saying so.
 * Pure: detection only — it rejects, removes, merges, noindexes, publishes or writes nothing. The legacy audit checks
 * (src/audit/content-checks.mjs, their thresholds and Row 25's gate) are not read and not changed. No product is named here.
 */
import { createHash } from "node:crypto";
import { extractBody, visibleText, words, shingles, jaccard } from "../audit/shell.mjs";

export const OVERLAP_REVIEW_TRIGGER = 0.4;
export const SHINGLE_WORDS = 8;
export const METHODS = Object.freeze({
  exact: "sha256 of the main text: shell.mjs extractBody BODY, lower-cased words joined by one space",
  overlap: `Jaccard similarity of ${SHINGLE_WORDS}-word shingles of the main text, per sibling pair; above ${OVERLAP_REVIEW_TRIGGER * 100} percent triggers mandatory semantic review (V3 §14.2)`,
  shell: `share of the page's ${SHINGLE_WORDS}-word shingles of its whole visible text (chrome kept) that also occur on another of the client's measured pages`,
});
export const SEMANTIC_ASPECTS = Object.freeze(["intent", "answer", "facts", "architecture", "examples", "userValue"]);
export const MISSING = Object.freeze({
  REVIEW: "a recorded semantic review comparing intent, answer, facts, architecture, examples and user value (V3 §14.2) — none is recorded; none may be bought (no paid or metered call) or labelled (no new owner labels)",
  VALUE: "a recorded semantic review or information-gain record (V3 §13 distinct value, G12) — none is recorded",
});

const sha = (s) => createHash("sha256").update(s).digest("hex");
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** A review counts only when it compared every aspect V3 names; it may say DUPLICATE, or DISTINCT with documented distinct value. */
function reviewVerdict(review, overlapAbove) {
  if (!review) return { state: "NOT_JUDGED", missing: MISSING.REVIEW };
  if (!SEMANTIC_ASPECTS.every((a) => review.compared?.includes(a))) return { state: "NOT_JUDGED", missing: `the recorded review ${review.ref} does not compare ${SEMANTIC_ASPECTS.filter((a) => !review.compared?.includes(a)).join(", ")}` };
  if (review.duplicate === true) return { state: "DUPLICATE", ref: review.ref };
  if (review.duplicate === false) {
    if (overlapAbove && !review.documentedDistinctValue) return { state: "NOT_JUDGED", missing: `high textual overlap passes only with documented distinct value — the recorded review ${review.ref} documents none` };
    return { state: "DISTINCT", ref: review.ref };
  }
  return { state: "NOT_JUDGED", missing: `the recorded review ${review.ref} states no verdict` };
}

/**
 * @param {{ pages: { pageId: string, html: string|null, verified: boolean }[], reviews?: object[], valueRecords?: object[] }} input
 *   reviews:      recorded semantic reviews { pair: [idA, idB], compared: string[], duplicate: boolean, documentedDistinctValue?, ref }
 *   valueRecords: recorded unique-value judgements { pageId, insufficient: boolean, ref }
 */
export function detectDuplication({ pages, reviews, valueRecords }) {
  if (!Array.isArray(reviews) || !Array.isArray(valueRecords)) throw new TypeError("reviews and valueRecords must be passed explicitly — an empty list is a recorded fact, not a default");
  const notMeasured = [];
  const measured = [];
  for (const p of pages) {
    if (!p.verified || typeof p.html !== "string" || p.html === "") { notMeasured.push({ pageId: p.pageId, reason: p.verified ? "NO_STORED_BODY" : "BODY_NOT_VERIFIED" }); continue; }
    const body = extractBody(p.html);
    const main = body.confident ? words(body.bodyText).join(" ") : null;
    const visibleShingles = shingles(visibleText(p.html), SHINGLE_WORDS);
    measured.push({ pageId: p.pageId, main, mainWhy: body.confident ? null : body.reason ?? "UNRECOGNISED_LAYOUT", mainShingles: main === null ? null : shingles(main, SHINGLE_WORDS), visibleShingles });
  }

  /* C1 — exact duplication of the main text */
  const byHash = new Map();
  for (const m of measured) if (m.main !== null) { const h = sha(m.main); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(m.pageId); }
  const exactGroups = [...byHash.values()].filter((g) => g.length > 1).map((g) => Object.freeze([...g].sort()));
  const inExact = new Set(exactGroups.flat());

  /* C2 / C3 — every sibling pair: textual overlap as a trigger, semantic duplication only on a recorded review */
  const reviewOf = new Map(reviews.map((r) => [pairKey(r.pair[0], r.pair[1]), r]));
  const pairs = [];
  for (let i = 0; i < measured.length; i++) for (let j = i + 1; j < measured.length; j++) {
    const a = measured[i], b = measured[j];
    const overlap = a.mainShingles && b.mainShingles ? jaccard(a.mainShingles, b.mainShingles) : null;
    const textual = overlap === null ? "NOT_MEASURED" : overlap > OVERLAP_REVIEW_TRIGGER ? "REVIEW_REQUIRED" : "BELOW_TRIGGER";
    pairs.push(Object.freeze({ pair: Object.freeze([a.pageId, b.pageId]), overlap, textual, semantic: Object.freeze(reviewVerdict(reviewOf.get(pairKey(a.pageId, b.pageId)), textual === "REVIEW_REQUIRED")) }));
  }

  /* C4 — shared-shell share, measured by recurrence across the client's measured pages */
  const seenOn = new Map();
  for (const m of measured) for (const s of m.visibleShingles) seenOn.set(s, (seenOn.get(s) ?? 0) + 1);
  const valueOf = new Map(valueRecords.map((v) => [v.pageId, v]));

  const perPage = measured.map((m) => {
    const total = m.visibleShingles.size;
    const shared = [...m.visibleShingles].filter((s) => seenOn.get(s) > 1).length;
    const shellShare = total === 0 ? null : shared / total;
    const shell = shellShare === null ? "NOT_MEASURED" : shellShare === 1 ? "SHELL_ONLY" : "HAS_UNIQUE_TEXT";
    const mine = pairs.filter((p) => p.pair.includes(m.pageId));
    const semantic = mine.some((p) => p.semantic.state === "DUPLICATE") ? "DUPLICATE" : mine.length && mine.every((p) => p.semantic.state === "DISTINCT") ? "DISTINCT" : "NOT_JUDGED";
    /* C5 — unique value: never a word count */
    const exact = m.main === null ? "NOT_MEASURED" : inExact.has(m.pageId) ? "EXACT_DUPLICATE" : "NOT_EXACT_DUPLICATE";
    const rec = valueOf.get(m.pageId);
    const uniqueValue = exact === "EXACT_DUPLICATE" ? { state: "INSUFFICIENT", basis: "EXACT_DUPLICATE" }
      : shell === "SHELL_ONLY" ? { state: "INSUFFICIENT", basis: "SHELL_ONLY" }
      : rec && typeof rec.insufficient === "boolean" ? { state: rec.insufficient ? "INSUFFICIENT" : "SUFFICIENT", basis: rec.ref }
      : { state: "NOT_JUDGED", missing: MISSING.VALUE };
    return Object.freeze({
      pageId: m.pageId,
      exact: exact === "NOT_MEASURED" ? Object.freeze({ state: exact, why: m.mainWhy }) : Object.freeze({ state: exact }),
      reviewRequiredPairs: mine.filter((p) => p.textual === "REVIEW_REQUIRED").length,
      semantic: semantic === "NOT_JUDGED" ? Object.freeze({ state: semantic, missing: MISSING.REVIEW }) : Object.freeze({ state: semantic }),
      shell: Object.freeze({ state: shell, share: shellShare, method: METHODS.shell }),
      uniqueValue: Object.freeze(uniqueValue),
    });
  });

  const count = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
  return Object.freeze({
    methods: METHODS,
    exactGroups: Object.freeze(exactGroups),
    pairs: Object.freeze(pairs),
    pages: Object.freeze(perPage),
    notMeasured: Object.freeze(notMeasured),
    summary: Object.freeze({
      population: pages.length,
      measured: measured.length,
      notMeasured: count(notMeasured, (x) => x.reason),
      exact: count(perPage, (p) => p.exact.state),
      exactGroups: exactGroups.length,
      pairs: pairs.length,
      textual: count(pairs, (p) => p.textual),
      semantic: count(pairs, (p) => p.semantic.state),
      shell: count(perPage, (p) => p.shell.state),
      uniqueValue: count(perPage, (p) => p.uniqueValue.state),
    }),
  });
}
