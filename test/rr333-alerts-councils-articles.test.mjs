/**
 * RR-333 (owner GREEN, 27 Oct 2026, the night round): every collector's 3-day red line (the test dates and the Search Console reader too);
 * the owner's councils (to verify on each council's own site; his to approve when it cannot be read or he doubts it); his blocked private
 * sites never read; and the buyer walk's article defects (an answer of the wrong kind, a heading glued to a fact, a heading's first word
 * taken as a name, one new article that could never be published, the same card twice). Every name, site and figure is invented, except
 * the owner's own council list (desktop/owner-councils.mjs) — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCountryFacts } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { ownerStatus } from "../site/owner-status.mjs";
import { runSearchConsole } from "../site/gsc.mjs";
import { FIX } from "../site/health.mjs";
import { refuseBlocked, blockedSource, BLOCKED_SOURCES } from "../desktop/country-facts.mjs";
import { OWNER_COUNCILS } from "../desktop/owner-councils.mjs";
import { answersFromSite, answerKindOf, casingOf, seoPages } from "../desktop/seo-pages.mjs";
import { readPage } from "../desktop/site-read.mjs";
import { councilQuestion, ruleQuestion, testDatesQuestion, officialAnswerQuestion, productQuestion } from "../site/cf-ai.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T10:00:00Z`);
const dayBefore = (n) => new Date(T0 - n * 864e5).toISOString().slice(0, 10);
function fakeKv() { const m = new Map(); const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) }); return { m, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) }; }
const GSC_ENV = { GOOGLE_ADS_CLIENT_ID: "client-id-invented-000", GOOGLE_ADS_CLIENT_SECRET: "secret-invented-00000", GOOGLE_ADS_REFRESH_TOKEN: "refresh-invented-0000" };

test("B4 · RR-333: the test-dates collector and the Search Console reader have their 3-day red line; a skipped weekly read is a good day", async () => {
  const K = fakeKv();
  for (const n of [1, 2, 3]) K.m.set(`av:health:dates:${dayBefore(n)}`, JSON.stringify({ day: dayBefore(n), runs: 2, progress: 0, keywords: 0, facts: 0, aiUsd: 0, finished: [], stops: { AI_KEY: 2 }, lastCode: "AI_KEY", lastWhy: "ANTHROPIC_API_KEY is not set in Vercel — no test dates can be searched." }));
  for (const n of [1, 2, 3]) K.m.set(`av:health:gsc:${dayBefore(n)}`, JSON.stringify({ day: dayBefore(n), runs: 1, progress: 0, keywords: 0, facts: 0, aiUsd: 0, finished: [], stops: { GSC: 1 }, lastCode: "GSC", lastWhy: "Search Console answered 500." }));
  const s = await ownerStatus({ kv: K.kv, cf: cfMemoryStore(), env: GSC_ENV, now: () => T0 });
  const red = Object.fromEntries(s.red.map((r) => [r.collector, r]));
  assert.match(red.dates?.line ?? "", /^The test-dates collector has failed 3 days in a row — last reason: ANTHROPIC_API_KEY/); assert.equal(red.dates.fix, FIX.AI_KEY);
  assert.match(red.gsc?.line ?? "", /^The Search Console reader has failed 3 days in a row/); assert.equal(red.gsc.fix, FIX.GSC);
  /* not signed in to Google: no Search Console red line (the sign-in has its own line) */
  assert.equal((await ownerStatus({ kv: K.kv, cf: cfMemoryStore(), env: {}, now: () => T0 })).red.some((r) => r.collector === "gsc"), false);
  /* the weekly read already done: the day is recorded as a good one (never a false red line after 3 quiet days) */
  const G = fakeKv(); G.m.set("av:gsc:last", JSON.stringify({ at: `${dayBefore(2)}T15:17:00Z`, ok: true }));
  const r = await runSearchConsole({ env: GSC_ENV, kv: G.kv, now: () => T0, fetchImpl: async () => { throw new Error("no network in this test"); } });
  assert.equal(r.skipped, true); assert.equal(JSON.parse(G.m.get(`av:health:gsc:${ON}`)).progress, 1);
});

test("Councils · RR-333: the owner's councils are tried first on their OWN site — confirmed with his address when it stands there; his to approve when the site cannot be read (address kept, said so) or he doubts it; never replaced by an unconfirmed one", async () => {
  const pages = {
    "https://nnc.org.np/": { ok: true, url: "https://nnc.org.np/", title: "Nepal Nursing Council", h1: "Nepal Nursing Council", text: "Nepal Nursing Council. Contact: Bansbari, Kathmandu, P.O. Box 12541." },
    "https://egyptianursingsyndicate.org/": { ok: true, url: "https://egyptianursingsyndicate.org/", title: "Egyptian Nursing Syndicate", h1: "Egyptian Nursing Syndicate", text: "Egyptian Nursing Syndicate, 5 El Saraya Street, El Manial, Cairo." },
    "https://ems.org.eg/": { ok: true, url: "https://ems.org.eg/", title: "Egyptian Medical Syndicate", h1: "", text: "Egyptian Medical Syndicate — 42 Al Qasr Al Aini Street, Cairo." },
  };
  const read = []; const reader = { read: async (u) => { read.push(u); return pages[u] ?? { ok: false, url: u, why: "the site refused our server (403)", checkedOn: ON }; }, raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => read.length };
  const store = cfMemoryStore();
  await store.setTask("*", "fee", { day: ON, state: "done" }); await store.setTask("*", "centres", { day: ON, state: "done" });
  for (const c of ["Nepal", "Egypt"]) for (const t of ["questions", "rules"]) await store.setTask(c, t, { day: ON, state: "done" });
  await runCountryFacts({ store, reader, env: {}, now: () => T0, budgetMs: 1e9, countries: ["Nepal", "Egypt"], products: ["oet"] });
  const f = async (c, p) => (await store.facts({ country: c })).find((x) => x.part === "councils" && x.profession === p);
  const nn = await f("Nepal", "nursing"), nm = await f("Nepal", "medicine"), en = await f("Egypt", "nursing"), em = await f("Egypt", "medicine");
  assert.deepEqual([nn.status, nn.proposedBy, nn.value.address], ["confirmed", "owner-input", "Bansbari, Kathmandu (P.O. Box 12541)"], "read on its own site");
  assert.deepEqual([nm.status, nm.value.address, nm.value.addressFrom], ["unconfirmed", "Bansbari, Kathmandu (P.O. Box 13890)", "the owner's input — not yet read on its official page"]);
  assert.match(nm.why, /^yours, to verify — its official site could not be read from our server \(the site refused our server \(403\)\); approve it if it is right$/);
  assert.equal(en.status, "unconfirmed", "the owner doubts this site: never confirmed by itself"); assert.match(en.why, /^yours, to verify — the owner asks to confirm/);
  assert.equal(em.status, "confirmed");
  /* section A: 13 bodies, 16 country × profession pairs, plus 2 of section B (no address copied) */
  assert.equal(new Set(OWNER_COUNCILS.map((x) => x.name)).size, 15); assert.equal(OWNER_COUNCILS.length, 18);
  assert.equal(OWNER_COUNCILS.find((x) => x.country === "Bangladesh" && x.profession === "medicine").address, null, "BNMC's address is never copied for BMDC");
});

test("Blocked · RR-333: the owner's private sites are never read — by any collector's reader", async () => {
  assert.deepEqual([...BLOCKED_SOURCES], ["nle.ph", "board.com.ph", "prescriply.bd", "felixhappich.com"]);
  const asked = []; const r = refuseBlocked({ read: async (u) => { asked.push(u); return { ok: true, url: u, text: "x" }; }, requests: () => asked.length });
  for (const u of ["https://nle.ph/schedule", "https://www.board.com.ph/x", "https://prescriply.bd/", "https://felixhappich.com/uae", "https://sub.nle.ph/"]) { const p = await r.read(u); assert.equal(p.ok, false, u); assert.match(p.why, /blocked as a source/); }
  assert.equal(asked.length, 0); assert.equal((await r.read("https://prc.gov.ph/")).ok, true); assert.equal(blockedSource("https://notnle.ph/"), false);
  /* the owner's search pattern (27 Oct): the name first, then "official website and contact details for <name> <country> head office address" */
  const cq = councilQuestion({ country: "Ghana", subject: "OET", professions: ["nursing"] }).prompt, rq = ruleQuestion({ country: "Ghana", subject: "OET" }).prompt, dq = testDatesQuestion({ test: "OET", owners: "oet.com", countries: ["Ghana"], today: ON }).prompt;
  assert.match(cq, /"<profession> regulatory council Ghana"/); assert.match(cq, /"official website and contact details for <that name> Ghana head office address"/); assert.match(cq, /syndicate/);
  assert.match(rq, /"official requirements for <profession> registration Ghana"/); assert.match(dq, /"official OET test dates <country> 2026"/);
  assert.match(officialAnswerQuestion({ country: "Pakistan", subject: "OET", subjectSite: "https://oet.com", groups: [] }).system, /"official <question> Pakistan".*"<question> site:<the official body's domain>".*"<question> tips", "<question> experience"/s);
  assert.match(productQuestion({ country: "Kenya", name: "IELTS", parts: ["fee"], info: { fee: { ask: "the fee" } } }).prompt, /"official IELTS exam fee Kenya \d{4}"/);
  for (const p of [cq, rq, dq]) assert.match(p, /nle\.ph, board\.com\.ph, prescriply\.bd, felixhappich\.com/);
});

test("Articles · RR-333 (the buyer walk): an answer of the question's KIND; no heading glued to a fact; a heading's first word is not a name; ONE new article can be published (it links the buyer's own pages); one card per value", () => {
  assert.deepEqual(["How much does a dental implant cost", "how long does teeth whitening take", "when is the next intake", "how many visits for braces", "dentist leeds"].map(answerKindOf), ["price", "duration", "date", "count", null]);
  const site = { ok: true, origin: "https://clinic.example", readOn: ON, pages: [
    { url: "https://clinic.example/", qa: [], facts: ["A dental implant at the clinic takes 3 to 6 months from first visit to final crown."], title: "Clinic", h1: "Family dentist", h2: [] },
    { url: "https://clinic.example/prices", qa: [], facts: ["A dental implant at the clinic costs £2,400 per tooth."], title: "Prices", h1: "Prices", h2: [] }] };
  assert.deepEqual(answersFromSite("how much does a dental implant cost", site).map((a) => a.link), ["https://clinic.example/prices"], "a duration never answers a price");
  assert.deepEqual(answersFromSite("how long does a dental implant take", site).map((a) => a.link), ["https://clinic.example/"], "\"takes 3 to 6 months\" answers how long");
  const pg = readPage('<html><head><title>Dental implants</title></head><body><main><h1>Dental implants</h1><p>A dental implant at the clinic takes 3 to 6 months in all.</p></main></body></html>', "https://clinic.example/implants");
  assert.ok(pg.facts.includes("A dental implant at the clinic takes 3 to 6 months in all."), JSON.stringify(pg.facts));
  assert.equal(casingOf({ pages: [{ title: "Dental implants", h1: "Dental implants", h2: [], lead: [], facts: [] }] }).has("dental"), false);
  /* one new article: answered on two of the buyer's pages, linking them — ready to publish (links in come after publishing) */
  const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title><meta name="description" content="${t} at the clinic"></head><body><nav><a href="/">Home</a> <a href="/whitening">Whitening</a></nav><main>${b}</main><footer>Clinic</footer></body></html>`;
  const two = { ok: true, origin: "https://clinic.example", readOn: ON, robotsTxt: "User-agent: *\nAllow: /\n", sitemapUrls: null, pages: [
    readPage(page("Clinic", "<h1>Family dentist</h1><p>Teeth whitening at the clinic takes 60 minutes in one visit.</p>"), "https://clinic.example/"),
    readPage(page("Teeth whitening", "<h1>Teeth whitening</h1><p>Teeth whitening at the clinic is done in one visit of 60 minutes, with results the same day.</p>"), "https://clinic.example/whitening")] };
  const out = seoPages({ site: two, searchConsole: { queries: [{ query: "how long does teeth whitening take", impressions: 70 }], window: "28 days" }, on: `${ON}T10:00:00Z` });
  assert.equal(out.drafts.length, 1, JSON.stringify(out.plan.map((p) => [p.kind, p.question, p.why])));
  assert.equal(out.drafts[0].readyAsDraft, true, JSON.stringify(out.drafts[0].gates.filter((g) => g.failing.length)));
  assert.equal((out.drafts[0].html.match(/class="v">60 minutes</g) ?? []).length, 1, "the same card twice");
});
