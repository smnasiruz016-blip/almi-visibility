/**
 * 🔴 F76 C2 · THE BATCH IS THE APPROVED PLAN, AND NOTHING ELSE (beta-g decision A of RR-292; the owner's 43M lesson: the old pages were
 * built ON DEMAND whenever a crawler opened any URL, so the same thin pages were rebuilt again and again).
 *
 * The approved plan is F91's plan of the client's research batch (Amendment 6, src/page/page-plan.mjs): its DEMAND and OPPORTUNITY pages,
 * each with its own answer from verified claims; a MERGED combination is a SECTION of the page it merges into, never a page of its own.
 *   · approvedPlan — the plan read from the batch's own stored records (one reader for bin/page-plan.mjs and every batch build);
 *   · buildPlanBatch — every planned page built at once, as a LOCAL draft (nothing written, published or submitted), and no other;
 *   · servePlanned — a URL answers only with a page the batch built: a URL not in the plan is 404, on any request, at any time — there is
 *     no builder behind it (the module holds none), so a request can never generate a page.
 * Pure. Generic: it names no client, product or host.
 */
import { createHash } from "node:crypto";
import { planPages, LABEL } from "./page-plan.mjs";

export const PLANNED = Object.freeze([LABEL.DEMAND, LABEL.OPPORTUNITY]);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

/**
 * Build every planned page at once — and no other. Each draft: its combination as the heading, its own answer (each verified claim's words
 * and the body that states it), and one section per combination MERGED into it (named, never a page of its own). The OPPORTUNITY label is
 * never on the page. Returns Map(path → { html, sha256, combination, sections }) — local, in memory: nothing is written or published.
 */
export function buildPlanBatch(plan) {
  const pages = plannedPages(plan);
  const merged = (plan?.rows ?? []).filter((r) => r.label === LABEL.MERGED);
  const out = new Map();
  for (const p of pages) {
    const sections = merged.filter((m) => m.target === p.combination);
    /* each answer entry is a claim id (the plan's own shape) or a claim; a claim id the plan does not carry is named, never printed empty */
    const claims = (p.row.answer ?? []).map((c) => (typeof c === "string" ? plan.claimsById?.get(c) ?? { claimId: c, text: `[claim ${c}: its words are not in the plan's records]` } : c));
    const html = [
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.combination)}</title><meta name="robots" content="noindex"></head><body>`,
      `<h1>${esc(p.combination)}</h1>`,
      ...claims.map((c) => `<p>${esc(c.text)}${c.source?.link ? ` <small>Source: <a href="${esc(c.source.link)}">${esc(c.source.name ?? c.body ?? c.source.link)}</a>${c.source.readOn ? `, checked ${esc(c.source.readOn)}` : ""}</small>` : c.body ? ` <small>(${esc(c.body)})</small>` : ""}</p>`),
      ...sections.map((m) => `<h2>${esc(m.combination)}</h2><p>${esc(m.reason)}</p>`),
      "</body></html>",
    ].join("\n");
    out.set(p.path, Object.freeze({ html, sha256: createHash("sha256").update(html).digest("hex"), combination: p.combination, claims: claims.length, sections: sections.length }));
  }
  return out;
}

/** The keys an approved plan admits: each planned page's combination and its path as a slug ("/a/b" → "a-b"). */
export const approvedKeys = (plan) => new Set(plannedPages(plan).flatMap((p) => [p.combination, p.path.slice(1).replace(/\//g, "-")]));

/**
 * F76 C2 · what bin/build-page.mjs --all-slugs may build: the product's owner-declared specs (`requested`), and a need F35 chose
 * (`chosen`, each { slug, spec }) ONLY when the approved plan holds its page. `approved` is approvedKeys(plan), or null when no plan is
 * filed — then no chosen need is added. Returns { requested, notInPlan } — every chosen need left out, named.
 */
export function allSlugsOverPlan({ requested, chosen, approved }) {
  const extra = (chosen ?? []).filter((d) => d.spec && !requested.includes(d.slug));
  const inPlan = extra.filter((d) => approved instanceof Set && approved.has(d.slug));
  return Object.freeze({ requested: [...requested, ...inPlan.map((d) => d.slug)], notInPlan: extra.filter((d) => !inPlan.includes(d)).map((d) => d.slug) });
}

/** A URL answers only from the built batch: 200 with its page, or 404 — never a page built on request. */
export function servePlanned(path, batch) {
  const p = String(path ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const page = batch.get(p);
  return page ? Object.freeze({ status: 200, path: p, sha256: page.sha256 }) : Object.freeze({ status: 404, path: p, reason: "not in the approved plan — no page is built on request" });
}
