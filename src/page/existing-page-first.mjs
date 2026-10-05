/**
 * F34 · NO BLIND REGENERATION — THE EXISTING-PAGE CHECK THAT RUNS BEFORE A PAGE IS PRODUCED.
 *
 * Acceptance: _handoffs 53f74b4 (RR-83 §2), frozen ALONE before this code was written. Its authority is the specification's F34
 * row — "Never overwrite or recreate a good existing page merely because research rediscovered its topic" — and Best Page Recipe
 * V3 (adopted, 5033788): §2 "A page decision must follow … an existing-page check", §2 "Improve before create", §17.3 "A new
 * query is not automatically a new page. First ask whether the existing resource should answer it better", §17.2 "Automatic
 * deletion is forbidden".
 *
 * ── WHAT THIS DECIDES ───────────────────────────────────────────────────────
 *
 * Given ONE candidate (the intent it would serve) and the SAME tenant's existing-page population, it answers whether the
 * candidate may be produced at all. Only NO_EXISTING_PAGE lets a page-producing path go on; every other outcome means no page,
 * no draft and no URL is produced for that intent.
 *
 *   population missing, unreadable, of unknown shape, or another tenant's  -> REFUSED   (C1: never treated as empty)
 *   an existing page names the candidate's declared intent                  -> KEEP      / NO NEW PAGE, naming it (C2; C7 M1/M3)
 *     … and a recorded measurement names a defect in that page               -> IMPROVE   naming it (C4: repair, not regenerate)
 *   existing pages exist but none names the intent                          -> HOLD      naming EVERY one of them (C2: uncertain; C7 M2/M4)
 *   no existing page, and the population is COMPLETE                        -> NO_EXISTING_PAGE
 *   no existing page, but the population is PARTIAL or UNKNOWN              -> HOLD      (an unseen page may serve it; C7 M5)
 *
 * 🔴 F34 C7 (Acceptance Amendment 1, _handoffs 348f029, RR-174): MONITOR is no longer an F34 outcome. A served need is KEEP / NO NEW PAGE —
 * no new page, the existing page named and unchanged; whether it has a needed gap is F35's decision on F91's coverage record, never
 * F34's. An uncertain match is HOLD, its reason named. KEEP keeps the served reason AN_EXISTING_PAGE_SERVES_THIS_INTENT, which F36's
 * right-to-exist reads; every other outcome and reason stands. Demand monitoring is never an F34 outcome.
 *
 * ── 🔴 WHY "NAMES THE INTENT" DECIDES ONLY THE LABEL, NEVER THE PERMISSION ──
 *
 * A candidate's intent is the axis value its spec declares (its variant): the one thing a product says each of its pages is FOR.
 * An existing page that names it is MATCHED. But the same need is often served in other words, and recognising that is
 * same-need detection — F33's territory, which does not exist yet. So a page that does NOT name the intent is never evidence that
 * no page serves it: while any existing page of the tenant exists, the outcome is at best HOLD, and every existing page stays
 * named as a candidate. Different wording can therefore change what is NAMED FIRST, never whether a page is produced.
 *
 * ── 🔴 "GOOD" IS NEVER PRESUMED BAD ──────────────────────────────────────────
 *
 * No page-quality measurement is authoritative yet (F40 is BLOCKED-BY-AUTHORITY). An existing page is protected unless a recorded
 * measurement names a defect in it (`recordedDefect`); unknown quality never licenses recreating it. A page with a recorded defect
 * is routed to IMPROVE — a repair of THAT page — never to regeneration.
 *
 * Pure: it reads nothing and records nothing. `existingPageDecisionEvent` builds the one audit decision a non-producing outcome
 * owes; the entry point emits it through its own guard sink. This module names no product.
 */
import { createHash } from "node:crypto";

import { tokenise } from "../gate-a/tokens.mjs";
import { COVERAGE_STATES } from "../crawl/inventory.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { decideNeedCoverage, evidenceSummary, NEED_OUTCOMES } from "./need-coverage.mjs";

export const EXISTING_PAGE_OUTCOMES = Object.freeze({
  NO_EXISTING_PAGE: "NO_EXISTING_PAGE",
  /* F33: existing pages exist, and positive evidence shows every one serves a different need — they do not block. */
  NOT_COVERED: "NOT_COVERED",
  /* F34 C7: KEEP / NO NEW PAGE for a served need (M1, M3); HOLD for an uncertain one (M2, M4, M5). MONITOR is no longer an F34 outcome. */
  KEEP: "KEEP",
  HOLD: "HOLD",
  IMPROVE: "IMPROVE",
  REFUSED: "REFUSED",
});

export const EXISTING_PAGE_REASONS = Object.freeze({
  NO_TENANT: "EXISTING_PAGE_CHECK_HAS_NO_TENANT",
  POPULATION_UNAVAILABLE: "EXISTING_PAGE_POPULATION_UNAVAILABLE",
  CROSS_TENANT: "EXISTING_PAGE_POPULATION_OF_ANOTHER_TENANT",
  NO_INTENT: "CANDIDATE_DECLARES_NO_INTENT",
  SERVED: "AN_EXISTING_PAGE_SERVES_THIS_INTENT",
  SERVED_WITH_DEFECT: "AN_EXISTING_PAGE_SERVES_THIS_INTENT_AND_HAS_A_RECORDED_DEFECT",
  UNCERTAIN: "AN_EXISTING_PAGE_MAY_SERVE_THIS_INTENT",
  NOT_COMPLETE: "NO_EXISTING_PAGE_OBSERVED_BUT_THE_POPULATION_IS_NOT_COMPLETE",
  NONE: "NO_EXISTING_PAGE_IN_A_COMPLETE_POPULATION",
});

/** How many existing page ids one recorded decision names in full; the rest are counted and digested (metadata ceiling). */
export const NAMED_IN_EVENT = 8;

const digest = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/** The declared forms of an intent: as written, and with its hyphens and underscores as spaces. */
export function intentForms(intent) {
  const s = String(intent ?? "").toLowerCase().trim();
  if (s === "") return [];
  return [...new Set([s, s.replace(/[-_]+/g, " ")])].map((f) => tokenise(f)).filter((t) => t.length > 0);
}

/**
 * @param {object} input
 * @param {{ slug: string, intent: string }} input.candidate   the page that would be produced, and the intent it declares
 * @param {string|null} input.tenantId                          the run's DECIDED tenant
 * @param {{ tenantId: string, coverageState: string, pages: { pageId: string, tenantId?: string, html?: string, recordedDefect?: string }[] }|null} input.population
 */
export function existingPageFirst({ candidate, tenantId, population }) {
  const O = EXISTING_PAGE_OUTCOMES;
  const R = EXISTING_PAGE_REASONS;
  const base = { slug: candidate?.slug ?? null, tenantId: tenantId ?? null, coverageState: null, considered: 0, matched: 0, existingPages: [] };
  const out = (outcome, reason, extra = {}) => Object.freeze({ ...base, ...extra, outcome, reason, mayProduce: outcome === O.NO_EXISTING_PAGE || outcome === O.NOT_COVERED });

  if (typeof tenantId !== "string" || tenantId === "") return out(O.REFUSED, R.NO_TENANT);
  if (population === null || typeof population !== "object" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) {
    return out(O.REFUSED, R.POPULATION_UNAVAILABLE);
  }
  /* F02: the population's tenant — and any page that carries its own — is weighed against the run's through the ONE decision. */
  const sameTenant = (other) => decideResolvedTenants(tenantId, other).allowed;
  if (!sameTenant(population.tenantId) || population.pages.some((p) => p?.tenantId !== undefined && !sameTenant(p.tenantId))) {
    return out(O.REFUSED, R.CROSS_TENANT);
  }
  if (population.pages.some((p) => typeof p?.pageId !== "string" || p.pageId === "")) return out(O.REFUSED, R.POPULATION_UNAVAILABLE);

  const pages = population.pages;
  const seen = { coverageState: population.coverageState, considered: pages.length };
  if (pages.length === 0) {
    return population.coverageState === "COMPLETE" ? out(O.NO_EXISTING_PAGE, R.NONE, seen) : out(O.HOLD, R.NOT_COMPLETE, seen);
  }

  /* 🔴 F33 (_handoffs 9dc9bc2) — the judgement F34 lacked: does an existing page of this tenant already cover the SAME need?
   * Its three outcomes replace F34's broad hold; F34's refusals above run first and are never weakened. */
  const need = decideNeedCoverage({ need: candidate?.intent, structure: candidate?.structure, population });
  const order = { COVERS: 0, UNDECIDED: 1, DIFFERENT: 2 };
  /* When F33 could judge no page (no registered structure, or a need that is not a registered value), every existing page is still
   * named — F34 C2: an uncertain outcome names the page(s) that may serve it. */
  const named = need.pages.length
    ? [...need.pages].sort((a, b) => order[a.verdict] - order[b.verdict]).map((p) => p.pageId)
    : pages.map((p) => p.pageId).sort();
  const found = { ...seen, matched: need.covering.length, existingPages: named, needCoverage: need };

  if (need.outcome === NEED_OUTCOMES.NOT_COVERED) return out(O.NOT_COVERED, need.reason, found);
  if (need.outcome === NEED_OUTCOMES.CANNOT_DECIDE) return out(O.HOLD, need.reason, found);
  const defective = pages.filter((p) => need.covering.includes(p.pageId) && typeof p.recordedDefect === "string" && p.recordedDefect.trim() !== "");
  if (defective.length) {
    const first = defective.map((p) => p.pageId).sort();
    return out(O.IMPROVE, R.SERVED_WITH_DEFECT, { ...found, existingPages: [...first, ...named.filter((id) => !first.includes(id))] });
  }
  return out(O.KEEP, R.SERVED, found);
}

/**
 * The ONE audit decision a non-producing outcome owes (C6), for the entry point's own guard sink: a REFUSAL, which the sink
 * always appends. Counts, codes and page ids only — a page id is a hash of its canonical URL, never the URL. A decision that
 * lets production go on is not a decision on a rediscovered intent and records nothing here.
 */
export function existingPageDecisionEvent(decision, { entry }) {
  if (!decision || decision.outcome === EXISTING_PAGE_OUTCOMES.NO_EXISTING_PAGE) return null;
  const ids = decision.existingPages;
  const shown = ids.slice(0, NAMED_IN_EVENT);
  const more = ids.length - shown.length;
  const need = decision.needCoverage;
  /* F33 C5 — the recorded reason: the per-page evidence counts that made the decision, beside F34's own counts. */
  const f33 = need ? ` need=${need.outcome} ev=${evidenceSummary(need) || "none"}` : "";
  const metadata = {
    guard: "existing-page-first",
    classification: `outcome=${decision.outcome} considered=${decision.considered} matched=${decision.matched} coverage=${decision.coverageState ?? "NONE"} candidate=${digest(decision.slug)} all=${digest(ids.join(","))}${f33}`.slice(0, 200),
    ruleEntry: need ? "F33/F34: an existing page that covers the same need is never recreated; one that cannot be ruled out holds it" : "F34: never overwrite or recreate an existing page because research rediscovered its topic",
    role: `${entry}>EXISTING_PAGE_FIRST`,
    resourceRef: shown.length ? `existing-pages:${shown.join(",")}${more > 0 ? `+${more}` : ""}` : "existing-pages:none",
  };
  /* F33 NOT_COVERED lets production go on — a decision, recorded with its evidence, not a refusal. */
  if (decision.mayProduce) return { eventType: "EVALUATION", action: "DECIDE_NEED_NOT_COVERED_BY_EXISTING_PAGES", outcome: "ALLOWED", reasonCode: decision.reason, metadata };
  return { eventType: "REFUSAL", action: "REFUSE_PAGE_PRODUCTION_EXISTING_PAGE_FIRST", outcome: "REFUSED", reasonCode: decision.reason, metadata };
}
