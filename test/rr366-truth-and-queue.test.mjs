/**
 * 🔴 RR-366: truthful councils, good questions kept and answered, local questions, the whole result answer, one question one answer, official sources for facts, the Standard queue and On-Page parsing.
 * No paid call: every outside service here is a stand-in handed in.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkCouncil, councilFacts, councilLineWhy, statesRegistration, openLine, findRegulator, councilKey } from "../desktop/council-truth.mjs";
import { answerQuestion, factAnswer, honestAnswer, isTestFormat, classOfPhrase, phraseOutWhy, shownWording, edgeClaims, VIEW_MARK } from "../desktop/answer-ladder.mjs";
import { answerFitWhy, partFitWhy, fitParts, mergeSameNeeds, oneFactOnce, oneSentenceOnce, needClass, ownSiteFactWhy, numbersWithoutFact } from "../desktop/truth-checks.mjs";
import { questionOffIntentWhy, unclearWhy, coreMissingOfPlan, suggestionWhy } from "../desktop/page-types.mjs";
import { examPlan, applyLocalQuestions, askedOf, validityClaimsOf, priceHere, settleLocal } from "../desktop/exam-plan.mjs";
import { placeHere } from "../desktop/truth-prices.mjs";
import { subjectFactsOf, pageWords } from "../desktop/subject-facts.mjs";
import { SERP, ONPAGE, queueSearches, collectQueued, searchGoogle, parseTopPage, blocksOfContent, searchPages, serpKey, autocompleteIn, autoKey, autoTask, readSerp, notForReading, searchTermOf, CAP_LATER } from "../desktop/serp.mjs";
import { partsMissing } from "../desktop/page-quality.mjs";
import { runTopPages } from "../site/top-pages.mjs";

const ON = "2026-11-02", NOW = `${ON}T10:00:00.000Z`;
const F = (key, text, link = `https://oet.com/${key}`) => ({ claimId: `subject-${key}`, fact: key, text, link, readOn: ON, source: "OET — its own page", official: true, body: "OET" });
const FACTS = { resultsPaper: F("resultsPaper", "OET's own page: results for the test on paper come from 13 days after the test date, in all regions but India and the Philippines."), resultsIndia: F("resultsIndia", "OET's own page: in India and the Philippines, results for the test on paper come in as little as 5 days after the test date."), resultsComputer: F("resultsComputer", "OET's own page: results for the test on computer come in as little as 48 hours after all sub-tests are done."), results95: F("results95", "OET's own page: 95% of results for the test on computer are released within 6 calendar days."), professions12: F("professions12", "OET's own page: OET is made for 12 healthcare professions: medicine, nursing, dentistry, dietetics, pharmacy, physiotherapy, podiatry, radiology, occupational therapy, veterinary science, optometry and speech pathology."), purpose: F("purpose", "OET's own page: OET tests the English of healthcare professionals who want to register and practise where English is spoken."), changeFee: F("changeFee", "OET's own page: moving a paper booking to another date, venue or test type costs AU$120 up to the booking closing date and AU$200 after."), changeFeeComputer: F("changeFeeComputer", "OET's own page: rescheduling the test on computer or at home costs AU$120 (US$95 in the US) up to 7 days before the test and AU$200 (US$155 in the US) after that."), bookFind: F("bookFind", "Go to OET's booking page, enter your city and country, and press Find a test."), bookPaper: F("bookPaper", "Press Book now, then register or sign in at registration.myoet.com and choose Apply for the test."), bookPaperCloses: F("bookPaperCloses", "OET's own page: bookings for the test on paper close 24 days before the test date."), bookComputerCloses: F("bookComputerCloses", "OET's own page: bookings for the test on computer at a venue and at home close 7 days before the test date."), sampleTests: F("sampleTests", "OET's own page offers sample tests to practise with."), scale: F("scale", "OET's own page: each sub-test is reported on a scale from 0 to 500, with a letter grade from E to A.") };
const PAGES = [{ url: "https://oet.com/test/oet-test", on: ON, words: ["oet", "test", "healthcare", "professions"] }];
const reader = (pages) => async (u) => pages[u] ?? { ok: false, why: "no such page" };

/* ── Part 1 ── */
test("Part 1: a line says registers only when the body's own page says so; an association must say it IS the regulator", async () => {
  assert.equal(statesRegistration("The Council registers nurses and midwives in Kenya.", "nursing"), true);
  assert.equal(statesRegistration("Members who are dietitians register for the conference.", "dietetics"), false, "a member registering for an event is not registering a profession");
  assert.equal(statesRegistration("We are a friendly society for optometrists.", "optometry"), false);
  assert.equal(statesRegistration("Notices Registered Dentists 406341 National Dental Registry Indian Dentists Register", "dentistry"), true, "a page with no full stops still says it");
  /* the Optometry Confederation of India's own words, read 2 Nov 2026 */
  assert.equal(statesRegistration("OCI was set up as a representative and regulatory body. OCI is a self-regulatory body established under Section 8. Maintaining a register of practicing optometrists.", "optometry", { strict: true }), false, "a self-regulatory body is not the legal regulator");
  assert.equal(statesRegistration("OCI is the national regulator of optometrists. OCI is a self-regulatory body.", "optometry", { strict: true }), false, "its own 'self-regulatory' settles it, whatever else the page says");
  assert.equal(statesRegistration("Optometrists register with the Confederation here.", "optometry", { strict: true }), false, "an association must say it IS the regulator");
  assert.equal(statesRegistration("Optometrists register with the Board here.", "optometry"), true, "a body not named an association need only say it");
  const ida = await checkCouncil({ name: "Indian Dietetic Association", profession: "dietetics", link: "https://ida.example/contact", read: reader({ "https://ida.example/contact": { ok: true, text: "Contact the Indian Dietetic Association. Dietitians can become members.", links: [] } }), on: ON });
  assert.deepEqual([ida.ok, ida.why], [false, "association"]);
  const psi = await checkCouncil({ name: "Pharmaceutical Society of Ireland", profession: "pharmacy", link: "https://psi.example/contact", read: reader({ "https://psi.example/contact": { ok: true, text: "PSI is the statutory pharmacy regulator in Ireland.", links: [] } }), on: ON });
  assert.equal(psi.ok, true, "a body named a society whose own page says it is the regulator stands");
  const none = await checkCouncil({ name: "A Board", profession: "nursing", link: "https://b.example/c", read: reader({}), on: ON });
  assert.deepEqual([none.ok, none.why], [false, "unread"]);
  const about = await checkCouncil({ name: "Nursing Board", profession: "nursing", link: "https://n.example/contact", read: reader({ "https://n.example/contact": { ok: true, text: "Phone us.", links: [{ href: "https://n.example/about-us", text: "About us" }, { href: "https://other.example/about", text: "About them" }] }, "https://n.example/about-us": { ok: true, url: "https://n.example/about-us", text: "The Board registers nurses.", links: [] } }), on: ON });
  assert.deepEqual([about.ok, about.evidence], [true, "https://n.example/about-us"], "its own about page is looked at; another site's is not");
});
test("Part 1: councilFacts: an open question with the page and the date, never invented; the source becomes the page that says it", () => {
  const fact = (name, prof, c = "India") => ({ id: "x", part: "home-council", country: c, profession: prof, councilName: name, text: `${name} registers ${prof} in ${c}.`, link: "https://x.example/contact", on: "2026-10-27", verified: true });
  const checks = { [councilKey("India", "dietetics", "Indian Dietetic Association")]: { ok: false, why: "association", page: "https://ida.example/", on: ON }, [councilKey("India", "nursing", "Indian Nursing Council")]: { ok: true, evidence: "https://inc.example/about", on: ON }, [councilKey("India", "radiography", "Some Board")]: { ok: false, why: "not stated", page: "https://b.example/", on: ON }, [councilKey("India", "pharmacy", "Pharmacy Council")]: { ok: false, why: "not stated", page: "https://p.example/", on: ON, found: { name: "Real Commission", link: "https://real.example/", on: ON } }, [councilKey("Ireland", "pharmacy", "Pharmaceutical Society of Ireland")]: { ok: true, strict: true, evidence: "https://psi.example/", on: ON } };
  const { facts, changes } = councilFacts([fact("Indian Dietetic Association", "dietetics"), fact("Indian Nursing Council", "nursing"), fact("Some Board", "radiography"), fact("Pharmacy Council", "pharmacy"), fact("Pharmaceutical Society of Ireland", "pharmacy", "Ireland")], checks, { today: ON });
  assert.equal(facts[0].part, "open-council"); assert.match(facts[0].text, /is a professional body, not shown here as the registering body: its own page, checked 2026-11-02, does not say it registers/); assert.ok(!/^Indian Dietetic Association registers/.test(facts[0].text));
  assert.deepEqual([facts[1].part, facts[1].link, facts[1].on], ["home-council", "https://inc.example/about", ON]);
  assert.equal(facts[2].part, "open-council"); assert.match(facts[2].text, /still an open question: Some Board's own page, checked 2026-11-02, does not say it registers them/);
  assert.deepEqual([facts[3].part, facts[3].councilName, facts[3].link], ["home-council", "Real Commission", "https://real.example/"], "the regulator found on its own page takes the line");
  assert.match(facts[4].text, /its own page says it is the regulator/);
  assert.equal(changes.length, 4, "every changed line is listed, before and after, with its source"); assert.ok(changes.every((c) => c.before && c.after && c.source && c.on), JSON.stringify(changes.filter((c) => !(c.before && c.after && c.source && c.on))));
  assert.equal(councilFacts([fact("Optometrists Association", "optometry")], null, { today: ON }).facts[0].part, "open-council", "with no check at all an association is still never shown as registering");
  assert.equal(councilFacts([fact("Plain Council", "optometry")], null, { today: ON }).facts[0].part, "home-council");
  /* GMC refuses our reader: the owner's verified facts hold its own page; a line he approved stands, said; neither ever rescues an association */
  const gmc = { ...fact("General Medical Council", "medicine", "United Kingdom"), link: "https://www.gmc-uk.org/contact", website: "https://www.gmc-uk.org/" }, ver = { part: "councils", verified: true, country: "United Kingdom", profession: "medicine", link: "https://www.gmc-uk.org/oet", on: "2026-10-31", text: "GMC accepts OET." }, unread = { [councilKey("United Kingdom", "medicine", "General Medical Council")]: { ok: false, why: "unread", page: gmc.link, on: ON } };
  const a = councilFacts([gmc, ver], unread, { today: ON }); assert.deepEqual([a.facts[0].part, a.facts[0].link], ["home-council", "https://www.gmc-uk.org/oet"]); assert.match(a.changes[0].kept, /verified facts/);
  const b = councilFacts([{ ...fact("Approved Council", "nursing", "Nepal"), approved: true }], { [councilKey("Nepal", "nursing", "Approved Council")]: { ok: false, why: "not stated", page: "https://x.example/", on: ON } }, { today: ON }); assert.equal(b.facts[0].part, "home-council"); assert.match(b.changes[0].kept, /owner's own approval/);
  assert.equal(councilFacts([{ ...fact("Nepal Nurses Association", "nursing", "Nepal"), approved: true }], { [councilKey("Nepal", "nursing", "Nepal Nurses Association")]: { ok: false, why: "association", page: "https://x.example/", on: ON } }, { today: ON }).facts[0].part, "open-council", "not even approval makes an association a registrar");
});
test("Part 1: the page's own lines are judged too: an association's 'registers' never passes; only named by its page", () => {
  assert.match(councilLineWhy("Indian Dietetic Association registers dietitians in India."), /professional body/);
  assert.equal(councilLineWhy("Pharmaceutical Society of Ireland registers pharmacists in Ireland (its own page says it is the regulator)."), null);
  assert.equal(councilLineWhy("Indian Nursing Council registers nurses in India."), null);
  assert.match(partFitWhy("councils", "Optometry Confederation of India registers optometrists in India."), /professional body/);
});
test("Part 1: the search for the real regulator: same-meaning names; only a page that says it, in that place; otherwise nothing", async () => {
  let asked = null; const search = async (q) => { asked = q; return [{ url: "https://blog.example/", title: "A blog" }, { url: "https://reg.example/", title: "x" }]; };
  const got = await findRegulator({ people: "dietitians", profession: "dietetics", place: "India", search, read: reader({ "https://blog.example/": { ok: true, title: "Blog", text: "Nothing here." }, "https://reg.example/": { ok: true, url: "https://reg.example/", title: "Home | National Commission for Allied Professions", text: "The Commission registers dietitians in India." } }), on: ON });
  assert.match(asked, /council commission board authority ministry office India/); assert.deepEqual(got, { name: "National Commission for Allied Professions", link: "https://reg.example/", on: ON });
  assert.equal(await findRegulator({ people: "x", profession: "dietetics", place: "India", search: async () => [{ url: "https://a.example/" }], read: reader({ "https://a.example/": { ok: true, title: "Dietetics Society", text: "We register dietitians in India." } }), on: ON }), null, "a society's name is not taken as the regulator");
  assert.equal(await findRegulator({ people: "x", profession: "dietetics", place: "India", search: null, read: reader({}), on: ON }), null);
});

/* ── Part 2 ── */
test("Part 2: the ladder, in its order: a fact by meaning, a marked view, our own edge, an honest line", () => {
  const ctx = { subject: "OET", subjectFacts: FACTS, pages: PAGES, edge: edgeClaims({ product: "AlmiOET", site: "https://almioet.example/", description: "OET practice with a grade per sub-test.", on: NOW, subjectFacts: FACTS }) };
  const who = answerQuestion("Who can take the OET test?", ctx); assert.equal(who.step, 1); assert.match(who.claims[0].text, /12 healthcare professions/);
  const abroad = answerQuestion("Can a Bangladeshi nurse use OET to study or work abroad?", ctx); assert.equal(abroad.step, 1); assert.match(abroad.claims[0].text, /register and practise where English is spoken/);
  const off = answerQuestion("Can I apply for the paper OET exam offline?", ctx); assert.equal(off.step, 1); assert.match(off.claims.map((c) => c.text).join(" "), /registration\.myoet\.com/);
  const view = answerQuestion("Is IELTS or OET better for registration in Ireland?", { ...ctx, view: { answer: "OET suits many healthcare workers because its tasks are clinical.", link: "https://blog.example/x", on: ON } });
  assert.equal(view.step, 2); assert.ok(view.claims[0].text.startsWith(VIEW_MARK)); assert.match(view.claims[0].source, /a view, not an official rule/); assert.equal(view.claims[0].official, false);
  const classes = answerQuestion("Can I take OET online classes at home?", ctx); assert.equal(classes.step, 3); assert.match(classes.claims.map((c) => c.text).join(" "), /AlmiOET is our own practice site/); assert.ok(classes.claims.some((c) => c.official), "with the official link"); assert.ok(classes.claims.some((c) => c.ownProduct));
  const none = answerQuestion("Does OET give a discount to twins?", ctx); assert.equal(none.step, 4); assert.equal(none.claims[0].text, `OET's official page, checked ${ON}, does not say this.`); assert.equal(none.claims[0].link, "https://oet.com/test/oet-test");
});
test("Part 2 (found reading the ready pages): the ladder never hands a question a wrong fact", () => {
  const F2 = { ...FACTS, gradeB: F("gradeB", "OET's own page: grade B is a scale score of 350."), notForOthers: F("notForOthers", "OET's own page: for someone who is not a health professional working towards registration, OET may not be the most suitable test.") }, ctx = { subject: "OET", subjectFacts: F2, pages: PAGES, edge: [] }, words = (q) => answerQuestion(q, ctx).claims.map((c) => c.text).join(" ");
  assert.match(words("Can an anesthesia technician apply to take the OET?"), /12 healthcare professions/); assert.ok(!/bookings/i.test(words("Can an anesthesia technician apply to take the OET?")));
  assert.match(words("Can a dental MDS graduate sit the OET exam?"), /12 healthcare professions/);
  assert.match(words("Can I take my OET Exam at home?"), /at a venue and at home/); assert.ok(!/not a health professional/.test(words("Can I take my OET Exam at home?")));
  assert.match(words("Do I need IELTS or OET for a UK Tier 2 visa or HCPC registration?"), /does not say this/, "not a booking step");
  assert.match(words("What grade is 300 in OET?"), /does not say this/, "a score asked is answered with that score"); assert.match(words("What Score is 350 in OET?"), /grade B is a scale score of 350/);
  assert.match(words("How can I register for the OET exam?"), /Find a test/); assert.match(words("OET registration Ghana"), /Find a test/); assert.match(words("oet exam kya hai"), /register and practise/); assert.match(words("OET for which professions?"), /12 healthcare professions/);
  assert.ok(questionOffIntentWhy("What is the maximum age to apply for a job in the UK?", { subject: "OET" })); assert.equal(questionOffIntentWhy("Can I apply for the paper exam offline?", { subject: "OET" }), null);
  const why = [], out = oneFactOnce([{ part: "topic", question: "A?", claims: [{ text: "first fact" }] }, { part: "questionsa1", question: "B?", claims: [{ text: "first fact" }, { text: "a side remark" }] }], { droppedWhy: why }); assert.deepEqual(out.map((x) => x.question), ["A?"], "a question is not left holding only a side remark"); assert.match(why[0].why, /already stands/);
});
test("Part 2: a view may not carry a fee, a date or a score; with no source a guidance answer is never shown", () => {
  const ctx = { subject: "OET", subjectFacts: {}, pages: PAGES };
  assert.notEqual(answerQuestion("Is IELTS or OET better?", { ...ctx, view: { answer: "OET at AUD 587 is dearer.", link: "https://b.example/", on: ON } }).step, 2);
  assert.notEqual(answerQuestion("Is IELTS or OET better?", { ...ctx, view: { answer: "OET suits nurses.", link: null, on: ON } }).step, 2);
  assert.match(answerFitWhy("Is OET better?", `${VIEW_MARK} OET costs AUD 587.`), /a view may not carry a fee/);
});
test("Part 2: 'does not say this' is said only of a page really read whose words lack it", () => {
  const says = honestAnswer("What is the OET refund policy?", { subject: "OET", pages: [{ url: "https://oet.com/a", on: ON, words: ["refund", "policy"] }] }); assert.match(says.text, /is the place to read this/); assert.ok(!/does not say/.test(says.text));
  assert.equal(honestAnswer("Anything?", { subject: "OET", pages: [] }), null, "no page read: nothing is claimed about it");
  assert.equal(honestAnswer("Anything?", { subject: "OET", pages: [{ url: "https://oet.com/a", on: "unknown", words: [] }] }), null);
  assert.deepEqual(pageWords({ url: "https://oet.com/a", checkedOn: `${ON}T10:00:00Z`, text: "Bookings close, bookings close!" }).words, ["bookings", "close"], "only which words a page holds, never its sentences");
});
test("Part 2: OET's own page gives who the test is for", () => {
  const got = subjectFactsOf([{ ok: true, url: "https://oet.com/test/oet-test", checkedOn: ON, text: "OET Test is designed for healthcare professionals and tailored to 12 healthcare professions including nursing. Medicine Nursing Dentistry Dietetics Pharmacy Physiotherapy Podiatry Radiology Occupational Therapy Veterinary Science Optometry Speech Pathology. professionals who seek to register and practise in an English-speaking environment. If you are not a health professional working towards registration" }], "OET");
  assert.match(got.professions12.text, /made for 12 healthcare professions: medicine, nursing/); assert.match(got.professions12.text, /speech pathology\.$/); assert.match(got.purpose.text, /register and practise/); assert.match(got.notForOthers.text, /not a health professional/);
});
test("Part 2: a form field, an odd question and one off this page's intent still go, with the reason", () => {
  assert.ok(unclearWhy("How can I register for your class?")); assert.ok(unclearWhy("Is anyone else here preparing for OET like me?")); assert.ok(unclearWhy("Why do I feel nervous when watching OET speaking videos?")); assert.ok(unclearWhy("Will you be applying for this year's match?"));
  assert.match(questionOffIntentWhy("Which exam is needed to work abroad with a hospital administration diploma?", { subject: "OET" }), /not about this test/);
  assert.equal(questionOffIntentWhy("Can an MDS graduate take the OET exam?", { subject: "OET" }), null); assert.equal(questionOffIntentWhy("Where can I get study material and guidelines for healthcare professionals?", { subject: "OET" }), null); assert.equal(questionOffIntentWhy("Anything about a diploma?", { subject: "OET", category: "general" }), null, "another kind of product keeps its own checks");
});
test("Part 2: the plan: a good question with a guidance answer stays, its fate said; the odd ones are listed with why", () => {
  const facts = [{ verified: true, id: "q1", part: "questions", country: "Bangladesh", question: "Is OET only for health professionals?", text: "Yes, OET is designed for healthcare professionals and tailored to its professions.", link: "https://oet.com/test/oet-test", on: ON }];
  const plan = examPlan({ subject: "OET", countries: ["Bangladesh"], facts, subjectFacts: FACTS, asked: { Bangladesh: [{ question: "Can an MDS dental graduate apply for the OET exam?", kind: "guidance", answer: "Maybe.", link: null, on: null }, { question: "Is IELTS or OET better for healthcare workers?", kind: "guidance", answer: "OET usually suits healthcare workers.", link: "https://learninsync.example/x", on: ON }, { question: "How can I register for your class?", kind: "guidance", answer: "x", link: null, on: null }, { question: "Which exam is needed to work abroad with a hospital administration diploma?", kind: "official", answer: "x", link: "https://oet.com/a", on: ON }, { question: "Will notes be given to me during the speaking assessment?", kind: "guidance", answer: "No", link: null, on: null }] }, ladder: { pages: PAGES, edge: [] } });
  const p = plan.pages.find((x) => x.country === "Bangladesh"), qs = p.items.map((i) => i.question);
  assert.ok(qs.includes("Can an MDS dental graduate apply for the OET exam?"), "a clear question is answered, not dropped"); assert.match(p.items.find((i) => /MDS/.test(i.question)).claims[0].text, /12 healthcare professions/);
  assert.ok(p.items.find((i) => /IELTS/.test(i.question)).claims[0].text.startsWith(VIEW_MARK));
  assert.ok(!qs.some((q) => /your class|speaking assessment/.test(q)));
  assert.ok(plan.droppedQuestions.some((d) => /your class/.test(d.question) && /prompt/.test(d.why))); assert.ok(plan.droppedQuestions.some((d) => /speaking assessment/.test(d.question) && /test-format/.test(d.why)), "a test-format question is said to have moved");
});
test("Part 2: the answers of the ladder count as the page's questions, and the fit check reads them for what they are", () => {
  assert.equal(coreMissingOfPlan({ kind: "country", items: [{ part: "questionsa3", claims: [{}] }] }).some((m) => m.part === "questions"), false);
  assert.equal(answerFitWhy("Does OET give a discount?", `OET's official page, checked ${ON}, does not say this.`), null);
  assert.equal(answerFitWhy("Can an MDS dental graduate apply?", FACTS.professions12.text, { loose: true }), null, "a list of all the professions answers for each");
  assert.match(answerFitWhy("Can a dentist apply?", "OET is for nurses only."), /asks about dentistry/);
});

/* ── Part 3 ── */
test("Part 3: test-format questions leave the country page; a question naming the place stays; what a phrase asks is read in local words", () => {
  for (const q of ["Can I look at the role card throughout the speaking role play?", "Does OET speaking have two role plays of five minutes each?", "Will notes be given to the candidate during the speaking assessment?", "What are the criteria used for marking OET?"]) assert.ok(isTestFormat(q, "Pakistan"), q);
  assert.equal(isTestFormat("Can an MDS graduate take the OET exam?", "Pakistan"), false); assert.equal(isTestFormat("Is OET speaking held in Pakistan?", "Pakistan"), false);
  assert.equal(classOfPhrase("oet fees in pakistan"), "fee"); assert.equal(classOfPhrase("oet ki fees"), "fee"); assert.equal(classOfPhrase("oet magkano"), "fee"); assert.equal(classOfPhrase("oet center in lahore"), "centre"); assert.equal(classOfPhrase("oet kya hai"), "what"); assert.equal(classOfPhrase("oet coaching in kerala"), "practice"); assert.equal(classOfPhrase("oet exam date 2026"), "book"); assert.equal(classOfPhrase("oet review center philippines"), "practice", "a review centre is not a test venue"); assert.equal(classOfPhrase("oet test center philippines"), "centre"); assert.equal(classOfPhrase("is oet accepted in uk"), "accepted"); assert.equal(classOfPhrase("oet for which professions"), "who"); assert.equal(classOfPhrase("oet full form in english"), null, "we hold no fact that gives it");
  assert.equal(shownWording("oet kya hai", "OET"), "OET kya hai?"); assert.equal(shownWording("oet fees in pakistan", "OET", "Pakistan"), "OET fees in Pakistan?");
  assert.match(phraseOutWhy("oet fees in india", { country: "Pakistan", subject: "OET" }), /another country/, "a country page never carries another country's questions"); assert.match(phraseOutWhy("oet login", { country: "Pakistan", subject: "OET" }), /another website/); assert.match(phraseOutWhy("ielts fees", { country: "Pakistan", subject: "OET" }), /not about this subject/); assert.equal(phraseOutWhy("oet fees in pakistan", { country: "Pakistan", subject: "OET" }), null);
});
test("Part 3: their words head the part that answers them, most typed first; another country's and an unanswerable one are reported, not shown", () => {
  const plan = { pages: [{ kind: "country", country: "Pakistan", localAsked: ["oet kya hai", "oet fees in pakistan", "oet fees in india", "oet center in lahore", "oet ki fees", "oet wala"], items: [{ part: "fee", question: "How much does OET cost in Pakistan?", claims: [{ text: "AUD 587" }] }, { part: "questions0", question: "Can an MDS graduate take the OET exam?", claims: [{ text: "Yes" }] }, { part: "centres", question: "Where can I take OET in Pakistan?", claims: [{ text: "Lahore" }] }] }] };
  applyLocalQuestions(plan, { subject: "OET", ctxFor: () => ({ subjectFacts: FACTS, pages: PAGES, edge: [] }) });
  const p = plan.pages[0], qs = p.items.map((i) => i.question);
  assert.equal(qs[0], "OET fees in Pakistan?", "the fee stays first, in their wording"); assert.equal(p.items[0].part, "fee"); assert.equal(qs[1], "OET kya hai?", "then what they type most"); assert.ok(qs.includes("OET center in lahore?"));
  assert.ok(p.localReport.find((r) => r.phrase === "oet fees in india" && !r.used && /another country/.test(r.why))); assert.ok(p.localReport.find((r) => r.phrase === "oet ki fees" && !r.used && /same need/.test(r.why)), "one question, one answer"); assert.ok(p.localReport.find((r) => r.phrase === "oet wala" && !r.used && /no verified answer/.test(r.why)));
  const fit = fitParts([{ part: "questionsa70", question: "OET kya hai?", claims: [{ ...FACTS.purpose }], localWording: true }], { subject: "OET" }); assert.equal(fit.parts.length, 1, "three words of their own are not 'too short'");
});

/* ── Part 4 ── */
test("Part 4: the result answer is whole; on the India and Philippines pages their own 5 days come first; no other country's name elsewhere", () => {
  const india = factAnswer("How long does it take to get OET results?", { subjectFacts: FACTS, country: "India" }).claims.map((c) => c.text), ghana = factAnswer("How long does it take to get OET results?", { subjectFacts: FACTS, country: "Ghana" }).claims.map((c) => c.text);
  assert.match(india[0], /5 days/); assert.match(india.join(" "), /48 hours/); assert.match(india.join(" "), /95%.*6 calendar days/);
  assert.match(factAnswer("How long does it take to get OET results?", { subjectFacts: FACTS, country: "Philippines" }).claims[0].text, /5 days/);
  assert.match(ghana[0], /13 days/); assert.match(ghana.join(" "), /48 hours/); assert.match(ghana.join(" "), /95%/); assert.ok(!/India|Philippines/.test(ghana.join(" ")));
  assert.match(placeHere(FACTS.resultsPaper.text, null), /all regions but India/, "where no one country is meant the whole rule stands");
  const plan = examPlan({ subject: "OET", countries: ["India"], facts: [], subjectFacts: FACTS }), it = plan.pages.find((x) => x.country === "India").items.find((i) => i.part === "results"); assert.match(it.claims[0].text, /5 days/); assert.ok(it.claims.every((c) => /^https:\/\/oet\.com/.test(c.link)), "from the official page");
  assert.ok(!/\b12 (?:calendar )?days\b/.test(JSON.stringify(plan.pages.flatMap((p) => p.items))));
});

/* ── Part 5 ── */
test("Part 5: one question, one answer: two wordings of one need join", () => {
  assert.equal(needClass("What is the fee for rescheduling an OET Test?"), "change-fee"); assert.equal(needClass("What does changing an OET booking cost?"), "change-fee"); assert.equal(needClass("How much does OET cost?"), "fee"); assert.equal(needClass("What does an OET re-mark cost?"), "remark-fee"); assert.equal(needClass("How long does it take to get OET results?"), "result-time"); assert.equal(needClass("When do OET results come?"), "result-time");
  const why = [], out = mergeSameNeeds([{ part: "topic", question: "What does changing an OET booking cost?", claims: [{ text: "AU$120" }] }, { part: "questions51", question: "What is the fee for rescheduling an OET Test?", claims: [{ text: "AU$120" }, { text: "AU$200" }] }, { part: "fee", question: "How much does OET cost?", claims: [{ text: "c" }] }, { part: "scores", question: "What fee does the board ask?", claims: [{ text: "d" }] }], { droppedWhy: why });
  assert.deepEqual(out.map((x) => x.question), ["What does changing an OET booking cost?", "How much does OET cost?", "What fee does the board ask?"]); assert.deepEqual(out[0].claims.map((c) => c.text), ["AU$120", "AU$200"], "the same line is not said twice"); assert.match(why[0].why, /same need/);
});
test("Part 5 (found reading the Exam Price page): under a price only a price joins; a topic page keeps the whole fact, once", () => {
  const out = mergeSameNeeds([{ part: "fee", question: "How much does OET cost?", claims: [{ text: "AUD 587 for the full OET." }] }, { part: "questionsa1", question: "Is there a booking fee for OET?", claims: [{ text: "Go to OET's booking page and press Find a test." }, { text: "A late change costs AU$200." }] }], { droppedWhy: [] });
  assert.deepEqual(out[0].claims.map((c) => c.text), ["AUD 587 for the full OET.", "A late change costs AU$200."]);
  assert.match(factAnswer("What is the fee for rescheduling an OET test?", { subjectFacts: FACTS }).claims[1].text, /AU\$120 \(US\$95 in the US\)/); assert.ok(!/US\$95/.test(factAnswer("What is the fee for rescheduling an OET test?", { subjectFacts: FACTS, country: "Ghana" }).claims[1].text));
});
test("Part 5: one fact once: a question whose whole answer already stands joins it; 'does not say this' may stand under each", () => {
  const why = [], out = oneFactOnce([{ part: "topic", question: "A?", claims: [{ text: "same" }, { text: "own" }] }, { part: "questionsa1", question: "B?", claims: [{ text: "same" }] }, { part: "questionsa2", question: "C?", claims: [{ text: "same" }, { text: "new" }] }, { part: "questionsa3", question: "D?", claims: [{ text: `OET's official page, checked ${ON}, does not say this.` }] }, { part: "questionsa4", question: "E?", claims: [{ text: `OET's official page, checked ${ON}, does not say this.` }] }, { part: "councils", question: "F?", claims: [{ text: "same" }] }], { droppedWhy: why });
  assert.deepEqual(out.map((x) => x.question), ["A?", "D?", "E?", "F?"]); assert.match(why[0].why, /already stands on this page, under "A\?"/); assert.match(why[1].why, /already stands/);
});
test("Part 5: our own site is a source only for our own product", () => {
  assert.match(ownSiteFactWhy("The GMC treats OET certificates as valid for two years.", { subject: "OET" }), /time limit|body's rule/); assert.match(ownSiteFactWhy("OET lists the test at AU$587."), /official source/); assert.match(ownSiteFactWhy("Results come within 48 hours."), /official source/);
  assert.match(ownSiteFactWhy("Australia's National Boards accept the OET only on paper.", { subject: "OET" }), /body's rule is shown only with that body's own page/, "no number in it: still a body's rule"); assert.equal(ownSiteFactWhy("Practise with feedback from our tutors every week.", { subject: "OET" }), null);
  const fit = fitParts([{ part: "topic", question: "Is the OET valid for 3 years?", claims: [{ text: "The GMC treats OET certificates as valid for two years.", link: "https://almioet.example/x", readOn: ON }] }, { part: "questionsa1", question: "Can I practise at home?", claims: [{ text: "AlmiOET is our own practice site: 48 hours free.", link: "https://almioet.example/", readOn: ON, ownProduct: true }] }], { subject: "OET", ownHost: "almioet.example", officialHost: "oet.com" });
  assert.equal(fit.parts.length, 1, "the rule of a body from our own site goes, our own product stays"); assert.equal(fit.parts[0].question, "Can I practise at home?"); assert.match(fit.removed[0].why, /official source|body's own page/);
  /* a client whose subject is its own product keeps its own site */
  assert.equal(fitParts([{ part: "fee", question: "How much is it?", claims: [{ text: "Our plan costs $30.", link: "https://client.example/", readOn: ON }] }], { subject: "Client", ownHost: "client.example", officialHost: "client.example" }).removed.filter((r) => /official/.test(r.why)).length, 0);
});
test("Part 6 D: a validity answer names the body and comes from its own page", () => {
  const research = { medicine: [{ regulator: { short: "GMC" }, details: { validity: { n: 2, unit: "years" }, url: "https://gmc.example/", on: ON } }, { regulator: { short: "NoSource" }, details: { validity: { n: 2, unit: "years" }, url: null } }] };
  const claims = validityClaimsOf(research, "OET"); assert.equal(claims.length, 1); assert.match(claims[0].text, /^GMC's own page gives OET results a time limit of 2 years/); assert.equal(claims[0].link, "https://gmc.example/");
  assert.equal(factAnswer("Is the OET valid for 3 years?", { subjectFacts: FACTS, extra: { validity: claims } }).claims[0].link, "https://gmc.example/");
  assert.match(answerFitWhy("Is the OET valid for 3 years?", "It is valid for two years."), /who sets/);
});

/* ── Part 6 ── */
test("Part 6 C: the rules hold real rules: a name is not one; a duty beside a name is", () => {
  assert.match(partFitWhy("rules", "The NMC's certificate of current professional status is also called a letter of good standing or validation of registration."), /name, not a rule/);
  assert.equal(partFitWhy("rules", "The HCPC confirmation of registration status, also called a certificate of current professional status, may be needed when applying for registration."), null);
  assert.equal(partFitWhy("rules", "The NMC does not complete forms supplied by other authorities, so the certificate must be requested through its own portal."), null);
});
test("Part 6 F: a number on the page with no verified fact is named; the page's own button and related links are not facts", () => {
  const claims = [{ text: "Bookings close 24 days before; the fee is AU$120.", link: "https://oet.com/x" }, { text: "Results in 48 hours.", link: null }];
  const html = `<main><p>Bookings close 24 days before and it costs AU$ 120.</p><p>Results in 48 hours and a re-mark within 72 hours.</p><p data-cta><a data-cta>Try it free for 96 hours</a></p><section class="related"><a>Guide for 7 days</a></section></main>`;
  assert.deepEqual(numbersWithoutFact(html, claims), ["48 hours", "72 hours"], "a fact with no source counts as no fact");
  assert.deepEqual(numbersWithoutFact("<main><p>Nothing here to check.</p></main>", []), []);
  assert.deepEqual(numbersWithoutFact("<main><details><summary>Is OET valid for 3 years?</summary><p>Not said.</p></details></main>", []), [], "a question may name a number; an answer must hold it");
  const fit = fitParts([{ part: "topic", question: "When do results come?", claims: [{ text: "Results come in 48 hours.", link: null }] }], { requireSource: true }); assert.equal(fit.parts.length, 0); assert.match(fit.removed[0].why, /no source and date/);
});
test("Part 6 E: nurses and doctors stay needed: an open question is no council", () => {
  const html = `<main><h1>x</h1><details data-need-id="n--councils"><summary>Which council?</summary><p data-claim-id="a">Pakistan Nursing Council registers nurses in Pakistan.</p></details><details data-need-id="n--openCouncils"><summary>Not confirmed?</summary><p data-claim-id="b">Who registers doctors in Pakistan is still an open question: A Council's own page, checked ${ON}, does not say it registers them.</p></details></main>`;
  assert.ok(partsMissing(html, "country").includes("the doctors' council"));
});
test("Part 6 H: the page ledger speaks plain words", () => {
  const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"), ledger = /const ledgerHtml = [\s\S]*?\n/.exec(UI)[0];
  assert.ok(!/\bG\d{1,2}\b|\bC[12]\b|\bSERP\b|\bintents\b/.test(ledger.replace(/R\.\w+/g, "")), "no code in what the client reads");
});

/* ── Part 7 ── */
const created = (id, cost = SERP.pricePerSearch) => ({ status_code: 20100, status_message: "Task Created.", id, cost, result: null });
const standIn = ({ readyAfter = 1, spent = [] } = {}) => { let n = 0; const polls = new Map(); return { posted: () => n, fetchImpl: async (u, init) => { if (init?.method === "POST") { const tasks = JSON.parse(init.body); spent.push(u); return { json: async () => ({ status_code: 20000, tasks: tasks.map((t) => created(`id-${++n}-${t.keyword}`)) }) }; } const id = String(u).split("/").pop(), seen = (polls.get(id) ?? 0) + 1; polls.set(id, seen); return { json: async () => (seen < readyAfter ? { status_code: 20000, tasks: [{ status_code: 40602, status_message: "Task In Queue.", cost: 0 }] } : { status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ items: [{ type: "organic", url: "https://a.example/one", title: "One", description: "x" }, { type: "autocomplete", suggestion: "oet fees" }] }] }] }) }; } }; };
const ON_SWITCH = { on: true, capDay: 1, capMonth: 30 };
test("Part 7: the Standard queue: the right address and price, posted once, collected free; never live", () => {
  assert.match(SERP.url, /\/serp\/google\/organic\/task_post$/); assert.ok(!/live/.test(SERP.url)); assert.equal(SERP.pricePerSearch, 0.0006); assert.equal(ONPAGE.price, 0.00015); assert.match(ONPAGE.url, /\/on_page\/content_parsing\/live$/);
  const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), TP = readFileSync(new URL("../site/top-pages.mjs", import.meta.url), "utf8"); assert.ok(MAIN.includes("queue: {") && MAIN.includes("parse: st.on === true")); assert.ok(!/live\/advanced/.test(MAIN + TP + readFileSync(new URL("../desktop/serp.mjs", import.meta.url), "utf8")), "no live search anywhere");
});
test("Part 7: a search posted once is never paid twice: not when it is still waiting, not on the next run, not after a stop", async () => {
  const S = standIn({ readyAfter: 3 }), ledger = { spent: [] }, wanted = ["a", "b"].map((k) => ({ key: serpKey(k), q: k, task: [{ keyword: k }] }));
  const q = await queueSearches({ wanted, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW });
  assert.deepEqual([q.posted, S.posted()], [2, 2]); assert.equal(ledger.spent.length, 2); assert.ok(ledger.pending[serpKey("a")].id);
  const again = await queueSearches({ wanted, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW }); assert.equal(again.posted, 0, "already on its way"); assert.equal(S.posted(), 2);
  let c = await collectQueued({ ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW, maxMs: 0, everyMs: 0 }); assert.equal(c.waiting, 2, "not ready yet: it waits, paid"); assert.equal(ledger.spent.length, 2, "collecting costs nothing");
  c = await collectQueued({ ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW, maxMs: 1000, everyMs: 0, sleep: async () => {} }); assert.deepEqual([c.got, c.waiting], [2, 0]); assert.equal(ledger.serpCache[serpKey("a")].results[0].url, "https://a.example/one"); assert.equal(ledger.spent.length, 2);
  const r = await searchGoogle({ keyword: "a", settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: () => { throw new Error("paid again"); }, now: NOW }); assert.equal(r.cached, true);
});
test("Part 7: searchGoogle alone: posts, waits, returns; a pending one from an earlier run is only collected", async () => {
  const S = standIn(), ledger = { spent: [] }, r = await searchGoogle({ keyword: "x", settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW, poll: { everyMs: 0 } }); assert.equal(r.ok, true); assert.equal(S.posted(), 1); assert.equal(ledger.spent[0].cost, 0.0006);
  const S2 = standIn(), l2 = { spent: [], pending: { [serpKey("y")]: { id: "old", kind: "serp", at: NOW, cost: 0.0006, q: "y" } } }, r2 = await searchGoogle({ keyword: "y", settings: ON_SWITCH, ledger: l2, login: "l", password: "p", fetchImpl: S2.fetchImpl, now: NOW, poll: { everyMs: 0 } }); assert.equal(r2.ok, true); assert.equal(S2.posted(), 0, "already paid"); assert.equal(l2.spent.length, 0);
  const S3 = standIn(), l3 = { spent: [] }, a = await autocompleteIn({ keyword: "oet kya hai", country: "Pakistan", settings: ON_SWITCH, ledger: l3, login: "l", password: "p", fetchImpl: S3.fetchImpl, now: NOW, poll: { everyMs: 0 } }); assert.deepEqual([a.ok, a.phrases], [true, ["oet fees"]]); assert.match(String(S3.posted()), /1/); assert.equal(l3.spent[0].what, "autocomplete");
});
test("Part 7: a saved answer of only Google's redirect links is bought once more, marked, never a third time; a good one is never bought again", async () => {
  const S = standIn(), goog = { ok: true, results: [{ url: "https://google.com/goto?url=a" }, { url: "https://google.com/goto?url=b" }, { url: "https://real.example/" }], paa: [], related: [], at: NOW }, ledger = { spent: [], serpCache: { [serpKey("bad")]: goog, [serpKey("good")]: { ...goog, results: [{ url: "https://real.example/" }] } } }, wanted = ["bad", "good"].map((k) => ({ key: serpKey(k), q: k, task: [{ keyword: k }] }));
  assert.equal((await queueSearches({ wanted, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW })).posted, 1);
  await collectQueued({ ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW, everyMs: 0 }); assert.equal(ledger.serpCache[serpKey("bad")].again, true);
  ledger.serpCache[serpKey("bad")].results = goog.results; assert.equal((await queueSearches({ wanted, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW })).posted, 0, "never a third time");
  const off = await searchGoogle({ keyword: "q", settings: {}, ledger: { spent: [], serpCache: { [serpKey("q")]: goog } }, fetchImpl: () => { throw new Error("bought while off"); }, now: NOW }); assert.equal(off.cached, true, "with the switch off what is kept is still reused free");
});
test("Part 7 (found by the live proof): 'No Search Results' is an answer, kept: never posted a second time; a run never posts again what it posted", async () => {
  let posts = 0; const fetchImpl = async (u, init) => { if (init?.method === "POST") { posts++; return { json: async () => ({ status_code: 20000, tasks: JSON.parse(init.body).map((t, i) => created(`x${i}`)) }) }; } return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 40102, status_message: "No Search Results.", cost: 0 }] }) }; };
  const ledger = { spent: [] }, k = "how to book oet in ghana", w = [{ key: autoKey(k, "Ghana"), q: k, kind: "auto", task: autoTask(k, "Ghana") }];
  await queueSearches({ wanted: w, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl, now: NOW }); await collectQueued({ ledger, login: "l", password: "p", fetchImpl, now: NOW, everyMs: 0 });
  assert.equal(ledger.serpCache[autoKey(k, "Ghana")].empty, true); const a = await autocompleteIn({ keyword: k, country: "Ghana", settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl, now: NOW, wait: false }); assert.deepEqual([a.ok, a.phrases, posts], [true, [], 1]);
  assert.equal((await queueSearches({ wanted: w, settings: ON_SWITCH, ledger, login: "l", password: "p", fetchImpl, now: NOW })).posted, 0);
  const l2 = { spent: [] }; assert.equal((await searchGoogle({ keyword: "not posted", settings: ON_SWITCH, ledger: l2, login: "l", password: "p", fetchImpl, now: NOW, wait: false })).ok, false); assert.equal(await autocompleteIn({ keyword: "z", country: "Ghana", settings: ON_SWITCH, ledger: l2, login: "l", password: "p", fetchImpl, now: NOW, wait: false }).then(() => posts), 1, "the page step only collects");
});
test("Part 7 (found by the live proof): a cut-off address is never read; what is searched is the page's subject, not its heading; tables in either shape; a failed read books what was charged", async () => {
  const r = readSerp({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.0006, result: [{ items: [{ type: "organic", url: "https://google.com/goto?url=x", breadcrumb: "https://a.example › how-can-i-check-oet-test-centr...", title: "t" }, { type: "organic", url: "https://google.com/goto?url=y", breadcrumb: "https://b.example › guides › oet", title: "u" }] }] }] });
  assert.equal(r.results[0].url, "https://google.com/goto?url=x", "a cut breadcrumb stays the redirect, unread"); assert.equal(r.results[1].url, "https://b.example/guides/oet"); assert.equal(notForReading("https://a.example/how-can-i-check-oet-test-centr..."), true);
  assert.equal(searchTermOf({ title: "OET in the United Kingdom: fee, centres and councils" }), "OET in the United Kingdom"); assert.equal(searchTermOf({ title: "What is OET? The test, its fee and the scores asked" }), "What is OET?"); assert.equal(searchTermOf({ title: "OET Result" }), "OET Result");
  const row = { row_cells: [{ text: "A" }, { text: "B" }] }; assert.equal(blocksOfContent({ page_content: { main_topic: [{ table_content: [{ header: [row], body: [row] }] }] } }).blocks.tables, 1); assert.equal(blocksOfContent({ page_content: { main_topic: [{ table_content: { body: [row] } }] } }).blocks.columns[0][1], "B"); assert.equal(blocksOfContent({ page_content: { main_topic: [{ table_content: null }] }, page_as_markdown: "| a | b |\n| --- | --- |\n| 1 | 2 |" }).blocks.tables, 1);
  const ledger = { spent: [] }; await parseTopPage({ url: "https://a.example/", settings: ON_SWITCH, ledger, login: "l", password: "p", now: NOW, fetchImpl: async () => ({ json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.00015, result: [{ items: [{ status_code: 404, page_content: null }] }] }] }) }) }); assert.deepEqual([ledger.spent[0].cost, ledger.spent[0].ok, ledger.spent[0].why], [0.00015, false, "the page answered 404"]);
});
test("Part 7 (found by the live proof): a page's local questions do not wait for its own search", async () => {
  const fetchImpl = async (u, init) => { if (init?.method === "POST") return { json: async () => ({ status_code: 20000, tasks: JSON.parse(init.body).map((t, i) => created(`${String(u).includes("autocomplete") ? "a" : "s"}${i}`)) }) }; return { json: async () => (String(u).includes("autocomplete") ? { status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ items: [{ type: "autocomplete", suggestion: "oet fees in ghana" }] }] }] } : { status_code: 20000, tasks: [{ status_code: 40602, status_message: "Task In Queue.", cost: 0 }] }) }; };
  const p = { kind: "country", country: "Ghana", title: "OET in Ghana: fee, centres and councils", items: [], questions: [] }; await searchPages({ pages: [p], ledger: { spent: [] }, settings: ON_SWITCH, login: "l", password: "p", now: NOW, fetchImpl, queue: { everyMs: 0, maxMs: 0 }, subject: "OET", sleep: async () => {} });
  assert.deepEqual(p.localAsked, ["oet fees in ghana"]); assert.match(p.serpWhy, /still being prepared/);
});
test("Part 7: the cap holds: only what it allows is sent; a whole post is never let through", async () => {
  const S = standIn(), ledger = { spent: [{ on: NOW, cost: 0.1988 }] }, wanted = ["a", "b", "c", "d"].map((k) => ({ key: serpKey(k), q: k, task: [{ keyword: k }] }));
  const q = await queueSearches({ wanted, settings: { on: true, capDay: 0.2 }, ledger, login: "l", password: "p", fetchImpl: S.fetchImpl, now: NOW }); assert.equal(q.posted, 2, "$0.0012 was left"); assert.match(q.stop, /cap is reached/); assert.ok(ledger.spent.reduce((t, x) => t + x.cost, 0) <= 0.2 + 1e-9);
  const off = await queueSearches({ wanted, settings: {}, ledger: { spent: [] }, login: "l", password: "p", fetchImpl: () => { throw new Error("bought while off"); }, now: NOW }); assert.equal(off.off, true);
  const noLogin = await queueSearches({ wanted, settings: ON_SWITCH, ledger: { spent: [] }, fetchImpl: () => { throw new Error("sent with no login"); }, now: NOW }); assert.match(noLogin.stop, /login/);
});
test("Part 7: On-Page parsing: structure only, never a sentence; a cost booked; the cap holds; a failure costs nothing", async () => {
  const item = { page_content: { main_topic: [{ h_title: "OET fees 2026", main_title: "OET fees 2026", primary_content: [{ text: "SECRET SENTENCE one two three", urls: [{ anchor_text: "Book now", url: "https://x" }] }], table_content: { header: [{ row_cells: [{ text: "Country" }, { text: "Fee" }] }], body: [{ row_cells: [{ text: "India" }, { text: "587" }] }] } }, { h_title: "How much is it?", primary_content: [{ text: "more" }] }, { h_title: "Tips for test day", primary_content: [] }], comments: [{ title: "hi" }] }, page_as_markdown: "intro\n1. First\n2. Second\n3. Third\nend" };
  const b = blocksOfContent(item, { title: "OET fees 2026" }); assert.deepEqual([b.blocks.tables, b.blocks.columns[0], b.blocks.steps, b.blocks.faqs, b.blocks.action, b.blocks.comments, b.blocks.year, b.blocks.tips, b.blocks.via], [1, ["Country", "Fee"], 3, 1, true, true, true, true, "on-page"]); assert.deepEqual(b.blocks.cannotSee, ["search", "foldouts"]); assert.ok(!JSON.stringify(b).includes("SECRET"), "its text is never kept");
  const ledger = { spent: [] }, ok = await parseTopPage({ url: "https://a.example/", settings: ON_SWITCH, ledger, login: "l", password: "p", now: NOW, fetchImpl: async () => ({ json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.00015, result: [{ items: [item] }] }] }) }) }); assert.equal(ok.ok, true); assert.deepEqual([ledger.spent[0].cost, ledger.spent[0].what], [0.00015, "top page read"]);
  const bad = await parseTopPage({ url: "https://b.example/", settings: ON_SWITCH, ledger, login: "l", password: "p", now: NOW, fetchImpl: async () => ({ json: async () => ({ status_code: 20000, tasks: [{ status_code: 40501, status_message: "no", cost: 0 }] }) }) }); assert.equal(bad.ok, false); assert.equal(ledger.spent.at(-1).cost, 0);
  const capped = await parseTopPage({ url: "https://c.example/", settings: { on: true, capDay: 0.0001 }, ledger: { spent: [] }, login: "l", password: "p", now: NOW, fetchImpl: () => { throw new Error("sent past the cap"); } }); assert.equal(capped.capped, true);
  const off = await parseTopPage({ url: "https://c.example/", settings: {}, ledger: { spent: [] }, fetchImpl: () => { throw new Error("sent while off"); } }); assert.equal(off.off, true);
});
test("Part 7: a run posts everything first, each top page parsed once and reused, and a page it cannot parse is read as before", async () => {
  const calls = { post: 0, parse: 0 }, item = { page_content: { main_topic: [{ h_title: "Fees", primary_content: [{ text: "a b c" }] }] } };
  const fetchImpl = async (u, init) => { if (String(u).includes("content_parsing")) { calls.parse++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.00015, result: [{ items: [item] }] }] }) }; } if (init?.method === "POST") { const tasks = JSON.parse(init.body); calls.post += tasks.length; return { json: async () => ({ status_code: 20000, tasks: tasks.map((t, i) => created(`t${calls.post}-${i}`)) }) }; } return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ items: [{ type: "organic", url: "https://top.example/one", title: "One" }] }] }] }) }; };
  const ledger = { spent: [] }, tops = {}, pages = [{ kind: "topic", title: "OET fees", items: [], questions: [] }, { kind: "topic", title: "OET booking", items: [], questions: [] }];
  const out = await searchPages({ pages, ledger, settings: ON_SWITCH, login: "l", password: "p", now: NOW, fetchImpl, queue: { everyMs: 0, maxMs: 1000 }, parse: true, subject: "OET", concurrency: 2, sleep: async () => {}, topCache: { get: (u) => tops[u] ?? null, set: (u, v) => { tops[u] = v; } }, readHtml: async () => { throw new Error("read although parsed"); } });
  assert.equal(calls.post, 6, "three searches a page, posted together"); assert.equal(calls.parse, 1, "the same page for two pages is read once"); assert.equal(pages[0].blueprint.urls[0].blocks.via, "on-page"); assert.equal(out.read, 2);
  const again = { post: calls.post, parse: calls.parse }; await searchPages({ pages: [{ kind: "topic", title: "OET fees", items: [], questions: [] }], ledger, settings: ON_SWITCH, login: "l", password: "p", now: NOW, fetchImpl, queue: { everyMs: 0, maxMs: 1000 }, parse: true, subject: "OET", topCache: { get: (u) => tops[u] ?? null, set: () => {} } }); assert.deepEqual([calls.post, calls.parse], [again.post, again.parse], "the next run reuses all of it, free");
});
test("Part 7: the server collector: queue, nothing paid twice, the same caps", async () => {
  const src = readFileSync(new URL("../site/top-pages.mjs", import.meta.url), "utf8");
  assert.match(src, /PENDING_KEY = "av:tp:pending"/); assert.match(src, /delete pending\[/); assert.match(src, /budget0\.spent \+ out\.cost \+ ONPAGE\.price <= caps\.budget/); assert.match(src, /spent\.usd \+ out\.cost \+ ONPAGE\.price <= caps\.usd/);
  assert.ok(typeof runTopPages === "function");
});
test("the facts beta-g checked on OET's own pages stay exactly so", () => {
  assert.equal(priceHere("a re-mark costs AU$120 (US$95 in the US) per sub-test.", "India"), "a re-mark costs AU$120 per sub-test."); assert.equal(priceHere("a re-mark costs AU$120 (US$95 in the US) per sub-test.", "United States"), "a re-mark costs US$95 per sub-test.");
  const got = subjectFactsOf([{ ok: true, url: "https://oet.com/test/book-a-test", checkedOn: ON, text: "Test on Paper close 24 days before. OET on Computer and OET@Home bookings close 7 days before the test date. Results for the Test on Computer are released in as little as 48 hours after all sub-tests, 95% released within 6 calendar days. as little as 5 days after the test date for candidates tested in India and the Philippines and from 13 days after the test date for all other regions" }, { ok: true, url: "https://oet.com/test/book-a-test/manage-your-booking", checkedOn: ON, text: "Up to the booking closing date. AU$120 After the booking closing date. AU$200 Up to 7 days before the test AU$120 US$95 Less than 7 days before the test AU$200 US$155" }, { ok: true, url: "https://oet.com/remarking-policy", checkedOn: ON, text: "You can request for re-marking within 72 hours from when your results are released. AU$120 (Global, except US) / US$95 (US only) per sub-test" }], "OET");
  assert.match(got.bookPaperCloses.text, /24 days/); assert.match(got.bookComputerCloses.text, /7 days/); assert.match(got.resultsComputer.text, /48 hours/); assert.match(got.results95.text, /95%.*6 calendar days/); assert.match(got.resultsPaper.text, /13 days/); assert.match(got.resultsIndia.text, /5 days/); assert.match(got.changeFee.text, /AU\$120 up to the booking closing date and AU\$200 after/); assert.match(got.changeFeeComputer.text, /AU\$120 \(US\$95 in the US\) up to 7 days before the test and AU\$200 \(US\$155 in the US\)/); assert.match(got.remarkHours.text, /72 hours/); assert.match(got.remarkFee.text, /AU\$120 \(US\$95 in the US\) per sub-test/);
  assert.ok(!/\b12 days\b/.test(JSON.stringify(got)));
});
test("askedOf: every question heard, with its kind; a question not yet shown stays out", () => {
  const got = askedOf({ India: { questions: [{ status: "confirmed", value: { question: "Q one?", answer: "A", answerKind: "guidance" }, source: "https://b.example/", readOn: ON }, { status: "unconfirmed", value: { question: "Hidden?" } }, { status: "approved", value: { question: "Q two?", answerKind: "official" }, source: "http://not-https/", readOn: ON }] } });
  assert.deepEqual(got.India.map((x) => [x.question, x.kind, x.link]), [["Q one?", "guidance", "https://b.example/"], ["Q two?", "official", null]]);
  assert.equal(openLine({ name: "X", people: "nurses", place: "India", why: "unread", on: ON }), `Who registers nurses in India is still an open question: X's own page could not be read on ${ON}.`);
});

/* ── the owner's addition, 3 Nov 2026 ── */
test("X1: the paid cap never stops a page: said as more data later, the page carries on; nothing is bought past it", async () => {
  const pages = [{ kind: "topic", title: "OET fees", items: [], questions: [] }, { kind: "topic", title: "OET booking", items: [], questions: [] }], ledger = { spent: [{ on: NOW, cost: 1 }] };
  const out = await searchPages({ pages, ledger, settings: { on: true, capDay: 1 }, login: "l", password: "p", now: NOW, fetchImpl: () => { throw new Error("bought past the cap"); }, queue: { everyMs: 0, maxMs: 0 }, subject: "OET" });
  assert.ok(pages.every((p) => p.serpWhy === CAP_LATER), JSON.stringify(pages.map((p) => p.serpWhy))); assert.ok(!/cap is reached/.test(JSON.stringify(pages))); assert.ok(out.line.endsWith(CAP_LATER));
  const SEO = readFileSync(new URL("../desktop/seo-pages.mjs", import.meta.url), "utf8"); assert.match(SEO, /d\.checkLater = m\.route === "none" \|\| Boolean\(m\.serpWhy\)/, "checked later, never a failed check"); assert.ok(!/serpWhy[^;]*push\("H"/.test(SEO));
  const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.ok(MAIN.includes('pwrite(id, "pending-checks.json"'), "the next day the app reads them itself"); assert.ok(MAIN.includes("p.serpWhy === CAP_LATER ? CAP_LATER"));
  assert.ok(!/answers its whole intent/.test(SEO + MAIN), "the old words are gone");
});
test("X2: a combination stays a page only with something of its own; the reason is kept either way", () => {
  const big = { kind: "country", country: "Ghana", title: "OET in Ghana", items: [{ part: "councils", claims: [{ text: "Vet Council registers vets in Ghana." }] }], links: [] }, prof = { kind: "profession", profession: "veterinary science", title: "OET for Vets", questions: [], items: [], links: [] };
  const thin = { kind: "origin-profession", type: "D", country: "Ghana", profession: "veterinary science", title: "OET for Vets from Ghana", home: big.title, prof: prof.title, questions: [], items: [{ part: "council", claims: [{ text: "Vet Council registers vets in Ghana." }] }, { part: "standing", claims: [{ text: "x" }] }, { part: "destinations", claims: [{ text: "y" }] }, { part: "fee", claims: [{ text: "z" }] }, { part: "questions0", question: "q", claims: [{ text: "w" }] }] };
  const none = { ...thin, title: "OET for Vets in Zimbabwe", items: [] }, own = { ...thin, title: "OET for Vets with its own rule", items: thin.items.map((i, n) => ({ ...i, claims: [{ text: `only here ${n}` }] })) };
  const plan = { pages: [big, prof, thin, none, own], merged: [], bigger: { countryPages: [big], profPages: [prof] } }; settleLocal(plan);
  assert.ok(plan.pages.some((p) => p.title === "OET for Vets with its own rule" && /neither the country page nor the profession page/.test(p.keptWhy)));
  assert.ok(!plan.pages.some((p) => p.title === "OET for Vets in Zimbabwe")); assert.match(plan.merged.find((m) => m.title === "OET for Vets in Zimbabwe").why, /cannot answer/); assert.ok(plan.merged.every((m) => m.why && m.into.length));
});
test("X3: what top pages cover goes through the same filter: every line the owner found, and clear questions stay", () => {
  for (const junk of ["Interested in Computer Science ?", "How UNILINKSOLUTIONS prepares you for the OET", "Want to know more?", "Must Read Articles", "How we researched", "What you can expect to study", "Why should I have an eye test?", "What is the starting salary for an MBBS doctor in Ireland?", "How long is a medical degree?", "Which English test are you planning to take?", "Who This OET Optometry Tutoring Is For", "How Much Does an OET Optometry Tutor Cost?", "What a Typical OET Optometry Session Looks Like", "OET Course Near Me?", "How does UNILINK help with OET?", "Is NCLEX accepted in Ireland?"]) assert.ok(suggestionWhy(junk, { subject: "OET" }), junk);
  for (const good of ["Is OET harder than IELTS?", "How can I book an OET Test in medicine?", "What ID can I use to book and sit the OET Test?", "How early should I book my OET exam?"]) assert.equal(suggestionWhy(good, { subject: "OET" }), null, good);
  assert.match(suggestionWhy("How to book the OET test", { subject: "OET" }), /a heading/, "on its topic, but a heading: it is no question"); assert.match(suggestionWhy("Is OET accepted in India?", { subject: "OET", place: "Ghana" }), /another country/);
  const SEO = readFileSync(new URL("../desktop/seo-pages.mjs", import.meta.url), "utf8"); assert.match(SEO, /\.map\(\(c\) => c\.topic\)\.filter\(\(c\) => m\.category !== "exam" \|\| !suggestionWhy/); assert.match(SEO, /const incomplete = \[\.\.\.\(missing\.length/, "only a missing core question blocks"); assert.ok(!/incomplete = [^;]*uncovered/.test(SEO), "a suggestion never blocks");
});
test("X4: coaching is preparation, never a promised centre; a sentence said once; the retry stays and the page carries on", async () => {
  const facts = { practiceEvery: F("practiceEvery", "OET's own page recommends one practice test every 2-3 weeks."), sampleTests: FACTS.sampleTests };
  const plan = examPlan({ subject: "OET", facts: [], subjectFacts: facts, demand: [{ text: "oet coaching centre near me", source: "s", weight: 9 }, { text: "oet practice test", source: "s", weight: 5 }] });
  assert.ok(!JSON.stringify(plan.pages.map((p) => p.title)).includes("Coaching"), "no page promises a coaching centre"); assert.ok(plan.pages.some((p) => p.title === "OET Preparation Online"));
  const long = "For an OET taken on or after 23 April 2026, Ahpra's National Boards ask for these scores.", out = oneSentenceOnce([{ part: "topic", question: "A?", claims: [{ text: long }] }, { part: "questions1", question: "B?", claims: [{ text: `${long} And another thing is said right here today.` }] }, { part: "questions2", question: "C?", claims: [{ text: long }] }, { part: "scores", question: "D?", claims: [{ text: long }] }]);
  assert.deepEqual(out.map((x) => x.question), ["A?", "B?", "D?"]); assert.equal(out[1].claims[0].text, "And another thing is said right here today.");
  let posts = 0, tries = 0; const fetchImpl = async (u, init) => { if (init?.method === "POST") { posts += JSON.parse(init.body).length; return { json: async () => ({ status_code: 20000, tasks: JSON.parse(init.body).map((t, i) => created(`p${posts}-${i}`)) }) }; } tries++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 50000, status_message: "Internal SE Server Error.", cost: 0 }] }) }; };
  const p = { kind: "topic", title: "OET Singapore", items: [], questions: [] }, r = await searchPages({ pages: [p], ledger: { spent: [] }, settings: ON_SWITCH, login: "l", password: "p", now: NOW, fetchImpl, queue: { everyMs: 0, maxMs: 0 }, subject: "OET", sleep: async () => {} });
  assert.equal(posts, 9, "tried three times in all, three searches each"); assert.ok(p.serpWhy, "said on the page"); assert.equal(r.read, 0, "and the run carries on");
});

/* ── X5 ── */
test("X5: writing the pages runs on its own thread, gives the same pages, and carries on if the thread cannot start", async () => {
  const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), BUILD = readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8");
  assert.ok(!/const pages = seoPages\(\{ site, target: pread\(id, "publish\.json"\)\?\.kind \?\? null, searchConsole: sc, files, youtube: yt\?\.state/.test(MAIN), "the run does not write pages on the window's thread"); assert.match(MAIN, /const pages = await writePages\(\);/); assert.match(MAIN, /const again = await writePages\(\);/); assert.match(BUILD, /"pages-off\.mjs", "pages-worker\.mjs"/, "both are in the Setup");
  const { seoPagesOff, extrasFrom } = await import("../desktop/pages-off.mjs"), { seoPages } = await import("../desktop/seo-pages.mjs");
  const site = { ok: true, origin: "https://x.example", readOn: ON, pages: [{ url: "https://x.example/", title: "X", h1: "X", h2: [], qa: [], facts: [], prices: [], images: [], words: 100 }], design: {}, shell: null, robotsTxt: null, sitemapUrls: null }, args = { site, on: NOW, subject: "OET", pagePlan: [{ kind: "topic", title: "OET Fees", questions: [], items: [{ part: "topic", question: "How much is OET?", claims: [{ claimId: "a", text: "OET costs AU$587 for the full test, four sub-tests in all.", link: "https://oet.com/a", readOn: ON, source: "OET", official: true }] }], links: [] }] }, data = { fitSubject: "OET" };
  const off = await seoPagesOff({ args, data, sync: () => { throw new Error("the thread should have done it"); } }), here = seoPages({ ...args, ...extrasFrom(data) }); assert.equal(off.drafts.length, 1); assert.deepEqual(off.drafts.map((d) => [d.title, d.html, d.readyAsDraft]), here.drafts.map((d) => [d.title, d.html, d.readyAsDraft]), "the same pages both ways");
  let usedSync = false; const r = await seoPagesOff({ args, data, sync: () => { usedSync = true; return { fromHere: true }; }, workerUrl: new URL("file:///no/such/worker.mjs") }); assert.equal(usedSync, true); assert.equal(r.fromHere, true);
  const bad = await seoPagesOff({ args: { ...args, on: () => 1 }, data, sync: () => ({ fromHere: "cannot be sent" }) }); assert.equal(bad.fromHere, "cannot be sent", "what cannot cross to the thread is made here");
});
test("X5: the Pages screen's list is short; a page's details come only when it is opened", async () => {
  const { pageRow } = await import("../desktop/plain-words.mjs"), huge = "x".repeat(50000), row = pageRow({ url: "u", title: "T", type: "A", readyAsDraft: true, html: huge, recipe: { a: huge }, ledger: [huge], truth: { removed: [huge] }, gates: [huge], blocks: { line: huge } }); assert.deepEqual(Object.keys(row).filter((k) => row[k] !== undefined).sort(), ["readyAsDraft", "title", "type", "url"]); assert.ok(JSON.stringify(row).length < 200);
  const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  assert.match(MAIN, /drafts: \(preadMemo\(id, "pages\.json"\)\?\.drafts \?\? \[\]\)\.map\(pageRow\)/); assert.ok(!/why: plainWhy\(d\), live:[^}]*ledger:/.test(MAIN), "the list of reasons carries no ledger"); assert.match(MAIN, /r\[2\] === "pages-row"/); assert.match(MAIN, /\|pages-view\|pages-row\|/);
  assert.match(UI, /\[data-more\]"\)\.forEach\(\(box\) => box\.addEventListener\("toggle"/); assert.ok(!/\$\{ledgerHtml\(rowOf\(d\.url\)/.test(UI), "no ledger built with the list");
});
