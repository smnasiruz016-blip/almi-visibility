/**
 * RR-343 (owner decisions, 29 Oct 2026):
 *   1 · COUNCILS — the relaxed rule: a council is FOUND with its official NAME and official WEBSITE (the body's own domain), the website
 *       confirmed by reading it, or — when it does not open from abroad — by its domain and its name together in the search results (shown
 *       "website does not open from abroad"). The address is optional (on any of the body's pages, its contact page too, or the owner's).
 *       The owner's own councils count by his word; the blocked private sites never. The stored councils are re-checked with no new AI cost.
 *   2 · "Buy now — from $30/month": in the header, the home hero and a strip under the first home image — each to the plans.
 *   (3 · /owner/collect in the sales build: test/rr326-keywords.test.mjs "B + G".)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCountryFacts } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { askAi } from "../site/cf-ai.mjs";
import { officialSite, councilFound, councilWhole, partsOf, SITE_ABROAD, CF_PROFESSIONS } from "../desktop/country-facts.mjs";
import { liteHome, frame, BUY_NOW, PLANS } from "../site/pages.mjs";

const ON = "2026-10-29", T0 = Date.parse(`${ON}T10:00:00Z`), AI_ENV = { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" };
const fact = (country, profession, value, extra = {}) => ({ key: `council|${country}|${profession}`, country, profession, part: "councils", kind: "council", value, sourceUrl: value.website, sourceTitle: null, readOn: ON, status: "confirmed", proposedBy: "ai", aiWritten: false, why: null, product: "oet", ...extra });

test("RR-343 · the rule: the official website is the body's own domain; found = name + that website, confirmed how; the address is optional", () => {
  for (const [name, site] of [["Professional Regulation Commission (PRC)", "https://prc.gov.ph/"], ["Nursing Council of Kenya", "https://nckenya.com/"], ["Nursing and Midwifery Board of Ireland (NMBI)", "https://nmbi.ie/"],
    ["Medical Council of Ireland", "https://medicalcouncil.ie/"], ["Saudi Commission for Health Specialties (SCFHS)", "https://scfhs.org.sa/"], ["Pakistan Medical and Dental Council", "https://pmdc.pk/"], ["Nepal Nursing Council", "https://nnc.org.np/"]])
    assert.equal(officialSite(name, site), true, `${name} · ${site}`);
  for (const [name, site] of [["Nursing Council of Kenya", "https://nurse-jobs-abroad.com/"], ["Professional Regulation Commission (PRC)", "https://nle.ph/"], ["Medical Council of Ireland", "ftp://medicalcouncil.ie/"], ["Nursing Council of Kenya", "not a site"]])
    assert.equal(officialSite(name, site), false, `${name} · ${site}`);
  const k = fact("Kenya", "nursing", { name: "Nursing Council of Kenya", website: "https://nckenya.com/", address: null });
  assert.equal(councilFound(k), true, "no address: still found"); assert.equal(councilWhole(k.value), false, "whole (for the app's printed address) is unchanged");
  assert.equal(councilFound({ ...k, sourceUrl: "https://health.go.ke/councils" }), false, "a council stored before, its name read on another page: its website not read yet");
  assert.equal(councilFound({ ...k, sourceUrl: "https://health.go.ke/councils", value: { ...k.value, siteCheck: "search", siteNote: SITE_ABROAD } }), true, "confirmed by the search results");
  assert.equal(councilFound({ ...k, status: "unconfirmed" }), false); assert.equal(councilFound({ ...k, value: { ...k.value, website: null } }), false);
  assert.equal(councilFound({ ...k, value: { ...k.value, website: "https://nurse-jobs-abroad.com/" }, sourceUrl: "https://nurse-jobs-abroad.com/" }), false, "not the body's own domain");
  assert.equal(councilFound({ ...k, status: "approved", value: { ...k.value, website: "https://nursing-kenya.example/" }, sourceUrl: "https://nursing-kenya.example/" }), true, "the owner's word");
  assert.equal(councilFound({ ...k, status: "approved", value: { ...k.value, website: "https://board.com.ph/" }, sourceUrl: "https://board.com.ph/" }), false, "a blocked private site, never — even approved");
  /* the councils part: nursing AND medicine found (unchanged) — with no address now */
  const med = fact("Kenya", "medicine", { name: "Kenya Medical Practitioners and Dentists Council (KMPDC)", website: "https://kmpdc.go.ke/", address: null });
  assert.equal(partsOf("Kenya", [k, med]).parts.councils.filled, true); assert.equal(partsOf("Kenya", [k]).parts.councils.filled, false);
});

test("RR-343 · askAi keeps the search results' addresses and titles (the evidence for a site that does not open from abroad)", async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ id: "msg_1", stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10, server_tool_use: { web_search_requests: 1 } },
    content: [{ type: "server_tool_use", id: "s1", name: "web_search", input: { query: "nursing council kenya" } }, { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://nckenya.com/", title: "Nursing Council of Kenya – Home" }] }, { type: "text", text: "{\"councils\":[]}" }] }) });
  const r = await askAi({ env: AI_ENV, fetchImpl, system: "s", prompt: "p", schema: { type: "object" }, search: true });
  assert.equal(r.ok, true); assert.deepEqual(r.results, [{ url: "https://nckenya.com/", title: "Nursing Council of Kenya – Home" }]);
});

/* a world: Kenya's councils, as the AI proposes them, and what our server can read */
function kenya({ withResults = true } = {}) {
  const pages = {
    "https://health.go.ke/councils": { title: "Health regulatory bodies", text: "The Kenya Medical Practitioners and Dentists Council (KMPDC) registers doctors and dentists." },
    "https://kmpdc.go.ke/": { title: "KMPDC", text: "Kenya Medical Practitioners and Dentists Council. Welcome." },
    "https://kmpdc.go.ke/contact": { title: "Contact us", text: "KMPDC, Woodlands Road, off Lenana Road, Nairobi 00100." },
    "https://dental-help.com/kenya": { title: "Dental Agents", text: "Dental Agents Ltd helps dentists register in Kenya." },
  };
  const read = [], reader = { read: async (u) => { read.push(u); const p = pages[u]; return p ? { ok: true, url: u, title: p.title, h1: null, text: p.text, checkedOn: ON } : { ok: false, url: u, why: "the site refused our server (403)", checkedOn: ON }; },
    raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => read.length };
  const asked = [], ai = async ({ prompt, schema }) => {
    if (!schema.properties.councils) return { ok: false, why: "not in this test", usd: 0, searches: 0 }; asked.push(prompt); // the council questions only
    const c = (profession, name, website, sourceUrl, address = "") => ({ profession, name, nameType: "council", website, address, sourceUrl, notFound: false, why: "" });
    const all = [c("nursing", "Nursing Council of Kenya", "https://nckenya.com/", "https://nckenya.com/"), c("medicine", "Kenya Medical Practitioners and Dentists Council (KMPDC)", "https://kmpdc.go.ke/", "https://health.go.ke/councils", "Woodlands Road, off Lenana Road, Nairobi 00100"),
      c("dentistry", "Dental Agents Ltd", "https://dental-help.com/", "https://dental-help.com/kenya"), c("pharmacy", "Pharmacy and Poisons Board", "https://pharmacyboardkenya.org/", "https://pharmacyboardkenya.org/")];
    return { ok: true, usd: 0.3, searches: 3, data: { councils: all.filter((x) => prompt.includes(`- ${x.profession}:`)) }, results: withResults ? [{ url: "https://nckenya.com/about-us", title: "About the Nursing Council of Kenya" }, { url: "https://other.example/", title: "Pharmacy and Poisons Board" }] : [] };
  };
  return { reader, read, ai, asked };
}
const quiet = async (store) => { await store.setTask("*", "fee", { day: ON, state: "done" }); await store.setTask("*", "centres", { day: ON, state: "done" }); for (const t of ["questions", "rules"]) await store.setTask("Kenya", t, { day: ON, state: "done" }); };

test("RR-343 · the collector: read on its site, or — it does not open from abroad — its domain and name in the search results; the address from the contact page or none; a stranger's site never", async () => {
  const W = kenya(), store = cfMemoryStore(); await quiet(store);
  await runCountryFacts({ store, reader: W.reader, ai: W.ai, env: AI_ENV, now: () => T0, budgetMs: 1e9, countries: ["Kenya"], products: ["oet"] });
  const f = (p) => store.fact(`council|Kenya|${p}`), [n, m, d, ph] = await Promise.all(["nursing", "medicine", "dentistry", "pharmacy"].map(f));
  assert.deepEqual([n.status, n.value.siteCheck, n.value.siteNote, n.value.address, n.value.addressWhy], ["confirmed", "search", SITE_ABROAD, null, "no address found yet (optional)"], "blocked from abroad: the search results confirm it");
  assert.deepEqual([m.status, m.value.siteCheck, m.value.address], ["confirmed", "read", "Woodlands Road, off Lenana Road, Nairobi 00100"], "its name on the ministry's page, its own site read, the address on its contact page");
  assert.ok(W.read.includes("https://kmpdc.go.ke/contact"));
  assert.deepEqual([d.status, d.why], ["unconfirmed", "its website is not the body's own domain (a government's, an .org or the body's own name)"]);
  assert.equal(ph.status, "unconfirmed"); assert.match(ph.why, /^its website could not be read \(the site refused our server \(403\)\) and the search results do not show its name on that domain$/, "a title on ANOTHER domain is no evidence");
  assert.ok([n, m].every(councilFound) && ![d, ph].some(councilFound));
  assert.equal(partsOf("Kenya", await store.facts()).parts.councils.filled, true, "nursing and medicine found: the councils part is filled");
  /* without the search results, a site that does not open is not confirmed */
  const W2 = kenya({ withResults: false }), s2 = cfMemoryStore(); await quiet(s2);
  await runCountryFacts({ store: s2, reader: W2.reader, ai: W2.ai, env: AI_ENV, now: () => T0, budgetMs: 1e9, countries: ["Kenya"], products: ["oet"] });
  assert.equal((await s2.fact("council|Kenya|nursing")).status, "unconfirmed");
});

test("RR-343 · the re-check, no new AI cost: a stored council's own site is read before the AI is asked; the owner's stored councils count by his word with no read; his Reject stands", async () => {
  const W = kenya(), store = cfMemoryStore(); await quiet(store);
  /* stored by an earlier run: both names read on the ministry's page, their own sites never read */
  await store.putFact({ ...fact("Kenya", "medicine", { name: "Kenya Medical Practitioners and Dentists Council (KMPDC)", website: "https://kmpdc.go.ke/", address: null }), sourceUrl: "https://health.go.ke/councils" }, { at: `${ON}T01:00:00Z` });
  assert.equal(councilFound(await store.fact("council|Kenya|medicine")), false, "before: not found under the new rule");
  await runCountryFacts({ store, reader: W.reader, ai: W.ai, env: AI_ENV, now: () => T0, budgetMs: 1e9, countries: ["Kenya"], products: ["oet"] });
  assert.equal(councilFound(await store.fact("council|Kenya|medicine")), true, "after: its own site read");
  assert.equal(W.asked.length, 1); assert.ok(!W.asked[0].includes("- medicine:") && W.asked[0].includes("- nursing:"), "the AI is asked only for the professions still not found");
  /* the owner's councils (desktop/owner-councils.mjs) already stored and not found → approved at once, with no read and no AI */
  const s3 = cfMemoryStore(), at = { at: `${ON}T01:00:00Z` };
  await s3.putFact({ key: "council|Nepal|medicine", country: "Nepal", profession: "medicine", part: "councils", kind: "council", value: { name: "Nepal Medical Council", website: "https://nmc.org.np/", address: "Bansbari, Kathmandu (P.O. Box 13890)" }, sourceUrl: "https://nmc.org.np/", status: "unconfirmed", proposedBy: "owner-input", why: "yours, to verify" }, at);
  await s3.putFact({ key: "council|Nepal|nursing", country: "Nepal", profession: "nursing", part: "councils", kind: "council", value: { name: "Nepal Nursing Council", website: "https://nnc.org.np/", address: null }, sourceUrl: "https://nnc.org.np/", status: "unconfirmed", proposedBy: "owner-input", why: "yours, to verify" }, at);
  await s3.decide("council|Nepal|nursing", { action: "reject", at: `${ON}T02:00:00Z` });
  const W3 = kenya(), r = await runCountryFacts({ store: s3, reader: W3.reader, ai: W3.ai, env: AI_ENV, now: () => T0, budgetMs: 1e9, countries: [], products: ["oet"] });
  const nm = await s3.fact("council|Nepal|medicine");
  assert.deepEqual([nm.status, nm.value.address, nm.why, councilFound(nm)], ["approved", "Bansbari, Kathmandu (P.O. Box 13890)", "your own council — counted by your word (RR-343)", true]);
  assert.equal((await s3.fact("council|Nepal|nursing")).status, "rejected", "his Reject stands");
  assert.deepEqual([r.recheck.approved, W3.read.length, W3.asked.length, r.saved], [1, 0, 0, 0], "no read, no AI — and not counted as this run's finding");
  assert.equal(CF_PROFESSIONS.length, 12);
});

test("RR-343 · \"Buy now — from $30/month\": the header, the home hero and a strip under the first home image, each to the plans; the plans at the bottom stay; never on the pre-sales site", () => {
  assert.equal(Math.min(...PLANS.map((p) => p.price)), 30); assert.deepEqual([BUY_NOW.href, BUY_NOW.label, BUY_NOW.strip], ["/pricing", "Buy now — from $30/month", "Plans from $30 a month · Every feature in every plan"]);
  const home = liteHome({ sales: true, scoreOn: true, ticket: "t" });
  assert.match(home, /<a class="pill" href="\/#score">Get my score<\/a><a class="pill alt" href="\/pricing" data-buy>Buy now — from \$30\/month<\/a><\/nav>/, "the header, beside Get my score");
  assert.match(home, /<div class="drawer"><a class="pill alt" href="\/pricing" data-buy>Buy now — from \$30\/month<\/a><p>AlmiVisibility<\/p>/, "the phone menu");
  assert.match(home, /<div class="cta"><a class="pill big" href="#score">Get my free score<\/a><a class="pill big alt" href="\/pricing" data-buy>Buy now — from \$30\/month<\/a><\/div>/, "the hero");
  const img = home.indexOf("<p class=\"buystrip\""), strip = home.slice(img, home.indexOf("</p>", img) + 4);
  assert.equal(strip, '<p class="buystrip" data-buy-strip>Plans from $30 a month · Every feature in every plan · <a href="/pricing" data-buy>Buy now</a></p>');
  assert.ok(home.indexOf("<figure") < img && img < home.indexOf("<figure", home.indexOf("<figure") + 1), "under the FIRST home image");
  assert.match(home, /<h2 id="plans">Simple plans<\/h2>/, "the plans at the bottom stay");
  assert.ok(!/guarantee/i.test(strip + BUY_NOW.label));
  assert.match(frame({ path: "/download", title: "t", description: "d", body: "", lite: "sales" }), /data-buy>Buy now — from \$30\/month<\/a><\/nav>/, "on every sales page");
  for (const h of [liteHome({ sales: false }), frame({ path: "/", title: "t", description: "d", body: "", lite: true })]) assert.ok(!h.includes("data-buy"), "not before sales open");
});
