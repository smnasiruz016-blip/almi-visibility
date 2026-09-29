/**
 * F33 · CANNIBALIZATION PREVENTION — DOES AN EXISTING PAGE ALREADY COVER THE SAME NEED, FOR THE SAME CLIENT?
 *
 * Acceptance: _handoffs 9dc9bc2 (RR-84 §2), frozen ALONE before this code was written. Authority: the specification's F33 row
 * ("Detect when existing pages compete for the same need before proposing another URL") and Best Page Recipe V3 (adopted, 5033788):
 * §2 "One coherent intent per resource. Different phrasings can belong together", §13 "Duplicate intent/value regardless of
 * rewording", §14.2 "Low textual overlap cannot rescue semantic duplication". RR-84 §4: THREE outcomes, each with its recorded reason.
 *
 * ── THE THREE OUTCOMES (plus F34's refusal, which runs before this and is never weakened) ──────────────
 *
 *   COVERED         an existing page's HEADLINE (its title and H1) names this need, and only this need, of the subject's registered
 *                   page structure — in its declared form or a different inflection of it. Nothing is produced; the page is named.
 *   NOT_COVERED     the population is recorded COMPLETE and EVERY existing page shows positive evidence of a different need.
 *                   The pages that exist do not block the candidate.
 *   CANNOT_DECIDE   anything else: a page that might serve this need and cannot be ruled in or out, or a population not recorded
 *                   COMPLETE. Nothing is produced, and it is never reported as either of the other two.
 *
 * ── THE EVIDENCE, PER EXISTING PAGE (each page's verdict carries the evidence that made it) ─────────────
 *
 *   HEADLINE_NAMES_THIS_NEED_ONLY         covers
 *   HEADLINE_NAMES_THIS_AND_OTHER_NEEDS   undecided — a shared headline
 *   HEADLINE_NAMES_OTHER_NEEDS_ONLY       different
 *   BODY_NAMES_EVERY_REGISTERED_NEED      different — a page about the whole structure (a hub), with no headline need
 *   BODY_NAMES_OTHER_NEEDS_NOT_THIS       different — no headline need; the page names registered needs, never this one
 *   BODY_NAMES_THIS_NEED_AMONG_OTHERS     undecided — no headline need; this need is named in the body
 *   NAMES_NO_REGISTERED_NEED              undecided — the page names nothing of the registered structure, so free evidence can
 *                                         neither rule it in nor out (it may serve this need in words no registered form shares)
 *
 * ── 🔴 WHAT "DIFFERENT WORDING" CAN AND CANNOT MEAN HERE, STATED ────────────────────────────────────
 *
 * Each word is reduced by a small fixed list of English suffixes (`stem`), repeatedly, so an inflected or derived form of a registered
 * value matches it: "nurses" and "nursing", "pharmacist" and "pharmacy", "pathologist" and "pathology". A synonym that shares no
 * stem with any registered form — a different word for the same need — cannot be recognised without a semantic model, which would be a
 * paid or metered call (RR-84 §5: owner's GREEN first). Such a page is NAMES_NO_REGISTERED_NEED or names the need only in other terms,
 * and its verdict is UNDECIDED, so it can only ever produce CANNOT_DECIDE — never NOT_COVERED, never a new page.
 *
 * Pure: it reads nothing, calls nothing, and records nothing. No product is named here.
 */
import { tokenise, textOf } from "../gate-a/tokens.mjs";

export const NEED_OUTCOMES = Object.freeze({ COVERED: "COVERED", NOT_COVERED: "NOT_COVERED", CANNOT_DECIDE: "CANNOT_DECIDE" });
export const PAGE_VERDICTS = Object.freeze({ COVERS: "COVERS", DIFFERENT: "DIFFERENT", UNDECIDED: "UNDECIDED" });
export const PAGE_EVIDENCE = Object.freeze({
  HEADLINE_THIS_ONLY: "HEADLINE_NAMES_THIS_NEED_ONLY",
  HEADLINE_THIS_AND_OTHERS: "HEADLINE_NAMES_THIS_AND_OTHER_NEEDS",
  HEADLINE_OTHERS_ONLY: "HEADLINE_NAMES_OTHER_NEEDS_ONLY",
  BODY_EVERY_NEED: "BODY_NAMES_EVERY_REGISTERED_NEED",
  BODY_OTHERS_NOT_THIS: "BODY_NAMES_OTHER_NEEDS_NOT_THIS",
  BODY_THIS_AMONG_OTHERS: "BODY_NAMES_THIS_NEED_AMONG_OTHERS",
  NO_REGISTERED_NEED: "NAMES_NO_REGISTERED_NEED",
});
export const NEED_REASONS = Object.freeze({
  NO_STRUCTURE: "NO_REGISTERED_PAGE_STRUCTURE",
  NEED_NOT_REGISTERED: "CANDIDATE_NEED_IS_NOT_A_REGISTERED_VALUE",
  COVERED: "AN_EXISTING_PAGE_HEADLINE_NAMES_THIS_NEED_ONLY",
  NOT_COVERED: "EVERY_EXISTING_PAGE_OF_A_COMPLETE_POPULATION_SERVES_A_DIFFERENT_NEED",
  UNDECIDED_PAGES: "AN_EXISTING_PAGE_CANNOT_BE_RULED_IN_OR_OUT",
  NOT_COMPLETE: "NO_PAGE_COVERS_IT_BUT_THE_POPULATION_IS_NOT_RECORDED_COMPLETE",
});

const VERDICT_OF = Object.freeze({
  [PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: PAGE_VERDICTS.COVERS,
  [PAGE_EVIDENCE.HEADLINE_THIS_AND_OTHERS]: PAGE_VERDICTS.UNDECIDED,
  [PAGE_EVIDENCE.HEADLINE_OTHERS_ONLY]: PAGE_VERDICTS.DIFFERENT,
  [PAGE_EVIDENCE.BODY_EVERY_NEED]: PAGE_VERDICTS.DIFFERENT,
  [PAGE_EVIDENCE.BODY_OTHERS_NOT_THIS]: PAGE_VERDICTS.DIFFERENT,
  [PAGE_EVIDENCE.BODY_THIS_AMONG_OTHERS]: PAGE_VERDICTS.UNDECIDED,
  [PAGE_EVIDENCE.NO_REGISTERED_NEED]: PAGE_VERDICTS.UNDECIDED,
});

/* A fixed, declared list — longest first. Stripping repeats while a suffix matches and at least MIN_STEM letters remain. */
export const SUFFIXES = Object.freeze(["ists", "ians", "ings", "ers", "ies", "ics", "ist", "ian", "ing", "ry", "er", "es", "al", "y", "s", "e"]);
/* Two stems name the same word when they are equal, or when one is a prefix of the other and the shorter has at least MIN_PREFIX
 * letters ("optomet"/"optometr", "veterina"/"veterinar"). Declared limit: a pair that shares neither (a practitioner's name that is
 * not derived from the field's name) is not recognised, and can only ever yield CANNOT_DECIDE. */
export const MIN_PREFIX = 5;
export const sameStem = (a, b) => a === b || (Math.min(a.length, b.length) >= MIN_PREFIX && (a.startsWith(b) || b.startsWith(a)));
export const MIN_STEM = 4;
export function stem(word) {
  let w = String(word).toLowerCase();
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of SUFFIXES) {
      if (w.endsWith(s) && w.length - s.length >= MIN_STEM) { w = w.slice(0, -s.length); changed = true; break; }
    }
  }
  return w;
}

const stems = (text) => tokenise(String(text ?? "").toLowerCase().replace(/[-_]+/g, " ")).map(stem);
/** A registered value's forms, as stem runs: as written, and with hyphens and underscores as spaces. */
export const valueForms = (value) => [...new Set([String(value), String(value).replace(/[-_]+/g, " ")])].map(stems).filter((r) => r.length > 0);

const containsRun = (hay, run) => {
  outer: for (let i = 0; i + run.length <= hay.length; i += 1) {
    for (let j = 0; j < run.length; j += 1) if (!sameStem(hay[i + j], run[j])) continue outer;
    return true;
  }
  return false;
};
const named = (hay, values) => values.filter((v) => valueForms(v).some((run) => containsRun(hay, run)));

/** The page's own headline: its <title> and every <h1>, as served. */
export function headlineOf(html) {
  const s = String(html ?? "");
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(s)?.[1] ?? "";
  const h1 = [...s.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1]).join(" ");
  return textOf(`<p>${title}</p><p>${h1}</p>`);
}

/** One existing page's evidence and verdict for one registered need. */
export function judgePage(page, need, values) {
  const inHeadline = named(stems(headlineOf(page?.html)), values);
  const inBody = named(stems(textOf(String(page?.html ?? ""))), values);
  let evidence;
  if (inHeadline.length) {
    evidence = !inHeadline.includes(need) ? PAGE_EVIDENCE.HEADLINE_OTHERS_ONLY : inHeadline.length === 1 ? PAGE_EVIDENCE.HEADLINE_THIS_ONLY : PAGE_EVIDENCE.HEADLINE_THIS_AND_OTHERS;
  } else if (inBody.length === 0) {
    evidence = PAGE_EVIDENCE.NO_REGISTERED_NEED;
  } else if (inBody.length === values.length) {
    evidence = PAGE_EVIDENCE.BODY_EVERY_NEED;
  } else {
    evidence = inBody.includes(need) ? PAGE_EVIDENCE.BODY_THIS_AMONG_OTHERS : PAGE_EVIDENCE.BODY_OTHERS_NOT_THIS;
  }
  return Object.freeze({ pageId: page.pageId, evidence, verdict: VERDICT_OF[evidence], headlineNeeds: inHeadline.length, bodyNeeds: inBody.length });
}

/**
 * F33's decision over a population ALREADY validated by F34 (present, readable, this tenant's, non-empty).
 * @param {{ need: string, structure: { values: string[] }, population: { coverageState: string, pages: object[] } }} input
 */
export function decideNeedCoverage({ need, structure, population }) {
  const O = NEED_OUTCOMES;
  const R = NEED_REASONS;
  const values = Array.isArray(structure?.values) ? [...new Set(structure.values.map(String))] : [];
  const out = (outcome, reason, pages = []) => Object.freeze({
    outcome, reason, coverageState: population.coverageState, considered: population.pages.length, pages,
    covering: pages.filter((p) => p.verdict === PAGE_VERDICTS.COVERS).map((p) => p.pageId),
    undecided: pages.filter((p) => p.verdict === PAGE_VERDICTS.UNDECIDED).map((p) => p.pageId),
  });
  if (values.length === 0) return out(O.CANNOT_DECIDE, R.NO_STRUCTURE);
  if (!values.includes(String(need ?? ""))) return out(O.CANNOT_DECIDE, R.NEED_NOT_REGISTERED);
  const pages = population.pages.map((p) => judgePage(p, String(need), values)).sort((a, b) => a.pageId.localeCompare(b.pageId));
  if (pages.some((p) => p.verdict === PAGE_VERDICTS.COVERS)) return out(O.COVERED, R.COVERED, pages);
  if (pages.some((p) => p.verdict === PAGE_VERDICTS.UNDECIDED)) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);
  if (population.coverageState !== "COMPLETE") return out(O.CANNOT_DECIDE, R.NOT_COMPLETE, pages);
  return out(O.NOT_COVERED, R.NOT_COVERED, pages);
}

/** Fixed short codes for the recorded reason (the audit metadata ceiling is 200 characters). */
export const EVIDENCE_CODES = Object.freeze({
  [PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: "H_THIS",
  [PAGE_EVIDENCE.HEADLINE_THIS_AND_OTHERS]: "H_SHARED",
  [PAGE_EVIDENCE.HEADLINE_OTHERS_ONLY]: "H_OTHER",
  [PAGE_EVIDENCE.BODY_EVERY_NEED]: "B_ALL",
  [PAGE_EVIDENCE.BODY_OTHERS_NOT_THIS]: "B_OTHER",
  [PAGE_EVIDENCE.BODY_THIS_AMONG_OTHERS]: "B_THIS",
  [PAGE_EVIDENCE.NO_REGISTERED_NEED]: "NONE",
});

/** The recorded reason, count-only: how many existing pages carried each kind of evidence, e.g. "H_THIS:1,H_OTHER:22,NONE:1". */
export function evidenceSummary(decision) {
  return Object.values(PAGE_EVIDENCE).map((e) => [EVIDENCE_CODES[e], decision.pages.filter((p) => p.evidence === e).length]).filter(([, n]) => n > 0).map(([c, n]) => `${c}:${n}`).join(",");
}
