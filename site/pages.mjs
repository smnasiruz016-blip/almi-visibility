/**
 * 🔴 almivisibility.almiworld.com — VISIBILITY'S OWN PUBLIC WEBSITE (RR-300; owner decision 1, and the owner's correction: CC writes the
 * pages, not Visibility). English only. Bold but true: no ranking, traffic or citation guarantee anywhere. Every number on the site carries
 * its source and date, or is not shown: the prices and plan sizes are AlmiWorld's own (set by the owner, 20 Oct 2026); the free test's
 * limits and the ten languages are the product's own, as built and tested on 20 Oct 2026. The look is AlmiWorld's sunrise palette and the
 * AlmiWorld logo (desktop/theme.mjs, desktop/brand). Download and Buy stay "coming soon" until the owner's Stripe products exist and his GREEN.
 */
import { cssVariables } from "../desktop/theme.mjs";
import { PRIVACY_LINE } from "./leads.mjs";
import { LIMITS, NO_PROMISE } from "./free-test.mjs";

export const ORIGIN = "https://almivisibility.almiworld.com";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const PRICES_SOURCE = "Prices set by AlmiWorld on 20 October 2026.";
export const BUILT_ON = "As built and tested on 20 October 2026.";
export const PLANS = Object.freeze([
  { price: 30, products: "1 product" }, { price: 40, products: "up to 5 products" }, { price: 60, products: "up to 10 products" }, { price: 80, products: "unlimited products" },
]);
export const LANGS = Object.freeze(["English (EN)", "Spanish (ES)", "German (DE)", "Italian (IT)", "French (FR)", "Portuguese (PT)", "Arabic (AR)", "Urdu (UR)", "Hindi (HI)", "Chinese (ZH)"]);
const NAV = [["/", "Home"], ["/free-test", "Free test"], ["/features", "Features"], ["/pricing", "Pricing"], ["/download", "Download"]];

const CSS = `${cssVariables()}
*{box-sizing:border-box} body{margin:0;background:var(--cream);color:var(--text);font:16px/1.6 var(--font);min-height:100vh;display:flex;flex-direction:column}
a{color:var(--ink)} main{flex:1 0 auto;width:100%}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header{background:var(--white);border-bottom:3px solid var(--peach)} header .wrap{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
header .maker img{height:46px;width:auto;display:block} header .name{font-weight:800;color:var(--ink);font-size:18px;text-decoration:none}
nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap} nav a{padding:8px 12px;border-radius:999px;text-decoration:none;color:var(--ink);font-weight:600;font-size:15px} nav a[aria-current]{background:var(--peach)}
.band{height:6px;background:linear-gradient(90deg,var(--coral),var(--sunrise),var(--peach))}
h1{color:var(--ink);font-size:clamp(30px,5vw,48px);line-height:1.15;margin:0 0 14px} h2{color:var(--ink);font-size:clamp(22px,3vw,30px);margin:0 0 10px} h3{color:var(--ink);margin:0 0 6px}
.hero{padding-top:56px;padding-bottom:36px} .hero p.lead{font-size:clamp(17px,2vw,20px);max-width:720px;color:var(--text)}
.btn{display:inline-block;padding:12px 22px;border-radius:999px;background:var(--coral);color:var(--ink);font-weight:700;text-decoration:none;border:0;font:inherit;font-weight:700;cursor:pointer}
.btn.alt{background:var(--sunrise)} .btn.ghost{background:transparent;border:2px solid var(--coral)} .btn[aria-disabled="true"]{opacity:.6;cursor:not-allowed}
.btn:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
section{padding:28px 0} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.card{background:var(--white);border:1px solid var(--peach);border-radius:18px;padding:22px}
.price{font-size:40px;font-weight:800;color:var(--ink)} .price small{font-size:16px;font-weight:600;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none} .chips li{background:var(--peach);color:var(--ink);border-radius:999px;padding:5px 12px;font-size:14px}
.note{color:var(--muted);font-size:14px} .soon{background:var(--peach);color:var(--ink);border-radius:12px;padding:12px 16px;display:inline-block;font-weight:600}
.draft{background:#FFF1C9;color:var(--ink);border:2px dashed var(--sunriseDeep);border-radius:12px;padding:12px 16px;font-weight:600}
form.test{display:flex;gap:10px;flex-wrap:wrap} form.test input[type=text]{flex:1 1 280px;padding:12px 14px;border:2px solid var(--peach);border-radius:999px;font:inherit;background:var(--white);color:var(--ink)}
.score{font-size:64px;font-weight:800;color:var(--ink);line-height:1} ul.plain{padding-left:20px} .ok{color:var(--ink)} .nm{color:var(--muted)}
.lead label{display:block;margin:8px 0;color:var(--ink)} .lead input[type=email]{width:100%;max-width:420px;padding:11px 14px;border:2px solid var(--peach);border-radius:999px;font:inherit}
.err{color:#9F1D1D;font-weight:600}
footer{background:var(--night);color:var(--cream);margin-top:24px} footer .wrap{padding:22px 20px;display:flex;flex-wrap:wrap;gap:16px;align-items:center} footer a{color:var(--gold)} footer .made{margin-right:auto}
@media (max-width:640px){header .maker img{height:38px} nav{margin-left:0;width:100%} .hero{padding-top:32px;padding-bottom:20px}}`;

/** One page, the site's own frame: the AlmiWorld logo (linking almiworld.com), the nav, the page, the footer. */
export function frame({ path, title, description, body, noindex = false }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${ORIGIN}${path === "/" ? "/" : path}">`}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">
<style>${CSS}</style></head><body>
<header><div class="wrap"><a class="maker" href="https://almiworld.com/" title="AlmiWorld"><img src="/brand/almiworld-logo.png" alt="AlmiWorld — live beautifully" width="111" height="46"></a><a class="name" href="/">AlmiVisibility</a>
<nav aria-label="Main">${NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div></header><div class="band"></div>
<main>${body}</main>
<footer><div class="wrap"><span class="made">Made by <a href="https://almiworld.com/">AlmiWorld</a> · live beautifully</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://almiworld.com/">almiworld.com</a></div></footer>
</body></html>`;
}

export const home = () => frame({ path: "/", title: "AlmiVisibility — be found, with every fact sourced", description: "AlmiVisibility builds the pages search engines and AI answers can trust: every fact sourced and dated, every page checked by five gates before it goes live. Try the free website test.",
  body: `<div class="wrap hero"><h1>Be found for what you really are.</h1><p class="lead">AlmiVisibility writes and keeps the pages your customers are searching for — every fact with its source and the date it was checked, every page checked by five gates before it can go live. No tricks, no thin pages, no made-up numbers.</p>
<p><a class="btn" href="/free-test">Test your website free</a> <a class="btn ghost" href="/pricing">See the plans</a></p><p class="note">${esc(NO_PROMISE)}</p></div>
<section><div class="wrap"><h2>How it works</h2><div class="grid">
<div class="card"><h3>1 · It reads your real questions</h3><p>The questions people search for about your product — from your own Search Console, your own search key, or your own AI search — never questions it made up.</p></div>
<div class="card"><h3>2 · It answers from sources</h3><p>Each answer is built from official sources, with the source named and the date it was checked. Numbers and conditions stay exactly as the source says them.</p></div>
<div class="card"><h3>3 · It checks before it publishes</h3><p>Five gates — no duplicate, no competing page, clean technical basics, a known cost, existing pages first. A page that fails a gate is not published, and you are told why.</p></div>
</div></div></section>
<section><div class="wrap"><h2>Your site, your design</h2><p>Pages are built in your own website's look — your logo, your header and links — with key-fact cards and clear questions and answers. In the languages you choose:</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div></section>
<section><div class="wrap card"><h2>Honest about results</h2><p>No one can promise a first place on Google or a mention in an AI answer, and we do not. AlmiVisibility does the work that makes your pages clear, correct and easy to trust — and shows you, every month, what it did and what your own search data says.</p><p><a class="btn alt" href="/free-test">Run the free test</a></p></div></section>` });

export const freeTest = ({ result = null, error = null, left = null } = {}) => frame({ path: "/free-test", title: "Free website visibility test — AlmiVisibility", description: `Enter your website and get an instant visibility score and the next actions. Up to ${LIMITS.pagesPerTest} pages, ${LIMITS.testsPerPersonPerDay} tests a day, free.`,
  body: `<div class="wrap hero"><h1>Free website test</h1><p class="lead">Enter your website. We read up to ${LIMITS.pagesPerTest} of its pages — politely, following its robots.txt — and show your visibility score and what to fix first.</p>
<form class="test" method="post" action="/free-test"><label for="url" class="note" style="flex-basis:100%">Your website address</label><input id="url" name="url" type="text" inputmode="url" placeholder="yourwebsite.com" required><button class="btn" type="submit">Test it</button></form>
<p class="note">Free: ${LIMITS.testsPerPersonPerDay} tests a day, up to ${LIMITS.pagesPerTest} pages each. ${BUILT_ON} We never log in, never fill in forms and never read a page your robots.txt asks us not to.</p>
${error ? `<p class="err">${esc(error)}</p>` : ""}${result ? resultBlock(result, left) : ""}</div>` });

function resultBlock(r, left) {
  const cats = Object.entries(r.byCategory).map(([c, v]) => `<li>${esc(c.toLowerCase())}: ${v === null ? '<span class="nm">NOT MEASURED</span>' : `${v} / 100`}</li>`).join("");
  return `<section class="card" id="result"><h2>Your result for ${esc(r.url)}</h2>
<p class="note">Tested ${esc(r.testedOn.slice(0, 16).replace("T", " "))} UTC · ${r.pagesRead} of up to ${r.pagesLimit} pages read${left !== null ? ` · ${left} free test(s) left today` : ""}</p>
<div class="score">${r.score === null ? "NOT MEASURED" : `${r.score}<small style="font-size:24px"> / 100</small>`}</div><p class="note">The score counts only the checks we could measure. A check we could not measure is listed below — it is never counted as zero.</p>
<h3>By area</h3><ul class="plain">${cats}</ul>
<h3>What to fix first</h3>${r.nextActions.length ? `<ol>${r.nextActions.map((a) => `<li><b>${esc(a.check)}</b> — ${esc(a.action)} <span class="note">(${a.pages} page${a.pages === 1 ? "" : "s"})</span></li>`).join("")}</ol>` : "<p>Nothing failed among the checks we measured.</p>"}
<h3>Measured</h3><p class="ok">${r.measured.map(esc).join(", ") || "nothing"}</p>
<h3>NOT MEASURED in this free test</h3><ul class="plain nm">${r.notMeasured.map((n) => `<li>${esc(n)}</li>`).join("") || "<li>none</li>"}</ul>
${r.skipped.length ? `<h3>Pages not read</h3><ul class="plain nm">${r.skipped.slice(0, 10).map((s) => `<li>${esc(s.url)} — ${esc(s.why)}</li>`).join("")}</ul>` : ""}
<p class="note">${esc(r.noPromise)}</p>
<form class="lead" method="post" action="/api/lead" id="lead"><h3>Want the full report? Leave your email</h3><input type="hidden" name="testedUrl" value="${esc(r.url)}">
<label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email">
<label><input type="checkbox" name="consent" value="yes"> Yes, send me the full report and news about AlmiVisibility.</label>
<p class="note">${esc(PRIVACY_LINE)} <a href="/privacy">Privacy</a></p><button class="btn alt" type="submit">Send me the full report</button></form></section>`;
}

export const features = () => frame({ path: "/features", title: "Features — AlmiVisibility", description: "One page builder in your own design, daily articles, auto-refresh when a source changes, social posts, a monthly report, ten languages, three ways to bring your search data, and a Windows app.",
  body: `<div class="wrap hero"><h1>Everything your visibility needs, in one app</h1><p class="lead">${BUILT_ON}</p></div><section><div class="wrap grid">
${[
  ["One page builder, your design", "Every page uses your own website's look — your logo, header and links — then key-fact cards, then questions and answers, each answer with its source and checked date."],
  ["New pages only where they help", "A page is made only for a real question with a sourced answer. If one of your pages already answers it, the answer joins that page as a section instead of a duplicate page."],
  ["A daily article", "One article a day by default — you choose the number. Only from your product's real questions that no page or earlier article answers yet. If none is worthy that day, no article is made, and you are told why."],
  ["Publish your way", "Publish automatically after every gate passes, or choose “show me first” and approve each page yourself."],
  ["Auto-refresh", "When a source changes a fact, every page and article that shows it is rebuilt with the new value, its source and the new checked date. If the new value cannot be read word for word, nothing changes and you are told."],
  ["Social posts", "Two or three short posts for each article, ready to copy to Facebook or LinkedIn — each with the article's link and one sourced fact. You post them yourself."],
  ["A monthly report", "One plain page a month, readable on a phone, bad news first: what was made, what was refreshed, your own search numbers (or “not connected” — never a zero), and next month's topics."],
  ["YouTube, too", "Visibility checks your own channel — missing titles, descriptions, chapters, thumbnail text and links back to your product page — and suggests titles, tags and chapters only from your real search phrases and questions. It writes a short video script from each article; you make the video. It reads your channel through your own YouTube key or a YouTube Studio export you import."],
  ["Three ways to bring your search data", "Your own search API key, your own Google Search Console, or your own AI search account. You choose; the cost of your own connection stays yours."],
  ["Your own AI connection", "Writing and translating run on your own AI account. Your key stays in your computer's settings — the app asks only for its name, never the key itself."],
  ["A Windows app", "Install it like any Windows program. Your data stays on your computer, and a newer version installs itself only when you agree."],
].map(([h, p]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join("")}
</div></section><section><div class="wrap"><h2>Ten languages</h2><p>The same facts, numbers, sources and dates in every language — only the wording changes. Arabic and Urdu are written right to left.</p><ul class="chips">${LANGS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div></section>` });

export const pricing = () => frame({ path: "/pricing", title: "Pricing — AlmiVisibility", description: "AlmiVisibility plans: $30 a month for 1 product, $40 for up to 5, $60 for up to 10, $80 for unlimited products. No free trial.",
  body: `<div class="wrap hero"><h1>Simple plans</h1><p class="lead">Per month, in US dollars. Every plan has every feature — the plans differ only in how many products you can add. There is no free trial; the free website test is free for everyone.</p></div>
<section><div class="wrap grid">${PLANS.map((p) => `<div class="card"><div class="price">$${p.price}<small> / month</small></div><p><b>${esc(p.products)}</b></p><p><span class="btn" aria-disabled="true" role="link">Buy — coming soon</span></p></div>`).join("")}</div>
<div class="wrap"><p class="note">${PRICES_SOURCE} Payment will be by card through Stripe. Buying opens soon.</p></div></section>` });

export const download = () => frame({ path: "/download", title: "Download — AlmiVisibility", description: "AlmiVisibility for Windows is coming soon.",
  body: `<div class="wrap hero"><h1>Download AlmiVisibility</h1><p class="lead">AlmiVisibility is a Windows app: download the installer, click Next, Install and Finish, and open it from your desktop.</p><p class="soon">Coming soon — download and buy open together.</p>
<p class="note">Your data stays on your own computer. Until the app is code-signed, Windows may show an “unknown publisher” warning when you install it.</p><p><a class="btn" href="/free-test">Try the free website test now</a></p></div>` });

const draftNote = `<p class="draft">DRAFT for AlmiWorld's review — not legal advice. This text is a plain-words draft and is not yet in force.</p>`;
export const privacy = () => frame({ path: "/privacy", title: "Privacy — AlmiVisibility", description: "How AlmiVisibility handles the website test and the emails people choose to leave.", noindex: true,
  body: `<div class="wrap hero"><h1>Privacy</h1>${draftNote}
<h2>The free website test</h2><p>When you test a website, we read up to ${LIMITS.pagesPerTest} of its public pages, following its robots.txt. To limit tests to ${LIMITS.testsPerPersonPerDay} a day per person, we keep a scrambled code made from your internet address for that day only — not the address itself.</p>
<h2>Your email</h2><p>We keep your email only if you tick the box and send it. We use it to send you the full report and news about AlmiVisibility. We never sell it. Ask us at any time and we delete it.</p>
<h2>Where it is kept</h2><p>Emails are kept in AlmiVisibility's own database. Only AlmiWorld can see the list.</p>
<h2>The Windows app</h2><p>The app keeps your products, settings and reports on your own computer.</p>
<h2>Contact</h2><p>AlmiWorld — <a href="https://almiworld.com/">almiworld.com</a></p></div>` });

export const terms = () => frame({ path: "/terms", title: "Terms — AlmiVisibility", description: "The plain-words terms of AlmiVisibility.", noindex: true,
  body: `<div class="wrap hero"><h1>Terms</h1>${draftNote}
<h2>What you get</h2><p>AlmiVisibility helps you plan, build and keep pages for your own products, in your own design. You decide what is published.</p>
<h2>No guarantee of rankings</h2><p>No one controls search engines or AI answers. AlmiVisibility does not promise any ranking, traffic, citation or sales.</p>
<h2>Your content and your connections</h2><p>You are responsible for your own products, your own sites and the connections you add (search data, AI account). Their costs are yours.</p>
<h2>Plans and payment</h2><p>Plans are paid monthly. There is no free trial. You can cancel at any time; your data stays on your computer.</p>
<h2>The free website test</h2><p>Test only websites you are allowed to test. We follow each site's robots.txt and read at most ${LIMITS.pagesPerTest} pages.</p></div>` });

export const adminLogin = (error = null) => frame({ path: "/admin", title: "Admin — AlmiVisibility", description: "Private.", noindex: true,
  body: `<div class="wrap hero"><h1>Admin</h1><form method="post" action="/admin/login" class="lead"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" style="max-width:320px;padding:11px 14px;border:2px solid var(--peach);border-radius:999px;font:inherit"><p><button class="btn" type="submit">Sign in</button></p>${error ? `<p class="err">${esc(error)}</p>` : ""}</form></div>` });
export const adminLeads = (leads, storeKind) => frame({ path: "/admin/leads", title: "Leads — AlmiVisibility admin", description: "Private.", noindex: true,
  body: `<div class="wrap hero"><h1>Leads</h1><p class="note">Store: ${esc(storeKind)} · ${leads.length} lead(s) · each gave consent.</p><div class="card"><table style="width:100%;border-collapse:collapse"><tr><th align="left">Email</th><th align="left">Tested site</th><th align="left">When</th></tr>${leads.map((l) => `<tr><td>${esc(l.email)}</td><td>${esc(l.testedUrl ?? "")}</td><td>${esc(String(l.at).slice(0, 16))}</td></tr>`).join("")}</table></div></div>` });
