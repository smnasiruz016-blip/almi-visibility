/**
 * 🔴 RR-377 (owner, 6 Nov 2026): answers found false after they were kept. Taken out of every kept file, never taken back from
 * AlmiSEO Data (the server refuses them too), never shown or published on a page that still holds them, and those pages are rebuilt.
 * A corrected answer, checked by hand on its source, may stand in. Small on purpose: the server imports it.
 */
import { createHash } from "node:crypto";

const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
export const keyOf = (question) => `answer|${createHash("sha1").update(clean(question).toLowerCase()).digest("hex").slice(0, 24)}`;
export const WITHDRAWN = Object.freeze({
  [keyOf("How do occupational therapists register in India?")]: Object.freeze({ why: "AIOTA is a professional association, not a regulator; the source was a branch blog", on: "2026-11-06", words: "All India Occupational Therapists" }),
  [keyOf("What OET score does CORU - Regulating Health and Social Care Professional ask of speech pathologists?")]: Object.freeze({ why: "the line was garbled and named OET as its publisher; rechecked on coru.ie on 2026-11-06", on: "2026-11-06", words: "who register through the Speech",
    replace: Object.freeze({ ok: true, route: "a", cls: "truth", answer: "CORU asks speech and language therapists for OET Speech Pathology with at least 400 in three of the four parts (listening, reading, writing and speaking) and at least 350 in the fourth. CORU's page calls both of these grade B.", quotes: Object.freeze(["OET (Speech Pathology) A minimum of Grade B (400) in three components and B (350) in one component"]), url: "https://www.coru.ie/health-and-social-care-professionals/registration/registration-requirements/language/", title: "Language requirements — CORU", official: true, type: "official", kind: "official", name: "CORU", reason: "rechecked against coru.ie by hand, 2026-11-06" }) }),
});
/** the answer still holds what was withdrawn */
export const isWithdrawnAnswer = (k, answer) => Boolean(WITHDRAWN[k] && clean(answer).includes(WITHDRAWN[k].words));
/** the kept answers without what was withdrawn; a correction stands in. → what was taken out (its pages are rebuilt) */
export function applyWithdrawn(kept = {}, { today = null, rule = 0 } = {}) {
  const out = [];
  for (const [k, w] of Object.entries(WITHDRAWN)) {
    const v = kept[k]; if (!v?.ok || !clean(v.answer).includes(w.words)) continue;
    out.push({ key: k, question: v.question, was: clean(v.answer).slice(0, 300), source: v.url ?? null, why: w.why });
    kept[k] = w.replace ? { ...w.replace, quotes: [...w.replace.quotes], quote: w.replace.quotes[0], question: v.question, on: w.on, withdrawnFix: w.on, rule } : { ok: false, on: today ?? w.on, cls: v.cls ?? "truth", question: v.question, why: `withdrawn: ${w.why}`, withdrawn: w.on, rule };
  }
  return out;
}
/** a page's text still holds a withdrawn answer: it is never shown as ready or published until it is rebuilt */
export const holdsWithdrawn = (text) => { const t = String(text ?? ""); return Object.values(WITHDRAWN).some((w) => t.includes(w.words) || t.includes(w.words.replace(/&/g, "&amp;"))); };
/** a held answer from AlmiSEO Data is taken only when it is not a withdrawn one */
export const mayTakeHeld = (k, v = null) => !(v?.ok && isWithdrawnAnswer(k, v.answer));
