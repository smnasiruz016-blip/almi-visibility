/**
 * RR-333 · A-fixes found by the owner: a run goes FIRST to the first 15 countries' missing parts (the fee and the exchange rates are a
 * daily step after them, the rates read once a day); a questions task from before RR-330 is due at once (India's "—"); one fee style
 * everywhere; an unchanged keyword figure is not stored again (the database's growth) — with no figure lost to any reader.
 * Every name, site and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { runCountryFacts, ratesOfToday, CF_RULES } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { memoryStore, pgStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { feeShown } from "../desktop/rates.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T10:00:00Z`);
function fakeKv() { const m = new Map(); const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) }); return { m, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) }; }

test("A1 · RR-333: the day's rates are read ONCE and reused; a run with the fee already read goes first to the first 15's missing parts, the fee step after them", async () => {
  const K = fakeKv(); let reads = 0;
  const a = await ratesOfToday({ kv: K.kv, today: ON, read: async () => { reads++; return { rba: null, banks: {}, open: { date: ON, rates: { PKR: 194 } }, on: ON }; } });
  const b = await ratesOfToday({ kv: K.kv, today: ON, read: async () => { reads++; return null; } });
  assert.equal(reads, 1, "read once a day"); assert.deepEqual(a, b);
  /* a store whose fee was read yesterday: the order of work today */
  const store = cfMemoryStore(), order = [];
  await store.setTask("*", "fee", { day: "2026-10-26", state: "done" }); await store.setTask("*", "centres", { day: "2026-10-26", state: "done" });
  const reader = { read: async (u) => { order.push(`read ${u}`); return { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, raw: async (u) => { order.push(`raw ${u}`); return null; }, sitemapOf: async () => { order.push("sitemap"); return { ok: true, urls: [] }; }, requests: () => order.length };
  const ai = async ({ prompt }) => { order.push(`ai ${/^Country: ([^.]+)\./.exec(prompt)?.[1] ?? "?"}`); return { ok: true, usd: 0.01, searches: 0, data: { councils: [], rules: [], answers: [] } }; };
  await runCountryFacts({ store, reader, ai, env: { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" }, kv: K.kv, now: () => T0, budgetMs: 1e9, countries: ["India", "Pakistan", "Afghanistan"], products: ["oet"] });
  const firstFee = order.findIndex((x) => x === "sitemap"), lastFront = Math.max(order.lastIndexOf("ai India"), order.lastIndexOf("ai Pakistan"));
  assert.ok(lastFront >= 0 && firstFee > lastFront, `the fee step after the first 15's work: ${order.slice(0, 8).join(" | ")}`);
  assert.ok(order.indexOf("ai Afghanistan") > firstFee, "a country after the first 15 comes after the daily step");
});

test("A2 · RR-333, RR-334: a questions task finished under older rules (RR-328's: no stats) is due at once — and asked; one under today's rules waits its week", async () => {
  const store = cfMemoryStore(), seen = [];
  await store.setTask("*", "fee", { day: ON, state: "done" }); await store.setTask("*", "centres", { day: ON, state: "done" });
  for (const c of ["India", "Pakistan"]) for (const t of ["councils", "rules"]) await store.setTask(c, t, { day: ON, state: "done" });
  await store.setTask("India", "questions", { day: "2026-10-26", state: "done", note: "no question-type searches from India in the keyword database yet" });
  await store.setTask("Pakistan", "questions", { day: "2026-10-26", state: "done", note: "x", tried: { stats: { asked: 3 }, rules: CF_RULES } });
  const kw = { keywordsAt: async ({ location }) => { seen.push(location); return []; } };
  const r = await runCountryFacts({ store, kwStore: kw, reader: { read: async () => ({ ok: false }), raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => 0 }, ai: async () => ({ ok: true, usd: 0, data: {} }), env: {}, now: () => T0, budgetMs: 1e9, countries: ["India", "Pakistan"], products: ["oet"] });
  assert.deepEqual(seen, ["IN"], "India asked again (its task was done under older rules); Pakistan's waits its week");
  assert.ok(r.done.includes("India · questions"));
});

test("A3 · RR-333: one fee style everywhere — the official fee, \"about\" the local amount, the rate's date; the official fee alone where no local figure exists", () => {
  assert.equal(feeShown({ official: "AUD 587", amount: 39229.4, currency: "INR", rate: { date: "2026-10-26" } }), "AUD 587 — about 39,229 INR (2026-10-26)");
  assert.equal(feeShown({ official: "AUD 587", amount: 39229, currency: "INR", rate: { date: "2026-10-26" } }, { date: false }), "AUD 587 — about 39,229 INR");
  assert.equal(feeShown({ official: "AUD 587", amount: 587, currency: "AUD" }), "AUD 587", "the fee's own money");
  assert.equal(feeShown({ official: "AUD 587", currency: "PKR", amount: null }), "AUD 587", "no rate: never a guessed figure");
  assert.equal(feeShown({ text: "PKR 120,000 at the Lahore centre (the owner's own)" }), "PKR 120,000 at the Lahore centre (the owner's own)");
});

/* A4 · on memory, and on real Postgres when ALMIV_TEST_PG_URL names a throwaway one on this computer */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "";
const pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
const STORES = [["memory", async () => memoryStore()], ...(pgOk ? [["postgres", async () => { const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default; const p = new Pool({ connectionString: PG_URL }); await p.query("DROP TABLE IF EXISTS kw_fetch_keyword, kw_observation, kw_group_keyword, kw_fetch, kw_seed_list CASCADE"); await p.end(); return pgStore({ url: PG_URL, Pool }); }]] : [])];
for (const [name, make] of STORES) {
  test(`A4 · RR-333 the keyword database (${name}): an unchanged figure is not stored again; a changed one is; every reader still finds every keyword's figure (findFetch, keywordsAt, file keywords) and "today" counts what was fetched today`, async () => {
    const s = await make();
    try {
      const save = (day, seedKey, rows, kind = "collector") => s.saveFetch({ kind, seedKey, location: "PK", language: "en", day, at: `${day}T01:00:00Z`, period: "p", ops: 1, rows: rows.map(([text, said]) => ({ text, said })) });
      await save("2026-10-25", "seed:a", [["oet fee", 880], ["oet dates", 90]]);
      await save("2026-10-26", "seed:a", [["oet fee", 880], ["oet dates", 90]]);
      await save("2026-10-27", "seed:b", [["oet fee", 880], ["oet dates", 120], ["oet at home", 40]]);
      const c = await s.counts("2026-10-27");
      assert.equal(c.observations, 4, "25 Oct: 2 · 26 Oct: 0 (unchanged) · 27 Oct: 2 (one changed, one new) — 6 before RR-333");
      assert.equal(c.today, 3, "today = the keywords fetched today, unchanged ones too");
      assert.deepEqual((await s.findFetch({ seedKey: "seed:a", location: "PK", language: "en", since: "2026-10-01" })).rows.map((r) => [r.keyword, r.volume]), [["oet fee", 880], ["oet dates", 90]], "26 Oct's fetch keeps its figures (from 25 Oct)");
      assert.deepEqual((await s.findFetch({ seedKey: "seed:b", location: "PK", language: "en", since: "2026-10-01" })).rows.map((r) => [r.keyword, r.volume]), [["oet fee", 880], ["oet dates", 120], ["oet at home", 40]], "biggest first");
      assert.deepEqual((await s.keywordsAt({ location: "PK", language: "en" })).map((r) => [r.keyword, r.volume]), [["oet fee", 880], ["oet dates", 120], ["oet at home", 40]]);
      await save("2026-10-27", "file:x", [["oet fee", 880]], "file");
      assert.deepEqual((await s.fileKeywords({ phrases: ["oet fee"], location: "PK", language: "en" })).rows.map((r) => [r.keyword, r.volume]), [["oet fee", 880]], "a file's keyword unchanged since an earlier day still has its figure");
    } finally { await s.close(); }
  });
}
