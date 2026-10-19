/**
 * 🔴 ONE PAGE BUILDER (owner decision 1 and beta-g decision B of RR-294; the STANDING PAGE LAW): every Visibility page — a guide, or a page of
 * the approved plan — is built by the SAME renderer as the 12 guides (src/page/joined-page.mjs renderJoined): the client's own design (its
 * header, logos, links and footer), a hero, the key-fact cards each with its source and checked date, then the questions and answers, each
 * answer sourced and dated; a fee shown with its dated rupee estimate. There is no second template.
 *   · a GUIDE is rebuilt from its own stored items;
 *   · a PLAN PAGE (a DEMAND or OPPORTUNITY combination of the F91 plan) is built from its profession guide's items whose claims are its own,
 *     each item keeping only those claims; a DEMAND page also asks the searches recorded for it (its own questions); the combinations MERGED
 *     into it are asked on it too, as "also asked".
 * Pure: it renders in memory; nothing is written, published or submitted. Generic: it names no client, product or host.
 */
import { renderJoined, keyFactCards, conversions, faqOf } from "./joined-page.mjs";
import { plannedPages } from "./plan-batch.mjs";

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

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

/** The 12 guides, rebuilt by the one builder from their own stored items. */
export function buildGuides({ guides, keyFacts, rates, quotationOf, design, stamp, on, relatedFor = () => [] }) {
  return [...guides].map(([value, rec]) => Object.freeze({ kind: "GUIDE", value, url: rec.publishedUrl ?? null, title: rec.title, questions: rec.itemList.flatMap((it) => it.questions.map((q) => q.wording)), answer: rec.itemList.flatMap((it) => it.claims.map((c) => c.claimId)),
    ...renderPage({ title: rec.title, items: rec.itemList, keyFacts, rates, quotationOf, design, stamp, on, related: relatedFor(value) }) }));
}

/** The plan's pages, by the same builder: each from its profession guide's items whose claims are its own. */
export function buildPlanPages({ plan, guides, keyFacts, rates, quotationOf, design, stamp, on, urlOf, relatedFor = () => [] }) {
  const merged = (plan.rows ?? []).filter((r) => r.label === "MERGED");
  return plannedPages(plan).map((p) => {
    const own = new Set((p.row.answer ?? []).map(String));
    const guide = guides.get(p.row.primary);
    if (!guide) return Object.freeze({ kind: "PLAN", path: p.path, combination: p.combination, label: p.label, refused: "no guide of its own first value is stored to build from" });
    /* the guide's items that answer with this combination's own claims, each keeping only those claims */
    let items = guide.itemList.map((it) => ({ ...it, claims: it.claims.filter((c) => own.has(c.claimId)) })).filter((it) => it.claims.length > 0);
    /* a DEMAND page asks the searches recorded for it; MERGED combinations are asked on it too */
    const searched = (p.row.demand ?? []).map((d) => d.text).filter(Boolean);
    const alsoFromMerged = merged.filter((m) => m.target === p.combination).flatMap((m) => (guides.get(m.primary)?.itemList ?? []).filter((it) => it.claims.some((c) => own.has(c.claimId))).map((it) => it.heading.wording));
    const extra = [...new Set([...searched, ...alsoFromMerged])].filter((w) => !items.some((it) => it.questions.some((q) => norm(q.wording) === norm(w))));
    if (items.length && extra.length) items = [{ ...items[0], questions: [...items[0].questions, ...extra.map((w, i) => Object.freeze({ questionId: `asked:${p.path}:${i}`, wording: w, tier: searched.includes(w) ? "OBSERVED" : "RESEARCH-DERIVED" }))] }, ...items.slice(1)];
    if (!items.length) return Object.freeze({ kind: "PLAN", path: p.path, combination: p.combination, label: p.label, refused: "its claims are on no item of its guide" });
    /* its title: the question that names its own second value (e.g. the country), else its first — never a question every page asks */
    const named = (it) => norm(it.heading.wording).includes(norm(String(p.row.secondary).replace(/-/g, " ")));
    const lead = items.find(named) ?? items[0];
    items = [lead, ...items.filter((it) => it !== lead)];
    /* a DEMAND page's title is the search recorded for it (the title law takes recorded search phrases); otherwise its lead question */
    const title = searched[0] ? searched[0].charAt(0).toUpperCase() + searched[0].slice(1) : lead.heading.shown ?? lead.heading.wording;
    return Object.freeze({ kind: "PLAN", path: p.path, combination: p.combination, label: p.label, url: urlOf(p), title, questions: items.flatMap((it) => it.questions.map((q) => q.wording)), answer: [...own],
      ...renderPage({ title, items, keyFacts, rates, quotationOf, design, stamp, on, related: relatedFor(p) }) });
  });
}

/** The page as it would go live: its noindex line made a canonical link to its own address, its test stamps taken out (as publish-page does). */
export const asPublished = (html, url) => String(html).replace(/<meta name="robots" content="noindex, nofollow">/, `<link rel="canonical" href="${url}">`).replace(/<p class="stamp">[\s\S]*?<\/p>\n?/g, "");
