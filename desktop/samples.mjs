/**
 * RR-323 · ORIGINAL PRACTICE SAMPLES (owner decision 4) — written by the client's AI for the client's product, following the format and the
 * timing the subject's OWN pages state (sourced, dated); each one labelled "practice sample written by <the product>, not an official
 * <subject> paper"; NEVER a copy of the subject's, E2's, Benchmark's or anyone's sample.
 *   THE CHECK (every sample, before its page can be a ready draft):
 *     · ORIGINAL   no run of 8 consecutive words shared with any page Visibility read for the subject (its pages' 8-word sequences are kept
 *                  as hashes only — never their words), nor with a licence-barred page (config/licence-withheld-shingles.json) — the same
 *                  code as the RR-288 census (src/facts/licence-guard.mjs R5)
 *     · NO BRAND   no other provider's name, no "official paper / sample" claim, no copyright line
 *     · LABELLED   the label is on it
 *     · THE FORMAT the subject's own facts: a Writing letter inside the stated word range, case notes, a role-play card with its tasks,
 *                  Listening / Reading questions with their answers
 *   LIMIT (said on the screen): the subject's official sample papers sit behind a download form Visibility does not open, and paid
 *   providers' material is not read — the check proves "no passage of anything Visibility read"; the instruction to the AI forbids the rest.
 * Pure: the hashes and the facts are handed in.
 */
import { longestRun, shingleHashes, wordsOf, SHINGLE } from "../src/facts/licence-guard.mjs";

/** RR-324 D2 · the product's proper DISPLAY NAME ("AlmiOET"), as the client sets it — a page shows a sample with the name of today, never a frozen one */
export const displayNameOf = (product) => String(product?.displayName ?? product?.name ?? "").trim() || "this site";
export const labelOf = (by, subject) => `Practice sample written by ${by}, not an official ${subject} paper`;
const BRANDS = /\b(e2 ?language|e2 ?oet|e2 test ?prep|benchmark (education|oet)|edubenchmark|kaplan|swoosh|cambridge boxhill|cbla|oet official sample|official (oet )?(sample|paper|test material)|©|copyright|all rights reserved)\b/i;
const textOf = (s) => [s.title, s.task, ...(s.caseNotes ?? []), s.letter, s.card?.setting, s.card?.role, ...(s.card?.tasks ?? []), s.script, s.text, ...(s.questions ?? []).flatMap((q) => [q.q, ...(q.options ?? []), q.answer])].filter(Boolean).join("\n");

/** the format a sample of this sub-test must have — from the subject's own facts where they state it */
export function formatFaults(sample, subtest, facts = {}) {
  const out = [], w = (x) => wordsOf(x).length;
  if (subtest === "Writing") {
    const [lo, hi] = (facts.writingWords?.value ?? []).map(Number), n = w(sample.letter);
    if (!sample.letter) out.push("no model letter"); else if (lo && hi && (n < lo - 10 || n > hi + 30)) out.push(`the model letter is ${n} words (the subject's own page: ${lo}–${hi})`);
    if ((sample.caseNotes ?? []).length < 6) out.push(`${(sample.caseNotes ?? []).length} case-note lines (at least 6)`);
    if (!sample.task) out.push("no task");
  } else if (subtest === "Speaking") {
    if (!sample.card?.setting || (sample.card?.tasks ?? []).length < 3) out.push("the role-play card needs a setting and at least 3 tasks");
  } else if (subtest === "Listening" || subtest === "Reading") {
    const body = subtest === "Listening" ? sample.script : sample.text;
    if (w(body) < 120) out.push(`the ${subtest === "Listening" ? "script" : "text"} is ${w(body)} words (at least 120)`);
    const qs = sample.questions ?? []; if (qs.length < 5 || qs.some((q) => !q.q || !q.answer)) out.push(`${qs.length} questions, each needs its answer (at least 5)`);
  }
  return out;
}

/**
 * the check. `read` = the hashes of every page Visibility read for the subject (shingleHashes of each, merged); `barred` = the licence-barred
 * pages' hashes. → { ok, why, run, words, labelled, brand, format: [...] } — counts only, never a shared passage's words.
 */
export function checkSample(sample, { subtest, by, subject, read = new Set(), barred = new Set(), facts = {} }) {
  const text = textOf(sample ?? {}), label = labelOf(by, subject);
  const run = Math.max(longestRun(text, read), longestRun(text, barred)), brand = BRANDS.exec(text)?.[0] ?? null;
  const labelled = String(sample?.label ?? "") === label, format = formatFaults(sample ?? {}, subtest, facts);
  const why = [run >= SHINGLE ? `${run} words in a row match a page Visibility read — not original` : null, brand ? `names "${brand}"` : null, labelled ? null : "the label is missing", ...format].filter(Boolean);
  return { ok: why.length === 0, why: why.join("; ") || null, run, words: wordsOf(text).length, labelled, brand, format };
}
/** the hashes of the pages read (merged) — kept instead of their words */
export const hashesOfPages = (pages) => { const all = new Set(); for (const p of pages ?? []) if (p?.ok && p.text) for (const h of shingleHashes(p.text)) all.add(h); return all; };
