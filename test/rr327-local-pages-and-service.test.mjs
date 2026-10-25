/**
 * RR-327 · (1) the app reads AlmiWorld's live keyword database (the keyword service, per country) for its plan; (2) the local page families
 * from real data — COUNTRY, COUNTRY × PROFESSION, CITY — through the RR-322 gates (at least 8 data points of its own, at most 75% alike), and
 * the university pages localized; (3) the owner's page and the finder's small fixes.
 *   S  the service: all locations first, then each country; a fresh location not asked again; stopped plainly; off → the client's own data
 *   C  the cities a venue page names: from a gazetteer (AlmiStudy's cities), never from capital letters; the operator when it is named
 *   K  the keyword database: a keyword's global figure never taken from one country; each country's own searches
 *   L  the local families: a destination is its hub's section; a profession only with its OWN home council; a thin city is a section of
 *      its country's page; every hard fact with its source and date; nothing invented
 *   P  the plan: the families in the ledger, the total, the tables and "why not more"; a question about a country goes to its page
 *   T  re-marking is its own need; the SAR peg   O  the owner's page and the finder (site)
 * Fixtures are Visibility's own words and invented figures. No network, no real browser, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtInList } from "../desktop/lists.mjs";
import { recognitionOf, callNames } from "../desktop/recognition.mjs";
import { planFromList } from "../desktop/plan-list.mjs";
import { groupQuestions } from "../desktop/page-plan.mjs";
import { sortQuestions } from "../desktop/questions.mjs";
import { venueCitiesIn, venueCountries, gazetteerOf } from "../desktop/venues.mjs";
import { localPages, PROFESSION_WORDS } from "../desktop/local-pages.mjs";
import { countryPacket } from "../desktop/country-facts.mjs"; // RR-328
import { dataPointsOf, contentOf, GATES, batchesOf } from "../desktop/pseo.mjs";
import { mergeObservations, itemsOf, byLocationOf, localKeywordStore, emptyDb, fileIdOf, SOURCES } from "../desktop/keyword-db.mjs";
import { keywordService, collectForPlan, serviceOnLine, sourceLine, SERVICE_OFF_LINE, PLAN_REUSE_DAYS } from "../desktop/keyword-service.mjs";
import { classify } from "../desktop/demand.mjs";
import { subjectFactsOf, SUBJECT_FACT_PAGES, FACTS_FOR } from "../desktop/subject-facts.mjs";
import { feeInCurrency, PEGS } from "../desktop/rates.mjs";
import { groupOf } from "../site/kw-finder.mjs";
import { notActive, ownerRefusal, NOT_ACTIVE_LINE, plainError } from "../site/kw-google.mjs";
import { publicKeyState } from "../site/kw-service.mjs";
import * as P from "../site/pages.mjs";

const ON = "2026-10-26", PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase()), REC = recognitionOf(builtInList("recognising"), { professions: PROFS });
const FEE = { ok: true, amount: 587, currency: "AUD", said: "AUD $587", source: { url: "https://oet.example/test/at-home" }, checkedOn: ON };
const RATES = { rba: { date: ON, rates: { USD: "0.6600", INR: "55.10" } }, banks: { PKR: { rate: "280.50", date: ON, link: "https://sbp.example/m2m", source: "State Bank of Pakistan — M2M revaluation rates", short: "SBP" } }, on: ON };
const post = (slug) => ({ url: `https://oet.example/post/${slug}`, title: slug });
const VENUES = {
  countries: [["India", "india-venue"], ["Pakistan", "pakistan-venue"], ["United Kingdom", "uk-venue"]].map(([c, s]) => ({ name: c, source: post(s), checkedOn: ON })),
  cities: [{ city: "Lahore", country: "Pakistan", operator: "An Invented Operator", source: post("pakistan-venue"), checkedOn: ON, said: "an invented sentence" }, { city: "Chennai", country: "India", operator: null, source: post("india-venue"), checkedOn: ON, said: "an invented sentence" }, { city: "Kochi", country: "India", operator: "Another Operator", source: post("india-venue"), checkedOn: ON, said: "an invented sentence" }, { city: "Bristol", country: "United Kingdom", operator: null, source: post("uk-venue"), checkedOn: ON, said: "an invented sentence" }],
  home: { url: "https://oet.example/test/at-home", title: "at home", checkedOn: ON, says: "OET's own page says taking it at home is offered in countries where a venue is not yet available" }, checked: [{ on: ON }] };
const ORIGIN = builtInList("originFacts");
/* each country's own searches — invented keywords and figures (the service's shape: Google's exact averages) */
const KW = { Pakistan: [["oet in pakistan", 2400], ["oet fee in pakistan", 880], ["oet for nurses in pakistan", 590], ["oet centre lahore", 320], ["oet lahore", 210], ["oet uk from pakistan", 150], ["pnmc oet", 90], ["oet doctors pakistan", 70]], India: [["oet india", 6600], ["oet exam fees in india", 1900], ["oet for nurses india", 720], ["oet chennai", 480], ["oet kochi", 390], ["oet kochi centre", 140], ["oet coaching kochi", 110], ["oet kochi date", 90]], Nepal: [["oet nepal", 260]] };
const kwByCountry = Object.fromEntries(Object.entries(KW).map(([c, ks]) => [c, ks.map(([text, said]) => ({ text, said, label: String(said), period: "2025-10-01..2026-09-30", source: SOURCES.service, on: ON }))]));

/* ── S · the service ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function standInService({ fail = null, failAt = null, limit = 300 } = {}) {
  const calls = []; let used = 0;
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : null; calls.push({ path: u.pathname, location: body?.location ?? null, licence: Boolean(init.headers?.["x-almivisibility-licence"]) });
    if (fail) return new Response(JSON.stringify({ ok: false, why: fail }), { status: 503 });
    if (u.pathname === "/v1/keywords/usage") return new Response(JSON.stringify({ ok: true, used, limit }), { status: 200 });
    if (failAt && body.location === failAt) return new Response(JSON.stringify({ ok: false, why: "This month's searches are used.", usage: { used, limit } }), { status: 429 });
    used++;
    const name = { ALL: "All locations", PK: "Pakistan", IN: "India" }[body.location] ?? body.location;
    return new Response(JSON.stringify({ ok: true, location: body.location, locationName: name, period: "2025-10-01..2026-09-30", fromDatabase: true, usage: { month: "2026-10", used, limit }, rows: [{ keyword: "oet", volume: 50000 }, { keyword: `oet ${name.toLowerCase()}`, volume: 1000 + used }] }), { status: 200 });
  };
  return { calls, svc: keywordService({ siteUrl: "https://svc.example/", signed: { licence: { account: "acc-1", plan: "visibility_1" }, signature: "invented" }, fetchImpl }) };
}
const memStore = () => { const m = new Map(); return { m, store: localKeywordStore({ read: (n, d) => (m.has(n) ? structuredClone(m.get(n)) : d), write: (n, v) => m.set(n, structuredClone(v)) }) }; };
const collect = (svc, store, today = ON) => collectForPlan({ service: svc, store, merge: mergeObservations, fileIdOf, source: SOURCES.service, subject: "OET", today });

test("S · the plan asks AlmiWorld's keyword service: the subject for ALL locations first, then each country — with the plan's licence; the answers go into the ONE keyword database, each with its country and source", async () => {
  const { calls, svc } = standInService(), { store } = memStore();
  const r = await collect(svc, store);
  assert.equal(r.on, true); assert.equal(calls.filter((c) => c.path === "/v1/keywords").length, 19, "all locations + 18 countries");
  assert.equal(calls[0].location, "ALL", "all locations first"); assert.ok(calls.every((c) => c.licence), "the licence goes with every request");
  assert.equal(r.line, "AlmiWorld keyword service: on — 281 searches left this month");
  assert.equal(r.source, "Google Ads Keyword Planner, average monthly searches, Oct 2025 – Sep 2026");
  const db = store.load(), by = byLocationOf(db);
  assert.deepEqual(by.Pakistan.map((k) => [k.text, k.said]), [["oet", 50000], ["oet pakistan", 1002]], "Pakistan's own searches");
  assert.equal(itemsOf(db).find((x) => x.text === "oet").place, "All locations", "the global figure is the all-locations one, never a country's");
  /* a second count the same week asks NOTHING again — the figures are fresh */
  const again = await collect(svc, store);
  assert.equal(again.asked, 0); assert.equal(again.reused, 19); assert.equal(calls.filter((c) => c.path === "/v1/keywords").length, 19);
  assert.match(again.line, /^AlmiWorld keyword service: on — 281 searches left this month$/);
  /* after PLAN_REUSE_DAYS the countries are asked again */
  const later = await collect(svc, store, "2026-12-05"); assert.equal(later.asked, 19);
});

test("S · stopped plainly (the month used part-way) and OFF when unreachable or with no plan: the plan goes on with the client's own data — never an invented number", async () => {
  const half = standInService({ failAt: "IN" }), { store } = memStore();
  const r = await collect(half.svc, store); assert.equal(r.on, true); assert.match(r.line, /stopped after 2 searches: This month's searches are used\./);
  const off = standInService({ fail: "down" }), s2 = memStore();
  const o = await collect(off.svc, s2.store); assert.equal(o.on, false); assert.equal(o.line, SERVICE_OFF_LINE); assert.equal(s2.m.size, 0, "nothing written");
  const none = await collect(null, memStore().store); assert.equal(none.on, false); assert.match(none.line, /add your plan/);
  /* the proof: every location still fresh and the service down — the old line said "on"; now said plainly, with what the plan uses */
  const up = standInService(), s3 = memStore(); await collect(up.svc, s3.store);
  const down = standInService({ fail: "down" }), late = await collect(down.svc, s3.store);
  assert.equal(late.on, false); assert.equal(late.reused, 19); assert.match(late.line, /^AlmiWorld keyword service: not reachable just now — the plan uses the figures it gave within 30 days and your own data/);
  /* the proof: the app's keyword-service routes were missing from its route list (the screen got "not found" since RR-326) */
  assert.match(readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"), /\|keywords\\\/service\|keywords\\\/service\\\/usage\|/);
  assert.equal(serviceOnLine({ used: 3, limit: null }), "AlmiWorld keyword service: on — no monthly limit (owner)");
  assert.equal(sourceLine(null), "Google Ads Keyword Planner, average monthly searches"); assert.equal(PLAN_REUSE_DAYS, 30);
  /* the app's count shows the line among its sources; the keyword screen says "on — N searches left this month" */
  const MAIN = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  assert.match(MAIN, /sources\.push\(\{ kind: "AlmiWorld keyword service"/); assert.match(MAIN, /line: u\.ok \? `\$\{serviceOnLine\(u\)\}/);
  assert.ok(MAIN.indexOf("const svc = await serviceForPlan(id, subject)") < MAIN.indexOf("items.push(...phraseItems(id));"), "the service is asked BEFORE the database is read for the plan");
});

/* ── C · cities ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("C · the cities a venue page names come from a gazetteer, never from capital letters; a sub-test word is never a city; the operator when named", async () => {
  const g = new Map([["Pakistan", ["Lahore", "Karachi"]], ["India", ["Chennai", "Kollam", "Kottayam"]], ["United Kingdom", ["Reading", "Bristol"]]]);
  const t = "A new venue in Lahore will be run as below. The new venue in Kollam is managed by Invented Press Ltd. Invented Ed already manages test venues in Chennai and Kottayam. Practise Reading before the test venue day. Karachi is a big city.";
  const got = venueCitiesIn(t, { countries: ["Pakistan", "India", "United Kingdom"], gazetteer: g });
  assert.deepEqual(got.map((x) => [x.city, x.country, x.operator]), [["Lahore", "Pakistan", null], ["Kollam", "India", "Invented Press Ltd"], ["Chennai", "India", "Invented Ed"], ["Kottayam", "India", "Invented Ed"]]);
  assert.ok(!got.some((x) => x.city === "Reading"), "Reading is a sub-test word"); assert.ok(!got.some((x) => x.city === "Karachi"), "no venue in that sentence");
  const reader = { read: async (u) => ({ ok: true, url: u, title: "news", checkedOn: ON, text: u.endsWith("pakistan") ? "OET opens a test venue in Pakistan. The new venue in Lahore opens soon." : "Nothing here." }) };
  const v = await venueCountries({ urls: ["https://oet.example/post/new-venue-pakistan"], subject: "OET", reader, gazetteer: g });
  assert.deepEqual(v.cities.map((x) => `${x.city}, ${x.country}`), ["Lahore, Pakistan"]); assert.equal(v.cities[0].source.url, "https://oet.example/post/new-venue-pakistan");
  assert.equal((await venueCountries({ urls: ["https://oet.example/post/new-venue-pakistan"], subject: "OET", reader })).cities.length, 0, "no gazetteer, no city");
  const real = gazetteerOf(builtInList("universities").items); assert.ok(real.get("Pakistan").includes("Lahore") && real.get("India").includes("Chennai"));
});

/* ── K · the keyword database ────────────────────────────────────────────────────────────────────────────────────────────────── */
test("K · a keyword's global figure is never one country's; each country keeps its own newest figure", () => {
  let db = emptyDb();
  db = mergeObservations(db, { id: "f-pk", name: "pk", on: "2026-10-20", source: SOURCES.service, period: "p", location: "Pakistan" }, [{ text: "oet", said: 2400 }]).db;
  db = mergeObservations(db, { id: "f-all", name: "all", on: "2026-10-19", source: SOURCES.service, period: "p", location: "All locations" }, [{ text: "oet", said: 50000 }]).db;
  db = mergeObservations(db, { id: "f-pk2", name: "pk2", on: "2026-10-25", source: SOURCES.service, period: "p", location: "Pakistan" }, [{ text: "oet", said: 2900 }]).db;
  assert.equal(itemsOf(db)[0].volume, 50000, "the newer Pakistan figure does not replace the global one");
  assert.equal(byLocationOf(db).Pakistan[0].said, 2900); assert.equal(byLocationOf(db)["All locations"], undefined);
  /* two periods for one country: the newest figure wins, whichever was merged first */
  let two = mergeObservations(emptyDb(), { id: "f-new", name: "new", on: "2026-10-25", source: SOURCES.service, period: "p2", location: "Pakistan" }, [{ text: "oet", said: 3100 }]).db;
  two = mergeObservations(two, { id: "f-old", name: "old", on: "2026-09-10", source: SOURCES.service, period: "p1", location: "Pakistan" }, [{ text: "oet", said: 1900 }]).db;
  assert.equal(byLocationOf(two).Pakistan[0].said, 3100, "a country keeps its newest figure, never its oldest");
  const only = mergeObservations(emptyDb(), { id: "f", name: "f", on: ON, source: SOURCES.file, period: "p", location: null }, [{ text: "oet", said: 500 }]).db;
  assert.equal(itemsOf(only)[0].volume, 500, "a file that names no location is global");
});

/* ── L · the local families ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const sectionOf = (c) => { const f = feeInCurrency(FEE, c, RATES); return { country: c, fee: f.line, steps: f.steps ?? [], nearest: c === "Nepal" ? ["India"] : [] }; };
const regs = [{ title: "NMC page", body: "Invented Nursing Regulator (UK)", short: "INR", country: "United Kingdom", professions: ["nursing"], grade: { listening: "B", reading: "B", writing: "C+", speaking: "B" }, confirmed: true, claims: [{ claimId: "r1", fact: "scores", text: "Invented: B, B, C+, B.", link: "https://reg.example/uk", readOn: ON }] },
  { title: "AU page", body: "Invented Board (Australia)", country: "Australia", professions: ["nursing", "medicine"], grade: { listening: "B", reading: "B", writing: "B", speaking: "B" }, confirmed: false, claims: [{ claimId: "r2", fromList: true, text: "list", link: "https://list.example", readOn: ON }] }];
/* RR-328 · AlmiWorld's country facts (desktop/country-facts.mjs countryPacket — invented names, sites and addresses): Pakistan has every part
 * (its fee comes from the app's own rates); India only its councils for two professions and no question or rule */
const cfFact = (country, part, key, value, extra = {}) => ({ key, country, part, kind: part, value, sourceUrl: `https://${part}.example/${country.toLowerCase()}`, sourceTitle: `Invented ${part} page`, readOn: ON, status: "confirmed", by: "collector", aiWritten: false, proposedBy: "official", ...extra });
const CF_FACTS = [
  ...PROFS.map((p) => cfFact("Pakistan", "councils", `council|Pakistan|${p}`, { name: `Invented Council of ${p} (IC${p.slice(0, 2).toUpperCase()})`, website: `https://ic-${p.replace(/\W+/g, "")}.example`, address: "1 Invented Road, Islamabad 44000" }, { profession: p, sourceUrl: `https://ic-${p.replace(/\W+/g, "")}.example/contact` })),
  cfFact("Pakistan", "questions", "question|Pakistan|fees", { question: "oet fee in pakistan", keywords: ["oet fee in pakistan"], volume: 880, answer: "OET costs AUD 587 in Pakistan (OET's own page)." }),
  cfFact("Pakistan", "questions", "question|Pakistan|centres", { question: "oet centre lahore", keywords: ["oet centre lahore"], volume: 320, answer: "OET's own pages name a venue in Lahore." }, { aiWritten: true, proposedBy: "ai", sourceUrl: null }),
  cfFact("Pakistan", "questions", "question|Pakistan|unconfirmed", { question: "oet results pakistan", volume: 50, answer: "Results come in 9 days." }, { status: "unconfirmed" }),
  cfFact("Pakistan", "rules", "rule|Pakistan|good-standing|1", { rule: "The council issues a good-standing letter itself, on the applicant's request.", quote: "an invented quote of the page" }),
  /* the collector's confirmed copy of one of AlmiOET's records (the RR-328 proof listed it twice) */
  cfFact("Pakistan", "rules", "rule|Pakistan|attestation|2", { rule: ORIGIN.items.find((f) => f.country === "Pakistan" && f.fact === "attestation").text }),
  ...["nursing", "medicine"].map((p) => cfFact("India", "councils", `council|India|${p}`, { name: `Invented Indian Council of ${p}`, website: "https://in-council.example", address: "2 Invented Marg, New Delhi 110001" }, { profession: p })),
];
const CF = Object.fromEntries(["Pakistan", "India"].map((c) => [c, countryPacket(c, CF_FACTS, { professions: PROFS })]));
const L = (extra = {}) => localPages({ subject: "OET", reqCountries: ["United Kingdom", "Australia"], venues: VENUES, section: sectionOf, originFacts: ORIGIN, kwByCountry, regulator: regs, professions: PROFS, whereTitle: "Where to take OET", feeClaim: { claimId: "fee", fact: "fee", text: "fee", link: FEE.source.url, readOn: ON }, countryFacts: CF, profHubTitle: (p) => `OET for ${p === "nursing" ? "nurses" : p}: every country, its regulator and grades`, on: ON, ...extra });

test("L · RR-328: a destination country is its hub's section; an origin country is a page ONLY with all five parts — its fee in its money (with the bank and date), its questions answered, its centres, a council for every profession (name, website, address) and a rule of its own; a country partly filled is stopped with what it misses", () => {
  const x = L();
  assert.ok(x.sectionsOut.some((s) => s.name === "OET in United Kingdom" && /destination/.test(s.why)));
  assert.ok(!x.country.some((p) => p.country === "United Kingdom"));
  assert.deepEqual(x.country.map((p) => p.country), ["Pakistan"], "only Pakistan has all five parts");
  const pk = x.country.find((p) => p.country === "Pakistan");
  assert.equal(pk.title, "OET in Pakistan: test centres, the fee in PKR and the steps");
  assert.match(pk.feeLocal, /^AUD 587 ≈ PKR [\d,]+ — an estimate from the RBA rate of 2026-10-26 \(1 AUD = 0\.6600 USD\) and the SBP rate of 2026-10-26 \(1 USD = 280\.50 PKR\), not an official price$/);
  assert.equal(pk.councils.length, PROFS.length); assert.ok(pk.councils.every((c) => c.name && c.website && c.address && c.link));
  assert.deepEqual(pk.answered.map((q) => q.question).sort(), ["oet centre lahore", "oet fee in pakistan"], "an unconfirmed answer is never on a page");
  assert.ok(pk.rules.length >= 2); assert.deepEqual(pk.cities.map((c) => c.city), ["Lahore"], "its cities are mentioned inside the page");
  assert.equal(new Set(pk.rules.map((r) => r.text)).size, pk.rules.length, "a rule is listed once, however many sources hold it");
  assert.ok(pk.claims.every((c) => c.link && c.readOn), "every fact with its link and date");
  assert.ok(pk.claims.some((c) => c.fact === "rate" && c.link === "https://sbp.example/m2m"));
  assert.deepEqual(pk.destinations.map((d) => d.country), ["United Kingdom"], "the destination people from Pakistan search for");
  const stop = (c) => x.stopped.country.find((y) => y.country === c);
  assert.deepEqual(stop("Nepal").missing, ["fee", "questions", "councils"], "Nepal: at home with the nearest venue, and its rule from AlmiOET's record — the rest missing, never padded");
  assert.deepEqual(stop("India").missing, ["questions", "councils"], "India: its venue, its fee (the RBA), its rule from AlmiOET's record"); assert.match(stop("India").why, /2 of 12 whole/);
  /* the proof: the State Bank of Pakistan refused (403) and no other rate — no PKR figure, so Pakistan misses part 1 */
  const refused = L({ section: (c) => { const f = feeInCurrency(FEE, c, { ...RATES, banks: { PKR: { refused: "SBP: answered 403", source: "SBP", short: "SBP", link: "https://sbp.example" } } }); return { country: c, fee: f.line, steps: f.steps ?? [], nearest: [] }; } });
  assert.ok(!refused.country.some((p) => p.country === "Pakistan")); assert.ok(refused.stopped.country.find((y) => y.country === "Pakistan").missing.includes("fee"), "a US-dollar fallback is no fee in local money");
  const c = contentOf(pk, { subject: "OET", on: ON });
  assert.ok(c.answerWords >= 40 && c.answerWords <= 60, `${c.answerWords} words: ${c.answer}`); assert.ok(c.answerHasNumber);
  assert.match(c.answer, /Lahore/); assert.ok(c.table.length > 4 && c.steps.length >= 4 && c.checklist.length >= 3 && c.tip);
  assert.deepEqual(c.sections.map((s) => s.heading), ["What people in Pakistan ask", "Test centres", "The councils in Pakistan", "Rules of Pakistan's own"]);
  assert.ok(c.sections.find((s) => /councils/.test(s.heading)).lines.every((l) => l.link && l.on), "each council with its source and date");
  assert.ok(c.sections[0].lines.some((l) => /AI-written/.test(l.note ?? "")), "an AI-written answer says so");
});

test("L · RR-328: country × profession only where that profession's OWN council in that country is found AND its searches come from there; the grade table shows the destinations people there search for most, and links the full table", () => {
  const x = L();
  assert.deepEqual(x.countryprof.map((p) => `${p.profession} ${p.country}`).sort(), ["medicine Pakistan", "nursing India", "nursing Pakistan"]);
  assert.ok(x.stopped.countryprof.some((y) => y.country === "Pakistan" && y.profession === "pharmacy" && y.missing.join() === "searches"), "a council but no search: stopped, and why");
  assert.ok(x.stopped.countryprof.some((y) => y.country === "Nepal" && y.profession === "nursing" && y.missing.join() === "searches"), "its council record (NNC), but no search names nurses");
  assert.ok(x.stopped.countryprof.some((y) => y.country === "Nepal" && y.profession === "pharmacy" && y.missing.join() === "council,searches"));
  const n = x.countryprof.find((p) => p.country === "Pakistan" && p.profession === "nursing");
  assert.match(n.title, /^OET for nurses from Pakistan: ICNU, the grades abroad and the steps$/, "AlmiWorld's country facts first (the council read on its own page)");
  assert.deepEqual(n.destinations.map((d) => d.country), ["United Kingdom"], "only the destination searched from Pakistan — not Australia");
  assert.equal(n.fullTable, "OET for nurses: every country, its regulator and grades"); assert.ok(n.links.includes(n.fullTable));
  assert.deepEqual(n.searches.map((k) => k.text), ["oet for nurses in pakistan"], "only that profession's searches from that country");
  const c = contentOf(n, { subject: "OET", on: ON }); assert.ok(c.answerWords >= 40 && c.answerWords <= 60, c.answer); assert.equal(c.table[0][2], "Grade for nurses");
  assert.deepEqual(c.table.at(-1), ["Every destination", "2 in all", 'see "OET for nurses: every country, its regulator and grades"']);
  assert.deepEqual(PROFESSION_WORDS.nursing.slice(0, 2), ["nurse", "nurses"]); assert.equal(Object.keys(PROFESSION_WORDS).length, 12);
});

test("L · RR-328: NO city pages — a city the subject's own page names is mentioned inside its country page", () => {
  const x = L();
  assert.deepEqual(x.city, []); assert.equal(x.universe.city, 4);
  assert.deepEqual(x.country.find((p) => p.country === "Pakistan").cities.map((c) => c.city), ["Lahore"]);
});

/* ── P · the plan ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const ITEMS = [{ text: "where to take oet in pakistan", kind: "search", source: "invented", weight: 10 }, { text: "oet score for nurses uk", kind: "search", source: "invented", weight: 10 }];
const planOf = (extra = {}) => { const sorted = sortQuestions(ITEMS, "OET", { fullName: "Occupational English Test", regulators: REC.regulators.map(callNames) }); return planFromList({ subject: "OET", rec: REC, professions: PROFS, universities: builtInList("universities").items, venues: VENUES, fee: FEE, rates: RATES, groups: groupQuestions(sorted.kept), sorted, items: ITEMS, reads: {}, on: ON, languages: ["en"], councils: builtInList("origins"), kwByCountry, originFacts: ORIGIN, countryFacts: CF, service: { on: true, line: "AlmiWorld keyword service: on — 281 searches left this month" }, cta: { label: "Try a free OET practice test", href: "https://x.example/practice" }, ...extra }); };

test("P · RR-328: the plan counts by the owner's rules — the country pages with all five parts, country × profession by council and searches, no city pages; the tables say WHICH part each stopped country misses; a question about taking it in a country goes to that country's page; every local page within 3 clicks with 3+ links", () => {
  const p = planOf(), n = p.numbers;
  assert.equal(n.countryPages, 1); assert.ok(n.countryprofPages >= 2); assert.equal(n.cityPages, 0);
  assert.equal(n.countryUniverse + n.countryDestinations, 197, "every country is checked");
  assert.equal(n.total, n.regulatorPages + n.subtestPages + n.practicePages + n.uniPages + n.takingPages + n.topicPages + n.hubPages + n.languagePages + n.countryPages + n.countryprofPages + n.cityPages);
  for (const k of ["country", "countryprof", "city", "searches"]) assert.ok(p.tables[k]?.rows?.length, `the ${k} table`);
  const miss4 = p.tables.country.rows.find((r) => /^…missing part 4 · the council for each profession/.test(r.step));
  assert.ok(miss4.n >= 2 && miss4.left.some((x) => x.name === "Nepal" && /missing:/.test(x.why)) && miss4.left.some((x) => x.name === "India"), "the stopped countries, each with what it misses");
  assert.ok(!p.tables.country.rows.some((r) => /^Gate 2/.test(r.step)), "the five-part rule replaces gate 2 for country pages");
  assert.equal(p.tables.city.rows.at(-1).n, 0);
  assert.equal(p.tables.searches.rows[0].why, "AlmiWorld keyword service: on — 281 searches left this month");
  assert.ok(p.whyNotMore.lines.some((l) => /^Countries: 197 → \d+ destinations \(their hubs\) → \d+ checked part by part → 1 country pages with all five parts/.test(l)));
  assert.ok(p.whyNotMore.lines.some((l) => /^Cities: 4 named by OET's own venue pages → no pages/.test(l)));
  const pk = p.kinds.country.find((x) => x.country === "Pakistan");
  assert.ok(pk.questions.some((q) => q.question === "where to take oet in pakistan"), "the question lands on Pakistan's page, not on Where to take");
  const local = [...p.kinds.country, ...p.kinds.countryprof];
  assert.deepEqual(local.filter((x) => !x.depth || x.depth > 3).map((x) => x.title), []); assert.deepEqual(local.filter((x) => (x.links?.length ?? 0) < 3).map((x) => x.title), []);
  assert.ok(p.kinds.hub.some((h) => h.title === "OET by country: test centres, fees and the steps from home" && h.links.includes(pk.title)));
  /* a university page shows its country's searches and venue cities — as content, never as more "alike" data points */
  const u = p.kinds.university.find((x) => x.country === "India"); assert.ok(u, "an Indian university page");
  assert.ok(u.content.points.some((t) => /People in India search "oet india" 6,600 times a month/.test(t)));
  assert.ok(!u.dataPoints.some((d) => /search/i.test(d.label)), "searches are content, not data points");
  /* the RR-328 proof: a university's home council is its graduates' profession's — never the nursing council for pharmacists */
  for (const x of p.kinds.university.filter((y) => y.home.council)) assert.ok(x.professions.includes("nursing") || !/Nursing/.test(x.home.council.council), `${x.title}: ${x.home.council.council}`);
  assert.ok(p.localStopped.countryprof.some((y) => y.country === "Nepal" && y.profession === "nursing" && y.missing.join() === "searches"), "the plan says what each stopped page misses");
  /* without the facts, the service and the records: no local page is invented */
  const bare = planOf({ kwByCountry: {}, originFacts: null, countryFacts: {}, venues: { countries: [], home: null } });
  assert.equal(bare.numbers.countryPages + bare.numbers.countryprofPages + bare.numbers.cityPages, 0);
});

/* ── T · topics and rates ────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("T · re-marking is its own need (its own fee and window, from the subject's re-marking policy page); the Saudi riyal by SAMA's official peg", () => {
  assert.equal(classify("oet remarking fee").intent, "remark"); assert.equal(classify("oet results release").intent, "results");
  const f = subjectFactsOf([{ ok: true, url: "https://oet.example/remarking-policy", checkedOn: ON, text: "An invented page. The fee is AU$120 (Global) per sub-test. Requests must be made within 72 hours from when your results are released." }], "OET");
  assert.equal(f.remarkFee.text, "OET's own page: a re-mark costs AU$120 per sub-test."); assert.equal(f.remarkHours.text, "OET's own page: a re-mark must be asked for within 72 hours of the results' release.");
  assert.ok(SUBJECT_FACT_PAGES.test("https://oet.example/remarking-policy")); assert.deepEqual(FACTS_FOR.remark.slice(0, 2), ["remarkFee", "remarkHours"]);
  const sa = feeInCurrency(FEE, "Saudi Arabia", RATES);
  assert.match(sa.line, /^AUD 587 ≈ SAR [\d,]+ — an estimate from the RBA rate of 2026-10-26 \(1 AUD = 0\.6600 USD\) and the SAMA's official peg \(1 USD = 3\.75 SAR\), not an official price$/);
  assert.equal(PEGS.SAR.link, "https://www.sama.gov.sa/en-US/News/Pages/news-557.aspx");
});

/* ── O · the owner's page and the finder (site) ──────────────────────────────────────────────────────────────────────────────── */
test("O · an account not active yet is never \"Google's known fault\"; LICENCE_PUBLIC_KEY yes/no only; the finder's \"Brands and competitors\"", () => {
  const na = { code: "AUTHORIZATION_ERROR", reason: "ACTION_NOT_PERMITTED", message: "Authorization error: AUTH_ERROR_CUSTOMER_NOT_ACTIVE" };
  assert.equal(notActive(na), true); assert.equal(notActive({ reason: "CUSTOMER_NOT_ENABLED" }), true); assert.equal(notActive({ reason: "ACTION_NOT_PERMITTED", message: "x" }), false);
  assert.equal(ownerRefusal(na), NOT_ACTIVE_LINE); assert.doesNotMatch(NOT_ACTIVE_LINE, /known fault for/); assert.match(NOT_ACTIVE_LINE, /can take a few hours/);
  assert.match(ownerRefusal({ code: "AUTHORIZATION_ERROR", reason: "ACTION_NOT_PERMITTED" }), /known fault/); assert.equal(ownerRefusal({ code: "AUTHORIZATION_ERROR" }), plainError("AUTHORIZATION_ERROR"));
  assert.equal(publicKeyState({}), "missing"); assert.equal(publicKeyState({ LICENCE_PUBLIC_KEY: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" }), "not a public key");
  const page = (k) => P.ownerPage({ connected: true, licenceKey: k, usage: { day: ON, all: 0, collector: 0, finder: 0, owner: 0, app: 0, caps: { ceiling: 1, googleDaily: 1, collector: 1, finder: 1, app: 1 }, last: { ...na, at: `${ON}T10:00:00Z` } } });
  assert.match(page("missing"), /The app's keyword service is OFF: LICENCE_PUBLIC_KEY is missing in Vercel \(Production\)/); assert.match(page("set"), /LICENCE_PUBLIC_KEY is set/);
  assert.match(page("set"), /The Google Ads account is not active yet/); assert.doesNotMatch(page("set"), /Google names a known fault/);
  assert.deepEqual(["canva resume", "zety cv", "indeed jobs", "e2 oet", "benchmark oet", "kaplan oet", "oet fees"].map(groupOf), ["brands", "brands", "brands", "brands", "brands", "brands", "prices"]);
});

/* ── D · proof debt: two rules no earlier fixture reached alone (sabpd re-aimed limbs sab321 E2 and D5 were NOT RED) ─────────── */
test("D · with the same Keyword Planner range, the page searched from more countries comes first (not the one seen more); a refusing bank is named, never 'a rate of undefined'", () => {
  const pg = (title) => ({ title, kind: "topic", status: "demand", kp: { low: 50, high: 500 }, dataPoints: Array(10).fill({}) });
  const reach = (p) => (p.title === "A" ? { countries: 5, impressions: 10 } : { countries: 1, impressions: 1000 });
  assert.deepEqual(batchesOf([pg("B"), pg("A")], reach)[0], ["A", "B"], "countries first, then impressions");
  const line = feeInCurrency(FEE, "Pakistan", { ...RATES, banks: { PKR: { refused: "SBP: the page answered 403", source: "SBP", short: "SBP", link: "https://sbp.example" } } }).line;
  assert.match(line, /SBP: the page answered 403/); assert.doesNotMatch(line, /undefined/);
});
