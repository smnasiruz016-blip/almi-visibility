/**
 * 🔴 RR-356 (owner: "good searching means asking the right questions — the fault is in Visibility's code") — THE RESEARCH ENGINE and
 * IMPROVE, DON'T DUPLICATE.
 *   1 the question list: one score question per main destination the exam owner's list names a regulator in, and the Writing task
 *   2 understand and connect: a body's one standard for all its boards answers every profession it registers (Ahpra → nurses)
 *   3 search what is missing: the regulator's own page is read (verbatim-checked), kept 30 days; a page that cannot be read stays open
 *   4 write only then: ✅ only when the standard questions are answered; else ⚠️ names them; each page keeps its research ledger
 *   B the client's existing page on the same profession / country is improved — never a second page; the pack holds only what it lacks
 * Each step is proved RED by breaking it (test/…: the sabotage run in the PR).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { destinationsFor, professionQuestions, connectByMeaning, searchMissing, openOf, ledgerOf, MAIN_DESTINATIONS } from "../desktop/research.mjs";
import { examPlan } from "../desktop/exam-plan.mjs";
import { improvePack, alreadyAsked } from "../desktop/improve.mjs";
import { improveExisting, withSection, improveVia } from "../desktop/publish.mjs";
import { officialReader } from "../desktop/official.mjs";
import { plainScores } from "../desktop/page-quality.mjs";
import { jobReport } from "../desktop/plain-words.mjs";

const ON = "2026-11-01";
const reg = (id, country, name, professions, extra = {}) => ({ id, country, name, kind: "Healthcare regulator", professions, ...extra });
const LIST = [
  reg("nmc", "United Kingdom", "Nursing and Midwifery Council (NMC)", ["nursing"], { short: "NMC", website: "https://www.nmc.org.uk" }),
  reg("ahpra", "Australia", "Australian Health Practitioner Regulation Agency (AHPRA)", ["nursing", "medicine", "pharmacy", "dentistry"], { short: "AHPRA", website: "https://www.ahpra.gov.au/", record: { officialUrl: "https://www.ahpra.gov.au/registration/registration-standards/english-language-skills.aspx" } }), // as in the real list: its own record first
  reg("nmba", "Australia", "Nursing and Midwifery Board of Australia", ["nursing"], { website: "https://www.nursingmidwiferyboard.gov.au" }),
  reg("nz", "New Zealand", "Nursing Council of New Zealand", ["nursing"], { website: "http://127.0.0.1:1/nz" }),
  reg("nam", "Namibia", "Health Professions Councils of Namibia", ["nursing"]), // no address: never a question
  reg("acp", "Canada", "Alberta College of Pharmacy", ["pharmacy"], { website: "https://abpharmacy.example" }), // another profession: never a nurses question
  reg("mt", "Malta", "Council for Nurses and Midwives Malta", ["nursing"], { website: "https://nurses.example.mt" }),
  { id: "visa", country: "Australia", name: "Australian Department of Home Affairs", kind: "Government", professions: ["nursing"] },
];
const fact = (country, profession, text, link) => ({ id: `${country}-${profession}`, country, part: "councils", profession, verified: true, text, link, on: "2026-10-31" });
const AHPRA_SAME = "Tests on/after 23 Apr 2026: Listening 350, Reading 360, Writing 350, Speaking 360, no overall score.";
const FACTS = [
  fact("United Kingdom", "nursing", "NMC accepts OET: Listening B (350+), Reading B (350+), Writing C+ (300+), Speaking B (350+).", "https://www.nmc.org.uk/x"),
  fact("Australia", "medicine", `Medical Board of Australia (via Ahpra). Accepts OET. ${AHPRA_SAME}`, "https://www.ahpra.gov.au/a"),
  fact("Australia", "pharmacy", `Pharmacy Board of Australia (via Ahpra). Accepts OET. ${AHPRA_SAME}`, "https://www.ahpra.gov.au/b"),
];

test("RR-356 · 1 · the question list: one score question per main destination on the exam owner's list, and the Writing task", () => {
  const d = destinationsFor("nursing", LIST);
  assert.deepEqual(d.map((x) => x.country), ["United Kingdom", "Australia", "New Zealand", "Malta"], "main destinations first; a country whose regulator has no address is never a question; a visa office is no regulator");
  assert.equal(d.find((x) => x.country === "Australia").regulator.short, "AHPRA");
  assert.ok(MAIN_DESTINATIONS.includes("United States") && MAIN_DESTINATIONS.includes("Canada"));
  const qs = professionQuestions({ subject: "OET", prof: "nursing", destinations: d });
  assert.deepEqual(qs.map((q) => q.id), ["score:United Kingdom", "score:Australia", "score:New Zealand", "score:Malta", "writing"]);
  assert.equal(qs[1].question, "What OET score does AHPRA in Australia ask of nurses?");
});

test("RR-356 · 2 · understand and connect: a body's one standard for all its boards answers nurses (the owner's proof: Ahpra)", () => {
  const qs = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", LIST) }), facts: FACTS, prof: "nursing" });
  const uk = qs.find((q) => q.id === "score:United Kingdom"), au = qs.find((q) => q.id === "score:Australia");
  assert.equal(uk.how, "already in Visibility's checked facts");
  assert.match(au.how, /^connected by meaning: AHPRA's standard is the same for 2 of its professions/);
  assert.match(au.answer[0].text, /^In Australia: AHPRA sets one English standard for every board it registers, the board for nurses included .* Listening 350, Reading 360, Writing 350, Speaking 360/);
  /* the opposite: one board's fact alone (no shared standard, no words saying so) is never stretched to nurses */
  const one = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", LIST) }), facts: FACTS.slice(0, 2), prof: "nursing" });
  assert.equal(one.find((q) => q.id === "score:Australia").answer, null);
  /* a body's own words that its standard is for all its boards connect it too */
  const said = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", LIST) }), facts: [fact("Australia", "medicine", `Ahpra's National Boards accept OET: ${AHPRA_SAME}`, "https://www.ahpra.gov.au/c")], prof: "nursing" });
  assert.match(said.find((q) => q.id === "score:Australia").how, /own words say its standard is for all its boards/);
});

test("RR-356 · 3 · search what is missing: the regulator's own page is read and checked; kept 30 days; what cannot be read stays open, said", async () => {
  const srv = createServer((q, r) => { if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (q.url.startsWith("/nz")) { r.writeHead(200, { "content-type": "text/html" }); return r.end("<html><head><title>English language requirements | Nursing Council</title></head><body><main><h1>English language requirements</h1><p>We accept the Occupational English Test (OET): a minimum of 350 in Listening, Reading and Speaking and 300 in Writing.</p></main></body></html>"); }
    r.writeHead(404); r.end(); });
  await new Promise((res) => srv.listen(0, "127.0.0.1", res)); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const list = LIST.map((x) => (x.id === "nz" ? { ...x, website: `${base}/nz` } : x.id === "mt" ? { ...x, website: `${base}/missing` } : x));
    const qs = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", list) }), facts: FACTS, prof: "nursing" });
    const store = {}, cache = { get: (u) => store[u] ?? null, set: (u, v) => { store[u] = v; } };
    const reader = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    await searchMissing({ questions: qs, subject: "OET", reader, cache, budget: { left: 5 }, now: `${ON}T10:00:00Z` });
    const nz = qs.find((q) => q.id === "score:New Zealand"), mt = qs.find((q) => q.id === "score:Malta");
    assert.match(nz.how, /^read on Nursing Council of New Zealand's own page/); assert.match(nz.answer[0].text, /350/);
    assert.equal(mt.answer, null); assert.ok(mt.searched.some((s) => !s.found && s.why), "what was searched and not found is said");
    assert.deepEqual(openOf(qs), ["What OET score does Council for Nurses and Midwives Malta in Malta ask of nurses?", "What is the OET Writing task for nurses?"]);
    /* kept 30 days: a second search reads nothing again; the budget is respected and said */
    const again = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", list) }), facts: FACTS, prof: "nursing" });
    const before = Object.keys(store).length; await searchMissing({ questions: again, subject: "OET", reader: { read: () => { throw new Error("read again"); }, on: ON }, cache, budget: { left: 5 }, now: `${ON}T12:00:00Z` });
    assert.equal(Object.keys(store).length, before); assert.ok(again.find((q) => q.id === "score:New Zealand").answer);
    const none = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", list) }), facts: [], prof: "nursing" });
    await searchMissing({ questions: none, subject: "OET", reader, cache: { get: () => null, set: () => {} }, budget: { left: 0 } });
    assert.match(none[0].searched[0].why, /not searched yet — Visibility reads it on the next run/);
    /* a page that says it accepts the exam but states no scores answers no score question */
    const yes = professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", list) }).slice(0, 1);
    await searchMissing({ questions: yes, subject: "OET", reader, cache: { get: () => ({ on: ON, ok: true, url: "https://x", scores: { text: "NMC names OET on its own page among the English tests it accepts.", link: "https://x", readOn: ON } }), set: () => {} }, budget: { left: 1 } });
    assert.equal(yes[0].answer, null); assert.match(yes[0].searched[0].why, /says it accepts OET but states no scores/);
    /* the ledger: each question, how it was answered, where Visibility searched */
    const L = ledgerOf(qs); assert.equal(L.length, qs.length); assert.ok(L.every((r) => ["answered", "open"].includes(r.status) && r.how));
  } finally { srv.close(); }
});

test("RR-356 · 4 · write only then: the profession page has a question per destination; open questions keep it ⚠️, named", () => {
  const qs = connectByMeaning({ questions: professionQuestions({ subject: "OET", prof: "nursing", destinations: destinationsFor("nursing", LIST) }), facts: FACTS, prof: "nursing" });
  const subjectFacts = { writingWords: { claimId: "subject-writingWords", text: "OET's own page: the Writing task's word range is 180–200 words.", link: "https://oet.com/ready/writing", readOn: ON } };
  const x = examPlan({ subject: "OET", professions: ["nursing"], countries: [], facts: FACTS, subjectFacts, research: { nursing: qs }, searchedOn: `${ON}T10:00:00Z` });
  const p = x.pages.find((pg) => pg.profession === "nursing");
  assert.deepEqual(p.items.map((it) => it.question).slice(0, 2), ["What OET score does NMC in the United Kingdom ask of nurses?", "What OET score does AHPRA in Australia ask of nurses?"]);
  assert.match(p.items[1].claims[0].card, /^Australia — L 350 · R 360 · W 350 · S 360$/);
  assert.deepEqual(p.open, ["What OET score does Nursing Council of New Zealand in New Zealand ask of nurses?", "What OET score does Council for Nurses and Midwives Malta in Malta ask of nurses?"], "the Writing task is answered from OET's own page");
  assert.equal(p.ledger.find((r) => r.question.includes("Australia")).status, "answered");
});

test("RR-356 · B · improve, don't duplicate: the client's page on the same profession or country is improved — the pack holds only what it lacks", async () => {
  const site = { origin: "https://prep.example", pages: [{ url: "https://prep.example/", title: "Prep", h1: "Prep", h2: [], qa: [] }, { url: "https://prep.example/guides/oet-for-doctors", title: "OET for Doctors 2026: Score, Fees & Writing Samples", h1: "OET for Doctors", h2: ["What OET score does AHPRA in Australia ask of doctors?"], qa: [] }, { url: "https://prep.example/guides/oet-pakistan", title: "OET Pakistan 2026: Fees in PKR for Nurses", h1: "OET Pakistan", h2: [], qa: [] }] };
  const x = examPlan({ subject: "OET", professions: ["medicine", "nursing"], countries: ["Pakistan"], facts: [...FACTS, { id: "pk", country: "Pakistan", part: "centres", verified: true, text: "OET says it has three test venues in Pakistan.", link: "https://oet.com/x", on: ON }], site });
  assert.equal(x.pages.find((p) => p.profession === "medicine").improve.url, "https://prep.example/guides/oet-for-doctors");
  assert.equal(x.pages.find((p) => p.country === "Pakistan").improve.url, "https://prep.example/guides/oet-pakistan", "a page that names a country is that country's page, even when it names nurses");
  assert.equal(x.pages.find((p) => p.profession === "nursing").improve, undefined, "no page for nurses yet — a new page");
  assert.equal(x.counts.improve, 2);
  /* the pack: only the questions the existing page does not answer */
  const draft = { title: "OET for Doctors", html: `<main><section><h2>Key facts</h2><ul class="cards"><li class="card" data-claim-id="a"><span class="k">k</span><span class="v">UK</span></li><li class="card" data-claim-id="b"><span class="k">k</span><span class="v">AU</span></li></ul></section><details data-need-id="n--scores0" open><summary>What OET score does GMC in the United Kingdom ask of doctors?</summary><p data-claim-id="a">GMC asks grade B in each. <a class="src" href="https://gmc-uk.org">Source</a></p></details><details data-need-id="n--scores1"><summary>What OET score does AHPRA in Australia ask of doctors?</summary><p data-claim-id="b">Ahpra asks 350/360. <a class="src" href="https://ahpra.gov.au">Source</a></p></details></main>` };
  const pack = improvePack({ draft, existing: site.pages[1] });
  assert.deepEqual([pack.add, pack.already], [["What OET score does GMC in the United Kingdom ask of doctors?"], ["What OET score does AHPRA in Australia ask of doctors?"]]);
  assert.ok(pack.html.includes('data-claim-id="a"') && !pack.html.includes('data-claim-id="b"'), "only the added question's card and answer");
  assert.ok(alreadyAsked("What OET score does AHPRA in Australia ask of doctors?", site.pages[1]) && !alreadyAsked("How long is OET Reading?", site.pages[1]));
  /* through the connection: GitHub's own file gets the section (once — again replaces it); a framework page or Shopify: the content instead */
  assert.equal(withSection("<html><main><p>x</p></main></html>", '<section class="av-page" data-improve-for="u">A</section>'), '<html><main><p>x</p><section class="av-page" data-improve-for="u">A</section></main></html>');
  assert.equal(withSection('<main><section class="av-page" data-improve-for="u">A</section></main>', '<section class="av-page" data-improve-for="u">B</section>'), '<main><section class="av-page" data-improve-for="u">B</section></main>');
  assert.deepEqual([improveVia({ kind: "github" }), improveVia({ kind: "wordpress" }), improveVia({ kind: "shopify" }), improveVia(null)], [true, true, false, false]);
  const calls = []; const fetchImpl = async (u, init) => { calls.push(init.method); if (init.method === "GET" && /public\/guides\/oet-for-doctors\.html/.test(u)) return { ok: true, status: 200, json: async () => ({ sha: "s1", content: Buffer.from("<html><main><h1>Doctors</h1></main></html>").toString("base64") }) }; if (init.method === "PUT") return { ok: true, status: 200, json: async () => ({}) }; return { ok: false, status: 404, json: async () => ({}) }; };
  const r = await improveExisting({ target: { kind: "github", repo: "o/r", branch: "main" }, key: "k", url: "https://prep.example/guides/oet-for-doctors", section: pack.html, fetchImpl, testBase: "http://127.0.0.1:1", allowLocal: true });
  assert.equal(r.ok, true, r.why); assert.match(r.line, /^Improved on your site: .* \(in public\/guides\/oet-for-doctors\.html\)/);
  /* the report says per topic: new page, or your existing page improved */
  const rep = jobReport({ drafts: [{ url: "a", title: "OET for Nurses", readyAsDraft: true }, { url: "b", title: "OET for Doctors", readyAsDraft: true, improve: { url: "https://prep.example/guides/oet-for-doctors" } }], approval: "review", connected: true });
  assert.match(rep.headline, /^1 new page made, 1 of your existing pages to improve, 0 published/);
  assert.deepEqual(rep.topics.map((t) => t.is), ["new page", "improve your existing page https://prep.example/guides/oet-for-doctors"]);
});

test("RR-356 · the Ireland line in plain words: 'Writing C+ (300), the other three B (350)'", () => {
  assert.equal(plainScores("NMBI accepts OET (Nursing): Grade B in three components and C+ in one (table: Listening B, Reading B, Writing C+, Speaking B); one result only."), "NMBI accepts OET (Nursing): Writing C+ (300), the other three B (350); one result only.");
  assert.equal(plainScores("NMC accepts OET: Listening B (350+)."), "NMC accepts OET: Listening B (350+).", "a plain line is unchanged");
});
