/**
 * 🔴 RR-354 (owner, AlmiOET's run on 1.15.7 — "it should be simple and easy"):
 *   1 the client flow: assess → "What do you want done?" (5 ticks, the approval asked once) → Start → one short honest report + one next step
 *   2 the collectors connected: the keyword database's searches are "search phrases" (never "0" beside "keyword service on"); AlmiWorld's
 *     country facts asked by the plan; a draft with no checked number gets the checked fact that fits it
 *   3 the pages in plain words: ✅ ready / ⚠️ needs work (one plain reason), Fix, Publish, Fix all, Publish all ready
 *   4 an exam-prep plan: 12 profession pages + the main countries' pages; searches joined to their page; a profession is never a country page
 *   5 the truth rule: only checked facts on a page; a search for another site or for the real exam's questions makes no page
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { examPlan, needOf, skipWhy, cardOf, serviceFactsOf } from "../desktop/exam-plan.mjs";
import { plainWhy, JOBS, APPROVAL, jobReport, notMadeOf } from "../desktop/plain-words.mjs";
import { keyOf, factsOfStore } from "../desktop/facts-file.mjs";
import { foundInfo } from "../desktop/product-check.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
const ON = "2026-10-31";
const fact = (country, part, profession, text, extra = {}) => ({ id: `${country}-${part}-${profession ?? "x"}-${text.length}`, country, part, profession, label: part, verified: true, text, link: `https://official.example/${country.replace(/\s/g, "-")}`, on: ON, source: `${country} Board`, ...extra });
const FACTS = [
  fact("United Kingdom", "councils", "nursing", "NMC accepts OET: Listening B (350+), Reading B (350+), Writing C+ (300+), Speaking B (350+)."),
  fact("United Kingdom", "councils", "optometry", "GOC does not accept OET. Optometrists take another test."),
  fact("Ireland", "councils", "nursing", "NMBI accepts OET (Nursing): Grade B (350) in three components and C+ in one."),
  fact("United Kingdom", "fee", null, "AUD 587 for the full OET (four sub-tests)."),
  fact("Pakistan", "fee", null, "PKR 113,000 at the bank's rate of 29 Oct 2026."),
  fact("Pakistan", "centres", null, "OET has test venues in Karachi and Lahore (2 cities)."),
  fact("Pakistan", "rules", null, "Bring your CNIC.", { verified: false }),
];
const PROFS = ["nursing", "medicine", "optometry", "dentistry", "pharmacy", "physiotherapy", "occupational therapy", "radiography", "dietetics", "podiatry", "speech pathology", "veterinary science"];
const DEMAND = ["oet for nurses", "oet nursing requirements", "oet pakistan fee", "oet exam", "oet examination", "oet english test", "oet exam price", "oet result", "recent oet writing questions", "e2 oet", "oet com", "oet official website", "occupationalenglishtest", "oet practice test"].map((text, i) => ({ text, source: "AlmiWorld keyword service", weight: 20 - i }));
const SITE = { ok: true, origin: "https://prep.example", readOn: `${ON}T00:00:00Z`, pages: [{ url: "https://prep.example/practice", title: "OET Practice Test | Prep", h1: "OET Practice Test", qa: [], facts: [] }] };

test("RR-354 · 4 · the exam plan: one page per profession, one per main country, searches joined to the page they are about", () => {
  const x = examPlan({ subject: "OET", professions: PROFS, countries: ["United Kingdom", "Ireland", "Pakistan"], facts: FACTS, demand: DEMAND, site: SITE });
  assert.deepEqual(x.counts, { profession: 12, country: 3, topic: 3, improve: 0 }); // RR-356: no page of the client's covers these
  const nurses = x.pages.find((p) => p.title === "OET for Nurses");
  assert.deepEqual(nurses.questions.map((q) => q.question), ["oet for nurses", "oet nursing requirements"], "a profession search joins the profession's page — never a country page");
  assert.deepEqual(nurses.claims.map((c) => c.text.slice(0, 26)), ["In the United Kingdom: NMC", "In Ireland: NMBI accepts O"]);
  assert.deepEqual(x.pages.find((p) => p.country === "Pakistan").questions.map((q) => q.question), ["oet pakistan fee"]);
  /* RR-355: a country page holds the owner's five things — the fee, its questions, its centres, its councils, a rule of its own */
  assert.equal(x.pages.find((p) => p.country === "Pakistan").title, "OET in Pakistan: fee, centres and councils");
  /* "OET Exam", "OET Examination", "OET English Test" — one need, one page; "practice test" is already the client's own page */
  const what = x.pages.find((p) => p.title === "What is OET? The test, its fee and the scores asked");
  assert.deepEqual(what.questions.map((q) => q.question), ["oet examination", "oet english test"]);
  assert.deepEqual(x.existing, [{ text: "oet practice test", page: "https://prep.example/practice" }]);
  assert.deepEqual(x.pages.filter((p) => p.kind === "topic").map((p) => p.title), ["What is OET? The test, its fee and the scores asked", "Oet Exam Price".replace("Oet", "OET"), "OET Result"]);
  /* a topic page gets the checked fact that fits it — and two topics never share facts. RR-355 (owner: ONE exchange-rate service, never a
   * bank's rate): "PKR 113,000 at the bank's rate" is on no page; with no fee from OET's own page and no facts of OET's own pages, the
   * price page holds nothing — it is not made, never filled with another page's facts */
  assert.ok(!JSON.stringify(x.pages).includes("113,000"), "a bank's converted amount reached a page");
  assert.deepEqual(x.pages.find((p) => p.title === "OET Exam Price").claims, []);
  assert.ok(x.pages.find((p) => p.title === "OET Result").claims.every((c) => /accepts OET|does not accept/.test(c.text)));
  const ids = x.pages.filter((p) => p.kind === "topic").flatMap((p) => p.claims.map((c) => c.claimId)); assert.equal(new Set(ids).size, ids.length);
  /* the truth rule: an unchecked fact is never on a page */
  assert.ok(!JSON.stringify(x.pages).includes("CNIC"), "an unverified fact reached a page");
  assert.deepEqual(x.skipped.map((s) => s.text), ["recent oet writing questions", "e2 oet", "oet com", "oet official website", "occupationalenglishtest"]);
});

test("RR-354 · 5 · the searches that make no page, the need a search asks, and a card taken from the fact's own text", () => {
  assert.match(skipWhy("recent oet writing questions"), /real exam's own questions/);
  assert.match(skipWhy("e2language oet"), /another company's product/);
  assert.match(skipWhy("oet official website"), /want another website/);
  assert.equal(skipWhy("oet for nurses in ireland"), null);
  assert.equal(needOf("OET Examination", "OET"), needOf("oet english test", "OET"));
  assert.equal(needOf("oet practise test", "OET"), needOf("OET mock test", "OET"));
  assert.equal(needOf("oet register", "OET"), needOf("oet booking", "OET"));
  assert.equal(cardOf("NMBI accepts OET (Nursing): Grade B (350) in three components", "Ireland"), "Ireland — Grade B (350)");
  assert.equal(cardOf("Board accepts OET: minimum B pass (or score of 350) in each", "New Zealand"), "New Zealand — score of 350");
  assert.equal(cardOf("GOC does NOT accept OET.", "United Kingdom"), "United Kingdom — OET not accepted");
  assert.equal(cardOf("AUD 587 for the full OET"), "AUD 587");
  assert.equal(cardOf("Bring your passport."), null, "no number in the fact — no card is typed in");
  /* the facts file's own profession names: hyphens and other names are one profession (7 of the owner's facts reached none) */
  assert.equal(keyOf("regulator:occupational-therapy").profession, "occupational therapy");
  assert.equal(keyOf("regulator:nursing-midwifery").profession, "nursing");
  assert.equal(keyOf("regulator:speech-and-language-therapy").profession, "speech pathology");
  assert.equal(keyOf("regulator:medical-radiation-technology").profession, "radiography");
  assert.equal(factsOfStore({ files: [{ facts: [{ id: "a", key: "regulator:nursing-midwifery", profession: "nursing-midwifery" }] }] })[0].profession, "nursing", "a file added before the fix is read with the fixed name");
  /* AlmiWorld's country facts (the service's shown facts) become checked lines with their page and date — an undated one never */
  const svc = serviceFactsOf({ Kenya: { fee: { value: { line: "KES 65,000 (OET's own page)" }, source: "https://oet.example/kenya", readOn: ON }, centres: { value: { venue: true }, source: "https://oet.example/venues", readOn: "" }, questions: [{ value: { pageable: true, question: "Where can I take OET in Kenya?", answer: "In Nairobi." }, source: "https://oet.example/kenya", readOn: ON }] } });
  /* RR-355: the service's fee LINE is never shown (the page converts the official fee itself, with the one rate service); a question is
   * shown with an OFFICIAL answer only */
  assert.deepEqual(svc.Kenya ?? [], [], "a converted fee line, an undated centre and an answer not marked official reached a page");
  const svc2 = serviceFactsOf({ Kenya: { fee: { value: { official: "AUD 587", line: "AUD 587 — about 65,000 KES" }, source: "https://oet.example/kenya", readOn: ON }, questions: [{ value: { question: "Where can I take OET in Kenya?", answer: "In Nairobi, at a test venue.", answerKind: "official" }, source: "https://oet.example/kenya", readOn: ON, status: "confirmed" }], rules: [{ value: { rule: "Bring your passport (this file says so — the page is blocked by Cloudflare)." }, source: "https://oet.example/rules", readOn: ON, status: "confirmed" }] } });
  assert.deepEqual(svc2.Kenya.map((f) => [f.part, f.text]), [["fee", "OET's own page: the full OET costs AUD 587."], ["rules", "Bring your passport."], ["questions", "In Nairobi, at a test venue."]]);
});

test("RR-354 · 2 + 4 · the drafts: every exam-plan page carries a checked card; a page with no checked fact says why in plain words", () => {
  const site = { ...SITE, pages: [...SITE.pages, { url: "https://prep.example/", title: "Prep | Prep", h1: "Prep", qa: [], facts: ["Prep has 10 full mock tests for every profession."] }], design: {} };
  const x = examPlan({ subject: "OET", professions: ["nursing", "podiatry"], countries: ["United Kingdom", "Pakistan"], facts: FACTS, demand: DEMAND.slice(0, 3), site });
  const out = seoPages({ site, on: `${ON}T00:00:00Z`, pagePlan: x.pages, max: x.pages.length, subject: "OET", cta: { label: "Try free", href: "https://prep.example/signup" } });
  const nurses = out.drafts.find((d) => d.title === "OET for Nurses");
  assert.match(nurses.html, /United Kingdom — B \(350\+\)/, "the card is the fact's own score with its country");
  /* RR-355: the FIVE checks pass here; good to read and the site's look are judged in test/rr355-page-quality-client-look.test.mjs */
  /* RR-356: the five checks A–E (the recipe's own checks — completeness, freshness, duplication — are judged in rr356) */
  assert.equal(nurses.gates.filter((g) => "ABCDE".includes(g.gate)).every((g) => g.pass || g.failing.length === 0), true, JSON.stringify(nurses.gates.filter((g) => !g.pass)));
  /* a page with no checked fact and no answer is never made — the report says so in plain words */
  assert.equal(out.drafts.find((d) => d.title === "OET for Podiatrists"), undefined);
  assert.deepEqual(notMadeOf(out.plan).find((x) => x.title === "OET for Podiatrists"), { title: "OET for Podiatrists", why: "Not made yet — Visibility is still looking for its official answer; once found, it goes onto the page it belongs to — never a thin page of its own." } /* RR-356 R3: never "it cannot be built" */);
  assert.equal(plainWhy({ readyAsDraft: false, gates: [{ pass: false, failing: ["no key-fact card with its source and checked date"] }] }), "This page needs one checked fact — none of the checked facts fits it yet. Visibility adds one as soon as its collectors have it.");
  for (const d of out.drafts) assert.doesNotMatch(d.html.replace(/<script[\s\S]*?<\/script>/g, ""), /\bguarantee/i);
  assert.equal(plainWhy({ readyAsDraft: true }), null);
  assert.match(plainWhy({ readyAsDraft: false, gates: [{ pass: false, failing: ["the title is 71 characters — over the review line of 70"] }] }), /^Its title is a little too long\.$/);
});

test("RR-354 · 1 + 3 · the jobs in the client's words; the report is short, honest and has ONE next step", () => {
  assert.deepEqual(JOBS.map((j) => j.label), ["Create SEO pages", "Fix existing pages", "Get found on Google and Bing", "Social links and posts", "Reports"]);
  assert.deepEqual(Object.values(APPROVAL), ["Show me before publishing", "Publish for me"]);
  const d = (url, ready) => ({ url, title: url, readyAsDraft: ready, gates: ready ? [] : [{ pass: false, failing: ["no key-fact card with its source and checked date"] }] });
  const ten = [...Array(8)].map((_, i) => d(`p${i}`, true)).concat([d("p8", true), d("p9", false)]);
  const pub = jobReport({ drafts: ten, live: ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"], approval: "publish", connected: true });
  assert.equal(pub.headline, "10 pages made, 8 published, 1 needs your OK, 1 needs work — here is why.");
  assert.deepEqual([pub.needOk[0].why, pub.next.label], ["Ready — press Publish.", "Publish all ready"]);
  const notConnected = jobReport({ drafts: ten, live: [], approval: "publish", connected: false });
  assert.match(notConnected.headline, /^10 pages made, 0 published,/, "never 'published' for a page that was not");
  assert.deepEqual([notConnected.needOk[0].why, notConnected.next.action], ["Ready — but your site is not connected yet, so it could not be published.", "publish-settings"]);
  assert.equal(jobReport({ drafts: ten, approval: "review", connected: true }).needOk[0].why, "Ready — it waits for your OK.");
  assert.equal(jobReport({ drafts: [], connected: true }).next.action, "seo-pages");
  assert.match(jobReport({ drafts: ten, blocked: "plan only" }).needOk[0].why, /plan only/);
});

test("RR-354 · 2 · the keyword database's searches are search phrases — never '0' beside 'keyword service on'", () => {
  const f = foundInfo({ site: null, own: [{ text: "oet for nurses", source: "AlmiWorld keyword service", on: ON }], on: `${ON}T00:00:00Z` });
  assert.deepEqual(f.phrases.map((p) => [p.text, p.source]), [["oet for nurses", "AlmiWorld keyword service"]]);
  assert.equal((MAIN.match(/foundInfo\(\{[^\n]*own: ownItemsOf\(id\)/g) ?? []).length, 3, "every place that says what was found counts our own searches");
});

test("RR-354 · THE APP WIRING: the exam plan is made by Create SEO pages and read by every call; the jobs route; the simple screens", () => {
  for (const s of [/* RR-356: let — rebuilt in a repair round */ 'let exam = !handMade && examProduct(s, id) ? buildExamPlan(id) : null;', 'pread(id, "auto-plan.json", null)?.pages', 'if (r[2] === "jobs" && req.method === "POST") {', 'if (r[2] === "pages-view" && req.method === "GET") {',
    "countries: examCountriesOf(id) }", 'json().approved !== true'])
    assert.ok(MAIN.includes(s), s);
  for (const s of ["<h3>What do you want done?</h3>", '<b>Show me before publishing</b>', '<b>Publish for me</b>', 'async function startJobs() {', '<span class="ok-i">✅ ready</span>', '<span class="warn-i">⚠️ needs work</span>',
    '<button class="ghost" id="fixall">Fix all (${nWork})</button>', '<button class="big" id="puball">Publish all ready (${nReady})</button>', '<button class="big" id="ffgo" type="button">Use these facts now — create pages</button>',
    '<button class="big" id="pgnext" type="button">See the pages — publish or fix them</button>', "<summary>More — add Search Console's download file instead</summary>", "<summary>More — for power users</summary>"])
    assert.ok(UI.includes(s), s);
  /* plain English: no internal words on the new screens */
  const shown = (UI.match(/RR-354[\s\S]*?(?=\/\* RR-353 · "Start the ticked jobs")/) ?? [""])[0] + readFileSync(join(REPO, "desktop", "plain-words.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/no key-fact card[^\]]*\]/, "");
  for (const bad of [/key-fact card/i, /\bslug\b/i, /\bcollector\b/i, /\bpayload\b/i, /\bgate\b/i]) assert.doesNotMatch(shown.replace(/\/\*[\s\S]*?\*\//g, ""), bad, String(bad));
  for (const f of ["exam-plan.mjs", "plain-words.mjs"]) assert.ok(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8").includes(`"${f}"`), f);
});
