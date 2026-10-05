/**
 * F41 · ONE CLIENT'S BRIEFS, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 454396e).
 *
 * Decisions: F35 (src/page/action-evidence.mjs). Section inputs, each read from a verified row — nothing is collected:
 *   intent                   F33: the registered value the page's headline covers (judgePage COVERS); a candidate's declared variant
 *   verified facts/sources   the fact registry's records present on the page (src/gate-a/existing-pages.mjs factsPresentIn)
 *   internal links           F31: the inventory's completeness; no link target is recorded between the client's pages
 *   unique value             F39: none recorded
 *   schema                   F48: the structured-data type of a page whose markup is ALIGNED with its visible text (none today — every
 *                            page has render-only texts, so its visibility is NOT MEASURED)
 *   entities · questions · locale terms · CTA · prohibited claims   none recorded — MISSING, named by the brief
 *   grouped needs            🔴 F41 Amendment 1 C8 (RR-179): F35's grouped-need decisions (action-evidence, from F91's planning store the
 *                            caller names); each brief's intent is the GROUPED NEED, its questions carry tier and marking (the connection's
 *                            tier; GENERATED for a route-1 wording), its answer claims are F91 C17's judged claims
 *   owner approvals          NONE needed: a routine brief is prepared without per-item approval (C1 as amended, D5)
 * Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { judgePage, PAGE_VERDICTS } from "./need-coverage.mjs";
import { readClientActionEvidence } from "./action-evidence.mjs";
import { factsPresentIn } from "../gate-a/existing-pages.mjs";
import { buildBrief, summariseBriefs } from "./content-brief.mjs";
import { readClientStructuredData } from "./structured-data-evidence.mjs";
import { CONNECTION, NEED, TIERS } from "./demand-connection.mjs";
import { ROUTES } from "../research/research-derived.mjs";

/**
 * F41 Amendment 1 C8 · one grouped need's brief evidence, from the planning store's OWN rows: the GROUPED NEED as intent; its questions, each
 * with its tier and marking (the connection's tier; GENERATED for a route-1 wording, the record's own marking); its judged answer claims
 * (F91 C17). Pure; count-only callers.
 */
export function groupedNeedEvidence(rows, needId, { overturned = new Set(), links = null } = {}) {
  const mine = (rows ?? []).filter((r) => r?.needId === needId);
  const qs = mine.filter((r) => r.record_type === CONNECTION && !overturned.has(r.questionId));
  const need = mine.filter((r) => r.record_type === NEED).at(-1) ?? null;
  return {
    need: qs.length ? { groupedNeed: needId, pageCandidate: JSON.stringify(Object.entries(qs[0].combination ?? {}).sort()), ref: qs[0].measurement_key } : null,
    questions: qs.length ? { items: qs.map((q) => ({ questionId: q.questionId, wording: q.wording, tier: q.tier ?? TIERS.OBSERVED, marking: q.tier === TIERS.RESEARCH_DERIVED && q.route === ROUTES.CLIENT_AI ? "GENERATED" : null })), ref: `planning:${needId}` } : null,
    facts: [], answerClaims: need?.answer?.claims ?? [],
    links,
  };
}

export function readClientBriefs({ tenantId, product, records = [], resolve, reviews, decayEvidence, planningRows = null, overturned = new Set(), duplicationReviews = [], rationaleReviews = [], env = process.env, now = new Date() }) {
  const ae = readClientActionEvidence({ tenantId, product, records, resolve, env, now, reviews, decayEvidence, planningRows, overturned, duplicationReviews, rationaleReviews });
  if (ae.fault) return { fault: ae.fault, bound: ae.bound };
  const { population } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  const values = product.variants ?? [];
  const html = new Map(population.pages.map((p) => [p.pageId, p.html]));
  const completeness = population.completeness.state;
  const completenessRef = `completeness:${population.completeness.basis.method}:${population.completeness.basis.asOf}`;

  /* F48 (RR-92): the schema section only from a page whose recorded structured data is ALIGNED with its visible text */
  const schemaFacts = readClientStructuredData({ tenantId, resolve, env, now }).schemaFacts ?? new Map();
  const pageEvidence = (pageId) => {
    const body = html.get(pageId) ?? "";
    const covered = values.find((v) => judgePage({ pageId, html: body }, v, values).verdict === PAGE_VERDICTS.COVERS) ?? null;
    return {
      need: covered ? { value: covered, ref: `F33:COVERS:${pageId}` } : null,
      facts: factsPresentIn(body, records),
      links: { completeness, targets: [], ref: completenessRef },
      schema: schemaFacts.get(pageId) ?? null,
    };
  };
  const needEvidence = (slug) => {
    const v = product.pageSpecs?.[slug]?.variant;
    return { need: v ? { value: v, ref: `pageSpec:${slug}` } : null, facts: [], links: { completeness, targets: [], ref: completenessRef } };
  };

  const groupedEvidence = (needId) => groupedNeedEvidence(planningRows ?? [], needId, { overturned, links: { completeness, targets: [], ref: completenessRef } });

  const briefs = [
    ...ae.needs.map((d) => buildBrief({ decision: d, evidence: needEvidence(d.subject.slug), now })),
    ...ae.pages.map((d) => buildBrief({ decision: d, evidence: pageEvidence(d.subject.pageId), now })),
    ...(ae.groupedNeeds ?? []).map((d) => buildBrief({ decision: d, evidence: groupedEvidence(d.subject.needId), now })),
  ];
  return {
    fault: null,
    briefs,
    summary: summariseBriefs(briefs),
    bound: `recorded data only · ${briefs.length} subject(s) (${ae.needs.length} proposed need(s) · ${ae.pages.length} existing page(s) · ${(ae.groupedNeeds ?? []).length} grouped need(s)) · prepared without per-item approval (D5) · semantic reviews ${reviews.length} · ${records.length} registry fact(s) · inventory ${completeness} · nothing collected`,
  };
}
