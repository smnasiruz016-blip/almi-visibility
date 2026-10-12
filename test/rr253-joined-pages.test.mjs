/**
 * RR-253 · THE JOINED TEST PAGES (the owner's page shape, `_handoffs` …RR-253_ANSWERS_TO_THE_BUILD_STOP.md; Specification Amendment 6).
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

import { cancelSameNeeds, sameNeedPairs, connectionDrafts, productStatements, joinPages, joinedChecks, renderJoined, SURVIVOR_RULE, REFUSAL, JOINED_RECORD, CANCELLATION_RECORD, TIER_WORDS, PRODUCT_STATEMENT_LABEL } from "../src/page/joined-page.mjs";
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
const two = () => ({ pages: [
  { combination: { kind: "alpha" }, needs: [need("a-cost", ["q1", "q2"]), need("a-only", ["q3"])] },
  { combination: { kind: "beta" }, needs: [need("b-cost", ["q4"]), need("b-only", ["q5"])] },
] });
const judged = (a, b) => ({ needs: [a, b], judgementRef: `j:${a}|${b}`, reason: "both ask the cost" });

/* ================= Specification Amendment 6 — cancel and move ================= */

test("SA6 · FIRING CONTROL: a planted same-need pair across two pages is caught and cancelled — the survivor keeps the need, the questions move, no pair is left", () => {
  const proposed = { ...two(), sameNeed: [judged("a-cost", "b-cost")] };
  assert.deepEqual(sameNeedPairs(proposed), [["a-cost", "b-cost"]], "CONTROL: before the run the planted pair must be seen");
  const r = cancelSameNeeds(proposed);
  assert.deepEqual(r.cancellations.map((c) => [c.record_type, c.cancelledNeed, c.cancelledOn, c.survivorNeed, c.survivorOn, [...c.movedQuestions], c.rule]), [[CANCELLATION_RECORD, "b-cost", "beta", "a-cost", "alpha", ["q4"], SURVIVOR_RULE]]);
  assert.deepEqual(r.pages.map((p) => p.needs.map((n) => [n.key, n.questions])), [[["a-cost", ["q1", "q2", "q4"]], ["a-only", ["q3"]]], [["b-only", ["q5"]]]]);
  assert.deepEqual(sameNeedPairs({ pages: r.pages, sameNeed: proposed.sameNeed }), [], "a same-need pair is still on two pages after the run");
  assert.deepEqual(r.pages[0].needs[0].movedIn.map((m) => [m.questionId, m.from]), [["q4", "beta"]]);
  /* with NO recorded judgement nothing is cancelled — sameness is never guessed */
  const none = cancelSameNeeds({ ...two(), sameNeed: [] });
  assert.deepEqual([none.cancellations.length, none.pages.map((p) => p.needs.length)], [0, [2, 2]]);
});

test("SA6 · the survivor rule, exactly as declared: more questions; on a tie the page value that sorts first; a page left empty is cancelled whole", () => {
  const tie = { pages: [{ combination: { kind: "beta" }, needs: [need("b", ["q2"])] }, { combination: { kind: "alpha" }, needs: [need("a", ["q1"]), need("a2", ["q9"])] }], sameNeed: [judged("b", "a")] };
  const r = cancelSameNeeds(tie);
  assert.deepEqual([r.cancellations[0].survivorNeed, r.cancellations[0].cancelledNeed], ["a", "b"], "a tie did not go to the page value that sorts first");
  assert.deepEqual([r.cancelledPages, r.pages.length], [["beta"], 1], "a page with no need of its own was still built");
  const more = { pages: [{ combination: { kind: "alpha" }, needs: [need("a", ["q1"])] }, { combination: { kind: "beta" }, needs: [need("b", ["q2", "q3"]), need("b2", ["q8"])] }], sameNeed: [judged("a", "b")] };
  assert.equal(cancelSameNeeds(more).cancellations[0].survivorNeed, "b", "the need with more recorded questions did not survive");
});

test("SA6 · a judgement that names no recorded judgement, an unknown need, or two needs of ONE page is refused by name and cancels nothing", () => {
  const cases = [
    [{ needs: ["a-cost", "nope"], judgementRef: "j", reason: "r" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "b-cost"], judgementRef: "", reason: "r" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "b-cost"], judgementRef: "j", reason: "" }, REFUSAL.JUDGEMENT],
    [{ needs: ["a-cost", "a-only"], judgementRef: "j", reason: "r" }, REFUSAL.SAME_PAGE],
  ];
  for (const [j, code] of cases) {
    const r = cancelSameNeeds({ ...two(), sameNeed: [j] });
    assert.deepEqual([r.cancellations.length, r.refused.map((x) => x.code)], [0, [code]]);
  }
});

test("SA6 · the connection drafts: a need's first question carries its page candidate and answer; every other question joins it by a recorded judgement", () => {
  const r = cancelSameNeeds({ ...two(), sameNeed: [judged("a-cost", "b-cost")] });
  const d = connectionDrafts(r);
  assert.deepEqual(d.map((x) => [x.questionId, x.combination.kind, x.sameAs?.questionId ?? null, x.sameAs?.judgementRef ?? null]),
    [["q1", "alpha", null, null], ["q2", "alpha", "q1", "s:a-cost"], ["q4", "alpha", "q1", "j:a-cost|b-cost"], ["q3", "alpha", null, null], ["q5", "beta", null, null]]);
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
const built = (needId, candidate, wordings, labels = [label(`${needId}-1`)]) => ({ slug: `compiled-${needId}`, decision: { subject: { needId } },
  spec: { subject: needId, basis: { pageCandidate: JSON.stringify([["kind", candidate]]) }, sections: wordings.map((w, i) => ({ questionId: `${needId}-q${i}`, heading: w, tier: i === 0 ? "OBSERVED" : "RESEARCH-DERIVED" })), countrySections: [], answer: { state: "SUPPORTED", labels, unknown: [] } } });
const passing = () => ({ state: "RENDERED", checks: { directAnswer: { state: CHECK.PASS }, everyClaimSourced: { state: CHECK.PASS }, headingsMatch: { state: CHECK.PASS }, internalLinks: { state: CHECK.NOT_MEASURED }, technical: { state: CHECK.NOT_MEASURED }, markup: { state: CHECK.PASS } } });
const joined = (construction, over = {}) => joinPages({ construction, renderNeed: passing, stamp: STAMP, titleFor: (v) => `Title ${v}`, ...over });

test("JOIN · FIRING CONTROL: one page per page candidate, every chosen need on it as ONE item with its own questions and its own answer; nothing chosen, nothing built", () => {
  const pages = joined([built("n1", "alpha", ["How much is it?", "what does it cost"]), built("n2", "alpha", ["Where is it?"]), built("n3", "beta", ["How long is it?"])]);
  assert.deepEqual(pages.map((p) => [p.record_type, p.value, p.items, p.questions, p.title]), [[JOINED_RECORD, "alpha", 2, 3, "Title alpha"], [JOINED_RECORD, "beta", 1, 1, "Title beta"]]);
  const a = pages[0];
  assert.deepEqual(a.itemList.map((it) => [it.needId, it.questions.map((q) => q.wording), it.claims.map((c) => c.claimId)]), [["n1", ["How much is it?", "what does it cost"], ["n1-1"]], ["n2", ["Where is it?"], ["n2-1"]]]);
  for (const w of ["How much is it?", "what does it cost", "Where is it?", "Statement n1-1.", "A Body — its page", "https://body.invalid/p", "read 2026-09-01", TIER_WORDS.OBSERVED, TIER_WORDS["RESEARCH-DERIVED"]]) assert.ok(a.html.includes(w), `the page does not show: ${w}`);
  assert.ok(!a.html.includes("How long is it?"), "another page's need is on this page");
  assert.equal(a.html.split(STAMP).length - 1, 2, "the page does not say, top and bottom, what it is");
  assert.match(a.html, /<meta name="robots" content="noindex, nofollow">/);
  assert.deepEqual(a.trace.map((t) => [t.needId, t.claimId, t.source, t.link, t.readOn]), [["n1", "n1-1", "A Body — its page", "https://body.invalid/p", "2026-09-01"], ["n2", "n2-1", "A Body — its page", "https://body.invalid/p", "2026-09-01"]]);
  assert.deepEqual(joined([]), [], "a page was built from no chosen need");
  assert.throws(() => joinPages({ construction: [built("n1", "alpha", ["q?"])], renderNeed: passing, stamp: "" }), /stamp/);
});

test("GATES · FIRING CONTROL: each of the joined page's own checks fails for its own reason and no other; what has no judge is NOT MEASURED, never passed", () => {
  const good = joined([built("n1", "alpha", ["How much is it?"])])[0];
  const states = (p) => Object.fromEntries(Object.entries(p.checks).map(([k, v]) => [k, v.state]));
  assert.deepEqual(states(good), { everyItemAnswered: "PASS", everyClaimSourced: "PASS", ownWording: "PASS", tierShown: "PASS", productStatementsApproved: "PASS", stamped: "PASS", noPromise: "PASS",
    needDirectAnswer: "PASS", needEveryClaimSourced: "PASS", needHeadingsMatch: "PASS", internalLinks: "NOT MEASURED", technical: "NOT MEASURED", engaging: "NOT MEASURED", acceptableToSearchAndAnswerEngines: "NOT MEASURED" });
  const failing = (construction, over) => Object.entries(states(joined(construction, over)[0])).filter(([, s]) => s === "FAIL").map(([k]) => k);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"], [label("c", { link: "" })])]), ["everyClaimSourced"]);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"], [label("c", { readOn: "last week" })])]), ["everyClaimSourced"]);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"], [label("c", { central: false })])]), ["everyItemAnswered"]);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"], [label("c", { text: "This page will rank first on search." })])]), ["noPromise"]);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"])], { statementsFor: () => ({ shown: [], refused: [{ answerId: "x", code: REFUSAL.NOT_APPROVED }] }) }), ["productStatementsApproved"]);
  assert.deepEqual(failing([built("n1", "alpha", ["q?"])], { renderNeed: () => ({ state: "RENDERED", checks: { ...passing().checks, headingsMatch: { state: CHECK.FAIL } } }) }), ["needHeadingsMatch"]);
  const items = good.itemList;
  assert.equal(joinedChecks({ items, html: renderJoined({ title: "t", stamp: STAMP, items }).replace(STAMP, "x"), stamp: STAMP }).stamped.state, "FAIL");
  assert.equal(joinedChecks({ items: items.map((it) => ({ ...it, questions: it.questions.map((q) => ({ ...q, tier: "GUESSED" })) })), html: good.html, stamp: STAMP }).tierShown.state, "FAIL");
});

/* ================= REAL ================= */

test("REAL · the declared product's built test drafts: stamped, in the private research batch only, every claim sourced, every product statement an approved answer, no same-need pair left", async () => {
  const BATCH = "rr253-test-pages-2026-10-12";
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
    for (const it of p.itemList) {
      assert.ok(it.claims.length > 0 && it.claims.every((c) => c.text && c.source && /^https:\/\//.test(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn)), `${p.value}: an item's claim lacks its statement, source, link or date`);
      assert.ok(it.statements.every((s) => approved.has(s.answerId)), `${p.value}: a product statement is not an approved answer today`);
    }
    assert.deepEqual(Object.entries(p.checks).filter(([, v]) => v.state === "FAIL").map(([k]) => k), [], `${p.value}: a gate fails`);
    for (const k of ["engaging", "acceptableToSearchAndAnswerEngines"]) assert.equal(p.checks[k].state, "NOT MEASURED");
  }
  const live = cancelSameNeeds(proposed);
  assert.equal(cancels.length, live.cancellations.length, "the stored cancellations are not what the rule yields today");
  assert.deepEqual(sameNeedPairs({ pages: live.pages, sameNeed: proposed.sameNeed }), []);
  console.log(`  REAL (count-only): ${JSON.stringify({ pages: pages.map((p) => ({ value: p.value, items: p.items, questions: p.questions, words: p.wordCount, pass: Object.values(p.checks).filter((v) => v.state === "PASS").length, fail: Object.values(p.checks).filter((v) => v.state === "FAIL").length, notMeasured: Object.values(p.checks).filter((v) => v.state === "NOT MEASURED").length })), cancellations: cancels.length })}`);
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
