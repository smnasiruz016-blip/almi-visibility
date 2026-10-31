/**
 * 🔴 RR-310 A + D · EVERY PROBLEM COMES WITH ITS SOLUTION, AND VISIBILITY SAYS WHAT IT WILL DO (owner, 21 Oct 2026: "Visibility should be
 * telling our clients how it will fix the problems with the solutions — use these keywords, these titles, these articles").
 *   · Every finding is THREE parts: "Problem" (plain words, with the count), "Solution" (one or two plain steps) and "Ready to use" (the
 *     text to paste — titles, descriptions, hashtags, chapters, FAQ answers, meta descriptions, keywords, article and video titles), each
 *     ready text with where it came from. Nothing is invented: a text Visibility cannot write from the client's own words and the research
 *     is not written — the solution says what the client does instead.
 *   · THE ACTION PLAN, per product: THIS WEEK (the 5 items with the most effect), KEYWORDS TO USE (grouped by their shared main word, each
 *     with its source and, when known, how often it is searched or shown), TITLES (existing and new), ARTICLES / NEW VIDEOS TO MAKE, then the
 *     rest in order of effect. The Overview's "What to fix first" IS this plan's top. Downloadable as a document (planDocument).
 *   · EFFECT: Visibility's own ordering, said plainly — how much search engines and YouTube rely on the thing (a weight) × how much of the
 *     client's pages or videos miss it. It is not a forecast of rankings, traffic or citations.
 *   · "WHAT I WILL DO FOR YOU" (willDo): the five things Visibility does for a website product, each with its state and a "Do it for me";
 *     honest wording only (HONEST) — never "top", never a ranking, traffic or citation promise. AlmiWorld's own products: plan only.
 * PURE: reads what it is handed; fetches and writes nothing.
 */
import { FIXES, fixForMe, problemOf } from "./product-check.mjs";
import { tokens } from "./youtube-advice.mjs";
import { properNames } from "./youtube-niche.mjs";
import { casingOf } from "./seo-pages.mjs";
import { newPageDescription, siteNameOf } from "./web-text.mjs";

/* AlmiWorld's OWN products (a site on almiworld.com, the AlmiWorld channel): the plan is shown; nothing is published or submitted (D5) */
/* 🔴 RR-352 (owner, 31 Oct 2026: "AlmiOET is now a REAL project"): an AlmiWorld product the owner marked REAL in its Settings
 * (setup.realProject.on, default off) is published and submitted like a client's — only for its website; AlmiWorld's own YouTube channel is
 * still never changed from here. isAlmiWorld stays the product's KIND (its built-in AlmiWorld lists); publishBlocked is the RULE */
export const realProject = (s) => s?.setup?.realProject?.on === true;
export const publishBlocked = (s) => isAlmiWorld(s) && !realProject(s);
export const isAlmiWorld = (s) => { let host = ""; try { host = new URL(s?.product?.site ?? "").host; } catch {} return /(^|\.)almiworld\.com$/i.test(host) || /almiworld/i.test(String(s?.setup?.youtube?.confirmed?.handle ?? s?.setup?.youtube?.handle ?? "")); };
export const HONEST = "This gives your product a better chance to appear in Google and AI answers. It promises no ranking, traffic or citation.";
export const EFFECT_RULE = "Order: how much search engines and YouTube rely on each thing, times how many of your pages or videos miss it. Visibility's own ordering — not a forecast of rankings or visits.";
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const day = (d) => String(d ?? "").slice(0, 10);
/* how much each thing matters (Visibility's own weights, 1–10) */
const WEIGHT = Object.freeze({
  title: 10, "meta-description": 9, "https-only": 9, "ai:robots": 9, noindex: 9, sitemap: 8, "new-pages": 8, "ai:faq": 8, viewport: 7, "structured-data": 7, "ai:structured-data": 7,
  "links-resolve": 7, sections: 6, canonical: 5, "one-h1": 5, lang: 3, "image-alt": 3, robots: 2,
  "yt:clear": 9, "yt:description": 9, "yt:title": 8, "yt:link": 7, "yt:chapters": 6, "yt:ideas": 6, "yt:questions": 5, "yt:generic": 4, "yt:hashtag-count": 4,
});
const effect = (id, share) => Math.round((WEIGHT[id] ?? 3) * (50 + 50 * Math.max(0, Math.min(1, share))));
const item = ({ id, area, problem, solution, ready = [], count = 0, of = 1, fixForMe: doIt = null, note = null }) => ({ id, area, problem, solution, ready, note, effect: effect(id, of ? count / of : 1), fixForMe: doIt });

/* ── YouTube: each failing check, with its most-viewed videos' ready text (advice.gaps, desktop/youtube-plan.mjs gapFixes) ── */
const YT_WORDS = Object.freeze({
  clear: { problem: (c, o) => `${fmt(c)} of your ${fmt(o)} most-viewed and newest videos have a title that names no activity and no place`, solution: "Give each a clear title: what happens, where, who — main words first. Paste one of the ready titles in YouTube Studio → Details." },
  description: { problem: (c, o) => `${fmt(c)} of ${fmt(o)} videos have no description`, solution: "Add a description to each, most-viewed first: two lines saying what happens, then your links. Paste the ready one and correct anything that is not right." },
  title: { problem: (c, o) => `${fmt(c)} of ${fmt(o)} videos have a title with no words or longer than YouTube shows`, solution: "Shorten the title to the words that say what the video is about, main words first." },
  link: { problem: (c, o) => `${fmt(c)} of ${fmt(o)} videos about your product do not link to its page`, solution: "Add the link line near the top of each description, so viewers can reach your product." },
  chapters: { problem: (c, o) => `${fmt(c)} of ${fmt(o)} long videos have no chapters`, solution: "Add a chapter list to the description: 0:00 first, at least 3 parts, each 10 seconds or longer. Fill in the times as you watch the video." },
  generic: { problem: (c, o) => `${fmt(c)} of ${fmt(o)} videos use empty hashtags (#viral, #fyp, #trending)`, solution: "Remove the empty hashtags and use 3 that say what the video is about." },
  "hashtag-count": { problem: (c, o) => `${fmt(c)} of ${fmt(o)} videos have more hashtags than YouTube reads (above the limit it ignores all of them)`, solution: "Keep 3 hashtags that say what the video is about; remove the rest." },
});
export function youtubeItems(a) {
  if (!a || a.state !== "READY") return [];
  const out = [];
  for (const [id, g] of Object.entries(a.gaps ?? {})) {
    const w = YT_WORDS[id]; if (!w) continue;
    out.push(item({ id: `yt:${id}`, area: "YouTube", problem: w.problem(g.count, g.of), solution: w.solution, count: g.count, of: g.of,
      ready: g.videos.flatMap((v) => v.ready.map((r) => ({ ...r, for: `"${v.title}" (${fmt(v.views)} views)` }))), note: g.count > g.videos.length ? `Ready text is shown for the ${g.videos.length} most-viewed; every video has its own under the YouTube tab.` : null }));
  }
  const formats = (a.ideas ?? []).filter((i) => i.kind === "FORMAT"), asked = (a.ideas ?? []).filter((i) => i.kind === "QUESTION");
  if (formats.length) out.push(item({ id: "yt:ideas", area: "YouTube", problem: `${plural(formats.length, "kind")} of video your niche's viewers watch most ${formats.length === 1 ? "is" : "are"} missing from your channel`, solution: "Make one of these videos this week, with the ready title.", count: formats.length, of: Math.max(formats.length, 3), ready: formats.map((i) => ({ kind: "title", label: "New video title", text: i.title, source: i.why })) }));
  if (asked.length) out.push(item({ id: "yt:questions", area: "YouTube", problem: `${plural(asked.length, "question")} viewers asked ${asked.length === 1 ? "is" : "are"} not answered by any of your videos`, solution: "Answer one in a video, or in a pinned comment under the video it was asked on.", count: asked.length, of: Math.max(asked.length, 3), ready: asked.map((i) => ({ kind: "title", label: "Video answering it", text: i.title, source: i.why })) }));
  return out;
}

/* ── the website: the engine's findings (the check's fixFirst), the site read, and the page plan ── */
const SOLUTION = Object.freeze({
  sitemap: "Add a sitemap (a list of your pages for search engines) at /sitemap.xml, then tell Google about it in Search Console → Sitemaps.",
  robots: "Add a robots.txt file at the root of your site that allows search engines and names your sitemap.",
  noindex: "Remove \"noindex\" from these pages if people should find them in search (your website builder's SEO setting for the page).",
});
/* RR-318 B: the structured data says which block it is — "who you are" (Organization) or FAQ markup with what it does today — and carries its note */
const BLOCK = { organization: "Organization — who you are", faq: "FAQ markup — helps search and AI understand this page (not shown in Google)" };
export const readyFromFix = (xs, kind, label, readOn) => xs.flatMap((x) => (x.options?.length ? x.options.map((o, k) => ({ kind, label: `${label} — option ${k + 1}`, text: o.text, for: x.page, source: `written from ${o.from} · read ${day(readOn)}` })) : x.paste ? [{ kind, label: BLOCK[x.kind] ?? label, text: x.paste, for: x.page, source: `${x.from} · read ${day(readOn)}`, ...(x.note ? { note: x.note } : {}), ...(x.kind ? { block: x.kind } : {}) }] : []));
export function websiteItems({ card = null, site = null, pages = null, languages = [] }) {
  if (!site?.ok) return [];
  const out = [], n = site.pages.length, readOn = site.readOn;
  const has = new Set();
  for (const f of card?.fixFirst ?? []) {
    if (f.id.startsWith("yt:") || f.id === "site-unreachable") continue;
    const count = f.count ?? f.pages?.length ?? 1; has.add(f.id); // RR-313 C5: the full count, never the 20 pages listed
    let ready = [];
    if (["title", "meta-description", "structured-data", "ai:structured-data", "ai:robots"].includes(f.id)) {
      const xs = fixForMe(f.id, site);
      ready = f.id === "title" ? readyFromFix(xs.slice(0, 3), "title", "Page title", readOn) : f.id === "meta-description" ? readyFromFix(xs.slice(0, 3), "meta description", "Meta description", readOn) : readyFromFix(xs, f.id === "ai:robots" ? "robots.txt lines" : "structured data", f.id === "ai:robots" ? "Add to robots.txt" : "Structured data", readOn);
      /* a page Visibility cannot write for (its title is fine in length but the check found it wrong, or it has too little text): its page and
       * its present title, so the client sees exactly what to change */
      if (!ready.length && (f.id === "title" || f.id === "meta-description")) ready = (f.pages ?? []).slice(0, 5).map((u) => { const p = site.pages.find((x) => x.url === u); return { kind: "list", label: f.id === "title" ? "The page and its present title" : "The page and its present description", text: `${u}\n${(f.id === "title" ? p?.title : p?.description) || "(none)"}`, source: `the check of ${day(readOn)}` }; });
    } else if (f.id === "ai:faq") ready = faqReady(pages);
    else if (f.id === "canonical") ready = (f.pages ?? []).slice(0, 3).map((u) => ({ kind: "code", label: "Canonical link (in the page's <head>)", text: `<link rel="canonical" href="${u}">`, for: u, source: "the page's own address" }));
    else if (f.id === "lang") ready = languages.length ? [{ kind: "code", label: "Page language", text: `<html lang="${languages[0]}">`, source: "the language you chose in Setup" }] : [];
    else if (f.id === "viewport") ready = [{ kind: "code", label: "Mobile setting (in the page's <head>)", text: '<meta name="viewport" content="width=device-width, initial-scale=1">', source: "the standard mobile setting" }];
    else if (f.id === "links-resolve") ready = (site.brokenLinks ?? []).slice(0, 10).map((b) => ({ kind: "list", label: "Broken link", text: `On ${b.from}: ${b.to} does not open (${b.status || "no answer"}) — change it to an address that opens, or remove it`, source: `the links check, ${day(readOn)}` }));
    else ready = (f.pages ?? []).length ? [{ kind: "list", label: `Pages to fix (all ${fmt((f.pages ?? []).length)})`, text: (f.pages ?? []).join("\n"), source: `the check of ${day(readOn)}` }] : []; // RR-313 C5: every page, not the first 10
    const problem = f.id.startsWith("ai:") ? f.line : FIXES[f.id] ? problemOf(f.id, count, n).replace(/^\d+/, fmt(count)) : f.line;
    out.push(item({ id: f.id, area: f.id.startsWith("ai:") ? "AI answers" : "Website", problem, solution: f.how ?? FIXES[f.id]?.how ?? "", ready, count, of: f.id.startsWith("ai:") ? 1 : n,
      fixForMe: f.fixForMe || ["ai:robots", "ai:structured-data"].includes(f.id) ? "structure" : null,
      note: ready.length ? null : f.id === "https-only" || f.id === "one-h1" || f.id === "image-alt" ? "Nothing to paste — this is a setting or a change on the page itself." : null }));
  }
  if (!site.sitemap?.found && !has.has("sitemap")) out.push(item({ id: "sitemap", area: "Website", problem: "Your site has no sitemap — search engines may miss pages", solution: SOLUTION.sitemap, count: 1, of: 1,
    ready: [{ kind: "file", label: "sitemap.xml", text: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${site.pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${p.url}</loc></url>`).join("\n")}\n</urlset>`, source: `the ${plural(n, "page")} Visibility read on your site, ${day(readOn)}` }] }));
  if (!site.robots?.found) out.push(item({ id: "robots", area: "Website", problem: "Your site has no robots.txt file", solution: SOLUTION.robots, count: 1, of: 1,
    ready: [{ kind: "file", label: "robots.txt", text: `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml`, source: "the robots standard and your site's own address" }] }));
  const noindex = site.pages.filter((p) => p.noindex);
  if (noindex.length) out.push(item({ id: "noindex", area: "Website", problem: `${fmt(noindex.length)} of ${plural(n, "page")} tell search engines not to show them`, solution: SOLUTION.noindex, count: noindex.length, of: n,
    ready: [{ kind: "list", label: "Pages marked noindex", text: noindex.slice(0, 20).map((p) => p.url).join("\n"), source: `the check of ${day(readOn)}` }] }));
  /* the page plan: questions people search that no page of the client's answers yet → the pages Visibility makes */
  const drafts = (pages?.drafts ?? []).filter((d) => d.readyAsDraft);
  if (drafts.length) out.push(item({ id: "new-pages", area: "New pages", problem: `${plural(drafts.length, "question")} people search ${drafts.length === 1 ? "has" : "have"} no page of yours answering ${drafts.length === 1 ? "it" : "them"}`, solution: "Let Visibility make these pages as drafts (answered from your own pages, checked by the five gates), then publish them when you approve.", count: drafts.length, of: Math.max(drafts.length, 5), fixForMe: "create-pages",
    /* RR-318 B5 (owner: the NZ page's description came from an unrelated page): a new page's description is WRITTEN from its own question and
     * its own official answer — never another page's sentence */
    ready: drafts.flatMap((d) => { const row = (pages.plan ?? []).find((x) => x.question === d.title); const src = row?.demand?.source ?? "the searches Visibility found"; const m = newPageDescription(d.title, row?.answers ?? [], siteNameOf(site)); return [{ kind: "title", label: "New page title", text: d.title, for: d.url, source: src }, ...(m ? [{ kind: "meta description", label: "Its meta description", text: m, for: d.url, source: `written from the page's question and its answer's source${row?.answers?.find((a) => a.official) ? ` (${row.answers.find((a) => a.official).body})` : ""}` }] : [])]; }) }));
  const sections = (pages?.plan ?? []).filter((x) => x.kind === "SECTION" && x.answers?.length);
  if (sections.length) out.push(item({ id: "sections", area: "Your pages", problem: `${plural(sections.length, "question")} people search could be answered on a page you already have`, solution: "Add the question as a heading on that page, with the answer right under it.", count: sections.length, of: Math.max(sections.length, 5),
    ready: sections.slice(0, 5).map((x) => ({ kind: "FAQ answer", label: `Add to ${x.into}`, text: `${x.question}\n${x.answers[0].text}`, for: x.into, source: `question: ${x.demand?.source ?? "search data"} · answer: your page ${x.answers[0].link}` })) }));
  return out;
}
/* FAQ answers: a question people search, with the answer already written on the client's own pages (its sentence, its page) */
function faqReady(pages) {
  return (pages?.plan ?? []).filter((x) => x.answers?.length && x.kind !== "REFUSED").slice(0, 5).map((x) => ({ kind: "FAQ answer", label: "Question and answer", text: `${x.question}\n${x.answers[0].text}`, source: `question: ${x.demand?.source ?? "search data"} · answer: your page ${x.answers[0].link}` }));
}

/* ── keywords, grouped by their shared main word; each with its source and how often it is searched or shown, when known ── */
const VOLUME = (k) => (k.searched ?? null);
export function keywordGroups(found, casing = new Map()) {
  const all = [...(found?.phrases ?? []).map((p) => ({ ...p, kind: "phrase" })), ...(found?.questions ?? []).map((q) => ({ ...q, kind: "question" }))];
  const uniq = [...new Map(all.map((k) => [k.text.toLowerCase(), k])).values()];
  const df = new Map(); for (const k of uniq) for (const w of new Set(tokens(k.text))) df.set(w, (df.get(w) ?? 0) + 1);
  const groups = new Map();
  for (const k of uniq) {
    const head = [...new Set(tokens(k.text))].filter((w) => w.length >= 2 && df.get(w) >= 2).sort((a, b) => df.get(b) - df.get(a) || a.localeCompare(b))[0] ?? null;
    const named = head ? casing.get(head) ?? properNames(head) : null; // the site's own spelling (GPhC, AVBC), then known names (OET, Denmark)
    const g = !head ? "Other" : named !== head ? named : !/[aeiouy]/.test(head) ? head.toUpperCase() : head.charAt(0).toUpperCase() + head.slice(1); // "bc", "nz" are short names
    groups.set(g, [...(groups.get(g) ?? []), { text: k.text, kind: k.kind, source: k.source, on: k.on ?? null, searched: VOLUME(k) }]);
  }
  return [...groups.entries()].sort((a, b) => (a[0] === "Other") - (b[0] === "Other") || b[1].length - a[1].length).map(([topic, items]) => ({ topic, items: items.slice(0, 25) }));
}

/** THE ACTION PLAN. `youtube` = the YouTube advice (READY) or null; `pages` = the page plan (seoPages) or null; `found` = foundInfo. */
export function actionPlan({ product = {}, on, card = null, site = null, pages = null, found = null, youtube = null, languages = [], youtubeOnly = false }) {
  const items = [...(youtubeOnly ? [] : websiteItems({ card, site, pages, languages })), ...youtubeItems(youtube)].sort((a, b) => b.effect - a.effect);
  const existing = [
    ...items.filter((i) => i.id === "title").flatMap((i) => i.ready.map((r) => ({ ...r, area: "Your pages" }))),
    ...(youtube?.top ?? []).filter((v) => v.options?.length).map((v) => ({ kind: "title", label: "Video title", text: v.options[0].title, for: `"${v.title}"`, source: v.options[0].basedOn.join(" · "), area: "Your videos" })),
  ];
  const fresh = [...(pages?.drafts ?? []).filter((d) => d.readyAsDraft).map((d) => ({ kind: "title", label: "New page", text: d.title, source: (pages.plan ?? []).find((x) => x.question === d.title)?.demand?.source ?? "the searches Visibility found", area: "New pages" })),
    ...(youtube?.ideas ?? []).map((i) => ({ kind: "title", label: "New video", text: i.title, source: i.why, area: "New videos" }))];
  const make = [
    ...(pages?.drafts ?? []).filter((d) => d.readyAsDraft).map((d) => { const row = (pages.plan ?? []).find((x) => x.question === d.title); return { kind: "ARTICLE", title: d.title, answers: [d.title, ...(row?.alsoAsked ?? [])], source: row?.demand?.source ?? null, state: "Visibility can make it now (answered from your pages)" }; }),
    ...(pages?.plan ?? []).filter((x) => x.kind === "REFUSED").slice(0, 10).map((x) => ({ kind: "ARTICLE", title: x.question, answers: [x.question, ...(x.alsoAsked ?? [])], source: x.demand?.source ?? null, state: "Needs your answer first — write it on your site, then Visibility makes the page" })),
    ...(youtube?.ideas ?? []).map((i) => ({ kind: "VIDEO", title: i.title, answers: i.question ? [i.question] : [], source: i.why, state: "A video for you to make" })),
  ];
  return Object.freeze({ product: product.name ?? null, on, honest: HONEST, order: EFFECT_RULE, youtubeOnly,
    thisWeek: items.slice(0, 5), rest: items.slice(5), keywords: keywordGroups(found, site?.ok ? casingOf(site) : new Map()), titles: { existing, new: fresh }, make,
    social: (youtube?.top ?? []).slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 3).map((v) => socialFromVideo(v, youtube.confirmed)) });
}

/** B6 · social posts from a video — only the video's own words (its title, its own first line), its link and its ready hashtags */
export function socialFromVideo(v, channel = {}) {
  const url = `https://www.youtube.com/watch?v=${v.videoId}`, tags = v.options?.[0]?.hashtags?.join(" ") ?? "";
  const line = v.firstLine ? `\n\n${v.firstLine}` : "";
  return { video: v.title, url, from: `the video's own title${v.firstLine ? " and the first line of its description" : ""}, ${v.publishedAt}`, posts: [
    { network: "Facebook", text: `${v.title}${line}\n\nWatch it here: ${url}${tags ? `\n\n${tags}` : ""}` },
    { network: "LinkedIn", text: `New on ${channel?.title ?? "our channel"}: ${v.title}${line}\n\n${url}` },
  ] };
}

/**
 * D · "WHAT I WILL DO FOR YOU": the five things, each with its state now and its "Do it for me". `state` = { mode, connected, almiworld,
 * drafts, live (records), submitted (url → { google, bing }), canSubmitGoogle, indexNowReady, weekly }.
 */
/**
 * RR-313 C3 (owner: "never paste the product's raw name into a sentence; use the subject"). The subject comes from the client's own words
 * for what the product does ("AlmiWorld (almiworld.com) — a family of online products …" → "AlmiWorld's products"): the name it opens
 * with, as the client wrote it; "'s products" when it is a family of products or tools. Without such a name: "your product".
 */
export function subjectOf({ what = "", name = "" } = {}) {
  /* a name written as a name (every word capitalised, "Fixture Prep") is the subject when the description opens with none; a raw, lower-case
   * label ("almiworld youtube") never is */
  const proper = /^\s*\p{Lu}[\p{L}\p{N}&'-]*(\s+\p{Lu}[\p{L}\p{N}&'-]*){0,3}\s*$/u.test(String(name)) ? String(name).trim() : null;
  /* a NAME opens the description only when it is set apart ("AlmiWorld (almiworld.com) —", "Dhanak Ki Duniya is …") — an ordinary first
   * word ("Online practice for …") is not one */
  const brand = /^\s*((?:\p{Lu}[\p{L}\p{N}&'-]*)(?:\s+\p{Lu}[\p{L}\p{N}&'-]*){0,3})(?=\s*(?:\(|—|–|-\s|:|,|\s(?:is|are)\b))/u.exec(String(what))?.[1] ?? null;
  if (!brand) return proper ?? "your product";
  return /\b(family of|range of|suite of|set of)\b|\b(products|tools|apps|services|courses)\b/i.test(String(what).slice(0, 200)) ? `${brand}'s products` : brand;
}
export function willDo(plan, state) {
  const { mode = "AUTO_AFTER_GATES", connected = false, almiworld = false, drafts = [], live = [], submitted = {}, canSubmitGoogle = false, indexNowReady = false, weekly = null, product = "your product" } = state;
  const plain = almiworld ? "AlmiWorld's own product: this is the plan only — nothing is published or submitted from here (owner's rule)." : null;
  const weeklyLine = weekly?.on === false ? "Weekly check: off." : `Last done: ${weekly?.last ? day(weekly.last) : "not yet"} · next check: ${weekly?.next ? day(weekly.next) : "a week after the first check"}.`;
  if (plan?.youtubeOnly) {
    const withText = plan.titles.existing.filter((x) => x.area === "Your videos").length, ideas = plan.make.filter((x) => x.kind === "VIDEO").length;
    return { honest: HONEST, plain, weeklyLine, lines: [
      { n: 1, action: "youtube", text: `Write ready titles, descriptions, hashtags and chapter lists for your ${withText || 20} most-viewed and newest videos. You paste them in YouTube Studio — YouTube lets only you change your videos.`, status: withText ? `${withText} videos have ready text` : "Open the YouTube tab" },
      { n: 2, action: "youtube", text: `Suggest ${ideas || "new"} video${ideas === 1 ? "" : "s"} with ready titles, from what your niche watches and what viewers ask.`, status: ideas ? `${ideas} idea${ideas === 1 ? "" : "s"} ready` : "Run the niche research in the YouTube tab" },
      { n: 3, action: "social", text: "Write Facebook and LinkedIn posts from your newest videos, with their own words and links.", status: plan.social.length ? `${plan.social.length} videos ready to post` : "No video yet" },
      { n: 4, action: "weekly", text: "Check your channel again every week and update this plan.", status: weeklyLine },
    ], more: "Have a website too? Then Visibility also creates pages, publishes them when you approve, and submits them to Google and Bing." };
  }
  const ready = drafts.filter((d) => d.readyAsDraft), planned = plan?.titles?.new?.filter((x) => x.area === "New pages") ?? [];
  const sub = Object.values(submitted), subG = sub.filter((x) => x.google?.state === "SUBMITTED").length, subB = sub.filter((x) => x.bing?.state === "SUBMITTED").length;
  return { honest: HONEST, plain, weeklyLine, lines: [
    { n: 1, action: "create-pages", text: `Create ${planned.length ? `these ${planned.length} page${planned.length === 1 ? "" : "s"}` : "new pages"}, answering the questions people ask about ${product}.`, titles: planned.map((x) => x.text), status: ready.length ? `${ready.length} draft${ready.length === 1 ? "" : "s"} made` : planned.length ? "Not made yet" : "Not made yet — press Create SEO pages: AlmiWorld's own search data is used first, then your Search Console and files" },
    { n: 2, action: "structure", text: "Add the structure Google and AI assistants read — titles, descriptions, FAQ, facts with their sources. New pages have it built in; for your existing pages Visibility writes it ready to paste.", status: `${plural((plan?.thisWeek ?? []).concat(plan?.rest ?? []).filter((i) => i.fixForMe === "structure").length, "thing")} ready to paste` },
    { n: 3, action: "publish", text: mode === "REVIEW_FIRST" ? "Publish them on your site when you approve each one." : "Publish them on your site automatically, after the five checks pass (your choice in Setup).", status: almiworld ? "Not for AlmiWorld's own products" : !connected ? "Your site is not connected yet" : `${live.length} published` },
    { n: 4, action: "submit", text: "Submit them to Google (through your Search Console) and to Bing (IndexNow), which AI search assistants like ChatGPT search and Copilot also use.", status: almiworld ? "Not for AlmiWorld's own products" : !live.length ? "Nothing published to submit yet" : `Google: ${subG} of ${live.length} · Bing: ${subB} of ${live.length}${!canSubmitGoogle ? " · connect Google with \"also tell Google about my new pages\"" : ""}${!indexNowReady ? " · set up your IndexNow key file" : ""}` },
    { n: 5, action: "weekly", text: "Check again every week and fix what changes.", status: weeklyLine },
  ] };
}

/** the Action plan as a document the client keeps (opens in a browser or in Word) */
export function planDocument(plan, will) {
  const e = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const readyHtml = (r) => `<div class="r"><b>${e(r.label)}</b>${r.for ? ` <span class="m">for ${e(r.for)}</span>` : ""}<pre>${e(r.text)}</pre><div class="m">From: ${e(r.source)}</div></div>`;
  const itemHtml = (i, k) => `<div class="i"><h3>${k + 1}. ${e(i.area)}</h3><p><b>Problem:</b> ${e(i.problem)}</p><p><b>Solution:</b> ${e(i.solution)}</p>${i.ready.length ? `<p><b>Ready to use:</b></p>${i.ready.map(readyHtml).join("")}` : ""}${i.note ? `<p class="m">${e(i.note)}</p>` : ""}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Action plan — ${e(plan.product)} — ${e(day(plan.on))}</title>
<style>body{font:15px/1.5 Segoe UI,system-ui,sans-serif;max-width:860px;margin:30px auto;padding:0 16px;color:#2b2420}h1{margin:0}h2{margin-top:28px;border-bottom:2px solid #f0d9c4}pre{white-space:pre-wrap;background:#fff7ef;border:1px solid #f0d9c4;padding:8px;border-radius:6px;font:14px Consolas,monospace}.m{color:#7a6d63;font-size:13px}.i{margin:14px 0;padding:10px 14px;border:1px solid #eadfd3;border-radius:8px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #eadfd3;padding:4px 8px;text-align:left;vertical-align:top}</style></head><body>
<h1>Action plan — ${e(plan.product)}</h1><p class="m">Made by AlmiVisibility on ${e(day(plan.on))}. ${e(plan.honest)}</p>
${will ? `<h2>What I will do for you</h2>${will.plain ? `<p><b>${e(will.plain)}</b></p>` : ""}<ol>${will.lines.map((l) => `<li>${e(l.text)}${l.titles?.length ? `<ul>${l.titles.map((t) => `<li>${e(t)}</li>`).join("")}</ul>` : ""}<div class="m">Now: ${e(l.status)}</div></li>`).join("")}</ol>${will.more ? `<p>${e(will.more)}</p>` : ""}` : ""}
<h2>This week — the 5 things with the most effect</h2><p class="m">${e(plan.order)}</p>${plan.thisWeek.map(itemHtml).join("") || "<p>Nothing to fix was found.</p>"}
<h2>Keywords to use</h2>${plan.keywords.length ? plan.keywords.map((g) => `<h3>${e(g.topic)}</h3><table><tr><th>Keyword or question</th><th>How often (when known)</th><th>From</th></tr>${g.items.map((k) => `<tr><td>${e(k.text)}</td><td>${e(k.searched ?? "not known")}</td><td>${e(k.source)}${k.on ? `, ${e(k.on)}` : ""}</td></tr>`).join("")}</table>`).join("") : "<p>None found yet — connect Search Console, add a search-data file, or run the YouTube niche research.</p>"}
<h2>Titles</h2><h3>For what you already have</h3>${plan.titles.existing.map(readyHtml).join("") || "<p>None needed.</p>"}<h3>For new pages and videos</h3>${plan.titles.new.map(readyHtml).join("") || "<p>None yet.</p>"}
<h2>Articles and new videos to make</h2>${plan.make.length ? `<ol>${plan.make.map((m) => `<li><b>${e(m.title)}</b> <span class="m">(${m.kind === "VIDEO" ? "video" : "article"} — ${e(m.state)})</span>${m.answers.length ? `<div>Answers: ${e(m.answers.join(" · "))}</div>` : ""}${m.source ? `<div class="m">From: ${e(m.source)}</div>` : ""}</li>`).join("")}</ol>` : "<p>None yet.</p>"}
<h2>Then the rest, in order of effect</h2>${plan.rest.map((i, k) => itemHtml(i, k + 5)).join("") || "<p>Nothing more.</p>"}
</body></html>`;
}
