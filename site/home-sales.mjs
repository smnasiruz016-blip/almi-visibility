/**
 * 🔴 RR-347 (owner GREEN, 29 Oct 2026) · THE SALES HOME: YouTube at the top, the AI icon strip, the YouTube band, the day plan and a FAQ.
 * Every line says only what the app does today, each read from its code on 29 Oct 2026:
 *   · YouTube (desktop/youtube-plan.mjs, youtube-advice.mjs, youtube-insights.mjs, youtube-signin.mjs, features.mjs "youtube"): per video
 *     3 ready options — a title with the main words first, a description, 3 hashtags and a thumbnail text; new video ideas from what does
 *     well in the niche and the questions viewers write; channel advice and "do these first this week"; with the channel owner's own
 *     Google sign-in, YouTube Analytics (watch time, the searches that brought viewers). It reads through the official YouTube Data API
 *     with the client's OWN key. It suggests HASHTAGS, not the hidden "tags" field — so the page says hashtags.
 *   · The engines: the AI-search check reads robots.txt for OAI-SearchBot (ChatGPT search), Claude-SearchBot and PerplexityBot
 *     (src/page/page-gates.mjs AI_SEARCH_BOTS); Google = Search Console and Google Ads keyword volumes; Gemini, ChatGPT and Claude write
 *     with the client's own AI key (desktop/secrets.mjs AI_PROVIDERS). Our own simple icons — never the engines' logo files.
 *   · The days: the free check (a score), keywords and questions, one article a day (articlesPerDay 1 by default; a day with no question
 *     that has a sourced answer has none, and the app says why — desktop/article-dest.mjs todayNotice), publishing after the client's
 *     Approve or by itself once every check passes (the client's choice). The app runs on the client's Windows computer.
 * No ranking, traffic, views or citation is promised anywhere.
 */
import { PLATFORMS, PLATFORM_NAME, CAPTION_TOOL, platformOf } from "./title-check.mjs"; // RR-348
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const HERO = Object.freeze({
  headline: "Get found on Google, ChatGPT — and YouTube.",
  sub: "One app grows your website and your YouTube channel: pages, articles, keywords, video titles and ideas — every day, for $30 a month.",
});
/* what each engine is to the app — the small line under its name */
export const ENGINES = Object.freeze([
  { name: "ChatGPT", does: "AI search check" },
  { name: "Google", does: "Search data" },
  { name: "Gemini", does: "Writes, your key" },
  { name: "Claude", does: "AI search check" },
  { name: "Perplexity", does: "AI search check" },
  { name: "YouTube", does: "Channel advice" },
  /* RR-348 (owner): TikTok and Instagram in the strip; what they are today: the free checker. RR-348 owner change: the official icons
   * (BRAND_ICONS) replaced our own letter marks */
  { name: "TikTok", does: "Caption checker" },
  { name: "Instagram", does: "Caption checker" },
].map(Object.freeze));
export const TRADEMARKS = "Names and logos are trademarks of their owners; AlmiVisibility is not affiliated with them.";
/* RR-348 OWNER CHANGE point 2 · the official icons — only where the company's own brand kit allows this use (a third-party page listing
 * what it works with), shown as given. Read on 29 Oct 2026: Google ("Don't use the Google G in marketing materials for a business") and
 * Gemini (an approved Partner Marketing Hub account) forbid it; TikTok ("prior written permission"), OpenAI ("without permission"),
 * Anthropic (approved beforehand) and Perplexity (request access) need permission first; Instagram's download needs its terms accepted
 * and its rules keep other networks out of the same spot; YouTube allows its icon for API attribution only at the brand site's minimum
 * size. OWNER DECISION (29 Oct 2026, after reading this): the brands' icons on the WEBSITE only, from Simple Icons 16.36.0 (CC0), each in
 * the brand's own colour (site/img/brands/SOURCES.md) — never in the desktop app or a Microsoft Store listing or screenshot. Per brand
 * switchable: if a company asks, delete its line here and it shows its NAME the same day. ChatGPT/OpenAI is not in Simple Icons: its name. */
export const BRAND_ICONS = Object.freeze({
  Google: Object.freeze({ file: "google.svg" }), Gemini: Object.freeze({ file: "googlegemini.svg" }), Claude: Object.freeze({ file: "claude.svg" }),
  Perplexity: Object.freeze({ file: "perplexity.svg" }), YouTube: Object.freeze({ file: "youtube.svg" }), TikTok: Object.freeze({ file: "tiktok.svg" }),
  Instagram: Object.freeze({ file: "instagram.svg" }),
});
export function brandIcon(name, size = 40) {
  const b = BRAND_ICONS[name];
  return b ? `<img class="bi" src="/img/brands/${b.file}" width="${size}" height="${size}" alt="" loading="lazy">` : `<span class="bi-text">${esc(name)}</span>`;
}

/* four engines above the hub, four below: a 4 × 3 grid with no gaps, so the node centres sit at 1/8, 3/8, 5/8 and 7/8 across and 1/6,
 * 5/6 down, and the lines (an SVG stretched over the grid) meet them at any width — on a phone too */
export function aiMap() {
  const node = (e) => (BRAND_ICONS[e.name] ? `<li class="ai-node"><span class="ai-logo" aria-hidden="true">${brandIcon(e.name, 40)}</span><b>${esc(e.name)}</b><small>${esc(e.does)}</small></li>`
    : `<li class="ai-node"><b class="ai-name">${esc(e.name)}</b><small>${esc(e.does)}</small></li>`);
  const half = ENGINES.length / 2, ends = [...[1, 3, 5, 7].map((x) => [x, 1]), ...[1, 3, 5, 7].map((x) => [x, 5])];
  return `<div class="aimap" data-ai-map><svg class="ai-lines" viewBox="0 0 8 6" preserveAspectRatio="none" aria-hidden="true">${ends.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="4" y2="3" vector-effect="non-scaling-stroke"/>`).join("")}</svg>
<ul aria-label="Where AlmiVisibility works">${ENGINES.slice(0, half).map(node).join("")}<li class="ai-hub"><span>AlmiVisibility</span></li>${ENGINES.slice(half).map(node).join("")}</ul></div>
<p class="fine ai-tm">${esc(TRADEMARKS)}</p>`;
}

export const YT = Object.freeze({
  /* RR-348 ADD (owner, 29 Oct 2026): the section line now names all three; was "Finally: SEO for your YouTube channel. Not just your website." */
  heading: "SEO for YouTube, TikTok & Instagram — not just your website.",
  eyebrow: "YouTube · TikTok · Instagram",
  /* the owner's line, with "hashtags" for "tags": the app suggests hashtags, not the hidden tags field */
  sub: "Titles and captions that get clicked. Hashtags that get found. Video ideas your audience is already searching for.",
  example: Object.freeze({ before: "my morning routine vlog", after: "My 5 AM Morning Routine in Iceland — What I Never Skip" }),
  cards: Object.freeze([
    { title: "Better titles & hashtags", screen: [["Title", "Morning Routine Before Work: What I Never Skip"], ["Hashtags", "#morningroutine #5amclub #productivity"]], line: "For each video: three ready titles with the main words first, a description and three relevant hashtags — each saying what it is based on." },
    { title: "Video ideas from real searches", screen: [["Video ideas", "1 · My night routine for an early start"], ["", "2 · 5 AM vs 7 AM: what changed for me"], ["", "3 · What I eat before work"]], line: "New video ideas from what does well in your niche on YouTube and the questions viewers write in comments — each with a ready title." },
    { title: "Advice to grow your channel", screen: [["Do first this week", "1 · Main words first in your next 3 titles"], ["", "2 · Answer the top question from your comments"], ["", "3 · Add chapters to videos over 8 minutes"]], line: "Channel advice and the steps to do first this week, from your own videos — with your Google sign-in, from your watch time and the searches that brought viewers too." },
  ].map(Object.freeze)),
  cta: "Grow my channel →",
  /* RR-347 FIX v2 point 3 (owner): true — the app reads through the official API, and "Apply to YouTube" shows a preview and changes a
   * video only after the client confirms (desktop/main.mjs D1) */
  fine: "Works with YouTube's official API. You approve every change.",
});
/* RR-347 ADD-2 · the free title checker (site/title-check.mjs): the form, then the gauge, the checks, the AI titles and the offer */
/* RR-348 · one checker, three tabs (YouTube the default). The tabs are radio buttons styled as tabs — no script (the site's policy runs
 * none inline); the words that change with the tab are shown by CSS :has() */
export const TOOL = Object.freeze({ heading: "Free title & caption checker", topicLabel: "What is the video about? (optional, one line)",
  per: Object.freeze({
    youtube: Object.freeze({ label: "Paste your video title", button: "Check my title", placeholder: "my morning routine vlog" }),
    tiktok: Object.freeze({ label: "Paste your TikTok caption", button: "Check my caption", placeholder: "my morning routine #fyp" }),
    instagram: Object.freeze({ label: "Paste your Instagram caption", button: "Check my caption", placeholder: "my morning routine #reels" }),
  }),
  offer: "Want this for every video — plus hashtags, ideas and channel advice? Get AlmiVisibility for $30/month →" });
const per = (k) => PLATFORMS.map((p) => `<span class="for-${p}">${esc(TOOL.per[p][k])}</span>`).join("");
export function titleTool({ on = false, ticket = null, values = {}, error = null, result = null, left = null, buyHref = "/pricing", gauge = null, guidance = "", perDay = 5 } = {}) {
  const chosen = platformOf(result?.platform ?? values.platform);
  const tabs = `<fieldset class="tt-tabs"><legend>Platform</legend>${PLATFORMS.map((p) => `<input type="radio" name="platform" id="tt-p-${p}" value="${p}"${p === chosen ? " checked" : ""}><label for="tt-p-${p}" class="tab-${p}">${esc(PLATFORM_NAME[p])}</label>`).join("")}</fieldset>`;
  const form = on && ticket ? `<form class="tt-form" method="post" action="/title-check#title-check"><input type="hidden" name="ticket" value="${esc(ticket)}">
<div class="hp" aria-hidden="true"><label>Leave this empty <input name="homepage" tabindex="-1" autocomplete="off"></label></div>
${tabs}
<label class="tt-l" for="tt-title">${per("label")}</label><textarea id="tt-title" name="title" rows="3" maxlength="${CAPTION_TOOL.maxCaption}" required autocomplete="off" placeholder="${esc(TOOL.per[chosen].placeholder)}">${esc(values.title ?? "")}</textarea>
<label class="tt-l" for="tt-topic">${esc(TOOL.topicLabel)}</label><input id="tt-topic" name="topic" type="text" maxlength="120" autocomplete="off" placeholder="a calm 5 AM routine before work" value="${esc(values.topic ?? "")}">
<button class="pill big yt" type="submit">${per("button")}</button><p class="tt-fine">Free: ${perDay} checks a day across the three tabs. What you paste is not stored.</p></form>`
    : `<p class="tt-fine" role="status">The free title and caption checker is being switched on. Please come back soon.</p>`;
  const err = error ? `<p class="tt-err" role="alert">${esc(error)}</p>` : "";
  let out = "";
  if (result) {
    const c = result.check, ai = result.ai, yt = chosen === "youtube", what = yt ? "title" : "caption";
    const list = c.checks.map((x) => `<li class="${x.ok === true ? "ok" : x.ok === false ? "no" : "nm"}"><span aria-hidden="true">${x.ok === true ? "✓" : x.ok === false ? "✗" : "–"}</span><div><b>${esc(x.label)}</b><p>${esc(x.line)}</p></div></li>`).join("");
    const box = (t, i) => (yt ? `<input id="tt-s${i}" class="tt-copyin" type="text" readonly value="${esc(t.title)}" aria-label="Suggested title ${i + 1}">`
      : `<textarea id="tt-s${i}" class="tt-copyin" rows="4" readonly aria-label="Suggested caption ${i + 1}">${esc(t.title)}</textarea>`);
    const aiPart = ai.state === "ok" ? `<h3>3 better ${what}s</h3><ol class="tt-better">${ai.titles.map((t, i) => `<li>${box(t, i)}<button class="tt-copy" type="button" data-copy="tt-s${i}">Copy</button><p>${esc(t.why)}</p></li>`).join("")}</ol><p class="tt-fine">Written by AI from your ${what} and topic only. A [bracket] is a detail only you know — fill it in.</p>`
      : `<p class="tt-busy" role="status">${esc(ai.line)}</p>`;
    out = `<div class="tt-result" data-title-result data-platform="${chosen}"><p class="tt-for">Your ${esc(PLATFORM_NAME[chosen])} ${what}: <b>${esc(result.title)}</b></p><div class="tt-top">${gauge ? gauge(c.score) : ""}<ul class="tt-checks">${list}</ul></div>
<p class="tt-fine">${esc(yt ? guidance : CAPTION_TOOL.guidance(chosen))}${left !== null && left !== undefined ? ` · ${left} free check${left === 1 ? "" : "s"} left today.` : ""}</p>${aiPart}
<p class="tt-offer"><a href="${esc(buyHref)}" data-buy>${esc(TOOL.offer)}</a></p></div>`;
  }
  return `<div class="tt" id="title-check" data-title-check><h3 class="tt-h">${esc(TOOL.heading)}</h3>${err}${form}${out}</div>`;
}
export function youtubeBand(buyHref, tool = {}) {
  return `<section class="ytband" data-youtube><div class="wrap">
<div class="yt-head"><span class="yt-play" aria-hidden="true"><i></i></span><div><p class="yt-eyebrow">${esc(YT.eyebrow)}</p><h2>${esc(YT.heading)}</h2><p class="yt-sub">${esc(YT.sub)}</p></div></div>
${titleTool({ ...tool, buyHref })}
<div class="yt-ba" data-example><span class="yt-tag">Example</span><p><small>Before</small><s>${esc(YT.example.before)}</s></p><p class="yt-arrow" aria-hidden="true">→</p><p><small>After</small><b>${esc(YT.example.after)}</b></p></div>
<ul class="yt-cards">${YT.cards.map((c) => `<li><div class="so-screen yt-screen" aria-label="Example: ${esc(c.title)}"><i class="so-tag">Example</i>${c.screen.map(([k, v]) => `${k ? `<small>${esc(k)}</small>` : ""}<span>${esc(v)}</span>`).join("")}</div><h3>${esc(c.title)}</h3><p>${esc(c.line)}</p></li>`).join("")}</ul>
<p class="yt-cta"><a class="pill big yt" href="${esc(buyHref)}" data-buy>${esc(YT.cta)}</a></p>
<p class="yt-fine">${esc(YT.fine)}</p></div></section>`; // RR-348 ADD: the honest TikTok/Instagram line now sits in their own band (SOCIAL.honest)
}

/* ── RR-348 OWNER CHANGE (29 Oct 2026) · the hero: the words on the left; on the right a REAL screenshot of the app's main screen ("Your
 * products" + "What would you like to do now?", made with demo data: a test key pair, a demo company, no real key or person) with the
 * Download button directly under it. On a phone the picture and the button come right after the heading. ── */
export const APP_SHOT = Object.freeze({ src: "/img/app-home.jpg", width: 1600, height: 1216, alt: "The AlmiVisibility app on Windows: “Your products” with a website, a YouTube channel and a shop, and “What would you like to do now?” (demo data)" });
export function salesHero({ headline, sub, data, buyHref, buyLabel, download = "/download" }) {
  return `<section class="hero shero"><div class="wrap sh-grid">
<div class="sh-text"><p class="eyebrow">AlmiVisibility · by AlmiWorld</p><h1>${esc(headline)}</h1><p class="lead">${esc(sub)}</p></div>
<div class="sh-media" data-app-shot><figure class="sh-shot"><img src="${APP_SHOT.src}" width="${APP_SHOT.width}" height="${APP_SHOT.height}" alt="${esc(APP_SHOT.alt)}" fetchpriority="high"></figure>${downloadHero(download)}</div>
<div class="sh-act"><p class="small">${esc(data)} Your site score is free — no card, no email.</p>
<div class="cta"><a class="pill big" href="#score">Get my free score</a><a class="pill big alt" href="${esc(buyHref)}" data-buy>${esc(buyLabel)}</a></div>
</div></div></section>`; // RR-347 FIX v2 point 5: the no-promise line is a footnote at the end of the page
}

/* ── RR-348 OWNER CHANGE point 3 · the NEW band, high on the page: the two icons, the owner's line, a link to the checker's TikTok tab ── */
export const NEW_BAND = Object.freeze({ tag: "NEW", line: "Now you can do SEO for TikTok and Instagram too.", sub: "Captions, hooks and hashtags checked and rewritten — free checker below.", href: "/?tab=tiktok#title-check", go: "Try it free →" });
export function newBand() {
  return `<section class="newband" data-new-band><div class="wrap nb-row"><span class="nb-icons" aria-hidden="true">${brandIcon("TikTok", 40)}${brandIcon("Instagram", 40)}</span>
<p class="nb-text"><b class="nb-tag">${esc(NEW_BAND.tag)}</b> <strong>${esc(NEW_BAND.line)}</strong><span>${esc(NEW_BAND.sub)}</span></p><a class="pill nb-go" href="${NEW_BAND.href}">${esc(NEW_BAND.go)}</a></div></section>`;
}

/* ── RR-348 ADD · the TikTok + Instagram section, built like the YouTube one, right after it ── */
export const SOCIAL = Object.freeze({
  eyebrow: "TikTok · Instagram",
  heading: "Now you can do SEO for TikTok and Instagram too.",
  sub: "Hooks that stop the scroll. Captions that get found. Hashtags that fit your video.",
  example: Object.freeze({ before: "cooking today #fyp #viral #foryou", after: "3-ingredient chicken karahi in 15 minutes 🔥 Save this for dinner tonight! #karahi #easyrecipes #pakistanifood" }),
  /* the three mini screens: what the checker and the app give, each marked Example */
  cards: Object.freeze([
    Object.freeze({ title: "Hook + caption", screen: [["Hook", "3 ingredients. 15 minutes. Dinner done."], ["Caption", "Chicken karahi the easy way — save this for tonight!"]] }),
    Object.freeze({ title: "Hashtag set", screen: [["For this video", "#karahi #easyrecipes #pakistanifood #dinnerideas"]] }),
    Object.freeze({ title: "Content ideas", screen: [["Next videos", "1 · Karahi vs. handi — which is easier?"], ["", "2 · 5 mistakes that make karahi watery"]] }),
  ]),
  check: "Check my caption free →", checkHref: "/?tab=tiktok#title-check", grow: "Grow my TikTok & Instagram →",
  honest: "The free checker works now. In the app, TikTok and Instagram come with the next update.",
});
export function socialBand(buyHref = "/pricing") {
  const screen = (rows) => rows.map(([k, v]) => `${k ? `<small>${esc(k)}</small>` : ""}<span>${esc(v)}</span>`).join("");
  return `<section class="soband" data-social><div class="wrap">
<div class="so-head"><span class="so-icons" aria-hidden="true">${brandIcon("TikTok", 56)}${brandIcon("Instagram", 56)}</span><div><p class="so-eyebrow">${esc(SOCIAL.eyebrow)}</p><h2>${esc(SOCIAL.heading)}</h2><p class="so-sub">${esc(SOCIAL.sub)}</p></div></div>
<div class="yt-ba so-ba" data-example><span class="yt-tag">Example</span><p><small>Before</small><s>${esc(SOCIAL.example.before)}</s></p><p class="yt-arrow" aria-hidden="true">→</p><p><small>After</small><b>${esc(SOCIAL.example.after)}</b></p></div>
<ul class="so-cards">${SOCIAL.cards.map((c) => `<li><div class="so-screen" aria-label="Example: ${esc(c.title)}"><i class="so-tag">Example</i>${screen(c.screen)}</div><h3>${esc(c.title)}</h3></li>`).join("")}</ul>
<p class="so-cta"><a class="pill big so-check" href="${SOCIAL.checkHref}">${esc(SOCIAL.check)}</a><a class="pill big so-grow" href="${esc(buyHref)}" data-buy>${esc(SOCIAL.grow)}</a></p>
<p class="yt-fine">${esc(SOCIAL.honest)}</p></div></section>`;
}

/* RR-348 (owner): the Download button high on the home, right under the hero's buttons — visible without scrolling on a desktop, near the
 * top on a phone. `href` is the Store, or the LATEST Setup (/download/AlmiVisibility-Setup.exe → VISIBILITY_SETUP_URL, GitHub's
 * releases/latest), or the Download page. Older copies (1.14 and before) cannot check today's licence: the line under it says to update. */
export const DOWNLOAD = Object.freeze({ button: "Download the app here", os: "Windows 10 & 11 · always the latest version",
  update: "Using an older AlmiVisibility (1.14 or earlier)? Please update to the latest version — download it here and install it over the old one. Your data stays." });
export function downloadHero(href = "/download") {
  const setup = href.startsWith("/download/");
  return `<div class="dl-hero" data-download-hero><a class="pill big dl" href="${esc(href)}"${setup ? " download" : ""}${href.startsWith("https://") ? ' rel="noopener"' : ""}><span aria-hidden="true">⬇</span> ${esc(DOWNLOAD.button)}</a><span class="dl-os">${esc(DOWNLOAD.os)}</span></div>
<p class="dl-update"><a href="${esc(href)}"${setup ? " download" : ""}>${esc(DOWNLOAD.update)}</a></p>`;
}

export const DAYS = Object.freeze({
  eyebrow: "Your own SEO team for $30 a month.",
  heading: "GIVE AI YOUR WEBSITE. WAKE UP TO NEW PAGES EVERY DAY.",
  sub: "SEO agencies charge hundreds a month. AlmiVisibility does the daily work for $30.",
  plan: Object.freeze([
    ["Day 1", "Your site's score — out of 100, with what to fix first."],
    ["Day 2", "Your keywords — real Google search volumes and the questions people ask."],
    ["Day 3", "Your first article — a draft answered from your own pages, with its sources."],
    ["Day 4", "Better titles, descriptions, hashtags and video ideas for your YouTube channel."],
    ["Day 7", "Up to seven articles — one a day."],
    ["Day 30", "Up to thirty new pages on your site."],
  ].map(Object.freeze)),
  tag: "$30 a month. You approve. AI writes.",
  sleep: "Your website works while you sleep.",
  fine: "You choose: publish each article after you approve it, or let it go out by itself once every check passes. The app runs on your Windows computer and works while it is on. An article is made only when a real question has an answer from your own pages — on a day with none, the app tells you why. YouTube needs your own free YouTube key.",
});
export function dayPlan() {
  return `<section class="band dayplan" data-day-plan><div class="wrap"><p class="eyebrow center">${esc(DAYS.eyebrow)}</p><h2>${esc(DAYS.heading)}</h2><p class="sub">${esc(DAYS.sub)}</p>
<ol class="days">${DAYS.plan.map(([d, t]) => `<li><b>${esc(d)}</b><span>${esc(t)}</span></li>`).join("")}</ol>
<p class="daytag"><b>${esc(DAYS.tag)}</b> ${esc(DAYS.sleep)}</p><p class="fine center">${esc(DAYS.fine)}</p></div></section>`;
}

/* the FAQ: the same words on the page and in its FAQPage JSON-LD (a data block — not a script that runs) */
export const FAQ = Object.freeze([
  ["Does AlmiVisibility help my YouTube channel?", "Yes. With your own free YouTube key it reads your channel through YouTube's official API and gives you, for each video, ready titles, a description and hashtags, plus new video ideas and advice for the channel — each saying what it is based on. With your Google sign-in it also reads your watch time and the searches that brought viewers. Nothing changes on YouTube unless you switch on “Apply to YouTube”."],
  ["Is the YouTube title checker free?", "Yes. Paste a video title, and optionally what the video is about: you get AlmiVisibility's own title guidance — a score and six plain checks — and three better titles written by AI. It is free for a few checks a day; the score is our guidance, not YouTube's ranking, and no views are promised. Your title is not stored."],
  ["Does it help with ChatGPT and other AI search?", "It checks whether the search bots of ChatGPT, Claude and Perplexity may read your site, whether your site says clearly who you are, and which questions your pages answer — and gives you FAQ markup ready to paste. No AI answer or citation is promised."],
  ["What do I get for $30 a month?", "Every feature, for one product: one website, shop or YouTube channel. Bigger plans cover more products. Prices exclude VAT and sales tax where it applies."],
  ["Do I approve what goes on my site?", "You choose. Each article can wait for your Approve, or go out by itself once every check passes. You can also export the file or keep drafts only."],
].map(Object.freeze));
export function faqSection() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return `<section class="band faq" data-faq><div class="wrap prose"><h2>Questions</h2>${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></section>`;
}

export const HOME_CSS = `<style>
.dl-hero{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:16px 0 0}
.pill.dl{background:#1A1A2E;color:#FFFFFF;border:2px solid #1A1A2E;font-weight:700} .pill.dl:hover{background:#2E2E4A} .pill.dl span{margin-right:8px}
.dl-os{font-size:14px;color:var(--muted);font-weight:600} .dl-update{margin:8px 0 0;font-size:13px} .dl-update a{color:var(--coralDeep)}
.aimap{position:relative;margin:28px 0 0;max-width:600px}
.aimap ul{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:0;list-style:none}
.ai-lines{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible} .ai-lines line{stroke:var(--sunrise);stroke-width:2;stroke-dasharray:5 5;opacity:.75}
.ai-node{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px 4px}
.ai-node b{display:block;margin-top:4px;font-size:14px;line-height:1.2;color:var(--ink);background:var(--cream);padding:0 4px;border-radius:6px} .ai-node small{font-size:12px;color:var(--muted);background:var(--cream);padding:0 4px;border-radius:6px}
.ai-logo{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:#FFFFFF;border:1px solid var(--peach);box-shadow:0 2px 8px rgba(26,26,46,.06)}
.bi{display:block;object-fit:contain}
.ai-node b.ai-name{display:inline-block;padding:8px 14px;border-radius:999px;background:#FFFFFF;border:2px solid var(--sunrise);font-size:15px;box-shadow:0 2px 8px rgba(26,26,46,.06)}
.bi-text{display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;font-weight:800;letter-spacing:.01em;color:#FFFFFF;background:#15151C;border:2px solid #25F4EE;box-shadow:3px 3px 0 #FE2C55}
.bi-text+.bi-text{border-color:#DD2A7B;box-shadow:3px 3px 0 #F58529}
/* the sales hero: words | the app picture + Download; on a phone: words, picture + Download, then the buttons */
.shero .sh-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);grid-template-areas:"text media" "act media";column-gap:48px;align-items:start}
.sh-text{grid-area:text} .sh-media{grid-area:media} .sh-act{grid-area:act} .shero h1{font-size:clamp(34px,4.4vw,56px)}
.sh-shot{margin:0;border-radius:14px;overflow:hidden;border:1px solid var(--peach);box-shadow:0 18px 48px rgba(26,26,46,.18);background:#FFFFFF}
.sh-shot img{display:block;width:100%;height:auto}
.sh-media .dl-hero{margin-top:18px} .sh-media .pill.dl{font-size:20px;padding:16px 30px}
.newband{background:linear-gradient(90deg,#0B0B0F,#1B1030);color:#FFFFFF;padding:18px 0}
.nb-row{display:flex;align-items:center;gap:18px;flex-wrap:wrap} .nb-icons{display:inline-flex;gap:10px} .nb-icons .bi,.so-icons .bi{border-radius:10px;background:#FFFFFF;padding:4px}
.nb-text{margin:0;flex:1 1 320px;font-size:19px;line-height:1.35} .nb-text strong{color:#FFFFFF} .nb-text span{display:block;font-size:15px;color:#D9D9E3}
.nb-tag{display:inline-block;margin-right:6px;padding:2px 10px;border-radius:999px;background:#FE2C55;color:#FFFFFF;font-size:13px;letter-spacing:.08em}
.newband .pill.nb-go{background:#25F4EE;color:#0B0B0F;font-weight:700}
.soband{position:relative;overflow:hidden;background:#0B0B0F;color:#E4E4EC;padding:72px 0}
.soband::before{content:"";position:absolute;right:-120px;top:-140px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle,rgba(37,244,238,.18),transparent 70%);pointer-events:none}
.soband::after{content:"";position:absolute;left:-140px;bottom:-160px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(221,42,123,.26),rgba(129,52,175,.12) 45%,transparent 72%);pointer-events:none}
.soband .wrap{position:relative;z-index:1} .so-head{display:flex;gap:24px;align-items:center} .so-icons{flex:none;display:inline-flex;gap:12px}
.so-eyebrow{margin:0 0 8px;font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(90deg,#25F4EE,#FE2C55,#F58529,#DD2A7B,#8134AF);-webkit-background-clip:text;background-clip:text;color:transparent}
.soband h2{color:#FFFFFF;text-align:left;font-size:clamp(28px,4vw,44px);line-height:1.12;font-weight:700} .so-sub{margin:12px 0 0;font-size:18px;color:#E4E4EC}
.so-ba{border-color:#3A2346} .so-ba .yt-tag{background:linear-gradient(90deg,#FE2C55,#DD2A7B);color:#FFFFFF} .so-ba .yt-arrow{color:#25F4EE}
.so-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:28px 0 0;padding:0;list-style:none}
.so-cards li{background:#15151C;border:1px solid #2A2A33;border-radius:18px;padding:14px 14px 18px}
.so-screen{position:relative;display:flex;flex-direction:column;gap:4px;min-height:132px;max-height:150px;overflow:hidden;padding:14px 14px 12px;border-radius:14px;background:#0B0B0F;border:2px solid #2A2A33;box-shadow:inset 0 0 0 1px rgba(37,244,238,.12)}
.so-screen small{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#25F4EE} .so-screen span{font-size:15px;line-height:1.35;color:#FFFFFF}
.so-tag{position:absolute;top:8px;right:10px;font-style:normal;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#F58529}
.so-cards h3{margin:12px 0 0;color:#FFFFFF;font-size:18px}
.so-cta{margin:32px 0 0;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.soband .pill.so-check{background:linear-gradient(90deg,#FE2C55,#DD2A7B);color:#FFFFFF} .soband .pill.so-grow{background:transparent;border:2px solid #25F4EE;color:#FFFFFF}
.shome .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.ai-hub{grid-column:1 / -1;display:flex;align-items:center;justify-content:center;padding:8px 0}
.ai-hub span{display:inline-block;padding:10px 22px;border-radius:999px;background:linear-gradient(135deg,var(--sunrise),var(--coral));color:var(--ink);font-weight:700;box-shadow:0 6px 18px rgba(244,163,64,.35)}
.ai-tm{margin-top:8px}
.ytband{position:relative;overflow:hidden;background:#0B0B0F;color:#E4E4EC;padding:72px 0}
.ytband::before{content:"";position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(244,163,64,.22),transparent 70%);pointer-events:none}
.ytband::after{content:"";position:absolute;left:-140px;bottom:-160px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(224,36,36,.22),transparent 70%);pointer-events:none}
.ytband .wrap{position:relative;z-index:1}
.yt-head{display:flex;gap:28px;align-items:center}
.yt-play{flex:none;position:relative;display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;background:#E02424;box-shadow:0 0 0 0 rgba(224,36,36,.55);animation:ytpulse 2.4s ease-out infinite}
.yt-play i{display:block;width:0;height:0;margin-left:7px;border-style:solid;border-width:18px 0 18px 30px;border-color:transparent transparent transparent #FFFFFF}
@keyframes ytpulse{0%{box-shadow:0 0 0 0 rgba(224,36,36,.5)}70%{box-shadow:0 0 0 22px rgba(224,36,36,0)}100%{box-shadow:0 0 0 0 rgba(224,36,36,0)}}
.yt-eyebrow{margin:0 0 8px;font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#F4A340}
.ytband h2{color:#FFFFFF;text-align:left;font-size:clamp(28px,4vw,44px);line-height:1.12;font-weight:700} .yt-sub{margin:12px 0 0;font-size:18px;color:#E4E4EC}
.yt-ba{position:relative;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin:36px 0 0;padding:24px;border-radius:18px;background:#15151C;border:1px solid #2A2A33}
.yt-ba p{margin:0} .yt-ba small{display:block;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#D6D6DE;margin-bottom:4px}
.yt-ba s{color:#D0D0DA;font-size:17px} .yt-ba b{color:#FFFFFF;font-size:19px} .yt-arrow{font-size:28px;color:#F4A340}
.yt-tag{position:absolute;top:-11px;left:20px;padding:2px 10px;border-radius:999px;background:#F4A340;color:#1A1A2E;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.yt-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:28px 0 0;padding:0;list-style:none}
.yt-cards li{background:#15151C;border:1px solid #2A2A33;border-radius:18px;padding:16px 16px 20px;transition:box-shadow .2s,border-color .2s,transform .2s}
.yt-cards li:hover{border-color:#E02424;box-shadow:0 0 22px rgba(224,36,36,.28);transform:translateY(-2px)}
.yt-screen{margin-bottom:14px;box-shadow:inset 0 0 0 1px rgba(224,36,36,.25)} .yt-screen small{color:#FF8A8A} .yt-screen .so-tag{color:#F4A340}
.yt-cards h3{color:#FFFFFF;font-size:19px;margin:0} .yt-cards p{margin:8px 0 0;font-size:16px;color:#E4E4EC}
.yt-cta{margin:32px 0 0;text-align:center} .ytband .pill.yt{background:#E02424;color:#FFFFFF} .ytband .pill.yt:hover{background:#C81E1E}
.yt-fine{margin:14px auto 0;max-width:680px;text-align:center;font-size:15px;color:#E0E0E8}
.tt{margin:32px 0 0;padding:24px;border-radius:18px;background:#15151C;border:1px solid #2A2A33;max-width:860px}
.tt-h{margin:0 0 12px;color:#FFFFFF;font-size:22px} .tt-l{display:block;margin:12px 0 6px;font-size:14px;font-weight:600;color:#FFFFFF}
.tt input[type=text],.tt textarea{display:block;width:100%;min-height:52px;padding:12px 16px;border-radius:12px;border:2px solid #3A3A46;background:#0B0B0F;color:#FFFFFF;font:inherit;font-size:17px;resize:vertical}
.tt input[type=text]:focus,.tt textarea:focus{outline:3px solid #F4A340;outline-offset:1px;border-color:#F4A340} .tt input::placeholder,.tt textarea::placeholder{color:#8E8E99}
.tt-tabs{display:flex;gap:8px;margin:0 0 4px;padding:0;border:0;flex-wrap:wrap} .tt-tabs legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.tt-tabs input{position:absolute;opacity:0;width:1px;height:1px} .tt-tabs label{display:inline-flex;align-items:center;min-height:44px;padding:8px 18px;border-radius:999px;border:2px solid #3A3A46;color:#C9C9D1;font-weight:700;cursor:pointer}
.tt-tabs input:checked+label{background:#FFFFFF;border-color:#FFFFFF;color:#0B0B0F} .tt-tabs input:focus-visible+label{outline:3px solid #F4A340;outline-offset:2px}
.tt-tabs input#tt-p-youtube:checked+label{background:#E02424;border-color:#E02424;color:#FFFFFF} .tt-tabs input#tt-p-tiktok:checked+label{background:#25F4EE;border-color:#25F4EE;color:#0B0B0F} .tt-tabs input#tt-p-instagram:checked+label{background:#F4A340;border-color:#F4A340;color:#0B0B0F}
.tt-form .for-tiktok,.tt-form .for-instagram{display:none} .tt-form:has(#tt-p-tiktok:checked) .for-youtube,.tt-form:has(#tt-p-instagram:checked) .for-youtube{display:none}
.tt-form:has(#tt-p-tiktok:checked) .for-tiktok,.tt-form:has(#tt-p-instagram:checked) .for-instagram{display:inline}
.tt-copyin{white-space:pre-wrap}
.tt-form .pill{margin-top:16px} .tt-fine{margin:10px 0 0;font-size:15px;color:#E0E0E8} .tt-err{margin:0 0 8px;color:#FF9B8F;font-weight:600} .tt-busy{margin:16px 0 0;color:#F4C15A;font-weight:600}
.tt-result{margin-top:22px;padding-top:20px;border-top:1px solid #2A2A33} .tt-for{margin:0 0 12px;color:#E4E4EC;overflow-wrap:anywhere} .tt-for b{color:#FFFFFF}
.tt-top{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
.tt .gauge .num b{color:#FFFFFF} .tt .gauge .num small,.tt .gauge .num span{color:#E4E4EC}
.tt-checks{list-style:none;margin:0;padding:0;display:grid;gap:10px} .tt-checks li{display:flex;gap:10px;align-items:flex-start}
.tt-checks li>span{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-weight:700;font-size:14px}
.tt-checks li.ok>span{background:#0F7A43;color:#FFFFFF} .tt-checks li.no>span{background:#E02424;color:#FFFFFF} .tt-checks li.nm>span{background:#3A3A46;color:#FFFFFF}
.tt-checks b{color:#FFFFFF;font-size:15px} .tt-checks p{margin:2px 0 0;font-size:15px;color:#E4E4EC}
.tt h3{color:#FFFFFF} .tt-result h3{margin:22px 0 10px;font-size:19px}
.tt-better{list-style:none;margin:0;padding:0;display:grid;gap:12px} .tt-better li{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.tt-better p{grid-column:1 / -1;margin:0;font-size:15px;color:#E4E4EC} .tt .tt-copyin{min-height:44px;font-size:16px;font-weight:600}
.tt-copy{min-height:44px;padding:8px 16px;border-radius:999px;border:2px solid #F4A340;background:transparent;color:#FFFFFF;font:inherit;font-weight:600;cursor:pointer} .tt-copy:hover{background:#F4A340;color:#1A1A2E}
.tt-offer{margin:22px 0 0} .tt-offer a{color:#F4A340;font-weight:700;font-size:17px}
.dayplan h2{margin-top:4px} .dayplan .center{text-align:center}
.days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:28px 0 0;padding:0;list-style:none}
.days li{background:var(--white);border:1px solid var(--peach);border-radius:16px;padding:16px 18px} .days b{display:block;color:var(--coralDeep);font-size:15px;text-transform:uppercase;letter-spacing:.06em} .days span{display:block;margin-top:4px;color:var(--ink);font-weight:600}
.daytag{margin:24px 0 8px;text-align:center;font-size:18px;color:var(--ink)}
.footnote{margin:20px 0 28px;font-size:13px;text-align:center} .faq details{border-top:1px solid var(--peach);padding:12px 0} .faq summary{cursor:pointer;font-weight:600;color:var(--ink)} .faq details p{margin:8px 0 0}
@media (max-width:820px){.tt-top{grid-template-columns:1fr} .tt{padding:18px} .yt-head{flex-direction:column;align-items:flex-start;gap:18px} .yt-cards,.days{grid-template-columns:1fr} .yt-ba{grid-template-columns:1fr} .yt-arrow{transform:rotate(90deg);justify-self:start} .ytband{padding:56px 0}}
@media (max-width:820px){.shero .sh-grid{grid-template-columns:1fr;grid-template-areas:"text" "media" "act";row-gap:22px} .shome .sgrid{grid-template-columns:1fr;gap:32px} .so-head{flex-direction:column;align-items:flex-start;gap:16px} .so-cards{grid-template-columns:1fr} .so-screen{min-height:0;max-height:140px} .soband{padding:56px 0} .sh-media .pill.dl{width:100%;justify-content:center}}
@media (max-width:480px){.yt-play{width:72px;height:72px} .yt-play i{border-width:14px 0 14px 23px;margin-left:5px} .ai-logo{width:46px;height:46px} .ai-logo .bi{width:32px;height:32px} .nb-text{font-size:17px} .ai-node b{font-size:13px} .ai-node small{font-size:11px} .yt-ba b{font-size:17px} .yt-cards li:hover{box-shadow:0 0 12px rgba(224,36,36,.2)}}
@media (prefers-reduced-motion:reduce){.yt-play{animation:none} .yt-cards li{transition:none} .yt-cards li:hover{transform:none}}
@media (prefers-color-scheme:dark){.pill.dl{background:#FFFFFF;color:#1A1A2E;border-color:#FFFFFF} .pill.dl:hover{background:#FFE8D6} .ai-node b,.ai-node small{background:#14110D} .ai-hub span{color:#1A1A2E} .days li{background:var(--white)}}
</style>`;
