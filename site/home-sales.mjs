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
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const HERO = Object.freeze({
  headline: "Get found on Google, ChatGPT — and YouTube.",
  sub: "One app grows your website and your YouTube channel: pages, articles, keywords, video titles and ideas — every day, for $30 a month.",
});
/* what each engine is to the app — the small line under its name */
export const ENGINES = Object.freeze([
  { name: "ChatGPT", mark: "C", shape: "round", does: "AI search check" },
  { name: "Google", mark: "G", shape: "square", does: "Search data" },
  { name: "Gemini", mark: "Ge", shape: "diamond", does: "Writes, your key" },
  { name: "Claude", mark: "Cl", shape: "round", does: "AI search check" },
  { name: "Perplexity", mark: "P", shape: "square", does: "AI search check" },
  { name: "YouTube", mark: "▶", shape: "diamond", does: "Channel advice" },
].map(Object.freeze));
export const TRADEMARKS = "Names are trademarks of their owners; AlmiVisibility is not affiliated with them.";

/* three engines above the hub, three below: a 3 × 3 grid with no gaps, so the node centres sit at 1/6, 3/6 and 5/6 of each side and
 * the lines (an SVG stretched over the grid) meet them at any width — on a phone too */
export function aiMap() {
  const node = (e) => `<li class="ai-node"><span class="ai-ic ${e.shape}" aria-hidden="true">${esc(e.mark)}</span><b>${esc(e.name)}</b><small>${esc(e.does)}</small></li>`;
  const ends = [[1, 1], [3, 1], [5, 1], [1, 5], [3, 5], [5, 5]];
  return `<div class="aimap" data-ai-map><svg class="ai-lines" viewBox="0 0 6 6" preserveAspectRatio="none" aria-hidden="true">${ends.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="3" y2="3" vector-effect="non-scaling-stroke"/>`).join("")}</svg>
<ul aria-label="Where AlmiVisibility works">${ENGINES.slice(0, 3).map(node).join("")}<li class="ai-hub"><span>AlmiVisibility</span></li>${ENGINES.slice(3).map(node).join("")}</ul></div>
<p class="fine ai-tm">${esc(TRADEMARKS)}</p>`;
}

export const YT = Object.freeze({
  heading: "Finally: SEO for your YouTube channel. Not just your website.",
  /* the owner's line, with "hashtags" for "tags": the app suggests hashtags, not the hidden tags field */
  sub: "Titles that get clicked. Hashtags that get found. Video ideas your audience is already searching for.",
  example: Object.freeze({ before: "my morning routine vlog", after: "My 5 AM Morning Routine in Iceland — What I Never Skip" }),
  cards: Object.freeze([
    { title: "Better titles & hashtags", line: "For each video: three ready titles with the main words first, a description and three relevant hashtags — each saying what it is based on." },
    { title: "Video ideas from real searches", line: "New video ideas from what does well in your niche on YouTube and the questions viewers write in comments — each with a ready title." },
    { title: "Advice to grow your channel", line: "Channel advice and the steps to do first this week, from your own videos — with your Google sign-in, from your watch time and the searches that brought viewers too." },
  ].map(Object.freeze)),
  cta: "Grow my channel →",
  fine: "Uses your own free YouTube key and YouTube's official API. Nothing changes on YouTube unless you switch on “Apply to YouTube”. No views or growth are promised.",
});
/* RR-347 ADD-2 · the free title checker (site/title-check.mjs): the form, then the gauge, the checks, the AI titles and the offer */
export const TOOL = Object.freeze({ heading: "Free YouTube title checker", label: "Paste your video title", topicLabel: "What is the video about? (optional, one line)", button: "Check my title",
  offer: "Want this for every video — plus hashtags, ideas and channel advice? Get AlmiVisibility for $30/month →" });
export function titleTool({ on = false, ticket = null, values = {}, error = null, result = null, left = null, buyHref = "/pricing", gauge = null, guidance = "", perDay = 5 } = {}) {
  const form = on && ticket ? `<form class="tt-form" method="post" action="/title-check#title-check"><input type="hidden" name="ticket" value="${esc(ticket)}">
<div class="hp" aria-hidden="true"><label>Leave this empty <input name="homepage" tabindex="-1" autocomplete="off"></label></div>
<label class="tt-l" for="tt-title">${esc(TOOL.label)}</label><input id="tt-title" name="title" type="text" maxlength="150" required autocomplete="off" placeholder="my morning routine vlog" value="${esc(values.title ?? "")}">
<label class="tt-l" for="tt-topic">${esc(TOOL.topicLabel)}</label><input id="tt-topic" name="topic" type="text" maxlength="120" autocomplete="off" placeholder="a calm 5 AM routine before work" value="${esc(values.topic ?? "")}">
<button class="pill big yt" type="submit">${esc(TOOL.button)}</button><p class="tt-fine">Free: ${perDay} checks a day. Your title is not stored.</p></form>`
    : `<p class="tt-fine" role="status">The free title checker is being switched on. Please come back soon.</p>`;
  const err = error ? `<p class="tt-err" role="alert">${esc(error)}</p>` : "";
  let out = "";
  if (result) {
    const c = result.check, ai = result.ai;
    const list = c.checks.map((x) => `<li class="${x.ok === true ? "ok" : x.ok === false ? "no" : "nm"}"><span aria-hidden="true">${x.ok === true ? "✓" : x.ok === false ? "✗" : "–"}</span><div><b>${esc(x.label)}</b><p>${esc(x.line)}</p></div></li>`).join("");
    const aiPart = ai.state === "ok" ? `<h3>3 better titles</h3><ol class="tt-better">${ai.titles.map((t, i) => `<li><input id="tt-s${i}" class="tt-copyin" type="text" readonly value="${esc(t.title)}" aria-label="Suggested title ${i + 1}"><button class="tt-copy" type="button" data-copy="tt-s${i}">Copy</button><p>${esc(t.why)}</p></li>`).join("")}</ol><p class="tt-fine">Written by AI from your title and topic only. A [bracket] is a detail only you know — fill it in.</p>`
      : `<p class="tt-busy" role="status">${esc(ai.line)}</p>`;
    out = `<div class="tt-result" data-title-result><p class="tt-for">Your title: <b>${esc(result.title)}</b></p><div class="tt-top">${gauge ? gauge(c.score) : ""}<ul class="tt-checks">${list}</ul></div>
<p class="tt-fine">${esc(guidance)}${left !== null && left !== undefined ? ` · ${left} free check${left === 1 ? "" : "s"} left today.` : ""}</p>${aiPart}
<p class="tt-offer"><a href="${esc(buyHref)}" data-buy>${esc(TOOL.offer)}</a></p></div>`;
  }
  return `<div class="tt" id="title-check" data-title-check><h3 class="tt-h">${esc(TOOL.heading)}</h3>${err}${form}${out}</div>`;
}
export function youtubeBand(buyHref, tool = {}) {
  return `<section class="ytband" data-youtube><div class="wrap">
<div class="yt-head"><span class="yt-play" aria-hidden="true"><i></i></span><div><p class="yt-eyebrow">YouTube</p><h2>${esc(YT.heading)}</h2><p class="yt-sub">${esc(YT.sub)}</p></div></div>
${titleTool({ ...tool, buyHref })}
<div class="yt-ba" data-example><span class="yt-tag">Example</span><p><small>Before</small><s>${esc(YT.example.before)}</s></p><p class="yt-arrow" aria-hidden="true">→</p><p><small>After</small><b>${esc(YT.example.after)}</b></p></div>
<ul class="yt-cards">${YT.cards.map((c, i) => `<li><div class="yt-thumb t${i + 1}" aria-hidden="true"><span>▶</span></div><h3>${esc(c.title)}</h3><p>${esc(c.line)}</p></li>`).join("")}</ul>
<p class="yt-cta"><a class="pill big yt" href="${esc(buyHref)}" data-buy>${esc(YT.cta)}</a></p>
<p class="yt-fine">${esc(YT.fine)}</p></div></section>`;
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
.aimap{position:relative;margin:28px 0 0;max-width:520px}
.aimap ul{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:0;list-style:none}
.ai-lines{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible} .ai-lines line{stroke:var(--sunrise);stroke-width:2;stroke-dasharray:5 5;opacity:.75}
.ai-node{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px 4px}
.ai-node b{display:block;margin-top:4px;font-size:14px;line-height:1.2;color:var(--ink);background:var(--cream);padding:0 4px;border-radius:6px} .ai-node small{font-size:12px;color:var(--muted);background:var(--cream);padding:0 4px;border-radius:6px}
.ai-ic{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;font-weight:700;font-size:16px;color:var(--ink);background:var(--peach);border:2px solid var(--sunrise)}
.ai-ic.round{border-radius:50%;background:var(--peach)} .ai-ic.square{border-radius:10px;background:#FFF1C9} .ai-ic.diamond{border-radius:12px 2px 12px 2px;background:#FFD9CF}
.ai-hub{grid-column:1 / -1;display:flex;align-items:center;justify-content:center;padding:8px 0}
.ai-hub span{display:inline-block;padding:10px 22px;border-radius:999px;background:linear-gradient(135deg,var(--sunrise),var(--coral));color:var(--ink);font-weight:700;box-shadow:0 6px 18px rgba(244,163,64,.35)}
.ai-tm{margin-top:8px}
.ytband{position:relative;overflow:hidden;background:#0B0B0F;color:#C9C9D1;padding:72px 0}
.ytband::before{content:"";position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(244,163,64,.22),transparent 70%);pointer-events:none}
.ytband::after{content:"";position:absolute;left:-140px;bottom:-160px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(224,36,36,.22),transparent 70%);pointer-events:none}
.ytband .wrap{position:relative;z-index:1}
.yt-head{display:flex;gap:28px;align-items:center}
.yt-play{flex:none;position:relative;display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;background:#E02424;box-shadow:0 0 0 0 rgba(224,36,36,.55);animation:ytpulse 2.4s ease-out infinite}
.yt-play i{display:block;width:0;height:0;margin-left:7px;border-style:solid;border-width:18px 0 18px 30px;border-color:transparent transparent transparent #FFFFFF}
@keyframes ytpulse{0%{box-shadow:0 0 0 0 rgba(224,36,36,.5)}70%{box-shadow:0 0 0 22px rgba(224,36,36,0)}100%{box-shadow:0 0 0 0 rgba(224,36,36,0)}}
.yt-eyebrow{margin:0 0 8px;font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#F4A340}
.ytband h2{color:#FFFFFF;text-align:left;font-size:clamp(28px,4vw,44px);line-height:1.12;font-weight:700} .yt-sub{margin:12px 0 0;font-size:18px;color:#C9C9D1}
.yt-ba{position:relative;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin:36px 0 0;padding:24px;border-radius:18px;background:#15151C;border:1px solid #2A2A33}
.yt-ba p{margin:0} .yt-ba small{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#A9A9B3;margin-bottom:4px}
.yt-ba s{color:#A9A9B3;font-size:17px} .yt-ba b{color:#FFFFFF;font-size:19px} .yt-arrow{font-size:28px;color:#F4A340}
.yt-tag{position:absolute;top:-11px;left:20px;padding:2px 10px;border-radius:999px;background:#F4A340;color:#1A1A2E;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.yt-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:28px 0 0;padding:0;list-style:none}
.yt-cards li{background:#15151C;border:1px solid #2A2A33;border-radius:18px;padding:16px 16px 20px;transition:box-shadow .2s,border-color .2s,transform .2s}
.yt-cards li:hover{border-color:#E02424;box-shadow:0 0 22px rgba(224,36,36,.28);transform:translateY(-2px)}
.yt-thumb{aspect-ratio:16/9;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.yt-thumb span{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:rgba(11,11,15,.55);color:#FFFFFF;font-size:18px}
.yt-thumb.t1{background:linear-gradient(135deg,#E02424,#F4A340)} .yt-thumb.t2{background:linear-gradient(135deg,#F4A340,#FF7A6B)} .yt-thumb.t3{background:linear-gradient(135deg,#FF7A6B,#E02424)}
.yt-cards h3{color:#FFFFFF;font-size:19px;margin:0} .yt-cards p{margin:8px 0 0;font-size:15px;color:#C9C9D1}
.yt-cta{margin:32px 0 0;text-align:center} .ytband .pill.yt{background:#E02424;color:#FFFFFF} .ytband .pill.yt:hover{background:#C81E1E}
.yt-fine{margin:14px auto 0;max-width:640px;text-align:center;font-size:13px;color:#A9A9B3}
.tt{margin:32px 0 0;padding:24px;border-radius:18px;background:#15151C;border:1px solid #2A2A33;max-width:860px}
.tt-h{margin:0 0 12px;color:#FFFFFF;font-size:22px} .tt-l{display:block;margin:12px 0 6px;font-size:14px;font-weight:600;color:#FFFFFF}
.tt input[type=text]{width:100%;min-height:52px;padding:12px 16px;border-radius:12px;border:2px solid #3A3A46;background:#0B0B0F;color:#FFFFFF;font:inherit;font-size:17px}
.tt input[type=text]:focus{outline:3px solid #F4A340;outline-offset:1px;border-color:#F4A340} .tt input::placeholder{color:#8E8E99}
.tt-form .pill{margin-top:16px} .tt-fine{margin:10px 0 0;font-size:13px;color:#A9A9B3} .tt-err{margin:0 0 8px;color:#FF9B8F;font-weight:600} .tt-busy{margin:16px 0 0;color:#F4C15A;font-weight:600}
.tt-result{margin-top:22px;padding-top:20px;border-top:1px solid #2A2A33} .tt-for{margin:0 0 12px;color:#C9C9D1;overflow-wrap:anywhere} .tt-for b{color:#FFFFFF}
.tt-top{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
.tt .gauge .num b{color:#FFFFFF} .tt .gauge .num small,.tt .gauge .num span{color:#C9C9D1}
.tt-checks{list-style:none;margin:0;padding:0;display:grid;gap:10px} .tt-checks li{display:flex;gap:10px;align-items:flex-start}
.tt-checks li>span{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-weight:700;font-size:14px}
.tt-checks li.ok>span{background:#0F7A43;color:#FFFFFF} .tt-checks li.no>span{background:#E02424;color:#FFFFFF} .tt-checks li.nm>span{background:#3A3A46;color:#FFFFFF}
.tt-checks b{color:#FFFFFF;font-size:15px} .tt-checks p{margin:2px 0 0;font-size:14px;color:#C9C9D1}
.tt h3{color:#FFFFFF} .tt-result h3{margin:22px 0 10px;font-size:19px}
.tt-better{list-style:none;margin:0;padding:0;display:grid;gap:12px} .tt-better li{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.tt-better p{grid-column:1 / -1;margin:0;font-size:14px;color:#C9C9D1} .tt .tt-copyin{min-height:44px;font-size:16px;font-weight:600}
.tt-copy{min-height:44px;padding:8px 16px;border-radius:999px;border:2px solid #F4A340;background:transparent;color:#FFFFFF;font:inherit;font-weight:600;cursor:pointer} .tt-copy:hover{background:#F4A340;color:#1A1A2E}
.tt-offer{margin:22px 0 0} .tt-offer a{color:#F4A340;font-weight:700;font-size:17px}
.dayplan h2{margin-top:4px} .dayplan .center{text-align:center}
.days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:28px 0 0;padding:0;list-style:none}
.days li{background:var(--white);border:1px solid var(--peach);border-radius:16px;padding:16px 18px} .days b{display:block;color:var(--coralDeep);font-size:15px;text-transform:uppercase;letter-spacing:.06em} .days span{display:block;margin-top:4px;color:var(--ink);font-weight:600}
.daytag{margin:24px 0 8px;text-align:center;font-size:18px;color:var(--ink)}
.faq details{border-top:1px solid var(--peach);padding:12px 0} .faq summary{cursor:pointer;font-weight:600;color:var(--ink)} .faq details p{margin:8px 0 0}
@media (max-width:820px){.tt-top{grid-template-columns:1fr} .tt{padding:18px} .yt-head{flex-direction:column;align-items:flex-start;gap:18px} .yt-cards,.days{grid-template-columns:1fr} .yt-ba{grid-template-columns:1fr} .yt-arrow{transform:rotate(90deg);justify-self:start} .ytband{padding:56px 0}}
@media (max-width:480px){.yt-play{width:72px;height:72px} .yt-play i{border-width:14px 0 14px 23px;margin-left:5px} .ai-ic{width:34px;height:34px;font-size:14px} .ai-node b{font-size:13px} .ai-node small{font-size:11px} .yt-ba b{font-size:17px} .yt-cards li:hover{box-shadow:0 0 12px rgba(224,36,36,.2)}}
@media (prefers-reduced-motion:reduce){.yt-play{animation:none} .yt-cards li{transition:none} .yt-cards li:hover{transform:none}}
@media (prefers-color-scheme:dark){.ai-node b,.ai-node small{background:#14110D} .ai-ic,.ai-hub span{color:#1A1A2E} .ai-ic.round{background:#FFE8D6} .days li{background:var(--white)}}
</style>`;
