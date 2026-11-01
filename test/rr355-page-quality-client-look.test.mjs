/**
 * 🔴 RR-355 (owner, reading AlmiOET's 1.15.8 drafts: 31 of 32 showed ✅ and none could be published) — PAGE QUALITY + CLIENT LOOK.
 *   Rule 1  a page looks exactly like the client's site (its own header, footer and styles; or created inside its WordPress / Shopify theme);
 *           otherwise never ✅ — "This page does not look like your site yet."
 *   Rule 2  the SIXTH check, "good to read": a on topic · b no broken or doubled card · c no internal note · d one value per thing (one
 *           rate service, never a central bank) · e enough real help · f plain English
 *   Rule 3  a country page's five things (the fee in its own money FIRST, its questions, its centres, its councils, a rule of its own)
 *   Rule 4  profession pages (the score each council asks, the Writing letter, its questions) and topic pages (about their topic only)
 *   Bugs    the client's choice everywhere · why the site refused · questions people ask · the plan made again · the gains sentence ·
 *           "Fix it for me" only where it is done · at most 2 cards · a visible Connect button · update downloaded, then Restart
 * Each check is proved RED with its opposite input in the same test (a page that breaks ONLY that check).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { goodToRead, topicOf, cleanFact, brokenCard, partsMissing, looksLikeSite, NOT_YOUR_LOOK, centralBankLink } from "../desktop/page-quality.mjs";
import { examPlan, localFee, serviceFactsOf, usableFacts } from "../desktop/exam-plan.mjs";
import { shellOf } from "../desktop/site-read.mjs";
import { seoPages, inSiteLook } from "../desktop/seo-pages.mjs";
import { refusedWhy, fixVia, withFix, fixExisting } from "../desktop/publish.mjs";
import { foundInfo } from "../desktop/product-check.mjs";
import { plainWhy } from "../desktop/plain-words.mjs";
import { PEOPLE_WORD } from "../desktop/recognition.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
const ON = "2026-10-31";

/* a page in the engine's own markup: its cards and its questions, each answer a sourced line */
const pageHtml = ({ title, cards = [], items = [] }) => `<!doctype html><html><head><title>${title}</title></head><body><main><section class="hero"><h1>${title}</h1></section>`
  + `<section><h2>Key facts</h2><ul class="cards">${cards.map((v, i) => `<li class="card" data-claim-id="c${i}"><span class="k">${title}</span><span class="v">${v}</span><a class="src" href="https://oet.example/">Source: oet.example</a></li>`).join("")}</ul></section>`
  + `<section><h2>Questions and answers</h2>${items.map(([id, q, answers]) => `<details data-need-id="${id}"><summary>${q}</summary>${answers.map((a, j) => `<p data-claim-id="${id}-${j}">${a} <a class="src" href="https://oet.example/">Source: oet.example</a><span class="src"> · checked ${ON}</span></p>`).join("")}</details>`).join("")}</section></main></body></html>`;
let longN = 0; /* RR-356: each answer its own sentence (a sentence said twice is filler) */
const LONG_TEXT = "it gives the reader the facts they need, in plain words, with the page it came from and the day it was checked.";
const L = () => `Note ${++longN}: ${LONG_TEXT}`;
const READING = {
  title: "OET Reading", cards: ["60 minutes", "42 marks"],
  items: [
    ["r--a", "How long is OET Reading?", [`OET's own page: Reading takes 60 minutes, in three parts, with 42 questions in all. ${L()}`]],
    ["r--b", "How is OET Reading built?", [`OET's own page: Reading has 42 marks — Part A 20, Part B 6, Part C 16. ${L()}`]],
    ["r--c", "What score is grade B in OET Reading?", [`OET's own page: grade B in Reading is typically at least 30 marks. ${L()}`]],
    ["r--d", "How often should I take an OET Reading practice test?", [`OET's own page recommends one practice test every 2–3 weeks for Reading. ${L()}`]],
  ],
};
const T = topicOf({ title: "OET Reading", kind: "topic", people: PEOPLE_WORD });
const checks = (html, t = T) => goodToRead(html, t).problems.map((p) => p.check);

test("RR-355 · Rule 2 · the sixth check: a good page passes; each of a–f turns RED on a page that breaks only it", () => {
  assert.deepEqual(goodToRead(pageHtml(READING), T), { pass: true, problems: [] }, "a good Reading page");
  /* a) on topic — the owner's own example: a Reading page showing Ireland's Listening score */
  const a = { ...READING, items: [...READING.items, ["r--e", "What does Ireland ask?", [`Ireland — Listening 350 for pharmacists, in one sitting, for two years. ${L()}`]]] };
  assert.deepEqual(checks(pageHtml(a)), ["a"]);
  assert.match(goodToRead(pageHtml(a), T).problems[0].line, /^Off topic: .*it is about Listening, not Reading/);
  /* b) a broken or doubled card — "0 to", "AUD 1", "2026, OET", one card twice */
  for (const bad of ["0 to", "AUD 1", "2026, OET"]) assert.deepEqual(checks(pageHtml({ ...READING, cards: [bad] })), ["b"], bad);
  assert.deepEqual(checks(pageHtml({ ...READING, cards: ["60 minutes", "60 minutes"] })), ["b"]);
  /* c) an internal note — the owner's own example */
  const c = { ...READING, items: [...READING.items, ["r--e", "What score is grade B in OET Reading?", [`OET's own page: grade B in Reading is typically at least 30 marks; the October M2M page is blocked by Cloudflare. ${L()}`]]] };
  assert.deepEqual(checks(pageHtml(c)), ["c"]);
  /* d) one value per thing — two PKR amounts (the owner's own: 114,277 and 114,090) */
  const pk = (lines) => pageHtml({ title: "OET in Pakistan", cards: ["PKR ≈ 114,277 (AUD 587 official fee · approximate)"], items: [["p--fee", "How much does OET cost in Pakistan?", lines], ["p--q0", "Can I take OET in Pakistan?", [`Yes, at a test venue in Pakistan. ${L()}`]], ["p--centres", "Where can I take OET in Pakistan?", [`OET has three test venues in Pakistan. ${L()}`]], ["p--councils", "Which council registers nurses in Pakistan?", [`The Pakistan Nursing and Midwifery Council registers nurses in Pakistan. ${L()}`]]] });
  const PKT = topicOf({ title: "OET in Pakistan: fee, centres and councils", kind: "country", country: "Pakistan", people: PEOPLE_WORD });
  assert.deepEqual(checks(pk([`The full test costs AUD 587. In Pakistan that is about PKR 114,277. ${L()}`]), PKT), []);
  assert.deepEqual(checks(pk([`The full test costs AUD 587 — about 114,277 PKR. ${L()}`, `OET costs AUD 587 — about 114,090 PKR in Pakistan. ${L()}`]), PKT), ["d"]);
  assert.ok(centralBankLink("https://www.sbp.org.pk/ecodata/rates/m2m/M2M-Current.asp") && !centralBankLink("https://www.exchangerate-api.com"), "never a central bank's rate");
  /* e) RR-356 R7 (owner: no fixed word or answer minimum — completeness is judged against the coverage list): one short, complete answer is
   * no failure here; an EMPTY page and FILLER (the same sentence twice to look deeper) are */
  assert.deepEqual(checks(pageHtml({ ...READING, items: READING.items.slice(0, 1) })), [], "one question answered is not 'thin' by a count");
  assert.deepEqual(checks(pageHtml({ ...READING, items: [] })), ["e"]); assert.match(goodToRead(pageHtml({ ...READING, items: [] }), T).problems[0].line, /^Empty — it answers no question yet\.$/);
  const two = { ...READING, items: READING.items.slice(0, 2).map(([id, q, [a]]) => [id, q, [`${a} The same sentence is here to look deeper than it is.`]]) };
  assert.deepEqual(checks(pageHtml(two)), ["e"], "the same sentence twice is filler"); assert.match(goodToRead(pageHtml(two), T).problems[0].line, /^Filler — the same sentence twice/);
  /* f) plain English — machine words, or one sentence far too long */
  assert.deepEqual(checks(pageHtml({ ...READING, items: [...READING.items, ["r--e", "What score is grade B in OET Reading?", [`Grade B is undefined for Reading in this release. ${L()}`]]] })), ["f"]);
  assert.deepEqual(checks(pageHtml({ ...READING, items: [...READING.items, ["r--e", "What score is grade B in OET Reading?", [`${"the reader reads the long text and then ".repeat(8)}gets grade B in Reading.`]]] })), ["f"]);
  /* the plain reason the client reads is the check's own line */
  assert.equal(plainWhy({ readyAsDraft: false, gates: [{ gate: "F", words: "good to read", pass: false, failing: ["Too thin — needs more: it answers 1 question; a page needs at least 3 real answers."] }] }), "Too thin — needs more: it answers 1 question; a page needs at least 3 real answers.");
});

test("RR-355 · Rule 2 c + b · a fact's research notes are taken out; a cut-off card is broken", () => {
  assert.equal(cleanFact("SBP daily average banks' floating rate on 30-Sep-26: AUD 1 = PKR 193.32. This is the latest AUD figure SBP publishes in this file; the October M2M page is blocked by Cloudflare."), "SBP daily average banks' floating rate on 30-Sep-26: AUD 1 = PKR 193.32.");
  assert.equal(cleanFact("AUD 587 for the full OET (four sub-tests). OET's pages state no PKR price."), "AUD 587 for the full OET (four sub-tests).");
  assert.equal(cleanFact("Dietitians Australia accepts OET; minimum 350 (B) in each of the 4 components. The fetched page does NOT state the date."), "Dietitians Australia accepts OET; minimum 350 (B) in each of the 4 components.");
  assert.equal(cleanFact("NMC accepts OET: Listening B (350+), Reading B (350+)."), "NMC accepts OET: Listening B (350+), Reading B (350+).", "a clean fact is unchanged");
  for (const [v, broken] of [["0 to", true], ["AUD 1", true], ["Pakistan — AUD 1", true], ["2026, OET", true], ["350", true], ["AUD 587", false], ["Ireland — Grade B (350)", false], ["180–200 words", false], ["since 2026", false]]) assert.equal(Boolean(brokenCard(v)), broken, v);
});

test("RR-355 · Rule 3 + 4 · the country page's five things, the fee in its own money FIRST from ONE rate service; profession and topic pages", () => {
  const rates = { date: ON, rates: { PKR: 194.679508, GBP: 0.5247 }, short: "ExchangeRate-API", link: "https://www.exchangerate-api.com" };
  const lf = localFee({ official: "AUD 587", country: "Pakistan", rates });
  assert.equal(lf.card, "PKR ≈ 114,277 (AUD 587 official fee · rate from ExchangeRate-API, 2026-10-31 · approximate)");
  assert.match(lf.line, /^The full test costs AUD 587 \(the official fee\)\. In Pakistan that is about PKR 114,277 — converted with ExchangeRate-API's rate of 2026-10-31 \(1 AUD = 194\.68 PKR\)\. It is approximate: you pay the official fee in AUD\.$/);
  assert.equal(localFee({ official: "AUD 587", country: "Australia", rates }).card, "AUD 587 — the official fee");
  assert.equal(localFee({ official: "AUD 587", country: "Pakistan", rates: null }), null, "no rate read today — no converted amount, never a guessed one");
  const f = (country, key, part, text, link = "https://oet.com/test/fees", extra = {}) => ({ id: `${country}-${key}-${text.length}`, country, key, part, verified: true, text, link, on: ON, ...extra });
  const facts = [
    f("Pakistan", "fee", "fee", "AUD 587 for the full OET (four sub-tests). OET's pages state no PKR price."),
    f("Pakistan", "rate", "fee", "SBP daily average banks' floating rate on 30-Sep-26: AUD 1 = PKR 193.324919. This is the latest AUD figure SBP publishes in this file.", "https://www.sbp.org.pk/x"),
    f("Pakistan", "venues", "centres", "OET says it has three test venues in Pakistan; the Lahore venue is run by AEO Pakistan.", "https://oet.com/news"),
    ...Object.values(serviceFactsOf({ Pakistan: {
      councils: { nursing: { value: { name: "Pakistan Nursing and Midwifery Council (PNMC)", website: "https://pnmc.gov.pk/" }, source: "https://pnmc.gov.pk/contact-us/", readOn: ON, status: "confirmed" } },
      rules: [{ value: { rule: "PMDC issues only one Certificate of Good Standing per foreign regulatory authority." }, source: "https://pmdc.pk/x", readOn: ON, status: "confirmed" }],
      questions: [{ value: { question: "can an mds graduate take the oet exam", answer: "Yes, dentistry is one of OET's 12 professions, so an MDS graduate in dentistry can take it.", answerKind: "official" }, source: "https://oet.com/test", readOn: ON, status: "confirmed" }] } })).flat(),
  ];
  const x = examPlan({ subject: "OET", professions: [], countries: ["Pakistan"], facts, rates, subjectFacts: {}, demand: [] });
  const pk = x.pages.find((p) => p.country === "Pakistan");
  assert.deepEqual(pk.items.map((it) => it.part), ["fee", "questions0", "centres", "councils", "rules"], "the owner's five things, in his order");
  assert.equal(pk.items[0].claims[0].card, lf.card, "the fee in its own money is the FIRST card");
  assert.equal(pk.items[1].question, "Can an mds graduate take the oet exam?", "a question people asked, shown as a question");
  /* the facts a page may use: never a rate fact or a central bank's page (both kinds, each alone), its notes taken out */
  assert.deepEqual(usableFacts(facts.slice(0, 3)).map((x) => x.key), ["fee", "venues"]);
  assert.deepEqual(usableFacts([{ ...facts[1], key: "fee" }]), [], "a central bank's page, whatever its key");
  assert.deepEqual(usableFacts([{ ...facts[1], link: "https://oet.com/x" }]), [], "a rate fact, wherever it was read");
  assert.equal(usableFacts([facts[0]])[0].text, "AUD 587 for the full OET (four sub-tests).");
  const text = JSON.stringify(pk);
  for (const bad of ["193.32", "sbp.org.pk", "this file", "state no PKR"]) assert.ok(!text.includes(bad), `${bad} reached the page`);
  /* the HTML check of the five things: a missing one is named; the fee card must come first */
  const html = (parts, cards) => pageHtml({ title: "OET in Pakistan", cards, items: parts.map((p) => [`need-x--${p}`, p, [`An answer for ${p}.`]]) });
  assert.deepEqual(partsMissing(html(["fee", "questions0", "centres", "councils", "rules"], ["PKR ≈ 114,277"]), "country", { localCurrency: "PKR" }), []);
  assert.deepEqual(partsMissing(html(["fee", "centres", "councils", "rules"], ["PKR ≈ 114,277"]), "country", { localCurrency: "PKR" }), ["the questions people there ask, with answers"]);
  assert.deepEqual(partsMissing(html(["fee", "questions0", "centres", "councils", "rules"], ["AUD 587", "PKR ≈ 114,277"]), "country", { localCurrency: "PKR" }), ["the fee in its own currency as the first fact card"]);
  assert.deepEqual(partsMissing(html(["scores", "questions1"], []), "profession"), ["what the Writing letter is for this profession"]);
  /* a sub-test topic page takes only its sub-test's own facts */
  const sub = { listeningMarks: { claimId: "subject-listeningMarks", text: "OET's own page: Listening Part A is 24 marks, Part B 6 and Part C 12 (42 in all).", link: "https://oet.com/ready/listening", readOn: ON },
    readingMarks: { claimId: "subject-readingMarks", text: "OET's own page: Reading has 42 marks — Part A 20, Part B 6, Part C 16.", link: "https://oet.com/ready/reading", readOn: ON } };
  const y = examPlan({ subject: "OET", professions: [], countries: [], facts: [], subjectFacts: sub, demand: [{ text: "oet reading", weight: 5 }, { text: "oet reading material", weight: 4 }] });
  const reading = y.pages.filter((p) => p.kind === "topic");
  assert.equal(reading.length, 1, "two searches about the same sub-test are ONE page");
  assert.deepEqual(reading[0].items.flatMap((it) => it.claims.map((c) => c.claimId)), ["subject-readingMarks"], "never Listening's facts on a Reading page");
});

test("RR-355 · Rule 1 · the site's own shell is read; the page wears it; without it the page never gets ✅", () => {
  const home = `<!doctype html><html lang="en" class="font-site"><head><link rel="stylesheet" href="/_next/static/site.css"><style>.x{color:red}</style><script src="/app.js"></script></head><body class="site"><header class="top"><a href="/" onclick="go()">Home</a><a class="btn bg-coral" href="/signup">Start</a></header><main>Home</main><footer><a href="/privacy">Privacy</a></footer></body></html>`;
  const shell = shellOf(home, "https://client.example/");
  assert.ok(shell.head.includes('href="https://client.example/_next/static/site.css"') && shell.head.includes("<style>"), "its stylesheet (made absolute) and its style");
  assert.ok(!/onclick|app\.js/.test(JSON.stringify(shell)), "the site's code never runs on a page");
  assert.equal(shellOf(home.replace(/<footer[\s\S]*<\/footer>/, ""), "https://client.example/"), null, "no footer — no shell");
  const engine = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>A page</title><style>body{background:#fff}</style></head><body><p class="stamp">Draft</p><main><h1>A page</h1><p><a class="cta" href="/signup">Try it</a></p></main><p class="stamp">Draft</p></body></html>`;
  const dressed = inSiteLook(engine, shell);
  assert.ok(/<header[^>]*data-site-shell/.test(dressed) && /<footer[^>]*data-site-shell/.test(dressed) && dressed.includes("data-site-style"));
  assert.ok(dressed.includes('<main class="av-page"><style data-av-content>'), "the content's own layout style travels inside <main>");
  assert.ok(!dressed.includes("body{background:#fff}"), "the engine's own colours are dropped — the site's are used");
  assert.ok(dressed.includes('class="cta btn bg-coral"'), "the call-to-action takes the site's own button classes");
  assert.deepEqual(looksLikeSite(dressed), { pass: true, how: "it carries your site's own header, footer and styles" });
  assert.deepEqual(looksLikeSite(engine), { pass: false, why: NOT_YOUR_LOOK });
  assert.equal(looksLikeSite(engine, { target: "wordpress" }).pass, true, "WordPress creates it inside its own theme");
  /* in the drafts: a site without a readable shell gets ⚠️ "does not look like your site yet" */
  const pg = (path, fact) => ({ url: `https://client.example${path}`, title: "Client", h1: "Client", h2: [], qa: [], facts: [fact], lead: [], prices: [] });
  const site = { ok: true, origin: "https://client.example", readOn: ON, robotsTxt: null, sitemapUrls: null, pages: [pg("/", "Client teeth whitening takes 60 minutes at the clinic for most people."), pg("/whitening", "Teeth whitening at the clinic takes 60 to 90 minutes, and it does not take long to heal.")] };
  const gsc = { queries: [{ query: "how long does teeth whitening take", impressions: 30 }], window: "28 days" };
  const bare = seoPages({ site, searchConsole: gsc, on: `${ON}T10:00:00Z` }).drafts[0];
  assert.equal(bare.gates.find((g) => g.gate === "G").pass, false);
  assert.equal(bare.readyAsDraft, false);
  const worn = seoPages({ site: { ...site, shell }, searchConsole: gsc, on: `${ON}T10:00:00Z` }).drafts[0];
  assert.equal(worn.gates.find((g) => g.gate === "G").pass, true);
  assert.ok(worn.gates.some((g) => g.gate === "F"), "every draft is judged by the sixth check too");
});

test("RR-355 · bug · why the site refused, in plain words, with what to change; a fix through the connection only where it is done", async () => {
  const gh = { kind: "github", repo: "owner/site", branch: "main" };
  assert.match(refusedWhy(gh, 401), /token is not valid or has expired/);
  assert.match(refusedWhy(gh, 403), /cannot write files in owner\/site — on GitHub, give the token "Contents: Read and write"/);
  assert.match(refusedWhy(gh, 404, {}, "repo"), /cannot find the repository "owner\/site"/);
  assert.match(refusedWhy(gh, 404, {}, "branch"), /The branch "main" does not exist in owner\/site/);
  assert.match(refusedWhy({ kind: "wordpress", site: "https://wp.example" }, 401), /application password/);
  for (const s of [refusedWhy(gh, 401), refusedWhy(gh, 403)]) assert.ok(!/refused the key/.test(s) && s.endsWith("Nothing was published."));
  assert.deepEqual([fixVia(gh, "title"), fixVia(gh, "title", { framework: true }), fixVia({ kind: "wordpress" }, "meta-description"), fixVia({ kind: "shopify" }, "title"), fixVia(null, "title")], [true, false, false, false, false]);
  assert.equal(withFix("<html><head><title>Old</title></head></html>", "title", "New & better"), "<html><head><title>New &amp; better</title></head></html>");
  assert.match(withFix("<html><head></head></html>", "meta-description", "A description."), /<meta name="description" content="A description."><\/head>/);
  /* through GitHub: the page's own file is read and written back with its sha */
  const calls = [];
  const fetchImpl = async (u, init) => { calls.push([init.method, String(u)]); const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    if (init.method === "GET" && /contents\/about\/index\.html/.test(u)) return ok({ sha: "abc", content: Buffer.from("<html><head><title>About</title></head></html>").toString("base64") });
    if (init.method === "PUT") return ok({ content: { sha: "def" } }); return { ok: false, status: 404, json: async () => ({ message: "Not Found" }) }; };
  const r = await fixExisting({ target: gh, key: "k", url: "https://site.example/about", kind: "title", text: "About us", fetchImpl, testBase: "http://127.0.0.1:1", allowLocal: true });
  assert.equal(r.ok, true, r.why); assert.match(r.line, /^Fixed on your site: the title of https:\/\/site\.example\/about/);
  assert.deepEqual(calls.map((c) => c[0]), ["GET", "PUT"]);
  assert.equal((await fixExisting({ target: gh, key: "k", url: "https://site.example/about", kind: "title", text: "x", framework: true, fetchImpl })).ok, false, "a Next.js site's titles live in code — the content instead");
});

test("RR-355 · bugs · in the app and on the screens", () => {
  /* the client's own choice everywhere: never chosen = show me first; the Publish settings button only saves */
  assert.ok(!/\?\? PUBLISH_MODE\.AUTO_AFTER_GATES\b/.test(MAIN), "an unset choice must never mean publish automatically");
  assert.ok(UI.includes('<button id="tgsave">Save — Next →</button>') && !UI.includes("Save and publish — Next"));
  assert.ok(UI.includes("You chose: <b>Show me before publishing</b>") && UI.includes("You chose: <b>Publish for me</b>"));
  /* questions people ask: the question collector's questions, and our own searches that ask */
  const fi = foundInfo({ own: [{ text: "how much is oet in pakistan", source: "keywords" }, { text: "oet pakistan fee", source: "keywords" }], asked: [{ text: "Can I take OET at home?", source: "AlmiWorld's question collector" }], on: ON });
  assert.deepEqual([fi.questions.length, fi.phrases.length], [2, 1]);
  assert.ok(MAIN.includes("asked: askedOf(id)") && (MAIN.match(/asked: askedOf\(id\)/g) ?? []).length === 3);
  /* the plan made again after the pages (its keywords and articles never 0 beside the searches found) */
  assert.ok(MAIN.includes("await buildPlan(id).catch(() => null);\n  return { pages, auto };"));
  /* the gains sentence names each gain, never the area twice */
  assert.ok(UI.includes("The biggest gains now: ${esc(gainsOf(PL.thisWeek))}.") && UI.includes('"meta-description": "page descriptions for Google"'));
  /* "Fix it for me" only where Visibility does it */
  assert.ok(UI.includes('via ? `<button type="button" data-fixvia="${esc(i.id)}">Fix it for me</button>` : ""') && !UI.includes('data-nofix="${has'));
  assert.ok(MAIN.includes('if (r[2] === "fix-existing" && req.method === "POST") {'));
  /* at most 2 recommended cards; the rest under More; every card shows its button; the Google screen's main button */
  assert.ok(UI.includes(".slice(0, 2), rest = O.menu.cards.filter((c) => !top.includes(c));") && UI.includes('<details class="card more" id="morecards">'));
  assert.ok(UI.includes('<span class="fgo">${c.id === "google" ? "Connect" : "Open"} →</span>'));
  assert.ok(UI.includes('<button class="big" id="gsignon1">Connect Google Search Console</button>') && UI.includes('<button class="big" id="connect">Connect Google Search Console</button>'));
  /* the update: downloaded in the background, then ONE button */
  assert.ok(MAIN.includes("updateDownloading = downloadUpdate({") && UI.includes('<button id="updgo" type="button">Update ready — Restart</button>'));
  /* the two collectors a page needs, asked by Create SEO pages itself; the module is packed */
  assert.ok(MAIN.includes("const sf = await subjectFactsFor(id, seedOf(s) ?? \"OET\"), rt = await oneRatesFor(id);"));
  assert.ok(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8").includes('"page-quality.mjs"'));
});
