/**
 * 🔴 RR-307 A + B · "CHECK NOW": the moment a product is added (and any time after), Visibility checks it — its website (the full reader,
 * desktop/site-read.mjs) and/or its YouTube channel — and shows a SCORE CARD like AlmiCV's ATS score, then "What to fix first".
 *   · The /100 number is the engine's OWN score (src/report/visibility-score.mjs: PASS weight ÷ EVALUATED weight) — never a second scorer.
 *   · Areas: Technical, Content, Security, Links (the engine's categories), AI-answer readiness (ticks: the AI search bots may read the site,
 *     structured data, questions answered on the page, a direct answer under each question, who the site is), YouTube (ticks: what the
 *     channel check found). An area not measured says "Not measured" — never zero.
 *   · YouTube has NO number (the owner's ruling of 12 Oct 2026: "no derived score"); a YouTube-only product's gauge says "Not measured".
 *   · Each fix says in plain words what is wrong, "Show me how", and — where Visibility can write it — "Fix it for me": the text to paste.
 * Pure over what it is handed (the site read, the YouTube check); no promise of ranking, traffic or citation.
 */
import { evidenceByUrl, runMode, findingsOf, RESULT } from "../src/report/visibility-score.mjs";
import { youtubeScore } from "./youtube-plan.mjs";
import { titleOptions } from "./describe.mjs";
import { writtenDescriptions, siteNameOf, organizationLd, cleanAnswer, FAQ_TRUTH } from "./web-text.mjs";

export const NO_PROMISE = "This check measures what it can see today. It promises no ranking, traffic or citation by any search or AI engine.";
export const wordFor = (score) => (score === null ? "Not measured" : score >= 80 ? "Good" : score >= 50 ? "Needs work" : "Poor");
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* the engine's checks in plain words: what is wrong, how to fix it, and whether Visibility can write the fix */
export const FIXES = Object.freeze({
  title: { problem: "pages have a missing, too short or too long title", how: "Give every page its own title of 10 to 70 characters that says what the page is about, main words first.", fixable: true },
  "meta-description": { problem: "pages have no good description for search results", how: "Write a description of 50 to 170 characters for every page: what the reader gets there.", fixable: true },
  "one-h1": { problem: "pages do not have exactly one main heading", how: "Give every page one main heading (H1) — not none, not two.", fixable: false },
  canonical: { problem: "pages do not say which address is the main one (canonical)", how: "Add one canonical link to each page, pointing to its own https address. Your website builder usually has a setting for it.", fixable: false },
  lang: { problem: "pages do not say their language", how: "Set the page language (for example lang=\"en\") in your website's settings.", fixable: false },
  viewport: { problem: "pages are not set up for phones", how: "Add the mobile viewport setting — most website builders have it; ask your web person if not.", fixable: false },
  "structured-data": { problem: "pages carry no structured data (the facts search and AI engines read)", how: "Add a structured-data block describing your organisation, product and questions.", fixable: true },
  "image-alt": { problem: "images have no text for people who cannot see them", how: "Give every image a short text (alt text) that says what it shows.", fixable: false },
  "https-only": { problem: "the site does not always move visitors to the safe (https) address", how: "Turn on \"always use https\" in your hosting settings.", fixable: false },
  "links-resolve": { problem: "links on the site lead to pages that do not open", how: "Fix or remove the broken links listed below.", fixable: false },
});

/* RR-313 C4 (owner: "1 things"): a count agrees with its noun and its verb — "1 page has", "38 pages do not have" */
const ONE = [[/^pages have\b/, "page has"], [/^pages do not\b/, "page does not"], [/^pages are\b/, "page is"], [/^pages carry\b/, "page carries"]]; // one page can hold many images or links: those lines stay plural
const verbFor = (problem, n) => (n === 1 ? ONE.reduce((s, [re, to]) => s.replace(re, to), problem) : problem);
/** "38 pages do not have exactly one main heading" / "1 page has a missing, too short or too long title" */
export function problemLine(id, n) {
  const p = FIXES[id]?.problem ?? id;
  return /^pages /.test(p) ? `${n} ${verbFor(p, n)}` : `${plural(n, "page")}: ${verbFor(p, n)}`;
}
/** "1 of 50 pages has …" — the verb agrees with the count, not with the 50 */
export function problemOf(id, n, of) {
  const p = FIXES[id]?.problem ?? id;
  return /^pages /.test(p) ? `${n} of ${plural(of, "page")} ${verbFor(p, n).replace(/^pages? /, "")}` : `${n} of ${plural(of, "page")}: ${verbFor(p, n)}`;
}

/**
 * What to fix first: heaviest first, each check once, with how many pages — RR-313 C5: EVERY page and the full count (the card once listed
 * 20 and the plan then said "20 of 50" where 38 pages had the problem); a page counts once however many findings it has
 */
export function fixFirstFrom(findings, results) {
  const byCheck = new Map();
  for (const f of findings) { const x = byCheck.get(f.check) ?? { check: f.check, weight: f.weight, area: AREA[results.find((r) => r.check === f.check)?.category] ?? null, pages: new Set() }; x.pages.add(f.url); byCheck.set(f.check, x); }
  return [...byCheck.values()].sort((a, b) => b.weight * b.pages.size - a.weight * a.pages.size).map((x) => ({ id: x.check, area: x.area, line: problemLine(x.check, x.pages.size), how: FIXES[x.check]?.how ?? null, fixForMe: Boolean(FIXES[x.check]?.fixable), count: x.pages.size, pages: [...x.pages] }));
}
/** RR-313 C5: each area gets ITS items from "what to fix first", in that order */
export function withAreaItems(areas, fixFirst) {
  for (const a of areas) { const items = fixFirst.filter((f) => f.area === a.area).map((f) => ({ id: f.id, line: f.line, how: f.how })); if (items.length) a.items = items; }
  return areas;
}

const AREA = { TECHNICAL: "Technical", CONTENT: "Content", ACCESSIBILITY: "Accessibility", SECURITY: "Security", LINKS: "Links" };

/**
 * RR-313 C2 (owner's law: no word count). A question heading has a DIRECT answer when text stands right under it and that text OPENS with
 * the answer — its first sentence is not another question and not a lead-in ("Great question", "In this article", "Let's look", "Read on").
 */
const LEAD_IN = /^(great|good) question\b|^in this (section|article|post|guide|video)\b|^let'?s\b|^before (we|you)\b|^we('ll| will)\b|^read on\b|^keep reading\b|^find out\b|^click\b|^scroll\b|^here'?s what\b|^this (section|article|post|guide) (explains|covers|looks)\b/i;
export function directAnswer(x) {
  const first = String(x?.a ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return first.length > 0 && !/\?$/.test(first) && !LEAD_IN.test(first);
}

/** AI-answer readiness: five plain ticks from the site read. A tick not measurable says so. */
export function aiReadiness(site) {
  if (!site?.ok) return [];
  const home = site.pages[0];
  const bots = Object.entries(site.robots.aiBots);
  const qa = site.pages.flatMap((p) => p.qa.map((x) => ({ ...x, url: p.url })));
  const asked = qa.filter((x) => x.from === "a heading on the page");
  const shortAnswer = asked.filter(directAnswer);
  const who = site.pages.some((p) => p.structuredTypes.some((t) => /^(Organization|LocalBusiness|Corporation|WebSite|Product|SoftwareApplication|Course|Person)$/.test(t)));
  return [
    bots.some(([, v]) => v === null) ? { tick: null, line: "AI search bots: robots.txt could not be read — not measured" } : { tick: bots.every(([, v]) => v), line: bots.every(([, v]) => v) ? "AI search bots may read your site (ChatGPT search, Claude search, Perplexity)" : `Your robots.txt blocks: ${bots.filter(([, v]) => !v).map(([b]) => b).join(", ")}`, fix: bots.every(([, v]) => v) ? null : "robots" },
    { tick: home.structuredTypes.length > 0, line: home.structuredTypes.length ? `Your home page describes itself to machines (${home.structuredTypes.slice(0, 3).join(", ")})` : "Your home page has no structured data", fix: home.structuredTypes.length ? null : "structured-data" },
    { tick: qa.length > 0, line: qa.length ? `${plural(qa.length, "question")} answered on your pages` : "No questions are answered on your pages — AI answers are built from questions and answers", fix: qa.length ? null : "faq" },
    asked.length ? { tick: shortAnswer.length === asked.length, line: `${shortAnswer.length} of ${plural(asked.length, "question heading")} ${asked.length === 1 ? "has its" : "have their"} answer right under ${asked.length === 1 ? "it" : "them"}, opening with the answer` } : { tick: null, line: "Direct answers: no question headings to measure" },
    { tick: who, line: who ? "Your site says who you are (organisation or product facts)" : "Your site does not say who you are in a way machines read", fix: who ? null : "structured-data" },
  ];
}

/**
 * The score card. `site` from readSite (or null), `youtube` = { confirmed, videos, check } (or null). Returns everything the product page shows.
 */
export function scoreCard({ site = null, youtube = null, on, noWebsite = false }) {
  /* RR-308 C5 + C6 (owner: "when the site could not be opened, it still said Nothing to fix was found"): a site that could not be opened is a
   * FAILED check, said plainly, with the way to fix it — never "Nothing to fix", never a score */
  if (site && !site.ok && hasSite(site)) return failedCard({ site, youtube, on });
  const areas = [];
  let score = null, findings = [], results = [];
  if (site?.ok) {
    const r = runMode({ mode: "full", evidenceByUrl: evidenceByUrl({ pageReads: site.pageReads, securityReads: site.securityReads, linkObs: site.linkObs }) });
    score = r.score; results = r.results; findings = findingsOf(r.results);
    for (const [cat, name] of Object.entries(AREA)) {
      const v = r.byCategory[cat];
      const fails = findings.filter((f) => results.find((x) => x.check === f.check)?.category === cat);
      areas.push(v === null || v === undefined ? { area: name, state: "NOT_MEASURED", line: "Not measured" } : { area: name, state: fails.length ? "WARN" : "OK", line: fails.length ? `${plural(new Set(fails.map((f) => f.url)).size, "page")} to fix` : "All good" });
    }
  } else for (const name of Object.values(AREA)) areas.push({ area: name, state: "NOT_MEASURED", line: site ? `Not measured — ${site.why}` : "Not measured — no website for this product" });
  const ai = aiReadiness(site);
  areas.push(ai.length ? { area: "AI-answer readiness", state: ai.some((t) => t.tick === false) ? "WARN" : ai.every((t) => t.tick === null) ? "NOT_MEASURED" : "OK", line: `${ai.filter((t) => t.tick).length} of ${ai.filter((t) => t.tick !== null).length} ready`, ticks: ai } : { area: "AI-answer readiness", state: "NOT_MEASURED", line: "Not measured — no website read" });
  const yt = youtubeArea(youtube);
  areas.push(yt.area);

  const fixFirst = fixFirstFrom(findings, results);
  const byCheck = new Set(fixFirst.map((f) => f.id));
  for (const t of ai.filter((t) => t.tick === false && t.fix && !byCheck.has(t.fix))) fixFirst.push({ id: `ai:${t.fix}`, line: t.line, how: t.fix === "robots" ? "Allow the AI search bots in your robots.txt (Visibility writes the lines for you)." : t.fix === "faq" ? "Answer the questions your customers ask, on your pages — one question as a heading, the answer right under it." : FIXES["structured-data"].how, fixForMe: t.fix !== "faq" });
  if (site?.brokenLinks?.length) { const f = fixFirst.find((x) => x.id === "links-resolve"); if (f) f.broken = site.brokenLinks.slice(0, 20); }
  /* RR-313 C5 (owner: "Content — 38 pages to fix, but only 2 items shown"): each area carries ITS items, in the order of what to fix first */
  withAreaItems(areas, fixFirst);
  if (youtube?.confirmed) for (const c of (youtube.check ?? []).filter((c) => c.findings.length).slice(0, 3)) fixFirst.push({ id: `yt:${c.videoId}`, line: `YouTube "${c.title}": ${c.findings.join("; ")}`, how: "Open the YouTube tab: each video has its own advice, with where it came from.", fixForMe: false });
  /* RR-310 B1 + B2 (owner): a product with NO website — its gauge is the YouTube /100 and only the YouTube line is shown (the website
   * lines would all say "Not measured" and hide what IS measured) */
  if (noWebsite && !site) return Object.freeze({ on, youtubeOnly: true, score: yt.score?.score ?? null, word: yt.score?.word ?? "Not measured", gauge: yt.score?.gauge ?? "Not measured", areas: [yt.area], fixFirst, notMeasured: 0, pagesRead: 0, notChecked: null, youtube: yt.score, noPromise: NO_PROMISE });
  return Object.freeze({ on, score, word: wordFor(score), gauge: score === null ? "Not measured" : `${score}/100`, areas, fixFirst, notMeasured: results.filter((r) => r.result === RESULT.NOT_MEASURED).length, pagesRead: site?.ok ? site.pages.length : 0, notChecked: site?.notChecked?.line ?? null, youtube: yt.score, noPromise: NO_PROMISE });
}
const hasSite = (site) => site.why !== undefined;
/* RR-308 (owner's answer 2, 22 Oct 2026): YouTube has its OWN /100 — only the share of plain countable checks passed, each with its count */
function youtubeArea(youtube) {
  if (!youtube?.confirmed) return { area: { area: "YouTube", state: "NOT_MEASURED", line: youtube?.why ?? "Not measured — no YouTube channel confirmed" }, score: null };
  const s = youtubeScore(youtube.videos ?? [], youtube.opts ?? {});
  return { area: { area: "YouTube", state: s.score === null ? "NOT_MEASURED" : s.checks.every((c) => c.passed === c.of) ? "OK" : "WARN", line: `${s.gauge} — ${plural(youtube.videos?.length ?? 0, "video")} read`, ticks: s.checks.map((c) => ({ tick: c.passed === c.of, line: c.text })) }, score: s };
}
function failedCard({ site, youtube, on }) {
  const areas = Object.values(AREA).map((name) => ({ area: name, state: "NOT_MEASURED", line: "Not measured — the check failed: your website could not be opened" }));
  areas.push({ area: "AI-answer readiness", state: "NOT_MEASURED", line: "Not measured — the check failed: your website could not be opened" });
  const yt = youtubeArea(youtube); areas.push(yt.area);
  const line = "Check failed — your website could not be opened. Fix the address in Settings.";
  return Object.freeze({ on, failed: true, score: null, word: "Check failed", gauge: "Check failed", areas, why: site.why, suggestion: site.suggestion ?? null,
    fixFirst: [{ id: "site-unreachable", line, how: `${site.why}${site.suggestion ? ` Did you mean ${site.suggestion}?` : ""} Open Settings, correct the address (it must open in your browser), then press Check now.`, fixForMe: false, action: "settings" }],
    notMeasured: 0, pagesRead: 0, notChecked: null, youtube: yt.score, noPromise: NO_PROMISE });
}

/** "Fix it for me": the text the client pastes — written only from the page's own words and the site's own facts. */
export function fixForMe(id, site) {
  const pages = site?.ok ? site.pages : [];
  /* RR-308 C1: two options per page, written from the page's own main content, unique across the site, complete sentences, never cut */
  if (id === "title") { const used = new Set(), siteName = site?.ok ? siteNameOf(site) : null;
    return pages.filter((p) => !p.title || p.title.length < 10 || p.title.length > 70).slice(0, 20).map((p) => ({ page: p.url, options: titleOptions(p, { siteName, used }) })).filter((x) => x.options.length)
      .map((x) => ({ page: x.page, paste: x.options[0].text, options: x.options, from: x.options[0].from })); }
  /* RR-318 B1 (owner: "meta descriptions are sentences lifted from the page, not written descriptions"): WRITTEN — what the reader gets on
   * the page, from its main heading and what its sections cover; complete sentences, never cut (desktop/web-text.mjs) */
  if (id === "meta-description") { const used = new Set(), siteName = siteNameOf(site);
    return pages.filter((p) => !p.description || p.description.length < 50 || p.description.length > 170).slice(0, 20).map((p) => ({ page: p.url, options: writtenDescriptions(p, { siteName, used }) }))
      .map((x) => (x.options.length ? { page: x.page, paste: x.options[0].text, options: x.options, from: x.options[0].from } : { page: x.page, paste: null, options: [], from: null, none: "This page has too little of its own (a main heading and what its sections cover) to write a good description — add a main heading and one or two section headings, then press Fix it for me again." })); }
  /* RR-318 B3 + B2: the Organization is the site's real name (never a page title) with its logo only when one was found; FAQ markup per page,
   * its answers whole and without the page's source lines, offered as what it is today (Google stopped showing FAQ rich results, 7 May 2026) */
  if (id === "structured-data" || id === "ai:structured-data") {
    const org = organizationLd(site);
    const out = [{ page: site.origin, paste: org.paste, from: org.from, note: org.note, kind: "organization" }];
    for (const p of pages.filter((x) => x.qa.some((q) => q.a) && !x.structuredTypes.includes("FAQPage")).slice(0, 3)) {
      const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.qa.filter((x) => x.a).slice(0, 10).map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: cleanAnswer(x.a) } })) };
      out.push({ page: p.url, paste: `<script type="application/ld+json">${JSON.stringify(ld, null, 1)}</script>`, from: "the questions and answers already on this page", note: FAQ_TRUTH, kind: "faq" });
    }
    return out;
  }
  if (id === "ai:robots") return [{ page: `${site.origin}/robots.txt`, paste: ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"].map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n"), from: "the AI search bots' published names" }];
  return [];
}

/** B3 · "We found …": what Visibility gathered for this product, each with its source and date — and what is missing, with what it would add. */
export function foundInfo({ site = null, youtube = null, files = [], searchConsole = null, keys = {}, on }) {
  const day = String(on).slice(0, 10);
  /* RR-308 C3: the questions ALREADY ANSWERED on the client's pages are kept apart — "questions people ask" come only from search data and
   * research, each with its source */
  const questions = [], phrases = [], answered = [];
  if (site?.ok) for (const p of site.pages) for (const x of p.qa) answered.push({ text: x.q, source: `your page ${p.url} (${x.from})`, on: day });
  for (const q of youtube?.questions ?? []) questions.push({ text: q.text, source: q.source, on: day });
  /* RR-310 A2: how often it is searched or shown — only when the source says it (the file's own figure, Search Console's impressions) */
  for (const f of files) (/\?$|^(how|what|why|which|where|when|who|can|is|does|do|kya|kaise)\b/i.test(f.phrase) ? questions : phrases).push({ text: f.phrase, source: `your file ${f.file}`, on: f.on, searched: f.impressions ? `${Number(f.impressions).toLocaleString("en-US")} (the figure in your file)` : null });
  for (const q of searchConsole?.queries ?? []) phrases.push({ text: q.query, source: `your Search Console (${searchConsole.window ?? "export"})`, on: searchConsole.on, searched: Number.isFinite(q.impressions) ? `shown ${Number(q.impressions).toLocaleString("en-US")} times in Google search` : null });
  for (const t of youtube?.terms ?? []) phrases.push({ text: t.phrase, source: t.from, on: day });
  const uniq = (xs) => [...new Map(xs.map((x) => [x.text.toLowerCase(), x])).values()];
  const missing = [];
  if (!site?.ok) missing.push({ what: "Your website", adds: "Your pages, prices, facts and existing questions — the base of every page Visibility writes.", action: "settings" });
  if (!searchConsole) missing.push({ what: "Google Search Console", adds: "The real searches people make before they find you, and which pages they open.", action: "google" });
  if (!files.length) missing.push({ what: "A search-data file (Bing or Keyword Planner)", adds: "More search phrases with how often they are searched.", action: "file" });
  if (!youtube?.confirmed) missing.push({ what: "Your YouTube channel", adds: "Your videos, the questions under them and what does well on your topics.", action: "youtube" });
  if (!keys.ai) missing.push({ what: "Your AI connection", adds: "How AI assistants answer questions about your topics — and whether they mention you.", action: "ai" });
  /* RR-308 C4: each price with its page and what it is for (the sentence it stands in on that page) */
  const prices = [];
  if (site?.ok) for (const p of site.pages) for (const x of p.priceContext ?? p.prices.map((price) => ({ price, sentence: null }))) if (!prices.some((y) => y.price === x.price && y.page === p.url)) prices.push({ price: x.price, page: p.url, pageTitle: p.h1 ?? p.title ?? p.url, for: x.sentence });
  return Object.freeze({ on: day, pages: site?.ok ? site.pages.length : 0, prices: prices.slice(0, 30), answered: uniq(answered), questions: uniq(questions), phrases: uniq(phrases), missing, notChecked: site?.notChecked?.line ?? null,
    line: `We found ${plural(site?.ok ? site.pages.length : 0, "page")}, ${plural(uniq(answered).length, "question")} answered on your pages, ${plural(uniq(questions).length, "question")} people ask (from search data and research) and ${plural(uniq(phrases).length, "search phrase")}.` });
}
