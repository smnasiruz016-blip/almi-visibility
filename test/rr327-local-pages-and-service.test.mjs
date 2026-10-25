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
import { dataPointsOf, contentOf, GATES } from "../desktop/pseo.mjs";
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
const KW = { Pakistan: [["oet in pakistan", 2400], ["oet fee in pakistan", 880], ["oet for nurses in pakistan", 590], ["oet centre lahore", 320], ["oet lahore", 210], ["pnmc oet", 90], ["oet doctors pakistan", 70]], India: [["oet india", 6600], ["oet exam fees in india", 1900], ["oet for nurses india", 720], ["oet chennai", 480], ["oet kochi", 390], ["oet kochi centre", 140], ["oet coaching kochi", 110], ["oet kochi date", 90]], Nepal: [["oet nepal", 260]] };
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
const L = () => localPages({ subject: "OET", reqCountries: ["United Kingdom", "Australia"], venues: VENUES, section: sectionOf, originFacts: ORIGIN, kwByCountry, regulator: regs, professions: PROFS, universities: builtInList("universities").items.filter((u) => (u.fields ?? []).some((f) => /nurs|medic/i.test(f))), whereTitle: "Where to take OET", feeClaim: { claimId: "fee", fact: "fee", text: "fee", link: FEE.source.url, readOn: ON }, on: ON });

test("L · a destination country is its hub's section, never a second page; an origin country's page holds ITS venue, cities, fee in its money (with the bank and date), home councils, attestation and searches", () => {
  const x = L();
  assert.ok(x.sectionsOut.some((s) => s.name === "OET in United Kingdom" && /destination/.test(s.why)));
  assert.ok(!x.country.some((p) => p.country === "United Kingdom"));
  const pk = x.country.find((p) => p.country === "Pakistan");
  assert.equal(pk.title, "OET in Pakistan: test centres, the fee in PKR and the steps");
  assert.match(pk.feeLocal, /^AUD 587 ≈ PKR [\d,]+ — an estimate from the RBA rate of 2026-10-26 \(1 AUD = 0\.6600 USD\) and the SBP rate of 2026-10-26 \(1 USD = 280\.50 PKR\), not an official price$/);
  assert.deepEqual(pk.councils.map((c) => [c.profession, c.short]), [["nursing", "PNMC"], ["medicine", "PMDC"]]);
  assert.ok(pk.claims.every((c) => c.link && c.readOn), "every fact with its link and date");
  assert.ok(pk.claims.some((c) => c.fact === "rate" && c.link === "https://sbp.example/m2m"));
  assert.equal(pk.searches[0].text, "oet in pakistan"); assert.equal(pk.questions[0].sources[0].kind, "tool");
  const dp = dataPointsOf(pk); assert.ok(dp.length >= GATES.minData, `${dp.length} data points`);
  assert.ok(dp.some((d) => d.label === "Venue city" && /Lahore \(An Invented Operator\)/.test(d.value)));
  /* Nepal: no venue, no rate for its money read, three record facts → fewer than 8: a section, said by the gates (P) */
  /* the proof: the State Bank of Pakistan refused (403) — no PKR figure, so the title does not promise one */
  const refused = localPages({ subject: "OET", reqCountries: [], venues: VENUES, section: (c) => { const f = feeInCurrency(FEE, c, { ...RATES, banks: { PKR: { refused: "SBP: answered 403", source: "SBP", short: "SBP", link: "https://sbp.example" } } }); return { country: c, fee: f.line, steps: f.steps ?? [], nearest: [] }; }, originFacts: ORIGIN, kwByCountry, regulator: regs, professions: PROFS, whereTitle: "Where to take OET", on: ON });
  assert.equal(refused.country.find((p) => p.country === "Pakistan").title, "OET in Pakistan: test centres, the fee and the steps");
  assert.equal(refused.city.find((p) => p.city === "Lahore").title, "OET centre Lahore: the venue, the fee and how to book");
  assert.equal(refused.country.find((p) => p.country === "Pakistan").feeLocal, null, "a US-dollar fallback is no fee in local money");
  for (const p of [refused.city.find((x) => x.city === "Lahore"), refused.countryprof.find((x) => x.country === "Pakistan")]) assert.ok(!dataPointsOf(p).some((d) => d.label === "The fee in local money"), `${p.title}: the fallback counted as a local fee`);
  const np = x.country.find((p) => p.country === "Nepal"); assert.equal(np.venue, false); assert.equal(np.feeLocal, null); assert.match(np.title, /taking it at home/);
  assert.ok(dataPointsOf(np).length < GATES.minData);
  const c = contentOf(pk, { subject: "OET", on: ON });
  assert.ok(c.answerWords >= 40 && c.answerWords <= 60, `${c.answerWords} words: ${c.answer}`); assert.ok(c.answerHasNumber);
  assert.match(c.answer, /Lahore/); assert.ok(c.table.length > 4 && c.steps.length >= 4 && c.checklist.length >= 3 && c.tip);
});

test("L · country × profession only where the profession has its OWN home council in AlmiOET's records (nurses, doctors) — its council, good standing, and each destination's grade for it", () => {
  const x = L();
  assert.deepEqual(x.countryprof.filter((p) => p.country === "Pakistan").map((p) => p.profession).sort(), ["medicine", "nursing"]);
  assert.ok(!x.countryprof.some((p) => p.profession === "pharmacy"), "no council record, no page");
  const n = x.countryprof.find((p) => p.country === "Pakistan" && p.profession === "nursing");
  assert.equal(n.title, "OET for nurses from Pakistan: PNMC, the grades abroad and the steps");
  assert.deepEqual(n.destinations.map((d) => [d.country, d.grade]), [["United Kingdom", "Listening B · Reading B · Writing C+ · Speaking B"], ["Australia", "B in each sub-test"]].map(([c, g]) => [c, n.destinations.find((d) => d.country === c).grade]));
  assert.deepEqual(n.searches.map((k) => k.text), ["oet for nurses in pakistan"], "only that profession's searches from that country");
  assert.ok(n.links.includes("OET in Pakistan: test centres, the fee in PKR and the steps"));
  assert.ok(dataPointsOf(n).length >= GATES.minData);
  const c = contentOf(n, { subject: "OET", on: ON }); assert.ok(c.answerWords >= 40 && c.answerWords <= 60, c.answer); assert.equal(c.table[0][2], "Grade for nurses");
  assert.deepEqual(PROFESSION_WORDS.nursing.slice(0, 2), ["nurse", "nurses"]);
});

test("L · a city only where the subject's own page names a venue; a city with too little of its own stays a section of its country's page (P)", () => {
  const x = L();
  assert.deepEqual(x.city.map((p) => p.city).sort(), ["Chennai", "Kochi", "Lahore"], "Bristol: a destination's venue is its hub's line");
  const ko = x.city.find((p) => p.city === "Kochi");
  assert.equal(ko.title, "OET centre Kochi: the venue, the fee in INR and how to book"); assert.deepEqual(ko.others, ["Chennai"]);
  assert.deepEqual(ko.searches.map((k) => k.text).sort(), ["oet coaching kochi", "oet kochi", "oet kochi centre", "oet kochi date"]);
  const c = contentOf(ko, { subject: "OET", on: ON }); assert.match(c.answer, /Another Operator/); assert.ok(c.answerHasNumber);
});

/* ── P · the plan ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const ITEMS = [{ text: "where to take oet in pakistan", kind: "search", source: "invented", weight: 10 }, { text: "oet score for nurses uk", kind: "search", source: "invented", weight: 10 }];
const planOf = (extra = {}) => { const sorted = sortQuestions(ITEMS, "OET", { fullName: "Occupational English Test", regulators: REC.regulators.map(callNames) }); return planFromList({ subject: "OET", rec: REC, professions: PROFS, universities: builtInList("universities").items, venues: VENUES, fee: FEE, rates: RATES, groups: groupQuestions(sorted.kept), sorted, items: ITEMS, reads: {}, on: ON, languages: ["en"], councils: builtInList("origins"), kwByCountry, originFacts: ORIGIN, service: { on: true, line: "AlmiWorld keyword service: on — 281 searches left this month" }, cta: { label: "Try a free OET practice test", href: "https://x.example/practice" }, ...extra }); };

test("P · the plan: the local families through the gates, in the ledger, the total, their tables and \"why not more\"; a question about taking it in a country goes to that country's page; every local page within 3 clicks with 3+ links", () => {
  const p = planOf(), n = p.numbers;
  assert.ok(n.countryPages >= 2 && n.countryprofPages >= 2, JSON.stringify({ c: n.countryPages, cp: n.countryprofPages, city: n.cityPages }));
  assert.equal(n.total, n.regulatorPages + n.subtestPages + n.practicePages + n.uniPages + n.takingPages + n.topicPages + n.hubPages + n.languagePages + n.countryPages + n.countryprofPages + n.cityPages);
  const g = p.gates;
  assert.ok(g.country.sections.some((s) => /^OET in Nepal/.test(s.name) && /fewer than 8/.test(s.why) && /Where to take OET/.test(s.why)), "Nepal: a section of Where to take");
  assert.ok(g.city.sections.some((s) => /^OET centre Lahore/.test(s.name) && /a section of OET in Pakistan/.test(s.why)), "Lahore: a section of Pakistan's page");
  for (const k of ["country", "countryprof", "city", "searches"]) assert.ok(p.tables[k]?.rows?.length, `the ${k} table`);
  assert.equal(p.tables.searches.rows[0].why, "AlmiWorld keyword service: on — 281 searches left this month");
  assert.ok(p.whyNotMore.lines.some((l) => /^Countries: \d+ with a venue, a city, a home council or searches from them → \d+ country pages/.test(l)));
  const pk = p.kinds.country.find((x) => x.country === "Pakistan");
  assert.ok(pk.questions.some((q) => q.question === "where to take oet in pakistan"), "the question lands on Pakistan's page, not on Where to take");
  const local = [...p.kinds.country, ...p.kinds.countryprof, ...p.kinds.city];
  assert.deepEqual(local.filter((x) => !x.depth || x.depth > 3).map((x) => x.title), []); assert.deepEqual(local.filter((x) => (x.links?.length ?? 0) < 3).map((x) => x.title), []);
  assert.ok(p.kinds.hub.some((h) => h.title === "OET by country: test centres, fees and the steps from home" && h.links.includes(pk.title)));
  /* a university page shows its country's searches and venue cities — as content, never as more "alike" data points */
  const u = p.kinds.university.find((x) => x.country === "India"); assert.ok(u, "an Indian university page");
  assert.ok(u.content.points.some((t) => /OET's own pages name a venue in Chennai, Kochi \(India\)/.test(t)));
  assert.ok(u.content.points.some((t) => /People in India search "oet india" 6,600 times a month/.test(t)));
  assert.ok(!u.dataPoints.some((d) => /search/i.test(d.label)), "searches are content, not data points");
  /* without the service and the records: no local page is invented */
  const bare = planOf({ kwByCountry: {}, originFacts: null, venues: { countries: [], home: null } });
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
