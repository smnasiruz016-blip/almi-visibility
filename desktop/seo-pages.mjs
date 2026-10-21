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
import { postsForArticle } from "../src/page/social-posts.mjs";
import { monthlyReport, searchFromExport } from "../src/report/monthly-report.mjs";
import { validateDesign } from "../src/questionnaire/product-questionnaire.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";
import { createHash } from "node:crypto";
import { tokens } from "./youtube-advice.mjs";

export const GATE_WORDS = Object.freeze({ [GATES.A]: "not a copy of another page", [GATES.B]: "not competing with another page for the same search", [GATES.C]: "technically ready for search and AI engines", [GATES.D]: "made inside its cost", [GATES.E]: "no existing page already does the job" });
/* checks that can only be true once the page is live on the client's site (it is a draft until then) */
const AFTER_PUBLISHING = /^(listed in the sitemap|a URL not in the plan is 404|internal links in)$/;
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
const casingOf = (site) => { const m = new Map(); for (const p of site.pages) for (const w of [p.title, p.h1, ...p.h2].join(" ").split(/[^\p{L}\p{N}]+/u)) if (w && w !== w.toLowerCase() && !m.has(w.toLowerCase())) m.set(w.toLowerCase(), w);
  /* RR-308: a name the site writes with capitals INSIDE its own sentences ("in New Zealand") keeps them in a page title ("OET for Nurses in new zealand" before) */
  for (const p of site.pages) for (const s of [...(p.lead ?? []), ...(p.facts ?? [])]) for (const w of String(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(1)) if (/^\p{Lu}\p{Ll}+$/u.test(w) && !m.has(w.toLowerCase())) m.set(w.toLowerCase(), w);
  return m; };
const asQuestion = (s, casing = new Map()) => { const t = String(s).trim().replace(/\s+/g, " ").split(" ").map((w) => casing.get(w.toLowerCase()) ?? w).join(" "); return t.charAt(0).toUpperCase() + t.slice(1); };

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
export function demandOf({ searchConsole = null, files = [], youtube = null }) {
  const out = new Map();
  const add = (text, source, weight) => { const k = tokens(text).join(" "); if (tokens(text).length < 2) return; const x = out.get(k); if (!x || x.weight < weight) out.set(k, { text: String(text).trim(), source, weight }); };
  for (const q of searchConsole?.queries ?? []) add(q.query, `your Search Console: seen ${q.impressions} time${q.impressions === 1 ? "" : "s"} in search (${searchConsole.window})`, 10 + Math.log10(1 + q.impressions));
  for (const f of files) add(f.phrase, `your file ${f.file} (${f.on})`, 5 + Math.log10(1 + (f.impressions ?? 0)));
  for (const q of youtube?.questions ?? []) add(q.text, q.source, 3);
  for (const t of youtube?.terms ?? []) add(t.phrase, t.from, 2);
  return [...out.values()].sort((a, b) => b.weight - a.weight);
}

/** The client's own sentences that answer a search: they share most of its meaning words. Each is a claim with its page and read date. */
export function answersFromSite(text, site, max = 3) {
  const want = new Set(tokens(text)); if (want.size < 2) return [];
  const day = String(site.readOn).slice(0, 10);
  const cands = [];
  for (const p of site.pages) {
    const lines = [...p.qa.filter((x) => x.a).map((x) => x.a), ...p.facts];
    for (const line of lines) { const t = new Set(tokens(line)); let n = 0; for (const w of want) if (t.has(w)) n++; /* RR-307: an answer holds at least two thirds of the search's words — "fee in Pakistan" is never "answered" by a sentence that only shares "exam" */
      if (n >= Math.max(2, Math.ceil(want.size * 2 / 3))) cands.push({ text: line.length > 400 ? `${line.slice(0, 399)}…` : line, link: p.url, readOn: day, score: n / want.size }); }
  }
  return [...new Map(cands.sort((a, b) => b.score - a.score).map((c) => [c.text, c])).values()].slice(0, max).map((c) => ({ claimId: `site-${createHash("sha256").update(`${c.link}|${c.text}`).digest("hex").slice(0, 16)}`, text: c.text, link: c.link, readOn: c.readOn, source: new URL(c.link).hostname }));
}

/**
 * The plan and the drafts. Returns { plan:[{ kind: NEW|SECTION|REFUSED, question, demand, answers, into?, why? }], drafts:[{ url, title, html,
 * gates, pass }], design: "your site's look" | "a plain look", notEnough }.
 */
export function seoPages({ site, searchConsole = null, files = [], youtube = null, on, max = 12, overrides = {} }) {
  if (!site?.ok) return { plan: [], drafts: [], notEnough: ["Visibility needs your website to plan pages — add it in the product's Settings, then press Check now."] };
  const demand = demandOf({ searchConsole, files, youtube }).slice(0, max * 3);
  if (!demand.length) return { plan: [], drafts: [], notEnough: ["No searches or questions are known for this product yet. Connect Google Search Console (or add its export file), add a search-data file, or confirm your YouTube channel — then press Create SEO pages again."] };
  const needs = [], meta = new Map(), casing = casingOf(site);
  for (const d of demand) {
    const claims = answersFromSite(d.text, site);
    const needId = `need-${slug(d.text)}`;
    meta.set(needId, { demand: d, answers: claims });
    needs.push({ needId, label: "DEMAND", path: `/${slug(d.text)}`, question: asQuestion(d.text, casing), claims });
  }
  /* the same need asked two ways ("OET Ireland" / "OET requirements for Ireland"): its words inside the other's, or 60% shared — one page,
   * the weaker wording kept as "also asked" (never two pages competing for one search) */
  for (let i = 0; i < needs.length; i++) {
    const a = new Set(tokens(needs[i].question)); if (!a.size || needs[i].merged) continue;
    for (let j = i + 1; j < needs.length; j++) {
      if (needs[j].merged) continue;
      const b = new Set(tokens(needs[j].question)); const both = [...a].filter((w) => b.has(w)).length;
      if ([...a].every((w) => b.has(w)) || [...b].every((w) => a.has(w)) || both / new Set([...a, ...b]).size >= 0.6) {
        needs[i].alsoAsked = [...(needs[i].alsoAsked ?? []), needs[j].question]; needs[j].merged = needs[i].needId;
        if (!needs[i].claims.length && needs[j].claims.length) needs[i].claims = needs[j].claims;
      }
    }
  }
  for (let k = needs.length - 1; k >= 0; k--) if (needs[k].merged) { meta.get(needs[k].merged).alsoAsked = [...(meta.get(needs[k].merged).alsoAsked ?? []), needs[k].question]; needs.splice(k, 1); }
  for (const n of needs) delete n.merged;
  const existing = site.pages.map((p) => ({ id: p.url, url: p.url, claimIds: [], questions: [p.h1, p.title, ...p.qa.map((x) => x.q)].filter(Boolean) }));
  /* an answer taken from ONE existing page means that page already does the job: improve it (existing page first) */
  for (const n of needs) { const pages = new Set(n.claims.map((c) => c.link)); if (pages.size === 1) { const e = existing.find((x) => x.url === [...pages][0]); e.claimIds.push(...n.claims.map((c) => c.claimId)); } }
  const plan = planNewPages({ needs, existing });
  const rows = plan.map((p) => { const m = meta.get(p.needId) ?? {}; return { kind: p.kind, question: p.question ?? p.need?.question ?? needs.find((n) => n.needId === p.needId)?.question, demand: m.demand, alsoAsked: m.alsoAsked ?? [], answers: m.answers ?? [],
    into: p.into ?? null, why: p.kind === "REFUSED" ? (p.reason?.startsWith("its answer is not sourced") ? "No answer to it was found on your pages yet — write the answer on your site (or tell Visibility where it is), then plan again." : p.reason) : p.kind === "SECTION" ? `Improve your existing page ${p.into}: add this question and its answer there — a second page would compete with it.` : "A new page: real demand, answered from your own pages, each answer with its source and date." }; });
  const news = plan.filter((p) => p.kind === "NEW").slice(0, max);
  const design = designFromSite(site);
  /* key-fact cards: a price, or a number with its word, standing IN one of the page's own sourced answer sentences (never typed in) */
  const valueIn = (s) => (String(s).match(/(?:[$£€₹]|\b(?:USD|GBP|EUR|PKR|INR|AUD|CAD)\s?)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:\/|per)\s?(?:month|year|week))?/i) ?? String(s).match(/\b\d[\d,.–-]*\s?(?:%|[A-Za-z]+)/) ?? [])[0];
  const keyFacts = news.flatMap((p) => p.need.claims.map((c) => ({ claimId: c.claimId, value: valueIn(c.text) })).filter((k) => k.value).slice(0, 2));
  let built = news.length ? buildNewPages({ plan: news, keyFacts, design, stamp: `Draft made by AlmiVisibility on ${String(on).slice(0, 10)} — not published`, on: String(on).slice(0, 10), site: site.origin }) : [];
  /* RR-308 D1 "Edit": a draft the client edited is judged AS EDITED — the five gates read the client's text, not the one Visibility wrote */
  built = built.map((b) => (typeof overrides[b.url] === "string" ? { ...b, html: overrides[b.url], title: /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(overrides[b.url])?.[1] ?? b.title } : b));
  const now = new Date(on).toISOString();
  const cost = { gate: GATES.D, pass: true, checks: [{ name: "made on this computer from what was already read — no paid request", result: "PASS" }] };
  const gated = built.length ? allGates(built.map((b) => gateInput(b)), { guidance: GUIDANCE, on: String(on).slice(0, 10), site: { robotsTxt: site.robotsTxt ?? null, sitemapUrls: site.sitemapUrls ?? null, extraPages: [] }, cost }) : [];
  const drafts = built.map((b, i) => ({ url: b.url, title: b.title, html: b.html, pass: gated[i].pass, gates: Object.entries(gated[i].gates).map(([k, g]) => ({ gate: k, words: GATE_WORDS[g.gate] ?? g.gate, pass: g.pass, failing: (g.checks ?? []).filter((c) => c.result === "FAIL" && !AFTER_PUBLISHING.test(c.name)).map((c) => `${c.name}${c.reason ? ` — ${c.reason}` : ""}`), afterPublishing: (g.checks ?? []).filter((c) => c.result !== "PASS" && (AFTER_PUBLISHING.test(c.name) || c.result === "NOT MEASURED")).map((c) => c.name) })) }));
  for (const d of drafts) d.readyAsDraft = d.gates.every((g) => g.pass || g.failing.length === 0);
  return { plan: rows, drafts, design: design ? "your site's own look" : "a plain look (your site's colours and menu could not all be read)", madeOn: now, notEnough: drafts.length ? [] : ["No new page is needed from what is known today — the plan below says which existing pages to improve, and what answers are missing."] };
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
