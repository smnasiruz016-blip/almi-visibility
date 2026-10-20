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
