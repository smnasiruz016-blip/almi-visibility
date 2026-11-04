/**
 * 🔴 RR-367 (owner, 3 Nov 2026: 181 profession × country pages merged into 53 is rejected). R-A an unconfirmed office with a real source is shown; R-B one office serves several; R-C a page is its own questions, answers and profession. A gap is researched, never a reason to drop a page. No paid call here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { councilFacts, councilKey, officeLine, councilLineWhy } from "../desktop/council-truth.mjs";
import { examPlan, settleLocal, serviceFactsOf } from "../desktop/exam-plan.mjs";
import { classOfPhrase, phraseOutWhy, answerQuestion, shownWording, ASK_OF_CLASS } from "../desktop/answer-ladder.mjs";
import { subjectFactsOf } from "../desktop/subject-facts.mjs";
import { duplicationReview } from "../desktop/recipe.mjs";
import { partsMissing } from "../desktop/page-quality.mjs";
import { professionRegistered } from "../desktop/page-plan.mjs";
import { takeBrowserReads, browserInstruction } from "../desktop/browser-list.mjs";

const ON = "2026-11-03", OLD = "2026-10-27", read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const fact = (name, prof, c = "India", extra = {}) => ({ id: `${c}${prof}`, part: "home-council", country: c, profession: prof, councilName: name, text: `${name} registers ${prof} in ${c}.`, link: "https://x.example/contact", on: OLD, verified: true, address: "1 Road, Delhi.", website: "https://x.example/", ...extra });
const F = (key, text) => ({ claimId: `subject-${key}`, fact: key, text, link: `https://oet.com/${key}`, readOn: ON, source: "OET", official: true });

test("R-A: a body not confirmed, with an address or contact from a real source, is SHOWN with that source and date: no open question, never 'registers'", () => {
  const cases = [["not stated", "Some Board"], ["unread", "Indian Nursing Council"], ["association", "Indian Dietetic Association"]];
  for (const [why, name] of cases) { const { facts, changes } = councilFacts([fact(name, "nursing")], { [councilKey("India", "nursing", name)]: { ok: false, why, page: "https://x.example/a", on: ON } }, { today: ON, peopleOf: () => "nurses" }); const f = facts[0];
    assert.equal(f.part, "home-council", why); assert.equal(f.office, true); assert.equal(f.link, "https://x.example/contact", "the source it was found on"); assert.equal(f.on, OLD, "with that date");
    assert.ok(f.text.startsWith(`Office for nurses in India: ${name}`)); assert.match(f.text, /1 Road, Delhi/); assert.match(f.text, /https:\/\/x\.example\//); assert.match(f.text, /not confirmed yet/); assert.equal(councilLineWhy(f.text), null); assert.ok(!/\bregisters\b/.test(f.text), "never says it registers"); assert.equal(changes.length, 1); }
  assert.match(councilFacts([fact("Indian Dietetic Association", "dietetics")], null, { today: ON }).facts[0].text, /\(a professional body\)/);
  const bare = councilFacts([fact("Lost Board", "nursing", "India", { address: null, website: null })], { [councilKey("India", "nursing", "Lost Board")]: { ok: false, why: "not stated", page: "https://x.example/", on: ON } }, { today: ON }).facts[0]; assert.equal(bare.part, "open-council", "with nothing to show, the honest open line stays");
  const yes = councilFacts([fact("Good Council", "nursing")], { [councilKey("India", "nursing", "Good Council")]: { ok: true, evidence: "https://x.example/about", on: ON } }, { today: ON }).facts[0]; assert.match(yes.text, /registers/); assert.equal(yes.link, "https://x.example/about");
  assert.match(officeLine({ name: "N", people: "nurses", place: "India" }), /^Office for nurses in India: N\. Whether/);
});
test("R-A: the page's core part counts an office: India's nurses' office keeps the page whole", () => {
  assert.equal(professionRegistered("Office for nurses in India: Indian Nursing Council, Delhi. Whether it is the registering body is not confirmed yet."), "nursing");
  const html = (x) => `<main><h1>t</h1><details data-need-id="n--councils"><summary>Which?</summary><p data-claim-id="a">${x}</p><p data-claim-id="b">National Medical Commission registers doctors in India.</p></details></main>`;
  assert.ok(!partsMissing(html("Office for nurses in India: Indian Nursing Council, Delhi. Whether it is the registering body is not confirmed yet."), "country").includes("the nurses' council"));
});
test("R-B: one office serving several professions stands on every page it serves", () => {
  const facts = ["physiotherapy", "dietetics", "optometry"].map((p) => fact("Allied Health Council", p, "Pakistan")), { facts: out } = councilFacts(facts, Object.fromEntries(facts.map((f) => [councilKey("Pakistan", f.profession, "Allied Health Council"), { ok: false, why: "not stated", page: "https://x.example/", on: ON }])), { today: ON });
  assert.equal(out.length, 3); assert.equal(out.filter((f) => f.part === "home-council").length, 3);
});
const plan = (extra = {}) => examPlan({ subject: "OET", professions: ["nursing", "dietetics"], countries: ["Nepal"], rates: { date: ON, rates: { NPR: 100 }, short: "R", link: "https://r.example/" }, subjectFacts: { scale: F("scale", "OET's own page: each sub-test is reported on a scale from 0 to 500."), professions12: F("professions12", "OET's own page: OET is made for 12 healthcare professions: medicine, nursing, dentistry, dietetics, pharmacy."), resultsPaper: F("resultsPaper", "OET's own page: results for the test on paper come from 13 days after the test date.") }, facts: [{ verified: true, id: "f", part: "fee", country: "Nepal", text: "OET costs AUD 587.", link: "https://oet.com/f", on: ON, official: "AUD 587" }, { verified: true, id: "c", part: "centres", country: "Nepal", text: "OET can be taken at a test venue in Nepal.", link: "https://oet.com/v", on: ON }, fact("Nepal Nursing Council", "nursing", "Nepal", { office: true, checkedWhy: "unread", checkedOn: ON, text: "Office for nurses in Nepal: Nepal Nursing Council. Whether it is the registering body is not confirmed yet." })], collector: [{ kind: "country-profession", country: "Nepal", profession: "nursing" }, { kind: "country-profession", country: "Nepal", profession: "dietetics" }, { kind: "country-profession", country: "Zimbabwe", profession: "veterinary science" }], maxCountries: 50, ...extra });
test("R-C: every combination comes back, with no council, score or question yet; nothing merged for a gap", () => {
  const p = plan(); settleLocal(p); const titles = p.pages.map((x) => x.title);
  for (const t of ["OET for Nurses from Nepal", "OET for Dietitians from Nepal", "OET for Vets from Zimbabwe"]) assert.ok(titles.includes(t), t); assert.ok(!p.merged.some((m) => m.type === "C" || m.type === "D"));
});
test("each page is rich: its office, registration, score, its own questions, fee and centres; a gap is an honest line with the page and its date, on the body's own page", () => {
  const p = plan(), d = p.pages.find((x) => x.title === "OET for Nurses from Nepal"), parts = d.items.map((i) => i.part.replace(/\d+$/, ""));
  for (const k of ["council", "regulator", "standing", "destinations", "fee", "centres"]) assert.ok(parts.includes(k), k); assert.equal(d.questionsWanted, true, "RR-369 Part 4: no real question yet: none of ours; the page stays, marked"); assert.ok(d.items.find((i) => i.part === "council").claims[0].text.startsWith("Office for nurses"));
  const gap = d.items.find((i) => i.part === "standing").claims[0]; assert.match(gap.text, /Nepal Nursing Council's own page could not be read on 2026-11-03; this is still being looked for\./, "reader blocked is said as such, never as a fact"); assert.equal(gap.link, "https://x.example/contact");
  const noOffice = p.pages.find((x) => x.title === "OET for Dietitians from Nepal"); assert.match(noOffice.items.find((i) => i.part === "council").claims[0].text, /OET's official page, checked 2026-11-03, does not say this\./, "with no office found the honest line stands");
});
test("R-C: a duplicate is the same questions and answers for the same profession and country; a shared text alone is not", () => {
  const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" "), pages = [{ url: "a", title: "A", intent: "a", text: long, facts: ["x"], identity: "nursing|Nepal" }, { url: "b", title: "B", intent: "b", text: long, facts: ["x"], identity: "dietetics|Nepal" }, { url: "c", title: "Country", intent: "c", text: long, facts: ["x"], identity: null }, { url: "d", title: "D", intent: "a", text: long, facts: ["x"], identity: "nursing|Nepal" }];
  const r = duplicationReview(pages); assert.equal(r.get("b").verdict, "distinct"); assert.equal(r.get("c").verdict, "distinct"); assert.equal(r.get("a").verdict, "duplicate"); assert.equal(r.get("d").verdict, "duplicate");
});
test("item 4: what we can answer is used: 'oet is accepted in which countries', 'oet uk', 'oet uk number', 'oet examples'", () => {
  const O = { subject: "OET", country: "United Kingdom" }; assert.equal(classOfPhrase("oet is accepted in which countries", O), "recognised"); assert.equal(classOfPhrase("oet uk", O), "what"); assert.equal(classOfPhrase("oet exam pakistan", { subject: "OET", country: "Pakistan" }), "what"); assert.equal(classOfPhrase("oet uk number", O), "contact"); assert.equal(classOfPhrase("oet uk contact", O), "contact"); assert.equal(classOfPhrase("oet test example", O), "practice"); assert.equal(classOfPhrase("oet examples", O), "practice");
  assert.equal(phraseOutWhy("oet uk contact", { country: "United Kingdom", subject: "OET", skipWhy: () => "people want another website" }), null, "the official contact page answers it"); assert.ok(phraseOutWhy("oet uk login", { country: "United Kingdom", subject: "OET", skipWhy: () => null }));
  const facts = subjectFactsOf([{ ok: true, url: "https://oet.com/contact-us", checkedOn: ON, text: "Call +61 3 8658 3963 (AU) Mon - Fri" }, { ok: true, url: "https://oet.com/test/who-recognises-oet", checkedOn: ON, text: "OET Test results are accepted as proof of English language skills worldwide." }], "OET"); assert.match(facts.contact.text, /\+61 3 8658 3963/); assert.match(facts.recognised.text, /worldwide/);
  const ctx = { subject: "OET", subjectFacts: { ...facts, purpose: F("purpose", "OET's own page: OET tests the English of healthcare professionals."), sampleTests: F("sampleTests", "OET's own page offers sample tests to practise with.") }, edge: [{ text: "AlmiOET is our own practice site.", link: "https://a.example/", readOn: ON, ownProduct: true }], pages: [] };
  assert.match(answerQuestion("oet uk number", ctx).claims[0].text, /\+61/); assert.match(answerQuestion("oet is accepted in which countries", ctx).claims[0].text, /directory/); assert.match(answerQuestion(ASK_OF_CLASS("what", "OET"), ctx).claims[0].text, /tests the English/); assert.match(answerQuestion("oet examples", ctx).claims.map((c) => c.text).join(" "), /AlmiOET/);
  assert.match(read("desktop/subject-facts.mjs"), /"https:\/\/oet\.com\/contact-us", "https:\/\/oet\.com\/test\/who-recognises-oet"/); assert.match(read("desktop/main.mjs"), /kept\.v === 367/); assert.equal(shownWording("oet uk number", "OET"), "OET uk number?");
});
test("item 5: a book to read is preparation, not a booking", () => {
  const p = examPlan({ subject: "OET", facts: [], subjectFacts: { sampleTests: F("sampleTests", "OET's own page offers sample tests to practise with."), practiceEvery: F("practiceEvery", "OET's own page recommends one practice test every 2-3 weeks."), bookPaperCloses: F("bookPaperCloses", "OET's own page: bookings for the test on paper close 24 days before the test date.") }, demand: [{ text: "oet book a test", source: "s", weight: 9 }, { text: "oet practice test", source: "s", weight: 8 }, { text: "Which OET book should I buy?", source: "s", weight: 5 }] });
  const booking = p.pages.find((x) => x.topic === "book"), prep = p.pages.find((x) => x.topic === "practice"); assert.ok(booking && prep); assert.ok(!booking.questions.some((q) => /Which OET book/.test(q.question)), "not on the Booking page"); assert.ok(prep.questions.some((q) => /Which OET book/.test(q.question)), "on the preparation page");
});
test("item 3: the blocked councils go on the client's browser list; a hand-in gives a verdict, only the verdict is kept; the rules of that list hold", () => {
  const MAIN = read("desktop/main.mjs"); assert.match(MAIN, /r\[2\] === "councils\/browser" && req\.method === "GET"/); assert.match(MAIN, /r\[2\] === "councils\/browser" && req\.method === "POST"/); assert.match(MAIN, /await councilReads\(\{ pages: /); assert.match(read("desktop/browser-list.mjs"), /kept\[key\] = r\.ok \? \{ ok: true, evidence: p\.url, on, strict: r\.strict, via: "read in your browser" \}/); assert.ok(!/kept\[key\] = r\.ok[^;]*text/.test(read("desktop/browser-list.mjs")), "never its text"); assert.match(MAIN, /\|pages-view\|pages-row\|councils\\\/browser\|/);
  const items = [{ kind: "council", url: "https://inc.example/", label: "INC" }], good = { source: "CLIENT_AI_BROWSER_READ", date: ON, startedBy: { who: "CLIENT" }, notice: { text: "starting" }, pages: [{ url: "https://inc.example/", readAt: `${ON}T10:00:00Z`, text: "The Council registers nurses." }, { url: "https://other.example/", readAt: `${ON}T10:01:00Z`, text: "x" }] };
  const t = takeBrowserReads(good, items); assert.equal(t.ok, true); assert.deepEqual(t.pages.map((p) => p.url), ["https://inc.example/"]); assert.deepEqual(t.notOnList, ["https://other.example/"]);
  assert.equal(takeBrowserReads({ ...good, startedBy: { who: "APP" } }, items).ok, false, "only what the client started"); assert.match(browserInstruction(items), /READ https:\/\/inc\.example\//); assert.match(read("desktop/ui.html"), /id="councilsblocked"/);
});
test("item 6: research reads side by side; each site still one at a time", () => {
  const MAIN = read("desktop/main.mjs"); assert.match(MAIN, /await sideBySide\(\(prof\) => searchMissing/); assert.match(MAIN, /await sideBySide\(\(prof\) => readDetails/); assert.match(read("desktop/official.mjs"), /const pace = \(u\) => \{ const h = hostIn\(u\)/, "politeness is per site");
});

test("found reading the pages: a page's own parts are not judged for who and where; nor is an office repeated for each profession filler", async () => {
  const { fitParts, BUILT_FOR_THE_PAGE } = await import("../desktop/truth-checks.mjs"), { goodToRead, topicOf } = await import("../desktop/page-quality.mjs");
  const c = (text) => ({ text, link: "https://x.example/", readOn: ON }), out = fitParts([{ part: "council", question: "Which council in Bangladesh registers dentists?", claims: [c("Bangladesh Medical & Dental Council registers dentists in Bangladesh.")] }, { part: "destinations", question: "Where do dentists from Bangladesh go, and what score does each country ask?", claims: [c("In Australia: Dental Board of Australia accepts OET.")] }, { part: "questions0", question: "What does OET cost in Bangladesh?", claims: [c("In Australia it costs AUD 587.")] }], { subject: "OET" });
  assert.deepEqual(out.parts.map((p) => p.part), ["council", "destinations"], "a question people ask is still judged"); assert.ok(BUILT_FOR_THE_PAGE.test("standing"));
  assert.match(read("desktop/seo-pages.mjs"), /seen\.items\.filter\(\(it\) => !BUILT_FOR_THE_PAGE\.test/);
  const line = (p) => `Office for ${p} in Nepal: Allied Council, 1 Road, Kathmandu — https://a.example/. Whether it is the registering body is not confirmed yet.`, html = `<main><h1>t</h1><details data-need-id="n--councils"><summary>Which?</summary><p data-claim-id="a">${line("dietitians")}</p><p data-claim-id="b">${line("optometrists")}</p></details></main>`, q = goodToRead(html, topicOf({ title: "OET in Nepal", kind: "country", country: "Nepal" }));
  assert.ok(!q.problems.some((x) => /Filler/.test(x.line)), JSON.stringify(q.problems));
  const words = (x) => answerQuestion(x, { subject: "OET", subjectFacts: { bookFind: F("bookFind", "Go to OET's booking page and press Find a test.") }, pages: [{ url: "https://oet.com/a", on: ON, words: [] }] }).claims[0].text; assert.match(words("Is IELTS or OET better for registration in Ireland?"), /does not say this/, "not a booking step");
  const p = plan({ facts: [{ verified: true, id: "q", part: "questions", country: "Nepal", question: "Can an anesthesia technician apply to take the OET?", text: "OET is made for 12 professions.", link: "https://oet.com/q", on: ON }, fact("Nepal Nursing Council", "nursing", "Nepal")] }); assert.ok(!p.pages.find((x) => x.title === "OET for Nurses from Nepal").items.some((i) => /anesthesia/.test(i.question)), "another job's question");
});

test("found reading the pages: an honest line survives the cleaning; a shared rule keeps what is its own; another council's service stays off; a long sentence splits", async () => {
  const { ownPart, topicOf, cleanFact } = await import("../desktop/page-quality.mjs"), { PEOPLE_WORD } = await import("../desktop/recognition.mjs"), { HONEST } = await import("../desktop/answer-ladder.mjs"), SEO = read("desktop/seo-pages.mjs");
  assert.match(SEO, /if \(LADDER_HONEST\.test\(c\.text\)\) return \[c\];/); assert.ok(HONEST.test("Jordanian Nursing Council's own page could not be read on 2026-11-02; this is still being looked for."));
  const T = topicOf({ title: "OET for Dentists from India", kind: "origin-profession", country: "India", profession: "dentistry", people: PEOPLE_WORD });
  assert.equal(ownPart("Indian public documents are apostilled by the MEA. State nursing-council verification is a separate step. Then it is sent on.", T), "Indian public documents are apostilled by the MEA.");
  assert.equal(ownPart("Verification is issued by the State Nursing Council of registration. The council then sends it on.", T), null, "opens with another profession: not this page's");
  const long = `${Array.from({ length: 30 }, (_, i) => `w${i}`).join(" ")}; next ${Array.from({ length: 30 }, (_, i) => `x${i}`).join(" ")}.`; assert.match(ownPart(long, T), /w29\. Next x0/);
  const p = plan({ facts: [{ verified: true, id: "k", part: "rules", country: "Nepal", text: "NNC issues verification of registration through its portal.", link: "https://n.example/", on: ON }, { verified: true, id: "l", part: "rules", country: "Nepal", text: "Nepali documents need attestation by the consular department.", link: "https://n.example/d", on: ON }, fact("Nepal Nursing Council (NNC)", "nursing", "Nepal"), fact("Nepal Pharmacy Council", "pharmacy", "Nepal")] }), st = (x) => p.pages.find((y) => y.title === x).items.find((i) => i.part === "standing").claims.map((c) => c.text).join(" ");
  assert.doesNotMatch(st("OET for Dietitians from Nepal"), /attestation/, "RR-370 item 5: attestation is not good standing"); assert.ok(!/NNC/.test(st("OET for Dietitians from Nepal")), "another profession's council"); assert.match(st("OET for Nurses from Nepal"), /NNC/, "its own stays");
  assert.match(read("desktop/exam-plan.mjs"), /const gapScores = /); assert.equal(classOfPhrase("oet in saudi arabia", { subject: "OET", country: "Saudi Arabia" }), "what"); assert.equal(classOfPhrase("oet us", { subject: "OET", country: "United States" }), "what"); assert.equal(classOfPhrase("oet schedule philippines", { subject: "OET", country: "Philippines" }), "book");
});

test("found reading the pages: the honest line is no research note; the finder stands in its own words; a body that gave a score is that profession's office; the two name questions are one", async () => {
  const { goodToRead, topicOf } = await import("../desktop/page-quality.mjs"), { PEOPLE_WORD } = await import("../desktop/recognition.mjs"), { mergeSameNeeds } = await import("../desktop/truth-checks.mjs");
  const T = topicOf({ title: "OET for Doctors from Kenya", kind: "origin-profession", country: "Kenya", profession: "medicine", people: PEOPLE_WORD }), page = (x) => `<main><h1>t</h1><details data-need-id="n--regulator"><summary>How?</summary><p data-claim-id="a">${x}</p></details></main>`, probs = (x) => goodToRead(page(x), T).problems.map((p) => p.line).join(" ");
  assert.ok(!/research note|Off topic/.test(probs("Kenya Medical Practitioners and Dentists Council's own page could not be read on 2026-11-02; this is still being looked for.")), "honest"); assert.match(probs("The page could not be read by our tool."), /research note/, "a real note is still caught"); assert.match(probs("The Dental Council registers dentists."), /Off topic/, "off topic is still caught");
  assert.equal(mergeSameNeeds([{ part: "questions0", question: "Do I have to write my name in the writing session?", claims: [] }, { part: "questions1", question: "Do you write your name during the writing session?", claims: [] }], { subject: "OET" }).length, 1);
  const P = read("desktop/exam-plan.mjs"); assert.match(P, /To find a test venue in \$\{inCountry\(c\)\}/); assert.match(P, /claimId: `office-\$\{prof\}-\$\{c\}`/); assert.match(P, /!it && cls === "accepted"/);
});

test("found counting the pages: a page the plan settled is never folded into another for one shared first question; a researcher's aside leaves the line", async () => {
  const { cleanFact } = await import("../desktop/page-quality.mjs"), SEO = read("desktop/seo-pages.mjs");
  assert.match(SEO, /ownPage: p\.category === "exam"/); assert.ok(SEO.includes("const plan = planNewPages({ needs, existing });"), "the census's mark stands");
  const { planNewPages } = await import("../src/page/one-builder.mjs"), claim = (id) => ({ claimId: id, text: "A fact of this page.", link: "https://x.example/", readOn: ON, source: "S" }), need = (id, extra = {}) => ({ needId: id, label: "DEMAND", path: `/${id}`, question: "What OET score is required for Australia?", claims: [claim(id)], ...extra });
  assert.deepEqual(planNewPages({ needs: [need("a", { ownPage: true }), need("b", { ownPage: true })], existing: [] }).map((p) => p.kind), ["NEW", "NEW"], "the same first question: two pages of their own"); assert.deepEqual(planNewPages({ needs: [need("a"), need("b")], existing: [] }).map((p) => p.kind), ["NEW", "SECTION"], "any other page: one page, as before"); assert.equal(planNewPages({ needs: [need("a", { ownPage: true, claims: [{ ...claim("a"), link: null }] })], existing: [] })[0].kind, "REFUSED", "the source rule stands for it");
  assert.equal(cleanFact("India-distinct federal wrinkle: verification is issued by the state."), "Verification is issued by the state.");
});

test("what stayed green when broken on purpose: a score not found is an honest line on the profession page; a body that gave a score is that profession's office", () => {
  const research = { nursing: [{ kind: "score", country: "Nepal", question: "What OET score does Nepal Nursing Council in Nepal ask of nurses?", answer: null, searched: [{ body: "Nepal Nursing Council", url: "https://nnc.example/", on: ON, found: false, why: "not stated" }] }, { kind: "score", country: "Ghana", question: "What OET score does a board in Ghana ask of nurses?", answer: null, searched: [{ body: "A board", why: "not searched yet" }] }], dietetics: [{ kind: "score", country: "Nepal", question: "What OET score does Diet Board in Nepal ask of dietitians?", regulator: { name: "Diet Board", short: "Diet Board" }, answer: [{ fact: { text: "In Nepal: Diet Board accepts OET: grade B in each sub-test.", link: "https://diet.example/", on: ON } }] }] };
  const p = plan({ research }), hub = p.pages.find((x) => x.kind === "profession" && x.profession === "nursing"), gap = hub.items.find((i) => i.question === research.nursing[0].question);
  assert.ok(gap, "the honest line stands on the page"); assert.equal(gap.claims[0].text, "Nepal Nursing Council's official page, checked 2026-11-03, does not say this."); assert.equal(gap.claims[0].link, "https://nnc.example/");
  assert.ok(!hub.open.includes(research.nursing[0].question), "no longer open"); assert.ok(!hub.open.includes(research.nursing[1].question), "RR-369 Part 5: never read: an honest line on the page; it no longer blocks"); assert.match(hub.items.find((i) => i.question === research.nursing[1].question).claims[0].text, /does not say this\. Ask /);
  const lines = p.pages.find((x) => x.kind === "country" && x.country === "Nepal").items.find((i) => i.part === "councils").claims; const office = lines.find((c) => /Diet Board/.test(c.text));
  assert.equal(office.text, "Diet Board (official page) asks dietitians: grade B in each sub-test."); /* RR-369 Part 3 */ assert.equal(office.link, "https://diet.example/"); assert.equal(office.readOn, ON);
});
test("what stayed green when broken on purpose: a hand-in that breaks the rules keeps nothing; research runs six side by side; the thread that cannot start falls back", () => {
  const MAIN = read("desktop/main.mjs"); assert.ok(MAIN.includes('if (!t.ok) return { ok: false, line: `Refused: ${t.refusedFor.join(", ")}. Nothing from this file is kept.` };')); assert.ok(MAIN.indexOf("if (!t.ok) return { ok: false, line: `Refused:") < MAIN.indexOf("await councilReads("), "refused before anything is kept");
  assert.match(MAIN, /const sideBySide = async \(work\) => \{[^\n]*Array\.from\(\{ length: 6 \}/); assert.match(read("desktop/pages-off.mjs"), /catch \{ return here\(\); \}/);
});
