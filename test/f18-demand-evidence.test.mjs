/**
 * F18 · NEW-PRODUCT AND PRE-LAUNCH RESEARCH — observed demand and estimates, kept apart (acceptance _handoffs
 * AlmiVisibility_F18_ACCEPTANCE_2026-10-18.md, RR-284; beta-g decision D).
 *
 * Firing controls on fixed records; REAL over the declared batch's needs and its published pages as built. Nothing fetched or written;
 * the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { recordDemand, needDemand, pageCandidates, unsourcedPageQuestions, pageNeedDemand, DEMAND, DEMAND_REFUSAL } from "../src/research/demand-evidence.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const phrase = (id, source, label, date = "2026-10-13") => ({ record_type: "search_phrase", measurement_key: `search_phrase:${id}`, phrase_id: id, source, label, date });
const derived = (id, reference = null) => ({ record_type: "research_derived_question", measurement_key: `research_derived_question:${id}`, question_id: id, reference, recorded_at: "2026-10-13T00:00:00Z" });
const RECS = new Map([phrase("sc", "SEARCH_CONSOLE", "OBSERVED"), phrase("g", "CLIENT_AI_GOOGLE", "OBSERVED"), phrase("ai", "AI_SUGGESTION", "INFERRED"), phrase("fake", "AI_SUGGESTION", "OBSERVED"), phrase("nodate", "SEARCH_CONSOLE", "OBSERVED", null), derived("d1"), derived("d2")].map((r) => [r.measurement_key, r]));
const recordOf = (id) => RECS.get(id) ?? null;
const need = (id, members) => ({ cluster_id: id, members: members.map((m) => ({ inputId: m })) });

test("C1 · ESTIMATE IS LABELLED · FIRING CONTROL: a need with no observed record is ESTIMATE, naming the records it is estimated from", () => {
  const n = needDemand(need("n1", ["research_derived_question:d1", "search_phrase:ai"]), recordOf);
  assert.equal(n.label, DEMAND.ESTIMATE);
  assert.deepEqual(n.estimate, { state: DEMAND.ESTIMATE, from: ["research_derived_question:d1", "search_phrase:ai"] });
  assert.deepEqual(n.observedIn, []);
});

test("C2 · NEVER MIXED · FIRING CONTROL: OBSERVED only from records with their own source and date; a record claiming OBSERVED without them is refused, named, and counts for nothing", () => {
  assert.equal(recordDemand(RECS.get("search_phrase:sc")).demand, DEMAND.OBSERVED);
  assert.equal(recordDemand(RECS.get("search_phrase:fake")).refused, DEMAND_REFUSAL.OBSERVED_WITHOUT_SOURCE, "an AI suggestion labelled OBSERVED was accepted");
  assert.equal(recordDemand(RECS.get("search_phrase:nodate")).refused, DEMAND_REFUSAL.OBSERVED_WITHOUT_SOURCE, "an observation with no date was accepted");
  const n = needDemand(need("n2", ["search_phrase:fake", "research_derived_question:d1"]), recordOf);
  assert.equal(n.label, DEMAND.ESTIMATE, "a planted estimate offered as OBSERVED made the need OBSERVED");
  assert.deepEqual(n.refused.map((r) => r.refused), [DEMAND_REFUSAL.OBSERVED_WITHOUT_SOURCE]);
});

test("C3 · REPLACED BY DATA · FIRING CONTROL: when an observation arrives for the same need, it is reported beside the estimate and the estimate is SUPERSEDED, never deleted", () => {
  const before = needDemand(need("n3", ["research_derived_question:d1"]), recordOf);
  const after = needDemand(need("n3", ["research_derived_question:d1", "search_phrase:sc"]), recordOf);
  assert.equal(before.label, DEMAND.ESTIMATE);
  assert.equal(after.label, DEMAND.OBSERVED);
  assert.deepEqual(after.observedIn.map((o) => [o.inputId, o.source, o.date]), [["search_phrase:sc", "SEARCH_CONSOLE", "2026-10-13"]]);
  assert.deepEqual(after.estimate, { state: DEMAND.SUPERSEDED, from: ["research_derived_question:d1"] }, "the estimate was deleted or not marked SUPERSEDED");
  /* RR-285: on a page's need, the observation arrives by a recorded join — the same rule, the estimate kept beside it */
  const item = { needKey: "k", questions: [{ questionId: "research_derived_question:d1" }] };
  const page = pageNeedDemand("https://a.example/p", item, recordOf, { joins: [{ page: "https://a.example/p", needKey: "k", inputId: "search_phrase:sc" }] });
  assert.equal(page.label, DEMAND.OBSERVED, "a joined observation did not reach the page's need");
  assert.deepEqual(page.estimate, { state: DEMAND.SUPERSEDED, from: ["research_derived_question:d1"] });
  assert.equal(pageNeedDemand("https://a.example/p", item, recordOf, { joins: [{ page: "https://a.example/other", needKey: "k", inputId: "search_phrase:sc" }] }).label, DEMAND.ESTIMATE, "a join to another page reached this one");
});

test("C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL: only an observed need may create a page candidate; a published page question with no source of its own is listed", () => {
  const needs = [needDemand(need("obs", ["search_phrase:g"]), recordOf), needDemand(need("est", ["research_derived_question:d2"]), recordOf)];
  assert.deepEqual(pageCandidates(needs), { candidates: ["obs"], refused: [{ needId: "est", refused: DEMAND_REFUSAL.ESTIMATE_ALONE }], opportunities: [] });
  /* Amendment 2 (RR-286): an estimate with its own verified answer is an OPPORTUNITY — a candidate, labelled so, naming its answer */
  assert.deepEqual(pageCandidates(needs, { answerOf: (id) => (id === "est" ? ["claim-1"] : []) }), { candidates: ["obs", "est"], refused: [], opportunities: [{ needId: "est", label: "OPPORTUNITY", answer: ["claim-1"] }] });
  assert.deepEqual(pageCandidates(needs, { answerOf: () => [] }).refused.map((r) => r.needId), ["est"], "an estimate with no answer of its own became a candidate");
  const pages = [{ publishedUrl: "https://a.example/p", itemList: [
    { needKey: "k1", heading: { shown: "Q1?", searchPhrase: "g" }, questions: [{ questionId: "d1" }] },
    { needKey: "k2", heading: { shown: "Q2?" }, questions: [{ questionId: "d2" }] },
  ] }];
  const r = unsourcedPageQuestions(pages, (id) => RECS.get(id) ?? RECS.get(`search_phrase:${id}`) ?? RECS.get(`research_derived_question:${id}`) ?? null);
  assert.equal(r.items, 2);
  assert.deepEqual(r.unsourced.map((x) => x.needKey), ["k2"]);
  /* RR-285: a recorded join of an observed record gives the page question a source of its own; a join to an estimate does not */
  const look = (id) => RECS.get(id) ?? RECS.get(`search_phrase:${id}`) ?? RECS.get(`research_derived_question:${id}`) ?? null;
  assert.deepEqual(unsourcedPageQuestions(pages, look, { joins: [{ page: "https://a.example/p", needKey: "k2", inputId: "search_phrase:sc" }] }).unsourced, []);
  assert.deepEqual(unsourcedPageQuestions(pages, look, { joins: [{ page: "https://a.example/p", needKey: "k2", inputId: "search_phrase:ai" }] }).unsourced.map((x) => x.needKey), ["k2"]);
});

/* ── REAL ── */
const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "need-clusters.jsonl")) && existsSync(join(BATCH, "joined-pages.jsonl"));
const SKIP = HERE ? false : "the declared batch is not on this machine";
const rows = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
function real() {
  const records = new Map();
  for (const r of [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...[...rows("search-phrases.jsonl"), ...(existsSync(join(BATCH, "search-console-exports.jsonl")) ? rows("search-console-exports.jsonl") : [])].filter((x) => x.record_type === "search_phrase")]) { records.set(r.measurement_key, r); records.set(r.question_id ?? r.phrase_id, r); }
  for (const p of JSON.parse(readFileSync(join(BATCH, "search-phrases.json"), "utf8"))) records.set(p.phraseId, p);
  const recordOf = (id) => records.get(id) ?? null;
  const clusters = rows("need-clusters.jsonl").filter((c) => c.record_type === "need_cluster");
  const pages = new Map(); for (const r of rows("joined-pages.jsonl")) if (r.record_type === "joined_page_draft" && r.publishedUrl) pages.set(r.publishedUrl, r);
  return { records, recordOf, clusters, pages: [...pages.values()] };
}

test("REAL · C1 + C2: every need of the batch is labelled, an ESTIMATE naming its records; OBSERVED needs counted from observed records alone", { skip: SKIP }, () => {
  const { recordOf, clusters, records } = real();
  const needs = clusters.map((c) => needDemand(c, recordOf));
  assert.ok(needs.length > 0);
  assert.ok(needs.every((n) => n.label === DEMAND.OBSERVED || n.label === DEMAND.ESTIMATE), "a need is unlabelled");
  const est = needs.filter((n) => n.label === DEMAND.ESTIMATE);
  assert.ok(est.length > 0, "no estimate to prove the label on");
  assert.ok(est.every((n) => n.estimate?.from.length > 0 && n.observedIn.length === 0), "an ESTIMATE does not name its records, or holds an observation");
  /* counted apart: a need is OBSERVED exactly when one of its member records, judged alone, has its own source and date */
  const alone = clusters.filter((c) => (c.members ?? []).some((m) => recordDemand(records.get(m.inputId)).demand === DEMAND.OBSERVED)).length;
  assert.equal(needs.filter((n) => n.label === DEMAND.OBSERVED).length, alone);
  console.log(`  REAL (count-only): needs ${needs.length} · OBSERVED ${alone} (= from observed records alone) · ESTIMATE ${est.length} · records refused ${needs.reduce((s, n) => s + n.refused.length, 0)}`);
});

test("REAL · C3: the batch's needs that hold both — each observation reported beside its estimate, the estimate SUPERSEDED and kept", { skip: SKIP }, () => {
  const { recordOf, clusters } = real();
  const both = clusters.map((c) => needDemand(c, recordOf)).filter((n) => n.observedIn.length && n.estimate);
  assert.ok(both.length > 0, "no need holds both");
  assert.ok(both.every((n) => n.estimate.state === DEMAND.SUPERSEDED && n.estimate.from.length > 0));
  console.log(`  REAL (count-only): needs holding an observation and an estimate ${both.length} · each estimate SUPERSEDED and kept`);
});

test("REAL · C3 (Amendment 1): the run repeated with the client's own imported Search Console rows — a page need that was only an ESTIMATE shows both, the estimate SUPERSEDED and kept; no estimate-only need group is matched by any query", { skip: SKIP }, () => {
  const { recordOf, clusters, records, pages } = real();
  const sc = [...new Set([...records.values()].filter((r) => r.record_type === "search_phrase" && r.source === "SEARCH_CONSOLE"))];
  assert.ok(sc.length > 1, "the client's Search Console export is not imported");
  const file = JSON.parse(readFileSync(join(BATCH, "observed-question-joins-2026-10-18.json"), "utf8"));
  const joins = file.joins;
  assert.ok(joins.every((j) => sc.some((r) => r.measurement_key === j.inputId)), "a join names a record that is not an imported Search Console row");
  const keys = [...new Set(joins.map((j) => `${j.page}#${j.needKey}`))];
  let both = 0;
  for (const k of keys) {
    const [pg, key] = k.split("#");
    const item = pages.find((p) => p.publishedUrl === pg).itemList.find((x) => x.needKey === key);
    const before = pageNeedDemand(pg, item, recordOf), after = pageNeedDemand(pg, item, recordOf, { joins });
    assert.equal(before.label, DEMAND.ESTIMATE, `${k} was not only an estimate before the import`);
    assert.equal(after.label, DEMAND.OBSERVED);
    assert.ok(after.observedIn.every((o) => o.source === "SEARCH_CONSOLE" && o.date === "2026-10-18"));
    assert.deepEqual(after.estimate, { state: DEMAND.SUPERSEDED, from: before.estimate.from }, `${k}: the estimate was deleted or not SUPERSEDED`);
    both += 1;
  }
  assert.ok(both > 0, "no need shows both");
  /* the need groups with no observed record: the import joins none of them — they stay ESTIMATE, by the recorded judgement */
  const estimateOnly = clusters.map((c) => needDemand(c, recordOf)).filter((n) => n.label === DEMAND.ESTIMATE);
  assert.equal(estimateOnly.length, file.estimateOnlyNeeds.checked);
  assert.equal(file.estimateOnlyNeeds.sameNeedQueries, 0);
  console.log(`  REAL (count-only): Search Console rows ${sc.length} · recorded joins ${joins.length} · page needs that were only an ESTIMATE and now show both ${both} · estimate-only need groups ${estimateOnly.length}, matched by a query 0`);
});

test("REAL · C4: 0 page candidates from estimates only; on the 12 published guides as built, every page question with no source of its own is listed", { skip: SKIP }, () => {
  const { recordOf, clusters, pages } = real();
  const needs = clusters.filter((c) => c.place === "A NEED").map((c) => needDemand(c, recordOf));
  /* Amendment 2 (RR-286): the batch's recorded own answers of its estimate-only needs */
  const opp = JSON.parse(readFileSync(join(BATCH, "opportunity-answers-2026-10-18.json"), "utf8")).needs;
  const pc = pageCandidates(needs, { answerOf: (id) => opp.find((x) => x.needId === id)?.answer ?? [] });
  const oppIds = new Set(pc.opportunities.map((o) => o.needId));
  assert.ok(pc.candidates.every((id) => needs.find((n) => n.needId === id).observedIn.length > 0 || oppIds.has(id)), "a page candidate came from an estimate with no answer of its own");
  assert.ok(pc.opportunities.length > 0 && pc.opportunities.every((o) => o.label === "OPPORTUNITY" && o.answer.length > 0), "an OPPORTUNITY names no verified answer");
  assert.ok(pc.refused.length > 0 && pc.candidates.length > 0);
  assert.equal(pages.length, 12, "not the 12 published guides");
  /* RR-285: with the batch's recorded joins of the client's own Search Console rows, a joined question has a source of its own */
  const joins = JSON.parse(readFileSync(join(BATCH, "observed-question-joins-2026-10-18.json"), "utf8")).joins;
  const u = unsourcedPageQuestions(pages, recordOf, { joins });
  assert.equal(unsourcedPageQuestions(pages, recordOf).unsourced.length - u.unsourced.length, new Set(joins.map((j) => `${j.page}#${j.needKey}`)).size, "a join did not give its question a source");
  for (const x of u.unsourced) assert.ok(typeof x.question === "string" && x.page.startsWith("https://"));
  console.log(`  REAL (count-only): page candidates ${pc.candidates.length} (observed ${pc.candidates.length - pc.opportunities.length}, OPPORTUNITY ${pc.opportunities.length}) · refused (estimate alone) ${pc.refused.length} · published page questions ${u.items} · with no source of their own ${u.unsourced.length}`);
});

test("ENTRY · bin/demand-evidence.mjs: counts only by default; a bad call is a usage exit", { skip: SKIP }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/demand-evidence.mjs", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /published pages {2}12: page questions \d+ · with no source of their own \d+/);
  assert.doesNotMatch(r.stdout, /https:\/\//, "a page was printed without --list");
  assert.equal(go(["--subject=almi-oet"]).status, 2);
});

test("the rule names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/research/demand-evidence.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
