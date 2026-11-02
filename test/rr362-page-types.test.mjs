/**
 * RR-362 · recipe v3.3 R3, R5, R6, G5, G7: every page has a type, every type has core questions, a thin page is never ✅ (beta-g, 2 Nov 2026).
 * The subject and countries are stand-ins: nothing here is about one client.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { examPlan, settleLocal } from "../desktop/exam-plan.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { coreOf, KIND, unclearWhy, askedHere, itemForAsked, coreMissingOfPlan, ownClaims, mergeWhy, TYPE_OF_KIND } from "../desktop/page-types.mjs";
import { partsMissing } from "../desktop/page-quality.mjs";
import { cleanCoverage, recleanCoverage, junkWhy, offIntentWhy } from "../desktop/coverage.mjs";
import { detailsIn } from "../desktop/research.mjs";
import { savedListFor, coverageRoutes } from "../desktop/almiseo.mjs";

const SRC = "https://regulator.example.org/english", ON = "2026-10-30";
const score = (country, prof, text = "Tests on/after 1 Jan 2026: Listening 350, Reading 350, Writing 300, Speaking 350.") => ({ id: `s-${country}-${prof}`, country, part: "councils", profession: prof, verified: true, text: `Board for ${prof}. Accepts TESTX. ${text}`, link: SRC, on: ON });
const council = (country, prof) => ({ id: `c-${country}-${prof}`, country, part: "home-council", profession: prof, verified: true, text: `The ${country} ${prof} council registers ${prof === "nursing" ? "nurses" : "doctors"} in ${country}.`, link: `https://council.example.org/${country}`, on: ON });
const fee = (country) => ({ id: `f-${country}`, country, part: "fee", verified: true, official: "AUD 500", text: "TESTX's own page: the full TESTX costs AUD 500.", link: "https://testx.example.org/fee", on: ON });
const rule = (country, text) => ({ id: `r-${country}-${text.length}`, country, part: "rules", verified: true, text, link: `https://rules.example.org/${country}`, on: ON });
const regulator = { name: "National Regulator", short: "NR", country: "Ireland", professions: ["nursing"], website: "https://regulator.example.org/" };
const answered = (extra = {}) => ({ id: "score:Ireland", kind: "score", country: "Ireland", regulator, also: [], question: "What TESTX score does NR ask of nurses?", searched: [], answer: [{ fact: { id: "s1", text: "Tests on/after 1 Jan 2026: Listening 350, Reading 350, Writing 300, Speaking 350.", link: SRC, on: ON }, text: "In Ireland: Tests on/after 1 Jan 2026: Listening 350, Reading 350, Writing 300, Speaking 350." }], how: "already known", ...extra });
const whole = { url: SRC, on: ON, others: ["IELTS", "PTE Academic"], validity: { n: 2, unit: "years" }, combining: { allowed: true, months: 12 }, steps: "https://regulator.example.org/apply" };
const row = (country, profession) => ({ kind: "country-profession", country, profession, title: `TESTX for ${profession} in ${country}` });
const plan = (o = {}) => examPlan({ subject: "TESTX", professions: ["nursing", "medicine"], countries: ["Ireland", "Egypt"], facts: [fee("Ireland"), fee("Egypt"), council("Ireland", "nursing"), council("Egypt", "medicine"), rule("Egypt", "Egypt's documents must be attested by its ministry before they go abroad.")], subjectFacts: {}, rates: { date: ON, rates: { EGP: 30, EUR: 0.6 }, short: "RateService", link: "https://rates.example.org" }, research: { nursing: [answered({ details: whole })], medicine: [] }, demand: [{ text: "what testx score do nurses need for ireland", source: "a search", weight: 5 }], site: null, collector: [row("Ireland", "nursing"), row("Egypt", "medicine")], maxCountries: 200, ...o });

test("a country × profession row is C where a regulator accepts the exam for it, D where they come from: never mixed in a page or a title (R3)", () => {
  const p = plan(), c = p.pages.find((x) => x.kind === KIND.destination), d = [...p.pages, ...p.merged].find((x) => x.country === "Egypt" && x.profession === "medicine");
  assert.equal(c.title, "TESTX for Nurses in Ireland"); assert.equal(c.type, "C");
  assert.equal(d.title, "TESTX for Doctors from Egypt"); assert.equal(d.type ?? TYPE_OF_KIND[d.kind], "D");
});

test("C: every core question answered and something of its own → it stays a page; each question people ask heads the part that answers it (R3, G4, G7)", () => {
  const p = settleLocal(plan()), c = p.pages.find((x) => x.kind === KIND.destination);
  assert.ok(c, "the whole page stays"); assert.deepEqual(coreMissingOfPlan(c), []);
  assert.deepEqual(c.items.map((i) => i.part.replace(/\d+$/, "")), ["scores", "regulator", "others", "rules"]);
  assert.equal(c.items[0].question, "What testx score do nurses need for ireland?", "their own words");
  assert.ok(c.items.find((i) => i.part === "others").claims[0].text.includes("IELTS, PTE Academic"));
  assert.ok(c.items.find((i) => i.part === "regulator").claims.some((x) => x.link === whole.steps), "its registration steps, on the regulator's own page");
  assert.ok(p.bigger.profPages.find((x) => x.profession === "nursing").links.includes(c.title), "the profession page links it");
});

test("R3: a C page missing a core question is not a page: named in the plan as merged, its facts on the country page and the profession page", () => {
  const p = settleLocal(plan({ research: { nursing: [answered({ details: { ...whole, others: null } })], medicine: [] } })), m = p.merged.find((x) => x.title === "TESTX for Nurses in Ireland");
  assert.ok(!p.pages.some((x) => x.kind === KIND.destination), "no thin page");
  assert.deepEqual(m.missing, ["whether other English tests are accepted"]); assert.match(m.why, /cannot answer: whether other English tests/);
  assert.deepEqual(m.into, ["TESTX in Ireland: fee, centres and councils", "TESTX for Nurses"]);
  const prof = p.bigger.profPages.find((x) => x.profession === "nursing"), all = prof.items.flatMap((i) => i.claims.map((c) => c.text)).join(" ");
  assert.match(all, /time limit of 2 years/, "what only the merged page knew goes beside that country's score");
  assert.match(p.bigger.countryPages.find((x) => x.country === "Ireland").items.flatMap((i) => i.claims.map((c) => c.text)).join(" "), /sets out the registration steps/, "how to register goes to the country page");
});

test("R3: a page whose every answer the bigger pages already give is not a page either", () => {
  const page = { kind: KIND.origin, items: [{ part: "fee", claims: [{ text: "A" }] }] }, big = { items: [{ part: "fee", claims: [{ text: "A" }] }] };
  assert.deepEqual(ownClaims(page, [big]), []); assert.match(mergeWhy({ missing: [], own: [] }), /already on the country page and the profession page/);
  assert.equal(mergeWhy({ missing: [], own: [{}] }), null);
});

test("a D page: its home council, good standing, the score each destination asks, the fee, its own questions (never a destination's page)", () => {
  assert.deepEqual(Object.keys(coreOf(KIND.origin)), ["council", "standing", "destinations", "fee", "questions"]);
  const p = settleLocal(plan({ research: { nursing: [], medicine: [{ ...answered(), regulator: { ...regulator, professions: ["medicine"] } }] } })), m = p.merged.find((x) => x.title === "TESTX for Doctors from Egypt");
  assert.ok(m, "nothing of its own: merged before any search is bought"); assert.match(m.why, /already on the country page and the profession page/);
});

test("a question page is never a page of its own: one answer is thin (R3); an unclear one is dropped, said", () => {
  const facts = [fee("Ireland"), { id: "q1", country: "Ireland", part: "questions", question: "How long are TESTX results valid?", verified: true, text: "TESTX results count for two years on the official page.", link: SRC, on: ON }];
  const p = plan({ facts, collector: [{ kind: "question", country: "Ireland", question: "How long are TESTX results valid?", title: "How long are TESTX results valid?" }, { kind: "question", country: "Ireland", question: "Why did a video make the student seem like the interviewer in speaking?", title: "x" }] });
  assert.ok(!p.pages.some((x) => x.kind === "question"));
  assert.match(p.merged[0].why, /stands on its country page/); assert.match(p.merged[1].why, /^dropped: /);
  assert.ok(p.bigger.countryPages[0].items.some((i) => i.question === "How long are TESTX results valid?"), "it stands on the country page");
});

test("item 19: a question must be clear, on the page's topic and answerable", () => {
  assert.match(unclearWhy("Why did a video make the student seem like the interviewer in speaking?"), /story/);
  assert.equal(unclearWhy("Do I have to write my name in the writing session?"), null);
  assert.equal(unclearWhy("Can I look at the role card throughout the speech, or must I keep eye contact?"), null);
  assert.match(unclearWhy("exam fee for testx"), /not a question/);
  assert.match(unclearWhy("Is it good?"), /too short/);
  assert.match(unclearWhy("Is this one any good for me?"), /does not say/);
  assert.match(unclearWhy("How much does TESTX cost in India?", { place: "Egypt" }), /another country/);
  const p = plan({ facts: [fee("Ireland"), { id: "q2", country: "Ireland", part: "questions", question: "Why did a video make the student seem like the interviewer in speaking?", verified: true, text: "A long enough answer from an official page about speaking.", link: SRC, on: ON }], collector: [] });
  assert.ok(!p.bigger.countryPages[0].items.some((i) => /video/.test(i.question)), "never on the page");
});

test("item 15: the coverage list keeps only what belongs to this page; form fields, promos, calls to act and other fields go", () => {
  const J = ["Which English test are you planning to take?", "How UNILINKSOLUTIONS prepares you for the TESTX", "Want to know more?", "Must Read Articles", "How we researched"];
  for (const t of J) assert.ok(junkWhy(t), `dropped: ${t}`);
  const O = ["Interested in Computer Science ?", "Why should I have an eye test?", "What is the starting salary for an MBBS doctor in Ireland?"];
  for (const t of O) assert.ok(offIntentWhy(t, { subject: "TESTX", intent: "exam" }), `another field: ${t}`);
  for (const t of ["What TESTX score do nurses need?", "How much does it cost to sit the exam?", "How long are results valid?", "Can I sit it on computer?"]) assert.equal(junkWhy(t) ?? offIntentWhy(t, { subject: "TESTX", intent: "exam" }), null, t);
  assert.equal(offIntentWhy("Interested in Computer Science ?", { subject: "TESTX" }), null, "only an exam's page is judged by an exam's needs: a product of another kind keeps its own words");
  const kept = recleanCoverage([...[...J, ...O].map((t) => ({ topic: t, paa: true })), { topic: "How long are TESTX results valid?", paa: true }], { subject: "TESTX", title: "TESTX for Nurses", now: "2026-11-02T00:00:00Z", names: [], intent: "exam" }).map((c) => c.topic);
  assert.deepEqual(kept, ["How long are TESTX results valid?"]);
  assert.equal(cleanCoverage({ paa: O, subject: "TESTX", title: "x", intent: "exam" }).length, 0);
});

const site = { ok: true, origin: "https://client.example.org", readOn: "2026-11-01", pages: [], robotsTxt: null, sitemapUrls: null };
const draftOf = (p, title) => { const out = seoPages({ site, on: "2026-11-02T00:00:00Z", pagePlan: p.pages, max: p.pages.length, subject: "TESTX", cta: { label: "Go", href: "https://client.example.org/go" } }); return out.drafts.find((d) => d.title === title); };
const gateH = (d) => d.gates.find((g) => g.gate === "H");

test("items 13 + 18: a missing core question blocks ✅, named; what the top results cover and a page not read yet never do", () => {
  const p = settleLocal(plan()), c = p.pages.find((x) => x.kind === KIND.destination);
  Object.assign(c, { coverage: [{ topic: "How does TESTX compare with a rival exam?", urls: [], paa: true }], coverageRoute: "none", serpWhy: "the cap is reached" });
  const d = draftOf(p, c.title);
  assert.deepEqual(gateH(d).failing, [], "core questions answered"); assert.equal(d.type, "C"); assert.equal(d.checkLater, true, "it is checked on a later day");
  assert.ok(d.suggestions.some((s) => /rival exam/.test(s)), "a suggestion to add, not a failure");
  /* a country page without its centres and rules: ⚠️ names them */
  const a = draftOf(p, "TESTX in Ireland: fee, centres and councils");
  assert.match(gateH(a).failing.join(" "), /Missing: .*test centres/); assert.equal(a.readyAsDraft, false);
  /* a thin C page the old way (council and fee): never ✅ */
  const thin = { ...c, title: "TESTX for Nurses in Nowhere", items: c.items.filter((i) => i.part === "regulator"), askedHeads: [] };
  const t = draftOf({ pages: [...p.pages, thin] }, thin.title);
  assert.match(gateH(t).failing.join(" "), /the score asked for each part/); assert.equal(t.readyAsDraft, false);
});

test("a core part is read from the page itself: a claim that fell off the page is missing again", () => {
  const html = `<main><details data-need-id="n--scores"><summary>Q</summary><p data-claim-id="x">An answer.</p></details></main>`;
  assert.deepEqual(partsMissing(html, KIND.destination), Object.entries(coreOf(KIND.destination)).filter(([k]) => k !== "scores").map(([, v]) => v));
  assert.ok(!partsMissing(html, KIND.destination, { asked: ["Q"] }).includes(coreOf(KIND.destination).questions), "a heading in people's own words answers it");
});

test("B's own questions are its own: the shared fee, results and booking questions stand on it but do not count (R6)", () => {
  const f = [fee("Ireland"), { ...fee("Ireland"), id: "oetfee", link: "https://oet.com/fee", text: "Full test costs AU$500." }];
  const prof = plan({ facts: f }).bigger.profPages[0];
  const shared = prof.items.filter((i) => i.part.startsWith("shared"));
  assert.ok(shared.length > 0); assert.ok(!prof.items.some((i) => /^questions/.test(i.part)));
});

test("item 16: one improve entry per existing page: the bigger page keeps it", () => {
  const siteRead = { origin: "https://client.example.org", pages: [{ url: "https://client.example.org/guides/testx-ireland", title: "TESTX for nurses in Ireland", h1: "TESTX for nurses in Ireland" }] };
  const p = plan({ site: siteRead }), withIt = p.pages.filter((x) => x.improve?.url === siteRead.pages[0].url);
  assert.equal(withIt.length, 1); assert.equal(withIt[0].kind, "country");
});

test("a topic page with nothing of its topic is merged, its searches kept on a bigger page (R3)", () => {
  const p = plan({ subjectFacts: { scale: { text: "The scale runs 0 to 500.", link: SRC, readOn: ON, claimId: "sc" } }, demand: [{ text: "testx scale", source: "a search", weight: 5 }, { text: "testx study", source: "a search", weight: 4 }, { text: "testx", source: "a search", weight: 3 }], collector: [] });
  assert.ok(!p.pages.some((x) => x.kind === KIND.topic && !x.items.length), "no empty topic page");
  assert.ok(p.merged.some((m) => m.type === "E" && /no checked fact of its topic/.test(m.why)));
});

test("G7: a regulator's details come from its own page; a rule about another test is never shown as the subject's", () => {
  const page = { ok: true, url: SRC, checkedOn: ON, title: "English", text: "We accept TESTX and IELTS. IELTS results are valid for 2 years. Results from two sittings can be combined within 6 months if the test results are from TESTX.", links: [{ text: "How to apply for registration", href: "https://regulator.example.org/apply" }] };
  const d = detailsIn(page, { subject: "TESTX", url: SRC, on: ON });
  assert.deepEqual(d.others, ["IELTS"]); assert.equal(d.validity, null, "that time limit is IELTS's"); assert.equal(d.combining.allowed, true); assert.equal(d.steps, "https://regulator.example.org/apply");
  assert.equal(detailsIn({ ...page, text: "We accept IELTS." }, { subject: "TESTX" }), null, "a page that does not name the subject says nothing");
  assert.equal(detailsIn({ ok: false }, { subject: "TESTX" }), null);
  assert.deepEqual(detailsIn({ ...page, text: "TESTX only.", links: [] }, { subject: "TESTX" }).others, [], "it names no other test: said so");
});

test("item 14: a C or D page finds the collectors' saved list for its row: never bought twice", () => {
  const file = { plan: [{ kind: "country-profession", country: "Ireland", profession: "nursing", title: "TESTX for nursing in Ireland" }], coverage: [{ intent: "TESTX for nursing in Ireland", coverage: [], second: [], read: [], on: ON }] };
  assert.ok(savedListFor({ kind: KIND.destination, country: "Ireland", profession: "nursing", title: "TESTX for Nurses in Ireland" }, file));
  assert.ok(savedListFor({ kind: KIND.origin, country: "Ireland", profession: "nursing", title: "TESTX for Nurses from Ireland" }, file));
});

test("G4: a search wording naming both the place and the people counts as what they ask; another site's or a free copy's never", () => {
  const o = { place: "Australia", people: ["nurses"] };
  assert.equal(askedHere("Australia OET score for nurses", o), true); assert.equal(askedHere("Oet for nurses in australia requirements", o), true);
  assert.equal(askedHere("Oet for nurses in australia reddit", o), false); assert.equal(askedHere("Free oet for nurses in australia", o), false);
  assert.equal(askedHere("Which countries accept OET for nurses", o), true, "a clear question naming the people"); assert.equal(askedHere("OET score for nurses", o), false, "a wording needs both");
  assert.equal(askedHere("Why did a video make nurses in Australia seem tired?", o), false);
  const file = { plan: [], coverage: [{ intent: "T", coverage: [], second: [], read: [], on: ON, asked: ["Australia OET score for nurses"] }] }, p = { kind: "topic", title: "T", questions: [] };
  return coverageRoutes({ pages: [p], file }).then(() => assert.equal(p.questions[0].question, "Australia OET score for nurses", "a saved list brings what people ask"));
});

test("the routing of a question people ask, by meaning; no answer here → no heading", () => {
  const items = [{ part: "scores", claims: [{}] }, { part: "regulator", claims: [{}] }, { part: "fee", claims: [{}] }];
  assert.equal(itemForAsked("What score do nurses need?", items).part, "scores");
  assert.equal(itemForAsked("How do I register with the board?", items).part, "regulator");
  assert.equal(itemForAsked("How much does it cost?", items).part, "fee");
  assert.equal(itemForAsked("Why is the sky blue?", items), null);
  assert.equal(itemForAsked("Does the board take other tests such as ielts?", items), null, "the part is not on this page");
});
