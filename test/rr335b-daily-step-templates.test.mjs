/**
 * RR-335 Part 3 (live /owner, 28 Oct 2026 15:25 UTC) — two defects found after one collector day, light proof:
 *   1 every run was used up on the first 15's councils (searched again every day), so the daily step never ran: no article draft, no fee
 *     or rate refresh, no keyword idea all day. From the day's last run on, a daily step not yet taken today goes FIRST; earlier runs keep
 *     RR-333's order (rr333 A1);
 *   2 the per-template counts RR-334 wrote (KV av:cf:tpl:<day>) were shown on no page — /owner/countries now shows today against yesterday.
 * Every name, site and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCountryFacts, CF_COLLECTOR } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { coverageOf } from "../desktop/country-facts.mjs";
import { ownerCountries, ownerArticles } from "../site/pages.mjs";

const ON = "2026-10-28", KEY = { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" };
const feeAnswer = { key: "question|India|fees", product: "oet", country: "India", part: "questions", kind: "question", proposedBy: "official", aiWritten: false,
  value: { group: "fees", intent: "fees", question: "How much does the test cost in India?", answer: "The test costs AUD 100 in India (its own page, read 2026-10-27).", answerKind: "official", quote: null, count: 2 },
  sourceUrl: "https://example.org/fees", sourceTitle: "Fees", readOn: "2026-10-27", status: "confirmed" };

async function dayAt(hhmm, { feeDay }) {
  const store = cfMemoryStore(), order = [];
  await store.setTask("*", "fee", { day: feeDay, state: "done" }); await store.setTask("*", "centres", { day: feeDay, state: "done" });
  await store.putFact(feeAnswer, { at: `${ON}T08:00:00Z` });
  const reader = { read: async (u) => { order.push(`read ${u}`); return { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, raw: async () => null, sitemapOf: async () => { order.push("sitemap"); return { ok: true, urls: [] }; }, requests: () => order.length };
  const ai = async ({ prompt }) => { order.push(`ai ${/^Country: ([^.]+)\./.exec(prompt)?.[1] ?? "?"}`); return { ok: false, usd: 0.01, searches: 0, why: "invented: no answer" }; };
  await runCountryFacts({ store, reader, ai, env: KEY, now: () => Date.parse(`${ON}T${hhmm}:00Z`), budgetMs: 1e9, countries: ["India"], products: ["oet"] });
  return { order, articles: await store.articles() };
}

test("1 · RR-335: from the day's last run on, the daily step not yet taken today goes FIRST (the article drafts with it); taken already, the first 15 stay first", async () => {
  assert.equal(CF_COLLECTOR.dailyFirstFromHourUtc, 12, "the day's last country-facts run is 12:37 UTC (vercel.json)");
  const late = await dayAt("12:37", { feeDay: "2026-10-27" });
  const daily = late.order.indexOf("sitemap"), india = late.order.findIndex((x) => x === "ai India");
  assert.ok(daily >= 0 && (india < 0 || daily < india), `the daily step first at 12:37: ${late.order.slice(0, 6).join(" | ")}`);
  assert.ok(late.articles.some((a) => a.id === "oet|answer|india-fees" && a.status === "draft"), `the answer draft is written: ${late.articles.map((a) => a.id).join(", ") || "none"}`);
  /* FIRING CONTROL: the same day at 10:37 keeps RR-333's order — the first 15's work before the daily step */
  const early = await dayAt("10:37", { feeDay: "2026-10-27" });
  const d2 = early.order.indexOf("sitemap"), i2 = early.order.findIndex((x) => x === "ai India");
  assert.ok(i2 >= 0 && d2 > i2, `before the last run the first 15 go first: ${early.order.slice(0, 6).join(" | ")}`);
  /* taken today already: not taken first again */
  const again = await dayAt("12:37", { feeDay: ON });
  const d3 = again.order.indexOf("sitemap"), i3 = again.order.findIndex((x) => x === "ai India");
  assert.ok(i3 >= 0 && (d3 < 0 || d3 > i3), `a daily step already taken today is not taken first: ${again.order.slice(0, 6).join(" | ")}`);
});

test("2 · RR-335: /owner/countries shows per template the searches and the results confirmed on an official page, today against yesterday", () => {
  const coverage = coverageOf([], { countries: ["India"] });
  const html = ownerCountries({ coverage, templates: { today: { councils: { asks: 12, searches: 70, found: 8, guidance: 0 } }, yesterday: { councils: { asks: 10, searches: 61, found: 3, guidance: 0 }, "answers:guidance": { asks: 0, searches: 0, found: 0, guidance: 4 } } } });
  assert.match(html, /Search templates — searches → results confirmed on an official page/);
  assert.match(html, /<td>councils<\/td><td>12 asked · 70 searches → <b>8<\/b> confirmed<\/td><td>10 asked · 61 searches → <b>3<\/b> confirmed<\/td>/);
  assert.match(html, /<td>answers:guidance<\/td><td>—<\/td><td>0 asked · 0 searches → <b>0<\/b> confirmed · 4 guidance<\/td>/);
  assert.match(ownerCountries({ coverage, templates: { today: {}, yesterday: {} } }), /Search templates: no question asked yesterday or today yet\./);
  assert.match(ownerCountries({ coverage, templates: null }), /Search templates: the counts could not be read\./);
  assert.match(ownerArticles({ articles: [] }), /once a day \(by the day's last run at the latest\)/);
});
