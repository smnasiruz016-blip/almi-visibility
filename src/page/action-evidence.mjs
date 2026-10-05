/**
 * F35 · ONE CLIENT'S RECORDED EVIDENCE, ASSEMBLED FOR THE ACTION DECISION (acceptance _handoffs da659bd, RR-88).
 *
 * Everything here is read through the client's own partitions by modules already verified for it — nothing new is collected:
 *   population, inventory, completeness   F31 (src/page/existing-page-population.mjs)
 *   coverage of each registered need       F33 (src/page/need-coverage.mjs judgePage) over the client's own pages
 *   right-to-exist of each candidate       F36 over F34 (src/page/right-to-exist.mjs, existing-page-first.mjs)
 *   indexability contradictions            F21 (src/audit/indexability-reader.mjs)
 *   facts on a page and their freshness    the subject's fact registry, read by its lifecycle (src/facts/lifecycle.mjs freshnessOf)
 *   demand                                 NONE: no row issues a recorded V3 §5 demand outcome — passed as null, and named as missing
 *   quality · post-publication evidence   NONE recorded — passed as null, named as missing by the decision
 *   question coverage                      🔴 F35 Amendment 1 C9 (RR-174): the coverage record F91 writes (F91 C14), read from the research
 *                                          batch's planning store the caller hands in; a page a record names carries it (ADD SECTION's rule)
 *   grouped needs                          F91's grouped needs from the same store, decided in their OWN field (ruling RR-174 (b)); with no
 *                                          planning store handed in they are NOT MEASURED, named — the declared specs' `needs` keep their shape
 *   compiled specs                         🔴 F91 C19 (Amendment 4) and I-3 (RR-179): decideGroupedNeeds below — a need HELD only for
 *                                          want of a declared spec is compiled and judged by F36; only a CHOSEN need is handed on
 *   semantic reviews                       NONE recorded (F32: no store) — passed as [] by the caller; MERGE and REDIRECT name the
 *                                          missing review (RR-89)
 *
 * The decision itself is pure (./action-decision.mjs). Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { existingPageFirst } from "./existing-page-first.mjs";
import { rightToExist } from "./right-to-exist.mjs";
import { judgePage, PAGE_VERDICTS } from "./need-coverage.mjs";
import { decideForNeed, decideForPage, decideGroupedNeed, duplicationFor, summarise, reviewShowsOneIntent } from "./action-decision.mjs";
import { readConnections, questionCoverageFor, COVERAGE } from "./demand-connection.mjs";
import { compileNeedSpec, compiledSlug, purposeOf, existingPageDecisionFromCoverage, PURPOSE } from "./spec-compiler.mjs";
import { readClientIndexabilitySignals } from "../audit/indexability-reader.mjs";
import { factsPresentIn } from "../gate-a/existing-pages.mjs";
import { freshnessOf } from "../facts/lifecycle.mjs";
import { readClientDecay } from "./content-decay-evidence.mjs";

/** Pages that each cover the same registered need — each page's peers. */
export function sameNeedPeers(pages, values) {
  const peers = new Map(pages.map((p) => [p.pageId, new Set()]));
  for (const v of values) {
    const covering = pages.filter((p) => judgePage(p, v, values).verdict === PAGE_VERDICTS.COVERS).map((p) => p.pageId);
    if (covering.length < 2) continue;
    for (const id of covering) for (const other of covering) if (other !== id) peers.get(id).add(other);
  }
  return peers;
}

/** A page's same-need peers that a RECORDED review finds to duplicate or split one intent with it (RR-89); others are not successors. */
export function sameIntentPeers(pageId, needPeers, reviews) {
  const out = [];
  for (const peer of needPeers) {
    const r = reviews.find((x) => Array.isArray(x.pair) && x.pair.includes(pageId) && x.pair.includes(peer) && reviewShowsOneIntent(x));
    if (r) out.push({ pageId: peer, reviewRef: r.ref });
  }
  return out;
}

/**
 * @param {{ tenantId: string, product: object, records: object[], resolve: Function, env?: object, now?: Date, demand?: object|null, reviews: object[] }} input
 * `records` is the subject's fact registry (loadRegistry), handed in by the caller that loaded the product.
 */
/** The latest coverage record per need, from F91's planning-store rows (F91 C14). */
export function latestCoverageRecords(rows = []) {
  const latest = new Map();
  for (const r of rows) if (r?.record_type === COVERAGE && typeof r.needId === "string") latest.set(r.needId, r);
  return latest;
}

/** Ruling RR-174 (c): the declared spec whose variant is the need's candidate — its only page-candidate key being the product's axis. */
export function specForCandidate(pageCandidate, product) {
  let entries; try { entries = JSON.parse(pageCandidate); } catch { return null; }
  if (!Array.isArray(entries) || entries.length !== 1 || entries[0][0] !== product.axis?.key) return null;
  return Object.entries(product.pageSpecs ?? {}).find(([, s]) => s.variant === entries[0][1])?.[0] ?? null;
}

/**
 * 🔴 F35 C9 (Amendment 1) and I-3 (the owner's ruling RR-179 (b)) — EVERY GROUPED NEED DECIDED, from F91's planning store and the SAME tenant's
 * existing-page population, HANDED IN (the reader hands in the real one; a test hands in fixture pages — never the 27 pages the owner set
 * aside, RR-177). Pure: records in, decisions out; it reads and writes nothing.
 *
 *   first pass   each need: its coverage record (F91 C14), its central answer, the matching DECLARED spec's right-to-exist (ruling RR-174
 *                (c)) and the duplication verdict under ruling (d) — comparisons are the tenant's existing pages and every OTHER candidate
 *   second pass  a need HELD ONLY for want of a declared spec is COMPILED (F91 C19, src/page/spec-compiler.mjs); F36 judges the COMPILED
 *                spec — its siblings the declared specs and every other compiled one, its not-served part the need's own coverage record —
 *                and the need is decided again. A compiled spec is never by itself a reason for a page (A1).
 *   handed on    only a CHOSEN need: CREATE → `forConstruction` (its declared spec, or its spec compiled for construction); IMPROVE / ADD
 *                SECTION → `sectionProposals`, addressed to the existing page, never a new page (F34 C2, F33 C8).
 */
export function decideGroupedNeeds({ tenantId, product, population, planningRows = null, overturned = new Set(), duplicationReviews = [], rationaleReviews = [] }) {
  const values = product.variants ?? [];
  const connected = planningRows ? readConnections(planningRows, { overturned }) : null;
  const coverage = latestCoverageRecords(planningRows ?? []);
  const slugs = Object.keys(product.pageSpecs ?? {});
  const rteFor = (slug) => {
    const spec = product.pageSpecs[slug];
    const ex = existingPageFirst({ candidate: { slug, intent: spec.variant, structure: { values } }, tenantId, population });
    return rightToExist({ slug, spec, siblings: slugs.filter((x) => x !== slug).map((x) => ({ slug: x, spec: product.pageSpecs[x] })), variants: values, existingPageDecision: ex, rationaleReviews });
  };
  const grouped = connected ? connected.needs.map((n) => ({ ...n, slug: specForCandidate(n.pageCandidate, product) })) : [];
  const decideFor = (g, rte) => decideGroupedNeed({
    need: { needId: g.needId, pageCandidate: g.pageCandidate, questions: g.questions, tier: g.tier, centralSupported: g.answer?.centralSupported === true },
    coverage: coverage.get(g.needId) ?? null,
    rightToExist: rte,
    duplication: duplicationFor({ needId: g.needId, comparisons: [...population.pages.map((p) => p.pageId), ...grouped.filter((o) => o.needId !== g.needId).map((o) => o.needId), ...slugs.filter((s) => s !== g.slug)], reviews: duplicationReviews }),
  });
  const firstPass = grouped.map((g) => decideFor(g, g.slug ? rteFor(g.slug) : null));
  /* F91 C19 · ruling RR-174 (c): only a need HELD for want of a declared spec is compiled here, and only so F36 can judge it */
  const forJudgement = firstPass.map((d) => { const c = compileNeedSpec({ decision: d, rows: planningRows ?? [], overturned }).spec; return c?.purpose === PURPOSE.RIGHT_TO_EXIST ? c : null; });
  const pool = forJudgement.filter(Boolean).map((spec) => ({ slug: compiledSlug(spec.subject), spec }));
  const rteCompiled = (spec) => {
    const slug = compiledSlug(spec.subject);
    const siblings = [...slugs.map((x) => ({ slug: x, spec: product.pageSpecs[x] })), ...pool.filter((p) => p.slug !== slug)];
    return rightToExist({ slug, spec, siblings, variants: values, existingPageDecision: existingPageDecisionFromCoverage(coverage.get(spec.subject) ?? null), rationaleReviews });
  };
  const groupedNeeds = grouped.map((g, i) => (forJudgement[i] ? decideFor(g, rteCompiled(forJudgement[i])) : firstPass[i]));
  const forConstruction = [], sectionProposals = [], refusals = [];
  groupedNeeds.forEach((d, i) => {
    const purpose = purposeOf(d);
    if (purpose !== PURPOSE.CONSTRUCTION && purpose !== PURPOSE.SECTION_PROPOSAL) return;
    if (purpose === PURPOSE.CONSTRUCTION && grouped[i].slug) { forConstruction.push(Object.freeze({ slug: grouped[i].slug, decision: d, spec: null })); return; }
    const c = compileNeedSpec({ decision: d, rows: planningRows ?? [], overturned });
    if (!c.spec) { refusals.push(Object.freeze({ needId: d.subject.needId, refused: c.refused })); return; }
    (purpose === PURPOSE.CONSTRUCTION ? forConstruction : sectionProposals).push(Object.freeze({ slug: compiledSlug(c.spec.subject), decision: d, spec: c.spec }));
  });
  return Object.freeze({
    connected, slugs, grouped, groupedNeeds,
    compiled: Object.freeze({ forJudgement: pool.length, forConstruction: Object.freeze(forConstruction), sectionProposals: Object.freeze(sectionProposals), refusals: Object.freeze(refusals) }),
  });
}

export function readClientActionEvidence({ tenantId, product, records = [], resolve, env = process.env, now = new Date(), demand = null, reviews, decayEvidence, planningRows = null, overturned = new Set(), duplicationReviews = [], rationaleReviews = [] }) {
  /* RR-89: the recorded semantic reviews (F32's shape). None is recorded today and no store exists — the caller passes [] and says so */
  if (!Array.isArray(reviews)) throw new TypeError("reviews must be passed explicitly — an empty list is a recorded fact, not a default");
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  /* F43 (RR-91): each page's post-publication and removal evidence, from recorded performance only — NOINDEX and REMOVE read it */
  const decay = population ? new Map(readClientDecay({ tenantId, resolve, values: product.variants ?? [], decayEvidence, env, now }).assessments.map((a) => [a.pageId, a])) : new Map();
  if (!population) return { fault, needs: [], pages: [], bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const values = product.variants ?? [];
  const signals = new Map(readClientIndexabilitySignals({ tenantId, resolve, env }).urls.map((u) => [u.pageId, u]));
  const peers = sameNeedPeers(population.pages, values);
  const html = new Map(population.pages.map((p) => [p.pageId, p.html]));
  /* F35 C9: F91's grouped needs and their coverage records, read from the planning store the caller handed in (null = none named) */
  const connected = planningRows ? readConnections(planningRows, { overturned }) : null;
  const coverage = latestCoverageRecords(planningRows ?? []);
  const coverageForPage = (pageId) => {
    const named = [...coverage.values()].filter((r) => (r.pages ?? []).some((p) => p.pageId === pageId));
    const withGap = named.find((r) => r.pages.some((p) => p.pageId === pageId && p.newQuestionInIntent === true));
    return withGap ? questionCoverageFor(withGap, pageId) : named.length ? questionCoverageFor(named.at(-1), pageId) : null;
  };

  const pages = population.inventory.pages.map((p) => {
    const s = signals.get(p.pageId);
    const present = factsPresentIn(html.get(p.pageId) ?? "", records);
    return decideForPage({
      pageId: p.pageId,
      servedState: p.servedState.state === "OBSERVED" ? { ...p.servedState, evidence: p.evidence.observationIds } : p.servedState,
      signals: s ? { state: s.state, classes: s.classes, sources: s.sources } : { state: "NOT_MEASURED", classes: [] },
      sameNeedPeers: [...(peers.get(p.pageId) ?? [])],
      sameIntentPeers: sameIntentPeers(p.pageId, peers.get(p.pageId) ?? new Set(), reviews),
      inboundLinks: p.inboundLinks,
      completeness: population.completeness.state,
      completenessRef: `completeness:${population.completeness.basis.method}:${population.completeness.basis.asOf}`,
      staleFacts: present.filter((f) => freshnessOf(f, { now }).state === "STALE").map((f) => f.id),
      quality: null, questionCoverage: coverageForPage(p.pageId), postPublication: decay.get(p.pageId)?.postPublication ?? null, removal: decay.get(p.pageId)?.removal ?? null,
    });
  });

  /* F35 C9 + I-3 (RR-179): every grouped need decided in ONE pure function, the population handed in */
  const G = decideGroupedNeeds({ tenantId, product, population, planningRows, overturned, duplicationReviews, rationaleReviews });
  const { slugs, grouped, groupedNeeds } = G;
  const needs = slugs.map((slug) => decideForNeed({ slug, groupedNeedIds: grouped.filter((g) => g.slug === slug).map((g) => g.needId) }));

  return {
    fault: null,
    needs,
    pages,
    groupedNeeds: connected ? groupedNeeds : null,
    compiled: connected ? G.compiled : null,
    groupedNeedsMissing: connected ? null : "no research batch named — F91's planning store was not read, so grouped needs are NOT MEASURED",
    demandMonitoring: demand ? Object.freeze({ recorded: true, outcome: demand.outcome ?? null, independentCategories: demand.independentCategories ?? null, ref: demand.ref ?? null }) : Object.freeze({ recorded: false, note: "NOT MEASURED — no recorded demand outcome; demand strength is never an outcome and never a gate (F35 M9)" }),
    summary: { needs: summarise(needs), pages: summarise(pages), groupedNeeds: connected ? summarise(groupedNeeds) : null },
    bound: `recorded data only · ${needs.length} proposed need(s) · ${pages.length} existing page(s) · inventory ${population.completeness.state} · ${records.length} registry fact(s) · demand ${demand ? "RECORDED" : "NOT RECORDED"} · semantic reviews recorded ${reviews.length}`,
  };
}
