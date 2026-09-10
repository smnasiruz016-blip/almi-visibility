/**
 * THE PAGE FINGERPRINT — automated freshness for a source we may NOT quote.
 *
 * ══ THE PROBLEM IT SOLVES ══════════════════════════════════════════════════
 *
 * The nightly quote match needs a stored `quotedSpan`. **Four of our six
 * sources may never have one.** So for most of the registry the match can never
 * run and freshness collapses to a person re-reading a page twice a year.
 *
 * And it compounds with A1. Two independent filters, and they are NOT the same
 * filter:
 *
 *   A1  can a machine FETCH it?      2 of 8
 *   this may we STORE its words?     1 of 6 fully
 *
 * A source has to pass BOTH before its freshness can be machine-checked, and
 * the intersection is smaller than either.
 *
 * ══ THE WAY OUT, AND IT COSTS NOTHING ══════════════════════════════════════
 *
 *   🔴 WE DO NOT NEED TO STORE THEIR WORDS TO DETECT THAT THEIR WORDS CHANGED.
 *   Fetch the page, hash it, store ONLY THE HASH.
 *
 * A cryptographic hash is a one-way digest. The original cannot be recovered
 * from it, it cannot substitute for the work, and it is not a copy — so storing
 * one is neither reproduction nor storage of the Content. It converts a CALENDAR
 * obligation into an EVENT one:
 *
 *   hash unchanged -> the source has not moved; the fact is PRESUMPTIVELY intact
 *   hash changed   -> 🔴 a person looks. The machine decides WHEN TO LOOK, never
 *                     what changed, and never whether the fact is still true.
 *
 * ⚠️ NEITHER I NOR THE OWNER IS A LAWYER, AND THIS IS THE ONE MECHANISM HERE
 * THAT REASONS ABOUT A LICENCE RATHER THAN OBEYING ONE. The reasoning is
 * standard, and where money meets a licensor's rights the owner may want it
 * confirmed by somebody qualified before it ships. It is implemented and it is
 * flagged; it is not presented as settled.
 *
 * ══ 🔴 AND THE MEASUREMENT THAT DECIDES WHETHER IT WORKS AT ALL ════════════
 *
 * A fingerprint is worthless if it changes on its own. A page carrying a
 * timestamp, a rotating banner, a CSRF token or a build id would trip every
 * night, produce a permanent queue of false flags, and be switched off inside a
 * week — the classic gate that gets disabled rather than fixed.
 *
 * SO IT WAS MEASURED BEFORE IT WAS BUILT. Each of the registry's 9 distinct
 * source URLs was fetched TWICE in succession, 11 September 2026:
 *
 *   raw HTML hash stable          🔴 3 of 9   — six pages differ between fetches
 *   NORMALISED text hash stable      9 of 9
 *
 * **The idea only works because of the normalisation, and without that
 * measurement it would have looked like it worked and failed in production.**
 * That is why `pageFingerprint` hashes `normaliseText(body)` and never the raw
 * response — the same normaliser the quote match uses, so the two can never
 * drift apart.
 *
 * ⚠️ n=9, two fetches, one moment. It shows these pages are not trivially
 * unstable. It does NOT establish that they are stable over days, and a page
 * that turns out to churn must be recorded as churning rather than have its
 * threshold loosened until it goes quiet.
 */
import { createHash } from "node:crypto";
import { normaliseText } from "./quote-match.mjs";

/** Length-prefixed so two different pages cannot collide by concatenation. */
export function pageFingerprint(body) {
  const text = normaliseText(body);
  return {
    hash: createHash("sha256").update(`${text.length}:${text}`, "utf8").digest("hex"),
    normalisedLength: text.length,
  };
}

/**
 * Compare a stored fingerprint against a freshly fetched page.
 *
 * Returns the SAME four outcomes as the quote match, deliberately. A refusal is
 * `could-not-check` here exactly as it is there, and a source we have no
 * fingerprint for yet is `could-not-check` rather than a silent pass — a first
 * run must not look like a successful verification.
 */
export function matchFingerprint(record, fetched) {
  const id = record?.id ?? "(no id)";
  const stored = record?.pageFingerprint ?? null;

  if (!fetched || fetched.ok !== true) {
    return { id, outcome: "could-not-check", detail: fetched?.detail ?? "the source could not be fetched" };
  }
  const fresh = pageFingerprint(fetched.body);

  // 🔴 The link-check floor applies here too. A parked domain serving a 114-byte
  // JavaScript redirect hashes perfectly consistently, and a fingerprint that
  // went green on it would be the most confident wrong answer in the system.
  if (fresh.normalisedLength < MIN_SUBSTANTIVE_LENGTH) {
    return {
      id,
      outcome: "could-not-check",
      detail: `the page returned only ${fresh.normalisedLength} characters of text — too little to be the source document`,
      hash: fresh.hash,
    };
  }
  if (stored === null) {
    return { id, outcome: "could-not-check", detail: "no fingerprint stored yet — this run establishes one", hash: fresh.hash };
  }
  return stored === fresh.hash
    ? { id, outcome: "pass", detail: "the page has not changed since the fingerprint was taken", hash: fresh.hash }
    : {
        id,
        outcome: "fail",
        // Deliberately narrow. This is the limit of what a hash can say, and
        // overstating it here is how "the page moved" becomes "the fact
        // changed" in a report somebody skims.
        detail: "🔴 THE PAGE HAS CHANGED. A person must re-read it. This does NOT say the fact changed, or what moved",
        hash: fresh.hash,
      };
}

/**
 * 🔴 THE FLOOR THAT `nmcnigeria.org` BOUGHT.
 *
 * `nmcnigeria.org` — the domain a reasonable person GUESSES for the Nigerian
 * regulator — returns **HTTP 200** and a 114-byte body whose entire content is
 * a JavaScript redirect to a parking lander. Normalised, that is **0 characters
 * of text**.
 *
 * **A link check that asks only "did it return 200" PASSES ON IT.** So does a
 * fingerprint check, forever, because a parked page is beautifully stable.
 *
 * The floor is set from the measured sample: the smallest REAL source document
 * in the registry normalises to **3,535 characters** (oet.com's IP policy) and
 * the parked domain to **0**. 500 sits well below every real page and far above
 * the failure. ⚠️ PROVISIONAL, n=10, and it carries its sample: it is a gap in
 * one measured distribution, not a considered threshold. A real source that
 * normalises below it must move the floor, with its own measurement.
 */
export const MIN_SUBSTANTIVE_LENGTH = 500;
