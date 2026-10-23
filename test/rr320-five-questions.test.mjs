/**
 * RR-320 · THE 5-QUESTION RESEARCH STRUCTURE, THEN PAGES FROM THE ANSWERS (owner, 2026-10-23, final policy):
 *   A  OET's 12 PROFESSIONS from OET's own site (never AlmiStudy's 12 subjects) — a built-in list with its source and date
 *   B  the five questions answered before any page (per question, per country, each with its source); the search method decided on 12 and
 *      15 Oct (F11): the client's own AI in the client's own browser — client-started, 30 a day, ≥20 s apart, stopped on a captcha —
 *      accepted only by the F11 rules; plus Search Console WITH its country dimension, Keyword Planner / Bing files, the client's AI (an
 *      estimate). Visibility never searches Google.
 *   C  the formula read by its RELATIONS; one table per dimension: every combination → real pages → why
 *   D  universities from AlmiStudy's FULL data; their COURSE pages read (robots obeyed); one page per university, the destinations inside
 *   page rules: profession pages only where a regulator accepts it; origin pages only where the answer differs AND people search for it;
 *   the first batch 50–100, the next when Google shows them.
 * Every network read here is a local fixture (allowLocal); no real browser, no real key, no Google.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { generateKeyPairSync, createHash } from "node:crypto";
import { parseFormula, formulaOf, groupQuestions, planPages, rolloutOf, BATCH } from "../desktop/page-plan.mjs";
import { builtInList } from "../desktop/lists.mjs";
import { countryOfCode, ISO3_CODES, COUNTRIES } from "../desktop/world.mjs";
import { professionsNamedIn, officialReader } from "../desktop/official.mjs";
import { professionsOfFields, teachesHealth, searchesNaming, coursePagesOf, universityFunnel, RECOGNITION_DIRECTORIES } from "../desktop/universities.mjs";
import { FIVE, LABEL, questionsByCountry, browserSearchList, takeHandIn, takeSearchFile, figureOf, fiveAnswers } from "../desktop/research5.mjs";
import { understandFormulaAI } from "../desktop/web-ai.mjs";
import { CLIENT_AI_POLICY } from "../src/discovery/search-phrase-sources.mjs";
import { parseRobots, isAllowedByRules } from "../src/crawl/robots.mjs";

const REPO = join(import.meta.dirname, "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), R5 = readFileSync(join(REPO, "desktop", "research5.mjs"), "utf8");
const ON = "2026-10-23";
const ISO3_PIN = "b9482c8091ae2d8e1b036d8a364d64bcb74851c81858a3b1ff67a9ed85952ba5"; // the ISO3 table checked against UN M49 (scratch m49check), 23 Oct 2026
const OWNER = "1) People from 197 countries apply for 12 professions in the 9 OET destination countries. How many pages?\n2) Graduates of 8,000+ universities need OET to work in these 9 countries. How many pages?\n3) How many questions do people from 197 countries ask about OET?";

/* ══ C · the formula, by its relations ══ */
test("C · THE OWNER'S THREE QUESTIONS are read by their RELATIONS — origin → profession in destination · graduates of universities → working in destinations · the questions per origin country — never 7.36 billion, never the 12 subjects", () => {
  const f = parseFormula(OWNER);
  assert.equal(f.line, "You mean: people from origin country (197) → professions (12) in destination country (9) · graduates of universities (8,000) → working in destination country (9) · the questions people from origin country (197) ask");
  assert.deepEqual(f.parts.map((p) => p.kind), ["profession", "university", "questions"]);
  assert.deepEqual(f.parts.map((p) => p.dims.map((d) => `${d.dim}:${d.n}:${d.role}:${d.word}`)), [["countries:197:origin:countries", "roles:12:null:professions", "countries:9:destination:countries"], ["universities:8000:graduates:universities", "countries:9:destination:countries"], ["countries:197:origin:countries", "questions:null:null:questions"]]);
  assert.equal(f.professions, true, "the 12 are professions — never study subjects");
  assert.ok(!f.run.includes("subjects")); assert.deepEqual([...f.run].sort(), ["countries", "origins", "roles", "universities"]);
  /* "universities IN 197 countries" is where they stand; "graduates … to work in 9 countries" is where they go */
  assert.equal(parseFormula("8,000 universities in 197 countries").parts[0].dims[1].role, "located");
  assert.equal(parseFormula("519 job roles from 197 countries").parts[0].kind, "roles");
  assert.equal(parseFormula("I want nice pages").ok, false);
});
test("C · YOUR AI READS IT WITH THE SAME RELATIONS — professions stay professions, a number the client never wrote is dropped", async () => {
  const parts = [{ text: "People from 197 countries apply for 12 professions in the 9 OET destination countries", dims: [{ dim: "countries", n: 197, role: "origin" }, { dim: "professions", n: 12, role: "none" }, { dim: "countries", n: 9, role: "destination" }, { dim: "subjects", n: 7, role: "none" }] },
    { text: "Graduates of 8,000+ universities need OET to work in these 9 countries", dims: [{ dim: "universities", n: 8000, role: "graduates" }, { dim: "countries", n: 9, role: "graduates" }] }, { text: "How many questions do people from 197 countries ask about OET?", dims: [{ dim: "questions", n: 0, role: "none" }, { dim: "countries", n: 197, role: "origin" }] }];
  const fetchImpl = async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ parts }) }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 });
  const r = await understandFormulaAI({ provider: "anthropic", key: "standin", text: OWNER, fetchImpl, base: "http://127.0.0.1:9" });
  const f = formulaOf(r.parts);
  assert.equal(f.line, "You mean: people from origin country (197) → professions (12) in destination country (9) · graduates of universities (8,000) → working in destination country (9) · the questions people from origin country (197) ask");
  assert.match(MAIN, /if \(a\.ok\) \{ f = formulaOf\(a\.parts\); byAI = true; \}/);
});

/* ══ A · OET's 12 professions ══ */
test("A · OET'S 12 PROFESSIONS are built in from OET's own site (its 12 profession pages, each read, with the day) — used for '12 professions' instead of AlmiStudy's 12 subjects", () => {
  const p = builtInList("professions");
  assert.equal(p.items.length, 12);
  assert.match(p.source, /^OET's own site \(oet\.com\) — its 12 profession pages in its sitemap, each read 2026-10-23$/);
  assert.deepEqual(p.items.map((x) => x.slug).sort(), ["dentistry", "dietetics", "medicine", "nursing", "occupational-therapy", "optometry", "pharmacy", "physiotherapy", "podiatry", "radiography", "speech-pathology", "veterinary-science"]);
  assert.ok(p.items.every((x) => x.page.startsWith("https://oet.com/") && x.readOn === ON));
  assert.match(MAIN, /if \(aw && dims\.includes\("roles"\) && v\.builtin\?\.professions !== false && \(formula\?\.professions \|\| v\.builtin\?\.professions\)/);
  /* AlmiStudy's FULL data: website, country, its own subjects, accreditation with the day verified */
  const u = builtInList("universities");
  assert.equal(u.items.length, 8862); assert.match(u.source, /all fields Visibility uses/);
  const x = u.items.find((i) => i.name === "University of Sydney");
  assert.deepEqual([x.page, x.country, x.fields.includes("Medicine & Health Sciences"), Boolean(x.accreditation?.body && x.accreditation.verifiedOn)], ["https://www.sydney.edu.au", "Australia", true, true]);
});

/* ══ D (Q2) · Search Console by country ══ */
test("Q2 · SEARCH CONSOLE'S COUNTRY DIMENSION: Google's ISO codes → the 197 names (checked against the UN's M49 list); which countries ask which questions, the most first", () => {
  assert.equal(ISO3_CODES.length, COUNTRIES.length); assert.equal(new Set(ISO3_CODES).size, 197);
  assert.deepEqual(["pak", "IND", "gbr", "phl", "are", "xkk", "civ", "usa"].map(countryOfCode), ["Pakistan", "India", "United Kingdom", "Philippines", "United Arab Emirates", "Kosovo", "Côte d'Ivoire", "United States"]);
  assert.equal(countryOfCode("zzz"), null);
  /* the WHOLE table, as checked against the UN's M49 list on 23 Oct 2026 (any swap turns this red) */
  assert.equal(createHash("sha256").update(ISO3_CODES.map((c, i) => `${c}=${COUNTRIES[i]}`).join("|")).digest("hex"), ISO3_PIN);
  const by = questionsByCountry([{ query: "oet pakistan", country: "pak", impressions: 9 }, { query: "oet fee", country: "pak", impressions: 3 }, { query: "oet uk", country: "gbr", impressions: 20 }, { query: "x", country: "hkg", impressions: 1 }]);
  assert.deepEqual(by.map((c) => [c.country, c.searches, c.questions.map((q) => q.text)]), [["United Kingdom", 1, ["oet uk"]], ["Pakistan", 2, ["oet pakistan", "oet fee"]], ["other (HKG)", 1, ["x"]]]);
  const GC = readFileSync(join(REPO, "desktop", "google-connect.mjs"), "utf8");
  assert.match(GC, /dimensions: \["query", "country"\], rowLimit: 5000/);
});

/* ══ the plan, from the answers ══ */
const R = () => ({ ok: true, subjectName: "OET", subjectSite: "https://oet.test/", pagesListed: 50, checkedOn: ON,
  dims: {
    countries: { candidates: 197, kept: ["Ireland", "Australia", "United Kingdom"].map((name) => ({ name, source: { url: `https://oet.test/${name}`, title: name }, checkedOn: ON, how: "ok" })), dropped: [] },
    roles: { candidates: 12, professions: ["nursing", "medicine", "veterinary science"], kept: [{ name: "Nursing", profession: "nursing", source: { url: "https://oet.test/n" }, checkedOn: ON }, { name: "Medicine", profession: "medicine" }, { name: "Veterinary Science", profession: "veterinary science" }], dropped: [] },
    origins: { candidates: 197, kept: ["Philippines", "India", "Kenya"].map((name) => ({ name, source: { url: `https://oet.test/${name}`, title: name }, checkedOn: ON, how: `OET's own page says OET can be taken in ${name}` })), dropped: [] },
    universities: { candidates: 8862, health: 3482, specific: 1285, inScope: 3482, from: "your list", pool: [{ name: "Uni A", country: "India", professions: ["nursing"], searched: 1 }, { name: "Uni V", country: "Kenya", professions: ["veterinary science"], searched: 0 }, { name: "Uni H", country: "Nigeria", professions: [], searched: 0 }],
      read: [{}, {}, {}], kept: [{ name: "Uni A", country: "India", city: "Delhi", professions: ["nursing"], searched: ["uni a oet"], site: { courses: [{ url: "https://a.test/nursing", title: "BSc Nursing", profession: "nursing", readOn: ON, namesSubject: true }] }, accreditation: { body: "NAAC", registry: "https://naac.test", verifiedOn: "2026-05-01" }, source: { url: "https://a.test/nursing" }, checkedOn: ON },
        { name: "Uni V", country: "Kenya", professions: ["veterinary science"], searched: [], site: { courses: [{ url: "https://v.test/vet", title: "BVM", profession: "veterinary science", readOn: ON, namesSubject: false }] }, source: { url: "https://v.test/vet" }, checkedOn: ON }],
      dropped: [{ name: "Uni R", state: "ROBOTS", why: "its robots.txt asks us not to read it — not read" }], notRead: [], blocked: { robots: 1, unreadable: 0, noSite: 0 }, namesSubject: 1, searched: 1 },
  },
  fee: { ok: true, amount: 587, currency: "AUD", source: { url: "https://oet.test/fees", title: "Fees" }, checkedOn: ON }, rates: { date: "2026-10-22", rates: { EUR: 1, AUD: 1.7, PHP: 65, INR: 95 } } });
const OFFICIAL = {
  Ireland: [{ body: "OET", source: "OET — its page for Ireland", text: "OET's own page for Ireland says OET is recognised or accepted there.", link: "https://oet.test/Ireland", readOn: ON },
    { body: "Nursing and Midwifery Board of Ireland", professions: ["nursing"], sets: ["Listening B (350–450) · Reading B (350–450) · Writing C+ (300–340) · Speaking B (350–450)"], text: "Nursing and Midwifery Board of Ireland names OET on its own page.", link: "https://nmbi.test", source: "NMBI — its own page", readOn: ON },
    { body: "Medical Council", professions: ["medicine"], sets: [], text: "Medical Council names OET on its own page.", link: "https://mc.test", source: "MC — its own page", readOn: ON }],
  Australia: [{ body: "Department of Home Affairs", link: "https://ha.test", source: "HA", readOn: ON }, { body: "Australian Health Practitioner Regulation Agency", professions: null, named: ["nursing", "medicine"], sets: ["Listening 350 · Reading 360 · Writing 350 · Speaking 360"], text: "Ahpra names OET on its own page.", link: "https://ahpra.test", source: "Ahpra — its own page", readOn: ON }],
};
const Q = () => groupQuestions([
  { text: "oet score for nurses in ireland", kind: "search", weight: 10 }, { text: "oet requirements doctors ireland", kind: "search", weight: 9 },
  { text: "avbc australia oet", kind: "search", weight: 8 }, { text: "oet united kingdom", kind: "search", weight: 7 }, { text: "oet for pharmacists in australia", kind: "ai research", weight: 1 },
  { text: "oet test centre philippines fee", kind: "search", weight: 6 }, { text: "oet test centres india", kind: "ai research" }, { text: "oet vs ielts which is easier", kind: "ai research" }, { text: "how is oet scored", kind: "official FAQ" }, { text: "best pizza near me", kind: "search" },
]);
const NOTSAID = { "United Kingdom": [{ line: "The official page of NMC, checked 2026-10-23, does not say this." }] };

test("PAGES · PROFESSION PAGES only where that country's regulator accepts it for that profession (its NAME names it, or its own page names its people — Ahpra); a country page only where people SEARCH for the country in general", () => {
  const p = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: Q(), formula: parseFormula(OWNER), subject: "OET" });
  assert.deepEqual(p.kinds.requirement.map((x) => x.title), ["OET for Nursing in Ireland", "OET for Medicine in Ireland", "OET for Nursing and Medicine in Australia", "OET in Australia: professions and regulators", "OET in United Kingdom: professions and regulators"], "Ahpra's ONE rule for nurses and doctors is one page (the proof: 9 near-identical Australian pages)");
  /* a regulator's own page names the PEOPLE it registers (Ahpra's page names no profession in its name) */
  assert.deepEqual(professionsNamedIn("Registered nurses and midwives, medical practitioners, pharmacists and dental practitioners must show English skills."), ["nursing", "medicine", "dentistry", "pharmacy"]);
  assert.deepEqual(professionsNamedIn("Applicants must show English skills."), []);
  const au = p.kinds.requirement.find((x) => x.title === "OET for Nursing and Medicine in Australia");
  assert.equal(au.why, "Australian Health Practitioner Regulation Agency: one rule for nursing, medicine — one page, a section per profession");
  assert.ok(!p.kinds.requirement.some((x) => /Veterinary/.test(x.title)), "a vets' page where no regulator's page says it");
  assert.ok(!p.kinds.requirement.some((x) => x.bodies?.includes("Department of Home Affairs") && !x.hub), "a visa office set a profession's rule");
  assert.deepEqual(p.gaps.filter((g) => g.country === "United Kingdom").map((g) => g.reason), ["not said", "not said", "not said"]);
  assert.equal(p.gaps.find((g) => g.country === "Australia" && g.profession === "veterinary science").why, "Australian Health Practitioner Regulation Agency: its own page names OET, but not veterinary science", "a visa office read as a regulator");
  /* an AI's question is never search evidence: "pharmacists in australia" waits */
  assert.ok(p.unused.some((u) => u.question === "oet for pharmacists in australia" && /^about pharmacy, which OET is not for$/.test(u.why)) || p.unused.some((u) => u.question === "oet for pharmacists in australia"));
  const hub = p.kinds.requirement.find((x) => x.hub && x.country === "United Kingdom");
  assert.equal(hub.regulator, "No health regulator's own page for United Kingdom names OET yet — checked: 1 official page.");
  /* without the search, no country page */
  const quiet = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: groupQuestions([{ text: "oet united kingdom", kind: "ai research" }]), subject: "OET" });
  assert.ok(!quiet.kinds.requirement.some((x) => x.hub)); assert.match(quiet.unused[0].why, /^about OET in United Kingdom in general — no search evidence yet/);
});

test("PAGES · ORIGIN pages only where the answer differs (a venue, the fee in its currency) AND people search for it — the rest are sections of ONE page; a UNIVERSITY page per university with every destination inside it", () => {
  const p = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: Q(), formula: parseFormula(OWNER), subject: "OET" });
  assert.deepEqual(p.kinds.taking.map((x) => [x.title, x.countries ?? null]), [["Taking OET in Philippines: venues, dates and fee", null], ["Where to take OET: venues, dates and fees by country", ["India", "Kenya"]]]);
  assert.equal(p.kinds.taking[0].fee, "AUD 587 ≈ PHP 22,444 (the European Central Bank's reference rates of 2026-10-22)");
  assert.deepEqual(p.kinds.taking[1].questions.map((q) => q.question), ["oet test centres india"], "an AI's question makes no origin page of its own");
  const u = p.kinds.university;
  assert.deepEqual(u.map((x) => x.title), ["OET for Uni A graduates"], "one page per university — never one per country; Uni V's vets have no regulator fact");
  assert.deepEqual(u[0].destinations.map((d) => [d.country, d.facts.map((f) => f.body)]), [["Ireland", ["Nursing and Midwifery Board of Ireland"]], ["Australia", ["Australian Health Practitioner Regulation Agency"]], ["United Kingdom", []]]);
  assert.equal(u[0].destinations[2].says, "No health regulator's own page for United Kingdom names OET yet — checked: 1 official page.");
  assert.deepEqual(u[0].claims.map((c) => [c.text, c.link]), [["Uni A lists a nursing course on its own site.", "https://a.test/nursing"], ["Uni A's own nursing page names OET.", "https://a.test/nursing"], ["Nursing and Midwifery Board of Ireland names OET on its own page.", "https://nmbi.test"], ["Ahpra names OET on its own page.", "https://ahpra.test"]]);
  assert.deepEqual(u[0].questions.map((q) => q.question), ["uni a oet"]);
  assert.deepEqual(p.kinds.topic.map((t) => t.title), ["OET vs IELTS and other tests", "How OET is scored"]);
  assert.ok(p.unused.some((x) => x.question === "best pizza near me"));
  /* no medicine course → no WDOMS link; a medical school gets the "check here" link, never the directory's data */
  assert.equal(RECOGNITION_DIRECTORIES[0].reuse, false); assert.match(RECOGNITION_DIRECTORIES[0].line, /copies nothing from it/);
});

test("C · ONE TABLE PER DIMENSION — every combination → real pages → why, with the real number at every step; 'why not more' adds the owner's own numbers, never multiplies them all", () => {
  const p = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: Q(), formula: parseFormula(OWNER), subject: "OET" });
  const t = (f) => f.rows.map((r) => [r.step, r.n]);
  assert.deepEqual(t(p.funnels.professions), [["Every combination of your numbers", 21276], ["Destination countries where OET's own site says it is recognised", 3], ["Professions OET has a test for (its own site)", 3], ["Destination × profession", 9], ["…where that country's regulator accepts OET for that profession (its own page, read)", 4], ["…sharing one regulator and one rule with another profession — a section of that one page", 1], ["Not a page: no regulator's own page found to read", 0], ["Not a page: official pages checked, they do not say it", 5], ["Not a page: the regulator's robots.txt refused the reading", 0], ["Country pages people search for in general", 2], ["Real pages", 5]]);
  assert.deepEqual(t(p.funnels.origins), [["Countries people come from", 197], ["…where OET's own site names a venue", 3], ["…where the fee differs in the local currency (ECB rate)", 2], ["…with their own council's verification step", null], ["…and people search for taking it there (your Search Console)", 1], ["Real pages", 2]]);
  assert.deepEqual(t(p.funnels.universities), [["Every combination of your numbers", 72000], ["Universities in your list", 8862], ["…that teach healthcare (the list's own subjects)", 3482], ["…whose professions have a destination fact (a regulator's own page)", 2], ["Own site read in this run", 3], ["…a health course page found on its own site", 2], ["Search evidence (your Search Console names it)", 1], ["Real pages now", 1]]);
  assert.equal(p.whyNotMore.line, "Not 93,276 pages (21,276 + 72,000): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.");
  assert.deepEqual(p.perPart.map((x) => [x.kind, x.funnel]), [["profession", "professions"], ["university", "universities"], ["questions", "questions"]]);
});

test("ROLLOUT · the first batch is 50–100 pages, the searched ones first; the next only when Search Console shows Google showing them; 'Make' makes the first batch only", () => {
  const p = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: Q(), formula: parseFormula(OWNER), subject: "OET" });
  assert.equal(p.rollout.size, p.total); assert.match(p.rollout.line, /^All 10 pages in the first batch \(fewer than 50 — every page that is real now\)\. The next batch is made only when your Search Console shows Google is showing these pages/);
  const many = Array.from({ length: 140 }, (_, i) => ({ kind: "university", title: `U${i}`, questions: [], destinations: [] }));
  many[120].searched = true;
  const r = rolloutOf(many);
  assert.deepEqual([r.size, r.later, r.first[0], BATCH.min, BATCH.max], [100, 40, "U120", 50, 100]);
  assert.match(MAIN, /first = new Set\(c\?\.plan\?\.rollout\?\.first \?\? all\.map\(\(p\) => p\.title\)\), pages = all\.filter\(\(p\) => first\.has\(p\.title\)\);/);
});

/* ══ D · universities ══ */
test("D · UNIVERSITIES: healthcare from the list's own subjects, the professions they name; a search that names a university (never its city alone)", () => {
  assert.deepEqual(professionsOfFields(["Nursing", "Pharmacy", "Medicine & Health Sciences", "Veterinary Medicine", "Business"]), ["nursing", "pharmacy", "veterinary science"]);
  assert.deepEqual(professionsOfFields(["Medicine"]), ["medicine"]);
  assert.equal(teachesHealth({ fields: ["Law"], subjects: ["medicine-health-sciences"] }), true); assert.equal(teachesHealth({ fields: ["Law"], subjects: ["law"] }), false);
  const dal = { name: "Dalhousie University", city: "Halifax" }, syd = { name: "University of Sydney", city: "Sydney" }, ks = { name: "King Saud bin Abdulaziz University for Health Sciences (KSAU-HS)", city: "Riyadh" };
  assert.deepEqual(searchesNaming(dal, ["pgme dalhousie", "oet halifax"]), ["pgme dalhousie"]);
  assert.deepEqual(searchesNaming(syd, ["oet sydney", "university of sydney oet"]), [], "the city alone is not the university");
  assert.deepEqual(searchesNaming(ks, ["ksau-hs nursing oet"]), ["ksau-hs nursing oet"]);
  /* the real run (23 Oct): a subject word in a name is not the university ("college of pharmacy pei" is not Hanoi's; "bc care registry" not Tallinn's) */
  assert.deepEqual(searchesNaming({ name: "Hanoi University of Pharmacy (Trường Đại học Dược Hà Nội, HUP)", city: "Hanoi" }, ["college of pharmacy pei", "pharmacy deakin"]), []);
  assert.deepEqual(searchesNaming({ name: "Tallinn Health Care College", city: "Tallinn" }, ["bc care registry"]), []);
  assert.deepEqual(searchesNaming({ name: "University of Veterinary Sciences Brno (VETUNI / VFU)", city: "Brno" }, ["australasian veterinary boards council (avbc)"]), []);
  assert.deepEqual(searchesNaming({ name: "Deakin University", city: "Geelong" }, ["pharmacy deakin"]), ["pharmacy deakin"]);
});

function uniSites() {
  let base = "";
  const P = (t, b) => `<html><head><title>${t}</title></head><body><main>${b}</main></body></html>`;
  const srv = createServer((q, r) => {
    const host = q.url.split("/")[1], path = `/${q.url.split("/").slice(2).join("/")}`;
    const h = (s, type = "text/html") => { r.writeHead(200, { "content-type": type }); r.end(s); };
    if (q.url === "/robots.txt") return h("User-agent: *\nDisallow: /blocked/\n", "text/plain");
    if (q.url === "/sitemap.xml") return h(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/a/study/courses/bachelor-of-nursing", "/a/news/nursing-award", "/a/2022/03/09/nursing-day", "/a/college-of-nursing-officials/", "/a/study/courses/pharmacy"].map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`, "application/xml");
    if (q.url === "/a/") return h(P("Uni A", `<a href="${base}/a/about">About</a>`));
    if (q.url === "/a/study/courses/bachelor-of-nursing") return h(P("Bachelor of Nursing | Uni A", "<p>International applicants: IELTS 7 or OET grade B in each sub-test.</p>"));
    if (q.url === "/a/study/courses/pharmacy") return h(P("Pharmacy | Uni A", "<p>Our pharmacy degree.</p>"));
    if (q.url === "/b/") return h(P("Uni B", `<a href="${base}/b/faculty/medicine">Faculty of Medicine</a> <a href="${base}/b/video/nursing-day">Video</a> <a href="${base}/b/school/nursing">Nursing</a>`));
    if (q.url === "/b/faculty/medicine") return h(P("Faculty of Medicine | Uni B", "<p>MBBS.</p>"));
    if (q.url === "/a/news/nursing-award") return h(P("Nursing award | Uni A", "<p>Our nursing students won.</p>"));
    if (q.url === "/a/2022/03/09/nursing-day") return h(P("Nursing day | Uni A", "<p>A dated news post.</p>")); // the proof: Cavite's nursing "course" was a 2022 news post
    if (q.url === "/a/college-of-nursing-officials/") return h(P("Officials | Uni A", "<p>A staff list.</p>"));
    if (q.url === "/b/video/nursing-day") return h(P("Video | Uni B", "<p>A video.</p>"));
    if (q.url === "/b/school/nursing") { r.writeHead(301, { location: `${base}/b/` }); return r.end(); } // the real run: a link that moves to the home page
    void host; void path; r.writeHead(404); r.end();
  });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
test("D · COURSE PAGES (RR-319 found 0 on general English pages): a university's own course pages from its sitemap or home links, one per profession, robots obeyed — OET named on a course page counts; a news page never", async () => {
  const s = uniSites(), base = await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const a = await coursePagesOf({ u: { name: "Uni A", page: `${base}/a/` }, reader: rd, subject: "OET" });
    assert.equal(a.state, "READ");
    assert.deepEqual(a.courses.map((c) => [c.url.replace(base, ""), c.profession, c.namesSubject]), [["/a/study/courses/pharmacy", "pharmacy", false], ["/a/study/courses/bachelor-of-nursing", "nursing", true]]);
    const b = await coursePagesOf({ u: { name: "Uni B", page: `${base}/b/` }, reader: rd, subject: "OET" });
    assert.deepEqual(b.courses.map((c) => [c.profession, c.namesSubject]), [["medicine", false]]);
    const blocked = await coursePagesOf({ u: { name: "Uni R", page: `${base}/blocked/` }, reader: rd, subject: "OET" });
    assert.deepEqual([blocked.state, blocked.courses.length], ["ROBOTS", 0]);
    const f = await universityFunnel({ all: [{ name: "Uni A", country: "India", page: `${base}/a/`, fields: ["Nursing", "Pharmacy"] }, { name: "Uni B", country: "Nigeria", page: `${base}/b/`, fields: ["Medicine"] }, { name: "Uni R", country: "Kenya", page: `${base}/blocked/`, fields: ["Nursing"] }, { name: "Uni L", country: "Peru", page: `${base}/l/`, fields: ["Law"] }, { name: "Uni Q", country: "Chad", page: `${base}/q/`, fields: ["Nursing"] }], reader: rd, subject: "OET", queries: ["uni b oet"], countryWeight: { India: 5, Kenya: 3 }, maxReads: 3 });
    assert.deepEqual([f.candidates, f.health, f.read.length, f.kept.length, f.blocked.robots, f.notRead.length, f.namesSubject, f.searched], [5, 4, 3, 2, 1, 1, 1, 0], "the funnel's numbers");
    assert.deepEqual(f.read.map((x) => x.name), ["Uni A", "Uni R", "Uni B"], "the countries people search from first");
    assert.equal(f.dropped.find((d) => d.name === "Uni R")?.why, "its robots.txt asks us not to read it — not read");
    /* one site that throws never stops the count (the proof: one robots rule stopped all 120) */
    const boom = { ...rd, read: async (u) => { if (/boom/.test(u)) throw new Error("Invalid regular expression"); return rd.read(u); } };
    const g = await universityFunnel({ all: [{ name: "Uni Boom", country: "India", page: `${base}/boom/`, fields: ["Nursing"] }, { name: "Uni A", country: "India", page: `${base}/a/`, fields: ["Nursing"] }], reader: boom, subject: "OET", maxReads: 5 });
    assert.deepEqual([g.read.length, g.kept.map((x) => x.name), g.blocked.unreadable], [2, ["Uni A"], 1]);
  } finally { s.close(); }
});

/* ══ B · the five questions and the search method ══ */
const hand = (over = {}) => ({ source: "CLIENT_AI_GOOGLE", date: ON, place: "Pakistan", language: "en", startedBy: { who: "CLIENT", record: "the client pressed start in his own browser" }, notice: { text: "Starting 2 searches", givenAt: `${ON}T10:00:00Z` }, policy: { minPauseSeconds: 20, dailyCap: 30 },
  runs: [{ runId: "r1", searches: [{ n: 1, query: "oet pakistan", action: "AUTOCOMPLETE", at: `${ON}T10:00:05Z` }, { n: 2, query: "oet for nurses", action: "RESULTS", at: `${ON}T10:00:30Z` }], observations: [{ search: 1, kind: "AUTOCOMPLETE", texts: ["oet pakistan fee", "oet pakistan centres"] }, { search: 2, kind: "PEOPLE_ALSO_ASK", texts: ["Is OET easier than IELTS for nurses?"] }], stopped: null }], ...over });
test("B · THE BROWSER SEARCH IS THE ONE DECIDED (F11): the client's own AI in his own browser, client-started, ≤30 a day, ≥20 s apart, stopped at once on a captcha — accepted only by the F11 rules; a refused run keeps NONE of its phrases; Visibility never searches Google", () => {
  assert.deepEqual([CLIENT_AI_POLICY.dailyCap, CLIENT_AI_POLICY.minPauseSeconds], [30, 20]);
  const ok = takeHandIn(hand());
  assert.equal(ok.line, "Run r1: accepted — 2 searches (2 of 30 today), 3 phrases kept.");
  assert.deepEqual(ok.phrases.map((p) => [p.text, p.kind, p.place]), [["oet pakistan fee", "observed", "Pakistan"], ["oet pakistan centres", "observed", "Pakistan"], ["Is OET easier than IELTS for nurses?", "observed", "Pakistan"]]);
  const fast = hand(); fast.runs[0].searches[1].at = `${ON}T10:00:10Z`;
  const stop = hand(); stop.runs[0].stopped = { reason: "CAPTCHA", at: `${ON}T10:00:20Z`, toldClient: true };
  for (const [h, why, opts] of [[hand({ startedBy: { who: "AI", record: "x" } }), "RUN_NOT_STARTED_BY_THE_CLIENT"], [fast, "PAUSE_SHORTER_THAN_DECLARED"], [stop, "OBSERVATION_OR_SEARCH_AFTER_THE_STOP"], [hand(), "DAILY_CAP_EXCEEDED", { runsBefore: [{ date: ON, verdict: "ACCEPTED", searchesUsed: 29 }] }], [hand({ policy: { minPauseSeconds: 5, dailyCap: 100 } }), "RUN_DECLARES_A_FASTER_PACE_OR_A_LARGER_CAP_THAN_ALLOWED"]]) {
    const t = takeHandIn(h, opts); assert.equal(t.phrases.length, 0, why); assert.ok(t.runs[0].refusedFor.includes(why), `${why}: ${t.runs[0].refusedFor}`);
  }
  const l = browserSearchList({ subject: "OET", countries: ["Ireland"], origins: Array.from({ length: 20 }, (_, i) => `C${i}`), professions: Array.from({ length: 40 }, (_, i) => `p${i}`), own: [{ text: "which countries accept OET for nursing" }] });
  assert.equal(l.list.length, 30, "never more than 30 a day"); assert.equal(l.list[0].q, "which countries accept OET for nursing", "the client's own question first");
  assert.match(l.instruction, /^Search Google in this browser for each line below, one at a time, at least 20 seconds apart, at most 30 today\./);
  assert.match(l.instruction, /On a captcha or an "unusual traffic" page: STOP at once, tell me, and do not solve it or try again\./);
  /* the engine never fetches: research5 holds no fetch, and Google is never an address it reads */
  assert.doesNotMatch(R5, /\bfetch\(|google\.com\/search/);
});

test("B · SEARCH-DATA FILES (free): a Keyword Planner export and Bing Webmaster's keyword research — the tool's own estimates, labelled so; connecting a Google Ads account is parked", () => {
  const k = takeSearchFile("Keyword,Currency,Avg. monthly searches\noet pakistan,PKR,1000\n", { country: "Pakistan", exportedOn: "2026-10-20" });
  assert.deepEqual([k.kind, k.phrases[0].text, k.phrases[0].kind, k.phrases[0].source], ["Keyword Planner", "oet pakistan", "tool", "your Keyword Planner file (2026-10-20) — the tool's own estimate"]);
  const b = takeSearchFile("Keyword,Impressions\noet uk,40\n", { country: "United Kingdom", exportedOn: "2026-10-20" });
  assert.deepEqual([b.kind, b.phrases[0].volume.estimate], ["Bing Webmaster", 40]);
  assert.equal(takeSearchFile("name,age\nx,1\n", { exportedOn: ON }).kind, null);
  assert.match(UI, /Connecting a Google Ads account is parked until after launch\./);
});

function officialSite() {
  let base = "";
  const P = (t, b) => `<html><head><title>${t}</title></head><body><main>${b}</main></body></html>`;
  const pages = { "/about-us": P("About | OET", "<p>OET is taken by more than 100,000 candidates each year in 40 countries.</p>"), "/about-team": P("Team | OET", "<p>Our people.</p>") };
  const srv = createServer((q, r) => { if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); } if (pages[q.url]) { r.writeHead(200, { "content-type": "text/html" }); return r.end(pages[q.url]); } r.writeHead(404); r.end(); });
  return { urls: () => Object.keys(pages).map((p) => `${base}${p}`), listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
test("B · Q1 'HOW MANY TAKE IT': a figure only where a page STATES it (the number and its noun, never the page's sentence), with its link and date — else 'official pages checked <date>, do not say'", async () => {
  const s = officialSite(); await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const f = await figureOf({ urls: s.urls(), subject: "OET", reader: rd });
    assert.deepEqual([f.ok, f.figure, f.label, f.on], [true, "100,000 candidates", LABEL.official, ON]);
    assert.equal(f.line, "OET's own page states a figure of 100,000 candidates.");
    const none = await figureOf({ urls: [s.urls()[1]], subject: "OET", reader: rd });
    assert.equal(none.line, `Official page checked ${ON} (1), does not say how many people take OET.`);
  } finally { s.close(); }
});

test("B · THE FIVE ANSWERS, each with its sources and labels; per country; 'does not apply' where it does not; the client's own question answered from the sources or first on the browser list", () => {
  const plan = planPages({ r: R(), official: OFFICIAL, notSaid: NOTSAID, questions: Q(), formula: parseFormula(OWNER), subject: "OET" });
  const items = [{ text: "oet pakistan fee", kind: "observed", source: "client-AI-observed Google (Pakistan), 2026-10-23" }, { text: "oet for nurses in pakistan", kind: "ai research", source: "your AI's research", on: ON }, { text: "which countries accept oet for nursing", kind: "search", source: "SC" }];
  const by = questionsByCountry([{ query: "oet pakistan", country: "pak", impressions: 9 }, { query: "oet uk", country: "gbr", impressions: 20 }]);
  const V = fiveAnswers({ subject: "OET", res: R(), plan, official: OFFICIAL, byCountry: by, sc: { on: ON, window: "2026-07-22 to 2026-10-20" }, items, figure: { ok: true, figure: "100,000 candidates", line: "OET's own page states a figure of 100,000 candidates.", url: "https://oet.test/about", on: ON, label: LABEL.official }, own: [{ id: "own-1", text: "which countries accept OET for nursing" }, { id: "own-2", text: "zebra crossing rules" }] });
  assert.deepEqual(V.questions.map((q) => [q.id, q.applies]), FIVE.map((f) => [f.id, true]));
  const [q1, q2, q3, q4, q5] = V.questions;
  assert.match(q1.answer, /^Used by 3 healthcare professions \(nursing, medicine, veterinary science\) to register and work in 3 countries\. OET's own page states a figure of 100,000 candidates\. Taken in 3 countries \(a venue on its own pages\)\. Your searchers come most from United Kingdom, Pakistan/);
  assert.ok(q1.sources.some((s) => s.label === LABEL.official && s.url === "https://oet.test/about" && s.on === ON));
  assert.deepEqual(q2.perCountry.map((c) => [c.country, c.questions[0].text, c.label]), [["United Kingdom", "oet uk", LABEL.search], ["Pakistan", "oet pakistan", LABEL.search]]);
  assert.deepEqual(q2.aiByCountry, [{ country: "Pakistan", questions: ["oet for nurses in pakistan"], label: "AI estimate — not search data" }]);
  assert.equal(q2.observed[0].label, "seen in Google by your AI, in your browser");
  assert.match(q3.answer, /^Recognised in 3 of 197 countries \(OET's own pages\): Ireland, Australia, United Kingdom\. A regulator's own page was read that accepts it in 2: Ireland, Australia\.$/);
  assert.equal(q4.n, 2); assert.equal(q5.n, 3); assert.match(q5.answer, /nursing: 2 · medicine: 2 · veterinary science: 0/);
  assert.deepEqual(V.own.map((q) => q.matches.length > 0), [true, false]);
  assert.equal(V.own[1].answer, "Not answered yet — it is first on your AI's browser-search list.");
  /* a YouTube channel has no universities or countries to work in: "does not apply" */
  const yt = fiveAnswers({ subject: "OET", res: { dims: {} }, plan: null, items: [], notApply: [] });
  assert.deepEqual(yt.questions.map((q) => q.applies), [true, true, false, false, false]);
  assert.match(yt.questions[3].answer, /^Does not apply — no universities in the pages you have in mind/);
  assert.equal(fiveAnswers({ subject: "OET", res: R(), plan, notApply: ["q4"] }).questions[3].answer, "Does not apply — you said so.");
});

test("ROUTES + SCREEN · the five questions on the screen with their sources, per-country table, the browser-search list and instruction, the hand-in upload, the search-data files, one table per dimension, the first batch", () => {
  for (const s of ["The five questions — answered before any page is planned", "Per country — what people search, in their own words", "Your AI's Google search, in your own browser", "Visibility never searches Google itself.", "Copy the instruction", "The file your AI gave you", "Search-data files (free)", "Add my question", "Does not apply to my product", "Make the first batch (drafts)", /* RR-321 B3: the deep-read box is removed */ "never the 12 study subjects", "pcfunnels", "pcrollout"]) assert.ok(UI.includes(s), `the screen lacks: ${s}`);
  assert.match(MAIN, /research\\\/handin\|research\\\/file\|research\\\/own/);
  assert.match(MAIN, /const runs = pread\(id, "phrase-runs\.json", \[\]\), t = takeHandIn\(hand, \{ runsBefore: runs \}\);/);
  assert.match(MAIN, /if \(t\.phrases\.length\) pwrite\(id, "phrases\.json"/, "a refused run's phrases kept");
  assert.match(MAIN, /const q = await GOOGLE\.queries\(sc\.site\)\.catch\(\(\) => null\); if \(q\) \{ pwrite\(id, "search-console\.json", q\); scNow = q; \}/);
});

/* ══ in the app, on stand-ins ══ */
async function app() {
  const dir = mkdtempSync(join(tmpdir(), "rr320-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, testOfficialPaceMs: 0, keysDir: dir, weeklyFirstMs: 2147483647, tourSeen: true, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD|CLIENT_SECRET/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { url, dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
function subjectSite() {
  let base = "";
  const P = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title></head><body><main>${b}</main></body></html>`;
  const pages = {
    "/": P("XTEST", "<h1>XTEST</h1><p>The XTEST for healthcare.</p>"),
    "/recognition/ireland": P("Ireland | XTEST", "<h1>XTEST for Ireland</h1><p>Work in Ireland with the XTEST, recognised by regulators in Ireland.</p>"),
    "/recognition/pakistan": P("Pakistan | XTEST", "<h1>XTEST in Pakistan</h1><p>Book your XTEST at a test centre in Pakistan.</p>"),
    "/samples/paper/nursing": P("Nursing | XTEST", "<p>The XTEST for nursing.</p>"), "/samples/paper/medicine": P("Medicine | XTEST", "<p>The XTEST for medicine.</p>"), "/samples/paper/dentistry": P("Dentistry | XTEST", "<p>XTEST.</p>"), "/samples/paper/pharmacy": P("Pharmacy | XTEST", "<p>XTEST.</p>"), "/samples/paper/dietetics": P("Dietetics | XTEST", "<p>XTEST.</p>"),
    "/about-us": P("About | XTEST", "<p>XTEST is taken by 12,000 candidates each year.</p>"),
    "/board/english": P("English | Nursing Board of Ireland", "<h1>English language requirements</h1><p>The Nursing Board of Ireland accepts the XTEST with grade B in each sub-test.</p>"),
    "/uni/a/": P("Uni A", "<p>Welcome.</p>"), "/uni/a/study/courses/bachelor-of-nursing": P("Bachelor of Nursing | Uni A", "<p>English: the XTEST grade B.</p>"),
  };
  const srv = createServer((q, r) => {
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (q.url === "/sitemap.xml") { r.writeHead(200, { "content-type": "application/xml" }); return r.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).filter((p) => !/^\/(board|uni)/.test(p)).concat(["/uni/a/study/courses/bachelor-of-nursing"]).map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`); }
    if (pages[q.url]) { r.writeHead(200, { "content-type": "text/html" }); return r.end(pages[q.url]); }
    r.writeHead(404); r.end();
  });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
test("IN THE APP · the owner's three questions → the five answers (Search Console by country, the figure, per profession) → the plan with its tables → the browser-search hand-in re-plans at once (a refused one changes nothing) → own question → the first batch made as drafts", async () => {
  const s = subjectSite(), base = await s.listen(), a = await app();
  try {
    await a.post("/api/company", { name: "X", site: base });
    const id = (await a.post("/api/products", { name: "XPrep", site: base })).product.id;
    let o; for (let i = 0; i < 200; i++) { o = await a.get(`/api/products/${id}/overview`); if (!o.checking && o.card) break; await new Promise((r) => setTimeout(r, 150)); }
    writeFileSync(join(a.dir, "products", id, "search-console.json"), JSON.stringify({ kind: "CONNECTED", on: ON, window: "2026-07-22 to 2026-10-20", site: "sc-domain:x.test", queries: [{ query: "xtest for nurses in ireland", clicks: 0, impressions: 3 }, { query: "xtest pakistan centre", clicks: 0, impressions: 2 }], byCountry: [{ query: "xtest for nurses in ireland", country: "irl", impressions: 3, clicks: 0 }, { query: "xtest pakistan centre", country: "pak", impressions: 2, clicks: 0 }] }));
    const u = await a.post(`/api/products/${id}/count/understand`, { text: OWNER.replace(/OET/g, "XTEST") });
    assert.match(u.line, /^You mean: people from origin country \(197\) → professions \(12\) in destination country \(9\)/);
    /* the client pasted the regulator's page (a lead — Visibility reads it during the count) */
    writeFileSync(join(a.dir, "products", id, "official-sources.json"), JSON.stringify({ Ireland: [{ url: `${base}/board/english`, body: "Nursing Board of Ireland", from: "you" }] }));
    const csv = Buffer.from(`name,country,website,subjects\nUni A,India,${base}/uni/a/,Nursing\nUni L,Peru,${base}/uni/l/,Law\n`).toString("base64");
    const c = await a.post(`/api/products/${id}/count`, { useFormula: true, subject: "XTEST", site: `${base}/`, files: [{ dim: "universities", name: "unis.csv", base64: csv }], universityReads: 5 });
    assert.equal(c.running, true, c.refused);
    let st; for (let i = 0; i < 300; i++) { st = await a.get(`/api/products/${id}/count`); if (!st.running && st.last) break; await new Promise((r) => setTimeout(r, 150)); }
    const L = st.last;
    assert.equal(L.result.ok, true, L.result.why);
    assert.deepEqual(L.result.dims.countries.kept.map((k) => k.name), ["Ireland"]);
    assert.deepEqual(L.result.dims.roles.professions.sort(), ["dentistry", "dietetics", "medicine", "nursing", "pharmacy"], "the subject's own profession pages are the 12 (here 5)");
    assert.deepEqual(L.byCountry.map((x) => x.country), ["Ireland", "Pakistan"]);
    assert.deepEqual(L.five.questions.map((q) => q.id), ["q1", "q2", "q3", "q4", "q5"]);
    assert.match(L.five.questions[0].answer, /XTEST's own page states a figure of 12,000 candidates\./);
    assert.deepEqual(Object.keys(L.plan.funnels).sort(), ["origins", "professions", "universities"]);
    assert.deepEqual(L.plan.kinds.requirement.map((p) => p.title), ["XTEST for Nursing in Ireland"]);
    assert.deepEqual(L.plan.kinds.university.map((p) => p.title), ["XTEST for Uni A graduates"]);
    assert.deepEqual(L.plan.kinds.taking.map((p) => p.title), ["Taking XTEST in Pakistan: venues, dates and fee"], "people search for taking it there");
    /* the browser search: the list and the instruction; a refused hand-in keeps nothing; an accepted one re-plans at once */
    assert.ok(st.browser.list.length > 0 && st.browser.list.length <= 30); assert.equal(st.browser.usedToday, 0);
    const today = new Date().toISOString().slice(0, 10), at = (s2) => `${today}T${s2}Z`;
    const h = { ...hand(), date: today, notice: { text: "Starting", givenAt: at("10:00:00") }, runs: [{ runId: "r1", searches: [{ n: 1, query: "xtest ireland", action: "AUTOCOMPLETE", at: at("10:00:05") }], observations: [{ search: 1, kind: "AUTOCOMPLETE", texts: ["xtest ireland nurses salary"] }], stopped: null }] };
    const bad = await a.post(`/api/products/${id}/research/handin`, { base64: Buffer.from(JSON.stringify({ ...h, startedBy: { who: "AI", record: "x" } })).toString("base64") });
    assert.equal(bad.http, 400); assert.match(bad.refused, /REFUSED — RUN_NOT_STARTED_BY_THE_CLIENT/);
    assert.equal(existsSync(join(a.dir, "products", id, "phrases.json")), false, "a refused run's phrases were kept");
    const good = await a.post(`/api/products/${id}/research/handin`, { base64: Buffer.from(JSON.stringify(h)).toString("base64") });
    assert.equal(good.ok, true, good.refused); assert.match(good.line, /accepted — 1 searches \(1 of 30 today\), 1 phrases kept\. The plan is made again with them\./);
    const st2 = await a.get(`/api/products/${id}/count`);
    assert.equal(st2.browser.usedToday, 1); assert.ok(st2.last.replannedOn);
    assert.ok(st2.last.five.questions[1].observed.some((x) => x.text === "xtest ireland nurses salary"));
    assert.equal((await a.post(`/api/products/${id}/research/own`, { text: "is xtest accepted for dentists in ireland" })).ok, true);
    assert.equal((await a.get(`/api/products/${id}/count`)).browser.list[0].q, "is xtest accepted for dentists in ireland");
    await a.post(`/api/products/${id}/research/own`, { notApply: "q4", on: true });
    assert.equal((await a.get(`/api/products/${id}/count`)).last.five.questions[3].answer, "Does not apply — you said so.");
    const mk = await a.post(`/api/products/${id}/count/make`, {});
    assert.equal(mk.ok, true, mk.refused); assert.match(mk.line, /made as drafts \(\d+ planned in all\)/);
    const made = JSON.parse(readFileSync(join(a.dir, "products", id, "made-plan.json"), "utf8"));
    assert.deepEqual(made.map((p) => p.title).sort(), [...st2.last.plan.rollout.first].sort(), "Make made more than the first batch");
  } finally { a.close(); s.close(); }
});

/* ══ the proof (23 Oct): a university's robots.txt rule "/*?????*" stopped the whole count — every rule is read, and obeyed ══ */
test("ROBOTS · a rule with '?' never crashes the count; '$' ends the path; the query counts (RFC 9309) — always the stricter reading", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /*?????*\nDisallow: /*.pdf$\nDisallow: /search?\n");
  const ok = (p) => isAllowedByRules(rules, `https://u.test${p}`);
  assert.deepEqual([ok("/nursing"), ok("/x?????y"), ok("/files/a.pdf"), ok("/files/a.pdf.html"), ok("/search?q=oet"), ok("/search")], [true, false, false, true, false, true]);
});
