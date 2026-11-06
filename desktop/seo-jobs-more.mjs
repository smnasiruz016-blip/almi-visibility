/**
 * 🔴 RR-381 (owner, 6 Nov 2026: "ALL SEO, wave 2") · NINE MORE JOBS, one plain screen each, the same shape as RR-379's six (seo-jobs.mjs):
 * Reviews and reputation, Images, Video, Pinterest, Podcasts, Brand facts (entity / knowledge panel), News and Discover, Backlinks, and
 * Shop and marketplaces. Generic: the product's own name, site and data are handed in. Money: AI work is Sonnet inside the client's Monthly AI
 * limit (its own route per job); search data is the client's own DataForSEO account inside its caps (its own line per job); Wikidata, Apple's
 * Search API, OpenStreetMap-style open data and the client's own feeds are free. Nothing is posted, sent or published anywhere: the client
 * copies, approves and sends himself.
 */
import { MORE, RULES, ADVICE, trustpilotDomain, tripadvisorPath, businessReviewRows, businessSummary, pastedReviews, reputation, reputationPoint, requestTexts, reviewWidget,
  imagesOf, imageLines, imageSitemap, imageObjectLd, altFromImage, videosOf, videoLines, vttCues, CHAPTER_SYSTEM, CHAPTER_SCHEMA, chapterFaults, chapterText, videoObjectLd, videoSitemap, videoRowsOf,
  PIN_SYSTEM, PIN_SCHEMA, pinFaults, feedOf, podcastLines, podcastEpisodeLd, appleShowOf, siteEntity, wikidataSearchUrl, wikidataEntityUrl, wikidataMatch, entityLines, organizationLd,
  articleOf, newsLines, newsSitemap, BACKLINKS, backlinkTask, summaryOf, linkGroups, linkIdeas, scLinkingSites, compareSites, bingLinkRows, disavowText, OUTREACH_SYSTEM, OUTREACH_SCHEMA, outreachFaults,
  feedRows, feedLines, productPageLines, amazonAsin, amazonListingOf, amazonRank, etsyListingOf, listingLines, LISTING_SYSTEM, LISTING_SCHEMA, listingFaults, kindLine } from "./seo-more.mjs";
import { groupReviews, draftReplies } from "./aso.mjs";
import { merchantIssues } from "./google-connect.mjs"; // RR-382 item 1b
import { countryName } from "./rank-track.mjs";

export const MORE_IDS = Object.freeze(["reviews", "image", "video", "pinterest", "podcast", "entity", "news", "backlinks", "shop"]);
export const MORE_BUDGET = Object.freeze({ reviews: 0.3, backlinks: 0.3, shop: 0.2 });
/** the most each paid task can cost, counted before it is sent (DataForSEO's own reported price is what is booked) */
export const MORE_WORST = Object.freeze({ reviewsTask: 0.01, backlinksLive: BACKLINKS.worst, merchantTask: 0.01, altImage: 0.01, aiSmall: 0.03 });
export const MORE_JOBS = Object.freeze({
  reviews: { title: "Reviews and reputation", does: "Reads your reviews from Google, Trustpilot, Tripadvisor, the app stores and any you paste, and gives one score and its trend.", youGet: "One score across every source, review groups, reply drafts for your approval, review-request texts (email, SMS, in-store) and a review box for your site.", time: "A few minutes. Reviews use your search-data account (cents); replies use your AI." },
  image: { title: "Images", does: "Checks your images' alt text, file names, size and format, and makes an image sitemap.", youGet: "Each image problem with its fix, alt text written by AI from the image itself, an image sitemap and ImageObject markup.", time: "A minute. Free; alt text uses your AI (about a cent an image)." },
  video: { title: "Video", does: "Checks the videos on your own site: VideoObject markup, a video sitemap, transcripts and chapters.", youGet: "Each video problem with its fix, chapters from your captions, VideoObject markup and a video sitemap to copy.", time: "A minute. Free; chapters use your AI (about 2 cents)." },
  pinterest: { title: "Pinterest", does: "Writes a pin for each of your pages: title, description, board and image alt text, with the words people search.", youGet: "Ready pin text for each page; you post it, or connect Pinterest yourself.", time: "A minute. Writing uses your AI (about 3 cents)." },
  podcast: { title: "Podcasts", does: "Reads your podcast's feed, checks the show and every episode, and checks your Apple Podcasts and Spotify links.", youGet: "Each problem with its fix, PodcastEpisode markup per episode, and whether Apple Podcasts lists you.", time: "A minute. Free." },
  entity: { title: "Brand facts (knowledge panel)", does: "Checks that search engines can tell who you are: your markup, your profiles (sameAs) and your Wikidata item, with the same facts everywhere.", youGet: "Each gap with its fix, Organization markup to copy, and what Wikidata needs (never a fact you cannot source).", time: "A minute. Free (Wikidata's own service)." },
  news: { title: "News and Discover", does: "Checks your articles for Google News and Discover: article markup, author and date, large images, honest titles.", youGet: "Each problem with its fix and a news sitemap (articles of the last two days).", time: "A minute. Free." },
  backlinks: { title: "Backlinks", does: "Finds the sites that link to you: new, lost and suspicious links, and sites that link to your competitors but not to you.", youGet: "Your links with what changed, a disavow file only if you need one, link ideas and outreach emails you send yourself.", time: "A minute. Links data uses your search-data account (about 4 cents a check); Search Console and Bing are free." } /* RR-361 ruling 3: an outside client's cards never name a data source (CI caught it) */,
  shop: { title: "Shop and marketplaces", does: "Checks your Google Merchant Center feed, your product pages' markup and your Amazon, Etsy or eBay listing.", youGet: "Each feed and markup problem with its fix, where your Amazon product stands, and a better listing written from your own listing.", time: "A minute. Amazon data uses your search-data account (about a cent); writing uses your AI." },
});
/** the formats the AI reads (Anthropic: JPEG, PNG, GIF, WebP); a Next.js /_next/image address carries the real file in its url= */
export const AI_READS = (i) => { let f = i.file ?? ""; try { const u = new URL(i.src); if (/\/_next\/image$/.test(u.pathname) && u.searchParams.get("url")) f = decodeURIComponent(u.searchParams.get("url")); } catch { /* the file name stands */ } const ext = (/\.([a-z0-9]{2,5})(?:$|\?)/i.exec(f)?.[1] ?? i.ext ?? "").toLowerCase(); return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) || (!ext && !/\.svg/i.test(i.src)); };
const AMAZON = Object.freeze({ us: ["United States", "en_US"], gb: ["United Kingdom", "en_GB"], ca: ["Canada", "en_CA"], au: ["Australia", "en_AU"], in: ["India", "en_IN"], de: ["Germany", "de_DE"], ae: ["United Arab Emirates", "en_AE"] });

/** c: the shared parts of seo-jobs.mjs { d, load, keep, buyer, getJson, getHtml, aiArgs, today, now, pace, moneyLine, fetchImpl, pageOf, clean, hostOf, listOf, $ } */
export function moreJobs(c) {
  const { d, load, keep, buyer, getJson, getHtml, aiArgs, today, now, pace, moneyLine, fetchImpl, pageOf, clean, hostOf, listOf, $ } = c;
  const site = (id) => d.productOf(id)?.site ?? null, brand = (id) => d.productOf(id)?.name ?? "";
  /* RR-381 proof: britishmuseum.org answered 403 to every read; the client is told the site turns readers away, not only "could not be opened" */
  let lastClosed = "";
  const statusWhy = async (u) => { let s = null; try { s = (await fetchImpl(u, { method: "GET", headers: { "user-agent": "AlmiVisibility" }, signal: AbortSignal.timeout(20000) })).status; } catch { s = null; } return s === 401 || s === 403 || s === 429 ? `${u} answered ${s}: the site turns automatic readers away (often a bot shield). Ask your host to allow AlmiVisibility, or check pages from a site that opens.` : s ? `${u} answered ${s}.` : `${u} did not answer.`; };
  const closedWhy = () => (lastClosed ? `No page could be opened: ${lastClosed}` : "No page could be opened.");
  const pagesFor = async (id, input, max = 8) => { const urls = [...new Set([...listOf(input.pages), ...(listOf(input.pages).length ? [] : [site(id), ...(d.sitePages(id) ?? [])])].filter(Boolean))].slice(0, max), out = []; for (const u of urls) { const h = await getHtml(u); if (h) out.push(pageOf(u, h)); await pace(d.pageMs ?? 500); } lastClosed = !out.length && urls.length ? await statusWhy(urls[0]) : ""; return out; };
  const open = async (u) => { try { const r = await fetchImpl(u, { method: "GET", redirect: "follow", headers: { "user-agent": "AlmiVisibility" }, signal: AbortSignal.timeout(20000) }); return r.status < 400 ? true : [401, 403, 429, 999].includes(r.status) ? null /* refused, not broken */ : false; } catch { return false; } };
  const bytes = async (u) => { try { const r = await fetchImpl(u, { method: "HEAD", headers: { "user-agent": "AlmiVisibility" }, signal: AbortSignal.timeout(15000) }); return Number(r.headers?.get?.("content-length")) || null; } catch { return null; } };
  const ask = async (route, args) => { const a = aiArgs(route); if (!a.key) return { fail: "Connect your AI first (Settings → Your AI connection)." }; if (!a.allowed(MORE_WORST.aiSmall)) return { fail: "Your Monthly AI limit has too little left for this." }; const r = await a.ask({ key: a.key, model: MORE.model, maxTokens: 3000, ...args }); if (r.usage) a.onUsage(r.usage); return r.data ? { data: r.data } : { fail: r.fail ?? "Your AI gave no answer." }; };
  const readyOf = (label, text, source) => ({ label, text, source });

  /* ───────────── REVIEWS AND REPUTATION ───────────── */
  async function reviewsSave(id, input) { const x = load(id, "reviews"); x.setup = { ...(x.setup ?? {}), ...Object.fromEntries(["name", "city", "country", "trustpilot", "tripadvisor", "link"].filter((k) => input[k] != null).map((k) => [k, clean(input[k])])) }; if (input.pasted != null) x.pasted = String(input.pasted); keep(id, "reviews", x); return { ok: true, line: "Saved." }; }
  async function reviewsRead(id, input, { fresh = false } = {}) {
    await reviewsSave(id, input); const x = load(id, "reviews"), s = x.setup ?? {}, name = s.name || brand(id), local = load(id, "local"), b = buyer("reviews"), sources = [], said = [];
    if (!name) return { refused: "Give your business's name." };
    const loc = countryName((s.country || local.profile?.country || "us").slice(0, 2).toLowerCase()) ?? "United States";
    const cid = local.nap?.google?.cid ?? null, gTask = cid ? { cid, location_name: loc, language_code: "en", depth: 40, sort_by: "newest" } : s.city ? { keyword: `${name} ${s.city}`, location_name: loc, language_code: "en", depth: 40, sort_by: "newest" } : null;
    if (gTask) { const r = await b.queued("/business_data/google/reviews", gTask, { worst: MORE_WORST.reviewsTask * 2, what: `Google reviews of ${name}`, getPath: "/task_get/", fresh }); if (r.ok) sources.push({ source: "Google", rows: businessReviewRows(r.result), summary: businessSummary(r.result), on: today(now) }); else said.push(`Google: ${r.why}`); } else said.push("Google: give your city (or run Local SEO's check first) to find your Google listing.");
    const tp = trustpilotDomain(s.trustpilot); if (tp) { const r = await b.queued("/business_data/trustpilot/reviews", { domain: tp, depth: 40, sort_by: "recency" }, { worst: MORE_WORST.reviewsTask * 2, what: `Trustpilot reviews of ${tp}`, getPath: "/task_get/", fresh }); if (r.ok) sources.push({ source: "Trustpilot", rows: businessReviewRows(r.result), summary: businessSummary(r.result), on: today(now) }); else said.push(`Trustpilot: ${r.why}`); } else if (s.trustpilot) said.push("Trustpilot: that is not a Trustpilot link or domain.");
    const ta = tripadvisorPath(s.tripadvisor); if (ta) { const r = await b.queued("/business_data/tripadvisor/reviews", { url_path: ta, depth: 40 }, { worst: MORE_WORST.reviewsTask * 2, what: `Tripadvisor reviews of ${name}`, getPath: "/task_get/", fresh }); if (r.ok) sources.push({ source: "Tripadvisor", rows: businessReviewRows(r.result), summary: businessSummary(r.result), on: today(now) }); else said.push(`Tripadvisor: ${r.why}`); } else if (s.tripadvisor) said.push("Tripadvisor: give the page address of your listing (…_Review-g…-d…).");
    const aso = load(id, "aso"); for (const a of Object.values(aso.apps ?? {})) if (a.reviews?.count) sources.push({ source: `${a.listing?.title ?? a.id} (app store)`, rows: [], summary: { rating: a.listing?.rating ?? a.reviews.average, total: a.listing?.ratings ?? a.reviews.count }, on: a.reviews.on });
    const pasted = pastedReviews(x.pasted); for (const [src, rows] of Object.entries(pasted.reduce((m, r) => ((m[r.source] ??= []).push(r), m), {}))) sources.push({ source: src === "pasted" ? "Reviews you pasted" : `${src} (pasted)`, rows, summary: null, on: today(now) });
    if (!sources.length) return { refused: `No reviews could be read. ${said.join(" ")}` };
    const rep = reputation(sources), rows = sources.flatMap((s0) => s0.rows.map((r) => ({ ...r, source: s0.source }))), g = groupReviews(rows);
    x.read = { on: today(now), score: rep.score, count: rep.count, bySource: rep.bySource, unanswered: rep.unanswered, counts: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.length])), samples: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.slice(0, 3).map((y) => ({ stars: y.stars, text: y.text.slice(0, 300), source: y.source }))])), said };
    x.rows = rows.filter((r) => !r.answered).slice(0, 60).map((r) => ({ id: r.id, stars: r.stars, text: r.text.slice(0, 800), source: r.source, answered: false }));
    x.history = reputationPoint(x.history, { on: today(now), score: rep.score, count: rep.count });
    /* 🔴 RR-382 item 1a: a NEW 1–2 star review on a connected source (Google, Trustpilot, Tripadvisor; never a pasted one) is an alert with a reply
     * draft ready. The first read only learns what is already there (no flood of old reviews) */
    const connected = rows.filter((r) => r.id && !/pasted/i.test(r.source)), seenKey = (r) => `${r.source}|${r.id}`, first = !Array.isArray(x.seen), seen = new Set(x.seen ?? []);
    const newBad = first ? [] : connected.filter((r) => r.stars != null && r.stars <= 2 && !seen.has(seenKey(r)));
    x.seen = [...new Set([...(x.seen ?? []), ...connected.map(seenKey)])].slice(-5000);
    if (newBad.length) { const a = aiArgs("reviews"), rep2 = a.key ? await draftReplies(newBad.map((r) => ({ ...r, answered: false })), { ...a, appName: name, max: 10 }) : { replies: [] }, by = new Map((rep2.replies ?? []).map((y) => [y.id, y.reply]));
      x.alerts = [...(x.alerts ?? []), ...newBad.map((r) => ({ key: seenKey(r), source: r.source, stars: r.stars, text: r.text.slice(0, 500), on: today(now), written: r.on ?? null, reply: by.get(r.id) ?? null }))].slice(-50); }
    keep(id, "reviews", x);
    return { ok: true, alerts: newBad.map((r) => ({ source: r.source, stars: r.stars })), line: `Score ${rep.score ?? "–"} ★ across ${rep.count} reviews from ${rep.bySource.length} source${rep.bySource.length === 1 ? "" : "s"}; ${rep.unanswered} low reviews have no answer.${newBad.length ? ` ${newBad.length} NEW bad review${newBad.length === 1 ? "" : "s"} since the last read.` : ""}${said.length ? ` Not read: ${said.join(" ")}` : ""}` };
  }
  /** the daily watch (the app's hourly round, while it is open): each product whose reviews were read before is read again once a day → the new alerts */
  async function reviewsDue(id) { const x = load(id, "reviews"); if (!x.read?.on || x.watch === false) return null; if ((Date.parse(today(now)) - Date.parse(x.read.on)) / 864e5 < 1) return null; const r = await reviewsRead(id, {}, { fresh: true }); return r.alerts ?? []; }
  async function reviewsSeen(id) { const x = load(id, "reviews"), n = (x.alerts ?? []).length; x.alerts = []; keep(id, "reviews", x); return { ok: true, line: n ? `${n} alert${n === 1 ? "" : "s"} put away.` : "No alert was waiting." }; }
  async function reviewsWatch(id, input) { const x = load(id, "reviews"); x.watch = !(String(input.watch ?? "").toLowerCase() === "off"); keep(id, "reviews", x); return { ok: true, line: x.watch ? "Visibility reads your reviews once a day while it is open and warns you of a new 1–2 star review." : "The daily review watch is off." }; }
  async function reviewsReplies(id) {
    const x = load(id, "reviews"); if (!x.rows?.length) return { refused: "Press Read my reviews first." }; const a = aiArgs("reviews"); if (!a.key) return { refused: "Connect your AI first (Settings → Your AI connection)." };
    const r = await draftReplies(x.rows, { ...a, appName: x.setup?.name || brand(id), max: 10 }); if (!r.ok) return { refused: r.why };
    x.replies = r.replies.map((y) => ({ ...y, source: x.rows.find((z) => z.id === y.id)?.source ?? "" })); keep(id, "reviews", x); return { ok: true, line: `${x.replies.length} reply drafts wait for your approval.` };
  }
  function reviewsView(id) {
    const x = load(id, "reviews"), s = x.setup ?? {}, v = x.read, sections = [], name = s.name || brand(id);
    if (x.alerts?.length) sections.push({ title: `⚠ ${x.alerts.length} new bad review${x.alerts.length === 1 ? "" : "s"}`, read: "Found by the daily watch. Answer politely where the review is; press I have seen these when done.", lines: x.alerts.map((a) => ({ ok: false, line: `${a.stars}★ on ${a.source} (found ${a.on}): "${a.text}"`, problem: `A ${a.stars}-star review on ${a.source}.`, solution: a.reply ? "A reply draft is ready below: approve it, then post it where the review is." : "Write a short, polite reply where the review is.", ready: [] })), ready: x.alerts.filter((a) => a.reply).map((a) => ({ label: `Reply to the ${a.stars}★ review on ${a.source}`, text: a.reply, source: "draft by your AI — approve before you post it", for: a.text.slice(0, 80) })) });
    if (v) {
      sections.push({ title: `Reputation: ${v.score ?? "–"} ★ from ${v.count} reviews (${v.on})`, read: "Each source's own average and total where it gives them; your reviews read are counted where it does not. What people write is theirs: Visibility never changes or hides a review.", table: { cols: ["Source", "Average", "Reviews", "Read now", "Low ones without an answer", "Read on"], rows: v.bySource.map((b) => [b.source, b.average ?? "–", b.count, b.read, b.unanswered, b.on ?? ""]) }, note: v.said?.length ? `Not read: ${v.said.join(" ")}` : null });
      if ((x.history?.points ?? []).length > 1) sections.push({ title: "Trend (one point a month)", chart: { series: [{ name: "Average stars", points: x.history.points.map((p) => ({ on: p.on, rank: p.score })) }], invert: false } });
      sections.push({ title: "What people write about", read: `Problems ${v.counts.bugs}, prices ${v.counts.prices}, wishes ${v.counts.features}, praise ${v.counts.praise}, other ${v.counts.other}.`, lines: Object.entries(v.samples).flatMap(([k, rs]) => rs.slice(0, 2).map((r) => ({ ok: null, line: `${k} (${r.source}): ${r.stars ?? "–"}★ "${r.text}"` }))) });
    }
    if (x.replies?.length) sections.push({ title: "Reply drafts (approve, then post them where the review is)", ready: x.replies.map((r) => ({ label: `Reply to a ${r.stars ?? "–"}★ review on ${r.source}`, text: r.reply, source: "draft by your AI — approve before you post it", for: r.text.slice(0, 80) })) });
    if (name) sections.push({ title: "Ask for reviews", read: `Ask every customer, never only the happy ones, and offer nothing in return (${RULES.reviewsPolicy.name}: ${RULES.reviewsPolicy.url}).`, ready: requestTexts({ name, link: s.link }) });
    if (v) sections.push({ title: "A review box for your site", read: "Shows your numbers as read today, with the date. It carries no review markup: Google does not show star ratings a business gives about itself.", ready: [readyOf("HTML for your site", reviewWidget({ name, score: v.score, count: v.count, bySource: v.bySource, on: v.on }), "your reviews as read by Visibility")] });
    return { job: "reviews", ...MORE_JOBS.reviews, money: moneyLine("reviews"),
      fields: [{ name: "name", label: "Business name", value: name }, { name: "city", label: "City (to find your Google listing)", value: s.city ?? load(id, "local").profile?.city ?? "" }, { name: "country", label: "Country (2 letters)", value: s.country ?? load(id, "local").profile?.country ?? "" }, { name: "trustpilot", label: "Trustpilot page or domain (optional)", value: s.trustpilot ?? "" }, { name: "tripadvisor", label: "Tripadvisor page (optional)", value: s.tripadvisor ?? "" }, { name: "link", label: "Your review link (for the request texts)", value: s.link ?? "" }, { name: "watch", label: "Daily watch for new bad reviews: on or off", value: x.watch === false ? "off" : "on" }, { name: "pasted", label: "Or paste reviews, one per line: source | stars | text (e.g. Facebook | 5 | …)", value: x.pasted ?? "", kind: "area" }],
      buttons: [{ press: "save", label: "Save", cost: "Free" }, { press: "read", label: "Read my reviews", cost: "About 1–2 cents a source (your search-data account)" }, { press: "replies", label: "Draft replies", cost: "About $0.02 (your AI)" }, { press: "seen", label: "I have seen these", cost: "Free" }, { press: "watch", label: "Save the daily watch", cost: "On: about 1–2 cents a source a day (your search-data account)" }], sections };
  }

  /* ───────────── IMAGES ───────────── */
  async function imageCheck(id, input) {
    const pages = await pagesFor(id, input); if (!pages.length) return { refused: closedWhy() + " Add your website first, or give pages." };
    const images = pages.flatMap(imagesOf).slice(0, 200), sizes = {}; for (const i of images.slice(0, 40)) { const n = await bytes(i.src); if (n) sizes[i.src] = n; }
    const x = load(id, "image"); x.check = { on: today(now), pages: pages.map((p) => p.url), images: images.map((i) => ({ src: i.src, alt: i.alt, file: i.file, page: i.page, title: pages.find((p) => p.url === i.page)?.title ?? "" })), lines: imageLines(images, sizes) }; keep(id, "image", x);
    return { ok: true, line: `${images.length} images on ${pages.length} pages: ${x.check.lines.filter((l) => l.ok === false).length} problems.` };
  }
  async function imageAlt(id) {
    const x = load(id, "image"); if (!x.check) return { refused: "Press Check my images first." }; const a = aiArgs("image"); if (!a.key) return { refused: "Connect your AI first (Settings → Your AI connection)." };
    /* RR-381 proof (Gymshark): every image without alt text was an SVG flag icon, and the AI reads only JPEG, PNG, GIF and WebP: those are named, never sent */
    const missing = x.check.images.filter((i) => i.alt == null), cannot = missing.filter((i) => !AI_READS(i)), want = missing.filter(AI_READS).slice(0, 10), out = []; let stop = null;
    if (!want.length && cannot.length) { x.alts = { on: today(now), rows: [], cannot: cannot.slice(0, 30).map((i) => ({ file: i.file, page: i.page })) }; keep(id, "image", x); return { refused: `The ${cannot.length} images without alt text are ${[...new Set(cannot.map((i) => ((/\.([a-z0-9]{2,5})$/i.exec(i.file ?? "")?.[1]) ?? "unknown").toUpperCase()))].join(", ")} files, which the AI cannot look at. Write their alt text yourself (for an icon, the word it stands for, e.g. the country's name).` }; }
    for (const i of want) { if (!a.allowed(MORE_WORST.altImage)) { stop = "Your Monthly AI limit is reached."; break; } const r = await altFromImage({ key: a.key, imageUrl: i.src, pageTitle: i.title, fetchImpl, ...(d.claudeUrl ? { url: d.claudeUrl } : {}) }); if (r.usage) a.onUsage(r.usage); if (r.fail) { if (r.stop) { stop = r.fail; break; } continue; } out.push({ src: i.src, page: i.page, file: i.file, alt: r.alt, decorative: r.decorative }); }
    x.alts = { on: today(now), rows: out, cannot: cannot.slice(0, 30).map((i) => ({ file: i.file, page: i.page })) }; keep(id, "image", x); return out.length ? { ok: true, line: `${out.length} alt texts written from the images themselves.${cannot.length ? ` ${cannot.length} images (SVG or other formats the AI cannot look at) need yours.` : ""}${stop ? ` Stopped: ${stop}` : ""}` } : { refused: stop ?? (want.length ? "No alt text could be written (the images could not be read)." : "Every image already has alt text.") };
  }
  function imageView(id) {
    const x = load(id, "image"), sections = [];
    if (x.check) { sections.push({ title: `Images (${x.check.images.length}, checked ${x.check.on})`, read: "Alt text, file names, size, format, width and height.", lines: x.check.lines.sort((p, q) => (p.ok === false ? -1 : 0) - (q.ok === false ? -1 : 0)).slice(0, 80) }); sections.push({ title: "Image sitemap", read: `Add it to your site and list it in robots.txt or Search Console (${RULES.imageSitemap.name}: ${RULES.imageSitemap.url}).`, ready: [readyOf("image-sitemap.xml", imageSitemap(x.check.images), "the pages Visibility read")] }); }
    if (x.alts?.rows?.length) sections.push({ title: `Alt text written from each image (${x.alts.on})`, read: "Your AI looked at each image and described only what it shows. Check it, then paste it in your site.", ready: x.alts.rows.map((r) => readyOf(`${r.file} (${r.page})`, r.decorative ? 'alt="" (decorative image)' : r.alt, "your AI, from the image itself")) });
    if (x.check?.images?.length && (clean(x.owner) || clean(x.license))) { const ld = imageObjectLd({ src: x.check.images[0].src, creator: x.owner, license: x.license, acquire: x.acquire }); if (ld) sections.push({ title: "ImageObject markup (your own images)", read: `Only for images you own. Google uses it to show who made the image and its licence (${RULES.imageMeta.url}). Copy it for each image, with that image's address.`, ready: [readyOf("ImageObject (example for your first image)", ld, "the owner and licence you gave")] }); }
    return { job: "image", ...MORE_JOBS.image, money: "Free. Alt text uses your AI (about a cent an image, inside your Monthly AI limit).",
      fields: [{ name: "pages", label: "Pages to check (one per line; your home and main pages otherwise)", value: "", kind: "area" }, { name: "owner", label: "Who owns your images (for ImageObject markup)", value: x.owner ?? "" }, { name: "license", label: "Licence page address (optional)", value: x.license ?? "" }],
      buttons: [{ press: "check", label: "Check my images", cost: "Free" }, { press: "alt", label: "Write alt text with AI", cost: "About a cent an image (your AI)" }, { press: "save", label: "Save owner and licence", cost: "Free" }], sections };
  }
  async function imageSave(id, input) { const x = load(id, "image"); for (const k of ["owner", "license", "acquire"]) if (input[k] != null) x[k] = clean(input[k]); keep(id, "image", x); return { ok: true, line: "Saved." }; }

  /* ───────────── VIDEO ───────────── */
  async function videoCheck(id, input) {
    const pages = await pagesFor(id, input, 10); if (!pages.length) return { refused: closedWhy() + " Add your website first, or give pages." };
    const found = pages.map((p) => ({ p, v: videosOf(p) })).filter((f) => f.v.videos.length || f.v.ld.length);
    const x = load(id, "video"); x.check = { on: today(now), pages: pages.length, withVideo: found.map((f) => f.p.url), lines: found.flatMap((f) => videoLines(f.p, f.v)), rows: videoRowsOf(found.map((f) => f.p)), captions: found.flatMap((f) => f.v.videos.filter((v) => v.captions).map((v) => ({ page: f.p.url, captions: v.captions }))) }; keep(id, "video", x);
    return { ok: true, line: found.length ? `${found.length} of ${pages.length} pages hold videos: ${x.check.lines.filter((l) => l.ok === false).length} problems.` : `No video found on the ${pages.length} pages read (YouTube channels are in the YouTube job).` };
  }
  async function videoChapters(id, input) {
    const x = load(id, "video"); let vtt = String(input.captions ?? "").trim(); const capUrl = /^https?:\/\//.test(vtt) ? vtt : !vtt ? x.check?.captions?.[0]?.captions : null; if (capUrl) vtt = (await getHtml(capUrl)) ?? "";
    const cues = vttCues(vtt); if (cues.length < 3) return { refused: "Give the video's captions: paste the WebVTT text, or its address (a .vtt file). Without captions no transcript or chapters can be made." };
    const r = await ask("video", { system: CHAPTER_SYSTEM, schema: CHAPTER_SCHEMA, body: { cues: cues.slice(0, 600).map((q) => ({ start: q.start, text: q.text })) } }); if (r.fail) return { refused: r.fail };
    const ch = (r.data.chapters ?? []).map((q) => ({ start: q.start, title: clean(q.title) })), faults = chapterFaults(ch, cues); if (faults.length) return { refused: `The chapters written broke a rule (${faults.join("; ")}); nothing is offered.` };
    x.chapters = { on: today(now), page: clean(input.page) || x.check?.captions?.[0]?.page || "", chapters: ch, transcript: cues.map((q) => q.text).join(" ").slice(0, 20000) }; keep(id, "video", x); return { ok: true, line: `${ch.length} chapters made from the captions.` };
  }
  async function videoMarkup(id, input) { const x = load(id, "video"); x.facts = Object.fromEntries(["name", "description", "thumbnailUrl", "uploadDate", "contentUrl", "embedUrl", "duration", "page"].map((k) => [k, clean(input[k] ?? x.facts?.[k] ?? "")])); const r = videoObjectLd({ ...x.facts, pageUrl: x.facts.page, chapters: x.chapters?.chapters ?? [] }); keep(id, "video", x); return r.needs ? { refused: `Google needs ${r.needs.join(", ")} for video markup: fill them in.` } : { ok: true, line: "Video markup is ready to copy." }; }
  function videoView(id) {
    const x = load(id, "video"), f = x.facts ?? {}, sections = [];
    if (x.check) sections.push({ title: `Videos on your site (checked ${x.check.on})`, read: x.check.withVideo.length ? `On ${x.check.withVideo.length} of ${x.check.pages} pages read. ${RULES.video.name}.` : `No video on the ${x.check.pages} pages read.`, lines: x.check.lines });
    if (x.chapters) sections.push({ title: `Chapters and transcript (${x.chapters.on})`, read: "Made by your AI from the captions only; each chapter starts where a caption starts. Paste the chapters under the video (and in YouTube's description if it is there too).", ready: [readyOf("Chapters", chapterText(x.chapters.chapters), "your captions"), readyOf("Transcript (for under the video)", x.chapters.transcript, "your captions")] });
    const ld = videoObjectLd({ ...f, pageUrl: f.page, chapters: x.chapters?.chapters ?? [] }); if (ld.json) sections.push({ title: "VideoObject markup", read: `Built from the facts you gave${x.chapters ? ", with your chapters as key moments" : ""}. Put it on the video's page.`, ready: [readyOf("VideoObject (JSON-LD)", ld.json, "the facts you gave")] });
    const rows = [...(x.check?.rows ?? []), ...(ld.json ? [{ page: f.page, name: f.name, description: f.description, thumbnailUrl: f.thumbnailUrl, contentUrl: f.contentUrl, embedUrl: f.embedUrl }] : [])]; if (rows.some((r) => r.page && r.name && r.thumbnailUrl && (r.contentUrl || r.embedUrl))) sections.push({ title: "Video sitemap", read: "From the video markup Visibility found and the facts you gave.", ready: [readyOf("video-sitemap.xml", videoSitemap(rows), "your video markup")] });
    return { job: "video", ...MORE_JOBS.video, money: "Free. Chapters use your AI (about 2 cents, inside your Monthly AI limit).",
      fields: [{ name: "pages", label: "Pages with videos (one per line; your main pages otherwise)", value: "", kind: "area" }, { name: "captions", label: "Captions for chapters: paste WebVTT text, or its .vtt address", value: "", kind: "area" }, ...[["page", "The video's page address"], ["name", "Video title"], ["description", "Video description"], ["thumbnailUrl", "Thumbnail image address"], ["uploadDate", "First published (YYYY-MM-DD)"], ["contentUrl", "Video file address (or leave empty)"], ["embedUrl", "Player address (if no file address)"], ["duration", "Length (e.g. PT4M30S)"]].map(([n, l]) => ({ name: n, label: l, value: f[n] ?? "" }))],
      buttons: [{ press: "check", label: "Check my videos", cost: "Free" }, { press: "chapters", label: "Make chapters from captions", cost: "About $0.02 (your AI)" }, { press: "markup", label: "Make my video markup", cost: "Free" }], sections };
  }

  /* ───────────── PINTEREST ───────────── */
  async function pinWrite(id, input) {
    const pages = (await pagesFor(id, input, 6)).filter((p) => p.title || p.h1); if (!pages.length) return { refused: closedWhy() + " Add your website first, or give pages." };
    const want = new Set(pages.flatMap((p) => clean(`${p.title} ${p.h1}`).toLowerCase().split(/\W+/).filter((w) => w.length > 3))), words = (d.phrases(id) ?? []).filter((p) => clean(p.text).toLowerCase().split(/\W+/).some((w) => want.has(w))).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 25).map((p) => clean(p.text));
    const r = await ask("pinterest", { system: PIN_SYSTEM, schema: PIN_SCHEMA, body: { searchWords: words, pages: pages.map((p) => ({ url: p.url, title: p.title, description: p.description, heading: p.h1, text: p.text.slice(0, 2500) })) } }); if (r.fail) return { refused: r.fail };
    const pins = [], refused = []; for (const pin of r.data.pins ?? []) { const page = pages.find((p) => p.url === pin.url); if (!page) continue; const f = pinFaults(pin, page); if (f.length) refused.push(`${pin.url}: ${f.join("; ")}`); else pins.push({ ...pin, image: (/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(page.html)?.[1]) ?? null }); }
    const x = load(id, "pinterest"); x.write = { on: today(now), pins, refused, words: words.length }; keep(id, "pinterest", x);
    return pins.length ? { ok: true, line: `${pins.length} pins written${words.length ? `, with ${words.length} of your searched words` : ""}.${refused.length ? ` ${refused.length} refused (a number not on the page, too long, or a promise).` : ""}` } : { refused: `Every pin written broke a rule: ${refused.join(" · ")}` };
  }
  function pinView(id) {
    const x = load(id, "pinterest"), sections = [];
    if (x.write) sections.push({ title: `Pins for your pages (${x.write.on})`, read: `Titles up to ${RULES.pinterest.title} characters (${RULES.pinterest.name}, ${RULES.pinterest.url}, read ${RULES.pinterest.checked}); descriptions up to ${ADVICE.pinDescription} characters (our advice). Use a tall image (2:3) from the page; post the pin with the page's link.`, ready: x.write.pins.flatMap((p) => [readyOf(`Pin title — ${p.url}`, p.title, "your AI, from the page"), readyOf("Description", p.description, "your AI, from the page"), readyOf("Board", p.board, "your AI"), readyOf("Image alt text", p.alt, "your AI"), ...(p.image ? [readyOf("Image to use (the page's share image)", p.image, "the page")] : [])]), note: x.write.refused.length ? `Refused: ${x.write.refused.join(" · ")}` : null });
    return { job: "pinterest", ...MORE_JOBS.pinterest, money: "Writing uses your AI (about 3 cents, inside your Monthly AI limit). Nothing is posted: you post the pins, or connect Pinterest's own scheduler.",
      fields: [{ name: "pages", label: "Pages (one per line; your main pages otherwise, up to 6)", value: "", kind: "area" }], buttons: [{ press: "write", label: "Write my pins", cost: "About $0.03 (your AI)" }], sections };
  }

  /* ───────────── PODCASTS ───────────── */
  async function podcastCheck(id, input) {
    const x = load(id, "podcast"); x.feed = clean(input.feed) || x.feed; x.spotify = clean(input.spotify) || x.spotify || ""; if (!x.feed) return { refused: "Give your podcast's RSS feed address (your podcast host shows it)." };
    const f = feedOf(await getHtml(x.feed)); if (!f) { keep(id, "podcast", x); return { refused: "That address is not a podcast feed (RSS)." }; }
    const j = await getJson(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=25&term=${encodeURIComponent(f.show.title ?? "")}`), apple = appleShowOf(j, x.feed, f.show.title);
    const spotifyOk = /^https:\/\/open\.spotify\.com\/show\/[A-Za-z0-9]{22}/.test(x.spotify) ? await open(x.spotify) : null;
    x.check = { on: today(now), show: f.show, episodes: f.episodes.slice(0, 50), lines: [...podcastLines(f), apple ? { ok: true, area: "Apple Podcasts", line: `Apple Podcasts lists the show: ${apple.collectionViewUrl}` } : { ok: false, area: "Apple Podcasts", line: "Apple Podcasts does not list this feed (Apple's Search API).", problem: "The show is not on Apple Podcasts.", solution: "Submit the feed in Apple Podcasts Connect (podcastsconnect.apple.com).", ready: [{ label: "Your feed address", text: x.feed, source: "your feed" }] },
      x.spotify ? (spotifyOk === null ? { ok: null, area: "Spotify", line: "Spotify turns automatic readers away, so your link could not be checked here; open it yourself once." } : spotifyOk ? { ok: true, area: "Spotify", line: `Your Spotify link opens: ${x.spotify}` } : { ok: false, area: "Spotify", line: "Your Spotify link does not open (or is not a show link).", problem: "The Spotify link does not work.", solution: "Copy the show's link from Spotify for Creators, or submit the feed there.", ready: [] }) : { ok: null, area: "Spotify", line: "Paste your Spotify show link to check it (Spotify's catalogue needs your own Spotify app key, so it is checked by link only)." }] };
    keep(id, "podcast", x); return { ok: true, line: `${f.show.title}: ${f.episodes.length} episodes read; ${x.check.lines.filter((l) => l.ok === false).length} problems.` };
  }
  function podcastView(id) {
    const x = load(id, "podcast"), sections = [];
    if (x.check) { sections.push({ title: `${x.check.show.title ?? "Your podcast"} (checked ${x.check.on})`, read: `Read from your feed (${x.feed}) and Apple's Search API.`, lines: x.check.lines }); sections.push({ title: "PodcastEpisode markup for each episode's page", read: "Built from your feed's own facts. Put each block on that episode's page on your site.", ready: x.check.episodes.slice(0, 10).map((e) => readyOf(e.title ?? "Episode", podcastEpisodeLd(e, x.check.show), "your feed")) }); }
    return { job: "podcast", ...MORE_JOBS.podcast, money: "Free (your feed and Apple's Search API).", fields: [{ name: "feed", label: "Your podcast's RSS feed address", value: x.feed ?? "" }, { name: "spotify", label: "Your Spotify show link (optional)", value: x.spotify ?? "" }], buttons: [{ press: "check", label: "Check my podcast", cost: "Free" }], sections };
  }

  /* ───────────── BRAND FACTS (ENTITY) ───────────── */
  async function entityCheck(id, input) {
    const x = load(id, "entity"); x.setup = { brand: clean(input.brand) || x.setup?.brand || brand(id), home: clean(input.home) || x.setup?.home || site(id) || "", profiles: input.profiles != null ? listOf(input.profiles) : x.setup?.profiles ?? [], logo: clean(input.logo) || x.setup?.logo || "", description: clean(input.description) || x.setup?.description || "", type: clean(input.type) || x.setup?.type || "Organization" };
    if (!x.setup.home) return { refused: "Give your website's address." }; const h = await getHtml(x.setup.home); if (!h) { keep(id, "entity", x); return { refused: (await statusWhy(x.setup.home)) }; }
    const s = siteEntity(pageOf(x.setup.home, h)), domain = hostOf(x.setup.home), sameAsOpen = {}; for (const u of [...new Set([...s.sameAs, ...x.setup.profiles])].slice(0, 12)) { sameAsOpen[u] = await open(u); await pace(d.pageMs ?? 300); }
    const q = await getJson(wikidataSearchUrl(x.setup.brand || s.name)), ids = (q?.search ?? []).map((r) => r.id).slice(0, 7), ents = ids.length ? await getJson(wikidataEntityUrl(ids)) : null, w = ents ? wikidataMatch(ents, domain) : { item: null, candidates: [] };
    x.check = { on: today(now), site: { name: s.name, type: s.type, url: s.url, logo: s.logo, sameAs: s.sameAs, description: s.description }, sameAsOpen, wikidata: w, wikidataRead: Boolean(q), lines: entityLines({ site: s, sameAsOpen, wikidata: w, brand: x.setup.brand, domain }) };
    keep(id, "entity", x); return { ok: true, line: `${x.check.lines.filter((l) => l.ok === false).length} gaps. Wikidata: ${w.item ? `item ${w.item.id}` : q ? "no item with your website" : "did not answer"}.` };
  }
  function entityView(id) {
    const x = load(id, "entity"), s = x.setup ?? {}, c = x.check, sections = [];
    if (c) { sections.push({ title: `Brand facts (checked ${c.on})`, read: "From your home page's markup, your profile links and Wikidata's own service.", lines: c.lines }); if (c.wikidata?.candidates?.length && !c.wikidata.item) sections.push({ title: "Wikidata items with a similar name (not yours unless their website is yours)", lines: c.wikidata.candidates.map((k) => ({ ok: null, line: `${k.id}: ${k.label} — ${k.description}` })) }); const open = Object.entries(c.sameAsOpen ?? {}).filter(([, ok]) => ok).map(([u]) => u); sections.push({ title: "Organization markup for your home page", read: "Only your own facts and the profile links that opened. Check each fact before you use it.", ready: [readyOf("Organization (JSON-LD)", organizationLd({ type: s.type || "Organization", name: s.brand || c.site.name, url: s.home, logo: s.logo || c.site.logo, description: s.description || c.site.description, sameAs: [...open, ...(c.wikidata?.item ? [c.wikidata.item.url] : [])] }), "your site and profiles")] }); }
    return { job: "entity", ...MORE_JOBS.entity, money: "Free (Wikidata's own service and your pages).",
      fields: [{ name: "brand", label: "Your brand's exact name", value: s.brand ?? brand(id) }, { name: "home", label: "Your website", value: s.home ?? site(id) ?? "" }, { name: "type", label: "What you are (Organization, Person, Product, LocalBusiness)", value: s.type ?? "Organization" }, { name: "logo", label: "Logo address", value: s.logo ?? "" }, { name: "description", label: "One-line description (true, plain)", value: s.description ?? "" }, { name: "profiles", label: "Your official profiles, one per line (LinkedIn, YouTube, Facebook, app stores…)", value: (s.profiles ?? []).join("\n"), kind: "area" }],
      buttons: [{ press: "check", label: "Check my brand facts", cost: "Free" }], sections };
  }

  /* ───────────── NEWS AND DISCOVER ───────────── */
  async function newsCheck(id, input) {
    const pages = await pagesFor(id, input, 10); if (!pages.length) return { refused: closedWhy() + " Give your article pages." };
    const arts = pages.map(articleOf).filter((a) => a.node || listOf(input.pages).length), x = load(id, "news"); x.setup = { name: clean(input.name) || x.setup?.name || brand(id), language: clean(input.language) || x.setup?.language || "en" };
    x.check = { on: today(now), read: pages.length, articles: arts.map((a) => ({ url: a.url, title: a.title, headline: a.headline, published: a.published })), lines: arts.flatMap(newsLines) }; keep(id, "news", x);
    return { ok: true, line: arts.length ? `${arts.length} articles checked: ${x.check.lines.filter((l) => l.ok === false).length} problems.` : `None of the ${pages.length} pages read is marked as an article: give your article pages.` };
  }
  function newsView(id) {
    const x = load(id, "news"), sections = [];
    if (x.check) { sections.push({ title: `Articles (checked ${x.check.on})`, read: `${RULES.discover.name} (${RULES.discover.url}, read ${RULES.discover.checked}).`, lines: x.check.lines }); const sm = newsSitemap(x.check.articles, { name: x.setup.name, language: x.setup.language, now: Date.parse(x.check.on) + 864e5 }); sections.push({ title: "News sitemap", read: `Only articles of the last ${RULES.newsSitemap.days} days, at most ${RULES.newsSitemap.max} (${RULES.newsSitemap.name}, ${RULES.newsSitemap.url}). The publication name must match Google News. ${sm.count} articles fit today.`, ready: sm.count ? [readyOf("news-sitemap.xml", sm.xml, "your article markup")] : [] }); }
    return { job: "news", ...MORE_JOBS.news, money: "Free.", fields: [{ name: "pages", label: "Article pages (one per line; your main pages otherwise)", value: "", kind: "area" }, { name: "name", label: "Publication name (as in Google News)", value: x.setup?.name ?? brand(id) }, { name: "language", label: "Language (2 letters)", value: x.setup?.language ?? "en" }], buttons: [{ press: "check", label: "Check my articles", cost: "Free" }], sections };
  }

  /* ───────────── BACKLINKS ───────────── */
  async function linksCheck(id, input) {
    const x = load(id, "backlinks"), domain = hostOf(clean(input.site) || site(id)); if (!domain) return { refused: "Add your website first." }; const said = [];
    const b = buyer("backlinks"), s = await b.live(BACKLINKS.summary, { target: domain, include_subdomains: true, rank_scale: "one_hundred" }, { worst: MORE_WORST.backlinksLive, what: `links summary of ${domain}` });
    let groups = null; if (s.ok) { const l = await b.live(BACKLINKS.list, backlinkTask(domain), { worst: MORE_WORST.backlinksLive, what: `links to ${domain}` }); if (l.ok) groups = linkGroups(l.result, { today: today(now) }); else said.push(`DataForSEO links list: ${l.why}`); } else said.push(`DataForSEO links data: ${s.why}`);
    let bing = null; const bk = d.bingKey?.(id); if (bk) { const j = await getJson(`https://ssl.bing.com/webmaster/api.svc/json/GetLinkCounts?siteUrl=${encodeURIComponent(`https://${domain}/`)}&page=0&apikey=${encodeURIComponent(bk)}`); bing = j && !j.error ? bingLinkRows(j) : null; if (!bing) said.push("Bing did not give link counts."); }
    let sc = null; if (clean(input.scCsv)) { const now0 = scLinkingSites(input.scCsv), cmp = compareSites(x.scSites ?? [], now0); sc = { count: now0.length, ...cmp, first: !x.scSites }; x.scSites = now0; }
    x.check = { on: today(now), domain, summary: s.ok ? summaryOf(s.result) : null, fresh: groups?.fresh.slice(0, 40) ?? [], lost: groups?.lost.slice(0, 40) ?? [], suspicious: groups?.suspicious.slice(0, 40) ?? [], read: groups?.all.length ?? 0, bing, sc, said };
    keep(id, "backlinks", x); if (!s.ok && !bing && !sc) return { refused: `No links data could be read. ${said.join(" ")} Paste Search Console's "Top linking sites" export, or add your Bing key, for free data.` };
    return { ok: true, line: `${x.check.summary ? `${x.check.summary.backlinks} links from ${x.check.summary.domains} sites` : "Links read"}: ${x.check.fresh.length} new in 30 days, ${x.check.lost.length} lost, ${x.check.suspicious.length} suspicious.${said.length ? ` ${said.join(" ")}` : ""}` };
  }
  async function linksIdeas(id, input) {
    const x = load(id, "backlinks"), domain = hostOf(site(id)); x.competitors = input.competitors != null ? listOf(input.competitors).map((c) => hostOf(/^https?:/.test(c) ? c : `https://${c}`)).filter(Boolean).slice(0, 5) : x.competitors ?? [];
    if (!x.competitors.length) { keep(id, "backlinks", x); return { refused: "Give 1 to 5 competitors' websites." }; }
    const b = buyer("backlinks"), r = await b.live(BACKLINKS.intersection, { targets: Object.fromEntries(x.competitors.map((c, i) => [String(i + 1), c])), ...(domain ? { exclude_targets: [domain] } : {}), intersection_mode: "partial", limit: 50 }, { worst: MORE_WORST.backlinksLive, what: "link ideas from competitors" });
    if (!r.ok) { keep(id, "backlinks", x); return { refused: r.why }; } x.ideas = { on: today(now), rows: linkIdeas(r.result).slice(0, 30) }; keep(id, "backlinks", x);
    return { ok: true, line: `${x.ideas.rows.length} sites link to your competitors and not to you.` };
  }
  async function linksEmails(id, input) {
    const x = load(id, "backlinks"); if (!x.ideas?.rows?.length) return { refused: "Press Find link ideas first." }; const url = clean(input.page) || site(id), h = url ? await getHtml(url) : null; if (!h) return { refused: "Give the page of yours to suggest (it could not be opened)." }; const page = pageOf(url, h);
    const r = await ask("backlinks", { system: OUTREACH_SYSTEM, schema: OUTREACH_SCHEMA, body: { ownerPage: { url, title: page.title, description: page.description, text: page.text.slice(0, 3000) }, sites: x.ideas.rows.slice(0, 3).map((i) => i.domain) } }); if (r.fail) return { refused: r.fail };
    const ok = [], refused = []; for (const e of r.data.emails ?? []) { const f = outreachFaults(e, page); if (f.length) refused.push(`${e.domain}: ${f.join("; ")}`); else ok.push({ ...e, page: url }); }
    x.emails = { on: today(now), rows: ok, refused }; keep(id, "backlinks", x); return ok.length ? { ok: true, line: `${ok.length} emails drafted; you send them yourself.${refused.length ? ` ${refused.length} refused.` : ""}` } : { refused: `Every email written broke a rule: ${refused.join(" · ")}` };
  }
  function linksView(id) {
    const x = load(id, "backlinks"), c = x.check, sections = [], row = (l) => [l.domain, l.from, l.anchor || "(no text)", l.dofollow ? "followed" : "nofollow", l.first, l.spam];
    if (c) {
      if (c.summary) sections.push({ title: `Links to ${c.domain} (${c.on})`, read: "DataForSEO's links index (its own crawl; Google's own list is in your Search Console).", lines: [{ ok: null, line: `${c.summary.backlinks} links from ${c.summary.domains} sites; ${c.summary.broken ?? 0} point to pages that do not open; the sites' spam score ${c.summary.spam ?? "–"} of 100 (DataForSEO's measure).` }] });
      if (c.fresh.length) sections.push({ title: "New links (last 30 days)", table: { cols: ["Site", "Page", "Link text", "Kind", "First seen", "Spam score"], rows: c.fresh.map(row) } });
      if (c.lost.length) sections.push({ title: "Lost links", read: "Ask the site to restore a link you lost only if the page it pointed to still helps their readers.", table: { cols: ["Site", "Page", "Link text", "Kind", "First seen", "Spam score"], rows: c.lost.map(row) } });
      if (c.suspicious.length) sections.push({ title: `Suspicious links (spam score ${ADVICE.spamScore}+, our line)`, read: `Google ignores most spammy links by itself. Disavow ONLY if Google has given your site a manual action for links (${RULES.disavow.url}).`, table: { cols: ["Site", "Page", "Link text", "Kind", "First seen", "Spam score"], rows: c.suspicious.map(row) }, ready: [readyOf("disavow.txt (only after a manual action)", disavowText(c.suspicious), "DataForSEO's spam score")] });
      if (c.bing) sections.push({ title: "Bing: your pages with the most links", table: { cols: ["Page", "Links"], rows: c.bing.slice(0, 20).map((r) => [r.page, r.links]) } });
      if (c.sc) sections.push({ title: "Search Console: top linking sites", read: c.sc.first ? `${c.sc.count} sites in this export. Paste next month's export to see what changed.` : `${c.sc.count} sites; compared with your last export.`, lines: c.sc.first ? [] : [...c.sc.fresh.map((d0) => ({ ok: true, line: `New: ${d0}` })), ...c.sc.lost.map((d0) => ({ ok: false, line: `Gone: ${d0}`, problem: `${d0} no longer links to you.`, solution: "If the link helped readers, ask the site why it went.", ready: [] }))] });
      if (c.said?.length) sections.push({ title: "Not read", lines: c.said.map((s0) => ({ ok: null, line: s0 })) });
    }
    if (x.ideas?.rows?.length) sections.push({ title: `Link ideas (${x.ideas.on})`, read: `Sites that link to ${x.competitors.join(", ")} and not to you, with a spam score under ${ADVICE.spamScore}. Look at each site first: a link must help its readers.`, table: { cols: ["Site", "Links to how many competitors", "Site rank (0–100)"], rows: x.ideas.rows.map((r) => [r.domain, r.competitors, r.rank]) } });
    if (x.emails?.rows?.length) sections.push({ title: "Outreach emails (you send them yourself)", read: "Written by your AI from your own page only; nothing is offered for a link.", ready: x.emails.rows.map((e) => readyOf(`To ${e.domain}`, `Subject: ${e.subject}\n\n${e.body}`, "your AI, from your page")), note: x.emails.refused.length ? `Refused: ${x.emails.refused.join(" · ")}` : null });
    return { job: "backlinks", ...MORE_JOBS.backlinks, money: moneyLine("backlinks"),
      fields: [{ name: "scCsv", label: "Search Console → Links → Top linking sites → Export: paste the CSV (free)", value: "", kind: "area" }, { name: "competitors", label: "Competitors' websites (comma between, up to 5)", value: (x.competitors ?? []).join(", ") }, { name: "page", label: "Your page to suggest in emails", value: "" }],
      buttons: [{ press: "check", label: "Check my links", cost: "About $0.04 (your search-data account); Search Console and Bing free" }, { press: "ideas", label: "Find link ideas", cost: "About $0.03 (your search-data account)" }, { press: "emails", label: "Draft outreach emails", cost: "About $0.02 (your AI)" }], sections };
  }

  /* ───────────── SHOP AND MARKETPLACES ───────────── */
  async function shopFeed(id, input) {
    const x = load(id, "shop"); let t = String(input.feed ?? "").trim(); if (/^https?:\/\/\S+$/.test(t)) { x.feedUrl = t; t = (await getHtml(t)) ?? ""; if (!t) return { refused: "The feed address could not be opened." }; }
    if (!t) return { refused: "Give your Merchant Center feed's address, or paste the feed." }; const rows = feedRows(t);
    x.feed = { on: today(now), count: rows.length, lines: feedLines(rows), sample: rows.slice(0, 3).map((r) => ({ id: r.id, title: r.title })) }; keep(id, "shop", x); return { ok: true, line: `${rows.length} products read: ${x.feed.lines.filter((l) => l.ok === false).length} problems.` };
  }
  async function shopPages(id, input) { const pages = await pagesFor(id, input, 10); if (!pages.length) return { refused: "Give your product pages." }; const x = load(id, "shop"); x.pages = { on: today(now), lines: pages.flatMap(productPageLines) }; keep(id, "shop", x); return { ok: true, line: `${pages.length} pages: ${x.pages.lines.filter((l) => l.ok === false).length} problems.` }; }
  async function shopListing(id, input) {
    const x = load(id, "shop"), link = clean(input.listing), cc = (clean(input.country) || "us").toLowerCase(), [loc, lang] = AMAZON[cc] ?? AMAZON.us; let L = null, why = null;
    const asin = amazonAsin(link), etsy = /etsy\.com\/(?:[a-z-]+\/)?listing\/(\d+)/i.exec(link)?.[1] ?? (/^\d{6,12}$/.test(link) && /etsy/i.test(input.market ?? "") ? link : null);
    if (asin) { const b = buyer("shop"), r = await b.queued("/merchant/amazon/asin", { asin, location_name: loc, language_code: lang }, { worst: MORE_WORST.merchantTask, what: `Amazon product ${asin}` }); if (r.ok) L = amazonListingOf(r.result); else why = r.why; if (L) L.id ??= asin;
      const words = listOf(input.keywords).slice(0, 5); if (L && words.length) { L.ranks = []; for (const w of words) { const s = await b.queued("/merchant/amazon/products", { keyword: w, location_name: loc, language_code: lang, depth: 100 }, { worst: MORE_WORST.merchantTask, what: `Amazon search "${w}"` }); if (s.ok) L.ranks.push({ keyword: w, ...amazonRank(s.result, asin) }); else if (!s.later) break; } } }
    else if (etsy) { if (!d.keys.saved("ETSY_API_KEY")) why = "Etsy's Open API needs your own Etsy app key (paste it on this screen), or paste your listing below."; else { const j = await getJson(`https://openapi.etsy.com/v3/application/listings/${etsy}`, { headers: { "x-api-key": d.keys.get("ETSY_API_KEY") } }); L = etsyListingOf(j); if (!L) why = "Etsy's API did not return this listing."; } }
    if (!L && clean(input.title)) L = { market: (clean(input.market) || "ebay").toLowerCase(), id: null, title: clean(input.title), description: String(input.description ?? ""), bullets: [], tags: listOf(input.tags), from: { name: "the listing you pasted" } };
    if (!L) return { refused: why ?? "Give an Amazon product link (or ASIN), an Etsy listing link, or paste your listing's title and description (eBay and others)." };
    L.on = today(now); x.listing = L; x.listingLines = listingLines(L); delete x.write; keep(id, "shop", x); return { ok: true, line: `Read "${L.title.slice(0, 80)}" (${L.from.name}).${L.ranks?.length ? ` Top 100 for ${L.ranks.filter((r) => r.rank).length} of ${L.ranks.length} words.` : ""}` };
  }
  /** RR-382 item 1b: the client's own Merchant Center through his Google sign-in (Merchant API, read only): products and their problems */
  async function shopMerchant(id, input) {
    if (!d.google?.merchantAccounts) return { refused: "Connect Google first (Settings → Google), with Also connect Merchant Center." }; const a = await d.google.merchantAccounts(); if (!a.ok) return { refused: a.why }; if (!a.accounts.length) return { refused: "This Google sign-in has no Merchant Center account." };
    const acc = a.accounts.find((y) => y.id === clean(input.merchantId)) ?? a.accounts[0], p = await d.google.merchantProducts(acc.id); if (!p.ok) return { refused: p.why };
    const m = merchantIssues(p.products), x = load(id, "shop"); x.merchant = { on: today(now), account: acc, accounts: a.accounts, products: m.products, disapproved: m.disapproved, partial: Boolean(p.partial), issues: m.issues.slice(0, 40).map((i) => ({ ...i, count: i.products.length, products: i.products.slice(0, 5) })) }; keep(id, "shop", x);
    return { ok: true, line: `${acc.name}: ${m.products} products read; ${m.disapproved} disapproved somewhere; ${m.issues.length} kinds of problem.` };
  }
  async function shopWrite(id, input) {
    const x = load(id, "shop"), L = x.listing; if (!L) return { refused: "Read your listing first." };
    const r = await ask("shop", { system: LISTING_SYSTEM, schema: LISTING_SCHEMA, body: { market: L.market, searchWords: listOf(input.keywords).slice(0, 15), listing: { title: L.title, bullets: L.bullets, description: String(L.description).slice(0, 4000), tags: L.tags ?? [] } } }); if (r.fail) return { refused: r.fail };
    const f = listingFaults(r.data, L); x.write = { on: today(now), ...r.data, faults: f }; keep(id, "shop", x); return { ok: true, line: f.length ? `Written, but check these first: ${f.join("; ")}.` : "A better listing is written from your own listing. Copy what you like." };
  }
  function shopView(id) {
    const x = load(id, "shop"), sections = [], L = x.listing;
    if (x.merchant) { const mc = x.merchant; sections.push({ title: `Merchant Center: ${mc.account.name} (${mc.products} products, ${mc.on})`, read: `Read from your own Merchant Center through your Google sign-in (Merchant API). ${mc.disapproved} products are disapproved in at least one country.${mc.partial ? " Not every page of products could be read." : ""} Google's own words for each problem, with its help page.`, lines: mc.issues.length ? mc.issues.map((i) => ({ ok: i.severity === "NOT_IMPACTED" ? null : false, line: `${i.description ?? i.code} (${i.count} product${i.count === 1 ? "" : "s"}${i.attribute ? `, ${i.attribute}` : ""}): ${i.products.join(", ")}`, problem: i.detail ?? i.description ?? i.code, solution: `${i.resolution ? `${String(i.resolution).toLowerCase().replace(/_/g, " ")}. ` : ""}${i.documentation ? `Google's help: ${i.documentation}` : ""}`.trim() || "See Merchant Center.", ready: [] })) : [{ ok: true, line: "Merchant Center reports no problem on your products." }] }); }
    if (x.feed) sections.push({ title: `Merchant Center feed (${x.feed.count} products, ${x.feed.on})`, read: `Checked against ${RULES.merchant.name} (${RULES.merchant.url}, read ${RULES.merchant.checked}). Merchant Center's own diagnostics stay the final word.`, lines: x.feed.lines });
    if (x.pages) sections.push({ title: `Product pages (${x.pages.on})`, lines: x.pages.lines });
    if (L) { sections.push({ title: `Your listing: ${L.title.slice(0, 90)}`, read: `${L.from.name}, read ${L.on}.${L.market === "ebay" ? " eBay's catalogue API needs your own eBay app; the listing is pasted." : ""}`, lines: x.listingLines }); if (L.ranks?.length) sections.push({ title: "Where your Amazon product stands", table: { cols: ["Words", "Your place (top 100)", "Top 3"], rows: L.ranks.map((r) => [r.keyword, r.rank ?? "not in top 100", r.top.join(" · ")]) } }); }
    if (x.write) sections.push({ title: `A better listing (${x.write.on})`, read: "Written by your AI from your own listing only. Check it before you use it; nothing is sent to the marketplace.", lines: (x.write.faults ?? []).map((f) => ({ ok: false, line: f, problem: f, solution: "Edit it before you use it.", ready: [] })), ready: [readyOf("Title", x.write.title, "your AI"), readyOf("Bullet points", (x.write.bullets ?? []).join("\n"), "your AI"), readyOf("Description", x.write.description, "your AI"), readyOf("Search tags", (x.write.tags ?? []).join(", "), "your AI")] });
    return { job: "shop", ...MORE_JOBS.shop, money: `${moneyLine("shop")} Writing uses your AI (about 3 cents).`,
      fields: [{ name: "merchantId", label: "Merchant Center account id (empty: the first one your sign-in can read)", value: x.merchant?.account?.id ?? "" }, { name: "feed", label: "Merchant Center feed: its address, or paste it", value: x.feedUrl ?? "", kind: "area" }, { name: "pages", label: "Product pages to check (one per line)", value: "", kind: "area" }, { name: "listing", label: "Amazon product link or ASIN, or Etsy listing link", value: L?.id ?? "" }, { name: "country", label: "Amazon country (us, gb, ca, au, in, de, ae)", value: "us" }, { name: "keywords", label: "Words buyers search (comma between)", value: "" }, { name: "market", label: "Or paste: marketplace (ebay, etsy, amazon…)", value: "" }, { name: "title", label: "Pasted listing title", value: "" }, { name: "description", label: "Pasted description", value: "", kind: "area" }, { name: "tags", label: "Pasted tags (comma between)", value: "" }],
      buttons: [{ press: "merchant", label: "Read my Merchant Center", cost: "Free (your Google sign-in)" }, { press: "feed", label: "Check my feed", cost: "Free" }, { press: "pages", label: "Check my product pages", cost: "Free" }, { press: "listing", label: "Read my listing", cost: "About a cent on Amazon (your search-data account); free otherwise" }, { press: "write", label: "Write a better listing", cost: "About $0.03 (your AI)" }], sections };
  }

  /** one plain line per kind, for the monthly report */
  function summary(id) {
    const g = (j) => load(id, j), r = g("reviews").read, im = g("image").check, v = g("video").check, p = g("pinterest").write, pc = g("podcast").check, e = g("entity").check, n = g("news").check, b = g("backlinks").check, s = g("shop");
    const bad = (lines) => (lines ?? []).filter((l) => l.ok === false).length;
    return [
      kindLine(MORE_JOBS.reviews.title, r && `${r.score ?? "–"} ★ from ${r.count} reviews (${r.on}); ${r.unanswered} low ones without an answer.`),
      kindLine(MORE_JOBS.image.title, im && `${im.images.length} images, ${bad(im.lines)} problems (${im.on}).`),
      kindLine(MORE_JOBS.video.title, v && `${v.withVideo.length} pages with videos, ${bad(v.lines)} problems (${v.on}).`),
      kindLine(MORE_JOBS.pinterest.title, p && `${p.pins.length} pins written (${p.on}).`),
      kindLine(MORE_JOBS.podcast.title, pc && `${pc.episodes.length} episodes, ${bad(pc.lines)} problems (${pc.on}).`),
      kindLine(MORE_JOBS.entity.title, e && `${bad(e.lines)} gaps; Wikidata ${e.wikidata?.item ? e.wikidata.item.id : "has no item"} (${e.on}).`),
      kindLine(MORE_JOBS.news.title, n && `${n.articles.length} articles, ${bad(n.lines)} problems (${n.on}).`),
      kindLine(MORE_JOBS.backlinks.title, b && `${b.summary ? `${b.summary.backlinks} links from ${b.summary.domains} sites; ` : ""}${b.fresh.length} new, ${b.lost.length} lost, ${b.suspicious.length} suspicious (${b.on}).`),
      kindLine(MORE_JOBS.shop.title, (s.feed || s.listing) && [s.feed ? `feed ${s.feed.count} products, ${bad(s.feed.lines)} problems` : null, s.listing ? `listing "${s.listing.title.slice(0, 50)}" (${s.listing.on})` : null].filter(Boolean).join("; ") + "."),
    ];
  }

  const VIEW = { reviews: reviewsView, image: imageView, video: videoView, pinterest: pinView, podcast: podcastView, entity: entityView, news: newsView, backlinks: linksView, shop: shopView };
  const PRESS = { reviews: { save: reviewsSave, read: (id, i) => reviewsRead(id, i), replies: reviewsReplies, seen: reviewsSeen, watch: reviewsWatch }, image: { check: imageCheck, alt: imageAlt, save: imageSave }, video: { check: videoCheck, chapters: videoChapters, markup: videoMarkup }, pinterest: { write: pinWrite }, podcast: { check: podcastCheck }, entity: { check: entityCheck }, news: { check: newsCheck }, backlinks: { check: linksCheck, ideas: linksIdeas, emails: linksEmails }, shop: { merchant: shopMerchant, feed: shopFeed, pages: shopPages, listing: shopListing, write: shopWrite } };
  return { VIEW, PRESS, summary, reviewsDue, alerts: (id) => load(id, "reviews").alerts ?? [] };
}
