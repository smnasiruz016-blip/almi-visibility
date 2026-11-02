/**
 * RR-363 · recipe v3.4, R15: the page blueprint from the top pages; summary = fact; answer fits question; the fact corrections. No real search, no real money.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summaryFault, fitCard, wholeFact, answerFitWhy, fitParts } from "../desktop/truth-checks.mjs";
import { blocksOfHtml, blueprintOf, blocksCompared, cleanBlueprint, NOT_BUILT_NOW } from "../desktop/blocks.mjs";
import { subjectFactsOf, oldWording, FACTS_FOR } from "../desktop/subject-facts.mjs";
import { viewsOf, helpDemand } from "../desktop/subject-demand.mjs";
import { examPlan, cardOf, settleLocal, usableFacts } from "../desktop/exam-plan.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { searchPages, readSerp } from "../desktop/serp.mjs";
import { coverageRoutes, searchedLists } from "../desktop/almiseo.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { saveFromApp, ENV_NAMES, ownTopics, almiSeoAnswer } from "../site/almiseo.mjs";
import { runTopPages, pageStructure } from "../site/top-pages.mjs";

const ON = "2026-11-02", NOW = `${ON}T10:00:00.000Z`, SRC = "https://oet.com/test/book-a-test";

test("summary = fact: the owner's two cases, and a short form that keeps everything stays", () => {
  assert.match(summaryFault("United Kingdom — NMC — B (350+)", "NMC accepts OET: Listening, Reading and Speaking B (350+); Writing C+ (300+)."), /also says 300/);
  assert.match(summaryFault("7 days", "OET's own page: bookings for the test on computer close 7 days before the test date."), /which way it runs/);
  assert.equal(summaryFault("L 350 · R 360 · W 350 · S 360", "Tests on/after 23 Apr 2026: Listening 350, Reading 360, Writing 350, Speaking 360."), null);
  assert.equal(summaryFault("AUD 587 — the official fee", "The full test costs AUD 587 — the official fee."), null);
  assert.match(summaryFault("Ireland — B (350)", "In Australia the regulator asks B (350) in each."), /names Ireland/);
  assert.equal(fitCard("7 days", "OET's own page: bookings close 7 days before the test date."), "bookings close 7 days before the test date.", "the whole sentence instead");
  assert.equal(wholeFact("OET's own page: x y."), "X y.", "a card is a sentence: it starts with a capital");
});

test("summary = fact in the plan's own cards: every sub-test stays, or the full sentence is shown", () => {
  const t = "NMC accepts OET (Nursing): minimum B (350+) in Listening, Reading and Speaking; C+ (300+) in Writing.";
  const c = cardOf(t, "United Kingdom"); assert.ok(c.includes("300"), c); assert.ok(c.includes("350"), c);
  assert.ok(cardOf("OET's own page: bookings for the test on paper close 24 days before the test date.").includes("before"));
});

const q1 = "How long does it take to get your results?", q2 = "How do I ask New Zealand nursing Council about a reading-only resit?";
const bodies = [{ names: ["NMC"], country: "United Kingdom" }, { names: ["Ahpra", "AHPRA"], country: "Australia" }];
test("answer fits question: the owner's two cases go; what fits stays", () => {
  assert.ok(answerFitWhy(q1, "OET@Home lets you sit the test from your own computer, with a live invigilator.", { subject: "OET" }));
  assert.equal(answerFitWhy(q1, "Results for the test on computer come in as little as 48 hours.", { subject: "OET" }), null);
  assert.match(answerFitWhy(q2, "The NMC accepts results from two sittings. Ahpra asks the same.", { subject: "OET", bodies }), /New Zealand/);
  assert.equal(answerFitWhy("How much does OET cost in Bangladesh?", "The full test costs AUD 587.", { subject: "OET", loose: true }), null);
  assert.match(answerFitWhy("What score do nurses need?", "Doctors need Listening 350.", { subject: "OET" }), /about/);
  assert.match(answerFitWhy("How is OET Reading scored?", "Writing is scored by two assessors.", { subject: "OET" }), /Reading/);
  assert.match(answerFitWhy("When do results for the test on paper come?", "Results for the test on computer come in 48 hours.", { subject: "OET" }), /paper/);
  assert.match(answerFitWhy("How long is the OET result valid?", "A valid result is what councils ask for.", { subject: "OET" }), /no time/);
});

test("answer fits question: a line that does not fit leaves; a question left with nothing goes, said", () => {
  const claim = (text) => ({ text });
  const { parts, removed, dropped } = fitParts([{ part: "questions0", question: q1, claims: [claim("OET@Home lets you sit it from your own computer."), claim("Results come in as little as 48 hours.")] }, { part: "questions1", question: q2, claims: [claim("The NMC accepts two sittings.")] }, { part: "fee", question: "How much does OET cost?", claims: [claim("A change costs AUD 120.")] }], { subject: "OET", bodies });
  assert.equal(parts.length, 2); assert.equal(parts[0].claims.length, 1); assert.equal(removed.length, 2); assert.deepEqual(dropped, [q2]);
  assert.equal(parts[1].part, "fee", "a part the plan built keeps its lines");
});

const site = { ok: true, origin: "https://client.example.org", readOn: ON, pages: [], robotsTxt: null, sitemapUrls: null };
const page = (o = {}) => ({ kind: "topic", category: "exam", topic: "book", title: "TESTX Booking", questions: [], items: [{ part: "questions0", question: q1, claims: [{ claimId: "a", card: null, text: "Results for the test on computer come in as little as 48 hours.", link: SRC, readOn: ON, source: "s", official: true }] }], links: [], open: [], ledger: [], ...o });
const out = (p, o = {}) => seoPages({ site, on: NOW, pagePlan: [p], max: 1, subject: "TESTX", cta: { label: "Go", href: "https://client.example.org/go" }, ...o }).drafts[0];
const gate = (d, g) => d.gates.find((x) => x.gate === g);

test("a page failing a truth check is never ready: the gates read the page itself", () => {
  const good = out(page()); assert.deepEqual(gate(good, "K").failing, []); assert.deepEqual(gate(good, "L").failing, []);
  const edited = good, u = edited.url; assert.ok(edited.html.includes("as little as 48 hours"));
  const bad = seoPages({ site, on: NOW, pagePlan: [page()], max: 1, subject: "TESTX", cta: { label: "Go", href: "https://client.example.org/go" }, overrides: { [u]: edited.html.split("Results for the test on computer come in as little as 48 hours.").join("OET@Home lets you sit from your own computer.") } }).drafts[0];
  assert.match(gate(bad, "L").failing.join(" "), /is not answered by/); assert.equal(bad.readyAsDraft, false);
  /* the card itself */
  const d = out(page({ items: [{ part: "topic", question: "When do bookings close?", claims: [{ claimId: "c", card: "7 days", text: "Bookings close 7 days before the test date.", link: SRC, readOn: ON, source: "s", official: true }] }] }));
  const cut = seoPages({ site, on: NOW, pagePlan: [page({ items: [{ part: "topic", question: "When do bookings close?", claims: [{ claimId: "c", card: "7 days", text: "Bookings close 7 days before the test date.", link: SRC, readOn: ON, source: "s", official: true }] }] })], max: 1, subject: "TESTX", cta: { label: "Go", href: "https://client.example.org/go" }, overrides: { [d.url]: d.html.replace(/<span class="v">Bookings close 7 days before the test date\.<\/span>/, '<span class="v">7 days</span>') } }).drafts[0];
  assert.match(gate(cut, "K").failing.join(" "), /The card "7 days" changes the fact/, "an edit that shortens a card is caught"); assert.equal(cut.readyAsDraft, false);
  assert.deepEqual(gate(d, "K").failing, []); assert.ok(!/<span class="v">7 days/.test(d.html), "the short form is gone"); assert.ok(d.truth.cards.some((x) => x.card === "7 days"), "said what changed");
});

test("what the truth checks took out is kept with the draft, for the report", () => {
  const d = out(page({ items: [...page().items, { part: "questions1", question: q2, claims: [{ claimId: "z", card: null, text: "The UK's council accepts two sittings for the Reading sub-test.", link: SRC, readOn: ON, source: "s", official: true }] }] }), { bodies });
  assert.ok(d.truth.dropped.includes(q2), JSON.stringify(d.truth)); assert.ok(!d.html.includes("two sittings"));
});

const FULL = `<html><head><title>OET Test Dates 2026 — Book</title></head><body><main><nav class="toc"><a href="#a">a</a></nav><form role="search"><input type="search"></form><h2>Dates</h2><table><tr><th>Test date</th><th>Closes</th></tr><tr><td>1</td><td>2</td></tr></table><ol><li>a</li><li>b</li><li>c</li></ol><details><summary>What ID can I use?</summary>x</details><details><summary>India</summary>y</details><h3>Is it hard?</h3><h2>Tips for test day</h2><h2>Related articles</h2><a class="btn" href="/x">Book</a><div id="comments"></div></main></body></html>`;
const PLAIN = `<html><head><title>Plain</title></head><body><main><h2>One</h2><p>${"word ".repeat(200)}</p></main></body></html>`;

test("the blocks of a top page: structure only, never its text", () => {
  const b = blocksOfHtml(FULL);
  assert.deepEqual([b.search, b.tables, b.steps, b.bar, b.foldouts, b.faqs, b.action, b.related, b.comments, b.year, b.tips], [true, 1, 3, true, 2, 2, true, true, true, true, true]); assert.deepEqual(b.columns, [["Test date", "Closes"]]);
  const p = blocksOfHtml(PLAIN); assert.deepEqual([p.search, p.tables, p.steps, p.foldouts, p.year, p.thin], [false, 0, 0, 0, false, false]);
  assert.equal(blocksOfHtml("<html><body><div id=app></div></body></html>").thin, true, "a page built in the browser says so");
  assert.ok(!JSON.stringify(b).includes("What ID can I use"), "no sentence of the page is kept");
});

test("the blueprint: every block of the #1 page, or of at least two top pages; a block of one lower page is not in it", () => {
  const f = blocksOfHtml(FULL), p = blocksOfHtml(PLAIN), names = (x) => x.blocks.map((b) => b.block);
  assert.ok(names(blueprintOf({ tops: [{ url: "https://a.example/", rank: 1, blocks: f }, { url: "https://b.example/", rank: 2, blocks: p }] })).includes("steps"), "in the #1 page");
  assert.ok(!names(blueprintOf({ tops: [{ url: "https://a.example/", rank: 3, blocks: f }, { url: "https://b.example/", rank: 1, blocks: p }] })).includes("steps"), "in one lower page only");
  const two = blueprintOf({ tops: [{ url: "https://a.example/", rank: 3, blocks: f }, { url: "https://b.example/", rank: 4, blocks: f }], core: { fee: "the fee" }, category: "exam", on: ON });
  assert.ok(names(two).includes("steps")); assert.equal(two.blocks.find((b) => b.block === "steps").why, "2 of 2 top pages"); assert.deepEqual(two.core, ["the fee"]); assert.ok(two.edge.includes("the fee in local money"));
  const c = blocksCompared(two, p); assert.ok(c.missing.includes("steps")); assert.match(c.line, /This page lacks: .*numbered steps/); assert.deepEqual(NOT_BUILT_NOW, ["comments"]); assert.ok(c.notBuiltNow.includes("comments"));
  assert.match(blocksCompared(null, p).line, /No top page could be read/);
});

test("what is stored from another computer is structure: no free text survives", () => {
  const c = cleanBlueprint({ on: ON, read: 2, urls: [{ url: "https://a.example/x", rank: 1, blocks: { ...blocksOfHtml(FULL), text: "A SENTENCE", secret: "x" }, note: "A SENTENCE" }, { url: "javascript:1", blocks: {} }], blocks: [{ block: "steps", why: "x" }, { block: "evil", why: "y" }], text: "A SENTENCE" });
  assert.equal(c.urls.length, 1); assert.ok(!JSON.stringify(c).includes("A SENTENCE")); assert.deepEqual(c.blocks.map((x) => x.block), ["steps"]); assert.equal(cleanBlueprint(null), null);
});

const BOOK = "Test dates Bookings for OET Test on Paper close 24 days before the test date (subject to change). Bookings for OET Test on Computer at a test venue and OET@Home closes 7 days before the test date (11:59PM UTC time). Results for OET Test on Computer are released in as little as 48 hours after all subtests have been completed (Listening, Reading, Writing, and Speaking), with 95% released within 6 calendar days and published no later than the dates mentioned in below table. Results for OET Test on Paper are released in as little as 5 days after the test date for candidates tested in India and the Philippines, and from 13 days after the test date for all other regions.";
const HELP = "be sure to have your Visa or MasterCard and ID ready. Enter your preferred location (i.e., city and country) and click Find a test. OET on Paper at a venue: You'll be directed to register or log into your OET account at: registration.myoet.com/login.jsp Once registered, be sure to complete your payment details within 15 minutes to secure your booking. OET on Computer at a Venue/OET@Home: Book an OET on Computer/OET@Home Test: booking.oet-global.com/ Check your spam folder.";
const pages = [{ ok: true, url: SRC, text: BOOK, checkedOn: ON }, { ok: true, url: "https://support.oet.com/articles/Knowledge/How-do-I-book-OET", text: HELP, checkedOn: ON }, { ok: true, url: "https://oet.com/test/results-and-scoring", text: "OET Test on Paper results can be made available 12 days** after the test date.", checkedOn: ON }, { ok: true, url: "https://oet.com/test/oet-test", text: "Results are typically available within 6 days, and 12 days for the OET Test on Paper.", checkedOn: ON }];

test("Part 3: booking and results as OET's booking page says them; the old 12 days cannot return", () => {
  const f = subjectFactsOf(pages, "OET");
  assert.match(f.bookComputerCloses.text, /close 7 days before the test date \(11:59 ?PM UTC\)/); assert.match(f.bookPaperCloses.text, /close 24 days before/);
  assert.match(f.resultsComputer.text, /as little as 48 hours after all sub-tests/); assert.match(f.results95.text, /95% .* within 6 calendar days/);
  assert.match(f.resultsPaper.text, /from 13 days after the test date/); assert.match(f.resultsIndia.text, /India and the Philippines.*as little as 5 days/);
  assert.equal(f.bookAhead, undefined, "\"How far ahead can I book?\" is gone: bookings CLOSE before the test");
  assert.ok(!JSON.stringify(f).includes("12 days"), "OET's other pages still say 12 days: never read for this");
  assert.equal(oldWording("OET's own page: results for the test on paper can come 12 days after the test date."), true); assert.equal(oldWording("12 days for the OET Test on Paper"), true); assert.equal(oldWording("results for the test on paper come from 13 days"), false); assert.equal(oldWording("a course of 12 days"), false);
  assert.equal(usableFacts([{ verified: true, text: "Results for the test on paper can come 12 days after the test date.", link: SRC, on: ON }]).length, 0, "from any source");
  for (const file of ["desktop/subject-facts.mjs", "desktop/exam-plan.mjs", "desktop/research.mjs", "site/cf-collector.mjs"]) { const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split("\n").filter((l) => !/oldWording|RR-363/.test(l)).join("\n"); assert.ok(!/paper[^\n]{0,80}\b12 days\b/i.test(src), file); assert.ok(!/bookAhead/.test(src), `${file}: bookAhead`); }
  assert.ok(!FACTS_FOR.booking.includes("bookAhead"));
});

test("the booking steps and tips come from the subject's own help article, in our own words", () => {
  const f = subjectFactsOf(pages, "OET");
  assert.match(f.bookFind.text, /Find a test/); assert.match(f.bookPaper.text, /registration\.myoet\.com/); assert.match(f.bookComputer.text, /booking\.oet-global\.com/);
  assert.match(f.tipCard.text, /Visa or MasterCard/); assert.match(f.tipMinutes.text, /15 minutes/); assert.match(f.tipSpam.text, /spam/); assert.equal(f.tipCard.link, pages[1].url);
  assert.deepEqual(subjectFactsOf([{ ...pages[1], text: "Nothing useful." }], "OET"), {}, "a fact the page does not state is absent");
});

const familyFacts = subjectFactsOf(pages, "TESTX");
const plan = () => examPlan({ subject: "TESTX", professions: ["nursing"], countries: ["Ireland", "Egypt"], facts: [{ id: "f", country: "Ireland", part: "fee", verified: true, official: "AUD 500", text: "x costs AUD 500 here.", link: SRC, on: ON }, { id: "f2", country: "Egypt", part: "fee", verified: true, official: "AUD 500", text: "x costs AUD 500 here.", link: SRC, on: ON }], subjectFacts: { ...familyFacts, writingGlance: { claimId: "wg", text: "OET's own page: the Writing sub-test takes 45 minutes in all.", link: SRC, readOn: ON }, changeFee: { claimId: "cf", text: "OET's own page: a change costs AUD 120.", link: SRC, readOn: ON }, scale: { claimId: "sc", text: "OET's own page: the scale runs 0 to 500.", link: SRC, readOn: ON }, remarkFee: { claimId: "rf", text: "OET's own page: a re-mark costs AUD 120.", link: SRC, readOn: ON } }, rates: { date: ON, rates: { EUR: 0.6, EGP: 30 }, short: "Rates", link: "https://r.example" }, demand: [{ text: "testx booking", source: "s", weight: 5 }, { text: "testx exam price", source: "s", weight: 4 }, { text: "testx", source: "s", weight: 3 }], maxCountries: 9 });

test("the family's blocks: a topic bar, a choose box and the official finder, tabs, steps split by option, tips, the official link, fold-outs, a hub", () => {
  const p = plan(), all = seoPages({ site, on: NOW, pagePlan: p.pages, max: p.pages.length, subject: "TESTX", cta: { label: "Try it free", href: "https://client.example.org/go" } }).drafts, book = all.find((d) => /booking/i.test(d.title));
  const h = book.html;
  assert.match(h, /data-topic-bar/); assert.match(h, /data-chooser/); assert.match(h, /Choose your country/); assert.match(h, /Choose your profession/); assert.match(h, /data-finder/);
  assert.match(h, /data-tabs/); assert.match(h, /On paper at a venue/); assert.match(h, /On computer or at home/); assert.match(h, /data-steps/); assert.match(h, /registration\.myoet\.com/); assert.match(h, /booking\.oet-global\.com/);
  assert.match(h, /data-tips/); assert.match(h, /15 minutes/); assert.match(h, /data-official/); assert.match(h, /data-cta/, "the action button");
  const b = blocksOfHtml(h); assert.ok(b.search && b.bar && b.tables >= 2 && b.steps >= 2 && b.foldouts >= 2 && b.action && b.tips, JSON.stringify(b));
  assert.match(all.find((d) => /price/i.test(d.title)).html, /data-foldout/, "many countries inside one page"); assert.match(all.find((d) => /What is/.test(d.title)).html, /data-hub/, "headings that open their own page");
  assert.ok(!/<script(?![^>]*ld\+json)/i.test(h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")), "no script: a page may go on any site");
});

test("the year goes in the title only when the top pages put it there", () => {
  const year = blueprintOf({ tops: [{ url: "https://a/", rank: 1, blocks: blocksOfHtml(FULL) }] });
  const d = out(page({ blueprint: year })); assert.match(/<title[^>]*>([^<]*)/.exec(d.html)[1], /2026/); assert.match(/<h1[^>]*>([^<]*)/.exec(d.html)[1], /2026/); assert.equal(d.title, "TESTX Booking", "its address stays");
  assert.ok(!/2026/.test(/<h1[^>]*>([^<]*)/.exec(out(page()).html)[1]));
  assert.ok(out(page({ blueprint: year })).blocks.line.startsWith("The top pages use:"), "the ledger shows the comparison");
});

test("real demand ranks a page's questions: what most people read comes first", () => {
  assert.equal(viewsOf("How do I see my OET results?", "OET"), 420000); assert.equal(viewsOf("What ID can I use for the OET test?", "OET"), 155000); assert.equal(viewsOf("Is the sky blue?", "OET"), 0); assert.equal(viewsOf("anything", "NoSuchSubject"), 0);
  assert.equal(viewsOf("What does changing a OET booking cost?", "OET"), 0, "sharing the word cost is not saying the same");
  assert.match(helpDemand("OET")[0].source, /420K/); assert.deepEqual(helpDemand("Other"), []);
  /* a country page's own questions: nine asked, eight stand, most-read first */
  const q = (question, i) => ({ id: `q${i}`, country: "Ireland", part: "questions", verified: true, question, text: `In Ireland: answer number ${i} about this.`, link: SRC, on: ON });
  const asked = ["Is parking free at the centre?", "Is there a cafe near the centre?", "Can I bring water?", "Is the centre open on Sunday?", "Is there a lift?", "Can I bring a friend?", "Is there a bus?", "Can I eat there?", "How do I see my OET results?"].map(q);
  const fee = { id: "f", country: "Ireland", part: "fee", verified: true, official: "AUD 500", text: "OET costs AUD 500 here.", link: SRC, on: ON };
  const home = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Ireland"], facts: [fee, ...asked], subjectFacts: subjectFactsOf(pages, "OET"), demand: [], site }).pages.find((x) => x.kind === "country");
  assert.equal(home.items.find((it) => /^questions/.test(it.part)).question, "How do I see my OET results?", "the most-read question is first, not cut as the ninth");
  const topicsOf = (o = {}) => examPlan({ subject: "OET", professions: ["nursing"], countries: ["Ireland"], facts: [], subjectFacts: subjectFactsOf(pages, "OET"), demand: [{ text: "oet schedule", source: "keywords", weight: 8.5 }, { text: "oet booking", source: "keywords", weight: 8.4 }, { text: "oet result", source: "keywords", weight: 2 }, ...helpDemand("OET")], site, ...o }).pages.filter((x) => x.kind === "topic").map((x) => x.title);
  const titles = topicsOf(); assert.match(titles[0], /^OET Result/, titles.join(" | "));
  assert.ok(titles.every((x) => !/See My|Defer|How Much/i.test(x)), `a help-centre row is no page of its own: ${titles.join(" | ")}`); assert.ok(titles.some((x) => /Booking/.test(x)), "and takes no page's place");
  assert.match(readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), /const demand = \[\.\.\.helpDemand\(seedOf\(s\)\),/, "the app feeds them in");
});

const serpAnswer = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "organic", url: "https://www.google.com/goto?url=abc", breadcrumb: "https://oet.com › test › book-a-test", title: "A" }, { type: "organic", url: "https://google.com/goto?url=xyz", title: "No breadcrumb" }, { type: "organic", url: "https://b.example.org/p", title: "B" }] }] }] };
test("a redirect result becomes the page's own address from its breadcrumb; with none it stays unread", () => {
  assert.deepEqual(readSerp(serpAnswer).results.map((r) => [r.url, r.rank]), [["https://oet.com/test/book-a-test", 1], ["https://google.com/goto?url=xyz", 2], ["https://b.example.org/p", 3]]);
});

test("R15 in the run: the blocks of the pages read make the blueprint; the subject's own page is read beside them, said; saved and reused; never bought twice", async () => {
  const ledger = { spent: [], serpCache: {} }, reads = [], calls = { n: 0 }, tops = {}, topCache = { get: (u) => tops[u] ?? null, set: (u, v) => { tops[u] = v; } };
  const p = { title: "One", kind: "topic", category: "exam", questions: [] };
  const go = (x) => searchPages({ pages: [x], ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "TESTX", fetchImpl: async () => { calls.n++; return { json: async () => serpAnswer }; }, readHtml: async (u) => { reads.push(u); return FULL; }, topCache, officialPageOf: () => "https://oet.com/official" });
  await go(p);
  assert.ok(!reads.some((u) => /google/.test(u)), "Google's own links are never opened"); assert.ok(reads.includes("https://oet.com/official")); assert.equal(p.unreadTops, 1);
  assert.equal(p.blueprint.read, 3); assert.equal(p.blueprint.urls.find((u) => u.url === "https://oet.com/official").official, true); assert.ok(p.blueprint.blocks.some((b) => b.block === "steps"));
  const n = reads.length, again = { title: "One", kind: "topic", category: "exam", questions: [] }; await go(again); assert.equal(reads.length, n, "read once a month"); assert.equal(calls.n, 3, "bought once"); assert.equal(again.blueprint.read, 3, "the blocks are kept");
  const old = { "https://x.example/": { on: ON, headings: ["a"] } }; assert.ok(old);
  /* it goes to AlmiSEO Data, and comes back */
  p.coverageRoute = "paid"; const [l] = searchedLists([p], { plan: [] }); assert.equal(l.blueprint.read, 3);
  const seo = seoMemoryStore(), r = await saveFromApp({ seo, subject: "OET", lists: [{ ...l, intent: "OET Booking", on: ON, read: ["https://a.example/"] }], lic: { owner: true, account: "o" }, at: NOW }); assert.equal(r.saved, 1);
  const saved = (await seo.coverage("oet"))[0]; assert.equal(saved.blueprint.read, 3); assert.ok(!JSON.stringify(saved.blueprint).includes("What ID can I use"));
  const page2 = { kind: "topic", title: "OET Booking", questions: [] }; await coverageRoutes({ pages: [page2], file: { plan: [], coverage: [{ intent: "OET Booking", on: ON, coverage: [], second: [], read: [], blueprint: saved.blueprint }] } }); assert.equal(page2.blueprint.read, 3, "reused by every later run");
});

test("the server collector saves the blueprint too; a client never gets it", async () => {
  const seo = seoMemoryStore(), env = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" };
  await seo.putTopic({ ...ownTopics().find((t) => t.id === "visibility"), intents: ["AlmiVisibility pricing"] }, { at: NOW });
  let n = 0; const reader = { requests: () => n, raw: async () => { n++; return FULL; } };
  await runTopPages({ seo, cf: { facts: async () => [] }, env: { ...env, [ENV_NAMES.topPagesUsd]: "50" }, reader, fetchImpl: async () => ({ json: async () => serpAnswer }), now: () => Date.parse(NOW) });
  const c = (await seo.coverage("visibility")).find((x) => x.intent === "AlmiVisibility pricing"); assert.ok(c.blueprint.blocks.some((b) => b.block === "steps"), JSON.stringify(c.blueprint).slice(0, 200));
  assert.equal(typeof pageStructure(FULL).blocks.steps, "number");
  assert.equal(almiSeoAnswer.length >= 0, true);
  const SRC2 = readFileSync(new URL("../site/almiseo.mjs", import.meta.url), "utf8"); assert.match(SRC2, /CLIENT_PARTS = (?:Object\.freeze\()?\["summary", "pages"\]/, "a client's parts are unchanged: no coverage, no blueprint");
});

/* the proof run on the owner's data found these: a truth check is wrong in both directions */
test("summary = fact does not cry wolf: money and exchange rates are not scores (Pakistan, Nepal and Sri Lanka lost their local fee card to it); a list of scores is still read whole", () => {
  const fee = "The full test costs AUD 587 (the official fee). In Pakistan that is about PKR 114,163 — converted with ExchangeRate-API's rate of 2026-11-02 (1 AUD = 194.49 PKR). It is approximate: you pay the official fee in AUD.";
  assert.equal(summaryFault("PKR ≈ 114,163 (AUD 587 official fee · rate from ExchangeRate-API, 2026-11-02 · approximate)", fee), null);
  assert.equal(summaryFault("AUD 587", "The full test costs AUD 587 (1 AUD = 233.59 LKR)."), null);
  assert.match(summaryFault("350", "Alabama asks 340, 320, 350 and 360."), /340, 320, 360|340/, "a score followed by a comma counts");
});
test("answer fits question: a price never answers how hard something is", () => {
  const a = "British Council Pakistan lists IELTS Academic and General Training on computer at PKR 75,600 in Islamabad.";
  assert.match(answerFitWhy("Is OET difficult than IELTS?", a, { subject: "OET" }), /something else/);
  assert.equal(answerFitWhy("Is OET harder than IELTS?", "Most candidates find OET's Writing task harder than IELTS's.", { subject: "OET" }), null);
});
test("the booking page keeps its page when a schedule search asks for the same facts: booking chooses first", () => {
  const titles = [["testx schedule", "testx booking"], ["testx booking", "testx schedule"]].map((texts) => examPlan({ subject: "TESTX", professions: ["nursing"], countries: ["Ireland"], facts: [], subjectFacts: familyFacts, demand: texts.map((text, i) => ({ text, source: "keywords", weight: 100 - i })), site }).pages.filter((x) => x.kind === "topic").map((x) => x.title).join(" | "));
  for (const t of titles) assert.match(t, /booking/i, t);
});

test("summary = fact: a score beside a price: the price is not a lost score", () => {
  assert.equal(summaryFault("B (350+)", "You need B (350+). The test costs AUD 587."), null);
});
test("answer fits question: the other profession's answer leaves; a need the answer never meets leaves", () => {
  assert.match(answerFitWhy("What OET score do nurses need?", "Doctors need 350 in each sub-test.", { subject: "OET" }), /it asks about/);
  assert.match(answerFitWhy("How much does OET cost?", "OET has four sub-tests.", { subject: "OET" }), /something else/);
});
test("the old wording is refused at the door: a page that still says 12 days fills no fact", () => {
  const f = subjectFactsOf([{ ok: true, url: "https://oet.com/test/book-a-test", checkedOn: ON, text: "Results are released from 12 days after the test date for all other regions." }], "OET");
  assert.equal(f.resultsPaper, undefined);
});

test("a topic we can say nothing about takes no page's place among the ten", () => {
  const titles = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Ireland"], facts: [], subjectFacts: subjectFactsOf(pages, "OET"), demand: [{ text: "oet study", source: "keywords", weight: 9 }, { text: "oet booking", source: "keywords", weight: 8 }], site, maxTopics: 1 }).pages.filter((x) => x.kind === "topic").map((x) => x.title);
  assert.ok(titles.some((x) => /Booking/.test(x)), titles.join(" | "));
});

test("one need, one page: every wording of a search stands on the first page", () => {
  const p = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Ireland"], facts: [], subjectFacts: subjectFactsOf(pages, "OET"), demand: ["oet result", "oet result today", "latest oet result", "oet booking"].map((text, i) => ({ text, source: "keywords", weight: 9 - i })), site });
  const titles = p.pages.filter((x) => x.kind === "topic").map((x) => x.title); assert.equal(titles.filter((x) => /Result/.test(x)).length, 1, titles.join(" | "));
  assert.ok(p.pages.find((x) => /^OET Result$/.test(x.title)).questions.some((q) => q.question === "oet result today"), "its search stands on the page");
});
test("Part D at the page: the old 12 days never stands on a page, even from the client's own site", () => {
  const f = fitParts([{ part: "questions0", question: "When do results come?", claims: [{ claimId: "o", text: "Paper-test results can be made available 12 days after the test date.", link: SRC }, { claimId: "n", text: "Results for the test on paper come from 13 days after the test date.", link: SRC }] }], { subject: "OET" });
  assert.deepEqual(f.parts[0].claims.map((c) => c.claimId), ["n"]); assert.match(f.removed[0].why, /old figure/);
  assert.match(answerFitWhy("Anything?", "Paper-test results can be made available 12 days after the test date.", { subject: "OET", loose: true }), /old figure/);
});

test("a topic page's blueprint carries its standard questions", () => {
  const SRCS = readFileSync(new URL("../desktop/serp.mjs", import.meta.url), "utf8"); assert.match(SRCS, /STANDARD\[p\.category \?\? "exam"\]\?\.topic\?\.\[p\.topic\]/);
  assert.deepEqual(blueprintOf({ tops: [], core: { "how to book": "how to book" }, category: "exam", on: ON }).core, ["how to book"]);
});

