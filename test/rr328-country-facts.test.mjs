/**
 * RR-328 · the owner's five-part rule for country pages, the Country Facts collector (197 countries × 12 professions), any-currency conversion,
 * and the app's count by the new rules.
 *   A the fee in every country's money: the official rates first (RBA, a peg, a central bank of the last 7 days), else the open daily rate —
 *     "about <amount> <currency>", its source and date; ISO 4217's currency for each of the 197 countries
 *   B the five parts and the collector's own checks (the name, the address, the quoted words on the source page)
 *   C the database (memory; and real Postgres when ALMIV_TEST_PG_URL names a throwaway one): the owner's word wins, history kept
 *   D the collector: a run for Pakistan, India and the Philippines with a stand-in AI and stand-in pages — confirmed only when found on its
 *     page, unconfirmed never shown, finished work not done again, the daily caps, the owner's edit kept
 *   E the website: /owner/countries (grid, facts, approve/edit/reject, a run), the app's /v1/countries/facts (licence; shown facts only), the cron
 *   F the app: the country facts for its plan, once a day, the last answer when the service is down
 *   G re-marking: a section of the results page, each line with its source
 * Every name, site, address and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { pathToFileURL } from "node:url";
import { feeInCurrency, openRates, localShown, CURRENCY_OF, CURRENCY_LIST, OPEN_RATES } from "../desktop/rates.mjs";
import { COUNTRIES } from "../desktop/world.mjs";
import { PARTS, CF_PROFESSIONS, NAME_TYPES, nameTypeOf, partsOf, coverageOf, countryPacket, councilWhole, nameOnPage, addressOnPage, quoteOnPage, questionGroups, governmentHost, numbersOf } from "../desktop/country-facts.mjs";
import { cfMemoryStore, cfPgStore, SHOWN } from "../site/cf-store.mjs";
import { runCountryFacts, CF_ORDER, CF_COLLECTOR, professionKey } from "../site/cf-collector.mjs";
import { costOf, CF_AI, aiConfigured, askAi, councilQuestion } from "../site/cf-ai.mjs";
import { memoryStore, pgStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { BRANDS } from "../site/kw-finder.mjs";
import { licenceBytes, OWNER } from "../desktop/licence.mjs";
import { keywordService, licenceHeaderOf, countryFactsForPlan, LICENCE_HEADER } from "../desktop/keyword-service.mjs";
import { richPage } from "../desktop/seo-pages.mjs";
import { contentOf } from "../desktop/pseo.mjs";

const ON = "2026-10-26", T0 = Date.parse(`${ON}T10:00:00Z`);
const FEE = { ok: true, amount: 587, currency: "AUD", said: "AUD $587", source: { url: "https://oet.example/test/oet-test-at-home" }, checkedOn: ON };
const OPEN_JSON = { result: "success", base_code: "AUD", time_last_update_unix: Date.parse(`${ON}T00:02:31Z`) / 1000, rates: { PKR: 194.548107, INR: 66.754051, NGN: 945.911161, PHP: 44.705298, KES: 91.172109, USD: 0.702704, EGP: 38.851763, BDT: 86.976473, NPR: 106.805511 } };

/* ── A · the fee in every country's money ───────────────────────────────────────────────────────────────────────────────────── */
test("A · RR-328: PKR, INR, NGN, PHP and KES — the official rate where it works (RBA), else the open daily rate: \"about <amount> <currency>\", its source and its date; a central bank that refuses never leaves a country without its figure", () => {
  const open = openRates(OPEN_JSON);
  assert.deepEqual(Object.keys(open), ["date", "rates"]); assert.equal(open.date, ON);
  const rates = { rba: { date: ON, rates: { USD: "0.6600", INR: "55.10", PHP: "37.20" } }, banks: { PKR: { refused: "State Bank of Pakistan — M2M revaluation rates: the page answered 403 (checked 2026-10-26)", source: "SBP", short: "SBP", link: "https://sbp.example" }, KES: { rate: "129.10", date: "2024-01-03", link: "https://cbk.example", source: "Central Bank of Kenya — daily KES exchange rates", short: "CBK" } }, open, on: ON };
  const pk = feeInCurrency(FEE, "Pakistan", rates);
  assert.equal(pk.line, "AUD 587 — about 114,200 PKR (ExchangeRate-API's open rate of 2026-10-26: 1 AUD = 194.548107 PKR; Rates By Exchange Rate API), not an official price");
  assert.equal(pk.amount, 114200); assert.equal(pk.about, true); assert.match(pk.official, /answered 403/); assert.equal(pk.steps[0].link, "https://www.exchangerate-api.com");
  assert.match(feeInCurrency(FEE, "India", rates).line, /^AUD 587 ≈ INR 32,344 — an estimate from the RBA rate of 2026-10-26/, "the RBA's own rate where it works");
  assert.match(feeInCurrency(FEE, "Philippines", rates).line, /^AUD 587 ≈ PHP 21,836 — an estimate from the RBA rate/);
  assert.match(feeInCurrency(FEE, "Nigeria", rates).line, /^AUD 587 — about 555,250 NGN \(ExchangeRate-API's open rate of 2026-10-26: 1 AUD = 945\.911161 NGN; Rates By Exchange Rate API\)/);
  assert.match(feeInCurrency(FEE, "Kenya", rates).line, /^AUD 587 — about 53,518 KES \(ExchangeRate-API's open rate/, "a central bank's rate older than 7 days: the open rate");
  for (const c of ["Pakistan", "India", "Nigeria", "Philippines", "Kenya"]) assert.ok(localShown(feeInCurrency(FEE, c, rates).line), c);
  /* no open rate (or an old one): the RR-322 fallback stays — no figure in its money, never a guessed one */
  const none = feeInCurrency(FEE, "Pakistan", { ...rates, open: null }); assert.match(none.line, /≈ USD \d+ .* so no PKR figure is shown yet/); assert.equal(localShown(none.line), false);
  assert.equal(localShown(feeInCurrency(FEE, "Nigeria", { ...rates, open: { date: "2026-10-10", rates: open.rates } }).line), false, "a rate older than 7 days is not used");
  assert.equal(openRates({ ...OPEN_JSON, base_code: "USD" }), null); assert.equal(openRates("not json"), null);
  /* the proof's finding: a US-dollar country's own estimate IS its money; the RBA fallback is not; a country of the fee's own currency needs none */
  assert.ok(localShown(feeInCurrency(FEE, "Ecuador", rates).line), feeInCurrency(FEE, "Ecuador", rates).line); assert.match(feeInCurrency(FEE, "Ecuador", rates).line, /^AUD 587 ≈ USD 387 — an estimate from the RBA rate/);
  assert.ok(localShown(feeInCurrency(FEE, "Kiribati", rates).line)); assert.equal(feeInCurrency(FEE, "Kiribati", rates).line, "AUD 587");
  assert.equal(OPEN_RATES.url, "https://open.er-api.com/v6/latest/AUD");
});

test("A · RR-328: every one of AlmiWorld's 197 countries has its ISO 4217 currency (Palestine: none, said so); the earlier hand list agrees", () => {
  assert.equal(COUNTRIES.length, 197);
  assert.deepEqual(COUNTRIES.filter((c) => !CURRENCY_OF[c]), ["Palestine"]);
  assert.match(feeInCurrency(FEE, "Palestine", { rba: { date: ON, rates: { USD: "0.66" } }, banks: {}, on: ON }).line, /ISO 4217 lists no single currency for Palestine/);
  for (const [c, cur] of Object.entries(CURRENCY_LIST.hand)) assert.equal(CURRENCY_OF[c], cur, c);
  assert.deepEqual(["Pakistan", "India", "Nigeria", "Philippines", "Kenya", "Egypt", "Bangladesh", "Nepal", "Bhutan"].map((c) => CURRENCY_OF[c]), ["PKR", "INR", "NGN", "PHP", "KES", "EGP", "BDT", "NPR", "BTN"]);
  assert.match(CURRENCY_LIST.url, /^https:\/\/www\.six-group\.com\//);
});

/* ── B · the five parts and the collector's checks ──────────────────────────────────────────────────────────────────────────── */
const fact = (country, part, key, value, extra = {}) => ({ key, country, profession: null, part, kind: part, value, sourceUrl: `https://${part}.example/${country.toLowerCase().replace(/\W+/g, "-")}`, sourceTitle: `Invented ${part}`, readOn: ON, status: "confirmed", by: "collector", aiWritten: false, proposedBy: "official", why: null, ...extra });
const wholeCouncils = (country) => CF_PROFESSIONS.map((p) => fact(country, "councils", `council|${country}|${p}`, { name: `Invented Council of ${p}`, website: "https://council.example.org", address: "1 Invented Road, Islamabad 44000", siteCheck: "read" /* RR-343: its website read */ }, { profession: p }));
const FULL = (c) => [fact(c, "fee", `fee|${c}`, { official: "AUD 587", line: "AUD 587 — about 114,200 PKR (…)", local: true }), fact(c, "questions", `question|${c}|fees`, { question: "oet fee", answer: "OET costs …" }), fact(c, "centres", `centres|${c}`, { venue: true }), ...wholeCouncils(c), fact(c, "rules", `rule|${c}|x|1`, { rule: "A rule." })];

test("B · RR-328: a country has all five parts only when each is filled by a fact a page may show; councils are whole only with name, website and address for EVERY profession; the grid counts", () => {
  const p = partsOf("Pakistan", FULL("Pakistan")); assert.equal(p.complete, true); assert.deepEqual(p.missing, []);
  const minusAddr = FULL("Pakistan").map((f) => (f.profession === "pharmacy" ? { ...f, value: { ...f.value, address: null } } : f));
  /* RR-332 (owner, 27 Oct): the councils part is filled by the nursing AND medicine councils — REPLACES "every profession"; the others
   * add country × profession pages and keep being searched */
  assert.deepEqual(partsOf("Pakistan", minusAddr).missing, [], "pharmacy incomplete: the country is still done");
  /* RR-343 (owner, 29 Oct 2026): found = the official name + the official website — the address is optional; no website: not found */
  assert.deepEqual(partsOf("Pakistan", FULL("Pakistan").map((f) => (f.profession === "nursing" ? { ...f, value: { ...f.value, address: null } } : f))).missing, [], "nursing without an address: found");
  const minusNursing = FULL("Pakistan").map((f) => (f.profession === "nursing" ? { ...f, value: { ...f.value, website: null } } : f));
  const q = partsOf("Pakistan", minusNursing); assert.deepEqual(q.missing, ["councils"]); assert.match(q.parts.councils.missing[0], /^the nursing council is not found yet \(official name and website\) — a name was found, its official website not confirmed yet; 1 of 12 professions still searched: nursing$/);
  assert.deepEqual(partsOf("Pakistan", FULL("Pakistan").map((f) => (f.part === "rules" ? { ...f, status: "unconfirmed" } : f))).missing, ["rules"], "an unconfirmed fact counts for nothing");
  assert.deepEqual(partsOf("Pakistan", FULL("Pakistan").map((f) => (f.part === "fee" ? { ...f, value: { ...f.value, local: false } } : f))).missing, ["fee"]);
  assert.deepEqual(partsOf("Pakistan", FULL("Pakistan").map((f) => (f.part === "rules" ? { ...f, status: "edited" } : f))).missing, [], "the owner's own version counts");
  const cov = coverageOf([...FULL("Pakistan"), fact("India", "fee", "fee|India", { line: "x ≈ INR 1 — …", local: true })], { countries: ["Pakistan", "India"] });
  assert.deepEqual([cov.counts.complete, cov.counts.byPart.fee, cov.counts.councilsFound, cov.counts.pairs], [1, 2, 12, 24]);
  assert.equal(councilWhole({ name: "X", website: "ftp://x", address: "1 Road, City 1" }), false);
  assert.deepEqual(PARTS, ["fee", "questions", "centres", "councils", "rules"]);
  /* what the app receives: only shown facts; a council found by its name only still names the profession's own council */
  const pk = countryPacket("Pakistan", [...minusAddr, fact("Pakistan", "rules", "rule|Pakistan|y|2", { rule: "Hidden." }, { status: "unconfirmed" })]);
  assert.equal(pk.complete, true, "RR-332: pharmacy incomplete — nursing and medicine are whole, so the country is done"); assert.equal(pk.councils.pharmacy.whole, false); assert.equal(pk.councils.pharmacy.value.name, "Invented Council of pharmacy");
  assert.ok(!JSON.stringify(pk).includes("Hidden."), "an unconfirmed fact never reaches the app");
});

test("B · RR-328: the collector's own checks — the name and the address stand on the page, the quoted words stand on the page; a government's address; the numbers an answer states; the questions of a country, grouped (a brand's name is no question)", () => {
  const page = "Contact us. Pakistan Nursing & Midwifery Council (PNMC), Plot 21, Mauve Area, G-10/4, Islamabad 44000. Office hours …";
  assert.ok(nameOnPage("Pakistan Nursing & Midwifery Council (PNMC)", page)); assert.ok(nameOnPage("Pakistan Nursing and Midwifery Council (PNMC)", `${page} PNMC`), "the short name and most words");
  assert.equal(nameOnPage("Pakistan Medical and Dental Council (PMDC)", page), false);
  assert.ok(addressOnPage("Plot 21, Mauve Area, G-10/4, Islamabad 44000", page)); assert.equal(addressOnPage("Plot 99, Blue Area, Islamabad 44000", page), false, "its numbers must stand on the page");
  assert.ok(quoteOnPage("The applicant must submit a request for verification of registration to the council", "Rules. The applicant must submit a request for verification of registration to the council directly."));
  assert.equal(quoteOnPage("The applicant may email any office", "The applicant must submit a request for verification."), false);
  assert.equal(quoteOnPage("The applicant must submit a request for a refund to any regional office by post", "Rules. The applicant must submit a request for verification of registration to the council directly."), false, "a quote that only starts like the page");
  assert.ok(governmentHost("pnc.gov.pk") && governmentHost("moh.go.ke") && governmentHost("salud.gob.mx") && governmentHost("health.govt.nz") && governmentHost("nhs.gov"));
  assert.equal(governmentHost("pnmc-info.com"), false);
  assert.deepEqual(numbersOf("It costs AUD 587 (about 114,200 PKR) in 2026."), ["587", "114200", "2026"]);
  const g = questionGroups([{ keyword: "oet fee in pakistan", volume: 880 }, { keyword: "oet exam fees pakistan", volume: 320 }, { keyword: "oet centre lahore", volume: 320 }, { keyword: "e2 oet", volume: 9000 }, { keyword: "benchmark oet fees", volume: 4000 }, { keyword: "ielts fee", volume: 5000 }, { keyword: "how long is oet valid", volume: 70 }, { keyword: "oet re-marking", volume: 30 }], { subject: "OET", skip: BRANDS });
  assert.deepEqual(g.map((x) => [x.group, x.volume]), [["fees", 1200], ["centres", 320], ["validity", 70], ["remark", 30]]);
  assert.deepEqual([professionKey("Doctors"), professionKey("speech pathology"), professionKey("vets"), professionKey("plumbers")], ["medicine", "speech pathology", "veterinary science", null]);
});

/* ── C · the database ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "";
const pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
async function freshPg() {
  const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default;
  const p = new Pool({ connectionString: PG_URL }); await p.query("DROP TABLE IF EXISTS cf_fact, cf_history, cf_task, cf_day CASCADE"); await p.end();
  return cfPgStore({ url: PG_URL, Pool });
}
const STORES = [["memory", async () => cfMemoryStore()], ...(pgOk ? [["postgres", freshPg]] : [])];
for (const [name, make] of STORES) {
  test(`C · RR-328 the country facts (${name}): a fact by its key, unchanged twice stores nothing; the owner's approve / edit / reject WINS — the collector's later word is kept in the history only; tasks; today's spend`, async () => {
    const s = await make();
    try {
      const f = fact("Pakistan", "councils", "council|Pakistan|nursing", { name: "Invented Council", website: "https://ic.example", address: "1 Road, Islamabad 44000" }, { profession: "nursing" });
      assert.deepEqual(await s.putFact(f, { at: `${ON}T01:00:00Z` }), { saved: true });
      assert.deepEqual(await s.putFact(f, { at: `${ON}T02:00:00Z` }), { saved: false, why: "unchanged" });
      assert.equal((await s.facts({ country: "Pakistan" })).length, 1); assert.equal((await s.fact(f.key)).status, "confirmed");
      assert.deepEqual(await s.decide(f.key, { action: "edit", value: { name: "The owner's name", website: "https://owner.example", address: "2 Owner Road, Islamabad 44000" }, at: `${ON}T03:00:00Z` }), { ok: true, status: "edited" });
      const later = await s.putFact({ ...f, value: { ...f.value, name: "A later proposal" } }, { at: `${ON}T04:00:00Z` });
      assert.deepEqual(later, { saved: false, why: "the owner edited it" });
      const now = await s.fact(f.key); assert.equal(now.value.name, "The owner's name"); assert.equal(now.by, "owner"); assert.ok(SHOWN.includes(now.status));
      const h = await s.history(f.key); assert.deepEqual(h.map((x) => [x.by, x.status]), [["collector", "confirmed"], ["owner", "edited"], ["collector", "confirmed"]]); assert.match(h[2].note, /not applied — the owner edited/);
      await s.decide(f.key, { action: "reject", at: `${ON}T05:00:00Z` }); assert.equal((await s.fact(f.key)).status, "rejected"); assert.ok(!SHOWN.includes("rejected"));
      assert.deepEqual(await s.decide("nope", { action: "approve", at: ON }), { ok: false, why: "No such fact." });
      await assert.rejects(s.putFact({ ...f, key: "x", status: "maybe" }, { at: ON }), /no such status/);
      await s.setTask("Pakistan", "councils", { day: ON, state: "done" }); await s.setTask("Pakistan", "councils", { day: ON, state: "done", note: "again" });
      assert.deepEqual((await s.tasks()).get("Pakistan|councils"), { day: ON, state: "done", tries: 2, note: "again", tried: null });
      /* RR-328 addition (rule R1): the names already tried are kept with the search */
      const tried = { medicine: { names: ["Invented Medical Commission"], types: ["regulatory authority"], since: ON } };
      await s.setTask("India", "councils", { day: ON, state: "searching", note: "1 left", tried });
      assert.deepEqual((await s.tasks()).get("India|councils"), { day: ON, state: "searching", tries: 1, note: "1 left", tried });
      await s.addSpend(ON, { aiUsd: 0.25, reads: 3, searches: 2 }); await s.addSpend(ON, { aiUsd: 0.5, reads: 1 });
      assert.deepEqual(await s.spend(ON), { aiUsd: 0.75, reads: 4, searches: 2 }); assert.deepEqual(await s.spend("2026-10-27"), { aiUsd: 0, reads: 0, searches: 0 });
    } finally { await s.close(); }
  });
}

/* its own schema: test/rr326-keywords.test.mjs drops and makes the same kw_* tables, and node --test runs the two files at once */
const KW_URL = PG_URL ? `${PG_URL}${PG_URL.includes("?") ? "&" : "?"}options=-c%20search_path%3Drr328kw` : null;
const KW_STORES = [["memory", async () => memoryStore()], ...(pgOk ? [["postgres", async () => { const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default; const p = new Pool({ connectionString: PG_URL }); await p.query("CREATE SCHEMA IF NOT EXISTS rr328kw"); await p.end(); const k = new Pool({ connectionString: KW_URL }); await k.query("DROP TABLE IF EXISTS kw_fetch_keyword, kw_group_keyword, kw_observation, kw_fetch, kw_seed_list CASCADE"); const [{ s }] = (await k.query("SELECT current_schema() AS s")).rows; await k.end(); assert.equal(s, "rr328kw", "the keyword tables in their own schema"); return pgStore({ url: KW_URL, Pool }); }]] : [])];
for (const [name, make] of KW_STORES) {
  test(`C · RR-328 the keyword database (${name}): keywordsAt — every keyword at a location, each with its NEWEST figure, biggest first (the country's own searches the collector groups into questions)`, async () => {
    const s = await make();
    try {
      const save = (day, rows, location = "PK") => s.saveFetch({ kind: "collector", seedKey: `seed:${day}`, location, language: "en", day, at: `${day}T01:00:00Z`, period: "2025-10-01..2026-09-30", ops: 1, rows: rows.map(([text, said]) => ({ text, said })) });
      await save("2026-10-20", [["oet fee pakistan", 500], ["oet lahore", 90]]); await save("2026-10-26", [["oet fee pakistan", 880], ["oet centre lahore", null]]); await save("2026-10-26", [["oet india", 6600]], "IN");
      assert.deepEqual((await s.keywordsAt({ location: "PK", language: "en" })).map((r) => [r.keyword, r.volume, r.day]), [["oet fee pakistan", 880, "2026-10-26"], ["oet lahore", 90, "2026-10-20"], ["oet centre lahore", null, "2026-10-26"]]);
      assert.deepEqual(await s.keywordsAt({ location: "NP", language: "en" }), []);
    } finally { await s.close(); }
  });
}

/* ── D · the collector ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const SUBJECT = { name: "OET", site: "https://oet.example" };
const rssOf = (r) => `<rss>${Object.entries(r).map(([c, v]) => `<item><cb:targetCurrency>${c}</cb:targetCurrency><cb:value>${v}</cb:value><cb:period>${ON}</cb:period></item>`).join("")}</rss>`;
const slugP = (p) => p.replace(/\W+/g, "");
const PK_HOST = (p) => `https://pk-${slugP(p)}.org`; // RR-343: a council's own domain (an .org)
function oetWorld({ vetPageAddress = true } = {}) {
  const pages = {
    "https://oet.example/test/oet-test-at-home": { title: "OET@Home", text: "Test fee: AUD $587. OET@Home is offered in countries where a test venue is not yet available." },
    "https://oet.example/post/new-test-venue-in-pakistan": { title: "New venue", text: "OET opens a new test venue in Lahore, Pakistan." },
    "https://oet.example/post/new-test-venue-in-india": { title: "New venue", text: "A new OET test venue opens in Chennai, India." },
    "https://oet.example/post/new-test-venue-in-singapore": { title: "New venue", text: "A new OET test venue opens in Singapore." },
    "https://pnc.gov.pk/verification": { title: "Verification", text: "Verification. The applicant must submit a request for verification of registration to the council with the fee and the documents listed below." },
  };
  for (const p of CF_PROFESSIONS) pages[`${PK_HOST(p)}/contact`] = { title: `Contact — Pakistan Council of ${p}`, text: `Pakistan Council of ${p}. ${p === "veterinary science" && !vetPageAddress ? "Write to us." : "10 Invented Avenue, Islamabad 44000."}` };
  pages["https://in-nursing.org/contact"] = { title: "Contact", text: "Invented Indian Nursing Council, 2 Invented Marg, New Delhi 110001." };
  pages["https://in-medicine.example/about"] = { title: "About", text: "Something else entirely." };
  const raws = { "https://www.rba.gov.au/rss/rss-cb-exchange-rates.xml": rssOf({ USD: "0.6600", INR: "55.10", PHP: "37.20" }), [OPEN_RATES.url]: JSON.stringify(OPEN_JSON) };
  let n = 0;
  return { reader: { read: async (u) => { n++; const p = pages[u]; return p ? { ok: true, url: u, title: p.title, h1: null, text: p.text, checkedOn: ON } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, raw: async (u) => { n++; return raws[u] ?? null; }, sitemapOf: async () => ({ ok: true, urls: Object.keys(pages).filter((u) => u.startsWith("https://oet.example")) }), requests: () => n }, pages };
}
function standInAi() {
  const calls = [];
  const ai = async ({ prompt, search, schema }) => {
    const country = /^Country: ([^.]+)\./.exec(prompt)?.[1] ?? /people in ([A-Z][\w ]+) search/.exec(prompt)?.[1] ?? /Groups of searches from ([A-Z][\w ]+) \(/.exec(prompt)?.[1];
    const kind = schema.properties.councils ? "councils" : schema.properties.rules ? "rules" : schema.properties.engaging ? "judge" : "answers"; calls.push({ kind, country, search }); // RR-335: the AI judge of an article draft
    if (kind === "councils") return { ok: true, usd: 0.4, searches: 3, data: { councils: country === "Pakistan" ? CF_PROFESSIONS.map((p) => ({ profession: p, name: `Pakistan Council of ${p}`, website: PK_HOST(p), address: "10 Invented Avenue, Islamabad 44000", sourceUrl: `${PK_HOST(p)}/contact` }))
      : country === "India" ? [{ profession: "nursing", name: "Invented Indian Nursing Council", website: "https://in-nursing.org", address: "2 Invented Marg, New Delhi 110001", sourceUrl: "https://in-nursing.org/contact" }, { profession: "Doctors", name: "Invented Medical Commission", website: "https://in-medicine.example", address: "3 Invented Road, New Delhi 110002", sourceUrl: "https://in-medicine.example/about" }]
      : [{ profession: "nursing", name: "Invented Board of Nursing", website: "https://board.example", address: "4 Invented St, Manila 1000", sourceUrl: "https://someones-blog.example/boards" }] } };
    if (kind === "rules") return { ok: true, usd: 0.3, searches: 2, data: { rules: country === "Pakistan" ? [{ kind: "verification", rule: "Nurses ask their council for a verification of registration first.", quote: "The applicant must submit a request for verification of registration to the council", sourceUrl: "https://pnc.gov.pk/verification" }] : [{ kind: "documents", rule: "Documents are attested first.", quote: "All documents must be attested by the ministry before submission", sourceUrl: "https://pnc.gov.pk/verification" }] } };
    const groups = [...prompt.matchAll(/^- ([a-z ]+): /gm)].map((m) => m[1]);
    return { ok: true, usd: 0.05, searches: 0, data: { answers: groups.map((g) => ({ group: g, answer: g === "centres" ? `${country === "Philippines" ? "No venue is named in the Philippines; it can be taken at home, and the nearest venue is in Singapore." : "OET's own pages name a venue there; book it on OET's own site."}` : g === "validity" ? "Results stay valid for 9 years." : "Prepare with OET's own sample tests and a timed practice." })) } };
  };
  return { ai, calls };
}
async function keywordDb() {
  const s = memoryStore(), save = (location, rows) => s.saveFetch({ kind: "collector", seedKey: `seed:${location}`, location, language: "en", day: ON, at: `${ON}T01:00:00Z`, period: "2025-10-01..2026-09-30", ops: 1, rows: rows.map(([text, said]) => ({ text, said })) });
  await save("PK", [["oet fee in pakistan", 880], ["oet centre lahore", 320], ["how to prepare for oet", 90], ["e2 oet", 9000], ["how long is oet valid", 70]]);
  await save("IN", [["oet exam fees in india", 1900], ["oet chennai date", 90]]);
  await save("PH", [["oet philippines schedule", 260], ["oet review center manila", 140]]);
  return s;
}
const ENV_AI = { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000" }, ENV_AI10 = { ...ENV_AI, COUNTRY_FACTS_AI_USD_PER_DAY: "10" };
const clockAt = (iso = `${ON}T10:00:00Z`) => { const c = { t: Date.parse(iso) }; c.now = () => c.t; return c; };

test("D · RR-328: one run for Pakistan, India and the Philippines — the fee in every country's money and the centres from OET's own pages; questions answered (the fee from its fact, the rest AI-written and labelled); councils and rules CONFIRMED only when found on their own official page; the rest unconfirmed with why, never shown", async () => {
  const W = oetWorld(), A = standInAi(), store = cfMemoryStore(), kw = await keywordDb(), clock = clockAt();
  const r = await runCountryFacts({ store, kwStore: kw, reader: W.reader, ai: A.ai, env: ENV_AI10, now: clock.now, budgetMs: 1e9, countries: ["Pakistan", "India", "Philippines"], subject: SUBJECT, products: ["oet"] });
  assert.equal(r.ok, true); assert.equal(r.stoppedBy, null, r.why);
  assert.ok(["all countries · fee", "all countries · centres", "Pakistan · questions", "Pakistan · councils", "Pakistan · rules", "Philippines · questions"].every((d) => r.done.includes(d)), r.done.join(", "));
  assert.deepEqual(r.searching, ["India · councils", "Philippines · councils"], "a council not found is searched again, never finished as missing (rule R1)");
  const facts = await store.facts();
  assert.equal(facts.filter((f) => f.part === "fee").length, 197, "the fee in every one of the 197 countries' money");
  assert.equal((await store.fact("fee|Pakistan")).value.line, "AUD 587 — about 114,200 PKR (ExchangeRate-API's open rate of 2026-10-26: 1 AUD = 194.548107 PKR; Rates By Exchange Rate API), not an official price");
  assert.match((await store.fact("fee|India")).value.line, /≈ INR 32,344 — an estimate from the RBA rate/);
  assert.match((await store.fact("centres|Philippines")).value.home, /^OET's own page says taking it at home is offered in countries where a venue is not yet available/, "its own page's words, as venues.mjs says them"); assert.deepEqual((await store.fact("centres|Philippines")).value.nearest, ["Singapore"]);
  /* questions: the fee group from the fee fact (not the AI); a brand's name is no question; an answer with a number no fact states → unconfirmed */
  const fq = await store.fact("question|Pakistan|fees"); assert.equal(fq.aiWritten, false); assert.match(fq.value.answer, /^OET costs AUD 587 — about 114,200 PKR in Pakistan|^OET costs AUD 587 in Pakistan/);
  assert.equal((await store.fact("question|Pakistan|preparation")).aiWritten, true);
  const v = await store.fact("question|Pakistan|validity"); assert.equal(v.status, "unconfirmed"); assert.match(v.why, /states 9, which no confirmed fact says/);
  assert.ok(!facts.some((f) => /e2 oet/.test(JSON.stringify(f.value))));
  /* councils: all 12 for Pakistan confirmed with their address; India — one on its page, one whose name is not there; the Philippines' page is not official */
  assert.equal(facts.filter((f) => f.country === "Pakistan" && f.part === "councils" && f.status === "confirmed" && f.value.address).length, 12);
  assert.equal((await store.fact("council|India|medicine")).status, "unconfirmed"); assert.match((await store.fact("council|India|medicine")).why, /the name is not on its source page/);
  assert.equal((await store.fact("council|Philippines|nursing")).status, "approved"); assert.match((await store.fact("council|Philippines|nursing")).why, /^your own council — counted by your word \(RR-343\)/); // RR-343 (owner, 29 Oct): his own council (PRC) counts by his word, unread
  /* rules: the quoted words on the government's page → confirmed; words that are not there → unconfirmed */
  assert.equal((await store.fact("rule|Pakistan|verification|1")).status, "confirmed");
  assert.equal(facts.find((f) => f.country === "India" && f.part === "rules" && f.proposedBy === "ai").status, "unconfirmed");
  const cov = coverageOf(facts, { countries: ["Pakistan", "India", "Philippines"] });
  assert.ok(cov.rows[1].missing.includes("councils"), "India: two councils, one unconfirmed");
  assert.equal(cov.rows[0].complete, true, "Pakistan: all five parts");
  assert.ok(!cov.rows[2].missing.includes("councils") && !cov.rows[2].missing.includes("centres"), "the Philippines: at home with the nearest venue; councils filled by the owner's own PRC (nursing and medicine, RR-343)");
  assert.ok(r.aiUsd > 0 && r.reads > 0); assert.deepEqual(await store.spend(ON), { aiUsd: r.aiUsd, reads: r.reads, searches: r.searches });
  /* the app receives Pakistan whole — and no unconfirmed fact */
  const pk = countryPacket("Pakistan", facts); assert.equal(pk.complete, true); assert.ok(!pk.questions.some((q) => /9 years/.test(q.value.answer)));
  /* the same day again: nothing finished is done again (the AI is not asked) */
  const before = A.calls.length, again = await runCountryFacts({ store, kwStore: kw, reader: W.reader, ai: A.ai, env: ENV_AI10, now: clock.now, budgetMs: 1e9, countries: ["Pakistan", "India", "Philippines"], subject: SUBJECT, products: ["oet"] });
  /* RR-335: only the AI judge is asked — once, about the answer draft the first run made possible (a new draft, judged inside the cap) */
  assert.deepEqual(A.calls.slice(before).map((c) => c.kind), ["judge"]); assert.deepEqual(again.done, []);
});

test("D · RR-328: the owner's edit is kept when the collector comes back a month later; the daily caps stop a run in plain words; no AI key → official pages and AlmiOET's records only; one run at a time", async () => {
  const W = oetWorld(), A = standInAi(), store = cfMemoryStore(), kw = await keywordDb(), clock = clockAt();
  const run = (o = {}) => runCountryFacts({ store, kwStore: kw, reader: W.reader, ai: A.ai, env: ENV_AI, now: clock.now, budgetMs: 1e9, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"], ...o });
  await run();
  await store.decide("council|Pakistan|nursing", { action: "edit", value: { name: "The owner's council name", website: "https://owner.example", address: "5 Owner Road, Islamabad 44000" }, at: `${ON}T11:00:00Z` });
  /* rule R1: a council he rejected is searched for again — the collector's new proposal for it is refused, his word kept */
  await store.decide("council|Pakistan|medicine", { action: "reject", at: `${ON}T11:00:00Z` });
  clock.t += 31 * 864e5; const later = await run();
  assert.ok(later.kept >= 1); assert.equal((await store.fact("council|Pakistan|nursing")).value.name, "The owner's council name"); assert.equal((await store.fact("council|Pakistan|medicine")).status, "rejected");
  /* caps: today's AI dollars, today's page reads */
  const s2 = cfMemoryStore(), capAi = await runCountryFacts({ store: s2, kwStore: kw, reader: oetWorld().reader, ai: A.ai, env: { ...ENV_AI, COUNTRY_FACTS_AI_USD_PER_DAY: "0.5" }, now: clockAt().now, budgetMs: 1e9, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"] });
  assert.equal(capAi.stoppedBy, "AI_BUDGET"); assert.match(capAi.why, /Today's AI budget for country facts \(\$0\.38\) is used \(\$0\.13 stays for the test dates\)/); // RR-342: a quarter of a small cap stays for the dates
  const capReads = await runCountryFacts({ store: cfMemoryStore(), kwStore: kw, reader: oetWorld().reader, ai: A.ai, env: { ...ENV_AI, COUNTRY_FACTS_READS_PER_DAY: "3" }, now: clockAt().now, budgetMs: 1e9, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"] });
  assert.equal(capReads.stoppedBy, "READS"); assert.match(capReads.why, /Today's 3 page reads for country facts are used \(0 stay for the test dates\)/); // RR-342
  /* no AI key: the AI is never asked; tasks wait for it */
  const B = standInAi(), s3 = cfMemoryStore(), noAi = await runCountryFacts({ store: s3, kwStore: kw, reader: oetWorld().reader, ai: B.ai, env: {}, now: clockAt().now, budgetMs: 1e9, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"] });
  assert.equal(B.calls.length, 0); assert.equal(noAi.ok, true); assert.equal((await s3.tasks()).get("Pakistan|councils").state, "waiting");
  assert.equal(aiConfigured({}), false); assert.deepEqual(await askAi({ env: {}, system: "", prompt: "", schema: {} }), { ok: false, why: "ANTHROPIC_API_KEY is not set in Vercel yet.", usd: 0, searches: 0 });
  /* one run at a time */
  const kv = { run: async (cmds) => cmds.map(([c]) => (c === "SET" ? null : null)) };
  assert.match((await runCountryFacts({ store: cfMemoryStore(), kv, reader: oetWorld().reader, ai: A.ai, env: ENV_AI, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"] })).why, /Another country-facts run is working/);
  assert.equal(CF_ORDER.length, 197); assert.deepEqual(CF_ORDER.slice(0, 3), ["India", "Philippines", "Pakistan"]);
});

test("D · RR-328 addition (owner, 26 Oct, rule R1): a council not found is searched EVERY DAY under any same-meaning name — only the professions still without one, the names already tried told to the AI; its name type recorded; a council a page may show is never replaced by an unconfirmed one", async () => {
  const W = oetWorld(), store = cfMemoryStore(), kw = await keywordDb(), clock = clockAt(), asked = [], S = standInAi(); let day = 1;
  W.pages["https://invented-health.gov.zz/contact"] = { title: "Contact", text: "Invented Ministry of Health, Medical Registration Office, 9 Invented Road, New Delhi 110003." };
  const ai = async (q) => { if (!q.schema.properties.councils || !/^Country: India\./.test(q.prompt)) return S.ai(q); asked.push(q.prompt); if (day === 1) return S.ai(q);
    return { ok: true, usd: 0.4, searches: 3, data: { councils: [{ profession: "medicine", name: "Invented Ministry of Health", nameType: "ministry or department of health", website: "https://invented-health.gov.zz", address: "9 Invented Road, New Delhi 110003", sourceUrl: "https://invented-health.gov.zz/contact" },
      { profession: "dentistry", name: "A Blog's Dentistry Body", nameType: "board", website: "https://blog.example", address: "1 Blog St, Delhi 110000", sourceUrl: "https://blog.example/x" }] } }; };
  const run = () => runCountryFacts({ store, kwStore: kw, reader: W.reader, ai, env: ENV_AI10, now: clock.now, budgetMs: 1e9, countries: ["India"], subject: SUBJECT, products: ["oet"] });
  const r1 = await run(), t1 = (await store.tasks()).get("India|councils");
  assert.deepEqual(r1.searching, ["India · councils"]); assert.equal(t1.state, "searching"); assert.match(t1.note, /^still searching for 11 of 12: medicine, dentistry/);
  assert.deepEqual(t1.tried.medicine, { names: ["Invented Medical Commission"], types: ["regulatory authority"], since: ON }, "the name tried and its name type (from its name)");
  assert.equal(Object.keys(t1.tried).length, 11); assert.ok(!t1.tried.nursing, "nursing's council was found");
  assert.match(asked[0], /ANY name with this meaning: council; board; registration authority; licensing body; regulatory authority; ministry or department of health; health professions council/); assert.doesNotMatch(asked[0], /Already tried/);
  assert.equal((await store.fact("council|India|nursing")).value.nameType, "medical, nursing, pharmacy or dental council");
  await run(); assert.equal(asked.length, 1, "once a day — the same day is not searched again");
  /* a council found by its name only (no address yet): a page may show it — an unconfirmed proposal never replaces it */
  await store.putFact(fact("India", "councils", "council|India|dentistry", { name: "Invented Dental Council", website: "https://in-dental.example", address: null }, { profession: "dentistry" }), { at: `${ON}T10:30:00Z` });
  clock.t += 864e5; day = 2; const r2 = await run(), t2 = (await store.tasks()).get("India|councils");
  assert.equal(asked.length, 2, "the next day, searched again");
  /* RR-334: the owner's templates — one line a profession still without a whole council (not nursing) */
  assert.match(asked[1], /\n- medicine: I need the official website, address and contact details of .+ in India\.\n- dentistry: What is the official body that registers dentists in India\?/, "only the professions still without a whole council (not nursing)"); assert.doesNotMatch(asked[1], /\n- nursing:/);
  assert.match(asked[1], /Already tried and NOT confirmed on an official page \(look for another body or another official page\): medicine: Invented Medical Commission/);
  const med = await store.fact("council|India|medicine"); assert.equal(med.status, "confirmed"); assert.equal(med.value.nameType, "ministry or department of health"); assert.ok(councilWhole(med.value));
  assert.ok(!t2.tried.medicine, "found — no longer searched"); assert.deepEqual(t2.tried.dentistry.names, ["A Blog's Dentistry Body"]); assert.deepEqual(t2.tried.dentistry.types, ["board"]);
  assert.equal((await store.fact("council|India|dentistry")).value.name, "Invented Dental Council", "the shown council stays"); assert.deepEqual(r2.searching, ["India · councils"]);
  /* the name types: the AI must name one; AlmiOET's records get theirs from the name */
  assert.equal(NAME_TYPES.length, 11); assert.deepEqual(councilQuestion({ country: "X", subject: "OET", professions: ["nursing"] }).schema.properties.councils.items.properties.nameType.enum, [...NAME_TYPES]);
  assert.deepEqual(["Embassy of Invented", "Invented Ministry of Health", "Health Professions Council of Invented", "Invented Nursing Council", "Invented Medical Board", "Invented Licensing Agency", "Invented Registration Office", "Invented Medical Commission", "Invented Council", "Invented Society"].map(nameTypeOf),
    ["embassy or consulate", "ministry or department of health", "health professions council", "medical, nursing, pharmacy or dental council", "board", "licensing body", "registration authority", "regulatory authority", "council", null]);
});

test("D · RR-329 (rule R7, replaces RR-328's Opus): the cheapest capable model — Claude Haiku 5.5, its price counted from its own usage (and web search); no server-side fallback (Haiku has none); the key by its name only, structured output and the basic web search tool; a paused search goes on", async () => {
  assert.ok(Math.abs(costOf({ input_tokens: 1e6, output_tokens: 1e5, server_tool_use: { web_search_requests: 10 } }) - (0.1 + 0.05 + 0.1)) < 1e-9);
  assert.equal(CF_AI.model, "claude-haiku-5-5");
  const seen = []; let turn = 0;
  const fetchImpl = async (url, init) => { const b = JSON.parse(init.body); seen.push({ url, key: init.headers["x-api-key"] === ENV_AI.ANTHROPIC_API_KEY, version: init.headers["anthropic-version"], tools: b.tools, format: b.output_config.format.type, n: b.messages.length, model: b.model, fallbacks: b.fallbacks, beta: init.headers["anthropic-beta"] });
    return new Response(JSON.stringify(turn++ === 0 ? { stop_reason: "pause_turn", content: [{ type: "server_tool_use", id: "s1", name: "web_search", input: { query: "x" } }], usage: { input_tokens: 1000, output_tokens: 100, server_tool_use: { web_search_requests: 1 } } } : { stop_reason: "end_turn", content: [{ type: "text", text: '{"councils":[]}' }], usage: { input_tokens: 2000, output_tokens: 50 } }), { status: 200 }); };
  const r = await askAi({ env: ENV_AI, fetchImpl, system: "s", prompt: "p", schema: { type: "object" }, search: true });
  assert.deepEqual(r.data, { councils: [] }); assert.equal(r.searches, 1); assert.ok(Math.abs(r.usd - (3000 * 0.1 / 1e6 + 150 * 0.5 / 1e6 + 0.01)) < 1e-9);
  assert.equal(seen[0].url, "https://api.anthropic.com/v1/messages"); assert.ok(seen.every((x) => x.key && x.version === "2023-06-01" && x.format === "json_schema" && x.model === "claude-haiku-5-5" && x.fallbacks === undefined && x.beta === undefined));
  assert.deepEqual(seen[0].tools, [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }]); assert.equal(seen[1].n, 2, "the paused turn sent back");
  const refused = await askAi({ env: ENV_AI, fetchImpl: async () => new Response(JSON.stringify({ stop_reason: "refusal", content: [] }), { status: 200 }), system: "", prompt: "", schema: {} });
  assert.equal(refused.why, "the AI declined this question");
});

/* ── E · the website ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const keys = () => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey }; };
const K1 = keys(), signed = (licence) => ({ licence, signature: sign(null, licenceBytes(licence), K1.priv).toString("base64") });
const OWNER_L = signed({ account: "av_owner_test0000000000000000", kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: `${ON}T00:00:00.000Z` });
const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
const ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: "cron-secret-for-tests-1234", LICENCE_PUBLIC_KEY: K1.pub, ...ENV_AI10 };
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
async function site({ store = cfMemoryStore(), env = ENV } = {}) {
  const clock = clockAt(), K = fakeKv(clock), W = oetWorld(), A = standInAi();
  const app = createApp({ mode: "public-lite", env, kvFetch: K.fetchImpl, kwStore: await keywordDb(), cfStore: store, cfReader: W.reader, cfAi: A.ai, now: clock.now });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, clock.t).split(";")[0];
  const req = async (p, { method = "GET", form = null, headers = {}, owner = true } = {}) => { const r = await fetch(base + p, { method, redirect: "manual", headers: { ...(owner ? { cookie } : {}), ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}), ...headers }, body: form ? new URLSearchParams(form).toString() : undefined }); return { status: r.status, text: await r.text(), headers: r.headers }; };
  return { req, store, A, close: () => new Promise((r) => srv.close(r)) };
}

test("E · RR-328: /owner/countries — the grid (five parts per country, councils per profession, counts), each fact with its source and status, approve / edit / reject (his edit wins), one short run; never without the owner's cookie", async () => {
  const a = await site();
  try {
    assert.equal((await a.req("/owner/countries", { owner: false })).status, 403);
    const run = await a.req("/owner/countries/run", { method: "POST" }); assert.equal(run.status, 200); assert.match(run.text, /This run: \d+ facts saved/);
    const grid = await a.req("/owner/countries"); assert.equal(grid.status, 200);
    assert.match(grid.text, /<h1>Owner — country facts<\/h1>/); assert.match(grid.text, /of 197 countries have all five parts/); assert.match(grid.text, /Country × profession: a council found for <b>\d+<\/b> of 2,364/);
    assert.match(grid.text, /ANTHROPIC_API_KEY set/); assert.doesNotMatch(grid.text, /sk-ant-test/, "a key is never shown");
    assert.match(grid.text, /<a href="\/owner\/countries\?c=India">India<\/a>/);
    /* rule R1: a council not found yet is "searching", with the names already tried — never a stop at "missing" */
    assert.match(grid.text, /<td>\d+\/12 <span class="fine">[\d-]+<\/span> · searching<\/td>/, "RR-331: the table's councils cell says searching");
    const india = await a.req("/owner/countries?c=India"); assert.match(india.text, /<h3>Councils — searching every day<\/h3>/);
    assert.match(india.text, /medicine: searching since 2026-10-26 — tried: Invented Medical Commission \(name types: regulatory authority\)/); assert.match(india.text, /Invented Indian Nursing Council \(medical, nursing, pharmacy or dental council\)/);
    await a.store.putFact(fact("Pakistan", "rules", "rule|Pakistan|other|9", { rule: "An unconfirmed rule." }, { status: "unconfirmed", why: "the quoted words are not on its source page" }), { at: `${ON}T10:00:00Z` });
    const pk = await a.req("/owner/countries?c=Pakistan"); assert.match(pk.text, /An unconfirmed rule\./); assert.match(pk.text, /unconfirmed<br><span class="fine">never shown on a page<\/span>/); assert.match(pk.text, /the quoted words are not on its source page/);
    const edit = await a.req("/owner/countries/fact", { method: "POST", form: { key: "council|Pakistan|nursing", action: "edit", name: "Owner Council", website: "https://owner.example", address: "7 Owner Road, Islamabad 44000" } });
    assert.match(edit.text, /Saved: edited\./); assert.equal((await a.store.fact("council|Pakistan|nursing")).value.name, "Owner Council");
    assert.equal((await a.req("/owner/countries/fact", { method: "POST", form: { key: "council|Pakistan|nursing", action: "edit", name: "x", website: "owner.example", address: "1 Road, City 1" } })).status, 400, "a website must be an https:// address");
    assert.match((await a.req("/owner/countries/fact", { method: "POST", form: { key: "rule|Pakistan|other|9", action: "reject" } })).text, /Saved: rejected\./);
    assert.match((await a.req("/owner/countries/fact", { method: "POST", form: { key: "rule|Pakistan|other|9", action: "approve" } })).text, /Saved: approved\./);
    assert.equal((await a.req("/owner/countries/fact", { method: "POST", form: { key: "nope", action: "approve" } })).status, 400);
    assert.match((await a.req("/owner")).text, /href="\/owner\/countries"/, "the keywords page links the country facts");
  } finally { await a.close(); }
});

test("E · RR-328: /v1/countries/facts — the owner's licence only (while sales are not open); ONLY facts a page may show — never an unconfirmed or rejected one; the cron's secret", async () => {
  const a = await site();
  try {
    await a.req("/owner/countries/run", { method: "POST" });
    await a.store.putFact(fact("Pakistan", "rules", "rule|Pakistan|other|9", { rule: "A secret unconfirmed rule." }, { status: "unconfirmed" }), { at: `${ON}T10:00:00Z` });
    assert.equal((await a.req("/v1/countries/facts", { owner: false })).status, 401);
    const r = await a.req("/v1/countries/facts?countries=Pakistan,India,Atlantis", { owner: false, headers: { [LICENCE_HEADER]: licenceHeaderOf(OWNER_L) } });
    assert.equal(r.status, 200); const j = JSON.parse(r.text);
    assert.deepEqual(Object.keys(j.countries), ["Pakistan", "India"], "a name not in the list is ignored");
    assert.equal(j.countries.Pakistan.complete, true); assert.ok(!r.text.includes("A secret unconfirmed rule."), "never an unconfirmed fact");
    assert.ok(!r.text.includes("Results stay valid for 9 years."), "an answer with an invented number stays unconfirmed — never sent");
    assert.equal(r.headers.get("x-robots-tag"), "noindex");
    assert.equal((await a.req("/cron/country-facts", { owner: false })).status, 401);
    const c = await a.req("/cron/country-facts", { owner: false, headers: { authorization: `Bearer ${ENV.CRON_SECRET}` } }); assert.equal(c.status, 200); assert.equal(JSON.parse(c.text).ok, true);
  } finally { await a.close(); }
});

/* ── F · the app ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("F · RR-328: the app's plan reads AlmiWorld's country facts once a day (its licence), keeps the answer, and says so when the service is down — never an invented fact", async () => {
  const asked = []; let up = true;
  const fetchImpl = async (url, init) => { asked.push({ path: new URL(url).pathname + new URL(url).search, licence: Boolean(init.headers?.[LICENCE_HEADER]) }); return up ? new Response(JSON.stringify({ ok: true, countries: { Pakistan: { complete: true }, India: { complete: false } } }), { status: 200 }) : new Response(JSON.stringify({ ok: false, why: "down" }), { status: 503 }); };
  const svc = keywordService({ siteUrl: "https://svc.example/", signed: OWNER_L, fetchImpl });
  let saved = null; const cache = { load: () => saved, save: (v) => { saved = v; } };
  const one = await countryFactsForPlan({ service: svc, cache, countries: ["Pakistan", "India"], today: ON });
  assert.equal(one.on, true); assert.equal(one.line, "AlmiWorld country facts: 1 of 2 countries have all five parts"); assert.deepEqual(asked, [{ path: "/v1/countries/facts?countries=Pakistan%2CIndia", licence: true }]);
  assert.equal((await countryFactsForPlan({ service: svc, cache, countries: ["Pakistan", "India"], today: ON })).from, "cache"); assert.equal(asked.length, 1, "once a day");
  up = false; const down = await countryFactsForPlan({ service: svc, cache, countries: ["Pakistan", "India"], today: "2026-10-27" });
  assert.equal(down.on, false); assert.match(down.line, /not reachable just now \(down\) — the answer of 2026-10-26 is used/); assert.equal(down.countries.Pakistan.complete, true);
  const none = await countryFactsForPlan({ service: null, cache: { load: () => null, save: () => {} }, countries: ["Pakistan"], today: ON });
  assert.deepEqual(none.countries, {}); assert.match(none.line, /Add your plan/);
});

/* ── G · re-marking, a section of the results page ──────────────────────────────────────────────────────────────────────────── */
test("G · RR-328: a page's own sections (re-marking on the results page; the five parts of a country page) are rendered with each line's source and date", () => {
  const p = { kind: "topic", intent: "results", title: "OET results: when they come out", claims: [], questions: [], remark: true, sectionsIn: [{ heading: "Re-marking", lines: [{ text: "a re-mark costs AU$120 per sub-test.", link: "https://oet.example/remarking-policy", on: ON }, { text: "a re-mark must be asked for within 72 hours of the results' release.", link: "https://oet.example/remarking-policy", on: ON }] }] };
  const c = contentOf(p, { subject: "OET", on: ON });
  assert.deepEqual(c.sections.map((s) => s.heading), ["Re-marking"]); assert.ok(c.steps.some((s) => /re-mark within the time limit/.test(s)));
  const html = richPage({ title: p.title, html: "<html><head></head><body><main><h1>OET results</h1></main></body></html>" }, { content: c, kind: "topic", answers: [] }, ON).html;
  assert.match(html, /<section data-part="re-marking"><h2>Re-marking<\/h2><ul><li>a re-mark costs AU\$120 per sub-test\. <span class="citation">— <a href="https:\/\/oet\.example\/remarking-policy" rel="nofollow noopener">source<\/a>, read 2026-10-26<\/span><\/li>/);
});

test("G · RR-328 (owner): re-marking searches go to the results page, which carries a \"Re-marking\" section of the subject's own facts — never a page of its own; the app hands its country facts to the plan", async () => {
  const { planFromList } = await import("../desktop/plan-list.mjs"), { recognitionOf } = await import("../desktop/recognition.mjs"), { builtInList } = await import("../desktop/lists.mjs"), { subjectFactsOf } = await import("../desktop/subject-facts.mjs");
  const PROFS = builtInList("professions").items.map((x) => x.name.toLowerCase());
  const facts = subjectFactsOf([{ ok: true, url: "https://oet.example/remarking-policy", checkedOn: ON, text: "An invented page. The fee is AU$120 (Global) per sub-test. Requests must be made within 72 hours from when your results are released." }], "OET");
  const items = ["oet results release", "oet result check", "oet results online", "when do oet results come out", "oet results time", "oet result days", "oet results login", "oet results status"].map((text, i) => ({ text, kind: "tool", volume: { estimate: 5000 - i * 100 } })).concat([{ text: "oet remarking fee", kind: "tool", volume: { estimate: 500 } }]);
  const p = planFromList({ subject: "OET", rec: recognitionOf(builtInList("recognising"), { professions: PROFS }), professions: PROFS, universities: [], venues: { countries: [], home: null }, fee: FEE, rates: null, groups: [], items, facts, on: ON, languages: ["en"], councils: builtInList("origins"), kwByCountry: {}, originFacts: null, countryFacts: {} });
  const topics = p.kinds.topic.map((t) => t.title), rt = p.kinds.topic.find((t) => t.title === "OET results: when they come out");
  assert.ok(rt, topics.join(" | ")); assert.ok(!topics.some((t) => /re-?marking/i.test(t)), "no page of its own");
  assert.equal(p.tables.demand.rows.find((r) => /^Clusters/.test(r.step)).kept.find((x) => /oet remarking fee/.test(x.name))?.why, "100–1K a month → OET results: when they come out", "the re-marking search answered on the results page");
  assert.ok(!(p.gates.topic.sections ?? []).some((x) => /re-?marking/i.test(x.name)), "never a section of its own either");
  assert.deepEqual(rt.sectionsIn.map((s) => s.heading), ["Re-marking"]); assert.deepEqual(rt.sectionsIn[0].lines.map((l) => l.text), ["a re-mark costs AU$120 per sub-test.", "a re-mark must be asked for within 72 hours of the results' release."]);
  assert.ok(rt.content.sections.length === 1 && rt.content.steps.some((s) => /re-mark/.test(s)));
  const MAIN = (await import("node:fs")).readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  /* RR-351: the same store, with the owner's facts file joined to it (desktop/facts-file.mjs) */
  assert.match(MAIN, /countryFacts: withFactsFile\(id, pread\(id, "country-facts\.json", null\)\?\.countries \?\? \{\}\)/, "the plan reads the country facts the app keeps");
  assert.match(MAIN, /countryFactsForPlan\(\{ service: currentLicence\(\) \? kwService\(\) : null/, "asked with the plan's licence");
});
