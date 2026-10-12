/**
 * RR-253 / RR-254 · THE JOINED TEST PAGES (the owner's page shape, `_handoffs` …RR-253_ANSWERS_TO_THE_BUILD_STOP.md; Specification Amendment 6
 * as the owner clarified it, …OWNER_CLARIFICATION_2026-10-12_RR-254_SPECIFICATION_AMENDMENT_6_WHOLE_PAGES_ONLY.md: cancel-and-move applies
 * to WHOLE pages only, a shared question stays on each page; the title and headings are chosen from the recorded questions).
 *
 * Fixtures DRIVE the rules (neutral stand-ins, hand-counted). The REAL test reads the declared product's own built drafts from its research
 * batch and reports counts only. Nothing is fetched; the production trail is not written (last test). These pages are evidence for no row.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { cancelSamePages, samePagePairs, connectionDrafts, productStatements, joinPages, joinedChecks, renderJoined, orderedQuestions, SURVIVOR_RULE, REFUSAL, JOINED_RECORD, CANCELLATION_RECORD, TIER_WORDS, PRODUCT_STATEMENT_LABEL } from "../src/page/joined-page.mjs";
import { testException, parseExceptionRecord, STAMP } from "../src/page/test-exception.mjs";
import { CHECK } from "../src/page/draft-render.mjs";
import { classifyEntryPoint } from "../tools/tenant-scope-census.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const need = (key, questions) => ({ key, questions, answer: { claims: [] }, sameness: { judgementRef: `s:${key}`, reason: "same in other words" } });
const judged = (a, b) => ({ needs: [a, b], judgementRef: `j:${a}|${b}`, reason: "both ask the same thing" });
/* two pages that share ONE question (cost) and each hold a need of their own */
const sharing = () => ({ pages: [
  { combination: { kind: "alpha" }, needs: [need("a-cost", ["q1", "q2"]), need("a-only", ["q3"])] },
  { combination: { kind: "beta" }, needs: [need("b-cost", ["q4"]), need("b-only", ["q5"])] },
], sameNeed: [judged("a-cost", "b-cost")] });
/* two WHOLE pages serving the same need: every need of each has a recorded same-need partner on the other */
const whole = () => ({ pages: [
  { combination: { kind: "alpha" }, needs: [need("a-cost", ["q1", "q2"]), need("a-time", ["q3"])] },
  { combination: { kind: "beta" }, needs: [need("b-cost", ["q4"]), need("b-time", ["q5"])] },
], sameNeed: [judged("a-cost", "b-cost"), judged("b-time", "a-time")] });

/* ================= Specification Amendment 6, as clarified — whole pages only ================= */

test("SA6 · FIRING CONTROL: a planted duplicate PAGE is caught and cancelled whole — its questions move into the survivor's items, and no same-need page pair is left", () => {
  const proposed = whole();
  assert.deepEqual(samePagePairs(proposed), [["beta", "alpha"]], "CONTROL: before the run the planted duplicate page must be seen");
  const r = cancelSamePages(proposed);
  assert.deepEqual([r.cancelledPages, r.pages.map((p) => p.combination.kind)], [["beta"], ["alpha"]]);
  assert.deepEqual(r.cancellations.map((c) => [c.record_type, c.cancelledPage, c.survivorPage, c.cancelledNeed, c.survivorNeed, [...c.movedQuestions], c.rule]),
    [[CANCELLATION_RECORD, "beta", "alpha", "b-cost", "a-cost", ["q4"], SURVIVOR_RULE], [CANCELLATION_RECORD, "beta", "alpha", "b-time", "a-time", ["q5"], SURVIVOR_RULE]]);
  assert.deepEqual(r.pages[0].needs.map((n) => [n.key, n.questions]), [["a-cost", ["q1", "q2", "q4"]], ["a-time", ["q3", "q5"]]]);
  assert.deepEqual(samePagePairs({ pages: r.pages, sameNeed: proposed.sameNeed }), [], "a same-need page pair is still there after the run");
  /* with NO recorded judgement nothing is cancelled — sameness is never guessed */
  const none = cancelSamePages({ ...whole(), sameNeed: [] });
  assert.deepEqual([none.cancelledPages.length, none.pages.length], [0, 2]);
});

test("SA6 · FIRING CONTROL (the owner's clarification): a question SHARED by two pages stays on EACH page — counted, never cancelled, never moved", () => {
  const r = cancelSamePages(sharing());
  assert.deepEqual([r.cancellations.length, r.cancelledPages.length], [0, 0], "a shared question was cancelled");
  assert.deepEqual(r.pages.map((p) => p.needs.map((n) => [n.key, n.questions])), [[["a-cost", ["q1", "q2"]], ["a-only", ["q3"]]], [["b-cost", ["q4"]], ["b-only", ["q5"]]]], "a shared question was moved");
  assert.deepEqual(r.shared.map((x) => [[...x.needs], [...x.on]]), [[["a-cost", "b-cost"], ["alpha", "beta"]]]);
  /* one need of one page left unpaired is enough: the pages are not wholly the same */
  const almost = whole(); almost.pages[1].needs.push(need("b-extra", ["q9"]));
  assert.deepEqual([cancelSamePages(almost).cancelledPages.length, cancelSamePages(almost).shared.length], [0, 2], "two pages that are not wholly the same were treated as one");
});

test("SA6 · the survivor rule, exactly as declared: the page with more recorded questions; on a tie the page value that sorts first", () => {
  const tie = { pages: [{ combination: { kind: "beta" }, needs: [need("b", ["q2"])] }, { combination: { kind: "alpha" }, needs: [need("a", ["q1"])] }], sameNeed: [judged("b", "a")] };
  assert.deepEqual(cancelSamePages(tie).cancelledPages, ["beta"], "a tie did not go to the page value that sorts first");
  const more = { pages: [{ combination: { kind: "alpha" }, needs: [need("a", ["q1"])] }, { combination: { kind: "beta" }, needs: [need("b", ["q2", "q3"])] }], sameNeed: [judged("a", "b")] };
  assert.deepEqual(cancelSamePages(more).cancelledPages, ["alpha"], "the page with more recorded questions did not survive");
});

test("SA6 · a judgement that names no recorded judgement, an unknown need, or two needs of ONE page is refused by name and cancels nothing", () => {
  const cases = [
    [{ needs: ["a-cost", "nope"], judgementRef: "j", reason: "r" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "b-cost"], judgementRef: "", reason: "r" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "b-cost"], judgementRef: "j", reason: "" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "a-only"], judgementRef: "j", reason: "r" }, REFUSAL.SAME_PAGE],
  ];
  for (const [j, code] of cases) {
    const r = cancelSamePages({ ...sharing(), sameNeed: [j] });
    assert.deepEqual([r.cancellations.length, r.shared.length, r.refused.map((x) => x.code)], [0, 0, [code]]);
  }
});

test("SA6 · the connection drafts: a need's first question carries its page candidate and answer; every other question joins it by a recorded judgement", () => {
  const d = connectionDrafts(cancelSamePages(whole()));
  assert.deepEqual(d.map((x) => [x.questionId, x.combination.kind, x.sameAs?.questionId ?? null, x.sameAs?.judgementRef ?? null]),
    [["q1", "alpha", null, null], ["q2", "alpha", "q1", "s:a-cost"], ["q4", "alpha", "q1", "j:a-cost|b-cost"], ["q3", "alpha", null, null], ["q5", "alpha", "q3", "j:b-time|a-time"]]);
  const kept = connectionDrafts(cancelSamePages(sharing()));
  assert.deepEqual(kept.map((x) => [x.questionId, x.combination.kind]), [["q1", "alpha"], ["q2", "alpha"], ["q3", "alpha"], ["q4", "beta"], ["q5", "beta"]], "a shared question left its own page");
});

/* ================= the product's own statements ================= */

const APPROVAL = { state: "APPROVED", by: "owner", on: "2026-09-01", record: { repo: "records", path: "approval.md", commit: "a".repeat(40) } };
const approvedClaim = (capabilityId, statement, value = null) => ({ kind: "capability", capabilityId, statement, value, questionnaire: { questionnaireId: "q", answerId: capabilityId, approval: APPROVAL } });

test("PRODUCT · FIRING CONTROL: only an owner-APPROVED answer is printed — word for word, with its value and unit, marked as the product's own statement and linked to its own site", () => {
  const approved = [approvedClaim("does-x", "It does x."), approvedClaim("costs", "It costs this.", { value: 5, valueType: "money", unit: "XTS" }), { ...approvedClaim("pending", "Not yet."), questionnaire: { questionnaireId: "q", answerId: "pending", approval: { state: "PENDING" } } }];
  const r = productStatements({ answerIds: ["does-x", "costs", "pending", "never-filed"], approved, officialSite: "https://own.invalid", productName: "Stand-in" });
  assert.deepEqual(r.shown.map((s) => [s.answerId, s.text, s.label, s.source, s.link]), [
    ["does-x", "It does x.", PRODUCT_STATEMENT_LABEL, "Stand-in's own statement (owner-approved, 2026-09-01)", "https://own.invalid"],
    ["costs", "It costs this. — 5 XTS", PRODUCT_STATEMENT_LABEL, "Stand-in's own statement (owner-approved, 2026-09-01)", "https://own.invalid"]]);
  assert.deepEqual(r.refused.map((x) => [x.answerId, x.code]), [["pending", REFUSAL.NOT_APPROVED], ["never-filed", REFUSAL.NOT_APPROVED]]);
  assert.deepEqual(productStatements({ answerIds: ["does-x"], approved, officialSite: null }).refused.map((x) => x.code), [REFUSAL.NO_SITE], "a statement was printed with no site of the product's own to link");
});

/* ================= the one-time test exception ================= */

test("EXCEPTION · FIRING CONTROL: it exists only with the committed owner record — no record, no commit, no tenant: refused; with it, an EMPTY population recorded COMPLETE, stamped", () => {
  const record = { repo: "records", path: "decision.md", commit: "b".repeat(40) };
  for (const bad of [null, { ...record, commit: "abc" }, { ...record, path: "" }, { ...record, repo: "" }]) assert.throws(() => testException({ tenantId: "t", record: bad }), /TEST_EXCEPTION_WITHOUT_ITS_COMMITTED_OWNER_RECORD/);
  assert.throws(() => testException({ tenantId: "", record }), /TEST_EXCEPTION_NAMES_NO_TENANT/);
  const x = testException({ tenantId: "t", record });
  assert.deepEqual([x.population.tenantId, x.population.coverageState, x.population.pages.length, x.population.inventory.pages.length, x.stamp, x.exception.record.commit], ["t", "COMPLETE", 0, 0, STAMP, "b".repeat(40)]);
  assert.deepEqual(parseExceptionRecord(`records:decision.md@${"b".repeat(40)}`), record);
  for (const bad of ["", "records:decision.md", "records:decision.md@abc", `decision.md@${"b".repeat(40)}`]) assert.equal(parseExceptionRecord(bad), null);
});

/* ================= the join and its gate table ================= */

const label = (claimId, over = {}) => ({ claimId, label: "RESPONSIBLE BODY", source: "A Body — its page", link: "https://body.invalid/p", readOn: "2026-09-01", text: `Statement ${claimId}.`, central: true, ...over });
/* wordings are [text, tier]; question ids sort in the order given, so a later OBSERVED wording must still be chosen over an earlier inferred one */
const built = (needId, candidate, wordings, labels = [label(`${needId}-1`)]) => ({ slug: `compiled-${needId}`, decision: { subject: { needId } },
  spec: { subject: needId, basis: { pageCandidate: JSON.stringify([["kind", candidate]]) }, sections: wordings.map(([w, tier], i) => ({ questionId: `${needId}-q${i}`, heading: w, tier })), countrySections: [], answer: { state: "SUPPORTED", labels, unknown: [] } } });
const OBS = "OBSERVED", INF = "RESEARCH-DERIVED";
const passing = () => ({ state: "RENDERED", checks: { directAnswer: { state: CHECK.PASS }, everyClaimSourced: { state: CHECK.PASS }, headingsMatch: { state: CHECK.PASS }, internalLinks: { state: CHECK.NOT_MEASURED }, technical: { state: CHECK.NOT_MEASURED }, markup: { state: CHECK.PASS } } });
const joined = (construction, over = {}) => joinPages({ construction, renderNeed: passing, stamp: STAMP, ...over });

test("JOIN · FIRING CONTROL: one page per page candidate, every chosen need on it as ONE item with its own questions and its own answer, in the order handed in; nothing chosen, nothing built", () => {
  const order = { n2: 0, n1: 1, n3: 0 };
  const pages = joined([built("n1", "alpha", [["how much is it", INF], ["How much does it cost?", OBS]]), built("n2", "alpha", [["Where is it?", OBS]]), built("n3", "beta", [["how long is it", INF]])], { orderOf: (id) => order[id] });
  assert.deepEqual(pages.map((p) => [p.record_type, p.value, p.items, p.questions]), [[JOINED_RECORD, "alpha", 2, 3], [JOINED_RECORD, "beta", 1, 1]]);
  const a = pages[0];
  assert.deepEqual(a.itemList.map((it) => [it.needId, it.questions.map((q) => q.wording), it.claims.map((c) => c.claimId)]), [["n2", ["Where is it?"], ["n2-1"]], ["n1", ["How much does it cost?", "how much is it"], ["n1-1"]]]);
  for (const w of ["How much does it cost?", "how much is it", "Where is it?", "Statement n1-1.", "A Body — its page", "https://body.invalid/p", "read 2026-09-01", TIER_WORDS.OBSERVED, TIER_WORDS["RESEARCH-DERIVED"]]) assert.ok(a.html.includes(w), `the page does not show: ${w}`);
  assert.ok(!a.html.includes("how long is it"), "another page's need is on this page");
  assert.equal(a.html.split(STAMP).length - 1, 2, "the page does not say, top and bottom, what it is");
  assert.match(a.html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(a.html, /<style>[^<]+<\/style>/, "the page has no layout of its own");
  assert.doesNotMatch(a.html, /<script|<link |src=|@import|url\(/, "the page loads something from outside itself");
  assert.deepEqual(a.trace.map((t) => [t.needId, t.claimId, t.source, t.link, t.readOn]), [["n2", "n2-1", "A Body — its page", "https://body.invalid/p", "2026-09-01"], ["n1", "n1-1", "A Body — its page", "https://body.invalid/p", "2026-09-01"]]);
  assert.deepEqual(joined([]), [], "a page was built from no chosen need");
  assert.throws(() => joinPages({ construction: [built("n1", "alpha", [["q?", OBS]])], renderNeed: passing, stamp: "" }), /stamp/);
});

test("WORDING · FIRING CONTROL (RR-254): every heading and the title are recorded questions — an OBSERVED question is chosen before an inferred one, and each is traced", () => {
  assert.deepEqual(orderedQuestions([{ questionId: "a", tier: INF }, { questionId: "c", tier: OBS }, { questionId: "b", tier: OBS }]).map((q) => q.questionId), ["b", "c", "a"]);
  const p = joined([built("n1", "alpha", [["how much is it", INF], ["How much does it cost?", OBS]]), built("n2", "alpha", [["where do i sit it", INF]]), built("n3", "alpha", [["When is it held?", OBS]]), built("n4", "alpha", [["Is it hard?", OBS]])], { orderOf: (id) => Number(id.slice(1)) })[0];
  assert.deepEqual(p.itemList.map((it) => [it.heading.wording, it.heading.tier, it.heading.questionId]), [["How much does it cost?", OBS, "n1-q1"], ["where do i sit it", INF, "n2-q0"], ["When is it held?", OBS, "n3-q0"], ["Is it hard?", OBS, "n4-q0"]]);
  /* the title: the observed headings among the first three items — never a fourth item's, never a written one */
  assert.equal(p.title, "How much does it cost? · When is it held?");
  assert.deepEqual(p.titleFrom, ["n1-q1", "n3-q0"]);
  assert.match(p.html, /<h1>How much does it cost\? · When is it held\?<\/h1>/);
  assert.match(p.html, /<h2>How much does it cost\? <span class="tier">/);
  /* with no observed question among the first items, the title is still recorded questions */
  const inferred = joined([built("n1", "alpha", [["how much is it", INF]]), built("n2", "alpha", [["where is it", INF]])], { orderOf: (id) => Number(id.slice(1)) })[0];
  assert.equal(inferred.title, "how much is it · where is it");
  assert.deepEqual([p.checks.headingsFromQuestions.state, p.checks.titleFromQuestions.state], ["PASS", "PASS"]);
  const items = p.itemList;
  assert.equal(joinedChecks({ items, html: p.html, stamp: STAMP, title: "A written title", titleFrom: [{ wording: "A written title" }] }).titleFromQuestions.state, "FAIL", "a title that is no recorded question passed");
  assert.equal(joinedChecks({ items: items.map((it, i) => (i === 0 ? { ...it, heading: { ...it.questions[1] }, questions: [it.questions[1], it.questions[0]] } : it)), html: p.html, stamp: STAMP, title: p.title, titleFrom: [p.itemList[0].heading, p.itemList[2].heading] }).headingsFromQuestions.state, "FAIL", "an observed question was passed over for a heading");
});

test("GATES · FIRING CONTROL: each of the joined page's own checks fails for its own reason and no other; an unanswered need fails the page; what has no judge is NOT MEASURED, never passed", () => {
  const good = joined([built("n1", "alpha", [["How much is it?", OBS]])])[0];
  const states = (p) => Object.fromEntries(Object.entries(p.checks).map(([k, v]) => [k, v.state]));
  assert.deepEqual(states(good), { everyNeedAnswered: "PASS", everyItemAnswered: "PASS", everyClaimSourced: "PASS", ownWording: "PASS", headingsFromQuestions: "PASS", titleFromQuestions: "PASS", tierShown: "PASS", productStatementsApproved: "PASS", stamped: "PASS", noPromise: "PASS",
    needDirectAnswer: "PASS", needEveryClaimSourced: "PASS", needHeadingsMatch: "PASS", internalLinks: "NOT MEASURED", technical: "NOT MEASURED", engaging: "NOT MEASURED", acceptableToSearchAndAnswerEngines: "NOT MEASURED" });
  const failing = (construction, over) => Object.entries(states(joined(construction, over)[0])).filter(([, st]) => st === "FAIL").map(([k]) => k);
  const one = (labels) => [built("n1", "alpha", [["q?", OBS]], labels)];
  assert.deepEqual(failing(one([label("c", { link: "" })])), ["everyClaimSourced"]);
  assert.deepEqual(failing(one([label("c", { readOn: "last week" })])), ["everyClaimSourced"]);
  assert.deepEqual(failing(one([label("c", { central: false })])), ["everyItemAnswered"]);
  assert.deepEqual(failing(one([label("c", { text: "This page will rank first on search." })])), ["noPromise"]);
  assert.deepEqual(failing(one(), { statementsFor: () => ({ shown: [], refused: [{ answerId: "x", code: REFUSAL.NOT_APPROVED }] }) }), ["productStatementsApproved"]);
  assert.deepEqual(failing(one(), { renderNeed: () => ({ state: "RENDERED", checks: { ...passing().checks, headingsMatch: { state: CHECK.FAIL } } }) }), ["needHeadingsMatch"]);
  const unanswered = joined(one(), { unansweredFor: () => [{ need: "n9", questions: 1, why: "the central answer is unsupported" }] })[0];
  assert.deepEqual([Object.entries(states(unanswered)).filter(([, st]) => st === "FAIL").map(([k]) => k), unanswered.unanswered.map((u) => u.need)], [["everyNeedAnswered"], ["n9"]]);
  assert.ok(!unanswered.html.includes("n9"), "an unanswered need was written into the page");
  const items = good.itemList;
  assert.equal(joinedChecks({ items, html: renderJoined({ title: "t", stamp: STAMP, items }).replace(STAMP, "x"), stamp: STAMP }).stamped.state, "FAIL");
  assert.equal(joinedChecks({ items: items.map((it) => ({ ...it, questions: it.questions.map((q) => ({ ...q, tier: "GUESSED" })) })), html: good.html, stamp: STAMP }).tierShown.state, "FAIL");
});

/* ================= REAL ================= */

test("REAL · the declared product's rebuilt test drafts (RR-254): stamped, in the private research batch only, every claim sourced, shared questions on each page, wording from the questions, unanswered needs named", async () => {
  const BATCH = "rr254-test-pages-2026-10-12";
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  const file = join(dir, "joined-pages.jsonl");
  assert.ok(existsSync(file), "the built drafts are not in the research batch");
  assert.ok(!dir.replace(/\\/g, "/").startsWith(REPO.replace(/\\/g, "/")), "the built drafts live inside the engine repository");
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const pages = rows.filter((r) => r.record_type === JOINED_RECORD), cancels = rows.filter((r) => r.record_type === CANCELLATION_RECORD);
  assert.ok(pages.length > 0, "EMPTY real population");
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const approved = new Set((await readProductQuestionnaire(product)).claims.map((c) => c.capabilityId));
  const proposed = JSON.parse(readFileSync(join(dir, "page-drafts.json"), "utf8"));
  for (const p of pages) {
    assert.equal(p.stamp, STAMP);
    assert.equal(p.html.split(STAMP).length - 1, 2);
    assert.match(p.exception.record.commit, /^[0-9a-f]{40}$/);
    assert.ok(p.items > 0 && p.itemList.length === p.items);
    const recorded = new Set(p.itemList.flatMap((it) => it.questions.map((q) => q.wording)));
    assert.ok(p.title.split(" · ").every((w) => recorded.has(w)), `${p.value}: the title is not made of recorded questions`);
    for (const it of p.itemList) {
      assert.ok(recorded.has(it.heading.wording) && (it.heading.tier === "OBSERVED" || it.questions.every((q) => q.tier !== "OBSERVED")), `${p.value}: a heading is not a recorded question, or an observed one was passed over`);
      assert.ok(it.claims.length > 0 && it.claims.every((c) => c.text && c.source && /^https:\/\//.test(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn)), `${p.value}: an item's claim lacks its statement, source, link or date`);
      assert.ok(it.statements.every((st) => approved.has(st.answerId)), `${p.value}: a product statement is not an approved answer today`);
    }
    /* the only gate that may fail is "every need answered" — and exactly when the page names an unanswered need */
    assert.deepEqual(Object.entries(p.checks).filter(([, v]) => v.state === "FAIL").map(([k]) => k), p.unanswered.length ? ["everyNeedAnswered"] : [], `${p.value}: a gate fails`);
    for (const k of ["engaging", "acceptableToSearchAndAnswerEngines"]) assert.equal(p.checks[k].state, "NOT MEASURED");
  }
  const live = cancelSamePages(proposed);
  assert.deepEqual([cancels.length, live.cancellations.length, live.cancelledPages.length], [0, 0, 0], "a page was cancelled although no two whole pages serve the same need");
  assert.ok(live.shared.length > 0, "no shared question: the owner's clarification is not exercised on the real pages");
  for (const sh of live.shared) assert.notEqual(sh.on[0], sh.on[1]);
  console.log(`  REAL (count-only): ${JSON.stringify({ pages: pages.map((p) => ({ value: p.value, items: p.items, questions: p.questions, words: p.wordCount, unanswered: p.unanswered.length, pass: Object.values(p.checks).filter((v) => v.state === "PASS").length, fail: Object.values(p.checks).filter((v) => v.state === "FAIL").length, notMeasured: Object.values(p.checks).filter((v) => v.state === "NOT MEASURED").length })), sharedQuestionPairs: live.shared.length, cancellations: cancels.length })}`);
});

/* ================= the entry point and its census ================= */

test("THE ENTRY POINT: without its arguments, or without the owner's exception record, it stops before reading anything; it is SCOPED; its modules make no network call", () => {
  const run = (...args) => spawnSync(process.execPath, ["bin/build-joined-pages.mjs", ...args], { cwd: REPO, encoding: "utf8" });
  const bare = run("--subject=x");
  assert.equal(bare.status, 2, bare.stdout + bare.stderr);
  assert.match(bare.stderr, /nothing read, nothing written/);
  const noException = run("--subject=x", "--product=x", "--research-batch=b", "--on=2026-10-12");
  assert.equal(noException.status, 2);
  assert.match(noException.stderr, /TEST_EXCEPTION_WITHOUT_ITS_COMMITTED_OWNER_RECORD/);
  const shortCommit = run("--subject=x", "--product=x", "--research-batch=b", "--on=2026-10-12", "--test-exception=records:d.md@abc123");
  assert.match(shortCommit.stderr, /TEST_EXCEPTION_WITHOUT_ITS_COMMITTED_OWNER_RECORD/);
  const c = classifyEntryPoint("bin/build-joined-pages.mjs", readFileSync(join(REPO, "bin", "build-joined-pages.mjs"), "utf8"));
  assert.equal(c.cls, "SCOPED", c.why);
  assert.deepEqual(decisionCallPaths({ entries: ["src/page/joined-page.mjs", "src/page/test-exception.mjs"] }).faults, []);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
