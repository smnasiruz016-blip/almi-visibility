/**
 * 🔴 RR-307 C + G · "WHAT WOULD YOU LIKE TO DO NOW?" — THE APP'S FEATURE REGISTRY. Every card the client sees comes from this list, so a new
 * feature shows up by itself; a feature that does not work has NO card here. Each card says, in plain words, what it does, what you get, the
 * time or cost, and what it needs; a card whose needs are not met shows "Needs: …" (never hidden) and asks for it in place, with Skip.
 * The top 3 for THIS product are suggested from its check ("Recommended for you now").
 * Each card's job is a function over what Visibility already read for the product (the site read, the YouTube read, Search Console, files).
 * Publishing ALWAYS follows the client's own choice: RR-308 D publishes a draft only through a connection the client made (desktop/publish.mjs),
 * after the five gates pass again — on "Approve & Publish", or by itself only when the client chose "publish automatically after the gates".
 */
import { fixForMe, aiReadiness, FIXES, directAnswer } from "./product-check.mjs";
import { readyFromFix } from "./action-plan.mjs";
import { AI_SEARCH_BOTS } from "../src/page/page-gates.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ctx: { hasSite, siteRead, youtubeConfirmed, youtubeKey, searchConsole, files, drafts, check, aiKey } */
export const FEATURES = Object.freeze([
  { id: "check", title: "Check my site now", does: "Reads your website (and your YouTube channel) and scores it like an exam.", youGet: "A score out of 100, what is good, and what to fix first.", time: "About 1–4 minutes (one page a second, up to 50 pages). Free.", needs: (c) => (!c.hasSite && !c.youtubeConfirmed ? [{ what: "your website or your YouTube channel", action: "settings" }] : []) },
  { id: "seo-pages", title: "Create SEO pages", does: "Plans new pages from what people really search, answers each from your own pages, and checks each page before it can go out.", youGet: "A page plan and ready drafts (nothing is published).", time: "About a minute. Free.", /* RR-353 (owner): our own search data first — Search Console is one more source, never a wall */ needs: (c) => (!c.hasSite ? [{ what: "your website", action: "settings" }] : []) },
  { id: "seo-check", title: "SEO check", does: "Checks how healthy your site is for Google search.", youGet: "Pages that cannot be found, titles and descriptions to fix, your sitemap and robots file.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "aeo", title: "Answer engines", does: "Checks that your pages answer the questions people ask, in a form answer engines can lift.", youGet: "The questions you answer, the direct answers missing, and FAQ markup ready to paste.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "geo", title: "AI search", does: "Checks how ready your site is for AI assistants (ChatGPT search, Claude, Perplexity) to read and cite.", youGet: "Whether AI search bots may read you, whether your site says who you are, and what to fix.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "keywords", title: "Keywords and questions", does: "Shows every search phrase and question Visibility has found for this product, with where each came from.", youGet: "Your list of searches and questions, and which sources are still missing.", time: "Instant. Free.", needs: () => [] },
  { id: "articles", title: "Daily article", does: "Makes one article a day from the best next topic people search for.", youGet: "Today's article as a draft, answered from your own pages with sources.", time: "A minute a day. Free.", needs: (c) => [...(!c.hasSite ? [{ what: "your website", action: "settings" }] : []), ...(!c.searchConsole && !c.files && !c.youtubeConfirmed ? [{ what: "what people search", action: "google" }] : [])] },
  { id: "youtube", title: "YouTube advice", does: "Reads your channel and tells you how to make each video easier to find.", youGet: "Advice per video and for the channel, and new video ideas — each with its source.", time: "A minute. Free (uses your own YouTube key).", needs: (c) => [...(!c.youtubeKey ? [{ what: "your YouTube key", action: "youtube" }] : []), ...(!c.youtubeConfirmed ? [{ what: "your YouTube channel", action: "youtube" }] : [])] },
  /* RR-348 b: TikTok & Instagram next to YouTube — from the client's handle, niche and own files; nothing read from or posted to either */
  { id: "tiktok-instagram", title: "TikTok & Instagram", does: "Content ideas, hooks, captions and hashtag sets for your TikTok or Instagram — and checks for the captions you write.", youGet: "Ideas, a ready caption, three hashtag sets, posting advice and \"Write better with AI\" — each with Copy.", time: "Instant. Free (AI writing uses your own AI key).", needs: () => [] },
  { id: "social", title: "Social posts", does: "Writes Facebook and LinkedIn posts from your article — or, for a YouTube channel, from your newest videos — using only their own words.", youGet: "Posts ready to copy.", time: "Instant. Free.", needs: (c) => (!c.drafts && !(c.noWebsite && c.youtubeConfirmed) ? [{ what: "an article or page draft (Create SEO pages first)", action: "seo-pages" }] : []) },
  { id: "links", title: "Links check", does: "Checks that the links on your site open.", youGet: "Every broken link, and the page it is on.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "languages", title: "Languages", does: "Checks which languages your pages say they are in, and whether they point to each other.", youGet: "Your pages' languages against the languages you chose.", time: "Uses your last check. Free.", needs: (c) => (!c.siteRead ? [{ what: "a check of your site", action: "check" }] : []) },
  { id: "monthly", title: "Monthly report", does: "Puts the month together: what was made, your searches, your YouTube — bad news first.", youGet: "One report you can read or share.", time: "Instant. Free.", needs: (c) => (!c.check ? [{ what: "a check of your product", action: "check" }] : []) },
  /* RR-308 D: publishing, by the client's own connection, after the five gates again */
  { id: "publish", title: "Publish my pages", does: "Puts your finished drafts on your own site — WordPress, GitHub + Vercel, Shopify — or saves them as files for you to add.", youGet: "Approve & Publish and Edit on every draft, the live link, and Undo.", time: "A minute to connect, once. Free.", needs: (c) => (!c.drafts ? [{ what: "a page draft (Create SEO pages first)", action: "seo-pages" }] : []) },
  /* RR-318 C + D */
  { id: "page-count", title: "How many pages can I make for this product?", does: "You choose what to make pages for — countries, universities, professions, subjects, cities or your own list. Visibility keeps only what an official page confirms, then says honestly how many pages are possible AND good.", youGet: "The number, the list with each official source and date, and \"Make these pages (drafts)\".", time: "A few minutes (it reads official pages slowly, one every 2 seconds). Free.", needs: (c) => (!c.hasSite ? [{ what: "your website", action: "settings" }] : []) },
  { id: "search-power", title: "Search Console: positions, opportunities and alerts", does: "Reads your own Search Console week by week: where each search phrase and page stands, which phrases are close to page 1, and what dropped.", youGet: "Rank tracking with the trend, opportunity phrases with ready text, and alerts with a refresh suggestion.", time: "A minute. Free (Google's own data).", needs: (c) => (c.searchConsoleKind !== "CONNECTED" ? [{ what: "Google Search Console, connected", action: "google" }] : []) },
  { id: "google", title: "Connect Google Search Console", does: "Brings in the searches people really make before they find you.", youGet: "Your real searches and the pages they open — the base for new pages.", time: "2 minutes, once. Free.", needs: () => [] },
].map(Object.freeze));

/* the cards that only work with a website */
export const WEBSITE_ONLY = new Set(["seo-pages", "seo-check", "aeo", "geo", "articles", "links", "languages", "publish", "google", "page-count", "search-power"]);
/** The cards for one product: each with its needs, and the top 3 recommended from its check. */
export function menuFor(ctx) {
  /* RR-318 B7 (owner: "after Search Console connected, the Connect card still showed"): once connected, the Connect card is gone */
  const cards = FEATURES.filter((f) => !(f.id === "google" && ctx.searchConsole)).map((f) => ({ id: f.id, title: f.title, does: f.does, youGet: f.youGet, time: f.time, needs: f.needs(ctx) }));
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
  /* RR-310 B3 + B4 (owner; replaces the RR-307 G4 "never hidden" rule for THIS case): a product with no website — the cards that need a
   * website go into ONE closed section, "Have a website too? These open up"; "Check my site now" says "Check my channel now" */
  if (ctx.noWebsite === true) {
    if (ctx.youtubeConfirmed && !rec.includes("social")) rec.push("social");
    const top = [...new Set(rec)].filter((id) => !WEBSITE_ONLY.has(id)).slice(0, 3);
    const mine = cards.map((c) => (c.id === "check" ? { ...c, title: "Check my channel now", does: "Reads your YouTube channel and scores it — the share of plain checks your videos pass." } : c));
    return { question: "What would you like to do now?", recommended: top, cards: mine.filter((c) => !WEBSITE_ONLY.has(c.id)).map((c) => ({ ...c, recommended: top.includes(c.id) })),
      websiteOnly: { title: "Have a website too? These open up", cards: mine.filter((c) => WEBSITE_ONLY.has(c.id)).map((c) => ({ ...c, recommended: false })) } };
  }
  const top = [...new Set(rec)].slice(0, 3);
  return { question: "What would you like to do now?", recommended: top, cards: cards.map((c) => ({ ...c, recommended: top.includes(c.id) })) };
}

/* ── the checks that read the last site read ──
 * RR-310 A1 (owner): every finding that is not good is THREE parts — problem (the line, with its count), solution (plain steps) and ready
 * (the text to paste, each with where it came from). A thing Visibility cannot write from the client's own words has no ready text, said. */
const ready = (text, label, source, extra = {}) => ({ kind: extra.kind ?? "text", label, text, source, ...extra });
const three = (l) => (l.ok === false ? { ...l, problem: l.line, solution: l.solution ?? l.how ?? "", ready: l.ready ?? [], note: l.note ?? (l.ready?.length ? null : "Nothing to paste for this one — the solution says what to do.") } : l);
const firstSentences = (s, max = 60) => { const out = []; for (const x of String(s ?? "").split(/(?<=[.!?])\s+/)) { if ((out.join(" ") + " " + x).split(/\s+/).length > max) break; out.push(x); } return out.join(" ") || String(s ?? "").split(/\s+/).slice(0, max).join(" "); };
export function seoCheck(site, card) {
  const pages = site.pages, on = String(site.readOn).slice(0, 10);
  const noindex = pages.filter((p) => p.noindex), noCanon = pages.filter((p) => !p.canonical);
  const lines = [
    { ok: site.robots.found, line: site.robots.found ? "Your site has a robots file (it tells search engines what they may read)." : "Your site has no robots file — search engines read everything; that is fine, but you cannot steer them.",
      solution: "Add a robots.txt file at the root of your site that allows search engines and names your sitemap.", ready: [ready(`User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml`, "robots.txt", "the robots standard and your site's own address", { kind: "file" })] },
    { ok: site.sitemap.found, line: site.sitemap.found ? `Your sitemap lists ${plural(site.sitemap.urls, "address", "addresses")}.` : "No sitemap found — add one so search engines find every page.",
      solution: "Put this file at /sitemap.xml on your site, then submit it in Google Search Console → Sitemaps.", ready: [ready(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${p.url}</loc></url>`).join("\n")}\n</urlset>`, "sitemap.xml", `the ${plural(pages.length, "page")} Visibility read on your site, ${on}`, { kind: "file" })] },
    { ok: !noindex.length, line: noindex.length ? `${noindex.length} of ${plural(pages.length, "page")} tell search engines not to show them: ${noindex.slice(0, 5).map((p) => p.url).join(", ")}` : "Every page read may be shown in search.",
      solution: "Remove \"noindex\" from these pages if people should find them in search (your website builder's SEO setting for the page).", ready: noindex.length ? [ready(noindex.map((p) => p.url).join("\n"), "Pages marked noindex", `the check of ${on}`, { kind: "list" })] : [] },
    { ok: !noCanon.length, line: noCanon.length ? `${noCanon.length} of ${plural(pages.length, "page")} do not say which address is the main one.` : "Every page says which address is its main one.",
      solution: FIXES.canonical.how, ready: noCanon.slice(0, 5).map((p) => ready(`<link rel="canonical" href="${p.url}">`, "Canonical link (in the page's <head>)", "the page's own address", { kind: "code", for: p.url })) },
    ...card.fixFirst.filter((f) => ["title", "meta-description", "one-h1", "https-only"].includes(f.id)).map((f) => ({ ok: false, line: f.line, how: f.how, fixForMe: f.fixForMe ? fixForMe(f.id, site) : [],
      ready: f.fixForMe ? readyFromFix(fixForMe(f.id, site), f.id === "title" ? "title" : "meta description", f.id === "title" ? "Page title" : "Meta description", site.readOn) : [], note: f.fixForMe ? null : "Nothing to paste — this is a setting or a change on the page itself." })),
  ];
  return { title: "SEO check", lines: lines.map(three), read: `${plural(pages.length, "page")} read on ${on}` };
}

export function aeoCheck(site, plan = null) {
  const qa = site.pages.flatMap((p) => p.qa.map((x) => ({ ...x, url: p.url })));
  const faqPages = site.pages.filter((p) => p.structuredTypes.includes("FAQPage"));
  const asked = qa.filter((x) => x.from === "a heading on the page");
  const noDirect = asked.filter((x) => !directAnswer(x)); // RR-313 C2: right under the question, opening with the answer — no word count
  /* FAQ answers: the questions people search, with the answer already on the client's own pages (from the action plan's page plan) */
  const faq = [...(plan?.thisWeek ?? []), ...(plan?.rest ?? [])].flatMap((i) => i.ready.filter((r) => r.kind === "FAQ answer"));
  return { title: "Answer engines", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`,
    lines: [
      { ok: qa.length > 0, line: qa.length ? `${plural(qa.length, "question")} answered on your pages.` : "No questions are answered on your pages yet — answer engines build their answers from questions and answers.",
        solution: "Add a few questions people ask as headings on your pages, each with its answer right under it.", ready: faq, note: faq.length ? null : "Visibility writes FAQ answers only from answers already on your pages — connect Search Console or add a search-data file so it knows the questions people ask." },
      { ok: faqPages.length > 0, line: faqPages.length ? `${plural(faqPages.length, "page")} mark their questions for machines (FAQ markup).` : "No page marks its questions for machines (FAQ markup).", fixForMe: faqPages.length || !qa.some((x) => x.a) ? [] : fixForMe("structured-data", site).filter((x) => /FAQPage/.test(x.paste)),
        solution: "Paste this block into the page that shows these questions (your website builder's \"custom code\" or \"header\" box).", ready: faqPages.length || !qa.some((x) => x.a) ? [] : readyFromFix(fixForMe("structured-data", site).filter((x) => /FAQPage/.test(x.paste)), "structured data", "FAQ markup", site.readOn) },
      asked.length ? { ok: noDirect.length === 0, line: noDirect.length ? `${noDirect.length} of ${plural(asked.length, "question heading")} ${noDirect.length === 1 ? "has" : "have"} no answer right under ${noDirect.length === 1 ? "it" : "them"} that opens with the answer: ${noDirect.slice(0, 4).map((x) => `"${x.q}"`).join(", ")}` : "Every question heading has its answer right under it, opening with the answer.",
        solution: "Right under each question heading, open with the answer itself; the longer explanation can follow.", ready: noDirect.filter((x) => x.a).slice(0, 5).map((x) => ready(`${x.q}\n${firstSentences(x.a)}`, "Short answer (your page's own first sentences)", `your page ${x.url}`, { kind: "FAQ answer", for: x.url })) } : { ok: null, line: "No question headings on your pages to check for a direct answer." },
    ].map(three), questions: qa.slice(0, 50) };
}

export function geoCheck(site) {
  const ticks = aiReadiness(site);
  const names = [...new Set(site.pages.map((p) => (p.title ?? "").split(/[|—–-]/).pop().trim()).filter(Boolean))];
  const counts = new Map(); for (const p of site.pages) { const n = (p.title ?? "").split(/[|—–-]/).pop().trim(); if (n) counts.set(n, (counts.get(n) ?? 0) + 1); }
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { title: "AI search", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`,
    lines: [
      ...ticks.map((t) => { const fx = t.fix && t.tick === false ? fixForMe(t.fix === "robots" ? "ai:robots" : "structured-data", site) : [];
        return { ok: t.tick, line: t.line, fixForMe: fx, solution: t.fix === "robots" ? "Allow the AI search bots in your robots.txt — paste these lines into it." : t.fix === "faq" ? "Answer the questions your customers ask on your pages — a question as a heading, the answer right under it." : "Paste this block into your home page's header (your website builder's \"custom code\" box).",
          ready: readyFromFix(fx, t.fix === "robots" ? "robots.txt lines" : "structured data", t.fix === "robots" ? "Add to robots.txt" : "Structured data", site.readOn) }; }),
      { ok: names.length <= 2, line: names.length <= 2 ? `Your pages name you the same way (${names[0] ?? "—"}).` : `Your pages name you in ${names.length} different ways (${names.slice(0, 4).join(" · ")}) — AI assistants trust one consistent name.`,
        solution: "End every page title with the same name — the one most of your pages use already.", ready: main ? [ready(main, "Your name, as most of your pages write it", `the titles of ${counts.get(main)} of your pages`)] : [] },
      { ok: site.pages.some((p) => p.facts.length), line: site.pages.some((p) => p.facts.length) ? "Your pages state facts with numbers (prices, dates, scores) that AI answers can quote." : "Your pages hold few facts with numbers for AI answers to quote.",
        solution: "Write your real facts on your pages — prices, dates, how many, how long — in plain sentences.", note: "Visibility does not write your facts: only you know them, and an invented number would be worse than none." },
    ].map(three), note: `Checked against the AI search bots: ${AI_SEARCH_BOTS.join(", ")}. This version does not ask the AI assistants themselves.` };
}

export function linksCheck(site) {
  const checked = new Set(site.linkObs.map((o) => o.to)).size;
  return { title: "Links check", read: `${plural(checked, "link")} checked on ${String(site.readOn).slice(0, 10)}`, lines: site.brokenLinks.length
    ? site.brokenLinks.map((b) => three({ ok: false, line: `${b.to} does not open (${b.status || "no answer"}) — on ${b.from}`, solution: `Open ${b.from} in your website builder and change this link to an address that opens, or remove it.`, ready: [ready(b.to, "The broken address (to find it on the page)", `the links check, ${String(site.readOn).slice(0, 10)}`, { for: b.from })] }))
    : [{ ok: true, line: "Every link checked opens." }] };
}

export function languagesCheck(site, chosen = []) {
  const langs = new Map(); for (const p of site.pages) { const l = (p.lang ?? "not set").slice(0, 2).toLowerCase(); langs.set(l, (langs.get(l) ?? 0) + 1); }
  const name = (c) => LANGUAGES.find((l) => l.code === c)?.name ?? c;
  const missing = chosen.filter((c) => !langs.has(c));
  const byLang = [...langs.keys()].filter((l) => l !== "not set");
  return { title: "Languages", read: `${plural(site.pages.length, "page")} read on ${String(site.readOn).slice(0, 10)}`, lines: [
    { ok: !langs.has("not set"), line: `Your pages say they are in: ${[...langs.entries()].map(([l, n]) => `${l === "not set" ? "no language set" : name(l)} (${n})`).join(", ")}.`,
      solution: "Set each page's language in your website's settings (it is the lang= part of the page's first line).", ready: chosen.length ? [ready(`<html lang="${chosen[0]}">`, "Page language", "the language you chose in Setup", { kind: "code" })] : [] },
    { ok: missing.length === 0, line: missing.length ? `No page found yet in: ${missing.map(name).join(", ")} (you chose ${chosen.map(name).join(", ")}).` : `Every language you chose has pages (${chosen.map(name).join(", ") || "none chosen"}).`,
      solution: "Make your main pages in these languages too — written by a person who speaks them — or remove the language from your choice in Setup.", note: "Visibility does not translate pages: a translation needs a person who knows the language and your product." },
    { ok: site.pages.some((p) => p.hreflang.length) || langs.size <= 1, line: site.pages.some((p) => p.hreflang.length) ? "Your language versions point to each other." : langs.size <= 1 ? "One language — nothing to point between." : "Your language versions do not point to each other (hreflang) — search engines may show the wrong language.",
      solution: "On each page, add one line per language version, pointing to that version's address.", ready: byLang.map((l) => { const p = site.pages.find((x) => (x.lang ?? "").slice(0, 2).toLowerCase() === l); return ready(`<link rel="alternate" hreflang="${l}" href="${p.url}">`, `Line for the ${name(l)} version (fill in each page's own address)`, `your page ${p.url}`, { kind: "code" }); }) },
  ].map(three) };
}
