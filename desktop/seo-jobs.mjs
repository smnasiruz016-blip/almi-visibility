/**
 * 🔴 RR-379 (owner, 6 Nov 2026: "AlmiVisibility must hold EVERY kind of SEO", wave 1) · THE SIX NEW JOBS, one plain screen each, one button
 * per step: App stores (ASO), Local SEO, Technical SEO, Rank tracking, Click-rate fixes, AI search visibility. Each screen is one shape the
 * app draws the same way: what it does, the fields, the buttons (each with its cost), and the result sections (findings with fix and ready
 * text, a table, a chart). Generic: no product is named here; the product's own name, site and data are handed in.
 * Money: AI work is Sonnet, inside the client's Monthly AI limit (its own route per job); search data is the client's own DataForSEO account
 * inside its caps (each job its own line); ChatGPT / Perplexity / Gemini answers are on the client's own keys, with their own monthly cap.
 * Nothing is published to any store, listing or site by these jobs: the client copies or approves.
 */
import { parseStoreLink, appleListingOf, playListingOf, pastedListing, listingScore, lookupUrl, appleSearchUrl, appleSearchRows, searchRows, keywordTable, rhythmOf, reviewRows, groupReviews, writeListing, draftReplies, addRanks, rankSeries, siteLinks, STORES, ASO } from "./aso.mjs";
import { cleanProfile, digits, siteNap, mapsMatch, mapsTask, napConsistency, localBusinessJsonLd, gbpSheet, LISTING_PLACES, LOCAL, DIRECTORY_KINDS, overpassQuery, placesOf, directoryPage } from "./local-seo.mjs";
import { psiUrl, psiResult, speedLines, schemaCheck, schemaLines, redirectChain, redirectLines, indexLine, linesScore } from "./tech-seo.mjs";
import { RANK, chosenKeywords, suggestKeywords, scPositions, serpPosition, serpTask, keepPoint, rankChart, rankTable, lowCtrPages, writeCtr, beforeAfter, countryName } from "./rank-track.mjs";
import { ENGINES, askClaude, askChatGpt, askPerplexity, askGemini, aiOverviewOf, aioTask, readAnswer, visibilityScore, byEngine, suggestions, trendOf, questionSet } from "./ai-visibility.mjs";
import { dfsBuyer, jobSpent, WORST } from "./dfs-call.mjs";
import { USER_AGENT } from "./user-agent.mjs";

export const JOB_IDS = Object.freeze(["aso", "local", "tech", "rank", "ctr", "aiv"]);
/** the most one run of a job may spend on search data (the client's DataForSEO caps still apply on top) */
export const RUN_BUDGET = Object.freeze({ aso: 0.5, local: 0.3, rank: 0.2, aiv: 0.25 });
export const ENGINE_CAP_DEFAULT = 5;
export const JOBS = Object.freeze({
  aso: { title: "App stores (ASO)", does: "Checks your app's listing on Google Play, the App Store or the Microsoft Store, finds the words people search there, shows your competitors and writes a better listing.", youGet: "A listing score with fixes and ready text, keywords with your rank, 5 competitors, a rewritten listing inside each store's limits, review groups and reply drafts.", time: "A few minutes. Apple's data is free; Google Play data and store rankings use your search-data account (cents); writing uses your AI." },
  local: { title: "Local SEO", does: "Checks that your business's name, address and phone are the same on your site, on Google and everywhere else, finds where you stand on the map, and helps with reviews.", youGet: "A consistency score with each difference and its fix, your place in local results per city, review groups and reply drafts, markup and listing sheets to copy.", time: "A few minutes. Map data and reviews use your search-data account (cents)." },
  tech: { title: "Technical SEO", does: "Tests your pages' speed (Core Web Vitals), structured data, redirects and whether Google has them.", youGet: "Each problem with its fix and ready text.", time: "About a minute a page. Free (Google's PageSpeed Insights and your Search Console)." },
  rank: { title: "Rank tracking", does: "Follows the words you choose, each week (or day), on Google and Bing, per country.", youGet: "A chart and a table: your position, the change, and who is above you.", time: "A minute. Search Console is free; Google and Bing positions use your search-data account (under a cent a word)." },
  ctr: { title: "Click-rate fixes", does: "Finds pages Google shows often but few people click, writes a better title and description from the page's own words, and measures before and after.", youGet: "The pages to fix, three titles and three descriptions each, and the before/after click rate.", time: "A minute. Free (Search Console); writing uses your AI." },
  aiv: { title: "AI search visibility", does: "Asks ChatGPT, Claude, Perplexity, Gemini and Google's AI Overviews real questions about your field and records whether they name or cite you.", youGet: "A score and its trend, each answer with who was cited, and what page would win the answers you are missing.", time: "A few minutes. Each assistant uses your own key; Google's AI Overviews use your search-data account." },
});
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
const $ = (x, n = 2) => `$${Number(x ?? 0).toFixed(n)}`;
const today = (now) => new Date(now()).toISOString().slice(0, 10);
const listOf = (t) => String(t ?? "").split(/[\n,]/).map(clean).filter(Boolean);
/** a page's own words from its HTML (title, description, first heading, text) */
export function pageOf(url, html) {
  const h = String(html ?? ""), get = (re) => clean((re.exec(h)?.[1] ?? "").replace(/<[^>]+>/g, " ")), meta = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(h) ?? /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(h);
  const text = clean(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));
  return { url, title: get(/<title[^>]*>([\s\S]*?)<\/title>/i), description: clean(meta?.[1] ?? ""), h1: get(/<h1[^>]*>([\s\S]*?)<\/h1>/i), text, html: h };
}

/**
 * deps: { pread, pwrite, productOf(id) → { name, site, subject }, sitePages(id) → [url], gscSite(id) → siteUrl|null, phrases(id), asked(id),
 *   keys: { get(name), saved(name) }, ai: { key(), allowed(worst), add(usage) }, dfs: { ledger(), save(l), settings(), creds }, google,
 *   engines: { read(), write(x), cap() }, fetchImpl, askJson, now, pace, offline }
 */
export function seoJobs(d) {
  const now = d.now ?? (() => Date.now()), fetchImpl = d.fetchImpl ?? fetch, pace = d.pace ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const file = (job) => `seo-${job}.json`, load = (id, job) => d.pread(id, file(job), {}) ?? {}, keep = (id, job, x) => d.pwrite(id, file(job), x);
  const buyer = (job) => { const l = d.dfs.ledger(); return dfsBuyer({ job, ledger: l, save: d.dfs.save, creds: d.dfs.creds, settings: d.dfs.settings(), runBudget: RUN_BUDGET[job] ?? 0.2, fetchImpl, now: () => new Date(now()).toISOString(), ...(d.dfsWait ?? {}) }); };
  const getJson = async (url, init = {}) => { try { const r = await fetchImpl(url, { ...init, headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(60000) }); return r.ok ? await r.json().catch(() => null) : { error: { code: r.status, message: `answered ${r.status}` } }; } catch { return null; } };
  const getHtml = async (url) => { try { const r = await fetchImpl(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30000) }); return r.ok ? (await r.text()).slice(0, 1500000) : null; } catch { return null; } };
  const aiArgs = (route) => ({ ask: d.askJson, key: d.ai.key(), allowed: (w) => Boolean(d.ai.key()) && d.ai.allowed(w), onUsage: (u) => d.ai.add({ ...u, route }) });
  const moneyLine = (job) => { const s = jobSpent(d.dfs.ledger(), job, new Date(now()).toISOString()); return `Search data for this job: ${$(s.today, 4)} today, ${$(s.month, 4)} this month (inside your search-data caps; at most ${$(RUN_BUDGET[job] ?? 0.2)} a run).`; };

  /* ───────────── ASO ───────────── */
  async function asoRead(id, input) {
    const link = parseStoreLink(input.link); if (link.why) return { refused: link.why };
    const x = load(id, "aso"), key = `${link.store}:${link.id}`, app = (x.apps ??= {})[key] ?? { link: input.link, store: link.store, id: link.id, country: link.country }; let L = null, why = null;
    const pasted = clean(input.title) ? pastedListing({ store: link.store, id: link.id, title: input.title, short: input.short || null, long: input.long, whatsNew: input.whatsNew, keywords: input.keywordField, category: input.category, screenshots: input.screenshots }) : null;
    if (link.store === "apple") { const j = await getJson(lookupUrl(link.id, link.country)); L = appleListingOf(j, { country: link.country }); if (L) L.from.checked = today(now); else why = "Apple's Lookup API did not find this app."; }
    else if (link.store === "play") { const b = buyer("aso"), r = await b.queued("/app_data/google/app_info", { app_id: link.id, location_name: countryName(link.country) ?? "United States", language_code: link.language ?? "en" }, { worst: WORST.appTask, what: `Google Play listing of ${link.id}` }); if (r.ok) { L = playListingOf((r.result ?? [])[0]?.items?.[0], { country: link.country }); if (L) L.from.checked = today(now); } else why = r.why; }
    if (pasted) L = L ? { ...L, ...Object.fromEntries(Object.entries(pasted).filter(([k, v]) => ["short", "keywordsField", "whatsNew"].includes(k) && v)), ...(link.store === "ms" ? pasted : {}) } : pasted;
    if (!L) return { refused: link.store === "ms" ? "Microsoft publishes no catalogue API for store listings, so paste your listing's title, description and keywords in the fields below, then press Read my listing again." : `The listing could not be read: ${why}` };
    if (input.keywordField != null && link.store === "apple") L.keywordsField = clean(input.keywordField) || L.keywordsField;
    app.listing = L; app.score = listingScore(L, { keywords: listOf(input.keywords ?? app.keywords?.join(",")).map((t) => ({ text: t })), today: today(now) }); app.read = today(now); if (input.keywords) app.keywords = listOf(input.keywords).slice(0, ASO.keywordsPerRun);
    x.apps[key] = app; x.current = key; keep(id, "aso", x); return { ok: true, line: `Read ${L.title} on ${STORES[L.store].name}: score ${app.score.score} of 100.` };
  }
  const asoApp = (id) => { const x = load(id, "aso"); return x.current ? x.apps?.[x.current] ?? null : null; };
  /** the words to check: the client's own list, else our keyword store's phrases that share the app's words (free) */
  const asoWords = (id, app) => { if (app.keywords?.length) return app.keywords; const want = new Set(clean(`${app.listing?.title} ${app.listing?.category}`).toLowerCase().split(/\W+/).filter((w) => w.length > 3)); return (d.phrases(id) ?? []).filter((p) => clean(p.text).toLowerCase().split(/\W+/).some((w) => want.has(w))).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, ASO.keywordsPerRun).map((p) => clean(p.text).toLowerCase()); };
  async function asoKeywords(id) {
    const x = load(id, "aso"), app = asoApp(id); if (!app?.listing) return { refused: "Read your listing first." };
    const words = asoWords(id, app); if (!words.length) return { refused: "Give the words people search for your app (the Keywords field), or add keywords to Visibility first." };
    const b = buyer("aso"), searches = [], held = new Map((d.phrases(id) ?? []).map((p) => [clean(p.text).toLowerCase(), p])); let stopped = null;
    /* every task is posted first (paid once), then each is collected (free): the queue works on all of them together */
    if (app.store !== "ms") for (const w of words) { const r = await b.queued(`/app_data/${app.store === "apple" ? "apple" : "google"}/app_searches`, { keyword: w, location_name: countryName(app.country) ?? "United States", language_code: "en", depth: 30 }, { worst: WORST.appTask, what: `${app.store === "apple" ? "App Store" : "Google Play"} search "${w}"`, waitMs: 0 }); if (!r.ok && !r.later) break; }
    for (const w of words) {
      let rows = null, source = null;
      if (app.store === "apple" || app.store === "ms") { if (app.store === "apple") { const r = await b.queued("/app_data/apple/app_searches", { keyword: w, location_name: countryName(app.country) ?? "United States", language_code: "en", depth: 30 }, { worst: WORST.appTask, what: `App Store search "${w}"` }); if (r.ok) { rows = searchRows(r.result); source = "App Store search results via DataForSEO"; } else { const j = await getJson(appleSearchUrl(w, app.country)); rows = appleSearchRows(j); source = "Apple iTunes Search API (its order is not exactly the App Store's own search order)"; if (!r.off) stopped ??= r.why; } } }
      else { const r = await b.queued("/app_data/google/app_searches", { keyword: w, location_name: countryName(app.country) ?? "United States", language_code: "en", depth: 30 }, { worst: WORST.appTask, what: `Google Play search "${w}"` }); if (r.ok) { rows = searchRows(r.result); source = "Google Play search results via DataForSEO"; } else { stopped ??= r.why; } }
      if (rows) searches.push({ keyword: w, rows, source, volume: held.get(w)?.volume ?? null });
    }
    if (!searches.length) return { refused: stopped ?? (app.store === "ms" ? "No store search data exists for the Microsoft Store; the words are checked against your listing only." : "No search results came back.") };
    const t = keywordTable(app.id, searches); app.keywordTable = { rows: t.rows, gaps: t.gaps, on: today(now) }; app.competitors = t.competitors.slice(0, ASO.competitors).map((c) => ({ ...c, rhythm: c.updated ? rhythmOf(c.updated, today(now)) : null }));
    app.history = addRanks(app.history, { appId: app.id, store: app.store, country: app.country, on: today(now), rows: t.rows });
    x.apps[x.current] = app; keep(id, "aso", x); return { ok: true, line: `${searches.length} words checked; the app is in the top 10 for ${t.rows.filter((r) => r.rank && r.rank <= 10).length}.${stopped ? ` Some words were not checked: ${stopped}` : ""}` };
  }
  async function asoWrite(id, input) {
    const x = load(id, "aso"), app = asoApp(id); if (!app?.listing) return { refused: "Read your listing first." };
    const a = aiArgs("aso"); if (!a.key) return { refused: "Connect your AI first (Settings → Your AI connection)." };
    const r = await writeListing(app.listing, { ...a, keywords: [...(app.keywordTable?.gaps ?? []), ...(app.keywords ?? [])], language: clean(input.language) || "English" });
    if (!r.write) return { refused: r.why }; app.write = { ...r.write, faults: r.faults, language: clean(input.language) || "English", on: today(now) };
    x.apps[x.current] = app; keep(id, "aso", x); return { ok: true, line: r.faults.length ? `Written, but check these before you use it: ${r.faults.join("; ")}.` : "A new listing is written, inside the store's limits. Copy what you like; nothing is sent to the store." };
  }
  async function asoReviews(id) {
    const x = load(id, "aso"), app = asoApp(id); if (!app?.listing) return { refused: "Read your listing first." };
    if (app.store === "ms") return { refused: "Microsoft Store reviews have no data route Visibility may use; paste them into Local SEO → Reviews is not for apps — reply in Partner Center." };
    const b = buyer("aso"), path = app.store === "play" ? "/app_data/google/app_reviews" : "/app_data/apple/app_reviews";
    const r = await b.queued(path, { app_id: app.id, location_name: countryName(app.country) ?? "United States", language_code: "en", depth: ASO.reviewsDepth }, { worst: WORST.appTask * 2, what: `reviews of ${app.id}` });
    if (!r.ok) return { refused: r.why }; const rows = reviewRows(r.result), g = groupReviews(rows);
    const a = aiArgs("aso"), rep = a.key ? await draftReplies(rows, { ...a, appName: app.listing.title }) : { ok: false, why: "Connect your AI to draft replies." };
    app.reviews = { on: today(now), count: g.count, average: g.average, unanswered: g.unanswered, groups: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.slice(0, 5).map((y) => ({ stars: y.stars, text: y.text.slice(0, 300), on: y.on }))])), counts: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.length])), replies: rep.replies ?? [], why: rep.ok ? null : rep.why };
    x.apps[x.current] = app; keep(id, "aso", x); return { ok: true, line: `${g.count} reviews read; ${g.unanswered} low ones have no answer yet.${rep.replies?.length ? ` ${rep.replies.length} reply drafts wait for your approval.` : ""}` };
  }
  function asoView(id) {
    const x = load(id, "aso"), app = asoApp(id), L = app?.listing, sections = [];
    if (app?.score) sections.push({ title: `Listing score: ${app.score.score} of 100`, read: app.score.read, lines: app.score.lines });
    if (app?.keywordTable) sections.push({ title: "Keywords in the store", read: `Checked ${app.keywordTable.on}. Source per word in the table.`, table: { cols: ["Word", "Your rank", "Top apps", "Difficulty", "What to do", "Source"], rows: app.keywordTable.rows.map((r) => [r.keyword, r.rank ?? "not in top 30", r.top.join(" · "), r.difficulty, r.opportunity, r.source ?? ""]) } });
    if (app?.competitors?.length) sections.push({ title: "Competitors", read: "The apps above you for your words.", table: { cols: ["App", "Developer", "Best rank", "Rating", "Votes", "Price", "Your words they hold"], rows: app.competitors.map((c) => [c.title, c.developer, c.best, c.rating ?? "–", c.votes ?? "–", c.price === 0 ? "free" : c.price ?? "–", c.keywords.join(", ")]) } });
    if (app?.history?.points?.length) sections.push({ title: "Your rank over time", chart: { series: rankSeries(app.history), invert: true } });
    if (app?.write) { const w = app.write, lim = STORES[app.store].limits; sections.push({ title: `A better listing (${w.language}, written ${w.on})`, read: "Written by your AI from your own listing only. Check it, then copy what you like; nothing is sent to the store.", lines: (w.faults ?? []).map((f) => ({ ok: false, line: f, problem: f, solution: "Edit it before you use it.", ready: [] })), ready: [{ label: `Title${lim.title ? ` (≤ ${lim.title})` : ""}`, text: w.title }, ...(app.store !== "ms" ? [{ label: app.store === "apple" ? `Subtitle (≤ ${lim.short})` : `Short description (≤ ${lim.short})`, text: w.short }] : []), { label: "Description", text: w.long }, ...(app.store === "apple" ? [{ label: "Keyword field (≤ 100)", text: w.keywordField }] : []), ...(w.captions ?? []).map((c, i) => ({ label: `Screenshot caption ${i + 1}`, text: c })), { label: "What's new", text: w.whatsNew }].filter((r) => r.text).map((r) => ({ ...r, source: "your AI, from your listing" })) }); }
    if (app?.reviews) { const v = app.reviews; sections.push({ title: `Reviews (${v.count} read ${v.on})`, read: `Average ${v.average ? v.average.toFixed(1) : "–"} stars. Bugs ${v.counts.bugs}, prices ${v.counts.prices}, feature wishes ${v.counts.features}, praise ${v.counts.praise}, other ${v.counts.other}.`, lines: Object.entries(v.groups).flatMap(([k, rs]) => rs.slice(0, 2).map((r) => ({ ok: null, line: `${k}: ${r.stars ?? "–"}★ "${r.text}"` }))), ready: v.replies.map((r) => ({ label: `Reply to a ${r.stars ?? "–"}★ review`, text: r.reply, source: "draft by your AI — approve before you post it in the store", for: r.text.slice(0, 80) })), note: v.why } ); }
    if (L) { const s = siteLinks(L, { site: d.productOf(id)?.site, gaps: app.keywordTable?.gaps ?? [] }); sections.push({ title: "Your app and your website", read: s.badge.note, ready: [{ label: "Store button text", text: s.badge.text, source: STORES[app.store].name }, ...(s.badge.link ? [{ label: "Store link", text: s.badge.link, source: STORES[app.store].name }] : [])], lines: s.pages.map((p) => ({ ok: null, line: p.page })) }); }
    return { job: "aso", ...JOBS.aso, money: moneyLine("aso"), apps: Object.values(x.apps ?? {}).map((a) => ({ link: a.link, title: a.listing?.title ?? a.id, store: STORES[a.store]?.name })),
      fields: [{ name: "link", label: "Your app's store link", value: app?.link ?? "", placeholder: "https://play.google.com/store/apps/details?id=… or https://apps.apple.com/…/id… or https://apps.microsoft.com/detail/9…" }, { name: "keywords", label: "Words people search for your app (comma between)", value: (app?.keywords ?? []).join(", "), kind: "area" }, { name: "keywordField", label: "Apple only: your keyword field (it is private, paste it)", value: app?.listing?.keywordsField ?? "" }, { name: "title", label: "Microsoft Store (or to add what the store data lacks): title", value: "" }, { name: "short", label: "Subtitle / short description", value: "" }, { name: "long", label: "Description", value: "", kind: "area" }, { name: "language", label: "Language to write in", value: "English" }],
      buttons: [{ press: "read", label: "Read my listing", cost: "Free on Apple; a cent on Google Play" }, { press: "keywords", label: "Check my words and competitors", cost: "About $0.002 a word (your search-data account)" }, { press: "write", label: "Write a better listing with AI", cost: "About $0.03 (your AI)" }, { press: "reviews", label: "Read reviews and draft replies", cost: "About $0.01 + $0.02 AI" }], sections };
  }

  /* ───────────── LOCAL ───────────── */
  async function localSave(id, input) { const x = load(id, "local"), { profile, missing } = cleanProfile({ ...(x.profile ?? {}), ...Object.fromEntries(Object.entries(input).filter(([, v]) => v != null)) }); x.profile = profile; keep(id, "local", x); return { ok: true, line: missing.length ? `Saved. Still missing: ${missing.join(", ")}.` : "Saved." }; }
  async function localCheck(id, input) {
    await localSave(id, input); const x = load(id, "local"), p = x.profile, { missing } = cleanProfile(p); if (missing.length) return { refused: `First fill in: ${missing.join(", ")}.` };
    const urls = [...new Set([p.website, ...(d.sitePages(id) ?? []).filter((u) => /contact|about|location|find|visit|impressum|kontakt/i.test(u)).slice(0, 4)].filter(Boolean))].slice(0, 5), pages = [];
    for (const u of urls) { const h = await getHtml(u); if (h) pages.push(pageOf(u, h)); await pace(d.pageMs ?? 1000); }
    const site = siteNap(pages, p), sources = pages.length ? [{ source: "your website", name: site.names[0] ?? "", address: site.addresses.length ? p.street : "", phone: site.phones.includes(digits(p.phone)) ? p.phone : site.phones[0] ?? "" }] : [];
    for (const m of site.markup) sources.push({ source: `your site's markup (${m.page})`, name: m.name, address: m.address, phone: m.phone });
    const b = buyer("local"), r = await b.live(LOCAL.mapsPath, mapsTask(`${p.name} ${p.city}`, { location: countryName(p.country.slice(0, 2)) ?? p.country, language: "en" }), { worst: WORST.mapsLive, what: `Google Maps listing of ${p.name}` });
    let google = null; if (r.ok) { google = mapsMatch(r.result, p); if (google.found) sources.push({ source: "Google (Maps listing)", name: google.found.title, address: google.found.address, phone: google.found.phone }); }
    for (const line of String(input.listings ?? x.listings ?? "").split(/\n/).map(clean).filter(Boolean)) { const [src, name, address, phone] = line.split("|").map(clean); if (src) sources.push({ source: src, name: name ?? null, address: address ?? null, phone: phone ?? null }); }
    if (input.listings != null) x.listings = input.listings;
    const nap = napConsistency(p, sources); x.nap = { on: today(now), score: nap.score, lines: nap.lines, google: google?.found ?? null, googleWhy: r.ok ? (google?.found ? null : "Google's map results for your name and city do not show your business: claim or add it in Google Business Profile.") : r.why };
    keep(id, "local", x); return { ok: true, line: `Name, address and phone: ${nap.score ?? "–"}% the same across ${new Set(sources.map((s) => s.source)).size} places.` };
  }
  const geocode = async (q) => { const j = await getJson(`${LOCAL.nominatim}?q=${encodeURIComponent(q)}&format=json&limit=1`); const g = Array.isArray(j) ? j[0] : null; return g ? `${Number(g.lat).toFixed(5)},${Number(g.lon).toFixed(5)},14z` : null; };
  async function localRank(id, input) {
    await localSave(id, input); const x = load(id, "local"), p = x.profile, words = listOf(p.keywords).slice(0, 5), cities = (listOf(p.cities).length ? listOf(p.cities) : [p.city]).slice(0, 5);
    if (!words.length) return { refused: "Give the words customers search (Keywords), e.g. \"halal restaurant\"." };
    const b = buyer("local"), rows = []; let stopped = null;
    for (const c of cities) { const coord = await geocode(`${c}, ${p.country}`); await pace(d.geoMs ?? 1100); for (const w of words) { const r = await b.live(LOCAL.mapsPath, mapsTask(w, coord ? { coordinate: coord } : { location: countryName(p.country.slice(0, 2)) ?? p.country }), { worst: WORST.mapsLive, what: `local results "${w}" in ${c}` }); if (!r.ok) { stopped = r.why; break; } const m = mapsMatch(r.result, p); rows.push({ city: c, keyword: w, rank: m.found?.rank ?? null, top: m.top.slice(0, 3).map((t) => t.title), on: today(now), source: `Google Maps results via DataForSEO${coord ? ` around ${c}` : ""}` }); } if (stopped) break; }
    x.ranks = [...(x.ranks ?? []).filter((r) => r.on !== today(now)), ...rows].slice(-2000); keep(id, "local", x);
    return { ok: Boolean(rows.length), line: `${rows.length} local results read; you are in the top 3 for ${rows.filter((r) => r.rank && r.rank <= 3).length}.${stopped ? ` Stopped: ${stopped}` : ""}`, ...(rows.length ? {} : { refused: stopped }) };
  }
  async function localReviews(id, input) {
    const x = load(id, "local"), p = x.profile; if (!p?.name) return { refused: "Save your business first." };
    let rows = String(input.reviews ?? "").split(/\n/).map(clean).filter(Boolean).map((t, i) => { const m = /^([1-5])\s*[★*]?\s*[|:-]\s*(.+)$/.exec(t); return { id: `p${i}`, stars: m ? Number(m[1]) : null, text: m ? m[2] : t, answered: false }; });
    let source = "the reviews you pasted";
    if (!rows.length) { const cid = x.nap?.google?.cid; if (!cid) return { refused: "Press Check my name, address and phone first (it finds your Google listing), or paste your reviews (one per line, e.g. \"2 | slow service\")." }; const b = buyer("local"), r = await b.queued(LOCAL.reviewsPath, { cid, location_name: countryName(p.country.slice(0, 2)) ?? p.country, language_code: "en", depth: 40 }, { worst: WORST.appTask * 2, what: `Google reviews of ${p.name}`, getPath: "/task_get/" }); if (!r.ok) return { refused: r.why }; rows = reviewRows(r.result).map((v, i) => ({ ...v, id: v.id ?? `g${i}` })); source = "Google reviews via DataForSEO"; }
    const g = groupReviews(rows), a = aiArgs("local"), rep = a.key ? await draftReplies(rows, { ...a, appName: p.name }) : { ok: false, why: "Connect your AI to draft replies." };
    x.reviews = { on: today(now), source, count: g.count, average: g.average, unanswered: g.unanswered, counts: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.length])), groups: Object.fromEntries(Object.entries(g.groups).map(([k, v]) => [k, v.slice(0, 3).map((y) => ({ stars: y.stars, text: y.text.slice(0, 300) }))])), replies: rep.replies ?? [], why: rep.ok ? null : rep.why };
    keep(id, "local", x); return { ok: true, line: `${g.count} reviews read (${source}).${rep.replies?.length ? ` ${rep.replies.length} reply drafts wait for your approval.` : ""}` };
  }
  async function localDirectory(id, input) {
    const kind = clean(input.kind).toLowerCase(), city = clean(input.city); if (!DIRECTORY_KINDS[kind]) return { refused: `Choose what to list: ${Object.keys(DIRECTORY_KINDS).join(", ")}.` }; if (!city) return { refused: "Give the city." };
    const j = await getJson(d.overpassUrl ?? LOCAL.overpass, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(overpassQuery(kind, city))}` });
    if (!j || j.error) return { refused: "OpenStreetMap's public server did not answer; try again later." };
    const places = placesOf(j), pg = directoryPage({ kind, city, places, on: today(now), product: d.productOf(id)?.name }), x = load(id, "local");
    (x.directory ??= {})[pg.slug] = { title: pg.title, slug: pg.slug, places: pg.places, indexable: pg.indexable, on: today(now), source: pg.source, sample: places.slice(0, 8) }; keep(id, "local", x); d.pwrite(id, `directory-${pg.slug}.html`, pg.html);
    return { ok: true, line: `${pg.title}: ${pg.places} places from OpenStreetMap (${pg.indexable ? "enough for Google" : "fewer than 6: the page stays out of Google until it has more"}). The draft is saved with your pages' files.` };
  }
  function localView(id) {
    const x = load(id, "local"), p = x.profile ?? {}, sections = [];
    if (x.nap) sections.push({ title: `Name, address and phone: ${x.nap.score ?? "–"}% the same`, read: `Checked ${x.nap.on}.${x.nap.googleWhy ? ` ${x.nap.googleWhy}` : ""}`, lines: x.nap.lines });
    if (x.nap?.google) { const g = x.nap.google; sections.push({ title: "Your Google listing", read: "As Google's map results show it (DataForSEO).", lines: [{ ok: true, line: `${g.title} · ${g.address} · ${g.phone || "no phone"} · ${g.category || "no category"}` }, g.claimed === false ? { ok: false, line: "The listing is not claimed.", problem: "Your Google listing is not claimed by you.", solution: "Claim it in Google Business Profile so you can fix its details and answer reviews.", ready: [] } : { ok: true, line: "The listing is claimed." }, { ok: g.rating == null ? null : g.rating >= 4, line: `${g.rating ?? "–"}★ from ${g.votes} reviews.` }] }); }
    if (x.ranks?.length) { const last = x.ranks.filter((r) => r.on === x.ranks[x.ranks.length - 1].on); sections.push({ title: "Where you stand on the map", read: `Read ${last[0]?.on}. ${last[0]?.source ?? ""}`, table: { cols: ["City", "Words", "Your place", "Top 3"], rows: last.map((r) => [r.city, r.keyword, r.rank ?? "not in top 20", r.top.join(" · ")]) } }); }
    if (x.reviews) { const v = x.reviews; sections.push({ title: `Reviews (${v.count}, ${v.source}, ${v.on})`, read: `Average ${v.average ? v.average.toFixed(1) : "–"} stars. Problems ${v.counts.bugs}, prices ${v.counts.prices}, wishes ${v.counts.features}, praise ${v.counts.praise}.`, lines: Object.entries(v.groups).flatMap(([k, rs]) => rs.slice(0, 2).map((r) => ({ ok: null, line: `${k}: ${r.stars ?? "–"}★ "${r.text}"` }))), ready: v.replies.map((r) => ({ label: `Reply to a ${r.stars ?? "–"}★ review`, text: r.reply, source: "draft by your AI — approve before you post it", for: r.text.slice(0, 80) })), note: v.why }); }
    if (p.name) sections.push({ title: "Copy to your site and your listings", read: "Nothing is sent: you add these yourself.", ready: [{ label: "LocalBusiness markup for your site (in a <script type=\"application/ld+json\"> on your home and contact pages)", text: localBusinessJsonLd(p), source: "your profile in Visibility" }, { label: "Google Business Profile bulk-upload sheet (CSV)", text: gbpSheet(p), source: "Google's bulk-upload columns" }], lines: LISTING_PLACES.map((l) => ({ ok: null, line: `${l.name} — ${l.url} — ${l.how}` })) });
    if (p.name) sections.push({ title: "A page for each city or area you serve", read: "Made through Create SEO pages, like every other page: open \"How many pages can I make for this product?\", choose Cities, type your cities (one per line), and press Make these pages (drafts). A city is kept only where your own site names it, and each page passes the same checks before it can go out.", lines: listOf(p.cities).map((c) => ({ ok: null, line: `${c}: a page answering what people in ${c} search for your service.` })) });
    if (x.directory) sections.push({ title: "Directory pages (places from open data)", read: "Links only: name, address, website and map link, with source and date. A page with fewer than 6 places stays out of Google.", table: { cols: ["Page", "Places", "In Google", "Checked", "Source"], rows: Object.values(x.directory).map((g) => [g.title, g.places, g.indexable ? "yes" : "not yet", g.on, g.source.name]) } });
    return { job: "local", ...JOBS.local, money: moneyLine("local"),
      fields: [["name", "Business name"], ["street", "Street address"], ["city", "City"], ["region", "Region / state"], ["postcode", "Postcode"], ["country", "Country (2 letters, e.g. GB)"], ["phone", "Phone"], ["website", "Website"], ["hours", "Hours (e.g. Mon-Fri 09:00-17:00; Sat 10:00-14:00)"], ["categories", "Categories (comma between)"], ["keywords", "Words customers search (comma between)"], ["cities", "Cities or areas you serve (comma between)"]].map(([name, label]) => ({ name, label, value: p[name] ?? "" }))
        .concat([{ name: "listings", label: "Other listings, one per line: where | name | address | phone (e.g. Bing Places | …)", value: x.listings ?? "", kind: "area" }, { name: "reviews", label: "Or paste reviews, one per line: stars | text", value: "", kind: "area" }, { name: "kind", label: `Directory: what to list (${Object.keys(DIRECTORY_KINDS).join(", ")})`, value: "" }, { name: "city", label: "Directory: city", value: "" }]),
      buttons: [{ press: "save", label: "Save my business", cost: "Free" }, { press: "check", label: "Check my name, address and phone", cost: "About $0.002 (your search-data account)" }, { press: "rank", label: "Where am I on the map?", cost: "About $0.002 per word and city" }, { press: "reviews", label: "Read reviews and draft replies", cost: "About $0.01 + $0.02 AI" }, { press: "directory", label: "Make a directory page", cost: "Free (OpenStreetMap)" }], sections };
  }

  /* ───────────── TECHNICAL ───────────── */
  async function techRun(id, input) {
    const site = d.productOf(id)?.site; if (!site) return { refused: "Add your website first." };
    const urls = [...new Set([site, ...listOf(input.pages), ...(d.sitePages(id) ?? []).slice(0, 4)])].slice(0, Number(input.max) > 0 ? Math.min(10, Number(input.max)) : 5), psiKey = d.keys.saved("PAGESPEED_API_KEY") ? d.keys.get("PAGESPEED_API_KEY") : null, gsc = d.gscSite(id), lines = [], speed = [];
    for (const u of urls) {
      const p = psiResult(await getJson(psiUrl(u, { key: psiKey })), u); speed.push(p); lines.push(...speedLines(p));
      const c = await redirectChain(u, { fetchImpl, ua: USER_AGENT }); lines.push(...redirectLines(u, c));
      const h = c.status === 200 ? await getHtml(c.final) : null; if (h) lines.push(...schemaLines(u, schemaCheck(h)));
      if (gsc && d.google) lines.push(indexLine(u, await d.google.inspect(gsc, c.final).catch(() => null)));
      await pace(d.pageMs ?? 1000);
    }
    const x = { on: today(now), pages: urls, lines, score: linesScore(lines), speed: speed.filter((s) => s.ok).map((s) => ({ page: s.page, score: s.score, vitals: s.vitals })), indexed: Boolean(gsc) }; keep(id, "tech", x);
    return { ok: true, line: `${urls.length} pages tested: ${lines.filter((l) => l.ok === false).length} problems.` };
  }
  function techView(id) {
    const x = load(id, "tech"), sections = [];
    if (x.on) { const by = (a) => x.lines.filter((l) => l.area === a); for (const a of ["Speed", "Structured data", "Redirects", "Indexed"]) if (by(a).length) sections.push({ title: a, read: a === "Speed" ? `Tested ${x.on} with Google's PageSpeed Insights (phone). Core Web Vitals are from real Chrome users where Google has them.` : a === "Indexed" ? "From your Search Console (URL Inspection)." : `Checked ${x.on}.`, lines: by(a).sort((p, q) => (p.ok === false ? -1 : 0) - (q.ok === false ? -1 : 0)) }); if (!x.indexed) sections.push({ title: "Indexed", lines: [{ ok: null, line: "Connect Google Search Console to see whether Google has each page." }] }); if (x.speed?.length) sections.push({ title: "Speed by page", table: { cols: ["Page", "Lab score (phone)", ...["Largest Contentful Paint", "Interaction to Next Paint", "Cumulative Layout Shift"]], rows: x.speed.map((s) => [s.page, s.score, ...["Largest Contentful Paint", "Interaction to Next Paint", "Cumulative Layout Shift"].map((n) => { const v = s.vitals.find((y) => y.name === n); return v ? `${v.value}${v.unit === "ms" ? " ms" : ""} (${String(v.category).toLowerCase()})` : "no real-user data"; })]) } }); }
    sections.push({ title: "Also in Visibility", read: "Canonical, robots.txt, sitemap and noindex are in \"SEO check\"; broken links in \"Links check\"; hreflang in \"Languages\".", lines: [] });
    return { job: "tech", ...JOBS.tech, money: "Free: Google's PageSpeed Insights (add your own PageSpeed key in Settings for a higher daily limit) and your Search Console.", score: x.score ?? null,
      fields: [{ name: "pages", label: "Pages to test (one per line; your home page and your main pages are tested anyway)", value: "", kind: "area" }, { name: "max", label: "How many pages at most (up to 10)", value: "5" }], buttons: [{ press: "run", label: "Test my pages", cost: "Free" }], sections };
  }

  /* ───────────── RANK TRACKING ───────────── */
  async function rankRun(id, input = {}) {
    const x = load(id, "rank"); if (input.keywords != null) x.chosen = chosenKeywords(String(input.keywords).split(/\n/).map((l) => { const [k, c] = l.split("|").map(clean); return { keyword: k, country: c || "us" }; })); if (input.every) x.every = input.every === "day" ? "day" : "week";
    const gsc = d.gscSite(id), on = today(now);
    if (input.suggest && gsc && d.google) { const rows = await d.google.analytics(gsc, { startDate: new Date(now() - 31 * 864e5).toISOString().slice(0, 10), endDate: new Date(now() - 3 * 864e5).toISOString().slice(0, 10), dimensions: ["query", "country"] }); if (rows) x.chosen = chosenKeywords(suggestKeywords(rows, 20)); keep(id, "rank", x); return { ok: true, line: `${x.chosen?.length ?? 0} words suggested from your Search Console. Change them if you like, then press Check my positions.` }; }
    if (!x.chosen?.length) { keep(id, "rank", x); return { refused: "Choose your words first: one per line, \"words | country\" (e.g. oet for nurses | gb), or press Suggest from Search Console." }; }
    let h = d.pread(id, "rank-history.json", null) ?? { points: [] }, n = 0, stopped = null;
    if (gsc && d.google) { const rows = await d.google.analytics(gsc, { startDate: new Date(now() - 10 * 864e5).toISOString().slice(0, 10), endDate: new Date(now() - 3 * 864e5).toISOString().slice(0, 10), dimensions: ["query", "country"], rowLimit: 25000 }); for (const p of scPositions(rows ?? [], x.chosen)) { const c = x.chosen.find((k) => `${k.keyword}|${k.country}` === p.key); h = keepPoint(h, { key: p.key, keyword: c.keyword, country: c.country, engine: "Google (Search Console average)", on, rank: p.position, source: "your Search Console, last 7 days" }); n++; } }
    const domain = hostOf(d.productOf(id)?.site), b = buyer("rank");
    if (domain) for (const k of x.chosen.slice(0, RANK.perRun)) for (const [engine, path] of [["Google", RANK.google], ["Bing", RANK.bing]]) { const r = await b.queued(path, serpTask(k.keyword, k.country), { worst: RANK.worstTask, what: `${engine} position "${k.keyword}" (${k.country})`, waitMs: 0 }); if (!r.ok && !r.later) break; } /* posted first, collected below */
    if (domain) for (const k of x.chosen.slice(0, RANK.perRun)) for (const [engine, path] of [["Google", RANK.google], ["Bing", RANK.bing]]) { const r = await b.queued(path, serpTask(k.keyword, k.country), { worst: RANK.worstTask, what: `${engine} position "${k.keyword}" (${k.country})` }); if (!r.ok) { if (!r.later) stopped ??= r.why; continue; } const s = serpPosition(r.result, domain); h = keepPoint(h, { key: `${k.keyword}|${k.country}`, keyword: k.keyword, country: k.country, engine, on, rank: s.rank, url: s.url, above: s.above, source: `${engine} results via DataForSEO` }); n++; }
    d.pwrite(id, "rank-history.json", h); x.last = on; keep(id, "rank", x);
    return { ok: n > 0, line: `${n} positions kept for ${on}.${stopped ? ` Not all were read: ${stopped}` : ""}${!gsc ? " Connect Search Console for Google's own average positions (free)." : ""}`, ...(n ? {} : { refused: stopped ?? "No position could be read." }) };
  }
  function rankView(id) {
    const x = load(id, "rank"), h = d.pread(id, "rank-history.json", null), sections = [];
    if (h?.points?.length) { sections.push({ title: "Your positions over time", read: "Position 1 is the top. Each point has its date and source.", chart: { series: rankChart(h), invert: true } }); sections.push({ title: "Latest positions", table: { cols: ["Words", "Country", "Engine", "Position", "Change", "Your page", "Checked", "Source"], rows: rankTable(h).map((r) => [r.keyword, r.country, r.engine, r.rank ?? "not in top 30", r.change == null ? "–" : r.change > 0 ? `▲ ${Math.round(r.change * 10) / 10}` : r.change < 0 ? `▼ ${Math.round(-r.change * 10) / 10}` : "=", r.url ?? "", r.on, r.source]) } }); }
    return { job: "rank", ...JOBS.rank, money: moneyLine("rank"), due: x.last ? `Last checked ${x.last}; next ${x.every === "day" ? "tomorrow" : "in a week"} (Visibility checks by itself when it is open).` : null,
      fields: [{ name: "keywords", label: "Your words, one per line: words | country (2 letters)", value: (x.chosen ?? []).map((k) => `${k.keyword} | ${k.country}`).join("\n"), kind: "area" }, { name: "every", label: "How often: week or day", value: x.every ?? "week" }],
      buttons: [{ press: "suggest", label: "Suggest from Search Console", cost: "Free" }, { press: "run", label: "Check my positions", cost: "Free from Search Console; about $0.001 a word on Google and on Bing" }], sections };
  }

  /* ───────────── CTR FIXES ───────────── */
  async function ctrFind(id) {
    const gsc = d.gscSite(id); if (!gsc || !d.google) return { refused: "Connect Google Search Console first (it says how often each page is shown and clicked)." };
    const rows = await d.google.analytics(gsc, { startDate: new Date(now() - 31 * 864e5).toISOString().slice(0, 10), endDate: new Date(now() - 3 * 864e5).toISOString().slice(0, 10), dimensions: ["page"], rowLimit: 5000 }); if (!rows) return { refused: "Search Console gave no rows." };
    const x = load(id, "ctr"); x.found = { on: today(now), pages: lowCtrPages(rows).slice(0, 20) }; keep(id, "ctr", x); return { ok: true, line: `${x.found.pages.length} pages are shown often but clicked much less than your other pages at the same position.` };
  }
  async function ctrWrite(id, input) {
    const url = clean(input.page) || load(id, "ctr").found?.pages?.[0]?.page; if (!url) return { refused: "Press Find pages first, or give a page." };
    const a = aiArgs("ctr"); if (!a.key) return { refused: "Connect your AI first (Settings → Your AI connection)." };
    const h = await getHtml(url); if (!h) return { refused: "The page could not be opened." }; const page = pageOf(url, h);
    const gsc = d.gscSite(id), q = gsc && d.google ? await d.google.analytics(gsc, { startDate: new Date(now() - 31 * 864e5).toISOString().slice(0, 10), endDate: new Date(now() - 3 * 864e5).toISOString().slice(0, 10), dimensions: ["query"], rowLimit: 10, filters: [{ dimension: "page", operator: "equals", expression: url }] }) : null;
    const r = await writeCtr(page, { ...a, queries: (q ?? []).map((y) => y.keys[0]) }); if (!r.ok) return { refused: r.why ?? "Every option your AI wrote broke a rule; nothing is offered." };
    const x = load(id, "ctr"); (x.written ??= {})[url] = { on: today(now), before: { title: page.title, description: page.description }, titles: r.titles, descriptions: r.descriptions, refused: r.refused.length }; keep(id, "ctr", x);
    return { ok: true, line: `${r.titles.length} titles and ${r.descriptions.length} descriptions written for ${url}.${r.refused.length ? ` ${r.refused.length} options were refused (a number not on the page, too long, or a promise).` : ""}` };
  }
  async function ctrChanged(id, input) {
    const url = clean(input.page), on = clean(input.on) || today(now); if (!url) return { refused: "Give the page you changed." }; if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return { refused: "Give the day as YYYY-MM-DD." };
    const x = load(id, "ctr"); (x.changes ??= {})[url] = { on, title: clean(input.newTitle) || null }; keep(id, "ctr", x); return { ok: true, line: `Noted: ${url} changed on ${on}. Press Compare after 28 days.` };
  }
  async function ctrCompare(id) {
    const gsc = d.gscSite(id), x = load(id, "ctr"); if (!gsc || !d.google) return { refused: "Connect Google Search Console first." }; if (!Object.keys(x.changes ?? {}).length) return { refused: "Tell Visibility which page you changed and when (I changed it)." };
    for (const [url, c] of Object.entries(x.changes)) { const rows = await d.google.analytics(gsc, { startDate: new Date(Date.parse(c.on) - 29 * 864e5).toISOString().slice(0, 10), endDate: new Date(now() - 3 * 864e5).toISOString().slice(0, 10), dimensions: ["date"], filters: [{ dimension: "page", operator: "equals", expression: url }] }); if (rows) c.result = { ...beforeAfter(rows, c.on), read: today(now) }; }
    keep(id, "ctr", x); return { ok: true, line: "Before and after read from Search Console." };
  }
  function ctrView(id) {
    const x = load(id, "ctr"), sections = [];
    if (x.found) sections.push({ title: "Pages shown often, clicked rarely", read: `From your Search Console, the last 28 days (read ${x.found.on}). Compared with your own pages at the same position.`, table: { cols: ["Page", "Shown", "Clicks", "Click rate", "Your usual rate at this position", "Position"], rows: x.found.pages.map((p) => [p.page, p.impressions, p.clicks, `${(p.ctr * 100).toFixed(1)}%`, `${(p.siteMedian * 100).toFixed(1)}%`, p.position]) } });
    for (const [url, w] of Object.entries(x.written ?? {})) sections.push({ title: `Better title and description: ${url}`, read: `Written ${w.on} by your AI from the page's own words. Now: "${w.before.title}" / "${w.before.description || "(no description)"}". Change it on your site, then press I changed it.`, ready: [...w.titles.map((t, i) => ({ label: `Title option ${i + 1} (${t.length} characters)`, text: t, source: "your AI, from the page" })), ...w.descriptions.map((t, i) => ({ label: `Description option ${i + 1} (${t.length} characters)`, text: t, source: "your AI, from the page" }))] });
    if (Object.keys(x.changes ?? {}).length) sections.push({ title: "Before and after", table: { cols: ["Page", "Changed on", "Click rate before → after (28 days each)", "Read"], rows: Object.entries(x.changes).map(([u, c]) => [u, c.on, c.result?.line ?? "press Compare", c.result?.read ?? ""]) } });
    return { job: "ctr", ...JOBS.ctr, money: "Free: your Search Console. Writing uses your AI (about $0.02 a page).", fields: [{ name: "page", label: "Page (for writing, or the page you changed)", value: "" }, { name: "on", label: "Day you changed it (YYYY-MM-DD)", value: "" }, { name: "newTitle", label: "The new title you used (optional)", value: "" }],
      buttons: [{ press: "find", label: "Find pages to fix", cost: "Free" }, { press: "write", label: "Write a better title and description", cost: "About $0.02 (your AI)" }, { press: "changed", label: "I changed it", cost: "Free" }, { press: "compare", label: "Compare before and after", cost: "Free" }], sections };
  }

  /* ───────────── AI SEARCH VISIBILITY ───────────── */
  const engineSpent = () => { const l = d.engines.read(), m = new Date(now()).toISOString().slice(0, 7); return (l.spent ?? []).filter((s) => String(s.on).startsWith(m)).reduce((t, s) => t + (Number(s.usd) || 0), 0); };
  async function aivRun(id, input = {}) {
    const x = load(id, "aiv"), prod = d.productOf(id) ?? {};
    x.setup = { brand: clean(input.brand) || x.setup?.brand || prod.name || "", aliases: input.aliases != null ? listOf(input.aliases) : x.setup?.aliases ?? [], domain: clean(input.domain) || x.setup?.domain || hostOf(prod.site) || "", competitors: input.competitors != null ? listOf(input.competitors) : x.setup?.competitors ?? [], questions: input.questions != null ? String(input.questions).split(/\n/).map(clean).filter(Boolean) : x.setup?.questions ?? [], engines: input.engines != null ? listOf(input.engines).map((e) => e.toLowerCase()).filter((e) => ENGINES[e]) : x.setup?.engines ?? ["claude", "chatgpt", "perplexity", "gemini", "aio"] };
    if (input.suggest) { x.setup.questions = questionSet({ own: x.setup.questions, asked: d.asked(id) ?? [], phrases: (d.phrases(id) ?? []).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)), brand: x.setup.brand, max: 10 }).map((q) => q.question); keep(id, "aiv", x); return { ok: true, line: `${x.setup.questions.length} questions suggested from the searches and questions Visibility holds. Change them if you like, then press Ask the assistants.` }; }
    if (!x.setup.brand) return { refused: "Give your brand's name." }; if (!x.setup.questions.length) { keep(id, "aiv", x); return { refused: "Give the questions (one per line), or press Suggest questions." }; }
    const qs = x.setup.questions.slice(0, Number(input.max) > 0 ? Math.min(Number(input.max), 30) : 30), rows = [], on = today(now), cap = d.engines.cap(), skipped = new Set(), b = buyer("aiv");
    const opts = { brand: x.setup.brand, aliases: x.setup.aliases, domain: x.setup.domain, competitors: x.setup.competitors };
    for (const q of qs) for (const e of x.setup.engines) {
      if (skipped.has(e)) continue; let a = null;
      if (e === "aio") { const r = await b.live(ENGINES.aio.path, aioTask(q), { worst: WORST.organicAiLive, what: `AI Overview "${q.slice(0, 60)}"` }); if (!r.ok) { if (r.off || /cap|budget/i.test(r.why ?? "")) skipped.add(e); rows.push({ question: q, engine: e, on, fail: r.why }); continue; } a = aiOverviewOf(r.result); if (a.none) { rows.push({ question: q, engine: e, on, none: true, line: "Google showed no AI Overview for this search." }); continue; } }
      else if (e === "claude") { if (!d.ai.key()) { skipped.add(e); rows.push({ question: q, engine: e, on, fail: "No Anthropic key." }); continue; } if (!d.ai.allowed(ENGINES.claude.worstUsd)) { skipped.add(e); rows.push({ question: q, engine: e, on, fail: "Your Monthly AI limit is reached." }); continue; } a = await askClaude({ key: d.ai.key(), question: q, fetchImpl, ...(d.claudeUrl ? { url: d.claudeUrl } : {}) }); if (a.usage) d.ai.add(a.usage); }
      else { const ek = ENGINES[e].keyName; if (!d.keys.saved(ek)) { skipped.add(e); rows.push({ question: q, engine: e, on, fail: `No ${ENGINES[e].name} key saved (Settings → Your AI connection).` }); continue; } if (engineSpent() + ENGINES[e].worstUsd > cap) { skipped.add(e); rows.push({ question: q, engine: e, on, fail: `The assistants' monthly cap ($${cap}) is reached.` }); continue; }
        const fn = e === "chatgpt" ? askChatGpt : e === "perplexity" ? askPerplexity : askGemini; a = await fn({ key: d.keys.get(ek), question: q, fetchImpl, ...(d.engineUrls?.[e] ? { url: d.engineUrls[e] } : {}), ...(d.engineModels?.[e] ? { model: d.engineModels[e] } : {}) }); if (a.usage?.usd != null) { const l = d.engines.read(); (l.spent ??= []).push({ on: new Date(now()).toISOString(), usd: a.usage.usd, engine: e }); d.engines.write(l); } }
      if (a.fail) { if (a.stop) skipped.add(e); rows.push({ question: q, engine: e, on, fail: a.fail }); continue; }
      rows.push({ question: q, engine: e, on, ...readAnswer(a, opts), excerpt: clean(a.text).slice(0, 400), cites: (a.cites ?? []).slice(0, 8) });
    }
    const run = { on, score: visibilityScore(rows), engines: byEngine(rows), rows }; x.runs = [...(x.runs ?? []).filter((r) => r.on !== on), run].slice(-52); keep(id, "aiv", x);
    return { ok: true, line: `Score ${run.score ?? "–"} of 100 from ${rows.filter((r) => !r.fail && !r.none).length} answers (${qs.length} questions × ${x.setup.engines.length} assistants).${skipped.size ? ` Not asked: ${[...skipped].map((e) => ENGINES[e].name).join(", ")}.` : ""}` };
  }
  function aivView(id) {
    const x = load(id, "aiv"), s = x.setup ?? {}, last = x.runs?.[x.runs.length - 1], sections = [], prod = d.productOf(id) ?? {};
    if (last) {
      sections.push({ title: `AI visibility score: ${last.score ?? "–"} of 100 (${last.on})`, read: "Half for being named, half for being cited, over every answer read. What an assistant says is an observation on that day, not a promise.", table: { cols: ["Assistant", "Asked", "Answered", "Named you", "Cited your site", "Score", "Not read"], rows: last.engines.map((e) => [ENGINES[e.engine]?.name ?? e.engine, e.asked, e.answered, e.mentioned, e.cited, e.score ?? "–", e.failed + e.none]) } });
      if ((x.runs ?? []).length > 1) sections.push({ title: "Trend", chart: { series: [{ name: "Score", points: trendOf(x.runs).map((r) => ({ on: r.on, rank: r.score })) }], invert: false } });
      sections.push({ title: "Each answer", table: { cols: ["Question", "Assistant", "Named you", "Cited", "Your pages cited", "Other sites cited", "Competitors named"], rows: last.rows.map((r) => [r.question, ENGINES[r.engine]?.name ?? r.engine, r.fail ? `not read: ${r.fail}` : r.none ? "no AI answer shown" : r.mentioned ? "yes" : "no", r.cited ? "yes" : r.fail || r.none ? "–" : "no", (r.citedUrls ?? []).join(" "), (r.otherSites ?? []).join(", "), (r.competitorsNamed ?? []).join(", ")]) } });
      const sg = suggestions(last.rows, { site: prod.site }); if (sg.length) sections.push({ title: "To win the answers you are missing", lines: sg.map((g) => ({ ok: false, line: `"${g.question}": not named by ${g.engines.map((e) => ENGINES[e]?.name ?? e).join(", ")}.`, problem: `The assistants answer "${g.question}" without you.${g.citedInstead.length ? ` They cite: ${g.citedInstead.join(", ")}.` : ""}`, solution: g.do, ready: [] })) });
    }
    return { job: "aiv", ...JOBS.aiv, money: `${moneyLine("aiv")} Claude: inside your Monthly AI limit. ChatGPT, Perplexity, Gemini: your own keys, ${$(engineSpent())} of ${$(d.engines.cap())} this month (estimated from their published prices).`,
      fields: [{ name: "brand", label: "Your brand's name", value: s.brand ?? prod.name ?? "" }, { name: "aliases", label: "Other names (comma between)", value: (s.aliases ?? []).join(", ") }, { name: "domain", label: "Your site's domain", value: s.domain ?? hostOf(prod.site) ?? "" }, { name: "competitors", label: "Competitors (comma between)", value: (s.competitors ?? []).join(", ") }, { name: "questions", label: "Questions, one per line (real questions your customers ask)", value: (s.questions ?? []).join("\n"), kind: "area" }, { name: "engines", label: "Assistants (claude, chatgpt, perplexity, gemini, aio)", value: (s.engines ?? ["claude", "chatgpt", "perplexity", "gemini", "aio"]).join(", ") }],
      buttons: [{ press: "suggest", label: "Suggest questions", cost: "Free" }, { press: "run", label: "Ask the assistants", cost: "About $0.05 a question on Claude; your own keys for the others; $0.004 for Google's AI Overview" }], sections };
  }

  const VIEW = { aso: asoView, local: localView, tech: techView, rank: rankView, ctr: ctrView, aiv: aivView };
  const PRESS = { aso: { read: asoRead, keywords: asoKeywords, write: asoWrite, reviews: asoReviews }, local: { save: localSave, check: localCheck, rank: localRank, reviews: localReviews, directory: localDirectory }, tech: { run: techRun }, rank: { suggest: (id, i) => rankRun(id, { ...i, suggest: true }), run: rankRun }, ctr: { find: ctrFind, write: ctrWrite, changed: ctrChanged, compare: ctrCompare }, aiv: { suggest: (id, i) => aivRun(id, { ...i, suggest: true }), run: aivRun } };
  return Object.freeze({
    view(id, job) { return VIEW[job] ? VIEW[job](id) : null; },
    async press(id, job, what, input = {}) { const f = PRESS[job]?.[what]; if (!f) return { refused: "That is not a step of this job." }; if (d.offline && what !== "save" && what !== "changed") return { refused: "This app is offline (test)." }; const r = await f(id, input ?? {}); return { ...r, view: VIEW[job](id) }; },
    /** the weekly (or daily) round: rank tracking that is due, by itself */
    async due(id) { const x = load(id, "rank"); if (!x.chosen?.length) return null; const t = today(now), last = x.last ?? null; if (last && (Date.parse(t) - Date.parse(last)) / 864e5 < (x.every === "day" ? 1 : 7)) return null; return rankRun(id, {}); },
    /** the Data screen: one money line per job that spends */
    moneyLines() { const l = d.dfs.ledger(), n = new Date(now()).toISOString(), rows = ["aso", "local", "rank", "aiv"].map((j) => { const s = jobSpent(l, j, n); return { what: `${JOBS[j].title} (search data)`, today: $(s.today, 4), month: $(s.month, 4), cap: `at most ${$(RUN_BUDGET[j])} a run, inside your search-data caps` }; }); return [...rows, { what: "AI assistants checked (ChatGPT, Perplexity, Gemini; your own keys)", today: "–", month: $(engineSpent()), cap: `${$(d.engines.cap())} a month` }]; },
  });
}
