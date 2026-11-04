/**
 * 🔴 RR-370 · questions and facts are matched by what they mean: each fact carries what it was collected for; the AI judges each pair once; sources must open; a preview is said as a preview; a search is matched by meaning.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { intentOfFact, misplaced, PART_INTENTS, INTENTS } from "../desktop/fact-intent.mjs";
import { pairsOf, pairKey, unjudged, judgeBatch, judgeAll, applyVerdicts, markPages, fitCheckText, samplePages, JUDGE, SYSTEM } from "../desktop/qa-judge.mjs";
import { checkLink, applySources, firstPersonIn, thirdPerson, errorAddress, CORRECTIONS, linksToCheck, linksText } from "../desktop/source-links.mjs";
import { meaningKey, byMeaning, twinOf } from "../desktop/search-meaning.mjs";
import { previewOf, publishDraft } from "../desktop/publish.mjs";
import { queueSearches, serpKey } from "../desktop/serp.mjs";
import { examPlan, serviceFactsOf, usableFacts } from "../desktop/exam-plan.mjs";
import { connectByMeaning } from "../desktop/research.mjs";
import { correctedCouncils, councilFacts } from "../desktop/council-truth.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { saveBought, heldBought, allTopics, ENV_NAMES } from "../site/almiseo.mjs";
import { runTopPages } from "../site/top-pages.mjs";

const ON = "2026-11-04", NOW = `${ON}T01:00:00.000Z`, read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), OWNER = { owner: true, account: "o", plan: "owner" };
const yes = (q, a, title = "T") => ({ [pairKey(title, q, a)]: { fits: true, reason: "ok", intent: "other", place: true, worth: true } }), no = (q, a, title = "T", extra = {}) => ({ [pairKey(title, q, a)]: { fits: false, reason: "it answers something else", intent: "good-standing", place: true, worth: true, ...extra } });
const claim = (text, x = {}) => ({ claimId: text.slice(0, 8), text, link: "https://a.example/p", readOn: ON, source: "a", official: true, ...x });

test("A: a fact carries what it was collected for: a rule's kind, a part, a subject page's key; attestation is never good standing, whatever words they share", () => {
  assert.equal(intentOfFact({ part: "rules", key: "rule|Pakistan|attestation|2", text: "good standing attestation" }), "documents"); assert.equal(intentOfFact({ part: "rules", key: "rule|Pakistan|good-standing|1", text: "x" }), "good-standing"); assert.equal(intentOfFact({ part: "rules", key: "rule|Pakistan|verification|1" }), "good-standing"); assert.equal(intentOfFact({ part: "fee" }), "fee"); assert.equal(intentOfFact({ part: "home-council" }), "who-registers"); assert.equal(intentOfFact({ fact: "resultsPaper" }), "results"); assert.equal(intentOfFact({ fact: "gradeB" }), "grade"); assert.equal(intentOfFact({ part: "questions" }), null, "nothing says: the judge decides");
  assert.equal(misplaced("standing", claim("x", { intent: "documents" })), true); assert.equal(misplaced("standing", claim("x", { intent: "good-standing" })), false); assert.equal(misplaced("standing", claim("x", { intent: "documents", gap: true })), false); assert.equal(misplaced("questions0", claim("x", { intent: "documents" })), false); assert.equal(misplaced("fee", claim("x", { intent: "remark" })), true, "a re-mark's fee does not answer what the test costs"); assert.equal(misplaced("otherfees", claim("x", { intent: "remark" })), false, "it has a question of its own"); assert.equal(misplaced("centres", claim("x", { intent: "booking" })), false, "the official finder is where to take it"); for (const v of Object.values(PART_INTENTS)) for (const i of v) assert.ok(INTENTS.includes(i));
  const f = serviceFactsOf({ Pakistan: { rules: [{ key: "rule|Pakistan|attestation|2", value: { rule: "MOFA attests documents for going abroad." }, source: "https://mofa.gov.pk/x", readOn: ON }, { key: "rule|Pakistan|good-standing|1", value: { rule: "PMDC issues only one Certificate of Good Standing per foreign regulatory authority, and the applicant must name that authority." }, source: "https://pmdc.pk/y", readOn: ON }] } }, "OET").Pakistan;
  assert.deepEqual(f.map(intentOfFact), ["documents", "good-standing"], "the key stays with the fact through the service");
  const plan = examPlan({ subject: "OET", professions: ["dentistry"], countries: ["Pakistan"], research: {}, facts: usableFacts([...f, { part: "home-council", country: "Pakistan", profession: "dentistry", councilName: "Pakistan Medical and Dental Council (PMDC)", text: "PMDC registers dentists in Pakistan.", link: "https://pmdc.pk/", on: ON, verified: true }]), subjectFacts: { scale: { claimId: "s", fact: "scale", text: "OET's own page: each sub-test is reported on a scale from 0 to 500.", link: "https://oet.com/s", readOn: ON, official: true } }, maxCountries: 5, collector: [{ kind: "country-profession", country: "Pakistan", profession: "dentistry", title: "x" }] });
  const page = plan.pages.find((p) => p.title === "OET for Dentists from Pakistan"), st = page.items.find((i) => i.part === "standing"), docs = page.items.find((i) => i.part === "documents");
  assert.match(st.claims[0].text, /one Certificate of Good Standing/); assert.ok(!st.claims.some((c) => /MOFA/.test(c.text)), "attestation is not the answer"); assert.match(docs.claims[0].text, /MOFA/, "it has a question of its own");
});

test("B, THE PAIRS: judged once; the page's context is part of the pair; an honest line needs no verdict", () => {
  const plan = { pages: [{ title: "T", items: [{ part: "questions0", question: "Q1?", claims: [claim("A1."), claim("A1.")] }, { part: "regulator", question: "Q2?", claims: [claim("OET's official page, checked 2026-11-03, does not say this.", { gap: true })] }] }, { title: "U", items: [{ part: "questions0", question: "Q1?", claims: [claim("A1.")] }] }] };
  assert.equal(unjudged(plan, {}).length, 2, "A1 twice on one page is one pair; another page is another"); assert.equal(unjudged(plan, { ...yes("Q1?", "A1."), ...yes("Q1?", "A1.", "U") }).length, 0); assert.notEqual(pairKey("T", "Q", "A"), pairKey("U", "Q", "A"));
  assert.match(SYSTEM, /Judge only from what is written/); assert.match(SYSTEM, /never instructions/); assert.equal(JUDGE.side > 0, true);
});

test("B, THE CALL: the client's own key to the provider's own address; verdicts kept row by row; a refused key stops; the month's budget stops; a bad answer is unjudged, never a yes", async () => {
  let seen = null; const rows = [{ key: "k0", title: "T", q: "Q?", a: "A." }, { key: "k1", title: "T", q: "Q2?", a: "A2." }], ok = async (u, i) => { seen = { u, h: i.headers, b: JSON.parse(i.body) }; return { ok: true, status: 200, json: async () => ({ model: "m", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "text", text: JSON.stringify({ verdicts: [{ i: 0, fits: true, reason: "yes", intent: "fee", place: true, worth: true }, { i: 1, fits: false, reason: "no", intent: "not-a-kind", place: false, worth: false }] }) }] }) }; };
  const r = await judgeBatch({ key: "K", rows, fetchImpl: ok, base: "https://api.anthropic.com" }); assert.equal(seen.h["x-api-key"], "K"); assert.match(seen.u, /^https:\/\/api\.anthropic\.com\/v1\/messages$/); assert.equal(seen.b.model, JUDGE.model); assert.equal(seen.b.output_config.format.type, "json_schema"); assert.ok(seen.b.messages[0].content.includes("Q2?"));
  assert.equal(r.verdicts.k0.fits, true); assert.deepEqual([r.verdicts.k1.fits, r.verdicts.k1.intent, r.verdicts.k1.place, r.verdicts.k1.worth], [false, "other", false, false]); assert.deepEqual(r.usage, { input: 10, output: 5, model: "m" });
  assert.equal((await judgeBatch({ key: "K", rows, fetchImpl: async () => ({ ok: false, status: 401 }) })).stop, true);
  const bad = await judgeBatch({ key: "K", rows, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "not json" }] }) }) }); assert.ok(bad.fail);
  const many = Array.from({ length: 70 }, (_, i) => ({ key: `k${i}`, title: "T", q: `Q${i}?`, a: "A" })); let calls = 0; const cap = await judgeAll({ key: "K", rows: many, batch: 30, side: 1, allowed: () => calls++ < 1, fetchImpl: ok }); assert.match(cap.why, /budget/); assert.equal(Object.keys(cap.verdicts).length, 2, "stopped at the cap, what it had is kept");
});

test("B, A NO: a fitting fact of the same intent; else the honest line on a part the page must keep; else the question goes; a renamed heading returns first; a misplaced fact goes with no AI", () => {
  const Q = "How do I prove good standing?", A = "MOFA attests documents.", goodFact = claim("PMDC issues a Certificate of Good Standing.", { intent: "good-standing", claimId: "g" });
  const P = (items, x = {}) => ({ title: "T", kind: "origin-profession", country: "Pakistan", profession: "dentistry", items, ...x }), other = { title: "O", kind: "country", country: "Pakistan", items: [{ part: "rules", question: "Rules?", claims: [goodFact] }] };
  const a = { pages: [P([{ part: "questions0", question: Q, claims: [claim(A)] }]), other] }; const la = applyVerdicts(a, no(Q, A)); assert.equal(a.pages[0].items[0].claims[0].text, goodFact.text, "a fitting fact"); assert.ok(la.some((x) => /fitting fact/.test(x.action)));
  const b = { pages: [P([{ part: "standing", question: Q, claims: [claim(A)] }])] }; applyVerdicts(b, no(Q, A)); assert.match(b.pages[0].items[0].claims[0].text, /official page, checked 2026-11-04, does not say this\./); assert.equal(b.pages[0].items[0].claims[0].gap, true, "the honest line");
  const c = { pages: [P([{ part: "questions0", question: Q, claims: [claim(A)] }])] }; applyVerdicts(c, no(Q, A)); assert.equal(c.pages[0].items.length, 0, "dropped"); assert.equal(c.droppedQuestions[0].question, Q);
  const d = { pages: [P([{ part: "scores", question: "Minimum for nurses?", q0: "What does the board ask of dentists?", claims: [claim("Dental Board asks 350.")] }])] }; applyVerdicts(d, no("Minimum for nurses?", "Dental Board asks 350.")); assert.equal(d.pages[0].items[0].question, "What does the board ask of dentists?", "the part's own question first"); assert.equal(d.pages[0].items[0].claims[0].text, "Dental Board asks 350.");
  const e = { pages: [P([{ part: "standing", question: Q, claims: [claim(A, { intent: "documents" })] }])] }; assert.ok(applyVerdicts(e, {}).length); assert.equal(e.pages[0].items[0].claims[0].gap, true, "no AI needed: it was collected as documents");
  const f = { pages: [P([{ part: "standing", question: Q, claims: [claim("Keep."), claim(A)] }])] }; applyVerdicts(f, no(Q, A)); assert.deepEqual(f.pages[0].items[0].claims.map((x) => x.text), ["Keep."], "the good answer stays");
});

test("B, THE PLACE AND THE WORTH: a country page keeps its own questions; another moves to a topic page or goes; a question of no use goes; a part the page must keep is never dropped this way", () => {
  const home = { title: "Top", kind: "topic", items: [{ part: "topic", question: "Booking?", claims: [claim("B.", { intent: "booking" })] }] }, Q = "Is there an official link to book?", A = "Yes, on oet.com.", T = "OET in Ireland", V = { [pairKey(T, Q, A)]: { fits: true, reason: "not Ireland's", intent: "booking", place: false, worth: true } };
  const a = { pages: [{ title: T, kind: "country", country: "Ireland", items: [{ part: "questions1", question: Q, claims: [claim(A)] }] }, home] }; applyVerdicts(a, V); assert.equal(a.pages[0].items.length, 0); assert.ok(home.items.some((i) => i.question === Q), "moved");
  const W = "Is there a sitting area for parents?", b = { pages: [{ title: T, kind: "country", country: "Ireland", items: [{ part: "questionsa3", question: W, claims: [claim("Unknown.")] }] }] }; applyVerdicts(b, { [pairKey(T, W, "Unknown.")]: { fits: true, reason: "no use", intent: "other", place: true, worth: false } }); assert.equal(b.pages[0].items.length, 0);
  const c = { pages: [{ title: T, kind: "country", country: "Ireland", items: [{ part: "fee", question: "Fee?", claims: [claim("AUD 587.")] }] }] }; applyVerdicts(c, { [pairKey(T, "Fee?", "AUD 587.")]: { fits: true, reason: "", intent: "fee", place: false, worth: false } }); assert.equal(c.pages[0].items.length, 1);
  const d = { pages: [{ title: "OET for Nurses from Kenya", kind: "origin-profession", country: "Kenya", items: [{ part: "questions0", question: Q, claims: [claim(A)] }] }] }; applyVerdicts(d, { [pairKey(d.pages[0].title, Q, A)]: { fits: true, reason: "", intent: "booking", place: false, worth: true } }); assert.equal(d.pages[0].items.length, 1, "place is a country page's test");
});

test("B, READY: a pair not judged holds the page, a fact of the plan says so; no AI connected holds nothing and says not judged; the gate and the run are wired", () => {
  const plan = { pages: [{ title: "T", items: [{ part: "questions0", question: "Q?", claims: [claim("A.")] }] }] }; markPages(plan, {}, { judging: true }); assert.equal(plan.pages[0].fitCheck.unjudged, 1); markPages(plan, yes("Q?", "A."), { judging: true }); assert.equal(plan.pages[0].fitCheck.unjudged, 0); markPages(plan, {}, { judging: false }); assert.deepEqual([plan.pages[0].fitCheck.notJudged, plan.pages[0].fitCheck.unjudged], [true, 0]);
  const S = read("desktop/seo-pages.mjs"), M = read("desktop/main.mjs"); assert.match(S, /push\("Q", "each answer judged to fit its question", m\.fitCheck\?\.unjudged/); assert.match(S, /fitCheck: p\.fitCheck \?\? null/); assert.match(M, /await factsStep\(exam, quick, step\);/); assert.match(M, /await factsStep\(exam, false, step\); savePlan\(id, exam\);/, "and after a repair round"); assert.match(M, /allowed: \(\) => LEDGER\.allowed\(\)\.ok, onUsage: \(u\) => LEDGER\.add\(u\)/, "the month's cap and the cost");
});

test("C: thirty random ready pages of every type, every pair with its verdict; a NO or not judged is counted plainly", () => {
  const pages = ["origin-profession", "country", "topic"].flatMap((kind) => Array.from({ length: 20 }, (_, i) => ({ title: `${kind} ${i}`, kind, items: [{ part: "questions0", question: "Q?", claims: [claim(`A${i}.`)] }] })));
  const s = samplePages(pages, { count: 30, seed: 20261104 }); assert.equal(s.length, 30); assert.equal(new Set(s.map((p) => p.title)).size, 30); for (const k of ["origin-profession", "country", "topic"]) assert.ok(s.some((p) => p.kind === k)); assert.deepEqual(samplePages(pages, { count: 30, seed: 20261104 }).map((p) => p.title), s.map((p) => p.title), "the same day's sample can be read again");
  const plan = { pages: pages.slice(0, 2) }, t = fitCheckText({ plan, verdicts: { ...yes("Q?", "A0.", plan.pages[0].title), ...no("Q?", "A1.", plan.pages[1].title) }, on: ON, seed: 1, by: "x", count: 2 }); assert.match(t, /yes 1, NO 1/); assert.match(t, /Q: Q\?/); assert.match(t, /Verdict: NO: it answers something else/);
  assert.match(fitCheckText({ plan, verdicts: {}, on: ON, seed: 1, by: "x", count: 2 }), /not judged 2/);
});

test("ITEM 1 + 3 + 4: an unlisted profession is never joined to Ahpra's standard; the scores are cited to the policy; a score question is not answered by the scale", () => {
  const f = (profession) => ({ country: "Australia", profession, part: "councils", text: "In Australia: Medical Board of Australia (via Ahpra). Accepts OET. Tests on/after 23 Apr 2026: Listening 350, Reading 360, Writing 350, Speaking 360.", link: "https://www.ahpra.gov.au/x", on: ON, verified: true }), body = { name: "AHPRA", short: "AHPRA", website: "https://www.ahpra.gov.au" }, q = (profession) => ({ kind: "score", country: "Australia", profession, question: "What?", regulator: body, also: [], answer: null, searched: [] });
  const facts = [f("medicine"), f("dentistry")], vets = [q("veterinary science")], nurses = [q("nursing")]; connectByMeaning({ questions: vets, facts, prof: "veterinary science", subject: "OET" }); connectByMeaning({ questions: nurses, facts, prof: "nursing", subject: "OET" });
  assert.ok(!vets[0].answer, "Ahpra's own policy does not name vets"); assert.ok(nurses[0].answer, "nurses are Ahpra's");
  assert.equal(CORRECTIONS.bodyCovers["ahpra.gov.au"].includes("dietetics"), false); assert.equal(CORRECTIONS.bodyCovers["ahpra.gov.au"].includes("speech pathology"), false);
  const plan = { pages: [{ title: "T", items: [{ part: "scores", question: "Q?", claims: [claim("In Australia: Tests on/after 23 Apr 2026: Listening 350, Reading 360, Writing 350, Speaking 360, no overall score.", { link: "https://www.ahpra.gov.au/Registration/Registration-Standards/English-language-skills/Accepted-English-language-tests.aspx" })] }] }] }; applySources(plan); const c = plan.pages[0].items[0].claims[0]; assert.match(c.link, /record=WD26\/36006/); assert.equal(c.readOn, "2026-11-04"); assert.match(c.source, /Transition arrangements policy \(April 2026\), Table 2/);
});

test("ITEM 3: whatever route brought it, a body's words are no answer for a profession its policy does not name; its own professions keep them; a part the page must keep says so plainly", () => {
  const L = "https://www.ahpra.gov.au/Registration/Registration-Standards/English-language-skills/Accepted-English-language-tests", line = claim("In Australia: AHPRA names OET among the English tests it accepts: Listening 350.", { link: L, readOn: "2026-11-04" }), other = claim("In the United Kingdom: RCVS asks for B.", { link: "https://www.rcvs.org.uk/x", readOn: "2026-11-04" });
  const page = (profession, part, claims) => ({ title: profession, profession, items: [{ part, question: "Where do they go?", claims }] });
  const vets = page("veterinary science", "destinations", [line, other]), nurses = page("nursing", "destinations", [line, other]), speech = page("speech pathology", "scores", [line]), asked = page("dietetics", "questions1", [line]), plan = { pages: [vets, nurses, speech, asked] }, { removed } = applySources(plan, { checks: {} });
  assert.deepEqual(vets.items[0].claims.map((c) => c.text), [other.text], "another country's line stays"); assert.equal(nurses.items[0].claims.length, 2, "Ahpra's own"); assert.equal(removed.filter((r) => /does not regulate/.test(r.why)).length, 3);
  assert.match(speech.items[0].claims[0].text, /^Ahpra does not regulate this profession/); assert.equal(speech.items[0].claims[0].gap, true); assert.doesNotMatch(speech.items[0].claims[0].text, /350/); assert.equal(asked.items.length, 0, "a question people asked goes");
});

test("ITEM 2: grade B is a band, on OET's own guide; the old line is replaced wherever it stands", () => {
  const t = CORRECTIONS.subject.gradeB; assert.match(t.text, /grade B is 350 to 440/); assert.match(t.text, /grade A is 450 to 500/); assert.match(t.text, /grade C\+ is 300 to 340/); assert.match(t.text, /grade C is 200 to 290/); assert.match(t.link, /Understanding%20your%20score/);
  const plan = { pages: [{ title: "T", items: [{ part: "topic", question: "Grade?", claims: [claim("OET reports each sub-test as a grade from A to E, and Grade B corresponds to a scale score of 350. The grade you need is set by the organisation requiring the result, so check their requirements.")] }] }] }; applySources(plan); assert.match(plan.pages[0].items[0].claims[0].text, /350 to 440/); assert.doesNotMatch(plan.pages[0].items[0].claims[0].text, /corresponds to a scale score of 350/); assert.match(read("desktop/main.mjs"), /CORRECTIONS\.subject/);
});

test("ITEM 3 + 6: AVBC registers no one, the state boards do; Pakistan's registration names the page that says it; the page checked is named", () => {
  const { facts } = councilFacts(correctedCouncils([{ part: "home-council", country: "Australia", profession: "veterinary science", councilName: "Australasian Veterinary Boards Council Inc.", text: "Australasian Veterinary Boards Council Inc. registers vets in Australia — https://avbc.asn.au.", link: "https://avbc.asn.au/contact-us/", on: ON }, { part: "home-council", country: "Pakistan", profession: "nursing", councilName: "PNMC", text: "PNMC registers nurses in Pakistan.", link: "https://pnmc.gov.pk/contact-us/", on: ON }]), {}, { inPlace: (c) => c, peopleOf: (p) => p, today: ON }), vet = facts.find((f) => f.country === "Australia"), pk = facts.find((f) => f.country === "Pakistan" && f.profession === "nursing");
  assert.match(vet.text, /register with the veterinary board of the state or territory/); assert.doesNotMatch(vet.text, /Council Inc\. registers/); assert.match(vet.link, /avbc-member-registration-boards/); assert.equal(pk.text, "PNMC registers nurses in Pakistan.", "the council line stands"); assert.match(pk.stepsLine, /online through its portal/); assert.equal(pk.stepsLink, "https://pnmc.gov.pk/pnmc-registration-2/");
  assert.match(read("desktop/exam-plan.mjs"), /\/contact\/i\.test\(gapLink\) \? "contact"/);
});

test("ITEM 7: never \"I\" on a page: rewritten, or the line goes; the gate reads the page", () => {
  assert.equal(firstPersonIn("but I found no general free exam sittings"), true); assert.equal(firstPersonIn("Part I of the test"), false); assert.equal(thirdPerson("OET offers samples, but I found no general free exam sittings."), "OET offers samples, but the pages checked show no general free exam sittings.");
  const plan = { pages: [{ title: "T", items: [{ part: "questions0", question: "Q?", claims: [claim("OET offers samples, but I found no free sittings."), claim("I think you should book.")] }] }] }, r = applySources(plan); assert.equal(plan.pages[0].items[0].claims.length, 1); assert.doesNotMatch(plan.pages[0].items[0].claims[0].text, /\bI\b/); assert.equal(r.removed.length, 1); assert.match(read("desktop/seo-pages.mjs"), /push\("P", "no page speaks as/);
});

test("ITEM 9: an error page is broken, a robot's refusal is not; a broken link is replaced or its claim goes; the fee cites the fee page", async () => {
  assert.equal(errorAddress("https://www.ahpra.gov.au/Error/500.aspx?cookiesChecked=y"), true); assert.equal(errorAddress("https://www.doh.gov.ae/404?item=x"), true); assert.equal(errorAddress("https://a.example/error-correction-guide"), false);
  const fake = (status, url = "https://a.example/") => async () => ({ status, ok: status < 400, url });
  assert.equal((await checkLink("https://a.example/", { fetchImpl: fake(200) })).state, "ok"); assert.equal((await checkLink("https://a.example/page", { fetchImpl: fake(404) })).state, "broken"); assert.equal((await checkLink("https://a.example/", { fetchImpl: fake(404) })).state, "unchecked", "a home page's 404 is about the robot"); assert.equal((await checkLink("https://a.example/", { fetchImpl: fake(403) })).state, "unchecked"); assert.equal((await checkLink("https://a.example/", { fetchImpl: fake(200, "https://a.example/Error/500.aspx") })).state, "broken", "a redirect to an error page"); assert.equal((await checkLink("https://a.example/", { fetchImpl: async () => { throw new Error("x"); } })).state, "unchecked");
  const plan = { pages: [{ title: "T", items: [{ part: "rules", question: "Q?", claims: [claim("Ahpra sends it to a body.", { link: "https://www.ahpra.gov.au/Error/500.aspx?cookiesChecked=y" }), claim("Gone.", { link: "https://b.example/gone" }), claim("Kept.", { link: "https://c.example/ok" }), claim("Refused.", { link: "https://d.example/403" })] }, { part: "fee", question: "Fee?", claims: [claim("The full test costs AUD 587 (the official fee).", { link: "https://oet.com/test/oet-test-at-home" })] }, { part: "questions1", question: "Doh?", claims: [claim("Only this.", { link: "https://www.doh.gov.ae/404?item=x" })] }] }] }, r = applySources(plan, { checks: { "https://b.example/gone": { state: "broken", why: "it answered 404" }, "https://d.example/403": { state: "unchecked", why: "x" } } }), it = plan.pages[0].items;
  assert.deepEqual(it[0].claims.map((c) => c.text), ["Ahpra sends it to a body.", "Kept.", "Refused."]); assert.match(it[0].claims[0].link, /Certificate-of-Registration-Status/); assert.match(it[1].claims[0].link, /How-much-does-OET-cost/); assert.equal(it.length, 2, "a question left with nothing goes"); assert.equal(r.removed.length, 2);
  const kept = { pages: [{ title: "K", items: [{ part: "standing", question: "Q?", claims: [claim("Gone.", { link: "https://b.example/gone" })] }] }] }; applySources(kept, { checks: { "https://b.example/gone": { state: "broken", why: "x" } } }); assert.match(kept.pages[0].items[0].claims[0].text, /b\.example's own page could not be read on 2026-11-04; this is still being looked for\./); assert.equal(kept.pages[0].items[0].claims[0].link, "https://b.example/", "the page stands, with an address that is not the broken one");
  assert.deepEqual(linksToCheck({ pages: [{ items: [{ claims: [claim("x", { link: "https://k.example/" }), claim("y", { link: "https://n.example/" })] }] }] }, { "https://k.example/": { on: NOW } }, { now: NOW }), ["https://n.example/"]);
  assert.match(linksText({ checks: { "https://c.example/ok": { state: "ok" }, "https://d.example/403": { state: "unchecked", why: "it refuses automatic readers (403)" } }, plan, on: ON }), /opens 1, broken 0, a site that would not let the check in 1/);
});

test("THE WINDOW: the links are opened on a thread of their own, never the app's; a thread that dies leaves the links unchecked, and the run goes on", async () => {
  const { checkLinksOff } = await import("../desktop/source-links.mjs"), { Worker } = await import("node:worker_threads"); assert.match(read("desktop/main.mjs"), /await checkLinksOff\(urls, \{ kept: checks, Worker: LinkWorker/); assert.doesNotMatch(read("desktop/main.mjs"), /await checkLinks\(/);
  const server = (await import("node:http")).createServer((q, r) => { r.statusCode = /missing/.test(q.url) ? 404 : 200; r.end(JSON.stringify({})); }); await new Promise((ok) => server.listen(0, "127.0.0.1", ok)); const seen = [], base = `http://127.0.0.1:${server.address().port}`, kept = await checkLinksOff([`${base}/page`, `${base}/missing/page`], { Worker, onDone: (u) => seen.push(u) }); server.close();
  assert.equal(kept[`${base}/page`].state, "ok"); assert.equal(kept[`${base}/missing/page`].state, "broken"); assert.equal(seen.length, 2, "progress crosses over");
  class Dead { constructor() { throw new Error("no thread"); } } assert.deepEqual(await checkLinksOff(["https://x.example/"], { Worker: Dead, kept: { a: 1 } }), { a: 1 });
});

test("A: a rule read on another profession's council site never stands in on this profession's page; the same site is welcome on its own profession's", () => {
  const verdicts = {}, mk = (profession, title) => ({ kind: "local", country: "Zimbabwe", profession, title, items: [{ part: "standing", question: "How do they prove good standing?", claims: [{ claimId: "a", text: "Bad line", link: "https://own.example/x", intent: "good-standing" }] }] });
  const vets = mk("vets", "Vets"), docs = mk("medicine", "Doctors"), home = { kind: "country", country: "Zimbabwe", title: "In Zimbabwe", items: [{ part: "rules", question: "Rules?", claims: [{ claimId: "b", text: "Ask the medical council for a certificate.", link: "https://www.mdc.example/cgs", intent: "good-standing" }] }] };
  for (const p of [vets, docs]) verdicts[pairKey(p.title, "How do they prove good standing?", "Bad line")] = { fits: false, intent: "good-standing", reason: "no" };
  const plan = { pages: [vets, docs, home], bodyHosts: { Zimbabwe: { "mdc.example": ["medicine"] } } }; applyVerdicts(plan, verdicts);
  assert.ok(!JSON.stringify(vets.items).includes("mdc.example"), "not on the vets' page"); assert.ok(JSON.stringify(docs.items).includes("mdc.example"), "it is the doctors' own");
});

test("A: the plan's builder takes another profession's council's rules off this page, by whose site they were read on", () => {
  assert.match(read("desktop/exam-plan.mjs"), /!ofAnotherBody\(f\.link\) && \(intentOfFact\(f\) === "good-standing"/); assert.match(read("desktop/exam-plan.mjs"), /!ofAnotherBody\(f\.link\) && intentOfFact\(f\) === "documents"/); assert.match(read("desktop/exam-plan.mjs"), /claims\.filter\(\(c\) => !ofAnotherBody\(c\.link\)\)/);
});

test("A: the test's price stands alone; what a change or a re-mark costs is answered under its own question", async () => {
  const { splitOtherFees } = await import("../desktop/fact-intent.mjs"), p = { items: [{ part: "fee", question: "How much does OET cost?", claims: [{ text: "AU$587", intent: "fee" }, { text: "AU$120 to move", intent: "booking" }, { text: "re-mark AU$100", intent: "remark" }] }] }; splitOtherFees([p], "OET");
  assert.deepEqual(p.items[0].claims.map((c) => c.text), ["AU$587"]); assert.equal(p.items[1].part, "otherfees"); assert.match(p.items[1].question, /change an OET booking or ask for a re-mark/); assert.equal(p.items[1].claims.length, 2);
  assert.match(read("desktop/exam-plan.mjs"), /splitOtherFees\(pages, subject\);/);
});

test("C: the sample stands still: one page more or less leaves the other pages where they were", () => {
  const pages = Array.from({ length: 200 }, (_, i) => ({ title: `Page ${i}`, kind: "local" })), a = samplePages(pages, { count: 30, seed: 7 }).map((p) => p.title), gone = a[3], b = samplePages(pages.filter((p) => p.title !== gone), { count: 30, seed: 7 }).map((p) => p.title);
  assert.equal(a.filter((x) => !b.includes(x)).length, 1, "only the page that went"); assert.notDeepEqual(a, samplePages(pages, { count: 30, seed: 8 }).map((p) => p.title), "another day, another sample");
});

test("the checks that stayed green when broken: each now read", async () => {
  /* an honest line stands, whatever a verdict says of it */
  const line = { claimId: "o", text: "The page could not be read; this is still being looked for.", gap: true, link: "https://x.example/", intent: "good-standing" }, page = { title: "T", kind: "local", country: "X", profession: "nursing", items: [{ part: "standing", question: "Q?", claims: [line] }] };
  applyVerdicts({ pages: [page] }, { [pairKey("T", "Q?", line.text)]: { fits: false, intent: "good-standing", reason: "no" } }); assert.deepEqual(page.items[0].claims.map((c) => c.text), [line.text]);
  /* every type of page reaches the sample, however few */
  const many = [...Array.from({ length: 300 }, (_, i) => ({ title: `Local ${i}`, kind: "local" })), { title: "The one topic", kind: "topic" }]; for (const seed of [1, 2, 3, 4, 5]) assert.ok(samplePages(many, { count: 5, seed }).some((p) => p.kind === "topic"), `seed ${seed}`);
  /* autocomplete stands apart from a search */
  const { byMeaning, twinOf } = await import("../desktop/search-meaning.mjs"); assert.equal(byMeaning(["auto|nurses|en"]).size, 0); assert.equal(twinOf("auto|nurses|en", byMeaning(["nurses|x|en"])), null);
  /* the page's own gate, its family, the words on the screen */
  const pages = read("desktop/seo-pages.mjs"), ui = read("desktop/ui.html"); assert.match(pages, /push\("P", [^\n]*it\.answers\.filter\(\(a\) => firstPersonIn\(a\)\)/); assert.match(pages, /if \(m\.profession && other === m\.profession\) return true;/); assert.match(ui, /id="previewline"><b>Approve &amp; Publish and Publish all ready write to a preview, not your live site:/);
});

test("ITEM 11: a search is matched by meaning: the app reuses, the server answers, the collector buys nothing for it; another country or Reddit is another search", async () => {
  assert.equal(meaningKey("OET for Nurses from Bangladesh"), meaningKey("OET for nursing in Bangladesh")); assert.equal(meaningKey("cost of oet exam"), meaningKey("exam fee for oet")); assert.equal(meaningKey("oet centre near me"), meaningKey("oet exam center near me")); assert.equal(meaningKey("OET in Singapore: fee, centres and councils"), meaningKey("OET in Singapore")); assert.equal(meaningKey("OET in the Philippines"), meaningKey("OET in Philippines"));
  assert.notEqual(meaningKey("OET for Nurses from Bangladesh"), meaningKey("OET for Nurses from Nepal")); assert.notEqual(meaningKey("OET for Nurses from Bangladesh"), meaningKey("OET for Doctors from Bangladesh")); assert.notEqual(meaningKey("OET for Nurses"), meaningKey("OET for Nurses reddit")); assert.equal(twinOf("auto|oet fee|Ghana", byMeaning(["auto|oet cost|Ghana"])), null, "autocomplete stands apart");
  let posts = 0; const ledger = { spent: [], serpCache: { [serpKey("OET for nursing in Bangladesh")]: { ok: true, results: [{ url: "https://r.example/" }], paa: [], related: [], at: NOW } } }, wanted = [{ key: serpKey("OET for Nurses from Bangladesh"), q: "OET for Nurses from Bangladesh", task: [{}] }]; await queueSearches({ wanted, settings: { on: true }, ledger, login: "l", password: "p", now: NOW, fetchImpl: async () => { posts++; return { json: async () => ({}) }; } }); assert.equal(posts, 0, "not bought"); assert.equal(ledger.serpCache[serpKey("OET for Nurses from Bangladesh")].cost, 0); assert.equal(ledger.spent.length, 0);
  const seo = seoMemoryStore(); await saveBought({ seo, subject: "OET", searches: [{ key: serpKey("OET for nursing in Kenya"), on: ON, results: [{ url: "https://t.example/a", title: "A" }], paa: [], related: [] }], lic: OWNER, at: NOW }); const h = await heldBought({ seo, subject: "OET", keys: [serpKey("OET for Nurses from Kenya")], lic: OWNER, at: NOW }); assert.equal(h.searches[serpKey("OET for Nurses from Kenya")].results[0].url, "https://t.example/a", "the server answers in other words");
  const topic = (await allTopics({ seo })).find((t) => t.id === "oet"), env = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" }; await seo.putTopic({ ...topic, intents: ["OET for Nurses from Ghana", "OET for nursing in Ghana", "OET for Nurses from Kenya"], owner: "almiworld", jobs: ["top-pages"] }, { at: NOW }); await seo.putList({ topic: "oet", intent: "OET for nursing in Ghana", location: "United States", language: "en", day: ON, results: [], paa: [], related: [] }); await seo.putCoverage({ topic: "oet", intent: "OET for nursing in Ghana", day: ON, coverage: [], second: [], read: [] });
  let paid = 0; const out = await runTopPages({ seo, cf: cfMemoryStore(), env, reader: { requests: () => 0, raw: async () => null }, fetchImpl: async (u) => { if (/task_post/.test(u)) paid++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ items: [{}] }] }] }) }; }, now: () => Date.parse(NOW) }); assert.equal(paid, 0, "not one search bought"); assert.equal(out.sameMeaning, 1); assert.ok(out.reused >= 1, JSON.stringify(out));
});

test("ITEM 12: a GitHub branch other than the main one is a preview: written to that branch, never said as live, nothing sent to a search engine; the screen says so", async () => {
  const t = { kind: "github", site: "https://almioet.almiworld.com", repo: "o/r", branch: "visibility-pages", folder: "" }; assert.deepEqual(previewOf(t), { branch: "visibility-pages", repo: "o/r", folder: "" }); assert.equal(previewOf({ ...t, branch: "main" }), null); assert.equal(previewOf({ kind: "wordpress" }), null);
  let sent = null; const out = await publishDraft({ draft: { url: "https://almioet.almiworld.com/guides/x", title: "X", html: "<main>x</main>", readyAsDraft: true }, target: t, key: "K", testBase: "http://127.0.0.1:9", allowLocal: true, fetchImpl: async (u, i) => { sent = { u, b: JSON.parse(i.body) }; return { ok: true, status: 201, json: async () => ({ content: { sha: "s" } }), text: async () => JSON.stringify({ content: { sha: "s" } }) }; } });
  assert.equal(out.ok, true, JSON.stringify(out)); assert.equal(out.live, null); assert.equal(out.preview.branch, "visibility-pages"); assert.match(sent.u, /\/repos\/o\/r\/contents\/[\w/-]*x\/index\.html$/); assert.equal(sent.b.branch, "visibility-pages");
  const onMain = await publishDraft({ draft: { url: "https://almioet.almiworld.com/guides/x", title: "X", html: "<main>x</main>", readyAsDraft: true }, target: { ...t, branch: "main" }, key: "K", testBase: "http://127.0.0.1:9", allowLocal: true, fetchImpl: async () => ({ ok: true, status: 201, json: async () => ({ content: {} }), text: async () => "{}" }) }); assert.match(onMain.live, /almioet\.almiworld\.com/);
  const M = read("desktop/main.mjs"), U = read("desktop/ui.html"); assert.match(M, /state: out\.preview \? "PREVIEW" : "LIVE"/); assert.match(M, /It is NOT live, and nothing was sent to Google or Bing/); assert.match(U, /write to a preview, not your live site/); assert.match(U, /In the preview ✓/);
});

test("ITEM 10: no link twice, none to another profession's or country's page, the family first", () => {
  const S = read("desktop/seo-pages.mjs"), E = read("desktop/exam-plan.mjs"); assert.match(S, /const fitsLink = \(np, l\) =>/); assert.match(S, /other && other !== m\.profession/); assert.match(S, /!names\.has\(nameOfLink\(l\)\)/); assert.match(E, /p\.links = \[p\.home, p\.prof, \.\.\.\[\.\.\.kin\.slice/);
});
