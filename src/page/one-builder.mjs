/**
 * 🔴 ONE PAGE BUILDER (owner decision 1 and beta-g decision B of RR-294, owner decisions 1 and 3 of RR-295; the STANDING PAGE LAW): every
 * Visibility page is built by the SAME renderer as the 12 guides (src/page/joined-page.mjs renderJoined): the client's own design (its
 * header, logos, links and footer), a hero, the key-fact cards each with its source and checked date, then the questions and answers, each
 * answer sourced and dated; a fee shown with its dated rupee estimate. There is no second template, and bin/build-page.mjs builds with
 * nothing else. A page is built from its own stored items. RR-295: the 31 plan drafts are removed; a plan is made afresh, and built here,
 * when the owner gives a product.
 * Pure: it renders in memory; nothing is written, published or submitted. Generic: it names no client, product or host.
 */
import { renderJoined, keyFactCards, conversions, faqOf } from "./joined-page.mjs";

/** The latest stored item list of each page value (its guide). */
export function guideItemsByValue(joinedRecords) {
  const m = new Map();
  for (const r of joinedRecords) if (r?.record_type === "joined_page_draft" && Array.isArray(r.itemList) && r.value) m.set(String(r.value), r);
  return m;
}

const rateFor = (rates, claimIds) => { const latest = new Map(); for (const r of rates) if (claimIds.has(r.claimId)) latest.set(r.claimId, r); return [...latest.values()]; };

/** Render one page from its items by the one renderer. */
function renderPage({ title, items, keyFacts, rates, quotationOf, design, stamp, on, related }) {
  const claimIds = new Set(items.flatMap((it) => it.claims.map((c) => c.claimId)));
  const kf = keyFactCards({ facts: keyFacts.filter((k) => claimIds.has(k.claimId)), items, quotationOf });
  const cv = conversions({ rates: rateFor(rates, claimIds), items, on });
  const faq = faqOf(items, cv.shown);
  const intro = [design?.productLine, `${items.length} question${items.length === 1 ? "" : "s"} answered below, each with its source.`].filter(Boolean);
  const html = renderJoined({ title, stamp, items, design, intro, cards: kf.cards, faq, lastChecked: items.flatMap((it) => it.claims.map((c) => c.readOn)).filter(Boolean).sort().at(-1) ?? null, converted: cv.shown, related });
  return Object.freeze({ html, cards: kf.cards, cardsRefused: kf.refused, conversions: cv.shown, conversionsRefused: cv.refused, items });
}

/* 🔴 F34's law, on the one builder (RR-295): this builder REBUILDS a page that exists — each from its own stored items, at its own recorded
 * address. A stored record with no existing address would be a NEW page, and a new page is never built blind: it needs a plan made afresh
 * and the existing-page check (owner decision 3 of RR-295). It is refused here, named, and nothing is rendered for it. */
export const NO_EXISTING_PAGE = "no existing address is recorded for this stored page — a NEW page needs a fresh plan and the existing-page check; none is built here";

/** The guides, rebuilt by the one builder from their own stored items — only pages that exist (F34). */
export function buildGuides({ guides, keyFacts, rates, quotationOf, design, stamp, on, relatedFor = () => [] }) {
  return [...guides].map(([value, rec]) => (!rec.publishedUrl
    ? Object.freeze({ kind: "GUIDE", value, url: null, refused: NO_EXISTING_PAGE })
    : Object.freeze({ kind: "GUIDE", value, url: rec.publishedUrl, title: rec.title, questions: rec.itemList.flatMap((it) => it.questions.map((q) => q.wording)), answer: rec.itemList.flatMap((it) => it.claims.map((c) => c.claimId)),
      ...renderPage({ title: rec.title, items: rec.itemList, keyFacts, rates, quotationOf, design, stamp, on, related: relatedFor(value) }) })));
}

/** The page as it would go live: its noindex line made a canonical link to its own address, its test stamps taken out (as publish-page does). */
export const asPublished = (html, url) => String(html).replace(/<meta name="robots" content="noindex, nofollow">/, `<link rel="canonical" href="${url}">`).replace(/<p class="stamp">[\s\S]*?<\/p>\n?/g, "");

/* ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 THE NEW-PAGE PATH (RR-296, owner decision 2: "fix the builder or build a new one" — the ONE builder now makes NEW pages too).
 * From a PLANNED need — DEMAND or OPPORTUNITY, with its own sourced answer — to a finished new page, by the same renderer and the same
 * page method (the client's design, logo, header and links → key-fact cards → questions and answers, each sourced and dated):
 *   · a need that is not planned, or whose answer is not sourced and dated, is REFUSED by name — nothing is rendered for it;
 *   · a need whose answer is the same as an existing page's (every claim it answers with is already on that page) becomes a SECTION of
 *     that page — its question asked there — never a duplicate page (F34's law: the existing page first);
 *   · a need whose answer is the same as an earlier new need's becomes a section of that new page;
 *   · only planned paths are served — any other URL answers 404, on any request (servedBy).
 * ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const PLANNED_LABELS = Object.freeze(["DEMAND", "OPPORTUNITY"]);
export const NEW_PAGE_REFUSAL = Object.freeze({
  NOT_PLANNED: "not a planned need (DEMAND or OPPORTUNITY) — never built",
  NO_PATH: "no planned path — a page is built only at its planned address",
  NOT_SOURCED: "its answer is not sourced and dated — every answer line needs its source link and its checked date",
});
const normQ = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sourced = (c) => typeof c?.text === "string" && c.text.trim() !== "" && typeof c?.link === "string" && /^https?:\/\//.test(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c?.readOn ?? "");
/** The item a need is rendered as: its question, any also-asked wordings, its sourced claims, and its labelled general view, if any. */
export const itemOfNeed = (n) => Object.freeze({ needId: n.needId, needKey: n.needId, heading: Object.freeze({ wording: n.question }),
  questions: Object.freeze([n.question, ...(n.alsoAsked ?? [])].map((w, i) => Object.freeze({ questionId: `${n.needId}:q${i}`, wording: w }))),
  claims: Object.freeze(n.claims.map((c) => Object.freeze({ ...c }))), statements: Object.freeze([]),
  ...(n.generalView ? { generalView: Object.freeze({ text: n.generalView.text, source: n.generalView.source, label: "INFERRED", ref: n.generalView.ref ?? null }) } : {}) });

/**
 * Plan the new pages: each planned need becomes NEW, SECTION or REFUSED. `existing` is [{ id, url, claimIds, questions }] — the pages that
 * already stand. Pure; renders nothing.
 */
export function planNewPages({ needs = [], existing = [] }) {
  const out = [], newOnes = [];
  for (const n of needs) {
    const ids = (n?.claims ?? []).map((c) => c.claimId);
    if (!PLANNED_LABELS.includes(n?.label)) { out.push(Object.freeze({ kind: "REFUSED", needId: n?.needId ?? null, reason: NEW_PAGE_REFUSAL.NOT_PLANNED })); continue; }
    if (typeof n.path !== "string" || !/^\/[a-z0-9/-]+$/.test(n.path)) { out.push(Object.freeze({ kind: "REFUSED", needId: n.needId, reason: NEW_PAGE_REFUSAL.NO_PATH })); continue; }
    if (!ids.length || !n.claims.every(sourced)) { out.push(Object.freeze({ kind: "REFUSED", needId: n.needId, reason: NEW_PAGE_REFUSAL.NOT_SOURCED })); continue; }
    const same = (p) => ids.every((id) => p.claimIds.includes(id)) || (p.questions ?? []).some((q) => normQ(q) === normQ(n.question));
    const into = existing.find(same) ?? newOnes.find(same);
    if (into) { out.push(Object.freeze({ kind: "SECTION", needId: n.needId, question: n.question, claimIds: ids, into: into.url ?? into.id, reason: `its answer is the same as ${into.url ?? into.id} — a section of that page, never a duplicate page` })); continue; }
    const p = Object.freeze({ kind: "NEW", needId: n.needId, label: n.label, path: n.path, need: n, claimIds: ids, questions: [n.question, ...(n.alsoAsked ?? [])] });
    newOnes.push({ ...p, id: n.path, url: null });
    out.push(p);
  }
  return Object.freeze(out);
}

/** Build the NEW pages of a plan by the one renderer; the URL of each is its planned path on the client's own site. */
export function buildNewPages({ plan, keyFacts = [], rates = [], quotationOf = null, design, stamp, on, site, relatedFor = null }) {
  const base = String(site ?? "").replace(/\/$/, "");
  /* internal links: by default each new page links its sibling new pages of the same plan (crawlable links in and out, G9/G10) */
  const siblings = (p) => plan.filter((x) => x.kind === "NEW" && x.needId !== p.needId).map((x) => ({ href: `${base}${x.path}`, label: x.need.question }));
  return plan.filter((p) => p.kind === "NEW").map((p) => {
    const items = [itemOfNeed(p.need)];
    const url = `${String(site ?? "").replace(/\/$/, "")}${p.path}`;
    return Object.freeze({ kind: "NEW", needId: p.needId, label: p.label, path: p.path, url, title: p.need.question, questions: p.questions, answer: p.claimIds,
      ...renderPage({ title: p.need.question, items, keyFacts, rates, quotationOf, design, stamp, on, related: relatedFor ? relatedFor(p) : siblings(p) }) });
  });
}

/** A SECTION merged into an existing page: that page's stored record with the need's question asked on the item that holds its answer. */
export function withSections(rec, sections) {
  const mine = sections.filter((s) => s.kind === "SECTION" && s.into === rec.publishedUrl);
  if (!mine.length) return rec;
  const itemList = rec.itemList.map((it) => {
    const asked = mine.filter((s) => s.claimIds.some((id) => it.claims.some((c) => c.claimId === id)));
    return asked.length ? { ...it, questions: [...it.questions, ...asked.map((s, i) => ({ questionId: `${s.needId}:section${i}`, wording: s.question }))] } : it;
  });
  return { ...rec, itemList };
}

/** Only a planned, built path is served: 200 with its page, or 404 — never a page built on request. */
export function servedBy(pages) {
  const paths = new Map(pages.filter((p) => p.url).map((p) => [new URL(p.url).pathname.replace(/\/$/, ""), p]));
  return (path) => (paths.has(String(path ?? "").split(/[?#]/)[0].replace(/\/$/, "")) ? Object.freeze({ status: 200 }) : Object.freeze({ status: 404, reason: "not a planned page — no page is built on request" }));
}

/** A page in the shape the five gates read: in the form it would go live, with its items, questions, answer and facts. */
export const gateInput = (p) => Object.freeze({ id: p.url ?? p.id, url: p.url, html: asPublished(p.html, p.url), needs: [], mainQuery: p.title, questions: p.questions, answer: p.answer, items: p.items,
  facts: p.items.flatMap((it) => it.claims.map((c) => ({ hasSource: Boolean(c.link), hasDate: /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "") }))) });

/** The site's own index of a set of pages (a listing, e.g. its articles): a plain page of links, so each listed page is reached by a crawlable
 * link. It is not gated as a page of its own; the gates read it as one of the site's other pages (extraPages). */
export function indexPage({ url, title, pages }) {
  const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return Object.freeze({ url, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1><ul>${pages.map((p) => `<li><a href="${esc(p.url)}">${esc(p.title ?? p.url)}</a></li>`).join("")}</ul></body></html>` });
}
