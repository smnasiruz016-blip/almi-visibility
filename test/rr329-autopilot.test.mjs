/**
 * RR-329 · the collectors on autopilot for the owner's two months away (owner, 26 Oct 2026; rule log R4–R10 in _handoffs).
 *   A ONE priority queue for both collectors: products in his order, countries in his order (15 + 15, then the rest), a product's first 30
 *     finished before the next, the rest in the background (one in four); editable (move up); every location Google can target
 *   B Country Facts for EVERY product: each its own template (the five parts for the test products), one AI question per country, each fact
 *     confirmed on its official page; a body not found searched every day (R1) as background work
 *   C the cheapest model (Haiku 5.5 — in test/rr328-*), the spend per day and month, the ETA, "raise to $3 to finish by <date>"; an AlmiOET
 *     record whose page is gone hidden until confirmed again
 *   D the owner's own facts ("Add what I know": text, link, photo) — stored "owner", dated, shown first, never changed by the collector
 *   E the owner's phone: /owner and /owner/countries light, numbers first, heavy tables closed, one tap per fact
 *   F health: a collector failing 3 days in a row (or not running) → a red line with the reason and the fix; the database's size guarded
 * Every name, site, address and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { FIRST_15, NEXT_15, QUEUE_COUNTRIES, QUEUE_PRODUCTS, DEFAULT_QUEUE, queueOf, moveUp, orderWork, progressOf, etaOf, raiseAdvice, BACKGROUND_EVERY } from "../site/queue.mjs";
import { PRODUCT_FACTS, FACT_PRODUCTS, PART_INFO, searchedParts, bodyParts, ownerSite } from "../desktop/product-facts.mjs";
import { partsOf, productPartsOf, productCoverageOf, countryPacket, isQuestion, questionGroups, CF_PROFESSIONS } from "../desktop/country-facts.mjs";
import { cfMemoryStore, cfPgStore, SHOWN, PHOTO } from "../site/cf-store.mjs";
import { runCountryFacts, finishedIn, tasksOf, costKey } from "../site/cf-collector.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { runCollector, keepRows, COLLECTOR } from "../site/kw-collector.mjs";
import { recordRun, daysOf, redLine, weekOf, FIX, HEALTH } from "../site/health.mjs";
import { ownerStatus, queueNow, PRODUCT_NAMES } from "../site/owner-status.mjs";
import { kvStore } from "../site/limits.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { siteAds } from "../site/kw-google.mjs";
import { localPages, localContent } from "../desktop/local-pages.mjs";
import * as P from "../site/pages.mjs";
import { COUNTRIES } from "../desktop/world.mjs";

const ON = "2026-10-26";
const clockAt = (iso = `${ON}T10:00:00Z`) => { const c = { t: Date.parse(iso) }; c.now = () => c.t; c.sleep = async (ms) => { c.t += ms; }; return c; };
function fakeKv(clock) {
  const m = new Map(), live = (k) => { const e = m.get(k); if (e && e.until !== null && e.until <= clock.t) m.delete(k); return m.get(k); };
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && live(k)) return { result: null }; const ex = a.indexOf("EX"); m.set(k, { v: String(a[0]), until: ex > 0 ? clock.t + Number(a[ex + 1]) * 1000 : null }); return { result: "OK" }; }
    if (C === "GET") return { result: live(k)?.v ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 };
    if (C === "INCR" || C === "DECR") { const v = Number(live(k)?.v ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, { v: String(v), until: live(k)?.until ?? null }); return { result: v }; }
    if (C === "EXPIRE") { const e = live(k); if (e) e.until = clock.t + Number(a[0]) * 1000; return { result: e ? 1 : 0 }; }
    return { error: "ERR" }; }) });
  return { m, fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}
const ENV_AI = { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" };

/* ── A · the queue ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("A · RR-329 (rule R4): the owner's product order and country order — his first 15, his next 15, then every other country; every product key the seed list knows", () => {
  assert.deepEqual(QUEUE_COUNTRIES.slice(0, 15), [...FIRST_15]); assert.deepEqual(QUEUE_COUNTRIES.slice(15, 30), [...NEXT_15]);
  assert.deepEqual(FIRST_15.slice(0, 3), ["India", "Philippines", "Pakistan"]); assert.equal(NEXT_15.at(-1), "Iran");
  assert.equal(QUEUE_COUNTRIES.length, 197); assert.deepEqual([...QUEUE_COUNTRIES].sort(), [...COUNTRIES].sort(), "every country once");
  assert.deepEqual(QUEUE_COUNTRIES.slice(30, 33), ["Afghanistan", "Albania", "Algeria"], "then the rest, A–Z");
  assert.deepEqual(DEFAULT_QUEUE.products.slice(0, 12), ["oet", "visibility", "almiworld", "cv", "jobs", "salary", "study", "prep", "pte", "toefl", "det", "celpip"], "RR-333 D: AlmiVisibility second; RR-362 item 8: the owner's order");
  assert.deepEqual(QUEUE_PRODUCTS.filter((p) => p.tier === 5).map((p) => p.key), ["french", "goethe", "spanish", "italian", "portuguese", "dutch", "japanese", "korean", "danish", "norwegian", "swedish", "icelandic", "swiss"]);
  /* editable: his order first, a new product or country always there, an unknown one dropped */
  const q = queueOf({ products: ["cv", "nope", "oet", "cv"], countries: ["Kenya"] });
  assert.deepEqual(q.products.slice(0, 3), ["cv", "oet", "visibility"], "his order first, then the default (RR-333 D: AlmiVisibility second)"); assert.equal(q.products.length, DEFAULT_QUEUE.products.length); assert.equal(q.countries[0], "Kenya"); assert.equal(q.countries.length, 197);
  assert.deepEqual(moveUp(["a", "b", "c"], "c"), ["a", "c", "b"]); assert.deepEqual(moveUp(["a", "b"], "a"), ["a", "b"], "the first stays first");
});

test("A · RR-329: the order of work — a product's FIRST 30 before the next product's; its other countries and the daily re-searches in the background, one place in four; units of no product (categories) last", () => {
  const q = { products: ["oet", "cv"], countries: QUEUE_COUNTRIES }, unit = (product, country, extra = {}) => ({ id: `${product}|${country}`, product, country, ...extra });
  const units = [...QUEUE_COUNTRIES.map((c) => unit("cv", c)), ...QUEUE_COUNTRIES.map((c) => unit("oet", c)), unit("category:food", "India"), unit("oet", "Kenya", { background: true, id: "oet|Kenya|again" })];
  const o = orderWork(units, { queue: q }), ids = o.map((u) => `${u.product}|${u.country}`);
  assert.deepEqual(ids.slice(0, 3), ["oet|India", "oet|Philippines", "background" in o[2] ? "oet|Kenya" : "oet|Pakistan"].slice(0, 2).concat(ids[2]), "AlmiOET first, in the owner's order");
  assert.equal(ids[BACKGROUND_EVERY - 1], "oet|Kenya", "the daily re-search takes a fourth place");
  const firstOet = ids.filter((x) => x.startsWith("oet|") && QUEUE_COUNTRIES.slice(0, 30).includes(x.slice(4)));
  const lastOetFirst = ids.lastIndexOf(`oet|${QUEUE_COUNTRIES[29]}`), firstCv = ids.indexOf(`cv|${QUEUE_COUNTRIES[0]}`);
  assert.ok(lastOetFirst < firstCv, "AlmiCV starts after AlmiOET's first 30"); assert.ok(firstOet.length >= 30);
  const between = ids.slice(firstCv, ids.indexOf(`cv|${QUEUE_COUNTRIES[29]}`) + 1);
  assert.ok(between.filter((x) => x.startsWith("oet|")).length >= 7, "AlmiOET's other countries go on in the background while AlmiCV's first 30 are done");
  assert.equal(ids.at(-1), "category:food|India", "the categories last"); assert.equal(o.length, units.length);
  /* a product whose first 30 are all done has no front: its rest joins the background at once */
  const onlyRest = orderWork([unit("oet", "Algeria"), ...QUEUE_COUNTRIES.slice(0, 30).map((c) => unit("cv", c))], { queue: q });
  assert.equal(onlyRest[0].product, "cv"); assert.equal(onlyRest[BACKGROUND_EVERY - 1].country, "Algeria");
});

test("A + C · RR-329: progress and the ETA per product (the front gets three quarters of a day's budget); AlmiOET's first 30 over 3 weeks → \"raise to $3 to finish by <date>\"", () => {
  const done = new Set(["oet|India", "oet|Philippines"]), finished = (p, c) => done.has(`${p}|${c}`);
  assert.deepEqual(progressOf("oet", { finished }), { first: 30, firstDone: 2, all: 197, allDone: 2 });
  const eta = etaOf({ products: ["oet", "cv"], finished, perDayUsd: 2, costOf: (p) => (p === "oet" ? 2 : 0.12), today: ON });
  assert.equal(eta[0].product, "oet"); assert.equal(eta[0].left, 28); assert.equal(eta[0].days, Math.ceil((28 * 2) / 1.5)); assert.equal(eta[0].date, "2026-12-03");
  assert.ok(eta[1].days > eta[0].days, "AlmiCV after AlmiOET (cumulative)");
  const advice = raiseAdvice({ eta, perDayUsd: 2, today: ON });
  assert.equal(advice, `AlmiOET's first 30 countries need about 38 days at $2.00 a day — raise to $3 to finish by 2026-11-21 (COUNTRY_FACTS_AI_USD_PER_DAY in Vercel).`);
  assert.equal(raiseAdvice({ eta: etaOf({ products: ["oet"], finished, perDayUsd: 2, costOf: () => 0.25, today: ON }), perDayUsd: 2, today: ON }), null, "under 3 weeks: no advice");
  assert.equal(raiseAdvice({ eta, perDayUsd: 3, today: ON }), null, "already at $3");
  /* the page reads decide when they are slower than the budget — and the advice says so (a higher budget alone would not help) */
  const slow = etaOf({ products: ["oet"], finished, perDayUsd: 2, costOf: () => 0.25, readsPerDay: 20, readsOf: () => 18, today: ON });
  assert.deepEqual([slow[0].aiDays, slow[0].readDays, slow[0].days], [5, 34, 34]);
  assert.equal(raiseAdvice({ eta: slow, perDayUsd: 2, today: ON, readsPerDay: 20 }), "AlmiOET's first 30 countries need about 34 days — the daily page reads hold it back: raise COUNTRY_FACTS_READS_PER_DAY to 40 and the budget to $3 to finish by 2026-11-12 (both in Vercel).");
});

/* ── B · Country Facts for every product ─────────────────────────────────────────────────────────────────────────────────── */
test("B · RR-329 (rule R6): each product's own template — the five parts for the test products, its own parts for the others; questions in its own words; its own brand never skipped as a competitor", () => {
  for (const p of ["prep", "pte", "toefl", "det", "celpip", "french", "goethe", "japanese", "swiss"]) assert.deepEqual(PRODUCT_FACTS[p].parts, ["fee", "questions", "centres", "offices", "rules"], p);
  assert.deepEqual(PRODUCT_FACTS.oet.parts, ["fee", "questions", "centres", "councils", "rules"]);
  assert.deepEqual(PRODUCT_FACTS.cv.parts, ["questions", "cvNorms", "employment", "workRules"]); assert.deepEqual(PRODUCT_FACTS.study.parts, ["questions", "universities", "admission", "studentVisa", "scholarships"]);
  assert.deepEqual(PRODUCT_FACTS.salary.parts, ["questions", "minimumWage", "averageSalary", "tax", "currency"]); assert.deepEqual(PRODUCT_FACTS.jobs.parts, ["questions", "employment", "workPermit", "recognition"]);
  assert.deepEqual(bodyParts("study"), ["universities", "studentVisa"]); assert.deepEqual(searchedParts("salary"), ["minimumWage", "averageSalary", "tax"]);
  assert.ok(FACT_PRODUCTS.every((p) => PRODUCT_FACTS[p].parts.every((k) => PART_INFO[k])), "every part is defined");
  assert.ok(DEFAULT_QUEUE.products.filter((p) => p !== "visibility" && p !== "almiworld").every((p) => FACT_PRODUCTS.includes(p)), "every queued product has facts (AlmiVisibility and AlmiWorld: keywords and questions only)");
  assert.ok(ownerSite("det", "englishtest.duolingo.com") && ownerSite("prep", "www.ielts.org") && !ownerSite("prep", "ielts-blog.example"));
  const rows = [{ keyword: "duolingo english test fee", volume: 900 }, { keyword: "pearson pte fee", volume: 500 }, { keyword: "pte exam fee", volume: 300 }, { keyword: "duolingo app", volume: 9000 }];
  const skip = (own) => ({ test: (t) => /\b(duolingo|pearson)\b/.test(t) && !own.test(t) });
  assert.deepEqual(questionGroups(rows, { subject: PRODUCT_FACTS.det.subject, skip: skip(PRODUCT_FACTS.det.own) }).map((g) => [g.group, g.volume]), [["fees", 900]], "DET's own name is its subject, not a competitor");
  assert.deepEqual(questionGroups(rows, { subject: PRODUCT_FACTS.pte.subject, skip: skip(PRODUCT_FACTS.pte.own) }).map((g) => [g.group, g.volume]), [["fees", 800]]);
  assert.ok(isQuestion("how to apply for oet") && isQuestion("oet fee pakistan") && !isQuestion("oet"));
});

/* stand-in pages and AI for the other products */
const PAGES = {
  "https://www.pakistan.gov.pk/work/cv": { title: "Applying for a job", text: "A CV in Pakistan is usually two pages long and lists the applicant's education first, then experience." },
  "https://employment.example/about": { title: "About", text: "Invented National Employment Bureau lists vacancies across the country." },
  "https://www.pakistan.gov.pk/work/permits": { title: "Work permits", text: "Something else entirely." },
  /* a blog that names the body — readable, but not official: only the official-page rule can refuse it */
  "https://someones-blog.example/boards": { title: "Boards", text: "Invented Equivalence Board recognises degrees." },
};
function productAi({ recognition = false } = {}) {
  const calls = [];
  const ai = async ({ prompt, schema }) => {
    const country = /^Country: ([^.]+)\./.exec(prompt)?.[1]; calls.push({ country, prompt, kind: schema.properties.facts ? "facts" : "answers" });
    if (schema.properties.facts) {
      const parts = schema.properties.facts.items.properties.part.enum;
      const all = [{ part: "cvNorms", text: "A CV is two pages, education first.", name: "", nameType: "", website: "", quote: "A CV in Pakistan is usually two pages long and lists the applicant's education first", sourceUrl: "https://www.pakistan.gov.pk/work/cv" },
        { part: "employment", text: "The state's job board.", name: "Invented National Employment Bureau", nameType: "", website: "https://employment.example", quote: "", sourceUrl: "https://employment.example/about" },
        { part: "workRules", text: "A work permit is needed.", name: "", nameType: "", website: "", quote: "Every foreign worker must hold a work permit issued by the ministry before starting", sourceUrl: "https://www.pakistan.gov.pk/work/permits" },
        { part: "recognition", text: "Recognition body.", name: "Invented Equivalence Board", nameType: "board", website: "https://equivalence.example", quote: "", sourceUrl: recognition ? "https://equivalence.example/" : "https://someones-blog.example/boards" }];
      return { ok: true, usd: 0.06, searches: 6, data: { facts: all.filter((f) => parts.includes(f.part)) } };
    }
    return { ok: true, usd: 0.01, searches: 0, data: { answers: [...prompt.matchAll(/^- ([a-z ]+): /gm)].map((m) => ({ group: m[1], answer: "Write a short, clear CV and check the official job board." })) } };
  };
  return { ai, calls };
}
const reader = (pages = PAGES) => { let n = 0; return { read: async (u) => { n++; const p = pages[u]; return p ? { ok: true, url: u, title: p.title, h1: null, text: p.text, checkedOn: ON } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => n }; };
async function kwDb() { const s = memoryStore(); await s.saveFetch({ kind: "collector", seedKey: "seed:PK", location: "PK", language: "en", day: ON, at: `${ON}T01:00:00Z`, period: "2025-10-01..2026-09-30", ops: 1, rows: [["cv format for job", 900], ["how to write cv", 400], ["oet fee pakistan", 300], ["duolingo english test fee", 200]].map(([text, said]) => ({ text, said })) }); return s; }

test("B · RR-329: one (product, country) of another product — its questions from the keyword database in its own words, ONE AI question for its other parts; each fact confirmed on its official page (a body by its name, a statement by its quoted words); a body not found is searched again EVERY DAY (background), the names tried kept", async () => {
  const store = cfMemoryStore(), clock = clockAt(), A = productAi(), kw = await kwDb();
  const run = () => runCountryFacts({ store, kwStore: kw, reader: reader(), ai: A.ai, env: ENV_AI, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], products: ["cv", "jobs"] });
  const r = await run();
  assert.ok(r.done.includes("Pakistan · cv:questions") && r.done.includes("Pakistan · cv:facts"), r.done.join(", "));
  const cv = (await store.facts({ country: "Pakistan" })).filter((f) => f.product === "cv");
  const by = (part) => cv.find((f) => f.part === part);
  assert.equal(by("cvNorms").status, "confirmed"); assert.equal(by("employment").status, "confirmed"); assert.equal(by("employment").value.name, "Invented National Employment Bureau");
  assert.equal(by("workRules").status, "unconfirmed"); assert.match(by("workRules").why, /the quoted words are not on its source page/);
  assert.equal(by("questions").value.question, "how to write cv", "a search that asks (\"cv format for job\" asks nothing)"); assert.match(by("questions").value.label, /^general guidance \(no official page says it\)$/); // RR-334: every product's questions under AlmiOET's rules (was RR-329's "AI-written from the facts")
  assert.ok(cv.every((f) => f.key.startsWith("cv:")), "each product's keys of its own");
  const cvp = productPartsOf("cv", "Pakistan", cv, { template: PRODUCT_FACTS.cv }); assert.deepEqual(cvp.missing, ["workRules"], "an unconfirmed fact fills nothing");
  /* AlmiJob: its recognition body is on a blog — unconfirmed, the name kept as tried; searched again tomorrow, not today */
  const t1 = (await store.tasks()).get("Pakistan|jobs:facts");
  assert.equal(t1.state, "searching"); assert.deepEqual(t1.tried.recognition.names, ["Invented Equivalence Board"]); assert.ok(r.searching.includes("Pakistan · jobs:facts"));
  const calls1 = A.calls.length; await run(); assert.equal(A.calls.length, calls1, "the same day: not asked again");
  clock.t += 86400000; await run();
  const again = A.calls.slice(calls1).find((c) => c.kind === "facts" && /recognition/.test(c.prompt));
  assert.ok(again, "the next day, searched again"); assert.match(again.prompt, /Already tried and NOT confirmed on an official page .*recognition: Invented Equivalence Board/);
  assert.doesNotMatch(again.prompt, /- employment:/, "only the parts still missing are asked");
  assert.deepEqual(tasksOf("oet"), ["questions", "councils", "rules"]); assert.deepEqual(tasksOf("cv"), ["cv:questions", "cv:facts"]);
  const fin = finishedIn(await store.tasks()); assert.equal(fin("cv", "Pakistan"), true); assert.equal(fin("jobs", "Pakistan"), true, "tried once = finished for the queue; the daily search is background");
  /* AlmiSalary: its currency from ISO 4217, without the AI */
  await runCountryFacts({ store, kwStore: kw, reader: reader(), ai: A.ai, env: {}, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], products: ["salary"] });
  assert.equal((await store.fact("salary:currency|Pakistan|1")).value.code, "PKR");
  const cov = productCoverageOf("cv", await store.facts(), { countries: ["Pakistan", "India"], template: PRODUCT_FACTS.cv }); assert.deepEqual([cov.counts.byPart.cvNorms, cov.counts.byPart.workRules], [1, 0]);
  /* AlmiDET: "duolingo" is a competitor for the others — for AlmiDET it is its own name, and its searches are its questions */
  await runCountryFacts({ store, kwStore: kw, reader: reader(), ai: A.ai, env: ENV_AI, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], products: ["det"] });
  assert.equal((await store.fact("det:question|Pakistan|fees")).value.question, "duolingo english test fee");
});

test("B · RR-329: the collector follows the queue across products — AlmiOET's countries before AlmiCV's; the measured cost of a country is kept for the ETA", async () => {
  const clock = clockAt(), K = fakeKv(clock), store = cfMemoryStore(), A = productAi(), kw = await kwDb();
  const seen = []; const ai = async (q) => { seen.push(/^Country: ([^.]+)\./.exec(q.prompt)?.[1] ?? /people in ([A-Z][\w ]+) search/.exec(q.prompt)?.[1]); return A.ai(q); };
  const r = await runCountryFacts({ store, kwStore: kw, kv: K.kv, reader: reader(), ai, env: ENV_AI, now: clock.now, budgetMs: 1e9, countries: ["India", "Pakistan"], products: ["oet", "cv"], queue: { products: ["cv", "oet"], countries: QUEUE_COUNTRIES } });
  assert.deepEqual(r.finished.slice(0, 2), ["cv|India", "cv|Pakistan"], "the owner moved AlmiCV up: its countries first");
  assert.ok(r.finished.includes("oet|India")); const cost = JSON.parse(K.m.get(costKey("cv")).v); assert.ok(cost.usd > 0 && cost.n === 2);
});

/* ── C · gone records ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("C · RR-329 (rule R8): an AlmiOET record whose page is GONE (404) is stored so and hidden — the app does not list it — until a later read confirms it again", async () => {
  const store = cfMemoryStore(), clock = clockAt();
  /* Pakistan's PMDC good-standing record (AlmiOET's list) — its page answers 404 here */
  await runCountryFacts({ store, reader: reader({}), ai: async () => ({ ok: false, why: "no", usd: 0, searches: 0 }), env: {}, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], products: ["oet"] });
  const gone = (await store.facts({ country: "Pakistan" })).filter((f) => /^the page is gone/.test(f.why ?? ""));
  assert.ok(gone.length >= 1, "a record whose page is gone is said so"); assert.ok(gone.every((f) => f.status === "unconfirmed" && f.proposedBy === "almioet-record"));
  assert.match(gone[0].why, /^the page is gone \(it answered 404\) — hidden until it is read again and confirmed$/);
  const pk = countryPacket("Pakistan", await store.facts()); assert.ok(pk.gone.includes(gone[0].sourceUrl));
  /* the app: a record whose link is gone is not a rule of the page */
  const local = (items) => localPages({ subject: "OET", reqCountries: [], venues: { countries: [], cities: [], home: null }, section: (c) => ({ country: c, fee: null, steps: [], nearest: [] }), originFacts: { on: ON, items }, countryFacts: { Pakistan: pk }, professions: [], countries: ["Pakistan"], on: ON }).stopped.country.find((s) => s.country === "Pakistan");
  assert.ok(local([{ country: "Pakistan", fact: "goodStanding", text: "A gone rule.", link: gone[0].sourceUrl }]).missing.includes("rules"), "the gone record is no rule of the page");
  assert.ok(!local([{ country: "Pakistan", fact: "attestation", text: "A live rule.", link: "https://live.example/rule" }]).missing.includes("rules"), "control: a live record is a rule");
  /* read again, found → confirmed, no longer gone */
  const back = { [gone[0].sourceUrl]: { title: "Good standing", text: "Good standing certificate." } };
  clock.t += 31 * 86400000; await runCountryFacts({ store, reader: reader(back), ai: async () => ({ ok: false, why: "no", usd: 0, searches: 0 }), env: {}, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], products: ["oet"] });
  assert.ok(!countryPacket("Pakistan", await store.facts()).gone.includes(gone[0].sourceUrl), "confirmed again: shown again");
});

/* ── D · the owner's own facts ─────────────────────────────────────────────────────────────────────────────────────────────── */
test("D · RR-329 (rule R9): the owner's own fact fills its part first, is shown as AlmiWorld's own checked information, and the collector never changes it", async () => {
  const store = cfMemoryStore();
  await store.supply({ key: "own|Pakistan|fee|a1", product: "oet", country: "Pakistan", part: "fee", kind: "owner", value: { text: "At the Lahore centre the fee is paid as PKR 115,000 (seen 20 Nov).", on: "2026-11-20", label: "AlmiWorld's own checked information" }, readOn: "2026-11-20" }, { at: "2026-11-20T10:00:00Z" });
  const f = await store.fact("own|Pakistan|fee|a1"); assert.equal(f.status, "owner"); assert.equal(f.by, "owner"); assert.ok(SHOWN.includes("owner"));
  assert.equal(partsOf("Pakistan", await store.facts()).parts.fee.filled, true, "the owner's fee fills part 1");
  assert.deepEqual((await store.putFact({ ...f, status: "confirmed", value: { text: "x" }, proposedBy: "ai" }, { at: "2026-11-21T00:00:00Z" })), { saved: false, why: "the owner owner it" });
  const pk = countryPacket("Pakistan", await store.facts()); assert.equal(pk.owner.length, 1); assert.equal(pk.fee.status, "owner");
  const L = localPages({ subject: "OET", reqCountries: [], venues: { countries: [], cities: [], home: null }, section: (c) => ({ country: c, fee: null, steps: [], nearest: [] }), originFacts: null, countryFacts: { Pakistan: pk }, professions: [], countries: ["Pakistan"], on: ON });
  assert.ok(!(L.stopped.country.find((s) => s.country === "Pakistan")?.missing ?? []).includes("fee"), "the owner's fee is the page's fee");
  /* on the page: a section of AlmiWorld's own checks, first */
  const c = localContent({ kind: "country", country: "Pakistan", venue: false, cities: [], centres: { on: ON }, fee: "PKR 115,000", councils: [], rules: [], answered: [], destinations: [], nearest: ["India"], home: "At home", whereTitle: "Where to take OET", own: [{ part: "fee", text: "The fee is PKR 115,000 at the counter.", link: null, on: "2026-11-20" }] }, { subject: "OET", fit: (xs) => xs.filter(Boolean).join(" "), cta: null });
  assert.equal(c.sections[0].heading, "AlmiWorld's own checks"); assert.deepEqual(c.sections[0].lines[0], { text: "The fee is PKR 115,000 at the counter.", link: null, on: "2026-11-20", note: "AlmiWorld's own checked information" });
});

/* ── F · health ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("F · RR-329 (rule R10): 3 days in a row without progress and with a reason → a red line with the reason and the fix; no run for 3 days → said; a day with progress is a good day even when its budget ran out", async () => {
  const clock = clockAt(), K = fakeKv(clock), day = (n) => new Date(Date.parse(`${ON}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  for (const n of [1, 2, 3]) await recordRun(K.kv, "keywords", day(n), { progress: 0, code: "UNAUTHENTICATED", why: "The keyword finder's Google sign-in has ended — the owner signs in again." });
  const d = await daysOf(K.kv, "keywords", day(4), 4);
  const red = redLine("keywords", d); assert.equal(red.code, "UNAUTHENTICATED"); assert.match(red.line, /^The keyword collector has failed 3 days in a row — last reason: The keyword finder's Google sign-in has ended/); assert.equal(red.fix, FIX.UNAUTHENTICATED);
  assert.equal(redLine("keywords", [{ progress: 5 }, ...d.slice(1)]), null, "today made progress: no red line");
  assert.equal(redLine("keywords", [null, { progress: 3 }, d[1], d[2]]), null, "a good day among the 3 before today");
  for (const n of [1, 2, 3]) await recordRun(K.kv, "facts", day(n), { progress: 4, code: "AI_BUDGET", why: "Today's AI budget ($2.00) is used" });
  assert.equal(redLine("facts", await daysOf(K.kv, "facts", day(4), 4)), null, "the budget ran out after progress — a good day");
  const none = redLine("facts", [null, null, null, null]); assert.equal(none.code, "NO_RUN"); assert.match(none.line, /has not run for 3 days/); assert.match(none.fix, /Cron Jobs in Vercel/);
  assert.ok(["AI_KEY", "AI_BUDGET", "DB_FULL", "NOT_CONNECTED", "AUTHORIZATION_ERROR"].every((k) => FIX[k]));
  const w = weekOf({ keywords: [{ keywords: 400, progress: 2 }, null, { keywords: 100, progress: 1 }], facts: [{ facts: 9, aiUsd: 1.234, finished: ["oet|India"] }], waiting: 7, unconfirmed: 3, problems: [] });
  assert.deepEqual([w.keywords, w.requests, w.facts, w.finished, w.aiUsd, w.kwDays, w.waiting], [500, 3, 9, ["oet|India"], 1.23, 2, 7]);
});

test("F · RR-329: the keyword collector keeps each fetch's 300 most-searched and up to 100 questions; it stops BEFORE the database is full (95% of NEON_STORAGE_LIMIT_MB) and says so; the day is recorded", async () => {
  const rows = Array.from({ length: 900 }, (_, i) => ({ text: i % 3 ? `oet word ${i}` : `how to pass oet ${i}`, said: 1000 - i }));
  const kept = keepRows(rows); assert.equal(kept.length, 400); assert.equal(kept.filter((r) => /^how to/.test(r.text)).length, 100 + 100, "the questions in the top 300, and 100 more");
  assert.equal(keepRows(rows.slice(0, 50)).length, 50);
  const clock = clockAt(), K = fakeKv(clock), s = memoryStore({ sizeMb: 990 });
  const ads = { ideas: async () => { throw new Error("Google must not be asked"); } };
  const r = await runCollector({ store: s, ads, kv: K.kv, now: clock.now, budgetMs: 1e9, limitMb: 1024 });
  assert.equal(r.stoppedBy, "DB_FULL"); assert.match(r.why, /^The database holds 990 MB of its 1024 MB — the collector stopped before it is full\.$/);
  const [today] = await daysOf(K.kv, "keywords", ON, 1); assert.equal(today.lastCode, "DB_FULL"); assert.equal(today.sizeMb, 990);
  assert.equal(COLLECTOR.storageLimitMb, 10240, "RR-335: Neon's Launch plan — a 10 GB cost guard, no longer the free plan's 1 GB");
  /* a day on which Google answered nothing (every request skipped) is a failed day — never a silent one */
  const K2 = fakeKv(clock), s2 = memoryStore(); await s2.setSeedList("product:oet | AlmiOET | oet", `${ON}T00:00:00Z`);
  const busy = await runCollector({ store: s2, ads: { ideas: async () => ({ ok: false, code: "BUSY", why: "busy", ops: 1 }) }, kv: K2.kv, now: clock.now, budgetMs: 1e9 });
  assert.equal(busy.saved, 0); assert.ok(busy.skipped > 0);
  const [b] = await daysOf(K2.kv, "keywords", ON, 1); assert.equal(b.lastCode, "BUSY"); assert.match(b.lastWhy, /^Google did not answer any of \d+ requests/); assert.ok(FIX.BUSY);
  /* the AI key missing is recorded for the health check (the collector can then only wait) */
  const K3 = fakeKv(clock); await runCountryFacts({ store: cfMemoryStore(), kv: K3.kv, reader: reader({}), env: {}, now: clock.now, budgetMs: 1e9, countries: ["Chad"], products: ["cv"] });
  const [c] = await daysOf(K3.kv, "facts", ON, 1); assert.equal(c.lastCode, "AI_KEY"); assert.match(c.lastWhy, /ANTHROPIC_API_KEY is not set in Vercel/);
});

/* ── E · the owner's phone ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
const ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: "cron-secret-for-tests-1234", ...ENV_AI, COUNTRY_FACTS_AI_USD_PER_DAY: "2" };
async function site({ store = cfMemoryStore(), kw = null } = {}) {
  const clock = clockAt(), K = fakeKv(clock), A = productAi();
  const app = createApp({ mode: "public-lite", env: ENV, kvFetch: K.fetchImpl, kwStore: kw ?? (await kwDb()), cfStore: store, cfReader: reader(), cfAi: A.ai, now: clock.now });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, clock.t).split(";")[0];
  const req = async (p, { method = "GET", form = null, body = null, type = null, owner = true } = {}) => { const r = await fetch(base + p, { method, redirect: "manual", headers: { ...(owner ? { cookie } : {}), ...(form ? { "content-type": "application/x-www-form-urlencoded" } : type ? { "content-type": type } : {}) }, body: form ? new URLSearchParams(form).toString() : body ?? undefined }); return { status: r.status, text: (r.headers.get("content-type") ?? "").startsWith("image/") ? "" : await r.text(), bytes: (r.headers.get("content-type") ?? "").startsWith("image/") ? Buffer.from(await r.arrayBuffer()) : null, headers: r.headers }; };
  return { req, store, K, clock, close: () => new Promise((r) => srv.close(r)) };
}
const multipart = (fields, file = null) => { const b = "----av329"; const parts = Object.entries(fields).map(([k, v]) => `--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`); const head = Buffer.from(parts.join("")); const f = file ? Buffer.concat([Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="photo"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`), file.bytes, Buffer.from("\r\n")]) : Buffer.alloc(0); return { body: Buffer.concat([head, f, Buffer.from(`--${b}--\r\n`)]), type: `multipart/form-data; boundary=${b}` }; };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);

test("E + D · RR-329: /owner on a phone — the numbers first (This week, the queue's progress and ETA, the spend, the red line), the heavy tables closed; the queue moved up with one tap", async () => {
  const a = await site();
  try {
    for (const n of [1, 2, 3]) await recordRun(a.K.kv, "facts", new Date(Date.parse(`${ON}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10), { progress: 0, code: "AI_KEY", why: "ANTHROPIC_API_KEY is not set in Vercel" });
    const page = (await a.req("/owner")).text;
    assert.match(page, /<h1>Owner<\/h1>/); assert.match(page, /<h2>This week<\/h2>/); assert.match(page, /facts in your review queue \(Pakistan and India: \d+ · not verified on an official page: \d+, never shown\)/, "RR-332: only Pakistan, India and the unverified");
    assert.match(page, /class="red" role="alert"><b>The country-facts collector has failed 3 days in a row — last reason: ANTHROPIC_API_KEY is not set in Vercel<\/b><br>Fix: The AI key is missing or refused/);
    assert.match(page, /<h2>Country facts — the queue<\/h2><p class="big">AlmiOET: 0 of 30 first countries done \(all five parts\) · about \d+ days \(by 2026-\d\d-\d\d\)/);
    assert.match(page, /AI spend: today <b>\$0\.00<\/b> of \$2\.00 · this month <b>\$0\.00<\/b>/);
    assert.ok(page.indexOf("This week") < page.indexOf("<summary>Google and the keyword collector</summary>"), "numbers before the tables");
    assert.match(page, /<details><summary>Google and the keyword collector<\/summary>/, "closed until tapped"); assert.match(page, /<details id="queue"><summary>The queue — move a product or a country up<\/summary>/);
    assert.doesNotMatch(page, /sk-ant-test/, "a key is never shown");
    /* the queue: one tap moves AlmiCV above AlmiOET; both collectors read it */
    const moved = await a.req("/owner/queue", { method: "POST", form: { kind: "product", item: "cv" } }); assert.equal(moved.status, 303); assert.match(moved.headers.get("location"), /moved=cv#queue/);
    assert.deepEqual((await queueNow(a.K.kv)).products.slice(0, 4), ["oet", "visibility", "cv", "almiworld"], "one tap: one place up (RR-362: AlmiWorld is third by default)");
    assert.match((await a.req("/owner?moved=cv")).text, /<details id="queue" open>/);
    assert.equal((await a.req("/owner/queue", { method: "POST", form: { kind: "country", item: "Atlantis" } })).status, 400);
    assert.equal((await a.req("/owner/queue", { method: "POST", form: { kind: "product", item: "cv" }, owner: false })).status, 403);
    assert.match(PRODUCT_NAMES.prep, /IELTS/);
    /* the "$3" line stands on the page, in red, where he sees it first */
    const adv = P.ownerPage({ status: { red: [], queue: null, facts: [{ name: "AlmiOET", first: 30, firstDone: 0, left: 30, days: 40, date: "2026-12-05" }], advice: "Raise to $3 — a test line.", spend: { cap: 0.25, today: 0, month: 0 }, week: null, keywords: null, storage: null } });
    assert.match(adv, /<p class="red"><b>Raise to \$3 — a test line\.<\/b><\/p>/);
  } finally { await a.close(); }
});

test("E + D · RR-329: /owner/countries on a phone — one product at a time, the first 30 as a light list, the grid closed; a country with the \"Add what I know\" box (text, link, photo — stored as the owner's, dated, shown first); one tap to approve or reject", async () => {
  const a = await site();
  try {
    const list = (await a.req("/owner/countries")).text;
    /* RR-331: ONE table, open, every country in the queue's order — REPLACES the "first 30" list and the closed grid */
    assert.match(list, /<details open><summary>All 197 countries, in the queue's order \(tap a country\)<\/summary><div class="tablewrap"><table class="t"><tr><th>Country<\/th>.*?<\/tr><tr><td><a href="\/owner\/countries\?c=India">India<\/a>/s); assert.match(list, /<span class="chip"><b>AlmiOET<\/b><\/span>/); assert.match(list, /href="\/owner\/countries\?p=cv">AlmiCV<\/a>/);
    const cv = (await a.req("/owner/countries?p=cv&c=Pakistan")).text;
    assert.match(cv, /of 197 countries have all 4 parts/); assert.match(cv, /the CV norms there/);
    assert.match(cv, /<summary>Add what I know<\/summary><form method="post" action="\/owner\/countries\/know" enctype="multipart\/form-data">/); assert.match(cv, /capture="environment"/);
    /* the owner adds what he knows — with a photo */
    const m = multipart({ country: "Pakistan", product: "oet", part: "fee", text: "At the Lahore centre the fee is PKR 115,000.", link: "https://lahore-centre.example/fees" }, { name: "board.png", type: "image/png", bytes: PNG });
    const saved = await a.req("/owner/countries/know", { method: "POST", body: m.body, type: m.type });
    assert.equal(saved.status, 200); assert.match(saved.text, /Saved as your own information \(2026-10-26\) — it is shown first/);
    const own = (await a.store.facts({ country: "Pakistan" })).find((f) => f.status === "owner");
    assert.equal(own.value.text, "At the Lahore centre the fee is PKR 115,000."); assert.equal(own.value.link, "https://lahore-centre.example/fees"); assert.match(own.value.photo, /^[0-9a-f]{24}$/); assert.equal(own.value.on, ON);
    const ph = await a.req(`/owner/countries/photo?id=${own.value.photo}`); assert.equal(ph.status, 200); assert.equal(ph.headers.get("content-type"), "image/png"); assert.ok(ph.bytes.equals(PNG));
    assert.equal((await a.req(`/owner/countries/photo?id=${own.value.photo}`, { owner: false })).status, 403, "only the owner");
    const pk = (await a.req("/owner/countries?c=Pakistan")).text;
    assert.ok(pk.indexOf("yours, 2026-10-26") < pk.indexOf("<h3>The facts") + 400 && pk.includes(`/owner/countries/photo?id=${own.value.photo}`), "his fact first, with its photo");
    /* refused in plain words: a photo that is not one, no text, a link that is not a web address */
    const bad = multipart({ country: "Pakistan", product: "oet", part: "fee", text: "x y z" }, { name: "x.exe", type: "image/png", bytes: Buffer.from("MZ not a picture") });
    assert.match((await a.req("/owner/countries/know", { method: "POST", body: bad.body, type: bad.type })).text, /The photo must be a JPEG, PNG or WebP/);
    assert.match((await a.req("/owner/countries/know", { method: "POST", form: { country: "Pakistan", product: "oet", part: "fee", text: "" } })).text, /Write what you know/);
    assert.match((await a.req("/owner/countries/know", { method: "POST", form: { country: "Pakistan", product: "oet", part: "fee", text: "a fact", link: "javascript:alert(1)" } })).text, /The link must start with https:\/\//);
    assert.equal((await a.req("/owner/countries/know", { method: "POST", form: { country: "Pakistan", product: "oet", part: "fee", text: "a fact" }, owner: false })).status, 403);
    /* one tap per fact */
    await a.req("/owner/countries/run", { method: "POST" });
    const withFacts = (await a.req("/owner/countries?c=India")).text;
    assert.match(withFacts, /<form method="post" action="\/owner\/countries\/fact" class="row"><input type="hidden" name="key" value="[^"]+"><button class="pill" name="action" value="approve" type="submit">Approve<\/button> <button class="pill ghost" name="action" value="reject" type="submit">Reject<\/button><\/form>/);
  } finally { await a.close(); }
});

test("E · RR-329: the owner's status — progress per product for both collectors, the database's size and the day it would be full", async () => {
  const clock = clockAt(), K = fakeKv(clock), cf = cfMemoryStore(), db = memoryStore({ sizeMb: 300 });
  for (const [n, mb] of [[3, 150], [2, 200], [1, 250]]) await recordRun(K.kv, "keywords", new Date(Date.parse(`${ON}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10), { progress: 1000, keywords: 50000, sizeMb: mb });
  await recordRun(K.kv, "keywords", ON, { progress: 10, sizeMb: 300 });
  const s = await ownerStatus({ kv: K.kv, db, cf, env: { NEON_STORAGE_LIMIT_MB: "1024" }, now: clock.now }); // RR-335: the limit set, as Vercel sets it (the default is now 10 GB)
  assert.equal(s.storage.mb, 300); assert.equal(s.storage.limit, 1024); assert.equal(s.storage.growth, 50); assert.equal(s.storage.fullOn, "2026-11-08", "(972.8 − 300) / 50 a day = 13 days");
  assert.equal(s.keywords.products[0].product, "oet"); assert.equal(s.keywords.products[0].first, 30, "all locations and the 29 of the first 30 Google can target (not Iran)"); assert.equal(s.keywords.perDay, 1000); assert.equal(s.keywords.measured, true);
  assert.equal(s.facts[0].product, "oet"); assert.equal(s.facts[0].name, "AlmiOET"); assert.equal(s.facts.length, FACT_PRODUCTS.length);
  assert.deepEqual(s.red.map((r) => [r.collector, r.code]), [["facts", "NO_RUN"], ["dates", "NO_RUN"]], "the keyword collector is well; the country-facts and test-dates collectors never ran — said, never silent (RR-333: every collector has its alert)");
  assert.equal(s.week.keywords, 150000);
});

/* ── the store's new parts on real Postgres (a throwaway one, in its own schema) ─────────────────────────────────────────────── */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "";
const pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
const STORES = [["memory", async () => cfMemoryStore()], ...(pgOk ? [["postgres", async () => {
  const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default, url = `${PG_URL}${PG_URL.includes("?") ? "&" : "?"}options=-c%20search_path%3Drr329`;
  const p = new Pool({ connectionString: PG_URL }); await p.query("DROP SCHEMA IF EXISTS rr329 CASCADE"); await p.query("CREATE SCHEMA rr329"); await p.end();
  return cfPgStore({ url, Pool });
}]] : [])];
for (const [name, make] of STORES) {
  test(`D + C · RR-329 the store (${name}): a product of each fact; the owner's own fact (by "owner", never changed by the collector); a photo; the spend of every day since a date`, async () => {
    const s = await make();
    try {
      await s.putFact({ key: "cv:cvNorms|Pakistan|1", product: "cv", country: "Pakistan", part: "cvNorms", kind: "statement", value: { text: "Two pages." }, status: "confirmed", proposedBy: "ai" }, { at: `${ON}T01:00:00Z` });
      assert.equal((await s.fact("cv:cvNorms|Pakistan|1")).product, "cv"); assert.equal((await s.fact("cv:cvNorms|Pakistan|1")).by, "collector");
      await s.supply({ key: "own|Pakistan|rules|x", product: "oet", country: "Pakistan", part: "rules", kind: "owner", value: { text: "My rule.", on: ON } }, { at: `${ON}T02:00:00Z` });
      const o = await s.fact("own|Pakistan|rules|x"); assert.deepEqual([o.status, o.by, o.product], ["owner", "owner", "oet"]);
      assert.equal((await s.putFact({ ...o, status: "confirmed", proposedBy: "ai", value: { text: "x" } }, { at: `${ON}T03:00:00Z` })).saved, false);
      await s.putPhoto({ id: "a".repeat(24), country: "Pakistan", type: "image/png", bytes: PNG, at: `${ON}T02:00:00Z` }); assert.ok((await s.photo("a".repeat(24))).bytes.equals(PNG)); assert.equal(await s.photo("b".repeat(24)), null);
      await s.addSpend("2026-10-01", { aiUsd: 1.5 }); await s.addSpend(ON, { aiUsd: 0.25, reads: 3 });
      assert.deepEqual((await s.spendSince("2026-10-01")).map((d) => [d.day, d.aiUsd]), [["2026-10-01", 1.5], [ON, 0.25]]);
      assert.equal(PHOTO.maxBytes, 1_500_000);
    } finally { await s.close(); }
  });
}
