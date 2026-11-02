/**
 * 🔴 RR-360 · THE APP READS ALMISEO DATA (owner, 1 Nov 2026, ruling R13): the product's OWN subject only; all its keywords (question-type ones become
 * questions), the question groups, the country facts, the collectors' plan merged without duplicates (G8); G5's order (saved · your AI in your
 * browser · your own paid service only if you switched it on), the ledger saying which answered; the AlmiSEO Data page in plain words.
 * The service is a stand-in of the documented answers (site/almiseo.mjs is tested against the real handler in rr360-almiseo-server). No network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { genericPlanPages, syncProduct, heldFor, keywordItems, questionItems, savedListFor, coverageRoutes, routeLine, coverageItems, coverageFromBrowser, reviewLinesFor, almiSeoView, ALMISEO_FILE, ALMISEO_KEYWORDS, ROUTES, KEYWORD_SOURCE, NOT_READ_LINE } from "../desktop/almiseo.mjs";
import { examPlan, serviceFactsOf, PAGE_QUESTIONS } from "../desktop/exam-plan.mjs";
import { browserInstruction, takeBrowserReads } from "../desktop/browser-list.mjs";
import { personOf, rightToExist } from "../desktop/recipe.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), ".."), read = (p) => readFileSync(join(REPO, p), "utf8"), UI = read("desktop/ui.html"), MAIN = read("desktop/main.mjs");
const AT = "2026-11-01T10:00:00.000Z", DAY = "2026-11-01";
const mem = () => { const f = {}; return { f, read: (n, d) => (n in f ? f[n] : d), write: (n, v) => { f[n] = JSON.parse(JSON.stringify(v)); } }; };
const COVER = { intent: "OET in Pakistan", on: "2026-10-30", coverage: [{ topic: "Exam fee", seenOn: 2, urls: ["https://a.example/1"] }], second: [{ question: "Is OET hard?", why: "people also ask it" }], read: ["https://a.example/1"] };
const client = (over = {}) => { const calls = []; const parts = { summary: { ok: true, topic: { id: "oet", name: "AlmiOET", subject: "OET" }, keywords: { total: 3, allowed: true, today: 1, week: 2 }, questions: { answered: 1, asked: 4 }, countries: { waitingReview: 2 }, topPages: { read: 2, on: true }, arrived: { today: 1, week: 5 }, lastRefresh: DAY, review: [] }, questions: { ok: true, groups: [{ country: "Pakistan", question: "How much does OET cost in Pakistan?", answer: "AUD 587.", answerKind: "official", wordings: ["oet fee pakistan"], on: DAY }], asked: [{ source: "owner", text: "can a nurse take oet twice?", on: DAY }] }, plan: { ok: true, counter: 2, pages: [{ kind: "country", country: "Pakistan", title: "OET in Pakistan" }, { kind: "country-profession", country: "Pakistan", profession: "nursing", title: "OET for nursing in Pakistan" }] }, coverage: { ok: true, lists: [COVER] }, ...over };
  return { calls, register: async (b) => { calls.push(["register", b]); return { ok: true }; }, part: async (p, s, page = 0) => { calls.push([p, s, page]); if (p === "keywords") { const k = over.keywords ?? ((n) => ({ ok: true, pages: 2, total: 3, rows: n === 0 ? [{ k: "oet exam", v: 9000, l: 2, d: DAY }, { k: "how much is oet", v: 500, l: 1, d: DAY, q: 1 }] : [{ k: "oet in pakistan", v: 800, l: 1, d: DAY }] })); return k(page); } if (p === "countries") return over.countries ?? { ok: true, pages: 1, countries: { Pakistan: { country: "Pakistan", complete: true, missing: [] }, Kenya: { country: "Kenya", complete: false, missing: ["rules"] } } }; return parts[p]; } }; };

test("A: one read keeps every page of every part, and registers the subject (the collectors start on it)", async () => {
  const m = mem(), c = client(), r = await syncProduct({ client: c, subject: "OET", name: "AlmiOET", intents: ["OET for Nurses"], read: m.read, write: m.write, now: AT });
  assert.equal(r.ok, true); assert.deepEqual([r.counts.keywords, r.counts.questions, r.counts.countries, r.counts.allParts, r.counts.plan, r.counts.coverage], [3, 1, 2, 1, 2, 1]);
  assert.deepEqual(c.calls.find((x) => x[0] === "register")[1].intents, ["OET for Nurses"]);
  assert.equal(c.calls.filter((x) => x[0] === "keywords").length, 2, "every page, not a sample");
  assert.equal(m.f[ALMISEO_KEYWORDS].rows.length, 3); assert.equal(m.f[ALMISEO_FILE].readOn, AT); assert.equal(m.f[ALMISEO_FILE].history[0].keywords, 3);
});
test("A: a failed read keeps the last one, says so; a list cut short never replaces a whole one", async () => {
  const m = mem(); await syncProduct({ client: client(), subject: "OET", read: m.read, write: m.write, now: AT });
  const down = { register: async () => ({ ok: false }), part: async () => ({ ok: false, why: "AlmiSEO Data did not answer" }) };
  const r = await syncProduct({ client: down, subject: "OET", read: m.read, write: m.write, now: "2026-11-02T10:00:00.000Z" });
  assert.equal(r.ok, false); assert.match(r.line, /what it gave on 2026-11-01 is used/); assert.equal(m.f[ALMISEO_FILE].readOn, AT); assert.equal(m.f[ALMISEO_FILE].lastWhy, "AlmiSEO Data did not answer"); assert.equal(m.f[ALMISEO_KEYWORDS].rows.length, 3);
  const cut = client({ keywords: (n) => (n === 0 ? { ok: true, pages: 2, total: 3, rows: [{ k: "only one", v: 1 }] } : { ok: false, why: "the second page failed" }) });
  const r2 = await syncProduct({ client: cut, subject: "OET", read: m.read, write: m.write, now: "2026-11-03T10:00:00.000Z" });
  assert.equal(r2.ok, true); assert.equal(m.f[ALMISEO_KEYWORDS].rows.length, 3, "the whole list stays"); assert.match(m.f[ALMISEO_FILE].partial, /second page failed/); assert.equal(r2.counts.keywords, 3);
});
test("RULING 2: an outside client's read asks for page content only, and keeps nothing else on its computer; its screen says pages only", async () => {
  const m = mem(), calls = [], client = { register: async () => ({ ok: true }), part: async (p) => { calls.push(p); return p === "summary" ? { ok: true, outside: true, subject: "OET", topic: { name: "OET" }, pages: 1 } : p === "pages" ? { ok: true, outside: true, topic: { name: "OET" }, plan: [{ kind: "country", country: "Pakistan", title: "OET in Pakistan" }], countries: { Pakistan: { country: "Pakistan", parts: { fee: [{ source: "https://www.oet.com/x", readOn: DAY, value: { text: "AUD 587." } }] } } } } : { ok: false, why: "refused" }; } };
  const r = await syncProduct({ client, subject: "OET", read: m.read, write: m.write, now: AT });
  assert.deepEqual(calls, ["summary", "pages"], "nothing else is asked"); assert.equal(r.outside, true); assert.equal(r.counts.pages, 1); assert.equal(m.f[ALMISEO_KEYWORDS], undefined);
  const v = almiSeoView(m.f[ALMISEO_FILE], { subject: "OET", nowDay: DAY }); assert.equal(v.state, "PAGES"); assert.equal(v.pages, 1); assert.match(v.line, /1 page ready to make for OET/);
  assert.deepEqual(Object.keys(v).sort(), ["line", "pages", "readOn", "state", "subject"], "no count of keywords, questions, coverage or top pages");
  assert.deepEqual(genericPlanPages({ file: m.f[ALMISEO_FILE], subject: "OET" }).pages.map((p) => p.title), ["OET in Pakistan"]);
  assert.match(MAIN, /const outsideClient = \(\) =>/); assert.match(MAIN, /r\[2\] === "keywords\/service" && req\.method === "POST" && outsideClient\(\)\) return send\(403/);
  assert.match(UI, /K\.service\.outside \? "" : `<h4>AlmiWorld keyword service/, "its keyword panel is not shown");
});
test("RR-359 stays: another subject's file is never read", async () => {
  const m = mem(); await syncProduct({ client: client(), subject: "OET", read: m.read, write: m.write, now: AT });
  assert.equal(heldFor(m.f[ALMISEO_FILE], "almiworld youtube"), null); assert.ok(heldFor(m.f[ALMISEO_FILE], "oet"));
  assert.deepEqual(keywordItems(m.f[ALMISEO_KEYWORDS], "almiworld youtube"), []); assert.deepEqual(questionItems(m.f[ALMISEO_FILE], "almiworld youtube"), []);
  assert.equal(almiSeoView(m.f[ALMISEO_FILE], { subject: "almiworld youtube" }).state, "NOT_READ");
});
test("A: question-type keywords become questions; the groups' wordings are questions too; never a fact", async () => {
  const m = mem(); await syncProduct({ client: client(), subject: "OET", read: m.read, write: m.write, now: AT });
  const k = keywordItems(m.f[ALMISEO_KEYWORDS], "OET");
  assert.equal(k.length, 3); assert.equal(k.find((x) => x.text === "how much is oet").kind, "question"); assert.equal(k.find((x) => x.text === "oet exam").kind, "search"); assert.equal(k[0].source, KEYWORD_SOURCE); assert.ok(k[0].weight > k[1].weight);
  const q = questionItems(m.f[ALMISEO_FILE], "OET");
  assert.deepEqual(q.map((x) => x.text), ["How much does OET cost in Pakistan?", "oet fee pakistan", "can a nurse take oet twice?"]); assert.match(q[0].source, /question bank/);
});
const FACTS = [
  { id: "f1", country: "Pakistan", part: "home-council", profession: "nursing", text: "Pakistan Nursing Council registers nurses in Pakistan.", link: "https://pnc.org.pk", on: DAY, verified: true },
  { id: "f2", country: "Pakistan", part: "fee", text: "OET's own page: the full OET costs AUD 587.", official: "AUD 587", link: "https://www.oet.com/x", on: DAY, verified: true },
  { id: "f3", country: "Pakistan", part: "questions", question: "Can a nurse take OET twice?", text: "OET's own page says a candidate may sit again.", link: "https://www.oet.com/y", on: DAY, verified: true },
  { id: "f4", country: "Kenya", part: "questions", question: "Can a nurse take OET twice?", text: "OET's own page says a candidate may sit again.", link: "https://www.oet.com/y", on: DAY, verified: true },
  { id: "f5", country: "Pakistan", part: "centres", text: "OET can be taken at a test venue in Pakistan.", link: "https://www.oet.com/z", on: DAY, verified: true },
];
const RATES = { date: DAY, rates: { PKR: 180 }, short: "ExchangeRate-API", link: "https://www.exchangerate-api.com" };
test("G8: the collectors' plan merged without duplicates: a country joins the country pages once; one question from two countries is ONE page; a row with no checked answer makes no page, said", () => {
  const collector = [{ kind: "country", country: "Pakistan", title: "OET in Pakistan" }, { kind: "country", country: "Kenya", title: "OET in Kenya" }, { kind: "country-profession", country: "Pakistan", profession: "nursing", title: "OET for nursing in Pakistan" }, { kind: "country-profession", country: "Pakistan", profession: "dentistry", title: "OET for dentistry in Pakistan" }, { kind: "question", country: "Pakistan", question: "Can a nurse take OET twice?", title: "Can a nurse take OET twice?" }, { kind: "question", country: "Kenya", question: "Can a nurse take OET twice?", title: "Can a nurse take OET twice?" }, { kind: "question", country: "Kenya", question: "A question with no answer here?", title: "A question with no answer here?" }];
  const x = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Pakistan"], facts: FACTS, rates: RATES, collector, maxCountries: 200 });
  assert.deepEqual(x.pages.filter((p) => p.kind === "country").map((p) => p.country), ["Pakistan", "Kenya"], "Pakistan once");
  /* RR-362 (R3): a row with no council is not a page; one with its council but no good-standing rule, questions or destinations is merged; a question stands on its country page */
  assert.equal(x.pages.filter((p) => p.kind === "origin-profession" || p.kind === "destination-profession").length, 0);
  assert.equal(x.merged.find((m) => m.title === "OET for Nurses from Pakistan").type, "D");
  assert.equal(x.pages.filter((p) => p.kind === "question").length, 0, "one answer is thin");
  assert.deepEqual(x.merged.find((m) => m.title === "OET for Dentists from Pakistan").missing[0], "their home council");
  assert.ok(x.merged.some((m) => m.type === "question"));
  assert.equal(new Set(x.pages.map((p) => p.title)).size, x.pages.length, "no two pages with one title");
});
test("G8: a page the client already has for that country and profession is improved, never a second one", () => {
  const collector = [{ kind: "country-profession", country: "Pakistan", profession: "nursing", title: "x" }];
  const x = examPlan({ subject: "OET", professions: [], countries: ["Pakistan"], facts: FACTS, rates: RATES, collector, site: { origin: "https://s.example", pages: [{ url: "https://s.example/oet-nurses-pakistan", title: "OET for nurses in Pakistan", h1: "OET for nurses in Pakistan" }] } });
  assert.deepEqual(x.pages.filter((p) => p.improve).map((p) => [p.kind, p.improve.url]), [["country", "https://s.example/oet-nurses-pakistan"]], "one entry per existing page: the bigger one (RR-362 item 16)");
});
test("A: every country AlmiSEO Data names is planned — the old limit of 10 is the default only; a page's ledger keeps the most searched and counts them all", () => {
  const many = Array.from({ length: 16 }, (_, i) => `Country${i}`), x = examPlan({ subject: "OET", countries: [], facts: [], collector: many.map((c) => ({ kind: "country", country: c, title: c })) });
  assert.equal(x.pages.filter((p) => p.kind === "country").length, 16);
  const demand = Array.from({ length: PAGE_QUESTIONS + 500 }, (_, i) => ({ text: `oet for nurses word${i}`, source: KEYWORD_SOURCE, weight: 1000 - i })), y = examPlan({ subject: "OET", professions: ["nursing"], demand });
  const page = y.pages.find((p) => p.kind === "profession");
  assert.equal(page.questions.length, PAGE_QUESTIONS); assert.equal(page.asked, PAGE_QUESTIONS + 500); assert.equal(page.questions[0].question, "oet for nurses word0");
});
test("D: G5's order per intent: saved → the client's own AI in the browser → the client's paid service only if switched on; the ledger says which", async () => {
  const file = { plan: [{ kind: "country", country: "Pakistan", title: "OET in Pakistan" }], coverage: [COVER] };
  const pages = () => [{ kind: "country", country: "Pakistan", title: "OET in Pakistan: fee, centres and councils" }, { kind: "profession", profession: "nursing", title: "OET for Nurses" }, { kind: "topic", title: "OET Reading" }];
  const browser = { "OET for Nurses": { on: DAY, coverage: [{ topic: "Scores" }], second: [], read: ["https://b.example/1"] } };
  /* switched off (the default): nothing is bought */
  let paidCalls = 0; const paid = async (left) => { paidCalls++; for (const p of left) { p.topRead = ["https://c.example"]; p.coverage = [{ topic: "T" }]; } return { on: true, searches: left.length, cost: 0.006, line: "paid" }; };
  const off = pages(), r = await coverageRoutes({ pages: off, file, browser, paidOn: false, paid });
  assert.deepEqual(off.map((p) => p.coverageRoute), [ROUTES.saved, ROUTES.browser, ROUTES.none]); assert.deepEqual(r.counts, { saved: 1, browser: 1, paid: 0, none: 1 }); assert.equal(paidCalls, 0, "the paid service is never called while it is off");
  assert.deepEqual(off[0].coverage, COVER.coverage); assert.equal(off[0].coverageOn, "2026-10-30"); assert.match(r.line, /1 saved in AlmiSEO Data, 1 from your own AI in your own browser, 0 from your own paid service, 1 not read yet/);
  /* switched on: only what the free routes left */
  const on = pages(), r2 = await coverageRoutes({ pages: on, file, browser, paidOn: true, paid });
  assert.equal(paidCalls, 1); assert.deepEqual(on.map((p) => p.coverageRoute), [ROUTES.saved, ROUTES.browser, ROUTES.paid]); assert.equal(r2.counts.paid, 1); assert.equal(r2.paid.searches, 1, "one search, not three");
  assert.match(routeLine(on[0]), /AlmiSEO Data's saved list/); assert.match(routeLine(on[1]), /your own AI, in your own browser/); assert.match(routeLine(on[2]), /your own paid service, which you switched on/); assert.equal(routeLine({ coverageRoute: ROUTES.none }), NOT_READ_LINE);
  assert.ok(!/DataForSEO/.test(NOT_READ_LINE), "the client is never sent to buy anything");
});
test("D: a saved list goes only to its own intent", () => {
  const file = { plan: [{ kind: "country", country: "Pakistan", title: "OET in Pakistan" }, { kind: "country", country: "India", title: "OET in India" }], coverage: [{ ...COVER }] };
  assert.equal(savedListFor({ kind: "country", country: "India", title: "OET in India: fee, centres and councils" }, file), null);
  assert.equal(savedListFor({ kind: "country", country: "Pakistan", title: "OET in Pakistan: fee, centres and councils" }, file).intent, "OET in Pakistan");
  assert.equal(savedListFor({ kind: "topic", title: "OET Reading" }, file), null);
});
test("D: the browser route: the instruction asks addresses and headings only; a page's words in the file are never kept; the same refusals (client-started, notice, cap)", () => {
  const pages = [{ title: "OET for Nurses", coverageRoute: ROUTES.none }, { title: "Done", coverageRoute: ROUTES.saved }], items = coverageItems(pages);
  assert.equal(items.length, 1); assert.equal(items[0].url, "https://www.google.com/search?q=OET%20for%20Nurses");
  const ins = browserInstruction(items); assert.match(ins, /COVER https:\/\/www\.google\.com/); assert.match(ins, /Do NOT copy any sentence/); assert.match(ins, /captcha/i);
  const hand = { source: "CLIENT_AI_BROWSER_READ", date: DAY, startedBy: { who: "CLIENT", record: "me" }, notice: { text: "starting", givenAt: AT }, pages: [{ url: items[0].url, readAt: AT, text: "A WHOLE COPIED PAGE", rows: [{ url: "https://a.example/1", headings: ["Exam fee", "Leave a Reply", "Scores and grades"], text: "THEIR SENTENCE" }, { url: "https://b.example/2", headings: ["Fees", "Scores"] }, { url: "https://www.reddit.com/r/x", headings: ["Nope"] }], paa: ["Is OET hard?"] }] };
  const t = takeBrowserReads(hand, items); assert.equal(t.ok, true);
  const got = coverageFromBrowser(t.pages, { subject: "OET", now: AT })["OET for Nurses"];
  assert.equal(got.on, DAY); assert.deepEqual(got.read, ["https://a.example/1", "https://b.example/2"]);
  assert.ok(!JSON.stringify(got).includes("COPIED") && !JSON.stringify(got).includes("THEIR SENTENCE") && !JSON.stringify(got).includes("Leave a Reply"));
  assert.ok(got.coverage.some((c) => /fee/i.test(c.topic)));
  assert.equal(takeBrowserReads({ ...hand, startedBy: { who: "AI" } }, items).ok, false);
});
test("G5 for a page outside an exam plan: its answered coverage goes into completeness; a changed official fact holds the page (a real draft, never a hollow pass)", () => {
  const site = { ok: true, origin: "https://s.example", start: "https://s.example", readOn: DAY, pages: [{ url: "https://s.example/", title: "Shop", h1: "Shop", h2: [], lead: [], qa: [], facts: [] }], design: {}, shell: null };
  const claim = { claimId: "c1", card: "KES 15,000", text: "The minimum wage is KES 15,000 a month, the government's page says.", link: "https://gov.example/x", readOn: DAY, source: "gov.example", official: true };
  const pagePlan = [{ kind: "country-facts", country: "Kenya", title: "Salary in Kenya", questions: [], items: [{ part: "minimumWage", question: "What is the minimum wage in Kenya?", claims: [claim] }], claims: [claim], links: [], lastChecked: DAY, weak: true, content: null, open: [], ledger: [] }];
  const base = { site, on: AT, subject: "salary", pagePlan, max: 1, official: {} };
  const clean = seoPages(base); assert.equal(clean.drafts.length, 1, "the fixture makes a draft");
  const named = (o, re) => seoPages({ ...base, ...o }).drafts[0].gates.some((g) => g.failing?.some((x) => re.test(x)));
  assert.equal(named({}, /zzzqqq|official page changed/), false);
  assert.ok(seoPages({ ...base, coverageFor: (x) => (x === "Salary in Kenya" ? { coverage: [{ topic: "What is the zzzqqq waiting period?", from: "people also ask", paa: true }], second: [] } : null) }).drafts[0].suggestions.some((s) => /zzzqqq/.test(s)), "RR-362: a coverage topic it does not cover is a suggestion");
  assert.ok(named({ reviewFor: (m) => (m.country === "Kenya" ? ['Review needed — the official page changed (fee): was "A", now "B".'] : []) }, /official page changed/), "the changed fact is named");
  assert.equal(seoPages({ ...base, reviewFor: () => ["Review needed — the official page changed (fee)."] }).drafts[0].readyAsDraft, false, "it does not pass");
});
test("FOUND ON THE OWNER'S DATA: a coverage topic about another place stays off this page; one second-search question once; a planned country page says only its own checked facts", async () => {
  const { cleanCoverage } = await import("../desktop/coverage.mjs"), { COUNTRIES } = await import("../desktop/world.mjs"), { secondSearch } = await import("../desktop/recipe.mjs");
  const paa = ["What is the current OET exam fee in India?", "Is OET hard?"], base = { results: [], paa, subject: "OET", now: AT, names: COUNTRIES };
  assert.deepEqual(cleanCoverage({ ...base, title: "OET in New Zealand" }).map((c) => c.topic), ["Is OET hard?"]);
  assert.equal(cleanCoverage({ ...base, title: "OET in India" }).length, 2, "on India's own page it stays");
  const second = secondSearch({ best: { title: "x", headings: [], text: "" }, paa: ["Is OET hard?"], coverage: [{ topic: "Is OET hard?", seenOn: 2 }], subject: "OET", title: "OET Reading" });
  assert.equal(second.length, 1);
  const x = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Pakistan"], facts: [...FACTS, { id: "s1", country: "Pakistan", part: "councils", profession: "nursing", text: "PNC. Accepts OET. Grade B.", link: "https://pnc.org.pk/a", on: DAY, verified: true }, { id: "s2", country: "Pakistan", part: "councils", profession: "nursing", text: "PNC Board. Accepts OET. Grade B.", link: "https://pnc.org.pk/b", on: DAY, verified: true }], rates: RATES, collector: [{ kind: "country-profession", country: "Pakistan", profession: "nursing", title: "t" }] });
  assert.equal(x.bigger.countryPages[0].items.find((i) => i.part === "scores").claims.length, 1, "one standard, said once: on the country page");
  assert.match(read("desktop/seo-pages.mjs"), /p\.kind === KIND\.destination \|\| p\.kind === KIND\.origin \|\| p\.kind === "question" \? \[\] : asks/);
});
test("REVIEW: a changed fact holds its own country's pages only", () => {
  const file = { review: [{ text: "Pakistan: fee|Pakistan", kind: "fee", was: "AUD 587", now: "AUD 620", link: "https://www.oet.com/x", on: DAY }] };
  assert.equal(reviewLinesFor({ country: "Pakistan" }, file).length, 1); assert.match(reviewLinesFor({ country: "Pakistan" }, file)[0], /was "AUD 587", now "AUD 620"/);
  assert.equal(reviewLinesFor({ country: "India" }, file).length, 0);
});
test("E: the page's numbers are only what was measured; what arrived, last read; a number not known says so; no plan and no subject are said plainly", async () => {
  const m = mem(); await syncProduct({ client: client(), subject: "OET", read: m.read, write: m.write, now: AT });
  const v = almiSeoView(m.f[ALMISEO_FILE], { subject: "OET", nowDay: DAY });
  assert.equal(v.state, "READ"); assert.equal(v.keywords.count, 3); assert.equal(v.questions.groups, 1); assert.equal(v.countries.held, 2); assert.equal(v.countries.allParts, 1); assert.deepEqual(v.countries.list, ["Pakistan"]); assert.equal(v.countries.waitingReview, 2); assert.equal(v.topPages.read, 2); assert.equal(v.plan.pages, 2); assert.equal(v.arrived.week.keywords, 2); assert.equal(v.readOn, AT); assert.equal(v.lastRefresh, DAY);
  assert.match(v.line, /3 keywords · 1 question groups · 2 countries \(1 with all their parts\) · 2 planned pages/);
  assert.equal(almiSeoView({ subject: "OET", readOn: AT, topic: { name: "x" }, counts: {} }, { subject: "OET" }).questions.answered, null, "not known, never 0");
  assert.equal(almiSeoView(null, { subject: "OET", planOk: false }).state, "NO_PLAN"); assert.equal(almiSeoView(null, { subject: null }).state, "NO_SUBJECT");
});
test("E + A3: the screen is in the product's menu and on the Overview; sync on start and on a schedule; never a word sending the client to buy", () => {
  assert.match(UI, /id="astab">Data<\/button>/); assert.match(UI, /\$\("#astab"\)\.onclick = almiSeoScreen/); assert.match(UI, /\$\{asCardHtml\(O\.almiseo\)\}/);
  assert.match(UI, /you need no other service/); assert.match(UI, /Last read:/); assert.match(UI, /What arrived/);
  assert.match(MAIN, /setTimeout\(\(\) => \{ syncAll\(\); setInterval\(syncAll, SYNC\.everyHours \* 3600e3\)/);
  assert.match(MAIN, /r\[2\] === "almiseo" && req\.method === "GET"/); assert.match(MAIN, /r\[2\] === "almiseo\/sync"/); assert.match(MAIN, /r\[2\] === "almiseo\/browser" && req\.method === "POST"/);
});
test("the build ships the new module (a whitelist: a file not on it is missing from Setup)", () => {
  assert.match(read("desktop/build.mjs"), /"almiseo\.mjs"/);
  assert.match(read("desktop/main.mjs"), /from "\.\/almiseo\.mjs"/);
});
test("G0/G9 for the two new kinds of page: its person and its reason", () => {
  assert.match(personOf({ kind: "destination-profession", profession: "nursing", country: "Australia" }, { subject: "OET" }).person, /wants to work in Australia/); assert.match(personOf({ kind: "origin-profession", profession: "nursing", country: "Pakistan" }, { subject: "OET" }).person, /from Pakistan/);
  assert.match(personOf({ kind: "question", title: "Can I?", country: "Pakistan" }, { subject: "OET" }).goal, /sourced answer/);
  assert.match(rightToExist({ page: { kind: "origin-profession", profession: "nursing", country: "Pakistan" }, questions: [], answered: 2 }).why, /what nurses from Pakistan need before they go/);
});
test("serviceFactsOf reads a whole packet from AlmiSEO Data as before", () => {
  const packets = { Pakistan: { fee: { value: { official: "AUD 587" }, source: "https://www.oet.com/x", readOn: DAY, status: "confirmed" }, councils: { nursing: { value: { name: "PNC" }, source: "https://pnc.org.pk", readOn: DAY, status: "confirmed", found: true } } } };
  const f = serviceFactsOf(packets, "OET").Pakistan;
  assert.ok(f.some((x) => x.part === "fee") && f.some((x) => x.part === "home-council" && x.profession === "nursing"));
});

test("THE APP, for real: reads AlmiSEO Data by itself on start for its own subject; a run uses it; nothing is bought; the page says when it was read; another product stays apart", async () => {
  const { productStore } = await import("../desktop/products.mjs"), { makeOwnerLicence } = await import("../services/licence/service.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr360-app-")), st = productStore(dir), SITE = "https://fixture.invalid";
  st.setCompany({ name: "Fixture Co", site: SITE, logoFile: null });
  const make = (name, subject) => { const a = st.create({ name, site: SITE.replace("fixture", name.replace(/\W/g, "")) }), s = st.read(a.id); s.started = true; s.setup.product = { name, site: s.product.site, what: "A fixture.", subject, cta: { label: "Try it", href: `${SITE}/signup` } }; st.write(a.id, s);
    const pd = join(dir, "products", a.id); writeFileSync(join(pd, "check.json"), JSON.stringify({ on: AT, score: 50, areas: [], pagesRead: 1 })); writeFileSync(join(pd, "site-read.json"), JSON.stringify({ ok: true, origin: s.product.site, start: s.product.site, on: AT, readOn: AT, pages: [{ url: `${s.product.site}/`, title: name, h1: name, h2: [], qa: [], facts: [], lead: [], prices: [], text: name }], shell: { header: "<header data-site-shell>x</header>", footer: "<footer data-site-shell>x</footer>", head: "" } })); return a.id; };
  const pet = make("PetCo", "Pet Insurance"), other = make("ShoeCo", "Running Shoes");
  const asked = [], paid = [];
  const answers = (part, subject) => subject !== "Pet Insurance" ? { ok: true, subject, topic: null, line: "AlmiSEO Data holds nothing about it yet." } : ({
    summary: { ok: true, topic: { id: "c-pet", name: "PetCo", subject }, keywords: { total: 2, allowed: true, today: 2, week: 2 }, questions: { answered: 0, asked: 1 }, countries: { waitingReview: 0 }, topPages: { read: 0, on: false }, arrived: { today: 0, week: 0 }, lastRefresh: DAY, review: [] },
    keywords: { ok: true, total: 2, pages: 1, rows: [{ k: "pet insurance cost", v: 900, l: 1, d: DAY }, { k: "how much is pet insurance", v: 400, l: 1, d: DAY, q: 1 }] },
    questions: { ok: true, groups: [], asked: [{ source: "owner", text: "does pet insurance cover vet visits?", on: DAY }] }, countries: { ok: true, pages: 1, countries: { Pakistan: { country: "Pakistan", complete: true, missing: [], parts: { rules: [{ value: { text: "Pet cover is sold only by licensed insurers, the regulator says, for 12 months at a time." }, source: "https://secp.gov.pk/rules", readOn: DAY, status: "confirmed" }], questions: [{ value: { question: "Is pet insurance worth it in Pakistan?", answer: "The regulator's page says cover is optional for 12 months.", answerKind: "official" }, source: "https://secp.gov.pk/p", readOn: DAY, status: "confirmed" }] } } } }, plan: { ok: true, counter: 2, pages: [{ kind: "country", country: "Pakistan", title: "Pet Insurance in Pakistan" }, { kind: "question", country: "Pakistan", question: "Is pet insurance worth it in Pakistan?", title: "Is pet insurance worth it in Pakistan?" }] }, coverage: { ok: true, lists: [{ intent: "Pet Insurance in Pakistan", on: DAY, coverage: [{ topic: "What does it cover?", seenOn: 2, urls: [] }], second: [], read: ["https://a.example/1"] }] } })[part];
  const srv = createServer((q, r) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => { const u = new URL(q.url, "http://x"); r.setHeader("content-type", "application/json"); if (u.pathname === "/paid") { paid.push(b); return r.end("{}"); } if (u.pathname === "/v1/almiseo/topic") { asked.push(["topic", JSON.parse(b).subject]); return r.end(JSON.stringify({ ok: true, started: true })); } if (u.pathname === "/v1/almiseo") { asked.push([u.searchParams.get("part"), u.searchParams.get("subject")]); return r.end(JSON.stringify({ ...answers(u.searchParams.get("part"), u.searchParams.get("subject")) })); } r.statusCode = 404; r.end("{}"); }); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${srv.address().port}/`, kp = generateKeyPairSync("ed25519"); writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: url, keywordServiceUrl: url, updateChannelUrl: url, tourSeen: true, almiSeoFirstMs: 50, weeklyFirstMs: 864e5, serpTestUrl: `${url}paid`, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }) }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    const f = (id, n) => join(dir, "products", id, n);
    for (let i = 0; i < 150 && !(existsSync(join(dir, "run.json")) && existsSync(f(pet, ALMISEO_KEYWORDS))); i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok(existsSync(f(pet, ALMISEO_KEYWORDS)), "read by itself on start");
    const held = JSON.parse(readFileSync(f(pet, ALMISEO_KEYWORDS), "utf8")); assert.equal(held.rows.length, 2);
    assert.ok(asked.some(([a, b]) => a === "topic" && b === "Pet Insurance"), "the collectors were told to start on its subject");
    assert.ok(!asked.some(([a, b]) => a === "keywords" && b !== "Pet Insurance"), "never another subject's keywords");
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`, call = async (u, o) => { const r = await fetch(root + u, o ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) } : {}); return { ...(await r.json()), http: r.status }; };
    const v = await call(`/api/products/${pet}/almiseo`); assert.equal(v.view.state, "READ"); assert.equal(v.view.keywords.count, 2); assert.ok(v.view.readOn);
    const ov = await call(`/api/products/${pet}/overview`); assert.match(ov.almiseo.line, /AlmiSEO Data for Pet Insurance: 2 keywords/);
    for (let i = 0; i < 50 && !existsSync(f(other, ALMISEO_FILE)); i++) await new Promise((r) => setTimeout(r, 100));
    const o2 = await call(`/api/products/${other}/almiseo`); assert.equal(o2.view.state, "EMPTY"); assert.match(o2.view.line, /holds nothing/);
    const run = await call(`/api/products/${pet}/do`, { what: "create-pages" }); assert.equal(run.http, 200, JSON.stringify(run));
    const pages = JSON.parse(readFileSync(f(pet, "pages.json"), "utf8"));
    assert.ok(pages.drafts.length >= 1, "a client with AlmiSEO Data only makes pages"); assert.ok(pages.sources.some((l) => /AlmiSEO Data: 2 keywords/.test(l)), JSON.stringify(pages.sources));
    assert.deepEqual(pages.serp.routes, { saved: 1, browser: 0, paid: 0, none: 1 }, "G5 ran for a product of any kind"); assert.equal(paid.length, 0, "not one paid search");
    assert.equal(pages.drafts.length, 2, JSON.stringify(pages.drafts.map((d) => d.title)));
    const dc = pages.drafts.find((d) => d.title === "Pet Insurance in Pakistan"), dq = pages.drafts.find((d) => d.title !== dc?.title);
    assert.equal(dc.recipe.serp.route, "saved"); assert.match(dc.recipe.serp.line, /AlmiSEO Data's saved list/); assert.equal(dq.recipe.serp.route, "none"); assert.match(dq.recipe.serp.line, /your own AI read Google's results in your own browser/);
    assert.match(dq.html, /secp\.gov\.pk/, "its answer stands with its official page");
    assert.ok(pages.drafts[0].recipe.almiseo.keywords === 2);
    const b = await call(`/api/products/${pet}/almiseo/browser`); assert.equal(b.http, 200);
  } finally { p.kill(); srv.close(); try { rmSync(dir, { recursive: true, force: true }); } catch { /* the process lets go a moment later */ } }
});

test("B: pages from AlmiSEO Data for a product of any kind: each answer with its page and day; a guidance answer or a row with no checked answer makes no page, said", () => {
  const f = (value, source = "https://gov.example/x") => ({ value, source, readOn: DAY, status: "confirmed" });
  const file = { countries: { Kenya: { parts: { minimumWage: [f({ text: "The minimum wage is KES 15,000 a month." })], tax: [f({ name: "Kenya Revenue Authority", website: "https://kra.go.ke" })], questions: [f({ question: "Is Q official or not?", answer: "An official answer.", answerKind: "official" }), f({ question: "Q guidance?", answer: "General guidance.", answerKind: "guidance" })] } }, Peru: { parts: { tax: [{ value: { name: "No source" }, source: "not a link", readOn: DAY }] } } },
    plan: [{ kind: "country", country: "Kenya", title: "Salary in Kenya" }, { kind: "country", country: "Peru", title: "Salary in Peru" }, { kind: "question", country: "Kenya", question: "Is Q official or not?", title: "Is Q official or not?" }, { kind: "question", country: "Kenya", question: "Q guidance?", title: "Q guidance?" }, { kind: "question", country: "Kenya", question: "Is Q official or not?", title: "Is Q official or not?" }] };
  const x = genericPlanPages({ file, subject: "Salary" });
  assert.deepEqual(x.pages.map((p) => p.title), ["Salary in Kenya", "Is Q official or not?"], "no duplicate");
  assert.deepEqual(x.notBuilt.map((n) => n.title), ["Salary in Peru", "Q guidance?"]);
  const k = x.pages[0]; assert.deepEqual(k.items.map((i) => i.part), ["minimumWage", "tax", "questions0"]);
  assert.equal(k.items[0].claims[0].card, "KES 15,000"); assert.equal(k.items[0].claims[0].link, "https://gov.example/x"); assert.equal(k.items[0].claims[0].readOn, DAY); assert.match(k.items[1].claims[0].text, /Kenya Revenue Authority — https:\/\/kra\.go\.ke/);
});
