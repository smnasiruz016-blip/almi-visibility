/**
 * RR-321 · REGULATOR PAGES, PAGE COUNTING, THE QUESTION COUNT, THE OWNER'S SETUP-21 FINDINGS (owner, 2026-10-23, final):
 *   A  regulators from the subject's OWN list (AlmiOET's copy of OET's "Who recognises OET"), each confirmed on its own page while BUILDING;
 *      robots by RFC 9309 (4xx: may read; 5xx / no answer: not now); an unreadable page is built from the list with "check here"; one page
 *      per regulator rule; every number on its source page (the verbatim check)
 *   B  the five questions always run (no tick); counting is fast (no regulator or university site read); one table per page type, the total
 *      at the top; ONE SOURCE OF TRUTH — the five answers, the tables, "why not more" and the plan show the same numbers; every number its list
 *   C  the question count per source; same-meaning groups; own page or inside; "not about the product" removed and listed
 *   D  box 2 saved and understood; junk and menu text are no questions; Q3 from the same ledger; the fee in PKR/AED/QAR/KES/TZS from central
 *      banks (or said why not); the Philippines accepted but no registration rule; taking it in a country is a section of "Where to take"
 *   E  no origin pages; the first batch by the most-searched; internal links; "last checked"; the preview; G: the 9 and the 13 are steps
 * Fixtures are Visibility's own words (never a real page's text). No network, no real browser, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtInList } from "../desktop/lists.mjs";
import { recognitionOf, regulatorPagesOf, regulatorTitle, isRegulator, gradeLine, callNames } from "../desktop/recognition.mjs";
import { planFromList, rolloutOf, whyNotMoreOf, universityTitle } from "../desktop/plan-list.mjs";
import { fiveFromList } from "../desktop/research5.mjs";
import { sortQuestions, isMenuText, aboutProduct } from "../desktop/questions.mjs";
import { groupQuestions, faqQuestions } from "../desktop/page-plan.mjs";
import { venueCountriesIn, listedAfterColon, statisticsOf } from "../desktop/venues.mjs";
import { rbaRates, feeInCurrency, CENTRAL_BANKS, readRates } from "../desktop/rates.mjs";
import { verbatimOk, validityIn, combiningIn, readRegulator } from "../desktop/regulator-read.mjs";
import { createRobotsCache } from "../src/crawl/robots.mjs";
import { REGION_OF, COUNTRIES, neighboursOf } from "../desktop/world.mjs";

const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
const ON = "2026-10-23";
const PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase());
const LIST = builtInList("recognising");
const REC = recognitionOf(LIST, { professions: PROFS });
const UNIS = builtInList("universities").items;
const FEE = { ok: true, amount: 587, currency: "AUD", said: "AUD $587", source: { url: "https://oet.example/test-at-home" }, checkedOn: ON };
const VENUES = { countries: ["Pakistan", "India", "Kenya", "Nepal", "Philippines", "Nigeria", "Ghana"].map((c) => ({ name: c, source: { url: `https://oet.example/post/venue-${c.toLowerCase()}`, title: "venue news" }, checkedOn: ON })), home: { url: "https://oet.example/test-at-home", title: "at home", checkedOn: ON, says: "OET's own page says taking it at home is offered where no venue is available yet — it names no list of those countries" }, checked: [{ url: "https://oet.example/post/x", ok: true, on: ON }] };
const ITEMS = [
  ["oet for nurses in new zealand", "search"], ["oet score for nmbi", "search"], ["kate cowhig", "search"], ["aguinaldo recruitment agency", "search"], ["yale visiting student program", "search"], ["bc care registry", "search"], ["pgme mcmaster phone number", "search"],
  ["oet exam in bangladesh", "search"], ["oet fees", "search"], ["oet for doctors uk", "search"], ["Read our re-marking policy Everything you need to know FAQs Book a test Log in", "search"],
  ["How long are OET results valid?", "official FAQ"], ["What do people in Kenya ask about OET for nursing?", "ai research"], ["oet singapore pharmacist", "observed"], ["oet for physiotherapists in australia", "tool"],
].map(([text, kind]) => ({ text, kind, source: `${kind} (fixture)`, ...(kind === "official FAQ" ? { link: "https://oet.example/faq", on: ON } : {}) }));
const SC_ROWS = [{ query: "oet for nurses in new zealand", country: "India", impressions: 40 }, { query: "oet for nurses in new zealand", country: "Kenya", impressions: 9 }, { query: "oet for nurses in new zealand", country: "Nigeria", impressions: 7 }, { query: "oet for nurses in new zealand", country: "Philippines", impressions: 4 }, { query: "oet for nurses in new zealand", country: "Pakistan", impressions: 3 }, { query: "oet for doctors uk", country: "India", impressions: 500 }]; // sab321: seen MORE often, from fewer countries — the countries decide
const planOf = (extra = {}) => { const sorted = sortQuestions(ITEMS, "OET", { fullName: "Occupational English Test", regulators: REC.regulators.map(callNames) }); const groups = groupQuestions(sorted.kept); return { sorted, plan: planFromList({ subject: "OET", rec: REC, professions: PROFS, universities: UNIS, venues: VENUES, fee: FEE, rates: null, stats: { ok: true, line: "fixture stats", nationalities: ["Indian", "Pakistani"], sources: [] }, groups, sorted, byCountry: SC_ROWS, reads: {}, on: ON, ...extra }) }; };

test("B5 · ONE SOURCE OF TRUTH: the five answers, the tables, \"why not more\", the question count and the plan show the SAME numbers — any two that differ fail", () => {
  const { plan } = planOf(), n = plan.numbers, T = plan.tables;
  const five = fiveFromList({ subject: "OET", plan, stats: plan.stats, byCountry: [{ country: "India", searches: 2, impressions: 70, questions: [] }], items: ITEMS });
  const q = Object.fromEntries(five.questions.map((x) => [x.id, x]));
  /* the plan's own total = its pages = the tables' last rows = the ledger */
  const pages = Object.values(plan.kinds).flat().length;
  const lastRows = Object.values(T).reduce((s, t) => s + t.rows.at(-1).n, 0);
  assert.deepEqual([plan.total, pages, lastRows], [n.total, n.total, n.total], "the total differs between the plan, its pages and its tables");
  /* the five answers' numbers ARE the ledger's */
  assert.deepEqual([q.q3.n, T.regulator.rows[1].n], [n.requirement, n.requirement]);
  assert.deepEqual([q.q4.n, T.university.rows[3].n], [n.uniWithFacts, n.uniWithFacts]);
  assert.equal(q.q5.n, n.professions);
  assert.match(q.q3.answer, new RegExp(`requirement in ${n.requirement} countries`)); assert.match(q.q3.answer, new RegExp(`named body in ${n.accepted} countries`));
  assert.match(q.q3.answer, new RegExp(`read while building: ${n.regulatorRead} of ${n.regulatorPages}`), "D4: Q3 says how many regulators' own pages were read — from the same ledger as the pages");
  assert.match(q.q4.answer, new RegExp(n.uniHealth.toLocaleString("en-US"))); assert.match(q.q4.answer, new RegExp(`${n.uniPages.toLocaleString("en-US")} different answers`));
  /* "why not more" is the ledger's */
  const w = whyNotMoreOf(n, "OET");
  assert.deepEqual(plan.whyNotMore, w);
  assert.ok(w.lines[0].includes(`${n.combos} country`) && w.lines[0].includes(`${n.pairs} where`) && w.lines[0].includes(`${n.regulatorPages} pages`));
  assert.ok(w.lines[1].includes(`${n.uniPages.toLocaleString("en-US")} different answers`));
  /* the question count's numbers are the ledger's */
  const qc = plan.questionCount;
  assert.deepEqual([qc.found, qc.kept, qc.groups, qc.ownPage, qc.inside, qc.notAbout, qc.menu], [n.questionsFound, n.questionsKept, n.questionGroups, n.questionOwnPage, n.questionInside, n.questionsNotAbout, n.menuLines]);
  assert.equal(qc.ownPage + qc.inside, qc.groups);
  /* B6: every row with a whole list has as many items as its number */
  for (const [k, i] of [["regulator", 0], ["regulator", 1], ["regulator", 3], ["regulator", 4], ["university", 4], ["taking", 0], ["topic", 0], ["topic", 1]]) assert.equal(T[k].rows[i].kept.length, T[k].rows[i].n, `${k} row ${i}: its number and its list differ`);
  assert.equal(T.regulator.rows[0].n + 0, REC.accepted.length); assert.equal(T.regulator.rows[1].kept.length + T.regulator.rows[1].left.length, T.regulator.rows[0].n, "accepted = requirement + not a requirement");
});

test("A1 + G2 + D6 · the subject's own list: Singapore is a requirement country, the Philippines is ACCEPTED (employers, schools) but no registration rule; one page per regulator rule; titles in people's words, never cut", () => {
  assert.ok(LIST.items.length > 500 && LIST.source.includes("AlmiOET") && LIST.listOn === "2026-06-27", "the list carries its source and date");
  assert.ok(LIST.items.every((x) => Object.values(x).every((v) => typeof v !== "string" || v.length <= 200)), "facts only — no page's prose is carried");
  const acc = REC.accepted.map((c) => c.country), req = REC.requirement.map((c) => c.country);
  assert.ok(acc.includes("Singapore") && req.includes("Singapore"), "G2: Singapore (a regulator names it) was missing from the 9");
  assert.ok(acc.includes("Philippines") && !req.includes("Philippines"), "D6: the Philippines is accepted, never a registration requirement");
  assert.match(REC.notRequirement.find((x) => x.name === "Philippines").why, /no health regulator/);
  assert.ok(acc.length > 9, `G2: more than the old 9 (${acc.length})`);
  assert.ok(!isRegulator({ name: "Australian Department of Home Affairs", kind: "Government" }), "a visa office is no regulator");
  /* sab321: the line above is held by official.mjs too — this one reaches recognition.mjs's own rule alone (a list that files a visa
   * office as a credentialing body) */
  assert.ok(!isRegulator({ name: "Example Immigration Health Office", kind: "Credentialing agency" }), "a visa office filed as credentialing is no regulator");
  assert.ok(isRegulator({ name: "Dubai Healthcare City Authority", kind: "Government" }), "a health authority is");
  const R = regulatorPagesOf(REC, { subject: "OET", professions: PROFS });
  const nmbi = R.pages.find((p) => p.short === "NMBI"), ahpra = R.pages.filter((p) => /AHPRA/.test(p.title));
  assert.equal(nmbi.title, "OET score for nurses in Ireland (NMBI)");
  assert.equal(ahpra.length, 1, "Ahpra's one rule is ONE page"); assert.equal(ahpra[0].professions.length, 12, "its professions are sections of it");
  for (const p of R.pages) { assert.ok(p.title.length <= 70, `too long (${p.title.length}): ${p.title}`); /* the second proof: 4 drafts failed only their title */ assert.ok(p.title.endsWith(")") || p.title.includes(": "), `cut: ${p.title}`); }
  assert.equal(new Set(R.pages.map((p) => `${p.country}|${p.body}`)).size, R.pages.length, "a regulator twice");
  assert.equal(regulatorTitle("OET", { name: "Medical Radiation Practice Board of Australia", short: null, country: "Australia", professions: ["radiography"] }), "OET for radiographers in Australia: Medical Radiation Practice Board");
  assert.equal(gradeLine({ listening: "B", reading: "B", writing: "C+", speaking: "B" }), "Listening B · Reading B · Writing C+ · Speaking B");
});

test("A2 + A4 + A5 · a regulator's own page while BUILDING: the scores, validity, combining, steps and link — each with its source and date; a number not on the page is NOT shown; an unreadable page is built from the list with \"check here\"", async () => {
  const page = { listId: "x1", body: "Example Nursing Board", short: "ENB", country: "Ireland", professions: ["nursing"], grade: { listening: "B", reading: "B", writing: "B", speaking: "B" }, website: "https://board.example/", record: { officialUrl: "https://board.example/english", validityYears: 2, combineWithinMonths: 6 } };
  /* own words: names OET, its four sub-test results, a two-year limit; it says NOTHING about combining sittings */
  const text = "Example Nursing Board English rules. OET is accepted. OET Listening B (350) Reading B (350) Writing C+ (300) Speaking B (350). Your OET result must be valid, taken within the last 2 years before you apply.";
  const reader = { on: ON, read: async (u) => (u === "https://board.example/english" ? { ok: true, url: u, title: "English rules", text, links: [{ href: "https://board.example/apply", text: "How to apply for registration" }], checkedOn: ON } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }), sitemapOf: async () => ({ ok: false, urls: [] }) };
  const r = await readRegulator({ page, subject: "OET", reader });
  const by = Object.fromEntries(r.claims.map((c) => [c.fact, c]));
  assert.ok(r.ok && by.scores && by.validity && by.steps && by.link, JSON.stringify(r.claims.map((c) => c.fact)));
  assert.match(by.scores.text, /Writing C\+ 300/); assert.match(by.scores.text, /OET's list says Listening B · Reading B · Writing B · Speaking B; the regulator's own page is followed/);
  assert.match(by.validity.text, /2 years/); assert.equal(by.combining, undefined, "AlmiOET's record says 6 months — the page does not, so it is not shown");
  assert.ok(r.claims.every((c) => c.link && c.readOn === ON), "every item its source and date");
  assert.equal(by.steps.link, "https://board.example/apply");
  /* A5 */
  assert.equal(verbatimOk("a time limit of 3 years", text), false); assert.equal(verbatimOk("a time limit of 2 years", text), true); assert.equal(verbatimOk("within two years", "within 2 years"), true);
  assert.equal(validityIn(text, 5), null, "a lead the page does not confirm is no fact");
  assert.equal(validityIn("Results from two sittings within 12 months may be combined.", null), null, "a combining window is no validity");
  assert.deepEqual(combiningIn("All four sub-tests in one sitting, or across a maximum of two sittings within six months.").allowed, true, "\"one sitting OR two sittings\" allows two (the Ahpra misreading)");
  assert.equal(combiningIn("Results cannot be combined across test sittings.").allowed, false);
  /* A2: unreadable → built from the list, with "check here", its link and date */
  const down = await readRegulator({ page: { ...page, record: { officialUrl: "https://board.example/gone" } }, subject: "OET", reader });
  assert.equal(down.ok, false); assert.equal(down.claims.length, 1); assert.match(down.claims[0].text, /^Check here: Example Nursing Board's own page — it could not be read on 2026-10-23 \(the page answered 404\); this page is built from OET's list\.$/);
  /* the plan keeps the page, with its read state, and Q3 counts it */
  const { plan } = planOf({ reads: { [REC.regulators.find((x) => x.short === "NMBI").id]: { ok: false, why: "the page answered 403", on: ON, url: "https://x", claims: down.claims } } });
  const p = plan.kinds.regulator.find((x) => x.short === "NMBI");
  assert.ok(p && p.read.ok === false && p.claims.some((c) => /^Check here/.test(c.text)), "an unreadable regulator page is not dropped");
  assert.equal(plan.numbers.regulatorNotRead, 1);
});

test("A2 · ROBOTS BY RFC 9309 (the desktop's reader): 4xx → may read; 429, 5xx or no answer → not now, again next run; a redirect followed; the engine's crawler keeps its stricter rule", async () => {
  const at = (status, body = "", loc = null) => async (u) => (u.endsWith("/robots.txt") && !u.includes("moved") ? { status, ok: status < 300, headers: new Headers(loc ? { location: loc } : {}), text: async () => body } : { status: 200, ok: true, headers: new Headers(), text: async () => "User-agent: *\nDisallow: /private" });
  const rfc = (f) => createRobotsCache({ fetchImpl: f, rfc9309: true });
  assert.equal((await rfc(at(403)).check("https://a.example/page")).allowed, true, "403 robots.txt: RFC 9309 lets the site be read");
  assert.equal((await rfc(at(401)).check("https://a.example/page")).allowed, true);
  for (const s of [500, 503, 429]) { const r = await rfc(at(s)).check("https://a.example/page"); assert.deepEqual([r.allowed, r.retryLater], [false, true], `HTTP ${s}`); }
  const moved = await rfc(at(301, "", "https://b.example/moved/robots.txt")).check("https://a.example/private/x");
  assert.equal(moved.allowed, false, "the moved robots.txt's own rules apply"); assert.equal((await rfc(at(301, "", "https://b.example/moved/robots.txt")).check("https://a.example/open")).allowed, true);
  assert.equal((await createRobotsCache({ fetchImpl: at(403) }).check("https://a.example/page")).allowed, false, "the engine's crawler: 403 still fails closed (RR-135)");
  /* sab321: the address not read answers an allow-all robots.txt — so only allowHop's refusal keeps the site closed */
  const bad = await createRobotsCache({ fetchImpl: at(301, "", "http://127.0.0.1/moved/robots.txt"), rfc9309: true, allowHop: async (u) => !u.includes("127.0.0.1") }).check("https://a.example/x");
  assert.equal(bad.allowed, false, "a redirect to an address that is not read fails closed");
});

test("C + D2 + D3 · the question count: per source; junk is NOT about the product (counted, listed); menu text is never a question; same-meaning groups; own page or inside", () => {
  const { sorted, plan } = planOf();
  const not = sorted.notAbout.map((x) => x.name);
  for (const j of ["kate cowhig", "aguinaldo recruitment agency", "yale visiting student program", "bc care registry", "pgme mcmaster phone number"]) assert.ok(not.includes(j), `D2: "${j}" shown as a question`);
  assert.equal(sorted.menu.length, 1); assert.ok(isMenuText("Read our re-marking policy Everything you need to know FAQs"), "D3");
  assert.ok(!isMenuText("How long are OET results valid?")); assert.ok(aboutProduct({ text: "nmbi english language test score" }, "OET").about, "the English-test need it meets is about it");
  /* the proof: "ot ahpra" and "coru registration for optometrist" name a REGULATOR of OET's list — about the registration it is for; "kate
   * cowhig" names a recruiter of that list — not about OET */
  const regs = REC.regulators.map(callNames);
  assert.ok(aboutProduct({ text: "ot ahpra" }, "OET", { regulators: regs }).about); assert.ok(aboutProduct({ text: "coru registration for optometrist" }, "OET", { regulators: regs }).about);
  assert.equal(aboutProduct({ text: "kate cowhig international healthcare recruitment" }, "OET", { regulators: regs }).about, false);  const qc = plan.questionCount;
  assert.match(qc.line, /questions we found \(not all the questions in the world\)/); assert.doesNotMatch(qc.line, /all questions in the world[^)]/);
  const by = Object.fromEntries(qc.bySource.map((x) => [x.kind, x.found]));
  assert.deepEqual([by.search, by.observed, by["ai research"], by["official FAQ"], by.tool], [11, 1, 1, 1, 1]);
  assert.equal(qc.notAbout, 5); assert.ok(qc.ownPage >= 1 && qc.inside >= 1);
  /* D3 at its root: a FAQ page's menu words never stay in front of its question */
  assert.deepEqual(faqQuestions([{ url: "https://oet.example/faq", checkedOn: ON, text: "Read our re-marking policy Everything you need to know FAQs How long are OET results valid? Book a test." }]).map((q) => q.text), ["How long are OET results valid?"]);
});

test("D7 + E1 + G1 · taking it in a country is a SECTION of the one \"Where to take OET\" page (never its own page); no venue there → said, with the nearest venues (UN M49 sub-region); no origin-country pages at all", () => {
  const { plan } = planOf();
  assert.equal(plan.kinds.taking.length, 1, "E1: one page, never one per origin country");
  const w = plan.kinds.taking[0];
  assert.ok(w.questions.some((g) => g.question === "oet exam in bangladesh" && g.section === "Bangladesh"), "D7: Bangladesh's question is a section");
  assert.ok(!plan.kinds.topic.some((p) => /bangladesh/i.test(p.title)), "D7: never a topic page");
  const bd = w.sections.find((s) => s.country === "Bangladesh");
  /* the proof's draft showed 5 facts and no country: every section is a fact of its own, its fee line in it */
  assert.equal(w.claims.filter((c) => c.section).length, w.sections.length, "a section with no fact on the page");
  assert.ok(w.claims.find((c) => c.section === "Pakistan").text.includes("The fee: AUD $587") || w.claims.find((c) => c.section === "Pakistan").text.includes("The fee: AUD 587"));
  assert.equal(bd.venue, false); assert.match(bd.says, /name no venue in Bangladesh/); assert.deepEqual(bd.nearest.sort(), ["India", "Nepal", "Pakistan"]);
  assert.equal(COUNTRIES.filter((c) => !REGION_OF[c]).length, 0, "every one of the 197 has its sub-region"); assert.ok(neighboursOf("Kenya").includes("Uganda"));
  assert.equal(plan.numbers.venueCountries, VENUES.countries.length);
  /* G1: a page's venue sentences; a country a person comes FROM is no venue; a list after a colon */
  assert.deepEqual(venueCountriesIn("A nurse from Brazil sat the test at a venue in Ghana."), ["Ghana"]);
  assert.deepEqual(listedAfterColon("Candidates in these places can now take the Speaking sub-test at a venue: Kenya South Africa Nepal Ghana (Accra). Emails follow.").sort(), ["Ghana", "Kenya", "Nepal", "South Africa"]);
});

test("E2 + E3 + E4 · the first batch answers the most-searched first; a university page links its regulator pages, a regulator page links \"Where to take\" and the topics; every page knows when it was last checked", () => {
  const { plan } = planOf();
  assert.equal(plan.rollout.first[0], "OET score for nurses in New Zealand (Nursing Council of New Zealand)", "searched from 5 countries — first");
  assert.match(plan.rollout.firstWhy[0].why, /searched from 5 countries/);
  assert.ok(plan.rollout.size >= 50 && plan.rollout.size <= 100);
  const u = plan.kinds.university[0], r = plan.kinds.regulator[0], where = plan.kinds.taking[0].title;
  assert.ok(u.links.length && u.links.every((t) => plan.kinds.regulator.some((p) => p.title === t)), "E3: a university page links ITS regulator pages");
  assert.ok(r.links.includes(where), "E3: a regulator page links Where to take");
  assert.ok(plan.kinds.regulator.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.lastChecked ?? "")), "E4: last checked");
  assert.match(MAIN, /recheckSources\(id\)/); assert.match(MAIN, /updates\.json/); assert.match(UI, /Check the sources again now/);
});

test("B3 + B4 · universities counted from AlmiStudy's data only (no site read); one page per DIFFERENT answer (country + professions); the deep-read box is gone", () => {
  const { plan } = planOf(), n = plan.numbers;
  assert.deepEqual([n.uniAll, n.uniHealth], [UNIS.length, plan.tables.university.rows[1].n]);
  assert.ok(n.uniPages < n.uniWithFacts, "universities sharing one answer are sections of one page");
  const keys = new Set(plan.kinds.university.map((p) => `${p.country}|${[...p.professions].sort().join(",")}`));
  assert.equal(keys.size, plan.kinds.university.length, "two pages with one answer");
  assert.ok(plan.kinds.university.every((p) => p.claims.every((c) => c.link && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn))));
  assert.equal(universityTitle("OET", [{ name: "Example University of Health (EUH)" }], "Pakistan"), "OET for Example University of Health graduates");
  assert.ok(!UI.includes("How many universities to read now"), "B3: the deep-read default is removed");
  assert.match(MAIN, /v\.universityReads : 0\)/);
});

test("B1 + D1 + G3 · no tick needed; the client's words always saved and shown understood; the two country numbers are STEPS, the page total at the top", () => {
  const { plan } = planOf();
  const five = fiveFromList({ subject: "OET", plan, items: ITEMS });
  assert.ok(five.questions.every((q) => q.applies), "B1: never \"does not apply\" because nothing was ticked");
  assert.ok(fiveFromList({ subject: "OET", plan, items: ITEMS, notApply: ["q4"] }).questions.find((q) => q.id === "q4").applies === false, "only when the client says so");
  assert.match(MAIN, /RR-321 D1: the client's words are ALWAYS saved/); assert.match(MAIN, /pwrite\(id, "formula\.json", \{ text: v\.text \?\? null, guided: v\.guided \?\? null, ok: false/);
  assert.match(UI, /function understoodHtml/); assert.match(UI, /Your words are saved/); assert.match(UI, /The lists — used on their own, no tick needed/);
  assert.match(UI, /countries where \$\{esc\(L\.subject\)\} is accepted/); assert.match(UI, /countries where \$\{esc\(L\.subject\)\} can be taken/); assert.match(UI, /Steps \(never page counts\)/);
  assert.match(UI, /The page count — <span id="pctotal">/); assert.match(UI, /data-rowlist=/); assert.match(UI, /The questions we found/);
  assert.match(UI, /Preview one regulator page and one university page/); assert.match(MAIN, /r\[2\] === "count\/preview"/);
  /* the proof found the preview "not found": its handler existed, its address was not in the route list — every count route must be REACHABLE */
  const routeList = new RegExp(/\/\^\\\/api\\\/products\\\/\(\[\^\/\]\+\)\\\/\((web\\\/write\|count[^)]*)\)\$\//.exec(MAIN)[1].replace(/\\\//g, "/"));
  for (const r of ["count", "count/make", "count/understand", "count/preview", "count/recheck"]) assert.ok(new RegExp(`^(${routeList.source})$`).test(r), `${r} is not in the route list`);
});

test("D5 · the fee in the reader's currency: RBA × that country's central bank (RR-257's chain), every rate as written on its source, its date; a bank that refuses or is stale shows NO figure and says why", async () => {
  const xml = "<item><cb:targetCurrency>USD</cb:targetCurrency><cb:value>0.7006</cb:value><cb:period>2026-10-23</cb:period></item><item><cb:targetCurrency>INR</cb:targetCurrency><cb:value>66.47</cb:value><cb:period>2026-10-23</cb:period></item>";
  const rba = rbaRates(xml); assert.deepEqual(rba, { date: ON, rates: { USD: "0.7006", INR: "66.47" } });
  const rates = { on: ON, rba, banks: { PKR: { rate: "280.5", date: ON, link: "https://bank.example/pk", source: "State Bank of Pakistan — M2M revaluation rates", short: "SBP" }, AED: { refused: "Central Bank of the UAE — exchange rates: the page answered 403 (checked 2026-10-23)" }, KES: { rate: "129.1", date: "2024-01-03", link: "https://bank.example/ke", source: "Central Bank of Kenya", short: "CBK" } } };
  const pk = feeInCurrency(FEE, "Pakistan", rates);
  assert.equal(pk.steps.length, 2); assert.deepEqual(pk.steps.map((s) => [s.from, s.to, s.said, s.short]), [["AUD", "USD", "0.7006", "RBA"], ["USD", "PKR", "280.5", "SBP"]]);
  assert.equal(pk.amount, Math.round(587 * 0.7006 * 280.5)); assert.match(pk.line, /^AUD 587 ≈ PKR [\d,]+ — an estimate from the RBA rate of 2026-10-23 \(1 AUD = 0\.7006 USD\) and the SBP rate of 2026-10-23 \(1 USD = 280\.5 PKR\), not an official price$/);
  assert.match(feeInCurrency(FEE, "United Arab Emirates", rates).line, /answered 403.*so no AED figure is shown/);
  assert.match(feeInCurrency(FEE, "Kenya", rates).line, /2024-01-03, more than 7 days old, so no KES figure is shown/);
  assert.match(feeInCurrency(FEE, "India", rates).line, /≈ INR 39,018 .*RBA rate of 2026-10-23/);
  assert.deepEqual(Object.keys(CENTRAL_BANKS).sort(), ["AED", "KES", "PKR", "QAR", "TZS"]);
  assert.deepEqual(CENTRAL_BANKS.TZS.row("40 USD 2624.6931 2650.94 2637.8165 24-Oct-26"), { rate: "2637.8165", date: "2026-10-24" });
  assert.deepEqual(CENTRAL_BANKS.KES.rows('2024-01-03,"US DOLLAR",157.3235,156.95,157.69\n03/01/2024,US DOLLAR,157.1,1,1').map((r) => r.date), ["2024-01-03", "2024-01-03"]);
  /* a bank page that is a security block or a 403 is asked once, never for six more days' files */
  let asked = 0; const reader = { raw: async () => xml, read: async (u) => { asked++; return { ok: false, url: u, why: "its security service refused the reading", blocked: true, checkedOn: ON }; } };
  const got = await readRates({ reader, countries: ["Pakistan"], on: ON });
  assert.equal(asked, 1); assert.match(got.banks.PKR.refused, /security service refused/);
});

test("B2 + D8 · \"how many people take it\": the subject's own statistics page and its files — the shares and nationalities that stand on them; a total it does not state is said so", async () => {
  const reader = { read: async (u) => (u.endsWith("/about/test-statistics") ? { ok: true, url: u, title: "Statistics", text: "Test data 2025. Download the files.", links: [{ href: "https://cdn.example/2025-candidate-performance.pdf", text: "Download candidate performance" }], checkedOn: ON } : { ok: true, url: u, title: "2025 stats.pdf", text: "Candidature by profession Nursing 40% Medicine 55% Others 5% Nationality These lists include data for the nationality with 100 or more candidates. Kenyan Mean Scaled Score 1 2 3 4 Nepalese Mean Scaled Score 1 2 3 4 Speaking Female Mean Scaled Score 1 2 3 4 First language", checkedOn: ON }) };
  const s = await statisticsOf({ urls: ["https://oet.example/about/test-statistics"], subject: "OET", reader });
  assert.deepEqual(s.nationalities, ["Kenyan", "Nepalese"]); assert.deepEqual(s.shares.map((x) => x.percent), ["40", "55", "5"]);
  assert.match(s.line, /2 nationalities with 100 or more candidates each/); assert.match(s.line, /do not state how many people take OET in all/);
});
