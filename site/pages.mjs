/**
 * 🔴 almivisibility.almiworld.com — VISIBILITY'S OWN PUBLIC WEBSITE (RR-300; RR-302: "the site must look like the AlmiWorld products —
 * AlmiOET is the model"). CC writes the pages (the owner's RR-300 correction). English only. Bold but true: no ranking, traffic or citation
 * guarantee anywhere. Every number on the site carries its source and date, or is not shown: the prices and plan sizes are AlmiWorld's own
 * (set by the owner, 20 Oct 2026); the free test's limits and the ten languages are the product's own, as built and tested on 20 Oct 2026;
 * the hero card's SAMPLE numbers are marked SAMPLE, never a real score.
 * THE LAYOUT IS ALMIOET'S, READ FROM ITS CODE (almi-oet src/components/GlobalHeader.tsx, nav/FamilyNav.tsx, GlobalFooter.tsx, src/app/page.tsx):
 * a sticky header — the brand on the left, the family strip on row 1 and the product's own links on row 2; a two-column hero whose right
 * column is a card marked "Sample"; sections of rounded cards; the dark three-column footer (AlmiWorld · Products · Legal & Contact). The
 * colours are the AlmiWorld sunrise tokens (desktop/theme.mjs, the same values as almi-oet's globals.css) and the AlmiWorld logo.
 */
import { cssVariables } from "../desktop/theme.mjs";
import { PRIVACY_LINE, MARKETING_LINE } from "./leads.mjs";
import { LIMITS, NO_PROMISE } from "./free-test.mjs";
import { familyStrip, footerColumns } from "./family.mjs";

export const ORIGIN = "https://almivisibility.almiworld.com";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const PRICES_SOURCE = "Prices set by AlmiWorld on 20 October 2026.";
export const BUILT_ON = "As built and tested on 20 October 2026.";
export const PLANS = Object.freeze([
  { id: "visibility_1", price: 30, products: "1 product" }, { id: "visibility_5", price: 40, products: "up to 5 products" },
  { id: "visibility_10", price: 60, products: "up to 10 products" }, { id: "visibility_unlimited", price: 80, products: "unlimited products" },
]);
export const LANGS = Object.freeze(["English (EN)", "Spanish (ES)", "German (DE)", "Italian (IT)", "French (FR)", "Portuguese (PT)", "Arabic (AR)", "Urdu (UR)", "Hindi (HI)", "Chinese (ZH)"]);
const NAV = [["/", "Home"], ["/free-test", "Free test"], ["/features", "Features"], ["/pricing", "Pricing"], ["/download", "Download"]];
/** The five areas the score card lists, in this order (src/report/visibility-score.mjs categories). */
export const AREAS = Object.freeze([["TECHNICAL", "Technical"], ["CONTENT", "Content"], ["ACCESSIBILITY", "Accessibility"], ["LINKS", "Links"], ["SECURITY", "Security"]]);
/** The SAMPLE card before a test — illustrative, marked SAMPLE, never a real score. A NOT MEASURED area is shown as such even here. */
export const SAMPLE = Object.freeze({ score: 72, byCategory: { TECHNICAL: 88, CONTENT: 64, ACCESSIBILITY: 91, LINKS: null, SECURITY: null } });
/** The word under the number. A score that could not be measured is "Not measured" — never zero. */
export const scoreWord = (s) => (s === null || s === undefined ? "Not measured" : s >= 90 ? "Very good" : s >= 75 ? "Good" : s >= 50 ? "Needs work" : "Poor");

const CSS = `${cssVariables()}
*{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;background:var(--cream);color:var(--text);font:16px/1.6 var(--font);min-height:100vh;display:flex;flex-direction:column}
a{color:var(--ink)} main{flex:1 0 auto;width:100%}
.wrap{max-width:1152px;margin:0 auto;padding:0 24px}
.skip{position:absolute;left:-9999px} .skip:focus{left:12px;top:12px;background:var(--white);padding:8px 12px;border-radius:8px;z-index:60}
/* the header — almi-oet GlobalHeader: sticky, cream at 95%, a peach rule; brand left; family strip (row 1) and product links (row 2) right */
.site-header{position:sticky;top:0;z-index:40;background:rgba(255,251,245,.95);backdrop-filter:blur(6px);border-bottom:1px solid var(--peach)}
.site-header .bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:12px;padding-bottom:12px}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0} .brand img{height:40px;width:auto;display:block}
.brand .name{font-size:20px;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
.rows{display:flex;flex:1;flex-direction:column;align-items:flex-end;gap:8px}
.family{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:2px 16px} .family a{font-size:15px;font-weight:600;color:var(--text);text-decoration:none} .family a:hover{color:var(--coral)}
.product{display:flex;align-items:center;gap:16px} .product a{font-weight:600;color:var(--ink);text-decoration:none} .product a:hover,.product a[aria-current]{color:var(--coralDeep)}
.pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 22px;border-radius:999px;background:var(--coral);color:var(--ink);font-weight:600;text-decoration:none;border:0;font:inherit;font-weight:600;cursor:pointer}
.pill:hover{background:var(--coralDeep)} .pill.alt{background:var(--sunrise)} .pill.ghost{background:transparent;border:2px solid var(--coral)} .pill.big{min-height:50px;padding:12px 28px;font-size:17px}
.menu{display:none} .menu summary{list-style:none;cursor:pointer;border:1px solid var(--peach);border-radius:10px;padding:8px 12px;font-weight:600;color:var(--ink);background:var(--white)} .menu summary::-webkit-details-marker{display:none}
.menu .drawer{position:absolute;left:0;right:0;top:100%;background:var(--cream);border-bottom:1px solid var(--peach);padding:12px 24px 18px;max-height:75vh;overflow:auto}
.menu .drawer a{display:block;padding:7px 0;font-weight:600;color:var(--ink);text-decoration:none} .menu .drawer p{margin:14px 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
h1{color:var(--ink);font-size:clamp(34px,5vw,52px);line-height:1.08;font-weight:600;margin:0;text-wrap:balance} h2{color:var(--ink);font-size:clamp(26px,3.2vw,32px);font-weight:600;margin:0;text-align:center} h3{color:var(--ink);font-size:18px;font-weight:600;margin:0}
.eyebrow{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--sunriseDeep);margin:0 0 14px}
.sub{max-width:680px;margin:12px auto 0;text-align:center;color:var(--muted)}
/* the hero — almi-oet page.tsx: a cream-to-peach gradient, two soft glows, a two-column grid */
.hero{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--cream) 0%,var(--cream) 50%,var(--peach) 100%);padding:64px 0 80px}
.hero::before,.hero::after{content:"";position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
.hero::before{right:-64px;top:-64px;width:380px;height:380px;background:rgba(244,163,64,.2)} .hero::after{left:-64px;bottom:-64px;width:320px;height:320px;background:rgba(255,122,107,.1)}
.hero .grid2{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.hero .lead{font-size:18px;margin:20px 0 0;color:var(--text)} .hero .cta{margin-top:30px;display:flex;flex-wrap:wrap;gap:12px;align-items:center} .hero .small{margin-top:16px;font-size:14px;color:var(--muted)}
/* the score card — almi-oet's "Sample estimate" card: rounded-3xl, white, peach border, a deep shadow */
.scorecard{max-width:440px;margin:0 auto;background:var(--white);border:1px solid var(--peach);border-radius:24px;padding:24px;box-shadow:0 24px 48px -12px rgba(26,26,46,.18)}
.scorecard .top{display:flex;align-items:center;justify-content:space-between} .scorecard .label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0}
.badge{border-radius:999px;background:var(--peach);padding:2px 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink)} .badge.real{background:#D9F2EE}
.gaugebox{display:grid;grid-template-columns:1.15fr 1fr;gap:12px;align-items:center;margin-top:10px}
.gauge{position:relative} .gauge svg{display:block;width:100%;height:auto} .gauge .num{position:absolute;left:0;right:0;bottom:4px;text-align:center}
.gauge .num b{font-size:40px;line-height:1;color:var(--ink);font-weight:700} .gauge .num small{font-size:15px;color:var(--muted);font-weight:600} .gauge .num span{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-top:2px}
.areas{list-style:none;margin:0;padding:0;font-size:14px} .areas li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px dashed var(--peach)} .areas li:last-child{border-bottom:0}
.areas .n{font-weight:600;color:var(--ink)} .areas .v{font-weight:700;white-space:nowrap} .v.good{color:#0F7A43} .v.warn{color:#9A5B00} .v.nm{color:var(--muted);font-weight:600}
.testform{margin-top:16px;border-top:1px solid var(--peach);padding-top:16px;display:grid;gap:10px}
.testform label.f{font-size:13px;font-weight:600;color:var(--ink)} .testform input[type=text],.testform input[type=email]{width:100%;padding:11px 14px;border:2px solid var(--peach);border-radius:12px;font:inherit;background:var(--cream);color:var(--ink)}
.testform .tick{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--text)} .testform .tick input{margin-top:3px;width:18px;height:18px;flex-shrink:0}
.testform .pill{width:100%} .fine{font-size:12px;color:var(--muted);margin:0}
.err{color:#9F1D1D;font-weight:600;margin:0}
section.band{padding:64px 0} section.paper{background:var(--white);border-top:1px solid var(--peach)} section.peach{background:rgba(255,232,214,.4);border-top:1px solid var(--peach)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-top:36px;padding:0;list-style:none}
.card{background:var(--white);border:1px solid var(--peach);border-radius:16px;padding:24px;height:100%} .card p{margin:8px 0 0;font-size:15px}
.tick-card{display:flex;gap:12px;align-items:flex-start} .tick-card .t{color:var(--teal);font-weight:700}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:0;margin:28px 0 0;list-style:none} .chips li{background:var(--white);border:1px solid var(--peach);color:var(--ink);border-radius:999px;padding:6px 16px;font-size:14px}
.steps{counter-reset:s} .steps .card h3::before{counter-increment:s;content:counter(s);display:inline-flex;width:30px;height:30px;border-radius:50%;background:var(--coral);color:var(--ink);align-items:center;justify-content:center;margin-right:10px;font-size:15px}
.price{font-size:42px;font-weight:700;color:var(--ink);line-height:1} .price small{font-size:16px;font-weight:600;color:var(--muted)}
.note{font-size:14px;color:var(--muted)} .center{text-align:center}
.draft{background:#FFF1C9;color:var(--ink);border:2px dashed var(--sunriseDeep);border-radius:12px;padding:12px 16px;font-weight:600}
.page{padding:56px 0 24px} .page h1{font-size:clamp(32px,4.4vw,44px)} .page .lead{font-size:18px;max-width:720px}
.prose{max-width:760px} .prose h2{text-align:left;font-size:22px;margin:28px 0 6px}
.result-detail{margin-top:28px} .result-detail ul,.result-detail ol{padding-left:20px} .nmtext{color:var(--muted)}
.final{background:var(--ink);color:var(--cream);border-radius:24px;padding:40px 28px;text-align:center} .final h2{color:var(--cream)} .final p{color:#E6E2DA}
/* the footer — almi-oet GlobalFooter: night, three columns, gold headings */
.site-footer{background:var(--night);color:rgba(255,255,255,.75);margin-top:0} .site-footer .wrap{padding-top:48px;padding-bottom:48px}
.fcols{display:grid;grid-template-columns:repeat(3,1fr);gap:40px} .fcols p{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);margin:0}
.fcols ul{list-style:none;margin:16px 0 0;padding:0;font-size:14px} .fcols li{margin:0 0 8px} .fcols a{color:rgba(255,255,255,.75);text-decoration:none} .fcols a:hover{color:var(--gold)}
.fcols .products ul{columns:2;column-gap:24px}
.copy{margin-top:48px;border-top:1px solid rgba(255,255,255,.15);padding-top:24px;text-align:center;font-size:12px;color:rgba(255,255,255,.6)} .copy a{color:rgba(255,255,255,.75)}
.admin{display:flex;gap:24px;align-items:flex-start;padding:32px 0} .admin nav{flex:0 0 200px;background:var(--white);border:1px solid var(--peach);border-radius:16px;padding:10px}
.admin nav a{display:block;padding:9px 12px;border-radius:10px;text-decoration:none;font-weight:600;color:var(--ink)} .admin nav a[aria-current]{background:var(--peach)}
.admin .body{flex:1;min-width:0} table.t{width:100%;border-collapse:collapse;font-size:14px;background:var(--white)} table.t th,table.t td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--peach);vertical-align:top} table.t th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.tablewrap{overflow-x:auto;border:1px solid var(--peach);border-radius:12px}
.stat{display:inline-block;background:var(--white);border:1px solid var(--peach);border-radius:14px;padding:12px 18px;margin:0 10px 10px 0} .stat b{display:block;font-size:26px;color:var(--ink)}
@media (max-width:1023px){.rows{display:none} .menu{display:block}}
@media (max-width:820px){.hero .grid2{grid-template-columns:1fr;gap:36px} .hero{padding:40px 0 56px} .fcols{grid-template-columns:1fr} .admin{flex-direction:column} .admin nav{flex:none;width:100%;display:flex;flex-wrap:wrap}}
@media (max-width:480px){.wrap{padding:0 16px} .brand img{height:32px} .brand .name{font-size:17px} .gaugebox{grid-template-columns:1fr} .scorecard{padding:18px} section.band{padding:48px 0}}`;

/** The half-circle gauge, red → yellow → green; the value arc fills to the score (none when not measured). */
export function gauge(score) {
  const v = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const arc = "M 16 104 A 88 88 0 0 1 192 104";
  return `<div class="gauge" role="img" aria-label="${v === null ? "Score not measured" : `Score ${v} out of 100, ${scoreWord(v)}`}"><svg viewBox="0 0 208 116" aria-hidden="true"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#DC2626"/><stop offset=".5" stop-color="#EAB308"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs>
<path d="${arc}" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round" opacity=".22"/>${v === null ? "" : `<path d="${arc}" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${v} 100"/>`}</svg>
<div class="num">${v === null ? "<b>—</b>" : `<b>${v}</b><small> /100</small>`}<span>${scoreWord(v)}</span></div></div>`;
}
const areaList = (byCategory) => `<ul class="areas">${AREAS.map(([k, name]) => { const v = byCategory?.[k] ?? null; return `<li><span class="n">${name}</span>${v === null ? '<span class="v nm">Not measured</span>' : v >= 80 ? `<span class="v good">✓ ${v}</span>` : `<span class="v warn">⚠ ${v}</span>`}</li>`; }).join("")}</ul>`;

/** The hero's score card: SAMPLE before a test; the real result after one — the same gauge and areas; the test form inside it. */
export function scoreCard({ result = null, error = null, values = {}, back = "/free-test", emailOn = false } = {}) {
  const real = Boolean(result);
  const s = real ? result : SAMPLE;
  return `<div class="scorecard" id="test"><div class="top"><p class="label">${real ? "Your website score" : "Sample estimate"}</p><span class="badge${real ? " real" : ""}">${real ? "Your result" : "Sample"}</span></div>
${real ? `<p class="fine" style="margin-top:6px">${esc(result.url)} · ${result.pagesRead} of up to ${result.pagesLimit} pages · ${esc(String(result.testedOn).slice(0, 10))}</p>` : ""}
<div class="gaugebox">${gauge(s.score)}${areaList(s.byCategory)}</div>
${real ? "" : '<p class="fine" style="text-align:center;margin-top:8px">SAMPLE — an illustrative example, not a real score.</p>'}
<form class="testform" method="post" action="/free-test"><input type="hidden" name="back" value="${back === "/" ? "/" : "/free-test"}">
<div><label class="f" for="url">Your website address</label><input id="url" name="url" type="text" inputmode="url" autocomplete="url" placeholder="yourwebsite.com" required value="${esc(values.url ?? "")}"></div>
${emailOn ? `<div><label class="f" for="email">Email for the full report <span class="note">(optional)</span></label><input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(values.email ?? "")}"></div>
<label class="tick"><input type="checkbox" name="marketing" value="yes"> <span>${esc(MARKETING_LINE)}</span></label>` : ""}
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}
<button class="pill big" type="submit">Test my site</button>
<p class="fine">Free: ${LIMITS.testsPerPersonPerDay} tests a day, up to ${LIMITS.pagesPerTest} pages each.${emailOn ? ` The result shows with or without an email. ${esc(PRIVACY_LINE)}` : " No email needed."} <a href="/privacy">Privacy</a></p>
</form></div>`;
}

/** RR-303 B: what the visitor is told about the email — only what happened. */
export const emailNotice = (e) => (!e ? "" : e.sent ? `<p class="card" role="status" style="margin-top:20px">We have emailed your full report to <b>${esc(e.to)}</b>.</p>` : `<p class="card" role="status" style="margin-top:20px">We could not send the email just now — nothing was sent. Your result is shown here.</p>`);

/** One page, AlmiOET's frame: skip link, sticky header (brand · family strip · product links · mobile menu), the page, the footer. */
export function frame({ path, title, description, body, noindex = false }) {
  const strip = familyStrip();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${ORIGIN}${path === "/" ? "/" : path}">`}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><link rel="icon" href="/favicon.ico">
<style>${CSS}</style></head><body><a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-testid="global-header"><div class="wrap bar">
<a class="brand" href="/" aria-label="AlmiVisibility home"><img src="/brand/almiworld-logo.png" alt="AlmiWorld — live beautifully" width="96" height="40"><span class="name">AlmiVisibility</span></a>
<div class="rows"><nav class="family" aria-label="Family navigation">${strip.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</nav>
<nav class="product" aria-label="AlmiVisibility">${NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="pill" href="/#test">Test my site</a></nav></div>
<details class="menu"><summary aria-label="Open menu">Menu</summary><div class="drawer"><p>AlmiVisibility</p>${NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<p>AlmiWorld</p>${strip.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</div></details>
</div></header>
<main id="main">${body}</main>
<footer class="site-footer"><div class="wrap"><div class="fcols">${footerColumns().map((c) => `<div class="${c.title === "Products" ? "products" : ""}"><p>${esc(c.title)}</p><ul>${c.links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>
<div class="copy">© ${new Date().getFullYear()} AlmiWorld. All rights reserved. · AlmiVisibility <a href="/privacy">privacy</a> · <a href="/terms">terms</a></div></div></footer>
</body></html>`;
}

const section = (cls, inner) => `<section class="band ${cls}"><div class="wrap">${inner}</div></section>`;
const cardList = (items, extra = "") => `<ul class="cards ${extra}">${items.map(([h, p]) => `<li class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("")}</ul>`;
export const FEATURES = Object.freeze([
  ["One page builder, your design", "Every page uses your own website's look — your logo, header and links — then key-fact cards, then questions and answers, each answer with its source and checked date."],
  ["New pages only where they help", "A page is made only for a real question with a sourced answer. If one of your pages already answers it, the answer joins that page as a section instead of a duplicate page."],
  ["A daily article", "One article a day by default — you choose the number. Only from your product's real questions that no page or earlier article answers yet. If none is worthy that day, no article is made, and you are told why."],
  ["Publish your way", "Publish automatically after every gate passes, or choose “show me first” and approve each page yourself."],
  ["Auto-refresh", "When a source changes a fact, every page and article that shows it is rebuilt with the new value, its source and the new checked date. If the new value cannot be read word for word, nothing changes and you are told."],
  ["Social posts", "Two or three short posts for each article, ready to copy to Facebook or LinkedIn — each with the article's link and one sourced fact. You post them yourself."],
  ["A monthly report", "One plain page a month, readable on a phone, bad news first: what was made, what was refreshed, your own search numbers (or “not connected” — never a zero), and next month's topics."],
  ["Three ways to bring your search data", "Your own search API key, your own Google Search Console, or your own AI search account. You choose; the cost of your own connection stays yours."],
  ["Your own AI connection", "Writing and translating run on your own AI account. Your key stays in your computer's settings — the app asks only for its name, never the key itself."],
  ["A Windows app", "Install it like any Windows program. Your data stays on your computer, and a newer version installs itself only when you agree."],
]);
export const YOUTUBE = "Visibility checks your own channel — missing titles, descriptions, chapters, thumbnail text and links back to your product page — and suggests titles, tags and chapters only from your real search phrases and questions. It writes a short video script from each article; you make the video. It reads your channel only through your own YouTube key or a YouTube Studio export you import — never by scraping youtube.com.";
const priceCards = () => `<ul class="cards">${PLANS.map((p) => `<li class="card center"><div class="price">$${p.price}<small> / month</small></div><p><b>${esc(p.products)}</b></p><form method="post" action="/api/billing/checkout"><input type="hidden" name="plan" value="${p.id}"><button class="pill" type="submit">Buy</button></form></li>`).join("")}</ul><p class="note center" style="margin-top:16px">${PRICES_SOURCE} Per month, in US dollars. Every plan has every feature — plans differ only in how many products you add. There is no free trial; the website test is free for everyone.</p>`;

export const home = ({ result = null, error = null, values = {}, emailOn = false, emailed = null } = {}) => frame({ path: "/", title: "AlmiVisibility — is your website easy to find on Google and in AI answers?", description: "Test your website free: a visibility score out of 100 for technical basics, content, accessibility, links and security — then AlmiVisibility builds the sourced pages your customers search for.",
  body: `<section class="hero"><div class="wrap grid2"><div>
<p class="eyebrow">AlmiVisibility · Website visibility</p>
<h1>Is your website easy to find on Google and in <span style="color:var(--coralDeep)">AI answers?</span></h1>
<p class="lead">Test it free in a minute. AlmiVisibility reads up to ${LIMITS.pagesPerTest} of your pages, scores what it can measure, and shows what to fix first. Then it builds the pages your customers are searching for — every fact with its source and the date it was checked.</p>
<div class="cta"><a class="pill big" href="#test">Test my site free</a><a class="pill ghost" href="/features">See what it does</a></div>
<p class="small">${esc(NO_PROMISE)}</p>${emailNotice(emailed)}</div>
<div>${scoreCard({ result, error, values, back: "/", emailOn })}</div></div></section>
${section("paper", `<h2>What AlmiVisibility does</h2><p class="sub">Clear, correct pages that search engines and AI answers can trust — built from your own product's real questions.</p>${cardList([
  ["It reads your real questions", "The questions people search for about your product — from your own Search Console, your own search key, or your own AI search. Never questions it made up."],
  ["It answers from sources", "Each answer is built from official sources, with the source named and the date it was checked. Numbers and conditions stay exactly as the source says them."],
  ["It checks before it publishes", "Five gates — no duplicate, no competing page, clean technical basics, a known cost, existing pages first. A page that fails a gate is not published, and you are told why."],
])}`)}
${section("", `<h2>The features</h2><p class="sub">Every plan has every feature.</p>${cardList(FEATURES.slice(0, 6))}<p class="center" style="margin-top:24px"><a class="pill ghost" href="/features">All features</a></p>`)}
${section("peach", `<h2>Ten languages</h2><p class="sub">The same facts, numbers, sources and dates in every language — only the wording changes. Arabic and Urdu are written right to left.</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`)}
${section("", `<h2>YouTube, too</h2><div class="card tick-card" style="max-width:820px;margin:32px auto 0"><span class="t" aria-hidden="true">✓</span><p style="margin:0">${esc(YOUTUBE)}</p></div>`)}
${section("paper", `<h2>How it works</h2>${cardList([
  ["Install the app", "Download AlmiVisibility for Windows and install it like any program. Your data stays on your computer."],
  ["Add your product", "Your company, your product and its website. Connect the search data you already have — or none at first."],
  ["Get results", "Pages, a daily article, refreshes when a source changes, social posts and a monthly report — each checked before it goes out."],
], "steps")}`)}
${section("", `<h2>Simple plans</h2>${priceCards()}`)}
${section("", `<div class="final"><h2>See where your website stands</h2><p>Free, in about a minute. No account needed.</p><p><a class="pill big" href="#test">Test my site</a></p></div>`)}` });

export const freeTest = ({ result = null, error = null, left = null, values = {}, emailOn = false, emailed = null } = {}) => frame({ path: "/free-test", title: "Free website visibility test — AlmiVisibility", description: `Enter your website and get an instant visibility score out of 100 and what to fix first. Up to ${LIMITS.pagesPerTest} pages, ${LIMITS.testsPerPersonPerDay} tests a day, free.`,
  body: `<section class="hero"><div class="wrap grid2"><div><p class="eyebrow">Free website test</p><h1>How visible is my website?</h1>
<p class="lead">Enter your website. We read up to ${LIMITS.pagesPerTest} of its pages — politely, following its robots.txt — and show your score and what to fix first.</p>
<p class="small">${BUILT_ON} We never log in, never fill in forms and never read a page your robots.txt asks us not to. ${esc(NO_PROMISE)}</p>
${emailNotice(emailed)}</div>
<div>${scoreCard({ result, error, values, emailOn })}</div></div></section>${result ? resultDetail(result, left) : ""}` });

function resultDetail(r, left) {
  return `<section class="band paper" id="result"><div class="wrap prose result-detail" style="margin:0 auto"><h2 style="text-align:left">Your result for ${esc(r.url)}</h2>
<p class="note">Tested ${esc(String(r.testedOn).slice(0, 16).replace("T", " "))} UTC · ${r.pagesRead} of up to ${r.pagesLimit} pages read${left !== null ? ` · ${left} free test(s) left today` : ""}</p>
<p>The score counts only the checks we could measure. An area we could not measure shows “Not measured” — it is never counted as zero.</p>
<h3>By area</h3><ul>${AREAS.map(([k, n]) => `<li>${n}: ${r.byCategory?.[k] === null || r.byCategory?.[k] === undefined ? '<span class="nmtext">Not measured</span>' : `${r.byCategory[k]} / 100`}</li>`).join("")}</ul>
<h3>What to fix first</h3>${r.nextActions.length ? `<ol>${r.nextActions.map((a) => `<li><b>${esc(a.check)}</b> — ${esc(a.action)} <span class="note">(${a.pages} page${a.pages === 1 ? "" : "s"})</span></li>`).join("")}</ol>` : "<p>Nothing failed among the checks we measured.</p>"}
<h3>Measured</h3><p>${r.measured.map(esc).join(", ") || "nothing"}</p>
<h3>Not measured in this free test</h3><ul class="nmtext">${r.notMeasured.map((n) => `<li>${esc(n)}</li>`).join("") || "<li>none</li>"}</ul>
${r.skipped.length ? `<h3>Pages not read</h3><ul class="nmtext">${r.skipped.slice(0, 10).map((s) => `<li>${esc(s.url)} — ${esc(s.why)}</li>`).join("")}</ul>` : ""}
<p class="note">${esc(r.noPromise)}</p></div></section>`;
}

export const features = () => frame({ path: "/features", title: "Features — AlmiVisibility", description: "One page builder in your own design, daily articles, auto-refresh when a source changes, social posts, a monthly report, ten languages, YouTube, three ways to bring your search data, and a Windows app.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Features</p><h1>Everything your visibility needs, in one app</h1><p class="lead">${BUILT_ON} Every plan has every feature.</p></div></section>
${section("paper", `<h2>What it does for you</h2>${cardList(FEATURES)}`)}
${section("", `<h2>YouTube, too</h2><div class="card tick-card" style="max-width:820px;margin:32px auto 0"><span class="t" aria-hidden="true">✓</span><p style="margin:0">${esc(YOUTUBE)}</p></div>`)}
${section("peach", `<h2>Ten languages</h2><p class="sub">The same facts, numbers, sources and dates in every language — only the wording changes. Arabic and Urdu are written right to left.</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`)}
${section("", `<div class="final"><h2>Start with the free test</h2><p>See your score before you decide.</p><p><a class="pill big" href="/#test">Test my site</a></p></div>`)}` });

export const pricing = () => frame({ path: "/pricing", title: "Pricing — AlmiVisibility", description: "AlmiVisibility plans: $30 a month for 1 product, $40 for up to 5, $60 for up to 10, $80 for unlimited products. No free trial.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Pricing</p><h1>Simple plans</h1><p class="lead">Pick the number of products. Every plan has every feature. There is no free trial.</p></div></section>
${section("paper", priceCards())}
${section("", `<div class="final"><h2>Not sure yet?</h2><p>Run the free website test first.</p><p><a class="pill big" href="/#test">Test my site</a></p></div>`)}` });

export const download = ({ setupAvailable = false } = {}) => frame({ path: "/download", title: "Download AlmiVisibility for Windows", description: "Download AlmiVisibility for Windows: install it like any program, add your product, and get sourced pages, articles and a monthly report.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Download</p><h1>AlmiVisibility for Windows</h1>
<p class="lead">Download the installer, click Next, Install and Finish, and open AlmiVisibility from your desktop.</p>
<div class="cta"><a class="pill big" href="/download/AlmiVisibility-Setup.exe"${setupAvailable ? "" : ' aria-disabled="true"'} download>Download here</a><a class="pill ghost" href="/pricing">See the plans</a></div>
<p class="small">Windows 10 or 11. Your data stays on your own computer. The installer is not yet code-signed, so Windows may show an “unknown publisher” warning when you open it — choose “More info”, then “Run anyway”.</p></div></section>
${section("paper", `<h2>After you install</h2>${cardList([
  ["Add your product", "Your company, your product and its website."],
  ["Choose your plan", "Pay monthly by card. Your plan sets how many products you can add."],
  ["Get results", "Pages, articles, refreshes, social posts and a monthly report — each checked before it goes out."],
], "steps")}`)}` });

const draftNote = `<p class="draft">DRAFT for AlmiWorld's review — not legal advice. This text is a plain-words draft and is not yet in force.</p>`;
export const privacy = () => frame({ path: "/privacy", title: "Privacy — AlmiVisibility", description: "How AlmiVisibility handles the website test and the emails people choose to leave.", noindex: true,
  body: `<section class="page"><div class="wrap prose"><h1>Privacy</h1>${draftNote}
<h2>The free website test</h2><p>When you test a website, we read up to ${LIMITS.pagesPerTest} of its public pages, following its robots.txt. We keep a record of each test — the website tested, its score and the date — but not who ran it. To limit tests to ${LIMITS.testsPerPersonPerDay} a day per person, we keep a scrambled code made from your internet address for that day only — not the address itself.</p>
<h2>Your email</h2><p>Your email is optional. If you give it, we keep it to send you the full report. We send you news about AlmiVisibility only if you tick that separate box. We never sell it. Ask us at any time and we delete it.</p>
<h2>Where it is kept</h2><p>Emails and test records are kept in AlmiVisibility's own database. Only AlmiWorld can see them.</p>
<h2>The Windows app</h2><p>The app keeps your products, settings and reports on your own computer.</p>
<h2>Contact</h2><p>AlmiWorld — <a href="https://almiworld.com/contact-us/">almiworld.com/contact-us</a></p></div></section>` });

export const terms = () => frame({ path: "/terms", title: "Terms — AlmiVisibility", description: "The plain-words terms of AlmiVisibility.", noindex: true,
  body: `<section class="page"><div class="wrap prose"><h1>Terms</h1>${draftNote}
<h2>What you get</h2><p>AlmiVisibility helps you plan, build and keep pages for your own products, in your own design. You decide what is published.</p>
<h2>No guarantee of rankings</h2><p>No one controls search engines or AI answers. AlmiVisibility does not promise any ranking, traffic, citation or sales.</p>
<h2>Your content and your connections</h2><p>You are responsible for your own products, your own sites and the connections you add (search data, AI account, YouTube). Their costs are yours.</p>
<h2>Plans and payment</h2><p>Plans are paid monthly. There is no free trial. You can cancel at any time; your data stays on your computer.</p>
<h2>The free website test</h2><p>Test only websites you are allowed to test. We follow each site's robots.txt and read at most ${LIMITS.pagesPerTest} pages.</p></div></section>` });

export const buyNotConnected = (plan, state = "DEFERRED") => frame({ path: "/buy", title: "Checkout — AlmiVisibility", description: "AlmiVisibility checkout.", noindex: true,
  body: `<section class="page"><div class="wrap prose"><h1>Checkout is not connected here</h1><p>${state === "REFUSED" ? "This plan cannot be bought here." : `This copy of the site has no payment connection${plan ? ` for the plan ${esc(plan)}` : ""}.`} Nothing was charged.</p><p><a class="pill" href="/pricing">Back to the plans</a></p></div></section>` });
/** RR-303 A: after a paid checkout — the buyer's licence key and where it goes in the app. The page names no price and no card. */
export const buySuccess = (c) => frame({ path: "/buy/success", title: "Thank you — AlmiVisibility", description: "Your AlmiVisibility licence key.", noindex: true,
  body: c ? `<section class="page"><div class="wrap prose"><h1>Thank you — your plan is being switched on</h1><p>Your licence key (keep it private):</p><p class="card" style="font-family:Consolas,monospace;font-size:18px;word-break:break-all">${esc(c.licenceKey)}</p>
<h2>Put it in the app</h2><ol><li><a href="/download">Download AlmiVisibility</a> and install it.</li><li>Open it, choose <b>Your plan</b> on the home screen, paste the key and press <b>Save</b>.</li><li>Your plan shows as active once the payment is confirmed (usually within a minute).</li></ol></div></section>`
    : `<section class="page"><div class="wrap prose"><h1>We could not find this checkout</h1><p>If you paid, <a href="https://almiworld.com/contact-us/">contact us</a> with the email address you paid with — we find your payment and send you your licence key.</p></div></section>` });
/** RR-303 B: unsubscribe — one button; nothing happens on opening the link. */
export const unsubscribe = ({ token, done = null }) => frame({ path: "/unsubscribe", title: "Unsubscribe — AlmiVisibility", description: "Stop emails from AlmiVisibility.", noindex: true,
  body: `<section class="page"><div class="wrap prose"><h1>${done === true ? "You are unsubscribed" : done === false ? "This link is not known" : "Stop emails from AlmiVisibility"}</h1>${done === null ? `<form method="post" action="/unsubscribe?t=${encodeURIComponent(token)}"><button class="pill" type="submit">Unsubscribe</button></form>` : done ? "<p>We will not email you again.</p>" : "<p>Nothing was changed.</p>"}</div></section>` });

/* ── the private admin — almi-oet's admin: its own heading, a left sidebar of sections, noindex ───────────────────────────────── */
const ADMIN_NAV = [["/admin", "Overview"], ["/admin/leads", "Leads"], ["/admin/tests", "Free tests"], ["/admin/sales", "Licences and sales"]];
const adminFrame = (path, title, inner, who) => frame({ path, title: `${title} — AlmiVisibility admin`, description: "Private.", noindex: true,
  body: `<div class="wrap"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-top:28px"><div><p class="eyebrow" style="margin:0">AlmiVisibility</p><h1 style="font-size:28px">Admin</h1></div>${who ? `<form method="post" action="/admin/logout"><span class="note">${esc(who)}</span> <button class="pill ghost" type="submit" style="min-height:36px;padding:6px 16px">Sign out</button></form>` : ""}</div>
<div class="admin"><nav aria-label="Admin">${ADMIN_NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav><div class="body">${inner}</div></div></div>` });

export const adminLogin = (error = null) => frame({ path: "/admin", title: "Admin sign in — AlmiVisibility", description: "Private.", noindex: true,
  body: `<section class="page"><div class="wrap" style="max-width:460px"><p class="eyebrow">AlmiVisibility</p><h1 style="font-size:30px">Admin sign in</h1>
<form method="post" action="/admin/login" class="scorecard testform" style="margin-top:20px;border-top:1px solid var(--peach)">
<div><label class="f" for="ae">Email</label><input id="ae" name="email" type="email" autocomplete="username" required></div>
<div><label class="f" for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required style="width:100%;padding:11px 14px;border:2px solid var(--peach);border-radius:12px;font:inherit;background:var(--cream)"></div>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}<button class="pill" type="submit">Sign in</button></form></div></section>` });

export function adminOverview({ tests, leads, counts, storeKind, who }) {
  return adminFrame("/admin", "Overview", `<p class="note">Store: ${esc(storeKind)}</p>
<div><span class="stat"><b>${tests.length}</b>free tests</span><span class="stat"><b>${leads.length}</b>leads</span><span class="stat"><b>${leads.filter((l) => l.marketing === true).length}</b>said yes to marketing</span></div>
<h2 style="text-align:left;font-size:20px;margin:18px 0 10px">Daily counts</h2>
<div class="tablewrap"><table class="t"><tr><th>Day</th><th>Free tests</th><th>Leads</th><th>Marketing yes</th></tr>${counts.map((c) => `<tr><td>${esc(c.day)}</td><td>${c.tests}</td><td>${c.leads}</td><td>${c.marketingYes}</td></tr>`).join("") || '<tr><td colspan="4">Nothing yet.</td></tr>'}</table></div>`, who);
}
export const adminLeads = ({ leads, storeKind, who }) => adminFrame("/admin/leads", "Leads", `<p class="note">Store: ${esc(storeKind)} · ${leads.length} lead(s) · a lead exists only when the visitor gave an email. <a class="pill alt" href="/admin/leads.csv" style="min-height:36px;padding:6px 16px;margin-left:8px">Export CSV</a></p>
<div class="tablewrap"><table class="t"><tr><th>Email</th><th>Site</th><th>Date</th><th>Marketing</th></tr>${leads.map((l) => `<tr><td>${esc(l.email)}</td><td>${esc(l.testedUrl ?? "")}</td><td>${esc(String(l.at).slice(0, 10))}</td><td>${l.marketing === true ? "yes" : "no"}</td></tr>`).join("") || '<tr><td colspan="4">No leads yet.</td></tr>'}</table></div>`, who);
export const adminTests = ({ tests, storeKind, who }) => adminFrame("/admin/tests", "Free tests", `<p class="note">Store: ${esc(storeKind)} · ${tests.length} test(s) · the visitor is never recorded.</p>
<div class="tablewrap"><table class="t"><tr><th>Site</th><th>Score</th><th>Pages</th><th>Date</th></tr>${tests.map((t) => `<tr><td>${esc(t.site)}</td><td>${t.score === null || t.score === undefined ? "Not measured" : `${t.score} / 100`}</td><td>${t.pages}</td><td>${esc(String(t.at).slice(0, 16).replace("T", " "))}</td></tr>`).join("") || '<tr><td colspan="4">No tests yet.</td></tr>'}</table></div>`, who);
/* RR-304: the owner licence is listed as "Owner — AlmiWorld" (no expiry, no payment) and can be revoked; a paid licence is never shown in full */
const ownerRow = ([k, v], refOf) => `<tr><td>Owner — AlmiWorld</td><td>Unlimited</td><td>${esc(v.status)}</td><td>No expiry</td><td>${v.status === "REVOKED" ? "Revoked" : `<form method="post" action="/admin/licences/revoke"><input type="hidden" name="ref" value="${esc(refOf(k))}"><button class="ghost" type="submit">Revoke</button></form>`}</td></tr>`;
const ownerForm = `<div class="card"><h3>Add the owner licence</h3><p>Paste the owner licence text (it starts with avo_). It is checked against this site's own signing key before it is saved.</p><form method="post" action="/admin/licences/owner"><label>Owner licence<input name="licence" autocomplete="off" spellcheck="false"></label> <button class="pill" type="submit">Add</button></form></div>`;
export const adminSales = ({ who, licences = {}, connected = false, refOf = (k) => k.slice(0, 9), note = null }) => {
  const rows = Object.entries(licences);
  const owners = rows.filter(([, v]) => v.kind === "OWNER"), paid = rows.filter(([, v]) => v.kind !== "OWNER");
  const ownerPart = `${owners.length ? `<div class="tablewrap"><table class="t"><tr><th>Licence</th><th>Plan</th><th>Status</th><th>Expiry</th><th></th></tr>${owners.map((r) => ownerRow(r, refOf)).join("")}</table></div>` : ""}${ownerForm}`;
  const paidPart = connected || paid.length ? `<p class="note">${paid.length} paid licence(s) · each from a Stripe subscription through the AlmiWorld billing router.</p><div class="tablewrap"><table class="t"><tr><th>Licence key</th><th>Plan</th><th>Status</th><th>Paid until</th></tr>${paid.map(([k, v]) => `<tr><td>${esc(k.slice(0, 9))}…</td><td>${esc(v.plan)}</td><td>${esc(v.status)}</td><td>${esc(String(v.periodEnd).slice(0, 10))}</td></tr>`).join("") || '<tr><td colspan="4">No licence yet.</td></tr>'}</table></div>` : `<div class="card"><h3>Not connected yet</h3><p>Paid licences and sales appear here once AlmiWorld's Stripe prices exist and the payment connection is set. Nothing is counted until then — this is not zero sales.</p></div>`;
  return adminFrame("/admin/sales", "Licences and sales", `${note ? `<p class="err">${esc(note)}</p>` : ""}${ownerPart}${paidPart}`, who);
};
