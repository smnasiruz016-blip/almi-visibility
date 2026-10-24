/**
 * RR-322 · QUALITY + QUANTITY TOGETHER — the market's methods, done better, and every RR-321 weakness fixed (owner, 2026-10-24, final):
 *   A1 one page per university; the light check (≤ 2 pages of its own site) for those the list names no profession for
 *   A2 a regulator's RIGHT page (a second level, its own search page); a 403 → the client's AI browser list; no confirmed score → WAITING
 *   A3 AED and QAR by their central banks' official pegs; PKR / KES refused → AUD and USD, the official page linked, never a guess
 *   A4 the "who recognises" list refreshed by the client's AI in his browser (client-started, ≤ 30, stops on a captcha)
 *   A5 topic pages may be explained by the client's AI; only hard facts need a source
 *   B  the universe × the three gates (demand 20/60%, ≥ 8 data points, ≤ 75% alike); demand AND opportunity pages; the proof law for AI
 *      text; languages with demand; profession × sub-test; rich content (the answer first, a table, steps, checklist, tip, last updated, CTA)
 *   C  links (≥ 3, ≤ 3 clicks), batches 25 → 50 → 100 → 200, the Monday report, improve before expand, heroes, the 3-month refresh
 * Fixtures are Visibility's own words. No network, no real browser, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtInList } from "../desktop/lists.mjs";
import { recognitionOf } from "../desktop/recognition.mjs";
import { planFromList } from "../desktop/plan-list.mjs";
import { groupQuestions } from "../desktop/page-plan.mjs";
import { sortQuestions } from "../desktop/questions.mjs";
import { fiveFromList } from "../desktop/research5.mjs";
import { runGates, patternDemand, dataPointsOf, alike, contentOf, linkPages, templateCheck, languageOf, languageDemand, subtestFactsOf, batchesOf, GATES, BATCH_SIZES } from "../desktop/pseo.mjs";
import { professionsOnPage, professionsInName, lightCheck } from "../desktop/universities.mjs";
import { readRegulator } from "../desktop/regulator-read.mjs";
import { feeInCurrency, PEGS } from "../desktop/rates.mjs";
import { browserList, browserInstruction, takeBrowserReads, listFromRows, BROWSER } from "../desktop/browser-list.mjs";
import { keepSourcedNumbers } from "../desktop/web-ai.mjs";
import { richPage } from "../desktop/seo-pages.mjs";
import { stateOf, mondayReport, nextBatch, beforeExpand, refreshDue, INDEX_RULE } from "../desktop/indexing.mjs";

const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"), MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
const ON = "2026-10-24";
const PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase()), REC = recognitionOf(builtInList("recognising"), { professions: PROFS }), UNIS = builtInList("universities").items;
const FEE = { ok: true, amount: 587, currency: "AUD", said: "AUD $587", source: { url: "https://oet.example/at-home" }, checkedOn: ON };
const VENUES = { countries: ["Pakistan", "India", "Kenya", "Nepal", "Qatar", "United Kingdom"].map((c) => ({ name: c, source: { url: `https://oet.example/post/${c}`, title: "venue news" }, checkedOn: ON })), home: null, checked: [{ on: ON }] };
const SUBTESTS = { Writing: { subtest: "Writing", link: "https://oet.example/ready/writing", on: ON, minutes: "45", criteria: "six", assessors: "two" }, Listening: { subtest: "Listening", link: "https://oet.example/ready/listening", on: ON, minutes: "40", parts: "Three", questions: "42" }, Reading: { subtest: "Reading", link: "https://oet.example/ready/reading", on: ON, minutes: "60", parts: "Three", questions: "42" }, Speaking: { subtest: "Speaking", link: "https://oet.example/ready/speaking", on: ON, minutes: "20", roleplays: "Two", roleplayMinutes: "5", assessors: "two" } };
const ITEMS = ["oet for nurses in new zealand", "oet writing for nurses", "oet fees", "oet vs ielts", "oet test day", "oet kitni fees hai pakistan mein", "اوئی ٹی کی فیس کتنی ہے", "how long are oet results valid"].map((text) => ({ text, kind: "search", source: "sc" }));
const AI = { topics: { "OET test day: what to bring and expect": { answer: "The fee is set on OET's own page.", points: ["Book early", "Pay in your account", "Keep the receipt", "Check the venue", "Check the date", "Check the mode"], steps: ["Open the booking page"], checklist: ["ID"], tip: "Book early." } } };
const planOf = (extra = {}) => { const sorted = sortQuestions(ITEMS, "OET"), groups = groupQuestions(sorted.kept); return planFromList({ subject: "OET", rec: REC, professions: PROFS, universities: UNIS, venues: VENUES, fee: FEE, rates: null, subtests: SUBTESTS, groups, sorted, items: ITEMS, languages: ["en", "ur"], byCountry: [{ query: "oet for nurses in new zealand", country: "India", impressions: 30 }], reads: {}, on: ON, ai: AI, cta: { label: "Try a free OET practice test", href: "https://x.example/practice" }, subjectPages: { urls: ["https://oet.example/test/book-a-test", "https://oet.example/test/results-and-scoring", "https://oet.example/test/test-day-information"], on: ON }, ...extra }); };

test("ONE SOURCE OF TRUTH (B5 kept): the total is every family's pages; the tables, the five answers and \"why not more\" read the same ledger", () => {
  const p = planOf(), n = p.numbers, T = p.tables;
  assert.equal(n.total, Object.values(p.kinds).flat().length, "the total = the plan's pages");
  /* RR-323: + the practice family */
  const pagesRows = ["regulator", "subtest", "practice", "university", "taking", "topic"].reduce((s, k) => s + T[k].rows.find((r) => r.step === "Pages").n, 0) + T.hub.rows[0].n + T.language.rows.at(-1).n;
  assert.equal(pagesRows, n.total, "the tables' page rows add up to the total");
  assert.equal(n.ready, n.total - n.waiting); assert.equal(n.waiting, n.regulatorWaiting + n.practiceWaiting, "RR-323: a practice page without its sample waits too");
  const five = fiveFromList({ subject: "OET", plan: p, items: ITEMS }), q4 = five.questions.find((x) => x.id === "q4");
  assert.match(q4.answer, new RegExp(`${n.uniPages.toLocaleString("en-US")} university pages, one per university`));
  assert.ok(p.whyNotMore.lines.some((l) => l.includes(`${n.subtestPages} pages`)) && p.whyNotMore.lines.some((l) => l.includes(`${n.sections} combinations too thin`)));
});

test("A1 · ONE page per university; the light check reads its own site's faculties (in their own languages), its name, never a news line or a support role", async () => {
  const p = planOf(), n = p.numbers;
  assert.equal(n.uniGeneric, n.uniHealth - n.uniNamed);
  assert.ok(p.kinds.university.every((x) => x.uni?.name), "a university page is one university (or names each it covers)");
  assert.deepEqual(professionsOnPage({ links: [{ text: "Fakultas Kedokteran Gigi" }, { text: "Tıp Fakültesi" }, { text: "Facultad de Enfermería" }, { text: "Veterinary Technology" }, { text: "Nursing students win an award" }, { text: "Graduate School of Medicine, Dentistry and Health Sciences" }] }).map((x) => x.profession).sort(), ["dentistry", "medicine", "nursing"]);
  assert.deepEqual(professionsInName("Kurdistan University of Medical Sciences"), ["medicine"]);
  /* at most two pages of a site: its home, then the ONE page its menu calls "Faculties" */
  const read = []; const reader = { read: async (u) => { read.push(u); return u === "https://u.example/" ? { ok: true, url: u, title: "Home", text: "", links: [{ href: "https://u.example/faculties", text: "Faculties" }, { href: "https://u.example/news", text: "News" }], checkedOn: ON } : { ok: true, url: u, title: "Faculties", text: "", links: [{ href: "https://u.example/f/nursing", text: "Faculty of Nursing" }, { href: "https://u.example/f/pharm", text: "School of Pharmacy" }], checkedOn: ON }; } };
  const byName = await lightCheck({ u: { name: "Example University of Medical Sciences", page: "https://m.example/" }, reader: { read: async () => { throw new Error("read"); } } });
  assert.deepEqual([byName.state, byName.professions, byName.byName], ["FOUND", ["medicine"], true], "its own name is read first — no request");
  const r = await lightCheck({ u: { name: "Example University", page: "https://u.example/" }, reader });
  assert.deepEqual([r.state, r.professions.sort(), read.length], ["FOUND", ["nursing", "pharmacy"], 2]);
  const p2 = planOf({ light: { [UNIS.find((u) => /Kurdistan University of Medical Sciences/.test(u.name))?.name ?? "x"]: { state: "FOUND", professions: ["medicine"], words: ["Kurdistan University of Medical Sciences"], source: { url: "https://k.example" }, checkedOn: ON } } });
  assert.equal(p2.numbers.uniLightFound, 1); assert.ok(p2.numbers.uniWithFacts === n.uniWithFacts + 1, "a university the light check found becomes a page candidate");
  assert.match(p2.tables.university.rows[3].why, /1 found a profession/);
});

test("A2 · the regulator's RIGHT page: a second level (its \"English language skills\" page, then the family page it links); a 403 → the browser list; no confirmed score → WAITING, never in a batch", async () => {
  const pages = { "https://board.example/": { links: [{ href: "https://board.example/registration-standards", text: "Registration standards" }], text: "Welcome to the board." }, "https://board.example/registration-standards": { links: [{ href: "https://board.example/english-language-skills", text: "English language skills" }], text: "Our standards." }, "https://board.example/english-language-skills": { links: [], text: "English rules. OET is accepted. OET Listening B (350) Reading B (350) Writing B (350) Speaking B (350)." } };
  const reader = { on: ON, read: async (u) => (pages[u] ? { ok: true, url: u, title: "t", checkedOn: ON, ...pages[u] } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }), sitemapOf: async () => ({ ok: false, urls: [] }) };
  const r = await readRegulator({ page: { listId: "b1", body: "Example Board", country: "Australia", professions: ["nursing"], grade: null, website: "https://board.example/" }, subject: "OET", reader });
  assert.equal(r.ok, true); assert.equal(r.url, "https://board.example/english-language-skills");
  const blocked = await readRegulator({ page: { listId: "b2", body: "Blocked Board", country: "United States", professions: ["medicine"], website: "https://blocked.example/" }, subject: "OET", reader: { on: ON, read: async (u) => ({ ok: false, url: u, why: "the page answered 403", checkedOn: ON }), sitemapOf: async () => ({ ok: false, urls: [] }) } });
  assert.deepEqual([blocked.ok, blocked.browser], [false, true], "a 403 goes on the client's AI browser list");
  const p = planOf();
  assert.ok(p.kinds.regulator.every((x) => x.status === "waiting"), "no regulator page is confirmed in this fixture — all wait");
  assert.ok(p.rollout.batchTitles.flat().every((t) => !p.kinds.regulator.some((x) => x.title === t)), "a waiting page is never in a batch");
  assert.equal(p.numbers.regulatorWaiting, p.kinds.regulator.length);
});

test("A3 · AED and QAR by the official peg (its central bank, its source); PKR refused → AUD and USD, the official page linked, on the browser list — never a guessed figure", () => {
  const rates = { on: ON, rba: { date: "2026-10-23", rates: { USD: "0.7006" } }, banks: { PKR: { refused: "the page answered 403" } } };
  const ae = feeInCurrency(FEE, "United Arab Emirates", rates), qa = feeInCurrency(FEE, "Qatar", rates), pk = feeInCurrency(FEE, "Pakistan", rates);
  assert.equal(ae.steps[1].said, PEGS.AED.rate); assert.equal(ae.steps[1].link, PEGS.AED.link); assert.equal(qa.steps[1].said, "3.64");
  assert.match(pk.line, /^AUD 587 ≈ USD 411 \(the RBA rate of 2026-10-23\) — the page answered 403, so no PKR figure is shown yet; the official rate: https:\/\/www\.sbp\.org\.pk\//);
  assert.ok(!/PKR [\d,]+/.test(pk.line), "no rupee figure"); assert.equal(pk.browser.kind, "rate");
});

test("A4 · the browser list: client-started, a notice first, ≤ 30 a day, ≥ 20 s apart; a refused file keeps nothing; OET's list rows → the list's shape", () => {
  const bl = browserList({ regulators: [{ url: "https://ecfmg.example/english", body: "ECFMG", listId: "e1", why: "403" }], rates: [{ url: "https://sbp.example/", label: "SBP", currency: "PKR", why: "403" }], listPage: "https://oet.example/who", listOn: "2026-06-27", formats: [{ family: "topic", query: "oet fees" }] });
  assert.deepEqual(bl.items.map((x) => x.kind), ["oet-list", "rate", "regulator", "format"]);
  const ins = browserInstruction(bl.items); assert.match(ins, /STOP at once/); assert.match(ins, /never sign in/i); assert.doesNotMatch(ins, /\bJSON\b/);
  const good = { source: BROWSER.source, date: ON, startedBy: { who: "CLIENT", record: "I asked it" }, notice: { text: "starting", givenAt: `${ON}T10:00:00Z` }, pages: [{ url: "https://ecfmg.example/english", readAt: `${ON}T10:01:00Z`, text: "OET Listening B ..." }, { url: "https://elsewhere.example/", readAt: `${ON}T10:02:00Z`, text: "x" }] };
  const t = takeBrowserReads(good, bl.items); assert.equal(t.ok, true); assert.equal(t.pages.length, 1); assert.deepEqual(t.notOnList, ["https://elsewhere.example/"]);
  assert.deepEqual(takeBrowserReads({ ...good, startedBy: { who: "AI" } }, bl.items).refusedFor, ["NOT_STARTED_BY_THE_CLIENT"]);
  assert.ok(takeBrowserReads({ ...good, pages: [good.pages[0], { ...good.pages[0], readAt: `${ON}T10:01:05Z` }] }, bl.items).refusedFor.includes("TOO_FAST"));
  assert.ok(takeBrowserReads({ ...good, pages: Array.from({ length: 31 }, (_, i) => ({ url: "https://ecfmg.example/english", readAt: new Date(Date.parse(`${ON}T10:00:00Z`) + i * 60000).toISOString(), text: "x" })) }, bl.items).refusedFor.includes("OVER_THE_DAILY_CAP"));
  const l = listFromRows([{ name: "Example Board (EB)", country: "Ireland", kind: "healthcare regulator", professions: ["Nursing"], listening: "B", reading: "B", writing: "C+", speaking: "B" }, { name: "", country: "x" }], { date: ON, page: "https://oet.example/who" });
  assert.deepEqual([l.items.length, l.items[0].short, l.items[0].grade.writing, l.leftOut.length, l.listOn], [1, "EB", "C+", 1, ON]);
  assert.match(MAIN, /l\.items\.length >= 100/, "a refresh needs the whole list");
});

test("A5 + B3 · a topic page explained by the client's AI passes gate 2; its pointer to the subject's page is no data point; an AI sentence with a number not in the page's facts is DROPPED", () => {
  const p = planOf(), fees = p.kinds.topic.find((x) => x.title === "OET test day: what to bring and expect"); /* a fees question is a section of "Where to take" (RR-321) */
  assert.ok(fees, "the AI-explained topic is a page"); assert.ok(fees.dataPoints.length >= GATES.minData);
  assert.ok(fees.claims.some((c) => c.pointer && /own page about this: \/test\/test-day-information/.test(c.text)), "the topic carries its pointer to the subject's own page");
  assert.ok(!fees.dataPoints.some((d) => /own page about this/.test(d.value)), "the pointer is no data point");
  assert.equal(keepSourcedNumbers("The fee is AUD 587. It rises to AUD 650 next year. Book early.", ["OET costs AUD 587"]), "The fee is AUD 587. Book early.");
});

test("B1 + B2 + C1 · the universe, the three gates per family: demand in 20 samples (60%), ≥ 8 data points, ≤ 75% alike — demand AND opportunity pages built", () => {
  const p = planOf();
  for (const [k, g] of Object.entries(p.gates)) { assert.ok(g.pattern.sample <= GATES.sample); assert.equal(g.pages + g.sections.length + g.merged.length, g.universe + (k === "hub" ? g.pages - g.universe : 0), `${k}: every combination is a page, a section or merged`); }
  assert.equal(p.gates.subtest.universe, 48, "12 professions × 4 sub-tests");
  assert.ok(p.numbers.opportunityPages > 0 && p.numbers.demandPages > 0, "opportunity pages are built too (the owner's 18 Oct rule)");
  const pd = patternDemand(Array.from({ length: 40 }, (_, i) => ({ title: `p${i}`, questions: i % 10 < 7 ? [{ sources: [{ kind: "search" }] }] : [] })));
  assert.deepEqual([pd.sample, pd.proven], [20, true]);
  const half = patternDemand(Array.from({ length: 20 }, (_, i) => ({ title: `h${i}`, questions: i % 2 ? [{ sources: [{ kind: "search" }] }] : [] })));
  assert.deepEqual([half.share, half.proven], [0.5, false], "50% is below the 60% line");
  /* RR-323: 45 keywords that all mean "OET fees" are ONE need — the questions count at most 6 data points; a rich page needs facts too */
  assert.equal(dataPointsOf({ kind: "topic", claims: [], questions: Array.from({ length: 45 }, (_, i) => ({ question: `oet fees ${i}` })) }).length, 6, "the questions count at most 6");
  const thin = { kind: "topic", title: "Thin", claims: [], questions: [{ question: "a" }] }, rich = { kind: "topic", title: "Rich", claims: [1, 2, 3].map((i) => ({ claimId: `f${i}`, text: `fact ${i}`, link: `https://x.example/${i}`, readOn: ON, source: "x" })), questions: Array.from({ length: 9 }, (_, i) => ({ question: `q${i}` })) };
  const F = runGates({ topic: [thin, rich] }, { parentOf: () => "the index" });
  assert.deepEqual([thin.status, rich.status], ["section", "opportunity"]); assert.match(F.topic.sections[0].why, /a section of the index/);
  const a = { kind: "hub", title: "A", rows: Array.from({ length: 10 }, (_, i) => [`r${i}`, "x"]) }, b = { kind: "hub", title: "B", rows: [...a.rows.slice(0, 9), ["other", "y"]] };
  assert.ok(alike(a, b) > 0.75); const G = runGates({ hub: [a, b] }); assert.deepEqual([b.status, G.hub.merged.length], ["merged", 1]);
  /* merged regulators: the kept page names every regulator it covers */
  const merged = Object.values(p.kinds.regulator).filter((x) => x.covers?.length > 1);
  assert.ok(merged.length && merged.every((x) => /: \d+ regulators$/.test(x.title) && x.coverNames.length === x.covers.length));
});

test("B4 · a question's language (Urdu script, Roman Urdu, Arabic, Hindi); pages in a language only where it has demand AND the client chose it; only strong pages", () => {
  assert.deepEqual(["oet kitni fees hai pakistan mein", "اوئی ٹی کی فیس کتنی ہے", "ما هي رسوم اختبار", "ओईटी फीस", "oet fees"].map(languageOf), ["ur", "ur", "ar", "hi", "en"]);
  const d = languageDemand(ITEMS, ["en", "ur"]); assert.deepEqual(d.map((x) => [x.code, x.questions.length, x.chosen]), [["ur", 2, true]]);
  /* RR-323 decision 8 (owner, supersedes RR-322 B4's "at once"): English first — a page is made in another language only after its English
   * page is INDEXED and showing impressions (main.translatableOf: published LIVE, the Monday report's "indexed", impressions > 0) */
  assert.equal(planOf().kinds.language.length, 0, "nothing indexed yet: no page in another language");
  const strong = planOf().kinds; const bases = Object.values(strong).flat().filter((x) => x.status === "demand" && (x.dataPoints?.length ?? 0) >= 12).map((x) => x.title);
  const p = planOf({ translatable: bases }); assert.ok(p.kinds.language.length >= 1 && p.kinds.language.length <= 10, "an indexed English page with impressions: its page in the language people ask in");
  assert.ok(p.kinds.language.every((x) => x.lang === "ur" && bases.includes(x.base)), "only an indexed demand page is made in another language");
  assert.equal(planOf({ languages: ["en"], translatable: bases }).kinds.language.length, 0, "a language the client did not choose: none");
  assert.match(MAIN, /states\[x\.url\] === "indexed" && \(seen\[x\.url\] \?\? 0\) > 0/, "translatable = indexed AND showing impressions");
});

test("B5 · profession × sub-test: the sub-test's own facts and each regulator's grade in it for that profession — every page different", () => {
  assert.deepEqual(subtestFactsOf([{ ok: true, url: "https://oet.example/ready/speaking", checkedOn: ON, title: "Speaking", text: "OET Speaking, at a glance Approximately 20 minutes Two profession-specific roleplays (5 mins each) Marked by two OET assessors" }]).Speaking, { subtest: "Speaking", link: "https://oet.example/ready/speaking", on: ON, minutes: "20", parts: null, questions: null, roleplays: "Two", roleplayMinutes: "5", criteria: null, assessors: "two" });
  const p = planOf(), w = p.kinds.subtest.find((x) => x.title === "OET Writing for nurses");
  assert.ok(w && w.required.length > 5 && w.required.every((r) => /^(A|B|C\+|C)$/.test(r.grade)));
  assert.ok(new Set(p.kinds.subtest.map((x) => JSON.stringify(x.dataPoints.map((d) => d.value)))).size === p.kinds.subtest.length, "no two sub-test pages carry the same data");
});

test("B6 + B7 · every page's content: a 40–60-word answer with a number FIRST, a real table, steps, checklist, tip, last updated, the CTA; titles ≤ 70; the page HTML has them at the top, its schema and its language", () => {
  const p = planOf();
  for (const k of ["regulator", "subtest", "university", "taking"]) for (const x of p.kinds[k].slice(0, 20)) {
    const c = x.content; assert.ok(c.answerWords >= 40 && c.answerWords <= 60 && c.answerHasNumber, `${x.title}: ${c.answerWords} words — ${c.answer}`);
    assert.ok(c.table.length > 1 && c.steps.length >= 3 && c.checklist.length >= 3 && c.tip && c.lastUpdated === ON && c.cta, `${x.title}: content`);
    assert.ok(x.title.length <= 70 || k === "university", `${x.title}: title`);
  }
  assert.equal(contentOf({ kind: "topic", title: "Plain", claims: [], questions: [], ai: { answer: "A plain answer with no figure in it at all." } }, { subject: "OET", on: ON }).answerHasNumber, false, "an answer with no number is never counted as one");
  const b = { title: "OET Writing for nurses", html: '<!doctype html><html lang="en"><head><title>x</title></head><body><main><h1>OET Writing for nurses</h1><p>old</p></main></body></html>' };
  const out = richPage(b, { answers: [{ claimId: "w-min", text: "45 minutes", link: "https://oet.example/ready/writing", readOn: ON, source: "OET's own page" }], content: { answer: "An answer with 45 minutes.", table: [["A", "B"], ["1", "2"]], steps: ["s"], checklist: ["c"], tip: "t", lastUpdated: ON, cta: { label: "Try", href: "https://x/practice" }, lang: "ur", points: ["p"] }, kind: "subtest" }, ON);
  /* the proof: with the AI's 35-word answer the sub-test answer fell to 36 words — one part left out so it stays in 40–60 */
  const ai35 = "This page explains Writing for pharmacists in plain words, with what to check before you book and what candidates often get wrong when they write the letter on the test day itself.";
  const wp = planOf({ ai: { ...AI, subtests: { "Writing|pharmacy": { answer: ai35, points: [], steps: [], checklist: [], tip: "t" } } } }).kinds.subtest.find((x) => x.title === "OET Writing for pharmacists");
  assert.ok(wp.content.answerWords >= 40 && wp.content.answerWords <= 60 && wp.content.answerHasNumber, `${wp.content.answerWords}: ${wp.content.answer}`);
  /* the proof: 20 of 25 drafts failed "a direct answer near the top" — the answer had no source; it now cites the page's first sourced claim */
  assert.match(out.html, /<p class="answer" data-answer data-claim-id="w-min">An answer with 45 minutes\.<\/p><p class="citation">Source: <a href="https:\/\/oet\.example\/ready\/writing"[^>]*>OET's own page<\/a> — read 2026-10-24<\/p>/);
  assert.equal(planOf().kinds.subtest[0].content.lastUpdated, ON, "last updated is a date"); assert.equal(contentOf({ kind: "topic", title: "t", claims: [], questions: [] }, { on: `${ON}T03:53:57.142Z` }).lastUpdated ?? ON, ON);
  assert.ok(out.html.indexOf('data-answer') < out.html.indexOf("<p>old</p>"), "the answer right under the title"); assert.match(out.html, /<table class="key" data-key-table>/); assert.match(out.html, /"@type":"Article"/); assert.match(out.html, /<html lang="ur" dir="rtl"/); assert.match(out.html, /data-last-updated="2026-10-24"/); assert.match(out.html, /data-cta><a href="https:\/\/x\/practice">/);
});

test("C2 · the template read aloud: five pages of a family, and how much of their answer is the same once names and numbers go", () => {
  const p = planOf(), t = p.templates.subtest; assert.equal(t.sample.length, 5); assert.equal(typeof t.fillInTheBlanks, "boolean");
  const same = Array.from({ length: 5 }, (_, i) => ({ title: `t${i}`, content: { answer: `Name${i} asks for B in each sub-test.` } }));
  assert.equal(templateCheck(same).fillInTheBlanks, true, "pages that differ only by a name are fill-in-the-blanks");
});

test("C3 · links (≥ 3, ≤ 3 clicks from home), batches 25 → 50 → 100 → 200, the Monday report, the next-batch rule, improve before expand, heroes, the refresh", () => {
  const p = planOf();
  { const pg = [{ kind: "topic", title: "A", status: "opportunity", links: [] }, { kind: "topic", title: "B", status: "opportunity", links: [] }], idx = { kind: "index", title: "I", status: "opportunity", links: [] };
    const lc = linkPages([...pg, idx], [], pg, idx); assert.ok(lc.fewLinks.includes("A"), `a page with fewer than 3 links is reported: ${JSON.stringify(lc)}`); }
  assert.deepEqual([p.linkCheck.tooDeep.length, p.linkCheck.fewLinks.length], [0, 0], `${p.linkCheck.fewLinks.slice(0, 3)}`);
  assert.deepEqual(p.rollout.batches.slice(0, 4), [25, 50, 100, 200]); assert.deepEqual([...BATCH_SIZES], [25, 50, 100, 200]);
  /* the proof: 11 of the first 25 were the A–Z university guides (100 rows each) — a guide comes after every real answer page */
  const guide = { title: "guide", kind: "hub", status: "opportunity", fixedLinks: true, dataPoints: Array(100).fill({}) }, sub = { title: "sub", kind: "subtest", status: "opportunity", dataPoints: Array(20).fill({}) };
  assert.deepEqual(batchesOf([guide, sub])[0], ["sub", "guide"]);
  const guides = planOf({ universities: UNIS.slice(0, 640) }).kinds.hub.filter((h) => h.fixedLinks).map((h) => h.links.length);
  assert.ok(guides.length && guides.every((n) => n >= 20), `no tail guide of a few universities: ${guides}`);
  assert.match(MAIN, /const canCheck = \(u\) => \(u\.page \|\| professionsInName\(u\.name\)\.length \? 0 : 1\);\n  const todo = [^\n]*\.sort\(\(a, b\) => canCheck\(a\) - canCheck\(b\) \|\|/, "the light check takes a university it can check first");
  assert.deepEqual(batchesOf(Array.from({ length: 30 }, (_, i) => ({ title: `p${i}`, kind: "topic", status: i ? "opportunity" : "demand", dataPoints: [] })))[0][0], "p0", "demand first");
  assert.equal(stateOf({ inspectionResult: { indexStatusResult: { coverageState: "Crawled - currently not indexed" } } }), "crawled-not-indexed");
  assert.equal(stateOf({ inspectionResult: { indexStatusResult: { coverageState: "Submitted and indexed" } } }), "indexed");
  const rep = mondayReport([{ url: "a", inspection: { inspectionResult: { indexStatusResult: { coverageState: "Submitted and indexed" } } } }, { url: "b", inspection: { inspectionResult: { indexStatusResult: { coverageState: "Discovered - currently not indexed" } } } }], { on: ON });
  assert.match(rep.line, /of 2 live pages, Google has indexed 1; crawled but not indexed 0; discovered but not indexed 1/);
  const urls = Array.from({ length: 10 }, (_, i) => `u${i}`), st = (k) => Object.fromEntries(urls.map((u, i) => [u, i < k ? "indexed" : "discovered-not-indexed"]));
  assert.equal(nextBatch({ made: "2026-10-01", urls }, st(8), { on: "2026-10-20" }).allowed, true, "80% within 4 weeks");
  const stop = nextBatch({ made: "2026-09-01", urls }, st(6), { on: "2026-10-20" }); assert.deepEqual([stop.allowed, stop.stop], [false, true]); assert.match(stop.why, /^STOP: 60%/); assert.equal(stop.not.length, 4);
  assert.equal(nextBatch({ made: "2026-10-10", urls }, st(5), { on: "2026-10-20" }).allowed, false, "waits");
  const be = beforeExpand([{ page: "x", clicks: 0, impressions: 900, position: 9 }, { page: "y", clicks: 40, impressions: 1000, position: 22 }, { page: "z", clicks: 1, impressions: 10, position: 40 }], ["x", "y", "w"]);
  assert.equal(be.titles[0].page, "x"); assert.deepEqual(be.enrich.map((e) => e.page), ["w"]); assert.deepEqual(be.heroes.map((h) => h.page), ["y"]);
  assert.equal(refreshDue([{ title: "old", lastChecked: "2026-07-01" }, { title: "new", lastChecked: "2026-10-01" }], { on: ON }).length, 1); assert.equal(INDEX_RULE.refreshDays, 90);
  assert.match(MAIN, /getUTCDay\(\) === 1/, "the Monday report runs each Monday");
});

test("C4 + E · the screen says how Visibility is better than the market; the f19 fixture servers fail with their reason, never a silent file death; the lock stays", () => {
  assert.match(UI, /Better than the market/); assert.match(UI, /finds the data itself/); assert.match(UI, /No ranking promise — a source for every number/);
  assert.match(UI, /Preview six full pages/); assert.match(UI, /Check 60 more/); assert.match(UI, /Your AI, in your own browser/);
  const f19 = readFileSync(new URL("./f19-crawler-bounds.test.mjs", import.meta.url), "utf8");
  assert.match(f19, /F19-FIXTURE: the fixture server on \$\{host\} could not listen/);
  assert.ok(readFileSync(new URL("../tools/harness-lock-guard.mjs", import.meta.url), "utf8").includes("REFUSED — a sabotage harness is running"));
  for (const r of ["count/light", "count/confirm", "count/ai", "count/index", "research/browser"]) assert.ok(MAIN.includes(r.replace("/", "\\/")), `${r} is in the route list`);
});
