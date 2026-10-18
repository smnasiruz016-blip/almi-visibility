/**
 * F50 · PROMPT AND ANSWER-QUESTION LIBRARY (acceptance _handoffs AlmiVisibility_F50_ACCEPTANCE_2026-10-18.md, RR-284; capability records
 * by beta-g decision C).
 *
 * Firing controls on fixed records; REAL over the declared batch's pages, their stored wordings and claims, the product's capability records
 * and the engine's stored reads of its pages (the private texts joined); C5 on a SCRATCH store. Nothing fetched or written; the production
 * trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { verifyCapabilities, coverageOf, buildLibrary, gapsOf, libraryVersion, nextVersionRecord, readVersions, fieldCounts, COVERAGE, ANSWER, NOT_RECORDED, CAPABILITY_REFUSAL, COVERAGE_WHY } from "../src/research/question-library.mjs";
import { normaliseText } from "../src/facts/quote-match.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const contains = (text, says) => normaliseText(text).includes(normaliseText(says));
const READ = { url: "https://p.example/", state: "READ", sha256: "s1", text: "We offer full practice. Feedback on every letter." };
const cap = (id, says, over = {}) => ({ capabilityId: id, says, url: READ.url, readOn: "2026-10-18", readSha256: "s1", ...over });
const pq = (id, original, over = {}) => ({ record_type: "public_question", question_id: id, value: { original, source: "a page", reference: "https://q.example/", timeWindow: { from: "2026-10-12T00:00:00Z" }, language: "english", ...over } });
const rd = (id, text) => ({ record_type: "research_derived_question", question_id: id, wording: { text }, sourceId: "client-research", route: "ROUTE_2", reference: null, recorded_at: "2026-10-13T00:00:00Z" });
const RECS = new Map([pq("q1", "How much is it?"), rd("q2", "Kitni fees hai?"), pq("q3", "No date", { timeWindow: null })].map((r) => [r.question_id, r]));
const claim = (id, text, link = "https://s.example/", readOn = "2026-10-15") => ({ claimId: id, text, source: { link, readOn } });
const PAGES = [{ combination: { profession: "p" }, needs: [
  { key: "p-fee", questions: ["q1", "q2"], answer: { claims: [claim("c1", "The fee is X.")] } },
  { key: "p-practice", questions: ["q1"], answer: { claims: [] } },
] }];
const lib = (judgements = [], verified = ["cap-a"]) => buildLibrary({ pages: PAGES, recordOf: (id) => RECS.get(id) ?? null, judgements, verified });

test("C1 · ORIGINAL WORDING · FIRING CONTROL: every merged wording kept word for word with its source and date; one without a date is named, never dropped or rewritten", () => {
  const e = lib()[0];
  assert.deepEqual(e.wordings.map((w) => [w.questionId, w.text, w.date]), [["q1", "How much is it?", "2026-10-12"], ["q2", "Kitni fees hai?", "2026-10-13"]]);
  assert.ok(e.wordings.every((w) => w.source));
  const odd = buildLibrary({ pages: [{ combination: {}, needs: [{ key: "x-a", questions: ["q3", "missing"] }] }], recordOf: (id) => RECS.get(id) ?? null })[0];
  assert.deepEqual(odd.wordingsMissing.map((m) => [m.questionId, m.missing]), [["q3", "a date"], ["missing", "its stored record"]]);
});

test("C2 · EVIDENCE ANSWER · FIRING CONTROL: an answer is a claim with its source and date, or DATA GAP by name — a claim without either is never an answer", () => {
  const [fee, practice] = lib();
  assert.deepEqual(fee.answer, { state: ANSWER.ANSWERED, claims: [{ claimId: "c1", link: "https://s.example/", readOn: "2026-10-15", text: "The fee is X." }] });
  assert.deepEqual(practice.answer, { state: ANSWER.DATA_GAP });
  const nodate = buildLibrary({ pages: [{ combination: {}, needs: [{ key: "x-a", questions: [], answer: { claims: [claim("c2", "t", "https://s.example/", null)] } }] }], recordOf: () => null })[0];
  assert.equal(nodate.answer.state, ANSWER.DATA_GAP);
});

test("C3 · PRODUCT COVERAGE, SEPARATE · FIRING CONTROL: coverage only from capabilities found word for word in the stored read of the product's page; PARTIALLY names both parts; anything else is UNKNOWN, named", () => {
  const v = verifyCapabilities([cap("cap-a", "full practice"), cap("cap-b", "a feature it never says"), cap("cap-c", "full practice", { readSha256: "other" }), cap("cap-d", "full practice", { url: "https://none.example/" })], (u) => (u === READ.url ? READ : null), { contains });
  assert.deepEqual(v.verified, ["cap-a"]);
  assert.deepEqual(v.refused.map((x) => [x.capabilityId, x.refused]), [["cap-b", CAPABILITY_REFUSAL.NOT_VERBATIM], ["cap-c", CAPABILITY_REFUSAL.OTHER_READ], ["cap-d", CAPABILITY_REFUSAL.NO_READ]]);
  assert.equal(coverageOf({ coverage: "ADDRESSES", capabilities: ["cap-a"] }, v.verified).state, COVERAGE.ADDRESSES);
  assert.deepEqual(coverageOf({ coverage: "ADDRESSES", capabilities: ["cap-b"] }, v.verified), { state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.UNVERIFIED });
  assert.deepEqual(coverageOf({ coverage: "PARTIALLY", capabilities: ["cap-a"], addressed: "x" }, v.verified), { state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NO_PARTS });
  assert.deepEqual(coverageOf(undefined, v.verified), { state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NOT_JUDGED });
  const [fee] = lib([{ topic: "fee", coverage: "PARTIALLY", capabilities: ["cap-a"], addressed: "a", unaddressed: "b" }]);
  assert.equal(fee.answer.state, ANSWER.ANSWERED, "the coverage was merged into the answer");
  assert.deepEqual([fee.coverage.addressed, fee.coverage.unaddressed], ["a", "b"]);
});

test("C4 · GAPS NEVER FILLED · FIRING CONTROL: every DOES NOT ADDRESS question is on the gap list; a page answer speaking for the product on it is named", () => {
  const e = lib([{ topic: "fee", coverage: "DOES NOT ADDRESS", against: "ALL" }, { topic: "practice", coverage: "DOES NOT ADDRESS", against: "SOME" }]);
  assert.deepEqual(gapsOf(e, { productNames: ["acme"] }), { gaps: ["p:p-fee"], answeredForProduct: [] });
  assert.equal(e[1].coverage.state, COVERAGE.UNKNOWN, "DOES NOT ADDRESS judged against part of the list was accepted");
  const spoken = buildLibrary({ pages: [{ combination: { profession: "p" }, needs: [{ key: "p-fee", questions: [], answer: { claims: [claim("c9", "Acme books the test for you.")] } }] }], recordOf: () => null, judgements: [{ topic: "fee", coverage: "DOES NOT ADDRESS", against: "ALL" }], verified: ["cap-a"] });
  assert.deepEqual(gapsOf(spoken, { productNames: ["acme"] }).answeredForProduct, ["p:p-fee"]);
});

test("C5 · VERSIONED · FIRING CONTROL: a change makes a new version record beside the old one; no change makes none; both read back", () => {
  const v1 = lib(), v2 = buildLibrary({ pages: [{ ...PAGES[0], needs: [...PAGES[0].needs, { key: "p-new", questions: ["q2"] }] }], recordOf: (id) => RECS.get(id) ?? null });
  const r1 = nextVersionRecord([], v1, { on: "2026-10-18" });
  assert.equal(nextVersionRecord([r1], v1, { on: "2026-10-19" }), null, "an unchanged library made a new version");
  const r2 = nextVersionRecord([r1], v2, { on: "2026-10-19" });
  assert.notEqual(r2.version, r1.version);
  assert.equal(r2.previous, r1.version);
  assert.deepEqual(readVersions([r1, { record_type: "other" }, r2]).map((r) => [r.version, r.questions]), [[r1.version, 2], [r2.version, 3]]);
});

test("C6 · INTENT, LOCALE, STAGE · FIRING CONTROL: each recorded, or NOT RECORDED by name", () => {
  const [fee] = lib();
  assert.deepEqual([fee.intent, fee.locale, fee.stage], [NOT_RECORDED, "english", NOT_RECORDED]);
  const rec = buildLibrary({ pages: [{ combination: {}, needs: [{ key: "x-a", questions: [], intent: "transactional", stage: "decision" }] }], recordOf: () => null })[0];
  assert.deepEqual([rec.intent, rec.locale, rec.stage], ["transactional", NOT_RECORDED, "decision"]);
  assert.deepEqual(fieldCounts([fee, rec]), { intent: { recorded: 1, notRecorded: 1 }, locale: { recorded: 1, notRecorded: 1 }, stage: { recorded: 1, notRecorded: 1 } });
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const PRIV = privateSourcesRoot(process.env);
const json = (f) => JSON.parse(readFileSync(join(BATCH, f), "utf8"));
const rows = (f, dir = BATCH) => { try { return readFileSync(join(dir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
function realReads() {
  if (PRIV.state !== "DECLARED") return [];
  const privateDir = join(PRIV.dir, relative(lookupStore(index, "RESEARCH").rootPath, BATCH));
  return withPrivateTexts(rows("source-reads.jsonl"), rows("source-reads.jsonl", privateDir), { privateRoot: PRIV.state });
}
const HERE = existsSync(join(BATCH, "capabilities-2026-10-18.json")) && existsSync(join(BATCH, "coverage-judgements-2026-10-18.json"));
/* the capability check reads the stored page texts — without them (no private sources root, or its texts not joined) the REAL proof cannot run */
const TEXTS = HERE && realReads().some((r) => r.url === json("capabilities-2026-10-18.json").capabilities[0].url && typeof r.text === "string");
const SKIP = HERE ? (TEXTS ? false : "the stored page texts of the product's pages are not joined on this machine") : "the declared batch is not on this machine";
function real() {
  const latest = new Map(); for (const r of realReads()) if (r.record_type === "source_page_read") latest.set(r.url, r);
  const caps = json("capabilities-2026-10-18.json").capabilities;
  const v = verifyCapabilities(caps, (u) => latest.get(u) ?? null, { contains });
  const records = new Map(); for (const r of [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl")]) records.set(r.question_id, r);
  const pages = json("page-drafts.json").pages;
  const entries = buildLibrary({ pages, recordOf: (id) => records.get(id) ?? null, judgements: json("coverage-judgements-2026-10-18.json").judgements, verified: v.verified });
  return { caps, v, records, pages, entries };
}

test("REAL · C1: every wording the batch's pages merge is kept word for word with its source and date — count in = count kept, 0 rewritten", { skip: SKIP }, () => {
  const { pages, records, entries } = real();
  const inCount = pages.reduce((s, p) => s + p.needs.reduce((t, n) => t + (n.questions ?? []).length, 0), 0);
  const kept = entries.reduce((s, e) => s + e.wordings.length, 0);
  assert.ok(inCount > 0);
  assert.equal(kept, inCount, `${inCount - kept} wording(s) not kept`);
  for (const e of entries) for (const w of e.wordings) { const r = records.get(w.questionId); assert.equal(w.text, r.value?.original ?? r.wording?.text, `${w.questionId} was rewritten`); }
  console.log(`  REAL (count-only): questions ${entries.length} · wordings in ${inCount} = kept ${kept} · rewritten 0`);
});

test("REAL · C2: every answer traces to a stored claim with its source and date, or is DATA GAP — 0 answers without a source", { skip: SKIP }, () => {
  const { pages, entries } = real();
  const claims = new Map(pages.flatMap((p) => p.needs.flatMap((n) => (n.answer?.claims ?? []).map((c) => [c.claimId, c]))));
  let answered = 0;
  for (const e of entries) {
    if (e.answer.state === ANSWER.DATA_GAP) continue;
    answered += 1;
    for (const c of e.answer.claims) { const s = claims.get(c.claimId); assert.ok(s && s.source.link === c.link && s.source.readOn === c.readOn, `${e.questionKey}: ${c.claimId} traces to no stored claim`); }
  }
  assert.ok(answered > 0);
  console.log(`  REAL (count-only): answered ${answered} · DATA GAP ${entries.length - answered} · answers without a source 0`);
});

test("REAL · C3: every capability record of the product found word for word in the engine's stored read of its own page; each coverage value traces to them or is UNKNOWN", { skip: SKIP }, () => {
  const { caps, v, entries } = real();
  assert.deepEqual(v.refused, [], `a capability record is not verified: ${JSON.stringify(v.refused)}`);
  assert.ok(caps.length >= 5);
  const ok = new Set(v.verified);
  for (const e of entries) {
    const c = e.coverage;
    if (c.state === COVERAGE.ADDRESSES || c.state === COVERAGE.PARTIALLY) assert.ok(c.capabilities.length && c.capabilities.every((id) => ok.has(id)), `${e.questionKey} rests on an unverified capability`);
    else if (c.state === COVERAGE.DOES_NOT_ADDRESS) assert.deepEqual([...c.against].sort(), [...ok].sort());
    else assert.equal(c.state, COVERAGE.UNKNOWN);
    if (c.state === COVERAGE.PARTIALLY) assert.ok(c.addressed && c.unaddressed);
  }
  const n = (s) => entries.filter((e) => e.coverage.state === s).length;
  assert.ok(n(COVERAGE.ADDRESSES) > 0 && n(COVERAGE.PARTIALLY) > 0 && n(COVERAGE.DOES_NOT_ADDRESS) > 0 && n(COVERAGE.UNKNOWN) > 0, "a coverage value has an empty population");
  console.log(`  REAL (count-only): capability records ${caps.length} (SELF-SOURCED) · verified ${v.verified.length} · ${Object.values(COVERAGE).map((s) => `${s} ${n(s)}`).join(" · ")}`);
});

test("REAL · C4: every DOES NOT ADDRESS question is on the gap list and no page answer speaks for the product on it", { skip: SKIP }, () => {
  const { caps, entries } = real();
  const names = [...new Set(caps.map((c) => new URL(c.url).host.split(".")[0]))];
  const g = gapsOf(entries, { productNames: names });
  const dna = entries.filter((e) => e.coverage.state === COVERAGE.DOES_NOT_ADDRESS).map((e) => e.questionKey);
  assert.ok(dna.length > 0);
  assert.deepEqual(g.gaps, dna);
  assert.deepEqual(g.answeredForProduct, [], "a page answers a gap on the product's behalf");
  console.log(`  REAL (count-only): gaps ${g.gaps.length} · answered on the product's behalf 0`);
});

test("REAL · C5 on a SCRATCH store: the real library built twice across one added question — two versions, both read back; the kept version is the real library's", { skip: SKIP }, () => {
  const { entries } = real();
  const kept = readVersions(rows("question-library.jsonl"));
  assert.ok(kept.length >= 1, "no version of the real library is kept in the batch");
  assert.equal(kept.at(-1).version, libraryVersion(entries), "the kept version is not the library as built now");
  const d = mkdtempSync(join(tmpdir(), "f50-"));
  try {
    const f = join(d, "question-library.jsonl");
    const without = entries.slice(0, -1);
    const r1 = nextVersionRecord(readVersions(rows("question-library.jsonl", d)), without, { on: "2026-10-18" }); appendFileSync(f, JSON.stringify(r1) + "\n");
    const r2 = nextVersionRecord(readVersions(rows("question-library.jsonl", d)), entries, { on: "2026-10-18" }); appendFileSync(f, JSON.stringify(r2) + "\n");
    const back = readVersions(rows("question-library.jsonl", d));
    assert.deepEqual(back.map((r) => [r.version, r.questions]), [[r1.version, entries.length - 1], [r2.version, entries.length]]);
    assert.equal(back[1].previous, back[0].version);
    console.log(`  REAL (count-only, scratch store): version 1 ${back[0].questions} questions · version 2 ${back[1].questions} · both read back · kept in the batch ${kept.length}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("REAL · C6: counts per field — intent, locale and stage each recorded or NOT RECORDED by name", { skip: SKIP }, () => {
  const { entries } = real();
  const fc = fieldCounts(entries);
  for (const k of ["intent", "locale", "stage"]) assert.equal(fc[k].recorded + fc[k].notRecorded, entries.length);
  assert.ok(entries.every((e) => ["intent", "locale", "stage"].every((k) => typeof e[k] === "string" && e[k] !== "")));
  console.log(`  REAL (count-only): of ${entries.length} — intent recorded ${fc.intent.recorded} · locale recorded ${fc.locale.recorded} · stage recorded ${fc.stage.recorded}; the rest NOT RECORDED`);
});

test("ENTRY · bin/question-library.mjs: counts only without --confirm, and no trail event; a bad call is a usage exit", { skip: SKIP }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/question-library.mjs", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--capabilities=capabilities-2026-10-18.json", "--judgements=coverage-judgements-2026-10-18.json", "--on=2026-10-18"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /capabilities {5}\d+ filed \(SELF-SOURCED\) · verified word for word in the stored read \d+ · refused 0/);
  assert.match(r.stdout, /gaps {13}\d+ · answered on the product's behalf 0/);
  assert.equal(go(["--capabilities=x.json"]).status, 2);
  assert.equal(trailSha(), TRAIL_BEFORE, "a counting run wrote the trail");
});

test("the library names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/research/question-library.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
