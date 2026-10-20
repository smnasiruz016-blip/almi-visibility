/**
 * 🔴 F76 C2 · THE BATCH IS THE APPROVED PLAN, AND NOTHING ELSE (beta-g decision A of RR-292; the owner's 43M lesson: the old pages were
 * built ON DEMAND whenever a crawler opened any URL, so the same thin pages were rebuilt again and again).
 *
 * The approved plan is F91's plan of the client's research batch (Amendment 6, src/page/page-plan.mjs): its DEMAND and OPPORTUNITY pages,
 * each with its own answer from verified claims; a MERGED combination is a SECTION of the page it merges into, never a page of its own.
 *   · approvedPlan — the plan read from the batch's own stored records (one reader for bin/page-plan.mjs and every batch build);
 * 🔴 RR-295 (owner decision 3): the plan-batch DRAFT BUILDER is removed — its 31 drafts were made by the wrong builder, and no page is kept
 *   from them. What stays is the plan READER (approvedPlan), for the planning records as history; a page is built only by the one builder
 *   (src/page/one-builder.mjs). No module here renders a page, so no request can ever generate one.
 * Pure. Generic: it names no client, product or host.
 */
import { planPages, LABEL } from "./page-plan.mjs";

export const PLANNED = Object.freeze([LABEL.DEMAND, LABEL.OPPORTUNITY]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The plan from a batch's stored records — `rows(file)` and `json(file)` read the batch's own files; `inputs` is its filed plan inputs.
 * Returns planPages' result (measured, counts, rows) or { measured: false, missing }.
 */
export function approvedPlan({ inputs, rows, json }) {
  const published = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.value, r])).values()];
  const first = inputs?.primary ?? {}, second = inputs?.secondary ?? {};
  const primaries = (first.values ?? []).map((p) => ({ ...p, page: published.find((x) => x.value === p.value)?.publishedUrl ?? null }));
  const claims = (json("page-drafts.json")?.pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ claimId: c.claimId, primary: p.combination?.[first.name], body: c.body ?? c.source?.body, text: c.text, source: c.source ? { name: c.source.name ?? null, link: c.source.link ?? null, readOn: c.source.readOn ?? null } : null }))));
  const records = [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...[...rows("search-phrases.jsonl"), ...rows("search-console-exports.jsonl")].filter((x) => x.record_type === "search_phrase")];
  /* RR-293: the plan's rows name their answer by claim id only — the claims themselves ride beside the plan, so a draft shows each claim's
   * words, its source and the day it was read (the RR-292 drafts printed the ids' missing text as empty paragraphs) */
  const plan = planPages({ primaries, secondaries: second.values ?? [], claims, records });
  return plan.measured ? Object.freeze({ ...plan, claimsById: new Map(claims.map((c) => [c.claimId, c])) }) : plan;
}

/** The path a planned page is built at: /<primary>/<secondary> — from its combination, never from a request. */
export const planPath = (row) => `/${slug(row.primary)}/${slug(row.secondary)}`;
/** The planned pages of a plan: its DEMAND and OPPORTUNITY rows, each keyed by its path. */
export const plannedPages = (plan) => (plan?.rows ?? []).filter((r) => PLANNED.includes(r.label)).map((r) => Object.freeze({ path: planPath(r), combination: r.combination, label: r.label, row: r }));
