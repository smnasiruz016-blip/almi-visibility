/**
 * 🔴 RR-307 C + G · "WHAT WOULD YOU LIKE TO DO NOW?" — THE APP'S FEATURE REGISTRY. Every card the client sees comes from this list, so a new
 * feature shows up by itself; a feature that does not work has NO card here. Each card says, in plain words, what it does, what you get, the
 * time or cost, and what it needs; a card whose needs are not met shows "Needs: …" (never hidden) and asks for it in place, with Skip.
 * The top 3 for THIS product are suggested from its check ("Recommended for you now").
 * Each card's job is a function over what Visibility already read for the product (the site read, the YouTube read, Search Console, files).
 * Publishing ALWAYS follows the client's own choice and needs a connection to the client's site, which this version does not have — so every
 * page, article and post is a DRAFT for the client to copy. Nothing is published or submitted.
 */
import { fixForMe, aiReadiness } from "./product-check.mjs";
import { AI_SEARCH_BOTS } from "../src/page/page-gates.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ctx: { hasSite, siteRead, youtubeConfirmed, youtubeKey, searchConsole, files, drafts, check, aiKey } */
export const FEATURES = Object.freeze([
  { id: "check", title: "Check my site now", does: "Reads your website (and your YouTube channel) and scores it like an exam.", youGet: "A score out of 100, what is good, and what to fix first.", time: "About 1–4 minutes (one page a second, up to 50 pages). Free.", needs: (c) => (!c.hasSite && !c.youtubeConfirmed ? [{ what: "your website or your YouTube channel", action: "settings" }] : []) },
  { id: "seo-pages", title: "Create SEO pages", does: "Plans new pages from what people really search, answers each from your own pages, and checks each draft with our five gates.", youGet: "A page plan and ready drafts (nothing is published).", time: "About a minute. Free.", needs: (c) => [...(!c.hasSite ? [{ what: "your website", action: "settings" }] : []), ...(!c.searchConsole && !c.files && !c.youtubeConfirmed ? [{ what: "what people search: Search Console, a search-data file or your YouTube channel", action: "google" }] : [])] },
  { id: "seo-check", title: "SEO check", does: "Checks how healthy your site is for Google search.", youGet: "Pages that cannot be found, titles and descriptions to fix, your sitemap and robots file.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "aeo", title: "Answer engines (AEO)", does: "Checks that your pages answer the questions people ask, in a form answer engines can lift.", youGet: "The questions you answer, the direct answers missing, and FAQ markup ready to paste.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "geo", title: "AI search (GEO)", does: "Checks how ready your site is for AI assistants (ChatGPT search, Claude, Perplexity) to read and cite.", youGet: "Whether AI search bots may read you, whether your site says who you are, and what to fix.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "keywords", title: "Keywords and questions", does: "Shows every search phrase and question Visibility has found for this product, with where each came from.", youGet: "Your list of searches and questions, and which sources are still missing.", time: "Instant. Free.", needs: () => [] },
  { id: "articles", title: "Daily article", does: "Makes one article a day from the best next topic people search for.", youGet: "Today's article as a draft, answered from your own pages with sources.", time: "A minute a day. Free.", needs: (c) => [...(!c.hasSite ? [{ what: "your website", action: "settings" }] : []), ...(!c.searchConsole && !c.files && !c.youtubeConfirmed ? [{ what: "what people search", action: "google" }] : [])] },
  { id: "youtube", title: "YouTube advice", does: "Reads your channel and tells you how to make each video easier to find.", youGet: "Advice per video and for the channel, and new video ideas — each with its source.", time: "A minute. Free (uses your own YouTube key).", needs: (c) => [...(!c.youtubeKey ? [{ what: "your YouTube key", action: "youtube" }] : []), ...(!c.youtubeConfirmed ? [{ what: "your YouTube channel", action: "youtube" }] : [])] },
  { id: "social", title: "Social posts", does: "Writes Facebook and LinkedIn posts from your article, using only its sourced facts.", youGet: "Posts ready to copy.", time: "Instant. Free.", needs: (c) => (!c.drafts ? [{ what: "an article or page draft (Create SEO pages first)", action: "seo-pages" }] : []) },
  { id: "links", title: "Links check", does: "Checks that the links on your site open.", youGet: "Every broken link, and the page it is on.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "languages", title: "Languages", does: "Checks which languages your pages say they are in, and whether they point to each other.", youGet: "Your pages' languages against the languages you chose.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "monthly", title: "Monthly report", does: "Puts the month together: what was made, your searches, your YouTube — bad news first.", youGet: "One report you can read or share.", time: "Instant. Free.", needs: (c) => (!c.check ? [{ what: "a check of your product", action: "check" }] : []) },
  { id: "google", title: "Connect Google Search Console", does: "Brings in the searches people really make before they find you.", youGet: "Your real searches and the pages they open — the base for new pages.", time: "2 minutes, once. Free.", needs: () => [] },
].map(Object.freeze));

/** The cards for one product: each with its needs, and the top 3 recommended from its check. */
export function menuFor(ctx) {
  const cards = FEATURES.map((f) => ({ id: f.id, title: f.title, does: f.does, youGet: f.youGet, time: f.time, needs: f.needs(ctx) }));
  const rec = [];
  const area = (name) => ctx.check?.areas?.find((a) => a.area === name);
  if (!ctx.check) rec.push("check");
  if (ctx.check && (ctx.check.score ?? 100) < 80) rec.push("seo-check");
  if (area("AI-answer readiness")?.state === "WARN") rec.push("geo");
  if (ctx.siteRead && !(ctx.siteRead.pages ?? []).some((p) => p.qa.length)) rec.push("aeo");
  if (!ctx.searchConsole && ctx.hasSite) rec.push("google");
  if ((ctx.searchConsole || ctx.files || ctx.youtubeConfirmed) && ctx.hasSite) rec.push("seo-pages");
  if (ctx.youtubeConfirmed) rec.push("youtube");
  if (area("Links")?.state === "WARN") rec.unshift("links");
  const top = [...new Set(rec)].slice(0, 3);
  return { question: "What would you like to do now?", recommended: top, cards: cards.map((c) => ({ ...c, recommended: top.includes(c.id) })) };
}

/* ── the checks that read the last site read ── */
export function seoCheck(site, card) {
  const pages = site.pages;
  const lines = [
    { ok: site.robots.found, line: site.robots.found ? "Your site has a robots file (it tells search engines what they may read)." : "Your site has no robots file — search engines read everything; that is fine, but you cannot steer them." },
    { ok: site.sitemap.found, line: site.sitemap.found ? `Your sitemap lists ${plural(site.sitemap.urls, "address", "addresses")}.` : "No sitemap found — add one so search engines find every page." },
    { ok: !pages.some((p) => p.noindex), line: pages.some((p) => p.noindex) ? `${plural(pages.filter((p) => p.noindex).length, "page")} tell search engines not to show them: ${pages.filter((p) => p.noindex).slice(0, 5).map((p) => p.url).join(", ")}` : "Every page read may be shown in search." },
    { ok: pages.every((p) => p.canonical), line: pages.every((p) => p.canonical) ? "Every page says which address is its main one." : `${plural(pages.filter((p) => !p.canonical).length, "page")} do not say which address is the main one.` },
    ...card.fixFirst.filter((f) => ["title", "meta-description", "one-h1", "https-only"].includes(f.id)).map((f) => ({ ok: false, line: f.line, how: f.how, fixForMe: f.fixForMe ? fixForMe(f.id, site) : [] })),
  ];
  return { title: "SEO check", lines, read: `${plural(pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}` };
}

export function aeoCheck(site) {
  const qa = site.pages.flatMap((p) => p.qa.map((x) => ({ ...x, url: p.url })));
  const faqPages = site.pages.filter((p) => p.structuredTypes.includes("FAQPage"));
  const asked = qa.filter((x) => x.from === "a heading on the page");
  const noDirect = asked.filter((x) => !x.a || x.a.split(/\s+/).length > 120);
  return { title: "Answer engines (AEO)", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`,
    lines: [
      { ok: qa.length > 0, line: qa.length ? `${plural(qa.length, "question")} answered on your pages.` : "No questions are answered on your pages yet — answer engines build their answers from questions and answers." },
      { ok: faqPages.length > 0, line: faqPages.length ? `${plural(faqPages.length, "page")} mark their questions for machines (FAQ markup).` : "No page marks its questions for machines (FAQ markup).", fixForMe: faqPages.length || !qa.some((x) => x.a) ? [] : fixForMe("structured-data", site).filter((x) => /FAQPage/.test(x.paste)) },
      asked.length ? { ok: noDirect.length === 0, line: noDirect.length ? `${plural(noDirect.length, "question heading")} have no short answer right under them: ${noDirect.slice(0, 4).map((x) => `"${x.q}"`).join(", ")}` : "Every question heading has a short answer right under it." } : { ok: null, line: "No question headings on your pages to measure." },
    ], questions: qa.slice(0, 50) };
}

export function geoCheck(site) {
  const ticks = aiReadiness(site);
  const names = [...new Set(site.pages.map((p) => (p.title ?? "").split(/[|—–-]/).pop().trim()).filter(Boolean))];
  return { title: "AI search (GEO)", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`,
    lines: [
      ...ticks.map((t) => ({ ok: t.tick, line: t.line, fixForMe: t.fix && t.tick === false ? fixForMe(t.fix === "robots" ? "ai:robots" : "structured-data", site) : [] })),
      { ok: names.length <= 2, line: names.length <= 2 ? `Your pages name you the same way (${names[0] ?? "—"}).` : `Your pages name you in ${names.length} different ways (${names.slice(0, 4).join(" · ")}) — AI assistants trust one consistent name.` },
      { ok: site.pages.some((p) => p.facts.length), line: site.pages.some((p) => p.facts.length) ? "Your pages state facts with numbers (prices, dates, scores) that AI answers can quote." : "Your pages hold few facts with numbers for AI answers to quote." },
    ], note: `Checked against the AI search bots: ${AI_SEARCH_BOTS.join(", ")}. This version does not ask the AI assistants themselves.` };
}

export function linksCheck(site) {
  const checked = new Set(site.linkObs.map((o) => o.to)).size;
  return { title: "Links check", read: `${plural(checked, "link")} checked on ${String(site.readOn).slice(0, 10)}`, lines: site.brokenLinks.length ? site.brokenLinks.map((b) => ({ ok: false, line: `${b.to} does not open (${b.status || "no answer"}) — on ${b.from}` })) : [{ ok: true, line: "Every link checked opens." }] };
}

export function languagesCheck(site, chosen = []) {
  const langs = new Map(); for (const p of site.pages) { const l = (p.lang ?? "not set").slice(0, 2).toLowerCase(); langs.set(l, (langs.get(l) ?? 0) + 1); }
  const name = (c) => LANGUAGES.find((l) => l.code === c)?.name ?? c;
  const missing = chosen.filter((c) => !langs.has(c));
  return { title: "Languages", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`, lines: [
    { ok: !langs.has("not set"), line: `Your pages say they are in: ${[...langs.entries()].map(([l, n]) => `${l === "not set" ? "no language set" : name(l)} (${n})`).join(", ")}.` },
    { ok: missing.length === 0, line: missing.length ? `No page found yet in: ${missing.map(name).join(", ")} (you chose ${chosen.map(name).join(", ")}).` : `Every language you chose has pages (${chosen.map(name).join(", ") || "none chosen"}).` },
    { ok: site.pages.some((p) => p.hreflang.length) || langs.size <= 1, line: site.pages.some((p) => p.hreflang.length) ? "Your language versions point to each other." : langs.size <= 1 ? "One language — nothing to point between." : "Your language versions do not point to each other (hreflang) — search engines may show the wrong one." },
  ] };
}
