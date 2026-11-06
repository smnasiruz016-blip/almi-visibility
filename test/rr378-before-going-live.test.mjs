/**
 * 🔴 RR-378 (owner, 6 Nov 2026, after his run on 1.15.35 and beta-g's read of the preview): the last fixes before AlmiOET's pages go live.
 * Free work never stops at the AI's limit; a page that needs more answers stays out of Google until it has them; an old news article is no
 * source for today; a question tied to a fixed day stands only when its answer shows that day still to come; HCPC's OET line says only what
 * its OET section says; a related link fits its page. Every paid call is a stand-in; nothing here leaves this computer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findAll, applyFound, foundSummary, keyOf, newsAgeWhy, isNews, recheckNews, heldMayStand, SOURCE_RULE } from "../desktop/answer-finder.mjs";
import { WITHDRAWN, applyWithdrawn, holdsWithdrawn } from "../desktop/withdrawn.mjs";
import { datesOf } from "../desktop/official.mjs";
import { datedQuestionWhy, dropEmptyAnswers } from "../desktop/empty-answers.mjs";
import { factsOfStore, unfixedText, FACT_FIXES } from "../desktop/facts-file.mjs";
import { linkFitsPage } from "../desktop/seo-pages.mjs";
import { asPublished, THIN_MARK, THIN_ROBOTS } from "../src/page/one-builder.mjs";
import { pageRow } from "../desktop/plain-words.mjs";
import { pageFaults, setFaults, visibleQa, faqData } from "../desktop/page-law.mjs";
import { withoutNotes } from "../desktop/empty-answers.mjs";
import { confirmAnswer, CONFIRM_SYSTEM, findOne, officialNumbersOf } from "../desktop/answer-finder.mjs";
import { readFileSync } from "node:fs";

const ON = "2026-11-06", IRAN_Q = "How do nurses register in Iran?";
const row = (question, extra = {}) => ({ key: keyOf(question), part: "questions", question, cls: "truth", pages: ["P"], country: null, link: null, body: null, ...extra });

test("FREE FIRST: at the AI's limit our own council data still answers EVERY question it can; only the paid steps stop", async () => {
  /* the owner's run: the search stopped at the limit after 32 questions, so council data answered 4, not 78. The paid question stands FIRST here */
  const paid = row("What is the OET fee in Kenya?", { link: "https://example.org/fees/kenya" }), who = [row("How do nurses register in Ghana?"), row("How do pharmacists register in Nigeria?")];
  const own = (r) => (/Ghana|Nigeria/.test(r.question) ? { ok: true, answer: `${r.question.includes("Ghana") ? "Nurses in Ghana" : "Pharmacists in Nigeria"} register with the council.`, quotes: [], url: "https://council.example/registers", name: "The council", official: true } : null);
  const reads = [], kept = {};
  const out = await findAll([paid, ...who], { kept, today: ON, side: 1, ownData: own, allowed: () => false /* the limit is reached */, read: async (u) => { reads.push(u); return { ok: true, url: u, title: "OET fee in Kenya", text: "The OET fee in Kenya is USD 455 for the four parts." }; }, key: "stand-in" });
  assert.equal(out.stopped, "cap", "the paid step stopped at the limit");
  for (const r of who) { assert.equal(kept[r.key]?.ok, true, r.question); assert.equal(kept[r.key].route, "o"); }
  assert.equal(out.free, 2);
  assert.equal(kept[paid.key], undefined, "the paid question is not marked looked-for: it waits for the next run");
  /* the opposite: no AI connected — the free step runs, and nothing is read for a paid step */
  const kept2 = {}, reads2 = [];
  const out2 = await findAll([paid, ...who], { kept: kept2, today: ON, ownData: own, freeOnly: true, read: async (u) => { reads2.push(u); return null; } });
  assert.equal(out2.free, 2); assert.equal(reads2.length, 0); assert.equal(Object.keys(kept2).length, 2);
});

test("THE 167: Google's results already in hand are not \"waiting for Google's queue\"; they wait for the AI", () => {
  const rows = [row("Q one?"), row("Q two?")], kept = { [rows[0].key]: { ok: false, again: true, question: "Q one?" }, [rows[1].key]: { ok: false, again: true, question: "Q two?" } };
  assert.equal(foundSummary(kept, rows).waiting, 2, "without the ledger's word, as before");
  const s = foundSummary(kept, rows, { inHand: (q) => q === "Q one?" });
  assert.equal(s.waiting, 1); assert.equal(s.notTried, 1);
});

test("OLD NEWS: a news article more than two years old is no source for today, unless its own page says it is current", () => {
  const tt = "https://www.tehrantimes.com/news/419429/Iran-sets-up-RN-program-for-nurses-nursing-students";
  assert.equal(isNews(tt), true); assert.equal(isNews("https://www.nmc.org.uk/registration/joining-the-register/"), false); assert.equal(isNews("https://blog.example/a", "news"), true);
  assert.match(newsAgeWhy({ url: tt, page: { dates: { published: "2018-01-07" } } }, ON), /2018-01-07, more than 2 years old/);
  assert.equal(newsAgeWhy({ url: tt, page: { dates: { published: "2018-01-07", modified: "2026-03-01" } } }, ON), null, "its own page updated within two years: it stands");
  assert.equal(newsAgeWhy({ url: tt, page: { dates: { published: "2026-08-20" } } }, ON), null, "a recent article stands");
  assert.match(newsAgeWhy({ url: tt, words: "All nurses are required to hold the license by the end of the plan (2021)." }, ON), /about 2021/, "no date on the page: the years it speaks of");
  assert.match(newsAgeWhy({ url: tt, words: "no year here" }, ON), /date could not be read/, "a news page that cannot show it is current does not stand");
  assert.equal(newsAgeWhy({ url: "https://www.ahpc.gov.sg/registers/", words: "since 2011" }, ON), null, "not news: the rule does not apply");
});

test("OLD NEWS: kept answers are read again on their own page; an old one leaves and is looked for again; a held one is not taken back", async () => {
  const kept = {
    [keyOf(IRAN_Q)]: { ok: true, route: "w", kind: "news", question: IRAN_Q, answer: "Nurses in Iran register through the registered nurse (RN) program.", quotes: ["by the end of the sixth five year development plan (2021)"], url: "https://www.tehrantimes.com/news/419429/x" },
    [keyOf("Who registers dentists in New Zealand?")]: { ok: true, route: "o", kind: "official", question: "Who registers dentists in New Zealand?", answer: "Dentists in New Zealand register with Dental Council of New Zealand.", url: "https://dcnz.org.nz/x" },
  };
  const read = async (u) => ({ ok: true, url: u, title: "T", text: "x", dates: { published: "2018-01-07", modified: null } });
  const out = await recheckNews(kept, { read, today: ON });
  assert.equal(out.length, 1); assert.equal(out[0].question, IRAN_Q);
  assert.equal(kept[keyOf(IRAN_Q)].ok, false); assert.equal(kept[keyOf(IRAN_Q)].later, true, "looked for again on the next run"); assert.equal(kept[keyOf(IRAN_Q)].rule, SOURCE_RULE);
  assert.equal(kept[keyOf("Who registers dentists in New Zealand?")].ok, true, "an official answer is not touched");
  assert.equal(heldMayStand("k", { ok: true, question: "q", answer: "a", url: "https://www.tehrantimes.com/news/1/x", rule: SOURCE_RULE }), false, "the store's copy of a news answer is not taken back unread");
  assert.equal(heldMayStand("k", { ok: true, question: "q", answer: "a", url: "https://dcnz.org.nz/x", rule: SOURCE_RULE }), true);
});

test("TEHRAN TIMES: withdrawn on beta-g's word, everywhere; a page still holding it is never ready", () => {
  const w = WITHDRAWN[keyOf(IRAN_Q)]; assert.ok(w, "listed");
  const kept = { [keyOf(IRAN_Q)]: { ok: true, question: IRAN_Q, answer: "Nurses in Iran register through the registered nurse (RN) program: all nurses must pass a state-administered examination.", url: "https://www.tehrantimes.com/news/419429/x" } };
  assert.equal(applyWithdrawn(kept, { today: ON, rule: SOURCE_RULE }).length, 1); assert.equal(kept[keyOf(IRAN_Q)].ok, false);
  assert.equal(holdsWithdrawn("<p>Nurses in Iran register through the registered nurse (RN) program: all nurses…</p>"), true);
  assert.equal(holdsWithdrawn("<p>Nurses in Iran register with the Iran Nursing Organization.</p>"), false);
});

test("A PAGE'S DATES: read from its own head", () => {
  assert.deepEqual(datesOf('<head><meta property="article:published_time" content="2018-01-07T10:00:00Z"><meta property="article:modified_time" content="2019-02-01T00:00:00Z"></head>'), { published: "2018-01-07", modified: "2019-02-01" });
  assert.deepEqual(datesOf('<script type="application/ld+json">{"datePublished":"2024-05-02","dateModified":"2026-01-03"}</script>'), { published: "2024-05-02", modified: "2026-01-03" });
  assert.deepEqual(datesOf("<p>no date</p>"), { published: null, modified: null });
});

test("THE SOURCE ONCE: an answer never repeats its source; the link under it names it", () => {
  const q = "How do nurses register in Oman?", plan = { pages: [{ title: "P", items: [{ part: "questions0", question: q, claims: [{ text: "Oman's official page, checked 2026-11-04, does not say this." }] }] }] };
  const kept = { [keyOf(q)]: { ok: true, official: false, route: "w", answer: "Nurses in Oman register with the Oman Nursing body. (Source: Times of Oman.)", name: "Times of Oman", url: "https://example.org/x", on: ON } };
  assert.equal(applyFound(plan, kept), 1);
  const c = plan.pages[0].items[0].claims[0];
  assert.equal(c.text, "Nurses in Oman register with the Oman Nursing body.", "no \"(Source: …)\" inside the answer");
  assert.match(c.source, /^Times of Oman — its own page$/, "named once, by its link");
});

test("A FIXED DAY: \"Should I book my test for 13 May?\" stands only when its answer shows that day still to come", () => {
  const q = "Should I book my test for 13 May?";
  assert.match(datedQuestionWhy(q, "Whether 13 May works depends on the booking closing date for that date on OET's test dates page.", ON), /one fixed day/);
  assert.equal(datedQuestionWhy(q, "The test on 13 May 2027 is open for booking until 19 April 2027.", ON), null, "the answer shows the day, still to come");
  assert.match(datedQuestionWhy(q, "The test on 13 May 2026 was the last paper test.", ON), /one fixed day/, "that day is past");
  assert.match(datedQuestionWhy("What changed in OET in 2024?", "", ON), /2024, a year now past/);
  assert.equal(datedQuestionWhy("What changes in OET in 2027?", "", ON), null);
  assert.equal(datedQuestionWhy("How much does OET cost in Pakistan?", "", ON), null, "no date: not touched");
  const plan = { pages: [{ title: "OET for Nurses from Pakistan", items: [{ part: "questions0", question: q, claims: [{ text: "Whether 13 May works depends on the booking closing date.", link: "https://oet.com/test/book-a-test" }] }, { part: "fee", question: "How much is OET?", claims: [{ text: "OET costs AUD 587 for all four parts.", link: "https://oet.com/x" }] }] }] };
  const rows = dropEmptyAnswers(plan, { today: ON });
  assert.deepEqual(plan.pages[0].items.map((it) => it.question), ["How much is OET?"]);
  assert.equal(rows[0].dropped[0].dated, true);
});

test("HCPC: its OET line says only what its OET section says (computer or paper), not the IELTS / TOEFL test-centre rule", () => {
  const link = "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/";
  const store = { files: [{ facts: [{ id: "a", key: "regulator:physiotherapy", country: "United Kingdom", text: "HCPC accepts OET Physiotherapy at a test centre (not at home): 1400 total with no element below 300.", link, verified: true, on: "2026-10-31" }, { id: "b", key: "regulator:pharmacy", country: "United Kingdom", text: "GPhC accepts Pharmacy OET at a test centre (not at home): grade B.", link: "https://assets.pharmacyregulation.org/x.pdf", verified: true, on: "2026-10-31" }] }] };
  const [a, b] = factsOfStore(store);
  assert.equal(a.text, "HCPC accepts OET Physiotherapy, on computer or on paper: 1400 total with no element below 300.");
  assert.doesNotMatch(a.text, /test centre|home/);
  assert.equal(b.text, "GPhC accepts Pharmacy OET at a test centre (not at home): grade B.", "another body's page is not touched");
  assert.equal(unfixedText(`In the United Kingdom: ${a.text}`), "In the United Kingdom: HCPC accepts OET Physiotherapy at a test centre (not at home): 1400 total with no element below 300.", "its judge's verdict is found again (no AI spent at the limit)");
  assert.equal(FACT_FIXES[0].quote, "We accept both the OET Test on Computer and the OET Test on Paper");
});

test("RELATED LINKS fit the page: never another country's guide on a country page; never another profession", () => {
  const iran = { country: "Iran", profession: "nursing", kind: "origin" };
  assert.equal(linkFitsPage(iran, "OET Pakistan 2026: Fees in PKR, Dates, Exam Center &amp; Booking for Nurses", null), false, "beta-g's case");
  assert.equal(linkFitsPage(iran, "OET in Iran: fee, centres and councils", { country: "Iran", kind: "country" }), true, "the same country");
  assert.equal(linkFitsPage(iran, "OET for Nurses", { profession: "nursing", kind: "profession" }), true, "the same profession");
  assert.equal(linkFitsPage(iran, "OET for Nurses from Jordan", { country: "Jordan", profession: "nursing", kind: "origin" }), true, "the same profession's page of the same kind");
  assert.equal(linkFitsPage(iran, "OET for Dentists from Iran", { country: "Iran", profession: "dentistry", kind: "origin" }), false, "another profession");
  assert.equal(linkFitsPage({ profession: "nursing", kind: "profession" }, "OET for Nurses from Jordan", { country: "Jordan", profession: "nursing", kind: "origin" }), true, "a profession's own page links its countries");
  assert.equal(linkFitsPage({ kind: "topic" }, "OET Pakistan 2026: Fees in PKR", null), false, "a topic page links no country's guide");
  assert.equal(linkFitsPage({ kind: "topic" }, "OET Speaking", null), true);
});

test("NOT IN GOOGLE YET: a page that needs more answers goes out noindex,follow; with enough answers it goes out indexable", () => {
  const draft = `<head><meta name="robots" content="noindex, nofollow">${THIN_MARK}<title>T</title></head><body><p class="stamp">Draft</p><main>x</main></body>`;
  const live = asPublished(draft, "https://site.example/t");
  assert.ok(live.includes('<link rel="canonical" href="https://site.example/t">'));
  assert.ok(live.includes(THIN_ROBOTS)); assert.equal(THIN_ROBOTS, '<meta name="robots" content="noindex,follow">');
  assert.ok(!live.includes(THIN_MARK) && !live.includes("noindex, nofollow") && !live.includes("stamp"));
  const full = asPublished(draft.replace(THIN_MARK, ""), "https://site.example/t");
  assert.ok(!/noindex/.test(full), "the same page with enough answers: no noindex");
  assert.equal(pageRow({ url: "u", title: "t", notInGoogleYet: true }).notInGoogleYet, true, "the Pages screen is told");
});

/* ══ RR-378b/c · the Q&A LAW (C:\Projects\_handoffs\ALMIVISIBILITY_QA_LAW_v1.md) ══ */
const QA = (q, a, src = '<a class="src" href="https://oet.com/x" rel="nofollow">Source: oet.com — its official page</a><span class="src"> · checked 2026-11-04</span>') => `<details data-need-id="n--${q.length}"><summary>${q}</summary><p data-claim-id="c">${a} ${src}</p></details>`;
const PAGE = (body, faq) => `<html><head><title>T</title><link rel="canonical" href="https://s.example/t"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script></head><body><main class="av-page"><p class="checked">Last checked 2026-11-04</p>${body}</main></body></html>`;
const GOOD = PAGE(QA("How much is OET?", "OET costs AUD 587 for all four parts."), [["How much is OET?", "OET costs AUD 587 for all four parts."]]);

test("LAW 5B · THE PUBLISH GATE: a page as it goes live is refused for each fault of sections 5 and 5A; a clean page passes", () => {
  assert.deepEqual(pageFaults(GOOD, { url: "https://s.example/t" }), []);
  const bad = (html, re) => { const f = pageFaults(html, { url: "https://s.example/t" }); assert.ok(f.some((x) => re.test(x)), `${re}: ${JSON.stringify(f)}`); };
  bad(PAGE(QA("How much is OET?", "Its official page, checked 2026-11-04, does not say this."), [["How much is OET?", "x"]]), /forbidden words/);
  bad(PAGE(QA("Is OET free?", "OET's site offers samples, but the pages checked show no free sittings."), [["Is OET free?", "x"]]), /forbidden words/);
  bad(PAGE(`<details data-need-id="n"><summary>Where can I take OET?</summary></details>`, []), /shown with no answer/);
  bad(PAGE(QA("How much is OET?", "OET costs AUD 587."), [["How much is OET?", "OET costs AUD 587."], ["Is OET hard?", "Yes."]]), /FAQ data asks "Is OET hard\?"/);
  bad(PAGE(QA("How much is OET?", "OET costs AUD 587."), [["How much is OET?", "OET costs AUD 499."]]), /FAQ data answers/);
  bad(PAGE(QA("How much is OET?", "OET costs AUD 587.") + QA("Is OET hard?", "Many find it fair."), [["How much is OET?", "OET costs AUD 587."]]), /shown but not in the FAQ data/);
  bad(PAGE(QA("How much is OET?", "OET costs AUD 587.", ""), [["How much is OET?", "OET costs AUD 587."]]), /without its source link/);
  bad(PAGE(QA("How much is OET?", "OET costs AUD 587. (Source: OET.)"), [["How much is OET?", "OET costs AUD 587. (Source: OET.)"]]), /named twice/);
  bad(GOOD.replace("Last checked 2026-11-04", ""), /Last checked/);
  assert.ok(pageFaults(GOOD.replace('href="https://s.example/t"', 'href="https://s.example/other"'), { url: "https://s.example/t" }).some((x) => /canonical/.test(x)));
  const linked = GOOD.replace("</main>", '<section class="related"><a href="https://s.example/gone">Gone</a><a href="https://s.example/t2">Here</a></section></main>');
  assert.deepEqual(pageFaults(linked, { url: "https://s.example/t", known: new Set(["https://s.example/t", "https://s.example/t2"]) }).filter((x) => /does not exist/.test(x)), ["a link to /gone, a page that does not exist"]);
  assert.equal(visibleQa(GOOD).length, 1); assert.equal(faqData(GOOD).length, 1);
});

test("LAW 5A · across the pages: one title once, one description once, one fee from one source one value", () => {
  const P = (url, title, fee) => ({ url, html: `<html><head><title>${title}</title><meta name="description" content="${title} d"></head><body><main>${QA("How much does OET cost?", `OET costs AUD ${fee} for all four parts.`, '<a class="src" href="https://support.oet.com/fee">Source</a><span class="src"> · checked 2026-11-04</span>')}</main></body></html>` });
  const m = setFaults([P("u1", "A", 587), P("u2", "B", 587), P("u3", "C", 499), P("u4", "A", 587)]);
  assert.match(m.get("u3").join(" "), /one fact, two values: the OET fee from https:\/\/support\.oet\.com\/fee is AUD 499 here and AUD 587/);
  assert.match(m.get("u1").join(" "), /its title is the title of 1 other/); assert.deepEqual(m.get("u2"), []);
});

test("LAW 5.2 · an answer that reports what WE read goes whole: what stands beside it is not from its source", () => {
  assert.equal(withoutNotes("OET's website offers free official sample tests, but the pages checked show no general free exam sittings. Free full tests are sometimes funded through RefuAid."), "");
  assert.equal(withoutNotes("OET's website offers free official sample tests for nurses."), "OET's website offers free official sample tests for nurses.");
});

test("LAW 6 · a page is thin with fewer than 6 real Q&A, the fee not counted", () => {
  const items = (n, fee = true) => [...(fee ? [{ part: "fee", question: "How much?", claims: [{ text: "OET costs AUD 587 for all four parts." }] }] : []), ...Array.from({ length: n }, (_, i) => ({ part: `questions${i}`, question: `Q${i}?`, claims: [{ text: `A real answer number ${i} from its source.` }] }))];
  const five = { pages: [{ title: "P5", items: items(5) }] }, six = { pages: [{ title: "P6", items: items(6) }] };
  dropEmptyAnswers(five, { today: ON }); dropEmptyAnswers(six, { today: ON });
  assert.equal(five.pages[0].answerLog.thin, true, "5 + the fee: thin"); assert.equal(six.pages[0].answerLog.thin, false, "6 + the fee: not thin");
});

test("LAW 4 · the judge reads the FULL source page; the AI web search's short cited lines never stand alone", async () => {
  const calls = []; const fetchImpl = async (_u, o) => { calls.push(JSON.parse(o.body)); return new Response(JSON.stringify({ model: "m", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: JSON.stringify({ fits: true, sourceOk: true, conflict: false, reason: "ok" }) }] }), { status: 200 }); };
  await confirmAnswer({ key: "k", question: "Q?", answer: "A.", quotes: ["A line."], url: "https://x.org", title: "T", pageText: "The whole page text, every part of it.", fetchImpl });
  assert.equal(JSON.parse(calls[0].messages[0].content).source.page, "The whole page text, every part of it.");
  assert.match(CONFIRM_SYSTEM, /full text of the source page/); assert.match(CONFIRM_SYSTEM, /more than two years old/);
  const src = readFileSync(new URL("../desktop/answer-finder.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(src, /await w\.snippet\(\)/, "the snippet answer is not called");
  assert.match(src, /pageText: page\.text/);
});

test("LAW 4.6 · on a fee, score or date the official source on the page wins over another source", async () => {
  const plan = { pages: [{ title: "OET in Kenya", items: [{ part: "fee", question: "How much is OET in Kenya?", claims: [{ text: "OET costs AUD 587 for all four parts.", official: true }] }] }] };
  const row = { key: keyOf("How much is OET in Kenya?"), part: "fee", question: "How much is OET in Kenya?", cls: "truth", pages: ["OET in Kenya"], link: "https://blog.example/kenya-oet-fee" };
  assert.deepEqual(officialNumbersOf(plan)(row), ["587"]);
  const ai = (answer) => async (_u, o) => { const b = JSON.parse(o.body), judge = b.max_tokens === 800; return new Response(JSON.stringify({ model: "m", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: JSON.stringify(judge ? { fits: true, sourceOk: true, conflict: false, reason: "ok" } : { found: true, answer, quotes: [answer], publisher: "A Blog", kind: "other" }) }] }), { status: 200 }); };
  const read = async (u) => ({ ok: true, url: u, title: "Kenya OET fee", text: "OET in Kenya costs AUD 499 for all four parts. OET in Kenya costs AUD 587 for all four parts." });
  const no = await findOne(row, { read, on: ON, key: "k", officialNumbers: officialNumbersOf(plan), fetchImpl: ai("OET in Kenya costs AUD 499 for all four parts.") });
  assert.equal(no.ok, false); assert.match(no.why, /official source on its page says otherwise \(499/);
  const yes = await findOne(row, { read, on: ON, key: "k", officialNumbers: officialNumbersOf(plan), fetchImpl: ai("OET in Kenya costs AUD 587 for all four parts.") });
  assert.equal(yes.ok, true, "the same number as the official line stands");
});

test("LAW 4 FOR EVERY LINE: each line shown is judged on its full source page; a line that fails leaves, and its question if nothing true is left", async () => {
  const { truthRows, truthAll, applyTruth, truthKey, TRUTH_SYSTEM } = await import("../desktop/truth-pass.mjs");
  const plan = { pages: [
    { title: "A", items: [{ part: "councils0", question: "Who registers podiatrists in Ireland?", claims: [{ text: "CORU accepts OET (Podiatry): B (350) in three sub-tests.", link: "https://coru.example/lang" }] }, { part: "fee", question: "How much is OET?", claims: [{ text: "OET costs AUD 587.", link: "https://oet.example/fee" }] }] },
    { title: "B", items: [{ part: "fee", question: "How much is OET?", claims: [{ text: "OET costs AUD 587.", link: "https://oet.example/fee" }, { text: "An answer the ladder found.", link: "https://x.example/", filled: true }] }] } ] };
  const rows = truthRows(plan, {}, ON);
  assert.deepEqual(rows.map((r) => [r.answer, r.pages]), [["OET costs AUD 587.", 2], ["CORU accepts OET (Podiatry): B (350) in three sub-tests.", 1]], "most pages first; a ladder answer is not judged twice");
  const seen = [], fetchImpl = async (_u, o) => { const b = JSON.parse(o.body), body = JSON.parse(b.messages[0].content); seen.push({ model: b.model, page: body.source.page }); const ok = !/350/.test(body.line); return new Response(JSON.stringify({ model: b.model, stop_reason: "end_turn", usage: { input_tokens: 5000, output_tokens: 80 }, content: [{ type: "text", text: JSON.stringify({ answersQuestion: true, onlySource: ok, exact: ok, registersOk: true, notOldNews: true, noConflict: true, pass: ok, reason: ok ? "as the source says" : "the source gives Grade B with no number" }) }] }), { status: 200 }); };
  const read = async (u) => ({ ok: true, url: u, title: "T", text: u.includes("coru") ? "OET (Podiatry) A minimum of Grade B in three components." : "OET costs AUD 587 for all four parts." });
  const tv = {}, t = await truthAll({ rows, verdicts: tv, key: "k", read, today: ON, fetchImpl });
  assert.deepEqual([t.judged, t.failed], [2, 1]); assert.equal(seen[0].model, "claude-sonnet-5-5", "RR-378e: Sonnet only"); assert.match(seen[1].page, /Grade B in three components/, "the judge read the whole page");
  const gone = applyTruth(plan, tv).removed;
  assert.equal(gone.length, 1); assert.deepEqual(plan.pages[0].items.map((it) => it.question), ["How much is OET?"], "nothing true was left under it: the question went");
  assert.deepEqual(truthRows(plan, tv, ON), [], "judged lines are not asked again before their recheck day");
  assert.ok(truthRows(plan, tv, "2026-12-07").length >= 1, "a fee line is asked again after a month (Q&A LAW 7)");
  const capped = await truthAll({ rows: truthRows(plan, {}, ON), verdicts: {}, key: "k", read, today: ON, fetchImpl, allowed: () => false });
  assert.equal(capped.stopped, "cap"); assert.equal(capped.judged, 0, "at the AI limit nothing is judged, nothing is lost");
  assert.equal(truthKey("Q?", "A.", "u"), truthKey(" Q? ", "A. ", "u")); assert.match(TRUTH_SYSTEM, /full text of its source page/);
});

test("LAW 4.3 · a score only where the source gives one; LAW 5.3 · an office line says no label its source does not", async () => {
  const { plainScores } = await import("../desktop/page-quality.mjs"), { officeLine } = await import("../desktop/council-truth.mjs");
  assert.equal(plainScores("CORU accepts OET (Podiatry): Grade B in three components and C+ (300) in one."), "CORU accepts OET (Podiatry): B in three sub-tests and C+ (300) in one.");
  assert.equal(plainScores("Grade B (350) in three components and C+ (300) in one"), "B (350) in three sub-tests and C+ (300) in one");
  const l = officeLine({ name: "Association X", people: "occupational therapists", place: "Canada", website: "https://x.example/", professional: true });
  assert.doesNotMatch(l, /professional body/); assert.match(l, /not confirmed yet/); assert.doesNotMatch(l, /\bregisters\b/);
});

/* ══ RR-378e · the owner's decisions of 6 Nov 2026, 04:40 ══ */
test("RR-378e 1 · HIDE UNCHECKED: a line the truth pass has not checked is hidden, in Q&A and in the page's own blocks; shown once it passes; a table made from hidden lines goes", async () => {
  const { applyTruth, truthKey, truthRows } = await import("../desktop/truth-pass.mjs");
  const mk = () => ({ pages: [{ title: "OET Booking", items: [{ part: "fee", question: "How much is OET?", claims: [{ text: "OET costs AUD 587.", link: "https://oet.example/fee" }] }, { part: "questions0", question: "Where do I book?", claims: [{ text: "On OET's booking page.", link: "https://oet.example/book" }] }, { part: "questions1", question: "Found by the ladder?", claims: [{ text: "Yes, judged on its full page.", link: "https://x.example/", filled: true }] }], content: { tips: [{ text: "Have your card ready.", link: "https://oet.example/book" }], table: [["a", "b"]], answer: "short" } }] });
  const none = mk(), r0 = applyTruth(none, {});
  assert.deepEqual(none.pages[0].items.map((it) => it.question), ["Found by the ladder?"], "nothing checked yet: only the ladder's own judged answer shows");
  assert.equal(r0.hidden.length, 3); assert.deepEqual(none.pages[0].content.tips, []); assert.equal(none.pages[0].content.table, undefined, "a table made from hidden lines goes");
  const tv = {}; for (const r of truthRows(mk(), {}, ON)) tv[r.key] = { pass: true, on: ON };
  assert.equal(truthRows(mk(), {}, ON).length, 3, "the tip is a line to check too");
  const all = mk(), r1 = applyTruth(all, tv);
  assert.deepEqual([r1.hidden.length, r1.removed.length], [0, 0]); assert.equal(all.pages[0].items.length, 3); assert.equal(all.pages[0].content.tips.length, 1); assert.deepEqual(all.pages[0].content.table, [["a", "b"]], "all checked: the table stays");
  const shown = mk(); applyTruth(shown, {}, { hideUnchecked: false }); assert.equal(shown.pages[0].items.length, 3, "the switch off: as before");
  tv[truthKey("How much is OET?", "OET costs AUD 587.", "https://oet.example/fee")] = { pass: false, on: ON, reason: "no" }; const one = mk(); assert.equal(applyTruth(one, tv).removed.length, 1);
});

test("RR-378e 2 · SONNET ONLY: every judge in the app asks Sonnet", async () => {
  const { FINDER } = await import("../desktop/answer-finder.mjs"), { JUDGE } = await import("../desktop/qa-judge.mjs"), { TRUTH } = await import("../desktop/truth-pass.mjs");
  assert.deepEqual([FINDER.judgeModel, FINDER.extractModel, JUDGE.model, TRUTH.model], ["claude-sonnet-5-5", "claude-sonnet-5-5", "claude-sonnet-5-5", "claude-sonnet-5-5"]);
  const calls = []; await confirmAnswer({ key: "k", question: "Q?", answer: "A.", quotes: ["A."], url: "https://x.org", title: "T", fetchImpl: async (_u, o) => { calls.push(JSON.parse(o.body).model); return new Response(JSON.stringify({ model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: "{}" }] }), { status: 200 }); } });
  assert.deepEqual(calls, ["claude-sonnet-5-5"]);
  for (const f of ["desktop/truth-pass.mjs", "desktop/qa-judge.mjs", "desktop/answer-finder.mjs"]) assert.doesNotMatch(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), /model: AI\.model|claude-opus/, f);
});

test("RR-378e 3 · COST FIRST: the estimate is lines × the measured Sonnet cost; the pass runs only after Start; the screen asks and shows x of y and $", async () => {
  const { truthEstimate, TRUTH } = await import("../desktop/truth-pass.mjs");
  assert.deepEqual(truthEstimate(Array.from({ length: 1000 }, () => ({}))), { lines: 1000, usd: 8.8, perLineUsd: 0.0088, model: "claude-sonnet-5-5" });
  const M = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), U = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  assert.match(M, /pread\(id, TRUTH_GO, null\)\?\.go === true && rows\.length/, "it runs only after the owner's Start");
  assert.match(M, /\$\{o\.judged\} of \$\{rows\.length\} checked, \$\$\{o\.usd\.toFixed\(2\)\} spent/);
  assert.match(U, /Start the truth check\?/); assert.match(U, /lines checked, \$\{\$m\(r\.usd\)\} spent/); assert.match(U, /if \(!\(await truthAsk\(\)\)\) return;/);
  assert.ok(TRUTH.perLineUsd > 0);
});

test("RR-378e 4 · LAW 4.6: two non-official sources disagree → the newer wins and the older is still named; an official one wins outright", async () => {
  const { settleSources } = await import("../desktop/truth-pass.mjs");
  const plan = { pages: [{ title: "P", items: [{ part: "fee", question: "How much is OET in Kenya?", claims: [{ text: "OET costs KES 60,000.", link: "https://a.example/", readOn: "2025-01-02", source: "Blog A — its own page" }, { text: "OET costs KES 66,000.", link: "https://b.example/", readOn: "2026-10-01", source: "Blog B — its own page" }] }] }] };
  assert.equal(settleSources(plan)[0].won, "newer");
  assert.deepEqual(plan.pages[0].items[0].claims.map((c) => c.text), ["OET costs KES 66,000.", "Earlier (checked 2025-01-02), Blog A said: OET costs KES 60,000."]);
  const off = { pages: [{ title: "P", items: [{ part: "fee", question: "How much is OET?", claims: [{ text: "OET costs AUD 499.", link: "https://blog.example/", readOn: "2026-11-01" }, { text: "OET costs AUD 587.", link: "https://oet.com/fee", readOn: "2026-10-01", official: true }] }] }] };
  assert.equal(settleSources(off)[0].won, "official"); assert.deepEqual(off.pages[0].items[0].claims.map((c) => c.text), ["OET costs AUD 587."]);
  const agree = { pages: [{ title: "P", items: [{ part: "fee", question: "How much is OET?", claims: [{ text: "AUD 587.", link: "https://a.example/" }, { text: "It is AUD 587.", link: "https://b.example/" }] }] }] };
  assert.deepEqual(settleSources(agree), [], "the same numbers: nothing to settle");
});

test("RR-378e 5 · the Ontario line: numbers no OET result can be (another test's row in a mixed table) are never shown as OET's", async () => {
  const { oetPlausible } = await import("../desktop/official.mjs");
  assert.equal(oetPlausible("Listening 249 · Reading 207 · Writing 310 · Speaking 310", "OET"), false);
  assert.equal(oetPlausible("Listening 350 · Reading 360 · Writing 350 · Speaking 360", "OET"), true);
  assert.equal(oetPlausible("Listening 249", "IELTS"), true, "another subject: not judged here");
  assert.match(readFileSync(new URL("../desktop/research.mjs", import.meta.url), "utf8"), /oetPlausible\(got\.scores\.text, subject\)/);
});
