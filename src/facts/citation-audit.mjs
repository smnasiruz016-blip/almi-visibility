/**
 * F46 · SOURCE INTEGRITY AND CITATION AUDIT (acceptance _handoffs 2e76216, RR-96).
 *
 * Spec row: "Verify that claims cite the correct authority and do not borrow support from the wrong subject or scope." Owner RR-96: the
 * checks are SEPARATE, never one score; a working link is not a correct citation; FIT is a judgement, never a string match.
 *
 *   LINK         the RECORDED link check — WORKED · FAILED · NOT_MEASURED ("could-not-check" is not a dead link: a fetch that fails is a
 *                fact about the checker — the law of src/audit/source-integrity.mjs)
 *   QUOTATION    the RECORDED quotation match — MATCHED · MISMATCHED · NOT_APPLICABLE (no quotation recorded for the fact) · NOT_MEASURED
 *   FINGERPRINT  the RECORDED fingerprint check — MATCHED · MISMATCHED · NOT_MEASURED
 *   AUTHORITY    V3 §10.1 + §10.3 — ADMISSIBLE (primary official, or SECONDARY VERIFIED, with a recorded verification date) ·
 *                NOT_ADMISSIBLE · NOT_MEASURED (tier or date unrecorded, or the two recorded tiers disagree)
 *   FIT          RR-283 (owner decision 3, C3 as amended): stands on the VERBATIM OFFICIAL TEXT — CONFIRMED only from a matched
 *                word-for-word quotation of the source, REFUTED only by a recorded CONFLICT, otherwise CHECKED_NOT_FOUND (what was not
 *                found, the pages checked, the date); the recorded verdict reported beside it. No person is required. Nothing compares words.
 *
 * Every outcome is a DATED RECORDING, never a fresh check. Citation verdict: PROVED only when every applicable check passed and FIT is
 * CONFIRMED; DISPROVED on any recorded failure; otherwise COULD-NOT-PROVE. Pure: no fetch, no write. Names no product.
 */

import { sourceTierOfFact } from "../evidence/source-tiers.mjs";

export const CITATION = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
const ADMISSIBLE_TIERS = Object.freeze(["OFFICIAL", "SECONDARY_VERIFIED", "SECONDARY VERIFIED"]);
const day = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** A recorded outcome string → a result. An unrecognised or absent outcome fails closed: NOT_MEASURED. */
function recorded(outcome, { pass, fail, notApplicable = false }) {
  const o = String(outcome ?? "").toLowerCase();
  if (o === "pass") return pass;
  if (o === "fail" || o === "failed" || o === "mismatch") return fail;
  if (notApplicable && o === "not-applicable") return "NOT_APPLICABLE";
  return "NOT_MEASURED";
}

export function linkCheck(f) {
  return { result: recorded(f?.checks?.linkCheckOutcome, { pass: "WORKED", fail: "FAILED" }), recordedOn: day(f?.checks?.linkCheckedOn) };
}
export function quotationCheck(f) {
  return { result: recorded(f?.checks?.quoteMatchOutcome, { pass: "MATCHED", fail: "MISMATCHED", notApplicable: true }), recordedOn: day(f?.checks?.quoteMatchedOn) };
}
export function fingerprintCheck(f) {
  return { result: recorded(f?.checks?.fingerprintOutcome, { pass: "MATCHED", fail: "MISMATCHED" }), recordedOn: day(f?.checks?.fingerprintCheckedOn) };
}

export function authorityCheck(f) {
  const num = f?.source?.tier ?? null, named = f?.verification?.sourceTier ?? null;
  if (num === null && named === null) return { result: "NOT_MEASURED", missing: "a recorded source tier" };
  /* the engine's ONE reader of a fact's tier (src/evidence/source-tiers.mjs) — the numeric tier is mapped by it, never by a copy here */
  let tier, fromNumber = null;
  try {
    tier = sourceTierOfFact(f);
    if (num !== null) fromNumber = sourceTierOfFact({ source: { tier: num } });
  } catch (e) {
    return { result: "NOT_ADMISSIBLE", reason: e.message.includes("holds no evidence tier") ? "a first-party capability claim holds no evidence tier" : "an unrecognised recorded tier" };
  }
  if (named !== null && fromNumber !== null && fromNumber !== named) return { result: "NOT_MEASURED", missing: "one recorded source tier — the named and numeric tiers disagree" };
  if (!ADMISSIBLE_TIERS.includes(tier)) return { result: "NOT_ADMISSIBLE", tier };
  if (!day(f?.verification?.checkedOn)) return { result: "NOT_MEASURED", missing: "a recorded verification date (V3 §10.3)" };
  return { result: "ADMISSIBLE", tier };
}

/**
 * FIT — RR-283, owner decision 3 (F46 C3 as amended, _handoffs AlmiVisibility_F46_F62_ACCEPTANCE_AMENDMENT_DECISION_3_2026-10-17.md): a
 * verdict stands on the verbatim official text, or it is CHECKED_NOT_FOUND. CONFIRMED only when the record's word-for-word quotation of
 * its source was matched; REFUTED only by a recorded CONFLICT (the official text states otherwise); anything the official text was not
 * found to state is CHECKED_NOT_FOUND — what was not found, the page(s) checked and the date — never REFUTED, never inferred. Who checked
 * is never a condition. Nothing compares words: the recorded quote match decides.
 */
export function fitCheck(f) {
  const v = f?.verification ?? null;
  const beside = v?.verdict ? { recordedVerdict: v.verdict } : {};
  if (v?.verdict === "CONFLICT") return { result: "REFUTED", ...beside };
  const q = quotationCheck(f);
  const pages = [...new Set([f?.source?.url, v?.sourceUrl].filter((u) => typeof u === "string" && u !== ""))];
  const notFound = (what) => ({ result: "CHECKED_NOT_FOUND", notFound: pages.length ? what : `${what} — no source page is recorded for it`, pagesChecked: pages, on: q.recordedOn ?? day(v?.checkedOn), ...beside });
  if ((v?.elementsNotFoundKeys ?? []).length > 0) return notFound(`the official text does not state: ${v.elementsNotFoundKeys.join(", ")}`);
  if (q.result === "MATCHED") return { result: "CONFIRMED", on: q.recordedOn, ...beside };
  return notFound(q.result === "MISMATCHED" ? "the recorded quotation, word for word, in the official text" : "a word-for-word quotation of the official text that states it");
}

const FAILURES = new Set(["FAILED", "MISMATCHED", "NOT_ADMISSIBLE", "REFUTED"]);

export function auditCitation(f) {
  const checks = { link: linkCheck(f), quotation: quotationCheck(f), fingerprint: fingerprintCheck(f), authority: authorityCheck(f), fit: fitCheck(f) };
  const results = Object.values(checks).map((c) => c.result);
  const proved = checks.link.result === "WORKED" && ["MATCHED", "NOT_APPLICABLE"].includes(checks.quotation.result) && checks.fingerprint.result === "MATCHED" && checks.authority.result === "ADMISSIBLE" && checks.fit.result === "CONFIRMED";
  const verdict = results.some((r) => FAILURES.has(r)) ? CITATION.DISPROVED : proved ? CITATION.PROVED : CITATION.COULD_NOT_PROVE;
  return Object.freeze({ id: f?.id ?? null, checks, verdict });
}

/** The registry: each check's population counted separately — never a score. */
export function auditCitations(records) {
  const active = records.filter((f) => f?.life?.status !== "retired");
  const rows = active.map((f) => auditCitation(f));
  const count = (k) => rows.reduce((m, r) => ((m[r.checks[k].result] = (m[r.checks[k].result] ?? 0) + 1), m), {});
  return Object.freeze({
    rows,
    link: count("link"), quotation: count("quotation"), fingerprint: count("fingerprint"), authority: count("authority"), fit: count("fit"),
    fitRecordedVerdictsBeside: rows.reduce((m, r) => (r.checks.fit.recordedVerdict ? ((m[r.checks.fit.recordedVerdict] = (m[r.checks.fit.recordedVerdict] ?? 0) + 1), m) : m), {}),
    verdicts: rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {}),
    recordedOn: [...new Set(rows.flatMap((r) => [r.checks.link.recordedOn, r.checks.quotation.recordedOn, r.checks.fingerprint.recordedOn]).filter(Boolean))].sort(),
    facts: rows.length,
  });
}
