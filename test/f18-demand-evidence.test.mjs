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

import { recordDemand, needDemand, pageCandidates, unsourcedPageQuestions, DEMAND, DEMAND_REFUSAL } from "../src/research/demand-evidence.mjs";
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
});

test("C4 · NO PAGE BY ESTIMATE ALONE · FIRING CONTROL: only an observed need may create a page candidate; a published page question with no source of its own is listed", () => {
  const needs = [needDemand(need("obs", ["search_phrase:g"]), recordOf), needDemand(need("est", ["research_derived_question:d2"]), recordOf)];
  assert.deepEqual(pageCandidates(needs), { candidates: ["obs"], refused: [{ needId: "est", refused: DEMAND_REFUSAL.ESTIMATE_ALONE }] });
  const pages = [{ publishedUrl: "https://a.example/p", itemList: [
    { needKey: "k1", heading: { shown: "Q1?", searchPhrase: "g" }, questions: [{ questionId: "d1" }] },
    { needKey: "k2", heading: { shown: "Q2?" }, questions: [{ questionId: "d2" }] },
  ] }];
  const r = unsourcedPageQuestions(pages, (id) => RECS.get(id) ?? RECS.get(`search_phrase:${id}`) ?? RECS.get(`research_derived_question:${id}`) ?? null);
  assert.equal(r.items, 2);
  assert.deepEqual(r.unsourced.map((x) => x.needKey), ["k2"]);
});

/* ── REAL ── */
const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "need-clusters.jsonl")) && existsSync(join(BATCH, "joined-pages.jsonl"));
const SKIP = HERE ? false : "the declared batch is not on this machine";
const rows = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
function real() {
  const records = new Map();
  for (const r of [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...rows("search-phrases.jsonl").filter((x) => x.record_type === "search_phrase")]) { records.set(r.measurement_key, r); records.set(r.question_id ?? r.phrase_id, r); }
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

test("REAL · C3 AS FROZEN: the real run repeated with the one stored Search Console row — its need shows both", { skip: SKIP }, () => {
  const { recordOf, clusters, records } = real();
  const sc = [...new Set([...records.values()].filter((r) => r.record_type === "search_phrase" && r.source === "SEARCH_CONSOLE"))];
  assert.equal(sc.length, 1, "not exactly one stored Search Console row");
  const mine = clusters.filter((c) => (c.members ?? []).some((m) => m.inputId === sc[0].measurement_key));
  const shown = mine.map((c) => needDemand(c, recordOf));
  /* 🔴 recorded, not asserted green: the row sits in needs that hold no estimate, so "both" cannot be shown — C3 stays unproved as frozen */
  const showsBoth = shown.some((n) => n.observedIn.some((o) => o.inputId === sc[0].measurement_key) && n.estimate?.state === DEMAND.SUPERSEDED);
  console.log(`  REAL (count-only): the Search Console row's needs ${shown.length} · placed ${[...new Set(mine.map((c) => c.place))].join(", ")} · a need showing both ${showsBoth ? "yes" : "NONE — C3 as frozen is NOT PROVED"}`);
  assert.equal(showsBoth, false, "the frozen C3 proof became possible — re-assess F18's C3");
});

test("REAL · C4: 0 page candidates from estimates only; on the 12 published guides as built, every page question with no source of its own is listed", { skip: SKIP }, () => {
  const { recordOf, clusters, pages } = real();
  const needs = clusters.filter((c) => c.place === "A NEED").map((c) => needDemand(c, recordOf));
  const pc = pageCandidates(needs);
  assert.ok(pc.candidates.every((id) => needs.find((n) => n.needId === id).observedIn.length > 0), "a page candidate came from estimates only");
  assert.ok(pc.refused.length > 0 && pc.candidates.length > 0);
  assert.equal(pages.length, 12, "not the 12 published guides");
  const u = unsourcedPageQuestions(pages, recordOf);
  for (const x of u.unsourced) assert.ok(typeof x.question === "string" && x.page.startsWith("https://"));
  console.log(`  REAL (count-only): page candidates ${pc.candidates.length} (all observed) · refused (estimate alone) ${pc.refused.length} · published page questions ${u.items} · with no source of their own ${u.unsourced.length}`);
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
