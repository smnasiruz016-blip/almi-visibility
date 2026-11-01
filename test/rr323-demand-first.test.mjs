/**
 * RR-323 · DEMAND FIRST from the client's own Keyword Planner file (owner, 24 Oct 2026):
 *   1 pages planned from where people search; regulators and universities stay as OPPORTUNITY pages in later batches
 *   2 the file comes in through the client's own "Search-data files" path (UTF-16, two title lines — both refused before)
 *   3 keywords → clusters of the same meaning → ONE page each, through the RR-322 gates; Google's ranges, never exact numbers
 *   4 profession × sub-test × intent, every sample ORIGINAL, labelled, checked by the licence guard's own code
 *   5 brands and websites set aside; informational searches answered from the subject's own pages (sourced, dated)
 *   6 "near me" → "Where to take", never a local page   7 the first batch by the Keyword Planner range, then Search Console
 *   8 English first   9 the Australian boards are sections of Ahpra's page; the Chinese Medicine Board is never "doctors"
 *  10 a parent body's own page confirms the boards its rule covers   E the launcher reads run.json SHARED (rr305 on the owner's PC)
 * Fixtures are Visibility's own words and invented keywords. No network, no real browser, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtInList } from "../desktop/lists.mjs";
import { recognitionOf, callNames } from "../desktop/recognition.mjs";
import { planFromList } from "../desktop/plan-list.mjs";
import { groupQuestions } from "../desktop/page-plan.mjs";
import { sortQuestions } from "../desktop/questions.mjs";
import { takeSearchFile, searchFileText } from "../desktop/research5.mjs";
import { rangeOf, sumRanges, classify, clusterKeywords } from "../desktop/demand.mjs";
import { subjectFactsOf, SUBJECT_FACT_PAGES } from "../desktop/subject-facts.mjs";
import { checkSample, labelOf, hashesOfPages, formatFaults } from "../desktop/samples.mjs";
import { longestRun, shingleHashes } from "../src/facts/licence-guard.mjs";
import { richPage, seoPages } from "../desktop/seo-pages.mjs";
import { styleOf, contrast } from "../src/page/joined-page.mjs";

const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"), MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), SETUP = readFileSync(new URL("../installer/Setup.cs", import.meta.url), "utf8");
const ON = "2026-10-24", PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase()), REC = recognitionOf(builtInList("recognising"), { professions: PROFS });
/* a Keyword Planner export as the tool writes it: UTF-16 with its mark, two title lines, tab-separated (the keywords are invented) */
const KW = [["oet exam", 50000], ["oet sample test", 5000], ["sample oet exam", 5000], ["oet practice exam", 500], ["oet writing sample for nurses", 5000], ["oet writing test", 500], ["oet case notes for nurses", 500], ["oet listening practice test", 500], ["oet listening sample for nurses", 50],
  ["oet exam fees", 5000], ["fees for oet exam", 500], ["oet booking", 5000], ["oet exam dates", 500], ["oet result", 5000], ["oet results date", 500], ["how long for oet results", 50], ["oet score", 500], ["oet center near me", 500], ["oet coaching near me", 50], ["oet for nurses", 500], ["oet accepted countries", 50],
  ["oet official website", 5000], ["e2 oet", 5000], ["oet login", 500], ["benchmark oet writing", 50], ["english test for nurses", 50], ["oet exam for engineers", 50], ["oet for usmle", 50], ["ahpra oet", 50], ["oet writing tips for nurses", 0]];
const exportBytes = (rows) => { const t = ["Keyword Stats 2026-10-24 at 06_03_20", '"October 1, 2025 - September 30, 2026"', "Keyword\tCurrency\tAvg. monthly searches\tCompetition", ...rows.map(([k, v]) => `${k}\tUSD\t${v}\tLow`)].join("\r\n"); return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, "utf16le")]); };
const items = () => takeSearchFile(searchFileText(exportBytes(KW)), { exportedOn: ON }).phrases;
const regNames = () => REC.regulators.map((r) => ({ key: r.id ?? r.name, title: r.name, names: callNames(r).map((n) => n.toLowerCase()).filter((n) => n.length >= 3) }));
/* the subject's own facts in Visibility's words, as subjectFactsOf makes them */
const F = (key, text, url = "https://oet.example/test/book-a-test") => ({ claimId: `subject-${key}`, fact: key, text, link: url, readOn: ON, source: "OET — its own page", official: true, body: "OET", value: (text.match(/\d+/g) ?? []) });
const FACTS = { bookPaperCloses: F("bookPaperCloses", "OET's own page: bookings for the test on paper close 24 days before the test date."), bookComputerCloses: F("bookComputerCloses", "OET's own page: bookings for the test on computer (at a venue or at home) close 7 days before the test date."), changeFee: F("changeFee", "OET's own page: a change after the booking closing date costs AUD 120."), resultsComputer: F("resultsComputer", "OET's own page: results for the test on computer and at home can come within 48 hours of the last sub-test."), results95: F("results95", "OET's own page: 95% of results are released within 6 calendar days."), resultsPaper: F("resultsPaper", "OET's own page: results for the test on paper can come 12 days after the test date."), resultsIndia: F("resultsIndia", "OET's own page: in India, results for the test on paper can come in as little as 5 days."), resultsPhilippines: F("resultsPhilippines", "OET's own page: in the Philippines, results for the test on paper can come in as little as 6 days."), scale: F("scale", "OET's own page: each sub-test is reported on a scale from 0 to 500, with a letter grade from E to A."), gradeB: F("gradeB", "OET's own page: grade B is a scale score of 350."), bookAhead: F("bookAhead", "OET's own page: the test on computer and at home can be booked up to 7 days before test day."),
  writingWords: { ...F("writingWords", "OET's own page: the Writing task's word range is 180–200 words (no automatic penalty for writing over or under it).", "https://oet.example/ready/writing"), value: ["180", "200"] }, writingMinutes: F("writingMinutes", "OET's own page: after the reading time there are 40 minutes to write the letter, and the case notes can be consulted throughout.", "https://oet.example/ready/writing"), writingGradeB: F("writingGradeB", "OET's own page: grade B in Writing means 2 out of 3 for Purpose and 5 out of 7 for the other criteria.", "https://oet.example/ready/writing"),
  listeningMarks: F("listeningMarks", "OET's own page: Listening Part A is 24 marks, Part B 6 and Part C 12 (42 in all).", "https://oet.example/ready/listening"), listeningB: F("listeningB", "OET's own page: grade B in Listening is typically at least 30 marks.", "https://oet.example/ready/listening"), practiceEvery: F("practiceEvery", "OET's own page recommends one practice test every 2–3 weeks.", "https://oet.example/ready/sample-tests"), speakingRoleplay: F("speakingRoleplay", "OET's own page: a Speaking role-play usually ends at around 5 minutes.", "https://oet.example/ready/speaking"), readingMarks: F("readingMarks", "OET's own page: Reading has 42 marks — Part A 20, Part B 6, Part C 16.", "https://oet.example/ready/reading") };
const SUBTESTS = Object.fromEntries([["Writing", "45"], ["Listening", "40"], ["Reading", "60"], ["Speaking", "20"]].map(([s, m]) => [s, { subtest: s, link: `https://oet.example/ready/${s.toLowerCase()}`, on: ON, minutes: m }]));
const VENUES = { countries: ["India", "Pakistan", "United Kingdom"].map((c) => ({ name: c, source: { url: `https://oet.example/post/${c}` }, checkedOn: ON })), home: null, checked: [{ on: ON }] };
const FEE = { ok: true, amount: 587, currency: "AUD", said: "AUD $587", source: { url: "https://oet.example/test/at-home" }, checkedOn: ON };
const URLS = ["https://oet.example/ready/sample-tests", "https://oet.example/ready/sample-tests/oet-test-on-paper/nursing", "https://oet.example/test/book-a-test"];
const LETTER = Array.from({ length: 19 }, (_, i) => `Sentence ${i} of an invented referral letter for a patient with a wrist fracture.`).join(" ").split(/\s+/).slice(0, 190).join(" ");
const SAMPLE = (by = "AlmiOET") => ({ title: "Practice: a referral", task: "Write a letter to the community nurse.", caseNotes: Array.from({ length: 8 }, (_, i) => `invented note ${i}`), letter: LETTER, label: labelOf(by, "OET") });
const planOf = (extra = {}) => { const its = items(), sorted = sortQuestions(its, "OET", { fullName: "Occupational English Test", regulators: REC.regulators.map(callNames) }); return planFromList({ subject: "OET", rec: REC, professions: PROFS, universities: builtInList("universities").items, venues: VENUES, fee: FEE, subtests: SUBTESTS, groups: groupQuestions(sorted.kept), sorted, items: its, reads: {}, on: ON, languages: ["en"], facts: FACTS, subjectPages: { urls: URLS, on: ON }, cta: { label: "Try a free OET practice test", href: "https://x.example/practice" }, ...extra }); };

test("2 · the client's own export comes in: UTF-16 with its mark and two title lines — read as text, the header is the line whose CELL is Keyword", () => {
  const b = exportBytes(KW);
  assert.equal(b.toString("utf8").includes("Keyword\tCurrency"), false, "read as UTF-8 the export is not readable (the defect)");
  const f = takeSearchFile(searchFileText(b), { exportedOn: ON });
  assert.deepEqual([f.kind, f.phrases.length, f.refused.length], ["Keyword Planner", KW.length, 0]);
  assert.equal(takeSearchFile("Keyword Stats 2026-10-24\nnothing else", { exportedOn: ON }).kind, null, "a title line alone is no header");
  assert.equal(searchFileText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("Keyword,Avg. monthly searches\nx,50")])), "Keyword,Avg. monthly searches\nx,50");
  assert.match(MAIN, /bytes = Buffer\.from\(String\(v\.base64 \?\? ""\), "base64"\), text = searchFileText\(bytes\)/, "the client's upload route decodes by the byte-order mark");
  assert.match(UI, /const fileText = async \(f\) =>/); assert.match(UI, /text: await fileText\(f\)/, "the YouTube search-data file too");
});

test("3 · Google's ranges, never an exact number: 50 is 10–100, 5,000 is 1K–10K; a cluster's demand is the sum of its ranges", () => {
  assert.deepEqual([50, 500, 5000, 50000, 0].map((v) => rangeOf(v).label), ["10–100", "100–1K", "1K–10K", "10K–100K", "0–10"]);
  assert.equal(rangeOf(""), null);
  assert.deepEqual(sumRanges([rangeOf(5000), rangeOf(500), rangeOf(50)]), { low: 1110, high: 11100, label: "1.1K–11.1K" });
});

test("3 + 5 + 6 · keywords → clusters: same meaning ONE cluster; brands, websites and logins set aside; not about the subject set aside; a profession the test does not cover said so; near me → Where to take", () => {
  const c = clusterKeywords(items(), { regulators: regNames(), subject: "OET" }); // RR-359: no default subject — the test's product is OET
  const of = (k) => c.clusters.find((x) => x.keywords.some((y) => y.text === k))?.key ?? null;
  assert.equal(new Set(["oet sample test", "sample oet exam", "oet practice exam"].map(of)).size, 1, "three ways of saying it, one cluster");
  assert.equal(of("oet writing sample for nurses"), of("oet case notes for nurses"), "a writing sample and case notes are one need");
  assert.equal(of("oet listening sample for nurses"), of("oet listening practice test"), "Listening is the same for every profession");
  assert.equal(of("oet exam fees"), of("fees for oet exam")); assert.equal(of("oet center near me"), "where"); assert.equal(of("oet coaching near me"), "where");
  assert.deepEqual(c.setAside.brand.map((x) => x.name).sort(), ["benchmark oet writing", "e2 oet", "oet login", "oet official website"]);
  assert.deepEqual(c.setAside.notAbout.map((x) => x.name), ["english test for nurses"]); assert.match(c.setAside.unclear[0].why, /a profession OET does not test/);
  assert.equal(classify("oet for usmle", { regulators: regNames(), subject: "OET" }).intent, "regulator", "USMLE is ECFMG's rule");
  assert.equal(classify("english occupational test", { subject: "OET" }).cluster, "topic|format", "the name said backwards is still the subject");
  assert.equal(c.kept + c.setAside.brand.length + c.setAside.notAbout.length + c.setAside.unclear.length, KW.length, "every keyword accounted for");
});

test("1 + 7 · demand first: each cluster lands on its ONE page; the first batch by the Keyword Planner range, then Search Console; regulators and universities later as opportunity pages", () => {
  const p = planOf(), n = p.numbers;
  assert.equal(n.kpOnPages, n.kpClusters, "no cluster without its page");
  /* a keyword of the file is on ONE page — never also routed one by one by the older path (sabotage: NOT RED until this) */
  const pagesWith = (k) => Object.values(p.kinds).flat().filter((x) => (x.questions ?? []).some((g) => g.question === k)).length;
  assert.deepEqual(["oet exam fees", "oet booking", "oet result"].map(pagesWith), [1, 1, 1], "each keyword on exactly one page");
  assert.deepEqual([p.linkCheck.tooDeep.length, p.linkCheck.fewLinks.length], [0, 0], `every page within 3 clicks, ≥ 3 links: ${p.linkCheck.tooDeep.slice(0, 3)}`);
  /* the proof found 3 practice pages too deep: the practice hub's links were cut to 9 — it links EVERY practice page (its guide) */
  const hub = p.kinds.practice.find((x) => x.title === "OET practice test: a free sample for every sub-test"), kids = p.kinds.practice.filter((x) => x !== hub);
  assert.ok(kids.length > 9 && kids.every((x) => hub.links.includes(x.title)), `the practice hub links all ${kids.length} practice pages (it links ${hub.links.length})`);
  const firstKinds = p.rollout.firstWhy.slice(0, 5);
  assert.equal(firstKinds[0].title, "What is OET: the four sub-tests, the time and the scores", "the biggest range first");
  const ranges = p.rollout.firstWhy.filter((x) => x.range).map((x) => Object.values(p.kinds).flat().find((y) => y.title === x.title).kp.high);
  assert.deepEqual(ranges, [...ranges].sort((a, b) => b - a), "in the order of the range");
  assert.ok(p.rollout.firstWhy.filter((x) => x.range).every((x) => /Keyword Planner [\d.K–M]+ searches a month \(Google's ranges/.test(x.why)), "each page says its search range");
  assert.ok(!p.rollout.first.some((t) => p.kinds.university.some((u) => u.title === t)), "no university page in the first batch");
  assert.ok(p.kinds.regulator.every((r) => r.status !== "demand" || r.kp), "a regulator page is demand only through its own searches");
  assert.ok(p.tables.demand.rows.some((r) => /set aside: a brand/.test(r.step) && r.left.length === 4));
  /* the proof: "OET Writing" and "OET Writing sample" competed (the site planner made one a section) — a sub-test's searches, ONE page */
  assert.ok(!p.kinds.topic.some((x) => /^OET (Writing|Speaking|Listening|Reading)$/.test(x.title)), "no sub-test topic beside its practice page");
  assert.match(p.demand.clusters.find((c) => c.key === "subtest-info|Writing")?.page ?? "", /^OET Writing sample/, "\"oet writing test\" lands on the Writing practice page");
  assert.match(MAIN, /Not made as a page of its own: \$\{notMade\.join\("; "\)\}/, "a batch page with no draft is named, with the reason");
});

test("5 · the informational pages are answered from the subject's own pages: booking, fees, results — each fact with its page and date, a number in the answer", () => {
  const p = planOf(), t = (re) => p.kinds.topic.find((x) => re.test(x.title));
  const book = t(/^How to book/), fees = t(/exam fees$/), res = t(/results: when/);
  for (const x of [book, fees, res]) { assert.ok(x, `the page exists — topic pages: ${p.kinds.topic.map((y) => y.title).join(" | ")}; sections: ${p.gates.topic.sections.map((s) => `${s.name} (${s.why})`).join(" | ")}`); assert.ok(x.content.answerWords >= 40 && x.content.answerWords <= 60 && x.content.answerHasNumber, `${x.title}: ${x.content.answer}`); assert.ok(x.claims.filter((c) => c.fact).every((c) => c.link && c.readOn === ON)); }
  assert.match(book.content.answer, /24 days before the test date/); assert.match(res.content.answer, /48 hours/); assert.match(fees.content.answer, /AUD \$587/);
  assert.deepEqual(fees.content.table[0], ["Country", "The fee"]); assert.ok(fees.content.table.some((r) => r[0] === "India"));
  /* the extractor: the subject's own pages → our words, its link and date; what a page does not state is absent */
  const pages = [{ ok: true, url: "https://oet.example/test/book-a-test", checkedOn: `${ON}T09:00:00Z`, text: "Test dates Bookings for OET Test on Paper close 30 days before the test date (subject to change)." }];
  const f = subjectFactsOf(pages, "OET"); assert.deepEqual(Object.keys(f), ["bookPaperCloses"]); assert.equal(f.bookPaperCloses.text, "OET's own page: bookings for the test on paper close 30 days before the test date."); assert.equal(f.bookPaperCloses.readOn, ON);
  assert.ok(SUBJECT_FACT_PAGES.test("https://oet.com/test/results-and-scoring") && !SUBJECT_FACT_PAGES.test("https://oet.com/post/news-item"));
  /* the proof: "OET vs IELTS" was in the first batch with no sourced fact card — the subject's own research page lists its benchmarking study */
  const vs = subjectFactsOf([{ ok: true, url: "https://oet.example/about/backed-by-research", checkedOn: ON, text: "Reports (2019, updated May 2021) The Occupational English Test and IELTS: A Benchmarking Report. Other papers." }], "OET");
  assert.equal(vs.benchmarkIelts?.text, "OET's own research page lists a study benchmarking OET against IELTS (2019, updated 2021).");
  assert.ok(SUBJECT_FACT_PAGES.test("https://oet.com/about/backed-by-research"));
});

test("4 · profession × sub-test × intent: a sample page WAITS until its ORIGINAL sample passed the check; then it is a demand page with the sample, labelled first", () => {
  const p = planOf(), w = p.kinds.practice.find((x) => x.title === "OET Writing sample for nurses: case notes and a model letter");
  assert.deepEqual([w.status, /not written yet/.test(w.waitFor)], ["waiting", true]);
  assert.ok(!p.rollout.batchTitles.flat().includes(w.title), "a waiting page is never in a batch");
  const sm = SAMPLE(); sm.check = checkSample(sm, { subtest: "Writing", by: "AlmiOET", subject: "OET", facts: FACTS }); assert.equal(sm.check.ok, true, sm.check.why);
  const p2 = planOf({ ai: { samples: { [w.key ?? "practice|sample|Writing|nursing"]: sm } } }), w2 = p2.kinds.practice.find((x) => x.title === w.title);
  assert.deepEqual([w2.status, w2.waitFor ?? null, w2.sample.label], ["demand", null, "Practice sample written by AlmiOET, not an official OET paper"]);
  assert.ok(p2.rollout.batchTitles.flat().includes(w2.title));
  const bad = { ...SAMPLE(), label: "" }; bad.check = checkSample(bad, { subtest: "Writing", by: "AlmiOET", subject: "OET", facts: FACTS });
  const p3 = planOf({ ai: { samples: { "practice|sample|Writing|nursing": bad } } }), w3 = p3.kinds.practice.find((x) => x.title === w.title); assert.match(w3.waitFor, /did not pass the originality check: the label is missing/);
  assert.equal(w3.sample, null, "a sample that failed its check is never on its page");
  /* the page builder too: a page whose sample failed its check is built WITHOUT it */
  const site = { ok: true, origin: "https://x.test", readOn: ON, robotsTxt: null, sitemapUrls: null, pages: [{ url: "https://x.test/", title: "X", h1: "X", h2: [], qa: [], facts: [] }] };
  const build = (sample) => seoPages({ site, on: `${ON}T10:00:00Z`, subject: "OET", pagePlan: [{ ...w2, sample }] }).drafts[0].html; // one page a call: two pages with the same facts would be one page
  assert.match(build(w2.sample), /data-sample-label/); assert.doesNotMatch(build(bad), /data-sample/);
  assert.ok(p.kinds.practice.every((x) => !/Listening|Reading/.test(x.subtest ?? "") || !x.profession), "Listening and Reading pages are for every profession");
  const html = richPage({ title: w2.title, html: '<!doctype html><html lang="en"><head></head><body><main><h1>x</h1></main></body></html>' }, { content: w2.content, kind: "practice", sample: w2.sample }, ON).html;
  assert.ok(html.indexOf("data-sample-label") < html.indexOf("data-case-notes") && html.indexOf("data-case-notes") < html.indexOf("data-letter"), "the label first, then the case notes, then the letter");
  assert.match(html, /"@type":"LearningResource"/);
});

test("4 · THE CHECK (the licence guard's own code): no run of 8 words shared with a page read or a licence-barred page; no brand; the label; the format from the subject's own page", () => {
  const read = hashesOfPages([{ ok: true, text: "Before you start the task you should read all the notes slowly and plan who the letter is for and why" }]);
  const ok = SAMPLE(); assert.equal(checkSample(ok, { subtest: "Writing", by: "AlmiOET", subject: "OET", read, facts: FACTS }).ok, true);
  assert.deepEqual([checkSample({ ...ok, label: "" }, { subtest: "Writing", by: "AlmiOET", subject: "OET", facts: FACTS }).ok, checkSample({ ...ok, label: "" }, { subtest: "Writing", by: "AlmiOET", subject: "OET", facts: FACTS }).why], [false, "the label is missing"]);
  const copied = { ...ok, task: "Before you start the task you should read all the notes slowly" };
  const r = checkSample(copied, { subtest: "Writing", by: "AlmiOET", subject: "OET", read, facts: FACTS }); assert.deepEqual([r.ok, r.run], [false, 12]); assert.match(r.why, /12 words in a row match a page Visibility read/);
  assert.equal(longestRun(copied.task, read), 12, "the SAME implementation as the RR-288 census");
  const barred = shingleHashes("alpha bravo charlie delta echo foxtrot golf hotel india juliet");
  assert.equal(checkSample({ ...ok, task: "alpha bravo charlie delta echo foxtrot golf hotel india" }, { subtest: "Writing", by: "AlmiOET", subject: "OET", barred, facts: FACTS }).ok, false, "a licence-barred page's passage fails too");
  assert.match(checkSample({ ...ok, task: "As in the Benchmark OET model." }, { subtest: "Writing", by: "AlmiOET", subject: "OET", facts: FACTS }).why, /names "Benchmark OET"/);
  assert.deepEqual(formatFaults({ ...ok, letter: "too short a letter" }, "Writing", FACTS), ["the model letter is 4 words (the subject's own page: 180–200)"]);
  assert.deepEqual(formatFaults({ script: "short", questions: [] }, "Listening", FACTS), ["the script is 1 words (at least 120)", "0 questions, each needs its answer (at least 5)"]);
  assert.match(MAIN, /full\.check = \{ \.\.\.checkSample\(full,/, "every sample the AI writes is checked before it is kept");
  assert.match(MAIN, /pwrite\(id, "subject-shingles\.json",[^\n]*hashes: \[\.\.\.hashesOfPages\(factPages\)\]/, "the pages read are kept as hashes only");
});

test("9 + 10 · the Australian boards are SECTIONS of Ahpra's page and its own page confirms them; the Chinese Medicine Board is never 'doctors'", () => {
  const ah = REC.regulators.find((r) => /\(AHPRA\)|Australian Health Practitioner/.test(r.name));
  const p = planOf({ reads: { [ah.id]: { ok: true, on: ON, url: "https://ahpra.example/english", claims: [{ fact: "scores", claimId: "s-ah", text: "Ahpra names OET on its own page — Listening B · Reading B · Writing B · Speaking B.", link: "https://ahpra.example/english", readOn: ON, source: "its own page", official: true, body: "Ahpra" }] } } });
  const page = p.kinds.regulator.find((x) => /AHPRA/.test(x.title));
  assert.ok(page.boards.length >= 5 && page.content.table[0].join() === "Board,Who,Grades", "Ahpra's page lists its boards");
  assert.ok(!p.kinds.regulator.some((x) => /Board of Australia/.test(x.title)), "no board has a page of its own");
  assert.ok(p.gates.regulator.sections.some((s) => /Board of Australia/.test(s.name) && /AHPRA|Ahpra|Australian Health/.test(s.why)));
  assert.equal(p.numbers.regulatorByParent, page.boards.length, "each board confirmed by Ahpra's own page");
  assert.ok(p.numbers.regulatorConfirmed >= page.boards.length + 1);
  const cm = page.boards.find((b) => /Chinese Medicine/.test(b.body)); assert.ok(cm && !cm.professions.includes("medicine") && !/doctors/.test(cm.title), "Chinese medicine practitioners, never doctors");
  assert.equal(planOf().numbers.regulatorByParent, 0, "an Ahpra page not confirmed confirms no board");
});

test("8 · English first; the screen says the range and the sample's check; E · the launcher reads run.json SHARED and waits for its port (the real cause of rr305 on the owner's PC)", () => {
  assert.equal(planOf().numbers.languagePages, 0);
  assert.match(UI, /searched \$\{j\.range\} a month \(Keyword Planner, Google's ranges\)/); assert.match(UI, /practice sample: \$\{j\.sample\.ok \? `original ✓/);
  assert.match(SETUP, /new FileStream\(path, FileMode\.Open, FileAccess\.Read, FileShare\.ReadWrite \| FileShare\.Delete\)/, "run.json read with sharing");
  assert.match(SETUP, /for \(int i = 0; i < 150 && \(port = PortIn\(runFile\)\) == ""; i\+\+\) Thread\.Sleep\(100\);/, "the launcher waits for a run.json that holds a port");
  assert.ok(!/File\.ReadAllText\([^)]*run/.test(SETUP), "no plain read of run.json is left (it fails while the app is writing it)");
  assert.match(SETUP, /var port = PortIn\(run\);/, "asking the app to quit reads it shared too");
});

test("PROOF · the call to action is readable: its words take the site's ink only where it reads on the button (WCAG 4.5:1); a design that read well is unchanged", () => {
  const css = (colours) => styleOf({ colours }).match(/\.cta\{[^}]*\}/)[0];
  assert.match(css({ primary: "#333333", ink: "#111111" }), /color:#ffffff/, "near-black on dark grey (the proof) → white");
  assert.match(css({ primary: "#f5d90a", ink: "#111111" }), /color:#111111/, "dark ink on yellow already read — unchanged");
  assert.ok(contrast("#ffffff", "#333333") >= 4.5 && contrast("#111111", "#333333") < 4.5);
  assert.match(readFileSync(new URL("../desktop/seo-pages.mjs", import.meta.url), "utf8"), /<p class="cta-row" data-cta><a class="cta" href=/, "the button's class on the LINK (a{color} beat it on the paragraph)");
});
