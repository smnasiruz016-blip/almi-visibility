/**
 * F38 · ONE CLIENT'S HEADS AND HEAD FINDINGS, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 96ae49e, RR-210). The rules are pure
 * (./answer-first.mjs); this module only assembles ONE tenant's records for them, through readers already verified for that tenant:
 *
 *   existing pages + bound    F31: the tenant's population (its pages and their stored bodies) and its completeness verdict
 *   new pages                 F35's chosen CREATE needs (handed in by the caller), each rendered by F37's own render — read here, never
 *                             changed; the head is built BESIDE that body. F94's plan is NOT read (F94 C7: a row reads the plan only by its
 *                             own amended acceptance): it changes a draft's navigation, canonical and plan notice, never its title or direct answer
 *
 * 🔴 READ-ONLY. The scope handed to F31's reader carries no recorder; nothing is fetched, written or published. Count-only callers.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { renderCompiledDraft, DRAFT } from "./draft-render.mjs";
import { headForDraft, headOfBody, auditExistingPages } from "./answer-first.mjs";

/** The default reader — F31's own. A test hands its own (`io`) to see exactly which tenant each read asks for. */
export const READERS = Object.freeze({
  population: ({ tenantId, resolve, env, now }) => readExistingPagePopulation({ scope: { tenantId }, resolve, env, now }),
});

/** One tenant's heads (for each chosen CREATE need's draft) and its existing-page audit. */
export function readClientHeads({ tenantId, chosen = [], resolve, env = process.env, now = new Date(), io = READERS }) {
  const { population, fault } = io.population({ tenantId, resolve, env, now });
  if (!population) return { fault: fault ?? "POPULATION_UNAVAILABLE", heads: [], audit: null };
  const pages = population.pages.map((p) => ({ pageId: p.pageId, tenantId: p.tenantId ?? tenantId, html: p.html }));
  const audit = auditExistingPages({ tenantId, pages, completeness: population.completeness });
  const recorded = pages.map((p) => headOfBody(p.html));
  const drafts = chosen.filter((d) => d?.spec).map((d) => ({ d, draft: renderCompiledDraft({ spec: d.spec, decision: d.decision, plan: null }) })).filter((x) => x.draft.state === DRAFT.RENDERED);
  const heads = drafts.map(({ d, draft }, i) => {
    const others = drafts.filter((_, j) => j !== i).map((x) => ({ titles: [x.d.spec.title], descriptions: [] }));
    return headForDraft({ spec: d.spec, draft, completeness: population.completeness,
      others: { titles: [...recorded.flatMap((h) => h.titles), ...others.flatMap((o) => o.titles)], descriptions: recorded.flatMap((h) => h.descriptions) } });
  });
  return { fault: null, heads, audit };
}
