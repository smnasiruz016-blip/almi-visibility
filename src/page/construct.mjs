/**
 * ROW 61 — SAFE LOCAL PAGE CONSTRUCTION. Which declared candidates may be ACCEPTED as built artefacts.
 *
 * Amendment 5 (owner ruling): "Gate A MUST be wired into the construction path before the artefact is
 * accepted. A candidate that fails the frozen floor must not be emitted as an accepted built page. Gate
 * failure must fail closed." And: "THE GENERATOR IS SUCCESSFUL WHEN IT REFUSES BAD OR UNSUPPORTED PAGES
 * CORRECTLY — NOT WHEN IT PRODUCES MANY PAGES."
 *
 * ── 🔴 FAIL CLOSED BY CONSTRUCTION, NOT BY A CHECK THE CALLER MUST REMEMBER ──
 *
 * `constructCandidates` returns HTML ONLY for an ACCEPTED candidate. A refused candidate comes back with
 * `html: null`, so a runner that writes whatever it is handed cannot write a refused page — there is
 * nothing to write. Printing a warning and writing the file anyway is the defect this replaces.
 *
 * ── THE FOUR FROZEN PARTS, EACH MEASURED AND RECORDED ──────────────────────
 *
 *   1  ≥ MIN_UNIQUE_WORDS unique words after the shared shell is subtracted
 *   2  ≥ MIN_FACTS verified sourced facts — counted from the registry's VERIFIED state, never its record count
 *   3  ≤ MAX_SIBLING_OVERLAP against EVERY sibling in the template family
 *   4  a specific WHY_THIS_URL_DESERVES_TO_EXIST, as far as it is measurable (../gate-a/why-this-url.mjs)
 *
 * ACCEPTED requires all four to PASS. FAIL and BLOCKED / NOT TESTED both refuse: a part that could not be
 * exercised is never a pass.
 *
 * 🔴 F34 adds a fifth, ahead of every other in meaning though not in order: the existing-page check
 * (./existing-page-first.mjs). A candidate whose intent an existing page of the same tenant serves, or may serve,
 * is never ACCEPTED, however well it clears Gate A.
 *
 * ⚠️ DECLARED: unlike runGateA, all four parts are measured without stopping at the first failure, so the
 * DATA GAP list is complete. runGateA stops early (D2-A) because its population can be a whole estate;
 * here the population is one product's declared specs and there is no generate-all.
 *
 * ── THE TEMPLATE FAMILY ────────────────────────────────────────────────────
 *
 * Every declared page spec of the product, rendered by the same renderer — not only the requested ones.
 * A candidate built alone would have no siblings to be measured against, which is the vacuous-population
 * failure. The shell is learned from the rendered family; fewer than MIN_PAGES_FOR_OWN_SHELL rendered
 * pages cannot learn one, and a constructed page has no existing pages to borrow one from, so parts 1
 * and 3 are BLOCKED / NOT TESTED with that condition.
 *
 * ── 🔴 AND WHAT PASSING DOES NOT MEAN ──────────────────────────────────────
 *
 * PAGE-1 stays UNSATISFIED on every result: five gates are a conjunction before a new page, and four gate
 * families (semantic, cannibalization, technical, cost) do not exist. An ACCEPTED artefact is a local
 * construction that cleared Gate A's floor — a rejection gate, not a target — and nothing more.
 *
 * This module names no product.
 */
import { renderPage, findCopiedFacts } from "./render.mjs";
import { claimIdsOf } from "./claim-ids.mjs";
import { tokensOf } from "../gate-a/tokens.mjs";
import { shellFor, uniqueWords, residualTokens, MIN_PAGES_FOR_OWN_SHELL } from "../gate-a/shell.mjs";
import { maxAgainstPopulation } from "../gate-a/overlap.mjs";
import { countFacts, MIN_FACTS, judgeFact } from "../gate-a/facts.mjs";
import { judgeFactSufficiency, judgeCompleteness, judgeOverlap } from "../gate-a/adaptive.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../gate-a/run.mjs";
import { rightToExist } from "./right-to-exist.mjs";
import { toGateAFact } from "../facts/registry.mjs";
import { RENDERABLE_STATUSES } from "../facts/schema.mjs";
import { existingPageFirst, EXISTING_PAGE_OUTCOMES } from "./existing-page-first.mjs";
import { informationGainForCandidate, GAIN_OUTCOME } from "./information-gain.mjs";
import { verifiedPages } from "./duplication-evidence.mjs";
import { isChosenCreate } from "./action-decision.mjs";
import { existingPageDecisionFromCoverage } from "./spec-compiler.mjs";
import { COVERAGE } from "./demand-connection.mjs";
import { LONE_PAGE } from "../gate-a/why-this-url.mjs";

export const PASS = "PASS";
export const FAIL = "FAIL";
export const NOT_TESTED = "BLOCKED / NOT TESTED";
export const ACCEPTED = "ACCEPTED";
export const REFUSED = "REFUSED";

/* 🔴 RR-179 (c) — CONSTRUCTION ACTS ONLY ON F35'S DECISION. A spec with no recorded relevant question, or one F35 did not choose, is
 * never built (A1, P3): no part is judged for it and nothing is rendered for it. */
export const NO_F35_DECISION = "no F35 decision was handed in — construction acts only on F35's decision (the owner's ruling RR-179 (c); A1, P3); nothing is built";
export const NOT_CHOSEN = "F35 did not choose CREATE for this spec — a spec with no recorded relevant question, or one F35 did not choose, is never built (ruling RR-179 (c); A1, P3)";
/* 🔴 RR-179 (d) — the complete-draft render is F37's; its acceptance is frozen before any render code changes. A compiled spec is NOT rendered. */
export const RENDER_WAITS_FOR_F37 = "the complete-draft render (Q&A with tiers and GENERATED marking, explicit UNKNOWN parts, the attribution check, markup only for visible Q&A) is F37's and is NOT built in R4 (the owner's ruling RR-179 (d)) — a compiled spec is not rendered";

export const PAGE_ONE = Object.freeze({
  id: "PAGE-1",
  state: "UNSATISFIED",
  statement:
    "§3 makes five gates a CONJUNCTION before a new page; two of the five do not exist, so the precondition " +
    "for creating any page is not satisfiable today",
  missingGateFamilies: Object.freeze(["semantic", "cannibalization", "technical", "cost"]),
});

/**
 * The candidates a run may judge. 🔴 NO DEFAULT: neither flag is an operator mistake, never "the first spec".
 * `allSlugs` loops ONE product's declared specs; each is judged on its own.
 */
export function selectCandidates(pageSpecs, { slug = null, allSlugs = false } = {}) {
  const declared = Object.keys(pageSpecs ?? {});
  const listed = declared.join(", ") || "(this product declares no page spec)";
  if (slug && allSlugs) throw new Error(`--slug and --all-slugs were both given — choose one. declared: ${listed}`);
  if (!slug && !allSlugs) {
    throw new Error(
      "--slug=<slug> or --all-slugs is required. There is no default, and that is deliberate: a runner that " +
        `silently picks one subject is how it came to build only one. declared: ${listed}`,
    );
  }
  if (slug) {
    if (!declared.includes(slug)) throw new Error(`--slug=${slug} is not a declared page spec. declared: ${listed}`);
    return [slug];
  }
  return declared;
}

/**
 * @param {object} input
 * @param {Record<string, object>} input.pageSpecs  every declared spec of ONE product — the template family
 * @param {string[]} input.variants                 the product's declared variants
 * @param {object[]} input.records                  that product's registry
 * @param {string[]} input.requested                slugs to judge (from selectCandidates)
 * @param {string|null} input.tenantId              the run's DECIDED tenant
 * @param {object|null} input.existingPages         that tenant's existing-page population (src/page/existing-page-population.mjs)
 * @param {{ slug: string, decision: object, spec: object|null }[]|null} input.decisions  F35's construction set (action-evidence
 *                                                  `compiled.forConstruction`): a candidate is judged ONLY when F35 CHOSE CREATE for it
 *                                                  (ruling RR-179 (c)); none handed in → nothing is built. A compiled spec rides in it.
 * @param {object[]} [input.rationaleReviews]       recorded substance reviews of rationale pairs (F36, S38) — none recorded is []
 * @param {Date}     [input.now]
 *
 * 🔴 F34 (_handoffs 53f74b4) — THE EXISTING-PAGE CHECK IS A PART, AND ACCEPTED NEEDS IT TO PASS. There is no default for
 * `existingPages`: a caller that does not hand one in gets REFUSED for every candidate, never "no existing page". Only
 * NO_EXISTING_PAGE passes; KEEP, HOLD and IMPROVE name the existing page(s) and produce nothing (F34 C7 M6: a comment only — the rule is
 * `mayProduce`, unchanged).
 *
 * 🔴 F39 (_handoffs 90e798d) — ORIGINAL INFORMATION GAIN IS A PART TOO, AND ACCEPTED NEEDS IT ESTABLISHED. `gainEvidence` is the
 * recorded information-gain records, competitor comparisons and semantic reviews; there is no default that passes — a caller that
 * hands none in gets that part NOT TESTED for every candidate. The rendered candidate is judged against the tenant's current pages
 * with VERIFIED bodies (F31); without them the part is NOT TESTED, never "no other current page".
 */
export function constructCandidates({ pageSpecs, variants = [], records = [], requested = [], tenantId = null, existingPages = null, gainEvidence = null, decisions = null, rationaleReviews = [], now = new Date() }) {
  const byId = new Map(records.map((r) => [r.id, r]));
  /* a compiled spec (F91 C19) F35 chose joins the family as a candidate, but is never rendered here (ruling RR-179 (d)) */
  const compiled = (Array.isArray(decisions) ? decisions : []).filter((d) => d?.spec && isChosenCreate(d.decision) && !(d.slug in (pageSpecs ?? {})))
    .map((d) => ({ slug: d.slug, spec: d.spec, html: null, trace: [], tokens: null, renderError: RENDER_WAITS_FOR_F37, compiled: true }));
  const family = [...Object.entries(pageSpecs ?? {}).map(([slug, spec]) => {
    try {
      const { html, trace } = renderPage(spec, records, now);
      return { slug, spec, html, trace, tokens: tokensOf(html), renderError: null };
    } catch (e) {
      return { slug, spec, html: null, trace: [], tokens: null, renderError: e.message };
    }
  }), ...compiled];
  const rendered = family.filter((f) => f.html !== null);
  const shell = shellFor({ groupTokens: rendered.map((f) => f.tokens) });

  return requested.map((slug) => {
    const me = family.find((f) => f.slug === slug);
    if (!me) throw new Error(`constructCandidates: ${slug} is not in the declared family`);
    /* 🔴 RR-179 (c): only a candidate F35 CHOSE to CREATE is judged; anything else is never built */
    const chosen = Array.isArray(decisions) ? decisions.find((d) => d?.slug === slug && isChosenCreate(d.decision)) ?? null : null;
    if (!chosen) {
      const why = Array.isArray(decisions) ? NOT_CHOSEN : NO_F35_DECISION;
      return { slug, verdict: REFUSED, html: null, trace: null, parts: { f35Decision: { state: FAIL, kind: "REJECT", reason: why } }, dataGaps: [], rejects: [{ part: "f35Decision", reason: why }], notTested: [],
        copies: [], copiesNotTested: [], copiesFullyChecked: 0, family: { declared: family.length, rendered: rendered.length, shellSource: shell.source, shellPages: shell.pages }, renderedWords: null, pageOne: PAGE_ONE };
    }
    const siblings = family.filter((f) => f.slug !== slug);
    const parts = {};
    parts.f35Decision = { state: PASS, kind: null, rule: "RR-179 (c): F35 CHOSE CREATE", value: chosen.decision.subject.needId, reason: null };

    // ── part 2 · verified sourced facts — the VERIFIED state, never the record count ──
    const claimIds = claimIdsOf(me.spec);
    const cited = claimIds.map((id) => byId.get(id)).filter(Boolean);
    const verified = cited.filter((r) => r.verificationState === "VERIFIED" && RENDERABLE_STATUSES.includes(r.life?.status));
    /* 🔴 AMENDMENT 7 · RULE A — support is judged CLAIM BY CLAIM, never by a count. One unsupported
     * claim now fails a page however many supported ones it carries; a single supported claim passes.
     * countFacts is still run, but only to REPORT the old figure beside the new verdict — it no
     * longer decides anything. */
    const counted = countFacts(verified.map(toGateAFact), now);
    const supported = new Set(verified.filter((r) => judgeFact(toGateAFact(r), now).counts).map((r) => r.id));
    const unsupported = claimIds.filter((id) => !supported.has(id));
    const ruleA = judgeFactSufficiency({
      claimIds,
      unsupported,
      declaresNoMaterialFactualClaim: me.spec?.makesNoMaterialFactualClaim === true,
    });
    parts.facts = {
      state: ruleA.state,
      kind: ruleA.kind,
      rule: ruleA.rule,
      value: supported.size,
      cited: claimIds.length,
      unsupported,
      reason: ruleA.reason,
      detail: ruleA.detail,
      supersededCount: counted.qualifying,
      notVerified: cited.filter((r) => !verified.includes(r)).map((r) => `${r.id} (${r.verificationState}, ${r.life?.status})`),
      verifiedButNotCounted: counted.rejected.map((j) => `${j.reasons.join("; ")}`),
    };

    // ── part 1 · unique words after the shared shell ──
    const noShell =
      `the template family renders ${rendered.length} of ${family.length} declared page(s); a shared shell is learned from ` +
      `at least ${MIN_PAGES_FOR_OWN_SHELL}, and a constructed page has no existing pages to borrow one from`;
    /* 🔴 AMENDMENT 7 · RULE B — completeness replaces the word floor. The spec's own declared
     * sections ARE the coverage it promises, so a spec declaring none cannot be judged at all and is
     * NOT TESTED, which refuses. The unique-word count is still measured and reported, because the
     * figure is worth having; it no longer decides anything. */
    if (me.html === null) parts.completeness = { state: NOT_TESTED, reason: `the candidate does not render: ${me.renderError}` };
    else {
      const ruleB = judgeCompleteness({ sections: me.spec?.sections });
      parts.completeness = {
        state: ruleB.state,
        kind: ruleB.kind,
        rule: ruleB.rule,
        sections: Array.isArray(me.spec?.sections) ? me.spec.sections.length : 0,
        reason: ruleB.reason,
        detail: ruleB.detail,
        supersededUniqueWords: shell.shell ? uniqueWords(me.tokens, shell.shell) : null,
      };
    }

    // ── part 3 · overlap against EVERY sibling ──
    const unrenderedSiblings = siblings.filter((s) => s.html === null).map((s) => s.slug);
    if (me.html === null) parts.overlap = { state: NOT_TESTED, reason: `the candidate does not render: ${me.renderError}` };
    /* 🔴 D1 · S41 (RTP-1 Rev 6) · the owner's record B: a lone page is never refused for having no comparison page. Its distinct need,
     * supported answer and useful value are assessed — by the F35 CREATE decision construction now acts on (DISTINCT and USEFUL, F35 C8b;
     * ruling RR-179 (c)). Where siblings exist but no shared shell can be learned, overlap is measured on the full text: a review signal
     * (Rule C), never a refusal only because the family is small. */
    else if (siblings.length === 0) parts.overlap = { state: PASS, kind: null, rule: "D1 (S41, record B)", value: null, reviewTrigger: MAX_SIBLING_OVERLAP, reviewRequired: false, reason: null, basis: `${LONE_PAGE}; its distinct need, supported answer and useful value are assessed by the F35 CREATE decision it acts on` };
    else if (unrenderedSiblings.length) parts.overlap = { state: NOT_TESTED, reason: `sibling(s) ${unrenderedSiblings.join(", ")} do not render, so overlap against EVERY sibling cannot be measured` };
    else {
      const population = rendered.map((f) => ({ id: f.slug, residual: shell.shell ? residualTokens(f.tokens, shell.shell) : f.tokens }));
      const [o] = maxAgainstPopulation([population.find((p) => p.id === slug)], population);
      /* 🔴 AMENDMENT 7 · RULE C — the percentage triggers MANDATORY REVIEW; it no longer rejects on
       * its own. Above the trigger a candidate passes only on a RECORDED distinct user value. And a
       * duplicate recorded value now fails at ANY overlap, which the old number could never see. */
      const ruleC = judgeOverlap({
        maxOverlap: o.maxOverlap,
        against: o.against,
        distinctUserValue: me.spec?.distinctUserValue,
        siblingDistinctValues: siblings.map((s) => s.spec?.distinctUserValue).filter((v) => typeof v === "string"),
      });
      parts.overlap = {
        state: ruleC.state,
        kind: ruleC.kind,
        rule: ruleC.rule,
        value: Number(o.maxOverlap.toFixed(4)),
        reviewTrigger: MAX_SIBLING_OVERLAP,
        reviewRequired: ruleC.reviewRequired,
        against: o.against,
        comparedWith: o.comparedWith,
        reason: ruleC.reason,
        detail: ruleC.detail,
        shell: shell.shell ? "subtracted" : `none learnable (${noShell}) — overlap measured on the full text, a review signal (Rule C, D1)`,
      };
    }

    // ── part 4 · WHY_THIS_URL_DESERVES_TO_EXIST — filled below by F36's one right-to-exist function (the key keeps its place) ──
    parts.whyThisUrl = null;

    // ── part 5 · F34 · the existing-page check, BEFORE anything is produced ──
    /* a compiled spec's need is a group id, not a registered value: its decision is the need's own coverage record (F91 C14, the record F35
     * decided on); F34's check is never asked about it and stays unchanged (RR-178 I-2) */
    const existing = me.compiled
      ? existingPageDecisionFromCoverage({ record_type: COVERAGE, coverage: me.spec?.basis?.coverage?.outcome ?? null, measurement_key: me.spec?.basis?.coverage?.ref ?? null, pages: [] })
      : existingPageFirst({ candidate: { slug, intent: me.spec?.variant, structure: { values: variants } }, tenantId, population: existingPages });
    parts.existingPage = {
      state: existing.mayProduce ? PASS : existing.outcome === EXISTING_PAGE_OUTCOMES.REFUSED ? NOT_TESTED : FAIL,
      kind: existing.mayProduce ? null : "REJECT",
      outcome: existing.outcome,
      value: existing.considered,
      matched: existing.matched,
      coverageState: existing.coverageState,
      existingPages: existing.existingPages,
      reason: existing.mayProduce ? null : `${existing.outcome} — ${existing.reason}`,
      decision: existing,
    };

    /* 🔴 F36 (_handoffs 2635153) — the ONE right-to-exist function decides here. Part 4 keeps Gate A's own meaning — the reason's
     * SPECIFICITY — read from that function; part 5 above is the need not already served. ACCEPTED needs both parts to PASS, which is
     * exactly the outcome ESTABLISHED (test/f36-right-to-exist.test.mjs proves the equivalence). The outcome travels on the part. */
    const rte = rightToExist({ slug, spec: me.spec, siblings: siblings.map((s) => ({ slug: s.slug, spec: s.spec })), variants, existingPageDecision: existing, rationaleReviews });
    const specific = rte.parts.specific;
    const partFour = specific.state === "PASS" ? PASS : specific.state === "FAIL" ? FAIL : NOT_TESTED;
    parts.whyThisUrl = {
      state: partFour,
      kind: partFour === FAIL ? specific.kind ?? "REJECT" : null,
      reason: specific.reason ?? null,
      checks: rte.checks,
      notEnforced: rte.notMeasured,
      rightToExist: rte,
    };

    // ── part 6 · F39 · original information gain over the rendered candidate, against the tenant's verified current pages ──
    const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : null;
    const gain = me.html === null || currentPages === null || gainEvidence === null ? null
      : informationGainForCandidate({ candidateId: `candidate:${slug}`, html: me.html, currentPages, evidence: gainEvidence });
    parts.informationGain = gain === null
      ? { state: NOT_TESTED, kind: null, outcome: GAIN_OUTCOME.CANNOT_DECIDE, reason: me.html === null ? `the candidate does not render: ${me.renderError}` : currentPages === null ? "the tenant's current pages with verified bodies were not handed in (F31) — information gain cannot be measured against them" : "no gain evidence was handed in — an empty list must be passed explicitly", decision: null }
      : {
        state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS : gain.outcome === GAIN_OUTCOME.REFUSED ? FAIL : NOT_TESTED,
        kind: gain.outcome === GAIN_OUTCOME.REFUSED ? "REJECT" : null,
        outcome: gain.outcome,
        reason: gain.outcome === GAIN_OUTCOME.REFUSED ? `NOT BEYOND ${gain.refusedOn.join(", ")}` : gain.outcome === GAIN_OUTCOME.CANNOT_DECIDE ? gain.missing.join(" | ") : null,
        decision: gain,
      };

    /* 🔴 THE COPY CHECK NOW ACCOUNTS FOR EVERY VALUE IT READS, AND ITS THIRD STATE IS NOT A REJECT.
     *
     * `copied` keeps exactly its old meaning and its old effect: a detected copy is a §5A refusal.
     * `notTested` is the population the detector CANNOT judge — numbers, booleans, spans under the
     * floor, and the tail of any value longer than the probe. It is carried onto the result so the
     * acceptance record can never again read "no copied facts" when it means "none detected among
     * the part that was looked at". It does NOT block acceptance: making it block would change what
     * ACCEPTED means, which is a frozen boundary and the owner's ruling, not a side effect of this.
     * It is deliberately NOT merged into `notTested` below — that list is Gate A's unmeasurable
     * PARTS, a different population with a different meaning. */
    const copyCheck = findCopiedFacts(me.spec, records);
    const copies = copyCheck.copied;
    const dataGaps = [];
    const rejects = [];
    const notTested = [];
    if (me.html === null) rejects.push({ part: "render", reason: `the candidate does not render: ${me.renderError}` });
    if (copies.length) rejects.push({ part: "§5A", reason: `${copies.length} fact text(s) copied into the spec: ${copies.map((c) => c.claimId).join(", ")}` });
    for (const [part, p] of Object.entries(parts)) {
      if (p.state === NOT_TESTED) notTested.push({ part, reason: p.reason });
      else if (p.state === FAIL) (p.kind === "DATA GAP" ? dataGaps : rejects).push({ part, reason: p.reason });
    }

    const accepted = me.html !== null && copies.length === 0 && Object.values(parts).every((p) => p.state === PASS);
    return {
      slug,
      verdict: accepted ? ACCEPTED : REFUSED,
      // 🔴 The whole fail-closed guarantee is these two lines.
      html: accepted ? me.html : null,
      trace: accepted ? me.trace : null,
      parts,
      dataGaps,
      rejects,
      notTested,
      copies,
      /* 🔴 NAMED, NEVER A BARE COUNT — an accepted page's record must not read "no copied facts"
       * when it means "none detected among the part the detector could read". */
      copiesNotTested: copyCheck.notTested,
      copiesFullyChecked: copyCheck.clean.length,
      family: { declared: family.length, rendered: rendered.length, shellSource: shell.source, shellPages: shell.pages },
      renderedWords: me.tokens ? me.tokens.length : null,
      pageOne: PAGE_ONE,
    };
  });
}
