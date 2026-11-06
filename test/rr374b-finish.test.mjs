/**
 * 🔴 RR-374b (owner, 5 Nov 2026): extraction on Sonnet and priced, the judge on Opus; a national body that keeps a national register or sets rules is never "the body that registers"; the India lines from the law; two pages never share a description; route c waits once and is said when off.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractAnswer, confirmAnswer, findOne, keyOf, FINDER } from "../desktop/answer-finder.mjs";
import { PRICES, costOf } from "../desktop/ai-coach.mjs";
import { AI } from "../desktop/ai-write.mjs";
import { JUDGE } from "../desktop/qa-judge.mjs";
import { councilFacts, correctedCouncils, COUNCIL_CORRECTIONS, councilKey, REGISTERS_BELOW_NATION } from "../desktop/council-truth.mjs";
import { uniqueDescriptions } from "../desktop/seo-pages.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const reply = (data, model) => ({ ok: true, status: 200, json: async () => ({ model, usage: { input_tokens: 1000, output_tokens: 100 }, content: [{ type: "text", text: JSON.stringify(data) }] }) });

test("extraction asks Sonnet, the judge and the page judge ask Opus; Sonnet has a price, so the month's limit sees it", async () => {
  const asked = []; const fetchImpl = async (_u, init) => { const b = JSON.parse(init.body); asked.push([b.system.slice(0, 12), b.model]); return reply({ found: false, fits: true, sourceOk: true, conflict: false, reason: "x", answer: "", quote: "", publisher: "", kind: "other" }, b.model); };
  const x = await extractAnswer({ key: "k", question: "Q?", page: { title: "T", text: "words" }, url: "https://a.b/c", fetchImpl }), y = await confirmAnswer({ key: "k", question: "Q?", answer: "A", quote: "B", url: "https://a.b/c", title: "T", fetchImpl });
  assert.deepEqual(asked.map((a) => a[1]), ["claude-sonnet-5-5", AI.model]); assert.equal(AI.model, "claude-opus-5-5"); assert.equal(JUDGE.model, "claude-opus-5-5"); assert.equal(x.usage.model, "claude-sonnet-5-5"); assert.equal(y.usage.model, "claude-opus-5-5");
  assert.ok(PRICES[FINDER.extractModel], "no price would count as $0"); assert.equal(costOf({ model: "claude-sonnet-5-5", input: 1e6, output: 1e6 }), 12); assert.equal(costOf({ model: "claude-opus-5-5", input: 1e6, output: 1e6 }), 24);
});

const INDIA = /\bIn India\b|\bin India\b/;
test("the India lines: the owner's words for dentists; doctors, nurses, pharmacists, vets say who registers; none calls the national body the one that registers; each has an official source", () => {
  const rows = COUNCIL_CORRECTIONS.filter((r) => r.country === "India" && !r.stepsOnly), by = (p) => rows.find((r) => r.profession === p);
  assert.equal(by("dentistry").text, "In India, dentists register with their State Dental Council; the National Dental Commission's Ethics and Dental Registration Board keeps the national register (formerly the Dental Council of India; its site is still dciindia.gov.in).");
  assert.match(by("dentistry").link, /indiacode\.nic\.in/); assert.match(by("medicine").text, /State Medical Council/); assert.match(by("medicine").link, /nmc\.org\.in/); assert.match(by("nursing").text, /State Nursing Council/); assert.match(by("pharmacy").text, /State Pharmacy Councils? register/); assert.match(by("veterinary science").text, /State Veterinary Register/);
  for (const r of rows) { assert.doesNotMatch(r.text, /(?:Commission|Indian Nursing Council|Council of India)\b[^.;]{0,40}\bregisters\b/, r.text); assert.ok(INDIA.test(r.text), r.text); assert.match(r.link, /(?:\.nic\.in|\.gov\.in|nmc\.org\.in|indiannursingcouncil\.org)/, r.link); }
  const out = correctedCouncils([{ part: "home-council", country: "India", profession: "dentistry", councilName: "National Dental Commission", text: "National Dental Commission registers dentists in India.", link: "https://dciindia.gov.in/x", on: "2026-10-26" }]); assert.equal(out.filter((f) => f.country === "India" && f.profession === "dentistry").length, 1, "the collectors' line is gone"); assert.doesNotMatch(out.find((f) => f.profession === "dentistry").text, /Commission registers/);
});

const fact = (country, profession, name, extra = {}) => ({ part: "home-council", country, profession, councilName: name, text: `${name} registers ${profession} in ${country}.`, link: "https://x.example/a", website: "https://x.example", on: "2026-11-01", ...extra });
test("India, the United States, Canada: every path that used to say 'registers' is the office line now: its page 'confirmed', a search found it, the owner's verified facts; a state's own council and every other country stay", () => {
  const ok = (c, p, n) => ({ [councilKey(c, p, n)]: { ok: true, evidence: "https://x.example/e", on: "2026-11-01" } });
  for (const [c, p, n] of [["India", "veterinary science", "Some National Council"], ["Canada", "medicine", "Medical Council of Canada"], ["United States", "optometry", "National Board of Examiners in Optometry (NBEO)"]]) { const { facts, changes } = councilFacts([fact(c, p, n)], ok(c, p, n)); assert.equal(facts[0].office, true, n); assert.match(facts[0].text, /Whether it is the registering body is not confirmed yet\./); assert.doesNotMatch(facts[0].text, /\bregisters\b/); assert.equal(changes.length, 1); }
  const verified = { part: "councils", verified: true, country: "India", profession: "dentistry", link: "https://x.example/v", on: "2026-11-01" }, viaOwner = councilFacts([fact("India", "dentistry", "Some Commission"), verified], {}).facts[0]; assert.equal(viaOwner.office, true, "the owner's verified facts do not make a national body the one that registers");
  const viaSearch = councilFacts([fact("Canada", "nursing", "National Nursing Assessment Service")], { [councilKey("Canada", "nursing", "National Nursing Assessment Service")]: { ok: false, why: "not stated", found: { name: "Another National Body", link: "https://x.example/f" } } }).facts[0]; assert.doesNotMatch(viaSearch.text, /\bregisters\b/);
  const state = councilFacts([fact("India", "medicine", "Karnataka State Medical Council")], ok("India", "medicine", "Karnataka State Medical Council")).facts[0]; assert.match(state.text, /registers medicine in its own state of India/);
  const uk = councilFacts([fact("United Kingdom", "medicine", "General Medical Council")], ok("United Kingdom", "medicine", "General Medical Council")).facts[0]; assert.match(uk.text, /General Medical Council registers/); assert.equal(uk.office, undefined);
  const assoc = councilFacts([fact("India", "dietetics", "Indian Dietetic Association")], { [councilKey("India", "dietetics", "Indian Dietetic Association")]: { ok: false, why: "association", page: "https://x.example/p", on: "2026-11-01" } }).facts[0]; assert.match(assoc.text, /not confirmed yet/, "a reason already read stays: not confirmed"); assert.doesNotMatch(assoc.text, /\(a professional body\)|\bregisters\b/, "Q&A LAW 5.3 (RR-378b): name, address or site and 'not confirmed yet' only — no label its source does not give");
  assert.equal(REGISTERS_BELOW_NATION.test("Australia"), false, "Ahpra is the national registering body");
});

const b = (title, url, meta) => ({ title, url, html: `<html><head><title>${title}</title><meta name="description" content="${meta}"></head></html>` }), metaOf = (x) => /<meta name="description" content="([^"]*)"/.exec(x.html)[1];
test("two pages never share a description: the later one opens with its own title, within the length; an entity is not cut; what the client wrote is left", () => {
  const out = uniqueDescriptions([b("OET for Physiotherapists in Singapore", "/a", "OET photo requirements? How much?"), b("OET for Physiotherapists in the United Kingdom", "/b", "OET photo requirements? How much?"), b("Other", "/c", "Something else.")]);
  assert.equal(metaOf(out[0]), "OET photo requirements? How much?", "the first stays"); assert.equal(metaOf(out[1]), "OET for Physiotherapists in the United Kingdom: OET photo requirements? How much?"); assert.equal(metaOf(out[2]), "Something else."); assert.equal(new Set(out.map(metaOf)).size, 3);
  const long = "word &amp; ".repeat(40).trim(), L = uniqueDescriptions([b("A", "/1", long), b("B page", "/2", long)]); assert.ok(metaOf(L[1]).length <= 160, String(metaOf(L[1]).length)); assert.doesNotMatch(metaOf(L[1]), /&[a-z]*…$/); assert.match(metaOf(L[1]), /^B page: /);
  const same = uniqueDescriptions([b("Same", "/1", "M"), b("Same", "/2", "M"), b("Same", "/3", "M")]); assert.equal(new Set(same.map(metaOf)).size, 3, "even with one title");
  const kept = uniqueDescriptions([b("Mine", "/edited", "M"), b("Other", "/2", "M")], { keep: (x) => x.url === "/edited" }); assert.equal(metaOf(kept[0]), "M"); assert.equal(metaOf(kept[1]), "Other: M");
  assert.match(read("desktop/seo-pages.mjs"), /built = uniqueDescriptions\(built, \{ keep: \(b\) => typeof overrides\[b\.url\] === "string" \}\);[^\n]*\n\s*const now = new Date\(on\)\.toISOString\(\);/, "before the gates");
});

test("route c: after a waited-for answer the question goes straight to Google's results; the run waits once, inside the queue's limit, never when the AI's limit stopped it; no cap is touched", async () => {
  const off = "https://mohfw.gov.in/vets-register", text = "A vet applies to the Veterinary Council of Ireland using the registration form.", row = { key: keyOf("How do vets register in Ireland?"), part: "questionsa", question: "How do vets register in Ireland?", cls: "truth", link: null, body: null }; let ai = 0;
  const r = await findOne(row, { on: "2026-11-05", key: "k", read: async () => ({ ok: true, url: off, title: "Register", text }), prev: { again: true, triedA: true }, search: async () => [{ url: off }], fetchImpl: async (_u, init) => { ai++; const m = JSON.parse(init.body); return m.system.startsWith("You read one") ? reply({ found: true, answer: "A vet applies to the council using its form.", quote: text, publisher: "", kind: "other" }, m.model) : reply({ fits: true, sourceOk: true, conflict: false, reason: "ok" }, m.model); } });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.route, "c"); assert.equal(ai, 2);
  const m = read("desktop/main.mjs"); assert.match(m, /if \(mayWait && !r\.stopped && capped && rows\.some\(\(x\) => kept\[x\.key\]\?\.again\)\) \{ waited = true;/); assert.match(m, /await collectQueued\(\{ ledger: l, login: KEYS\.get\(DFS_KEYS\.login\)/); assert.match(m, /seedOf\(store\.read\(id\)\), !waitedForGoogle && CONFIG\.testOffline !== true\)/); assert.match(m, /waitedForGoogle \|\|= looked\.waited === true/); assert.match(m, /searchOff: Boolean\(looked\.searchOff\)/);
  assert.equal(FINDER.maxSearches, 500); assert.doesNotMatch(read("desktop/answer-finder.mjs"), /capDay|capMonth|aiMonthlyCapUSD/);
});
