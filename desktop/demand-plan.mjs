/**
 * 🔴 RR-389 PART 1 (owner's run, 7 Nov 16:26: AlmiVisibility planned 24 pages and made 1; 23 were "not made, no answer on your pages yet").
 * A product that is not an exam answered ONLY from its own site (about 7 pages), so almost nothing could be answered. EVERY product now
 * gets a plan in the shape every other plan has (pages → items → claims), so every question goes down the whole Q&A LAW ladder:
 *   own data → saved pages → AI web search (then the full page) → Google results through DataForSEO (then the full page) → the owner reads.
 * Where the pages come from, in this order (Q&A LAW 1.1, 1.3, 1.5):
 *   1. the owner's research file: each "# heading" is a page, each question under it one of its questions (its answers join later, unchecked:
 *      the truth pass decides, desktop/owner-research.mjs);
 *   2. the questions people ask (Search Console, the collectors' question groups, Google's "People also ask" already held, the AI's research):
 *      each joins the page whose topic it shares, or gathers round the searched words that name its topic (the page title uses the words
 *      people really search);
 *   3. nothing is invented: a question with no source of its own is never added.
 * A line from the product's OWN site is its own product text (LAW 5A.5): it stands as own text, read from the live own page in this run.
 * Every other question starts empty (a work note the ladder replaces); one that finds no answer leaves the page; a page with fewer than 6 real
 * Q&A is noindex (Q&A LAW 6). No product is named in this code. Pure.
 */
import { meaningOf } from "./coverage.mjs";

/* a search that wants a place, a login, another company's own site or a search operator is not a page a product makes about its subject */
const NOT_A_PAGE = /^site:|\b(?:near me|login|log in|sign in|sign up|download|apk|coupon|promo code|discount code)\b|\.(?:com|net|org|io)\b/i;
/* the plain words of a search: what is left once these go names the topic */
const PLAIN = new Set(["best", "top", "free", "online", "tool", "tools", "software", "service", "services", "company", "companies", "agency", "checker", "check", "test", "tester", "how", "what", "why", "which", "is", "are", "for", "the", "a", "an", "and", "of", "to", "in", "on", "my", "your", "do", "does", "can", "i"]);
const OFFER = /\b(?:price|prices|pricing|cost|costs|plan|plans|trial|subscription|per month|a month|refund|cancel)\b/i;
const words = (t) => [...new Set(meaningOf(t))];
const titleCase = (s) => String(s).trim().replace(/\s+/g, " ").replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\b(Seo|Ai|Url|Faq|Api|Cpc|Ppc|Uk|Us|Usa)\b/g, (m) => m.toUpperCase());
const isQuestion = (t) => /\?\s*$/.test(String(t)) || /^(?:how|what|why|which|where|when|who|is|are|can|does|do|should|will)\b/i.test(String(t).trim());
const asAsked = (t) => { const s = String(t).trim().replace(/\s+/g, " "); const q = s.replace(/[?.!]*$/, "?"); return q[0].toUpperCase() + q.slice(1); };
const share = (a, b) => { if (!a.length || !b.length) return 0; const B = new Set(b); return a.filter((w) => B.has(w)).length / Math.min(a.length, b.length); };

/**
 * → { pages, notBuilt, counts, skipped, existing, fromDemand: true, subject } or null when nothing is known
 * research: [{ question, answer, link, page? }]; asked: [{ text, source, on }] (questions people ask); keywords: [{ text, volume }]
 * ownAnswer(question) → own-site claims [{ text, link, readOn, source }] (read from the live site in this run); local: the product serves a place
 */
export function demandPlanPages({ subject, research = [], asked = [], keywords = [], ownAnswer = () => [], on = new Date().toISOString().slice(0, 10), maxPages = 30, perPage = 10, local = false, home = null, productName = null } = {}) {
  if (!subject) return null;
  const drop = String(subject).toLowerCase().split(/\s+/), core = (t) => meaningOf(t, { drop }).filter((w) => !PLAIN.has(w));
  const pages = [], notBuilt = [], taken = new Set(), keyOf = (q) => words(q).sort().join(" ");
  const gap = () => ({ claimId: null, card: null, text: `${subject}'s official page, checked ${on}, does not say this.`, link: home, readOn: on, gap: true });
  const itemFor = (p, question, source) => {
    const k = keyOf(question); if (!k || taken.has(k) || p.items.length >= perPage) return false; taken.add(k);
    /* the product's own words about ITSELF (its name, price, plan, trial) are its own product text (LAW 5A.5); its site's words about anything else are judged on that page like any line */
    const aboutItself = (productName && new RegExp(`\\b${String(productName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(question)) || OFFER.test(question);
    const own = (ownAnswer(question) ?? []).slice(0, 2).map((c) => ({ ...c, official: false, source: c.source ?? "its own page", ...(aboutItself ? { ownProduct: true } : {}) }));
    p.items.push({ part: `topic${p.items.length}`, question, claims: own.length ? own : [{ ...gap(), claimId: `gap-${k.replace(/[^a-z0-9]+/g, "-").slice(0, 50)}` }] });
    p.questions.push({ question, source, on }); return true;
  };
  /* 1 · the owner's research: its headings are pages */
  const groups = new Map(); for (const r of research) { if (!r?.question) continue; const t = String(r.page ?? "").replace(/^#+\s*/, "").trim(); if (!t) continue; (groups.get(t) ?? groups.set(t, []).get(t)).push(r); }
  for (const [title, rows] of groups) { if (pages.length >= maxPages) break; const p = { kind: "topic", title: title.replace(/\?$/, ""), topicWords: core(title), items: [], questions: [] }; for (const r of rows) itemFor(p, asAsked(r.question), "your research file"); if (p.items.length) pages.push(p); }
  /* 2 · the questions people ask: onto the page of their topic */
  const qs = [...new Map(asked.filter((x) => x?.text && isQuestion(x.text) && !NOT_A_PAGE.test(x.text) && (local || !/\bnear me\b/i.test(x.text))).map((x) => [keyOf(x.text), x])).values()];
  const left = [];
  for (const x of qs) { const w = core(x.text); let best = null, s0 = 0; for (const p of pages) { const s = share(w, p.topicWords); if (s > s0) { s0 = s; best = p; } } if (best && s0 >= 0.5 && itemFor(best, asAsked(x.text), x.source ?? "questions people ask")) continue; left.push(x); }
  /* 3 · the searched words name the remaining topics (their words, as people search them); each gathers the questions that share its topic */
  const heads = [], seenCore = []; for (const k of [...keywords].filter((x) => x?.text && !NOT_A_PAGE.test(x.text) && !isQuestion(x.text)).sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0))) { const c = core(k.text); if (!c.length || seenCore.some((s) => share(c, s) >= 0.99) || pages.some((p) => share(c, p.topicWords) >= 0.99)) continue; seenCore.push(c); heads.push({ text: k.text, core: c }); }
  /* each question goes to the searched words it shares MOST (a tie: the more searched), never simply to the first that shares half */
  const headOf = new Map(); for (const x of left) { const w = core(x.text); let best = null, s0 = 0; for (const h of heads) { const s = share(w, h.core) + (w.length && h.core.every((c) => w.includes(c)) ? 1 : 0) /* every word of the topic is in the question */; if (s > s0) { s0 = s; best = h; } } if (best && s0 >= 0.5) headOf.set(x, best); }
  for (const h of heads) {
    if (pages.length >= maxPages) { notBuilt.push({ title: titleCase(h.text), why: `more than ${maxPages} pages: planned on a later run` }); continue; }
    const mine = left.filter((x) => !taken.has(keyOf(x.text)) && headOf.get(x) === h); if (!mine.length) continue;
    const p = { kind: "topic", title: titleCase(h.text), topicWords: h.core, items: [], questions: [] }; for (const x of mine) itemFor(p, asAsked(x.text), x.source ?? "questions people ask");
    if (p.items.length) pages.push(p); else notBuilt.push({ title: p.title, why: "no question people ask is known for it yet" });
  }
  /* 4 · the questions people ask about the product ITSELF (its name in them): one page of their own, answered first by its own site (own text, LAW 5A.5) */
  if (productName && pages.length < maxPages) { const nameRe = new RegExp(`\\b${String(productName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), mine = left.filter((x) => !taken.has(keyOf(x.text)) && nameRe.test(x.text)); if (mine.length) { const p = { kind: "topic", title: `${productName}: questions people ask`, topicWords: core(productName), items: [], questions: [] }; for (const x of mine) itemFor(p, asAsked(x.text), x.source ?? "questions people ask"); if (p.items.length) pages.push(p); } }
  for (const x of left) if (!taken.has(keyOf(x.text))) notBuilt.push({ title: asAsked(x.text), why: "its topic has no page of its own yet: it joins one when one is planned" });
  if (!pages.length) return null;
  for (const p of pages) { delete p.topicWords; p.content = null; p.open = []; p.ledger = []; p.claims = p.items[0].claims; p.lastChecked = null; p.weak = false; p.links = pages.filter((x) => x !== p).map((x) => x.title).slice(0, 8); }
  return { pages, notBuilt, counts: { demand: pages.length }, skipped: [], existing: [], fromDemand: true, subject };
}
