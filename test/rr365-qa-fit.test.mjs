/**
 * RR-365 (1.15.18, beta-g's reading of the 24 ready pages of RR-364): a question nobody asks does not enter a page; the key thing asked must be what the answer speaks of; a part holds only its own kind of line; councils lead with nurses and doctors; OET's own change and re-mark fees are read right.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { unclearWhy } from "../desktop/page-types.mjs";
import { answerFitWhy, ownSiteAnswer, partFitWhy, fitParts, summaryFault } from "../desktop/truth-checks.mjs";
import { subjectFactsOf, oldWording } from "../desktop/subject-facts.mjs";
import { partsMissing } from "../desktop/page-quality.mjs";
import { settleLocal, priceHere, examPlan } from "../desktop/exam-plan.mjs";
import { professionRegistered } from "../desktop/page-plan.mjs";

const ON = "2026-11-02", opt = { subject: "OET" }, OFFICIAL = "https://official.example.org/x";
const page = (url, text) => ({ ok: true, url, text, checkedOn: ON });
const claim = (text, extra = {}) => ({ claimId: extra.claimId ?? text.slice(0, 8), text, link: OFFICIAL, ...extra });

test("A form fields and survey prompts never enter a page", () => {
  for (const q of ["Which profession and country are you applying to?", "Which test are you planning to take?", "What is your target score?", "Are you a nurse or a doctor?", "Where are you from?", "Can you help me find OET test practice material?"]) assert.match(unclearWhy(q), /form's or a survey's/, q);
  for (const q of ["What score do you need for nurses?", "Are you allowed to use a tablet?", "Can we use a pencil for writing the letter?"]) assert.equal(unclearWhy(q), null, q);
});

test("A vague and odd questions never enter a page", () => {
  assert.match(unclearWhy("Is my answer accepted as right?"), /does not say/);
  assert.match(unclearWhy("Why does the speaking test feel like the candidate is the interviewer?"), /impression/);
  assert.match(unclearWhy("Why does the speaking student seem like the interviewer in videos?"), /impression/);
  assert.match(unclearWhy("Is the speaking test interviewer the candidate?"), /impression/);
  assert.equal(unclearWhy("Is OET accepted in Ireland?"), null, "it names what it is about");
  assert.equal(unclearWhy("Why is the OET Writing task a letter?"), null, "a real why stays");
});

test("A whichever road a question came by: it leaves the page, and the plan says so", () => {
  const f = fitParts([{ part: "questions0", question: "Is my answer accepted as right?", claims: [claim("For Reading, both spelling variants are accepted, but misspellings can cost marks.")] }], opt);
  assert.deepEqual(f.parts, []); assert.deepEqual(f.dropped, ["Is my answer accepted as right?"]);
});

test("B how to pass is advice, not how scoring works, from any source", () => {
  const scoring = "Each of the four sub-tests is scored from 0 to 500, mapped to a grade, and most regulators set their score per sub-test.";
  assert.match(answerFitWhy("How do I pass OET test?", scoring, opt), /how to pass/);
  assert.equal(ownSiteAnswer("How do I pass OET test?", scoring, opt), null);
  assert.equal(answerFitWhy("How do I pass OET test?", "Take one practice test every 2 weeks to reach the score your regulator asks.", opt), null);
});

test("B how long a result counts: the answer says who sets that rule", () => {
  assert.match(answerFitWhy("Is the OET valid for 3 years?", "A pass in the English test is valid for two years.", opt), /who sets/);
  assert.equal(answerFitWhy("Is the OET valid for 3 years?", "The GMC treats OET certificates as valid for two years.", opt), null);
  assert.equal(answerFitWhy("Is the OET valid for 3 years?", "The Nursing Council treats results as valid for two years.", opt), null);
  assert.equal(answerFitWhy("Is the OET valid for 3 years?", "OET's own page: results are valid for two years.", opt), null);
  assert.equal(ownSiteAnswer("Is the OET valid for 3 years?", "A pass in the English test is valid for two years. The GMC treats OET certificates as valid for two years.", opt), "The GMC treats OET certificates as valid for two years.");
});

test("B the fee for changing the venue is not the fee for changing the date", () => {
  const date = "Moving a booking to another date costs AU$120 before bookings close and AU$200 after.";
  assert.match(answerFitWhy("What are the Fees for changing your OET Test venue?", date, opt), /venue/);
  assert.equal(ownSiteAnswer("What are the Fees for changing your OET Test venue?", date, opt), null);
  assert.equal(answerFitWhy("What are the Fees for changing your OET Test venue?", "Moving a paper booking to another date, venue or test type costs AU$120.", opt), null);
  assert.equal(answerFitWhy("What is the fee for rescheduling an OET Test?", date, opt), null, "the date's fee answers the date");
});

test("B what a score means is not what one body asks", () => {
  assert.match(answerFitWhy("What grade is 300 in OET?", "The UK's Nursing and Midwifery Council asks for at least grade B (350) and at least C+ (300) in Writing.", opt), /what a score means/);
  assert.equal(answerFitWhy("What grade is 300 in OET?", "A score of 300 is grade C+ in OET.", opt), null);
});

test("B classes are not the test", () => {
  assert.match(answerFitWhy("Can I take OET online classes at home?", "OET is normally sat at a test venue; sitting at home (OET@Home) is limited to candidates with no venue available.", opt), /classes/);
  assert.equal(answerFitWhy("How do I register for an OET review class?", "Book by contacting one of the three official OET review centres to register.", opt), null);
});

test("B rules: a line under the rules states a rule; result timing and a venue list do not", () => {
  assert.match(partFitWhy("rules", "OET on Paper results for candidates tested in India are released in as little as 5 days after the test date."), /not a rule/);
  assert.match(partFitWhy("rules", "The Philippines is listed among regions where OET on Computer candidates can take the Speaking sub-test at a venue."), /not a rule/);
  assert.equal(partFitWhy("rules", "Nepal is not a party to the Hague Apostille Convention, so documents need consular legalisation."), null);
  assert.equal(partFitWhy("rules", "The Pharmacy Council's guidelines state that pharmacists holding registration may be granted full registration."), null);
  const f = fitParts([{ part: "rules", question: "What rules are special to India?", claims: [claim("OET on Paper results for candidates tested in India are released in as little as 5 days.")] }], opt);
  assert.deepEqual(f.dropped, ["What rules are special to India?"]); assert.match(f.removed[0].why, /not a rule/);
});

test("B councils: a price is not a council; nurses and doctors come first", () => {
  assert.match(partFitWhy("councils", "The full test costs AUD 587. In the United States that is about USD 413."), /price/);
  assert.equal(partFitWhy("councils", "Nursing Board registers nurses in Ruritania."), null);
  assert.equal(professionRegistered("Medical Rehabilitation Therapists Board of Nigeria registers physiotherapists in Nigeria — https://www.mrtb.gov.ng/."), "physiotherapy", "a name is not whom it registers");
  assert.equal(professionRegistered("A Board registers vets in Ruritania — https://medical.example.org/"), professionRegistered("registers vets"), "nor is its address");
  const f = fitParts([{ part: "councils", question: "Which council registers each profession in Ruritania?", claims: ["Medical Rehabilitation Board registers physiotherapists in Ruritania.", "Physio Board registers physiotherapists in Ruritania.", "Medical Board registers doctors in Ruritania.", "Vet Board registers vets in Ruritania.", "Nursing Board registers nurses in Ruritania."].map((t) => claim(t)) }], opt);
  assert.deepEqual(f.parts[0].claims.map((c) => c.text.split(" registers ")[0]), ["Nursing Board", "Medical Board", "Medical Rehabilitation Board", "Physio Board", "Vet Board"]);
});

test("B a country page without the nurses' and doctors' councils is named, never ✅", () => {
  const html = (lines) => `<main><h1>t</h1><ul><li class="card"><span class="k">k</span><span class="v">USD 455</span></li></ul>${[["fee", ["USD 455"]], ["questions0", ["An answer."]], ["centres", ["A venue."]], ["councils", lines], ["rules", ["A rule."]]].map(([p, ls]) => `<details data-need-id="n--${p}"><summary>q?</summary>${ls.map((l, i) => `<p data-claim-id="c${i}">${l}</p>`).join("")}</details>`).join("")}</main>`;
  assert.deepEqual(partsMissing(html(["Physio Board registers physiotherapists in Ruritania."]), "country", { localCurrency: "USD" }), ["the nurses' council and the doctors' council"]);
  assert.deepEqual(partsMissing(html(["Nursing Board registers nurses in Ruritania."]), "country", { localCurrency: "USD" }), ["the doctors' council"]);
  assert.deepEqual(partsMissing(html(["Nursing Board registers nurses in Ruritania.", "Medical Rehabilitation Board registers physiotherapists in Ruritania."]), "country", { localCurrency: "USD" }), ["the doctors' council"]);
  assert.deepEqual(partsMissing(html(["Nursing Board registers nurses in Ruritania.", "Medical Board registers doctors in Ruritania."]), "country", { localCurrency: "USD" }), []);
});

test("found by reading OET's own page: the change fee and the re-mark fee are read right", () => {
  const facts = subjectFactsOf([
    page("https://oet.example/test/book-a-test/manage-your-booking", "How much does it cost to defer my test? Timeline Fee Up to the booking closing date. AU $120 After the booking closing date. AU $200 To view your booking How much does it cost to reschedule my test? Listening, Reading, Writing and Speaking reschedule fees: Up to 7 days before the test AU $120 | US $95 Less than 7 days before the test AU $200 | US $155 Speaking reschedule fees:"),
    page("https://oet.example/remarking-policy", "you must pay a fee of AU$120 (Global, except US) / US$95 (US only) per sub-test for re-marking. You can request for re-marking within 72 hours from when your results are released."),
  ], "OET");
  assert.equal(facts.changeFee.text, "OET's own page: moving a paper booking to another date, venue or test type costs AU$120 up to the booking closing date and AU$200 after.");
  assert.equal(facts.changeFeeComputer.text, "OET's own page: rescheduling the test on computer or at home costs AU$120 (US$95 in the US) up to 7 days before the test and AU$200 (US$155 in the US) after that.");
  assert.equal(facts.remarkFee.text, "OET's own page: a re-mark costs AU$120 (US$95 in the US) per sub-test.");
  assert.equal(facts.remarkHours.text, "OET's own page: a re-mark must be asked for within 72 hours of the results' release.");
  assert.equal(facts.remarkHours.link, "https://oet.example/remarking-policy"); assert.equal(facts.remarkHours.readOn, ON);
  assert.equal(oldWording("OET's own page: a change after the booking closing date costs AUD 120."), true, "the misread copy kept on a computer never reaches a page");
  assert.equal(oldWording(facts.changeFee.text), false);
  assert.equal(summaryFault("AU$120", facts.changeFee.text), "it shows one price, the fact has more than one");
  assert.equal(summaryFault("AU$120", facts.remarkFee.text), "it shows one price, the fact has more than one");
  assert.equal(summaryFault("USD 455 — OET's own price", "OET's own price in the United States is USD 455 for OET@Home in the US. Any other way of taking it costs AUD 587."), null, "the country's first fee card stays");
});

test("a price with its US price beside it: each page says its own, and it stays on every country page", () => {
  const both = "OET's own page: a re-mark costs AU$120 (US$95 in the US) per sub-test.";
  assert.equal(priceHere(both, "Nepal"), "OET's own page: a re-mark costs AU$120 per sub-test.");
  assert.equal(priceHere(both, "United States"), "OET's own page: a re-mark costs US$95 per sub-test.");
  const F = (k, text) => ({ claimId: k, text, link: "https://official.example.org/p", readOn: ON, source: "s", official: true });
  const pl = (c) => examPlan({ subject: "OET", professions: [], countries: [c], facts: [{ id: "f", country: c, part: "fee", verified: true, official: "AUD 587", text: "OET costs AUD 587 here.", link: "https://oet.com/fee", on: ON }], subjectFacts: { remarkFee: F("subject-remarkFee", both) }, rates: { date: ON, rates: { NPR: 100, USD: 0.7 }, short: "R", link: "https://r.example.org" } }).pages.find((p) => p.country === c).items.find((i) => i.part === "fee").claims.map((x) => x.text);
  assert.ok(pl("Nepal").includes("OET's own page: a re-mark costs AU$120 per sub-test."));
  assert.ok(pl("United States").includes("OET's own page: a re-mark costs US$95 per sub-test."));
});

test("a merged page's fee never stands among the councils, nor beside the country's own price", () => {
  const A = { kind: "country", country: "United States", title: "A", questions: [], items: [{ part: "fee", question: "How much?", claims: [{ claimId: "fee-United States", text: "OET's own price in the United States is USD 455." }] }, { part: "councils", question: "Which council?", claims: [{ claimId: "k", text: "Board registers physiotherapists in the United States." }] }] };
  const D = { kind: "origin-profession", type: "D", profession: "nursing", country: "United States", title: "D", home: "A", prof: null, questions: [], items: [{ part: "fee", question: "How much?", claims: [{ claimId: "d-nursing-United-States-fee-United-States-nursing", text: "The full test costs AUD 587. In the United States that is about USD 413." }] }, { part: "standing", question: "How do they prove?", claims: [{ claimId: "s", text: "A good-standing letter must be sent by the state board." }] }, { part: "council", question: "Home council?", claims: [{ claimId: "c", text: "State Board registers nurses in the United States." }] }] };
  const plan = { pages: [A, D], merged: [], bigger: { countryPages: [A], profPages: [] } };
  settleLocal(plan);
  const part = (k) => A.items.find((i) => i.part === k)?.claims.map((c) => c.text) ?? [];
  assert.equal(part("fee").length, 1, "the own price alone"); assert.ok(!JSON.stringify(A.items).includes("USD 413"));
  assert.deepEqual(part("rules"), ["A good-standing letter must be sent by the state board."]);
  assert.ok(part("councils").includes("State Board registers nurses in the United States."));
});
