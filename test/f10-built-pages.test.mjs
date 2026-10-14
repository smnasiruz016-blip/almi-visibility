/**
 * 🔴 F10 · HUMAN QUESTION DISCOVERY — PROVED ON THE BUILT PAGES (Acceptance Amendment 4, _handoffs c063d3b; C3 to C7).
 *
 * One firing control per clause on neutral, constructed pages (a widget shop); the production path driven in a scratch world with a
 * confined audit store; and the REAL tests: the declared product's own built pages against its stored need records (counts only), a
 * deliberately planted duplicate caught and cancelled by the production path, and a deliberately planted subset page recorded REVIEW and
 * never cancelled — both in a scratch copy of the product's records, never in its own store. The production trail is not written.
 *
 * RR-262 · ONE CANCEL RULE: the page builder decides nothing about two pages that serve the same need — it reads the stored decisions
 * of this check and honours them on a rebuild (REBUILD · FIRING CONTROL, on constructed pages; REBUILD · PRODUCTION PATH, the builder's
 * own entry point over a scratch copy of the product's records with a planted cancellation).
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { ACCEPTANCES, F10_AMENDMENT_3 } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DISCLOSED_SEALS } from "../config/fboard/disclosed-seals.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { inputsOf, clusterInputs } from "../src/discovery/need-clusters.mjs";
import { renderJoined, JOINED_RECORD, STRUCTURE } from "../src/page/joined-page.mjs";
import * as BUILDER_MODULE from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { builtPages, pageSections, needIndex, needsOfPage, decidePairs, survivorOf, cancelAndMove, pagesVerdict, runBuiltPages, storedNeedRecords, rowResult, questionsOf, publicationOf,
  REFUSAL, MISSING, DECISION_RECORD, CANCEL_RECORD, MOVE_RECORD, DECISIONS, REVIEW_FLAG, DECISION_LABEL, SURVIVOR_STEPS, PUBLICATION, SECTION, VERDICTS } from "../src/page/built-page-needs.mjs";
import { storedDecisions, proposedAfterDecisions, constructionAfterDecisions, withStoredMoves } from "../src/page/stored-page-decisions.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const trailBefore = sha(readFileSync(TRAIL));
const CODE = ["src/page/built-page-needs.mjs", "bin/built-page-needs.mjs", "config/page/built-page-needs.mjs", "src/page/stored-page-decisions.mjs"];
/* RR-262: the page builder's own files — they hold no rule about two pages that serve the same need */
const BUILDER = ["src/page/joined-page.mjs", "bin/build-joined-pages.mjs", "src/page/stored-page-decisions.mjs"];
const text = (p) => readFileSync(join(REPO, p), "utf8");
const running = (p) => text(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/* ── neutral fixtures: a widget shop ── */
const DAY = "2026-09-01", T = "tenant:fixture-a";
const AI = { kind: "AI", name: "a model", on: DAY };
const FACT = { statement: "the licence in Atlantis is set by its own board", reference: "facts.json#atlantis-1" };
const Q = { q1: "How much is a widget?", q2: "Widget kitne ka hai?", q3: "Which licence does a fitter need?", q4: "Is a licence needed in Atlantis?", q5: "How do I book a widget?", q6: "How long does delivery take?", q7: "What colour is a widget?", q8: "How much is a widget service?" };
const F12_WORLD = () => ({
  phrases: [["p1", "widget fee"], ["p3", "widget fee for fitters"], ["p4", "widget price fitters"], ["p5", "widget fee for plumbers"]].map(([id, w]) => ({ record_type: "search_phrase", phrase_id: id, phrase: w, label: "OBSERVED" })),
  publicQuestions: Object.entries(Q).map(([id, w]) => ({ record_type: "public_question", question_id: id, value: { original: w, kind: "OBSERVED" } })),
  derivedQuestions: [],
});
const GROUPING = () => ({ cleanUp: ["case", "spaces", "end-punctuation"], needs: [
  { need: "cost", title: "What does a widget cost?", reason: "every wording asks the price of a widget", decidedBy: AI, wordings: [Q.q1, Q.q2, "widget fee", "widget fee for fitters", "widget price fitters", "widget fee for plumbers"] },
  { need: "licence", title: "Which licence?", reason: "every wording asks which licence is needed", decidedBy: AI, wordings: [Q.q3], countryParts: [{ country: "Atlantis", fact: FACT, wordings: [Q.q4] }] },
  { need: "booking", title: "How to book?", reason: "every wording asks how to book a widget", decidedBy: AI, wordings: [Q.q5] },
  { need: "delivery", title: "How long?", reason: "every wording asks how long delivery takes", decidedBy: AI, wordings: [Q.q6] },
  { need: "service-cost", title: "What does a service cost?", reason: "the price of a service, which is not the price of a widget", decidedBy: AI, wordings: [Q.q8] },
], navigational: [], noNeedYet: [Q.q7] });
const NEEDS = (() => { const i = inputsOf(F12_WORLD()); const c = clusterInputs({ inputs: i.inputs, unread: i.unread, grouping: GROUPING(), on: DAY }); assert.equal(c.refused.length, 0); return c.records; })();
/** a built page as the builder stores it, rendered by the production renderer: items = [[itemId, [questionId…], sourced?]] */
const page = (value, items, over = {}) => {
  const itemList = items.map(([needId, qs, sourced = true]) => ({ needId, needKey: needId, heading: { wording: over.wording?.[qs[0]] ?? Q[qs[0]] ?? qs[0], shown: over.wording?.[qs[0]] ?? Q[qs[0]] ?? qs[0], questionId: qs[0], tier: "OBSERVED" },
    questions: qs.map((id) => ({ questionId: id, wording: over.wording?.[id] ?? Q[id] ?? id, tier: "OBSERVED", country: null, language: null })),
    claims: sourced ? [{ claimId: `${needId}-1`, text: "A sourced answer.", source: "A body", link: "https://source.invalid/a", readOn: DAY }] : [], statements: [] }));
  const title = `Widgets for ${value}`;
  const html = over.html ?? renderJoined({ title, stamp: STAMP, items: itemList });
  return { record_type: JOINED_RECORD, measurement_key: `${JOINED_RECORD}:${value}:${over.build ?? 1}`, value, title, stamp: STAMP, recorded_at: over.at ?? `${DAY}T00:00:00Z`, itemList, html, questions: itemList.reduce((n, it) => n + it.questions.length, 0), ...(over.record ?? {}) };
};
const AUD = (map) => Object.fromEntries(Object.entries(map).map(([id, [audience, words, declaredOn = DAY]]) => [id, { audience, words, declaredOn }]));
const pagesOf = (records, audiences = {}, tenantId = T) => builtPages({ records, tenantId, audiences });
const FULL = [["i-cost", ["q1"]], ["i-licence", ["q3"]]];
const decide = (records, audiences = {}, extra = {}) => decidePairs({ pages: pagesOf(records, audiences), needRecords: NEEDS, on: DAY, ...extra });
const run = (records, audiences = {}) => runBuiltPages({ pages: pagesOf(records, audiences), needRecords: NEEDS, on: DAY });
const codes = (xs) => xs.map((x) => x.code);

/* ================= C3 ================= */

test("C3 · FIRING CONTROL: every built page has exactly one question-and-answer section and every question keeps its recorded wording; a page with none, a page with two, a need split across two sections and a changed wording are each caught by name, each count with its denominator", () => {
  const recorded = new Map(Object.entries(Q)), ix = needIndex(NEEDS), needOf = (q) => ix.byQuestion.get(q)?.need ?? null;
  const good = pageSections({ pages: pagesOf([page("alpha", [["i-cost", ["q1", "q2"]], ["i-licence", ["q3"]]]), page("beta", FULL)]), recorded, needOf });
  assert.deepEqual([good.counts, good.faults.length, good.rows.map((r) => r.section)], [{ pages: 2, present: 2, absent: 0, moreThanOne: 0 }, 0, [SECTION.PRESENT, SECTION.PRESENT]]);
  const p = page("alpha", [["i-cost", ["q1", "q2"]], ["i-licence", ["q3"]]]);
  const mark = `<h2>${STRUCTURE.questions}</h2>`;
  const none = pageSections({ pages: pagesOf([{ ...p, html: p.html.replace(mark, "<h2>Other</h2>") }]), recorded, needOf });
  assert.deepEqual([none.counts, codes(none.faults)], [{ pages: 1, present: 0, absent: 1, moreThanOne: 0 }, ["SECTION_ABSENT"]]);
  /* two sections, and the cost need's second question moved into the second: MORE THAN ONE, and the need is split */
  const cut = p.html.replace(`<p class="also">${STRUCTURE.alsoAsked}: ${Q.q2}</p>`, "").replace("</main>", `<section>${mark}<p>${Q.q2}</p></section></main>`);
  const two = pageSections({ pages: pagesOf([{ ...p, html: cut }]), recorded, needOf });
  assert.deepEqual([two.counts.moreThanOne, codes(two.faults).sort()], [1, ["NEED_SPLIT_ACROSS_SECTIONS", "SECTION_MORE_THAN_ONE"]]);
  const twoTogether = pageSections({ pages: pagesOf([{ ...p, html: p.html.replace("</main>", `<section>${mark}</section></main>`) }]), recorded, needOf });
  assert.deepEqual(codes(twoTogether.faults), ["SECTION_MORE_THAN_ONE"], "CONTROL: two sections with the need kept in one is not a split");
  const changed = pageSections({ pages: pagesOf([page("alpha", FULL, { wording: { q1: "What is the price of a widget?" } })]), recorded, needOf });
  assert.deepEqual(codes(changed.faults), ["WORDING_CHANGED"]);
  const lost = pageSections({ pages: pagesOf([{ ...p, html: p.html.split(Q.q3).join("Which permit?") }]), recorded, needOf });
  assert.deepEqual(codes(lost.faults), ["WORDING_LOST"]);
  assert.equal(rowResult({ sections: none, run: run([p, page("beta", [["i-book", ["q5"]]])]) }).result, VERDICTS.DISPROVED, "an ABSENT section did not disprove");
  /* F10 groups nothing by itself: the need of a question is only what the stored need records say */
  assert.deepEqual([...needsOfPage(pagesOf([p])[0], ix).needs.keys()].sort(), ["cost", "licence"]);
});

/* ================= C4 ================= */

test("C4 · FIRING CONTROL: the engine decides each pair from the stored need records and nothing else — the same needs in other words, another language or another country are SAME NEED; pages that each serve a need the other does not are DIFFERENT NEED; a question in no need record is CANNOT DECIDE; every decision carries its reason and is INFERRED; never a score; never across tenants", () => {
  /* the same needs, asked in different words and in two languages */
  const same = decide([page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]]), page("beta", [["i-cost", ["q2"]], ["i-licence", ["q3"]]])]);
  assert.deepEqual([same.decisions.length, same.decisions[0].decision, same.decisions[0].sharedNeeds, same.decisions[0].label, same.decisions[0].record_type], [1, DECISIONS.SAME, ["cost", "licence"], "INFERRED", DECISION_RECORD]);
  assert.deepEqual([same.decisions[0].reason.a.needs, same.decisions[0].reason.b.needs, same.decisions[0].reason.a.needRecords.length > 0, same.decisions[0].reason.why], [["cost", "licence"], ["cost", "licence"], true, "every need of each page is a need of the other"]);
  assert.equal(evidenceStateOf(same.decisions[0]).state, "INFERRED");
  assert.notEqual(DECISION_LABEL, "OBSERVED");
  /* a country-only difference: the country's wording stands inside the one need */
  assert.equal(decide([page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]]), page("beta", [["i-cost", ["q1"]], ["i-licence", ["q4"]]])]).decisions[0].decision, DECISIONS.SAME);
  /* WHOLE pages only: a shared need between pages that each serve one the other does not is not a duplicate */
  const diff = decide([page("alpha", [["i-cost", ["q1"]], ["i-book", ["q5"]]]), page("beta", [["i-cost", ["q2"]], ["i-del", ["q6"]]])]);
  assert.deepEqual([diff.decisions[0].decision, diff.decisions[0].reason.shared, diff.decisions[0].reason.onlyA, diff.decisions[0].reason.onlyB, diff.decisions[0].flag], [DECISIONS.DIFFERENT, 1, 1, 1, undefined]);
  /* two materially different intents that look alike */
  assert.equal(decide([page("alpha", [["i-cost", ["q1"]]]), page("beta", [["i-svc", ["q8"]]])]).decisions[0].decision, DECISIONS.DIFFERENT);
  /* CANNOT DECIDE, each with its missing fact named, never reported as either */
  const unplaced = decide([page("alpha", FULL), page("beta", [["i-cost", ["q1"]], ["i-x", ["q-unknown"]]])]);
  assert.deepEqual([unplaced.decisions[0].decision, unplaced.decisions[0].missing, unplaced.decisions[0].reason.unplaced], [DECISIONS.CANNOT, MISSING.UNPLACED, 1]);
  assert.deepEqual([decide([page("alpha", FULL), page("beta", [["i-col", ["q7"]]])]).decisions[0].missing, decidePairs({ pages: pagesOf([page("alpha", FULL), page("beta", FULL)]), needRecords: [], on: DAY }).decisions[0].missing], [MISSING.NO_NEED, MISSING.NO_RECORDS]);
  /* never a score */
  for (const f of ["similarity", "score", "threshold", "cutoff"]) assert.deepEqual(codes(decide([page("alpha", FULL), page("beta", FULL)], {}, { hint: { [f]: 0.9 } }).refused), [REFUSAL.SCORE], f);
  assert.equal(decide([page("alpha", [["i-cost", ["q1"]]]), page("beta", [["i-svc", ["q8"]]])], {}, { hint: { note: "they look alike" } }).decisions[0].decision, DECISIONS.DIFFERENT, "CONTROL: a hint with no score sways nothing");
  /* never across tenants, and a page without its tenant is not compared */
  const cross = decidePairs({ pages: [...pagesOf([page("alpha", FULL)], {}, "tenant:fixture-a"), ...pagesOf([page("beta", FULL)], {}, "tenant:fixture-b")], needRecords: NEEDS, on: DAY });
  assert.deepEqual([codes(cross.refused), cross.decisions.length], [[REFUSAL.CROSS_TENANT], 0]);
  assert.deepEqual(codes(decidePairs({ pages: pagesOf([page("alpha", FULL), page("beta", FULL)], {}, null), needRecords: NEEDS, on: DAY }).refused), [REFUSAL.NO_TENANT, REFUSAL.NO_TENANT]);
  /* every pair is decided and counted */
  assert.equal(decide([page("a", FULL), page("b", FULL), page("c", [["i-book", ["q5"]]])]).decisions.length, 3);
});

test("C4 · REVIEW · FIRING CONTROL: a page whose needs all stand inside another page's, with the same declared audience, is recorded REVIEW with its reason — a count of shared need records — and is never cancelled; with other audiences, with equal sets or with neither inside the other, no flag", () => {
  const big = page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]], ["i-book", ["q5"]]]), small = page("beta", [["i-cost", ["q2"]], ["i-licence", ["q4"]]]);
  const fitters = AUD({ alpha: ["fitters", ["fitter"]], beta: ["fitters", ["fitter"]] });
  const r = run([big, small], fitters);
  const d = r.decisions[0];
  assert.deepEqual([d.decision, d.flag, d.review, r.review.length, r.result.counts.review, r.result.verdict], [DECISIONS.DIFFERENT, REVIEW_FLAG, { smaller: "beta", larger: "alpha", sharedNeeds: 2, onlyTheLargerServes: 1, audience: "fitters" }, 1, 1, VERDICTS.PROVED]);
  assert.match(d.reason.why, /all of one page's needs are needs of the other/);
  assert.deepEqual([r.cancellations.length, r.moves.length, r.rebuilt.length, r.pages.map((p) => p.build)], [0, 0, 0, [big.measurement_key, small.measurement_key]], "a REVIEW pair was cancelled, changed or moved");
  assert.deepEqual(cancelAndMove({ decision: d, a: r.pages[0], b: r.pages[1], needRecords: NEEDS, on: DAY }).refused, { code: REFUSAL.REVIEW });
  /* no flag: other audiences; one audience not declared; equal sets; neither inside the other */
  assert.equal(run([big, small], AUD({ alpha: ["fitters", ["fitter"]], beta: ["plumbers", ["plumber"]] })).decisions[0].flag, undefined);
  assert.equal(run([big, small], AUD({ alpha: ["fitters", ["fitter"]] })).decisions[0].flag, undefined);
  assert.equal(decide([page("alpha", FULL), page("beta", FULL)], AUD({ alpha: ["fitters", []], beta: ["fitters", []] })).decisions[0].flag, undefined);
  assert.equal(decide([page("alpha", [["i-cost", ["q1"]], ["i-book", ["q5"]]]), page("beta", [["i-cost", ["q2"]], ["i-del", ["q6"]]])], fitters).decisions[0].flag, undefined);
  /* the flag is a count of need records: it does not move with how alike the wordings read */
  const unlike = run([big, page("beta", [["i-cost", ["q2"]], ["i-licence", ["q4"]]], { record: { title: "A wholly different title" } })], fitters);
  assert.equal(unlike.decisions[0].flag, REVIEW_FLAG);
});

/* ================= C5 ================= */

test("C5 · FIRING CONTROL: for a SAME NEED pair exactly one page is cancelled and every question of it moves, wording unchanged, into the survivor's question-and-answer section — kept once when the survivor already holds it; one record per cancellation and per moved question; the same input gives the same survivor; a published page and a page with no recorded publication state are refused by name and left unchanged", () => {
  const a = page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]]), b = page("beta", [["i-cost", ["q2", "q1"]], ["i-licence", ["q4"]]], { at: `${DAY}T05:00:00Z` });
  const r = run([a, b]);
  assert.deepEqual([r.cancellations.length, r.cancellations[0].cancelledPage, r.cancellations[0].survivorPage, r.cancellations[0].record_type, r.cancellations[0].label, r.pages.map((p) => p.pageId)], [1, "beta", "alpha", CANCEL_RECORD, "INFERRED", ["alpha"]]);
  assert.deepEqual(r.moves.map((m) => [m.record_type, m.questionId, m.wording, m.fromPage, m.intoPage, m.need, m.intoItem, m.alreadyHeld]), [[MOVE_RECORD, "q2", Q.q2, "beta", "alpha", "cost", "i-cost", false], [MOVE_RECORD, "q1", Q.q1, "beta", "alpha", "cost", "i-cost", true], [MOVE_RECORD, "q4", Q.q4, "beta", "alpha", "licence", "i-licence", false]]);
  assert.equal(r.moves[1].heldWording, Q.q1, "a question the survivor already holds lost its retrievable wording");
  const survivor = r.rebuilt[0];
  assert.deepEqual([questionsOf({ record: survivor }).map((q) => q.questionId), survivor.questions, survivor.html.split(Q.q1).length > 1, survivor.html.includes(Q.q2), survivor.html.includes(Q.q4)], [["q1", "q2", "q3", "q4"], 4, true, true, true], "the moved questions are not in the survivor's question-and-answer section, each once");
  assert.equal(pageSections({ pages: pagesOf([survivor]), recorded: new Map(Object.entries(Q)) }).faults.length, 0);
  assert.notEqual(survivor.measurement_key, a.measurement_key);
  assert.deepEqual([r.cancellations[0].movedQuestions, new Set([...r.cancellations, ...r.moves].map((x) => x.measurement_key)).size, r.cancellations[0].decidedByStep, r.cancellations[0].rule], [3, 4, "EARLIER BUILD", [...SURVIVOR_STEPS]]);
  assert.ok([...r.cancellations, ...r.moves].every((x) => evidenceStateOf(x).state === "INFERRED"));
  /* the same input, the same survivor and the same records */
  assert.deepEqual(JSON.stringify(run([a, b])), JSON.stringify(r));
  assert.deepEqual(run([b, a]).cancellations[0].cancelledPage, "beta", "the survivor moved with the order the pages were handed in");
  /* after the run no SAME NEED pair is left, and a second run over what stands cancels nothing */
  const again = runBuiltPages({ pages: r.pages, needRecords: NEEDS, on: DAY });
  assert.deepEqual([again.cancellations.length, again.result.counts.same], [0, 0]);
  /* a stored cancellation takes the cancelled build out of the pages as they stand */
  assert.deepEqual(pagesOf([a, b, ...r.cancellations, survivor]).map((p) => [p.pageId, p.build]), [["alpha", survivor.measurement_key]]);
  /* published, or no recorded state: left out of the comparison, and refused by name when handed to the cancellation */
  const live = { ...b, publishedAt: "2026-08-01" }, unknown = { ...b, stamp: "DRAFT" };
  assert.deepEqual([publicationOf(a), publicationOf(live), publicationOf(unknown)], [PUBLICATION.UNPUBLISHED, PUBLICATION.PUBLISHED, PUBLICATION.NOT_RECORDED]);
  for (const [other, code] of [[live, REFUSAL.PUBLISHED], [unknown, REFUSAL.NOT_RECORDED]]) {
    const left = run([a, other]);
    assert.deepEqual([left.cancellations.length, left.excluded.length, left.pages.map((p) => p.build), left.result.verdict], [0, 1, [a.measurement_key, other.measurement_key], VERDICTS.COULD_NOT]);
    const [pa, pb] = pagesOf([a, other]);
    const d = decide([a, b]).decisions[0];
    assert.equal(cancelAndMove({ decision: d, a: pa, b: pb, needRecords: NEEDS, on: DAY }).refused.code, code);
  }
  assert.equal(cancelAndMove({ decision: decide([a, page("beta", [["i-book", ["q5"]]])]).decisions[0], a: pagesOf([a])[0], b: pagesOf([b])[0], needRecords: NEEDS, on: DAY }).refused.code, REFUSAL.NOT_SAME);
});

test("C5 · SURVIVOR · FIRING CONTROL: the survivor is chosen by the owner's rule in its order — the audience match, then the sourced answers, then the earlier build — a later step decides only on a tie, and when all three tie nothing is cancelled; audience words declared after the run are refused", () => {
  const ix = needIndex(NEEDS);
  const a = page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]], { at: `${DAY}T09:00:00Z` }), b = page("beta", [["i-cost", ["q2"]], ["i-licence", ["q3"]]], { at: `${DAY}T01:00:00Z` });
  const pick = (records, audiences) => { const [pa, pb] = pagesOf(records, audiences); return survivorOf({ a: pa, b: pb, sharedNeeds: ["cost", "licence"], index: ix, on: DAY }); };
  /* step one: three recorded wordings of the shared needs hold a fitter word, one holds a plumber word — though beta was built earlier */
  const one = pick([a, b], AUD({ alpha: ["fitters", ["fitter", "fitters"]], beta: ["plumbers", ["plumber", "plumbers"]] }));
  assert.deepEqual([one.survivor.pageId, one.step, one.counts], ["alpha", "AUDIENCE MATCH", [{ step: "AUDIENCE MATCH", alpha: 3, beta: 1 }]]);
  /* step two, on a tie of the first: alpha answers both needs with a source, beta one */
  const bUnsourced = page("beta", [["i-cost", ["q2"]], ["i-licence", ["q3"], false]], { at: `${DAY}T01:00:00Z` });
  const two = pick([a, bUnsourced], {});
  assert.deepEqual([two.survivor.pageId, two.step, two.counts.map((c) => c.step), two.counts[1]], ["alpha", "SOURCED ANSWERS", ["AUDIENCE MATCH", "SOURCED ANSWERS"], { step: "SOURCED ANSWERS", alpha: 2, beta: 1 }]);
  /* step three, on a tie of both: the earlier build */
  const three = pick([a, b], {});
  assert.deepEqual([three.survivor.pageId, three.step, three.counts.length], ["beta", "EARLIER BUILD", 3]);
  /* an earlier step that does not tie is final: the later ones are not read */
  assert.deepEqual(pick([a, bUnsourced], AUD({ alpha: ["plumbers", ["plumber"]], beta: ["fitters", ["fitter", "fitters"]] })).survivor.pageId, "beta", "a later step overrode the audience match");
  /* all three tie: no survivor, nothing cancelled, the pair CANNOT DECIDE and the result not PROVED */
  const tieB = page("beta", [["i-cost", ["q2"]], ["i-licence", ["q3"]]], { at: `${DAY}T09:00:00Z` });
  assert.deepEqual([pick([a, tieB], {}).survivor, pick([a, tieB], {}).missing], [null, MISSING.TIE]);
  const tied = run([a, tieB]);
  assert.deepEqual([tied.cancellations.length, tied.pages.length, tied.decisions[0].decision, tied.decisions[0].missing, tied.result.verdict], [0, 2, DECISIONS.CANNOT, MISSING.TIE, VERDICTS.COULD_NOT]);
  /* the words are declared before the run */
  const late = AUD({ alpha: ["fitters", ["fitter"], "2026-09-02"], beta: ["plumbers", ["plumber"]] });
  assert.equal(pick([a, b], late).refused, REFUSAL.AUDIENCE_LATE);
  assert.deepEqual([run([a, b], late).cancellations.length, codes(run([a, b], late).refused)], [0, [REFUSAL.AUDIENCE_LATE]]);
  /* a whole word, in any letter case: "fitters" holds the word "fitters", and "outfitter" does not hold "fitter" */
  assert.equal(pick([a, b], AUD({ alpha: ["x", ["FITTERS"]], beta: ["y", ["itter"]] })).counts[0].alpha, 2);
  assert.equal(pick([a, b], AUD({ alpha: ["x", ["FITTERS"]], beta: ["y", ["itter"]] })).counts[0].beta, 0);
});

/* ================= C6 ================= */

test("C6 · FIRING CONTROL: after a run zero pairs are SAME NEED — PROVED only with at least two built, unpublished pages and every pair decided; DISPROVED when a SAME NEED pair remains; COULD-NOT-PROVE with no page, one page or a pair CANNOT DECIDE; a planted duplicate is caught and cancelled with its questions moved; the output carries counts only", () => {
  const a = page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]]), c = page("gamma", [["i-book", ["q5"]]]);
  const proved = run([a, c]);
  assert.deepEqual([proved.result.verdict, proved.result.counts], [VERDICTS.PROVED, { pages: 2, pairs: 1, same: 0, different: 1, review: 0, cannotDecide: 0 }]);
  assert.deepEqual([run([]).result.verdict, run([]).result.counts.pages, run([a]).result.verdict, run([a]).result.why], [VERDICTS.COULD_NOT, 0, VERDICTS.COULD_NOT, "fewer than two built, unpublished pages"]);
  assert.equal(run([a, page("beta", [["i-x", ["q-unknown"]]])]).result.verdict, VERDICTS.COULD_NOT);
  /* a SAME NEED pair that stands after a run reads DISPROVED, whatever else is true */
  const standing = decide([a, page("beta", FULL)]).decisions;
  assert.deepEqual([pagesVerdict({ pages: pagesOf([a, page("beta", FULL)]), decisions: standing }).verdict, pagesVerdict({ pages: pagesOf([a, c]), decisions: [] }).verdict], [VERDICTS.DISPROVED, VERDICTS.COULD_NOT]);
  /* the planted duplicate: a later copy serving alpha's needs, holding one question alpha does not */
  const plant = page("planted", [["i-cost", ["q2"]], ["i-licence", ["q3"]]], { at: `${DAY}T23:00:00Z` });
  assert.equal(decide([a, c, plant]).decisions.filter((d) => d.decision === DECISIONS.SAME).length, 1, "CONTROL: before the run the planted duplicate must be seen");
  const r = run([a, c, plant]);
  assert.deepEqual([r.cancellations.map((x) => [x.cancelledPage, x.survivorPage]), r.moves.filter((m) => !m.alreadyHeld).map((m) => m.questionId), r.result.verdict, r.result.counts.same, r.result.counts.pages], [[["planted", "alpha"]], ["q2"], VERDICTS.PROVED, 0, 2]);
  assert.match(r.cancellations[0].reason, /the two pages serve the same needs \(2\); the survivor was chosen by the step EARLIER BUILD/);
  /* counts only: nothing the result or a decision's own counts carry is a wording, a question or an address */
  assert.ok(!/https?:|How much|Widget/.test(JSON.stringify(r.result)));
});

test("C5 C6 · PRODUCTION PATH: the entry point, in a scratch world with a confined audit store, cancels a constructed same-need page exactly once through the governed write, keeps the moved questions and the survivor's new build, writes nothing without --confirm, and refuses when the need records are not stored", () => {
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", "fixture-pages"]] });
  after(() => W.cleanup());
  const dir = join(W.root, "research", "fixture-pages");
  mkdirSync(dir, { recursive: true });
  const jl = (name, rows) => writeFileSync(join(dir, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const read = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type !== RESIGHTING_TYPE) : []);
  const w = F12_WORLD();
  jl("search-phrases.jsonl", w.phrases); jl("questions.jsonl", w.publicQuestions);
  writeFileSync(join(dir, "need-grouping.json"), JSON.stringify(GROUPING()));
  const on = DAY;
  const a = page("alpha", [["i-cost", ["q1"]], ["i-licence", ["q3"]]]), plant = page("planted", [["i-cost", ["q2"]], ["i-licence", ["q3"]]], { at: `${DAY}T23:00:00Z` }), c = page("gamma", [["i-book", ["q5"]]]);
  jl("joined-pages.jsonl", [a, c, plant]);
  const go = (...extra) => spawnSync(process.execPath, ["bin/built-page-needs.mjs", ...W.argv([`--subject=${W.subject}`, "--research-batch=fixture-pages", `--on=${on}`, ...extra])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
  /* the need records are not in the store yet: refused, nothing written */
  const refused = go("--confirm");
  assert.deepEqual([refused.status, /NEED_RECORDS_NOT_STORED_AS_DERIVED/.test(refused.stderr), existsSync(join(dir, "built-page-needs.jsonl"))], [3, true, false], refused.stdout + refused.stderr);
  jl("need-clusters.jsonl", JSON.parse(JSON.stringify(NEEDS)));
  const dry = go();
  assert.deepEqual([dry.status, /NOT WRITTEN/.test(dry.stdout), existsSync(join(dir, "built-page-needs.jsonl")), read("joined-pages.jsonl").length], [0, true, false, 3], dry.stdout + dry.stderr);
  const first = go("--confirm");
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /cancelled {8}1 page\(s\) · questions moved 2 \(already held by the survivor 1\) · decided by EARLIER BUILD 1/);
  assert.match(first.stdout, /after the run {4}pages 2 · pairs 1 · SAME NEED 0 · DIFFERENT NEED 1 \(of those flagged REVIEW 0\) · CANNOT DECIDE 0/);
  assert.match(first.stdout, /result {11}PROVED/);
  assert.ok(!/How much|Widget|https?:/.test(first.stdout), "the output carries a question, a wording or an address");
  const kept = read("built-page-needs.jsonl");
  assert.deepEqual([kept.filter((r) => r.record_type === CANCEL_RECORD).map((r) => [r.cancelledPage, r.survivorPage, r.tenantId]), kept.filter((r) => r.record_type === MOVE_RECORD).length, kept.filter((r) => r.record_type === DECISION_RECORD).length, read("joined-pages.jsonl").length], [[["planted", "alpha", W.tenantId]], 2, 1, 4]);
  assert.ok(read("joined-pages.jsonl").at(-1).html.includes(Q.q2), "the survivor's new build does not hold the moved question");
  /* exactly once: a second run finds the cancelled build gone and cancels nothing more */
  const second = go("--confirm");
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.match(second.stdout, /cancelled {8}0 page\(s\)/);
  assert.deepEqual([read("built-page-needs.jsonl").filter((r) => r.record_type === CANCEL_RECORD).length, read("joined-pages.jsonl").length], [1, 4]);
  assert.equal(sha(readFileSync(TRAIL)), trailBefore, "the production trail was written by a scratch run");
});

/* ================= RR-262 · a rebuild honours the stored decisions ================= */

test("ONE RULE · FIRING CONTROL (RR-262): the page builder's module, its entry point and the reader of the stored decisions hold no cancel step, no survivor rule and no read of a same-need judgement — a planted one is caught; the entry point reads the stored decisions and joins only what they leave", () => {
  const RETIRED = ["cancelSamePages", "samePagePairs", "SURVIVOR_RULE", "CANCELLATION_RECORD"];
  assert.deepEqual(RETIRED.filter((name) => name in BUILDER_MODULE), [], "a retired export of the build-time cancel step is back");
  const holdsARule = (src) => /sameNeed|cancelSamePages|samePagePairs|SURVIVOR_RULE|SURVIVOR_STEPS|survivorOf|cancelAndMove|decidePairs|same_need_cancellation|audienceWords|sourcedNeeds|builtAt/.test(src);
  for (const file of BUILDER) assert.equal(holdsARule(running(file)), false, `${file} holds a rule of its own about two pages that serve the same need`);
  assert.equal(holdsARule(`${running(BUILDER[1])}\nconst resolved = cancelSamePages(proposed);`), true, "CONTROL: a planted build-time cancel step is not caught");
  assert.equal(holdsARule(`${running(BUILDER[2])}\nconst judged = proposed.sameNeed;`), true, "CONTROL: a planted read of a same-need judgement is not caught");
  assert.equal(holdsARule(`${running(BUILDER[2])}\nconst keep = survivorOf({ a, b });`), true, "CONTROL: a planted survivor rule is not caught");
  /* the entry point reads the stored decisions of this check, proposes and joins only what they leave, and places the stored moves */
  const bin = running(BUILDER[1]);
  for (const call of ["storedDecisions({ records: rowsOf(\"built-page-needs.jsonl\"), tenantId: SCOPE.tenantId })", "proposedAfterDecisions({ pages: proposed.pages, decisions: decided })", "constructionAfterDecisions({ construction: G.compiled.forConstruction, decisions: decided })", "joinPages({ construction: joinable.construction,", "withStoredMoves({ page: p, decisions: decided })"]) assert.ok(bin.includes(call), `the entry point does not call: ${call}`);
});

test("REBUILD · FIRING CONTROL (RR-262): the page builder reads the stored decisions and decides nothing — a page a stored cancellation names is not proposed again, every question its stored moves carried stands in the rebuilt survivor once and in its own wording, a REVIEW pair and a CANNOT DECIDE pair are built as they are and listed, and another tenant's records are not read", () => {
  const a = page("alpha", FULL), b = page("beta", [["i-cost", ["q2", "q1"]], ["i-licence", ["q4"]]], { at: `${DAY}T05:00:00Z` }), c = page("gamma", [["i-book", ["q5"]]]);
  const r = run([a, b, c]);
  assert.deepEqual(r.cancellations.map((x) => [x.cancelledPage, x.survivorPage]), [["beta", "alpha"]], "CONTROL: the constructed duplicate must have been cancelled by the one rule");
  const stored = [...r.decisions, ...r.cancellations, ...r.moves];
  const D = storedDecisions({ records: stored, tenantId: T });
  assert.deepEqual([[...D.cancelled.keys()], D.moves.map((m) => m.questionId), D.listed.length], [["beta"], ["q2", "q1", "q4"], 0]);
  /* the cancelled page is not proposed again; every other proposed page is, unchanged */
  const proposed = ["alpha", "beta", "gamma"].map((kind) => ({ combination: { kind }, needs: [{ key: `${kind}-need`, questions: ["q1"] }] }));
  const P = proposedAfterDecisions({ pages: proposed, decisions: D });
  assert.deepEqual([P.pages.map((p) => p.combination.kind), P.notBuilt.map((x) => [x.page, x.survivorPage, x.decidedByStep, x.cancellation])], [["alpha", "gamma"], [["beta", "alpha", "EARLIER BUILD", r.cancellations[0].measurement_key]]], "a cancelled page was proposed again, or a standing page was not");
  assert.ok(P.pages[0] === proposed[0] && P.pages[1] === proposed[2], "a proposed page was changed");
  /* the planning store still holds the cancelled page's needs: none of them is joined into a page again */
  const compiled = [["n1", "alpha"], ["n2", "beta"], ["n3", "beta"], ["n4", "gamma"]].map(([subject, kind]) => ({ spec: { subject, basis: { pageCandidate: JSON.stringify([["kind", kind]]) } } }));
  const J = constructionAfterDecisions({ construction: compiled, decisions: D });
  assert.deepEqual([J.construction.map((x) => x.spec.subject), J.heldBack], [["n1", "n4"], 2], "a need of a cancelled page would be joined into it again");
  assert.deepEqual([constructionAfterDecisions({ construction: compiled, decisions: storedDecisions({ records: [], tenantId: T }) }).construction.length, constructionAfterDecisions({ construction: compiled, decisions: storedDecisions({ records: [], tenantId: T }) }).heldBack], [4, 0], "CONTROL: with no stored record every compiled need is joined");
  /* CONTROL: with no stored record every proposed page is proposed, unchanged */
  const none = proposedAfterDecisions({ pages: proposed, decisions: storedDecisions({ records: [], tenantId: T }) });
  assert.deepEqual([none.pages.length, none.notBuilt.length, none.pages.every((p, i) => p === proposed[i])], [3, 0, true]);
  /* the survivor, built afresh as the builder joins it, holds only its own questions — the stored moves put the rest back */
  const fresh = page("alpha", FULL, { build: 2 });
  assert.deepEqual(questionsOf({ record: fresh }).map((q) => q.questionId), ["q1", "q3"], "CONTROL: the fresh build must lack the moved questions");
  const w = withStoredMoves({ page: fresh, decisions: D });
  assert.deepEqual([w.moved, w.alreadyHeld, w.placed, w.noItem], [3, 1, 2, 0]);
  assert.deepEqual([questionsOf({ record: w.record }).map((q) => [q.questionId, q.wording]), w.record.questions, w.record.html.split(Q.q1).length, w.record.html.includes(Q.q2), w.record.html.includes(Q.q4)],
    [[["q1", Q.q1], ["q2", Q.q2], ["q3", Q.q3], ["q4", Q.q4]], 4, fresh.html.split(Q.q1).length, true, true], "a moved question is not in the rebuilt survivor's question-and-answer section, once and in its own wording");
  assert.equal(w.record.html, r.rebuilt[0].html, "the rebuilt survivor is not the page the cancellation itself produced");
  assert.equal(pageSections({ pages: pagesOf([w.record]), recorded: new Map(Object.entries(Q)) }).faults.length, 0);
  assert.notEqual(w.record.measurement_key, fresh.measurement_key);
  /* a second rebuild over that page places nothing twice; a page no move names is handed back as it is */
  const again = withStoredMoves({ page: w.record, decisions: D });
  assert.deepEqual([again.placed, again.alreadyHeld, again.record === w.record], [0, 3, true]);
  assert.deepEqual([withStoredMoves({ page: c, decisions: D }).record === c, withStoredMoves({ page: c, decisions: D }).moved], [true, 0]);
  /* a move whose item is not on the rebuilt page is counted — never dropped silently, never put under another need */
  const thin = withStoredMoves({ page: page("alpha", [["i-cost", ["q1"]]], { build: 3 }), decisions: D });
  assert.deepEqual([thin.placed, thin.noItem, thin.record.html.includes(Q.q2), thin.record.html.includes(Q.q4)], [1, 1, true, false]);
  /* another tenant's stored records, and records that name no tenant, are not read */
  assert.deepEqual([storedDecisions({ records: stored, tenantId: "tenant:fixture-b" }).cancelled.size, storedDecisions({ records: stored.map(({ tenantId, ...x }) => x), tenantId: T }).cancelled.size, storedDecisions({ records: stored, tenantId: null }).moves.length], [0, 0, 0]);
  /* REVIEW and CANNOT DECIDE: built as they are, listed for the owner, nothing cancelled and nothing moved */
  const small = page("delta", [["i-cost", ["q2"]]]), odd = page("epsilon", [["i-odd", ["q-in-no-need-record"]]]);
  const rv = run([a, small, odd], AUD({ alpha: ["fitters", ["fitters"]], delta: ["fitters", ["fitters"]] }));
  const L = storedDecisions({ records: [...rv.decisions, ...rv.cancellations, ...rv.moves], tenantId: T });
  assert.deepEqual([L.cancelled.size, L.moves.length, L.listed.map((x) => [[...x.pages].sort().join("|"), x.as]).sort()], [0, 0, [["alpha|delta", REVIEW_FLAG], ["alpha|epsilon", DECISIONS.CANNOT], ["delta|epsilon", DECISIONS.CANNOT]]]);
  assert.ok(L.listed.every((x) => typeof x.why === "string" && x.why !== "" && typeof x.decision === "string" && x.decision !== ""), "a listed pair lacks its reason or its stored decision");
  const three = ["alpha", "delta", "epsilon"].map((kind) => ({ combination: { kind }, needs: [] }));
  assert.deepEqual([proposedAfterDecisions({ pages: three, decisions: L }).pages.length, proposedAfterDecisions({ pages: three, decisions: L }).notBuilt.length, withStoredMoves({ page: small, decisions: L }).record === small], [3, 0, true], "a REVIEW or CANNOT DECIDE pair changed what is built");
  /* a pair of which one page is cancelled is no longer listed */
  assert.equal(storedDecisions({ records: [...rv.decisions, { ...r.cancellations[0], cancelledPage: "delta" }], tenantId: T }).listed.filter((x) => x.pages.includes("delta")).length, 0);
});

test("REBUILD · PRODUCTION PATH (RR-262): the builder's own entry point, over a scratch copy of the declared product's records — a planted duplicate cancelled by the one rule is not proposed again and its moved questions stand in the rebuilt real page; a real page cancelled by a planted earlier page is NOT rebuilt; before any stored cancellation nothing is held back; the product's own store is unchanged and the plants are removed", () => {
  const real = realDir();
  const FILES = ["joined-pages.jsonl", "built-page-needs.jsonl", "need-clusters.jsonl", "page-drafts.json", "planning.jsonl"].filter((f) => existsSync(join(real, f)));
  const before = FILES.map((f) => sha(readFileSync(join(real, f))));
  const world = realWorld(real);
  assert.ok(world.pages.length >= 2, "EMPTY real population: fewer than two built pages");
  const [P, O] = [world.pages[0], world.pages[1]];
  const subject = subjectOf(real);
  const productId = String(lookupSubject(rootIndexFor(process.env), subject).entry?.members?.find((m) => m.resourceKind === "FACT_REGISTRY")?.resourceRef ?? "").split(":").pop().split("/")[0];
  const x = P.record.exception.record, on = P.record.recorded_at.slice(0, 10);
  /* the check runs on the day of the stored need records (it reads them only as derived on that day); the builder on the pages' own day */
  const needsDay = realDay(real);
  const N1 = jsonIn(real, "page-drafts.json").pages.length + 1;
  const afterP = new Date(Date.parse(P.record.recorded_at) + 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const audiences = jsonIn(real, "page-audiences.json"), drafts = jsonIn(real, "page-drafts.json");
  const dimension = Object.keys(drafts.pages[0].combination)[0];
  const needOfQ = (q) => world.ix.byQuestion.get(q)?.need ?? null;
  /* plant 1 · a later test-only copy of the first real page that also holds, under the needs both real pages share, the other page's questions */
  const mine = new Set(questionsOf(P).map((q) => q.questionId));
  const extra = (O.record.itemList ?? []).flatMap((it) => it.questions).filter((q) => !mine.has(q.questionId) && needsOfPage(P, world.ix).needs.has(needOfQ(q.questionId)));
  assert.ok(extra.length > 0, "the plant has no question the survivor lacks — nothing would be moved");
  const itemList = P.record.itemList.map((it) => { const need = it.questions.map((q) => needOfQ(q.questionId)).find(Boolean); const add = extra.filter((q) => needOfQ(q.questionId) === need && !it.questions.some((y) => y.questionId === q.questionId)); extra.splice(0, extra.length, ...extra.filter((q) => !add.includes(q))); return { ...it, questions: [...it.questions, ...add] }; });
  const added = itemList.flatMap((it) => it.questions).filter((q) => !mine.has(q.questionId));
  const later = { ...P.record, value: "planted-duplicate", measurement_key: `${JOINED_RECORD}:planted-duplicate`, recorded_at: afterP, itemList, questions: P.record.questions + added.length };
  /* plant 2 · a test-only copy of the second real page, built EARLIER than it: by the one rule the real page is the one cancelled */
  const earlier = { ...O.record, value: "planted-earlier", measurement_key: `${JOINED_RECORD}:planted-earlier`, recorded_at: "2026-01-01T00:00:00Z" };

  const scratch = (plant, like) => {
    const W = declaredWorld();
    const dir = join(W.root, "research", BATCH);
    appendFileSync(join(dir, "joined-pages.jsonl"), JSON.stringify(plant) + "\n");
    writeFileSync(join(dir, "page-audiences.json"), JSON.stringify({ ...audiences, pages: { ...audiences.pages, [plant.value]: audiences.pages[like.pageId] } }));
    /* the planted page is proposed too, with nothing to connect: whether it is proposed is what is measured */
    writeFileSync(join(dir, "page-drafts.json"), JSON.stringify({ ...drafts, pages: [...drafts.pages, { combination: { [dimension]: plant.value }, needs: [] }] }));
    const go = (bin, day, ...args) => spawnSync(process.execPath, [bin, ...W.argv([`--subject=${subject}`, `--research-batch=${BATCH}`, `--on=${day}`, ...args, "--confirm"])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const build = () => go("bin/build-joined-pages.mjs", on, `--product=${productId}`, `--test-exception=${x.repo}:${x.path}@${x.commit}`);
    return { W, dir, build, check: () => go("bin/built-page-needs.mjs", needsDay) };
  };
  const builds = (dir, value) => rowsIn(dir, "joined-pages.jsonl").filter((r) => r.record_type === JOINED_RECORD && r.value === value);

  const A = scratch(later, P);
  try {
    /* CONTROL: before any stored cancellation the builder holds nothing back */
    const b0 = A.build();
    assert.equal(b0.status, 0, b0.stdout + b0.stderr);
    assert.match(b0.stdout, new RegExp(`cancelled page\\(s\\) not rebuilt 0 of ${N1} proposed · stored moves 0 · .* · page\\(s\\) to build ${N1}`));
    const c1 = A.check();
    assert.equal(c1.status, 0, c1.stdout + c1.stderr);
    const cancel = rowsIn(A.dir, "built-page-needs.jsonl").filter((r) => r.record_type === CANCEL_RECORD), moves = rowsIn(A.dir, "built-page-needs.jsonl").filter((r) => r.record_type === MOVE_RECORD);
    assert.deepEqual(cancel.map((r) => [r.cancelledPage, r.survivorPage]), [["planted-duplicate", P.pageId]], "CONTROL: the planted duplicate must have been cancelled by the one rule");
    const b1 = A.build();
    assert.equal(b1.status, 0, b1.stdout + b1.stderr);
    assert.match(b1.stdout, new RegExp(`cancelled page\\(s\\) not rebuilt 1 of ${N1} proposed · stored moves \\d+ · .* · page\\(s\\) to build ${N1 - 1}`), "the cancelled page was proposed again");
    assert.ok(b1.stdout.includes("    not rebuilt    planted-duplicate — cancelled by a stored decision"), b1.stdout);
    assert.deepEqual(builds(A.dir, "planted-duplicate").map((r) => r.measurement_key), [later.measurement_key], "the cancelled page was rebuilt");
    const rebuilt = builds(A.dir, P.pageId).at(-1);
    assert.deepEqual([moves.length, moves.filter((m) => !m.alreadyHeld).length], [later.questions, added.length]);
    assert.ok(b1.stdout.includes(`  page ${P.pageId} — stored moves ${moves.length}: already on the rebuilt page ${moves.length - added.length} · placed ${added.length} · with no item on the rebuilt page 0`), b1.stdout);
    assert.deepEqual([rebuilt.questions, rebuilt.recorded_at.slice(0, 10), Array.isArray(rebuilt.movedIn) && rebuilt.movedIn.length], [P.record.questions + added.length, on, added.length], "the rebuilt real page does not hold the moved questions");
    assert.ok(added.every((q) => rebuilt.html.toLowerCase().includes(q.wording.toLowerCase().replace(/&/g, "&amp;")) && rebuilt.itemList.some((it) => it.questions.some((y) => y.questionId === q.questionId && y.wording === q.wording))), "a moved question is not in the rebuilt page's question-and-answer section in its own wording");
    const after1 = realWorld(A.dir);
    assert.deepEqual([after1.sections.faults.length, after1.pages.map((p) => p.pageId).sort()], [0, world.pages.map((p) => p.pageId).sort()]);
    console.log(`  REAL REBUILD (count-only; a scratch copy, the builder's own entry point): ${JSON.stringify({ proposed: N1, notRebuilt: 1, storedMoves: moves.length, alreadyOnTheRebuiltPage: moves.length - added.length, placedInTheRebuiltPage: added.length, withNoItem: 0 })}`);
  } finally { A.W.cleanup(); }
  assert.equal(existsSync(A.W.root), false, "the planted duplicate was not removed");

  const B = scratch(earlier, O);
  try {
    const c1 = B.check();
    assert.equal(c1.status, 0, c1.stdout + c1.stderr);
    const cancel = rowsIn(B.dir, "built-page-needs.jsonl").filter((r) => r.record_type === CANCEL_RECORD);
    assert.deepEqual(cancel.map((r) => [r.cancelledPage, r.survivorPage, r.decidedByStep]), [[O.pageId, "planted-earlier", "EARLIER BUILD"]], "CONTROL: the real page must have been cancelled by the one rule");
    const had = builds(B.dir, O.pageId).length;
    const b1 = B.build();
    assert.equal(b1.status, 0, b1.stdout + b1.stderr);
    assert.match(b1.stdout, new RegExp(`cancelled page\\(s\\) not rebuilt 1 of ${N1} proposed`));
    assert.match(b1.stdout, /stored decisions \d+ compiled need\(s\) of cancelled page\(s\) held back from the join/, "the cancelled real page's stored needs were not held back from the join");
    assert.ok(b1.stdout.includes(`    not rebuilt    ${O.pageId} — cancelled by a stored decision (survivor planted-earlier, step EARLIER BUILD)`), b1.stdout);
    assert.deepEqual([b1.stdout.includes(`  page ${O.pageId} — `), b1.stdout.includes(`  page ${P.pageId} — `), builds(B.dir, O.pageId).length], [false, true, had], "a page cancelled by a stored decision was rebuilt");
    console.log(`  REAL REBUILD (count-only; a scratch copy): ${JSON.stringify({ realPageCancelledByAPlantedEarlierPage: 1, rebuiltAfterwards: 0, otherRealPageBuilt: 1 })}`);
  } finally { B.W.cleanup(); }
  assert.equal(existsSync(B.W.root), false, "the planted earlier page was not removed");
  assert.deepEqual(FILES.map((f) => sha(readFileSync(join(real, f)))), before, "the product's own store was changed by a plant");
  assert.equal(sha(readFileSync(TRAIL)), trailBefore, "the production trail was written by a scratch run");
});

/* ================= C7 ================= */

test("C7 · CENSUS: no production path of the built-pages check reads the sealed set, the pair set or either key — a planted read is caught; the board refuses F10 VERIFIED-PASS when its recorded evidence names the disclosed seal and is silent when it does not; the seal's registrations are the frozen ones", () => {
  const SEAL = /sealed|storage[- ]?S\b|marking[- ]?key|heldout|held-out|f10-c3-selection|f10-c7-pairs|evidence-roles|disclosed-seals/i;
  const reads = (src) => SEAL.test(src);
  for (const f of CODE) assert.equal(reads(running(f)), false, `${f} names the sealed set or its storage`);
  assert.equal(reads(`${running(CODE[0])}\nimport { sealedReader } from "../governance/sealed-read.mjs";`), true, "CONTROL: a planted read of the sealed set is not caught");
  /* the two files that run hold no similarity measure (the declared list of refused score fields lives in the config, and only names them) */
  for (const f of CODE.slice(0, 2)) assert.ok(!/similar|levenshtein|cosine|jaccard|embedding/i.test(running(f)), `${f} holds a similarity measure`);
  assert.ok(/similar/i.test(`${running(CODE[0])}\nconst similarity = 0.9;`), "CONTROL: a planted similarity measure is not caught");
  /* the frozen acceptance names the two commitments, and the disclosure lists exactly those */
  for (const s of DISCLOSED_SEALS[0].sets) assert.ok(ACCEPTANCES.F10.input.includes(s.contentHash), "the frozen acceptance does not name a registered commitment");
  assert.equal(DISCLOSED_SEALS[0].authority.sha256, F10_AMENDMENT_3.ruling.sha256);
  /* the board check, as Amendment 4 restates it */
  const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now }, registry: EVIDENCE_ROLE_REGISTRY };
  const passed = (event) => buildBoard(CAPABILITIES, DECLARED).map((r) => (r.featureId === "F10" ? { ...r, state: "VERIFIED-PASS", events: [...r.events.filter((e) => e.kind !== "VERIFIED"), { kind: "VERIFIED", featureId: "F10", population: "REAL", on: "2026-10-13", from: "IN-PROGRESS", to: "VERIFIED-PASS", ...event }] } : r));
  const has = (board) => boardErrors(board, ctx).some((e) => e.code === "VERIFIED_ON_DISCLOSED_SEAL" && e.id === "F10");
  assert.equal(has(passed({ proofs: "the built pages" })), false, "a pass on the built pages was refused though its evidence names no seal");
  assert.equal(has(passed({ proofs: `agreement on ${DISCLOSED_SEALS[0].sets[0].id}` })), true, "a pass whose evidence names the sealed set was not refused");
  assert.equal(has(passed({ sabotage: DISCLOSED_SEALS[0].sets[1].contentHash })), true, "a pass whose evidence names the pair set's commitment was not refused");
  assert.equal(has(passed({ populations: `stated as ${DISCLOSED_SEALS[0].evidenceClass}` })), true, "a pass stated in the disclosed class was not refused");
});

/* ================= REAL ================= */

/* the real population is FOUND, never named here: the research batch that holds both the built pages and the need store (the newest
 * by name when there are several), and the subject its own page records name — this file carries no client's name */
const RESEARCH = () => lookupStore(rootIndexFor(process.env), "RESEARCH").dir;
const BATCH = (() => { const d = RESEARCH(); return (existsSync(d) ? readdirSync(d) : []).filter((b) => existsSync(join(d, b, "joined-pages.jsonl")) && existsSync(join(d, b, "need-clusters.jsonl"))).sort().at(-1) ?? "NO-BATCH-HOLDS-BUILT-PAGES-AND-NEEDS"; })();
const realDir = () => join(RESEARCH(), BATCH);
const subjectOf = (dir) => rowsIn(dir, "joined-pages.jsonl").filter((r) => r.record_type === JOINED_RECORD).at(-1)?.subject ?? null;
const rowsIn = (dir, name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type !== RESIGHTING_TYPE) : []);
const jsonIn = (dir, name) => (existsSync(join(dir, name)) ? JSON.parse(readFileSync(join(dir, name), "utf8")) : null);
/* RR-264: the day of the real population is READ from its own stored records — the newest day any of them carries — never fixed */
const realDay = (dir) => [...rowsIn(dir, "need-clusters.jsonl"), ...rowsIn(dir, "built-page-needs.jsonl"), ...rowsIn(dir, "joined-pages.jsonl")].map((r) => String(r.recorded_at ?? "").slice(0, 10))
  .concat(Object.values(jsonIn(dir, "page-audiences.json")?.pages ?? {}).map((a) => String(a?.declaredOn ?? ""))).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1) ?? "2026-10-13";
const realWorld = (dir, on = realDay(dir)) => {
  const i = inputsOf({ phrases: rowsIn(dir, "search-phrases.jsonl"), publicQuestions: rowsIn(dir, "questions.jsonl"), derivedQuestions: rowsIn(dir, "research-derived-questions.jsonl") });
  const N = storedNeedRecords({ derived: clusterInputs({ inputs: i.inputs, unread: i.unread, grouping: jsonIn(dir, "need-grouping.json"), on }), stored: rowsIn(dir, "need-clusters.jsonl") });
  /* the tenant is the one the stored decisions were made for (the governed run's own scope); before any run, a stand-in */
  const tenantId = rowsIn(dir, "built-page-needs.jsonl").find((r) => r.record_type === DECISION_RECORD)?.tenantId ?? "tenant:not-yet-run";
  const pages = builtPages({ records: [...rowsIn(dir, "joined-pages.jsonl"), ...rowsIn(dir, "built-page-needs.jsonl")], tenantId, audiences: jsonIn(dir, "page-audiences.json")?.pages ?? {} });
  const ix = needIndex(N.records);
  const recorded = new Map(i.inputs.filter((x) => x.kind === "QUESTION").map((x) => [x.inputId.slice(x.inputId.indexOf(":") + 1), x.wording]));
  return { N, pages, ix, sections: pageSections({ pages, recorded, needOf: (q) => ix.byQuestion.get(q)?.need ?? null }), run: runBuiltPages({ pages, needRecords: N.records, on }) };
};

test("REAL · C3 C4 C6 · the declared product's built, unpublished pages against its stored need records: every page with one question-and-answer section and its questions in their recorded wording, every pair decided from the need records, zero pairs SAME NEED — and F10 is VERIFIED only on that result, with the decisions stored", () => {
  assert.ok(existsSync(join(realDir(), "joined-pages.jsonl")) && existsSync(join(realDir(), "need-clusters.jsonl")), "EMPTY real population: the built pages or the need store is not in the research batch");
  const w = realWorld(realDir());
  assert.equal(w.N.refused, null, "the need records of the grouping as it stands are not in the need store");
  assert.ok(w.pages.length > 0, "EMPTY real population");
  assert.ok(w.pages.every((p) => p.publication === PUBLICATION.UNPUBLISHED), "a real page is published, or its publication state is not recorded");
  assert.deepEqual([w.sections.faults.length, w.sections.counts.present], [0, w.pages.length]);
  assert.ok(w.pages.every((p) => needsOfPage(p, w.ix).unplaced.length === 0 && needsOfPage(p, w.ix).needs.size > 0), "a real page holds a question no need record places");
  const c = w.run.result.counts;
  assert.deepEqual([c.pairs, c.same, c.cannotDecide, w.run.refused.length, w.run.faults.length], [(w.pages.length * (w.pages.length - 1)) / 2, 0, 0, 0, 0]);
  assert.ok(w.run.decisions.every((d) => d.label === "INFERRED" && d.reason && evidenceStateOf(d).state === "INFERRED"));
  const row = rowResult({ sections: w.sections, run: w.run });
  const stored = new Map(rowsIn(realDir(), "built-page-needs.jsonl").map((x) => [x.measurement_key, x]));
  const kept = w.run.decisions.every((d) => JSON.stringify(stored.get(d.measurement_key)) === JSON.stringify(d));
  const board = DECLARED.F10.state;
  console.log(`  REAL (count-only; the declared product's built pages against its stored need records): ${JSON.stringify({ pages: w.pages.length, needRecords: w.N.records.length, sections: w.sections.counts, ...c, result: row.result, decisionsStored: kept, board })}`);
  if (board === "VERIFIED-PASS") assert.deepEqual([row.result, kept], [VERDICTS.PROVED, true], "F10 is VERIFIED-PASS while its real result is not PROVED, or its decisions are not stored");
  else assert.ok([VERDICTS.PROVED, VERDICTS.COULD_NOT, VERDICTS.DISPROVED].includes(row.result));
});

test("REAL · C5 C6 · a deliberately planted duplicate of a real built page is caught and cancelled by the production path, its questions moved into the survivor and the record showing why; a deliberately planted subset page comes out REVIEW and is never cancelled — both in a scratch copy, the product's own store unchanged, the plants removed", () => {
  const real = realDir();
  const FILES = ["joined-pages.jsonl", "built-page-needs.jsonl", "need-clusters.jsonl"].filter((f) => existsSync(join(real, f)));
  const before = FILES.map((f) => sha(readFileSync(join(real, f))));
  const pages = [...new Map(rowsIn(real, "joined-pages.jsonl").filter((r) => r.record_type === JOINED_RECORD).map((r) => [r.value, r])).values()];
  assert.ok(pages.length >= 2, "EMPTY real population: fewer than two built pages");
  const world = realWorld(real);
  const [P, O] = [world.pages[0], world.pages[1]];
  const needOfQ = (q) => world.ix.byQuestion.get(q)?.need ?? null;
  /* THE PLANTED DUPLICATE: a test-only copy of the first real page that serves exactly its needs — and, under the needs both real pages
   * share, also holds the other page's questions, so that a move has something real to move */
  const mine = new Set(questionsOf(P).map((q) => q.questionId));
  const extra = (O.record.itemList ?? []).flatMap((it) => it.questions).filter((q) => !mine.has(q.questionId) && needsOfPage(P, world.ix).needs.has(needOfQ(q.questionId)));
  assert.ok(extra.length > 0, "the plant has no question the survivor lacks — nothing would be moved");
  const itemList = P.record.itemList.map((it) => { const need = it.questions.map((q) => needOfQ(q.questionId)).find(Boolean); const add = extra.filter((q) => needOfQ(q.questionId) === need && !it.questions.some((x) => x.questionId === q.questionId)); extra.splice(0, extra.length, ...extra.filter((q) => !add.includes(q))); return { ...it, questions: [...it.questions, ...add] }; });
  const addedCount = itemList.reduce((n, it) => n + it.questions.length, 0) - P.record.questions;
  const ON = realDay(real), afterP = new Date(Date.parse(P.record.recorded_at) + 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const dup = { ...P.record, value: "planted-duplicate", measurement_key: `${JOINED_RECORD}:planted-duplicate`, recorded_at: afterP, itemList, questions: P.record.questions + addedCount };
  /* THE PLANTED SUBSET: a test-only page with the same declared audience as that real page and only some of its needs */
  const some = P.record.itemList.slice(0, Math.max(1, Math.floor(P.record.itemList.length / 3)));
  const subset = { ...P.record, value: "planted-subset", measurement_key: `${JOINED_RECORD}:planted-subset`, recorded_at: afterP, itemList: some, questions: some.reduce((n, it) => n + it.questions.length, 0) };
  const audiences = jsonIn(real, "page-audiences.json");
  assert.ok(audiences?.pages?.[P.pageId]?.audience, "the real page's audience is not declared");

  const scratch = (plant) => {
    const W = declaredWorld();
    const dir = join(W.root, "research", BATCH);
    appendFileSync(join(dir, "joined-pages.jsonl"), JSON.stringify(plant) + "\n");
    writeFileSync(join(dir, "page-audiences.json"), JSON.stringify({ ...audiences, pages: { ...audiences.pages, [plant.value]: audiences.pages[P.pageId] } }));
    const r = spawnSync(process.execPath, ["bin/built-page-needs.mjs", ...W.argv([`--subject=${subjectOf(real)}`, `--research-batch=${BATCH}`, `--on=${ON}`, "--confirm"])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    return { W, dir, r };
  };
  /* the duplicate */
  const D = scratch(dup);
  try {
    assert.equal(D.r.status, 0, D.r.stdout + D.r.stderr);
    const kept = rowsIn(D.dir, "built-page-needs.jsonl");
    const cancel = kept.filter((x) => x.record_type === CANCEL_RECORD), moves = kept.filter((x) => x.record_type === MOVE_RECORD);
    assert.deepEqual(cancel.map((x) => [x.cancelledPage, x.survivorPage, x.decidedByStep]), [["planted-duplicate", P.pageId, "EARLIER BUILD"]], "the planted duplicate was not caught and cancelled, or the wrong page survived");
    assert.match(cancel[0].reason, /the two pages serve the same needs/);
    assert.deepEqual([moves.length, moves.filter((m) => !m.alreadyHeld).length], [dup.questions, addedCount], "a question of the cancelled page was not moved");
    const survivor = rowsIn(D.dir, "joined-pages.jsonl").at(-1);
    assert.deepEqual([survivor.value, survivor.questions], [P.pageId, P.record.questions + addedCount]);
    assert.ok(moves.filter((m) => !m.alreadyHeld).every((m) => survivor.html.toLowerCase().includes(m.wording.toLowerCase().replace(/&/g, "&amp;"))), "a moved question is not in the survivor's question-and-answer section");
    const after1 = realWorld(D.dir);
    assert.deepEqual([after1.pages.map((p) => p.pageId).sort(), after1.run.result.counts.same, after1.run.result.verdict, after1.sections.faults.length], [world.pages.map((p) => p.pageId).sort(), 0, VERDICTS.PROVED, 0]);
    console.log(`  REAL PLANT (count-only; a scratch copy, the production path): ${JSON.stringify({ caught: cancel.length, survivorIsTheRealPage: cancel[0].survivorPage === P.pageId, decidedByStep: cancel[0].decidedByStep, questionsOfThePlant: moves.length, movedIntoTheSurvivor: addedCount, alreadyHeld: moves.length - addedCount, sameNeedPairsAfter: after1.run.result.counts.same })}`);
  } finally { D.W.cleanup(); }
  assert.equal(existsSync(D.W.root), false, "the planted duplicate was not removed");
  /* the subset */
  const S = scratch(subset);
  try {
    assert.equal(S.r.status, 0, S.r.stdout + S.r.stderr);
    const kept = rowsIn(S.dir, "built-page-needs.jsonl");
    const review = kept.filter((x) => x.record_type === DECISION_RECORD && x.flag === REVIEW_FLAG);
    assert.deepEqual([review.map((x) => [x.decision, x.review.smaller, x.review.larger, x.review.audience]), kept.filter((x) => x.record_type === CANCEL_RECORD).length, kept.filter((x) => x.record_type === MOVE_RECORD).length], [[[DECISIONS.DIFFERENT, "planted-subset", P.pageId, audiences.pages[P.pageId].audience]], 0, 0], "the planted subset page was not recorded REVIEW, or was cancelled");
    assert.ok(review[0].review.sharedNeeds > 0 && review[0].review.onlyTheLargerServes > 0 && /all of one page's needs/.test(review[0].reason.why));
    assert.equal(rowsIn(S.dir, "joined-pages.jsonl").filter((r) => r.record_type === JOINED_RECORD).at(-1).measurement_key, subset.measurement_key, "a page was rebuilt or changed for a REVIEW pair");
    console.log(`  REAL SUBSET (count-only; a scratch copy, the production path): ${JSON.stringify({ review: review.length, cancelled: 0, sharedNeeds: review[0].review.sharedNeeds, onlyTheLargerServes: review[0].review.onlyTheLargerServes })}`);
  } finally { S.W.cleanup(); }
  assert.equal(existsSync(S.W.root), false, "the planted subset page was not removed");
  assert.deepEqual(FILES.map((f) => sha(readFileSync(join(real, f)))), before, "the product's own store was changed by a plant");
});

/* ================= RR-264 ================= */

test("NEED RECORDS · FIRING CONTROL (RR-264): a need record the store holds from an EARLIER day is the record derived today — the day is not its content; a record changed in any other field, or absent, is refused", () => {
  const today = { record_type: "need_cluster", measurement_key: "need_cluster:k1", recorded_at: "2026-10-14T00:00:00Z", need: "fee", reason: "every wording asks the price", members: [{ inputId: "q1" }] };
  const derived = { refused: [], records: [today] };
  const earlier = { ...today, recorded_at: "2026-10-13T00:00:00Z" };
  assert.deepEqual([storedNeedRecords({ derived, stored: [earlier] }).refused, storedNeedRecords({ derived, stored: [today] }).refused], [null, null]);
  /* CONTROL: every other field still decides — a changed reason, a changed member, a lost record */
  assert.equal(storedNeedRecords({ derived, stored: [{ ...earlier, reason: "another reason" }] }).refused, "NEED_RECORDS_NOT_STORED_AS_DERIVED");
  assert.equal(storedNeedRecords({ derived, stored: [{ ...today, members: [{ inputId: "q2" }] }] }).refused, "NEED_RECORDS_NOT_STORED_AS_DERIVED");
  assert.equal(storedNeedRecords({ derived, stored: [] }).refused, "NEED_RECORDS_NOT_STORED_AS_DERIVED");
});

test("TITLE PLAN · FIRING CONTROL (RR-264): the builder's own entry point, over a scratch copy — a title plan that names no phrase stored in the batch refuses the run before anything is written; the plans as recorded build, each title part traced to its stored phrase", () => {
  const real = realDir();
  const world = realWorld(real);
  assert.ok(world.pages.length > 0, "EMPTY real population");
  const P = world.pages[0];
  const subject = subjectOf(real);
  const productId = String(lookupSubject(rootIndexFor(process.env), subject).entry?.members?.find((m) => m.resourceKind === "FACT_REGISTRY")?.resourceRef ?? "").split(":").pop().split("/")[0];
  const x = P.record.exception.record, on = P.record.recorded_at.slice(0, 10);
  const plans = jsonIn(real, "title-plans.json") ?? [];
  assert.ok(plans.length > 0, "EMPTY real population: no title plan is recorded");
  const W = declaredWorld();
  const dir = join(W.root, "research", BATCH);
  const build = () => spawnSync(process.execPath, ["bin/build-joined-pages.mjs", ...W.argv([`--subject=${subject}`, `--product=${productId}`, `--research-batch=${BATCH}`, `--on=${on}`, `--test-exception=${x.repo}:${x.path}@${x.commit}`, "--confirm"])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
  const STORES = ["joined-pages.jsonl", "planning.jsonl"];
  try {
    const before = STORES.map((f) => sha(readFileSync(join(dir, f))));
    writeFileSync(join(dir, "title-plans.json"), JSON.stringify([...plans, { page: plans[0].page, source: "AI_SUGGESTION", phrase: "a phrase no run ever stored", role: "TOPIC", use: "phrase" }]));
    const r = build();
    assert.equal(r.status, 3, r.stdout + r.stderr);
    assert.match(r.stderr, /TITLE_PLAN_NAMES_NO_STORED_PHRASE: 1 title plan\(s\) name no phrase stored in this batch; nothing written/);
    assert.deepEqual(STORES.map((f) => sha(readFileSync(join(dir, f)))), before, "a refused title plan let the run write");
    /* CONTROL: the plans as recorded */
    writeFileSync(join(dir, "title-plans.json"), JSON.stringify(plans));
    const ok = build();
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const stored = rowsIn(dir, "search-phrases.jsonl").filter((r) => r.record_type === "search_phrase");
    const latest = [...new Map(rowsIn(dir, "joined-pages.jsonl").filter((r) => r.record_type === JOINED_RECORD).map((r) => [r.value, r])).values()];
    for (const t of plans) {
      const rec = stored.find((y) => y.source === t.source && y.phrase === t.phrase);
      const page = latest.find((p) => p.value === t.page);
      assert.ok(rec && page && page.titleTrace.some((part) => part.from === `search-phrase:${rec.phrase_id}` && part.phrase === rec.phrase), `${t.page}: a planned title part is not traced to its stored phrase`);
    }
    console.log(`  TITLE PLAN (count-only; a scratch copy, the builder's own entry point): ${JSON.stringify({ refusedPlans: 1, written: 0, plansTraced: plans.length })}`);
  } finally { W.cleanup(); }
  assert.equal(existsSync(W.root), false, "the scratch copy was not removed");
});

test("the production trail was not written by this file", () => assert.equal(sha(readFileSync(TRAIL)), trailBefore));
