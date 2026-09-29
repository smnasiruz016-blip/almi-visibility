/**
 * F41 · ONE CLIENT'S BRIEFS, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 454396e).
 *
 * Decisions: F35 (src/page/action-evidence.mjs). Section inputs, each read from a verified row — nothing is collected:
 *   intent                   F33: the registered value the page's headline covers (judgePage COVERS); a candidate's declared variant
 *   verified facts/sources   the fact registry's records present on the page (src/gate-a/existing-pages.mjs factsPresentIn)
 *   internal links           F31: the inventory's completeness; no link target is recorded between the client's pages
 *   unique value             F39: none recorded
 *   entities · questions · locale terms · CTA · schema · prohibited claims   none recorded — MISSING, named by the brief
 *   owner approvals          none recorded; the caller passes them EXPLICITLY
 * Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { judgePage, PAGE_VERDICTS } from "./need-coverage.mjs";
import { readClientActionEvidence } from "./action-evidence.mjs";
import { factsPresentIn } from "../gate-a/existing-pages.mjs";
import { buildBrief, summariseBriefs } from "./content-brief.mjs";

export function readClientBriefs({ tenantId, product, records = [], resolve, approvals, reviews, decayEvidence, env = process.env, now = new Date() }) {
  if (!Array.isArray(approvals)) throw new TypeError("approvals must be passed explicitly — an empty list is a recorded fact, not a default");
  const ae = readClientActionEvidence({ tenantId, product, records, resolve, env, now, reviews, decayEvidence });
  if (ae.fault) return { fault: ae.fault, bound: ae.bound };
  const { population } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  const values = product.variants ?? [];
  const html = new Map(population.pages.map((p) => [p.pageId, p.html]));
  const completeness = population.completeness.state;
  const completenessRef = `completeness:${population.completeness.basis.method}:${population.completeness.basis.asOf}`;

  const pageEvidence = (pageId) => {
    const body = html.get(pageId) ?? "";
    const covered = values.find((v) => judgePage({ pageId, html: body }, v, values).verdict === PAGE_VERDICTS.COVERS) ?? null;
    return {
      need: covered ? { value: covered, ref: `F33:COVERS:${pageId}` } : null,
      facts: factsPresentIn(body, records),
      links: { completeness, targets: [], ref: completenessRef },
    };
  };
  const needEvidence = (slug) => {
    const v = product.pageSpecs?.[slug]?.variant;
    return { need: v ? { value: v, ref: `pageSpec:${slug}` } : null, facts: [], links: { completeness, targets: [], ref: completenessRef } };
  };

  const briefs = [
    ...ae.needs.map((d) => buildBrief({ decision: d, approvals, evidence: needEvidence(d.subject.slug), now })),
    ...ae.pages.map((d) => buildBrief({ decision: d, approvals, evidence: pageEvidence(d.subject.pageId), now })),
  ];
  return {
    fault: null,
    briefs,
    summary: summariseBriefs(briefs),
    bound: `recorded data only · ${briefs.length} subject(s) (${ae.needs.length} proposed need(s) · ${ae.pages.length} existing page(s)) · owner approvals ${approvals.length} · semantic reviews ${reviews.length} · ${records.length} registry fact(s) · inventory ${completeness} · nothing collected`,
  };
}
