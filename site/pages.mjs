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
import { feeShown } from "../desktop/rates.mjs"; // RR-333
import { hostOf } from "../desktop/country-facts.mjs"; // RR-333: a guidance answer's source
import { cssVariables } from "../desktop/theme.mjs";
import { PRIVACY_LINE, MARKETING_LINE } from "./leads.mjs";
import { LIMITS, NO_PROMISE } from "./free-test.mjs";
import { familyStrip, footerColumns } from "./family.mjs";
import { loadLegal, fillsIn, renderLegal } from "./legal.mjs"; // RR-325 C
import { LITE_LIMITS as LITE } from "./limits.mjs"; // RR-325 B
import { LOCATIONS } from "./kw-seeds.mjs"; // RR-326
import { FINDER, SOURCE_LINE, periodWords, rangeOf } from "./kw-finder.mjs";
import { ACCESS_LINE, plainError, reasonLine, ownerRefusal } from "./kw-google.mjs";
import { articleQuality, ARTICLES } from "./articles.mjs"; // RR-335: F40 on every draft
const ARTICLES_JUDGED_PER_DAY = ARTICLES.judgedPerDay;

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
@media (max-width:480px){.wrap{padding:0 16px} .brand img{height:32px} .brand .name{font-size:17px} .gaugebox{grid-template-columns:1fr} .scorecard{padding:18px} section.band{padding:48px 0}}
/* RR-325: the owner's legal pages, the keyword finder and the honeypot */
table.legal{width:100%;border-collapse:collapse;font-size:15px;background:var(--white)} table.legal th,table.legal td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--peach);vertical-align:top} table.legal th{color:var(--ink)}
.prose ul{padding-left:22px} .prose li{margin:4px 0} mark.fill{background:#FDE68A;color:#1A1A2E;padding:0 4px;border-radius:4px;font-weight:700}
.soon{display:inline-block;border-radius:999px;background:var(--sunrise);color:#1A1A2E;padding:2px 12px;font-size:13px;font-weight:700;margin-left:8px;vertical-align:middle}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.made{margin-top:28px;text-align:center;font-weight:600;color:var(--ink)}
/* RR-325 (owner, 25 Oct): the moving meter while a score is checked; the real score fills the gauge */
.meter{margin-top:12px} .meter .bar{position:relative;height:8px;border-radius:999px;background:var(--peach);overflow:hidden} .meter .bar span{position:absolute;top:0;bottom:0;width:35%;border-radius:999px;background:linear-gradient(90deg,#DC2626,#EAB308,#16A34A);animation:run 1.4s ease-in-out infinite}
@keyframes run{from{left:-35%}to{left:100%}} @keyframes sweep{from{stroke-dasharray:4 100}to{stroke-dasharray:100 100}} @keyframes fill{from{stroke-dasharray:0 100}}
.live.real .gauge path.val{animation:fill 1.2s ease-out} .live.busy .gauge path.val{animation:sweep 1.1s ease-in-out infinite alternate} .live.busy .areas,.live.busy .gaugebox+.fine{opacity:.45}
.testform button[disabled]{opacity:.7;cursor:progress}
/* RR-326: the keyword finder and the owner's page */
.kwcard{max-width:760px;margin:24px auto 0;background:var(--white);border:1px solid var(--peach);border-radius:18px;padding:22px} .kwcard .testform{border-top:0;margin-top:0;padding-top:0}
.kwresult table.t{table-layout:fixed} .kwresult table.t th:first-child{width:68%} .kwresult table.t td{overflow-wrap:anywhere}
.kwrow{display:grid;grid-template-columns:2fr 1fr;gap:12px} .kwform select{width:100%;padding:12px;border:1px solid var(--peach);border-radius:12px;background:var(--cream);color:var(--text);font:inherit}
.kwresult{max-width:900px;margin:28px auto 0} .kwresult h4{margin:22px 0 8px;color:var(--ink)} .kwresult .source{font-size:14px;color:var(--muted)} .kwnext{margin-top:24px;display:flex;gap:10px;flex-wrap:wrap}
.owner h2{text-align:left;margin-top:28px} .owner textarea{background:var(--white);color:var(--text);border:1px solid var(--peach);border-radius:12px;padding:10px}
@media (max-width:600px){.kwrow{grid-template-columns:1fr} .kwcard{padding:16px}}
@media (prefers-reduced-motion:reduce){.live .gauge path.val,.meter .bar span{animation:none} .meter .bar span{left:0;width:100%;opacity:.6}}
/* RR-325: dark mode — the same layout in the night colours; button words stay dark on the coral and sunrise buttons (WCAG 4.5:1) */
@media (prefers-color-scheme:dark){:root{--cream:#14110D;--white:#1E1A15;--peach:#3A2F22;--ink:#FDF6EC;--text:#E9E1D3;--muted:#C9BDAA}
.site-header{background:rgba(20,17,13,.95)} .hero{background:linear-gradient(135deg,#14110D 0%,#14110D 50%,#2A2119 100%)} section.peach{background:rgba(58,47,34,.35)}
.pill,.pill.alt,.steps .card h3::before,.badge,.draft{color:#1A1A2E} .pill.ghost{color:var(--ink)} .badge{background:#FFE8D6} .badge.real{background:#D9F2EE}
.v.good{color:#5FD39A} .v.warn{color:#F4C15A} .err{color:#FF9B8F} .final{background:#2A2119} .final h2,.final p{color:var(--ink)} .scorecard{box-shadow:none}}`;

/** The half-circle gauge, red → yellow → green; the value arc fills to the score (none when not measured). */
export function gauge(score) {
  const v = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const arc = "M 16 104 A 88 88 0 0 1 192 104";
  return `<div class="gauge" role="img" aria-label="${v === null ? "Score not measured" : `Score ${v} out of 100, ${scoreWord(v)}`}"><svg viewBox="0 0 208 116" aria-hidden="true"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#DC2626"/><stop offset=".5" stop-color="#EAB308"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs>
<path d="${arc}" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round" opacity=".22"/>${v === null ? "" : `<path class="val" d="${arc}" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${v} 100"/>`}</svg>
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
/* RR-325 A: the public-lite header — no Pricing, no Download, no Buy (they are not served) */
const LITE_NAV = [["/", "Home"], ["/#score", "Free score"], ["/privacy", "Privacy"], ["/terms", "Terms"]];
/* RR-338 · THE SALES SITE (public-lite + selling): the lite pages plus Pricing and Download; every link opens on this site */
const SALES_NAV = [["/", "Home"], ["/#score", "Free score"], ["/pricing", "Pricing"], ["/download", "Download"], ["/privacy", "Privacy"], ["/terms", "Terms"]];
/* RR-338 · the owner's marketing lines (28 Oct 2026): bold, never "guaranteed", no invented number */
export const MARKETING = Object.freeze({
  headline: "Rank higher on Google — and get recommended by ChatGPT",
  tools: "Stop paying $500 a month for 5 SEO tools. One app. $30.",
  data: "Real Google data. No risky backlinks.",
});
const TAX_LINE = "Prices exclude VAT and sales tax; where it applies, the tax is added at checkout. Have a promotion code? Enter it at checkout.";
/* RR-325 A: every footer links AlmiVisibility's own Privacy Policy and Terms of Service */
const footerCols = () => footerColumns().map((c) => (c.title === "Legal & Contact" ? { ...c, links: [...c.links, { label: "AlmiVisibility Privacy Policy", href: "/privacy" }, { label: "AlmiVisibility Terms of Service", href: "/terms" }] } : c));
export function frame({ path, title, description, body, noindex = false, lite = false }) {
  const strip = familyStrip(), NAVS = lite === "sales" ? SALES_NAV : lite ? LITE_NAV : NAV, cta = lite ? ["/#score", "Get my score"] : ["/#test", "Test my site"];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${ORIGIN}${path === "/" ? "/" : path}">`}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><link rel="icon" href="/favicon.ico">
<style>${CSS}</style></head><body><a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-testid="global-header"><div class="wrap bar">
<a class="brand" href="/" aria-label="AlmiVisibility home"><img src="/brand/almiworld-logo.png" alt="AlmiWorld — live beautifully" width="96" height="40"><span class="name">AlmiVisibility</span></a>
<div class="rows"><nav class="family" aria-label="Family navigation">${strip.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</nav>
<nav class="product" aria-label="AlmiVisibility">${NAVS.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="pill" href="${cta[0]}">${cta[1]}</a></nav></div>
<details class="menu"><summary aria-label="Open menu">Menu</summary><div class="drawer"><p>AlmiVisibility</p>${NAVS.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<p>AlmiWorld</p>${strip.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</div></details>
</div></header>
<main id="main">${body}</main>
<footer class="site-footer"><div class="wrap"><div class="fcols">${footerCols().map((c) => `<div class="${c.title === "Products" ? "products" : ""}"><p>${esc(c.title)}</p><ul>${c.links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>
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
const priceCards = (sales = false) => `<ul class="cards">${PLANS.map((p) => `<li class="card center"><div class="price">$${p.price}<small> / month</small></div><p><b>${esc(p.products)}</b></p><form method="post" action="/api/billing/checkout"><input type="hidden" name="plan" value="${p.id}"><button class="pill" type="submit">Buy</button></form></li>`).join("")}</ul><p class="note center" style="margin-top:16px">${PRICES_SOURCE} Per month, in US dollars. Every plan has every feature — plans differ only in how many products you add. There is no free trial; the website test is free for everyone.${sales ? ` ${TAX_LINE}` : ""}</p>`;

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
${r.links ? `<h3>Links</h3><p>${r.links.judged} of ${r.links.of} internal link(s) checked${r.links.of > r.links.judged ? ` — the free score asks at most ${LIMITS.linkChecks} links besides the pages it reads; the rest are not judged` : ""}.</p>${r.brokenLinks.length ? `<ul>${r.brokenLinks.map((b) => `<li>${esc(b.to)} — ${b.status ? `answers ${b.status}` : "no answer"} <span class="note">(linked from ${esc(b.from)})</span></li>`).join("")}</ul>` : r.links.judged ? "<p>Every link checked opens.</p>" : ""}` : ""}
${r.securityHeaders ? `<h3>Security headers of the start page <span class="note">(shown here, not in the score)</span></h3><ul>${r.securityHeaders.rules.map((h) => `<li>${h.state === "PASS" ? "✓" : h.state === "FAIL" ? "✗" : "–"} ${esc(HEADER_WORDS[h.name] ?? h.name)}${h.state === "FAIL" && h.why ? ` <span class="note">(${esc(h.why)})</span>` : ""}</li>`).join("")}<li>${r.securityHeaders.csp.enforced ? "✓ A Content Security Policy is sent" : r.securityHeaders.csp.reportOnly ? "– A Content Security Policy is sent in report-only form" : "– No Content Security Policy is sent"} <span class="note">(reported, not judged)</span></li></ul>` : ""}
${r.skipped.length ? `<h3>Pages not read</h3><ul class="nmtext">${r.skipped.slice(0, 10).map((s) => `<li>${esc(s.url)} — ${esc(s.why)}</li>`).join("")}</ul>` : ""}
<p class="note">${esc(r.noPromise)}</p></div></section>`;
}

export const features = () => frame({ path: "/features", title: "Features — AlmiVisibility", description: "One page builder in your own design, daily articles, auto-refresh when a source changes, social posts, a monthly report, ten languages, YouTube, three ways to bring your search data, and a Windows app.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Features</p><h1>Everything your visibility needs, in one app</h1><p class="lead">${BUILT_ON} Every plan has every feature.</p></div></section>
${section("paper", `<h2>What it does for you</h2>${cardList(FEATURES)}`)}
${section("", `<h2>YouTube, too</h2><div class="card tick-card" style="max-width:820px;margin:32px auto 0"><span class="t" aria-hidden="true">✓</span><p style="margin:0">${esc(YOUTUBE)}</p></div>`)}
${section("peach", `<h2>Ten languages</h2><p class="sub">The same facts, numbers, sources and dates in every language — only the wording changes. Arabic and Urdu are written right to left.</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`)}
${section("", `<div class="final"><h2>Start with the free test</h2><p>See your score before you decide.</p><p><a class="pill big" href="/#test">Test my site</a></p></div>`)}` });

export const pricing = ({ sales = false } = {}) => frame({ path: "/pricing", lite: sales ? "sales" : false, title: "Pricing — AlmiVisibility", description: "AlmiVisibility plans: $30 a month for 1 product, $40 for up to 5, $60 for up to 10, $80 for unlimited products. No free trial.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Pricing</p><h1>${sales ? esc(MARKETING.tools) : "Simple plans"}</h1><p class="lead">${sales ? `${esc(MARKETING.data)} ` : ""}Pick the number of products. Every plan has every feature. There is no free trial.</p></div></section>
${section("paper", priceCards(sales))}
${section("", `<div class="final"><h2>Not sure yet?</h2><p>Run the free website test first.</p><p><a class="pill big" href="${sales ? "/#score" : "/#test"}">Test my site</a></p></div>`)}` });

export const download = ({ setupAvailable = false, sales = false } = {}) => frame({ path: "/download", lite: sales ? "sales" : false, title: "Download AlmiVisibility for Windows", description: "Download AlmiVisibility for Windows: install it like any program, add your product, and get sourced pages, articles and a monthly report.",
  body: `<section class="hero"><div class="wrap"><p class="eyebrow">Download</p><h1>AlmiVisibility for Windows</h1>
<p class="lead">Download the installer, click Next, Install and Finish, and open AlmiVisibility from your desktop.</p>
<div class="cta">${setupAvailable || !sales ? `<a class="pill big" href="/download/AlmiVisibility-Setup.exe"${setupAvailable ? "" : ' aria-disabled="true"'} download>Download here</a>` : '<span class="pill big" aria-disabled="true">The download opens soon</span>'}<a class="pill ghost" href="/pricing">See the plans</a></div>
<p class="small">Windows 10 or 11. Your data stays on your own computer. The installer is not yet code-signed, so Windows may show an “unknown publisher” warning when you open it — choose “More info”, then “Run anyway”.</p></div></section>
${section("paper", `<h2>After you install</h2>${cardList([
  ["Add your product", "Your company, your product and its website."],
  ["Choose your plan", "Pay monthly by card. Your plan sets how many products you can add."],
  ["Get results", "Pages, articles, refreshes, social posts and a monthly report — each checked before it goes out."],
], "steps")}`)}` });

/* ── RR-325 C · the OWNER'S Terms of Service and Privacy Policy — his words exactly (site/legal.generated.json from his Word file). A page
 * that still holds "[FILL" is not published (null here → the route answers "not found"); a local PREVIEW marks each [FILL] ── */
export const LEGAL = loadLegal();
const legalPage = (which, path, title, description, { preview = false, lite = false, legal = LEGAL } = {}) => {
  const page = legal[which], fills = fillsIn(page);
  if (!page || (fills.length && !preview)) return null;
  return frame({ path, title, description, lite, body: `<section class="page"><div class="wrap prose">${fills.length ? `<p class="draft">PREVIEW on this computer — NOT PUBLISHED: the owner fills ${esc(fills.join(", "))} first.</p>` : ""}${renderLegal(page, { preview })}</div></section>` });
};
export const privacy = (o = {}) => legalPage("privacy", "/privacy", "Privacy Policy — AlmiVisibility", "How AlmiVisibility, the desktop app and almivisibility.almiworld.com, handles data.", o);
export const terms = (o = {}) => legalPage("terms", "/terms", "Terms of Service — AlmiVisibility", "The terms of service of AlmiVisibility, made by AlmiWorld.", o);
export const notFound = (path, { lite = false } = {}) => frame({ path, lite, title: "Not found — AlmiVisibility", description: "This page does not exist.", noindex: true, body: `<section class="page"><div class="wrap"><h1>Page not found</h1><p><a class="pill" href="/">Home</a></p></div></section>` });

/* ── RR-325 A · THE PUBLIC-LITE HOME: the free score FIRST; the keyword finder and the app "coming soon"; no download, price or buy ── */
export const KEYWORD_FINDER_LINE = "It will find what people search for about your product, with search volumes from Google Keyword Planner data.";
export const APP_LINE = "AlmiVisibility is a Windows app that makes your website, products and YouTube channel easier to find on Google and in AI answers. It finds the questions your customers really ask, builds the pages that answer them in your own design — every fact with its source and the date it was checked — and keeps them up to date.";
/* RR-325 (owner, 25 Oct) · the security headers in plain words (their rules: config/security/live-header-baseline.mjs) */
const HEADER_WORDS = Object.freeze({ "strict-transport-security": "Browsers are told to use https only (Strict-Transport-Security, at least six months)", "x-content-type-options": "Files are not guessed as another type (X-Content-Type-Options: nosniff)", "clickjacking (an enforced CSP frame-ancestors, or X-Frame-Options DENY or SAMEORIGIN)": "Other sites cannot show this page inside theirs (frame-ancestors or X-Frame-Options)", "referrer-policy": "Other sites are not sent the full address the visitor came from (Referrer-Policy)" });
/* RR-325 (owner, 25 Oct) · while a score is being checked: a moving meter (the gauge sweeps, a bar runs, the seconds count); the button is
 * turned off so a second click cannot use a second score. The result then fills the gauge to the real score. Served as /score.js (the
 * page's Content-Security-Policy allows scripts from the site itself only); without it the form works as before. */
export const SCORE_JS = `(function () {
  /* RR-326: the keyword finder's button, once */
  var k = document.querySelector("form.kwform");
  if (k) k.addEventListener("submit", function () { var kb = k.querySelector('button[type="submit"]'); if (kb) { kb.disabled = true; kb.textContent = "Finding keywords…"; } });
  var f = document.querySelector('form.testform[action="/score"]'); if (!f) return;
  var card = document.getElementById("score"), meter = document.getElementById("meter"), b = f.querySelector('button[type="submit"]'), timer = null;
  var num = card && card.querySelector(".gauge .num"), was = num ? num.innerHTML : "", label = b ? b.textContent : "";
  var top = card && card.querySelector(".top"), wasTop = top ? top.innerHTML : "";
  f.addEventListener("submit", function () {
    if (b) { b.disabled = true; b.textContent = "Checking your site…"; }
    if (card) card.classList.add("busy");
    if (top) top.innerHTML = '<p class="label">Checking your site</p>';
    if (num) num.innerHTML = "<b>…</b><span>Checking</span>";
    if (meter) { meter.hidden = false; var t0 = Date.now(), s = meter.querySelector("[data-secs]"); timer = setInterval(function () { if (s) s.textContent = String(Math.round((Date.now() - t0) / 1000)); }, 1000); }
  });
  /* back to this page from the browser's memory: its one-use ticket may be spent, so the home page is read again (a GET); a result page
   * (POST /score, never re-sent) gets its form back as it was */
  window.addEventListener("pageshow", function (e) { if (!e.persisted) return; if (location.pathname === "/") { location.reload(); return; } if (timer) clearInterval(timer); if (b) { b.disabled = false; b.textContent = label; } if (card) card.classList.remove("busy"); if (num) num.innerHTML = was; if (top) top.innerHTML = wasTop; if (meter) meter.hidden = true; });
  var real = document.querySelector("#score.real .gauge .num b[data-score]");
  if (real && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var to = Number(real.getAttribute("data-score")), t1 = null;
    var step = function (t) { if (t1 === null) t1 = t; var k = Math.min(1, (t - t1) / 1200); real.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
})();
`;
export function liteScoreCard({ result = null, error = null, values = {}, scoreOn = false, ticket = null } = {}) {
  const real = Boolean(result), s = real ? result : SAMPLE;
  const meter = `<div id="meter" class="meter" role="status" aria-live="polite" hidden><div class="bar"><span></span></div><p class="fine">Checking your site — reading up to ${LIMITS.pagesPerTest} pages, following its robots.txt, then its links and https. This usually takes 10 to 30 seconds. <b data-secs>0</b> s</p></div>`;
  const form = `<form class="testform" method="post" action="/score"><input type="hidden" name="ticket" value="${esc(ticket)}">
<div class="hp" aria-hidden="true"><label>Leave this empty <input name="homepage" tabindex="-1" autocomplete="off"></label></div>
<div><label class="f" for="url">Your website address</label><input id="url" name="url" type="text" inputmode="url" autocomplete="url" placeholder="yourwebsite.com" required value="${esc(values.url ?? "")}"></div>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}
<button class="pill big" type="submit">Get my score</button>
${meter}
<p class="fine">Free: ${LITE.perVisitorPerDay} scores a day, up to ${LIMITS.pagesPerTest} pages each. No email needed — the result is shown here only. <a href="/privacy">Privacy</a></p></form>`;
  const off = `<div class="testform" data-score-off>${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}<p class="fine" role="status" style="font-size:14px;color:var(--ink)">The free score is being switched on. Please come back soon.</p></div>`;
  /* the real score's number carries data-score: /score.js counts it up while the gauge fills (CSS) */
  const g = real && Number.isFinite(s.score) ? gauge(s.score).replace(`<b>${Math.max(0, Math.min(100, s.score))}</b>`, `<b data-score="${Math.max(0, Math.min(100, s.score))}">${Math.max(0, Math.min(100, s.score))}</b>`) : gauge(s.score);
  return `<div class="scorecard live${real ? " real" : ""}" id="score"><div class="top"><p class="label">${real ? "Your website score" : "Sample estimate"}</p><span class="badge${real ? " real" : ""}">${real ? "Your result" : "Sample"}</span></div>
${real ? `<p class="fine" style="margin-top:6px">${esc(result.url)} · ${result.pagesRead} of up to ${result.pagesLimit} pages · ${esc(String(result.testedOn).slice(0, 10))}</p>` : ""}
<div class="gaugebox">${g}${areaList(s.byCategory)}</div>
${real ? "" : '<p class="fine" style="text-align:center;margin-top:8px">SAMPLE — an illustrative example, not a real score.</p>'}
${scoreOn && ticket ? form : off}</div>`;
}
export const liteHome = ({ result = null, error = null, values = {}, scoreOn = false, ticket = null, left = null, owner = false, finder = {}, sales = false } = {}) => frame({ path: "/", lite: sales ? "sales" : true,
  title: sales ? `AlmiVisibility — ${MARKETING.headline}` : "AlmiVisibility — get the score of your site",
  description: sales ? `${MARKETING.headline}. ${MARKETING.data} Get your website's visibility score free; plans from $30 a month.` : "Get your website's visibility score free: technical basics, content, accessibility, links and security. AlmiVisibility, made by AlmiWorld — the app is coming soon.",
  body: `<section class="hero"><div class="wrap grid2"><div>
<p class="eyebrow">AlmiVisibility · by AlmiWorld</p>
${sales ? `<h1>${esc(MARKETING.headline)}</h1>
<p class="lead">${esc(MARKETING.data)} Start with your free score: enter your website address — AlmiVisibility reads up to ${LIMITS.pagesPerTest} of its public pages, following its robots.txt, and shows your score and the main findings here, on screen.</p>
<div class="cta"><a class="pill big" href="#score">Get my free score</a><a class="pill ghost" href="/pricing">See the plans</a></div>` : `<h1>Get the score of your site</h1>
<p class="lead">Enter your website address. AlmiVisibility reads up to ${LIMITS.pagesPerTest} of its public pages — following its robots.txt — and shows your score and the main findings here, on screen.</p>`}
<p class="small">${esc(NO_PROMISE)}</p></div>
<div>${liteScoreCard({ result, error, values, scoreOn, ticket })}</div></div></section>
${result ? resultDetail(result, left) : ""}
${section("paper", finderSection(finder, owner))}
${sales ? section("", `<h2 id="app">The AlmiVisibility app</h2><p class="sub"><b>${esc(MARKETING.tools)}</b> ${esc(APP_LINE)}</p>${cardList(FEATURES)}`) + section("paper", `<h2 id="plans">Simple plans</h2>${priceCards(true)}<p class="center" style="margin-top:16px"><a class="pill ghost" href="/download">Download for Windows</a></p>`)
    : section("", `<h2 id="app">AlmiVisibility app<span class="soon">Coming soon</span></h2><p class="sub">${esc(APP_LINE)}</p>${cardList(FEATURES)}`)}
${section("peach", `<h2>Ten languages</h2><p class="sub">The same facts, numbers, sources and dates in every language — only the wording changes. Arabic and Urdu are written right to left.</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p class="made">Made by <a href="https://almiworld.com/">AlmiWorld</a> · live beautifully</p>`)}
<script src="/score.js" defer></script>` });

/* ── RR-326 C · THE FREE KEYWORD FINDER on the public-lite home: "coming soon" until Google, the store and the database are connected ── */
const n = (v) => (v === null || v === undefined ? '<span class="nmtext">no figure from Google</span>' : Number(v).toLocaleString("en-US"));
const locOptions = (sel) => LOCATIONS.map((l) => `<option value="${l.code}"${l.code === sel ? " selected" : ""}>${esc(l.name)}</option>`).join("");
export function finderSection(f = {}, owner = false) {
  if (!f.on && !f.result && !f.error) return `<h2 id="keywords">Free keyword finder<span class="soon">Coming soon</span></h2><p class="sub">${esc(KEYWORD_FINDER_LINE)}</p>`;
  const v = f.values ?? {}, r = f.result;
  const formHtml = f.on ? `<form class="testform kwform" method="post" action="/keywords#keywords"><input type="hidden" name="ticket" value="${esc(f.ticket)}">
<div class="hp" aria-hidden="true"><label>Leave this empty <input name="homepage" tabindex="-1" autocomplete="off"></label></div>
<div class="kwrow"><div><label class="f" for="kwq">A word or a topic</label><input id="kwq" name="q" type="text" maxlength="${FINDER.maxLength}" placeholder="e.g. oet, wedding photographer" required value="${esc(v.q ?? "")}"></div>
<div><label class="f" for="kwloc">Country</label><select id="kwloc" name="location">${locOptions(v.location ?? "ALL")}</select></div></div>
${f.error ? `<p class="err" role="alert">${esc(f.error)}</p>` : ""}
<button class="pill big" type="submit">Find keywords</button>
<p class="fine">${owner ? "<b>Owner: no daily limit on this browser.</b> " : `Free: ${FINDER.perVisitorPerDay} searches a day. `}${esc(SOURCE_LINE)}. The words you search are stored without personal data — <a href="/privacy">Privacy</a></p></form>`
    : `<div class="testform">${f.error ? `<p class="err" role="alert">${esc(f.error)}</p>` : ""}<p class="fine" role="status">The keyword finder is being switched on. Please come back soon.</p></div>`;
  return `<h2 id="keywords">Free keyword finder</h2><p class="sub">Type a word or a topic and choose a country: the keyword ideas people search for on Google, with Google's own average monthly searches.</p>
<div class="kwcard">${formHtml}</div>${r ? finderResult(r, f.left) : ""}`;
}
function finderResult(r, left) {
  const csv = `/keywords.csv?q=${encodeURIComponent(r.q)}&amp;location=${encodeURIComponent(r.location)}`, pw = periodWords(r.period);
  /* RR-326 I: from the owner's Keyword Planner export — Google's ranges, said so */
  const file = r.source === "file", vol = (v) => (file ? esc(rangeOf(v)?.label ?? "no figure") : n(v));
  return `<div class="kwresult" id="kwresult"><h3>Keyword ideas for “${esc(r.q)}” — ${esc(r.locationName)}</h3>
<p class="source"><b>${esc(SOURCE_LINE)}</b> · average monthly searches${pw ? `, ${esc(pw)}` : ""} · ${esc(r.language)} · ${file ? `Google's ranges, from a Keyword Planner export of ${esc(r.day)}` : `read from Google on ${esc(r.day)}`}</p>
<p>${r.rows.length.toLocaleString("en-US")} keyword idea${r.rows.length === 1 ? "" : "s"}${r.rows.length ? ` · <a href="${csv}">Download all as CSV</a>` : ""}${left !== null && left !== undefined ? ` · ${left} free search${left === 1 ? "" : "es"} left today` : ""}</p>
${r.rows.length ? r.groups.map((g) => `<h4>${esc(g.name)} <span class="note">(${g.rows.length.toLocaleString("en-US")})</span></h4><div class="tablewrap"><table class="t"><tr><th>Keyword</th><th>Monthly searches</th></tr>${g.rows.slice(0, FINDER.shownPerGroup).map((x) => `<tr><td>${esc(x.keyword)}</td><td>${vol(x.volume)}</td></tr>`).join("")}</table></div>${g.rows.length > FINDER.shownPerGroup ? `<p class="note">The first ${FINDER.shownPerGroup} are shown — all ${g.rows.length.toLocaleString("en-US")} are in the CSV.</p>` : ""}`).join("") : "<p>Google gave no keyword ideas for this search.</p>"}
<p class="kwnext"><a class="pill" href="/#score">Get the score of your site</a> <a class="pill ghost" href="#app">AlmiVisibility app: coming soon</a></p></div>`;
}

/* ── RR-326 B + D · THE OWNER'S PAGE (owner only; noindex) ── */
const ownerFrame = (title, inner) => frame({ path: "/owner", lite: true, noindex: true, title: `${title} — AlmiVisibility`, description: "Private.", body: `<section class="page"><div class="wrap prose owner">${inner}</div></section>` });
/* RR-326 fix: why the owner's page is off — names the setting, never a value */
const OWNER_OFF = Object.freeze({
  missing: "OWNER_ACCESS_KEY is not set for Production in Vercel (Settings → Environment Variables), or the site was not deployed again after it was added.",
  short: "OWNER_ACCESS_KEY in Vercel is shorter than 32 characters, so it is not accepted (a short key could be guessed). Make it at least 32 characters, then deploy again.",
  store: "The limit store (Upstash) is not connected, so the owner's page cannot count sign-in tries.",
});
export const ownerOff = (why) => ownerFrame("Owner", `<h1>The owner's page is off</h1><p>${esc(OWNER_OFF[why] ?? OWNER_OFF.missing)}</p><p class="fine">After you change a setting in Vercel, run <code>npx vercel@latest --prod</code> again — a setting reaches the site only with a new deployment.</p>`);
export const ownerSignIn = (why = null) => ownerFrame("Owner", `<h1>Owner</h1><form class="testform" method="post" action="/owner/sign-in" style="max-width:520px"><label class="f" for="key">Your owner key</label><input id="key" name="key" type="password" autocomplete="current-password" required>${why ? `<p class="err" role="alert">${esc(why)}</p>` : ""}<button class="pill" type="submit">Sign in</button><p class="fine">Once on this browser — it then stays signed in for 180 days.</p></form>`);
/** RR-327 · is the app's keyword service able to check licences? LICENCE_PUBLIC_KEY there or not — never its value */
const licenceLine = (k) => (k === null ? "" : k === "set" ? `<p>The app's keyword service: <b>LICENCE_PUBLIC_KEY is set</b> — the app can use it with your owner licence.</p>` : `<p class="err">The app's keyword service is OFF: LICENCE_PUBLIC_KEY is ${k === "missing" ? "missing" : "not a public key"} in Vercel (Production). Add the whole text of licence-public.pem (it starts with BEGIN PUBLIC KEY — never a private key), then deploy again.</p>`);
/** RR-326 I · the owner's Keyword Planner files: the upload (one row per file, a country and a date of its own) and what the last upload did */
const IMPORT_ROWS = 6;
const importBox = (r) => {
  const opts = LOCATIONS.map((l) => `<option value="${esc(l.code)}">${esc(l.name)}</option>`).join("");
  const res = r ? `<div class="card" role="status"><p><b>Upload: ${r.read.toLocaleString("en-US")} keywords read · ${r.new.toLocaleString("en-US")} new · ${r.merged.toLocaleString("en-US")} merged${r.duplicates ? ` · ${r.duplicates} file${r.duplicates === 1 ? "" : "s"} already uploaded (nothing added)` : ""}</b></p><div class="tablewrap"><table class="t"><tr><th>File</th><th>Result</th></tr>${r.files.map((f) => `<tr><td>${esc(f.name)}</td><td>${!f.ok ? `Not read — ${esc(f.why)}` : f.duplicate ? "Already uploaded — nothing added" : `${f.read.toLocaleString("en-US")} read · ${f.new.toLocaleString("en-US")} new · ${f.merged.toLocaleString("en-US")} merged · ${esc(f.location)} · ${esc(f.day)}${Object.keys(f.products).length ? ` · ${Object.entries(f.products).map(([p, k]) => `${esc(p)} ${k.toLocaleString("en-US")}`).join(", ")}` : ""}`}</td></tr>`).join("")}</table></div></div>` : "";
  return `<h2>Keyword Planner files</h2>${res}<p class="fine">Your own exports from Google Keyword Planner (the file Google gives: UTF-16 or UTF-8, tab or comma). Merged into the same database the collector and the finder use, marked "Keyword Planner file"; a file uploaded again adds nothing. Country: Google's export does not say — choose it if the file was made for one country. Date: empty = the export day written inside the file.</p>
<form method="post" action="/owner/import" enctype="multipart/form-data"><div class="tablewrap"><table class="t"><tr><th>File</th><th>Country</th><th>Date (optional)</th></tr>${Array.from({ length: IMPORT_ROWS }, (_, i) => `<tr><td><input type="file" name="file${i + 1}" accept=".csv,text/csv,text/plain"></td><td><select name="country${i + 1}">${opts}</select></td><td><input type="date" name="date${i + 1}"></td></tr>`).join("")}</table></div><p><button class="pill" type="submit">Upload and merge</button></p></form>`;
};
/** RR-326 H · the owner's access check, in plain lines (ids and Google's names only) */
const checkBox = (c) => {
  if (!c) return "";
  const s = c.steps ?? {}, row = (a) => `${esc(a.id)} — ${a.ok === false ? esc(reasonLine(a.f)) : `${a.manager ? "manager account" : "normal account"}${a.test ? ", TEST" : ""}, ${esc(a.status)}`}`;
  const facts = [];
  if (s.accessible?.ok) facts.push(`Accounts this sign-in reaches: ${s.accessible.ids.length ? [...(s.direct ?? []).map(row), ...s.accessible.ids.slice((s.direct ?? []).length).map(esc)].join("; ") : "none"}`);
  for (const m of s.managers ?? []) facts.push(`Under manager ${esc(m.id)}: ${m.ok ? m.clients.map(row).join("; ") || "no accounts" : esc(reasonLine(m.f))}`);
  if (s.configured) facts.push(`GOOGLE_ADS_CUSTOMER_ID ${esc(c.want)}: reached ${esc(s.configured.reachable)}${c.login ? ` (login customer id ${esc(c.login)})` : ""}`);
  return `<div class="card" role="status"><p><b>Google access check</b></p><ul>${c.verdict.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>${facts.length ? `<p class="fine">${facts.join("<br>")}</p>` : ""}</div>`;
};
/* ── RR-329 E · THE OWNER'S PHONE: light, the most important numbers first, every heavy table closed until he taps it ── */
const PHONE_CSS = `<style>.owner details{border-top:1px solid #ddd;padding:6px 0}.owner summary{cursor:pointer;font-weight:600;padding:10px 0;font-size:1.05em}.owner .red{background:#fde8e8;border-left:5px solid #c62828;padding:10px 12px;margin:10px 0}.owner .big{font-size:1.25em;font-weight:700}.owner ul.plain{padding-left:18px}.owner ul.plain li{margin:4px 0}.owner button{min-height:40px}.owner .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.owner .chip{display:inline-block;padding:2px 8px;border-radius:12px;background:#eef;font-size:.9em}.owner .fact{border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0}.owner label.f{display:block;margin:10px 0 4px}@media (max-width:480px){.owner .tablewrap{font-size:13px}}</style>`;
const usd = (v) => `$${Number(v ?? 0).toFixed(2)}`;
/** the top of /owner: red lines, this week, progress and ETA, spend, the database */
function statusHtml(s) {
  if (!s) return "";
  const red = s.red.map((r) => `<div class="red" role="alert"><b>${esc(r.line)}</b><br>Fix: ${esc(r.fix)}</div>`).join("");
  const w = s.week, wk = w ? `<h2>This week</h2><ul class="plain"><li><b>${w.keywords.toLocaleString("en-US")}</b> keywords added (${w.requests.toLocaleString("en-US")} Google requests, on ${w.kwDays} of 7 days)</li><li><b>${w.finished.length}</b> product countries finished · ${w.facts.toLocaleString("en-US")} facts saved (on ${w.cfDays} of 7 days)</li><li><b>${w.waiting.toLocaleString("en-US")}</b> facts in your review queue${s.review ? ` (Pakistan and India: ${s.review.local.toLocaleString("en-US")} · not verified on an official page: ${s.review.unverified.toLocaleString("en-US")}, never shown)` : ""} — everything else whose quote and every number stand on its official page is approved by itself</li><li>AI spend: <b>${usd(w.aiUsd)}</b></li><li>Problems: ${w.problems.length ? `<b>${w.problems.length}</b> — see the red line above` : "none"}</li></ul>` : "";
  const f = s.facts?.[0], next = (s.facts ?? []).slice(1, 6);
  /* RR-332: "done" = all five parts filled (the same meaning everywhere); the ETA counts the countries not yet done */
  const facts = s.facts ? `<h2>Country facts — the queue</h2><p class="big">${esc(f.name)}: ${f.firstDone} of ${f.first} first countries done (all five parts)${f.left ? ` · about ${f.days} days (by ${esc(f.date)})` : ""}</p>${s.advice ? `<p class="red"><b>${esc(s.advice)}</b></p>` : ""}<ul class="plain">${next.map((x) => `<li>${esc(x.name)}: ${x.firstDone}/${x.first} done${x.left ? ` — first 30 by ${esc(x.date)}` : ""}</li>`).join("")}</ul><p class="fine">ETA at ${usd(s.spend?.cap)} a day and the measured cost of a country — a country whose council or rule no official page shows yet stays "not done" and is searched again every day; the rest of each product's countries go on in the background.</p>` : "";
  /* RR-332 · the page counter, from collected data only (never an estimate) */
  const why = (o) => Object.entries(o ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${esc(k)} ${n}`).join(", ");
  const pages = s.pages ? `<h2>Pages — ready by the rules</h2><details><summary>${s.pages.filter((p) => p.country.ready || p.questions.ready || p.countryProfession?.ready).map((p) => `${esc(p.name)} ${p.country.ready + p.questions.ready + (p.countryProfession?.ready ?? 0)}`).join(" · ") || "none ready yet"}</summary><div class="tablewrap"><table class="t"><tr><th>Product</th><th>Country pages</th><th>Country × profession</th><th>Question pages</th><th>City</th></tr>${s.pages.map((p) => `<tr><td>${esc(p.name)}</td><td><b>${p.country.ready}</b> ready · ${p.country.waiting} waiting${p.country.waiting ? ` <span class="fine">(${why(p.country.why)})</span>` : ""}</td><td>${p.countryProfession ? `<b>${p.countryProfession.ready}</b> ready (council found)` : "—"}</td><td><b>${p.questions.ready}</b> ready · ${p.questions.waiting} waiting${p.questions.waiting ? ` <span class="fine">(${why(p.questions.why)})</span>` : ""}</td><td>0</td></tr>`).join("")}</table></div><p class="fine">Test dates are part of the country page. City pages: none (the rule).</p></details>` : "";
  /* RR-333 D · AlmiVisibility's own pages: features, use-cases, how-to, free tools, comparisons — ready / waiting / why */
  const v = s.visibility, fam = (n, x) => `<tr><td>${n}</td><td><b>${x.ready}</b></td><td>${x.waiting}</td><td class="fine">${esc(x.why ?? "—")}</td></tr>`;
  const vis = v ? `<h2>AlmiVisibility — its own pages</h2><div class="tablewrap"><table class="t"><tr><th>Family</th><th>Ready</th><th>Waiting</th><th>Why</th></tr>${fam("Features", v.features)}${fam("Use-cases by business", v.useCases)}${fam("How-to guides", v.howTo)}${fam("Free tools", v.freeTools)}${fam("Comparisons", v.comparisons)}</table></div><p class="fine">Locations with demand: ${v.locations.length ? esc(v.locations.slice(0, 8).map((l) => `${l.location} ${l.volume.toLocaleString("en-US")}`).join(" · ")) : "none recorded yet"} — never all 197 by default. No country five-part rule (software).</p><form method="post" action="/owner/visibility/questions"><label class="f">Questions people ask you about AlmiVisibility (one a line) <textarea name="text" rows="3" style="width:100%"></textarea></label><p><button class="pill ghost" type="submit">Save these questions</button></p></form>` : "";
  const gsc = `<form method="post" action="/owner/search-console" class="row"><button class="pill ghost" type="submit">Read Search Console now</button></form>`;
  const sp = s.spend ? `<p>AI spend: today <b>${usd(s.spend.today)}</b> of ${usd(s.spend.cap)} · this month <b>${usd(s.spend.month)}</b></p>` : "";
  const k = s.keywords, kw = k ? `<h2>Keywords — the queue</h2><p>${k.products.slice(0, 3).map((x) => `${esc(x.name)}: <b>${x.firstDone}/${x.first}</b>`).join(" · ")} (first 30 countries and all locations)</p><p>${k.due.toLocaleString("en-US")} of ${k.total.toLocaleString("en-US")} requests still to do · about ${k.days} days at ${k.perDay.toLocaleString("en-US")} a day${k.measured ? "" : " (an estimate until 2 days are measured)"}</p>` : "";
  const st = s.storage, db = st && st.mb !== null ? `<p>Database: <b>${Math.round(st.mb)} MB</b> of ${st.limit.toLocaleString("en-US")} MB${st.growth !== null ? ` · growing about ${st.growth} MB a day${st.fullOn ? ` → full about <b>${esc(st.fullOn)}</b>${st.fullIn <= 30 ? " — upgrade the Neon project to the Launch plan before then" : ""}` : ""}` : " · its growth is measured from the next runs"}${st.tables?.length ? `<br><span class="fine">Biggest: ${st.tables.slice(0, 5).map((t) => `${esc(t.name)} ${t.mb} MB (${Number(t.rows).toLocaleString("en-US")} rows)`).join(" · ")}</span>` : ""}</p>` : "";
  return `${red}${wk}${facts}${pages}${vis}${sp}${kw}${db}${gsc}`;
}
/** the queue on /owner: one tap moves a product or a country one place up */
function queueHtml(q, names, moved) {
  if (!q) return "";
  const up = (kind, item, label) => `<form method="post" action="/owner/queue" class="row" style="margin:2px 0"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="item" value="${esc(item)}"><button class="ghost" type="submit" aria-label="Move ${esc(label)} up">↑</button> <span${item === moved ? ' class="chip"' : ""}>${esc(label)}</span></form>`;
  return `<p class="fine">Both collectors follow this order from their next run: a product's first 30 countries are finished before the next product starts; its other countries continue in the background.</p><h3>Products</h3>${q.products.map((p, i) => up("product", p, `${i + 1}. ${names[p] ?? p}`)).join("")}
<h3>Countries (the first 40)</h3>${q.countries.slice(0, 40).map((c, i) => up("country", c, `${i + 1}. ${c}${i === 29 ? " — the first 30 end here" : ""}`)).join("")}<p class="fine">Then the other ${q.countries.length - 40} countries, A–Z.</p>`;
}
/* RR-331 · the owner's two pages, one menu; each shows the other collectors in one line */
export function ownerMenu(here, s = null) {
  const item = (k, href, name) => (k === here ? `<b>${name}</b>` : `<a href="${href}">${name}</a>`);
  const line = s ? `<p class="fine">Keywords today ${Number(s.keywordsToday ?? 0).toLocaleString("en-US")} · first 15 countries ${s.first15 ?? "—"}% done · question groups ${s.questionGroups ?? 0} · test dates found for ${s.datesFound ?? 0} test × country${s.gsc ? ` · Search Console: ${esc(s.gsc)}` : ""}</p>` : "";
  return `<nav class="row" aria-label="Owner pages">${item("keywords", "/owner", "Keywords")} · ${item("countries", "/owner/countries", "Countries")} · ${item("articles", "/owner/articles", "Articles")}</nav>${line}`;
}
/* RR-334 · the article drafts for every AlmiWorld product — nothing is published from here; the owner's word is kept */
export function ownerArticles({ articles = [], html = (d) => "", message = null } = {}) {
  const word = { draft: "waits for you", approved: "approved by you", rejected: "rejected by you" };
  /* RR-335: F40's state of each draft — the page-law checks, then the AI judge's two verdicts (with their cost); a draft not judged waits */
  const qWord = { PASS: "quality PASS", FAIL: "quality FAIL", WAITING: "waiting for the AI judge" };
  const qLine = (q) => `<p class="fine">Quality (F40): <b>${esc(qWord[q.state])}</b>${q.why ? ` — ${esc(q.why)}` : ""}${q.judgements ? ` · ${q.judgements.map((j) => `${esc(j.name)} ${esc(j.verdict)}: ${esc(j.observation)}`).join(" · ")} · cost $${Number(q.usd ?? 0).toFixed(4)}` : ""}</p>`;
  const one = (a) => { const d = a.body, q = articleQuality(d, d.judged), srcs = [...new Map((d.blocks ?? []).filter((b) => b.source?.url).map((b) => [b.source.url, b.source])).values()];
    return `<details class="fact"><summary><b>${esc(a.title)}</b> · ${esc(a.product)} · ${a.kind === "intro" ? "introduction, pros and cons" : "a question answered"} · <span class="chip">${esc(word[a.status] ?? a.status)}</span> · <span class="chip">${esc(qWord[q.state])}</span></summary>${qLine(q)}
<p class="fine">Outline: ${(d.outline ?? []).map(esc).join(" → ")}</p><p class="fine">Sources (${srcs.length}): ${srcs.map((s) => `<a href="${esc(s.url)}" rel="nofollow">${esc(s.title || s.url)}</a> (read ${esc(s.on ?? "")})`).join("; ") || "—"}</p>
${d.dropped?.length ? `<p class="fine">Left out (not found on an official page): ${d.dropped.map((x) => `${esc(x.heading)} — ${esc(x.why)}`).join("; ")}</p>` : ""}${html(d)}
<form method="post" action="/owner/articles/decide" class="row"><input type="hidden" name="id" value="${esc(a.id)}">${a.status !== "approved" ? '<button class="pill" name="action" value="approve">Approve</button>' : ""} ${a.status !== "rejected" ? '<button class="pill ghost" name="action" value="reject">Reject</button>' : ""} ${a.status !== "draft" ? '<button class="pill ghost" name="action" value="reopen">Back to draft</button>' : ""}</form></details>`; };
  const waiting = articles.filter((a) => a.status === "draft").length;
  const qs = articles.map((a) => articleQuality(a.body, a.body?.judged)), judgedQ = qs.filter((q) => q.judgements), spent = judgedQ.reduce((s, q) => s + Number(q.usd ?? 0), 0);
  const quality = `<p>Quality (F40): ${qs.filter((q) => q.state === "PASS").length} pass · <b>${qs.filter((q) => q.state === "WAITING").length} waiting for the AI judge</b> · ${qs.filter((q) => q.state === "FAIL").length} fail · AI judge cost ${judgedQ.length ? `$${(spent / judgedQ.length).toFixed(4)} a page ($${spent.toFixed(4)} for ${judgedQ.length})` : "none yet"} — judged inside the daily AI cap, at most ${ARTICLES_JUDGED_PER_DAY} a day.</p>`;
  return ownerFrame("Articles", `${PHONE_CSS}${ownerMenu("articles")}<h1>Articles — drafts</h1>${message ? `<p class="card" role="status">${esc(message)}</p>` : ""}${quality}
<p>${articles.length} drafts for AlmiWorld's products · ${waiting} wait for you. Each hard fact was read on its official page (its words and every number there); general guidance is labelled and states no number. <b>Nothing is published from here</b> — publishing comes with almiworld.com's blog and AlmiVisibility's own site.</p>${articles.map(one).join("") || "<p>No draft yet — the collector writes them in its daily step, once a day (by the day's last run at the latest).</p>"}`);
}
/* RR-331 · ONE table of every country (the queue's order), open: each cell its value or count and the day it was found or checked */
const shortDay = (d) => (d ? String(d).slice(0, 10) : "");
const cellOf = (v, day, searching = false) => (v === null || v === undefined ? (searching ? "searching" : "—") : `${v}${day ? ` <span class="fine">${esc(shortDay(day))}</span>` : ""}${searching ? " · searching" : ""}`);
export function countriesTable({ order, byC, facts, tasks = {}, product = "oet", parts = [], names = {}, today, dated = false }) {
  const oet = product === "oet", link = (n) => `<a href="/owner/countries?c=${encodeURIComponent(n)}${oet ? "" : `&amp;p=${encodeURIComponent(product)}`}">${esc(n)}</a>`;
  const mine = new Map(); for (const f of facts) if ((f.product ?? "oet") === product) (mine.get(f.country) ?? mine.set(f.country, []).get(f.country)).push(f);
  const last = (fs) => fs.map((f) => f.readOn ?? f.at).filter(Boolean).sort().at(-1) ?? null;
  const state = (c, t) => tasks[`${c}|${t}`]?.state ?? null;
  const datesCell = (c, fs) => { const d = fs.find((f) => f.part === "dates"), t = tasks[`${c}|${product}:dates`];
    if (d) { const n = upcomingIn(d.value?.dates, today).length; return cellOf(n ? `${n} date${n === 1 ? "" : "s"}` : d.value?.none ? "no public dates" : "0", d.readOn); }
    return t ? cellOf("none found", t.day) : "—"; };
  const head = oet ? ["Fee", "Questions (groups / answered)", "Centres", "Councils (of 12)", "Rules"] : parts.map((p) => p.name);
  const rows = order.map((c) => { const r = byC[c]; if (!r) return ""; const fs = mine.get(c) ?? [], of = (p) => fs.filter((f) => f.part === p);
    const cells = oet ? [
      /* RR-332: the fee itself — the official fee and "about" the local amount (value.local is only a yes/no that it exists) */
      cellOf(r.parts.fee.filled ? feeShort(r.parts.fee.facts[0].value) : null, last(of("fee"))),
      cellOf(of("questions").length ? `${of("questions").length} / ${r.parts.questions.facts.length}` : null, last(of("questions")), state(c, "questions") === "searching"),
      cellOf(r.parts.centres.filled ? (r.parts.centres.facts[0].value?.venue ? "a venue" : "at home") : null, last(of("centres"))),
      cellOf(of("councils").length || state(c, "councils") ? `${Object.values(r.councils).filter(Boolean).length}/12` : null, last(of("councils")), state(c, "councils") === "searching"),
      cellOf(r.parts.rules.facts.length ? String(r.parts.rules.facts.length) : null, last(of("rules"))),
    ] : parts.map((p) => cellOf(r.parts[p.key]?.filled ? String(r.parts[p.key].facts.length) : null, last(of(p.key)), state(c, `${product}:facts`) === "searching" && !r.parts[p.key]?.filled));
    return `<tr><td>${link(c)}</td>${cells.map((x) => `<td>${x}</td>`).join("")}${dated ? `<td>${datesCell(c, fs)}</td>` : ""}<td>${esc(shortDay(last(fs))) || "—"}</td></tr>`; }).join("");
  return `<div class="tablewrap"><table class="t"><tr><th>Country</th>${head.map((h) => `<th>${esc(h)}</th>`).join("")}${dated ? "<th>Test dates</th>" : ""}<th>Last updated</th></tr>${rows}</table></div>`;
}
/* "AUD 587 — about 114,260 PKR" from the fee line (its source and rate stay in the country's detail) */
const feeShort = (v) => feeShown(v) ?? "✓";
const upcomingIn = (dates = [], today) => (dates ?? []).filter((d) => !today || d.date >= today);
/* RR-337 · the launch settings: each variable's NAME, what it is for, set or missing — never a value; open while a needed one is missing */
function launchBox(rows = []) {
  if (!rows.length) return "";
  const gaps = rows.filter((r) => r.needed && !r.set).length;
  const state = (r) => (r.set ? "<b>set</b>" : r.needed ? '<span class="err">missing</span>' : "missing (correct for now)");
  return `<details${gaps ? " open" : ""} data-launch><summary>Launch settings in Vercel — ${gaps ? `${gaps} needed missing` : "all needed are set"}</summary><p class="fine">Names only; this page never shows a value. After you change one, deploy again.</p>
<div class="tablewrap"><table class="t"><tr><th>Variable</th><th>For</th><th>State</th></tr>${rows.map((r) => `<tr><td><code>${esc(r.name)}</code></td><td>${esc(r.use)}</td><td>${state(r)}</td></tr>`).join("")}</table></div></details>`;
}
export function ownerPage({ launch = [], connected = false, missing = [], dbOn = false, dbError = null, counts = null, usage = null, last = null, groups = [], seedText = "", seedDraft = null, seedAt = null, message = null, check = null, imported = null, licenceKey = null, status = null, names = {}, moved = null } = {}) {
  const gname = Object.fromEntries(groups.map((g) => [g.id, g])), lname = Object.fromEntries(LOCATIONS.map((l) => [l.code, l.name]));
  const kindWord = (id) => { const k = id.split(":")[0]; return k === "product" ? "AlmiWorld product · every 30 days" : k === "youtube" ? "YouTube niche · every 60 days · Google Search volumes, not YouTube's numbers" : "category · every 60 days"; };
  /* RR-326 H: Google's own reason and message for the last refusal */
  const why = (l) => (l.reason ? ` Google's reason: <b>${esc(l.reason)}</b>${l.message ? ` — “${esc(l.message)}”` : ""}` : "");
  const google = connected ? (usage?.last && usage.last.at?.slice(0, 10) === usage.day ? `<p class="err">${esc(ACCESS_LINE)} — but Google's last answer today (${esc(usage.last.at.slice(11, 16))} UTC): ${esc(ownerRefusal(usage.last))}${why(usage.last)}</p>` : `<p><b>${esc(ACCESS_LINE)}</b></p>`) : `<p class="err">Google is not connected — missing in Vercel: ${esc(missing.join(", "))}.</p>`;
  const ops = usage ? `<div class="tablewrap"><table class="t"><tr><th>Google operations today (${esc(usage.day)}, counted by this site before sending)</th><th>Used</th><th>Our cap</th></tr>
<tr><td>All together</td><td>${usage.all.toLocaleString("en-US")}</td><td>${usage.caps.ceiling.toLocaleString("en-US")} (Google's Basic limit: ${usage.caps.googleDaily.toLocaleString("en-US")} a day)</td></tr>
<tr><td>Daily collector</td><td>${usage.collector.toLocaleString("en-US")}</td><td>${usage.caps.collector.toLocaleString("en-US")} (one third of Google's)</td></tr>
<tr><td>Public keyword finder</td><td>${usage.finder.toLocaleString("en-US")}</td><td>${usage.caps.finder.toLocaleString("en-US")}</td></tr>
<tr><td>The app's keyword service (clients)</td><td>${(usage.app ?? 0).toLocaleString("en-US")}</td><td>${(usage.caps.app ?? 0).toLocaleString("en-US")}</td></tr>
<tr><td>You (no limit — inside the total)</td><td>${usage.owner.toLocaleString("en-US")}</td><td>—</td></tr></table></div>` : "";
  const run = last ? `<p>Last collector run: ${esc(String(last.at).slice(0, 16).replace("T", " "))} UTC — ${last.ok ? `${last.saved} requests saved (${(last.keywords ?? 0).toLocaleString("en-US")} keywords), ${last.duplicates ?? 0} already collected today, ${last.skipped ?? 0} to ask again${last.left ? `; still to do today: ${last.left.daily} product requests, ${last.left.weekly} weekly requests` : ""}${last.stoppedBy ? ` · stopped: ${esc(String(last.why).replace(/\.$/, ""))}` : ""}` : esc(String(last.why).replace(/\.$/, ""))}.</p>` : "<p>The collector has not run yet.</p>";
  const db = !dbOn ? `<p class="err">The keyword database is not connected (DATABASE_URL in Vercel — the Neon database).</p>` : dbError ? `<p class="err">${esc(dbError)}</p>` : counts ? `<p><b>${counts.keywords.toLocaleString("en-US")}</b> keywords in all · ${counts.observations.toLocaleString("en-US")} figures kept (with history) · <b>${counts.today.toLocaleString("en-US")}</b> collected today</p>
<h2>By product, category and YouTube niche</h2><div class="tablewrap"><table class="t"><tr><th>Group</th><th>What</th><th>Keywords</th><th>Today</th><th>Countries</th><th>Last refresh</th></tr>${counts.groups.map((g) => `<tr><td>${esc(gname[g.grp]?.name ?? g.grp)}</td><td>${esc(kindWord(g.grp))}</td><td>${g.keywords.toLocaleString("en-US")}</td><td>${g.today.toLocaleString("en-US")}</td><td>${g.locations}</td><td>${esc(g.last ?? "")}</td></tr>`).join("") || '<tr><td colspan="6">Nothing collected yet.</td></tr>'}</table></div>
<h2>By country</h2><div class="tablewrap"><table class="t"><tr><th>Country</th><th>Keywords</th><th>Today</th></tr>${[...counts.locations].sort((x, y) => (x.location === "ALL" ? -1 : y.location === "ALL" ? 1 : String(lname[x.location] ?? x.location).localeCompare(String(lname[y.location] ?? y.location)))).map((l) => `<tr><td>${esc(lname[l.location] ?? l.location)}</td><td>${l.keywords.toLocaleString("en-US")}</td><td>${l.today.toLocaleString("en-US")}</td></tr>`).join("") || '<tr><td colspan="3">Nothing collected yet.</td></tr>'}</table></div>` : "";
  /* RR-329 E: the numbers first; every heavy table is closed until tapped (a phone on weak internet) */
  return ownerFrame("Owner", `${PHONE_CSS}${ownerMenu("keywords", arguments[0]?.summary ?? null)}<h1>Owner</h1>${message ? `<p class="card" role="status">${esc(message)}</p>` : ""}
${statusHtml(status)}
${launchBox(launch)}
<p class="row"><a class="pill" href="/owner/countries">Country facts</a> <a class="pill ghost" href="#queue">The queue</a></p>
<details${check ? " open" : ""}><summary>Google and the keyword collector</summary>
<p class="fine"><b>No daily limit on this browser</b> for the free score and the keyword finder.</p>
<h2>Google</h2>${google}${licenceLine(licenceKey)}${checkBox(check)}${connected ? `<form method="post" action="/owner/check-google"><button class="pill ghost" type="submit">Check Google access (about 10 operations)</button></form>` : ""}${ops}
<h2>The keyword collector</h2>${run}${db}
<form method="post" action="/owner/collect"><button class="pill ghost" type="submit">Collect now (one short run)</button></form></details>
${dbOn ? `<details${imported ? " open" : ""}><summary>Keyword Planner files</summary>${importBox(imported)}</details>` : ""}
<details${seedDraft !== null ? " open" : ""}><summary>The seed list</summary><p class="fine">One group per line: <code>product:key | Name | seed, seed</code> (every 30 days, one request per country with all its seeds), <code>category:key | Name | seed, …</code> or <code>youtube:key | Name | seed, …</code> (each seed, every 60 days). A line starting with # is a note.${seedAt ? ` Saved ${esc(seedAt.slice(0, 16).replace("T", " "))} UTC.` : " This is the first list — not yet saved by you."}</p>
<form method="post" action="/owner/seeds"><textarea name="seeds" rows="24" style="width:100%;font-family:Consolas,monospace;font-size:13px">${esc(seedDraft ?? seedText)}</textarea><p><button class="pill" type="submit">Save the list</button></p></form></details>
<details id="queue"${moved ? " open" : ""}><summary>The queue — move a product or a country up</summary>${queueHtml(status?.queue, names, moved)}</details>
<form method="post" action="/owner/sign-out"><button class="pill ghost" type="submit">Sign out</button></form>`);
}

/* ── RR-328 B · the owner's Country Facts: the coverage grid (five parts per country, a council per profession), each fact with its source,
 * and his word on it (approve, edit, reject — his edit wins). An unconfirmed fact is listed here for him, never shown on a page. ── */
const PART_SHORT = { fee: "Fee", questions: "Questions", centres: "Centres", councils: "Councils", rules: "Rule" };
const factLine = (f) => {
  const v = f.value ?? {};
  if (f.status === "owner") return `${v.text ?? ""}${v.link ? ` · ${v.link}` : ""}`; // RR-329: the owner's own words first, whatever part
  if (f.part === "fee") return `${feeShown(v) ?? v.line ?? ""}${v.rate?.source ? ` · rate: ${v.rate.source}` : ""}`;
  if (f.part === "centres") return v.venue ? "a venue named on OET's own pages" : `no venue — ${v.home ?? "at home not stated"}${v.nearest?.length ? `; nearest venues: ${v.nearest.join(", ")}` : "; no nearest venue"}`;
  if (f.part === "councils") return `${f.profession}: ${v.name ?? "?"}${v.nameType ? ` (${v.nameType})` : ""} · ${v.website ?? "no website"} · ${v.address ?? `address missing${v.addressWhy ? ` (${v.addressWhy})` : ""}`}`;
  if (f.part === "questions") return `“${v.question ?? ""}” (${Number(v.volume ?? 0).toLocaleString("en-US")} a month) → ${v.answer ?? "no answer yet"}`;
  if (f.part === "rules" && v.rule) return `${v.rule ?? ""}${v.quote ? ` — the page says: “${v.quote}”` : ""}`;
  /* RR-329: another product's fact (a body or a statement) */
  if (v.name) return `${v.name}${v.nameType ? ` (${v.nameType})` : ""} · ${v.website ?? "no website"}${v.text ? ` — ${v.text}` : ""}`;
  if (v.text) return `${v.text}${v.quote ? ` — the page says: “${v.quote}”` : ""}`;
  return JSON.stringify(v);
};
const editFields = (f) => {
  const v = f.value ?? {}, inp = (n, label, val) => `<label>${label} <input name="${n}" value="${esc(val ?? "")}" style="width:100%"></label>`;
  if ((f.product ?? "oet") !== "oet" && f.part !== "questions") return `${v.name !== undefined ? `${inp("name", "Name", v.name)}${inp("website", "Official website", v.website)}` : ""}<label>What it says <textarea name="text" rows="2" style="width:100%">${esc(v.text ?? "")}</textarea></label>`;
  if (f.part === "councils") return `${inp("name", "Name", v.name)}${inp("website", "Official website", v.website)}${inp("address", "Address", v.address)}`;
  if (f.part === "questions") return `${inp("question", "Question", v.question)}<label>Answer <textarea name="answer" rows="3" style="width:100%">${esc(v.answer ?? "")}</textarea></label>`;
  if (f.part === "rules") return `<label>Rule <textarea name="rule" rows="2" style="width:100%">${esc(v.rule ?? "")}</textarea></label>`;
  if (f.part === "fee") return inp("line", "The fee line", v.line);
  return inp("home", "At home / centres", v.home ?? "");
};
/* RR-330 · a country's questions: how many were asked (by source), the groups, which a page may carry; the owner's paste box */
function questionsPanel(country, { stats = null, facts = [], asked = [] } = {}) {
  const qs = facts.filter((f) => f.country === country && f.part === "questions" && (f.product ?? "oet") === "oet").sort((a, b) => (b.value?.volume ?? 0) + 10 * (b.value?.count ?? 0) - ((a.value?.volume ?? 0) + 10 * (a.value?.count ?? 0)));
  const s = stats ? `<p><b>${stats.asked}</b> questions asked (keywords ${stats.sources.keywords} · YouTube ${stats.sources.youtube} · yours ${stats.sources.owner}) · <b>${stats.groups}</b> groups · <b>${stats.pageable}</b> a page may carry</p><p class="fine">YouTube: ${esc(stats.youtube ?? "—")} · Reddit: off (its terms do not allow our commercial use without Reddit's approval)</p>` : `<p class="fine">Not collected yet for this country.</p>`;
  const row = (f) => `<li><b>${esc(f.value?.question ?? f.value?.group ?? "")}</b> — ${f.value?.count ?? 1} asked${f.value?.volume ? `, ${Number(f.value.volume).toLocaleString("en-US")} searches a month` : ""} · ${f.value?.answerKind === "official" ? "official answer" : f.value?.answerKind === "guidance" ? `general guidance${f.value?.guidanceSource ? ` (from ${esc(hostOf(f.value.guidanceSource.url) ?? "")}, ${esc(f.value.guidanceSource.on ?? "")})` : ""}` : "answer"}${f.status === "unconfirmed" ? " (unconfirmed — not shown)" : ""}${f.value?.pageable ? " · <b>a page may carry it</b>" : ""}</li>`;
  return `<details class="fact"${qs.length ? "" : " open"}><summary>Questions people ask (${qs.length} groups)</summary>${s}${qs.length ? `<ul>${qs.slice(0, 30).map(row).join("")}</ul>` : ""}
${asked.length ? `<details><summary>Asked on YouTube and by you (latest ${asked.length})</summary><ul>${asked.map((q) => `<li>${esc(q.text)} <span class="fine">(${q.source === "owner" ? "yours" : "a YouTube comment, kept 30 days"})</span></li>`).join("")}</ul></details>` : ""}
<form method="post" action="/owner/countries/questions"><input type="hidden" name="country" value="${esc(country)}"><label class="f">Add questions people asked you (one a line) <textarea name="text" rows="5" style="width:100%" placeholder="Can I give OET from Lahore?&#10;How do I get a good standing letter from PNMC?"></textarea></label><p><button class="pill" type="submit">Save these questions</button></p></form></details>`;
}
export function ownerCountries({ coverage, facts = [], country = null, history = {}, last = null, aiOn = false, caps = null, spend = null, message = null, order = [], search = {}, product = "oet", products = [], template = null, parts = [], professions = [], qstats = {}, asked = [], first15 = null, templates = null } = {}) {
  const c = coverage.counts, byC = Object.fromEntries(coverage.rows.map((r) => [r.country, r])), mark = (ok) => (ok ? "✓" : "—");
  /* RR-329 B: one product at a time — AlmiOET keeps its five-part grid; every other product its own template's parts */
  const oet = product === "oet", qp = oet ? "" : `&amp;p=${encodeURIComponent(product)}`, link = (name) => `<a href="/owner/countries?c=${encodeURIComponent(name)}${qp}">${esc(name)}</a>`;
  const NAMES = oet ? PART_SHORT : Object.fromEntries(parts.map((p) => [p.key, p.name])), bodies = oet ? ["councils"] : parts.filter((p) => ["offices", "employment", "universities", "tax", "recognition", "studentVisa"].includes(p.key)).map((p) => p.key);
  /* RR-328 addition (rule R1): a council (or another body) not found yet is "searching" (every day), never a stop at "missing" */
  const missingOf = (name, r) => r.missing.map((p) => (bodies.includes(p) && search[name]?.state === "searching" ? `${oet ? p : NAMES[p] ?? p} (searching)` : oet ? p : NAMES[p] ?? p)).join(", ");
  const searchList = (name) => { const s = search[name]; if (!s || s.state !== "searching") return ""; const rows = Object.entries(s.tried ?? {});
    return `<h3>${oet ? "Councils" : "Offices"} — searching every day</h3><p class="fine">${esc(s.note ?? "")} (last search ${esc(s.day)}). Shown on a page only after the collector reads its official page itself.</p><ul>${rows.map(([p, t]) => `<li>${esc(NAMES[p] && !oet ? NAMES[p] : p)}: searching since ${esc(t.since ?? s.day)} — ${t.names?.length ? `tried: ${esc(t.names.join("; "))}${t.types?.length ? ` (name types: ${esc(t.types.join(", "))})` : ""}` : "no name found yet"}${t.notFound ? ` — <b>not found</b>: ${esc(t.notFound)}` : ""}</li>`).join("")}</ul>`; };
  /* RR-329 D · "Add what I know" — the owner's own fact, a link, a photo (from his phone's camera) */
  const knowBox = (name) => `<details class="fact" open><summary>Add what I know</summary><form method="post" action="/owner/countries/know" enctype="multipart/form-data"><input type="hidden" name="country" value="${esc(name)}"><input type="hidden" name="product" value="${esc(product)}">
<label class="f">About <select name="part">${Object.entries(NAMES).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("")}<option value="other">something else</option></select></label>
${oet ? `<label class="f">For which profession (a council) <select name="profession"><option value="">—</option>${professions.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>` : ""}
<label class="f">What you know <textarea name="text" rows="4" style="width:100%" placeholder="For example: the test centre's address, the fee in rupees, the council's steps, a question nurses asked you"></textarea></label>
<label class="f">A link (optional) <input name="link" type="url" inputmode="url" style="width:100%" placeholder="https://"></label>
<label class="f">A photo (optional, JPEG/PNG/WebP, up to 1.5 MB) <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label>
<p><button class="pill" type="submit">Save what I know</button></p><p class="fine">Stored as your own information with today's date; shown on pages as AlmiWorld's own checked information, before anything the collector finds.</p></form></details>`;
  const card = (f) => `<div class="fact"><p><b>${esc(NAMES[f.part] ?? f.part)}</b>${f.profession ? ` · ${esc(f.profession)}` : ""} · ${f.status === "owner" ? `<span class="chip">yours, ${esc(f.value?.on ?? f.readOn ?? "")}</span>` : f.proposedBy === "owner-input" && f.status === "unconfirmed" ? '<span class="chip">yours, to verify</span>' : esc(f.status)}${f.status === "unconfirmed" ? '<br><span class="fine">never shown on a page</span>' : ""}</p>
<p>${esc(factLine(f))}${f.aiWritten ? ' <span class="fine">(AI-written)</span>' : ""}${f.why ? `<br><span class="fine">${esc(f.why)}</span>` : ""}${history[f.key]?.length > 1 ? `<br><span class="fine">${history[f.key].length} changes kept</span>` : ""}</p>
${f.value?.photo ? `<p><img src="/owner/countries/photo?id=${esc(f.value.photo)}" alt="Your photo" style="max-width:100%;height:auto" loading="lazy"></p>` : ""}
<p class="fine">${f.sourceUrl ? `<a href="${esc(f.sourceUrl)}" rel="nofollow noopener">${esc(f.sourceTitle || f.sourceUrl)}</a>` : "—"}${f.readOn ? ` · read ${esc(f.readOn)}` : ""}</p>
${f.status === "owner" ? "" : `<form method="post" action="/owner/countries/fact" class="row"><input type="hidden" name="key" value="${esc(f.key)}"><button class="pill" name="action" value="approve" type="submit">Approve</button> <button class="pill ghost" name="action" value="reject" type="submit">Reject</button></form>
<details><summary>Edit</summary><form method="post" action="/owner/countries/fact"><input type="hidden" name="key" value="${esc(f.key)}"><input type="hidden" name="action" value="edit">${editFields(f)}<button class="pill" type="submit">Save my version</button></form></details>`}</div>`;
  /* RR-335: per template, the searches it took and the results confirmed on an official page — today against yesterday (the owner tunes the templates) */
  const tplNames = templates ? [...new Set([...Object.keys(templates.today ?? {}), ...Object.keys(templates.yesterday ?? {})])].sort() : [];
  const tplCell = (x) => (x ? `${x.asks} asked · ${x.searches} searches → <b>${x.found}</b> confirmed${x.guidance ? ` · ${x.guidance} guidance` : ""}` : "—");
  const tplTable = templates === null ? "<p>Search templates: the counts could not be read.</p>" : !tplNames.length ? "<p>Search templates: no question asked yesterday or today yet.</p>"
    : `<table><caption>Search templates — searches → results confirmed on an official page</caption><thead><tr><th>Template</th><th>Today</th><th>Yesterday</th></tr></thead><tbody>${tplNames.map((n) => `<tr><td>${esc(n)}</td><td>${tplCell(templates.today?.[n])}</td><td>${tplCell(templates.yesterday?.[n])}</td></tr>`).join("")}</tbody></table>`;
  const runLine = last ? `<p>Last run: ${esc(String(last.at).slice(0, 16).replace("T", " "))} UTC — ${last.ok ? `${last.saved} facts saved (${last.unconfirmed} unconfirmed), ${last.kept} kept as you decided, ${last.reads} pages read, $${Number(last.aiUsd ?? 0).toFixed(2)} of AI${last.done?.length ? `; finished: ${esc(last.done.slice(0, 8).join(", "))}${last.done.length > 8 ? " …" : ""}` : ""}${last.stoppedBy ? ` · stopped: ${esc(String(last.why).replace(/\.$/, ""))}` : ""}` : esc(String(last.why).replace(/\.$/, ""))}.</p>` : "<p>The collector has not run yet.</p>";
  /* RR-329 E: the facts by part, each part closed until tapped (light on a phone) — the owner's own facts first and open */
  const groups = (mine) => { const own = mine.filter((f) => f.status === "owner"), rest = mine.filter((f) => f.status !== "owner"), by = new Map();
    for (const f of rest) (by.get(f.part) ?? by.set(f.part, []).get(f.part)).push(f);
    return `${own.length ? `<details open><summary>Yours (${own.length})</summary>${own.map(card).join("")}</details>` : ""}${[...by].map(([k, fs]) => `<details><summary>${esc(NAMES[k] ?? k)} (${fs.length}${fs.some((f) => f.status === "unconfirmed") ? `, ${fs.filter((f) => f.status === "unconfirmed").length} unconfirmed` : ""})</summary>${fs.map(card).join("")}</details>`).join("")}`; };
  /* RR-331: the "first 30" list and the grid are REPLACED by one table (countriesTable) */
  void mark; void link; void missingOf;
  let detail = "";
  if (country && byC[country]) {
    const r = byC[country], mine = facts.filter((f) => f.country === country).sort((a, b) => (b.status === "owner") - (a.status === "owner"));
    detail = `<h2 id="facts">${esc(country)} — ${r.complete ? `all ${oet ? "five" : Object.keys(NAMES).length} parts filled: a country page` : `missing: ${esc(r.missing.map((p) => NAMES[p] ?? p).join(", "))}`}</h2><ul>${Object.entries(r.parts).filter(([, p]) => !p.filled).map(([k, p]) => `<li>${esc(NAMES[k] ?? k)}: ${esc(p.missing.join("; "))}</li>`).join("")}</ul>${searchList(country)}
${oet ? `<p class="fine">Parts: fee ${r.parts.fee.facts.length ? "✓" : "—"} · questions ${r.parts.questions.facts.length} answered · centres ${r.parts.centres.filled ? "✓" : "—"} · councils ${Object.values(r.councils).filter(Boolean).length} of ${Object.keys(r.councils).length} professions · rules ${r.parts.rules.facts.length}</p>${questionsPanel(country, { stats: qstats[country] ?? null, facts, asked })}` : ""}
${knowBox(country)}
<h3>The facts (${mine.length})</h3>${mine.length ? groups(mine) : "<p>No fact collected yet for this country.</p>"}`;
  }
  /* RR-330: the first 15 countries first (the owner's question): % of their 75 parts filled, each part, and when every part is tried once */
  const f15 = oet && first15 ? `<p class="card"><b>First ${first15.countries} countries: ${first15.percent}% done</b> · fee ${first15.byPart.fee}/${first15.countries} · questions ${first15.byPart.questions}/${first15.countries} · centres ${first15.byPart.centres}/${first15.countries} · councils ${first15.byPart.councils}/${first15.countries} (a council for ${first15.councils} of ${first15.councilPairs} professions) · rules ${first15.byPart.rules}/${first15.countries}<br><span class="fine">${first15.left ? `${first15.left} still to try in full — every part tried once by about ${esc(first15.eta)} at today's caps${first15.measured ? "" : " (an estimate until 3 countries are measured)"}; a council nobody's page shows is searched again every day after that.` : "Every part of these countries has been tried; councils not found yet are searched again every day."}</span></p>` : "";
  const head = oet ? `${f15}<p><b>${c.complete}</b> of ${c.countries} countries have all five parts (a country page) · fee ${c.byPart.fee} · questions ${c.byPart.questions} · centres ${c.byPart.centres} · councils for every profession ${c.byPart.councils} · rule ${c.byPart.rules}</p>
<p>Country × profession: a council found for <b>${c.councilsFound.toLocaleString("en-US")}</b> of ${c.pairs.toLocaleString("en-US")} · ${c.unconfirmed} facts unconfirmed (never shown on a page) · ${c.rejected} rejected by you${c.removed ? ` · ${c.removed} questions set aside (a comment to a video's maker, or an answer under a replaced rule; Approve brings one back)` : ""}</p>`
    : `<p><b>${c.complete}</b> of ${c.countries} countries have all ${parts.length} parts (a country page) · ${parts.map((p) => `${esc(p.name)} ${c.byPart[p.key]}`).join(" · ")}</p><p>${c.unconfirmed} facts unconfirmed (never shown on a page) · ${c.rejected} rejected by you${c.removed ? ` · ${c.removed} questions set aside (the filter or a replaced rule)` : ""}</p>`;
  const nav = products.length ? `<p class="row">${products.map((p) => (p.key === product ? `<span class="chip"><b>${esc(p.name)}</b></span>` : `<a class="chip" href="/owner/countries${p.key === "oet" ? "" : `?p=${encodeURIComponent(p.key)}`}">${esc(p.name)}</a>`)).join(" ")}</p>` : "";
  const pick = `<form method="get" action="/owner/countries" class="row">${oet ? "" : `<input type="hidden" name="p" value="${esc(product)}">`}<select name="c" aria-label="A country">${order.map((n) => `<option${n === country ? " selected" : ""}>${esc(n)}</option>`).join("")}</select> <button class="pill ghost" type="submit">Open</button></form>`;
  const A = arguments[0] ?? {}, table = countriesTable({ order, byC, facts, tasks: A.tasks ?? {}, product, parts, names: NAMES, today: A.today ?? null, dated: Boolean(A.dated) });
  return ownerFrame("Country facts", `${PHONE_CSS}${ownerMenu("countries", A.summary ?? null)}<h1>Owner — country facts</h1>${message ? `<p class="card" role="status">${esc(message)}</p>` : ""}
${nav}
${head}
<p class="fine">AI research: ANTHROPIC_API_KEY ${aiOn ? "set" : "missing — the collector reads official pages and AlmiOET's records only"}${caps ? ` · today's caps: $${caps.aiUsd.toFixed(2)} of AI, ${caps.reads} page reads` : ""}${spend ? ` · used today: $${spend.aiUsd.toFixed(2)}, ${spend.reads} reads, ${spend.searches} web searches` : ""}.</p>
${detail}${pick}
<details open><summary>All ${c.countries} countries, in the queue's order (tap a country)</summary>${table}</details>
<details><summary>The last run</summary>${runLine}${tplTable}<form method="post" action="/owner/countries/run"><button class="pill" type="submit">Collect now (one short run)</button></form></details>`);
}

/* RR-338: `closed` = a live key before the owner switches payments on — the buyer is told plainly that buying is not open yet */
export const buyNotConnected = (plan, state = "DEFERRED", { sales = false, closed = false } = {}) => frame({ path: "/buy", lite: sales ? "sales" : false, title: "Checkout — AlmiVisibility", description: "AlmiVisibility checkout.", noindex: true,
  body: closed ? `<section class="page"><div class="wrap prose"><h1>Buying opens soon</h1><p data-sales-closed>Payments are not switched on yet, so no plan can be bought today. Nothing was charged. Meanwhile, the free score works now.</p><p><a class="pill" href="/#score">Get my free score</a> <a class="pill ghost" href="/pricing">Back to the plans</a></p></div></section>`
    : `<section class="page"><div class="wrap prose"><h1>Checkout is not connected here</h1><p>${state === "REFUSED" ? "This plan cannot be bought here." : `This copy of the site has no payment connection${plan ? ` for the plan ${esc(plan)}` : ""}.`} Nothing was charged.</p><p><a class="pill" href="/pricing">Back to the plans</a></p></div></section>` });
/** RR-303 A: after a paid checkout — the buyer's licence key and where it goes in the app. The page names no price and no card. */
export const buySuccess = (c, { sales = false } = {}) => frame({ path: "/buy/success", lite: sales ? "sales" : false, title: "Thank you — AlmiVisibility", description: "Your AlmiVisibility licence key.", noindex: true,
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
