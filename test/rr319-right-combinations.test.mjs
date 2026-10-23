/**
 * RR-319 · RIGHT COMBINATIONS, RIGHT QUANTITY (owner, 2026-10-23): "It is Visibility's job to make the right combinations in the right
 * quantity — never thin, never duplicate." + ADD: the client's own formula + ADD 3: count pages by the questions people ask.
 *   A  three kinds of pages (requirement / university / taking-the-test) + topic pages; a separate page only where the ANSWER differs
 *   B  lists: AlmiWorld's own (519 roles, 8,862 universities, 12 subjects), pasted, CSV/Excel, "help me make my list"; no world list
 *      whose licence is unconfirmed
 *   C  C1 short subject · C2 "Not kept" names + reasons · C3 Ahpra/NMC via their English-test pages · C4 NMBI per sub-test · C5 every
 *      country's health regulators, or "checked, does not say" · C6 named links · C7 "the ready options here"
 * Every network read here is a local fixture (allowLocal); no real browser, no real key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFormula, fromGuided, groupQuestions, faqQuestions, planPages, subjectProblem, SHORT_SUBJECT } from "../desktop/page-plan.mjs";
import { officialReader, bodyAnswer, subtestResults, professionsOfBody, isHealthRegulator, regulatorLinks, UNIVERSITY_RELATED, itemOnSubjectSite } from "../desktop/official.mjs";
import { realityFilter, ecbRates, localFee, feeOf } from "../desktop/page-count.mjs";
import { builtInList, listFromFile, csvRows, draftList, WORLD_LISTS, HOWTO } from "../desktop/lists.mjs";
import { linksFor, brandsOf } from "../desktop/youtube-plan.mjs";
import { linkName } from "../desktop/youtube-advice.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { understandFormulaAI, researchQuestionsAI } from "../desktop/web-ai.mjs";

const REPO = join(import.meta.dirname, "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
const ON = "2026-10-23";
const OWNER = "from 197 countries to 9 countries; from 8,000 universities to 197 countries for 12 subjects; for 519 job roles from 197 countries.";

/* ══ ADD · the client's own formula ══ */
test("ADD · THE OWNER'S EXACT SENTENCE is read back in plain words: origin → destination · universities in their countries × subjects · job roles × origin", () => {
  const f = parseFormula(OWNER);
  assert.equal(f.ok, true);
  assert.equal(f.line, "You mean: origin country (197) → destination country (9) · universities (8,000) × country (197) × subjects (12) · job roles (519) × origin country (197)");
  assert.deepEqual(f.parts.map((p) => p.dims.map((d) => `${d.dim}:${d.n}:${d.role}`)), [["countries:197:origin", "countries:9:destination"], ["universities:8000:null", "countries:197:located", "subjects:12:null"], ["roles:519:null", "countries:197:origin"]]);
  assert.deepEqual(f.run.sort(), ["countries", "origins", "roles", "subjects", "universities"]);
  /* the brief's own example wording, and the guided form without AI */
  assert.equal(parseFormula("people from 197 countries going to 9 countries; 8,000 universities in 12 subjects; 519 job roles").line, "You mean: origin country (197) → destination country (9) · universities (8,000) × subjects (12) · job roles (519)");
  assert.equal(fromGuided({ from: "197 countries", to: "9 countries", for: "519 job roles" }).line, "You mean: origin country (197) → destination country (9) × job roles (519)");
  assert.equal(parseFormula("I want nice pages").ok, false);
});

test("ADD · YOUR AI READS THE SENTENCE — and a number the client never wrote is dropped", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ parts: [{ text: "from 197 countries to 9 countries", dims: [{ dim: "countries", n: 197, role: "origin" }, { dim: "countries", n: 9, role: "destination" }] }, { text: "invented", dims: [{ dim: "cities", n: 4000, role: "none" }] }] }) }], usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
  const r = await understandFormulaAI({ provider: "anthropic", key: "standin", text: OWNER, fetchImpl, base: "http://127.0.0.1:9" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.parts.map((p) => p.dims.length), [2], "an invented 4,000 cities was kept");
  assert.equal((await understandFormulaAI({ provider: "anthropic", key: "", text: OWNER })).ok, false);
});

/* ══ ADD 3 · questions ══ */
test("ADD 3 · QUESTIONS: same meaning grouped once (its other wordings kept as 'also asked'); the official FAQ's questions read from its own text", () => {
  const g = groupQuestions([{ text: "oet score for nurses in ireland", source: "SC", weight: 10 }, { text: "oet score ireland nurses", source: "YT" }, { text: "how much does oet cost", source: "AI" }]);
  assert.equal(g.length, 2);
  assert.deepEqual(g[0].also, ["oet score ireland nurses"]);
  const f = faqQuestions([{ url: "https://x.test/faq", title: "FAQ", checkedOn: ON, text: "Frequently asked. How long are my OET results valid? Results are valid for two years. Can I take OET on computer? Yes. Accept cookies?" }]);
  assert.deepEqual(f.map((q) => q.text), ["How long are my OET results valid?", "Can I take OET on computer?"]);
  assert.ok(f.every((q) => q.link === "https://x.test/faq" && q.on === ON && q.kind === "official FAQ"));
});

test("ADD 3 · YOUR AI's QUESTION RESEARCH is research (never searches), and a question naming a country outside the kept ones is left out", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ questions: ["oet score for nurses in ireland", "oet requirements for doctors in germany", "how is oet scored"] }) }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 });
  const r = await researchQuestionsAI({ provider: "anthropic", key: "standin", subject: "OET", countries: ["Ireland"], professions: ["nursing"], fetchImpl, base: "http://127.0.0.1:9" });
  assert.deepEqual(r.questions, ["oet score for nurses in ireland", "how is oet scored"]);
  assert.match(MAIN, /source: "your AI's research \(not search data\)"/);
});

/* ══ A · the plan ══ */
const R = () => ({ ok: true, subjectName: "OET", subjectSite: "https://oet.test/", pagesListed: 50, checkedOn: ON,
  dims: {
    countries: { candidates: 197, kept: ["Ireland", "Australia", "United Kingdom"].map((name) => ({ name, source: { url: `https://oet.test/${name}`, title: name }, checkedOn: ON, how: "ok" })), dropped: [{ name: "Chad", why: "no page" }] },
    roles: { candidates: 519, professions: ["nursing", "medicine"], kept: [{ name: "Registered Nurse", profession: "nursing" }, { name: "Doctor", profession: "medicine" }], dropped: [] },
    origins: { candidates: 197, kept: [{ name: "Philippines", source: { url: "https://oet.test/ph", title: "PH" }, checkedOn: ON, how: "OET's own page says OET can be taken in Philippines" }], dropped: [] },
    universities: { candidates: 8862, inScope: 3, kept: [{ name: "Uni A", country: "Ireland", source: { url: "https://a.test", title: "A" }, checkedOn: ON }], dropped: [{ name: "Uni B", why: "does not say" }], notRead: [{ name: "Uni C", why: "later" }] },
  },
  fee: { ok: true, amount: 587, currency: "AUD", source: { url: "https://oet.test/fees", title: "Fees" }, checkedOn: ON }, rates: { date: "2026-10-22", rates: { EUR: 1, AUD: 1.7, PHP: 65 } } });
const OFFICIAL = {
  Ireland: [{ body: "Nursing and Midwifery Board of Ireland", professions: ["nursing"], rule: "Listening B (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)", sets: ["Listening B (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)"], link: "https://nmbi.test", source: "NMBI", readOn: ON },
    { body: "Medical Council", professions: ["medicine"], rule: "grade B", sets: [], link: "https://mc.test", source: "MC", readOn: ON }],
  Australia: [{ body: "Department of Home Affairs", rule: "visa", link: "https://ha.test", source: "HA", readOn: ON }, { body: "Australian Health Practitioner Regulation Agency", professions: null, rule: "Listening 350 · Reading 360 · Writing 350 · Speaking 360", link: "https://ahpra.test", source: "Ahpra", readOn: ON }],
};
const Q = groupQuestions([
  { text: "oet score for nurses in ireland", source: "your Search Console", weight: 10 }, { text: "oet requirements doctors ireland", source: "SC", weight: 9 },
  { text: "avbc australia oet", source: "SC", weight: 8 }, { text: "oet australia nurses", source: "SC", weight: 7 },
  { text: "oet test centre philippines fee", source: "SC", weight: 6 }, { text: "oet vs ielts which is easier", source: "AI" }, { text: "how is oet scored", source: "FAQ" }, { text: "best pizza near me", source: "SC" },
]);

test("A · THE PLAN PER KIND: Ireland splits (NMBI for nurses ≠ Medical Council for doctors), Australia is ONE page (Ahpra for every profession; Home Affairs is a visa office, never the rule), the UK has no regulator read yet — said plainly", () => {
  const p = planPages({ r: R(), official: OFFICIAL, notSaid: { "United Kingdom": [{ line: "The official page of NMC, checked 2026-10-23, does not say this." }] }, questions: Q, formula: parseFormula(OWNER), subject: "OET" });
  assert.deepEqual(p.kinds.requirement.map((x) => x.title), ["OET for Nursing in Ireland", "OET for Medicine in Ireland", "OET for Ireland", "OET for Australia", "OET for United Kingdom"]);
  const au = p.kinds.requirement.find((x) => x.country === "Australia");
  assert.match(au.why, /^one rule for every profession \(Australian Health Practitioner Regulation Agency\)/);
  assert.deepEqual(au.otherBodies, ["Department of Home Affairs"]);
  const withOwn = planPages({ r: R(), official: { ...OFFICIAL, Ireland: [...OFFICIAL.Ireland, { body: "OET", text: "OET's own page", link: "x", readOn: ON }] }, questions: [], subject: "OET" });
  assert.ok(withOwn.kinds.requirement.every((x) => !x.otherBodies.includes("OET")), "the subject named as a body that is not a health regulator");
  const uk = p.kinds.requirement.find((x) => x.country === "United Kingdom");
  assert.equal(uk.regulator, "No health regulator's own page for United Kingdom names OET yet — checked: 1 official page.");
  assert.equal(p.kinds.university.length, 1); assert.equal(p.kinds.university[0].title, "Universities in Ireland that accept OET");
  assert.deepEqual(p.kinds.taking[0].claims.map((c) => [c.text, c.link, c.official]), [["OET's own page states the fee — AUD 587 ≈ PHP 22,444 (the European Central Bank's reference rates of 2026-10-22).", "https://oet.test/fees", true]]);
  assert.deepEqual(p.kinds.taking.map((x) => [x.title, x.fee]), [["Taking OET in Philippines: venues, dates and fee", "AUD 587 ≈ PHP 22,444 (the European Central Bank's reference rates of 2026-10-22)"]]);
});

test("ADD 3 · EVERY QUESTION TO ONE PAGE: each page lists what it answers; a vets' search is never a nurses' page's MAIN search; topic pages for the rest; a page with no question is an honest opportunity page", () => {
  const p = planPages({ r: R(), official: OFFICIAL, questions: Q, formula: parseFormula(OWNER), subject: "OET" });
  const page = (t) => [...p.kinds.requirement, ...p.kinds.taking, ...p.kinds.topic].find((x) => x.title === t);
  assert.deepEqual(page("OET for Nursing in Ireland").questions.map((q) => q.question), ["oet score for nurses in ireland"]);
  assert.deepEqual(page("OET for Medicine in Ireland").questions.map((q) => q.question), ["oet requirements doctors ireland"]);
  const au = page("OET for Australia");
  assert.deepEqual(au.questions.map((q) => [q.question, q.section]), [["oet australia nurses", "nursing"]]);
  assert.equal(au.main, null, "a vets' search (avbc) became the Australia page's main search");
  assert.deepEqual(page("Taking OET in Philippines: venues, dates and fee").questions.map((q) => q.question), ["oet test centre philippines fee"]);
  assert.deepEqual(p.kinds.topic.map((t) => t.title), ["OET vs IELTS and other tests", "How OET is scored"]);
  assert.deepEqual(p.unused.map((u) => [u.question, u.why]), [["avbc australia oet", "about veterinary science, which OET is not for"], ["best pizza near me", "not about OET or one of the kept countries or professions"]]);
  /* the real run (23 Oct): AVBC, Dalhousie PGME and Singapore physiotherapy searches became topic pages */
  const real = planPages({ r: R(), official: OFFICIAL, questions: groupQuestions([{ text: "pgme dalhousie" }, { text: "singapore physiotherapy registration" }, { text: "australasian veterinary boards council (avbc)" }]), subject: "OET" });
  assert.deepEqual([real.kinds.topic.length, real.unused.length], [0, 3]);
  /* OET is also for vets: "avbc australia" is the Australia page's VETERINARY SECTION, never its main search (owner, 23 Oct) */
  const vet = R(); vet.dims.roles.professions = ["nursing", "medicine", "veterinary science"];
  const auv = planPages({ r: vet, official: OFFICIAL, questions: groupQuestions([{ text: "avbc australia", weight: 9 }, { text: "oet australia", weight: 1 }]), subject: "OET" }).kinds.requirement.find((x) => x.country === "Australia");
  assert.deepEqual([auv.main, auv.questions.map((q) => q.section)], ["oet australia", ["veterinary science", null]]);
  /* the subject's own FAQ question is about the subject even without its name */
  assert.deepEqual(planPages({ r: R(), official: OFFICIAL, questions: groupQuestions([{ text: "What can I bring on test day?", kind: "official FAQ" }]), subject: "OET" }).kinds.topic.map((x) => x.title), ["OET test day: what to bring and expect"]);
  /* weak taking pages: one page with a section per country, never one each */
  const three = R(); three.dims.origins.kept = ["India", "Kenya", "Philippines"].map((name) => ({ name, source: { url: `https://oet.test/${name}`, title: name }, checkedOn: ON, how: "venue" }));
  const m = planPages({ r: three, official: OFFICIAL, questions: [], subject: "OET" });
  assert.deepEqual(m.kinds.taking.map((x) => [x.title, x.countries]), [["Where to take OET: venues, dates and fees by country", ["India", "Kenya", "Philippines"]]]);
  assert.match(m.kinds.taking[0].fees[1], /^Kenya: AUD 587 — the European Central Bank publishes no reference rate/);
  assert.equal(page("OET for Ireland").weak, true); assert.equal(page("OET for Nursing in Ireland").weak, false);
  assert.deepEqual(p.counts.requirement, { total: 5, withQuestions: 3, opportunity: 2 });
  assert.equal(p.total, 5 + 1 + 1 + 2);
});

test("A · WHY NOT MORE, and the honest answer per part of the owner's formula", () => {
  const p = planPages({ r: R(), official: OFFICIAL, questions: Q, formula: parseFormula(OWNER), subject: "OET" });
  assert.equal(p.whyNotMore.line, "Not 7,361,496,000 pages (9 × 519 × 197 × 8,000): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.");
  assert.ok(p.whyNotMore.lines.some((l) => /^The country people come FROM does not change the requirement answer/.test(l)));
  assert.equal(p.perPart.length, 3);
  assert.match(p.perPart[0].answer, /^Better this way: 5 requirement pages for the 3 countries that recognise OET .* the countries people come from matter only for taking the test — 1 page for the 1 country where an official page names a venue\.$/);
  assert.match(p.perPart[1].answer, /^Better this way: 1 page — one per country, its universities as sections: 8,862 universities → 3 in the 3 countries .* → 1 whose own page names OET \(1 still to check\)\.$/);
  assert.match(p.perPart[2].answer, /^Better this way: 519 job roles → the 2 professions OET is for, as sections of the requirement pages; the 197 countries people come from do not change that answer — no page per origin\.$/);
});

test("A · MAKE THESE PAGES: each planned page is its OWN draft — Ireland's two rules stay two pages, a topic page is made, its questions are its 'also asked' (proof: 3 of 18 when the plan was merged again with old searches)", () => {
  const site = { ok: true, origin: "https://x.test", readOn: ON, robotsTxt: null, sitemapUrls: null, pages: [{ url: "https://x.test/", title: "X", h1: "X", h2: [], qa: [{ q: "How is OET scored?", a: "OET is scored from 0 to 500 in each sub-test, with grades from A to E for each sub-test." }], facts: [] }] };
  const C = (body, link, text) => ({ claimId: `c-${body}`, body, text, link, readOn: ON, source: body, official: true });
  const pagePlan = [
    { kind: "requirement", title: "OET for Nursing in Ireland", country: "Ireland", claims: [C("NMBI", "https://nmbi.test", "Nursing and Midwifery Board of Ireland names OET on its own page among the English tests it accepts — Listening B (350–450).")], questions: [{ question: "oet score for nurses in ireland" }] },
    { kind: "requirement", title: "OET for Medicine in Ireland", country: "Ireland", claims: [C("MC", "https://mc.test", "Medical Council of Ireland names OET on its own page among the English tests it accepts — the results it names with OET: grade B.")], questions: [{ question: "oet requirements doctors ireland" }] },
    { kind: "topic", title: "How OET is scored", questions: [{ question: "how is oet scored" }] },
  ];
  pagePlan.push({ kind: "requirement", title: "OET for Australia", country: "Australia", claims: [C("OET", "https://oet.test/au", "OET's own page for Australia says OET is recognised or accepted there, and names Department of Home Affairs.")], questions: [] });
  const r = seoPages({ site, on: `${ON}T10:00:00Z`, pagePlan, max: 4, subject: "OET" });
  assert.deepEqual(r.plan.map((x) => [x.kind, x.question]), [["NEW", "OET for Nursing in Ireland"], ["NEW", "OET for Medicine in Ireland"], ["SECTION", "How OET is scored"], ["NEW", "OET for Australia"]]);
  assert.equal(r.plan[2].into, "https://x.test/", "the client's own page already answers it — improve that page first");
  assert.deepEqual(r.plan[0].alsoAsked, ["oet score for nurses in ireland"]);
  assert.equal(r.drafts.length, 3);
  assert.deepEqual(r.drafts.map((d) => [d.title.split(" | ")[0], d.readyAsDraft]), [["OET for Nursing in Ireland", true], ["OET for Medicine in Ireland", true], ["OET for Australia", true]], "a draft with an official answer and no key-fact card (proof: 8 of 13 not ready)");
  assert.match(MAIN, /pwrite\(id, "made-plan\.json", pages\);/);
  assert.match(MAIN, /const madePlanOf = \(id\) => \{ const p = pread\(id, "made-plan\.json", null\); return p\?\.length \? \{ pagePlan: p, max: p\.length \} : \{\}; \};/);
  assert.equal((MAIN.match(/\.\.\.madePlanOf\(id\)/g) ?? []).length, 4, "a page build that ignores the made plan merges it again");
});

/* ══ C3/C4 · the official reader ══ */
function regulatorSite() {
  const P = (b, t = "Body") => `<html><head><title>${t}</title></head><body><main>${b}</main></body></html>`;
  let base = "";
  const pages = {
    "/ahpra/standard": () => P(`<h1>English language skills registration standard</h1><p>Applicants must meet the standard.</p><a href="/ahpra/accepted-english-language-tests">Accepted English language tests</a> <a href="/ahpra/other">News</a>`, "Registration standard | Ahpra"),
    "/ahpra/accepted-english-language-tests": () => P("<h1>Accepted English language tests</h1><p>OET: a minimum score of Listening 350, Reading 360, Writing 350 and Speaking 360.</p>", "Accepted tests | Ahpra"),
    "/nmc/english": () => P(`<h1>English language requirements</h1><p>Read about the tests we accept.</p><a href="/nmc/accepted-english-language-tests">Accepted English language tests</a>`, "English | NMC"),
    "/nmc/accepted-english-language-tests": () => P("<table><tr><th>Test</th><th>Listening</th><th>Reading</th><th>Writing</th><th>Speaking</th></tr><tr><td>OET</td><td>B (350 or above)</td><td>B (350 or above)</td><td>C+ (300 or above)</td><td>B (350 or above)</td></tr></table>", "Accepted tests | NMC"),
    "/nmbi/english": () => P("<h1>English Language Requirements</h1><p>OET for nurses: Listening B (350 - 450) Reading B (350 - 450) Writing C+ (300 - 340) Speaking B (350 - 450)</p>", "English | NMBI"),
    "/uni/x": () => P(`<h1>Study with us</h1><p>Apply now.</p><a href="/uni/x/english-language-requirements">English language requirements</a>`, "Uni X"),
    "/uni/x/english-language-requirements": () => P("<h1>English language requirements</h1><p>We accept OET with grade B in each sub-test for Nursing.</p>", "English | Uni X"),
    "/qatar": () => P("<h1>Registration</h1><p>Licensing for healthcare practitioners.</p>", "DHP"),
    "/oet/australia": () => P(`<h1>OET for Australia</h1><p>OET is recognised by regulators in Australia, including the Department of Home Affairs.</p><a href="https://www.ahpra.gov.au/x">Australian Health Practitioner Regulation Agency</a> <a href="https://immi.homeaffairs.gov.au/">Department of Home Affairs</a> <a href="https://www.facebook.com/oet">Facebook</a>`, "Australia | OET"),
  };
  const srv = createServer((q, r) => {
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (pages[q.url]) { r.writeHead(200, { "content-type": "text/html" }); return r.end(pages[q.url]().replaceAll('href="/', `href="${base}/`)); }
    r.writeHead(404); r.end();
  });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}

test("C3 + C4 + C5 · NEVER 'does not say' FROM A MAIN PAGE ALONE: Ahpra and NMC are answered from their accepted-tests pages (followed from the standard page), NMBI per sub-test; a page that truly does not say it is said so with what was checked", async () => {
  const s = regulatorSite(); const base = await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const ah = await bodyAnswer({ url: `${base}/ahpra/standard`, body: "Ahpra", subject: "OET", reader: rd });
    assert.equal(ah.claim.rule, "Listening 350 · Reading 360 · Writing 350 · Speaking 360");
    assert.equal(ah.claim.link, `${base}/ahpra/accepted-english-language-tests`);
    const nmc = await bodyAnswer({ url: `${base}/nmc/english`, body: "Nursing and Midwifery Council", subject: "OET", reader: rd });
    assert.equal(nmc.claim.rule, "Listening B (350 or above) · Reading B (350 or above) · Writing C+ (300 or above) · Speaking B (350 or above)");
    assert.deepEqual(nmc.claim.professions, ["nursing"]);
    const nmbi = await bodyAnswer({ url: `${base}/nmbi/english`, body: "Nursing and Midwifery Board of Ireland", subject: "OET", reader: rd });
    assert.equal(nmbi.claim.rule, "Listening B (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)");
    const uni = await bodyAnswer({ url: `${base}/uni/x`, body: "Uni X", subject: "OET", reader: rd, related: UNIVERSITY_RELATED });
    assert.equal(uni.claim.link, `${base}/uni/x/english-language-requirements`);
    const q = await bodyAnswer({ url: `${base}/qatar`, body: "Department of Healthcare Professions", subject: "OET", reader: rd });
    assert.equal(q.notSaid.line, `The official page of Department of Healthcare Professions, checked ${ON}, does not say this.`);
  } finally { s.close(); }
  assert.deepEqual([professionsOfBody("Nursing and Midwifery Board of Ireland"), professionsOfBody("Medical Council"), professionsOfBody("Australian Health Practitioner Regulation Agency")], [["nursing"], ["medicine"], null]);
  /* NMBI's real page shape (23 Oct): one set, then "OET (Nursing) with Grade B in three components and C+ in one component" — never a 2nd set */
  assert.deepEqual(subtestResults("IELTS Listening 7.0 Reading 7.0 Writing 6.5 Speaking 7.0 Overall 7.0 OET Minimum Occupational English Test (OET) Grade and S cores Listening B (350 - 450) OET (Nursing) with Grade B in three components and C+ in one component. (please see table for example) Reading B (350 - 450) Writing C+ (300 - 340) Speaking B (350 - 450) Please note that: We only accept IELTS/OET test results", "OET"), ["Listening B (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)"]);
  assert.deepEqual(subtestResults("Test Listening Reading Writing Speaking OET B (350 or above) B (350 or above) C+ (300 or above) B (350 or above)", "OET"), ["Listening B (350 or above) · Reading B (350 or above) · Writing C+ (300 or above) · Speaking B (350 or above)"]);
});

test("ADD 3 · AUSTRALIA'S HEALTH REGULATORS: the subject's own country page links to Ahpra → it is read; Home Affairs is a visa office, never a health regulator; social links never", async () => {
  assert.deepEqual([isHealthRegulator("Australian Health Practitioner Regulation Agency"), isHealthRegulator("Department of Home Affairs"), isHealthRegulator("Nursing and Midwifery Council"), isHealthRegulator("Ministry of Education")], [true, false, true, false]);
  const s = regulatorSite(); const base = await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const k = await itemOnSubjectSite({ item: "Australia", subject: "OET", subjectName: "OET", sitemapUrls: [`${base}/oet/australia`], reader: rd });
    assert.equal(k.kept, true);
    assert.deepEqual(k.regulatorLinks.map((l) => [l.url, l.body]), [["https://www.ahpra.gov.au/x", "Australian Health Practitioner Regulation Agency"]]);
  } finally { s.close(); }
  assert.match(MAIN, /bodyPages: \[\.\.\.own, \.\.\.linked\]/);
  assert.deepEqual(regulatorLinks({ url: "https://oet.test/au", links: [{ href: "https://oet.test/x", text: "Health board" }] }), [], "the subject's own site counted as a regulator");
});

/* ══ A3 · fees and the official rate ══ */
test("A3 · THE FEE from the subject's own fees page, in local currency at the ECB's reference rate with its date — or why not", async () => {
  const xml = `<gesmes:Envelope><Cube><Cube time='2026-10-22'><Cube currency='USD' rate='1.0800'/><Cube currency='AUD' rate='1.7000'/><Cube currency='PHP' rate='65.000'/><Cube currency='GBP' rate='0.8500'/></Cube></Cube></gesmes:Envelope>`;
  const rates = await ecbRates({ raw: async (u) => { assert.equal(u, "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"); return xml; } });
  assert.deepEqual([rates.date, rates.rates.AUD, rates.rates.EUR], ["2026-10-22", 1.7, 1]);
  const fee = { ok: true, amount: 587, currency: "AUD" };
  assert.equal(localFee(fee, "Philippines", rates).line, "AUD 587 ≈ PHP 22,444 (the European Central Bank's reference rates of 2026-10-22)");
  assert.equal(localFee(fee, "Pakistan", rates).line, "AUD 587 — the European Central Bank publishes no reference rate for Pakistan's currency, so it is shown in AUD.");
  const pages = { "https://oet.test/fees": { ok: true, url: "https://oet.test/fees", title: "Fees", checkedOn: ON, text: "Our test fees. The OET fee is AUD 587 for each test. Other costs vary." } };
  const f = await feeOf({ urls: ["https://oet.test/fees", "https://oet.test/about"], subject: "OET", subjectName: "OET", reader: { read: async (u) => pages[u] ?? { ok: false } } });
  assert.deepEqual([f.ok, f.amount, f.currency, f.source.url], [true, 587, "AUD", "https://oet.test/fees"]);
});

/* ══ B · lists ══ */
test("B1 · ALMIWORLD'S OWN LISTS are built in (read-only files, no database): 519 job roles, 8,862 universities, 12 subjects — each with its source", () => {
  const r = builtInList("roles"), u = builtInList("universities"), s = builtInList("subjects");
  assert.deepEqual([r.items.length, u.items.length, s.items.length], [519, 8862, 12]);
  assert.ok([r, u, s].every((x) => /Alm/.test(x.source)), "a list without its source");
  assert.ok(u.items.every((x) => x.name && x.country), "a university without a name or country");
  assert.match(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8"), /cpSync\(join\(REPO, "desktop", "lists"\)/);
});

test("B2 + B3 · EVERY CLIENT: paste, CSV, Excel (header row mapped), help-me drafts from his own pages; each with a how-to and an example; ISCO-08 / ISCED-F left out — their licence was not confirmed", () => {
  assert.deepEqual(csvRows('name,country\n"Uni, A",Ireland\nUni B,UK').slice(1), [["Uni, A", "Ireland"], ["Uni B", "UK"]]);
  const c = listFromFile("u.csv", Buffer.from("University Name,Country,Website\nUni A,Ireland,https://a.test\n"));
  assert.deepEqual(c.items, [{ name: "Uni A", country: "Ireland", page: "https://a.test" }].map((x) => ({ ...c.items[0], ...x })));
  assert.equal(listFromFile("r.txt", "Nurse\nDoctor\n").items.length, 2);
  for (const k of ["countries", "universities", "roles", "subjects", "cities", "own"]) assert.ok(HOWTO[k].how && HOWTO[k].example, `${k} has no how-to`);
  assert.equal(WORLD_LISTS.included, false);
  const d = draftList({ dim: "roles", site: { pages: [{ url: "https://x.test/d", title: "OET for Doctors 2026: Score, Fees", h1: "OET", h2: [] }], design: { menu: ["Home"] } }, searchConsole: { queries: [{ query: "oet for nurses in new zealand" }] }, subject: "OET" });
  assert.deepEqual(d.items.map((x) => x.name), ["Doctors", "nurses"]);
  assert.match(d.line, /^Visibility drafted 2 from your own pages and searches — check each one/);
});

/* ══ C1 · C2 · C6 · C7 ══ */
test("C1 · THE SUBJECT IS A SHORT NAME: a long text stops with the owner's sentence; a longer description has its own box", () => {
  assert.deepEqual(["OET", "Occupational English Test", "IELTS Academic"].map(subjectProblem), [null, null, null]);
  assert.equal(subjectProblem("OET is the English language test for healthcare professionals who want to work in English-speaking countries"), "Write only the product's or test's short name here, e.g. OET. A longer description goes in the box below it.");
  assert.equal(subjectProblem("OET. The test."), SHORT_SUBJECT);
  assert.match(MAIN, /if \(subjectProblem\(subject\)\) return send\(400, \{ refused: subjectProblem\(subject\) \}\);/);
  assert.match(UI, /Write only the product's or test's short name here, e\.g\. OET\./);
  assert.match(UI, /<label>A longer description \(optional\)<textarea id="pcdesc">/);
});

test("C2 · 'NOT KEPT (N)' SHOWS EACH NAME AND ITS REASON — never an empty bullet", () => {
  assert.match(UI, /<li class="meta"><b>\$\{esc\(k\.name \|\| "\(an item with no name\)"\)\}<\/b> — \$\{esc\(k\.why \|\| "no reason recorded"\)\}<\/li>/);
  assert.match(UI, /<details class="notkept"><summary class="meta">Not kept \(\$\{x\.dropped\.length\}\)<\/summary>\$\{reasonList\(x\.dropped\)\}<\/details>/);
});

test("C6 · NAMED LINKS: 'AlmiCV: https://almicv.almiworld.com' and 'AlmiWorld: https://almiworld.com/' — never 'More:'", () => {
  const v = { title: "Cv builder", description: "Create your CV with AlmiCV: almicv.almiworld.com" };
  const L = linksFor(v, { url: "https://almiworld.com/" }, "@almiworld-world", brandsOf({ what: "AlmiWorld — AlmiCV builds your CV." })).map((l) => `${l.label}: ${l.url}`);
  assert.deepEqual(L.slice(0, 2), ["AlmiCV: https://almicv.almiworld.com", "AlmiWorld: https://almiworld.com/"]);
  assert.equal(linkName("https://ielts.example.test/", "IELTS writing"), "IELTS");
});

test("C7 · THE FALLBACK SAYS 'the ready options here'", () => {
  for (const f of ["ai-write.mjs", "web-ai.mjs"]) { const t = readFileSync(join(REPO, "desktop", f), "utf8"); assert.match(t, /the ready options here/); assert.doesNotMatch(t, /the ready options below/); }
});

test("THE SCREEN: own-words box with the brief's example, read back + confirm, the guided form, the plan per kind with each page's questions, why not more", () => {
  assert.match(UI, /Tell us in your own words which pages you have in mind — for example: people from 197 countries going to 9 countries; 8,000 universities in 12 subjects; 519 job roles\./);
  assert.match(UI, /<button id="pcok">Yes, that is it<\/button> <button class="ghost" id="pcfix">No — correct it<\/button>/);
  assert.match(UI, /From what \(for example 197 countries\)/);
  assert.match(UI, /Answers these \$\{qs\.length\} question/);
  assert.match(UI, /opportunity page — no search or question asks for it yet/);
  assert.match(UI, /<h4>Why not more<\/h4>/);
  assert.match(MAIN, /count\\\/understand\|count\\\/draftlist/);
});
