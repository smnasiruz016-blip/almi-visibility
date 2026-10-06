/**
 * F37 · BEST-ANSWER ARCHITECTURE — THE COMPLETE-DRAFT RENDER (Acceptance _handoffs 9516f2c, RR-180; RTP-1 Rev 6 P6b, P13b–c, P14, P19, P21,
 * D3, D4; the owner's rulings RR-179 (c), (d) and RR-180).
 *
 * One compiled spec (F91 C19) of a grouped need F35 CHOSE to CREATE becomes ONE complete owner-reviewable local draft:
 *
 *   - a DIRECT ANSWER to the central question — the need's central supported claims;
 *   - the full Q&A: one section per compiled question, its heading the question's own wording, its TIER and GENERATED marking VISIBLE beside it;
 *   - every material claim written ONLY as its own recorded statement, with its label (RESPONSIBLE BODY · PRODUCT'S OWN SITE · SECONDARY), its
 *     source's name and link and the date read, and traced in the page to its claim id (data-claim-id) and in the trace;
 *   - every unsupported part rendered VISIBLY as UNKNOWN — never filled in; a supported claim with no recorded statement is UNKNOWN too;
 *   - the attribution check (F16 C29 / P13c): no heading or title attributes a research-derived question to people;
 *   - Q&A markup (FAQPage) only for a section whose answer is rendered as supported claims, in exactly the visible words, checked by F48's
 *     rule; no ranking, indexing or citation promise anywhere;
 *   - the MEASURABLE checks of P21: direct answer, every claim sourced, headings match, internal links in and out, technical eligibility, markup
 *     aligned. A check whose input is not recorded is NOT MEASURED, named, never passed by default. No word or fact-count threshold exists here.
 *   - P21's JUDGED qualities (engaging, hookable, filler, repetition) are F40's — never required or recorded here.
 *
 * The writer is this deterministic path; no writing-AI provider is connected or registered (D4). It reads no source, fetches nothing, and
 * writes nothing: it returns HTML and a trace. Publication is never its act. A section proposal (IMPROVE / ADD SECTION) is rendered as a
 * fragment addressed to the existing page — never a new page, never a URL — the page unchanged until the owner approves (F34 C3).
 */
import { attributionRefusal } from "../research/research-derived.mjs";
import { assessPage, STATE as MARKUP } from "./structured-data.mjs";
import { isChosenCreate } from "./action-decision.mjs";
import { PURPOSE, SPEC_KIND, GENERATED } from "./spec-compiler.mjs";

export const WRITER = "deterministic construction (src/page/draft-render.mjs); no writing-AI provider is connected or registered (D4)";
export const CHECK = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT MEASURED" });
export const DRAFT = Object.freeze({ RENDERED: "RENDERED", REFUSED: "REFUSED" });
export const DRAFT_REFUSAL = Object.freeze({
  NOT_CHOSEN: "F35 did not choose CREATE for this compiled spec's need — no draft is rendered (ruling RR-179 (c))",
  NOT_A_PAGE: "the spec is not a page spec compiled for construction — a spec compiled for judgement, or a section proposal, is never a page",
  ATTRIBUTION: "a heading or title attributes a research-derived question to people without observed evidence (F16 C29, P13c)",
});
/* copy that would promise a result — never written (P21, D3) */
export const PROMISE = /\b(guarantee[sd]?|rank(s|ed|ing)? (#?1|first|top)|top of (google|search)|cited by (ai|chatgpt|gemini)|will (rank|be indexed|be cited))\b/i;
const TIER_LABEL = Object.freeze({ OBSERVED: "Asked publicly (observed)", "RESEARCH-DERIVED": "Research-derived question" });
const present = (v) => typeof v === "string" && v.trim() !== "";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A supported claim renders as fact only with its own statement and its full source; otherwise it is an UNKNOWN part, named. */
export function claimsOf(spec) {
  const renderable = [], unknown = [...(spec?.answer?.unknown ?? []).map((u) => ({ claimId: u.claimId ?? null, why: u.why ?? "unsupported" }))];
  for (const c of spec?.answer?.labels ?? []) {
    if (present(c.text) && present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "") && present(c.label)) renderable.push(c);
    else unknown.push({ claimId: c.claimId, why: !present(c.text) ? "the claim's own statement is not recorded" : "its source's name, link or date read is not recorded" });
  }
  return { renderable, unknown };
}
/* P14: a third party's estimate is stated ONLY as that source's estimate — C17's own words, never an official fee or a guaranteed time */
const estimateOf = (c) => (present(c.statedAs) && /estimate/.test(c.statedAs) ? ` · ${c.statedAs}` : "");
const claimHtml = (c) => `<div class="claim" data-claim-id="${esc(c.claimId)}"><p class="claim-text">${esc(c.text)}</p><p class="citation">${esc(c.label)} source: <a href="${esc(c.link)}" rel="nofollow noopener">${esc(c.source)}</a> — read ${esc(c.readOn)}${esc(estimateOf(c))}</p></div>`;
const unknownHtml = (u) => `<p class="unknown" data-claim-id="${esc(u.claimId ?? "none")}">UNKNOWN — ${esc(u.why)}</p>`;
/* D3: the marked-up answer is EXACTLY the visible answer block — each statement with its citation line, in page order */
const answerText = (claims) => claims.map((c) => `${c.text} ${c.label} source: ${c.source} — read ${c.readOn}${estimateOf(c)}`).join(" ");

/**
 * @param {{ spec: object, decision: object, links?: { completeness: string, out: {pageId: string, url: string, title: string}[], inboundFrom: {pageId: string}[], selfUrl?: string, ref: string }|null }} input
 */
export function renderCompiledDraft({ spec, decision, links = null }) {
  if (spec?.kind !== SPEC_KIND.PAGE || spec?.purpose !== PURPOSE.CONSTRUCTION) return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.NOT_A_PAGE });
  if (!isChosenCreate(decision) || decision.subject.needId !== spec.subject) return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.NOT_CHOSEN });
  const research = (s) => s.tier === "RESEARCH-DERIVED";
  if ([...spec.sections.filter(research).map((s) => s.heading), ...(spec.sections.some(research) ? [spec.title] : [])].some((t) => attributionRefusal(t, { tier: "RESEARCH-DERIVED" })))
    return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.ATTRIBUTION });
  const { renderable, unknown } = claimsOf(spec);
  const central = renderable.filter((c) => c.central !== false);
  const trace = [];
  const traced = (claims, where) => { for (const c of claims) trace.push(Object.freeze({ claimId: c.claimId, label: c.label, source: c.source, link: c.link, readOn: c.readOn, section: where })); return claims.map(claimHtml); };
  /* 🔴 F37 C7 (Acceptance Amendment 1, RR-186; the owner's ruling in RR-185): EACH DISTINCT CLAIM ONCE. The need's answer — its central claims
   * first, then the rest — is rendered ONCE, contiguously, in the answer block (id "answer"), each claim with its label, source, date read and
   * trace; every UNKNOWN part is shown once. A Q&A section never renders a claim again: its heading — its question's own wording, unchanged
   * (C2) — links back to the answer block, and the section names the claims it refers to in data-refers-to. A refer-back adds no visible
   * text. Each question's markup carries the answer block's text, visible once on the page (C6, F48's rule). */
  const seen = new Set(), shownUnknown = new Set();
  const once = (claims) => claims.filter((c) => !seen.has(c.claimId) && seen.add(c.claimId));
  const unknownOnce = (parts) => parts.filter((u) => { const k = u.claimId ?? `none:${u.why}`; return !shownUnknown.has(k) && shownUnknown.add(k); });
  const answerClaims = [...central, ...renderable.filter((c) => c.central === false)];
  const out = [`<article class="draft" data-subject="${esc(spec.subject)}" data-writer="${esc(WRITER)}">`, `<h1>${esc(spec.title)}</h1>`];
  out.push(`<section class="direct-answer" id="answer"><h2>The answer</h2>`, ...(central.length ? [] : [unknownHtml({ claimId: null, why: "the central answer is not supported" })]),
    ...traced(once(answerClaims), "the answer"), ...unknownOnce(unknown).map(unknownHtml), `</section>`);
  const rendered = answerClaims.filter((c) => seen.has(c.claimId));
  const faq = [];
  const sectionsOut = spec.sections.map((s) => {
    const mine = renderable.filter((c) => (s.claims ?? []).includes(c.claimId));
    const own = unknownOnce((s.unknown ?? []).map((u) => ({ claimId: u.claimId ?? null, why: u.why ?? "unsupported" })));
    const tierLine = `${TIER_LABEL[s.tier] ?? s.tier}${s.marking === GENERATED ? " · GENERATED wording" : ""}`;
    out.push(`<section class="qa" data-question-id="${esc(s.questionId)}" data-tier="${esc(s.tier)}" data-marking="${esc(s.marking ?? "NONE")}" data-refers-to="${esc(mine.map((c) => c.claimId).join(" "))}">`,
      `<h2><a href="#answer">${esc(s.heading)}</a></h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`, ...traced(once(mine), s.heading), ...own.map(unknownHtml), `</section>`);
    if (mine.length) faq.push({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: answerText(rendered) } });
    return { heading: s.heading, claims: mine.length, unknown: own.length };
  });
  for (const cs of spec.countrySections ?? []) {
    const mine = renderable.filter((c) => (cs.claims ?? []).includes(c.claimId));
    const fresh = once(mine);
    out.push(`<section class="country-part" data-country="${esc(cs.country)}" data-refers-to="${esc(mine.filter((c) => !fresh.includes(c)).map((c) => c.claimId).join(" "))}">`, `<h2>${esc(cs.country)}</h2>`,
      ...traced(fresh, cs.country), ...unknownOnce(cs.unknown ?? []).map(unknownHtml), `</section>`);
  }
  const outLinks = links && links.completeness === "COMPLETE" && Array.isArray(links.out) ? links.out.filter((l) => present(l?.url)) : [];
  if (outLinks.length) out.push(`<nav class="related"><h2>Related pages</h2><ul>${outLinks.map((l) => `<li><a href="${esc(l.url)}">${esc(l.title ?? l.url)}</a></li>`).join("")}</ul></nav>`);
  if (faq.length) out.push(`<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq }).replace(/</g, "\\u003c")}</script>`);
  out.push(`</article>`);
  const head = present(links?.selfUrl) ? `<link rel="canonical" href="${esc(links.selfUrl)}">\n` : "";
  const html = head + out.join("\n");

  /* ── P21's MEASURABLE checks; no word or fact count decides anything ── */
  const checks = {};
  checks.directAnswer = central.length ? { state: CHECK.PASS } : { state: CHECK.FAIL, why: "no supported central claim to answer the central question" };
  const tracedIds = new Set(trace.map((t) => t.claimId));
  const factDivs = [...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]);
  checks.everyClaimSourced = factDivs.every((id) => tracedIds.has(id)) && trace.every((t) => present(t.source) && present(t.link) && present(t.readOn)) ? { state: CHECK.PASS } : { state: CHECK.FAIL, why: "a written claim lacks its source or its trace" };
  const headings = [...html.matchAll(/<section class="qa"[^>]*>\n<h2><a href="#answer">([^<]*)<\/a><\/h2>/g)].map((m) => m[1]);
  checks.headingsMatch = headings.length === spec.sections.length && spec.sections.every((s, i) => headings[i] === esc(s.heading)) ? { state: CHECK.PASS } : { state: CHECK.FAIL, why: "a heading differs from its compiled section's wording" };
  checks.internalLinks = !links || links.completeness !== "COMPLETE"
    ? { state: CHECK.NOT_MEASURED, why: "no recorded internal-link targets within a COMPLETE inventory — internal links in and out cannot be measured" }
    : !outLinks.length && !(links.inboundFrom ?? []).length ? { state: CHECK.NOT_MEASURED, why: "no internal-link target is recorded in or out (F37-9: an input not recorded is never passed by default)" }
    : outLinks.length && (links.inboundFrom ?? []).length ? { state: CHECK.PASS, out: outLinks.length, inboundFrom: links.inboundFrom.length } : { state: CHECK.FAIL, why: "no internal link out, or no recorded page to link in from" };
  checks.technical = !present(links?.selfUrl) ? { state: CHECK.NOT_MEASURED, why: "no proposed URL is recorded — canonical and indexability cannot be measured" }
    : /noindex/i.test(html) ? { state: CHECK.FAIL, why: "the draft carries noindex" } : { state: CHECK.PASS };
  const markup = assessPage({ pageId: `draft:${spec.subject}`, html, verified: true });
  checks.markup = !faq.length ? { state: CHECK.PASS, note: "no Q&A has a supported answer, so none is marked up" }
    : markup.state === MARKUP.ALIGNED && !PROMISE.test(html) ? { state: CHECK.PASS } : { state: CHECK.FAIL, why: PROMISE.test(html) ? "a promise of ranking, indexing or citation" : `markup ${markup.state}` };
  const states = Object.values(checks).map((c) => c.state);
  const state = states.includes(CHECK.FAIL) ? CHECK.FAIL : states.includes(CHECK.NOT_MEASURED) ? CHECK.NOT_MEASURED : CHECK.PASS;
  const sources = new Set(trace.map((t) => t.link));
  return Object.freeze({
    state: DRAFT.RENDERED, html, trace: Object.freeze(trace), writer: WRITER, checks: Object.freeze(checks), checksVerdict: state,
    counts: Object.freeze({ sections: spec.sections.length + 1 + (spec.countrySections ?? []).length, questions: spec.sections.length, claims: renderable.length, sources: sources.size, unknown: unknown.length, markedUp: faq.length }),
    sectionsOut: Object.freeze(sectionsOut),
  });
}

/**
 * IMPROVE / ADD SECTION · a SECTION PROPOSAL for the existing page its coverage record names: the compiled Q&A for each missing question, as
 * a fragment addressed to that page. Never a new page, never a URL; the existing page stays unchanged until the owner approves (F34 C3).
 */
export function renderSectionProposal({ spec, decision }) {
  const acts = (decision?.actions ?? []).map((a) => a.action);
  if (spec?.kind !== SPEC_KIND.SECTION_PROPOSAL || !(acts.includes("ADD SECTION") || acts.includes("IMPROVE")) || decision.subject?.needId !== spec.subject)
    return Object.freeze({ state: DRAFT.REFUSED, why: "not a section proposal F35 chose (IMPROVE / ADD SECTION)" });
  const { renderable, unknown } = claimsOf(spec);
  const parts = spec.sections.map((s) => [`<section class="proposed-qa" data-question-id="${esc(s.questionId)}" data-tier="${esc(s.tier)}" data-marking="${esc(s.marking ?? "NONE")}">`, `<h2>${esc(s.heading)}</h2>`,
    `<p class="qa-tier">${esc(`${TIER_LABEL[s.tier] ?? s.tier}${s.marking === GENERATED ? " · GENERATED wording" : ""}`)}</p>`,
    ...renderable.filter((c) => (s.claims ?? []).includes(c.claimId)).map(claimHtml), ...unknown.map(unknownHtml), `</section>`].join("\n"));
  return Object.freeze({
    state: DRAFT.RENDERED, kind: SPEC_KIND.SECTION_PROPOSAL, newPage: false, url: null,
    targetPages: Object.freeze([...(spec.target?.existingPages ?? [])]), unchangedUntilOwnerApproves: true,
    fragment: `<div class="section-proposal" data-target-pages="${esc((spec.target?.existingPages ?? []).join(","))}">\n${parts.join("\n")}\n</div>`,
    writer: WRITER,
  });
}
