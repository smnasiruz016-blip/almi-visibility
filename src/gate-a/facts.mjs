/**
 * VERIFIED FACTS — the counting standard, and the one thing this gate cannot do.
 *
 * A fact counts only when ALL FOUR fields are present:
 *   value · source URL · source tier · verified date
 *
 * Threshold: >= 5 per page.
 *
 * ── 🔴 THE CORRECTION THAT MUST NOT BE PAPERED OVER ─────────────────────────
 *
 * The design first said a fact needs "a resolvable URL that SUPPORTS this
 * specific value". That is TWO claims pretending to be one, and only one of them
 * is machine-checkable:
 *
 *   the URL RESOLVES — 200, not a home page, not a redirect to one   ✅ checkable
 *   the page at it SUPPORTS this claim                               ❌ NOT TODAY
 *
 * So: **A FACT WHOSE URL OPENED HAS PASSED A LINK CHECK. IT HAS NOT PASSED A
 * FACT CHECK.** This module keeps the two apart and never prints "verified" for
 * something only link-checked — because if it blurred them, `verifiedDate` would
 * quietly come to mean "the date somebody pasted a link".
 *
 * What closes the gap, written down so it is not forgotten: a PERSON OR A MODEL
 * READS THE SOURCE AND RECORDS THAT THEY SAW THIS VALUE THERE. That is what a
 * verified date was always supposed to mean.
 *
 * ── D5 · SHELL FACTS DO NOT COUNT ───────────────────────────────────────────
 *
 * A fact whose value lives in the shared shell is excluded. Otherwise every page
 * in the network starts at four or five facts and the check is measuring the
 * TEMPLATE again — the same illness as computing overlap on raw text.
 */

/** D4 · the tier vocabulary, ruled 10 September 2026. */
export const TIERS = Object.freeze({
  1: "primary — the body that decides the fact, on its own site",
  2: "official secondary — another official body restating it",
  3: "reputable third party — a well-known publication",
});

/**
 * 🔴 D4 · HOW OLD A VERIFIED DATE MAY BE. ONE WINDOW, EVERY TIER.
 *
 * This constant exists because the rule referring to it did not. The design
 * rejected a fact whose verified date was "older than the freshness window for
 * its tier" — and NO WINDOW HAD EVER BEEN WRITTEN FOR ANY TIER. A rule that
 * refers to a constant that does not exist cannot run, and this one had not.
 *
 * ⚠️ DELIBERATELY NOT PER-TIER, however reasonable "a third-party guide goes
 * stale faster than a regulator's page" sounds. NOBODY HAS MEASURED how fast any
 * of these sources actually change. Splitting the window by tier without that
 * measurement is a knob with no evidence behind it — and Rule Eight applies to a
 * plausible argument exactly as it applies to an implausible one.
 *
 * ⚠️ PROVISIONAL. What replaces it: re-fetch a sample of tier-1 and tier-3
 * sources at intervals, record how often the value changes, and let MEASURED
 * change frequency set the windows. If they come out equal, that is a result too.
 */
export const FACT_FRESHNESS_DAYS = 180;

export const MIN_FACTS = 5;

/** Is this URL usable as a source at all — before anyone has fetched it? */
export function urlShapeProblem(url) {
  if (typeof url !== "string" || url.trim() === "") return "no source URL";
  let u;
  try {
    u = new URL(url);
  } catch {
    return "source URL does not parse";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return `source URL is not http(s): ${u.protocol}`;
  // A bare home page cannot support a specific claim. This is a SHAPE rule and
  // it is honest about being one — it is not evidence that the page says
  // anything.
  if ((u.pathname === "/" || u.pathname === "") && !u.search) return "source URL is a bare home page, not the page carrying the claim";
  return null;
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Judge one fact record.
 *
 * @param {{ value?: unknown, sourceUrl?: string, tier?: number, verifiedDate?: string,
 *           linkChecked?: boolean, inShell?: boolean }} fact
 * @param {Date} now
 */
export function judgeFact(fact, now = new Date()) {
  const reasons = [];
  const { value, sourceUrl, tier, verifiedDate, inShell } = fact ?? {};

  if (value === undefined || value === null || String(value).trim() === "") reasons.push("no value");
  const urlProblem = urlShapeProblem(sourceUrl);
  if (urlProblem) reasons.push(urlProblem);
  /* FS-A1 (RTP-1 Rev 6 S39, D2): a tier-4 source counts for an ORDINARY claim it supports (rendered SECONDARY), never for a body's rule */
  const ordinaryTier4 = Number(tier) === 4 && fact?.claimStates === "OTHER";
  if (!Object.prototype.hasOwnProperty.call(TIERS, String(tier)) && !ordinaryTier4) reasons.push(`tier is ${JSON.stringify(tier)}, not one of 1, 2, 3 (tier 4 only for an ordinary claim, FS-A1)`);

  if (typeof verifiedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(verifiedDate)) {
    reasons.push("no verified date (ISO yyyy-mm-dd)");
  } else {
    const age = daysBetween(new Date(verifiedDate + "T00:00:00Z"), now);
    if (age > FACT_FRESHNESS_DAYS) reasons.push(`verified ${age} days ago, window is ${FACT_FRESHNESS_DAYS}`);
    if (age < 0) reasons.push("verified date is in the future");
  }

  // D5. Excluded from the count, and the reason is named so it does not read as
  // a defect in the fact itself.
  if (inShell === true) reasons.push("value is part of the shared shell — shell facts do not count towards a page's five");

  return { counts: reasons.length === 0, reasons };
}

/**
 * Count the qualifying facts on a page, and report the two checks SEPARATELY.
 *
 * `linkChecked` is whatever a fetch established. It is reported, never conflated
 * with the fact being verified.
 */
export function countFacts(facts = [], now = new Date()) {
  const judged = facts.map((f) => ({ fact: f, ...judgeFact(f, now) }));
  const qualifying = judged.filter((j) => j.counts);
  return {
    total: facts.length,
    qualifying: qualifying.length,
    passes: qualifying.length >= MIN_FACTS,
    // Two columns, never one. See the header.
    linkChecked: facts.filter((f) => f?.linkChecked === true).length,
    factChecked: 0, // 🔴 ALWAYS ZERO TODAY. Nothing in this pipeline reads a source and confirms a value.
    rejected: judged.filter((j) => !j.counts),
  };
}
