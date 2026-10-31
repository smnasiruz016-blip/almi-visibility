/**
 * 🔴 RR-307 C · "CREATE SEO PAGES": plan pages from REAL demand, by the engine's own page rule, and build DRAFTS judged by the five gates.
 *   · DEMAND: the searches and questions Visibility gathered for this product — the client's Search Console (connected or its export), its
 *     search-data files, the questions under its videos and under the videos that do well on its topics — each kept with its source.
 *   · ANSWERS: only from the client's OWN pages, each answer line with that page as its source and the day it was read. A need with no
 *     sourced answer is REFUSED (the engine's law: every answer line needs its source and its checked date) and says what is missing.
 *   · THE PAGE RULE (src/page/one-builder.mjs planNewPages — existing page first): when one of the client's pages already holds the answer,
 *     the plan says IMPROVE THAT PAGE (a section of it) — never a second page competing with it.
 *   · DRAFTS: rendered by the engine's ONE page renderer, in the client's design when it could be read; judged by ALL FIVE GATES
 *     (src/page/page-gates.mjs) — each failing check named. NOTHING is published or submitted: drafts stay in the product's own folder.
 *   · The daily ARTICLE is the best next draft; SOCIAL POSTS are written from an article (src/page/social-posts.mjs); the MONTHLY REPORT is
 *     the engine's own (src/report/monthly-report.mjs).
 * Pure: everything is handed in.
 */
import { planNewPages, buildNewPages, gateInput } from "../src/page/one-builder.mjs";
import { allGates, GATES } from "../src/page/page-gates.mjs";
import { linksCheck, MIN_INTERNAL_LINKS } from "../src/page/joined-page.mjs";
import { CHECK } from "../src/page/draft-render.mjs";
import { postsForArticle } from "../src/page/social-posts.mjs";
import { monthlyReport, searchFromExport } from "../src/report/monthly-report.mjs";
import { validateDesign } from "../src/questionnaire/product-questionnaire.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";
import { createHash } from "node:crypto";
import { tokens } from "./youtube-advice.mjs";
import { properNames } from "./youtube-niche.mjs";
import { countriesIn, destinationsIn } from "./world.mjs";
import { cleanAnswer, wholeSentences } from "./web-text.mjs";

/*
 * RR-318 B4 · THE SAMENESS GATE (owner: "OET Requirements for Ireland" and "OET Score for Ireland" were two pages for ONE need; Google calls
 * many pages for the variations of one question "scaled content abuse"). Two searches are ONE page when they are about the same country (the
 * country a person goes to — never the one they come from) and share the same subject ("oet"), whatever the asking words ("requirements",
 * "score", "accepted", "for nurses"): the country's page holds every such question, each profession as a section inside it.
 */
const ASKING = new Set(["requirement", "requirements", "required", "require", "score", "scores", "minimum", "need", "needed", "needs", "accepted", "accept", "accepts", "acceptance", "recognised", "recognized", "recognition", "valid", "band", "bands", "grade", "grades", "pass", "passing", "mark", "marks", "result", "results", "rules", "rule", "registration", "register", "nurses", "nurse", "nursing", "doctors", "doctor", "medicine", "dentists", "pharmacists", "midwives", "for", "in", "to", "is", "the", "a", "what", "how", "much", "do", "does", "i", "you", "of"]);
const namesSubject = (s, subject) => Boolean(subject) && new RegExp(`(?<![\\p{L}\\p{N}])${String(subject).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").test(s);
export function sameNeed(a, b, subject = null) {
  const da = destinationsIn(a), db = destinationsIn(b);
  if (!da.length || da.length !== db.length || !da.every((c) => db.includes(c))) return false;
  /* when the product's subject is known ("OET"), a search about the same country is a section of the subject's page for it ("avbc australia"
   * goes inside "OET for Australia") — never a second page for that country */
  if (namesSubject(a, subject) || namesSubject(b, subject)) return true;
  const placeWords = new Set([...da].flatMap((c) => tokens(c)).concat(tokens(String(a).match(/\b(nz|uk|uae|usa|ksa)\b/gi)?.join(" ") ?? ""), tokens(String(b).match(/\b(nz|uk|uae|usa|ksa)\b/gi)?.join(" ") ?? "")));
  const rest = (s) => new Set(tokens(s).filter((w) => !ASKING.has(w) && !placeWords.has(w)));
  const ra = rest(a), rb = rest(b);
  return [...ra].some((w) => rb.has(w));
}

export const GATE_WORDS = Object.freeze({ [GATES.A]: "not a copy of another page", [GATES.B]: "not competing with another page for the same search", [GATES.C]: "technically ready for search and AI engines", [GATES.D]: "made inside its cost", [GATES.E]: "no existing page already does the job" });
/* checks that can only be true once the page is live on the client's site (it is a draft until then) */
const AFTER_PUBLISHING = /^(listed in the sitemap|a URL not in the plan is 404|internal links in)$/;
/* RR-336 (beta-g decision, Gate C): a draft links at least MIN_INTERNAL_LINKS of the client's pages when the site has that many related pages
 * (the pages built with it, and the site's own pages on the same topic); with fewer, a short list is a warning, never a block.
 * Counted in the page's own text: navigation, header and footer links are not internal links of the page. */
const topicOf = (s) => new Set(tokens(s).filter((w) => !ASKING.has(w)));
export const siteRelatedPages = (site) => { const home = String(site.origin ?? "").replace(/\/$/, "");
  return (question) => { const t = topicOf(question); return (site.pages ?? []).filter((p) => p.url && p.url.replace(/\/$/, "") !== home && [...topicOf(`${p.title ?? ""} ${p.h1 ?? ""}`)].some((w) => t.has(w))).map((p) => ({ href: p.url, label: p.h1 || p.title || p.url })); }; };
export function linksGate(html, url, builtUrls, related) {
  const own = String(html ?? "").replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " ");
  const targets = new Set([...builtUrls, ...related.map((l) => l.href)].map((u) => String(u).replace(/#.*$/, "")));
  const links = [...own.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)].map((m) => { try { return new URL(m[1], url).href.replace(/#.*$/, ""); } catch { return null; } }).filter((h) => h && h !== url && targets.has(h)).map((href) => ({ href }));
  const r = linksCheck(links);
  if (r.state === CHECK.PASS) return { block: null, warning: null };
  if (targets.size >= MIN_INTERNAL_LINKS) return { block: `at least ${MIN_INTERNAL_LINKS} internal links — it links ${r.links} of the ${targets.size} related pages on your site`, warning: null };
  return { block: null, warning: `${r.links} internal link(s): your site has ${targets.size} related page(s), fewer than ${MIN_INTERNAL_LINKS} — add links when you add related pages` };
}
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
const SHOUTED = new Set(["not", "and", "the", "for", "you", "all", "are", "but", "new", "now", "one", "our", "free", "only", "must", "will", "can", "may", "yes", "no", "or", "to", "of", "in", "on", "is", "it", "we", "do", "be", "an", "at", "by", "if", "so", "up", "as", "my", "me", "us", "how", "why", "what", "when", "who", "best", "top", "get", "pass", "test", "exam", "score"]);
/* RR-333 (buyer walk: "How much does a Dental implant cost" — from the heading "Dental implants"): a heading's FIRST word is capitalised
 * because it is first, not because it is a name — it never sets a word's casing */
export const casingOf = (site) => { const m = new Map(); for (const p of site.pages) for (const w of [p.title, p.h1, ...p.h2].flatMap((h) => String(h ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(1))) if (w && w !== w.toLowerCase() && !m.has(w.toLowerCase())) m.set(w.toLowerCase(), w);
  /* RR-308: a name the site writes with capitals INSIDE its own sentences ("in New Zealand") keeps them in a page title ("OET for Nurses in new zealand" before) */
  /* RR-310: and a short name the site writes with two or more capitals (GPhC, AHPRA, AVBC, NZ) — never a common word in capitals (NOT, FREE) */
  for (const p of site.pages) for (const s of [...(p.lead ?? []), ...(p.facts ?? [])]) for (const w of String(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(1)) if ((/^\p{Lu}\p{Ll}+$/u.test(w) || (/^\p{Lu}[\p{L}]{1,5}$/u.test(w) && (w.match(/\p{Lu}/gu) ?? []).length >= 2 && !SHOUTED.has(w.toLowerCase()))) && !m.has(w.toLowerCase())) m.set(w.toLowerCase(), w);
  return m; };
/* RR-309 B2: names keep their capitals in a page's title ("Is OET accepted in canada" → "Canada") — the site's own spelling first, then known names */
/* RR-311 E2: a page title that is not a question gets title case ("AHPRA Speech Pathology"); a question keeps sentence case */
const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "for", "in", "on", "of", "to", "at", "by", "with", "from", "vs"]);
export const asQuestion = (s, casing = new Map()) => { let t = properNames(String(s).trim().replace(/\s+/g, " ").replace(/(?<![\p{L}])(nz|uk|uae|usa|ksa|nhs)(?![\p{L}])/giu, (m) => m.toUpperCase()) /* RR-318: "oet nz" → "OET NZ" */.split(" ").map((w) => casing.get(w.toLowerCase()) ?? w).join(" "));
  if (!/^(how|what|why|which|where|when|who|is|are|can|does|do|should|will)\b/i.test(t)) t = t.split(" ").map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1); };

/** The client's design from its own site (read-only), when it holds what a page needs — else null (a plain look, said so). */
export function designFromSite(site) {
  const d = site?.design; if (!d) return null;
  const cols = d.colours ?? [];
  if (cols.length < 4 || !d.menu?.length) return null;
  const design = { siteAddress: site.origin, brandName: d.siteName?.split(/[|—–-]/).pop().trim() || new URL(site.origin).hostname, logo: { wordmark: d.siteName?.split(/[|—–-]/).pop().trim() || new URL(site.origin).hostname },
    colours: { background: cols[0], primary: cols[1], ink: cols[2], text: cols[3] }, fonts: { body: "system-ui, sans-serif" },
    nav: d.menu.slice(0, 8).map((label) => ({ label, href: site.origin })), cta: { label: "Visit", href: site.origin },
    footer: { columns: [{ title: d.siteName ?? "Links", links: [{ label: "Home", href: site.origin }] }] }, basis: "READ_FROM_CLIENT_SITE", readFrom: [{ kind: "PUBLIC_SITE", ref: site.origin }] };
  return validateDesign(design).length ? null : design;
}

/** The demand: each search or question once, with its strongest source (Search Console impressions first). */
export function demandOf({ searchConsole = null, files = [], youtube = null, planned = [], own = [] }) {
  const out = new Map();
  /* RR-318 C5: the pages the client chose in "How many pages can I make?" — each confirmed by an official page */
  for (const p of planned) if (tokens(p.text).length >= 2) out.set(tokens(p.text).join(" "), { text: String(p.text).trim(), source: p.source, weight: 4 });
  const add = (text, source, weight) => { const k = tokens(text).join(" "); if (tokens(text).length < 2) return; const x = out.get(k); if (!x || x.weight < weight) out.set(k, { text: String(text).trim(), source, weight }); };
  /* RR-353 (owner: "use OUR OWN data first"): AlmiVisibility's own searches for the product — AlmiWorld's keyword service and the keyword
   * database, the client's search-data files (Keyword Planner, Bing Webmaster) — each with its own source; Search Console adds to them */
  for (const o of own) add(o.text, o.source, Number.isFinite(o.weight) ? o.weight : 4);
  for (const q of searchConsole?.queries ?? []) add(q.query, `your Search Console: seen ${q.impressions} time${q.impressions === 1 ? "" : "s"} in search (${searchConsole.window})`, 10 + Math.log10(1 + q.impressions));
  for (const f of files) add(f.phrase, `your file ${f.file} (${f.on})`, 5 + Math.log10(1 + (f.impressions ?? 0)));
  for (const q of youtube?.questions ?? []) add(q.text, q.source, 3);
  for (const t of youtube?.terms ?? []) add(t.phrase, t.from, 2);
  return [...out.values()].sort((a, b) => b.weight - a.weight);
}

/* RR-333: the kind of answer a question asks for, and what a line must hold to give it */
export const ANSWER_KINDS = Object.freeze({
  price: /[$£€₹¥]\s?\d|\b\d[\d,.]*\s?(?:USD|GBP|EUR|INR|PKR|AUD|CAD|NZD|AED|SAR|dollars?|pounds?|euros?|rupees?)\b|\b(?:USD|GBP|EUR|INR|PKR|AUD|CAD|NZD|AED|SAR)\s?\d|\bfree\b/i,
  duration: /\b\d[\d.,]*(?:\s?(?:to|-|–)\s?\d[\d.,]*)?\s?(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?)\b/i,
  date: /\b(?:19|20)\d\d\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s\d|\b\d{1,2}(?:st|nd|rd|th)?\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|daily|every (?:day|week|month))\b/i,
  count: /\d/,
});
const KIND_WORDS = new Set(["how", "long", "much", "many", "cost", "costs", "price", "prices", "pricing", "fee", "fees", "charge", "charges", "take", "takes", "when", "date", "day", "time"]);
export const answerKindOf = (q) => { const t = String(q ?? "").toLowerCase();
  return /\bhow long\b/.test(t) ? "duration" : /\b(?:how much|cost|costs|price|prices|pricing|fee|fees|charges?)\b/.test(t) ? "price" : /^when\b|\bwhat (?:date|day|time)\b/.test(t) ? "date" : /\bhow many\b/.test(t) ? "count" : null; };

/** The client's own sentences that answer a search: they share most of its meaning words. Each is a claim with its page and read date. */
export function answersFromSite(text, site, max = 3) {
  /* RR-333: the words that only ask for the KIND ("how long", "cost") need not stand in the answer — its kind is checked instead below */
  const kindWords = answerKindOf(text) ? KIND_WORDS : null;
  const want = new Set(tokens(text).filter((w) => !kindWords?.has(w))); if (want.size < 2) return [];
  const day = String(site.readOn).slice(0, 10);
  /* RR-318 B5 (owner: the Ireland page got a UK "HCPC" line): a search that names where it is about is answered only by a line that names
   * that same country — never a line about another one */
  const where = destinationsIn(text);
  /* RR-333 (buyer walk: "How much does a dental implant cost" was answered "takes 3 to 6 months"): a question that asks for a KIND of answer
   * — a price, a length of time, a date, a number — is answered only by a line holding that kind */
  const kind = answerKindOf(text);
  const cands = [];
  for (const p of site.pages) {
    const lines = [...p.qa.filter((x) => x.a).map((x) => cleanAnswer(x.a)), ...p.facts.map(cleanAnswer)];
    for (const line of lines) { const t = new Set(tokens(line)); let n = 0; for (const w of want) if (t.has(w)) n++; /* RR-307: an answer holds at least two thirds of the search's words — "fee in Pakistan" is never "answered" by a sentence that only shares "exam" */
      if (where.length && !countriesIn(line).some((c) => where.includes(c))) continue;
      if (kind && !ANSWER_KINDS[kind].test(line)) continue;
      const whole = wholeSentences(line, 600); // RR-318 B2: never cut mid-word
      if (n >= Math.max(2, Math.ceil(want.size * 2 / 3)) && whole) cands.push({ text: whole, link: p.url, readOn: day, score: n / want.size }); }
  }
  return [...new Map(cands.sort((a, b) => b.score - a.score).map((c) => [c.text, c])).values()].slice(0, max).map((c) => ({ claimId: `site-${createHash("sha256").update(`${c.link}|${c.text}`).digest("hex").slice(0, 16)}`, text: c.text, link: c.link, readOn: c.readOn, source: new URL(c.link).hostname }));
}

/**
 * The plan and the drafts. Returns { plan:[{ kind: NEW|SECTION|REFUSED, question, demand, answers, into?, why? }], drafts:[{ url, title, html,
 * gates, pass }], design: "your site's look" | "a plain look", notEnough }.
 */
export function seoPages({ site, searchConsole = null, files = [], youtube = null, on, max = 12, overrides = {}, official = {}, planned = [], own = [], subject = null, pagePlan = null, cta = null }) {
  /* RR-318 B6 (owner's sourcing law: "the fact's owner answers it, with date"): a search about a country is answered FIRST by the official
   * pages Visibility read for that country (desktop/official.mjs) — each line with its body, its page and the day it was checked */
  const officialFor = (text) => destinationsIn(text).flatMap((c) => official[c] ?? []);
  if (!site?.ok) return { plan: [], drafts: [], notEnough: ["Visibility needs your website to plan pages — add it in the product's Settings, then press Check now."] };
  /* RR-319 (proof: "Make these pages" made 3 of 18 — the plan's pages were merged again with the old searches, Ireland's two rules joined,
   * the topic pages dropped): the PLAN is already one page per different answer — each planned page is its own need, its questions are its
   * "also asked", its own official claims answer it first */
  if (pagePlan?.length) {
    const needs = [], meta = new Map();
    for (const p of pagePlan) {
      const qs = (p.questions ?? []).map((q) => q.question ?? q), needId = `need-${slug(p.title)}`;
      /* RR-321 proof: a page planned from the list keeps ALL its own facts (a section per country) — never its first five */
      const claims = p.claims?.length > 5 ? p.claims.slice(0, 60) : [...(p.claims?.length ? p.claims : p.country ? official[p.country] ?? [] : []), ...answersFromSite([p.title, ...qs].join(" "), site)].slice(0, 5);
      meta.set(needId, { demand: { text: p.title, source: p.weak ? `How many pages (${p.kind}): an opportunity page — no search asks for it yet` : `How many pages (${p.kind}): answers ${qs.length} question${qs.length === 1 ? "" : "s"} people ask`, weight: 4 }, answers: claims, alsoAsked: qs, links: p.links ?? null, lastChecked: p.lastChecked ?? null, content: p.content ?? null, kind: p.kind, about: p.body ?? p.uni?.name ?? null, sample: p.sample?.check?.ok ? p.sample : null });
      needs.push({ needId, label: "DEMAND", path: `/${slug(p.title)}`, question: p.title, claims });
    }
    return finish({ needs, meta });
  }
  const demand = demandOf({ searchConsole, files, youtube, planned, own }).slice(0, max * 3);
  if (!demand.length) return { plan: [], drafts: [], noDemand: true, notEnough: ["No searches or questions are known for this product yet — AlmiWorld's own search data had none for it. Add one more source below, then press Create SEO pages again."] };
  const needs = [], meta = new Map(), casing = casingOf(site);
  for (const d of demand) {
    const claims = [...officialFor(d.text), ...answersFromSite(d.text, site)].slice(0, 5);
    const needId = `need-${slug(d.text)}`;
    meta.set(needId, { demand: d, answers: claims });
    needs.push({ needId, label: "DEMAND", path: `/${slug(d.text)}`, question: asQuestion(d.text, casing), claims });
  }
  /* the same need asked two ways ("OET Ireland" / "OET requirements for Ireland"): its words inside the other's, or 60% shared — one page,
   * the weaker wording kept as "also asked" (never two pages competing for one search) */
  for (let i = 0; i < needs.length; i++) {
    let a = new Set(tokens(needs[i].question)); if (!a.size || needs[i].merged) continue;
    for (let j = i + 1; j < needs.length; j++) {
      if (needs[j].merged) continue;
      const b = new Set(tokens(needs[j].question)); const both = [...a].filter((w) => b.has(w)).length;
      if ([...a].every((w) => b.has(w)) || [...b].every((w) => a.has(w)) || both / new Set([...a, ...b]).size >= 0.6 || sameNeed(needs[i].question, needs[j].question, subject)) {
        /* RR-318 proof ("AVBC Australia" became the title of the Australia page): the wording that names the subject is the page's title */
        if (namesSubject(needs[j].question, subject) && !namesSubject(needs[i].question, subject)) {
          const x = needs[i]; needs[i] = needs[j]; needs[j] = x; needs[i].alsoAsked = x.alsoAsked ?? []; delete x.alsoAsked;
          for (const n of needs) if (n.merged === x.needId) n.merged = needs[i].needId;
          a = new Set(tokens(needs[i].question));
        }
        needs[i].alsoAsked = [...(needs[i].alsoAsked ?? []), needs[j].question]; needs[j].merged = needs[i].needId;
        if (!needs[i].claims.length && needs[j].claims.length) needs[i].claims = needs[j].claims;
      }
    }
  }
  for (let k = needs.length - 1; k >= 0; k--) if (needs[k].merged) { meta.get(needs[k].merged).alsoAsked = [...(meta.get(needs[k].merged).alsoAsked ?? []), needs[k].question]; needs.splice(k, 1); }
  for (const n of needs) delete n.merged;
  return finish({ needs, meta });
  function finish({ needs, meta }) {
  const existing = site.pages.map((p) => ({ id: p.url, url: p.url, claimIds: [], questions: [p.h1, p.title, ...p.qa.map((x) => x.q)].filter(Boolean) }));
  /* an answer taken from ONE existing page means that page already does the job: improve it (existing page first) */
  for (const n of needs) { const own = n.claims.filter((c) => !c.official), pages = new Set(own.map((c) => c.link)); if (pages.size === 1 && own.length === n.claims.length) { const e = existing.find((x) => x.url === [...pages][0]); if (e) e.claimIds.push(...own.map((c) => c.claimId)); } } // an official answer is no page of the client's
  const plan = planNewPages({ needs, existing });
  const rows = plan.map((p) => { const m = meta.get(p.needId) ?? {}; return { kind: p.kind, question: p.question ?? p.need?.question ?? needs.find((n) => n.needId === p.needId)?.question, demand: m.demand, alsoAsked: m.alsoAsked ?? [], answers: m.answers ?? [],
    into: p.into ?? null, why: p.kind === "REFUSED" ? (p.reason?.startsWith("its answer is not sourced") ? "No answer to it was found on your pages yet — write the answer on your site (or tell Visibility where it is), then plan again." : p.reason) : p.kind === "SECTION" ? `Improve your existing page ${p.into}: add this question and its answer there — a second page would compete with it.` : "A new page: real demand, answered from your own pages, each answer with its source and date." }; });
  const news = plan.filter((p) => p.kind === "NEW").slice(0, max);
  const design = designFromSite(site);
  /* key-fact cards: a price, or a number with its word, standing IN one of the page's own sourced answer sentences (never typed in) */
  const valueIn = (s) => (String(s).match(/(?:[$£€₹]|\b(?:USD|GBP|EUR|PKR|INR|AUD|CAD)\s?)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:\/|per)\s?(?:month|year|week))?/i) ?? String(s).match(/\b\d[\d,.–-]*\s?(?:%|[A-Za-z]+)/) ?? [])[0];
  /* RR-318 proof (the Ireland page showed "23 April" — Australia's date — as a key fact): a page about a country takes a key fact only from a
   * sentence that names that country; the official answers first */
  /* RR-333 (buyer walk: a card read "3 to"): a length of time is the whole span ("3 to 6 months") */
  const spanIn = (s) => (String(s).match(ANSWER_KINDS.duration) ?? [])[0];
  const factIn = (c, where, kind = null) => { if (kind === "duration" && !c.official) { const s = String(c.text).split(/(?<=[.!?])\s+/).find((x) => (!where.length || countriesIn(x).some((w) => where.includes(w))) && spanIn(x)); if (s) return spanIn(s); }
    const r =c.official ? /the results it names with (\S+): ([^.]+)\.$/.exec(c.text) : null; if (r) return `${r[1]}: ${r[2]}`;
    /* RR-319 proof (8 of 13 drafts "no key-fact card"): an official answer's scores ("— Listening 350 · Reading 360 …"), its fee, or the
     * official page's own word that it is recognised there */
    if (c.official) { const m = / — ([^—]+)\.$/.exec(c.text); if (m && /\d|grade|Listening [ABC]/i.test(m[1])) return m[1].trim(); if (/is recognised or accepted there/.test(c.text)) return "recognised or accepted there"; } /* the card's words stand IN the sourced sentence */ const s = String(c.text).split(/(?<=[.!?])\s+/).find((x) => !where.length || countriesIn(x).some((w) => where.includes(w))); return s ? valueIn(s) : null; };
  const keyFacts = news.flatMap((p) => { const where = destinationsIn(p.need.question), kind = answerKindOf(p.need.question); return p.need.claims.map((c) => ({ claimId: c.claimId, value: factIn(c, where, kind) })).filter((k, i, all) => !k.value || all.findIndex((x) => x.value === k.value) === i) /* RR-333: one card per value ("60 minutes" twice) */.filter((k) => k.value).slice(0, 2); });
  /* RR-321 E3: a planned page links the pages its plan names (a university page its regulator pages; a regulator page "Where to take" and
   * the topic pages); E4: it shows when its sources were last checked */
  /* the proof: a preview of two pages linked pages outside the set ("links to no other page of the set") — a link goes to a page that is
   * built with it; with none, to the others built with it */
  const base = site.origin.replace(/\/$/, ""), built0 = new Map(news.map((x) => [x.need.question, x]));
  const relatedFor = pagePlan?.some((p) => p.links?.length) ? (np) => { const l = (meta.get(np.needId)?.links ?? []).filter((t) => built0.has(t) && t !== np.need.question).map((t) => ({ href: `${base}${built0.get(t).path}`, label: t })); return l.length ? l : news.filter((x) => x.needId !== np.needId).slice(0, 8).map((x) => ({ href: `${base}${x.path}`, label: x.need.question })); } : null;
  /* RR-336 (beta-g decision, Gate C): the client's own pages on the same topic are related pages too — a draft links them beside the pages
   * built with it, so it can reach MIN_INTERNAL_LINKS */
  const siteRelated = siteRelatedPages(site);
  const withSite = (np) => { const seen = new Set(); return [...(relatedFor ? relatedFor(np) : news.filter((x) => x.needId !== np.needId).map((x) => ({ href: `${base}${x.path}`, label: x.need.question }))), ...siteRelated(np.need.question)].filter((l) => l.href && !seen.has(l.href) && seen.add(l.href)).slice(0, 8); };
  let built = news.length ? buildNewPages({ plan: news, keyFacts, design, stamp: `Draft made by AlmiVisibility on ${String(on).slice(0, 10)} — not published`, on: String(on).slice(0, 10), site: site.origin, relatedFor: withSite }) : [];
  built = built.map((b) => richPage(b, meta.get(b.needId), String(on).slice(0, 10)));
  built = built.map((b) => { const lc = meta.get(b.needId)?.lastChecked; return lc ? { ...b, html: b.html.replace(/<\/h1>/, `</h1><p class="checked" data-last-checked="${lc}">Last checked ${lc}</p>`) } : b; });
  /* RR-308 D1 "Edit": a draft the client edited is judged AS EDITED — the five gates read the client's text, not the one Visibility wrote */
  built = built.map((b) => (typeof overrides[b.url] === "string" ? { ...b, html: overrides[b.url], title: /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(overrides[b.url])?.[1] ?? b.title } : b));
  /* RR-351 (owner, 31 Oct 2026): EVERY draft ends with the client's own offer button — a page planned from the list carries it already; a
   * page made from a search, or one the client edited without it, gets it before "Last updated" (the gates then read the page with it) */
  if (cta?.label && cta?.href) built = built.map((b) => (/data-cta>/.test(b.html) ? b : { ...b, html: withCta(b.html, cta) }));
  const now = new Date(on).toISOString();
  /* RR-333 (buyer walk: ONE new article could never be published — "it links to no other page of the set" while it linked the buyer's own
   * Prices and Implants pages): the site's existing pages are link targets for the gates (their links IN to a new page come after publishing) */
  const siteLinkPages = site.pages.filter((p) => p.url).map((p) => ({ url: p.url, html: "" }));
  const cost ={ gate: GATES.D, pass: true, checks: [{ name: "made on this computer from what was already read — no paid request", result: "PASS" }] };
  const gated = built.length ? allGates(built.map((b) => gateInput(b)), { guidance: GUIDANCE, on: String(on).slice(0, 10), site: { robotsTxt: site.robotsTxt ?? null, sitemapUrls: site.sitemapUrls ?? null, extraPages: siteLinkPages }, cost }) : [];
  const drafts = built.map((b, i) => ({ url: b.url, title: b.title, html: b.html, pass: gated[i].pass, gates: Object.entries(gated[i].gates).map(([k, g]) => ({ gate: k, words: GATE_WORDS[g.gate] ?? g.gate, pass: g.pass, failing: (g.checks ?? []).filter((c) => c.result === "FAIL" && !AFTER_PUBLISHING.test(c.name)).map((c) => `${c.name}${c.reason ? ` — ${c.reason}` : ""}`), afterPublishing: (g.checks ?? []).filter((c) => c.result !== "PASS" && (AFTER_PUBLISHING.test(c.name) || c.result === "NOT MEASURED")).map((c) => c.name) })) }));
  drafts.forEach((d, i) => { const r = linksGate(d.html, d.url, built.filter((x) => x.url !== d.url).map((x) => x.url), siteRelated(built[i].title)); if (r.block) { const c = d.gates.find((g) => g.gate === "C"); if (c) { c.pass = false; c.failing.push(r.block); d.pass = false; } } d.warnings = r.warning ? [r.warning] : []; });
  for (const d of drafts) d.readyAsDraft = d.gates.every((g) => g.pass || g.failing.length === 0);
  return { plan: rows, drafts, design: design ? "your site's own look" : "a plain look (your site's colours and menu could not all be read)", madeOn: now, notEnough: drafts.length ? [] : ["No new page is needed from what is known today — the plan below says which existing pages to improve, and what answers are missing."] };
  }
}

/*
 * 🔴 RR-322 B6 + B7 + C3 · A PLANNED PAGE'S RICH CONTENT, put into its draft: the 40–60-word answer with a number at the VERY top (right
 * under its title — "44% of ChatGPT's citations come from a page's first 30%"), a real table of its key numbers, then steps, a checklist,
 * one tip, "last updated", the client's own practice test as the call to action; a schema for its type (an Article, or a WebPage about
 * the organisation — FAQPage stays for understanding only); a page in another language says so (lang, direction).
 */
const escH = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** RR-351 · the offer button's row (the same markup richPage writes) */
export const ctaRow = (cta) => `<p class="cta-row" data-cta><a class="cta" href="${escH(cta.href)}">${escH(cta.label)}</a></p>`;
/** a page without the button gets it: before "Last updated", else before </main> or </body>, else at the end */
export function withCta(html, cta) {
  const row = ctaRow(cta), h = String(html ?? "");
  if (/<p class="updated"/.test(h)) return h.replace(/<p class="updated"/, `${row}<p class="updated"`);
  if (/<\/main>/.test(h)) return h.replace(/<\/main>/, `${row}</main>`);
  if (/<\/body>/.test(h)) return h.replace(/<\/body>/, `${row}</body>`);
  return `${h}${row}`;
}
const RTL = new Set(["ar", "ur"]);
export function richPage(b, m, on) {
  const c = m?.content; if (!c) return b;
  const table = c.table?.length > 1 ? `<table class="key" data-key-table><thead><tr>${c.table[0].map((h) => `<th>${escH(h)}</th>`).join("")}</tr></thead><tbody>${c.table.slice(1).map((r) => `<tr>${r.map((x) => `<td>${escH(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  /* the proof found 20 of 25 drafts "no direct answer near the top": the answer under the title carried no source, so the gate read past it.
   * The answer now cites the page's first sourced, dated claim — its source and date shown beside it, as every claim on the page */
  const src = (m.answers ?? []).find((x) => x.claimId && x.link && /^\d{4}-\d{2}-\d{2}$/.test(x.readOn ?? ""));
  const top = `${c.answer ? `<p class="answer" data-answer${src ? ` data-claim-id="${escH(src.claimId)}"` : ""}>${escH(c.answer)}</p>${src ? `<p class="citation">Source: <a href="${escH(src.link)}" rel="nofollow noopener">${escH(src.source ?? src.body ?? "its official page")}</a> — read ${escH(src.readOn)}</p>` : ""}` : ""}${table}`;
  const list = (h, xs, tag = "ul") => (xs?.length ? `<section data-${h.toLowerCase().replace(/\W+/g, "-")}><h2>${escH(h)}</h2><${tag}>${xs.map((x) => `<li>${escH(x)}</li>`).join("")}</${tag}></section>` : "");
  /* RR-323 · the ORIGINAL practice sample (only one that passed its check), its label first — never presented as an official paper */
  const s = m.sample, sampleHtml = s ? `<section class="sample" data-sample><h2>${escH(s.title ?? "Practice sample")}</h2><p class="label" data-sample-label><strong>${escH(s.label)}</strong></p>${s.task ? `<p data-task>${escH(s.task)}</p>` : ""}${s.caseNotes?.length ? `<h3>Case notes</h3><ul data-case-notes>${s.caseNotes.map((x) => `<li>${escH(x)}</li>`).join("")}</ul>` : ""}${s.letter ? `<h3>A model letter</h3><div data-letter>${String(s.letter).split(/\n+/).map((x) => `<p>${escH(x)}</p>`).join("")}</div>` : ""}${s.card ? `<h3>The role-play card</h3><p data-card><strong>${escH(s.card.setting)}</strong>${s.card.role ? ` — ${escH(s.card.role)}` : ""}</p><ol>${(s.card.tasks ?? []).map((x) => `<li>${escH(x)}</li>`).join("")}</ol>` : ""}${s.script ? `<h3>The script (read it aloud, or ask a friend to)</h3><div data-script>${String(s.script).split(/\n+/).map((x) => `<p>${escH(x)}</p>`).join("")}</div>` : ""}${s.text ? `<h3>The text</h3><div data-text>${String(s.text).split(/\n+/).map((x) => `<p>${escH(x)}</p>`).join("")}</div>` : ""}${s.questions?.length ? `<h3>Questions</h3><ol data-questions>${s.questions.map((q) => `<li>${escH(q.q)}${q.options?.length ? `<ul>${q.options.map((o) => `<li>${escH(o)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ol><details><summary>The answers</summary><ol>${s.questions.map((q) => `<li>${escH(q.answer)}</li>`).join("")}</ol></details>` : ""}</section>` : "";
  /* RR-328 · a part of its own (re-marking on the results page; each of a country page's five parts): every line with its source and date */
  const secHtml = (c.sections ?? []).filter((s) => s.lines?.length).map((s) => `<section data-part="${escH(String(s.heading).toLowerCase().replace(/[^a-z0-9]+/g, "-"))}"><h2>${escH(s.heading)}</h2><ul>${s.lines.map((l) => `<li>${escH(l.text)}${l.note ? ` <em>(${escH(l.note)})</em>` : ""}${l.link ? ` <span class="citation">— <a href="${escH(l.link)}" rel="nofollow noopener">source</a>${l.on ? `, read ${escH(l.on)}` : ""}</span>` : ""}</li>`).join("")}</ul></section>`).join("");
  const lower = [secHtml, sampleHtml, list("What to know", c.points), list("Steps", c.steps, "ol"), list("Checklist", c.checklist), c.tip ? `<section data-tip><h2>One useful tip</h2><p>${escH(c.tip)}</p></section>` : "", c.cta ? ctaRow(c.cta) : "", `<p class="updated" data-last-updated="${escH(c.lastUpdated ?? on)}">Last updated ${escH(c.lastUpdated ?? on)}</p>`].join("");
  const type = { subtest: "Article", topic: "Article", language: "Article", practice: "LearningResource" }[m.kind] ?? "WebPage";
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": type, headline: b.title, dateModified: c.lastUpdated ?? on, ...(m.about ? { about: { "@type": m.kind === "university" ? "CollegeOrUniversity" : "Organization", name: m.about } } : {}), ...(c.lang ? { inLanguage: c.lang } : {}) });
  let html = b.html.replace(/<\/h1>/, `</h1>${top}`).replace(/<\/main>|<\/body>/, (x) => `${lower}${x}`).replace(/<\/head>/, `<script type="application/ld+json">${ld}</script></head>`);
  if (c.lang) html = html.replace(/<html lang="[^"]*"/, `<html lang="${c.lang}"${RTL.has(c.lang) ? ' dir="rtl"' : ""}`);
  return { ...b, html };
}

/** The day's ARTICLE: the best draft not made before (one a day). */
export function articleOfDay({ pages, earlier = [], day }) {
  const next = (pages.drafts ?? []).find((d) => !earlier.includes(d.url));
  return next ? { day, ...next } : { day, none: "No new article today — every planned page is already a draft. New searches and questions bring new ones." };
}

/** SOCIAL POSTS for a draft: written from its sourced answers only (the engine's own rule). */
export function socialFor(draft, planRow) {
  if (!draft || !planRow) return { posts: [], refused: [{ why: "no article yet" }] };
  return postsForArticle({ url: draft.url, question: planRow.question, items: [{ claims: planRow.answers.map((a) => ({ ...a })) }] });
}

/** The MONTHLY REPORT, the engine's own: what was made, the search data, the YouTube part — bad news first. */
export function monthReport({ product, month, drafts = [], searchRecord = null, youtube = null }) {
  return monthlyReport({ product, month, made: { pages: drafts.map((d) => ({ url: d.url, title: d.title })), articles: [] }, search: searchFromExport(searchRecord), youtube });
}
