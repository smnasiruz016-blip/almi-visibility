/**
 * F92 · ONE CLIENT'S IMAGE AND VIDEO VISIBILITY, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 06cdb82, RR-216). The rules are pure
 * (./media-visibility.mjs); this module only assembles ONE tenant's records for them, through readers already verified for that tenant:
 *
 *   pages, bodies, bound          F31: the tenant's population (stored bodies) and its completeness verdict
 *   page URLs                     F31's partition (each page's canonical URL)
 *   sitemap media entries         the tenant's sitemap capture — only where a record holds media entries (none does today: URL strings only)
 *   description judgements        none: no provider is registered — handed in as [] and reported NOT MEASURED
 *   media needs                   none: no need record names a media format — NOT MEASURED
 *   new pages                     F35's chosen CREATE needs (handed in), each F37's own render (plan: null — F94 C7), read, never changed
 *
 * 🔴 READ-ONLY. The scope handed to F31's reader carries no recorder; nothing is fetched, written or published. Count-only callers.
 */
import { readTenantPartition } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../adapter/sitemap-subject.mjs";
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { renderCompiledDraft, DRAFT } from "./draft-render.mjs";
import { auditMedia, planForDraft } from "./media-visibility.mjs";

/** The media entries a sitemap capture RECORDS, or null when no record holds any (the capture stores URL strings only). */
export function sitemapMediaOf(records = []) {
  const held = records.filter((r) => r?.record_type === "observation" && Array.isArray(r.value?.media));
  return held.length ? held.flatMap((r) => r.value.media) : null;
}
/** A need's recorded media format — none is recorded by any planning row today. */
export const mediaNeedOf = (spec) => (typeof spec?.mediaFormat === "string" && typeof spec?.mediaFormatRef === "string" ? { needId: spec.subject, mediaFormat: spec.mediaFormat, ref: spec.mediaFormatRef } : null);

/** The default readers — F31's own. A test hands its own (`io`) to see which tenant each read asks for. */
export const READERS = Object.freeze({
  population: ({ tenantId, resolve, env, now }) => readExistingPagePopulation({ scope: { tenantId }, resolve, env, now }),
  partition: ({ tenantId, resolve, env }) => readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env }),
  sitemap: ({ tenantId, resolve, env }) => readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve, env }),
});

export function readClientMedia({ tenantId, chosen = [], resolve, env = process.env, now = new Date(), io = READERS }) {
  const { population, fault } = io.population({ tenantId, resolve, env, now });
  if (!population) return { fault: fault ?? "POPULATION_UNAVAILABLE", audit: null, plans: [] };
  const part = io.partition({ tenantId, resolve, env });
  const urlOf = new Map(part.records.filter((x) => x.record_type === "page").map((r) => [r.page_id, r.canonical_url]));
  const pages = population.pages.map((p) => ({ pageId: p.pageId, tenantId: p.tenantId ?? tenantId, url: urlOf.get(p.pageId) ?? null, html: p.html }));
  const sitemapMedia = sitemapMediaOf(io.sitemap({ tenantId, resolve, env }).records);
  const audit = auditMedia({ tenantId, pages, completeness: population.completeness, judgements: [], population: "REAL", registeredProviders: [], sitemapMedia });
  const plans = chosen.filter((d) => d?.spec).map((d) => ({ d, draft: renderCompiledDraft({ spec: d.spec, decision: d.decision, plan: null }) }))
    .filter((x) => x.draft.state === DRAFT.RENDERED)
    .map(({ d, draft }) => ({ ...planForDraft({ draft: { ...draft, subject: d.spec.subject }, need: mediaNeedOf(d.spec), completeness: population.completeness }), subject: d.spec.subject }));
  return { fault: null, audit, plans, sitemapMediaRecorded: Array.isArray(sitemapMedia) };
}
