/**
 * F12 · INTENT AND QUESTION CLUSTERING (acceptance _handoffs d960fa8, AlmiVisibility_F12_ACCEPTANCE_2026-10-13.md).
 *
 * Fixtures DRIVE the rules (neutral stand-ins, hand-counted): one firing control per clause — it passes on a lawful grouping and fails
 * alone, for its own reason. The REAL tests read the declared product's own stored phrases, recorded questions, recorded grouping and
 * need records from its research batch and report counts only — never a wording. Nothing is fetched; the production trail is not
 * written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { inputsOf, cleanerOf, clusterInputs, clusterFaults, countsOf, sampleItems, ownerSampleVerdict, realPopulation, rowVerdict, REFUSAL, CLUSTER_RECORD, SAMPLE_RECORD, PLACES, JOINS, MAKERS, SAMPLE } from "../src/discovery/need-clusters.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailBefore = createHash("sha256").update(readFileSync(TRAIL)).digest("hex");
const CODE = ["src/discovery/need-clusters.mjs", "bin/need-clusters.mjs", "config/discovery/need-clusters.mjs"];
const text = (p) => readFileSync(join(REPO, p), "utf8");
/** code without its comments: what runs, not what explains */
const running = (p) => text(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/* ── neutral fixtures ── */
const DAY = "2026-09-01";
const phrase = (id, wording, label = "OBSERVED") => ({ record_type: "search_phrase", phrase_id: id, phrase: wording, label });
const asked = (id, wording) => ({ record_type: "public_question", question_id: id, value: { original: wording, kind: "OBSERVED" } });
const derived = (id, wording) => ({ record_type: "research_derived_question", question_id: id, wording: { text: wording }, tier: "RESEARCH-DERIVED" });
const WORLD = () => ({
  phrases: [phrase("p1", "widget fee"), phrase("p2", "Widget Fee?"), phrase("p3", "wdgt price", "THE SOURCE'S OWN REPORT"), phrase("p4", "widget login"), phrase("p5", "widget"), phrase("p6", "widget licence in atlantis")],
  publicQuestions: [asked("q1", "How much is a widget?")],
  derivedQuestions: [derived("d1", "Widget kitne ka hai?"), derived("d2", "Which licence does a fitter need?")],
});
const AI = { kind: "AI", name: "a model", on: DAY }, OWNER = { kind: "OWNER", name: "the owner", on: DAY };
const FACT = { statement: "the licence fee in Atlantis is set by its own board", reference: "facts.json#atlantis-1" };
const NEED = (over = {}) => ({ need: "cost", title: "What does a widget cost?", reason: "every wording asks the price", decidedBy: AI, wordings: ["widget fee", "wdgt price", "How much is a widget?", "Widget kitne ka hai?"], ...over });
const LICENCE = (over = {}) => ({ need: "licence", title: "Which licence?", reason: "every wording asks which licence is needed", decidedBy: AI, wordings: ["Which licence does a fitter need?"],
  countryParts: [{ country: "Atlantis", fact: FACT, wordings: ["widget licence in atlantis"] }], ...over });
const GROUPING = (over = {}) => ({ cleanUp: ["case", "spaces", "end-punctuation"], needs: [NEED(), LICENCE()], navigational: [{ wording: "widget login", reason: "the searcher wants the maker's own site", decidedBy: OWNER }], noNeedYet: ["widget"], ...over });
const run = (grouping = GROUPING(), world = WORLD()) => { const i = inputsOf(world); return { ...clusterInputs({ inputs: i.inputs, unread: i.unread, grouping, on: DAY }), given: i.inputs }; };
const codes = (grouping, world) => [...new Set(run(grouping, world).refused.map((r) => r.code))].sort();
const needsWith = (...changes) => GROUPING({ needs: [NEED(changes[0] ?? {}), LICENCE(changes[1] ?? {})] });
const byNeed = (r, id) => r.records.find((x) => x.need === id);

/* ================= C1 ================= */

test("C1 · FIRING CONTROL: every stored phrase and recorded question is read and ends in exactly one place — a need, \"navigational — no page\" or \"no need yet\" — its wording word for word; a lost one, one in two places, an unnamed place and an unread record each refuse the whole grouping", () => {
  const r = run();
  assert.deepEqual([r.refused.length, r.given.length], [0, 9]);
  assert.deepEqual([PLACES.NEED, PLACES.NAVIGATIONAL, PLACES.NO_NEED_YET], ["A NEED", "navigational — no page", "no need yet"]);
  assert.deepEqual(r.records.map((x) => [x.record_type, x.place, x.need ?? x.wording ?? null, x.inputs]), [[CLUSTER_RECORD, "A NEED", "cost", 5], [CLUSTER_RECORD, "A NEED", "licence", 2], [CLUSTER_RECORD, "navigational — no page", "widget login", 1], [CLUSTER_RECORD, "no need yet", null, 1]]);
  const placed = r.records.flatMap((x) => x.members);
  assert.deepEqual(placed.map((m) => m.inputId).sort(), r.given.map((i) => i.inputId).sort(), "an input is in no place, or in two");
  for (const m of placed) assert.equal(m.wording, r.given.find((i) => i.inputId === m.inputId).wording, "an original wording was changed");
  assert.deepEqual(byNeed(r, "cost").members.map((m) => m.wording).sort(), ["How much is a widget?", "Widget Fee?", "Widget kitne ka hai?", "wdgt price", "widget fee"]);
  assert.deepEqual(clusterFaults({ records: r.records, inputs: r.given }), []);
  assert.deepEqual([r.counts.inputs, r.counts.phrases, r.counts.questions, r.counts.inNeed, r.counts.navigational, r.counts.noNeedYet, r.counts.needs], [9, 6, 3, 7, 1, 1, 2]);
  /* each failure, alone, for its own reason — and nothing is half-clustered */
  const lost = run(GROUPING({ noNeedYet: [] }));
  assert.deepEqual([[...new Set(lost.refused.map((x) => x.code))], lost.refused[0].inputId, lost.records.length, lost.counts], [[REFUSAL.NO_PLACE], "search_phrase:p5", 0, null]);
  assert.deepEqual(codes(GROUPING({ noNeedYet: ["widget", "widget fee"] })), [REFUSAL.TWO_PLACES]);
  assert.deepEqual(codes(needsWith({}, { wordings: ["Which licence does a fitter need?", "wdgt price"] })), [REFUSAL.TWO_PLACES]);
  assert.deepEqual(codes(GROUPING({ maybe: ["widget"], noNeedYet: [] })).sort(), [REFUSAL.NO_PLACE, REFUSAL.PLACE].sort());
  assert.deepEqual(codes(GROUPING({ maybe: [] })), [REFUSAL.PLACE]);
  const world = WORLD(); world.phrases.push({ record_type: "search_phrase", phrase_id: "p9", phrase: "  ", label: "OBSERVED" }); world.publicQuestions.push({ record_type: "public_question", question_id: "q9", value: {} });
  assert.deepEqual(inputsOf(world).unread, ["search_phrase:p9", "public_question:q9"], "a record with no wording was skipped silently");
  assert.deepEqual(codes(GROUPING(), world), [REFUSAL.NOT_READ]);
  assert.deepEqual(clusterInputs({ inputs: inputsOf(WORLD()).inputs, grouping: GROUPING(), on: "soon" }).refused.map((x) => x.code), [REFUSAL.NO_DATE]);
  /* the stored records, read back: each fault alone */
  const tamper = (f) => { const copy = JSON.parse(JSON.stringify(r.records)); f(copy); return [...new Set(clusterFaults({ records: copy, inputs: r.given }).map((x) => x.code))].sort(); };
  assert.deepEqual(tamper((c) => { c[0].members[0].wording = c[0].members[0].wording.toLowerCase() + " "; }), [REFUSAL.CHANGED]);
  assert.deepEqual(tamper((c) => { c[0].members.pop(); }), [REFUSAL.NO_PLACE]);
  assert.deepEqual(tamper((c) => { c[3].members.push(c[0].members[0]); }), [REFUSAL.TWO_PLACES]);
  assert.deepEqual(tamper((c) => { c[3].place = "later"; }), [REFUSAL.PLACE]);
});

/* ================= C2 ================= */

test("C2 · FIRING CONTROL: the same meaning is ONE need — another language and an abbreviation join by a recorded judgement, a wording identical after the DECLARED clean-up joins by that; never by a score, never by an undeclared step; a merely similar wording joins nothing; a country alone never splits", () => {
  const r = run();
  const cost = byNeed(r, "cost");
  assert.deepEqual(Object.fromEntries(cost.members.map((m) => [m.wording, m.joinedBy])), { "widget fee": JOINS.JUDGEMENT, "Widget Fee?": JOINS.IDENTICAL, "wdgt price": JOINS.JUDGEMENT, "How much is a widget?": JOINS.JUDGEMENT, "Widget kitne ka hai?": JOINS.JUDGEMENT });
  assert.deepEqual([cost.wordings, cost.inputs, r.counts.joins[JOINS.IDENTICAL], r.counts.joins[JOINS.JUDGEMENT]], [4, 5, 1, 6]);
  assert.deepEqual(Object.values(JOINS).length, 2);
  /* similar is not identical: one letter more and no judgement names it — it joins nothing */
  const similar = WORLD(); similar.phrases.push(phrase("p7", "widget fees"));
  const s = run(GROUPING(), similar);
  assert.deepEqual(s.refused.map((x) => [x.code, x.inputId]), [[REFUSAL.NO_PLACE, "search_phrase:p7"]], "a merely similar wording was joined to a need");
  /* the clean-up is the DECLARED one: without the case step the capitalised wording is not identical; an unknown step refuses */
  assert.deepEqual(run(GROUPING({ cleanUp: ["spaces", "end-punctuation"] })).refused.map((x) => [x.code, x.inputId]), [[REFUSAL.NO_PLACE, "search_phrase:p2"]]);
  assert.deepEqual(run(GROUPING({ cleanUp: ["case", "spaces"] })).refused.map((x) => [x.code, x.inputId]), [[REFUSAL.NO_PLACE, "search_phrase:p2"]]);
  assert.deepEqual(codes(GROUPING({ cleanUp: ["case", "spaces", "end-punctuation", "stemming"] })), [REFUSAL.STEP]);
  assert.deepEqual([cleanerOf(["case", "spaces", "end-punctuation"]).clean("  Widget   Fee?! "), cleanerOf([]).clean(" Widget Fee?"), [...cleanerOf(["stemming"]).unknown]], ["widget fee", " Widget Fee?", ["stemming"]]);
  /* never by a score */
  for (const f of ["score", "similarity", "threshold", "distance", "confidence", "model"]) {
    assert.deepEqual(codes(needsWith({ [f]: 0.9 })), [REFUSAL.SCORE], f);
    assert.deepEqual(codes(GROUPING({ [f]: 0.9 })), [REFUSAL.SCORE], `grouping ${f}`);
  }
  /* what a recorded judgement joins is not left in two needs */
  assert.deepEqual(run(GROUPING({ judgedSame: [["widget fee", "wdgt price"]] })).refused.length, 0);
  assert.deepEqual(codes(GROUPING({ judgedSame: [["widget fee", "Which licence does a fitter need?"]] })), [REFUSAL.APART]);
  assert.deepEqual(codes(GROUPING({ judgedSame: [["widget fee", "never named"]] })), [REFUSAL.APART]);
  /* a country never makes a need of its own */
  assert.deepEqual(codes(needsWith({ country: "Atlantis" })), [REFUSAL.COUNTRY_SPLIT]);
  assert.deepEqual(codes(needsWith({ jurisdiction: "Atlantis" })), [REFUSAL.COUNTRY_SPLIT]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "cost", by: "country", fact: FACT } })), [REFUSAL.COUNTRY_SPLIT]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "cost", by: " Jurisdiction ", fact: FACT } })), [REFUSAL.COUNTRY_SPLIT]);
});

/* ================= C3 ================= */

test("C3 · FIRING CONTROL: a country that changes the verified answer stays INSIDE the one need as a part naming its country and its fact; another difference makes a different need only with the fact named; no page-level decision is made here", () => {
  const r = run();
  const licence = byNeed(r, "licence");
  assert.deepEqual([licence.countryParts.length, licence.countryParts[0].country, licence.countryParts[0].fact, licence.inputs, r.counts.needs, r.counts.needsWithCountryParts], [1, "Atlantis", FACT, 2, 2, 1], "the country's wording did not stay inside the one need");
  assert.ok(licence.members.some((m) => m.wording === "widget licence in atlantis"));
  assert.deepEqual(codes(needsWith({}, { countryParts: [{ fact: FACT, wordings: ["widget licence in atlantis"] }] })), [REFUSAL.PART_COUNTRY]);
  assert.deepEqual(codes(needsWith({}, { countryParts: [{ country: "Atlantis", wordings: ["widget licence in atlantis"] }] })), [REFUSAL.PART_FACT]);
  assert.deepEqual(codes(needsWith({}, { countryParts: [{ country: "Atlantis", fact: { statement: "it differs" }, wordings: ["widget licence in atlantis"] }] })), [REFUSAL.PART_FACT]);
  assert.deepEqual(codes(needsWith({}, { countryParts: [{ country: "Atlantis", fact: { reference: "facts.json#1" }, wordings: ["widget licence in atlantis"] }] })), [REFUSAL.PART_FACT]);
  /* a different need by another difference: kept with its fact, refused without */
  const kept = run(needsWith({}, { differsFrom: { need: "cost", by: "TRADE", fact: FACT } }));
  assert.deepEqual([kept.refused.length, byNeed(kept, "licence").differsFrom, kept.counts.needsDifferingByAFact, byNeed(kept, "cost").differsFrom], [0, { need: "cost", by: "TRADE", fact: FACT }, 1, undefined]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "cost", by: "TRADE" } })), [REFUSAL.SPLIT_FACT]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "cost", by: "TRADE", fact: { statement: "it differs" } } })), [REFUSAL.SPLIT_FACT]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "cost", fact: FACT } })), [REFUSAL.SPLIT_FACT]);
  assert.deepEqual(codes(needsWith({}, { differsFrom: { need: "no such need", by: "TRADE", fact: FACT } })), [REFUSAL.SPLIT_FACT]);
  /* a corrected need is a NEW record: a changed country part, a changed fact or a changed reason never hides under the old record's key */
  assert.equal(byNeed(run(), "licence").measurement_key, licence.measurement_key);
  const other = { statement: "the licence fee in Atlantis is set by its harbour office", reference: "facts.json#atlantis-2" };
  assert.notEqual(byNeed(run(needsWith({}, { countryParts: [{ country: "Atlantis", fact: other, wordings: ["widget licence in atlantis"] }] })), "licence").measurement_key, licence.measurement_key, "a corrected country part kept the old record's key");
  assert.notEqual(byNeed(run(needsWith({}, { reason: "every wording asks which licence a fitter must hold" })), "licence").measurement_key, licence.measurement_key, "a corrected reason kept the old record's key");
  assert.notEqual(byNeed(kept, "licence").measurement_key, licence.measurement_key, "a need that now names the fact it differs by kept the old record's key");
  /* which audience gets a page is not decided here */
  for (const f of ["page", "pages", "separatePage", "audiencePage", "pageCandidate", "url", "slug"]) {
    assert.deepEqual(codes(needsWith({ [f]: "fitters" })), [REFUSAL.PAGE], f);
    assert.deepEqual(codes(GROUPING({ [f]: "fitters" })), [REFUSAL.PAGE], `grouping ${f}`);
  }
});

/* ================= C4 ================= */

test("C4 · FIRING CONTROL: every need has its reason, its maker and its date; a machine's or an AI's grouping is INFERRED and a grouping is never OBSERVED; every wording keeps the label its own source gave it", () => {
  const r = run();
  for (const x of r.records.filter((y) => y.place === PLACES.NEED)) assert.deepEqual([typeof x.reason, x.decidedBy, x.label], ["string", AI, "INFERRED"]);
  assert.deepEqual([MAKERS.AI, MAKERS.MACHINE, MAKERS.OWNER, MAKERS.PERSON, Object.values(MAKERS).includes("OBSERVED")], ["INFERRED", "INFERRED", "DECIDED BY THE OWNER", "JUDGED BY A PERSON", false]);
  assert.deepEqual(byNeed(run(needsWith({ decidedBy: { kind: "MACHINE", name: "a rule", on: DAY } })), "cost").label, "INFERRED");
  assert.deepEqual(byNeed(run(needsWith({ decidedBy: OWNER })), "cost").label, "DECIDED BY THE OWNER");
  assert.deepEqual(codes(needsWith({ reason: " " })), [REFUSAL.REASON]);
  assert.deepEqual(codes(needsWith({ reason: undefined })), [REFUSAL.REASON]);
  assert.deepEqual(codes(needsWith({ decidedBy: undefined })), [REFUSAL.MAKER]);
  assert.deepEqual(codes(needsWith({ decidedBy: { kind: "ORACLE", name: "x", on: DAY } })), [REFUSAL.MAKER]);
  assert.deepEqual(codes(needsWith({ decidedBy: { kind: "AI", on: DAY } })), [REFUSAL.MAKER]);
  assert.deepEqual(codes(needsWith({ decidedBy: { kind: "AI", name: "a model" } })), [REFUSAL.DATE]);
  assert.deepEqual(codes(needsWith({ decidedBy: { kind: "AI", name: "a model", on: "yesterday" } })), [REFUSAL.DATE]);
  assert.deepEqual(codes(needsWith({ label: "OBSERVED" })), [REFUSAL.LABEL], "a machine grouping labelled OBSERVED was accepted");
  assert.deepEqual(codes(needsWith({ label: "DECIDED BY THE OWNER" })), [REFUSAL.LABEL], "an AI's grouping took the owner's label");
  assert.deepEqual(codes(needsWith({ decidedBy: OWNER, label: "OBSERVED" })), [REFUSAL.LABEL], "a grouping was labelled OBSERVED");
  assert.deepEqual(run(needsWith({ label: "INFERRED" })).refused.length, 0);
  assert.deepEqual(codes(GROUPING({ needs: [NEED(), LICENCE(), NEED({ wordings: [] })] })), [REFUSAL.NEED_ID]);
  assert.deepEqual(codes(GROUPING({ needs: [NEED(), LICENCE(), { reason: "x", decidedBy: AI, wordings: [] }] })), [REFUSAL.NEED_ID]);
  /* the wording's own label stays its source's */
  assert.deepEqual(Object.fromEntries(byNeed(r, "cost").members.map((m) => [m.wording, m.sourceLabel])), { "widget fee": "OBSERVED", "Widget Fee?": "OBSERVED", "wdgt price": "THE SOURCE'S OWN REPORT", "How much is a widget?": "OBSERVED", "Widget kitne ka hai?": "RESEARCH-DERIVED" });
  const tamper = (f) => { const copy = JSON.parse(JSON.stringify(r.records)); f(copy); return [...new Set(clusterFaults({ records: copy, inputs: r.given }).map((x) => x.code))].sort(); };
  assert.deepEqual(tamper((c) => { c[0].members.find((m) => m.wording === "wdgt price").sourceLabel = "OBSERVED"; }), [REFUSAL.SOURCE_LABEL]);
  assert.deepEqual(tamper((c) => { c[0].label = "OBSERVED"; }), [REFUSAL.LABEL]);
  assert.deepEqual(tamper((c) => { c[0].reason = ""; }), [REFUSAL.REASON]);
  assert.deepEqual(tamper((c) => { delete c[0].decidedBy.name; }), [REFUSAL.MAKER]);
  assert.deepEqual(tamper((c) => { c[0].decidedBy.on = "soon"; }), [REFUSAL.DATE]);
  assert.deepEqual(tamper((c) => { c[0].members[0].joinedBy = "0.93"; }), [REFUSAL.JOIN]);
  /* placed by the evidence rule as derived, never as an observation */
  for (const x of r.records) assert.equal(evidenceStateOf(x).state, "INFERRED");
});

/* ================= C5 ================= */

test("C5 · FIRING CONTROL: a navigational wording is marked \"navigational — no page\" with its reason and its maker, and is in no need", () => {
  const r = run();
  const nav = r.records.filter((x) => x.place === PLACES.NAVIGATIONAL);
  assert.deepEqual(nav.map((x) => [x.wording, x.reason, x.decidedBy, x.label, x.need, x.members.map((m) => m.wording)]), [["widget login", "the searcher wants the maker's own site", OWNER, "DECIDED BY THE OWNER", undefined, ["widget login"]]]);
  assert.ok(r.records.filter((x) => x.place === PLACES.NEED).every((x) => x.members.every((m) => m.wording !== "widget login")));
  const nav2 = (over) => GROUPING({ navigational: [{ wording: "widget login", reason: "the searcher wants the maker's own site", decidedBy: OWNER, ...over }] });
  assert.deepEqual(codes(nav2({ reason: "" })), [REFUSAL.NAV_REASON]);
  assert.deepEqual(codes(nav2({ reason: undefined })), [REFUSAL.NAV_REASON]);
  assert.deepEqual(codes(nav2({ decidedBy: undefined })), [REFUSAL.MAKER]);
  assert.deepEqual(codes(needsWith({ wordings: [...NEED().wordings, "Widget Login"] })), [REFUSAL.NAV_IN_NEED], "a navigational wording was placed in a need");
  const tamper = JSON.parse(JSON.stringify(r.records)); tamper[2].reason = "";
  assert.deepEqual(clusterFaults({ records: tamper, inputs: r.given }).map((x) => x.code), [REFUSAL.NAV_REASON]);
});

/* ================= C6 ================= */

test("C6 · CENSUS: F12 makes two kinds of record and nothing else — no page, no page candidate, no fetch; its entry point writes one store, through the governed boundary", () => {
  const r = run();
  assert.deepEqual([...new Set(r.records.map((x) => x.record_type))], [CLUSTER_RECORD]);
  assert.deepEqual([CLUSTER_RECORD, SAMPLE_RECORD], ["need_cluster", "need_sample_answer"]);
  for (const x of r.records) for (const k of Object.keys(x)) assert.ok(!/page|url|slug|candidate/i.test(k), `a need record carries a page field (${k})`);
  assert.equal(r.records.filter((x) => x.place === PLACES.NEED).length, 2, "one record per need — never one per wording");
  for (const p of CODE) {
    const code = running(p);
    assert.ok(!/\bfetch\s*\(|https?:\/\/|node:https?|node:net|XMLHttpRequest/.test(code), `${p} reaches the network`);
    assert.ok(!/src\/page\/|joined-page|page-opportunit|page_candidate|joined_page|page-drafts/.test(code), `${p} touches a page module or a page store`);
  }
  assert.ok(!/process\.env|readFileSync|writeFileSync|appendFileSync/.test(running(CODE[0])), "the rules module reads or writes something");
  const bin = running(CODE[1]);
  assert.ok(!/writeFileSync|appendFileSync/.test(bin), "the entry point writes outside the governed boundary");
  assert.deepEqual([...bin.matchAll(/createJsonlStore\(join\(batchDir, "([^"]+)"\)\)(?=, records)/g)].map((m) => m[1]), ["need-clusters.jsonl"]);
  assert.deepEqual([...bin.matchAll(/action: "([A-Z_]+)"/g)].map((m) => m[1]), ["APPEND_NEED_CLUSTERS"]);
});

/* ================= C7 ================= */

const BIG = () => {
  const needs = Array.from({ length: 11 }, (_, n) => ({ need: `n${n}`, title: `Need ${n}`, reason: `every wording asks thing ${n}`, decidedBy: AI, wordings: Array.from({ length: n === 10 ? 2 : 6 }, (_, w) => `thing ${n} wording ${w}`) }));
  const world = { phrases: needs.flatMap((x) => x.wordings.map((w) => phrase(`${x.need}-${w.slice(-1)}`, w))) };
  const i = inputsOf(world);
  return clusterInputs({ inputs: i.inputs, grouping: { cleanUp: ["case"], needs }, on: DAY });
};
const ITEMS = (n = 10, per = 3) => ({ items: Array.from({ length: n }, (_, k) => ({ need: `n${k}`, wordings: Array.from({ length: per }, (_, w) => `thing ${k} wording ${w}`) })) });
const ANSWERS = (over = {}, each = () => ({})) => ({ answeredBy: "OWNER", reference: "the owner's recorded answer", on: DAY, answers: Array.from({ length: 10 }, (_, k) => ({ item: k + 1, answer: "yes", words: "haan", ...each(k + 1) })), ...over });

test("C7 · FIRING CONTROL: the owner is shown ten needs — each its title, 3 to 5 of its own wordings and its reason — and the row can pass only on his own yes or no to each, every \"no\" with its recorded correction", () => {
  const big = BIG();
  assert.equal(big.refused.length, 0);
  assert.deepEqual([SAMPLE.items, SAMPLE.minWordings, SAMPLE.maxWordings, SAMPLE.answeredBy], [10, 3, 5, "OWNER"]);
  const S = sampleItems({ records: big.records, sample: ITEMS() });
  assert.deepEqual([S.refused.length, S.items.length, S.items[0]], [0, 10, { item: 1, need: "n0", title: "Need 0", wordings: ["thing 0 wording 0", "thing 0 wording 1", "thing 0 wording 2"], reason: "every wording asks thing 0", label: "INFERRED" }]);
  assert.equal(sampleItems({ records: big.records, sample: ITEMS(10, 5) }).items.length, 10);
  const bad = (sample) => [...new Set(sampleItems({ records: big.records, sample }).refused.map((x) => x.code))].sort();
  assert.deepEqual(bad(ITEMS(9)), [REFUSAL.FEW_ITEMS]);
  assert.deepEqual(bad(ITEMS(10, 2)), [REFUSAL.ITEM], "a sample item with two wordings was shown");
  assert.deepEqual(bad(ITEMS(10, 6)), [REFUSAL.ITEM]);
  const swap = (f) => { const s = ITEMS(); f(s.items); return s; };
  assert.deepEqual(bad(swap((it) => { it[3].need = "no such need"; })), [REFUSAL.ITEM]);
  assert.deepEqual(bad(swap((it) => { it[3].wordings[0] = "thing 4 wording 0"; })), [REFUSAL.ITEM], "a sample item showed a wording that is not that need's");
  assert.deepEqual(sampleItems({ records: big.records, sample: ITEMS(9) }).items.length, 0);
  /* the owner's answers */
  const verdict = (answers, items = S.items) => { const v = ownerSampleVerdict({ items, answers, on: DAY }); return [v.state, [...new Set(v.refused.map((x) => x.code))].sort(), v.records.length]; };
  assert.deepEqual(verdict(ANSWERS()), ["PASSED", [], 10]);
  const passed = ownerSampleVerdict({ items: S.items, answers: ANSWERS(), on: DAY }).records[0];
  assert.deepEqual([passed.record_type, passed.item, passed.need, passed.answer, passed.words, passed.answeredBy, passed.reference, passed.wordings.length, evidenceStateOf(passed).state], [SAMPLE_RECORD, 1, "n0", "yes", "haan", "OWNER", "the owner's recorded answer", 3, "INFERRED"]);
  assert.deepEqual(verdict(null), ["NOT ANSWERED", [], 0]);
  assert.deepEqual(verdict(undefined), ["NOT ANSWERED", [], 0]);
  const nine = ANSWERS(); nine.answers.pop();
  assert.deepEqual(verdict(nine), ["REFUSED", [REFUSAL.FEW_ANSWERS], 0], "the sample passed on nine answers");
  assert.deepEqual(verdict(ANSWERS({}, (k) => (k === 4 ? { answer: "maybe" } : {}))), ["REFUSED", [REFUSAL.FEW_ANSWERS], 0]);
  assert.deepEqual(verdict(ANSWERS({ answeredBy: "AI" })), ["REFUSED", [REFUSAL.NOT_OWNER], 0]);
  assert.deepEqual(verdict(ANSWERS({ reference: "" })), ["REFUSED", [REFUSAL.NOT_OWNER], 0]);
  assert.deepEqual(verdict(ANSWERS({ on: undefined })), ["REFUSED", [REFUSAL.NOT_OWNER], 0]);
  assert.deepEqual(verdict(ANSWERS({}, (k) => (k === 2 ? { words: "" } : {}))), ["REFUSED", [REFUSAL.NOT_OWNER], 0], "an answer that is not the owner's own words was accepted");
  assert.deepEqual(verdict(ANSWERS({}, (k) => (k === 7 ? { answer: "no", words: "nahin" } : {}))), ["REFUSED", [REFUSAL.NO_CORRECTION], 0], "a no passed with no recorded correction");
  assert.deepEqual(verdict(ANSWERS({}, (k) => (k === 7 ? { answer: "no", words: "nahin", correction: { what: "moved two wordings" } } : {}))), ["REFUSED", [REFUSAL.NO_CORRECTION], 0]);
  const corrected = ownerSampleVerdict({ items: S.items, answers: ANSWERS({}, (k) => (k === 7 ? { answer: "no", words: "nahin", correction: { what: "moved two wordings to another need", on: DAY } } : {})), on: DAY });
  assert.deepEqual([corrected.state, corrected.records[6].answer, corrected.records[6].correction], ["PASSED", "no", { what: "moved two wordings to another need", on: DAY }]);
  assert.deepEqual(verdict(ANSWERS(), S.items.slice(0, 9)), ["REFUSED", [REFUSAL.FEW_ITEMS], 0]);
});

/* ================= [ALL] ================= */

test("[ALL] · FIRING CONTROL: the row is PROVED only when C1 to C7 are each PROVED, the real population is complete and the owner's sample PASSED", () => {
  const r = run();
  const full = realPopulation({ counts: r.counts, faults: [] });
  assert.deepEqual([full.state, [...full.missing]], ["COMPLETE", []]);
  assert.match(realPopulation({ counts: { ...r.counts, phrases: 0 } }).missing.join(), /no stored phrase/);
  assert.match(realPopulation({ counts: { ...r.counts, questions: 0 } }).missing.join(), /no recorded question/);
  assert.match(realPopulation({ counts: { ...r.counts, inNeed: r.counts.inNeed - 1 } }).missing.join(), /exactly one place/);
  assert.match(realPopulation({ counts: r.counts, faults: [{ code: REFUSAL.CHANGED }] }).missing.join(), /1 fault/);
  assert.equal(realPopulation({}).state, "INCOMPLETE");
  assert.deepEqual(countsOf(r.records, r.given), r.counts);
  const all = { C1: "PROVED", C2: "PROVED", C3: "PROVED", C4: "PROVED", C5: "PROVED", C6: "PROVED", C7: "PROVED" };
  const PASSED = { state: "PASSED" };
  assert.deepEqual(rowVerdict({ clauses: all, population: full, sample: PASSED }), { verdict: "PROVED", open: [], realPopulation: "COMPLETE", ownerSample: "PASSED" });
  assert.deepEqual([rowVerdict({ clauses: all, population: realPopulation({}), sample: PASSED }).verdict, rowVerdict({ clauses: all, sample: PASSED }).verdict], ["NOT PROVED", "NOT PROVED"], "fixtures alone proved the row");
  assert.deepEqual([rowVerdict({ clauses: all, population: full, sample: { state: "NOT ANSWERED" } }).verdict, rowVerdict({ clauses: all, population: full, sample: { state: "REFUSED" } }).verdict, rowVerdict({ clauses: all, population: full }).ownerSample], ["NOT PROVED", "NOT PROVED", "NOT ANSWERED"], "the row passed without the owner's sample");
  for (const c of Object.keys(all)) assert.deepEqual([rowVerdict({ clauses: { ...all, [c]: "NOT PROVED" }, population: full, sample: PASSED }).verdict, [...rowVerdict({ clauses: { ...all, [c]: undefined }, population: full, sample: PASSED }).open]], ["NOT PROVED", [c]], c);
});

/* ================= REAL ================= */

const BATCH = "rr254-test-pages-2026-10-12";
const realDir = () => join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
const jsonl = (name) => readFileSync(join(realDir(), name), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
/* the need store as F12 holds it: a later run that hands the store a record it already holds leaves a re-sighting line (the store's
 * own mark, same key, no content) — that line is the store's, not a need record, and it never stands in for the record it re-sights */
const held = () => jsonl("need-clusters.jsonl").filter((x) => x.record_type !== RESIGHTING_TYPE);
const json = (name) => (existsSync(join(realDir(), name)) ? JSON.parse(readFileSync(join(realDir(), name), "utf8")) : null);
const realRun = () => {
  const i = inputsOf({ phrases: jsonl("search-phrases.jsonl"), publicQuestions: jsonl("questions.jsonl"), derivedQuestions: jsonl("research-derived-questions.jsonl") });
  return { ...clusterInputs({ inputs: i.inputs, unread: i.unread, grouping: json("need-grouping.json"), on: "2026-10-13" }), given: i.inputs, unread: i.unread };
};

test("REAL · C1 C2 C4 C5 C6 · the declared product's stored phrases and recorded questions: every one read, in exactly one place, word for word; every join one of the two ways; every need with its reason, maker, date and a label that is never OBSERVED; the stored need records are the recorded grouping's", () => {
  assert.ok(existsSync(join(realDir(), "need-clusters.jsonl")) && json("need-grouping.json") !== null, "EMPTY real population: the need store or the recorded grouping is not in the research batch");
  const r = realRun();
  assert.deepEqual([r.unread.length, r.refused.length], [0, 0], "the recorded grouping breaks a rule on the real population");
  assert.ok(r.given.length > 0 && r.counts.phrases > 0 && r.counts.questions > 0, "EMPTY real population");
  assert.deepEqual(clusterFaults({ records: r.records, inputs: r.given }), []);
  assert.equal(r.counts.inNeed + r.counts.navigational + r.counts.noNeedYet, r.given.length, "a real input is in no place, or in two");
  /* the store holds every record the recorded grouping gives today, byte for byte (an earlier grouping's records stay in the store; they are history) */
  const stored = new Map(held().map((x) => [x.measurement_key, x]));
  assert.ok(jsonl("need-clusters.jsonl").filter((x) => x.record_type === RESIGHTING_TYPE).every((x) => stored.has(x.measurement_key)), "a re-sighting in the need store re-sights no record held there");
  for (const x of r.records) assert.deepEqual(stored.get(x.measurement_key), JSON.parse(JSON.stringify(x)), "a need record of the recorded grouping is not in the store as derived");
  assert.ok([...stored.values()].every((x) => [CLUSTER_RECORD, SAMPLE_RECORD].includes(x.record_type) && evidenceStateOf(x).state === "INFERRED"), "the need store holds a record that is not F12's — or a page");
  const needs = r.records.filter((x) => x.place === PLACES.NEED);
  assert.ok(needs.every((x) => x.reason.trim().length > 20 && Object.hasOwn(MAKERS, x.decidedBy.kind) && x.label === MAKERS[x.decidedBy.kind] && x.label !== "OBSERVED"));
  assert.ok(needs.filter((x) => ["AI", "MACHINE"].includes(x.decidedBy.kind)).every((x) => x.label === "INFERRED"));
  const nav = r.records.filter((x) => x.place === PLACES.NAVIGATIONAL);
  assert.ok(nav.length > 0 && nav.every((x) => x.reason.trim().length > 20 && x.decidedBy.kind === "OWNER"), "the owner's navigational answer is not in the grouping");
  const inNeed = new Set(needs.flatMap((x) => x.members.map((m) => m.inputId)));
  assert.ok(nav.every((x) => x.members.every((m) => !inNeed.has(m.inputId))));
  console.log(`  REAL (count-only; the declared product's inputs placed by its recorded grouping): ${JSON.stringify({ ...r.counts, makers: needs.reduce((m, x) => ((m[x.decidedBy.kind] = (m[x.decidedBy.kind] ?? 0) + 1), m), {}) })}`);
});

test("REAL · C3 C7 [ALL] · countries stay inside their need with their fact; a need that differs for another reason names its fact; the owner's ten-item sample is shown from the real needs — and the row is VERIFIED only on his recorded answers", () => {
  const r = realRun();
  const needs = r.records.filter((x) => x.place === PLACES.NEED);
  const parts = needs.flatMap((x) => x.countryParts);
  assert.ok(parts.length > 0 && parts.every((p) => p.country.trim() !== "" && p.fact.statement.trim() !== "" && p.fact.reference.trim() !== ""), "a country part lacks its country or its fact");
  const differing = needs.filter((x) => x.differsFrom);
  assert.ok(differing.every((x) => needs.some((y) => y.need === x.differsFrom.need) && x.differsFrom.fact.reference.trim() !== ""));
  const grouping = json("need-grouping.json");
  assert.ok(grouping.needs.every((n) => !("country" in n) && !("page" in n) && !("separatePage" in n)));
  /* C7 */
  const S = sampleItems({ records: r.records, sample: json("need-sample.json") });
  assert.deepEqual([S.refused.length, S.items.length], [0, SAMPLE.items], "the sample shown to the owner is not ten complete items of the real needs");
  const answers = json("need-sample-answers.json");
  const V = ownerSampleVerdict({ items: S.items, answers, on: "2026-10-13" });
  assert.notEqual(V.state, "REFUSED", `the owner's recorded answers do not pass: ${V.refused.map((x) => x.code).join(", ")}`);
  if (V.state === "PASSED") {
    const stored = new Map(held().map((x) => [x.measurement_key, x]));
    for (const a of V.records) assert.deepEqual(stored.get(a.measurement_key), JSON.parse(JSON.stringify(a)), "an owner's answer is not in the store as recorded");
  }
  const population = realPopulation({ counts: r.counts, faults: clusterFaults({ records: r.records, inputs: r.given }) });
  assert.deepEqual([population.state, [...population.missing]], ["COMPLETE", []]);
  const all = { C1: "PROVED", C2: "PROVED", C3: "PROVED", C4: "PROVED", C5: "PROVED", C6: "PROVED", C7: V.state === "PASSED" ? "PROVED" : "NOT PROVED" };
  const row = rowVerdict({ clauses: all, population, sample: V });
  const board = DECLARED.F12.state;
  assert.ok(board !== "VERIFIED-PASS" || row.verdict === "PROVED", "F12 stands VERIFIED-PASS on the board while the owner's sample has not passed on the real needs");
  console.log(`  REAL (count-only; country parts, differing needs, the owner's sample): ${JSON.stringify({ needsWithCountryParts: r.counts.needsWithCountryParts, countryParts: parts.length, needsDifferingByAFact: differing.length, sampleItems: S.items.length, ownerSample: V.state, yes: V.records.filter((a) => a.answer === "yes").length, no: V.records.filter((a) => a.answer === "no").length, row: row.verdict, board })}`);
});

test("NOTHING HERE WROTE THE PRODUCTION TRAIL", () => {
  assert.equal(createHash("sha256").update(readFileSync(TRAIL)).digest("hex"), trailBefore);
});
