/**
 * FRESHNESS — AND FOR ONE SOURCE IT IS NOT HYGIENE, IT IS THE LICENCE.
 *
 * ══ THE FINDING THIS MODULE EXISTS FOR ═════════════════════════════════════
 *
 * NMC clause 6.3's FIRST condition, verbatim:
 *
 *     "ensure that you are using the most up-to-date version of any source
 *      document"
 *
 * 🔴 THAT IS A CONDITION OF THE PERMISSION, NOT A QUALITY TARGET.
 *
 * The whole freshness model was designed as data hygiene: a stale fact is a bad
 * fact, somebody should look at it, a page shows an old number for a while. For
 * NMC-sourced quotes that framing is WRONG. A stale NMC quote is not a
 * low-quality record — **it is their content reproduced outside the terms that
 * allowed us to reproduce it.** The permission was conditional and the
 * condition has lapsed.
 *
 * So expiry here cannot be advisory, and it cannot be a flag on a report that
 * somebody reads on Tuesday. **The quote has to STOP BEING USABLE BY ITSELF.**
 *
 * ══ AND THE MECHANISM IS ALREADY BUILT — IT JUST HAD THE WRONG JOB ═════════
 *
 * The nightly quote match fetches the live page and confirms the stored span is
 * still verbatim on it. For a hygiene model that is a staleness check. **For
 * NMC-6.3 it is the compliance mechanism itself**: a span that still matches the
 * live document IS the most up-to-date version, demonstrated rather than
 * assumed. So a passing match RENEWS the permission.
 *
 * ⚠️ AND EXTRACTION COUNTS TOO, which I had wrong at first. The span was taken
 * off the live page on the day it was extracted, and that is exactly what
 * clause 6.3 asks for. So the clock runs from whichever demonstration is later,
 * and `quoteUsableNow` REPORTS WHICH — "confirmed by a machine last week" and
 * "typed in by somebody last week" are not equal evidence and must not read the
 * same in a report.
 *
 * A FAILING match is not a demonstration and never renews anything. A record
 * with no demonstration inside the window has its quote withdrawn until it gets
 * one.
 */
import { FACT_FRESHNESS_DAYS } from "./schema.mjs";
import { requiresCurrentVersion } from "./licences.mjs";

const daysBetween = (iso, now) =>
  iso === null || iso === undefined ? null : Math.floor((now.getTime() - new Date(iso + "T00:00:00Z").getTime()) / 86_400_000);

/**
 * 🔴 MAY THIS RECORD'S STORED QUOTE BE USED TODAY?
 *
 * Not "is it fresh". **May it lawfully be used.** The two questions coincide for
 * most sources and come apart for any licence whose permission is conditional on
 * currency.
 *
 * @returns {{usable: boolean, reason: string, legal: boolean, ageDays: number|null}}
 *   `legal: true` means a refusal here is a LICENCE limit, not a quality one —
 *   so a caller can never present it to a reader as "this fact is a bit old".
 */
export function quoteUsableNow(record, now = new Date()) {
  const span = record?.evidence?.quotedSpan;
  if (typeof span !== "string" || span.trim() === "") {
    return { usable: false, reason: "there is no stored quote", legal: false, ageDays: null };
  }
  if (record?.sourceQuotable !== true) {
    return { usable: false, reason: "the licence does not permit a stored quote at all", legal: true, ageDays: null };
  }

  const window = record?.freshness?.days ?? FACT_FRESHNESS_DAYS;
  // 🔴 WHAT COUNTS AS A DEMONSTRATION OF CURRENCY, AND IT IS NOT ONLY A MATCH.
  //
  // A passing quote match is the strongest demonstration: the stored span was
  // confirmed against the live document on that day. But EXTRACTION is also one
  // — the span was taken off the live page at that moment, which is precisely
  // what clause 6.3 asks for. So the clock runs from whichever happened later,
  // and the record says which, because "confirmed by a machine last week" and
  // "typed in by somebody last week" are not equally strong and must not read
  // the same in a report.
  const matched = record?.checks?.quoteMatchOutcome === "pass" ? record?.checks?.quoteMatchedOn ?? null : null;
  const extracted = record?.life?.extractedOn ?? null;
  const lastDemonstrated = [matched, extracted].filter(Boolean).sort().at(-1) ?? null;
  const basis = lastDemonstrated === null ? "none" : lastDemonstrated === matched ? "a passing quote match against the live document" : "the extraction, when the span was taken off the live page";
  const age = daysBetween(lastDemonstrated, now);

  if (!requiresCurrentVersion(record?.licence)) {
    // An ordinary licence. Age is a data-quality signal and nothing more, so the
    // quote stays usable and staleness is reported elsewhere.
    return { usable: true, reason: "the licence attaches no currency condition", legal: false, ageDays: age, basis };
  }

  if (age === null) {
    return {
      usable: false,
      reason: `${record.licence} requires the most up-to-date version and currency has NEVER been demonstrated for this quote — no passing match and no extraction date`,
      legal: true,
      ageDays: null,
    };
  }
  if (age > window) {
    return {
      usable: false,
      // Worded so it can never be reported as a freshness nag.
      reason: `🔴 LICENCE CONDITION LAPSED — ${record.licence} permits reproduction only while using the most up-to-date version, and currency was last demonstrated ${age} days ago by ${basis} (window ${window}). The quote is WITHDRAWN, not merely stale`,
      legal: true,
      ageDays: age,
    };
  }
  return {
    usable: true,
    reason: `currency demonstrated ${age} days ago by ${basis}, within the ${window}-day window`,
    legal: true,
    ageDays: age,
  };
}

/**
 * The quote as it may be rendered TODAY, or null.
 *
 * 🔴 ANYTHING THAT PUTS A QUOTE IN FRONT OF A READER MUST COME THROUGH HERE.
 * Reading `record.evidence.quotedSpan` directly is how an out-of-licence
 * reproduction reaches a page — the field is still populated, it just may no
 * longer be used, and nothing about the string itself says so.
 */
export function renderableQuote(record, now = new Date()) {
  const verdict = quoteUsableNow(record, now);
  return verdict.usable ? { span: record.evidence.quotedSpan, attribution: record.attributionStatement } : null;
}

/**
 * Every record whose quote may not be used today, split by WHY.
 *
 * The two lists are never added together: one is a compliance failure that has
 * to be fixed or the quote dropped, the other is the ordinary state of a source
 * we were never allowed to quote in the first place.
 */
export function quoteUsability(records = [], now = new Date()) {
  const withdrawn = [];
  const neverQuotable = [];
  const usable = [];
  for (const r of records) {
    const v = quoteUsableNow(r, now);
    if (v.usable) usable.push({ id: r.id, ...v });
    else if (r?.sourceQuotable === true) withdrawn.push({ id: r.id, ...v });
    else neverQuotable.push({ id: r.id, ...v });
  }
  return { usable, withdrawn, neverQuotable };
}
