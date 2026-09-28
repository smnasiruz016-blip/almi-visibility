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
 *   an existing page names the candidate's declared intent                  -> MONITOR   naming it (C2)
 *     … and a recorded measurement names a defect in that page               -> IMPROVE   naming it (C4: repair, not regenerate)
 *   existing pages exist but none names the intent                          -> MONITOR   naming EVERY one of them (C2: uncertain)
 *   no existing page, and the population is COMPLETE                        -> NO_EXISTING_PAGE
 *   no existing page, but the population is PARTIAL or UNKNOWN              -> MONITOR   (an unseen page may serve it)
 *
 * ── 🔴 WHY "NAMES THE INTENT" DECIDES ONLY THE LABEL, NEVER THE PERMISSION ──
 *
 * A candidate's intent is the axis value its spec declares (its variant): the one thing a product says each of its pages is FOR.
 * An existing page that names it is MATCHED. But the same need is often served in other words, and recognising that is
 * same-need detection — F33's territory, which does not exist yet. So a page that does NOT name the intent is never evidence that
 * no page serves it: while any existing page of the tenant exists, the outcome is at best MONITOR, and every existing page stays
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

import { tokenise, textOf } from "../gate-a/tokens.mjs";
import { COVERAGE_STATES } from "../crawl/inventory.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

export const EXISTING_PAGE_OUTCOMES = Object.freeze({
  NO_EXISTING_PAGE: "NO_EXISTING_PAGE",
  MONITOR: "MONITOR",
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

const containsRun = (hay, run) => {
  outer: for (let i = 0; i + run.length <= hay.length; i += 1) {
    for (let j = 0; j < run.length; j += 1) if (hay[i + j] !== run[j]) continue outer;
    return true;
  }
  return false;
};

/** Whether an existing page's served text names the intent, as a whole-token run. */
export function namesIntent(page, forms) {
  const tokens = tokenise(textOf(String(page?.html ?? "")));
  return forms.some((run) => containsRun(tokens, run));
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
  const out = (outcome, reason, extra = {}) => Object.freeze({ ...base, ...extra, outcome, reason, mayProduce: outcome === O.NO_EXISTING_PAGE });

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
    return population.coverageState === "COMPLETE" ? out(O.NO_EXISTING_PAGE, R.NONE, seen) : out(O.MONITOR, R.NOT_COMPLETE, seen);
  }

  const forms = intentForms(candidate?.intent);
  const byId = (a, b) => a.pageId.localeCompare(b.pageId);
  const matched = forms.length ? pages.filter((p) => namesIntent(p, forms)).sort(byId) : [];
  const rest = pages.filter((p) => !matched.includes(p)).sort(byId);
  const named = [...matched, ...rest].map((p) => p.pageId);
  const found = { ...seen, matched: matched.length, existingPages: named };

  if (matched.length === 0) return out(O.MONITOR, forms.length ? R.UNCERTAIN : R.NO_INTENT, found);
  const defective = matched.filter((p) => typeof p.recordedDefect === "string" && p.recordedDefect.trim() !== "");
  if (defective.length) {
    const first = defective.map((p) => p.pageId);
    return out(O.IMPROVE, R.SERVED_WITH_DEFECT, { ...found, existingPages: [...first, ...named.filter((id) => !first.includes(id))] });
  }
  return out(O.MONITOR, R.SERVED, found);
}

/**
 * The ONE audit decision a non-producing outcome owes (C6), for the entry point's own guard sink: a REFUSAL, which the sink
 * always appends. Counts, codes and page ids only — a page id is a hash of its canonical URL, never the URL. A decision that
 * lets production go on is not a decision on a rediscovered intent and records nothing here.
 */
export function existingPageDecisionEvent(decision, { entry }) {
  if (!decision || decision.mayProduce) return null;
  const ids = decision.existingPages;
  const shown = ids.slice(0, NAMED_IN_EVENT);
  const more = ids.length - shown.length;
  return {
    eventType: "REFUSAL",
    action: "REFUSE_PAGE_PRODUCTION_EXISTING_PAGE_FIRST",
    outcome: "REFUSED",
    reasonCode: decision.reason,
    metadata: {
      guard: "existing-page-first",
      classification: `outcome=${decision.outcome} considered=${decision.considered} matched=${decision.matched} coverage=${decision.coverageState ?? "NONE"} candidate=${digest(decision.slug)} all=${digest(ids.join(","))}`,
      ruleEntry: "F34: never overwrite or recreate an existing page because research rediscovered its topic",
      role: `${entry}>EXISTING_PAGE_FIRST`,
      resourceRef: shown.length ? `existing-pages:${shown.join(",")}${more > 0 ? `+${more}` : ""}` : "existing-pages:none",
    },
  };
}
